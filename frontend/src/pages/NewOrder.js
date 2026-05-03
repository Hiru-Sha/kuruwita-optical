// ============================================================
//  NewOrder.js — Full order creation form (Phase 2)
// ============================================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCustomer, createOrder, getCustomers } from '../api';

const S = {
  page:    { fontFamily:"'DM Sans',sans-serif" },
  title:   { fontFamily:"'Playfair Display',serif", fontSize:22, color:'#0f1f3d', margin:'0 0 4px' },
  sub:     { fontSize:13, color:'#6b7280', margin:'0 0 24px' },
  section: { background:'white', border:'1px solid #e0ddd6', borderRadius:14, padding:'20px 22px', marginBottom:16 },
  sh:      { display:'flex', alignItems:'center', gap:8, marginBottom:16 },
  shico:   { fontSize:18 },
  sht:     { fontSize:15, fontWeight:700, color:'#0f1f3d' },
  grid2:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  grid3:   { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 },
  field:   { display:'flex', flexDirection:'column', gap:4 },
  lbl:     { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:'#6b7280' },
  inp:     { padding:'10px 13px', border:'1.5px solid #e0ddd6', borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:'#f8f5ef', color:'#1a1a2e', transition:'border-color .2s' },
  req:     { color:'#c0392b' },
};

const LENS_TYPES = [
  'Single vision — CR39','Single vision — Hi-index 1.60','Single vision — Hi-index 1.67',
  'Bifocal','Progressive','Photochromic (Transition)','Anti-reflective coating','Polarized','Reading glasses (ready)'
];
const COATINGS = ['None','Anti-reflective (AR)','UV400','Blue light filter','Hard coat','Mirror coat'];
const FRAME_TYPES = ['Full rim','Half rim','Rimless','Supra','Sunglasses frame'];
const LENS_COS = ['Negombo Optical','Solex Optical','In-Shop'];

