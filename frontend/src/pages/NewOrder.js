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
  suggest:  { position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #e0ddd6', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.1)', zIndex:50 }
};

const TITLES = ['Mr', 'Mrs', 'Rev', 'Baby', 'Master', 'Dr'];
const AGES = Array.from({ length: 100 }, (_, i) => i + 1);
const AXIS_VALS = Array.from({ length: 181 }, (_, i) => i);

export default function NewOrder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [newCust, setNewCust] = useState({ title: 'Mr', name: '', age: '25', phone: '' });
  
  const [ref, setRef] = useState({
    r_sph:'', r_cyl:'', r_axis:'', r_add:'', r_va:'',
    l_sph:'', l_cyl:'', l_axis:'', l_add:'', l_va:''
  });

  // Helper: Copy Right to Left
  const copyRightToLeft = () => {
    setRef(prev => ({
      ...prev,
      l_sph: prev.r_sph, l_cyl: prev.r_cyl, l_axis: prev.r_axis, l_add: prev.r_add, l_va: prev.r_va
    }));
  };

  const RefInput = ({ p, field }) => (
    <div style={{ display: 'flex', gap: 2 }}>
      {field.includes('sph') || field.includes('cyl') ? (
        <select style={{...S.inp, padding: '5px'}} value={ref[`${p}_${field}_sign`] || '+'} onChange={e=>setRef({...ref, [`${p}_${field}_sign`]:e.target.value})}>
          <option>+</option><option>-</option>
        </select>
      ) : null}
      <input type="number" step="0.25" style={{...S.inp, width:'60px', textAlign:'center'}} 
             value={ref[`${p}_${field}`]} onChange={e=>setRef({...ref, [`${p}_${field}`]:e.target.value})}/>
    </div>
  );

  return (
    <div style={S.page}>
      <h1 style={S.title}>➕ New Order</h1>
      
      {/* STEP 1: CUSTOMER */}
      {step === 1 && (
        <div style={S.section}>
          <div style={S.sh}><span style={S.shico}>👤</span><span style={S.sht}>Customer Info</span></div>
          <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 80px 1fr', gap:10 }}>
            <div style={S.field}><label style={S.lbl}>Title</label>
              <select style={S.inp} value={newCust.title} onChange={e=>setNewCust({...newCust, title:e.target.value})}>{TITLES.map(t=><option key={t}>{t}</option>)}</select>
            </div>
            <div style={S.field}><label style={S.lbl}>Name</label><input style={S.inp} value={newCust.name} onChange={e=>setNewCust({...newCust, name:e.target.value})}/></div>
            <div style={S.field}><label style={S.lbl}>Age</label>
              <select style={S.inp} value={newCust.age} onChange={e=>setNewCust({...newCust, age:e.target.value})}>{AGES.map(a=><option key={a}>{a}</option>)}</select>
            </div>
            <div style={S.field}><label style={S.lbl}>Phone</label><input style={S.inp} value={newCust.phone} onChange={e=>setNewCust({...newCust, phone:e.target.value})}/></div>
          </div>
          <button onClick={()=>setStep(2)} style={{ marginTop:20, padding:'10px 20px', background:'#0f1f3d', color:'white', borderRadius:9 }}>Next →</button>
        </div>
      )}

      {/* STEP 2: REFRACTION */}
      {step === 2 && (
        <div style={S.section}>
          <div style={S.sh}>
            <span style={S.shico}>🔭</span><span style={S.sht}>Refraction Results</span>
            <button onClick={copyRightToLeft} style={{ marginLeft:'auto', fontSize:11, padding:'4px 8px', cursor:'pointer' }}>Copy R → L</button>
          </div>
          <table style={{ width:'100%' }}>
            <thead><tr><th>Eye</th><th>SPH</th><th>CYL</th><th>AXIS</th><th>ADD</th></tr></thead>
            <tbody>
              {['r', 'l'].map(p => (
                <tr key={p}>
                  <td style={{fontWeight:700}}>{p.toUpperCase()}</td>
                  <td><RefInput p={p} field="sph"/></td>
                  <td><RefInput p={p} field="cyl"/></td>
                  <td>
                    <input list="axis-list" style={{...S.inp, width:'60px'}} value={ref[`${p}_axis`]} onChange={e=>setRef({...ref, [`${p}_axis`]:e.target.value})}/>
                    <datalist id="axis-list">{AXIS_VALS.map(v=><option key={v} value={v}/>)}</datalist>
                  </td>
                  <td><input type="number" style={{...S.inp, width:'60px'}} value={ref[`${p}_add`]} onChange={e=>setRef({...ref, [`${p}_add`]:e.target.value})}/></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={()=>setStep(3)} style={{ marginTop:20, padding:'10px 20px', background:'#0f1f3d', color:'white', borderRadius:9 }}>Next →</button>
        </div>
      )}
    </div>
  );
}