/* eslint-disable */
// ============================================================
//  WarrantyClaims.js — Warranty management page
//  Tab 1: Check warranty by phone or order number
//  Tab 2: Log a new claim
//  Tab 3: All past claims
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};
const fmt     = n => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
const fmtDate = d => { if(!d) return '—'; const s=String(d).slice(0,10); const [y,m,dy]=s.split('-'); return new Date(+y,+m-1,+dy).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); };

const BASE  = () => process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const token = () => localStorage.getItem('ko_token');
const api = (path, opts={}) => fetch(`${BASE()}${path}`, { headers:{ Authorization:`Bearer ${token()}`, 'Content-Type':'application/json' }, ...opts }).then(r=>r.json());

const CLAIM_TYPES = [
  { v:'frame_defect',   label:'Frame defect',    icon:'🕶️', desc:'Broken frame, loose hinges, warping' },
  { v:'lens_defect',    label:'Lens defect',      icon:'🔬', desc:'Lens cracked, peeled, quality issue' },
  { v:'coating_issue',  label:'Coating issue',    icon:'✨', desc:'Coating peeling, bubbling, delaminating' },
  { v:'hinge_broken',   label:'Hinge broken',     icon:'🔩', desc:'Hinge snapped or very loose' },
  { v:'nose_pad',       label:'Nose pad issue',   icon:'👃', desc:'Nose pad broken or missing' },
  { v:'scratch',        label:'Scratch on lens',  icon:'💢', desc:'Manufacturing scratch, not from use' },
  { v:'other',          label:'Other defect',     icon:'🔧', desc:'Other manufacturer defect' },
];
const RESOLUTION_TYPES = [
  { v:'replaced_from_stock', label:'Replaced from stock',   icon:'📦' },
  { v:'sent_to_dealer',      label:'Sent to dealer',        icon:'🏪' },
  { v:'sent_to_lab',         label:'Sent to lab',           icon:'🔬' },
  { v:'repaired_inshop',     label:'Repaired in-shop',      icon:'🔧' },
  { v:'partial_charge',      label:'Partial charge',        icon:'💵' },
  { v:'rejected',            label:'Claim rejected',        icon:'❌' },
];

const STATUS_STYLE = {
  open:        { bg:'#dbeafe', color:'#1e40af', label:'Open' },
  in_progress: { bg:'#fef9c3', color:'#854d0e', label:'In Progress' },
  resolved:    { bg:'#dcfce7', color:'#166534', label:'Resolved' },
  rejected:    { bg:'#f3f4f6', color:'#374151', label:'Rejected' },
};

const WARRANTY_STATUS = {
  active:  { bg:'#dcfce7', color:'#166534', icon:'✅', label:'Active' },
  expired: { bg:'#fee2e2', color:'#991b1b', icon:'❌', label:'Expired' },
  none:    { bg:'#f3f4f6', color:'#6b7280', icon:'—',  label:'No warranty' },
};

const INP = { padding:'10px 14px', border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:'white', color:C.navy, width:'100%' };
const SEL = { ...INP, cursor:'pointer' };

// ── Warranty status badge ────────────────────────────────────
function WarrantyBadge({ order }) {
  const ws  = order.warranty_status || 'none';
  const sty = WARRANTY_STATUS[ws];
  return (
    <span style={{ background:sty.bg, color:sty.color, fontSize:11, fontWeight:700,
                   padding:'3px 10px', borderRadius:20, display:'inline-flex', alignItems:'center', gap:4 }}>
      {sty.icon} {sty.label}
      {ws === 'active' && order.warranty_days_left !== null &&
        <span style={{ opacity:.8 }}>· {order.warranty_days_left}d left</span>}
    </span>
  );
}

