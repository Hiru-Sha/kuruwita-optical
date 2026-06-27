/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// Dark mode handled internally — no external dep needed
import { QRScanner } from './QRStickers';

// ── All icons (inline SVG, no deps) ─────────────────────────
const I = ({ n, s=18, c='currentColor' }) => {
  const d = {
    dashboard:   <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    orders:      <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></>,
    sale:        <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.61h9.72a2 2 0 002-1.61L23 6H6"/></>,
    repairs:     <><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></>,
    customers:   <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>,
    inventory:   <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 001 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    reports:     <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    expenses:    <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
    settings:    <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    lens:        <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    calculator:  <><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="21" x2="8" y2="3"/><line x1="2" y1="9" x2="20" y2="9"/><line x1="2" y1="15" x2="8" y2="15"/></>,
    balance:     <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    rx:          <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    purchase:    <><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></>,
    walkin:      <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    lab:         <><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></>,
    eod:         <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    import:      <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    logout:      <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    menu:        <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    chevron:     <><polyline points="15 18 9 12 15 6"/></>,
    camera:      <><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></>,
    sun:         <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
    moon:        <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></>,
    shield:      <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    warranty:    <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    kalutota:    <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    grinding:    <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></>,
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {d[n] || d.menu}
    </svg>
  );
};

// ── Icon pill colours ────────────────────────────────────────
const PILL = {
  dashboard:  { bg:'rgba(201,168,76,.18)',  c:'#C9A84C'  },
  orders:     { bg:'rgba(37,99,235,.14)',   c:'#3B82F6'  },
  balance:    { bg:'rgba(239,68,68,.13)',   c:'#EF4444'  },
  sale:       { bg:'rgba(16,185,129,.13)',  c:'#10B981'  },
  repairs:    { bg:'rgba(8,145,178,.13)',   c:'#0EA5E9'  },
  customers:  { bg:'rgba(139,92,246,.13)', c:'#A78BFA'  },
  walkin:     { bg:'rgba(245,158,11,.13)', c:'#FBBF24'  },
  rx:         { bg:'rgba(236,72,153,.13)', c:'#F472B6'  },
  lab:        { bg:'rgba(20,184,166,.13)', c:'#2DD4BF'  },
  grinding:   { bg:'rgba(20,184,166,.13)', c:'#2DD4BF'  },
  warranty:   { bg:'rgba(34,197,94,.14)',  c:'#4ADE80'  },
  inventory:  { bg:'rgba(251,191,36,.15)', c:'#FCD34D'  },
  lens:       { bg:'rgba(167,139,250,.15)',c:'#A78BFA'  },
  calculator: { bg:'rgba(20,184,166,.13)', c:'#2DD4BF'  },
  purchase:   { bg:'rgba(37,99,235,.14)',  c:'#60A5FA'  },
  kalutota:   { bg:'rgba(239,68,68,.13)',  c:'#FCA5A5'  },
  reports:    { bg:'rgba(201,168,76,.14)', c:'#D4A847'  },
  expenses:   { bg:'rgba(239,68,68,.13)',  c:'#EF4444'  },
  eod:        { bg:'rgba(107,114,128,.13)',c:'#9CA3AF'  },
  import:     { bg:'rgba(16,185,129,.13)', c:'#34D399'  },
  settings:   { bg:'rgba(107,114,128,.13)',c:'#9CA3AF'  },
  shield:     { bg:'rgba(34,197,94,.14)',  c:'#4ADE80'  },
};

// ── Section definitions ──────────────────────────────────────
const SECTIONS = {
  main:      'Operations',
  inventory: 'Inventory',
  finance:   'Finance',
  account:   'Account',
};

