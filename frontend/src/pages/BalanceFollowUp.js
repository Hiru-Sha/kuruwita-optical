/* eslint-disable */
// ============================================================
//  BalanceFollowUp.js — All customers with unpaid balance
//  Sorted oldest first, WhatsApp reminder button per customer
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};

const fmt     = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0,maximumFractionDigits:0});
const fmtFull = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2});
const fmtDate = (d) => { if(!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); };
const daysSince = (d) => { if(!d) return 0; return Math.floor((Date.now()-new Date(d).getTime())/(1000*60*60*24)); };

function apiGet(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json());
}

// ── urgency colour based on days overdue ──────────────────────
const urgency = (days) => {
  if (days >= 60) return { color:'#dc2626', bg:'#fee2e2', label:'Overdue',    dot:'#dc2626' };
  if (days >= 30) return { color:'#b45309', bg:'#fef9c3', label:'30+ days',   dot:'#f59e0b' };
  if (days >= 14) return { color:'#0369a1', bg:'#e0f2fe', label:'2+ weeks',   dot:'#0ea5e9' };
  return              { color:C.muted,    bg:C.cream,   label:'Recent',     dot:'#9ca3af' };
};

// ── Build WhatsApp message ────────────────────────────────────
const buildWAMessage = (customer, order) => {
  const balance = fmt(order.balance_amount);
  return `Hello ${customer.name || 'valued customer'}, this is Kuruwita Optical.\n\nYour order ${order.order_number} has a balance of ${balance} pending collection.\n\nPlease visit us at your earliest convenience to collect your spectacles.\n\nThank you! 🙏`;
};

