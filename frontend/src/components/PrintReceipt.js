/* eslint-disable */
// ============================================================
//  PrintReceipt.js — All Bills — Professional Navy + Gold
//  All bills: A5 portrait (148mm × 210mm) = 1/2 of A4
// ============================================================
import React, { useState } from 'react';

const LOGO = `data:image/jpeg;base64,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`;

const fmt = n => 'Rs. ' + parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const printCoating = c => ({ 'Blue Cut':'Blue Filter', 'Photo Gray':'Photochromic', 'Blue Cut + Photo Gray':'Blue Filter + Photochromic', 'Blue Cut + HMC':'Blue Filter + HMC', 'Photo Gray + HMC':'Photochromic + HMC', 'Blue Cut + Photo Gray + HMC':'Blue Filter + Photochromic + HMC' }[c] || c);
const fmtD = d => { if (!d) return '—'; const s = String(d).slice(0, 10); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const [y, m, dy] = s.split('-'); return new Date(+y, +m - 1, +dy).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }); } const dt = new Date(d); return isNaN(dt) ? '—' : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }); };
const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

// ── Discount helper — always calculate from subtotal - total ──
// sub = frame + lens prices; total = what customer actually pays
// discount = sub - total (real discount given)
const calcDiscount = (sub, total, discAmt, discPct) => {
  if (sub > 0 && total > 0 && sub > total) return sub - total;   // auto-calculated
  if (discAmt > 0) return discAmt;                                // fallback to stored
  if (discPct > 0) return Math.round((sub || total) * discPct / 100);
  return 0;
};