const NAV = [
  { to:'/dashboard',      icon:'dashboard',  label:'Dashboard',     section:'main'                  },
  { to:'/orders',         icon:'orders',     label:'Orders',        section:'main'                  },
  { to:'/balance',        icon:'balance',    label:'Balance Due',   section:'main'                  },
  { to:'/quick-sale',     icon:'sale',       label:'Quick Sale',    section:'main'                  },
  { to:'/repairs',        icon:'repairs',    label:'Repairs',       section:'main'                  },
  { to:'/customers',      icon:'customers',  label:'Customers',     section:'main'                  },
  { to:'/walkin-rx',      icon:'walkin',     label:'Walk-in Rx',    section:'main'                  },
  { to:'/rx-tracker',     icon:'rx',         label:'Rx Tracker',    section:'main'                  },
  { to:'/grinding',       icon:'grinding',   label:'Grinding',      section:'main', roles:['admin'] },
  { to:'/lab-receivings', icon:'lab',        label:'Lab Receivings',section:'main', roles:['admin'] },
  { to:'/warranty',       icon:'shield',     label:'Warranty',      section:'main'                  },
  { to:'/inventory',      icon:'inventory',  label:'Inventory',     section:'inventory'             },
  { to:'/lens-prices',    icon:'lens',       label:'Lens Prices',   section:'inventory'             },
  { to:'/calculator',     icon:'calculator', label:'Calculator',    section:'inventory'             },
  { to:'/dealers',        icon:'purchase',   label:'Purchases',     section:'inventory'             },
  { to:'/kalutota',       icon:'kalutota',   label:'Kalutota A/C',  section:'inventory'             },
  { to:'/reports',        icon:'reports',    label:'Reports',       section:'finance', roles:['admin']},
  { to:'/expenses',       icon:'expenses',   label:'Expenses',      section:'finance', roles:['admin']},
  { to:'/end-of-day',     icon:'eod',        label:'End of Day',    section:'finance', roles:['admin']},
  { to:'/report-pdf',     icon:'rx',         label:'PDF Report',    section:'finance', roles:['admin']},
  { to:'/bulk-import',    icon:'import',     label:'Bulk Import',   section:'account', roles:['admin']},
  { to:'/settings',       icon:'settings',   label:'Settings',      section:'account'               },
];

const MOBILE_NAV = [
  { to:'/dashboard',  icon:'dashboard', label:'Home'    },
  { to:'/orders',     icon:'orders',    label:'Orders'  },
  { to:'/quick-sale', icon:'sale',      label:'Sale'    },
  { to:'/repairs',    icon:'repairs',   label:'Repairs' },
  { to:'/inventory',  icon:'inventory', label:'Stock'   },
];

// ── Page title lookup ────────────────────────────────────────
const PAGE_LABELS = {
  '/dashboard':'Dashboard','/orders':'Orders','/orders/new':'New Order',
  '/balance':'Balance Due','/quick-sale':'Quick Sale','/repairs':'Repairs',
  '/customers':'Customers','/walkin-rx':'Walk-in Rx','/rx-tracker':'Rx Tracker',
  '/lab-receivings':'Lab Receivings','/warranty':'Warranty','/grinding':'Grinding',
  '/inventory':'Inventory','/lens-prices':'Lens Prices','/calculator':'Calculator',
  '/dealers':'Purchases','/kalutota':'Kalutota A/C','/reports':'Reports',
  '/expenses':'Expenses','/end-of-day':'End of Day','/report-pdf':'PDF Report',
  '/bulk-import':'Bulk Import','/settings':'Settings','/activity':'Activity',
};

// ── Avatar helper ────────────────────────────────────────────
function Avatar({ name, size=32 }) {
  const initials = (name||'').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() || 'U';
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background:'linear-gradient(135deg,#C9A84C,#E8C96A)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size<32?10:12, fontWeight:700, color:'#0A1628',
      flexShrink:0, letterSpacing:'.03em', userSelect:'none',
    }}>
      {initials}
    </div>
  );
}

