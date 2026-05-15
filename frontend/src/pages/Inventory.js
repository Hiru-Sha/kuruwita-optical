/* eslint-disable */
// ============================================================
//  Inventory.js — With stock adjustment log
//  Click any item → Adjustment tab to record stock changes
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
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


import { StickerModal } from '../components/QRStickers';

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
const FR_COLORS = ['Black','Gold','Silver','Brown','Gunmetal','Blue','Red','Pink','Tortoise','Crystal','Green','Purple','White','Multicolor'];
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
    case 'Reading Glasses': return [form.rg_lens_type, form.rg_material, form.rg_power].filter(Boolean).join(' · ');
    case 'Chains':          return [form.item_name||'Chain', form.frame_material, form.frame_color].filter(Boolean).join(' · ');
    case 'Ear Tips':        return [form.item_name||'Ear Tips', form.frame_material, form.frame_size].filter(Boolean).join(' · ');
    default: return form.item_name || form.brand || form.category;
  }
};

function CategoryFields({ form, set, suggestions }) {
  const inp = (key, placeholder) => <input value={form[key]||''} onChange={e=>set(f=>({...f,[key]:e.target.value}))} placeholder={placeholder} style={INP}/>;
  const sel = (key, options) => <select value={form[key]||''} onChange={e=>set(f=>({...f,[key]:e.target.value}))} style={SEL}>{options.map(o=><option key={o}>{o}</option>)}</select>;
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
        {item.image_url?<img src={item.image_url} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:<div style={{ fontSize:32, opacity:.35 }}>{cat}</div>}
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

// ══════════════════════════════════════════════════════════════
export default function Inventory() {
  const [items,        setItems]       = useState([]);
  const [activeCat,    setActiveCat]   = useState('All');
  const [subFilter,    setSubFilter]   = useState('');
  const [search,       setSearch]      = useState('');
  const [selected,     setSelected]    = useState(null);
  const [panelTab,     setPanelTab]    = useState('details');
  const [showAdd,      setShowAdd]     = useState(false);
  const [suggestions,  setSuggestions] = useState({ dealers:[], brands:[], names:[] });
  const [addSaving,    setAddSaving]   = useState(false);
  const [addCat,       setAddCat]      = useState('Frames');
  const [colorVariants,setColorVariants] = useState([{ color:'Black', qty:'1', image:null }]);
  // Keep first variant color in sync with form frame_color
  const prevFrameColor = React.useRef('Black');
  const [loading,      setLoading]     = useState(true);
  const [imgData,      setImgData]     = useState(null);
  const [form,         setForm]        = useState(defaults('Frames'));
  const [showStickers, setShowStickers]= useState(false);
  const [stickerItems, setStickerItems]= useState([]);

  const load = useCallback(()=>{
    setLoading(true);
    const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('ko_token');
    const params = new URLSearchParams({ limit:'500' });
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

  const handleCatChange = (cat) => { setAddCat(cat); setForm(defaults(cat)); setImgData(null); setColorVariants([{ color:'Black', qty:'1', image:null }]); };
  const handleImgPick   = async (e) => { const f=e.target.files[0]; if(!f) return; setImgData(await toBase64(f)); };

  const handleAdd = async () => {
    const name = buildName(form);
    if (!name.trim()) return alert('Please fill in the required fields');
    if (addSaving) return; // prevent double-click
    setAddSaving(true);
    try {
      // Save each colour variant
      for (const variant of colorVariants) {
        if (!variant.color || parseInt(variant.qty||0) < 0) continue;
        const variantName = buildName({ ...form, frame_color: variant.color });
        await createItem({
          ...form,
          frame_color: variant.color,
          name: variantName,
          image_url: variant.image||imgData||null,  // variant image or fallback to global
          sell_price:    parseFloat(form.sell_price)||0,
          cost_price:    parseFloat(form.cost_price)||0,
          quantity:      parseInt(variant.qty)||0,
          min_quantity:  parseInt(form.min_quantity)||2,
        });
      }
      setShowAdd(false);
      setForm(defaults(addCat));
      setImgData(null);
      setColorVariants([{ color:'Black', qty:'1', image:null }]);
      load();
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
    });
    load(); setSelected(null);
  };

  const handleDelete = async (id) => {
    if(!window.confirm('Remove this item?')) return;
    await deleteItem(id); setSelected(null); load();
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
          {l:'Stock Value (cost)', v:`Rs.${Math.round(val/1000)}K`, c:C.success},
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
            <label style={LBL}>Default Photo <span style={{ fontWeight:400, color:C.muted }}>(used for variants without their own photo)</span></label>
            <label style={{ display:'flex', alignItems:'center', justifyContent:'center', width:110, height:90, border:`2px dashed ${imgData?C.gold:C.border}`, borderRadius:10, cursor:'pointer', background:imgData?'#fdf9f0':C.cream, overflow:'hidden', position:'relative' }}>
              {imgData ? <img src={imgData} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <><span style={{ fontSize:22 }}>📷</span><span style={{ fontSize:10, color:C.muted, marginTop:4 }}>Optional</span></>}
              <input type="file" accept="image/*" onChange={handleImgPick} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer' }}/>
            </label>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <CategoryFields form={form} set={setForm} suggestions={suggestions}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginTop:4 }}>
            <Field label="Cost Price (Rs.)"><input type="number" value={form.cost_price||''} onChange={e=>setForm(f=>({...f,cost_price:e.target.value}))} placeholder="Buy price" style={INP}/></Field>
            <Field label="Sell Price (Rs.)"><input type="number" value={form.sell_price||''} onChange={e=>setForm(f=>({...f,sell_price:e.target.value}))} placeholder="Sell price" style={INP}/></Field>
            <Field label="Quantity"><input type="number" value={form.quantity||''} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} placeholder="e.g. 5" style={INP}/></Field>
            <Field label="Min Alert"><input type="number" value={form.min_quantity||''} onChange={e=>setForm(f=>({...f,min_quantity:e.target.value}))} placeholder="e.g. 2" style={INP}/></Field>
          </div>
          {/* ── Colour variants ─────────────────────────────── */}
          <div style={{ marginTop:4, background:C.cream, borderRadius:12, padding:'14px 16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>🎨 Colours & Quantities</div>
              <button onClick={()=>setColorVariants(v=>[...v,{color:'Black',qty:'1',image:null}])}
                style={{ padding:'5px 12px', background:C.navy, color:'white', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                + Add colour
              </button>
            </div>
            {colorVariants.map((v,i)=>(
              <div key={i} style={{ display:'grid', gridTemplateColumns:'44px 1fr 100px 44px 36px', gap:8, marginBottom:8, alignItems:'center' }}>
                {/* Image picker per variant */}
                <label style={{ width:44, height:44, border:`2px dashed ${v.image?C.gold:C.border}`, borderRadius:8, cursor:'pointer', background:v.image?'#fdf9f0':C.cream, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative', flexShrink:0 }}>
                  {v.image
                    ?<img src={v.image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    :<span style={{ fontSize:18 }}>📷</span>
                  }
                  <input type="file" accept="image/*" style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer' }}
                    onChange={async e=>{
                      const f=e.target.files[0]; if(!f) return;
                      const b64=await toBase64(f);
                      setColorVariants(cv=>cv.map((x,j)=>j===i?{...x,image:b64}:x));
                    }}/>
                </label>
                <select value={v.color}
                  onChange={e=>setColorVariants(cv=>cv.map((x,j)=>j===i?{...x,color:e.target.value}:x))}
                  style={{ ...INP, padding:'8px 10px' }}>
                  {FR_COLORS.map(col=><option key={col}>{col}</option>)}
                </select>
                <input type="number" min="0" value={v.qty} placeholder="Qty"
                  onChange={e=>setColorVariants(cv=>cv.map((x,j)=>j===i?{...x,qty:e.target.value}:x))}
                  style={{ ...INP, padding:'8px 10px', fontWeight:700 }}/>
                {/* Remove image button */}
                {v.image
                  ?<button onClick={()=>setColorVariants(cv=>cv.map((x,j)=>j===i?{...x,image:null}:x))}
                    style={{ background:'#fff7ed', color:'#c2410c', border:'1px solid #fed7aa', borderRadius:7, padding:'4px 6px', fontSize:11, cursor:'pointer', fontFamily:'inherit', height:44, whiteSpace:'nowrap' }}>✕ img</button>
                  :<div/>
                }
                {colorVariants.length>1
                  ?<button onClick={()=>setColorVariants(cv=>cv.filter((_,j)=>j!==i))}
                    style={{ background:'#fee2e2', color:C.danger, border:'none', borderRadius:7, padding:'8px', fontSize:14, cursor:'pointer' }}>✕</button>
                  :<div/>
                }
              </div>
            ))}
            <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
              Each colour saves as a separate inventory item.
              {colorVariants.length>1 && <b style={{color:C.navy}}> {colorVariants.length} variants will be saved.</b>}
            </div>
          </div>

          {/* Preview */}
          {buildName(form) && (
            <div style={{ marginTop:10, background:C.cream, borderRadius:8, padding:'8px 14px', fontSize:12, color:C.muted }}>
              Preview: {colorVariants.slice(0,3).map((v,i)=>(
                <b key={i} style={{color:C.navy,marginRight:8}}>{buildName({...form,frame_color:v.color})} (×{v.qty||0})</b>
              ))}{colorVariants.length>3&&`+${colorVariants.length-3} more`}
            </div>
          )}

          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            <button onClick={handleAdd} disabled={addSaving}
              style={{ padding:'10px 22px', background:addSaving?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:addSaving?'not-allowed':'pointer', fontFamily:'inherit', minWidth:140 }}>
              {addSaving ? '⏳ Saving...' : `💾 Save ${colorVariants.length>1?`${colorVariants.length} variants`:'Item'}`}
            </button>
            <button onClick={()=>{setShowAdd(false);setForm(defaults(addCat));setImgData(null);setColorVariants([{color:'Black',qty:'1'}]);}}
              style={{ padding:'10px 16px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
              Cancel
            </button>
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
              {items.filter(item=>{
                if (!subFilter) return true;
                if (activeCat==='Sunglasses') {
                  if (subFilter==='RayBan') return (item.brand||'').toLowerCase().includes('rayban');
                  return item.sg_type===subFilter;
                }
                if (activeCat==='Frames') return item.frame_type===subFilter;
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
            <div style={{ height:160, background:C.cream, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
              {selected.image_url ? <img src={selected.image_url} alt={selected.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <div style={{ fontSize:52, opacity:.2 }}>{CAT_ICON[selected.category]||'📦'}</div>}
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

              {/* Panel tabs */}
              <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, margin:'0 -22px', padding:'0 22px' }}>
                {[
                  { key:'details',    label:'📋 Details'    },
                  { key:'adjust',     label:'📦 Adjust Stock'},
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
                    <div style={{ background:C.cream, borderRadius:9, padding:'9px 14px', marginTop:8, display:'flex', gap:20, fontSize:13 }}>
                      <span>Profit: <b style={{color:C.success}}>Rs.{(parseFloat(selected.sell_price||0)-parseFloat(selected.cost_price||0)).toLocaleString()}</b></span>
                      <span>Margin: <b>{parseFloat(selected.sell_price)>0?Math.round((parseFloat(selected.sell_price)-parseFloat(selected.cost_price))/parseFloat(selected.sell_price)*100):0}%</b></span>
                    </div>
                  </div>
                  {/* ── Actions ── */}
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button onClick={()=>handleSavePanel(selected)} style={{ padding:'10px 18px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>💾 Save All</button>
                    <button onClick={()=>{ setStickerItems([selected]); setShowStickers(true); }} style={{ padding:'10px 16px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.navy }}>🏷️ Sticker</button>
                    <button onClick={()=>setPanelTab('adjust')} style={{ padding:'10px 16px', background:'#eff6ff', border:`1.5px solid #bae6fd`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'#0369a1' }}>📦 Adjust Stock</button>
                    <button onClick={()=>handleDelete(selected.id)} style={{ padding:'10px 14px', background:'#fee2e2', color:C.danger, border:`1.5px solid #fca5a5`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto' }}>🗑️</button>
                  </div>
                </>
              )}

              {/* ── ADJUST STOCK TAB ── */}
              {panelTab==='adjust' && (
                <AdjustmentPanel item={selected} onDone={handleAdjDone}/>
              )}
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