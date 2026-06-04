/* eslint-disable */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createCustomer, createOrder, getCustomers, getInventory } from '../api';
import { QRScanner } from '../components/QRStickers';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f',
  danger:'#c0392b', white:'#ffffff', blue:'#1d4ed8',
};

const TITLES       = ['Mr.','Mrs.','Miss','Master','Baby','Rev.','Dr.'];
const DIOPTERS     = ['0.00',...Array.from({length:80},(_,i)=>((i+1)*0.25).toFixed(2))];
const AXES         = Array.from({length:181},(_,i)=>String(i));
const VA_OPTIONS   = ['6/6','6/9','6/12','6/18','6/24','6/36','6/60','CF','HM','PL'];
const FRAME_TYPES  = ['Full rim','Half rim','Rimless','Sunglass'];
const FRAME_MATS   = ['Plastic','Metal','TR90','Titanium','Acetate'];
const FRAME_COLORS = ['Black','Gold','Silver','Brown','Gunmetal','Blue','Red','Pink','Tortoise','Crystal','Other'];
const LENS_TYPES   = ['Single Vision','Progressive','Bifocal','Office Lens','Reading (ready)','Progressive Bifocal'];
const LENS_COATINGS= [
  // ── CR39 basics (most common) ──
  'CR White (UC)',
  'CR Blue Cut',
  'CR Blue Cut PG',
  'CR HMC',
  'CR HMC PG',
  // ── Progressive coatings ──
  'Progressive White',
  'Progressive Blue Cut',
  'Progressive Blue Cut PG',
  'Progressive HMC',
  'Progressive HMC PG',
  'Progressive Polarized',
  'Progressive Photo Gray',
  // ── High index / specialty ──
  'HMC',
  'HMC PG',
  'HMC Grey',
  'Blue Cut HMC',
  'Blue Cut PG HMC',
  'BC PG',
  'BC PG DSC',
  'HMC DSC',
  'Photo HMC DSC',
  'Blue Cut DSC',
  'Polarized',
  'Polarized DSC',
  'UC',
  'Multi Coded',
  'Mirror Coating',
  'Photochromic',
];
const LENS_INDEXES = ['Default','CR39','1.49','1.56','1.59','1.6','1.61','1.67','1.74','Poly'];
const LENS_COMPANIES = ['Lanka Optic','MR Lens','Neo Vision','Omega','Murano','Generic','Other'];

const fmtMoney = (n) => 'Rs. '+parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
const pct = (a,b) => b>0 ? Math.round((a/b)*100) : 0;

const SUPPLIER_PRICES = [
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'UC',              sell_price:1200 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'Multi Coded',     sell_price:1600 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.56', color:'Photo-Gray', coating:'HMC',             sell_price:2200 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'Blue Cut HMC',    sell_price:2200 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'Blue Cut PG HMC', sell_price:3500 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.56', color:'Polarize',   coating:'UC',              sell_price:4400 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.56', color:'Polarize',   coating:'HMC',             sell_price:4500 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.61', color:'White',      coating:'HMC',             sell_price:3300 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.61', color:'Photo-Gray', coating:'HMC',             sell_price:3700 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.61', color:'White',      coating:'Blue Cut HMC',    sell_price:5100 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.61', color:'White',      coating:'Blue Cut PG HMC', sell_price:8000 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.67', color:'White',      coating:'HMC',             sell_price:5750 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.67', color:'Photo-Gray', coating:'HMC',             sell_price:9250 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.67', color:'White',      coating:'Blue Cut HMC',    sell_price:6550 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.67', color:'White',      coating:'Blue Cut PG HMC', sell_price:10500 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.74', color:'White',      coating:'HMC',             sell_price:13500 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.74', color:'Photo-Gray', coating:'HMC',             sell_price:18000 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.74', color:'White',      coating:'Blue Cut HMC',    sell_price:15500 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'1.74', color:'White',      coating:'Blue Cut PG HMC', sell_price:20500 },
  { supplier:'Lanka Optic', lens_type:'Progressive',   lens_index:'1.56', color:'White',      coating:'HMC',             sell_price:2300 },
  { supplier:'Lanka Optic', lens_type:'Progressive',   lens_index:'1.56', color:'Photo-Gray', coating:'HMC',             sell_price:3000 },
  { supplier:'Lanka Optic', lens_type:'Progressive',   lens_index:'1.56', color:'White',      coating:'Blue Cut HMC',    sell_price:2700 },
  { supplier:'Lanka Optic', lens_type:'Progressive',   lens_index:'1.56', color:'White',      coating:'Blue Cut PG HMC', sell_price:4500 },
  { supplier:'Lanka Optic', lens_type:'Progressive',   lens_index:'1.56', color:'Polarize',   coating:'HMC',             sell_price:6200 },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'CR39', color:'White',      coating:'UC',              sell_price:400  },
  { supplier:'Lanka Optic', lens_type:'Single Vision', lens_index:'CR39', color:'White',      coating:'CR MC',           sell_price:600  },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.6',  color:'White',      coating:'HMC',      sell_price:2500  },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.6',  color:'White',      coating:'Blue Cut', sell_price:2800  },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.6',  color:'Photo-Gray', coating:'HMC',      sell_price:7250  },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.6',  color:'White',      coating:'BC PG',    sell_price:9000  },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.67', color:'White',      coating:'HMC',      sell_price:4000  },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.67', color:'White',      coating:'Blue Cut', sell_price:4550  },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.67', color:'Photo-Gray', coating:'HMC',      sell_price:10250 },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.67', color:'White',      coating:'BC PG',    sell_price:12750 },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.74', color:'White',      coating:'HMC',      sell_price:11000 },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.74', color:'White',      coating:'Blue Cut', sell_price:13000 },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.74', color:'Photo-Gray', coating:'HMC',      sell_price:25500 },
  { supplier:'MR Lens', lens_type:'Single Vision', lens_index:'1.74', color:'White',      coating:'BC PG',    sell_price:28750 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.56', color:'White',      coating:'HMC DSC',       sell_price:7000  },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.56', color:'Photo-Gray', coating:'Photo HMC DSC', sell_price:8500  },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.56', color:'White',      coating:'Blue Cut DSC',  sell_price:9000  },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.56', color:'White',      coating:'BC PG DSC',     sell_price:12000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.60', color:'White',      coating:'HMC DSC',       sell_price:19000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.60', color:'Photo-Gray', coating:'Photo HMC DSC', sell_price:36000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.60', color:'White',      coating:'Blue Cut DSC',  sell_price:22000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.60', color:'White',      coating:'BC PG DSC',     sell_price:40000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.60', color:'Polarize',   coating:'Polarized DSC', sell_price:31000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.67', color:'White',      coating:'HMC DSC',       sell_price:25000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.67', color:'Photo-Gray', coating:'Photo HMC DSC', sell_price:42000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.67', color:'White',      coating:'Blue Cut DSC',  sell_price:28000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.67', color:'White',      coating:'BC PG DSC',     sell_price:47000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.67', color:'Polarize',   coating:'Polarized DSC', sell_price:45000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.74', color:'White',      coating:'HMC DSC',       sell_price:39000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.74', color:'Photo-Gray', coating:'Photo HMC DSC', sell_price:84000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.74', color:'White',      coating:'Blue Cut DSC',  sell_price:44000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.74', color:'White',      coating:'BC PG DSC',     sell_price:89000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.59', color:'White',      coating:'HMC DSC',       sell_price:21000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.59', color:'Photo-Gray', coating:'Photo HMC DSC', sell_price:29000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.59', color:'White',      coating:'Blue Cut DSC',  sell_price:25000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.59', color:'White',      coating:'BC PG DSC',     sell_price:32000 },
  { supplier:'Neo Vision', lens_type:'Progressive', lens_index:'1.59', color:'Polarize',   coating:'Polarized DSC', sell_price:52000 },
  { supplier:'Neo Vision', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'HMC DSC',       sell_price:4000  },
  { supplier:'Neo Vision', lens_type:'Single Vision', lens_index:'1.56', color:'Photo-Gray', coating:'Photo HMC DSC', sell_price:5500  },
  { supplier:'Neo Vision', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'Blue Cut DSC',  sell_price:6000  },
  { supplier:'Neo Vision', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'BC PG DSC',     sell_price:8000  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'UC',             sell_price:1500  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'HMC',            sell_price:2200  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.56', color:'Photo-Gray', coating:'HMC Grey',       sell_price:2800  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'Blue Cut (All)', sell_price:2700  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'BC PG',          sell_price:4000  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.56', color:'Polarize',   coating:'UC',             sell_price:4700  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.56', color:'Polarize',   coating:'HMC',            sell_price:4800  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.56', color:'White',      coating:'Mirror Coating', sell_price:7500  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.6',  color:'White',      coating:'HMC',            sell_price:6000  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.6',  color:'White',      coating:'Blue Cut',       sell_price:6500  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.6',  color:'White',      coating:'BC PG',          sell_price:9200  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.67', color:'White',      coating:'UC',             sell_price:9750  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.67', color:'White',      coating:'HMC',            sell_price:10250 },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.67', color:'Photo-Gray', coating:'HMC Grey',       sell_price:18000 },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.67', color:'White',      coating:'Blue Cut',       sell_price:9550  },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.67', color:'White',      coating:'BC PG',          sell_price:11100 },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.74', color:'White',      coating:'HMC',            sell_price:18000 },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.74', color:'White',      coating:'Blue Cut',       sell_price:20250 },
  { supplier:'Omega', lens_type:'Single Vision', lens_index:'1.74', color:'White',      coating:'BC PG',          sell_price:26250 },
  { supplier:'Omega', lens_type:'Progressive', lens_index:'1.56', color:'White',      coating:'UC',             sell_price:2000,  brand:'Omega Eyesphere' },
  { supplier:'Omega', lens_type:'Progressive', lens_index:'1.56', color:'White',      coating:'HMC',            sell_price:2300,  brand:'Omega Eyesphere' },
  { supplier:'Omega', lens_type:'Progressive', lens_index:'1.56', color:'Photo-Gray', coating:'HMC Grey',       sell_price:3000,  brand:'Omega Eyesphere' },
  { supplier:'Omega', lens_type:'Progressive', lens_index:'1.56', color:'White',      coating:'BC PG',          sell_price:4500,  brand:'Omega Eyesphere' },
  { supplier:'Omega', lens_type:'Progressive', lens_index:'1.67', color:'White',      coating:'HMC',            sell_price:10250, brand:'Omega Eyesphere' },
  { supplier:'Omega', lens_type:'Progressive', lens_index:'1.74', color:'White',      coating:'HMC',            sell_price:23200, brand:'Omega Eyesphere' },
  { supplier:'Omega', lens_type:'Progressive', lens_index:'1.56', color:'White',      coating:'UC',             sell_price:7500,  brand:'Omega Signature'  },
  { supplier:'Omega', lens_type:'Progressive', lens_index:'1.56', color:'White',      coating:'HMC',            sell_price:8000,  brand:'Omega Signature'  },
  { supplier:'Omega', lens_type:'Progressive', lens_index:'1.56', color:'White',      coating:'Blue Cut',       sell_price:8750,  brand:'Omega Signature'  },
  { supplier:'Omega', lens_type:'Progressive', lens_index:'1.56', color:'White',      coating:'BC PG',          sell_price:11250, brand:'Omega Signature'  },
  { supplier:'Omega', lens_type:'Progressive', lens_index:'1.67', color:'White',      coating:'HMC',            sell_price:15500, brand:'Omega Signature'  },
  { supplier:'Omega', lens_type:'Progressive', lens_index:'1.56', color:'White',      coating:'UC',             sell_price:22000, brand:'Omega 8K Ultimate' },
  { supplier:'Omega', lens_type:'Progressive', lens_index:'1.56', color:'White',      coating:'HMC',            sell_price:23250, brand:'Omega 8K Ultimate' },
  { supplier:'Omega', lens_type:'Office Lens', lens_index:'1.56', color:'White',      coating:'UC',             sell_price:4500,  brand:'Omega Drive'      },
  { supplier:'Omega', lens_type:'Office Lens', lens_index:'1.56', color:'White',      coating:'HMC',            sell_price:5500,  brand:'Omega Drive'      },
  { supplier:'Omega', lens_type:'Office Lens', lens_index:'1.56', color:'White',      coating:'UC',             sell_price:30250, brand:'Omega Workspace'  },
  { supplier:'Omega', lens_type:'Office Lens', lens_index:'1.56', color:'White',      coating:'HMC',            sell_price:31750, brand:'Omega Workspace'  },
];