// ── Main Layout ──────────────────────────────────────────────
export default function Layout() {
  const { user, logout }   = useAuth();
  const [dark, setDark] = React.useState(() => {
    try { return localStorage.getItem('ko_theme') === 'dark'; } catch { return false; }
  });
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.body.classList.toggle('dark', dark);
    localStorage.setItem('ko_theme', dark ? 'dark' : 'light');
  }, [dark]);
  const toggle = () => setDark(d => !d);
  const navigate            = useNavigate();
  const location            = useLocation();
  const [collapsed, setColl]= useState(false);
  const [showQR,    setQR]  = useState(false);
  const [mobileQR,  setMQR] = useState(null);

  const role      = user?.role;
  const pageLabel = PAGE_LABELS[location.pathname] || 'Kuruwita Optical';

  // Visible nav items for this role
  const visibleNav = NAV.filter(n => !n.roles || n.roles.includes(role));

  // Group by section in order
  const SECTION_ORDER = ['main','inventory','finance','account'];
  const grouped = SECTION_ORDER.reduce((acc, s) => {
    const items = visibleNav.filter(n => n.section === s);
    if (items.length) acc[s] = items;
    return acc;
  }, {});

  const handleQRScan = id => {
    setQR(false);
    const numId = parseInt(id);
    if (!numId) return;
    // Try to resolve inventory item and navigate
    const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('ko_token');
    fetch(`${BASE}/inventory/${numId}`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r=>r.json())
      .then(item=>{
        if (item?.id) setMQR(item);
        else navigate(`/inventory?scan=${numId}`);
      })
      .catch(()=>navigate(`/inventory?scan=${numId}`));
  };

  return (
    <div className="ko-shell">

      {/* ── QR Scanner ─────────────────────────────────────── */}
      {showQR && <QRScanner title="Scan Item" onScan={handleQRScan} onClose={()=>setQR(false)}/>}

      {/* ── Scanned item quick actions ──────────────────────── */}
      {mobileQR && (
        <div className="modal-backdrop" onClick={()=>setMQR(null)}>
          <div className="modal-box animate-scale" onClick={e=>e.stopPropagation()}
            style={{maxWidth:380, padding:24}}>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--text-muted)',marginBottom:4}}>Scanned Item</div>
              <div style={{fontSize:17,fontWeight:600,color:'var(--text-primary)',fontFamily:'var(--font-display)'}}>{mobileQR.name}</div>
              <div style={{fontSize:13,color:'var(--text-secondary)',marginTop:2}}>
                {mobileQR.category} · Rs. {parseFloat(mobileQR.sell_price||0).toLocaleString()}
                <span style={{marginLeft:8,fontWeight:600,color:'var(--success)'}}>({mobileQR.quantity} in stock)</span>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[
                { label:'New Order', sub:'Full order + Rx', icon:'orders', fn:()=>{ navigate(`/orders/new?frame_id=${mobileQR.id}&frame_name=${encodeURIComponent(mobileQR.name)}&frame_price=${mobileQR.sell_price}`); setMQR(null); } },
                { label:'Quick Sale', sub:'Fast cash sale', icon:'sale', fn:()=>{ navigate(`/quick-sale?item_id=${mobileQR.id}&item_name=${encodeURIComponent(mobileQR.name)}&price=${mobileQR.sell_price}`); setMQR(null); } },
                { label:'View Item', sub:'See full details', icon:'inventory', fn:()=>{ navigate(`/inventory?scan=${mobileQR.id}`); setMQR(null); } },
                { label:'Adjust Stock', sub:'Change quantity', icon:'import', fn:()=>{ navigate(`/inventory?scan=${mobileQR.id}&tab=adjust`); setMQR(null); } },
              ].map(a=>(
                <button key={a.label} onClick={a.fn}
                  style={{
                    padding:'12px 10px', borderRadius:'var(--r-md)',
                    border:'1.5px solid var(--border)', background:'var(--bg-base)',
                    cursor:'pointer', fontFamily:'var(--font-body)', textAlign:'left',
                    transition:'all var(--t-fast)',
                  }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--gold)'; e.currentTarget.style.background='var(--gold-dim)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--bg-base)'; }}>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>{a.label}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{a.sub}</div>
                </button>
              ))}
            </div>
            <button onClick={()=>setMQR(null)}
              style={{width:'100%',marginTop:12,padding:'9px',background:'var(--bg-sunken)',border:'none',borderRadius:'var(--r-md)',fontSize:13,cursor:'pointer',fontFamily:'var(--font-body)',color:'var(--text-muted)'}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          SIDEBAR
         ════════════════════════════════════════════════════ */}
      <aside className={`ko-sidebar${collapsed?' collapsed':''}`}>

        {/* Logo area */}
        <div style={{
          padding:'20px 14px 16px',
          borderBottom:'1px solid var(--sidebar-border)',
          display:'flex', alignItems:'center', gap:11,
          flexShrink:0,
        }}>
          {/* Logo mark */}
          <div style={{
            width:36, height:36, borderRadius:10, flexShrink:0,
            background:'linear-gradient(135deg,#C9A84C,#E8C96A)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 2px 8px rgba(201,168,76,.4)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>
              <line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/>
            </svg>
          </div>
          {!collapsed && (
            <div style={{overflow:'hidden', animation:'slideLeft 200ms ease'}}>
              <div style={{fontSize:13.5, fontWeight:700, color:'#fff', lineHeight:1.2, whiteSpace:'nowrap'}}>
                Kuruwita Optical
              </div>
              <div style={{fontSize:10, color:'rgba(201,168,76,.75)', marginTop:1, whiteSpace:'nowrap', letterSpacing:'.04em'}}>
                Management System
              </div>
            </div>
          )}
        </div>

        {/* Nav sections (scrollable) */}
        <div style={{flex:1, overflowY:'auto', overflowX:'hidden', padding:'10px 8px'}}>
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section}>
              {!collapsed && (
                <div className="ko-section-label">{SECTIONS[section]}</div>
              )}
              {collapsed && <div style={{height:8}}/>}
              {items.map(item => {
                const pill = PILL[item.icon] || { bg:'rgba(255,255,255,.1)', c:'rgba(255,255,255,.6)' };
                return (
                  <NavLink key={item.to} to={item.to} className={({isActive})=>`ko-nav-link${isActive?' active':''}`}
                    title={collapsed ? item.label : undefined}
                    style={{marginBottom:2}}>
                    <span className="ko-nav-icon" style={{background:pill.bg}}>
                      <I n={item.icon} s={15} c={pill.c}/>
                    </span>
                    {!collapsed && (
                      <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom — user + collapse */}
        <div style={{
          padding:'10px 8px',
          borderTop:'1px solid var(--sidebar-border)',
          flexShrink:0,
        }}>
          {/* User row */}
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            padding:'8px 10px', borderRadius:'var(--r-sm)',
            marginBottom:8,
            overflow:'hidden',
          }}>
            <Avatar name={user?.full_name} size={30}/>
            {!collapsed && (
              <div style={{overflow:'hidden', flex:1, minWidth:0}}>
                <div style={{fontSize:12, fontWeight:600, color:'rgba(255,255,255,.85)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                  {user?.full_name || 'User'}
                </div>
                <div style={{fontSize:10, color:'rgba(201,168,76,.7)', textTransform:'capitalize'}}>
                  {user?.role || 'Staff'}
                </div>
              </div>
            )}
            {!collapsed && (
              <button onClick={logout} title="Sign out"
                style={{background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.35)', padding:4, borderRadius:6, flexShrink:0, transition:'color 120ms'}}
                onMouseEnter={e=>e.currentTarget.style.color='#EF4444'}
                onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,.35)'}>
                <I n="logout" s={15}/>
              </button>
            )}
          </div>

          {/* Collapse toggle */}
          <button onClick={()=>setColl(c=>!c)}
            className="ko-nav-link"
            style={{justifyContent: collapsed?'center':'flex-start', marginBottom:0}}>
            <span className="ko-nav-icon" style={{background:'rgba(255,255,255,.07)', transform:collapsed?'rotate(180deg)':'none', transition:'transform 200ms'}}>
              <I n="chevron" s={15} c="rgba(255,255,255,.4)"/>
            </span>
            {!collapsed && <span style={{color:'rgba(255,255,255,.35)', fontSize:12}}>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════
          MAIN AREA
         ════════════════════════════════════════════════════ */}
      <div className="ko-main">

        {/* ── Topbar ─────────────────────────────────────── */}
        <header className="ko-topbar">

          {/* Page title */}
          <div style={{flex:1, minWidth:0}}>
            <div style={{
              fontSize:15, fontWeight:600,
              color:'var(--text-primary)',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              fontFamily:'var(--font-display)',
            }}>
              {pageLabel}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{display:'flex', alignItems:'center', gap:6}}>

            {/* Camera / QR scan */}
            <button className="ko-topbar-btn" onClick={()=>setQR(true)} title="Scan QR code">
              <I n="camera" s={17}/>
            </button>

            {/* Dark mode toggle */}
            <div style={{display:'flex', alignItems:'center', gap:7, marginLeft:4}}>
              <I n={dark?'moon':'sun'} s={14} c="var(--text-muted)"/>
              <button
                className={`ko-toggle${dark?' on':''}`}
                onClick={toggle}
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              />
            </div>

            {/* Avatar + name */}
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'4px 8px 4px 4px',
              border:'1px solid var(--border)',
              borderRadius:'var(--r-full)',
              background:'var(--bg-surface)',
              cursor:'pointer', marginLeft:4,
              transition:'all var(--t-fast)',
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--gold)';e.currentTarget.style.boxShadow='0 0 0 2px var(--gold-dim)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.boxShadow='none';}}
              onClick={()=>navigate('/settings')}>
              <Avatar name={user?.full_name} size={28}/>
              <span style={{fontSize:12, fontWeight:600, color:'var(--text-primary)', whiteSpace:'nowrap', paddingRight:2}}>
                {user?.full_name?.split(' ')[0] || 'User'}
              </span>
              <span className="badge badge-gold" style={{fontSize:9, padding:'1px 6px'}}>
                {user?.role || 'staff'}
              </span>
            </div>
          </div>
        </header>

        {/* ── Page content ───────────────────────────────── */}
        <main className="ko-content page-enter">
          <Outlet/>
        </main>

        {/* ── Mobile bottom nav ──────────────────────────── */}
        <nav className="ko-mobile-nav">
          {MOBILE_NAV.map(item => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to+'/');
            const pill   = PILL[item.icon] || { bg:'transparent', c:'var(--text-muted)' };
            return (
              <NavLink key={item.to} to={item.to}
                style={{
                  flex:1, display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center',
                  gap:3, padding:'8px 0',
                  color: active ? 'var(--gold)' : 'var(--text-muted)',
                  textDecoration:'none', fontSize:10, fontWeight: active?700:500,
                  transition:'color var(--t-fast)',
                }}>
                <div style={{
                  width:32, height:32, borderRadius:'var(--r-sm)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: active ? pill.bg : 'transparent',
                  transition:'background var(--t-fast)',
                }}>
                  <I n={item.icon} s={18} c={active ? pill.c : 'var(--text-muted)'}/>
                </div>
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}