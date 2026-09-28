/* eslint-disable */
import React, { useState, useEffect, useCallback, useRef } from 'react';

const BASE  = () => process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tok   = () => localStorage.getItem('ko_token');
const hdr   = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` });
const api   = (p,m='GET',b=null) => fetch(`${BASE()}${p}`,{method:m,headers:hdr(),body:b?JSON.stringify(b):null}).then(r=>r.json());
const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#15803d', danger:'#dc2626' };

// ── Lazy image ────────────────────────────────────────────────
function Thumb({ itemId, name, onFull }) {
  const [src, setSrc] = useState(null);
  const [tried, setTried] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !tried) {
        setTried(true);
        fetch(`${BASE()}/inventory/${itemId}`, { headers:hdr() })
          .then(r=>r.json()).then(d=>{ if(d.image_url) setSrc(d.image_url); }).catch(()=>{});
        obs.disconnect();
      }
    }, { threshold:0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [itemId, tried]);

  return (
    <div ref={ref}
      onClick={()=> src && onFull(src, name)}
      style={{ width:'100%', height:150, borderRadius:10, background:'#f0f2f5',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor: src?'zoom-in':'default', overflow:'hidden', marginBottom:8 }}>
      {src
        ? <img src={src} alt={name} style={{ width:'100%', height:'100%', objectFit:'contain', padding:6 }}/>
        : <span style={{ fontSize:32, opacity:.3 }}>👓</span>
      }
    </div>
  );
}

// ── Fullscreen ────────────────────────────────────────────────
function FullImg({ src, name, onClose }) {
  useEffect(() => {
    const h = e => { if(e.key==='Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.92)', zIndex:9999,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:16 }}>
      <img src={src} alt={name} style={{ maxWidth:'100%', maxHeight:'80vh', objectFit:'contain', borderRadius:10 }}/>
      <div style={{ color:'rgba(255,255,255,.7)', fontSize:13, marginTop:10, textAlign:'center' }}>{name}</div>
      <button onClick={onClose} style={{ marginTop:16, padding:'10px 28px', background:'white', border:'none',
        borderRadius:20, fontSize:14, fontWeight:700, cursor:'pointer' }}>✕ Close</button>
    </div>
  );
}

// ── Small qty stepper ─────────────────────────────────────────
function Stepper({ value, max, min=0, onChange, disabled, color='#0f1f3d' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      <button onClick={()=>onChange(Math.max(min,value-1))} disabled={disabled||value<=min}
        style={{ width:24, height:24, borderRadius:6, border:`1px solid ${C.border}`, background:'white',
          color, fontWeight:700, cursor:'pointer', fontSize:13, opacity:value<=min?.4:1, lineHeight:1 }}>−</button>
      <span style={{ fontSize:15, fontWeight:800, color, minWidth:18, textAlign:'center' }}>{value}</span>
      <button onClick={()=>onChange(Math.min(max,value+1))} disabled={disabled||value>=max}
        style={{ width:24, height:24, borderRadius:6, border:`1px solid ${C.border}`, background:'white',
          color, fontWeight:700, cursor:'pointer', fontSize:13, opacity:value>=max?.4:1, lineHeight:1 }}>+</button>
    </div>
  );
}

export default function ShowroomTracker() {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterLoc,  setFilterLoc]  = useState('all');
  const [filterCat,  setFilterCat]  = useState('All');
  const [saving,     setSaving]     = useState({});
  const [toast,      setToast]      = useState('');
  const [fullImg,    setFullImg]    = useState(null);
  const [checkMode,  setCheckMode]  = useState(false);
  const [checkedIds, setCheckedIds] = useState(new Set());

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),2500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/inventory?limit=5000&no_images=1');
      const rows = Array.isArray(data) ? data : (data.data || []);
      // Show ALL items including out-of-stock (so missing items still appear)
      setItems(rows.filter(i => i.category !== 'Old Stock'));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Save a numeric field
  const saveField = async (id, patch) => {
    setSaving(s=>({...s,[id]:true}));
    try {
      await api(`/inventory/${id}`, 'PATCH', patch);
      setItems(prev => prev.map(i => i.id===id ? {...i,...patch} : i));
    } catch(e) {
      showToast('⚠️ Save failed');
    } finally { setSaving(s=>({...s,[id]:false})); }
  };

  const setShowroomQty = (id, qty, item) => {
    const total   = parseInt(item.quantity||0);
    const missing = parseInt(item.missing_qty||0);
    const maxSR   = Math.max(0, total - missing); // can't put more in showroom than available
    const q = Math.max(0, Math.min(maxSR, qty));
    saveField(id, { showroom_qty: q });
    showToast(`🏪 Showroom: ${q}`);
  };

  const setMissingQty = (id, qty, item) => {
    const total   = parseInt(item.quantity||0);
    const showroom= parseInt(item.showroom_qty||0);
    const maxMs   = Math.max(0, total - showroom);
    const q = Math.max(0, Math.min(maxMs, qty));
    saveField(id, { missing_qty: q });
    showToast(`⚠️ Missing: ${q}`);
  };

  // Derived status for an item
  const getStatus = (item) => {
    const qty     = parseInt(item.quantity||0);
    const sqty    = parseInt(item.showroom_qty||0);
    const mqty    = parseInt(item.missing_qty||0);
    const inStock = Math.max(0, qty - sqty - mqty);
    return { qty, sqty, mqty, inStock };
  };

  // Summary counts
  const totalInShowroom  = items.reduce((s,i)=>s+Math.max(0,parseInt(i.showroom_qty||0)),0);
  const totalMissing     = items.reduce((s,i)=>s+Math.max(0,parseInt(i.missing_qty||0)),0);
  const totalInStock     = items.reduce((s,i)=>{ const {qty,sqty,mqty}=getStatus(i); return s+Math.max(0,qty-sqty-mqty); },0);
  const totalOutOfStock  = items.filter(i=>parseInt(i.quantity||0)===0).length;
  const hasMissingItems  = items.filter(i=>parseInt(i.missing_qty||0)>0).length;
  const cats = ['All',...new Set(items.map(i=>i.category).filter(Boolean))];

  // Filter
  const filtered = items.filter(i => {
    const { qty, sqty, mqty, inStock } = getStatus(i);
    if (filterLoc==='showroom'   && sqty===0) return false;
    if (filterLoc==='stock'      && inStock===0) return false;
    if (filterLoc==='missing'    && mqty===0) return false;
    if (filterLoc==='outofstock' && qty>0) return false;
    if (filterCat!=='All'        && i.category!==filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return (i.name||'').toLowerCase().includes(q)||
             (i.frame_color||'').toLowerCase().includes(q)||
             (i.brand||'').toLowerCase().includes(q);
    }
    return true;
  });

  const checkItems = filtered.filter(i=>parseInt(i.showroom_qty||0)>0);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", paddingBottom:40 }}>
      {toast && <div style={{ position:'fixed', top:16, left:'50%', transform:'translateX(-50%)',
        background:C.navy, color:'white', padding:'10px 20px', borderRadius:10, zIndex:999, fontSize:13, fontWeight:600, whiteSpace:'nowrap' }}>{toast}</div>}
      {fullImg && <FullImg src={fullImg.src} name={fullImg.name} onClose={()=>setFullImg(null)}/>}

      {/* Header */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:2 }}>Inventory</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>Showroom Tracker</h1>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={load} style={{ padding:'8px 14px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.navy }}>🔄</button>
            <button onClick={()=>{ setCheckMode(m=>!m); setCheckedIds(new Set()); }}
              style={{ padding:'8px 14px', background:checkMode?C.navy:'#fef9c3', border:`1.5px solid ${checkMode?C.navy:'#fde68a'}`,
                borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:checkMode?'white':'#92400e' }}>
              {checkMode ? '✕ Exit Check' : '✅ Weekly Check'}
            </button>
          </div>
        </div>
      </div>

      {/* Missing alert banner */}
      {totalMissing > 0 && !checkMode && (
        <div onClick={()=>setFilterLoc(f=>f==='missing'?'all':'missing')}
          style={{ background:'#fef3c7', border:'2px solid #fbbf24', borderRadius:12, padding:'10px 14px',
            marginBottom:12, cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:22 }}>⚠️</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#92400e' }}>{totalMissing} unit{totalMissing!==1?'s':''} marked missing across {hasMissingItems} item{hasMissingItems!==1?'s':''}</div>
            <div style={{ fontSize:11, color:'#b45309' }}>Tap to view missing items</div>
          </div>
        </div>
      )}

      {/* Weekly check banner */}
      {checkMode && (
        <div style={{ background:'#fef9c3', border:'1.5px solid #fde68a', borderRadius:12, padding:'12px 14px', marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#92400e', marginBottom:2 }}>📋 Weekly Check Mode</div>
          <div style={{ fontSize:12, color:'#92400e' }}>
            Check each item's showroom qty. Mark missing units with ⚠️ stepper.
            <b> {checkedIds.size}/{checkItems.length}</b> confirmed.
          </div>
          <div style={{ marginTop:8, background:'white', borderRadius:8, height:8, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'#15803d', width:`${checkItems.length>0?(checkedIds.size/checkItems.length*100):0}%`, transition:'width .3s' }}/>
          </div>
        </div>
      )}

      {/* Stats — 4 tiles */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
        {[
          { label:'In Showroom', value:totalInShowroom, icon:'🏪', color:'#15803d', bg:'#f0fdf4', border:'#86efac', f:'showroom' },
          { label:'In Stock Room', value:totalInStock,  icon:'📦', color:'#1e40af', bg:'#eff6ff', border:'#93c5fd', f:'stock' },
          { label:'Missing',     value:totalMissing,    icon:'⚠️', color:'#92400e', bg:'#fef9c3', border:'#fde68a', f:'missing' },
          { label:'Out of Stock',value:totalOutOfStock, icon:'❌', color:C.danger,  bg:'#fef2f2', border:'#fca5a5', f:'outofstock' },
        ].map(s=>(
          <div key={s.f} onClick={()=>setFilterLoc(f=>f===s.f?'all':s.f)}
            style={{ background:filterLoc===s.f?s.bg:'white', border:`2px solid ${filterLoc===s.f?s.border:C.border}`,
              borderRadius:12, padding:'12px 14px', cursor:'pointer', transition:'all .15s' }}>
            <div style={{ fontSize:22, marginBottom:2 }}>{s.icon}</div>
            <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="🔍 Search frame, color, brand..."
        style={{ width:'100%', padding:'10px 14px', border:`1.5px solid ${C.border}`, borderRadius:10,
          fontSize:14, fontFamily:'inherit', outline:'none', background:'white', color:C.navy,
          boxSizing:'border-box', marginBottom:10 }}/>

      {/* Category filter */}
      <div style={{ display:'flex', gap:6, flexWrap:'nowrap', overflowX:'auto', paddingBottom:4, marginBottom:12, WebkitOverflowScrolling:'touch' }}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setFilterCat(c)}
            style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${filterCat===c?C.navy:C.border}`,
              background:filterCat===c?C.navy:'white', color:filterCat===c?'white':C.muted,
              fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0 }}>
            {c}
          </button>
        ))}
      </div>

      {/* Count */}
      <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>
        <b style={{color:C.navy}}>{filtered.length}</b> items
        {filterLoc!=='all' && <span style={{ color:C.gold }}> · {filterLoc}</span>}
        {search && <span style={{ color:C.gold }}> · "{search}"</span>}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:C.muted, fontSize:14 }}>⏳ Loading...</div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:60, color:C.muted }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🔍</div>
          <div style={{ fontSize:14, fontWeight:600, color:C.navy }}>No items found</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
          {filtered.map(item => {
            const { qty, sqty, mqty, inStock } = getStatus(item);
            const isSaving  = saving[item.id];
            const isChecked = checkedIds.has(item.id);

            // Card border colour: red if any missing, green if any in showroom, default otherwise
            const borderColor = mqty>0 ? '#fbbf24' : sqty>0 ? '#86efac' : C.border;
            const cardBg      = mqty>0 ? '#fffbeb' : 'white';

            return (
              <div key={item.id} style={{ background:cardBg, borderRadius:14, overflow:'hidden',
                border:`2px solid ${borderColor}`,
                boxShadow:'0 1px 6px rgba(0,0,0,.06)', opacity:isSaving?.7:1, position:'relative',
                transition:'opacity .15s' }}>

                {/* Image */}
                <div style={{ padding:'10px 10px 0' }}>
                  <Thumb itemId={item.id} name={item.name} onFull={(src,name)=>setFullImg({src,name})}/>
                </div>

                {/* Info */}
                <div style={{ padding:'0 10px 10px' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy, lineHeight:1.3, marginBottom:3 }}>
                    {item.name || item.brand || '—'}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>
                    {[item.frame_color, item.frame_material].filter(Boolean).join(' · ')}
                    {item.display_number ? <span style={{ color:C.gold, fontWeight:600 }}> #{item.display_number}</span> : null}
                  </div>

                  {/* Stock breakdown row */}
                  <div style={{ display:'flex', gap:4, marginBottom:8, flexWrap:'wrap' }}>
                    {/* Total */}
                    <div style={{ display:'flex', alignItems:'center', gap:3, background:'#f1f5f9', borderRadius:6, padding:'3px 7px' }}>
                      <span style={{ fontSize:9, color:C.muted, fontWeight:600 }}>TOTAL</span>
                      <span style={{ fontSize:13, fontWeight:800, color: qty===0?C.danger:C.navy }}>{qty}</span>
                    </div>
                    {/* Showroom */}
                    {sqty > 0 && (
                      <div style={{ display:'flex', alignItems:'center', gap:3, background:'#dcfce7', borderRadius:6, padding:'3px 7px' }}>
                        <span style={{ fontSize:9, color:'#15803d', fontWeight:600 }}>🏪</span>
                        <span style={{ fontSize:13, fontWeight:800, color:'#15803d' }}>{sqty}</span>
                      </div>
                    )}
                    {/* Stock room */}
                    {inStock > 0 && (
                      <div style={{ display:'flex', alignItems:'center', gap:3, background:'#eff6ff', borderRadius:6, padding:'3px 7px' }}>
                        <span style={{ fontSize:9, color:'#1e40af', fontWeight:600 }}>📦</span>
                        <span style={{ fontSize:13, fontWeight:800, color:'#1e40af' }}>{inStock}</span>
                      </div>
                    )}
                    {/* Missing */}
                    {mqty > 0 && (
                      <div style={{ display:'flex', alignItems:'center', gap:3, background:'#fef3c7', borderRadius:6, padding:'3px 7px' }}>
                        <span style={{ fontSize:9, color:'#92400e', fontWeight:600 }}>⚠️</span>
                        <span style={{ fontSize:13, fontWeight:800, color:'#92400e' }}>{mqty}</span>
                      </div>
                    )}
                  </div>

                  {/* Weekly check mode */}
                  {checkMode ? (
                    sqty > 0 ? (
                      isChecked ? (
                        <div style={{ background:'#dcfce7', borderRadius:8, padding:'8px', textAlign:'center', fontSize:12, fontWeight:700, color:'#15803d' }}>
                          ✓ Confirmed
                        </div>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          <button onClick={()=>{ setCheckedIds(s=>new Set([...s,item.id])); showToast('✓ Confirmed'); }}
                            style={{ padding:'8px', background:'#15803d', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                            ✓ All Here ({sqty})
                          </button>
                          {/* Quick missing button — marks 1 missing */}
                          <button onClick={()=>{ setMissingQty(item.id, mqty+1, item); setCheckedIds(s=>new Set([...s,item.id])); }}
                            disabled={mqty >= sqty}
                            style={{ padding:'8px', background:'#fef9c3', border:'1px solid #fde68a', borderRadius:8, fontSize:12, fontWeight:700,
                              cursor:mqty>=sqty?'not-allowed':'pointer', fontFamily:'inherit', color:'#92400e', opacity:mqty>=sqty?.4:1 }}>
                            ⚠️ +1 Missing
                          </button>
                        </div>
                      )
                    ) : (
                      <div style={{ fontSize:11, color:C.muted, textAlign:'center', padding:'6px 0' }}>Not in showroom</div>
                    )
                  ) : (
                    <>
                      {/* Showroom qty stepper */}
                      <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:8, padding:'6px 8px', marginBottom:6 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <span style={{ fontSize:10, color:'#15803d', fontWeight:700 }}>🏪 Showroom</span>
                          <Stepper
                            value={sqty}
                            max={Math.max(0, qty - mqty)}
                            min={0}
                            disabled={isSaving}
                            color='#15803d'
                            onChange={v=>setShowroomQty(item.id, v, item)}
                          />
                        </div>
                      </div>

                      {/* Missing qty stepper */}
                      <div style={{ background:'#fffbeb', border:`1px solid ${mqty>0?'#fbbf24':'#e0ddd6'}`, borderRadius:8, padding:'6px 8px' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <span style={{ fontSize:10, color:'#92400e', fontWeight:700 }}>⚠️ Missing</span>
                          <Stepper
                            value={mqty}
                            max={Math.max(0, qty - sqty)}
                            min={0}
                            disabled={isSaving}
                            color='#92400e'
                            onChange={v=>setMissingQty(item.id, v, item)}
                          />
                        </div>
                      </div>

                      {/* Stock room count (derived) */}
                      {inStock > 0 && (
                        <div style={{ marginTop:5, fontSize:10, color:C.muted, textAlign:'right' }}>
                          📦 {inStock} in stock room
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}