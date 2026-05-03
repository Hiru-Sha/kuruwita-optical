// ============================================================
//  NewOrder.js — Fully Updated Professional Flow
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCustomer, createOrder, getCustomers, getInventory } from '../api';

const S = {
  page:     { fontFamily:"'DM Sans',sans-serif" },
  title:    { fontFamily:"'Playfair Display',serif", fontSize:22, color:'#0f1f3d', margin:'0 0 4px' },
  sub:      { fontSize:13, color:'#6b7280', margin:'0 0 24px' },
  section:  { background:'white', border:'1px solid #e0ddd6', borderRadius:14, padding:'20px 22px', marginBottom:16 },
  sh:       { display:'flex', alignItems:'center', gap:8, marginBottom:16 },
  shico:    { fontSize:18 },
  sht:      { fontSize:15, fontWeight:700, color:'#0f1f3d' },
  grid2:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  grid3:    { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 },
  field:    { display:'flex', flexDirection:'column', gap:4 },
  lbl:      { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:'#6b7280' },
  inp:      { padding:'10px 13px', border:'1.5px solid #e0ddd6', borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:'#f8f5ef', color:'#1a1a2e' },
  suggest:  { position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #e0ddd6', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.1)', zIndex:50, overflow:'hidden' }
};

const TITLES = ['Mr', 'Mrs', 'Rev', 'Baby', 'Master', 'Dr'];
const AGES = Array.from({ length: 100 }, (_, i) => i + 1);
const VA_VALS = ['6/60', '6/36', '6/24', '6/18', '6/12', '6/9', '6/6'];
const AXIS_VALS = Array.from({ length: 181 }, (_, i) => i);
const LENS_TYPES = ['Single Vision', 'Hi-Index 1.60', 'Hi-Index 1.67', 'Bifocal', 'Progressive', 'Reading Glasses', 'Sunglasses'];
const LENS_OPTIONS = ['CR39 White', 'Blue Filter', 'Photochromic', 'Blue Filter + Photochromic'];

export default function NewOrder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  // Price States
  const [framePrice, setFramePrice] = useState(0);
  const [lensPrice, setLensPrice] = useState(0);
  const [manualAdj, setManualAdj] = useState(0);
  const [discount, setDiscount] = useState(0);
  
  const [newCust, setNewCust] = useState({ title: 'Mr', name:'', age: '25', phone:'' });
  const [custSearch, setCustSearch] = useState('');
  const [custResults, setCustResults] = useState([]);
  const [selectedCust, setSelectedCust] = useState(null);
  
  const [ref, setRef] = useState({
    r_sph:'', r_cyl:'', r_axis:'', r_add:'', r_va_std:'', r_pd:'',
    l_sph:'', l_cyl:'', l_axis:'', l_add:'', l_va_std:'', l_pd:''
  });

  const [order, setOrder] = useState({ inventory_id: null, frame:'', lens_type:'', lens_coating:'', deliver_date:'', advance_amount:'' });

  const finalTotal = parseFloat(framePrice || 0) + parseFloat(lensPrice || 0) + parseFloat(manualAdj || 0) - parseFloat(discount || 0);
  const balance = Math.max(0, finalTotal - parseFloat(order.advance_amount || 0));

  const copyRightToLeft = () => {
    setRef(prev => ({ ...prev, l_sph: prev.r_sph, l_cyl: prev.r_cyl, l_axis: prev.r_axis, l_add: prev.r_add, l_va_std: prev.r_va_std, l_pd: prev.r_pd }));
  };

  const NativeRefInput = ({ p, field, title }) => (
    <div style={S.field}>
      <label style={S.lbl}>{title}</label>
      <div style={{ display:'flex', gap:2 }}>
        <select style={{...S.inp, padding:'0 2px'}} onChange={e=>setRef({...ref, [`${p}_${field}_sign`]:e.target.value})}>
          <option>+</option><option>-</option>
        </select>
        <input type="number" step="0.25" style={{...S.inp, width:'60px', textAlign:'center'}} 
               value={ref[`${p}_${field}`]} onChange={e=>setRef({...ref, [`${p}_${field}`]:e.target.value})}/>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <h1 style={S.title}>➕ New Order</h1>
      {step === 1 && (
        <div style={S.section}>
          <div style={S.sh}>👤 <span style={S.sht}>Customer Info</span></div>
          <input style={{...S.inp, width:'100%', marginBottom:15}} placeholder="Search existing..." onChange={e => {
            setCustSearch(e.target.value);
            if(e.target.value.length > 1) getCustomers({search:e.target.value}).then(r => setCustResults(r.data.slice(0,5)));
          }} />
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 1fr', gap: 10 }}>
            <select style={S.inp} value={newCust.title} onChange={e=>setNewCust({...newCust, title:e.target.value})}>{TITLES.map(t=><option key={t}>{t}</option>)}</select>
            <input style={S.inp} placeholder="Name" value={newCust.name} onChange={e=>setNewCust({...newCust, name:e.target.value})}/>
            <select style={S.inp} value={newCust.age} onChange={e=>setNewCust({...newCust, age:e.target.value})}>{AGES.map(a=><option key={a}>{a}</option>)}</select>
            <input style={S.inp} placeholder="Phone" value={newCust.phone} onChange={e=>setNewCust({...newCust, phone:e.target.value})}/>
          </div>
          <button onClick={()=>setStep(2)} style={{ marginTop:20, padding:'10px 20px', background:'#0f1f3d', color:'white', borderRadius:9 }}>Next →</button>
        </div>
      )}

      {step === 2 && (
        <div style={S.section}>
          <div style={S.sh}>🔭 <span style={S.sht}>Refraction</span> <button onClick={copyRightToLeft} style={{marginLeft:'auto', fontSize:11}}>Copy R → L</button></div>
          {['r', 'l'].map(p => (
            <div key={p} style={{ display:'grid', gridTemplateColumns: '40px repeat(5, 1fr)', gap: 8, marginBottom:10 }}>
              <div style={{fontWeight:700, paddingTop:25}}>{p.toUpperCase()}</div>
              <NativeRefInput p={p} field="sph" title="SPH" /><NativeRefInput p={p} field="cyl" title="CYL" />
              <div style={S.field}><label style={S.lbl}>Axis</label><input list="axis-list" style={S.inp} value={ref[`${p}_axis`]} onChange={e=>setRef({...ref, [`${p}_axis`]:e.target.value})}/></div>
              <div style={S.field}><label style={S.lbl}>VA</label><select style={S.inp} value={ref[`${p}_va_std`]} onChange={e=>setRef({...ref, [`${p}_va_std`]:e.target.value})}>{VA_VALS.map(v=><option key={v}>{v}</option>)}</select></div>
              <div style={S.field}><label style={S.lbl}>PD</label><input style={S.inp} value={ref[`${p}_pd`]} onChange={e=>setRef({...ref, [`${p}_pd`]:e.target.value})}/></div>
            </div>
          ))}
          <datalist id="axis-list">{AXIS_VALS.map(v=><option key={v} value={v}/>)}</datalist>
          <button onClick={()=>setStep(3)} style={{ marginTop:20, padding:'10px 20px', background:'#0f1f3d', color:'white', borderRadius:9 }}>Next →</button>
        </div>
      )}

      {step === 3 && (
        <div style={S.section}>
          <div style={S.sh}>🕶️ <span style={S.sht}>Frame & Lens</span></div>
          <input style={{...S.inp, width:'100%', marginBottom:15}} placeholder="Search Frame..." onChange={e => {
            getInventory({search:e.target.value}).then(r => setInventory(r.data));
          }} />
          <div style={S.grid2}>
            <select style={S.inp} onChange={e=>setOrder({...order, lens_type:e.target.value})}>{LENS_TYPES.map(l=><option key={l}>{l}</option>)}</select>
            <select style={S.inp} onChange={e=>setOrder({...order, lens_coating:e.target.value})}>{LENS_OPTIONS.map(c=><option key={c}>{c}</option>)}</select>
            <input style={S.inp} type="number" placeholder="Frame Price" onChange={e=>setFramePrice(e.target.value)}/>
            <input style={S.inp} type="number" placeholder="Lens Price" onChange={e=>setLensPrice(e.target.value)}/>
          </div>
          <button onClick={()=>setStep(4)} style={{ marginTop:20, padding:'10px 20px', background:'#0f1f3d', color:'white', borderRadius:9 }}>Next →</button>
        </div>
      )}

      {step === 4 && (
        <div style={S.section}>
          <div style={S.sh}>💰 <span style={S.sht}>Payment</span></div>
          <div style={S.grid2}>
             <input style={S.inp} placeholder="Discount (Rs)" onChange={e=>setDiscount(e.target.value)}/>
             <input style={S.inp} placeholder="Adjustment (Rs)" onChange={e=>setManualAdj(e.target.value)}/>
             <input style={S.inp} placeholder="Advance (Rs)" onChange={e=>setOrder({...order, advance_amount:e.target.value})}/>
          </div>
          <div style={{background:'#0f1f3d', color:'#c9a84c', padding:15, textAlign:'center', marginTop:20, borderRadius:9}}>
             <div style={{fontSize:20, fontWeight:800}}>Final Total: Rs. {finalTotal.toLocaleString()}</div>
             <div style={{fontSize:16}}>Balance: Rs. {balance.toLocaleString()}</div>
          </div>
          <button onClick={handleSave} style={{ width:'100%', marginTop:20, padding:14, background:'#0f1f3d', color:'white', borderRadius:9 }}>💾 Save Order</button>
        </div>
      )}
    </div>
  );
}