/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to:'/dashboard',  icon:'🏠', label:'Dashboard',  section:'main'      },
  { to:'/orders',     icon:'📋', label:'Orders',      section:'main'      },
  { to:'/balance',     icon:'💰', label:'Balance Due',  section:'main'      },
  { to:'/rx-tracker',  icon:'📄', label:'Rx Tracker',   section:'main'      },
  { to:'/dealers',     icon:'🏪', label:'Purchases',    section:'inventory' },
  { to:'/kalutota',    icon:'🔄', label:'Kalutota A/C',  section:'inventory' },
  { to:'/quick-sale', icon:'🛍️', label:'Quick Sale',  section:'main'      },
  { to:'/repairs',     icon:'🔧', label:'Repairs',      section:'main'      },
  { to:'/grinding',    icon:'🔬', label:'Grinding',       section:'main',     roles:['admin'] },
  { to:'/lab-receivings',icon:'📥', label:'Lab Receivings', section:'main',     roles:['admin'] },
  { to:'/customers',  icon:'👥', label:'Customers',   section:'main'      },
  { to:'/inventory',  icon:'📦', label:'Inventory',   section:'inventory' },
  { to:'/lens-prices',icon:'🧪', label:'Lens Prices', section:'inventory' },
  { to:'/reports',    icon:'📊', label:'Reports',     section:'reports',  roles:['admin'] },
  { to:'/report-pdf',  icon:'📄', label:'PDF Report',   section:'reports',  roles:['admin'] },
  { to:'/expenses',   icon:'💸', label:'Expenses',    section:'reports',  roles:['admin'] },
  { to:'/bulk-import',icon:'📥', label:'Bulk Import',  section:'account',  roles:['admin'] },
  { to:'/settings',   icon:'⚙️', label:'Settings',    section:'account'   },
];
const SECTIONS = { main:'Main', inventory:'Inventory', reports:'Reports & Finance', account:'Account' };

