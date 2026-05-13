/* eslint-disable */
// ============================================================
//  DealerPurchases.js — Dealer purchase log
//  Track stock purchases from Negombo Optical, Solex, etc.
//  Monthly spend per dealer, category breakdown, full history
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};

const fmt     = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0,maximumFractionDigits:0});
const fmtFull = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2});
const fmtDate = (d) => { if(!d) return '—'; return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); };
const thisMonth = () => new Date().toISOString().slice(0,7);
const today     = () => new Date().toISOString().split('T')[0];

const INP = { padding:'10px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%', boxSizing:'border-box' };
const SEL = { ...INP, cursor:'pointer' };
const LBL = { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, marginBottom:5, display:'block' };

// Known dealers — pre-filled for convenience
const KNOWN_DEALERS = [
  'Negombo Optical',
  'Solex Optical',
  'Other Dealer',
];

const CATEGORIES = [
  'Frames', 'Sunglasses', 'Reading Glasses',
  'Lenses', 'Lens Blanks', 'Accessories',
  'Boxes', 'Pouches', 'Chains', 'Ear Tips',
  'Glass Cleaner', 'Stationary', 'Other',
];

// Dealer colours for chart bars
const DEALER_COLORS = [
  '#0f1f3d','#c9a84c','#2563eb','#7c3aed',
  '#059669','#dc2626','#0891b2','#b45309',
];

function apiGet(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json());
}
function apiPost(path, body) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body:JSON.stringify(body) }).then(r=>r.json());
}
function apiDel(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
}

