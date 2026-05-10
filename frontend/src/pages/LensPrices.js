// ============================================================
//  LensPrices.js — Complete Lens Price List Management
//  Shows all prices from Murano & Generic price lists
//  Filter by type, brand, lens_index, color
//  Add new prices, edit existing, deactivate
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f',
  danger:'#c0392b', white:'#ffffff', blue:'#2563eb',
  purple:'#7c3aed',
};

const fmtMoney = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});

const LENS_TYPES  = ['Single Vision','Progressive','Bifocal','Office Lens','Reading (ready)'];
const BRANDS      = ['Murano','Generic'];
const INDEXES     = ['1.49','1.56','1.61','1.67','1.74'];
const COLORS      = ['White','Photo-Gray','Polarize'];
const SERIES_SV   = ['Generic','Singola','Singola Smart'];
const SERIES_PROG = ['Generic PAL','40','Adopt','Easy','Evo','Grande'];
const UV_OPTIONS  = ['N/A','UV 400','UV 420/Blue Filter'];
const COATINGS    = ['Hard Coat','HMC-Green','HMC-Blue','HMC-Green UV400','HMC-Green UV420'];
const POWER_RANGES= ['Below -12.00','Below -17.00','Up to -19.00','Over -19.00','Below -8.00','All powers'];

const INP = {
  padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:8,
  fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none',
  background:C.cream, color:C.navy, width:'100%',
};
const SEL = { ...INP, cursor:'pointer' };
const LBL = { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:4, display:'block' };

// Brand badge colour
const brandColor = (b) => b === 'Murano'
  ? { bg:'#ede9fe', color:C.purple }
  : { bg:'#f0fdf4', color:C.success };

const seriesColor = (s) => {
  const map = {
    'Grande':    { bg:'#fef3c7', color:'#92400e' },
    'Evo':       { bg:'#dbeafe', color:'#1e40af' },
    'Easy':      { bg:'#d1fae5', color:C.success  },
    'Adopt':     { bg:'#fce7f3', color:'#9d174d'  },
    '40':        { bg:'#e0f2fe', color:'#0369a1'  },
    'Singola Smart':{ bg:'#ede9fe', color:C.purple },
    'Singola':   { bg:'#f3e8ff', color:'#7e22ce'  },
    'Generic PAL':{ bg:'#f3f4f6', color:C.muted   },
    'Generic':   { bg:'#f3f4f6', color:C.muted    },
  };
  return map[s] || { bg:'#f3f4f6', color:C.muted };
};

// ── Empty state ──────────────────────────────────────────────
const Empty = ({ msg }) => (
  <div style={{ textAlign:'center', padding:'48px 20px', color:C.muted }}>
    <div style={{ fontSize:36, marginBottom:12 }}>🔬</div>
    <div style={{ fontSize:14, fontWeight:600 }}>{msg}</div>
  </div>
);

