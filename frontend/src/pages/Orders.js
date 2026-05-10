// ============================================================
//  Orders.js — Added: Record Payment modal for balance updates
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders, getOrder, updateOrder, deleteOrder, addCallLog } from '../api';
import PrintReceipt from '../components/PrintReceipt';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};

const fmtMoney = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});

const STATUSES = ['all','created','called','delivered','overdue'];
const STATUS_STYLE = {
  created:   { bg:'#dbeafe', color:'#1e40af' },
  called:    { bg:'#fef9c3', color:'#854d0e' },
  delivered: { bg:'#dcfce7', color:C.success  },
  overdue:   { bg:'#fee2e2', color:C.danger   },
};

const Badge = ({ status }) => {
  const s = STATUS_STYLE[status] || { bg:'#f3f4f6', color:C.muted };
  return <span style={{ background:s.bg, color:s.color, fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20, textTransform:'capitalize' }}>{status}</span>;
};

// ── Record Payment Modal ──────────────────────────────────────
function PaymentModal({ order, onClose, onSave }) {
  const [amount,  setAmount]  = useState('');
  const [method,  setMethod]  = useState('cash');
  const [note,    setNote]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const balance = parseFloat(order.balance_amount || 0);

  const handlePay = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0)      return setError('Enter a valid payment amount');
    if (amt > balance + 0.01)  return setError(`Cannot pay more than balance due (${fmtMoney(balance)})`);

    setSaving(true);
    try {
      const newAdvance = parseFloat(order.advance_amount || 0) + amt;
      const newBalance = Math.max(0, balance - amt);
      const newStatus  = newBalance <= 0 ? order.status : order.status; // keep status, owner decides delivered

      await updateOrder(order.id, {
        advance_amount: newAdvance,
        balance_amount: newBalance,
      });

      onSave(`Payment of ${fmtMoney(amt)} recorded. New balance: ${fmtMoney(newBalance)}`);
    } catch (e) {
      setError('Failed to record payment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.55)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:C.navy }}>💳 Record Payment</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{order.order_number} · {order.customer_name}</div>
          </div>
          <button onClick={onClose} style={{ background:C.cream, border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted, fontWeight:600 }}>✕</button>
        </div>

        {/* Current balance */}
        <div style={{ background: balance > 0 ? '#fee2e2' : '#dcfce7', borderRadius:10, padding:'12px 16px', marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, color:C.muted }}>Current balance due</span>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color: balance > 0 ? C.danger : C.success }}>
            {fmtMoney(balance)}
          </span>
        </div>

        {balance <= 0 ? (
          <div style={{ textAlign:'center', padding:'12px 0', color:C.success, fontSize:14, fontWeight:600 }}>
            ✅ This order is fully paid
          </div>
        ) : (
          <>
            {error && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'9px 14px', fontSize:13, marginBottom:14 }}>{error}</div>}

            <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted }}>Payment Amount (Rs.) *</label>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
                placeholder={`Max: Rs. ${balance.toLocaleString()}`}
                style={{ padding:'11px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', background:C.cream }}
              />
              {/* Quick fill buttons */}
              <div style={{ display:'flex', gap:6, marginTop:4 }}>
                <button onClick={()=>setAmount(String(balance))}
                  style={{ padding:'5px 12px', background:C.navy, color:'white', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  Full balance
                </button>
                {[1000,2000,5000].filter(v=>v<balance).map(v=>(
                  <button key={v} onClick={()=>setAmount(String(v))}
                    style={{ padding:'5px 12px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
                    Rs.{v.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted }}>Payment Method</label>
              <div style={{ display:'flex', gap:8 }}>
                {[['cash','💵 Cash'],['bank','🏦 Bank Transfer'],['card','💳 Card']].map(([val,label])=>(
                  <button key={val} onClick={()=>setMethod(val)}
                    style={{ flex:1, padding:'9px 6px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${method===val?C.navy:C.border}`, background:method===val?C.navy:'white', color:method===val?'white':C.muted }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted }}>Note (optional)</label>
              <input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Cash received, Rs. 3000"
                style={{ padding:'10px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream }} />
            </div>

            <button onClick={handlePay} disabled={saving}
              style={{ width:'100%', padding:'13px', background:saving?C.muted:C.success, color:'white', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {saving ? 'Saving...' : `✅ Record ${amount ? fmtMoney(parseFloat(amount)||0) : 'Payment'}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Orders component ────────────────────────────────────
export default function Orders() {
  const [orders,    setOrders]    = useState([]);
  const [filter,    setFilter]    = useState('all');
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [logNote,   setLogNote]   = useState('');
  const [showPrint, setShowPrint] = useState(false);
  const [showPay,   setShowPay]   = useState(false);
  const [toast,     setToast]     = useState('');
  const navigate = useNavigate();

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 3500); };

  const load = useCallback(() => {
    setLoading(true);
    getOrders({ status: filter !== 'all' ? filter : undefined, search: search || undefined })
      .then(r => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const openOrder = async (id) => {
    try { const r = await getOrder(id); setSelected(r.data); }
    catch { setSelected(orders.find(o=>o.id===id)||null); }
  };

  const handleStatus = async (id, status) => {
    await updateOrder(id, { status });
    load();
    setSelected(s => s ? { ...s, status } : s);
  };

  const handleLensStep = async (id, lens_step) => {
    await updateOrder(id, { lens_step });
    load();
    setSelected(s => s ? { ...s, lens_step } : s);
  };

  const handleAddLog = async () => {
    if (!logNote.trim() || !selected) return;
    await addCallLog(selected.id, logNote);
    setLogNote('');
    const r = await getOrder(selected.id);
    setSelected(r.data);
  };

  const handleDelete = async () => {
    if (!selected || !window.confirm(`Delete order ${selected.order_number}? This cannot be undone.`)) return;
    await deleteOrder(selected.id);
    setSelected(null);
    load();
  };

  const handleRxReturned = async () => {
    if (!selected) return;
    await updateOrder(selected.id, { rx_returned: true });
    setSelected(s => s ? { ...s, rx_returned: true } : s);
    load();
  };

  const handlePaymentSaved = async (msg) => {
    setShowPay(false);
    showToast(msg);
    const r = await getOrder(selected.id);
    setSelected(r.data);
    load();
  };

  const filterBtn = (f) => ({
    padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
    border:'1.5px solid', fontFamily:'inherit',
    background: filter===f ? C.navy : 'white',
    color:      filter===f ? 'white' : C.muted,
    borderColor:filter===f ? C.navy  : C.border,
  });

  const INP = { padding:'9px 14px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'white', color:'#1a1a2e' };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:C.navy, color:'white', padding:'13px 20px', borderRadius:12, fontSize:14, fontWeight:600, borderLeft:`4px solid ${C.gold}`, zIndex:500, boxShadow:'0 4px 20px rgba(0,0,0,.2)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>📋 Orders</h1>
        <button onClick={()=>navigate('/orders/new')}
          style={{ padding:'9px 20px', background:C.gold, color:C.navy, border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          + New Order
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍  Search name, phone, order #..."
          style={{ ...INP, flex:1, minWidth:180 }}
        />
        {STATUSES.map(s => (
          <button key={s} onClick={()=>setFilter(s)} style={filterBtn(s)}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      {/* Order list */}
      {loading
        ? <p style={{ color:C.muted, fontSize:13, padding:'20px 0' }}>Loading orders...</p>
        : !orders.length
          ? <p style={{ color:C.muted, fontSize:13, padding:'20px 0' }}>No orders found</p>
          : orders.map(o => (
            <div key={o.id} onClick={()=>openOrder(o.id)}
              style={{ background:'white', border:`1.5px solid ${selected?.id===o.id?C.gold:o.status==='overdue'?'#fca5a5':C.border}`, borderLeft:o.status==='overdue'?`4px solid ${C.danger}`:undefined, borderRadius:14, padding:'14px 16px', marginBottom:10, cursor:'pointer', transition:'border-color .15s' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:C.muted }}>{o.order_number}</span>
                  <Badge status={o.status} />
                  {o.has_rx && !o.rx_returned && <span style={{ background:'#e0f2fe', color:'#0369a1', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>📄 Rx</span>}
                </div>
                <span style={{ fontSize:11, color:C.muted }}>Deliver: {o.deliver_date?.slice(0,10)}</span>
              </div>
              <div style={{ fontSize:15, fontWeight:600, color:C.navy, marginBottom:4 }}>{o.customer_name}</div>
              <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                <span style={{ fontSize:12, color:C.muted }}>📞 {o.phone}</span>
                <span style={{ fontSize:12, color:C.muted }}>🕶️ {o.frame||'—'}</span>
                <span style={{ fontSize:12, color:C.muted }}>🔬 {o.lens_company||'Not assigned'}</span>
                <span style={{ fontSize:12, fontWeight:700, color:parseFloat(o.balance_amount)>0?C.danger:C.success }}>
                  Balance: {fmtMoney(o.balance_amount)}
                </span>
              </div>
            </div>
          ))
      }

      {/* Detail panel */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.45)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}
          onClick={e=>{ if(e.target===e.currentTarget) setSelected(null); }}>
          <div style={{ background:'white', width:'100%', maxWidth:480, height:'100vh', overflowY:'auto', padding:24, boxShadow:'-8px 0 40px rgba(0,0,0,.18)' }}>

            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:12, color:C.muted, fontWeight:700, marginBottom:2 }}>{selected.order_number}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.navy }}>{selected.customer_name}</div>
                <div style={{ fontSize:13, color:C.muted }}>📞 {selected.phone} · Age {selected.age}</div>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:C.cream, border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted, fontWeight:600 }}>✕ Close</button>
            </div>

            {/* Status */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>Order Status</div>
              <div style={{ display:'flex', gap:8 }}>
                {['created','called','delivered'].map(s => {
                  const st = STATUS_STYLE[s];
                  return (
                    <button key={s} onClick={()=>handleStatus(selected.id,s)}
                      style={{ flex:1, padding:'9px 8px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`2px solid ${selected.status===s?C.navy:C.border}`, background:selected.status===s?st.bg:'white', color:st.color, outline:selected.status===s?`3px solid ${C.navy}`:'none', outlineOffset:2 }}>
                      {s==='created'?'📝 Created':s==='called'?'📞 Called':'✅ Delivered'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lens job steps */}
            {selected.lens_company && selected.lens_company !== 'In-Shop' && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>
                  Lens Job — {selected.lens_company}
                </div>
                <div style={{ background:C.cream, borderRadius:10, padding:14 }}>
                  <div style={{ display:'flex', gap:0 }}>
                    {['📤 Sent','⚙️ Grinding','📦 Ready','✅ Received'].map((label,i)=>(
                      <div key={i} onClick={()=>handleLensStep(selected.id,i)}
                        style={{ flex:1, textAlign:'center', padding:'8px 4px', fontSize:11, fontWeight:600, cursor:'pointer', color:i<(selected.lens_step||0)?C.success:i===(selected.lens_step||0)?C.navy:'#9ca3af', borderBottom:`3px solid ${i<(selected.lens_step||0)?C.success:i===(selected.lens_step||0)?C.gold:C.border}` }}>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Payment section with Record Payment button ── */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>Payment</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                {[
                  { l:'Frame price',   v: fmtMoney(selected.frame_sell_price || selected.total_amount) },
                  { l:'Lens price',    v: fmtMoney(selected.lens_sell_price  || 0) },
                  { l:'Total',         v: fmtMoney(selected.total_amount),  bold:true },
                  { l:'Advance paid',  v: fmtMoney(selected.advance_amount) },
                ].map(item=>(
                  <div key={item.l} style={{ background:C.cream, borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:3 }}>{item.l}</div>
                    <div style={{ fontSize:13, fontWeight:item.bold?700:600, color:C.navy }}>{item.v}</div>
                  </div>
                ))}
              </div>
              {/* Balance + pay button */}
              <div style={{ background:parseFloat(selected.balance_amount)>0?'#fee2e2':'#dcfce7', borderRadius:10, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:parseFloat(selected.balance_amount)>0?C.danger:C.success, marginBottom:3 }}>Balance Due</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:parseFloat(selected.balance_amount)>0?C.danger:C.success }}>
                    {fmtMoney(selected.balance_amount)}
                  </div>
                </div>
                {parseFloat(selected.balance_amount) > 0 && (
                  <button onClick={()=>setShowPay(true)}
                    style={{ padding:'10px 18px', background:C.success, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    💳 Record Payment
                  </button>
                )}
                {parseFloat(selected.balance_amount) <= 0 && (
                  <span style={{ fontSize:13, fontWeight:700, color:C.success }}>✅ Fully paid</span>
                )}
              </div>
            </div>

            {/* Order details */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>Details</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  { l:'Frame',     v:selected.frame    },
                  { l:'Lens',      v:selected.lens_type },
                  { l:'Coating',   v:selected.lens_coating },
                  { l:'Deliver',   v:selected.deliver_date?.slice(0,10) },
                ].map(item=>(
                  <div key={item.l} style={{ background:C.cream, borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:3 }}>{item.l}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{item.v||'—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prescription */}
            {selected.has_rx && (
              <div style={{ marginBottom:20, background:'#e0f2fe', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:12, color:'#0369a1', fontWeight:700, marginBottom:4 }}>📄 Prescription from {selected.rx_hospital||'hospital'}</div>
                {selected.rx_returned
                  ? <span style={{ fontSize:11, color:C.success }}>✅ Returned to customer</span>
                  : <button onClick={handleRxReturned} style={{ background:'#0369a1', color:'white', border:'none', borderRadius:7, padding:'5px 12px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Mark as Returned</button>
                }
              </div>
            )}

            {/* Refraction */}
            {selected.refraction && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>Refraction</div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead><tr>{['Eye','SPH','CYL','AXIS','ADD','VA'].map(h=><th key={h} style={{ background:C.cream, padding:'6px 8px', textAlign:'center', fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, border:`1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {[['Right',selected.refraction.r_sph,selected.refraction.r_cyl,selected.refraction.r_axis,selected.refraction.r_add,selected.refraction.r_va],
                        ['Left', selected.refraction.l_sph,selected.refraction.l_cyl,selected.refraction.l_axis,selected.refraction.l_add,selected.refraction.l_va]].map(row=>(
                        <tr key={row[0]}>
                          {row.map((v,i)=><td key={i} style={{ padding:'6px 8px', textAlign:'center', border:`1px solid ${C.border}`, fontWeight:i===0?700:400, color:C.navy, background:i===0?C.cream:'white' }}>{v||'—'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Call log */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>Call Log</div>
              <div style={{ marginBottom:8 }}>
                {selected.call_logs?.length
                  ? selected.call_logs.map((l,i)=>(
                    <div key={i} style={{ fontSize:12, color:C.navy, padding:'5px 0', borderBottom:`1px solid ${C.cream}` }}>
                      📞 {l.note} <span style={{ color:'#9ca3af', marginLeft:8 }}>· {new Date(l.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>
                    </div>
                  ))
                  : <div style={{ fontSize:12, color:'#9ca3af' }}>No calls logged yet</div>
                }
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={logNote} onChange={e=>setLogNote(e.target.value)} placeholder="Add call note..."
                  style={{ flex:1, padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream }}
                  onKeyDown={e=>e.key==='Enter'&&handleAddLog()}
                />
                <button onClick={handleAddLog} style={{ padding:'8px 14px', background:C.navy, color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Add</button>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:16, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
              <button onClick={()=>setShowPrint(true)} style={{ padding:'10px 16px', background:C.gold, color:C.navy, border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>🖨️ Print</button>
              <a href={`https://wa.me/94${selected.phone?.replace(/^0/,'')}?text=${encodeURIComponent(`Hello ${selected.customer_name}, your order ${selected.order_number} is ready at Kuruwita Optical. Balance: ${fmtMoney(selected.balance_amount)}. Thank you!`)}`}
                target="_blank" rel="noreferrer"
                style={{ padding:'10px 16px', background:'#25D366', color:'white', borderRadius:9, fontSize:13, fontWeight:600, textDecoration:'none' }}>
                💬 WhatsApp
              </a>
              <button onClick={handleDelete} style={{ padding:'10px 16px', background:'#fee2e2', color:C.danger, border:`1.5px solid #fca5a5`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto' }}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Print modal */}
      {showPrint && selected && <PrintReceipt order={selected} onClose={()=>setShowPrint(false)} />}

      {/* Payment modal */}
      {showPay && selected && <PaymentModal order={selected} onClose={()=>setShowPay(false)} onSave={handlePaymentSaved} />}
    </div>
  );
}
