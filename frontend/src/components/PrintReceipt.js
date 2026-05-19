/* eslint-disable */
// ============================================================
//  PrintReceipt.js — Prints in a new blank window (1 copy always)
//  No CSS tricks — opens a fresh window with only the bill content
// ============================================================
import React, { useState } from 'react';

const fmtMoney = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtDate  = (d) => { if(!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}); };
const todayStr = () => new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});

const navy=  '#0f1f3d', gold='#c9a84c', cream='#f8f5ef', border='#e0ddd6',
      muted= '#6b7280', success='#2d7a4f', danger='#c0392b';

// ── Build the HTML string for customer bill ───────────────────
function buildCustomerBillHTML(order, billType) {
  const total      = parseFloat(order.total_amount   || 0);
  const advance    = parseFloat(order.advance_amount || 0);
  const balance    = parseFloat(order.balance_amount || 0);
  const frameSell  = parseFloat(order.frame_sell_price || 0);
  const lensSell   = parseFloat(order.lens_sell_price  || 0);
  const amountPaid = billType === 'advance' ? advance : balance;
  const remaining  = billType === 'advance' ? balance : 0;
  const isAdvance  = billType === 'advance';
  const fmt   = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fdate = (d) => { if(!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}); };
  const today = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
  const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : today;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${order.order_number} — ${isAdvance?'Advance Receipt':'Final Receipt'}</title>
