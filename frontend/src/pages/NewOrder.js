// ============================================================
//  NewOrder.js — All 6 patch changes applied:
//  ✅ 1. frame_color added to frameDetails state
//  ✅ 2. pickFrame captures color from stock item
//  ✅ 3. Frame photo shown after selecting from stock
//  ✅ 4. Frame color selector in Step 3 grid
//  ✅ 5. Segment height fields for Progressive lens
//  ✅ 6. frame_color, seg_height_r, seg_height_l in createOrder
// ============================================================
import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCustomer, createOrder, getCustomers, getInventory } from '../api';

const C = {
  navy:    '#0f1f3d',
  gold:    '#c9a84c',
  cream:   '#f8f5ef',
  border:  '#e0ddd6',
  muted:   '#6b7280',
  success: '#2d7a4f',
  danger:  '#c0392b',
  white:   '#ffffff',
};

const LENS_PRICES = [
  { type:'Single Vision', coating:'HMC',               range:'0.00–2.00', buy:350,  sell:700  },
  { type:'Single Vision', coating:'HMC',               range:'2.25–4.00', buy:450,  sell:900  },
  { type:'Single Vision', coating:'HMC',               range:'4.25–6.00', buy:600,  sell:1200 },
  { type:'Single Vision', coating:'HMC',               range:'6.25+',     buy:800,  sell:1600 },
  { type:'Single Vision', coating:'Hard Coat',          range:'0.00–2.00', buy:200,  sell:400  },
  { type:'Single Vision', coating:'Hard Coat',          range:'2.25–4.00', buy:280,  sell:560  },
  { type:'Single Vision', coating:'Hard Coat',          range:'4.25–6.00', buy:380,  sell:760  },
  { type:'Single Vision', coating:'Hard Coat',          range:'6.25+',     buy:500,  sell:1000 },
  { type:'Single Vision', coating:'Blue Filter',        range:'0.00–2.00', buy:550,  sell:1100 },
  { type:'Single Vision', coating:'Blue Filter',        range:'2.25–4.00', buy:650,  sell:1300 },
  { type:'Single Vision', coating:'Blue Filter',        range:'4.25–6.00', buy:800,  sell:1600 },
  { type:'Single Vision', coating:'Blue Filter',        range:'6.25+',     buy:1000, sell:2000 },
  { type:'Single Vision', coating:'Photochromic',       range:'0.00–2.00', buy:900,  sell:1800 },
  { type:'Single Vision', coating:'Photochromic',       range:'2.25–4.00', buy:1100, sell:2200 },
  { type:'Single Vision', coating:'Photochromic',       range:'4.25–6.00', buy:1300, sell:2600 },
  { type:'Single Vision', coating:'Photochromic',       range:'6.25+',     buy:1600, sell:3200 },
  { type:'Single Vision', coating:'Blue + Photochromic',range:'0.00–2.00', buy:1100, sell:2200 },
  { type:'Single Vision', coating:'Blue + Photochromic',range:'2.25–4.00', buy:1300, sell:2600 },
  { type:'Single Vision', coating:'Blue + Photochromic',range:'4.25–6.00', buy:1600, sell:3200 },
  { type:'Single Vision', coating:'Blue + Photochromic',range:'6.25+',     buy:2000, sell:4000 },
  { type:'Bifocal',       coating:'HMC',               range:'0.00–2.00', buy:600,  sell:1200 },
  { type:'Bifocal',       coating:'HMC',               range:'2.25–4.00', buy:750,  sell:1500 },
  { type:'Bifocal',       coating:'HMC',               range:'4.25–6.00', buy:900,  sell:1800 },
  { type:'Bifocal',       coating:'Hard Coat',          range:'0.00–2.00', buy:400,  sell:800  },
  { type:'Bifocal',       coating:'Hard Coat',          range:'2.25–4.00', buy:500,  sell:1000 },
  { type:'Progressive',   coating:'HMC',               range:'0.00–2.00', buy:1200, sell:2400 },
  { type:'Progressive',   coating:'HMC',               range:'2.25–4.00', buy:1500, sell:3000 },
  { type:'Progressive',   coating:'HMC',               range:'4.25–6.00', buy:1800, sell:3600 },
  { type:'Progressive',   coating:'Blue Filter',        range:'0.00–2.00', buy:1600, sell:3200 },
  { type:'Progressive',   coating:'Blue Filter',        range:'2.25–4.00', buy:1900, sell:3800 },
  { type:'Progressive',   coating:'Photochromic',       range:'0.00–2.00', buy:2000, sell:4000 },
  { type:'Progressive',   coating:'Photochromic',       range:'2.25–4.00', buy:2400, sell:4800 },
  { type:'Office Lens',   coating:'HMC',               range:'0.00–2.00', buy:800,  sell:1600 },
  { type:'Office Lens',   coating:'Blue Filter',        range:'0.00–2.00', buy:1000, sell:2000 },
  { type:'Reading (ready)',coating:'Hard Coat',         range:'0.00–2.00', buy:150,  sell:300  },
  { type:'Reading (ready)',coating:'Hard Coat',         range:'2.25–4.00', buy:200,  sell:400  },
];

