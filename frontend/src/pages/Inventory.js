// ============================================================
//  Inventory.js — Complete with QR sticker printing
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { getInventory, createItem, updateItem, deleteItem } from '../api';
import { StickerModal } from '../components/QRStickers';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b' };
const fmtMoney = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
const toBase64  = (file) => new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });

const CATS      = ['All','Frames','Sunglasses','Reading Glasses','Boxes','Sunglass Pouches','Glass Cleaner','Chains','Ear Tips'];
const CAT_ICON  = { Frames:'🕶️', Sunglasses:'😎', 'Reading Glasses':'👓', Boxes:'📦', 'Sunglass Pouches':'👜', 'Glass Cleaner':'🧴', Chains:'⛓️', 'Ear Tips':'🔧' };
const FR_SHAPES = ['Round','Oval','Rectangle','Square','Cat-eye','Aviator','Wayfarer','Butterfly','Hexagon','Geometric'];
const FR_TYPES  = ['Full rim','Half rim','Rimless'];
const FR_MATS   = ['Plastic','Metal','TR90','Titanium','Acetate','Mixed'];
const FR_COLORS = ['Black','Gold','Silver','Brown','Gunmetal','Blue','Red','Pink','Tortoise','Crystal','Green','Purple','White','Multicolor'];
const FR_SIZES  = ['Extra Small','Small','Medium','Large','Extra Large','48mm','50mm','52mm','54mm','56mm','58mm'];
const SG_TYPES  = ['Polarised','Local'];
const RG_TYPES  = ['Single Vision','Bifocal'];
const RG_MATS   = ['Plastic','Metal'];
const RG_POWERS = ['+1.00','+1.25','+1.50','+1.75','+2.00','+2.25','+2.50','+2.75','+3.00','+3.25','+3.50','+4.00'];

const INP = { padding:'10px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%' };
const SEL = { ...INP, cursor:'pointer' };
const LBL = { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, marginBottom:5, display:'block' };

const Field = ({ label, children }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
    <label style={LBL}>{label}</label>{children}
  </div>
);

const defaults = (cat) => {
  const base = { category:cat, brand:'', dealer:'', cost_price:'', sell_price:'', quantity:'', min_quantity:'2' };
  switch(cat) {
    case 'Frames':           return { ...base, frame_name:'', frame_shape:'Rectangle', frame_type:'Full rim', frame_material:'Plastic', frame_color:'Black', frame_size:'Medium' };
    case 'Sunglasses':       return { ...base, frame_name:'', frame_shape:'Aviator', frame_material:'Plastic', frame_color:'Black', frame_size:'Medium', sg_type:'Polarised' };
    case 'Reading Glasses':  return { ...base, rg_lens_type:'Single Vision', rg_material:'Plastic', rg_power:'+1.50', frame_color:'Black' };
    case 'Boxes':            return { ...base, item_name:'', frame_color:'Black' };
    case 'Sunglass Pouches': return { ...base, item_name:'', frame_color:'Black' };
    case 'Glass Cleaner':    return { ...base, item_name:'' };
    case 'Chains':           return { ...base, item_name:'', frame_material:'Metal', frame_color:'Gold' };
    case 'Ear Tips':         return { ...base, item_name:'', frame_material:'Silicone', frame_color:'Clear', frame_size:'Medium' };
    default: return base;
  }
};

const buildName = (form) => {
  switch(form.category) {
    case 'Frames':          return [form.brand, form.frame_name, form.frame_color, form.frame_size].filter(Boolean).join(' · ');
    case 'Sunglasses':      return [form.brand, form.frame_name, form.sg_type, form.frame_color].filter(Boolean).join(' · ');
    case 'Reading Glasses': return [form.rg_lens_type, form.rg_material, form.rg_power].filter(Boolean).join(' · ');
    case 'Chains':          return [form.item_name||'Chain', form.frame_material, form.frame_color].filter(Boolean).join(' · ');
    case 'Ear Tips':        return [form.item_name||'Ear Tips', form.frame_material, form.frame_size].filter(Boolean).join(' · ');
    default: return form.item_name || form.brand || form.category;
  }
};

