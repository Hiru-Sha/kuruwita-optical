// ============================================================
//  NewOrder.js — Full Integrated Smart Order Form (Phase 2)
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

const LENS_TYPES = ['Single vision — CR39','Single vision — Hi-index 1.60','Single vision — Hi-index 1.67','Bifocal','Progressive','Photochromic (Transition)','Anti-reflective coating','Polarized','Reading glasses (ready)'];
const COATINGS = ['None','Anti-reflective (AR)','UV400','Blue light filter','Hard coat','Mirror coat'];
const FRAME_TYPES = ['Full rim','Half rim','Rimless','Supra','Sunglasses frame'];
const LENS_COS = ['Negombo Optical','Solex Optical','In-Shop'];

export default function NewOrder() {
  const navigate = useNavigate();
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [step,    setStep]    = useState(1); 

  // --- SMART DATA STATES ---
  const [inventory, setInventory] = useState([]);
  const [frameSearch, setFrameSearch] = useState('');
  const [frameResults, setFrameResults] = useState([]);

  // Customer
  const [custSearch,   setCustSearch]   = useState('');
  const [custResults,  setCustResults]  = useState([]);
  const [selectedCust, setSelectedCust] = useState(null);
  const [newCust,      setNewCust]      = useState({ name:'', age:'', phone:'', address:'' });
  const [isNewCust,    setIsNewCust]    = useState(true);

  // Refraction
  const [ref, setRef] = useState({
    r_sph:'',r_cyl:'',r_axis:'',r_add:'',r_va:'',r_pd:'',
    l_sph:'',l_cyl:'',l_axis:'',l_add:'',l_va:'',l_pd:'',
    notes:''
  });

  // Frame & Lens
  const [order, setOrder] = useState({
    inventory_id: null,
    frame:'', frame_type:'Full rim', lens_type:'', lens_coating:'None',
    lens_company:'Negombo Optical', deliver_date:'', status:'created',
    total_amount:'', advance_amount:'', notes:''
  });

  const [hasRx, setHasRx] = useState(false);
  const [rxHospital, setRxHospital] = useState('');
  const [rxDate,     setRxDate]     = useState('');
  const [rxDoctor,   setRxDoctor]   = useState('');

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
    setError('');
    setSaving(true);
    try {
      let customerId = selectedCust?.id;
      if (isNewCust) {
        const res = await createCustomer(newCust);
        customerId = res.data.id;
      }

      await createOrder({
        customer_id: customerId,
        ...order,
        has_rx: hasRx,
        rx_hospital: hasRx ? rxHospital : '',
        rx_date: hasRx ? rxDate : '',
        rx_doctor: hasRx ? rxDoctor : '',
        balance_amount: balance,
        ...ref,
        ref_notes: ref.notes,
      });

      navigate('/orders');
    } catch (err) {
      setError(err.response?.data?.error || 'Order failed. Is the frame out of stock?');
    } finally {
      setSaving(false);
    }
  };

  const inp = (val, onChange, placeholder, type='text') => (
    <input type={type} value={val} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={S.inp}
    />
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
            {inp(custSearch, (q) => {
                setCustSearch(q);
                if(q.length > 1) getCustomers({search:q}).then(r => setCustResults(r.data.slice(0,5)));
            }, 'Search existing customer...')}
            {custResults.length > 0 && (
              <div style={S.suggest}>
                {custResults.map(c => (
                  <div key={c.id} onClick={()=>{setSelectedCust(c); setIsNewCust(false); setCustSearch(c.name); setCustResults([]);}} style={{ padding:10, cursor:'pointer' }}>{c.name} - {c.phone}</div>
                ))}
              </div>
            )}
          </div>
          {isNewCust && (
            <div style={S.grid2}>
                <div style={S.field}><label style={S.lbl}>Name</label>{inp(newCust.name, v=>setNewCust({...newCust, name:v}))}</div>
                <div style={S.field}><label style={S.lbl}>Phone</label>{inp(newCust.phone, v=>setNewCust({...newCust, phone:v}))}</div>
            </div>
          )}
          <button onClick={()=>setStep(2)} style={{ marginTop:20, padding:'10px 20px', background:'#0f1f3d', color:'white', borderRadius:9 }}>Next →</button>
        </div>
      )}

      {/* STEP 2: REFRACTION */}
      {step === 2 && (
        <div style={S.section}>
          <div style={S.sh}><span style={S.shico}>🔭</span><span style={S.sht}>Refraction Results</span></div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:500 }}>
              <thead>
                <tr>{['Eye','SPH','CYL','AXIS','ADD','VA','PD'].map(h=><th key={h} style={{background:'#f8f5ef', padding:8, fontSize:11}}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {[{l:'Right', p:'r'}, {l:'Left', p:'l'}].map(eye => (
                  <tr key={eye.p}>
                    <td style={{padding:8, fontWeight:700}}>{eye.l}</td>
                    {['sph','cyl','axis','add','va','pd'].map(f => (
                      <td key={f}><input style={{...S.inp, width:'60px', textAlign:'center'}} value={ref[`${eye.p}_${f}`]} onChange={e=>setRef({...ref, [`${eye.p}_${f}`]:e.target.value})}/></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={()=>setStep(3)} style={{ marginTop:20, padding:'10px 20px', background:'#0f1f3d', color:'white', borderRadius:9 }}>Next →</button>
        </div>
      )}

      {/* STEP 3: FRAME & LENS */}
      {step === 3 && (
        <div style={S.section}>
          <div style={S.sh}><span style={S.shico}>🕶️</span><span style={S.sht}>Frame & Lens Selection</span></div>
          <div style={{position:'relative', marginBottom:20}}>
            <label style={S.lbl}>Search Frame Inventory</label>
            {inp(frameSearch, searchFrames, 'Search Brand/Model...')}
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
          <div style={S.grid2}>
              <div style={S.field}><label style={S.lbl}>Lens Type</label>
                <select style={S.inp} value={order.lens_type} onChange={e=>setOrder({...order, lens_type:e.target.value})}>
                    <option value="">Select...</option>
                    {LENS_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div style={S.field}><label style={S.lbl}>Send To</label>
                <select style={S.inp} value={order.lens_company} onChange={e=>setOrder({...order, lens_company:e.target.value})}>
                    {LENS_COS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
          </div>
          <button onClick={()=>setStep(4)} style={{ marginTop:20, padding:'10px 20px', background:'#0f1f3d', color:'white', borderRadius:9 }}>Next →</button>
        </div>
      )}

      {/* STEP 4: PAYMENT */}
      {step === 4 && (
        <div style={S.section}>
          <div style={S.sh}><span style={S.shico}>💰</span><span style={S.sht}>Payment</span></div>
          <div style={S.grid3}>
             <div style={S.field}><label style={S.lbl}>Total</label>{inp(order.total_amount, v=>setOrder({...order, total_amount:v}), '0', 'number')}</div>
             <div style={S.field}><label style={S.lbl}>Advance</label>{inp(order.advance_amount, v=>setOrder({...order, advance_amount:v}), '0', 'number')}</div>
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