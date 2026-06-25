/* eslint-disable */
// ============================================================
//  LabReceivings.js — Lab bill tracking + payment
//
//  FIXED:
//  When you mark a lab bill as PAID, the system auto-creates
//  an expense entry so the payment appears in your daily
//  cash-out and monthly expense reports.
//
//  WORKFLOW:
//  1. Lenses arrive from Negombo/Solex → click Edit
//     → Set status to "Received" → Enter the bill amount → Save
//  2. When you physically pay the lab (weekly) → click Edit
//     → Toggle "Paid" → Set date + method → Save
//     → Expense is auto-created — do NOT add a separate
//       manual expense entry in the Expenses page for this.
//  3. "Pay All from Lab" button pays all unpaid bills at once.
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

const BASE  = () => process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const token = () => localStorage.getItem('ko_token');

function apiPatch(path, body) {
  return fetch(`${BASE()}${path}`, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token()}` }, body:JSON.stringify(body) }).then(r=>r.json());
}
function apiPost(path, body) {
  return fetch(`${BASE()}${path}`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token()}` }, body:JSON.stringify(body) }).then(r=>r.json());
}

const STEP_INFO = {
  0: { label:'Not sent',    bg:'#f3f4f6', color:'#6b7280' },
  1: { label:'Sent to lab', bg:'#dbeafe', color:'#1e40af' },
  2: { label:'Received',    bg:'#dcfce7', color:'#2d7a4f' },
  3: { label:'Delivered',   bg:'#f0fdf4', color:'#166534' },
};

// ── Record bill / mark paid modal ─────────────────────────────
function ReceiveModal({ order, onClose, onSave }) {
  const [labBill,    setLabBill]    = useState(order.lab_bill_amount || '');
  const [labPaid,    setLabPaid]    = useState(order.lab_paid || false);
  const [paidDate,   setPaidDate]   = useState(order.lab_paid_date || today());
  const [payMethod,  setPayMethod]  = useState(order.lab_payment_method || 'cash');
  const [labNotes,   setLabNotes]   = useState(order.lab_notes || '');
  const [step,       setStep]       = useState(order.lens_step || 0);
  const [lensCompany,setLensCompany]= useState(order.lens_company || 'Negombo Optical');
  const [saving,     setSaving]     = useState(false);

  const wasAlreadyPaid = order.lab_paid;

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
    }, {
      // Extra context passed to handleSave
      wasAlreadyPaid,
      labName: lensCompany,
      orderNumber: order.order_number,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.5)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
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
          <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, display:'block', marginBottom:6 }}>Lab</label>
          <div style={{ display:'flex', gap:8 }}>
            {LABS.map(lab=>(
              <button key={lab} onClick={()=>setLensCompany(lab)}
                style={{ flex:1, padding:'9px 8px', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`2px solid ${lensCompany===lab?C.navy:C.border}`, background:lensCompany===lab?C.navy:'white', color:lensCompany===lab?'white':C.muted }}>
                {lab}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, display:'block', marginBottom:8 }}>Status</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
            {[{v:0,icon:'📋',label:'Not sent'},{v:1,icon:'📤',label:'Sent'},{v:2,icon:'📥',label:'Received'},{v:3,icon:'✅',label:'Delivered'}].map(s=>(
              <button key={s.v} onClick={()=>setStep(s.v)}
                style={{ padding:'9px 4px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`2px solid ${step===s.v?C.navy:C.border}`, background:step===s.v?C.navy:'white', color:step===s.v?'white':C.muted, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                <span style={{ fontSize:18 }}>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Lab bill amount */}
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, display:'block', marginBottom:5 }}>
            Lab Bill Amount (Rs.)
          </label>
          <input type="number" value={labBill} onChange={e=>setLabBill(e.target.value)}
            placeholder="What Negombo / Solex charged for this order"
            style={{ ...INP, fontSize:16, fontWeight:700 }}/>
        </div>

        {/* Payment to lab */}
        <div style={{ background:C.cream, borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10 }}>
            Your payment to lab
          </div>
          {!wasAlreadyPaid && labPaid && parseFloat(labBill||0) > 0 && (
            <div style={{ background:'#dcfce7', border:'1px solid #86efac', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:12, color:'#166534', fontWeight:600 }}>
              ✅ Auto-expense of {fmt(parseFloat(labBill)||0)} will be created for {lensCompany}
            </div>
          )}
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
                <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:C.muted, display:'block', marginBottom:4 }}>Method</label>
                <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} style={SEL}>
                  <option value="cash">💵 Cash</option>
                  <option value="bank">🏦 Bank</option>
                  <option value="cheque">📋 Cheque</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, display:'block', marginBottom:5 }}>Notes</label>
          <input value={labNotes} onChange={e=>setLabNotes(e.target.value)}
            placeholder="e.g. Waiting for Murano progressive" style={INP}/>
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

