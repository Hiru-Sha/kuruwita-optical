/* eslint-disable */
// ============================================================
//  Reports.js — Fixed: Revenue includes QS+repairs, COGS warning
// ============================================================
import React, { useEffect, useState } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'var(--cream,#f8f5ef)',
  border:'var(--border,#e0ddd6)', muted:'var(--muted,#6b7280)',
  success:'#16a34a', danger:'#dc2626', surface:'var(--surface,#fff)'
};
const fmt  = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0,maximumFractionDigits:0});
const thisMonth = () => new Date().toISOString().slice(0,7);

function api(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json());
}

function BarChart({ data, valueKey='total', labelKey='month', color=C.navy, height=140 }) {
  if (!data?.length) return <div style={{ color:C.muted, fontSize:13, padding:20, textAlign:'center' }}>No data</div>;
  const max = Math.max(...data.map(d=>parseFloat(d[valueKey])||0), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height, padding:'0 4px' }}>
      {data.map((d,i)=>{
        const val  = parseFloat(d[valueKey])||0;
        const pctH = val/max*100;
        const isNeg = val < 0;
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ fontSize:9, color:isNeg?C.danger:C.muted, fontWeight:600, textAlign:'center' }}>
              {Math.abs(val)>=1000?`${Math.round(Math.abs(val)/1000)}K`:Math.round(Math.abs(val))}
            </div>
            <div style={{ width:'100%', background:isNeg?C.danger:color, borderRadius:'4px 4px 0 0', height:`${Math.max(Math.abs(pctH),2)}%`, minHeight:2, opacity:isNeg?.7:1 }}/>
            <div style={{ fontSize:9, color:C.muted, textAlign:'center', lineHeight:1.2 }}>{d[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
}

function StackedBar({ month }) {
  const revenue  = parseFloat(month.revenue)       || 0;
  const cost     = parseFloat(month.cost_of_goods) || 0;
  const expenses = parseFloat(month.expenses)      || 0;
  const total    = revenue || 1;
  const costPct  = Math.min(100, cost/total*100);
  const expPct   = Math.min(100-costPct, expenses/total*100);
  const profPct  = Math.max(0, 100 - costPct - expPct);
  return (
    <div style={{ width:'100%', height:12, borderRadius:6, overflow:'hidden', display:'flex', background:'#f3f4f6' }}>
      <div style={{ width:`${costPct}%`,  background:'#ef4444' }} title={`Cost: ${fmt(cost)}`}/>
      <div style={{ width:`${expPct}%`,   background:'#f97316' }} title={`Expenses: ${fmt(expenses)}`}/>
      <div style={{ width:`${profPct}%`,  background:parseFloat(month.net_profit)>=0?'#22c55e':'#ef4444' }} title={`Profit: ${fmt(month.net_profit)}`}/>
    </div>
  );
}

function Card({ label, value, sub, color=C.navy, dark=false }) {
  return (
    <div style={{ background:dark?C.navy:'white', border:`1px solid ${dark?C.navy:C.border}`, borderRadius:12, padding:'16px 18px' }}>
      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:dark?C.gold:C.muted, marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:dark?'white':color, marginBottom:sub?4:0 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:dark?'#ede9e0':C.muted }}>{sub}</div>}
    </div>
  );
}

