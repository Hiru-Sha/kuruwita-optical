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
      style={{ width:'100%', height:160, borderRadius:10, background:'#f0f2f5',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor: src?'zoom-in':'default', overflow:'hidden', marginBottom:10 }}>
      {src
        ? <img src={src} alt={name} style={{ width:'100%', height:'100%', objectFit:'contain', padding:6 }}/>
        : <span style={{ fontSize:36, opacity:.3 }}>👓</span>
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
      setItems(rows.filter(i=>i.category!=='Old Stock'));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setLoc = async (id, loc) => {
    setSaving(s=>({...s,[id]:true}));
    try {
      await api(`/inventory/${id}`, 'PATCH', { location: loc });
      setItems(prev => prev.map(i => i.id===id ? {...i, location:loc} : i));
      showToast(`✓ Moved to ${loc}`);
    } finally { setSaving(s=>({...s,[id]:false})); }
  };

  const setShowroomQty = async (id, qty, total) => {
    const q = Math.max(0, Math.min(parseInt(total)||0, parseInt(qty)||0));
    setSaving(s=>({...s,[id]:true}));
    try {
      await api(`/inventory/${id}`, 'PATCH', { showroom_qty: q });
      setItems(prev => prev.map(i => i.id===id ? {...i, showroom_qty:q} : i));
    } finally { setSaving(s=>({...s,[id]:false})); }
  };

  const inShowroom = items.filter(i=>i.location==='showroom').length;
  const inStock    = items.filter(i=>i.location==='stock'||!i.location).length;
  const missing    = items.filter(i=>i.location==='missing').length;
  const outOfStock = items.filter(i=>parseInt(i.quantity||0)===0).length;
  const cats       = ['All',...new Set(items.map(i=>i.category).filter(Boolean))];

  const filtered = items.filter(i => {
    const qty = parseInt(i.quantity||0);
    if (filterLoc==='showroom'   && i.location!=='showroom') return false;
    if (filterLoc==='stock'      && (i.location==='showroom'||i.location==='missing')) return false;
    if (filterLoc==='missing'    && i.location!=='missing') return false;
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

      {/* Weekly check banner */}
      {checkMode && (
        <div style={{ background:'#fef9c3', border:'1.5px solid #fde68a', borderRadius:12, padding:'12px 14px', marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#92400e', marginBottom:2 }}>📋 Weekly Check Mode</div>
          <div style={{ fontSize:12, color:'#92400e' }}>
            Tap each showroom frame to confirm or mark missing.
            <b> {checkedIds.size}/{inShowroom}</b> confirmed.
          </div>
          <div style={{ marginTop:8, background:'white', borderRadius:8, height:8, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'#15803d', width:`${inShowroom>0?(checkedIds.size/inShowroom*100):0}%`, transition:'width .3s' }}/>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
        {[
          { label:'Showroom',    value:inShowroom, icon:'🏪', color:'#15803d', bg:'#f0fdf4', border:'#86efac', f:'showroom' },
          { label:'Stock Room',  value:inStock,    icon:'📦', color:'#1e40af', bg:'#eff6ff', border:'#93c5fd', f:'stock' },
          { label:'Missing',     value:missing,    icon:'⚠️', color:'#92400e', bg:'#fef9c3', border:'#fde68a', f:'missing' },
          { label:'Out of Stock',value:outOfStock, icon:'❌', color:C.danger,  bg:'#fef2f2', border:'#fca5a5', f:'outofstock' },
        ].map(s=>(
          <div key={s.f} onClick={()=>setFilterLoc(f=>f===s.f?'all':s.f)}
            style={{ background:filterLoc===s.f?s.bg:'white', border:`2px solid ${filterLoc===s.f?s.border:C.border}`,
              borderRadius:12, padding:'12px 14px', cursor:'pointer' }}>
            <div style={{ fontSize:22, marginBottom:2 }}>{s.icon}</div>
            <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
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
        <b style={{color:C.navy}}>{filtered.length}</b> frames
        {filterLoc!=='all' && <span style={{ color:C.gold }}> · {filterLoc}</span>}
        {search && <span style={{ color:C.gold }}> · "{search}"</span>}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:C.muted, fontSize:14 }}>⏳ Loading...</div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:60, color:C.muted }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🔍</div>
          <div style={{ fontSize:14, fontWeight:600, color:C.navy }}>No frames found</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
          {filtered.map(item => {
            const qty     = parseInt(item.quantity||0);
            const sqty    = parseInt(item.showroom_qty||0);
            const loc     = item.location || 'stock';
            const isSaving = saving[item.id];
            const isChecked = checkedIds.has(item.id);

            const locStyle = {
              showroom:{ bg:'#dcfce7', color:'#15803d', label:'🏪 Showroom' },
              stock:   { bg:'#eff6ff', color:'#1e40af', label:'📦 Stock' },
              missing: { bg:'#fef9c3', color:'#92400e', label:'⚠️ Missing' },
            }[loc] || { bg:'#eff6ff', color:'#1e40af', label:'📦 Stock' };

            return (
              <div key={item.id} style={{ background:'white', borderRadius:14, overflow:'hidden',
                border:`2px solid ${loc==='missing'?'#fde68a':loc==='showroom'?'#86efac':C.border}`,
                boxShadow:'0 1px 6px rgba(0,0,0,.06)', opacity:isSaving?.6:1, position:'relative' }}>

                {/* Location badge */}
                <div style={{ position:'absolute', top:8, right:8, background:locStyle.bg, color:locStyle.color,
                  fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20, zIndex:2 }}>
                  {locStyle.label}
                </div>

                {/* Image */}
                <div style={{ padding:'10px 10px 0' }}>
                  <Thumb itemId={item.id} name={item.name} onFull={(src,name)=>setFullImg({src,name})}/>
                </div>

                {/* Info */}
                <div style={{ padding:'0 10px 10px' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy, lineHeight:1.3, marginBottom:3 }}>
                    {item.name || item.brand || '—'}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:2 }}>
                    {[item.frame_color, item.frame_material, item.frame_size].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                    <span style={{ fontSize:11, color:C.muted }}>Stock:</span>
                    <span style={{ fontSize:14, fontWeight:800, color:qty===0?C.danger:qty<=2?'#f59e0b':C.success }}>{qty}</span>
                    {item.display_number && <span style={{ fontSize:10, color:C.gold, fontWeight:600 }}>#{item.display_number}</span>}
                  </div>

                  {/* Weekly check overlay */}
                  {checkMode && loc==='showroom' ? (
                    isChecked ? (
                      <div style={{ background:'#dcfce7', borderRadius:8, padding:'8px', textAlign:'center', fontSize:12, fontWeight:700, color:'#15803d' }}>
                        ✓ Confirmed
                      </div>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        <button onClick={()=>setCheckedIds(s=>new Set([...s,item.id]))}
                          style={{ padding:'8px', background:'#15803d', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                          ✓ Frame is here
                        </button>
                        <button onClick={()=>{ setLoc(item.id,'missing'); setCheckedIds(s=>new Set([...s,item.id])); }}
                          style={{ padding:'8px', background:'#fef9c3', border:'1px solid #fde68a', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:'#92400e' }}>
                          ⚠️ Missing
                        </button>
                      </div>
                    )
                  ) : (
                    <>
                      {/* Location buttons */}
                      <div style={{ display:'flex', gap:4, marginBottom:8 }}>
                        {[['showroom','🏪'],['stock','📦'],['missing','⚠️']].map(([l,icon])=>(
                          <button key={l} onClick={()=>loc!==l&&setLoc(item.id,l)} disabled={isSaving}
                            style={{ flex:1, padding:'6px 4px', borderRadius:8,
                              border:`1.5px solid ${loc===l?({showroom:'#86efac',stock:'#93c5fd',missing:'#fde68a'}[l]||C.border):C.border}`,
                              background:loc===l?({showroom:'#dcfce7',stock:'#eff6ff',missing:'#fef9c3'}[l]||'white'):'white',
                              fontSize:14, cursor:loc===l?'default':'pointer', fontFamily:'inherit' }}>
                            {icon}
                          </button>
                        ))}
                      </div>

                      {/* Showroom qty */}
                      <div style={{ display:'flex', alignItems:'center', gap:6, background:'#f8f5ef', borderRadius:8, padding:'6px 8px' }}>
                        <span style={{ fontSize:10, color:C.muted, flex:1 }}>🏪 Showroom qty</span>
                        <button onClick={()=>setShowroomQty(item.id,sqty-1,qty)} disabled={isSaving||sqty<=0}
                          style={{ width:26, height:26, borderRadius:6, border:`1px solid ${C.border}`, background:'white', color:C.navy, fontWeight:700, cursor:'pointer', fontSize:14, opacity:sqty<=0?.4:1 }}>−</button>
                        <span style={{ fontSize:15, fontWeight:800, color:C.navy, minWidth:20, textAlign:'center' }}>{sqty}</span>
                        <button onClick={()=>setShowroomQty(item.id,sqty+1,qty)} disabled={isSaving||sqty>=qty}
                          style={{ width:26, height:26, borderRadius:6, border:`1px solid ${C.border}`, background:'white', color:C.navy, fontWeight:700, cursor:'pointer', fontSize:14, opacity:sqty>=qty?.4:1 }}>+</button>
                      </div>
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