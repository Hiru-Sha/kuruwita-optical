// ============================================================
//  Grinding.js — Assign orders to Negombo Optical / Solex
//  Shows unassigned orders, assign lab, track lens step
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b' };
const fmtMoney = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});

const LABS = ['Negombo Optical', 'Solex Optical', 'In-Shop'];
const STEPS = ['📤 Sent to lab', '⚙️ Grinding', '📦 Ready', '✅ Received'];
const STEP_COLORS = [C.gold, '#2563eb', '#7c3aed', C.success];

function api(path, method='GET', body=null) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, {
    method,
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r=>r.json());
}

export default function Grinding() {
  const [unassigned, setUnassigned] = useState([]);
  const [assigned,   setAssigned]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [assigning,  setAssigning]  = useState({}); // { orderId: lab }
  const [saving,     setSaving]     = useState(null);
  const [toast,      setToast]      = useState('');
  const [filter,     setFilter]     = useState('all'); // 'all' | 'negombo' | 'solex' | 'inshop'

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [all, jobs] = await Promise.all([
        api('/orders?status=created&limit=100'),
        api('/reports/lensjobs'),
      ]);
      // Unassigned = orders with no lens_company set
      setUnassigned((all||[]).filter(o => !o.lens_company || o.lens_company === ''));
      setAssigned(jobs||[]);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); },[load]);

  const handleAssign = async (orderId) => {
    const lab = assigning[orderId];
    if (!lab) return;
    setSaving(orderId);
    try {
      await api(`/orders/${orderId}`, 'PATCH', {
        lens_company: lab,
        lens_step: 0,
      });
      showToast(`Assigned to ${lab} ✓`);
      // Update state locally — no page reload
      setUnassigned(prev => prev.filter(o => o.id !== orderId));
      const moved = unassigned.find(o => o.id === orderId);
      if (moved) setAssigned(prev => [{ ...moved, lens_company: lab, lens_step: 0 }, ...prev]);
      setAssigning(a => { const n={...a}; delete n[orderId]; return n; });
    } catch(e) { console.error(e); }
    finally { setSaving(null); }
  };

  const handleStepUpdate = async (orderId, step) => {
    try {
      await api(`/orders/${orderId}`, 'PATCH', { lens_step: step });
      showToast(`Updated to: ${STEPS[step]}`);
      // Update state locally — no page reload
      setAssigned(prev => prev.map(o =>
        o.id === orderId ? { ...o, lens_step: step } : o
      ));
    } catch(e) { console.error(e); }
  };

  const filteredAssigned = assigned.filter(o => {
    if (filter === 'negombo') return o.lens_company === 'Negombo Optical';
    if (filter === 'solex')   return o.lens_company === 'Solex Optical';
    if (filter === 'inshop')  return o.lens_company === 'In-Shop';
    return true;
  });

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:C.navy, color:'white', padding:'12px 20px', borderRadius:12, fontSize:14, fontWeight:600, borderLeft:`4px solid ${C.gold}`, zIndex:500, boxShadow:'0 4px 20px rgba(0,0,0,.2)' }}>
          {toast}
        </div>
      )}

      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:'0 0 4px' }}>🔬 Grinding</h1>
      <p style={{ fontSize:13, color:C.muted, marginBottom:20 }}>Assign orders to labs and track lens progress</p>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:24 }}>
        {[
          { l:'Unassigned', v:unassigned.length, c:C.danger, dark:unassigned.length>0 },
          { l:'At Negombo', v:assigned.filter(o=>o.lens_company==='Negombo Optical').length, c:C.navy },
          { l:'At Solex',   v:assigned.filter(o=>o.lens_company==='Solex Optical').length, c:'#7c3aed' },
          { l:'In-Shop',    v:assigned.filter(o=>o.lens_company==='In-Shop').length, c:C.success },
          { l:'Ready',      v:assigned.filter(o=>parseInt(o.lens_step||0)>=2).length, c:C.gold },
        ].map(s=>(
          <div key={s.l} style={{ background:s.dark?C.danger:'white', border:`1px solid ${s.dark?C.danger:C.border}`, borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:s.dark?'rgba(255,255,255,.7)':C.muted, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:s.dark?'white':s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* ── UNASSIGNED ORDERS ── */}
      {unassigned.length > 0 && (
        <div style={{ background:'white', border:`2px solid ${C.danger}`, borderRadius:14, overflow:'hidden', marginBottom:24 }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, background:'#fff5f5', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <span style={{ fontSize:14, fontWeight:700, color:C.danger }}>⚠️ Needs Lab Assignment</span>
              <span style={{ fontSize:12, color:C.muted, marginLeft:10 }}>{unassigned.length} order{unassigned.length!==1?'s':''} waiting</span>
            </div>
          </div>

          {unassigned.map(o => (
            <div key={o.id} style={{ padding:'14px 18px', borderBottom:`1px solid ${C.cream}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{o.customer_name}</div>
                  <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                    {o.order_number} · {o.frame||'—'} · {o.lens_type||'—'} {o.lens_coating ? `· ${o.lens_coating}` : ''}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                    Deliver: {o.deliver_date?.slice(0,10)} · Balance: {fmtMoney(o.balance_amount)}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  {/* Lab selector */}
                  <div style={{ display:'flex', gap:4 }}>
                    {LABS.map(lab => (
                      <button key={lab} onClick={()=>setAssigning(a=>({...a,[o.id]:lab}))}
                        style={{ padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${assigning[o.id]===lab?C.navy:C.border}`, background:assigning[o.id]===lab?C.navy:'white', color:assigning[o.id]===lab?'white':C.muted, transition:'all .15s' }}>
                        {lab==='Negombo Optical'?'🏪 Negombo':lab==='Solex Optical'?'🔬 Solex':'🏠 In-Shop'}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={()=>handleAssign(o.id)}
                    disabled={!assigning[o.id] || saving===o.id}
                    style={{ padding:'8px 18px', background:assigning[o.id]?C.success:C.border, color:assigning[o.id]?'white':C.muted, border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:assigning[o.id]?'pointer':'not-allowed', fontFamily:'inherit' }}>
                    {saving===o.id ? '...' : '✓ Assign'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {unassigned.length === 0 && !loading && (
        <div style={{ background:'#dcfce7', border:`1px solid #86efac`, borderRadius:12, padding:'14px 18px', marginBottom:20, fontSize:14, color:C.success, fontWeight:600 }}>
          ✅ All orders have been assigned to a lab
        </div>
      )}

      {/* ── ASSIGNED JOBS ── */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
          <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>Active Lens Jobs</span>
          <div style={{ display:'flex', gap:6 }}>
            {[['all','All'],['negombo','Negombo'],['solex','Solex'],['inshop','In-Shop']].map(([k,l])=>(
              <button key={k} onClick={()=>setFilter(k)}
                style={{ padding:'5px 12px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${filter===k?C.navy:C.border}`, background:filter===k?C.navy:'white', color:filter===k?'white':C.muted }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading ? <div style={{ padding:24, textAlign:'center', color:C.muted }}>Loading...</div>
         : !filteredAssigned.length
           ? <div style={{ padding:24, textAlign:'center', color:C.muted, fontSize:13 }}>No active lens jobs</div>
           : filteredAssigned.map(o => {
              const step = parseInt(o.lens_step||0);
              return (
                <div key={o.id} style={{ padding:'14px 18px', borderBottom:`1px solid ${C.cream}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12, flexWrap:'wrap', gap:8 }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                        <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>{o.customer_name}</span>
                        <span style={{ background:STEP_COLORS[step]+'22', color:STEP_COLORS[step], fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20 }}>{STEPS[step]}</span>
                      </div>
                      <div style={{ fontSize:12, color:C.muted }}>
                        {o.order_number} · <b style={{color:C.navy}}>{o.lens_company}</b> · {o.frame||'—'} · {o.lens_type}
                        {o.lens_coating ? ` · ${o.lens_coating}` : ''}
                      </div>
                      <div style={{ fontSize:11, color:o.deliver_date&&new Date(o.deliver_date)<new Date()?C.danger:C.muted, marginTop:2 }}>
                        Deliver: {o.deliver_date?.slice(0,10)}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <a href={`https://wa.me/94${o.phone?.replace(/^0/,'')}?text=${encodeURIComponent(`Hello ${o.customer_name}, your order ${o.order_number} lens is ready. Please visit Kuruwita Optical. Thank you!`)}`}
                        target="_blank" rel="noreferrer"
                        style={{ padding:'6px 12px', background:'#25D366', color:'white', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none' }}>
                        💬 WA
                      </a>
                    </div>
                  </div>

                  {/* Step tracker — clickable */}
                  <div style={{ display:'flex', gap:0, background:C.cream, borderRadius:9, overflow:'hidden' }}>
                    {STEPS.map((s,i)=>(
                      <button key={i} onClick={()=>handleStepUpdate(o.id,i)}
                        style={{ flex:1, padding:'8px 4px', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:11, fontWeight:600, textAlign:'center', background:i===step?STEP_COLORS[i]:i<step?STEP_COLORS[i]+'33':'transparent', color:i<=step?i===step?'white':STEP_COLORS[i]:'#9ca3af', borderBottom:`3px solid ${i<=step?STEP_COLORS[i]:'transparent'}`, transition:'all .15s' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
        }
      </div>
    </div>
  );
}