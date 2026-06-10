/* eslint-disable */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QRScanner } from '../components/QRStickers';

const navy=  '#0f1f3d', gold='#c9a84c', cream='#f8f5ef',
      border='#e0ddd6', muted='#6b7280', success='#2d7a4f', danger='#c0392b';

const fmt   = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0,maximumFractionDigits:0});
const today = () => new Date().toISOString().split('T')[0];

export default function Dashboard() {
  const { user }  = useAuth();
  const navigate   = useNavigate();
  const [data,     setData]    = useState(null);
  const [cash,     setCash]    = useState({
    cashInHand:0, allTimeCash:0, bankToday:0,
    orderCash:0, orderBank:0, orderIncome:0,
    qsIncome:0, repairIncome:0, totalIncome:0,
    totalExp:0, totalDep:0, orderCount:0,
    qsCount:0, repairCount:0, expCount:0, depCount:0
  });
  const [cashTab,  setCashTab]  = useState('today'); // today | overall | deposits
  const [loading,  setLoading] = useState(true);
  const [mob,      setMob]     = useState(window.innerWidth < 640);
  const [showScan, setShowScan]= useState(false);
  const [scanItem, setScanItem]= useState(null);

  useEffect(()=>{
    const fn = () => setMob(window.innerWidth < 640);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  },[]);

  const handleScan = async (rawId) => {
    setShowScan(false);
    const id = parseInt(rawId);
    if (!id) return;
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/inventory/${id}`, { headers:{ Authorization:`Bearer ${token}` } });
      const item  = await res.json();
      if (item?.id) setScanItem(item);
      else alert('Item not found');
    } catch(e) { alert('Scan failed'); }
  };

  const hour     = new Date().getHours();
  const greeting = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  const dateStr  = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const todayStr = today();

  useEffect(()=>{
    const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('ko_token');
    const h     = { Authorization:`Bearer ${token}` };
    // Single request — replaces 6 separate API calls
    fetch(`${BASE}/dashboard-today`,{headers:h})
      .then(r=>r.json())
      .then(result=>{
        setData(result);
        setCash(result.daily_cash);
      })
      .catch(console.error)
      .finally(()=>setLoading(false));
  },[]);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:60,color:muted,flexDirection:'column',gap:12}}>
      <div style={{fontSize:32}}>👁️</div><div style={{fontSize:14}}>Loading...</div>
    </div>
  );

  const mr = data?.month_revenue||{};

  const KPI = ({label,value,sub,dark,color,onClick}) => (
    <div onClick={onClick}
      style={{background:dark?navy:'white',border:`1px solid ${dark?navy:border}`,borderRadius:12,padding:'12px 14px',
        cursor:onClick?'pointer':'default',transition:'transform .1s, box-shadow .1s',
        boxShadow:onClick?'0 1px 3px rgba(0,0,0,.08)':'none'}}
      onMouseEnter={e=>{ if(onClick){ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.15)'; }}}
      onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=onClick?'0 1px 3px rgba(0,0,0,.08)':'none'; }}>
      <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.8px',color:dark?gold:muted,marginBottom:4,display:'flex',alignItems:'center',gap:4}}>
        {label}
        {onClick&&<span style={{fontSize:9,opacity:.5}}>↗</span>}
      </div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:mob?17:22,fontWeight:700,color:dark?'white':(color||navy),lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:dark?'#ede9e0':muted,marginTop:3}}>{sub}</div>}
    </div>
  );

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:mob?19:24,color:navy,margin:0}}>
        <span style={{fontSize:10,background:'#dcfce7',color:'#166534',padding:'2px 8px',borderRadius:20,fontFamily:"'DM Sans',sans-serif",fontWeight:700,marginRight:8}}>BUILD v2.6</span>
        {greeting}, {user?.name?.split(' ')[0]}! 👋
      </h1>
      <p style={{fontSize:12,color:muted,margin:'3px 0 14px'}}>{dateStr}</p>

      {/* Daily cash summary */}
      {cash && (
        <div style={{background:'white',border:`1px solid ${border}`,borderRadius:14,overflow:'hidden',marginBottom:14}}>
          <div style={{background:navy,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'white'}}>📅 Today's Cash
                <div style={{display:'flex',gap:4,marginLeft:'auto'}}>
                  {[['today','Today'],['overall','In Hand'],['deposits','Deposits']].map(([k,l])=>(
                    <button key={k} onClick={e=>{e.stopPropagation();setCashTab(k);}}
                      style={{padding:'2px 7px',borderRadius:10,fontSize:9,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
                        border:`1px solid ${cashTab===k?gold:'rgba(255,255,255,.2)'}`,
                        background:cashTab===k?gold:'rgba(255,255,255,.1)',
                        color:cashTab===k?navy:'rgba(255,255,255,.8)'}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{fontSize:11,color:'#ede9e0',marginTop:1}}>
                {new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              {cashTab==='today' && (
                <div style={{display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>
                  <div>
                    <div style={{fontSize:9,color:gold,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginBottom:1}}>Today's Cash</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:mob?18:24,fontWeight:700,color:cash.cashInHand>=0?'#86efac':'#fca5a5'}}>
                      {fmt(cash.cashInHand)}
                    </div>
                  </div>
                  {(cash.bankToday||0)>0 && (
                    <div>
                      <div style={{fontSize:9,color:'#93c5fd',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginBottom:1}}>Bank Today</div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:mob?18:24,fontWeight:700,color:'#93c5fd'}}>
                        {fmt(cash.bankToday)}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {cashTab==='overall' && (
                <div>
                  <div style={{fontSize:9,color:'#fde68a',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginBottom:1}}>Total Cash in Drawer</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:mob?18:24,fontWeight:700,color:'#fde68a'}}>
                    {fmt(cash.allTimeCash||0)}
                  </div>
                  <div style={{fontSize:11,color:'#ede9e0',marginTop:3}}>All time cash − all expenses − all deposits</div>
                </div>
              )}
              {cashTab==='deposits' && (
                <div>
                  <div style={{fontSize:9,color:'#86efac',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginBottom:1}}>Total Deposited (All Time)</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:mob?18:24,fontWeight:700,color:'#86efac'}}>
                    {fmt(cash.allTimeDeposits||0)}
                  </div>
                  <div style={{fontSize:11,color:'#ede9e0',marginTop:3}}>
                    Today: {fmt(cash.totalDep||0)} · {cash.depCount||0} deposit{(cash.depCount||0)!==1?'s':''}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Formula */}
          {cashTab==='today' && <div style={{background:cream,padding:'8px 14px',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',fontSize:11,borderBottom:`1px solid ${border}`}}>
            <span style={{color:success,fontWeight:700}}>{fmt(cash.orderCash||cash.orderIncome)}</span>
            <span style={{color:muted,fontSize:10}}>cash orders</span>
            {(cash.orderBank||0)>0 && <>
              <span style={{color:'#2563eb',fontWeight:700}}>+{fmt(cash.orderBank)}</span>
              <span style={{color:muted,fontSize:10}}>bank</span>
            </>}
            <span style={{color:muted}}>+</span>
            <span style={{color:success,fontWeight:700}}>{fmt((cash.qsIncome||0)+(cash.repairIncome||0))}</span>
            <span style={{color:muted,fontSize:10}}>sales+repairs</span>
            <span style={{color:muted}}>−</span>
            <span style={{color:danger,fontWeight:700}}>{fmt(cash.totalExp)}</span>
            <span style={{color:muted}}>−</span>
            <span style={{color:'#2563eb',fontWeight:700}}>{fmt(cash.totalDep)}</span>
            <span style={{color:muted}}>deposited =</span>
            <span style={{fontWeight:700,color:cash.cashInHand>=0?success:danger}}>{fmt(cash.cashInHand)} today</span>
            {(cash.allTimeCash||0)!==(cash.cashInHand||0) && <>
              <span style={{color:muted}}>·</span>
              <span style={{fontWeight:700,color:'#fde68a'}}>{fmt(cash.allTimeCash||0)} total in drawer</span>
            </>}
          </div>}
          {cashTab!=='today' && <div style={{height:8,borderBottom:`1px solid ${border}`}}/>}
          {/* 2×2 on mobile, 4-col on desktop */}
          <div style={{display:'grid',gridTemplateColumns:mob?'1fr 1fr':'repeat(4,1fr)'}}>
            {[
              {icon:'📋',label:'Orders',    val:fmt(cash.orderIncome),
                sub:(cash.orderBank||0)>0
                  ? `${fmt(cash.orderCash||0)} cash · ${fmt(cash.orderBank)} bank`
                  : `${cash.orderCount} advance${cash.orderCount!==1?'s':''}`,
                color:success},
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
              <span>💡 {fmt(cash.cashInHand)} cash ready to deposit{(cash.bankToday||0)>0?` · ${fmt(cash.bankToday)} received via bank`:''}</span>
              <button onClick={()=>navigate('/expenses')} style={{color:'#854d0e',fontWeight:700,fontSize:12,background:'none',border:'none',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",textDecoration:'underline'}}>Record →</button>
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

      {/* QR SCAN — big prominent button */}
      <button onClick={()=>setShowScan(true)} style={{
        width:'100%', padding: mob?'18px':'14px',
        background:'linear-gradient(135deg,#0f1f3d,#1e3a5f)',
        color:'white', border:'2px solid #c9a84c', borderRadius:12,
        fontSize: mob?17:15, fontWeight:700, cursor:'pointer',
        fontFamily:"'DM Sans',sans-serif",
        display:'flex', alignItems:'center', justifyContent:'center', gap:10,
        marginBottom:10, boxShadow:'0 4px 16px rgba(15,31,61,.3)',
      }}>
        <span style={{fontSize: mob?28:22}}>📷</span>
        <div style={{textAlign:'left'}}>
          <div>Scan Frame QR</div>
          <div style={{fontSize:12,fontWeight:400,opacity:.7}}>Scan sticker → New Order or Quick Sale</div>
        </div>
      </button>

      {/* Quick actions — 2 cols on mobile, 3 on desktop */}
      <div style={{display:'grid',gridTemplateColumns:mob?'1fr 1fr':'repeat(3,1fr)',gap:8,marginBottom:14}}>
        {[
          {label:'+ New Order',  path:'/orders/new',  bg:gold,     color:navy,   icon:'📋'},
          {label:'Quick Sale',   path:'/quick-sale',  bg:success,  color:'white',icon:'🛍️'},
          {label:'Repair',       path:'/repairs',     bg:'#0891b2',color:'white',icon:'🔧'},
          {label:'Add Expense',  path:'/expenses',    bg:'#7c3aed',color:'white',icon:'💸'},
          {label:'Deposit Cash', path:'/expenses',    bg:'#2563eb',color:'white',icon:'🏦'},
          {label:'All Orders',   path:'/orders',      bg:navy,     color:'white',icon:'📋'},
          {label:'Inventory',    path:'/inventory',   bg:cream,    color:navy,   icon:'📦',bord:border},
          {label:'Calculator',   path:'/calculator',  bg:'#0f766e',color:'white',icon:'🧮'},
        ].map(a=>(
          <button key={a.label} onClick={()=>navigate(a.path)}
            style={{padding:mob?'14px 8px':'10px 14px',background:a.bg,color:a.color,border:a.bord?`1.5px solid ${a.bord}`:'none',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",display:'flex',alignItems:'center',justifyContent:'center',gap:6,textAlign:'center'}}>
            <span style={{fontSize:mob?20:15}}>{a.icon}</span>
            <span style={{fontSize:mob?12:13}}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* KPIs — 2 cols on mobile — all clickable */}
      <div style={{display:'grid',gridTemplateColumns:mob?'1fr 1fr':'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:14}}>
        <KPI label="This Month"
          value={fmt(mr.grand_total||mr.total)}
          sub={`${mr.order_count||0} orders · ${mr.qs_count||0} sales · ${mr.repair_count||0} repairs`}
          dark
          onClick={()=>navigate('/activity?view=month&month='+new Date().toISOString().slice(0,7))}/>
        <KPI label="Collected"
          value={fmt(parseFloat(mr.collected||0)+parseFloat(mr.qs_total||0)+parseFloat(mr.repair_total||0))}
          sub="Orders + Sales + Repairs"
          color={success}
          onClick={()=>navigate('/activity?view=collected&month='+new Date().toISOString().slice(0,7))}/>
        <KPI label="Balance Due"
          value={fmt(data?.total_balance)}
          sub="Outstanding"
          color={danger}
          onClick={()=>navigate('/activity?view=balance')}/>
        <KPI label="Active Orders"
          value={data?.active_orders||0}
          sub="In progress"
          color='#2563eb'
          onClick={()=>navigate('/activity?view=active')}/>
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
                <a href={`https://wa.me/94${r.phone?.replace(/^0/,'')}?text=${encodeURIComponent(`Hello ${r.customer_name}, your order ${r.order_number} is ready. Please visit Wickramakalutota Opticals. Thank you!`)}`}
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
            {l:'Total billed',  v:fmt(mr.grand_total||mr.total),                                                                               c:navy   },
            {l:'Collected',     v:fmt(parseFloat(mr.collected||0)+parseFloat(mr.qs_total||0)+parseFloat(mr.repair_total||0)),                  c:success},
            {l:'Still owed',    v:fmt(mr.owed),                                                                                                c:danger },
            {l:'Orders',        v:`${mr.order_count||0} / ${mr.qs_count||0} QS / ${mr.repair_count||0} rep`,                                  c:'#2563eb'},
          ].map(item=>(
            <div key={item.l} style={{background:cream,borderRadius:10,padding:'12px 12px',textAlign:'center'}}>
              <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.8px',color:muted,marginBottom:4}}>{item.l}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:mob?16:19,fontWeight:700,color:item.c}}>{item.v}</div>
            </div>
          ))}
        </div>
      </div>
      {/* QR Scanner */}
      {showScan && (
        <QRScanner
          title="Scan Frame Sticker"
          onScan={handleScan}
          onClose={()=>setShowScan(false)}
        />
      )}

      {/* Scanned item action popup */}
      {scanItem && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.75)', zIndex:9000,
          display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'0 0 20px' }}
          onClick={()=>setScanItem(null)}>
          <div style={{ background:'white', borderRadius:'20px 20px 16px 16px', width:'100%', maxWidth:480,
            padding:24, boxShadow:'0 -8px 40px rgba(0,0,0,.3)', fontFamily:"'DM Sans',sans-serif" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ width:40, height:4, background:'#e0ddd6', borderRadius:2, margin:'0 auto 16px' }}/>
            <div style={{ display:'flex', gap:14, marginBottom:18, alignItems:'center' }}>
              <div style={{ width:52, height:52, borderRadius:12, background:'#f8f5ef',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>
                🕶️
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:16, color:'#0f1f3d', marginBottom:2,
                  overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                  {scanItem.name}
                </div>
                <div style={{ fontSize:13, color:'#6b7280' }}>
                  {scanItem.category} · {scanItem.frame_color||''}
                </div>
                <div style={{ display:'flex', gap:16, marginTop:4 }}>
                  <span style={{ fontSize:16, fontWeight:700, color:'#0f1f3d' }}>
                    Rs.{parseFloat(scanItem.sell_price||0).toLocaleString()}
                  </span>
                  <span style={{ fontSize:13, color: scanItem.quantity>0?'#2d7a4f':'#c0392b', fontWeight:600 }}>
                    {scanItem.quantity>0 ? `${scanItem.quantity} in stock` : 'Out of stock'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <button onClick={async ()=>{
                  // Post to scan-session so PC picks it up too
                  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
                  const token = localStorage.getItem('ko_token');
                  try { await fetch(`${BASE}/scan-session`,{ method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify({inventory_id:scanItem.id,action:'new_order'}) }); } catch(e){}
                  navigate(`/orders/new?frame_id=${scanItem.id}&frame_name=${encodeURIComponent(scanItem.name)}&frame_color=${encodeURIComponent(scanItem.frame_color||'')}&frame_type=${encodeURIComponent(scanItem.frame_type||'')}&frame_price=${scanItem.sell_price}`);
                  setScanItem(null);
                }}
                style={{ padding:'14px 8px', background:'#0f1f3d', color:'white', border:'none',
                  borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <span style={{fontSize:24}}>📋</span>
                <span>New Order</span>
                <span style={{fontSize:10,fontWeight:400,opacity:.7}}>With Rx + customer</span>
              </button>
              <button onClick={async ()=>{
                  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
                  const token = localStorage.getItem('ko_token');
                  try { await fetch(`${BASE}/scan-session`,{ method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify({inventory_id:scanItem.id,action:'quick_sale'}) }); } catch(e){}
                  navigate(`/quick-sale?item_id=${scanItem.id}&item_name=${encodeURIComponent(scanItem.name)}&price=${scanItem.sell_price}`);
                  setScanItem(null);
                }}
                style={{ padding:'14px 8px', background:'#166534', color:'white', border:'none',
                  borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <span style={{fontSize:24}}>⚡</span>
                <span>Quick Sale</span>
                <span style={{fontSize:10,fontWeight:400,opacity:.7}}>Fast cash sale</span>
              </button>
            </div>
            <button onClick={()=>setScanItem(null)}
              style={{ width:'100%', padding:'11px', background:'#f8f5ef', color:'#6b7280',
                border:'none', borderRadius:10, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}