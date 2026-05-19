/* eslint-disable */
// Remove number input spinners globally
if (typeof document !== 'undefined' && !document.getElementById('ko-no-spinners')) {
  const s = document.createElement('style');
  s.id = 'ko-no-spinners';
  s.textContent = 'input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}input[type=number]{-moz-appearance:textfield}';
  document.head.appendChild(s);
}
// ============================================================
//  NewOrder.js — Complete with all patches applied correctly
//  ✅ QR Scanner integrated
//  ✅ Lens price lookup from database
//  ✅ Frame color, inventory ID, seg heights
//  ✅ CR (White) coating, lens index selector
//  ✅ Frame photo on selection
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createCustomer, createOrder, getCustomers, getInventory } from '../api';
import { QRScanner } from '../components/QRStickers';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f',
  danger:'#c0392b', white:'#ffffff',
};

const TITLES       = ['Mr.','Mrs.','Miss','Master','Baby','Rev.','Dr.'];
const DIOPTERS     = ['0.00',...Array.from({length:80},(_,i)=>((i+1)*0.25).toFixed(2))];
const AXES         = Array.from({length:181},(_,i)=>String(i));
const VA_OPTIONS   = ['6/6','6/9','6/12','6/18','6/24','6/36','6/60','CF','HM','PL'];
const FRAME_TYPES  = ['Full rim','Half rim','Rimless','Sunglass'];
const FRAME_MATS   = ['Plastic','Metal','TR90','Titanium','Acetate'];
const FRAME_COLORS = ['Black','Gold','Silver','Brown','Gunmetal','Blue','Red','Pink','Tortoise','Crystal','Other'];
const LENS_TYPES   = ['Single Vision','Bifocal','Progressive','Office Lens','Reading (ready)'];
const LENS_COATINGS= ['CR (White)','HMC','Hard Coat','Blue Filter','Photochromic','Blue + Photochromic','AR Coat'];
const LENS_INDEXES = ['Default','1.49','1.56','1.61','1.67','1.74'];

const fmtMoney = (n) => 'Rs. '+parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});