// ── Order warranty card (from check tab) ─────────────────────
function OrderWarrantyCard({ order, onLogClaim }) {
  const [expanded, setExpanded] = useState(false);
  const ws = order.warranty_status || 'none';

  const coverageList = Array.isArray(order.warranty_coverage)
    ? order.warranty_coverage
    : (order.warranty_coverage ? [order.warranty_coverage] : []);

  return (
    <div style={{ background:'white', border:`1.5px solid ${ws === 'active' ? C.success : C.border}`,
                  borderRadius:12, marginBottom:10, overflow:'hidden' }}>
      <div onClick={() => setExpanded(e => !e)} style={{ padding:'14px 16px', cursor:'pointer' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>{order.order_number}</span>
              <WarrantyBadge order={order} />
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:C.navy }}>{order.customer_name}</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
              {order.frame || '—'} · {fmtDate(order.created_at)}
            </div>
          </div>
          <span style={{ color:C.muted, fontSize:18, marginLeft:8 }}>{expanded ? '▲' : '▽'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:'14px 16px', background:C.cream }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12, fontSize:13 }}>
            {[
              { l:'Warranty',   v: ws === 'none' ? 'Not given' : `${order.warranty_months || 0} months` },
              { l:'Coverage',   v: coverageList.length ? coverageList.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ') : '—' },
              { l:'Starts',     v: fmtDate(order.warranty_start_date || order.created_at) },
              { l:'Expires',    v: fmtDate(order.warranty_expiry) },
              { l:'Order Total',v: fmt(order.total_amount) },
              { l:'Status',     v: order.status },
            ].map(row => (
              <div key={row.l} style={{ background:'white', borderRadius:8, padding:'8px 10px' }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:2 }}>{row.l}</div>
                <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{row.v || '—'}</div>
              </div>
            ))}
          </div>

          {order.warranty_notes && (
            <div style={{ background:'#fef9f0', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#92400e', marginBottom:10 }}>
              📝 {order.warranty_notes}
            </div>
          )}

          <button onClick={() => onLogClaim(order)}
            style={{ width:'100%', padding:'11px', background: ws === 'active' ? C.navy : '#6b7280',
                     color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700,
                     cursor: ws === 'active' ? 'pointer' : 'default', fontFamily:'inherit' }}>
            {ws === 'active' ? '📝 Log Warranty Claim' : ws === 'expired' ? '⏱ Warranty Expired — Log anyway' : 'No warranty on this order'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Claim card (in All Claims tab) ───────────────────────────
function ClaimCard({ claim, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState({
    status:           claim.status,
    resolution_type:  claim.resolution_type  || '',
    resolution_notes: claim.resolution_notes || '',
    charge_amount:    claim.charge_amount    || 0,
  });

  const sty = STATUS_STYLE[claim.status] || STATUS_STYLE.open;
  const ct  = CLAIM_TYPES.find(t => t.v === claim.claim_type) || { label: claim.claim_type, icon:'🔧' };

  const save = async () => {
    setSaving(true);
    try {
      await api(`/warranties/${claim.id}`, { method:'PATCH', body: JSON.stringify(form) });
      onUpdate();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ background:'white', border:`1.5px solid ${C.border}`, borderRadius:12, marginBottom:8, overflow:'hidden' }}>
      <div onClick={() => setExpanded(e => !e)} style={{ padding:'12px 16px', cursor:'pointer' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:3 }}>
              <span style={{ fontSize:12, fontWeight:700, color:C.muted }}>#{claim.id}</span>
              <span style={{ ...sty, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{sty.label}</span>
              <span style={{ fontSize:11, color:C.muted }}>{ct.icon} {ct.label}</span>
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{claim.customer_name || '—'}</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
              {claim.order_number && <span>{claim.order_number} · </span>}
              {fmtDate(claim.claim_date)}
            </div>
          </div>
          {parseFloat(claim.charge_amount) > 0 && (
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:C.danger }}>
              {fmt(claim.charge_amount)}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:'14px 16px', background:C.cream }}>
          <div style={{ fontSize:13, color:C.navy, marginBottom:12, background:'white', borderRadius:8, padding:'10px 12px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:4 }}>Customer's description</div>
            {claim.description}
          </div>

          {/* Update form */}
          <div style={{ display:'grid', gap:10 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:6 }}>Status</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {Object.entries(STATUS_STYLE).map(([v, s]) => (
                  <button key={v} onClick={() => setForm(f => ({ ...f, status:v }))}
                    style={{ padding:'6px 14px', borderRadius:20, cursor:'pointer', fontFamily:'inherit',
                             fontSize:12, fontWeight:600,
                             border:`2px solid ${form.status===v ? C.navy : C.border}`,
                             background: form.status===v ? C.navy : 'white',
                             color: form.status===v ? 'white' : C.muted }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:6 }}>Resolution</div>
              <select value={form.resolution_type} onChange={e => setForm(f => ({ ...f, resolution_type:e.target.value }))} style={SEL}>
                <option value=''>— Select resolution —</option>
                {RESOLUTION_TYPES.map(r => <option key={r.v} value={r.v}>{r.icon} {r.label}</option>)}
              </select>
            </div>

            {form.resolution_type === 'partial_charge' && (
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:6 }}>Charge Amount (Rs.)</div>
                <input type='number' value={form.charge_amount} onChange={e => setForm(f => ({ ...f, charge_amount: parseFloat(e.target.value)||0 }))} style={INP}/>
              </div>
            )}

            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:6 }}>Resolution notes</div>
              <textarea value={form.resolution_notes} onChange={e => setForm(f => ({ ...f, resolution_notes:e.target.value }))}
                placeholder='What was done / why rejected...'
                style={{ ...INP, resize:'vertical', minHeight:64, lineHeight:1.5 }}/>
            </div>

            <button onClick={save} disabled={saving}
              style={{ padding:'11px', background: saving ? C.muted : C.success, color:'white',
                       border:'none', borderRadius:9, fontSize:14, fontWeight:700,
                       cursor: saving ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
              {saving ? 'Saving...' : '✓ Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function WarrantyClaims() {
  const navigate = useNavigate();
  const [tab,       setTab]       = useState('check');
  const [search,    setSearch]    = useState('');
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [claims,    setClaims]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Log claim form
  const [logForm, setLogForm] = useState({
    order_id:'', customer_name:'', customer_phone:'',
    claim_type:'', description:'', resolution_type:'',
    resolution_notes:'', charge_amount:0, status:'open',
  });
  const [saving, setSaving] = useState(false);

  // Pre-fill claim form from Check tab
  const prefillClaim = (order) => {
    setLogForm(f => ({
      ...f,
      order_id:       order.id,
      customer_name:  order.customer_name || '',
      customer_phone: order.phone || '',
    }));
    setTab('log');
    window.scrollTo(0, 0);
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const phone    = search.replace(/\D/g,'').length >= 7;
      const queryStr = phone ? `phone=${encodeURIComponent(search)}` : `order_id=${encodeURIComponent(search)}`;
      const data     = await api(`/warranties/check?${queryStr}`);
      setResults(Array.isArray(data) ? data : [data].filter(Boolean));
    } catch(e) { setResults([]); }
    finally { setSearching(false); }
  };

  const loadClaims = useCallback(async () => {
    setLoading(true);
    try {
      const qs   = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const data = await api(`/warranties${qs}`);
      setClaims(Array.isArray(data) ? data : []);
    } catch(e) { setClaims([]); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { if (tab === 'all') loadClaims(); }, [tab, loadClaims]);

  const submitClaim = async () => {
    if (!logForm.claim_type) return alert('Please select what type of defect this is');
    if (!logForm.description.trim()) return alert('Please describe the issue');
    setSaving(true);
    try {
      await api('/warranties', { method:'POST', body: JSON.stringify(logForm) });
      alert('Claim logged successfully');
      setLogForm({ order_id:'', customer_name:'', customer_phone:'', claim_type:'', description:'', resolution_type:'', resolution_notes:'', charge_amount:0, status:'open' });
      setTab('all');
    } catch(e) { alert('Failed to save claim'); }
    finally { setSaving(false); }
  };

  const TABS = [
    { key:'check', label:'🔍 Check Warranty' },
    { key:'log',   label:'📝 Log Claim' },
    { key:'all',   label:'📋 All Claims' },
  ];

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:700, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <button onClick={() => navigate('/dashboard')}
          style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:13, fontFamily:'inherit', padding:'0 0 8px', display:'block' }}>
          ← Dashboard
        </button>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:'0 0 4px' }}>
          🛡️ Warranty Management
        </h1>
        <p style={{ color:C.muted, fontSize:14, margin:0 }}>Check warranty status, log claims and track resolutions</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'white', borderRadius:12, padding:4, border:`1px solid ${C.border}`, marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex:1, padding:'10px 8px', border:'none', borderRadius:9, cursor:'pointer',
                     fontFamily:'inherit', fontSize:13, fontWeight:600,
                     background: tab === t.key ? C.navy : 'transparent',
                     color: tab === t.key ? 'white' : C.muted }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CHECK WARRANTY TAB ─────────────────────────── */}
      {tab === 'check' && (
        <div>
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'16px', marginBottom:16 }}>
            <div style={{ fontSize:13, color:C.muted, marginBottom:10 }}>
              Enter customer's phone number OR order number (e.g. KO-2506-001)
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder='Phone: 0771234567  or  Order: KO-2506-001'
                style={{ ...INP, flex:1 }}
              />
              <button onClick={handleSearch} disabled={searching}
                style={{ padding:'10px 20px', background:C.navy, color:'white', border:'none',
                         borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                {searching ? '...' : 'Check'}
              </button>
            </div>
          </div>

          {results.length > 0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:10 }}>
                {results.length} order{results.length > 1 ? 's' : ''} found
              </div>
              {results.map(o => (
                <OrderWarrantyCard key={o.id} order={o} onLogClaim={prefillClaim} />
              ))}
            </div>
          )}

          {search && results.length === 0 && !searching && (
            <div style={{ textAlign:'center', padding:40, color:C.muted }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
              <div style={{ fontSize:14, fontWeight:600 }}>No orders found</div>
              <div style={{ fontSize:13, marginTop:4 }}>Try a different phone number or order number</div>
            </div>
          )}
        </div>
      )}

      {/* ── LOG CLAIM TAB ─────────────────────────────── */}
      {tab === 'log' && (
        <div style={{ display:'grid', gap:14 }}>
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'16px' }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:12 }}>Customer details</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:6 }}>Customer name</div>
                <input value={logForm.customer_name} onChange={e => setLogForm(f => ({ ...f, customer_name:e.target.value }))}
                  placeholder='e.g. Nuwan Perera' style={INP}/>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:6 }}>Phone number</div>
                <input value={logForm.customer_phone} onChange={e => setLogForm(f => ({ ...f, customer_phone:e.target.value }))}
                  placeholder='077-123-4567' type='tel' style={INP}/>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:6 }}>Order number (optional)</div>
                <input value={logForm.order_id} onChange={e => setLogForm(f => ({ ...f, order_id:e.target.value }))}
                  placeholder='e.g. 123 (order ID) — or leave blank' style={INP}/>
              </div>
            </div>
          </div>

          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'16px' }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:12 }}>What's the issue?</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:8, marginBottom:14 }}>
              {CLAIM_TYPES.map(ct => (
                <button key={ct.v} onClick={() => setLogForm(f => ({ ...f, claim_type:ct.v }))}
                  style={{ padding:'12px 10px', borderRadius:10, cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                           border:`2px solid ${logForm.claim_type === ct.v ? C.navy : C.border}`,
                           background: logForm.claim_type === ct.v ? C.navy : 'white',
                           color: logForm.claim_type === ct.v ? 'white' : C.navy }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>{ct.icon}</div>
                  <div style={{ fontSize:12, fontWeight:700, lineHeight:1.3 }}>{ct.label}</div>
                  <div style={{ fontSize:10, opacity:.7, marginTop:2 }}>{ct.desc}</div>
                </button>
              ))}
            </div>

            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:6 }}>Customer's description</div>
            <textarea value={logForm.description} onChange={e => setLogForm(f => ({ ...f, description:e.target.value }))}
              placeholder='Describe the defect — what the customer said, how long they had it, what happened...'
              style={{ ...INP, resize:'vertical', minHeight:80, lineHeight:1.5 }}/>
          </div>

          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'16px' }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:12 }}>Resolution (if decided now)</div>
            <div style={{ display:'grid', gap:10 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:6 }}>How was it resolved?</div>
                <select value={logForm.resolution_type} onChange={e => setLogForm(f => ({ ...f, resolution_type:e.target.value }))} style={SEL}>
                  <option value=''>— Decide later —</option>
                  {RESOLUTION_TYPES.map(r => <option key={r.v} value={r.v}>{r.icon} {r.label}</option>)}
                </select>
              </div>
              {logForm.resolution_type === 'partial_charge' && (
                <div>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:6 }}>Charge amount (Rs.)</div>
                  <input type='number' value={logForm.charge_amount}
                    onChange={e => setLogForm(f => ({ ...f, charge_amount:parseFloat(e.target.value)||0 }))} style={INP}/>
                </div>
              )}
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:6 }}>Notes for staff</div>
                <textarea value={logForm.resolution_notes} onChange={e => setLogForm(f => ({ ...f, resolution_notes:e.target.value }))}
                  placeholder='What was done, who was contacted, any follow-up needed...'
                  style={{ ...INP, resize:'vertical', minHeight:64, lineHeight:1.5 }}/>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:6 }}>Status</div>
                <div style={{ display:'flex', gap:8 }}>
                  {[{v:'open',label:'Open (decide later)'},{v:'in_progress',label:'In progress'},{v:'resolved',label:'Resolved now'}].map(s => (
                    <button key={s.v} onClick={() => setLogForm(f => ({ ...f, status:s.v }))}
                      style={{ flex:1, padding:'9px 6px', borderRadius:8, cursor:'pointer', fontFamily:'inherit',
                               fontSize:12, fontWeight:600,
                               border:`2px solid ${logForm.status===s.v ? C.navy : C.border}`,
                               background: logForm.status===s.v ? C.navy : 'white',
                               color: logForm.status===s.v ? 'white' : C.muted }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button onClick={submitClaim} disabled={saving}
            style={{ width:'100%', padding:'14px', background: saving ? C.muted : C.navy, color:'white',
                     border:'none', borderRadius:10, fontSize:15, fontWeight:700,
                     cursor: saving ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
            {saving ? 'Saving...' : '🛡️ Save Warranty Claim'}
          </button>
        </div>
      )}

      {/* ── ALL CLAIMS TAB ─────────────────────────────── */}
      {tab === 'all' && (
        <div>
          {/* Filter bar */}
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
            {[{v:'all',label:'All'},{v:'open',label:'Open'},{v:'in_progress',label:'In progress'},{v:'resolved',label:'Resolved'},{v:'rejected',label:'Rejected'}].map(s => (
              <button key={s.v} onClick={() => setStatusFilter(s.v)}
                style={{ padding:'6px 14px', borderRadius:20, cursor:'pointer', fontFamily:'inherit',
                         fontSize:12, fontWeight:600,
                         border:`1.5px solid ${statusFilter===s.v ? C.navy : C.border}`,
                         background: statusFilter===s.v ? C.navy : 'white',
                         color: statusFilter===s.v ? 'white' : C.muted }}>
                {s.label}
              </button>
            ))}
          </div>

          {loading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>Loading...</div>}

          {!loading && claims.length === 0 && (
            <div style={{ textAlign:'center', padding:60, color:C.muted }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🛡️</div>
              <div style={{ fontSize:15, fontWeight:600, color:C.navy }}>No claims yet</div>
              <div style={{ fontSize:13, marginTop:4 }}>Warranty claims will appear here when logged</div>
            </div>
          )}

          {!loading && claims.map(c => (
            <ClaimCard key={c.id} claim={c} onUpdate={loadClaims} />
          ))}
        </div>
      )}
    </div>
  );
}