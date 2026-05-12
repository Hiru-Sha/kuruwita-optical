// ============================================================
//  QuickSale.js — Walk-in quick sale
//  Fixed: prints single copy using window.open()
// ============================================================
import React, { useState, useRef } from 'react';
import { getInventory } from '../api';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b' };
const fmtM = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2});
const fmtI = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
const ICON = { Frames:'🕶️', Sunglasses:'😎', 'Reading Glasses':'👓', Boxes:'📦', 'Sunglass Pouches':'👜', 'Glass Cleaner':'🧴', Chains:'⛓️', 'Ear Tips':'🔧' };
const INP  = { padding:'10px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%' };

// ── Print in new blank window — always 1 copy ─────────────────
const printReceipt = (sale, items) => {
  const fmtM2 = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2});
  const fmtI2 = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
  const today = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
  const discount = parseFloat(sale.discount||0);
  const paid     = parseFloat(sale.amount_paid||0);
  const change   = parseFloat(sale.change_given||0);

  const itemsHTML = items.map(item => {
    const ln = (parseFloat(item.price)||0)*(parseInt(item.qty)||1)-(parseFloat(item.item_discount)||0);
    return `
      <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f8f5ef;">
        <div>
          <div style="font-size:13px;font-weight:600;color:#0f1f3d;">${item.name}</div>
          <div style="font-size:11px;color:#6b7280;">
            ${fmtI2(item.price)} × ${item.qty}
            ${parseFloat(item.item_discount)>0 ? `<span style="color:#2d7a4f;"> − disc. ${fmtI2(item.item_discount)}</span>` : ''}
          </div>
        </div>
        <div style="font-weight:700;color:#0f1f3d;font-size:13px;">${fmtM2(ln)}</div>
      </div>`;
  }).join('');

  const customerHTML = (sale.customer_name || sale.customer_phone) ? `
    <div style="background:#f8f5ef;border-radius:9px;padding:10px 14px;margin-bottom:14px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:5px;">Customer</div>
      <div style="font-size:13px;color:#0f1f3d;">
        ${sale.customer_name ? `<b>${sale.customer_name}</b>` : ''}
        ${sale.customer_phone ? `<span style="color:#6b7280;margin-left:12px;">📞 ${sale.customer_phone}</span>` : ''}
      </div>
    </div>` : '';

  const discountHTML = discount > 0 ? `
    <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;margin-bottom:4px;"><span>Subtotal</span><span>${fmtM2(sale.subtotal)}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:13px;color:#2d7a4f;margin-bottom:4px;"><span>Discount</span><span>− ${fmtM2(discount)}</span></div>
    <div style="border-top:1px dashed #e0ddd6;margin:6px 0;"></div>` : '';

  const changeHTML = change > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;"><span>Change</span><span>${fmtM2(change)}</span></div>` : '';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${sale.sale_number} — Receipt</title>
