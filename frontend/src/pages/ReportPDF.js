/* eslint-disable */
// ============================================================
//  ReportPDF.js — Full Business Report
//  Pick date range → see all data → download as PDF
// ============================================================
import React, { useState } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
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
  const s    = data.summary;
  const o    = data.orders;
  const qs   = data.quickSales;
  const rep  = data.repairs;
  const ex   = data.expenses;
  const dep  = data.deposits;
  const now  = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});

  const fmtR = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0,maximumFractionDigits:0});
  const totalStockSpend = data.stockPurchases.reduce((s,r)=>s+parseFloat(r.total||0),0);
  const totalStockCount = data.stockPurchases.reduce((s,r)=>s+parseInt(r.count||0),0);

  // Mini bar chart SVG for daily revenue
  const daily = data.daily || [];
  const maxDay = Math.max(...daily.map(d=>parseFloat(d.order_revenue||0)+parseFloat(d.qs_revenue||0)+parseFloat(d.repair_revenue||0)),1);
  const dayBars = daily.map((d,i) => {
    const total = parseFloat(d.order_revenue||0)+parseFloat(d.qs_revenue||0)+parseFloat(d.repair_revenue||0);
    const h = Math.max(2, Math.round(total/maxDay*50));
    const x = 4 + i * (550/Math.max(daily.length,1));
    const w = Math.max(2, 550/Math.max(daily.length,1)-2);
    return `<rect x="${x}" y="${54-h}" width="${w}" height="${h}" fill="#0f1f3d" rx="1" opacity="0.8"/>`;
  }).join('');

  const chartSVG = daily.length > 1 ? `
    <svg viewBox="0 0 560 60" style="width:100%;height:60px;display:block;">
      <line x1="0" y1="54" x2="560" y2="54" stroke="#e0ddd6" stroke-width="1"/>
      ${dayBars}
    </svg>` : '';

  // Expense category rows
  const expCatRows = data.expenses.byCategory.map(e=>`
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
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;">${(or.customer||'').slice(0,20)}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;">${(or.frame||'—').slice(0,18)}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;">${or.lens_type||'—'}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;text-align:right;">${fmtR(or.total_amount)}</td>
      <td style="padding:4px 8px;border:1px solid #e0ddd6;font-size:11px;text-align:center;">
        <span style="background:${or.status==='delivered'?'#dcfce7':'#dbeafe'};color:${or.status==='delivered'?'#2d7a4f':'#1e40af'};padding:1px 6px;border-radius:10px;font-size:10px;">${or.status}</span>
      </td>
    </tr>`).join('');

  // Top frames
  const frameRows = data.topFrames.slice(0,8).map((f,i)=>`
    <tr>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;">${i+1}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;">${f.frame}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:center;">${f.units}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:right;">${fmtR(f.revenue)}</td>
    </tr>`).join('');

  // Repair types
  const repairRows = rep.types.map(r=>`
    <tr>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;">${r.repair_type}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:center;">${r.count}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:right;">${fmtR(r.revenue)}</td>
    </tr>`).join('');

  // Dealer purchases
  const dealerRows = data.stockPurchases.map(d=>`
    <tr>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;">${d.dealer_name}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:center;">${d.count}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:right;font-weight:600;color:#c0392b;">${fmtR(d.total)}</td>
    </tr>`).join('');

  const profitColor = parseFloat(s.netProfit) >= 0 ? '#2d7a4f' : '#c0392b';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Wickramakalutota Opticals — Business Report ${from} to ${to}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f1f3d; font-size: 12px; line-height: 1.5; }
  h2 { font-size: 15px; font-weight: 700; color: #0f1f3d; margin: 18px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #c9a84c; }
  h3 { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .8px; margin: 14px 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
  th { background: #0f1f3d; color: white; padding: 6px 10px; text-align: left; font-size: 11px; font-weight: 600; }
  th.r { text-align: right; }
  th.c { text-align: center; }
  .page-break { page-break-before: always; }
  .grid4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 16px; }
  .grid3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 16px; }
  .grid2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; margin-bottom: 16px; }
  .kpi { border: 1px solid #e0ddd6; border-radius: 8px; padding: 10px 12px; }
  .kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #6b7280; margin-bottom: 4px; }
  .kpi-value { font-size: 18px; font-weight: 700; line-height: 1; }
  .kpi-sub { font-size: 10px; color: #6b7280; margin-top: 2px; }
  .dark { background: #0f1f3d; border-color: #0f1f3d; }
  .dark .kpi-label { color: #c9a84c; }
  .dark .kpi-value { color: white; }
  .dark .kpi-sub { color: #ede9e0; }
  .profit-box { background: ${parseFloat(s.netProfit)>=0?'#dcfce7':'#fee2e2'}; border: 2px solid ${parseFloat(s.netProfit)>=0?'#86efac':'#fca5a5'}; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
  .profit-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${profitColor}; margin-bottom: 4px; }
  .profit-value { font-size: 28px; font-weight: 700; color: ${profitColor}; }
  .formula { background: #f8f5ef; border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .formula span { font-weight: 700; }
  .f-rev { color: #2d7a4f; }
  .f-cog { color: #c0392b; }
  .f-exp { color: #f97316; }
  .f-net { color: ${profitColor}; font-size: 15px; }
  .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #0f1f3d; display: flex; justify-content: space-between; font-size: 10px; color: #6b7280; }
</style>
</head>
<body>

<!-- ══ COVER / HEADER ═════════════════════════════════════ -->
<div style="background:#0f1f3d;border-radius:12px;padding:20px 24px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start;">
  <div>
    <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:white;margin-bottom:4px;">👁️ Wickramakalutota Opticals</div>
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
    <div class="profit-label">Net Profit for period</div>
    <div class="profit-value">${fmtR(s.netProfit)}</div>
    <div style="font-size:11px;color:${profitColor};margin-top:3px;">Net margin: ${s.profitMargin}%</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:11px;color:${profitColor};margin-bottom:4px;">Revenue</div>
    <div style="font-size:17px;font-weight:700;color:${profitColor};">${fmtR(s.totalRevenue)}</div>
    <div style="font-size:10px;color:${profitColor};margin-top:6px;">Expenses</div>
    <div style="font-size:14px;font-weight:700;color:#c0392b;">${fmtR(s.totalExpenses)}</div>
  </div>
</div>

<!-- ══ PROFIT FORMULA ════════════════════════════════════ -->
<div class="formula">
  <span class="f-rev">${fmtR(s.totalRevenue)}</span>
  <span style="color:#6b7280;">revenue</span>
  <span style="color:#6b7280;">−</span>
  <span class="f-cog">${fmtR(s.grossProfit > 0 ? parseFloat(s.totalRevenue)-parseFloat(s.grossProfit) : 0)}</span>
  <span style="color:#6b7280;">cost of goods</span>
  <span style="color:#6b7280;">−</span>
  <span style="color:#f97316;font-weight:700;">${fmtR(s.totalExpenses)}</span>
  <span style="color:#6b7280;">expenses</span>
  <span style="color:#6b7280;">=</span>
  <span class="f-net">${fmtR(s.netProfit)}</span>
  <span style="color:${profitColor};">net profit</span>
</div>

<!-- ══ KPI GRID ════════════════════════════════════════════ -->
<div class="grid4">
  <div class="kpi dark"><div class="kpi-label">Total Revenue</div><div class="kpi-value">${fmtR(s.totalRevenue)}</div><div class="kpi-sub">Orders + Sales + Repairs</div></div>
  <div class="kpi"><div class="kpi-label">Orders Revenue</div><div class="kpi-value" style="color:#0f1f3d">${fmtR(o.revenue)}</div><div class="kpi-sub">${o.total_orders} orders</div></div>
  <div class="kpi"><div class="kpi-label">Quick Sales</div><div class="kpi-value" style="color:#2563eb">${fmtR(qs.revenue)}</div><div class="kpi-sub">${qs.total_sales} sales</div></div>
  <div class="kpi"><div class="kpi-label">Repair Revenue</div><div class="kpi-value" style="color:#0891b2">${fmtR(rep.revenue)}</div><div class="kpi-sub">${rep.total_repairs} repairs</div></div>
</div>

<div class="grid4">
  <div class="kpi"><div class="kpi-label">Total Expenses</div><div class="kpi-value" style="color:#c0392b">${fmtR(s.totalExpenses)}</div><div class="kpi-sub">${ex.total_expenses} transactions</div></div>
  <div class="kpi"><div class="kpi-label">Stock Purchased</div><div class="kpi-value" style="color:#c0392b">${fmtR(totalStockSpend)}</div><div class="kpi-sub">${totalStockCount} items from ${data.stockPurchases.length} dealer${data.stockPurchases.length!==1?'s':''}</div></div>
  <div class="kpi"><div class="kpi-label">Cash Deposited</div><div class="kpi-value" style="color:#2563eb">${fmtR(dep.total)}</div><div class="kpi-sub">${dep.count} deposits</div></div>
  <div class="kpi"><div class="kpi-label">Collected</div><div class="kpi-value" style="color:#2d7a4f">${fmtR(o.collected)}</div><div class="kpi-sub">${fmtR(o.outstanding)} still owed</div></div>
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
        <span style="background:${s.payment_method==='cash'?'#dcfce7':'#dbeafe'};color:${s.payment_method==='cash'?'#2d7a4f':'#1e40af'};padding:1px 6px;border-radius:10px;font-size:10px;">${s.payment_method}</span>
      </td>
    </tr>`;
  }).join('')}
  <tr style="background:#f8f5ef;font-weight:700;">
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
  <div class="kpi dark"><div class="kpi-label">Total Expenses</div><div class="kpi-value">${fmtR(s.totalExpenses)}</div></div>
  <div class="kpi"><div class="kpi-label">Cash Expenses</div><div class="kpi-value" style="color:#c0392b">${fmtR(ex.cash_expenses)}</div></div>
  <div class="kpi"><div class="kpi-label">Bank Expenses</div><div class="kpi-value" style="color:#c0392b">${fmtR(ex.bank_expenses)}</div></div>
</div>

${data.expenses.byCategory.length > 0 ? `
<h3>Expenses by Category</h3>
<table>
  <tr><th>Category</th><th class="c">Count</th><th class="r">Amount</th></tr>
  ${expCatRows}
  <tr style="background:#f8f5ef;font-weight:700;">
    <td style="padding:6px 10px;border:1px solid #e0ddd6;">TOTAL</td>
    <td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:center;">${ex.total_expenses}</td>
    <td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:right;color:#c0392b;">${fmtR(s.totalExpenses)}</td>
  </tr>
</table>` : ''}

<!-- ══ STOCK PURCHASES ════════════════════════════════════ -->
${data.stockPurchases.length > 0 ? `
<h2>Stock Purchases from Dealers</h2>
<table>
  <tr><th>Dealer</th><th class="c">Purchases</th><th class="r">Total Spent</th></tr>
  ${dealerRows}
  <tr style="background:#f8f5ef;font-weight:700;">
    <td style="padding:6px 10px;border:1px solid #e0ddd6;">TOTAL</td>
    <td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:center;">${totalStockCount}</td>
    <td style="padding:6px 10px;border:1px solid #e0ddd6;text-align:right;color:#c0392b;">${fmtR(totalStockSpend)}</td>
  </tr>
</table>` : ''}

<!-- ══ PAGE BREAK ════════════════════════════════════════ -->
<div class="page-break"></div>

<!-- ══ TOP PERFORMERS ═════════════════════════════════════ -->
<h2>Top Performing Frames</h2>
${data.topFrames.length > 0 ? `
<table>
  <tr><th>#</th><th>Frame</th><th class="c">Units Sold</th><th class="r">Revenue</th></tr>
  ${frameRows}
</table>` : '<p style="color:#6b7280;font-size:12px;">No order data for this period</p>'}

<h2>Lens Types</h2>
${data.topLenses.length > 0 ? `
<table>
  <tr><th>Lens Type</th><th class="c">Units</th><th class="r">Revenue</th></tr>
  ${data.topLenses.map(l=>`
    <tr>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;">${l.lens_type}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:center;">${l.units}</td>
      <td style="padding:5px 10px;border:1px solid #e0ddd6;text-align:right;">${fmtR(l.revenue)}</td>
    </tr>`).join('')}
</table>` : '<p style="color:#6b7280;font-size:12px;">No data for this period</p>'}

<!-- ══ LENS JOBS ══════════════════════════════════════════ -->
${data.lensJobs.length > 0 ? `
<h2>Lens Jobs by Lab</h2>
<table>
  <tr><th>Lab / Company</th><th class="c">Total Jobs</th><th class="c">Completed</th></tr>
  ${data.lensJobs.map(j=>`
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
    <td style="padding:8px 10px;border:1px solid #e0ddd6;text-align:right;font-weight:700;color:#c0392b;">− ${fmtR(s.totalExpenses)}</td>
    <td style="padding:8px 10px;border:1px solid #e0ddd6;text-align:right;color:#c0392b;">${s.totalRevenue>0?(parseFloat(s.totalExpenses)/parseFloat(s.totalRevenue)*100).toFixed(1)+'%':'—'}</td>
  </tr>
  <tr style="background:${parseFloat(s.netProfit)>=0?'#dcfce7':'#fee2e2'};">
    <td style="padding:10px 10px;border:1px solid #e0ddd6;font-weight:700;font-size:14px;">NET PROFIT</td>
    <td style="padding:10px 10px;border:1px solid #e0ddd6;text-align:right;font-weight:700;font-size:16px;color:${profitColor};">${fmtR(s.netProfit)}</td>
    <td style="padding:10px 10px;border:1px solid #e0ddd6;text-align:right;font-weight:700;font-size:14px;color:${profitColor};">${s.profitMargin}%</td>
  </tr>
</table>

<!-- ══ FOOTER ════════════════════════════════════════════ -->
<div class="footer">
  <div>Wickramakalutota Opticals · No.57 Kurunegala Road, Chilaw · Tel: 032 222 1211</div>
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
      setData(res);
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
                { l:'Stock Purchased',v:fmt(data.stockPurchases.reduce((s,r)=>s+parseFloat(r.total||0),0)), sub:`${data.stockPurchases.length} dealers`, c:C.danger },
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
            {data.expenses.byCategory.length > 0 && (
              <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:700, color:C.navy }}>💸 Expenses by Category</div>
                {data.expenses.byCategory.map(e=>{
                  const maxE = parseFloat(data.expenses.byCategory[0]?.total)||1;
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
            {data.topFrames.length > 0 && (
              <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:700, color:C.navy }}>🕶️ Top Frames</div>
                {data.topFrames.slice(0,7).map((f,i)=>(
                  <div key={f.frame} style={{ padding:'9px 16px', borderBottom:`1px solid ${C.cream}`, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:20, height:20, borderRadius:'50%', background:i===0?C.gold:i===1?'#c0c0c0':i===2?'#cd7f32':C.cream, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:i<3?'white':C.muted }}>{i+1}</span>
                      <span style={{ color:C.navy, fontWeight:500 }}>{f.frame}</span>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ color:C.success, fontWeight:700 }}>{fmt(f.revenue)}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{f.units} sold</div>
                    </div>
                  </div>
                ))}
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
