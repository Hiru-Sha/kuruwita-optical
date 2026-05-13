/* eslint-disable */
// ============================================================
//  RxTracker.js — Prescription Return Tracker
//  Shows all orders where hospital Rx has not been returned
//  to customer. Mark as returned when done.
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};

const fmt     = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
const fmtDate = (d) => { if(!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); };
const daysSince = (d) => { if(!d) return 0; return Math.floor((Date.now()-new Date(d).getTime())/(1000*60*60*24)); };

function apiGet(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json());
}
function apiPatch(path, body) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, {
    method:'PATCH',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify(body),
  }).then(r=>r.json());
}

// ── Days-held badge ───────────────────────────────────────────
const holdInfo = (days) => {
  if (days >= 60) return { color:'#dc2626', bg:'#fee2e2', label:`${days}d held`, urgent:true };
  if (days >= 30) return { color:'#b45309', bg:'#fef9c3', label:`${days}d held`, urgent:true };
  if (days >= 14) return { color:'#0369a1', bg:'#e0f2fe', label:`${days}d held`, urgent:false };
  return              { color:C.muted,    bg:C.cream,   label:`${days}d held`, urgent:false };
};

// ── Single Rx card ────────────────────────────────────────────
function RxCard({ order, onReturn }) {
  const [marking, setMarking] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const days = daysSince(order.created_at);
  const info = holdInfo(days);
  const initials = (order.customer_name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  const handleReturn = async () => {
    if (!window.confirm(`Mark prescription as returned to ${order.customer_name}?`)) return;
    setMarking(true);
    try { await onReturn(order.id); }
    finally { setMarking(false); }
  };

  const waMsg = `Hello ${order.customer_name}, this is Kuruwita Optical.\n\nWe have your hospital prescription (${order.rx_hospital||'hospital'}) ready to return to you.\n\nPlease visit us to collect it.\n\nThank you! 🙏`;
  const phone = order.phone?.replace(/^0/,'94')?.replace(/\D/g,'');

  return (
    <div style={{ background:'white', border:`1.5px solid ${info.urgent?info.color:C.border}`, borderRadius:14, overflow:'hidden', marginBottom:10 }}>
      {/* Urgency stripe */}
      {info.urgent && (
        <div style={{ height:3, background:info.color }}/>
      )}

      <div style={{ padding:'14px 16px' }}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>

          {/* Avatar */}
          <div style={{ width:44, height:44, borderRadius:'50%', background:C.navy, display:'flex', alignItems:'center', justifyContent:'center', color:'#e8c96a', fontSize:16, fontWeight:700, flexShrink:0 }}>
            {initials}
          </div>

          {/* Details */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:6, marginBottom:5 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:C.navy }}>{order.customer_name}</div>
                <div style={{ fontSize:12, color:C.muted }}>📞 {order.phone}{order.age?` · Age ${order.age}`:''}</div>
              </div>
              <span style={{ background:info.bg, color:info.color, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, flexShrink:0 }}>
                {info.label}
              </span>
            </div>

            {/* Info grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:6, marginBottom:10 }}>
              {[
                { l:'Order',     v: order.order_number                    },
                { l:'Rx From',   v: order.rx_hospital || 'Hospital'       },
                { l:'Doctor',    v: order.rx_doctor   || '—'              },
                { l:'Rx Date',   v: fmtDate(order.rx_date)                },
                { l:'Order Date',v: fmtDate(order.created_at)             },
                { l:'Status',    v: order.status                          },
              ].map(f=>(
                <div key={f.l} style={{ background:C.cream, borderRadius:7, padding:'6px 9px' }}>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:C.muted, marginBottom:2 }}>{f.l}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.navy, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.v}</div>
                </div>
              ))}
            </div>

            {/* Spectacles info */}
            <div style={{ background:'#f0f9ff', borderRadius:8, padding:'8px 11px', fontSize:12, color:'#0369a1', marginBottom:10 }}>
              🕶️ {order.frame||'—'} · {order.lens_type||'—'} · {order.lens_coating||'—'}
            </div>

            {/* Action buttons */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button onClick={handleReturn} disabled={marking}
                style={{ padding:'9px 18px', background:marking?C.muted:C.success, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:marking?'not-allowed':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
                {marking ? '⏳ Saving...' : '✅ Mark as Returned'}
              </button>
              <a href={`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`}
                target="_blank" rel="noreferrer"
                style={{ padding:'9px 14px', background:'#25D366', color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
                💬 WA Reminder
              </a>
              <a href={`tel:${order.phone}`}
                style={{ padding:'9px 12px', background:C.cream, color:C.navy, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, textDecoration:'none' }}>
                📞 Call
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Recently returned card ────────────────────────────────────
function ReturnedCard({ order }) {
  const initials = (order.customer_name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return (
    <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 16px', marginBottom:8, display:'flex', gap:12, alignItems:'center', opacity:.8 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', background:'#dcfce7', display:'flex', alignItems:'center', justifyContent:'center', color:C.success, fontSize:14, fontWeight:700, flexShrink:0 }}>
        {initials}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{order.customer_name}</div>
        <div style={{ fontSize:11, color:C.muted }}>{order.order_number} · {order.rx_hospital||'Hospital'} · {fmtDate(order.created_at)}</div>
      </div>
      <span style={{ background:'#dcfce7', color:C.success, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, flexShrink:0 }}>
        ✅ Returned
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function RxTracker() {
  const [pending,   setPending]  = useState([]);
  const [returned,  setReturned] = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [search,    setSearch]   = useState('');
  const [sortBy,    setSortBy]   = useState('oldest');
  const [showDone,  setShowDone] = useState(false);
  const [toast,     setToast]    = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/orders?limit=500`, { headers:{ Authorization:`Bearer ${token}` } });
      const orders = await res.json();
      const all    = Array.isArray(orders) ? orders : [];

      // Orders where prescription was taken but not yet returned
      const pend = all.filter(o => o.has_rx && !o.rx_returned);
      const done = all.filter(o => o.has_rx && o.rx_returned);

      // Sort oldest first
      pend.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
      done.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

      setPending(pend);
      setReturned(done.slice(0,20)); // show last 20 returned
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  const handleReturn = async (orderId) => {
    const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('ko_token');
    await fetch(`${BASE}/orders/${orderId}`, {
      method:'PATCH',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({ rx_returned: true }),
    });
    showToast('Prescription marked as returned ✓');
    load();
  };

  // Filter + sort
  const filtered = pending
    .filter(o => {
      if (!search) return true;
      const q = search.toLowerCase();
      return o.customer_name?.toLowerCase().includes(q) ||
             o.phone?.includes(q) ||
             o.rx_hospital?.toLowerCase().includes(q) ||
             o.order_number?.toLowerCase().includes(q);
    })
    .sort((a,b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'name')   return (a.customer_name||'').localeCompare(b.customer_name||'');
      return new Date(a.created_at) - new Date(b.created_at); // oldest first
    });

  // Stats
  const over30 = pending.filter(o=>daysSince(o.created_at)>=30).length;
  const over60 = pending.filter(o=>daysSince(o.created_at)>=60).length;
  const hospitals = [...new Set(pending.map(o=>o.rx_hospital).filter(Boolean))];

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:C.navy, color:'white', padding:'12px 20px', borderRadius:12, fontSize:14, fontWeight:600, borderLeft:`4px solid ${C.gold}`, zIndex:500, boxShadow:'0 4px 20px rgba(0,0,0,.2)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>📄 Prescription Tracker</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Track hospital prescriptions held at the shop — return to customers when ready</p>
        </div>
        <button onClick={load}
          style={{ padding:'9px 14px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, margin:'20px 0' }}>
        {[
          { l:'Prescriptions Held', v:pending.length,  dark:true                       },
          { l:'30+ Days',           v:over30,           c:'#b45309'                     },
          { l:'60+ Days',           v:over60,           c:C.danger                      },
          { l:'Returned (total)',   v:returned.length,  c:C.success                     },
          { l:'Hospitals',          v:hospitals.length, c:'#7c3aed'                     },
        ].map(s=>(
          <div key={s.l} style={{ background:s.dark?C.navy:'white', border:`1px solid ${s.dark?C.navy:C.border}`, borderRadius:12, padding:'13px 15px', textAlign:'center' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:s.dark?C.gold:C.muted, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:s.dark?'white':(s.c||C.navy) }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Hospital breakdown */}
      {hospitals.length > 0 && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 16px', marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.navy, marginBottom:8 }}>Prescriptions by hospital</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {hospitals.map(h=>{
              const count = pending.filter(o=>o.rx_hospital===h).length;
              return (
                <div key={h} style={{ background:C.cream, borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:600, color:C.navy }}>
                  🏥 {h} <span style={{ color:C.muted }}>({count})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search + sort */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search by name, phone, hospital, order number..."
          style={{ flex:1, minWidth:200, padding:'9px 14px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}/>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{ padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy, cursor:'pointer' }}>
          <option value="oldest">Oldest first</option>
          <option value="newest">Newest first</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {/* Urgency legend */}
      <div style={{ display:'flex', gap:14, marginBottom:14, fontSize:12, color:C.muted, flexWrap:'wrap' }}>
        {[
          { color:'#dc2626', label:'60+ days' },
          { color:'#f59e0b', label:'30–60 days' },
          { color:'#0ea5e9', label:'14–30 days' },
          { color:'#9ca3af', label:'Under 14 days' },
        ].map(l=>(
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:l.color }}/>
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {/* ── PENDING LIST ── */}
      {loading
        ? <div style={{ textAlign:'center', padding:40, color:C.muted }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>Loading...
          </div>
        : filtered.length === 0
          ? <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'40px 20px', textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>
                {pending.length === 0 ? '🎉' : '🔍'}
              </div>
              <div style={{ fontSize:16, fontWeight:600, color:C.navy, marginBottom:6 }}>
                {pending.length === 0
                  ? 'All prescriptions returned!'
                  : 'No results match your search'}
              </div>
              <div style={{ fontSize:13, color:C.muted }}>
                {pending.length === 0
                  ? 'No hospital prescriptions are currently being held at the shop.'
                  : 'Try a different name, phone or hospital name.'}
              </div>
            </div>
          : <>
              <div style={{ fontSize:13, color:C.muted, marginBottom:10, fontWeight:600 }}>
                {filtered.length} prescription{filtered.length!==1?'s':''} pending return
                {over30>0 && <span style={{ marginLeft:10, color:'#b45309' }}>⚠️ {over30} held 30+ days</span>}
              </div>
              {filtered.map(order=>(
                <RxCard key={order.id} order={order} onReturn={handleReturn}/>
              ))}
            </>
      }

      {/* ── RETURNED HISTORY ── */}
      {returned.length > 0 && (
        <div style={{ marginTop:24 }}>
          <button onClick={()=>setShowDone(s=>!s)}
            style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:700, color:C.navy, padding:0, marginBottom:12 }}>
            <span>✅ Recently Returned ({returned.length})</span>
            <span style={{ fontSize:12, color:C.muted }}>{showDone?'▲ Hide':'▼ Show'}</span>
          </button>
          {showDone && returned.map(order=>(
            <ReturnedCard key={order.id} order={order}/>
          ))}
        </div>
      )}

      {/* How to use info */}
      <div style={{ background:'#f0f9ff', border:`1px solid #bae6fd`, borderRadius:12, padding:'14px 18px', marginTop:20 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#0369a1', marginBottom:6 }}>ℹ️ How this works</div>
        <div style={{ fontSize:13, color:'#0369a1', lineHeight:1.7 }}>
          When creating a new order, tick <b>Has Hospital Prescription</b> and enter the hospital name and doctor.
          The prescription then appears here until you click <b>Mark as Returned</b> after giving it back to the customer.
        </div>
      </div>
    </div>
  );
}
