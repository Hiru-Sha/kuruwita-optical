// ============================================================
//  Reports.js — Fully connected to live data
//  Revenue trends, lens jobs, top sellers, monthly breakdown
// ============================================================
import React, { useEffect, useState } from 'react';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b' };
const fmtMoney = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const thisMonth = () => new Date().toISOString().slice(0,7);

function api(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json());
}

// ── Simple bar chart ─────────────────────────────────────────
function BarChart({ data, valueKey='total', labelKey='month', color=C.navy, height=160 }) {
  if (!data?.length) return <div style={{ color:C.muted, fontSize:13, padding:20, textAlign:'center' }}>No data</div>;
  const max = Math.max(...data.map(d=>parseFloat(d[valueKey])||0), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height, padding:'0 4px' }}>
      {data.map((d,i)=>{
        const val = parseFloat(d[valueKey])||0;
        const pct = val/max*100;
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>
              {val>=1000 ? `${Math.round(val/1000)}K` : Math.round(val)}
            </div>
            <div style={{ width:'100%', background:color, borderRadius:'4px 4px 0 0', height:`${Math.max(pct,2)}%`, minHeight:2, transition:'height .3s' }}/>
            <div style={{ fontSize:9, color:C.muted, textAlign:'center', lineHeight:1.2 }}>{d[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Reports() {
  const [month,     setMonth]    = useState(thisMonth());
  const [revenue,   setRevenue]  = useState(null);
  const [topSellers,setTop]      = useState(null);
  const [lensJobs,  setLensJobs] = useState(null);
  const [loading,   setLoading]  = useState(true);
  const [activeTab, setActiveTab]= useState('revenue');

  useEffect(()=>{
    setLoading(true);
    Promise.all([
      api(`/reports/revenue?month=${month}`),
      api('/reports/topsellers'),
      api('/reports/lensjobs'),
    ]).then(([rev, top, jobs])=>{
      setRevenue(rev);
      setTop(top);
      setLensJobs(jobs);
    }).catch(console.error)
    .finally(()=>setLoading(false));
  },[month]);

  const TABS = [
    { key:'revenue',   label:'📊 Revenue'    },
    { key:'lensjobs',  label:'🔬 Lens Jobs'   },
    { key:'topsellers',label:'🏆 Top Sellers' },
  ];

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>📊 Reports</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Revenue, lens jobs, and top selling frames</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <label style={{ fontSize:12, color:C.muted, fontWeight:600 }}>Month:</label>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
            style={{ padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy }}/>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:`1px solid ${C.border}`, marginBottom:20, background:'white', borderRadius:'12px 12px 0 0', padding:'0 4px' }}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)}
            style={{ padding:'12px 20px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', color:activeTab===t.key?C.navy:C.muted, borderBottom:`2.5px solid ${activeTab===t.key?C.gold:'transparent'}`, marginBottom:-1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>Loading reports...</div>}

      {/* ── REVENUE TAB ── */}
      {!loading && activeTab==='revenue' && (
        <div>
          {/* Summary cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
            {[
              { l:'Total Billed',   v:fmtMoney(revenue?.summary?.total),     c:C.navy    },
              { l:'Collected',      v:fmtMoney(revenue?.summary?.collected), c:C.success },
              { l:'Still Owed',     v:fmtMoney(revenue?.summary?.owed),      c:C.danger  },
              { l:'Orders',         v:revenue?.summary?.order_count||0,      c:'#2563eb' },
            ].map(s=>(
              <div key={s.l} style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'16px 18px' }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:6 }}>{s.l}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* 6 month trend */}
          {revenue?.trend?.length > 0 && (
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:16 }}>6-Month Revenue Trend</div>
              <BarChart data={revenue.trend} valueKey="total" labelKey="month" color={C.navy} height={160}/>
              <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap' }}>
                {revenue.trend.map((t,i)=>(
                  <div key={i} style={{ fontSize:12, color:C.muted }}>
                    <b style={{color:C.navy}}>{t.month}</b>: {fmtMoney(t.total)} · {t.order_count} orders
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders list for this month */}
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>Orders this month</span>
              <span style={{ fontSize:13, color:C.muted }}>{revenue?.orders?.length||0} orders</span>
            </div>
            {!revenue?.orders?.length
              ? <div style={{ padding:24, textAlign:'center', color:C.muted, fontSize:13 }}>No orders this month</div>
              : <div style={{ maxHeight:400, overflowY:'auto' }}>
                  {revenue.orders.map(o=>(
                    <div key={o.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 18px', borderBottom:`1px solid ${C.cream}` }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{o.customer_name}</div>
                        <div style={{ fontSize:11, color:C.muted }}>{o.order_number} · {o.frame||'—'} · {new Date(o.created_at).toLocaleDateString('en-GB')}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{fmtMoney(o.total_amount)}</div>
                        {parseFloat(o.balance_amount)>0
                          ? <div style={{ fontSize:11, color:C.danger }}>Balance: {fmtMoney(o.balance_amount)}</div>
                          : <div style={{ fontSize:11, color:C.success }}>Paid ✓</div>
                        }
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      )}

      {/* ── LENS JOBS TAB ── */}
      {!loading && activeTab==='lensjobs' && (
        <div>
          {/* Summary by lab */}
          {(() => {
            const byLab = (lensJobs||[]).reduce((acc,o)=>{
              const lab = o.lens_company||'Unknown';
              if (!acc[lab]) acc[lab] = { count:0, pending:0 };
              acc[lab].count++;
              if (o.lens_step < 3) acc[lab].pending++;
              return acc;
            }, {});
            return (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:20 }}>
                {Object.entries(byLab).map(([lab,s])=>(
                  <div key={lab} style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'16px 18px' }}>
                    <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:6 }}>{lab}</div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:C.navy }}>{s.count}</div>
                    <div style={{ fontSize:12, color:s.pending>0?C.danger:C.success }}>{s.pending} pending · {s.count-s.pending} done</div>
                  </div>
                ))}
                {!lensJobs?.length && (
                  <div style={{ gridColumn:'1/-1', textAlign:'center', padding:40, color:C.muted, fontSize:13 }}>No active lens jobs</div>
                )}
              </div>
            );
          })()}

          {/* Lens jobs table */}
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>Active Lens Jobs</span>
            </div>
            {!lensJobs?.length
              ? <div style={{ padding:24, textAlign:'center', color:C.muted, fontSize:13 }}>No active lens jobs at labs</div>
              : lensJobs.map(o=>{
                  const steps = ['📤 Sent','⚙️ Grinding','📦 Ready','✅ Received'];
                  const step  = parseInt(o.lens_step||0);
                  return (
                    <div key={o.id} style={{ padding:'12px 18px', borderBottom:`1px solid ${C.cream}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8, flexWrap:'wrap', gap:6 }}>
                        <div>
                          <div style={{ fontSize:14, fontWeight:600, color:C.navy }}>{o.customer_name}</div>
                          <div style={{ fontSize:11, color:C.muted }}>{o.order_number} · {o.lens_company} · {o.frame||'—'} · {o.lens_type}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:12, fontWeight:700, color:step>=3?C.success:C.navy }}>{steps[step]}</div>
                          <div style={{ fontSize:11, color:C.muted }}>Deliver: {o.deliver_date?.slice(0,10)}</div>
                        </div>
                      </div>
                      {/* Step progress */}
                      <div style={{ display:'flex', gap:4 }}>
                        {steps.map((s,i)=>(
                          <div key={i} style={{ flex:1, height:4, borderRadius:2, background:i<=step?C.gold:C.border }}/>
                        ))}
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}

      {/* ── TOP SELLERS TAB ── */}
      {!loading && activeTab==='topsellers' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Top frames */}
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>🕶️ Top Frames</span>
            </div>
            {!topSellers?.frames?.length
              ? <div style={{ padding:24, textAlign:'center', color:C.muted, fontSize:13 }}>No data yet</div>
              : topSellers.frames.map((f,i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 18px', borderBottom:`1px solid ${C.cream}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:i===0?C.gold:i===1?'#c0c0c0':i===2?'#cd7f32':C.cream, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:i<3?'white':C.muted, flexShrink:0 }}>
                      {i+1}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{f.frame||'Unknown'}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{f.units} sold</div>
                    </div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.success }}>{fmtMoney(f.revenue)}</div>
                </div>
              ))
            }
          </div>

          {/* Lens types */}
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>🔬 Lens Types</span>
            </div>
            {!topSellers?.lenses?.length
              ? <div style={{ padding:24, textAlign:'center', color:C.muted, fontSize:13 }}>No data yet</div>
              : topSellers.lenses.map((l,i)=>{
                  const max = topSellers.lenses[0]?.units||1;
                  const pct = Math.round((l.units/max)*100);
                  return (
                    <div key={i} style={{ padding:'10px 18px', borderBottom:`1px solid ${C.cream}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>{l.lens_type}</span>
                        <span style={{ fontSize:13, color:C.muted }}>{l.units} orders</span>
                      </div>
                      <div style={{ height:6, background:C.cream, borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:C.navy, borderRadius:3, transition:'width .3s' }}/>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}
    </div>
  );
}
