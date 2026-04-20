// ============================================================
//  Reports Page — connected to /api/reports
// ============================================================
import React, { useEffect, useState } from 'react';
import { getRevenue, getTopSellers, getLensJobs } from '../api';

const MONTHS = ['2025-11','2025-12','2026-01','2026-02','2026-03','2026-04'];
const MONTH_LABELS = ['Nov 2025','Dec 2025','Jan 2026','Feb 2026','Mar 2026','Apr 2026'];

export default function Reports() {
  const [tab,       setTab]     = useState('revenue');
  const [month,     setMonth]   = useState('2026-04');
  const [revenue,   setRevenue] = useState(null);
  const [sellers,   setSellers] = useState(null);
  const [lensJobs,  setLensJobs]= useState([]);
  const [loading,   setLoading] = useState(false);

  useEffect(() => {
    if (tab === 'revenue') {
      setLoading(true);
      getRevenue(month).then(r=>setRevenue(r.data)).finally(()=>setLoading(false));
    }
    if (tab === 'topsellers') {
      setLoading(true);
      getTopSellers().then(r=>setSellers(r.data)).finally(()=>setLoading(false));
    }
    if (tab === 'lensjobs') {
      setLoading(true);
      getLensJobs().then(r=>setLensJobs(r.data)).finally(()=>setLoading(false));
    }
  }, [tab, month]);

  const lensStepLabel = s => ['📤 Sent','⚙️ Grinding','📦 Ready','✅ Received'][s] || '—';
  const lensStepColor = s => [['#dbeafe','#1e40af'],['#fef9c3','#854d0e'],['#dcfce7','#2d7a4f'],['#d1fae5','#065f46']][s] || ['#f3f4f6','#6b7280'];

  return (
    <div>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:'#0f1f3d', margin:'0 0 4px' }}>📊 Reports</h1>
      <p style={{ fontSize:13, color:'#6b7280', marginBottom:20 }}>Revenue, lens jobs and best-selling frames</p>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid #e0ddd6', marginBottom:20, overflowX:'auto' }}>
        {[['revenue','💰 Revenue'],['lensjobs','🔬 Lens Jobs'],['topsellers','🏆 Top Sellers']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{ padding:'11px 18px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap',
              color:tab===k?'#0f1f3d':'#6b7280', borderBottom:`2.5px solid ${tab===k?'#c9a84c':'transparent'}`, marginBottom:-1 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Revenue tab */}
      {tab==='revenue' && (
        <>
          {/* Month selector */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:18 }}>
            {MONTHS.map((m,i)=>(
              <button key={m} onClick={()=>setMonth(m)}
                style={{ padding:'6px 14px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', border:'1.5px solid', fontFamily:'inherit',
                  background:month===m?'#0f1f3d':'white', color:month===m?'white':'#6b7280', borderColor:month===m?'#0f1f3d':'#e0ddd6' }}>
                {MONTH_LABELS[i]}
              </button>
            ))}
          </div>

          {loading ? <p style={{color:'#6b7280',fontSize:13}}>Loading...</p> : revenue && (
            <>
              {/* KPIs */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10, marginBottom:20 }}>
                {[
                  { l:'Total Billed',  v:`Rs. ${Math.round(revenue.summary?.total||0).toLocaleString()}`,     dark:true },
                  { l:'Collected',     v:`Rs. ${Math.round(revenue.summary?.collected||0).toLocaleString()}`, c:'#2d7a4f' },
                  { l:'Still Owed',    v:`Rs. ${Math.round(revenue.summary?.owed||0).toLocaleString()}`,      c:'#c0392b' },
                  { l:'Total Orders',  v: revenue.summary?.order_count||0, c:'#2563eb' },
                ].map(s=>(
                  <div key={s.l} style={{ background: s.dark?'#0f1f3d':'white', border:'1px solid #e0ddd6', borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color: s.dark?'#c9a84c':'#6b7280', marginBottom:6 }}>{s.l}</div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color: s.dark?'white':s.c||'#0f1f3d' }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Order table */}
              <div style={{ background:'white', border:'1px solid #e0ddd6', borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'13px 18px', borderBottom:'1px solid #e0ddd6' }}>
                  <span style={{ fontSize:14, fontWeight:700, color:'#0f1f3d' }}>Order breakdown — {MONTH_LABELS[MONTHS.indexOf(month)]}</span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr>{['Order #','Customer','Frame & Lens','Total','Advance','Balance'].map(h=>(
                        <th key={h} style={{ background:'#f8f5ef', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:'#6b7280', padding:'9px 14px', textAlign:'left', borderBottom:'1px solid #e0ddd6' }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {!revenue.orders?.length
                        ? <tr><td colSpan={6} style={{ padding:20, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No orders this month</td></tr>
                        : revenue.orders.map(o=>(
                          <tr key={o.id}>
                            <td style={{ padding:'11px 14px', fontSize:13, borderTop:'1px solid #f8f5ef' }}><b>{o.order_number}</b></td>
                            <td style={{ padding:'11px 14px', fontSize:13, borderTop:'1px solid #f8f5ef' }}>{o.customer_name}</td>
                            <td style={{ padding:'11px 14px', fontSize:12, color:'#6b7280', borderTop:'1px solid #f8f5ef' }}>{o.frame} · {o.lens_type}</td>
                            <td style={{ padding:'11px 14px', fontSize:13, borderTop:'1px solid #f8f5ef' }}>Rs. {parseFloat(o.total_amount||0).toLocaleString()}</td>
                            <td style={{ padding:'11px 14px', fontSize:13, borderTop:'1px solid #f8f5ef' }}>Rs. {parseFloat(o.advance_amount||0).toLocaleString()}</td>
                            <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700, textAlign:'right', color: parseFloat(o.balance_amount)>0?'#c0392b':'#2d7a4f', borderTop:'1px solid #f8f5ef' }}>
                              {parseFloat(o.balance_amount)>0 ? `Rs. ${parseFloat(o.balance_amount).toLocaleString()}` : 'Paid ✓'}
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Lens jobs tab */}
      {tab==='lensjobs' && (
        loading ? <p style={{color:'#6b7280',fontSize:13}}>Loading...</p> :
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:14 }}>
          {['Negombo Optical','Solex Optical'].map(lab => {
            const jobs = lensJobs.filter(j=>j.lens_company===lab);
            return (
              <div key={lab} style={{ background:'white', border:'1px solid #e0ddd6', borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'13px 18px', borderBottom:'1px solid #e0ddd6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:14, fontWeight:700, color:'#0f1f3d' }}>🔬 {lab}</span>
                  <span style={{ background:'#f3e8ff', color:'#7c3aed', fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>{jobs.length} active</span>
                </div>
                <div style={{ padding:'6px 18px' }}>
                  {!jobs.length
                    ? <p style={{ padding:'12px 0', color:'#9ca3af', fontSize:13 }}>No active jobs</p>
                    : jobs.map(j=>{
                      const [bg,cl] = lensStepColor(j.lens_step);
                      return (
                        <div key={j.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 0', borderBottom:'1px solid #f8f5ef' }}>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:'#0f1f3d' }}>{j.order_number} · {j.customer_name}</div>
                            <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>{j.lens_type} · Deliver {j.deliver_date?.slice(0,10)}</div>
                          </div>
                          <span style={{ background:bg, color:cl, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' }}>
                            {lensStepLabel(j.lens_step)}
                          </span>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Top sellers tab */}
      {tab==='topsellers' && (
        loading ? <p style={{color:'#6b7280',fontSize:13}}>Loading...</p> : sellers && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:16 }}>
            <div style={{ background:'white', border:'1px solid #e0ddd6', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'13px 18px', borderBottom:'1px solid #e0ddd6' }}>
                <span style={{ fontSize:14, fontWeight:700, color:'#0f1f3d' }}>🏆 Best-selling frames</span>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>
                  {['Frame','Units','Revenue'].map(h=><th key={h} style={{ background:'#f8f5ef', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:'#6b7280', padding:'8px 14px', textAlign:'left', borderBottom:'1px solid #e0ddd6' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(sellers.frames||[]).map((f,i)=>(
                    <tr key={i}>
                      <td style={{ padding:'10px 14px', fontSize:13, borderTop:'1px solid #f8f5ef' }}>{['🥇','🥈','🥉'][i]||'  '} {f.frame}</td>
                      <td style={{ padding:'10px 14px', fontSize:13, borderTop:'1px solid #f8f5ef', fontWeight:700, color:'#0f1f3d' }}>{f.units}</td>
                      <td style={{ padding:'10px 14px', fontSize:13, borderTop:'1px solid #f8f5ef', color:'#2d7a4f', fontWeight:700 }}>Rs. {parseFloat(f.revenue||0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ background:'white', border:'1px solid #e0ddd6', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'13px 18px', borderBottom:'1px solid #e0ddd6' }}>
                <span style={{ fontSize:14, fontWeight:700, color:'#0f1f3d' }}>🔬 Lens types ordered</span>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>
                  {['Lens Type','Orders'].map(h=><th key={h} style={{ background:'#f8f5ef', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:'#6b7280', padding:'8px 14px', textAlign:'left', borderBottom:'1px solid #e0ddd6' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(sellers.lenses||[]).map((l,i)=>(
                    <tr key={i}>
                      <td style={{ padding:'10px 14px', fontSize:13, borderTop:'1px solid #f8f5ef' }}>{l.lens_type}</td>
                      <td style={{ padding:'10px 14px', fontSize:13, borderTop:'1px solid #f8f5ef', fontWeight:700, color:'#0f1f3d' }}>{l.units}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
