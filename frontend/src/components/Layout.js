/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QRScanner } from './QRStickers';

// ── Icons (inline SVG — no emoji, no deps) ──────────────────
const Icon = ({ name, size=18, color='currentColor' }) => {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    orders:    <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></>,
    sale:      <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></>,
    repairs:   <><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></>,
    customers: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>,
    inventory: <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 001 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    reports:   <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    expenses:  <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
    settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    lens:      <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    calculator:<><rect x="2" y="3" width="20" height="18" rx="2" ry="2"/><line x1="8" y1="21" x2="8" y2="3"/><line x1="2" y1="9" x2="20" y2="9"/><line x1="2" y1="15" x2="8" y2="15"/></>,
    balance:   <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    rx:        <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
    purchase:  <><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></>,
    logout:    <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    menu:      <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    close:     <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    camera:    <><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></>,
    sun:       <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
    moon:      <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></>,
    more:      <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    walkin:    <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    lab:       <><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></>,
    eod:       <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    import:    <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || icons.more}
    </svg>
  );
};

// Colour map for each nav icon — bg + icon color
const NAV_COLORS = {
  dashboard:  { bg:'rgba(15,31,61,.1)',   color:'#0f1f3d' },
  orders:     { bg:'rgba(37,99,235,.12)', color:'#2563eb' },
  balance:    { bg:'rgba(220,38,38,.1)',  color:'#dc2626' },
  sale:       { bg:'rgba(22,163,74,.12)', color:'#16a34a' },
  repairs:    { bg:'rgba(8,145,178,.12)', color:'#0891b2' },
  customers:  { bg:'rgba(124,58,237,.1)', color:'#7c3aed' },
  walkin:     { bg:'rgba(180,83,9,.1)',   color:'#b45309' },
  rx:         { bg:'rgba(190,24,93,.1)',  color:'#be185d' },
  lab:        { bg:'rgba(15,118,110,.1)', color:'#0f766e' },
  inventory:  { bg:'rgba(217,119,6,.12)',  color:'#d97706' },
  lens:       { bg:'rgba(139,92,246,.12)',color:'#8b5cf6' },
  calculator: { bg:'rgba(15,118,110,.12)',color:'#0f766e' },
  purchase:   { bg:'rgba(37,99,235,.1)',  color:'#2563eb' },
  reports:    { bg:'rgba(15,31,61,.1)',   color:'#0f1f3d' },
  expenses:   { bg:'rgba(220,38,38,.1)',  color:'#dc2626' },
  eod:        { bg:'rgba(107,114,128,.1)',color:'#6b7280' },
  import:     { bg:'rgba(22,163,74,.1)',  color:'#16a34a' },
  settings:   { bg:'rgba(107,114,128,.1)',color:'#6b7280' },
};

const NAV = [
  { to:'/dashboard',       icon:'dashboard',  label:'Dashboard',     section:'main'      },
  { to:'/orders',          icon:'orders',     label:'Orders',        section:'main'      },
  { to:'/balance',         icon:'balance',    label:'Balance Due',   section:'main'      },
  { to:'/quick-sale',      icon:'sale',       label:'Quick Sale',    section:'main'      },
  { to:'/repairs',         icon:'repairs',    label:'Repairs',       section:'main'      },
  { to:'/customers',       icon:'customers',  label:'Customers',     section:'main'      },
  { to:'/walkin-rx',       icon:'walkin',     label:'Walk-in Rx',    section:'main'      },
  { to:'/rx-tracker',      icon:'rx',         label:'Rx Tracker',    section:'main'      },
  { to:'/grinding',        icon:'lab',        label:'Grinding',      section:'main',     roles:['admin'] },
  { to:'/lab-receivings',  icon:'lab',        label:'Lab Receivings',section:'main',     roles:['admin'] },
  { to:'/inventory',       icon:'inventory',  label:'Inventory',     section:'inventory' },
  { to:'/lens-prices',     icon:'lens',       label:'Lens Prices',   section:'inventory' },
  { to:'/calculator',      icon:'calculator', label:'Calculator',    section:'inventory' },
  { to:'/dealers',         icon:'purchase',   label:'Purchases',     section:'inventory' },
  { to:'/kalutota',        icon:'balance',    label:'Kalutota A/C',  section:'inventory' },
  { to:'/reports',         icon:'reports',    label:'Reports',       section:'finance',  roles:['admin'] },
  { to:'/expenses',        icon:'expenses',   label:'Expenses',      section:'finance',  roles:['admin'] },
  { to:'/end-of-day',      icon:'eod',        label:'End of Day',    section:'finance',  roles:['admin'] },
  { to:'/report-pdf',      icon:'rx',         label:'PDF Report',    section:'finance',  roles:['admin'] },
  { to:'/bulk-import',     icon:'import',     label:'Bulk Import',   section:'account',  roles:['admin'] },
  { to:'/settings',        icon:'settings',   label:'Settings',      section:'account'   },
];

