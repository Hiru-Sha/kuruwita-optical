/* eslint-disable */
// ============================================================
//  Repairs.js — Frame repair management
//  Arm repair, polishing, nose pads, nails, etc.
//  Records repair, prints receipt, tracks history
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};
const fmt     = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0,maximumFractionDigits:0});
const fmtFull = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2});
const fmtDate = (d) => { if(!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); };
const fmtTime = (d) => { if(!d) return '—'; return new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); };
const thisMonth = () => new Date().toISOString().slice(0,7);

const INP = { padding:'10px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%', boxSizing:'border-box' };

// ── Common repair types with typical charges ──────────────────
const REPAIR_TYPES = [
  { label:'Arm Repair',           icon:'🔧', price:200 },
  { label:'Nose Pad Replacement', icon:'👃', price:100 },
  { label:'Frame Polishing',      icon:'✨', price:300 },
  { label:'Screw / Nail Fix',     icon:'🔩', price:100 },
  { label:'Lens Refit',           icon:'🔬', price:150 },
  { label:'Hinge Repair',         icon:'⚙️',  price:250 },
  { label:'Frame Straightening',  icon:'📐', price:200 },
  { label:'Temple Tip Repair',    icon:'🔧', price:150 },
  { label:'Bridge Repair',        icon:'🌉', price:300 },
  { label:'Lens Cleaning',        icon:'🧴', price:100 },
  { label:'Other Repair',         icon:'🛠️', price:0   },
];

