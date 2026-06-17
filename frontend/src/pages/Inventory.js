/* eslint-disable */
// ============================================================
//  Inventory.js — With stock adjustment log
//  Click any item → Adjustment tab to record stock changes
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getInventory, createItem, updateItem, deleteItem } from '../api';

// ── Autocomplete input ────────────────────────────────────────
function AutoInput({ value, onChange, placeholder, style, suggestions=[] }) {
  const [open, setOpen] = React.useState(false);
  const filtered = suggestions.filter(s =>
    s && value && s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  ).slice(0, 6);

  return (
    <div style={{ position:'relative' }}>
      <input value={value} onChange={e=>{ onChange(e.target.value); setOpen(true); }}
        onFocus={()=>setOpen(true)}
        onBlur={()=>setTimeout(()=>setOpen(false), 150)}
        placeholder={placeholder} style={style}/>
      {open && filtered.length > 0 && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white',
          border:'1.5px solid #c9a84c', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,.12)',
          zIndex:100, overflow:'hidden', marginTop:2 }}>
          {filtered.map((s,i)=>(
            <div key={i} onMouseDown={()=>{ onChange(s); setOpen(false); }}
              style={{ padding:'9px 13px', cursor:'pointer', fontSize:13, color:'#0f1f3d',
                borderBottom:'1px solid #f8f5ef' }}
              onMouseEnter={e=>e.currentTarget.style.background='#f8f5ef'}
              onMouseLeave={e=>e.currentTarget.style.background='white'}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


import { StickerModal, QRScanner, PriceUpdateModal } from '../components/QRStickers';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b' };
const fmtMoney = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
// Compress image to max 500px wide, 70% quality JPEG — keeps size under 50KB
const compressImage = (file, maxWidth=500, quality=0.7) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onload = (e) => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio  = Math.min(1, maxWidth / img.width);
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});
const toBase64 = compressImage;  // alias so existing code still works
const fmtDate   = (d) => new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});

const CATS      = ['All','Frames','Sunglasses','Reading Glasses','Boxes','Sunglass Pouches','Glass Cleaner','Chains','Ear Tips','Old Stock'];
const CAT_ICON  = { Frames:'🕶️', Sunglasses:'😎', 'Reading Glasses':'👓', Boxes:'📦', 'Sunglass Pouches':'👜', 'Glass Cleaner':'🧴', Chains:'⛓️', 'Ear Tips':'🔧', 'Old Stock':'📦' };
const FR_SHAPES = ['Round','Oval','Rectangle','Square','Cat-eye','Aviator','Wayfarer','Butterfly','Hexagon','Geometric'];
const FR_TYPES  = ['Full rim','Half rim','Rimless'];
const FR_MATS   = ['Plastic','Metal','TR90','Titanium','Acetate','Mixed'];
const FR_COLORS = ['Black','Gold','Silver','Brown','Gunmetal','Blue','Red','Pink','Tortoise','Crystal','Green','Purple','White','Multicolor','Other'];
const FR_SIZES  = ['Extra Small','Small','Medium','Large','Extra Large','48mm','50mm','52mm','54mm','56mm','58mm'];
const SG_TYPES  = ['Polarised','Local'];
const RG_TYPES  = ['Single Vision','Bifocal'];
const RG_MATS   = ['Plastic','Metal'];
const RG_POWERS = ['+1.00','+1.25','+1.50','+1.75','+2.00','+2.25','+2.50','+2.75','+3.00','+3.25','+3.50','+4.00'];

const REASONS = [
  'New stock received','Damaged item','Lost / missing','Customer return',
  'Wrong count correction','Expired / spoiled','Given as sample','Other',
];

const INP = { padding:'10px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%' };
const SEL = { ...INP, cursor:'pointer' };
const LBL = { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, marginBottom:5, display:'block' };

const Field = ({ label, children }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
    <label style={LBL}>{label}</label>{children}
  </div>
);

function apiAdj(path, method='GET', body=null) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, {
    method,
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r=>r.json());
}

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
    case 'Reading Glasses': return [form.brand, form.rg_lens_type, form.frame_color, form.rg_power].filter(Boolean).join(' · ');
    case 'Chains':          return [form.item_name||'Chain', form.frame_material, form.frame_color].filter(Boolean).join(' · ');
    case 'Ear Tips':        return [form.item_name||'Ear Tips', form.frame_material, form.frame_size].filter(Boolean).join(' · ');
    default: return form.item_name || form.brand || form.category;
  }
};

function CategoryFields({ form, set, suggestions }) {
  const inp = (key, placeholder) => <input value={form[key]||''} onChange={e=>set(f=>({...f,[key]:e.target.value}))} placeholder={placeholder} style={INP}/>;
  const sel = (key, options) => (
    <>
      <select value={options.includes(form[key]||'') ? (form[key]||'') : 'Other'}
        onChange={e => {
          if (e.target.value === 'Other') set(f=>({...f,[key]:''}));
          else set(f=>({...f,[key]:e.target.value}));
        }} style={SEL}>
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
      {/* Show text input when Other selected or value not in list */}
      {(!options.includes(form[key]||'') || form[key] === '') && key === 'frame_color' && (
        <input value={form[key]||''} onChange={e=>set(f=>({...f,[key]:e.target.value}))}
          placeholder="Type custom color..."
          style={{ ...INP, marginTop:4, border:'1.5px solid #f59e0b', background:'#fffbeb' }}
          autoFocus/>
      )}
    </>
  );
  const common = (sugg) => <>
    <Field label="Brand">
      <AutoInput value={form.brand||''} onChange={v=>set(f=>({...f,brand:v}))} placeholder="Brand name" style={INP}
        suggestions={sugg?.brands||[]}/>
    </Field>
    <Field label="Dealer">
      <AutoInput value={form.dealer||''} onChange={v=>set(f=>({...f,dealer:v}))} placeholder="Supplier" style={INP}
        suggestions={sugg?.dealers||[]}/>
    </Field>
  </>;
  switch(form.category) {
    case 'Frames': return <>{common(suggestions)}<Field label="Model Name">{inp('frame_name','e.g. RB3025')}</Field><Field label="Shape">{sel('frame_shape',FR_SHAPES)}</Field><Field label="Type">{sel('frame_type',FR_TYPES)}</Field><Field label="Material">{sel('frame_material',FR_MATS)}</Field><Field label="Color">{sel('frame_color',FR_COLORS)}</Field><Field label="Size">{sel('frame_size',FR_SIZES)}</Field></>;
    case 'Sunglasses': return <>{common(suggestions)}<Field label="Model">{inp('frame_name','Model code')}</Field><Field label="Type">{sel('sg_type',SG_TYPES)}</Field><Field label="Shape">{sel('frame_shape',FR_SHAPES)}</Field><Field label="Material">{sel('frame_material',FR_MATS)}</Field><Field label="Color">{sel('frame_color',FR_COLORS)}</Field><Field label="Size">{sel('frame_size',FR_SIZES)}</Field></>;
    case 'Reading Glasses': return <>{common(suggestions)}<Field label="Lens Type">{sel('rg_lens_type',RG_TYPES)}</Field><Field label="Material">{sel('rg_material',RG_MATS)}</Field><Field label="Power">{sel('rg_power',RG_POWERS)}</Field><Field label="Color">{sel('frame_color',FR_COLORS)}</Field></>;
    default: return <>{common(suggestions)}<Field label="Name / Type">{inp('item_name','Item name')}</Field>{['Boxes','Sunglass Pouches','Chains'].includes(form.category)&&<Field label="Color">{sel('frame_color',FR_COLORS)}</Field>}</>;
  }
}