const openWA = (phone, message) => {
  const num = phone?.replace(/^0/, '94')?.replace(/\D/g,'') || '';
  if (!num) return alert('No phone number available for this customer');
  const url = `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

// ── Customer row ──────────────────────────────────────────────
function CustomerRow({ customer, orders, onCall }) {
  const [expanded, setExpanded] = useState(false);
  const totalBalance = orders.reduce((s,o)=>s+parseFloat(o.balance_amount||0),0);
  const oldestOrder  = orders[orders.length-1]; // already sorted oldest first
  const days         = daysSince(oldestOrder?.created_at);
  const urg          = urgency(days);
  const initials     = (customer.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  return (
    <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden', marginBottom:10 }}>
      {/* Main row */}
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', cursor:'pointer' }}
        onClick={()=>setExpanded(e=>!e)}>

        {/* Avatar */}
        <div style={{ width:44, height:44, borderRadius:'50%', background:C.navy, display:'flex', alignItems:'center', justifyContent:'center', color:'#e8c96a', fontSize:16, fontWeight:700, flexShrink:0 }}>
          {initials}
        </div>

        {/* Name + phone */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:C.navy, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {customer.name}
          </div>
          <div style={{ fontSize:12, color:C.muted, marginTop:1 }}>
            📞 {customer.phone}
            {customer.age ? ` · Age ${customer.age}` : ''}
          </div>
        </div>

        {/* Days badge */}
        <div style={{ flexShrink:0, textAlign:'center' }}>
          <div style={{ background:urg.bg, color:urg.color, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, marginBottom:3 }}>
            {urg.label}
          </div>
          <div style={{ fontSize:10, color:C.muted }}>{days}d ago</div>
        </div>

        {/* Balance */}
        <div style={{ flexShrink:0, textAlign:'right' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:C.danger }}>
            {fmt(totalBalance)}
          </div>
          <div style={{ fontSize:11, color:C.muted }}>{orders.length} order{orders.length!==1?'s':''}</div>
        </div>

        {/* Expand arrow */}
        <div style={{ fontSize:14, color:C.muted, flexShrink:0 }}>{expanded?'▲':'▼'}</div>
      </div>

      {/* Action buttons — always visible */}
      <div style={{ padding:'0 16px 12px', display:'flex', gap:8, flexWrap:'wrap' }}>
        <button
          onClick={e=>{ e.stopPropagation(); openWA(customer.phone, buildWAMessage(customer, oldestOrder)); }}
          style={{ padding:'9px 16px', background:'#25D366', color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
          💬 WhatsApp Reminder
        </button>
        <a href={`tel:${customer.phone}`}
          style={{ padding:'9px 14px', background:C.cream, color:C.navy, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
          📞 Call
        </a>
        <button onClick={()=>setExpanded(e=>!e)}
          style={{ padding:'9px 14px', background:'white', color:C.muted, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto' }}>
          {expanded ? 'Hide orders ▲' : `View ${orders.length} order${orders.length!==1?'s':''} ▼`}
        </button>
      </div>

      {/* Expanded order list */}
      {expanded && (
        <div style={{ borderTop:`1px solid ${C.border}` }}>
          {orders.map((order,i)=>{
            const orderDays = daysSince(order.created_at);
            const msg = buildWAMessage(customer, order);
            return (
              <div key={order.id} style={{ padding:'12px 16px', borderBottom:i<orders.length-1?`1px solid ${C.cream}`:undefined, display:'flex', gap:12, alignItems:'flex-start' }}>
                {/* Order details */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:C.navy }}>{order.order_number}</span>
                      <span style={{ background:'#fee2e2', color:C.danger, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                        Balance Due
                      </span>
                    </div>
                    <span style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:C.danger }}>
                      {fmt(order.balance_amount)}
                    </span>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:6, marginBottom:8 }}>
                    {[
                      { l:'Frame',    v: order.frame||'—' },
                      { l:'Lens',     v: order.lens_type||'—' },
                      { l:'Total',    v: fmt(order.total_amount) },
                      { l:'Advance',  v: fmt(order.advance_amount) },
                      { l:'Ordered',  v: fmtDate(order.created_at) },
                      { l:'Deliver',  v: fmtDate(order.deliver_date) },
                    ].map(f=>(
                      <div key={f.l} style={{ background:C.cream, borderRadius:7, padding:'6px 10px' }}>
                        <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:C.muted, marginBottom:2 }}>{f.l}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:C.navy }}>{f.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Per-order WA button */}
                  <button onClick={()=>openWA(customer.phone, msg)}
                    style={{ padding:'7px 14px', background:'#25D366', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    💬 WA for {order.order_number}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function BalanceFollowUp() {
  const [data,       setData]      = useState([]);   // [{customer, orders:[]}]
  const [loading,    setLoading]   = useState(true);
  const [search,     setSearch]    = useState('');
  const [filter,     setFilter]    = useState('all'); // all | overdue | recent
  const [sortBy,     setSortBy]    = useState('oldest'); // oldest | amount
  const [sending,    setSending]   = useState(false);
  const [bulkToast,  setBulkToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all orders with balance > 0, joined with customer info
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/orders?limit=500`, { headers:{ Authorization:`Bearer ${token}` } });
      const orders = await res.json();

      // Filter orders with outstanding balance
      const withBalance = (Array.isArray(orders)?orders:[])
        .filter(o => parseFloat(o.balance_amount||0) > 0 && o.status !== 'cancelled');

      // Group by customer
      const customerMap = {};
      withBalance.forEach(order => {
        const cid = order.customer_id || order.customer_name;
        if (!customerMap[cid]) {
          customerMap[cid] = {
            customer: {
              id:    order.customer_id,
              name:  order.customer_name,
              phone: order.phone,
              age:   order.age,
            },
            orders: [],
          };
        }
        customerMap[cid].orders.push(order);
      });

      // Sort each customer's orders oldest first
      Object.values(customerMap).forEach(c => {
        c.orders.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
      });

      setData(Object.values(customerMap));
    } catch(e) { console.error(e); setData([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); },[load]);

  // ── Filter + sort ─────────────────────────────────────────
  const filtered = data
    .filter(({customer, orders}) => {
      if (search) {
        const q = search.toLowerCase();
        if (!customer.name?.toLowerCase().includes(q) && !customer.phone?.includes(q)) return false;
      }
      if (filter === 'overdue') {
        const days = daysSince(orders[orders.length-1]?.created_at);
        return days >= 30;
      }
      if (filter === 'recent') {
        const days = daysSince(orders[orders.length-1]?.created_at);
        return days < 14;
      }
      return true;
    })
    .sort((a,b) => {
      if (sortBy === 'amount') {
        const aTotal = a.orders.reduce((s,o)=>s+parseFloat(o.balance_amount||0),0);
        const bTotal = b.orders.reduce((s,o)=>s+parseFloat(o.balance_amount||0),0);
        return bTotal - aTotal;
      }
      // oldest first
      const aDate = new Date(a.orders[a.orders.length-1]?.created_at||0);
      const bDate = new Date(b.orders[b.orders.length-1]?.created_at||0);
      return aDate - bDate;
    });

  // ── Summary stats ─────────────────────────────────────────
  const totalOwed    = data.reduce((s,{orders})=>s+orders.reduce((ss,o)=>ss+parseFloat(o.balance_amount||0),0),0);
  const totalOrders  = data.reduce((s,{orders})=>s+orders.length,0);
  const overdue30    = data.filter(({orders})=>daysSince(orders[orders.length-1]?.created_at)>=30).length;
  const overdue60    = data.filter(({orders})=>daysSince(orders[orders.length-1]?.created_at)>=60).length;

  // ── Send bulk WA (opens one per customer) ────────────────
  const sendBulkWA = () => {
    if (!window.confirm(`Open WhatsApp for all ${filtered.length} customers? Your browser may block multiple popups.`)) return;
    setSending(true);
    filtered.forEach(({customer, orders}, i) => {
      setTimeout(()=>{
        const oldestOrder = orders[orders.length-1];
        openWA(customer.phone, buildWAMessage(customer, oldestOrder));
      }, i * 600);
    });
    setBulkToast(`Sent ${filtered.length} WhatsApp messages`);
    setTimeout(()=>{ setBulkToast(''); setSending(false); },4000);
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {/* Toast */}
      {bulkToast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:C.navy, color:'white', padding:'12px 20px', borderRadius:12, fontSize:14, fontWeight:600, borderLeft:`4px solid ${C.gold}`, zIndex:500, boxShadow:'0 4px 20px rgba(0,0,0,.2)' }}>
          ✅ {bulkToast}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>💰 Balance Follow-up</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Customers with unpaid balance — send WhatsApp reminders</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load}
            style={{ padding:'9px 14px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
            🔄 Refresh
          </button>
          {filtered.length > 0 && (
            <button onClick={sendBulkWA} disabled={sending}
              style={{ padding:'9px 18px', background:'#25D366', color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:sending?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {sending ? '⏳ Sending...' : `💬 WA All (${filtered.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, margin:'20px 0' }}>
        {[
          { l:'Total Owed',      v:fmt(totalOwed),  dark:true                  },
          { l:'Customers',       v:data.length,      c:C.navy                  },
          { l:'Orders Due',      v:totalOrders,      c:'#2563eb'               },
          { l:'30+ Days',        v:overdue30,        c:'#b45309'               },
          { l:'60+ Days',        v:overdue60,        c:C.danger                },
        ].map(s=>(
          <div key={s.l} style={{ background:s.dark?C.navy:'white', border:`1px solid ${s.dark?C.navy:C.border}`, borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:s.dark?C.gold:C.muted, marginBottom:5 }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:s.dark?'white':(s.c||C.navy) }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Search + filter + sort */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search by name or phone..."
          style={{ flex:1, minWidth:180, padding:'9px 14px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}/>

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:6 }}>
          {[
            ['all',     'All'],
            ['overdue', '⚠️ 30+ days'],
            ['recent',  '🕐 < 2 weeks'],
          ].map(([f,l])=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{ padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${filter===f?C.navy:C.border}`, background:filter===f?C.navy:'white', color:filter===f?'white':C.muted }}>
              {l}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{ padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy, cursor:'pointer' }}>
          <option value="oldest">Oldest first</option>
          <option value="amount">Highest balance first</option>
        </select>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:14, marginBottom:14, fontSize:12, color:C.muted, flexWrap:'wrap' }}>
        {[
          { dot:'#dc2626', label:'60+ days overdue' },
          { dot:'#f59e0b', label:'30–60 days' },
          { dot:'#0ea5e9', label:'14–30 days' },
          { dot:'#9ca3af', label:'Under 14 days' },
        ].map(l=>(
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:l.dot, flexShrink:0 }}/>
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {/* List */}
      {loading
        ? <div style={{ textAlign:'center', padding:40, color:C.muted }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>Loading...
          </div>
        : !filtered.length
          ? <div style={{ textAlign:'center', padding:40, color:C.muted, background:'white', borderRadius:14, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
              <div style={{ fontSize:16, fontWeight:600, color:C.navy, marginBottom:6 }}>
                {data.length ? 'No customers match this filter' : 'All balances cleared!'}
              </div>
              <div style={{ fontSize:13 }}>
                {data.length ? 'Try changing the filter above' : 'Every customer has paid their balance in full.'}
              </div>
            </div>
          : filtered.map(({customer, orders})=>(
              <CustomerRow
                key={customer.id||customer.name}
                customer={customer}
                orders={orders}
              />
            ))
      }

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <div style={{ textAlign:'center', fontSize:12, color:C.muted, marginTop:16 }}>
          Showing {filtered.length} of {data.length} customers with outstanding balance
        </div>
      )}
    </div>
  );
}
