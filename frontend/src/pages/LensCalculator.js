/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b' };
const fmt  = n => 'Rs. ' + Math.round(parseFloat(n)||0).toLocaleString('en-LK');
const fmtR = (a,b) => `Rs.${Math.round(a).toLocaleString()} – ${Math.round(b).toLocaleString()}`;

// ── Editable single prices ─────────────────────────────────────
const DEFAULT_PRICES = {
  uc:          { label:'UC — Clear',               icon:'⬜', price: 4500  },
  bc:          { label:'Blue Cut',                  icon:'🔵', price: 9000  },
  pg:          { label:'Photo Gray',                icon:'🌫️', price: 9000  },
  bc_pg:       { label:'Blue Cut + Photo Gray',     icon:'🌈', price: 13500 },
  prog:        { label:'Progressive',               icon:'📈', price: 19500 },
  prog_bc:     { label:'Progressive + Blue Cut',    icon:'🔷', price: 24000 },
  prog_pg:     { label:'Progressive + Photo Gray',  icon:'🔮', price: 24000 },
  prog_bc_pg:  { label:'Progressive + BC + PG',     icon:'💎', price: 28500 },
};

function apiGet(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json());
}

function RxInput({ label, sph, setSph, cyl, setCyl, onCopyToOther }) {
  const signs = ['+', '-'];
  const [sphSign, setSphSign] = useState('-');
  const [cylSign, setCylSign] = useState('-');

  const applyVal = (sign, val, setter, setSign) => {
    setSign(sign);
    if (val !== '') setter(sign + val.replace(/[^0-9.]/g,''));
  };

  const handleSphChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g,'');
    setSph(raw ? sphSign + raw : '');
  };
  const handleCylChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g,'');
    setCyl(raw ? cylSign + raw : '');
  };

  return (
    <div style={{ background:C.cream, borderRadius:12, padding:'12px 14px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.navy }}>{label}</div>
        {onCopyToOther && (
          <button onClick={onCopyToOther}
            style={{ fontSize:10, fontWeight:700, background:C.navy, color:C.gold, border:'none',
              borderRadius:6, padding:'3px 8px', cursor:'pointer', fontFamily:'inherit' }}>
            Copy to other eye →
          </button>
        )}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div>
          <label style={{ fontSize:10, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>SPH</label>
          <div style={{ display:'flex', gap:4 }}>
            <div style={{ display:'flex', border:`1.5px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
              {signs.map(s=>(
                <button key={s} onClick={()=>{ setSphSign(s); if(sph) setSph(s+sph.replace(/[^0-9.]/g,'')); }}
                  style={{ padding:'8px 10px', border:'none', background:sphSign===s?C.navy:'white',
                    color:sphSign===s?'white':C.muted, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                  {s}
                </button>
              ))}
            </div>
            <input value={sph.replace(/[^0-9.]/g,'')} onChange={handleSphChange}
              placeholder="0.00"
              style={{ flex:1, padding:'8px 10px', border:`1.5px solid ${C.border}`, borderRadius:8,
                fontSize:14, fontFamily:'inherit', outline:'none', background:'white', color:C.navy }}/>
          </div>
        </div>
        <div>
          <label style={{ fontSize:10, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>CYL</label>
          <div style={{ display:'flex', gap:4 }}>
            <div style={{ display:'flex', border:`1.5px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
              {signs.map(s=>(
                <button key={s} onClick={()=>{ setCylSign(s); if(cyl) setCyl(s+cyl.replace(/[^0-9.]/g,'')); }}
                  style={{ padding:'8px 10px', border:'none', background:cylSign===s?C.navy:'white',
                    color:cylSign===s?'white':C.muted, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                  {s}
                </button>
              ))}
            </div>
            <input value={cyl.replace(/[^0-9.]/g,'')} onChange={handleCylChange}
              placeholder="0.00"
              style={{ flex:1, padding:'8px 10px', border:`1.5px solid ${C.border}`, borderRadius:8,
                fontSize:14, fontFamily:'inherit', outline:'none', background:'white', color:C.navy }}/>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LensCalculator() {
  const navigate = useNavigate();

  const [rSph, setRSph] = useState('');
  const [rCyl, setRCyl] = useState('');
  const [lSph, setLSph] = useState('');
  const [lCyl, setLCyl] = useState('');

  const [prices, setPrices] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ko_calc_prices')) || DEFAULT_PRICES; }
    catch { return DEFAULT_PRICES; }
  });
  const [editMode,   setEditMode]   = useState(false);
  const [editPrices, setEditPrices] = useState(prices);

  const [customerMode, setCustomerMode] = useState(false);

  // Customer view state
  const [selectedLens, setSelectedLens] = useState(null); // key from prices
  const [framePrice,   setFramePrice]   = useState('');
  const [discType,     setDiscType]     = useState('pct'); // 'pct' | 'amt'
  const [discVal,      setDiscVal]      = useState('');

  const savePrices = () => {
    setPrices(editPrices);
    localStorage.setItem('ko_calc_prices', JSON.stringify(editPrices));
    setEditMode(false);
  };

  // Index recommendation
  const powers = [rSph, rCyl, lSph, lCyl].map(v => Math.abs(parseFloat(v)||0));
  const maxPow = Math.max(...powers);
  const rec = maxPow === 0 ? null :
    maxPow <= 2 ? '1.56 is fine for this power' :
    maxPow <= 4 ? '1.61 recommended for thinner lens' :
    maxPow <= 6 ? '1.67 recommended — high power' :
    '1.74 recommended — very high power';

  // CYL warning
  const maxCyl = Math.max(Math.abs(parseFloat(rCyl)||0), Math.abs(parseFloat(lCyl)||0));
  const cylWarn = maxCyl >= 1.5 ? `High CYL (${maxCyl.toFixed(2)}) — toric lens, slightly higher cost` : null;

  // Customer calculations
  const lensPrice   = selectedLens ? (parseFloat(prices[selectedLens]?.price)||0) : 0;
  const framePriceN = parseFloat(framePrice)||0;
  const subTotal    = lensPrice + framePriceN;
  const discAmt     = discType === 'pct'
    ? Math.round(subTotal * (parseFloat(discVal)||0) / 100)
    : parseFloat(discVal)||0;
  const totalPrice  = Math.max(0, subTotal - discAmt);

  // ── Edit prices modal ─────────────────────────────────────────
  if (editMode) {
    const INP = { padding:'8px 10px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:14,
      fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy, width:'100%' };
    return (
      <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:500, margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.navy, margin:0 }}>✏️ Edit Lens Prices</h2>
          <button onClick={()=>setEditMode(false)}
            style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:20 }}>✕</button>
        </div>
        <div style={{ background:'#eff6ff', border:'1px solid #bae6fd', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#1e40af' }}>
          These are the exact prices shown to customers. Update whenever your costs change.
        </div>
        {Object.entries(editPrices).map(([key, val]) => (
          <div key={key} style={{ display:'flex', alignItems:'center', gap:12, background:'white',
            border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px', marginBottom:8 }}>
            <span style={{ fontSize:22, flexShrink:0 }}>{val.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.navy, marginBottom:6 }}>{val.label}</div>
              <input type="number" value={val.price}
                onChange={e=>setEditPrices(p=>({...p,[key]:{...p[key],price:parseFloat(e.target.value)||0}}))}
                style={INP}/>
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:C.navy, flexShrink:0 }}>{fmt(val.price)}</div>
          </div>
        ))}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:12 }}>
          <button onClick={()=>{ setEditPrices(DEFAULT_PRICES); }}
            style={{ padding:'11px', background:C.cream, border:`1px solid ${C.border}`, color:C.muted,
              borderRadius:10, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
            Reset to Defaults
          </button>
          <button onClick={savePrices}
            style={{ padding:'11px', background:C.navy, color:C.gold, border:'none',
              borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            ✅ Save Prices
          </button>
        </div>
      </div>
    );
  }

  // ── Customer view ─────────────────────────────────────────────
  if (customerMode) {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f1f3d 0%,#1a3260 100%)',
        fontFamily:"'DM Sans',sans-serif", padding:20,
        display:'flex', flexDirection:'column', alignItems:'center' }}>

        <div style={{ textAlign:'center', marginBottom:20, marginTop:20 }}>
          <div style={{ fontSize:11, color:C.gold, letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 }}>Wickramakalutota Opticals</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:'white', fontWeight:700 }}>Lens Price Guide</div>
          {rec && <div style={{ fontSize:12, color:'#ede9e0', marginTop:6 }}>💡 {rec}</div>}
          {cylWarn && <div style={{ fontSize:11, color:'#fde68a', marginTop:4 }}>⚠️ {cylWarn}</div>}
        </div>

        <div style={{ width:'100%', maxWidth:420 }}>

          {/* Lens options — tap to select */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', fontWeight:700, textTransform:'uppercase',
              letterSpacing:'1px', marginBottom:10, textAlign:'center' }}>
              Tap a lens type to see your price
            </div>
            {Object.entries(prices).map(([key, val]) => {
              const isSelected = selectedLens === key;
              return (
                <button key={key} onClick={()=>setSelectedLens(isSelected ? null : key)}
                  style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'14px 18px', marginBottom:8, borderRadius:14, cursor:'pointer', fontFamily:'inherit',
                    border: `2px solid ${isSelected ? C.gold : 'rgba(255,255,255,.2)'}`,
                    background: isSelected ? C.gold : 'rgba(255,255,255,.08)',
                    color: isSelected ? C.navy : 'white',
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all .15s' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ fontSize:24 }}>{val.icon}</span>
                    <span style={{ fontSize:14, fontWeight:700 }}>{val.label}</span>
                  </div>
                  <span style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700 }}>
                    {fmt(val.price)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Calculator section — shows when lens selected */}
          {selectedLens && (
            <div style={{ background:'white', borderRadius:18, padding:20, marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:14, textAlign:'center' }}>
                {prices[selectedLens]?.icon} {prices[selectedLens]?.label} Selected
              </div>

              {/* Lens price */}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0',
                borderBottom:`1px solid ${C.border}`, fontSize:14 }}>
                <span style={{ color:C.muted }}>Lens (pair)</span>
                <span style={{ fontWeight:700, color:C.navy }}>{fmt(lensPrice)}</span>
              </div>

              {/* Frame price input */}
              <div style={{ padding:'12px 0', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:12, color:C.muted, marginBottom:6, fontWeight:600 }}>Add Frame Price</div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:13, color:C.muted }}>Rs.</span>
                  <input type="number" value={framePrice} onChange={e=>setFramePrice(e.target.value)}
                    placeholder="0"
                    style={{ flex:1, padding:'10px 12px', border:`1.5px solid ${C.border}`, borderRadius:10,
                      fontSize:16, fontFamily:'inherit', outline:'none', color:C.navy, fontWeight:700 }}/>
                  {framePrice && <button onClick={()=>setFramePrice('')}
                    style={{ background:C.cream, border:'none', borderRadius:8, padding:'8px 10px',
                      cursor:'pointer', color:C.muted, fontSize:12, fontFamily:'inherit' }}>✕</button>}
                </div>
              </div>

              {/* Discount */}
              <div style={{ padding:'12px 0', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:12, color:C.muted, marginBottom:8, fontWeight:600 }}>Discount</div>
                <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                  <button onClick={()=>setDiscType('pct')}
                    style={{ flex:1, padding:'8px', borderRadius:8, border:`1.5px solid ${discType==='pct'?C.navy:C.border}`,
                      background:discType==='pct'?C.navy:'white', color:discType==='pct'?'white':C.muted,
                      fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
                    % Percent
                  </button>
                  <button onClick={()=>setDiscType('amt')}
                    style={{ flex:1, padding:'8px', borderRadius:8, border:`1.5px solid ${discType==='amt'?C.navy:C.border}`,
                      background:discType==='amt'?C.navy:'white', color:discType==='amt'?'white':C.muted,
                      fontWeight:700, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
                    Rs. Amount
                  </button>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:13, color:C.muted }}>{discType==='pct'?'%':'Rs.'}</span>
                  <input type="number" value={discVal} onChange={e=>setDiscVal(e.target.value)}
                    placeholder="0"
                    style={{ flex:1, padding:'10px 12px', border:`1.5px solid ${discAmt>0?C.danger:C.border}`,
                      borderRadius:10, fontSize:16, fontFamily:'inherit', outline:'none', color:C.danger, fontWeight:700 }}/>
                  {discVal && <button onClick={()=>setDiscVal('')}
                    style={{ background:C.cream, border:'none', borderRadius:8, padding:'8px 10px',
                      cursor:'pointer', color:C.muted, fontSize:12, fontFamily:'inherit' }}>✕</button>}
                </div>
                {discAmt > 0 && (
                  <div style={{ fontSize:12, color:C.danger, marginTop:4, textAlign:'right', fontWeight:600 }}>
                    = Discount: {fmt(discAmt)}
                  </div>
                )}
              </div>

              {/* Subtotal & total */}
              {(framePriceN > 0 || discAmt > 0) && (
                <div style={{ padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
                  {framePriceN > 0 && (
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                      <span style={{ color:C.muted }}>Frame + Lens</span>
                      <span style={{ color:C.navy, fontWeight:600 }}>{fmt(subTotal)}</span>
                    </div>
                  )}
                  {discAmt > 0 && (
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:C.danger }}>
                      <span>Discount</span>
                      <span>- {fmt(discAmt)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Total */}
              <div style={{ background:C.navy, borderRadius:12, padding:'16px', marginTop:12, textAlign:'center' }}>
                <div style={{ fontSize:11, color:C.gold, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>
                  {framePriceN > 0 ? 'Total Price' : 'Lens Price'}
                </div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontWeight:700, color:'white' }}>
                  {fmt(totalPrice)}
                </div>
                {framePriceN > 0 && (
                  <div style={{ fontSize:11, color:'#ede9e0', marginTop:4 }}>Includes frame + lenses</div>
                )}
              </div>
            </div>
          )}

          <div style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,.5)', marginBottom:20 }}>
            Wickramakalutota Opticals · Chilaw · 032 222 1211
          </div>
        </div>

        <button onClick={()=>setCustomerMode(false)}
          style={{ padding:'11px 28px', background:'rgba(255,255,255,.15)',
            border:'1.5px solid rgba(255,255,255,.3)', color:'white', borderRadius:10,
            fontSize:13, cursor:'pointer', fontFamily:'inherit', marginBottom:20 }}>
          ← Back to Calculator
        </button>
      </div>
    );
  }

  // ── Staff view ────────────────────────────────────────────────
  const INP = { padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:14,
    fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy, width:'100%' };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:560, margin:'0 auto' }}>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <button onClick={()=>navigate('/dashboard')}
            style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:13, fontFamily:'inherit', padding:0, display:'block', marginBottom:4 }}>
            ← Dashboard
          </button>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.navy, margin:0 }}>🧮 Lens Calculator</h1>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>{ setEditPrices(prices); setEditMode(true); }}
            style={{ padding:'8px 14px', background:C.cream, border:`1px solid ${C.border}`, color:C.navy,
              borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            ✏️ Edit Prices
          </button>
          <button onClick={()=>setCustomerMode(true)}
            style={{ padding:'8px 14px', background:C.navy, color:C.gold, border:'none',
              borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            👁️ Show Customer
          </button>
        </div>
      </div>

      {/* Rx */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px', marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:12 }}>Patient Rx</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <RxInput label="Right Eye (OD)" sph={rSph} setSph={setRSph} cyl={rCyl} setCyl={setRCyl}
            onCopyToOther={()=>{ setLSph(rSph); setLCyl(rCyl); }}/>
          <RxInput label="Left Eye (OS)" sph={lSph} setSph={setLSph} cyl={lCyl} setCyl={setLCyl}
            onCopyToOther={()=>{ setRSph(lSph); setRCyl(lCyl); }}/>
        </div>
        {rec && (
          <div style={{ marginTop:10, background:'#eff6ff', border:'1px solid #bae6fd', borderRadius:8,
            padding:'8px 12px', fontSize:12, color:'#1e40af' }}>
            💡 {rec}
          </div>
        )}
        {cylWarn && (
          <div style={{ marginTop:6, background:'#fef9c3', border:'1px solid #fde68a', borderRadius:8,
            padding:'7px 12px', fontSize:12, color:'#92400e' }}>
            ⚠️ {cylWarn}
          </div>
        )}
      </div>

      {/* Price list */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px', marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:12 }}>Current Prices</div>
        {Object.entries(prices).map(([key, val]) => (
          <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'9px 0', borderBottom:`1px solid ${C.cream}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:18 }}>{val.icon}</span>
              <span style={{ fontSize:13, color:C.navy, fontWeight:500 }}>{val.label}</span>
            </div>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:C.navy }}>
              {fmt(val.price)}
            </span>
          </div>
        ))}
      </div>

      <button onClick={()=>setCustomerMode(true)}
        style={{ width:'100%', padding:'14px', background:C.gold, color:C.navy, border:'none',
          borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
        👁️ Show Price to Customer
      </button>
    </div>
  );
}