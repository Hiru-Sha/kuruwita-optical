/* eslint-disable */
// ============================================================
//  Customers.js — With improved refraction history tab
//  Shows all past prescriptions, comparison, power trend
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { getCustomers, getCustomer, addCommLog, updateOrder, updateCustomer } from '../api';

const navy  = '#0f1f3d';
const gold  = '#c9a84c';
const cream = '#f8f5ef';
const border= '#e0ddd6';
const muted = '#6b7280';
const success='#2d7a4f';
const danger ='#c0392b';

const STATUS_STYLE = {
  created:   { bg:'#dbeafe', color:'#1e40af' },
  called:    { bg:'#fef9c3', color:'#854d0e' },
  delivered: { bg:'#dcfce7', color: success  },
  overdue:   { bg:'#fee2e2', color: danger   },
};

const initials = (name='') => name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
const fmtDate  = (d) => new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});

// ── Parse SPH value to float for trend comparison ────────────
const parsePower = (v) => {
  if (!v || v==='Plano') return 0;
  return parseFloat(v.replace(/[^0-9.-]/g,'')) * (v.startsWith('-')?-1:1) || 0;
};

// ── Power trend indicator ─────────────────────────────────────
const Trend = ({ current, previous, label }) => {
  if (previous === undefined || current === undefined) return null;
  const curr = parsePower(current);
  const prev = parsePower(previous);
  const diff = curr - prev;
  if (Math.abs(diff) < 0.1) return <span style={{ fontSize:10, color:muted }}>→ same</span>;
  const worse = Math.abs(curr) > Math.abs(prev);
  return (
    <span style={{ fontSize:10, color:worse?danger:success, fontWeight:600 }}>
      {diff>0?'↑':'↓'} {Math.abs(diff).toFixed(2)} {worse?'weaker':'stronger'}
    </span>
  );
};

