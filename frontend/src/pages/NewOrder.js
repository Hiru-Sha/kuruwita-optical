// ============================================================
//  NewOrder.js — Updated with Dropdowns, Stock Search, and New Layout
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCustomer, createOrder, getCustomers, getInventory } from '../api';

const S = {
  page:    { fontFamily:"'DM Sans',sans-serif" },
  title:   { fontFamily:"'Playfair Display',serif", fontSize:22, color:'#0f1f3d', margin:'0 0 4px' },
  sub:     { fontSize:13, color:'#6b7280', margin:'0 0 24px' },
  section: { background:'white', border:'1px solid #e0ddd6', borderRadius:14, padding:'20px 22px', marginBottom:16 },
  sh:      { display:'flex', alignItems:'center', gap:8, marginBottom:16 },
  shico:   { fontSize:18 },
  sht:     { fontSize:15, fontWeight:700, color:'#0f1f3d' },
  grid2:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  field:   { display:'flex', flexDirection:'column', gap:4 },
  lbl:     { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:'#6b7280' },
  inp:     { padding:'10px 13px', border:'1.5px solid #e0ddd6', borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:'#f8f5ef', color:'#1a1a2e' },
  req:     { color:'#c0392b' },
};

// Dropdown Constants
const TITLES = ['Mr.', 'Mrs.', 'Master', 'Miss', 'Baby', 'Rev.'];
const SIGNS = ['+', '-'];
const AXIS_OPTIONS = Array.from({ length: 181 }, (_, i) => i.toString());
const VA_OPTIONS = ['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', 'CF', 'PL'];
const DIOPTER_OPTIONS = ['0.00', ...Array.from({ length: 80 }, (_, i) => ((i + 1) * 0.25).toFixed(2))];
const FRAME_TYPES = ['Full rim', 'Half rim', 'Rimless', 'Sunglass'];
const FRAME_MATERIALS = ['Plastic', 'Metal', 'TR90', 'Titanium'];
const LENS_TYPES = ['Single Vision', 'Bifocal', 'Progressive', 'Office Lens'];
const LENS_COATINGS = ['Hard Coat', 'HMC', 'Blue Filter', 'Photochromic', 'Blue Filter + Photochromic'];

