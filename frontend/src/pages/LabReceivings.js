/* eslint-disable */
// ============================================================
//  LabReceivings.js — Fully inline workflow
//
//  HOW TO USE:
//  1. Change filter to "All" to see all orders
//  2. For each order: pick lab, type bill amount, click ✓
//     (no modal needed — inline editing)
//  3. Switch to "💸 Unpaid" filter
//  4. Tick the orders you're paying today → "Pay Selected"
//  5. One expense auto-created → done
// ============================================================
import React, { useEffect, useState, useCallback, useRef } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};
const fmt     = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
const fmtDate = (d) => { if(!d) return '—'; return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); };
const today   = () => new Date().toISOString().split('T')[0];

const LABS = ['Negombo Optical','Solex Optical'];
const STEP_INFO = {
  0:{ label:'Not sent',  bg:'#f3f4f6', color:'#6b7280' },
  1:{ label:'Sent',      bg:'#dbeafe', color:'#1e40af' },
  2:{ label:'Received',  bg:'#dcfce7', color:'#2d7a4f' },
  3:{ label:'Delivered', bg:'#f0fdf4', color:'#166534' },
};

const BASE_URL = () => process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tok      = () => localStorage.getItem('ko_token');

const apiPatch = (path, body) =>
  fetch(`${BASE_URL()}${path}`, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` }, body:JSON.stringify(body) }).then(r=>r.json());

const apiPost = (path, body) =>
  fetch(`${BASE_URL()}${path}`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` }, body:JSON.stringify(body) }).then(r=>r.json());

