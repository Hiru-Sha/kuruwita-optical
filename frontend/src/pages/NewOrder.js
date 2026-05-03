// ============================================================
//  NewOrder.js — Updated with Standardized Inputs, Signs, & Sync
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
  inp:      { padding:'10px 13px', border:'1.5px solid #e0ddd6', borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:'#f8f5ef', color:'#1a1a2e', transition:'border-color .2s' },
  req:      { color:'#c0392b' },
  suggest:  { position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #e0ddd6', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.1)', zIndex:50, overflow:'hidden' }
};

// Standardized Constant Values
const TITLES = ['Mr', 'Mrs', 'Ms', 'Rev', 'Baby', 'Master', 'Dr'];
const AGES = Array.from({ length: 100 }, (_, i) => i + 1);
const VA_VALS = ['6/60', '6/36', '6/24', '6/18', '6/12', '6/9', '6/6'];
const AXIS_VALS = Array.from({ length: 181 }, (_, i) => i);
const LENS_TYPES = ['Single Vision', 'Hi-Index 1.60', 'Hi-Index 1.67', 'Bifocal', 'Progressive', 'Reading Glasses', 'Sunglasses'];
const LENS_OPTIONS = ['CR39 White', 'Blue Filter', 'Photochromic', 'Blue Filter + Photochromic'];