function findSupplierPrice(supplier, lens_type, lens_index, coating) {
  if (!supplier || ['Other','Murano','Generic'].includes(supplier)) return null;
  const norm = s => (s||'').toLowerCase().replace(/[\s\-_()]/g,'');
  const pool = SUPPLIER_PRICES.filter(p =>
    p.supplier  === supplier &&
    p.lens_type === lens_type &&
    (!lens_index || lens_index==='Default' || p.lens_index===lens_index)
  );
  if (!pool.length) return null;
  let m = pool.find(p => norm(p.coating)===norm(coating));
  if (!m) m = pool[0];
  return m ? m.sell_price : null;
}

function StepBar({ step }) {
  const steps = ['Customer','Refraction','Frame & Lens','Payment'];
  return (
    <div style={{ display:'flex', alignItems:'center', background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 20px', marginBottom:20, overflowX:'auto' }}>
      {steps.map((s,i) => {
        const n=i+1, done=step>n, active=step===n;
        return (
          <React.Fragment key={s}>
            <div style={{ display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap' }}>
              <div style={{ width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0, background:done?C.success:active?C.navy:C.cream, color:done||active?'white':C.muted, border:`2px solid ${done?C.success:active?C.navy:C.border}` }}>
                {done?'✓':n}
              </div>
              <span style={{ fontSize:13, fontWeight:active?700:500, color:active?C.navy:done?C.success:C.muted }}>{s}</span>
            </div>
            {i<steps.length-1 && <div style={{ flex:1, height:2, background:step>n?C.success:C.border, margin:'0 10px', minWidth:20 }}/>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const Field = ({ label, children, span }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:5, gridColumn:span?'1/-1':undefined }}>
    <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted }}>{label}</label>
    {children}
  </div>
);

const INP = { padding:'10px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%' };
const SEL = { ...INP, cursor:'pointer' };

const Card = ({ children, style={} }) => (
  <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 20px', marginBottom:14, ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ icon, title, sub }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingBottom:12, borderBottom:`1px solid ${C.border}` }}>
    <div style={{ width:36, height:36, borderRadius:10, background:C.navy, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{icon}</div>
    <div>
      <div style={{ fontSize:15, fontWeight:700, color:C.navy, lineHeight:1.2 }}>{title}</div>
      {sub && <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{sub}</div>}
    </div>
  </div>
);

export default function NewOrder() {
  const navigate = useNavigate();

  // Inject no-spinner styles once
  useEffect(()=>{
    if (!document.getElementById('ko-no-spinners')) {
      const s = document.createElement('style');
      s.id = 'ko-no-spinners';
      s.textContent = 'input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}input[type=number]{-moz-appearance:textfield}';
      document.head.appendChild(s);
    }
  },[]);
  const [step,    setStep]   = useState(1);
  const location = useLocation();
  const [saving,  setSaving] = useState(false);
  const [error,   setError]  = useState('');

  const [custMode,     setCustMode]    = useState('search');
  const [custSearch,   setCustSearch]  = useState('');
  const [custResults,  setCustResults] = useState([]);
  const [selectedCust, setSelectedCust]= useState(null);
  const [newCust,      setNewCust]     = useState({ title:'Mr.', name:'', phone:'', age:'' });
  const searchTimer = useRef(null);

  const [ref, setRef] = useState({
    r_sph_s:'-', r_sph:'0.00', r_cyl_s:'-', r_cyl:'0.00', r_axis:'0', r_add:'0.00', r_va:'6/6', r_pd:'',
    l_sph_s:'-', l_sph:'0.00', l_cyl_s:'-', l_cyl:'0.00', l_axis:'0', l_add:'0.00', l_va:'6/6', l_pd:'',
    notes:'',
  });
  const [hasRx,      setHasRx]      = useState(false);
  const [rxHospital, setRxHospital] = useState('');
  const [rxDate,     setRxDate]     = useState('');
  const [rxDoctor,   setRxDoctor]   = useState('');

  const [frameSearch,   setFrameSearch]   = useState('');
  const [frameResults,  setFrameResults]  = useState([]);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const frameTimer = useRef(null);

  const [frameDetails, setFrameDetails] = useState({
    name:'', type:'Full rim', material:'Plastic', color:'Black',
    buyPrice:0, sellPrice:0, frameDiscount:0, inventoryId:null,
  });

  // Pre-fill from QR scan URL params
  useEffect(()=>{
    const p = new URLSearchParams(location.search);
    const frameName = p.get('frame_name');
    if (frameName) {
      const decoded = decodeURIComponent(frameName);
      setFrameDetails(f=>({
        ...f,
        name:        decoded,
        color:       decodeURIComponent(p.get('frame_color')||f.color||''),
        type:        decodeURIComponent(p.get('frame_type')||f.type||'Full rim'),
        sellPrice:   parseFloat(p.get('frame_price'))||f.sellPrice||0,
        inventoryId: p.get('frame_id') || null,
      }));
      setFrameSearch(decoded);
    }
  },[location.search]);

  const [lensDetails, setLensDetails] = useState({
    type:'Single Vision', coating:'HMC', lens_index:'Default',
    lens_company:'Lanka Optic', color:'White',
    buyPrice:0, sellPrice:0, lensDiscount:0,
    matchedRange:'', matched:false, matchSource:'',
  });

  const [segHeightR, setSegHeightR] = useState('');
  const [segHeightL, setSegHeightL] = useState('');
  const [pastMode,   setPastMode]   = useState(false);
  const [orderDate,  setOrderDate]  = useState('');
  const [advance,    setAdvance]    = useState('');
  const [payMethod,  setPayMethod]  = useState('cash');
  const [overallDiscount, setOverallDiscount] = useState('');
  const [discountPct,     setDiscountPct]     = useState('');
  const [freeItems,  setFreeItems]  = useState([]);
  const [invSearch,  setInvSearch]  = useState('');
  const [invResults, setInvResults] = useState([]);
  const [deliverDate, setDeliverDate] = useState(
    new Date(Date.now()+7*86400000).toISOString().split('T')[0]
  );
  const [notes,            setNotes]           = useState('');
  const [orderType,        setOrderType]       = useState('normal');
  const [customerOwnFrame, setCustomerOwnFrame]= useState(false);
  const [showScanner,      setShowScanner]     = useState(false);

  const frameFinal  = (orderType==='frame_replace_free'||orderType==='lens_warranty') ? 0
    : Math.max(0,(frameDetails.sellPrice||0)-(frameDetails.frameDiscount||0));
  const lensFinal   = orderType==='lens_warranty' ? 0
    : Math.max(0,(lensDetails.sellPrice||0)-(lensDetails.lensDiscount||0));
  const subTotal    = frameFinal + lensFinal;
  const pctAmt      = parseFloat(discountPct)>0 ? Math.round(subTotal*parseFloat(discountPct)/100) : 0;
  const rsAmt       = parseFloat(overallDiscount)||0;
  const totalAmount = Math.max(0, subTotal - pctAmt - rsAmt);
  const advanceAmt  = parseFloat(advance)||0;
  const balanceAmount = Math.max(0, totalAmount - advanceAmt);
  const lensMargin  = lensDetails.buyPrice>0 ? pct(lensDetails.sellPrice-lensDetails.buyPrice, lensDetails.sellPrice) : null;
  const frameMargin = frameDetails.buyPrice>0 ? pct(frameDetails.sellPrice-frameDetails.buyPrice, frameDetails.sellPrice) : null;

  const lookupLens = useCallback(async (type, coating, _sph, lens_index, company, color) => {
    const detColor = color || (coating.toLowerCase().includes('photo')||coating.toLowerCase().includes('photochromic') ? 'Photo-Gray' : 'White');
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const params = new URLSearchParams({ lens_type:type, color:detColor });
      if (coating && coating !== 'Default') params.set('coating', coating);
      if (lens_index && lens_index !== 'Default') params.set('lens_index', lens_index);
      const res  = await fetch(`${BASE}/lens-prices/match?${params}`, { headers:{ Authorization:`Bearer ${token}` } });
      const data = await res.json();
      if (data?.length > 0) {
        const m = data[0];
        setLensDetails(l => ({ ...l, type, coating, lens_index:lens_index||l.lens_index, lens_company:company||l.lens_company, color:detColor,
          buyPrice:parseFloat(m.buy_price)||0, sellPrice:parseFloat(m.sell_price)||0,
          matchedRange:m.power_range||m.series||'', matched:true, lensDiscount:0, matchSource:'db' }));
        return;
      }
    } catch(e) {}
    const sp = findSupplierPrice(company, type, lens_index, coating);
    if (sp) {
      setLensDetails(l => ({ ...l, type, coating, lens_index:lens_index||l.lens_index, lens_company:company||l.lens_company, color:detColor,
        buyPrice:0, sellPrice:sp, matchedRange:`${company} reference`, matched:true, lensDiscount:0, matchSource:'supplier' }));
      return;
    }
    setLensDetails(l => ({ ...l, type, coating, lens_index:lens_index||l.lens_index, lens_company:company||l.lens_company, color:detColor,
      buyPrice:0, sellPrice:0, matchedRange:'', matched:false, lensDiscount:0, matchSource:'' }));
  }, []);

  const handleQRScan = (item) => {
    setShowScanner(false);
    setSelectedFrame({ ...item, image_url:null, quantity:1 });
    setFrameSearch(item.name);
    setFrameResults([]);
    setFrameDetails({ name:item.name, type:item.frame_type||'Full rim', material:item.frame_material||'Plastic',
      color:item.frame_color||'Black', buyPrice:parseFloat(item.cost_price)||0, sellPrice:parseFloat(item.sell_price)||0,
      frameDiscount:0, inventoryId:item.id });
  };

  const handleCustSearch = (v) => {
    setCustSearch(v); setSelectedCust(null);
    clearTimeout(searchTimer.current);
    if (v.length < 2) return setCustResults([]);
    searchTimer.current = setTimeout(async () => {
      try { const res = await getCustomers({ search:v }); setCustResults(res.data.slice(0,6)); }
      catch { setCustResults([]); }
    }, 400);
  };
  const pickCustomer = (c) => { setSelectedCust(c); setCustSearch(c.name); setCustResults([]); };

  const handleFrameSearch = (v) => {
    setFrameSearch(v);
    setFrameDetails(f => ({ ...f, name:v }));
    setSelectedFrame(null);
    clearTimeout(frameTimer.current);
    if (v.length < 1) { setFrameResults([]); return; }
    frameTimer.current = setTimeout(async () => {
      try {
        const res  = await getInventory({ search:v, limit:'20', no_images:'1' });
        // backend returns { data: rows } — axios wraps in res.data
        const rows = res.data?.data || res.data || [];
        const arr  = Array.isArray(rows) ? rows : [];
        // Show frames and sunglasses only, with stock
        setFrameResults(
          arr.filter(i => i.quantity > 0 &&
            ['Frames','Sunglasses','Reading Glasses'].includes(i.category)
          ).slice(0, 10)
        );
      } catch(e) { console.error('Frame search error:', e); setFrameResults([]); }
    }, 300);
  };

  const pickFrame = (item) => {
    setSelectedFrame(item); setFrameSearch(item.name); setFrameResults([]);
    setFrameDetails({ name:item.name, type:item.frame_type||frameDetails.type,
      material:item.frame_material||frameDetails.material, color:item.frame_color||'Black',
      buyPrice:parseFloat(item.cost_price)||0, sellPrice:parseFloat(item.sell_price)||0,
      frameDiscount:0, inventoryId:item.id });
  };

  const copyEye = () => setRef(r => ({
    ...r, l_sph_s:r.r_sph_s, l_sph:r.r_sph, l_cyl_s:r.r_cyl_s, l_cyl:r.r_cyl,
    l_axis:r.r_axis, l_add:r.r_add, l_va:r.r_va, l_pd:r.r_pd,
  }));

  const searchInventory = async (q) => {
    if (!q||q.length<2) { setInvResults([]); return; }
    try {
      const BASE = process.env.REACT_APP_API_URL||'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res = await fetch(`${BASE}/inventory?search=${encodeURIComponent(q)}&limit=8&no_images=1`, { headers:{ Authorization:`Bearer ${token}` } });
      const data = await res.json();
      setInvResults(Array.isArray(data)?data:data.data||[]);
    } catch { setInvResults([]); }
  };

  const validate = (s) => {
    if (s===1) {
      if (custMode==='search' && !selectedCust)      return 'Please select an existing customer or switch to add new';
      if (custMode==='new' && !newCust.name.trim())  return 'Please enter customer name';
      if (custMode==='new' && !newCust.phone.trim()) return 'Please enter phone number';
    }
    if (s===3 && !frameDetails.name.trim()) return 'Please enter or select a frame';
    if (s===4) {
      if (pastMode && !orderDate)  return 'Please set the original order date';
      if (totalAmount<=0)          return 'Total amount must be greater than 0';
      if (!deliverDate)            return 'Please set a delivery date';
      if (advanceAmt > totalAmount) return 'Advance cannot exceed total amount';
    }
    return null;
  };

  const goNext = () => {
    const err = validate(step);
    if (err) return setError(err);
    setError('');
    if (step===2) lookupLens(lensDetails.type, lensDetails.coating, ref.r_sph_s+ref.r_sph, lensDetails.lens_index, lensDetails.lens_company, lensDetails.color);
    setStep(s=>s+1);
  };

  const handleSave = async () => {
    const err = validate(4);
    if (err) return setError(err);
    setError(''); setSaving(true);
    try {
      let customerId;
      if (custMode==='search' && selectedCust) {
        customerId = selectedCust.id;
      } else {
        const BASE = process.env.REACT_APP_API_URL||'http://localhost:5000/api';
        const token = localStorage.getItem('ko_token');
        const cr = await fetch(`${BASE}/customers`, {
          method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
          body: JSON.stringify({ name:`${newCust.title} ${newCust.name}`.trim(), phone:newCust.phone.trim(), age:newCust.age||null }),
        });
        const cj = await cr.json();
        customerId = cj?.data?.id || cj?.id;
        if (!customerId) throw new Error('Failed to create customer: '+JSON.stringify(cj));
      }
      const comb    = (s,v) => (!v||v==='0.00')?'Plano':s+v;
      const combCyl = (s,v) => (!v||v==='0.00')?'0.00':s+v;
      await createOrder({
        customer_id:        customerId,
        frame:              customerOwnFrame?(frameDetails.name||'Customer Frame'):frameDetails.name,
        frame_type:         frameDetails.type,
        frame_material:     frameDetails.material,
        frame_color:        frameDetails.color,
        lens_type:          lensDetails.type,
        lens_coating:       lensDetails.coating,
        lens_company:       lensDetails.lens_company||null,
        lens_index:         lensDetails.lens_index!=='Default'?lensDetails.lens_index:null,
        frame_inventory_id: customerOwnFrame?null:(frameDetails.inventoryId||null),
        frame_buy_price:    customerOwnFrame?0:frameDetails.buyPrice,
        frame_sell_price:   customerOwnFrame?0:frameFinal,
        lens_buy_price:     lensDetails.buyPrice,
        lens_sell_price:    lensFinal,
        total_amount:       totalAmount,
        advance_amount:     advanceAmt,
        balance_amount:     balanceAmount,
        discount_amount:    pctAmt+rsAmt+(frameDetails.frameDiscount||0)+(lensDetails.lensDiscount||0),
        discount_percent:   parseFloat(discountPct)||0,
        free_items:         freeItems,
        payment_method:     payMethod,
        customer_own_frame: customerOwnFrame,
        order_type:         orderType,
        deliver_date:       deliverDate,
        status:             pastMode?'delivered':'created',
        import_date:        pastMode?orderDate:null,
        notes:              notes||null,
        has_rx:             hasRx,
        rx_hospital:        hasRx?rxHospital:null,
        rx_date:            hasRx?rxDate:null,
        rx_doctor:          hasRx?rxDoctor:null,
        seg_height_r:       segHeightR||null,
        seg_height_l:       segHeightL||null,
        r_sph:  comb(ref.r_sph_s,ref.r_sph),  r_cyl: combCyl(ref.r_cyl_s,ref.r_cyl),
        r_axis: ref.r_axis, r_add: ref.r_add!=='0.00'?'+'+ref.r_add:null,
        r_va:   ref.r_va,   r_pd:  ref.r_pd||null,
        l_sph:  comb(ref.l_sph_s,ref.l_sph),  l_cyl: combCyl(ref.l_cyl_s,ref.l_cyl),
        l_axis: ref.l_axis, l_add: ref.l_add!=='0.00'?'+'+ref.l_add:null,
        l_va:   ref.l_va,   l_pd:  ref.l_pd||null,
        ref_notes: ref.notes||null,
      });
      if (freeItems.length>0) {
        const BASE2 = process.env.REACT_APP_API_URL||'http://localhost:5000/api';
        const tk2   = localStorage.getItem('ko_token');
        for (const fi of freeItems) {
          try {
            await fetch(`${BASE2}/stock-adjustments`, {
              method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${tk2}`},
              body: JSON.stringify({ inventory_id:fi.inventory_id, change_type:'remove', quantity_change:fi.qty, reason:'Given free with order' }),
            });
          } catch {}
        }
      }
      // ── Learn lens price: if manually entered, save to lens prices for future auto-fill ──
      if (lensDetails.buyPrice > 0 && lensDetails.sellPrice > 0 && lensDetails.matchSource === 'manual') {
        try {
          const BASE3  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
          const tk3    = localStorage.getItem('ko_token');
          await fetch(`${BASE3}/lens-prices/learn`, {
            method: 'POST',
            headers: { 'Content-Type':'application/json', Authorization:`Bearer ${tk3}` },
            body: JSON.stringify({
              brand:       lensDetails.lens_company || 'Generic',
              lens_type:   lensDetails.type,
              lens_index:  lensDetails.lens_index !== 'Default' ? lensDetails.lens_index : null,
              color:       lensDetails.color || 'White',
              coating:     lensDetails.coating,
              buy_price:   lensDetails.buyPrice,
              sell_price:  lensDetails.sellPrice,
              power_range: ref.r_sph_s + ref.r_sph + ' / ' + ref.r_cyl_s + ref.r_cyl,
              notes:       `Auto-learned from order`,
            }),
          });
        } catch(e2) { /* silently ignore — don't block order save */ }
      }

      navigate('/orders');
    } catch(e) {
      setError(e.response?.data?.error||'Failed to save order. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:740, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:8 }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.navy, margin:0 }}>New Order</h1>
        <button onClick={()=>navigate('/orders')}
          style={{ padding:'8px 18px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
          ← Back
        </button>
      </div>
      <p style={{ fontSize:13, color:C.muted, marginBottom:20 }}>Fill all 4 steps to create an order</p>
      <StepBar step={step}/>

      {error && (
        <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:10, padding:'11px 16px', fontSize:13, marginBottom:16 }}>
          {error}
        </div>
      )}

      {/* STEP 1 */}
      {step===1 && (
        <Card>
          <SectionTitle icon="👤" title="Customer Details" sub="Search existing or add a new customer"/>
          <div style={{ display:'flex', gap:6, marginBottom:18 }}>
            {[['search','Search Existing'],['new','New Customer']].map(([mode,label])=>(
              <button key={mode} onClick={()=>{ setCustMode(mode); setError(''); }}
                style={{ padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                  border:`1.5px solid ${custMode===mode?C.navy:C.border}`,
                  background:custMode===mode?C.navy:'white', color:custMode===mode?'white':C.muted }}>
                {label}
              </button>
            ))}
          </div>
          {custMode==='search' && (
            <div style={{ position:'relative' }}>
              <Field label="Search by name or phone">
                <input value={custSearch} onChange={e=>handleCustSearch(e.target.value)} placeholder="Type name or phone number..." style={INP}/>
              </Field>
              {custResults.length>0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:`1px solid ${C.border}`, borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.12)', zIndex:50, overflow:'hidden', marginTop:4 }}>
                  {custResults.map(c=>(
                    <div key={c.id} onMouseDown={()=>pickCustomer(c)}
                      style={{ padding:'12px 16px', cursor:'pointer', borderBottom:`1px solid ${C.cream}` }}>
                      <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{c.name}</div>
                      <div style={{ fontSize:12, color:C.muted }}>📞 {c.phone} · Age {c.age} · {c.total_orders} orders</div>
                    </div>
                  ))}
                </div>
              )}
              {selectedCust && (
                <div style={{ marginTop:10, background:'#dcfce7', border:`1px solid #86efac`, borderRadius:10, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>✓ {selectedCust.name}</div>
                    <div style={{ fontSize:12, color:C.muted }}>📞 {selectedCust.phone} · {selectedCust.total_orders} previous orders</div>
                  </div>
                  <button onMouseDown={()=>{ setSelectedCust(null); setCustSearch(''); setCustResults([]); }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:16 }}>✕</button>
                </div>
              )}
              {!selectedCust && !custResults.length && custSearch.length>1 && (
                <div style={{ marginTop:8, fontSize:13, color:C.muted }}>
                  Not found —{' '}
                  <button onMouseDown={()=>setCustMode('new')}
                    style={{ background:'none', border:'none', color:C.navy, cursor:'pointer', fontWeight:700, fontFamily:'inherit', textDecoration:'underline' }}>
                    add as new customer
                  </button>
                </div>
              )}
            </div>
          )}
          {custMode==='new' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Title"><select value={newCust.title} onChange={e=>setNewCust(c=>({...c,title:e.target.value}))} style={SEL}>{TITLES.map(t=><option key={t}>{t}</option>)}</select></Field>
              <Field label="Full Name *"><input value={newCust.name} onChange={e=>setNewCust(c=>({...c,name:e.target.value}))} placeholder="e.g. Nuwan Perera" style={INP}/></Field>
              <Field label="Phone *"><input value={newCust.phone} onChange={e=>setNewCust(c=>({...c,phone:e.target.value}))} placeholder="077-123-4567" type="tel" style={INP}/></Field>
              <Field label="Age"><input value={newCust.age} onChange={e=>setNewCust(c=>({...c,age:e.target.value}))} placeholder="e.g. 34" type="number" style={INP}/></Field>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:20 }}>
            <button onClick={goNext} style={{ padding:'11px 28px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Next: Refraction →
            </button>
          </div>
        </Card>
      )}

      {/* STEP 2 */}
      {step===2 && (
        <Card>
          <SectionTitle icon="🔭" title="Refraction Results" sub="Enter the patient's prescription details"/>
          {[{label:'Right Eye (R)',p:'r'},{label:'Left Eye (L)',p:'l'}].map(eye=>(
            <div key={eye.p} style={{ background:C.cream, borderRadius:10, padding:14, marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10 }}>{eye.label}</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <Field label="SPH">
                  <div style={{ display:'flex', gap:4 }}>
                    <select value={ref[`${eye.p}_sph_s`]} onChange={e=>setRef(r=>({...r,[`${eye.p}_sph_s`]:e.target.value}))} style={{ ...SEL, width:56, padding:'10px 6px' }}><option>-</option><option>+</option></select>
                    <select value={ref[`${eye.p}_sph`]}   onChange={e=>setRef(r=>({...r,[`${eye.p}_sph`]:e.target.value}))}   style={{ ...SEL, width:90 }}>{DIOPTERS.map(v=><option key={v}>{v}</option>)}</select>
                  </div>
                </Field>
                <Field label="CYL">
                  <div style={{ display:'flex', gap:4 }}>
                    <select value={ref[`${eye.p}_cyl_s`]} onChange={e=>setRef(r=>({...r,[`${eye.p}_cyl_s`]:e.target.value}))} style={{ ...SEL, width:56, padding:'10px 6px' }}><option>-</option><option>+</option></select>
                    <select value={ref[`${eye.p}_cyl`]}   onChange={e=>setRef(r=>({...r,[`${eye.p}_cyl`]:e.target.value}))}   style={{ ...SEL, width:90 }}>{DIOPTERS.map(v=><option key={v}>{v}</option>)}</select>
                  </div>
                </Field>
                <Field label="AXIS"><select value={ref[`${eye.p}_axis`]} onChange={e=>setRef(r=>({...r,[`${eye.p}_axis`]:e.target.value}))} style={{ ...SEL, width:80 }}>{AXES.map(v=><option key={v}>{v}</option>)}</select></Field>
                <Field label="ADD"><select value={ref[`${eye.p}_add`]}  onChange={e=>setRef(r=>({...r,[`${eye.p}_add`]:e.target.value}))}  style={{ ...SEL, width:90 }}>{DIOPTERS.map(v=><option key={v}>{v}</option>)}</select></Field>
                <Field label="V/A"><select value={ref[`${eye.p}_va`]}   onChange={e=>setRef(r=>({...r,[`${eye.p}_va`]:e.target.value}))}   style={{ ...SEL, width:84 }}>{VA_OPTIONS.map(v=><option key={v}>{v}</option>)}</select></Field>
                <Field label="PD"><input value={ref[`${eye.p}_pd`]} onChange={e=>setRef(r=>({...r,[`${eye.p}_pd`]:e.target.value}))} placeholder="32" style={{ ...INP, width:72 }}/></Field>
              </div>
            </div>
          ))}
          <button onClick={copyEye} style={{ background:C.cream, border:`1px solid ${C.border}`, borderRadius:7, padding:'6px 14px', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted, marginBottom:14 }}>
            Copy Right Eye to Left Eye
          </button>
          <Field label="Remarks / Clinical Notes">
            <textarea value={ref.notes} onChange={e=>setRef(r=>({...r,notes:e.target.value}))} placeholder="e.g. Presbyopia, recommend progressive lenses..." style={{ ...INP, resize:'vertical', minHeight:72, lineHeight:1.6 }}/>
          </Field>
          <div style={{ background:'#f0f9ff', borderRadius:10, padding:'14px 16px', marginTop:14 }}>
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
              <div onClick={()=>setHasRx(h=>!h)} style={{ width:44, height:24, borderRadius:12, background:hasRx?C.navy:C.border, position:'relative', cursor:'pointer', transition:'background .2s', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left:hasRx?23:3, width:18, height:18, borderRadius:'50%', background:'white', transition:'left .2s' }}/>
              </div>
              <span style={{ fontSize:14, fontWeight:500, color:C.navy }}>Customer brought a prescription (Rx)</span>
            </label>
            {hasRx && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:14 }}>
                <Field label="Hospital / Clinic"><input value={rxHospital} onChange={e=>setRxHospital(e.target.value)} placeholder="e.g. Colombo National Hospital" style={INP}/></Field>
                <Field label="Prescription Date"><input type="date" value={rxDate} onChange={e=>setRxDate(e.target.value)} style={INP}/></Field>
                <div style={{ gridColumn:'1/-1' }}><Field label="Doctor's Name (optional)"><input value={rxDoctor} onChange={e=>setRxDoctor(e.target.value)} placeholder="e.g. Dr. Perera" style={INP}/></Field></div>
              </div>
            )}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:20 }}>
            <button onClick={()=>setStep(1)} style={{ padding:'11px 20px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>← Back</button>
            <button onClick={goNext} style={{ padding:'11px 28px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Next: Frame & Lens →</button>
          </div>
        </Card>
      )}

      {/* STEP 3 */}
      {step===3 && (
        <div>
          <Card>
            <SectionTitle icon="📋" title="Order Type" sub="Select what kind of order this is"/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { v:'normal',             icon:'📋', label:'Normal Order',          sub:'Standard paid order',         col:C.navy,    bg:'#f0f4ff' },
                { v:'lens_warranty',      icon:'🔁', label:'Lens Free Replacement', sub:'Our fault — no charge',       col:'#166534', bg:'#f0fdf4' },
                { v:'lens_paid',          icon:'🔬', label:'Lens Paid Replacement', sub:'Customer pays for new lens',  col:'#1d4ed8', bg:'#eff6ff' },
                { v:'frame_replace_free', icon:'🎁', label:'Frame Replace Free',    sub:'One-to-one, no charge',       col:'#7c3aed', bg:'#f5f3ff' },
                { v:'frame_replace_paid', icon:'💰', label:'Frame Replace Paid',    sub:'Replacement with payment',    col:'#b45309', bg:'#fffbeb' },
              ].map(t=>(
                <button key={t.v} onClick={()=>setOrderType(t.v)}
                  style={{ padding:'10px 12px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                    border:`2px solid ${orderType===t.v?t.col:C.border}`,
                    background:orderType===t.v?t.bg:'white', color:orderType===t.v?t.col:C.muted,
                    display:'flex', alignItems:'center', gap:8, textAlign:'left', transition:'all .15s' }}>
                  <span style={{ fontSize:20 }}>{t.icon}</span>
                  <div><div>{t.label}</div><div style={{ fontSize:10, opacity:.7, fontWeight:400 }}>{t.sub}</div></div>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle icon="🕶️" title="Frame" sub="Search from stock, scan QR, or type a name manually"/>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {[{v:false,icon:'🏪',label:'From our stock'},{v:true,icon:'👤',label:"Customer's frame"}].map(opt=>(
                <button key={String(opt.v)} onClick={()=>{ setCustomerOwnFrame(opt.v); if(opt.v) setFrameDetails(f=>({...f,inventoryId:null,buyPrice:0})); }}
                  style={{ flex:1, padding:'10px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                    border:`2px solid ${customerOwnFrame===opt.v?C.navy:C.border}`,
                    background:customerOwnFrame===opt.v?C.navy:'white', color:customerOwnFrame===opt.v?'white':C.muted,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  <span>{opt.icon}</span>{opt.label}
                </button>
              ))}
            </div>
            <div style={{ position:'relative', marginBottom:14 }}>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1, position:'relative' }}>
                  <Field label={customerOwnFrame?"Frame Brand / Model Name":"Search or type frame name"}>
                    <input value={frameSearch} onChange={e=>handleFrameSearch(e.target.value)}
                      placeholder={customerOwnFrame?"e.g. RayBan RB3025, Titan...":"Type model name or search stock..."}
                      style={INP}/>
                  </Field>
                  {frameResults.length>0 && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'white', border:`1.5px solid ${C.gold}`, borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,.18)', zIndex:100, overflow:'hidden', marginTop:4, maxHeight:320, overflowY:'auto' }}>
                      <div style={{ padding:'6px 12px', background:C.cream, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, borderBottom:`1px solid ${C.border}` }}>
                        {frameResults.length} items found — click to select
                      </div>
                      {frameResults.map(i=>(
                        <div key={i.id} onMouseDown={()=>pickFrame(i)}
                          style={{ padding:'10px 14px', cursor:'pointer', borderBottom:`1px solid ${C.cream}`, display:'flex', alignItems:'center', gap:10, background:'white' }}
                          onMouseEnter={e=>e.currentTarget.style.background='#f8f5ef'}
                          onMouseLeave={e=>e.currentTarget.style.background='white'}>
                          <div style={{ width:10, height:10, borderRadius:'50%', background:i.quantity>2?C.success:i.quantity>0?'#f59e0b':C.danger, flexShrink:0 }}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:C.navy, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{i.name}</div>
                            <div style={{ fontSize:11, color:C.muted, display:'flex', gap:8, flexWrap:'wrap', marginTop:2 }}>
                              {i.frame_color && <span>{i.frame_color}</span>}
                              {i.frame_type  && <span>{i.frame_type}</span>}
                              {i.category    && <span style={{ color:'#7c3aed' }}>{i.category}</span>}
                              <span style={{ fontWeight:700, color:i.quantity>0?C.success:C.danger }}>
                                {i.quantity > 0 ? `${i.quantity} in stock` : 'Out of stock'}
                              </span>
                              <span style={{ color:C.navy, fontWeight:600 }}>{fmtMoney(i.sell_price)}</span>
                            </div>
                          </div>
                          <div style={{ fontSize:11, color:C.muted, textAlign:'right', flexShrink:0 }}>
                            {i.display_number ? `🏪#${i.display_number}` : ''}
                            {i.stock_number   ? ` 📦#${i.stock_number}` : ''}
                          </div>
                        </div>
                      ))}
                      <div onMouseDown={()=>setFrameResults([])}
                        style={{ padding:'9px 14px', cursor:'pointer', fontSize:12, color:C.muted, background:'#f8f5ef', borderTop:`1px solid ${C.border}` }}>
                        ✏️ Use "<b>{frameSearch}</b>" as typed — without selecting from stock
                      </div>
                    </div>
                  )}
                </div>
                {!customerOwnFrame && (
                  <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                    <button onClick={()=>setShowScanner(true)}
                      style={{ padding:'10px 14px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                      Scan QR
                    </button>
                  </div>
                )}
              </div>
            </div>
            {!customerOwnFrame && selectedFrame?.image_url && (
              <div style={{ marginBottom:14, borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}` }}>
                <img src={selectedFrame.image_url} alt={selectedFrame.name} style={{ width:'100%', height:140, objectFit:'cover' }}/>
                <div style={{ padding:'8px 12px', background:'#dcfce7', fontSize:12, fontWeight:600, color:C.success }}>
                  ✓ {selectedFrame.name}{selectedFrame.frame_color?` · ${selectedFrame.frame_color}`:''}
                </div>
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              <Field label="Frame Type">
                <select value={frameDetails.type} onChange={e=>setFrameDetails(f=>({...f,type:e.target.value}))} style={SEL}>
                  {FRAME_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Material">
                <select value={frameDetails.material} onChange={e=>setFrameDetails(f=>({...f,material:e.target.value}))} style={SEL}>
                  {FRAME_MATS.map(m=><option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Color">
                <select value={frameDetails.color} onChange={e=>setFrameDetails(f=>({...f,color:e.target.value}))} style={SEL}>
                  {FRAME_COLORS.map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              {!customerOwnFrame && (
                <>
                  <Field label="Buy Price (Rs.)">
                    <input type="number" value={frameDetails.buyPrice} onChange={e=>setFrameDetails(f=>({...f,buyPrice:parseFloat(e.target.value)||0}))} style={INP}/>
                  </Field>
                  <Field label="Sell Price (Rs.)">
                    <input type="number" value={frameDetails.sellPrice} onChange={e=>setFrameDetails(f=>({...f,sellPrice:parseFloat(e.target.value)||0}))} style={INP}/>
                  </Field>
                  {frameMargin!==null && (
                    <div style={{ display:'flex', alignItems:'flex-end' }}>
                      <div style={{ background:frameMargin>=40?'#dcfce7':frameMargin>=20?'#fef9c3':'#fee2e2', borderRadius:9, padding:'10px 14px', width:'100%' }}>
                        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.muted }}>Margin</div>
                        <div style={{ fontSize:20, fontWeight:700, color:frameMargin>=40?C.success:frameMargin>=20?'#b45309':C.danger }}>{frameMargin}%</div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          <Card>
            <SectionTitle icon="🔬" title="Lens" sub="Select supplier, type, coating and index — price auto-fills"/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <Field label="Lens Supplier">
                <select value={lensDetails.lens_company}
                  onChange={e=>{ const co=e.target.value; setLensDetails(l=>({...l,lens_company:co})); lookupLens(lensDetails.type,lensDetails.coating,'',lensDetails.lens_index,co,lensDetails.color); }}
                  style={SEL}>
                  {LENS_COMPANIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Lens Index">
                <select value={lensDetails.lens_index}
                  onChange={e=>{ const ix=e.target.value; setLensDetails(l=>({...l,lens_index:ix})); lookupLens(lensDetails.type,lensDetails.coating,'',ix,lensDetails.lens_company,lensDetails.color); }}
                  style={SEL}>
                  {LENS_INDEXES.map(i=><option key={i}>{i}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
              <Field label="Lens Type">
                <select value={lensDetails.type}
                  onChange={e=>{ const t=e.target.value; lookupLens(t,lensDetails.coating,'',lensDetails.lens_index,lensDetails.lens_company,lensDetails.color); }}
                  style={SEL}>
                  {LENS_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Coating">
                <select value={lensDetails.coating}
                  onChange={e=>{ const co=e.target.value; lookupLens(lensDetails.type,co,'',lensDetails.lens_index,lensDetails.lens_company,lensDetails.color); }}
                  style={SEL}>
                  {LENS_COATINGS.map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Tint / Color">
                <select value={lensDetails.color}
                  onChange={e=>{ const cl=e.target.value; setLensDetails(l=>({...l,color:cl})); lookupLens(lensDetails.type,lensDetails.coating,'',lensDetails.lens_index,lensDetails.lens_company,cl); }}
                  style={SEL}>
                  <option value="White">White (Clear)</option>
                  <option value="Photo-Gray">Photo-Gray</option>
                  <option value="Polarize">Polarize</option>
                </select>
              </Field>
            </div>
            {lensDetails.matched ? (
              <div style={{ background:lensDetails.matchSource==='db'?'#dbeafe':'#fef9c3', border:`1px solid ${lensDetails.matchSource==='db'?'#93c5fd':'#fde68a'}`, borderRadius:10, padding:'12px 16px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:lensDetails.matchSource==='db'?'#1e40af':'#92400e', marginBottom:4 }}>
                    {lensDetails.matchSource==='db' ? 'Price from your price list' : 'Supplier reference price'} · {lensDetails.matchedRange}
                  </div>
                  <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                    {lensDetails.buyPrice>0 && <span style={{ fontSize:13 }}>Buy: <b>{fmtMoney(lensDetails.buyPrice)}</b></span>}
                    <span style={{ fontSize:13 }}>Sell: <b>{fmtMoney(lensDetails.sellPrice)}</b></span>
                    {lensMargin!==null && lensDetails.buyPrice>0 && <span style={{ fontSize:13, color:lensMargin>=40?C.success:lensMargin>=20?'#b45309':C.danger, fontWeight:700 }}>{lensMargin}% margin</span>}
                  </div>
                </div>
                <button onClick={()=>setLensDetails(l=>({...l,matched:false}))}
                  style={{ fontSize:11, color:C.muted, background:'none', border:`1px solid ${C.border}`, borderRadius:6, padding:'4px 10px', cursor:'pointer', fontFamily:'inherit' }}>
                  Override
                </button>
              </div>
            ) : (
              <div style={{ background:'#fff7ed', border:`1px solid #fed7aa`, borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#c2410c' }}>
                No price match found — enter manually below or change supplier/coating/index
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <Field label="Buy Price (Rs.)">
                <input type="number" value={lensDetails.buyPrice} onChange={e=>setLensDetails(l=>({...l,buyPrice:parseFloat(e.target.value)||0,matched:true,matchSource:'manual'}))} style={INP}/>
              </Field>
              <Field label="Sell Price (Rs.)">
                <input type="number" value={lensDetails.sellPrice} onChange={e=>setLensDetails(l=>({...l,sellPrice:parseFloat(e.target.value)||0,matched:true,matchSource:'manual'}))} style={INP}/>
              </Field>
            </div>
            {lensDetails.type==='Progressive' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:12, background:'#e0f2fe', borderRadius:9, padding:'12px 14px' }}>
                <div style={{ gridColumn:'1/-1', fontSize:12, fontWeight:700, color:'#0369a1', marginBottom:4 }}>Segment Height (mm)</div>
                <Field label="Right Eye"><input type="number" value={segHeightR} onChange={e=>setSegHeightR(e.target.value)} placeholder="e.g. 20" style={INP}/></Field>
                <Field label="Left Eye"><input type="number"  value={segHeightL} onChange={e=>setSegHeightL(e.target.value)} placeholder="e.g. 20" style={INP}/></Field>
              </div>
            )}
          </Card>

          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
            <button onClick={()=>setStep(2)} style={{ padding:'11px 20px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>← Back</button>
            <button onClick={goNext} style={{ padding:'11px 28px', background:C.navy, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Next: Payment →</button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step===4 && (
        <div>
          <Card>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:C.navy }}>Payment & Delivery</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>Set prices, discounts and advance payment</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <button onClick={()=>{ setPastMode(p=>!p); setOrderDate(''); }}
                  style={{ padding:'7px 14px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                    border:`1.5px solid ${pastMode?'#b45309':C.border}`,
                    background:pastMode?'#fffbeb':'white', color:pastMode?'#b45309':C.muted }}>
                  {pastMode?'Backdating ON':'Entering a past order?'}
                </button>
                {pastMode && <input type="date" value={orderDate} onChange={e=>setOrderDate(e.target.value)}
                  style={{ padding:'7px 12px', border:`1.5px solid #f59e0b`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'#fffbeb', color:'#92400e' }}/>}
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle icon="🧾" title="Price Breakdown" sub="Adjust selling prices and apply discounts"/>
            {!customerOwnFrame && (
              <div style={{ background:C.cream, borderRadius:11, padding:'14px 16px', marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{frameDetails.name||'Frame'}</div>
                    <div style={{ fontSize:11, color:C.muted }}>{frameDetails.color} · {frameDetails.type}</div>
                  </div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:orderType==='frame_replace_free'?C.muted:C.navy }}>
                    {orderType==='frame_replace_free'?'Rs. 0':fmtMoney(frameFinal)}
                  </div>
                </div>
                {orderType!=='frame_replace_free' && (
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, minWidth:140 }}>
                      <span style={{ fontSize:11, color:C.muted, whiteSpace:'nowrap' }}>Sell price</span>
                      <input type="number" value={frameDetails.sellPrice} onChange={e=>setFrameDetails(f=>({...f,sellPrice:parseFloat(e.target.value)||0}))}
                        style={{ ...INP, padding:'7px 10px', fontSize:13 }}/>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, minWidth:120 }}>
                      <span style={{ fontSize:11, color:C.muted, whiteSpace:'nowrap' }}>Discount Rs.</span>
                      <input type="number" value={frameDetails.frameDiscount||''} onChange={e=>setFrameDetails(f=>({...f,frameDiscount:parseFloat(e.target.value)||0}))}
                        placeholder="0" style={{ ...INP, padding:'7px 10px', fontSize:13 }}/>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ background:'#f0f9ff', borderRadius:11, padding:'14px 16px', marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{lensDetails.type}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{lensDetails.coating} · {lensDetails.lens_company}{lensDetails.lens_index&&lensDetails.lens_index!=='Default'?` · ${lensDetails.lens_index}`:''}</div>
                </div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:orderType==='lens_warranty'?C.muted:C.navy }}>
                  {orderType==='lens_warranty'?'Rs. 0':fmtMoney(lensFinal)}
                </div>
              </div>
              {orderType!=='lens_warranty' && (
                <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, minWidth:140 }}>
                    <span style={{ fontSize:11, color:C.muted, whiteSpace:'nowrap' }}>Sell price</span>
                    <input type="number" value={lensDetails.sellPrice} onChange={e=>setLensDetails(l=>({...l,sellPrice:parseFloat(e.target.value)||0}))}
                      style={{ ...INP, padding:'7px 10px', fontSize:13 }}/>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, minWidth:120 }}>
                    <span style={{ fontSize:11, color:C.muted, whiteSpace:'nowrap' }}>Discount Rs.</span>
                    <input type="number" value={lensDetails.lensDiscount||''} onChange={e=>setLensDetails(l=>({...l,lensDiscount:parseFloat(e.target.value)||0}))}
                      placeholder="0" style={{ ...INP, padding:'7px 10px', fontSize:13 }}/>
                  </div>
                </div>
              )}
            </div>

            {/* Free gift items */}
            <div style={{ background:'#f0fdf4', border:`1px solid #86efac`, borderRadius:11, padding:'14px 16px', marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#166534', marginBottom:10 }}>Free Gift Items</div>
              <input value={invSearch} onChange={e=>{ setInvSearch(e.target.value); searchInventory(e.target.value); }}
                placeholder="Search: lens cleaner, chain, pouch..."
                style={{ ...INP, background:'white', border:`1.5px solid #86efac`, marginBottom:6 }}/>
              {invResults.length>0 && (
                <div style={{ background:'white', border:`1px solid #86efac`, borderRadius:7, marginBottom:6, overflow:'hidden', maxHeight:160, overflowY:'auto' }}>
                  {invResults.map(item=>(
                    <div key={item.id} onClick={()=>{ if(!freeItems.find(f=>f.inventory_id===item.id)) setFreeItems(p=>[...p,{inventory_id:item.id,name:item.name,qty:1,category:item.category,stock:item.quantity}]); setInvSearch(''); setInvResults([]); }}
                      style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', cursor:'pointer', borderBottom:`1px solid #f0fdf4`, fontSize:13 }}
                      onMouseEnter={e=>e.currentTarget.style.background='#f0fdf4'}
                      onMouseLeave={e=>e.currentTarget.style.background='white'}>
                      <span style={{ color:C.navy, fontWeight:600 }}>{item.name}</span>
                      <span style={{ color:C.muted, fontSize:11 }}>Stock: {item.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
              {freeItems.map((fi,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, background:'white', borderRadius:7, padding:'7px 11px', marginBottom:5 }}>
                  <span style={{ flex:1, fontSize:13, color:'#166534', fontWeight:600 }}>{fi.name}</span>
                  <input type="number" min="1" max={fi.stock} value={fi.qty}
                    onChange={e=>setFreeItems(p=>p.map((x,j)=>j===i?{...x,qty:parseInt(e.target.value)||1}:x))}
                    style={{ width:52, padding:'4px 8px', border:`1px solid #86efac`, borderRadius:6, fontSize:13, fontFamily:'inherit', textAlign:'center' }}/>
                  <span style={{ fontSize:11, color:C.muted }}>/{fi.stock}</span>
                  <button onClick={()=>setFreeItems(p=>p.filter((_,j)=>j!==i))}
                    style={{ background:'#fef2f2', color:C.danger, border:'none', borderRadius:5, padding:'3px 8px', cursor:'pointer', fontSize:12 }}>✕</button>
                </div>
              ))}
            </div>

            {/* Discount */}
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:11, padding:'14px 16px', marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10 }}>Discount</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:5 }}>Percentage (%)</div>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <input type="number" min="0" max="100" value={discountPct} onChange={e=>setDiscountPct(e.target.value)} placeholder="0"
                      style={{ ...INP, fontSize:18, fontWeight:700, textAlign:'center', padding:'10px' }}/>
                    <span style={{ fontSize:20, fontWeight:700, color:C.muted }}>%</span>
                  </div>
                  {parseFloat(discountPct)>0 && <div style={{ fontSize:12, color:C.danger, fontWeight:700, marginTop:4 }}>= -{fmtMoney(pctAmt)}</div>}
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:5 }}>Fixed Amount (Rs.)</div>
                  <input type="number" value={overallDiscount||''} onChange={e=>setOverallDiscount(e.target.value)} placeholder="0"
                    style={{ ...INP, fontSize:18, fontWeight:700, textAlign:'center', padding:'10px' }}/>
                  {rsAmt>0 && <div style={{ fontSize:12, color:C.danger, fontWeight:700, marginTop:4 }}>-{fmtMoney(rsAmt)}</div>}
                </div>
              </div>
            </div>

            <div style={{ background:C.navy, borderRadius:12, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.gold, marginBottom:2 }}>Order Total</div>
                {subTotal!==totalAmount && <div style={{ fontSize:11, color:'rgba(255,255,255,.5)' }}>Sub: {fmtMoney(subTotal)} − {fmtMoney(pctAmt+rsAmt)}</div>}
              </div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:'white' }}>{fmtMoney(totalAmount)}</div>
            </div>
          </Card>

          <Card>
            <SectionTitle icon="💵" title="Advance Payment" sub="Select payment method and record advance received"/>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:18 }}>
              {[
                { v:'cash', icon:'💵', label:'Cash',          sub:'Physical cash'   },
                { v:'bank', icon:'🏦', label:'Bank Transfer',  sub:'Pan Asia Bank'  },
                { v:'card', icon:'💳', label:'Card',           sub:'Debit / Credit' },
              ].map(pm=>(
                <button key={pm.v} onClick={()=>setPayMethod(pm.v)}
                  style={{ padding:'14px 10px', borderRadius:12, cursor:'pointer', fontFamily:'inherit',
                    border:`2px solid ${payMethod===pm.v?C.navy:C.border}`,
                    background:payMethod===pm.v?C.navy:'white', color:payMethod===pm.v?'white':C.muted,
                    display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <span style={{ fontSize:26 }}>{pm.icon}</span>
                  <span style={{ fontSize:13, fontWeight:700 }}>{pm.label}</span>
                  <span style={{ fontSize:10, opacity:.7 }}>{pm.sub}</span>
                </button>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:7 }}>Advance Amount (Rs.)</div>
                <input type="number" value={advance} onChange={e=>setAdvance(e.target.value)} placeholder="e.g. 3000"
                  style={{ ...INP, fontSize:18, fontWeight:700, marginBottom:8 }}/>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  <button onClick={()=>setAdvance(String(totalAmount))}
                    style={{ padding:'5px 11px', background:C.navy, color:'white', border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    Full ({fmtMoney(totalAmount)})
                  </button>
                  {[500,1000,2000,3000,5000].filter(v=>v<totalAmount).slice(0,3).map(v=>(
                    <button key={v} onClick={()=>setAdvance(String(v))}
                      style={{ padding:'5px 10px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:6, fontSize:11, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
                      {fmtMoney(v)}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ background:balanceAmount===0?'#dcfce7':C.cream, borderRadius:12, padding:'16px', display:'flex', flexDirection:'column', justifyContent:'center', border:`1px solid ${balanceAmount===0?'#86efac':C.border}` }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:balanceAmount===0?C.success:C.muted, marginBottom:6 }}>Balance Due</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:balanceAmount===0?C.success:C.navy }}>{fmtMoney(balanceAmount)}</div>
                {balanceAmount===0 && <div style={{ fontSize:12, color:C.success, marginTop:4, fontWeight:600 }}>Fully paid</div>}
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle icon="📦" title="Delivery & Notes" sub="Set delivery date and any internal notes"/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <Field label="Delivery Date *">
                <input type="date" value={deliverDate} onChange={e=>setDeliverDate(e.target.value)} style={INP}/>
              </Field>
            </div>
            <Field label="Internal Notes (optional)" span>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any notes about this order..." style={{ ...INP, resize:'vertical', minHeight:72, lineHeight:1.6 }}/>
            </Field>
          </Card>

          <Card style={{ background:C.cream }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:12 }}>Order Summary</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:13 }}>
              {[
                {l:'Customer',    v:custMode==='new'?`${newCust.title} ${newCust.name}`:selectedCust?.name},
                {l:'Order Type',  v:{normal:'Normal',lens_warranty:'Lens Free',lens_paid:'Lens Paid',frame_replace_free:'Frame Free',frame_replace_paid:'Frame Paid'}[orderType]},
                {l:'Frame',       v:customerOwnFrame?`${frameDetails.name} (Own)`:frameDetails.name||'—'},
                {l:'Lens',        v:`${lensDetails.type} · ${lensDetails.coating}`},
                {l:'Supplier',    v:lensDetails.lens_company},
                {l:'Frame price', v:customerOwnFrame?'No charge':fmtMoney(frameFinal)},
                {l:'Lens price',  v:fmtMoney(lensFinal)},
                ...freeItems.map(fi=>({l:`Gift: ${fi.name} x${fi.qty}`,v:'FREE',green:true})),
                ...(pctAmt>0?[{l:`Discount ${discountPct}%`,v:`-${fmtMoney(pctAmt)}`,red:true}]:[]),
                ...(rsAmt>0?[{l:'Discount Rs.',v:`-${fmtMoney(rsAmt)}`,red:true}]:[]),
                {l:'Total',       v:fmtMoney(totalAmount), bold:true},
                {l:'Advance',     v:`${fmtMoney(advanceAmt)} (${payMethod})`},
                {l:'Balance Due', v:fmtMoney(balanceAmount), red:balanceAmount>0},
                {l:'Delivery',    v:deliverDate?new Date(deliverDate+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'},
              ].map(item=>(
                <div key={item.l}>
                  <span style={{ color:C.muted, fontSize:12 }}>{item.l}: </span>
                  <b style={{ color:item.red?C.danger:item.green?C.success:item.bold?C.navy:'#374151' }}>{item.v||'—'}</b>
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginBottom:20 }}>
            <button onClick={()=>setStep(3)}
              style={{ padding:'11px 20px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
              Back
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:'12px 40px', background:saving?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:15, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {saving ? 'Saving...' : 'Save Order'}
            </button>
          </div>
        </div>
      )}

      {showScanner && <QRScanner title="Scan Frame Sticker" onScan={handleQRScan} onClose={()=>setShowScanner(false)} />}
    </div>
  );
}