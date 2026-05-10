// ============================================================
//  Dashboard.js — Fixed: CSS errors, daily revenue, all KPIs
// ============================================================
import React, { useEffect, useState } from 'react';
import { getDashboard } from '../api';
import { useAuth } from '../context/AuthContext';

const navy  = '#0f1f3d';
const gold  = '#c9a84c';
const cream = '#f8f5ef';
const border= '#e0ddd6';
const muted = '#6b7280';
const success='#2d7a4f';
const danger ='#c0392b';

export default function Dashboard() {
  const { user } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  useEffect(() => {
    getDashboard()
      .then(r => { setData(r.data); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60, color:muted, flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:32 }}>👁️</div>
      <div style={{ fontSize:14 }}>Loading dashboard...</div>
    </div>
  );

  if (error) return (
    <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, borderRadius:12, padding:24, color:danger, fontSize:14 }}>
      ⚠️ Could not load dashboard data. Please check your internet connection and try refreshing the page.
    </div>
  );

  const mr = data?.month_revenue || {};

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:navy, margin:0 }}>
        {greeting}, {user?.name?.split(' ').slice(-1)[0]}! 👋
      </h1>
      <p style={{ fontSize:13, color:muted, margin:'4px 0 24px' }}>{today} — Kuruwita Optical</p>

      {/* ── KPI cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:24 }}>

        {/* This month */}
        <div style={{ background:navy, border:`1px solid ${navy}`, borderRadius:12, padding:'16px 18px' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:gold, marginBottom:6 }}>This Month</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:'white', lineHeight:1 }}>
            Rs. {Math.round((mr.total||0)/1000)}K
          </div>
          <div style={{ fontSize:12, color:'#ede9e0', marginTop:5 }}>{mr.order_count||0} orders</div>
        </div>

        {/* Today's sales — FIX: was broken CSS */}
        <div style={{ background:'white', border:`1px solid ${border}`, borderRadius:12, padding:'16px 18px' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:6 }}>Today's Sales</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:success, lineHeight:1 }}>
            Rs. {Math.round(data?.daily_revenue||0).toLocaleString()}
          </div>
          <div style={{ fontSize:12, color:muted, marginTop:5 }}>Today total</div>
        </div>

        {/* Balance due */}
        <div style={{ background:'white', border:`1px solid ${border}`, borderRadius:12, padding:'16px 18px' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:6 }}>Balance Due</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:danger, lineHeight:1 }}>
            Rs. {Math.round((data?.total_balance||0)/1000)}K
          </div>
          <div style={{ fontSize:12, color:muted, marginTop:5 }}>Outstanding</div>
        </div>

        {/* Active orders */}
        <div style={{ background:'white', border:`1px solid ${border}`, borderRadius:12, padding:'16px 18px' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:6 }}>Active Orders</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:'#2563eb', lineHeight:1 }}>
            {data?.active_orders||0}
          </div>
          <div style={{ fontSize:12, color:muted, marginTop:5 }}>In progress</div>
        </div>

        {/* Lens jobs out */}
        <div style={{ background:'white', border:`1px solid ${border}`, borderRadius:12, padding:'16px 18px' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:6 }}>Lens Jobs Out</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:'#7c3aed', lineHeight:1 }}>
            {data?.lens_jobs_out||0}
          </div>
          <div style={{ fontSize:12, color:muted, marginTop:5 }}>At labs</div>
        </div>

      </div>

      {/* ── Delivery reminders ── */}
      <div style={{ background:'white', border:`1px solid ${border}`, borderRadius:12, overflow:'hidden', marginBottom:18 }}>
        <div style={{ padding:'13px 18px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:14, fontWeight:700, color:navy }}>🔔 Delivery reminders</span>
          {data?.reminders?.length > 0 && (
            <span style={{ background:'#fee2e2', color:danger, fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20 }}>
              {data.reminders.length} urgent
            </span>
          )}
        </div>
        <div style={{ padding:'4px 18px' }}>
          {!data?.reminders?.length
            ? <p style={{ padding:'14px 0', color:muted, fontSize:13 }}>✅ No urgent reminders — all deliveries on track</p>
            : data.reminders.map(r => (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:`1px solid ${cream}` }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:r.status==='overdue'?danger:gold, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:navy }}>{r.customer_name}</div>
                  <div style={{ fontSize:12, color:muted }}>
                    {r.order_number} · Balance Rs. {parseFloat(r.balance_amount||0).toLocaleString()} · Due {r.deliver_date?.slice(0,10)}
                  </div>
                </div>
                <a href={`https://wa.me/94${r.phone?.replace(/^0/,'')}?text=${encodeURIComponent(`Hello ${r.customer_name}, your order ${r.order_number} is ready at Kuruwita Optical. Please visit us. Thank you!`)}`}
                  target="_blank" rel="noreferrer"
                  style={{ background:'#25D366', color:'white', padding:'5px 12px', borderRadius:7, fontSize:11, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
                  💬 WA
                </a>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Monthly summary ── */}
      <div style={{ background:'white', border:`1px solid ${border}`, borderRadius:12, overflow:'hidden', marginBottom:18 }}>
        <div style={{ padding:'13px 18px', borderBottom:`1px solid ${border}` }}>
          <span style={{ fontSize:14, fontWeight:700, color:navy }}>📊 This month at a glance</span>
        </div>
        <div style={{ padding:18, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
          {[
            { l:'Total billed',  v:`Rs. ${parseFloat(mr.total||0).toLocaleString()}`,     c:navy    },
            { l:'Collected',     v:`Rs. ${parseFloat(mr.collected||0).toLocaleString()}`, c:success },
            { l:'Still owed',    v:`Rs. ${parseFloat(mr.owed||0).toLocaleString()}`,      c:danger  },
            { l:'Orders',        v: mr.order_count||0,                                    c:'#2563eb'},
          ].map(item => (
            <div key={item.l} style={{ background:cream, borderRadius:10, padding:14, textAlign:'center' }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:6 }}>{item.l}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:item.c }}>{item.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div style={{ background:'white', border:`1px solid ${border}`, borderRadius:12, padding:'16px 18px' }}>
        <div style={{ fontSize:14, fontWeight:700, color:navy, marginBottom:14 }}>⚡ Quick actions</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {[
            { label:'+ New Order',        href:'/orders/new',  bg:gold,       color:navy    },
            { label:'📋 View All Orders', href:'/orders',      bg:navy,       color:'white' },
            { label:'👥 Customers',       href:'/customers',   bg:cream,      color:navy, bord:border },
            { label:'🕶️ Inventory',       href:'/inventory',   bg:cream,      color:navy, bord:border },
          ].map(a => (
            <a key={a.label} href={a.href}
              style={{ padding:'10px 18px', background:a.bg, color:a.color, border:a.bord?`1.5px solid ${a.bord}`:'none', borderRadius:9, fontSize:13, fontWeight:600, textDecoration:'none', display:'inline-block' }}>
              {a.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
