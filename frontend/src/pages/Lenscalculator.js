/* eslint-disable */
// ============================================================
//  LensCalculator.js — Quick Quote Calculator
//  Show customer total price, hide cost from them
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};

const fmt = (n) => 'Rs. ' + Math.round(parseFloat(n)||0).toLocaleString('en-LK');

// ── Reference price list (same as NewOrder) ───────────────────
const SUPPLIER_PRICES = [
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'UC',              sell_price:1200 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'Multi Coded',     sell_price:1600 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.56', color:'Photo-Gray', coating:'HMC',             sell_price:2200 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'Blue Cut HMC',    sell_price:2200 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'Blue Cut PG HMC', sell_price:3500 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.61', color:'White',      coating:'HMC',             sell_price:3300 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.61', color:'Photo-Gray', coating:'HMC',             sell_price:3700 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.61', color:'White',      coating:'Blue Cut HMC',    sell_price:5100 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.67', color:'White',      coating:'HMC',             sell_price:5750 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.67', color:'Photo-Gray', coating:'HMC',             sell_price:9250 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.67', color:'White',      coating:'Blue Cut HMC',    sell_price:6550 },
  { supplier:'Lanka Optic', lens_type:'Progressive',   lens_index:'1.56', color:'White',      coating:'HMC',             sell_price:2300 },
  { supplier:'Lanka Optic', lens_type:'Progressive',   lens_index:'1.56', color:'Photo-Gray', coating:'HMC',             sell_price:3000 },
  { supplier:'Lanka Optic', lens_type:'Progressive',   lens_index:'1.56', color:'White',      coating:'Blue Cut HMC',    sell_price:2700 },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.6',  color:'White',      coating:'HMC',      sell_price:2500  },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.6',  color:'White',      coating:'Blue Cut', sell_price:2800  },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.6',  color:'Photo-Gray', coating:'HMC',      sell_price:7250  },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.67', color:'White',      coating:'HMC',      sell_price:4000  },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.67', color:'White',      coating:'Blue Cut', sell_price:4550  },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.67', color:'Photo-Gray', coating:'HMC',      sell_price:10250 },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.74', color:'White',      coating:'HMC',      sell_price:11000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.56', color:'White',      coating:'HMC DSC',       sell_price:7000  },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.56', color:'Photo-Gray', coating:'Photo HMC DSC', sell_price:8500  },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.56', color:'White',      coating:'Blue Cut DSC',  sell_price:9000  },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.60', color:'White',      coating:'HMC DSC',       sell_price:19000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.67', color:'White',      coating:'HMC DSC',       sell_price:25000 },
  { supplier:'Neo Vision', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'HMC DSC',       sell_price:4000  },
  { supplier:'Neo Vision', lens_type:'Single Vision', lens_index:'1.56', color:'Photo-Gray', coating:'Photo HMC DSC', sell_price:5500  },
  { supplier:'Neo Vision', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'Blue Cut DSC',  sell_price:6000  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'UC',    sell_price:1500  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'HMC',   sell_price:2200  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.56', color:'Photo-Gray', coating:'HMC',   sell_price:2800  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'BC PG', sell_price:4000  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.67', color:'White',      coating:'HMC',   sell_price:10250 },
  { supplier:'Omega', lens_type:'Progressive',   lens_index:'1.56', color:'White',      coating:'HMC',   sell_price:2300,  brand:'Omega Eyesphere' },
  { supplier:'Omega', lens_type:'Progressive',   lens_index:'1.56', color:'White',      coating:'BC PG', sell_price:4500,  brand:'Omega Eyesphere' },
  { supplier:'Omega', lens_type:'Progressive',   lens_index:'1.56', color:'White',      coating:'HMC',   sell_price:8000,  brand:'Omega Signature'  },
  { supplier:'Omega', lens_type:'Progressive',   lens_index:'1.56', color:'White',      coating:'BC PG', sell_price:11250, brand:'Omega Signature'  },
];

const LENS_TYPES = ['Single Vision', 'Bifocal', 'Progressive', 'Office Lens'];
const COATINGS   = ['UC', 'HMC', 'Multi Coded', 'Blue Cut', 'Blue Cut HMC', 'Blue Cut PG HMC', 'BC PG', 'Photo-Gray HMC', 'Polarize'];
const INDEXES    = ['CR39', '1.56', '1.59', '1.60', '1.61', '1.67', '1.74'];

