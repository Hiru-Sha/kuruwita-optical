/* eslint-disable */
// ============================================================
//  BulkImport.js — Enter past sales quickly
//  For orders, quick sales, and repairs done before the system
//  Minimal fields, fast entry, backdate to exact date
// ============================================================
import React, { useState, useRef } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};
const fmt  = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
const INP  = { padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%', boxSizing:'border-box' };
const SEL  = { ...INP, cursor:'pointer' };
const LBL  = { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:4, display:'block' };

const LENS_TYPES   = ['Single Vision','Bifocal','Progressive','Reading','Sunglass Lens','Photochromic'];
const COATINGS     = ['CR (White)','HMC','Hard Coat','Blue Filter','Photochromic','AR Coat'];
const FRAME_TYPES  = ['Full rim','Half rim','Rimless'];
const FRAME_COLORS = ['Black','Gold','Silver','Brown','Gunmetal','Blue','Red','Pink','Tortoise','Crystal','Green','White','Other'];
const REPAIR_TYPES = ['Arm Repair','Nose Pad Replacement','Frame Polishing','Screw / Nail Fix','Lens Refit','Hinge Repair','Frame Straightening','Other Repair'];

function apiPost(path, body) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body:JSON.stringify(body),
  }).then(r=>r.json());
}

// ── Auto-generate order number with date prefix ───────────────
function makeOrderNum(date, seq) {
  const d = new Date(date);
  const y = d.getFullYear().toString().slice(2);
  const m = String(d.getMonth()+1).padStart(2,'0');
  return `KO-${y}${m}-${String(seq).padStart(3,'0')}`;
}
function makeSaleNum(date, seq) {
  const d = new Date(date);
  const y = d.getFullYear().toString().slice(2);
  const m = String(d.getMonth()+1).padStart(2,'0');
  return `QS-${y}${m}-${String(seq).padStart(3,'0')}`;
}
function makeRepairNum(date, seq) {
  return `REP-PAST-${String(seq).padStart(3,'0')}`;
}

// ── Default form templates ────────────────────────────────────
const defaultOrder = () => ({
  date:'',
  customer_name:'',
  phone:'',
  age:'',
  frame_desc:'',       // free text — "RayBan Black Plastic Full rim"
  frame_type:'Full rim',
  frame_color:'Black',
  customer_own_frame: false,
  lens_type:'Single Vision',
  lens_coating:'CR (White)',
  frame_price:'',
  lens_price:'',
  total:'',
  advance:'',
  status:'delivered',  // most past orders are delivered
  deliver_date:'',
  notes:'',
});

const defaultSale = () => ({
  date:'',
  customer_name:'',
  items_desc:'',       // free text description of items
  total:'',
  payment_method:'cash',
});

const defaultRepair = () => ({
  date:'',
  customer_name:'',
  repair_type:'Arm Repair',
  description:'',
  charge:'',
  payment_method:'cash',
});

