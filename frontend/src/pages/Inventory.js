// ============================================================
//  Inventory Page — connected to /api/inventory
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { getInventory, createItem, updateItem, deleteItem } from '../api';

const CATS = ['All','Frames','Sunglasses','Reading Glasses','Ear Tips','Glass Cleaner','Cases','Other'];

export default function Inventory() {
  const [items,    setItems]   = useState([]);
  const [search,   setSearch]  = useState('');
  const [cat,      setCat]     = useState('All');
  const [selected, setSelected]= useState(null);
  const [showAdd,  setShowAdd] = useState(false);
  const [loading,  setLoading] = useState(true);
  const [newItem,  setNewItem] = useState({ name:'', brand:'', category:'Frames', dealer:'', sell_price:'', cost_price:'', quantity:'', min_quantity:'2' });

  const load = useCallback(() => {
    setLoading(true);
    getInventory({ search: search||undefined, category: cat!=='All'?cat:undefined })
      .then(r => setItems(r.data))
      .finally(() => setLoading(false));
  }, [search, cat]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newItem.name) return alert('Item name required');
    await createItem({ ...newItem, sell_price: parseFloat(newItem.sell_price)||0, cost_price: parseFloat(newItem.cost_price)||0, quantity: parseInt(newItem.quantity)||0, min_quantity: parseInt(newItem.min_quantity)||2 });
    setShowAdd(false);
    setNewItem({ name:'', brand:'', category:'Frames', dealer:'', sell_price:'', cost_price:'', quantity:'', min_quantity:'2' });
    load();
  };

  const handleQty = async (id, delta) => {
    const item = items.find(i=>i.id===id);
    if (!item) return;
    const newQty = Math.max(0, item.quantity + delta);
    await updateItem(id, { quantity: newQty });
    load();
    if (selected?.id === id) setSelected(s=>({...s, quantity: newQty}));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this item?')) return;
    await deleteItem(id);
    setSelected(null);
    load();
  };

  const low = items.filter(i => i.quantity > 0 && i.quantity <= i.min_quantity).length;
  const out = items.filter(i => i.quantity === 0).length;
  const val = items.reduce((s,i) => s + (i.sell_price * i.quantity), 0);

  const inp = { width:'100%', padding:'10px 13px', border:'1.5px solid #e0ddd6', borderRadius:9, fontSize:14, fontFamily:'inherit', outline:'none', background:'#f8f5ef' };
  const lbl = { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:'#6b7280', marginBottom:5, display:'block' };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:'#0f1f3d', margin:0 }}>🕶️ Inventory</h1>
        <button onClick={()=>setShowAdd(s=>!s)}
          style={{ padding:'9px 20px', background:'#c9a84c', color:'#0f1f3d', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          {showAdd ? '✕ Cancel' : '+ Add Item'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:20 }}>
        {[
          { l:'Total Items', v:items.length, c:'#0f1f3d', dark:true },
          { l:'Low Stock',   v:low,          c:'#c0392b' },
          { l:'Out of Stock',v:out,          c:'#9ca3af' },
          { l:'Stock Value', v:`Rs.${Math.round(val/1000)}K`, c:'#2d7a4f' },
        ].map(s => (
          <div key={s.l} style={{ background: s.dark?'#0f1f3d':'white', border:'1px solid #e0ddd6', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color: s.dark?'#c9a84c':'#6b7280', marginBottom:4 }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color: s.dark?'white':s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background:'white', border:'1px solid #e0ddd6', borderRadius:14, padding:22, marginBottom:20 }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:'#0f1f3d', marginBottom:16 }}>➕ Add New Item</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            {[
              { l:'Item Name *', k:'name', placeholder:'e.g. Rayban RB3025 Gold' },
              { l:'Brand',       k:'brand', placeholder:'e.g. Rayban' },
              { l:'Dealer',      k:'dealer', placeholder:'e.g. Vision Plus' },
              { l:'Selling Price (Rs.)', k:'sell_price', placeholder:'e.g. 4500', type:'number' },
              { l:'Cost Price (Rs.)',    k:'cost_price', placeholder:'e.g. 2800', type:'number' },
              { l:'Quantity',    k:'quantity', placeholder:'e.g. 5', type:'number' },
              { l:'Min Alert',   k:'min_quantity', placeholder:'e.g. 2', type:'number' },
            ].map(f => (
              <div key={f.k}>
                <label style={lbl}>{f.l}</label>
                <input type={f.type||'text'} value={newItem[f.k]} placeholder={f.placeholder}
                  onChange={e=>setNewItem(n=>({...n,[f.k]:e.target.value}))} style={inp}/>
              </div>
            ))}
            <div>
              <label style={lbl}>Category</label>
              <select value={newItem.category} onChange={e=>setNewItem(n=>({...n,category:e.target.value}))} style={inp}>
                {CATS.slice(1).map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleAdd} style={{ padding:'10px 22px', background:'#0f1f3d', color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Save Item</button>
            <button onClick={()=>setShowAdd(false)} style={{ padding:'10px 16px', background:'#f8f5ef', color:'#6b7280', border:'1.5px solid #e0ddd6', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search items..."
          style={{ flex:1, minWidth:160, padding:'9px 14px', border:'1.5px solid #e0ddd6', borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}/>
        {CATS.map(c=>(
          <button key={c} onClick={()=>setCat(c)}
            style={{ padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'1.5px solid', fontFamily:'inherit',
              background:cat===c?'#0f1f3d':'white', color:cat===c?'white':'#6b7280', borderColor:cat===c?'#0f1f3d':'#e0ddd6' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Stock grid */}
      {loading ? <p style={{color:'#6b7280',fontSize:13}}>Loading...</p> :
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))', gap:14 }}>
          {items.map(item => {
            const isLow = item.quantity > 0 && item.quantity <= item.min_quantity;
            const isOut = item.quantity === 0;
            return (
              <div key={item.id} onClick={()=>setSelected(item)}
                style={{ background:'white', border:`1.5px solid ${isOut?'#d1d5db':isLow?'#fca5a5':'#e0ddd6'}`, borderRadius:14, cursor:'pointer', overflow:'hidden', transition:'all .15s', borderLeft: isOut?'4px solid #d1d5db':isLow?'4px solid #c0392b':undefined }}>
                {/* Image */}
                <div style={{ height:110, background:'#f8f5ef', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    : <div style={{ fontSize:28, opacity:.3 }}>{item.category==='Sunglasses'||item.category==='Frames'?'🕶️':item.category==='Reading Glasses'?'👓':'📦'}</div>
                  }
                  {isOut && <span style={{ position:'absolute', top:8, right:8, background:'#f3f4f6', color:'#6b7280', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>Out</span>}
                  {isLow && !isOut && <span style={{ position:'absolute', top:8, right:8, background:'#fee2e2', color:'#c0392b', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>Low</span>}
                </div>
                <div style={{ padding:'10px 12px' }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#6b7280', marginBottom:3 }}>{item.category}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0f1f3d', marginBottom:2, lineHeight:1.3 }}>{item.name}</div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginBottom:8 }}>{item.brand}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'#1a1a2e' }}>Rs.{parseFloat(item.sell_price||0).toLocaleString()}</div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:18, fontWeight:700, color: isOut?'#9ca3af':isLow?'#c0392b':'#2d7a4f' }}>{item.quantity}</div>
                      <div style={{ fontSize:10, color:'#9ca3af' }}>in stock</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      }

      {/* Detail panel */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.45)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}
          onClick={e=>{if(e.target===e.currentTarget)setSelected(null);}}>
          <div style={{ background:'white', width:'100%', maxWidth:460, height:'100vh', overflowY:'auto', boxShadow:'-8px 0 40px rgba(0,0,0,.18)' }}>
            {/* Image header */}
            <div style={{ height:180, background:'#f8f5ef', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
              {selected.image_url
                ? <img src={selected.image_url} alt={selected.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : <div style={{ fontSize:48, opacity:.2 }}>🕶️</div>
              }
              <button onClick={()=>setSelected(null)} style={{ position:'absolute', top:12, right:12, background:'rgba(0,0,0,.5)', border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600, color:'white' }}>✕</button>
            </div>

            <div style={{ padding:22 }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:'#0f1f3d', marginBottom:3 }}>{selected.name}</div>
              <div style={{ fontSize:13, color:'#6b7280', marginBottom:18 }}>{selected.category} · {selected.brand}</div>

              {/* Qty control */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'#6b7280', marginBottom:10, paddingBottom:6, borderBottom:'1px solid #ede9e0' }}>Stock Level</div>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <button onClick={()=>handleQty(selected.id,-1)} style={{ width:36, height:36, borderRadius:9, border:'1.5px solid #e0ddd6', background:'white', fontSize:20, cursor:'pointer', color:'#0f1f3d' }}>−</button>
                  <span style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:'#0f1f3d', minWidth:40, textAlign:'center' }}>{selected.quantity}</span>
                  <button onClick={()=>handleQty(selected.id,1)} style={{ width:36, height:36, borderRadius:9, border:'1.5px solid #e0ddd6', background:'white', fontSize:20, cursor:'pointer', color:'#0f1f3d' }}>+</button>
                  <span style={{ fontSize:13, color:'#6b7280' }}>units · Alert at {selected.min_quantity}</span>
                </div>
              </div>

              {/* Info */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
                {[
                  { l:'Selling price', v:`Rs. ${parseFloat(selected.sell_price||0).toLocaleString()}` },
                  { l:'Cost price',    v:`Rs. ${parseFloat(selected.cost_price||0).toLocaleString()}` },
                  { l:'Profit/unit',   v:`Rs. ${(parseFloat(selected.sell_price||0)-parseFloat(selected.cost_price||0)).toLocaleString()}` },
                  { l:'Stock value',   v:`Rs. ${(parseFloat(selected.sell_price||0)*selected.quantity).toLocaleString()}` },
                  { l:'Supplier',      v: selected.dealer||'—' },
                  { l:'Category',      v: selected.category },
                ].map(item=>(
                  <div key={item.l} style={{ background:'#f8f5ef', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#6b7280', marginBottom:3 }}>{item.l}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#1a1a2e' }}>{item.v}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>handleDelete(selected.id)}
                  style={{ padding:'9px 16px', background:'#fee2e2', color:'#c0392b', border:'1.5px solid #fca5a5', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  🗑️ Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
