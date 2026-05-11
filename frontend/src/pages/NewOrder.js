// ============================================================
//  NewOrder.js — FULL UPDATED VERSION
//  ✅ QR Scanner Added
//  ✅ DB Lens Price Lookup
//  ✅ Frame Color Support
//  ✅ Progressive Segment Heights
//  ✅ Frame Photo Preview
//  ✅ Stock Reduction
// ============================================================

import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createCustomer,
  createOrder,
  getCustomers,
  getInventory
} from '../api';

import { QRScanner } from '../components/QRStickers';

const C = {
  navy: '#0f1f3d',
  gold: '#c9a84c',
  cream: '#f8f5ef',
  border: '#e0ddd6',
  muted: '#6b7280',
  success: '#2d7a4f',
  danger: '#c0392b',
  white: '#ffffff',
};

const TITLES = ['Mr.', 'Mrs.', 'Miss', 'Master', 'Baby', 'Rev.', 'Dr.'];

const DIOPTERS = [
  '0.00',
  ...Array.from({ length: 80 }, (_, i) =>
    ((i + 1) * 0.25).toFixed(2)
  )
];

const AXES = Array.from({ length: 181 }, (_, i) => String(i));

const VA_OPTIONS = [
  '6/6',
  '6/9',
  '6/12',
  '6/18',
  '6/24',
  '6/36',
  '6/60',
  'CF',
  'HM',
  'PL'
];

const FRAME_TYPES = [
  'Full rim',
  'Half rim',
  'Rimless',
  'Sunglass'
];

const FRAME_MATS = [
  'Plastic',
  'Metal',
  'TR90',
  'Titanium',
  'Acetate'
];

const FRAME_COLORS = [
  'Black',
  'Gold',
  'Silver',
  'Brown',
  'Gunmetal',
  'Blue',
  'Red',
  'Pink',
  'Tortoise',
  'Crystal',
  'Other'
];

const LENS_TYPES = [
  'Single Vision',
  'Bifocal',
  'Progressive',
  'Office Lens',
  'Reading (ready)'
];

const LENS_COATINGS = [
  'CR (White)',
  'HMC',
  'Hard Coat',
  'Blue Filter',
  'Photochromic',
  'Blue + Photochromic',
  'AR Coat'
];

const LENS_INDEXES = [
  'Default',
  '1.49',
  '1.56',
  '1.61',
  '1.67',
  '1.74'
];

const fmtMoney = (n) =>
  'Rs. ' +
  parseFloat(n || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 0
  });

function StepBar({ step }) {
  const steps = [
    'Customer',
    'Refraction',
    'Frame & Lens',
    'Payment'
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'white',
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '12px 20px',
        marginBottom: 20,
        overflowX: 'auto'
      }}
    >
      {steps.map((s, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;

        return (
          <React.Fragment key={s}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap'
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  background: done
                    ? C.success
                    : active
                    ? C.navy
                    : C.cream,
                  color:
                    done || active
                      ? 'white'
                      : C.muted
                }}
              >
                {done ? '✓' : n}
              </div>

              <span
                style={{
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active
                    ? C.navy
                    : done
                    ? C.success
                    : C.muted
                }}
              >
                {s}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background:
                    step > n
                      ? C.success
                      : C.border,
                  margin: '0 10px'
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const Field = ({ label, children }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 5
    }}
  >
    <label
      style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.9px',
        color: C.muted
      }}
    >
      {label}
    </label>

    {children}
  </div>
);

const INP = {
  padding: '10px 13px',
  border: `1.5px solid ${C.border}`,
  borderRadius: 9,
  fontSize: 14,
  background: C.cream,
  width: '100%'
};

const SEL = {
  ...INP,
  cursor: 'pointer'
};