export default function Reports() {
  const [month,     setMonth]    = useState(thisMonth());
  const [activeTab, setActiveTab]= useState('profit');
  const [revenue,   setRevenue]  = useState(null);
  const [topSellers,setTop]      = useState(null);
  const [lensJobs,  setLensJobs] = useState(null);
  const [profit,    setProfit]   = useState(null);
  const [loading,   setLoading]  = useState(true);

  useEffect(()=>{
    setLoading(true);
    Promise.all([
      api(`/reports/revenue?month=${month}`),
      api('/reports/topsellers'),
      api('/reports/lensjobs'),
      api('/reports/profit'),
    ]).then(([rev, top, jobs, prof])=>{
      setRevenue(rev); setTop(top); setLensJobs(jobs); setProfit(prof);
    }).catch(console.error).finally(()=>setLoading(false));
  },[month]);

  const TABS = [
    { key:'profit',     label:'📈 Profit'       },
    { key:'revenue',    label:'💰 Revenue'      },
    { key:'lensjobs',   label:'🔬 Lens Jobs'    },
    { key:'topsellers', label:'🏆 Top Sellers'  },
  ];

  const totals = profit?.totals || {};

  return (
    <div style={{ fontFamily:"'Inter','DM Sans',sans-serif", maxWidth:1100 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>Reports</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Profit, revenue, lens jobs, top sellers</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <label style={{ fontSize:12, color:C.muted, fontWeight:600 }}>Month:</label>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
            style={{ padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy }}/>
        </div>
      </div>

      <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, marginBottom:20, background:'white', borderRadius:'12px 12px 0 0', padding:'0 4px' }}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)}
            style={{ padding:'12px 20px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', color:activeTab===t.key?C.navy:C.muted, borderBottom:`2.5px solid ${activeTab===t.key?C.gold:'transparent'}`, marginBottom:-1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>Loading...</div>}

      {/* ── PROFIT TAB ─────────────────────────────────────── */}
      {!loading && activeTab==='profit' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
            <Card label="6-Month Revenue"    value={fmt(totals.revenue)}      dark />
            <Card label="Cost of Goods"      value={fmt(totals.cost_of_goods)}color={C.danger}  sub="Frames + lenses bought" />
            <Card label="Gross Profit"       value={fmt(totals.gross_profit)} color={parseFloat(totals.gross_profit)>=0?C.success:C.danger} sub={`${totals.revenue>0?Math.round(totals.gross_profit/totals.revenue*100):0}% margin`} />
            <Card label="Total Expenses"     value={fmt(totals.expenses)}     color='#f97316'   sub="Rent, salary, bills" />
            <Card label="Net Profit"         value={fmt(totals.net_profit)}   color={parseFloat(totals.net_profit)>=0?C.success:C.danger} sub={`${totals.revenue>0?Math.round(totals.net_profit/totals.revenue*100):0}% net margin`} />
          </div>

          {/* How to read */}
          <div style={{ background:'#f0f9ff', border:`1px solid #bae6fd`, borderRadius:12, padding:'12px 16px', marginBottom:12, fontSize:13, color:'#0369a1' }}>
            <b>How to read:</b> Revenue − Cost of Goods = <b>Gross Profit</b>. Gross Profit − Expenses = <b>Net Profit</b> (actual take-home).
            <br/><b>Cost of Goods</b> comes from the frame buy price (set in Inventory) + lens buy price (set via <b>Orders → ✏️ Update Lens Cost</b> when you receive the lab bill).
          </div>

          {/* COGS warning */}
          {totals.cost_of_goods === 0 && (
            <div style={{ background:'#fef9c3', border:`1px solid #fde68a`, borderRadius:10, padding:'11px 16px', marginBottom:16, fontSize:13, color:'#92400e' }}>
              ⚠️ <b>Cost of Goods is Rs. 0</b> — Profit cannot be calculated yet. To fix this:
              <ol style={{ marginTop:6, paddingLeft:18, lineHeight:1.8 }}>
                <li>Go to <b>Inventory</b> → add <b>Buy Price</b> when adding frames</li>
                <li>Go to <b>Orders</b> → open any order → click <b>"✏️ Update Lens Cost"</b> → enter the lab bill price</li>
              </ol>
            </div>
          )}

          {/* Monthly table */}
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden', marginBottom:20 }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>Month-by-Month Breakdown</span>
            </div>
            {!profit?.monthly?.length
              ? <div style={{ padding:24, textAlign:'center', color:C.muted }}>No data yet — orders will appear here</div>
              : <>
                <div style={{ padding:'16px 18px 8px' }}>
                  <BarChart data={profit.monthly} valueKey="net_profit" labelKey="month" color={C.success} height={120}/>
                  <div style={{ display:'flex', gap:16, marginTop:8, fontSize:11, color:C.muted }}>
                    <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'#ef4444', marginRight:4 }}/>Cost of goods</span>
                    <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'#f97316', marginRight:4 }}/>Expenses</span>
                    <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'#22c55e', marginRight:4 }}/>Net profit</span>
                  </div>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr style={{ background:C.cream }}>
                        {['Month','Revenue','Orders+QS+Repairs','Cost of Goods','Gross Profit','Expenses','Net Profit','Margin','Bar'].map(h=>(
                          <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:C.muted, borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {profit.monthly.map((m,i)=>{
                        const isCurr = m.month_key === month;
                        const pos    = parseFloat(m.net_profit) >= 0;
                        return (
                          <tr key={i} style={{ background:isCurr?'#f0f9ff':'white', borderBottom:`1px solid ${C.cream}` }}>
                            <td style={{ padding:'11px 12px', fontWeight:700, color:C.navy, whiteSpace:'nowrap' }}>
                              {m.month}
                              {isCurr && <span style={{ marginLeft:6, background:C.gold, color:C.navy, fontSize:9, fontWeight:700, padding:'1px 7px', borderRadius:20 }}>Current</span>}
                            </td>
                            <td style={{ padding:'11px 12px', fontWeight:700, color:C.navy, whiteSpace:'nowrap' }}>{fmt(m.revenue)}</td>
                            <td style={{ padding:'11px 12px', color:C.muted, fontSize:11, whiteSpace:'nowrap' }}>
                              {fmt(m.order_revenue)} / {fmt(m.qs_revenue)} / {fmt(m.repair_revenue)}
                            </td>
                            <td style={{ padding:'11px 12px', color:m.cogs_entered?C.danger:C.muted, whiteSpace:'nowrap' }}>
                              {m.cogs_entered ? `− ${fmt(m.cost_of_goods)}` : <span style={{ background:'#fef9c3', color:'#92400e', fontSize:11, padding:'2px 8px', borderRadius:20 }}>Not entered</span>}
                            </td>
                            <td style={{ padding:'11px 12px', fontWeight:600, color:parseFloat(m.gross_profit)>=0?C.success:C.danger, whiteSpace:'nowrap' }}>{fmt(m.gross_profit)}</td>
                            <td style={{ padding:'11px 12px', color:'#f97316', whiteSpace:'nowrap' }}>− {fmt(m.expenses)}</td>
                            <td style={{ padding:'11px 12px', fontWeight:700, color:pos?C.success:C.danger, whiteSpace:'nowrap', fontSize:14 }}>{pos?'+':''}{fmt(m.net_profit)}</td>
                            <td style={{ padding:'11px 12px', whiteSpace:'nowrap' }}>
                              <span style={{ background:pos?'#dcfce7':'#fee2e2', color:pos?C.success:C.danger, fontWeight:700, fontSize:12, padding:'3px 9px', borderRadius:20 }}>
                                {m.net_margin}%
                              </span>
                            </td>
                            <td style={{ padding:'11px 12px', minWidth:80 }}><StackedBar month={m}/></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background:C.navy }}>
                        <td style={{ padding:'11px 12px', fontWeight:700, color:'white' }}>6-Month Total</td>
                        <td style={{ padding:'11px 12px', color:'white', fontWeight:600 }}>{fmt(totals.revenue)}</td>
                        <td style={{ padding:'11px 12px' }}/>
                        <td style={{ padding:'11px 12px', color:'#fca5a5' }}>− {fmt(totals.cost_of_goods)}</td>
                        <td style={{ padding:'11px 12px', color:'#86efac', fontWeight:600 }}>{fmt(totals.gross_profit)}</td>
                        <td style={{ padding:'11px 12px', color:'#fed7aa' }}>− {fmt(totals.expenses)}</td>
                        <td style={{ padding:'11px 12px', fontWeight:700, color:parseFloat(totals.net_profit)>=0?'#86efac':'#fca5a5', fontSize:15 }}>
                          {parseFloat(totals.net_profit)>=0?'+':''}{fmt(totals.net_profit)}
                        </td>
                        <td style={{ padding:'11px 12px', color:C.gold, fontWeight:700 }}>
                          {totals.revenue>0?Math.round(totals.net_profit/totals.revenue*100):0}%
                        </td>
                        <td/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            }
          </div>

          {profit?.top_margin_frames?.length > 0 && (
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>Best Profit Frames (last 3 months)</span>
              </div>
              {profit.top_margin_frames.map((f,i)=>{
                const p = parseFloat(f.avg_total_profit)||0;
                const maxP = parseFloat(profit.top_margin_frames[0]?.avg_total_profit)||1;
                return (
                  <div key={i} style={{ padding:'12px 18px', borderBottom:`1px solid ${C.cream}`, display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:i===0?C.gold:i===1?'#c0c0c0':i===2?'#cd7f32':C.cream, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:i<3?'white':C.muted, flexShrink:0 }}>{i+1}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.navy, marginBottom:4 }}>{f.frame}</div>
                      <div style={{ height:6, background:C.cream, borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${Math.max(5,p/maxP*100)}%`, background:C.success, borderRadius:3 }}/>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:C.success }}>+{fmt(p)}</div>
                      <div style={{ fontSize:11, color:C.muted }}>avg profit · {f.orders} orders</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── REVENUE TAB ────────────────────────────────────── */}
      {!loading && activeTab==='revenue' && (
        <div>
          {/* Summary — orders + QS + repairs separately */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:16 }}>
            <Card label="Total Revenue"  value={fmt(revenue?.summary?.total)}        dark />
            <Card label="From Orders"    value={fmt(revenue?.summary?.order_total)}  color={C.navy}    sub={`${revenue?.summary?.order_count||0} orders`} />
            <Card label="Quick Sales"    value={fmt(revenue?.summary?.qs_total)}     color='#0891b2'   sub={`${revenue?.summary?.qs_count||0} sales`} />
            <Card label="Repairs"        value={fmt(revenue?.summary?.repair_total)} color='#7c3aed'   sub={`${revenue?.summary?.repair_count||0} repairs`} />
            <Card label="Collected"      value={fmt(revenue?.summary?.collected)}    color={C.success} />
            <Card label="Still Owed"     value={fmt(revenue?.summary?.owed)}         color={C.danger}  />
          </div>

          {revenue?.summary?.total === 0 && (
            <div style={{ background:'#fef9c3', border:`1px solid #fde68a`, borderRadius:10, padding:'11px 16px', marginBottom:16, fontSize:13, color:'#92400e' }}>
              ⚠️ Revenue shows Rs. 0 for this month. Check the month picker above matches the month you have orders.
            </div>
          )}

          {revenue?.trend?.length > 0 && (
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:4 }}>6-Month Revenue Trend</div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>All income — orders + quick sales + repairs</div>
              <BarChart data={revenue.trend} valueKey="total" labelKey="month" color={C.navy} height={140}/>
              {/* Breakdown mini table */}
              <div style={{ overflowX:'auto', marginTop:16 }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:C.cream }}>
                      {['Month','Total','Orders','Quick Sales','Repairs','Order Count'].map(h=>(
                        <th key={h} style={{ padding:'7px 12px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:C.muted, borderBottom:`1px solid ${C.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {revenue.trend.map((m,i)=>(
                      <tr key={i} style={{ borderBottom:`1px solid ${C.cream}`, background:m.month_key===month?'#f0f9ff':'white' }}>
                        <td style={{ padding:'8px 12px', fontWeight:600, color:C.navy }}>{m.month}</td>
                        <td style={{ padding:'8px 12px', fontWeight:700, color:C.navy }}>{fmt(m.total)}</td>
                        <td style={{ padding:'8px 12px', color:C.muted }}>{fmt(m.order_revenue)}</td>
                        <td style={{ padding:'8px 12px', color:'#0891b2' }}>{fmt(m.qs_revenue)}</td>
                        <td style={{ padding:'8px 12px', color:'#7c3aed' }}>{fmt(m.repair_revenue)}</td>
                        <td style={{ padding:'8px 12px', color:C.muted }}>{m.order_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                          : <div style={{ fontSize:11, color:C.success }}>Paid</div>
                        }
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      )}

      {/* ── LENS JOBS TAB ──────────────────────────────────── */}
      {!loading && activeTab==='lensjobs' && (
        <div>
          {(() => {
            const byLab = (lensJobs||[]).reduce((acc,o)=>{ const lab=o.lens_company||'Unknown'; if(!acc[lab]) acc[lab]={count:0,pending:0}; acc[lab].count++; if(o.lens_step<3) acc[lab].pending++; return acc; },{});
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
                  const steps = ['Sent','Grinding','Ready','Received'];
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

      {/* ── TOP SELLERS TAB ────────────────────────────────── */}
      {!loading && activeTab==='topsellers' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            {/* Top frames */}
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>Top Frames (3 months)</span>
              </div>
              {!topSellers?.frames?.length
                ? <div style={{ padding:24, textAlign:'center', color:C.muted, fontSize:13 }}>No data yet</div>
                : topSellers.frames.map((f,i)=>(
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 18px', borderBottom:`1px solid ${C.cream}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:24, height:24, borderRadius:'50%', background:i===0?C.gold:i===1?'#c0c0c0':i===2?'#cd7f32':C.cream, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:i<3?'white':C.muted, flexShrink:0 }}>{i+1}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{f.frame}</div>
                        <div style={{ fontSize:11, color:C.muted }}>{f.units} sold · avg {fmt(f.avg_price)}</div>
                      </div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.success }}>{fmt(f.revenue)}</div>
                  </div>
                ))
              }
            </div>

            {/* Lens types */}
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>Lens Types (3 months)</span>
              </div>
              {!topSellers?.lenses?.length
                ? <div style={{ padding:24, textAlign:'center', color:C.muted, fontSize:13 }}>No data yet</div>
                : topSellers.lenses.map((l,i)=>{
                  const max = topSellers.lenses[0]?.units||1;
                  return (
                    <div key={i} style={{ padding:'10px 18px', borderBottom:`1px solid ${C.cream}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>{l.lens_type}</span>
                        <span style={{ fontSize:13, color:C.muted }}>{l.units} orders</span>
                      </div>
                      <div style={{ height:6, background:C.cream, borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${Math.round(l.units/max*100)}%`, background:C.navy, borderRadius:3 }}/>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* Lens suppliers */}
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>Lens Suppliers (3 months)</span>
              </div>
              {!topSellers?.companies?.length
                ? <div style={{ padding:24, textAlign:'center', color:C.muted, fontSize:13 }}>No data yet</div>
                : topSellers.companies.map((co,i)=>(
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'10px 18px', borderBottom:`1px solid ${C.cream}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:24, height:24, borderRadius:'50%', background:C.navy, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>{i+1}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{co.lens_company}</div>
                        <div style={{ fontSize:11, color:C.muted }}>{co.units} orders</div>
                      </div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.success }}>{fmt(co.revenue)}</div>
                  </div>
                ))
              }
            </div>

            {/* Top coatings */}
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>Top Coatings (3 months)</span>
              </div>
              {!topSellers?.coatings?.length
                ? <div style={{ padding:24, textAlign:'center', color:C.muted, fontSize:13 }}>No data yet</div>
                : topSellers.coatings.map((co,i)=>{
                  const max = topSellers.coatings[0]?.units||1;
                  return (
                    <div key={i} style={{ padding:'10px 18px', borderBottom:`1px solid ${C.cream}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>{co.lens_coating}</span>
                        <span style={{ fontSize:13, color:C.muted }}>{co.units} orders</span>
                      </div>
                      <div style={{ height:6, background:C.cream, borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${Math.round(co.units/max*100)}%`, background:C.gold, borderRadius:3 }}/>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}