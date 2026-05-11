// ============================================================
//  PrintReceipt.js — Clean bills + simplified lab job card
//  Customer bill: advance version & balance version
//  Lab card: date, patient, prescription, frame, lens, PD, seg height only
// ============================================================
import React, { useState } from 'react';

const fmtMoney = (n) =>
  'Rs. ' + parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
};

const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

// ── Print trigger ─────────────────────────────────────────────
const PRINT_CSS = `
  @media print {
    body * { visibility: hidden !important; }
    #ko-print-root, #ko-print-root * { visibility: visible !important; }
    #ko-print-root { position: fixed; inset: 0; background: white; z-index: 99999; padding: 12mm; }
    @page { margin: 8mm; size: A5; }
  }
`;

function injectPrintCss() {
  if (!document.getElementById('ko-print-css')) {
    const s = document.createElement('style');
    s.id = 'ko-print-css';
    s.textContent = PRINT_CSS;
    document.head.appendChild(s);
  }
}

// ── Shared colours ────────────────────────────────────────────
const navy  = '#0f1f3d';
const gold  = '#c9a84c';
const cream = '#f8f5ef';
const border= '#e0ddd6';
const muted = '#6b7280';
const danger= '#c0392b';
const success='#2d7a4f';

// ═══════════════════════════════════════════════════════════════
//  CUSTOMER BILL — used for both advance and balance receipts
// ═══════════════════════════════════════════════════════════════
function CustomerBill({ order, billType }) {
  // billType: 'advance' | 'balance'
  const total    = parseFloat(order.total_amount   || 0);
  const advance  = parseFloat(order.advance_amount || 0);
  const balance  = parseFloat(order.balance_amount || 0);
  const discount = parseFloat(order.discount_amount || 0);

  // What is being paid on THIS bill
  const amountPaid = billType === 'advance' ? advance : balance;
  const billLabel  = billType === 'advance' ? 'Advance Receipt' : 'Final Receipt — Balance Paid';
  const remainingAfter = billType === 'advance' ? balance : 0;

  // Discount percentage
  const originalTotal = total + discount;
  const discPct = discount > 0 && originalTotal > 0
    ? Math.round(discount / originalTotal * 100)
    : 0;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: "'DM Sans', sans-serif", color: navy }}>

      {/* Shop header */}
      <div style={{ background: navy, borderRadius: 12, padding: '18px 22px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 2 }}>
            👁️ Kuruwita Optical
          </div>
          <div style={{ fontSize: 10, color: gold, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>
            {billLabel}
          </div>
          <div style={{ fontSize: 11, color: '#ede9e0' }}>Kuruwita, Ratnapura District, Sri Lanka</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ background: gold, color: navy, fontWeight: 700, fontSize: 14, padding: '5px 12px', borderRadius: 7, marginBottom: 5 }}>
            {order.order_number}
          </div>
          <div style={{ fontSize: 11, color: '#ede9e0' }}>Date: {today()}</div>
        </div>
      </div>

      {/* Customer details */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: muted, marginBottom: 8, paddingBottom: 5, borderBottom: `1px solid ${border}` }}>
          Customer
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { l: 'Name',  v: order.customer_name },
            { l: 'Phone', v: order.phone          },
            { l: 'Age',   v: order.age ? order.age + ' years' : '—' },
          ].map(i => (
            <div key={i.l} style={{ background: cream, borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: muted, marginBottom: 2 }}>{i.l}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: navy }}>{i.v || '—'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Spectacle details */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: muted, marginBottom: 8, paddingBottom: 5, borderBottom: `1px solid ${border}` }}>
          Spectacle Details
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { l: 'Frame',        v: order.frame         },
            { l: 'Frame Type',   v: order.frame_type    },
            { l: 'Frame Color',  v: order.frame_color || '—' },
            { l: 'Lens Type',    v: order.lens_type     },
            { l: 'Lens Coating', v: order.lens_coating  },
          ].map(i => (
            <div key={i.l} style={{ background: cream, borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: muted, marginBottom: 2 }}>{i.l}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: navy }}>{i.v || '—'}</div>
            </div>
          ))}
          <div style={{ background: '#dcfce7', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: success, marginBottom: 2 }}>Expected Delivery</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: success }}>{fmtDate(order.deliver_date)}</div>
          </div>
        </div>
      </div>

      {/* Payment summary */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: muted, marginBottom: 8, paddingBottom: 5, borderBottom: `1px solid ${border}` }}>
          Payment
        </div>
        <div style={{ background: cream, borderRadius: 10, padding: '14px 16px' }}>

          {/* Frame price */}
          {parseFloat(order.frame_sell_price) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: muted }}>
              <span>Frame</span>
              <span>{fmtMoney(order.frame_sell_price)}</span>
            </div>
          )}

          {/* Lens price */}
          {parseFloat(order.lens_sell_price) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: muted }}>
              <span>Lens ({order.lens_type})</span>
              <span>{fmtMoney(order.lens_sell_price)}</span>
            </div>
          )}

          {/* Discount */}
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: success }}>
              <span>Discount{discPct > 0 ? ` (${discPct}%)` : ''}</span>
              <span>- {fmtMoney(discount)}</span>
            </div>
          )}

          {/* Divider */}
          <div style={{ borderTop: `1.5px solid ${border}`, margin: '10px 0' }} />

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: navy, marginBottom: 6 }}>
            <span>Total Amount</span>
            <span>{fmtMoney(total)}</span>
          </div>

          {/* This payment */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, padding: '8px 12px', background: billType === 'advance' ? '#dbeafe' : '#dcfce7', borderRadius: 8, marginBottom: 6, color: billType === 'advance' ? '#1e40af' : success }}>
            <span>{billType === 'advance' ? '✅ Advance Paid' : '✅ Balance Paid'}</span>
            <span>{fmtMoney(amountPaid)}</span>
          </div>

          {/* Remaining */}
          {remainingAfter > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: danger }}>
              <span>Balance Remaining</span>
              <span>{fmtMoney(remainingAfter)}</span>
            </div>
          )}
          {remainingAfter <= 0 && billType === 'balance' && (
            <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: success, marginTop: 6 }}>
              ✅ Fully Paid — Thank You!
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `2px solid ${navy}`, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: 12, color: muted }}>
          <div style={{ fontWeight: 600, color: navy, marginBottom: 2 }}>Kuruwita Optical</div>
          <div>Thank you for your trust. 🙏</div>
          {billType === 'advance' && <div style={{ fontSize: 11, marginTop: 4, color: danger }}>Please keep this receipt — bring it on collection.</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: muted }}>Expected delivery</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: navy }}>{fmtDate(order.deliver_date)}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  LAB JOB CARD — date, patient, prescription, frame, lens, PD, seg height only
