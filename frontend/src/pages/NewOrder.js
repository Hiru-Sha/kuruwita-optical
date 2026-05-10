// ============================================================
//  NewOrder.js — Complete rebuild, all bugs fixed
//  Fixes: duplicate customer, frame blank, SPH signs,
//         lens_company missing, S.sht crash, balance calc
// ============================================================
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCustomer, createOrder, getCustomers, getInventory } from '../api';

// ── Constants ────────────────────────────────────────────────
const TITLES        = ['Mr.', 'Mrs.', 'Miss', 'Master', 'Baby', 'Rev.', 'Dr.'];
const DIOPTERS      = ['0.00', ...Array.from({ length: 80 }, (_, i) => ((i + 1) * 0.25).toFixed(2))];
const AXES          = Array.from({ length: 181 }, (_, i) => String(i));
const VA_OPTIONS    = ['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', 'CF', 'HM', 'PL'];
const FRAME_TYPES   = ['Full rim', 'Half rim', 'Rimless', 'Sunglass'];
const FRAME_MATS    = ['Plastic', 'Metal', 'TR90', 'Titanium', 'Acetate'];
const LENS_TYPES    = ['Single Vision', 'Bifocal', 'Progressive', 'Office Lens', 'Reading (ready)'];
const LENS_COATINGS = ['Hard Coat', 'HMC', 'Blue Filter', 'Photochromic', 'Blue + Photochromic', 'AR Coat'];
const LENS_COS      = ['Negombo Optical', 'Solex Optical', 'In-Shop'];

// ── Style helpers ────────────────────────────────────────────
const navy  = '#0f1f3d';
const gold  = '#c9a84c';
const cream = '#f8f5ef';
const border= '#e0ddd6';
const muted = '#6b7280';
const danger= '#c0392b';
const success='#2d7a4f';