export default function LensPrices() {
  const [prices,  setPrices]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);  // price object being edited
  const [saving,  setSaving]  = useState(false);

  // Filters
  const [filterType,  setFilterType]  = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterIndex, setFilterIndex] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [search,      setSearch]      = useState('');
  const [activeTab,   setActiveTab]   = useState('Single Vision');

  // Add/edit form
  const EMPTY_FORM = {
    brand:'Murano', lens_type:'Single Vision', lens_index:'1.56', color:'White',
    coating:'HMC-Green', uv_cut:'UV 400', series:'Singola',
    buy_price:'', sell_price:'', power_range:'Below -12.00',
    fitting_cost:'', code:'', notes:'',
  };
  const [form, setForm] = useState(EMPTY_FORM);

  // ── API calls ─────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Build query string
      const params = new URLSearchParams();
      if (activeTab)    params.set('lens_type', activeTab);
      if (filterBrand)  params.set('brand',     filterBrand);
      if (filterIndex)  params.set('lens_index',     filterIndex);
      if (filterColor)  params.set('color',     filterColor);
      if (search)       params.set('search',    search);

      const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res = await fetch(`${BASE}/lens-prices?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setPrices(data);
    } catch {
      setError('Could not load lens prices');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterBrand, filterIndex, filterColor, search]);

  useEffect(() => { load(); }, [load]);

  const apiCall = async (url, method, body) => {
    const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('ko_token');
    const res = await fetch(`${BASE}${url}`, {
      method, headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
    return res.json();
  };

  const handleSave = async () => {
    if (!form.buy_price || !form.sell_price) return setError('Buy price and sell price are required');
    setSaving(true); setError('');
    try {
      if (editing) {
        await apiCall(`/lens-prices/${editing.id}`, 'PATCH', form);
      } else {
        await apiCall('/lens-prices', 'POST', form);
      }
      setShowAdd(false); setEditing(null); setForm(EMPTY_FORM);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (p) => {
    setEditing(p);
    setForm({
      brand:p.brand, lens_type:p.lens_type, lens_index:p.lens_index, color:p.color,
      coating:p.coating, uv_cut:p.uv_cut||'UV 400', series:p.series||'',
      buy_price:p.buy_price, sell_price:p.sell_price,
      power_range:p.power_range||'', fitting_cost:p.fitting_cost||'',
      code:p.code||'', notes:p.notes||'',
    });
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Hide this price from the list?')) return;
    try { await apiCall(`/lens-prices/${id}`, 'DELETE'); load(); }
    catch (e) { setError(e.message); }
  };

  const cancelForm = () => { setShowAdd(false); setEditing(null); setForm(EMPTY_FORM); setError(''); };

  // ── Group prices by series for display ───────────────────
  const grouped = prices.reduce((acc, p) => {
    const key = `${p.brand} — ${p.series || p.coating}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  // ── Stats ─────────────────────────────────────────────────
  const totalEntries = prices.length;
  const murano  = prices.filter(p=>p.brand==='Murano').length;
  const generic = prices.filter(p=>p.brand==='Generic').length;
  const avgMargin = prices.length
    ? Math.round(prices.reduce((s,p)=>s+((p.sell_price-p.buy_price)/p.sell_price*100),0)/prices.length)
    : 0;

  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:8 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>🔬 Lens Price List</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Murano & Generic lens prices from Negombo Optical</p>
        </div>
        <button onClick={()=>{ setShowAdd(s=>!s); if(showAdd){ cancelForm(); } }}
          style={{ padding:'9px 20px', background:showAdd?C.cream:C.navy, color:showAdd?C.muted:'white', border:showAdd?`1.5px solid ${C.border}`:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          {showAdd ? '✕ Cancel' : '+ Add New Price'}
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, margin:'16px 0' }}>
        {[
          { l:'Total Prices',   v: totalEntries,      dark:true  },
          { l:'Murano',         v: murano,             c:C.purple },
          { l:'Generic',        v: generic,            c:C.success},
          { l:'Avg Margin',     v: avgMargin+'%',      c:C.blue   },
        ].map(s=>(
          <div key={s.l} style={{ background:s.dark?C.navy:'white', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:s.dark?C.gold:C.muted, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:s.dark?'white':(s.c||C.navy) }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* ── Add/Edit Form ── */}
      {showAdd && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:22, marginBottom:20 }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.navy, marginBottom:18 }}>
            {editing ? '✏️ Edit Lens Price' : '➕ Add New Lens Price'}
          </h3>

          {error && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'9px 14px', fontSize:13, marginBottom:14 }}>{error}</div>}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
            <div><label style={LBL}>Brand</label>
              <select value={form.brand} onChange={e=>setForm(f=>({...f,brand:e.target.value}))} style={SEL}>
                {BRANDS.map(b=><option key={b}>{b}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Lens Type</label>
              <select value={form.lens_type} onChange={e=>setForm(f=>({...f,lens_type:e.target.value}))} style={SEL}>
                {LENS_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Index</label>
              <select value={form.lens_index} onChange={e=>setForm(f=>({...f,lens_index:e.target.value}))} style={SEL}>
                {INDEXES.map(i=><option key={i}>{i}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Color</label>
              <select value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} style={SEL}>
                {COLORS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Coating</label>
              <input value={form.coating} onChange={e=>setForm(f=>({...f,coating:e.target.value}))} placeholder="e.g. HMC-Green" style={INP}/>
            </div>
            <div><label style={LBL}>UV Cut / Filter</label>
              <select value={form.uv_cut} onChange={e=>setForm(f=>({...f,uv_cut:e.target.value}))} style={SEL}>
                {UV_OPTIONS.map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Series / Grade</label>
              <input value={form.series} onChange={e=>setForm(f=>({...f,series:e.target.value}))} placeholder="e.g. Singola, Easy, Grande" style={INP}/>
            </div>
            <div><label style={LBL}>Power Range</label>
              <select value={form.power_range} onChange={e=>setForm(f=>({...f,power_range:e.target.value}))} style={SEL}>
                {POWER_RANGES.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Lab Code</label>
              <input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))} placeholder="e.g. SG2, GR3" style={INP}/>
            </div>
            <div><label style={LBL}>Buy Price (Rs.) *</label>
              <input type="number" value={form.buy_price} onChange={e=>setForm(f=>({...f,buy_price:e.target.value}))} placeholder="Wholesale price" style={INP}/>
            </div>
            <div><label style={LBL}>Sell Price (Rs.) *</label>
              <input type="number" value={form.sell_price} onChange={e=>setForm(f=>({...f,sell_price:e.target.value}))} placeholder="Your selling price" style={INP}/>
            </div>
            <div><label style={LBL}>Fitting Charge (Rs.)</label>
              <input type="number" value={form.fitting_cost} onChange={e=>setForm(f=>({...f,fitting_cost:e.target.value}))} placeholder="e.g. 250" style={INP}/>
            </div>
          </div>

          {/* Margin preview */}
          {form.buy_price && form.sell_price && (
            <div style={{ background:C.cream, borderRadius:9, padding:'10px 14px', marginBottom:14, display:'flex', gap:20, flexWrap:'wrap', fontSize:13 }}>
              <span>Profit: <b style={{color:C.success}}>Rs. {(parseFloat(form.sell_price)-parseFloat(form.buy_price)).toLocaleString()}</b></span>
              <span>Margin: <b style={{color:C.navy}}>{Math.round((parseFloat(form.sell_price)-parseFloat(form.buy_price))/parseFloat(form.sell_price)*100)}%</b></span>
            </div>
          )}

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:'10px 24px', background:saving?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              {saving ? 'Saving...' : editing ? '💾 Update Price' : '💾 Save Price'}
            </button>
            <button onClick={cancelForm}
              style={{ padding:'10px 18px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Lens type tabs ── */}
      <div style={{ display:'flex', gap:0, borderBottom:`1px solid ${C.border}`, marginBottom:16, overflowX:'auto', background:'white', borderRadius:'12px 12px 0 0', padding:'0 4px' }}>
        {['Single Vision','Progressive','Bifocal','Office Lens','Reading (ready)','All'].map(t=>(
          <button key={t} onClick={()=>setActiveTab(t==='All'?'':t)}
            style={{ padding:'11px 16px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', color:(activeTab===t||(t==='All'&&!activeTab))?C.navy:C.muted, borderBottom:`2.5px solid ${(activeTab===t||(t==='All'&&!activeTab))?C.gold:'transparent'}`, marginBottom:-1, transition:'all .15s' }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Filters bar ── */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍  Search brand, coating, series, code..."
          style={{ ...INP, flex:1, minWidth:180 }}
        />
        {[
          { label:'All Brands',  val:filterBrand,  set:setFilterBrand, opts:['','Murano','Generic'],  labels:['All Brands','Murano','Generic'] },
          { label:'All Index',   val:filterIndex,  set:setFilterIndex, opts:['','1.49','1.56','1.61','1.67','1.74'], labels:['All Index','1.49','1.56','1.61','1.67','1.74'] },
          { label:'All Colors',  val:filterColor,  set:setFilterColor, opts:['','White','Photo-Gray','Polarize'], labels:['All Colors','White','Photo-Gray','Polarize'] },
        ].map(f=>(
          <select key={f.label} value={f.val} onChange={e=>f.set(e.target.value)}
            style={{ ...SEL, width:'auto', minWidth:110, flex:'none' }}>
            {f.opts.map((o,i)=><option key={o} value={o}>{f.labels[i]}</option>)}
          </select>
        ))}
        {(search||filterBrand||filterIndex||filterColor) && (
          <button onClick={()=>{ setSearch(''); setFilterBrand(''); setFilterIndex(''); setFilterColor(''); }}
            style={{ padding:'9px 14px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Price table ── */}
      {loading ? <div style={{ textAlign:'center', padding:40, color:C.muted }}>Loading prices...</div>
       : !prices.length ? <Empty msg="No lens prices found for this filter" />
       : (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
          {/* Table header */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 100px 120px 120px 110px 110px 80px 90px', gap:0, background:C.cream, padding:'9px 14px', borderBottom:`1px solid ${C.border}` }}>
            {['Lens Details','Index','Color','Coating / UV','Series','Buy Price','Sell Price','Fitting','Actions'].map(h=>(
              <div key={h} style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:C.muted }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {prices.map((p, idx) => {
            const bc  = brandColor(p.brand);
            const sc  = seriesColor(p.series);
            const profit = parseFloat(p.sell_price) - parseFloat(p.buy_price);
            const margin = Math.round(profit / parseFloat(p.sell_price) * 100);
            return (
              <div key={p.id}
                style={{ display:'grid', gridTemplateColumns:'1fr 80px 100px 120px 120px 110px 110px 80px 90px', gap:0, padding:'10px 14px', borderBottom:`1px solid ${C.cream}`, background: idx%2===0?'white':'#fefefe', alignItems:'center' }}>

                {/* Lens details */}
                <div>
                  <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:3, flexWrap:'wrap' }}>
                    <span style={{ background:bc.bg, color:bc.color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{p.brand}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>{p.lens_type}</span>
                  </div>
                  {p.code && <span style={{ fontSize:10, color:C.muted }}>Code: {p.code}</span>}
                  {p.power_range && <span style={{ fontSize:10, color:C.muted, marginLeft:8 }}>{p.power_range}</span>}
                </div>

                {/* Index */}
                <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{p.lens_index}</div>

                {/* Color */}
                <div style={{ fontSize:12, color:C.muted }}>
                  {p.color === 'Photo-Gray' ? '🌤️ Photo-Gray' : p.color === 'Polarize' ? '🕶️ Polarize' : '⬜ White'}
                </div>

                {/* Coating */}
                <div>
                  <div style={{ fontSize:12, color:C.navy }}>{p.coating}</div>
                  {p.uv_cut && <div style={{ fontSize:10, color:C.muted }}>{p.uv_cut}</div>}
                </div>

                {/* Series */}
                <div>
                  {p.series && (
                    <span style={{ background:sc.bg, color:sc.color, fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20 }}>{p.series}</span>
                  )}
                </div>

                {/* Buy price */}
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.muted }}>{fmtMoney(p.buy_price)}</div>
                </div>

                {/* Sell price */}
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{fmtMoney(p.sell_price)}</div>
                  <div style={{ fontSize:10, color:C.success }}>+{margin}% margin</div>
                </div>

                {/* Fitting */}
                <div style={{ fontSize:12, color:C.muted }}>
                  {parseFloat(p.fitting_cost)>0 ? fmtMoney(p.fitting_cost) : '—'}
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:4 }}>
                  <button onClick={()=>handleEdit(p)}
                    style={{ padding:'4px 10px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:6, fontSize:11, cursor:'pointer', fontFamily:'inherit', color:C.navy, fontWeight:600 }}>
                    Edit
                  </button>
                  <button onClick={()=>handleDeactivate(p.id)}
                    style={{ padding:'4px 8px', background:'#fee2e2', border:'none', borderRadius:6, fontSize:11, cursor:'pointer', fontFamily:'inherit', color:C.danger }}>
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          {/* Footer summary */}
          <div style={{ padding:'10px 14px', background:C.cream, borderTop:`1px solid ${C.border}`, display:'flex', gap:20, fontSize:12, color:C.muted }}>
            <span><b style={{color:C.navy}}>{prices.length}</b> prices shown</span>
            <span>Avg buy: <b style={{color:C.navy}}>{fmtMoney(prices.reduce((s,p)=>s+parseFloat(p.buy_price),0)/prices.length)}</b></span>
            <span>Avg sell: <b style={{color:C.navy}}>{fmtMoney(prices.reduce((s,p)=>s+parseFloat(p.sell_price),0)/prices.length)}</b></span>
          </div>
        </div>
      )}

      {/* ── Mobile: card view for small screens ── */}
      <style>{`
        @media(max-width:780px){
          .lens-table-row { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}