// ═══════════════════════════════════════════════════════════════
function LabJobCard({ order }) {
  const ref = order.refraction || order;

  const Box = ({ label, value, wide }) => (
    <div style={{ gridColumn: wide ? '1 / -1' : undefined, border: `1.5px solid ${border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ background: navy, color: gold, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 10px' }}>{label}</div>
      <div style={{ padding: '8px 10px', fontSize: 14, fontWeight: 700, color: navy, minHeight: 34, background: 'white' }}>{value || '—'}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: navy, borderRadius: 10, padding: '14px 18px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: 'white' }}>👁️ Kuruwita Optical — Lab Job Card</div>
          <div style={{ fontSize: 10, color: gold, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 2 }}>Send this with the frame to the lab</div>
        </div>
        <div style={{ background: gold, color: navy, fontWeight: 700, fontSize: 16, padding: '6px 14px', borderRadius: 7 }}>{order.order_number}</div>
      </div>

      {/* Date + Patient */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <Box label="Date" value={today()} />
        <Box label="Deliver By" value={fmtDate(order.deliver_date)} />
        <Box label="Patient Name" value={order.customer_name} wide />
      </div>

      {/* Frame & Lens */}
      <div style={{ border: `2px solid ${navy}`, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ background: navy, color: gold, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', padding: '6px 14px' }}>Frame & Lens</div>
        <div style={{ padding: 12, background: 'white', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Box label="Frame"        value={order.frame}            />
          <Box label="Frame Type"   value={order.frame_type}       />
          <Box label="Frame Color"  value={order.frame_color || '—'} />
          <Box label="Lens Type"    value={order.lens_type}        />
          <Box label="Lens Coating" value={order.lens_coating}     />
        </div>
      </div>

      {/* Prescription */}
      <div style={{ border: `2px solid ${navy}`, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ background: navy, color: gold, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', padding: '6px 14px' }}>Prescription</div>
        <div style={{ padding: 12, background: 'white' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Eye', 'SPH', 'CYL', 'AXIS', 'ADD', 'VA'].map(h => (
                  <th key={h} style={{ background: cream, padding: '7px 8px', textAlign: 'center', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', border: `1px solid ${border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { eye: 'Right (R)', sph: ref.r_sph, cyl: ref.r_cyl, axis: ref.r_axis, add: ref.r_add, va: ref.r_va },
                { eye: 'Left (L)',  sph: ref.l_sph, cyl: ref.l_cyl, axis: ref.l_axis, add: ref.l_add, va: ref.l_va },
              ].map(row => (
                <tr key={row.eye}>
                  <td style={{ background: cream, padding: '8px 10px', fontWeight: 700, fontSize: 13, border: `1px solid ${border}`, whiteSpace: 'nowrap' }}>{row.eye}</td>
                  {[row.sph, row.cyl, row.axis, row.add, row.va].map((v, i) => (
                    <td key={i} style={{ padding: '8px 8px', textAlign: 'center', border: `1px solid ${border}`, fontSize: 14, fontWeight: 700, color: navy }}>{v || '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Refraction notes */}
          {(ref.notes || ref.ref_notes) && (
            <div style={{ marginTop: 8, fontSize: 12, color: muted, fontStyle: 'italic', background: '#fef9f0', borderRadius: 6, padding: '6px 10px' }}>
              ⚠️ {ref.notes || ref.ref_notes}
            </div>
          )}
        </div>
      </div>

      {/* PD and Segment Height */}
      <div style={{ border: `2px solid ${navy}`, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ background: navy, color: gold, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', padding: '6px 14px' }}>Measurements</div>
        <div style={{ padding: 12, background: 'white', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          <Box label="PD Right"       value={ref.r_pd || '—'} />
          <Box label="PD Left"        value={ref.l_pd || '—'} />
          <Box label="Seg Height R"   value={order.seg_height_r || '—'} />
          <Box label="Seg Height L"   value={order.seg_height_l || '—'} />
        </div>
      </div>

      {/* Special instructions */}
      {order.notes && (
        <div style={{ border: `1.5px solid ${border}`, borderRadius: 9, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ background: navy, color: gold, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', padding: '5px 12px' }}>Special Instructions</div>
          <div style={{ padding: '10px 14px', background: 'white', fontSize: 13, color: navy }}>{order.notes}</div>
        </div>
      )}

      {/* Footer line */}
      <div style={{ borderTop: `2px solid ${navy}`, paddingTop: 10, fontSize: 11, color: muted, textAlign: 'center' }}>
        Kuruwita Optical · Kuruwita, Ratnapura · {today()}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN MODAL
// ═══════════════════════════════════════════════════════════════
export default function PrintReceipt({ order, onClose }) {
  const [activeTab, setActiveTab] = useState('advance');

  const handlePrint = () => {
    injectPrintCss();
    window.print();
  };

  const tabs = [
    { key: 'advance', label: '🧾 Advance Bill'  },
    { key: 'balance', label: '✅ Balance Bill'   },
    { key: 'lab',     label: '🔬 Lab Job Card'   },
  ];

  const balance = parseFloat(order.balance_amount || 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,31,61,.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px 16px', fontFamily: "'DM Sans',sans-serif" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 620, boxShadow: '0 24px 80px rgba(0,0,0,.35)' }}>

        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${border}` }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit', transition: 'all .15s',
                  background:   activeTab === t.key ? navy   : 'white',
                  color:        activeTab === t.key ? 'white' : muted,
                  borderColor:  activeTab === t.key ? navy   : border,
                }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handlePrint}
              style={{ padding: '7px 18px', background: gold, color: navy, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              🖨️ Print
            </button>
            <button onClick={onClose}
              style={{ padding: '7px 14px', background: cream, color: muted, border: `1.5px solid ${border}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              ✕
            </button>
          </div>
        </div>

        {/* Printable content */}
        <div id="ko-print-root" style={{ padding: '24px 28px', background: 'white' }}>
          {activeTab === 'advance' && <CustomerBill order={order} billType="advance" />}
          {activeTab === 'balance' && <CustomerBill order={order} billType="balance" />}
          {activeTab === 'lab'     && <LabJobCard   order={order} />}
        </div>

        {/* Helper note */}
        <div style={{ padding: '10px 20px', borderTop: `1px solid ${border}`, fontSize: 12, color: muted, textAlign: 'center' }}>
          {activeTab === 'advance' && '📄 Print this when customer pays the advance amount'}
          {activeTab === 'balance' && balance > 0 ? '📄 Print this when customer pays the remaining balance' : activeTab === 'balance' ? '✅ Order is fully paid' : ''}
          {activeTab === 'lab'     && '🔬 Print this and send it with the frame to the grinding lab'}
        </div>
      </div>
    </div>
  );
}