function ItemCard({ item, onClick, onSticker }) {
  const isLow = item.quantity>0 && item.quantity<=item.min_quantity;
  const isOut = item.quantity===0;
  const cat   = CAT_ICON[item.category]||'📦';
  let sub = '';
  if (item.category==='Frames')              sub=[item.frame_color,item.frame_shape,item.frame_size].filter(Boolean).join(' · ');
  else if (item.category==='Sunglasses')     sub=[item.sg_type,item.frame_color].filter(Boolean).join(' · ');
  else if (item.category==='Reading Glasses')sub=[item.rg_power,item.rg_lens_type].filter(Boolean).join(' · ');
  else sub=item.brand||'';
  return (
    <div style={{ background:'white', border:`1.5px solid ${isOut?'#d1d5db':isLow?'#fca5a5':C.border}`, borderRadius:14, cursor:'pointer', overflow:'hidden', position:'relative', transition:'all .15s', borderLeft:isLow&&!isOut?`4px solid ${C.danger}`:undefined }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold}
      onMouseLeave={e=>e.currentTarget.style.borderColor=isOut?'#d1d5db':isLow?'#fca5a5':C.border}>
      <div onClick={onClick} style={{ height:110, background:C.cream, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
        {item.image_url?<img src={item.image_url} alt={item.name} loading="lazy" decoding="async" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:<div style={{ fontSize:32, opacity:.35 }}>{cat}</div>}
        {isOut&&<span style={{ position:'absolute', top:7, right:7, background:'#f3f4f6', color:'#6b7280', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>Out</span>}
        {isLow&&!isOut&&<span style={{ position:'absolute', top:7, right:7, background:'#fee2e2', color:C.danger, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>Low</span>}
        <span style={{ position:'absolute', bottom:7, left:7, background:'rgba(15,31,61,.7)', color:'white', fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20 }}>{cat} {item.category}</span>
      </div>
      <div onClick={onClick} style={{ padding:'10px 12px 6px' }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:2, lineHeight:1.3 }}>{item.name}</div>
        {sub&&<div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>{sub}</div>}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:6 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e' }}>Rs.{parseFloat(item.sell_price||0).toLocaleString()}</div>
          <div style={{ textAlign:'right' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {item.notes && item.notes.includes('[NEW STOCK') && (
                <div style={{ background:'#dcfce7', color:'#166534', borderRadius:6, padding:'1px 7px', fontSize:9, fontWeight:700, flexShrink:0 }}>
                  NEW
                </div>
              )}
              {item.display_number && (
                <div style={{ background:'#dbeafe', color:'#1e40af', borderRadius:6, padding:'1px 7px', fontSize:10, fontWeight:700, flexShrink:0 }} title="Showroom slot">
                  🏪#{item.display_number}
                </div>
              )}
              {item.stock_number && (
                <div style={{ background:'#f5f3ff', color:'#7c3aed', borderRadius:6, padding:'1px 7px', fontSize:10, fontWeight:700, flexShrink:0 }} title="Stock box">
                  📦#{item.stock_number}
                </div>
              )}
              <div style={{ fontSize:18, fontWeight:700, color:isOut?'#9ca3af':isLow?C.danger:C.success }}>{item.quantity}</div>
            </div>
            <div style={{ fontSize:10, color:'#9ca3af' }}>in stock</div>
            {item.updated_at && (
              <div style={{ fontSize:9, color:'#9ca3af', marginTop:1 }}>
                {new Date(item.updated_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
                {' '}{new Date(item.updated_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
              </div>
            )}
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

// ── Stock Adjustment Panel ────────────────────────────────────
function AdjustmentPanel({ item, onDone }) {
  const [adjType,    setAdjType]   = useState('add');
  const [adjQty,     setAdjQty]    = useState('');
  const [adjReason,  setAdjReason] = useState('New stock received');
  const [adjNotes,   setAdjNotes]  = useState('');
  const [saving,     setSaving]    = useState(false);
  const [error,      setError]     = useState('');
  const [history,    setHistory]   = useState([]);
  const [loadingLog, setLoadingLog]= useState(true);
  const [toast,      setToast]     = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  useEffect(()=>{ loadHistory(); },[item.id]);

  const loadHistory = async () => {
    setLoadingLog(true);
    try {
      const data = await apiAdj(`/stock-adjustments?inventory_id=${item.id}&limit=30`);
      setHistory(Array.isArray(data)?data:[]);
    } catch(e) { console.error(e); }
    finally { setLoadingLog(false); }
  };

  const handleSave = async () => {
    if (!adjQty || parseInt(adjQty) <= 0) return setError('Enter a valid quantity');
    if (!adjReason) return setError('Select a reason');
    setError(''); setSaving(true);
    try {
      const res = await apiAdj('/stock-adjustments', 'POST', {
        inventory_id: item.id,
        change_type:  adjType,
        quantity_change: parseInt(adjQty),
        reason: adjReason,
        notes:  adjNotes.trim() || null,
      });
      if (res.error) throw new Error(res.error);
      showToast(`Stock ${adjType==='add'?'added':'removed'} — now ${res.new_quantity} in stock`);
      setAdjQty(''); setAdjNotes(''); setAdjReason('New stock received');
      loadHistory();
      onDone(res.new_quantity); // update parent's displayed qty
    } catch(e) { setError(e.message||'Failed to save'); }
    finally { setSaving(false); }
  };

  const currentQty = item.quantity;
  const previewQty = adjQty
    ? (adjType==='add' ? currentQty + parseInt(adjQty||0) : Math.max(0, currentQty - parseInt(adjQty||0)))
    : null;

  const TYPE_INFO = {
    add:        { label:'Add Stock',       color:'#2563eb',  bg:'#eff6ff',  icon:'⬆️' },
    remove:     { label:'Remove Stock',    color:C.danger,   bg:'#fef2f2',  icon:'⬇️' },
    correction: { label:'Correct Count',   color:'#7c3aed',  bg:'#f5f3ff',  icon:'✏️' },
  };

  return (
    <div>
      {toast && (
        <div style={{ background:C.navy, color:'white', padding:'10px 14px', borderRadius:9, fontSize:13, fontWeight:600, marginBottom:14, borderLeft:`3px solid ${C.gold}` }}>
          ✅ {toast}
        </div>
      )}

      {/* Current stock display */}
      <div style={{ background:C.navy, borderRadius:12, padding:'14px 16px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:10, color:C.gold, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:3 }}>Current Stock</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:700, color:'white' }}>{currentQty}</div>
        </div>
        {previewQty !== null && (
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, color:'#ede9e0', marginBottom:3 }}>After adjustment</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color: adjType==='add'?'#86efac':'#fca5a5' }}>
              {previewQty}
            </div>
          </div>
        )}
      </div>

      {/* Type picker */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
        {Object.entries(TYPE_INFO).map(([k,v])=>(
          <button key={k} onClick={()=>{ setAdjType(k); if(k==='add') setAdjReason('New stock received'); else if(k==='remove') setAdjReason('Damaged item'); else setAdjReason('Wrong count correction'); }}
            style={{ padding:'10px 8px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${adjType===k?v.color:C.border}`, background:adjType===k?v.bg:'white', color:adjType===k?v.color:C.muted, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
            <span style={{ fontSize:18 }}>{v.icon}</span>
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      {error && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'9px 13px', fontSize:13, marginBottom:12 }}>⚠️ {error}</div>}

      {/* Quantity */}
      <div style={{ marginBottom:12 }}>
        <label style={LBL}>Quantity *</label>
        <input type="number" min="1" value={adjQty} onChange={e=>setAdjQty(e.target.value)}
          placeholder={adjType==='add'?'How many received?':adjType==='remove'?'How many to remove?':'Correct count to?'}
          style={{ ...INP, fontSize:18, fontWeight:700 }}/>
      </div>

      {/* Reason */}
      <div style={{ marginBottom:12 }}>
        <label style={LBL}>Reason *</label>
        <select value={adjReason} onChange={e=>setAdjReason(e.target.value)} style={SEL}>
          {REASONS.map(r=><option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Notes */}
      <div style={{ marginBottom:14 }}>
        <label style={LBL}>Notes (optional)</label>
        <input value={adjNotes} onChange={e=>setAdjNotes(e.target.value)}
          placeholder="Any additional details..." style={INP}/>
      </div>

      <button onClick={handleSave} disabled={saving}
        style={{ width:'100%', padding:'12px', background:saving?C.muted:TYPE_INFO[adjType].color, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit', marginBottom:20 }}>
        {saving ? '⏳ Saving...' : `${TYPE_INFO[adjType].icon} ${TYPE_INFO[adjType].label} — ${adjQty||'?'} units`}
      </button>

      {/* History */}
      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:12 }}>📋 Adjustment History</div>
        {loadingLog
          ? <div style={{ color:C.muted, fontSize:13 }}>Loading...</div>
          : !history.length
            ? <div style={{ textAlign:'center', padding:'20px 0', color:C.muted, fontSize:13 }}>
                <div style={{ fontSize:28, marginBottom:8 }}>📋</div>
                No adjustments recorded yet
              </div>
            : history.map(h=>{
                const isAdd = h.quantity_change > 0;
                return (
                  <div key={h.id} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:`1px solid ${C.cream}`, alignItems:'flex-start' }}>
                    {/* Icon */}
                    <div style={{ width:32, height:32, borderRadius:8, background:isAdd?'#eff6ff':h.change_type==='correction'?'#f5f3ff':'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                      {isAdd?'⬆️':h.change_type==='correction'?'✏️':'⬇️'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:2 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{h.reason}</div>
                        <div style={{ fontSize:13, fontWeight:700, color:isAdd?'#2563eb':C.danger, flexShrink:0, marginLeft:8 }}>
                          {isAdd?'+':''}{h.quantity_change}
                        </div>
                      </div>
                      <div style={{ fontSize:11, color:C.muted }}>
                        {h.quantity_before} → {h.quantity_after} units
                        {h.adjusted_by_name && ` · ${h.adjusted_by_name}`}
                      </div>
                      {h.notes && <div style={{ fontSize:11, color:C.muted, fontStyle:'italic', marginTop:2 }}>{h.notes}</div>}
                      <div style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>{fmtDate(h.created_at)}</div>
                    </div>
                  </div>
                );
              })
        }
      </div>
    </div>
  );
}

// ── Add Colour Variant Panel ─────────────────────────────────
function AddVariantPanel({ item, items, onDone }) {
  const [variants,  setVariants]  = React.useState([{ color:'Black', qty:'1', image:null, cost_price:'', sell_price:'' }]);
  const [saving,    setSaving]    = React.useState(false);
  const [error,     setError]     = React.useState('');
  const [toast,     setToast]     = React.useState('');
  const [existing,  setExisting]  = React.useState([]); // same model different colours

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  // Find all items with same brand + model name (different colours of same frame)
  React.useEffect(() => {
    const sameModel = items.filter(i =>
      i.id !== item.id &&
      i.brand === item.brand &&
      i.category === item.category &&
      // Match on frame_name part of the name
      i.name.toLowerCase().includes((item.brand||'').toLowerCase()) &&
      (item.frame_type ? i.frame_type === item.frame_type : true)
    );
    setExisting(sameModel);
  }, [item, items]);

  const handleSave = async () => {
    if (!variants.length) return;
    const invalid = variants.find(v => !v.color.trim() || parseInt(v.qty||0) < 0);
    if (invalid) return setError('Please fill in color and quantity for all variants');
    setError(''); setSaving(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      let saved = 0;
      for (const v of variants) {
        if (!v.color.trim()) continue;
        // Build new item name — same as existing but with new color
        const newName = item.name.replace(
          new RegExp(item.frame_color || 'Black', 'i'),
          v.color
        );
        // Use new name only if color was found in old name; else append color
        const finalName = newName !== item.name
          ? newName
          : `${item.name.split(' · ').slice(0,-1).join(' · ')} · ${v.color}`;

        // Check if this exact color variant already exists
        const alreadyExists = items.find(i =>
          i.name.toLowerCase() === finalName.toLowerCase() ||
          (i.brand === item.brand && i.frame_color === v.color &&
           i.category === item.category && i.frame_type === item.frame_type &&
           i.id !== item.id)
        );

        if (alreadyExists) {
          // Just update quantity of existing variant
          await fetch(`${BASE}/inventory/${alreadyExists.id}`, {
            method:'PATCH',
            headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
            body: JSON.stringify({
              quantity: alreadyExists.quantity + parseInt(v.qty||0),
              cost_price: parseFloat(v.cost_price)||parseFloat(item.cost_price)||0,
              sell_price: parseFloat(v.sell_price)||parseFloat(item.sell_price)||0,
              ...(v.image ? { image_url: v.image } : {}),
            }),
          });
          showToast(`Updated ${v.color} — added ${v.qty} to existing stock`);
        } else {
          // Create brand new variant
          await fetch(`${BASE}/inventory`, {
            method:'POST',
            headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
            body: JSON.stringify({
              name:           finalName,
              category:       item.category,
              brand:          item.brand,
              dealer:         item.dealer,
              frame_type:     item.frame_type,
              frame_color:    v.color,
              frame_shape:    item.frame_shape,
              frame_material: item.frame_material,
              frame_size:     item.frame_size,
              sg_type:        item.sg_type,
              rg_lens_type:   item.rg_lens_type,
              rg_material:    item.rg_material,
              rg_power:       item.rg_power,
              cost_price:     parseFloat(v.cost_price)||parseFloat(item.cost_price)||0,
              sell_price:     parseFloat(v.sell_price)||parseFloat(item.sell_price)||0,
              quantity:       parseInt(v.qty)||0,
              min_quantity:   item.min_quantity||2,
              image_url:      v.image||null,
              display_number: null,
              stock_number:   null,
            }),
          });
          saved++;
        }
      }
      showToast(`Saved ${saved} new colour variant${saved!==1?'s':''} ✓`);
      setTimeout(onDone, 1200);
    } catch(e) { setError(e.message||'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      {toast && (
        <div style={{ background:C.navy, color:'white', padding:'10px 14px', borderRadius:9,
          fontSize:13, fontWeight:600, marginBottom:14, borderLeft:`3px solid ${C.gold}` }}>
          ✅ {toast}
        </div>
      )}

      {/* Current item reference */}
      <div style={{ background:C.cream, borderRadius:12, padding:'12px 14px', marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, letterSpacing:'.8px', marginBottom:6 }}>
          Adding variants of
        </div>
        <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{item.name}</div>
        <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
          {item.brand} · {item.frame_type} · Current colour: <b style={{color:C.navy}}>{item.frame_color}</b>
        </div>
        <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
          Cost: Rs.{parseFloat(item.cost_price||0).toLocaleString()} · Sell: Rs.{parseFloat(item.sell_price||0).toLocaleString()}
        </div>
      </div>

      {/* Existing colour variants of same model */}
      {existing.length > 0 && (
        <div style={{ background:'#eff6ff', border:'1px solid #bae6fd', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#1e40af', marginBottom:8 }}>
            🎨 Other colours already in stock for this model:
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {existing.map(e=>(
              <span key={e.id} style={{ background:'white', border:'1px solid #bae6fd', borderRadius:20,
                padding:'3px 10px', fontSize:12, color:'#1e40af', fontWeight:600 }}>
                {e.frame_color} ({e.quantity} in stock)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Variant rows */}
      <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10 }}>
        New Colour Variants to Add
      </div>

      {variants.map((v, i) => (
        <div key={i} style={{ background:'white', border:`1.5px solid ${C.border}`, borderRadius:12,
          padding:'14px', marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>Variant {i+1}</div>
            {variants.length > 1 && (
              <button onClick={()=>setVariants(vs=>vs.filter((_,j)=>j!==i))}
                style={{ background:'#fee2e2', color:C.danger, border:'none', borderRadius:7,
                  padding:'4px 10px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                ✕ Remove
              </button>
            )}
          </div>

          {/* Color + Image row */}
          <div style={{ display:'flex', gap:10, marginBottom:10, alignItems:'flex-start' }}>
            {/* Image picker */}
            <label style={{ width:64, height:64, border:`2px dashed ${v.image?C.gold:C.border}`,
              borderRadius:9, cursor:'pointer', background:v.image?'#fdf9f0':C.cream,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              overflow:'hidden', position:'relative', flexShrink:0 }}>
              {v.image
                ? <img src={v.image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : <><span style={{ fontSize:20 }}>📷</span><span style={{ fontSize:9, color:C.muted }}>Photo</span></>
              }
              <input type="file" accept="image/*" style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer' }}
                onChange={async e=>{
                  const f=e.target.files[0]; if(!f) return;
                  const b64=await compressImage(f);
                  setVariants(vs=>vs.map((x,j)=>j===i?{...x,image:b64}:x));
                }}/>
            </label>

            {/* Color select */}
            <div style={{ flex:1 }}>
              <label style={LBL}>Colour *</label>
              <select value={FR_COLORS.includes(v.color)?v.color:'Other'}
                onChange={e=>{
                  if(e.target.value==='Other') setVariants(vs=>vs.map((x,j)=>j===i?{...x,color:''}:x));
                  else setVariants(vs=>vs.map((x,j)=>j===i?{...x,color:e.target.value}:x));
                }}
                style={{ ...INP, marginBottom:4 }}>
                {FR_COLORS.map(col=><option key={col}>{col}</option>)}
              </select>
              {(!FR_COLORS.includes(v.color)||v.color==='') && (
                <input value={v.color}
                  onChange={e=>setVariants(vs=>vs.map((x,j)=>j===i?{...x,color:e.target.value}:x))}
                  placeholder="Type colour e.g. Dark Brown..."
                  style={{ ...INP, border:'1.5px solid #f59e0b', background:'#fffbeb' }}/>
              )}
            </div>
          </div>

          {/* Qty + Price row */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            <div>
              <label style={LBL}>Qty *</label>
              <input type="number" min="0" value={v.qty}
                onChange={e=>setVariants(vs=>vs.map((x,j)=>j===i?{...x,qty:e.target.value}:x))}
                placeholder="e.g. 3"
                style={{ ...INP, fontWeight:700 }}/>
            </div>
            <div>
              <label style={LBL}>Cost Price</label>
              <input type="number" value={v.cost_price}
                onChange={e=>setVariants(vs=>vs.map((x,j)=>j===i?{...x,cost_price:e.target.value}:x))}
                placeholder={`${item.cost_price||0} (same)`}
                style={INP}/>
            </div>
            <div>
              <label style={LBL}>Sell Price</label>
              <input type="number" value={v.sell_price}
                onChange={e=>setVariants(vs=>vs.map((x,j)=>j===i?{...x,sell_price:e.target.value}:x))}
                placeholder={`${item.sell_price||0} (same)`}
                style={INP}/>
            </div>
          </div>

          {/* Preview name */}
          {v.color && (
            <div style={{ marginTop:8, background:C.cream, borderRadius:7, padding:'6px 10px', fontSize:11, color:C.muted }}>
              Will save as: <b style={{color:C.navy}}>
                {item.name.replace(new RegExp(item.frame_color||'Black','i'),v.color)!==item.name
                  ? item.name.replace(new RegExp(item.frame_color||'Black','i'),v.color)
                  : `${item.name.split(' · ').slice(0,-1).join(' · ')} · ${v.color}`}
              </b>
            </div>
          )}
        </div>
      ))}

      {error && (
        <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:C.danger,
          borderRadius:8, padding:'9px 13px', fontSize:13, marginBottom:12 }}>
          ⚠️ {error}
        </div>
      )}

      <button onClick={()=>setVariants(vs=>[...vs,{ color:'', qty:'1', image:null, cost_price:'', sell_price:'' }])}
        style={{ width:'100%', padding:'10px', background:C.cream, border:`1.5px dashed ${C.border}`,
          borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
          color:C.muted, marginBottom:12 }}>
        + Add Another Colour
      </button>

      <button onClick={handleSave} disabled={saving}
        style={{ width:'100%', padding:'12px', background:saving?C.muted:C.navy,
          color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700,
          cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
        {saving ? '⏳ Saving...' : `💾 Save ${variants.length} Colour Variant${variants.length!==1?'s':''}`}
      </button>
    </div>
  );
}

// ── Phone Photo QR Component ─────────────────────────────────
// ══════════════════════════════════════════════════════════════
export default function Inventory() {
  const [items,        setItems]       = useState([]);
  const [activeCat,    setActiveCat]   = useState('All');
  const [subFilter,    setSubFilter]   = useState('');
  const [search,       setSearch]      = useState('');
  const [selected,     setSelected]    = useState(null);
  const [panelTab,     setPanelTab]    = useState('details');
  const [showAdd,      setShowAdd]     = useState(false);
  const [addStep,      setAddStep]     = useState('category'); // 'category' | 'form'
  const [suggestions,  setSuggestions] = useState({ dealers:[], brands:[], names:[] });
  const [addSaving,    setAddSaving]   = useState(false);
  const [dupMatches,   setDupMatches]  = useState([]);
  const [dupChecking,  setDupChecking] = useState(false);
  const [addCat,       setAddCat]      = useState('');
  const [showAIScan,   setShowAIScan]  = useState(false);
  const [aiPhotos,     setAiPhotos]    = useState({ front:null, arm:null, tag:null });
  const [aiLoading,    setAiLoading]   = useState(false);
  const [aiStep,       setAiStep]      = useState('front'); // front | arm | tag | confirm
  const [aiResult,     setAiResult]    = useState(null);
  const [colorVariants,setColorVariants] = useState([{ color:'Black', qty:'1', image:null }]);
  const [powerVariants,setPowerVariants] = useState(RG_POWERS.map(p=>({ power:p, qty:'0' })));
  // Keep first variant color in sync with form frame_color
  const prevFrameColor = React.useRef('Black');
  const mergeLogRef    = React.useRef([]);
  const [loading,      setLoading]     = useState(true);
  const [imgData,      setImgData]     = useState(null);
  const [form,         setForm]        = useState(defaults('Frames'));
  const [showStickers,   setShowStickers]  = useState(false);
  const [showPriceUpdate,setShowPriceUpdate]= useState(false);
  const [priceUpdateItems,setPriceUpdateItems]=useState([]);
  const [showScanner,   setShowScanner]  = useState(false);
  // Phone→PC photo session
  const [pcSessionId,   setPcSessionId]  = useState(null);
  const [pcPolling,     setPcPolling]    = useState(false);
  const pollIntervalRef = React.useRef(null);

  const [scanResult,   setScanResult]  = useState(null); // last scanned item
  const [showFullImg,  setShowFullImg] = useState(false);
  const [stickerItems, setStickerItems]= useState([]);

  const load = useCallback(()=>{
    setLoading(true);
    const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('ko_token');
    const params = new URLSearchParams({ limit:'500', no_images:'1' });
    if (search)                   params.set('search', search);
    if (activeCat !== 'All')      params.set('category', activeCat);
    fetch(`${BASE}/inventory?${params}`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r=>r.json())
      .then(r=>{
        const arr = Array.isArray(r) ? r : Array.isArray(r.data) ? r.data : [];
        setItems(arr);
        // Build autocomplete suggestions from existing data
        setSuggestions({
          dealers: [...new Set(arr.map(i=>i.dealer).filter(Boolean))].sort(),
          brands:  [...new Set(arr.map(i=>i.brand).filter(Boolean))].sort(),
          names:   [...new Set(arr.map(i=>i.item_name).filter(Boolean))].sort(),
        });
      })
      .catch(()=>setItems([]))
      .finally(()=>setLoading(false));
  },[search,activeCat]);

  useEffect(()=>{ load(); },[load]);

  // Handle ?scan=ID from global QR scanner
  const location  = useLocation();
  const navInv    = useNavigate();
  useEffect(()=>{
    const params = new URLSearchParams(location.search);
    const scanId = params.get('scan');
    if (scanId) {
      navInv('/inventory', { replace: true }); // clear the param
      const doScan = async () => {
        const id = parseInt(scanId);
        const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('ko_token');
        try {
          const res  = await fetch(`${BASE}/inventory/${id}`, { headers:{ Authorization:`Bearer ${token}` } });
          const item = await res.json();
          if (item?.id) { setPanelTab('details'); loadFullItem(item); }
        } catch(e) {}
      };
      doScan();
    }
  },[location.search]);

  // Check for duplicates when name fields change
  useEffect(()=>{
    const name     = buildName(form);
    const model    = form.frame_name || '';
    // Search by model number if typed, otherwise by full built name
    const searchBy = model.length >= 3 ? model : name;
    if (searchBy && searchBy.length >= 3 && showAdd) {
      const timer = setTimeout(()=>checkDuplicates(searchBy), 500);
      return ()=>clearTimeout(timer);
    } else {
      setDupMatches([]);
    }
  },[form.brand, form.item_name, form.frame_name, form.frame_color, showAdd]);

  // Sync form frame_color → first colour variant
  useEffect(()=>{
    if (form.frame_color && form.frame_color !== prevFrameColor.current) {
      prevFrameColor.current = form.frame_color;
      setColorVariants(cv => {
        if (!cv.length) return cv;
        // Only update first row if user hasn't manually changed it
        return cv.map((v,i) => i===0 ? {...v, color: form.frame_color} : v);
      });
    }
  },[form.frame_color]);

  const handleCatChange = (cat) => {
    setAddCat(cat);
    setForm(defaults(cat));
    setColorVariants([{ color:'Black', qty:'1', image:null }]);
    setPowerVariants(RG_POWERS.map(p=>({ power:p, qty:'0' })));
  };
  const handleImgPick = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const b64 = await toBase64(f);
    imgDataRef.current = b64;
    setImgData(b64);

    // Check if PC is waiting for a photo from this user account
    try {
      const BASE_  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token_ = localStorage.getItem('ko_token');
      // First check if PC is waiting
      const check = await fetch(`${BASE_}/scan-session/photo-session/pending`, {
        headers: { Authorization:`Bearer ${token_}` },
      }).then(r=>r.json()).catch(()=>({ pending:false }));

      if (check.pending) {
        // PC is waiting — push photo + current form fields to it
        const res = await fetch(`${BASE_}/scan-session/photo-session/upload-from-phone`, {
          method: 'POST',
          headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token_}` },
          body: JSON.stringify({
            image: b64,
            formData: {
              category:    addCat,
              name:        form.name        || '',
              brand:       form.brand       || '',
              model:       form.model       || '',
              frame_type:  form.frame_type  || '',
              frame_color: form.frame_color || '',
              material:    form.material    || '',
              sg_type:     form.sg_type     || '',
              rg_lens_type:form.rg_lens_type|| '',
              cost_price:  form.cost_price  || '',
              sell_price:  form.sell_price  || '',
              quantity:    form.quantity    || '',
            }
          }),
        });
        const data = await res.json();
        if (data.ok) {
          // Show a toast-style message
          const toast = document.createElement('div');
          toast.textContent = '✅ Photo sent to PC!';
          toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#0f1f3d;color:#c9a84c;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:700;z-index:9999;font-family:inherit';
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 3000);
        }
      }
    } catch(e) { /* non-critical */ }
  };

  // Start a PC session so phone (logged in on same account) can push a photo here
  const startPCPhotoSession = async () => {
    const BASE_  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const token_ = localStorage.getItem('ko_token');
    try {
      const r    = await fetch(`${BASE_}/scan-session/photo-session`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token_}` },
      });
      const data = await r.json();
      if (data.token) {
        setPcSessionId(data.token);
        setPcPolling(true);
        // Store in localStorage so the SAME browser on phone can find it
        // Session stored server-side — no localStorage needed
        return data.token;
      }
    } catch(e) { console.error('Session error', e); }
    return null;
  };

  // Poll for photo from phone
  useEffect(() => {
    if (!pcPolling || !pcSessionId) return;
    const BASE_  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const token_ = localStorage.getItem('ko_token');
    pollIntervalRef.current = setInterval(async () => {
      try {
        const r    = await fetch(`${BASE_}/scan-session/photo-session/${pcSessionId}/poll`, {
          headers: { Authorization:`Bearer ${token_}` },
        });
        const data = await r.json();
        if (data.expired) { setPcPolling(false); setPcSessionId(null); clearInterval(pollIntervalRef.current); return; }
        if (data.ready && data.image) {
          clearInterval(pollIntervalRef.current);
          setPcPolling(false);
          setPcSessionId('done');
          setImgData(data.image);
          setAddCat('');
          setAddStep('category');
          setShowAdd(true);
          setTimeout(() => setPcSessionId(null), 3000);
        }
      } catch(e) {}
    }, 1500);
    return () => clearInterval(pollIntervalRef.current);
  }, [pcPolling, pcSessionId]);



  // Check for duplicates when name/model changes
  const checkDuplicates = React.useCallback(async (name) => {
    if (!name || name.length < 3) { setDupMatches([]); return; }
    const searchTerm = name;
    setDupChecking(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/inventory?search=${encodeURIComponent(searchTerm)}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json  = await res.json();
      const arr   = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];
      // Find items where name is very similar
      // Only warn if model name/number actually matches — not just brand
      const searchLower = name.toLowerCase();
      const matches = arr.filter(item => {
        const itemLower = item.name.toLowerCase();
        // Must match on model number or full name — NOT just brand
        const modelMatch = form.frame_name && form.frame_name.length >= 3
          && itemLower.includes(form.frame_name.toLowerCase());
        const fullMatch  = itemLower === searchLower;
        return modelMatch || fullMatch;
      });
      setDupMatches(matches);
    } catch { setDupMatches([]); }
    finally { setDupChecking(false); }
  }, []);

  // ── AI Photo Analysis ────────────────────────────────────
  const analyzePhotos = async () => {
    setAiLoading(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/inventory/ai-analyze`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({
          front_image: aiPhotos.front,
          arm_image:   aiPhotos.arm,
          tag_image:   aiPhotos.tag,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiResult(data);
      setAiStep('confirm');
    } catch(e) {
      alert('AI analysis failed: ' + e.message);
    }
    setAiLoading(false);
  };

  const applyAiResult = () => {
    if (!aiResult) return;
    setAddCat('Frames');
    setForm(f => ({
      ...defaults('Frames'),
      brand:          aiResult.brand          || f.brand,
      frame_name:     aiResult.model          || f.frame_name,
      frame_color:    aiResult.color          || f.frame_color,
      frame_type:     aiResult.frame_type     || f.frame_type,
      frame_shape:    aiResult.frame_shape    || f.frame_shape,
      frame_material: aiResult.frame_material || f.frame_material,
      frame_size:     aiResult.frame_size     || f.frame_size,
      sell_price:     aiResult.sell_price     || f.sell_price,
      cost_price:     aiResult.cost_price     || f.cost_price,
    }));
    setImgData(aiPhotos.front || aiPhotos.arm || null);
    setShowAIScan(false);
    setShowAdd(true);
    setAiStep('front');
    setAiPhotos({ front:null, arm:null, tag:null });
    setAiResult(null);
  };

  const handleAdd = async () => {
    const name = buildName(form);
    if (!name.trim()) return alert('Please fill in the required fields');
    if (addSaving) return; // prevent double-click
    mergeLogRef.current = [];
    setAddSaving(true);
    try {
      // For Reading Glasses — use power variants instead of colour variants
      const variantsToSave = addCat === 'Reading Glasses'
        ? powerVariants
            .filter(v => parseInt(v.qty||0) > 0)
            .map(v => ({ color: form.frame_color||'Black', qty: v.qty, image: null, rg_power: v.power }))
        : colorVariants;

      // Save each variant
      for (const variant of variantsToSave) {
        if (parseInt(variant.qty||0) < 0) continue;
        const variantName = addCat === 'Reading Glasses'
          ? buildName({ ...form, rg_power: variant.rg_power })
          : buildName({ ...form, frame_color: variant.color });
        const newSell  = parseFloat(form.sell_price)||0;
        const newCost  = parseFloat(form.cost_price)||0;
        const newQty   = parseInt(variant.qty)||0;

        // Only merge if EXACT same name match — different models must be separate items
        const exact = items.find(i =>
          i.name.toLowerCase() === variantName.toLowerCase()
        );

        if (exact) {
          // Merge: add quantity, mark new stock, store price history
          const today = new Date().toLocaleDateString('en-GB');
          const prevNotes = exact.notes || '';
          const mergeNotes = `[NEW STOCK ${today}] +${newQty} units · Old price: Rs.${exact.sell_price} · New price: Rs.${newSell}${prevNotes ? ' | ' + prevNotes : ''}`;
          await updateItem(exact.id, {
            quantity:   exact.quantity + newQty,
            sell_price: newSell,
            cost_price: newCost,
            notes:      mergeNotes,
          });
          mergeLogRef.current.push({ name: variantName, qty: newQty, merged: true, oldPrice: exact.sell_price, newPrice: newSell });
        } else {
          await createItem({
            ...form,
            frame_color: variant.color,
            rg_power:    variant.rg_power || form.rg_power,
            name:        variantName,
            image_url:   variant.image||imgData||null,
            sell_price:  newSell,
            cost_price:  newCost,
            quantity:    newQty,
            min_quantity:parseInt(form.min_quantity)||2,
          });
          mergeLogRef.current.push({ name: variantName, qty: newQty, merged: false });
        }
      }
      setShowAdd(false);
      setForm(defaults(addCat));
      setImgData(null);
      setColorVariants([{ color:'Black', qty:'1', image:null }]);
      setDupMatches([]);
      load();
      // Show merge summary if any merges happened
      const results = []; // mergeResult populated during loop above
      mergeLogRef.current = [];
    } catch(e) {
      alert('Save failed: ' + (e.message||'Unknown error'));
    } finally {
      setAddSaving(false);
    }
  };

  const handleSavePanel = async (local) => {
    await updateItem(local.id, {
      name:           local.name,
      brand:          local.brand,
      dealer:         local.dealer,
      category:       local.category,
      frame_color:    local.frame_color,
      frame_type:     local.frame_type,
      frame_shape:    local.frame_shape,
      frame_material: local.frame_material,
      frame_size:     local.frame_size,
      sg_type:        local.sg_type,
      rg_power:       local.rg_power,
      sell_price:     parseFloat(local.sell_price)||0,
      cost_price:     parseFloat(local.cost_price)||0,
      min_quantity:   parseInt(local.min_quantity)||2,
      display_number: local.display_number ? parseInt(local.display_number) : null,
      stock_number:   local.stock_number   ? parseInt(local.stock_number)   : null,
    });
    load(); setSelected(null);
  };

  const handleDelete = async (id) => {
    if(!window.confirm('Remove this item?')) return;
    await deleteItem(id); setSelected(null); load();
  };

  // Handle QR scan — find item by id and open panel
  const handleQRScan = async (scannedId) => {
    setShowScanner(false);
    const id = parseInt(scannedId);
    if (!id) return alert('Invalid QR code');
    // Try to find in current items list first
    let found = items.find(i => i.id === id);
    if (!found) {
      // Fetch from API
      try {
        const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('ko_token');
        const res   = await fetch(`${BASE}/inventory/${id}`, { headers:{ Authorization:`Bearer ${token}` } });
        found = await res.json();
      } catch(e) { alert('Item not found'); return; }
    }
    if (found?.id) {
      setScanResult(found);
      setPanelTab('details');
      loadFullItem(found);
    } else {
      alert('Item not found in inventory');
    }
  };

  // Load full item (with image) when panel opens
  const loadFullItem = async (item) => {
    setSelected(item); // show panel immediately with no image
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/inventory/${item.id}`, { headers:{ Authorization:`Bearer ${token}` } });
      const full  = await res.json();
      setSelected(full); // update with full data including image
    } catch(e) { /* non-critical — panel still works without image */ }
  };

  const handlePanelImg = async (e) => {
    const f=e.target.files[0]; if(!f||!selected) return;
    const b64=await toBase64(f);
    await updateItem(selected.id,{image_url:b64});
    setSelected(s=>({...s,image_url:b64})); load();
  };

  // Called by AdjustmentPanel when qty changes — refresh both list + panel
  const handleAdjDone = (newQty) => {
    setSelected(s => s ? {...s, quantity:newQty} : s);
    load();
  };

  const low = items.filter(i=>i.quantity>0&&i.quantity<=i.min_quantity).length;
  const out = items.filter(i=>i.quantity===0).length;
  const val = items.reduce((s,i)=>s+(parseFloat(i.cost_price||0)*i.quantity),0);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>📦 Inventory</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Frames, sunglasses, accessories and supplies</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>setShowScanner(true)}
            style={{ padding:'9px 16px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.navy }}>
            📷 Scan QR
          </button>
          <button onClick={()=>{ setStickerItems(items); setShowStickers(true); }}
            style={{ padding:'9px 16px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
            🏷️ Print All Stickers
          </button>
          <button onClick={()=>{ setPriceUpdateItems(items.filter(i=>['Sunglasses','Frames','Reading Glasses'].includes(i.category))); setShowPriceUpdate(true); }}
            style={{ padding:'9px 16px', background:'#fef9c3', border:`1.5px solid #fde68a`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'#92400e' }}>
            💰 Update Prices
          </button>
          <button onClick={()=>{ setShowAIScan(true); setAiStep('front'); setAiPhotos({front:null,arm:null,tag:null}); setAiResult(null); }}
            style={{ padding:'9px 16px', background:'#7c3aed', color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            🤖 AI Photo Add
          </button>
          {/* Phone photo button — starts session so phone can push photo to PC */}
          <button onClick={async ()=>{
            const sid = await startPCPhotoSession();
            if (!sid) return alert('Failed to start session');
          }}
            style={{ padding:'9px 16px', background:pcPolling?'#dcfce7':pcSessionId==='done'?'#dcfce7':'#0f1f3d',
              color:pcPolling?'#166534':pcSessionId==='done'?'#166534':'#c9a84c',
              border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
              display:'flex', alignItems:'center', gap:6 }}>
            {pcSessionId==='done' ? '✅ Photo received!' : pcPolling ? '⏳ Waiting for phone...' : '📱 Add from Phone'}
          </button>
          <button onClick={()=>{ if(showAdd){ setShowAdd(false); setImgData(null); setAddCat(''); setAddStep('category'); } else { setAddStep('category'); setImgData(null); setAddCat(''); setShowAdd(true); } }}
            style={{ padding:'9px 20px', background:showAdd?C.cream:C.gold, color:showAdd?C.muted:C.navy, border:showAdd?`1.5px solid ${C.border}`:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            {showAdd?'✕ Cancel':'+ Add Item'}
          </button>
        </div>
      </div>

      {/* Phone photo session status banner */}
      {pcPolling && (() => {
        const BASE_ = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const phoneUrl = `${BASE_.replace('/api','')}/api/scan-session/photo-session/${pcSessionId}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(phoneUrl)}`;
        return (
        <div style={{ background:'#eff6ff', border:'1.5px solid #93c5fd', borderRadius:12, padding:'16px',
          marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
            <img src={qrUrl} alt="QR" style={{ width:100, height:100, borderRadius:8, border:'2px solid #93c5fd', flexShrink:0 }}/>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:'#3b82f6' }}/>
                <div style={{ fontSize:14, fontWeight:700, color:'#1e40af' }}>Waiting for photo from phone...</div>
              </div>
              <div style={{ fontSize:12, color:'#374151', marginBottom:8, lineHeight:1.5 }}>
                <b>1.</b> Open your phone camera → scan QR code<br/>
                <b>2.</b> Select category (Frames / Sunglasses / Reading Glasses)<br/>
                <b>3.</b> Tap Take Photo → send → photo appears here
              </div>
              <div style={{ fontSize:10, color:'#6b7280', wordBreak:'break-all', background:'white', padding:'4px 8px', borderRadius:6, marginBottom:8 }}>
                {phoneUrl}
              </div>
              <button onClick={()=>{ setPcPolling(false); setPcSessionId(null); clearInterval(pollIntervalRef.current); }}
                style={{ padding:'6px 12px', background:'white', border:'1px solid #93c5fd', borderRadius:8,
                  fontSize:12, cursor:'pointer', fontFamily:'inherit', color:'#1e40af' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
        );
      })()}
      <style>{'.pcPulse,@keyframes pcPulse{0%,100%{opacity:1}50%{opacity:.2}}'}</style>

      {/* Stats + Category Counts */}
      {(() => {
        // Compute counts per category and sub-type
        const allItems = items.filter(i => i.category !== 'Old Stock');
        const frames   = allItems.filter(i => i.category === 'Frames');
        const sg       = allItems.filter(i => i.category === 'Sunglasses');
        const rg       = allItems.filter(i => i.category === 'Reading Glasses');
        const rgSV     = rg.filter(i => (i.rg_lens_type||'').toLowerCase().includes('single'));
        const rgBifocal= rg.filter(i => (i.rg_lens_type||'').toLowerCase().includes('bifocal'));
        const accs     = allItems.filter(i => !['Frames','Sunglasses','Reading Glasses'].includes(i.category));
        const polarised= sg.filter(i => i.sg_type === 'Polarised');
        const local    = sg.filter(i => i.sg_type === 'Local');
        const fullRim  = frames.filter(i => i.frame_type === 'Full rim');
        const halfRim  = frames.filter(i => i.frame_type === 'Half rim');
        const rimless  = frames.filter(i => i.frame_type === 'Rimless');
        const totalQty = (arr) => arr.reduce((s,i) => s + (parseInt(i.quantity)||0), 0);

        const cats = [
          { label:'All Items',      count:allItems.length,   qty:totalQty(allItems),   dark:true,             cat:null,           sub:null },
          { label:'Frames',         count:frames.length,     qty:totalQty(frames),     c:'#1e40af', bg:'#dbeafe', cat:'Frames',   sub:null },
          { label:'↳ Full Rim',     count:fullRim.length,    qty:totalQty(fullRim),    c:'#1e40af', bg:'#eff6ff', cat:'Frames',   sub:'Full rim', indent:true },
          { label:'↳ Half Rim',     count:halfRim.length,    qty:totalQty(halfRim),    c:'#1e40af', bg:'#eff6ff', cat:'Frames',   sub:'Half rim', indent:true },
          { label:'↳ Rimless',      count:rimless.length,    qty:totalQty(rimless),    c:'#1e40af', bg:'#eff6ff', cat:'Frames',   sub:'Rimless',  indent:true },
          { label:'Sunglasses',     count:sg.length,         qty:totalQty(sg),         c:'#92400e', bg:'#fef3c7', cat:'Sunglasses', sub:null },
          { label:'↳ Polarised',    count:polarised.length,  qty:totalQty(polarised),  c:'#92400e', bg:'#fffbeb', cat:'Sunglasses', sub:'Polarised', indent:true },
          { label:'↳ Local',        count:local.length,      qty:totalQty(local),      c:'#92400e', bg:'#fffbeb', cat:'Sunglasses', sub:'Local',     indent:true },
          { label:'Reading Glasses',count:rg.length,         qty:totalQty(rg),         c:'#166534', bg:'#dcfce7', cat:'Reading Glasses', sub:null },
          { label:'↳ Single Vision', count:rgSV.length,      qty:totalQty(rgSV),      c:'#166534', bg:'#f0fdf4', cat:'Reading Glasses', sub:'Single Vision', indent:true },
          { label:'↳ Bifocal',       count:rgBifocal.length, qty:totalQty(rgBifocal), c:'#166534', bg:'#f0fdf4', cat:'Reading Glasses', sub:'Bifocal',        indent:true },
          { label:'Accessories',    count:accs.length,       qty:totalQty(accs),       c:'#6b21a8', bg:'#f5f3ff', cat:null,          sub:'accs' },
        ];

        return (
          <div style={{ marginBottom:20 }}>
            {/* Top row — summary cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:12 }}>
              {[
                { l:'Total Items',       v:allItems.length,                    dark:true },
                { l:'Low Stock',         v:low,                                c:C.danger },
                { l:'Out of Stock',      v:out,                                c:'#9ca3af' },
                { l:'Stock Value',       v:`Rs.${Math.round(val/1000)}K`,      c:C.success },
              ].map(s=>(
                <div key={s.l} style={{ background:s.dark?C.navy:'white', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:s.dark?C.gold:C.muted, marginBottom:4 }}>{s.l}</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:s.dark?'white':(s.c||C.navy) }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Category count chips — click to filter */}
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 16px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>
                Stock Count by Category — click to filter
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {cats.map((cat,i) => {
                  const isActive = cat.dark
                    ? activeCat==='All' && !subFilter
                    : cat.sub==='accs'
                      ? ['Boxes','Sunglass Pouches','Glass Cleaner','Chains','Ear Tips'].includes(activeCat)
                      : cat.indent
                        ? activeCat===cat.cat && subFilter===cat.sub
                        : activeCat===(cat.cat||'All') && !subFilter;
                  return (
                    <button key={i} onClick={()=>{
                      if (cat.dark) { setActiveCat('All'); setSubFilter(''); }
                      else if (cat.sub==='accs') { setActiveCat('Boxes'); setSubFilter(''); }
                      else if (cat.indent) { setActiveCat(cat.cat); setSubFilter(cat.sub); }
                      else { setActiveCat(cat.cat||'All'); setSubFilter(''); }
                    }} style={{
                      padding: cat.indent ? '4px 10px 4px 18px' : '5px 12px',
                      borderRadius:20,
                      fontSize: cat.indent ? 11 : 12,
                      fontWeight: isActive ? 700 : 500,
                      cursor:'pointer',
                      fontFamily:'inherit',
                      border:`1.5px solid ${isActive ? (cat.dark?C.navy:cat.c) : C.border}`,
                      background: isActive ? (cat.dark?C.navy:cat.bg) : 'white',
                      color: isActive ? (cat.dark?'white':cat.c) : C.muted,
                      display:'flex', alignItems:'center', gap:6,
                    }}>
                      <span>{cat.label}</span>
                      <span style={{
                        background: isActive ? 'rgba(255,255,255,0.3)' : '#f3f4f6',
                        color: isActive ? (cat.dark?'white':cat.c) : C.navy,
                        borderRadius:10, padding:'0 6px', fontSize:10, fontWeight:700,
                      }}>{cat.qty}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── ADD ITEM WIZARD ─────────────────────────────────── */}
      {showAdd && (
        <div style={{ background:'white', border:`2px solid ${C.gold}`, borderRadius:14, marginBottom:16, overflow:'hidden' }}>

          {/* Wizard header */}
          <div style={{ background:C.navy, padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:'white' }}>
              {addStep==='category' ? '➕ Add New Item — Choose Category' : `➕ Add ${addCat}`}
            </div>
            <button onClick={()=>{ setShowAdd(false); setImgData(null); setAddCat(''); setAddStep('category'); setForm(defaults('Frames')); setColorVariants([{color:'Black',qty:'1',image:null}]); }}
              style={{ background:'rgba(255,255,255,.15)', border:'none', color:'white', borderRadius:8, padding:'4px 12px', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              ✕ Cancel
            </button>
          </div>

          {addStep === 'category' && (
            <div style={{ padding:24 }}>
              {/* Photo area */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>
                  {imgData ? '✓ Photo ready' : 'Add Photo (optional)'}
                </div>
                <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                  {imgData && (
                    <div style={{ width:120, height:100, border:`2px solid ${C.gold}`, borderRadius:10, overflow:'hidden', flexShrink:0 }}>
                      <img src={imgData} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    </div>
                  )}
                  <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    width:100, height:90, border:`2px dashed ${imgData?C.gold:C.border}`, borderRadius:10,
                    cursor:'pointer', background:imgData?'#fdf9f0':C.cream, gap:6, position:'relative', flexShrink:0 }}>
                    <span style={{ fontSize:28 }}>📷</span>
                    <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{imgData ? 'Change Photo' : 'Take/Upload'}</span>
                    <input type="file" accept="image/*" capture="environment"
                      style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }}
                      onChange={handleImgPick}/>
                  </label>
                  {imgData && (
                    <button onClick={()=>setImgData(null)}
                      style={{ padding:'6px 12px', background:'#fee2e2', color:C.danger, border:'none', borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                      ✕ Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Category grid */}
              <div style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>
                Select Category *
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {[
                  { cat:'Frames',          icon:'🕶️',  color:'#0f1f3d' },
                  { cat:'Sunglasses',       icon:'😎',  color:'#0891b2' },
                  { cat:'Reading Glasses',  icon:'👓',  color:'#7c3aed' },
                  { cat:'Boxes',            icon:'📦',  color:'#b45309' },
                  { cat:'Sunglass Pouches', icon:'👜',  color:'#be185d' },
                  { cat:'Glass Cleaner',    icon:'🧴',  color:'#166534' },
                  { cat:'Chains',           icon:'⛓️',  color:'#6b7280' },
                  { cat:'Ear Tips',         icon:'🔧',  color:'#92400e' },
                ].map(({cat, icon, color}) => (
                  <button key={cat} onClick={()=>{
                    setAddCat(cat);
                    setForm(defaults(cat));
                    setColorVariants([{color:'Black',qty:'1',image:null}]);
                    setPowerVariants(RG_POWERS.map(p=>({power:p,qty:'0'})));
                    setAddStep('form');
                  }}
                    style={{ padding:'14px 10px', borderRadius:12, border:`2px solid ${C.border}`,
                      background:'white', cursor:'pointer', fontFamily:'inherit',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                      transition:'all .15s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.border=`2px solid ${color}`; e.currentTarget.style.background='#f8f5ef'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.border=`2px solid ${C.border}`; e.currentTarget.style.background='white'; }}>
                    <span style={{ fontSize:28 }}>{icon}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:C.navy, textAlign:'center', lineHeight:1.3 }}>{cat}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {addStep === 'form' && (
            <div data-add-form style={{ padding:24 }}>
              {/* Photo + category summary bar */}
              <div style={{ display:'flex', gap:12, alignItems:'center', background:C.cream, borderRadius:10, padding:'10px 14px', marginBottom:20 }}>
                {imgData
                  ? <img src={imgData} style={{ width:60, height:50, objectFit:'cover', borderRadius:8, border:`2px solid ${C.gold}`, flexShrink:0 }} alt=""/>
                  : <div style={{ width:60, height:50, background:'#e0ddd6', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>📷</div>
                }
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{CAT_ICON[addCat]} {addCat}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                    {imgData ? '✓ Photo ready' : 'No photo — you can add one below'}
                  </div>
                </div>
                <button onClick={()=>{ setAddStep('category'); }}
                  style={{ padding:'5px 12px', background:'white', border:`1px solid ${C.border}`, borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted, flexShrink:0 }}>
                  ← Change
                </button>
                {!imgData && (
                  <label style={{ padding:'5px 12px', background:C.navy, border:'none', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.gold, flexShrink:0, position:'relative' }}>
                    📷 Add Photo
                    <input type="file" accept="image/*" capture="environment"
                      style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }}
                      onChange={handleImgPick}/>
                  </label>
                )}
              </div>

              {/* Duplicate warning */}
              {dupMatches.length>0 && (
                <div style={{ background:'#fef9c3', border:'1.5px solid #fde68a', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#92400e', marginBottom:6 }}>⚠️ Similar items already exist:</div>
                  {dupMatches.slice(0,3).map((m,i)=>(
                    <div key={i} style={{ fontSize:11, color:'#92400e' }}>• {m.name} ({m.category}) — {m.quantity} in stock</div>
                  ))}
                </div>
              )}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <CategoryFields form={form} set={setForm} suggestions={suggestions}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginTop:4 }}>
                <Field label="Cost Price (Rs.)"><input type="number" value={form.cost_price||''} onChange={e=>setForm(f=>({...f,cost_price:e.target.value}))} placeholder="Buy price" style={INP}/></Field>
                <Field label="Sell Price (Rs.)"><input type="number" value={form.sell_price||''} onChange={e=>setForm(f=>({...f,sell_price:e.target.value}))} placeholder="Sell price" style={INP}/></Field>
                <Field label="Quantity"><input type="number" value={form.quantity||''} onChange={e=>{ const v=e.target.value; setForm(f=>({...f,quantity:v})); if(addCat==='Frames'||addCat==='Sunglasses') setColorVariants(cv=>cv.map((c,i)=>i===0?{...c,qty:v}:c)); }} placeholder="0" style={INP}/></Field>
                <Field label="Min Alert"><input type="number" value={form.min_quantity||''} onChange={e=>setForm(f=>({...f,min_quantity:e.target.value}))} placeholder="e.g. 2" style={INP}/></Field>
              </div>

              {/* Variants */}
              {(addCat==='Frames'||addCat==='Sunglasses') && (
                <div style={{ marginTop:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Colour Variants</div>
                  {colorVariants.map((v,i)=>(
                    <div key={i} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                      <input value={v.color} onChange={e=>setColorVariants(cv=>cv.map((x,j)=>j===i?{...x,color:e.target.value}:x))} placeholder="Color" style={{ ...INP, flex:2 }}/>
                      <input type="number" value={v.qty} onChange={e=>setColorVariants(cv=>cv.map((x,j)=>j===i?{...x,qty:e.target.value}:x))} placeholder="Qty" style={{ ...INP, flex:1 }}/>
                      {colorVariants.length>1 && <button onClick={()=>setColorVariants(cv=>cv.filter((_,j)=>j!==i))} style={{ background:'#fee2e2', color:C.danger, border:'none', borderRadius:7, padding:'6px 10px', cursor:'pointer', fontFamily:'inherit' }}>✕</button>}
                    </div>
                  ))}
                  <button onClick={()=>setColorVariants(cv=>[...cv,{color:'',qty:'1',image:null}])}
                    style={{ fontSize:12, fontWeight:600, color:'#1e40af', background:'#eff6ff', border:'1px solid #bae6fd', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontFamily:'inherit', marginTop:4 }}>
                    + Add Color
                  </button>
                </div>
              )}

              {addCat==='Reading Glasses' && (
                <div style={{ marginTop:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Powers & Quantities</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                    {powerVariants.map((v,i)=>(
                      <div key={i} style={{ background:C.cream, borderRadius:8, padding:'6px 8px', textAlign:'center' }}>
                        <div style={{ fontSize:10, fontWeight:700, color:C.muted, marginBottom:3 }}>{v.power}</div>
                        <input type="number" value={v.qty} onChange={e=>setPowerVariants(pv=>pv.map((x,j)=>j===i?{...x,qty:e.target.value}:x))} placeholder="0" style={{ width:'100%', padding:'4px 6px', border:`1px solid ${C.border}`, borderRadius:6, fontSize:12, textAlign:'center', fontFamily:'inherit', outline:'none' }}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display:'flex', gap:10, marginTop:20 }}>
                <button onClick={handleAddSave} disabled={addSaving}
                  style={{ flex:1, padding:'12px', background:addSaving?C.muted:C.navy, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:addSaving?'not-allowed':'pointer', fontFamily:'inherit' }}>
                  {addSaving ? '⏳ Saving...' : `💾 Save ${addCat}`}
                </button>
                <button onClick={()=>{ setShowAdd(false); setImgData(null); setAddCat(''); setAddStep('category'); setForm(defaults('Frames')); setColorVariants([{color:'Black',qty:'1',image:null}]); }}
                  style={{ padding:'12px 20px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
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

      {/* Bulk reorder banner — shows when low/out stock items exist */}
      {!loading && items.filter(i=>i.quantity<=i.min_quantity).length > 0 && (
        <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:12, padding:'12px 16px', marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#166534', marginBottom:2 }}>
                📦 {items.filter(i=>i.quantity===0).length} out of stock · {items.filter(i=>i.quantity>0&&i.quantity<=i.min_quantity).length} low stock
              </div>
              <div style={{ fontSize:12, color:'#166534' }}>Send all low/out stock items to dealers via WhatsApp</div>
            </div>
            <a href={(() => {
              const msg = 'Hi, I need to reorder the following items:\n\n' +
                items.filter(i=>i.quantity<=i.min_quantity && i.dealer)
                  .map((i,idx) => (idx+1) + '. ' + i.name + (i.brand ? ' (' + i.brand + ')' : '') + ' - Stock: ' + i.quantity + ' - Dealer: ' + i.dealer)
                  .join('\n') +
                '\n\nKindly confirm availability. Thank you!\nWickramakalutota Opticals, Chilaw';
              return 'https://wa.me/?text=' + encodeURIComponent(msg);
            })()}
              target="_blank" rel="noreferrer"
              style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'9px 18px', background:'#25D366', color:'white', borderRadius:9, fontSize:13, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
              💬 WhatsApp Reorder All
            </a>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? <p style={{ color:C.muted, fontSize:13 }}>Loading...</p>
        : !items.length
          ? <div style={{ textAlign:'center', padding:'48px 20px', color:C.muted }}><div style={{ fontSize:40, marginBottom:12 }}>📦</div><div style={{ fontSize:14, fontWeight:600 }}>No items yet</div></div>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))', gap:14 }}>
              {items.filter(item=>{
                // Hide Old Stock in All tab — only show when Old Stock tab is active
                if (activeCat==='All' && item.category==='Old Stock') return false;
                if (!subFilter) return true;
                if (activeCat==='Sunglasses') {
                  if (subFilter==='RayBan') return (item.brand||'').toLowerCase().includes('rayban');
                  return item.sg_type===subFilter;
                }
                if (activeCat==='Frames') return item.frame_type===subFilter;
                if (activeCat==='Reading Glasses') {
                  if (!subFilter) return true;
                  return (item.rg_lens_type||'').toLowerCase().includes(subFilter.toLowerCase());
                }
                return true;
              }).map(item=>(
                <ItemCard key={item.id} item={item}
                  onClick={()=>{ setPanelTab('details'); loadFullItem(item); }}
                  onSticker={i=>{ setStickerItems([i]); setShowStickers(true); }}
                />
              ))}
            </div>
      }

      {/* ── DETAIL PANEL ── */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.45)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}
          onClick={e=>{ if(e.target===e.currentTarget) setSelected(null); }}>
          <div style={{ background:'white', width:'100%', maxWidth:480, height:'100vh', overflowY:'auto', boxShadow:'-8px 0 40px rgba(0,0,0,.18)' }}>

            {/* Photo */}
            <div style={{ height:selected.image_url?'auto':'160px', maxHeight:320, background:C.cream, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
              {selected.image_url
                ? <img src={selected.image_url} alt={selected.name}
                    onClick={()=>setShowFullImg(true)}
                    style={{ width:'100%', height:'auto', objectFit:'contain', display:'block', cursor:'zoom-in' }}/>
                : <div style={{ fontSize:52, opacity:.2, height:160, display:'flex', alignItems:'center', justifyContent:'center', width:'100%' }}>{CAT_ICON[selected.category]||'📦'}</div>
              }
              <label style={{ position:'absolute', bottom:10, right:10, background:'rgba(15,31,61,.75)', color:'white', borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:600, cursor:'pointer', zIndex:2 }}>
                📷 Change Photo
                <input type="file" accept="image/*" onChange={handlePanelImg} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }}/>
              </label>
              <button onClick={()=>setSelected(null)} style={{ position:'absolute', top:12, right:12, background:'rgba(0,0,0,.5)', border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600, color:'white' }}>✕</button>
            </div>

            {/* Name + tabs */}
            <div style={{ padding:'16px 22px 0' }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:C.navy, marginBottom:2 }}>{selected.name}</div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>{selected.category}</div>

              {/* Stock qty badge */}
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:selected.quantity===0?'#f3f4f6':selected.quantity<=selected.min_quantity?'#fee2e2':'#dcfce7', borderRadius:20, padding:'5px 14px', marginBottom:14 }}>
                <span style={{ fontSize:16, fontWeight:700, color:selected.quantity===0?'#6b7280':selected.quantity<=selected.min_quantity?C.danger:C.success }}>{selected.quantity}</span>
                <span style={{ fontSize:12, color:C.muted }}>in stock</span>
                {selected.quantity===0 && <span style={{ fontSize:11, color:'#6b7280', fontWeight:600 }}>• Out of stock</span>}
                {selected.quantity>0&&selected.quantity<=selected.min_quantity && <span style={{ fontSize:11, color:C.danger, fontWeight:600 }}>• Low stock</span>}
              </div>
              {selected.updated_at && (
                <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
                  Last updated: <b>{new Date(selected.updated_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</b>
                  {' at '}<b>{new Date(selected.updated_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</b>
                  {' · Added: '}<b>{new Date(selected.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</b>
                </div>
              )}

              {/* Quick Reorder button — shows when low or out of stock */}
              {(selected.quantity===0 || selected.quantity<=selected.min_quantity) && selected.dealer && (
                <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, padding:'11px 14px', marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#166534', marginBottom:8 }}>
                    📦 Low stock — reorder from {selected.dealer}?
                  </div>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Hi, I need to reorder the following item from Wickramakalutota Opticals:

` +
                      `Item: ${selected.name}
` +
                      `Brand: ${selected.brand||'—'}
` +
                      `Category: ${selected.category}
` +
                      `Current stock: ${selected.quantity} (minimum: ${selected.min_quantity})
` +
                      `Qty needed: ${Math.max(selected.min_quantity*2, 5)}

` +
                      `Please let us know your availability and price. Thank you!`
                    )}`}
                    target="_blank" rel="noreferrer"
                    style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 16px', background:'#25D366', color:'white', borderRadius:8, fontSize:13, fontWeight:700, textDecoration:'none' }}>
                    💬 WhatsApp Reorder Message
                  </a>
                  <div style={{ fontSize:11, color:'#166534', marginTop:6 }}>
                    Opens WhatsApp with item details pre-filled · Dealer: {selected.dealer}
                  </div>
                </div>
              )}

              {/* Panel tabs */}
              <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, margin:'0 -22px', padding:'0 22px' }}>
                {[
                  { key:'details',    label:'📋 Details'    },
                  { key:'adjust',     label:'📦 Adjust Stock'},
                  { key:'variant',    label:'🎨 Add Colour'  },
                ].map(t=>(
                  <button key={t.key} onClick={()=>setPanelTab(t.key)}
                    style={{ padding:'10px 14px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', color:panelTab===t.key?C.navy:C.muted, borderBottom:`2.5px solid ${panelTab===t.key?C.gold:'transparent'}`, marginBottom:-1 }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding:'20px 22px' }}>

              {/* ── DETAILS TAB ── */}
              {panelTab==='details' && (
                <>
                  {/* ── Identity ── */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:8, paddingBottom:5, borderBottom:`1px solid ${C.cream}` }}>Identity</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      <Field label="Item Name"><input value={selected.name||''} onChange={e=>setSelected(s=>({...s,name:e.target.value}))} style={INP}/></Field>
                      <Field label="Brand"><input value={selected.brand||''} onChange={e=>setSelected(s=>({...s,brand:e.target.value}))} style={INP}/></Field>
                      <Field label="Category">
                        <select value={selected.category||''} onChange={e=>setSelected(s=>({...s,category:e.target.value}))} style={{...INP,cursor:'pointer'}}>
                          {CATS.map(cat=><option key={cat}>{cat}</option>)}
                        </select>
                      </Field>
                      <Field label="Dealer"><input value={selected.dealer||''} onChange={e=>setSelected(s=>({...s,dealer:e.target.value}))} style={INP}/></Field>
                    </div>
                  </div>
                  {/* ── Frame details ── */}
                  {['Frames','Sunglasses','Reading Glasses'].includes(selected.category) && (
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:8, paddingBottom:5, borderBottom:`1px solid ${C.cream}` }}>Frame Details</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                        <Field label="Color">
                          <select value={selected.frame_color||''} onChange={e=>setSelected(s=>({...s,frame_color:e.target.value}))} style={{...INP,cursor:'pointer'}}>
                            {FR_COLORS.map(c=><option key={c}>{c}</option>)}
                          </select>
                        </Field>
                        <Field label="Type">
                          <select value={selected.frame_type||''} onChange={e=>setSelected(s=>({...s,frame_type:e.target.value}))} style={{...INP,cursor:'pointer'}}>
                            <option value="">—</option>
                            {FR_TYPES.map(t=><option key={t}>{t}</option>)}
                          </select>
                        </Field>
                        <Field label="Shape">
                          <select value={selected.frame_shape||''} onChange={e=>setSelected(s=>({...s,frame_shape:e.target.value}))} style={{...INP,cursor:'pointer'}}>
                            <option value="">—</option>
                            {FR_SHAPES.map(t=><option key={t}>{t}</option>)}
                          </select>
                        </Field>
                        <Field label="Material">
                          <select value={selected.frame_material||''} onChange={e=>setSelected(s=>({...s,frame_material:e.target.value}))} style={{...INP,cursor:'pointer'}}>
                            <option value="">—</option>
                            {FR_MATS.map(t=><option key={t}>{t}</option>)}
                          </select>
                        </Field>
                        <Field label="Size">
                          <select value={selected.frame_size||''} onChange={e=>setSelected(s=>({...s,frame_size:e.target.value}))} style={{...INP,cursor:'pointer'}}>
                            <option value="">—</option>
                            {FR_SIZES.map(t=><option key={t}>{t}</option>)}
                          </select>
                        </Field>
                        {selected.category==='Sunglasses' && (
                          <Field label="SG Type">
                            <select value={selected.sg_type||''} onChange={e=>setSelected(s=>({...s,sg_type:e.target.value}))} style={{...INP,cursor:'pointer'}}>
                              <option value="">—</option>
                              {SG_TYPES.map(t=><option key={t}>{t}</option>)}
                            </select>
                          </Field>
                        )}
                        {selected.category==='Reading Glasses' && (
                          <Field label="Power">
                            <select value={selected.rg_power||''} onChange={e=>setSelected(s=>({...s,rg_power:e.target.value}))} style={{...INP,cursor:'pointer'}}>
                              <option value="">—</option>
                              {RG_POWERS.map(t=><option key={t}>{t}</option>)}
                            </select>
                          </Field>
                        )}
                      </div>
                    </div>
                  )}
                  {/* ── Pricing ── */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:8, paddingBottom:5, borderBottom:`1px solid ${C.cream}` }}>Pricing & Stock</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      <Field label="Cost Price (Rs.)"><input type="number" value={selected.cost_price||''} onChange={e=>setSelected(s=>({...s,cost_price:e.target.value}))} style={INP}/></Field>
                      <Field label="Sell Price (Rs.)"><input type="number" value={selected.sell_price||''} onChange={e=>setSelected(s=>({...s,sell_price:e.target.value}))} style={INP}/></Field>
                      <Field label="Min Alert Qty"><input type="number" value={selected.min_quantity||''} onChange={e=>setSelected(s=>({...s,min_quantity:e.target.value}))} style={INP}/></Field>
                    </div>

                    {/* Display & Stock numbers */}
                    <div style={{ marginTop:12, background:'#eff6ff', borderRadius:10, padding:'12px 14px' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:C.navy, marginBottom:10 }}>📍 Location Numbers</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div>
                          <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#1e40af', display:'block', marginBottom:5 }}>🏪 Showroom Slot #</label>
                          <input type="number" min="1" value={selected.display_number||''} onChange={e=>setSelected(s=>({...s,display_number:e.target.value||null}))}
                            placeholder="e.g. 1, 2, 3..."
                            style={{ ...INP, fontWeight:700, fontSize:16, textAlign:'center', background:'#dbeafe', border:'1.5px solid #93c5fd' }}/>
                          <div style={{ fontSize:10, color:'#1e40af', marginTop:3 }}>Position on display stand</div>
                        </div>
                        <div>
                          <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#7c3aed', display:'block', marginBottom:5 }}>📦 Stock Box #</label>
                          <input type="number" min="1" value={selected.stock_number||''} onChange={e=>setSelected(s=>({...s,stock_number:e.target.value||null}))}
                            placeholder="e.g. 1, 2, 3..."
                            style={{ ...INP, fontWeight:700, fontSize:16, textAlign:'center', background:'#f5f3ff', border:'1.5px solid #c4b5fd' }}/>
                          <div style={{ fontSize:10, color:'#7c3aed', marginTop:3 }}>Position in storage box</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ background:C.cream, borderRadius:9, padding:'9px 14px', marginTop:8, display:'flex', gap:20, fontSize:13 }}>
                      <span>Profit: <b style={{color:C.success}}>Rs.{(parseFloat(selected.sell_price||0)-parseFloat(selected.cost_price||0)).toLocaleString()}</b></span>
                      <span>Margin: <b>{parseFloat(selected.sell_price)>0?Math.round((parseFloat(selected.sell_price)-parseFloat(selected.cost_price))/parseFloat(selected.sell_price)*100):0}%</b></span>
                    </div>
                  </div>
                  {/* ── Actions ── */}
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button onClick={()=>handleSavePanel(selected)} style={{ padding:'10px 18px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>💾 Save All</button>
                    <button onClick={()=>{ setStickerItems([selected]); setShowStickers(true); }} style={{ padding:'10px 16px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.navy }}>🏷️ Sticker</button>
                    <button onClick={()=>{ setPriceUpdateItems([selected]); setShowPriceUpdate(true); }} style={{ padding:'10px 16px', background:'#fef9c3', border:`1.5px solid #fde68a`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'#92400e' }}>💰 Price Label</button>
                    <button onClick={()=>setPanelTab('adjust')} style={{ padding:'10px 16px', background:'#eff6ff', border:`1.5px solid #bae6fd`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'#0369a1' }}>📦 Adjust Stock</button>
                    <button onClick={()=>handleDelete(selected.id)} style={{ padding:'10px 14px', background:'#fee2e2', color:C.danger, border:`1.5px solid #fca5a5`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto' }}>🗑️</button>
                  </div>
                </>
              )}

              {/* ── ADJUST STOCK TAB ── */}
              {panelTab==='adjust' && (
                <AdjustmentPanel item={selected} onDone={handleAdjDone}/>
              )}

              {/* ── ADD COLOUR VARIANT TAB ── */}
              {panelTab==='variant' && (
                <AddVariantPanel item={selected} items={items} onDone={()=>{ load(); setPanelTab('details'); }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen image lightbox */}
      {showFullImg && selected?.image_url && (
        <div onClick={()=>setShowFullImg(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.92)', zIndex:2000,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            cursor:'zoom-out', padding:20 }}>
          <button onClick={()=>setShowFullImg(false)}
            style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,.15)',
              border:'none', borderRadius:8, padding:'6px 14px', color:'white', fontSize:14,
              fontWeight:600, cursor:'pointer', fontFamily:'inherit', zIndex:1 }}>
            ✕ Close
          </button>
          <img src={selected.image_url} alt={selected.name}
            onClick={e=>e.stopPropagation()}
            style={{ maxWidth:'90vw', maxHeight:'75vh', objectFit:'contain', borderRadius:12,
              boxShadow:'0 8px 40px rgba(0,0,0,.6)' }}/>
          <div style={{ marginTop:20, textAlign:'center' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:'white', marginBottom:6 }}>
              {selected.name}
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.6)', marginBottom:4 }}>
              {selected.category} · {selected.brand||''}
              {selected.frame_color ? ` · ${selected.frame_color}` : ''}
              {selected.frame_size  ? ` · ${selected.frame_size}`  : ''}
            </div>
            <div style={{ display:'flex', gap:20, justifyContent:'center', marginTop:10 }}>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:12 }}>
                Cost: <b style={{ color:'white' }}>Rs.{parseFloat(selected.cost_price||0).toLocaleString()}</b>
              </div>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:12 }}>
                Sell: <b style={{ color:'#c9a84c', fontSize:15 }}>Rs.{parseFloat(selected.sell_price||0).toLocaleString()}</b>
              </div>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:12 }}>
                Stock: <b style={{ color:'white' }}>{selected.quantity}</b>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Photo Add Modal */}
      {showAIScan && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.7)', zIndex:500,
          display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:500,
            boxShadow:'0 24px 60px rgba(0,0,0,.3)', fontFamily:"'DM Sans',sans-serif", overflow:'hidden' }}>

            {/* Header */}
            <div style={{ background:'#7c3aed', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ color:'white', fontWeight:700, fontSize:16 }}>🤖 AI Frame Scanner</div>
                <div style={{ color:'rgba(255,255,255,.7)', fontSize:12, marginTop:2 }}>
                  Take photos → AI fills the form automatically
                </div>
              </div>
              <button onClick={()=>setShowAIScan(false)}
                style={{ background:'rgba(255,255,255,.2)', border:'none', color:'white', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:13 }}>✕</button>
            </div>

            {/* Step indicator */}
            {aiStep !== 'confirm' && (
              <div style={{ display:'flex', padding:'12px 20px', gap:8, borderBottom:`1px solid ${C.border}` }}>
                {[
                  { key:'front', label:'1. Front', desc:'Frame shape & color' },
                  { key:'arm',   label:'2. Arm',   desc:'Brand & model' },
                  { key:'tag',   label:'3. Tag',   desc:'Price (optional)' },
                ].map(s=>(
                  <div key={s.key} style={{ flex:1, textAlign:'center', padding:'8px', borderRadius:8,
                    background: aiStep===s.key ? '#f5f3ff' : aiPhotos[s.key] ? '#f0fdf4' : C.cream,
                    border: `1.5px solid ${aiStep===s.key?'#7c3aed':aiPhotos[s.key]?'#86efac':C.border}` }}>
                    <div style={{ fontSize:11, fontWeight:700, color: aiStep===s.key?'#7c3aed':aiPhotos[s.key]?'#166534':C.muted }}>{s.label}</div>
                    <div style={{ fontSize:10, color:C.muted }}>{s.desc}</div>
                    {aiPhotos[s.key] && <div style={{ fontSize:10, color:'#166534', marginTop:2 }}>✓ Done</div>}
                  </div>
                ))}
              </div>
            )}

            <div style={{ padding:20 }}>
              {/* PHOTO STEPS */}
              {aiStep !== 'confirm' && (
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:4 }}>
                    {aiStep==='front' && '📸 Photo 1: Front of Frame'}
                    {aiStep==='arm'   && '📸 Photo 2: Inside of Arm'}
                    {aiStep==='tag'   && '📸 Photo 3: Price Tag'}
                  </div>
                  <div style={{ fontSize:12, color:C.muted, marginBottom:16 }}>
                    {aiStep==='front' && 'Place frame on a flat surface and take a clear photo of the front'}
                    {aiStep==='arm'   && 'Open the arm and photograph where the brand name and model number are printed'}
                    {aiStep==='tag'   && 'Take a photo of the price tag or sticker (skip if no tag)'}
                  </div>

                  {/* Preview */}
                  {aiPhotos[aiStep] && (
                    <img src={aiPhotos[aiStep]} alt="preview"
                      style={{ width:'100%', maxHeight:200, objectFit:'contain', borderRadius:10, marginBottom:12, border:`1px solid ${C.border}` }}/>
                  )}

                  {/* Camera/file input */}
                  <label style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 24px',
                    background:'#7c3aed', color:'white', borderRadius:10, cursor:'pointer', fontSize:14, fontWeight:600 }}>
                    📷 {aiPhotos[aiStep] ? 'Retake Photo' : 'Take Photo'}
                    <input type="file" accept="image/*" capture="environment" style={{ display:'none' }}
                      onChange={async e=>{
                        const f=e.target.files[0]; if(!f) return;
                        const b64 = await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(f); });
                        setAiPhotos(p=>({...p,[aiStep]:b64}));
                      }}/>
                  </label>

                  <div style={{ display:'flex', gap:10, marginTop:16 }}>
                    {aiStep !== 'front' && (
                      <button onClick={()=>setAiStep(aiStep==='arm'?'front':'arm')}
                        style={{ flex:1, padding:'10px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:9, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
                        ← Back
                      </button>
                    )}
                    <button
                      disabled={aiStep==='front'&&!aiPhotos.front || aiStep==='arm'&&!aiPhotos.arm}
                      onClick={()=>{
                        if (aiStep==='front') setAiStep('arm');
                        else if (aiStep==='arm') setAiStep('tag');
                        else analyzePhotos(); // tag step → analyze
                      }}
                      style={{ flex:1, padding:'10px', background: (aiStep==='front'&&!aiPhotos.front)||(aiStep==='arm'&&!aiPhotos.arm)?'#e5e7eb':'#7c3aed',
                        border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:'white' }}>
                      {aiStep==='tag' ? (aiLoading?'🤖 Analyzing...':'🤖 Analyze All Photos') : 'Next →'}
                    </button>
                  </div>

                  {aiStep==='tag' && (
                    <button onClick={analyzePhotos} disabled={aiLoading}
                      style={{ width:'100%', padding:'9px', background:'transparent', border:`1px dashed ${C.border}`,
                        borderRadius:8, fontSize:12, color:C.muted, cursor:'pointer', marginTop:8, fontFamily:'inherit' }}>
                      {aiLoading ? '🤖 Analyzing...' : 'Skip tag — Analyze without price'}
                    </button>
                  )}
                </div>
              )}

              {/* CONFIRM STEP */}
              {aiStep==='confirm' && aiResult && (
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:12 }}>
                    ✅ AI Analysis Complete — Review Details
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                    {[
                      { label:'Brand',    value:aiResult.brand },
                      { label:'Model',    value:aiResult.model },
                      { label:'Color',    value:aiResult.color },
                      { label:'Type',     value:aiResult.frame_type },
                      { label:'Shape',    value:aiResult.frame_shape },
                      { label:'Material', value:aiResult.frame_material },
                      { label:'Price',    value:aiResult.sell_price ? `Rs.${aiResult.sell_price}` : '—' },
                      { label:'Confidence', value:aiResult.confidence || '—' },
                    ].map(r=>(
                      <div key={r.label} style={{ background:C.cream, borderRadius:8, padding:'8px 12px' }}>
                        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase' }}>{r.label}</div>
                        <div style={{ fontSize:13, fontWeight:600, color:C.navy, marginTop:2 }}>{r.value||'—'}</div>
                      </div>
                    ))}
                  </div>
                  {aiResult.notes && (
                    <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#92400e', marginBottom:12 }}>
                      💡 {aiResult.notes}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={()=>setAiStep('front')}
                      style={{ flex:1, padding:'11px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:9, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
                      Retake Photos
                    </button>
                    <button onClick={applyAiResult}
                      style={{ flex:2, padding:'11px', background:'#7c3aed', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:'white' }}>
                      ✓ Apply & Fill Form
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* QR Scanner modal */}
      {showScanner && (
        <QRScanner
          title="Scan Frame Sticker"
          onScan={handleQRScan}
          onClose={()=>setShowScanner(false)}
        />
      )}

      {/* Sticker modal */}
      {showPriceUpdate && (
        <PriceUpdateModal items={priceUpdateItems} onClose={()=>setShowPriceUpdate(false)}/>
      )}
      {showStickers && (
        <StickerModal items={stickerItems} onClose={()=>setShowStickers(false)}/>
      )}

    </div>
  );
}