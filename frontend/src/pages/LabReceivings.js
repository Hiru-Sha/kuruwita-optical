/* eslint-disable */
// ============================================================
//  LabReceivings.js
//  Track lens orders sent to Negombo Optical / Solex Optical
//  Record what they charge, when you receive, when you pay
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};
const fmt     = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0,maximumFractionDigits:0});
const fmtDate = (d) => { if(!d) return '—'; return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); };
const today   = () => new Date().toISOString().split('T')[0];

const LABS = ['Negombo Optical','Solex Optical'];

const INP = { padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%', boxSizing:'border-box' };
const SEL = { ...INP, cursor:'pointer' };

function apiGet(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json());
}
function apiPatch(path, body) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body:JSON.stringify(body) }).then(r=>r.json());
}

// ── Status badge ──────────────────────────────────────────────
const STEP_INFO = {
  0: { label:'Not sent',      bg:'#f3f4f6', color:'#6b7280' },
  1: { label:'Sent to lab',   bg:'#dbeafe', color:'#1e40af' },
  2: { label:'Received',      bg:'#dcfce7', color:'#2d7a4f' },
  3: { label:'Delivered',     bg:'#f0fdf4', color:'#166534' },
};

// ── Mark received / pay modal ─────────────────────────────────
function ReceiveModal({ order, onClose, onSave }) {
  const [labBill,   setLabBill]   = useState(order.lab_bill_amount || '');
  const [labPaid,   setLabPaid]   = useState(order.lab_paid || false);
  const [paidDate,  setPaidDate]  = useState(order.lab_paid_date || today());
  const [payMethod, setPayMethod] = useState(order.lab_payment_method || 'cash');
  const [labNotes,  setLabNotes]  = useState(order.lab_notes || '');
  const [step,      setStep]      = useState(order.lens_step || 0);
  const [lensCompany, setLensCompany] = useState(order.lens_company || 'Negombo Optical');
  const [saving,    setSaving]    = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(order.id, {
      lens_step:          step,
      lens_company:       lensCompany,
      lab_bill_amount:    parseFloat(labBill)||0,
      lab_paid:           labPaid,
      lab_paid_date:      labPaid ? paidDate : null,
      lab_payment_method: payMethod,
      lab_notes:          labNotes || null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.5)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:16, padding:24, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:C.navy }}>{order.order_number}</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{order.customer_name} · {order.frame}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:C.muted }}>✕</button>
        </div>

        {/* Lab */}
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, display:'block', marginBottom:6 }}>Lab / Dealer</label>
          <div style={{ display:'flex', gap:8 }}>
            {LABS.map(lab=>(
              <button key={lab} onClick={()=>setLensCompany(lab)}
                style={{ flex:1, padding:'9px 8px', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`2px solid ${lensCompany===lab?C.navy:C.border}`, background:lensCompany===lab?C.navy:'white', color:lensCompany===lab?'white':C.muted }}>
                {lab}
              </button>
            ))}
          </div>
        </div>

        {/* Status steps */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, display:'block', marginBottom:8 }}>Status</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
            {[
              { v:0, icon:'📋', label:'Not sent'    },
              { v:1, icon:'📤', label:'Sent'        },
              { v:2, icon:'📥', label:'Received'    },
              { v:3, icon:'✅', label:'Delivered'   },
            ].map(s=>(
              <button key={s.v} onClick={()=>setStep(s.v)}
                style={{ padding:'9px 4px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`2px solid ${step===s.v?C.navy:C.border}`, background:step===s.v?C.navy:'white', color:step===s.v?'white':C.muted, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                <span style={{ fontSize:18 }}>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Lab bill */}
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, display:'block', marginBottom:5 }}>Lab Bill Amount (Rs.)</label>
          <input type="number" value={labBill} onChange={e=>setLabBill(e.target.value)}
            placeholder="What they charged for this lens job" style={{ ...INP, fontSize:16, fontWeight:700 }}/>
        </div>

        {/* Payment */}
        <div style={{ background:C.cream, borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10 }}>Payment to Lab</div>
          <div style={{ display:'flex', gap:8, marginBottom:10 }}>
            <button onClick={()=>setLabPaid(false)}
              style={{ flex:1, padding:'8px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${!labPaid?C.danger:C.border}`, background:!labPaid?'#fee2e2':'white', color:!labPaid?C.danger:C.muted }}>
              ⏳ Not paid yet
            </button>
            <button onClick={()=>setLabPaid(true)}
              style={{ flex:1, padding:'8px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${labPaid?C.success:C.border}`, background:labPaid?'#dcfce7':'white', color:labPaid?C.success:C.muted }}>
              ✅ Paid
            </button>
          </div>
          {labPaid && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:C.muted, display:'block', marginBottom:4 }}>Paid on</label>
                <input type="date" value={paidDate} onChange={e=>setPaidDate(e.target.value)} style={INP}/>
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:C.muted, display:'block', marginBottom:4 }}>Payment method</label>
                <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} style={SEL}>
                  <option value="cash">💵 Cash</option>
                  <option value="bank">🏦 Bank</option>
                  <option value="cheque">📋 Cheque</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, display:'block', marginBottom:5 }}>Notes (optional)</label>
          <input value={labNotes} onChange={e=>setLabNotes(e.target.value)}
            placeholder="e.g. Waiting for Murano progressive lens delivery" style={INP}/>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1, padding:'11px', background:saving?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
            {saving ? '⏳ Saving...' : '💾 Save'}
          </button>
          <button onClick={onClose}
            style={{ padding:'11px 16px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function LabReceivings() {
  const [orders,    setOrders]   = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [labFilt,   setLabFilt]  = useState('all');
  const [stepFilt,  setStepFilt] = useState('pending'); // pending | unpaid | all
  const [search,    setSearch]   = useState('');
  const [selected,  setSelected] = useState(null);
  const [toast,     setToast]    = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Get all orders that have a lens company or are not yet delivered
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/orders?limit=500`, { headers:{ Authorization:`Bearer ${token}` } });
      const data  = await res.json();
      // Filter: only orders that need lab work (lens orders, not customer own frame only)
      const labOrders = (Array.isArray(data)?data:[]).filter(o =>
        o.status !== 'cancelled' && !o.customer_own_frame
      );
      setOrders(labOrders);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  const handleSave = async (orderId, updates) => {
    await apiPatch(`/orders/${orderId}`, updates);
    showToast('Updated ✅');
    load();
  };

  // ── Filter ────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    if (search) {
      const q = search.toLowerCase();
      if (!o.order_number?.toLowerCase().includes(q) &&
          !o.customer_name?.toLowerCase().includes(q) &&
          !o.lens_company?.toLowerCase().includes(q)) return false;
    }
    if (labFilt !== 'all' && o.lens_company !== labFilt) return false;
    if (stepFilt === 'pending') return (o.lens_step||0) < 2;          // not yet received
    if (stepFilt === 'received') return (o.lens_step||0) === 2;        // received, not delivered
    if (stepFilt === 'unpaid')  return (o.lab_bill_amount > 0) && !o.lab_paid;
    return true;
  }).sort((a,b) => new Date(a.created_at) - new Date(b.created_at));  // oldest first

  // ── Summary stats ─────────────────────────────────────────
  const pending     = orders.filter(o=>(o.lens_step||0) < 2).length;
  const received    = orders.filter(o=>(o.lens_step||0) === 2).length;
  const unpaidBill  = orders.filter(o=>o.lab_bill_amount > 0 && !o.lab_paid)
                            .reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0);
  const paidThisMonth = orders.filter(o => {
    const m = new Date().toISOString().slice(0,7);
    return o.lab_paid && o.lab_paid_date?.slice(0,7) === m;
  }).reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0);

  // ── Per-lab unpaid breakdown ──────────────────────────────
  const labUnpaid = {};
  orders.filter(o=>o.lab_bill_amount > 0 && !o.lab_paid).forEach(o => {
    const lab = o.lens_company || 'Unknown';
    labUnpaid[lab] = (labUnpaid[lab]||0) + parseFloat(o.lab_bill_amount||0);
  });

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:C.navy, color:'white', padding:'12px 20px', borderRadius:12, fontSize:14, fontWeight:600, borderLeft:`4px solid ${C.gold}`, zIndex:500 }}>
          {toast}
        </div>
      )}

      {selected && (
        <ReceiveModal order={selected} onClose={()=>setSelected(null)} onSave={handleSave}/>
      )}

      {/* Header */}
      <div style={{ marginBottom:4 }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>🔬 Lab Receivings</h1>
        <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Track lens orders from Negombo Optical & Solex — deliveries and payments</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, margin:'16px 0' }}>
        {[
          { l:'Pending from lab', v:pending,          sub:'Not yet received',     dark:true },
          { l:'Received',         v:received,          sub:'Ready to deliver',     c:'#2563eb' },
          { l:'Unpaid to labs',   v:fmt(unpaidBill),   sub:'Total you owe',        c:C.danger },
          { l:'Paid this month',  v:fmt(paidThisMonth),sub:'Lab payments made',   c:C.success },
        ].map(s=>(
          <div key={s.l} style={{ background:s.dark?C.navy:'white', border:`1px solid ${s.dark?C.navy:C.border}`, borderRadius:12, padding:'13px 15px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:s.dark?C.gold:C.muted, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:s.dark?'white':(s.c||C.navy) }}>{s.v}</div>
            {s.sub && <div style={{ fontSize:11, color:s.dark?'#ede9e0':C.muted, marginTop:2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Per-lab unpaid summary */}
      {Object.keys(labUnpaid).length > 0 && (
        <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', gap:20, flexWrap:'wrap' }}>
          <span style={{ fontSize:13, fontWeight:700, color:C.danger }}>⚠️ Outstanding to labs:</span>
          {Object.entries(labUnpaid).map(([lab,amt])=>(
            <span key={lab} style={{ fontSize:13, color:C.danger }}>
              <b>{lab}:</b> {fmt(amt)}
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Order no, customer, lab..."
          style={{ flex:1, minWidth:180, padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}/>

        {/* Lab filter */}
        <div style={{ display:'flex', gap:6 }}>
          {[['all','All Labs'],['Negombo Optical','Negombo'],['Solex Optical','Solex']].map(([v,l])=>(
            <button key={v} onClick={()=>setLabFilt(v)}
              style={{ padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${labFilt===v?C.navy:C.border}`, background:labFilt===v?C.navy:'white', color:labFilt===v?'white':C.muted }}>
              {l}
            </button>
          ))}
        </div>

        {/* Step filter */}
        <div style={{ display:'flex', gap:6 }}>
          {[['pending','⏳ Pending'],['received','📥 Received'],['unpaid','💸 Unpaid Bills'],['all','All']].map(([v,l])=>(
            <button key={v} onClick={()=>setStepFilt(v)}
              style={{ padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${stepFilt===v?C.navy:C.border}`, background:stepFilt===v?C.navy:'white', color:stepFilt===v?'white':C.muted }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Order list */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>

        {/* Table header */}
        <div style={{ display:'grid', gridTemplateColumns:'120px 1fr 120px 110px 110px 90px 50px', padding:'10px 16px', background:C.cream, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:C.muted, borderBottom:`1px solid ${C.border}` }}>
          <span>Order</span><span>Customer / Lens</span><span>Lab</span><span>Bill</span><span>Status</span><span>Lab Paid</span><span></span>
        </div>

        {loading
          ? <div style={{ padding:32, textAlign:'center', color:C.muted }}>Loading...</div>
          : !filtered.length
            ? <div style={{ padding:40, textAlign:'center', color:C.muted }}>
                <div style={{ fontSize:36, marginBottom:12 }}>🔬</div>
                <div style={{ fontSize:14, fontWeight:600, color:C.navy }}>No orders match this filter</div>
              </div>
            : filtered.map((order, idx) => {
                const step    = order.lens_step || 0;
                const stepInf = STEP_INFO[step] || STEP_INFO[0];
                const hasBill = parseFloat(order.lab_bill_amount||0) > 0;
                const isPaid  = order.lab_paid;

                return (
                  <div key={order.id} style={{ display:'grid', gridTemplateColumns:'120px 1fr 120px 110px 110px 90px 50px', padding:'12px 16px', borderBottom:`1px solid ${C.cream}`, alignItems:'center' }}>

                    {/* Order number + date */}
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{order.order_number}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{fmtDate(order.created_at?.slice(0,10))}</div>
                    </div>

                    {/* Customer + lens */}
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{order.customer_name}</div>
                      <div style={{ fontSize:11, color:C.muted }}>
                        {order.lens_type}{order.lens_coating ? ` · ${order.lens_coating}` : ''}
                        {order.frame ? ` · ${order.frame}` : ''}
                      </div>
                    </div>

                    {/* Lab */}
                    <div style={{ fontSize:12, color:C.muted, fontWeight:500 }}>
                      {order.lens_company || <span style={{ color:'#d1d5db' }}>—</span>}
                    </div>

                    {/* Bill amount */}
                    <div>
                      {hasBill
                        ? <span style={{ fontSize:13, fontWeight:700, color:isPaid?C.success:C.danger }}>
                            {fmt(order.lab_bill_amount)}
                          </span>
                        : <span style={{ fontSize:12, color:'#d1d5db' }}>Not entered</span>
                      }
                    </div>

                    {/* Step badge */}
                    <div>
                      <span style={{ background:stepInf.bg, color:stepInf.color, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>
                        {stepInf.label}
                      </span>
                    </div>

                    {/* Lab paid */}
                    <div>
                      {!hasBill
                        ? <span style={{ fontSize:11, color:'#d1d5db' }}>—</span>
                        : isPaid
                          ? <span style={{ background:'#dcfce7', color:C.success, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>✅ Paid</span>
                          : <span style={{ background:'#fee2e2', color:C.danger, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>⏳ Owed</span>
                      }
                    </div>

                    {/* Edit button */}
                    <button onClick={()=>setSelected(order)}
                      style={{ padding:'6px 12px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.navy }}>
                      Edit
                    </button>
                  </div>
                );
              })
        }

        {/* Total footer */}
        {filtered.length > 0 && (
          <div style={{ padding:'12px 16px', background:C.cream, display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:700, borderTop:`1px solid ${C.border}` }}>
            <span style={{ color:C.muted }}>{filtered.length} orders shown</span>
            <div style={{ display:'flex', gap:20 }}>
              <span style={{ color:C.danger }}>
                Unpaid: {fmt(filtered.filter(o=>o.lab_bill_amount > 0 && !o.lab_paid).reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0))}
              </span>
              <span style={{ color:C.success }}>
                Paid: {fmt(filtered.filter(o=>o.lab_paid).reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
