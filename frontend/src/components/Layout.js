// ============================================================
//  Layout — shared sidebar + header wrapping all pages
// ============================================================
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard',     section: 'main' },
  { to: '/orders',    icon: '📋', label: 'Orders',        section: 'main', badge: null },
  { to: '/customers', icon: '👥', label: 'Customers',     section: 'main' },
  { to: '/inventory', icon: '🕶️', label: 'Frames & Stock', section: 'inventory' },
  { to: '/reports',   icon: '📊', label: 'Reports',       section: 'reports' },
  { to: '/settings',  icon: '⚙️', label: 'Settings',      section: 'account' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', fontFamily:"'DM Sans',sans-serif", background:'#f8f5ef' }}>

      {/* Header */}
      <header style={{ background:'#0f1f3d', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={()=>setOpen(o=>!o)} style={{ background:'none', border:'none', color:'white', fontSize:20, cursor:'pointer', padding:'4px 8px', display:'none' }} className="menu-toggle">☰</button>
          <span style={{ fontSize:18 }}>👁️</span>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", color:'white', fontSize:16, fontWeight:600 }}>Kuruwita Optical</div>
            <div style={{ color:'#c9a84c', fontSize:9, letterSpacing:'1.5px', textTransform:'uppercase' }}>Management System</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ color:'#ede9e0', fontSize:13 }}>👤 {user?.name}</span>
          <button onClick={handleLogout} style={{ background:'rgba(201,168,76,0.2)', color:'#e8c96a', border:'1px solid rgba(201,168,76,0.3)', borderRadius:8, padding:'5px 14px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Logout
          </button>
        </div>
      </header>

      <div style={{ display:'flex', flex:1 }}>
        {/* Overlay (mobile) */}
        {open && <div onClick={()=>setOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:40 }}/>}

        {/* Sidebar */}
        <nav style={{ width:220, background:'white', borderRight:'1px solid #ede9e0', position:'sticky', top:56, height:'calc(100vh - 56px)', overflowY:'auto', flexShrink:0 }}>
          {['main','inventory','reports','account'].map(section => {
            const items = NAV.filter(n=>n.section===section);
            if (!items.length) return null;
            return (
              <div key={section}>
                <div style={{ padding:'16px 16px 6px', fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'1.5px' }}>
                  {section === 'main' ? 'Main' : section === 'inventory' ? 'Inventory' : section === 'reports' ? 'Reports' : 'Account'}
                </div>
                {items.map(n => (
                  <NavLink key={n.to} to={n.to}
                    style={({ isActive }) => ({
                      display:'flex', alignItems:'center', gap:10,
                      padding:'10px 14px', margin:'2px 8px', borderRadius:10,
                      textDecoration:'none', fontSize:14, fontWeight:500,
                      color: isActive ? 'white' : '#6b7280',
                      background: isActive ? '#0f1f3d' : 'transparent',
                      transition:'all .15s',
                    })}>
                    <span style={{ fontSize:16, width:20, textAlign:'center' }}>{n.icon}</span>
                    {n.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Main content */}
        <main style={{ flex:1, padding:24, minWidth:0 }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        @media(max-width:720px){
          .menu-toggle { display:block !important; }
          nav { position:fixed !important; top:56px; left:0; bottom:0; z-index:50; transform:translateX(-100%); transition:transform .3s; }
          nav.open { transform:translateX(0); }
          main { padding: 14px !important; }
        }
      `}</style>
    </div>
  );
}
