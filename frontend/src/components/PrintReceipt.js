// ============================================================
//  PrintReceipt.js
//  Customer receipt + Lab job card — both printable
//  Usage: import PrintReceipt from '../components/PrintReceipt'
//         <PrintReceipt order={order} onClose={() => setShowPrint(false)} />
// ============================================================
import React, { useRef } from 'react';

// ── Shared helpers ────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
};

const fmtMoney = (n) =>
  'Rs. ' + parseFloat(n || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });

const lensStepLabel = (step) =>
  ['Sent to lab', 'Grinding in progress', 'Lens ready', 'Received'][step] || '—';

// ── Print styles injected into the document ──────────────────
const PRINT_STYLES = `
  @media print {
    body * { visibility: hidden !important; }
    #ko-print-root, #ko-print-root * { visibility: visible !important; }
    #ko-print-root { position: fixed; inset: 0; z-index: 99999; background: white; }
    @page { margin: 10mm; size: A4; }
  }
`;

// ── Main component ────────────────────────────────────────────
export default function PrintReceipt({ order, onClose }) {
  const [activeTab, setActiveTab] = React.useState('receipt');
  const printRef = useRef();

  const handlePrint = () => {
    // Inject print styles once
    if (!document.getElementById('ko-print-styles')) {
      const s = document.createElement('style');
      s.id = 'ko-print-styles';
      s.textContent = PRINT_STYLES;
      document.head.appendChild(s);
    }
    window.print();
  };

  // Shared CSS vars
  const navy   = '#0f1f3d';
  const gold   = '#c9a84c';
  const cream  = '#f8f5ef';
  const border = '#e0ddd6';
  const muted  = '#6b7280';
  const success= '#2d7a4f';
  const danger = '#c0392b';

  // ── overlay ──────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,31,61,.6)',
      zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      overflowY: 'auto', padding: '24px 16px',
      fontFamily: "'DM Sans', sans-serif",
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'white', borderRadius: 16,
        width: '100%', maxWidth: 680,
        boxShadow: '0 24px 80px rgba(0,0,0,.35)',
      }}>

        {/* ── Modal header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${border}`,
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { key: 'receipt', label: '🧾 Customer Receipt' },
              { key: 'labcard', label: '🔬 Lab Job Card'     },
            ].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '7px 16px', borderRadius: 8, fontSize: 13,
                  fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                  fontFamily: 'inherit', transition: 'all .15s',
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
              style={{
                padding: '7px 18px', background: gold, color: navy,
                border: 'none', borderRadius: 8, fontSize: 13,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              🖨️ Print
            </button>
            <button onClick={onClose}
              style={{
                padding: '7px 14px', background: cream, color: muted,
                border: `1.5px solid ${border}`, borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* ── Printable area ── */}
        <div id="ko-print-root" ref={printRef}
          style={{ padding: '24px 28px', background: 'white' }}>

          {activeTab === 'receipt'
            ? <CustomerReceipt  order={order} navy={navy} gold={gold} cream={cream} border={border} muted={muted} success={success} danger={danger} />
            : <LabJobCard       order={order} navy={navy} gold={gold} cream={cream} border={border} muted={muted} />
          }
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════
//  CUSTOMER RECEIPT
// ════════════════════════════════════════════════════════════
function CustomerReceipt({ order, navy, gold, cream, border, muted, success, danger }) {
  const balance = parseFloat(order.balance_amount || 0);
  const advance = parseFloat(order.advance_amount || 0);
  const total   = parseFloat(order.total_amount   || 0);

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '1.2px', color: muted,
        paddingBottom: 5, marginBottom: 10,
        borderBottom: `1px solid ${border}`,
      }}>{title}</div>
      {children}
    </div>
  );

  const Row = ({ label, value, bold, color }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '4px 0', fontSize: 13,
    }}>
      <span style={{ color: muted }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, color: color || navy }}>{value || '—'}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>

      {/* Shop header */}
      <div style={{
        background: navy, borderRadius: 12, padding: '20px 24px',
        marginBottom: 20, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 2,
          }}>
            👁️ Kuruwita Optical
          </div>
          <div style={{ fontSize: 11, color: gold, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            Order Receipt
          </div>
          <div style={{ fontSize: 12, color: '#ede9e0', marginTop: 6 }}>
            Kuruwita, Ratnapura District, Sri Lanka
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            background: gold, color: navy,
            fontWeight: 700, fontSize: 15,
            padding: '6px 14px', borderRadius: 8,
            letterSpacing: '0.5px', marginBottom: 6,
          }}>
            {order.order_number}
          </div>
          <div style={{ fontSize: 11, color: '#ede9e0' }}>
            {fmtDate(order.created_at || new Date())}
          </div>
        </div>
      </div>

      {/* Customer details */}
      <Section title="Customer">
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        }}>
          {[
            { l: 'Name',     v: order.customer_name },
            { l: 'Phone',    v: order.phone          },
            { l: 'Age',      v: order.age ? `${order.age} years` : '—' },
            { l: 'Address',  v: order.address        },
          ].map(({ l, v }) => (
            <div key={l} style={{
              background: cream, borderRadius: 8, padding: '9px 12px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: muted, marginBottom: 3 }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: navy }}>{v || '—'}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Order details */}
      <Section title="Order Details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          {[
            { l: 'Frame',        v: order.frame       },
            { l: 'Frame type',   v: order.frame_type  },
            { l: 'Lens type',    v: order.lens_type   },
            { l: 'Lens coating', v: order.lens_coating },
            { l: 'Grinding at',  v: order.lens_company },
            { l: 'Deliver by',   v: fmtDate(order.deliver_date) },
          ].map(({ l, v }) => (
            <div key={l} style={{
              background: cream, borderRadius: 8, padding: '9px 12px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: muted, marginBottom: 3 }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: navy }}>{v || '—'}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Refraction */}
      {(order.refraction || order.r_sph || order.l_sph) && (
        <Section title="Prescription (Refraction)">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Eye', 'SPH', 'CYL', 'AXIS', 'ADD', 'VA', 'PD'].map(h => (
                    <th key={h} style={{
                      background: cream, padding: '7px 10px', textAlign: 'center',
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '.7px', color: muted,
                      border: `1px solid ${border}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    eye: 'Right (R)',
                    sph:  order.refraction?.r_sph  || order.r_sph,
                    cyl:  order.refraction?.r_cyl  || order.r_cyl,
                    axis: order.refraction?.r_axis || order.r_axis,
                    add:  order.refraction?.r_add  || order.r_add,
                    va:   order.refraction?.r_va   || order.r_va,
                    pd:   order.refraction?.r_pd   || order.r_pd,
                  },
                  {
                    eye: 'Left (L)',
                    sph:  order.refraction?.l_sph  || order.l_sph,
                    cyl:  order.refraction?.l_cyl  || order.l_cyl,
                    axis: order.refraction?.l_axis || order.l_axis,
                    add:  order.refraction?.l_add  || order.l_add,
                    va:   order.refraction?.l_va   || order.l_va,
                    pd:   order.refraction?.l_pd   || order.l_pd,
                  },
                ].map(row => (
                  <tr key={row.eye}>
                    <td style={{ background: cream, padding: '7px 10px', fontWeight: 700, color: navy, border: `1px solid ${border}`, whiteSpace: 'nowrap' }}>{row.eye}</td>
                    {[row.sph, row.cyl, row.axis, row.add, row.va, row.pd].map((v, i) => (
                      <td key={i} style={{ padding: '7px 10px', textAlign: 'center', border: `1px solid ${border}`, color: navy }}>{v || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(order.refraction?.notes || order.ref_notes) && (
            <div style={{ marginTop: 8, fontSize: 12, color: muted, fontStyle: 'italic' }}>
              Note: {order.refraction?.notes || order.ref_notes}
            </div>
          )}
        </Section>
      )}

      {/* Payment summary */}
      <Section title="Payment">
        <div style={{
          background: cream, borderRadius: 10, padding: '14px 16px',
        }}>
          <Row label="Total amount"   value={fmtMoney(total)}   />
          <Row label="Advance paid"   value={fmtMoney(advance)} />
          <div style={{ borderTop: `1px dashed ${border}`, margin: '8px 0' }} />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 16, fontWeight: 700, padding: '4px 0',
          }}>
            <span style={{ color: balance > 0 ? danger : success }}>
              {balance > 0 ? 'Balance due' : 'Fully paid ✓'}
            </span>
            <span style={{ color: balance > 0 ? danger : success }}>
              {fmtMoney(balance)}
            </span>
          </div>
        </div>
      </Section>

      {/* Prescription held */}
      {order.has_rx && (
        <div style={{
          background: '#e0f2fe', border: '1px solid #bae6fd',
          borderRadius: 10, padding: '11px 14px', marginBottom: 18,
          fontSize: 13, color: '#0369a1',
        }}>
          📄 <strong>Prescription held</strong> from {order.rx_hospital || 'hospital'}.
          {' '}Will be returned when the order is delivered.
        </div>
      )}

      {/* Footer */}
      <div style={{
        borderTop: `2px solid ${navy}`, paddingTop: 14,
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-end', marginTop: 8,
      }}>
        <div style={{ fontSize: 12, color: muted }}>
          <div style={{ fontWeight: 600, color: navy, marginBottom: 2 }}>Kuruwita Optical</div>
          <div>Thank you for your trust. 🙏</div>
          <div>Please keep this receipt for your records.</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: muted }}>
          <div style={{ fontWeight: 600, color: navy, marginBottom: 2 }}>Expected delivery</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: navy }}>
            {fmtDate(order.deliver_date)}
          </div>
        </div>
      </div>

      {/* Signature line */}
      <div style={{
        marginTop: 28,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20,
      }}>
        {['Customer signature', 'Shop signature'].map(label => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ borderTop: `1px solid ${border}`, paddingTop: 6, fontSize: 11, color: muted }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════
//  LAB JOB CARD
// ════════════════════════════════════════════════════════════
function LabJobCard({ order, navy, gold, cream, border, muted }) {

  const Box = ({ label, value, span }) => (
    <div style={{
      gridColumn: span ? `span ${span}` : undefined,
      border: `1.5px solid ${border}`,
      borderRadius: 8, overflow: 'hidden',
    }}>
      <div style={{
        background: navy, color: gold,
        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '1px', padding: '5px 10px',
      }}>{label}</div>
      <div style={{
        padding: '9px 10px', fontSize: 14,
        fontWeight: 700, color: navy, minHeight: 36,
        background: 'white',
      }}>{value || '—'}</div>
    </div>
  );

  const EyeRow = ({ label, sph, cyl, axis, add, va, pd }) => (
    <tr>
      <td style={{ background: cream, padding: '8px 10px', fontWeight: 700, fontSize: 13, color: navy, border: `1.5px solid ${border}`, whiteSpace: 'nowrap' }}>{label}</td>
      {[sph, cyl, axis, add, va, pd].map((v, i) => (
        <td key={i} style={{
          padding: '8px 10px', textAlign: 'center', fontSize: 14,
          fontWeight: 700, border: `1.5px solid ${border}`, color: navy,
          minWidth: 56, background: 'white',
        }}>{v || '—'}</td>
      ))}
    </tr>
  );

  const ref = order.refraction || order;

  return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>

      {/* Header strip */}
      <div style={{
        background: navy, borderRadius: 12,
        padding: '16px 20px', marginBottom: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 2,
          }}>
            👁️ Kuruwita Optical — Lab Job Card
          </div>
          <div style={{ fontSize: 11, color: gold, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            Send this card with the frame to the grinding lab
          </div>
        </div>
        <div style={{
          background: gold, color: navy,
          fontWeight: 700, fontSize: 18,
          padding: '8px 16px', borderRadius: 8,
          letterSpacing: '0.5px',
        }}>
          {order.order_number}
        </div>
      </div>

      {/* Urgency + date row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8, marginBottom: 14,
      }}>
        <Box label="Lab / Company"   value={order.lens_company} />
        <Box label="Date sent"       value={fmtDate(new Date())} />
        <Box label="Deliver by"      value={fmtDate(order.deliver_date)} />
      </div>

      {/* Patient + frame section */}
      <div style={{
        border: `2px solid ${navy}`, borderRadius: 10,
        overflow: 'hidden', marginBottom: 14,
      }}>
        <div style={{
          background: navy, color: gold,
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '1px', padding: '7px 14px',
        }}>Patient & Frame Details</div>
        <div style={{
          padding: 12,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          background: 'white',
        }}>
          <Box label="Patient name"   value={order.customer_name} />
          <Box label="Phone"          value={order.phone} />
          <Box label="Frame"          value={order.frame} />
          <Box label="Frame type"     value={order.frame_type} />
          <Box label="Lens type"      value={order.lens_type} />
          <Box label="Lens coating"   value={order.lens_coating} />
        </div>
      </div>

      {/* Refraction — BIG and clear */}
      <div style={{
        border: `2px solid ${navy}`, borderRadius: 10,
        overflow: 'hidden', marginBottom: 14,
      }}>
        <div style={{
          background: navy, color: gold,
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '1px', padding: '7px 14px',
        }}>Prescription (Refraction)</div>
        <div style={{ padding: 12, background: 'white' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Eye', 'SPH', 'CYL', 'AXIS', 'ADD', 'VA', 'PD'].map(h => (
                    <th key={h} style={{
                      background: cream, padding: '8px 10px', textAlign: 'center',
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '.7px', color: muted,
                      border: `1.5px solid ${border}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <EyeRow
                  label="Right (R)"
                  sph={ref.r_sph} cyl={ref.r_cyl} axis={ref.r_axis}
                  add={ref.r_add} va={ref.r_va}   pd={ref.r_pd}
                />
                <EyeRow
                  label="Left (L)"
                  sph={ref.l_sph} cyl={ref.l_cyl} axis={ref.l_axis}
                  add={ref.l_add} va={ref.l_va}   pd={ref.l_pd}
                />
              </tbody>
            </table>
          </div>
          {(ref.notes || ref.ref_notes) && (
            <div style={{
              marginTop: 10, fontSize: 13, color: navy,
              background: '#fef9f0', borderRadius: 7,
              padding: '8px 12px', fontWeight: 500,
            }}>
              ⚠️ Note: {ref.notes || ref.ref_notes}
            </div>
          )}
        </div>
      </div>

      {/* Special instructions */}
      <div style={{
        border: `2px solid ${navy}`, borderRadius: 10,
        overflow: 'hidden', marginBottom: 14,
      }}>
        <div style={{
          background: navy, color: gold,
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '1px', padding: '7px 14px',
        }}>Special Instructions</div>
        <div style={{
          padding: 14, background: 'white',
          minHeight: 60, fontSize: 13, color: navy,
        }}>
          {order.notes || <span style={{ color: muted, fontStyle: 'italic' }}>No special instructions</span>}
        </div>
      </div>

      {/* Checklist */}
      <div style={{
        border: `2px solid ${navy}`, borderRadius: 10,
        overflow: 'hidden', marginBottom: 18,
      }}>
        <div style={{
          background: navy, color: gold,
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '1px', padding: '7px 14px',
        }}>Lab Checklist</div>
        <div style={{
          padding: 14, background: 'white',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        }}>
          {[
            'Lens cut to correct shape',
            'Coating applied correctly',
            'Power verified before fitting',
            'Both lenses checked — R and L',
            'Frame not scratched or damaged',
            'Ready for collection notification sent',
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 12, color: navy,
            }}>
              <div style={{
                width: 16, height: 16, border: `1.5px solid ${navy}`,
                borderRadius: 3, flexShrink: 0,
              }} />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Lens step tracker */}
      <div style={{
        background: cream, borderRadius: 10,
        padding: '12px 14px', marginBottom: 18,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '1px', color: muted, marginBottom: 10,
        }}>Job Progress</div>
        <div style={{ display: 'flex', gap: 0 }}>
          {['📤 Sent', '⚙️ Grinding', '📦 Ready', '✅ Received'].map((label, i) => {
            const done    = i <  (order.lens_step || 0);
            const current = i === (order.lens_step || 0);
            return (
              <div key={i} style={{
                flex: 1, textAlign: 'center', padding: '8px 4px',
                fontSize: 11, fontWeight: 600,
                color: done ? '#2d7a4f' : current ? navy : muted,
                borderBottom: `3px solid ${done ? '#2d7a4f' : current ? gold : border}`,
              }}>
                {label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sign-off row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16,
        borderTop: `2px solid ${navy}`, paddingTop: 16,
      }}>
        {['Sent by (Kuruwita Optical)', 'Received by (Lab)', 'Returned by (Lab)'].map(label => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ height: 32, borderBottom: `1px solid ${border}`, marginBottom: 5 }} />
            <div style={{ fontSize: 10, color: muted, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 10, color: muted, marginTop: 3 }}>Date: ___________</div>
          </div>
        ))}
      </div>
    </div>
  );
}
