/* eslint-disable */
import React, { useEffect, useState } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'var(--cream,#f8f5ef)',
  border:'var(--border,#e0ddd6)', muted:'var(--muted,#6b7280)',
  success:'#16a34a', danger:'#dc2626', surface:'var(--surface,#fff)'
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
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:dark?'white':color,lineHeight:1,marginBottom:sub?6:0}}>{value}</div>
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


// ── Stacked Area Chart ────────────────────────────────────────
function StackedAreaChart({ data, keys, colors, labelKey='month', height=180 }) {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map(d => keys.reduce((s,k)=>s+(parseFloat(d[k])||0),0))) || 1;
  const W=600, H=height, P=24;
  const gx = (i) => P + (i/(data.length-1||1)) * (W-2*P);
  const gy = (v) => H - P - (v/maxVal) * (H-2*P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height}}>
      {[...keys].reverse().map((key, ri) => {
        const idx = keys.length-1-ri;
        const top = data.map((d,i) => `${gx(i)},${gy(keys.slice(0,idx+1).reduce((s,k)=>s+(parseFloat(d[k])||0),0))}`).join(" ");
        const bot = idx===0
          ? data.map((_,i)=>`${gx(i)},${H-P}`).join(" ")
          : data.map((d,i)=>`${gx(i)},${gy(keys.slice(0,idx).reduce((s,k)=>s+(parseFloat(d[k])||0),0))}`).reverse().join(" ");
        return <polygon key={key} points={`${top} ${bot}`} fill={colors[idx]} opacity={0.85}/>;
      })}
      {data.map((d,i)=><text key={i} x={gx(i)} y={H-4} textAnchor="middle" fontSize="9" fill="#9ca3af">{d[labelKey]}</text>)}
    </svg>
  );
}
// ── Waterfall Chart ───────────────────────────────────────────
function WaterfallChart({ items=[], height=160 }) {
  const maxAbs = Math.max(...items.map(i=>Math.abs(i.value)),1);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:4,height,paddingTop:16,paddingBottom:22}}>
      {items.map((it,i)=>{
        const pct = Math.abs(it.value)/maxAbs*100;
        const isT=it.type==="total", isP=it.value>=0;
        return (
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <div style={{fontSize:9,fontWeight:700,color:isT?"white":isP?"#15803d":"#dc2626",
              background:isT?"#0f1f3d":"transparent",borderRadius:3,padding:"1px 3px",textAlign:"center"}}>
              {isP&&!isT?"+":""}{Math.abs(it.value)>=1000?`${(it.value/1000).toFixed(0)}K`:it.value}
            </div>
            <div style={{width:"100%",borderRadius:3,height:`${Math.max(pct*1.4,5)}px`,
              background:isT?"#0f1f3d":isP?"#86efac":"#fca5a5",
              border:`2px solid ${isT?"#0f1f3d":isP?"#15803d":"#dc2626"}`}}/>
            <div style={{fontSize:8,color:"#6b7280",textAlign:"center",marginTop:2,lineHeight:1.2}}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}
// ── Gauge Chart ───────────────────────────────────────────────
function GaugeChart({ value=0, max=100, label="", color="#15803d", size=88 }) {
  const pct=Math.min(Math.max(value/max,0),1), r=36, cx=50, cy=54;
  const pt=(deg)=>({x:cx+r*Math.cos(deg*Math.PI/180),y:cy-r*Math.sin(deg*Math.PI/180)});
  const s=pt(180),e=pt(180-pct*180);
  return (
    <svg viewBox="0 0 100 62" style={{width:size}}>
      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 1 1 ${cx+r} ${cy}`} fill="none" stroke="#e5e7eb" strokeWidth="9" strokeLinecap="round"/>
      {pct>0.01&&<path d={`M ${s.x} ${s.y} A ${r} ${r} 0 ${pct>.5?1:0} 1 ${e.x} ${e.y}`} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"/>}
      <text x={cx} y={cy-5} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f1f3d">{Math.round(pct*100)}%</text>
      <text x={cx} y={cy+6} textAnchor="middle" fontSize="7" fill="#9ca3af">{label}</text>
    </svg>
  );
}
// ── Sparkline ─────────────────────────────────────────────────
function Sparkline({ values=[], color="#c9a84c", width=70, height=26 }) {
  if (values.length<2) return null;
  const mx=Math.max(...values)||1, mn=Math.min(...values), rng=mx-mn||1;
  const pts=values.map((v,i)=>`${(i/(values.length-1))*width},${height-((v-mn)/rng)*height}`).join(" ");
  return <svg viewBox={`0 0 ${width} ${height}`} style={{width,height}}><polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
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
  const [compare,   setCompare]  = useState(null); // monthly comparison data

  useEffect(()=>{
    setLoading(true);
    Promise.all([
      api(`/reports/revenue?month=${month}`),
      api('/reports/topsellers'),
      api('/reports/lensjobs'),
      api('/reports/profit'),
      api(`/reports/comparison?month=${month}`),
    ]).then(([rev,top,jobs,prof,cmp])=>{ setRevenue(rev); setTop(top); setLensJobs(jobs); setProfit(prof); setCompare(cmp); })
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
    <div style={{fontFamily:"'Inter','DM Sans',sans-serif",maxWidth:1200,width:'100%',margin:'0 auto'}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:C.navy,margin:0}}>Reports</h1>
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
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
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
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
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
          {/* ══ THIS MONTH vs LAST MONTH vs SAME MONTH LAST YEAR ══ */}
          {compare && (
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:C.navy,marginBottom:4}}>📅 Monthly Comparison</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:16}}>
                This month vs last month vs same month last year
              </div>

              {/* 3-column comparison cards */}
              {[
                {key:'revenue',    label:'Revenue',     color:'#0f1f3d', icon:'💰', fmt:fmtK},
                {key:'net_profit', label:'Net Profit',  color:C.success, icon:'📈', fmt:fmtK},
                {key:'expenses',   label:'Expenses',    color:C.danger,  icon:'💸', fmt:fmtK},
                {key:'order_count',label:'Orders',      color:'#7c3aed', icon:'📋', fmt:(v)=>v},
              ].map(metric => {
                const tm = compare.thisMonth?.[metric.key] || 0;
                const pm = compare.prevMonth?.[metric.key] || 0;
                const ly = compare.lastYearMonth?.[metric.key] || 0;
                const vsMo = pm>0 ? Math.round((tm-pm)/pm*100) : 0;
                const vsYr = ly>0 ? Math.round((tm-ly)/ly*100) : 0;
                return (
                  <div key={metric.key} style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:14,padding:'16px 20px',marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.navy}}>{metric.icon} {metric.label}</div>
                      <div style={{display:'flex',gap:8}}>
                        <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,fontWeight:700,
                          background:vsMo>=0?'#dcfce7':'#fee2e2',color:vsMo>=0?C.success:C.danger}}>
                          {vsMo>=0?'▲':'▼'} {Math.abs(vsMo)}% vs last mo
                        </span>
                        <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,fontWeight:700,
                          background:vsYr>=0?'#dbeafe':'#fef9c3',color:vsYr>=0?'#1d4ed8':'#92400e'}}>
                          {vsYr>=0?'▲':'▼'} {Math.abs(vsYr)}% vs last yr
                        </span>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                      {[
                        {label:`This Month (${compare.thisMonth?.month||'—'})`, val:tm, highlight:true},
                        {label:`Last Month (${compare.prevMonth?.month||'—'})`, val:pm},
                        {label:`Last Year (${compare.lastYearMonth?.month||'—'})`, val:ly},
                      ].map((col,ci)=>(
                        <div key={ci} style={{background:col.highlight?`${metric.color}12`:C.cream,borderRadius:10,padding:'12px 14px',
                          border:col.highlight?`2px solid ${metric.color}33`:`1px solid ${C.border}`}}>
                          <div style={{fontSize:10,color:C.muted,marginBottom:6,fontWeight:600}}>{col.label}</div>
                          <div style={{fontSize:20,fontWeight:800,color:col.highlight?metric.color:C.navy}}>{metric.fmt(col.val)}</div>
                          {ci>0 && pm>0 && (
                            <div style={{fontSize:10,color:tm>col.val?C.success:C.danger,marginTop:4,fontWeight:600}}>
                              {tm>col.val?'▼ lower':'▲ higher'} this mo
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* P&L Waterfall for this month */}
              <SectionCard title="📊 This Month P&L Breakdown" subtitle="How revenue flows to net profit">
                <WaterfallChart height={160} items={[
                  {label:'Orders',       value:Math.round(compare.thisMonth?.order_revenue||0),  type:'pos'},
                  {label:'Quick Sales',  value:Math.round(compare.thisMonth?.qs_revenue||0),     type:'pos'},
                  {label:'Repairs',      value:Math.round(compare.thisMonth?.repair_revenue||0), type:'pos'},
                  {label:'Frame COGS',   value:-Math.round(compare.thisMonth?.cogs||0),          type:'neg'},
                  {label:'Expenses',     value:-Math.round(compare.thisMonth?.expenses||0),      type:'neg'},
                  {label:'Net Profit',   value:Math.round(compare.thisMonth?.net_profit||0),     type:'total'},
                ]}/>
              </SectionCard>

              {/* 3 Gauges */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
                {[
                  {label:'Net Margin', val:Math.max(compare.thisMonth?.net_margin||0,0), max:100, color:C.success},
                  {label:'Collection Rate', val:compare.thisMonth?.revenue>0?Math.round((compare.thisMonth?.collected||0)/compare.thisMonth.revenue*100):0, max:100, color:'#0891b2'},
                  {label:'Repair Revenue %', val:compare.thisMonth?.revenue>0?Math.round((compare.thisMonth?.repair_revenue||0)/compare.thisMonth.revenue*100):0, max:100, color:'#7c3aed'},
                ].map((g,i)=>(
                  <div key={i} style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:14,padding:'16px',textAlign:'center'}}>
                    <GaugeChart value={g.val} max={g.max} label={g.label} color={g.color} size={100}/>
                    <div style={{fontSize:12,fontWeight:700,color:C.navy,marginTop:6}}>{g.label}</div>
                    <div style={{fontSize:11,color:C.muted}}>{g.val}% this month</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ 6-MONTH TRENDS ══ */}
          {profit?.monthly?.length > 0 ? (
            <div>
              {/* Stacked area chart — revenue streams */}
              <SectionCard title="📈 Revenue Streams (Stacked Area)" subtitle="Orders + Quick Sales + Repairs over time">
                <StackedAreaChart
                  data={profit.monthly}
                  keys={['order_revenue','qs_revenue','repair_revenue']}
                  colors={[C.navy,'#0891b2','#7c3aed']}
                  labelKey="month" height={180}/>
                <Legend items={[{label:'Orders',color:C.navy},{label:'Quick Sales',color:'#0891b2'},{label:'Repairs',color:'#7c3aed'}]}/>
              </SectionCard>

              {/* Revenue vs Net Profit line */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                <SectionCard title="Revenue vs Net Profit" subtitle="6-month trend">
                  <LineChart data={profit.monthly} valueKey="revenue"    labelKey="month" color={C.navy}    height={110}/>
                  <div style={{height:6}}/>
                  <LineChart data={profit.monthly} valueKey="net_profit" labelKey="month" color={C.success} height={110}/>
                  <Legend items={[{label:'Revenue',color:C.navy},{label:'Net Profit',color:C.success}]}/>
                </SectionCard>
                <SectionCard title="Cost Breakdown" subtitle="COGS vs Operating Expenses">
                  <MultiBarChart data={profit.monthly} keys={['cost_of_goods','expenses']}
                    colors={[C.danger,'#f97316']} labelKey="month" height={220}/>
                  <Legend items={[{label:'COGS',color:C.danger},{label:'Expenses',color:'#f97316'}]}/>
                </SectionCard>
              </div>

              {/* Margin % bars */}
              <SectionCard title="Net Margin % Trend" subtitle="Your monthly take-home percentage">
                <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120}}>
                  {profit.monthly.map((m,i)=>{
                    const pct=parseFloat(m.net_margin)||0, pos=pct>=0;
                    return (
                      <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                        <div style={{fontSize:10,fontWeight:700,color:pos?C.success:C.danger}}>{pct}%</div>
                        <div style={{width:'100%',background:pos?C.success:C.danger,borderRadius:'6px 6px 0 0',
                          height:`${Math.max(Math.abs(pct)/50*80,3)}%`,minHeight:3,opacity:.85}}/>
                        <div style={{fontSize:9,color:C.muted}}>{m.month}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:12,fontSize:12,color:C.muted}}>
                  <span>Best: <b style={{color:C.success}}>{Math.max(...profit.monthly.map(m=>parseFloat(m.net_margin)||0))}%</b></span>
                  <span>Avg: <b style={{color:C.navy}}>{Math.round(profit.monthly.reduce((s,m)=>s+(parseFloat(m.net_margin)||0),0)/profit.monthly.length)}%</b></span>
                  <span>Latest: <b style={{color:C.navy}}>{profit.monthly[profit.monthly.length-1]?.net_margin}%</b></span>
                </div>
              </SectionCard>

              {/* Revenue source stacked bars */}
              {revenue?.trend?.length > 0 && (
                <SectionCard title="Monthly Revenue Mix" subtitle="Orders vs Quick Sales vs Repairs">
                  <div style={{overflowX:'auto'}}>
                    {revenue.trend.map((m,i)=>{
                      const tot=(parseFloat(m.order_revenue)||0)+(parseFloat(m.qs_revenue)||0)+(parseFloat(m.repair_revenue)||0)||1;
                      return (
                        <div key={i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                          <div style={{fontSize:11,fontWeight:600,color:C.navy,minWidth:38}}>{m.month}</div>
                          <div style={{flex:1,height:22,borderRadius:11,overflow:'hidden',display:'flex',background:'#f3f4f6'}}>
                            {[{v:parseFloat(m.order_revenue)||0,c:C.navy},{v:parseFloat(m.qs_revenue)||0,c:'#0891b2'},{v:parseFloat(m.repair_revenue)||0,c:'#7c3aed'}].map((s,si)=>(
                              <div key={si} style={{width:`${s.v/tot*100}%`,background:s.c,display:'flex',alignItems:'center',justifyContent:'center',minWidth:s.v>0?20:0}}>
                                {s.v/tot>0.1&&<span style={{fontSize:9,color:'white',fontWeight:700}}>{Math.round(s.v/tot*100)}%</span>}
                              </div>
                            ))}
                          </div>
                          <div style={{fontSize:11,fontWeight:700,color:C.navy,minWidth:60,textAlign:'right'}}>{fmtK(tot)}</div>
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