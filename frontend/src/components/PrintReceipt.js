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
  const billLabel  = billType === 'advance' ? 'ADVANCE RECEIPT' : 'FINAL RECEIPT — BALANCE PAID';
  const fmt = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fdate = (d) => { if(!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}); };
  const today = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${order.order_number} — ${billLabel}</title>
<style>
  @page { size: A5 portrait; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', Arial, sans-serif; color: ${navy}; background: white; font-size: 13px; }
  .header { background: ${navy}; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
  .shop-name { font-family: Georgia, serif; font-size: 20px; font-weight: 700; color: white; margin-bottom: 3px; }
  .bill-label { font-size: 9px; color: ${gold}; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 3px; }
  .shop-addr { font-size: 11px; color: #ede9e0; }
  .order-badge { background: ${gold}; color: ${navy}; font-weight: 700; font-size: 14px; padding: 5px 12px; border-radius: 7px; margin-bottom: 5px; text-align:center; }
  .order-date { font-size: 11px; color: #ede9e0; text-align:right; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${muted}; margin-bottom: 7px; padding-bottom: 4px; border-bottom: 1px solid ${border}; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-bottom: 14px; }
  .field { background: ${cream}; border-radius: 8px; padding: 7px 11px; }
  .field-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: ${muted}; margin-bottom: 2px; }
  .field-value { font-size: 13px; font-weight: 600; color: ${navy}; }
  .field-green { background: #dcfce7; }
  .field-green .field-label { color: ${success}; }
  .field-green .field-value { color: ${success}; font-weight: 700; }
  .payment-box { background: ${cream}; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; }
  .pay-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; color: ${muted}; }
  .pay-divider { border-top: 1.5px solid ${border}; margin: 8px 0; }
  .pay-total { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; color: ${navy}; margin-bottom: 7px; }
  .pay-main { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; padding: 7px 11px; border-radius: 8px; margin-bottom: 5px; }
  .pay-advance { background: #dbeafe; color: #1e40af; }
  .pay-balance-paid { background: #dcfce7; color: ${success}; }
  .pay-remaining { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; color: ${danger}; }
  .pay-fully { text-align: center; font-size: 13px; font-weight: 700; color: ${success}; margin-top: 4px; }
  .footer { border-top: 2px solid ${navy}; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; }
  .footer-left { font-size: 11px; color: ${muted}; }
  .footer-shopname { font-weight: 600; color: ${navy}; margin-bottom: 2px; }
  .footer-note { font-size: 10px; color: ${danger}; margin-top: 3px; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="shop-name">👁️ Kuruwita Optical</div>
    <div class="bill-label">${billLabel}</div>
    <div class="shop-addr">Kuruwita, Ratnapura District, Sri Lanka</div>
  </div>
  <div>
    <div class="order-badge">${order.order_number}</div>
    <div class="order-date">Date: ${today}</div>
  </div>
</div>

<div class="section-title">Customer</div>
<div class="grid2">
  <div class="field"><div class="field-label">Name</div><div class="field-value">${order.customer_name||'—'}</div></div>
  <div class="field"><div class="field-label">Phone</div><div class="field-value">${order.phone||'—'}</div></div>
  <div class="field"><div class="field-label">Age</div><div class="field-value">${order.age ? order.age+' years' : '—'}</div></div>
</div>

<div class="section-title">Spectacle Details</div>
<div class="grid2">
  <div class="field"><div class="field-label">Frame</div><div class="field-value">${order.frame||'—'}</div></div>
  <div class="field"><div class="field-label">Frame Type</div><div class="field-value">${order.frame_type||'—'}</div></div>
  <div class="field"><div class="field-label">Frame Color</div><div class="field-value">${order.frame_color||'—'}</div></div>
  <div class="field"><div class="field-label">Lens Type</div><div class="field-value">${order.lens_type||'—'}</div></div>
  <div class="field"><div class="field-label">Lens Coating</div><div class="field-value">${order.lens_coating||'—'}</div></div>
  <div class="field field-green"><div class="field-label">Expected Delivery</div><div class="field-value">${fdate(order.deliver_date)}</div></div>
</div>

<div class="section-title">Payment</div>
<div class="payment-box">
  ${frameSell > 0 ? `<div class="pay-row"><span>Frame</span><span>${fmt(frameSell)}</span></div>` : ''}
  ${lensSell  > 0 ? `<div class="pay-row"><span>Lens (${order.lens_type||''})</span><span>${fmt(lensSell)}</span></div>` : ''}
  <div class="pay-divider"></div>
  <div class="pay-total"><span>Total Amount</span><span>${fmt(total)}</span></div>
  <div class="pay-main ${billType==='advance'?'pay-advance':'pay-balance-paid'}">
    <span>${billType==='advance'?'✅ Advance Paid':'✅ Balance Paid'}</span>
    <span>${fmt(amountPaid)}</span>
  </div>
  ${remaining > 0 ? `<div class="pay-remaining"><span>Balance Remaining</span><span>${fmt(remaining)}</span></div>` : ''}
  ${remaining <= 0 && billType==='balance' ? `<div class="pay-fully">✅ Fully Paid — Thank You!</div>` : ''}
</div>

<div class="footer">
  <div class="footer-left">
    <div class="footer-shopname">Kuruwita Optical</div>
    <div>Thank you for your trust. 🙏</div>
    ${billType==='advance' ? '<div class="footer-note">Please bring this receipt on collection.</div>' : ''}
  </div>
  <div style="font-size:20px;">👁️</div>
</div>

<script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
</body>
</html>`;
}

// ── Build the HTML string for lab job card ────────────────────
function buildLabCardHTML(order) {
  const ref   = order.refraction || order;
  const today = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
  const fdate = (d) => { if(!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}); };

  const eyeRow = (eye, sph, cyl, axis, add, va) => `
    <tr>
      <td style="background:${cream};padding:7px 9px;font-weight:700;font-size:12px;border:1px solid ${border};">${eye}</td>
      <td style="padding:7px;text-align:center;border:1px solid ${border};font-size:13px;font-weight:700;color:${navy};">${sph||'—'}</td>
      <td style="padding:7px;text-align:center;border:1px solid ${border};font-size:13px;font-weight:700;color:${navy};">${cyl||'—'}</td>
      <td style="padding:7px;text-align:center;border:1px solid ${border};font-size:13px;font-weight:700;color:${navy};">${axis||'—'}</td>
      <td style="padding:7px;text-align:center;border:1px solid ${border};font-size:13px;font-weight:700;color:${navy};">${add||'—'}</td>
      <td style="padding:7px;text-align:center;border:1px solid ${border};font-size:13px;font-weight:700;color:${navy};">${va||'—'}</td>
    </tr>`;

  const thStyle = `style="background:${cream};padding:6px 8px;text-align:center;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:${muted};border:1px solid ${border};"`;
  const sectionHead = (label) => `<div style="background:${navy};color:${gold};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:5px 13px;">${label}</div>`;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${order.order_number} — Lab Job Card</title>
<style>
  @page { size: A5 portrait; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: ${navy}; background: white; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; }
  .section { border: 2px solid ${navy}; border-radius: 9px; overflow: hidden; margin-bottom: 9px; }
  .grid2 { display: grid; grid-template-columns: 1fr 2fr; gap: 7px; margin-bottom: 9px; }
  .box { border: 1.5px solid ${border}; border-radius: 8px; overflow: hidden; }
  .box-head { background: ${navy}; color: ${gold}; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 3px 9px; }
  .box-val { padding: 7px 9px; font-size: 13px; font-weight: 700; color: ${navy}; background: white; }
</style>
</head>
<body>

<div style="background:${navy};border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="font-family:Georgia,serif;font-size:15px;font-weight:700;color:white;">👁️ Kuruwita Optical — Lab Job Card</div>
    <div style="font-size:9px;color:${gold};letter-spacing:1.5px;text-transform:uppercase;margin-top:2px;">Send with the frame to the lab</div>
  </div>
  <div style="background:${gold};color:${navy};font-weight:700;font-size:15px;padding:5px 12px;border-radius:7px;">${order.order_number}</div>
</div>

<div class="grid2">
  <div class="box"><div class="box-head">Date</div><div class="box-val">${today}</div></div>
  <div class="box"><div class="box-head">Patient Name</div><div class="box-val">${order.customer_name||'—'}</div></div>
</div>

<div class="section">
  ${sectionHead('Frame')}
  <table>
    <tr>
      <th style="background:${cream};padding:5px 9px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:${muted};border:1px solid ${border};">Frame Name</th>
      <th style="background:${cream};padding:5px 9px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:${muted};border:1px solid ${border};">Type</th>
      <th style="background:${cream};padding:5px 9px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:${muted};border:1px solid ${border};">Color</th>
      <th style="background:${cream};padding:5px 9px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:${muted};border:1px solid ${border};">Material</th>
    </tr>
    <tr>
      <td style="padding:8px 9px;font-size:13px;font-weight:700;color:${navy};border:1px solid ${border};background:white;">${order.frame||'—'}</td>
      <td style="padding:8px 9px;font-size:13px;font-weight:700;color:${navy};border:1px solid ${border};background:white;">${order.frame_type||'—'}</td>
      <td style="padding:8px 9px;font-size:13px;font-weight:700;color:${navy};border:1px solid ${border};background:white;">${order.frame_color||'—'}</td>
      <td style="padding:8px 9px;font-size:13px;font-weight:700;color:${navy};border:1px solid ${border};background:white;">${order.frame_material||'—'}</td>
    </tr>
  </table>
</div>

<div class="section">
  ${sectionHead('Lens')}
  <table>
    <tr>
      <th style="background:${cream};padding:5px 9px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:${muted};border:1px solid ${border};">Lens Type</th>
      <th style="background:${cream};padding:5px 9px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:${muted};border:1px solid ${border};">Coating</th>
      <th style="background:${cream};padding:5px 9px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:${muted};border:1px solid ${border};">Index</th>
    </tr>
    <tr>
      <td style="padding:8px 9px;font-size:13px;font-weight:700;color:${navy};border:1px solid ${border};background:white;">${order.lens_type||'—'}</td>
      <td style="padding:8px 9px;font-size:13px;font-weight:700;color:${navy};border:1px solid ${border};background:white;">${order.lens_coating||'—'}</td>
      <td style="padding:8px 9px;font-size:13px;font-weight:700;color:${navy};border:1px solid ${border};background:white;">${order.lens_index||'—'}</td>
    </tr>
  </table>
</div>

<div class="section">
  ${sectionHead('Prescription')}
  <div style="padding:10px;background:white;">
    <table>
      <tr>
        <th ${thStyle}>Eye</th>
        <th ${thStyle}>SPH</th>
        <th ${thStyle}>CYL</th>
        <th ${thStyle}>AXIS</th>
        <th ${thStyle}>ADD</th>
        <th ${thStyle}>VA</th>
      </tr>
      ${eyeRow('Right (R)', ref.r_sph, ref.r_cyl, ref.r_axis, ref.r_add, ref.r_va)}
      ${eyeRow('Left (L)',  ref.l_sph, ref.l_cyl, ref.l_axis, ref.l_add, ref.l_va)}
    </table>
    ${(ref.notes||ref.ref_notes) ? `<div style="margin-top:7px;font-size:11px;color:${muted};font-style:italic;background:#fef9f0;border-radius:5px;padding:5px 9px;">⚠️ ${ref.notes||ref.ref_notes}</div>` : ''}
  </div>
</div>

<div class="section">
  ${sectionHead('Measurements')}
  <table>
    <tr>
      <th style="background:${cream};padding:6px 11px;text-align:center;font-size:9px;font-weight:700;text-transform:uppercase;color:${muted};border:1px solid ${border};width:40%;"></th>
      <th style="background:${cream};padding:6px 11px;text-align:center;font-size:9px;font-weight:700;text-transform:uppercase;color:${muted};border:1px solid ${border};">Right (R)</th>
      <th style="background:${cream};padding:6px 11px;text-align:center;font-size:9px;font-weight:700;text-transform:uppercase;color:${muted};border:1px solid ${border};">Left (L)</th>
    </tr>
    <tr>
      <td style="background:${cream};padding:9px 11px;font-weight:700;font-size:11px;color:${muted};border:1px solid ${border};text-transform:uppercase;letter-spacing:.5px;">PD</td>
      <td style="padding:9px 11px;text-align:center;border:1px solid ${border};font-size:15px;font-weight:700;color:${navy};background:white;">${ref.r_pd||'—'}</td>
      <td style="padding:9px 11px;text-align:center;border:1px solid ${border};font-size:15px;font-weight:700;color:${navy};background:white;">${ref.l_pd||'—'}</td>
    </tr>
    <tr>
      <td style="background:${cream};padding:9px 11px;font-weight:700;font-size:11px;color:${muted};border:1px solid ${border};text-transform:uppercase;letter-spacing:.5px;">Seg Height</td>
      <td style="padding:9px 11px;text-align:center;border:1px solid ${border};font-size:15px;font-weight:700;color:${navy};background:white;">${order.seg_height_r||'—'}</td>
      <td style="padding:9px 11px;text-align:center;border:1px solid ${border};font-size:15px;font-weight:700;color:${navy};background:white;">${order.seg_height_l||'—'}</td>
    </tr>
  </table>
</div>

${order.notes ? `
<div style="border:1.5px solid ${border};border-radius:8px;overflow:hidden;margin-bottom:9px;">
  <div style="background:${navy};color:${gold};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 11px;">Special Instructions</div>
  <div style="padding:8px 13px;background:white;font-size:13px;color:${navy};">${order.notes}</div>
</div>` : ''}

<div style="border-top:2px solid ${navy};padding-top:9px;font-size:10px;color:${muted};text-align:center;">
  Kuruwita Optical · Kuruwita, Ratnapura · ${today}
</div>

<script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
</body>
</html>`;
}

// ── Open print window ─────────────────────────────────────────
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
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'white', marginBottom:2 }}>👁️ Kuruwita Optical</div>
            <div style={{ fontSize:10, color:gold, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:3 }}>{billLabel}</div>
            <div style={{ fontSize:11, color:'#ede9e0' }}>Kuruwita, Ratnapura District, Sri Lanka</div>
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
            <div style={{ fontWeight:600, color:navy, marginBottom:2 }}>Kuruwita Optical</div>
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
          {activeTab==='advance' && '📄 Click Print — opens in new window, prints automatically'}
          {activeTab==='balance' && '📄 Click Print — opens in new window, prints automatically'}
          {activeTab==='lab'     && '🔬 Click Print — opens lab job card, prints automatically'}
        </div>
      </div>
    </div>
  );
}
