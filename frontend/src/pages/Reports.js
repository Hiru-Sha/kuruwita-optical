/* eslint-disable */
// ============================================================
//  Reports.js — Revenue, Lens Jobs, Top Sellers + Profit tab
// ============================================================
import React, { useEffect, useState } from 'react';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b' };
const fmt  = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0,maximumFractionDigits:0});
const pct  = (n) => (parseFloat(n||0)).toFixed(1) + '%';
const thisMonth = () => new Date().toISOString().slice(0,7);

function api(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json());
}

// ── Bar chart ─────────────────────────────────────────────────
function BarChart({ data, valueKey='total', labelKey='month', color=C.navy, height=140 }) {
  if (!data?.length) return <div style={{ color:C.muted, fontSize:13, padding:20, textAlign:'center' }}>No data</div>;
  const max = Math.max(...data.map(d=>parseFloat(d[valueKey])||0), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height, padding:'0 4px' }}>
      {data.map((d,i)=>{
        const val = parseFloat(d[valueKey])||0;
        const pctH= val/max*100;
        const isNeg = val < 0;
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ fontSize:9, color:isNeg?C.danger:C.muted, fontWeight:600, textAlign:'center' }}>
              {Math.abs(val)>=1000?`${Math.round(Math.abs(val)/1000)}K`:Math.round(Math.abs(val))}
              {isNeg?'':''}
            </div>
            <div style={{ width:'100%', background:isNeg?C.danger:color, borderRadius:'4px 4px 0 0', height:`${Math.max(Math.abs(pctH),2)}%`, minHeight:2, opacity:isNeg?.7:1, transition:'height .3s' }}/>
            <div style={{ fontSize:9, color:C.muted, textAlign:'center', lineHeight:1.2 }}>{d[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Stacked bar (revenue + cost breakdown) ─────────────────────
function StackedBar({ month }) {
  const revenue    = parseFloat(month.revenue)       || 0;
  const cost       = parseFloat(month.cost_of_goods) || 0;
  const expenses   = parseFloat(month.expenses)      || 0;
  const gross      = parseFloat(month.gross_profit)  || 0;
  const net        = parseFloat(month.net_profit)    || 0;
  const total      = revenue || 1;

  const costPct    = Math.min(100, cost/total*100);
  const expPct     = Math.min(100-costPct, expenses/total*100);
  const profitPct  = Math.max(0, 100 - costPct - expPct);

  return (
    <div style={{ width:'100%', height:12, borderRadius:6, overflow:'hidden', display:'flex', background:'#f3f4f6' }}>
      <div style={{ width:`${costPct}%`,   background:'#ef4444', transition:'width .4s' }} title={`Cost: ${fmt(cost)}`}/>
      <div style={{ width:`${expPct}%`,    background:'#f97316', transition:'width .4s' }} title={`Expenses: ${fmt(expenses)}`}/>
      <div style={{ width:`${profitPct}%`, background:net>=0?'#22c55e':'#ef4444', transition:'width .4s' }} title={`Profit: ${fmt(net)}`}/>
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────
function Card({ label, value, sub, color=C.navy, dark=false, icon }) {
  return (
    <div style={{ background:dark?C.navy:'white', border:`1px solid ${dark?C.navy:C.border}`, borderRadius:12, padding:'16px 18px' }}>
      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:dark?C.gold:C.muted, marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:dark?'white':color, marginBottom:sub?4:0 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:dark?'#ede9e0':C.muted }}>{sub}</div>}
    </div>
  );
}

export default function Reports() {
  const [month,      setMonth]     = useState(thisMonth());
  const [activeTab,  setActiveTab] = useState('profit');
  const [revenue,    setRevenue]   = useState(null);
  const [topSellers, setTop]       = useState(null);
  const [lensJobs,   setLensJobs]  = useState(null);
  const [profit,     setProfit]    = useState(null);
  const [loading,    setLoading]   = useState(true);

  useEffect(()=>{
    setLoading(true);
    Promise.all([
      api(`/reports/revenue?month=${month}`),
      api('/reports/topsellers'),
      api('/reports/lensjobs'),
      api('/reports/profit'),
    ]).then(([rev, top, jobs, prof])=>{
      setRevenue(rev); setTop(top); setLensJobs(jobs); setProfit(prof);
    }).catch(console.error)
    .finally(()=>setLoading(false));
  },[month]);

  const TABS = [
    { key:'profit',     label:'📈 Profit'      },
    { key:'revenue',    label:'💰 Revenue'     },
    { key:'lensjobs',   label:'🔬 Lens Jobs'   },
    { key:'topsellers', label:'🏆 Top Sellers' },
  ];

  // Current month profit data
  const thisMonthProfit = profit?.monthly?.find(m => m.month_key === month);
  const totals          = profit?.totals || {};

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>📊 Reports</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Profit, revenue, lens jobs, top sellers</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <label style={{ fontSize:12, color:C.muted, fontWeight:600 }}>Month:</label>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
            style={{ padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy }}/>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, marginBottom:20, background:'white', borderRadius:'12px 12px 0 0', padding:'0 4px' }}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)}
            style={{ padding:'12px 20px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', color:activeTab===t.key?C.navy:C.muted, borderBottom:`2.5px solid ${activeTab===t.key?C.gold:'transparent'}`, marginBottom:-1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>Loading...</div>}

      {/* ══════════════ PROFIT TAB ══════════════════════════ */}
      {!loading && activeTab==='profit' && (
        <div>
          {/* 6-month summary cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
            <Card label="6-Month Revenue"    value={fmt(totals.revenue)}      color={C.navy}    dark />
            <Card label="Cost of Goods"      value={fmt(totals.cost_of_goods)}color={C.danger}  sub="Frames + lenses bought" />
            <Card label="Gross Profit"       value={fmt(totals.gross_profit)} color={totals.gross_profit>=0?C.success:C.danger} sub={`${totals.revenue>0?Math.round(totals.gross_profit/totals.revenue*100):0}% margin`} />
            <Card label="Total Expenses"     value={fmt(totals.expenses)}     color='#f97316'   sub="Rent, salary, bills..." />
            <Card label="Net Profit"         value={fmt(totals.net_profit)}   color={totals.net_profit>=0?C.success:C.danger} sub={`${totals.revenue>0?Math.round(totals.net_profit/totals.revenue*100):0}% net margin`} />
          </div>

          {/* What these mean */}
          <div style={{ background:'#f0f9ff', border:`1px solid #bae6fd`, borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:13, color:'#0369a1' }}>
            <b>How to read:</b> Revenue − Cost of Goods = <b>Gross Profit</b>. Gross Profit − Expenses (rent, salary, bills) = <b>Net Profit</b> (your actual take-home).
          </div>

          {/* Monthly breakdown table */}
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden', marginBottom:20 }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>Month-by-Month Breakdown</span>
            </div>
            {!profit?.monthly?.length
              ? <div style={{ padding:24, textAlign:'center', color:C.muted }}>No data yet</div>
              : <>
                {/* Chart */}
                <div style={{ padding:'20px 18px 8px' }}>
                  <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>Net profit per month (green = profit, red = loss)</div>
                  <BarChart
                    data={profit.monthly}
                    valueKey="net_profit"
                    labelKey="month"
                    color={C.success}
                    height={130}
                  />
                  {/* Legend */}
                  <div style={{ display:'flex', gap:16, marginTop:10, fontSize:11, color:C.muted }}>
                    <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'#ef4444', marginRight:4 }}/>Cost of goods</span>
                    <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'#f97316', marginRight:4 }}/>Expenses</span>
                    <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'#22c55e', marginRight:4 }}/>Net profit</span>
                  </div>
                </div>

                {/* Table */}
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr style={{ background:C.cream }}>
                        {['Month','Revenue','Cost of Goods','Gross Profit','Expenses','Net Profit','Margin','Breakdown'].map(h=>(
                          <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:C.muted, borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {profit.monthly.map((m,i)=>{
                        const isCurrentMonth = m.month_key === month;
                        const netPositive    = parseFloat(m.net_profit) >= 0;
                        return (
                          <tr key={i} style={{ background:isCurrentMonth?'#f0f9ff':'white', borderBottom:`1px solid ${C.cream}` }}>
                            <td style={{ padding:'12px 14px', fontWeight:700, color:C.navy, whiteSpace:'nowrap' }}>
                              {m.month}
                              {isCurrentMonth && <span style={{ marginLeft:6, background:C.gold, color:C.navy, fontSize:9, fontWeight:700, padding:'1px 7px', borderRadius:20 }}>Current</span>}
                            </td>
                            <td style={{ padding:'12px 14px', color:C.navy, whiteSpace:'nowrap' }}>{fmt(m.revenue)}</td>
                            <td style={{ padding:'12px 14px', color:C.danger, whiteSpace:'nowrap' }}>− {fmt(m.cost_of_goods)}</td>
                            <td style={{ padding:'12px 14px', fontWeight:600, color:parseFloat(m.gross_profit)>=0?C.success:C.danger, whiteSpace:'nowrap' }}>{fmt(m.gross_profit)}</td>
                            <td style={{ padding:'12px 14px', color:'#f97316', whiteSpace:'nowrap' }}>− {fmt(m.expenses)}</td>
                            <td style={{ padding:'12px 14px', fontWeight:700, color:netPositive?C.success:C.danger, whiteSpace:'nowrap', fontSize:14 }}>
                              {netPositive?'+':''}{fmt(m.net_profit)}
                            </td>
                            <td style={{ padding:'12px 14px', whiteSpace:'nowrap' }}>
                              <span style={{ background:netPositive?'#dcfce7':'#fee2e2', color:netPositive?C.success:C.danger, fontWeight:700, fontSize:12, padding:'3px 9px', borderRadius:20 }}>
                                {m.net_margin}%
                              </span>
                            </td>
                            <td style={{ padding:'12px 14px', minWidth:100 }}>
                              <StackedBar month={m}/>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Totals row */}
                    <tfoot>
                      <tr style={{ background:C.navy }}>
                        <td style={{ padding:'12px 14px', fontWeight:700, color:'white' }}>6-Month Total</td>
                        <td style={{ padding:'12px 14px', color:'white', fontWeight:600 }}>{fmt(totals.revenue)}</td>
                        <td style={{ padding:'12px 14px', color:'#fca5a5' }}>− {fmt(totals.cost_of_goods)}</td>
                        <td style={{ padding:'12px 14px', color:'#86efac', fontWeight:600 }}>{fmt(totals.gross_profit)}</td>
                        <td style={{ padding:'12px 14px', color:'#fed7aa' }}>− {fmt(totals.expenses)}</td>
                        <td style={{ padding:'12px 14px', fontWeight:700, color:parseFloat(totals.net_profit)>=0?'#86efac':'#fca5a5', fontSize:15 }}>
                          {parseFloat(totals.net_profit)>=0?'+':''}{fmt(totals.net_profit)}
                        </td>
                        <td style={{ padding:'12px 14px', color:C.gold, fontWeight:700 }}>
                          {totals.revenue>0?Math.round(totals.net_profit/totals.revenue*100):0}%
                        </td>
                        <td style={{ padding:'12px 14px' }}/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            }
          </div>

          {/* Top margin frames */}
          {profit?.top_margin_frames?.length > 0 && (
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>🕶️ Best Profit Frames (last 3 months)</span>
              </div>
              {profit.top_margin_frames.map((f,i)=>{
                const totalProfit = parseFloat(f.avg_total_profit)||0;
                const maxP = parseFloat(profit.top_margin_frames[0]?.avg_total_profit)||1;
                return (
                  <div key={i} style={{ padding:'12px 18px', borderBottom:`1px solid ${C.cream}`, display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:i===0?C.gold:i===1?'#c0c0c0':i===2?'#cd7f32':C.cream, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:i<3?'white':C.muted, flexShrink:0 }}>
                      {i+1}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.navy, marginBottom:4 }}>{f.frame}</div>
                      <div style={{ height:6, background:C.cream, borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${Math.max(5,totalProfit/maxP*100)}%`, background:C.success, borderRadius:3 }}/>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:C.success }}>+{fmt(totalProfit)}</div>
                      <div style={{ fontSize:11, color:C.muted }}>avg profit · {f.orders} order{f.orders!=1?'s':''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ REVENUE TAB ══════════════════════════ */}
      {!loading && activeTab==='revenue' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
            {[
              { l:'Total Billed',  v:fmt(revenue?.summary?.total),     color:C.navy,    dark:true },
              { l:'Collected',     v:fmt(revenue?.summary?.collected), color:C.success  },
              { l:'Still Owed',   v:fmt(revenue?.summary?.owed),      color:C.danger   },
              { l:'Orders',       v:revenue?.summary?.order_count||0, color:'#2563eb'  },
            ].map(s=>(
              <Card key={s.l} label={s.l} value={s.v} color={s.color} dark={s.dark}/>
            ))}
          </div>
          {revenue?.trend?.length > 0 && (
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:16 }}>6-Month Revenue Trend</div>
              <BarChart data={revenue.trend} valueKey="total" labelKey="month" color={C.navy} height={140}/>
            </div>
          )}
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
                        <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{fmt(o.total_amount)}</div>
                        {parseFloat(o.balance_amount)>0
                          ? <div style={{ fontSize:11, color:C.danger }}>Balance: {fmt(o.balance_amount)}</div>
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

      {/* ══════════════ LENS JOBS TAB ════════════════════════ */}
      {!loading && activeTab==='lensjobs' && (
        <div>
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
                {!lensJobs?.length && <div style={{ gridColumn:'1/-1', textAlign:'center', padding:40, color:C.muted, fontSize:13 }}>No active lens jobs</div>}
              </div>
            );
          })()}
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
                      <div style={{ display:'flex', gap:4 }}>
                        {steps.map((_,i)=>(
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

      {/* ══════════════ TOP SELLERS TAB ══════════════════════ */}
      {!loading && activeTab==='topsellers' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
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
                      <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{f.frame}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{f.units} sold</div>
                    </div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.success }}>{fmt(f.revenue)}</div>
                </div>
              ))
            }
          </div>
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>🔬 Lens Types</span>
            </div>
            {!topSellers?.lenses?.length
              ? <div style={{ padding:24, textAlign:'center', color:C.muted, fontSize:13 }}>No data yet</div>
              : topSellers.lenses.map((l,i)=>{
                  const max = topSellers.lenses[0]?.units||1;
                  const p   = Math.round((l.units/max)*100);
                  return (
                    <div key={i} style={{ padding:'10px 18px', borderBottom:`1px solid ${C.cream}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>{l.lens_type}</span>
                        <span style={{ fontSize:13, color:C.muted }}>{l.units} orders</span>
                      </div>
                      <div style={{ height:6, background:C.cream, borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${p}%`, background:C.navy, borderRadius:3 }}/>
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
