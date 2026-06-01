/* eslint-disable */
// ============================================================
//  WalkInRx.js — Refraction-only records (no order)
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};
const INP = { padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%', boxSizing:'border-box' };
const SEL = { ...INP, cursor:'pointer' };
const LBL = { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:4, display:'block' };
const fmt = (n) => n ? 'Rs. '+parseFloat(n).toLocaleString('en-LK',{minimumFractionDigits:0}) : '—';
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});

const DIOPTERS = ['','Plano',...Array.from({length:80},(_,i)=>((i+1)*0.25).toFixed(2))];
const AXES     = Array.from({length:181},(_,i)=>String(i));
const VA_OPTS  = ['','6/6','6/9','6/12','6/18','6/24','6/36','6/60','CF','HM','PL'];

function api(path, method='GET', body=null) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, {
    method, headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
    body: body ? JSON.stringify(body) : undefined,
  }).then(r=>r.json());
}

const EMPTY_FORM = {
  customer_name:'', phone:'', age:'',
  r_sph_s:'-', r_sph:'', r_cyl_s:'-', r_cyl:'', r_axis:'0', r_add:'', r_va:'', r_pd:'',
  l_sph_s:'-', l_sph:'', l_cyl_s:'-', l_cyl:'', l_axis:'0', l_add:'', l_va:'', l_pd:'',
  notes:'', quoted_frame:'', quoted_lens:'', quoted_price:'', follow_up:false,
};