// ── Simple bar chart using SVG ───────────────────────────────
function SpendChart({ byMonth, dealers }) {
  if (!byMonth?.length) return null;

  // Build month list
  const months = [...new Set(byMonth.map(r=>r.month_key))].sort();
  if (months.length < 2) return null;

  const dealerList = dealers.slice(0,4); // top 4 dealers max
  const W = 480, H = 120, PAD = { t:10, r:10, b:24, l:48 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  // Max total per month
  const monthTotals = months.map(m =>
    dealerList.reduce((s,d)=>{
      const row = byMonth.find(r=>r.month_key===m && r.dealer_name===d.dealer_name);
      return s + parseFloat(row?.total||0);
    },0)
  );
  const maxVal = Math.max(...monthTotals, 1);

  const barW   = Math.min(32, (innerW / months.length) - 6);
  const xStep  = innerW / months.length;
  const xCenter= (i) => PAD.l + i * xStep + xStep/2;

  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>Monthly spend by dealer</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H }}>
        {/* Y gridlines */}
        {[0.25,0.5,0.75,1].map(pct=>{
          const y = PAD.t + (1-pct)*innerH;
          return (
            <g key={pct}>
              <line x1={PAD.l} y1={y} x2={W-PAD.r} y2={y} stroke={C.border} strokeWidth="0.5"/>
              <text x={PAD.l-4} y={y+4} textAnchor="end" fontSize="9" fill={C.muted}>
                {Math.round(maxVal*pct/1000)}K
              </text>
            </g>
          );
        })}

        {/* Stacked bars per month */}
        {months.map((m,mi)=>{
          let stackY = PAD.t + innerH;
          return (
            <g key={m}>
              {dealerList.map((d,di)=>{
                const row = byMonth.find(r=>r.month_key===m && r.dealer_name===d.dealer_name);
                const val = parseFloat(row?.total||0);
                if (!val) return null;
                const bH  = Math.max(2, (val/maxVal)*innerH);
                stackY   -= bH;
                return (
                  <rect key={di}
                    x={xCenter(mi)-barW/2} y={stackY} width={barW} height={bH}
                    fill={DEALER_COLORS[di % DEALER_COLORS.length]}
                    rx="2"
                    opacity="0.9"
                  />
                );
              })}
              <text x={xCenter(mi)} y={H-4} textAnchor="middle" fontSize="9" fill={C.muted}>
                {m.slice(0,6)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:11, color:C.muted }}>
        {dealerList.map((d,i)=>(
          <span key={d.dealer_name} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:DEALER_COLORS[i%DEALER_COLORS.length] }}/>
            {d.dealer_name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function DealerPurchases() {
  const [purchases,  setPurchases]  = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('log');
  const [month,      setMonth]      = useState(thisMonth());
  const [dealerFilt, setDealerFilt] = useState('all');
  const [catFilt,    setCatFilt]    = useState('all');
  const [showAdd,    setShowAdd]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [toast,      setToast]      = useState('');

  const [form, setForm] = useState({
    dealer_name:    'Negombo Optical',
    custom_dealer:  '',
    purchase_date:  today(),
    invoice_no:     '',
    category:       'Frames',
    description:    '',
    quantity:       '1',
    unit_cost:      '',
    payment_method: 'cash',
    payment_status: 'paid',
    notes:          '',
  });

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [purch, sum] = await Promise.all([
        apiGet(`/dealer-purchases?month=${month}${dealerFilt!=='all'?`&dealer=${encodeURIComponent(dealerFilt)}`:''}${catFilt!=='all'?`&category=${encodeURIComponent(catFilt)}`:''}`),
        apiGet('/dealer-purchases/summary?months=6'),
      ]);
      setPurchases(Array.isArray(purch)?purch:[]);
      setSummary(sum);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  },[month, dealerFilt, catFilt]);

  useEffect(()=>{ load(); },[load]);

  const totalCost = parseFloat(form.unit_cost||0) * parseInt(form.quantity||0);
  const actualDealer = form.dealer_name === 'Other Dealer' ? form.custom_dealer : form.dealer_name;

  const handleAdd = async () => {
    if (!actualDealer.trim())     return setError('Please enter dealer name');
    if (!form.description.trim()) return setError('Please enter a description');
    if (!form.unit_cost || parseFloat(form.unit_cost)<=0) return setError('Please enter unit cost');
    if (!form.quantity  || parseInt(form.quantity)<=0)   return setError('Please enter quantity');
    setError(''); setSaving(true);
    try {
      const res = await apiPost('/dealer-purchases', {
        ...form,
        dealer_name: actualDealer.trim(),
        quantity:    parseInt(form.quantity),
        unit_cost:   parseFloat(form.unit_cost),
      });
      if (res.error) throw new Error(res.error);
      setForm(f=>({ ...f, description:'', quantity:'1', unit_cost:'', invoice_no:'', notes:'' }));
      setShowAdd(false);
      showToast(`Purchase recorded — ${fmt(res.total_cost)}`);
      load();
    } catch(e) { setError(e.message||'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this purchase record?')) return;
    await apiDel(`/dealer-purchases/${id}`);
    showToast('Deleted');
    load();
  };

  // All dealers from summary for filter tabs
  const allDealers = summary?.by_dealer?.map(d=>d.dealer_name) || [];

  const STATUS_STYLE = {
    paid:    { bg:'#dcfce7', color:C.success  },
    pending: { bg:'#fee2e2', color:C.danger   },
    partial: { bg:'#fef9c3', color:'#854d0e'  },
  };

  const PAY_ICON = { cash:'💵', bank:'🏦', credit:'📋' };

  const TABS = [
    { key:'log',      label:'📋 Purchase Log' },
    { key:'dealers',  label:'🏪 By Dealer'    },
    { key:'analysis', label:'📊 Analysis'     },
  ];

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:C.navy, color:'white', padding:'12px 20px', borderRadius:12, fontSize:14, fontWeight:600, borderLeft:`4px solid ${C.gold}`, zIndex:500, boxShadow:'0 4px 20px rgba(0,0,0,.2)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>🏪 Dealer Purchases</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Track stock purchases from Negombo Optical, Solex and other dealers</p>
        </div>
        <button onClick={()=>setShowAdd(s=>!s)}
          style={{ padding:'9px 20px', background:showAdd?C.cream:C.gold, color:showAdd?C.muted:C.navy, border:showAdd?`1.5px solid ${C.border}`:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          {showAdd ? '✕ Cancel' : '+ Record Purchase'}
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, margin:'20px 0' }}>
        {[
          { l:'6-Month Total',   v:fmt(summary?.totals?.total_spent||0),     dark:true },
          { l:'This Month',      v:fmt(summary?.totals?.this_month||0),       c:C.danger },
          { l:'Purchases',       v:summary?.totals?.total_purchases||0,       c:'#2563eb' },
          { l:'Items Bought',    v:summary?.totals?.total_items||0,           c:'#7c3aed' },
          { l:'Dealers',         v:summary?.by_dealer?.length||0,             c:C.navy },
        ].map(s=>(
          <div key={s.l} style={{ background:s.dark?C.navy:'white', border:`1px solid ${s.dark?C.navy:C.border}`, borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:s.dark?C.gold:C.muted, marginBottom:5 }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:s.dark?'white':(s.c||C.navy) }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Add purchase form */}
      {showAdd && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:22, marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:700, color:C.navy, marginBottom:16 }}>➕ Record New Purchase</div>

          {error && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:9, padding:'10px 14px', fontSize:13, marginBottom:14 }}>⚠️ {error}</div>}

          {/* Dealer selector */}
          <div style={{ marginBottom:14 }}>
            <label style={LBL}>Dealer *</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
              {KNOWN_DEALERS.map(d=>(
                <button key={d} onClick={()=>setForm(f=>({...f,dealer_name:d}))}
                  style={{ padding:'8px 16px', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${form.dealer_name===d?C.navy:C.border}`, background:form.dealer_name===d?C.navy:'white', color:form.dealer_name===d?'white':C.muted }}>
                  {d}
                </button>
              ))}
            </div>
            {form.dealer_name === 'Other Dealer' && (
              <input value={form.custom_dealer} onChange={e=>setForm(f=>({...f,custom_dealer:e.target.value}))}
                placeholder="Enter dealer name..." style={INP}/>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={LBL}>Purchase Date *</label>
              <input type="date" value={form.purchase_date} onChange={e=>setForm(f=>({...f,purchase_date:e.target.value}))} style={INP}/>
            </div>
            <div>
              <label style={LBL}>Invoice / Bill No.</label>
              <input value={form.invoice_no} onChange={e=>setForm(f=>({...f,invoice_no:e.target.value}))} placeholder="Optional" style={INP}/>
            </div>
            <div>
              <label style={LBL}>Category</label>
              <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={SEL}>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={LBL}>Description *</label>
            <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
              placeholder="e.g. Murano Progressive lenses × 10 pairs, RayBan frames × 5 pcs"
              style={INP}/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={LBL}>Quantity *</label>
              <input type="number" min="1" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} style={INP}/>
            </div>
            <div>
              <label style={LBL}>Unit Cost (Rs.) *</label>
              <input type="number" value={form.unit_cost} onChange={e=>setForm(f=>({...f,unit_cost:e.target.value}))} placeholder="Cost per unit" style={INP}/>
            </div>
            <div>
              <label style={LBL}>Payment</label>
              <select value={form.payment_method} onChange={e=>setForm(f=>({...f,payment_method:e.target.value}))} style={SEL}>
                <option value="cash">💵 Cash</option>
                <option value="bank">🏦 Bank Transfer</option>
                <option value="credit">📋 Credit</option>
              </select>
            </div>
            <div>
              <label style={LBL}>Status</label>
              <select value={form.payment_status} onChange={e=>setForm(f=>({...f,payment_status:e.target.value}))} style={SEL}>
                <option value="paid">✅ Paid</option>
                <option value="pending">⏳ Pending</option>
                <option value="partial">🔸 Partial</option>
              </select>
            </div>
          </div>

          {/* Total preview */}
          {totalCost > 0 && (
            <div style={{ background:C.cream, borderRadius:10, padding:'12px 16px', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:C.muted }}>
                {form.quantity} × {fmt(form.unit_cost||0)} =
              </span>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:C.navy }}>
                {fmt(totalCost)}
              </span>
            </div>
          )}

          <div style={{ marginBottom:14 }}>
            <label style={LBL}>Notes (optional)</label>
            <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any extra details..." style={INP}/>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleAdd} disabled={saving}
              style={{ padding:'10px 24px', background:saving?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {saving ? '⏳ Saving...' : '💾 Save Purchase'}
            </button>
            <button onClick={()=>{ setShowAdd(false); setError(''); }}
              style={{ padding:'10px 16px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, marginBottom:20, background:'white', borderRadius:'12px 12px 0 0', padding:'0 4px' }}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)}
            style={{ padding:'12px 20px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontFamily:'inherit', whiteSpace:'nowrap', color:activeTab===t.key?C.navy:C.muted, borderBottom:`2.5px solid ${activeTab===t.key?C.gold:'transparent'}`, marginBottom:-1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PURCHASE LOG TAB ── */}
      {activeTab==='log' && (
        <>
          {/* Filters */}
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
            <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
              style={{ padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy }}/>

            {/* Dealer filter */}
            <select value={dealerFilt} onChange={e=>setDealerFilt(e.target.value)}
              style={{ padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy, cursor:'pointer' }}>
              <option value="all">All Dealers</option>
              {allDealers.map(d=><option key={d}>{d}</option>)}
            </select>

            {/* Category filter */}
            <select value={catFilt} onChange={e=>setCatFilt(e.target.value)}
              style={{ padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy, cursor:'pointer' }}>
              <option value="all">All Categories</option>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>

            <div style={{ marginLeft:'auto', fontSize:13, color:C.muted, display:'flex', alignItems:'center' }}>
              {purchases.length} records · {fmt(purchases.reduce((s,p)=>s+parseFloat(p.total_cost||0),0))} total
            </div>
          </div>

          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'12px 18px', borderBottom:`1px solid ${C.border}`, display:'grid', gridTemplateColumns:'1fr 1fr 80px 100px 80px 60px', gap:8, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:C.muted }}>
              <span>Item</span><span>Dealer</span><span>Qty</span><span>Total</span><span>Status</span><span></span>
            </div>

            {loading
              ? <div style={{ padding:32, textAlign:'center', color:C.muted }}>Loading...</div>
              : !purchases.length
                ? <div style={{ padding:40, textAlign:'center', color:C.muted }}>
                    <div style={{ fontSize:36, marginBottom:12 }}>🏪</div>
                    <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>No purchases recorded</div>
                    <div style={{ fontSize:13 }}>Click "+ Record Purchase" to add your first entry</div>
                  </div>
                : purchases.map((p,idx)=>{
                    const prev = purchases[idx-1];
                    const showDateHead = !prev || prev.purchase_date?.slice(0,10) !== p.purchase_date?.slice(0,10);
                    const st = STATUS_STYLE[p.payment_status] || STATUS_STYLE.paid;
                    return (
                      <React.Fragment key={p.id}>
                        {showDateHead && (
                          <div style={{ padding:'7px 18px', background:C.cream, fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'1px', borderBottom:`1px solid ${C.border}` }}>
                            {fmtDate(p.purchase_date)}
                            {p.invoice_no && <span style={{ fontWeight:400, marginLeft:10 }}>Invoice: {p.invoice_no}</span>}
                          </div>
                        )}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 80px 100px 80px 60px', gap:8, padding:'12px 18px', borderBottom:`1px solid ${C.cream}`, alignItems:'center' }}>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{p.description}</div>
                            <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                              <span style={{ background:'#e0f2fe', color:'#0369a1', padding:'1px 7px', borderRadius:20, fontSize:10, fontWeight:600 }}>{p.category||'Other'}</span>
                              <span style={{ marginLeft:8 }}>{PAY_ICON[p.payment_method]} {p.payment_method}</span>
                              {p.notes && <span style={{ marginLeft:8, fontStyle:'italic' }}>{p.notes}</span>}
                            </div>
                          </div>
                          <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{p.dealer_name}</div>
                          <div style={{ fontSize:13, color:C.muted }}>{p.quantity} × {fmt(p.unit_cost)}</div>
                          <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{fmt(p.total_cost)}</div>
                          <div>
                            <span style={{ background:st.bg, color:st.color, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>
                              {p.payment_status}
                            </span>
                          </div>
                          <button onClick={()=>handleDelete(p.id)} style={{ background:'none', border:'none', color:'#d1d5db', cursor:'pointer', fontSize:18, padding:0, fontFamily:'inherit' }}>🗑️</button>
                        </div>
                      </React.Fragment>
                    );
                  })
            }

            {/* Month total footer */}
            {purchases.length > 0 && (
              <div style={{ padding:'12px 18px', background:C.cream, display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, borderTop:`1px solid ${C.border}` }}>
                <span style={{ color:C.muted }}>Month Total</span>
                <span style={{ color:C.navy }}>{fmt(purchases.reduce((s,p)=>s+parseFloat(p.total_cost||0),0))}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── BY DEALER TAB ── */}
      {activeTab==='dealers' && (
        <div>
          {!summary?.by_dealer?.length
            ? <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:40, textAlign:'center', color:C.muted }}>
                <div style={{ fontSize:36, marginBottom:12 }}>🏪</div>No purchase data yet
              </div>
            : summary.by_dealer.map((d,i)=>{
                const pct    = summary.totals?.total_spent > 0 ? parseFloat(d.total_spent)/parseFloat(summary.totals.total_spent)*100 : 0;
                const color  = DEALER_COLORS[i % DEALER_COLORS.length];
                const months = summary.by_month?.filter(m=>m.dealer_name===d.dealer_name) || [];
                const maxM   = Math.max(...months.map(m=>parseFloat(m.total)||0),1);
                return (
                  <div key={d.dealer_name} style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 20px', marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:44, height:44, borderRadius:10, background:color+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🏪</div>
                        <div>
                          <div style={{ fontSize:16, fontWeight:700, color:C.navy }}>{d.dealer_name}</div>
                          <div style={{ fontSize:12, color:C.muted }}>{d.purchase_count} purchases · Last: {d.last_purchase_fmt}</div>
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.navy }}>{fmt(d.total_spent)}</div>
                        <div style={{ fontSize:12, color:C.muted }}>{pct.toFixed(1)}% of total spend</div>
                      </div>
                    </div>

                    {/* Share bar */}
                    <div style={{ height:6, background:C.cream, borderRadius:3, overflow:'hidden', marginBottom:14 }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3, transition:'width .4s' }}/>
                    </div>

                    {/* Monthly mini bars */}
                    {months.length > 0 && (
                      <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:40 }}>
                        {months.map((m,mi)=>{
                          const val = parseFloat(m.total)||0;
                          const h   = Math.max(4, (val/maxM)*36);
                          return (
                            <div key={mi} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                              <div style={{ width:'100%', background:color, borderRadius:'3px 3px 0 0', height:h, opacity:.8 }} title={`${m.month}: ${fmt(val)}`}/>
                              <div style={{ fontSize:8, color:C.muted }}>{m.month?.slice(0,3)}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Stats row */}
                    <div style={{ display:'flex', gap:16, marginTop:12, paddingTop:12, borderTop:`1px solid ${C.cream}`, fontSize:12, color:C.muted }}>
                      <span><b style={{color:C.navy}}>{d.total_items}</b> items bought</span>
                      <span><b style={{color:C.navy}}>{fmt(parseFloat(d.total_spent)/Math.max(1,d.purchase_count))}</b> avg per purchase</span>
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}

      {/* ── ANALYSIS TAB ── */}
      {activeTab==='analysis' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

          {/* Spend chart */}
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 20px', gridColumn:'1/-1' }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:14 }}>Monthly Spend — Last 6 Months</div>
            <SpendChart byMonth={summary?.by_month||[]} dealers={summary?.by_dealer||[]}/>
          </div>

          {/* By category */}
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, fontSize:14, fontWeight:700, color:C.navy }}>By Category</div>
            {!summary?.by_category?.length
              ? <div style={{ padding:24, textAlign:'center', color:C.muted, fontSize:13 }}>No data</div>
              : summary.by_category.map((cat,i)=>{
                  const max = parseFloat(summary.by_category[0]?.total)||1;
                  return (
                    <div key={cat.category} style={{ padding:'11px 18px', borderBottom:`1px solid ${C.cream}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>{cat.category}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:C.navy }}>{fmt(cat.total)}</span>
                      </div>
                      <div style={{ height:5, background:C.cream, borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${parseFloat(cat.total)/max*100}%`, background:'#2563eb', borderRadius:3 }}/>
                      </div>
                      <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{cat.purchases} purchase{cat.purchases!=1?'s':''} · {cat.items} items</div>
                    </div>
                  );
                })
            }
          </div>

          {/* Pending payments */}
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, fontSize:14, fontWeight:700, color:C.navy }}>
              ⏳ Pending Payments
            </div>
            {loading
              ? <div style={{ padding:20, color:C.muted, fontSize:13 }}>Loading...</div>
              : (() => {
                  const pending = purchases.filter(p=>p.payment_status!=='paid');
                  if (!pending.length) return (
                    <div style={{ padding:24, textAlign:'center', color:C.muted, fontSize:13 }}>
                      <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
                      All payments settled
                    </div>
                  );
                  return pending.map(p=>(
                    <div key={p.id} style={{ padding:'11px 18px', borderBottom:`1px solid ${C.cream}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{p.dealer_name}</div>
                        <div style={{ fontSize:11, color:C.muted }}>{p.description?.slice(0,40)} · {fmtDate(p.purchase_date)}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:14, fontWeight:700, color:C.danger }}>{fmt(p.total_cost)}</div>
                        <span style={{ background:'#fef9c3', color:'#854d0e', fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20 }}>{p.payment_status}</span>
                      </div>
                    </div>
                  ));
                })()
            }
          </div>
        </div>
      )}
    </div>
  );
}
