/* eslint-disable */
import React, { useEffect, useState } from 'react';

const C = {
  navy:    'var(--navy)',
  gold:    'var(--gold)',
  cream:   'var(--bg-sunken)',
  surface: 'var(--bg-surface)',
  border:  'var(--border)',
  muted:   'var(--text-muted)',
  success: 'var(--success)',
  danger:  'var(--danger)',
  warning: 'var(--warning)',
  info:    'var(--info)',
};
const fmt  = n => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0,maximumFractionDigits:0});
const fmtK = n => { const v=parseFloat(n||0); return v>=1000000?`Rs.${(v/1000000).toFixed(1)}M`:v>=1000?`Rs.${(v/1000).toFixed(0)}K`:`Rs.${Math.round(v)}`; };
const thisMonth = () => new Date().toISOString().slice(0,7);

function api(path) {
  const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json());
}

// ── Chart components ─────────────────────────────────────────

function BarChart({ data, valueKey='total', labelKey='month', color=C.navy, height=160, showValues=true }) {
  if (!data?.length) return <div style={{color:C.muted,fontSize:13,padding:20,textAlign:'center'}}>No data</div>;
  const max = Math.max(...data.map(d=>Math.abs(parseFloat(d[valueKey])||0)),1);
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:8,height,padding:'0 4px'}}>
      {data.map((d,i)=>{
        const val = parseFloat(d[valueKey])||0;
        const pctH = Math.abs(val)/max*100;
        const isNeg = val < 0;
        return (
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
            {showValues && <div style={{fontSize:9,color:isNeg?C.danger:C.muted,fontWeight:600,textAlign:'center',lineHeight:1.2}}>
              {fmtK(Math.abs(val))}
            </div>}
            <div style={{width:'100%',background:isNeg?C.danger:color,borderRadius:'6px 6px 0 0',
              height:`${Math.max(Math.abs(pctH),2)}%`,minHeight:3,
              opacity:isNeg?.7:1,transition:'height .3s'}}/>
            <div style={{fontSize:9,color:C.muted,textAlign:'center',lineHeight:1.2}}>{d[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
}

function MultiBarChart({ data, keys, colors, labelKey='month', height=160 }) {
  if (!data?.length) return <div style={{color:C.muted,fontSize:13,padding:20,textAlign:'center'}}>No data</div>;
  const max = Math.max(...data.flatMap(d=>keys.map(k=>parseFloat(d[k])||0)),1);
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:6,height,padding:'0 4px'}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
          <div style={{width:'100%',display:'flex',gap:2,alignItems:'flex-end',height:height-24}}>
            {keys.map((k,ki)=>{
              const val = parseFloat(d[k])||0;
              const pct = val/max*100;
              return <div key={ki} style={{flex:1,background:colors[ki],borderRadius:'4px 4px 0 0',height:`${Math.max(pct,2)}%`,minHeight:2,transition:'height .3s'}} title={`${k}: ${fmt(val)}`}/>;
            })}
          </div>
          <div style={{fontSize:9,color:C.muted,textAlign:'center',lineHeight:1.2}}>{d[labelKey]}</div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, valueKey='total', labelKey='month', color=C.navy, height=140 }) {
  if (!data?.length) return <div style={{color:C.muted,fontSize:13,padding:20,textAlign:'center'}}>No data</div>;
  const vals = data.map(d=>parseFloat(d[valueKey])||0);
  const max = Math.max(...vals,1);
  const min = Math.min(...vals,0);
  const range = max - min || 1;
  const W = 100, H = 100;
  const pts = data.map((d,i)=>{
    const x = (i/(data.length-1||1))*(W-10)+5;
    const y = H - ((parseFloat(d[valueKey])||0)-min)/range*(H-10)-5;
    return [x,y];
  });
  const path = pts.map((p,i)=>i===0?`M${p[0]},${p[1]}`:`L${p[0]},${p[1]}`).join(' ');
  const area = `${path} L${pts[pts.length-1][0]},${H+5} L${pts[0][0]},${H+5} Z`;
  return (
    <div style={{position:'relative',height}}>
      <svg viewBox={`0 0 ${W} ${H+10}`} preserveAspectRatio="none" style={{width:'100%',height:'100%'}}>
        <defs>
          <linearGradient id={`grad-${valueKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#grad-${valueKey})`}/>
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p,i)=>(
          <circle key={i} cx={p[0]} cy={p[1]} r="2" fill={color} stroke="white" strokeWidth="1"/>
        ))}
      </svg>
      {/* Labels */}
      <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
        {data.map((d,i)=>(
          <div key={i} style={{fontSize:9,color:C.muted,textAlign:'center'}}>{d[labelKey]}</div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ segments, size=120, thickness=22 }) {
  const total = segments.reduce((s,seg)=>s+seg.value,0)||1;
  let cum = 0;
  const r = (size-thickness)/2;
  const cx=size/2, cy=size/2;
  const circ = 2*Math.PI*r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg,i)=>{
        const pct = seg.value/total;
        const offset = circ*(1-cum);
        const dash = circ*pct;
        cum += pct;
        return (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${circ-dash}`}
            strokeDashoffset={offset}
            style={{transform:'rotate(-90deg)',transformOrigin:'center',transition:'all .4s'}}/>
        );
      })}
      <text x={cx} y={cy-6} textAnchor="middle" fontSize="11" fontWeight="700" fill={C.navy}>{segments[0]?.label||''}</text>
      <text x={cx} y={cy+10} textAnchor="middle" fontSize="9" fill={C.muted}>{Math.round(segments[0]?.value/total*100)||0}%</text>
    </svg>
  );
}

function StatCard({ label, value, sub, color=C.navy, dark=false, icon, trend }) {
  return (
    <div style={{background:dark?C.navy:C.surface,border:`1.5px solid ${dark?'transparent':C.border}`,borderRadius:16,padding:'18px 20px',boxShadow:dark?'0 4px 16px rgba(15,31,61,.2)':'0 2px 8px rgba(0,0,0,.04)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
        <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',color:dark?'rgba(201,168,76,.8)':C.muted}}>{label}</div>
        {icon && <span style={{fontSize:20}}>{icon}</span>}
      </div>
      <div style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:700,color:dark?'white':color,lineHeight:1,marginBottom:sub?6:0}}>{value}</div>
      {sub && <div style={{fontSize:12,color:dark?'rgba(255,255,255,.55)':C.muted,marginTop:4}}>{sub}</div>}
      {trend != null && (
        <div style={{display:'flex',alignItems:'center',gap:4,marginTop:6}}>
          <span style={{fontSize:11,fontWeight:700,color:trend>=0?C.success:C.danger}}>{trend>=0?'▲':'▼'} {Math.abs(trend)}%</span>
          <span style={{fontSize:10,color:C.muted}}>vs last month</span>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, subtitle, children, action }) {
  return (
    <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:16,overflow:'hidden',marginBottom:16,boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
      <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:C.navy}}>{title}</div>
          {subtitle && <div style={{fontSize:12,color:C.muted,marginTop:2}}>{subtitle}</div>}
        </div>
        {action}
      </div>
      <div style={{padding:20}}>{children}</div>
    </div>
  );
}

function Legend({ items }) {
  return (
    <div style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:8}}>
      {items.map((it,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:C.muted}}>
          <div style={{width:10,height:10,borderRadius:2,background:it.color,flexShrink:0}}/>
          {it.label}
        </div>
      ))}
    </div>
  );
}

// ── Rank badge ───────────────────────────────────────────────
const Badge = ({rank}) => (
  <div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,
    background:rank===1?C.gold:rank===2?'#c0c0c0':rank===3?'#cd7f32':'#f3f4f6',
    color:rank<=3?'white':C.muted}}>
    {rank}
  </div>
);

// ── ProgressBar ──────────────────────────────────────────────
const ProgBar = ({pct,color=C.navy}) => (
  <div style={{height:6,background:'#f3f4f6',borderRadius:3,overflow:'hidden',marginTop:5}}>
    <div style={{height:'100%',width:`${Math.max(3,pct)}%`,background:color,borderRadius:3,transition:'width .4s'}}/>
  </div>
);

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
    ]).then(([rev,top,jobs,prof])=>{ setRevenue(rev); setTop(top); setLensJobs(jobs); setProfit(prof); })
    .catch(console.error).finally(()=>setLoading(false));
  },[month]);

  const TABS = [
    { key:'profit',     label:'Profit & Loss', icon:'📈' },
    { key:'revenue',    label:'Revenue',        icon:'💰' },
    { key:'compare',    label:'Compare',        icon:'📊' },
    { key:'lensjobs',   label:'Lens Jobs',      icon:'🔬' },
    { key:'topsellers', label:'Top Sellers',    icon:'🏆' },
  ];

  const totals = profit?.totals || {};

  return (
    <div style={{fontFamily:'var(--font-body)',maxWidth:1100}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:28,color:C.navy,margin:0}}>Reports</h1>
          <p style={{fontSize:13,color:C.muted,margin:'4px 0 0'}}>Profit, revenue, lens jobs and top sellers</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <label style={{fontSize:12,color:C.muted,fontWeight:600}}>Month:</label>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
            style={{padding:'9px 14px',border:`1.5px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:'inherit',outline:'none',background:C.cream,color:C.navy}}/>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{display:'flex',borderBottom:`1.5px solid ${C.border}`,marginBottom:24,background:C.surface,borderRadius:'14px 14px 0 0',padding:'0 6px',overflowX:'auto',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)}
            style={{padding:'13px 18px',fontSize:13,fontWeight:600,cursor:'pointer',background:'none',border:'none',fontFamily:'inherit',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:6,
              color:activeTab===t.key?C.navy:C.muted,
              borderBottom:`3px solid ${activeTab===t.key?C.gold:'transparent'}`,
              marginBottom:-1,transition:'all .15s'}}>
            <span style={{fontSize:15}}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{textAlign:'center',padding:60,color:C.muted}}>
          <div style={{fontSize:32,marginBottom:12}}>📊</div>
          <div style={{fontSize:14}}>Loading reports...</div>
        </div>
      )}

      {/* ── PROFIT TAB ─────────────────────────────────────── */}
      {!loading && activeTab==='profit' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:20}}>
            <StatCard label="6-Month Revenue"   value={fmtK(totals.revenue)}      dark icon="💵"/>
            <StatCard label="Cost of Goods"     value={fmtK(totals.cost_of_goods)} color={C.danger}  icon="🛒" sub="Frames + lenses"/>
            <StatCard label="Gross Profit"      value={fmtK(totals.gross_profit)}  color={parseFloat(totals.gross_profit)>=0?C.success:C.danger} icon="📊" sub={`${totals.revenue>0?Math.round(totals.gross_profit/totals.revenue*100):0}% margin`}/>
            <StatCard label="Total Expenses"    value={fmtK(totals.expenses)}      color='#f97316'   icon="💸" sub="Rent, salary, bills"/>
            <StatCard label="Net Profit"        value={fmtK(totals.net_profit)}    color={parseFloat(totals.net_profit)>=0?C.success:C.danger} icon="🏦" sub={`${totals.revenue>0?Math.round(totals.net_profit/totals.revenue*100):0}% net margin`}/>
          </div>

          {totals.cost_of_goods === 0 && (
            <div style={{background:'#fef9c3',border:`1px solid #fde68a`,borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:13,color:'#92400e'}}>
              ⚠️ <b>Cost of Goods is Rs. 0</b> — enter buy prices in Inventory and update lens costs in Orders to see accurate profit.
            </div>
          )}

          {profit?.monthly?.length > 0 && (
            <div>
              {/* Net Profit line chart */}
              <SectionCard title="Net Profit Trend" subtitle="6-month net profit over time">
                <LineChart data={profit.monthly} valueKey="net_profit" labelKey="month" color={C.success} height={160}/>
              </SectionCard>

              {/* Revenue vs Expenses vs COGS multi-bar */}
              <SectionCard title="Revenue vs Costs" subtitle="Monthly comparison of revenue, cost of goods and expenses">
                <MultiBarChart
                  data={profit.monthly}
                  keys={['revenue','cost_of_goods','expenses']}
                  colors={[C.navy, C.danger, '#f97316']}
                  labelKey="month" height={160}/>
                <Legend items={[{label:'Revenue',color:C.navy},{label:'Cost of Goods',color:C.danger},{label:'Expenses',color:'#f97316'}]}/>
              </SectionCard>

              {/* Monthly breakdown table */}
              <SectionCard title="Month-by-Month Breakdown" subtitle="Full profit & loss per month">
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                    <thead>
                      <tr style={{background:C.cream}}>
                        {['Month','Revenue','COGS','Gross','Expenses','Net Profit','Margin','Split'].map(h=>(
                          <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:C.muted,borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {profit.monthly.map((m,i)=>{
                        const isCurr = m.month_key === month;
                        const pos    = parseFloat(m.net_profit) >= 0;
                        return (
                          <tr key={i} style={{background:isCurr?'#f0f9ff':i%2===0?C.surface:'#fafaf9',borderBottom:`1px solid ${C.border}`}}>
                            <td style={{padding:'12px',fontWeight:700,color:C.navy,whiteSpace:'nowrap'}}>
                              {m.month}
                              {isCurr && <span style={{marginLeft:6,background:C.gold,color:C.navy,fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20}}>Current</span>}
                            </td>
                            <td style={{padding:'12px',fontWeight:600,color:C.navy,whiteSpace:'nowrap'}}>{fmt(m.revenue)}</td>
                            <td style={{padding:'12px',color:m.cogs_entered?C.danger:C.muted,whiteSpace:'nowrap'}}>
                              {m.cogs_entered ? `−${fmt(m.cost_of_goods)}` : <span style={{background:'#fef9c3',color:'#92400e',fontSize:10,padding:'2px 8px',borderRadius:20}}>Not set</span>}
                            </td>
                            <td style={{padding:'12px',fontWeight:600,color:parseFloat(m.gross_profit)>=0?C.success:C.danger,whiteSpace:'nowrap'}}>{fmt(m.gross_profit)}</td>
                            <td style={{padding:'12px',color:'#f97316',whiteSpace:'nowrap'}}>−{fmt(m.expenses)}</td>
                            <td style={{padding:'12px',fontWeight:700,color:pos?C.success:C.danger,whiteSpace:'nowrap',fontSize:14}}>{pos?'+':''}{fmt(m.net_profit)}</td>
                            <td style={{padding:'12px',whiteSpace:'nowrap'}}>
                              <span style={{background:pos?'#dcfce7':'#fee2e2',color:pos?C.success:C.danger,fontWeight:700,fontSize:12,padding:'3px 10px',borderRadius:20}}>{m.net_margin}%</span>
                            </td>
                            <td style={{padding:'12px',minWidth:100}}>
                              <div style={{width:'100%',height:10,borderRadius:5,overflow:'hidden',display:'flex',background:'#f3f4f6'}}>
                                {[
                                  {pct:Math.min(100,parseFloat(m.cost_of_goods)/(parseFloat(m.revenue)||1)*100),color:'#ef4444'},
                                  {pct:Math.min(100,parseFloat(m.expenses)/(parseFloat(m.revenue)||1)*100),color:'#f97316'},
                                  {pct:Math.max(0,100-parseFloat(m.cost_of_goods)/(parseFloat(m.revenue)||1)*100-parseFloat(m.expenses)/(parseFloat(m.revenue)||1)*100),color:pos?'#22c55e':'#ef4444'},
                                ].map((seg,si)=>(
                                  <div key={si} style={{width:`${seg.pct}%`,background:seg.color}}/>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{background:C.navy}}>
                        <td style={{padding:'12px',fontWeight:700,color:'white'}}>6-Month Total</td>
                        <td style={{padding:'12px',color:'white',fontWeight:600}}>{fmt(totals.revenue)}</td>
                        <td style={{padding:'12px',color:'#fca5a5'}}>−{fmt(totals.cost_of_goods)}</td>
                        <td style={{padding:'12px',color:'#86efac',fontWeight:600}}>{fmt(totals.gross_profit)}</td>
                        <td style={{padding:'12px',color:'#fed7aa'}}>−{fmt(totals.expenses)}</td>
                        <td style={{padding:'12px',fontWeight:700,color:parseFloat(totals.net_profit)>=0?'#86efac':'#fca5a5',fontSize:15}}>{parseFloat(totals.net_profit)>=0?'+':''}{fmt(totals.net_profit)}</td>
                        <td style={{padding:'12px',color:C.gold,fontWeight:700}}>{totals.revenue>0?Math.round(totals.net_profit/totals.revenue*100):0}%</td>
                        <td/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </SectionCard>

              {/* Best profit frames */}
              {profit?.top_margin_frames?.length > 0 && (
                <SectionCard title="Best Profit Frames" subtitle="Frames with highest average profit (last 3 months)">
                  {profit.top_margin_frames.map((f,i)=>{
                    const p = parseFloat(f.avg_total_profit)||0;
                    const maxP = parseFloat(profit.top_margin_frames[0]?.avg_total_profit)||1;
                    return (
                      <div key={i} style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
                        <Badge rank={i+1}/>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                            <span style={{fontSize:13,fontWeight:600,color:C.navy}}>{f.frame}</span>
                            <span style={{fontSize:13,fontWeight:700,color:C.success}}>+{fmt(p)}</span>
                          </div>
                          <ProgBar pct={p/maxP*100} color={C.success}/>
                          <div style={{fontSize:11,color:C.muted,marginTop:3}}>{f.orders} orders</div>
                        </div>
                      </div>
                    );
                  })}
                </SectionCard>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── REVENUE TAB ────────────────────────────────────── */}
      {!loading && activeTab==='revenue' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:20}}>
            <StatCard label="Total Revenue"  value={fmtK(revenue?.summary?.total)}        dark icon="💵"/>
            <StatCard label="From Orders"    value={fmtK(revenue?.summary?.order_total)}  color={C.navy}    icon="📋" sub={`${revenue?.summary?.order_count||0} orders`}/>
            <StatCard label="Quick Sales"    value={fmtK(revenue?.summary?.qs_total)}     color='#0891b2'   icon="🛍️" sub={`${revenue?.summary?.qs_count||0} sales`}/>
            <StatCard label="Repairs"        value={fmtK(revenue?.summary?.repair_total)} color='#7c3aed'   icon="🔧" sub={`${revenue?.summary?.repair_count||0} repairs`}/>
            <StatCard label="Collected"      value={fmtK(revenue?.summary?.collected)}    color={C.success} icon="✅"/>
            <StatCard label="Still Owed"     value={fmtK(revenue?.summary?.owed)}         color={C.danger}  icon="⏳"/>
          </div>

          {/* Revenue donut + bar side by side */}
          {revenue?.summary && (
            <SectionCard title="Revenue Sources" subtitle="Breakdown of income this month">
              <div style={{display:'flex',alignItems:'center',gap:32,flexWrap:'wrap'}}>
                <DonutChart size={140} thickness={28} segments={[
                  {value:parseFloat(revenue.summary.order_total)||0,  color:C.navy,   label:'Orders'},
                  {value:parseFloat(revenue.summary.qs_total)||0,     color:'#0891b2',label:'QS'},
                  {value:parseFloat(revenue.summary.repair_total)||0, color:'#7c3aed',label:'Repairs'},
                ]}/>
                <div style={{flex:1,minWidth:200}}>
                  {[
                    {label:'Orders',  value:revenue.summary.order_total,  color:C.navy,   count:revenue.summary.order_count},
                    {label:'Quick Sales', value:revenue.summary.qs_total, color:'#0891b2',count:revenue.summary.qs_count},
                    {label:'Repairs', value:revenue.summary.repair_total, color:'#7c3aed',count:revenue.summary.repair_count},
                  ].map((s,i)=>{
                    const tot = (parseFloat(revenue.summary.order_total)||0)+(parseFloat(revenue.summary.qs_total)||0)+(parseFloat(revenue.summary.repair_total)||0)||1;
                    const pct = Math.round(parseFloat(s.value||0)/tot*100);
                    return (
                      <div key={i} style={{marginBottom:14}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div style={{width:10,height:10,borderRadius:2,background:s.color,flexShrink:0}}/>
                            <span style={{fontSize:13,fontWeight:600,color:C.navy}}>{s.label}</span>
                            <span style={{fontSize:11,color:C.muted}}>{s.count} items</span>
                          </div>
                          <div style={{display:'flex',gap:8,alignItems:'center'}}>
                            <span style={{fontSize:13,fontWeight:700,color:C.navy}}>{fmt(s.value)}</span>
                            <span style={{fontSize:11,background:'#f3f4f6',color:C.muted,padding:'1px 7px',borderRadius:20,fontWeight:600}}>{pct}%</span>
                          </div>
                        </div>
                        <ProgBar pct={pct} color={s.color}/>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionCard>
          )}

          {revenue?.trend?.length > 0 && (
            <>
              <SectionCard title="6-Month Revenue Trend" subtitle="Total income — orders + quick sales + repairs">
                <LineChart data={revenue.trend} valueKey="total" labelKey="month" color={C.navy} height={160}/>
              </SectionCard>

              <SectionCard title="Revenue Breakdown by Source" subtitle="See how each channel contributes each month">
                <MultiBarChart
                  data={revenue.trend}
                  keys={['order_revenue','qs_revenue','repair_revenue']}
                  colors={[C.navy,'#0891b2','#7c3aed']}
                  labelKey="month" height={160}/>
                <Legend items={[{label:'Orders',color:C.navy},{label:'Quick Sales',color:'#0891b2'},{label:'Repairs',color:'#7c3aed'}]}/>
              </SectionCard>
            </>
          )}

          {revenue?.orders?.length > 0 && (
            <SectionCard title="Orders This Month" subtitle={`${revenue.orders.length} orders`}>
              {revenue.orders.map(o=>(
                <div key={o.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:`1px solid ${C.border}`}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.navy}}>{o.customer_name}</div>
                    <div style={{fontSize:11,color:C.muted}}>{o.order_number} · {o.frame||'—'} · {new Date(o.created_at).toLocaleDateString('en-GB')}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.navy}}>{fmt(o.total_amount)}</div>
                    {parseFloat(o.balance_amount)>0
                      ? <div style={{fontSize:11,color:C.danger}}>Balance: {fmt(o.balance_amount)}</div>
                      : <div style={{fontSize:11,color:C.success}}>✓ Paid</div>}
                  </div>
                </div>
              ))}
            </SectionCard>
          )}
        </div>
      )}

      {/* ── COMPARE TAB ────────────────────────────────────── */}
      {!loading && activeTab==='compare' && (
        <div>
          {profit?.monthly?.length > 0 ? (
            <div>
              {/* Side-by-side comparison of key metrics */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                <SectionCard title="Revenue vs Net Profit" subtitle="How much you keep after all costs">
                  <LineChart data={profit.monthly} valueKey="revenue"    labelKey="month" color={C.navy}    height={120}/>
                  <div style={{height:8}}/>
                  <LineChart data={profit.monthly} valueKey="net_profit" labelKey="month" color={C.success} height={120}/>
                  <Legend items={[{label:'Revenue',color:C.navy},{label:'Net Profit',color:C.success}]}/>
                </SectionCard>

                <SectionCard title="Cost Breakdown" subtitle="Where the money goes each month">
                  <MultiBarChart
                    data={profit.monthly}
                    keys={['cost_of_goods','expenses']}
                    colors={[C.danger,'#f97316']}
                    labelKey="month" height={220}/>
                  <Legend items={[{label:'Cost of Goods',color:C.danger},{label:'Expenses',color:'#f97316'}]}/>
                </SectionCard>
              </div>

              {/* Margin % trend */}
              <SectionCard title="Net Margin % Trend" subtitle="Your actual take-home percentage each month">
                <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120}}>
                  {profit.monthly.map((m,i)=>{
                    const pct = parseFloat(m.net_margin)||0;
                    const pos = pct >= 0;
                    return (
                      <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                        <div style={{fontSize:10,fontWeight:700,color:pos?C.success:C.danger}}>{pct}%</div>
                        <div style={{width:'100%',background:pos?C.success:C.danger,borderRadius:'6px 6px 0 0',height:`${Math.max(Math.abs(pct)/50*80,3)}%`,minHeight:3,opacity:.85}}/>
                        <div style={{fontSize:9,color:C.muted}}>{m.month}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:12,fontSize:12,color:C.muted}}>
                  <span>Best: <b style={{color:C.success}}>{Math.max(...profit.monthly.map(m=>parseFloat(m.net_margin)||0))}%</b></span>
                  <span>Average: <b style={{color:C.navy}}>{Math.round(profit.monthly.reduce((s,m)=>s+(parseFloat(m.net_margin)||0),0)/profit.monthly.length)}%</b></span>
                  <span>Latest: <b style={{color:C.navy}}>{profit.monthly[profit.monthly.length-1]?.net_margin}%</b></span>
                </div>
              </SectionCard>

              {/* Revenue source split per month */}
              {revenue?.trend?.length > 0 && (
                <SectionCard title="Monthly Revenue Split" subtitle="Orders vs Quick Sales vs Repairs contribution">
                  <div style={{overflowX:'auto'}}>
                    {revenue.trend.map((m,i)=>{
                      const tot = (parseFloat(m.order_revenue)||0)+(parseFloat(m.qs_revenue)||0)+(parseFloat(m.repair_revenue)||0)||1;
                      const segs = [
                        {label:'Orders',    val:parseFloat(m.order_revenue)||0,  color:C.navy},
                        {label:'QS',        val:parseFloat(m.qs_revenue)||0,     color:'#0891b2'},
                        {label:'Repairs',   val:parseFloat(m.repair_revenue)||0, color:'#7c3aed'},
                      ];
                      return (
                        <div key={i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                          <div style={{fontSize:11,fontWeight:600,color:C.navy,minWidth:36}}>{m.month}</div>
                          <div style={{flex:1,height:22,borderRadius:11,overflow:'hidden',display:'flex',background:'#f3f4f6'}}>
                            {segs.map((s,si)=>(
                              <div key={si} style={{width:`${s.val/tot*100}%`,background:s.color,display:'flex',alignItems:'center',justifyContent:'center',minWidth:s.val>0?24:0,transition:'width .3s'}}>
                                {s.val/tot>0.12 && <span style={{fontSize:9,color:'white',fontWeight:700}}>{Math.round(s.val/tot*100)}%</span>}
                              </div>
                            ))}
                          </div>
                          <div style={{fontSize:11,fontWeight:700,color:C.navy,minWidth:64,textAlign:'right'}}>{fmtK(tot)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <Legend items={[{label:'Orders',color:C.navy},{label:'Quick Sales',color:'#0891b2'},{label:'Repairs',color:'#7c3aed'}]}/>
                </SectionCard>
              )}
            </div>
          ) : (
            <div style={{textAlign:'center',padding:60,color:C.muted,fontSize:14}}>No data to compare yet</div>
          )}
        </div>
      )}

      {/* ── LENS JOBS TAB ──────────────────────────────────── */}
      {!loading && activeTab==='lensjobs' && (
        <div>
          {(() => {
            const byLab = (lensJobs||[]).reduce((acc,o)=>{ const lab=o.lens_company||'Unknown'; if(!acc[lab]) acc[lab]={count:0,pending:0}; acc[lab].count++; if(o.lens_step<3) acc[lab].pending++; return acc; },{});
            return (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:20}}>
                {Object.entries(byLab).map(([lab,s])=>(
                  <StatCard key={lab} label={lab} value={s.count} icon="🔬" sub={`${s.pending} pending · ${s.count-s.pending} done`} color={s.pending>0?C.danger:C.success}/>
                ))}
                {!lensJobs?.length && <div style={{gridColumn:'1/-1',textAlign:'center',padding:40,color:C.muted,fontSize:13}}>No active lens jobs</div>}
              </div>
            );
          })()}

          <SectionCard title="Active Lens Jobs" subtitle="All lenses currently at labs">
            {!lensJobs?.length
              ? <div style={{textAlign:'center',padding:30,color:C.muted,fontSize:13}}>No active lens jobs</div>
              : lensJobs.map(o=>{
                  const steps = ['Sent','Grinding','Ready','Received'];
                  const step  = parseInt(o.lens_step||0);
                  return (
                    <div key={o.id} style={{padding:'14px 0',borderBottom:`1px solid ${C.border}`}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10,flexWrap:'wrap',gap:6}}>
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:C.navy}}>{o.customer_name}</div>
                          <div style={{fontSize:11,color:C.muted,marginTop:2}}>{o.order_number} · {o.lens_company} · {o.lens_type}</div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:12,fontWeight:700,color:'white',background:step>=3?C.success:step===2?C.gold:step===1?'#0891b2':C.navy,padding:'3px 10px',borderRadius:20}}>{steps[step]}</span>
                          {o.deliver_date && <span style={{fontSize:11,color:C.muted}}>Due: {o.deliver_date?.slice(0,10)}</span>}
                        </div>
                      </div>
                      {/* Progress steps */}
                      <div style={{display:'flex',gap:4,alignItems:'center'}}>
                        {steps.map((s,i)=>(
                          <React.Fragment key={i}>
                            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                              <div style={{width:24,height:24,borderRadius:'50%',background:i<=step?C.gold:C.cream,border:`2px solid ${i<=step?C.gold:C.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:i<=step?C.navy:C.muted}}>
                                {i<=step?'✓':i+1}
                              </div>
                              <div style={{fontSize:8,color:i<=step?C.navy:C.muted,fontWeight:i===step?700:400}}>{s}</div>
                            </div>
                            {i<steps.length-1 && <div style={{flex:1,height:2,background:i<step?C.gold:C.border,marginBottom:14,borderRadius:1}}/>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })
            }
          </SectionCard>
        </div>
      )}

      {/* ── TOP SELLERS TAB ────────────────────────────────── */}
      {!loading && activeTab==='topsellers' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>

            {/* Top Frames */}
            <SectionCard title="🕶️ Top Frames" subtitle="3-month best sellers by revenue">
              {!topSellers?.frames?.length
                ? <div style={{textAlign:'center',padding:20,color:C.muted,fontSize:13}}>No data yet</div>
                : topSellers.frames.map((f,i)=>{
                  const max = parseFloat(topSellers.frames[0]?.revenue)||1;
                  return (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                      <Badge rank={i+1}/>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                          <span style={{fontSize:13,fontWeight:600,color:C.navy,flex:1,marginRight:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.frame}</span>
                          <span style={{fontSize:13,fontWeight:700,color:C.navy,flexShrink:0}}>{fmt(f.revenue)}</span>
                        </div>
                        <ProgBar pct={parseFloat(f.revenue)/max*100} color={C.navy}/>
                        <div style={{fontSize:10,color:C.muted,marginTop:3}}>{f.units} sold · avg {fmt(f.avg_price)}</div>
                      </div>
                    </div>
                  );
                })
              }
            </SectionCard>

            {/* Lens Types donut + list */}
            <SectionCard title="🔬 Lens Types" subtitle="3-month order count by lens type">
              {!topSellers?.lenses?.length
                ? <div style={{textAlign:'center',padding:20,color:C.muted,fontSize:13}}>No data yet</div>
                : (() => {
                  const LENS_COLORS = [C.navy,'#0891b2','#7c3aed','#f97316',C.success,'#ec4899','#14b8a6'];
                  const max = topSellers.lenses[0]?.units||1;
                  return (
                    <div style={{display:'flex',gap:20,alignItems:'flex-start',flexWrap:'wrap'}}>
                      <DonutChart size={120} thickness={24} segments={topSellers.lenses.slice(0,5).map((l,i)=>({value:l.units,color:LENS_COLORS[i%LENS_COLORS.length],label:l.lens_type}))}/>
                      <div style={{flex:1,minWidth:140}}>
                        {topSellers.lenses.map((l,i)=>(
                          <div key={i} style={{marginBottom:10}}>
                            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                              <div style={{display:'flex',alignItems:'center',gap:6}}>
                                <div style={{width:8,height:8,borderRadius:2,background:LENS_COLORS[i%LENS_COLORS.length],flexShrink:0}}/>
                                <span style={{fontSize:12,fontWeight:600,color:C.navy}}>{l.lens_type}</span>
                              </div>
                              <span style={{fontSize:12,color:C.muted}}>{l.units}</span>
                            </div>
                            <ProgBar pct={l.units/max*100} color={LENS_COLORS[i%LENS_COLORS.length]}/>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              }
            </SectionCard>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

            {/* Lens suppliers */}
            <SectionCard title="🏭 Lens Suppliers" subtitle="3-month orders and revenue by lab">
              {!topSellers?.companies?.length
                ? <div style={{textAlign:'center',padding:20,color:C.muted,fontSize:13}}>No data yet</div>
                : topSellers.companies.map((co,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                    <Badge rank={i+1}/>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:13,fontWeight:600,color:C.navy}}>{co.lens_company}</span>
                        <span style={{fontSize:13,fontWeight:700,color:C.success}}>{fmt(co.revenue)}</span>
                      </div>
                      <div style={{fontSize:11,color:C.muted}}>{co.units} orders</div>
                    </div>
                  </div>
                ))
              }
            </SectionCard>

            {/* Top coatings */}
            <SectionCard title="✨ Top Coatings" subtitle="3-month coating popularity">
              {!topSellers?.coatings?.length
                ? <div style={{textAlign:'center',padding:20,color:C.muted,fontSize:13}}>No data yet</div>
                : (() => {
                  const COAT_COLORS = [C.gold,'#0891b2',C.success,C.danger,'#7c3aed','#f97316'];
                  const max = topSellers.coatings[0]?.units||1;
                  return topSellers.coatings.map((co,i)=>(
                    <div key={i} style={{marginBottom:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:8,height:8,borderRadius:2,background:COAT_COLORS[i%COAT_COLORS.length],flexShrink:0}}/>
                          <span style={{fontSize:12,fontWeight:600,color:C.navy}}>{co.lens_coating}</span>
                        </div>
                        <span style={{fontSize:12,fontWeight:600,color:C.muted,background:'#f3f4f6',padding:'1px 8px',borderRadius:20}}>{co.units}</span>
                      </div>
                      <ProgBar pct={co.units/max*100} color={COAT_COLORS[i%COAT_COLORS.length]}/>
                    </div>
                  ));
                })()
              }
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}