<style>
  @page { size: A5 portrait; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #0f1f3d; background: white; }
</style>
</head>
<body>
<div style="max-width:440px;margin:0 auto;">

  <div style="background:#0f1f3d;border-radius:12px;padding:16px 20px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div style="font-family:Georgia,serif;font-size:19px;font-weight:700;color:white;margin-bottom:2px;">👁️ Kuruwita Optical</div>
      <div style="font-size:10px;color:#c9a84c;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Sales Receipt</div>
      <div style="font-size:11px;color:#ede9e0;">Kuruwita, Ratnapura District, Sri Lanka</div>
    </div>
    <div style="text-align:right;">
      <div style="background:#c9a84c;color:#0f1f3d;font-weight:700;font-size:13px;padding:5px 12px;border-radius:7px;margin-bottom:4px;">${sale.sale_number}</div>
      <div style="font-size:11px;color:#ede9e0;">${today}</div>
    </div>
  </div>

  ${customerHTML}

  <div style="margin-bottom:14px;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #e0ddd6;">Items Purchased</div>
    ${itemsHTML}
  </div>

  <div style="background:#f8f5ef;border-radius:10px;padding:12px 14px;margin-bottom:14px;">
    ${discountHTML}
    <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#0f1f3d;margin-bottom:6px;"><span>Total</span><span>${fmtM2(sale.total)}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;margin-bottom:2px;">
      <span>Paid (${sale.payment_method})</span>
      <span style="color:#2d7a4f;font-weight:600;">${fmtM2(paid)}</span>
    </div>
    ${changeHTML}
  </div>

  <div style="border-top:2px solid #0f1f3d;padding-top:12px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:12px;color:#6b7280;">
      <div style="font-weight:600;color:#0f1f3d;margin-bottom:2px;">Kuruwita Optical</div>
      <div>Thank you for your purchase! 🙏</div>
    </div>
    <div style="font-size:22px;">👁️</div>
  </div>

</div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=700,height=900');
  if (!win) { alert('Please allow popups for this site to print receipts.'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
};

// ── Receipt preview (shown inside the page, not printed directly) ─
function Receipt({ sale, items }) {
  const discount = parseFloat(sale.discount||0);
  const paid     = parseFloat(sale.amount_paid||0);
  const change   = parseFloat(sale.change_given||0);
  return (
    <div style={{ maxWidth:440, margin:'0 auto', fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ background:C.navy, borderRadius:12, padding:'16px 20px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'white', marginBottom:2 }}>👁️ Kuruwita Optical</div>
          <div style={{ fontSize:10, color:C.gold, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:4 }}>Sales Receipt</div>
          <div style={{ fontSize:11, color:'#ede9e0' }}>Kuruwita, Ratnapura District, Sri Lanka</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ background:C.gold, color:C.navy, fontWeight:700, fontSize:13, padding:'5px 12px', borderRadius:7, marginBottom:4 }}>{sale.sale_number}</div>
          <div style={{ fontSize:11, color:'#ede9e0' }}>{new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}</div>
        </div>
      </div>
      {(sale.customer_name||sale.customer_phone) && (
        <div style={{ background:C.cream, borderRadius:9, padding:'10px 14px', marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:5 }}>Customer</div>
          <div style={{ fontSize:13, color:C.navy }}>
            {sale.customer_name && <b>{sale.customer_name}</b>}
            {sale.customer_phone && <span style={{ color:C.muted, marginLeft:16 }}>📞 {sale.customer_phone}</span>}
          </div>
        </div>
      )}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, marginBottom:8, paddingBottom:5, borderBottom:`1px solid ${C.border}` }}>Items Purchased</div>
        {items.map((item,i) => {
          const ln = (parseFloat(item.price)||0)*(parseInt(item.qty)||1)-(parseFloat(item.item_discount)||0);
          return (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid ${C.cream}` }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{ICON[item.category]||'📦'} {item.name}</div>
                <div style={{ fontSize:11, color:C.muted }}>
                  {fmtI(item.price)} × {item.qty}
                  {parseFloat(item.item_discount)>0 && <span style={{color:C.success}}> − disc. {fmtI(item.item_discount)}</span>}
                </div>
              </div>
              <div style={{ fontWeight:700, color:C.navy, fontSize:13 }}>{fmtM(ln)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ background:C.cream, borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
        {discount > 0 && <>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:C.muted, marginBottom:4 }}><span>Subtotal</span><span>{fmtM(sale.subtotal)}</span></div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:C.success, marginBottom:4 }}><span>Discount</span><span>− {fmtM(discount)}</span></div>
          <div style={{ borderTop:`1px dashed ${C.border}`, margin:'6px 0' }}/>
        </>}
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:16, fontWeight:700, color:C.navy, marginBottom:6 }}><span>Total</span><span>{fmtM(sale.total)}</span></div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:C.muted, marginBottom:2 }}><span>Paid ({sale.payment_method})</span><span style={{color:C.success,fontWeight:600}}>{fmtM(paid)}</span></div>
        {change > 0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:C.muted }}><span>Change</span><span>{fmtM(change)}</span></div>}
      </div>
      <div style={{ borderTop:`2px solid ${C.navy}`, paddingTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:12, color:C.muted }}><div style={{ fontWeight:600, color:C.navy, marginBottom:2 }}>Kuruwita Optical</div><div>Thank you for your purchase! 🙏</div></div>
        <div style={{ fontSize:22 }}>👁️</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function QuickSale() {
  const [query,     setQuery]    = useState('');
  const [results,   setResults]  = useState([]);
  const [cart,      setCart]     = useState([]);
  const [custName,  setCustName] = useState('');
  const [custPhone, setCustPhone]= useState('');
  const [overDisc,  setOverDisc] = useState('');
  const [payMethod, setPayMethod]= useState('cash');
  const [amtPaid,   setAmtPaid]  = useState('');
  const [saving,    setSaving]   = useState(false);
  const [error,     setError]    = useState('');
  const [done,      setDone]     = useState(null);
  const [doneItems, setDoneItems]= useState([]);
  const timer = useRef(null);

  const search = (v) => {
    setQuery(v);
    clearTimeout(timer.current);
    if (!v.trim()) return setResults([]);
    timer.current = setTimeout(async () => {
      try { const r = await getInventory({ search:v }); setResults(r.data.filter(i=>i.quantity>0).slice(0,8)); }
      catch { setResults([]); }
    }, 300);
  };

  const addItem = (item) => {
    setCart(c => {
      const ex = c.find(x=>x.inventory_id===item.id);
      if (ex) return c.map(x=>x.inventory_id===item.id?{...x,qty:Math.min(x.qty+1,item.quantity)}:x);
      return [...c,{ inventory_id:item.id, name:item.name, category:item.category, image_url:item.image_url, price:parseFloat(item.sell_price)||0, qty:1, max_qty:item.quantity, item_discount:0 }];
    });
    setQuery(''); setResults([]);
  };

  const upd = (id,f,v) => setCart(c=>c.map(x=>x.inventory_id===id?{...x,[f]:v}:x));
  const rem = (id)      => setCart(c=>c.filter(x=>x.inventory_id!==id));

  const subtotal = cart.reduce((s,i)=>s+(parseFloat(i.price)||0)*(parseInt(i.qty)||1)-(parseFloat(i.item_discount)||0),0);
  const discAmt  = parseFloat(overDisc)||0;
  const total    = Math.max(0,subtotal-discAmt);
  const paid     = parseFloat(amtPaid)||0;
  const change   = Math.max(0,paid-total);

  const complete = async () => {
    if (!cart.length)  return setError('Add at least one item');
    if (paid < total)  return setError(`Amount paid (${fmtM(paid)}) is less than total (${fmtM(total)})`);
    setError(''); setSaving(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/quick-sales`,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body:JSON.stringify({ customer_name:custName.trim()||null, customer_phone:custPhone.trim()||null, items:cart, subtotal, discount:discAmt, total, payment_method:payMethod, amount_paid:paid, change_given:change })
      });
      if (!res.ok){ const d=await res.json(); throw new Error(d.error||'Failed'); }
      const data = await res.json();
      setDoneItems([...cart]);
      setDone(data);
    } catch(e){ setError(e.message); }
    finally { setSaving(false); }
  };

  const reset = () => {
    setCart([]); setCustName(''); setCustPhone(''); setOverDisc('');
    setAmtPaid(''); setPayMethod('cash'); setError('');
    setDone(null); setDoneItems([]);
  };

  // ── Done screen ────────────────────────────────────────────
  if (done) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:580, margin:'0 auto' }}>
      <div style={{ textAlign:'center', padding:'24px 0 16px' }}>
        <div style={{ fontSize:44, marginBottom:8 }}>✅</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.navy }}>Sale Complete!</div>
        <div style={{ fontSize:14, color:C.muted, marginTop:4 }}>{done.sale_number} · {fmtM(done.total)}</div>
      </div>
      {/* Preview only — not used for printing */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:24, marginBottom:16 }}>
        <Receipt sale={done} items={doneItems}/>
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
        {/* Print button — opens new blank window with just the receipt */}
        <button
          onClick={() => printReceipt(done, doneItems)}
          style={{ padding:'11px 24px', background:C.gold, color:C.navy, border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          🖨️ Print Receipt
        </button>
        <button onClick={reset} style={{ padding:'11px 24px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          + New Sale
        </button>
      </div>
    </div>
  );

  // ── Sale screen ────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:720, margin:'0 auto' }}>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.navy, margin:'0 0 4px' }}>🛍️ Quick Sale</h1>
      <p style={{ fontSize:13, color:C.muted, marginBottom:20 }}>Walk-in customers — frames, sunglasses, accessories. Customer details optional.</p>

      {error && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:10, padding:'10px 16px', fontSize:13, marginBottom:16 }}>⚠️ {error}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16, alignItems:'start' }}>

        {/* LEFT */}
        <div>
          {/* Search */}
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px', marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:10 }}>🔍 Add Items</div>
            <div style={{ position:'relative' }}>
              <input value={query} onChange={e=>search(e.target.value)} placeholder="Search frames, sunglasses, boxes, chains, ear tips..." style={{ ...INP, fontSize:14 }} autoFocus/>
              {results.length>0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:`1px solid ${C.border}`, borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.12)', zIndex:50, overflow:'hidden', marginTop:4 }}>
                  {results.map(item=>(
                    <div key={item.id} onMouseDown={()=>addItem(item)}
                      style={{ padding:'10px 14px', cursor:'pointer', borderBottom:`1px solid ${C.cream}`, display:'flex', alignItems:'center', gap:12 }}>
                      {item.image_url
                        ? <img src={item.image_url} alt="" style={{ width:44,height:44,objectFit:'cover',borderRadius:7,flexShrink:0 }}/>
                        : <div style={{ width:44,height:44,borderRadius:7,background:C.cream,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 }}>{ICON[item.category]||'📦'}</div>
                      }
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{item.name}</div>
                        <div style={{ fontSize:11, color:C.muted }}>{ICON[item.category]} {item.category}{item.frame_color?` · ${item.frame_color}`:''}{item.frame_type?` · ${item.frame_type}`:''}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:15, fontWeight:700, color:C.navy }}>{fmtI(item.sell_price)}</div>
                        <div style={{ fontSize:11, color:item.quantity<=2?C.danger:C.success }}>{item.quantity} in stock</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {query.length>1 && !results.length && <div style={{ marginTop:8, fontSize:13, color:C.muted }}>No items found in stock</div>}
            </div>
          </div>

          {/* Cart */}
          {cart.length>0 && (
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:12 }}>🛒 Cart ({cart.length})</div>
              {cart.map(item => {
                const ln = (parseFloat(item.price)||0)*(parseInt(item.qty)||1)-(parseFloat(item.item_discount)||0);
                return (
                  <div key={item.inventory_id} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:`1px solid ${C.cream}`, alignItems:'flex-start' }}>
                    {item.image_url
                      ? <img src={item.image_url} alt="" style={{ width:52,height:52,objectFit:'cover',borderRadius:8,flexShrink:0 }}/>
                      : <div style={{ width:52,height:52,borderRadius:8,background:C.cream,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>{ICON[item.category]||'📦'}</div>
                    }
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:6 }}>{item.name}</div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <button onMouseDown={()=>upd(item.inventory_id,'qty',Math.max(1,item.qty-1))} style={{ width:26,height:26,borderRadius:6,border:`1px solid ${C.border}`,background:'white',cursor:'pointer',fontSize:16,color:C.navy,fontFamily:'inherit' }}>−</button>
                          <span style={{ fontSize:14, fontWeight:700, color:C.navy, minWidth:22, textAlign:'center' }}>{item.qty}</span>
                          <button onMouseDown={()=>upd(item.inventory_id,'qty',Math.min(item.max_qty,item.qty+1))} style={{ width:26,height:26,borderRadius:6,border:`1px solid ${C.border}`,background:'white',cursor:'pointer',fontSize:16,color:C.navy,fontFamily:'inherit' }}>+</button>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <span style={{ fontSize:11, color:C.muted }}>Price:</span>
                          <input type="number" value={item.price} onChange={e=>upd(item.inventory_id,'price',parseFloat(e.target.value)||0)} style={{ ...INP, width:88, padding:'5px 9px', fontSize:13 }}/>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <span style={{ fontSize:11, color:C.muted }}>Disc:</span>
                          <input type="number" value={item.item_discount||0} onChange={e=>upd(item.inventory_id,'item_discount',parseFloat(e.target.value)||0)} placeholder="0" style={{ ...INP, width:78, padding:'5px 9px', fontSize:13 }}/>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:C.navy }}>{fmtM(ln)}</div>
                      <button onMouseDown={()=>rem(item.inventory_id)} style={{ background:'none', border:'none', color:C.danger, cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', marginTop:4 }}>Remove</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Overall discount */}
          {cart.length>0 && (
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 18px', marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:8 }}>💰 Overall Discount (optional)</div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <input type="number" value={overDisc} onChange={e=>setOverDisc(e.target.value)} placeholder="Enter discount Rs." style={{ ...INP, maxWidth:240 }}/>
                {discAmt>0 && <span style={{ fontSize:13, color:C.success, fontWeight:600 }}>− {fmtM(discAmt)}</span>}
              </div>
            </div>
          )}

          {/* Customer (optional) */}
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 18px' }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:2 }}>👤 Customer <span style={{ fontWeight:400, color:C.muted, fontSize:12 }}>(optional)</span></div>
            <p style={{ fontSize:12, color:C.muted, marginBottom:10, marginTop:4 }}>Leave blank for walk-in anonymous sale</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <input value={custName}  onChange={e=>setCustName(e.target.value)}  placeholder="Name (optional)"  style={INP}/>
              <input value={custPhone} onChange={e=>setCustPhone(e.target.value)} placeholder="Phone (optional)" type="tel" style={INP}/>
            </div>
          </div>
        </div>

        {/* RIGHT: summary + payment */}
        <div style={{ position:'sticky', top:80 }}>
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
            <div style={{ background:C.navy, padding:'16px 18px' }}>
              <div style={{ fontSize:11, color:C.gold, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>Sale Total</div>
              {cart.length===0
                ? <div style={{ fontSize:13, color:'#ede9e0' }}>No items yet</div>
                : <>
                  {cart.map(item=>{
                    const ln=(parseFloat(item.price)||0)*(parseInt(item.qty)||1)-(parseFloat(item.item_discount)||0);
                    return <div key={item.inventory_id} style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#ede9e0', marginBottom:3 }}><span>{item.name} ×{item.qty}</span><span>{fmtM(ln)}</span></div>;
                  })}
                  {discAmt>0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#86efac', marginBottom:3 }}><span>Discount</span><span>− {fmtM(discAmt)}</span></div>}
                  <div style={{ borderTop:'1px solid rgba(255,255,255,.2)', marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'white', fontWeight:700, fontSize:14 }}>TOTAL</span>
                    <span style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.gold }}>{fmtM(total)}</span>
                  </div>
                </>
              }
            </div>
            <div style={{ padding:'16px 18px' }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10 }}>Payment Method</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:12 }}>
                {[['cash','💵 Cash'],['bank','🏦 Bank'],['card','💳 Card']].map(([v,l])=>(
                  <button key={v} onClick={()=>setPayMethod(v)} style={{ padding:'8px 4px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${payMethod===v?C.navy:C.border}`, background:payMethod===v?C.navy:'white', color:payMethod===v?'white':C.muted }}>{l}</button>
                ))}
              </div>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, display:'block', marginBottom:5 }}>Amount Received</label>
                <input type="number" value={amtPaid} onChange={e=>setAmtPaid(e.target.value)} placeholder={`Min: ${fmtI(total)}`} style={{ ...INP, fontSize:16, fontWeight:700 }}/>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                <button onClick={()=>setAmtPaid(String(total))} style={{ padding:'5px 12px', background:C.navy, color:'white', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Exact</button>
                {[500,1000,2000,5000,10000].filter(v=>v>total).slice(0,3).map(v=>(
                  <button key={v} onClick={()=>setAmtPaid(String(v))} style={{ padding:'5px 10px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>{fmtI(v)}</button>
                ))}
              </div>
              {paid>=total && total>0 && (
                <div style={{ background:change>0?'#fef9c3':'#dcfce7', borderRadius:9, padding:'10px 14px', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>{change>0?'💰 Change':'✅ Exact'}</span>
                  {change>0 && <span style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:'#854d0e' }}>{fmtM(change)}</span>}
                </div>
              )}
              <button onClick={complete} disabled={saving||cart.length===0||paid<total}
                style={{ width:'100%', padding:'13px', fontSize:15, fontWeight:700, cursor:cart.length===0||paid<total||saving?'not-allowed':'pointer', background:cart.length===0||paid<total?C.border:C.success, color:cart.length===0||paid<total?C.muted:'white', border:'none', borderRadius:10, fontFamily:'inherit' }}>
                {saving?'⏳ Processing...':cart.length===0?'Add items to continue':paid<total?`Need ${fmtM(total-paid)} more`:`✅ Complete Sale · ${fmtM(total)}`}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}