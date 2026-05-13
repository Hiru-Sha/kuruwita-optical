/* eslint-disable */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const navy=  '#0f1f3d', gold='#c9a84c', cream='#f8f5ef',
      border='#e0ddd6', muted='#6b7280', success='#2d7a4f', danger='#c0392b';

const fmt   = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0,maximumFractionDigits:0});
const today = () => new Date().toISOString().split('T')[0];

export default function Dashboard() {
  const { user }  = useAuth();
  const [data,    setData]   = useState(null);
  const [cash,    setCash]   = useState(null);
  const [loading, setLoading]= useState(true);
  const [mob,     setMob]    = useState(window.innerWidth < 640);

  useEffect(()=>{
    const fn = () => setMob(window.innerWidth < 640);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  },[]);

  const hour     = new Date().getHours();
  const greeting = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  const dateStr  = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const todayStr = today();

  useEffect(()=>{
    const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('ko_token');
    const h     = { Authorization:`Bearer ${token}` };
    Promise.all([
      fetch(`${BASE}/reports/dashboard`,{headers:h}).then(r=>r.json()),
      fetch(`${BASE}/orders?limit=200`,{headers:h}).then(r=>r.json()),
      fetch(`${BASE}/quick-sales?limit=200`,{headers:h}).then(r=>r.json()),
      fetch(`${BASE}/expenses?month=${todayStr.slice(0,7)}`,{headers:h}).then(r=>r.json()).catch(()=>[]),
      fetch(`${BASE}/cash-deposits?date=${todayStr}`,{headers:h}).then(r=>r.json()).catch(()=>[]),
      fetch(`${BASE}/repairs?month=${todayStr.slice(0,7)}`,{headers:h}).then(r=>r.json()).catch(()=>[]),
    ]).then(([dash,orders,qsales,expenses,deposits,repairs])=>{
      setData(dash);
      const todayOrders=(Array.isArray(orders)?orders:[]).filter(o=>o.created_at?.slice(0,10)===todayStr);
      const todayQS    =(Array.isArray(qsales)?qsales:[]).filter(s=>s.created_at?.slice(0,10)===todayStr);
      const todayExp   =(Array.isArray(expenses)?expenses:[]).filter(e=>e.date?.slice(0,10)===todayStr);
      const todayDep   =Array.isArray(deposits)?deposits:[];
      const todayRepairs=(Array.isArray(repairs)?repairs:[]).filter(r=>r.created_at?.slice(0,10)===todayStr&&r.payment_method!=='free');
      const orderIncome=todayOrders.reduce((s,o)=>s+parseFloat(o.advance_amount||0),0);
      const qsIncome   =todayQS.reduce((s,q)=>s+parseFloat(q.total||0),0);
      const repairIncome=todayRepairs.reduce((s,r)=>s+parseFloat(r.charge||0),0);
      const totalIncome=orderIncome+qsIncome+repairIncome;
      const totalExp   =todayExp.reduce((s,e)=>s+parseFloat(e.amount||0),0);
      const totalDep   =todayDep.reduce((s,d)=>s+parseFloat(d.amount||0),0);
      setCash({orderIncome,qsIncome,repairIncome,totalIncome,totalExp,totalDep,
        cashInHand:totalIncome-totalExp-totalDep,
        orderCount:todayOrders.length,qsCount:todayQS.length,repairCount:todayRepairs.length,
        expCount:todayExp.length,depCount:todayDep.length});
    }).catch(console.error).finally(()=>setLoading(false));
  },[]);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:60,color:muted,flexDirection:'column',gap:12}}>
      <div style={{fontSize:32}}>👁️</div><div style={{fontSize:14}}>Loading...</div>
    </div>
  );

  const mr = data?.month_revenue||{};

  const KPI = ({label,value,sub,dark,color}) => (
    <div style={{background:dark?navy:'white',border:`1px solid ${dark?navy:border}`,borderRadius:12,padding:'12px 14px'}}>
      <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.8px',color:dark?gold:muted,marginBottom:4}}>{label}</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:mob?17:22,fontWeight:700,color:dark?'white':(color||navy),lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:dark?'#ede9e0':muted,marginTop:3}}>{sub}</div>}
    </div>
  );

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:mob?19:24,color:navy,margin:0}}>
        {greeting}, {user?.name?.split(' ')[0]}! 👋
      </h1>
      <p style={{fontSize:12,color:muted,margin:'3px 0 14px'}}>{dateStr}</p>

      {/* Daily cash summary */}
      {cash && (
        <div style={{background:'white',border:`1px solid ${border}`,borderRadius:14,overflow:'hidden',marginBottom:14}}>
          <div style={{background:navy,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'white'}}>📅 Today's Cash</div>
              <div style={{fontSize:11,color:'#ede9e0',marginTop:1}}>
                {new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:9,color:gold,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginBottom:1}}>Cash in Hand</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:mob?20:26,fontWeight:700,color:cash.cashInHand>=0?'#86efac':'#fca5a5'}}>
                {fmt(cash.cashInHand)}
              </div>
            </div>
          </div>
          {/* Formula */}
          <div style={{background:cream,padding:'8px 14px',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',fontSize:11,borderBottom:`1px solid ${border}`}}>
            <span style={{color:success,fontWeight:700}}>{fmt(cash.totalIncome)}</span>
            <span style={{color:muted,fontSize:10}}>(orders+sales+repairs)</span>
            <span style={{color:muted}}>−</span>
            <span style={{color:danger,fontWeight:700}}>{fmt(cash.totalExp)}</span>
            <span style={{color:muted}}>−</span>
            <span style={{color:'#2563eb',fontWeight:700}}>{fmt(cash.totalDep)}</span>
            <span style={{color:muted}}>=</span>
            <span style={{fontWeight:700,color:cash.cashInHand>=0?success:danger}}>{fmt(cash.cashInHand)} in hand</span>
          </div>
          {/* 2×2 on mobile, 4-col on desktop */}
          <div style={{display:'grid',gridTemplateColumns:mob?'1fr 1fr':'repeat(4,1fr)'}}>
            {[
              {icon:'📋',label:'Orders',    val:fmt(cash.orderIncome),sub:`${cash.orderCount} advance${cash.orderCount!==1?'s':''}`,  color:success},
              {icon:'🛍️',label:'Sales + Repairs',val:fmt((cash.qsIncome||0)+(cash.repairIncome||0)),   sub:`${cash.qsCount||0} sales · ${cash.repairCount||0} repairs`,         color:success},
              {icon:'💸',label:'Expenses',  val:fmt(cash.totalExp),   sub:`${cash.expCount} item${cash.expCount!==1?'s':''}`,         color:cash.totalExp>0?danger:muted},
              {icon:'🏦',label:'Deposited', val:fmt(cash.totalDep),   sub:`${cash.depCount} deposit${cash.depCount!==1?'s':''}`,      color:'#2563eb'},
            ].map((b,i)=>(
              <div key={i} style={{padding:'12px 14px',borderRight:i<3?`1px solid ${border}`:'none',borderTop:mob&&i>=2?`1px solid ${border}`:'none'}}>
                <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.7px',color:muted,marginBottom:5}}>{b.icon} {b.label}</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:mob?15:19,fontWeight:700,color:b.color,marginBottom:2}}>{b.val}</div>
                <div style={{fontSize:10,color:muted}}>{b.sub}</div>
              </div>
            ))}
          </div>
          {cash.cashInHand>0&&cash.totalDep===0&&(
            <div style={{padding:'9px 14px',background:'#fef9c3',borderTop:`1px solid #fde68a`,fontSize:12,color:'#854d0e',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>💡 {fmt(cash.cashInHand)} ready to deposit</span>
              <a href="/expenses" style={{color:'#854d0e',fontWeight:700,fontSize:12,textDecoration:'none'}}>Record →</a>
            </div>
          )}
          {cash.cashInHand<0&&(
            <div style={{padding:'9px 14px',background:'#fef2f2',borderTop:`1px solid #fca5a5`,fontSize:12,color:danger}}>
              ⚠️ Cash in hand is negative — check entries
            </div>
          )}
          {cash.cashInHand===0&&cash.totalIncome>0&&(
            <div style={{padding:'9px 14px',background:'#dcfce7',borderTop:`1px solid #86efac`,fontSize:12,color:success,fontWeight:600}}>
              ✅ All cash accounted for
            </div>
          )}
        </div>
      )}

      {/* Quick actions — 2 cols on mobile, 3 on desktop */}
      <div style={{display:'grid',gridTemplateColumns:mob?'1fr 1fr':'repeat(3,1fr)',gap:8,marginBottom:14}}>
        {[
          {label:'+ New Order',  href:'/orders/new',  bg:gold,     color:navy,   icon:'📋'},
          {label:'Quick Sale',   href:'/quick-sale',  bg:success,  color:'white',icon:'🛍️'},
          {label:'🔧 Repair',    href:'/repairs',     bg:'#0891b2',color:'white',icon:'🔧'},
          {label:'Add Expense',  href:'/expenses',    bg:'#7c3aed',color:'white',icon:'💸'},
          {label:'Deposit Cash', href:'/expenses',    bg:'#2563eb',color:'white',icon:'🏦'},
          {label:'All Orders',   href:'/orders',      bg:navy,     color:'white',icon:'📋'},
          {label:'Inventory',    href:'/inventory',   bg:cream,    color:navy,   icon:'📦',bord:border},
        ].map(a=>(
          <a key={a.label} href={a.href}
            style={{padding:mob?'14px 8px':'10px 14px',background:a.bg,color:a.color,border:a.bord?`1.5px solid ${a.bord}`:'none',borderRadius:10,fontSize:13,fontWeight:600,textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:6,textAlign:'center'}}>
            <span style={{fontSize:mob?20:15}}>{a.icon}</span>
            <span style={{fontSize:mob?12:13}}>{a.label}</span>
          </a>
        ))}
      </div>

      {/* KPIs — 2 cols on mobile */}
      <div style={{display:'grid',gridTemplateColumns:mob?'1fr 1fr':'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:14}}>
        <KPI label="This Month"    value={fmt(mr.total)}            sub={`${mr.order_count||0} orders`} dark/>
        <KPI label="Collected"     value={fmt(mr.collected)}        sub="Advances"    color={success}/>
        <KPI label="Balance Due"   value={fmt(data?.total_balance)} sub="Outstanding" color={danger}/>
        <KPI label="Active Orders" value={data?.active_orders||0}   sub="In progress" color='#2563eb'/>
      </div>

      {/* Reminders */}
      <div style={{background:'white',border:`1px solid ${border}`,borderRadius:12,overflow:'hidden',marginBottom:14}}>
        <div style={{padding:'12px 16px',borderBottom:`1px solid ${border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:14,fontWeight:700,color:navy}}>🔔 Reminders</span>
          {data?.reminders?.length>0&&<span style={{background:'#fee2e2',color:danger,fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{data.reminders.length} urgent</span>}
        </div>
        <div style={{padding:'4px 16px'}}>
          {!data?.reminders?.length
            ?<p style={{padding:'12px 0',color:muted,fontSize:13}}>✅ No urgent reminders</p>
            :data.reminders.map(r=>(
              <div key={r.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:`1px solid ${cream}`}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:navy,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.customer_name}</div>
                  <div style={{fontSize:11,color:muted}}>{r.order_number} · {fmt(r.balance_amount)}</div>
                </div>
                <a href={`https://wa.me/94${r.phone?.replace(/^0/,'')}?text=${encodeURIComponent(`Hello ${r.customer_name}, your order ${r.order_number} is ready. Please visit Kuruwita Optical. Thank you!`)}`}
                  target="_blank" rel="noreferrer"
                  style={{background:'#25D366',color:'white',padding:'8px 12px',borderRadius:7,fontSize:12,fontWeight:700,textDecoration:'none',whiteSpace:'nowrap',flexShrink:0}}>
                  💬 WA
                </a>
              </div>
            ))
          }
        </div>
      </div>

      {/* Month summary */}
      <div style={{background:'white',border:`1px solid ${border}`,borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:`1px solid ${border}`}}>
          <span style={{fontSize:14,fontWeight:700,color:navy}}>📊 This month</span>
        </div>
        <div style={{padding:12,display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
          {[
            {l:'Total billed',v:fmt(mr.total),    c:navy   },
            {l:'Collected',   v:fmt(mr.collected),c:success},
            {l:'Still owed', v:fmt(mr.owed),     c:danger },
            {l:'Orders',     v:mr.order_count||0,c:'#2563eb'},
          ].map(item=>(
            <div key={item.l} style={{background:cream,borderRadius:10,padding:'12px 12px',textAlign:'center'}}>
              <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.8px',color:muted,marginBottom:4}}>{item.l}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:mob?16:19,fontWeight:700,color:item.c}}>{item.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