// ── Pay All from Lab modal ────────────────────────────────────
function PayAllModal({ lab, orders, onClose, onDone, title }) {
  // If lab is null, orders are already pre-filtered (Pay Selected mode)
  const unpaid    = lab ? orders.filter(o => o.lens_company === lab && parseFloat(o.lab_bill_amount||0) > 0 && !o.lab_paid) : orders;
  const total     = unpaid.reduce((s,o) => s + parseFloat(o.lab_bill_amount||0), 0);
  const [payDate,   setPayDate]   = useState(today());
  const [payMethod, setPayMethod] = useState('cash');
  const [notes,     setNotes]     = useState('');
  const [saving,    setSaving]    = useState(false);

  const handlePayAll = async () => {
    if (!unpaid.length) return;
    setSaving(true);
    try {
      // 1. Mark all orders as paid
      await Promise.all(unpaid.map(o => apiPatch(`/orders/${o.id}`, {
        lab_paid: true,
        lab_paid_date: payDate,
        lab_payment_method: payMethod,
      })));

      // 2. Create ONE expense for the total payment
      await apiPost('/expenses', {
        date:           payDate,
        category:       'Lab Payment',
        description:    `${lab} — batch payment (${unpaid.length} orders)`,
        amount:         total,
        payment_method: payMethod,
        notes:          notes || `Covers: ${unpaid.map(o=>o.order_number).join(', ')}`,
      });

      onDone(`✅ Marked ${unpaid.length} orders paid to ${lab} · Rs. ${total.toLocaleString()} expense recorded`);
    } catch(e) { alert('Failed: ' + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.6)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:16, padding:24, width:'100%', maxWidth:440, boxShadow:'0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:C.navy, marginBottom:4 }}>{title || `Pay All to ${lab}`}</div>
        <div style={{ fontSize:13, color:C.muted, marginBottom:16 }}>{unpaid.length} unpaid orders · Total: <b style={{color:C.danger}}>{fmt(total)}</b></div>

        {/* Order list */}
        <div style={{ background:C.cream, borderRadius:10, padding:'10px 12px', marginBottom:14, maxHeight:160, overflowY:'auto' }}>
          {unpaid.map(o=>(
            <div key={o.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:'1px solid #f0ede5' }}>
              <span style={{ color:C.navy, fontWeight:500 }}>{o.order_number}</span>
              <span style={{ color:C.muted }}>{o.customer_name}</span>
              <span style={{ color:C.danger, fontWeight:600 }}>{fmt(o.lab_bill_amount)}</span>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, color:C.navy, paddingTop:8, marginTop:4 }}>
            <span>Total</span>
            <span>{fmt(total)}</span>
          </div>
        </div>

        {/* Payment details */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          <div>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Payment date</label>
            <input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)} style={INP}/>
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Method</label>
            <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} style={SEL}>
              <option value="cash">💵 Cash</option>
              <option value="bank">🏦 Bank transfer</option>
              <option value="cheque">📋 Cheque</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Notes (optional)</label>
          <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any notes about this payment" style={INP}/>
        </div>

        <div style={{ background:'#dcfce7', border:'1px solid #86efac', borderRadius:8, padding:'9px 12px', marginBottom:16, fontSize:12, color:'#166534' }}>
          ✅ One expense of <b>{fmt(total)}</b> will be auto-created under "Lab Payment" category
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={handlePayAll} disabled={saving||!unpaid.length}
            style={{ flex:1, padding:'12px', background:saving?C.muted:C.success, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
            {saving ? '⏳ Processing...' : `✅ Pay All — ${fmt(total)}`}
          </button>
          <button onClick={onClose} style={{ padding:'12px 16px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function LabReceivings() {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [labFilt,  setLabFilt]  = useState('all');
  const [stepFilt, setStepFilt] = useState('pending');
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [payAllLab,  setPayAllLab]   = useState(null);
  const [selectedIds,setSelectedIds] = useState(new Set());
  const [showPaySel, setShowPaySel]  = useState(false);
  const [toast,      setToast]       = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE()}/orders?limit=1000`, { headers:{ Authorization:`Bearer ${token()}` } });
      const data = await res.json();
      const arr  = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
      setOrders(arr.filter(o => o.status !== 'cancelled' && !o.customer_own_frame));
      setSelectedIds(new Set()); // clear selection on reload
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  // ── FIXED: handleSave auto-creates expense when marking paid ──
  const handleSave = async (orderId, updates, ctx) => {
    await apiPatch(`/orders/${orderId}`, updates);

    const newlyPaid = updates.lab_paid && !ctx?.wasAlreadyPaid;
    const billAmt   = parseFloat(updates.lab_bill_amount || 0);

    if (newlyPaid && billAmt > 0) {
      try {
        await apiPost('/expenses', {
          date:           updates.lab_paid_date || today(),
          category:       'Lab Payment',
          description:    `${ctx?.labName || updates.lens_company || 'Lab'} — ${ctx?.orderNumber || ''}`,
          amount:         billAmt,
          payment_method: updates.lab_payment_method || 'cash',
          notes:          'Auto-created when lab bill marked as paid in Lab Receivings',
        });
        showToast(`✅ Updated + Rs. ${billAmt.toLocaleString()} expense recorded`);
      } catch(e) {
        showToast('Updated ✅ (expense auto-record failed — add manually)');
      }
    } else {
      showToast('Updated ✅');
    }
    load();
  };

  const filtered = orders.filter(o => {
    if (search) {
      const q = search.toLowerCase();
      if (!o.order_number?.toLowerCase().includes(q) &&
          !o.customer_name?.toLowerCase().includes(q) &&
          !o.lens_company?.toLowerCase().includes(q)) return false;
    }
    if (labFilt !== 'all' && o.lens_company !== labFilt) return false;
    if (stepFilt === 'pending')  return (o.lens_step||0) < 2;
    if (stepFilt === 'received') return (o.lens_step||0) === 2;
    if (stepFilt === 'unpaid')   return parseFloat(o.lab_bill_amount||0) > 0 && !o.lab_paid;
    return true;
  }).sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

  const pending       = orders.filter(o=>(o.lens_step||0) < 2).length;
  const received      = orders.filter(o=>(o.lens_step||0) === 2).length;
  const unpaidBill    = orders.filter(o=>parseFloat(o.lab_bill_amount||0)>0 && !o.lab_paid)
                              .reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0);
  const paidThisMonth = orders.filter(o=>{
    const m = new Date().toISOString().slice(0,7);
    return o.lab_paid && o.lab_paid_date?.slice(0,7)===m;
  }).reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0);

  const labUnpaid = {};
  orders.filter(o=>parseFloat(o.lab_bill_amount||0)>0 && !o.lab_paid).forEach(o=>{
    const lab = o.lens_company || 'Unknown';
    labUnpaid[lab] = (labUnpaid[lab]||0) + parseFloat(o.lab_bill_amount||0);
  });

  // Selectable = only unpaid orders with a bill amount
  const selectableFiltered = filtered.filter(o => parseFloat(o.lab_bill_amount||0) > 0 && !o.lab_paid);
  const selTotal   = [...selectedIds].reduce((s,id)=>{ const o=orders.find(x=>x.id===id); return s+parseFloat(o?.lab_bill_amount||0); },0);
  const allSelectable = selectableFiltered.length > 0 && selectableFiltered.every(o=>selectedIds.has(o.id));
  const someSelected  = selectedIds.size > 0;

  const toggleSelect = (id) => setSelectedIds(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleAll = () => {
    if (allSelectable) setSelectedIds(new Set());
    else setSelectedIds(new Set(selectableFiltered.map(o=>o.id)));
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", paddingBottom: someSelected ? 80 : 0 }}>
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:C.navy, color:'white', padding:'12px 20px', borderRadius:12, fontSize:14, fontWeight:600, borderLeft:`4px solid ${C.gold}`, zIndex:500 }}>
          {toast}
        </div>
      )}

      {selected && <ReceiveModal order={selected} onClose={()=>setSelected(null)} onSave={handleSave}/>}
      {showPaySel && (
        <PayAllModal
          lab={null}
          orders={orders.filter(o=>selectedIds.has(o.id))}
          onClose={()=>setShowPaySel(false)}
          onDone={msg=>{ showToast(msg); setShowPaySel(false); setSelectedIds(new Set()); load(); }}
          title="Pay Selected Orders"
        />
      )}
      {payAllLab && <PayAllModal lab={payAllLab} orders={orders} onClose={()=>setPayAllLab(null)}
        onDone={msg=>{ showToast(msg); setPayAllLab(null); load(); }}/>}

      {/* Header */}
      <div style={{ marginBottom:4 }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>🔬 Lab Receivings</h1>
        <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Track lens orders · mark received · auto-record lab payments as expenses</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, margin:'16px 0' }}>
        {[
          { l:'Pending from lab', v:pending,           sub:'Not yet received',   dark:true },
          { l:'Received',         v:received,           sub:'Ready to deliver',  c:'#2563eb' },
          { l:'Unpaid to labs',   v:fmt(unpaidBill),    sub:'Total you owe',     c:C.danger },
          { l:'Paid this month',  v:fmt(paidThisMonth), sub:'Lab payments made', c:C.success },
        ].map(s=>(
          <div key={s.l} style={{ background:s.dark?C.navy:'white', border:`1px solid ${s.dark?C.navy:C.border}`, borderRadius:12, padding:'13px 15px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:s.dark?C.gold:C.muted, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:s.dark?'white':(s.c||C.navy) }}>{s.v}</div>
            {s.sub && <div style={{ fontSize:11, color:s.dark?'#ede9e0':C.muted, marginTop:2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Outstanding per lab + Pay All buttons */}
      {Object.keys(labUnpaid).length > 0 && (
        <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', gap:16, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:700, color:C.danger }}>⚠️ Outstanding:</span>
          {Object.entries(labUnpaid).map(([lab,amt])=>(
            <div key={lab} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:13, color:C.danger }}><b>{lab}:</b> {fmt(amt)}</span>
              <button onClick={()=>setPayAllLab(lab)}
                style={{ padding:'4px 10px', background:C.danger, color:'white', border:'none', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Pay All
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Order no, customer, lab..."
          style={{ flex:1, minWidth:180, padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}/>
        <div style={{ display:'flex', gap:6 }}>
          {[['all','All Labs'],['Negombo Optical','Negombo'],['Solex Optical','Solex']].map(([v,l])=>(
            <button key={v} onClick={()=>setLabFilt(v)}
              style={{ padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${labFilt===v?C.navy:C.border}`, background:labFilt===v?C.navy:'white', color:labFilt===v?'white':C.muted }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[['pending','⏳ Pending'],['received','📥 Received'],['unpaid','💸 Unpaid'],['all','All']].map(([v,l])=>(
            <button key={v} onClick={()=>setStepFilt(v)}
              style={{ padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${stepFilt===v?C.navy:C.border}`, background:stepFilt===v?C.navy:'white', color:stepFilt===v?'white':C.muted }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Order list */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'36px 120px 1fr 120px 110px 110px 90px 50px', padding:'10px 16px', background:C.cream, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:C.muted, borderBottom:`1px solid ${C.border}` }}>
          <span>
            <input type="checkbox" checked={allSelectable} ref={el=>{ if(el){ el.indeterminate=someSelected&&!allSelectable; }}}
              onChange={toggleAll} style={{ cursor:'pointer', width:15, height:15 }}/>
          </span>
          <span>Order</span><span>Customer / Lens</span><span>Lab</span><span>Bill</span><span>Status</span><span>Lab Paid</span><span></span>
        </div>

        {loading
          ? <div style={{ padding:32, textAlign:'center', color:C.muted }}>Loading...</div>
          : !filtered.length
            ? <div style={{ padding:40, textAlign:'center', color:C.muted }}>
                <div style={{ fontSize:36, marginBottom:12 }}>🔬</div>
                <div style={{ fontSize:14, fontWeight:600, color:C.navy }}>No orders match this filter</div>
              </div>
            : filtered.map(order => {
                const step    = order.lens_step || 0;
                const stepInf = STEP_INFO[step] || STEP_INFO[0];
                const hasBill = parseFloat(order.lab_bill_amount||0) > 0;
                const isPaid  = order.lab_paid;
                return (
                  <div key={order.id} style={{ display:'grid', gridTemplateColumns:'36px 120px 1fr 120px 110px 110px 90px 50px', padding:'12px 16px', borderBottom:`1px solid ${C.cream}`, alignItems:'center', background: selectedIds.has(order.id)?'#f0f9ff':undefined }}>
                    <div>
                      {(!order.lab_paid && parseFloat(order.lab_bill_amount||0)>0) && (
                        <input type="checkbox" checked={selectedIds.has(order.id)}
                          onChange={()=>toggleSelect(order.id)}
                          style={{ cursor:'pointer', width:15, height:15 }}/>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{order.order_number}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{fmtDate(order.created_at?.slice(0,10))}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{order.customer_name}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{order.lens_type}{order.lens_coating?` · ${order.lens_coating}`:''}{order.frame?` · ${order.frame}`:''}</div>
                    </div>
                    <div style={{ fontSize:12, color:C.muted, fontWeight:500 }}>{order.lens_company||<span style={{color:'#d1d5db'}}>—</span>}</div>
                    <div>
                      {hasBill
                        ? <span style={{ fontSize:13, fontWeight:700, color:isPaid?C.success:C.danger }}>{fmt(order.lab_bill_amount)}</span>
                        : <span style={{ fontSize:12, color:'#d1d5db' }}>Not entered</span>
                      }
                    </div>
                    <div>
                      <span style={{ background:stepInf.bg, color:stepInf.color, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>
                        {stepInf.label}
                      </span>
                    </div>
                    <div>
                      {!hasBill
                        ? <span style={{ fontSize:11, color:'#d1d5db' }}>—</span>
                        : isPaid
                          ? <span style={{ background:'#dcfce7', color:C.success, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>✅ Paid</span>
                          : <span style={{ background:'#fee2e2', color:C.danger, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>⏳ Owed</span>
                      }
                    </div>
                    <button onClick={()=>setSelected(order)}
                      style={{ padding:'6px 12px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.navy }}>
                      Edit
                    </button>
                  </div>
                );
              })
        }

        {filtered.length > 0 && (
          <div style={{ padding:'12px 16px', background:C.cream, display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:700, borderTop:`1px solid ${C.border}` }}>
            <span style={{ color:C.muted }}>{filtered.length} orders</span>
            <div style={{ display:'flex', gap:20 }}>
              <span style={{ color:C.danger }}>Unpaid: {fmt(filtered.filter(o=>parseFloat(o.lab_bill_amount||0)>0&&!o.lab_paid).reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0))}</span>
              <span style={{ color:C.success }}>Paid: {fmt(filtered.filter(o=>o.lab_paid).reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0))}</span>
            </div>
          </div>
        )}
      </div>
      {/* ── Sticky bottom bar when orders selected ─────────── */}
      {someSelected && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:C.navy, color:'white', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', zIndex:100, boxShadow:'0 -4px 20px rgba(0,0,0,.3)', flexWrap:'wrap', gap:10 }}>
          <div>
            <span style={{ fontSize:14, fontWeight:700 }}>{selectedIds.size} order{selectedIds.size!==1?'s':''} selected</span>
            <span style={{ fontSize:13, color:C.gold, marginLeft:12, fontFamily:"'Playfair Display',serif" }}>
              Total: Rs. {selTotal.toLocaleString()}
            </span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setSelectedIds(new Set())}
              style={{ padding:'8px 16px', background:'rgba(255,255,255,.15)', color:'white', border:'1px solid rgba(255,255,255,.3)', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Clear
            </button>
            <button onClick={()=>setShowPaySel(true)}
              style={{ padding:'8px 20px', background:C.gold, color:C.navy, border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              ✅ Pay {selectedIds.size} order{selectedIds.size!==1?'s':''} — Rs. {selTotal.toLocaleString()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}