function CategoryFields({ form, set }) {
  const inp = (key, placeholder) => <input value={form[key]||''} onChange={e=>set(f=>({...f,[key]:e.target.value}))} placeholder={placeholder} style={INP}/>;
  const sel = (key, options) => <select value={form[key]||''} onChange={e=>set(f=>({...f,[key]:e.target.value}))} style={SEL}>{options.map(o=><option key={o}>{o}</option>)}</select>;

  const common = <>
    <Field label="Brand"><input value={form.brand||''} onChange={e=>set(f=>({...f,brand:e.target.value}))} placeholder="Brand name" style={INP}/></Field>
    <Field label="Dealer"><input value={form.dealer||''} onChange={e=>set(f=>({...f,dealer:e.target.value}))} placeholder="Supplier" style={INP}/></Field>
  </>;

  switch(form.category) {
    case 'Frames': return <>
      {common}
      <Field label="Model Name">{inp('frame_name','e.g. RB3025')}</Field>
      <Field label="Shape">{sel('frame_shape',FR_SHAPES)}</Field>
      <Field label="Type">{sel('frame_type',FR_TYPES)}</Field>
      <Field label="Material">{sel('frame_material',FR_MATS)}</Field>
      <Field label="Color">{sel('frame_color',FR_COLORS)}</Field>
      <Field label="Size">{sel('frame_size',FR_SIZES)}</Field>
    </>;
    case 'Sunglasses': return <>
      {common}
      <Field label="Model">{inp('frame_name','Model code')}</Field>
      <Field label="Type">{sel('sg_type',SG_TYPES)}</Field>
      <Field label="Shape">{sel('frame_shape',FR_SHAPES)}</Field>
      <Field label="Material">{sel('frame_material',FR_MATS)}</Field>
      <Field label="Color">{sel('frame_color',FR_COLORS)}</Field>
      <Field label="Size">{sel('frame_size',FR_SIZES)}</Field>
    </>;
    case 'Reading Glasses': return <>
      {common}
      <Field label="Lens Type">{sel('rg_lens_type',RG_TYPES)}</Field>
      <Field label="Material">{sel('rg_material',RG_MATS)}</Field>
      <Field label="Power">{sel('rg_power',RG_POWERS)}</Field>
      <Field label="Color">{sel('frame_color',FR_COLORS)}</Field>
    </>;
    default: return <>
      {common}
      <Field label="Name / Type">{inp('item_name','Item name')}</Field>
      {['Boxes','Sunglass Pouches','Chains'].includes(form.category) && <Field label="Color">{sel('frame_color',FR_COLORS)}</Field>}
    </>;
  }
}

