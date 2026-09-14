/* eslint-disable */
import React, { useState, useEffect, useCallback, useRef } from 'react';

const BASE  = () => process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tok   = () => localStorage.getItem('ko_token');
const hdr   = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` });
const api   = (p,m='GET',b=null) => fetch(`${BASE()}${p}`,{method:m,headers:hdr(),body:b?JSON.stringify(b):null}).then(r=>r.json());

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#15803d', danger:'#dc2626' };
const INP = { padding:'7px 10px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:'white', color:C.navy };

// ── Lazy image thumbnail ──────────────────────────────────────
function Thumb({ itemId, name, onFull }) {
  const [src, setSrc] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !src) {
        fetch(`${BASE()}/inventory/${itemId}`, { headers:hdr() })
          .then(r=>r.json()).then(d=>{ if(d.image_url) setSrc(d.image_url); }).catch(()=>{});
        obs.disconnect();
      }
    }, { threshold:0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [itemId]);

  return (
    <div ref={ref} style={{ width:52, height:40, borderRadius:6, background:'#f8f5ef', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', cursor: src?'zoom-in':'default' }}
      onClick={()=> src && onFull(src, name)}>
      {src
        ? <img src={src} alt={name} style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }}/>
        : <span style={{ fontSize:16 }}>👓</span>
      }
    </div>
  );
}

// ── Fullscreen modal ──────────────────────────────────────────
function FullImg({ src, name, onClose }) {
  useEffect(() => {
    const h = e => { if(e.key==='Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.88)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out' }}>
      <div onClick={e=>e.stopPropagation()} style={{ position:'relative' }}>
        <img src={src} alt={name} style={{ maxWidth:'92vw', maxHeight:'88vh', objectFit:'contain', borderRadius:10, boxShadow:'0 8px 40px rgba(0,0,0,.5)' }}/>
        <div style={{ textAlign:'center', color:'rgba(255,255,255,.7)', fontSize:12, marginTop:8 }}>{name}</div>
        <button onClick={onClose} style={{ position:'absolute', top:-14, right:-14, width:30, height:30, borderRadius:'50%', background:'white', border:'none', fontSize:16, fontWeight:700, cursor:'pointer' }}>✕</button>
      </div>
    </div>
  );
}

// ── Location pill ─────────────────────────────────────────────
const LOC_STYLE = {
  showroom: { bg:'#dcfce7', text:'#15803d', label:'🏪 Showroom' },
  stock:    { bg:'#eff6ff', text:'#1e40af', label:'📦 Stock Room' },
  missing:  { bg:'#fef9c3', text:'#92400e', label:'⚠️ Missing' },
};

export default function ShowroomTracker() {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterLoc,  setFilterLoc]  = useState('all');
  const [filterCat,  setFilterCat]  = useState('All');
  const [saving,     setSaving]     = useState({});
  const [toast,      setToast]      = useState('');
  const [fullImg,    setFullImg]    = useState(null);

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),2500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/inventory?limit=5000&no_images=1');
      setItems(Array.isArray(data) ? data.filter(i=>i.category!=='Old Stock') : []);
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
    const q = Math.max(0, Math.min(total, parseInt(qty)||0));
    setSaving(s=>({...s,[id]:true}));
    try {
      await api(`/inventory/${id}`, 'PATCH', { showroom_qty: q });
      setItems(prev => prev.map(i => i.id===id ? {...i, showroom_qty:q} : i));
    } finally { setSaving(s=>({...s,[id]:false})); }
  };

  // Stats
  const inShowroom  = items.filter(i=>i.location==='showroom').length;
  const inStock     = items.filter(i=>i.location==='stock' || !i.location).length;
  const missing     = items.filter(i=>i.location==='missing').length;
  const outOfStock  = items.filter(i=>parseInt(i.quantity||0)===0).length;

  // Categories
  const cats = ['All', ...new Set(items.map(i=>i.category).filter(Boolean))].slice(0,12);

  // Filtered
  const filtered = items.filter(i => {
    const qty = parseInt(i.quantity||0);
    if (filterLoc==='showroom'  && i.location!=='showroom') return false;
    if (filterLoc==='stock'     && (i.location==='showroom'||i.location==='missing')) return false;
    if (filterLoc==='missing'   && i.location!=='missing') return false;
    if (filterLoc==='outofstock'&& qty>0) return false;
    if (filterCat!=='All'       && i.category!==filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return (i.name||'').toLowerCase().includes(q) ||
             (i.frame_color||'').toLowerCase().includes(q) ||
             (i.brand||'').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      {toast && <div style={{ position:'fixed', top:20, right:20, background:C.navy, color:'white', padding:'10px 18px', borderRadius:10, zIndex:999, fontSize:13, fontWeight:600 }}>{toast}</div>}
      {fullImg && <FullImg src={fullImg.src} name={fullImg.name} onClose={()=>setFullImg(null)}/>}

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:4 }}>Inventory Management</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:C.navy, margin:0 }}>Showroom Tracker</h1>
            <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Track which frames are in showroom, stock room, or missing</p>
          </div>
          <button onClick={load} style={{ padding:'9px 18px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.navy }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats — clickable filters */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'In Showroom',  value:inShowroom, icon:'🏪', color:'#15803d', bg:'#f0fdf4', border:'#86efac', filter:'showroom' },
          { label:'Stock Room',   value:inStock,    icon:'📦', color:'#1e40af', bg:'#eff6ff', border:'#93c5fd', filter:'stock' },
          { label:'Missing',      value:missing,    icon:'⚠️', color:'#92400e', bg:'#fef9c3', border:'#fde68a', filter:'missing' },
          { label:'Out of Stock', value:outOfStock, icon:'❌', color:C.danger,  bg:'#fef2f2', border:'#fca5a5', filter:'outofstock' },
        ].map(s=>(
          <div key={s.filter} onClick={()=>setFilterLoc(f=>f===s.filter?'all':s.filter)}
            style={{ background:filterLoc===s.filter?s.bg:'white', border:`2px solid ${filterLoc===s.filter?s.border:C.border}`,
              borderRadius:12, padding:'14px 16px', cursor:'pointer', transition:'all .15s' }}>
            <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + category filter */}
      <div style={{ display:'flex', gap:10, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search frame name, color, brand..."
          style={{ ...INP, flex:1, minWidth:200 }}/>
        {filterLoc!=='all' && (
          <button onClick={()=>setFilterLoc('all')}
            style={{ padding:'7px 14px', background:'#fef2f2', border:`1px solid #fca5a5`, borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', color:C.danger, fontFamily:'inherit' }}>
            ✕ Clear filter
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setFilterCat(c)}
            style={{ padding:'5px 14px', borderRadius:20, border:`1.5px solid ${filterCat===c?C.navy:C.border}`,
              background:filterCat===c?C.navy:'white', color:filterCat===c?'white':C.muted,
              fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Count */}
      <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>
        Showing <b style={{color:C.navy}}>{filtered.length}</b> of {items.length} frames
        {filterLoc!=='all' && <span style={{ color:C.gold, fontWeight:600 }}> · filtered by {filterLoc}</span>}
      </div>

      {/* TABLE */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:C.muted }}>Loading...</div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:60, color:C.muted }}>
          <div style={{ fontSize:36, marginBottom:10 }}>🔍</div>
          <div style={{ fontSize:15, fontWeight:600, color:C.navy }}>No frames found</div>
        </div>
      ) : (
        <div style={{ background:'white', border:`1.5px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
          {/* Table header */}
          <div style={{ display:'grid', gridTemplateColumns:'52px 1fr 80px 160px 140px', gap:0,
            background:C.navy, padding:'10px 16px', alignItems:'center' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:'.5px' }}>Photo</div>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:'.5px' }}>Frame</div>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:'.5px', textAlign:'center' }}>Stock</div>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:'.5px', textAlign:'center' }}>Location</div>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:'.5px', textAlign:'center' }}>Showroom Qty</div>
          </div>

          {/* Rows */}
          {filtered.map((item, idx) => {
            const qty    = parseInt(item.quantity||0);
            const sqty   = parseInt(item.showroom_qty||0);
            const loc    = item.location || 'stock';
            const ls     = LOC_STYLE[loc] || LOC_STYLE.stock;
            const isSaving = saving[item.id];

            return (
              <div key={item.id} style={{ display:'grid', gridTemplateColumns:'52px 1fr 80px 160px 140px',
                gap:0, padding:'10px 16px', alignItems:'center',
                borderBottom:`1px solid ${C.border}`,
                background: idx%2===0 ? 'white' : '#fafaf9',
                opacity: isSaving ? .6 : 1 }}>

                {/* Photo */}
                <Thumb itemId={item.id} name={item.name} onFull={(src,name)=>setFullImg({src,name})}/>

                {/* Frame info */}
                <div style={{ paddingLeft:12, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {item.name || item.brand || '—'}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>
                    {[item.category, item.frame_color, item.frame_material].filter(Boolean).join(' · ')}
                  </div>
                  {item.display_number && <div style={{ fontSize:10, color:C.gold, fontWeight:600, marginTop:1 }}>Display #{item.display_number}</div>}
                </div>

                {/* Stock qty */}
                <div style={{ textAlign:'center' }}>
                  <span style={{ fontSize:16, fontWeight:800, color: qty===0?C.danger:qty<=2?'#f59e0b':C.success }}>{qty}</span>
                </div>

                {/* Location — 3 buttons */}
                <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
                  {[['showroom','🏪','#dcfce7','#15803d'],['stock','📦','#eff6ff','#1e40af'],['missing','⚠️','#fef9c3','#92400e']].map(([l,icon,bg,tc])=>(
                    <button key={l} onClick={()=>loc!==l && setLoc(item.id, l)} disabled={isSaving}
                      style={{ padding:'4px 7px', borderRadius:7, border:`1.5px solid ${loc===l?tc:'#e5e7eb'}`,
                        background:loc===l?bg:'white', color:loc===l?tc:C.muted,
                        fontSize:11, fontWeight:loc===l?700:500, cursor:loc===l?'default':'pointer',
                        fontFamily:'inherit', transition:'all .1s' }}>
                      {icon}
                    </button>
                  ))}
                </div>

                {/* Showroom qty */}
                <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'center' }}>
                  <button onClick={()=>setShowroomQty(item.id, sqty-1, qty)} disabled={isSaving||sqty<=0}
                    style={{ width:24, height:24, borderRadius:6, border:`1px solid ${C.border}`, background:'white',
                      color:C.navy, fontWeight:700, cursor:'pointer', fontSize:13, opacity:sqty<=0?.4:1 }}>−</button>
                  <input type="number" value={sqty} min={0} max={qty}
                    onChange={e=>setShowroomQty(item.id, e.target.value, qty)}
                    style={{ width:36, textAlign:'center', padding:'3px 4px', border:`1px solid ${C.border}`,
                      borderRadius:6, fontSize:13, fontWeight:700, color:C.navy, fontFamily:'inherit', outline:'none' }}/>
                  <button onClick={()=>setShowroomQty(item.id, sqty+1, qty)} disabled={isSaving||sqty>=qty}
                    style={{ width:24, height:24, borderRadius:6, border:`1px solid ${C.border}`, background:'white',
                      color:C.navy, fontWeight:700, cursor:'pointer', fontSize:13, opacity:sqty>=qty?.4:1 }}>+</button>
                  <span style={{ fontSize:10, color:C.muted }}>/{qty}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}