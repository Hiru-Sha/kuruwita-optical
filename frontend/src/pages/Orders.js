// ============================================================
//  Orders.js — Order list + detail panel + print
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders, getOrder, updateOrder, deleteOrder, addCallLog } from '../api';
import PrintReceipt from '../components/PrintReceipt';

const STATUSES = ['all', 'created', 'called', 'delivered', 'overdue'];

const STATUS_STYLE = {
  created:   { bg: '#dbeafe', color: '#1e40af' },
  called:    { bg: '#fef9c3', color: '#854d0e' },
  delivered: { bg: '#dcfce7', color: '#2d7a4f' },
  overdue:   { bg: '#fee2e2', color: '#c0392b' },
};

const Badge = ({ status }) => {
  const s = STATUS_STYLE[status] || { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700,
      padding: '2px 9px', borderRadius: 20,
      textTransform: 'capitalize',
    }}>{status}</span>
  );
};

export default function Orders() {
  const [orders,    setOrders]    = useState([]);
  const [filter,    setFilter]    = useState('all');
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);   // full order detail
  const [logNote,   setLogNote]   = useState('');
  const [showPrint, setShowPrint] = useState(false);  // print modal
  const navigate = useNavigate();

  // ── Load orders list ────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    getOrders({
      status: filter !== 'all' ? filter : undefined,
      search: search || undefined,
    })
      .then(r => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  // ── Open order detail (fetches full record with refraction + logs) ──
  const openOrder = async (id) => {
    try {
      const r = await getOrder(id);
      setSelected(r.data);
    } catch {
      // fallback — use list data
      setSelected(orders.find(o => o.id === id) || null);
    }
  };

  // ── Status update ────────────────────────────────────────────
  const handleStatus = async (id, status) => {
    await updateOrder(id, { status });
    load();
    setSelected(s => s ? { ...s, status } : s);
  };

  // ── Lens step update ─────────────────────────────────────────
  const handleLensStep = async (id, lens_step) => {
    await updateOrder(id, { lens_step });
    load();
    setSelected(s => s ? { ...s, lens_step } : s);
  };

  // ── Call log ────────────────────────────────────────────────
  const handleAddLog = async () => {
    if (!logNote.trim() || !selected) return;
    await addCallLog(selected.id, logNote);
    setLogNote('');
    // Refresh selected order to show new log
    const r = await getOrder(selected.id);
    setSelected(r.data);
  };

  // ── Delete ──────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete order ${selected.order_number}? This cannot be undone.`)) return;
    await deleteOrder(selected.id);
    setSelected(null);
    load();
  };

  // ── Rx returned ─────────────────────────────────────────────
  const handleRxReturned = async () => {
    if (!selected) return;
    await updateOrder(selected.id, { rx_returned: true });
    setSelected(s => s ? { ...s, rx_returned: true } : s);
    load();
  };

  // ── Styles ──────────────────────────────────────────────────
  const navy  = '#0f1f3d';
  const gold  = '#c9a84c';
  const cream = '#f8f5ef';
  const border= '#e0ddd6';
  const muted = '#6b7280';

  const inp = {
    padding: '9px 14px', border: `1.5px solid ${border}`,
    borderRadius: 9, fontSize: 13, fontFamily: 'inherit',
    outline: 'none', background: 'white', color: '#1a1a2e',
  };

  const filterBtn = (f) => ({
    padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit',
    background:  filter === f ? navy   : 'white',
    color:       filter === f ? 'white' : muted,
    borderColor: filter === f ? navy   : border,
  });

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: navy, margin: 0 }}>📋 Orders</h1>
        <button onClick={() => navigate('/orders/new')}
          style={{ padding: '9px 20px', background: gold, color: navy, border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          + New Order
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search name, phone, order #..."
          style={{ ...inp, flex: 1, minWidth: 180 }}
        />
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={filterBtn(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Order list ── */}
      {loading
        ? <p style={{ color: muted, fontSize: 13, padding: '20px 0' }}>Loading orders...</p>
        : !orders.length
          ? <p style={{ color: muted, fontSize: 13, padding: '20px 0' }}>No orders found</p>
          : orders.map(o => (
            <div key={o.id}
              onClick={() => openOrder(o.id)}
              style={{
                background: 'white',
                border: `1.5px solid ${selected?.id === o.id ? gold : o.status === 'overdue' ? '#fca5a5' : border}`,
                borderLeft: o.status === 'overdue' ? '4px solid #c0392b' : undefined,
                borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                cursor: 'pointer', transition: 'border-color .15s',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: muted }}>{o.order_number}</span>
                  <Badge status={o.status} />
                  {o.has_rx && !o.rx_returned && (
                    <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>📄 Rx</span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: muted }}>Deliver: {o.deliver_date?.slice(0, 10)}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: navy, marginBottom: 4 }}>{o.customer_name}</div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: muted }}>📞 {o.phone}</span>
                <span style={{ fontSize: 12, color: muted }}>🕶️ {o.frame || '—'}</span>
                <span style={{ fontSize: 12, color: muted }}>🔬 {o.lens_company}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: parseFloat(o.balance_amount) > 0 ? '#c0392b' : '#2d7a4f' }}>
                  Balance: Rs. {parseFloat(o.balance_amount || 0).toLocaleString()}
                </span>
              </div>
            </div>
          ))
      }

      {/* ── Detail side panel ── */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,31,61,.45)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div style={{ background: 'white', width: '100%', maxWidth: 480, height: '100vh', overflowY: 'auto', padding: 24, boxShadow: '-8px 0 40px rgba(0,0,0,.18)' }}>

            {/* Panel header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: muted, fontWeight: 700, marginBottom: 2 }}>{selected.order_number}</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: navy }}>{selected.customer_name}</div>
                <div style={{ fontSize: 13, color: muted }}>📞 {selected.phone} · Age {selected.age}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: cream, border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: muted, fontWeight: 600 }}>
                ✕ Close
              </button>
            </div>

            {/* ── Status buttons ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: muted, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${cream}` }}>
                Order Status
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['created', 'called', 'delivered'].map(s => {
                  const st = STATUS_STYLE[s];
                  return (
                    <button key={s} onClick={() => handleStatus(selected.id, s)}
                      style={{
                        flex: 1, padding: '9px 8px', borderRadius: 9, fontSize: 12,
                        fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        border: `2px solid ${selected.status === s ? '#0f1f3d' : border}`,
                        background: selected.status === s ? st.bg : 'white',
                        color: st.color,
                        outline: selected.status === s ? `3px solid ${navy}` : 'none',
                        outlineOffset: 2,
                      }}>
                      {s === 'created' ? '📝 Created' : s === 'called' ? '📞 Called' : '✅ Delivered'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Lens job steps ── */}
            {selected.lens_company !== 'In-Shop' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: muted, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${cream}` }}>
                  Lens Job — {selected.lens_company}
                </div>
                <div style={{ background: cream, borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', gap: 0 }}>
                    {['📤 Sent', '⚙️ Grinding', '📦 Ready', '✅ Received'].map((label, i) => (
                      <div key={i} onClick={() => handleLensStep(selected.id, i)}
                        style={{
                          flex: 1, textAlign: 'center', padding: '8px 4px',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          color: i < selected.lens_step ? '#2d7a4f' : i === selected.lens_step ? navy : '#9ca3af',
                          borderBottom: `3px solid ${i < selected.lens_step ? '#2d7a4f' : i === selected.lens_step ? gold : border}`,
                        }}>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Order details ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: muted, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${cream}` }}>
                Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { l: 'Frame',       v: selected.frame       },
                  { l: 'Lens',        v: selected.lens_type   },
                  { l: 'Total',       v: `Rs. ${parseFloat(selected.total_amount || 0).toLocaleString()}`   },
                  { l: 'Advance',     v: `Rs. ${parseFloat(selected.advance_amount || 0).toLocaleString()}` },
                  { l: 'Balance due', v: `Rs. ${parseFloat(selected.balance_amount || 0).toLocaleString()}`, danger: parseFloat(selected.balance_amount) > 0 },
                  { l: 'Deliver',     v: selected.deliver_date?.slice(0, 10) },
                ].map(item => (
                  <div key={item.l} style={{ background: cream, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: muted, marginBottom: 3 }}>{item.l}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: item.danger ? '#c0392b' : navy }}>{item.v || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Prescription ── */}
            {selected.has_rx && (
              <div style={{ marginBottom: 20, background: '#e0f2fe', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, color: '#0369a1', fontWeight: 700, marginBottom: 4 }}>
                  📄 Prescription from {selected.rx_hospital || 'hospital'}
                </div>
                {selected.rx_returned
                  ? <span style={{ fontSize: 11, color: '#2d7a4f' }}>✅ Returned to customer</span>
                  : <button onClick={handleRxReturned}
                      style={{ background: '#0369a1', color: 'white', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Mark as Returned
                    </button>
                }
              </div>
            )}

            {/* ── Refraction summary ── */}
            {selected.refraction && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: muted, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${cream}` }}>
                  Refraction
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['Eye', 'SPH', 'CYL', 'AXIS', 'ADD', 'VA'].map(h => (
                          <th key={h} style={{ background: cream, padding: '6px 8px', textAlign: 'center', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: muted, border: `1px solid ${border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Right', selected.refraction.r_sph, selected.refraction.r_cyl, selected.refraction.r_axis, selected.refraction.r_add, selected.refraction.r_va],
                        ['Left',  selected.refraction.l_sph, selected.refraction.l_cyl, selected.refraction.l_axis, selected.refraction.l_add, selected.refraction.l_va],
                      ].map(row => (
                        <tr key={row[0]}>
                          {row.map((v, i) => (
                            <td key={i} style={{ padding: '6px 8px', textAlign: 'center', border: `1px solid ${border}`, fontWeight: i === 0 ? 700 : 400, color: navy, background: i === 0 ? cream : 'white' }}>{v || '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Call log ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: muted, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${cream}` }}>
                Call Log
              </div>
              <div style={{ marginBottom: 8 }}>
                {selected.call_logs?.length
                  ? selected.call_logs.map((l, i) => (
                    <div key={i} style={{ fontSize: 12, color: navy, padding: '5px 0', borderBottom: `1px solid ${cream}` }}>
                      📞 {l.note}
                      <span style={{ color: '#9ca3af', marginLeft: 8 }}>
                        · {new Date(l.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))
                  : <div style={{ fontSize: 12, color: '#9ca3af' }}>No calls logged yet</div>
                }
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={logNote} onChange={e => setLogNote(e.target.value)}
                  placeholder="Add call note..."
                  style={{ flex: 1, padding: '8px 12px', border: `1.5px solid ${border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: cream }}
                  onKeyDown={e => e.key === 'Enter' && handleAddLog()}
                />
                <button onClick={handleAddLog}
                  style={{ padding: '8px 14px', background: navy, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Add
                </button>
              </div>
            </div>

            {/* ── Action buttons ── */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${border}` }}>
              {/* 🖨️ PRINT BUTTON */}
              <button onClick={() => setShowPrint(true)}
                style={{ padding: '10px 16px', background: gold, color: navy, border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                🖨️ Print / Receipt
              </button>

              <a href={`https://wa.me/94${selected.phone?.replace(/^0/, '')}?text=${encodeURIComponent(`Hello ${selected.customer_name}, your order ${selected.order_number} is ready. Balance: Rs. ${selected.balance_amount}. Please visit Kuruwita Optical. Thank you!`)}`}
                target="_blank" rel="noreferrer"
                style={{ padding: '10px 16px', background: '#25D366', color: 'white', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                💬 WhatsApp
              </a>

              <button onClick={handleDelete}
                style={{ padding: '10px 16px', background: '#fee2e2', color: '#c0392b', border: '1.5px solid #fca5a5', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print modal ── */}
      {showPrint && selected && (
        <PrintReceipt
          order={selected}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}
