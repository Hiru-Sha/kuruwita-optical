/* eslint-disable */
// ============================================================
// PrintReceipt.jsx
// Kuruwita / Wickramakalutota Opticals
// Professional A5 Optical Bills
// A5 = 148mm × 210mm
// ============================================================

import React, { useState } from 'react';

// ============================================================
// SHOP DETAILS
// ============================================================

const SHOP_NAME = 'Wickramakalutota Opticals';
const SHOP_TAGLINE = 'Your Trusted Eye Care';
const SHOP_ADDRESS = 'No.57, Kurunegala Road, Chilaw';
const SHOP_PHONE_1 = '032 222 1211';
const SHOP_PHONE_2 = '077 194 1211';

// If you have a logo file, you can change this to:
// const LOGO = '/logo.png';
// Leave empty if you don't want a logo.
const LOGO = '';


// ============================================================
// HELPERS
// ============================================================

const fmt = (n) =>
  'Rs. ' +
  parseFloat(n || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtD = (d) => {
  if (!d) return '—';

  const s = String(d).slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, dy] = s.split('-');

    return new Date(
      Number(y),
      Number(m) - 1,
      Number(dy)
    ).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  const dt = new Date(d);

  if (isNaN(dt)) return '—';

  return dt.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const today = () =>
  new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const printCoating = (c) => {
  const map = {
    'Blue Cut': 'Blue Filter',
    'Photo Gray': 'Photochromic',
    'Blue Cut + Photo Gray':
      'Blue Filter + Photochromic',
    'Blue Cut + HMC':
      'Blue Filter + HMC',
    'Photo Gray + HMC':
      'Photochromic + HMC',
    'Blue Cut + Photo Gray + HMC':
      'Blue Filter + Photochromic + HMC',
  };

  return map[c] || c || '—';
};


// ============================================================
// PRINT CSS
// ============================================================

const PAGE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

@page {
  size: 148mm 210mm portrait;
  margin: 0;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  width: 148mm;
  height: 210mm;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', Arial, sans-serif;
  background: #ffffff;
  color: #172033;
  overflow: hidden;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

.page {
  width: 148mm;
  height: 210mm;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.content {
  flex: 1;
  overflow: hidden;
}

.body {
  padding: 4mm 6mm 3mm;
}


/* ============================================================
   HEADER
   ============================================================ */

.header {
  background: #102A56;
  color: #ffffff;
  padding: 4.5mm 6mm 3.5mm;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5mm;
}

.brand {
  display: flex;
  align-items: center;
  gap: 3mm;
}

.logo {
  width: 15mm;
  height: 15mm;
  object-fit: contain;
  background: #ffffff;
  border-radius: 50%;
  padding: 1mm;
}

.shop-name {
  font-size: 15pt;
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.3px;
}

.shop-tagline {
  margin-top: 1.5mm;
  font-size: 6.2pt;
  font-weight: 700;
  color: #BFD3F2;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.shop-address {
  margin-top: 2mm;
  font-size: 6.8pt;
  color: rgba(255,255,255,.86);
  line-height: 1.45;
}

.bill-side {
  text-align: right;
}

.bill-type {
  display: inline-block;
  background: #ffffff;
  color: #102A56;
  padding: 1.5mm 2.5mm;
  border-radius: 3px;
  font-size: 5.8pt;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.bill-number {
  margin-top: 1mm;
  font-size: 12pt;
  font-weight: 900;
}

.bill-date {
  margin-top: 1mm;
  font-size: 6pt;
  color: rgba(255,255,255,.72);
}

.blue-line {
  height: 1.5mm;
  background: #6E9BD7;
}


/* ============================================================
   LABELS
   ============================================================ */

.section-label {
  margin-bottom: 2mm;
  font-size: 6pt;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: #667085;
}


/* ============================================================
   CUSTOMER
   ============================================================ */

.customer-box {
  display: flex;
  justify-content: space-between;
  gap: 4mm;

  padding: 3mm 3.5mm;
  margin-bottom: 2.5mm;

  background: #F8FAFC;
  border: 1px solid #D9E0EA;
  border-radius: 5px;
}

.customer-main {
  flex: 1;
}

.field-label {
  font-size: 5.5pt;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .7px;
  color: #7A8494;
}

.field-value {
  margin-top: .7mm;
  font-size: 8.5pt;
  font-weight: 700;
  color: #102A56;
}

.field-value-large {
  margin-top: .7mm;
  font-size: 10pt;
  font-weight: 800;
  color: #102A56;
}

.customer-row {
  display: flex;
  gap: 8mm;
  margin-top: 2mm;
}


/* ============================================================
   FRAME / LENS
   ============================================================ */

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.5mm;
  margin-bottom: 2.5mm;
}

.detail-card {
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #D9E0EA;
  border-radius: 5px;
}

.detail-header {
  padding: 2.2mm 3mm;

  background: #102A56;
  color: #ffffff;

  font-size: 6pt;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.detail-body {
  min-height: 15mm;
  padding: 2.8mm 3mm;
}

.detail-main {
  font-size: 8.2pt;
  font-weight: 800;
  color: #172033;
  line-height: 1.3;
}

.detail-sub {
  margin-top: 1.5mm;
  font-size: 6.8pt;
  color: #667085;
  line-height: 1.4;
}


/* ============================================================
   DIVIDER
   ============================================================ */

.divider {
  border: none;
  border-top: 1px solid #E1E6ED;
  margin: 1.5mm 0 2.5mm;
}


/* ============================================================
   PRICE TABLE
   ============================================================ */

.price-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2.5mm;
}

.price-table td {
  padding: 1.6mm 2.5mm;
  font-size: 7.6pt;
}

.price-table td:last-child {
  text-align: right;
  font-weight: 700;
  white-space: nowrap;
}

.price-table .subtotal td {
  background: #F3F6FA;
  border-top: 1px solid #D9E0EA;
  border-bottom: 1px solid #D9E0EA;

  color: #344054;
  font-weight: 700;
}

.price-table .discount td {
  color: #667085;
  font-weight: 600;
}

.price-table .total-row td {
  padding: 3mm 2.8mm;

  background: #102A56;
  color: #ffffff;

  font-size: 10.5pt;
  font-weight: 900;
}

.price-table .paid-row td {
  background: #F8FAFC;
  color: #344054;
  font-weight: 700;

  border-bottom: 1px solid #D9E0EA;
}


/* ============================================================
   BIG TOTAL
   ============================================================ */

.big-total {
  display: grid;
  grid-template-columns: 1fr auto;

  margin: 1mm 0 2.5mm;

  overflow: hidden;

  border-radius: 6px;
  border: 1.5px solid #102A56;
}

.big-total-label {
  padding: 3mm 3.5mm;

  background: #102A56;
  color: #ffffff;

  font-size: 7pt;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.big-total-value {
  padding: 2.5mm 4mm;

  background: #102A56;
  color: #ffffff;

  font-size: 14pt;
  font-weight: 900;

  white-space: nowrap;
}


/* ============================================================
   PAYMENT
   ============================================================ */

.payment-card {
  overflow: hidden;

  margin-bottom: 2.5mm;

  border: 1px solid #D9E0EA;
  border-radius: 6px;
}

.payment-header {
  padding: 2mm 3mm;

  background: #F3F6FA;
  color: #102A56;

  font-size: 6pt;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1px;

  border-bottom: 1px solid #D9E0EA;
}

.payment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  padding: 2.2mm 3mm;

  border-bottom: 1px solid #E7EBF0;
}

.payment-row:last-child {
  border-bottom: none;
}

.payment-label {
  font-size: 7.4pt;
  color: #667085;
  font-weight: 600;
}

.payment-value {
  font-size: 9pt;
  color: #172033;
  font-weight: 800;
}

.payment-balance .payment-value {
  font-size: 10pt;
  color: #102A56;
}


/* ============================================================
   PAID IN FULL
   ============================================================ */

.paid-full {
  padding: 3mm;
  margin-bottom: 2.5mm;

  text-align: center;

  background: #F3FAF5;

  border: 1.5px solid #2F6B45;
  border-radius: 6px;
}

.paid-full-title {
  color: #245738;
  font-size: 8.5pt;
  font-weight: 900;
  letter-spacing: .5px;
}

.paid-full-amount {
  margin-top: 1mm;
  color: #102A56;
  font-size: 10pt;
  font-weight: 900;
}


/* ============================================================
   BALANCE DUE
   ============================================================ */

.balance-due {
  display: flex;
  justify-content: space-between;
  align-items: center;

  padding: 3mm;
  margin-bottom: 2.5mm;

  background: #FFF7F7;

  border: 1.5px solid #A53B3B;
  border-radius: 6px;
}

.balance-title {
  color: #8F2F2F;
  font-size: 6.8pt;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .8px;
}

.balance-amount {
  color: #8F2F2F;
  font-size: 11pt;
  font-weight: 900;
}


/* ============================================================
   GIFT
   ============================================================ */

.gift-box {
  padding: 2.5mm 3mm;
  margin-bottom: 2.5mm;

  background: #F8FAFD;

  border: 1px solid #C8D5E8;
  border-radius: 5px;
}

.gift-title {
  margin-bottom: 1.5mm;

  color: #102A56;

  font-size: 6pt;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.gift-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  padding: 1mm 0;
}

.gift-name {
  font-size: 7.5pt;
  font-weight: 700;
  color: #172033;
}

.gift-free {
  font-size: 6.5pt;
  font-weight: 900;
  color: #2F6B45;
  text-transform: uppercase;
}


/* ============================================================
   NOTE
   ============================================================ */

.note-box {
  padding: 2.2mm 3mm;
  margin-bottom: 2.5mm;

  background: #F8FAFC;

  border-left: 2px solid #6E9BD7;
  border-radius: 0 4px 4px 0;

  font-size: 6.7pt;
  color: #667085;
  line-height: 1.45;
}


/* ============================================================
   FOOTER
   ============================================================ */

.footer {
  flex-shrink: 0;

  display: flex;
  justify-content: space-between;
  align-items: center;

  padding: 2.5mm 6mm;

  background: #102A56;
}

.footer-main {
  color: #ffffff;
  font-size: 6.5pt;
  font-weight: 700;
}

.footer-date {
  color: rgba(255,255,255,.62);
  font-size: 5.8pt;
}


/* ============================================================
   QUICK SALE
   ============================================================ */

.item-table {
  width: 100%;
  border-collapse: collapse;
}

.item-table td {
  padding: 2mm 2.5mm;
  border-bottom: 1px solid #E7EBF0;
  font-size: 7.8pt;
}

.item-name {
  font-weight: 700;
  color: #172033;
}

.item-sub {
  margin-top: .7mm;
  font-size: 6.5pt;
  color: #7A8494;
}


/* ============================================================
   PRINT
   ============================================================ */

@media print {
  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
`;


// ============================================================
// HTML HEADER
// ============================================================

function buildHeader(type, billNo, date) {
  return `
    <div class="header">
      <div class="header-row">

        <div class="brand">

          ${
            LOGO
              ? `<img class="logo" src="${LOGO}" alt="Logo" />`
              : ''
          }

          <div>

            <div class="shop-name">
              ${SHOP_NAME}
            </div>

            <div class="shop-tagline">
              ${SHOP_TAGLINE}
            </div>

            <div class="shop-address">
              ${SHOP_ADDRESS}
              &nbsp; | &nbsp;
              ${SHOP_PHONE_1}
              &nbsp; | &nbsp;
              ${SHOP_PHONE_2}
            </div>

          </div>

        </div>

        <div class="bill-side">

          <div class="bill-type">
            ${type}
          </div>

          <div class="bill-number">
            ${billNo || '—'}
          </div>

          <div class="bill-date">
            ${date || today()}
          </div>

        </div>

      </div>
    </div>

    <div class="blue-line"></div>
  `;
}


// ============================================================
// FOOTER
// ============================================================

function buildFooter() {
  return `
    <div class="footer">

      <div class="footer-main">
        Thank you for choosing ${SHOP_NAME}
      </div>

      <div class="footer-date">
        Printed: ${today()}
      </div>

    </div>
  `;
}


// ============================================================
// WRAP HTML
// ============================================================

function wrap(content, type, billNo, date) {
  return `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8" />

<title>
  ${type} - ${billNo || ''}
</title>

<style>

${PAGE_CSS}

</style>

</head>

<body>

<div class="page">

  ${buildHeader(type, billNo, date)}

  <div class="content">

    ${content}

  </div>

  ${buildFooter()}

</div>

<script>

window.onload = function() {

  window.print();

  window.onafterprint = function() {
    window.close();
  };

};

<\/script>

</body>

</html>
`;
}


// ============================================================
// CUSTOMER SECTION
// ============================================================

function customerSection(order, rightSide = '') {
  return `
    <div class="customer-box">

      <div class="customer-main">

        <div class="field-label">
          Customer Name
        </div>

        <div class="field-value-large">
          ${order.customer_name || '—'}
        </div>

        <div class="customer-row">

          <div>
            <div class="field-label">
              Phone
            </div>

            <div class="field-value">
              ${order.phone || '—'}
            </div>
          </div>

          <div>
            <div class="field-label">
              Age
            </div>

            <div class="field-value">
              ${order.age ? `${order.age} yrs` : '—'}
            </div>
          </div>

        </div>

      </div>

      <div style="text-align:right;">
        ${rightSide}
      </div>

    </div>
  `;
}


// ============================================================
// FRAME + LENS
// ============================================================

function frameLensSection(order) {

  return `
    <div class="detail-grid">

      <!-- FRAME -->

      <div class="detail-card">

        <div class="detail-header">
          Frame
        </div>

        <div class="detail-body">

          <div class="detail-main">
            ${order.frame || '—'}
          </div>

          <div class="detail-sub">

            ${
              order.frame_type
                ? `Type: ${order.frame_type}`
                : ''
            }

            ${
              order.frame_color
                ? ` &nbsp; · &nbsp; Color: ${order.frame_color}`
                : ''
            }

            ${
              order.frame_size
                ? ` &nbsp; · &nbsp; Size: ${order.frame_size}`
                : ''
            }

          </div>

        </div>

      </div>


      <!-- LENS -->

      <div class="detail-card">

        <div class="detail-header">
          Lens
        </div>

        <div class="detail-body">

          <div class="detail-main">
            ${order.lens_type || '—'}
          </div>

          <div class="detail-sub">

            ${
              order.lens_coating
                ? printCoating(order.lens_coating)
                : ''
            }

            ${
              order.lens_index
                ? ` &nbsp; · &nbsp; Index: ${order.lens_index}`
                : ''
            }

          </div>

        </div>

      </div>

    </div>
  `;
}


// ============================================================
// PRICE SECTION
// ============================================================

function priceSection(order, options = {}) {

  const total = parseFloat(order.total_amount || 0);

  const framePrice =
    parseFloat(order.frame_sell_price || 0);

  const lensPrice =
    parseFloat(order.lens_sell_price || 0);

  const discount =
    parseFloat(order.discount_amount || 0);

  const discountPercent =
    parseFloat(order.discount_percent || 0);

  const subtotal =
    framePrice + lensPrice;

  const hasDiscount =
    discount > 0 || discountPercent > 0;

  const actualDiscount =
    discount > 0
      ? discount
      : Math.round(
          subtotal * discountPercent / 100
        );

  return `
    <table class="price-table">

      ${
        framePrice > 0 &&
        options.showFrame !== false
          ? `
            <tr>
              <td>
                Frame Price
              </td>

              <td>
                ${fmt(framePrice)}
              </td>
            </tr>
          `
          : ''
      }


      ${
        lensPrice > 0 &&
        options.showLens !== false
          ? `
            <tr>
              <td>
                Lens Price
              </td>

              <td>
                ${fmt(lensPrice)}
              </td>
            </tr>
          `
          : ''
      }


      ${
        hasDiscount && subtotal > 0
          ? `
            <tr class="subtotal">

              <td>
                Subtotal
              </td>

              <td>
                ${fmt(subtotal)}
              </td>

            </tr>
          `
          : ''
      }


      ${
        hasDiscount
          ? `
            <tr class="discount">

              <td>
                Discount
                ${
                  discountPercent > 0
                    ? ` (${discountPercent}%)`
                    : ''
                }
              </td>

              <td>
                - ${fmt(actualDiscount)}
              </td>

            </tr>
          `
          : ''
      }


      <tr class="total-row">

        <td>
          TOTAL PAYABLE
        </td>

        <td>
          ${fmt(total)}
        </td>

      </tr>

    </table>
  `;
}


// ============================================================
// BIG TOTAL
// ============================================================

function bigTotal(label, amount) {

  return `
    <div class="big-total">

      <div class="big-total-label">
        ${label}
      </div>

      <div class="big-total-value">
        ${fmt(amount)}
      </div>

    </div>
  `;
}


// ============================================================
// PAYMENT SUMMARY
// ============================================================

function paymentSummary(order) {

  const advance =
    parseFloat(order.advance_amount || 0);

  const balance =
    parseFloat(order.balance_amount || 0);

  return `
    <div class="payment-card">

      <div class="payment-header">
        Payment Summary
      </div>

      <div class="payment-row">

        <span class="payment-label">
          Advance Paid
        </span>

        <span class="payment-value">
          ${fmt(advance)}
        </span>

      </div>

      <div class="payment-row payment-balance">

        <span class="payment-label">
          Balance Due
        </span>

        <span class="payment-value">
          ${fmt(balance)}
        </span>

      </div>

    </div>
  `;
}


// ============================================================
// PAID IN FULL
// ============================================================

function paidFull(total) {

  return `
    <div class="paid-full">

      <div class="paid-full-title">
        ✓ PAID IN FULL
      </div>

      <div class="paid-full-amount">
        Total Paid: ${fmt(total)}
      </div>

    </div>
  `;
}


// ============================================================
// BALANCE DUE
// ============================================================

function balanceDue(balance) {

  return `
    <div class="balance-due">

      <div class="balance-title">
        Balance Due on Collection
      </div>

      <div class="balance-amount">
        ${fmt(balance)}
      </div>

    </div>
  `;
}


// ============================================================
// GIFTS
// ============================================================

function giftSection(gifts = []) {

  const validGifts =
    gifts.filter(
      (g) => g && g.name
    );

  if (!validGifts.length) {
    return '';
  }

  return `
    <div class="gift-box">

      <div class="gift-title">
        Complimentary Gift
      </div>

      ${validGifts
        .map(
          (gift) => `
            <div class="gift-row">

              <span class="gift-name">
                ${gift.name}
              </span>

              <span class="gift-free">
                FREE
              </span>

            </div>
          `
        )
        .join('')}

    </div>
  `;
}


// ============================================================
// SINGLE BILL
// ============================================================

function buildSingleBill(order) {

  const total =
    parseFloat(order.total_amount || 0);

  const advance =
    parseFloat(order.advance_amount || 0);

  const balance =
    parseFloat(order.balance_amount || 0);

  const orderDate =
    order.created_at
      ? fmtD(order.created_at)
      : today();

  const gifts =
    order.bill_gifts || [];

  const body = `

    <div class="body">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:2.5mm;
      ">

        <div class="section-label">
          Order Information
        </div>

        <div style="
          font-size:6.8pt;
          color:#667085;
          font-weight:600;
        ">

          Order Date:
          ${orderDate}

          ${
            order.deliver_date
              ? ` &nbsp; · &nbsp; Ready: ${fmtD(order.deliver_date)}`
              : ''
          }

        </div>

      </div>


      ${customerSection(
        order,
        `
          ${
            order.warranty_frame
              ? `
                <div class="field-label">
                  Frame Warranty
                </div>

                <div class="field-value"
                  style="color:#2F6B45;">
                  ${order.warranty_frame}
                </div>
              `
              : ''
          }

          ${
            order.warranty_lens
              ? `
                <div style="margin-top:2mm;">
                  <div class="field-label">
                    Lens Warranty
                  </div>

                  <div class="field-value"
                    style="color:#2F6B45;">
                    ${order.warranty_lens}
                  </div>
                </div>
              `
              : ''
          }
        `
      )}


      ${frameLensSection(order)}


      <hr class="divider" />


      ${priceSection(order)}


      ${paymentSummary(order)}


      ${
        balance <= 0
          ? paidFull(total)
          : balanceDue(balance)
      }


      ${giftSection(gifts)}


      <div class="note-box">

        Please keep this receipt as proof of payment
        and bring it when collecting your spectacles.

      </div>

    </div>
  `;

  return wrap(
    body,
    'Order Receipt',
    order.order_number,
    `Date: ${orderDate}`
  );
}


// ============================================================
// ADVANCE BILL
// ============================================================

function buildAdvanceBill(order) {

  const total =
    parseFloat(order.total_amount || 0);

  const advance =
    parseFloat(order.advance_amount || 0);

  const balance =
    parseFloat(order.balance_amount || 0);

  const orderDate =
    order.created_at
      ? fmtD(order.created_at)
      : today();

  const gifts =
    order.bill_gifts || [];

  const body = `

    <div class="body">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:2.5mm;
      ">

        <div style="
          display:inline-block;
          background:#F3F6FA;
          color:#102A56;
          border:1px solid #BFCBDD;
          border-radius:4px;
          padding:2mm 3mm;
          font-size:6.5pt;
          font-weight:900;
          letter-spacing:.8px;
        ">
          ADVANCE RECEIPT
        </div>

        <div style="
          font-size:6.8pt;
          color:#667085;
          font-weight:600;
        ">
          Order Date: ${orderDate}
        </div>

      </div>


      ${customerSection(
        order,
        `
          <div class="field-label">
            Collection Date
          </div>

          <div class="field-value">
            ${fmtD(order.deliver_date)}
          </div>
        `
      )}


      ${frameLensSection(order)}


      <hr class="divider" />


      ${priceSection(order)}


      <div class="payment-card">

        <div class="payment-header">
          Payment Summary
        </div>

        <div class="payment-row">

          <span class="payment-label">
            Total Payable
          </span>

          <span class="payment-value">
            ${fmt(total)}
          </span>

        </div>

        <div class="payment-row">

          <span class="payment-label">
            Advance Paid Now
          </span>

          <span class="payment-value">
            ${fmt(advance)}
          </span>

        </div>

      </div>


      ${bigTotal(
        'BALANCE DUE ON COLLECTION',
        balance
      )}


      ${giftSection(gifts)}


      <div class="note-box">

        Please bring this receipt when collecting
        your spectacles. The amount shown above
        is the remaining balance.

      </div>

    </div>
  `;

  return wrap(
    body,
    'Advance Receipt',
    order.order_number,
    `Date: ${orderDate}`
  );
}


// ============================================================
// FINAL / BALANCE BILL
// ============================================================

function buildBalanceBill(order) {

  const total =
    parseFloat(order.total_amount || 0);

  const advance =
    parseFloat(order.advance_amount || 0);

  const balance =
    parseFloat(order.balance_amount || 0);

  const orderDate =
    order.created_at
      ? fmtD(order.created_at)
      : today();

  const gifts =
    order.bill_gifts || [];

  const body = `

    <div class="body">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:2.5mm;
      ">

        <div style="
          display:inline-block;
          background:#F3FAF5;
          color:#245738;
          border:1px solid #A9CFB6;
          border-radius:4px;
          padding:2mm 3mm;
          font-size:6.5pt;
          font-weight:900;
          letter-spacing:.8px;
        ">
          FINAL RECEIPT
        </div>

        <div style="
          font-size:6.8pt;
          color:#667085;
          font-weight:600;
        ">
          Collected: ${today()}
        </div>

      </div>


      ${customerSection(
        order,
        `
          <div class="field-label">
            Order Date
          </div>

          <div class="field-value">
            ${orderDate}
          </div>

          <div style="margin-top:2mm;">
            <div class="field-label">
              Collection Date
            </div>

            <div class="field-value">
              ${today()}
            </div>
          </div>
        `
      )}


      ${frameLensSection(order)}


      <hr class="divider" />


      ${priceSection(order)}


      <div class="payment-card">

        <div class="payment-header">
          Payment Details
        </div>

        ${
          advance > 0
            ? `
              <div class="payment-row">

                <span class="payment-label">
                  Advance Already Paid
                </span>

                <span class="payment-value">
                  ${fmt(advance)}
                </span>

              </div>
            `
            : ''
        }


        <div class="payment-row">

          <span class="payment-label">
            Balance Paid Today
          </span>

          <span class="payment-value">
            ${fmt(balance)}
          </span>

        </div>

      </div>


      ${bigTotal(
        'TOTAL PAID',
        total
      )}


      ${paidFull(total)}


      ${giftSection(gifts)}


      <div class="note-box">

        Thank you for choosing
        ${SHOP_NAME}.
        Please keep this receipt as proof of payment.

      </div>

    </div>
  `;

  return wrap(
    body,
    'Final Receipt',
    order.order_number,
    `Collected: ${today()}`
  );
}


// ============================================================
// QUICK SALE BILL
// ============================================================

function buildQuickSaleBill(
  sale,
  items = []
) {

  const subtotal =
    parseFloat(
      sale.subtotal || 0
    );

  const discount =
    parseFloat(
      sale.discount || 0
    );

  const total =
    parseFloat(
      sale.total || 0
    );

  const paid =
    parseFloat(
      sale.amount_paid || 0
    );

  const change =
    parseFloat(
      sale.change_given || 0
    );

  const saleDate =
    sale.created_at
      ? fmtD(sale.created_at)
      : today();

  const paymentMethod =
    String(
      sale.payment_method || 'cash'
    ).toLowerCase();

  let paymentLabel = 'Cash';

  if (
    paymentMethod === 'card'
  ) {
    paymentLabel = 'Card';
  }

  if (
    paymentMethod === 'bank' ||
    paymentMethod === 'transfer'
  ) {
    paymentLabel = 'Bank Transfer';
  }

  if (
    paymentMethod === 'qr'
  ) {
    paymentLabel = 'QR Payment';
  }


  const itemRows =
    items
      .map((item) => {

        const unitPrice =
          parseFloat(
            item.price ||
            item.unit_price ||
            0
          );

        const qty =
          parseInt(item.qty) || 1;

        const itemDiscount =
          parseFloat(
            item.item_discount || 0
          );

        const gross =
          unitPrice * qty;

        const lineTotal =
          gross - itemDiscount;

        return `

          <tr>

            <td>

              <div class="item-name">
                ${item.name || 'Item'}
              </div>

              <div class="item-sub">
                ${fmt(unitPrice)} × ${qty}
              </div>

            </td>

            <td style="
              text-align:right;
              vertical-align:top;
            ">

              ${
                itemDiscount > 0
                  ? `
                    <div style="
                      font-size:6.5pt;
                      color:#98A2B3;
                      text-decoration:line-through;
                    ">
                      ${fmt(gross)}
                    </div>
                  `
                  : ''
              }

              <div style="
                font-size:8pt;
                font-weight:800;
                color:#172033;
              ">
                ${fmt(lineTotal)}
              </div>

            </td>

          </tr>

        `;
      })
      .join('');


  const body = `

    <div class="body">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:2.5mm;
      ">

        <div style="
          background:#F3FAF5;
          color:#245738;
          border:1px solid #A9CFB6;
          border-radius:4px;
          padding:2mm 3mm;
          font-size:6.5pt;
          font-weight:900;
          letter-spacing:.8px;
        ">
          SALES RECEIPT
        </div>

        <div style="
          font-size:6.8pt;
          color:#667085;
          font-weight:600;
        ">
          Date: ${saleDate}
        </div>

      </div>


      <div class="customer-box">

        <div>

          <div class="field-label">
            Customer
          </div>

          <div class="field-value-large">
            ${sale.customer_name || 'Walk-in Customer'}
          </div>

        </div>


        <div>

          <div class="field-label">
            Payment
          </div>

          <div class="field-value">
            ${paymentLabel}
          </div>

        </div>

      </div>


      <div class="detail-card"
        style="margin-bottom:2.5mm;">

        <div class="detail-header">
          Items Sold
        </div>

        <table class="item-table">

          ${itemRows}

        </table>

      </div>


      <table class="price-table">

        ${
          discount > 0
            ? `
              <tr>

                <td>
                  Subtotal
                </td>

                <td>
                  ${fmt(
                    subtotal ||
                    total + discount
                  )}
                </td>

              </tr>

              <tr class="discount">

                <td>
                  Discount
                </td>

                <td>
                  - ${fmt(discount)}
                </td>

              </tr>
            `
            : ''
        }


        <tr class="total-row">

          <td>
            TOTAL PAYABLE
          </td>

          <td>
            ${fmt(total)}
          </td>

        </tr>

      </table>


      ${bigTotal(
        'TOTAL PAID',
        paid
      )}


      ${
        change > 0
          ? `
            <div class="payment-card">

              <div class="payment-row">

                <span class="payment-label">
                  Change Returned
                </span>

                <span class="payment-value">
                  ${fmt(change)}
                </span>

              </div>

            </div>
          `
          : ''
      }


      ${giftSection(
        sale.bill_gifts || []
      )}


      <div class="note-box">

        Thank you for your purchase.
        Please keep this receipt for your records.

      </div>

    </div>

  `;

  return wrap(
    body,
    'Sales Receipt',
    sale.sale_number || 'QS',
    `Date: ${saleDate}`
  );
}


// ============================================================
// REPAIR BILL
// ============================================================

function buildRepairBill(repair) {

  const charge =
    parseFloat(
      repair.charge || 0
    );

  const advance =
    parseFloat(
      repair.advance || 0
    );

  const balance =
    Math.max(
      0,
      charge - advance
    );

  const repairDate =
    repair.created_at
      ? fmtD(repair.created_at)
      : today();

  const isPaid =
    balance === 0 ||
    repair.status === 'collected';

  let statusLabel = 'IN PROGRESS';

  if (isPaid) {
    statusLabel = 'COLLECTED';
  } else if (
    repair.status === 'done'
  ) {
    statusLabel = 'READY FOR COLLECTION';
  }

  const description =
    repair.frame_description ||
    repair.description ||
    '';


  const body = `

    <div class="body">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:2.5mm;
      ">

        <div style="
          background:${
            isPaid
              ? '#F3FAF5'
              : '#F3F6FA'
          };

          color:${
            isPaid
              ? '#245738'
              : '#102A56'
          };

          border:1px solid ${
            isPaid
              ? '#A9CFB6'
              : '#BFCBDD'
          };

          border-radius:4px;

          padding:2mm 3mm;

          font-size:6.5pt;

          font-weight:900;

          letter-spacing:.8px;
        ">
          ${statusLabel}
        </div>


        <div style="
          font-size:6.8pt;
          color:#667085;
          font-weight:600;
        ">
          Date: ${repairDate}
        </div>

      </div>


      <div class="customer-box">

        <div>

          <div class="field-label">
            Customer Name
          </div>

          <div class="field-value-large">
            ${repair.customer_name || '—'}
          </div>

        </div>


        <div>

          <div class="field-label">
            Phone
          </div>

          <div class="field-value">
            ${repair.phone || '—'}
          </div>

        </div>


        <div>

          <div class="field-label">
            Ref No.
          </div>

          <div class="field-value">
            ${repair.repair_number || '—'}
          </div>

        </div>

      </div>


      <div class="detail-card"
        style="margin-bottom:2.5mm;">

        <div class="detail-header">
          Repair Details
        </div>

        <div class="detail-body">

          <div class="detail-main">
            ${repair.repair_type || 'General Repair'}
          </div>

          ${
            description
              ? `
                <div class="detail-sub">
                  ${description}
                </div>
              `
              : ''
          }

          ${
            repair.due_date
              ? `
                <div class="detail-sub">
                  Due: ${fmtD(repair.due_date)}
                </div>
              `
              : ''
          }

        </div>

      </div>


      <table class="price-table">

        <tr>

          <td>
            Repair Charge
          </td>

          <td>
            ${
              charge > 0
                ? fmt(charge)
                : 'Free'
            }
          </td>

        </tr>


        ${
          advance > 0
            ? `
              <tr class="paid-row">

                <td>
                  Advance Paid
                </td>

                <td>
                  ${fmt(advance)}
                </td>

              </tr>
            `
            : ''
        }


        ${
          balance > 0
            ? `
              <tr class="total-row">

                <td>
                  BALANCE DUE
                </td>

                <td>
                  ${fmt(balance)}
                </td>

              </tr>
            `
            : `
              <tr class="total-row">

                <td>
                  TOTAL PAID
                </td>

                <td>
                  ${fmt(charge)}
                </td>

              </tr>
            `
        }

      </table>


      ${
        balance > 0
          ? balanceDue(balance)
          : paidFull(charge)
      }


      <div class="note-box">

        Please bring this receipt when collecting
        your repaired item.

      </div>

    </div>

  `;

  return wrap(
    body,
    'Repair Receipt',
    repair.repair_number || 'REP',
    `Date: ${repairDate}`
  );
}


// ============================================================
// LAB JOB CARD
// ============================================================

function buildLabCardHTML(order) {

  const ref =
    order.refraction ||
    order.prescription ||
    {};

  const pd =
    order.pd ||
    order.pd_value ||
    '—';

  const seg =
    order.seg_height ||
    order.segment_height ||
    '—';

  const lensCoat =
    order.lens_coating
      ? printCoating(order.lens_coating)
      : '—';

  const orderDate =
    order.created_at
      ? fmtD(order.created_at)
      : today();


  const eyeRow = (
    eye,
    sph,
    cyl,
    axis,
    add
  ) => `
    <tr>

      <td style="
        padding:3px;
        border:1px solid #D9E0EA;
        font-size:8pt;
        font-weight:900;
      ">
        ${eye}
      </td>

      <td style="
        padding:3px;
        border:1px solid #D9E0EA;
        text-align:center;
        font-size:8pt;
      ">
        ${sph || '—'}
      </td>

      <td style="
        padding:3px;
        border:1px solid #D9E0EA;
        text-align:center;
        font-size:8pt;
      ">
        ${cyl || '—'}
      </td>

      <td style="
        padding:3px;
        border:1px solid #D9E0EA;
        text-align:center;
        font-size:8pt;
      ">
        ${axis || '—'}
      </td>

      <td style="
        padding:3px;
        border:1px solid #D9E0EA;
        text-align:center;
        font-size:8pt;
      ">
        ${add || '—'}
      </td>

    </tr>
  `;


  const body = `

    <div class="body">

      <div style="
        display:flex;
        justify-content:space-between;
        margin-bottom:2.5mm;
      ">

        <div>

          <div class="section-label">
            LAB JOB CARD
          </div>

          <div style="
            font-size:11pt;
            font-weight:900;
            color:#102A56;
          ">
            ${order.order_number || '—'}
          </div>

        </div>


        <div style="
          text-align:right;
          font-size:6.8pt;
          color:#667085;
        ">

          ${orderDate}

          ${
            order.deliver_date
              ? `<br/>Due: ${fmtD(order.deliver_date)}`
              : ''
          }

        </div>

      </div>


      <div class="customer-box">

        <div>

          <div class="field-label">
            Patient
          </div>

          <div class="field-value-large">
            ${order.customer_name || '—'}
          </div>

        </div>


        <div>

          <div class="field-label">
            Phone
          </div>

          <div class="field-value">
            ${order.phone || '—'}
          </div>

        </div>

      </div>


      ${frameLensSection(order)}


      <div class="detail-card"
        style="margin-bottom:2.5mm;">

        <div class="detail-header">
          Prescription / Rx
        </div>

        <table style="
          width:100%;
          border-collapse:collapse;
        ">

          <tr>

            <th style="
              padding:2mm;
              background:#F3F6FA;
              border:1px solid #D9E0EA;
              font-size:6.5pt;
            ">
              EYE
            </th>

            <th style="
              padding:2mm;
              background:#F3F6FA;
              border:1px solid #D9E0EA;
              font-size:6.5pt;
            ">
              SPH
            </th>

            <th style="
              padding:2mm;
              background:#F3F6FA;
              border:1px solid #D9E0EA;
              font-size:6.5pt;
            ">
              CYL
            </th>

            <th style="
              padding:2mm;
              background:#F3F6FA;
              border:1px solid #D9E0EA;
              font-size:6.5pt;
            ">
              AXIS
            </th>

            <th style="
              padding:2mm;
              background:#F3F6FA;
              border:1px solid #D9E0EA;
              font-size:6.5pt;
            ">
              ADD
            </th>

          </tr>

          ${eyeRow(
            'R',
            ref.r_sph,
            ref.r_cyl,
            ref.r_axis,
            ref.r_add
          )}

          ${eyeRow(
            'L',
            ref.l_sph,
            ref.l_cyl,
            ref.l_axis,
            ref.l_add
          )}

        </table>

      </div>


      <div class="detail-card"
        style="margin-bottom:2.5mm;">

        <div class="detail-header">
          Measurements
        </div>

        <div style="
          display:grid;
          grid-template-columns:1fr 1fr 1fr;
        ">

          <div style="
            padding:3mm;
            text-align:center;
            border-right:1px solid #D9E0EA;
          ">

            <div class="field-label">
              PD
            </div>

            <div class="field-value">
              ${pd}
            </div>

          </div>


          <div style="
            padding:3mm;
            text-align:center;
            border-right:1px solid #D9E0EA;
          ">

            <div class="field-label">
              Seg Height
            </div>

            <div class="field-value">
              ${seg}
            </div>

          </div>


          <div style="
            padding:3mm;
            text-align:center;
          ">

            <div class="field-label">
              Lens Size
            </div>

            <div class="field-value">
              ${order.frame_size || '—'}
            </div>

          </div>

        </div>

      </div>


      <div class="detail-card">

        <div class="detail-header">
          Lab Instructions
        </div>

        <div style="
          padding:3mm;
          min-height:20mm;
          font-size:7.5pt;
          line-height:1.5;
          color:#172033;
        ">

          ${
            order.special_instructions ||
            order.lab_notes ||
            order.notes ||
            'No special instructions.'
          }

        </div>

      </div>


    </div>

  `;


  return wrap(
    body,
    'Lab Job Card',
    order.order_number,
    `Date: ${orderDate}`
  );
}


// ============================================================
// OPEN PRINT WINDOW
// ============================================================

function openPrint(html) {

  const win =
    window.open(
      '',
      '_blank',
      'width=700,height=900'
    );

  if (!win) {

    alert(
      'Please allow popups to print.'
    );

    return;
  }

  win.document.open();

  win.document.write(html);

  win.document.close();
}


// ============================================================
// COLORS USED BY PRINT MODAL
// ============================================================

const C = {

  navy: '#102A56',

  blue: '#6E9BD7',

  light: '#F3F6FA',

  border: '#D9E0EA',

  muted: '#667085',

  green: '#2F6B45',

};


// ============================================================
// MAIN PRINT RECEIPT COMPONENT
// ============================================================

export default function PrintReceipt({
  order,
  onClose,
}) {

  const [tab, setTab] =
    useState('advance');


  const TABS = [

    {
      key: 'single',
      label: '📋 Single Bill',
      desc:
        'Complete order receipt with total payable and payment status.',
    },

    {
      key: 'advance',
      label: '🧾 Advance Bill',
      desc:
        'A5 portrait receipt showing total payable, advance paid and balance due.',
    },

    {
      key: 'balance',
      label: '✅ Final Bill',
      desc:
        'Final A5 receipt showing total paid and zero balance.',
    },

    {
      key: 'lab',
      label: '🔬 Lab Card',
      desc:
        'Lab job card containing frame, lens, Rx and measurements.',
    },

  ];


  const currentTab =
    TABS.find(
      (t) => t.key === tab
    );


  return (

    <div

      style={{

        position: 'fixed',

        inset: 0,

        background:
          'rgba(16,42,86,.68)',

        zIndex: 1000,

        display: 'flex',

        alignItems: 'center',

        justifyContent: 'center',

        padding: 16,

        fontFamily:
          "'Inter', Arial, sans-serif",

      }}

      onClick={(e) => {

        if (
          e.target ===
          e.currentTarget
        ) {
          onClose();
        }

      }}

    >

      <div

        style={{

          background: '#ffffff',

          borderRadius: 16,

          width: '100%',

          maxWidth: 480,

          overflow: 'hidden',

          boxShadow:
            '0 24px 80px rgba(0,0,0,.35)',

        }}

      >

        {/* ==================================================
            MODAL HEADER
            ================================================== */}

        <div

          style={{

            background: C.navy,

            padding: '17px 20px',

            display: 'flex',

            justifyContent:
              'space-between',

            alignItems: 'center',

          }}

        >

          <div>

            <div

              style={{

                color: '#ffffff',

                fontWeight: 800,

                fontSize: 16,

              }}

            >

              🖨️ Print Bill

            </div>


            <div

              style={{

                color: '#BFD3F2',

                fontSize: 12,

                marginTop: 3,

              }}

            >

              {order.order_number}

              {' · '}

              {order.customer_name}

            </div>

          </div>


          <button

            onClick={onClose}

            style={{

              background:
                'rgba(255,255,255,.14)',

              border: 'none',

              color: '#ffffff',

              borderRadius: 8,

              padding: '7px 12px',

              cursor: 'pointer',

              fontSize: 14,

            }}

          >

            ✕

          </button>

        </div>


        {/* ==================================================
            TABS
            ================================================== */}

        <div

          style={{

            display: 'flex',

            borderBottom:
              `1px solid ${C.border}`,

          }}

        >

          {TABS.map((t) => (

            <button

              key={t.key}

              onClick={() =>
                setTab(t.key)
              }

              style={{

                flex: 1,

                padding:
                  '11px 5px',

                fontSize: 10.5,

                fontWeight: 700,

                cursor: 'pointer',

                background: 'none',

                border: 'none',

                color:
                  tab === t.key
                    ? C.navy
                    : C.muted,

                borderBottom:
                  `2.5px solid ${
                    tab === t.key
                      ? C.blue
                      : 'transparent'
                  }`,

                marginBottom: -1,

              }}

            >

              {t.label}

            </button>

          ))}

        </div>


        {/* ==================================================
            MODAL BODY
            ================================================== */}

        <div

          style={{

            padding:
              '18px 20px',

          }}

        >

          {/* DESCRIPTION */}

          <div

            style={{

              background: C.light,

              borderRadius: 10,

              padding:
                '11px 14px',

              marginBottom: 14,

              fontSize: 12,

              lineHeight: 1.45,

              color: C.muted,

            }}

          >

            {currentTab?.desc}

          </div>


          {/* ==================================================
              ORDER SUMMARY
              ================================================== */}

          <div

            style={{

              display: 'grid',

              gridTemplateColumns:
                '1fr 1fr',

              gap: 8,

              marginBottom: 16,

            }}

          >

            {/* TOTAL */}

            <div

              style={{

                background: '#F8FAFC',

                border:
                  `1px solid ${C.border}`,

                borderRadius: 8,

                padding:
                  '9px 10px',

              }}

            >

              <div

                style={{

                  fontSize: 9,

                  fontWeight: 800,

                  textTransform:
                    'uppercase',

                  color: C.muted,

                  marginBottom: 3,

                }}

              >

                Total

              </div>


              <div

                style={{

                  fontSize: 13,

                  fontWeight: 800,

                  color: C.navy,

                }}

              >

                {fmt(
                  order.total_amount
                )}

              </div>

            </div>


            {/* ADVANCE */}

            <div

              style={{

                background: '#F8FAFC',

                border:
                  `1px solid ${C.border}`,

                borderRadius: 8,

                padding:
                  '9px 10px',

              }}

            >

              <div

                style={{

                  fontSize: 9,

                  fontWeight: 800,

                  textTransform:
                    'uppercase',

                  color: C.muted,

                  marginBottom: 3,

                }}

              >

                Advance

              </div>


              <div

                style={{

                  fontSize: 13,

                  fontWeight: 800,

                  color: C.navy,

                }}

              >

                {fmt(
                  order.advance_amount
                )}

              </div>

            </div>


            {/* BALANCE */}

            <div

              style={{

                background:
                  parseFloat(
                    order.balance_amount || 0
                  ) > 0
                    ? '#FFF7F7'
                    : '#F3FAF5',

                border:
                  parseFloat(
                    order.balance_amount || 0
                  ) > 0
                    ? '1px solid #E4B8B8'
                    : '1px solid #A9CFB6',

                borderRadius: 8,

                padding:
                  '9px 10px',

              }}

            >

              <div

                style={{

                  fontSize: 9,

                  fontWeight: 800,

                  textTransform:
                    'uppercase',

                  color:
                    parseFloat(
                      order.balance_amount || 0
                    ) > 0
                      ? '#8F2F2F'
                      : C.green,

                  marginBottom: 3,

                }}

              >

                Balance

              </div>


              <div

                style={{

                  fontSize: 13,

                  fontWeight: 800,

                  color:
                    parseFloat(
                      order.balance_amount || 0
                    ) > 0
                      ? '#8F2F2F'
                      : C.green,

                }}

              >

                {fmt(
                  order.balance_amount
                )}

              </div>

            </div>


            {/* DELIVERY */}

            <div

              style={{

                background: '#F8FAFC',

                border:
                  `1px solid ${C.border}`,

                borderRadius: 8,

                padding:
                  '9px 10px',

              }}

            >

              <div

                style={{

                  fontSize: 9,

                  fontWeight: 800,

                  textTransform:
                    'uppercase',

                  color: C.muted,

                  marginBottom: 3,

                }}

              >

                Collection

              </div>


              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: C.navy,

                }}

              >

                {fmtD(
                  order.deliver_date
                )}

              </div>

            </div>


            {/* FRAME WARRANTY */}

            {order.warranty_frame && (

              <div

                style={{

                  background: '#F3FAF5',

                  border:
                    '1px solid #A9CFB6',

                  borderRadius: 8,

                  padding:
                    '9px 10px',

                }}

              >

                <div

                  style={{

                    fontSize: 9,

                    fontWeight: 800,

                    textTransform:
                      'uppercase',

                    color: C.muted,

                    marginBottom: 3,

                  }}

                >

                  Frame Warranty

                </div>


                <div

                  style={{

                    fontSize: 11,

                    fontWeight: 700,

                    color: C.green,

                  }}

                >

                  {order.warranty_frame}

                </div>

              </div>

            )}


            {/* LENS WARRANTY */}

            {order.warranty_lens && (

              <div

                style={{

                  background: '#F3FAF5',

                  border:
                    '1px solid #A9CFB6',

                  borderRadius: 8,

                  padding:
                    '9px 10px',

                }}

              >

                <div

                  style={{

                    fontSize: 9,

                    fontWeight: 800,

                    textTransform:
                      'uppercase',

                    color: C.muted,

                    marginBottom: 3,

                  }}

                >

                  Lens Warranty

                </div>


                <div

                  style={{

                    fontSize: 11,

                    fontWeight: 700,

                    color: C.green,

                  }}

                >

                  {order.warranty_lens}

                </div>

              </div>

            )}

          </div>


          {/* ==================================================
              PRINT BUTTON
              ================================================== */}

          <button

            onClick={() => {

              if (
                tab === 'single'
              ) {

                openPrint(
                  buildSingleBill(
                    order
                  )
                );

              }


              if (
                tab === 'advance'
              ) {

                openPrint(
                  buildAdvanceBill(
                    order
                  )
                );

              }


              if (
                tab === 'balance'
              ) {

                openPrint(
                  buildBalanceBill(
                    order
                  )
                );

              }


              if (
                tab === 'lab'
              ) {

                openPrint(
                  buildLabCardHTML(
                    order
                  )
                );

              }

            }}

            style={{

              width: '100%',

              padding: '13px',

              background: C.navy,

              color: '#ffffff',

              border: 'none',

              borderRadius: 10,

              fontSize: 14,

              fontWeight: 800,

              cursor: 'pointer',

            }}

          >

            🖨️ Print{' '}

            {currentTab?.label}

          </button>


          {/* SMALL INFORMATION */}

          <div

            style={{

              marginTop: 10,

              textAlign: 'center',

              fontSize: 10,

              color: '#98A2B3',

            }}

          >

            A5 · 148 × 210 mm

          </div>

        </div>

      </div>

    </div>

  );

}


// ============================================================
// EXPORTS
// ============================================================

export {

  buildSingleBill,

  buildAdvanceBill,

  buildBalanceBill,

  buildQuickSaleBill,

  buildRepairBill,

  buildLabCardHTML,

  openPrint,

};