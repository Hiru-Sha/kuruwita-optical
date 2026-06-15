/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b' };
const fmt  = n => 'Rs. ' + Math.round(parseFloat(n)||0).toLocaleString('en-LK');

function apiGet(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json());
}
function apiPost(path, body) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)}).then(r=>r.json());
}

function RxInput({ label, sph, setSph, cyl, setCyl, add, setAdd, onCopyToOther }) {
  const [sphSign, setSphSign] = useState('-');
  const [cylSign, setCylSign] = useState('-');
  const handleSphChange = e => { const r=e.target.value.replace(/[^0-9.]/g,''); setSph(r?sphSign+r:''); };
  const handleCylChange = e => { const r=e.target.value.replace(/[^0-9.]/g,''); setCyl(r?cylSign+r:''); };
  const handleAddChange = e => { const r=e.target.value.replace(/[^0-9.]/g,''); if(setAdd) setAdd(r?'+'+r:''); };
  return (
    <div style={{ background:C.cream, borderRadius:12, padding:'12px 14px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.navy }}>{label}</div>
        {onCopyToOther && (
          <button onClick={onCopyToOther} style={{ fontSize:10, fontWeight:700, background:C.navy, color:C.gold, border:'none', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontFamily:'inherit' }}>
            Copy →
          </button>
        )}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {[['SPH',sph,setSph,sphSign,setSphSign,handleSphChange],['CYL',cyl,setCyl,cylSign,setCylSign,handleCylChange]].map(([lbl,val,set,sign,setSign,handler])=>(
          <div key={lbl}>
            <label style={{ fontSize:10, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>{lbl}</label>
            <div style={{ display:'flex', gap:4 }}>
              <div style={{ display:'flex', border:`1.5px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
                {['+','-'].map(s=>(
                  <button key={s} onClick={()=>{ setSign(s); if(val) set(s+val.replace(/[^0-9.]/g,'')); }}
                    style={{ padding:'8px 10px', border:'none', background:sign===s?C.navy:'white', color:sign===s?'white':C.muted, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>{s}</button>
                ))}
              </div>
              <input value={val.replace(/[^0-9.]/g,'')} onChange={handler} placeholder="0.00"
                style={{ flex:1, padding:'8px 10px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:14, fontFamily:'inherit', outline:'none', background:'white', color:C.navy }}/>
            </div>
          </div>
        ))}
      </div>
      {/* ADD — full width row below SPH/CYL */}
      <div style={{ marginTop:10 }}>
        <label style={{ fontSize:10, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>ADD (Near Addition)</label>
        <div style={{ display:'flex', gap:4, maxWidth:'50%' }}>
          <div style={{ display:'flex', border:`1.5px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
            <button style={{ padding:'8px 10px', border:'none', background:C.navy, color:'white', fontWeight:700, fontSize:14, cursor:'default', fontFamily:'inherit' }}>+</button>
          </div>
          <input value={(add||'').replace(/[^0-9.]/g,'')} onChange={handleAddChange} placeholder="0.00"
            style={{ flex:1, padding:'8px 10px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:14, fontFamily:'inherit', outline:'none', background:'white', color:C.navy }}/>
        </div>
      </div>
    </div>
  );
}

export default function LensCalculator() {
  const navigate = useNavigate();
  const [rSph,setRSph]=useState(''); const [rCyl,setRCyl]=useState(''); const [rAdd,setRAdd]=useState('');
  const [lSph,setLSph]=useState(''); const [lCyl,setLCyl]=useState(''); const [lAdd,setLAdd]=useState('');

  // DB lens prices
  const [dbPrices,   setDbPrices]   = useState([]);
  const [loadingDB,  setLoadingDB]  = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQ,    setSearchQ]    = useState('');

  // Add new price form
  const [showAdd,    setShowAdd]    = useState(false);
  const [addForm,    setAddForm]    = useState({ lens_type:'Bifocal', coating:'CR White', lens_index:'CR39', brand:'Negombo Optical', buy_price:'', sell_price:'' });
  const [addSaving,  setAddSaving]  = useState(false);
  const [addMsg,     setAddMsg]     = useState('');

  // Staff price list filters
  const [filterCoating, setFilterCoating] = useState('all');

  // Customer mode
  const [customerMode,   setCustomerMode]   = useState(false);
  const [selectedLens,   setSelectedLens]   = useState(null);
  const [editSellPrice,  setEditSellPrice]  = useState(''); // editable sell price before showing customer
  const [custFilterType, setCustFilterType] = useState('all');
  const [custFilterCoat, setCustFilterCoat] = useState('all');
  const [framePrice,     setFramePrice]     = useState('');
  const [discType,       setDiscType]       = useState('pct');
  const [discVal,        setDiscVal]        = useState('');

  const LENS_TYPES = ['all','Bifocal','Single Vision','Progressive','Office Lens','Reading (ready)'];
  const COATINGS   = ['CR White','Blue Cut','Photo Gray','HMC','Blue Cut + Photo Gray','Blue Cut + HMC','Photo Gray + HMC','Blue Cut + Photo Gray + HMC'];
  const SUPPLIERS  = ['Negombo Optical','Solex','Other'];

  const loadPrices = () => {
    setLoadingDB(true);
    apiGet('/lens-prices?active=true')
      .then(d => setDbPrices(Array.isArray(d)?d:[]))
      .catch(()=>setDbPrices([]))
      .finally(()=>setLoadingDB(false));
  };

  useEffect(()=>{ loadPrices(); },[]);

  // Index & CYL recommendations
  const powers = [rSph,rCyl,lSph,lCyl].map(v=>Math.abs(parseFloat(v)||0));
  const maxPow = Math.max(...powers);
  const hasAdd = parseFloat(rAdd||0)>0 || parseFloat(lAdd||0)>0;
  const rec = maxPow===0?null:maxPow<=2?'1.56 is fine':maxPow<=4?'1.61 recommended — thinner':maxPow<=6?'1.67 recommended — high power':'1.74 recommended — very high power';
  const addRec = hasAdd ? `ADD: ${rAdd||lAdd} — Bifocal or Progressive lens needed` : null;
  const maxCyl = Math.max(Math.abs(parseFloat(rCyl)||0),Math.abs(parseFloat(lCyl)||0));
  const cylWarn = maxCyl>=1.5?`High CYL (${maxCyl.toFixed(2)}) — toric lens`:null;

  // Filter DB prices
  const COATING_FILTERS = ['all','CR White','Blue Cut','Photo Gray','HMC','Blue Cut + Photo Gray','Blue Cut + HMC','Photo Gray + HMC'];
  const filtered = dbPrices.filter(p => {
    if (filterType!=='all' && p.lens_type!==filterType) return false;
    if (filterCoating!=='all' && !(p.coating||'').toLowerCase().includes(filterCoating.toLowerCase())) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return (p.lens_type||'').toLowerCase().includes(q) ||
             (p.coating||'').toLowerCase().includes(q) ||
             (p.brand||'').toLowerCase().includes(q) ||
             (p.lens_index||'').toLowerCase().includes(q);
    }
    return true;
  });

  // Customer calc — use edited sell price if staff has overridden it
  const lensPrice   = selectedLens ? (editSellPrice!==''?parseFloat(editSellPrice)||0:parseFloat(selectedLens.sell_price||0)) : 0;
  const framePriceN = parseFloat(framePrice)||0;
  const subTotal    = lensPrice + framePriceN;
  const discAmt     = discType==='pct' ? Math.round(subTotal*(parseFloat(discVal)||0)/100) : parseFloat(discVal)||0;
  const totalPrice  = Math.max(0,subTotal-discAmt);

  const handleAddPrice = async () => {
    if (!addForm.buy_price || !addForm.sell_price) return setAddMsg('Enter both buy and sell price');
    setAddSaving(true); setAddMsg('');
    try {
      await apiPost('/lens-prices/learn', {
        brand:      addForm.brand,
        lens_type:  addForm.lens_type,
        lens_index: addForm.lens_index,
        color:      'White',
        coating:    addForm.coating,
        buy_price:  parseFloat(addForm.buy_price),
        sell_price: parseFloat(addForm.sell_price),
        notes:      'Added manually from calculator',
      });
      setAddMsg('Saved!');
      setAddForm(f=>({...f,buy_price:'',sell_price:''}));
      loadPrices();
      setTimeout(()=>{ setShowAdd(false); setAddMsg(''); },1000);
    } catch(e) { setAddMsg('Failed to save'); }
    finally { setAddSaving(false); }
  };

  // ── Customer view ──────────────────────────────────────────────
  if (customerMode) {
    const CUST_COAT_FILTERS = ['all','CR White','Blue Cut','Photo Gray','HMC'];
    const CUST_TYPE_FILTERS = ['all','Bifocal','Single Vision','Progressive','Office Lens','Reading (ready)'];
    const showable = dbPrices.filter(p => {
      if (!p.sell_price) return false;
      if (custFilterType!=='all' && p.lens_type!==custFilterType) return false;
      if (custFilterCoat!=='all' && !(p.coating||'').toLowerCase().includes(custFilterCoat.toLowerCase())) return false;
      return true;
    });
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f1f3d 0%,#1a3260 100%)',
        fontFamily:"'DM Sans',sans-serif", padding:20, display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ textAlign:'center', marginBottom:14, marginTop:10 }}>
          <div style={{ fontSize:11, color:C.gold, letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 }}>Wickramakalutota Opticals</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'white', fontWeight:700 }}>Lens Price Guide</div>
          {rec && <div style={{ fontSize:12, color:'#ede9e0', marginTop:4 }}>Recommendation: {rec}</div>}
        </div>
        <div style={{ width:'100%', maxWidth:420 }}>

          {/* Staff-only: filter chips + edit sell price — shown before customer sees */}
          <div style={{ background:'rgba(255,255,255,.08)', borderRadius:12, padding:'10px 12px', marginBottom:14, border:'1px solid rgba(255,255,255,.15)' }}>
            <div style={{ fontSize:10, color:C.gold, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Staff: Filter & Set Price</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
              {CUST_TYPE_FILTERS.map(t=>(
                <button key={t} onClick={()=>{ setCustFilterType(t); setSelectedLens(null); setEditSellPrice(''); }}
                  style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:'none',
                    background:custFilterType===t?C.gold:'rgba(255,255,255,.15)', color:custFilterType===t?C.navy:'white' }}>
                  {t==='all'?'All Types':t}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:selectedLens?10:0 }}>
              {CUST_COAT_FILTERS.map(c=>(
                <button key={c} onClick={()=>{ setCustFilterCoat(c); setSelectedLens(null); setEditSellPrice(''); }}
                  style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:'none',
                    background:custFilterCoat===c?C.gold:'rgba(255,255,255,.15)', color:custFilterCoat===c?C.navy:'white' }}>
                  {c==='all'?'All Coatings':c}
                </button>
              ))}
            </div>
            {selectedLens && (
              <div style={{ marginTop:8 }}>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginBottom:4, fontWeight:600 }}>
                  Edit sell price before showing (list price: Rs. {Math.round(selectedLens.sell_price).toLocaleString()})
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ color:'rgba(255,255,255,.7)', fontSize:13 }}>Rs.</span>
                  <input type="number" value={editSellPrice} onChange={e=>setEditSellPrice(e.target.value)}
                    placeholder={String(Math.round(selectedLens.sell_price))}
                    style={{ flex:1, padding:'8px 10px', border:'1.5px solid rgba(201,168,76,.6)', borderRadius:8, fontSize:14, fontWeight:700, fontFamily:'inherit', outline:'none', background:'rgba(255,255,255,.1)', color:'white' }}/>
                  {editSellPrice && <button onClick={()=>setEditSellPrice('')}
                    style={{ background:'rgba(255,255,255,.15)', border:'none', borderRadius:7, padding:'7px 10px', cursor:'pointer', color:'white', fontSize:12, fontFamily:'inherit' }}>Reset</button>}
                </div>
              </div>
            )}
          </div>

          <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:10, textAlign:'center' }}>
            {showable.length} lens option{showable.length!==1?'s':''} — tap to select
          </div>
          {showable.map((p,i) => {
            const isSel = selectedLens?.id===p.id;
            const displayPrice = isSel && editSellPrice!=='' ? parseFloat(editSellPrice)||0 : parseFloat(p.sell_price||0);
            return (
              <button key={i} onClick={()=>{ setSelectedLens(isSel?null:p); if(!isSel) setEditSellPrice(''); }}
                style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'12px 16px', marginBottom:8, borderRadius:14, cursor:'pointer', fontFamily:'inherit',
                  border:`2px solid ${isSel?C.gold:'rgba(255,255,255,.2)'}`,
                  background:isSel?C.gold:'rgba(255,255,255,.08)', color:isSel?C.navy:'white', transition:'all .15s' }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700 }}>{p.lens_type}</div>
                  <div style={{ fontSize:11, opacity:.75 }}>{p.coating}{p.lens_index?` · ${p.lens_index}`:''}{p.brand?` · ${p.brand}`:''}</div>
                </div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700 }}>{fmt(displayPrice)}</div>
              </button>
            );
          })}
          {selectedLens && (
            <div style={{ background:'white', borderRadius:18, padding:20, marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:14, textAlign:'center' }}>
                {selectedLens.lens_type} — {selectedLens.coating}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${C.border}`, fontSize:14 }}>
                <span style={{ color:C.muted }}>Lens (pair)</span>
                <span style={{ fontWeight:700, color:C.navy }}>{fmt(lensPrice)}</span>
              </div>
              <div style={{ padding:'12px 0', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:12, color:C.muted, marginBottom:6, fontWeight:600 }}>Add Frame Price (Rs.)</div>
                <input type="number" value={framePrice} onChange={e=>setFramePrice(e.target.value)} placeholder="0"
                  style={{ width:'100%', padding:'10px 12px', border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:16, fontFamily:'inherit', outline:'none', color:C.navy, fontWeight:700 }}/>
              </div>
              <div style={{ padding:'12px 0', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:12, color:C.muted, marginBottom:8, fontWeight:600 }}>Discount</div>
                <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                  {[['pct','% Percent'],['amt','Rs. Amount']].map(([v,l])=>(
                    <button key={v} onClick={()=>setDiscType(v)} style={{ flex:1, padding:'8px', borderRadius:8, border:`1.5px solid ${discType===v?C.navy:C.border}`, background:discType===v?C.navy:'white', color:discType===v?'white':C.muted, fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>{l}</button>
                  ))}
                </div>
                <input type="number" value={discVal} onChange={e=>setDiscVal(e.target.value)} placeholder="0"
                  style={{ width:'100%', padding:'10px 12px', border:`1.5px solid ${discAmt>0?C.danger:C.border}`, borderRadius:10, fontSize:16, fontFamily:'inherit', outline:'none', color:C.danger, fontWeight:700 }}/>
              </div>
              {(framePriceN>0||discAmt>0) && (
                <div style={{ padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
                  {framePriceN>0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}><span style={{ color:C.muted }}>Frame + Lens</span><span style={{ color:C.navy, fontWeight:600 }}>{fmt(subTotal)}</span></div>}
                  {discAmt>0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:C.danger }}><span>Discount</span><span>- {fmt(discAmt)}</span></div>}
                </div>
              )}
              <div style={{ background:C.navy, borderRadius:12, padding:'16px', marginTop:12, textAlign:'center' }}>
                <div style={{ fontSize:11, color:C.gold, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>{framePriceN>0?'Total Price':'Lens Price'}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontWeight:700, color:'white' }}>{fmt(totalPrice)}</div>
              </div>
            </div>
          )}
        </div>
        <button onClick={()=>setCustomerMode(false)} style={{ padding:'11px 28px', background:'rgba(255,255,255,.15)', border:'1.5px solid rgba(255,255,255,.3)', color:'white', borderRadius:10, fontSize:13, cursor:'pointer', fontFamily:'inherit', marginBottom:20 }}>← Back</button>
      </div>
    );
  }

  // ── Staff view ────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:620, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <button onClick={()=>navigate('/dashboard')} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:13, fontFamily:'inherit', padding:0, display:'block', marginBottom:4 }}>← Dashboard</button>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.navy, margin:0 }}>Lens Calculator</h1>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>setShowAdd(s=>!s)} style={{ padding:'8px 14px', background:showAdd?'#fee2e2':C.cream, border:`1px solid ${showAdd?'#fca5a5':C.border}`, color:showAdd?C.danger:C.navy, borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {showAdd?'✕ Cancel':'+ Add Price'}
          </button>
          <button onClick={()=>setCustomerMode(true)} style={{ padding:'8px 14px', background:C.navy, color:C.gold, border:'none', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            Show Customer
          </button>
        </div>
      </div>

      {/* Rx */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px', marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:12 }}>Patient Rx</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <RxInput label="Right Eye (OD)" sph={rSph} setSph={setRSph} cyl={rCyl} setCyl={setRCyl} add={rAdd} setAdd={setRAdd} onCopyToOther={()=>{setLSph(rSph);setLCyl(rCyl);setLAdd(rAdd);}}/>
          <RxInput label="Left Eye (OS)"  sph={lSph} setSph={setLSph} cyl={lCyl} setCyl={setLCyl} add={lAdd} setAdd={setLAdd} onCopyToOther={()=>{setRSph(lSph);setRCyl(lCyl);setRAdd(lAdd);}}/>
        </div>
        {rec    && <div style={{ marginTop:10, background:'#eff6ff', border:'1px solid #bae6fd', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#1e40af' }}>Recommendation: {rec}</div>}
        {addRec && <div style={{ marginTop:6, background:'#f0fdf4', border:'1px solid #86efac', borderRadius:8, padding:'7px 12px', fontSize:12, color:'#166534', fontWeight:600 }}>{addRec}</div>}
        {cylWarn && <div style={{ marginTop:6, background:'#fef9c3', border:'1px solid #fde68a', borderRadius:8, padding:'7px 12px', fontSize:12, color:'#92400e' }}>High CYL: {cylWarn}</div>}
      </div>

      {/* Add price form */}
      {showAdd && (
        <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:14, padding:'16px 18px', marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#166534', marginBottom:12 }}>Add New Lens Price to List</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Lens Type</label>
              <select value={addForm.lens_type} onChange={e=>setAddForm(f=>({...f,lens_type:e.target.value}))}
                style={{ width:'100%', padding:'9px 10px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}>
                {['Bifocal','Single Vision','Progressive','Office Lens','Reading (ready)'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Coating</label>
              <select value={addForm.coating} onChange={e=>setAddForm(f=>({...f,coating:e.target.value}))}
                style={{ width:'100%', padding:'9px 10px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}>
                {COATINGS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Index</label>
              <select value={addForm.lens_index} onChange={e=>setAddForm(f=>({...f,lens_index:e.target.value}))}
                style={{ width:'100%', padding:'9px 10px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}>
                {['CR39','1.49','1.56','1.59','1.6','1.61','1.67','1.74','Poly'].map(x=><option key={x}>{x}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Supplier</label>
              <select value={addForm.brand} onChange={e=>setAddForm(f=>({...f,brand:e.target.value}))}
                style={{ width:'100%', padding:'9px 10px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}>
                {SUPPLIERS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Buy Price (Rs.) — what you pay</label>
              <input type="number" value={addForm.buy_price} onChange={e=>setAddForm(f=>({...f,buy_price:e.target.value}))} placeholder="e.g. 1200"
                style={{ width:'100%', padding:'9px 10px', border:`1.5px solid #86efac`, borderRadius:8, fontSize:14, fontWeight:700, fontFamily:'inherit', outline:'none', background:'white', color:C.navy }}/>
            </div>
            <div>
              <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Sell Price (Rs.) — charge to customer</label>
              <input type="number" value={addForm.sell_price} onChange={e=>setAddForm(f=>({...f,sell_price:e.target.value}))} placeholder="e.g. 2500"
                style={{ width:'100%', padding:'9px 10px', border:`1.5px solid #93c5fd`, borderRadius:8, fontSize:14, fontWeight:700, fontFamily:'inherit', outline:'none', background:'white', color:C.navy }}/>
            </div>
          </div>
          {addForm.buy_price && addForm.sell_price && (
            <div style={{ background:'white', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:12 }}>
              Margin: <b style={{ color:parseFloat(addForm.sell_price)-parseFloat(addForm.buy_price)>0?C.success:C.danger }}>
                Rs. {(parseFloat(addForm.sell_price||0)-parseFloat(addForm.buy_price||0)).toLocaleString()} ({Math.round((parseFloat(addForm.sell_price||0)-parseFloat(addForm.buy_price||0))/parseFloat(addForm.sell_price||1)*100)}%)
              </b>
            </div>
          )}
          {addMsg && <div style={{ fontSize:12, color:addMsg==='Saved!'?C.success:C.danger, marginBottom:8, fontWeight:700 }}>{addMsg}</div>}
          <button onClick={handleAddPrice} disabled={addSaving}
            style={{ padding:'10px 24px', background:addSaving?C.muted:C.success, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:addSaving?'not-allowed':'pointer', fontFamily:'inherit' }}>
            {addSaving?'Saving...':'Save to Price List'}
          </button>
        </div>
      )}

      {/* Lens price list from DB */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px', marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted }}>
            Lens Price List {filtered.length>0&&<span style={{ color:C.navy, fontWeight:800 }}>({filtered.length})</span>}
          </div>
          <button onClick={loadPrices} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:12, fontFamily:'inherit' }}>↻ Refresh</button>
        </div>

        {/* Search + filter */}
        <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap' }}>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search..."
            style={{ flex:1, minWidth:120, padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream }}/>
          <select value={filterType} onChange={e=>setFilterType(e.target.value)}
            style={{ padding:'8px 10px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream }}>
            {LENS_TYPES.map(t=><option key={t} value={t}>{t==='all'?'All Types':t}</option>)}
          </select>
        </div>
        {/* Coating filter chips */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          {COATING_FILTERS.map(c=>(
            <button key={c} onClick={()=>setFilterCoating(c)}
              style={{ padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                border:`1.5px solid ${filterCoating===c?C.navy:C.border}`,
                background:filterCoating===c?C.navy:'white', color:filterCoating===c?'white':C.muted }}>
              {c==='all'?'All Coatings':c}
            </button>
          ))}
        </div>

        {loadingDB ? (
          <div style={{ textAlign:'center', padding:'20px 0', color:C.muted, fontSize:13 }}>Loading prices...</div>
        ) : filtered.length===0 ? (
          <div style={{ textAlign:'center', padding:'20px 0', color:C.muted, fontSize:13 }}>
            No prices yet. Add prices above or they'll be auto-saved when you update order costs.
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 0.8fr 0.8fr 1fr 1fr', gap:6, padding:'6px 8px', background:C.cream, borderRadius:8, marginBottom:4 }}>
              {['Lens Type','Coating','Index','Supplier','Buy Price','Sell Price'].map(h=>(
                <div key={h} style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, letterSpacing:'0.5px' }}>{h}</div>
              ))}
            </div>
            {filtered.map((p,i)=>{
              const margin = p.buy_price>0 ? Math.round((p.sell_price-p.buy_price)/p.sell_price*100) : null;
              return (
                <div key={p.id||i} style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 0.8fr 0.8fr 1fr 1fr', gap:6,
                  padding:'9px 8px', borderBottom:`1px solid ${C.cream}`, alignItems:'center',
                  background:i%2===0?'white':'#fafaf9' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{p.lens_type}</div>
                  <div style={{ fontSize:12, color:C.muted }}>{p.coating||'—'}</div>
                  <div style={{ fontSize:12, color:C.muted }}>{p.lens_index||'—'}</div>
                  <div style={{ fontSize:12, color:C.muted }}>{p.brand||'—'}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.success }}>Rs. {Math.round(p.buy_price||0).toLocaleString()}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>Rs. {Math.round(p.sell_price||0).toLocaleString()}</div>
                    {margin!==null && <div style={{ fontSize:10, color:margin>=30?C.success:margin>=15?'#b45309':C.danger, fontWeight:600 }}>{margin}% margin</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button onClick={()=>setCustomerMode(true)}
        style={{ width:'100%', padding:'14px', background:C.gold, color:C.navy, border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
        Show Price to Customer
      </button>
    </div>
  );
}