/* eslint-disable */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b' };
const fmt = (n) => 'Rs. ' + Math.round(parseFloat(n)||0).toLocaleString('en-LK');
const fmtR = (min, max) => `Rs. ${Math.round(min).toLocaleString()} – ${Math.round(max).toLocaleString()}`;

// ── Editable price ranges (staff can update these) ────────────
const DEFAULT_RANGES = {
  uc_base:    { min: 4000,  max: 5000,  label: 'UC (Clear)',         icon: '⬜' },
  bc_add:     { min: 4500,  max: 6000,  label: 'Blue Cut add-on',    icon: '🔵' },
  pg_add:     { min: 4500,  max: 6000,  label: 'Photo Gray add-on',  icon: '🌫️' },
  bc_pg_add:  { min: 9000,  max: 12000, label: 'Blue Cut + PG add-on',icon: '🌈' },
  prog_add:   { min: 15000, max: 20000, label: 'Progressive add-on', icon: '📈' },
};

const LENS_OPTIONS = [
  { key:'uc',       label:'UC — Clear',               icon:'⬜', adds:[] },
  { key:'bc',       label:'Blue Cut',                  icon:'🔵', adds:['bc_add'] },
  { key:'pg',       label:'Photo Gray',                icon:'🌫️', adds:['pg_add'] },
  { key:'bc_pg',    label:'Blue Cut + Photo Gray',     icon:'🌈', adds:['bc_add','pg_add'] },
  { key:'prog',     label:'Progressive',               icon:'📈', adds:['prog_add'] },
  { key:'prog_bc',  label:'Progressive + Blue Cut',   icon:'🔷', adds:['prog_add','bc_add'] },
  { key:'prog_pg',  label:'Progressive + Photo Gray', icon:'🔮', adds:['prog_add','pg_add'] },
  { key:'prog_bc_pg',label:'Progressive + BC + PG',   icon:'💎', adds:['prog_add','bc_add','pg_add'] },
];

const INDEXES = ['1.56','1.59','1.61','1.67','1.74'];

function apiGet(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json());
}

