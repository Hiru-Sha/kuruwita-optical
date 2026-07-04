/* eslint-disable */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  surface:'white', border:'#e0ddd6', muted:'#6b7280',
  success:'#15803d', danger:'#dc2626', warning:'#b45309',
};
const fmtDate = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
function addMonths(dateStr, months) {
  if (!dateStr || !months) return null;
  const d = new Date(dateStr+'T00:00:00'); d.setMonth(d.getMonth()+months);
  return d.toISOString().split('T')[0];
}
function monthsToNum(str) {
  if (!str) return 0;
  if (str.includes('year'))  return parseInt(str)*12;
  if (str.includes('month')) return parseInt(str);
  return 0;
}
function warrantyStatus(createdAt, warrantyStr) {
  const months = monthsToNum(warrantyStr);
  if (!months || !createdAt) return null;
  const expiry = addMonths(createdAt.slice(0,10), months);
  const daysLeft = Math.round((new Date(expiry) - new Date()) / 86400000);
  return { expiry, daysLeft, expired: daysLeft < 0 };
}
function apiGet(path) {
  const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json());
}
function apiPost(path, body) {
  const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify(body) }).then(r=>r.json());
}
const INP = { padding:'10px 14px', border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:14, fontFamily:'inherit', outline:'none', background:'white', color:C.navy, width:'100%' };