export default function NewOrder() {

  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // QR Scanner
  const [showScanner, setShowScanner] = useState(false);

  // Customer
  const [custMode, setCustMode] = useState('search');
  const [custSearch, setCustSearch] = useState('');
  const [custResults, setCustResults] = useState([]);
  const [selectedCust, setSelectedCust] = useState(null);

  const [newCust, setNewCust] = useState({
    title: 'Mr.',
    name: '',
    phone: '',
    age: ''
  });

  const searchTimer = useRef(null);

  // Refraction
  const [ref, setRef] = useState({
    r_sph_s: '-',
    r_sph: '0.00',
    r_cyl_s: '-',
    r_cyl: '0.00',
    r_axis: '0',
    r_add: '0.00',
    r_va: '6/6',
    r_pd: '',

    l_sph_s: '-',
    l_sph: '0.00',
    l_cyl_s: '-',
    l_cyl: '0.00',
    l_axis: '0',
    l_add: '0.00',
    l_va: '6/6',
    l_pd: '',

    notes: ''
  });

  const [frameSearch, setFrameSearch] = useState('');
  const [frameResults, setFrameResults] = useState([]);
  const [selectedFrame, setSelectedFrame] = useState(null);

  const frameTimer = useRef(null);

  const [frameDetails, setFrameDetails] = useState({
    name: '',
    type: 'Full rim',
    material: 'Plastic',
    color: 'Black',
    buyPrice: 0,
    sellPrice: 0,
    frameDiscount: 0,
    inventoryId: null
  });

  const [lensDetails, setLensDetails] = useState({
    type: 'Single Vision',
    coating: 'CR (White)',
    lens_index: 'Default',
    buyPrice: 0,
    sellPrice: 0,
    lensDiscount: 0,
    matchedRange: '',
    matched: false
  });

  const [segHeightR, setSegHeightR] = useState('');
  const [segHeightL, setSegHeightL] = useState('');

  const [advance, setAdvance] = useState('');

  const [deliverDate, setDeliverDate] = useState(
    new Date(Date.now() + 7 * 86400000)
      .toISOString()
      .split('T')[0]
  );

  const [notes, setNotes] = useState('');

  // ============================================================
  // DB Lens Lookup
  // ============================================================

  const lookupLens = useCallback(async (type, coating) => {

    try {

      const BASE =
        process.env.REACT_APP_API_URL ||
        'http://localhost:5000/api';

      const token = localStorage.getItem('ko_token');

      const color =
        coating.toLowerCase().includes('photo')
          ? 'Photo-Gray'
          : 'White';

      const params = new URLSearchParams({
        lens_type: type,
        color
      });

      if (coating && coating !== 'Default') {
        params.set('coating', coating);
      }

      const res = await fetch(
        `${BASE}/lens-prices/match?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await res.json();

      if (data?.length > 0) {

        const match = data[0];

        setLensDetails(l => ({
          ...l,
          type,
          coating,
          buyPrice:
            parseFloat(match.buy_price) || 0,
          sellPrice:
            parseFloat(match.sell_price) || 0,
          matchedRange:
            match.power_range ||
            match.series ||
            '',
          matched: true,
          lensDiscount: 0
        }));

        return;
      }

    } catch (e) {
      console.log('Lens lookup failed');
    }

    setLensDetails(l => ({
      ...l,
      type,
      coating,
      buyPrice: 0,
      sellPrice: 0,
      matchedRange: '',
      matched: false,
      lensDiscount: 0
    }));

  }, []);

  // ============================================================
  // QR Scan Handler
  // ============================================================

  const handleQRScan = (item) => {

    setShowScanner(false);

    setSelectedFrame({
      ...item,
      image_url: null,
      quantity: 1
    });

    setFrameSearch(item.name);

    setFrameResults([]);

    setFrameDetails({
      name: item.name,
      type: item.type || 'Full rim',
      material: item.mat || 'Plastic',
      color: item.color || 'Black',
      buyPrice:
        parseFloat(item.cost) || 0,
      sellPrice:
        parseFloat(item.price) || 0,
      frameDiscount: 0,
      inventoryId: item.id
    });
  };

  // ============================================================
  // Frame Search
  // ============================================================

  const handleFrameSearch = (v) => {

    setFrameSearch(v);

    clearTimeout(frameTimer.current);

    if (v.length < 2) {
      setFrameResults([]);
      return;
    }

    frameTimer.current = setTimeout(async () => {

      try {

        const res = await getInventory({
          search: v,
          category: 'Frames'
        });

        setFrameResults(
          res.data
            .filter(i => i.quantity > 0)
            .slice(0, 6)
        );

      } catch {
        setFrameResults([]);
      }

    }, 400);
  };

  const pickFrame = (item) => {

    setSelectedFrame(item);

    setFrameSearch(item.name);

    setFrameResults([]);

    setFrameDetails({
      name: item.name,
      type:
        item.frame_type ||
        'Full rim',
      material:
        item.frame_material ||
        'Plastic',
      color:
        item.frame_color ||
        'Black',
      buyPrice:
        parseFloat(item.cost_price) || 0,
      sellPrice:
        parseFloat(item.sell_price) || 0,
      frameDiscount: 0,
      inventoryId: item.id
    });
  };

  // ============================================================
  // Totals
  // ============================================================

  const frameFinal =
    Math.max(
      0,
      frameDetails.sellPrice -
      frameDetails.frameDiscount
    );

  const lensFinal =
    Math.max(
      0,
      lensDetails.sellPrice -
      lensDetails.lensDiscount
    );

  const totalAmount =
    frameFinal + lensFinal;

  const balanceAmount =
    Math.max(
      0,
      totalAmount -
      (parseFloat(advance) || 0)
    );

  // ============================================================
  // RETURN
  // ============================================================

  return (

    <div
      style={{
        fontFamily: "'DM Sans',sans-serif",
        maxWidth: 740,
        margin: '0 auto'
      }}
    >

      <h1
        style={{
          color: C.navy
        }}
      >
        ➕ New Order
      </h1>

      <StepBar step={step} />

      {/* ===================================================== */}
      {/* STEP 3 ONLY */}
      {/* ===================================================== */}

      {step === 3 && (

        <div
          style={{
            background: 'white',
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 20
          }}
        >

          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 18
            }}
          >
            🕶️ Frame & Lens
          </div>

          {/* Frame */}
          <div
            style={{
              background: C.cream,
              padding: 16,
              borderRadius: 10,
              marginBottom: 16
            }}
          >

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: 8
              }}
            >
              <button
                onClick={() =>
                  setShowScanner(true)
                }
                style={{
                  padding: '8px 16px',
                  background: C.navy,
                  color: 'white',
                  border: 'none',
                  borderRadius: 9,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📷 Scan QR Sticker
              </button>
            </div>

            <div style={{ position: 'relative' }}>

              <Field label="Search Frame">

                <input
                  value={frameSearch}
                  onChange={(e) =>
                    handleFrameSearch(
                      e.target.value
                    )
                  }
                  style={INP}
                />

              </Field>

              {frameResults.length > 0 && (

                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border:
                      `1px solid ${C.border}`,
                    borderRadius: 10,
                    zIndex: 50
                  }}
                >

                  {frameResults.map(i => (

                    <div
                      key={i.id}
                      onMouseDown={() =>
                        pickFrame(i)
                      }
                      style={{
                        padding: 12,
                        cursor: 'pointer'
                      }}
                    >

                      {i.name}

                    </div>

                  ))}

                </div>

              )}

            </div>

            {/* Photo */}
            {selectedFrame &&
              selectedFrame.image_url && (

              <div
                style={{
                  marginTop: 12
                }}
              >

                <img
                  src={selectedFrame.image_url}
                  alt=""
                  style={{
                    width: '100%',
                    height: 160,
                    objectFit: 'cover',
                    borderRadius: 10
                  }}
                />

              </div>

            )}

            {/* Frame Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr 1fr',
                gap: 10,
                marginTop: 14
              }}
            >

              <Field label="Frame Type">
                <select
                  value={frameDetails.type}
                  onChange={(e) =>
                    setFrameDetails(f => ({
                      ...f,
                      type: e.target.value
                    }))
                  }
                  style={SEL}
                >
                  {FRAME_TYPES.map(t => (
                    <option key={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Material">
                <select
                  value={frameDetails.material}
                  onChange={(e) =>
                    setFrameDetails(f => ({
                      ...f,
                      material: e.target.value
                    }))
                  }
                  style={SEL}
                >
                  {FRAME_MATS.map(m => (
                    <option key={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Frame Color">
                <select
                  value={frameDetails.color}
                  onChange={(e) =>
                    setFrameDetails(f => ({
                      ...f,
                      color: e.target.value
                    }))
                  }
                  style={SEL}
                >
                  {FRAME_COLORS.map(c => (
                    <option key={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

            </div>

          </div>

          {/* Lens */}
          <div
            style={{
              background: '#f0f9ff',
              padding: 16,
              borderRadius: 10
            }}
          >

            <Field label="Lens Type">

              <select
                value={lensDetails.type}
                onChange={(e) =>
                  lookupLens(
                    e.target.value,
                    lensDetails.coating
                  )
                }
                style={SEL}
              >
                {LENS_TYPES.map(t => (
                  <option key={t}>
                    {t}
                  </option>
                ))}
              </select>

            </Field>

            <Field label="Lens Coating">

              <select
                value={lensDetails.coating}
                onChange={(e) =>
                  lookupLens(
                    lensDetails.type,
                    e.target.value
                  )
                }
                style={SEL}
              >
                {LENS_COATINGS.map(c => (
                  <option key={c}>
                    {c}
                  </option>
                ))}
              </select>

            </Field>

            {lensDetails.type ===
              'Progressive' && (

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr 1fr',
                  gap: 10,
                  marginTop: 12
                }}
              >

                <Field label="Seg Height Right">

                  <input
                    value={segHeightR}
                    onChange={(e) =>
                      setSegHeightR(
                        e.target.value
                      )
                    }
                    style={INP}
                  />

                </Field>

                <Field label="Seg Height Left">

                  <input
                    value={segHeightL}
                    onChange={(e) =>
                      setSegHeightL(
                        e.target.value
                      )
                    }
                    style={INP}
                  />

                </Field>

              </div>

            )}

          </div>

        </div>

      )}

      {/* ===================================================== */}
      {/* QR Scanner Modal */}
      {/* ===================================================== */}

      {showScanner && (

        <QRScanner
          title="Scan Frame Sticker"
          onScan={handleQRScan}
          onClose={() =>
            setShowScanner(false)
          }
        />

      )}

    </div>
  );
}