<style>
  @page { size: A5 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: white; }
  .page { width: 148mm; min-height: 210mm; padding: 0; position: relative; }

  /* Header band */
  .header { background: #0f1f3d; padding: 14mm 12mm 8mm; display: flex; justify-content: space-between; align-items: flex-start; }
  .logo-block { display: flex; align-items: center; gap: 10px; }
  .logo-img { height: 38px; object-fit: contain; }
  .shop-name { color: white; font-size: 15px; font-weight: 700; letter-spacing: 0.3px; }
  .shop-sub { color: #c9a84c; font-size: 9px; margin-top: 2px; }
  .shop-addr { color: rgba(255,255,255,0.65); font-size: 8.5px; margin-top: 3px; line-height: 1.5; }
  .badge-block { text-align: right; }
  .receipt-type { color: #c9a84c; font-size: 8px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 5px; }
  .order-num { color: white; font-size: 17px; font-weight: 700; letter-spacing: 0.5px; }
  .order-date { color: rgba(255,255,255,0.6); font-size: 8.5px; margin-top: 4px; }

  /* Gold accent bar */
  .gold-bar { height: 4px; background: linear-gradient(90deg, #c9a84c, #f0d080, #c9a84c); }

  /* Status pill */
  .status-strip { background: ${isAdvance?'#1e3a5f':'#14532d'}; padding: 7px 12mm; display: flex; align-items: center; gap: 8px; }
  .status-icon { font-size: 14px; }
  .status-text { color: ${isAdvance?'#93c5fd':'#86efac'}; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }

  /* Body */
  .body { padding: 8mm 12mm; }

  /* Two col info */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-bottom: 7mm; }
  .info-box { border: 1.5px solid #e8eaf0; border-radius: 8px; overflow: hidden; }
  .info-box-head { background: #f5f7ff; padding: 5px 10px; font-size: 7.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e8eaf0; }
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 10px; border-bottom: 1px solid #f3f4f6; }
  .info-row:last-child { border-bottom: none; }
  .info-lbl { font-size: 8.5px; color: #9ca3af; }
  .info-val { font-size: 9.5px; font-weight: 700; color: #0f1f3d; text-align: right; max-width: 60%; }
  .info-val.green { color: #166534; }

  /* Payment table */
  .pay-box { border: 1.5px solid #e8eaf0; border-radius: 8px; overflow: hidden; margin-bottom: 6mm; }
  .pay-head { background: #f5f7ff; padding: 5px 10px; font-size: 7.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e8eaf0; }
  .pay-row { display: flex; justify-content: space-between; padding: 5px 10px; border-bottom: 1px solid #f3f4f6; font-size: 9.5px; }
  .pay-row:last-child { border-bottom: none; }
  .pay-row .lbl { color: #6b7280; }
  .pay-row .val { font-weight: 600; color: #0f1f3d; }
  .pay-total { display: flex; justify-content: space-between; padding: 7px 10px; background: #f0f4f8; font-size: 10px; font-weight: 700; border-bottom: 2px solid #0f1f3d; }
  .pay-highlight { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: ${isAdvance?'#dbeafe':'#dcfce7'}; }
  .pay-highlight .hl { font-size: 10px; font-weight: 700; color: ${isAdvance?'#1e40af':'#166534'}; }
  .pay-highlight .hl-amt { font-size: 14px; font-weight: 800; color: ${isAdvance?'#1e40af':'#166534'}; }
  .pay-balance { display: flex; justify-content: space-between; padding: 6px 10px; background: #fef2f2; }
  .pay-balance .bl { font-size: 9.5px; font-weight: 700; color: #c0392b; }
  .pay-balance .bl-amt { font-size: 12px; font-weight: 800; color: #c0392b; }
  .pay-clear { text-align: center; padding: 7px; background: #f0fdf4; font-size: 10px; font-weight: 700; color: #166534; }

  /* Note */
  .note { background: ${isAdvance?'#fefce8':'#f0fdf4'}; border: 1px solid ${isAdvance?'#fde68a':'#bbf7d0'}; border-radius: 7px; padding: 7px 10px; font-size: 8.5px; color: ${isAdvance?'#92400e':'#166534'}; display: flex; align-items: flex-start; gap: 6px; margin-bottom: 6mm; }

  /* Footer */
  .footer { position: absolute; bottom: 0; left: 0; right: 0; border-top: 1px solid #e8eaf0; padding: 5px 12mm; display: flex; justify-content: space-between; align-items: center; background: white; }
  .footer-l { font-size: 7.5px; color: #9ca3af; }
  .footer-r { font-size: 7.5px; color: #9ca3af; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="logo-block">
      <img class="logo-img" src="data:image/jpeg;base64,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" alt="Logo"/>
      <div>
        <div class="shop-name">Wickramakalutota Opticals</div>
        <div class="shop-sub">OPTICAL SPECIALISTS</div>
        <div class="shop-addr">No.57, Kurunegala Road, Chilaw<br>Tel: 032 222 1211</div>
      </div>
    </div>
    <div class="badge-block">
      <div class="receipt-type">${isAdvance ? 'ADVANCE RECEIPT' : 'FINAL RECEIPT'}</div>
      <div class="order-num">${order.order_number}</div>
      <div class="order-date">Date: ${orderDate}</div>
    </div>
  </div>

  <!-- GOLD BAR -->
  <div class="gold-bar"></div>

  <!-- STATUS STRIP -->
  <div class="status-strip">
    <span class="status-icon">${isAdvance ? '' : ''}</span>
    <span class="status-text">${isAdvance ? 'Advance Payment Received' : 'Payment Completed — Thank You!'}</span>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- CUSTOMER + ORDER INFO -->
    <div class="info-grid">
      <div class="info-box">
        <div class="info-box-head">Customer</div>
        <div class="info-row"><span class="info-lbl">Name</span><span class="info-val">${order.customer_name||'—'}</span></div>
        <div class="info-row"><span class="info-lbl">Phone</span><span class="info-val">${order.phone||'—'}</span></div>
        ${order.age ? `<div class="info-row"><span class="info-lbl">Age</span><span class="info-val">${order.age} years</span></div>` : ''}
      </div>
      <div class="info-box">
        <div class="info-box-head">Order Details</div>
        <div class="info-row"><span class="info-lbl">Frame</span><span class="info-val">${order.frame||'—'}</span></div>
        <div class="info-row"><span class="info-lbl">Lens Type</span><span class="info-val">${order.lens_type||'—'}</span></div>
        <div class="info-row"><span class="info-lbl">Coating</span><span class="info-val">${order.lens_coating||'—'}</span></div>
        <div class="info-row"><span class="info-lbl">Delivery</span><span class="info-val green">${fdate(order.deliver_date)}</span></div>
      </div>
    </div>

    <!-- PAYMENT SUMMARY -->
    <div class="pay-box">
      <div class="pay-head">Payment Summary</div>
      ${frameSell > 0 ? `<div class="pay-row"><span class="lbl"> Frame</span><span class="val">${fmt(frameSell)}</span></div>` : ''}
      ${lensSell  > 0 ? `<div class="pay-row"><span class="lbl"> Lens (${order.lens_type||''})</span><span class="val">${fmt(lensSell)}</span></div>` : ''}
      <div class="pay-total"><span>Total Amount</span><span>${fmt(total)}</span></div>
      <div class="pay-highlight">
        <span class="hl">${isAdvance ? ' Advance Paid' : ' Balance Paid'}</span>
        <span class="hl-amt">${fmt(amountPaid)}</span>
      </div>
      ${remaining > 0 ? `<div class="pay-balance"><span class="bl"> Balance Remaining</span><span class="bl-amt">${fmt(remaining)}</span></div>` : ''}
      ${!isAdvance && remaining <= 0 ? `<div class="pay-clear"> Fully Paid — Balance: Rs. 0.00</div>` : ''}
    </div>

    <!-- NOTE -->
    <div class="note">
      ${isAdvance
        ? ' Please bring this receipt when collecting your spectacles. Your balance of <b>' + fmt(remaining) + '</b> is due on collection.'
        : ' Thank you for choosing Wickramakalutota Opticals. We wish you perfect vision!'
      }
    </div>

  </div><!-- /body -->

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-l">Wickramakalutota Opticals · No.57 Kurunegala Road, Chilaw · 032 222 1211</div>
    <div class="footer-r">Printed: ${today}</div>
  </div>

</div><!-- /page -->
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
</body>
</html>`;
}


function buildLabCardHTML(order) {
  const ref   = order.refraction || order;
  const today = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})
    : today;

  // Filter out auto-generated notes — only show real grinding instructions
  const rawNotes = order.notes || '';
  const cleanNotes = rawNotes
    .replace(/imported from past records/gi,'')
    .replace(/^[,;:\s]+|[,;:\s]+$/g,'')
    .trim();

  const val = (v) => v && v !== '—' && v !== '0' && v !== '0.00' ? v : '—';

  const eyeRow = (eye, sph, cyl, axis, add, va) => `
    <tr>
      <td style="background:#f0f4f8;padding:5px 7px;font-weight:700;font-size:10.5px;border:1px solid #ccd3de;color:#0f1f3d;">${eye}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccd3de;font-size:11px;font-weight:700;color:#0f1f3d;">${val(sph)}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccd3de;font-size:11px;font-weight:700;color:#0f1f3d;">${val(cyl)}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccd3de;font-size:11px;font-weight:700;color:#0f1f3d;">${val(axis)}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccd3de;font-size:11px;font-weight:700;color:#0f1f3d;">${val(add)}</td>
      <td style="padding:5px 4px;text-align:center;border:1px solid #ccd3de;font-size:11px;font-weight:700;color:#0f1f3d;">${val(va)}</td>
    </tr>`;

  const logo = `data:image/jpeg;base64,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`;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${order.order_number} — Lab Job Card</title>
<style>
  @page { size: 105mm 148mm; margin: 4mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Arial', sans-serif;
    color: #0f1f3d;
    background: white;
    width: 97mm;
    font-size: 9px;
  }
  table { width: 100%; border-collapse: collapse; }
  .sec {
    border: 1px solid #b0bccf;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 3px;
  }
  .sec-hd {
    background: #0f1f3d;
    color: #c9a84c;
    font-size: 6.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    padding: 2.5px 7px;
  }
  th {
    background: #eef1f5;
    padding: 2.5px 5px;
    font-size: 6.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #6b7280;
    border: 1px solid #ccd3de;
    text-align: center;
  }
  td {
    padding: 4px 5px;
    border: 1px solid #ccd3de;
    font-size: 10px;
    font-weight: 700;
    color: #0f1f3d;
  }
</style>
</head>
<body>

<!-- HEADER -->
<div style="display:flex;justify-content:space-between;align-items:center;
  padding-bottom:4px;margin-bottom:4px;border-bottom:2px solid #0f1f3d;">
  <div style="display:flex;align-items:center;gap:5px;">
    <img src="${logo}" alt="Logo" style="height:28px;object-fit:contain;"/>
    <div>
      <div style="font-size:9.5px;font-weight:700;color:#0f1f3d;line-height:1.3;">Wickramakalutota Opticals</div>
      <div style="font-size:6.5px;color:#6b7280;line-height:1.4;">No.57, Kurunegala Road, Chilaw</div>
      <div style="font-size:6.5px;color:#6b7280;">Tel: 032 222 1211</div>
    </div>
  </div>
  <div style="text-align:right;">
    <div style="background:#0f1f3d;color:#c9a84c;font-weight:700;font-size:12px;
      padding:3px 8px;border-radius:4px;letter-spacing:.5px;margin-bottom:2px;">
      ${order.order_number}
    </div>
    <div style="font-size:7px;color:#6b7280;">${orderDate}</div>
  </div>
</div>

<!-- PATIENT -->
<div style="background:#f0f4f8;border:1px solid #b0bccf;border-radius:4px;
  padding:4px 7px;margin-bottom:3px;display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="font-size:6.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;margin-bottom:1px;">Patient</div>
    <div style="font-size:13px;font-weight:700;color:#0f1f3d;">${order.customer_name||'—'}</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:6px;color:#9ca3af;font-style:italic;border:1px solid #c9a84c;
      color:#92400e;background:#fffbeb;padding:2px 6px;border-radius:10px;font-weight:700;font-size:6.5px;">
      ✦ SEND WITH FRAME TO LAB ✦
    </div>
  </div>
</div>

<!-- FRAME + LENS -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:3px;">
  <div class="sec">
    <div class="sec-hd">Frame</div>
    <table>
      <tr><th style="text-align:left;">Name / Description</th></tr>
      <tr><td style="font-size:10.5px;">${order.frame||'—'}</td></tr>
      <tr>
        <th style="text-align:left;width:50%;">Type</th>
        <th style="text-align:left;">Color</th>
      </tr>
      <tr>
        <td style="font-size:9px;">${order.frame_type||'—'}</td>
        <td style="font-size:9px;">${order.frame_color||'—'}</td>
      </tr>
    </table>
  </div>
  <div class="sec">
    <div class="sec-hd">Lens</div>
    <table>
      <tr><th style="text-align:left;" colspan="2">Type</th></tr>
      <tr><td colspan="2" style="font-size:10px;">${order.lens_type||'—'}</td></tr>
      <tr>
        <th style="text-align:left;">Coating</th>
        <th style="text-align:left;">Index</th>
      </tr>
      <tr>
        <td style="font-size:9px;">${order.lens_coating||'—'}</td>
        <td style="font-size:9px;">${order.lens_index||'—'}</td>
      </tr>
    </table>
  </div>
</div>

<!-- PRESCRIPTION -->
<div class="sec" style="margin-bottom:3px;">
  <div class="sec-hd">Prescription (Rx)</div>
  <table>
    <tr>
      <th style="width:18%;text-align:left;">Eye</th>
      <th>SPH</th><th>CYL</th><th>AXIS</th><th>ADD</th><th>VA</th>
    </tr>
    ${eyeRow('Right (R)', ref.r_sph, ref.r_cyl, ref.r_axis, ref.r_add, ref.r_va)}
    ${eyeRow('Left (L)',  ref.l_sph, ref.l_cyl, ref.l_axis, ref.l_add, ref.l_va)}
  </table>
</div>

<!-- MEASUREMENTS -->
<div class="sec" style="margin-bottom:3px;">
  <div class="sec-hd">Measurements</div>
  <table>
    <tr>
      <th style="width:50%;text-align:center;">PD (mm)</th>
      <th style="text-align:center;">Seg Height (mm)</th>
    </tr>
    <tr>
      <td style="font-size:14px;font-weight:700;text-align:center;height:18px;">
        ${ref.r_pd||ref.l_pd||''}
      </td>
      <td style="font-size:14px;font-weight:700;text-align:center;height:18px;">
        ${order.seg_height_r||''}
      </td>
    </tr>
  </table>
</div>

<!-- SPECIAL INSTRUCTIONS -->
<div class="sec" style="margin-bottom:4px;">
  <div class="sec-hd">Special Instructions / Grinding Notes</div>
  <div style="padding:5px 7px;min-height:24px;font-size:10px;font-weight:700;
    color:#0f1f3d;line-height:1.5;border-bottom:1px dashed #ccd3de;">
    ${cleanNotes || ''}
  </div>
</div>

<!-- FOOTER -->
<div style="border-top:1px solid #d0d7e0;padding-top:2px;
  display:flex;justify-content:space-between;align-items:center;">
  <div style="font-size:6px;color:#9ca3af;">
    Wickramakalutota Opticals · No.57 Kurunegala Road, Chilaw · 032 222 1211
  </div>
  <div style="font-size:6px;color:#9ca3af;">Printed: ${today}</div>
</div>

<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
</body>
</html>`;
}


// ── Open print window ─────────────────────────────────────────

// ── Download as PDF using html2pdf.js ────────────────────────
function downloadPDF(htmlContent, filename) {
  // Use iframe approach — loads full HTML doc so CSS classes work correctly
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:600px;height:900px;border:none;background:white;';
  document.body.appendChild(iframe);

  iframe.onload = function() {
    // Load html2pdf into the main page (not iframe) then capture iframe content
    const doGen = () => {
      const opt = {
        margin:      [8, 8, 8, 8],
        filename:    filename,
        image:       { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false,
                       backgroundColor: '#ffffff',
                       windowWidth: 600, scrollX: 0, scrollY: 0 },
        jsPDF:       { unit: 'mm', format: 'a5', orientation: 'portrait', compress: true },
        pagebreak:   { mode: 'avoid-all' },
      };
      // Capture the iframe body content
      const body = iframe.contentDocument.body;
      window.html2pdf().set(opt).from(body).save()
        .then(() => { document.body.removeChild(iframe); })
        .catch((e) => {
          console.error('PDF error:', e);
          document.body.removeChild(iframe);
          alert('PDF generation failed. Use Print → Save as PDF instead.');
        });
    };

    if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = doGen;
      script.onerror = () => {
        document.body.removeChild(iframe);
        alert('Could not load PDF library. Use Print → Save as PDF instead.');
      };
      document.head.appendChild(script);
    } else {
      doGen();
    }
  };

  // Write full HTML into iframe — CSS classes work because it's a full document
  // Add body padding so content doesn't clip at edges
  const paddedHtml = htmlContent
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace('body {', 'body { padding: 8px !important; ')
    .replace('body{',  'body{ padding: 8px !important; ');

  iframe.contentDocument.open();
  iframe.contentDocument.write(paddedHtml);
  iframe.contentDocument.close();
}


function openPrintWindow(htmlContent) {
  const win = window.open('', '_blank', 'width=700,height=900');
  if (!win) {
    alert('Please allow popups for this site to print bills.');
    return;
  }
  win.document.open();
  win.document.write(htmlContent);
  win.document.close();
}

// ═══════════════════════════════════════════════════════════════
//  MAIN MODAL
// ═══════════════════════════════════════════════════════════════
export default function PrintReceipt({ order, onClose }) {
  const [activeTab, setActiveTab] = useState('advance');

  const navy=  '#0f1f3d', gold='#c9a84c', cream='#f8f5ef',
        border='#e0ddd6', muted='#6b7280';

  const handlePrint = () => {
    if (activeTab === 'advance') openPrintWindow(buildCustomerBillHTML(order, 'advance'));
    if (activeTab === 'balance') openPrintWindow(buildCustomerBillHTML(order, 'balance'));
    if (activeTab === 'lab')     openPrintWindow(buildLabCardHTML(order));
  };


  const handleDownload = () => {
    const fname = (type) => `${order.order_number}-${type}-${new Date().toISOString().slice(0,10)}.pdf`;
    if (activeTab === 'advance') downloadPDF(buildCustomerBillHTML(order, 'advance'), fname('advance-bill'));
    if (activeTab === 'balance') downloadPDF(buildCustomerBillHTML(order, 'balance'), fname('balance-bill'));
    if (activeTab === 'lab')     downloadPDF(buildLabCardHTML(order),                 fname('lab-card'));
  };

  const tabs = [
    {key:'advance', label:'🧾 Advance Bill'},
    {key:'balance', label:'✅ Balance Bill'},
    {key:'lab',     label:'🔬 Lab Job Card'},
  ];

  // ── Preview bill (shown inside modal, not printed) ───────────
  const PreviewBill = ({ billType }) => {
    const total      = parseFloat(order.total_amount   || 0);
    const advance    = parseFloat(order.advance_amount || 0);
    const balance    = parseFloat(order.balance_amount || 0);
    const frameSell  = parseFloat(order.frame_sell_price || 0);
    const lensSell   = parseFloat(order.lens_sell_price  || 0);
    const amountPaid = billType === 'advance' ? advance : balance;
    const remaining  = billType === 'advance' ? balance : 0;
    const billLabel  = billType === 'advance' ? 'Advance Receipt' : 'Final Receipt — Balance Paid';

    return (
      <div style={{ maxWidth:480, margin:'0 auto', fontFamily:"'DM Sans',sans-serif", color:navy }}>
        <div style={{ background:navy, borderRadius:12, padding:'16px 20px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'white', marginBottom:2 }}>👁️ Wickramakalutota Opticals</div>
            <div style={{ fontSize:10, color:gold, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:3 }}>{billLabel}</div>
            <div style={{ fontSize:11, color:'#ede9e0' }}>No.57 Kurunegala Road, Chilaw | 032 222 1211</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ background:gold, color:navy, fontWeight:700, fontSize:13, padding:'5px 12px', borderRadius:7, marginBottom:4 }}>{order.order_number}</div>
            <div style={{ fontSize:11, color:'#ede9e0' }}>Date: {todayStr()}</div>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:muted, marginBottom:7, paddingBottom:4, borderBottom:`1px solid ${border}` }}>Customer</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            {[{l:'Name',v:order.customer_name},{l:'Phone',v:order.phone},{l:'Age',v:order.age?order.age+' years':'—'}].map(i=>(
              <div key={i.l} style={{ background:cream, borderRadius:8, padding:'7px 11px' }}>
                <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:2 }}>{i.l}</div>
                <div style={{ fontSize:13, fontWeight:600, color:navy }}>{i.v||'—'}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:muted, marginBottom:7, paddingBottom:4, borderBottom:`1px solid ${border}` }}>Spectacle Details</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            {[{l:'Frame',v:order.frame},{l:'Frame Type',v:order.frame_type},{l:'Frame Color',v:order.frame_color||'—'},{l:'Lens Type',v:order.lens_type},{l:'Lens Coating',v:order.lens_coating}].map(i=>(
              <div key={i.l} style={{ background:cream, borderRadius:8, padding:'7px 11px' }}>
                <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:2 }}>{i.l}</div>
                <div style={{ fontSize:13, fontWeight:600, color:navy }}>{i.v||'—'}</div>
              </div>
            ))}
            <div style={{ background:'#dcfce7', borderRadius:8, padding:'7px 11px' }}>
              <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#2d7a4f', marginBottom:2 }}>Expected Delivery</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#2d7a4f' }}>{fmtDate(order.deliver_date)}</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:muted, marginBottom:7, paddingBottom:4, borderBottom:`1px solid ${border}` }}>Payment</div>
          <div style={{ background:cream, borderRadius:10, padding:'12px 14px' }}>
            {frameSell > 0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'3px 0', color:muted }}><span>Frame</span><span>{fmtMoney(frameSell)}</span></div>}
            {lensSell  > 0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'3px 0', color:muted }}><span>Lens ({order.lens_type})</span><span>{fmtMoney(lensSell)}</span></div>}
            <div style={{ borderTop:`1.5px solid ${border}`, margin:'8px 0' }}/>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, color:navy, marginBottom:7 }}><span>Total Amount</span><span>{fmtMoney(total)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, padding:'7px 11px', background:billType==='advance'?'#dbeafe':'#dcfce7', borderRadius:8, marginBottom:5, color:billType==='advance'?'#1e40af':'#2d7a4f' }}>
              <span>{billType==='advance'?'✅ Advance Paid':'✅ Balance Paid'}</span>
              <span>{fmtMoney(amountPaid)}</span>
            </div>
            {remaining > 0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, color:'#c0392b' }}><span>Balance Remaining</span><span>{fmtMoney(remaining)}</span></div>}
            {remaining <= 0 && billType==='balance' && <div style={{ textAlign:'center', fontSize:13, fontWeight:700, color:'#2d7a4f', marginTop:4 }}>✅ Fully Paid — Thank You!</div>}
          </div>
        </div>

        <div style={{ borderTop:`2px solid ${navy}`, paddingTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:11, color:muted }}>
            <div style={{ fontWeight:600, color:navy, marginBottom:2 }}>Wickramakalutota Opticals</div>
          <div style={{ fontSize:10, color:muted }}>Tel: 032 222 1211</div>
            <div>Thank you for your trust. 🙏</div>
            {billType==='advance' && <div style={{ fontSize:10, marginTop:3, color:'#c0392b' }}>Please bring this receipt on collection.</div>}
          </div>
          <div style={{ fontSize:18 }}>👁️</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.6)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'24px 16px', fontFamily:"'DM Sans',sans-serif" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:620, boxShadow:'0 24px 80px rgba(0,0,0,.35)' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:`1px solid ${border}` }}>
          <div style={{ display:'flex', gap:6 }}>
            {tabs.map(t=>(
              <button key={t.key} onClick={()=>setActiveTab(t.key)}
                style={{ padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'1.5px solid', fontFamily:'inherit', background:activeTab===t.key?navy:'white', color:activeTab===t.key?'white':muted, borderColor:activeTab===t.key?navy:border }}>
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

        <div style={{ padding:'22px 26px', background:'white' }}>
          {activeTab==='advance' && <PreviewBill billType="advance"/>}
          {activeTab==='balance' && <PreviewBill billType="balance"/>}
          {activeTab==='lab'     && <div style={{ textAlign:'center', padding:'30px 0', color:muted, fontSize:13 }}>
            <div style={{ fontSize:32, marginBottom:10 }}>🔬</div>
            <div style={{ fontWeight:600, color:navy, marginBottom:6 }}>Lab Job Card ready</div>
            <div>Click Print to open and print the lab job card</div>
          </div>}
        </div>

        <div style={{ padding:'10px 20px', borderTop:`1px solid ${border}`, fontSize:12, color:muted, textAlign:'center' }}>
          {activeTab==='advance' && '🖨️ Print to paper  ·  ⬇️ PDF to download and share'}
          {activeTab==='balance' && '🖨️ Print to paper  ·  ⬇️ PDF to download and share'}
          {activeTab==='lab'     && '🖨️ Print and send with frame to lab  ·  ⬇️ PDF to save'}
        </div>
      </div>
    </div>
  );
}