function apiGet(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { headers:{ Authorization:`Bearer ${token}` }}).then(r=>r.json());
}

export default function LensCalculator() {
  const navigate = useNavigate();

  // Lens inputs
  const [lensType,  setLensType]  = useState('Single Vision');
  const [coating,   setCoating]   = useState('HMC');
  const [index,     setIndex]     = useState('1.56');
  const [color,     setColor]     = useState('White');

  // Rx
  const [rSph, setRSph] = useState('');
  const [lSph, setLSph] = useState('');

  // Pricing
  const [costPrice,   setCostPrice]   = useState(0);
  const [multiplier,  setMultiplier]  = useState(3);
  const [framePrice,  setFramePrice]  = useState('');
  const [discount,    setDiscount]    = useState('');
  const [dbPrices,    setDbPrices]    = useState([]);
  const [supplier,    setSupplier]    = useState('');

  // Customer view toggle
  const [customerMode, setCustomerMode] = useState(false);

  // Load DB prices
  useEffect(() => {
    apiGet('/lens-prices').then(d => setDbPrices(Array.isArray(d)?d:d?.data||[])).catch(()=>{});
  }, []);

  // Auto-find cost price when inputs change
  useEffect(() => {
    findPrice();
  }, [lensType, coating, index, color, dbPrices]);

  const norm = s => (s||'').toLowerCase().replace(/[\s\-_()]/g,'');

  const findPrice = useCallback(() => {
    // 1. Try DB first
    if (dbPrices.length > 0) {
      const match = dbPrices.find(p =>
        norm(p.lens_type) === norm(lensType) &&
        (!index || index === 'Default' || norm(p.lens_index) === norm(index)) &&
        norm(p.color||p.colour||'white') === norm(color) &&
        norm(p.coating) === norm(coating)
      );
      if (match) {
        setCostPrice(parseFloat(match.buy_price)||0);
        setSupplier(match.brand||match.supplier||'DB');
        return;
      }
    }
    // 2. Fall back to reference list
    const ref = SUPPLIER_PRICES.find(p =>
      norm(p.lens_type) === norm(lensType) &&
      norm(p.lens_index) === norm(index) &&
      norm(p.color) === norm(color) &&
      norm(p.coating) === norm(coating)
    );
    if (ref) {
      setCostPrice(ref.sell_price);
      setSupplier(ref.supplier + ' (ref)');
    } else {
      setCostPrice(0);
      setSupplier('');
    }
  }, [lensType, coating, index, color, dbPrices]);

  // Determine lens index recommendation based on Rx
  const getIndexRecommendation = () => {
    const powers = [rSph, lSph].map(v => Math.abs(parseFloat(v)||0));
    const maxPower = Math.max(...powers);
    if (maxPower === 0) return null;
    if (maxPower <= 2)  return { index:'1.56', reason:'Low power — 1.56 is fine' };
    if (maxPower <= 4)  return { index:'1.61', reason:'Moderate power — 1.61 recommended' };
    if (maxPower <= 6)  return { index:'1.67', reason:'High power — 1.67 recommended for thinner lens' };
    return { index:'1.74', reason:'Very high power — 1.74 recommended for thinnest lens' };
  };

  const recommendation = getIndexRecommendation();

  // Calculations
  const lensSellingPrice = Math.round(costPrice * multiplier);
  const framePriceNum    = parseFloat(framePrice) || 0;
  const subTotal         = lensSellingPrice + framePriceNum;
  const discountNum      = parseFloat(discount) || 0;
  const totalPrice       = Math.max(0, subTotal - discountNum);

  const SEL = { padding:'10px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14,
    fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%', cursor:'pointer' };
  const INP = { ...SEL, cursor:'text' };

  // ── Customer-facing display ───────────────────────────────────
  if (customerMode) {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg, #0f1f3d 0%, #1a3260 100%)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:24, fontFamily:"'DM Sans',sans-serif" }}>

        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:13, color:C.gold, letterSpacing:'2px', textTransform:'uppercase', marginBottom:8 }}>
            Wickramakalutota Opticals
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:'white', fontWeight:700 }}>
            Your Quote
          </div>
        </div>

        <div style={{ background:'white', borderRadius:20, padding:28, width:'100%', maxWidth:400,
          boxShadow:'0 24px 80px rgba(0,0,0,.4)' }}>

          {/* Lens */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:6 }}>Lenses</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'14px 16px', background:C.cream, borderRadius:12 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>
                  {lensType} · {index} Index
                </div>
                <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                  {coating}{color !== 'White' ? ` · ${color}` : ''}
                </div>
              </div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.navy }}>
                {fmt(lensSellingPrice)}
              </div>
            </div>
          </div>

          {/* Frame */}
          {framePriceNum > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:6 }}>Frame</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'14px 16px', background:C.cream, borderRadius:12 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>Selected Frame</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.navy }}>
                  {fmt(framePriceNum)}
                </div>
              </div>
            </div>
          )}

          {/* Discount */}
          {discountNum > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0',
              fontSize:14, color:C.danger, fontWeight:600, borderTop:`1px solid ${C.border}`, marginBottom:4 }}>
              <span>Discount</span>
              <span>- {fmt(discountNum)}</span>
            </div>
          )}

          {/* Total */}
          <div style={{ background:C.navy, borderRadius:14, padding:'18px 20px', marginTop:12, textAlign:'center' }}>
            <div style={{ fontSize:12, color:C.gold, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>
              Total Price
            </div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontWeight:700, color:'white' }}>
              {fmt(totalPrice)}
            </div>
            {framePriceNum > 0 && (
              <div style={{ fontSize:12, color:'#ede9e0', marginTop:4 }}>
                Includes frame + lenses
              </div>
            )}
          </div>

          <div style={{ textAlign:'center', marginTop:16 }}>
            <div style={{ fontSize:12, color:C.muted }}>Wickramakalutota Opticals · Chilaw</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>Tel: 032 222 1211</div>
          </div>
        </div>

        <button onClick={()=>setCustomerMode(false)}
          style={{ marginTop:24, padding:'12px 28px', background:'rgba(255,255,255,.15)',
            border:'1.5px solid rgba(255,255,255,.3)', color:'white', borderRadius:10,
            fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
          ← Back to Calculator
        </button>
      </div>
    );
  }

  // ── Staff calculator view ─────────────────────────────────────
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:600, margin:'0 auto' }}>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <button onClick={()=>navigate('/dashboard')}
            style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:13, fontFamily:'inherit', padding:0, display:'block', marginBottom:4 }}>
            ← Dashboard
          </button>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.navy, margin:0 }}>
            🧮 Lens Price Calculator
          </h1>
        </div>
        <button onClick={()=>setCustomerMode(true)}
          style={{ padding:'10px 18px', background:C.navy, color:C.gold, border:'none', borderRadius:10,
            fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          👁️ Show Customer
        </button>
      </div>

      {/* Rx input */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px', marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:12 }}>
          Patient Rx (optional — for index recommendation)
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Right SPH</label>
            <input value={rSph} onChange={e=>setRSph(e.target.value)} placeholder="e.g. -2.50" style={INP}/>
          </div>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Left SPH</label>
            <input value={lSph} onChange={e=>setLSph(e.target.value)} placeholder="e.g. -1.75" style={INP}/>
          </div>
        </div>
        {recommendation && (
          <div style={{ marginTop:10, background:'#eff6ff', border:'1px solid #bae6fd', borderRadius:8,
            padding:'8px 12px', fontSize:12, color:'#1e40af', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>💡 {recommendation.reason}</span>
            <button onClick={()=>setIndex(recommendation.index)}
              style={{ background:'#1e40af', color:'white', border:'none', borderRadius:6,
                padding:'4px 10px', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Use {recommendation.index}
            </button>
          </div>
        )}
      </div>

      {/* Lens selection */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px', marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:12 }}>
          Lens Details
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Type</label>
            <select value={lensType} onChange={e=>setLensType(e.target.value)} style={SEL}>
              {LENS_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Index</label>
            <select value={index} onChange={e=>setIndex(e.target.value)} style={SEL}>
              {INDEXES.map(i=><option key={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Coating</label>
            <select value={coating} onChange={e=>setCoating(e.target.value)} style={SEL}>
              {COATINGS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Color / Tint</label>
            <select value={color} onChange={e=>setColor(e.target.value)} style={SEL}>
              {['White','Photo-Gray','Polarize','Blue','Brown','Green','Gray'].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Cost found */}
        <div style={{ background:costPrice>0?'#dbeafe':'#fef9c3', border:`1px solid ${costPrice>0?'#93c5fd':'#fde68a'}`,
          borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:costPrice>0?'#1e40af':'#92400e' }}>
              {costPrice>0 ? `Cost Price — ${supplier}` : 'No price found — enter manually'}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input type="number" value={costPrice||''} onChange={e=>setCostPrice(parseFloat(e.target.value)||0)}
              style={{ ...INP, width:100, fontSize:15, fontWeight:700, textAlign:'right' }}/>
          </div>
        </div>
      </div>

      {/* Multiplier & pricing */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px', marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:12 }}>
          Pricing
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:6 }}>
            Multiply cost by: <b style={{ color:C.navy, fontSize:14 }}>{multiplier}×</b>
          </label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[2, 2.5, 3, 3.5, 4, 5].map(m=>(
              <button key={m} onClick={()=>setMultiplier(m)}
                style={{ padding:'8px 16px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer',
                  fontFamily:'inherit', border:`1.5px solid ${multiplier===m?C.navy:C.border}`,
                  background:multiplier===m?C.navy:'white', color:multiplier===m?'white':C.muted }}>
                {m}×
              </button>
            ))}
            <input type="number" step="0.1" value={multiplier} onChange={e=>setMultiplier(parseFloat(e.target.value)||1)}
              style={{ ...INP, width:70, fontSize:13, textAlign:'center' }} placeholder="Custom"/>
          </div>
        </div>

        {/* Lens sell price */}
        <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0',
          borderTop:`1px solid ${C.border}`, fontSize:14 }}>
          <span style={{ color:C.muted }}>Cost × {multiplier} = Lens Price</span>
          <span style={{ fontWeight:700, color:C.navy }}>
            {fmt(costPrice)} × {multiplier} = <b style={{ fontSize:16 }}>{fmt(lensSellingPrice)}</b>
          </span>
        </div>

        {/* Frame */}
        <div style={{ marginTop:12 }}>
          <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Frame Price (Rs.) — optional</label>
          <input type="number" value={framePrice} onChange={e=>setFramePrice(e.target.value)}
            placeholder="0" style={INP}/>
        </div>

        {/* Discount */}
        <div style={{ marginTop:12 }}>
          <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Discount (Rs.) — optional</label>
          <input type="number" value={discount} onChange={e=>setDiscount(e.target.value)}
            placeholder="0" style={INP}/>
        </div>
      </div>

      {/* Summary — staff view */}
      <div style={{ background:C.navy, borderRadius:14, padding:'18px 20px', marginBottom:14 }}>
        <div style={{ fontSize:11, color:C.gold, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:14 }}>
          Price Summary
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#ede9e0' }}>
            <span>Cost price (×2 lenses)</span>
            <span>{fmt(costPrice * 2)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#ede9e0' }}>
            <span>Lens selling price</span>
            <span style={{ color:'#86efac', fontWeight:700 }}>{fmt(lensSellingPrice)}</span>
          </div>
          {framePriceNum > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#ede9e0' }}>
              <span>Frame</span>
              <span>{fmt(framePriceNum)}</span>
            </div>
          )}
          {discountNum > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#fca5a5' }}>
              <span>Discount</span>
              <span>- {fmt(discountNum)}</span>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:16, fontWeight:900,
            color:'white', borderTop:'1px solid rgba(255,255,255,.2)', paddingTop:10, marginTop:4 }}>
            <span>Total to Customer</span>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.gold }}>{fmt(totalPrice)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#86efac', marginTop:4 }}>
            <span>Your profit (lens only)</span>
            <span style={{ fontWeight:700 }}>{fmt(lensSellingPrice - (costPrice * 2))}</span>
          </div>
        </div>
      </div>

      <button onClick={()=>setCustomerMode(true)}
        style={{ width:'100%', padding:'14px', background:C.gold, color:C.navy, border:'none',
          borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
          boxShadow:'0 4px 16px rgba(201,168,76,.4)' }}>
        👁️ Show Price to Customer
      </button>
      
    </div>
  );
}