// ── Step bar ──────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Customer','Refraction','Frame & Lens','Payment'];
  return (
    <div style={{ display:'flex', alignItems:'center', background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 20px', marginBottom:20, overflowX:'auto' }}>
      {steps.map((s,i) => {
        const n=i+1; const done=step>n; const active=step===n;
        return (
          <React.Fragment key={s}>
            <div style={{ display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap' }}>
              <div style={{ width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0, background:done?C.success:active?C.navy:C.cream, color:done||active?'white':C.muted, border:`2px solid ${done?C.success:active?C.navy:C.border}` }}>
                {done?'✓':n}
              </div>
              <span style={{ fontSize:13, fontWeight:active?700:500, color:active?C.navy:done?C.success:C.muted }}>{s}</span>
            </div>
            {i<steps.length-1 && <div style={{ flex:1, height:2, background:step>n?C.success:C.border, margin:'0 10px', minWidth:20 }}/>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const Field = ({ label, children }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
    <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted }}>{label}</label>
    {children}
  </div>
);

const INP = { padding:'10px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%' };
const SEL = { ...INP, cursor:'pointer' };

// ═══════════════════════════════════════════════════════════════
export default function NewOrder() {
  const navigate = useNavigate();
  const [step,   setStep]   = useState(1);
  const location = useLocation();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  // ── Customer ─────────────────────────────────────────────
  const [custMode,     setCustMode]     = useState('search');
  const [custSearch,   setCustSearch]   = useState('');
  const [custResults,  setCustResults]  = useState([]);
  const [selectedCust, setSelectedCust] = useState(null);
  const [newCust, setNewCust] = useState({ title:'Mr.', name:'', phone:'', age:'' });
  const searchTimer = useRef(null);

  // ── Refraction ───────────────────────────────────────────
  const [ref, setRef] = useState({
    r_sph_s:'-', r_sph:'0.00', r_cyl_s:'-', r_cyl:'0.00', r_axis:'0', r_add:'0.00', r_va:'6/6', r_pd:'',
    l_sph_s:'-', l_sph:'0.00', l_cyl_s:'-', l_cyl:'0.00', l_axis:'0', l_add:'0.00', l_va:'6/6', l_pd:'',
    notes:'',
  });
  const [hasRx,      setHasRx]      = useState(false);
  const [rxHospital, setRxHospital] = useState('');
  const [rxDate,     setRxDate]     = useState('');
  const [rxDoctor,   setRxDoctor]   = useState('');

  // ── Frame ────────────────────────────────────────────────
  const [frameSearch,   setFrameSearch]   = useState('');
  const [frameResults,  setFrameResults]  = useState([]);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const frameTimer = useRef(null);

  const [frameDetails, setFrameDetails] = useState({
    name:'', type:'Full rim', material:'Plastic', color:'Black',
    buyPrice:0, sellPrice:0, frameDiscount:0, inventoryId:null,
  });

  // Pre-fill frame from QR scan URL params — AFTER frameDetails is declared
  const [scannedFromQR, setScannedFromQR] = useState(false);
  useEffect(()=>{
    const p = new URLSearchParams(location.search);
    const frameId    = p.get('frame_id');
    const frameName  = p.get('frame_name');
    const frameColor = p.get('frame_color');
    const frameType  = p.get('frame_type');
    const framePrice = p.get('frame_price');
    if (frameName) {
      setFrameDetails(f=>({
        ...f,
        name:         decodeURIComponent(frameName),
        color:        decodeURIComponent(frameColor||f.color||''),
        type:         decodeURIComponent(frameType||f.type||'Full rim'),
        sellPrice:    parseFloat(framePrice)||f.sellPrice||0,
        inventoryId:  frameId || null,
      }));
      setScannedFromQR(true);
    }
  },[location.search]);;

  // ── Lens ─────────────────────────────────────────────────
  const [lensDetails, setLensDetails] = useState({
    type:'Single Vision', coating:'CR (White)', lens_index:'Default',
    buyPrice:0, sellPrice:0, lensDiscount:0,
    matchedRange:'', matched:false,
  });

  // ── Segment height (progressive) ────────────────────────
  const [segHeightR, setSegHeightR] = useState('');
  const [segHeightL, setSegHeightL] = useState('');

  // ── Past record mode ────────────────────────────────────────
  const [pastMode,   setPastMode]   = useState(false);
  const [orderDate,  setOrderDate]  = useState('');  // override created_at

  // ── Payment ──────────────────────────────────────────────
  const [advance,        setAdvance]       = useState('');
  const [payMethod,      setPayMethod]     = useState('cash'); // cash | bank | card
  const [overallDiscount,setOverallDiscount] = useState(0);
  const [deliverDate,    setDeliverDate]   = useState(
    new Date(Date.now()+7*86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  // ── Order type (normal / warranty / replacement) ────────────
  const [orderType, setOrderType] = useState('normal');
  // normal       = standard paid order
  // lens_warranty= lens replaced free (our fault)
  // lens_paid    = lens replaced, customer pays
  // frame_replace_free = frame/item replaced free (one-to-one)
  // frame_replace_paid = frame/item replaced, customer pays difference

  // ── Customer own frame ────────────────────────────────────
  const [customerOwnFrame, setCustomerOwnFrame] = useState(false);

  // ── QR Scanner ───────────────────────────────────────────
  const [showScanner, setShowScanner] = useState(false);

  // ── Computed totals ──────────────────────────────────────
  const frameFinal    = (orderType==='frame_replace_free' || orderType==='lens_warranty')
    ? 0
    : Math.max(0,(frameDetails.sellPrice||0)-(frameDetails.frameDiscount||0));
  const lensFinal     = (orderType==='lens_warranty')
    ? 0
    : Math.max(0,(lensDetails.sellPrice||0)-(lensDetails.lensDiscount||0));
  const subTotal      = frameFinal + lensFinal;
  const totalAmount   = Math.max(0, subTotal - (parseFloat(overallDiscount)||0));
  const balanceAmount = Math.max(0,totalAmount-(parseFloat(advance)||0));

  // ── Lens price lookup from DB ────────────────────────────
  // Defined INSIDE component so it can access setLensDetails
  const lookupLens = useCallback(async (type, coating, sphStr) => {
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const color = coating.toLowerCase().includes('photo') ? 'Photo-Gray' : 'White';
      const params = new URLSearchParams({ lens_type:type, color });
      if (coating && coating !== 'Default') params.set('coating', coating);

      const res  = await fetch(`${BASE}/lens-prices/match?${params}`, {
        headers:{ Authorization:`Bearer ${token}` }
      });
      const data = await res.json();

      if (data?.length > 0) {
        const match = data[0];
        setLensDetails(l => ({
          ...l, type, coating,
          buyPrice:     parseFloat(match.buy_price)  || 0,
          sellPrice:    parseFloat(match.sell_price) || 0,
          matchedRange: match.power_range || match.series || '',
          matched:      true,
          lensDiscount: 0,
        }));
        return;
      }
    } catch(e) {
      console.log('DB lens lookup failed');
    }
    // Fallback — no match found
    setLensDetails(l => ({
      ...l, type, coating,
      buyPrice:0, sellPrice:0,
      matchedRange:'', matched:false, lensDiscount:0,
    }));
  }, []);

  // ── QR scan handler ──────────────────────────────────────
  const handleQRScan = (item) => {
    setShowScanner(false);
    setSelectedFrame({ ...item, image_url:null, quantity:1 });
    setFrameSearch(item.name);
    setFrameResults([]);
    setFrameDetails({
      name:          item.name,
      type:          item.type  || 'Full rim',
      material:      item.mat   || 'Plastic',
      color:         item.color || 'Black',
      buyPrice:      parseFloat(item.cost)  || 0,
      sellPrice:     parseFloat(item.price) || 0,
      frameDiscount: 0,
      inventoryId:   item.id,
    });
  };

  // ── Customer search ──────────────────────────────────────
  const handleCustSearch = (v) => {
    setCustSearch(v);
    setSelectedCust(null);
    clearTimeout(searchTimer.current);
    if (v.length < 2) return setCustResults([]);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await getCustomers({ search:v });
        setCustResults(res.data.slice(0,6));
      } catch { setCustResults([]); }
    }, 400);
  };

  const pickCustomer = (c) => {
    setSelectedCust(c); setCustSearch(c.name); setCustResults([]);
  };

  // ── Frame search ─────────────────────────────────────────
  const handleFrameSearch = (v) => {
    setFrameSearch(v);
    setFrameDetails(f => ({...f, name:v}));
    setSelectedFrame(null);
    clearTimeout(frameTimer.current);
    if (v.length < 2) return setFrameResults([]);
    frameTimer.current = setTimeout(async () => {
      try {
        const res = await getInventory({ search:v, category:'Frames' });
        setFrameResults(res.data.filter(i=>i.quantity>0).slice(0,6));
      } catch { setFrameResults([]); }
    }, 400);
  };

  const pickFrame = (item) => {
    setSelectedFrame(item);
    setFrameSearch(item.name);
    setFrameResults([]);
    setFrameDetails({
      name:          item.name,
      type:          item.frame_type     || frameDetails.type,
      material:      item.frame_material || frameDetails.material,
      color:         item.frame_color    || 'Black',
      buyPrice:      parseFloat(item.cost_price)  || 0,
      sellPrice:     parseFloat(item.sell_price)  || 0,
      frameDiscount: 0,
      inventoryId:   item.id,
    });
  };

  const copyEye = () => setRef(r => ({
    ...r, l_sph_s:r.r_sph_s, l_sph:r.r_sph, l_cyl_s:r.r_cyl_s, l_cyl:r.r_cyl,
    l_axis:r.r_axis, l_add:r.r_add, l_va:r.r_va, l_pd:r.r_pd,
  }));

  // ── Validation ───────────────────────────────────────────
  const validate = (s) => {
    if (s===1) {
      if (custMode==='search' && !selectedCust)      return 'Please select an existing customer or switch to add new';
      if (custMode==='new' && !newCust.name.trim())  return 'Please enter customer name';
      if (custMode==='new' && !newCust.phone.trim()) return 'Please enter phone number';
    }
    if (s===3 && !frameDetails.name.trim()) return 'Please enter or select a frame';
    if (s===4) {
      if (pastMode && !orderDate) return 'Please set the date this order was originally made';
      if (totalAmount<=0) return 'Total amount must be greater than 0';
      if (!deliverDate)   return 'Please set a delivery date';
      if ((parseFloat(advance)||0) > totalAmount) return 'Advance cannot be more than total amount';
    }
    return null;
  };

  const goNext = () => {
    const err = validate(step);
    if (err) return setError(err);
    setError('');
    if (step===2) lookupLens(lensDetails.type, lensDetails.coating, ref.r_sph_s+ref.r_sph);
    setStep(s => s+1);
  };

  // ── Save order ───────────────────────────────────────────
  const handleSave = async () => {
    const err = validate(4);
    if (err) return setError(err);
    setError(''); setSaving(true);
    try {
      let customerId;
      if (custMode==='search' && selectedCust) {
        customerId = selectedCust.id;
      } else {
        // Use direct fetch — axios was silently failing
        const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('ko_token');
        const custRes = await fetch(`${BASE}/customers`, {
          method: 'POST',
          headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
          body: JSON.stringify({
            name:  `${newCust.title} ${newCust.name}`.trim(),
            phone: newCust.phone.trim(),
            age:   newCust.age || null,
          }),
        });
        const custJson = await custRes.json();
        customerId = custJson?.data?.id || custJson?.id;
        if (!customerId) throw new Error('Failed to create customer: ' + JSON.stringify(custJson));
      }

      const combineSph = (s,v) => (!v||v==='0.00') ? 'Plano' : s+v;
      const combineCyl = (s,v) => (!v||v==='0.00') ? '0.00'  : s+v;

      await createOrder({
        customer_id:          customerId,
        frame:                customerOwnFrame ? (frameDetails.name || 'Customer Frame') : frameDetails.name,
        frame_type:           frameDetails.type,
        frame_material:       frameDetails.material,
        frame_color:          frameDetails.color,
        lens_type:            lensDetails.type,
        lens_coating:         lensDetails.coating,
        lens_company:         null,
        frame_inventory_id:   customerOwnFrame ? null : (frameDetails.inventoryId || null),
        lens_index:           lensDetails.lens_index !== 'Default' ? lensDetails.lens_index : null,
        frame_buy_price:      customerOwnFrame ? 0 : frameDetails.buyPrice,
        frame_sell_price:     customerOwnFrame ? 0 : frameFinal,
        lens_buy_price:       lensDetails.buyPrice,
        lens_sell_price:      lensFinal,
        total_amount:         totalAmount,
        advance_amount:       parseFloat(advance) || 0,
        balance_amount:       balanceAmount,
        discount_amount:      (parseFloat(overallDiscount)||0) + (frameDetails.frameDiscount||0) + (lensDetails.lensDiscount||0),
        payment_method:       payMethod,
        customer_own_frame:   customerOwnFrame,
        order_type:           orderType,
        deliver_date:         deliverDate,
        status:               pastMode ? 'delivered' : 'created',
        import_date:          pastMode ? orderDate : null,
        notes:                notes || null,
        has_rx:               hasRx,
        rx_hospital:          hasRx ? rxHospital : null,
        rx_date:              hasRx ? rxDate     : null,
        rx_doctor:            hasRx ? rxDoctor   : null,
        seg_height_r:         segHeightR || null,
        seg_height_l:         segHeightL || null,
        r_sph:  combineSph(ref.r_sph_s, ref.r_sph),
        r_cyl:  combineCyl(ref.r_cyl_s, ref.r_cyl),
        r_axis: ref.r_axis, r_add: ref.r_add!=='0.00' ? '+'+ref.r_add : null,
        r_va:   ref.r_va,   r_pd:  ref.r_pd || null,
        l_sph:  combineSph(ref.l_sph_s, ref.l_sph),
        l_cyl:  combineCyl(ref.l_cyl_s, ref.l_cyl),
        l_axis: ref.l_axis, l_add: ref.l_add!=='0.00' ? '+'+ref.l_add : null,
        l_va:   ref.l_va,   l_pd:  ref.l_pd || null,
        ref_notes: ref.notes || null,
      });

      navigate('/orders');
    } catch(e) {
      console.error(e);
      setError(e.response?.data?.error || 'Failed to save order. Please try again.');
    } finally { setSaving(false); }
  };

  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:740, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:8 }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.navy, margin:0 }}>➕ New Order</h1>
        <button onClick={()=>navigate('/orders')}
          style={{ padding:'8px 18px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
          ← Back
        </button>
      </div>
      <p style={{ fontSize:13, color:C.muted, marginBottom:20 }}>Fill all 4 steps to create an order</p>

      <StepBar step={step}/>

      {error && (
        <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:10, padding:'11px 16px', fontSize:13, marginBottom:16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ══════════════ STEP 1 — CUSTOMER ══════════════════ */}
      {step===1 && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 22px', marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.navy, marginBottom:18 }}>👤 Customer Details</div>

          <div style={{ display:'flex', gap:6, marginBottom:18 }}>
            {[['search','🔍 Existing customer'],['new','➕ New customer']].map(([mode,label])=>(
              <button key={mode} onClick={()=>{ setCustMode(mode); setError(''); }}
                style={{ padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${custMode===mode?C.navy:C.border}`, background:custMode===mode?C.navy:'white', color:custMode===mode?'white':C.muted }}>
                {label}
              </button>
            ))}
          </div>

          {custMode==='search' && (
            <div style={{ position:'relative' }}>
              <Field label="Search by name or phone">
                <input value={custSearch} onChange={e=>handleCustSearch(e.target.value)} placeholder="Type name or phone number..." style={INP}/>
              </Field>
              {custResults.length>0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:`1px solid ${C.border}`, borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.12)', zIndex:50, overflow:'hidden', marginTop:4 }}>
                  {custResults.map(c=>(
                    <div key={c.id} onMouseDown={()=>pickCustomer(c)}
                      style={{ padding:'12px 16px', cursor:'pointer', borderBottom:`1px solid ${C.cream}` }}>
                      <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{c.name}</div>
                      <div style={{ fontSize:12, color:C.muted }}>📞 {c.phone} · Age {c.age} · {c.total_orders} orders</div>
                    </div>
                  ))}
                </div>
              )}
              {selectedCust && (
                <div style={{ marginTop:10, background:'#dcfce7', border:`1px solid #86efac`, borderRadius:10, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>✅ {selectedCust.name}</div>
                    <div style={{ fontSize:12, color:C.muted }}>📞 {selectedCust.phone} · {selectedCust.total_orders} previous orders</div>
                  </div>
                  <button onMouseDown={()=>{ setSelectedCust(null); setCustSearch(''); setCustResults([]); }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:16 }}>✕</button>
                </div>
              )}
              {!selectedCust && !custResults.length && custSearch.length>1 && (
                <div style={{ marginTop:8, fontSize:13, color:C.muted }}>
                  Not found —{' '}
                  <button onMouseDown={()=>setCustMode('new')}
                    style={{ background:'none', border:'none', color:C.navy, cursor:'pointer', fontWeight:700, fontFamily:'inherit', textDecoration:'underline' }}>
                    add as new customer
                  </button>
                </div>
              )}
            </div>
          )}

          {custMode==='new' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Title">
                <select value={newCust.title} onChange={e=>setNewCust(c=>({...c,title:e.target.value}))} style={SEL}>
                  {TITLES.map(t=><option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Full Name *">
                <input value={newCust.name} onChange={e=>setNewCust(c=>({...c,name:e.target.value}))} placeholder="e.g. Nuwan Perera" style={INP}/>
              </Field>
              <Field label="Phone *">
                <input value={newCust.phone} onChange={e=>setNewCust(c=>({...c,phone:e.target.value}))} placeholder="077-123-4567" type="tel" style={INP}/>
              </Field>
              <Field label="Age">
                <input value={newCust.age} onChange={e=>setNewCust(c=>({...c,age:e.target.value}))} placeholder="e.g. 34" type="number" style={INP}/>
              </Field>
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:20 }}>
            <button onClick={goNext} style={{ padding:'11px 28px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Next: Refraction →
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 2 — REFRACTION ════════════════ */}
      {step===2 && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 22px', marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.navy, marginBottom:18 }}>🔭 Refraction Results</div>

          {[{label:'Right Eye (R)',p:'r'},{label:'Left Eye (L)',p:'l'}].map(eye=>(
            <div key={eye.p} style={{ background:C.cream, borderRadius:10, padding:14, marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10 }}>{eye.label}</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <Field label="SPH">
                  <div style={{ display:'flex', gap:4 }}>
                    <select value={ref[`${eye.p}_sph_s`]} onChange={e=>setRef(r=>({...r,[`${eye.p}_sph_s`]:e.target.value}))} style={{ ...SEL, width:56, padding:'10px 6px' }}>
                      <option>-</option><option>+</option>
                    </select>
                    <select value={ref[`${eye.p}_sph`]} onChange={e=>setRef(r=>({...r,[`${eye.p}_sph`]:e.target.value}))} style={{ ...SEL, width:90 }}>
                      {DIOPTERS.map(v=><option key={v}>{v}</option>)}
                    </select>
                  </div>
                </Field>
                <Field label="CYL">
                  <div style={{ display:'flex', gap:4 }}>
                    <select value={ref[`${eye.p}_cyl_s`]} onChange={e=>setRef(r=>({...r,[`${eye.p}_cyl_s`]:e.target.value}))} style={{ ...SEL, width:56, padding:'10px 6px' }}>
                      <option>-</option><option>+</option>
                    </select>
                    <select value={ref[`${eye.p}_cyl`]} onChange={e=>setRef(r=>({...r,[`${eye.p}_cyl`]:e.target.value}))} style={{ ...SEL, width:90 }}>
                      {DIOPTERS.map(v=><option key={v}>{v}</option>)}
                    </select>
                  </div>
                </Field>
                <Field label="AXIS">
                  <select value={ref[`${eye.p}_axis`]} onChange={e=>setRef(r=>({...r,[`${eye.p}_axis`]:e.target.value}))} style={{ ...SEL, width:80 }}>
                    {AXES.map(v=><option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="ADD">
                  <select value={ref[`${eye.p}_add`]} onChange={e=>setRef(r=>({...r,[`${eye.p}_add`]:e.target.value}))} style={{ ...SEL, width:90 }}>
                    {DIOPTERS.map(v=><option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="V/A">
                  <select value={ref[`${eye.p}_va`]} onChange={e=>setRef(r=>({...r,[`${eye.p}_va`]:e.target.value}))} style={{ ...SEL, width:84 }}>
                    {VA_OPTIONS.map(v=><option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="PD">
                  <input value={ref[`${eye.p}_pd`]} onChange={e=>setRef(r=>({...r,[`${eye.p}_pd`]:e.target.value}))} placeholder="32" style={{ ...INP, width:72 }}/>
                </Field>
              </div>
            </div>
          ))}

          <button onClick={copyEye} style={{ background:C.cream, border:`1px solid ${C.border}`, borderRadius:7, padding:'6px 14px', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted, marginBottom:14 }}>
            ↓ Copy Right Eye to Left Eye
          </button>

          <Field label="Remarks / Clinical Notes">
            <textarea value={ref.notes} onChange={e=>setRef(r=>({...r,notes:e.target.value}))}
              placeholder="e.g. Presbyopia, recommend progressive lenses..."
              style={{ ...INP, resize:'vertical', minHeight:72, lineHeight:1.6 }}/>
          </Field>

          <div style={{ background:'#f0f9ff', borderRadius:10, padding:'14px 16px', marginTop:14 }}>
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
              <div onClick={()=>setHasRx(h=>!h)}
                style={{ width:44, height:24, borderRadius:12, background:hasRx?C.navy:C.border, position:'relative', cursor:'pointer', transition:'background .2s', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left:hasRx?23:3, width:18, height:18, borderRadius:'50%', background:'white', transition:'left .2s' }}/>
              </div>
              <span style={{ fontSize:14, fontWeight:500, color:C.navy }}>Customer brought a prescription (Rx)</span>
            </label>
            {hasRx && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:14 }}>
                <Field label="Hospital / Clinic">
                  <input value={rxHospital} onChange={e=>setRxHospital(e.target.value)} placeholder="e.g. Colombo National Hospital" style={INP}/>
                </Field>
                <Field label="Prescription Date">
                  <input type="date" value={rxDate} onChange={e=>setRxDate(e.target.value)} style={INP}/>
                </Field>
                <div style={{ gridColumn:'1/-1' }}>
                  <Field label="Doctor's Name (optional)">
                    <input value={rxDoctor} onChange={e=>setRxDoctor(e.target.value)} placeholder="e.g. Dr. Perera" style={INP}/>
                  </Field>
                </div>
              </div>
            )}
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', marginTop:20 }}>
            <button onClick={()=>setStep(1)} style={{ padding:'11px 20px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>← Back</button>
            <button onClick={goNext} style={{ padding:'11px 28px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Next: Frame & Lens →</button>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 3 — FRAME & LENS ══════════════ */}
      {step===3 && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 22px', marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.navy, marginBottom:14 }}>🕶️ Frame & Lens</div>

          {/* ── Order Type ── */}
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:8 }}>Order Type</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:8 }}>
              {[
                { v:'normal',             icon:'📋', label:'Normal Order',          sub:'Standard paid order',              col:C.navy,    bg:'white'    },
                { v:'lens_warranty',      icon:'🔁', label:'Lens Replacement Free', sub:'Our fault — no charge to customer',col:'#2d7a4f', bg:'#dcfce7'  },
                { v:'lens_paid',          icon:'🔬', label:'Lens Replacement Paid', sub:'Customer pays for new lens',       col:'#2563eb', bg:'#eff6ff'  },
                { v:'frame_replace_free', icon:'🎁', label:'Frame Replace Free',    sub:'One-to-one replacement, no charge',col:'#7c3aed', bg:'#f5f3ff'  },
                { v:'frame_replace_paid', icon:'💰', label:'Frame Replace Paid',    sub:'Replacement with payment',         col:'#b45309', bg:'#fffbeb'  },
              ].map(t=>(
                <button key={t.v} onClick={()=>setOrderType(t.v)}
                  style={{ padding:'10px 12px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                    border:`2px solid ${orderType===t.v?t.col:'#e0ddd6'}`,
                    background:orderType===t.v?t.bg:'white',
                    color:orderType===t.v?t.col:'#6b7280',
                    display:'flex', alignItems:'center', gap:8, textAlign:'left' }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>{t.icon}</span>
                  <div>
                    <div>{t.label}</div>
                    <div style={{ fontSize:10, opacity:.7, fontWeight:400 }}>{t.sub}</div>
                  </div>
                </button>
              ))}
            </div>
            {/* Warranty note */}
            {orderType==='lens_warranty' && (
              <div style={{ background:'#dcfce7', border:'1px solid #86efac', borderRadius:9, padding:'9px 13px', fontSize:12, color:'#2d7a4f' }}>
                ✅ <b>Free lens replacement</b> — lens price will be set to Rs. 0 automatically. Frame charge still applies if new frame is given.
              </div>
            )}
            {orderType==='frame_replace_free' && (
              <div style={{ background:'#f5f3ff', border:'1px solid #c4b5fd', borderRadius:9, padding:'9px 13px', fontSize:12, color:'#7c3aed' }}>
                🎁 <b>Free replacement</b> — frame and lens prices set to Rs. 0. Use notes to record the original order number.
              </div>
            )}
            {(orderType==='lens_paid'||orderType==='frame_replace_paid') && (
              <div style={{ background:'#eff6ff', border:'1px solid #93c5fd', borderRadius:9, padding:'9px 13px', fontSize:12, color:'#1e40af' }}>
                💰 <b>Paid replacement</b> — set the price in Step 4 as normal.
              </div>
            )}
          </div>

          {/* ── Customer own frame toggle ── */}
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:8 }}>Frame Source</div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>{ setCustomerOwnFrame(false); }}
                style={{ flex:1, padding:'12px 8px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`2px solid ${!customerOwnFrame?C.navy:C.border}`, background:!customerOwnFrame?C.navy:'white', color:!customerOwnFrame?'white':C.muted, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <span style={{ fontSize:22 }}>🏪</span>
                <span>From our stock</span>
                <span style={{ fontSize:11, opacity:.7 }}>Select frame from inventory</span>
              </button>
              <button onClick={()=>{ setCustomerOwnFrame(true); setFrameDetails(f=>({...f, inventoryId:null, buyPrice:0})); }}
                style={{ flex:1, padding:'12px 8px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`2px solid ${customerOwnFrame?'#2563eb':C.border}`, background:customerOwnFrame?'#eff6ff':'white', color:customerOwnFrame?'#1e40af':C.muted, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <span style={{ fontSize:22 }}>👤</span>
                <span>Customer's own frame</span>
                <span style={{ fontSize:11, opacity:.7 }}>Lens fitting only</span>
              </button>
            </div>
            {customerOwnFrame && (
              <div style={{ background:'#eff6ff', border:`1px solid #93c5fd`, borderRadius:10, padding:'10px 14px', marginTop:10, fontSize:13, color:'#1e40af' }}>
                <b>Lens fitting only</b> — customer brought their own frame. Enter frame details manually below for the lab job card.
              </div>
            )}
          </div>

          {/* Frame section */}
          <div style={{ background:C.cream, borderRadius:10, padding:16, marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>Frame {customerOwnFrame && <span style={{ background:'#dbeafe', color:'#1e40af', fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, marginLeft:6 }}>Customer's Own</span>}</div>
              {/* QR Scan button — only show if using our stock */}
              {!customerOwnFrame && <button onClick={()=>setShowScanner(true)}
                style={{ padding:'7px 14px', background:C.navy, color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
                📷 Scan QR Sticker
              </button>}
            </div>

            {/* Frame search — only for our stock */}
            {!customerOwnFrame && (
            <div style={{ position:'relative', marginBottom:12 }}>
              <Field label="Search Frame from Stock">
                <input value={frameSearch} onChange={e=>handleFrameSearch(e.target.value)} placeholder="Type frame name to search stock..." style={INP}/>
              </Field>
              {frameResults.length>0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:`1px solid ${C.border}`, borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.12)', zIndex:50, overflow:'hidden', marginTop:4 }}>
                  {frameResults.map(i=>(
                    <div key={i.id} onMouseDown={()=>pickFrame(i)}
                      style={{ padding:'10px 14px', cursor:'pointer', borderBottom:`1px solid ${C.cream}`, display:'flex', alignItems:'center', gap:10 }}>
                      {i.image_url && <img src={i.image_url} alt="" style={{ width:40, height:40, objectFit:'cover', borderRadius:6 }}/>}
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{i.name}</div>
                        <div style={{ fontSize:11, color:C.muted }}>
                          {i.frame_color&&`${i.frame_color} · `}{i.frame_type&&`${i.frame_type} · `}
                          Buy: {fmtMoney(i.cost_price)} · Sell: {fmtMoney(i.sell_price)} · {i.quantity} in stock
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* Manual frame entry for customer's own frame */}
            {customerOwnFrame && (
              <div style={{ marginBottom:12 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  <Field label="Frame Brand / Name">
                    <input value={frameDetails.name} onChange={e=>setFrameDetails(f=>({...f,name:e.target.value}))}
                      placeholder="e.g. RayBan, Titan..." style={INP}/>
                  </Field>
                  <Field label="Frame Color">
                    <select value={frameDetails.color} onChange={e=>setFrameDetails(f=>({...f,color:e.target.value}))} style={{ ...INP, cursor:'pointer' }}>
                      {FRAME_COLORS.map(col=>(<option key={col}>{col}</option>))}
                    </select>
                  </Field>
                  <Field label="Frame Type">
                    <select value={frameDetails.type} onChange={e=>setFrameDetails(f=>({...f,type:e.target.value}))} style={{ ...INP, cursor:'pointer' }}>
                      {FRAME_TYPES.map(t=>(<option key={t}>{t}</option>))}
                    </select>
                  </Field>
                </div>
                <div style={{ background:'#eff6ff', borderRadius:8, padding:'9px 13px', marginTop:8, fontSize:12, color:'#1e40af' }}>
                  ℹ️ No charge for frame — lens fitting only. Frame price will be Rs. 0.
                </div>
              </div>
            )}

            {/* Frame photo after selection — only our stock */}
            {!customerOwnFrame && selectedFrame && selectedFrame.image_url && (
              <div style={{ marginBottom:12, borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}` }}>
                <img src={selectedFrame.image_url} alt={selectedFrame.name} style={{ width:'100%', height:160, objectFit:'cover' }}/>
                <div style={{ padding:'8px 12px', background:'#dcfce7', fontSize:12, fontWeight:600, color:'#2d7a4f' }}>
                  ✅ {selectedFrame.name}{selectedFrame.frame_color?` · ${selectedFrame.frame_color}`:''}{selectedFrame.frame_type?` · ${selectedFrame.frame_type}`:''}
                </div>
              </div>
            )}

            {/* Frame details — hide buy price if customer own frame */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <Field label="Frame Type">
                <select value={frameDetails.type} onChange={e=>setFrameDetails(f=>({...f,type:e.target.value}))} style={SEL}>
                  {FRAME_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Frame Material">
                <select value={frameDetails.material} onChange={e=>setFrameDetails(f=>({...f,material:e.target.value}))} style={SEL}>
                  {FRAME_MATS.map(m=><option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Frame Color">
                <select value={frameDetails.color} onChange={e=>setFrameDetails(f=>({...f,color:e.target.value}))} style={SEL}>
                  {FRAME_COLORS.map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              {!customerOwnFrame && <>
                <Field label="Frame Buying Price (Rs.)">
                  <input type="number" value={frameDetails.buyPrice} onChange={e=>setFrameDetails(f=>({...f,buyPrice:parseFloat(e.target.value)||0}))} style={INP}/>
                </Field>
                <Field label="Frame Selling Price (Rs.)">
                  <input type="number" value={frameDetails.sellPrice} onChange={e=>setFrameDetails(f=>({...f,sellPrice:parseFloat(e.target.value)||0}))} style={INP}/>
                </Field>
              </>}
            </div>
          </div>

          {/* Lens section */}
          <div style={{ background:'#f0f9ff', borderRadius:10, padding:16, marginBottom:8 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:12 }}>Lens</div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <Field label="Lens Type">
                <select value={lensDetails.type} onChange={e=>{ const t=e.target.value; lookupLens(t,lensDetails.coating,ref.r_sph_s+ref.r_sph); }} style={SEL}>
                  {LENS_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Lens Coating">
                <select value={lensDetails.coating} onChange={e=>{ const c=e.target.value; lookupLens(lensDetails.type,c,ref.r_sph_s+ref.r_sph); }} style={SEL}>
                  {LENS_COATINGS.map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Lens Index">
                <select value={lensDetails.lens_index} onChange={e=>setLensDetails(l=>({...l,lens_index:e.target.value}))} style={SEL}>
                  {LENS_INDEXES.map(i=><option key={i}>{i}</option>)}
                </select>
              </Field>
            </div>

            {/* Price display */}
            {lensDetails.matched ? (
              <div style={{ background:'#dbeafe', borderRadius:9, padding:'12px 14px', marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#1e40af', marginBottom:6 }}>
                  Auto-matched · {lensDetails.matchedRange}
                </div>
                <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                  <span style={{ fontSize:13, color:'#1e40af' }}>Buy: <b>{fmtMoney(lensDetails.buyPrice)}</b></span>
                  <span style={{ fontSize:13, color:'#1e40af' }}>Sell: <b>{fmtMoney(lensDetails.sellPrice)}</b></span>
                </div>
              </div>
            ) : (
              <div style={{ background:'#fef9c3', borderRadius:9, padding:'10px 14px', marginBottom:10, fontSize:12, color:'#854d0e' }}>
                ⚠️ No price match found — enter manually below
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <Field label="Lens Buying Price (Rs.)">
                <input type="number" value={lensDetails.buyPrice} onChange={e=>setLensDetails(l=>({...l,buyPrice:parseFloat(e.target.value)||0}))} style={INP}/>
              </Field>
              <Field label="Lens Selling Price (Rs.)">
                <input type="number" value={lensDetails.sellPrice} onChange={e=>setLensDetails(l=>({...l,sellPrice:parseFloat(e.target.value)||0}))} style={INP}/>
              </Field>
            </div>

            {/* Segment height for Progressive */}
            {lensDetails.type==='Progressive' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:12, padding:'12px 14px', background:'#e0f2fe', borderRadius:9 }}>
                <div style={{ gridColumn:'1/-1', fontSize:12, fontWeight:700, color:'#0369a1', marginBottom:4 }}>
                  📐 Segment Height (Progressive lenses)
                </div>
                <Field label="Seg. Height Right (mm)">
                  <input type="number" value={segHeightR} onChange={e=>setSegHeightR(e.target.value)} placeholder="e.g. 20" style={INP}/>
                </Field>
                <Field label="Seg. Height Left (mm)">
                  <input type="number" value={segHeightL} onChange={e=>setSegHeightL(e.target.value)} placeholder="e.g. 20" style={INP}/>
                </Field>
              </div>
            )}
          </div>

          <div style={{ background:'#fef9c3', border:`1px solid #fde68a`, borderRadius:9, padding:'10px 14px', fontSize:12, color:'#854d0e' }}>
            🔬 Grinding lab will be assigned tomorrow from the <b>Grinding</b> tab
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', marginTop:20 }}>
            <button onClick={()=>setStep(2)} style={{ padding:'11px 20px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>← Back</button>
            <button onClick={goNext} style={{ padding:'11px 28px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Next: Payment →</button>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 4 — PAYMENT ═══════════════════ */}
      {step===4 && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 22px', marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexWrap:'wrap', gap:8 }}>
            <div style={{ fontSize:16, fontWeight:700, color:C.navy }}>💰 Payment & Delivery</div>
            {/* Past order toggle */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button onClick={()=>{ setPastMode(p=>!p); setOrderDate(''); }}
                style={{ padding:'7px 14px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${pastMode?'#b45309':C.border}`, background:pastMode?'#fffbeb':'white', color:pastMode?'#b45309':C.muted }}>
                📅 {pastMode ? 'Backdating ON ✓' : 'Entering a past order?'}
              </button>
              {pastMode && (
                <input type="date" value={orderDate} onChange={e=>setOrderDate(e.target.value)}
                  style={{ padding:'7px 12px', border:`1.5px solid #f59e0b`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'#fffbeb', color:'#92400e', fontWeight:700 }}/>
              )}
              {pastMode && orderDate && (
                <span style={{ fontSize:12, color:'#92400e', background:'#fef3c7', padding:'3px 9px', borderRadius:20, fontWeight:600 }}>
                  {new Date(orderDate+'T00:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
                </span>
              )}
            </div>
          </div>
          {pastMode && !orderDate && (
            <div style={{ background:'#fef3c7', border:`1px solid #fde68a`, borderRadius:9, padding:'9px 14px', marginBottom:14, fontSize:13, color:'#92400e' }}>
              ⬆️ Set the date this order was originally made before saving
            </div>
          )}

          {/* ── Price Breakdown ── */}
          <div style={{ background:C.cream, borderRadius:12, padding:16, marginBottom:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:12 }}>Price Breakdown</div>

            {/* Frame row — only if not customer own frame OR if they filled name */}
            <div style={{ background:'white', borderRadius:9, padding:'12px 14px', marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>
                  🕶️ {frameDetails.name||'Frame'} · {frameDetails.color}
                  {customerOwnFrame && <span style={{ background:'#dbeafe', color:'#1e40af', fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:20, marginLeft:6 }}>Customer's Frame</span>}
                  {orderType==='frame_replace_free' && <span style={{ background:'#f5f3ff', color:'#7c3aed', fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:20, marginLeft:6 }}>🎁 Free Replace</span>}
                </span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {(!customerOwnFrame && orderType!=='frame_replace_free') ? (
                    <input type="number" value={frameDetails.sellPrice||0}
                      onChange={e=>setFrameDetails(f=>({...f,sellPrice:parseFloat(e.target.value)||0}))}
                      style={{ width:90, padding:'4px 8px', border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:13, fontWeight:700, fontFamily:'inherit', textAlign:'right', background:C.cream }}/>
                  ) : (
                    <span style={{ fontSize:14, fontWeight:700, color:C.muted }}>Rs. 0</span>
                  )}
                </div>
              </div>
              {!customerOwnFrame && (
                <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, color:C.muted }}>Sell price:</span>
                  <input type="number" value={frameDetails.sellPrice} onChange={e=>setFrameDetails(f=>({...f,sellPrice:parseFloat(e.target.value)||0}))} style={{ ...INP, width:110, padding:'6px 10px', fontSize:13 }}/>
                  <span style={{ fontSize:11, color:C.muted }}>Discount:</span>
                  <input type="number" value={frameDetails.frameDiscount} onChange={e=>setFrameDetails(f=>({...f,frameDiscount:parseFloat(e.target.value)||0}))} placeholder="0" style={{ ...INP, width:100, padding:'6px 10px', fontSize:13 }}/>
                  {frameDetails.frameDiscount>0 && <span style={{ fontSize:11, color:C.success, fontWeight:700 }}>-{fmtMoney(frameDetails.frameDiscount)}</span>}
                </div>
              )}
            </div>

            {/* Lens row */}
            <div style={{ background:'white', borderRadius:9, padding:'12px 14px', marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>
                  🔬 {lensDetails.type} · {lensDetails.coating}
                  {orderType==='lens_warranty' && <span style={{ background:'#dcfce7', color:'#2d7a4f', fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:20, marginLeft:6 }}>🔁 Free Replace</span>}
                </span>
                <div>
                  {orderType==='lens_warranty' ? (
                    <span style={{ fontSize:14, fontWeight:700, color:C.muted }}>Rs. 0</span>
                  ) : (
                    <input type="number" value={lensDetails.sellPrice||0}
                      onChange={e=>setLensDetails(f=>({...f,sellPrice:parseFloat(e.target.value)||0}))}
                      style={{ width:90, padding:'4px 8px', border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:13, fontWeight:700, fontFamily:'inherit', textAlign:'right', background:C.cream }}/>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                <span style={{ fontSize:11, color:C.muted }}>Sell price:</span>
                <input type="number" value={lensDetails.sellPrice} onChange={e=>setLensDetails(l=>({...l,sellPrice:parseFloat(e.target.value)||0}))} style={{ ...INP, width:110, padding:'6px 10px', fontSize:13 }}/>
                <span style={{ fontSize:11, color:C.muted }}>Discount:</span>
                <input type="number" value={lensDetails.lensDiscount} onChange={e=>setLensDetails(l=>({...l,lensDiscount:parseFloat(e.target.value)||0}))} placeholder="0" style={{ ...INP, width:100, padding:'6px 10px', fontSize:13 }}/>
                {lensDetails.lensDiscount>0 && <span style={{ fontSize:11, color:C.success, fontWeight:700 }}>-{fmtMoney(lensDetails.lensDiscount)}</span>}
              </div>
            </div>

            {/* Subtotal */}
            {subTotal !== totalAmount && (
              <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', fontSize:13, color:C.muted }}>
                <span>Subtotal</span><span>{fmtMoney(subTotal)}</span>
              </div>
            )}

            {/* Overall discount */}
            <div style={{ background:'white', borderRadius:9, padding:'11px 14px', marginBottom:10, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <span style={{ fontSize:13, fontWeight:600, color:C.navy, minWidth:130 }}>💰 Overall Discount</span>
              <input type="number" value={overallDiscount||''} onChange={e=>setOverallDiscount(parseFloat(e.target.value)||0)}
                placeholder="0" style={{ ...INP, width:120, padding:'6px 10px', fontSize:13 }}/>
              {parseFloat(overallDiscount)>0 && <span style={{ fontSize:13, color:C.success, fontWeight:700 }}>- {fmtMoney(overallDiscount)}</span>}
            </div>

            {/* Total */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:`2px solid ${C.border}`, paddingTop:12 }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>Total</span>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:C.navy }}>{fmtMoney(totalAmount)}</span>
            </div>
          </div>

          {/* ── Advance payment ── */}
          <div style={{ background:C.cream, borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:12 }}>💵 Advance Payment</div>

            {/* Payment method */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:7 }}>Payment Method</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[['cash','💵 Cash'],['bank','🏦 Bank'],['card','💳 Card']].map(([v,l])=>(
                  <button key={v} onClick={()=>setPayMethod(v)}
                    style={{ padding:'10px 6px', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`2px solid ${payMethod===v?C.navy:C.border}`, background:payMethod===v?C.navy:'white', color:payMethod===v?'white':C.muted, textAlign:'center' }}>
                    {l}
                  </button>
                ))}
              </div>
              {payMethod==='bank' && (
                <div style={{ marginTop:8, background:'#eff6ff', border:`1px solid #93c5fd`, borderRadius:8, padding:'9px 13px', fontSize:12, color:'#1e40af' }}>
                  🏦 This advance will be automatically recorded as a bank deposit to <b>Pan Asia Bank</b>
                </div>
              )}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:5 }}>Advance Amount (Rs.)</div>
                <input type="number" value={advance} onChange={e=>setAdvance(e.target.value)} placeholder="e.g. 3000" style={{ ...INP, fontSize:16, fontWeight:700 }}/>
                {/* Quick fill buttons */}
                <div style={{ display:'flex', gap:5, marginTop:6, flexWrap:'wrap' }}>
                  <button onClick={()=>setAdvance(String(totalAmount))} style={{ padding:'4px 10px', background:C.navy, color:'white', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Full</button>
                  {[500,1000,2000,5000].filter(v=>v<totalAmount).slice(0,3).map(v=>(
                    <button key={v} onClick={()=>setAdvance(String(v))} style={{ padding:'4px 10px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:6, fontSize:11, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>{fmtMoney(v)}</button>
                  ))}
                </div>
              </div>
              <div style={{ background:C.navy, borderRadius:10, padding:'14px 16px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.gold, marginBottom:4 }}>Balance Due</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:'white' }}>{fmtMoney(balanceAmount)}</div>
                {balanceAmount===0 && <div style={{ fontSize:11, color:'#86efac', marginTop:3 }}>✅ Fully paid</div>}
              </div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <Field label="Delivery Date *">
              <input type="date" value={deliverDate} onChange={e=>setDeliverDate(e.target.value)} style={INP}/>
            </Field>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted }}>Status</label>
              <div style={{ padding:'10px 16px', background:'#dbeafe', border:`2px solid #93c5fd`, borderRadius:9, fontSize:13, fontWeight:600, color:'#1e40af' }}>
                📝 Created
              </div>
            </div>
          </div>

          <Field label="Internal Notes (optional)">
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any notes about this order..." style={{ ...INP, resize:'vertical', minHeight:72, lineHeight:1.6 }}/>
          </Field>

          <div style={{ background:C.cream, borderRadius:12, padding:16, marginTop:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10 }}>📋 Order Summary</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:13 }}>
              {[
                ...(pastMode && orderDate ? [{l:'📅 Order Date', v:new Date(orderDate+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}), bold:true}] : []),
                {l:'Customer',    v:custMode==='new'?`${newCust.title} ${newCust.name}`:selectedCust?.name},
                {l:'Phone',       v:custMode==='new'?newCust.phone:selectedCust?.phone},
                {l:'Order Type',  v:orderType==='normal'?'Normal':orderType==='lens_warranty'?'🔁 Lens Free':orderType==='lens_paid'?'🔬 Lens Paid':orderType==='frame_replace_free'?'🎁 Frame Free':'💰 Frame Paid', bold:orderType!=='normal'},
                {l:'Frame',       v:customerOwnFrame?`${frameDetails.name||'Customer Frame'} (Own)`:`${frameDetails.name||'—'} (${frameDetails.color})`},
                {l:'Lens',        v:`${lensDetails.type} · ${lensDetails.coating}`},
                {l:'Frame price', v:customerOwnFrame?'No charge':fmtMoney(frameFinal)},
                {l:'Lens price',  v:fmtMoney(lensFinal)},
                ...(parseFloat(overallDiscount)>0?[{l:'Discount',  v:`-${fmtMoney(overallDiscount)}`, red:false}]:[]),
                {l:'Total',       v:fmtMoney(totalAmount), bold:true},
                {l:'Advance',     v:`${fmtMoney(parseFloat(advance)||0)} (${payMethod})`, bold:false},
                {l:'Balance',     v:fmtMoney(balanceAmount), red:balanceAmount>0},
              ].map(item=>(
                <div key={item.l} style={{ fontSize:13 }}>
                  <span style={{ color:C.muted }}>{item.l}: </span>
                  <b style={{ color:item.red?C.danger:item.bold?C.navy:'#1a1a2e' }}>{item.v||'—'}</b>
                </div>
              ))}
              {lensDetails.type==='Progressive' && (segHeightR||segHeightL) && (
                <div style={{ gridColumn:'1/-1', fontSize:13 }}>
                  <span style={{ color:C.muted }}>Seg. Height: </span>
                  <b>R: {segHeightR||'—'} mm · L: {segHeightL||'—'} mm</b>
                </div>
              )}
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginTop:20 }}>
            <button onClick={()=>setStep(3)} style={{ padding:'11px 20px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>← Back</button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:'12px 36px', background:saving?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:15, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {saving?'⏳ Saving...':'💾 Save Order'}
            </button>
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
    </div>
  );
}