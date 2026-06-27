/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QRScanner } from './QRStickers';

const Icon = ({ name, size=16, color='currentColor' }) => {
  const paths = {
    dashboard:  <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    orders:     <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></>,
    balance:    <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    sale:       <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></>,
    repairs:    <><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></>,
    customers:  <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>,
    inventory:  <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 001 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    lens:       <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    calculator: <><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="21" x2="8" y2="3"/><line x1="2" y1="9" x2="20" y2="9"/><line x1="2" y1="15" x2="8" y2="15"/></>,
    purchase:   <><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></>,
    reports:    <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    expenses:   <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
    settings:   <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    rx:         <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
    lab:        <><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></>,
    walkin:     <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    eod:        <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    import:     <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    logout:     <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    menu:       <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    close:      <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    camera:     <><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></>,
    sun:        <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
    moon:       <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></>,
    more:       <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || paths.more}
    </svg>
  );
};

const ACCENT = {
  dashboard:'#c9a84c',orders:'#3b82f6',balance:'#ef4444',sale:'#10b981',
  repairs:'#0ea5e9',customers:'#8b5cf6',walkin:'#f59e0b',rx:'#ec4899',
  lab:'#14b8a6',inventory:'#f97316',lens:'#a78bfa',calculator:'#0d9488',
  purchase:'#6366f1',reports:'#94a3b8',expenses:'#f43f5e',eod:'#6b7280',
  import:'#22c55e',settings:'#9ca3af',
};

