// ============================================================
//  Orders Page — Integrated with Printing & Status Updates
// ============================================================
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders, updateOrder, deleteOrder, addCallLog } from '../api';
import { useReactToPrint } from 'react-to-print';
import { OrderReceipt } from '../components/OrderReceipt';

const STATUSES = ['all','created','called','delivered','overdue'];
const statusColor = { created:'#1e40af', called:'#854d0e', delivered:'#2d7a4f', overdue:'#c0392b' };
const statusBg    = { created:'#dbeafe', called:'#fef9c3', delivered:'#dcfce7', overdue:'#fee2e2' };

export default function Orders() {
  const [orders,  setOrders]  = useState([]);
  const [filter,  setFilter]  = useState('all');
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [selected,setSelected]= useState(null);
  const [logNote, setLogNote] = useState('');
  const navigate = useNavigate();

  // Reference for the printer
  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `${selected?.order_number}_${selected?.customer_name}_Kuruwita_Optical`,
  });

  const load = useCallback(() => {
    setLoading(true);
    getOrders({ status: filter !== 'all' ? filter : undefined, search: search || undefined })
      .then(r => setOrders(r.data))
      .finally(() => setLoading(false));
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (id, status) => {
    await updateOrder(id, { status });
    load();
    if (selected?.id === id) setSelected(o => ({ ...o, status }));
  };

  const handleLensStep = async (id, step) => {
    await updateOrder(id, { lens_step: step });
    load();
    if (selected?.id === id) setSelected(o => ({ ...o, lens_step: step }));
  };

  const handleAddLog = async () => {
    if (!logNote.trim() || !selected) return;
    await addCallLog(selected.id, logNote);
    setLogNote('');
    load();
  };

  const S = {
    card: { background:'white', border:'1.5px solid #e0ddd6', borderRadius:14, padding:'14px 16px', marginBottom:10, cursor:'pointer', transition:'border-color .15s' },
  };

  return (
    <div>
      {/* Hidden Receipt Component (This won't show on screen, only on paper) */}
      <div style={{ display: 'none' }}>
        <OrderReceipt ref={componentRef} order={selected} />
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:'#0f1f3d', margin:0 }}>📋 Orders</h1>
        <button onClick={()=>navigate('/orders/new')}
          style={{ padding:'9px 20px', background:'#c9a84c', color:'#0f1f3d', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          + New Order
        </button>
      </div>

      {/* Search + filters */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍  Search name, phone, order #..."
          style={{ flex:1, minWidth:180, padding:'9px 14px', border:'1.5px solid #e0ddd6', borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}
        />
        {STATUSES.map(s => (
          <button key={s} onClick={()=>setFilter(s)}
            style={{ padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'1.5px solid', fontFamily:'inherit', transition:'all .15s',
              background: filter===s ? '#0f1f3d' : 'white',
              color:      filter===s ? 'white'   : '#6b7280',
              borderColor:filter===s ? '#0f1f3d' : '#e0ddd6',
            }}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      {/* Order list */}
      {loading
        ? <p style={{ color:'#6b7280', fontSize:13 }}>Loading orders...</p>
        : !orders.length
          ? <p style={{ color:'#6b7280', fontSize:13 }}>No orders found</p>
          : orders.map(o => (
            <div key={o.id} style={{ ...S.card, borderColor: selected?.id===o.id ? '#c9a84c' : o.status==='overdue' ? '#fca5a5' : '#e0ddd6' }}
              onClick={() => setSelected(o)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div>
                  <span style={{ fontSize:12, fontWeight:700, color:'#6b7280' }}>{o.order_number}</span>
                  <span style={{ background: statusBg[o.status], color: statusColor[o.status], fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20, marginLeft:8 }}>
                    {o.status}
                  </span>
                </div>
                <span style={{ fontSize:11, color:'#6b7280' }}>Deliver: {o.deliver_date?.slice(0,10)}</span>
              </div>
              <div style={{ fontSize:15, fontWeight:600, color:'#0f1f3d', marginBottom:4 }}>{o.customer_name}</div>
              <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                <span style={{ fontSize:12, color:'#6b7280' }}>📞 {o.phone}</span>
                <span style={{ fontSize:12, color:'#6b7280' }}>👓 {o.frame || '—'}</span>
                <span style={{ fontSize:12, color:'#6b7280' }}>🔬 {o.lens_company}</span>
                <span style={{ fontSize:12, fontWeight:700, color: parseFloat(o.balance_amount)>0 ? '#c0392b' : '#2d7a4f' }}>
                  Balance: Rs. {parseFloat(o.balance_amount||0).toLocaleString()}
                </span>
              </div>
            </div>
          ))
      }

      {/* Detail side panel */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.45)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}
          onClick={e => { if(e.target===e.currentTarget) setSelected(null); }}>
          <div style={{ background:'white', width:'100%', maxWidth:480, height:'100vh', overflowY:'auto', padding:24, boxShadow:'-8px 0 40px rgba(0,0,0,.18)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:12, color:'#6b7280', fontWeight:700, marginBottom:2 }}>{selected.order_number}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:'#0f1f3d' }}>{selected.customer_name}</div>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:'#f8f5ef', border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer', color:'#6b7280', fontWeight:600 }}>✕ Close</button>
            </div>

            {/* Print Button (Main Action) */}
            <button onClick={handlePrint}
              style={{ width:'100%', padding:'12px', background:'#0f1f3d', color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:20 }}>
              🖨️ Print Receipt
            </button>

            {/* Status updates */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'#6b7280', marginBottom:8 }}>Update Status</div>
              <div style={{ display:'flex', gap:8 }}>
                {['created','called','delivered'].map(s => (
                  <button key={s} onClick={()=>handleStatus(selected.id,s)}
                    style={{ flex:1, padding:'9px 8px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', border:'2px solid',
                      background: selected.status===s ? statusBg[s] : 'white',
                      color: statusColor[s],
                      borderColor: selected.status===s ? statusColor[s] : '#e0ddd6',
                      fontFamily:'inherit',
                    }}>
                    {s==='created'?'📝 Created':s==='called'?'📞 Called':'✅ Delivered'}
                  </button>
                ))}
              </div>
            </div>

            {/* Lens Job Steps */}
            {selected.lens_company !== 'In-Shop' && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:'#6b7280', marginBottom:8 }}>Lens Progress ({selected.lens_company})</div>
                <div style={{ background:'#f8f5ef', borderRadius:10, padding:10, display:'flex', gap:4 }}>
                  {['📤 Sent','⚙️ Grinding','📦 Ready','✅ Recv'].map((label,i) => (
                    <div key={i} onClick={()=>handleLensStep(selected.id,i)}
                      style={{ flex:1, textAlign:'center', padding:'8px 2px', fontSize:10, fontWeight:700, cursor:'pointer',
                        color: i <= selected.lens_step ? '#0f1f3d' : '#9ca3af',
                        borderBottom:`3px solid ${i <= selected.lens_step ? '#c9a84c' : '#e0ddd6'}`,
                      }}>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
              {[
                { l:'Frame', v: selected.frame||'—' },
                { l:'Lens', v: selected.lens_type||'—' },
                { l:'Balance', v: `Rs. ${parseFloat(selected.balance_amount||0).toLocaleString()}`, danger: parseFloat(selected.balance_amount)>0 },
                { l:'Deliver By', v: selected.deliver_date?.slice(0,10)||'—' },
              ].map(item => (
                <div key={item.l} style={{ background:'#f8f5ef', borderRadius:8, padding:'10px' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#6b7280' }}>{item.l}</div>
                  <div style={{ fontSize:13, fontWeight:600, color: item.danger ? '#c0392b':'#1a1a2e' }}>{item.v}</div>
                </div>
              ))}
            </div>

            {/* WhatsApp & Call Logs */}
            <div style={{ display:'flex', gap:8, marginBottom:20 }}>
               <a href={`https://wa.me/94${selected.phone?.replace(/^0/,'')}?text=${encodeURIComponent(`Hello ${selected.customer_name}, this is Kuruwita Optical. Your order ${selected.order_number} is ready. Balance: Rs. ${selected.balance_amount}. Thank you!`)}`}
                target="_blank" rel="noreferrer"
                style={{ flex:1, textAlign:'center', padding:'10px', background:'#25D366', color:'white', borderRadius:9, fontSize:13, fontWeight:700, textDecoration:'none' }}>
                💬 WhatsApp
              </a>
            </div>

            <div style={{ borderTop:'1px solid #ede9e0', paddingTop:15 }}>
              <button onClick={async()=>{ if(window.confirm('Delete order?')){await deleteOrder(selected.id);setSelected(null);load();} }}
                style={{ width:'100%', padding:'10px', background:'none', color:'#c0392b', border:'1px solid #fca5a5', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                🗑️ Delete Order
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}