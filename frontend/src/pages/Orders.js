// ============================================================
//  Orders Page — Phase 3 (Progress Tracking & Payment)
// ============================================================
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders, updateOrder, deleteOrder } from '../api'; // add updateOrderStep if created in api.js
import { useReactToPrint } from 'react-to-print';
import { OrderReceipt } from '../components/OrderReceipt';

const STATUSES = ['all','created','called','delivered','overdue'];
const statusColor = { created:'#1e40af', called:'#854d0e', delivered:'#2d7a4f', overdue:'#c0392b' };
const statusBg    = { created:'#dbeafe', called:'#fef9c3', delivered:'#dcfce7', overdue:'#fee2e2' };
const LENS_STEPS = ['📤 Sent to Lab', '⚙️ Lab Processing', '📦 Ready'];

export default function Orders() {
  const [orders,  setOrders]  = useState([]);
  const [filter,  setFilter]  = useState('all');
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [selected,setSelected]= useState(null);
  const navigate = useNavigate();

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef, 
    documentTitle: `${selected?.order_number || 'Order'}_Kuruwita_Optical`,
  });

  const load = useCallback(() => {
    setLoading(true);
    getOrders({ status: filter !== 'all' ? filter : undefined, search: search || undefined })
      .then(r => setOrders(r.data))
      .finally(() => setLoading(false));
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  // ACTION: COLLECT FINAL PAYMENT
  const handleCollectBalance = async () => {
    if (!selected) return;
    const confirmMsg = `Collect Rs. ${parseFloat(selected.balance_amount).toLocaleString()} and mark as delivered?`;
    if (window.confirm(confirmMsg)) {
      try {
        await updateOrder(selected.id, { 
          status: 'delivered',
          advance_amount: selected.total_amount 
        });
        load();
        setSelected(null);
        alert("Payment settled and order delivered!");
      } catch (err) {
        alert("Failed to update payment.");
      }
    }
  };

  // ACTION: UPDATE LAB PROGRESS (PHASE 3)
  const handleUpdateStep = async (id, step) => {
    try {
      // Assuming your backend patch logic handles lens_step
      await updateOrder(id, { lens_step: step });
      load();
      if (selected?.id === id) setSelected(o => ({ ...o, lens_step: step }));
    } catch (err) {
      alert("Failed to update progress.");
    }
  };

  const handleStatus = async (id, status) => {
    await updateOrder(id, { status });
    load();
    if (selected?.id === id) setSelected(o => ({ ...o, status }));
  };

  const S = {
    card: { background:'white', border:'1.5px solid #e0ddd6', borderRadius:14, padding:'14px 16px', marginBottom:10, cursor:'pointer', transition:'border-color .15s' },
    lbl: { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:'#6b7280', display:'block', marginBottom:8 }
  };

  return (
    <div>
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        <OrderReceipt ref={componentRef} order={selected} />
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:'#0f1f3d', margin:0 }}>📋 Orders</h1>
        <button onClick={()=>navigate('/orders/new')}
          style={{ padding:'9px 20px', background:'#c9a84c', color:'#0f1f3d', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>
          + New Order
        </button>
      </div>

      {/* SEARCH & FILTERS */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search name, phone, order #..."
          style={{ flex:1, minWidth:180, padding:'9px 14px', border:'1.5px solid #e0ddd6', borderRadius:9, fontSize:13, outline:'none' }}
        />
        {STATUSES.map(s => (
          <button key={s} onClick={()=>setFilter(s)}
            style={{ padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'1.5px solid',
              background: filter===s ? '#0f1f3d' : 'white', color: filter===s ? 'white' : '#6b7280', borderColor: filter===s ? '#0f1f3d' : '#e0ddd6' }}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      {/* LISTING */}
      {loading ? <p>Loading...</p> : orders.map(o => (
        <div key={o.id} style={{ ...S.card, borderColor: selected?.id===o.id ? '#c9a84c' : o.status==='overdue' ? '#fca5a5' : '#e0ddd6' }} onClick={() => setSelected(o)}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <div>
              <span style={{ fontSize:12, fontWeight:700, color:'#6b7280' }}>{o.order_number}</span>
              <span style={{ background: statusBg[o.status], color: statusColor[o.status], fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20, marginLeft:8 }}>{o.status}</span>
            </div>
            <span style={{ fontSize:11, color:'#6b7280' }}>Deliver: {o.deliver_date?.slice(0,10)}</span>
          </div>
          <div style={{ fontSize:15, fontWeight:600, color:'#0f1f3d' }}>{o.customer_name}</div>
          <div style={{ display:'flex', gap:14, fontSize:12, color:'#6b7280', marginTop:4 }}>
            <span>📞 {o.phone}</span>
            <span>👓 {o.frame || '—'}</span>
            <span style={{ fontWeight:700, color: parseFloat(o.balance_amount)>0 ? '#c0392b' : '#2d7a4f' }}>Bal: Rs. {parseFloat(o.balance_amount||0).toLocaleString()}</span>
          </div>
        </div>
      ))}

      {/* DETAIL SIDE PANEL */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.45)', zIndex:200, display:'flex', justifyContent:'flex-end' }} onClick={e => e.target===e.currentTarget && setSelected(null)}>
          <div style={{ background:'white', width:'100%', maxWidth:480, height:'100vh', overflowY:'auto', padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", margin:0 }}>{selected.customer_name}</h2>
              <button onClick={()=>setSelected(null)} style={{ background:'#f8f5ef', border:'none', borderRadius:8, padding:'5px 12px', cursor:'pointer' }}>✕</button>
            </div>

            {/* PHASE 3: LAB PROGRESS TRACKING */}
            <div style={{ background: '#f8f5ef', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <label style={S.lbl}>Lens Job Progress ({selected.lens_company})</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {LENS_STEPS.map((label, index) => (
                  <button key={index} onClick={() => handleUpdateStep(selected.id, index + 1)}
                    style={{ flex: 1, padding: '8px 2px', fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                      background: selected.lens_step >= (index + 1) ? '#0f1f3d' : 'white',
                      color: selected.lens_step >= (index + 1) ? 'white' : '#6b7280',
                      border: '1px solid #e0ddd6', borderRadius: 6 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ACTION: COLLECT BALANCE */}
            {parseFloat(selected.balance_amount) > 0 && (
              <div style={{ background: '#fef9c3', border: '1.5px solid #facc15', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#854d0e', marginBottom: 10 }}>💰 Balance Collection</div>
                <button onClick={handleCollectBalance} style={{ width:'100%', padding:'10px', background:'#2d7a4f', color:'white', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer' }}>
                  Confirm Rs. {parseFloat(selected.balance_amount).toLocaleString()} Payment
                </button>
              </div>
            )}

            <button onClick={handlePrint} style={{ width:'100%', padding:12, background:'#0f1f3d', color:'white', borderRadius:10, fontWeight:700, marginBottom:20, cursor:'pointer' }}>🖨️ Print Receipt</button>

            {/* WHATSAPP NOTIFICATION - ONLY SHOWS IF READY */}
            {selected.lens_step >= 3 && (
              <a href={`https://wa.me/94${selected.phone?.replace(/^0/,'')}?text=${encodeURIComponent(`Hello ${selected.customer_name}, this is Kuruwita Optical. Your spectacles are ready for collection! Balance: Rs. ${selected.balance_amount}. See you soon!`)}`}
                target="_blank" rel="noreferrer"
                style={{ display:'block', textAlign:'center', padding:'12px', background:'#25D366', color:'white', borderRadius:10, fontSize:14, fontWeight:700, textDecoration:'none', marginBottom:20 }}>
                📱 Notify via WhatsApp
              </a>
            )}

            {/* STATUS UPDATE */}
            <div style={{ marginBottom:20 }}>
              <label style={S.lbl}>Mark Order Status</label>
              <div style={{ display:'flex', gap:8 }}>
                {['created','called','delivered'].map(s => (
                  <button key={s} onClick={()=>handleStatus(selected.id,s)}
                    style={{ flex:1, padding:'9px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', border:'2px solid',
                      background: selected.status===s ? statusBg[s] : 'white', color: statusColor[s], borderColor: selected.status===s ? statusColor[s] : '#e0ddd6' }}>
                    {s==='created'?'📝 New':s==='called'?'📞 Called':'✅ Delivered'}
                  </button>
                ))}
              </div>
            </div>

            {/* DETAILS GRID */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { l:'Frame', v: selected.frame||'—' },
                { l:'Lens', v: selected.lens_type||'—' },
                { l:'Balance', v: `Rs. ${parseFloat(selected.balance_amount||0).toLocaleString()}`, danger: true },
                { l:'Total Price', v: `Rs. ${parseFloat(selected.total_amount||0).toLocaleString()}` },
              ].map(item => (
                <div key={item.l} style={{ background:'#f8f5ef', borderRadius:8, padding:'10px' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#6b7280' }}>{item.l}</div>
                  <div style={{ fontSize:13, fontWeight:600, color: item.danger && parseFloat(selected.balance_amount)>0 ? '#c0392b':'#1a1a2e' }}>{item.v}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}