// ── Single refraction record card ─────────────────────────────
function RxCard({ rx, prevRx, orderInfo, isLatest }) {
  const [expanded, setExpanded] = useState(isLatest);

  return (
    <div style={{ border:`1.5px solid ${isLatest?navy:border}`, borderRadius:12, overflow:'hidden', marginBottom:12 }}>
      {/* Card header — always visible */}
      <div
        onClick={()=>setExpanded(e=>!e)}
        style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', background:isLatest?navy:cream, cursor:'pointer' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {isLatest && <span style={{ background:gold, color:navy, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>Latest</span>}
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:isLatest?'white':navy }}>{fmtDate(rx.created_at)}</div>
            {orderInfo && <div style={{ fontSize:11, color:isLatest?'#ede9e0':muted }}>Order {orderInfo.order_number} · {orderInfo.frame||'—'}</div>}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Quick SPH summary */}
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:isLatest?'#ede9e0':muted }}>
              R: <b style={{color:isLatest?gold:'#1a1a2e'}}>{rx.r_sph||'Plano'}</b>
              &nbsp;&nbsp;L: <b style={{color:isLatest?gold:'#1a1a2e'}}>{rx.l_sph||'Plano'}</b>
            </div>
            {rx.r_cyl && rx.r_cyl!=='0.00' && (
              <div style={{ fontSize:10, color:isLatest?'#ede9e0':muted }}>
                CYL R: {rx.r_cyl} L: {rx.l_cyl}
              </div>
            )}
          </div>
          <span style={{ fontSize:16, color:isLatest?'white':muted }}>{expanded?'▲':'▼'}</span>
        </div>
      </div>

      {/* Expanded prescription table */}
      {expanded && (
        <div style={{ padding:14, background:'white' }}>
          <div style={{ overflowX:'auto', marginBottom:prevRx?12:0 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr>
                  {['Eye','SPH','CYL','AXIS','ADD','VA','PD'].map(h=>(
                    <th key={h} style={{ background:cream, padding:'7px 9px', textAlign:'center', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', border:`1px solid ${border}`, color:muted }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { eye:'Right (R)', sph:rx.r_sph, cyl:rx.r_cyl, axis:rx.r_axis, add:rx.r_add, va:rx.r_va, pd:rx.r_pd },
                  { eye:'Left (L)',  sph:rx.l_sph, cyl:rx.l_cyl, axis:rx.l_axis, add:rx.l_add, va:rx.l_va, pd:rx.l_pd },
                ].map(row=>(
                  <tr key={row.eye}>
                    <td style={{ background:cream, padding:'8px 9px', fontWeight:700, fontSize:12, border:`1px solid ${border}`, color:navy, whiteSpace:'nowrap' }}>{row.eye}</td>
                    {[row.sph, row.cyl, row.axis, row.add, row.va, row.pd].map((v,i)=>(
                      <td key={i} style={{ padding:'8px 9px', textAlign:'center', border:`1px solid ${border}`, fontSize:13, fontWeight:600, color:'#1a1a2e', background:'white' }}>
                        {v||'—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Change vs previous */}
          {prevRx && (
            <div style={{ background:'#f0f9ff', borderRadius:8, padding:'10px 12px', marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#0369a1', marginBottom:6, textTransform:'uppercase', letterSpacing:'.7px' }}>
                Change vs previous
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  {l:'Right SPH',  c:rx.r_sph, p:prevRx.r_sph},
                  {l:'Left SPH',   c:rx.l_sph, p:prevRx.l_sph},
                  {l:'Right CYL',  c:rx.r_cyl, p:prevRx.r_cyl},
                  {l:'Left CYL',   c:rx.l_cyl, p:prevRx.l_cyl},
                ].map(item=>(
                  <div key={item.l} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                    <span style={{ color:muted }}>{item.l}:</span>
                    <span style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <b style={{color:navy}}>{item.c||'Plano'}</b>
                      <Trend current={item.c} previous={item.p}/>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinical notes */}
          {rx.notes && (
            <div style={{ background:'#fef9f0', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#92400e', fontStyle:'italic' }}>
              💬 {rx.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Power trend mini chart ────────────────────────────────────
function PowerTrendChart({ refractions }) {
  if (refractions.length < 2) return null;

  const points = [...refractions].reverse(); // oldest first
  const rSPH   = points.map(r => parsePower(r.r_sph));
  const lSPH   = points.map(r => parsePower(r.l_sph));
  const allVals = [...rSPH, ...lSPH];
  const min    = Math.min(...allVals) - 0.5;
  const max    = Math.max(...allVals) + 0.5;
  const range  = max - min || 1;
  const W      = 340, H = 80, PAD = 20;
  const xStep  = (W - PAD*2) / (points.length - 1);

  const toY = (v) => PAD + ((max - v) / range) * (H - PAD*2);
  const toX = (i) => PAD + i * xStep;

  const linePath = (vals) => vals.map((v,i)=>`${i===0?'M':'L'}${toX(i)},${toY(v)}`).join(' ');

  return (
    <div style={{ background:cream, borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
      <div style={{ fontSize:12, fontWeight:700, color:navy, marginBottom:8 }}>📈 SPH Power trend</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H }}>
        {/* Zero line */}
        {min < 0 && max > 0 && (
          <line x1={PAD} y1={toY(0)} x2={W-PAD} y2={toY(0)} stroke={border} strokeWidth="1" strokeDasharray="3,3"/>
        )}
        {/* Right eye line — navy */}
        <path d={linePath(rSPH)} fill="none" stroke={navy} strokeWidth="2" strokeLinejoin="round"/>
        {rSPH.map((v,i)=><circle key={i} cx={toX(i)} cy={toY(v)} r="3" fill={navy}/>)}
        {/* Left eye line — gold */}
        <path d={linePath(lSPH)} fill="none" stroke={gold} strokeWidth="2" strokeLinejoin="round"/>
        {lSPH.map((v,i)=><circle key={i} cx={toX(i)} cy={toY(v)} r="3" fill={gold}/>)}
        {/* Date labels */}
        {points.map((r,i)=>(
          <text key={i} x={toX(i)} y={H-2} textAnchor="middle" fontSize="9" fill={muted}>
            {new Date(r.created_at).toLocaleDateString('en-GB',{month:'short',year:'2-digit'})}
          </text>
        ))}
      </svg>
      <div style={{ display:'flex', gap:16, marginTop:4, fontSize:11, color:muted }}>
        <span><span style={{ display:'inline-block', width:12, height:3, background:navy, borderRadius:2, marginRight:4, verticalAlign:'middle' }}/>Right eye</span>
        <span><span style={{ display:'inline-block', width:12, height:3, background:gold, borderRadius:2, marginRight:4, verticalAlign:'middle' }}/>Left eye</span>
      </div>
    </div>
  );
}

export default function Customers() {
  const [customers, setCusts]   = useState([]);
  const [search,    setSearch]  = useState('');
  const [filter,    setFilter]  = useState('all');
  const [loading,   setLoading] = useState(true);

  const [selected,    setSelected]    = useState(null);
  const [loadingCust, setLoadingCust] = useState(false);
  const [editMode,   setEditMode]   = useState(false);
  const [editForm,   setEditForm]   = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [tab,         setTab]         = useState('orders');
  const [commNote,    setCommNote]    = useState('');
  const [commType,    setCommType]    = useState('call');
  const [addingComm,  setAddingComm]  = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getCustomers({ search: search || undefined })
      .then(r => setCusts(r.data))
      .catch(() => setCusts([]))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);


  const openCustomer = async (id) => {
    setLoadingCust(true);
    setSelected({ id, _loading: true, name:'Loading...' });
    setTab('orders');
    setRxOrders([]);
    try {
      // Try axios getCustomer first
      let cust, orders, refractions;
      try {
        const r = await getCustomer(id);
        cust        = r?.data?.data || r?.data || r;
        orders      = r?.data?.orders      || r?.orders      || [];
        refractions = r?.data?.refractions || r?.refractions || [];
      } catch(axiosErr) {
        // Fallback: direct fetch
        const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('ko_token');
        const res   = await fetch(`${BASE}/customers/${id}`, { headers:{ Authorization:`Bearer ${token}` } });
        const json  = await res.json();
        cust        = json?.data || json;
        orders      = json?.orders      || [];
        refractions = json?.refractions || [];
      }
      if (!cust?.id) throw new Error('No customer data');
      setSelected({ ...cust, orders, refractions });
    } catch(e) {
      console.error('openCustomer error:', e);
      // Don't close — show error state
      setSelected(s => ({ ...s, _loading: false, _error: e.message }));
    }
    finally { setLoadingCust(false); }
  };

  const filtered = customers.filter(c => {
    if (filter === 'balance') return parseFloat(c.total_balance) > 0;
    if (filter === 'rx')      return c.rx_held;
    return true;
  });

  const handleAddComm = async () => {
    if (!commNote.trim() || !selected) return;
    setAddingComm(true);
    try {
      await addCommLog(selected.id, { type: commType, note: commNote });
      setCommNote('');
      const r = await getCustomer(selected.id);
      const cust   = r?.data?.data || r?.data || r;
      const orders = r?.data?.orders || r?.orders || [];
      const refractions = r?.data?.refractions || r?.refractions || [];
      setSelected({ ...cust, orders, refractions });
    } catch {}
    finally { setAddingComm(false); }
  };

  const markRxReturned = async () => {
    const order = selected?.orders?.find(o => o.has_rx && !o.rx_returned);
    if (!order) return;
    try {
      await updateOrder(order.id, { rx_returned: true });
      const r = await getCustomer(selected.id);
      const cust   = r?.data?.data || r?.data || r;
      const orders = r?.data?.orders || r?.orders || [];
      const refractions = r?.data?.refractions || r?.refractions || [];
      setSelected({ ...cust, orders, refractions });
      load();
    } catch {}
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:navy, margin:'0 0 4px' }}>👥 Customers</h1>
      <p style={{ fontSize:13, color:muted, marginBottom:20 }}>Full profiles, order history and refraction records</p>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍  Search by name or phone..."
          style={{ flex:1, minWidth:180, padding:'9px 14px', border:`1.5px solid ${border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}
        />
        {[['all','All'],['balance','💰 Balance Due'],['rx','📄 Rx Held']].map(([f,l]) => (
          <button key={f} onClick={()=>setFilter(f)}
            style={{ padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:`1.5px solid ${filter===f?navy:border}`, fontFamily:'inherit', background:filter===f?navy:'white', color:filter===f?'white':muted }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:20 }}>
        {[
          { l:'Total Customers', v: customers.length,                                          dark:true },
          { l:'Balance Due',     v: customers.filter(c=>parseFloat(c.total_balance)>0).length, c:danger  },
          { l:'Rx Held',         v: customers.filter(c=>c.rx_held).length,                    c:'#0369a1'},
          { l:'Total Spent',     v:`Rs.${Math.round(customers.reduce((s,c)=>s+parseFloat(c.total_spent||0),0)/1000)}K`, c:success},
        ].map(s=>(
          <div key={s.l} style={{ background:s.dark?navy:'white', border:`1px solid ${border}`, borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:s.dark?gold:muted, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:s.dark?'white':s.c||navy }}>{s.v}</div>
          </div>
        ))}
      </div>

      {loading
        ? <p style={{ color:muted, fontSize:13 }}>Loading customers...</p>
        : !filtered.length
          ? <p style={{ color:muted, fontSize:13 }}>No customers found</p>
          : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
            {filtered.map(c => (
              <div key={c.id} onClick={()=>openCustomer(c.id)}
                style={{ background:'white', border:`1.5px solid ${c.rx_held?'#fde68a':border}`, borderRadius:14, padding:18, cursor:'pointer', transition:'all .15s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=gold}
                onMouseLeave={e=>e.currentTarget.style.borderColor=c.rx_held?'#fde68a':border}>

                <div style={{ display:'flex', gap:12, marginBottom:10 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:navy, display:'flex', alignItems:'center', justifyContent:'center', color:'#e8c96a', fontSize:16, fontWeight:700, flexShrink:0 }}>
                    {initials(c.name)}
                  </div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:navy }}>{c.name}</div>
                    <div style={{ fontSize:12, color:muted }}>Age {c.age||'—'} · 📞 {c.phone}</div>
                  </div>
                </div>

                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                  <span style={{ background:'#dbeafe', color:'#1e40af', fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>{c.total_orders} orders</span>
                  {parseFloat(c.total_balance)>0
                    ? <span style={{ background:'#fee2e2', color:danger, fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>Balance Due</span>
                    : <span style={{ background:'#dcfce7', color:success, fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>Paid Up</span>
                  }
                  {c.rx_held && <span style={{ background:'#e0f2fe', color:'#0369a1', fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>📄 Rx Held</span>}
                </div>

                <div style={{ fontSize:12, color:muted, marginBottom:12 }}>
                  Total spent: <b style={{color:navy}}>Rs. {parseFloat(c.total_spent||0).toLocaleString()}</b>
                </div>

                <div style={{ display:'flex', gap:7 }}>
                  <a onClick={e=>e.stopPropagation()}
                    href={`https://wa.me/94${c.phone?.replace(/^0/,'')}?text=${encodeURIComponent(`Hello ${c.name}, this is Kuruwita Optical. `)}`}
                    target="_blank" rel="noreferrer"
                    style={{ padding:'6px 12px', background:'#25D366', color:'white', borderRadius:7, fontSize:12, fontWeight:700, textDecoration:'none' }}>
                    💬 WA
                  </a>
                  <button onClick={e=>{e.stopPropagation();openCustomer(c.id);}}
                    style={{ padding:'6px 12px', background:navy, color:'white', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    View Profile →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {/* ══════════════ DETAIL PANEL ══════════════════════════ */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.45)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}
          onClick={e=>{ if(e.target===e.currentTarget) setSelected(null); }}>
          <div style={{ background:'white', width:'100%', maxWidth:540, height:'100vh', overflowY:'auto', boxShadow:'-8px 0 40px rgba(0,0,0,.18)' }}>

            {/* Panel header */}
            <div style={{ background:navy, padding:'22px 22px 18px', position:'relative' }}>
              <button onClick={()=>setSelected(null)} style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,.15)', border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600, color:'white' }}>✕</button>

              {loadingCust
                ? <div style={{ color:'white', fontSize:14, padding:'20px 0' }}>Loading profile...</div>
                : <>
                    <div style={{ width:48, height:48, borderRadius:'50%', background:gold, display:'flex', alignItems:'center', justifyContent:'center', color:navy, fontSize:20, fontWeight:700, marginBottom:10 }}>
                      {initials(selected.name)}
                    </div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'white', marginBottom:3 }}>{selected.name}</div>
                    <div style={{ fontSize:13, color:'#ede9e0', marginBottom:14 }}>
                      Age {selected.age||'—'} · 📞 {selected.phone}
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      <a href={`https://wa.me/94${selected.phone?.replace(/^0/,'')}?text=${encodeURIComponent(`Hello ${selected.name}, this is Kuruwita Optical. `)}`}
                        target="_blank" rel="noreferrer"
                        style={{ padding:'8px 14px', background:'#25D366', color:'white', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none' }}>
                        💬 WhatsApp
                      </a>
                      <a href={`tel:${selected.phone}`}
                        style={{ padding:'8px 14px', background:'rgba(255,255,255,.15)', color:'white', border:'1px solid rgba(255,255,255,.3)', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none' }}>
                        📞 Call
                      </a>
                    </div>
                  </>
              }
            </div>

            {!loadingCust && (
              <>
                {/* Tabs */}
                <div style={{ display:'flex', borderBottom:`1px solid ${border}`, padding:'0 20px', overflowX:'auto' }}>
                  {[
                    { key:'orders',        label:'Orders',      count: selected.orders?.length },
                    { key:'refraction',    label:'👁️ Refraction', count: selected.refractions?.length||0 },
                    { key:'communication', label:'Comms',        count: null },
                    { key:'profile',       label:'Profile',      count: null },
                  ].map(t => (
                    <button key={t.key} onClick={()=>setTab(t.key)}
                      style={{ padding:'12px 14px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', color:tab===t.key?navy:muted, borderBottom:`2.5px solid ${tab===t.key?gold:'transparent'}`, marginBottom:-1 }}>
                      {t.label}{t.count ? ` (${t.count})` : ''}
                    </button>
                  ))}
                </div>

                <div style={{ padding:20 }}>

                  {/* ── ORDERS TAB ── */}
                  {tab==='orders' && (
                    !selected.orders?.length
                      ? <p style={{ color:muted, fontSize:13 }}>No orders yet</p>
                      : selected.orders.map(o => {
                          const st = STATUS_STYLE[o.status] || { bg:'#f3f4f6', color:muted };
                          return (
                            <div key={o.id} style={{ background:cream, borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                                <span style={{ fontSize:12, fontWeight:700, color:muted }}>{o.order_number}</span>
                                <span style={{ background:st.bg, color:st.color, fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>{o.status}</span>
                              </div>
                              <div style={{ fontSize:14, fontWeight:600, color:navy, marginBottom:4 }}>{o.frame||'—'}</div>
                              <div style={{ fontSize:12, color:muted }}>
                                {o.lens_type} · {o.lens_company||'—'} ·{' '}
                                <span style={{ color:parseFloat(o.balance_amount)>0?danger:success, fontWeight:700 }}>
                                  {parseFloat(o.balance_amount)>0?`Rs. ${parseFloat(o.balance_amount).toLocaleString()} owed`:'Paid ✓'}
                                </span>
                              </div>
                              {o.deliver_date && <div style={{ fontSize:11, color:muted, marginTop:3 }}>Deliver: {o.deliver_date?.slice(0,10)}</div>}
                            </div>
                          );
                        })
                  )}

                  {/* ── REFRACTION HISTORY TAB ── */}
                  {tab==='refraction' && (
                    <>
                      {false ? (
                        <div style={{ textAlign:'center', padding:32, color:muted }}>⏳ Loading refraction records...</div>
                      ) : !selected.refractions?.length||0 ? (
                        <div style={{ textAlign:'center', padding:'32px 0', color:muted }}>
                          <div style={{ fontSize:36, marginBottom:12 }}>👁️</div>
                          <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>No refraction records yet</div>
                          <div style={{ fontSize:13 }}>Records are saved automatically when a new order is created with refraction data</div>
                        </div>
                      ) : (
                        <>
                          {/* Summary banner */}
                          <div style={{ background:navy, borderRadius:12, padding:'14px 16px', marginBottom:16, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, textAlign:'center' }}>
                            <div>
                              <div style={{ fontSize:10, color:gold, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', marginBottom:3 }}>Total Records</div>
                              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'white', fontWeight:700 }}>{selected.refractions?.length||0}</div>
                            </div>
                            <div>
                              <div style={{ fontSize:10, color:gold, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', marginBottom:3 }}>Latest Right</div>
                              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:'white', fontWeight:700 }}>
                                {selected.refractions?.[0]?.r_sph||'Plano'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize:10, color:gold, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', marginBottom:3 }}>Latest Left</div>
                              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:'white', fontWeight:700 }}>
                                {selected.refractions?.[0]?.l_sph||'Plano'}
                              </div>
                            </div>
                          </div>

                          {/* Use Rx for New Order */}
                          {selected.refractions?.length||0 > 0 && (
                            <div style={{ background:'#eff6ff', border:'1px solid #bae6fd', borderRadius:10, padding:'11px 14px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <div>
                                <div style={{ fontSize:13, fontWeight:700, color:'#1e40af' }}>📋 Latest Rx on file</div>
                                <div style={{ fontSize:11, color:'#2563eb', marginTop:2 }}>
                                  R: {selected.refractions?.[0]?.r_sph||'Plano'} / {selected.refractions?.[0]?.r_cyl||'0'} × {selected.refractions?.[0]?.r_axis||'0'} &nbsp;|&nbsp;
                                  L: {selected.refractions?.[0]?.l_sph||'Plano'} / {selected.refractions?.[0]?.l_cyl||'0'} × {selected.refractions?.[0]?.l_axis||'0'}
                                </div>
                              </div>
                              <button onClick={()=>{
                                const rx = selected.refractions[0];
                                const params = new URLSearchParams({
                                  customer_id:   selected?.id,
                                  customer_name: selected?.name,
                                  r_sph: rx.r_sph||'', r_cyl: rx.r_cyl||'', r_axis: rx.r_axis||'', r_add: rx.r_add||'', r_pd: rx.r_pd||'',
                                  l_sph: rx.l_sph||'', l_cyl: rx.l_cyl||'', l_axis: rx.l_axis||'', l_add: rx.l_add||'', l_pd: rx.l_pd||'',
                                });
                                window.location.href = '/orders/new?' + params.toString();
                              }}
                                style={{ padding:'8px 16px', background:'#1e40af', color:'white', border:'none', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                                ➕ New Order with this Rx
                              </button>
                            </div>
                          )}

                          {/* Power trend chart — only if 2+ records */}
                          <PowerTrendChart refractions={selected.refractions||[]}/>

                          {/* Individual records — latest first, expanded by default */}
                          {selected.refractions.map((rx, i) => {
                            const prevRx   = selected.refractions[i+1] || null;
                            const orderInfo= selected.orders?.find(o=>o.id===rx.order_id);
                            return (
                              <RxCard
                                key={rx.id || i}
                                rx={rx}
                                prevRx={prevRx}
                                orderInfo={orderInfo}
                                isLatest={i===0}
                              />
                            );
                          })}
                        </>
                      )}
                    </>
                  )}

                  {/* ── COMMUNICATION TAB ── */}
                  {tab==='communication' && (
                    <>
                      <div style={{ marginBottom:14 }}>
                        {!selected.comm_logs?.length
                          ? <p style={{ fontSize:13, color:muted }}>No communication logged yet</p>
                          : selected.comm_logs.map((c,i) => (
                            <div key={i} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:`1px solid ${cream}` }}>
                              <div style={{ width:30, height:30, borderRadius:'50%', background:c.type==='wa'?'#dcfce7':c.type==='call'?'#dbeafe':'#f8f5ef', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                                {c.type==='wa'?'💬':c.type==='call'?'📞':'📝'}
                              </div>
                              <div>
                                <div style={{ fontSize:13, color:'#1a1a2e', fontWeight:500 }}>{c.note}</div>
                                <div style={{ fontSize:11, color:'#9ca3af' }}>{fmtDate(c.created_at)}</div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <select value={commType} onChange={e=>setCommType(e.target.value)}
                          style={{ padding:'8px 10px', border:`1.5px solid ${border}`, borderRadius:8, fontSize:13, fontFamily:'inherit', background:cream, outline:'none' }}>
                          <option value="call">📞 Call</option>
                          <option value="wa">💬 WhatsApp</option>
                          <option value="note">📝 Note</option>
                        </select>
                        <input value={commNote} onChange={e=>setCommNote(e.target.value)}
                          placeholder="Add a note..." onKeyDown={e=>e.key==='Enter'&&handleAddComm()}
                          style={{ flex:1, padding:'8px 12px', border:`1.5px solid ${border}`, borderRadius:8, fontSize:13, fontFamily:'inherit', background:cream, outline:'none' }}/>
                        <button onClick={handleAddComm} disabled={addingComm}
                          style={{ padding:'8px 14px', background:navy, color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                          {addingComm?'…':'Add'}
                        </button>
                      </div>
                    </>
                  )}

                  {/* ── PROFILE TAB ── */}
                  {tab==='profile' && (
                    <>
                      {/* Edit toggle */}
                      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
                        {!editMode
                          ? <button onClick={()=>{ setEditForm({ name:selected.name||'', phone:selected.phone||'', age:selected.age||'', address:selected.address||'', email:selected.email||'' }); setEditMode(true); }}
                              style={{ padding:'7px 16px', background:navy, color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                              ✏️ Edit Details
                            </button>
                          : <div style={{ display:'flex', gap:8 }}>
                              <button onClick={async()=>{
                                setSavingEdit(true);
                                try {
                                  await updateCustomer(selected.id, editForm);
                                  const r = await getCustomer(selected.id);
                                  const cust = r?.data?.data || r?.data || r;
                                  const orders = r?.data?.orders || r?.orders || [];
                                  const refractions = r?.data?.refractions || r?.refractions || [];
                                  setSelected({...cust, orders, refractions});
                                  setEditMode(false);
                                  load();
                                } catch(e){ alert('Failed to save'); }
                                finally { setSavingEdit(false); }
                              }} disabled={savingEdit}
                                style={{ padding:'7px 16px', background:savingEdit?muted:'#2d7a4f', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                                {savingEdit?'⏳ Saving...':'💾 Save'}
                              </button>
                              <button onClick={()=>setEditMode(false)}
                                style={{ padding:'7px 14px', background:cream, border:`1.5px solid ${border}`, borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:muted }}>
                                Cancel
                              </button>
                            </div>
                        }
                      </div>

                      {editMode ? (
                        /* ── Edit form ── */
                        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                          {[
                            { l:'Full Name',    k:'name',    type:'text',  ph:'Customer name' },
                            { l:'Phone',        k:'phone',   type:'tel',   ph:'07X XXX XXXX' },
                            { l:'Age',          k:'age',     type:'number',ph:'e.g. 35' },
                            { l:'Address',      k:'address', type:'text',  ph:'Street, City' },
                            { l:'Email',        k:'email',   type:'email', ph:'optional' },
                          ].map(f=>(
                            <div key={f.k}>
                              <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, display:'block', marginBottom:4 }}>{f.l}</label>
                              <input type={f.type} value={editForm[f.k]||''} onChange={e=>setEditForm(ef=>({...ef,[f.k]:e.target.value}))}
                                placeholder={f.ph}
                                style={{ width:'100%', padding:'9px 12px', border:`1.5px solid ${border}`, borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:cream, color:navy, boxSizing:'border-box' }}/>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* ── View mode ── */
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                          {[
                            { l:'Phone',        v: selected.phone||'—' },
                            { l:'Age',          v: selected.age ? selected.age+' years' : '—' },
                            { l:'Address',      v: selected.address||'—' },
                            { l:'Email',        v: selected.email||'—' },
                            { l:'Total orders', v: selected.orders?.length||0 },
                            { l:'Total spent',  v:`Rs. ${selected.orders?.reduce((s,o)=>s+parseFloat(o.total_amount||0),0).toLocaleString()||0}` },
                            { l:'Balance due',  v:`Rs. ${selected.orders?.reduce((s,o)=>s+parseFloat(o.balance_amount||0),0).toLocaleString()||0}` },
                            { l:'Rx records',   v: selected.refractions?.length||0||0 },
                          ].map(item=>(
                            <div key={item.l} style={{ background:cream, borderRadius:8, padding:'10px 12px' }}>
                              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:3 }}>{item.l}</div>
                              <div style={{ fontSize:13, fontWeight:600, color:'#1a1a2e' }}>{item.v}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {selected.orders?.some(o=>o.has_rx&&!o.rx_returned) && (
                        <div style={{ background:'#e0f2fe', borderRadius:10, padding:'12px 14px' }}>
                          <div style={{ fontSize:13, color:'#0369a1', fontWeight:700, marginBottom:6 }}>
                            📄 Prescription held from {selected.orders.find(o=>o.has_rx&&!o.rx_returned)?.rx_hospital||'hospital'}
                          </div>
                          <button onClick={markRxReturned}
                            style={{ background:'#0369a1', color:'white', border:'none', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                            Mark as Returned to Customer
                          </button>
                        </div>
                      )}
                    </>
                  )}

                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}