export default function NewOrder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  // Customer State
  const [cust, setCust] = useState({ title: 'Mr.', name: '', phone: '', age: '' });
  const [custSearch, setCustSearch] = useState('');
  const [custResults, setCustResults] = useState([]);
  const [selectedCust, setSelectedCust] = useState(null);

  // Refraction State
  const [ref, setRef] = useState({
    r_sph_s:'+', r_sph:'0.00', r_cyl_s:'+', r_cyl:'0.00', r_axis:'0', r_add:'0.00', r_va:'6/6', r_pd:'',
    l_sph_s:'+', l_sph:'0.00', l_cyl_s:'+', l_cyl:'0.00', l_axis:'0', l_add:'0.00', l_va:'6/6', l_pd:'',
    notes:'', hasRx:false, rx_hospital:'', rx_date:'', rx_doctor:''
  });

  // Frame/Lens State
  const [order, setOrder] = useState({
    stock_id: null, frame_name:'', frame_type:'Full rim', frame_material:'Plastic',
    lens_type:'Single Vision', lens_coating:'HMC',
    total_amount:0, advance_amount:0, deliver_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], status:'created', notes:''
  });
  const [stockResults, setStockResults] = useState([]);

  // Search Logic
  const handleFrameSearch = async (q) => {
    setOrder(o=>({...o, frame_name: q}));
    if (q.length < 2) return setStockResults([]);
    const res = await getInventory({ search: q });
    setStockResults(res.data.filter(i => i.category === 'Frames' && i.quantity > 0));
  };

  const selectFrame = (item) => {
    setOrder(o=>({...o, frame_name: item.name, stock_id: item.id, total_amount: item.sell_price}));
    setStockResults([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let customerId = selectedCust?.id;
      if (!customerId) {
        const res = await createCustomer({ name: `${cust.title} ${cust.name}`, phone: cust.phone, age: cust.age });
        customerId = res.data.id;
      }
      await createOrder({ customer_id: customerId, ...order, ...ref });
      navigate('/orders');
    } catch (e) { alert('Failed to save'); } finally { setSaving(false); }
  };

  return (
    <div style={S.page}>
      <h1 style={S.title}>➕ New Order</h1>
      
      {/* STEP 1: CUSTOMER */}
      {step === 1 && (
        <div style={S.section}>
          <h3 style={S.sht}>👤 Customer Details</h3>
          <div style={{...S.grid2, gap:15}}>
            <div style={S.field}>
              <label style={S.lbl}>Title</label>
              <select value={cust.title} onChange={e=>setCust(c=>({...c,title:e.target.value}))} style={S.inp}>{TITLES.map(t=><option key={t}>{t}</option>)}</select>
            </div>
            <div style={S.field}><label style={S.lbl}>Full Name</label><input value={cust.name} onChange={e=>setCust(c=>({...c,name:e.target.value}))} style={S.inp}/></div>
            <div style={S.field}><label style={S.lbl}>Phone</label><input value={cust.phone} onChange={e=>setCust(c=>({...c,phone:e.target.value}))} style={S.inp}/></div>
            <div style={S.field}><label style={S.lbl}>Age</label><input value={cust.age} onChange={e=>setCust(c=>({...c,age:e.target.value}))} style={S.inp}/></div>
          </div>
          <button onClick={()=>setStep(2)} style={{marginTop:20, padding:'10px 20px', background:'#0f1f3d', color:'white', borderRadius:9, border:'none', cursor:'pointer'}}>Next: Refraction →</button>
        </div>
      )}

      {/* STEP 2: REFRACTION */}
      {step === 2 && (
        <div style={S.section}>
          <h3 style={S.sht}>🔭 Refraction Results</h3>
          {[
            {l:'Right Eye', p:'r'},
            {l:'Left Eye', p:'l'}
          ].map(eye => (
            <div key={eye.p} style={{marginBottom:15, padding:10, border:'1px solid #f0f0f0'}}>
              <div style={{fontWeight:700, marginBottom:8}}>{eye.l}</div>
              <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
                {['sph','cyl'].map(f => (
                  <div key={f} style={S.field}>
                    <label style={S.lbl}>{f.toUpperCase()}</label>
                    <div style={{display:'flex', gap:2}}>
                      <select value={ref[eye.p+'_'+f+'_s']} onChange={e=>setRef(r=>({...r,[eye.p+'_'+f+'_s']:e.target.value}))} style={S.inp}>{SIGNS.map(s=><option key={s}>{s}</option>)}</select>
                      <select value={ref[eye.p+'_'+f]} onChange={e=>setRef(r=>({...r,[eye.p+'_'+f]:e.target.value}))} style={S.inp}>{DIOPTER_OPTIONS.map(v=><option key={v}>{v}</option>)}</select>
                    </div>
                  </div>
                ))}
                <div style={S.field}><label style={S.lbl}>Axis</label><select value={ref[eye.p+'_axis']} onChange={e=>setRef(r=>({...r,[eye.p+'_axis']:e.target.value}))} style={S.inp}>{AXIS_OPTIONS.map(v=><option key={v}>{v}</option>)}</select></div>
                <div style={S.field}><label style={S.lbl}>V/A</label><select value={ref[eye.p+'_va']} onChange={e=>setRef(r=>({...r,[eye.p+'_va']:e.target.value}))} style={S.inp}>{VA_OPTIONS.map(v=><option key={v}>{v}</option>)}</select></div>
              </div>
            </div>
          ))}
          <button onClick={()=>setRef(r=>({...r, l_sph:r.r_sph, l_cyl:r.r_cyl, l_axis:r.r_axis, l_add:r.r_add, l_va:r.r_va}))} style={{background:'#e0ddd6', padding:5, fontSize:11}}>Same as Right Eye</button>
          
          <div style={{marginTop:20}}>
            <label style={{display:'flex', alignItems:'center', gap:8}}><input type="checkbox" checked={ref.hasRx} onChange={e=>setRef(r=>({...r,hasRx:e.target.checked}))}/> Customer brought own prescription</label>
          </div>
          <button onClick={()=>setStep(3)} style={{marginTop:20, padding:'10px 20px', background:'#0f1f3d', color:'white', borderRadius:9, border:'none', cursor:'pointer'}}>Next: Frame & Lens →</button>
        </div>
      )}

      {/* STEP 3: FRAME & LENS */}
      {step === 3 && (
        <div style={S.section}>
          <h3 style={S.sht}>🕶️ Frame & Lens</h3>
          <div style={S.field}>
            <label style={S.lbl}>Search Frame</label>
            <input value={order.frame_name} onChange={e=>handleFrameSearch(e.target.value)} style={S.inp}/>
            {stockResults.map(i=>(
              <div key={i.id} onClick={()=>selectFrame(i)} style={{padding:10, cursor:'pointer', border:'1px solid #ccc'}}>{i.name} - Rs.{i.sell_price}</div>
            ))}
          </div>
          <div style={S.grid2}>
            <div style={S.field}><label style={S.lbl}>Type</label><select value={order.frame_type} onChange={e=>setOrder(o=>({...o,frame_type:e.target.value}))} style={S.inp}>{FRAME_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
            <div style={S.field}><label style={S.lbl}>Material</label><select value={order.frame_material} onChange={e=>setOrder(o=>({...o,frame_material:e.target.value}))} style={S.inp}>{FRAME_MATERIALS.map(m=><option key={m}>{m}</option>)}</select></div>
          </div>
          <button onClick={()=>setStep(4)} style={{marginTop:20, padding:'10px 20px', background:'#0f1f3d', color:'white', borderRadius:9, border:'none', cursor:'pointer'}}>Next: Payment →</button>
        </div>
      )}

      {/* STEP 4: PAYMENT (Keep your existing Payment structure) */}
    </div>
  );
}

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
