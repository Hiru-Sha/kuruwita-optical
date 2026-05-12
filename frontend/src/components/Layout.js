/* eslint-disable */
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Each nav item has an optional 'roles' array
// If roles is present, only those roles can see the link
const NAV = [
  { to:'/dashboard',  icon:'🏠', label:'Dashboard',  section:'main'      },
  { to:'/orders',     icon:'📋', label:'Orders',      section:'main'      },
  { to:'/quick-sale', icon:'🛍️', label:'Quick Sale',  section:'main'      },
  { to:'/grinding',   icon:'🔬', label:'Grinding',    section:'main',     roles:['admin'] },
  { to:'/customers',  icon:'👥', label:'Customers',   section:'main'      },
  { to:'/inventory',  icon:'📦', label:'Inventory',   section:'inventory' },
  { to:'/lens-prices',icon:'🧪', label:'Lens Prices', section:'inventory' },
  { to:'/reports',    icon:'📊', label:'Reports',     section:'reports',  roles:['admin'] },
  { to:'/expenses',   icon:'💸', label:'Expenses',    section:'reports',  roles:['admin'] },
  { to:'/settings',   icon:'⚙️', label:'Settings',    section:'account'   },
];

const SECTIONS = { main:'Main', inventory:'Inventory', reports:'Reports & Finance', account:'Account' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const role = user?.role || 'admin';

  // Filter nav items by role
  const visibleNav = NAV.filter(n => !n.roles || n.roles.includes(role));

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', fontFamily:"'DM Sans',sans-serif", background:'#f8f5ef' }}>
      <header style={{ background:'#0f1f3d', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={()=>setOpen(o=>!o)} style={{ background:'none', border:'none', color:'white', fontSize:20, cursor:'pointer', padding:'4px 8px' }}>☰</button>
          <span style={{ fontSize:18 }}>👁️</span>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", color:'white', fontSize:16, fontWeight:600 }}>Kuruwita Optical</div>
            <div style={{ color:'#c9a84c', fontSize:9, letterSpacing:'1.5px', textTransform:'uppercase' }}>Management System</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Role badge */}
          <span style={{ background:role==='admin'?'rgba(124,58,237,.3)':'rgba(37,99,235,.3)', color:role==='admin'?'#c4b5fd':'#93c5fd', fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:20, textTransform:'uppercase', letterSpacing:'.8px' }}>
            {role}
          </span>
          <span style={{ color:'#ede9e0', fontSize:13 }}>👤 {user?.name}</span>
          <button onClick={()=>{ logout(); navigate('/login'); }} style={{ background:'rgba(201,168,76,0.2)', color:'#e8c96a', border:'1px solid rgba(201,168,76,0.3)', borderRadius:8, padding:'5px 14px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Logout</button>
        </div>
      </header>

      <div style={{ display:'flex', flex:1 }}>
        {open && <div onClick={()=>setOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:40 }}/>}
        <nav style={{ width:230, background:'white', borderRight:'1px solid #ede9e0', position:'fixed', top:56, left:0, bottom:0, overflowY:'auto', zIndex:50, transform:open?'translateX(0)':'translateX(-100%)', transition:'transform .25s ease', boxShadow:open?'4px 0 20px rgba(0,0,0,.1)':'none' }}>
          {Object.entries(SECTIONS).map(([sk,sl])=>{
            const items = visibleNav.filter(n=>n.section===sk);
            if (!items.length) return null;
            return (
              <div key={sk}>
                <div style={{ padding:'16px 16px 6px', fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'1.5px' }}>{sl}</div>
                {items.map(n=>(
                  <NavLink key={n.to} to={n.to} onClick={()=>setOpen(false)}
                    style={({isActive})=>({ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', margin:'2px 8px', borderRadius:10, textDecoration:'none', fontSize:14, fontWeight:500, color:isActive?'white':'#6b7280', background:isActive?'#0f1f3d':'transparent', transition:'all .15s' })}>
                    <span style={{ fontSize:16, width:20, textAlign:'center' }}>{n.icon}</span>{n.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <main style={{ flex:1, padding:24, minWidth:0 }}><Outlet/></main>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');*{box-sizing:border-box}@media(max-width:720px){main{padding:14px!important}}`}</style>
    </div>
  );
}
