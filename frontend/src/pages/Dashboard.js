// ============================================================
//  Dashboard.js — Updated with Quick Sale stats
// ============================================================
import React, { useEffect, useState } from 'react';
import { getDashboard } from '../api';
import { useAuth } from '../context/AuthContext';

const navy=  '#0f1f3d', gold='#c9a84c', cream='#f8f5ef', border='#e0ddd6', muted='#6b7280', success='#2d7a4f', danger='#c0392b';
const fmtMoney = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0,maximumFractionDigits:0});

export default function Dashboard() {
  const { user }  = useAuth();
  const [data,    setData]    = useState(null);
  const [qs,      setQS]      = useState(null);   // quick sale stats
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  const today = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  useEffect(() => {
    const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('ko_token');
    const headers = { Authorization:`Bearer ${token}` };

    Promise.all([
      fetch(`${BASE}/reports/dashboard`, { headers }).then(r=>r.json()),
      fetch(`${BASE}/quick-sales/stats`,  { headers }).then(r=>r.json()).catch(()=>null),
    ])
      .then(([dash, qsStats]) => { setData(dash); setQS(qsStats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60, color:muted, flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:32 }}>👁️</div><div style={{ fontSize:14 }}>Loading...</div>
    </div>
  );

  const mr = data?.month_revenue || {};

  const KPI = ({ label, value, sub, dark, color }) => (
    <div style={{ background:dark?navy:'white', border:`1px solid ${dark?navy:border}`, borderRadius:12, padding:'16px 18px' }}>
      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:dark?gold:muted, marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:dark?'white':(color||navy), lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, color:dark?'#ede9e0':muted, marginTop:5 }}>{sub}</div>
    </div>
  );

  // Combined today total = orders + quick sales
  const ordersTodayRevenue  = parseFloat(data?.daily_revenue || 0);
  const qsTodayRevenue      = parseFloat(qs?.today?.total   || 0);
  const totalTodayRevenue   = ordersTodayRevenue + qsTodayRevenue;
  const qsTodayCount        = parseInt(qs?.today?.count      || 0);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:navy, margin:0 }}>
        {greeting}, {user?.name?.split(' ')[0]}! 👋
      </h1>
      <p style={{ fontSize:13, color:muted, margin:'4px 0 24px' }}>{today} — Kuruwita Optical</p>

      {/* ── KPI Grid ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:12, marginBottom:24 }}>
        <KPI label="This Month"    value={fmtMoney(mr.total)}           sub={`${mr.order_count||0} orders`}   dark />
        <KPI label="Today's Sales" value={fmtMoney(totalTodayRevenue)}  sub={`Orders + Quick sales`}           color={success} />
        <KPI label="Balance Due"   value={fmtMoney(data?.total_balance)} sub="Outstanding"                     color={danger} />
        <KPI label="Active Orders" value={data?.active_orders||0}       sub="In progress"                      color='#2563eb' />
        <KPI label="Lens Jobs Out" value={data?.lens_jobs_out||0}       sub="At labs"                          color='#7c3aed' />
      </div>

      {/* ── Quick Sale today strip ── */}
      {qs && (
        <div style={{ background:'white', border:`1px solid ${border}`, borderRadius:12, padding:'14px 18px', marginBottom:18, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:22 }}>🛍️</span>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:navy }}>Quick Sales Today</div>
              <div style={{ fontSize:12, color:muted }}>{qsTodayCount} walk-in sale{qsTodayCount!==1?'s':''} completed</div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:success }}>{fmtMoney(qsTodayRevenue)}</div>
            <div style={{ fontSize:11, color:muted }}>This month: {fmtMoney(qs?.month?.total||0)}</div>
          </div>
          <a href="/quick-sale" style={{ padding:'8px 18px', background:navy, color:'white', borderRadius:9, fontSize:13, fontWeight:600, textDecoration:'none' }}>
            + New Quick Sale
          </a>
        </div>
      )}

      {/* ── Delivery reminders ── */}
      <div style={{ background:'white', border:`1px solid ${border}`, borderRadius:12, overflow:'hidden', marginBottom:18 }}>
        <div style={{ padding:'13px 18px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:14, fontWeight:700, color:navy }}>🔔 Delivery reminders</span>
          {data?.reminders?.length>0 && <span style={{ background:'#fee2e2', color:danger, fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20 }}>{data.reminders.length} urgent</span>}
        </div>
        <div style={{ padding:'4px 18px' }}>
          {!data?.reminders?.length
            ? <p style={{ padding:'14px 0', color:muted, fontSize:13 }}>✅ No urgent reminders</p>
            : data.reminders.map(r=>(
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:`1px solid ${cream}` }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:r.status==='overdue'?danger:gold, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:navy }}>{r.customer_name}</div>
                  <div style={{ fontSize:12, color:muted }}>{r.order_number} · Balance {fmtMoney(r.balance_amount)} · Due {r.deliver_date?.slice(0,10)}</div>
                </div>
                <a href={`https://wa.me/94${r.phone?.replace(/^0/,'')}?text=${encodeURIComponent(`Hello ${r.customer_name}, your order ${r.order_number} is ready. Please visit Kuruwita Optical. Thank you!`)}`}
                  target="_blank" rel="noreferrer"
                  style={{ background:'#25D366', color:'white', padding:'5px 12px', borderRadius:7, fontSize:11, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
                  💬 WA
                </a>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Month summary ── */}
      <div style={{ background:'white', border:`1px solid ${border}`, borderRadius:12, overflow:'hidden', marginBottom:18 }}>
        <div style={{ padding:'13px 18px', borderBottom:`1px solid ${border}` }}>
          <span style={{ fontSize:14, fontWeight:700, color:navy }}>📊 This month at a glance</span>
        </div>
        <div style={{ padding:18, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12 }}>
          {[
            {l:'Total billed',  v:fmtMoney(mr.total),     c:navy   },
            {l:'Collected',     v:fmtMoney(mr.collected), c:success},
            {l:'Still owed',    v:fmtMoney(mr.owed),      c:danger },
            {l:'Orders',        v:mr.order_count||0,      c:'#2563eb'},
          ].map(item=>(
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
            {label:'+ New Order',        href:'/orders/new',  bg:gold,  color:navy   },
            {label:'🛍️ Quick Sale',       href:'/quick-sale',  bg:success,color:'white'},
            {label:'📋 All Orders',       href:'/orders',      bg:navy,  color:'white' },
            {label:'👥 Customers',        href:'/customers',   bg:cream, color:navy, bord:border},
            {label:'📦 Inventory',        href:'/inventory',   bg:cream, color:navy, bord:border},
          ].map(a=>(
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