const SECTIONS = {
  main:      'Operations',
  inventory: 'Inventory',
  finance:   'Finance & Reports',
  account:   'Account',
};

const BOTTOM_NAV = [
  { to:'/dashboard',  icon:'dashboard', label:'Home'    },
  { to:'/orders',     icon:'orders',    label:'Orders'  },
  { to:'/quick-sale', icon:'sale',      label:'Sale'    },
  { to:'/repairs',    icon:'repairs',   label:'Repairs' },
  { to:'/inventory',  icon:'inventory', label:'Stock'   },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open,     setOpen]     = useState(false);
  const [mob,      setMob]      = useState(window.innerWidth < 768);
  const [showScan, setShowScan] = useState(false);
  const [scanMsg,  setScanMsg]  = useState('');
  const role = user?.role || 'admin';

  const [dark, setDark] = useState(() => localStorage.getItem('ko_theme') === 'dark');
  useEffect(() => {
    document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('ko_theme', dark ? 'dark' : 'light');
  }, [dark]);
  useEffect(() => { document.body.setAttribute('data-theme', dark ? 'dark' : 'light'); }, []);

  const [mobileScanned, setMobileScanned] = useState(null);
  useEffect(() => {
    const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('ko_token');
    if (!token) return;
    const poll = setInterval(async () => {
      try {
        const res  = await fetch(`${BASE}/scan-session`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.pending && data.item) {
          await fetch(`${BASE}/scan-session`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          setMobileScanned({ item: data.item, action: data.action });
        }
      } catch (e) {}
    }, 2000);
    return () => clearInterval(poll);
  }, []);

  const handleGlobalScan = async (rawId) => {
    setShowScan(false);
    const id = parseInt(rawId);
    if (!id) { setScanMsg('Invalid QR'); return; }
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/inventory/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const item  = await res.json();
      if (!item?.id) throw new Error('Not found');
      setScanMsg('');
      navigate(`/inventory?scan=${item.id}`);
    } catch (e) {
      setScanMsg('Item not found');
      setTimeout(() => setScanMsg(''), 3000);
    }
  };

  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // Close sidebar on navigation (mobile)
  useEffect(() => { if (mob) setOpen(false); }, [location.pathname]);

  const visibleNav = NAV.filter(n => !n.roles || n.roles.includes(role));

  // Current page label
  const currentPage = visibleNav.find(n => location.pathname.startsWith(n.to))?.label || '';

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:"'Inter','DM Sans',sans-serif", background:'var(--bg)', color:'var(--text)' }}>

      {/* ── Sidebar ── */}
      <>
        {/* Backdrop */}
        {open && (
          <div onClick={() => setOpen(false)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:40, backdropFilter:'blur(2px)' }}/>
        )}

        <aside style={{
          width: 240,
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          position: 'fixed', top:0, left:0, bottom:0,
          zIndex: 50,
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : mob ? 'translateX(-100%)' : 'translateX(-100%)',
          transition: 'transform .22s cubic-bezier(.4,0,.2,1)',
          boxShadow: open ? '8px 0 32px rgba(0,0,0,.12)' : 'none',
          overflowY: 'auto',
        }}>
          {/* Sidebar header */}
          <div style={{ padding:'20px 16px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={()=>{ navigate('/dashboard'); setOpen(false); }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#0f1f3d,#1a3560)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M20.188 10.934a8 8 0 11-16.376 0M12 2v2M12 20v2"/>
                </svg>
              </div>
              <div>
                <div onClick={()=>navigate('/dashboard')} style={{ fontSize:13, fontWeight:700, color:'var(--text)', fontFamily:"'Playfair Display',serif", cursor:'pointer' }}>Kuruwita Optical</div>
                <div style={{ fontSize:10, color:'var(--muted)', letterSpacing:'1px', textTransform:'uppercase' }}>Management</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', padding:4, borderRadius:6, display:'flex' }}>
              <Icon name="close" size={16}/>
            </button>
          </div>

          {/* User pill */}
          <div style={{ margin:'12px 12px 8px', background:'var(--cream)', borderRadius:10, padding:'10px 12px', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'#0f1f3d', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#c9a84c', flexShrink:0 }}>
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name}</div>
              <div style={{ fontSize:10, color:'var(--muted)', textTransform:'capitalize' }}>{role}</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex:1, padding:'4px 8px' }}>
            {Object.entries(SECTIONS).map(([sk, sl]) => {
              const items = visibleNav.filter(n => n.section === sk);
              if (!items.length) return null;
              return (
                <div key={sk} style={{ marginBottom:8 }}>
                  <div style={{ padding:'10px 8px 5px', fontSize:9.5, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'1.5px' }}>{sl}</div>
                  {items.map(n => (
                    <NavLink key={n.to} to={n.to}
                      style={({ isActive }) => ({
                        display: 'flex', alignItems: 'center', gap:10,
                        padding: '8px 10px', borderRadius: 9, marginBottom:2,
                        textDecoration: 'none', fontSize:13,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#0f1f3d' : 'var(--text)',
                        background: isActive ? '#c9a84c' : 'transparent',
                        transition: 'all .12s',
                      })}>
                      {({ isActive }) => (
                        <>
                          <span style={{
                            width:28, height:28, borderRadius:7, flexShrink:0,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            background: isActive ? 'rgba(15,31,61,.2)' : NAV_COLORS[n.icon]?.bg || 'rgba(107,114,128,.1)',
                            transition:'all .12s',
                          }}>
                            <Icon name={n.icon} size={14} color={isActive ? '#0f1f3d' : (NAV_COLORS[n.icon]?.color || 'var(--muted)')}/>
                          </span>
                          {n.label}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div style={{ padding:'12px 8px', borderTop:'1px solid var(--border)' }}>
            <button onClick={() => { logout(); navigate('/login'); }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'none', border:'none', borderRadius:8, cursor:'pointer', color:'var(--muted)', fontSize:13, fontFamily:'inherit', transition:'all .12s' }}
              onMouseEnter={e => { e.currentTarget.style.background='#fee2e2'; e.currentTarget.style.color='#c0392b'; }}
              onMouseLeave={e => { e.currentTarget.style.background=''; e.currentTarget.style.color=''; }}>
              <Icon name="logout" size={15}/>
              Sign Out
            </button>
          </div>
        </aside>
      </>

      {/* ── Main area ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>

        {/* ── Top header ── */}
        <header style={{
          height: 56, background:'var(--surface)', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 16px', position:'sticky', top:0, zIndex:30,
          backdropFilter:'blur(8px)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={() => setOpen(o => !o)}
              style={{ width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--cream)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', color:'var(--text)', transition:'all .12s', flexShrink:0 }}>
              <Icon name="menu" size={16}/>
            </button>
            {/* Breadcrumb */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, background:'linear-gradient(135deg,#0f1f3d,#1a3560)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M20.188 10.934a8 8 0 11-16.376 0"/>
                </svg>
              </div>
              {!mob && <span style={{ fontSize:13, color:'var(--muted)' }}>Kuruwita Optical</span>}
              {!mob && currentPage && <span style={{ color:'var(--muted)' }}>/</span>}
              {currentPage && <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{currentPage}</span>}
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {/* QR scan */}
            <button onClick={() => setShowScan(true)} title="Scan QR sticker"
              style={{ width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--cream)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', color:'var(--muted)' }}>
              <Icon name="camera" size={16}/>
            </button>
            {/* Dark mode */}
            <button onClick={() => setDark(d => !d)} title={dark ? 'Light mode' : 'Dark mode'}
              style={{ width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--cream)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', color:'var(--muted)' }}>
              <Icon name={dark ? 'sun' : 'moon'} size={16}/>
            </button>
            {/* User avatar */}
            {!mob && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 10px', background:'var(--cream)', border:'1px solid var(--border)', borderRadius:8 }}>
                <div style={{ width:24, height:24, borderRadius:6, background:'#0f1f3d', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#c9a84c' }}>
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{user?.name}</span>
                <span style={{ fontSize:10, background:'var(--cream)', border:'1px solid var(--border)', borderRadius:20, padding:'1px 6px', color:'var(--muted)', textTransform:'capitalize' }}>{role}</span>
              </div>
            )}
            {/* Logout */}
            <button onClick={() => { logout(); navigate('/login'); }}
              style={{ height:36, display:'flex', alignItems:'center', gap:6, padding:'0 12px', background:'var(--cream)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', color:'var(--muted)', fontSize:13, fontFamily:'inherit', transition:'all .12s' }}
              onMouseEnter={e => { e.currentTarget.style.background='#fee2e2'; e.currentTarget.style.color='#c0392b'; e.currentTarget.style.borderColor='#fca5a5'; }}
              onMouseLeave={e => { e.currentTarget.style.background=''; e.currentTarget.style.color=''; e.currentTarget.style.borderColor=''; }}>
              <Icon name="logout" size={14}/>
              {!mob && 'Sign Out'}
            </button>
          </div>
        </header>

        {/* ── Page content ── */}
        <main style={{
          flex: 1,
          padding: mob ? '16px 12px 100px' : '24px 28px',
          minWidth: 0,
          overflowX: 'hidden',
        }}>
          <Outlet/>
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      {mob && (
        <nav style={{
          position:'fixed', bottom:0, left:0, right:0,
          background:'var(--surface)', borderTop:'1px solid var(--border)',
          display:'flex', zIndex:90,
          paddingBottom:'env(safe-area-inset-bottom)',
          boxShadow:'0 -4px 20px rgba(0,0,0,.08)',
        }}>
          {BOTTOM_NAV.map(n => (
            <NavLink key={n.to} to={n.to}
              style={({ isActive }) => ({
                flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                gap:3, textDecoration:'none', padding:'10px 0',
                color: isActive ? '#0f1f3d' : '#9ca3af',
                borderTop: isActive ? '2px solid #c9a84c' : '2px solid transparent',
                transition:'all .12s', fontSize:10, fontWeight: isActive ? 700 : 400,
              })}>
              {({ isActive }) => (
                <>
                  <Icon name={n.icon} size={19} color={isActive ? '#0f1f3d' : '#9ca3af'}/>
                  <span>{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button onClick={() => setOpen(true)}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, background:'none', border:'none', borderTop:'2px solid transparent', color:'#9ca3af', fontSize:10, cursor:'pointer', padding:'10px 0' }}>
            <Icon name="more" size={19} color="#9ca3af"/>
            More
          </button>
        </nav>
      )}

      {/* ── Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }

        :root {
          --bg:          #f4f4f6;
          --surface:     #ffffff;
          --sidebar-bg:  #ffffff;
          --navy:        #0f1f3d;
          --gold:        #c9a84c;
          --border:      #e5e5ea;
          --muted:       #6b7280;
          --text:        #111827;
          --cream:       #f9f9fb;
          --danger:      #dc2626;
          --success:     #16a34a;
        }
        [data-theme="dark"] {
          --bg:          #0f1117;
          --surface:     #1a1d27;
          --sidebar-bg:  #1a1d27;
          --navy:        #e8c96a;
          --gold:        #c9a84c;
          --border:      #2d2f3e;
          --muted:       #6b7280;
          --text:        #e2e8f0;
          --cream:       #1a1d27;
          --danger:      #f87171;
          --success:     #4ade80;
        }
        body { margin:0; background:var(--bg); color:var(--text); font-family:'Inter','DM Sans',sans-serif; transition:background .2s,color .2s; -webkit-font-smoothing:antialiased; }

        /* Scrollbar */
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:var(--border); border-radius:10px; }
        ::-webkit-scrollbar-thumb:hover { background:var(--muted); }

        /* Dark mode inputs */
        [data-theme="dark"] input, [data-theme="dark"] select, [data-theme="dark"] textarea {
          background:#0f1117 !important; color:#e2e8f0 !important; border-color:#2d2f3e !important;
        }
        [data-theme="dark"] input::placeholder { color:#4b5563 !important; }

        /* Mobile touch */
        @media(max-width:768px){
          button,select,input,textarea { min-height:44px; font-size:15px !important; }
          * { touch-action:manipulation; }
        }

        /* Nav hover fix */
        nav a:hover { color:var(--text) !important; }
        nav a:hover span { opacity:1 !important; }

        /* Dark mode nav fix — ensure sidebar text always visible */
        [data-theme="dark"] aside { background:#1a1d27 !important; }
        [data-theme="dark"] aside nav a { color:#e2e8f0 !important; }
        [data-theme="dark"] aside nav a[style*="background: #c9a84c"] { color:#0f1f3d !important; }
        [data-theme="dark"] aside .section-label { color:#6b7280 !important; }
      `}</style>

      {/* QR Scanner */}
      {showScan && (
        <QRScanner title="Scan Frame Sticker" onScan={handleGlobalScan} onClose={() => setShowScan(false)}/>
      )}

      {/* Scan toast */}
      {scanMsg && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#fee2e2', color:'#c0392b', border:'1px solid #fca5a5', padding:'10px 20px', borderRadius:10, fontSize:13, fontWeight:600, zIndex:9999 }}>
          {scanMsg}
        </div>
      )}

      {/* Mobile scan popup */}
      {mobileScanned && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}
          onClick={() => setMobileScanned(null)}>
          <div style={{ background:'var(--surface)', borderRadius:20, padding:28, maxWidth:420, width:'100%', boxShadow:'0 24px 60px rgba(0,0,0,.3)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:'#dcfce7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon name="camera" size={20} color="#16a34a"/>
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>Frame Scanned</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>What would you like to do?</div>
              </div>
            </div>
            <div style={{ background:'var(--cream)', borderRadius:12, padding:'12px 16px', marginBottom:16, border:'1px solid var(--border)' }}>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:4 }}>{mobileScanned.item.name}</div>
              <div style={{ display:'flex', gap:16, fontSize:13, color:'var(--muted)' }}>
                <span>Rs.{parseFloat(mobileScanned.item.sell_price||0).toLocaleString()}</span>
                <span style={{ color: mobileScanned.item.quantity > 0 ? '#16a34a' : '#dc2626', fontWeight:600 }}>{mobileScanned.item.quantity} in stock</span>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { label:'New Order', sub:'Full order with customer & Rx', color:'#0f1f3d', icon:'orders', fn:()=>{ navigate(`/orders/new?frame_id=${mobileScanned.item.id}&frame_name=${encodeURIComponent(mobileScanned.item.name)}&frame_price=${mobileScanned.item.sell_price}`); setMobileScanned(null); } },
                { label:'Quick Sale', sub:'Fast cash sale', color:'#16a34a', icon:'sale', fn:()=>{ navigate(`/quick-sale?item_id=${mobileScanned.item.id}&item_name=${encodeURIComponent(mobileScanned.item.name)}&price=${mobileScanned.item.sell_price}`); setMobileScanned(null); } },
              ].map(a=>(
                <button key={a.label} onClick={a.fn}
                  style={{ padding:'12px 16px', background:a.color, color:'white', border:'none', borderRadius:12, fontSize:14, fontWeight:600, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:12, fontFamily:'inherit' }}>
                  <Icon name={a.icon} size={18} color="white"/>
                  <div><div>{a.label}</div><div style={{ fontSize:11, fontWeight:400, opacity:.8 }}>{a.sub}</div></div>
                </button>
              ))}
              <button onClick={() => setMobileScanned(null)}
                style={{ padding:'10px', background:'none', border:'1px solid var(--border)', borderRadius:10, fontSize:13, color:'var(--muted)', cursor:'pointer', fontFamily:'inherit' }}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}