function ItemCard({ item, onClick, onSticker }) {
  const isLow = item.quantity>0 && item.quantity<=item.min_quantity;
  const isOut = item.quantity===0;
  const cat   = CAT_ICON[item.category]||'📦';

  let sub = '';
  if (item.category==='Frames')               sub=[item.frame_color,item.frame_shape,item.frame_size].filter(Boolean).join(' · ');
  else if (item.category==='Sunglasses')       sub=[item.sg_type,item.frame_color].filter(Boolean).join(' · ');
  else if (item.category==='Reading Glasses')  sub=[item.rg_power,item.rg_lens_type].filter(Boolean).join(' · ');
  else sub=item.brand||'';

  return (
    <div style={{ background:'white', border:`1.5px solid ${isOut?'#d1d5db':isLow?'#fca5a5':C.border}`, borderRadius:14, cursor:'pointer', overflow:'hidden', position:'relative', transition:'all .15s', borderLeft:isLow&&!isOut?`4px solid ${C.danger}`:undefined }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold}
      onMouseLeave={e=>e.currentTarget.style.borderColor=isOut?'#d1d5db':isLow?'#fca5a5':C.border}>
      <div onClick={onClick} style={{ height:110, background:C.cream, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
        {item.image_url
          ? <img src={item.image_url} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          : <div style={{ fontSize:32, opacity:.35 }}>{cat}</div>
        }
        {isOut && <span style={{ position:'absolute', top:7, right:7, background:'#f3f4f6', color:'#6b7280', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>Out</span>}
        {isLow&&!isOut && <span style={{ position:'absolute', top:7, right:7, background:'#fee2e2', color:C.danger, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>Low</span>}
        <span style={{ position:'absolute', bottom:7, left:7, background:'rgba(15,31,61,.7)', color:'white', fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20 }}>{cat} {item.category}</span>
      </div>
      <div onClick={onClick} style={{ padding:'10px 12px 6px' }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:2, lineHeight:1.3 }}>{item.name}</div>
        {sub && <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>{sub}</div>}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:6 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e' }}>Rs.{parseFloat(item.sell_price||0).toLocaleString()}</div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:18, fontWeight:700, color:isOut?'#9ca3af':isLow?C.danger:C.success }}>{item.quantity}</div>
            <div style={{ fontSize:10, color:'#9ca3af' }}>in stock</div>
          </div>
        </div>
      </div>
      <button onClick={e=>{ e.stopPropagation(); onSticker(item); }}
        style={{ width:'100%', padding:'5px', background:C.cream, border:'none', borderTop:`1px solid ${C.border}`, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
        🏷️ Print Sticker
      </button>
    </div>
  );
}

export default function Inventory() {
  const [items,        setItems]       = useState([]);
  const [activeCat,    setActiveCat]   = useState('All');
  const [search,       setSearch]      = useState('');
  const [selected,     setSelected]    = useState(null);
  const [showAdd,      setShowAdd]     = useState(false);
  const [addCat,       setAddCat]      = useState('Frames');
  const [loading,      setLoading]     = useState(true);
  const [imgData,      setImgData]     = useState(null);
  const [form,         setForm]        = useState(defaults('Frames'));
  const [showStickers, setShowStickers]= useState(false);
  const [stickerItems, setStickerItems]= useState([]);

  const load = useCallback(()=>{
    setLoading(true);
    getInventory({ search:search||undefined, category:activeCat!=='All'?activeCat:undefined })
      .then(r=>setItems(r.data)).catch(()=>setItems([])).finally(()=>setLoading(false));
  },[search,activeCat]);

  useEffect(()=>{ load(); },[load]);

  const handleCatChange = (cat) => { setAddCat(cat); setForm(defaults(cat)); setImgData(null); };
  const handleImgPick   = async (e) => { const f=e.target.files[0]; if(!f) return; setImgData(await toBase64(f)); };

  const handleAdd = async () => {
    const name = buildName(form);
    if (!name.trim()) return alert('Please fill in the required fields');
    await createItem({ ...form, name, image_url:imgData||null,
      sell_price:parseFloat(form.sell_price)||0, cost_price:parseFloat(form.cost_price)||0,
      quantity:parseInt(form.quantity)||0, min_quantity:parseInt(form.min_quantity)||2 });
    setShowAdd(false); setForm(defaults(addCat)); setImgData(null); load();
  };

  const handleQtyChange = async (id, delta) => {
    const item=items.find(i=>i.id===id); if(!item) return;
    const qty=Math.max(0,item.quantity+delta);
    await updateItem(id,{quantity:qty});
    load();
    if(selected?.id===id) setSelected(s=>({...s,quantity:qty}));
  };

  const handleSavePanel = async (local) => {
    await updateItem(local.id,{ sell_price:parseFloat(local.sell_price)||0, cost_price:parseFloat(local.cost_price)||0, min_quantity:parseInt(local.min_quantity)||2, dealer:local.dealer });
    load(); setSelected(null);
  };

  const handleDelete = async (id) => {
    if(!window.confirm('Remove this item?')) return;
    await deleteItem(id); setSelected(null); load();
  };

  const handlePanelImg = async (e) => {
    const f=e.target.files[0]; if(!f||!selected) return;
    const b64=await toBase64(f);
    await updateItem(selected.id,{image_url:b64});
    setSelected(s=>({...s,image_url:b64})); load();
  };

  const low = items.filter(i=>i.quantity>0&&i.quantity<=i.min_quantity).length;
  const out = items.filter(i=>i.quantity===0).length;
  const val = items.reduce((s,i)=>s+(parseFloat(i.sell_price||0)*i.quantity),0);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>📦 Inventory</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Frames, sunglasses, accessories and supplies</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>{ setStickerItems(items); setShowStickers(true); }}
            style={{ padding:'9px 16px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
            🏷️ Print All Stickers
          </button>
          <button onClick={()=>setShowAdd(s=>!s)}
            style={{ padding:'9px 20px', background:showAdd?C.cream:C.gold, color:showAdd?C.muted:C.navy, border:showAdd?`1.5px solid ${C.border}`:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            {showAdd?'✕ Cancel':'+ Add Item'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:20 }}>
        {[
          {l:'Total Items',  v:items.length, dark:true},
          {l:'Low Stock',    v:low,   c:C.danger},
          {l:'Out of Stock', v:out,   c:'#9ca3af'},
          {l:'Stock Value',  v:`Rs.${Math.round(val/1000)}K`, c:C.success},
        ].map(s=>(
          <div key={s.l} style={{ background:s.dark?C.navy:'white', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:s.dark?C.gold:C.muted, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:s.dark?'white':(s.c||C.navy) }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:24, marginBottom:20 }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.navy, marginBottom:16 }}>➕ Add New Item</h3>
          <div style={{ marginBottom:16 }}>
            <label style={LBL}>Category *</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {CATS.slice(1).map(c=>(
                <button key={c} onClick={()=>handleCatChange(c)}
                  style={{ padding:'7px 14px', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${addCat===c?C.navy:C.border}`, background:addCat===c?C.navy:'white', color:addCat===c?'white':C.muted }}>
                  {CAT_ICON[c]} {c}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={LBL}>Photo</label>
            <label style={{ display:'flex', alignItems:'center', justifyContent:'center', width:110, height:90, border:`2px dashed ${imgData?C.gold:C.border}`, borderRadius:10, cursor:'pointer', background:imgData?'#fdf9f0':C.cream, overflow:'hidden', position:'relative' }}>
              {imgData ? <img src={imgData} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <><span style={{ fontSize:22 }}>📷</span><span style={{ fontSize:10, color:C.muted, marginTop:4 }}>Tap to upload</span></>}
              <input type="file" accept="image/*" onChange={handleImgPick} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer' }}/>
            </label>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <CategoryFields form={form} set={setForm}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginTop:4 }}>
            <Field label="Cost Price (Rs.)"><input type="number" value={form.cost_price||''} onChange={e=>setForm(f=>({...f,cost_price:e.target.value}))} placeholder="Buy price" style={INP}/></Field>
            <Field label="Sell Price (Rs.)"><input type="number" value={form.sell_price||''} onChange={e=>setForm(f=>({...f,sell_price:e.target.value}))} placeholder="Sell price" style={INP}/></Field>
            <Field label="Quantity"><input type="number" value={form.quantity||''} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} placeholder="e.g. 5" style={INP}/></Field>
            <Field label="Min Alert"><input type="number" value={form.min_quantity||''} onChange={e=>setForm(f=>({...f,min_quantity:e.target.value}))} placeholder="e.g. 2" style={INP}/></Field>
          </div>
          {buildName(form) && <div style={{ marginTop:10, background:C.cream, borderRadius:8, padding:'8px 14px', fontSize:13, color:C.muted }}>Will save as: <b style={{color:C.navy}}>{buildName(form)}</b></div>}
          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            <button onClick={handleAdd} style={{ padding:'10px 22px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>💾 Save Item</button>
            <button onClick={()=>{setShowAdd(false);setForm(defaults(addCat));setImgData(null);}} style={{ padding:'10px 16px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, marginBottom:16, overflowX:'auto', background:'white', borderRadius:'12px 12px 0 0', padding:'0 4px' }}>
        {CATS.map(c=>(
          <button key={c} onClick={()=>setActiveCat(c)}
            style={{ padding:'11px 14px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', color:activeCat===c?C.navy:C.muted, borderBottom:`2.5px solid ${activeCat===c?C.gold:'transparent'}`, marginBottom:-1 }}>
            {c==='All'?'📋 All':`${CAT_ICON[c]} ${c}`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search items..." style={{ ...INP, maxWidth:380 }}/>
      </div>

      {/* Grid */}
      {loading ? <p style={{ color:C.muted, fontSize:13 }}>Loading...</p>
        : !items.length
          ? <div style={{ textAlign:'center', padding:'48px 20px', color:C.muted }}><div style={{ fontSize:40, marginBottom:12 }}>📦</div><div style={{ fontSize:14, fontWeight:600 }}>No items yet</div></div>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))', gap:14 }}>
              {items.map(item=>(
                <ItemCard key={item.id} item={item}
                  onClick={()=>setSelected(item)}
                  onSticker={i=>{ setStickerItems([i]); setShowStickers(true); }}
                />
              ))}
            </div>
      }

      {/* Detail panel */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.45)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}
          onClick={e=>{ if(e.target===e.currentTarget) setSelected(null); }}>
          <div style={{ background:'white', width:'100%', maxWidth:460, height:'100vh', overflowY:'auto', boxShadow:'-8px 0 40px rgba(0,0,0,.18)' }}>
            <div style={{ height:180, background:C.cream, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
              {selected.image_url ? <img src={selected.image_url} alt={selected.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <div style={{ fontSize:52, opacity:.2 }}>{CAT_ICON[selected.category]||'📦'}</div>}
              <label style={{ position:'absolute', bottom:10, right:10, background:'rgba(15,31,61,.75)', color:'white', borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:600, cursor:'pointer', zIndex:2 }}>
                📷 Change Photo
                <input type="file" accept="image/*" onChange={handlePanelImg} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }}/>
              </label>
              <button onClick={()=>setSelected(null)} style={{ position:'absolute', top:12, right:12, background:'rgba(0,0,0,.5)', border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600, color:'white' }}>✕</button>
            </div>
            <div style={{ padding:22 }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:C.navy, marginBottom:3 }}>{selected.name}</div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:18 }}>{selected.category} · {selected.brand}</div>
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>Stock</div>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <button onClick={()=>handleQtyChange(selected.id,-1)} style={{ width:38, height:38, borderRadius:9, border:`1.5px solid ${C.border}`, background:'white', fontSize:22, cursor:'pointer', color:C.navy }}>−</button>
                  <span style={{ fontFamily:"'Playfair Display',serif", fontSize:30, fontWeight:700, color:C.navy, minWidth:44, textAlign:'center' }}>{selected.quantity}</span>
                  <button onClick={()=>handleQtyChange(selected.id,1)} style={{ width:38, height:38, borderRadius:9, border:`1.5px solid ${C.border}`, background:'white', fontSize:22, cursor:'pointer', color:C.navy }}>+</button>
                  <span style={{ fontSize:13, color:C.muted }}>Min: {selected.min_quantity}</span>
                </div>
              </div>
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>Pricing</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <Field label="Cost Price (Rs.)"><input type="number" value={selected.cost_price||''} onChange={e=>setSelected(s=>({...s,cost_price:e.target.value}))} style={INP}/></Field>
                  <Field label="Sell Price (Rs.)"><input type="number" value={selected.sell_price||''} onChange={e=>setSelected(s=>({...s,sell_price:e.target.value}))} style={INP}/></Field>
                  <Field label="Min Alert"><input type="number" value={selected.min_quantity||''} onChange={e=>setSelected(s=>({...s,min_quantity:e.target.value}))} style={INP}/></Field>
                  <Field label="Dealer"><input value={selected.dealer||''} onChange={e=>setSelected(s=>({...s,dealer:e.target.value}))} style={INP}/></Field>
                </div>
                <div style={{ background:C.cream, borderRadius:9, padding:'9px 14px', marginTop:10, display:'flex', gap:20, fontSize:13 }}>
                  <span>Profit: <b style={{color:C.success}}>Rs.{(parseFloat(selected.sell_price||0)-parseFloat(selected.cost_price||0)).toLocaleString()}</b></span>
                  <span>Margin: <b>{parseFloat(selected.sell_price)>0?Math.round((parseFloat(selected.sell_price)-parseFloat(selected.cost_price))/parseFloat(selected.sell_price)*100):0}%</b></span>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button onClick={()=>handleSavePanel(selected)} style={{ padding:'10px 18px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>💾 Save</button>
                <button onClick={()=>{ setStickerItems([selected]); setShowStickers(true); }} style={{ padding:'10px 16px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.navy }}>🏷️ Print Sticker</button>
                <button onClick={()=>handleDelete(selected.id)} style={{ padding:'10px 14px', background:'#fee2e2', color:C.danger, border:`1.5px solid #fca5a5`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto' }}>🗑️</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticker modal */}
      {showStickers && (
        <StickerModal items={stickerItems} onClose={()=>setShowStickers(false)}/>
      )}
    </div>
  );
}