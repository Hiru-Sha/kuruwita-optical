/* eslint-disable */
// ============================================================
//  PrintReceipt.js
//  Advance Bill  = 1/4 A4 landscape (A6 landscape = 148×105mm)
//  Balance Bill  = 1/2 A4 landscape (A5 landscape = 210×148mm)
// ============================================================
import React, { useState } from 'react';

const fmt   = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtD  = (d) => { if(!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}); };
const today = () => new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});

const LOGO = `data:image/jpeg;base64,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`;

// ── SHARED STYLES ─────────────────────────────────────────────
const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #111; background: white; }
  .hdr  { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2.5px solid #111; padding-bottom:5px; margin-bottom:6px; }
  .shop-name { font-size:18px; font-weight:900; letter-spacing:0.3px; }
  .shop-sub  { font-size:9px; color:#555; letter-spacing:2px; text-transform:uppercase; margin-top:2px; }
  .shop-addr { font-size:9.5px; color:#555; margin-top:3px; line-height:1.6; }
  .bill-right { text-align:right; }
  .bill-type { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#555; }
  .bill-no   { font-size:20px; font-weight:900; color:#111; margin-top:3px; }
  .bill-date { font-size:9px; color:#666; margin-top:2px; }
  .sec-title { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; color:#666; border-bottom:1px solid #bbb; padding-bottom:3px; margin-bottom:6px; margin-top:8px; }
  .kv       { margin-bottom:5px; }
  .kv .k    { font-size:8.5px; text-transform:uppercase; letter-spacing:.7px; color:#888; }
  .kv .v    { font-weight:700; font-size:12px; color:#111; }
  .row      { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px dotted #ddd; font-size:12px; }
  .row.disc { color:#555; font-style:italic; }
  .row.sub  { color:#666; font-style:italic; }
  .row.total{ font-weight:900; font-size:14px; border-top:1.5px solid #111; border-bottom:2px solid #111; padding:6px 0; margin-top:2px; }
  .row.paid { font-weight:900; font-size:14px; padding:6px 0; }
  .row.prevpaid { color:#666; font-style:italic; font-size:11px; }
  .row.bal  { font-weight:900; font-size:13px; color:#c00; padding:4px 0; }
  .row.done { font-weight:900; font-size:13px; color:#166534; padding:4px 0; }
  .note     { font-size:9.5px; color:#555; border-top:1px solid #ccc; padding-top:4px; margin-top:6px; font-style:italic; line-height:1.6; }
  .footer   { border-top:1.5px solid #bbb; padding-top:5px; margin-top:8px; display:flex; justify-content:space-between; align-items:center; font-size:8.5px; color:#666; }
  .slogan   { font-size:10px; font-weight:700; color:#333; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
`;

function buildPriceRows(order) {
  const frameSell= parseFloat(order.frame_sell_price || 0);
  const lensSell = parseFloat(order.lens_sell_price  || 0);
  const discAmt  = parseFloat(order.discount_amount  || 0);
  const discPct  = parseFloat(order.discount_percent || 0);
  const freeItems= order.free_items || [];
  const subTotal = frameSell + lensSell;
  const total    = parseFloat(order.total_amount || 0);
  const advance  = parseFloat(order.advance_amount || 0);
  const balance  = parseFloat(order.balance_amount || 0);

  let rows = '';
  if (frameSell > 0) rows += `<div class="row"><span>Frame${order.frame_type?' &nbsp;<small style="color:#888;">('+order.frame_type+')</small>':''}</span><span>${fmt(frameSell)}</span></div>`;
  if (lensSell  > 0) rows += `<div class="row"><span>Lens${order.lens_coating?' &nbsp;<small style="color:#888;">('+order.lens_coating+')</small>':''}</span><span>${fmt(lensSell)}</span></div>`;
  if (freeItems.length > 0) freeItems.forEach(fi => {
    rows += `<div class="row"><span style="color:#166534;">&#127873; ${fi.name} &times;${fi.qty||1}</span><span style="color:#166534;font-weight:700;">FREE</span></div>`;
  });
  if (discAmt > 0 || discPct > 0) {
    rows += `<div class="row sub"><span>Subtotal</span><span>${fmt(subTotal)}</span></div>`;
  }
  rows += `<div class="row total"><span>TOTAL AMOUNT</span><span>${fmt(total)}</span></div>`;
  if (discPct > 0) {
    rows += `<div class="row disc"><span>Discount &mdash; ${discPct}%</span><span style="color:#c00;">- ${fmt(Math.round(subTotal*discPct/100))}</span></div>`;
  } else if (discAmt > 0) {
    rows += `<div class="row disc"><span>Discount</span><span style="color:#c00;">- ${fmt(discAmt)}</span></div>`;
  }
  return { rows, total, advance, balance };
}

// ── ADVANCE BILL — 1/4 A4 landscape (148mm × 105mm) ──────────
function buildAdvanceBill(order) {
  const { rows, total, advance, balance } = buildPriceRows(order);
  const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : today();

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Advance — ${order.order_number}</title>
<style>
  @page { size: 148mm 210mm portrait; margin: 8mm; }
  ${BASE_CSS}
  body { width: 132mm; font-size: 11px; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
</style>
</head><body>

<div class="hdr">
  <div style="display:flex;align-items:center;gap:6px;">
    <img src="${LOGO}" style="height:32px;object-fit:contain;" alt=""/>
    <div>
      <div class="shop-name">Wickramakalutota Opticals</div>
      <div class="shop-sub">Optical Specialists</div>
      <div class="shop-addr">No.57, Kurunegala Road, Chilaw &nbsp;|&nbsp; Tel: 032 222 1211</div>
    </div>
  </div>
  <div class="bill-right">
    <div class="bill-type">Advance Receipt</div>
    <div class="bill-no">${order.order_number}</div>
    <div class="bill-date">Date: ${orderDate}</div>
  </div>
</div>

<div class="grid2">
  <div>
    <div class="sec-title">Customer Details</div>
    <div class="kv"><span class="k">Name</span><div class="v">${order.customer_name||'—'}</div></div>
    <div class="kv"><span class="k">Phone</span><div class="v">${order.phone||'—'}</div></div>
    <div class="sec-title" style="margin-top:5px;">Spectacle Details</div>
    <div class="kv"><span class="k">Frame</span><div class="v">${order.frame||'—'}</div></div>
    <div class="kv"><span class="k">Lens</span><div class="v">${order.lens_type||'—'}${order.lens_coating?' · '+order.lens_coating:''}</div></div>
    <div class="kv"><span class="k">Delivery</span><div class="v">${fmtD(order.deliver_date)}</div></div>
  </div>
  <div>
    <div class="sec-title">Payment</div>
    ${rows}
    <div class="row paid"><span>Advance Paid</span><span>${fmt(advance)}</span></div>
    ${balance > 0 ? `<div class="row bal"><span>Balance Due</span><span>${fmt(balance)}</span></div>` : ''}
    <div class="note">Please bring this receipt when collecting. Balance of ${fmt(balance)} is due on collection.</div>
  </div>
</div>

<div class="footer">
  <span>Wickramakalutota Opticals &middot; No.57 Kurunegala Road, Chilaw &middot; 032 222 1211</span>
  <span class="slogan">Thank you for trusting us with your vision!</span>
  <span>Printed: ${today()}</span>
</div>

<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
</body></html>`;
}

// ── BALANCE BILL — 1/2 A4 landscape (210mm × 148mm) ──────────
function buildBalanceBill(order) {
  const { rows, total, advance, balance } = buildPriceRows(order);
  const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : today();

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Final Bill — ${order.order_number}</title>
<style>
  @page { size: 148mm 210mm portrait; margin: 8mm; }
  ${BASE_CSS}
  body { width: 132mm; font-size: 11px; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
</style>
</head><body>

<div class="hdr">
  <div style="display:flex;align-items:center;gap:8px;">
    <img src="${LOGO}" style="height:28px;object-fit:contain;" alt=""/>
    <div>
      <div class="shop-name">Wickramakalutota Opticals</div>
      <div class="shop-sub">Optical Specialists</div>
      <div class="shop-addr">No.57, Kurunegala Road, Chilaw<br>Tel: 032 222 1211</div>
    </div>
  </div>
  <div class="bill-right">
    <div class="bill-type">Final Receipt &mdash; Balance Paid</div>
    <div class="bill-no">${order.order_number}</div>
    <div class="bill-date">Order Date: ${orderDate}</div>
    <div class="bill-date">Issued: ${today()}</div>
  </div>
</div>

<div class="grid2">
  <div>
    <div class="sec-title">Customer Details</div>
    <div class="kv"><span class="k">Name</span><div class="v">${order.customer_name||'—'}</div></div>
    <div class="kv"><span class="k">Phone</span><div class="v">${order.phone||'—'}</div></div>
    ${order.age?`<div class="kv"><span class="k">Age</span><div class="v">${order.age} years</div></div>`:''}
  </div>
  <div>
    <div class="sec-title">Spectacle Details</div>
    <div class="kv"><span class="k">Frame</span><div class="v">${order.frame||'—'}</div></div>
    <div class="kv"><span class="k">Type</span><div class="v">${order.frame_type||'—'}${order.frame_color?' · '+order.frame_color:''}</div></div>
    <div class="kv"><span class="k">Lens</span><div class="v">${order.lens_type||'—'}</div></div>
    <div class="kv"><span class="k">Coating</span><div class="v">${order.lens_coating||'—'}</div></div>
    ${order.lens_company?`<div class="kv"><span class="k">Supplier</span><div class="v">${order.lens_company}</div></div>`:''}
  </div>
  <div>
    <div class="sec-title">Payment Breakdown</div>
    ${rows}
    ${advance > 0 ? `<div class="row prevpaid"><span>Advance Paid Previously</span><span>- ${fmt(advance)}</span></div>` : ''}
    <div class="row paid"><span>Balance Paid Today</span><span>${fmt(balance)}</span></div>
    <div class="row done"><span>FULLY PAID &mdash; BALANCE: Rs. 0.00</span><span></span></div>
  </div>
</div>

<div class="footer">
  <span>Wickramakalutota Opticals &middot; No.57 Kurunegala Road, Chilaw &middot; Tel: 032 222 1211</span>
  <div style="text-align:center;">
    <div class="slogan">Thank you for trusting us with your vision!</div>
    <div style="font-size:7.5px;color:#555;margin-top:1px;">We are committed to giving you the clearest and most comfortable vision possible.</div>
  </div>
  <span>Printed: ${today()}</span>
</div>

<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
</body></html>`;
}

// ── LAB JOB CARD (A6 portrait, unchanged) ────────────────────
function buildLabCardHTML(order) {
  const ref = order.refraction || order;
  const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : today();
  const rawNotes = order.notes || '';
  const cleanNotes = rawNotes.replace(/imported from past records/gi,'').replace(/^[,;:\s]+|[,;:\s]+$/g,'').trim();
  const val = (v) => v && v !== '—' && v !== '0' && v !== '0.00' ? v : '—';
  const eyeRow = (eye, sph, cyl, axis, add, va) => `<tr>
    <td style="background:#f0f4f8;padding:5px 7px;font-weight:700;font-size:10.5px;border:1px solid #ccd3de;">${eye}</td>
    <td style="padding:5px 4px;text-align:center;border:1px solid #ccd3de;font-size:11px;font-weight:700;">${val(sph)}</td>
    <td style="padding:5px 4px;text-align:center;border:1px solid #ccd3de;font-size:11px;font-weight:700;">${val(cyl)}</td>
    <td style="padding:5px 4px;text-align:center;border:1px solid #ccd3de;font-size:11px;font-weight:700;">${val(axis)}</td>
    <td style="padding:5px 4px;text-align:center;border:1px solid #ccd3de;font-size:11px;font-weight:700;">${val(add)}</td>
    <td style="padding:5px 4px;text-align:center;border:1px solid #ccd3de;font-size:11px;font-weight:700;">${val(va)}</td>
  </tr>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${order.order_number} — Lab</title>
<style>
  @page { size: 105mm 148mm; margin: 4mm; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,sans-serif; color:#0f1f3d; background:white; width:97mm; font-size:9px; }
  table { width:100%; border-collapse:collapse; }
  .sec { border:1px solid #b0bccf; border-radius:4px; overflow:hidden; margin-bottom:3px; }
  .sec-hd { background:#0f1f3d; color:#c9a84c; font-size:6.5px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; padding:2.5px 7px; }
  th { background:#eef1f5; padding:2.5px 5px; font-size:6.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#6b7280; border:1px solid #ccd3de; text-align:center; }
  td { padding:4px 5px; border:1px solid #ccd3de; font-size:10px; font-weight:700; color:#0f1f3d; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:4px;margin-bottom:4px;border-bottom:2px solid #0f1f3d;">
  <div style="display:flex;align-items:center;gap:5px;">
    <img src="${LOGO}" style="height:28px;object-fit:contain;" alt=""/>
    <div>
      <div style="font-size:9.5px;font-weight:700;">Wickramakalutota Opticals</div>
      <div style="font-size:6.5px;color:#6b7280;">No.57, Kurunegala Road, Chilaw · 032 222 1211</div>
    </div>
  </div>
  <div style="text-align:right;">
    <div style="background:#0f1f3d;color:#c9a84c;font-weight:700;font-size:12px;padding:3px 8px;border-radius:4px;margin-bottom:2px;">${order.order_number}</div>
    <div style="font-size:7px;color:#6b7280;">${orderDate}</div>
  </div>
</div>
<div style="background:#f0f4f8;border:1px solid #b0bccf;border-radius:4px;padding:4px 7px;margin-bottom:3px;display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="font-size:6.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;margin-bottom:1px;">Patient</div>
    <div style="font-size:13px;font-weight:700;">${order.customer_name||'—'}</div>
  </div>
  <div style="font-size:6.5px;color:#92400e;background:#fffbeb;padding:2px 6px;border-radius:10px;font-weight:700;border:1px solid #c9a84c;">&#10006; SEND WITH FRAME TO LAB</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:3px;">
  <div class="sec"><div class="sec-hd">Frame</div>
    <table><tr><th style="text-align:left;">Name</th></tr><tr><td style="font-size:10.5px;">${order.frame||'—'}</td></tr>
    <tr><th style="text-align:left;width:50%;">Type</th><th style="text-align:left;">Color</th></tr>
    <tr><td style="font-size:9px;">${order.frame_type||'—'}</td><td style="font-size:9px;">${order.frame_color||'—'}</td></tr></table>
  </div>
  <div class="sec"><div class="sec-hd">Lens</div>
    <table><tr><th style="text-align:left;" colspan="2">Type</th></tr><tr><td colspan="2" style="font-size:10px;">${order.lens_type||'—'}</td></tr>
    <tr><th style="text-align:left;">Coating</th><th style="text-align:left;">Index</th></tr>
    <tr><td style="font-size:9px;">${order.lens_coating||'—'}</td><td style="font-size:9px;">${order.lens_index||'—'}</td></tr></table>
  </div>
</div>
<div class="sec" style="margin-bottom:3px;"><div class="sec-hd">Prescription (Rx)</div>
  <table>
    <tr><th style="width:18%;text-align:left;">Eye</th><th>SPH</th><th>CYL</th><th>AXIS</th><th>ADD</th><th>VA</th></tr>
    ${eyeRow('Right (R)', ref.r_sph, ref.r_cyl, ref.r_axis, ref.r_add, ref.r_va)}
    ${eyeRow('Left (L)',  ref.l_sph, ref.l_cyl, ref.l_axis, ref.l_add, ref.l_va)}
  </table>
</div>
<div class="sec" style="margin-bottom:3px;"><div class="sec-hd">Measurements</div>
  <table>
    <tr><th style="width:50%;text-align:center;">PD (mm)</th><th style="text-align:center;">Seg Height (mm)</th></tr>
    <tr><td style="font-size:14px;font-weight:700;text-align:center;height:18px;">${ref.r_pd||ref.l_pd||''}</td>
        <td style="font-size:14px;font-weight:700;text-align:center;height:18px;">${order.seg_height_r||''}</td></tr>
  </table>
</div>
<div class="sec" style="margin-bottom:4px;"><div class="sec-hd">Special Instructions</div>
  <div style="padding:5px 7px;min-height:24px;font-size:10px;font-weight:700;line-height:1.5;">${cleanNotes||''}</div>
</div>
<div style="border-top:1px solid #d0d7e0;padding-top:2px;display:flex;justify-content:space-between;">
  <div style="font-size:6px;color:#9ca3af;">Wickramakalutota Opticals · No.57 Kurunegala Road · 032 222 1211</div>
  <div style="font-size:6px;color:#9ca3af;">Printed: ${today()}</div>
</div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
</body></html>`;
}

function openPrint(html) {
  const win = window.open('','_blank','width=800,height=700');
  if (!win) { alert('Please allow popups to print.'); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280' };

export default function PrintReceipt({ order, onClose }) {
  const [tab, setTab] = useState('advance');

  const TABS = [
    { key:'advance', label:'🧾 Advance Bill',  desc:'1/4 A4 landscape · Quick advance receipt' },
    { key:'balance', label:'✅ Balance Bill',   desc:'1/2 A4 landscape · Full final receipt'    },
    { key:'lab',     label:'🔬 Lab Job Card',   desc:'A6 portrait · Send to grinding lab'       },
  ];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.65)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16,
      fontFamily:"'DM Sans',sans-serif" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:460,
        boxShadow:'0 24px 80px rgba(0,0,0,.35)', overflow:'hidden' }}>

        <div style={{ background:C.navy, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ color:'white', fontWeight:700, fontSize:16 }}>🖨️ Print Bill</div>
            <div style={{ color:C.gold, fontSize:12, marginTop:2 }}>{order.order_number} · {order.customer_name}</div>
          </div>
          <button onClick={onClose}
            style={{ background:'rgba(255,255,255,.15)', border:'none', color:'white', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:14 }}>✕</button>
        </div>

        <div style={{ display:'flex', borderBottom:`1px solid ${C.border}` }}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)}
              style={{ flex:1, padding:'11px 6px', fontSize:11, fontWeight:600, cursor:'pointer',
                background:'none', border:'none', fontFamily:'inherit',
                color:tab===t.key?C.navy:C.muted,
                borderBottom:`2.5px solid ${tab===t.key?C.gold:'transparent'}`,
                marginBottom:-1 }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding:'18px 20px' }}>
          <div style={{ background:C.cream, borderRadius:10, padding:'12px 14px', marginBottom:14, fontSize:12, color:C.muted }}>
            {TABS.find(t=>t.key===tab)?.desc}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
            {[
              { l:'Total',    v:fmt(order.total_amount)   },
              { l:'Advance',  v:fmt(order.advance_amount) },
              { l:'Balance',  v:fmt(order.balance_amount) },
              { l:'Delivery', v:fmtD(order.deliver_date)  },
            ].map(r=>(
              <div key={r.l} style={{ background:'#f9f9f9', borderRadius:8, padding:'8px 10px' }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted, marginBottom:2 }}>{r.l}</div>
                <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{r.v||'—'}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>{
            if (tab==='advance') openPrint(buildAdvanceBill(order));
            if (tab==='balance') openPrint(buildBalanceBill(order));
            if (tab==='lab')     openPrint(buildLabCardHTML(order));
          }}
            style={{ width:'100%', padding:'13px', background:C.navy, color:C.gold, border:'none',
              borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            🖨️ Print {TABS.find(t=>t.key===tab)?.label}
          </button>
        </div>
      </div>
    </div>
  );
}