const getPowerRange = (sphStr) => {
  if (!sphStr || sphStr === 'Plano' || sphStr === '0.00') return '0.00–2.00';
  const val = Math.abs(parseFloat(sphStr.replace(/[+-]/g, '')) || 0);
  if (val <= 2.00) return '0.00–2.00';
  if (val <= 4.00) return '2.25–4.00';
  if (val <= 6.00) return '4.25–6.00';
  return '6.25+';
};

const findLensPrice = (type, coating, sphStr) => {
  const range = getPowerRange(sphStr);
  return LENS_PRICES.find(p => p.type === type && p.coating === coating && p.range === range) || null;
};

const TITLES        = ['Mr.', 'Mrs.', 'Miss', 'Master', 'Baby', 'Rev.', 'Dr.'];
const DIOPTERS      = ['0.00', ...Array.from({ length: 80 }, (_, i) => ((i + 1) * 0.25).toFixed(2))];
const AXES          = Array.from({ length: 181 }, (_, i) => String(i));
const VA_OPTIONS    = ['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', 'CF', 'HM', 'PL'];
const FRAME_TYPES   = ['Full rim', 'Half rim', 'Rimless', 'Sunglass'];
const FRAME_MATS    = ['Plastic', 'Metal', 'TR90', 'Titanium', 'Acetate'];
// PATCH 4 — Frame color list
const FRAME_COLORS  = ['Black','Gold','Silver','Brown','Gunmetal','Blue','Red','Pink','Tortoise','Crystal','Other'];
const LENS_TYPES    = ['Single Vision', 'Bifocal', 'Progressive', 'Office Lens', 'Reading (ready)'];
const LENS_COATINGS = ['HMC', 'Hard Coat', 'Blue Filter', 'Photochromic', 'Blue + Photochromic', 'AR Coat'];

const fmtMoney = (n) => 'Rs. ' + parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 0 });

