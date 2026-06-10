/* eslint-disable */
// ============================================================
//  ActivityView.js — Combined Orders + Quick Sales + Repairs
//  Click any row → expand full detail inline
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};
const fmt     = n => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
const fmtD    = d => {
  if (!d) return '—';
  // Handle date-only string (YYYY-MM-DD) without timezone shift
  const s = String(d).slice(0,10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y,m,dy] = s.split('-');
    return new Date(+y,+m-1,+dy).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  }
  const dt = new Date(d);
  return isNaN(dt) ? '—' : dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
};
const fmtTime = d => new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});

function api(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json());
}
function apiPatch(path, body) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)}).then(r=>r.json());
}

const STATUS_COLOR = {
  created:   { bg:'#dbeafe', color:'#1e40af' },
  called:    { bg:'#fef9c3', color:'#92400e' },
  delivered: { bg:'#dcfce7', color:'#166534' },
  overdue:   { bg:'#fee2e2', color:'#991b1b' },
  done:      { bg:'#dcfce7', color:'#166534' },
  collected: { bg:'#f0fdf4', color:'#166534' },
  pending:   { bg:'#fef9c3', color:'#92400e' },
  completed: { bg:'#dcfce7', color:'#166534' },
  cancelled: { bg:'#f3f4f6', color:'#6b7280' },
};
const sc = s => STATUS_COLOR[s] || { bg:C.cream, color:C.muted };

// ── Expanded detail panels ────────────────────────────────────