export default function WalkInRx() {
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [showAdd,  setShowAdd]  = useState(false);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [selected, setSelected] = useState(null);
  const [toast,    setToast]    = useState('');
  const [filterFU, setFilterFU] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterFU) params.set('follow_up', 'true');
      const data = await api(`/walkin-rx?${params}`);
      setRecords(Array.isArray(data) ? data : []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, filterFU]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.customer_name.trim()) return setError('Customer name required');
    setSaving(true); setError('');
    try {
      const comb    = (s,v) => !v||v===''||v==='Plano'?( v==='Plano'?'Plano':'') :(s+v);
      const combCyl = (s,v) => !v||v===''?'':s+v;
      const payload = {
        customer_name: form.customer_name.trim(),
        phone:         form.phone||null,
        age:           form.age||null,
        r_sph:  comb(form.r_sph_s, form.r_sph),
        r_cyl:  combCyl(form.r_cyl_s, form.r_cyl),
        r_axis: form.r_axis||null,
        r_add:  form.r_add||null,
        r_va:   form.r_va||null,
        r_pd:   form.r_pd||null,
        l_sph:  comb(form.l_sph_s, form.l_sph),
        l_cyl:  combCyl(form.l_cyl_s, form.l_cyl),
        l_axis: form.l_axis||null,
        l_add:  form.l_add||null,
        l_va:   form.l_va||null,
        l_pd:   form.l_pd||null,
        notes:        form.notes||null,
        quoted_frame: form.quoted_frame||null,
        quoted_lens:  form.quoted_lens||null,
        quoted_price: form.quoted_price||null,
        follow_up:    form.follow_up,
      };
      await api('/walkin-rx', 'POST', payload);
      showToast('Rx record saved');
      setForm(EMPTY_FORM);
      setShowAdd(false);
      load();
    } catch(e) { setError(e.message||'Failed to save'); }
    finally { setSaving(false); }
  };

  const copyEye = () => setForm(f=>({
    ...f,
    l_sph_s:f.r_sph_s, l_sph:f.r_sph,
    l_cyl_s:f.r_cyl_s, l_cyl:f.r_cyl,
    l_axis:f.r_axis, l_add:f.r_add, l_va:f.r_va, l_pd:f.r_pd,
  }));

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:C.navy, color:'white', padding:'12px 20px', borderRadius:12, fontSize:14, fontWeight:600, borderLeft:`4px solid ${C.gold}`, zIndex:500 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>👁️ Walk-in Refraction</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Rx records with no order — for customers who just did refraction</p>
        </div>
        <button onClick={()=>{ setShowAdd(s=>!s); setError(''); }}
          style={{ padding:'9px 20px', background:showAdd?C.cream:C.navy, color:showAdd?C.muted:'white', border:showAdd?`1.5px solid ${C.border}`:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          {showAdd ? '✕ Cancel' : '+ New Rx Record'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:16 }}>
        {[
          { l:'Total Records',   v:records.length,                                                           dark:true },
          { l:'Need Follow-up',  v:records.filter(r=>r.follow_up&&!r.followed_up).length,                   c:C.danger },
          { l:'With Quote',      v:records.filter(r=>r.quoted_price).length,                                 c:'#2563eb' },
          { l:'This Month',      v:records.filter(r=>r.created_at?.slice(0,7)===new Date().toISOString().slice(0,7)).length, c:C.success },
        ].map(s=>(
          <div key={s.l} style={{ background:s.dark?C.navy:'white', border:`1px solid ${s.dark?C.navy:C.border}`, borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:s.dark?C.gold:C.muted, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:s.dark?'white':s.c||C.navy }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:22, marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:700, color:C.navy, marginBottom:16 }}>New Walk-in Rx Record</div>

          {error && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'10px 13px', fontSize:13, marginBottom:14 }}>{error}</div>}

          {/* Customer info */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 80px', gap:10, marginBottom:16 }}>
            <div>
              <label style={LBL}>Full Name *</label>
              <input value={form.customer_name} onChange={e=>setForm(f=>({...f,customer_name:e.target.value}))}
                placeholder="e.g. Nimal Perera" style={INP} autoFocus/>
            </div>
            <div>
              <label style={LBL}>Phone</label>
              <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}
                placeholder="077-123-4567" type="tel" style={INP}/>
            </div>
            <div>
              <label style={LBL}>Age</label>
              <input value={form.age} onChange={e=>setForm(f=>({...f,age:e.target.value}))}
                placeholder="35" type="number" style={INP}/>
            </div>
          </div>

          {/* Rx tables */}
          {[{label:'Right Eye (R)', p:'r'}, {label:'Left Eye (L)', p:'l'}].map(eye=>(
            <div key={eye.p} style={{ background:C.cream, borderRadius:10, padding:14, marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10 }}>{eye.label}</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>

                {/* SPH */}
                <div>
                  <label style={LBL}>SPH</label>
                  <div style={{ display:'flex', gap:4 }}>
                    <select value={form[`${eye.p}_sph_s`]} onChange={e=>setForm(f=>({...f,[`${eye.p}_sph_s`]:e.target.value}))}
                      style={{ ...SEL, width:52, padding:'9px 4px' }}>
                      <option>-</option><option>+</option>
                    </select>
                    <select value={form[`${eye.p}_sph`]} onChange={e=>setForm(f=>({...f,[`${eye.p}_sph`]:e.target.value}))}
                      style={{ ...SEL, width:88 }}>
                      {DIOPTERS.map(v=><option key={v} value={v}>{v||'—'}</option>)}
                    </select>
                  </div>
                </div>

                {/* CYL */}
                <div>
                  <label style={LBL}>CYL</label>
                  <div style={{ display:'flex', gap:4 }}>
                    <select value={form[`${eye.p}_cyl_s`]} onChange={e=>setForm(f=>({...f,[`${eye.p}_cyl_s`]:e.target.value}))}
                      style={{ ...SEL, width:52, padding:'9px 4px' }}>
                      <option>-</option><option>+</option>
                    </select>
                    <select value={form[`${eye.p}_cyl`]} onChange={e=>setForm(f=>({...f,[`${eye.p}_cyl`]:e.target.value}))}
                      style={{ ...SEL, width:88 }}>
                      {DIOPTERS.map(v=><option key={v} value={v}>{v||'—'}</option>)}
                    </select>
                  </div>
                </div>

                {/* AXIS */}
                <div>
                  <label style={LBL}>AXIS</label>
                  <select value={form[`${eye.p}_axis`]} onChange={e=>setForm(f=>({...f,[`${eye.p}_axis`]:e.target.value}))}
                    style={{ ...SEL, width:78 }}>
                    {AXES.map(v=><option key={v}>{v}</option>)}
                  </select>
                </div>

                {/* ADD */}
                <div>
                  <label style={LBL}>ADD</label>
                  <select value={form[`${eye.p}_add`]} onChange={e=>setForm(f=>({...f,[`${eye.p}_add`]:e.target.value}))}
                    style={{ ...SEL, width:88 }}>
                    {DIOPTERS.map(v=><option key={v} value={v}>{v||'—'}</option>)}
                  </select>
                </div>

                {/* VA */}
                <div>
                  <label style={LBL}>V/A</label>
                  <select value={form[`${eye.p}_va`]} onChange={e=>setForm(f=>({...f,[`${eye.p}_va`]:e.target.value}))}
                    style={{ ...SEL, width:82 }}>
                    {VA_OPTS.map(v=><option key={v} value={v}>{v||'—'}</option>)}
                  </select>
                </div>

                {/* PD */}
                <div>
                  <label style={LBL}>PD</label>
                  <input value={form[`${eye.p}_pd`]} onChange={e=>setForm(f=>({...f,[`${eye.p}_pd`]:e.target.value}))}
                    placeholder="32" style={{ ...INP, width:68 }}/>
                </div>
              </div>
            </div>
          ))}

          <button onClick={copyEye}
            style={{ background:C.cream, border:`1px solid ${C.border}`, borderRadius:7, padding:'5px 14px', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted, marginBottom:14 }}>
            ↓ Copy Right Eye to Left
          </button>

          {/* Notes */}
          <div style={{ marginBottom:14 }}>
            <label style={LBL}>Clinical Notes / Remarks</label>
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
              placeholder="e.g. Presbyopia, dry eyes, diabetic patient, referred by Dr. Perera..."
              style={{ ...INP, resize:'vertical', minHeight:64, lineHeight:1.6 }}/>
          </div>

          {/* Quote section */}
          <div style={{ background:'#f0f9ff', border:`1px solid #bae6fd`, borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0369a1', marginBottom:12 }}>
              💰 Price Quote (optional)
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              <div>
                <label style={LBL}>Frame Suggested</label>
                <input value={form.quoted_frame} onChange={e=>setForm(f=>({...f,quoted_frame:e.target.value}))}
                  placeholder="e.g. Full rim plastic" style={INP}/>
              </div>
              <div>
                <label style={LBL}>Lens Suggested</label>
                <input value={form.quoted_lens} onChange={e=>setForm(f=>({...f,quoted_lens:e.target.value}))}
                  placeholder="e.g. Single Vision HMC" style={INP}/>
              </div>
              <div>
                <label style={LBL}>Quoted Price (Rs.)</label>
                <input value={form.quoted_price} onChange={e=>setForm(f=>({...f,quoted_price:e.target.value}))}
                  placeholder="e.g. 7500" type="number" style={INP}/>
              </div>
            </div>
          </div>

          {/* Follow up toggle */}
          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom:18 }}>
            <div onClick={()=>setForm(f=>({...f,follow_up:!f.follow_up}))}
              style={{ width:44, height:24, borderRadius:12, background:form.follow_up?C.navy:C.border, position:'relative', cursor:'pointer', transition:'background .2s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:3, left:form.follow_up?23:3, width:18, height:18, borderRadius:'50%', background:'white', transition:'left .2s' }}/>
            </div>
            <span style={{ fontSize:14, color:C.navy, fontWeight:500 }}>
              Mark for follow-up call
            </span>
          </label>

          <button onClick={handleSave} disabled={saving}
            style={{ padding:'11px 28px', background:saving?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
            {saving ? 'Saving...' : '💾 Save Rx Record'}
          </button>
        </div>
      )}

      {/* Search + filter */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search by name or phone..."
          style={{ ...INP, flex:1, minWidth:200 }}/>
        <button onClick={()=>setFilterFU(s=>!s)}
          style={{ padding:'9px 14px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
            border:`1.5px solid ${filterFU?C.danger:C.border}`,
            background:filterFU?'#fee2e2':'white',
            color:filterFU?C.danger:C.muted }}>
          {filterFU ? '🔔 Follow-ups only ✓' : '🔔 Follow-ups'}
        </button>
      </div>

      {/* Records list */}
      {loading
        ? <div style={{ textAlign:'center', padding:40, color:C.muted }}>Loading...</div>
        : !records.length
          ? <div style={{ textAlign:'center', padding:60, color:C.muted }}>
              <div style={{ fontSize:48, marginBottom:12 }}>👁️</div>
              <div style={{ fontSize:15, fontWeight:600, color:C.navy, marginBottom:6 }}>No records yet</div>
              <div style={{ fontSize:13 }}>Click "+ New Rx Record" to save the first walk-in refraction</div>
            </div>
          : records.map(rx=>(
            <div key={rx.id} onClick={()=>setSelected(selected?.id===rx.id?null:rx)}
              style={{ background:'white', border:`1.5px solid ${selected?.id===rx.id?C.gold:rx.follow_up&&!rx.followed_up?'#fca5a5':C.border}`, borderRadius:14, padding:'14px 18px', marginBottom:10, cursor:'pointer', transition:'border-color .15s' }}>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:C.navy, marginBottom:2 }}>{rx.customer_name}</div>
                  <div style={{ fontSize:12, color:C.muted }}>
                    {rx.phone && `📞 ${rx.phone}`}
                    {rx.age && ` · Age ${rx.age}`}
                    {' · '}{fmtDate(rx.created_at)}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
                  {rx.quoted_price && (
                    <span style={{ background:'#eff6ff', color:'#1e40af', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>
                      Quote: {fmt(rx.quoted_price)}
                    </span>
                  )}
                  {rx.follow_up && !rx.followed_up && (
                    <span style={{ background:'#fee2e2', color:C.danger, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>
                      🔔 Follow-up needed
                    </span>
                  )}
                  {rx.followed_up && (
                    <span style={{ background:'#dcfce7', color:C.success, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>
                      ✅ Followed up
                    </span>
                  )}
                </div>
              </div>

              {/* Rx summary */}
              <div style={{ display:'flex', gap:12, fontSize:12, color:C.muted, flexWrap:'wrap' }}>
                {rx.r_sph && <span>R: <b style={{color:C.navy}}>{rx.r_sph}</b>{rx.r_cyl&&rx.r_cyl!=='0.00'?` / ${rx.r_cyl} × ${rx.r_axis}`:''}</span>}
                {rx.l_sph && <span>L: <b style={{color:C.navy}}>{rx.l_sph}</b>{rx.l_cyl&&rx.l_cyl!=='0.00'?` / ${rx.l_cyl} × ${rx.l_axis}`:''}</span>}
                {rx.r_add && <span>ADD: <b style={{color:C.navy}}>{rx.r_add}</b></span>}
                {rx.notes && <span style={{ fontStyle:'italic' }}>💬 {rx.notes.slice(0,60)}{rx.notes.length>60?'...':''}</span>}
              </div>

              {/* Expanded detail */}
              {selected?.id===rx.id && (
                <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}` }}>

                  {/* Full Rx table */}
                  <div style={{ overflowX:'auto', marginBottom:14 }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                      <thead>
                        <tr>{['Eye','SPH','CYL','AXIS','ADD','V/A','PD'].map(h=>(
                          <th key={h} style={{ background:C.cream, padding:'6px 9px', textAlign:'center', fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, border:`1px solid ${C.border}` }}>{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {[
                          { eye:'Right (R)', sph:rx.r_sph, cyl:rx.r_cyl, axis:rx.r_axis, add:rx.r_add, va:rx.r_va, pd:rx.r_pd },
                          { eye:'Left (L)',  sph:rx.l_sph, cyl:rx.l_cyl, axis:rx.l_axis, add:rx.l_add, va:rx.l_va, pd:rx.l_pd },
                        ].map(row=>(
                          <tr key={row.eye}>
                            <td style={{ background:C.cream, padding:'7px 9px', fontWeight:700, fontSize:12, border:`1px solid ${C.border}`, color:C.navy }}>{row.eye}</td>
                            {[row.sph, row.cyl, row.axis, row.add, row.va, row.pd].map((v,i)=>(
                              <td key={i} style={{ padding:'7px 9px', textAlign:'center', border:`1px solid ${C.border}`, fontSize:13, fontWeight:600, color:C.navy, background:'white' }}>{v||'—'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Quote info */}
                  {(rx.quoted_frame||rx.quoted_lens||rx.quoted_price) && (
                    <div style={{ background:'#eff6ff', border:`1px solid #bae6fd`, borderRadius:9, padding:'10px 14px', marginBottom:12, fontSize:13 }}>
                      <div style={{ fontWeight:700, color:'#1e40af', marginBottom:5 }}>Price Quote</div>
                      {rx.quoted_frame && <div style={{ color:C.navy }}>Frame: {rx.quoted_frame}</div>}
                      {rx.quoted_lens  && <div style={{ color:C.navy }}>Lens: {rx.quoted_lens}</div>}
                      {rx.quoted_price && <div style={{ color:'#1e40af', fontWeight:700, fontSize:15, marginTop:4 }}>Total: {fmt(rx.quoted_price)}</div>}
                    </div>
                  )}

                  {rx.notes && (
                    <div style={{ background:'#fef9f0', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#92400e', marginBottom:12 }}>
                      💬 {rx.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {/* Convert to order */}
                    <button onClick={()=>{
                      const params = new URLSearchParams({
                        r_sph:  rx.r_sph||'', r_cyl: rx.r_cyl||'', r_axis: rx.r_axis||'', r_add: rx.r_add||'',
                        l_sph:  rx.l_sph||'', l_cyl: rx.l_cyl||'', l_axis: rx.l_axis||'', l_add: rx.l_add||'',
                        prefill_name:  rx.customer_name,
                        prefill_phone: rx.phone||'',
                      });
                      window.location.href = '/orders/new?' + params.toString();
                    }}
                      style={{ padding:'9px 18px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      ➕ Convert to Order
                    </button>

                    {/* WhatsApp */}
                    {rx.phone && (
                      <a href={`https://wa.me/94${rx.phone.replace(/^0/,'')}?text=${encodeURIComponent(`Hello ${rx.customer_name}, this is Wickramakalutota Opticals. Your spectacles are ready — visit us anytime. Thank you!`)}`}
                        target="_blank" rel="noreferrer"
                        style={{ padding:'9px 16px', background:'#25D366', color:'white', borderRadius:9, fontSize:13, fontWeight:600, textDecoration:'none' }}>
                        💬 WhatsApp
                      </a>
                    )}

                    {/* Mark followed up */}
                    {rx.follow_up && !rx.followed_up && (
                      <button onClick={async(e)=>{e.stopPropagation(); await api(`/walkin-rx/${rx.id}`,'PATCH',{followed_up:true}); showToast('Marked as followed up'); load();}}
                        style={{ padding:'9px 16px', background:'#dcfce7', color:C.success, border:`1px solid #86efac`, borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                        ✅ Mark Followed Up
                      </button>
                    )}

                    {/* Delete */}
                    <button onClick={async(e)=>{e.stopPropagation(); if(!window.confirm('Delete this record?'))return; await api(`/walkin-rx/${rx.id}`,'DELETE'); setSelected(null); showToast('Deleted'); load();}}
                      style={{ padding:'9px 14px', background:'#fee2e2', color:C.danger, border:`1px solid #fca5a5`, borderRadius:9, fontSize:13, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto' }}>
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
      }
    </div>
  );
}