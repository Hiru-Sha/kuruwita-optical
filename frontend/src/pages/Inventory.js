// ============================================================
//  Inventory.js — Full category-specific inventory system
//  Categories: Frames, Sunglasses, Reading Glasses, Boxes,
//  Sunglass Pouches, Glass Cleaner, Chains, Ear Tips
//  Each category has its own specific fields
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { getInventory, createItem, updateItem, deleteItem } from '../api';

// ── Design tokens ─────────────────────────────────────────────
const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f',
  danger:'#c0392b', white:'#ffffff',
};

const fmtMoney = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
const toBase64  = (file) => new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });

// ── Shared input styles ───────────────────────────────────────
const INP = { padding:'10px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%' };
const SEL = { ...INP, cursor:'pointer' };
const LBL = { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, marginBottom:5, display:'block' };

// ── Category definitions ──────────────────────────────────────
const CATEGORIES = [
  { key:'Frames',           icon:'🕶️',  label:'Frames'            },
  { key:'Sunglasses',       icon:'😎',  label:'Sunglasses'        },
  { key:'Reading Glasses',  icon:'👓',  label:'Reading Glasses'   },
  { key:'Boxes',            icon:'📦',  label:'Boxes'             },
  { key:'Sunglass Pouches', icon:'👜',  label:'Sunglass Pouches'  },
  { key:'Glass Cleaner',    icon:'🧴',  label:'Glass Cleaner'     },
  { key:'Chains',           icon:'⛓️',  label:'Chains'            },
  { key:'Ear Tips',         icon:'🔧',  label:'Ear Tips'          },
];

const FRAME_SHAPES   = ['Round','Oval','Rectangle','Square','Cat-eye','Aviator','Wayfarer','Butterfly','Hexagon','Geometric'];
const FRAME_TYPES    = ['Full rim','Half rim','Rimless'];
const FRAME_MATS     = ['Plastic','Metal','TR90','Titanium','Acetate','Mixed'];
const FRAME_COLORS   = ['Black','Gold','Silver','Brown','Gunmetal','Blue','Red','Pink','Tortoise','Crystal','Green','Purple','White','Multicolor'];
const FRAME_SIZES    = ['Extra Small','Small','Medium','Large','Extra Large','48mm','50mm','52mm','54mm','56mm','58mm'];
const SG_TYPES       = ['Polarised','Local'];
const SG_MATS        = ['Plastic','Metal','TR90','Acetate'];
const SG_COLORS      = ['Black','Brown','Blue','Green','Red','Gold','Silver','Gunmetal','Tortoise'];
const RG_LENS_TYPES  = ['Single Vision','Bifocal'];
const RG_MATS        = ['Plastic','Metal'];
const RG_POWERS      = ['+1.00','+1.25','+1.50','+1.75','+2.00','+2.25','+2.50','+2.75','+3.00','+3.25','+3.50','+4.00'];
const CHAIN_MATS     = ['Metal','Plastic','Beaded','Silicone','Leather'];
const CHAIN_COLORS   = ['Gold','Silver','Black','Brown','Multicolor'];
const ET_SIZES       = ['Small','Medium','Large'];
const ET_MATS        = ['Silicone','Rubber'];
const ET_COLORS      = ['Clear','Black','White','Beige'];

// ── Default forms per category ────────────────────────────────
const defaults = (cat) => {
  const base = { category:cat, brand:'', dealer:'', cost_price:'', sell_price:'', quantity:'', min_quantity:'2' };
  switch(cat) {
    case 'Frames':           return { ...base, frame_name:'', frame_shape:'Rectangle', frame_type:'Full rim', frame_material:'Plastic', frame_color:'Black', frame_size:'Medium' };
    case 'Sunglasses':       return { ...base, frame_name:'', frame_shape:'Aviator',   frame_material:'Plastic', frame_color:'Black', frame_size:'Medium', sg_type:'Polarised' };
    case 'Reading Glasses':  return { ...base, rg_lens_type:'Single Vision', rg_material:'Plastic', rg_power:'+1.50', frame_color:'Black' };
    case 'Boxes':            return { ...base, item_name:'' };
    case 'Sunglass Pouches': return { ...base, item_name:'', frame_color:'Black' };
    case 'Glass Cleaner':    return { ...base, item_name:'' };
    case 'Chains':           return { ...base, item_name:'', frame_material:'Metal', frame_color:'Gold' };
    case 'Ear Tips':         return { ...base, item_name:'', frame_material:'Silicone', frame_color:'Clear', frame_size:'Medium' };
    default:                 return base;
  }
};