function OrderDetail({ order, onClose, onRefresh }) {
  const [paying, setPaying] = useState(false);
  const [payAmt, setPayAmt] = useState('');
  const [saving, setSaving] = useState(false);

  const recordPayment = async () => {
    if (!payAmt) return;
    setSaving(true);
    const newAdv = parseFloat(order.advance_amount||0) + parseFloat(payAmt);
    const newBal = Math.max(0, parseFloat(order.total_amount||0) - newAdv);
    await apiPatch(`/orders/${order.id}`, {
      advance_amount: newAdv, balance_amount: newBal,
      last_payment_date: new Date().toISOString().split('T')[0],
    });
    setSaving(false); setPaying(false); setPayAmt('');
    onRefresh();
  };

  const updateStatus = async (status) => {
    await apiPatch(`/orders/${order.id}`, { status });
    onRefresh();
  };

  const whatsapp = (msg) => {
    if (!order.phone && !order.customer_phone) return alert('No phone number');
    const ph = (order.phone||order.customer_phone||'').replace(/^0/,'');
    window.open(`https://wa.me/94${ph}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div style={{ background:C.cream, borderRadius:12, padding:'16px', marginTop:8 }}>

      {/* Status + actions */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
        {['created','called','delivered'].map(s=>(
          <button key={s} onClick={()=>updateStatus(s)}
            style={{ padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
              fontFamily:'inherit', border:`1.5px solid ${order.status===s?C.navy:C.border}`,
              background:order.status===s?C.navy:'white', color:order.status===s?'white':C.muted }}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
        <button onClick={()=>whatsapp(`Hello ${order.customer_name}, your order ${order.order_number} is ready for collection. Please visit Wickramakalutota Opticals. Thank you!`)}
          style={{ padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', background:'#25D366', color:'white', border:'none', marginLeft:'auto' }}>
          💬 WhatsApp
        </button>
      </div>

      {/* Details grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14, fontSize:13 }}>
        {[
          { l:'Order No',    v:order.order_number },
          { l:'Date',        v:fmtD(order.created_at) },
          { l:'Frame',       v:order.frame||'—' },
          { l:'Lens',        v:order.lens_type ? `${order.lens_type} · ${order.lens_coating||''}` : '—' },
          { l:'Supplier',    v:order.lens_company||'—' },
          { l:'Deliver By',  v:order.deliver_date?fmtD(order.deliver_date+'T00:00:00'):'—' },
        ].map(row=>(
          <div key={row.l} style={{ background:'white', borderRadius:8, padding:'8px 10px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:2 }}>{row.l}</div>
            <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{row.v}</div>
          </div>
        ))}
      </div>

      {/* Payment summary */}
      <div style={{ background:'white', borderRadius:10, padding:'12px 14px', marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
          <span style={{ color:C.muted }}>Total</span>
          <span style={{ fontWeight:700, color:C.navy }}>{fmt(order.total_amount)}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
          <span style={{ color:C.muted }}>Paid</span>
          <span style={{ fontWeight:700, color:C.success }}>{fmt(order.advance_amount)}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, borderTop:`1px solid ${C.border}`, paddingTop:8 }}>
          <span style={{ fontWeight:700, color:parseFloat(order.balance_amount)>0?C.danger:C.success }}>
            {parseFloat(order.balance_amount)>0?'Balance Due':'Fully Paid'}
          </span>
          <span style={{ fontWeight:700, color:parseFloat(order.balance_amount)>0?C.danger:C.success }}>
            {parseFloat(order.balance_amount)>0?fmt(order.balance_amount):'✓'}
          </span>
        </div>
      </div>

      {/* Record payment */}
      {parseFloat(order.balance_amount) > 0 && (
        !paying ? (
          <button onClick={()=>{ setPaying(true); setPayAmt(String(order.balance_amount)); }}
            style={{ width:'100%', padding:'10px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginBottom:8 }}>
            💵 Record Balance Payment
          </button>
        ) : (
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <input type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)}
              style={{ flex:1, padding:'9px 12px', border:`1.5px solid ${C.navy}`, borderRadius:8, fontSize:14, fontWeight:700, fontFamily:'inherit', outline:'none' }}/>
            <button onClick={recordPayment} disabled={saving}
              style={{ padding:'9px 18px', background:C.success, color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {saving?'Saving...':'✓ Save'}
            </button>
            <button onClick={()=>setPaying(false)}
              style={{ padding:'9px 12px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
              Cancel
            </button>
          </div>
        )
      )}

      {order.notes && (
        <div style={{ background:'#fef9f0', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#92400e' }}>
          📝 {order.notes}
        </div>
      )}
    </div>
  );
}

function SaleDetail({ sale }) {
  let items = [];
  try { items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items || []; } catch(e) {}
  return (
    <div style={{ background:C.cream, borderRadius:12, padding:'16px', marginTop:8 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12, fontSize:13 }}>
        {[
          { l:'Sale No',     v:sale.sale_number },
          { l:'Date & Time', v:`${fmtD(sale.created_at)} ${fmtTime(sale.created_at)}` },
          { l:'Payment',     v:sale.payment_method||'cash' },
          { l:'Discount',    v:parseFloat(sale.discount||0)>0?fmt(sale.discount):'—' },
        ].map(row=>(
          <div key={row.l} style={{ background:'white', borderRadius:8, padding:'8px 10px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:2 }}>{row.l}</div>
            <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{row.v}</div>
          </div>
        ))}
      </div>
      {/* Items */}
      <div style={{ background:'white', borderRadius:10, overflow:'hidden', marginBottom:8 }}>
        <div style={{ padding:'8px 12px', background:'#e0f2fe', fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#0369a1' }}>
          Items Sold
        </div>
        {items.map((item,i)=>(
          <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'9px 12px', borderBottom:`1px solid ${C.cream}`, fontSize:13 }}>
            <div>
              <span style={{ fontWeight:600, color:C.navy }}>{item.name}</span>
              <span style={{ color:C.muted, marginLeft:8 }}>×{item.qty||1}</span>
            </div>
            <span style={{ fontWeight:700, color:'#0891b2' }}>{fmt((item.unit_price||item.price||0)*(item.qty||1))}</span>
          </div>
        ))}
        <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 12px', fontSize:14, fontWeight:700 }}>
          <span style={{ color:C.navy }}>Total</span>
          <span style={{ color:'#0891b2' }}>{fmt(sale.total)}</span>
        </div>
      </div>
      {sale.notes && (
        <div style={{ background:'#fef9f0', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#92400e' }}>
          📝 {sale.notes}
        </div>
      )}
    </div>
  );
}

function RepairDetail({ repair, onRefresh }) {
  const updateStatus = async (status) => {
    await apiPatch(`/repairs/${repair.id}`, { status });
    onRefresh();
  };
  const whatsapp = (msg) => {
    if (!repair.phone) return alert('No phone number');
    const ph = repair.phone.replace(/^0/,'');
    window.open(`https://wa.me/94${ph}?text=${encodeURIComponent(msg)}`, '_blank');
  };
  return (
    <div style={{ background:C.cream, borderRadius:12, padding:'16px', marginTop:8 }}>
      {/* Status buttons */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
        {['pending','done','collected'].map(s=>(
          <button key={s} onClick={()=>updateStatus(s)}
            style={{ padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
              fontFamily:'inherit', border:`1.5px solid ${repair.status===s?C.navy:C.border}`,
              background:repair.status===s?C.navy:'white', color:repair.status===s?'white':C.muted }}>
            {s==='pending'?'⏳ Pending':s==='done'?'✅ Done':'📦 Collected'}
          </button>
        ))}
        {repair.phone && (
          <button onClick={()=>whatsapp(`Hello ${repair.customer_name||'customer'}, your repair ${repair.repair_number} is ready for collection. Please visit Wickramakalutota Opticals. Thank you!`)}
            style={{ padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', background:'#25D366', color:'white', border:'none', marginLeft:'auto' }}>
            💬 WhatsApp
          </button>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12, fontSize:13 }}>
        {[
          { l:'Repair No',   v:repair.repair_number },
          { l:'Date',        v:fmtD(repair.created_at) },
          { l:'Repair Type', v:repair.repair_type||'—' },
          { l:'Due Date',    v:repair.due_date?fmtD(repair.due_date+'T00:00:00'):'—' },
          { l:'Phone',       v:repair.phone||'—' },
          { l:'Payment',     v:repair.payment_method||'cash' },
        ].map(row=>(
          <div key={row.l} style={{ background:'white', borderRadius:8, padding:'8px 10px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:2 }}>{row.l}</div>
            <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{row.v}</div>
          </div>
        ))}
      </div>

      {(repair.description||repair.frame_description) && (
        <div style={{ background:'white', borderRadius:8, padding:'10px 12px', marginBottom:8, fontSize:13 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:4 }}>Description</div>
          <div style={{ color:C.navy }}>{repair.frame_description||repair.description}</div>
        </div>
      )}

      <div style={{ background:'white', borderRadius:10, padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:13, color:C.muted }}>Charge</span>
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'#7c3aed' }}>
          {parseFloat(repair.charge)>0?fmt(repair.charge):'Free'}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function ActivityView() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const params     = new URLSearchParams(location.search);
  const viewMode   = params.get('view')  || 'month';
  const month      = params.get('month') || new Date().toISOString().slice(0,7);

  const [orders,   setOrders]   = useState([]);
  const [sales,    setSales]    = useState([]);
  const [repairs,  setRepairs]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('all');
  const [search,   setSearch]   = useState('');
  const [expanded, setExpanded] = useState(null); // { type, id }

  const toggle = (type, id) =>
    setExpanded(e => e?.type===type && e?.id===id ? null : { type, id });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ordRes, qsRes, repRes] = await Promise.all([
        api(`/orders?limit=500`),
        api(`/quick-sales?limit=500`).catch(()=>({data:[]})),
        api(`/repairs?limit=500`).catch(()=>[]),
      ]);

      let ords = ordRes?.data || ordRes || [];
      let qs   = qsRes?.data  || qsRes  || [];
      let reps = Array.isArray(repRes) ? repRes : repRes?.data || [];

      if (viewMode === 'month') {
        ords = ords.filter(o => o.created_at?.slice(0,7) === month);
        qs   = qs.filter(  s => s.created_at?.slice(0,7) === month);
        reps = reps.filter(r => r.created_at?.slice(0,7) === month);
      } else if (viewMode === 'balance') {
        ords = ords.filter(o => parseFloat(o.balance_amount) > 0);
        qs = []; reps = [];
      } else if (viewMode === 'active') {
        ords = ords.filter(o => ['created','called','overdue'].includes(o.status));
        qs   = [];
        reps = reps.filter(r => r.status === 'pending');
      } else if (viewMode === 'collected') {
        // Show all orders this month where advance was paid (includes partial advances)
        ords = ords.filter(o => o.created_at?.slice(0,7) === month && parseFloat(o.advance_amount) > 0);
        qs   = qs.filter(  s => s.created_at?.slice(0,7) === month);
        reps = reps.filter(r => ['done','collected'].includes(r.status) && r.created_at?.slice(0,7) === month);
      }

      if (!Array.isArray(ords)) ords = [];
      if (!Array.isArray(qs))   qs   = [];
      if (!Array.isArray(reps)) reps = [];

      setOrders(ords); setSales(qs); setRepairs(reps);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [viewMode, month]);

  useEffect(() => { load(); }, [load]);

  const TITLE_MAP = {
    month:     `This Month — ${new Date(month+'-01').toLocaleDateString('en-GB',{month:'long',year:'numeric'})}`,
    balance:   '💰 Balance Due',
    active:    '🔄 Active & Pending',
    collected: `✅ Completed — ${new Date(month+'-01').toLocaleDateString('en-GB',{month:'long',year:'numeric'})}`,
  };

  const q = search.toLowerCase();
  const fo = orders.filter( o => !q || (o.customer_name||'').toLowerCase().includes(q) || (o.order_number||'').includes(q) || (o.frame||'').toLowerCase().includes(q));
  const fs = sales.filter(  s => !q || (s.customer_name||'').toLowerCase().includes(q) || (s.sale_number||'').includes(q));
  const fr = repairs.filter(r => !q || (r.customer_name||'').toLowerCase().includes(q) || (r.repair_number||'').includes(q) || (r.repair_type||'').toLowerCase().includes(q));

  const orderAmt    = viewMode==='collected'
    ? fo.reduce((s,o)=>s+parseFloat(o.advance_amount||0),0)
    : fo.reduce((s,o)=>s+parseFloat(o.total_amount||0),0);
  const grandTotal  = orderAmt
                    + fs.reduce((s,x)=>s+parseFloat(x.total||0),0)
                    + fr.reduce((s,r)=>s+parseFloat(r.charge||0),0);
  const balanceDue  = fo.reduce((s,o)=>s+parseFloat(o.balance_amount||0),0);

  const TABS = [
    { key:'all',     label:'All',          count: fo.length+fs.length+fr.length },
    { key:'orders',  label:'📋 Orders',    count: fo.length },
    { key:'sales',   label:'⚡ Sales',     count: fs.length },
    { key:'repairs', label:'🔧 Repairs',   count: fr.length },
  ];

  const Row = ({ children, type, id, accent }) => {
    const isOpen = expanded?.type===type && expanded?.id===id;
    return (
      <div style={{ background:'white', border:`1.5px solid ${isOpen?accent||C.gold:C.border}`,
        borderRadius:12, marginBottom:8, overflow:'hidden', transition:'border-color .15s' }}>
        <div onClick={()=>toggle(type, id)} style={{ cursor:'pointer', padding:'12px 16px' }}>
          {children}
        </div>
        {isOpen && (
          <div style={{ borderTop:`1px solid ${C.border}` }}>
            {type==='order'  && <OrderDetail  order={orders.find(o=>o.id===id)}   onClose={()=>setExpanded(null)} onRefresh={load}/>}
            {type==='sale'   && <SaleDetail   sale={sales.find(s=>s.id===id)}/>}
            {type==='repair' && <RepairDetail repair={repairs.find(r=>r.id===id)} onRefresh={load}/>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom:16 }}>
        <button onClick={()=>navigate('/dashboard')}
          style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:13, fontFamily:'inherit', padding:'0 0 6px', display:'block' }}>
          ← Dashboard
        </button>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.navy, margin:0 }}>
          {TITLE_MAP[viewMode]}
        </h1>
      </div>

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:16 }}>
        <div style={{ background:C.navy, borderRadius:12, padding:'12px 14px' }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.gold, marginBottom:4 }}>Grand Total</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'white' }}>{fmt(grandTotal)}</div>
          <div style={{ fontSize:11, color:'#ede9e0', marginTop:2 }}>{fo.length} orders · {fs.length} sales · {fr.length} repairs</div>
        </div>
        {balanceDue > 0 && (
          <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.danger, marginBottom:4 }}>Balance Due</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:C.danger }}>{fmt(balanceDue)}</div>
          </div>
        )}
      </div>

      {/* Search */}
      {/* Month / period filter */}
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:12 }}>
        <span style={{ fontSize:12, color:C.muted, fontWeight:600 }}>Period:</span>
        {[
          { l:'This Month', v: new Date().toISOString().slice(0,7) },
          { l:'Last Month', v: (() => { const d=new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })() },
          { l:'2 Months Ago', v: (() => { const d=new Date(); d.setMonth(d.getMonth()-2); return d.toISOString().slice(0,7); })() },
        ].map(p => (
          <button key={p.v}
            onClick={()=>{ const url=new URL(window.location); url.searchParams.set('month',p.v); window.history.replaceState({},'',url); window.location.reload(); }}
            style={{ padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
              fontFamily:'inherit', border:`1.5px solid ${month===p.v?C.navy:C.border}`,
              background:month===p.v?C.navy:'white', color:month===p.v?'white':C.muted }}>
            {p.l}
          </button>
        ))}
        <input type="month" value={month}
          onChange={e=>{ const url=new URL(window.location); url.searchParams.set('month',e.target.value); window.history.replaceState({},'',url); window.location.reload(); }}
          style={{ padding:'5px 10px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12,
            fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy, cursor:'pointer' }}/>
      </div>

      <input value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="🔍 Search name, number, frame..."
        style={{ padding:'10px 14px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13,
          fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy, width:'100%',
          marginBottom:14, boxSizing:'border-box' }}/>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, marginBottom:16,
        background:'white', borderRadius:'12px 12px 0 0', overflowX:'auto' }}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{ padding:'11px 16px', fontSize:13, fontWeight:600, cursor:'pointer',
              background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap',
              color:tab===t.key?C.navy:C.muted,
              borderBottom:`2.5px solid ${tab===t.key?C.gold:'transparent'}`, marginBottom:-1 }}>
            {t.label}
            {' '}<span style={{ background:tab===t.key?C.navy:C.cream, color:tab===t.key?'white':C.muted,
              fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>Loading...</div>}

      {!loading && (
        <div>

          {/* ORDERS */}
          {(tab==='all'||tab==='orders') && fo.length > 0 && (
            <div style={{ marginBottom:16 }}>
              {tab==='all' && <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:10 }}>
                📋 Orders — {fo.length} · {fmt(viewMode==='collected' ? fo.reduce((s,o)=>s+parseFloat(o.advance_amount||0),0) : fo.reduce((s,o)=>s+parseFloat(o.total_amount||0),0))}
              </div>}
              {fo.map(o=>(
                <Row key={o.id} type="order" id={o.id} accent={C.navy}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:3 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>{o.order_number}</span>
                        <span style={{ ...sc(o.status), fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{o.status}</span>
                        {parseFloat(o.balance_amount)>0 && <span style={{ background:'#fee2e2', color:C.danger, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>⚠ {fmt(o.balance_amount)} due</span>}
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{o.customer_name}</div>
                      <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                        {o.frame && <span>{o.frame} · </span>}
                        {fmtD(o.created_at)}
                        <span style={{ marginLeft:8, fontSize:11, color:C.muted }}>tap to expand ↕</span>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:C.navy }}>
                        {viewMode==='collected' ? fmt(o.advance_amount) : fmt(o.total_amount)}
                      </div>
                      {viewMode!=='collected' && <div style={{ fontSize:11, color:C.success }}>paid {fmt(o.advance_amount)}</div>}
                    </div>
                  </div>
                </Row>
              ))}
            </div>
          )}

          {/* QUICK SALES */}
          {(tab==='all'||tab==='sales') && fs.length > 0 && (
            <div style={{ marginBottom:16 }}>
              {tab==='all' && <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:10 }}>
                ⚡ Quick Sales — {fs.length} · {fmt(fs.reduce((s,x)=>s+parseFloat(x.total||0),0))}
              </div>}
              {fs.map(s=>{
                let items=[];
                try{items=typeof s.items==='string'?JSON.parse(s.items):s.items||[];}catch(e){}
                return (
                  <Row key={s.id} type="sale" id={s.id} accent="#0891b2">
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>{s.sale_number}</span>
                          <span style={{ background:'#e0f2fe', color:'#0369a1', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{s.payment_method||'cash'}</span>
                        </div>
                        <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{s.customer_name||'Walk-in'}</div>
                        <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                          {items.slice(0,2).map(i=>i.name).join(', ')}{items.length>2?` +${items.length-2} more`:''}
                          {' · '}{fmtD(s.created_at)}
                          <span style={{ marginLeft:8, fontSize:11 }}>tap ↕</span>
                        </div>
                      </div>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:'#0891b2', marginLeft:12 }}>{fmt(s.total)}</div>
                    </div>
                  </Row>
                );
              })}
            </div>
          )}

          {/* REPAIRS */}
          {(tab==='all'||tab==='repairs') && fr.length > 0 && (
            <div style={{ marginBottom:16 }}>
              {tab==='all' && <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:10 }}>
                🔧 Repairs — {fr.length} · {fmt(fr.reduce((s,r)=>s+parseFloat(r.charge||0),0))}
              </div>}
              {fr.map(r=>(
                <Row key={r.id} type="repair" id={r.id} accent="#7c3aed">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:3 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>{r.repair_number}</span>
                        <span style={{ ...sc(r.status), fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{r.status}</span>
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{r.customer_name||'Walk-in'}</div>
                      <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                        {r.repair_type}{' · '}{fmtD(r.created_at)}
                        <span style={{ marginLeft:8, fontSize:11 }}>tap ↕</span>
                      </div>
                    </div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:'#7c3aed', marginLeft:12 }}>
                      {parseFloat(r.charge)>0?fmt(r.charge):'Free'}
                    </div>
                  </div>
                </Row>
              ))}
            </div>
          )}

          {fo.length===0 && fs.length===0 && fr.length===0 && (
            <div style={{ textAlign:'center', padding:60, color:C.muted }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
              <div style={{ fontSize:15, fontWeight:600, color:C.navy }}>No records found</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}