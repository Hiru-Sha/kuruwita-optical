/* eslint-disable */
// ============================================================
//  Dashboard.js — With daily cash summary
//  Shows: orders income, quick sale income, expenses, deposits,
//  and cash in hand for today
// ============================================================
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const navy=  '#0f1f3d', gold='#c9a84c', cream='#f8f5ef',
      border='#e0ddd6', muted='#6b7280', success='#2d7a4f',
      danger='#c0392b';

const fmt  = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0,maximumFractionDigits:0});
const today = () => new Date().toISOString().split('T')[0];

function apiGet(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json());
}

export default function Dashboard() {
  const { user }   = useAuth();
  const [data,     setData]    = useState(null);
  const [cash,     setCash]    = useState(null);   // daily cash summary
  const [loading,  setLoading] = useState(true);

  const hour     = new Date().getHours();
  const greeting = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  const dateStr  = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const todayStr = today();

  useEffect(()=>{
    const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('ko_token');
    const h     = { Authorization:`Bearer ${token}` };

    Promise.all([
      fetch(`${BASE}/reports/dashboard`, {headers:h}).then(r=>r.json()),
      // Orders collected today (advance payments)
      fetch(`${BASE}/orders?limit=200`, {headers:h}).then(r=>r.json()),
      // Quick sales today
      fetch(`${BASE}/quick-sales?limit=200`, {headers:h}).then(r=>r.json()),
      // Expenses today
      fetch(`${BASE}/expenses?month=${todayStr.slice(0,7)}`, {headers:h}).then(r=>r.json()).catch(()=>[]),
      // Deposits today
      fetch(`${BASE}/cash-deposits?date=${todayStr}`, {headers:h}).then(r=>r.json()).catch(()=>[]),
    ]).then(([dash, orders, qsales, expenses, deposits])=>{
      setData(dash);

      // Calculate daily cash
      const todayOrders  = (Array.isArray(orders)?orders:[]).filter(o=>o.created_at?.slice(0,10)===todayStr);
      const todayQS      = (Array.isArray(qsales)?qsales:[]).filter(s=>s.created_at?.slice(0,10)===todayStr);
      const todayExp     = (Array.isArray(expenses)?expenses:[]).filter(e=>e.date?.slice(0,10)===todayStr);
      const todayDep     = Array.isArray(deposits)?deposits:[];

      const orderIncome  = todayOrders.reduce((s,o)=>s+parseFloat(o.advance_amount||0),0);
      const qsIncome     = todayQS.reduce((s,q)=>s+parseFloat(q.total||0),0);
      const totalIncome  = orderIncome + qsIncome;
      const totalExp     = todayExp.reduce((s,e)=>s+parseFloat(e.amount||0),0);
      const totalDep     = todayDep.reduce((s,d)=>s+parseFloat(d.amount||0),0);
      const cashInHand   = totalIncome - totalExp - totalDep;

      setCash({
        orderIncome, qsIncome, totalIncome,
        totalExp, totalDep, cashInHand,
        orderCount: todayOrders.length,
        qsCount:    todayQS.length,
        expCount:   todayExp.length,
        depCount:   todayDep.length,
      });
    })
    .catch(console.error)
    .finally(()=>setLoading(false));
  },[]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60, color:muted, flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:32 }}>👁️</div><div style={{ fontSize:14 }}>Loading...</div>
    </div>
  );

  const mr = data?.month_revenue || {};

  const KPI = ({ label, value, sub, dark, color }) => (
    <div style={{ background:dark?navy:'white', border:`1px solid ${dark?navy:border}`, borderRadius:12, padding:'14px 16px' }}>
      <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:dark?gold:muted, marginBottom:5 }}>{label}</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:dark?'white':(color||navy), lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:dark?'#ede9e0':muted, marginTop:4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:navy, margin:0 }}>
        {greeting}, {user?.name?.split(' ')[0]}! 👋
      </h1>
      <p style={{ fontSize:13, color:muted, margin:'4px 0 24px' }}>{dateStr} — Kuruwita Optical</p>

      {/* ── DAILY CASH SUMMARY ─────────────────────────────── */}
      {cash && (
        <div style={{ background:'white', border:`1px solid ${border}`, borderRadius:14, overflow:'hidden', marginBottom:20 }}>

          {/* Header */}
          <div style={{ background:navy, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'white' }}>📅 Today's Cash Summary</div>
              <div style={{ fontSize:11, color:'#ede9e0', marginTop:2 }}>
                {new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:10, color:gold, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:2 }}>Cash in Hand</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:cash.cashInHand>=0?'#86efac':'#fca5a5' }}>
                {fmt(cash.cashInHand)}
              </div>
            </div>
          </div>

          {/* Cash flow formula bar */}
          <div style={{ background:cream, padding:'10px 18px', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', fontSize:13, borderBottom:`1px solid ${border}` }}>
            <span style={{ color:success, fontWeight:700 }}>{fmt(cash.totalIncome)}</span>
            <span style={{ color:muted }}>collected</span>
            <span style={{ color:muted }}>−</span>
            <span style={{ color:danger, fontWeight:700 }}>{fmt(cash.totalExp)}</span>
            <span style={{ color:muted }}>expenses</span>
            <span style={{ color:muted }}>−</span>
            <span style={{ color:'#2563eb', fontWeight:700 }}>{fmt(cash.totalDep)}</span>
            <span style={{ color:muted }}>deposited</span>
            <span style={{ color:muted }}>=</span>
            <span style={{ fontWeight:700, color:cash.cashInHand>=0?success:danger }}>{fmt(cash.cashInHand)} in hand</span>
          </div>

          {/* 4 boxes */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0 }}>

            {/* Orders income */}
            <div style={{ padding:'14px 18px', borderRight:`1px solid ${border}` }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:6 }}>
                📋 Orders
              </div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:success, marginBottom:3 }}>
                {fmt(cash.orderIncome)}
              </div>
              <div style={{ fontSize:11, color:muted }}>
                {cash.orderCount} order advance{cash.orderCount!==1?'s':''}
              </div>
            </div>

            {/* Quick sales income */}
            <div style={{ padding:'14px 18px', borderRight:`1px solid ${border}` }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:6 }}>
                🛍️ Quick Sales
              </div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:success, marginBottom:3 }}>
                {fmt(cash.qsIncome)}
              </div>
              <div style={{ fontSize:11, color:muted }}>
                {cash.qsCount} walk-in sale{cash.qsCount!==1?'s':''}
              </div>
            </div>

            {/* Expenses */}
            <div style={{ padding:'14px 18px', borderRight:`1px solid ${border}` }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:6 }}>
                💸 Expenses
              </div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:cash.totalExp>0?danger:muted, marginBottom:3 }}>
                {fmt(cash.totalExp)}
              </div>
              <div style={{ fontSize:11, color:muted }}>
                {cash.expCount} expense{cash.expCount!==1?'s':''}
              </div>
            </div>

            {/* Deposited */}
            <div style={{ padding:'14px 18px' }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:6 }}>
                🏦 Deposited
              </div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'#2563eb', marginBottom:3 }}>
                {fmt(cash.totalDep)}
              </div>
              <div style={{ fontSize:11, color:muted }}>
                {cash.depCount} deposit{cash.depCount!==1?'s':''}
              </div>
            </div>
          </div>

          {/* Cash in hand indicator */}
          {cash.cashInHand > 0 && cash.totalDep === 0 && (
            <div style={{ padding:'10px 18px', background:'#fef9c3', borderTop:`1px solid #fde68a`, fontSize:12, color:'#854d0e', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>💡 {fmt(cash.cashInHand)} is ready to deposit to bank</span>
              <a href="/expenses" style={{ color:'#854d0e', fontWeight:700, fontSize:12, textDecoration:'none' }}>Record deposit →</a>
            </div>
          )}
          {cash.cashInHand < 0 && (
            <div style={{ padding:'10px 18px', background:'#fef2f2', borderTop:`1px solid #fca5a5`, fontSize:12, color:danger }}>
              ⚠️ Cash in hand is negative — check if all expenses and deposits are recorded correctly
            </div>
          )}
          {cash.cashInHand === 0 && cash.totalIncome > 0 && (
            <div style={{ padding:'10px 18px', background:'#dcfce7', borderTop:`1px solid #86efac`, fontSize:12, color:success, fontWeight:600 }}>
              ✅ All cash accounted for — nothing left to deposit
            </div>
          )}
        </div>
      )}

      {/* ── MONTH KPIs ─────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:12, marginBottom:20 }}>
        <KPI label="This Month"    value={fmt(mr.total)}            sub={`${mr.order_count||0} orders`}  dark />
        <KPI label="Collected"     value={fmt(mr.collected)}        sub="Advance payments"               color={success} />
        <KPI label="Balance Due"   value={fmt(data?.total_balance)} sub="Outstanding"                    color={danger} />
        <KPI label="Active Orders" value={data?.active_orders||0}   sub="In progress"                    color='#2563eb' />
        <KPI label="Lens Jobs Out" value={data?.lens_jobs_out||0}   sub="At labs"                        color='#7c3aed' />
      </div>

      {/* ── DELIVERY REMINDERS ─────────────────────────────── */}
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
                  <div style={{ fontSize:12, color:muted }}>{r.order_number} · Balance {fmt(r.balance_amount)} · Due {r.deliver_date?.slice(0,10)}</div>
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

      {/* ── MONTH SUMMARY ──────────────────────────────────── */}
      <div style={{ background:'white', border:`1px solid ${border}`, borderRadius:12, overflow:'hidden', marginBottom:18 }}>
        <div style={{ padding:'13px 18px', borderBottom:`1px solid ${border}` }}>
          <span style={{ fontSize:14, fontWeight:700, color:navy }}>📊 This month at a glance</span>
        </div>
        <div style={{ padding:18, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12 }}>
          {[
            {l:'Total billed',  v:fmt(mr.total),     c:navy    },
            {l:'Collected',     v:fmt(mr.collected), c:success },
            {l:'Still owed',   v:fmt(mr.owed),      c:danger  },
            {l:'Orders',       v:mr.order_count||0, c:'#2563eb'},
          ].map(item=>(
            <div key={item.l} style={{ background:cream, borderRadius:10, padding:14, textAlign:'center' }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:5 }}>{item.l}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:item.c }}>{item.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── QUICK ACTIONS ──────────────────────────────────── */}
      <div style={{ background:'white', border:`1px solid ${border}`, borderRadius:12, padding:'16px 18px' }}>
        <div style={{ fontSize:14, fontWeight:700, color:navy, marginBottom:14 }}>⚡ Quick actions</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {[
            {label:'+ New Order',     href:'/orders/new',  bg:gold,     color:navy             },
            {label:'🛍️ Quick Sale',   href:'/quick-sale',  bg:success,  color:'white'          },
            {label:'💸 Add Expense',  href:'/expenses',    bg:'#7c3aed',color:'white'          },
            {label:'🏦 Deposit Cash', href:'/expenses',    bg:'#2563eb',color:'white'          },
            {label:'📋 All Orders',   href:'/orders',      bg:navy,     color:'white'          },
            {label:'📦 Inventory',    href:'/inventory',   bg:cream,    color:navy, bord:border},
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