// ══════════════════════════════════════════════════════════════
export default function BulkImport() {
  const [activeTab,  setActiveTab]  = useState('orders');
  const [saved,      setSaved]      = useState([]);   // list of successfully saved
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [seqCounter, setSeqCounter] = useState(1);

  // Current form
  const [orderForm,  setOrderForm]  = useState(defaultOrder());
  const [saleForm,   setSaleForm]   = useState(defaultSale());
  const [repairForm, setRepairForm] = useState(defaultRepair());

  const firstFieldRef = useRef(null);

  // ── Save an order ─────────────────────────────────────────
  const saveOrder = async () => {
    const f = orderForm;
    if (!f.date)    return setError('Date is required');
    if (!f.total && !f.lens_price) return setError('Enter at least the total or lens price');
    setError(''); setSaving(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');

      // 1. Create or find customer
      let customerId = null;
      if (f.customer_name.trim()) {
        try {
          const cr = await fetch(`${BASE}/customers`, {
            method:'POST',
            headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
            body:JSON.stringify({ name:f.customer_name.trim(), phone:f.phone.trim()||null, age:f.age||null }),
          }).then(r=>r.json());
          customerId = cr.data?.id || cr.id;
        } catch(e) {
          // try to search existing
        }
      }

      // If no customer, create anonymous
      if (!customerId) {
        const cr = await fetch(`${BASE}/customers`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
          body:JSON.stringify({ name: f.customer_name.trim() || 'Past Customer', phone:f.phone.trim()||null }),
        }).then(r=>r.json());
        customerId = cr.data?.id || cr.id || 1;
      }

      const totalAmt   = parseFloat(f.total)   || (parseFloat(f.frame_price||0) + parseFloat(f.lens_price||0));
      const advanceAmt = parseFloat(f.advance) || (f.status==='delivered' ? totalAmt : 0);
      const balanceAmt = Math.max(0, totalAmt - advanceAmt);

      // 2. Create order with backdated created_at
      const orderRes = await fetch(`${BASE}/orders/import`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body:JSON.stringify({
          customer_id:        customerId,
          frame:              f.frame_desc || 'Frame',
          frame_type:         f.frame_type,
          frame_color:        f.frame_color,
          frame_material:     'Plastic',
          lens_type:          f.lens_type,
          lens_coating:       f.lens_coating,
          frame_sell_price:   f.customer_own_frame ? 0 : (parseFloat(f.frame_price)||0),
          lens_sell_price:    parseFloat(f.lens_price)||0,
          total_amount:       totalAmt,
          advance_amount:     advanceAmt,
          balance_amount:     balanceAmt,
          deliver_date:       f.deliver_date || f.date,
          status:             f.status,
          notes:              f.notes || 'Imported from past records',
          customer_own_frame: f.customer_own_frame,
          import_date:        f.date,   // backend uses this to set created_at
        }),
      }).then(r=>r.json());

      if (orderRes.error) throw new Error(orderRes.error);

      setSaved(s=>[{ type:'order', num:orderRes.order_number, date:f.date, name:f.customer_name||'Walk-in', total:totalAmt }, ...s]);
      setSeqCounter(n=>n+1);
      setOrderForm(prev=>({ ...defaultOrder(), date:prev.date })); // keep date for next entry
      if (firstFieldRef.current) firstFieldRef.current.focus();
    } catch(e) { setError(e.message||'Failed to save'); }
    finally { setSaving(false); }
  };

  // ── Save a quick sale ─────────────────────────────────────
  const saveSale = async () => {
    const f = saleForm;
    if (!f.date)  return setError('Date is required');
    if (!f.total) return setError('Total is required');
    setError(''); setSaving(true);
    try {
      const res = await apiPost('/quick-sales/import', {
        customer_name:  f.customer_name.trim() || null,
        items:          [{ name: f.items_desc || 'Item', price: parseFloat(f.total)||0, qty:1, item_discount:0 }],
        subtotal:       parseFloat(f.total)||0,
        discount:       0,
        total:          parseFloat(f.total)||0,
        payment_method: f.payment_method,
        amount_paid:    parseFloat(f.total)||0,
        change_given:   0,
        import_date:    f.date,
      });
      if (res.error) throw new Error(res.error);
      setSaved(s=>[{ type:'sale', num:res.sale_number, date:f.date, name:f.customer_name||'Walk-in', total:parseFloat(f.total) }, ...s]);
      setSaleForm(prev=>({ ...defaultSale(), date:prev.date }));
      if (firstFieldRef.current) firstFieldRef.current.focus();
    } catch(e) { setError(e.message||'Failed to save'); }
    finally { setSaving(false); }
  };

  // ── Save a repair ─────────────────────────────────────────
  const saveRepair = async () => {
    const f = repairForm;
    if (!f.date) return setError('Date is required');
    setError(''); setSaving(true);
    try {
      const res = await apiPost('/repairs/import', {
        customer_name:  f.customer_name.trim() || null,
        repair_type:    f.repair_type,
        description:    f.description,
        charge:         parseFloat(f.charge)||0,
        payment_method: f.payment_method,
        status:         'collected',
        import_date:    f.date,
      });
      if (res.error) throw new Error(res.error);
      setSaved(s=>[{ type:'repair', num:res.repair_number, date:f.date, name:f.customer_name||'Walk-in', total:parseFloat(f.charge||0) }, ...s]);
      setRepairForm(prev=>({ ...defaultRepair(), date:prev.date }));
      if (firstFieldRef.current) firstFieldRef.current.focus();
    } catch(e) { setError(e.message||'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleSave = () => {
    setError('');
    if (activeTab==='orders')  return saveOrder();
    if (activeTab==='sales')   return saveSale();
    if (activeTab==='repairs') return saveRepair();
  };

  const handleKeyDown = (e) => {
    if (e.key==='Enter' && e.ctrlKey) handleSave();
  };

  const TABS = [
    { key:'orders',  label:'📋 Orders',      count: saved.filter(s=>s.type==='order').length  },
    { key:'sales',   label:'🛍️ Quick Sales',  count: saved.filter(s=>s.type==='sale').length   },
    { key:'repairs', label:'🔧 Repairs',      count: saved.filter(s=>s.type==='repair').length },
  ];

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ marginBottom:4 }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>📥 Bulk Import Past Records</h1>
        <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Enter past sales, quick sales and repairs. Use Ctrl+Enter to save quickly.</p>
      </div>

      {/* Progress */}
      {saved.length > 0 && (
        <div style={{ background:'#dcfce7', border:`1px solid #86efac`, borderRadius:10, padding:'10px 16px', marginTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:14, color:C.success, fontWeight:600 }}>
            ✅ {saved.length} record{saved.length!==1?'s':''} imported so far
          </span>
          <span style={{ fontSize:12, color:C.success }}>
            {saved.filter(s=>s.type==='order').length} orders ·
            {' '}{saved.filter(s=>s.type==='sale').length} quick sales ·
            {' '}{saved.filter(s=>s.type==='repair').length} repairs
          </span>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:16, marginTop:16, alignItems:'start' }}>

        {/* ── LEFT: Entry form ── */}
        <div>
          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, background:'white', borderRadius:'12px 12px 0 0', padding:'0 4px', marginBottom:0 }}>
            {TABS.map(t=>(
              <button key={t.key} onClick={()=>{ setActiveTab(t.key); setError(''); }}
                style={{ padding:'11px 18px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', color:activeTab===t.key?C.navy:C.muted, borderBottom:`2.5px solid ${activeTab===t.key?C.gold:'transparent'}`, marginBottom:-1 }}>
                {t.label} {t.count>0&&<span style={{ background:C.gold, color:C.navy, fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20, marginLeft:4 }}>{t.count}</span>}
              </button>
            ))}
          </div>

          <div style={{ background:'white', border:`1px solid ${C.border}`, borderTop:'none', borderRadius:'0 0 14px 14px', padding:'20px 22px' }} onKeyDown={handleKeyDown}>
            {error && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'9px 13px', fontSize:13, marginBottom:14 }}>⚠️ {error}</div>}

            {/* ── ORDER FORM ── */}
            {activeTab==='orders' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {/* Date — first and most important */}
                <div style={{ background:'#eff6ff', borderRadius:10, padding:'12px 14px' }}>
                  <label style={{ ...LBL, color:'#1e40af' }}>📅 Date of Order *</label>
                  <input ref={firstFieldRef} type="date" value={orderForm.date}
                    onChange={e=>setOrderForm(f=>({...f,date:e.target.value}))}
                    style={{ ...INP, fontSize:16, fontWeight:700, background:'white' }}/>
                  <div style={{ fontSize:11, color:'#1e40af', marginTop:5 }}>This sets the order's actual creation date in the system</div>
                </div>

                {/* Customer */}
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:10 }}>
                  <div><label style={LBL}>Customer Name</label><input value={orderForm.customer_name} onChange={e=>setOrderForm(f=>({...f,customer_name:e.target.value}))} placeholder="e.g. Mrs. Perera" style={INP}/></div>
                  <div><label style={LBL}>Phone</label><input value={orderForm.phone} onChange={e=>setOrderForm(f=>({...f,phone:e.target.value}))} placeholder="07X..." style={INP}/></div>
                  <div><label style={LBL}>Age</label><input type="number" value={orderForm.age} onChange={e=>setOrderForm(f=>({...f,age:e.target.value}))} placeholder="35" style={INP}/></div>
                </div>

                {/* Frame source toggle */}
                <div>
                  <label style={LBL}>Frame Source</label>
                  <div style={{ display:'flex', gap:8 }}>
                    {[[false,'🏪 Our frame'],[true,"👤 Customer's frame"]].map(([v,l])=>(
                      <button key={String(v)} onClick={()=>setOrderForm(f=>({...f,customer_own_frame:v}))}
                        style={{ flex:1, padding:'8px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${orderForm.customer_own_frame===v?C.navy:C.border}`, background:orderForm.customer_own_frame===v?C.navy:'white', color:orderForm.customer_own_frame===v?'white':C.muted }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frame description */}
                <div>
                  <label style={LBL}>Frame Description {orderForm.customer_own_frame?'(Customer\'s frame)':'(free text — no exact stock needed)'}</label>
                  <input value={orderForm.frame_desc} onChange={e=>setOrderForm(f=>({...f,frame_desc:e.target.value}))}
                    placeholder="e.g. RayBan Black Plastic Full rim, Titan Gold Metal..."
                    style={INP}/>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  <div>
                    <label style={LBL}>Frame Type</label>
                    <select value={orderForm.frame_type} onChange={e=>setOrderForm(f=>({...f,frame_type:e.target.value}))} style={SEL}>
                      {FRAME_TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Frame Color</label>
                    <select value={orderForm.frame_color} onChange={e=>setOrderForm(f=>({...f,frame_color:e.target.value}))} style={SEL}>
                      {FRAME_COLORS.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Lens Type</label>
                    <select value={orderForm.lens_type} onChange={e=>setOrderForm(f=>({...f,lens_type:e.target.value}))} style={SEL}>
                      {LENS_TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={LBL}>Lens Coating</label>
                    <select value={orderForm.lens_coating} onChange={e=>setOrderForm(f=>({...f,lens_coating:e.target.value}))} style={SEL}>
                      {COATINGS.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Status</label>
                    <select value={orderForm.status} onChange={e=>setOrderForm(f=>({...f,status:e.target.value}))} style={SEL}>
                      <option value="delivered">✅ Delivered</option>
                      <option value="created">📝 In Progress</option>
                    </select>
                  </div>
                </div>

                {/* Prices */}
                <div style={{ background:C.cream, borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.navy, marginBottom:10 }}>💰 Pricing</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
                    {!orderForm.customer_own_frame && (
                      <div><label style={LBL}>Frame Price</label><input type="number" value={orderForm.frame_price} onChange={e=>setOrderForm(f=>({...f,frame_price:e.target.value}))} placeholder="0" style={INP}/></div>
                    )}
                    <div><label style={LBL}>Lens Price</label><input type="number" value={orderForm.lens_price} onChange={e=>setOrderForm(f=>({...f,lens_price:e.target.value}))} placeholder="e.g. 5000" style={INP}/></div>
                    <div>
                      <label style={LBL}>Total</label>
                      <input type="number" value={orderForm.total} onChange={e=>setOrderForm(f=>({...f,total:e.target.value}))}
                        placeholder={String((parseFloat(orderForm.frame_price||0)+parseFloat(orderForm.lens_price||0))||'')}
                        style={{ ...INP, fontWeight:700 }}/>
                    </div>
                    <div>
                      <label style={LBL}>Advance Paid</label>
                      <input type="number" value={orderForm.advance} onChange={e=>setOrderForm(f=>({...f,advance:e.target.value}))}
                        placeholder={orderForm.status==='delivered'?'Full amount':'e.g. 2000'}
                        style={INP}/>
                    </div>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div><label style={LBL}>Delivery Date</label><input type="date" value={orderForm.deliver_date} onChange={e=>setOrderForm(f=>({...f,deliver_date:e.target.value}))} style={INP}/></div>
                  <div><label style={LBL}>Notes (optional)</label><input value={orderForm.notes} onChange={e=>setOrderForm(f=>({...f,notes:e.target.value}))} placeholder="Any note..." style={INP}/></div>
                </div>
              </div>
            )}

            {/* ── QUICK SALE FORM ── */}
            {activeTab==='sales' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ background:'#eff6ff', borderRadius:10, padding:'12px 14px' }}>
                  <label style={{ ...LBL, color:'#1e40af' }}>📅 Date of Sale *</label>
                  <input ref={firstFieldRef} type="date" value={saleForm.date}
                    onChange={e=>setSaleForm(f=>({...f,date:e.target.value}))}
                    style={{ ...INP, fontSize:16, fontWeight:700, background:'white' }}/>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div><label style={LBL}>Customer Name (optional)</label><input value={saleForm.customer_name} onChange={e=>setSaleForm(f=>({...f,customer_name:e.target.value}))} placeholder="Walk-in customer" style={INP}/></div>
                  <div>
                    <label style={LBL}>Payment</label>
                    <select value={saleForm.payment_method} onChange={e=>setSaleForm(f=>({...f,payment_method:e.target.value}))} style={SEL}>
                      <option value="cash">💵 Cash</option>
                      <option value="bank">🏦 Bank</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={LBL}>What was sold (free text)</label>
                  <input value={saleForm.items_desc} onChange={e=>setSaleForm(f=>({...f,items_desc:e.target.value}))}
                    placeholder="e.g. Sunglass black, Reading glass +2.00, Frame chain..."
                    style={INP}/>
                </div>
                <div>
                  <label style={LBL}>Total Amount (Rs.) *</label>
                  <input ref={activeTab==='sales'?firstFieldRef:null}
                    type="number" value={saleForm.total} onChange={e=>setSaleForm(f=>({...f,total:e.target.value}))}
                    placeholder="e.g. 2500" style={{ ...INP, fontSize:18, fontWeight:700 }}/>
                </div>
              </div>
            )}

            {/* ── REPAIR FORM ── */}
            {activeTab==='repairs' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ background:'#eff6ff', borderRadius:10, padding:'12px 14px' }}>
                  <label style={{ ...LBL, color:'#1e40af' }}>📅 Date of Repair *</label>
                  <input ref={firstFieldRef} type="date" value={repairForm.date}
                    onChange={e=>setRepairForm(f=>({...f,date:e.target.value}))}
                    style={{ ...INP, fontSize:16, fontWeight:700, background:'white' }}/>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div><label style={LBL}>Customer Name (optional)</label><input value={repairForm.customer_name} onChange={e=>setRepairForm(f=>({...f,customer_name:e.target.value}))} placeholder="Walk-in" style={INP}/></div>
                  <div>
                    <label style={LBL}>Repair Type</label>
                    <select value={repairForm.repair_type} onChange={e=>setRepairForm(f=>({...f,repair_type:e.target.value}))} style={SEL}>
                      {REPAIR_TYPES.map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div><label style={LBL}>Description (optional)</label><input value={repairForm.description} onChange={e=>setRepairForm(f=>({...f,description:e.target.value}))} placeholder="e.g. Left arm hinge broken..." style={INP}/></div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={LBL}>Charge (Rs.) — 0 for free</label>
                    <input type="number" value={repairForm.charge} onChange={e=>setRepairForm(f=>({...f,charge:e.target.value}))} placeholder="e.g. 200" style={{ ...INP, fontSize:16, fontWeight:700 }}/>
                  </div>
                  <div>
                    <label style={LBL}>Payment</label>
                    <select value={repairForm.payment_method} onChange={e=>setRepairForm(f=>({...f,payment_method:e.target.value}))} style={SEL}>
                      <option value="cash">💵 Cash</option>
                      <option value="bank">🏦 Bank</option>
                      <option value="free">🎁 Free</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Save button */}
            <div style={{ marginTop:16, display:'flex', gap:10, alignItems:'center' }}>
              <button onClick={handleSave} disabled={saving}
                style={{ flex:1, padding:'13px', background:saving?C.muted:C.success, color:'white', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
                {saving ? '⏳ Saving...' : `✅ Save & Next  (or Ctrl+Enter)`}
              </button>
              <button onClick={()=>{
                if(activeTab==='orders')  setOrderForm(defaultOrder());
                if(activeTab==='sales')   setSaleForm(defaultSale());
                if(activeTab==='repairs') setRepairForm(defaultRepair());
                setError('');
              }}
                style={{ padding:'13px 16px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
                🗑️ Clear
              </button>
            </div>

            <div style={{ marginTop:8, fontSize:12, color:C.muted, textAlign:'center' }}>
              💡 Tip: Set the date, fill in details, press <b>Ctrl+Enter</b> to save and move to the next record. Date stays the same so you can enter multiple records for the same day quickly.
            </div>
          </div>
        </div>

        {/* ── RIGHT: Saved records log ── */}
        <div style={{ position:'sticky', top:80 }}>
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>📥 Imported ({saved.length})</span>
              {saved.length>0 && <button onClick={()=>setSaved([])} style={{ background:'none', border:'none', color:C.muted, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>Clear log</button>}
            </div>

            {!saved.length
              ? <div style={{ padding:'28px 16px', textAlign:'center', color:C.muted, fontSize:13 }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>📥</div>
                  Records you save will appear here
                </div>
              : <div style={{ maxHeight:480, overflowY:'auto' }}>
                  {saved.map((s,i)=>(
                    <div key={i} style={{ padding:'10px 16px', borderBottom:`1px solid ${C.cream}`, display:'flex', gap:10, alignItems:'center' }}>
                      <div style={{ fontSize:20 }}>{s.type==='order'?'📋':s.type==='sale'?'🛍️':'🔧'}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:C.navy }}>{s.num}</div>
                        <div style={{ fontSize:11, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.date} · {s.name}</div>
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.success, flexShrink:0 }}>{fmt(s.total)}</div>
                    </div>
                  ))}
                </div>
            }

            {saved.length > 0 && (
              <div style={{ padding:'10px 16px', background:C.cream, fontSize:13, fontWeight:700, display:'flex', justifyContent:'space-between', borderTop:`1px solid ${C.border}` }}>
                <span style={{ color:C.muted }}>Total imported</span>
                <span style={{ color:C.navy }}>{fmt(saved.reduce((s,r)=>s+r.total,0))}</span>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div style={{ background:'#fffbeb', border:`1px solid #fde68a`, borderRadius:12, padding:'14px 16px', marginTop:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#92400e', marginBottom:8 }}>📌 How to enter past records</div>
            <div style={{ fontSize:12, color:'#78350f', lineHeight:1.7 }}>
              <div>1. Pick the type (Order / Quick Sale / Repair)</div>
              <div>2. Set the <b>exact date</b> it happened</div>
              <div>3. Fill in what you remember — frame description is free text, no exact stock needed</div>
              <div>4. Press <b>Ctrl+Enter</b> or click Save</div>
              <div>5. Date stays set — enter the next record for same day quickly</div>
              <div style={{ marginTop:6 }}>✅ All records will appear in Reports, Dashboard cash summary, and PDF export with the correct dates.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
