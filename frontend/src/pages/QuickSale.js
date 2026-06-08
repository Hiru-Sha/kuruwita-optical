/* eslint-disable */
// ============================================================
//  QuickSale.js — Mobile-friendly version
//  On mobile: single column, sticky total bar at bottom
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getInventory } from '../api';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b' };
const fmtM = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2});
const fmtI = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
const ICON = { Frames:'🕶️', Sunglasses:'😎', 'Reading Glasses':'👓', Boxes:'📦', 'Sunglass Pouches':'👜', 'Glass Cleaner':'🧴', Chains:'⛓️', 'Ear Tips':'🔧' };
const INP  = { padding:'10px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%' };

// ── Print receipt in new blank window ─────────────────────────
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
          <div style="font-size:11px;color:#6b7280;">${fmtI2(item.price)} × ${item.qty}${parseFloat(item.item_discount)>0?` <span style="color:#2d7a4f">− disc. ${fmtI2(item.item_discount)}</span>`:''}</div>
        </div>
        <div style="font-weight:700;color:#0f1f3d;font-size:13px;">${fmtM2(ln)}</div>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${sale.sale_number} — Receipt</title>
<style>@page{size:A5 portrait;margin:8mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#0f1f3d;background:white}</style>
</head><body>
<div style="max-width:440px;margin:0 auto;">
  <div style="background:#111;border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <img src="data:image/jpeg;base64,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" alt="Wickramakalutota Opticals" style="height:46px;object-fit:contain;max-width:190px;"/>
      <div style="font-size:9px;color:#c9a84c;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px;">Sales Receipt</div>
    </div>
    <div style="text-align:right;">
      <div style="background:#c9a84c;color:#0f1f3d;font-weight:700;font-size:13px;padding:5px 12px;border-radius:7px;margin-bottom:4px;">${sale.sale_number}</div>
      <div style="font-size:11px;color:#ede9e0;">${today}</div>
      <div style="font-size:10px;color:#ede9e0;">No.57 Kurunegala Road, Chilaw</div>
      <div style="font-size:10px;color:#ede9e0;">Tel: 032 222 1211</div>
    </div>
  </div>
  ${(sale.customer_name||sale.customer_phone)?`<div style="background:#f8f5ef;border-radius:9px;padding:10px 14px;margin-bottom:14px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:5px;">Customer</div><div style="font-size:13px;color:#0f1f3d;">${sale.customer_name?`<b>${sale.customer_name}</b>`:''} ${sale.customer_phone?`<span style="color:#6b7280;margin-left:12px;">📞 ${sale.customer_phone}</span>`:''}</div></div>`:''}
  <div style="margin-bottom:14px;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #e0ddd6;">Items Purchased</div>
    ${itemsHTML}
  </div>
  <div style="background:#f8f5ef;border-radius:10px;padding:12px 14px;margin-bottom:14px;">
    ${discount>0?`<div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;margin-bottom:4px;"><span>Subtotal</span><span>${fmtM2(sale.subtotal)}</span></div><div style="display:flex;justify-content:space-between;font-size:13px;color:#2d7a4f;margin-bottom:4px;"><span>Discount</span><span>− ${fmtM2(discount)}</span></div><div style="border-top:1px dashed #e0ddd6;margin:6px 0;"></div>`:''}
    <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#0f1f3d;margin-bottom:6px;"><span>Total</span><span>${fmtM2(sale.total)}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;margin-bottom:2px;"><span>Paid (${sale.payment_method})</span><span style="color:#2d7a4f;font-weight:600;">${fmtM2(paid)}</span></div>
    ${change>0?`<div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;"><span>Change</span><span>${fmtM2(change)}</span></div>`:''}
  </div>
  <div style="border-top:2px solid #0f1f3d;padding-top:12px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:12px;color:#6b7280;"><div style="font-weight:600;color:#0f1f3d;margin-bottom:2px;">Wickramakalutota Opticals</div><div>Thank you! 🙏</div></div>
    <div style="font-size:22px;">👁️</div>
  </div>
</div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
</body></html>`;

  const win = window.open('','_blank','width=700,height=900');
  if (!win) { alert('Please allow popups to print receipts.'); return; }
  win.document.open(); win.document.write(html); win.document.close();
};

// ── Receipt preview ────────────────────────────────────────────
function Receipt({ sale, items }) {
  const discount = parseFloat(sale.discount||0);
  const paid     = parseFloat(sale.amount_paid||0);
  const change   = parseFloat(sale.change_given||0);
  return (
    <div style={{ maxWidth:440, margin:'0 auto', fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ background:C.navy, borderRadius:12, padding:'14px 18px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ background:'#111', borderRadius:12, padding:'12px 14px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <img src="data:image/jpeg;base64,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" alt="Wickramakalutota Opticals" style={{ height:42, objectFit:'contain', maxWidth:180 }}/>
        <div style={{ textAlign:'right' }}>
          <div style={{ background:C.gold, color:C.navy, fontWeight:700, fontSize:12, padding:'4px 10px', borderRadius:7, marginBottom:3 }}>{sale.sale_number}</div>
          <div style={{ fontSize:10, color:'#ede9e0' }}>{new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>
          <div style={{ fontSize:10, color:'#c9a84c' }}>No.57 Kurunegala Road, Chilaw</div>
        </div>
      </div>
          <div style={{ fontSize:10, color:C.gold, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:3 }}>Sales Receipt</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ background:C.gold, color:C.navy, fontWeight:700, fontSize:12, padding:'4px 10px', borderRadius:7, marginBottom:3 }}>{sale.sale_number}</div>
          <div style={{ fontSize:11, color:'#ede9e0' }}>{new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>
        </div>
      </div>
      {(sale.customer_name||sale.customer_phone) && (
        <div style={{ background:C.cream, borderRadius:8, padding:'9px 13px', marginBottom:12, fontSize:13 }}>
          {sale.customer_name && <b style={{color:C.navy}}>{sale.customer_name}</b>}
          {sale.customer_phone && <span style={{ color:C.muted, marginLeft:12 }}>📞 {sale.customer_phone}</span>}
        </div>
      )}
      <div style={{ marginBottom:12 }}>
        {items.map((item,i) => {
          const ln=(parseFloat(item.price)||0)*(parseInt(item.qty)||1)-(parseFloat(item.item_discount)||0);
          return (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid ${C.cream}` }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{ICON[item.category]||'📦'} {item.name}</div>
                <div style={{ fontSize:11, color:C.muted }}>{fmtI(item.price)} × {item.qty}{parseFloat(item.item_discount)>0&&<span style={{color:C.success}}> − disc. {fmtI(item.item_discount)}</span>}</div>
              </div>
              <div style={{ fontWeight:700, color:C.navy, fontSize:13 }}>{fmtM(ln)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ background:C.cream, borderRadius:10, padding:'11px 13px' }}>
        {discount>0&&<><div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:C.muted, marginBottom:3 }}><span>Subtotal</span><span>{fmtM(sale.subtotal)}</span></div><div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:C.success, marginBottom:3 }}><span>Discount</span><span>− {fmtM(discount)}</span></div><div style={{ borderTop:`1px dashed ${C.border}`, margin:'6px 0' }}/></>}
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:15, fontWeight:700, color:C.navy, marginBottom:5 }}><span>Total</span><span>{fmtM(sale.total)}</span></div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:C.muted }}><span>Paid ({sale.payment_method})</span><span style={{color:C.success,fontWeight:600}}>{fmtM(paid)}</span></div>
        {change>0&&<div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:C.muted }}><span>Change</span><span>{fmtM(change)}</span></div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function QuickSale() {
  const [query,    setQuery]   = useState('');
  const [results,  setResults] = useState([]);
  const [cart,     setCart]    = useState([]);
  const [custName, setCustName]= useState('');
  const [custPhone,setCustPhone]=useState('');
  const [overDisc, setOverDisc]= useState('');
  const [payMethod,setPayMethod]=useState('cash');
  const [amtPaid,  setAmtPaid] = useState('');
  const [saving,   setSaving]  = useState(false);
  const [error,    setError]   = useState('');
  const [done,     setDone]    = useState(null);
  const [doneItems,setDoneItems]=useState([]);
  const location = useLocation();

  // Pre-fill from QR scan URL params
  useEffect(()=>{
    const p = new URLSearchParams(location.search);
    const itemName = p.get('item_name');
    const price    = p.get('price');
    const itemId   = p.get('item_id');
    if (itemName && itemId) {
      // Add scanned item directly to cart
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      fetch(`${BASE}/inventory/${itemId}`, { headers:{ Authorization:`Bearer ${token}` } })
        .then(r=>r.json())
        .then(item=>{
          if (item?.id) {
            setCart([{
              inventory_id:  item.id,
              name:          item.name,
              category:      item.category,
              image_url:     item.image_url || null,
              price:         parseFloat(price) || parseFloat(item.sell_price) || 0,
              qty:           1,
              max_qty:       item.quantity,
              item_discount: 0,
            }]);
          }
        }).catch(()=>{});
    }
  },[location.search]);
  const [mob,      setMob]     = useState(window.innerWidth < 640);
  const [activeTab,setActiveTab]= useState('sale');
  const [pastMode, setPastMode] = useState(false);
  const [saleDate, setSaleDate] = useState('');   // 'sale' | 'history'
  const [history,  setHistory]  = useState([]);
  const [histLoad, setHistLoad] = useState(false);
  const [histFrom, setHistFrom] = useState('');
  const [histTo,   setHistTo]   = useState('');
  const timer = useRef(null);

  useEffect(()=>{
    const fn = () => setMob(window.innerWidth < 640);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  },[]);

  const loadHistory = async () => {
    setHistLoad(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/quick-sales?limit=50`, { headers:{ Authorization:`Bearer ${token}` } });
      const data  = await res.json();
      setHistory(Array.isArray(data)?data:[]);
    } catch(e) { console.error(e); }
    finally { setHistLoad(false); }
  };

  const search = (v) => {
    setQuery(v);
    clearTimeout(timer.current);
    if (!v.trim()) return setResults([]);
    timer.current = setTimeout(async () => {
      try {
        const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('ko_token');
        const res   = await fetch(`${BASE}/inventory?search=${encodeURIComponent(v)}&limit=20`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        const arr  = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];
        setResults(arr.filter(i=>i.quantity>0).slice(0,8));
      } catch { setResults([]); }
    }, 300);
  };

  const addItem = (item) => {
    setCart(c=>{
      const ex=c.find(x=>x.inventory_id===item.id);
      if(ex) return c.map(x=>x.inventory_id===item.id?{...x,qty:Math.min(x.qty+1,item.quantity)}:x);
      return [...c,{inventory_id:item.id,name:item.name,category:item.category,image_url:item.image_url,price:parseFloat(item.sell_price)||0,qty:1,max_qty:item.quantity,item_discount:0}];
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
    if (paid < total)  return setError(`Need ${fmtM(total-paid)} more`);
    setError(''); setSaving(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/quick-sales`,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body:JSON.stringify({customer_name:custName.trim()||null,customer_phone:custPhone.trim()||null,items:cart,subtotal,discount:discAmt,total,payment_method:payMethod,amount_paid:paid,change_given:change,import_date:pastMode&&saleDate?saleDate:null})
      });
      if (!res.ok){const d=await res.json();throw new Error(d.error||'Failed');}
      const data=await res.json();
      setDoneItems([...cart]);
      setDone(data);
    } catch(e){setError(e.message);}
    finally{setSaving(false);}
  };

  const reset = () => {setCart([]);setCustName('');setCustPhone('');setOverDisc('');setAmtPaid('');setPayMethod('cash');setError('');setDone(null);setDoneItems([]);};

  // ── Done screen ───────────────────────────────────────────
  if (done) return (
    <div style={{fontFamily:"'DM Sans',sans-serif",maxWidth:560,margin:'0 auto'}}>
      <div style={{textAlign:'center',padding:'20px 0 14px'}}>
        <div style={{fontSize:44,marginBottom:6}}>✅</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.navy}}>Sale Complete!</div>
        <div style={{fontSize:13,color:C.muted,marginTop:3}}>{done.sale_number} · {fmtM(done.total)}</div>
        {done.payment_method && done.payment_method !== 'cash' && (
          <div style={{display:'inline-flex',alignItems:'center',gap:6,marginTop:8,background:'#eff6ff',border:'1px solid #bae6fd',borderRadius:20,padding:'5px 14px',fontSize:12,fontWeight:600,color:'#1e40af'}}>
            🏦 Bank receipt auto-recorded · {fmtM(done.total)}
          </div>
        )}
      </div>
      <div style={{background:'white',border:`1px solid ${C.border}`,borderRadius:14,padding:mob?16:24,marginBottom:14}}>
        <Receipt sale={done} items={doneItems}/>
      </div>
      <div style={{display:'flex',gap:10,justifyContent:'center'}}>
        <button onClick={()=>printReceipt(done,doneItems)} style={{padding:'12px 22px',background:C.gold,color:C.navy,border:'none',borderRadius:9,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>🖨️ Print</button>
        <button onClick={reset} style={{padding:'12px 22px',background:C.navy,color:'white',border:'none',borderRadius:9,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>+ New Sale</button>
      </div>
    </div>
  );

  // ── Sale screen — single column on mobile ──────────────────
  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",maxWidth:mob?'100%':720,margin:'0 auto',paddingBottom:mob?120:0}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:mob?18:22,color:C.navy,margin:'0 0 2px'}}>🛍️ Quick Sale</h1>
          <p style={{fontSize:12,color:C.muted,margin:0}}>Walk-in customers — frames, sunglasses, accessories</p>
        </div>
        <div style={{display:'flex',gap:6}}>
          {[['sale','🛍️ New Sale'],['history','📋 Sales History']].map(([k,l])=>(
            <button key={k} onClick={()=>{ setActiveTab(k); if(k==='history') loadHistory(); }}
              style={{padding:'8px 14px',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',border:`1.5px solid ${activeTab===k?C.navy:C.border}`,background:activeTab===k?C.navy:'white',color:activeTab===k?'white':C.muted}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Past record date override */}
      <div style={{marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <button onClick={()=>{setPastMode(p=>!p);setSaleDate('');}}
            style={{padding:'6px 13px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',border:`1.5px solid ${pastMode?'#b45309':C.border}`,background:pastMode?'#fffbeb':'white',color:pastMode?'#b45309':C.muted}}>
            📅 {pastMode?'Backdating ON ✓':'Enter a past sale?'}
          </button>
          {pastMode && (
            <input type="date" value={saleDate} onChange={e=>setSaleDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              style={{padding:'6px 12px',border:'2px solid #f59e0b',borderRadius:8,fontSize:14,fontWeight:700,fontFamily:'inherit',outline:'none',background:'#fffbeb',color:'#92400e'}}/>
          )}
          {pastMode && saleDate && <span style={{fontSize:12,color:'#92400e',background:'#fef3c7',padding:'3px 9px',borderRadius:20,fontWeight:600}}>{new Date(saleDate+'T00:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</span>}
        </div>
        {pastMode && !saleDate && <div style={{fontSize:12,color:'#b45309',marginTop:5}}>⬆️ Set the date this sale was made</div>}
      </div>

      {error&&<div style={{background:'#fef2f2',border:`1px solid #fca5a5`,color:C.danger,borderRadius:10,padding:'10px 14px',fontSize:13,marginBottom:14}}>⚠️ {error}</div>}

      {mob ? (
        /* ── MOBILE: single column ── */
        <div>
          {/* Search */}
          <div style={{background:'white',border:`1px solid ${C.border}`,borderRadius:14,padding:'14px',marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:10}}>🔍 Add Items</div>
            <div style={{position:'relative'}}>
              <input value={query} onChange={e=>search(e.target.value)} placeholder="Search frames, accessories..." style={{...INP,fontSize:16}} autoFocus/>
              {results.length>0&&(
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'white',border:`1px solid ${C.border}`,borderRadius:10,boxShadow:'0 4px 20px rgba(0,0,0,.15)',zIndex:50,overflow:'hidden',marginTop:4}}>
                  {results.map(item=>(
                    <div key={item.id} onMouseDown={()=>addItem(item)} style={{padding:'12px 14px',cursor:'pointer',borderBottom:`1px solid ${C.cream}`,display:'flex',alignItems:'center',gap:10}}>
                      {item.image_url
                        ?<img src={item.image_url} alt="" style={{width:40,height:40,objectFit:'cover',borderRadius:6,flexShrink:0}}/>
                        :<div style={{width:40,height:40,borderRadius:6,background:C.cream,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{ICON[item.category]||'📦'}</div>
                      }
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:700,color:C.navy}}>{item.name}</div>
                        <div style={{fontSize:11,color:C.muted}}>{item.category}</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontSize:14,fontWeight:700,color:C.navy}}>{fmtI(item.sell_price)}</div>
                        <div style={{fontSize:11,color:item.quantity<=2?C.danger:C.success}}>{item.quantity} left</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          {cart.length>0&&(
            <div style={{background:'white',border:`1px solid ${C.border}`,borderRadius:14,padding:'14px',marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:10}}>🛒 Cart ({cart.length})</div>
              {cart.map(item=>{
                const ln=(parseFloat(item.price)||0)*(parseInt(item.qty)||1)-(parseFloat(item.item_discount)||0);
                return (
                  <div key={item.inventory_id} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:`1px solid ${C.cream}`,alignItems:'flex-start'}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:6}}>{item.name}</div>
                      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                        {/* Qty */}
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <button onMouseDown={()=>upd(item.inventory_id,'qty',Math.max(1,item.qty-1))} style={{width:32,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:'white',cursor:'pointer',fontSize:18,color:C.navy,fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                          <span style={{fontSize:15,fontWeight:700,color:C.navy,minWidth:24,textAlign:'center'}}>{item.qty}</span>
                          <button onMouseDown={()=>upd(item.inventory_id,'qty',Math.min(item.max_qty,item.qty+1))} style={{width:32,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:'white',cursor:'pointer',fontSize:18,color:C.navy,fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                        </div>
                        {/* Price */}
                        <input type="number" value={item.price} onChange={e=>upd(item.inventory_id,'price',parseFloat(e.target.value)||0)} style={{...INP,width:90,padding:'6px 9px',fontSize:13}}/>
                      </div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:14,fontWeight:700,color:C.navy}}>{fmtM(ln)}</div>
                      <button onMouseDown={()=>rem(item.inventory_id)} style={{background:'none',border:'none',color:C.danger,cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit',marginTop:4}}>Remove</button>
                    </div>
                  </div>
                );
              })}
              {/* Overall discount */}
              <div style={{marginTop:10,display:'flex',gap:8,alignItems:'center'}}>
                <input type="number" value={overDisc} onChange={e=>setOverDisc(e.target.value)} placeholder="Overall discount (Rs.)" style={{...INP,flex:1}}/>
                {discAmt>0&&<span style={{fontSize:13,color:C.success,fontWeight:600,whiteSpace:'nowrap'}}>− {fmtM(discAmt)}</span>}
              </div>
            </div>
          )}

          {/* Customer (optional) */}
          <div style={{background:'white',border:`1px solid ${C.border}`,borderRadius:14,padding:'14px',marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:8}}>👤 Customer <span style={{fontWeight:400,color:C.muted,fontSize:12}}>(optional)</span></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <input value={custName}  onChange={e=>setCustName(e.target.value)}  placeholder="Name"  style={{...INP,fontSize:13}}/>
              <input value={custPhone} onChange={e=>setCustPhone(e.target.value)} placeholder="Phone" type="tel" style={{...INP,fontSize:13}}/>
            </div>
          </div>

          {/* Payment */}
          {cart.length>0&&(
            <div style={{background:'white',border:`1px solid ${C.border}`,borderRadius:14,padding:'14px',marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:10}}>Payment</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:12}}>
                {[['cash','💵 Cash'],['bank','🏦 Bank'],['card','💳 Card']].map(([v,l])=>(
                  <button key={v} onClick={()=>setPayMethod(v)} style={{padding:'10px 4px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',border:`1.5px solid ${payMethod===v?C.navy:C.border}`,background:payMethod===v?C.navy:'white',color:payMethod===v?'white':C.muted}}>{l}</button>
                ))}
              </div>
              <input type="number" value={amtPaid} onChange={e=>setAmtPaid(e.target.value)} placeholder={`Min: ${fmtI(total)}`} style={{...INP,fontSize:18,fontWeight:700,marginBottom:8}}/>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                <button onClick={()=>setAmtPaid(String(total))} style={{padding:'8px 14px',background:C.navy,color:'white',border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Exact</button>
                {[500,1000,2000,5000,10000].filter(v=>v>total).slice(0,3).map(v=>(
                  <button key={v} onClick={()=>setAmtPaid(String(v))} style={{padding:'8px 12px',background:C.cream,border:`1px solid ${C.border}`,borderRadius:7,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:C.muted}}>{fmtI(v)}</button>
                ))}
              </div>
              {paid>=total&&total>0&&(
                <div style={{background:change>0?'#fef9c3':'#dcfce7',borderRadius:9,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.navy}}>{change>0?'💰 Change':'✅ Exact'}</span>
                  {change>0&&<span style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:'#854d0e'}}>{fmtM(change)}</span>}
                </div>
              )}
            </div>
          )}

          {/* Sticky bottom complete button on mobile */}
          <div style={{position:'fixed',bottom:0,left:0,right:0,padding:'12px 16px',background:'white',borderTop:`1px solid ${C.border}`,zIndex:100,display:'flex',gap:10,alignItems:'center'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:C.muted}}>Total</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:C.navy}}>{fmtM(total)}</div>
            </div>
            <button onClick={complete} disabled={saving||cart.length===0||paid<total}
              style={{padding:'14px 22px',fontSize:15,fontWeight:700,cursor:cart.length===0||paid<total||saving?'not-allowed':'pointer',background:cart.length===0||paid<total?C.border:C.success,color:cart.length===0||paid<total?C.muted:'white',border:'none',borderRadius:12,fontFamily:'inherit',flexShrink:0}}>
              {saving?'⏳ Processing...':cart.length===0?'Add items':paid<total?`Need ${fmtM(total-paid)}`:'✅ Complete'}
            </button>
          </div>
        </div>
      ) : (
        /* ── DESKTOP: 2-column layout ── */
        <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16,alignItems:'start'}}>
          <div>
            {/* Search */}
            <div style={{background:'white',border:`1px solid ${C.border}`,borderRadius:14,padding:'16px 18px',marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:10}}>🔍 Add Items</div>
              <div style={{position:'relative'}}>
                <input value={query} onChange={e=>search(e.target.value)} placeholder="Search frames, sunglasses, boxes, chains, ear tips..." style={{...INP,fontSize:14}} autoFocus/>
                {results.length>0&&(
                  <div style={{position:'absolute',top:'100%',left:0,right:0,background:'white',border:`1px solid ${C.border}`,borderRadius:10,boxShadow:'0 4px 20px rgba(0,0,0,.12)',zIndex:50,overflow:'hidden',marginTop:4}}>
                    {results.map(item=>(
                      <div key={item.id} onMouseDown={()=>addItem(item)} style={{padding:'10px 14px',cursor:'pointer',borderBottom:`1px solid ${C.cream}`,display:'flex',alignItems:'center',gap:12}}>
                        {item.image_url
                          ?<img src={item.image_url} alt="" style={{width:44,height:44,objectFit:'cover',borderRadius:7,flexShrink:0}}/>
                          :<div style={{width:44,height:44,borderRadius:7,background:C.cream,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{ICON[item.category]||'📦'}</div>
                        }
                        <div style={{flex:1}}>
                          <div style={{fontSize:14,fontWeight:700,color:C.navy}}>{item.name}</div>
                          <div style={{fontSize:11,color:C.muted}}>{item.category}{item.frame_color?` · ${item.frame_color}`:''}</div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontSize:15,fontWeight:700,color:C.navy}}>{fmtI(item.sell_price)}</div>
                          <div style={{fontSize:11,color:item.quantity<=2?C.danger:C.success}}>{item.quantity} in stock</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cart */}
            {cart.length>0&&(
              <div style={{background:'white',border:`1px solid ${C.border}`,borderRadius:14,padding:'16px 18px',marginBottom:14}}>
                <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:12}}>🛒 Cart ({cart.length})</div>
                {cart.map(item=>{
                  const ln=(parseFloat(item.price)||0)*(parseInt(item.qty)||1)-(parseFloat(item.item_discount)||0);
                  return (
                    <div key={item.inventory_id} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:`1px solid ${C.cream}`,alignItems:'flex-start'}}>
                      {item.image_url
                        ?<img src={item.image_url} alt="" style={{width:52,height:52,objectFit:'cover',borderRadius:8,flexShrink:0}}/>
                        :<div style={{width:52,height:52,borderRadius:8,background:C.cream,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{ICON[item.category]||'📦'}</div>
                      }
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:6}}>{item.name}</div>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                          <div style={{display:'flex',alignItems:'center',gap:5}}>
                            <button onMouseDown={()=>upd(item.inventory_id,'qty',Math.max(1,item.qty-1))} style={{width:26,height:26,borderRadius:6,border:`1px solid ${C.border}`,background:'white',cursor:'pointer',fontSize:16,color:C.navy,fontFamily:'inherit'}}>−</button>
                            <span style={{fontSize:14,fontWeight:700,color:C.navy,minWidth:22,textAlign:'center'}}>{item.qty}</span>
                            <button onMouseDown={()=>upd(item.inventory_id,'qty',Math.min(item.max_qty,item.qty+1))} style={{width:26,height:26,borderRadius:6,border:`1px solid ${C.border}`,background:'white',cursor:'pointer',fontSize:16,color:C.navy,fontFamily:'inherit'}}>+</button>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:5}}>
                            <span style={{fontSize:11,color:C.muted}}>Price:</span>
                            <input type="number" value={item.price} onChange={e=>upd(item.inventory_id,'price',parseFloat(e.target.value)||0)} style={{...INP,width:88,padding:'5px 9px',fontSize:13}}/>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:5}}>
                            <span style={{fontSize:11,color:C.muted}}>Disc:</span>
                            <input type="number" value={item.item_discount||0} onChange={e=>upd(item.inventory_id,'item_discount',parseFloat(e.target.value)||0)} placeholder="0" style={{...INP,width:78,padding:'5px 9px',fontSize:13}}/>
                          </div>
                        </div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontSize:15,fontWeight:700,color:C.navy}}>{fmtM(ln)}</div>
                        <button onMouseDown={()=>rem(item.inventory_id)} style={{background:'none',border:'none',color:C.danger,cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit',marginTop:4}}>Remove</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {cart.length>0&&(
              <div style={{background:'white',border:`1px solid ${C.border}`,borderRadius:14,padding:'14px 18px',marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:8}}>💰 Overall Discount (optional)</div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <input type="number" value={overDisc} onChange={e=>setOverDisc(e.target.value)} placeholder="Enter discount Rs." style={{...INP,maxWidth:240}}/>
                  {discAmt>0&&<span style={{fontSize:13,color:C.success,fontWeight:600}}>− {fmtM(discAmt)}</span>}
                </div>
              </div>
            )}

            <div style={{background:'white',border:`1px solid ${C.border}`,borderRadius:14,padding:'14px 18px'}}>
              <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:2}}>👤 Customer <span style={{fontWeight:400,color:C.muted,fontSize:12}}>(optional)</span></div>
              <p style={{fontSize:12,color:C.muted,marginBottom:10,marginTop:4}}>Leave blank for anonymous sale</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <input value={custName}  onChange={e=>setCustName(e.target.value)}  placeholder="Name (optional)"  style={INP}/>
                <input value={custPhone} onChange={e=>setCustPhone(e.target.value)} placeholder="Phone (optional)" type="tel" style={INP}/>
              </div>
            </div>
          </div>

          {/* Desktop right panel */}
          <div style={{position:'sticky',top:80}}>
            <div style={{background:'white',border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
              <div style={{background:C.navy,padding:'16px 18px'}}>
                <div style={{fontSize:11,color:C.gold,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>Sale Total</div>
                {cart.length===0
                  ?<div style={{fontSize:13,color:'#ede9e0'}}>No items yet</div>
                  :<>
                    {cart.map(item=>{const ln=(parseFloat(item.price)||0)*(parseInt(item.qty)||1)-(parseFloat(item.item_discount)||0);return<div key={item.inventory_id} style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#ede9e0',marginBottom:3}}><span>{item.name} ×{item.qty}</span><span>{fmtM(ln)}</span></div>;})}
                    {discAmt>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#86efac',marginBottom:3}}><span>Discount</span><span>− {fmtM(discAmt)}</span></div>}
                    <div style={{borderTop:'1px solid rgba(255,255,255,.2)',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between'}}>
                      <span style={{color:'white',fontWeight:700,fontSize:14}}>TOTAL</span>
                      <span style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:C.gold}}>{fmtM(total)}</span>
                    </div>
                  </>
                }
              </div>
              <div style={{padding:'16px 18px'}}>
                <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:10}}>Payment Method</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:12}}>
                  {[['cash','💵 Cash'],['bank','🏦 Bank'],['card','💳 Card']].map(([v,l])=>(
                    <button key={v} onClick={()=>setPayMethod(v)} style={{padding:'8px 4px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',border:`1.5px solid ${payMethod===v?C.navy:C.border}`,background:payMethod===v?C.navy:'white',color:payMethod===v?'white':C.muted}}>{l}</button>
                  ))}
                </div>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.8px',color:C.muted,display:'block',marginBottom:5}}>Amount Received</label>
                  <input type="number" value={amtPaid} onChange={e=>setAmtPaid(e.target.value)} placeholder={`Min: ${fmtI(total)}`} style={{...INP,fontSize:16,fontWeight:700}}/>
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
                  <button onClick={()=>setAmtPaid(String(total))} style={{padding:'5px 12px',background:C.navy,color:'white',border:'none',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Exact</button>
                  {[500,1000,2000,5000,10000].filter(v=>v>total).slice(0,3).map(v=>(
                    <button key={v} onClick={()=>setAmtPaid(String(v))} style={{padding:'5px 10px',background:C.cream,border:`1px solid ${C.border}`,borderRadius:7,fontSize:12,cursor:'pointer',fontFamily:'inherit',color:C.muted}}>{fmtI(v)}</button>
                  ))}
                </div>
                {paid>=total&&total>0&&(
                  <div style={{background:change>0?'#fef9c3':'#dcfce7',borderRadius:9,padding:'10px 14px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:13,fontWeight:600,color:C.navy}}>{change>0?'💰 Change':'✅ Exact'}</span>
                    {change>0&&<span style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:'#854d0e'}}>{fmtM(change)}</span>}
                  </div>
                )}
                <button onClick={complete} disabled={saving||cart.length===0||paid<total}
                  style={{width:'100%',padding:'13px',fontSize:15,fontWeight:700,cursor:cart.length===0||paid<total||saving?'not-allowed':'pointer',background:cart.length===0||paid<total?C.border:C.success,color:cart.length===0||paid<total?C.muted:'white',border:'none',borderRadius:10,fontFamily:'inherit'}}>
                  {saving?'⏳ Processing...':cart.length===0?'Add items to continue':paid<total?`Need ${fmtM(total-paid)} more`:`✅ Complete Sale · ${fmtM(total)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    {/* ── HISTORY TAB ── */}
    {activeTab==='history' && (
      <div>
        {/* Date range filter for history */}
        <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:10 }}>
          <span style={{ fontSize:12, fontWeight:600, color:C.muted }}>Filter:</span>
          <input type="date" value={histFrom} onChange={e=>setHistFrom(e.target.value)}
            style={{ padding:'6px 10px', border:`1.5px solid ${C.gold}`, borderRadius:8, fontSize:12,
              fontFamily:'inherit', outline:'none', background:'#fef9f0', color:C.navy }}/>
          <span style={{ fontSize:12, color:C.muted }}>to</span>
          <input type="date" value={histTo} onChange={e=>setHistTo(e.target.value)}
            style={{ padding:'6px 10px', border:`1.5px solid ${C.gold}`, borderRadius:8, fontSize:12,
              fontFamily:'inherit', outline:'none', background:'#fef9f0', color:C.navy }}/>
          {(histFrom||histTo) && (
            <button onClick={()=>{ setHistFrom(''); setHistTo(''); }}
              style={{ padding:'5px 10px', background:'#fee2e2', border:'none', borderRadius:8,
                fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.danger }}>
              ✕ Clear
            </button>
          )}
          {histFrom&&histTo && (
            <span style={{ fontSize:11, color:C.muted }}>
              {new Date(histFrom).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} – {new Date(histTo).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
            </span>
          )}
        </div>
        {histLoad
          ? <div style={{textAlign:'center',padding:32,color:C.muted,background:'white',borderRadius:14,border:`1px solid ${C.border}`}}>⏳ Loading...</div>
          : !history.length
            ? <div style={{textAlign:'center',padding:48,color:C.muted,background:'white',borderRadius:14,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:36,marginBottom:12}}>🛍️</div>
                <div style={{fontSize:14,fontWeight:600,color:C.navy}}>No sales yet</div>
              </div>
            : <div style={{background:'white',border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
                {/* Table header */}
                <div style={{display:'grid',gridTemplateColumns:mob?'1fr 80px 70px':'1fr 200px 90px 80px 70px',gap:0,padding:'10px 16px',background:C.cream,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.7px',color:C.muted,borderBottom:`1px solid ${C.border}`}}>
                  <span>Sale / Customer</span>
                  {!mob&&<span>Items</span>}
                  {!mob&&<span>Payment</span>}
                  <span style={{textAlign:'right'}}>Total</span>
                  <span style={{textAlign:'center'}}>Print</span>
                </div>
                {history.filter(sale => {
                  if (histFrom && sale.created_at?.slice(0,10) < histFrom) return false;
                  if (histTo   && sale.created_at?.slice(0,10) > histTo)   return false;
                  return true;
                }).map((sale,i)=>{
                  const prev = history[i-1];
                  const saleDate = sale.created_at?.slice(0,10);
                  const prevDate = prev?.created_at?.slice(0,10);
                  const showDate = saleDate !== prevDate;
                  return (
                    <React.Fragment key={sale.id}>
                      {showDate && (
                        <div style={{padding:'6px 16px',background:'#f8f5ef',fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'1px',borderBottom:`1px solid ${C.border}`}}>
                          {new Date(sale.created_at).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'long',year:'numeric'})}
                        </div>
                      )}
                      <div style={{display:'grid',gridTemplateColumns:mob?'1fr 80px 70px':'1fr 200px 90px 80px 70px',gap:0,padding:'11px 16px',borderBottom:`1px solid ${C.cream}`,alignItems:'center'}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:C.navy}}>{sale.sale_number}</div>
                          <div style={{fontSize:11,color:C.muted}}>
                            {sale.customer_name&&<span>👤 {sale.customer_name} · </span>}
                            {new Date(sale.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
                          </div>
                          {/* Show items on mobile */}
                          {(() => {
                            let items = [];
                            try { items = typeof sale.items==='string' ? JSON.parse(sale.items) : sale.items||[]; } catch(e){}
                            return items.length > 0 ? (
                              <div style={{marginTop:2}}>
                                {items.map((it,i) => (
                                  <span key={i} style={{fontSize:11,color:C.navy,fontWeight:500}}>
                                    {i>0 ? ', ' : ''}{it.name}{it.qty>1?` ×${it.qty}`:''}
                                  </span>
                                ))}
                              </div>
                            ) : null;
                          })()}
                        </div>
                        {!mob&&<div style={{fontSize:12,color:C.muted}}>
                          {(() => {
                            let items = [];
                            try { items = typeof sale.items==='string' ? JSON.parse(sale.items) : sale.items||[]; } catch(e){}
                            if (!items.length) return <span>{sale.item_count||'—'} items</span>;
                            return (
                              <div>
                                {items.map((it,i) => (
                                  <div key={i} style={{fontSize:12,color:C.navy,fontWeight:500,lineHeight:1.4}}>
                                    {it.name}
                                    <span style={{color:C.muted,marginLeft:4}}>×{it.qty||1}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>}
                        {!mob&&<div style={{fontSize:12}}>
                          <span style={{background:sale.payment_method==='cash'?'#dcfce7':'#dbeafe',color:sale.payment_method==='cash'?C.success:'#1e40af',padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:600}}>
                            {sale.payment_method==='cash'?'💵 Cash':'🏦 Bank'}
                          </span>
                        </div>}
                        <div style={{textAlign:'right',fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:C.navy}}>{fmtM(sale.total)}</div>
                        <div style={{textAlign:'center',display:'flex',gap:4,justifyContent:'center'}}>
                          <button onClick={async()=>{
                            try {
                              const BASE=process.env.REACT_APP_API_URL||'http://localhost:5000/api';
                              const token=localStorage.getItem('ko_token');
                              const res=await fetch(`${BASE}/quick-sales/${sale.id}`,{headers:{Authorization:`Bearer ${token}`}});
                              const full=await res.json();
                              printReceipt(sale, full.items||[]);
                            } catch(e){ printReceipt(sale,[]); }
                          }}
                            style={{background:C.gold+'30',color:'#92400e',border:`1px solid ${C.gold}`,borderRadius:7,padding:'5px 10px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                            🖨️
                          </button>
                          <button onClick={async()=>{
                            if(!window.confirm(`Delete sale ${sale.sale_number}? This will also remove any bank receipt.`)) return;
                            const BASE=process.env.REACT_APP_API_URL||'http://localhost:5000/api';
                            const token=localStorage.getItem('ko_token');
                            await fetch(`${BASE}/quick-sales/${sale.id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
                            loadHistory();
                          }}
                            style={{background:'#fee2e2',color:'#c0392b',border:'1px solid #fca5a5',borderRadius:7,padding:'5px 8px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                            🗑️
                          </button>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                {/* Month total */}
                <div style={{padding:'11px 16px',background:C.cream,display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700,borderTop:`1px solid ${C.border}`}}>
                  <span style={{color:C.muted}}>Total ({history.length} sales)</span>
                  <span style={{color:C.navy}}>{fmtM(history.reduce((s,q)=>s+parseFloat(q.total||0),0))}</span>
                </div>
              </div>
        }
      </div>
    )}

    </div>
  );
}