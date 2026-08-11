// ============================================================
//  LensPriceChecker — standalone quick lens price lookup page
//  Also exported as <LensPriceCheckerPopup> for use inside Orders
// ============================================================
import React, { useState, useEffect, useRef } from 'react';

const BASE = () => process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tok  = () => localStorage.getItem('ko_token');

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f',
  danger:'#c0392b', light:'#f1f5f9',
};

// Suggest index based on power
function suggestIndex(sph, cyl) {
  const s = Math.abs(parseFloat(sph) || 0);
  const c = Math.abs(parseFloat(cyl) || 0);
  const power = Math.max(s, s + c);
  if (power <= 2)   return ['1.56','CR39'];
  if (power <= 4)   return ['1.56','1.61'];
  if (power <= 6)   return ['1.61','1.67'];
  if (power <= 8)   return ['1.67','1.74'];
  return ['1.74'];
}

// ── Shared lookup logic component (used in both popup and page) ──
export function LensPriceCheckerCore({ onSelectPrice, compact = false }) {
  const [sph,        setSph]        = useState('');
  const [cyl,        setCyl]        = useState('');
  const [lensType,   setLensType]   = useState('Single Vision');
  const [prices,     setPrices]     = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [searched,   setSearched]   = useState(false);
  const [suggested,  setSuggested]  = useState([]);
  const sphRef = useRef();

  useEffect(() => { if (!compact) sphRef.current?.focus(); }, [compact]);

  useEffect(() => {
    if (sph || cyl) setSuggested(suggestIndex(sph, cyl));
    else setSuggested([]);
  }, [sph, cyl]);

  const search = async () => {
    setLoading(true); setSearched(true);
    try {
      const res  = await fetch(`${BASE()}/lens-prices?active=true&lens_type=${encodeURIComponent(lensType)}&limit=500`, {
        headers: { Authorization: `Bearer ${tok()}` }
      });
      const data = await res.json();
      setPrices(Array.isArray(data) ? data : []);
    } catch(e) { setPrices([]); }
    finally { setLoading(false); }
  };

  const handleKey = (e) => { if (e.key === 'Enter') search(); };

  // Group by coating, then brand columns
  const brands   = [...new Set(prices.map(p => p.brand))].sort();
  const coatings = [...new Set(prices.map(p => p.coating || p.color || '—'))].sort();

  // Build grid: coating row × brand column
  const grid = {};
  prices.forEach(p => {
    const coating = p.coating || p.color || '—';
    const key     = `${coating}||${p.brand}`;
    if (!grid[key] || parseFloat(p.sell_price) < parseFloat(grid[key].sell_price)) {
      grid[key] = p;
    }
  });

  // Filter by suggested index if power entered
  const filteredPrices = suggested.length > 0
    ? prices.filter(p => suggested.includes(p.lens_index))
    : prices;

  // Regroup filtered
  const fBrands   = [...new Set(filteredPrices.map(p => p.brand))].sort();
  const fCoatings = [...new Set(filteredPrices.map(p => p.coating || p.color || '—'))].sort();
  const fGrid = {};
  filteredPrices.forEach(p => {
    const coating = p.coating || p.color || '—';
    const key     = `${coating}||${p.brand}`;
    if (!fGrid[key] || parseFloat(p.sell_price) < parseFloat(fGrid[key].sell_price)) {
      fGrid[key] = p;
    }
  });

  const displayBrands   = suggested.length > 0 ? fBrands   : brands;
  const displayCoatings = suggested.length > 0 ? fCoatings : coatings;
  const displayGrid     = suggested.length > 0 ? fGrid     : grid;

  const INP = {
    padding: compact ? '8px 10px' : '10px 14px',
    border:`1.5px solid ${C.border}`, borderRadius:9,
    fontSize: compact ? 14 : 16, fontFamily:'inherit',
    outline:'none', background:C.cream, color:C.navy,
    width:'100%', boxSizing:'border-box', fontWeight:700,
  };

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,sans-serif" }}>
      {/* Power input row */}
      <div style={{ background:C.navy, borderRadius:compact?12:16, padding: compact?'14px 16px':'20px 24px', marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.gold, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:10 }}>
          💊 Enter Customer Power
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:8, alignItems:'end' }}>
          <div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', fontWeight:700, marginBottom:4, textTransform:'uppercase' }}>SPH</div>
            <input ref={sphRef} value={sph} onChange={e=>setSph(e.target.value)} onKeyDown={handleKey}
              placeholder="e.g. -4.50" style={{ ...INP, background:'rgba(255,255,255,.12)', color:'white', border:'1.5px solid rgba(255,255,255,.2)' }}/>
          </div>
          <div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', fontWeight:700, marginBottom:4, textTransform:'uppercase' }}>CYL</div>
            <input value={cyl} onChange={e=>setCyl(e.target.value)} onKeyDown={handleKey}
              placeholder="e.g. -1.75" style={{ ...INP, background:'rgba(255,255,255,.12)', color:'white', border:'1.5px solid rgba(255,255,255,.2)' }}/>
          </div>
          <div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', fontWeight:700, marginBottom:4, textTransform:'uppercase' }}>Type</div>
            <select value={lensType} onChange={e=>setLensType(e.target.value)} onKeyDown={handleKey}
              style={{ ...INP, background:'rgba(255,255,255,.12)', color:'white', border:'1.5px solid rgba(255,255,255,.2)', cursor:'pointer' }}>
              {['Single Vision','Progressive','Bifocal','Office Lens','Reading (ready)'].map(t=>(
                <option key={t} value={t} style={{ background:C.navy }}>{t}</option>
              ))}
            </select>
          </div>
          <button onClick={search} disabled={loading}
            style={{ padding: compact?'8px 18px':'10px 24px', background:C.gold, color:C.navy,
              border:'none', borderRadius:9, fontSize:14, fontWeight:800,
              cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
            {loading ? '⏳' : '🔍 Check'}
          </button>
        </div>

        {/* Power suggestion */}
        {suggested.length > 0 && (
          <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:'rgba(255,255,255,.5)' }}>Suggested index for this power:</span>
            {suggested.map(i => (
              <span key={i} style={{ background:C.gold, color:C.navy, padding:'3px 10px',
                borderRadius:20, fontSize:12, fontWeight:800 }}>{i}</span>
            ))}
            {suggested.length > 0 && searched && (
              <span style={{ fontSize:11, color:'rgba(255,255,255,.5)' }}>
                — showing {filteredPrices.length} matching prices
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results table */}
      {searched && !loading && (
        displayCoatings.length === 0
          ? <div style={{ textAlign:'center', padding:'32px', color:C.muted, fontSize:14 }}>
              No prices found. Add prices in the Lens Prices page.
            </div>
          : <div style={{ overflowX:'auto', borderRadius:12, border:`1.5px solid ${C.border}` }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize: compact?12:13, minWidth:400 }}>
                <thead>
                  <tr style={{ background:C.navy }}>
                    <th style={{ padding:'10px 14px', textAlign:'left', color:C.gold, fontWeight:700, fontSize:11,
                      textTransform:'uppercase', letterSpacing:'1px', position:'sticky', left:0, background:C.navy }}>
                      Coating
                    </th>
                    {displayBrands.map(b => (
                      <th key={b} style={{ padding:'10px 14px', textAlign:'center', color:'white', fontWeight:700,
                        fontSize:11, textTransform:'uppercase', letterSpacing:'1px', whiteSpace:'nowrap' }}>
                        {b}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayCoatings.map((coating, ri) => (
                    <tr key={coating} style={{ background: ri%2===0 ? 'white' : C.cream }}>
                      <td style={{ padding:'10px 14px', fontWeight:700, color:C.navy,
                        position:'sticky', left:0, background: ri%2===0?'white':C.cream,
                        borderRight:`1.5px solid ${C.border}`, whiteSpace:'nowrap' }}>
                        {coating}
                      </td>
                      {displayBrands.map(brand => {
                        const cell = displayGrid[`${coating}||${brand}`];
                        return (
                          <td key={brand} style={{ padding:'8px 14px', textAlign:'center' }}>
                            {cell ? (
                              <button
                                onClick={() => onSelectPrice && onSelectPrice(cell)}
                                style={{ background:'none', border:`1.5px solid ${onSelectPrice?C.border:'transparent'}`,
                                  borderRadius:7, padding:'4px 10px', cursor:onSelectPrice?'pointer':'default',
                                  fontFamily:'inherit', width:'100%',
                                  transition:'all .15s' }}
                                onMouseEnter={e => { if(onSelectPrice) { e.currentTarget.style.background=C.navy; e.currentTarget.style.color='white'; e.currentTarget.style.borderColor=C.navy; }}}
                                onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='inherit'; e.currentTarget.style.borderColor=onSelectPrice?C.border:'transparent'; }}
                              >
                                <div style={{ fontWeight:800, color:C.success, fontSize: compact?13:14 }}>
                                  Rs. {parseFloat(cell.sell_price||0).toLocaleString('en-LK')}
                                </div>
                                {cell.lens_index && (
                                  <div style={{ fontSize:10, color:C.muted, marginTop:1 }}>
                                    {cell.lens_index}
                                    {cell.buy_price > 0 && ` · cost ${parseFloat(cell.buy_price).toLocaleString()}`}
                                  </div>
                                )}
                              </button>
                            ) : (
                              <span style={{ color:C.border, fontSize:16 }}>—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}

      {loading && (
        <div style={{ textAlign:'center', padding:'40px', color:C.muted }}>
          ⏳ Loading prices...
        </div>
      )}

      {!searched && (
        <div style={{ textAlign:'center', padding: compact?'20px':'40px', color:C.muted, fontSize:13 }}>
          Enter the customer's power above and tap <strong>Check</strong> to see all lens prices instantly
        </div>
      )}
    </div>
  );
}

// ── Popup version (used inside Orders page) ──────────────────
export function LensPriceCheckerPopup({ onClose, onSelectPrice }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.7)', zIndex:500,
      display:'flex', alignItems:'center', justifyContent:'center', padding:12 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:680,
        maxHeight:'92vh', overflowY:'auto', boxShadow:'0 24px 80px rgba(0,0,0,.4)' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'18px 24px', borderBottom:`1.5px solid ${C.cream}`, position:'sticky', top:0,
          background:'white', zIndex:10, borderRadius:'20px 20px 0 0' }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.navy, fontWeight:700 }}>
              💰 Quick Lens Price Check
            </div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
              {onSelectPrice ? 'Tap a price to auto-fill the order' : 'For reference only'}
            </div>
          </div>
          <button onClick={onClose}
            style={{ background:C.cream, border:'none', borderRadius:9, padding:'7px 16px',
              fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
            ✕ Close
          </button>
        </div>

        <div style={{ padding:'20px 24px' }}>
          <LensPriceCheckerCore compact onSelectPrice={onSelectPrice} />
        </div>
      </div>
    </div>
  );
}

// ── Standalone page ──────────────────────────────────────────
export default function LensPriceCheckerPage() {
  return (
    <div style={{ maxWidth:800, margin:'0 auto', padding:'24px 16px', fontFamily:"system-ui,sans-serif" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:4 }}>
          Quick Reference
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:C.navy, fontWeight:700 }}>
          💰 Lens Price Checker
        </div>
        <div style={{ fontSize:14, color:C.muted, marginTop:4 }}>
          Enter the customer's power to instantly see all matching prices
        </div>
      </div>
      <LensPriceCheckerCore />
    </div>
  );
}