export default function LensCalculator() {
  const navigate = useNavigate();

  // Rx
  const [rSph, setRSph] = useState('');
  const [rCyl, setRCyl] = useState('');
  const [lSph, setLSph] = useState('');
  const [lCyl, setLCyl] = useState('');

  // Lens config
  const [lensOption, setLensOption] = useState('uc');
  const [index,      setIndex]      = useState('1.56');

  // Pricing
  const [ranges,      setRanges]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('ko_calc_ranges')) || DEFAULT_RANGES; }
    catch { return DEFAULT_RANGES; }
  });
  const [customPrice, setCustomPrice] = useState('');
  const [framePrice,  setFramePrice]  = useState('');
  const [discount,    setDiscount]    = useState('');
  const [multiplier,  setMultiplier]  = useState(3);
  const [dbCost,      setDbCost]      = useState(0);
  const [supplier,    setSupplier]    = useState('');

  // UI
  const [customerMode,  setCustomerMode]  = useState(false);
  const [showRangeEdit, setShowRangeEdit] = useState(false);
  const [editRanges,    setEditRanges]    = useState(ranges);

  const saveRanges = () => {
    setRanges(editRanges);
    localStorage.setItem('ko_calc_ranges', JSON.stringify(editRanges));
    setShowRangeEdit(false);
  };

  // Load DB cost price
  useEffect(() => {
    const opt = LENS_OPTIONS.find(o=>o.key===lensOption);
    const lensType = lensOption.startsWith('prog') ? 'Progressive' : 'Single Vision';
    const coating  = lensOption==='uc' ? 'UC' : lensOption==='bc' ? 'Blue Cut HMC' : lensOption==='pg' ? 'HMC' : 'Blue Cut HMC';
    apiGet(`/lens-prices/match?lens_type=${encodeURIComponent(lensType)}&lens_index=${index}&coating=${encodeURIComponent(coating)}`)
      .then(d => {
        if (d?.length > 0) {
          setDbCost(parseFloat(d[0].buy_price)||0);
          setSupplier(d[0].brand||d[0].supplier||'');
        } else {
          setDbCost(0); setSupplier('');
        }
      }).catch(()=>{});
  }, [lensOption, index]);

  // Index recommendation
  const getRecommendation = () => {
    const powers = [rSph, rCyl, lSph, lCyl].map(v => Math.abs(parseFloat(v)||0));
    const max = Math.max(...powers);
    if (max === 0) return null;
    if (max <= 2)  return { index:'1.56', note:'Low power — 1.56 is fine' };
    if (max <= 4)  return { index:'1.61', note:'Moderate — 1.61 recommended' };
    if (max <= 6)  return { index:'1.67', note:'High power — 1.67 for thinner lens' };
    return           { index:'1.74', note:'Very high — 1.74 for thinnest lens' };
  };
  const rec = getRecommendation();

  // Calculate price range
  const opt = LENS_OPTIONS.find(o=>o.key===lensOption);
  const baseMin = ranges.uc_base.min;
  const baseMax = ranges.uc_base.max;
  let addMin = 0, addMax = 0;
  (opt?.adds||[]).forEach(k => { addMin += ranges[k]?.min||0; addMax += ranges[k]?.max||0; });

  // CYL adjustment — if high CYL, slightly higher price
  const cylBoost = () => {
    const cyls = [rCyl, lCyl].map(v => Math.abs(parseFloat(v)||0));
    const maxCyl = Math.max(...cyls);
    if (maxCyl >= 3)   return { min: 1000, max: 2000, note: `High CYL (${maxCyl.toFixed(2)}) — toric lens adds cost` };
    if (maxCyl >= 1.5) return { min: 500,  max: 1000, note: `Moderate CYL (${maxCyl.toFixed(2)})` };
    return null;
  };
  const cyl = cylBoost();

  const totalMin = baseMin + addMin + (cyl?.min||0);
  const totalMax = baseMax + addMax + (cyl?.max||0);

  // Custom override
  const hasCustom   = customPrice !== '';
  const customNum   = parseFloat(customPrice) || 0;
  const frameNum    = parseFloat(framePrice)  || 0;
  const discountNum = parseFloat(discount)    || 0;

  // DB-based calculation
  const dbSellPrice = Math.round(dbCost * multiplier);

  // Final lens price: custom > DB > midpoint of range
  const lensMid     = Math.round((totalMin + totalMax) / 2);
  const lensDisplay = hasCustom ? customNum : dbSellPrice > 0 ? dbSellPrice : lensMid;

  const totalFinal  = Math.max(0, lensDisplay + frameNum - discountNum);

  const INP = { padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:14,
    fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%' };
  const SEL = { ...INP, cursor:'pointer' };

  // ── Range editor modal ────────────────────────────────────────
  if (showRangeEdit) {
    return (
      <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:500, margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.navy, margin:0 }}>✏️ Edit Price Ranges</h2>
          <button onClick={()=>setShowRangeEdit(false)}
            style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:18 }}>✕</button>
        </div>
        <div style={{ background:'#eff6ff', border:'1px solid #bae6fd', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#1e40af' }}>
          These are the base price ranges you quote to customers. Update them whenever your costs change.
        </div>
        {Object.entries(editRanges).map(([key, val]) => (
          <div key={key} style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 16px', marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10 }}>{val.label}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Min (Rs.)</label>
                <input type="number" value={val.min}
                  onChange={e=>setEditRanges(r=>({...r,[key]:{...r[key],min:parseFloat(e.target.value)||0}}))}
                  style={INP}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Max (Rs.)</label>
                <input type="number" value={val.max}
                  onChange={e=>setEditRanges(r=>({...r,[key]:{...r[key],max:parseFloat(e.target.value)||0}}))}
                  style={INP}/>
              </div>
            </div>
          </div>
        ))}
        <button onClick={saveRanges}
          style={{ width:'100%', padding:'13px', background:C.navy, color:C.gold, border:'none',
            borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginTop:8 }}>
          ✅ Save Price Ranges
        </button>
        <button onClick={()=>{ setEditRanges(DEFAULT_RANGES); }}
          style={{ width:'100%', padding:'10px', background:'none', border:`1px solid ${C.border}`, color:C.muted,
            borderRadius:10, fontSize:12, cursor:'pointer', fontFamily:'inherit', marginTop:8 }}>
          Reset to Defaults
        </button>
      </div>
    );
  }

  // ── Customer view ─────────────────────────────────────────────
  if (customerMode) {
    const selectedOpt = LENS_OPTIONS.find(o=>o.key===lensOption);
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f1f3d 0%,#1a3260 100%)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:20, fontFamily:"'DM Sans',sans-serif" }}>

        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:12, color:C.gold, letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 }}>Wickramakalutota Opticals</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:'white', fontWeight:700 }}>Lens Price Guide</div>
        </div>

        <div style={{ background:'white', borderRadius:20, padding:24, width:'100%', maxWidth:420,
          boxShadow:'0 24px 80px rgba(0,0,0,.4)' }}>

          {/* Recommended option highlighted */}
          <div style={{ background:C.navy, borderRadius:14, padding:'16px 18px', marginBottom:18, textAlign:'center' }}>
            <div style={{ fontSize:11, color:C.gold, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>
              Recommended for You
            </div>
            <div style={{ fontSize:18, fontWeight:700, color:'white', marginBottom:4 }}>
              {selectedOpt?.icon} {selectedOpt?.label}
            </div>
            <div style={{ fontSize:11, color:'#ede9e0', marginBottom:12 }}>
              {index} Index · {rec ? rec.note : 'Standard lens'}
            </div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:700, color:C.gold }}>
              {hasCustom ? fmt(customNum) : fmtR(totalMin, totalMax)}
            </div>
            <div style={{ fontSize:11, color:'#ede9e0', marginTop:4 }}>per pair of lenses</div>
          </div>

          {/* All options list */}
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:10 }}>
              All Lens Options
            </div>
            {LENS_OPTIONS.map(o => {
              let oAddMin = 0, oAddMax = 0;
              o.adds.forEach(k => { oAddMin += ranges[k]?.min||0; oAddMax += ranges[k]?.max||0; });
              const oMin = baseMin + oAddMin;
              const oMax = baseMax + oAddMax;
              const isSelected = o.key === lensOption;
              return (
                <div key={o.key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'10px 12px', borderRadius:10, marginBottom:6,
                  background: isSelected ? '#eff6ff' : C.cream,
                  border: `1.5px solid ${isSelected ? '#3b82f6' : C.border}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:18 }}>{o.icon}</span>
                    <span style={{ fontSize:13, fontWeight: isSelected ? 700 : 500, color:C.navy }}>{o.label}</span>
                    {isSelected && <span style={{ background:'#3b82f6', color:'white', fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:10 }}>YOUR CHOICE</span>}
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:C.navy }}>
                    {fmtR(oMin, oMax)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Frame */}
          {frameNum > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px',
              background:C.cream, borderRadius:10, marginBottom:10, fontSize:14 }}>
              <span style={{ color:C.muted }}>Frame</span>
              <span style={{ fontWeight:700, color:C.navy }}>{fmt(frameNum)}</span>
            </div>
          )}

          {/* Discount */}
          {discountNum > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 14px', fontSize:13, color:C.danger }}>
              <span>Discount</span><span>- {fmt(discountNum)}</span>
            </div>
          )}

          {/* Total */}
          {frameNum > 0 && (
            <div style={{ background:C.navy, borderRadius:12, padding:'14px 18px', textAlign:'center', marginTop:8 }}>
              <div style={{ fontSize:11, color:C.gold, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>Total (Lens + Frame)</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:30, fontWeight:700, color:'white' }}>
                {fmt(totalFinal)}
              </div>
            </div>
          )}

          {cyl && (
            <div style={{ marginTop:12, padding:'8px 12px', background:'#fef9c3', borderRadius:8, fontSize:11, color:'#92400e' }}>
              ⚠️ {cyl.note} — price may be slightly higher
            </div>
          )}

          <div style={{ textAlign:'center', marginTop:16, fontSize:11, color:C.muted }}>
            Wickramakalutota Opticals · Chilaw · 032 222 1211
          </div>
        </div>

        <button onClick={()=>setCustomerMode(false)}
          style={{ marginTop:20, padding:'11px 28px', background:'rgba(255,255,255,.15)',
            border:'1.5px solid rgba(255,255,255,.3)', color:'white', borderRadius:10,
            fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
          ← Back to Calculator
        </button>
      </div>
    );
  }

  // ── Staff calculator ──────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:600, margin:'0 auto' }}>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <button onClick={()=>navigate('/dashboard')}
            style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:13, fontFamily:'inherit', padding:0, display:'block', marginBottom:4 }}>
            ← Dashboard
          </button>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.navy, margin:0 }}>🧮 Lens Calculator</h1>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>{ setEditRanges(ranges); setShowRangeEdit(true); }}
            style={{ padding:'8px 14px', background:C.cream, border:`1px solid ${C.border}`, color:C.navy, borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            ✏️ Edit Prices
          </button>
          <button onClick={()=>setCustomerMode(true)}
            style={{ padding:'8px 14px', background:C.navy, color:C.gold, border:'none', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            👁️ Show Customer
          </button>
        </div>
      </div>

      {/* Rx */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px', marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:12 }}>Patient Rx</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
          {[
            { label:'Right SPH', val:rSph, set:setRSph },
            { label:'Right CYL', val:rCyl, set:setRCyl },
            { label:'Left SPH',  val:lSph, set:setLSph },
            { label:'Left CYL',  val:lCyl, set:setLCyl },
          ].map(f=>(
            <div key={f.label}>
              <label style={{ fontSize:10, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>{f.label}</label>
              <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder="0.00" style={INP}/>
            </div>
          ))}
        </div>
        {rec && (
          <div style={{ marginTop:10, background:'#eff6ff', border:'1px solid #bae6fd', borderRadius:8,
            padding:'8px 12px', fontSize:12, color:'#1e40af', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>💡 {rec.note}</span>
            <button onClick={()=>setIndex(rec.index)}
              style={{ background:'#1e40af', color:'white', border:'none', borderRadius:6,
                padding:'4px 10px', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Use {rec.index}
            </button>
          </div>
        )}
        {cyl && (
          <div style={{ marginTop:8, background:'#fef9c3', border:'1px solid #fde68a', borderRadius:8,
            padding:'7px 12px', fontSize:12, color:'#92400e' }}>
            ⚠️ {cyl.note} — add Rs. {cyl.min.toLocaleString()}–{cyl.max.toLocaleString()} to base price
          </div>
        )}
      </div>

      {/* Lens type & index */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px', marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:12 }}>Lens Type</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
          {LENS_OPTIONS.map(o=>(
            <button key={o.key} onClick={()=>setLensOption(o.key)}
              style={{ padding:'10px 12px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer',
                fontFamily:'inherit', textAlign:'left',
                border:`1.5px solid ${lensOption===o.key?C.navy:C.border}`,
                background:lensOption===o.key?C.navy:'white',
                color:lensOption===o.key?'white':C.muted }}>
              {o.icon} {o.label}
            </button>
          ))}
        </div>
        <div>
          <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:6 }}>Lens Index</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {INDEXES.map(i=>(
              <button key={i} onClick={()=>setIndex(i)}
                style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
                  fontFamily:'inherit', border:`1.5px solid ${index===i?C.navy:C.border}`,
                  background:index===i?C.navy:'white', color:index===i?'white':C.muted }}>
                {i}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px', marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:12 }}>Pricing</div>

        {/* Price range */}
        <div style={{ background:C.cream, borderRadius:10, padding:'12px 14px', marginBottom:12 }}>
          <div style={{ fontSize:11, color:C.muted, fontWeight:600, marginBottom:4 }}>Price Range (based on your settings)</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.navy }}>
            {fmtR(totalMin, totalMax)}
          </div>
          <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
            Base {fmtR(baseMin,baseMax)}
            {opt?.adds?.map(k=>(
              <span key={k}> + {ranges[k]?.label} {fmtR(ranges[k]?.min,ranges[k]?.max)}</span>
            ))}
            {cyl && <span style={{ color:'#92400e' }}> + CYL {fmtR(cyl.min,cyl.max)}</span>}
          </div>
        </div>

        {/* DB cost info */}
        {dbCost > 0 && (
          <div style={{ background:'#dbeafe', border:'1px solid #93c5fd', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:12 }}>
            DB cost: <b>{fmt(dbCost)}</b> ({supplier}) × {multiplier} = <b>{fmt(dbSellPrice)}</b>
            <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
              {[2,2.5,3,3.5,4].map(m=>(
                <button key={m} onClick={()=>setMultiplier(m)}
                  style={{ padding:'3px 10px', borderRadius:14, fontSize:11, fontWeight:600, cursor:'pointer',
                    fontFamily:'inherit', border:`1px solid ${multiplier===m?C.navy:C.border}`,
                    background:multiplier===m?C.navy:'white', color:multiplier===m?'white':C.muted }}>
                  {m}×
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom price override */}
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>
            Custom Lens Price (overrides range) — optional
          </label>
          <input type="number" value={customPrice} onChange={e=>setCustomPrice(e.target.value)}
            placeholder={`e.g. ${lensMid.toLocaleString()}`} style={INP}/>
          {hasCustom && (
            <button onClick={()=>setCustomPrice('')}
              style={{ marginTop:4, background:'none', border:'none', color:C.danger, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>
              ✕ Clear custom price
            </button>
          )}
        </div>

        {/* Frame */}
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Frame Price (Rs.) — optional</label>
          <input type="number" value={framePrice} onChange={e=>setFramePrice(e.target.value)} placeholder="0" style={INP}/>
        </div>

        {/* Discount */}
        <div>
          <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:'block', marginBottom:4 }}>Discount (Rs.) — optional</label>
          <input type="number" value={discount} onChange={e=>setDiscount(e.target.value)} placeholder="0" style={INP}/>
        </div>
      </div>

      {/* Summary */}
      <div style={{ background:C.navy, borderRadius:14, padding:'18px 20px', marginBottom:16 }}>
        <div style={{ fontSize:11, color:C.gold, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>Summary</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#ede9e0' }}>
            <span>Lens ({LENS_OPTIONS.find(o=>o.key===lensOption)?.label})</span>
            <span>{hasCustom ? fmt(customNum) : fmtR(totalMin,totalMax)}</span>
          </div>
          {frameNum > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#ede9e0' }}>
              <span>Frame</span><span>{fmt(frameNum)}</span>
            </div>
          )}
          {discountNum > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#fca5a5' }}>
              <span>Discount</span><span>- {fmt(discountNum)}</span>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:16, fontWeight:900,
            color:'white', borderTop:'1px solid rgba(255,255,255,.2)', paddingTop:10, marginTop:4 }}>
            <span>Quote to Customer</span>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.gold }}>
              {hasCustom || frameNum > 0 ? fmt(totalFinal) : fmtR(totalMin+frameNum, totalMax+frameNum)}
            </span>
          </div>
          {dbCost > 0 && hasCustom && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#86efac' }}>
              <span>Your profit (lens only, est.)</span>
              <span style={{ fontWeight:700 }}>{fmt(customNum - dbCost*2)}</span>
            </div>
          )}
        </div>
      </div>

      <button onClick={()=>setCustomerMode(true)}
        style={{ width:'100%', padding:'14px', background:C.gold, color:C.navy, border:'none',
          borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
        👁️ Show Price to Customer
      </button>
    </div>
  );
}