// ── Pay Selected / Pay All modal ──────────────────────────────
function PayModal({ orders, title, onClose, onDone }) {
  const total     = orders.reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0);
  const [payDate,   setPayDate]   = useState(today());
  const [payMethod, setPayMethod] = useState('cash');
  const [notes,     setNotes]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const INP = { padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%', boxSizing:'border-box' };

  const handlePay = async () => {
    if (!orders.length) return;
    setSaving(true);
    try {
      await Promise.all(orders.map(o => apiPatch(`/orders/${o.id}`, {
        lab_paid: true, lab_paid_date: payDate, lab_payment_method: payMethod,
      })));

      // Group by lab and create one expense per lab
      const byLab = {};
      orders.forEach(o => {
        const lab = o.lens_company || 'Lab';
        if (!byLab[lab]) byLab[lab] = { total:0, orderNos:[] };
        byLab[lab].total += parseFloat(o.lab_bill_amount||0);
        byLab[lab].orderNos.push(o.order_number);
      });
      await Promise.all(Object.entries(byLab).map(([lab,d]) =>
        apiPost('/expenses', {
          date: payDate, category:'Lab Payment',
          description: `${lab} — ${d.orderNos.length} order${d.orderNos.length!==1?'s':''}`,
          amount: d.total, payment_method: payMethod,
          notes: notes || `Orders: ${d.orderNos.join(', ')}`,
        })
      ));
      onDone(`✅ ${orders.length} orders paid · Rs. ${total.toLocaleString()} expense recorded`);
    } catch(e) { alert('Failed: ' + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.6)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:16, padding:24, width:'100%', maxWidth:460, boxShadow:'0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:C.navy, marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:13, color:C.muted, marginBottom:16 }}>
          {orders.length} order{orders.length!==1?'s':''} · Total: <b style={{color:C.danger}}>{fmt(total)}</b>
        </div>

        {/* Order summary */}
        <div style={{ background:C.cream, borderRadius:10, padding:'10px 12px', marginBottom:14, maxHeight:180, overflowY:'auto' }}>
          {orders.map(o=>(
            <div key={o.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:'1px solid #f0ede5' }}>
              <span style={{ color:C.navy, fontWeight:500 }}>{o.order_number}</span>
              <span style={{ color:C.muted, fontSize:12 }}>{o.customer_name}</span>
              <span style={{ color:C.danger, fontWeight:600 }}>{fmt(o.lab_bill_amount)}</span>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, color:C.navy, paddingTop:8, marginTop:4 }}>
            <span>Total</span><span>{fmt(total)}</span>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          <div>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Payment date</label>
            <input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)} style={INP}/>
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Method</label>
            <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} style={{...INP,cursor:'pointer'}}>
              <option value="cash">💵 Cash</option>
              <option value="bank">🏦 Bank transfer</option>
              <option value="cheque">📋 Cheque</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Notes</label>
          <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional notes" style={INP}/>
        </div>

        <div style={{ background:'#dcfce7', border:'1px solid #86efac', borderRadius:8, padding:'9px 12px', marginBottom:16, fontSize:12, color:'#166534' }}>
          ✅ Lab payment expense will be auto-created — do NOT add separately in Expenses
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={handlePay} disabled={saving||!orders.length}
            style={{ flex:1, padding:'12px', background:saving?C.muted:C.success, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
            {saving ? '⏳ Processing...' : `✅ Confirm Payment — ${fmt(total)}`}
          </button>
          <button onClick={onClose}
            style={{ padding:'12px 16px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inline editable order row ─────────────────────────────────
function OrderRow({ order, selected, onToggle, onSaved }) {
  const hasBill  = parseFloat(order.lab_bill_amount||0) > 0;
  const isPaid   = order.lab_paid;
  const stepInf  = STEP_INFO[order.lens_step||0];
  const canSelect = hasBill && !isPaid;

  // Inline edit state
  const [editing,  setEditing]  = useState(false);
  const [billVal,  setBillVal]  = useState(order.lab_bill_amount || '');
  const [labVal,   setLabVal]   = useState(order.lens_company || 'Negombo Optical');
  const [saving,   setSaving]   = useState(false);
  const inputRef   = useRef();

  const startEdit = () => {
    if (isPaid) return;
    setBillVal(order.lab_bill_amount || '');
    setLabVal(order.lens_company || 'Negombo Optical');
    setEditing(true);
    setTimeout(()=>inputRef.current?.focus(), 50);
  };

  const saveInline = async () => {
    if (!billVal || parseFloat(billVal) <= 0) { setEditing(false); return; }
    setSaving(true);
    try {
      await apiPatch(`/orders/${order.id}`, {
        lab_bill_amount: parseFloat(billVal),
        lens_company: labVal,
        lens_step: Math.max(order.lens_step||0, 2), // auto-set to Received
      });
      onSaved();
      setEditing(false);
    } catch(e) { alert('Save failed'); }
    finally { setSaving(false); }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') saveInline();
    if (e.key === 'Escape') setEditing(false);
  };

  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'36px 120px 1fr 140px 150px 100px 90px 50px',
      padding:'10px 16px',
      borderBottom:`1px solid ${C.cream}`,
      alignItems:'center',
      background: selected ? '#eff6ff' : isPaid ? '#f0fdf4' : editing ? '#fffbeb' : 'white',
      transition:'background .1s',
    }}>

      {/* Checkbox */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
        {canSelect && (
          <input type="checkbox" checked={selected} onChange={onToggle}
            style={{ cursor:'pointer', width:15, height:15 }}/>
        )}
      </div>

      {/* Order number + date */}
      <div>
        <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{order.order_number}</div>
        <div style={{ fontSize:11, color:C.muted }}>{fmtDate(order.created_at?.slice(0,10))}</div>
      </div>

      {/* Customer + lens */}
      <div>
        <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{order.customer_name}</div>
        <div style={{ fontSize:11, color:C.muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:200 }}>
          {[order.lens_type, order.lens_coating, order.frame].filter(Boolean).join(' · ')}
        </div>
      </div>

      {/* Lab — inline mini buttons */}
      <div>
        {isPaid
          ? <span style={{ fontSize:12, color:C.muted }}>{order.lens_company||'—'}</span>
          : editing
            ? <div style={{ display:'flex', gap:4 }}>
                {LABS.map(l=>(
                  <button key={l} onClick={()=>setLabVal(l)}
                    style={{ padding:'3px 7px', borderRadius:6, fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${labVal===l?C.navy:C.border}`, background:labVal===l?C.navy:'white', color:labVal===l?'white':C.muted }}>
                    {l==='Negombo Optical'?'Negombo':'Solex'}
                  </button>
                ))}
              </div>
            : <span style={{ fontSize:12, color:C.muted, cursor:'pointer' }} onClick={startEdit}>
                {order.lens_company || <span style={{color:'#bbb',fontStyle:'italic'}}>tap to set</span>}
              </span>
        }
      </div>

      {/* Bill — inline input */}
      <div>
        {isPaid
          ? <span style={{ fontSize:13, fontWeight:700, color:C.success }}>{fmt(order.lab_bill_amount)}</span>
          : editing
            ? <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                <input
                  ref={inputRef}
                  type="number"
                  value={billVal}
                  onChange={e=>setBillVal(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Rs."
                  style={{ width:80, padding:'5px 8px', border:`1.5px solid ${C.gold}`, borderRadius:7, fontSize:13, fontFamily:'inherit', outline:'none', background:'#fffbeb', fontWeight:700 }}
                />
                <button onClick={saveInline} disabled={saving}
                  style={{ padding:'5px 10px', background:saving?C.muted:C.success, color:'white', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {saving?'…':'✓'}
                </button>
                <button onClick={()=>setEditing(false)}
                  style={{ padding:'5px 8px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
                  ✕
                </button>
              </div>
            : hasBill
              ? <span onClick={startEdit} style={{ fontSize:13, fontWeight:700, color:C.danger, cursor:'pointer', textDecoration:'underline dotted' }}>
                  {fmt(order.lab_bill_amount)}
                </span>
              : <button onClick={startEdit}
                  style={{ padding:'4px 10px', background:'#fff7ed', border:`1.5px solid #fed7aa`, borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'#c2410c' }}>
                  + Enter bill
                </button>
        }
      </div>

      {/* Status */}
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
            ? <div>
                <span style={{ background:'#dcfce7', color:C.success, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>✅ Paid</span>
                <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{fmtDate(order.lab_paid_date)}</div>
              </div>
            : <span style={{ background:'#fee2e2', color:C.danger, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>⏳ Owed</span>
        }
      </div>

      {/* Edit button */}
      <button onClick={startEdit} disabled={isPaid}
        style={{ padding:'6px 12px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontWeight:600, cursor:isPaid?'default':'pointer', fontFamily:'inherit', color:isPaid?'#bbb':C.navy, opacity:isPaid?.5:1 }}>
        {editing ? '...' : 'Edit'}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function LabReceivings() {
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [labFilt,    setLabFilt]    = useState('all');
  const [stepFilt,   setStepFilt]   = useState('all');   // ← default ALL now
  const [search,     setSearch]     = useState('');
  const [selectedIds,setSelectedIds]= useState(new Set());
  const [payModal,   setPayModal]   = useState(null);    // null | 'selected' | labName
  const [toast,      setToast]      = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL()}/orders?limit=2000`, { headers:{ Authorization:`Bearer ${tok()}` } });
      const data = await res.json();
      const arr  = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
      setOrders(arr.filter(o => o.status !== 'cancelled' && !o.customer_own_frame));
      setSelectedIds(new Set());
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

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
    if (stepFilt === 'unpaid')   return parseFloat(o.lab_bill_amount||0)>0 && !o.lab_paid;
    if (stepFilt === 'paid')     return o.lab_paid;
    return true;
  }).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));

  // Stats
  const pending       = orders.filter(o=>(o.lens_step||0)<2).length;
  const received      = orders.filter(o=>(o.lens_step||0)===2).length;
  const unpaidTotal   = orders.filter(o=>parseFloat(o.lab_bill_amount||0)>0&&!o.lab_paid)
                              .reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0);
  const paidThisMonth = orders.filter(o=>{
    const m=new Date().toISOString().slice(0,7);
    return o.lab_paid&&o.lab_paid_date?.slice(0,7)===m;
  }).reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0);

  // Per-lab unpaid
  const labUnpaid = {};
  orders.filter(o=>parseFloat(o.lab_bill_amount||0)>0&&!o.lab_paid).forEach(o=>{
    const lab=o.lens_company||'Unknown';
    labUnpaid[lab]=(labUnpaid[lab]||0)+parseFloat(o.lab_bill_amount||0);
  });

  // Selection
  const selectableFiltered = filtered.filter(o=>parseFloat(o.lab_bill_amount||0)>0&&!o.lab_paid);
  const allSelected = selectableFiltered.length>0 && selectableFiltered.every(o=>selectedIds.has(o.id));
  const someSelected = selectedIds.size>0;
  const selTotal = [...selectedIds].reduce((s,id)=>{
    const o=orders.find(x=>x.id===id);
    return s+parseFloat(o?.lab_bill_amount||0);
  },0);

  const toggleSelect = (id) => setSelectedIds(prev=>{
    const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n;
  });
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(selectableFiltered.map(o=>o.id)));
  };

  // Which orders to pay (for the modal)
  const ordersToPay = payModal==='selected'
    ? orders.filter(o=>selectedIds.has(o.id))
    : payModal
      ? orders.filter(o=>o.lens_company===payModal&&parseFloat(o.lab_bill_amount||0)>0&&!o.lab_paid)
      : [];

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", paddingBottom: someSelected?90:0 }}>

      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:C.navy, color:'white', padding:'12px 20px', borderRadius:12, fontSize:14, fontWeight:600, borderLeft:`4px solid ${C.gold}`, zIndex:500, maxWidth:360 }}>
          {toast}
        </div>
      )}

      {payModal && (
        <PayModal
          orders={ordersToPay}
          title={payModal==='selected' ? `Pay ${selectedIds.size} selected orders` : `Pay All to ${payModal}`}
          onClose={()=>setPayModal(null)}
          onDone={msg=>{ showToast(msg); setPayModal(null); load(); }}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom:4 }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>🔬 Lab Receivings</h1>
        <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>
          Enter bill amounts inline · select orders · pay in one go
        </p>
      </div>

      {/* Quick guide */}
      <div style={{ background:'#eff6ff', border:'1px solid #bae6fd', borderRadius:10, padding:'10px 14px', margin:'12px 0 16px', fontSize:12, color:'#1e40af' }}>
        <b>Quick workflow:</b> Click <span style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:5,padding:'1px 6px',color:'#c2410c',fontWeight:700}}>+ Enter bill</span> on any order → pick lab → type amount → ✓ &nbsp;&nbsp;|&nbsp;&nbsp; Then tick checkboxes on orders you're paying → <b>Pay Selected</b>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:16 }}>
        {[
          { l:'Pending from lab', v:pending,           sub:'Not yet received', dark:true },
          { l:'Received',         v:received,           sub:'Ready to deliver', c:'#2563eb' },
          { l:'Unpaid to labs',   v:fmt(unpaidTotal),   sub:'Total you owe',    c:C.danger },
          { l:'Paid this month',  v:fmt(paidThisMonth), sub:'Expenses recorded',c:C.success },
        ].map(s=>(
          <div key={s.l} style={{ background:s.dark?C.navy:'white', border:`1px solid ${s.dark?C.navy:C.border}`, borderRadius:12, padding:'13px 15px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:s.dark?C.gold:C.muted, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:s.dark?'white':(s.c||C.navy) }}>{s.v}</div>
            {s.sub&&<div style={{ fontSize:11, color:s.dark?'#ede9e0':C.muted, marginTop:2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Outstanding per lab + Pay All */}
      {Object.keys(labUnpaid).length>0 && (
        <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', gap:16, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:700, color:C.danger }}>⚠️ Outstanding:</span>
          {Object.entries(labUnpaid).map(([lab,amt])=>(
            <div key={lab} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:13, color:C.danger }}><b>{lab}:</b> {fmt(amt)}</span>
              <button onClick={()=>setPayModal(lab)}
                style={{ padding:'4px 10px', background:C.danger, color:'white', border:'none', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Pay All
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search order, customer, lab..."
          style={{ flex:1, minWidth:200, padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}/>

        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {[['all','All Labs'],['Negombo Optical','Negombo'],['Solex Optical','Solex']].map(([v,l])=>(
            <button key={v} onClick={()=>setLabFilt(v)}
              style={{ padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${labFilt===v?C.navy:C.border}`, background:labFilt===v?C.navy:'white', color:labFilt===v?'white':C.muted }}>
              {l}
            </button>
          ))}
        </div>

        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {[['all','📋 All'],['pending','⏳ Pending'],['received','📥 Received'],['unpaid','💸 Unpaid'],['paid','✅ Paid']].map(([v,l])=>(
            <button key={v} onClick={()=>setStepFilt(v)}
              style={{ padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${stepFilt===v?C.navy:C.border}`, background:stepFilt===v?C.navy:'white', color:stepFilt===v?'white':C.muted }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>

        {/* Header */}
        <div style={{ display:'grid', gridTemplateColumns:'36px 120px 1fr 140px 150px 100px 90px 50px', padding:'10px 16px', background:C.cream, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:C.muted, borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center' }}>
            <input type="checkbox" checked={allSelected}
              ref={el=>{ if(el) el.indeterminate=someSelected&&!allSelected; }}
              onChange={toggleAll}
              style={{ cursor:'pointer', width:15, height:15 }}/>
          </div>
          <span>Order</span>
          <span>Customer / Lens</span>
          <span>Lab</span>
          <span>Bill amount</span>
          <span>Status</span>
          <span>Lab paid</span>
          <span></span>
        </div>

        {loading
          ? <div style={{ padding:40, textAlign:'center', color:C.muted }}>Loading...</div>
          : !filtered.length
            ? <div style={{ padding:40, textAlign:'center', color:C.muted }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🔬</div>
                <div style={{ fontSize:14, fontWeight:600, color:C.navy }}>No orders match this filter</div>
              </div>
            : filtered.map(o=>(
                <OrderRow
                  key={o.id}
                  order={o}
                  selected={selectedIds.has(o.id)}
                  onToggle={()=>toggleSelect(o.id)}
                  onSaved={load}
                />
              ))
        }

        {/* Footer */}
        {filtered.length>0 && (
          <div style={{ padding:'11px 16px', background:C.cream, display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:600, borderTop:`1px solid ${C.border}`, flexWrap:'wrap', gap:8 }}>
            <span style={{ color:C.muted }}>{filtered.length} orders · {filtered.filter(o=>!parseFloat(o.lab_bill_amount||0)).length} need bill entry</span>
            <div style={{ display:'flex', gap:16 }}>
              <span style={{ color:C.danger }}>Unpaid: {fmt(filtered.filter(o=>parseFloat(o.lab_bill_amount||0)>0&&!o.lab_paid).reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0))}</span>
              <span style={{ color:C.success }}>Paid: {fmt(filtered.filter(o=>o.lab_paid).reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0))}</span>
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      {someSelected && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:C.navy, color:'white', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', zIndex:100, boxShadow:'0 -4px 24px rgba(0,0,0,.35)', flexWrap:'wrap', gap:10 }}>
          <div>
            <span style={{ fontSize:14, fontWeight:700 }}>
              {selectedIds.size} order{selectedIds.size!==1?'s':''} selected
            </span>
            <span style={{ fontSize:15, color:C.gold, marginLeft:14, fontFamily:"'Playfair Display',serif", fontWeight:700 }}>
              Total: Rs. {selTotal.toLocaleString()}
            </span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setSelectedIds(new Set())}
              style={{ padding:'9px 18px', background:'rgba(255,255,255,.15)', color:'white', border:'1px solid rgba(255,255,255,.3)', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Clear
            </button>
            <button onClick={()=>setPayModal('selected')}
              style={{ padding:'9px 22px', background:C.gold, color:C.navy, border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              ✅ Pay {selectedIds.size} order{selectedIds.size!==1?'s':''} — Rs. {selTotal.toLocaleString()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}