export default function Warranty() {
  const navigate = useNavigate();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('active');
  const [selected, setSelected] = useState(null); // selected order for claim modal
  const [claim,    setClaim]    = useState({ type:'both', issue:'', action:'Replaced', charge:0 });
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet('/orders?limit=500');
      const all = Array.isArray(res) ? res : (res.data || res.orders || []);
      setOrders(all.filter(o => o.warranty_frame || o.warranty_lens));
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const enriched = orders.map(o => {
    const frame = warrantyStatus(o.created_at, o.warranty_frame);
    const lens  = warrantyStatus(o.created_at, o.warranty_lens);
    const minDays = Math.min(frame?.daysLeft??Infinity, lens?.daysLeft??Infinity);
    const expired = (frame?.expired&&(lens?.expired??true)) || (!frame&&lens?.expired) || (frame?.expired&&!lens);
    const expiring = !expired && minDays<=30 && minDays>=0;
    return { ...o, _frame:frame, _lens:lens, _minDays:minDays, _expired:expired, _expiring:expiring };
  });

  const filtered = enriched.filter(o => {
    if (filter==='active')   return !o._expired;
    if (filter==='expired')  return o._expired;
    if (filter==='expiring') return o._expiring;
    return true;
  }).filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (o.order_number||'').toLowerCase().includes(s) || (o.customer_name||'').toLowerCase().includes(s);
  });

  const stats = {
    total: enriched.length,
    active: enriched.filter(o=>!o._expired).length,
    expiring: enriched.filter(o=>o._expiring).length,
    expired: enriched.filter(o=>o._expired).length,
  };

  const handleFileClaim = async () => {
    if (!selected) return;
    if (!claim.issue.trim()) return showToast('Please describe the issue');
    setSaving(true);
    try {
      await apiPost('/repairs', {
        customer_name:   selected.customer_name,
        phone:           selected.phone,
        customer_id:     selected.customer_id,
        repair_type:     `🛡️ Warranty — ${claim.type==='both'?'Frame & Lens':claim.type==='frame'?'Frame Only':'Lens Only'}`,
        description:     claim.issue,
        frame_description: selected.frame || '',
        charge:          parseFloat(claim.charge) || 0,
        payment_method:  'cash',
        status:          'done',
        notes:           `WARRANTY CLAIM | Order: ${selected.order_number} | Frame warranty: ${selected.warranty_frame||'—'} | Lens warranty: ${selected.warranty_lens||'—'} | Action: ${claim.action}`,
      });
      showToast(`✅ Warranty claim filed for ${selected.order_number}`);
      setSelected(null);
      setClaim({ type:'both', issue:'', action:'Replaced', charge:0 });
    } catch(e) {
      showToast('❌ Failed to file claim');
    }
    setSaving(false);
  };

  return (
    <div style={{ fontFamily:"'Inter','DM Sans',sans-serif", maxWidth:1200, width:'100%', margin:'0 auto' }}>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, background:toast[0]==='✅'?'#dcfce7':'#fee2e2', color:toast[0]==='✅'?C.success:C.danger, padding:'12px 20px', borderRadius:12, fontWeight:700, fontSize:14, zIndex:999, boxShadow:'0 4px 20px rgba(0,0,0,.15)' }}>
          {toast}
        </div>
      )}

      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:C.navy, margin:'0 0 4px' }}>🛡️ Warranty</h1>
      <p style={{ fontSize:13, color:C.muted, margin:'0 0 20px' }}>Track active warranties · File claims · View repair history</p>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { l:'Total Warranties', v:stats.total,    col:C.navy,    bg:'white',    icon:'🛡️', f:'all'      },
          { l:'Active',           v:stats.active,   col:C.success, bg:'#f0fdf4',  icon:'✅', f:'active'   },
          { l:'Expiring Soon',    v:stats.expiring, col:C.warning, bg:'#fffbeb',  icon:'⚠️', f:'expiring' },
          { l:'Expired',          v:stats.expired,  col:C.danger,  bg:'#fef2f2',  icon:'❌', f:'expired'  },
        ].map(s => (
          <div key={s.l} onClick={()=>setFilter(s.f)}
            style={{ background:s.bg, border:`1.5px solid ${s.col}22`, borderRadius:12, padding:'16px', cursor:'pointer',
              boxShadow: filter===s.f ? `0 0 0 2px ${s.col}` : 'none', transition:'all .12s' }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:s.col }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by name, phone, order #..."
          style={{ ...INP, maxWidth:340 }}/>
        <div style={{ display:'flex', gap:6 }}>
          {[{v:'all',l:'All'},{v:'active',l:'✅ Active'},{v:'expiring',l:'⚠️ Expiring'},{v:'expired',l:'❌ Expired'}].map(f=>(
            <button key={f.v} onClick={()=>setFilter(f.v)}
              style={{ padding:'9px 16px', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:'none',
                background: filter===f.v ? C.navy : C.cream, color: filter===f.v ? 'white' : C.muted }}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:C.muted }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:40, textAlign:'center', color:C.muted }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🛡️</div>
          <div style={{ fontSize:16, fontWeight:600, color:C.navy, marginBottom:6 }}>
            {orders.length === 0 ? 'No warranty records yet' : 'No orders match this filter'}
          </div>
          <div style={{ fontSize:13 }}>Set warranty period in Step 4 when creating a New Order.</div>
        </div>
      ) : (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'130px 1fr 120px 160px 160px 140px', background:C.navy, color:'white', padding:'12px 16px', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px' }}>
            <div>Order</div><div>Customer</div><div>Date</div><div>🖼️ Frame</div><div>👁️ Lens</div><div>Actions</div>
          </div>
          {filtered.map((o,i) => {
            const fS = o._frame, lS = o._lens;
            const rowSt = o._expired?'expired':o._expiring?'expiring':'active';
            const bg = i%2===0?'white':'#fafafa';
            return (
              <div key={o.id} style={{ display:'grid', gridTemplateColumns:'130px 1fr 120px 160px 160px 140px',
                padding:'14px 16px', borderBottom:`1px solid ${C.border}`, background:bg, alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{o.order_number}</div>
                  <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700,
                    background:rowSt==='active'?'#dcfce7':rowSt==='expiring'?'#fef9c3':'#fee2e2',
                    color:rowSt==='active'?C.success:rowSt==='expiring'?C.warning:C.danger }}>
                    {rowSt==='active'?'✅ Active':rowSt==='expiring'?'⚠️ Expiring':'❌ Expired'}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{o.customer_name||'—'}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{o.phone||''}</div>
                </div>
                <div style={{ fontSize:12, color:C.muted }}>{fmtDate(o.created_at?.slice(0,10))}</div>
                <div>
                  {o.warranty_frame ? (
                    <>
                      <div style={{ fontSize:12, fontWeight:600, color:C.navy }}>🛡️ {o.warranty_frame}</div>
                      {fS && <div style={{ fontSize:11, color:fS.expired?C.danger:fS.daysLeft<=30?C.warning:C.success }}>
                        {fS.expired?`Expired ${Math.abs(fS.daysLeft)}d ago`:fS.daysLeft===0?'Expires today!':`${fS.daysLeft}d · ${fmtDate(fS.expiry)}`}
                      </div>}
                    </>
                  ) : <span style={{ fontSize:11, color:C.border }}>—</span>}
                </div>
                <div>
                  {o.warranty_lens ? (
                    <>
                      <div style={{ fontSize:12, fontWeight:600, color:C.navy }}>🛡️ {o.warranty_lens}</div>
                      {lS && <div style={{ fontSize:11, color:lS.expired?C.danger:lS.daysLeft<=30?C.warning:C.success }}>
                        {lS.expired?`Expired ${Math.abs(lS.daysLeft)}d ago`:lS.daysLeft===0?'Expires today!':`${lS.daysLeft}d · ${fmtDate(lS.expiry)}`}
                      </div>}
                    </>
                  ) : <span style={{ fontSize:11, color:C.border }}>—</span>}
                </div>
                {/* Actions */}
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {!o._expired && (
                    <button onClick={()=>{ setSelected(o); setClaim({type:'both',issue:'',action:'Replaced',charge:0}); }}
                      style={{ padding:'6px 10px', background:'#0f1f3d', color:'white', border:'none', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      📋 File Claim
                    </button>
                  )}
                  <button onClick={()=>navigate('/orders?search='+o.order_number)}
                    style={{ padding:'6px 10px', background:C.cream, color:C.navy, border:`1px solid ${C.border}`, borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    View Order →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CLAIM MODAL ── */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'white', borderRadius:16, padding:28, maxWidth:500, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:C.navy }}>📋 File Warranty Claim</div>
                <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>
                  {selected.order_number} · {selected.customer_name}
                </div>
                <div style={{ display:'flex', gap:6, marginTop:6 }}>
                  {selected.warranty_frame && <span style={{ fontSize:11, background:'#dcfce7', color:'#15803d', padding:'2px 10px', borderRadius:20, fontWeight:700 }}>🖼️ Frame: {selected.warranty_frame}</span>}
                  {selected.warranty_lens  && <span style={{ fontSize:11, background:'#dbeafe', color:'#1d4ed8', padding:'2px 10px', borderRadius:20, fontWeight:700 }}>👁️ Lens: {selected.warranty_lens}</span>}
                </div>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:C.muted }}>✕</button>
            </div>

            {/* What's covered */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:8 }}>Coverage Type</label>
              <div style={{ display:'flex', gap:8 }}>
                {[{v:'frame',l:'🖼️ Frame'},{v:'lens',l:'👁️ Lens'},{v:'both',l:'🔄 Both'}].map(t=>(
                  <button key={t.v} onClick={()=>setClaim(c=>({...c,type:t.v}))}
                    style={{ flex:1, padding:'9px', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                      border:'none', background:claim.type===t.v?C.navy:C.cream, color:claim.type===t.v?'white':C.muted }}>
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Issue description */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>Issue Description *</label>
              <textarea value={claim.issue} onChange={e=>setClaim(c=>({...c,issue:e.target.value}))}
                placeholder="Describe the problem (e.g. lens scratched, coating peeled, frame broken at hinge...)"
                style={{ ...INP, resize:'vertical', minHeight:80, lineHeight:1.6 }}/>
            </div>

            {/* Action taken */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:8 }}>Action Taken</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {['Replaced','Repaired','Sent to Lab','Pending'].map(a=>(
                  <button key={a} onClick={()=>setClaim(c=>({...c,action:a}))}
                    style={{ padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                      border:'none', background:claim.action===a?C.navy:C.cream, color:claim.action===a?'white':C.muted }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Charge (if any) */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>Charge (Rs.) — leave 0 if fully covered</label>
              <input type="number" value={claim.charge} onChange={e=>setClaim(c=>({...c,charge:e.target.value}))}
                placeholder="0" style={INP}/>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setSelected(null)}
                style={{ flex:1, padding:'12px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
                Cancel
              </button>
              <button onClick={handleFileClaim} disabled={saving}
                style={{ flex:2, padding:'12px', background:saving?C.muted:C.navy, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
                {saving ? 'Filing...' : '📋 File Claim → Creates Repair Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}