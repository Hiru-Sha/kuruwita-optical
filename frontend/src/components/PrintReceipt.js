/* eslint-disable */
// ============================================================
//  PrintReceipt.js — Professional Half-A4 Bill
//  Redesigned: discounts, free items, signature & seal space
// ============================================================
import React, { useState } from 'react';

const fmtMoney = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtDate  = (d) => { if(!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}); };
const todayStr = () => new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});

const navy = '#0f1f3d', gold = '#c9a84c', cream = '#f8f5ef',
      border = '#e0ddd6', muted = '#6b7280';

// ─────────────────────────────────────────────────────────────
//  SHARED LOGO (base64)
// ─────────────────────────────────────────────────────────────
const LOGO_B64 = `data:image/jpeg;base64,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`;

// ─────────────────────────────────────────────────────────────
//  BUILD CUSTOMER BILL HTML  (half-A4 / A5 — 148×210 mm)
// ─────────────────────────────────────────────────────────────
function buildCustomerBillHTML(order, billType) {
  const total     = parseFloat(order.total_amount    || 0);
  const advance   = parseFloat(order.advance_amount  || 0);
  const balance   = parseFloat(order.balance_amount  || 0);
  const frameSell = parseFloat(order.frame_sell_price || 0);
  const lensSell  = parseFloat(order.lens_sell_price  || 0);
  const discAmt   = parseFloat(order.discount_amount  || 0);
  const discPct   = parseFloat(order.discount_percent || 0);
  const freeItems = order.free_items || [];
  const isAdvance = billType === 'advance';
  const amtPaid   = isAdvance ? advance : balance;
  const remaining = isAdvance ? balance : 0;

  const fmt   = n => 'Rs.\u00a0' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fdate = d => !d ? '—' : new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
  const today     = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
  const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : today;
  const subTotal  = frameSell + lensSell;
  const discCalc  = discPct > 0 ? (subTotal * discPct / 100) : discAmt;
  const hasDisc   = discCalc > 0;
  const hasFree   = freeItems.length > 0;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${order.order_number}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: 148mm 210mm; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy:   #0c1c38;
    --gold:   #c9a84c;
    --gold2:  #f0d080;
    --cream:  #faf7f2;
    --line:   #e4e0d8;
    --muted:  #7a8494;
    --green:  #166534;
    --greenb: #dcfce7;
    --red:    #b91c1c;
    --redb:   #fef2f2;
    --blueb:  #eff6ff;
    --blue:   #1d4ed8;
    --amber:  #92400e;
    --amberb: #fffbea;
  }

  body {
    font-family: 'Outfit', 'Segoe UI', sans-serif;
    color: var(--navy);
    background: white;
    width: 148mm;
    min-height: 210mm;
  }

  /* ─ LETTERHEAD ─ */
  .lh {
    background: var(--navy);
    padding: 9mm 10mm 8mm;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .lh-brand { display: flex; align-items: center; gap: 9px; }
  .lh-logo  { height: 33px; object-fit: contain; flex-shrink: 0; }
  .lh-name  {
    font-family: 'Cormorant Garamond', serif;
    font-size: 15.5px; font-weight: 700;
    color: white; letter-spacing: .2px; line-height: 1.2;
  }
  .lh-tag   { font-size: 6.5px; color: var(--gold); letter-spacing: 2.2px; text-transform: uppercase; margin-top: 2px; }
  .lh-addr  { font-size: 7.5px; color: rgba(255,255,255,.5); margin-top: 4px; line-height: 1.55; }

  .lh-meta  { text-align: right; }
  .lh-type  { font-size: 6.5px; font-weight: 600; color: var(--gold); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 5px; }
  .lh-num   {
    display: inline-block;
    background: var(--gold);
    color: var(--navy);
    font-family: 'Outfit', sans-serif;
    font-weight: 700; font-size: 13px;
    padding: 3px 12px; border-radius: 5px;
    letter-spacing: .5px; margin-bottom: 4px;
  }
  .lh-date  { font-size: 7px; color: rgba(255,255,255,.45); }

  /* ─ GOLD RULE ─ */
  .gold-bar { height: 3px; background: linear-gradient(90deg, #7a5c1e, var(--gold), var(--gold2), var(--gold), #7a5c1e); }

  /* ─ STATUS STRIP ─ */
  .status {
    padding: 5px 10mm;
    font-size: 7.5px; font-weight: 700;
    letter-spacing: 1.5px; text-transform: uppercase;
    display: flex; align-items: center; gap: 7px;
  }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

  /* ─ BODY ─ */
  .body { padding: 5mm 10mm 3mm; }

  /* ─ GRID CARDS ─ */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-bottom: 4mm; }
  .card { border: 1px solid var(--line); border-radius: 7px; overflow: hidden; }
  .card-hd {
    background: #f4f6fa;
    padding: 3.5px 9px;
    font-size: 6.5px; font-weight: 600;
    letter-spacing: 1.3px; text-transform: uppercase; color: var(--muted);
    border-bottom: 1px solid var(--line);
  }
  .r { display: flex; justify-content: space-between; align-items: baseline; padding: 4.5px 9px; border-bottom: 1px solid #f0f2f5; }
  .r:last-child { border-bottom: none; }
  .rl { font-size: 7.5px; color: var(--muted); font-weight: 400; }
  .rv { font-size: 8.5px; font-weight: 600; color: var(--navy); text-align: right; max-width: 58%; }
  .rv.g { color: var(--green); font-weight: 700; }

  /* ─ DELIVERY BANNER ─ */
  .deliv {
    display: flex; justify-content: space-between; align-items: center;
    background: linear-gradient(125deg, #0c1c38 0%, #1a3460 100%);
    border-radius: 7px; padding: 7px 11px; margin-bottom: 4mm;
  }
  .deliv-lbl { font-size: 6.5px; font-weight: 600; color: var(--gold); letter-spacing: 2px; text-transform: uppercase; }
  .deliv-val { font-size: 12px; font-weight: 700; color: white; }

  /* ─ PAYMENT BOX ─ */
  .pay { border: 1px solid var(--line); border-radius: 7px; overflow: hidden; margin-bottom: 4mm; }
  .pay-hd {
    background: #f4f6fa;
    padding: 3.5px 9px;
    font-size: 6.5px; font-weight: 600;
    letter-spacing: 1.3px; text-transform: uppercase; color: var(--muted);
    border-bottom: 1px solid var(--line);
  }
  .pr { display: flex; justify-content: space-between; align-items: center; padding: 5.5px 9px; border-bottom: 1px solid #f0f2f5; font-size: 8.5px; }
  .pr:last-child { border-bottom: none; }
  .pl { color: #536070; }
  .pv { font-weight: 600; color: var(--navy); }

  .pr.free  { background: #f0fdf6; }
  .pr.free .pl { color: var(--green); }
  .pr.free .pv { color: var(--green); font-weight: 700; }

  .pr.disc  { background: var(--amberb); }
  .pr.disc .pl { color: var(--amber); }
  .pr.disc .pv { color: var(--red); font-weight: 700; }

  .pr.sub   { background: #f8f9fb; font-size: 8px; color: var(--muted); }

  .pay-total {
    display: flex; justify-content: space-between; align-items: center;
    padding: 7.5px 9px;
    background: var(--navy); color: white;
    font-size: 10px; font-weight: 700; letter-spacing: .3px;
  }

  .pay-paid {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 9px;
  }
  .pay-paid .lbl { font-size: 9px; font-weight: 600; }
  .pay-paid .amt { font-size: 16px; font-weight: 800; }

  .pay-due {
    display: flex; justify-content: space-between; align-items: center;
    padding: 6px 9px; background: var(--redb);
    border-top: 1px dashed #fca5a5;
    color: var(--red); font-size: 9px; font-weight: 700;
  }
  .pay-due .amt { font-size: 13px; }

  .pay-settled {
    text-align: center; padding: 5.5px;
    background: var(--greenb); color: var(--green);
    font-size: 8.5px; font-weight: 700; letter-spacing: .4px;
    border-top: 1px dashed #86efac;
  }

  /* ─ NOTE ─ */
  .note { border-radius: 6px; padding: 6px 9px; font-size: 8px; line-height: 1.6; margin-bottom: 4mm; }

  /* ─ SIGNATURE / SEAL ─ */
  .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-bottom: 4mm; }

  .sig-box {
    border: 1px dashed var(--gold);
    border-radius: 6px;
    padding: 5px 9px 4px;
    min-height: 22mm;
    display: flex; flex-direction: column; justify-content: flex-end;
  }
  .sig-line { height: 1px; background: var(--line); margin-bottom: 3px; }
  .sig-label {
    font-size: 6.5px; font-weight: 600;
    letter-spacing: 1.1px; text-transform: uppercase; color: var(--muted);
  }

  .seal-box {
    border: 1px dashed var(--gold);
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    min-height: 22mm;
  }
  .seal-circle {
    width: 38mm; height: 38mm;
    border: 1.5px dashed var(--gold);
    border-radius: 50%;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 2px;
  }
  .seal-text { font-size: 6.5px; font-weight: 700; color: var(--gold); letter-spacing: 1px; text-align: center; line-height: 1.4; }

  /* ─ FOOTER ─ */
  .footer {
    border-top: 1px solid var(--line);
    padding: 4px 10mm;
    display: flex; justify-content: space-between; align-items: center;
  }
  .footer span { font-size: 6.5px; color: #aab0bc; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<!-- ══ LETTERHEAD ══ -->
<div class="lh">
  <div class="lh-brand">
    <img class="lh-logo" src="${LOGO_B64}" alt="Logo"/>
    <div>
      <div class="lh-name">Wickramakalutota Opticals</div>
      <div class="lh-tag">Optical Specialists</div>
      <div class="lh-addr">No.57, Kurunegala Road, Chilaw &nbsp;·&nbsp; Tel: 032 222 1211</div>
    </div>
  </div>
  <div class="lh-meta">
    <div class="lh-type">${isAdvance ? 'Advance Receipt' : 'Final Receipt'}</div>
    <div class="lh-num">${order.order_number}</div>
    <div class="lh-date">Date: ${orderDate}</div>
  </div>
</div>
<div class="gold-bar"></div>

<!-- ══ STATUS ══ -->
<div class="status" style="background:${isAdvance ? '#162944' : '#0d3320'}; color:${isAdvance ? '#93c5fd' : '#86efac'};">
  <div class="status-dot" style="background:${isAdvance ? '#60a5fa' : '#4ade80'};"></div>
  ${isAdvance ? 'Advance Payment Received' : 'Payment Completed — Thank You!'}
</div>

<div class="body">

  <!-- CUSTOMER + ORDER -->
  <div class="two-col">
    <div class="card">
      <div class="card-hd">Customer</div>
      <div class="r"><span class="rl">Name</span><span class="rv">${order.customer_name || '—'}</span></div>
      <div class="r"><span class="rl">Phone</span><span class="rv">${order.phone || '—'}</span></div>
      ${order.age ? `<div class="r"><span class="rl">Age</span><span class="rv">${order.age} yrs</span></div>` : ''}
    </div>
    <div class="card">
      <div class="card-hd">Order Details</div>
      <div class="r"><span class="rl">Frame</span><span class="rv">${order.frame || '—'}</span></div>
      <div class="r"><span class="rl">Lens</span><span class="rv">${order.lens_type || '—'}</span></div>
      <div class="r"><span class="rl">Coating</span><span class="rv">${order.lens_coating || '—'}</span></div>
    </div>
  </div>

  <!-- DELIVERY DATE -->
  <div class="deliv">
    <div class="deliv-lbl">Expected Delivery Date</div>
    <div class="deliv-val">📅&nbsp; ${fdate(order.deliver_date)}</div>
  </div>

  <!-- PAYMENT SUMMARY -->
  <div class="pay">
    <div class="pay-hd">Payment Summary</div>

    ${frameSell > 0 ? `<div class="pr"><span class="pl">Frame${order.frame_type ? ' — ' + order.frame_type : ''}</span><span class="pv">${fmt(frameSell)}</span></div>` : ''}
    ${lensSell  > 0 ? `<div class="pr"><span class="pl">Lens — ${order.lens_type || ''} ${order.lens_coating || ''}</span><span class="pv">${fmt(lensSell)}</span></div>` : ''}

    ${hasFree ? freeItems.map(fi => `
      <div class="pr free">
        <span class="pl">🎁 ${fi.name}${fi.qty > 1 ? ' &times;' + fi.qty : ''} <em style="font-size:7px;font-weight:400;">(complimentary)</em></span>
        <span class="pv">FREE</span>
      </div>`).join('') : ''}

    ${hasDisc && (frameSell > 0 || lensSell > 0) ? `<div class="pr sub"><span>Subtotal</span><span>${fmt(subTotal)}</span></div>` : ''}

    ${discPct > 0 ? `<div class="pr disc"><span class="pl">🏷 Discount (${discPct}%)</span><span class="pv">&#8722; ${fmt(subTotal * discPct / 100)}</span></div>` : ''}
    ${discAmt > 0 && discPct === 0 ? `<div class="pr disc"><span class="pl">🏷 Discount</span><span class="pv">&#8722; ${fmt(discAmt)}</span></div>` : ''}

    <div class="pay-total"><span>Total Amount</span><span>${fmt(total)}</span></div>

    <div class="pay-paid" style="background:${isAdvance ? 'var(--blueb)' : 'var(--greenb)'};">
      <span class="lbl" style="color:${isAdvance ? 'var(--blue)' : 'var(--green)'};">
        ${isAdvance ? '✅ Advance Paid' : '✅ Balance Paid'}
      </span>
      <span class="amt" style="color:${isAdvance ? 'var(--blue)' : 'var(--green)'};">${fmt(amtPaid)}</span>
    </div>

    ${remaining > 0 ? `
    <div class="pay-due">
      <span>Balance Due on Collection</span>
      <span class="amt">${fmt(remaining)}</span>
    </div>` : ''}

    ${!isAdvance && remaining <= 0 ? `<div class="pay-settled">✦ &nbsp; Fully Settled — Balance: Rs. 0.00 &nbsp; ✦</div>` : ''}
  </div>

  <!-- NOTE -->
  <div class="note" style="background:${isAdvance ? 'var(--amberb)' : 'var(--greenb)'}; border:1px solid ${isAdvance ? '#fde68a' : '#86efac'}; color:${isAdvance ? 'var(--amber)' : 'var(--green)'};">
    ${isAdvance
      ? `Please bring this receipt when collecting your spectacles. A balance of <strong>${fmt(remaining)}</strong> is payable on collection.`
      : `Thank you for choosing Wickramakalutota Opticals. We wish you perfect vision! 🙏`}
  </div>

  <!-- SIGNATURE + SEAL -->
  <div class="sig-row">
    <div class="sig-box">
      <div style="flex:1;"></div>
      <div class="sig-line"></div>
      <div class="sig-label">Authorised Signature</div>
    </div>
    <div class="seal-box">
      <div class="seal-circle">
        <div class="seal-text">OFFICIAL<br>SEAL</div>
      </div>
    </div>
  </div>

</div><!-- /body -->

<!-- FOOTER — print date only; address lives in letterhead -->
<div class="footer">
  <span>This is a computer generated receipt.</span>
  <span>Printed: ${today}</span>
</div>

<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
</body>
</html>`;
}


// ─────────────────────────────────────────────────────────────
//  BUILD LAB CARD HTML  (A6 / half-A5)
// ─────────────────────────────────────────────────────────────
function buildLabCardHTML(order) {
  const ref   = order.refraction || order;
  const today = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})
    : today;

  const rawNotes = order.notes || '';
  const cleanNotes = rawNotes
    .replace(/imported from past records/gi,'')
    .replace(/^[,;:\s]+|[,;:\s]+$/g,'')
    .trim();

  const val = v => v && v !== '—' && v !== '0' && v !== '0.00' ? v : '—';

  const eyeRow = (eye, sph, cyl, axis, add, va) => `
    <tr>
      <td style="background:#f0f4f8;padding:5px 7px;font-weight:700;font-size:10.5px;border:1px solid #ccd3de;color:#0f1f3d;">${eye}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccd3de;font-size:11px;font-weight:700;color:#0f1f3d;">${val(sph)}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccd3de;font-size:11px;font-weight:700;color:#0f1f3d;">${val(cyl)}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccd3de;font-size:11px;font-weight:700;color:#0f1f3d;">${val(axis)}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccd3de;font-size:11px;font-weight:700;color:#0f1f3d;">${val(add)}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccd3de;font-size:11px;font-weight:700;color:#0f1f3d;">${val(va)}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${order.order_number} — Lab Job Card</title>
<style>
  @page { size: 105mm 148mm; margin: 4mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Arial', sans-serif; color: #0f1f3d; background: white; width: 97mm; font-size: 9px; }
  table { width: 100%; border-collapse: collapse; }
  .sec { border: 1px solid #b0bccf; border-radius: 4px; overflow: hidden; margin-bottom: 3px; }
  .sec-hd { background: #0f1f3d; color: #c9a84c; font-size: 6.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; padding: 2.5px 7px; }
  th { background: #eef1f5; padding: 2.5px 5px; font-size: 6.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border: 1px solid #ccd3de; text-align: center; }
  td { padding: 4px 5px; border: 1px solid #ccd3de; font-size: 10px; font-weight: 700; color: #0f1f3d; }
</style>
</head>
<body>
<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:4px;margin-bottom:4px;border-bottom:2px solid #0f1f3d;">
  <div style="display:flex;align-items:center;gap:5px;">
    <img src="${LOGO_B64}" alt="Logo" style="height:28px;object-fit:contain;"/>
    <div>
      <div style="font-size:9.5px;font-weight:700;color:#0f1f3d;line-height:1.3;">Wickramakalutota Opticals</div>
      <div style="font-size:6.5px;color:#6b7280;line-height:1.4;">No.57, Kurunegala Road, Chilaw</div>
      <div style="font-size:6.5px;color:#6b7280;">Tel: 032 222 1211</div>
    </div>
  </div>
  <div style="text-align:right;">
    <div style="background:#0f1f3d;color:#c9a84c;font-weight:700;font-size:12px;padding:3px 8px;border-radius:4px;letter-spacing:.5px;margin-bottom:2px;">${order.order_number}</div>
    <div style="font-size:7px;color:#6b7280;">${orderDate}</div>
  </div>
</div>

<div style="background:#f0f4f8;border:1px solid #b0bccf;border-radius:4px;padding:4px 7px;margin-bottom:3px;display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="font-size:6.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;margin-bottom:1px;">Patient</div>
    <div style="font-size:13px;font-weight:700;color:#0f1f3d;">${order.customer_name||'—'}</div>
  </div>
  <div style="border:1px solid #c9a84c;color:#92400e;background:#fffbeb;padding:2px 6px;border-radius:10px;font-weight:700;font-size:6.5px;">✦ SEND WITH FRAME TO LAB ✦</div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:3px;">
  <div class="sec">
    <div class="sec-hd">Frame</div>
    <table>
      <tr><th style="text-align:left;">Name / Description</th></tr>
      <tr><td style="font-size:10.5px;">${order.frame||'—'}</td></tr>
      <tr><th style="text-align:left;width:50%;">Type</th><th style="text-align:left;">Color</th></tr>
      <tr><td style="font-size:9px;">${order.frame_type||'—'}</td><td style="font-size:9px;">${order.frame_color||'—'}</td></tr>
    </table>
  </div>
  <div class="sec">
    <div class="sec-hd">Lens</div>
    <table>
      <tr><th style="text-align:left;" colspan="2">Type</th></tr>
      <tr><td colspan="2" style="font-size:10px;">${order.lens_type||'—'}</td></tr>
      <tr><th style="text-align:left;">Coating</th><th style="text-align:left;">Index</th></tr>
      <tr><td style="font-size:9px;">${order.lens_coating||'—'}</td><td style="font-size:9px;">${order.lens_index||'—'}</td></tr>
    </table>
  </div>
</div>

<div class="sec" style="margin-bottom:3px;">
  <div class="sec-hd">Prescription (Rx)</div>
  <table>
    <tr><th style="width:18%;text-align:left;">Eye</th><th>SPH</th><th>CYL</th><th>AXIS</th><th>ADD</th><th>VA</th></tr>
    ${eyeRow('Right (R)', ref.r_sph, ref.r_cyl, ref.r_axis, ref.r_add, ref.r_va)}
    ${eyeRow('Left (L)',  ref.l_sph, ref.l_cyl, ref.l_axis, ref.l_add, ref.l_va)}
  </table>
</div>

<div class="sec" style="margin-bottom:3px;">
  <div class="sec-hd">Measurements</div>
  <table>
    <tr><th style="width:50%;text-align:center;">PD (mm)</th><th style="text-align:center;">Seg Height (mm)</th></tr>
    <tr>
      <td style="font-size:14px;font-weight:700;text-align:center;height:18px;">${ref.r_pd||ref.l_pd||''}</td>
      <td style="font-size:14px;font-weight:700;text-align:center;height:18px;">${order.seg_height_r||''}</td>
    </tr>
  </table>
</div>

<div class="sec" style="margin-bottom:4px;">
  <div class="sec-hd">Special Instructions / Grinding Notes</div>
  <div style="padding:5px 7px;min-height:24px;font-size:10px;font-weight:700;color:#0f1f3d;line-height:1.5;border-bottom:1px dashed #ccd3de;">${cleanNotes || ''}</div>
</div>

<div style="border-top:1px solid #d0d7e0;padding-top:2px;display:flex;justify-content:space-between;align-items:center;">
  <div style="font-size:6px;color:#9ca3af;">Wickramakalutota Opticals · No.57 Kurunegala Road, Chilaw · 032 222 1211</div>
  <div style="font-size:6px;color:#9ca3af;">Printed: ${today}</div>
</div>

<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
</body>
</html>`;
}


// ─────────────────────────────────────────────────────────────
//  PRINT + PDF HELPERS
// ─────────────────────────────────────────────────────────────
function openPrintWindow(htmlContent) {
  const win = window.open('', '_blank', 'width=700,height=900');
  if (!win) { alert('Please allow popups for this site to print bills.'); return; }
  win.document.open();
  win.document.write(htmlContent);
  win.document.close();
}

function downloadPDF(htmlContent, filename) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:600px;height:900px;border:none;background:white;';
  document.body.appendChild(iframe);

  iframe.onload = function () {
    const doGen = () => {
      const opt = {
        margin:      [6, 6, 6, 6],
        filename,
        image:       { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: 560, scrollX: 0, scrollY: 0 },
        jsPDF:       { unit: 'mm', format: 'a5', orientation: 'portrait', compress: true },
        pagebreak:   { mode: 'avoid-all' },
      };
      window.html2pdf().set(opt).from(iframe.contentDocument.body).save()
        .then(() => document.body.removeChild(iframe))
        .catch(e => { console.error(e); document.body.removeChild(iframe); alert('PDF generation failed. Use Print → Save as PDF instead.'); });
    };
    if (!window.html2pdf) {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      s.onload  = doGen;
      s.onerror = () => { document.body.removeChild(iframe); alert('Could not load PDF library.'); };
      document.head.appendChild(s);
    } else { doGen(); }
  };

  const paddedHtml = htmlContent
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace('body {', 'body { padding: 6px !important; ')
    .replace('body{',  'body{ padding: 6px !important; ');
  iframe.contentDocument.open();
  iframe.contentDocument.write(paddedHtml);
  iframe.contentDocument.close();
}


// ═════════════════════════════════════════════════════════════
//  MAIN MODAL COMPONENT
// ═════════════════════════════════════════════════════════════
export default function PrintReceipt({ order, onClose }) {
  const [activeTab, setActiveTab] = useState('advance');

  const handlePrint = () => {
    if (activeTab === 'advance') openPrintWindow(buildCustomerBillHTML(order, 'advance'));
    if (activeTab === 'balance') openPrintWindow(buildCustomerBillHTML(order, 'balance'));
    if (activeTab === 'lab')     openPrintWindow(buildLabCardHTML(order));
  };

  const handleDownload = () => {
    const fname = type => `${order.order_number}-${type}-${new Date().toISOString().slice(0,10)}.pdf`;
    if (activeTab === 'advance') downloadPDF(buildCustomerBillHTML(order, 'advance'), fname('advance-bill'));
    if (activeTab === 'balance') downloadPDF(buildCustomerBillHTML(order, 'balance'), fname('balance-bill'));
    if (activeTab === 'lab')     downloadPDF(buildLabCardHTML(order),                 fname('lab-card'));
  };

  const tabs = [
    { key:'advance', label:'🧾 Advance Bill' },
    { key:'balance', label:'✅ Balance Bill' },
    { key:'lab',     label:'🔬 Lab Job Card' },
  ];

  // ── Inline modal preview ──────────────────────────────────
  const PreviewBill = ({ billType }) => {
    const total     = parseFloat(order.total_amount    || 0);
    const advance   = parseFloat(order.advance_amount  || 0);
    const balance   = parseFloat(order.balance_amount  || 0);
    const frameSell = parseFloat(order.frame_sell_price || 0);
    const lensSell  = parseFloat(order.lens_sell_price  || 0);
    const discAmt   = parseFloat(order.discount_amount  || 0);
    const discPct   = parseFloat(order.discount_percent || 0);
    const freeItems = order.free_items || [];
    const isAdv     = billType === 'advance';
    const amtPaid   = isAdv ? advance : balance;
    const remaining = isAdv ? balance : 0;
    const subTotal  = frameSell + lensSell;
    const discCalc  = discPct > 0 ? subTotal * discPct / 100 : discAmt;
    const hasDisc   = discCalc > 0;
    const hasFree   = freeItems.length > 0;

    const S = {
      wrap:    { maxWidth: 460, margin: '0 auto', fontFamily: "'Outfit', 'DM Sans', sans-serif", color: navy },
      hdr:     { background: navy, borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
      section: { marginBottom: 14 },
      secLbl:  { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: muted, marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${border}` },
      grid2:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 },
      tile:    { background: cream, borderRadius: 8, padding: '7px 11px' },
      tileL:   { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: muted, marginBottom: 2 },
      tileV:   { fontSize: 13, fontWeight: 600, color: navy },
      payBox:  { background: cream, borderRadius: 10, padding: '12px 14px' },
      payRow:  { display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: muted },
      divider: { borderTop: `1.5px solid ${border}`, margin: '8px 0' },
    };

    return (
      <div style={S.wrap}>
        {/* Header */}
        <div style={S.hdr}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 2 }}>
              👁️ Wickramakalutota Opticals
            </div>
            <div style={{ fontSize: 9, color: gold, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 3 }}>
              {isAdv ? 'Advance Receipt' : 'Final Receipt — Balance Paid'}
            </div>
            <div style={{ fontSize: 11, color: '#ede9e0' }}>No.57 Kurunegala Road, Chilaw &nbsp;|&nbsp; 032 222 1211</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ background: gold, color: navy, fontWeight: 700, fontSize: 13, padding: '5px 12px', borderRadius: 7, marginBottom: 4 }}>
              {order.order_number}
            </div>
            <div style={{ fontSize: 11, color: '#ede9e0' }}>Date: {todayStr()}</div>
          </div>
        </div>

        {/* Delivery highlight */}
        <div style={{ background: navy, borderRadius: 8, padding: '8px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: gold, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 }}>Expected Delivery</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>📅 {fmtDate(order.deliver_date)}</span>
        </div>

        {/* Customer */}
        <div style={S.section}>
          <div style={S.secLbl}>Customer</div>
          <div style={S.grid2}>
            {[{l:'Name',v:order.customer_name},{l:'Phone',v:order.phone},{l:'Age',v:order.age?order.age+' yrs':'—'}].map(i=>(
              <div key={i.l} style={S.tile}><div style={S.tileL}>{i.l}</div><div style={S.tileV}>{i.v||'—'}</div></div>
            ))}
          </div>
        </div>

        {/* Order details */}
        <div style={S.section}>
          <div style={S.secLbl}>Spectacle Details</div>
          <div style={S.grid2}>
            {[{l:'Frame',v:order.frame},{l:'Frame Type',v:order.frame_type},{l:'Lens Type',v:order.lens_type},{l:'Coating',v:order.lens_coating}].map(i=>(
              <div key={i.l} style={S.tile}><div style={S.tileL}>{i.l}</div><div style={S.tileV}>{i.v||'—'}</div></div>
            ))}
          </div>
        </div>

        {/* Payment */}
        <div style={S.section}>
          <div style={S.secLbl}>Payment Summary</div>
          <div style={S.payBox}>
            {frameSell > 0 && <div style={S.payRow}><span>Frame</span><span>{fmtMoney(frameSell)}</span></div>}
            {lensSell  > 0 && <div style={S.payRow}><span>Lens ({order.lens_type})</span><span>{fmtMoney(lensSell)}</span></div>}
            {hasFree && freeItems.map(fi=>(
              <div key={fi.name} style={{...S.payRow, color:'#166534', background:'#f0fdf4', padding:'4px 6px', borderRadius:5, marginTop:3}}>
                <span>🎁 {fi.name}{fi.qty>1?` ×${fi.qty}`:''} (free)</span><span style={{fontWeight:700}}>FREE</span>
              </div>
            ))}
            {hasDisc && (frameSell>0||lensSell>0) && (
              <div style={{...S.payRow, color:muted, fontSize:12}}><span>Subtotal</span><span>{fmtMoney(subTotal)}</span></div>
            )}
            {discPct > 0 && (
              <div style={{...S.payRow, color:'#b91c1c', background:'#fffbea', padding:'4px 6px', borderRadius:5}}>
                <span>🏷 Discount ({discPct}%)</span><span style={{fontWeight:700}}>− {fmtMoney(subTotal*discPct/100)}</span>
              </div>
            )}
            {discAmt > 0 && discPct === 0 && (
              <div style={{...S.payRow, color:'#b91c1c', background:'#fffbea', padding:'4px 6px', borderRadius:5}}>
                <span>🏷 Discount</span><span style={{fontWeight:700}}>− {fmtMoney(discAmt)}</span>
              </div>
            )}
            <div style={S.divider}/>
            <div style={{...S.payRow, fontSize:15, fontWeight:700, color:navy}}><span>Total Amount</span><span>{fmtMoney(total)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, padding:'8px 11px', background:isAdv?'#eff6ff':'#dcfce7', borderRadius:8, marginTop:8, color:isAdv?'#1d4ed8':'#166534' }}>
              <span>{isAdv ? '✅ Advance Paid' : '✅ Balance Paid'}</span>
              <span>{fmtMoney(amtPaid)}</span>
            </div>
            {remaining > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, color:'#b91c1c', marginTop:6 }}>
                <span>Balance Due</span><span>{fmtMoney(remaining)}</span>
              </div>
            )}
            {!isAdv && remaining <= 0 && (
              <div style={{ textAlign:'center', fontSize:12, fontWeight:700, color:'#166534', marginTop:6 }}>✦ Fully Settled — Balance: Rs. 0.00 ✦</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop:`2px solid ${navy}`, paddingTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:11, color:muted }}>
            <div style={{ fontWeight:600, color:navy, marginBottom:2 }}>Wickramakalutota Opticals</div>
            <div>Tel: 032 222 1211</div>
            <div>Thank you for your trust. 🙏</div>
            {isAdv && <div style={{ fontSize:10, marginTop:3, color:'#b91c1c' }}>Please bring this receipt on collection.</div>}
          </div>
          <div style={{ fontSize:20 }}>👁️</div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(12,28,56,.65)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'24px 16px', fontFamily:"'Outfit','DM Sans',sans-serif" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:620, boxShadow:'0 24px 80px rgba(0,0,0,.35)' }}>

        {/* Tab bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:`1px solid ${border}` }}>
          <div style={{ display:'flex', gap:6 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'1.5px solid', fontFamily:'inherit',
                  background: activeTab===t.key ? navy : 'white',
                  color:      activeTab===t.key ? 'white' : muted,
                  borderColor:activeTab===t.key ? navy : border }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleDownload}
              style={{ padding:'7px 18px', background:'#2563eb', color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              ⬇️ PDF
            </button>
            <button onClick={handlePrint}
              style={{ padding:'7px 18px', background:gold, color:navy, border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              🖨️ Print
            </button>
            <button onClick={onClose}
              style={{ padding:'7px 14px', background:cream, color:muted, border:`1.5px solid ${border}`, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              ✕
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div style={{ padding:'22px 26px', background:'white' }}>
          {activeTab==='advance' && <PreviewBill billType="advance"/>}
          {activeTab==='balance' && <PreviewBill billType="balance"/>}
          {activeTab==='lab' && (
            <div style={{ textAlign:'center', padding:'30px 0', color:muted, fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🔬</div>
              <div style={{ fontWeight:600, color:navy, marginBottom:6 }}>Lab Job Card ready</div>
              <div>Click Print to open and print the lab job card</div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div style={{ padding:'10px 20px', borderTop:`1px solid ${border}`, fontSize:12, color:muted, textAlign:'center' }}>
          {activeTab==='lab'
            ? '🖨️ Print and send with frame to lab  ·  ⬇️ PDF to save'
            : '🖨️ Print to paper  ·  ⬇️ PDF to download and share'}
        </div>
      </div>
    </div>
  );
}