const NAV = [
  { to:'/dashboard',      icon:'dashboard',  label:'Dashboard',      section:'main'      },
  { to:'/orders',         icon:'orders',     label:'Orders',         section:'main'      },
  { to:'/balance',        icon:'balance',    label:'Balance Due',    section:'main'      },
  { to:'/quick-sale',     icon:'sale',       label:'Quick Sale',     section:'main'      },
  { to:'/repairs',        icon:'repairs',    label:'Repairs',        section:'main'      },
  { to:'/customers',      icon:'customers',  label:'Customers',      section:'main'      },
  { to:'/walkin-rx',      icon:'walkin',     label:'Walk-in Rx',     section:'main'      },
  { to:'/rx-tracker',     icon:'rx',         label:'Rx Tracker',     section:'main'      },
  { to:'/grinding',       icon:'lab',        label:'Grinding',       section:'main',     roles:['admin'] },
  { to:'/lab-receivings', icon:'lab',        label:'Lab Receivings', section:'main',     roles:['admin'] },
  { to:'/inventory',      icon:'inventory',  label:'Inventory',      section:'inventory' },
  { to:'/lens-prices',    icon:'lens',       label:'Lens Prices',    section:'inventory' },
  { to:'/calculator',     icon:'calculator', label:'Calculator',     section:'inventory' },
  { to:'/dealers',        icon:'purchase',   label:'Purchases',      section:'inventory' },
  { to:'/kalutota',       icon:'balance',    label:'Kalutota A/C',   section:'inventory' },
  { to:'/reports',        icon:'reports',    label:'Reports',        section:'finance',  roles:['admin'] },
  { to:'/expenses',       icon:'expenses',   label:'Expenses',       section:'finance',  roles:['admin'] },
  { to:'/end-of-day',     icon:'eod',        label:'End of Day',     section:'finance',  roles:['admin'] },
  { to:'/report-pdf',     icon:'rx',         label:'PDF Report',     section:'finance',  roles:['admin'] },
  { to:'/bulk-import',    icon:'import',     label:'Bulk Import',    section:'account',  roles:['admin'] },
  { to:'/settings',       icon:'settings',   label:'Settings',       section:'account'   },
];
const SECTIONS = { main:null, inventory:'Inventory', finance:'Finance & Reports', account:'Account' };
const BOTTOM_NAV = [
  {to:'/dashboard',icon:'dashboard',label:'Home'},
  {to:'/orders',icon:'orders',label:'Orders'},
  {to:'/quick-sale',icon:'sale',label:'Sale'},
  {to:'/repairs',icon:'repairs',label:'Repairs'},
  {to:'/inventory',icon:'inventory',label:'Stock'},
];
const W = 244;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role || 'admin';
  const [mob,setMob] = useState(()=>window.innerWidth<768);
  const [open,setOpen] = useState(false);
  const [showScan,setShowScan] = useState(false);
  const [dark,setDark] = useState(()=>localStorage.getItem('ko_theme')==='dark');

  useEffect(()=>{ document.body.setAttribute('data-theme',dark?'dark':'light'); localStorage.setItem('ko_theme',dark?'dark':'light'); },[dark]);
  useEffect(()=>{ document.body.setAttribute('data-theme',dark?'dark':'light'); },[]);
  useEffect(()=>{ const fn=()=>setMob(window.innerWidth<768); window.addEventListener('resize',fn); return ()=>window.removeEventListener('resize',fn); },[]);
  useEffect(()=>{ if(mob) setOpen(false); },[location.pathname]);

  const navItems = NAV.filter(n=>!n.roles||n.roles.includes(role));
  const currentPage = navItems.find(n=>location.pathname.startsWith(n.to))?.label||'';

  const handleScan = async (rawId) => {
    setShowScan(false);
    const id=parseInt(rawId); if(!id) return;
    try {
      const BASE=process.env.REACT_APP_API_URL||'http://localhost:5000/api';
      const token=localStorage.getItem('ko_token');
      const res=await fetch(`${BASE}/inventory/${id}`,{headers:{Authorization:`Bearer ${token}`}});
      const item=await res.json();
      if(item?.id) navigate(`/inventory?scan=${item.id}`);
    } catch(e){}
  };

  const SidebarInner = ()=>(
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {/* Logo */}
      <div style={{padding:'20px 16px 16px',borderBottom:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',gap:10,cursor:'pointer',flexShrink:0}} onClick={()=>{navigate('/dashboard');setOpen(false);}}>
        <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#c9a84c,#e8c96a)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 12px rgba(201,168,76,.4)',flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/></svg>
        </div>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:'#fff',fontFamily:"'Playfair Display',serif"}}>Kuruwita Optical</div>
          <div style={{fontSize:9,color:'rgba(201,168,76,.7)',letterSpacing:'1.5px',textTransform:'uppercase'}}>Management System</div>
        </div>
      </div>
      {/* User */}
      <div style={{margin:'10px 12px 6px',background:'rgba(255,255,255,.06)',borderRadius:9,padding:'9px 12px',display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#c9a84c,#e8c96a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#0A1628',flexShrink:0}}>
          {(user?.name||user?.full_name||'?').charAt(0).toUpperCase()}
        </div>
        <div style={{minWidth:0}}>
          <div style={{fontSize:12,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name||user?.full_name||'User'}</div>
          <div style={{fontSize:9,color:'rgba(201,168,76,.7)',textTransform:'uppercase',letterSpacing:'.5px'}}>{role}</div>
        </div>
      </div>
      {/* Nav */}
      <nav style={{flex:1,overflowY:'auto',padding:'4px 8px 8px'}}>
        {Object.entries(SECTIONS).map(([sk,sl])=>{
          const items=navItems.filter(n=>n.section===sk);
          if(!items.length) return null;
          return (
            <div key={sk} style={{marginBottom:4}}>
              {sl&&<div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.4px',color:'rgba(255,255,255,.3)',padding:'10px 8px 4px'}}>{sl}</div>}
              {items.map(n=>{
                const ac=ACCENT[n.icon]||'#c9a84c';
                return (
                  <NavLink key={n.to} to={n.to} style={({isActive})=>({display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:9,marginBottom:1,textDecoration:'none',transition:'all .12s',background:isActive?`${ac}18`:'transparent',borderLeft:isActive?`3px solid ${ac}`:'3px solid transparent'})}>
                    {({isActive})=>(
                      <>
                        <div style={{width:28,height:28,borderRadius:7,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:isActive?`${ac}2a`:'rgba(255,255,255,.06)',transition:'all .12s'}}>
                          <Icon name={n.icon} size={14} color={isActive?ac:'rgba(255,255,255,.45)'}/>
                        </div>
                        <span style={{fontSize:13,fontWeight:isActive?600:400,color:isActive?'#fff':'rgba(255,255,255,.55)'}}>{n.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>
      {/* Sign out */}
      <div style={{padding:'8px 8px 12px',borderTop:'1px solid rgba(255,255,255,.08)',flexShrink:0}}>
        <button onClick={()=>{logout();navigate('/login');}} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'none',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit',color:'rgba(255,255,255,.4)',fontSize:13,transition:'all .12s'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,.15)';e.currentTarget.style.color='#fca5a5';}} onMouseLeave={e=>{e.currentTarget.style.background='';e.currentTarget.style.color='';}}>
          <Icon name="logout" size={15}/>Sign Out
        </button>
      </div>
    </div>
  );

  const sidebarStyle = {width:W,background:'linear-gradient(180deg,#0A1628 0%,#0e1f3a 100%)',position:'fixed',top:0,left:0,bottom:0,zIndex:50,overflowY:'auto',boxShadow:'4px 0 24px rgba(0,0,0,.25)'};

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'var(--bg-base)',fontFamily:'var(--font-body)'}}>
      {/* Desktop sidebar */}
      {!mob && <aside style={sidebarStyle}><SidebarInner/></aside>}
      {/* Mobile drawer */}
      {mob && <>
        {open && <div onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:40,backdropFilter:'blur(2px)'}}/>}
        <aside style={{...sidebarStyle,transform:open?'translateX(0)':'translateX(-100%)',transition:'transform .22s cubic-bezier(.4,0,.2,1)',boxShadow:open?'8px 0 32px rgba(0,0,0,.4)':'none'}}><SidebarInner/></aside>
      </>}

      {/* Main */}
      <div style={{flex:1,display:'flex',flexDirection:'column',marginLeft:mob?0:W,minWidth:0}}>
        {/* Topbar */}
        <header style={{height:56,background:dark?'rgba(10,22,40,.95)':'rgba(255,255,255,.92)',borderBottom:`1px solid ${dark?'rgba(255,255,255,.07)':'var(--border)'}`,backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:30,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {mob&&<button onClick={()=>setOpen(o=>!o)} style={{width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',background:'transparent',border:`1px solid ${dark?'rgba(255,255,255,.12)':'var(--border)'}`,borderRadius:8,cursor:'pointer',color:dark?'rgba(255,255,255,.7)':'var(--text-primary)'}}>
              <Icon name={open?'close':'menu'} size={16}/></button>}
            {!mob&&<div style={{width:26,height:26,borderRadius:7,background:'linear-gradient(135deg,#0A1628,#1e3a5f)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/></svg></div>}
            <span style={{fontSize:14,fontWeight:600,color:dark?'rgba(255,255,255,.8)':'var(--text-secondary)'}}>{currentPage}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            {[
              {icon:'camera',fn:()=>setShowScan(true),title:'Scan QR'},
              {icon:dark?'sun':'moon',fn:()=>setDark(d=>!d),title:'Toggle theme'},
            ].map(b=>(
              <button key={b.icon} onClick={b.fn} title={b.title} style={{width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',background:'transparent',border:`1px solid ${dark?'rgba(255,255,255,.12)':'var(--border)'}`,borderRadius:7,cursor:'pointer',color:dark?'rgba(255,255,255,.6)':'var(--text-muted)'}}>
                <Icon name={b.icon} size={15}/>
              </button>
            ))}
            {!mob&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 12px 5px 6px',background:dark?'rgba(255,255,255,.06)':'var(--bg-sunken)',border:`1px solid ${dark?'rgba(255,255,255,.1)':'var(--border)'}`,borderRadius:8}}>
              <div style={{width:24,height:24,borderRadius:6,background:'linear-gradient(135deg,#c9a84c,#e8c96a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#0A1628'}}>{(user?.name||'U').charAt(0).toUpperCase()}</div>
              <span style={{fontSize:13,fontWeight:500,color:dark?'rgba(255,255,255,.8)':'var(--text-primary)'}}>{user?.name||user?.full_name||'User'}</span>
              <span style={{fontSize:9,padding:'2px 7px',borderRadius:20,background:dark?'rgba(201,168,76,.2)':'#fef9c3',color:dark?'#c9a84c':'#92400e',border:`1px solid ${dark?'rgba(201,168,76,.3)':'#fde68a'}`,textTransform:'capitalize'}}>{role}</span>
            </div>}
            <button onClick={()=>{logout();navigate('/login');}} style={{height:34,padding:'0 12px',display:'flex',alignItems:'center',gap:6,background:'transparent',border:`1px solid ${dark?'rgba(255,255,255,.12)':'var(--border)'}`,borderRadius:7,cursor:'pointer',color:dark?'rgba(255,255,255,.5)':'var(--text-muted)',fontSize:12,fontFamily:'inherit'}} onMouseEnter={e=>{e.currentTarget.style.background='#fee2e2';e.currentTarget.style.color='#c0392b';e.currentTarget.style.borderColor='#fca5a5';}} onMouseLeave={e=>{e.currentTarget.style.background='';e.currentTarget.style.color='';e.currentTarget.style.borderColor='';}}>
              <Icon name="logout" size={13}/>{!mob&&'Sign Out'}
            </button>
          </div>
        </header>
        {/* Content */}
        <main style={{flex:1,padding:mob?'14px 12px 90px':'24px 28px',minWidth:0,overflowX:'hidden'}}>
          <Outlet/>
        </main>
      </div>

      {/* Mobile bottom nav */}
      {mob&&<nav style={{position:'fixed',bottom:0,left:0,right:0,zIndex:90,background:dark?'#0A1628':'white',borderTop:`1px solid ${dark?'rgba(255,255,255,.08)':'var(--border)'}`,display:'flex',paddingBottom:'env(safe-area-inset-bottom)',boxShadow:'0 -4px 20px rgba(0,0,0,.1)'}}>
        {BOTTOM_NAV.map(n=>{const ac=ACCENT[n.icon]||'#c9a84c';return(
          <NavLink key={n.to} to={n.to} style={({isActive})=>({flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,textDecoration:'none',padding:'10px 0',color:isActive?ac:(dark?'rgba(255,255,255,.35)':'#9ca3af'),borderTop:`2px solid ${isActive?ac:'transparent'}`,fontSize:10,fontWeight:isActive?700:400,transition:'all .12s'})}>
            {({isActive})=><><Icon name={n.icon} size={19} color={isActive?ac:(dark?'rgba(255,255,255,.35)':'#9ca3af')}/><span>{n.label}</span></>}
          </NavLink>
        );})}
        <button onClick={()=>setOpen(o=>!o)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,background:'none',border:'none',borderTop:`2px solid ${open?'#c9a84c':'transparent'}`,color:open?'#c9a84c':(dark?'rgba(255,255,255,.35)':'#9ca3af'),fontSize:10,cursor:'pointer',padding:'10px 0'}}>
          <Icon name={open?'close':'more'} size={19} color={open?'#c9a84c':(dark?'rgba(255,255,255,.35)':'#9ca3af')}/>{open?'Close':'More'}
        </button>
      </nav>}

      {showScan&&<QRScanner title="Scan Frame Sticker" onScan={handleScan} onClose={()=>setShowScan(false)}/>}
    </div>
  );
}