// ── Step bar ──────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Customer', 'Refraction', 'Frame & Lens', 'Payment'];
  return (
    <div style={{ display:'flex', alignItems:'center', background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 20px', marginBottom:20, overflowX:'auto' }}>
      {steps.map((s, i) => {
        const n = i + 1; const done = step > n; const active = step === n;
        return (
          <React.Fragment key={s}>
            <div style={{ display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap' }}>
              <div style={{ width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0, background:done?C.success:active?C.navy:C.cream, color:done||active?'white':C.muted, border:`2px solid ${done?C.success:active?C.navy:C.border}` }}>
                {done ? '✓' : n}
              </div>
              <span style={{ fontSize:13, fontWeight:active?700:500, color:active?C.navy:done?C.success:C.muted }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex:1, height:2, background:step>n?C.success:C.border, margin:'0 10px', minWidth:20 }}/>}
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

// ── Main component ────────────────────────────────────────────
export default function NewOrder() {
  const navigate = useNavigate();
  const [step,   setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  // Customer
  const [custMode,     setCustMode]     = useState('search');
  const [custSearch,   setCustSearch]   = useState('');
  const [custResults,  setCustResults]  = useState([]);
  const [selectedCust, setSelectedCust] = useState(null);
  const [newCust, setNewCust] = useState({ title:'Mr.', name:'', phone:'', age:'' });
  const searchTimer = useRef(null);

  // Refraction
  const [ref, setRef] = useState({
    r_sph_s:'-', r_sph:'0.00', r_cyl_s:'-', r_cyl:'0.00', r_axis:'0', r_add:'0.00', r_va:'6/6', r_pd:'',
    l_sph_s:'-', l_sph:'0.00', l_cyl_s:'-', l_cyl:'0.00', l_axis:'0', l_add:'0.00', l_va:'6/6', l_pd:'',
    notes:'',
  });
  const [hasRx,      setHasRx]      = useState(false);
  const [rxHospital, setRxHospital] = useState('');
  const [rxDate,     setRxDate]     = useState('');
  const [rxDoctor,   setRxDoctor]   = useState('');

  // Frame
  const [frameSearch,   setFrameSearch]   = useState('');
  const [frameResults,  setFrameResults]  = useState([]);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const frameTimer = useRef(null);

  // PATCH 1 — added color: 'Black' to frameDetails state
  const [frameDetails, setFrameDetails] = useState({
    name:'', type:'Full rim', material:'Plastic', color:'Black',
    buyPrice:0, sellPrice:0, frameDiscount:0,
  });

  // Lens
  const [lensDetails, setLensDetails] = useState({
    type:'Single Vision', coating:'HMC',
    buyPrice:0, sellPrice:0, lensDiscount:0,
    matchedRange:'', matched:false,
  });

  // PATCH 5 — segment height state for Progressive
  const [segHeightR, setSegHeightR] = useState('');
  const [segHeightL, setSegHeightL] = useState('');

  // Payment
  const [advance,     setAdvance]     = useState('');
  const [deliverDate, setDeliverDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  // Computed totals
  const frameFinal    = Math.max(0, (frameDetails.sellPrice||0) - (frameDetails.frameDiscount||0));
  const lensFinal     = Math.max(0, (lensDetails.sellPrice||0)  - (lensDetails.lensDiscount||0));
  const totalAmount   = frameFinal + lensFinal;
  const balanceAmount = Math.max(0, totalAmount - (parseFloat(advance)||0));

  // Auto-lookup lens price
  const lookupLens = useCallback((type, coating, sphStr) => {
    const match = findLensPrice(type, coating, sphStr);
    setLensDetails(l => ({
      ...l, type, coating,
      buyPrice:     match ? match.buy  : 0,
      sellPrice:    match ? match.sell : 0,
      matchedRange: match ? match.range : '',
      matched:      !!match,
      lensDiscount: 0,
    }));
  }, []);

  // Customer search
  const handleCustSearch = (v) => {
    setCustSearch(v);
    setSelectedCust(null);
    clearTimeout(searchTimer.current);
    if (v.length < 2) return setCustResults([]);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await getCustomers({ search: v });
        setCustResults(res.data.slice(0, 6));
      } catch { setCustResults([]); }
    }, 400);
  };

  const pickCustomer = (c) => {
    setSelectedCust(c);
    setCustSearch(c.name);
    setCustResults([]);
  };

  // Frame search
  const handleFrameSearch = (v) => {
    setFrameSearch(v);
    setFrameDetails(f => ({ ...f, name: v }));
    setSelectedFrame(null);
    clearTimeout(frameTimer.current);
    if (v.length < 2) return setFrameResults([]);
    frameTimer.current = setTimeout(async () => {
      try {
        const res = await getInventory({ search: v, category: 'Frames' });
        setFrameResults(res.data.filter(i => i.quantity > 0).slice(0, 6));
      } catch { setFrameResults([]); }
    }, 400);
  };

  // PATCH 2 — updated pickFrame to capture color, frame_type, frame_material from stock item
  const pickFrame = (item) => {
    setSelectedFrame(item);
    setFrameSearch(item.name);
    setFrameResults([]);
    const buy  = parseFloat(item.cost_price)  || 0;
    const sell = parseFloat(item.sell_price)  || 0;
    setFrameDetails({
      name:     item.name,
      type:     item.frame_type     || frameDetails.type,
      material: item.frame_material || frameDetails.material,
      color:    item.frame_color    || 'Black',   // PATCH 2
      buyPrice:     buy,
      sellPrice:    sell,
      frameDiscount: 0,
    });
  };

  // Copy right to left eye
  const copyEye = () => setRef(r => ({
    ...r, l_sph_s:r.r_sph_s, l_sph:r.r_sph, l_cyl_s:r.r_cyl_s, l_cyl:r.r_cyl,
    l_axis:r.r_axis, l_add:r.r_add, l_va:r.r_va, l_pd:r.r_pd,
  }));

  // Validation
  const validate = (s) => {
    if (s === 1) {
      if (custMode === 'search' && !selectedCust)      return 'Please select an existing customer or switch to add new';
      if (custMode === 'new' && !newCust.name.trim())  return 'Please enter customer name';
      if (custMode === 'new' && !newCust.phone.trim()) return 'Please enter phone number';
    }
    if (s === 3) {
      if (!frameDetails.name.trim()) return 'Please enter or select a frame';
    }
    if (s === 4) {
      if (totalAmount <= 0)           return 'Total amount must be greater than 0';
      if (!deliverDate)               return 'Please set a delivery date';
      if ((parseFloat(advance)||0) > totalAmount) return 'Advance cannot be more than total amount';
    }
    return null;
  };

  const goNext = () => {
    const err = validate(step);
    if (err) return setError(err);
    setError('');
    if (step === 2) lookupLens(lensDetails.type, lensDetails.coating, ref.r_sph_s + ref.r_sph);
    setStep(s => s + 1);
  };

  // Save order
  const handleSave = async () => {
    const err = validate(4);
    if (err) return setError(err);
    setError('');
    setSaving(true);
    try {
      let customerId;
      if (custMode === 'search' && selectedCust) {
        customerId = selectedCust.id;
      } else {
        try {
          const res = await createCustomer({ name:`${newCust.title} ${newCust.name}`.trim(), phone:newCust.phone.trim(), age:newCust.age||null });
          customerId = res.data.id;
        } catch (e) {
          if (e.response?.status === 409) customerId = e.response.data.id;
          else throw e;
        }
      }

      const combineSph = (s, v) => (!v || v === '0.00') ? 'Plano' : s + v;
      const combineCyl = (s, v) => (!v || v === '0.00') ? '0.00'  : s + v;

      await createOrder({
        customer_id:      customerId,
        frame:            frameDetails.name,
        frame_type:       frameDetails.type,
        frame_material:   frameDetails.material,
        frame_color:      frameDetails.color,        // PATCH 6
        lens_type:        lensDetails.type,
        lens_coating:     lensDetails.coating,
        lens_company:     null,
        frame_buy_price:  frameDetails.buyPrice,
        frame_sell_price: frameFinal,
        lens_buy_price:   lensDetails.buyPrice,
        lens_sell_price:  lensFinal,
        total_amount:     totalAmount,
        advance_amount:   parseFloat(advance) || 0,
        balance_amount:   balanceAmount,
        deliver_date:     deliverDate,
        status:           'created',
        notes:            notes || null,
        has_rx:           hasRx,
        rx_hospital:      hasRx ? rxHospital : null,
        rx_date:          hasRx ? rxDate     : null,
        rx_doctor:        hasRx ? rxDoctor   : null,
        seg_height_r:     segHeightR || null,        // PATCH 6
        seg_height_l:     segHeightL || null,        // PATCH 6
        r_sph:  combineSph(ref.r_sph_s, ref.r_sph),
        r_cyl:  combineCyl(ref.r_cyl_s, ref.r_cyl),
        r_axis: ref.r_axis, r_add: ref.r_add !== '0.00' ? '+'+ref.r_add : null,
        r_va:   ref.r_va,   r_pd:  ref.r_pd || null,
        l_sph:  combineSph(ref.l_sph_s, ref.l_sph),
        l_cyl:  combineCyl(ref.l_cyl_s, ref.l_cyl),
        l_axis: ref.l_axis, l_add: ref.l_add !== '0.00' ? '+'+ref.l_add : null,
        l_va:   ref.l_va,   l_pd:  ref.l_pd || null,
        ref_notes: ref.notes || null,
      });

      navigate('/orders');
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.error || 'Failed to save order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:740, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:8 }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.navy, margin:0 }}>➕ New Order</h1>
        <button onClick={() => navigate('/orders')}
          style={{ padding:'8px 18px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
          ← Back
        </button>
      </div>
      <p style={{ fontSize:13, color:C.muted, marginBottom:20 }}>Fill all 4 steps to create an order</p>

      <StepBar step={step} />

      {error && (
        <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:10, padding:'11px 16px', fontSize:13, marginBottom:16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ═══════════════ STEP 1 — CUSTOMER ═══════════════════ */}
      {step === 1 && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 22px', marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.navy, marginBottom:18 }}>👤 Customer Details</div>

          <div style={{ display:'flex', gap:6, marginBottom:18 }}>
            {[['search','🔍 Existing customer'],['new','➕ New customer']].map(([mode,label]) => (
              <button key={mode} onClick={() => { setCustMode(mode); setError(''); }}
                style={{ padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${custMode===mode?C.navy:C.border}`, background:custMode===mode?C.navy:'white', color:custMode===mode?'white':C.muted }}>
                {label}
              </button>
            ))}
          </div>

          {custMode === 'search' && (
            <div style={{ position:'relative' }}>
              <Field label="Search by name or phone">
                <input value={custSearch} onChange={e => handleCustSearch(e.target.value)} placeholder="Type name or phone number..." style={INP}/>
              </Field>
              {custResults.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:`1px solid ${C.border}`, borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.12)', zIndex:50, overflow:'hidden', marginTop:4 }}>
                  {custResults.map(c => (
                    <div key={c.id} onMouseDown={() => pickCustomer(c)}
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
                  <button onMouseDown={() => { setSelectedCust(null); setCustSearch(''); setCustResults([]); }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:16 }}>✕</button>
                </div>
              )}
              {!selectedCust && !custResults.length && custSearch.length > 1 && (
                <div style={{ marginTop:8, fontSize:13, color:C.muted }}>
                  Not found —{' '}
                  <button onMouseDown={() => setCustMode('new')}
                    style={{ background:'none', border:'none', color:C.navy, cursor:'pointer', fontWeight:700, fontFamily:'inherit', textDecoration:'underline' }}>
                    add as new customer
                  </button>
                </div>
              )}
            </div>
          )}

          {custMode === 'new' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Title">
                <select value={newCust.title} onChange={e => setNewCust(c => ({ ...c, title:e.target.value }))} style={SEL}>
                  {TITLES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Full Name *">
                <input value={newCust.name} onChange={e => setNewCust(c => ({ ...c, name:e.target.value }))} placeholder="e.g. Nuwan Perera" style={INP}/>
              </Field>
              <Field label="Phone *">
                <input value={newCust.phone} onChange={e => setNewCust(c => ({ ...c, phone:e.target.value }))} placeholder="077-123-4567" type="tel" style={INP}/>
              </Field>
              <Field label="Age">
                <input value={newCust.age} onChange={e => setNewCust(c => ({ ...c, age:e.target.value }))} placeholder="e.g. 34" type="number" style={INP}/>
              </Field>
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:20 }}>
            <button onClick={goNext}
              style={{ padding:'11px 28px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Next: Refraction →
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ STEP 2 — REFRACTION ════════════════ */}
      {step === 2 && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 22px', marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.navy, marginBottom:18 }}>🔭 Refraction Results</div>

          {[{ label:'Right Eye (R)', p:'r' }, { label:'Left Eye (L)', p:'l' }].map(eye => (
            <div key={eye.p} style={{ background:C.cream, borderRadius:10, padding:14, marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10 }}>{eye.label}</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <Field label="SPH">
                  <div style={{ display:'flex', gap:4 }}>
                    <select value={ref[`${eye.p}_sph_s`]} onChange={e => setRef(r => ({ ...r, [`${eye.p}_sph_s`]:e.target.value }))} style={{ ...SEL, width:56, padding:'10px 6px' }}>
                      <option>-</option><option>+</option>
                    </select>
                    <select value={ref[`${eye.p}_sph`]} onChange={e => setRef(r => ({ ...r, [`${eye.p}_sph`]:e.target.value }))} style={{ ...SEL, width:90 }}>
                      {DIOPTERS.map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                </Field>
                <Field label="CYL">
                  <div style={{ display:'flex', gap:4 }}>
                    <select value={ref[`${eye.p}_cyl_s`]} onChange={e => setRef(r => ({ ...r, [`${eye.p}_cyl_s`]:e.target.value }))} style={{ ...SEL, width:56, padding:'10px 6px' }}>
                      <option>-</option><option>+</option>
                    </select>
                    <select value={ref[`${eye.p}_cyl`]} onChange={e => setRef(r => ({ ...r, [`${eye.p}_cyl`]:e.target.value }))} style={{ ...SEL, width:90 }}>
                      {DIOPTERS.map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                </Field>
                <Field label="AXIS">
                  <select value={ref[`${eye.p}_axis`]} onChange={e => setRef(r => ({ ...r, [`${eye.p}_axis`]:e.target.value }))} style={{ ...SEL, width:80 }}>
                    {AXES.map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="ADD">
                  <select value={ref[`${eye.p}_add`]} onChange={e => setRef(r => ({ ...r, [`${eye.p}_add`]:e.target.value }))} style={{ ...SEL, width:90 }}>
                    {DIOPTERS.map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="V/A">
                  <select value={ref[`${eye.p}_va`]} onChange={e => setRef(r => ({ ...r, [`${eye.p}_va`]:e.target.value }))} style={{ ...SEL, width:84 }}>
                    {VA_OPTIONS.map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="PD">
                  <input value={ref[`${eye.p}_pd`]} onChange={e => setRef(r => ({ ...r, [`${eye.p}_pd`]:e.target.value }))} placeholder="32" style={{ ...INP, width:72 }}/>
                </Field>
              </div>
            </div>
          ))}

          <button onClick={copyEye}
            style={{ background:C.cream, border:`1px solid ${C.border}`, borderRadius:7, padding:'6px 14px', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted, marginBottom:14 }}>
            ↓ Copy Right Eye to Left Eye
          </button>

          <Field label="Remarks / Clinical Notes">
            <textarea value={ref.notes} onChange={e => setRef(r => ({ ...r, notes:e.target.value }))}
              placeholder="e.g. Presbyopia, recommend progressive lenses..."
              style={{ ...INP, resize:'vertical', minHeight:72, lineHeight:1.6 }}/>
          </Field>

          <div style={{ background:'#f0f9ff', borderRadius:10, padding:'14px 16px', marginTop:14 }}>
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
              <div onClick={() => setHasRx(h => !h)}
                style={{ width:44, height:24, borderRadius:12, background:hasRx?C.navy:C.border, position:'relative', cursor:'pointer', transition:'background .2s', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left:hasRx?23:3, width:18, height:18, borderRadius:'50%', background:'white', transition:'left .2s' }}/>
              </div>
              <span style={{ fontSize:14, fontWeight:500, color:C.navy }}>Customer brought a prescription (Rx)</span>
            </label>
            {hasRx && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:14 }}>
                <Field label="Hospital / Clinic">
                  <input value={rxHospital} onChange={e => setRxHospital(e.target.value)} placeholder="e.g. Colombo National Hospital" style={INP}/>
                </Field>
                <Field label="Prescription Date">
                  <input type="date" value={rxDate} onChange={e => setRxDate(e.target.value)} style={INP}/>
                </Field>
                <div style={{ gridColumn:'1/-1' }}>
                  <Field label="Doctor's Name (optional)">
                    <input value={rxDoctor} onChange={e => setRxDoctor(e.target.value)} placeholder="e.g. Dr. Perera" style={INP}/>
                  </Field>
                </div>
              </div>
            )}
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', marginTop:20 }}>
            <button onClick={() => setStep(1)} style={{ padding:'11px 20px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>← Back</button>
            <button onClick={goNext} style={{ padding:'11px 28px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Next: Frame & Lens →</button>
          </div>
        </div>
      )}

      {/* ═══════════════ STEP 3 — FRAME & LENS ══════════════ */}
      {step === 3 && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 22px', marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.navy, marginBottom:18 }}>🕶️ Frame & Lens</div>

          {/* Frame section */}
          <div style={{ background:C.cream, borderRadius:10, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:12 }}>Frame</div>

            {/* Frame search */}
            <div style={{ position:'relative', marginBottom:12 }}>
              <Field label="Search Frame from Stock">
                <input value={frameSearch} onChange={e => handleFrameSearch(e.target.value)} placeholder="Type frame name to search stock..." style={INP}/>
              </Field>
              {frameResults.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:`1px solid ${C.border}`, borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.12)', zIndex:50, overflow:'hidden', marginTop:4 }}>
                  {frameResults.map(i => (
                    <div key={i.id} onMouseDown={() => pickFrame(i)}
                      style={{ padding:'10px 14px', cursor:'pointer', borderBottom:`1px solid ${C.cream}`, display:'flex', alignItems:'center', gap:10 }}>
                      {i.image_url && <img src={i.image_url} alt="" style={{ width:40, height:40, objectFit:'cover', borderRadius:6 }}/>}
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{i.name}</div>
                        <div style={{ fontSize:11, color:C.muted }}>
                          {i.frame_color && `${i.frame_color} · `}{i.frame_type && `${i.frame_type} · `}
                          Buy: {fmtMoney(i.cost_price)} · Sell: {fmtMoney(i.sell_price)} · {i.quantity} in stock
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PATCH 3 — Frame photo shown after selection */}
            {selectedFrame && selectedFrame.image_url && (
              <div style={{ marginBottom:12, borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}` }}>
                <img src={selectedFrame.image_url} alt={selectedFrame.name}
                  style={{ width:'100%', height:160, objectFit:'cover' }}/>
                <div style={{ padding:'8px 12px', background:'#dcfce7', fontSize:12, fontWeight:600, color:'#2d7a4f' }}>
                  ✅ {selectedFrame.name}
                  {selectedFrame.frame_color ? ` · ${selectedFrame.frame_color}` : ''}
                  {selectedFrame.frame_type  ? ` · ${selectedFrame.frame_type}`  : ''}
                </div>
              </div>
            )}

            {/* Frame details grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <Field label="Frame Type">
                <select value={frameDetails.type} onChange={e => setFrameDetails(f => ({ ...f, type:e.target.value }))} style={SEL}>
                  {FRAME_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Frame Material">
                <select value={frameDetails.material} onChange={e => setFrameDetails(f => ({ ...f, material:e.target.value }))} style={SEL}>
                  {FRAME_MATS.map(m => <option key={m}>{m}</option>)}
                </select>
              </Field>

              {/* PATCH 4 — Frame color selector */}
              <Field label="Frame Color">
                <select value={frameDetails.color} onChange={e => setFrameDetails(f => ({ ...f, color:e.target.value }))} style={SEL}>
                  {FRAME_COLORS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="Frame Buying Price (Rs.)">
                <input type="number" value={frameDetails.buyPrice} onChange={e => setFrameDetails(f => ({ ...f, buyPrice:parseFloat(e.target.value)||0 }))} style={INP}/>
              </Field>
              <Field label="Frame Selling Price (Rs.)">
                <input type="number" value={frameDetails.sellPrice} onChange={e => setFrameDetails(f => ({ ...f, sellPrice:parseFloat(e.target.value)||0 }))} style={INP}/>
              </Field>
            </div>
          </div>

          {/* Lens section */}
          <div style={{ background:'#f0f9ff', borderRadius:10, padding:16, marginBottom:8 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:12 }}>Lens</div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <Field label="Lens Type">
                <select value={lensDetails.type} onChange={e => { const t=e.target.value; lookupLens(t, lensDetails.coating, ref.r_sph_s+ref.r_sph); }} style={SEL}>
                  {LENS_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Lens Coating">
                <select value={lensDetails.coating} onChange={e => { const c=e.target.value; lookupLens(lensDetails.type, c, ref.r_sph_s+ref.r_sph); }} style={SEL}>
                  {LENS_COATINGS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            {/* Lens price display */}
            {lensDetails.matched ? (
              <div style={{ background:'#dbeafe', borderRadius:9, padding:'12px 14px', marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#1e40af', marginBottom:6 }}>
                  Auto-matched · Power range: {lensDetails.matchedRange}
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
                <input type="number" value={lensDetails.buyPrice} onChange={e => setLensDetails(l => ({ ...l, buyPrice:parseFloat(e.target.value)||0 }))} style={INP}/>
              </Field>
              <Field label="Lens Selling Price (Rs.)">
                <input type="number" value={lensDetails.sellPrice} onChange={e => setLensDetails(l => ({ ...l, sellPrice:parseFloat(e.target.value)||0 }))} style={INP}/>
              </Field>
            </div>

            {/* PATCH 5 — Segment height fields for Progressive */}
            {lensDetails.type === 'Progressive' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:12, padding:'12px 14px', background:'#e0f2fe', borderRadius:9 }}>
                <div style={{ gridColumn:'1/-1', fontSize:12, fontWeight:700, color:'#0369a1', marginBottom:4 }}>
                  📐 Segment Height (for Progressive lenses)
                </div>
                <Field label="Seg. Height Right (mm)">
                  <input type="number" value={segHeightR} onChange={e => setSegHeightR(e.target.value)} placeholder="e.g. 20" style={INP}/>
                </Field>
                <Field label="Seg. Height Left (mm)">
                  <input type="number" value={segHeightL} onChange={e => setSegHeightL(e.target.value)} placeholder="e.g. 20" style={INP}/>
                </Field>
              </div>
            )}
          </div>

          <div style={{ background:'#fef9c3', border:`1px solid #fde68a`, borderRadius:9, padding:'10px 14px', fontSize:12, color:'#854d0e' }}>
            🔬 Grinding lab will be assigned tomorrow from the <b>Grinding</b> tab
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', marginTop:20 }}>
            <button onClick={() => setStep(2)} style={{ padding:'11px 20px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>← Back</button>
            <button onClick={goNext} style={{ padding:'11px 28px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Next: Payment →</button>
          </div>
        </div>
      )}

      {/* ═══════════════ STEP 4 — PAYMENT ═══════════════════ */}
      {step === 4 && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 22px', marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.navy, marginBottom:18 }}>💰 Payment & Delivery</div>

          {/* Price breakdown */}
          <div style={{ background:C.cream, borderRadius:12, padding:16, marginBottom:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:12 }}>Price Breakdown</div>

            {/* Frame row */}
            <div style={{ background:'white', borderRadius:9, padding:'12px 14px', marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>
                  🕶️ {frameDetails.name||'Frame'} · {frameDetails.color}
                </span>
                <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>{fmtMoney(frameFinal)}</span>
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                <span style={{ fontSize:11, color:C.muted }}>Sell price:</span>
                <input type="number" value={frameDetails.sellPrice}
                  onChange={e => setFrameDetails(f => ({ ...f, sellPrice:parseFloat(e.target.value)||0 }))}
                  style={{ ...INP, width:110, padding:'6px 10px', fontSize:13 }}/>
                <span style={{ fontSize:11, color:C.muted }}>Discount:</span>
                <input type="number" value={frameDetails.frameDiscount}
                  onChange={e => setFrameDetails(f => ({ ...f, frameDiscount:parseFloat(e.target.value)||0 }))}
                  placeholder="0" style={{ ...INP, width:100, padding:'6px 10px', fontSize:13 }}/>
                {frameDetails.frameDiscount > 0 && (
                  <span style={{ fontSize:11, color:C.success, fontWeight:700 }}>-{fmtMoney(frameDetails.frameDiscount)}</span>
                )}
              </div>
            </div>

            {/* Lens row */}
            <div style={{ background:'white', borderRadius:9, padding:'12px 14px', marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>🔬 {lensDetails.type} · {lensDetails.coating}</span>
                <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>{fmtMoney(lensFinal)}</span>
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                <span style={{ fontSize:11, color:C.muted }}>Sell price:</span>
                <input type="number" value={lensDetails.sellPrice}
                  onChange={e => setLensDetails(l => ({ ...l, sellPrice:parseFloat(e.target.value)||0 }))}
                  style={{ ...INP, width:110, padding:'6px 10px', fontSize:13 }}/>
                <span style={{ fontSize:11, color:C.muted }}>Discount:</span>
                <input type="number" value={lensDetails.lensDiscount}
                  onChange={e => setLensDetails(l => ({ ...l, lensDiscount:parseFloat(e.target.value)||0 }))}
                  placeholder="0" style={{ ...INP, width:100, padding:'6px 10px', fontSize:13 }}/>
                {lensDetails.lensDiscount > 0 && (
                  <span style={{ fontSize:11, color:C.success, fontWeight:700 }}>-{fmtMoney(lensDetails.lensDiscount)}</span>
                )}
              </div>
            </div>

            {/* Total */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:`2px solid ${C.border}`, paddingTop:12 }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>Total</span>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.navy }}>{fmtMoney(totalAmount)}</span>
            </div>
          </div>

          {/* Advance + balance */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
            <Field label="Advance Paid (Rs.)">
              <input type="number" value={advance} onChange={e => setAdvance(e.target.value)} placeholder="e.g. 3000" style={INP}/>
            </Field>
            <div/>
            <div style={{ background:C.navy, borderRadius:10, padding:'12px 14px', textAlign:'center', display:'flex', flexDirection:'column', justifyContent:'center' }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.gold, marginBottom:4 }}>Balance Due</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:'white' }}>{fmtMoney(balanceAmount)}</div>
            </div>
          </div>

          {/* Delivery + status */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <Field label="Delivery Date *">
              <input type="date" value={deliverDate} onChange={e => setDeliverDate(e.target.value)} style={INP}/>
            </Field>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted }}>Status</label>
              <div style={{ padding:'10px 16px', background:'#dbeafe', border:`2px solid #93c5fd`, borderRadius:9, fontSize:13, fontWeight:600, color:'#1e40af', display:'inline-flex', alignItems:'center', gap:6 }}>
                📝 Created
              </div>
            </div>
          </div>

          {/* Notes */}
          <Field label="Internal Notes (optional)">
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any notes about this order..."
              style={{ ...INP, resize:'vertical', minHeight:72, lineHeight:1.6 }}/>
          </Field>

          {/* Summary */}
          <div style={{ background:C.cream, borderRadius:12, padding:16, marginTop:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10 }}>📋 Order Summary</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:13 }}>
              {[
                { l:'Customer',    v: custMode==='new' ? `${newCust.title} ${newCust.name}` : selectedCust?.name },
                { l:'Phone',       v: custMode==='new' ? newCust.phone : selectedCust?.phone },
                { l:'Frame',       v: `${frameDetails.name||'—'} (${frameDetails.color})` },
                { l:'Lens',        v: `${lensDetails.type} · ${lensDetails.coating}` },
                { l:'Frame price', v: fmtMoney(frameFinal) },
                { l:'Lens price',  v: fmtMoney(lensFinal)  },
                { l:'Total',       v: fmtMoney(totalAmount), bold:true },
                { l:'Balance',     v: fmtMoney(balanceAmount), red:balanceAmount>0 },
              ].map(item => (
                <div key={item.l} style={{ fontSize:13 }}>
                  <span style={{ color:C.muted }}>{item.l}: </span>
                  <b style={{ color:item.red?C.danger:item.bold?C.navy:'#1a1a2e' }}>{item.v||'—'}</b>
                </div>
              ))}
              {/* Show seg heights in summary if progressive */}
              {lensDetails.type === 'Progressive' && (segHeightR || segHeightL) && (
                <div style={{ gridColumn:'1/-1', fontSize:13 }}>
                  <span style={{ color:C.muted }}>Seg. Height: </span>
                  <b>R: {segHeightR||'—'} mm · L: {segHeightL||'—'} mm</b>
                </div>
              )}
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginTop:20 }}>
            <button onClick={() => setStep(3)} style={{ padding:'11px 20px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>← Back</button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:'12px 36px', background:saving?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:15, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {saving ? '⏳ Saving...' : '💾 Save Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
