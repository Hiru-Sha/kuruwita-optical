/* eslint-disable */
import React, { useState, useEffect, useCallback } from 'react';

const BASE  = () => process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tok   = () => localStorage.getItem('ko_token');
const hdr   = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` });

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#15803d', danger:'#dc2626',
};

export default function ShowroomTracker() {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState({});
  const [search,      setSearch]      = useState('');
  const [filterCat,   setFilterCat]   = useState('All');
  const [filterLoc,   setFilterLoc]   = useState('all'); // 'all' | 'showroom' | 'stock' | 'missing'
  const [lastChecked, setLastChecked] = useState(null);
  const [toast,       setToast]       = useState('');
  const [checkMode,   setCheckMode]   = useState(false); // weekly check mode
  const [mismatches,  setMismatches]  = useState([]); // items that don't match reality
  const [editQty,     setEditQty]     = useState({}); // { [id]: tempQty }

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE()}/inventory?limit=5000&no_images=1`, { headers: hdr() });
      const data = await res.json();
      const arr  = Array.isArray(data) ? data : (data.data || []);
      // Only frames/sunglasses/reading glasses — things that go in showroom
      setItems(arr.filter(i => ['Frames','Sunglasses','Reading Glasses'].includes(i.category)));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Update location for one item
  const setLocation = async (id, location) => {
    setSaving(s => ({ ...s, [id]: true }));
    try {
      await fetch(`${BASE()}/inventory/${id}`, {
        method: 'PATCH',
        headers: hdr(),
        body: JSON.stringify({ location }),
      });
      setItems(prev => prev.map(i => i.id === id ? { ...i, location } : i));
      showToast(`✓ Moved to ${location}`);
    } catch(e) { showToast('Failed to update'); }
    finally { setSaving(s => ({ ...s, [id]: false })); }
  };

  // Update showroom quantity
  const setShowroomQty = async (id, qty) => {
    setSaving(s => ({ ...s, [id]: true }));
    try {
      await fetch(`${BASE()}/inventory/${id}`, {
        method: 'PATCH',
        headers: hdr(),
        body: JSON.stringify({ showroom_qty: qty }),
      });
      setItems(prev => prev.map(i => i.id === id ? { ...i, showroom_qty: qty } : i));
    } catch(e) {}
    finally { setSaving(s => ({ ...s, [id]: false })); }
  };

  // Update showroom quantity
  const updateShowroomQty = async (id, qty) => {
    const q = Math.max(0, parseInt(qty) || 0);
    setSaving(s => ({ ...s, [id]: true }));
    try {
      await fetch(`${BASE()}/inventory/${id}`, {
        method: 'PATCH', headers: hdr(),
        body: JSON.stringify({ showroom_qty: q, location: q > 0 ? 'showroom' : 'stock' }),
      });
      setItems(prev => prev.map(i => i.id === id ? { ...i, showroom_qty: q, location: q > 0 ? 'showroom' : 'stock' } : i));
      setEditQty(e => { const n={...e}; delete n[id]; return n; });
      showToast(`✓ Showroom qty set to ${q}`);
    } catch(e) { showToast('Failed to update'); }
    finally { setSaving(s => ({ ...s, [id]: false })); }
  };

  // Mark item as missing
  const markMissing = async (id) => {
    setSaving(s => ({ ...s, [id]: true }));
    try {
      await fetch(`${BASE()}/inventory/${id}`, {
        method: 'PATCH',
        headers: hdr(),
        body: JSON.stringify({ location: 'missing' }),
      });
      setItems(prev => prev.map(i => i.id === id ? { ...i, location: 'missing' } : i));
      showToast('⚠️ Marked as missing');
    } catch(e) {}
    finally { setSaving(s => ({ ...s, [id]: false })); }
  };

  // Move all showroom items to "needs check" for weekly audit
  const startWeeklyCheck = () => {
    setCheckMode(true);
    setMismatches([]);
    showToast('Check mode ON — scan or tick each frame you can see in showroom');
  };

  const confirmSeen = async (id) => {
    // Item physically confirmed in showroom
    await setLocation(id, 'showroom');
  };

  const finishCheck = () => {
    // Any showroom items not confirmed = potentially missing
    const notConfirmed = filtered.filter(i =>
      i.location === 'showroom' && !mismatches.includes(i.id)
    );
    setCheckMode(false);
    showToast(`Check complete — ${notConfirmed.length} items not verified`);
  };

  // Stats
  const inShowroom  = items.filter(i => i.location === 'showroom').length;
  const inStock     = items.filter(i => i.location === 'stock' || !i.location).length;
  const missing     = items.filter(i => i.location === 'missing').length;
  const outOfStock  = items.filter(i => parseInt(i.quantity||0) === 0).length;

  // Filter
  const cats = ['All', ...new Set(items.map(i => i.category))];
  const filtered = items.filter(i => {
    if (filterCat !== 'All' && i.category !== filterCat) return false;
    if (filterLoc === 'showroom' && i.location !== 'showroom')  return false;
    if (filterLoc === 'stock'    && (i.location === 'showroom' || i.location === 'missing')) return false;
    if (filterLoc === 'missing'  && i.location !== 'missing')   return false;
    if (filterLoc === 'outofstock' && parseInt(i.quantity||0) > 0) return false;
    if (search && !(
      (i.name||'').toLowerCase().includes(search.toLowerCase()) ||
      (i.brand||'').toLowerCase().includes(search.toLowerCase()) ||
      (i.frame_color||'').toLowerCase().includes(search.toLowerCase())
    )) return false;
    return true;
  });

  const locColor = (loc, qty) => {
    if (parseInt(qty||0) === 0) return { bg:'#f3f4f6', text:'#6b7280', label:'Out of Stock' };
    if (loc === 'showroom') return { bg:'#dcfce7', text:'#15803d', label:'Showroom' };
    if (loc === 'missing')  return { bg:'#fee2e2', text:'#dc2626', label:'Missing' };
    return { bg:'#eff6ff', text:'#1e40af', label:'Stock Room' };
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, background:C.navy, color:'white', padding:'10px 18px', borderRadius:10, zIndex:999, fontSize:13, fontWeight:600 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:4 }}>Inventory Management</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:C.navy, margin:0 }}>Showroom Tracker</h1>
            <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Track which frames are in the showroom, stock room, or missing</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={load}
              style={{ padding:'9px 18px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.navy }}>
              🔄 Refresh
            </button>
            {!checkMode ? (
              <button onClick={startWeeklyCheck}
                style={{ padding:'9px 18px', background:C.gold, color:C.navy, border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                📋 Start Weekly Check
              </button>
            ) : (
              <button onClick={finishCheck}
                style={{ padding:'9px 18px', background:C.success, color:'white', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                ✓ Finish Check
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'In Showroom',  value:inShowroom, color:'#15803d', bg:'#f0fdf4', border:'#86efac', icon:'🏪', filter:'showroom' },
          { label:'In Stock Room', value:inStock,   color:'#1e40af', bg:'#eff6ff', border:'#93c5fd', icon:'📦', filter:'stock' },
          { label:'Missing',      value:missing,    color:'#dc2626', bg:'#fef2f2', border:'#fca5a5', icon:'⚠️', filter:'missing' },
          { label:'Out of Stock', value:outOfStock, color:'#6b7280', bg:'#f3f4f6', border:'#d1d5db', icon:'❌', filter:'outofstock' },
        ].map(s => (
          <div key={s.label} onClick={() => setFilterLoc(filterLoc === s.filter ? 'all' : s.filter)}
            style={{ background:filterLoc===s.filter?s.bg:'white', border:`1.5px solid ${filterLoc===s.filter?s.border:C.border}`,
              borderRadius:12, padding:'14px 16px', cursor:'pointer', transition:'all .15s' }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:C.muted, fontWeight:600, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Check mode banner */}
      {checkMode && (
        <div style={{ background:'#fef9c3', border:'2px solid #f59e0b', borderRadius:12, padding:'12px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:20 }}>📋</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#92400e' }}>Weekly Check Mode — Go through the showroom</div>
            <div style={{ fontSize:12, color:'#b45309', marginTop:2 }}>For each frame you can physically see — click "✓ Seen". Anything not confirmed at the end may be missing.</div>
          </div>
        </div>
      )}

      {/* Missing items alert */}
      {missing > 0 && !checkMode && (
        <div style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:12, padding:'12px 18px', marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#dc2626', marginBottom:6 }}>⚠️ {missing} frame{missing>1?'s':''} marked as missing</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {items.filter(i=>i.location==='missing').map(i => (
              <div key={i.id} style={{ background:'white', border:'1px solid #fca5a5', borderRadius:8, padding:'4px 12px', fontSize:12, color:'#dc2626', fontWeight:600 }}>
                {i.name || i.brand} {i.frame_color ? `· ${i.frame_color}` : ''}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search frames..."
          style={{ padding:'9px 14px', border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, fontFamily:'inherit', outline:'none', flex:1, minWidth:200 }}/>
        <div style={{ display:'flex', gap:6 }}>
          {cats.map(c => (
            <button key={c} onClick={()=>setFilterCat(c)}
              style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${filterCat===c?C.navy:C.border}`,
                background:filterCat===c?C.navy:'white', color:filterCat===c?'white':C.muted,
                fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Items count */}
      <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>
        Showing {filtered.length} items
        {filterLoc !== 'all' && <span style={{ marginLeft:6, color:C.gold, fontWeight:600 }}>· Filtered by: {filterLoc}</span>}
      </div>

      {/* Items grid */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:C.muted }}>Loading...</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:10 }}>
          {filtered.map(item => {
            const qty   = parseInt(item.quantity || 0);
            const lc    = locColor(item.location, qty);
            const isSaving = saving[item.id];

            return (
              <div key={item.id} style={{ background:'white', border:`1.5px solid ${item.location==='missing'?'#fca5a5':item.location==='showroom'?'#86efac':C.border}`,
                borderRadius:12, padding:'12px 14px', position:'relative' }}>

                {/* Location badge */}
                <div style={{ position:'absolute', top:10, right:10, background:lc.bg, color:lc.text,
                  fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:20 }}>
                  {lc.label}
                </div>

                {/* Item info */}
                <div style={{ marginBottom:10, paddingRight:70 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:2 }}>{item.name || item.brand || '—'}</div>
                  <div style={{ fontSize:11, color:C.muted }}>
                    {[item.category, item.frame_color, item.frame_material].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2, display:'flex', gap:10, flexWrap:'wrap' }}>
                    <span>Total: <b style={{ color: qty === 0 ? C.danger : qty <= 2 ? '#f59e0b' : C.success }}>{qty}</b></span>
                    {parseInt(item.showroom_qty||0) > 0 && <span style={{ color:'#15803d' }}>🏪 <b>{item.showroom_qty}</b> in showroom</span>}
                    {qty - parseInt(item.showroom_qty||0) > 0 && parseInt(item.showroom_qty||0) > 0 && <span style={{ color:'#1e40af' }}>📦 <b>{qty - parseInt(item.showroom_qty||0)}</b> in stock</span>}
                    {item.display_number && <span>Display #: <b>{item.display_number}</b></span>}
                  </div>
                </div>

                {/* Showroom quantity adjuster — only when in showroom */}
                {item.location === 'showroom' && qty > 0 && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, background:'#f0fdf4', borderRadius:8, padding:'6px 10px' }}>
                    <div style={{ fontSize:11, color:'#15803d', fontWeight:700, flex:1 }}>🏪 In showroom:</div>
                    <button onClick={() => setShowroomQty(item.id, Math.max(0, parseInt(item.showroom_qty||0) - 1))}
                      disabled={saving[item.id] || parseInt(item.showroom_qty||0) <= 0}
                      style={{ width:26, height:26, border:'1.5px solid #86efac', borderRadius:6, background:'white',
                        color:'#15803d', fontWeight:700, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      −
                    </button>
                    <span style={{ fontSize:16, fontWeight:800, color:'#15803d', minWidth:20, textAlign:'center' }}>
                      {item.showroom_qty || 0}
                    </span>
                    <button onClick={() => setShowroomQty(item.id, Math.min(qty, parseInt(item.showroom_qty||0) + 1))}
                      disabled={saving[item.id] || parseInt(item.showroom_qty||0) >= qty}
                      style={{ width:26, height:26, border:'1.5px solid #86efac', borderRadius:6, background:'white',
                        color:'#15803d', fontWeight:700, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      +
                    </button>
                    <span style={{ fontSize:10, color:'#86efac', marginLeft:2 }}>/ {qty} total</span>
                  </div>
                )}

                {/* Action buttons */}
                {qty > 0 && (
                  checkMode ? (
                    <button onClick={() => confirmSeen(item.id)} disabled={isSaving}
                      style={{ width:'100%', padding:'8px', background:item.location==='showroom'?'#dcfce7':'#eff6ff',
                        border:`1.5px solid ${item.location==='showroom'?'#86efac':'#93c5fd'}`,
                        borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                        color:item.location==='showroom'?'#15803d':'#1e40af' }}>
                      {item.location === 'showroom' ? '✓ Confirmed in Showroom' : '✓ Mark as Seen in Showroom'}
                    </button>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {/* Showroom qty adjuster */}
                      <div style={{ display:'flex', alignItems:'center', gap:6, background:'#f0fdf4', border:'1.5px solid #86efac', borderRadius:8, padding:'6px 10px' }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'#15803d', flexShrink:0 }}>🏪 Showroom:</span>
                        <button onClick={() => updateShowroomQty(item.id, (parseInt(item.showroom_qty)||0) - 1)}
                          disabled={isSaving || (parseInt(item.showroom_qty)||0) === 0}
                          style={{ width:24, height:24, borderRadius:6, border:`1px solid #86efac`, background:'white',
                            color:'#15803d', fontSize:14, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          −
                        </button>
                        <input
                          type="number" min="0" max={qty}
                          value={editQty[item.id] !== undefined ? editQty[item.id] : (parseInt(item.showroom_qty)||0)}
                          onChange={e => setEditQty(ev => ({ ...ev, [item.id]: e.target.value }))}
                          onBlur={e => { if (editQty[item.id] !== undefined) updateShowroomQty(item.id, editQty[item.id]); }}
                          onKeyDown={e => { if (e.key === 'Enter') updateShowroomQty(item.id, editQty[item.id] ?? item.showroom_qty); }}
                          style={{ width:36, textAlign:'center', border:'1px solid #86efac', borderRadius:6, padding:'3px',
                            fontSize:14, fontWeight:800, color:'#15803d', fontFamily:'inherit', outline:'none' }}/>
                        <button onClick={() => updateShowroomQty(item.id, (parseInt(item.showroom_qty)||0) + 1)}
                          disabled={isSaving || (parseInt(item.showroom_qty)||0) >= qty}
                          style={{ width:24, height:24, borderRadius:6, border:`1px solid #86efac`, background:'white',
                            color:'#15803d', fontSize:14, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          +
                        </button>
                        <span style={{ fontSize:10, color:'#9ca3af', marginLeft:'auto' }}>/ {qty} total</span>
                      </div>
                      {/* Stock / Missing buttons */}
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => setLocation(item.id, 'stock')} disabled={isSaving}
                          style={{ flex:1, padding:'6px', background:(!item.location||item.location==='stock')?'#eff6ff':'white',
                            border:`1.5px solid ${(!item.location||item.location==='stock')?'#93c5fd':C.border}`,
                            borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer',
                            fontFamily:'inherit', color:(!item.location||item.location==='stock')?'#1e40af':C.navy }}>
                          📦 All in Stock Room
                        </button>
                        <button onClick={() => markMissing(item.id)} disabled={isSaving}
                          style={{ padding:'6px 10px', background:item.location==='missing'?'#fee2e2':'white',
                            border:`1.5px solid ${item.location==='missing'?'#fca5a5':C.border}`,
                            borderRadius:8, fontSize:11, cursor:'pointer', fontFamily:'inherit', color:C.danger }}>
                          ⚠️ Missing
                        </button>
                      </div>
                    </div>
                  )
                )}

                {qty === 0 && (
                  <div style={{ fontSize:11, color:C.muted, textAlign:'center', padding:'6px 0', fontStyle:'italic' }}>
                    Out of stock — not in showroom
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', padding:60, color:C.muted }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🏪</div>
              <div style={{ fontSize:15, fontWeight:600, color:C.navy }}>No frames found</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}