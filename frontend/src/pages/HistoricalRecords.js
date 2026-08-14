/* eslint-disable */
// ============================================================
//  HistoricalRecords.js
//  Fast bulk entry of pre-2026 customer visit records
//  Tab key moves between fields, Enter saves row and starts next
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';

const BASE  = () => process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tok   = () => localStorage.getItem('ko_token');
const hdr   = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` });

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};

const LENS_TYPES    = ['Single Vision','Progressive','Bifocal','Office Lens','Reading (ready)',''];
const COATINGS      = ['Normal','HMC','Blue Cut','Photo Gray','Blue Cut + HMC','Photo Gray + HMC','Blue Cut + Photo Gray + HMC',''];
const POWER_OPTS    = ['+0.25','+0.50','+0.75','+1.00','+1.25','+1.50','+1.75','+2.00','+2.25','+2.50','+2.75','+3.00','+3.25','+3.50','+3.75','+4.00','0.00','-0.25','-0.50','-0.75','-1.00','-1.25','-1.50','-1.75','-2.00','-2.25','-2.50','-2.75','-3.00','-3.25','-3.50','-3.75','-4.00','-4.25','-4.50','-4.75','-5.00','-5.50','-6.00','-6.50','-7.00','-8.00','PL',''];

const blankRow = (date='') => ({
  visit_date: date, customer_name:'', phone:'', age:'',
  r_sph:'', r_cyl:'', r_axis:'', l_sph:'', l_cyl:'', l_axis:'', add_power:'',
  frame:'', lens_type:'', lens_coating:'', total_price:'', notes:'',
  _saved: false, _saving: false, _error: '',
});

// ── Field input — handles Tab ─────────────────────────────────
function F({ value, onChange, onKeyDown, inputRef, type='text', options, placeholder='', style={}, width }) {
  const s = { padding:'5px 6px', border:`1px solid ${C.border}`, borderRadius:6, fontSize:12,
    fontFamily:'inherit', outline:'none', background:'white', color:C.navy,
    width: width || '100%', boxSizing:'border-box', ...style };
  if (options) return (
    <select value={value} onChange={e=>onChange(e.target.value)} onKeyDown={onKeyDown} ref={inputRef} style={s}>
      {options.map(o=><option key={o} value={o}>{o||'—'}</option>)}
    </select>
  );
  return <input ref={inputRef} type={type} value={value} onChange={e=>onChange(e.target.value)}
    onKeyDown={onKeyDown} placeholder={placeholder} style={s}/>;
}

// ── Single entry row ──────────────────────────────────────────
function EntryRow({ row, idx, onChange, onSave, onDelete, onAddNext, firstRef, isSaved }) {
  const set = (k, v) => onChange(idx, k, v);

  // Build field list for Tab navigation
  const fields = useRef([]);
  const reg = (i) => (el) => { fields.current[i] = el; };

  const handleKey = (fieldIdx) => (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const next = fields.current[fieldIdx + 1];
      if (next) next.focus();
      else { onSave(idx); } // Tab on last field = save
    }
    if (e.key === 'Enter') { e.preventDefault(); onSave(idx); }
  };

  const bg = isSaved ? '#f0fdf4' : row._error ? '#fef2f2' : 'white';
  const borderColor = isSaved ? '#86efac' : row._error ? '#fca5a5' : C.border;

  return (
    <tr style={{ background: bg, border:`1px solid ${borderColor}` }}>
      <td style={{ padding:'3px 4px', textAlign:'center', fontSize:11, color:C.muted, width:30 }}>{idx+1}</td>

      {/* Date */}
      <td style={{ padding:'3px 4px', width:110 }}>
        <F value={row.visit_date} onChange={v=>set('visit_date',v)} type="date" inputRef={idx===0?firstRef:reg(0+(idx*20))} onKeyDown={handleKey(0+(idx*20))} width={100}/>
      </td>

      {/* Name */}
      <td style={{ padding:'3px 4px', minWidth:120 }}>
        <F value={row.customer_name} onChange={v=>set('customer_name',v)} placeholder="Full name" inputRef={reg(1+(idx*20))} onKeyDown={handleKey(1+(idx*20))}/>
      </td>

      {/* Phone */}
      <td style={{ padding:'3px 4px', width:95 }}>
        <F value={row.phone} onChange={v=>set('phone',v)} placeholder="Phone" type="tel" inputRef={reg(2+(idx*20))} onKeyDown={handleKey(2+(idx*20))} width={90}/>
      </td>

      {/* Age */}
      <td style={{ padding:'3px 4px', width:50 }}>
        <F value={row.age} onChange={v=>set('age',v)} placeholder="Age" type="number" inputRef={reg(3+(idx*20))} onKeyDown={handleKey(3+(idx*20))} width={44}/>
      </td>

      {/* RE Power */}
      <td style={{ padding:'3px 4px', width:62 }}>
        <F value={row.r_sph} onChange={v=>set('r_sph',v)} options={POWER_OPTS} inputRef={reg(4+(idx*20))} onKeyDown={handleKey(4+(idx*20))} width={56}/>
      </td>
      <td style={{ padding:'3px 4px', width:62 }}>
        <F value={row.r_cyl} onChange={v=>set('r_cyl',v)} options={POWER_OPTS} inputRef={reg(5+(idx*20))} onKeyDown={handleKey(5+(idx*20))} width={56}/>
      </td>
      <td style={{ padding:'3px 4px', width:54 }}>
        <F value={row.r_axis} onChange={v=>set('r_axis',v)} placeholder="Axis" type="number" inputRef={reg(6+(idx*20))} onKeyDown={handleKey(6+(idx*20))} width={48}/>
      </td>

      {/* LE Power */}
      <td style={{ padding:'3px 4px', width:62 }}>
        <F value={row.l_sph} onChange={v=>set('l_sph',v)} options={POWER_OPTS} inputRef={reg(7+(idx*20))} onKeyDown={handleKey(7+(idx*20))} width={56}/>
      </td>
      <td style={{ padding:'3px 4px', width:62 }}>
        <F value={row.l_cyl} onChange={v=>set('l_cyl',v)} options={POWER_OPTS} inputRef={reg(8+(idx*20))} onKeyDown={handleKey(8+(idx*20))} width={56}/>
      </td>
      <td style={{ padding:'3px 4px', width:54 }}>
        <F value={row.l_axis} onChange={v=>set('l_axis',v)} placeholder="Axis" type="number" inputRef={reg(9+(idx*20))} onKeyDown={handleKey(9+(idx*20))} width={48}/>
      </td>

      {/* ADD */}
      <td style={{ padding:'3px 4px', width:62 }}>
        <F value={row.add_power} onChange={v=>set('add_power',v)} options={['+0.75','+1.00','+1.25','+1.50','+1.75','+2.00','+2.25','+2.50','+2.75','+3.00','']} inputRef={reg(10+(idx*20))} onKeyDown={handleKey(10+(idx*20))} width={56}/>
      </td>

      {/* Frame */}
      <td style={{ padding:'3px 4px', minWidth:110 }}>
        <F value={row.frame} onChange={v=>set('frame',v)} placeholder="Frame name" inputRef={reg(11+(idx*20))} onKeyDown={handleKey(11+(idx*20))}/>
      </td>

      {/* Lens type */}
      <td style={{ padding:'3px 4px', width:110 }}>
        <F value={row.lens_type} onChange={v=>set('lens_type',v)} options={LENS_TYPES} inputRef={reg(12+(idx*20))} onKeyDown={handleKey(12+(idx*20))} width={104}/>
      </td>

      {/* Coating */}
      <td style={{ padding:'3px 4px', width:110 }}>
        <F value={row.lens_coating} onChange={v=>set('lens_coating',v)} options={COATINGS} inputRef={reg(13+(idx*20))} onKeyDown={handleKey(13+(idx*20))} width={104}/>
      </td>

      {/* Price */}
      <td style={{ padding:'3px 4px', width:80 }}>
        <F value={row.total_price} onChange={v=>set('total_price',v)} placeholder="Rs." type="number" inputRef={reg(14+(idx*20))} onKeyDown={handleKey(14+(idx*20))} width={74}/>
      </td>

      {/* Notes */}
      <td style={{ padding:'3px 4px', minWidth:90 }}>
        <F value={row.notes} onChange={v=>set('notes',v)} placeholder="Notes" inputRef={reg(15+(idx*20))} onKeyDown={handleKey(15+(idx*20))}/>
      </td>

      {/* Actions */}
      <td style={{ padding:'3px 6px', textAlign:'center', width:70 }}>
        {isSaved ? (
          <span style={{ color:C.success, fontSize:16 }}>✓</span>
        ) : row._saving ? (
          <span style={{ color:C.muted, fontSize:11 }}>⏳</span>
        ) : (
          <div style={{ display:'flex', gap:4 }}>
            <button onClick={()=>onSave(idx)} title="Save (Enter)"
              style={{ padding:'4px 8px', background:C.navy, color:'white', border:'none', borderRadius:5, fontSize:11, fontWeight:700, cursor:'pointer' }}>
              ✓
            </button>
            <button onClick={()=>onDelete(idx)} title="Remove row"
              style={{ padding:'4px 6px', background:'#fee2e2', color:C.danger, border:'none', borderRadius:5, fontSize:11, cursor:'pointer' }}>
              ✕
            </button>
          </div>
        )}
        {row._error && <div style={{ fontSize:9, color:C.danger, marginTop:2 }}>{row._error}</div>}
      </td>
    </tr>
  );
}

// ── Records list (search + view) ──────────────────────────────
function RecordsList({ onEditRecord }) {
  const [records, setRecords] = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [year,    setYear]    = useState('');
  const [page,    setPage]    = useState(0);
  const [expanded,setExpanded]= useState(null);
  const PER = 30;

  const load = useCallback(async (pg=0) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit:PER, offset:pg*PER });
      if (search.trim()) q.set('search', search.trim());
      if (year) q.set('year', year);
      const res  = await fetch(`${BASE()}/historical-records?${q}`, { headers: hdr() });
      const data = await res.json();
      setRecords(data.records || []);
      setTotal(data.total || 0);
      setPage(pg);
    } catch(e) {} finally { setLoading(false); }
  }, [search, year]);

  useEffect(() => {
    const t = setTimeout(() => load(0), 400);
    return () => clearTimeout(t);
  }, [search, year]);

  const del = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    await fetch(`${BASE()}/historical-records/${id}`, { method:'DELETE', headers:hdr() });
    load(page);
  };

  const INP = { padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13,
    fontFamily:'inherit', outline:'none', background:'white', color:C.navy };

  const years = Array.from({length: new Date().getFullYear() - 2021}, (_, i) => String(2022 + i));

  return (
    <div>
      {/* Search bar */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search by name, phone, frame..."
          style={{ ...INP, flex:1, minWidth:200 }}/>
        <select value={year} onChange={e=>setYear(e.target.value)} style={INP}>
          <option value="">All Years</option>
          {years.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
        <span style={{ fontSize:13, color:C.muted, alignSelf:'center' }}>{total} records</span>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:C.muted }}>Loading...</div>
      ) : records.length === 0 ? (
        <div style={{ textAlign:'center', padding:60 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📚</div>
          <div style={{ fontSize:16, color:C.navy, fontWeight:600 }}>No records found</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:6 }}>Switch to "Add Records" tab to start entering historical data</div>
        </div>
      ) : (
        <>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {records.map(r => (
              <div key={r.id} style={{ background:'white', border:`1.5px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
                {/* Row summary */}
                <div onClick={()=>setExpanded(expanded===r.id?null:r.id)}
                  style={{ padding:'10px 16px', cursor:'pointer', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.gold, background:'#fef9f0', padding:'2px 8px', borderRadius:20, flexShrink:0 }}>
                    {new Date(r.visit_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
                  </div>
                  <div style={{ fontWeight:700, color:C.navy, fontSize:14, flex:1 }}>{r.customer_name}</div>
                  <div style={{ fontSize:12, color:C.muted }}>{r.phone}</div>
                  {r.age && <div style={{ fontSize:12, color:C.muted }}>Age {r.age}</div>}
                  {r.frame && <div style={{ fontSize:12, color:C.navy }}>🕶️ {r.frame}</div>}
                  {r.total_price > 0 && (
                    <div style={{ fontSize:13, fontWeight:700, color:C.success }}>
                      Rs. {parseFloat(r.total_price).toLocaleString()}
                    </div>
                  )}
                  <div style={{ fontSize:18, color:C.muted, marginLeft:'auto' }}>{expanded===r.id?'▲':'▼'}</div>
                </div>

                {/* Expanded detail */}
                {expanded === r.id && (
                  <div style={{ borderTop:`1px solid ${C.border}`, padding:'14px 16px', background:C.cream }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:12 }}>
                      {/* Prescription */}
                      {(r.r_sph||r.r_cyl||r.r_axis) && (
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:4 }}>Right Eye</div>
                          <div style={{ fontSize:13, color:C.navy, fontWeight:600 }}>
                            SPH {r.r_sph||'—'} · CYL {r.r_cyl||'—'}
                            {r.r_axis ? ` · ×${r.r_axis}°` : ''}
                          </div>
                        </div>
                      )}
                      {(r.l_sph||r.l_cyl||r.l_axis) && (
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:4 }}>Left Eye</div>
                          <div style={{ fontSize:13, color:C.navy, fontWeight:600 }}>
                            SPH {r.l_sph||'—'} · CYL {r.l_cyl||'—'}
                            {r.l_axis ? ` · ×${r.l_axis}°` : ''}
                          </div>
                        </div>
                      )}
                      {r.add_power && (
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:4 }}>ADD</div>
                          <div style={{ fontSize:13, color:C.navy, fontWeight:600 }}>{r.add_power}</div>
                        </div>
                      )}
                      {r.lens_type && (
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:4 }}>Lens</div>
                          <div style={{ fontSize:13, color:C.navy }}>{r.lens_type}</div>
                        </div>
                      )}
                      {r.lens_coating && (
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:4 }}>Coating</div>
                          <div style={{ fontSize:13, color:C.navy }}>{r.lens_coating}</div>
                        </div>
                      )}
                      {r.notes && (
                        <div style={{ gridColumn:'1/-1' }}>
                          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:4 }}>Notes</div>
                          <div style={{ fontSize:13, color:C.navy }}>{r.notes}</div>
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={()=>onEditRecord(r)}
                        style={{ padding:'7px 16px', background:C.navy, color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                        ✏️ Edit
                      </button>
                      <button onClick={()=>del(r.id)}
                        style={{ padding:'7px 14px', background:'#fee2e2', color:C.danger, border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > PER && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:12, marginTop:20 }}>
              <button onClick={()=>load(page-1)} disabled={page===0}
                style={{ padding:'8px 18px', background:page===0?C.cream:'white', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:page===0?'not-allowed':'pointer', fontFamily:'inherit', color:page===0?C.muted:C.navy }}>
                ← Prev
              </button>
              <span style={{ fontSize:12, color:C.muted }}>{page*PER+1}–{Math.min((page+1)*PER,total)} of {total}</span>
              <button onClick={()=>load(page+1)} disabled={(page+1)*PER>=total}
                style={{ padding:'8px 18px', background:(page+1)*PER>=total?C.cream:C.navy, border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:(page+1)*PER>=total?'not-allowed':'pointer', fontFamily:'inherit', color:(page+1)*PER>=total?C.muted:'white' }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Edit modal ────────────────────────────────────────────────
function EditModal({ record, onClose, onSaved }) {
  const [form, setForm] = useState({ ...record });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const INP = { padding:'8px 11px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13,
    fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy, width:'100%', boxSizing:'border-box' };

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${BASE()}/historical-records/${record.id}`, {
        method:'PATCH', headers:hdr(), body:JSON.stringify(form)
      });
      onSaved();
      onClose();
    } catch(e) { alert('Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.6)', zIndex:500,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:20, padding:28, width:'100%', maxWidth:680,
        boxShadow:'0 24px 60px rgba(0,0,0,.3)', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.navy, marginBottom:20 }}>Edit Record</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:14 }}>
          <div style={{ gridColumn:'1/-1', display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12 }}>
            <div><label style={{ fontSize:10, fontWeight:700, color:C.muted, display:'block', marginBottom:4, textTransform:'uppercase' }}>Date *</label>
              <input type="date" value={form.visit_date?.slice(0,10)||''} onChange={e=>set('visit_date',e.target.value)} style={INP}/></div>
            <div><label style={{ fontSize:10, fontWeight:700, color:C.muted, display:'block', marginBottom:4, textTransform:'uppercase' }}>Name *</label>
              <input value={form.customer_name||''} onChange={e=>set('customer_name',e.target.value)} style={INP}/></div>
            <div><label style={{ fontSize:10, fontWeight:700, color:C.muted, display:'block', marginBottom:4, textTransform:'uppercase' }}>Phone</label>
              <input value={form.phone||''} onChange={e=>set('phone',e.target.value)} style={INP}/></div>
            <div><label style={{ fontSize:10, fontWeight:700, color:C.muted, display:'block', marginBottom:4, textTransform:'uppercase' }}>Age</label>
              <input type="number" value={form.age||''} onChange={e=>set('age',e.target.value)} style={INP}/></div>
          </div>
          {/* Right eye */}
          {[['r_sph','RE SPH'],['r_cyl','RE CYL'],['r_axis','RE AXIS'],['l_sph','LE SPH'],['l_cyl','LE CYL'],['l_axis','LE AXIS'],['add_power','ADD']].map(([k,l])=>(
            <div key={k}>
              <label style={{ fontSize:10, fontWeight:700, color:C.muted, display:'block', marginBottom:4, textTransform:'uppercase' }}>{l}</label>
              {['r_axis','l_axis'].includes(k)
                ? <input type="number" value={form[k]||''} onChange={e=>set(k,e.target.value)} placeholder="°" style={INP}/>
                : <select value={form[k]||''} onChange={e=>set(k,e.target.value)} style={INP}>
                    {(['add_power'].includes(k)?['+0.75','+1.00','+1.25','+1.50','+1.75','+2.00','+2.25','+2.50','+2.75','+3.00','']:POWER_OPTS).map(o=><option key={o} value={o}>{o||'—'}</option>)}
                  </select>
              }
            </div>
          ))}
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:C.muted, display:'block', marginBottom:4, textTransform:'uppercase' }}>Frame</label>
            <input value={form.frame||''} onChange={e=>set('frame',e.target.value)} style={INP}/>
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:C.muted, display:'block', marginBottom:4, textTransform:'uppercase' }}>Lens Type</label>
            <select value={form.lens_type||''} onChange={e=>set('lens_type',e.target.value)} style={INP}>
              {LENS_TYPES.map(o=><option key={o} value={o}>{o||'—'}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:C.muted, display:'block', marginBottom:4, textTransform:'uppercase' }}>Coating</label>
            <select value={form.lens_coating||''} onChange={e=>set('lens_coating',e.target.value)} style={INP}>
              {COATINGS.map(o=><option key={o} value={o}>{o||'—'}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:C.muted, display:'block', marginBottom:4, textTransform:'uppercase' }}>Price (Rs.)</label>
            <input type="number" value={form.total_price||''} onChange={e=>set('total_price',e.target.value)} style={INP}/>
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <label style={{ fontSize:10, fontWeight:700, color:C.muted, display:'block', marginBottom:4, textTransform:'uppercase' }}>Notes</label>
            <input value={form.notes||''} onChange={e=>set('notes',e.target.value)} style={INP}/>
          </div>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex:2, padding:'11px', background:C.navy, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
            {saving ? '⏳ Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function HistoricalRecords() {
  const [tab,        setTab]        = useState('add');   // 'add' | 'view'
  const [rows,       setRows]       = useState([blankRow(new Date().toISOString().split('T')[0])]);
  const [savedCount, setSavedCount] = useState(0);
  const [bulkDate,   setBulkDate]   = useState('');
  const [editRecord, setEditRecord] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const firstRef = useRef();

  const changeRow = (idx, key, val) => {
    setRows(prev => prev.map((r,i) => i===idx ? {...r, [key]:val} : r));
  };

  const saveRow = async (idx) => {
    const row = rows[idx];
    if (!row.customer_name.trim() || !row.visit_date) {
      setRows(prev => prev.map((r,i) => i===idx ? {...r, _error:'Name and date required'} : r));
      return;
    }
    setRows(prev => prev.map((r,i) => i===idx ? {...r, _saving:true, _error:''} : r));
    try {
      const res  = await fetch(`${BASE()}/historical-records`, {
        method:'POST', headers:hdr(),
        body: JSON.stringify({ ...row, total_price: row.total_price || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows(prev => prev.map((r,i) => i===idx ? {...r, _saved:true, _saving:false} : r));
      setSavedCount(c => c+1);
      // Auto-add next blank row after save if it's the last row
      if (idx === rows.length - 1) {
        const lastDate = row.visit_date;
        setRows(prev => [...prev, blankRow(lastDate)]);
        setTimeout(() => {
          const nextInputs = document.querySelectorAll('input[type="date"]');
          const last = nextInputs[nextInputs.length - 1];
          if (last) last.focus();
        }, 100);
      }
    } catch(e) {
      setRows(prev => prev.map((r,i) => i===idx ? {...r, _saving:false, _error:e.message} : r));
    }
  };

  const deleteRow = (idx) => {
    if (rows.length === 1) { setRows([blankRow('')]); return; }
    setRows(prev => prev.filter((_,i)=>i!==idx));
  };

  const addMoreRows = (n=5) => {
    const lastDate = rows[rows.length-1]?.visit_date || '';
    setRows(prev => [...prev, ...Array(n).fill(0).map(()=>blankRow(lastDate))]);
  };

  const fillDate = () => {
    if (!bulkDate) return;
    setRows(prev => prev.map(r => r._saved ? r : {...r, visit_date:bulkDate}));
  };

  const clearSaved = () => {
    const unsaved = rows.filter(r=>!r._saved);
    setRows(unsaved.length ? unsaved : [blankRow('')]);
  };

  const TABS = [['add','✏️ Add Records'],['view','📚 View & Search']];

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", padding:'0 4px' }}>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:4 }}>Pre-2026 Records</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:C.navy }}>Historical Records</div>
        <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>
          Enter customer records from 2022 onward · Tab to move fields · Enter to save each row
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24, borderBottom:`1.5px solid ${C.border}` }}>
        {TABS.map(([v,l]) => (
          <button key={v} onClick={()=>setTab(v)}
            style={{ padding:'10px 20px', border:'none', borderBottom:`3px solid ${tab===v?C.navy:'transparent'}`,
              background:'transparent', fontSize:13, fontWeight:tab===v?700:500, cursor:'pointer',
              fontFamily:'inherit', color:tab===v?C.navy:C.muted, marginBottom:-1.5 }}>
            {l}
          </button>
        ))}
        {savedCount > 0 && (
          <div style={{ marginLeft:'auto', alignSelf:'center', fontSize:12, color:C.success, fontWeight:700, background:'#dcfce7', padding:'4px 14px', borderRadius:20 }}>
            ✓ {savedCount} saved this session
          </div>
        )}
      </div>

      {/* Add Records Tab */}
      {tab === 'add' && (
        <div>
          {/* Toolbar */}
          <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center', background:C.cream, padding:'12px 16px', borderRadius:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.muted }}>Quick tools:</div>

            {/* Bulk date fill */}
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <input type="date" value={bulkDate} onChange={e=>setBulkDate(e.target.value)}
                style={{ padding:'6px 10px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12, fontFamily:'inherit', outline:'none' }}/>
              <button onClick={fillDate}
                style={{ padding:'6px 14px', background:C.navy, color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Apply Date to All
              </button>
            </div>

            <div style={{ width:1, height:24, background:C.border }}/>

            <button onClick={()=>addMoreRows(5)}
              style={{ padding:'6px 14px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.navy }}>
              + 5 Rows
            </button>
            <button onClick={()=>addMoreRows(10)}
              style={{ padding:'6px 14px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.navy }}>
              + 10 Rows
            </button>

            {rows.some(r=>r._saved) && (
              <button onClick={clearSaved}
                style={{ padding:'6px 14px', background:'#dcfce7', color:C.success, border:`1.5px solid #86efac`, borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Clear Saved Rows
              </button>
            )}

            <div style={{ marginLeft:'auto', fontSize:12, color:C.muted }}>
              {rows.filter(r=>r._saved).length} / {rows.length} rows saved
            </div>
          </div>

          {/* Tips */}
          <div style={{ background:'#fef9c3', border:'1px solid #fde68a', borderRadius:10, padding:'10px 16px', marginBottom:14, fontSize:12, color:'#92400e' }}>
            💡 <b>Tips:</b> Tab to move field to field · Enter or ✓ to save that row · New row added automatically after saving · Leave any field blank if unknown · Saved rows turn green
          </div>

          {/* Spreadsheet table */}
          <div style={{ overflowX:'auto', borderRadius:12, border:`1.5px solid ${C.border}` }}>
            <table style={{ borderCollapse:'collapse', width:'100%', minWidth:1200 }}>
              <thead>
                <tr style={{ background:C.navy }}>
                  {[['#','30px'],['Date','110px'],['Name','140px'],['Phone','95px'],['Age','50px'],
                    ['RE SPH','62px'],['RE CYL','62px'],['RE Axis','54px'],
                    ['LE SPH','62px'],['LE CYL','62px'],['LE Axis','54px'],
                    ['ADD','62px'],['Frame','130px'],['Lens Type','110px'],['Coating','110px'],
                    ['Price','80px'],['Notes','100px'],['','70px']
                  ].map(([l,w])=>(
                    <th key={l} style={{ padding:'8px 4px', textAlign:'left', color:C.gold, fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', width:w, whiteSpace:'nowrap' }}>
                      {l}
                    </th>
                  ))}
                </tr>
                {/* Group headers */}
                <tr style={{ background:'#0a1628' }}>
                  <td colSpan={5}/>
                  <td colSpan={3} style={{ padding:'3px 4px', fontSize:9, color:'rgba(201,168,76,.7)', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', textAlign:'center', borderRight:`1px solid rgba(255,255,255,.1)` }}>Right Eye</td>
                  <td colSpan={3} style={{ padding:'3px 4px', fontSize:9, color:'rgba(201,168,76,.7)', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', textAlign:'center', borderRight:`1px solid rgba(255,255,255,.1)` }}>Left Eye</td>
                  <td colSpan={10}/>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <EntryRow
                    key={idx} row={row} idx={idx}
                    onChange={changeRow}
                    onSave={saveRow}
                    onDelete={deleteRow}
                    onAddNext={()=>addMoreRows(1)}
                    firstRef={idx===0?firstRef:undefined}
                    isSaved={row._saved}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Add more rows button */}
          <div style={{ textAlign:'center', marginTop:12 }}>
            <button onClick={()=>addMoreRows(5)}
              style={{ padding:'10px 28px', background:'white', border:`1.5px dashed ${C.border}`, borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
              + Add 5 More Rows
            </button>
          </div>
        </div>
      )}

      {/* View Tab */}
      {tab === 'view' && (
        <RecordsList
          key={refreshKey}
          onEditRecord={setEditRecord}
        />
      )}

      {/* Edit modal */}
      {editRecord && (
        <EditModal
          record={editRecord}
          onClose={()=>setEditRecord(null)}
          onSaved={()=>{ setRefreshKey(k=>k+1); setEditRecord(null); }}
        />
      )}
    </div>
  );
}