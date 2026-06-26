/* eslint-disable */
// ============================================================
//  BulkImport.js — Enter past sales quickly
//  For orders, quick sales, and repairs done before the system
//  Minimal fields, fast entry, backdate to exact date
// ============================================================
import React, { useState, useRef } from 'react';

const C = {
  navy:    'var(--navy)',
  gold:    'var(--gold)',
  cream:   'var(--bg-sunken)',
  surface: 'var(--bg-surface)',
  border:  'var(--border)',
  muted:   'var(--text-muted)',
  success: 'var(--success)',
  danger:  'var(--danger)',
  warning: 'var(--warning)',
  info:    'var(--info)',
};
const fmt  = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
const INP  = { padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:'var(--font-body)', outline:'none', background:C.cream, color:C.navy, width:'100%', boxSizing:'border-box' };
const SEL  = { ...INP, cursor:'pointer' };
const LBL  = { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:4, display:'block' };

const LENS_TYPES   = ['Single Vision','Bifocal','Progressive','Reading','Sunglass Lens','Photochromic'];
const COATINGS     = ['CR (White)','HMC','Hard Coat','Blue Filter','Photochromic','Blue + Photochromic','AR Coat'];
const FRAME_MATS   = ['Plastic','Metal','TR90','Titanium','Acetate','Mixed'];
const FRAME_SHAPES = ['Oval','Rectangle','Round','Square','Cat Eye','Aviator','Wayfarer'];
const FRAME_SIZES  = ['Small','Medium','Large','Extra Large'];
const FRAME_TYPES  = ['Full rim','Half rim','Rimless'];
const FRAME_COLORS = ['Black','Gold','Silver','Brown','Blue','Grey','Red','Green','Pink','Purple','Tortoise','Transparent','White','Rose Gold','Gunmetal'];
const LENS_COMPANIES = ['Negombo Optical','Solex','Local Lab','Other'];
const DIOPTERS    = ['0.00',...Array.from({length:80},(_,i)=>((i+1)*0.25).toFixed(2))];
const AXES        = Array.from({length:181},(_,i)=>String(i));
const VA_OPTIONS  = ['6/6','6/9','6/12','6/18','6/24','6/36','6/60','CF','HM','PL'];
const ORDER_TYPES  = ['normal','lens_warranty','lens_paid','frame_replace_free','frame_replace_paid'];
const ORDER_TYPE_LABELS = { normal:'Normal Order', lens_warranty:'🔁 Lens Replace Free', lens_paid:'🔬 Lens Replace Paid', frame_replace_free:'🎁 Frame Replace Free', frame_replace_paid:'💰 Frame Replace Paid' };
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
  title:'',            // Mr / Mrs / Miss / Master / Rev
  customer_name:'',
  phone:'',
  age:'',
  frame_desc:'',       // free text — "RayBan Black Plastic Full rim"
  frame_type:'Full rim',
  frame_color:'Black',
  frame_material:'Plastic',
  frame_shape:'',
  frame_size:'',
  customer_own_frame: false,
  lens_type:'Single Vision',
  lens_coating:'CR (White)',
  lens_company:'',
  lens_index:'',
  order_type:'normal',
  frame_price:'',
  lens_price:'',
  total:'',
  advance:'',
  discount:'',
  status:'delivered',  // most past orders are delivered
  deliver_date:'',
  notes:'',
  // Refraction — same fields as NewOrder
  has_rx:false,
  rx_source:'shop',   // 'shop' = done by us, 'customer' = customer brought report
  r_sph_s:'-', r_sph:'0.00', r_cyl_s:'-', r_cyl:'0.00', r_axis:'0', r_add:'0.00', r_va:'6/6', r_pd:'',
  l_sph_s:'-', l_sph:'0.00', l_cyl_s:'-', l_cyl:'0.00', l_axis:'0', l_add:'0.00', l_va:'6/6', l_pd:'',
  rx_notes:'', rx_hospital:'', rx_date:'', rx_doctor:'',
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
  title:'',
  customer_name:'',
  phone:'',
  repair_type:'Arm Repair',
  frame_brand:'',
  description:'',
  charge:'',
  payment_method:'cash',
  status:'collected',
  notes:'',
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

      // 1. Create customer — always force new record
      const custName = ((f.title ? f.title + ' ' : '') + (f.customer_name.trim() || 'Past Customer')).trim();
      let customerId = null;
      try {
        const custRes  = await fetch(`${BASE}/customers`, {
          method:  'POST',
          headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
          body:    JSON.stringify({
            name:      custName,
            phone:     f.phone.trim() || null,
            age:       f.age         || null,
            force_new: true,
          }),
        });
        const custJson = await custRes.json();
        // Handle all possible response shapes
        customerId = custJson?.data?.id || custJson?.id || custJson?.data?.data?.id || null;
        if (!customerId) throw new Error('No customer ID in response: ' + JSON.stringify(custJson).slice(0,100));
      } catch(e) {
        throw new Error('Failed to create customer: ' + e.message);
      }

      const autoTotal  = parseFloat(f.frame_price||0) + parseFloat(f.lens_price||0);
      const totalAmt   = parseFloat(f.total) || autoTotal;
      const discountAmt = parseFloat(f.discount||0);
      const totalAfterDiscount = Math.max(0, totalAmt - discountAmt);
      const advanceAmt = parseFloat(f.advance) || (f.status==='delivered' ? totalAfterDiscount : 0);
      const balanceAmt = Math.max(0, totalAfterDiscount - advanceAmt);

      // 2. Create order with backdated created_at
      const orderRes = await fetch(`${BASE}/orders/import`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body:JSON.stringify({
          customer_id:        customerId,
          frame:              f.frame_desc || 'Frame',
          frame_type:         f.frame_type,
          frame_color:        f.frame_color,
          frame_material:     f.frame_material || 'Plastic',
          frame_shape:        f.frame_shape || null,
          frame_size:         f.frame_size  || null,
          lens_type:          f.lens_type,
          lens_coating:       f.lens_coating,
          lens_company:       f.lens_company || null,
          lens_index:         f.lens_index   || null,
          order_type:         f.order_type   || 'normal',
          frame_sell_price:   f.customer_own_frame ? 0 : (parseFloat(f.frame_price)||0),
          lens_sell_price:    parseFloat(f.lens_price)||0,
          total_amount:       totalAfterDiscount,
          advance_amount:     advanceAmt,
          balance_amount:     balanceAmt,
          deliver_date:       f.deliver_date || f.date,
          status:             f.status,
          notes:              f.notes || 'Imported from past records',
          customer_own_frame: f.customer_own_frame,
          import_date:        f.date,   // backend uses this to set created_at
          has_rx:      f.has_rx,
          rx_source:   f.has_rx ? (f.rx_source||'shop') : null,
          rx_hospital: f.has_rx ? f.rx_hospital||null : null,
          rx_date:     f.has_rx ? f.rx_date||null     : null,
          rx_doctor:   f.has_rx ? f.rx_doctor||null   : null,
          r_sph:  f.has_rx ? ((!f.r_sph||f.r_sph==='0.00') ? 'Plano' : f.r_sph_s+f.r_sph) : null,
          r_cyl:  f.has_rx ? ((!f.r_cyl||f.r_cyl==='0.00') ? '0.00'  : f.r_cyl_s+f.r_cyl) : null,
          r_axis: f.has_rx ? f.r_axis||null : null,
          r_add:  f.has_rx ? (f.r_add&&f.r_add!=='0.00' ? '+'+f.r_add : null) : null,
          r_va:   f.has_rx ? f.r_va||null   : null,
          r_pd:   f.has_rx ? f.r_pd||null   : null,
          l_sph:  f.has_rx ? ((!f.l_sph||f.l_sph==='0.00') ? 'Plano' : f.l_sph_s+f.l_sph) : null,
          l_cyl:  f.has_rx ? ((!f.l_cyl||f.l_cyl==='0.00') ? '0.00'  : f.l_cyl_s+f.l_cyl) : null,
          l_axis: f.has_rx ? f.l_axis||null : null,
          l_add:  f.has_rx ? (f.l_add&&f.l_add!=='0.00' ? '+'+f.l_add : null) : null,
          l_va:   f.has_rx ? f.l_va||null   : null,
          l_pd:   f.has_rx ? f.l_pd||null   : null,
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
      const repairCustName = ((f.title?f.title+' ':'')+f.customer_name.trim()).trim() || null;
      const res = await apiPost('/repairs/import', {
        customer_name:  repairCustName,
        phone:          f.phone.trim() || null,
        repair_type:    f.repair_type,
        frame_brand:    f.frame_brand.trim() || null,
        description:    f.description.trim() || null,
        charge:         parseFloat(f.charge)||0,
        payment_method: f.payment_method,
        status:         f.status || 'collected',
        notes:          f.notes.trim() || null,
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
    <div style={{ fontFamily:'var(--font-body)' }}>
      <div style={{ marginBottom:4 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:24, color:C.navy, margin:0 }}>📥 Bulk Import Past Records</h1>
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
          <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, background:C.surface, borderRadius:'12px 12px 0 0', padding:'0 4px', marginBottom:0 }}>
            {TABS.map(t=>(
              <button key={t.key} onClick={()=>{ setActiveTab(t.key); setError(''); }}
                style={{ padding:'11px 18px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', color:activeTab===t.key?C.navy:C.muted, borderBottom:`2.5px solid ${activeTab===t.key?C.gold:'transparent'}`, marginBottom:-1 }}>
                {t.label} {t.count>0&&<span style={{ background:C.gold, color:C.navy, fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20, marginLeft:4 }}>{t.count}</span>}
              </button>
            ))}
          </div>

          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderTop:'none', borderRadius:'0 0 14px 14px', padding:'20px 22px' }} onKeyDown={handleKeyDown}>
            {error && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'9px 13px', fontSize:13, marginBottom:14 }}>⚠️ {error}</div>}

            {/* ── ORDER FORM ── */}
            {activeTab==='orders' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {/* Date — first and most important */}
                <div style={{ background:'#eff6ff', borderRadius:10, padding:'12px 14px' }}>
                  <label style={{ ...LBL, color:'#1e40af' }}>📅 Date of Order *</label>
                  <input ref={firstFieldRef} type="date" value={orderForm.date}
                    onChange={e=>setOrderForm(f=>({...f,date:e.target.value}))}
                    style={{ ...INP, fontSize:16, fontWeight:700, background:C.surface }}/>
                  <div style={{ fontSize:11, color:'#1e40af', marginTop:5 }}>This sets the order's actual creation date in the system</div>
                </div>

                {/* Customer */}
                <div style={{ display:'grid', gridTemplateColumns:'100px 1fr 140px 100px', gap:10 }}>
                  <div>
                    <label style={LBL}>Title</label>
                    <select value={orderForm.title} onChange={e=>setOrderForm(f=>({...f,title:e.target.value}))} style={{ ...INP, cursor:'pointer' }}>
                      <option value=''>—</option>
                      {['Mr','Mrs','Miss','Master','Rev','Dr'].map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label style={LBL}>Customer Name</label>
                    <input value={orderForm.customer_name} onChange={e=>setOrderForm(f=>({...f,customer_name:e.target.value}))}
                      placeholder="Full name" style={INP}/>
                  </div>
                  <div><label style={LBL}>Phone</label><input value={orderForm.phone} onChange={e=>setOrderForm(f=>({...f,phone:e.target.value}))} placeholder="07X..." style={INP}/></div>
                  <div><label style={LBL}>Age</label><input type="number" value={orderForm.age} onChange={e=>setOrderForm(f=>({...f,age:e.target.value}))} placeholder="35" style={INP}/></div>
                </div>

                {/* Order type */}
                <div>
                  <label style={LBL}>Order Type</label>
                  <select value={orderForm.order_type} onChange={e=>setOrderForm(f=>({...f,order_type:e.target.value}))} style={SEL}>
                    {ORDER_TYPES.map(t=><option key={t} value={t}>{ORDER_TYPE_LABELS[t]}</option>)}
                  </select>
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
                  <label style={LBL}>Frame Description (brand · model · color)</label>
                  <input value={orderForm.frame_desc} onChange={e=>setOrderForm(f=>({...f,frame_desc:e.target.value}))}
                    placeholder="e.g. RayBan RB4487 Black, Prada SPR88S Brown..."
                    style={INP}/>
                </div>

                {/* Frame details grid */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  <div>
                    <label style={LBL}>Frame Type</label>
                    <select value={orderForm.frame_type} onChange={e=>setOrderForm(f=>({...f,frame_type:e.target.value}))} style={SEL}>
                      {FRAME_TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Frame Color</label>
                    <select value={orderForm.frame_color} onChange={e=>setOrderForm(f=>({...f,frame_color:e.target.value}))} style={SEL}>
                      {FRAME_COLORS.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Frame Material</label>
                    <select value={orderForm.frame_material} onChange={e=>setOrderForm(f=>({...f,frame_material:e.target.value}))} style={SEL}>
                      {FRAME_MATS.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Frame Shape</label>
                    <select value={orderForm.frame_shape} onChange={e=>setOrderForm(f=>({...f,frame_shape:e.target.value}))} style={SEL}>
                      <option value=''>— Any —</option>
                      {FRAME_SHAPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Frame Size</label>
                    <select value={orderForm.frame_size} onChange={e=>setOrderForm(f=>({...f,frame_size:e.target.value}))} style={SEL}>
                      <option value=''>— Any —</option>
                      {FRAME_SIZES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
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

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
                  <div>
                    <label style={LBL}>Lens Coating</label>
                    <select value={orderForm.lens_coating} onChange={e=>setOrderForm(f=>({...f,lens_coating:e.target.value}))} style={SEL}>
                      {COATINGS.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Lens Company / Lab</label>
                    <select value={orderForm.lens_company} onChange={e=>setOrderForm(f=>({...f,lens_company:e.target.value}))} style={SEL}>
                      <option value=''>— Select —</option>
                      {LENS_COMPANIES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Lens Index</label>
                    <select value={orderForm.lens_index} onChange={e=>setOrderForm(f=>({...f,lens_index:e.target.value}))} style={SEL}>
                      {['','1.50','1.56','1.61','1.67','1.74'].map(t=><option key={t} value={t}>{t||'— Default —'}</option>)}
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

                {/* Prices — same as New Order Step 4 */}
                <div style={{ background:C.cream, borderRadius:10, padding:'14px 16px' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.navy, marginBottom:12 }}>💰 Pricing</div>

                  {/* Frame + Lens prices */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                    {!orderForm.customer_own_frame && (
                      <div>
                        <label style={LBL}>🕶️ Frame Selling Price (Rs.)</label>
                        <input type="number" value={orderForm.frame_price} onChange={e=>setOrderForm(f=>({...f,frame_price:e.target.value}))}
                          placeholder="0" style={{ ...INP, fontSize:15, fontWeight:600 }}/>
                      </div>
                    )}
                    <div>
                      <label style={LBL}>🔬 Lens Selling Price (Rs.)</label>
                      <input type="number" value={orderForm.lens_price} onChange={e=>setOrderForm(f=>({...f,lens_price:e.target.value}))}
                        placeholder="e.g. 5000" style={{ ...INP, fontSize:15, fontWeight:600 }}/>
                    </div>
                  </div>

                  {/* Auto-calculated total */}
                  {(() => {
                    const autoTotal = parseFloat(orderForm.frame_price||0) + parseFloat(orderForm.lens_price||0);
                    const manualTotal = parseFloat(orderForm.total||0);
                    const displayTotal = manualTotal || autoTotal;
                    const advance = parseFloat(orderForm.advance||0) || (orderForm.status==='delivered' ? displayTotal : 0);
                    const balance = Math.max(0, displayTotal - advance);
                    return (
                      <div style={{ background:C.surface, borderRadius:9, padding:'12px 14px', marginBottom:10 }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                          <div>
                            <label style={LBL}>Total Amount (Rs.)</label>
                            <input type="number" value={orderForm.total} onChange={e=>setOrderForm(f=>({...f,total:e.target.value}))}
                              placeholder={String(autoTotal||'')}
                              style={{ ...INP, fontSize:16, fontWeight:700 }}/>
                            {autoTotal>0 && !orderForm.total && (
                              <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>Auto: Rs.{autoTotal.toLocaleString()}</div>
                            )}
                          </div>
                          <div>
                            <label style={LBL}>Advance Paid (Rs.)</label>
                            <input type="number" value={orderForm.advance} onChange={e=>setOrderForm(f=>({...f,advance:e.target.value}))}
                              placeholder={orderForm.status==='delivered'?String(displayTotal||'Full amount'):'e.g. 2000'}
                              style={INP}/>
                          </div>
                        </div>
                        {/* Balance */}
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                          padding:'10px 14px', borderRadius:8,
                          background: balance===0?'#dcfce7':'#fef9c3',
                          border: `1px solid ${balance===0?'#86efac':'#fde047'}` }}>
                          <span style={{ fontSize:13, fontWeight:700, color: balance===0?'#2d7a4f':'#92400e' }}>
                            {balance===0 ? '✅ Fully Paid' : `⏳ Balance Due`}
                          </span>
                          <span style={{ fontSize:16, fontWeight:700, color: balance===0?'#2d7a4f':'#92400e' }}>
                            Rs.{balance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Discount (optional) */}
                  <div>
                    <label style={LBL}>Overall Discount (Rs.) — optional</label>
                    <input type="number" value={orderForm.discount||''} onChange={e=>setOrderForm(f=>({...f,discount:e.target.value}))}
                      placeholder="0" style={INP}/>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div><label style={LBL}>Delivery Date</label><input type="date" value={orderForm.deliver_date} onChange={e=>setOrderForm(f=>({...f,deliver_date:e.target.value}))} style={INP}/></div>
                  <div><label style={LBL}>Notes (optional)</label><input value={orderForm.notes} onChange={e=>setOrderForm(f=>({...f,notes:e.target.value}))} placeholder="Any note..." style={INP}/></div>
                </div>

                {/* Refraction — same layout as New Order */}
                <div style={{ background:C.cream, borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:orderForm.has_rx?14:0 }}>
                    <label style={{ fontSize:13, fontWeight:700, color:C.navy }}>👁️ Refraction / Prescription</label>
                    <div onClick={()=>setOrderForm(f=>({...f,has_rx:!f.has_rx}))}
                      style={{ width:44, height:24, borderRadius:12, background:orderForm.has_rx?C.navy:C.border,
                        position:'relative', cursor:'pointer', transition:'background .2s', flexShrink:0 }}>
                      <div style={{ position:'absolute', top:3, left:orderForm.has_rx?23:3, width:18, height:18,
                        borderRadius:'50%', background:C.surface, transition:'left .2s' }}/>
                    </div>
                  </div>
                  {orderForm.has_rx && (
                    <>
                      {/* Rx Source toggle — who did the refraction */}
                      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                        {[
                          { val:'shop',     label:'🏪 Done by us',          desc:'Refraction done at our shop' },
                          { val:'customer', label:'📋 Customer brought Rx', desc:'Customer brought a report/prescription' },
                        ].map(opt=>(
                          <button key={opt.val} onClick={()=>setOrderForm(f=>({...f,rx_source:opt.val}))}
                            style={{ flex:1, padding:'8px 10px', borderRadius:9, fontSize:12, fontWeight:600,
                              cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                              border:`2px solid ${orderForm.rx_source===opt.val ? C.navy : C.border}`,
                              background: orderForm.rx_source===opt.val ? C.navy : 'white',
                              color: orderForm.rx_source===opt.val ? 'white' : C.muted }}>
                            <div>{opt.label}</div>
                            <div style={{ fontSize:10, opacity:.7, marginTop:2 }}>{opt.desc}</div>
                          </button>
                        ))}
                      </div>

                      {[{label:'Right Eye (R)',p:'r'},{label:'Left Eye (L)',p:'l'}].map(eye=>(
                        <div key={eye.p} style={{ background:C.surface, borderRadius:9, padding:12, marginBottom:10 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:C.navy, marginBottom:8 }}>{eye.label}</div>
                          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                            {/* SPH */}
                            <div>
                              <div style={{ fontSize:10, fontWeight:700, color:C.muted, marginBottom:4 }}>SPH</div>
                              <div style={{ display:'flex', gap:4 }}>
                                <select value={orderForm[eye.p+'_sph_s']} onChange={e=>setOrderForm(f=>({...f,[eye.p+'_sph_s']:e.target.value}))}
                                  style={{ ...SEL, width:50, padding:'8px 4px' }}>
                                  <option>-</option><option>+</option>
                                </select>
                                <select value={orderForm[eye.p+'_sph']} onChange={e=>setOrderForm(f=>({...f,[eye.p+'_sph']:e.target.value}))}
                                  style={{ ...SEL, width:84 }}>
                                  {DIOPTERS.map(v=><option key={v}>{v}</option>)}
                                </select>
                              </div>
                            </div>
                            {/* CYL */}
                            <div>
                              <div style={{ fontSize:10, fontWeight:700, color:C.muted, marginBottom:4 }}>CYL</div>
                              <div style={{ display:'flex', gap:4 }}>
                                <select value={orderForm[eye.p+'_cyl_s']} onChange={e=>setOrderForm(f=>({...f,[eye.p+'_cyl_s']:e.target.value}))}
                                  style={{ ...SEL, width:50, padding:'8px 4px' }}>
                                  <option>-</option><option>+</option>
                                </select>
                                <select value={orderForm[eye.p+'_cyl']} onChange={e=>setOrderForm(f=>({...f,[eye.p+'_cyl']:e.target.value}))}
                                  style={{ ...SEL, width:84 }}>
                                  {DIOPTERS.map(v=><option key={v}>{v}</option>)}
                                </select>
                              </div>
                            </div>
                            {/* AXIS */}
                            <div>
                              <div style={{ fontSize:10, fontWeight:700, color:C.muted, marginBottom:4 }}>AXIS</div>
                              <select value={orderForm[eye.p+'_axis']} onChange={e=>setOrderForm(f=>({...f,[eye.p+'_axis']:e.target.value}))}
                                style={{ ...SEL, width:76 }}>
                                {AXES.map(v=><option key={v}>{v}</option>)}
                              </select>
                            </div>
                            {/* ADD */}
                            <div>
                              <div style={{ fontSize:10, fontWeight:700, color:C.muted, marginBottom:4 }}>ADD</div>
                              <select value={orderForm[eye.p+'_add']} onChange={e=>setOrderForm(f=>({...f,[eye.p+'_add']:e.target.value}))}
                                style={{ ...SEL, width:84 }}>
                                {DIOPTERS.map(v=><option key={v}>{v}</option>)}
                              </select>
                            </div>
                            {/* VA */}
                            <div>
                              <div style={{ fontSize:10, fontWeight:700, color:C.muted, marginBottom:4 }}>V/A</div>
                              <select value={orderForm[eye.p+'_va']} onChange={e=>setOrderForm(f=>({...f,[eye.p+'_va']:e.target.value}))}
                                style={{ ...SEL, width:80 }}>
                                {VA_OPTIONS.map(v=><option key={v}>{v}</option>)}
                              </select>
                            </div>
                            {/* PD */}
                            <div>
                              <div style={{ fontSize:10, fontWeight:700, color:C.muted, marginBottom:4 }}>PD</div>
                              <input value={orderForm[eye.p+'_pd']||''} onChange={e=>setOrderForm(f=>({...f,[eye.p+'_pd']:e.target.value}))}
                                placeholder="32" style={{ ...INP, width:64 }}/>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Copy right to left */}
                      <button onClick={()=>setOrderForm(f=>({...f,
                        l_sph_s:f.r_sph_s, l_sph:f.r_sph, l_cyl_s:f.r_cyl_s, l_cyl:f.r_cyl,
                        l_axis:f.r_axis, l_add:f.r_add, l_va:f.r_va, l_pd:f.r_pd,
                      }))} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:7,
                        padding:'6px 14px', fontSize:12, cursor:'pointer', fontFamily:'inherit',
                        color:C.muted, marginBottom:10 }}>
                        ↓ Copy Right Eye to Left Eye
                      </button>

                      {/* Clinical notes */}
                      <div style={{ marginBottom:8 }}>
                        <label style={LBL}>Remarks / Clinical Notes</label>
                        <textarea value={orderForm.rx_notes||''} onChange={e=>setOrderForm(f=>({...f,rx_notes:e.target.value}))}
                          placeholder="e.g. Presbyopia, recommend progressive lenses..."
                          style={{ ...INP, resize:'vertical', minHeight:60, lineHeight:1.6 }}/>
                      </div>

                      {/* Hospital / Doctor / Date — only when customer brought Rx */}
                      {orderForm.rx_source === 'customer' && (
                        <div style={{ background:'#eff6ff', borderRadius:9, padding:'10px 12px', marginTop:4 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'#1e40af', marginBottom:8 }}>📋 Prescription Source Details</div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                            <div>
                              <label style={LBL}>Hospital / Clinic</label>
                              <input value={orderForm.rx_hospital||''} onChange={e=>setOrderForm(f=>({...f,rx_hospital:e.target.value}))}
                                placeholder="e.g. Chilaw Hospital" style={INP}/>
                            </div>
                            <div>
                              <label style={LBL}>Doctor</label>
                              <input value={orderForm.rx_doctor||''} onChange={e=>setOrderForm(f=>({...f,rx_doctor:e.target.value}))}
                                placeholder="Dr. name" style={INP}/>
                            </div>
                            <div>
                              <label style={LBL}>Rx Date</label>
                              <input type="date" value={orderForm.rx_date||''} onChange={e=>setOrderForm(f=>({...f,rx_date:e.target.value}))}
                                style={INP}/>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
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
                    style={{ ...INP, fontSize:16, fontWeight:700, background:C.surface }}/>
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

                {/* Date */}
                <div style={{ background:'#eff6ff', borderRadius:10, padding:'12px 14px' }}>
                  <label style={{ ...LBL, color:'#1e40af' }}>📅 Date of Repair *</label>
                  <input ref={firstFieldRef} type="date" value={repairForm.date}
                    onChange={e=>setRepairForm(f=>({...f,date:e.target.value}))}
                    style={{ ...INP, fontSize:16, fontWeight:700, background:C.surface }}/>
                  <div style={{ fontSize:11, color:'#2563eb', marginTop:4 }}>This sets the actual repair date in the system</div>
                </div>

                {/* Customer */}
                <div style={{ display:'grid', gridTemplateColumns:'90px 1fr 140px', gap:8 }}>
                  <div>
                    <label style={LBL}>Title</label>
                    <select value={repairForm.title} onChange={e=>setRepairForm(f=>({...f,title:e.target.value}))} style={{ ...INP, cursor:'pointer' }}>
                      <option value=''>—</option>
                      {['Mr','Mrs','Miss','Master','Rev','Dr'].map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Customer Name</label>
                    <input value={repairForm.customer_name} onChange={e=>setRepairForm(f=>({...f,customer_name:e.target.value}))}
                      placeholder="Full name (optional)" style={INP}/>
                  </div>
                  <div>
                    <label style={LBL}>Phone</label>
                    <input value={repairForm.phone} onChange={e=>setRepairForm(f=>({...f,phone:e.target.value}))}
                      placeholder="07X..." style={INP}/>
                  </div>
                </div>

                {/* Repair details */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={LBL}>Repair Type</label>
                    <select value={repairForm.repair_type} onChange={e=>setRepairForm(f=>({...f,repair_type:e.target.value}))} style={SEL}>
                      {REPAIR_TYPES.map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Frame Brand / Model</label>
                    <input value={repairForm.frame_brand} onChange={e=>setRepairForm(f=>({...f,frame_brand:e.target.value}))}
                      placeholder="e.g. RayBan, Prada..." style={INP}/>
                  </div>
                </div>

                <div>
                  <label style={LBL}>Description</label>
                  <input value={repairForm.description} onChange={e=>setRepairForm(f=>({...f,description:e.target.value}))}
                    placeholder="e.g. Left arm hinge broken, nose pad missing..." style={INP}/>
                </div>

                {/* Pricing & Status */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  <div>
                    <label style={LBL}>Charge (Rs.)</label>
                    <input type="number" value={repairForm.charge} onChange={e=>setRepairForm(f=>({...f,charge:e.target.value}))}
                      placeholder="0 = free" style={{ ...INP, fontSize:16, fontWeight:700 }}/>
                  </div>
                  <div>
                    <label style={LBL}>Payment Method</label>
                    <select value={repairForm.payment_method} onChange={e=>setRepairForm(f=>({...f,payment_method:e.target.value}))} style={SEL}>
                      <option value="cash">💵 Cash</option>
                      <option value="bank">🏦 Bank</option>
                      <option value="free">🎁 Free</option>
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Status</label>
                    <select value={repairForm.status} onChange={e=>setRepairForm(f=>({...f,status:e.target.value}))} style={SEL}>
                      <option value="collected">✅ Collected</option>
                      <option value="done">🔧 Done</option>
                      <option value="pending">⏳ Pending</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={LBL}>Notes (optional)</label>
                  <input value={repairForm.notes} onChange={e=>setRepairForm(f=>({...f,notes:e.target.value}))}
                    placeholder="Any extra details..." style={INP}/>
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
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
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