// ── Build display name for an item ───────────────────────────
const buildName = (form) => {
  switch(form.category) {
    case 'Frames':
      return [form.brand, form.frame_name, form.frame_color, form.frame_size].filter(Boolean).join(' · ');
    case 'Sunglasses':
      return [form.brand, form.frame_name, form.sg_type, form.frame_color].filter(Boolean).join(' · ');
    case 'Reading Glasses':
      return [form.rg_lens_type, form.rg_material, form.rg_power].filter(Boolean).join(' · ');
    case 'Chains':
      return [form.item_name||'Chain', form.frame_material, form.frame_color].filter(Boolean).join(' · ');
    case 'Ear Tips':
      return [form.item_name||'Ear Tips', form.frame_material, form.frame_size].filter(Boolean).join(' · ');
    default:
      return form.item_name || form.brand || form.category;
  }
};

// ── Field component ───────────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
    <label style={LBL}>{label}</label>
    {children}
  </div>
);

// ── Image upload zone ─────────────────────────────────────────
function ImageUpload({ imgData, onPick, onRemove }) {
  return (
    <div style={{ marginBottom:6 }}>
      <label style={LBL}>Photo</label>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', width:110, height:90, border:`2px dashed ${imgData?C.gold:C.border}`, borderRadius:10, cursor:'pointer', background:imgData?'#fdf9f0':C.cream, overflow:'hidden', position:'relative' }}>
          {imgData
            ? <img src={imgData} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            : <><span style={{ fontSize:22 }}>📷</span><span style={{ fontSize:10, color:C.muted, marginTop:4 }}>Tap to upload</span></>
          }
          <input type="file" accept="image/*" onChange={onPick} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer' }}/>
        </label>
        {imgData && (
          <button onClick={onRemove} style={{ padding:'5px 12px', background:'#fee2e2', color:C.danger, border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            ✕ Remove
          </button>
        )}
      </div>
    </div>
  );
}

// ── Category-specific form fields ────────────────────────────
function CategoryFields({ form, set }) {
  const inp  = (key, placeholder, type='text') => <input type={type} value={form[key]||''} onChange={e=>set(f=>({...f,[key]:e.target.value}))} placeholder={placeholder} style={INP}/>;
  const sel  = (key, options) => <select value={form[key]||''} onChange={e=>set(f=>({...f,[key]:e.target.value}))} style={SEL}>{options.map(o=><option key={o}>{o}</option>)}</select>;

  switch(form.category) {

    case 'Frames': return (
      <>
        <div style={{ gridColumn:'1/-1', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Frame Brand *"><input value={form.brand||''} onChange={e=>set(f=>({...f,brand:e.target.value}))} placeholder="e.g. Rayban, Titan, Vogue" style={INP}/></Field>
          <Field label="Model Name / Code"><input value={form.frame_name||''} onChange={e=>set(f=>({...f,frame_name:e.target.value}))} placeholder="e.g. RB3025, T-1234" style={INP}/></Field>
          <Field label="Shape">{sel('frame_shape', FRAME_SHAPES)}</Field>
          <Field label="Type">{sel('frame_type', FRAME_TYPES)}</Field>
          <Field label="Material">{sel('frame_material', FRAME_MATS)}</Field>
          <Field label="Color">{sel('frame_color', FRAME_COLORS)}</Field>
          <Field label="Size">{sel('frame_size', FRAME_SIZES)}</Field>
          <Field label="Dealer"><input value={form.dealer||''} onChange={e=>set(f=>({...f,dealer:e.target.value}))} placeholder="e.g. Vision Plus" style={INP}/></Field>
        </div>
      </>
    );

    case 'Sunglasses': return (
      <>
        <div style={{ gridColumn:'1/-1', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Brand *"><input value={form.brand||''} onChange={e=>set(f=>({...f,brand:e.target.value}))} placeholder="e.g. Rayban, Oakley, Police" style={INP}/></Field>
          <Field label="Model Name"><input value={form.frame_name||''} onChange={e=>set(f=>({...f,frame_name:e.target.value}))} placeholder="e.g. RB2140, SPL874" style={INP}/></Field>
          <Field label="Type">
            <select value={form.sg_type||'Polarised'} onChange={e=>set(f=>({...f,sg_type:e.target.value}))} style={SEL}>
              {SG_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Shape">{sel('frame_shape', FRAME_SHAPES)}</Field>
          <Field label="Material">
            <select value={form.frame_material||'Plastic'} onChange={e=>set(f=>({...f,frame_material:e.target.value}))} style={SEL}>
              {SG_MATS.map(m=><option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Color">
            <select value={form.frame_color||'Black'} onChange={e=>set(f=>({...f,frame_color:e.target.value}))} style={SEL}>
              {SG_COLORS.map(c=><option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Size">{sel('frame_size', FRAME_SIZES)}</Field>
          <Field label="Dealer"><input value={form.dealer||''} onChange={e=>set(f=>({...f,dealer:e.target.value}))} placeholder="e.g. Vision Plus" style={INP}/></Field>
        </div>
      </>
    );

    case 'Reading Glasses': return (
      <>
        <div style={{ gridColumn:'1/-1', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Lens Type">
            <select value={form.rg_lens_type||'Single Vision'} onChange={e=>set(f=>({...f,rg_lens_type:e.target.value}))} style={SEL}>
              {RG_LENS_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Material">
            <select value={form.rg_material||'Plastic'} onChange={e=>set(f=>({...f,rg_material:e.target.value}))} style={SEL}>
              {RG_MATS.map(m=><option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Power (Reading strength)">
            <select value={form.rg_power||'+1.50'} onChange={e=>set(f=>({...f,rg_power:e.target.value}))} style={SEL}>
              {RG_POWERS.map(p=><option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Frame Color">
            <select value={form.frame_color||'Black'} onChange={e=>set(f=>({...f,frame_color:e.target.value}))} style={SEL}>
              {FRAME_COLORS.map(c=><option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Brand (optional)"><input value={form.brand||''} onChange={e=>set(f=>({...f,brand:e.target.value}))} placeholder="e.g. Generic, Branded" style={INP}/></Field>
          <Field label="Dealer"><input value={form.dealer||''} onChange={e=>set(f=>({...f,dealer:e.target.value}))} placeholder="Supplier name" style={INP}/></Field>
        </div>
      </>
    );

    case 'Boxes': return (
      <>
        <div style={{ gridColumn:'1/-1', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Box Name / Type"><input value={form.item_name||''} onChange={e=>set(f=>({...f,item_name:e.target.value}))} placeholder="e.g. Hard Case, Soft Case, Slim Case" style={INP}/></Field>
          <Field label="Brand"><input value={form.brand||''} onChange={e=>set(f=>({...f,brand:e.target.value}))} placeholder="e.g. Generic, Branded" style={INP}/></Field>
          <Field label="Color">
            <select value={form.frame_color||'Black'} onChange={e=>set(f=>({...f,frame_color:e.target.value}))} style={SEL}>
              {FRAME_COLORS.map(c=><option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Dealer"><input value={form.dealer||''} onChange={e=>set(f=>({...f,dealer:e.target.value}))} placeholder="Supplier name" style={INP}/></Field>
        </div>
      </>
    );

    case 'Sunglass Pouches': return (
      <>
        <div style={{ gridColumn:'1/-1', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Pouch Name / Type"><input value={form.item_name||''} onChange={e=>set(f=>({...f,item_name:e.target.value}))} placeholder="e.g. Microfibre Pouch, Velvet Pouch" style={INP}/></Field>
          <Field label="Brand"><input value={form.brand||''} onChange={e=>set(f=>({...f,brand:e.target.value}))} placeholder="e.g. Generic" style={INP}/></Field>
          <Field label="Color">
            <select value={form.frame_color||'Black'} onChange={e=>set(f=>({...f,frame_color:e.target.value}))} style={SEL}>
              {FRAME_COLORS.map(c=><option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Dealer"><input value={form.dealer||''} onChange={e=>set(f=>({...f,dealer:e.target.value}))} placeholder="Supplier name" style={INP}/></Field>
        </div>
      </>
    );

    case 'Glass Cleaner': return (
      <>
        <div style={{ gridColumn:'1/-1', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Product Name"><input value={form.item_name||''} onChange={e=>set(f=>({...f,item_name:e.target.value}))} placeholder="e.g. Zeiss Spray, Generic Spray" style={INP}/></Field>
          <Field label="Brand"><input value={form.brand||''} onChange={e=>set(f=>({...f,brand:e.target.value}))} placeholder="e.g. Zeiss, Generic" style={INP}/></Field>
          <Field label="Dealer"><input value={form.dealer||''} onChange={e=>set(f=>({...f,dealer:e.target.value}))} placeholder="Supplier name" style={INP}/></Field>
        </div>
      </>
    );

    case 'Chains': return (
      <>
        <div style={{ gridColumn:'1/-1', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Chain Name / Type"><input value={form.item_name||''} onChange={e=>set(f=>({...f,item_name:e.target.value}))} placeholder="e.g. Classic Chain, Beaded Chain" style={INP}/></Field>
          <Field label="Material">
            <select value={form.frame_material||'Metal'} onChange={e=>set(f=>({...f,frame_material:e.target.value}))} style={SEL}>
              {CHAIN_MATS.map(m=><option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Color">
            <select value={form.frame_color||'Gold'} onChange={e=>set(f=>({...f,frame_color:e.target.value}))} style={SEL}>
              {CHAIN_COLORS.map(c=><option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Brand"><input value={form.brand||''} onChange={e=>set(f=>({...f,brand:e.target.value}))} placeholder="e.g. Generic" style={INP}/></Field>
          <Field label="Dealer"><input value={form.dealer||''} onChange={e=>set(f=>({...f,dealer:e.target.value}))} placeholder="Supplier name" style={INP}/></Field>
        </div>
      </>
    );

    case 'Ear Tips': return (
      <>
        <div style={{ gridColumn:'1/-1', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Field label="Ear Tip Name"><input value={form.item_name||''} onChange={e=>set(f=>({...f,item_name:e.target.value}))} placeholder="e.g. Soft Ear Tips, Round Ear Tips" style={INP}/></Field>
          <Field label="Material">
            <select value={form.frame_material||'Silicone'} onChange={e=>set(f=>({...f,frame_material:e.target.value}))} style={SEL}>
              {ET_MATS.map(m=><option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Size">
            <select value={form.frame_size||'Medium'} onChange={e=>set(f=>({...f,frame_size:e.target.value}))} style={SEL}>
              {ET_SIZES.map(s=><option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Color">
            <select value={form.frame_color||'Clear'} onChange={e=>set(f=>({...f,frame_color:e.target.value}))} style={SEL}>
              {ET_COLORS.map(c=><option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Brand"><input value={form.brand||''} onChange={e=>set(f=>({...f,brand:e.target.value}))} placeholder="e.g. Generic" style={INP}/></Field>
          <Field label="Dealer"><input value={form.dealer||''} onChange={e=>set(f=>({...f,dealer:e.target.value}))} placeholder="Supplier name" style={INP}/></Field>
        </div>
      </>
    );

    default: return (
      <div style={{ gridColumn:'1/-1', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field label="Item Name"><input value={form.item_name||''} onChange={e=>set(f=>({...f,item_name:e.target.value}))} placeholder="Item name" style={INP}/></Field>
        <Field label="Brand"><input value={form.brand||''} onChange={e=>set(f=>({...f,brand:e.target.value}))} placeholder="Brand" style={INP}/></Field>
        <Field label="Dealer"><input value={form.dealer||''} onChange={e=>set(f=>({...f,dealer:e.target.value}))} placeholder="Supplier" style={INP}/></Field>
      </div>
    );
  }
}

// ── Item card in grid ─────────────────────────────────────────
function ItemCard({ item, onClick }) {
  const isLow = item.quantity > 0 && item.quantity <= item.min_quantity;
  const isOut = item.quantity === 0;
  const cat = CATEGORIES.find(c=>c.key===item.category);

  // Build subtitle based on category
  let subtitle = '';
  if      (item.category === 'Frames')           subtitle = [item.frame_color, item.frame_shape, item.frame_size].filter(Boolean).join(' · ');
  else if (item.category === 'Sunglasses')        subtitle = [item.sg_type, item.frame_color].filter(Boolean).join(' · ');
  else if (item.category === 'Reading Glasses')   subtitle = [item.rg_power, item.rg_lens_type, item.rg_material].filter(Boolean).join(' · ');
  else if (item.category === 'Chains')            subtitle = [item.frame_material, item.frame_color].filter(Boolean).join(' · ');
  else if (item.category === 'Ear Tips')          subtitle = [item.frame_material, item.frame_size].filter(Boolean).join(' · ');
  else subtitle = item.brand || '';

  return (
    <div onClick={onClick}
      style={{ background:'white', border:`1.5px solid ${isOut?'#d1d5db':isLow?'#fca5a5':C.border}`, borderRadius:14, cursor:'pointer', overflow:'hidden', transition:'all .15s', borderLeft:isLow&&!isOut?`4px solid ${C.danger}`:undefined }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold}
      onMouseLeave={e=>e.currentTarget.style.borderColor=isOut?'#d1d5db':isLow?'#fca5a5':C.border}>

      {/* Image area */}
      <div style={{ height:110, background:C.cream, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
        {item.image_url
          ? <img src={item.image_url} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          : <div style={{ fontSize:32, opacity:.35 }}>{cat?.icon||'📦'}</div>
        }
        {isOut && <span style={{ position:'absolute', top:7, right:7, background:'#f3f4f6', color:'#6b7280', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>Out</span>}
        {isLow && !isOut && <span style={{ position:'absolute', top:7, right:7, background:'#fee2e2', color:C.danger, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>Low</span>}
        {/* Category badge */}
        <span style={{ position:'absolute', bottom:7, left:7, background:'rgba(15,31,61,.7)', color:'white', fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20 }}>{cat?.icon} {item.category}</span>
      </div>

      <div style={{ padding:'10px 12px' }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:2, lineHeight:1.3 }}>{item.name}</div>
        {subtitle && <div style={{ fontSize:11, color:C.muted, marginBottom:8 }}>{subtitle}</div>}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e' }}>Rs.{parseFloat(item.sell_price||0).toLocaleString()}</div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:18, fontWeight:700, color:isOut?'#9ca3af':isLow?C.danger:C.success }}>{item.quantity}</div>
            <div style={{ fontSize:10, color:'#9ca3af' }}>in stock</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────
function DetailPanel({ item, onClose, onQtyChange, onSave, onDelete, onImageChange }) {
  const [local, setLocal] = useState({ ...item });
  const cat = CATEGORIES.find(c=>c.key===item.category);

  const profit = parseFloat(local.sell_price||0) - parseFloat(local.cost_price||0);
  const margin = parseFloat(local.sell_price)>0 ? Math.round(profit/parseFloat(local.sell_price)*100) : 0;

  const InfoRow = ({ label, value }) => (
    <div style={{ background:C.cream, borderRadius:8, padding:'9px 12px' }}>
      <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{value||'—'}</div>
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.45)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ background:'white', width:'100%', maxWidth:480, height:'100vh', overflowY:'auto', boxShadow:'-8px 0 40px rgba(0,0,0,.18)' }}>

        {/* Image header */}
        <div style={{ height:180, background:C.cream, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
          {local.image_url
            ? <img src={local.image_url} alt={local.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            : <div style={{ fontSize:52, opacity:.2 }}>{cat?.icon||'📦'}</div>
          }
          <label style={{ position:'absolute', bottom:10, right:10, background:'rgba(15,31,61,.75)', color:'white', borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:600, cursor:'pointer', zIndex:2 }}>
            📷 Change Photo
            <input type="file" accept="image/*" onChange={onImageChange} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }}/>
          </label>
          <button onClick={onClose} style={{ position:'absolute', top:12, right:12, background:'rgba(0,0,0,.5)', border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600, color:'white' }}>✕</button>
        </div>

        <div style={{ padding:22 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
            <span style={{ fontSize:20 }}>{cat?.icon}</span>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:C.navy }}>{local.name}</div>
          </div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:20 }}>{local.category}</div>

          {/* Stock control */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>Stock</div>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <button onClick={()=>onQtyChange(local.id,-1)} style={{ width:38, height:38, borderRadius:9, border:`1.5px solid ${C.border}`, background:'white', fontSize:22, cursor:'pointer', color:C.navy, fontFamily:'inherit' }}>−</button>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:30, fontWeight:700, color:C.navy, minWidth:44, textAlign:'center' }}>{local.quantity}</span>
              <button onClick={()=>onQtyChange(local.id,1)} style={{ width:38, height:38, borderRadius:9, border:`1.5px solid ${C.border}`, background:'white', fontSize:22, cursor:'pointer', color:C.navy, fontFamily:'inherit' }}>+</button>
              <span style={{ fontSize:13, color:C.muted }}>Min alert: {local.min_quantity}</span>
            </div>
          </div>

          {/* Category-specific info */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>Item Details</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {local.brand        && <InfoRow label="Brand"        value={local.brand}/>}
              {local.frame_shape  && <InfoRow label="Shape"        value={local.frame_shape}/>}
              {local.frame_type   && <InfoRow label="Type"         value={local.frame_type}/>}
              {local.frame_material&&<InfoRow label="Material"     value={local.frame_material}/>}
              {local.frame_color  && <InfoRow label="Color"        value={local.frame_color}/>}
              {local.frame_size   && <InfoRow label="Size"         value={local.frame_size}/>}
              {local.frame_name   && <InfoRow label="Model"        value={local.frame_name}/>}
              {local.sg_type      && <InfoRow label="Type"         value={local.sg_type}/>}
              {local.rg_power     && <InfoRow label="Power"        value={local.rg_power}/>}
              {local.rg_lens_type && <InfoRow label="Lens"         value={local.rg_lens_type}/>}
              {local.rg_material  && <InfoRow label="Material"     value={local.rg_material}/>}
              {local.item_name    && <InfoRow label="Name"         value={local.item_name}/>}
              {local.dealer       && <InfoRow label="Dealer"       value={local.dealer}/>}
            </div>
          </div>

          {/* Editable prices */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>Pricing</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <Field label="Cost Price (Rs.)"><input type="number" value={local.cost_price||''} onChange={e=>setLocal(s=>({...s,cost_price:e.target.value}))} style={INP}/></Field>
              <Field label="Sell Price (Rs.)"><input type="number" value={local.sell_price||''} onChange={e=>setLocal(s=>({...s,sell_price:e.target.value}))} style={INP}/></Field>
              <Field label="Min Alert"><input type="number" value={local.min_quantity||''} onChange={e=>setLocal(s=>({...s,min_quantity:e.target.value}))} style={INP}/></Field>
            </div>
            <div style={{ background:C.cream, borderRadius:9, padding:'10px 14px', marginTop:10, display:'flex', gap:20, fontSize:13 }}>
              <span>Profit: <b style={{color:C.success}}>Rs. {profit.toLocaleString()}</b></span>
              <span>Margin: <b style={{color:C.navy}}>{margin}%</b></span>
              <span>Stock value: <b style={{color:C.navy}}>Rs. {(parseFloat(local.sell_price||0)*local.quantity).toLocaleString()}</b></span>
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>onSave(local)} style={{ padding:'10px 20px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>💾 Save Changes</button>
            <button onClick={()=>onDelete(local.id)} style={{ padding:'10px 16px', background:'#fee2e2', color:C.danger, border:`1.5px solid #fca5a5`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>🗑️ Remove</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function Inventory() {
  const [items,     setItems]    = useState([]);
  const [activeCat, setActiveCat]= useState('All');
  const [search,    setSearch]   = useState('');
  const [selected,  setSelected] = useState(null);
  const [showAdd,   setShowAdd]  = useState(false);
  const [addCat,    setAddCat]   = useState('Frames');
  const [loading,   setLoading]  = useState(true);
  const [imgData,   setImgData]  = useState(null);
  const [form,      setForm]     = useState(defaults('Frames'));

  const load = useCallback(()=>{
    setLoading(true);
    getInventory({ search:search||undefined, category:activeCat!=='All'?activeCat:undefined })
      .then(r=>setItems(r.data))
      .catch(()=>setItems([]))
      .finally(()=>setLoading(false));
  },[search,activeCat]);

  useEffect(()=>{ load(); },[load]);

  const handleCatChange = (cat) => {
    setAddCat(cat);
    setForm(defaults(cat));
    setImgData(null);
  };

  const handleImagePick = async (e) => {
    const file=e.target.files[0]; if(!file) return;
    const b64=await toBase64(file); setImgData(b64);
  };

  const handleAdd = async () => {
    // Auto-build name from form fields
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
    await updateItem(local.id,{
      sell_price:parseFloat(local.sell_price)||0, cost_price:parseFloat(local.cost_price)||0,
      min_quantity:parseInt(local.min_quantity)||2, dealer:local.dealer,
    });
    load(); setSelected(null);
  };

  const handleDeletePanel = async (id) => {
    if(!window.confirm('Remove this item from stock?')) return;
    await deleteItem(id); setSelected(null); load();
  };

  const handlePanelImageChange = async (e) => {
    const file=e.target.files[0]; if(!file||!selected) return;
    const b64=await toBase64(file);
    await updateItem(selected.id,{image_url:b64});
    setSelected(s=>({...s,image_url:b64}));
    load();
  };

  // Stats
  const low = items.filter(i=>i.quantity>0&&i.quantity<=i.min_quantity).length;
  const out = items.filter(i=>i.quantity===0).length;
  const val = items.reduce((s,i)=>s+(parseFloat(i.sell_price||0)*i.quantity),0);

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:C.navy,margin:0}}>📦 Inventory</h1>
          <p style={{fontSize:13,color:C.muted,margin:'4px 0 0'}}>Frames, sunglasses, accessories and supplies</p>
        </div>
        <button onClick={()=>setShowAdd(s=>!s)}
          style={{padding:'9px 20px',background:showAdd?C.cream:C.gold,color:showAdd?C.muted:C.navy,border:showAdd?`1.5px solid ${C.border}`:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          {showAdd?'✕ Cancel':'+ Add Item'}
        </button>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:20}}>
        {[
          {l:'Total Items',  v:items.length, dark:true},
          {l:'Low Stock',    v:low,   c:C.danger},
          {l:'Out of Stock', v:out,   c:'#9ca3af'},
          {l:'Stock Value',  v:`Rs.${Math.round(val/1000)}K`, c:C.success},
        ].map(s=>(
          <div key={s.l} style={{background:s.dark?C.navy:'white',border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 14px',textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.8px',color:s.dark?C.gold:C.muted,marginBottom:4}}>{s.l}</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:s.dark?'white':(s.c||C.navy)}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* ── ADD FORM ── */}
      {showAdd && (
        <div style={{background:'white',border:`1px solid ${C.border}`,borderRadius:14,padding:24,marginBottom:20}}>
          <h3 style={{fontSize:15,fontWeight:700,color:C.navy,marginBottom:16}}>➕ Add New Item</h3>

          {/* Category selector */}
          <div style={{marginBottom:18}}>
            <label style={LBL}>Category *</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {CATEGORIES.map(c=>(
                <button key={c.key} onClick={()=>handleCatChange(c.key)}
                  style={{padding:'8px 14px',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',border:`1.5px solid ${addCat===c.key?C.navy:C.border}`,background:addCat===c.key?C.navy:'white',color:addCat===c.key?'white':C.muted,display:'flex',alignItems:'center',gap:6}}>
                  <span>{c.icon}</span> {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Photo upload */}
          <ImageUpload imgData={imgData} onPick={handleImagePick} onRemove={()=>setImgData(null)}/>

          {/* Category-specific fields */}
          <div style={{marginTop:14}}>
            <CategoryFields form={form} set={setForm}/>
          </div>

          {/* Common fields: price, quantity */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginTop:14}}>
            <Field label="Cost Price (Rs.)"><input type="number" value={form.cost_price||''} onChange={e=>setForm(f=>({...f,cost_price:e.target.value}))} placeholder="Buy price" style={INP}/></Field>
            <Field label="Sell Price (Rs.)"><input type="number" value={form.sell_price||''} onChange={e=>setForm(f=>({...f,sell_price:e.target.value}))} placeholder="Sell price" style={INP}/></Field>
            <Field label="Quantity"><input type="number" value={form.quantity||''} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} placeholder="e.g. 5" style={INP}/></Field>
            <Field label="Min Alert"><input type="number" value={form.min_quantity||''} onChange={e=>setForm(f=>({...f,min_quantity:e.target.value}))} placeholder="e.g. 2" style={INP}/></Field>
          </div>

          {/* Preview name */}
          {buildName(form) && (
            <div style={{marginTop:12,background:C.cream,borderRadius:8,padding:'10px 14px',fontSize:13,color:C.muted}}>
              Item will be saved as: <b style={{color:C.navy}}>{buildName(form)}</b>
            </div>
          )}

          <div style={{display:'flex',gap:8,marginTop:16}}>
            <button onClick={handleAdd} style={{padding:'10px 22px',background:C.navy,color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>💾 Save Item</button>
            <button onClick={()=>{setShowAdd(false);setForm(defaults(addCat));setImgData(null);}} style={{padding:'10px 16px',background:C.cream,border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:C.muted}}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── CATEGORY TABS ── */}
      <div style={{display:'flex',gap:0,borderBottom:`1px solid ${C.border}`,marginBottom:16,overflowX:'auto',background:'white',borderRadius:'12px 12px 0 0',padding:'0 4px'}}>
        {[{key:'All',icon:'📋',label:'All'},...CATEGORIES].map(c=>(
          <button key={c.key} onClick={()=>setActiveCat(c.key)}
            style={{padding:'11px 14px',fontSize:13,fontWeight:600,cursor:'pointer',background:'none',border:'none',fontFamily:'inherit',whiteSpace:'nowrap',color:activeCat===c.key?C.navy:C.muted,borderBottom:`2.5px solid ${activeCat===c.key?C.gold:'transparent'}`,marginBottom:-1,display:'flex',alignItems:'center',gap:5}}>
            <span>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{marginBottom:16}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search items..."
          style={{...INP,maxWidth:400}}/>
      </div>

      {/* Items grid */}
      {loading
        ? <p style={{color:C.muted,fontSize:13,padding:'20px 0'}}>Loading...</p>
        : !items.length
          ? <div style={{textAlign:'center',padding:'48px 20px',color:C.muted}}>
              <div style={{fontSize:40,marginBottom:12}}>📦</div>
              <div style={{fontSize:14,fontWeight:600}}>No items in this category yet</div>
              <div style={{fontSize:13,marginTop:6}}>Click "+ Add Item" to add your first item</div>
            </div>
          : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:14}}>
              {items.map(item=>(
                <ItemCard key={item.id} item={item} onClick={()=>setSelected(item)}/>
              ))}
            </div>
      }

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          item={selected}
          onClose={()=>setSelected(null)}
          onQtyChange={handleQtyChange}
          onSave={handleSavePanel}
          onDelete={handleDeletePanel}
          onImageChange={handlePanelImageChange}
        />
      )}
    </div>
  );
}
