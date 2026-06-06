/* eslint-disable */
// ============================================================
//  ActivityView.js — Combined Orders + Quick Sales + Repairs
//  Opened from Dashboard KPI cards
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};
const fmt     = n => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
const fmtDate = d => new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});

function api(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json());
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
};

export default function ActivityView() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const params    = new URLSearchParams(location.search);
  const viewMode  = params.get('view')  || 'month';   // month | balance | active | collected
  const month     = params.get('month') || new Date().toISOString().slice(0,7);

  const [orders,  setOrders]  = useState([]);
  const [sales,   setSales]   = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('all'); // all | orders | sales | repairs
  const [search,  setSearch]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ordRes, qsRes, repRes] = await Promise.all([
        api(`/orders?limit=500`),
        api(`/quick-sales?limit=500`).catch(()=>({data:[]})),
        api(`/repairs?limit=500`).catch(()=>[]),
      ]);

      let ords  = (ordRes?.data || ordRes || []);
      let qs    = (qsRes?.data  || qsRes  || []);
      let reps  = Array.isArray(repRes) ? repRes : (repRes?.data || []);

      // Apply filter based on viewMode
      if (viewMode === 'month') {
        ords  = ords.filter( o => o.created_at?.slice(0,7) === month);
        qs    = qs.filter(  s => s.created_at?.slice(0,7) === month);
        reps  = reps.filter(r => r.created_at?.slice(0,7) === month);
      } else if (viewMode === 'balance') {
        ords  = ords.filter(o => parseFloat(o.balance_amount) > 0);
        qs    = []; reps = [];
      } else if (viewMode === 'active') {
        ords  = ords.filter(o => ['created','called','overdue'].includes(o.status));
        qs    = []; reps = reps.filter(r => r.status === 'pending');
      } else if (viewMode === 'collected') {
        ords  = ords.filter(o => o.status === 'delivered');
        qs    = qs.filter(  s => s.created_at?.slice(0,7) === month);
        reps  = reps.filter(r => ['done','collected'].includes(r.status) && r.created_at?.slice(0,7) === month);
      }

      setOrders(ords);
      setSales(qs);
      setRepairs(reps);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [viewMode, month]);

  useEffect(() => { load(); }, [load]);

  const TITLE_MAP = {
    month:     `This Month — ${new Date(month+'-01').toLocaleDateString('en-GB',{month:'long',year:'numeric'})}`,
    balance:   'Balance Due',
    active:    'Active Orders & Pending Repairs',
    collected: 'Collected / Completed',
  };

  // Totals
  const orderTotal  = orders.reduce((s,o)=>s+parseFloat(o.total_amount||0),0);
  const salesTotal  = sales.reduce( (s,q)=>s+parseFloat(q.total||0),0);
  const repairTotal = repairs.reduce((s,r)=>s+parseFloat(r.charge||0),0);
  const grandTotal  = orderTotal + salesTotal + repairTotal;
  const balanceTotal= orders.reduce((s,o)=>s+parseFloat(o.balance_amount||0),0);

  // Search filter
  const q = search.toLowerCase();
  const filteredOrders  = orders.filter( o => !q || o.customer_name?.toLowerCase().includes(q) || o.order_number?.toLowerCase().includes(q) || o.frame?.toLowerCase().includes(q));
  const filteredSales   = sales.filter(  s => !q || s.customer_name?.toLowerCase().includes(q) || s.sale_number?.toLowerCase().includes(q));
  const filteredRepairs = repairs.filter(r => !q || r.customer_name?.toLowerCase().includes(q) || r.repair_number?.toLowerCase().includes(q) || r.repair_type?.toLowerCase().includes(q));

  const TABS = [
    { key:'all',     label:`All`,                         count: filteredOrders.length + filteredSales.length + filteredRepairs.length },
    { key:'orders',  label:`📋 Orders`,                   count: filteredOrders.length  },
    { key:'sales',   label:`⚡ Quick Sales`,               count: filteredSales.length   },
    { key:'repairs', label:`🔧 Repairs`,                   count: filteredRepairs.length },
  ];

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <button onClick={()=>navigate('/dashboard')}
              style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:13, fontFamily:'inherit', padding:0 }}>
              ← Dashboard
            </button>
          </div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.navy, margin:0 }}>
            {TITLE_MAP[viewMode] || 'Activity'}
          </h1>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:16 }}>
        <div style={{ background:C.navy, borderRadius:12, padding:'12px 14px' }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.gold, marginBottom:4 }}>Total</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'white' }}>{fmt(grandTotal)}</div>
        </div>
        {orderTotal > 0 && (
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:4 }}>Orders ({filteredOrders.length})</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:C.navy }}>{fmt(orderTotal)}</div>
            {balanceTotal > 0 && <div style={{ fontSize:11, color:C.danger, marginTop:2 }}>{fmt(balanceTotal)} owed</div>}
          </div>
        )}
        {salesTotal > 0 && (
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:4 }}>Quick Sales ({filteredSales.length})</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'#0891b2' }}>{fmt(salesTotal)}</div>
          </div>
        )}
        {repairTotal > 0 && (
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:4 }}>Repairs ({filteredRepairs.length})</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'#7c3aed' }}>{fmt(repairTotal)}</div>
          </div>
        )}
      </div>

      {/* Search */}
      <input value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="🔍 Search by name, number, frame..."
        style={{ padding:'10px 14px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13,
          fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy, width:'100%',
          marginBottom:14, boxSizing:'border-box' }}/>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, marginBottom:16,
        background:'white', borderRadius:'12px 12px 0 0', overflowX:'auto' }}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{ padding:'11px 16px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none',
              border:'none', fontFamily:'inherit', whiteSpace:'nowrap',
              color:tab===t.key?C.navy:C.muted,
              borderBottom:`2.5px solid ${tab===t.key?C.gold:'transparent'}`,
              marginBottom:-1, display:'flex', alignItems:'center', gap:6 }}>
            {t.label}
            <span style={{ background:tab===t.key?C.navy:C.cream, color:tab===t.key?'white':C.muted,
              fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20 }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>Loading...</div>}

      {!loading && (
        <div>

          {/* ORDERS */}
          {(tab==='all' || tab==='orders') && filteredOrders.length > 0 && (
            <div style={{ marginBottom:20 }}>
              {tab==='all' && <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                📋 Orders <span style={{ fontSize:11, color:C.muted, fontWeight:400 }}>{filteredOrders.length} records · {fmt(orderTotal)}</span>
              </div>}
              {filteredOrders.map(o => {
                const sc = STATUS_COLOR[o.status] || { bg:C.cream, color:C.muted };
                return (
                  <div key={o.id} onClick={()=>navigate('/orders')}
                    style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12,
                      padding:'12px 16px', marginBottom:8, cursor:'pointer', transition:'border-color .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                          <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>{o.order_number}</span>
                          <span style={{ background:sc.bg, color:sc.color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                            {o.status}
                          </span>
                          {parseFloat(o.balance_amount) > 0 && (
                            <span style={{ background:'#fee2e2', color:C.danger, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                              Balance: {fmt(o.balance_amount)}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:2 }}>{o.customer_name}</div>
                        <div style={{ fontSize:12, color:C.muted }}>
                          {o.frame && <span>{o.frame} · </span>}
                          {o.lens_type && <span>{o.lens_type} · </span>}
                          <span>{fmtDate(o.created_at)}</span>
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:C.navy }}>
                          {fmt(o.total_amount)}
                        </div>
                        <div style={{ fontSize:11, color:C.success }}>
                          Paid: {fmt(o.advance_amount)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* QUICK SALES */}
          {(tab==='all' || tab==='sales') && filteredSales.length > 0 && (
            <div style={{ marginBottom:20 }}>
              {tab==='all' && <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                ⚡ Quick Sales <span style={{ fontSize:11, color:C.muted, fontWeight:400 }}>{filteredSales.length} records · {fmt(salesTotal)}</span>
              </div>}
              {filteredSales.map(s => {
                let items = [];
                try { items = typeof s.items === 'string' ? JSON.parse(s.items) : s.items || []; } catch(e) {}
                return (
                  <div key={s.id} onClick={()=>navigate('/quick-sale')}
                    style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12,
                      padding:'12px 16px', marginBottom:8, cursor:'pointer', transition:'border-color .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='#0891b2'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>{s.sale_number}</span>
                          <span style={{ background:'#e0f2fe', color:'#0369a1', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                            {s.payment_method||'cash'}
                          </span>
                        </div>
                        <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:2 }}>
                          {s.customer_name || 'Walk-in'}
                        </div>
                        <div style={{ fontSize:12, color:C.muted }}>
                          {items.slice(0,3).map(i=>i.name).join(', ')}
                          {items.length > 3 && ` +${items.length-3} more`}
                          {' · '}{fmtDate(s.created_at)}
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:'#0891b2' }}>
                          {fmt(s.total)}
                        </div>
                        {parseFloat(s.discount||0) > 0 && (
                          <div style={{ fontSize:11, color:C.danger }}>-{fmt(s.discount)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* REPAIRS */}
          {(tab==='all' || tab==='repairs') && filteredRepairs.length > 0 && (
            <div style={{ marginBottom:20 }}>
              {tab==='all' && <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                🔧 Repairs <span style={{ fontSize:11, color:C.muted, fontWeight:400 }}>{filteredRepairs.length} records · {fmt(repairTotal)}</span>
              </div>}
              {filteredRepairs.map(r => {
                const sc = STATUS_COLOR[r.status] || { bg:C.cream, color:C.muted };
                return (
                  <div key={r.id} onClick={()=>navigate('/repairs')}
                    style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12,
                      padding:'12px 16px', marginBottom:8, cursor:'pointer', transition:'border-color .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='#7c3aed'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                          <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>{r.repair_number}</span>
                          <span style={{ background:sc.bg, color:sc.color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                            {r.status}
                          </span>
                        </div>
                        <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:2 }}>
                          {r.customer_name || 'Walk-in'}
                        </div>
                        <div style={{ fontSize:12, color:C.muted }}>
                          {r.repair_type}{r.description ? ' · ' + r.description.slice(0,40) : ''}
                          {' · '}{fmtDate(r.created_at)}
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:'#7c3aed' }}>
                          {parseFloat(r.charge) > 0 ? fmt(r.charge) : 'Free'}
                        </div>
                        {r.phone && <div style={{ fontSize:11, color:C.muted }}>📞 {r.phone}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {filteredOrders.length === 0 && filteredSales.length === 0 && filteredRepairs.length === 0 && (
            <div style={{ textAlign:'center', padding:60, color:C.muted }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
              <div style={{ fontSize:15, fontWeight:600, color:C.navy, marginBottom:6 }}>No records found</div>
              <div style={{ fontSize:13 }}>No {viewMode === 'balance' ? 'outstanding balances' : 'activity'} to show</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}