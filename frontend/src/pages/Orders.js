/* eslint-disable */
// ============================================================
//  Orders.js — Row numbers + date filter (Today/Week/Month/All)
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getOrders, getOrder, updateOrder, deleteOrder, addCallLog } from '../api';
import { LensPriceCheckerPopup } from './LensPriceChecker';
import PrintReceipt from '../components/PrintReceipt';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};
const fmtMoney = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
const printCoating = c => ({'Blue Cut':'Blue Filter','Photo Gray':'Photochromic','Blue Cut + Photo Gray':'Blue Filter + Photochromic','Blue Cut + HMC':'Blue Filter + HMC','Photo Gray + HMC':'Photochromic + HMC','Blue Cut + Photo Gray + HMC':'Blue Filter + Photochromic + HMC'}[c]||c);
const STATUSES = ['all','created','called','delivered','overdue','balance_due'];
const STATUS_STYLE = {
  created:   { bg:'#dbeafe', color:'#1e40af' },
  called:    { bg:'#fef9c3', color:'#854d0e' },
  delivered: { bg:'#dcfce7', color:'#2d7a4f' },
  overdue:   { bg:'#fee2e2', color:'#c0392b' },
};
const Badge = ({ status }) => {
  const s = STATUS_STYLE[status] || { bg:'#f3f4f6', color:'#6b7280' };
  return <span style={{ background:s.bg, color:s.color, fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20, textTransform:'capitalize' }}>{status}</span>;
};

// Date filter helper
const DATE_FILTERS = [
  { key:'today',  label:'Today'      },
  { key:'week',   label:'This Week'  },
  { key:'month',  label:'This Month' },
  { key:'all',    label:'All Time'   },
];
function getDateRange(key) {
  const now = new Date();
  const start = new Date();
  if (key==='today') { start.setHours(0,0,0,0); }
  else if (key==='week') { start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0); }
  else if (key==='month') { start.setDate(1); start.setHours(0,0,0,0); }
  else return null;
  return start;
}