// Bottom nav items for mobile (most used 5)
const BOTTOM_NAV_ADMIN = [
  { to:'/dashboard',  icon:'🏠', label:'Home'    },
  { to:'/orders',     icon:'📋', label:'Orders'  },
  { to:'/quick-sale', icon:'🛍️', label:'Sale'    },
  { to:'/repairs',     icon:'🔧', label:'Repairs'  },
  { to:'/customers',  icon:'👥', label:'Customers'},
];
const BOTTOM_NAV_STAFF = [
  { to:'/dashboard',  icon:'🏠', label:'Home'    },
  { to:'/orders',     icon:'📋', label:'Orders'  },
  { to:'/quick-sale', icon:'🛍️', label:'Sale'    },
  { to:'/customers',  icon:'👥', label:'Customers'},
  { to:'/inventory',  icon:'📦', label:'Stock'   },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open,  setOpen]  = useState(false);
  const [mob,   setMob]   = useState(window.innerWidth < 640);
  const role = user?.role || 'admin';

  useEffect(()=>{
    const fn = () => setMob(window.innerWidth < 640);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  },[]);

  const visibleNav    = NAV.filter(n => !n.roles || n.roles.includes(role));
  const bottomNavItems= role==='admin' ? BOTTOM_NAV_ADMIN : BOTTOM_NAV_STAFF;

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', fontFamily:"'DM Sans',sans-serif", background:'#f8f5ef' }}>

      {/* ── Top header ── */}
      <header style={{ background:'#0f1f3d', height:52, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Hamburger — always show on mobile, show on desktop too for full nav */}
          <button onClick={()=>setOpen(o=>!o)} style={{ background:'none', border:'none', color:'white', fontSize:20, cursor:'pointer', padding:'4px 6px', lineHeight:1 }}>☰</button>
          <span style={{ fontSize:16 }}>👁️</span>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", color:'white', fontSize:mob?14:16, fontWeight:600 }}>Kuruwita Optical</div>
            {!mob && <div style={{ color:'#c9a84c', fontSize:9, letterSpacing:'1.5px', textTransform:'uppercase' }}>Management System</div>}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ background:role==='admin'?'rgba(124,58,237,.3)':'rgba(37,99,235,.3)', color:role==='admin'?'#c4b5fd':'#93c5fd', fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20, textTransform:'uppercase', letterSpacing:'.8px' }}>
            {role}
          </span>
          {!mob && <span style={{ color:'#ede9e0', fontSize:13 }}>👤 {user?.name}</span>}
          <button onClick={()=>{ logout(); navigate('/login'); }}
            style={{ background:'rgba(201,168,76,0.2)', color:'#e8c96a', border:'1px solid rgba(201,168,76,0.3)', borderRadius:8, padding:'5px 10px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {mob ? '↩' : 'Logout'}
          </button>
        </div>
      </header>

      <div style={{ display:'flex', flex:1 }}>
        {/* ── Sidebar overlay backdrop ── */}
        {open && <div onClick={()=>setOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:40 }}/>}

        {/* ── Sidebar ── */}
        <nav style={{ width:230, background:'white', borderRight:'1px solid #ede9e0', position:'fixed', top:52, left:0, bottom:0, overflowY:'auto', zIndex:50, transform:open?'translateX(0)':'translateX(-100%)', transition:'transform .25s ease', boxShadow:open?'4px 0 20px rgba(0,0,0,.12)':'none' }}>
          {/* User info at top of sidebar */}
          <div style={{ padding:'14px 16px', borderBottom:'1px solid #ede9e0', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'#0f1f3d', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#e8c96a', flexShrink:0 }}>
              {user?.name?.charAt(0)||'?'}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#0f1f3d' }}>{user?.name}</div>
              <div style={{ fontSize:11, color:'#9ca3af' }}>@{user?.username||'user'}</div>
            </div>
          </div>

          {Object.entries(SECTIONS).map(([sk,sl])=>{
            const items = visibleNav.filter(n=>n.section===sk);
            if (!items.length) return null;
            return (
              <div key={sk}>
                <div style={{ padding:'14px 16px 5px', fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'1.5px' }}>{sl}</div>
                {items.map(n=>(
                  <NavLink key={n.to} to={n.to} onClick={()=>setOpen(false)}
                    style={({isActive})=>({ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', margin:'2px 8px', borderRadius:10, textDecoration:'none', fontSize:14, fontWeight:500, color:isActive?'white':'#6b7280', background:isActive?'#0f1f3d':'transparent', transition:'all .15s' })}>
                    <span style={{ fontSize:16, width:20, textAlign:'center' }}>{n.icon}</span>{n.label}
                  </NavLink>
                ))}
              </div>
            );
          })}

          <div style={{ padding:'14px 16px', borderTop:'1px solid #ede9e0', marginTop:8 }}>
            <button onClick={()=>{ logout(); navigate('/login'); }}
              style={{ width:'100%', padding:'9px', background:'#fee2e2', color:'#c0392b', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Logout
            </button>
          </div>
        </nav>

        {/* ── Main content ── */}
        <main style={{ flex:1, padding: mob ? '14px 14px 80px' : 24, minWidth:0 }}>
          <Outlet/>
        </main>
      </div>

      {/* ── Mobile bottom nav bar ── */}
      {mob && (
        <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:'white', borderTop:'1px solid #e0ddd6', display:'flex', zIndex:90, height:60 }}>
          {bottomNavItems.map(n=>(
            <NavLink key={n.to} to={n.to}
              style={({isActive})=>({ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, textDecoration:'none', color:isActive?'#0f1f3d':'#9ca3af', background:isActive?'#f8f5ef':'white', borderTop:isActive?'2px solid #c9a84c':'2px solid transparent', fontSize:10, fontWeight:isActive?700:400, transition:'all .15s', padding:'4px 0' })}>
              <span style={{ fontSize:20, lineHeight:1 }}>{n.icon}</span>
              <span style={{ fontSize:10 }}>{n.label}</span>
            </NavLink>
          ))}
          {/* More button opens sidebar */}
          <button onClick={()=>setOpen(true)}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, background:'white', border:'none', borderTop:'2px solid transparent', color:'#9ca3af', fontSize:10, cursor:'pointer', fontFamily:'inherit', padding:'4px 0' }}>
            <span style={{ fontSize:20, lineHeight:1 }}>⋯</span>
            <span>More</span>
          </button>
        </nav>
      )}

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');*{box-sizing:border-box}`}</style>
    </div>
  );
}