export default function NewOrder() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); 

  // --- SMART DATA STATES ---
  const [inventory, setInventory] = useState([]);
  const [frameSearch, setFrameSearch] = useState('');
  const [frameResults, setFrameResults] = useState([]);

  // Customer
  const [custSearch, setCustSearch] = useState('');
  const [custResults, setCustResults] = useState([]);
  const [selectedCust, setSelectedCust] = useState(null);
  const [newCust, setNewCust] = useState({ title: 'Mr', name:'', age: '25', phone:'', address:'' });
  const [isNewCust, setIsNewCust] = useState(true);

  // Refraction State
  const [ref, setRef] = useState({
    r_sph:'', r_cyl:'', r_axis:'', r_add:'', r_va_std:'', r_pd:'',
    l_sph:'', l_cyl:'', l_axis:'', l_add:'', l_va_std:'', l_pd:'',
    notes:''
  });

  // Helper: Copy Right Eye data to Left Eye
  const copyRightToLeft = () => {
    setRef(prev => ({
      ...prev,
      l_sph: prev.r_sph, l_cyl: prev.r_cyl, l_axis: prev.r_axis, 
      l_add: prev.r_add, l_va_std: prev.r_va_std, l_pd: prev.r_pd
    }));
  };

  // Helper: SPH/CYL/AXIS native up/down input
  const NativeRefInput = ({ p, field, title, stepVal }) => (
    <div style={S.field}>
      <label style={S.lbl}>{title}</label>
      <input type="number" step={stepVal || "0.25"} style={{...S.inp, textAlign:'center'}} 
             value={ref[`${p}_${field}`]} onChange={e=>setRef({...ref, [`${p}_${field}`]:e.target.value})}/>
    </div>
  );

  // Helper: Datalist for Axis 0-180
  const AxisInput = ({ p }) => (
    <div style={S.field}>
      <label style={S.lbl}>Axis</label>
      <input list={`axis-list-${p}`} style={S.inp} 
             value={ref[`${p}_axis`]} onChange={e=>setRef({...ref, [`${p}_axis`]:e.target.value})} placeholder="0-180"/>
      <datalist id={`axis-list-${p}`}>
        {AXIS_VALS.map(v => <option key={v} value={v} />)}
      </datalist>
    </div>
  );

  // Frame & Lens
  const [order, setOrder] = useState({
    inventory_id: null, frame:'', frame_type:'', lens_type:'', lens_coating:'None', 
    deliver_date:'', status:'created', total_amount:'', advance_amount:'', notes:''
  });

  const balance = Math.max(0, (parseFloat(order.total_amount)||0) - (parseFloat(order.advance_amount)||0));

  useEffect(() => {
    getInventory({ category: 'Frames' }).then(res => {
        setInventory(res.data.filter(i => i.quantity > 0));
    });
  }, []);

  const searchFrames = (q) => {
    setFrameSearch(q);
    if (q.length < 1) { setFrameResults([]); return; }
    const filtered = inventory.filter(i => 
        i.name.toLowerCase().includes(q.toLowerCase()) || i.brand.toLowerCase().includes(q.toLowerCase())
    );
    setFrameResults(filtered.slice(0, 5));
  };

  const selectFrame = (item) => {
    setOrder(o => ({ ...o, inventory_id: item.id, frame: item.name, total_amount: item.sell_price }));
    setFrameSearch(item.name);
    setFrameResults([]);
  };

  const handleSave = async () => {
    setError(''); setSaving(true);
    try {
      let customerId = selectedCust?.id;
      if (isNewCust) {
        const res = await createCustomer(newCust);
        customerId = res.data.id;
      }

      await createOrder({
        customer_id: customerId, ...order, balance_amount: balance, ...ref, ref_notes: ref.notes,
      });

      navigate('/orders');
    } catch (err) {
      setError(err.response?.data?.error || 'Order failed. Is the frame out of stock?');
    } finally { setSaving(false); }
  };

  // Payment type-in input component
  const PaymentInput = ({ val, onChange, placeholder }) => (
    <input type="text" value={val} placeholder={placeholder}
      onChange={e => onChange(e.target.value)} style={S.inp} />
  );

  return (
    <div style={S.page}>
      <h1 style={S.title}>➕ New Order</h1>
      <p style={S.sub}>Step {step} of 4</p>

      {/* STEP 1: CUSTOMER */}
      {step === 1 && (
        <div style={S.section}>
          <div style={S.sh}><span style={S.shico}>👤</span><span style={S.sht}>Customer Info</span></div>
          <div style={{ position:'relative', marginBottom:20 }}>
            {/* Native Search Input */}
            <input type="text" value={custSearch} placeholder="Search existing customer..."
               onChange={e => {
                  const q = e.target.value; setCustSearch(q);
                  if(q.length > 1) getCustomers({search:q}).then(r => setCustResults(r.data.slice(0,5)));
               }} style={S.inp} />
            {custResults.length > 0 && (
              <div style={S.suggest}>
                {custResults.map(c => (
                  <div key={c.id} onClick={()=>{setSelectedCust(c); setIsNewCust(false); setCustSearch(c.name); setCustResults([]);}} style={{ padding:10, cursor:'pointer' }}>{c.name} - {c.phone}</div>
                ))}
              </div>
            )}
          </div>
          {isNewCust && (
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px 1fr', gap: 12 }}>
                {/* Standardized Title Dropdown */}
                <div style={S.field}>
                  <label style={S.lbl}>Title</label>
                  <select style={S.inp} value={newCust.title} onChange={e=>setNewCust({...newCust, title:e.target.value})}>
                    {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={S.field}><label style={S.lbl}>Name</label><input style={S.inp} value={newCust.name} onChange={e=>setNewCust({...newCust, name:e.target.value})}/></div>
                {/* Standardized Age Dropdown */}
                <div style={S.field}>
                  <label style={S.lbl}>Age</label>
                  <select style={S.inp} value={newCust.age} onChange={e=>setNewCust({...newCust, age:e.target.value})}>
                    {AGES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div style={S.field}><label style={S.lbl}>Phone</label><input style={S.inp} value={newCust.phone} onChange={e=>setNewCust({...newCust, phone:e.target.value})}/></div>
            </div>
          )}
          <button onClick={()=>setStep(2)} style={{ marginTop:20, padding:'10px 20px', background:'#0f1f3d', color:'white', borderRadius:9 }}>Next →</button>
        </div>
      )}

      {/* STEP 2: REFRACTION */}
      {step === 2 && (
        <div style={S.section}>
          <div style={S.sh}>
            <span style={S.shico}>🔭</span><span style={S.sht}>Refraction Results</span>
            <button onClick={copyRightToLeft} style={{ marginLeft:'auto', fontSize:12, padding:'6px 12px', background:'#c9a84c', color:'#0f1f3d', borderRadius:8, fontWeight:600, border:'none', cursor:'pointer' }}>Copy Right → Left</button>
          </div>
          
          <div style={{ display:'grid', gap: 16 }}>
            {[{label:'Right Eye', prefix:'r'}, {label:'Left Eye', prefix:'l'}].map(eye => (
              <div key={eye.prefix}>
                <div style={{fontSize:14, fontWeight:700, color:'#0f1f3d', marginBottom:8, borderBottom:'1px solid #f8f5ef', paddingBottom:4 }}>{eye.label}</div>
                <div style={{ display:'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                  <NativeRefInput p={eye.prefix} field="sph" title="SPH" />
                  <NativeRefInput p={eye.prefix} field="cyl" title="CYL" />
                  <AxisInput p={eye.prefix} />
                  <NativeRefInput p={eye.prefix} field="add" title="ADD" />
                  {/* VA Dropdown */}
                  <div style={S.field}>
                    <label style={S.lbl}>VA</label>
                    <select style={S.inp} value={ref[`${eye.prefix}_va_std`]} onChange={e=>setRef({...ref, [`${eye.prefix}_va_std`]:e.target.value})}>
                      <option value="">Select</option>
                      {VA_VALS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div style={S.field}><label style={S.lbl}>PD</label><input style={S.inp} value={ref[`${eye.prefix}_pd`]} onChange={e=>setRef({...ref, [`${eye.prefix}_pd`]:e.target.value})}/></div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={()=>setStep(3)} style={{ marginTop:20, padding:'10px 20px', background:'#0f1f3d', color:'white', borderRadius:9 }}>Next →</button>
        </div>
      )}

      {/* STEP 3: FRAME & LENS */}
      {step === 3 && (
        <div style={S.section}>
          <div style={S.sh}><span style={S.shico}>🕶️</span><span style={S.sht}>Frame & Lens Selection</span></div>
          {/* Native Search Input */}
          <div style={{position:'relative', marginBottom:20}}>
            <label style={S.lbl}>Search Frame Inventory</label>
            <input type="text" value={frameSearch} placeholder="Search Brand/Model..."
                   onChange={e => searchFrames(e.target.value)} style={S.inp} />
            {frameResults.length > 0 && (
              <div style={S.suggest}>
                {frameResults.map(i => (
                  <div key={i.id} onClick={()=>selectFrame(i)} style={{ padding:10, cursor:'pointer', borderBottom:'1px solid #eee' }}>
                    {i.name} - <span style={{color:'#2d7a4f'}}>Rs.{i.sell_price} ({i.quantity} left)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* New Lens Grid */}
          <div style={S.grid3}>
              <div style={S.field}><label style={S.lbl}>Lens Type</label>
                <select style={S.inp} value={order.lens_type} onChange={e=>setOrder({...order, lens_type:e.target.value})}>
                    <option value="">Select...</option>
                    {LENS_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div style={S.field}><label style={S.lbl}>Lens Options</label>
                <select style={S.inp} value={order.lens_coating} onChange={e=>setOrder({...order, lens_coating:e.target.value})}>
                    {LENS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={S.field}><label style={S.lbl}>Deliver Date</label><input type="date" style={S.inp} value={order.deliver_date} onChange={e=>setOrder({...order, deliver_date:e.target.value})}/></div>
          </div>
          <button onClick={()=>setStep(4)} style={{ marginTop:20, padding:'10px 20px', background:'#0f1f3d', color:'white', borderRadius:9 }}>Next →</button>
        </div>
      )}

      {/* STEP 4: PAYMENT */}
      {step === 4 && (
        <div style={S.section}>
          <div style={S.sh}><span style={S.shico}>💰</span><span style={S.sht}>Payment</span></div>
          <div style={S.grid3}>
              {/* Type-in pricing inputs */}
             <div style={S.field}><label style={S.lbl}>Total (Rs.)</label><PaymentInput val={order.total_amount} onChange={v=>setOrder({...order, total_amount:v})} placeholder="0"/></div>
             <div style={S.field}><label style={S.lbl}>Advance (Rs.)</label><PaymentInput val={order.advance_amount} onChange={v=>setOrder({...order, advance_amount:v})} placeholder="0"/></div>
             <div style={{background:'#0f1f3d', color:'#c9a84c', borderRadius:9, padding:10, textAlign:'center'}}>
                <div style={{fontSize:10}}>BALANCE</div>
                <div style={{fontSize:18, fontWeight:800}}>Rs. {balance.toLocaleString()}</div>
             </div>
          </div>
          <button onClick={handleSave} disabled={saving} style={{ width:'100%', marginTop:20, padding:14, background:'#0f1f3d', color:'white', fontWeight:800, borderRadius:9 }}>
            {saving ? '⏳ Saving...' : '💾 Save Order'}
          </button>
        </div>
      )}
    </div>
  );
}