// ── Shared CSS ────────────────────────────────────────────────
const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700&display=swap');
  @page { size: 148mm 210mm portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', Arial, sans-serif; background: white; color: #1a1a2e; width: 148mm; height: 210mm; overflow: hidden; position: relative; }
  .page { width: 148mm; height: 210mm; position: relative; display: flex; flex-direction: column; }
  .page-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
  .content-inner { flex: 1; overflow: hidden; }
  .hdr { background: #0f1f3d; padding: 5mm 6mm 4mm; color: white; }
  .hdr-inner { display: flex; justify-content: space-between; align-items: flex-start; }
  .shop-name { font-family:'Playfair Display',serif; font-size: 14pt; font-weight: 900; color: white; line-height: 1.1; letter-spacing:-0.3px; }
  .shop-tagline { font-size: 6pt; color: #c9a84c; letter-spacing: 2px; text-transform: uppercase; margin-top: 1px; font-weight:600; }
  .shop-addr { font-size: 8.5pt; color: white; margin-top: 4px; line-height: 1.6; font-weight:600; letter-spacing:0.2px; }
  .bill-badge { background: #c9a84c; color: #0f1f3d; font-size: 6.5pt; font-weight: 700; padding: 2px 8px; border-radius: 20px; letter-spacing: 1px; text-transform: uppercase; display: inline-block; margin-bottom: 3px; }
  .bill-no { font-family:'Playfair Display',serif; font-size: 15pt; font-weight: 900; color: white; line-height: 1; letter-spacing:-0.5px; }
  .bill-date { font-size: 7pt; color: rgba(237,233,224,.7); margin-top: 2px; }
  .gold-bar { height: 3px; background: linear-gradient(90deg, #c9a84c 0%, #e8d48e 50%, transparent 100%); }
  .body { padding: 3.5mm 6mm 3mm; flex: 1; display:flex; flex-direction:column; }
  .cust-block { background:#f8f7f4; border-radius:6px; padding:4px 9px; margin-bottom:2.5mm; display:flex; justify-content:space-between; align-items:center; gap:4mm; }
  .sec-title { font-size: 6pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #9ca3af; margin-bottom: 3px; }
  .kv { margin-bottom: 2px; }
  .kv .k { font-size: 6.5pt; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; font-weight:600; }
  .kv .v { font-size: 9pt; font-weight: 700; color: #0f1f3d; line-height:1.3; }
  .kv .v-lg { font-size: 10pt; font-weight: 800; color: #0f1f3d; line-height:1.2; }
  .pill-bar { border-radius:6px; padding:3px 8px; margin-bottom:2mm; display:flex; justify-content:space-between; align-items:center; }
  .pill-bar-frame { background:#0f1f3d; }
  .pill-bar-lens  { background:#1e3a5f; }
  .pill-label { font-size:6pt; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:1px; color:#c9a84c; }
  .pill-value { font-size:9pt; font-weight:700; color:white; }
  .pill-sub   { font-size:7.5pt; color:rgba(237,233,224,.7); text-align:right; }
  .divider-dashed { border:none; border-top: 1px dashed #d1cdc4; margin: 2.5mm 0; }
  .price-table { width:100%; border-collapse:collapse; margin-bottom:3mm; }
  .price-table td { padding: 1.5px 0; font-size:8pt; vertical-align:middle; }
  .price-table td:last-child { text-align:right; font-weight:700; }
  .price-table .row-sub td { color:#0f1f3d; font-size:8.5pt; font-weight:700; background:#f0f4ff; padding:2px 6px; }
  .price-table .row-disc td { color:#dc2626; font-weight:700; font-size:9.5pt; }
  .price-table .total-row td { font-size:11pt; font-weight:900; color:white; background:#0f1f3d; border-top:2px solid #0f1f3d; padding:4px 6px; }
  .price-table .total-row { border-radius:5px; overflow:hidden; }
  .amt-box { background:#0f1f3d; border-radius:7px; padding:5px 10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:2.5mm; }
  .amt-box .lbl { font-size:7pt; color:#c9a84c; font-weight:700; text-transform:uppercase; letter-spacing:1px; display:none; }
  .amt-box .val { font-family:'Playfair Display',serif; font-size:13pt; font-weight:900; color:white; }
  .bal-box { border:2px solid #dc2626; border-radius:7px; padding:4px 10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:2.5mm; }
  .bal-box .lbl { font-size:7pt; color:#dc2626; font-weight:700; text-transform:uppercase; letter-spacing:1px; display:none; }
  .bal-box .val { font-family:'Playfair Display',serif; font-size:11pt; font-weight:900; color:#dc2626; }
  .badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:7.5pt; font-weight:700; letter-spacing:0.3px; }
  .badge-advance { background:#fffbeb; color:#92400e; border:1.5px solid #f59e0b; }
  .badge-paid    { background:#f0fdf4; color:#15803d; border:1.5px solid #86efac; }
  .note-box { background:#fffbeb; border-left:3px solid #c9a84c; border-radius:0 5px 5px 0; padding:3px 7px; font-size:7pt; color:#92400e; line-height:1.5; margin-bottom:3mm; }
  .stamp-sig { display:flex; gap:4mm; align-items:flex-end; margin-top:2mm; padding-top:2mm; }
  .stamp-box { flex:1; height:18mm; border:1px dashed #d1cdc4; border-radius:7px; display:flex; align-items:center; justify-content:center; }
  .stamp-txt { font-size:6.5pt; color:#c4bfb5; letter-spacing:1.5px; text-transform:uppercase; font-weight:600; }
  .sig-line { flex:1; text-align:center; padding-bottom:2px; }
  .sig-line hr { border:none; border-top:1.5px solid #0f1f3d; margin-bottom:4px; }
  .sig-line span { font-size:7pt; color:#6b7280; font-weight:600; letter-spacing:0.5px; }
  .item-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dotted #e0ddd6; font-size: 9pt; }
  .item-row:last-child { border-bottom: none; }
  .gifts-box { background:#fff9f0; border:1.5px solid #c9a84c; border-radius:5px; padding:4px 8px; margin-bottom:2mm; }
  .gifts-title { font-size:6.5pt; font-weight:800; color:#c9a84c; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px; }
  .gift-row { display:flex; justify-content:space-between; align-items:center; padding:1.5px 0; border-bottom:1px dashed #f0e0c0; font-size:7.5pt; }
  .gift-row:last-child { border-bottom:none; }
  .gift-name { font-weight:600; color:#0f1f3d; }
  .gift-tag { background:#c9a84c; color:white; font-size:6pt; font-weight:800; padding:1px 5px; border-radius:8px; letter-spacing:0.3px; }
  .gift-price { color:#9ca3af; font-size:7pt; text-decoration:line-through; }
  .footer { background: #0f1f3d; padding: 2.5mm 6mm; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
  .footer-slogan { font-size: 7.5pt; font-weight: 700; color: #c9a84c; }
  .footer-sub { font-size: 6.5pt; color: rgba(237,233,224,.6); }
  .total-box { background: #0f1f3d; border-radius: 10px; padding: 12px 16px; text-align: center; margin: 4mm 0; }
  .total-box .lbl { font-size: 8pt; color: #c9a84c; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
  .total-box .amt { font-size: 22pt; font-weight: 900; color: white; }
  .status-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 8.5pt; font-weight: 700; text-transform: uppercase; }
  .status-advance { background: #fef9c3; color: #92400e; border: 1.5px solid #f59e0b; }
  .status-paid { background: #dcfce7; color: #166534; border: 1.5px solid #86efac; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

function hdr(billType, billNo, dateStr) {
  return `
  <div class="hdr" id="header">
    <div class="hdr-inner">
      <div>
        <div class="shop-name">Wickramakalutota Opticals</div>
        <div class="shop-tagline">Your Trusted Eye Care · Chilaw</div>
        <div class="shop-addr">No.57, Kurunegala Road, Chilaw &nbsp;|&nbsp; Tel: 032 222 1211 &nbsp;|&nbsp; 077 194 1211</div>
      </div>
      <div style="text-align:right;padding-top:2px;">
        <div class="bill-badge">${billType}</div>
        <div class="bill-no">${billNo}</div>
        <div class="bill-date">${dateStr}</div>
      </div>
    </div>
  </div>
  <div class="gold-bar"></div>`;
}

function ftr() {
  return `
  <div class="footer" id="footer">
    <div class="footer-slogan">Thank you for choosing Wickramakalutota Opticals!</div>
    <div class="footer-sub">Printed: ${today()}</div>
  </div>`;
}

function wrap(bodyHTML, billType, billNo, dateStr) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${billNo}</title>
<style>${PAGE_CSS}</style>
</head><body>
<div class="page" id="page">
${hdr(billType, billNo, dateStr)}
<div id="content-inner" style="flex:1;overflow:hidden;">
${bodyHTML}
</div>
${ftr()}
</div>
<script>
window.onload = function() {
  var inner = document.getElementById('content-inner');
  var footer = document.getElementById('footer');
  var header = document.getElementById('header');
  if (!inner) { window.print(); return; }
  var mmPx = 96 / 25.4;
  var totalH = 210 * mmPx;
  var hdrH   = header ? header.offsetHeight : 0;
  var ftrH   = footer ? footer.offsetHeight : 0;
  var avail  = totalH - hdrH - ftrH - (4 * mmPx);
  var innerH = inner.scrollHeight;
  if (innerH > avail) {
    var scale = avail / innerH;
    inner.style.zoom = Math.max(0.65, scale);
  }
  setTimeout(function() {
    window.print();
    window.onafterprint = function() { window.close(); };
  }, 400);
};
<\/script>
</body></html>`;
}

// ── Price table builder — shared by all 3 order bills ─────────
// KEY FIX: discount = sub - total (not from discount_amount field)
function buildPriceRows(fSell, lSell, total, discAmt, discPct, showFrame, showLens) {
  const sub  = (fSell > 0 || lSell > 0) ? fSell + lSell : 0;
  const disc = calcDiscount(sub, total, discAmt, discPct);
  const hasDisc = disc > 0;

  let rows = '';
  if (fSell > 0 && showFrame !== false)
    rows += `<tr><td>Frame Price</td><td>${fmt(fSell)}</td></tr>`;
  if (lSell > 0 && showLens !== false)
    rows += `<tr><td>Lens Price</td><td>${fmt(lSell)}</td></tr>`;
  if (hasDisc && sub > 0)
    rows += `<tr class="row-sub"><td>Sub Total</td><td>${fmt(sub)}</td></tr>`;
  if (hasDisc)
    rows += `<tr class="row-disc"><td style="font-weight:700;">Discount</td><td style="font-size:10pt;font-weight:800;color:#dc2626;">- ${fmt(disc)}</td></tr>`;

  rows += `<tr class="total-row"><td>${hasDisc ? 'Net Payable' : (sub > 0 ? 'Total' : 'Total Spectacle Price')}</td><td>${fmt(total)}</td></tr>`;
  return rows;
}

// ── SINGLE BILL ───────────────────────────────────────────────
function buildSingleBill(order) {
  const total   = parseFloat(order.total_amount   || 0);
  const advance = parseFloat(order.advance_amount || 0);
  const balance = parseFloat(order.balance_amount || 0);
  const fSell   = parseFloat(order.frame_sell_price || 0);
  const lSell   = parseFloat(order.lens_sell_price  || 0);
  const discAmt = parseFloat(order.discount_amount  || 0);
  const discPct = parseFloat(order.discount_percent || 0);
  const gifts      = order.bill_gifts || [];
  const orderDate  = order.created_at ? fmtD(order.created_at) : today();
  const frameColor  = order.frame_color  || '';
  const lensCoating = order.lens_coating || '';

  const body = `
  <div class="body">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3.5mm;">
      <span style="font-size:7.5pt;font-weight:700;color:#0f1f3d;">Order Date: ${orderDate}</span>
      <span style="font-size:7.5pt;font-weight:700;color:#c9a84c;">Ready By: ${fmtD(order.deliver_date)}</span>
    </div>
    <div class="cust-block">
      <div style="flex:1;">
        <div class="kv" style="margin-bottom:3px;"><div class="k">Customer Name</div><div class="v-lg">${order.customer_name || '—'}</div></div>
        <div style="display:flex;gap:8mm;margin-top:3px;">
          <div class="kv"><div class="k">Phone</div><div class="v">${order.phone || '—'}</div></div>
          <div class="kv"><div class="k">Age</div><div class="v">${order.age ? order.age + ' yrs' : '—'}</div></div>
        </div>
      </div>
      ${order.warranty_frame || order.warranty_lens ? `
      <div style="text-align:right;">
        ${order.warranty_frame ? `<div class="kv" style="text-align:right;"><div class="k" style="text-align:right;">Shield Frame</div><div class="v" style="color:#15803d;">${order.warranty_frame}</div></div>` : ''}
        ${order.warranty_lens  ? `<div class="kv" style="text-align:right;"><div class="k" style="text-align:right;">Shield Lens</div><div class="v" style="color:#15803d;">${order.warranty_lens}</div></div>` : ''}
      </div>` : ''}
    </div>
    <div class="pill-bar pill-bar-frame">
      <div><div class="pill-label">Frame</div><div class="pill-value">${order.frame || '—'}</div></div>
      ${frameColor ? `<div class="pill-sub">${frameColor}</div>` : ''}
    </div>
    <div class="pill-bar pill-bar-lens" style="flex-direction:column;align-items:flex-start;gap:2px;">
      <div class="pill-label">Lens</div>
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
        <div class="pill-value">${order.lens_type || '—'}</div>
        ${lensCoating ? `<div style="background:#c9a84c;color:#0f1f3d;font-size:7.5pt;font-weight:800;padding:2px 8px;border-radius:10px;">${printCoating(lensCoating)}</div>` : ''}
      </div>
    </div>
    <hr class="divider-dashed"/>
    <table class="price-table">
      ${buildPriceRows(fSell, lSell, total, discAmt, discPct, order.show_frame_price, order.show_lens_price)}
    </table>
    ${gifts.filter(g=>g.name).length > 0 ? `
    <div class="gifts-box">
      <div class="gifts-title">Complimentary Gifts</div>
      ${gifts.filter(g=>g.name).map(g=>`
        <div class="gift-row">
          <span class="gift-name">${g.name}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            ${g.price ? `<span class="gift-price">${fmt(g.price)}</span>` : ''}
            <span class="gift-tag">FREE</span>
          </div>
        </div>`).join('')}
    </div>` : ''}
    <div class="note-box">Please bring this bill when collecting your spectacles.</div>
    <div style="border:1.5px solid #0f1f3d;border-radius:8px;overflow:hidden;margin-top:2mm;">
      <div style="display:flex;align-items:stretch;border-bottom:1.5px solid #0f1f3d;">
        <div style="background:#0f1f3d;padding:5px 10px;display:flex;align-items:center;flex-shrink:0;min-width:28mm;">
          <span style="font-size:7.5pt;font-weight:800;color:#c9a84c;text-transform:uppercase;letter-spacing:.5px;">Advance<br>Paid</span>
        </div>
        <div style="flex:1;padding:5px 10px;display:flex;align-items:center;justify-content:space-between;">
          <span style="font-family:'Playfair Display',serif;font-size:13pt;font-weight:900;color:#0f1f3d;">${fmt(advance)}</span>
          <span style="font-size:8pt;color:#9ca3af;">${orderDate}</span>
        </div>
      </div>
      <div style="display:flex;align-items:stretch;">
        <div style="background:#dc2626;padding:5px 10px;display:flex;align-items:center;flex-shrink:0;min-width:28mm;">
          <span style="font-size:7.5pt;font-weight:800;color:white;text-transform:uppercase;letter-spacing:.5px;">Balance<br>Due</span>
        </div>
        <div style="flex:1;padding:5px 10px;display:flex;align-items:center;justify-content:space-between;gap:4mm;">
          <span style="font-family:'Playfair Display',serif;font-size:13pt;font-weight:900;color:#dc2626;">${fmt(balance)}</span>
          <div style="display:flex;align-items:center;gap:3mm;flex-shrink:0;">
            <div style="width:14px;height:14px;border:2px solid #374151;border-radius:3px;flex-shrink:0;"></div>
            <div style="border-bottom:1px solid #9ca3af;min-width:22mm;height:16px;"></div>
          </div>
        </div>
      </div>
      <div style="background:#f8f5ef;padding:4px 10px;display:flex;align-items:center;gap:4mm;border-top:1px solid #e0ddd6;">
        <span style="font-size:7pt;color:#9ca3af;flex-shrink:0;">Received by:</span>
        <div style="border-bottom:1px solid #d1d5db;flex:1;height:12px;"></div>
        <span style="font-size:7pt;color:#9ca3af;flex-shrink:0;">Date:</span>
        <div style="border-bottom:1px solid #d1d5db;width:18mm;height:12px;"></div>
      </div>
    </div>
  </div>
  `;
  return wrap(body, 'Order Receipt', order.order_number, `Date: ${orderDate}`);
}

// ── ADVANCE BILL ──────────────────────────────────────────────
function buildAdvanceBill(order) {
  const total   = parseFloat(order.total_amount   || 0);
  const advance = parseFloat(order.advance_amount || 0);
  const balance = parseFloat(order.balance_amount || 0);
  const fSell   = parseFloat(order.frame_sell_price || 0);
  const lSell   = parseFloat(order.lens_sell_price  || 0);
  const discAmt = parseFloat(order.discount_amount  || 0);
  const discPct = parseFloat(order.discount_percent || 0);
  const gifts      = order.bill_gifts || [];
  const orderDate  = order.created_at ? fmtD(order.created_at) : today();
  const frameColor  = order.frame_color  || '';
  const lensCoating = order.lens_coating || '';

  const body = `
  <div class="body">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3.5mm;">
      <span class="badge badge-advance">ADVANCE RECEIPT</span>
      <span style="font-size:7.5pt;font-weight:700;color:#0f1f3d;">Order Date: ${orderDate}</span>
    </div>
    <div class="cust-block">
      <div style="flex:1;">
        <div class="kv" style="margin-bottom:4px;"><div class="k">Customer Name</div><div class="v-lg">${order.customer_name || '—'}</div></div>
        <div style="display:flex;gap:8mm;margin-top:4px;">
          <div class="kv"><div class="k">Phone</div><div class="v">${order.phone || '—'}</div></div>
          <div class="kv"><div class="k">Age</div><div class="v">${order.age ? order.age + ' yrs' : '—'}</div></div>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div class="kv" style="text-align:right;"><div class="k" style="text-align:right;">Ready By</div><div class="v" style="color:#c9a84c;font-size:11pt;">${fmtD(order.deliver_date)}</div></div>
        ${order.warranty_frame ? `<div class="kv" style="text-align:right;"><div class="k" style="text-align:right;">🛡️ Frame Warranty</div><div class="v" style="color:#15803d;font-weight:700;">${order.warranty_frame}</div></div>` : ''}
        ${order.warranty_lens  ? `<div class="kv" style="text-align:right;"><div class="k" style="text-align:right;">🛡️ Lens Warranty</div><div class="v" style="color:#15803d;font-weight:700;">${order.warranty_lens}</div></div>` : ''}
      </div>
    </div>
    <div class="pill-bar pill-bar-frame">
      <div><div class="pill-label">Frame</div><div class="pill-value">${order.frame || '—'}</div></div>
      ${frameColor ? `<div class="pill-sub">${frameColor}</div>` : ''}
    </div>
    <div class="pill-bar pill-bar-lens" style="flex-direction:column;align-items:flex-start;gap:3px;">
      <div class="pill-label">Lens</div>
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
        <div class="pill-value">${order.lens_type || '—'}</div>
        ${lensCoating ? `<div style="background:#c9a84c;color:#0f1f3d;font-size:7.5pt;font-weight:800;padding:2px 8px;border-radius:10px;letter-spacing:0.3px;">${printCoating(lensCoating)}</div>` : ''}
      </div>
    </div>
    <hr class="divider-dashed"/>
    <table class="price-table">
      ${buildPriceRows(fSell, lSell, total, discAmt, discPct, order.show_frame_price, order.show_lens_price)}
      <tr class="row-sub"><td>Advance Paid Now</td><td style="color:#15803d;font-weight:700;">- ${fmt(advance)}</td></tr>
    </table>
    ${gifts.filter(g=>g.name).length > 0 ? `
    <div class="gifts-box">
      <div class="gifts-title">🎁 Complimentary Gifts Included</div>
      ${gifts.filter(g=>g.name).map(g=>`
        <div class="gift-row">
          <span class="gift-name">${g.name}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            ${g.price ? `<span class="gift-price">${fmt(g.price)}</span>` : ''}
            <span class="gift-tag">FREE GIFT</span>
          </div>
        </div>`).join('')}
      <div style="font-size:7pt;color:#9ca3af;margin-top:3px;">Above items are complimentary gifts — no charge applied</div>
    </div>` : ''}
    <div class="amt-box">
      <span class="lbl">Advance Paid</span>
      <span class="val">${fmt(advance)}</span>
    </div>
    ${balance > 0 ? `
    <div class="bal-box">
      <span class="lbl">Balance Due on Collection</span>
      <span class="val">${fmt(balance)}</span>
    </div>` : `
    <div style="text-align:center;margin-bottom:2.5mm;">
      <span class="badge badge-paid">Account Settled</span>
    </div>`}
    <div class="note-box">Please bring this receipt when collecting your spectacles.</div>
  </div>
  `;
  return wrap(body, 'Order Receipt', order.order_number, `Date: ${orderDate}`);
}

// ── BALANCE BILL ──────────────────────────────────────────────
function buildBalanceBill(order) {
  const total   = parseFloat(order.total_amount   || 0);
  const advance = parseFloat(order.advance_amount || 0);
  const balance = parseFloat(order.balance_amount || 0);
  const fSell   = parseFloat(order.frame_sell_price || 0);
  const lSell   = parseFloat(order.lens_sell_price  || 0);
  const discAmt = parseFloat(order.discount_amount  || 0);
  const discPct = parseFloat(order.discount_percent || 0);
  const gifts      = order.bill_gifts || [];
  const orderDate  = order.created_at ? fmtD(order.created_at) : today();
  const frameColor  = order.frame_color  || '';
  const lensCoating = order.lens_coating || '';

  const body = `
  <div class="body">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3.5mm;">
      <span class="badge badge-paid">FINAL RECEIPT</span>
      <span style="font-size:7.5pt;font-weight:700;color:#0f1f3d;">Collected: ${today()}</span>
    </div>
    <div class="cust-block">
      <div style="flex:1;">
        <div class="kv" style="margin-bottom:4px;"><div class="k">Customer Name</div><div class="v-lg">${order.customer_name || '—'}</div></div>
        <div style="display:flex;gap:8mm;margin-top:4px;">
          <div class="kv"><div class="k">Phone</div><div class="v">${order.phone || '—'}</div></div>
          <div class="kv"><div class="k">Age</div><div class="v">${order.age ? order.age + ' yrs' : '—'}</div></div>
        </div>
      </div>
      <div>
        <div class="kv"><div class="k">Order Date</div><div class="v">${orderDate}</div></div>
      </div>
    </div>
    <div class="pill-bar pill-bar-frame">
      <div><div class="pill-label">Frame</div><div class="pill-value">${order.frame || '—'}</div></div>
      ${frameColor ? `<div class="pill-sub">${frameColor}</div>` : ''}
    </div>
    <div class="pill-bar pill-bar-lens" style="flex-direction:column;align-items:flex-start;gap:3px;">
      <div class="pill-label">Lens</div>
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
        <div class="pill-value">${order.lens_type || '—'}</div>
        ${lensCoating ? `<div style="background:#c9a84c;color:#0f1f3d;font-size:7.5pt;font-weight:800;padding:2px 8px;border-radius:10px;letter-spacing:0.3px;">${printCoating(lensCoating)}</div>` : ''}
      </div>
    </div>
    <hr class="divider-dashed"/>
    <table class="price-table">
      ${buildPriceRows(fSell, lSell, total, discAmt, discPct, order.show_frame_price, order.show_lens_price)}
      ${advance > 0 ? `<tr class="row-sub"><td>Advance Already Paid</td><td style="color:#15803d;font-weight:700;">- ${fmt(advance)}</td></tr>` : ''}
    </table>
    ${gifts.filter(g=>g.name).length > 0 ? `
    <div class="gifts-box">
      <div class="gifts-title">🎁 Complimentary Gifts Included</div>
      ${gifts.filter(g=>g.name).map(g=>`
        <div class="gift-row">
          <span class="gift-name">${g.name}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            ${g.price ? `<span class="gift-price">${fmt(g.price)}</span>` : ''}
            <span class="gift-tag">FREE GIFT</span>
          </div>
        </div>`).join('')}
      <div style="font-size:7pt;color:#9ca3af;margin-top:3px;">Above items are complimentary gifts — no charge applied</div>
    </div>` : ''}
    <div class="amt-box">
      <span class="lbl">Balance Paid Today</span>
      <span class="val">${fmt(balance)}</span>
    </div>
    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:7px;padding:5px 10px;text-align:center;margin-bottom:3mm;">
      <span style="font-size:8pt;color:#15803d;font-weight:700;">Account Settled — Total Paid: ${fmt(total)}</span>
    </div>
    <div class="note-box">Thank you! Please keep this receipt as proof of payment.</div>
  </div>
  `;
  return wrap(body, 'Order Receipt', order.order_number, `Collected: ${today()}`);
}

// ── QUICK SALE BILL ───────────────────────────────────────────
function buildQuickSaleBill(sale, items) {
  const subtotal = parseFloat(sale.subtotal || 0);
  const discount = parseFloat(sale.discount || 0);
  const total    = parseFloat(sale.total    || 0);
  const paid     = parseFloat(sale.amount_paid  || 0);
  const change   = parseFloat(sale.change_given || 0);
  const saleDate = sale.created_at ? fmtD(sale.created_at) : today();
  const payMethod = (sale.payment_method || 'cash').toLowerCase();
  const payLabel  = payMethod === 'bank' || payMethod === 'transfer' ? 'Bank Transfer' : 'Cash';

  const itemRows = (items || []).map(item => {
    const unitPrice = parseFloat(item.price || item.unit_price || 0);
    const qty       = parseInt(item.qty) || 1;
    const itemDisc  = parseFloat(item.item_discount) || 0;
    const gross     = unitPrice * qty;
    const lineTotal = gross - itemDisc;
    return `
      <tr>
        <td style="padding:4px 0 2px;">
          <div style="font-size:9.5pt;font-weight:700;color:#0f1f3d;">${item.name}</div>
          <div style="font-size:7.5pt;color:#9ca3af;">Rs. ${unitPrice.toLocaleString()} × ${qty}</div>
        </td>
        <td style="text-align:right;vertical-align:top;padding:4px 0 2px;">
          ${itemDisc > 0
            ? `<div style="font-size:8pt;color:#9ca3af;text-decoration:line-through;">${fmt(gross)}</div>
               <div style="font-size:9.5pt;font-weight:700;color:#0f1f3d;">${fmt(lineTotal)}</div>
               <div style="font-size:7.5pt;color:#dc2626;font-weight:600;">- ${fmt(itemDisc)} disc</div>`
            : `<div style="font-size:9.5pt;font-weight:700;color:#0f1f3d;">${fmt(lineTotal)}</div>`}
        </td>
      </tr>
      <tr><td colspan="2" style="padding:0;"><hr style="border:none;border-top:1px dashed #d1cdc4;margin:1px 0;"/></td></tr>`;
  }).join('');

  const body = `
  <div class="body">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3.5mm;">
      <span class="badge badge-paid">SALES RECEIPT</span>
      <span style="font-size:7.5pt;font-weight:700;color:#0f1f3d;">Date: ${saleDate}</span>
    </div>
    ${sale.customer_name || sale.customer_phone ? `
    <div class="cust-block" style="margin-bottom:3.5mm;">
      <div style="flex:1;">
        <div class="kv"><div class="k">Customer Name</div><div class="v-lg">${sale.customer_name || '—'}</div></div>
      </div>
      <div><div class="kv"><div class="k">Phone</div><div class="v">${sale.customer_phone || '—'}</div></div></div>
      <div><div class="kv"><div class="k">Payment</div><div class="v">${payLabel}</div></div></div>
    </div>` : `
    <div style="background:#f8f7f4;border-radius:7px;padding:5px 9px;margin-bottom:3.5mm;">
      <div class="kv"><div class="k">Payment Method</div><div class="v">${payLabel}</div></div>
    </div>`}
    <div style="background:#0f1f3d;border-radius:7px;padding:5px 9px;margin-bottom:0;">
      <div class="pill-label">Items Sold</div>
    </div>
    <table class="price-table" style="margin-bottom:2mm;">${itemRows}</table>
    <hr class="divider-dashed"/>
    <table class="price-table">
      ${discount > 0 ? `
        <tr class="row-sub"><td>Sub Total</td><td>${fmt(subtotal || total + discount)}</td></tr>
        <tr class="row-disc"><td>Discount</td><td>- ${fmt(discount)}</td></tr>
        <tr class="total-row"><td>Net Payable</td><td>${fmt(total)}</td></tr>` :
        `<tr class="total-row"><td>Total Amount</td><td>${fmt(total)}</td></tr>`}
    </table>
    <div class="amt-box">
      <span class="lbl">Amount Paid</span>
      <span class="val">${fmt(paid)}</span>
    </div>
    ${change > 0 ? `
    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:7px;padding:5px 10px;text-align:center;margin-bottom:3mm;">
      <span style="font-size:8pt;color:#15803d;font-weight:700;">Change Returned: ${fmt(change)}</span>
    </div>` : ''}
    ${(sale.bill_gifts||[]).filter(g=>g.name).length > 0 ? `
    <div class="gifts-box">
      <div class="gifts-title">🎁 Complimentary Gifts Included</div>
      ${(sale.bill_gifts||[]).filter(g=>g.name).map(g=>`
        <div class="gift-row">
          <span class="gift-name">${g.name}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            ${g.price ? `<span class="gift-price">${fmt(g.price)}</span>` : ''}
            <span class="gift-tag">FREE GIFT</span>
          </div>
        </div>`).join('')}
      <div style="font-size:7pt;color:#9ca3af;margin-top:3px;">Above items are complimentary gifts — no charge applied</div>
    </div>` : ''}
    <div class="note-box">Thank you for your purchase! Please keep this receipt.</div>
  </div>
  `;
  return wrap(body, 'Sales Receipt', sale.sale_number || 'QS', `Date: ${saleDate}`);
}

// ── REPAIR BILL ───────────────────────────────────────────────
function buildRepairBill(repair) {
  const charge  = parseFloat(repair.charge  || 0);
  const advance = parseFloat(repair.advance || 0);
  const balance = Math.max(0, charge - advance);
  const repairDate  = repair.created_at ? fmtD(repair.created_at) : today();
  const isFullyPaid = balance === 0 || repair.status === 'collected';
  const statusLabel = isFullyPaid ? 'COLLECTED' : repair.status === 'done' ? 'READY FOR COLLECTION' : 'IN PROGRESS';
  const description = repair.frame_description || repair.description || '';

  const body = `
  <div class="body">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3.5mm;">
      <span class="badge ${isFullyPaid ? 'badge-paid' : 'badge-advance'}">${statusLabel}</span>
      <span style="font-size:7.5pt;font-weight:700;color:#0f1f3d;">Date: ${repairDate}</span>
    </div>
    <div class="cust-block">
      <div style="flex:1;">
        <div class="kv"><div class="k">Customer Name</div><div class="v-lg">${repair.customer_name || '—'}</div></div>
      </div>
      <div><div class="kv"><div class="k">Phone</div><div class="v">${repair.phone || '—'}</div></div></div>
      <div><div class="kv"><div class="k">Ref No.</div><div class="v">${repair.repair_number || '—'}</div></div></div>
      <div>${repair.due_date ? `<div class="kv"><div class="k">Due Date</div><div class="v" style="color:#c9a84c;">${fmtD(repair.due_date)}</div></div>` : ''}</div>
    </div>
    <div class="pill-bar pill-bar-frame">
      <div><div class="pill-label">Repair Type</div><div class="pill-value">${repair.repair_type || 'General Repair'}</div></div>
    </div>
    ${description ? `
    <div class="pill-bar pill-bar-lens" style="margin-bottom:3mm;">
      <div><div class="pill-label">Description</div><div class="pill-value" style="font-size:9pt;">${description}</div></div>
    </div>` : ''}
    <hr class="divider-dashed"/>
    <table class="price-table">
      <tr><td>Repair Charge</td><td style="font-size:10pt;font-weight:800;">${charge > 0 ? fmt(charge) : 'Free'}</td></tr>
      ${advance > 0 ? `<tr class="row-sub"><td>Advance Paid</td><td style="color:#15803d;font-weight:700;">- ${fmt(advance)}</td></tr>` : ''}
      ${balance > 0
        ? `<tr class="total-row"><td>Balance Due</td><td style="color:#dc2626;">${fmt(balance)}</td></tr>`
        : `<tr class="total-row"><td>Total Paid</td><td style="color:#15803d;">${fmt(charge)}</td></tr>`}
    </table>
    ${balance > 0 ? `
    <div class="bal-box">
      <span class="lbl">Balance Due on Collection</span>
      <span class="val">${fmt(balance)}</span>
    </div>` : `
    <div class="amt-box">
      <span class="lbl">Total Paid</span>
      <span class="val">${fmt(charge)}</span>
    </div>`}
    ${isFullyPaid ? `
    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:7px;padding:5px 10px;text-align:center;margin-bottom:3mm;">
      <span style="font-size:8pt;color:#15803d;font-weight:700;">Account Settled</span>
    </div>` : ''}
    <div class="note-box">Please bring this receipt when collecting your item.</div>
  </div>
  `;
  return wrap(body, 'Repair Receipt', repair.repair_number || 'REP', `Date: ${repairDate}`);
}

// ── LAB JOB CARD ──────────────────────────────────────────────
function buildLabCardHTML(order) {
  const ref = order.refraction || order;
  const orderDate = order.created_at ? fmtD(order.created_at) : today();
  const rawNotes = order.notes || '';
  const cleanNotes = rawNotes.replace(/imported from past records/gi,'').replace(/Gifts given:[^\n]*/gi,'').replace(/^[,;\s]+|[,;\s]+$/g,'').trim();
  const val = v => (v && v !== '—' && v !== '0' && v !== '0.00' && v !== 'Plano') ? v : (v==='Plano'?'Plano':'—');
  const cell = (v,fs='11px') => `<td style="padding:4px 3px;text-align:center;border:1.5px solid #b0bccf;font-size:${fs};font-weight:700;color:#0f1f3d;min-width:14mm;">${val(v)}</td>`;
  const eyeRow = (eye,sph,cyl,axis,add) => `<tr>
    <td style="padding:4px 5px;font-weight:800;font-size:9px;border:1.5px solid #b0bccf;background:#eef1f6;text-align:center;">${eye}</td>
    ${cell(sph)}${cell(cyl)}${cell(axis)}${cell(add)}
  </tr>`;
  const pd_r = ref.r_pd || ''; const pd_l = ref.l_pd || '';
  const pdVal = pd_r && pd_l ? `R: ${pd_r}  L: ${pd_l}` : (pd_r || pd_l || '—');
  const seg = [order.seg_height_r, order.seg_height_l].filter(Boolean).join(' / ') || '—';
  const lensCoatPrint = printCoating(order.lens_coating || '—');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${order.order_number} Lab Card</title>
<style>
  @page { size: 148mm 105mm landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #0f1f3d; width: 148mm; height: 105mm; }
  .card { width: 148mm; height: 105mm; display: flex; flex-direction: column; }
  .top { height: 28mm; display: flex; flex-direction: column; padding: 3mm 5mm 2mm; background: #0f1f3d; position: relative; overflow: hidden; }
  .top::after { content:''; position:absolute; bottom:-12mm; right:-8mm; width:35mm; height:35mm; border-radius:50%; background:rgba(201,168,76,.10); }
  .shop-name { font-size: 10px; font-weight: 900; color: white; letter-spacing: -0.2px; line-height: 1.1; }
  .shop-sub  { font-size: 5.5px; color: rgba(201,168,76,.9); letter-spacing: 1.5px; text-transform: uppercase; margin-top: 1px; }
  .shop-addr { font-size: 5.5px; color: rgba(255,255,255,.55); margin-top: 1px; }
  .order-no { font-size: 15px; font-weight: 900; color: #c9a84c; line-height: 1; letter-spacing: -0.5px; }
  .order-lbl { font-size: 5px; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1px; }
  .gold-bar { height: 1.5px; background: linear-gradient(90deg,#c9a84c,transparent); margin: 1.5mm 0 1mm; }
  .patient-name { font-size: 13px; font-weight: 900; color: white; line-height: 1.1; }
  .patient-sub  { font-size: 6px; color: rgba(255,255,255,.6); margin-top: 1px; }
  .send-badge { display: inline-block; background: #c9a84c; color: #0f1f3d; font-size: 5.5px; font-weight: 800; padding: 2px 5px; border-radius: 6px; letter-spacing: 0.3px; text-transform: uppercase; text-align:center; line-height:1.3; }
  .fold { height: 0; border-top: 2px dashed #b0bccf; position: relative; }
  .fold::before { content: 'FOLD'; position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); background: white; padding: 0 4px; font-size: 5.5px; color: #9ca3af; letter-spacing: 1.5px; font-weight: 700; }
  .bot { height: 76mm; padding: 2mm 5mm 2mm; display: flex; flex-direction: column; gap: 2px; }
  .sec-hd { background: #0f1f3d; color: #c9a84c; font-size: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 2px 5px; }
  .sec { border: 1.5px solid #b0bccf; overflow: hidden; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #eef1f6; padding: 2px 3px; font-size: 6.5px; font-weight: 700; text-transform: uppercase; color: #6b7280; border: 1.5px solid #b0bccf; text-align: center; }
  .info-row { display: flex; gap: 2mm; }
  .info-cell { flex: 1; }
  .lbl { font-size: 6px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; margin-bottom: 1px; }
  .val { font-size: 9px; font-weight: 800; color: #0f1f3d; line-height: 1.3; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
<div class="card">
  <div class="top">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div class="shop-name">Wickramakalutota Opticals</div>
        <div class="shop-sub">Your Trusted Eye Care · Chilaw</div>
        <div class="shop-addr">No.57, Kurunegala Road · 032 222 1211</div>
      </div>
      <div style="text-align:right;">
        <div class="order-lbl">Order No.</div>
        <div class="order-no">${order.order_number}</div>
      </div>
    </div>
    <div class="gold-bar"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;flex:1;">
      <div>
        <div style="font-size:6px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.8px;margin-bottom:1px;">Patient</div>
        <div class="patient-name">${order.customer_name || '—'}</div>
        <div class="patient-sub">
          ${order.phone ? order.phone + ' &nbsp;·&nbsp; ' : ''}${orderDate}
          ${order.deliver_date ? ' &nbsp;·&nbsp; Due: ' + fmtD(order.deliver_date) : ''}
        </div>
      </div>
      <span class="send-badge">Send with<br/>frame to lab</span>
    </div>
  </div>
  <div class="fold"></div>
  <div class="bot">
    <div class="info-row" style="margin-bottom:2px;">
      <div class="info-cell sec" style="padding:2px 4px;">
        <div class="sec-hd" style="margin:-2px -4px 2px;">Frame</div>
        <div class="val">${order.frame || '—'}</div>
        <div style="display:flex;gap:4mm;margin-top:1px;">
          <div><div class="lbl">Type</div><div class="val" style="font-size:8px;">${order.frame_type || '—'}</div></div>
          <div><div class="lbl">Color</div><div class="val" style="font-size:8px;">${order.frame_color || '—'}</div></div>
        </div>
      </div>
      <div class="info-cell sec" style="padding:2px 4px;">
        <div class="sec-hd" style="margin:-2px -4px 2px;">Lens</div>
        <div class="val">${order.lens_type || '—'}</div>
        <div style="display:flex;gap:4mm;margin-top:1px;">
          <div><div class="lbl">Coating</div><div class="val" style="font-size:8px;">${lensCoatPrint}</div></div>
          <div><div class="lbl">Index</div><div class="val" style="font-size:8px;">${order.lens_index || 'CR39'}</div></div>
        </div>
      </div>
    </div>
    <div class="sec">
      <div class="sec-hd">Prescription (Rx)</div>
      <table>
        <tr><th style="width:16%;text-align:left;padding:2px 4px;">Eye</th><th>SPH</th><th>CYL</th><th>AXIS</th><th>ADD</th></tr>
        ${eyeRow('R', ref.r_sph, ref.r_cyl, ref.r_axis, ref.r_add)}
        ${eyeRow('L', ref.l_sph, ref.l_cyl, ref.l_axis, ref.l_add)}
      </table>
    </div>
    <div class="sec">
      <div class="sec-hd">Measurements</div>
      <table>
        <tr><th style="width:34%;">PD (mm)</th><th style="width:33%;">Seg Height</th><th style="width:33%;">Lens Size</th></tr>
        <tr>
          <td style="padding:4px;text-align:center;border:1.5px solid #b0bccf;font-size:10px;font-weight:800;">${pdVal}</td>
          <td style="padding:4px;text-align:center;border:1.5px solid #b0bccf;font-size:10px;font-weight:800;">${seg}</td>
          <td style="padding:4px;text-align:center;border:1.5px solid #b0bccf;font-size:10px;font-weight:800;">${order.frame_size || '—'}</td>
        </tr>
      </table>
    </div>
    <div class="sec" style="flex:1;">
      <div class="sec-hd">Special Instructions</div>
      <div style="padding:3px 5px;min-height:14mm;font-size:9px;font-weight:700;line-height:1.5;">${cleanNotes || ''}</div>
    </div>
    <div style="margin-top:auto;padding-top:1mm;border-top:1px solid #e0e4ea;font-size:5.5px;color:#9ca3af;display:flex;justify-content:space-between;">
      <span>Wickramakalutota Opticals</span><span>Printed: ${today()}</span>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};<\/script>
</body></html>`;
}

function openPrint(html) {
  const win = window.open('', '_blank', 'width=700,height=900');
  if (!win) { alert('Please allow popups to print.'); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

const C = { navy: '#0f1f3d', gold: '#c9a84c', cream: '#f8f5ef', border: '#e0ddd6', muted: '#6b7280' };
const fmt2 = n => 'Rs. ' + parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Order PrintReceipt Modal ──────────────────────────────────
export default function PrintReceipt({ order, onClose }) {
  const [tab, setTab] = useState('advance');

  const TABS = [
    { key: 'single',  label: '📋 Single Bill',  desc: 'One bill for both payments — customer signs on balance collection' },
    { key: 'advance', label: '🧾 Advance Bill',  desc: 'A5 portrait · Advance payment receipt' },
    { key: 'balance', label: '✅ Balance Bill',  desc: 'A5 portrait · Final receipt when fully paid' },
    { key: 'lab',     label: '🔬 Lab Job Card',  desc: 'A6 landscape · Send with frame to lab' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,31,61,.65)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      fontFamily: "'DM Sans',sans-serif"
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 460,
        boxShadow: '0 24px 80px rgba(0,0,0,.35)', overflow: 'hidden'
      }}>
        <div style={{ background: C.navy, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>🖨️ Print Bill</div>
            <div style={{ color: C.gold, fontSize: 12, marginTop: 2 }}>{order.order_number} · {order.customer_name}</div>
          </div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '11px 6px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: 'none', border: 'none', fontFamily: 'inherit',
                color: tab === t.key ? C.navy : C.muted,
                borderBottom: `2.5px solid ${tab === t.key ? C.gold : 'transparent'}`,
                marginBottom: -1
              }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ padding: '18px 20px' }}>
          <div style={{ background: C.cream, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: C.muted }}>
            {TABS.find(t => t.key === tab)?.desc}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { l: 'Total', v: fmt2(order.total_amount) },
              { l: 'Advance', v: fmt2(order.advance_amount) },
              { l: 'Balance', v: fmt2(order.balance_amount) },
              { l: 'Delivery', v: fmtD(order.deliver_date) },
              ...(order.warranty_frame ? [{ l: '🛡️ Frame Warranty', v: order.warranty_frame, green: true }] : []),
              ...(order.warranty_lens  ? [{ l: '🛡️ Lens Warranty',  v: order.warranty_lens,  green: true }] : []),
            ].map(r => (
              <div key={r.l} style={{ background: '#f9f9f9', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: C.muted, marginBottom: 2 }}>{r.l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: r.green ? '#15803d' : C.navy }}>{r.v || '—'}</div>
              </div>
            ))}
          </div>
          <button onClick={() => {
            if (tab === 'single')  openPrint(buildSingleBill(order));
            if (tab === 'advance') openPrint(buildAdvanceBill(order));
            if (tab === 'balance') openPrint(buildBalanceBill(order));
            if (tab === 'lab')     openPrint(buildLabCardHTML(order));
          }}
            style={{
              width: '100%', padding: '13px', background: C.navy, color: C.gold, border: 'none',
              borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
            }}>
            🖨️ Print {TABS.find(t => t.key === tab)?.label}
          </button>
        </div>
      </div>
    </div>
  );
}

export { buildQuickSaleBill, buildRepairBill, openPrint };