const css = {
  section: { background: 'white', border: `1px solid ${border}`, borderRadius: 14, padding: '20px 22px', marginBottom: 16 },
  sHead:   { fontSize: 16, fontWeight: 700, color: navy, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 },
  grid2:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  grid3:   { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  field:   { display: 'flex', flexDirection: 'column', gap: 5 },
  lbl:     { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.9px', color: muted },
  inp:     { padding: '10px 13px', border: `1.5px solid ${border}`, borderRadius: 9, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', background: cream, color: navy, transition: 'border-color .2s' },
  btnPrimary: { padding: '11px 28px', background: navy, color: 'white', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s' },
  btnSecondary: { padding: '11px 20px', background: cream, color: muted, border: `1.5px solid ${border}`, borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};

// ── Step indicator ───────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Customer', 'Refraction', 'Frame & Lens', 'Payment'];
  return (
    <div style={{ display: 'flex', gap: 0, background: 'white', border: `1px solid ${border}`, borderRadius: 12, padding: '12px 20px', marginBottom: 20, overflowX: 'auto' }}>
      {steps.map((s, i) => {
        const n = i + 1;
        const done = step > n, active = step === n;
        return (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
                background: done ? success : active ? navy : cream,
                color: done || active ? 'white' : muted,
                border: `2px solid ${done ? success : active ? navy : border}`,
              }}>
                {done ? '✓' : n}
              </div>
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? navy : done ? success : muted }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: done ? success : border, margin: '12px 10px', minWidth: 20 }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export default function NewOrder() {
  const navigate = useNavigate();
  const [step,   setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  // Customer state
  const [custMode,     setCustMode]     = useState('search'); // 'search' | 'new'
  const [custSearch,   setCustSearch]   = useState('');
  const [custResults,  setCustResults]  = useState([]);
  const [selectedCust, setSelectedCust] = useState(null);
  const [newCust, setNewCust] = useState({ title: 'Mr.', name: '', phone: '', age: '', address: '' });
  const searchTimer = useRef(null);

  // Refraction state — signs stored separately, combined on save
  const [ref, setRef] = useState({
    r_sph_s: '-', r_sph: '0.00', r_cyl_s: '-', r_cyl: '0.00', r_axis: '0', r_add: '0.00', r_va: '6/6', r_pd: '',
    l_sph_s: '-', l_sph: '0.00', l_cyl_s: '-', l_cyl: '0.00', l_axis: '0', l_add: '0.00', l_va: '6/6', l_pd: '',
    notes: '',
  });
  const [hasRx,      setHasRx]      = useState(false);
  const [rxHospital, setRxHospital] = useState('');
  const [rxDate,     setRxDate]     = useState('');
  const [rxDoctor,   setRxDoctor]   = useState('');

  // Frame & Lens state
  const [frameSearch,   setFrameSearch]   = useState('');
  const [frameResults,  setFrameResults]  = useState([]);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [order, setOrder] = useState({
    frame: '', frame_type: 'Full rim', frame_material: 'Plastic',
    lens_type: 'Single Vision', lens_coating: 'HMC',
    lens_company: 'Negombo Optical',
    total_amount: '', advance_amount: '',
    deliver_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'created', notes: '',
  });

  const balance = Math.max(0, (parseFloat(order.total_amount) || 0) - (parseFloat(order.advance_amount) || 0));

  // ── Customer search ─────────────────────────────────────────
  const handleCustSearch = (q) => {
    setCustSearch(q);
    setSelectedCust(null);
    clearTimeout(searchTimer.current);
    if (q.length < 2) return setCustResults([]);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await getCustomers({ search: q });
        setCustResults(res.data.slice(0, 6));
      } catch { setCustResults([]); }
    }, 300);
  };

  const pickCustomer = (c) => {
    setSelectedCust(c);
    setCustSearch(c.name);
    setCustResults([]);
    setCustMode('search');
  };

  // ── Frame search ────────────────────────────────────────────
  const handleFrameSearch = async (q) => {
    setFrameSearch(q);
    setOrder(o => ({ ...o, frame: q }));
    setSelectedFrame(null);
    if (q.length < 2) return setFrameResults([]);
    try {
      const res = await getInventory({ search: q, category: 'Frames' });
      setFrameResults(res.data.filter(i => i.quantity > 0).slice(0, 6));
    } catch { setFrameResults([]); }
  };

  const pickFrame = (item) => {
    setSelectedFrame(item);
    setFrameSearch(item.name);
    setOrder(o => ({ ...o, frame: item.name, total_amount: String(parseFloat(item.sell_price) || '') }));
    setFrameResults([]);
  };

  // ── Copy right eye to left ──────────────────────────────────
  const copyEye = () => setRef(r => ({
    ...r,
    l_sph_s: r.r_sph_s, l_sph: r.r_sph,
    l_cyl_s: r.r_cyl_s, l_cyl: r.r_cyl,
    l_axis: r.r_axis, l_add: r.r_add, l_va: r.r_va, l_pd: r.r_pd,
  }));

  // ── Validation ──────────────────────────────────────────────
  const validate = (currentStep) => {
    if (currentStep === 1) {
      if (custMode === 'search' && !selectedCust) return 'Please select an existing customer or switch to add new';
      if (custMode === 'new' && !newCust.name.trim()) return 'Please enter customer name';
      if (custMode === 'new' && !newCust.phone.trim()) return 'Please enter phone number';
    }
    if (currentStep === 3) {
      if (!order.frame.trim()) return 'Please enter or select a frame';
      if (!order.lens_company) return 'Please select where the lens will be ground';
    }
    if (currentStep === 4) {
      if (!order.total_amount || parseFloat(order.total_amount) <= 0) return 'Please enter total amount';
      if (!order.deliver_date) return 'Please set a delivery date';
      const adv = parseFloat(order.advance_amount) || 0;
      const tot = parseFloat(order.total_amount) || 0;
      if (adv > tot) return 'Advance cannot be more than total amount';
    }
    return null;
  };

  const goNext = () => {
    const err = validate(step);
    if (err) return setError(err);
    setError('');
    setStep(s => s + 1);
  };

  // ── Save order ──────────────────────────────────────────────
  const handleSave = async () => {
    const err = validate(4);
    if (err) return setError(err);
    setError('');
    setSaving(true);

    try {
      let customerId;

      if (custMode === 'search' && selectedCust) {
        // Use existing customer
        customerId = selectedCust.id;
      } else {
        // Create new customer — handle duplicate phone gracefully
        try {
          const res = await createCustomer({
            name: `${newCust.title} ${newCust.name}`.trim(),
            phone: newCust.phone.trim(),
            age: newCust.age || null,
            address: newCust.address || null,
          });
          customerId = res.data.id;
        } catch (custErr) {
          // 409 = phone already exists → use that customer's ID
          if (custErr.response?.status === 409) {
            customerId = custErr.response.data.id;
          } else {
            throw custErr;
          }
        }
      }

      // ── Combine SPH/CYL signs with values ──────────────────
      const combineSph = (sign, val) => {
        if (!val || val === '0.00') return 'Plano';
        return sign + val;
      };
      const combineCyl = (sign, val) => {
        if (!val || val === '0.00') return '0.00';
        return sign + val;
      };

      // ── Build order payload — all field names match backend ─
      const payload = {
        customer_id:    customerId,
        frame:          order.frame.trim(),           // FIX: was frame_name
        frame_type:     order.frame_type,
        frame_material: order.frame_material,
        lens_type:      order.lens_type,
        lens_coating:   order.lens_coating,
        lens_company:   order.lens_company,           // FIX: was missing
        total_amount:   parseFloat(order.total_amount) || 0,
        advance_amount: parseFloat(order.advance_amount) || 0,
        balance_amount: balance,
        deliver_date:   order.deliver_date,
        status:         order.status,
        notes:          order.notes || null,
        has_rx:         hasRx,
        rx_hospital:    hasRx ? rxHospital : null,
        rx_date:        hasRx ? rxDate : null,
        rx_doctor:      hasRx ? rxDoctor : null,
        // ── Refraction — signs combined ──────────────────────
        r_sph:  combineSph(ref.r_sph_s, ref.r_sph),  // FIX: was unsigned
        r_cyl:  combineCyl(ref.r_cyl_s, ref.r_cyl),
        r_axis: ref.r_axis,
        r_add:  ref.r_add !== '0.00' ? '+' + ref.r_add : null,
        r_va:   ref.r_va,
        r_pd:   ref.r_pd || null,
        l_sph:  combineSph(ref.l_sph_s, ref.l_sph),
        l_cyl:  combineCyl(ref.l_cyl_s, ref.l_cyl),
        l_axis: ref.l_axis,
        l_add:  ref.l_add !== '0.00' ? '+' + ref.l_add : null,
        l_va:   ref.l_va,
        l_pd:   ref.l_pd || null,
        ref_notes: ref.notes || null,
      };

      await createOrder(payload);
      navigate('/orders');

    } catch (e) {
      console.error(e);
      setError(e.response?.data?.error || 'Failed to save order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Shared input focus/blur ──────────────────────────────────
  const focusInp = e => e.target.style.borderColor = gold;
  const blurInp  = e => e.target.style.borderColor = border;

  const Inp = ({ value, onChange, placeholder, type = 'text', style = {} }) => (
    <input type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{ ...css.inp, ...style }}
      onFocus={focusInp} onBlur={blurInp}
    />
  );

  const Sel = ({ value, onChange, options }) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ ...css.inp, cursor: 'pointer' }}
      onFocus={focusInp} onBlur={blurInp}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );

  const FieldRow = ({ label, children }) => (
    <div style={css.field}>
      <label style={css.lbl}>{label}</label>
      {children}
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", maxWidth: 720, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: navy, margin: 0 }}>➕ New Order</h1>
        <button onClick={() => navigate('/orders')} style={css.btnSecondary}>← Back</button>
      </div>
      <p style={{ fontSize: 13, color: muted, marginBottom: 20 }}>Fill all 4 steps to create an order</p>

      <StepBar step={step} />

      {/* Error banner */}
      {error && (
        <div style={{ background: '#fef2f2', border: `1px solid #fca5a5`, color: danger, borderRadius: 10, padding: '11px 16px', fontSize: 13, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 1 — CUSTOMER
      ══════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div style={css.section}>
          <div style={css.sHead}>👤 Customer Details</div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {[['search', '🔍 Existing customer'], ['new', '➕ New customer']].map(([mode, label]) => (
              <button key={mode} onClick={() => { setCustMode(mode); setError(''); }}
                style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: `1.5px solid ${custMode === mode ? navy : border}`, background: custMode === mode ? navy : 'white', color: custMode === mode ? 'white' : muted }}>
                {label}
              </button>
            ))}
          </div>

          {/* Search existing */}
          {custMode === 'search' && (
            <div style={{ position: 'relative' }}>
              <FieldRow label="Search by name or phone">
                <Inp value={custSearch} onChange={handleCustSearch} placeholder="Type name or phone number..." />
              </FieldRow>
              {custResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: `1px solid ${border}`, borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,.12)', zIndex: 50, overflow: 'hidden', marginTop: 4 }}>
                  {custResults.map(c => (
                    <div key={c.id} onClick={() => pickCustomer(c)}
                      style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${cream}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onMouseEnter={e => e.currentTarget.style.background = cream}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: navy }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: muted }}>📞 {c.phone} · Age {c.age} · {c.total_orders} order{c.total_orders !== '1' ? 's' : ''}</div>
                      </div>
                      <span style={{ fontSize: 11, color: success, fontWeight: 700 }}>Select →</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedCust && (
                <div style={{ marginTop: 10, background: '#dcfce7', border: `1px solid #86efac`, borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: navy }}>✅ {selectedCust.name}</div>
                    <div style={{ fontSize: 12, color: muted }}>📞 {selectedCust.phone} · {selectedCust.total_orders} previous orders</div>
                  </div>
                  <button onClick={() => { setSelectedCust(null); setCustSearch(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: 13 }}>✕</button>
                </div>
              )}
              {!selectedCust && !custResults.length && custSearch.length > 1 && (
                <div style={{ marginTop: 8, fontSize: 13, color: muted }}>
                  No customer found — <button onClick={() => setCustMode('new')} style={{ background: 'none', border: 'none', color: navy, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', textDecoration: 'underline' }}>add as new customer</button>
                </div>
              )}
            </div>
          )}

          {/* New customer form */}
          {custMode === 'new' && (
            <div style={css.grid2}>
              <FieldRow label="Title">
                <Sel value={newCust.title} onChange={v => setNewCust(c => ({ ...c, title: v }))} options={TITLES} />
              </FieldRow>
              <FieldRow label="Full Name *">
                <Inp value={newCust.name} onChange={v => setNewCust(c => ({ ...c, name: v }))} placeholder="e.g. Nuwan Perera" />
              </FieldRow>
              <FieldRow label="Phone *">
                <Inp value={newCust.phone} onChange={v => setNewCust(c => ({ ...c, phone: v }))} placeholder="077-123-4567" type="tel" />
              </FieldRow>
              <FieldRow label="Age">
                <Inp value={newCust.age} onChange={v => setNewCust(c => ({ ...c, age: v }))} placeholder="e.g. 34" type="number" />
              </FieldRow>
              <div style={{ gridColumn: '1 / -1' }}>
                <FieldRow label="Address (optional)">
                  <Inp value={newCust.address} onChange={v => setNewCust(c => ({ ...c, address: v }))} placeholder="e.g. 45, Main Street, Kuruwita" />
                </FieldRow>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={goNext} style={css.btnPrimary}>Next: Refraction →</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 2 — REFRACTION
      ══════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div style={css.section}>
          <div style={css.sHead}>🔭 Refraction Results</div>

          {/* Eye table */}
          {[
            { label: 'Right Eye (R)', p: 'r' },
            { label: 'Left Eye (L)',  p: 'l' },
          ].map(eye => (
            <div key={eye.p} style={{ background: cream, borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: navy, marginBottom: 10 }}>{eye.label}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>

                {/* SPH */}
                <div style={css.field}>
                  <label style={css.lbl}>SPH</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <select value={ref[`${eye.p}_sph_s`]} onChange={e => setRef(r => ({ ...r, [`${eye.p}_sph_s`]: e.target.value }))}
                      style={{ ...css.inp, width: 56, padding: '10px 6px', textAlign: 'center' }}>
                      <option>-</option><option>+</option>
                    </select>
                    <select value={ref[`${eye.p}_sph`]} onChange={e => setRef(r => ({ ...r, [`${eye.p}_sph`]: e.target.value }))}
                      style={{ ...css.inp, width: 90 }}>
                      {DIOPTERS.map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                </div>

                {/* CYL */}
                <div style={css.field}>
                  <label style={css.lbl}>CYL</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <select value={ref[`${eye.p}_cyl_s`]} onChange={e => setRef(r => ({ ...r, [`${eye.p}_cyl_s`]: e.target.value }))}
                      style={{ ...css.inp, width: 56, padding: '10px 6px', textAlign: 'center' }}>
                      <option>-</option><option>+</option>
                    </select>
                    <select value={ref[`${eye.p}_cyl`]} onChange={e => setRef(r => ({ ...r, [`${eye.p}_cyl`]: e.target.value }))}
                      style={{ ...css.inp, width: 90 }}>
                      {DIOPTERS.map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                </div>

                {/* AXIS */}
                <div style={css.field}>
                  <label style={css.lbl}>AXIS</label>
                  <select value={ref[`${eye.p}_axis`]} onChange={e => setRef(r => ({ ...r, [`${eye.p}_axis`]: e.target.value }))}
                    style={{ ...css.inp, width: 80 }}>
                    {AXES.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>

                {/* ADD */}
                <div style={css.field}>
                  <label style={css.lbl}>ADD</label>
                  <select value={ref[`${eye.p}_add`]} onChange={e => setRef(r => ({ ...r, [`${eye.p}_add`]: e.target.value }))}
                    style={{ ...css.inp, width: 90 }}>
                    {DIOPTERS.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>

                {/* VA */}
                <div style={css.field}>
                  <label style={css.lbl}>V/A</label>
                  <select value={ref[`${eye.p}_va`]} onChange={e => setRef(r => ({ ...r, [`${eye.p}_va`]: e.target.value }))}
                    style={{ ...css.inp, width: 84 }}>
                    {VA_OPTIONS.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>

                {/* PD */}
                <div style={css.field}>
                  <label style={css.lbl}>PD</label>
                  <Inp value={ref[`${eye.p}_pd`]} onChange={v => setRef(r => ({ ...r, [`${eye.p}_pd`]: v }))}
                    placeholder="32" style={{ width: 72 }} />
                </div>

              </div>
            </div>
          ))}

          <button onClick={copyEye} style={{ background: cream, border: `1px solid ${border}`, borderRadius: 7, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: muted, marginBottom: 14 }}>
            ↓ Copy Right Eye to Left Eye
          </button>

          {/* Refraction notes */}
          <FieldRow label="Remarks / Clinical Notes">
            <textarea value={ref.notes} onChange={e => setRef(r => ({ ...r, notes: e.target.value }))}
              placeholder="e.g. Presbyopia, recommend progressive lenses..."
              style={{ ...css.inp, resize: 'vertical', minHeight: 72, lineHeight: 1.6 }} />
          </FieldRow>

          {/* Prescription toggle */}
          <div style={{ background: '#f0f9ff', borderRadius: 10, padding: '14px 16px', marginTop: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: hasRx ? 14 : 0 }}>
              <div onClick={() => setHasRx(h => !h)}
                style={{ width: 44, height: 24, borderRadius: 12, background: hasRx ? navy : border, position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 3, left: hasRx ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left .2s' }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: navy }}>Customer brought a prescription (Rx)</span>
            </label>
            {hasRx && (
              <div style={css.grid2}>
                <FieldRow label="Hospital / Clinic *">
                  <Inp value={rxHospital} onChange={setRxHospital} placeholder="e.g. Colombo National Hospital" />
                </FieldRow>
                <FieldRow label="Prescription Date">
                  <input type="date" value={rxDate} onChange={e => setRxDate(e.target.value)} style={css.inp} onFocus={focusInp} onBlur={blurInp} />
                </FieldRow>
                <div style={{ gridColumn: '1/-1' }}>
                  <FieldRow label="Doctor's Name (optional)">
                    <Inp value={rxDoctor} onChange={setRxDoctor} placeholder="e.g. Dr. Perera" />
                  </FieldRow>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button onClick={() => setStep(1)} style={css.btnSecondary}>← Back</button>
            <button onClick={goNext} style={css.btnPrimary}>Next: Frame & Lens →</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 3 — FRAME & LENS
      ══════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div style={css.section}>
          <div style={css.sHead}>🕶️ Frame & Lens</div>

          {/* Frame search from inventory */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <FieldRow label="Search Frame from Stock">
              <Inp value={frameSearch} onChange={handleFrameSearch} placeholder="Type frame name to search stock..." />
            </FieldRow>
            {frameResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: `1px solid ${border}`, borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,.12)', zIndex: 50, overflow: 'hidden', marginTop: 4 }}>
                {frameResults.map(i => (
                  <div key={i.id} onClick={() => pickFrame(i)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${cream}`, display: 'flex', alignItems: 'center', gap: 10 }}
                    onMouseEnter={e => e.currentTarget.style.background = cream}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    {i.image_url && <img src={i.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: navy }}>{i.name}</div>
                      <div style={{ fontSize: 11, color: muted }}>{i.brand} · {i.quantity} in stock</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: success }}>Rs. {parseFloat(i.sell_price).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
            {selectedFrame && (
              <div style={{ marginTop: 8, background: '#dcfce7', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: success, fontWeight: 600 }}>
                ✅ Selected from stock: {selectedFrame.name}
              </div>
            )}
            {!selectedFrame && frameSearch.length > 1 && !frameResults.length && (
              <div style={{ marginTop: 6, fontSize: 12, color: muted }}>Not in stock — you can still type the frame name manually above</div>
            )}
          </div>

          <div style={css.grid2}>
            <FieldRow label="Frame Type">
              <Sel value={order.frame_type} onChange={v => setOrder(o => ({ ...o, frame_type: v }))} options={FRAME_TYPES} />
            </FieldRow>
            <FieldRow label="Frame Material">
              <Sel value={order.frame_material} onChange={v => setOrder(o => ({ ...o, frame_material: v }))} options={FRAME_MATS} />
            </FieldRow>
            <FieldRow label="Lens Type">
              <Sel value={order.lens_type} onChange={v => setOrder(o => ({ ...o, lens_type: v }))} options={LENS_TYPES} />
            </FieldRow>
            <FieldRow label="Lens Coating">
              <Sel value={order.lens_coating} onChange={v => setOrder(o => ({ ...o, lens_coating: v }))} options={LENS_COATINGS} />
            </FieldRow>
          </div>

          {/* Lens company — 3 cards */}
          <div style={{ marginTop: 16 }}>
            <label style={css.lbl}>Send Lens For Grinding To *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 8 }}>
              {LENS_COS.map(lc => (
                <div key={lc} onClick={() => setOrder(o => ({ ...o, lens_company: lc }))}
                  style={{ border: `2px solid ${order.lens_company === lc ? navy : border}`, borderRadius: 10, padding: '12px 8px', textAlign: 'center', cursor: 'pointer', background: order.lens_company === lc ? navy : 'white', transition: 'all .15s' }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{lc === 'In-Shop' ? '🏠' : lc === 'Negombo Optical' ? '🏪' : '🔬'}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: order.lens_company === lc ? 'white' : navy }}>{lc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button onClick={() => setStep(2)} style={css.btnSecondary}>← Back</button>
            <button onClick={goNext} style={css.btnPrimary}>Next: Payment →</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 4 — PAYMENT & DELIVERY
      ══════════════════════════════════════════════════════ */}
      {step === 4 && (
        <div style={css.section}>
          <div style={css.sHead}>💰 Payment & Delivery</div>

          {/* Amount row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <FieldRow label="Total Amount (Rs.) *">
              <Inp value={order.total_amount} onChange={v => setOrder(o => ({ ...o, total_amount: v }))} placeholder="e.g. 8500" type="number" />
            </FieldRow>
            <FieldRow label="Advance Paid (Rs.)">
              <Inp value={order.advance_amount} onChange={v => setOrder(o => ({ ...o, advance_amount: v }))} placeholder="e.g. 3000" type="number" />
            </FieldRow>
            <div style={{ background: navy, borderRadius: 10, padding: '12px 14px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: gold, marginBottom: 4 }}>Balance Due</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: 'white' }}>Rs. {balance.toLocaleString()}</div>
            </div>
          </div>

          <div style={css.grid2}>
            <FieldRow label="Delivery Date *">
              <input type="date" value={order.deliver_date} onChange={e => setOrder(o => ({ ...o, deliver_date: e.target.value }))} style={css.inp} onFocus={focusInp} onBlur={blurInp} />
            </FieldRow>
            <FieldRow label="Order Status">
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                {['created', 'called'].map(s => (
                  <button key={s} onClick={() => setOrder(o => ({ ...o, status: s }))}
                    style={{ flex: 1, padding: '10px 4px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      border: `2px solid ${order.status === s ? navy : border}`,
                      background: order.status === s ? ({ created: '#dbeafe', called: '#fef9c3' }[s]) : 'white',
                      color: { created: '#1e40af', called: '#854d0e' }[s],
                      outline: order.status === s ? `3px solid ${navy}` : 'none', outlineOffset: 2 }}>
                    {s === 'created' ? '📝 Created' : '📞 Called'}
                  </button>
                ))}
              </div>
            </FieldRow>
          </div>

          <div style={{ marginTop: 14 }}>
            <FieldRow label="Internal Notes (optional)">
              <textarea value={order.notes} onChange={e => setOrder(o => ({ ...o, notes: e.target.value }))}
                placeholder="Any notes about this order..."
                style={{ ...css.inp, resize: 'vertical', minHeight: 72, lineHeight: 1.6 }} />
            </FieldRow>
          </div>

          {/* Order summary */}
          <div style={{ background: cream, borderRadius: 12, padding: 16, marginTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: navy, marginBottom: 10 }}>📋 Order Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              {[
                { l: 'Customer',  v: custMode === 'new' ? `${newCust.title} ${newCust.name}` : selectedCust?.name },
                { l: 'Phone',     v: custMode === 'new' ? newCust.phone : selectedCust?.phone },
                { l: 'Frame',     v: order.frame || '—' },
                { l: 'Lens',      v: order.lens_type },
                { l: 'Grinding',  v: order.lens_company },
                { l: 'Deliver',   v: order.deliver_date },
                { l: 'Total',     v: `Rs. ${parseFloat(order.total_amount || 0).toLocaleString()}` },
                { l: 'Balance',   v: `Rs. ${balance.toLocaleString()}`, red: balance > 0 },
              ].map(item => (
                <div key={item.l} style={{ fontSize: 13 }}>
                  <span style={{ color: muted }}>{item.l}: </span>
                  <b style={{ color: item.red ? danger : navy }}>{item.v || '—'}</b>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 20 }}>
            <button onClick={() => setStep(3)} style={css.btnSecondary}>← Back</button>
            <button onClick={handleSave} disabled={saving}
              style={{ ...css.btnPrimary, padding: '12px 36px', fontSize: 15, background: saving ? muted : navy, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? '⏳ Saving...' : '💾 Save Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
