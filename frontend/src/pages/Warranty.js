/* eslint-disable */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'var(--bg-sunken,#f8f5ef)',
  surface:'var(--bg-surface,#fff)', border:'var(--border,#e0ddd6)',
  muted:'var(--text-muted,#6b7280)', success:'#15803d', danger:'#dc2626',
  warning:'#b45309',
};
const fmt = n => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK', { minimumFractionDigits:0 });
const fmtDate = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';

function addMonths(dateStr, months) {
  if (!dateStr || !months) return null;
  const d = new Date(dateStr+'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}
function monthsToNum(str) {
  if (!str) return 0;
  if (str.includes('year'))  return parseInt(str) * 12;
  if (str.includes('month')) return parseInt(str);
  return 0;
}
function warrantyStatus(createdAt, warrantyStr) {
  const months = monthsToNum(warrantyStr);
  if (!months || !createdAt) return null;
  const expiry = addMonths(createdAt.slice(0,10), months);
  const today  = new Date().toISOString().split('T')[0];
  const daysLeft = Math.round((new Date(expiry) - new Date(today)) / 86400000);
  return { expiry, daysLeft, expired: daysLeft < 0 };
}

function apiGet(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { headers:{ Authorization:`Bearer ${token}` } }).then(r => r.json());
}

export default function Warranty() {
  const navigate = useNavigate();
  const [orders,   setOrders]  = useState([]);
  const [loading,  setLoading] = useState(true);
  const [search,   setSearch]  = useState('');
  const [filter,   setFilter]  = useState('active'); // all | active | expired | expiring

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all orders that have warranty set
      const res = await apiGet('/orders?limit=500');
      const all = Array.isArray(res) ? res : (res.data || res.orders || []);
      const withWarranty = all.filter(o => o.warranty_frame || o.warranty_lens);
      setOrders(withWarranty);
    } catch(e) { setOrders([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Compute expiry info for each order
  const enriched = orders.map(o => {
    const frame = warrantyStatus(o.created_at, o.warranty_frame);
    const lens  = warrantyStatus(o.created_at, o.warranty_lens);
    const minDays = Math.min(frame?.daysLeft ?? Infinity, lens?.daysLeft ?? Infinity);
    const expired = (frame?.expired ?? false) && (lens?.expired ?? true) ||
                    (!frame && lens?.expired) || (frame?.expired && !lens);
    const expiring = !expired && minDays <= 30 && minDays >= 0;
    return { ...o, _frame: frame, _lens: lens, _minDays: minDays, _expired: expired, _expiring: expiring };
  });

  // Apply filter
  const filtered = enriched.filter(o => {
    if (filter === 'active')   return !o._expired;
    if (filter === 'expired')  return o._expired;
    if (filter === 'expiring') return o._expiring;
    return true;
  }).filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (o.order_number||'').toLowerCase().includes(s)
      || (o.customer_name||'').toLowerCase().includes(s)
      || (o.phone||'').toLowerCase().includes(s);
  });

  // Stats
  const stats = {
    total:    enriched.length,
    active:   enriched.filter(o => !o._expired).length,
    expiring: enriched.filter(o => o._expiring).length,
    expired:  enriched.filter(o => o._expired).length,
  };

  const INP = { padding:'10px 14px', border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:14,
    fontFamily:'inherit', outline:'none', background:C.surface, color:C.navy, width:'100%' };

  return (
    <div style={{ fontFamily:"'Inter','DM Sans',sans-serif", maxWidth:1100, width:'100%' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:C.navy, margin:0 }}>🛡️ Warranty Claims</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Track active warranties for frames and lenses</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { l:'Total Warranties', v:stats.total,    col:C.navy,    bg:'white',   icon:'🛡️' },
          { l:'Active',           v:stats.active,   col:C.success, bg:'#f0fdf4', icon:'✅' },
          { l:'Expiring Soon',    v:stats.expiring, col:C.warning, bg:'#fffbeb', icon:'⚠️' },
          { l:'Expired',          v:stats.expired,  col:C.danger,  bg:'#fef2f2', icon:'❌' },
        ].map(s => (
          <div key={s.l} onClick={() => setFilter(s.l==='Total Warranties'?'all':s.l.toLowerCase().split(' ')[0])}
            style={{ background:s.bg, border:`1.5px solid ${s.col}22`, borderRadius:12, padding:'16px',
              cursor:'pointer', transition:'all .12s',
              boxShadow: filter === (s.l==='Total Warranties'?'all':s.l.toLowerCase().split(' ')[0])
                ? `0 0 0 2px ${s.col}` : 'none' }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:s.col }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search customer name, phone, order #..."
          style={{ ...INP, maxWidth:380 }}/>
        <div style={{ display:'flex', gap:6 }}>
          {[
            {v:'all',      l:'All'},
            {v:'active',   l:'✅ Active'},
            {v:'expiring', l:'⚠️ Expiring'},
            {v:'expired',  l:'❌ Expired'},
          ].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)}
              style={{ padding:'9px 16px', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer',
                fontFamily:'inherit', border:'none',
                background: filter===f.v ? C.navy : C.cream,
                color: filter===f.v ? 'white' : C.muted }}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:C.muted }}>Loading warranties...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:40, textAlign:'center', color:C.muted }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🛡️</div>
          <div style={{ fontSize:16, fontWeight:600, color:C.navy, marginBottom:6 }}>
            {orders.length === 0 ? 'No warranty records yet' : 'No orders match this filter'}
          </div>
          <div style={{ fontSize:13 }}>
            {orders.length === 0
              ? 'Warranties are set when creating new orders. Set warranty period in Step 4 of New Order.'
              : 'Try changing the filter above.'}
          </div>
        </div>
      ) : (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
          {/* Table header */}
          <div style={{ display:'grid', gridTemplateColumns:'140px 1fr 140px 160px 160px 120px', gap:0,
            background:C.navy, color:'white', padding:'12px 16px', fontSize:11, fontWeight:700,
            textTransform:'uppercase', letterSpacing:'.8px' }}>
            <div>Order</div>
            <div>Customer</div>
            <div>Order Date</div>
            <div>🖼️ Frame</div>
            <div>👁️ Lens</div>
            <div>Status</div>
          </div>

          {filtered.map((o, i) => {
            const fStatus = o._frame;
            const lStatus = o._lens;
            const rowStatus = o._expired ? 'expired' : o._expiring ? 'expiring' : 'active';
            const rowBg = i%2===0 ? 'white' : '#fafafa';

            return (
              <div key={o.id}
                onClick={() => navigate('/orders?search='+o.order_number)}
                style={{ display:'grid', gridTemplateColumns:'140px 1fr 140px 160px 160px 120px',
                  padding:'14px 16px', borderBottom:`1px solid ${C.border}`,
                  background:rowBg, cursor:'pointer', transition:'background .12s', alignItems:'center' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                onMouseLeave={e => e.currentTarget.style.background = rowBg}>

                {/* Order # */}
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{o.order_number}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{o.frame?.slice(0,18)||'—'}</div>
                </div>

                {/* Customer */}
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{o.customer_name||'—'}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{o.phone||''}</div>
                </div>

                {/* Order date */}
                <div style={{ fontSize:12, color:C.muted }}>{fmtDate(o.created_at?.slice(0,10))}</div>

                {/* Frame warranty */}
                <div>
                  {o.warranty_frame ? (
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:C.navy }}>🛡️ {o.warranty_frame}</div>
                      {fStatus && (
                        <div style={{ fontSize:11, color: fStatus.expired ? C.danger : fStatus.daysLeft <= 30 ? C.warning : C.success }}>
                          {fStatus.expired
                            ? `Expired ${Math.abs(fStatus.daysLeft)}d ago`
                            : fStatus.daysLeft === 0 ? 'Expires today!'
                            : `${fStatus.daysLeft}d left · ${fmtDate(fStatus.expiry)}`}
                        </div>
                      )}
                    </div>
                  ) : <span style={{ fontSize:11, color:C.border }}>—</span>}
                </div>

                {/* Lens warranty */}
                <div>
                  {o.warranty_lens ? (
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:C.navy }}>🛡️ {o.warranty_lens}</div>
                      {lStatus && (
                        <div style={{ fontSize:11, color: lStatus.expired ? C.danger : lStatus.daysLeft <= 30 ? C.warning : C.success }}>
                          {lStatus.expired
                            ? `Expired ${Math.abs(lStatus.daysLeft)}d ago`
                            : lStatus.daysLeft === 0 ? 'Expires today!'
                            : `${lStatus.daysLeft}d left · ${fmtDate(lStatus.expiry)}`}
                        </div>
                      )}
                    </div>
                  ) : <span style={{ fontSize:11, color:C.border }}>—</span>}
                </div>

                {/* Status badge */}
                <div>
                  <span style={{
                    padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                    background: rowStatus==='active' ? '#dcfce7' : rowStatus==='expiring' ? '#fef9c3' : '#fee2e2',
                    color:       rowStatus==='active' ? C.success  : rowStatus==='expiring' ? C.warning  : C.danger,
                  }}>
                    {rowStatus==='active' ? '✅ Active' : rowStatus==='expiring' ? '⚠️ Expiring' : '❌ Expired'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ fontSize:12, color:C.muted, marginTop:10, textAlign:'right' }}>
          Showing {filtered.length} of {orders.length} warranty orders
        </div>
      )}
    </div>
  );
}