export default function NewOrder() {
  const navigate = useNavigate();
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [step,    setStep]    = useState(1); // 1=customer 2=refraction 3=frame 4=payment

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
    frame:'', frame_type:'Full rim', lens_type:'', lens_coating:'None',
    lens_company:'Negombo Optical', deliver_date:'', status:'created',
    total_amount:'', advance_amount:'', notes:''
  });

  // Prescription
  const [hasRx,      setHasRx]      = useState(false);
  const [rxHospital, setRxHospital] = useState('');
  const [rxDate,     setRxDate]     = useState('');
  const [rxDoctor,   setRxDoctor]   = useState('');

  const balance = Math.max(0, (parseFloat(order.total_amount)||0) - (parseFloat(order.advance_amount)||0));

  // Default deliver date = 7 days from now
  const defaultDeliverDate = () => {
    const d = new Date(); d.setDate(d.getDate()+7);
    return d.toISOString().split('T')[0];
  };

  // Search existing customers
  const searchCustomers = async (q) => {
    setCustSearch(q);
    if (q.length < 2) { setCustResults([]); return; }
    try {
      const res = await getCustomers({ search: q });
      setCustResults(res.data.slice(0,5));
    } catch { setCustResults([]); }
  };

  const selectExistingCust = (c) => {
    setSelectedCust(c);
    setIsNewCust(false);
    setCustSearch(c.name);
    setCustResults([]);
  };

  const handleSave = async () => {
    setError('');
    // Validate
    if (isNewCust && !newCust.name)  return setError('Please enter customer name');
    if (isNewCust && !newCust.phone) return setError('Please enter customer phone');
    if (!order.deliver_date)         return setError('Please set a delivery date');
    if (!order.total_amount)         return setError('Please enter total amount');

    setSaving(true);
    try {
      let customerId = selectedCust?.id;

      // Create new customer if needed
      if (isNewCust) {
        const res = await createCustomer(newCust);
        customerId = res.data.id;
      }

      // Create order
      await createOrder({
        customer_id:    customerId,
        ...order,
        has_rx:         hasRx,
        rx_hospital:    hasRx ? rxHospital : '',
        rx_date:        hasRx ? rxDate     : '',
        rx_doctor:      hasRx ? rxDoctor   : '',
        balance_amount: balance,
        ...ref,
        ref_notes:      ref.notes,
      });

      navigate('/orders');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inp = (val, onChange, placeholder, type='text', extra={}) => (
    <input type={type} value={val} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{ ...S.inp, ...extra }}
      onFocus={e=>e.target.style.borderColor='#c9a84c'}
      onBlur={e=>e.target.style.borderColor='#e0ddd6'}
    />
  );

  const sel = (val, onChange, options) => (
    <select value={val} onChange={e=>onChange(e.target.value)}
      style={{ ...S.inp, cursor:'pointer' }}>
      <option value="">Select...</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );

  const stepLabel = (n, label) => (
    <div style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }} onClick={()=>setStep(n)}>
      <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700,
        background: step===n?'#0f1f3d': step>n?'#2d7a4f':'#e0ddd6',
        color: step>=n?'white':'#6b7280' }}>
        {step>n ? '✓' : n}
      </div>
      <span style={{ fontSize:13, fontWeight:600, color: step===n?'#0f1f3d':'#9ca3af' }}>{label}</span>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:8 }}>
        <h1 style={S.title}>➕ New Order</h1>
        <button onClick={()=>navigate('/orders')} style={{ background:'#f8f5ef', border:'1.5px solid #e0ddd6', borderRadius:9, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'#6b7280' }}>
          ← Back to Orders
        </button>
      </div>
      <p style={S.sub}>Fill in all details to create a new order</p>

      {/* Step indicators */}
      <div style={{ display:'flex', gap:20, marginBottom:24, flexWrap:'wrap', background:'white', border:'1px solid #e0ddd6', borderRadius:12, padding:'14px 20px' }}>
        {stepLabel(1,'Customer')}
        <div style={{ width:30, height:2, background:'#e0ddd6', alignSelf:'center' }}/>
        {stepLabel(2,'Refraction')}
        <div style={{ width:30, height:2, background:'#e0ddd6', alignSelf:'center' }}/>
        {stepLabel(3,'Frame & Lens')}
        <div style={{ width:30, height:2, background:'#e0ddd6', alignSelf:'center' }}/>
        {stepLabel(4,'Payment & Delivery')}
      </div>

      {error && (
        <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:'#c0392b', borderRadius:10, padding:'12px 16px', fontSize:13, marginBottom:16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── STEP 1: Customer ── */}
      {step === 1 && (
        <div style={S.section}>
          <div style={S.sh}><span style={S.shico}>👤</span><span style={S.sht}>Customer Details</span></div>

          {/* Search existing */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:8 }}>Search existing customer (by name or phone):</div>
            <div style={{ position:'relative' }}>
              <input value={custSearch} onChange={e=>searchCustomers(e.target.value)}
                placeholder="Type name or phone to search..."
                style={{ ...S.inp, width:'100%' }}
                onFocus={e=>e.target.style.borderColor='#c9a84c'}
                onBlur={e=>setTimeout(()=>setCustResults([]),200)}
              />
              {custResults.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #e0ddd6', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.1)', zIndex:50, overflow:'hidden' }}>
                  {custResults.map(c => (
                    <div key={c.id} onClick={()=>selectExistingCust(c)}
                      style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid #f8f5ef', fontSize:13 }}
                      onMouseEnter={e=>e.currentTarget.style.background='#f8f5ef'}
                      onMouseLeave={e=>e.currentTarget.style.background='white'}>
                      <b style={{color:'#0f1f3d'}}>{c.name}</b>
                      <span style={{color:'#9ca3af',marginLeft:8}}>{c.phone}</span>
                      <span style={{color:'#9ca3af',marginLeft:8,fontSize:11}}>Age {c.age} · {c.total_orders} orders</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedCust && !isNewCust && (
              <div style={{ marginTop:8, background:'#dcfce7', borderRadius:9, padding:'10px 14px', fontSize:13, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>✅ <b style={{color:'#0f1f3d'}}>{selectedCust.name}</b> · {selectedCust.phone} · {selectedCust.total_orders} previous orders</span>
                <button onClick={()=>{setSelectedCust(null);setIsNewCust(true);setCustSearch('');}} style={{background:'none',border:'none',cursor:'pointer',color:'#6b7280',fontSize:12}}>✕ Clear</button>
              </div>
            )}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10, margin:'16px 0' }}>
            <div style={{ flex:1, height:1, background:'#e0ddd6' }}/>
            <span style={{ fontSize:12, color:'#9ca3af', fontWeight:600 }}>OR ADD NEW CUSTOMER</span>
            <div style={{ flex:1, height:1, background:'#e0ddd6' }}/>
          </div>

          <div style={{ opacity: !isNewCust ? .4 : 1 }}>
            <div style={{ ...S.grid2, marginBottom:12 }}>
              <div style={{ ...S.field, gridColumn:'1/-1' }}>
                <label style={S.lbl}>Full Name <span style={S.req}>*</span></label>
                {inp(newCust.name, v=>{ setNewCust(n=>({...n,name:v})); setIsNewCust(true); setSelectedCust(null); }, 'e.g. Nuwan Perera')}
              </div>
              <div style={S.field}>
                <label style={S.lbl}>Phone <span style={S.req}>*</span></label>
                {inp(newCust.phone, v=>setNewCust(n=>({...n,phone:v})), '077-123-4567', 'tel')}
              </div>
              <div style={S.field}>
                <label style={S.lbl}>Age</label>
                {inp(newCust.age, v=>setNewCust(n=>({...n,age:v})), '34', 'number')}
              </div>
              <div style={{ ...S.field, gridColumn:'1/-1' }}>
                <label style={S.lbl}>Address</label>
                {inp(newCust.address, v=>setNewCust(n=>({...n,address:v})), 'e.g. 45, Main Street, Kuruwita')}
              </div>
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
            <button onClick={()=>{ if(isNewCust&&!newCust.name){setError('Please enter customer name');return;} if(isNewCust&&!newCust.phone){setError('Please enter customer phone');return;} setError('');setStep(2); }}
              style={{ padding:'10px 28px', background:'#0f1f3d', color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Next: Refraction →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Refraction ── */}
      {step === 2 && (
        <div style={S.section}>
          <div style={S.sh}><span style={S.shico}>🔭</span><span style={S.sht}>Refraction Results</span></div>
          <div style={{ overflowX:'auto', marginBottom:16 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:500 }}>
              <thead>
                <tr>
                  {['Eye','SPH','CYL','AXIS','ADD','VA','PD'].map(h=>(
                    <th key={h} style={{ background:'#f8f5ef', padding:'8px 10px', textAlign:'center', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:'#6b7280', border:'1px solid #e0ddd6' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label:'Right (R)', prefix:'r' },
                  { label:'Left (L)',  prefix:'l' },
                ].map(eye => (
                  <tr key={eye.prefix}>
                    <td style={{ background:'#f8f5ef', padding:'8px 12px', fontWeight:700, fontSize:13, color:'#0f1f3d', border:'1px solid #e0ddd6', whiteSpace:'nowrap' }}>{eye.label}</td>
                    {['sph','cyl','axis','add','va','pd'].map(f => (
                      <td key={f} style={{ border:'1px solid #e0ddd6', padding:4 }}>
                        <input value={ref[`${eye.prefix}_${f}`]}
                          onChange={e=>setRef(r=>({...r,[`${eye.prefix}_${f}`]:e.target.value}))}
                          placeholder={f==='sph'?'-1.00':f==='axis'?'90':f==='va'?'6/6':f==='pd'?'32':''}
                          style={{ width:'100%', padding:'7px 6px', border:'1.5px solid #e0ddd6', borderRadius:7, fontSize:13, textAlign:'center', fontFamily:"'DM Sans',sans-serif", outline:'none', background:'white' }}
                          onFocus={e=>e.target.style.borderColor='#c9a84c'}
                          onBlur={e=>e.target.style.borderColor='#e0ddd6'}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={S.field}>
            <label style={S.lbl}>Refraction Notes</label>
            <textarea value={ref.notes} onChange={e=>setRef(r=>({...r,notes:e.target.value}))}
              placeholder="e.g. Presbyopia, recommend progressive lenses..."
              style={{ ...S.inp, resize:'vertical', minHeight:70, lineHeight:1.6 }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:16 }}>
            <button onClick={()=>setStep(1)} style={{ padding:'10px 22px', background:'#f8f5ef', border:'1.5px solid #e0ddd6', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'#6b7280' }}>← Back</button>
            <button onClick={()=>setStep(3)} style={{ padding:'10px 28px', background:'#0f1f3d', color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Next: Frame & Lens →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Frame & Lens ── */}
      {step === 3 && (
        <div style={S.section}>
          <div style={S.sh}><span style={S.shico}>🕶️</span><span style={S.sht}>Frame & Lens Details</span></div>
          <div style={{ ...S.grid2, marginBottom:12 }}>
            <div style={{ ...S.field, gridColumn:'1/-1' }}>
              <label style={S.lbl}>Frame Brand / Model</label>
              {inp(order.frame, v=>setOrder(o=>({...o,frame:v})), 'e.g. Rayban RB3025 Gold')}
            </div>
            <div style={S.field}>
              <label style={S.lbl}>Frame Type</label>
              {sel(order.frame_type, v=>setOrder(o=>({...o,frame_type:v})), FRAME_TYPES)}
            </div>
            <div style={S.field}>
              <label style={S.lbl}>Lens Type</label>
              {sel(order.lens_type, v=>setOrder(o=>({...o,lens_type:v})), LENS_TYPES)}
            </div>
            <div style={S.field}>
              <label style={S.lbl}>Lens Coating</label>
              {sel(order.lens_coating, v=>setOrder(o=>({...o,lens_coating:v})), COATINGS)}
            </div>
          </div>

          {/* Lens company */}
          <div style={{ marginBottom:16 }}>
            <label style={{ ...S.lbl, display:'block', marginBottom:8 }}>Lens Grinding — Send To</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {LENS_COS.map(lc => (
                <div key={lc} onClick={()=>setOrder(o=>({...o,lens_company:lc}))}
                  style={{ border:`2px solid ${order.lens_company===lc?'#0f1f3d':'#e0ddd6'}`, borderRadius:10, padding:'12px 10px', textAlign:'center', cursor:'pointer',
                    background: order.lens_company===lc?'#0f1f3d':'white', transition:'all .15s' }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>{lc==='In-Shop'?'🏠':lc==='Negombo Optical'?'🏪':'🔬'}</div>
                  <div style={{ fontSize:13, fontWeight:700, color: order.lens_company===lc?'white':'#0f1f3d' }}>{lc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Prescription toggle */}
          <div style={{ background:'#f0f9ff', borderRadius:10, padding:'14px 16px', marginBottom:4 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: hasRx?14:0 }}>
              <div onClick={()=>setHasRx(h=>!h)}
                style={{ width:44, height:24, borderRadius:12, background: hasRx?'#0f1f3d':'#e0ddd6', position:'relative', cursor:'pointer', transition:'background .2s' }}>
                <div style={{ position:'absolute', top:3, left: hasRx?23:3, width:18, height:18, borderRadius:'50%', background:'white', transition:'left .2s' }}/>
              </div>
              <span style={{ fontSize:14, fontWeight:500, color:'#0f1f3d' }}>Customer brought a prescription</span>
            </div>
            {hasRx && (
              <div style={S.grid2}>
                <div style={S.field}>
                  <label style={S.lbl}>Hospital / Clinic</label>
                  {inp(rxHospital, setRxHospital, 'e.g. Colombo National Hospital')}
                </div>
                <div style={S.field}>
                  <label style={S.lbl}>Prescription Date</label>
                  <input type="date" value={rxDate} onChange={e=>setRxDate(e.target.value)} style={S.inp}/>
                </div>
                <div style={{ ...S.field, gridColumn:'1/-1' }}>
                  <label style={S.lbl}>Doctor's Name (optional)</label>
                  {inp(rxDoctor, setRxDoctor, 'e.g. Dr. Perera')}
                </div>
              </div>
            )}
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', marginTop:16 }}>
            <button onClick={()=>setStep(2)} style={{ padding:'10px 22px', background:'#f8f5ef', border:'1.5px solid #e0ddd6', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'#6b7280' }}>← Back</button>
            <button onClick={()=>{ setOrder(o=>({...o, deliver_date: o.deliver_date||defaultDeliverDate() })); setStep(4); }} style={{ padding:'10px 28px', background:'#0f1f3d', color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Next: Payment →</button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Payment & Delivery ── */}
      {step === 4 && (
        <div style={S.section}>
          <div style={S.sh}><span style={S.shico}>💰</span><span style={S.sht}>Payment & Delivery</span></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
            <div style={S.field}>
              <label style={S.lbl}>Total Amount (Rs.) <span style={S.req}>*</span></label>
              {inp(order.total_amount, v=>setOrder(o=>({...o,total_amount:v})), 'e.g. 8500', 'number')}
            </div>
            <div style={S.field}>
              <label style={S.lbl}>Advance Paid (Rs.)</label>
              {inp(order.advance_amount, v=>setOrder(o=>({...o,advance_amount:v})), 'e.g. 3000', 'number')}
            </div>
            <div style={{ background:'#0f1f3d', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'#c9a84c', marginBottom:4 }}>Balance Due</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:'white' }}>Rs. {balance.toLocaleString()}</div>
            </div>
          </div>

          <div style={{ ...S.grid2, marginBottom:14 }}>
            <div style={S.field}>
              <label style={S.lbl}>Delivery Date <span style={S.req}>*</span></label>
              <input type="date" value={order.deliver_date} onChange={e=>setOrder(o=>({...o,deliver_date:e.target.value}))} style={S.inp}/>
            </div>
            <div style={S.field}>
              <label style={S.lbl}>Order Status</label>
              <div style={{ display:'flex', gap:8, marginTop:2 }}>
                {['created','called','delivered'].map(s=>(
                  <button key={s} onClick={()=>setOrder(o=>({...o,status:s}))}
                    style={{ flex:1, padding:'10px 4px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                      border:`2px solid ${order.status===s?'#0f1f3d':'#e0ddd6'}`,
                      background: order.status===s?{created:'#dbeafe',called:'#fef9c3',delivered:'#dcfce7'}[s]:'white',
                      color:{created:'#1e40af',called:'#854d0e',delivered:'#2d7a4f'}[s],
                      outline: order.status===s?'3px solid #0f1f3d':'none', outlineOffset:2
                    }}>
                    {s==='created'?'📝 Created':s==='called'?'📞 Called':'✅ Delivered'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={S.field}>
            <label style={S.lbl}>Internal Notes</label>
            <textarea value={order.notes} onChange={e=>setOrder(o=>({...o,notes:e.target.value}))}
              placeholder="Any notes about this order..."
              style={{ ...S.inp, resize:'vertical', minHeight:70, lineHeight:1.6 }}/>
          </div>

          {/* Summary */}
          <div style={{ background:'#f8f5ef', borderRadius:10, padding:16, marginTop:16, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0f1f3d', marginBottom:10 }}>📋 Order Summary</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:13 }}>
              <div><span style={{color:'#6b7280'}}>Customer:</span> <b>{isNewCust ? newCust.name : selectedCust?.name}</b></div>
              <div><span style={{color:'#6b7280'}}>Phone:</span> <b>{isNewCust ? newCust.phone : selectedCust?.phone}</b></div>
              <div><span style={{color:'#6b7280'}}>Frame:</span> <b>{order.frame||'—'}</b></div>
              <div><span style={{color:'#6b7280'}}>Lens:</span> <b>{order.lens_type||'—'}</b></div>
              <div><span style={{color:'#6b7280'}}>Send to:</span> <b>{order.lens_company}</b></div>
              <div><span style={{color:'#6b7280'}}>Deliver:</span> <b>{order.deliver_date}</b></div>
              <div><span style={{color:'#6b7280'}}>Total:</span> <b>Rs. {parseFloat(order.total_amount||0).toLocaleString()}</b></div>
              <div><span style={{color:'#6b7280'}}>Balance:</span> <b style={{color: balance>0?'#c0392b':'#2d7a4f'}}>Rs. {balance.toLocaleString()}</b></div>
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
            <button onClick={()=>setStep(3)} style={{ padding:'11px 22px', background:'#f8f5ef', border:'1.5px solid #e0ddd6', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'#6b7280' }}>← Back</button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:'12px 32px', background: saving?'#6b7280':'#0f1f3d', color:'white', border:'none', borderRadius:9, fontSize:15, fontWeight:700, cursor: saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {saving ? '⏳ Saving...' : '💾 Save Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