// ── Record Payment Modal ──────────────────────────────────────
function PaymentModal({ order, onClose, onSave }) {
  const [amount,    setAmount]    = useState('');
  const [method,    setMethod]    = useState('cash');
  const [payDate,   setPayDate]   = useState(new Date().toISOString().split('T')[0]);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const balance = parseFloat(order.balance_amount || 0);

  const handlePay = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0)     return setError('Enter a valid payment amount');
    if (amt > balance + 0.01) return setError(`Cannot pay more than balance due (${fmtMoney(balance)})`);
    setSaving(true);
    try {
      await updateOrder(order.id, {
        advance_amount:      parseFloat(order.advance_amount || 0) + amt,
        balance_amount:      Math.max(0, balance - amt),
        last_payment_date:   payDate,
        last_payment_method: method,
        last_payment_amount: amt,   // ← CRITICAL: enables dashboard to show balance payments
      });
      onSave(`Payment of ${fmtMoney(amt)} recorded on ${new Date(payDate+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}. New balance: ${fmtMoney(Math.max(0,balance-amt))}`);
    } catch(e) { setError('Failed to record payment.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.55)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:C.navy }}>Record Payment</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{order.order_number} · {order.customer_name}</div>
          </div>
          <button onClick={onClose} style={{ background:C.cream, border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>✕</button>
        </div>
        <div style={{ background:balance>0?'#fee2e2':'#dcfce7', borderRadius:10, padding:'12px 16px', marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, color:C.muted }}>Balance due</span>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:balance>0?C.danger:C.success }}>{fmtMoney(balance)}</span>
        </div>
        {balance<=0 ? (
          <div style={{ textAlign:'center', padding:'12px 0', color:C.success, fontSize:14, fontWeight:600 }}>This order is fully paid</div>
        ) : (
          <>
            {error&&<div style={{ background:'#fef2f2', color:C.danger, borderRadius:8, padding:'9px 14px', fontSize:13, marginBottom:14 }}>{error}</div>}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:5 }}>Amount (Rs.) *</label>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
                placeholder={`Max: Rs. ${balance.toLocaleString()}`}
                style={{ width:'100%', padding:'11px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', background:C.cream }}/>
              <div style={{ display:'flex', gap:6, marginTop:6 }}>
                <button onClick={()=>setAmount(String(balance))} style={{ padding:'5px 12px', background:C.navy, color:'white', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Full balance</button>
                {[1000,2000,5000].filter(v=>v<balance).map(v=>(
                  <button key={v} onClick={()=>setAmount(String(v))} style={{ padding:'5px 12px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>Rs.{v.toLocaleString()}</button>
                ))}
              </div>
            </div>
            {/* Payment Date */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:5 }}>Payment Date</label>
              <input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)}
                style={{ width:'100%', padding:'10px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy, fontWeight:600 }}/>
              <div style={{ display:'flex', gap:6, marginTop:6 }}>
                {[
                  { label:'Today',     val:new Date().toISOString().split('T')[0] },
                  { label:'Yesterday', val:new Date(Date.now()-86400000).toISOString().split('T')[0] },
                ].map(d=>(
                  <button key={d.label} onClick={()=>setPayDate(d.val)}
                    style={{ padding:'4px 12px', background:payDate===d.val?C.navy:C.cream, color:payDate===d.val?'white':C.muted, border:`1px solid ${payDate===d.val?C.navy:C.border}`, borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:5 }}>Payment Method</label>
              <div style={{ display:'flex', gap:8 }}>
                {[['cash','💵 Cash'],['bank','🏦 Bank'],['card','💳 Card']].map(([val,label])=>(
                  <button key={val} onClick={()=>setMethod(val)}
                    style={{ flex:1, padding:'9px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${method===val?C.navy:C.border}`, background:method===val?C.navy:'white', color:method===val?'white':C.muted }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handlePay} disabled={saving}
              style={{ width:'100%', padding:'13px', background:saving?C.muted:C.success, color:'white', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {saving?'Saving...':` Record ${amount?fmtMoney(parseFloat(amount)||0):'Payment'}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}


// ── Edit Order Modal ─────────────────────────────────────────
function EditOrderModal({ order, onClose, onSave }) {
  const FRAME_TYPES  = ['Full rim','Half rim','Rimless','Sunglass'];
  const FRAME_MATS   = ['Plastic','Metal','TR90','Titanium','Acetate','Mixed'];
  const FRAME_COLORS = ['Black','Gold','Silver','Brown','Gunmetal','Blue','Red','Pink','Tortoise','Crystal','Other'];
  const LENS_TYPES   = ['Single Vision','Progressive','Bifocal','Office Lens','Reading (ready)'];
  const LENS_COATINGS= ['CR White','Blue Cut','Photo Gray','HMC','Blue Cut + Photo Gray','Blue Cut + HMC','Photo Gray + HMC','Blue Cut + Photo Gray + HMC'];
  const LENS_INDEXES = ['CR39','1.49','1.56','1.59','1.6','1.61','1.67','1.74','Poly'];
  const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', danger:'#c0392b', success:'#2d7a4f' };
  const INP = { padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy, width:'100%', boxSizing:'border-box' };
  const SEL = { ...INP, cursor:'pointer' };
  const LBL = { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, display:'block', marginBottom:4 };

  const [form, setForm] = useState({
    // Frame
    frame:           order.frame           || '',
    frame_type:      order.frame_type      || 'Full rim',
    frame_material:  order.frame_material  || 'Plastic',
    frame_color:     order.frame_color     || 'Black',
    frame_sell_price:order.frame_sell_price|| '',
    frame_buy_price: order.frame_buy_price || '',
    // Lens
    lens_type:       order.lens_type       || 'Single Vision',
    lens_coating:    order.lens_coating    || 'CR White',
    lens_company:    order.lens_company    || '',
    lens_index:      order.lens_index      || '',
    lens_sell_price: order.lens_sell_price || '',
    lens_buy_price:  order.lens_buy_price  || '',
    // Payment
    total_amount:    order.total_amount    || '',
    advance_amount:  order.advance_amount  || '',
    balance_amount:  order.balance_amount  || '',
    payment_method:  order.payment_method  || 'cash',
    // Delivery & status
    deliver_date:    order.deliver_date    ? order.deliver_date.slice(0,10) : '',
    status:          order.status          || 'created',
    // Warranty
    warranty_frame:  order.warranty_frame  || '',
    warranty_lens:   order.warranty_lens   || '',
    // Notes
    notes:           order.notes           || '',
    // Lab
    lab_bill_amount: order.lab_bill_amount || '',
    lab_notes:       order.lab_notes       || '',
  });
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [tab,           setTab]           = useState('order');
  // Frame search with image suggestions
  const [frameSearch,   setFrameSearch]   = useState(order.frame || '');
  const [frameResults,  setFrameResults]  = useState([]);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [frameTimer,    setFrameTimer]    = useState(null);
  const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const tok  = () => localStorage.getItem('ko_token');

  const searchFrames = (v) => {
    setFrameSearch(v);
    set('frame', v);
    setSelectedFrame(null);
    clearTimeout(frameTimer);
    if (v.length < 1) { setFrameResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res  = await fetch(`${BASE}/inventory?search=${encodeURIComponent(v)}&limit=12`, { headers:{ Authorization:`Bearer ${tok()}` } });
        const data = await res.json();
        const rows = Array.isArray(data) ? data : (data.data || []);
        setFrameResults(rows.filter(i => i.quantity > 0 && ['Frames','Sunglasses','Reading Glasses'].includes(i.category)).slice(0,10));
      } catch(e) { setFrameResults([]); }
    }, 300);
    setFrameTimer(t);
  };

  const pickFrame = (item) => {
    setSelectedFrame(item);
    setFrameSearch(item.name);
    setFrameResults([]);
    setForm(f => ({
      ...f,
      frame:            item.name,
      frame_type:       item.frame_type     || f.frame_type,
      frame_material:   item.frame_material || f.frame_material,
      frame_color:      item.frame_color    || f.frame_color,
      frame_buy_price:  item.cost_price     || f.frame_buy_price,
      frame_sell_price: item.sell_price     || f.frame_sell_price,
      frame_inventory_id: item.id,
    }));
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Recalculate balance when total or advance changes
  const recalcBalance = (total, advance) => {
    const t = parseFloat(total) || 0;
    const a = parseFloat(advance) || 0;
    set('balance_amount', Math.max(0, t - a).toFixed(2));
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const updates = {};
      // Only send changed fields
      const fields = ['frame','frame_type','frame_material','frame_color',
        'frame_sell_price','frame_buy_price','lens_type','lens_coating',
        'lens_company','lens_index','lens_sell_price','lens_buy_price',
        'total_amount','advance_amount','balance_amount','payment_method',
        'deliver_date','status','warranty_frame','warranty_lens',
        'notes','lab_bill_amount','lab_notes','frame_inventory_id'];
      fields.forEach(f => {
        const v = form[f];
        const orig = String(order[f] || '');
        if (String(v) !== orig) {
          if (['frame_sell_price','frame_buy_price','lens_sell_price','lens_buy_price',
               'total_amount','advance_amount','balance_amount','lab_bill_amount'].includes(f)) {
            updates[f] = parseFloat(v) || 0;
          } else {
            updates[f] = v || null;
          }
        }
      });
      if (!Object.keys(updates).length) { onClose(); return; }
      await onSave(updates);
    } catch(e) { setError('Failed to save. Please try again.'); }
    finally { setSaving(false); }
  };

  const tabStyle = (t) => ({
    padding:'8px 18px', borderRadius:8, fontSize:12, fontWeight:700,
    cursor:'pointer', fontFamily:'inherit', border:'none',
    background: tab===t ? C.navy : 'transparent',
    color:      tab===t ? 'white' : C.muted,
  });

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.6)', zIndex:400,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:560,
        maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 80px rgba(0,0,0,.3)' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'20px 24px 0', borderBottom:`1.5px solid ${C.cream}`, paddingBottom:16 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'1px', textTransform:'uppercase' }}>Editing</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.navy }}>
              {order.order_number} — {order.customer_name}
            </div>
          </div>
          <button onClick={onClose} style={{ background:C.cream, border:'none', borderRadius:8,
            padding:'6px 14px', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted, fontWeight:600 }}>
            ✕ Close
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, padding:'12px 24px', background:C.cream, borderBottom:`1px solid ${C.border}` }}>
          {[['order','🕶️ Frame & Lens'],['payment','💳 Payment'],['notes','📝 Notes & Warranty']].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={tabStyle(t)}>{l}</button>
          ))}
        </div>

        <div style={{ padding:'20px 24px' }}>
          {error && <div style={{ background:'#fef2f2', color:C.danger, borderRadius:8, padding:'9px 14px', fontSize:13, marginBottom:14 }}>{error}</div>}

          {/* ── TAB: Frame & Lens ── */}
          {tab==='order' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ fontWeight:700, color:C.navy, fontSize:13, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>🖼️ Frame</div>
              <div style={{ position:'relative' }}>
                <label style={LBL}>Frame Name / Model — type to search stock</label>
                <input
                  value={frameSearch}
                  onChange={e => searchFrames(e.target.value)}
                  placeholder="Type frame name or model number..."
                  style={{ ...INP, borderColor: selectedFrame ? C.gold : C.border }}
                />
                {/* Dropdown results with images */}
                {frameResults.length > 0 && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white',
                    border:`1.5px solid ${C.gold}`, borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,.18)',
                    zIndex:600, overflow:'hidden', marginTop:4, maxHeight:320, overflowY:'auto' }}>
                    <div style={{ padding:'6px 12px', background:C.cream, fontSize:10, fontWeight:700,
                      textTransform:'uppercase', letterSpacing:'1px', color:C.muted, borderBottom:`1px solid ${C.border}` }}>
                      {frameResults.length} frames found — tap to select
                    </div>
                    {frameResults.map(item => (
                      <div key={item.id}
                        onMouseDown={() => pickFrame(item)}
                        style={{ padding:'10px 14px', cursor:'pointer', borderBottom:`1px solid ${C.cream}`,
                          display:'flex', alignItems:'center', gap:10, background:'white' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8f5ef'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        {/* Frame image */}
                        {item.image_url
                          ? <img src={item.image_url} alt="" style={{ width:56, height:42,
                              objectFit:'contain', borderRadius:6, border:`1px solid ${C.border}`,
                              background:'#f9f9f9', flexShrink:0 }}/>
                          : <div style={{ width:56, height:42, borderRadius:6, border:`1px solid ${C.border}`,
                              background:C.cream, flexShrink:0, display:'flex', alignItems:'center',
                              justifyContent:'center', fontSize:20 }}>👓</div>
                        }
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:C.navy,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize:11, color:C.muted, display:'flex', gap:8, flexWrap:'wrap', marginTop:2 }}>
                            {item.frame_color && <span>{item.frame_color}</span>}
                            {item.frame_type  && <span>{item.frame_type}</span>}
                            <span style={{ fontWeight:700, color:C.success }}>
                              {item.quantity} in stock
                            </span>
                            <span style={{ color:C.gold, fontWeight:700 }}>
                              Rs. {parseFloat(item.sell_price||0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {item.display_number && (
                          <div style={{ fontSize:10, color:C.muted, flexShrink:0 }}>#{item.display_number}</div>
                        )}
                      </div>
                    ))}
                    <div onMouseDown={() => setFrameResults([])}
                      style={{ padding:'9px 14px', cursor:'pointer', fontSize:12, color:C.muted,
                        background:'#f8f5ef', borderTop:`1px solid ${C.border}` }}>
                      ✏️ Use "<b>{frameSearch}</b>" as typed (no stock item)
                    </div>
                  </div>
                )}
                {/* Selected frame confirmation */}
                {selectedFrame && (
                  <div style={{ marginTop:8, background:'#dcfce7', border:`1px solid #86efac`,
                    borderRadius:9, padding:'9px 14px', display:'flex', alignItems:'center', gap:10 }}>
                    {selectedFrame.image_url && (
                      <img src={selectedFrame.image_url} alt="" style={{ width:44, height:33,
                        objectFit:'contain', borderRadius:5, border:`1px solid ${C.border}`, background:'#f9f9f9' }}/>
                    )}
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:C.success }}>✓ {selectedFrame.name}</div>
                      <div style={{ fontSize:11, color:C.muted }}>
                        {selectedFrame.frame_color} · {selectedFrame.frame_type} · {selectedFrame.quantity} in stock
                      </div>
                    </div>
                    <button onMouseDown={()=>{ setSelectedFrame(null); setFrameSearch(form.frame); }}
                      style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:16 }}>✕</button>
                  </div>
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                <div>
                  <label style={LBL}>Type</label>
                  <select value={form.frame_type} onChange={e=>set('frame_type',e.target.value)} style={SEL}>
                    {FRAME_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Material</label>
                  <select value={form.frame_material} onChange={e=>set('frame_material',e.target.value)} style={SEL}>
                    {FRAME_MATS.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Color</label>
                  <select value={form.frame_color} onChange={e=>set('frame_color',e.target.value)} style={SEL}>
                    {FRAME_COLORS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Buy Price (Rs.)</label>
                  <input type="number" value={form.frame_buy_price} onChange={e=>set('frame_buy_price',e.target.value)} style={INP}/>
                </div>
                <div>
                  <label style={LBL}>Sell Price (Rs.)</label>
                  <input type="number" value={form.frame_sell_price} onChange={e=>set('frame_sell_price',e.target.value)} style={INP}/>
                </div>
              </div>

              <div style={{ fontWeight:700, color:C.navy, fontSize:13, paddingBottom:6, borderBottom:`1px solid ${C.cream}`, marginTop:4 }}>🔬 Lens</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={LBL}>Lens Type</label>
                  <select value={form.lens_type} onChange={e=>set('lens_type',e.target.value)} style={SEL}>
                    {LENS_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Coating</label>
                  <select value={form.lens_coating} onChange={e=>set('lens_coating',e.target.value)} style={SEL}>
                    {LENS_COATINGS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Index</label>
                  <select value={form.lens_index} onChange={e=>set('lens_index',e.target.value)} style={SEL}>
                    <option value="">— Any —</option>
                    {LENS_INDEXES.map(i=><option key={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Supplier / Lab</label>
                  <input value={form.lens_company} onChange={e=>set('lens_company',e.target.value)} placeholder="e.g. Negombo Optical" style={INP}/>
                </div>
                <div>
                  <label style={LBL}>Buy Price (Rs.)</label>
                  <input type="number" value={form.lens_buy_price} onChange={e=>set('lens_buy_price',e.target.value)} style={INP}/>
                </div>
                <div>
                  <label style={LBL}>Sell Price (Rs.)</label>
                  <input type="number" value={form.lens_sell_price} onChange={e=>set('lens_sell_price',e.target.value)} style={INP}/>
                </div>
              </div>

              <div>
                <label style={LBL}>Lab Bill Amount (Rs.)</label>
                <input type="number" value={form.lab_bill_amount} onChange={e=>set('lab_bill_amount',e.target.value)}
                  placeholder="Lab invoice amount" style={INP}/>
                <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>Used for profit calculations</div>
              </div>

              <div>
                <label style={LBL}>Delivery Date</label>
                <input type="date" value={form.deliver_date} onChange={e=>set('deliver_date',e.target.value)} style={INP}/>
              </div>

              <div>
                <label style={LBL}>Status</label>
                <div style={{ display:'flex', gap:8 }}>
                  {['created','called','delivered','cancelled'].map(s=>(
                    <button key={s} onClick={()=>set('status',s)}
                      style={{ flex:1, padding:'9px', borderRadius:8, fontSize:12, fontWeight:600,
                        cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${form.status===s?C.navy:C.border}`,
                        background:form.status===s?C.navy:'white', color:form.status===s?'white':C.muted }}>
                      {s.charAt(0).toUpperCase()+s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Payment ── */}
          {tab==='payment' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={LBL}>Total Amount (Rs.)</label>
                <input type="number" value={form.total_amount}
                  onChange={e=>{ set('total_amount',e.target.value); recalcBalance(e.target.value, form.advance_amount); }}
                  style={{ ...INP, fontSize:18, fontWeight:700 }}/>
              </div>
              <div>
                <label style={LBL}>Advance Paid (Rs.)</label>
                <input type="number" value={form.advance_amount}
                  onChange={e=>{ set('advance_amount',e.target.value); recalcBalance(form.total_amount, e.target.value); }}
                  style={{ ...INP, fontSize:18, fontWeight:700 }}/>
              </div>
              <div style={{ background:parseFloat(form.balance_amount)>0?'#fee2e2':'#dcfce7',
                borderRadius:10, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:parseFloat(form.balance_amount)>0?C.danger:C.success, marginBottom:3 }}>Balance Due</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700,
                    color:parseFloat(form.balance_amount)>0?C.danger:C.success }}>
                    Rs. {parseFloat(form.balance_amount||0).toLocaleString('en-LK')}
                  </div>
                </div>
                <div>
                  <label style={{ ...LBL, textAlign:'right' }}>Override Balance</label>
                  <input type="number" value={form.balance_amount}
                    onChange={e=>set('balance_amount',e.target.value)}
                    style={{ ...INP, width:130, fontSize:15, fontWeight:700, textAlign:'right' }}/>
                </div>
              </div>
              <div>
                <label style={LBL}>Payment Method</label>
                <div style={{ display:'flex', gap:8 }}>
                  {[['cash','💵 Cash'],['bank','🏦 Bank'],['card','💳 Card']].map(([v,l])=>(
                    <button key={v} onClick={()=>set('payment_method',v)}
                      style={{ flex:1, padding:'11px', borderRadius:9, fontSize:13, fontWeight:600,
                        cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${form.payment_method===v?C.navy:C.border}`,
                        background:form.payment_method===v?C.navy:'white', color:form.payment_method===v?'white':C.muted }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Notes & Warranty ── */}
          {tab==='notes' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={LBL}>Internal Notes</label>
                <textarea value={form.notes} onChange={e=>set('notes',e.target.value)}
                  placeholder="Any notes about this order..."
                  rows={4}
                  style={{ ...INP, resize:'vertical', lineHeight:1.6 }}/>
              </div>
              <div>
                <label style={LBL}>Lab Notes</label>
                <textarea value={form.lab_notes} onChange={e=>set('lab_notes',e.target.value)}
                  placeholder="Notes for the lab..."
                  rows={2}
                  style={{ ...INP, resize:'vertical', lineHeight:1.6 }}/>
              </div>
              <div style={{ fontWeight:700, color:C.navy, fontSize:13, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>🛡️ Warranty</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={LBL}>Frame Warranty</label>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {['','3 months','6 months','1 year','2 years'].map(w=>(
                      <button key={w||'none'} onClick={()=>set('warranty_frame',w)}
                        style={{ padding:'8px 12px', borderRadius:8, fontSize:12, fontWeight:600,
                          cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                          border:`1.5px solid ${form.warranty_frame===w?C.navy:C.border}`,
                          background:form.warranty_frame===w?C.navy:'white',
                          color:form.warranty_frame===w?'white':w===''?C.muted:C.navy }}>
                        {w===''?'❌ No Warranty':'🛡️ '+w}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={LBL}>Lens Warranty</label>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {['','3 months','6 months','1 year','2 years'].map(w=>(
                      <button key={w||'none'} onClick={()=>set('warranty_lens',w)}
                        style={{ padding:'8px 12px', borderRadius:8, fontSize:12, fontWeight:600,
                          cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                          border:`1.5px solid ${form.warranty_lens===w?C.navy:C.border}`,
                          background:form.warranty_lens===w?C.navy:'white',
                          color:form.warranty_lens===w?'white':w===''?C.muted:C.navy }}>
                        {w===''?'❌ No Warranty':'🛡️ '+w}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          <div style={{ display:'flex', gap:10, marginTop:20, paddingTop:16, borderTop:`1px solid ${C.cream}` }}>
            <button onClick={onClose}
              style={{ padding:'11px 22px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:10,
                fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex:1, padding:'12px', background:saving?C.muted:C.navy, color:'white',
                border:'none', borderRadius:10, fontSize:14, fontWeight:700,
                cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Orders component ────────────────────────────────────

// ── Bill Options Modal — proper component (not IIFE) ─────────
function BillOptionsModal({ selected, onClose, onPrint, C, fmtMoney }) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  const hdr   = { Authorization: `Bearer ${token}` };

  // Price display controls
  const [showFramePrice, setShowFramePrice] = useState(true);
  const [showLensPrice,  setShowLensPrice]  = useState(true);
  const [cUseCustom,     setCUseCustom]     = useState(false);
  const [cFramePrice,    setCFramePrice]    = useState(String(selected.frame_sell_price || ''));
  const [cLensPrice,     setCLensPrice]     = useState(String(selected.lens_sell_price  || ''));

  // Discount
  const [cDiscount,  setCDiscount]  = useState('');
  const [cDiscType,  setCDiscType]  = useState('amount');

  // Gifts — pre-fill from order's existing gift notes
  const [cGifts,     setCGifts]     = useState(() => {
    // Try to parse existing gifts from order notes
    const notesMatch = (selected.notes||'').match(/Gifts?:?\s*(.+)/i);
    if (notesMatch) {
      return notesMatch[1].split(',').map(g => ({ name: g.trim(), price: '', stock: null })).filter(g=>g.name);
    }
    return [];
  });
  const [giftSearch, setGiftSearch] = useState('');
  const [giftDrop,   setGiftDrop]   = useState([]);
  const [searching,  setSearching]  = useState(false);

  // Search inventory for gift items
  const searchGifts = async (q) => {
    setGiftSearch(q);
    if (!q.trim() || q.length < 2) { setGiftDrop([]); return; }
    setSearching(true);
    try {
      const res  = await fetch(`${BASE}/inventory?search=${encodeURIComponent(q)}&limit=8`, { headers: hdr });
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.data || []);
      setGiftDrop(items.slice(0,8));
    } catch(e) {} finally { setSearching(false); }
  };

  const addGiftFromInventory = (item) => {
    if (!cGifts.find(g => g.name === item.name)) {
      setCGifts(g => [...g, {
        name:  item.name,
        price: String(item.sell_price || ''),
        stock: item.quantity,
        id:    item.id,
      }]);
    }
    setGiftSearch('');
    setGiftDrop([]);
  };

  const addBlankGift = () => {
    setCGifts(g => [...g, { name:'', price:'', stock:null }]);
    setGiftSearch('');
    setGiftDrop([]);
  };

  const origTotal   = parseFloat(selected.total_amount   || 0);
  const origAdvance = parseFloat(selected.advance_amount || 0);
  const customFrame = parseFloat(cFramePrice) || 0;
  const customLens  = parseFloat(cLensPrice)  || 0;
  const customSub   = cUseCustom ? (customFrame + customLens) : origTotal;
  const discAmt     = cDiscount
    ? (cDiscType === 'pct'
        ? Math.round(customSub * parseFloat(cDiscount) / 100 * 100) / 100
        : parseFloat(cDiscount) || 0)
    : 0;
  const customTotal   = Math.max(0, customSub - discAmt);
  const customBalance = Math.max(0, customTotal - origAdvance);

  const INP_B = { padding:'8px 11px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13,
    fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy, width:'100%', boxSizing:'border-box' };

  const handlePrint = () => {
    const overrides = {};

    // Frame/Lens price visibility controls
    overrides.show_frame_price = showFramePrice;
    overrides.show_lens_price  = showLensPrice;

    // Custom prices
    if (cUseCustom) {
      if (customFrame > 0) overrides.frame_sell_price = customFrame;
      if (customLens  > 0) overrides.lens_sell_price  = customLens;
      overrides.total_amount   = customTotal;
      overrides.balance_amount = customBalance;
    }

    // Discount
    if (discAmt > 0) {
      overrides.discount_amount  = discAmt;
      overrides.discount_percent = cDiscType === 'pct' ? parseFloat(cDiscount) : 0;
      if (!cUseCustom) {
        overrides.total_amount   = Math.max(0, origTotal - discAmt);
        overrides.balance_amount = Math.max(0, origTotal - discAmt - origAdvance);
      }
    }

    // Gifts
    const validGifts = cGifts.filter(g => g.name.trim());
    if (validGifts.length > 0) overrides.bill_gifts = validGifts;

    onPrint(overrides);
  };

  const fSell = parseFloat(selected.frame_sell_price || 0);
  const lSell = parseFloat(selected.lens_sell_price  || 0);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.7)', zIndex:500,
      display:'flex', alignItems:'center', justifyContent:'center', padding:12 }}
      onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:20, padding:24, width:'100%', maxWidth:540,
        boxShadow:'0 24px 60px rgba(0,0,0,.35)', maxHeight:'92vh', overflowY:'auto' }}>

        {/* Header */}
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.navy, marginBottom:2 }}>🖨️ Bill Options</div>
        <div style={{ fontSize:12, color:C.muted, marginBottom:18 }}>
          <b style={{color:C.navy}}>{selected.order_number}</b> · {selected.customer_name}
        </div>

        {/* ── Section 1: Price Visibility ── */}
        <div style={{ background:C.cream, borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:12, letterSpacing:'1px' }}>
            Show / Hide Prices on Bill
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            {/* Frame price toggle */}
            <div style={{ background:'white', borderRadius:10, padding:'10px 14px', border:`1.5px solid ${showFramePrice?C.navy:'#e5e7eb'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <span style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase' }}>Frame Price</span>
                <button onClick={()=>setShowFramePrice(s=>!s)}
                  style={{ padding:'3px 10px', borderRadius:20, border:'none', cursor:'pointer',
                    background: showFramePrice ? '#dcfce7' : '#fee2e2',
                    color:      showFramePrice ? C.success  : C.danger,
                    fontSize:10, fontWeight:800, fontFamily:'inherit' }}>
                  {showFramePrice ? '✓ Show' : '✗ Hide'}
                </button>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>
                {fSell > 0 ? `Rs. ${fSell.toLocaleString()}` : '—'}
              </div>
            </div>
            {/* Lens price toggle */}
            <div style={{ background:'white', borderRadius:10, padding:'10px 14px', border:`1.5px solid ${showLensPrice?C.navy:'#e5e7eb'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <span style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase' }}>Lens Price</span>
                <button onClick={()=>setShowLensPrice(s=>!s)}
                  style={{ padding:'3px 10px', borderRadius:20, border:'none', cursor:'pointer',
                    background: showLensPrice ? '#dcfce7' : '#fee2e2',
                    color:      showLensPrice ? C.success  : C.danger,
                    fontSize:10, fontWeight:800, fontFamily:'inherit' }}>
                  {showLensPrice ? '✓ Show' : '✗ Hide'}
                </button>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>
                {lSell > 0 ? `Rs. ${lSell.toLocaleString()}` : '—'}
              </div>
            </div>
          </div>

          {/* Custom price override */}
          <button onClick={()=>setCUseCustom(s=>!s)}
            style={{ width:'100%', padding:'8px', borderRadius:8, border:`1.5px solid ${cUseCustom?C.gold:C.border}`,
              background: cUseCustom?'#fef9f0':'white', color: cUseCustom?'#92400e':C.muted,
              fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
            {cUseCustom ? '✓ Custom prices ON' : '✏️ Override prices for this bill (bill only, order unchanged)'}
          </button>
          {cUseCustom && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:C.muted, marginBottom:4, textTransform:'uppercase' }}>Frame Price (Rs.)</div>
                <input type="number" value={cFramePrice} onChange={e=>{setCFramePrice(e.target.value); setShowFramePrice(true);}}
                  placeholder={fSell>0?`Original: ${fSell}`:'Enter price'} style={INP_B}/>
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:C.muted, marginBottom:4, textTransform:'uppercase' }}>Lens Price (Rs.)</div>
                <input type="number" value={cLensPrice} onChange={e=>{setCLensPrice(e.target.value); setShowLensPrice(true);}}
                  placeholder={lSell>0?`Original: ${lSell}`:'Enter price'} style={INP_B}/>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 2: Discount ── */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:8, letterSpacing:'1px' }}>Discount on Bill</div>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ display:'flex', gap:0, flexShrink:0, border:`1.5px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
              {[['amount','Rs.'],['pct','%']].map(([v,l]) => (
                <button key={v} onClick={()=>setCDiscType(v)}
                  style={{ padding:'8px 14px', border:'none',
                    background:cDiscType===v?C.navy:'white', color:cDiscType===v?'white':C.muted,
                    fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {l}
                </button>
              ))}
            </div>
            <input type="number" value={cDiscount} onChange={e=>setCDiscount(e.target.value)}
              placeholder={cDiscType==='pct'?'e.g. 10':'e.g. 500'} style={{ ...INP_B, flex:1 }}/>
          </div>
          {discAmt > 0 && (
            <div style={{ fontSize:12, color:C.success, marginTop:6, fontWeight:600 }}>
              ✓ Discount: Rs. {discAmt.toLocaleString()} → Bill total: Rs. {customTotal.toLocaleString()}
            </div>
          )}
        </div>

        {/* ── Section 3: Free Gifts ── */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:8, letterSpacing:'1px' }}>🎁 Free Gifts on Bill</div>

          {/* Gift search from inventory */}
          <div style={{ position:'relative', marginBottom:8 }}>
            <input
              value={giftSearch}
              onChange={e=>searchGifts(e.target.value)}
              placeholder="Search inventory for gift item name..."
              style={{ ...INP_B, background:'white' }}/>
            {giftSearch && (
              <button onClick={addBlankGift}
                style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                  padding:'3px 10px', background:C.navy, color:'white', border:'none', borderRadius:6,
                  fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                + Add Manually
              </button>
            )}
            {/* Dropdown results */}
            {giftDrop.length > 0 && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white',
                border:`1.5px solid ${C.border}`, borderRadius:10, zIndex:50, boxShadow:'0 8px 24px rgba(0,0,0,.12)', maxHeight:200, overflowY:'auto' }}>
                {giftDrop.map(item => (
                  <div key={item.id} onClick={()=>addGiftFromInventory(item)}
                    style={{ padding:'9px 14px', cursor:'pointer', borderBottom:`1px solid ${C.cream}`,
                      display:'flex', justifyContent:'space-between', alignItems:'center' }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.cream}
                    onMouseLeave={e=>e.currentTarget.style.background='white'}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{item.name}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{item.category} · Stock: {item.quantity}</div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.gold }}>
                      Rs. {parseFloat(item.sell_price||0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gift list */}
          {cGifts.length === 0 ? (
            <div style={{ fontSize:12, color:C.muted, padding:'8px 0' }}>
              No gifts added. Search above or click "+ Add Manually".
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {cGifts.map((gift, i) => (
                <div key={i} style={{ display:'flex', gap:8, alignItems:'center', background:C.cream, borderRadius:8, padding:'8px 12px' }}>
                  <div style={{ flex:2 }}>
                    <input value={gift.name} onChange={e=>setCGifts(g=>g.map((x,j)=>j===i?{...x,name:e.target.value}:x))}
                      placeholder="Gift item name"
                      style={{ ...INP_B, background:'white', padding:'6px 10px', fontSize:13 }}/>
                    {gift.stock !== null && (
                      <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>
                        Stock: {gift.stock} available
                      </div>
                    )}
                  </div>
                  <div style={{ flex:1 }}>
                    <input type="number" value={gift.price}
                      onChange={e=>setCGifts(g=>g.map((x,j)=>j===i?{...x,price:e.target.value}:x))}
                      placeholder="Value Rs."
                      style={{ ...INP_B, background:'white', padding:'6px 10px', fontSize:13 }}/>
                    {gift.price && (
                      <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>shown crossed out</div>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                    <div style={{ fontSize:16 }}>🎁</div>
                    <button onClick={()=>setCGifts(g=>g.filter((_,j)=>j!==i))}
                      style={{ padding:'4px 8px', background:'#fee2e2', border:'none', borderRadius:6, color:C.danger, cursor:'pointer', fontSize:12 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Preview summary ── */}
        <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:12 }}>
          <div style={{ fontWeight:700, color:'#0369a1', marginBottom:6 }}>📋 Bill Preview</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, color:'#374151' }}>
            <div>Frame price: <b>{showFramePrice ? (cUseCustom&&customFrame?`Rs.${customFrame.toLocaleString()}`:(fSell?`Rs.${fSell.toLocaleString()}`:'—')) : '🚫 Hidden'}</b></div>
            <div>Lens price: <b>{showLensPrice ? (cUseCustom&&customLens?`Rs.${customLens.toLocaleString()}`:(lSell?`Rs.${lSell.toLocaleString()}`:'—')) : '🚫 Hidden'}</b></div>
            {discAmt > 0 && <div style={{color:C.danger}}>Discount: <b>− Rs. {discAmt.toLocaleString()}</b></div>}
            <div>Total: <b>Rs. {(cUseCustom||discAmt>0?customTotal:origTotal).toLocaleString()}</b></div>
            {cGifts.filter(g=>g.name).length > 0 && (
              <div style={{color:'#15803d', gridColumn:'1/-1'}}>🎁 {cGifts.filter(g=>g.name).length} free gift(s) highlighted on bill</div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'11px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
            Cancel
          </button>
          <button onClick={handlePrint}
            style={{ flex:2, padding:'11px', background:C.gold, color:C.navy, border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            🖨️ Print Bill
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const [orders,    setOrders]    = useState([]);
  const [filter,       setFilter]      = useState('all');
  const [dateFilter,   setDateFilter]   = useState('all');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [search,       setSearch]       = useState('');
  const [missingCosts, setMissingCosts] = useState(false);

  // Read URL params from dashboard KPI clicks and Warranty page
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const f    = p.get('filter');
    const m    = p.get('month');
    const open = p.get('open'); // order_number to auto-open from Warranty page
    if (f === 'balance')   { setFilter('balance_due'); }
    if (f === 'active')    { setFilter('created'); }
    if (f === 'collected') { setFilter('delivered'); }
    if (m)                 { setDateFilter('month'); }
    if (open) {
      // Wait for orders to load then open matching order
      const tryOpen = () => {
        setOrders(prev => {
          const match = prev.find(o => o.order_number === open);
          if (match) {
            setSelected(match);
            setSearch(open);
          }
          return prev;
        });
      };
      setTimeout(tryOpen, 800);
    }
  }, [location.search]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [logNote,   setLogNote]   = useState('');
  const [showPrint,    setShowPrint]    = useState(false);
  const [showBillOpts, setShowBillOpts] = useState(false); // custom bill options modal
  const [billCustom,   setBillCustom]   = useState(null);  // custom bill overrides
  const [showPay,      setShowPay]      = useState(false);
  const [showLensCost,  setShowLensCost]  = useState(false);
  const [lensCostForm,  setLensCostForm]  = useState({ frameBuy:'', lensBuy:'', lensSell:'', company:'' });
  const [savingLens,    setSavingLens]    = useState(false);
  const [bankReceipt,   setBankReceipt]   = useState(null);   // linked bank receipt
  const [showEditBank,  setShowEditBank]  = useState(false);  // edit/cancel bank receipt
  const [bankEditAmt,   setBankEditAmt]   = useState('');
  const [showGifts,    setShowGifts]    = useState(false);
  const [giftSearch,   setGiftSearch]   = useState('');
  const [giftResults,  setGiftResults]  = useState([]);
  const [giftItems,    setGiftItems]    = useState([]);
  const [savingGifts,  setSavingGifts]  = useState(false);
  const [toast,        setToast]        = useState('');
  const [showEdit,       setShowEdit]       = useState(false);
  const [editForm,       setEditForm]       = useState({});
  const [savingEdit,     setSavingEdit]     = useState(false);
  const [showPriceCheck, setShowPriceCheck] = useState(false);
  const navigate = useNavigate();

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 3500); };

  const load = useCallback(() => {
    setLoading(true);
    getOrders({ status: (filter!=='all'&&filter!=='balance_due')?filter:undefined, search:search||undefined })
      .then(r => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  // Client-side date filter
  const filteredOrders = orders.filter(o => {
    // Custom date range
    if (dateFilter === 'custom') {
      const d = new Date(o.created_at);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo   && d > new Date(dateTo + 'T23:59:59')) return false;
    } else {
      const cutoff = getDateRange(dateFilter);
      if (cutoff && new Date(o.created_at) < cutoff) return false;
    }
    if (missingCosts) {
      const noFrameCost = !parseFloat(o.frame_buy_price) && !o.customer_own_frame;
      const noLensCost  = !parseFloat(o.lens_buy_price);
      return noFrameCost || noLensCost;
    }
    if (filter === 'balance_due') return parseFloat(o.balance_amount) > 0;
    return true;
  });

  const openOrder = async (id) => {
    try {
      const r = await getOrder(id);
      setSelected(r.data);
      setBankReceipt(null); setShowEditBank(false);
      if (r.data?.payment_method && r.data.payment_method !== 'cash') {
        const BASE_  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const token_ = localStorage.getItem('ko_token');
        fetch(`${BASE_}/cash-deposits/by-order/${id}`,{ headers:{ Authorization:`Bearer ${token_}` }})
          .then(res=>res.json()).then(d=>{ if(d?.id) setBankReceipt(d); }).catch(()=>{});
      }
    } catch(e) { setSelected(orders.find(o=>o.id===id)||null); }
  };

  const handleStatus = async (id, status) => {
    // When marking as delivered, save the actual delivered date
    const updates = { status };
    if (status === 'delivered') {
      updates.deliver_date = new Date().toISOString().split('T')[0];
    }
    await updateOrder(id, updates);
    load();
    setSelected(s => s ? { ...s, ...updates } : s);
  };

  const handleLensStep = async (id, lens_step) => {
    await updateOrder(id, { lens_step });
    // lens_step 3 = Received — notify staff to call customer
    if (lens_step === 3) {
      const order = orders.find(o=>o.id===id) || selected;
      showToast(`Lens received for ${order?.order_number||'order'} — call ${order?.customer_name||'customer'} to collect`);
    }
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
    if (!selected || !window.confirm(`Delete order ${selected.order_number}?`)) return;
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

  const handleLensCostSave = async () => {
    if (!selected) return;
    setSavingLens(true);
    try {
      const updates = {};
      if (lensCostForm.frameBuy !== '') updates.frame_buy_price = parseFloat(lensCostForm.frameBuy)||0;
      if (lensCostForm.lensBuy  !== '') updates.lens_buy_price  = parseFloat(lensCostForm.lensBuy)||0;
      if (lensCostForm.lensSell !== '') updates.lens_sell_price = parseFloat(lensCostForm.lensSell)||0;
      if (lensCostForm.company)         updates.lens_company    = lensCostForm.company;
      if (!Object.keys(updates).length) return;
      await updateOrder(selected.id, updates);
      // Recalculate total if lens sell price changed
      if (updates.lens_sell_price) {
        const newTotal   = parseFloat(selected.frame_sell_price||0) + parseFloat(updates.lens_sell_price);
        const newBalance = Math.max(0, newTotal - parseFloat(selected.advance_amount||0));
        await updateOrder(selected.id, { total_amount: newTotal, balance_amount: newBalance });
      }
      showToast('Costs updated ✓');
      setShowLensCost(false);
      const r = await getOrder(selected.id);
      setSelected(r.data);
      load();

      // Auto-save to lens price list if both buy and sell are entered
      if (updates.lens_buy_price > 0 && updates.lens_sell_price > 0) {
        try {
          const BASE_ = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
          const tok_  = localStorage.getItem('ko_token');
          await fetch(`${BASE_}/lens-prices/learn`, {
            method: 'POST',
            headers: { 'Content-Type':'application/json', Authorization:`Bearer ${tok_}` },
            body: JSON.stringify({
              brand:      lensCostForm.company || selected.lens_company || 'Generic',
              lens_type:  selected.lens_type   || 'Single Vision',
              lens_index: selected.lens_index  || null,
              color:      'White',
              coating:    selected.lens_coating || '',
              buy_price:  updates.lens_buy_price,
              sell_price: updates.lens_sell_price,
              notes:      `Learned from order ${selected.order_number}`,
            }),
          });
          showToast('Costs updated ✓ — lens price list updated');
        } catch(e2) { /* non-critical */ }
      }
    } catch(e) { showToast('Failed to update'); }
    finally { setSavingLens(false); }
  };

  const searchGiftItems = async (q) => {
    if (!q || q.length < 2) return setGiftResults([]);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/inventory?search=${encodeURIComponent(q)}&limit=8&no_images=1`, { headers:{ Authorization:`Bearer ${token}` } });
      const data  = await res.json();
      setGiftResults(Array.isArray(data)?data:data.data||[]);
    } catch { setGiftResults([]); }
  };

  const handleSaveGifts = async () => {
    if (!giftItems.length) return;
    setSavingGifts(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      // Deduct stock for each gift item
      for (const gi of giftItems) {
        await fetch(`${BASE}/stock-adjustments`, {
          method:'POST',
          headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
          body: JSON.stringify({
            inventory_id:  gi.id,
            change_type:   'remove',
            quantity_change: gi.qty,
            reason: `Free gift with order ${selected?.order_number}`,
          }),
        });
      }
      // Save gift note on order
      const giftNote = giftItems.map(g=>`${g.name} ×${g.qty}`).join(', ');
      const existing = selected?.notes ? selected.notes + '\n' : '';
      await updateOrder(selected.id, { notes: existing + `Gifts given: ${giftNote}` });
      showToast(`Gifts recorded — stock deducted`);
      setShowGifts(false);
      setGiftItems([]);
      setGiftSearch('');
      setGiftResults([]);
      const r = await getOrder(selected.id);
      setSelected(r.data);
      load();
    } catch(e) { showToast('Failed to save gifts'); }
    finally { setSavingGifts(false); }
  };

  const handlePaymentSaved = async (msg) => {
    setShowPay(false);
    showToast(msg);
    const r = await getOrder(selected.id);
    setSelected(r.data);
    load();
  };

  const INP = { padding:'10px 14px', border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, fontFamily:'inherit', outline:'none', background:C.surface, color:'var(--text,#111827)', transition:'border-color .15s' };

  return (
    <div style={{ fontFamily:"'Inter','DM Sans',sans-serif", maxWidth:1400, padding:'0 4px' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:C.navy, color:'white', padding:'13px 20px', borderRadius:12, fontSize:14, fontWeight:600, borderLeft:`4px solid ${C.gold}`, zIndex:500, boxShadow:'0 4px 20px rgba(0,0,0,.2)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:C.navy, margin:'0 0 4px' }}>Orders</h1>
          <p style={{ fontSize:13, color:C.muted, margin:0 }}>Manage customer orders and lens jobs</p>
        </div>
        <div style={{ display:'flex', gap:10, flexShrink:0 }}>
          <button onClick={()=>setShowPriceCheck(true)}
            style={{ padding:'9px 18px', background:C.cream, color:C.navy,
              border:`1.5px solid ${C.gold}`, borderRadius:9, fontSize:13,
              fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            💰 Price Check
          </button>
          <button onClick={()=>navigate('/orders/new')}
            style={{ padding:'9px 20px', background:C.gold, color:C.navy, border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + New Order
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom:10 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search name, phone, order #..."
          style={{ ...INP, width:'100%' }}/>
      </div>

      {/* Date filter chips */}
      <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
        {DATE_FILTERS.map(df=>(
          <button key={df.key} onClick={()=>{ setDateFilter(df.key); if(df.key!=='custom'){setDateFrom('');setDateTo('');} }}
            style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
              border:`1.5px solid ${dateFilter===df.key?C.navy:C.border}`,
              background:dateFilter===df.key?C.navy:'white',
              color:dateFilter===df.key?'white':C.muted }}>
            {df.label}
          </button>
        ))}
        <button onClick={()=>setDateFilter('custom')}
          style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
            border:`1.5px solid ${dateFilter==='custom'?C.gold:C.border}`,
            background:dateFilter==='custom'?'#fef9f0':'white',
            color:dateFilter==='custom'?'#92400e':C.muted }}>
          📅 Custom Range
        </button>
        {dateFilter==='custom' && (
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', width:'100%', marginTop:6 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:12, color:C.muted, fontWeight:600 }}>From</span>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                style={{ padding:'6px 10px', border:`1.5px solid ${C.gold}`, borderRadius:8, fontSize:13,
                  fontFamily:'inherit', outline:'none', background:'#fef9f0', color:C.navy, cursor:'pointer' }}/>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:12, color:C.muted, fontWeight:600 }}>To</span>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                style={{ padding:'6px 10px', border:`1.5px solid ${C.gold}`, borderRadius:8, fontSize:13,
                  fontFamily:'inherit', outline:'none', background:'#fef9f0', color:C.navy, cursor:'pointer' }}/>
            </div>
            {(dateFrom||dateTo) && (
              <button onClick={()=>{ setDateFrom(''); setDateTo(''); }}
                style={{ padding:'5px 10px', background:'#fee2e2', border:'none', borderRadius:8,
                  fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.danger }}>
                ✕ Clear
              </button>
            )}
            <span style={{ fontSize:11, color:C.muted }}>
              {dateFrom&&dateTo ? `${new Date(dateFrom).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} – ${new Date(dateTo).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}` : 'Pick date range'}
            </span>
          </div>
        )}
        <button onClick={()=>setMissingCosts(s=>!s)}
          style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
            border:`1.5px solid ${missingCosts?'#f97316':C.border}`,
            background:missingCosts?'#fff7ed':'white',
            color:missingCosts?'#c2410c':C.muted }}>
          {missingCosts ? '⚠️ Missing Costs ✓' : '⚠️ Missing Costs'}
        </button>
        <span style={{ fontSize:12, color:C.muted, alignSelf:'center', marginLeft:4 }}>
          {filteredOrders.length} order{filteredOrders.length!==1?'s':''}
          {missingCosts && <span style={{ marginLeft:6, color:'#c2410c', fontWeight:700 }}>— need costs entered</span>}
        </span>
      </div>

      {/* Status filter chips */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
        {STATUSES.map(s=>(
          <button key={s} onClick={()=>setFilter(s)}
            style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
              border:`1.5px solid ${filter===s?C.gold:C.border}`,
              background:filter===s?C.gold:'white',
              color:filter===s?C.navy:C.muted }}>
            {s==='balance_due'?'💰 Balance Due':s==='all'?'All':s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      {/* Order list with row numbers */}
      {loading
        ? <p style={{ color:C.muted, fontSize:13, padding:'20px 0' }}>Loading orders...</p>
        : !filteredOrders.length
          ? <p style={{ color:C.muted, fontSize:13, padding:'20px 0' }}>No orders found</p>
          : filteredOrders.map((o, idx) => (
            <div key={o.id} onClick={()=>openOrder(o.id)}
              style={{ background:'white', border:`1.5px solid ${selected?.id===o.id?C.gold:o.status==='overdue'?'#fca5a5':C.border}`,
                borderLeft:o.status==='overdue'?`4px solid ${C.danger}`:undefined,
                borderRadius:14, padding:'14px 16px', marginBottom:8, cursor:'pointer', transition:'border-color .15s',
                display:'flex', gap:12, alignItems:'flex-start' }}>

              {/* Row number — chronological (1=oldest, N=newest) */}
              <div style={{ width:28, height:28, borderRadius:'50%', background:C.cream, border:`1px solid ${C.border}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:700, color:C.muted, flexShrink:0, marginTop:2 }}>
                {filteredOrders.length - idx}
              </div>

              {/* Content */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:C.muted }}>{o.order_number}</span>
                    <Badge status={o.status}/>
                    {o.has_rx && !o.rx_returned && (
                      <span style={{ background:'#e0f2fe', color:'#0369a1', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>Rx</span>
                    )}
                    {(o.warranty_frame || o.warranty_lens) && (
                      <span style={{ background:'#dcfce7', color:'#15803d', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}
                        title={[o.warranty_frame && '🖼️ Frame: '+o.warranty_frame, o.warranty_lens && '👁️ Lens: '+o.warranty_lens].filter(Boolean).join(' · ')}>
                        🛡️ Warranty
                      </span>
                    )}
                    {(!parseFloat(o.lens_buy_price) || (!parseFloat(o.frame_buy_price) && !o.customer_own_frame)) && (
                      <span style={{ background:'#fff7ed', color:'#c2410c', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, border:'1px solid #fed7aa' }}>
                        ⚠️ No cost
                      </span>
                    )}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', flexShrink:0, gap:2 }}>
                    <span style={{ fontSize:11, color:C.muted }}>📅 {o.created_at?.slice(0,10)}</span>
                    {o.deliver_date && (
                      <span style={{ fontSize:11, fontWeight:600,
                        color: new Date(o.deliver_date) < new Date() && o.status !== 'delivered' ? C.danger : C.success }}>
                        📦 {o.deliver_date.slice(0,10)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize:15, fontWeight:600, color:C.navy, marginBottom:4 }}>{o.customer_name}</div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  <span style={{ fontSize:12, color:C.muted }}>{o.phone}</span>
                  <span style={{ fontSize:12, color:C.muted }}>{o.frame||'—'}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:parseFloat(o.balance_amount)>0?C.danger:C.success }}>
                    Balance: {fmtMoney(o.balance_amount)}
                  </span>
                </div>
              </div>
            </div>
          ))
      }

      {/* Detail panel */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.45)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}
          onClick={e=>{ if(e.target===e.currentTarget) setSelected(null); }}>
          <div style={{ background:'white', width:'100%', maxWidth:480, height:'100vh', overflowY:'auto', padding:24, boxShadow:'-8px 0 40px rgba(0,0,0,.18)' }}>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:12, color:C.muted, fontWeight:700, marginBottom:2 }}>{selected.order_number}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.navy }}>{selected.customer_name}</div>
                <div style={{ fontSize:13, color:C.muted }}>📞 {selected.phone} · Age {selected.age}</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>{ setEditForm(selected); setShowEdit(true); }}
                  style={{ background:'#eff6ff', border:'1.5px solid #93c5fd', borderRadius:8, padding:'6px 14px', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:'#1e40af', fontWeight:700 }}>
                  ✏️ Edit
                </button>
                <button onClick={()=>setSelected(null)} style={{ background:C.cream, border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted, fontWeight:600 }}>✕ Close</button>
              </div>
            </div>

            {/* Status */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>Order Status</div>
              <div style={{ display:'flex', gap:8 }}>
                {['created','called','delivered'].map(s=>{
                  const st=STATUS_STYLE[s];
                  return (
                    <button key={s} onClick={()=>handleStatus(selected.id,s)}
                      style={{ flex:1, padding:'9px 8px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`2px solid ${selected.status===s?C.navy:C.border}`, background:selected.status===s?st.bg:'white', color:st.color }}>
                      {s==='created'?'Created':s==='called'?'Called':'Delivered'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lens job */}
            {selected.lens_company && selected.lens_company!=='In-Shop' && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>
                  Lens Job — {selected.lens_company}
                </div>
                <div style={{ background:C.cream, borderRadius:10, padding:14 }}>
                  <div style={{ display:'flex' }}>
                    {['Sent','Grinding','Ready','Received'].map((label,i)=>(
                      <div key={i} onClick={()=>handleLensStep(selected.id,i)}
                        style={{ flex:1, textAlign:'center', padding:'8px 4px', fontSize:11, fontWeight:600, cursor:'pointer',
                          color:i<(selected.lens_step||0)?C.success:i===(selected.lens_step||0)?C.navy:'#9ca3af',
                          borderBottom:`3px solid ${i<(selected.lens_step||0)?C.success:i===(selected.lens_step||0)?C.gold:C.border}` }}>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Payment */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>Payment</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                {[
                  { l:'Frame price', v:fmtMoney(selected.frame_sell_price||selected.total_amount) },
                  { l:'Lens price',  v:fmtMoney(selected.lens_sell_price||0) },
                  { l:'Total',       v:fmtMoney(selected.total_amount), bold:true },
                  { l:'Advance paid',v:fmtMoney(selected.advance_amount) },
                ].map(item=>(
                  <div key={item.l} style={{ background:C.cream, borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:3 }}>{item.l}</div>
                    <div style={{ fontSize:13, fontWeight:item.bold?700:600, color:C.navy }}>{item.v}</div>
                  </div>
                ))}
              </div>
              {/* Card payment 3% charge breakdown */}
              {selected.payment_method === 'card' && parseFloat(selected.advance_amount) > 0 && (() => {
                const gross  = parseFloat(selected.advance_amount || 0);
                const charge = Math.round(gross * 0.03 * 100) / 100;
                const net    = gross - charge;
                return (
                  <div style={{ background:'#eff6ff', border:'1.5px solid #93c5fd', borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'#1e40af', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                      💳 Card Payment — 3% Bank Charge Applied
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:4, fontSize:13 }}>
                      <span style={{ color:'#374151' }}>Customer paid (gross)</span>
                      <span style={{ fontWeight:700, color:'#1e40af', textAlign:'right' }}>{fmtMoney(gross)}</span>
                      <span style={{ color:'#dc2626' }}>Bank deducts 3%</span>
                      <span style={{ fontWeight:700, color:'#dc2626', textAlign:'right' }}>− {fmtMoney(charge)}</span>
                      <div style={{ gridColumn:'1/-1', borderTop:'1px dashed #93c5fd', margin:'4px 0' }}/>
                      <span style={{ fontWeight:700, color:'#15803d' }}>Net credited to bank account</span>
                      <span style={{ fontWeight:700, color:'#15803d', textAlign:'right' }}>{fmtMoney(net)}</span>
                    </div>
                    <div style={{ fontSize:11, color:'#6b7280', marginTop:8, background:'rgba(147,197,253,.15)', padding:'6px 10px', borderRadius:6 }}>
                      ✓ Deposit recorded in Bank Deposits with card charge note
                    </div>
                  </div>
                );
              })()}
              <div style={{ background:parseFloat(selected.balance_amount)>0?'#fee2e2':'#dcfce7', borderRadius:10, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:parseFloat(selected.balance_amount)>0?C.danger:C.success, marginBottom:3 }}>Balance Due</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:parseFloat(selected.balance_amount)>0?C.danger:C.success }}>
                    {fmtMoney(selected.balance_amount)}
                  </div>
                  {selected.last_payment_date && (
                    <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
                      Last paid: {(() => { const r = selected.last_payment_date; const d = new Date(r.includes('T') ? r : r + 'T00:00:00'); return isNaN(d) ? r : d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); })()}
                      {selected.last_payment_method && ` · ${selected.last_payment_method}`}
                    </div>
                  )}
                </div>
                {parseFloat(selected.balance_amount)>0
                  ? <button onClick={()=>setShowPay(true)} style={{ padding:'10px 18px', background:C.success, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Record Payment</button>
                  : <span style={{ fontSize:13, fontWeight:700, color:C.success }}>Fully paid</span>
                }
              </div>
            </div>

            {/* Bank Receipt Status — shows if order was paid by bank/card */}
            {(selected.payment_method && selected.payment_method !== 'cash') && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:10, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>
                  Bank / Card Receipt
                </div>
                {bankReceipt ? (
                  <div style={{ background:'#eff6ff', border:'1px solid #bae6fd', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:'#1e40af', marginBottom:2 }}>
                          ✅ Bank receipt recorded automatically
                        </div>
                        <div style={{ fontSize:12, color:'#3b82f6' }}>
                          {bankReceipt.payment_type?.toUpperCase()} · {new Date(bankReceipt.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
                          {bankReceipt.bank_name ? ` · ${bankReceipt.bank_name}` : ''}
                        </div>
                      </div>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:'#1e40af' }}>
                        {fmtMoney(bankReceipt.amount)}
                      </div>
                    </div>
                    {!showEditBank ? (
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={()=>{ setShowEditBank(true); setBankEditAmt(String(bankReceipt.amount)); }}
                          style={{ padding:'6px 14px', background:'white', border:'1px solid #93c5fd', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'#1e40af' }}>
                          ✏️ Edit Amount
                        </button>
                        <button onClick={async()=>{
                          if(!window.confirm('Remove this bank receipt? The payment method on the order stays the same.')) return;
                          const BASE_=process.env.REACT_APP_API_URL||'http://localhost:5000/api';
                          const tk_=localStorage.getItem('ko_token');
                          await fetch(`${BASE_}/cash-deposits/${bankReceipt.id}`,{method:'DELETE',headers:{Authorization:`Bearer ${tk_}`}});
                          setBankReceipt(null);
                          showToast('Bank receipt removed');
                        }}
                          style={{ padding:'6px 14px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.danger }}>
                          ✕ Cancel Receipt
                        </button>
                      </div>
                    ) : (
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:8 }}>
                        <input type="number" value={bankEditAmt} onChange={e=>setBankEditAmt(e.target.value)}
                          style={{ flex:1, padding:'8px 12px', border:'1.5px solid #93c5fd', borderRadius:8, fontSize:14, fontWeight:700, fontFamily:'inherit', outline:'none' }}/>
                        <button onClick={async()=>{
                          const BASE_=process.env.REACT_APP_API_URL||'http://localhost:5000/api';
                          const tk_=localStorage.getItem('ko_token');
                          const r=await fetch(`${BASE_}/cash-deposits/${bankReceipt.id}`,{
                            method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${tk_}`},
                            body:JSON.stringify({amount:parseFloat(bankEditAmt)})
                          }).then(r=>r.json());
                          setBankReceipt(r); setShowEditBank(false);
                          showToast('Bank receipt updated');
                        }}
                          style={{ padding:'8px 16px', background:'#1e40af', color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                          Save
                        </button>
                        <button onClick={()=>setShowEditBank(false)}
                          style={{ padding:'8px 12px', background:'white', border:'1px solid #93c5fd', borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ background:'#fef9c3', border:'1px solid #fde68a', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#92400e', marginBottom:8 }}>
                      ⚠️ No bank receipt found for this {selected.payment_method} payment
                    </div>
                    <button onClick={async()=>{
                      const BASE_=process.env.REACT_APP_API_URL||'http://localhost:5000/api';
                      const tk_=localStorage.getItem('ko_token');
                      const r=await fetch(`${BASE_}/cash-deposits`,{
                        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${tk_}`},
                        body:JSON.stringify({
                          amount:      parseFloat(selected.advance_amount||0),
                          payment_type:selected.payment_method,
                          bank_name:   'Pan Asia Bank',
                          notes:       'Manual: Order ' + selected.order_number,
                          order_id:    selected.id,
                          date:        selected.created_at?.slice(0,10),
                        })
                      }).then(r=>r.json());
                      setBankReceipt(r);
                      showToast('Bank receipt created');
                    }}
                      style={{ padding:'8px 16px', background:'#1e40af', color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      + Create Bank Receipt
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Cost of Goods */}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted }}>Cost of Goods</div>
                <button onClick={()=>{ setShowLensCost(s=>!s); setLensCostForm({ frameBuy:selected.frame_buy_price||'', lensBuy:selected.lens_buy_price||'', lensSell:selected.lens_sell_price||'', company:selected.lens_company||'' }); }}
                  style={{ padding:'4px 12px', background:showLensCost?'#fee2e2':'#eff6ff', color:showLensCost?C.danger:'#1e40af', border:`1px solid ${showLensCost?'#fca5a5':'#93c5fd'}`, borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {showLensCost?'✕ Cancel':'✏️ Update Costs'}
                </button>
              </div>

              {/* Current cost summary — frame + lens */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, marginBottom:showLensCost?10:0 }}>
                {selected.customer_own_frame ? (
                  <div style={{ background:'#f0fdf4', borderRadius:8, padding:'8px 10px', border:'1px solid #86efac' }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:2 }}>Frame Buy</div>
                    <div style={{ fontSize:11, fontWeight:700, color:C.success }}>Customer Frame</div>
                  </div>
                ) : (
                <div style={{ background:parseFloat(selected.frame_buy_price)>0?C.cream:'#fef9c3', borderRadius:8, padding:'8px 10px', border:parseFloat(selected.frame_buy_price)>0?'none':'1px solid #fde68a' }}>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:2 }}>Frame Buy</div>
                  <div style={{ fontSize:12, fontWeight:700, color:parseFloat(selected.frame_buy_price)>0?C.success:'#92400e' }}>
                    {parseFloat(selected.frame_buy_price)>0?fmtMoney(selected.frame_buy_price):'Not set'}
                  </div>
                </div>
                )}
                <div style={{ background:parseFloat(selected.lens_buy_price)>0?C.cream:'#fef9c3', borderRadius:8, padding:'8px 10px', border:parseFloat(selected.lens_buy_price)>0?'none':'1px solid #fde68a' }}>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:2 }}>Lens Buy</div>
                  <div style={{ fontSize:12, fontWeight:700, color:parseFloat(selected.lens_buy_price)>0?C.success:'#92400e' }}>
                    {parseFloat(selected.lens_buy_price)>0?fmtMoney(selected.lens_buy_price):'Not set'}
                  </div>
                </div>
                <div style={{ background:C.cream, borderRadius:8, padding:'8px 10px' }}>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:2 }}>Total COGS</div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.navy }}>
                    {fmtMoney((selected.customer_own_frame?0:parseFloat(selected.frame_buy_price)||0)+(parseFloat(selected.lens_buy_price)||0))}
                  </div>
                </div>
                <div style={{ background:C.cream, borderRadius:8, padding:'8px 10px' }}>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:2 }}>Lab</div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.navy }}>{selected.lens_company||'—'}</div>
                </div>
              </div>

              {/* Update form */}
              {showLensCost && (
                <div style={{ background:'#eff6ff', border:`1px solid #93c5fd`, borderRadius:10, padding:'14px 16px' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#1e40af', marginBottom:6 }}>
                    Enter frame cost from your receipt + lens cost from lab bill
                  </div>
                  <div style={{ fontSize:11, color:'#92400e', background:'#fef9c3', borderRadius:7, padding:'6px 10px', marginBottom:12 }}>
                    ⚠️ Only enter frame cost here for <b>old orders or orders where frame is not in inventory</b>. If frame was selected from inventory, cost is already set automatically.
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                    {selected.customer_own_frame ? (
                      <div style={{ background:'#f0fdf4', border:'1.5px solid #86efac', borderRadius:8, padding:'9px 12px' }}>
                        <div style={{ fontSize:10, fontWeight:700, color:C.success }}>Customer's own frame</div>
                        <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>No frame cost needed</div>
                      </div>
                    ) : (
                    <div>
                      <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Frame Buy Price (Rs.)</label>
                      <input type="number" value={lensCostForm.frameBuy} onChange={e=>setLensCostForm(f=>({...f,frameBuy:e.target.value}))}
                        placeholder="What you paid for frame"
                        style={{ width:'100%', padding:'9px 12px', border:`1.5px solid #86efac`, borderRadius:8, fontSize:14, fontWeight:700, fontFamily:'inherit', outline:'none', background:'white', color:C.navy }}/>
                      <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>From dealer / Kalutota receipt</div>
                    </div>
                    )}
                    <div>
                      <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Lens Buy Price (Rs.)</label>
                      <input type="number" value={lensCostForm.lensBuy} onChange={e=>setLensCostForm(f=>({...f,lensBuy:e.target.value}))}
                        placeholder="What lab charged you"
                        style={{ width:'100%', padding:'9px 12px', border:`1.5px solid #93c5fd`, borderRadius:8, fontSize:14, fontWeight:700, fontFamily:'inherit', outline:'none', background:'white', color:C.navy }}/>
                      <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>Negombo Optical / Solex bill</div>
                    </div>
                    <div>
                      <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Lens Sell Price (Rs.)</label>
                      <input type="number" value={lensCostForm.lensSell} onChange={e=>setLensCostForm(f=>({...f,lensSell:e.target.value}))}
                        placeholder="What you charge customer"
                        style={{ width:'100%', padding:'9px 12px', border:`1.5px solid #93c5fd`, borderRadius:8, fontSize:14, fontWeight:700, fontFamily:'inherit', outline:'none', background:'white', color:C.navy }}/>
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Lab / Supplier</label>
                      <input value={lensCostForm.company} onChange={e=>setLensCostForm(f=>({...f,company:e.target.value}))}
                        placeholder="e.g. Negombo Optical, Solex..."
                        style={{ width:'100%', padding:'9px 12px', border:`1.5px solid #93c5fd`, borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:'white', color:C.navy }}/>
                    </div>
                  </div>
                  {lensCostForm.buy && lensCostForm.sell && (
                    <div style={{ background:'white', borderRadius:7, padding:'8px 12px', marginBottom:10, fontSize:12 }}>
                      Margin: <b style={{ color:parseFloat(lensCostForm.sell)-parseFloat(lensCostForm.buy)>0?C.success:C.danger }}>
                        Rs.{(parseFloat(lensCostForm.sell||0)-parseFloat(lensCostForm.buy||0)).toLocaleString()}
                        {' '}({Math.round((parseFloat(lensCostForm.sell||0)-parseFloat(lensCostForm.buy||0))/parseFloat(lensCostForm.sell||1)*100)}%)
                      </b>
                      {lensCostForm.sell !== String(selected.lens_sell_price) && (
                        <span style={{ marginLeft:10, color:'#92400e', fontSize:11 }}>
                          ⚠️ Sell price change will recalculate order total & balance
                        </span>
                      )}
                    </div>
                  )}
                  <button onClick={handleLensCostSave} disabled={savingLens}
                    style={{ padding:'10px 22px', background:savingLens?C.muted:'#1e40af', color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:savingLens?'not-allowed':'pointer', fontFamily:'inherit' }}>
                    {savingLens?'Saving...':'💾 Save Costs'}
                  </button>
                </div>
              )}
            </div>

            {/* Details */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>Details</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  { l:'Frame',   v:selected.frame },
                  { l:'Lens',    v:selected.lens_type },
                  { l:'Coating', v:printCoating(selected.lens_coating) },
                  { l:'Deliver', v:selected.deliver_date?.slice(0,10) },
                ].map(item=>(
                  <div key={item.l} style={{ background:C.cream, borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:3 }}>{item.l}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{item.v||'—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prescription */}
            {selected.has_rx && (
              <div style={{ marginBottom:20, background:'#e0f2fe', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:12, color:'#0369a1', fontWeight:700, marginBottom:4 }}>Prescription from {selected.rx_hospital||'hospital'}</div>
                {selected.rx_returned
                  ? <span style={{ fontSize:11, color:C.success }}>Returned to customer</span>
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
                        <tr key={row[0]}>{row.map((v,i)=><td key={i} style={{ padding:'6px 8px', textAlign:'center', border:`1px solid ${C.border}`, fontWeight:i===0?700:400, color:C.navy, background:i===0?C.cream:'white' }}>{v||'—'}</td>)}</tr>
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
                      {l.note} <span style={{ color:'#9ca3af', marginLeft:8 }}>· {new Date(l.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>
                    </div>
                  ))
                  : <div style={{ fontSize:12, color:'#9ca3af' }}>No calls logged yet</div>
                }
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={logNote} onChange={e=>setLogNote(e.target.value)} placeholder="Add call note..."
                  style={{ flex:1, padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream }}
                  onKeyDown={e=>e.key==='Enter'&&handleAddLog()}/>
                <button onClick={handleAddLog} style={{ padding:'8px 14px', background:C.navy, color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Add</button>
              </div>
            </div>

            {/* Free Gifts */}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${C.cream}` }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted }}>Free Gifts</div>
                <button onClick={()=>{ setShowGifts(s=>!s); setGiftItems([]); setGiftSearch(''); setGiftResults([]); }}
                  style={{ padding:'4px 12px', background:showGifts?'#fee2e2':'#f0fdf4', color:showGifts?C.danger:'#166534', border:`1px solid ${showGifts?'#fca5a5':'#86efac'}`, borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {showGifts?'✕ Cancel':'+ Add Gift'}
                </button>
              </div>

              {/* Show existing gift notes */}
              {selected.notes?.includes('Gifts given:') && (
                <div style={{ background:'#f0fdf4', border:`1px solid #86efac`, borderRadius:8, padding:'8px 12px', marginBottom:showGifts?10:0, fontSize:12, color:'#166534' }}>
                  {selected.notes.split('\n').filter(l=>l.startsWith('Gifts given:')).map((l,i)=>(
                    <div key={i}>🎁 {l.replace('Gifts given: ','')}</div>
                  ))}
                </div>
              )}

              {showGifts && (
                <div style={{ background:'#f0fdf4', border:`1px solid #86efac`, borderRadius:10, padding:'14px' }}>
                  <div style={{ fontSize:12, color:'#166534', fontWeight:700, marginBottom:10 }}>
                    Search items to give as free gift — stock will be deducted automatically
                  </div>

                  {/* Search */}
                  <div style={{ position:'relative', marginBottom:10 }}>
                    <input value={giftSearch}
                      onChange={e=>{ setGiftSearch(e.target.value); searchGiftItems(e.target.value); }}
                      placeholder="Search: lens cleaner, chain, pouch, box..."
                      style={{ width:'100%', padding:'9px 12px', border:`1.5px solid #86efac`, borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:'white', color:C.navy, boxSizing:'border-box' }}/>
                    {giftResults.length>0 && (
                      <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:`1px solid #86efac`, borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,.1)', zIndex:50, overflow:'hidden', marginTop:4 }}>
                        {giftResults.map(item=>(
                          <div key={item.id}
                            onMouseDown={()=>{
                              if (!giftItems.find(g=>g.id===item.id)) {
                                setGiftItems(p=>[...p,{ id:item.id, name:item.name||item.item_name, qty:1, stock:item.quantity }]);
                              }
                              setGiftSearch(''); setGiftResults([]);
                            }}
                            style={{ padding:'9px 12px', cursor:'pointer', borderBottom:`1px solid #f0fdf4`, display:'flex', justifyContent:'space-between', alignItems:'center' }}
                            onMouseEnter={e=>e.currentTarget.style.background='#f0fdf4'}
                            onMouseLeave={e=>e.currentTarget.style.background='white'}>
                            <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>{item.name||item.item_name}</span>
                            <span style={{ fontSize:11, color:item.quantity>0?C.success:C.danger, fontWeight:600 }}>
                              {item.quantity} in stock
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected gift items */}
                  {giftItems.length>0 && (
                    <div style={{ marginBottom:10 }}>
                      {giftItems.map((gi,i)=>(
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, background:'white', borderRadius:7, padding:'7px 10px', marginBottom:6, border:`1px solid #86efac` }}>
                          <span style={{ flex:1, fontSize:13, fontWeight:600, color:'#166534' }}>🎁 {gi.name}</span>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <button onClick={()=>setGiftItems(p=>p.map((x,j)=>j===i?{...x,qty:Math.max(1,x.qty-1)}:x))}
                              style={{ width:24, height:24, border:`1px solid #86efac`, borderRadius:5, background:'white', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }}>−</button>
                            <span style={{ fontSize:13, fontWeight:700, minWidth:20, textAlign:'center' }}>{gi.qty}</span>
                            <button onClick={()=>setGiftItems(p=>p.map((x,j)=>j===i?{...x,qty:Math.min(x.stock,x.qty+1)}:x))}
                              style={{ width:24, height:24, border:`1px solid #86efac`, borderRadius:5, background:'white', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }}>+</button>
                          </div>
                          <span style={{ fontSize:11, color:C.muted }}>/{gi.stock}</span>
                          <button onClick={()=>setGiftItems(p=>p.filter((_,j)=>j!==i))}
                            style={{ background:'#fee2e2', color:C.danger, border:'none', borderRadius:5, padding:'3px 8px', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick pick common gifts */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, color:'#166534', fontWeight:600, marginBottom:6 }}>Quick add common gifts:</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {['Lens Cleaner','Chain','Temple Tip','Box','Pouch','Cloth'].map(name=>(
                        <button key={name} onClick={()=>searchGiftItems(name)}
                          style={{ padding:'4px 10px', background:'white', border:`1px solid #86efac`, borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:'#166534' }}>
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleSaveGifts} disabled={savingGifts||!giftItems.length}
                    style={{ width:'100%', padding:'10px', background:savingGifts||!giftItems.length?C.muted:'#166534', color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:savingGifts||!giftItems.length?'not-allowed':'pointer', fontFamily:'inherit' }}>
                    {savingGifts?'Saving...':giftItems.length?`Save ${giftItems.length} Gift Item${giftItems.length>1?'s':''}  — Deduct from Stock`:'Search and add items above'}
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:16, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
              <button onClick={()=>{ setBillCustom(null); setShowBillOpts(true); }} style={{ padding:'10px 16px', background:C.gold, color:C.navy, border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>🖨️ Print Bill</button>
              <button onClick={()=>{ setEditForm(selected); setShowEdit(true); }}
                style={{ padding:'10px 16px', background:'#eff6ff', color:'#1e40af', border:'1.5px solid #93c5fd', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                ✏️ Edit Order
              </button>
              {/* Fix O: WhatsApp message is now context-aware based on order status.
                  "is ready" is only sent when the order is delivered/done.
                  In-progress orders get a follow-up message instead. */}
              {(() => {
                const st = selected.status;
                const bal = parseFloat(selected.balance_amount || 0);
                const isReady = st === 'delivered' || st === 'collected';
                const hasBalance = bal > 0;
                let msg;
                if (isReady && hasBalance) {
                  msg = `Hello ${selected.customer_name}, your order ${selected.order_number} is ready for collection. Balance due: ${fmtMoney(selected.balance_amount)}. Please visit us at your convenience. Thank you! — Wickramakalutota Opticals`;
                } else if (isReady) {
                  msg = `Hello ${selected.customer_name}, your order ${selected.order_number} is ready for collection. Thank you! — Wickramakalutota Opticals`;
                } else if (hasBalance) {
                  msg = `Hello ${selected.customer_name}, this is a reminder regarding your order ${selected.order_number}. Balance due: ${fmtMoney(selected.balance_amount)}. Please contact us when convenient. Thank you! — Wickramakalutota Opticals`;
                } else {
                  msg = `Hello ${selected.customer_name}, we wanted to follow up on your order ${selected.order_number}. Please contact us if you have any questions. Thank you! — Wickramakalutota Opticals`;
                }
                return (
                  <a href={`https://wa.me/94${selected.phone?.replace(/^0/,'')}?text=${encodeURIComponent(msg)}`}
                    target="_blank" rel="noreferrer"
                    style={{ padding:'10px 16px', background:'#25D366', color:'white', borderRadius:9, fontSize:13, fontWeight:600, textDecoration:'none' }}>
                    WhatsApp {isReady ? '✅' : hasBalance ? '💰' : '📞'}
                  </a>
                );
              })()}
              <button onClick={handleDelete} style={{ padding:'10px 16px', background:'#fee2e2', color:C.danger, border:`1.5px solid #fca5a5`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showPrint && selected && (
        <PrintReceipt
          order={{ ...selected, ...(billCustom || {}) }}
          onClose={()=>{ setShowPrint(false); setBillCustom(null); }}
        />
      )}

      {/* ── Custom Bill Options Modal ── */}
      {showBillOpts && selected && (
        <BillOptionsModal
          selected={selected}
          C={C}
          fmtMoney={fmtMoney}
          onClose={()=>setShowBillOpts(false)}
          onPrint={(overrides)=>{ setBillCustom(overrides); setShowBillOpts(false); setShowPrint(true); }}
        />
      )}

      {/* ── Edit Order Modal ── */}
      {showEdit && selected && (
        <EditOrderModal
          order={editForm && Object.keys(editForm).length > 0 ? editForm : selected}
          onClose={()=>{ setShowEdit(false); setEditForm({}); }}
          onSave={async (updates) => {
            await updateOrder(selected.id, updates);
            setShowEdit(false);
            setEditForm({});
            load();
            setSelected(s => s ? { ...s, ...updates } : s);
          }}
        />
      )}
    </div>
  );
}