// ── Print receipt for repair ──────────────────────────────────
const printRepairReceipt = (repair) => {
  const today = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
  const time  = new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${repair.repair_number}</title>
<style>
  @page{size:A6 portrait;margin:6mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;color:#0f1f3d;font-size:13px}
</style></head><body>
<div style="max-width:340px;margin:0 auto">
  <div style="background:#0f1f3d;border-radius:10px;padding:14px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div style="font-family:Georgia,serif;font-size:17px;font-weight:700;color:white;margin-bottom:2px">👁️ Wickramakalutota Opticals</div>
      <div style="font-size:9px;color:#c9a84c;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px">Repair Receipt</div>
      <div style="font-size:10px;color:#ede9e0">No.57 Kurunegala Road, Chilaw | 032 222 1211</div>
    </div>
    <div style="text-align:right">
      <div style="background:#c9a84c;color:#0f1f3d;font-weight:700;font-size:13px;padding:4px 10px;border-radius:7px;margin-bottom:4px">${repair.repair_number}</div>
      <div style="font-size:10px;color:#ede9e0">${today} ${time}</div>
    </div>
  </div>

  ${repair.customer_name ? `
  <div style="background:#f8f5ef;border-radius:8px;padding:9px 12px;margin-bottom:12px">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:4px">Customer</div>
    <div style="font-size:14px;font-weight:700;color:#0f1f3d">${repair.customer_name}</div>
    ${repair.phone ? `<div style="font-size:12px;color:#6b7280">📞 ${repair.phone}</div>` : ''}
  </div>` : ''}

  <div style="background:#f8f5ef;border-radius:8px;padding:12px;margin-bottom:12px">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:6px">Repair Details</div>
    <div style="font-size:15px;font-weight:700;color:#0f1f3d;margin-bottom:4px">${repair.repair_type}</div>
    ${repair.description ? `<div style="font-size:12px;color:#6b7280;margin-bottom:4px">${repair.description}</div>` : ''}
    ${repair.notes ? `<div style="font-size:11px;color:#6b7280;font-style:italic">${repair.notes}</div>` : ''}
  </div>

  <div style="background:#0f1f3d;border-radius:10px;padding:14px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:9px;color:#c9a84c;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Amount Paid</div>
      <div style="font-size:10px;color:#ede9e0">${repair.payment_method==='bank'?'🏦 Bank Transfer':'💵 Cash'}</div>
    </div>
    <div style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#c9a84c">${fmtFull(repair.charge)}</div>
  </div>

  <div style="border-top:2px solid #0f1f3d;padding-top:10px;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:11px;color:#6b7280">
      <div style="font-weight:700;color:#0f1f3d;margin-bottom:2px">Wickramakalutota Opticals</div>
      <div>Thank you for your trust! 🙏</div>
    </div>
    <div style="font-size:20px">👁️</div>
  </div>
</div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
</body></html>`;

  const win = window.open('','_blank','width=600,height=800');
  if (!win) { alert('Please allow popups to print receipts.'); return; }
  win.document.open(); win.document.write(html); win.document.close();
};

function apiGet(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json());
}
function apiPost(path, body) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body:JSON.stringify(body) }).then(r=>r.json());
}
function apiPatch(path, body) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body:JSON.stringify(body) }).then(r=>r.json());
}
function apiDel(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
}

// ══════════════════════════════════════════════════════════════
export default function Repairs() {
  const [repairs,   setRepairs]  = useState([]);
  const [summary,   setSummary]  = useState(null);
  const [loading,   setLoading]  = useState(true);
  const [month,     setMonth]    = useState(thisMonth());
  const [statusFilt,setStatusFilt]=useState('all');
  const [showAdd,   setShowAdd]  = useState(false);
  const [saving,    setSaving]   = useState(false);
  const [error,     setError]    = useState('');
  const [toast,     setToast]    = useState('');
  const [lastDone,  setLastDone] = useState(null); // just-saved repair for print prompt

  const [form, setForm] = useState({
    repair_type:    '',
    customer_name:  '',
    phone:          '',
    description:    '',
    charge:         '',
    payment_method: 'cash',
    status:         'done',
    notes:          '',
  });

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rep, sum] = await Promise.all([
        apiGet(`/repairs?month=${month}${statusFilt!=='all'?`&status=${statusFilt}`:''}`),
        apiGet('/repairs/summary'),
      ]);
      setRepairs(Array.isArray(rep)?rep:[]);
      setSummary(sum);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  },[month, statusFilt]);

  useEffect(()=>{ load(); },[load]);

  const handleSelectType = (rt) => {
    setForm(f=>({ ...f, repair_type:rt.label, charge:String(rt.price) }));
  };

  const handleAdd = async () => {
    if (!form.repair_type) return setError('Please select a repair type');
    setError(''); setSaving(true);
    try {
      const res = await apiPost('/repairs', {
        ...form,
        charge: parseFloat(form.charge)||0,
      });
      if (res.error) throw new Error(res.error);
      setLastDone(res);
      setForm({ repair_type:'', customer_name:'', phone:'', description:'', charge:'', payment_method:'cash', status:'done', notes:'' });
      setShowAdd(false);
      showToast(`Repair recorded — ${res.repair_number}`);
      load();
    } catch(e) { setError(e.message||'Failed'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (id, newStatus) => {
    await apiPatch(`/repairs/${id}`, { status: newStatus });
    load();
    showToast(`Status updated to ${newStatus}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this repair record?')) return;
    await apiDel(`/repairs/${id}`);
    showToast('Deleted'); load();
  };

  const STATUS_STYLE = {
    done:      { bg:'#dcfce7', color:C.success,  label:'✅ Done'      },
    pending:   { bg:'#fef9c3', color:'#854d0e',  label:'⏳ Pending'   },
    collected: { bg:'#dbeafe', color:'#1e40af',  label:'📦 Collected' },
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:C.navy, color:'white', padding:'12px 20px', borderRadius:12, fontSize:14, fontWeight:600, borderLeft:`4px solid ${C.gold}`, zIndex:500 }}>
          {toast}
        </div>
      )}

      {/* Print prompt after saving */}
      {lastDone && (
        <div style={{ background:'#dcfce7', border:`1.5px solid #86efac`, borderRadius:12, padding:'14px 18px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div style={{ fontSize:14, color:C.success }}>
            <b>{lastDone.repair_number}</b> recorded — {form.customer_name||'walk-in'}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>{ printRepairReceipt(lastDone); setLastDone(null); }}
              style={{ padding:'8px 18px', background:C.gold, color:C.navy, border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              🖨️ Print Receipt
            </button>
            <button onClick={()=>setLastDone(null)}
              style={{ padding:'8px 14px', background:'white', border:`1.5px solid #86efac`, borderRadius:8, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>🔧 Repairs</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Arm repair, nose pads, polishing, screws and other frame repairs</p>
        </div>
        <button onClick={()=>{ setShowAdd(s=>!s); setError(''); }}
          style={{ padding:'9px 22px', background:showAdd?C.cream:C.gold, color:showAdd?C.muted:C.navy, border:showAdd?`1.5px solid ${C.border}`:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          {showAdd ? '✕ Cancel' : '🔧 New Repair'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, margin:'16px 0' }}>
        {[
          { l:'Today',         v:fmt(summary?.today_revenue||0),       sub:`${summary?.today_count||0} repairs`,      dark:true },
          { l:'This Month',    v:fmt(summary?.this_month_revenue||0),  sub:`${summary?.this_month_count||0} repairs`,  c:'#2563eb' },
          { l:'Pending',       v:summary?.pending_count||0,            sub:'awaiting collection',                      c:C.danger },
          { l:'Total Revenue', v:fmt(summary?.total_revenue||0),       sub:`${summary?.total||0} all time`,           c:C.success },
        ].map(s=>(
          <div key={s.l} style={{ background:s.dark?C.navy:'white', border:`1px solid ${s.dark?C.navy:C.border}`, borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:s.dark?C.gold:C.muted, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:s.dark?'white':(s.c||C.navy) }}>{s.v}</div>
            {s.sub && <div style={{ fontSize:11, color:s.dark?'#ede9e0':C.muted, marginTop:2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Add repair form */}
      {showAdd && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:22, marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:700, color:C.navy, marginBottom:16 }}>🔧 New Repair</div>

          {error && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:9, padding:'10px 14px', fontSize:13, marginBottom:14 }}>⚠️ {error}</div>}

          {/* Repair type quick-pick */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:8 }}>Repair Type *</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {REPAIR_TYPES.map(rt=>(
                <button key={rt.label} onClick={()=>handleSelectType(rt)}
                  style={{ padding:'9px 14px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${form.repair_type===rt.label?C.navy:C.border}`, background:form.repair_type===rt.label?C.navy:'white', color:form.repair_type===rt.label?'white':C.muted, display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:16 }}>{rt.icon}</span>
                  <span>{rt.label}</span>
                  {rt.price > 0 && <span style={{ fontSize:11, opacity:.7 }}>Rs.{rt.price}</span>}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Customer Name (optional)</label>
              <input value={form.customer_name} onChange={e=>setForm(f=>({...f,customer_name:e.target.value}))} placeholder="Walk-in customer" style={INP}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Phone (optional)</label>
              <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="07X XXX XXXX" type="tel" style={INP}/>
            </div>
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Description (optional)</label>
            <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
              placeholder="e.g. Left arm loose, needs tightening — RayBan frame" style={INP}/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginBottom:14 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Charge (Rs.) *</label>
              <input type="number" value={form.charge} onChange={e=>setForm(f=>({...f,charge:e.target.value}))}
                placeholder="0 for free" style={{ ...INP, fontSize:18, fontWeight:700 }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Payment</label>
              <select value={form.payment_method} onChange={e=>setForm(f=>({...f,payment_method:e.target.value}))} style={{ ...INP, cursor:'pointer' }}>
                <option value="cash">💵 Cash</option>
                <option value="bank">🏦 Bank</option>
                <option value="free">🎁 Free</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Status</label>
              <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={{ ...INP, cursor:'pointer' }}>
                <option value="done">✅ Done now</option>
                <option value="pending">⏳ Pending (leaving frame)</option>
                <option value="collected">📦 Already collected</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Notes</label>
              <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional" style={INP}/>
            </div>
          </div>

          {/* Quick total display */}
          {parseFloat(form.charge) > 0 && (
            <div style={{ background:C.navy, borderRadius:10, padding:'12px 16px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:'#ede9e0' }}>{form.repair_type || 'Repair'} · {form.payment_method === 'bank' ? '🏦 Bank' : '💵 Cash'}</span>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.gold }}>{fmtFull(form.charge)}</span>
            </div>
          )}

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleAdd} disabled={saving}
              style={{ padding:'11px 24px', background:saving?C.muted:C.success, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {saving ? '⏳ Saving...' : '✅ Save Repair'}
            </button>
            <button onClick={()=>{ setShowAdd(false); setError(''); }}
              style={{ padding:'11px 16px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
          style={{ padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy }}/>
        <div style={{ display:'flex', gap:6 }}>
          {[['all','All'],['done','✅ Done'],['pending','⏳ Pending'],['collected','📦 Collected']].map(([v,l])=>(
            <button key={v} onClick={()=>setStatusFilt(v)}
              style={{ padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${statusFilt===v?C.navy:C.border}`, background:statusFilt===v?C.navy:'white', color:statusFilt===v?'white':C.muted }}>
              {l}
            </button>
          ))}
        </div>
        <span style={{ marginLeft:'auto', fontSize:13, color:C.muted }}>
          {repairs.length} records · {fmt(repairs.reduce((s,r)=>s+parseFloat(r.charge||0),0))}
        </span>
      </div>

      {/* Repair list */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
        {loading
          ? <div style={{ padding:32, textAlign:'center', color:C.muted }}>Loading...</div>
          : !repairs.length
            ? <div style={{ padding:48, textAlign:'center', color:C.muted }}>
                <div style={{ fontSize:44, marginBottom:12 }}>🔧</div>
                <div style={{ fontSize:15, fontWeight:600, color:C.navy, marginBottom:6 }}>No repairs recorded</div>
                <div style={{ fontSize:13 }}>Click "🔧 New Repair" to record your first repair</div>
              </div>
            : repairs.map((repair, idx) => {
                const st   = STATUS_STYLE[repair.status] || STATUS_STYLE.done;
                const rt   = REPAIR_TYPES.find(r=>r.label===repair.repair_type);
                const prev = repairs[idx-1];
                const showDateHead = !prev || new Date(prev.created_at).toDateString() !== new Date(repair.created_at).toDateString();
                return (
                  <React.Fragment key={repair.id}>
                    {showDateHead && (
                      <div style={{ padding:'7px 18px', background:C.cream, fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'1px', borderBottom:`1px solid ${C.border}` }}>
                        {new Date(repair.created_at).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:14, padding:'14px 18px', borderBottom:`1px solid ${C.cream}`, alignItems:'flex-start' }}>

                      {/* Icon */}
                      <div style={{ width:44, height:44, borderRadius:10, background:'#f0f9ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                        {rt?.icon || '🔧'}
                      </div>

                      {/* Details */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4, flexWrap:'wrap', gap:6 }}>
                          <div>
                            <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{repair.repair_type}</div>
                            {repair.customer_name && (
                              <div style={{ fontSize:12, color:C.muted }}>👤 {repair.customer_name}{repair.phone?` · 📞 ${repair.phone}`:''}</div>
                            )}
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:C.navy }}>
                              {parseFloat(repair.charge)===0 ? <span style={{ color:C.muted, fontSize:13 }}>Free</span> : fmtFull(repair.charge)}
                            </div>
                            <div style={{ fontSize:10, color:C.muted }}>{repair.payment_method==='bank'?'🏦 Bank':repair.payment_method==='free'?'🎁':'💵 Cash'}</div>
                          </div>
                        </div>

                        {repair.description && (
                          <div style={{ fontSize:12, color:C.muted, marginBottom:6, fontStyle:'italic' }}>{repair.description}</div>
                        )}

                        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                          <span style={{ background:st.bg, color:st.color, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>{st.label}</span>
                          <span style={{ fontSize:11, color:C.muted }}>{repair.repair_number}</span>
                          <span style={{ fontSize:11, color:C.muted }}>{fmtTime(repair.created_at)}</span>

                          {/* Status actions */}
                          {repair.status==='pending' && (
                            <button onClick={()=>handleStatusChange(repair.id,'done')}
                              style={{ padding:'4px 11px', background:'#dcfce7', color:C.success, border:`1px solid #86efac`, borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                              Mark Done
                            </button>
                          )}
                          {repair.status==='done' && (
                            <button onClick={()=>handleStatusChange(repair.id,'collected')}
                              style={{ padding:'4px 11px', background:'#dbeafe', color:'#1e40af', border:`1px solid #93c5fd`, borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                              Mark Collected
                            </button>
                          )}

                          {/* Print */}
                          <button onClick={()=>printRepairReceipt(repair)}
                            style={{ padding:'4px 11px', background:C.gold+'30', color:'#92400e', border:`1px solid ${C.gold}`, borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                            🖨️ Print
                          </button>

                          {/* Delete */}
                          <button onClick={()=>handleDelete(repair.id)}
                            style={{ background:'none', border:'none', color:'#d1d5db', cursor:'pointer', fontSize:14, padding:0, fontFamily:'inherit', marginLeft:'auto' }}>
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
        }

        {/* Month total */}
        {repairs.length > 0 && (
          <div style={{ padding:'12px 18px', background:C.cream, display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, borderTop:`1px solid ${C.border}` }}>
            <span style={{ color:C.muted }}>Month Total</span>
            <span style={{ color:C.navy }}>{fmt(repairs.reduce((s,r)=>s+parseFloat(r.charge||0),0))}</span>
          </div>
        )}
      </div>
    </div>
  );
}
