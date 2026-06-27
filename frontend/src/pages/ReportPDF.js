/* eslint-disable */
// ============================================================
//  ReportPDF.js — Full Business Report
//  Pick date range → see all data → download as PDF
// ============================================================
import React, { useState } from 'react';

const C = {
  navy:    'var(--navy)',
  gold:    'var(--gold)',
  cream:   'var(--bg-sunken)',
  surface: 'var(--bg-surface)',
  border:  'var(--border)',
  muted:   'var(--text-muted)',
  success: 'var(--success)',
  danger:  'var(--danger)',
};
const fmt  = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0,maximumFractionDigits:0});
const fmtD = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2});
const pct  = (n) => (parseFloat(n||0)).toFixed(1) + '%';
const fmtDate = (d) => { if(!d) return '—'; return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); };
const today   = () => new Date().toISOString().split('T')[0];
const firstOfMonth = (offset=0) => {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()+offset);
  return d.toISOString().split('T')[0];
};

function apiGet(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json());
}

// ── Build the HTML for the PDF ─────────────────────────────────
function buildReportHTML(data, from, to) {
  const fmtR = (n) => 'Rs. ' + Math.round(parseFloat(n||0)).toLocaleString();

  // ── Expenses: compute from byCategory if summary field is missing ──
  const expCats   = (data.expenses?.byCategory || []);
  const catTotal  = expCats.reduce((s,r) => s + parseFloat(r.total||0), 0);
  const catCount  = expCats.reduce((s,r) => s + parseInt(r.count||0),  0);

  // ── Summary with all fallbacks ────────────────────────────────────
  const rawS = data.summary || {};
  const s = {
    netProfit:0, profitMargin:0, totalRevenue:0, grossProfit:0,
    totalExpenses:0, totalCOGS:0, operatingExpenses:0,
    ...rawS,
    // Use byCategory sum as the most reliable source for totalExpenses
    totalExpenses:  parseFloat(rawS.totalExpenses || rawS.operatingExpenses || 0) || catTotal,
    grossProfit:    parseFloat(rawS.grossProfit || 0),
    totalCOGS:      parseFloat(rawS.totalCOGS || 0),
  };

  // ── Sub-objects with safe fallbacks ──────────────────────────────
  const o = {
    total_orders:0, revenue:0, collected:0, outstanding:0,
    delivered:0, in_progress:0, list:[],
    ...(data.orders || {}),
  };
  const qs = {
    total_sales:0, revenue:0, total_discount:0, list:[],
    ...(data.quickSales || {}),
  };
  const rep = {
    total_repairs:0, revenue:0, free_repairs:0, types:[],
    ...(data.repairs || {}),
  };
  const ex = {
    total_count:    catCount,   // compute from categories — always correct
    total_expenses: catCount,   // alias used for display
    total_amount:   catTotal,   // compute from categories — always correct
    cash_expenses:  parseFloat(data.expenses?.cash_expenses || 0),
    bank_expenses:  parseFloat(data.expenses?.bank_expenses || 0),
    ...(data.expenses || {}),
    // Override with computed values (more reliable)
    total_count:    catCount,
    total_expenses: catCount,
    total_amount:   catTotal,
  };
  const dep = {
    total: 0, total_deposited: 0, count: 0,
    ...(data.deposits || {}),
    // Use whichever field has the value
    total: parseFloat(data.deposits?.total || data.deposits?.total_deposited || 0),
    count: parseInt(data.deposits?.count || 0),
  };

  const now = new Date().toLocaleDateString('en-GB',{
    day:'2-digit', month:'long', year:'numeric',
    hour:'2-digit', minute:'2-digit',
  });

  // ── Stock purchases ────────────────────────────────────────────────
  const stockData      = data.dealerPurchases || data.stockPurchases || [];
  const totalStockSpend= stockData.reduce((s,r) => s + parseFloat(r.total||0), 0);
  const totalStockCount= stockData.reduce((s,r) => s + parseInt(r.purchases||r.count||r.items||0), 0);

  // ── Lens jobs — handle both old and new API formats ───────────────
  const lensJobsRaw = data.lensJobs || [];
  const lensJobsDisplay = lensJobsRaw.map(j => ({
    lens_company: j.lens_company || j.lab || j.company || '—',
    total:     j.total       ?? j.orders_with_bill ?? j.total_orders   ?? 0,
    completed: j.completed   ?? j.orders_with_bill ?? j.delivered      ?? 0,
  }));

  // Mini bar chart SVG for daily revenue
  const daily = data.daily || [];
  const maxDay = Math.max(...daily.map(d=>parseFloat(d.order_revenue||0)+parseFloat(d.qs_revenue||0)+parseFloat(d.repair_revenue||0)),1);
  const dayBars = daily.map((d,i) => {
    const total = parseFloat(d.order_revenue||0)+parseFloat(d.qs_revenue||0)+parseFloat(d.repair_revenue||0);
    const h = Math.max(2, Math.round(total/maxDay*64));
    const x = 4 + i * (550/Math.max(daily.length,1));
    const w = Math.max(2, 550/Math.max(daily.length,1)-2);
    return `<rect x="${x}" y="${68-h}" width="${w}" height="${h}" fill="#0f1f3d" rx="2" opacity="0.85"/>`;
  }).join('');

  const chartSVG = daily.length > 1 ? `
    <svg viewBox="0 0 560 80" style="width:100%;height:80px;display:block;">
      <rect x="0" y="0" width="560" height="70" fill="#fafafa" rx="6"/>
      <line x1="0" y1="70" x2="560" y2="70" stroke="#e5e7eb" stroke-width="1"/>
      <line x1="0" y1="40" x2="560" y2="40" stroke="#f3f4f6" stroke-width="0.5" stroke-dasharray="4,4"/>
      ${dayBars}
    </svg>` : '';

  // Expense category rows
  const expCatRows = expCats.map(e=>`
    <tr>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;">${e.category}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:center;">${e.count}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:right;font-weight:600;color:#c0392b;">${fmtR(e.total)}</td>
    </tr>`).join('');

  // Order list rows (first 30)
  const orderRows = o.list.slice(0,30).map(or=>`
    <tr>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;">${or.order_number}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;">${new Date(or.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;">${(or.customer_name||or.customer||'—').slice(0,22)}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;">${(or.frame||'—').slice(0,18)}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;">${or.lens_type||'—'}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;text-align:right;">${fmtR(or.total_amount)}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;text-align:center;">
        <span class="badge ${or.status==='delivered'?'badge-green':or.status==='overdue'?'badge-red':'badge-blue'}">${or.status}</span>
      </td>
    </tr>`).join('');

  // Top frames
  const frameRows = (data.topFrames||[]).slice(0,8).map((f,i)=>{
    const fname = f.frame || f.name || f.frame_name || Object.values(f).find(v=>typeof v==='string'&&v.length>1) || '—';
    const funits = f.units || f.count || f.unit_count || 0;
    const frev   = f.revenue || f.total_revenue || f.total || 0;
    return `
    <tr>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;">${i+1}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;">${fname}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:center;">${funits}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:right;">${fmtR(frev)}</td>
    </tr>`;
  }).join('');

  // Repair types
  const repairRows = rep.types.map(r=>`
    <tr>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;">${r.repair_type}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:center;">${r.count}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:right;">${fmtR(r.revenue)}</td>
    </tr>`).join('');

  // Dealer purchases
  const dealerRows = stockData.map(d=>`
    <tr>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;font-weight:600">${d.dealer_name||'—'}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:center;">${d.purchases||d.count||0} purchases</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:center;">${d.items||0} items</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:right;font-weight:600;color:#c0392b;">${fmtR(d.total)}</td>
    </tr>`).join('');

  // ── Pre-compute Lab Bills HTML (avoids nested template literal issues) ──
  const labBillsHTML = (() => {
    const lb = data.labBills || {};
    const byLab = (lb.by_lab && lb.by_lab.length > 0)
      ? lb.by_lab
      : (data.lensJobs || []).map(j => ({
          lens_company:     j.lens_company || '—',
          orders_with_bill: j.orders_with_bill || j.total || 0,
          lab_total:        j.lab_total || 0,
          total_paid:       j.total_paid || 0,
          total_unpaid:     j.total_unpaid || 0,
        }));
    if (!byLab.length) return '';
    const totalBilled = byLab.reduce((s,l) => s + parseFloat(l.lab_total||0), 0);
    const totalPaid   = byLab.reduce((s,l) => s + parseFloat(l.total_paid||0), 0);
    const totalUnpaid = byLab.reduce((s,l) => s + parseFloat(l.total_unpaid||0), 0);
    const rowsHtml = byLab.map(l =>
      '<tr>' +
      '<td style="padding:6px 10px;border:1px solid #e0ddd6;font-weight:600">' + (l.lens_company||'—') + '</td>' +
      '<td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:center">' + (l.orders_with_bill||0) + '</td>' +
      '<td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:right">' + fmtR(l.lab_total) + '</td>' +
      '<td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:right;color:#2d7a4f">' + fmtR(l.total_paid) + '</td>' +
      '<td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:right;color:' + (parseFloat(l.total_unpaid)>0?'#c0392b':'#6b7280') + ';font-weight:' + (parseFloat(l.total_unpaid)>0?'700':'400') + '">' + fmtR(l.total_unpaid) + '</td>' +
      '</tr>'
    ).join('');
    return (
      '<h2>Lab Bills — Negombo Optical & Solex</h2>' +
      '<div class="grid3">' +
        '<div class="kpi dark"><div class="kpi-label">Total Billed by Labs</div><div class="kpi-value">' + fmtR(totalBilled) + '</div></div>' +
        '<div class="kpi"><div class="kpi-label">Paid to Labs</div><div class="kpi-value" style="color:#2d7a4f">' + fmtR(totalPaid) + '</div></div>' +
        '<div class="kpi"><div class="kpi-label">Still Owed to Labs</div><div class="kpi-value" style="color:#c0392b">' + fmtR(totalUnpaid) + '</div></div>' +
      '</div>' +
      '<table>' +
        '<tr><th>Lab</th><th class="c">Orders</th><th class="r">Total Billed</th><th class="r">Paid</th><th class="r">Unpaid</th></tr>' +
        rowsHtml +
      '</table>'
    );
  })();

  const profitColor = parseFloat(s.netProfit) >= 0 ? '#2d7a4f' : '#c0392b';

  // ── Pre-compute lab bills HTML (avoids nested template literal issues) ──
  const labByRows = (data.labBills?.by_lab?.length > 0)
    ? data.labBills.by_lab
    : (data.lensJobs || []).map(j => ({
        lens_company:     j.lens_company || '—',
        orders_with_bill: j.orders_with_bill || j.total || 0,
        lab_total:        j.lab_total || 0,
        total_paid:       j.total_paid || 0,
        total_unpaid:     j.total_unpaid || 0,
      }));
  const labTotalBilled  = labByRows.reduce((s,l) => s + parseFloat(l.lab_total||0), 0);
  const labTotalPaid    = labByRows.reduce((s,l) => s + parseFloat(l.total_paid||0), 0);
  const labTotalUnpaid  = labByRows.reduce((s,l) => s + parseFloat(l.total_unpaid||0), 0);
  const labRowsHtml     = labByRows.map(l => [
    '<tr>',
    '<td style="padding:6px 10px;border:1px solid #e0ddd6;font-weight:600">' + (l.lens_company||'—') + '</td>',
    '<td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:center">' + (l.orders_with_bill||0) + '</td>',
    '<td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:right">' + fmtR(l.lab_total) + '</td>',
    '<td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:right;color:#2d7a4f">' + fmtR(l.total_paid) + '</td>',
    '<td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:right;color:' + (parseFloat(l.total_unpaid)>0?'#c0392b':'#6b7280') + ';font-weight:' + (parseFloat(l.total_unpaid)>0?'700':'400') + '">' + fmtR(l.total_unpaid) + '</td>',
    '</tr>',
  ].join('')).join('');

  const labBillsHtml = labByRows.length === 0 ? '' : [
    '<h2>Lab Bills — Negombo Optical &amp; Solex</h2>',
    '<div class="grid3">',
    '<div class="kpi dark"><div class="kpi-label">Total Billed by Labs</div><div class="kpi-value">' + fmtR(labTotalBilled) + '</div></div>',
    '<div class="kpi"><div class="kpi-label">Paid to Labs</div><div class="kpi-value" style="color:#2d7a4f">' + fmtR(labTotalPaid) + '</div></div>',
    '<div class="kpi"><div class="kpi-label">Still Owed to Labs</div><div class="kpi-value" style="color:#c0392b">' + fmtR(labTotalUnpaid) + '</div></div>',
    '</div>',
    '<table><tr><th>Lab</th><th class="c">Orders</th><th class="r">Total Billed</th><th class="r">Paid</th><th class="r">Unpaid</th></tr>',
    labRowsHtml,
    '</table>',
  ].join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Wickramakalutota Opticals — Business Report ${from} to ${to}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  @page { size: A4 portrait; margin: 14mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', Arial, sans-serif; color: #111827; font-size: 12px; line-height: 1.6; background: white; }

  /* Section headings */
  h2 { font-size: 14px; font-weight: 700; color: #0f1f3d; margin: 20px 0 12px;
       padding: 8px 14px; background: #f8f9fc; border-left: 4px solid #c9a84c;
       border-radius: 0 8px 8px 0; letter-spacing: .3px; }
  h3 { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase;
       letter-spacing: 1.2px; margin: 12px 0 6px; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 14px; border-radius: 8px; overflow: hidden; }
  th { background: #0f1f3d; color: white; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: .5px; }
  th.r { text-align: right; }
  th.c { text-align: center; }
  td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #fafafa; }
  tr.total td { background: #f0f2f7; font-weight: 700; border-top: 2px solid #e5e7eb; }

  /* Page breaks */
  .page-break { page-break-before: always; padding-top: 8px; }

  /* KPI grids */
  .grid4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 14px; }
  .grid3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 14px; }
  .grid2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; margin-bottom: 14px; }

  /* KPI card */
  .kpi { border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; background: white; }
  .kpi-icon { font-size: 18px; margin-bottom: 6px; display: block; }
  .kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #9ca3af; margin-bottom: 5px; }
  .kpi-value { font-size: 20px; font-weight: 700; line-height: 1; letter-spacing: -.5px; }
  .kpi-sub { font-size: 10px; color: #9ca3af; margin-top: 4px; }

  /* Dark KPI card */
  .dark { background: linear-gradient(135deg,#0f1f3d,#1a3260); border-color: #0f1f3d; }
  .dark .kpi-label { color: rgba(201,168,76,.9); }
  .dark .kpi-value { color: white; }
  .dark .kpi-sub { color: rgba(255,255,255,.55); }

  /* Profit highlight */
  .profit-box { background: ${parseFloat(s.netProfit)>=0?'linear-gradient(135deg,#f0fdf4,#dcfce7)':'linear-gradient(135deg,#fff1f2,#fee2e2)'}; border: 2px solid ${parseFloat(s.netProfit)>=0?'#86efac':'#fca5a5'}; border-radius: 14px; padding: 20px 24px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
  .profit-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: ${profitColor}; margin-bottom: 6px; }
  .profit-value { font-size: 32px; font-weight: 700; color: ${profitColor}; letter-spacing: -1px; line-height: 1; }
  .profit-margin { font-size: 12px; color: ${profitColor}; margin-top: 5px; opacity: .8; }

  /* Formula bar */
  .formula { background: #f8f9fc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 16px; font-size: 12px; margin-bottom: 16px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .f-rev { color: #16a34a; font-weight: 700; }
  .f-cog { color: #dc2626; font-weight: 700; }
  .f-exp { color: #f97316; font-weight: 700; }
  .f-net { color: ${profitColor}; font-weight: 700; font-size: 14px; }
  .op { color: #9ca3af; font-size: 14px; }

  /* Pill badges */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9.5px; font-weight: 700; }
  .badge-green { background: #dcfce7; color: #16a34a; }
  .badge-blue  { background: #dbeafe; color: #1d4ed8; }
  .badge-red   { background: #fee2e2; color: #dc2626; }
  .badge-gold  { background: #fef9c3; color: #92400e; }
  .badge-gray  { background: #f3f4f6; color: #6b7280; }

  /* Progress bar */
  .prog-wrap { height: 5px; background: #f3f4f6; border-radius: 3px; overflow: hidden; margin-top: 4px; }
  .prog-bar  { height: 100%; border-radius: 3px; }

  /* Section divider */
  .divider { border: none; border-top: 1.5px solid #f3f4f6; margin: 16px 0; }

  /* Footer */
  .footer { margin-top: 24px; padding-top: 10px; border-top: 2px solid #0f1f3d; display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; }
  .footer b { color: #0f1f3d; }
</style>
</head>
<body>

<!-- ══ COVER / HEADER ═════════════════════════════════════ -->
<div style="background:linear-gradient(135deg,#0b1829 0%,#0f1f3d 60%,#162d52 100%);border-radius:14px;padding:22px 28px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start;position:relative;overflow:hidden;">
  <div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;border-radius:50%;background:rgba(201,168,76,.06);pointer-events:none;"></div>
  <div>
    <img src="data:image/jpeg;base64,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" alt="Wickramakalutota Opticals" style="height:56px;object-fit:contain;max-width:220px;margin-bottom:6px;"/>
    <div style="font-size:11px;color:#c9a84c;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Business Report</div>
    <div style="font-size:14px;color:#ede9e0;font-weight:600;">${fmtDate(from)} — ${fmtDate(to)}</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:10px;color:#ede9e0;">Generated on</div>
    <div style="font-size:11px;color:white;font-weight:600;">${now}</div>
    <div style="font-size:10px;color:#ede9e0;margin-top:8px;">No.57 Kurunegala Road, Chilaw</div>
  </div>
</div>

<!-- ══ NET PROFIT HIGHLIGHT ══════════════════════════════ -->
<div class="profit-box">
  <div>
    <div class="profit-label">📊 Net Profit for Period</div>
    <div class="profit-value">${fmtR(s.netProfit)}</div>
    <div class="profit-margin">Net margin: ${s.profitMargin}% &nbsp;|&nbsp; ${fmtDate(from)} – ${fmtDate(to)}</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:11px;color:${profitColor};margin-bottom:4px;">Revenue</div>
    <div style="font-size:17px;font-weight:700;color:${profitColor};">${fmtR(s.totalRevenue)}</div>
    <div style="font-size:10px;color:${profitColor};margin-top:6px;">Expenses</div>
    <div style="font-size:14px;font-weight:700;color:#c0392b;">${fmtR(s.totalExpenses || catTotal)}</div>
  </div>
</div>

<!-- ══ PROFIT FORMULA ════════════════════════════════════ -->
<div class="formula">
  <span class="f-rev">${fmtR(s.totalRevenue)}</span><span class="op" style="margin:0 2px;">Revenue</span>
  <span class="op">−</span>
  <span class="f-cog">${fmtR(s.grossProfit > 0 ? parseFloat(s.totalRevenue)-parseFloat(s.grossProfit) : 0)}</span><span class="op" style="margin:0 2px;">COGS</span>
  <span class="op">−</span>
  <span class="f-exp">${fmtR(s.totalExpenses || catTotal)}</span><span class="op" style="margin:0 2px;">Expenses</span>
  <span class="op">=</span>
  <span class="f-net">${fmtR(s.netProfit)}</span><span style="color:${profitColor};font-size:11px;margin-left:2px;">Net Profit (${s.profitMargin}%)</span>
</div>

<!-- ══ KPI GRID ════════════════════════════════════════════ -->
<div class="grid4">
  <div class="kpi dark"><span class="kpi-icon">💵</span><div class="kpi-label">Total Revenue</div><div class="kpi-value">${fmtR(s.totalRevenue)}</div><div class="kpi-sub">Orders + Sales + Repairs</div></div>
  <div class="kpi"><span class="kpi-icon">📋</span><div class="kpi-label">Orders Revenue</div><div class="kpi-value" style="color:#0f1f3d">${fmtR(o.revenue)}</div><div class="kpi-sub">${o.total_orders} orders</div></div>
  <div class="kpi"><span class="kpi-icon">🛍️</span><div class="kpi-label">Quick Sales</div><div class="kpi-value" style="color:#2563eb">${fmtR(qs.revenue)}</div><div class="kpi-sub">${qs.total_sales} sales</div></div>
  <div class="kpi"><span class="kpi-icon">🔧</span><div class="kpi-label">Repair Revenue</div><div class="kpi-value" style="color:#0891b2">${fmtR(rep.revenue)}</div><div class="kpi-sub">${rep.total_repairs} repairs</div></div>
</div>

<div class="grid4">
  <div class="kpi"><span class="kpi-icon">💸</span><div class="kpi-label">Total Expenses</div><div class="kpi-value" style="color:#dc2626">${fmtR(s.totalExpenses)}</div><div class="kpi-sub">${ex.total_expenses||ex.total_count||0} transactions</div></div>
  <div class="kpi"><span class="kpi-icon">🛒</span><div class="kpi-label">Stock Purchased</div><div class="kpi-value" style="color:#dc2626">${fmtR(totalStockSpend)}</div><div class="kpi-sub">${totalStockCount} items from ${stockData.length} dealer${stockData.length!==1?'s':''}</div></div>
  <div class="kpi"><span class="kpi-icon">🏦</span><div class="kpi-label">Cash Deposited</div><div class="kpi-value" style="color:#2563eb">${fmtR(dep.total||dep.total_deposited||0)}</div><div class="kpi-sub">${dep.count||0} deposits</div></div>
  <div class="kpi"><span class="kpi-icon">✅</span><div class="kpi-label">Collected</div><div class="kpi-value" style="color:#16a34a">${fmtR(o.collected)}</div><div class="kpi-sub">${fmtR(o.outstanding)} still owed</div></div>
</div>

<!-- ══ DAILY REVENUE CHART ════════════════════════════════ -->
${daily.length > 1 ? `
<h2>Daily Revenue Trend</h2>
${chartSVG}
<div style="font-size:10px;color:#6b7280;margin-top:4px;margin-bottom:12px;">${fmtDate(from)} to ${fmtDate(to)} — each bar = one day's total revenue</div>` : ''}

<!-- ══ ORDERS SECTION ════════════════════════════════════ -->
<h2>Orders Summary</h2>
<div class="grid4">
  <div class="kpi"><div class="kpi-label">Total Orders</div><div class="kpi-value">${o.total_orders}</div></div>
  <div class="kpi"><div class="kpi-label">Delivered</div><div class="kpi-value" style="color:#2d7a4f">${o.delivered}</div></div>
  <div class="kpi"><div class="kpi-label">In Progress</div><div class="kpi-value" style="color:#2563eb">${o.in_progress}</div></div>
  <div class="kpi"><div class="kpi-label">Outstanding Balance</div><div class="kpi-value" style="color:#c0392b">${fmtR(o.outstanding)}</div></div>
</div>

${o.list.length > 0 ? `
<h3>Order List ${o.list.length > 30 ? '(first 30 shown)' : ''}</h3>
<table>
  <tr>
    <th>Order No.</th><th>Date</th><th>Customer</th><th>Frame</th><th>Lens</th><th class="r">Total</th><th class="c">Status</th>
  </tr>
  ${orderRows}
</table>` : ''}

<!-- ══ PAGE BREAK ════════════════════════════════════════ -->
<div class="page-break"></div>

<!-- ══ QUICK SALES ════════════════════════════════════════ -->
<h2>Quick Sales</h2>
<div class="grid3">
  <div class="kpi dark"><div class="kpi-label">Revenue</div><div class="kpi-value">${fmtR(qs.revenue)}</div></div>
  <div class="kpi"><div class="kpi-label">Total Sales</div><div class="kpi-value">${qs.total_sales}</div></div>
  <div class="kpi"><div class="kpi-label">Discounts Given</div><div class="kpi-value" style="color:#c0392b">${fmtR(qs.total_discount)}</div></div>
</div>

${qs.list && qs.list.length > 0 ? `
<h3>Quick Sales List</h3>
<table>
  <tr>
    <th>Sale No.</th>
    <th>Date</th>
    <th>Time</th>
    <th>Customer</th>
    <th>Items</th>
    <th class="r">Discount</th>
    <th class="r">Total</th>
    <th class="c">Payment</th>
  </tr>
  ${qs.list.map(s => {
    let items = [];
    try { items = typeof s.items === 'string' ? JSON.parse(s.items) : s.items || []; } catch(e) {}
    const itemSummary = items.slice(0,2).map(i => i.name).join(', ') + (items.length > 2 ? ` +${items.length-2} more` : '');
    return `
    <tr>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;">${s.sale_number}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;">${new Date(s.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;">${s.time||'—'}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;">${(s.customer_name||'Walk-in').slice(0,18)}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:10px;color:#6b7280;">${itemSummary||'—'}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;text-align:right;color:#c0392b;">${parseFloat(s.discount||0)>0?fmtR(s.discount):'—'}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;text-align:right;font-weight:600;">${fmtR(s.total)}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;text-align:center;">
        <span class="badge ${s.payment_method==='cash'?'badge-green':'badge-blue'}">${s.payment_method}</span>
      </td>
    </tr>`;
  }).join('')}
  <tr class="total">
    <td colspan="6" style="padding:6px 8px;border:1px solid #e0ddd6;">TOTAL (${qs.list.length} sales)</td>
    <td style="padding:6px 8px;border:1px solid #e0ddd6;text-align:right;color:#2d7a4f;">${fmtR(qs.revenue)}</td>
    <td style="padding:6px 8px;border:1px solid #e0ddd6;"></td>
  </tr>
</table>` : ''}

<!-- ══ REPAIRS ════════════════════════════════════════════ -->
<h2>Repairs</h2>
<div class="grid3">
  <div class="kpi dark"><div class="kpi-label">Revenue</div><div class="kpi-value">${fmtR(rep.revenue)}</div></div>
  <div class="kpi"><div class="kpi-label">Total Repairs</div><div class="kpi-value">${rep.total_repairs}</div></div>
  <div class="kpi"><div class="kpi-label">Free Repairs</div><div class="kpi-value">${rep.free_repairs}</div></div>
</div>

${rep.types.length > 0 ? `
<h3>Repair Type Breakdown</h3>
<table>
  <tr><th>Repair Type</th><th class="c">Count</th><th class="r">Revenue</th></tr>
  ${repairRows}
</table>` : ''}

<!-- ══ EXPENSES ════════════════════════════════════════════ -->
<h2>Expenses</h2>
<div class="grid3">
  <div class="kpi dark"><div class="kpi-label">Total Expenses</div><div class="kpi-value">${fmtR(s.totalExpenses || catTotal)}</div><div class="kpi-sub">${ex.total_count} entries</div></div>
  <div class="kpi"><div class="kpi-label">Cash Expenses</div><div class="kpi-value" style="color:#c0392b">${fmtR(ex.cash_expenses)}</div></div>
  <div class="kpi"><div class="kpi-label">Bank Expenses</div><div class="kpi-value" style="color:#c0392b">${fmtR(ex.bank_expenses)}</div></div>
</div>

${expCats.length > 0 ? `
<h3>Expenses by Category</h3>
<table>
  <tr><th>Category</th><th class="c">Count</th><th class="r">Amount</th></tr>
  ${expCatRows}
  <tr class="total">
    <td style="padding:6px 10px;border:1px solid #e0ddd6;">TOTAL</td>
    <td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:center;">${ex.total_expenses||ex.total_count||0}</td>
    <td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:right;color:#c0392b;">${fmtR(s.totalExpenses)}</td>
  </tr>
</table>` : ''}

<!-- ══ STOCK PURCHASES ════════════════════════════════════ -->
${stockData.length > 0 ? `
<h2>Stock Purchases from Dealers</h2>
<table>
  <tr><th>Dealer</th><th class="c">Purchases</th><th class="c">Items</th><th class="r">Total Spent</th></tr>
  ${dealerRows}
  <tr class="total">
    <td style="padding:6px 10px;border:1px solid #e0ddd6;">TOTAL</td>
    <td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:center;">${stockData.reduce((s,d)=>s+(d.purchases||d.count||0),0)} purchases</td>
    <td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:center;">${totalStockCount} items</td>
    <td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:right;color:#c0392b;">${fmtR(totalStockSpend)}</td>
  </tr>
</table>` : ''}

<!-- ══ LAB BILLS ════════════════════════════════════════ -->
${labBillsHtml}

<!-- ══ KALUTOTA ACCOUNT ════════════════════════════════════ -->
${data.kalutota && data.kalutota.total_transactions > 0 ? `
<h2>Kalutota Opticals Account</h2>
<div class="grid4">
  <div class="kpi dark"><div class="kpi-label">Net Balance</div>
    <div class="kpi-value" style="color:${parseFloat(data.kalutota.they_owe_you||0) >= parseFloat(data.kalutota.you_owe_them||0)?'#86efac':'#fca5a5'}">
      ${fmtR(Math.abs((parseFloat(data.kalutota.they_owe_you||0))-(parseFloat(data.kalutota.you_owe_them||0))))}
    </div>
    <div class="kpi-sub">${parseFloat(data.kalutota.they_owe_you||0) >= parseFloat(data.kalutota.you_owe_them||0)?'They owe you':'You owe them'}</div>
  </div>
  <div class="kpi"><div class="kpi-label">Goods Out (they took)</div><div class="kpi-value" style="color:#7c3aed">${fmtR(data.kalutota.total_out)}</div></div>
  <div class="kpi"><div class="kpi-label">Goods In (they gave)</div><div class="kpi-value" style="color:#0891b2">${fmtR(data.kalutota.total_in)}</div></div>
  <div class="kpi"><div class="kpi-label">Transactions</div><div class="kpi-value">${data.kalutota.total_transactions}</div></div>
</div>` : ''}

<!-- ══ PAGE BREAK ════════════════════════════════════════ -->
<div class="page-break"></div>

<!-- ══ TOP PERFORMERS ═════════════════════════════════════ -->
<h2>Top Performing Frames</h2>
${(data.topFrames||[]).length > 0 ? `
<table>
  <tr><th>#</th><th>Frame</th><th class="c">Units Sold</th><th class="r">Revenue</th></tr>
  ${frameRows}
</table>` : '<p style="color:#6b7280;font-size:12px;">No order data for this period</p>'}

<h2>Lens Types</h2>
${(data.topLenses||[]).length > 0 ? `
<table>
  <tr><th>Lens Type</th><th class="c">Units</th><th class="r">Revenue</th></tr>
  ${(data.topLenses||[]).map(l=>{
    const lname  = l.lens_type || l.type || l.name || l.lens || Object.values(l).find(v=>typeof v==='string'&&v.length>1) || '—';
    const lunits = l.units || l.count || 0;
    const lrev   = l.revenue || l.total || 0;
    return `
    <tr>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;">${lname}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:center;">${lunits}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:right;">${fmtR(lrev)}</td>
    </tr>`;
  }).join('')}
</table>` : '<p style="color:#6b7280;font-size:12px;">No data for this period</p>'}

<!-- ══ LENS JOBS ══════════════════════════════════════════ -->
${lensJobsDisplay.length > 0 ? `
<h2>Lens Jobs by Lab</h2>
<table>
  <tr><th>Lab / Company</th><th class="c">Total Jobs</th><th class="c">Completed</th></tr>
  ${lensJobsDisplay.map(j=>`
    <tr>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;">${j.lens_company||'—'}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:center;">${j.total}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:center;">${j.completed}</td>
    </tr>`).join('')}
</table>` : ''}

<!-- ══ FINAL PROFIT SUMMARY ════════════════════════════════ -->
<h2>Profit & Loss Summary</h2>
<table>
  <tr><th>Item</th><th class="r">Amount</th><th class="r">% of Revenue</th></tr>
  <tr style="background:#dcfce7;">
    <td style="padding:8px 10px;border:1px solid #e0ddd6;font-weight:700;">Total Revenue</td>
    <td style="padding:8px 10px;border:1px solid #e0ddd6;text-align:right;font-weight:700;color:#2d7a4f;">${fmtR(s.totalRevenue)}</td>
    <td style="padding:8px 10px;border:1px solid #e0ddd6;text-align:right;">100%</td>
  </tr>
  <tr><td style="padding:6px 10px;border:1px solid #e0ddd6;padding-left:20px;">↳ Orders</td><td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:right;">${fmtR(o.revenue)}</td><td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:right;">${s.totalRevenue>0?(parseFloat(o.revenue)/parseFloat(s.totalRevenue)*100).toFixed(1)+'%':'—'}</td></tr>
  <tr><td style="padding:6px 10px;border:1px solid #e0ddd6;padding-left:20px;">↳ Quick Sales</td><td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:right;">${fmtR(qs.revenue)}</td><td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:right;">${s.totalRevenue>0?(parseFloat(qs.revenue)/parseFloat(s.totalRevenue)*100).toFixed(1)+'%':'—'}</td></tr>
  <tr><td style="padding:6px 10px;border:1px solid #e0ddd6;padding-left:20px;">↳ Repairs</td><td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:right;">${fmtR(rep.revenue)}</td><td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:right;">${s.totalRevenue>0?(parseFloat(rep.revenue)/parseFloat(s.totalRevenue)*100).toFixed(1)+'%':'—'}</td></tr>
  <tr style="background:#fee2e2;">
    <td style="padding:8px 10px;border:1px solid #e0ddd6;font-weight:700;">Cost of Goods Sold</td>
    <td style="padding:8px 10px;border:1px solid #e0ddd6;text-align:right;font-weight:700;color:#c0392b;">− ${fmtR(parseFloat(s.totalRevenue)-parseFloat(s.grossProfit))}</td>
    <td style="padding:8px 10px;border:1px solid #e0ddd6;text-align:right;color:#c0392b;">${s.totalRevenue>0?((parseFloat(s.totalRevenue)-parseFloat(s.grossProfit))/parseFloat(s.totalRevenue)*100).toFixed(1)+'%':'—'}</td>
  </tr>
  <tr style="background:#f0fdf4;font-weight:600;">
    <td style="padding:8px 10px;border:1px solid #e0ddd6;">Gross Profit</td>
    <td style="padding:8px 10px;border:1px solid #e0ddd6;text-align:right;color:#2d7a4f;">${fmtR(s.grossProfit)}</td>
    <td style="padding:8px 10px;border:1px solid #e0ddd6;text-align:right;">${s.totalRevenue>0?(parseFloat(s.grossProfit)/parseFloat(s.totalRevenue)*100).toFixed(1)+'%':'—'}</td>
  </tr>
  <tr style="background:#fee2e2;">
    <td style="padding:8px 10px;border:1px solid #e0ddd6;font-weight:700;">Total Expenses</td>
    <td style="padding:8px 10px;border:1px solid #e0ddd6;text-align:right;font-weight:700;color:#c0392b;">− ${fmtR(s.totalExpenses || catTotal)}</td>
    <td style="padding:8px 10px;border:1px solid #e0ddd6;text-align:right;color:#c0392b;">${s.totalRevenue>0?((parseFloat(s.totalExpenses||catTotal))/parseFloat(s.totalRevenue)*100).toFixed(1)+'%':'—'}</td>
  </tr>
  <tr style="background:${parseFloat(s.netProfit)>=0?'#dcfce7':'#fee2e2'};">
    <td style="padding:10px 10px;border:1px solid #e0ddd6;font-weight:700;font-size:14px;">NET PROFIT</td>
    <td style="padding:10px 10px;border:1px solid #e0ddd6;text-align:right;font-weight:700;font-size:16px;color:${profitColor};">${fmtR(s.netProfit)}</td>
    <td style="padding:10px 10px;border:1px solid #e0ddd6;text-align:right;font-weight:700;font-size:14px;color:${profitColor};">${s.profitMargin}%</td>
  </tr>
</table>

<!-- ══ FOOTER ════════════════════════════════════════════ -->
<div class="footer">
  <div>Wickramakalutota Opticals · No.57 Kurunegala Road, Chilaw · Tel: 032 222 1211 · Tel: 032 222 1211</div>
  <div>Report period: ${fmtDate(from)} — ${fmtDate(to)} · Generated: ${now}</div>
</div>

<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════
export default function ReportPDF() {
  const [from,    setFrom]    = useState(firstOfMonth());
  const [to,      setTo]      = useState(today());
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [previewing, setPreviewing] = useState(false);

  // Quick range presets
  const presets = [
    { label:'This Month',   from:firstOfMonth(),   to:today()              },
    { label:'Last Month',   from:firstOfMonth(-1), to:firstOfMonth()+'-01' <= today() ? new Date(new Date(firstOfMonth()).setDate(0)).toISOString().split('T')[0] : today() },
    { label:'Last 7 Days',  from:new Date(Date.now()-7*864e5).toISOString().split('T')[0],  to:today() },
    { label:'Last 30 Days', from:new Date(Date.now()-30*864e5).toISOString().split('T')[0], to:today() },
    { label:'Last 90 Days', from:new Date(Date.now()-90*864e5).toISOString().split('T')[0], to:today() },
  ];

  const applyPreset = (p) => { setFrom(p.from); setTo(p.to); setData(null); };

  const fetchData = async () => {
    if (!from || !to) return;
    if (from > to)    return setError('Start date must be before end date');
    setError(''); setLoading(true); setData(null);
    try {
      const res = await apiGet(`/full-report?from=${from}&to=${to}`);
      if (res.error) throw new Error(res.error);
      // Normalize field names in case backend returns different keys
      const normalized = {
        ...res,
        topFrames: (res.topFrames||[]).map(f=>({
          ...f,
          frame:   f.frame   || f.name   || f.frame_name || '—',
          units:   f.units   || f.count  || 0,
          revenue: f.revenue || f.total  || 0,
        })),
        topLenses: (res.topLenses||[]).map(l=>({
          ...l,
          lens_type: l.lens_type || l.type || l.name || '—',
          units:     l.units     || l.count || 0,
          revenue:   l.revenue   || l.total || 0,
        })),
      };
      setData(normalized);
      setPreviewing(true);
    } catch(e) { setError(e.message||'Failed to load report'); }
    finally { setLoading(false); }
  };

  const downloadPDF = () => {
    if (!data) return;
    const html = buildReportHTML(data, from, to);
    const win  = window.open('','_blank','width=900,height=1100');
    if (!win) { alert('Please allow popups to download PDF.'); return; }
    win.document.open(); win.document.write(html); win.document.close();
  };

  const s  = data?.summary || {};
  const o  = data?.orders  || {};
  const qs = data?.quickSales || {};
  const r  = data?.repairs || {};
  const ex = data?.expenses || {};

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>📄 Business Report</h1>
      <p style={{ fontSize:13, color:C.muted, margin:'4px 0 20px' }}>Select a date range to generate a full PDF report with all business data</p>

      {/* Date range picker */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:20 }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:14 }}>📅 Select Date Range</div>

        {/* Presets */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
          {presets.map(p=>(
            <button key={p.label} onClick={()=>applyPreset(p)}
              style={{ padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${from===p.from&&to===p.to?C.navy:C.border}`, background:from===p.from&&to===p.to?C.navy:'white', color:from===p.from&&to===p.to?'white':C.muted }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Date inputs */}
        <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>From</label>
            <input type="date" value={from} onChange={e=>{ setFrom(e.target.value); setData(null); }}
              style={{ padding:'10px 14px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy }}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>To</label>
            <input type="date" value={to} onChange={e=>{ setTo(e.target.value); setData(null); }}
              style={{ padding:'10px 14px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy }}/>
          </div>
          <button onClick={fetchData} disabled={loading}
            style={{ padding:'10px 24px', background:loading?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit' }}>
            {loading ? '⏳ Loading...' : '📊 Generate Report'}
          </button>
          {data && (
            <button onClick={downloadPDF}
              style={{ padding:'10px 24px', background:'#2563eb', color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:8 }}>
              ⬇️ Download PDF
            </button>
          )}
        </div>

        {error && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:9, padding:'10px 14px', fontSize:13, marginTop:12 }}>⚠️ {error}</div>}
      </div>

      {/* Preview */}
      {data && (
        <>
          {/* Summary KPI cards */}
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>
                Preview — {fmtDate(from)} to {fmtDate(to)}
              </div>
              <button onClick={downloadPDF}
                style={{ padding:'9px 22px', background:'#2563eb', color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:8 }}>
                ⬇️ Download Full PDF
              </button>
            </div>

            {/* Net profit banner */}
            <div style={{ background:parseFloat(s.netProfit)>=0?'#dcfce7':'#fee2e2', border:`2px solid ${parseFloat(s.netProfit)>=0?'#86efac':'#fca5a5'}`, borderRadius:12, padding:'16px 20px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:parseFloat(s.netProfit)>=0?C.success:C.danger, marginBottom:4 }}>Net Profit</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:700, color:parseFloat(s.netProfit)>=0?C.success:C.danger }}>{fmt(s.netProfit)}</div>
                <div style={{ fontSize:12, color:parseFloat(s.netProfit)>=0?C.success:C.danger, marginTop:3 }}>Net margin: {s.profitMargin}%</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:12, color:C.muted, marginBottom:2 }}>Revenue</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.navy, marginBottom:8 }}>{fmt(s.totalRevenue)}</div>
                <div style={{ fontSize:12, color:C.muted, marginBottom:2 }}>Expenses</div>
                <div style={{ fontSize:18, fontWeight:700, color:C.danger }}>{fmt(s.totalExpenses)}</div>
              </div>
            </div>

            {/* 8 KPI boxes */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:16 }}>
              {[
                { l:'Orders',         v:o.total_orders||0,    sub:`${fmt(o.revenue)} revenue`,      c:C.navy },
                { l:'Quick Sales',    v:qs.total_sales||0,    sub:`${fmt(qs.revenue)} revenue`,     c:'#2563eb' },
                { l:'Repairs',        v:r.total_repairs||0,   sub:`${fmt(r.revenue)} revenue`,      c:'#0891b2' },
                { l:'Expenses',       v:ex.total_expenses||0, sub:fmt(s.totalExpenses),              c:C.danger },
                { l:'Stock Purchased',v:fmt((data.dealerPurchases||data.stockPurchases||[]).reduce((s,r)=>s+parseFloat(r.total||0),0)), sub:`${(data.dealerPurchases||data.stockPurchases||[]).length} dealers`, c:C.danger },
                { l:'Cash Deposited', v:fmt(data.deposits?.total||0), sub:`${data.deposits?.count||0} deposits`, c:'#2563eb' },
                { l:'Collected',      v:fmt(o.collected||0),  sub:`${fmt(o.outstanding)} owed`,    c:C.success },
                { l:'Gross Profit',   v:fmt(s.grossProfit),   sub:`before expenses`,                c:C.success },
              ].map(k=>(
                <div key={k.l} style={{ background:C.cream, borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:4 }}>{k.l}</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:k.c }}>{k.v}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Profit formula */}
            <div style={{ background:C.cream, borderRadius:10, padding:'12px 16px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', fontSize:14 }}>
              <span style={{ color:C.success, fontWeight:700 }}>{fmt(s.totalRevenue)}</span>
              <span style={{ color:C.muted }}>revenue −</span>
              <span style={{ color:C.danger, fontWeight:700 }}>{fmt(parseFloat(s.totalRevenue)-parseFloat(s.grossProfit))}</span>
              <span style={{ color:C.muted }}>cost of goods −</span>
              <span style={{ color:'#f97316', fontWeight:700 }}>{fmt(s.totalExpenses)}</span>
              <span style={{ color:C.muted }}>expenses =</span>
              <span style={{ color:parseFloat(s.netProfit)>=0?C.success:C.danger, fontWeight:700, fontSize:16 }}>{fmt(s.netProfit)} net profit</span>
            </div>
          </div>

          {/* Quick breakdowns */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

            {/* Expenses by category */}
            {(data.expenses?.byCategory?.length || 0) > 0 && (
              <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:700, color:C.navy }}>💸 Expenses by Category</div>
                {(data.expenses?.byCategory || []).map(e=>{
                  const maxE = parseFloat((data.expenses?.byCategory||[])[0]?.total)||1;
                  return (
                    <div key={e.category} style={{ padding:'9px 16px', borderBottom:`1px solid ${C.cream}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:13 }}>
                        <span style={{ color:C.navy, fontWeight:500 }}>{e.category}</span>
                        <span style={{ color:C.danger, fontWeight:700 }}>{fmt(e.total)}</span>
                      </div>
                      <div style={{ height:4, background:C.cream, borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${parseFloat(e.total)/maxE*100}%`, background:C.danger, borderRadius:2 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Top frames */}
            {(data.topFrames||[]).length > 0 && (
              <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:700, color:C.navy }}>🕶️ Top Frames</div>
                {(data.topFrames||[]).slice(0,7).map((f,i)=>{
                  const fname = f.frame||f.name||f.frame_name||'—';
                  const frev  = f.revenue||f.total||0;
                  const funits= f.units||f.count||0;
                  return (
                    <div key={i} style={{ padding:'9px 16px', borderBottom:`1px solid ${C.cream}`, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ width:20, height:20, borderRadius:'50%', background:i===0?C.gold:i===1?'#c0c0c0':i===2?'#cd7f32':C.cream, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:i<3?'white':C.muted }}>{i+1}</span>
                        <span style={{ color:C.navy, fontWeight:500 }}>{fname}</span>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ color:C.success, fontWeight:700 }}>{fmt(frev)}</div>
                        <div style={{ fontSize:11, color:C.muted }}>{funits} sold</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <button onClick={downloadPDF}
              style={{ padding:'14px 36px', background:'#2563eb', color:'white', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:10 }}>
              ⬇️ Download Full PDF Report
            </button>
            <div style={{ fontSize:12, color:C.muted, marginTop:8 }}>
              Opens in new window → automatically prints/saves as PDF · Includes full order list, all tables, and charts
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:60, textAlign:'center', color:C.muted }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
          <div style={{ fontSize:16, fontWeight:600, color:C.navy, marginBottom:8 }}>Select a date range and click Generate Report</div>
          <div style={{ fontSize:13 }}>The report will include all orders, quick sales, repairs, expenses, stock purchases and profit analysis</div>
        </div>
      )}
    </div>
  );
}