/* eslint-disable */
import React, { useState, useEffect, useCallback } from 'react';

const BASE  = () => process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tok   = () => localStorage.getItem('ko_token');
const hdr   = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` });
const api   = (path, method='GET', body=null) =>
  fetch(`${BASE()}${path}`, { method, headers:hdr(), body:body?JSON.stringify(body):null }).then(r=>r.json());

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#15803d', danger:'#dc2626',
};
const INP = { padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13,
  fontFamily:'inherit', outline:'none', background:'white', color:C.navy, width:'100%' };
const SEL = { ...INP, cursor:'pointer' };

const LENS_TYPES = ['Single Vision','Bifocal','Progressive','Lenticular','Office/Computer'];
const COATINGS   = ['','Blue Cut','Photochromic','Blue Cut + Photochromic','HMC','Blue Cut + HMC','Photochromic + HMC','Blue Cut + Photochromic + HMC'];
const INDEXES    = ['CR39','1.56','1.60','1.67','1.74','Glass','Polycarbonate'];
const SPH_VALUES = ['','Plano','+0.25','+0.50','+0.75','+1.00','+1.25','+1.50','+1.75','+2.00','+2.25','+2.50','+2.75','+3.00','+3.25','+3.50','+3.75','+4.00','+4.25','+4.50','+4.75','+5.00','+5.50','+6.00','+6.50','+7.00','+8.00','-0.25','-0.50','-0.75','-1.00','-1.25','-1.50','-1.75','-2.00','-2.25','-2.50','-2.75','-3.00','-3.25','-3.50','-3.75','-4.00','-4.25','-4.50','-4.75','-5.00','-5.50','-6.00','-6.50','-7.00','-8.00','-9.00','-10.00'];
const CYL_VALUES = ['','0.00','-0.25','-0.50','-0.75','-1.00','-1.25','-1.50','-1.75','-2.00','-2.25','-2.50','-2.75','-3.00','-3.50','-4.00'];

const EMPTY_FORM = { lens_type:'Single Vision', lens_coating:'', lens_index:'CR39', sph_r:'', cyl_r:'', sph_l:'', cyl_l:'', is_single_side:false, quantity:1, buy_price:'', sell_price:'', supplier:'', notes:'' };

// ── Use Lens Modal v2 — handles single sides ──────────────────
function UseLensModal({ item, onClose, onDone }) {
  const [useMode,  setUseMode]  = useState('pair');   // 'pair' | 'side_r' | 'side_l'
  const [qty,      setQty]      = useState(1);
  const [branch,   setBranch]   = useState('kuruwita');
  const [reason,   setReason]   = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const available     = parseInt(item.quantity || 0);
  const isSingleSide  = item.is_single_side;

  // How much stock this action uses
  // pairs use 1 per qty, single sides use 0.5 per side (stored as 1 unit = 1 side in DB)
  const unitsToDeduct = useMode === 'pair' ? qty : qty;
  const remaining     = available - unitsToDeduct;

  const modeLabel = () => {
    if (isSingleSide) return `${available} side${available!==1?'s':''} available`;
    if (useMode === 'pair')   return `${available} pair${available!==1?'s':''} available`;
    if (useMode === 'side_r') return `Using Right side only — from ${available} pair${available!==1?'s':''}`;
    if (useMode === 'side_l') return `Using Left side only — from ${available} pair${available!==1?'s':''}`;
    return '';
  };

  const handleUse = async () => {
    if (qty < 1)        return setError('Quantity must be at least 1');
    if (remaining < 0)  return setError(`Only ${available} ${isSingleSide?'sides':'pairs'} available`);
    setSaving(true);
    try {
      const branchName = branch === 'kalutota' ? 'Kalutota Optical' : 'Kuruwita Optical';
      const usedLabel  = isSingleSide
        ? `${qty} side${qty>1?'s':''}`
        : useMode === 'pair'
          ? `${qty} pair${qty>1?'s':''}`
          : `${qty} ${useMode === 'side_r' ? 'Right' : 'Left'} side${qty>1?'s':''}`;

      await api(`/lens-stock/${item.id}`, 'PATCH', {
        quantity: remaining,
        notes: `${item.notes ? item.notes + ' | ' : ''}Used ${usedLabel} for ${branchName}${reason ? ': ' + reason : ''}`,
      });
      onDone(remaining, usedLabel);
    } catch(e) { setError('Failed to update'); }
    finally { setSaving(false); }
  };

  const powerLabel = isSingleSide
    ? `${item.sph_r || item.sph_l || ''}${(item.cyl_r || item.cyl_l) ? ' / ' + (item.cyl_r || item.cyl_l) : ''}`
    : `R: ${item.sph_r || '—'}${item.cyl_r ? ' / ' + item.cyl_r : ''}  ·  L: ${item.sph_l || '—'}${item.cyl_l ? ' / ' + item.cyl_l : ''}`;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.6)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:18, padding:28, width:'100%', maxWidth:460, boxShadow:'0 24px 60px rgba(0,0,0,.3)' }}>

        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.navy, marginBottom:4 }}>Use Lens from Stock</div>
        <div style={{ fontSize:12, color:C.muted, marginBottom:20 }}>Record lens usage and reduce stock</div>

        {/* Lens summary */}
        <div style={{ background:C.cream, borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:4 }}>
            {item.lens_type}{item.lens_coating ? ' · ' + item.lens_coating : ''} · {item.lens_index}
          </div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>💊 {powerLabel}</div>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <span style={{ fontSize:12, color:C.muted }}>
              In stock: <b style={{ color:available<=2?C.danger:C.success, fontSize:14 }}>
                {available} {isSingleSide ? 'side' : 'pair'}{available!==1?'s':''}
              </b>
            </span>
            {available <= 2 && available > 0 && (
              <span style={{ background:'#fef9c3', color:'#92400e', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>⚠️ Low stock</span>
            )}
            {available === 0 && (
              <span style={{ background:'#fee2e2', color:C.danger, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>Out of stock</span>
            )}
          </div>
        </div>

        {error && <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:C.danger, borderRadius:8, padding:'8px 12px', fontSize:12, marginBottom:14 }}>{error}</div>}

        {/* Use Mode — only show for pairs */}
        {!isSingleSide && (
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:8 }}>Using</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[
                ['pair',   '👓 Full Pair',     'Both R + L'],
                ['side_r', '→ Right Side Only', 'R side only'],
                ['side_l', '← Left Side Only',  'L side only'],
              ].map(([v,l,sub])=>(
                <button key={v} onClick={()=>{ setUseMode(v); setQty(1); }}
                  style={{ padding:'10px 8px', border:`2px solid ${useMode===v?C.navy:C.border}`,
                    borderRadius:10, background:useMode===v?'#f0f4ff':'white',
                    cursor:'pointer', fontFamily:'inherit', textAlign:'center' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:useMode===v?C.navy:C.muted }}>{l}</div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{sub}</div>
                </button>
              ))}
            </div>
            {/* Info about side usage */}
            {useMode !== 'pair' && (
              <div style={{ background:'#eff6ff', border:'1px solid #93c5fd', borderRadius:8, padding:'8px 12px', fontSize:11, color:'#1e40af', marginTop:8, fontWeight:600 }}>
                💡 Using one side only — stock will reduce by {qty} (the other side remains with the pair)
              </div>
            )}
          </div>
        )}

        {/* Branch */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:8 }}>Used At</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[['kuruwita','🏪 Kuruwita Optical'],['kalutota','🏬 Kalutota Optical']].map(([v,l])=>(
              <button key={v} onClick={()=>setBranch(v)}
                style={{ padding:'10px', border:`2px solid ${branch===v?C.navy:C.border}`, borderRadius:10,
                  background:branch===v?'#f0f4ff':'white', cursor:'pointer', fontFamily:'inherit',
                  fontSize:13, fontWeight:700, color:branch===v?C.navy:C.muted }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Qty */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:8 }}>
            Quantity · <span style={{ color:C.muted, fontWeight:400, textTransform:'none', letterSpacing:0 }}>{modeLabel()}</span>
          </label>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={()=>setQty(q=>Math.max(1,q-1))}
              style={{ width:36, height:36, borderRadius:9, border:`1.5px solid ${C.border}`, background:'white', color:C.navy, fontSize:18, fontWeight:700, cursor:'pointer' }}>−</button>
            <input type="number" value={qty} onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))} min="1" max={available}
              style={{ ...INP, textAlign:'center', fontWeight:700, fontSize:16 }}/>
            <button onClick={()=>setQty(q=>Math.min(available,q+1))}
              style={{ width:36, height:36, borderRadius:9, border:`1.5px solid ${C.border}`, background:'white', color:C.navy, fontSize:18, fontWeight:700, cursor:'pointer' }}>+</button>
          </div>
          {/* Remaining preview */}
          <div style={{ marginTop:8, fontSize:12, color:remaining<=0?C.danger:remaining<=2?'#92400e':C.success, fontWeight:600 }}>
            After use: <b>{Math.max(0,remaining)}</b> {isSingleSide?'side':'pair'}{remaining!==1?'s':''} remaining
          </div>
        </div>

        {/* Reason */}
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>Order No. / Customer (optional)</label>
          <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. KO-0119 or Mrs. Swarnalatha" style={INP}/>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'11px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
            Cancel
          </button>
          <button onClick={handleUse} disabled={saving || available === 0 || remaining < 0}
            style={{ flex:2, padding:'11px', background:saving||available===0||remaining<0?C.muted:C.danger, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:saving||available===0?'not-allowed':'pointer', fontFamily:'inherit' }}>
            {saving ? '⏳ Saving...' : available===0 ? 'Out of Stock' : `Confirm Use → ${Math.max(0,remaining)} left`}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function LensStock() {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [toast,      setToast]      = useState('');
  const [search,     setSearch]     = useState('');
  const [filterType, setFilterType] = useState('All');
  const [editId,     setEditId]     = useState(null);
  const [editQty,    setEditQty]    = useState('');
  const [activeTab,  setActiveTab]  = useState('stock');
  const [useModal,   setUseModal]   = useState(null); // item to use

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/lens-stock');
      setItems(Array.isArray(data) ? data : []);
    } catch(e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  // Copy R power to L
  const copyRtoL = () => setForm(f=>({...f, sph_l:f.sph_r, cyl_l:f.cyl_r}));
  // Copy L power to R
  const copyLtoR = () => setForm(f=>({...f, sph_r:f.sph_l, cyl_r:f.cyl_l}));

  const handleSave = async () => {
    if (!form.lens_type) return setError('Lens type is required');
    setSaving(true); setError('');
    try {
      await api('/lens-stock', 'POST', form);
      showToast('✓ Lens stock added');
      setForm(EMPTY_FORM);
      setActiveTab('stock');
      load();
    } catch(e) { setError('Failed to save'); }
    finally { setSaving(false); }
  };

  const updateQty = async (id, qty) => {
    await api(`/lens-stock/${id}`, 'PATCH', { quantity: parseInt(qty)||0 });
    setItems(prev => prev.map(i => i.id===id ? {...i, quantity:parseInt(qty)||0} : i));
    setEditId(null);
    showToast('✓ Quantity updated');
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Remove this lens from stock?')) return;
    await api(`/lens-stock/${id}`, 'DELETE');
    setItems(prev => prev.filter(i => i.id!==id));
    showToast('Removed');
  };

  const filtered = items.filter(i => {
    if (filterType !== 'All' && i.lens_type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (i.lens_type||'').toLowerCase().includes(q) ||
             (i.lens_coating||'').toLowerCase().includes(q) ||
             (i.sph_r||'').toLowerCase().includes(q) ||
             (i.sph_l||'').toLowerCase().includes(q) ||
             (i.supplier||'').toLowerCase().includes(q) ||
             (i.lens_index||'').toLowerCase().includes(q);
    }
    return true;
  });

  const totalPairs = items.reduce((s,i)=>s+(i.is_single_side?0.5:parseInt(i.quantity||0)),0);
  const totalSides = items.reduce((s,i)=>s+parseInt(i.quantity||0),0);
  const outOfStock = items.filter(i=>parseInt(i.quantity||0)===0).length;
  const totalValue = items.reduce((s,i)=>s+parseFloat(i.buy_price||0)*parseInt(i.quantity||0),0);

  const powerDisplay = item => {
    if (item.is_single_side) {
      const sph = item.sph_r || item.sph_l || '';
      const cyl = item.cyl_r || item.cyl_l || '';
      return `${sph}${cyl?' / '+cyl:''} (1 side)`;
    }
    const r = `R: ${item.sph_r||'—'}${item.cyl_r?' / '+item.cyl_r:''}`;
    const l = `L: ${item.sph_l||'—'}${item.cyl_l?' / '+item.cyl_l:''}`;
    if (!item.sph_r && !item.sph_l) return 'No power entered';
    return `${r}  ${l}`;
  };

  const coatingColor = c => {
    if (!c) return { bg:'#f3f4f6', text:'#6b7280' };
    if (c.includes('Blue')) return { bg:'#dbeafe', text:'#1e40af' };
    if (c.includes('Photo')) return { bg:'#fce7f3', text:'#9d174d' };
    return { bg:'#f0fdf4', text:'#15803d' };
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      {toast && <div style={{ position:'fixed', top:20, right:20, background:C.navy, color:'white', padding:'10px 18px', borderRadius:10, zIndex:999, fontSize:13, fontWeight:600 }}>{toast}</div>}

      {useModal && (
        <UseLensModal
          item={useModal}
          onClose={()=>setUseModal(null)}
          onDone={newQty=>{
            setItems(prev=>prev.map(i=>i.id===useModal.id?{...i,quantity:newQty}:i));
            showToast(`✓ Stock reduced. ${newQty} ${useModal.is_single_side?'sides':'pairs'} remaining`);
            setUseModal(null);
          }}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:4 }}>Inventory</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:C.navy, margin:0 }}>Lens Stock</h1>
            <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Manage your lens inventory by power, type and coating</p>
          </div>
          <button onClick={()=>setActiveTab(activeTab==='add'?'stock':'add')}
            style={{ padding:'10px 20px', background:activeTab==='add'?C.cream:C.navy, color:activeTab==='add'?C.muted:'white',
              border:activeTab==='add'?`1.5px solid ${C.border}`:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            {activeTab==='add' ? '← Back to Stock' : '+ Add Lens Stock'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'Total Pairs',  value:totalPairs,                       icon:'👓', color:'#1e40af', bg:'#eff6ff' },
          { label:'Total Sides',  value:totalSides,                       icon:'🔬', color:C.navy,   bg:C.cream   },
          { label:'Out of Stock', value:outOfStock,                       icon:'❌', color:C.danger, bg:'#fef2f2' },
          { label:'Stock Value',  value:`Rs.${totalValue.toLocaleString()}`, icon:'💰', color:C.success, bg:'#f0fdf4' },
        ].map(s=>(
          <div key={s.label} style={{ background:s.bg, borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:C.muted, fontWeight:600, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ADD FORM */}
      {activeTab === 'add' && (
        <div style={{ background:'white', border:`1.5px solid ${C.border}`, borderRadius:14, padding:24, marginBottom:20 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.navy, marginBottom:20 }}>Add New Lens to Stock</div>
          {error && <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:C.danger, borderRadius:9, padding:'10px 14px', fontSize:13, marginBottom:14 }}>{error}</div>}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>Lens Type *</label>
              <select value={form.lens_type} onChange={e=>set('lens_type',e.target.value)} style={SEL}>
                {LENS_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>Coating</label>
              <select value={form.lens_coating} onChange={e=>set('lens_coating',e.target.value)} style={SEL}>
                {COATINGS.map(c=><option key={c} value={c}>{c||'No coating'}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>Index</label>
              <select value={form.lens_index} onChange={e=>set('lens_index',e.target.value)} style={SEL}>
                {INDEXES.map(i=><option key={i}>{i}</option>)}
              </select>
            </div>
          </div>

          {/* Single side toggle */}
          <div style={{ background:C.cream, borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
            <div onClick={()=>set('is_single_side',!form.is_single_side)}
              style={{ width:42, height:22, borderRadius:11, background:form.is_single_side?C.navy:C.border, position:'relative', cursor:'pointer', transition:'background .15s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:3, left:form.is_single_side?22:3, width:16, height:16, borderRadius:'50%', background:'white', transition:'left .15s' }}/>
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>Single Side Only</div>
              <div style={{ fontSize:11, color:C.muted }}>Turn on if you have only one side (R or L) of this lens</div>
            </div>
          </div>

          {/* Power entry */}
          <div style={{ background:C.cream, borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.navy, marginBottom:12 }}>
              Power (Rx) {form.is_single_side ? '— Single Side' : ''}
            </div>
            {form.is_single_side ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:C.muted, display:'block', marginBottom:6 }}>SPH</label>
                  <select value={form.sph_r} onChange={e=>{ set('sph_r',e.target.value); set('sph_l',e.target.value); }} style={SEL}>
                    {SPH_VALUES.map(v=><option key={v} value={v}>{v||'Select'}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:C.muted, display:'block', marginBottom:6 }}>CYL</label>
                  <select value={form.cyl_r} onChange={e=>{ set('cyl_r',e.target.value); set('cyl_l',e.target.value); }} style={SEL}>
                    {CYL_VALUES.map(v=><option key={v} value={v}>{v||'None'}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8, alignItems:'end' }}>
                  {/* Right eye */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:C.navy, marginBottom:8 }}>Right Eye (R)</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      <div>
                        <label style={{ fontSize:10, color:C.muted, display:'block', marginBottom:4 }}>SPH</label>
                        <select value={form.sph_r} onChange={e=>set('sph_r',e.target.value)} style={SEL}>
                          {SPH_VALUES.map(v=><option key={v} value={v}>{v||'Select'}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize:10, color:C.muted, display:'block', marginBottom:4 }}>CYL</label>
                        <select value={form.cyl_r} onChange={e=>set('cyl_r',e.target.value)} style={SEL}>
                          {CYL_VALUES.map(v=><option key={v} value={v}>{v||'None'}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Copy buttons — center */}
                  <div style={{ display:'flex', flexDirection:'column', gap:6, paddingBottom:2 }}>
                    <button onClick={copyRtoL} title="Copy R to L"
                      style={{ padding:'6px 8px', background:C.navy, color:'white', border:'none', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                      R → L
                    </button>
                    <button onClick={copyLtoR} title="Copy L to R"
                      style={{ padding:'6px 8px', background:C.navy, color:'white', border:'none', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                      L → R
                    </button>
                  </div>

                  {/* Left eye */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:C.navy, marginBottom:8 }}>Left Eye (L)</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      <div>
                        <label style={{ fontSize:10, color:C.muted, display:'block', marginBottom:4 }}>SPH</label>
                        <select value={form.sph_l} onChange={e=>set('sph_l',e.target.value)} style={SEL}>
                          {SPH_VALUES.map(v=><option key={v} value={v}>{v||'Select'}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize:10, color:C.muted, display:'block', marginBottom:4 }}>CYL</label>
                        <select value={form.cyl_l} onChange={e=>set('cyl_l',e.target.value)} style={SEL}>
                          {CYL_VALUES.map(v=><option key={v} value={v}>{v||'None'}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Qty and price */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>
                {form.is_single_side ? 'Qty (sides)' : 'Qty (pairs)'}
              </label>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <button onClick={()=>set('quantity',Math.max(0,(parseInt(form.quantity)||1)-1))}
                  style={{ width:32, height:36, borderRadius:8, border:`1.5px solid ${C.border}`, background:'white', color:C.navy, fontSize:16, fontWeight:700, cursor:'pointer' }}>−</button>
                <input type="number" value={form.quantity} onChange={e=>set('quantity',e.target.value)} min="0"
                  style={{ ...INP, textAlign:'center', fontWeight:700, fontSize:15 }}/>
                <button onClick={()=>set('quantity',(parseInt(form.quantity)||0)+1)}
                  style={{ width:32, height:36, borderRadius:8, border:`1.5px solid ${C.border}`, background:'white', color:C.navy, fontSize:16, fontWeight:700, cursor:'pointer' }}>+</button>
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>Buy Price (Rs.)</label>
              <input type="number" value={form.buy_price} onChange={e=>set('buy_price',e.target.value)} placeholder="Optional" style={INP}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>Sell Price (Rs.)</label>
              <input type="number" value={form.sell_price} onChange={e=>set('sell_price',e.target.value)} placeholder="Optional" style={INP}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>Supplier</label>
              <input value={form.supplier} onChange={e=>set('supplier',e.target.value)} placeholder="e.g. Negombo Optical" style={INP}/>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>Notes (optional)</label>
            <input value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any notes..." style={INP}/>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:'11px 28px', background:saving?C.muted:C.success, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {saving ? '⏳ Saving...' : '✓ Add to Stock'}
            </button>
            <button onClick={()=>{ setForm(EMPTY_FORM); setError(''); }}
              style={{ padding:'11px 18px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* STOCK LIST */}
      {activeTab === 'stock' && (
        <>
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search power, type, coating..."
              style={{ ...INP, flex:1, minWidth:200 }}/>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {['All',...LENS_TYPES].map(t=>(
                <button key={t} onClick={()=>setFilterType(t)}
                  style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${filterType===t?C.navy:C.border}`,
                    background:filterType===t?C.navy:'white', color:filterType===t?'white':C.muted,
                    fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>
            Showing <b style={{color:C.navy}}>{filtered.length}</b> items
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:60, color:C.muted }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:C.muted }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🔬</div>
              <div style={{ fontSize:15, fontWeight:600, color:C.navy }}>No lens stock found</div>
              <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>Click "+ Add Lens Stock" to get started</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filtered.map(item => {
                const qty = parseInt(item.quantity||0);
                const coating = coatingColor(item.lens_coating);
                const isEditing = editId === item.id;
                return (
                  <div key={item.id} style={{ background:'white', border:`1.5px solid ${qty===0?'#fca5a5':C.border}`, borderRadius:12, padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6 }}>
                          <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>{item.lens_type}</span>
                          {item.lens_coating && (
                            <span style={{ background:coating.bg, color:coating.text, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                              {item.lens_coating}
                            </span>
                          )}
                          <span style={{ background:'#f3f4f6', color:C.muted, fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20 }}>
                            {item.lens_index}
                          </span>
                          {item.is_single_side && (
                            <span style={{ background:'#fef9c3', color:'#92400e', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                              1 Side Only
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:12, color:C.muted, marginBottom:4 }}>
                          💊 <b style={{color:C.navy}}>{powerDisplay(item)}</b>
                        </div>
                        <div style={{ display:'flex', gap:16, fontSize:11, color:C.muted, flexWrap:'wrap' }}>
                          {item.supplier && <span>🏪 {item.supplier}</span>}
                          {parseFloat(item.buy_price||0)>0 && <span>Buy: Rs.{parseFloat(item.buy_price).toLocaleString()}</span>}
                          {parseFloat(item.sell_price||0)>0 && <span>Sell: Rs.{parseFloat(item.sell_price).toLocaleString()}</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                        {/* Use lens button */}
                        {qty > 0 && !isEditing && (
                          <button onClick={()=>setUseModal(item)}
                            style={{ padding:'7px 14px', background:'#eff6ff', border:'1.5px solid #93c5fd', borderRadius:8,
                              fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:'#1e40af' }}>
                            🔬 Use Lens
                          </button>
                        )}

                        {/* Qty editor */}
                        {isEditing ? (
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <button onClick={()=>{ const q=Math.max(0,(parseInt(editQty)||0)-1); setEditQty(String(q)); }}
                              style={{ width:28, height:28, borderRadius:6, border:`1.5px solid ${C.border}`, background:'white', color:C.navy, fontSize:14, fontWeight:700, cursor:'pointer' }}>−</button>
                            <input type="number" value={editQty} onChange={e=>setEditQty(e.target.value)} autoFocus
                              style={{ width:52, textAlign:'center', padding:'5px', border:`1.5px solid ${C.gold}`, borderRadius:8, fontSize:14, fontWeight:700, fontFamily:'inherit', outline:'none' }}
                              onKeyDown={e=>{ if(e.key==='Enter') updateQty(item.id,editQty); if(e.key==='Escape') setEditId(null); }}/>
                            <button onClick={()=>{ const q=(parseInt(editQty)||0)+1; setEditQty(String(q)); }}
                              style={{ width:28, height:28, borderRadius:6, border:`1.5px solid ${C.border}`, background:'white', color:C.navy, fontSize:14, fontWeight:700, cursor:'pointer' }}>+</button>
                            <button onClick={()=>updateQty(item.id,editQty)}
                              style={{ padding:'5px 12px', background:C.success, color:'white', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>✓</button>
                            <button onClick={()=>setEditId(null)}
                              style={{ padding:'5px 10px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>✕</button>
                          </div>
                        ) : (
                          <div onClick={()=>{ setEditId(item.id); setEditQty(String(qty)); }}
                            style={{ background:qty===0?'#fee2e2':qty<=2?'#fef9c3':'#f0fdf4',
                              border:`2px solid ${qty===0?'#fca5a5':qty<=2?'#fde68a':'#86efac'}`,
                              borderRadius:10, padding:'8px 14px', textAlign:'center', cursor:'pointer', minWidth:60 }}>
                            <div style={{ fontSize:20, fontWeight:800, color:qty===0?C.danger:qty<=2?'#92400e':C.success }}>{qty}</div>
                            <div style={{ fontSize:9, color:C.muted, fontWeight:600 }}>{item.is_single_side?'SIDES':'PAIRS'}</div>
                          </div>
                        )}

                        <button onClick={()=>deleteItem(item.id)}
                          style={{ padding:'8px 10px', background:'#fee2e2', border:'none', borderRadius:8, color:C.danger, cursor:'pointer', fontSize:13 }}>🗑️</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}