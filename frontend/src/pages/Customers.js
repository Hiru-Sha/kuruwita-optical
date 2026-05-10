// ============================================================
//  Customers.js — Fixed: fetches full profile on click,
//  shows orders/refraction/comms correctly
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { getCustomers, getCustomer, addCommLog, updateOrder } from '../api';

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

export default function Customers() {
  const [customers, setCusts]   = useState([]);
  const [search,    setSearch]  = useState('');
  const [filter,    setFilter]  = useState('all');
  const [loading,   setLoading] = useState(true);

  // Detail panel
  const [selected,    setSelected]    = useState(null);  // full profile from API
  const [loadingCust, setLoadingCust] = useState(false);
  const [tab,         setTab]         = useState('orders');
  const [commNote,    setCommNote]    = useState('');
  const [commType,    setCommType]    = useState('call');
  const [addingComm,  setAddingComm]  = useState(false);

  // ── Load customer list ──────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    getCustomers({ search: search || undefined })
      .then(r => setCusts(r.data))
      .catch(() => setCusts([]))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  // ── Open full customer profile ──────────────────────────────
  // FIX: was using setSelected(c) with list data — never fetched full profile
  const openCustomer = async (id) => {
    setLoadingCust(true);
    setSelected({ id, _loading: true }); // show panel immediately
    setTab('orders');
    try {
      const r = await getCustomer(id);
      setSelected(r.data);
    } catch {
      setSelected(null);
    } finally {
      setLoadingCust(false);
    }
  };

  // ── Filter ──────────────────────────────────────────────────
  const filtered = customers.filter(c => {
    if (filter === 'balance') return parseFloat(c.total_balance) > 0;
    if (filter === 'rx')      return c.rx_held;
    return true;
  });

  // ── Add communication log ───────────────────────────────────
  const handleAddComm = async () => {
    if (!commNote.trim() || !selected) return;
    setAddingComm(true);
    try {
      await addCommLog(selected.id, { type: commType, note: commNote });
      setCommNote('');
      // Refresh full profile to show new log
      const r = await getCustomer(selected.id);
      setSelected(r.data);
    } catch { /* silent */ }
    finally { setAddingComm(false); }
  };

  // ── Mark prescription returned ──────────────────────────────
  const markRxReturned = async () => {
    const order = selected?.orders?.find(o => o.has_rx && !o.rx_returned);
    if (!order) return;
    try {
      await updateOrder(order.id, { rx_returned: true });
      const r = await getCustomer(selected.id);
      setSelected(r.data);
      load();
    } catch { /* silent */ }
  };

  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:navy, margin:'0 0 4px' }}>👥 Customers</h1>
      <p style={{ fontSize:13, color:muted, marginBottom:20 }}>Full profiles, order history and refraction records</p>

      {/* ── Search + filter ── */}
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

      {/* Stats strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:20 }}>
        {[
          { l:'Total Customers', v: customers.length,                                         dark:true },
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

      {/* ── Customer grid ── */}
      {loading
        ? <p style={{ color:muted, fontSize:13 }}>Loading customers...</p>
        : !filtered.length
          ? <p style={{ color:muted, fontSize:13 }}>No customers found</p>
          : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
            {filtered.map(c => (
              <div key={c.id}
                onClick={()=>openCustomer(c.id)}
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

      {/* ══════════════════════════════════════════════════════
          DETAIL PANEL
      ══════════════════════════════════════════════════════ */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.45)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}
          onClick={e=>{ if(e.target===e.currentTarget) setSelected(null); }}>
          <div style={{ background:'white', width:'100%', maxWidth:520, height:'100vh', overflowY:'auto', boxShadow:'-8px 0 40px rgba(0,0,0,.18)' }}>

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
                      Age {selected.age||'—'} · 📞 {selected.phone}{selected.address ? ' · '+selected.address : ''}
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
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

            {/* Inner tabs */}
            {!loadingCust && (
              <>
                <div style={{ display:'flex', borderBottom:`1px solid ${border}`, padding:'0 20px', overflowX:'auto' }}>
                  {['orders','refraction','communication','profile'].map(t => (
                    <button key={t} onClick={()=>setTab(t)}
                      style={{ padding:'12px 14px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', color:tab===t?navy:muted, borderBottom:`2.5px solid ${tab===t?gold:'transparent'}`, marginBottom:-1 }}>
                      {t.charAt(0).toUpperCase()+t.slice(1)}
                      {t==='orders' && selected.orders?.length ? ` (${selected.orders.length})` : ''}
                      {t==='refraction' && selected.refractions?.length ? ` (${selected.refractions.length})` : ''}
                    </button>
                  ))}
                </div>

                <div style={{ padding:20 }}>

                  {/* ── Orders tab ── */}
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

                  {/* ── Refraction tab ── */}
                  {tab==='refraction' && (
                    !selected.refractions?.length
                      ? <p style={{ color:muted, fontSize:13 }}>No refraction records yet</p>
                      : selected.refractions.map((r,i) => (
                        <div key={i} style={{ background:cream, borderRadius:10, padding:14, marginBottom:12 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                            <span style={{ fontSize:12, fontWeight:700, color:navy }}>
                              📅 {new Date(r.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
                            </span>
                            <span style={{ fontSize:11, color:muted }}>Order #{r.order_id}</span>
                          </div>
                          <div style={{ overflowX:'auto' }}>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                              <thead>
                                <tr>{['Eye','SPH','CYL','AXIS','ADD','VA'].map(h=>(
                                  <th key={h} style={{ background:'#ede9e0', padding:'6px 8px', textAlign:'center', fontSize:10, fontWeight:700, textTransform:'uppercase', border:`1px solid ${border}` }}>{h}</th>
                                ))}</tr>
                              </thead>
                              <tbody>
                                {[
                                  ['Right',r.r_sph,r.r_cyl,r.r_axis,r.r_add,r.r_va],
                                  ['Left', r.l_sph,r.l_cyl,r.l_axis,r.l_add,r.l_va],
                                ].map(row=>(
                                  <tr key={row[0]}>
                                    {row.map((v,idx)=>(
                                      <td key={idx} style={{ padding:'6px 8px', textAlign:'center', border:`1px solid ${border}`, fontWeight:idx===0?700:400, color:idx===0?navy:'#1a1a2e', background:idx===0?'#ede9e0':'white' }}>{v||'—'}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {r.notes && <div style={{ fontSize:12, color:muted, marginTop:8, fontStyle:'italic' }}>💬 {r.notes}</div>}
                        </div>
                      ))
                  )}

                  {/* ── Communication tab ── */}
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
                                <div style={{ fontSize:11, color:'#9ca3af' }}>{new Date(c.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>
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

                  {/* ── Profile tab ── */}
                  {tab==='profile' && (
                    <>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                        {[
                          { l:'Phone',        v: selected.phone },
                          { l:'Age',          v: selected.age ? selected.age+' years' : '—' },
                          { l:'Address',      v: selected.address||'—' },
                          { l:'Total orders', v: selected.orders?.length||0 },
                          { l:'Total spent',  v:`Rs. ${selected.orders?.reduce((s,o)=>s+parseFloat(o.total_amount||0),0).toLocaleString()||0}` },
                          { l:'Balance due',  v:`Rs. ${selected.orders?.reduce((s,o)=>s+parseFloat(o.balance_amount||0),0).toLocaleString()||0}` },
                        ].map(item=>(
                          <div key={item.l} style={{ background:cream, borderRadius:8, padding:'10px 12px' }}>
                            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:3 }}>{item.l}</div>
                            <div style={{ fontSize:13, fontWeight:600, color:'#1a1a2e' }}>{item.v}</div>
                          </div>
                        ))}
                      </div>

                      {/* Prescription held */}
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
