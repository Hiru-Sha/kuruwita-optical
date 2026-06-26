/* eslint-disable */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QRScanner } from '../components/QRStickers';

const BASE = () => process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tok  = () => localStorage.getItem('ko_token');
const fmt  = n => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});

function StatCard({ label, value, sub, accent, dark, onClick, icon }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background: dark ? 'linear-gradient(135deg, #0A1628 0%, #162240 100%)' : 'var(--bg-surface)',
        border: '1px solid ' + (dark ? 'transparent' : 'var(--border)'),
        borderRadius:'var(--r-lg)', padding:'18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        transition:'all 200ms ease',
        boxShadow: hov && onClick ? 'var(--shadow-lg)' : dark ? '0 4px 20px rgba(10,22,40,.4)' : 'var(--shadow-sm)',
        transform: hov && onClick ? 'translateY(-3px)' : 'none',
        position:'relative', overflow:'hidden',
      }}>
      {dark && <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:'rgba(201,168,76,.08)' }}/>}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color: dark ? 'var(--gold)' : 'var(--text-muted)' }}>{label}</div>
        {icon && <div style={{ opacity:.6 }}>{icon}</div>}
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color: dark ? '#fff' : (accent||'var(--text-primary)'), lineHeight:1.1, marginBottom:6 }}>{value}</div>
      {sub && <div style={{ fontSize:11.5, color: dark ? 'rgba(255,255,255,.5)' : 'var(--text-muted)', lineHeight:1.4 }}>{sub}</div>}
      {onClick && <div style={{ fontSize:10, color: dark ? 'var(--gold)' : 'var(--info)', marginTop:8, opacity: hov?1:.5, transition:'opacity 150ms' }}>View details →</div>}
    </div>
  );
}

function QuickBtn({ label, sub, bg, color='white', icon, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ padding:'14px 10px', background:bg, color, border:'none', borderRadius:'var(--r-lg)', cursor:'pointer', fontFamily:'var(--font-body)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:7, textAlign:'center', transition:'all 200ms ease', transform: hov ? 'translateY(-3px)' : 'none', boxShadow: hov ? '0 8px 20px rgba(0,0,0,.2)' : '0 2px 6px rgba(0,0,0,.1)', minHeight:80 }}>
      <div style={{ fontSize:22, lineHeight:1 }}>{icon}</div>
      <div style={{ fontSize:12, fontWeight:700, lineHeight:1.25 }}>{label}</div>
      {sub && <div style={{ fontSize:10, opacity:.7 }}>{sub}</div>}
    </button>
  );
}

export default function Dashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [data,     setData]    = useState(null);
  const [cash,     setCash]    = useState({});
  const [cashTab,  setCashTab] = useState('today');
  const [loading,  setLoading] = useState(true);
  const [showScan, setShowScan]= useState(false);
  const [scanItem, setScanItem]= useState(null);

  const hour     = new Date().getHours();
  const greeting = hour<12 ? 'Good morning' : hour<17 ? 'Good afternoon' : 'Good evening';
  const dateStr  = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  useEffect(()=>{
    fetch(`${BASE()}/dashboard-today`,{headers:{Authorization:`Bearer ${tok()}`}})
      .then(r=>r.json())
      .then(d=>{ setData(d); setCash(d.daily_cash||{}); })
      .catch(console.error)
      .finally(()=>setLoading(false));
  },[]);

  const handleScan = async rawId => {
    setShowScan(false);
    const id = parseInt(rawId);
    if (!id) return;
    try {
      const res  = await fetch(`${BASE()}/inventory/${id}`,{headers:{Authorization:`Bearer ${tok()}`}});
      const item = await res.json();
      if (item?.id) setScanItem(item);
    } catch(e) {}
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',flexDirection:'column',gap:14}}>
      <div style={{width:48,height:48,border:'3px solid var(--border)',borderTopColor:'var(--gold)',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <div style={{fontSize:13,color:'var(--text-muted)',fontWeight:500}}>Loading dashboard…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const mr = data?.month_revenue || {};
  const CASH_TABS = [{ k:'today',l:'Today' },{ k:'overall',l:'In Hand' },{ k:'deposits',l:'Deposits' }];

  const QUICK_ACTIONS = [
    { label:'New Order',   sub:'With Rx',   bg:'var(--gold)',    color:'var(--navy)', icon:'📋', path:'/orders/new'  },
    { label:'Quick Sale',  sub:'Cash sale', bg:'#059669',        color:'#fff',        icon:'⚡', path:'/quick-sale'  },
    { label:'Repair',      sub:'Ticket',    bg:'#0891b2',        color:'#fff',        icon:'🔧', path:'/repairs'     },
    { label:'All Orders',  sub:'View list', bg:'var(--navy)',    color:'#fff',        icon:'📝', path:'/orders'      },
    { label:'Inventory',   sub:'Stock',     bg:'var(--bg-elevated)', color:'var(--text-primary)', icon:'📦', path:'/inventory' },
    { label:'Expense',     sub:'Add',       bg:'#7c3aed',        color:'#fff',        icon:'💸', path:'/expenses'    },
    { label:'Deposit',     sub:'To bank',   bg:'#2563eb',        color:'#fff',        icon:'🏦', path:'/expenses'    },
    { label:'Calculator',  sub:'Lens',      bg:'#0f766e',        color:'#fff',        icon:'🧮', path:'/calculator'  },
    { label:'Lens Prices', sub:'List',      bg:'#b45309',        color:'#fff',        icon:'🔍', path:'/lens-prices' },
    { label:'Customers',   sub:'Database',  bg:'#be185d',        color:'#fff',        icon:'👥', path:'/customers'   },
  ];

  return (
    <div style={{fontFamily:'var(--font-body)',maxWidth:900,margin:'0 auto'}}>

      {/* Greeting */}
      <div style={{marginBottom:24}}>
        <span style={{fontSize:10,fontWeight:700,background:'var(--success-bg)',color:'var(--success)',padding:'3px 10px',borderRadius:'var(--r-full)',border:'1px solid var(--success-border)',letterSpacing:'.06em',textTransform:'uppercase'}}>
          BUILD v2.7
        </span>
        <h1 style={{fontFamily:'var(--font-display)',fontSize:26,color:'var(--text-primary)',margin:'8px 0 4px',fontWeight:600}}>
          {greeting}, {user?.full_name?.split(' ')[0] || 'there'}! 👋
        </h1>
        <p style={{fontSize:13,color:'var(--text-muted)',margin:0}}>{dateStr}</p>
      </div>

      {/* Cash card */}
      <div style={{background:'linear-gradient(135deg, #0A1628 0%, #162240 100%)',borderRadius:'var(--r-xl)',overflow:'hidden',marginBottom:20,boxShadow:'0 8px 32px rgba(10,22,40,.35)'}}>
        {/* Header */}
        <div style={{padding:'18px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'var(--gold)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:2}}>Today's Cash</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,.45)'}}>{new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</div>
            </div>
            <div style={{display:'flex',gap:4,background:'rgba(255,255,255,.08)',borderRadius:'var(--r-md)',padding:3}}>
              {CASH_TABS.map(({k,l})=>(
                <button key={k} onClick={()=>setCashTab(k)}
                  style={{padding:'4px 12px',borderRadius:'var(--r-sm)',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-body)',border:'none',background:cashTab===k?'var(--gold)':'transparent',color:cashTab===k?'var(--navy)':'rgba(255,255,255,.6)',transition:'all 150ms'}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            {cashTab==='today' && (
              <div style={{fontFamily:'var(--font-display)',fontSize:30,fontWeight:700,color:(cash.cashInHand||0)>=0?'#86efac':'#fca5a5',lineHeight:1}}>
                {fmt(cash.cashInHand||0)}
              </div>
            )}
            {cashTab==='overall' && <div style={{fontFamily:'var(--font-display)',fontSize:30,fontWeight:700,color:'#fde68a',lineHeight:1}}>{fmt(cash.allTimeCash||0)}</div>}
            {cashTab==='deposits' && <div style={{fontFamily:'var(--font-display)',fontSize:30,fontWeight:700,color:'#86efac',lineHeight:1}}>{fmt(cash.allTimeDeposits||0)}</div>}
          </div>
        </div>

        {/* Formula bar */}
        {cashTab==='today' && (
          <div style={{background:'rgba(255,255,255,.05)',borderTop:'1px solid rgba(255,255,255,.08)',padding:'8px 22px',display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',fontSize:11}}>
            <span style={{color:'#86efac',fontWeight:700}}>{fmt(cash.orderCash||cash.orderIncome||0)}</span>
            <span style={{color:'rgba(255,255,255,.35)'}}>orders +</span>
            <span style={{color:'#86efac',fontWeight:700}}>{fmt((cash.qsIncome||0)+(cash.repairIncome||0))}</span>
            <span style={{color:'rgba(255,255,255,.35)'}}>sales −</span>
            <span style={{color:'#fca5a5',fontWeight:700}}>{fmt(cash.totalExp||0)}</span>
            <span style={{color:'rgba(255,255,255,.35)'}}>exp −</span>
            <span style={{color:'#93c5fd',fontWeight:700}}>{fmt(cash.totalDep||0)}</span>
            <span style={{color:'rgba(255,255,255,.35)'}}>deposited</span>
          </div>
        )}

        {/* 4 metric tiles */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',borderTop:'1px solid rgba(255,255,255,.08)'}}>
          {[
            {label:'Orders',        val:fmt(cash.orderIncome||0),                              sub:`${cash.orderCount||0} advances`,         color:'#86efac'},
            {label:'Sales+Repairs', val:fmt((cash.qsIncome||0)+(cash.repairIncome||0)),        sub:`${cash.qsCount||0} QS · ${cash.repairCount||0} rep`,color:'#86efac'},
            {label:'Expenses',      val:fmt(cash.totalExp||0),                                 sub:`${cash.expCount||0} items`,              color:(cash.totalExp||0)>0?'#fca5a5':'rgba(255,255,255,.4)'},
            {label:'Deposited',     val:fmt(cash.totalDep||0),                                 sub:`${cash.depCount||0} deposits`,           color:'#93c5fd'},
          ].map((b,i)=>(
            <div key={i} style={{padding:'14px 18px',borderRight:i<3?'1px solid rgba(255,255,255,.07)':'none'}}>
              <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'rgba(255,255,255,.35)',marginBottom:6}}>{b.label}</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:17,fontWeight:700,color:b.color,marginBottom:3}}>{b.val}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,.35)'}}>{b.sub}</div>
            </div>
          ))}
        </div>

        {(cash.cashInHand||0) > 0 && (cash.totalDep||0) === 0 && (
          <div style={{background:'rgba(253,230,138,.12)',borderTop:'1px solid rgba(253,230,138,.2)',padding:'10px 22px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:12,color:'#fde68a'}}>💡 {fmt(cash.cashInHand)} ready to deposit</span>
            <button onClick={()=>navigate('/expenses')} style={{color:'#fde68a',fontWeight:700,fontSize:12,background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-body)'}}>Record →</button>
          </div>
        )}
      </div>

      {/* QR Scan */}
      <button onClick={()=>setShowScan(true)} style={{width:'100%',padding:'14px 20px',marginBottom:20,background:'var(--bg-surface)',border:'1.5px solid var(--border)',borderRadius:'var(--r-lg)',display:'flex',alignItems:'center',gap:14,cursor:'pointer',fontFamily:'var(--font-body)',boxShadow:'var(--shadow-sm)',transition:'all 200ms'}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--gold)';e.currentTarget.style.boxShadow='0 0 0 3px rgba(201,168,76,.12)';}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.boxShadow='var(--shadow-sm)';}}>
        <div style={{width:42,height:42,borderRadius:'var(--r-md)',background:'linear-gradient(135deg, #0A1628, #1e3a5f)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <span style={{fontSize:22}}>📷</span>
        </div>
        <div style={{textAlign:'left',flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:'var(--text-primary)'}}>Scan Frame QR</div>
          <div style={{fontSize:12,color:'var(--text-muted)'}}>Scan sticker → New Order or Quick Sale</div>
        </div>
        <div style={{color:'var(--text-muted)',fontSize:12}}>→</div>
      </button>

      {/* Quick actions */}
      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--text-muted)',marginBottom:12}}>Quick Actions</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
          {QUICK_ACTIONS.map(a=><QuickBtn key={a.label} {...a} onClick={()=>navigate(a.path)}/>)}
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
        <StatCard dark label="This Month" icon={<span style={{fontSize:16}}>📅</span>}
          value={fmt(mr.grand_total||mr.total||0)}
          sub={`${mr.order_count||0} orders · ${mr.qs_count||0} sales · ${mr.repair_count||0} repairs`}
          onClick={()=>navigate('/activity?view=month&month='+new Date().toISOString().slice(0,7))}/>
        <StatCard label="Collected" accent="var(--success)" icon={<span style={{fontSize:16}}>✅</span>}
          value={fmt((parseFloat(mr.collected||0))+(parseFloat(mr.qs_total||0))+(parseFloat(mr.repair_total||0)))}
          sub="Orders + Sales + Repairs" onClick={()=>navigate('/activity?view=collected')}/>
        <StatCard label="Balance Due" accent="var(--danger)" icon={<span style={{fontSize:16}}>⏳</span>}
          value={fmt(data?.total_balance||0)} sub="Outstanding" onClick={()=>navigate('/balance')}/>
        <StatCard label="Active Orders" accent="var(--info)" icon={<span style={{fontSize:16}}>📋</span>}
          value={data?.active_orders||0} sub="In progress" onClick={()=>navigate('/orders')}/>
      </div>

      {/* Reminders */}
      <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--r-lg)',overflow:'hidden',marginBottom:20,boxShadow:'var(--shadow-sm)'}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',fontFamily:'var(--font-display)'}}>🔔 Reminders</div>
          {(data?.reminders?.length||0)>0 && (
            <span style={{background:'var(--danger-bg)',color:'var(--danger)',fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:'var(--r-full)',border:'1px solid var(--danger-border)'}}>
              {data.reminders.length} urgent
            </span>
          )}
        </div>
        <div>
          {!data?.reminders?.length
            ? <div style={{padding:'20px',color:'var(--text-muted)',fontSize:13,display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:16}}>✅</span> No urgent reminders today</div>
            : data.reminders.map((r,i)=>(
                <div key={r.id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 20px',borderBottom:i<data.reminders.length-1?'1px solid var(--border)':'none',transition:'background 150ms'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg-base)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{width:36,height:36,borderRadius:'var(--r-md)',background:'var(--danger-bg)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{fontSize:16}}>⏰</span></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.customer_name}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>
                      {r.order_number} · <span style={{color:'var(--danger)',fontWeight:600}}>{fmt(r.balance_amount)}</span> due
                    </div>
                  </div>
                  <a href={`https://wa.me/94${r.phone?.replace(/^0/,'')}?text=${encodeURIComponent(`Hello ${r.customer_name}, your order ${r.order_number} is ready. Please visit Wickramakalutota Opticals. Thank you!`)}`}
                    target="_blank" rel="noreferrer"
                    style={{background:'#25D366',color:'white',padding:'7px 14px',borderRadius:'var(--r-md)',fontSize:12,fontWeight:700,textDecoration:'none',flexShrink:0}}>
                    💬 WA
                  </a>
                </div>
              ))
          }
        </div>
      </div>

      {/* Month summary */}
      <div style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--r-lg)',overflow:'hidden',boxShadow:'var(--shadow-sm)'}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)'}}>
          <div style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',fontFamily:'var(--font-display)'}}>📊 This month</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:1,background:'var(--border)'}}>
          {[
            {l:'Total billed',  v:fmt(mr.grand_total||mr.total||0),                                                                          c:'var(--text-primary)'},
            {l:'Collected',     v:fmt((parseFloat(mr.collected||0))+(parseFloat(mr.qs_total||0))+(parseFloat(mr.repair_total||0))),           c:'var(--success)'},
            {l:'Still owed',    v:fmt(mr.owed||0),                                                                                           c:'var(--danger)'},
            {l:'Activity',      v:`${mr.order_count||0} ord · ${mr.qs_count||0} QS · ${mr.repair_count||0} rep`,                            c:'var(--info)'},
          ].map(item=>(
            <div key={item.l} style={{background:'var(--bg-surface)',padding:'18px 20px'}}>
              <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--text-muted)',marginBottom:6}}>{item.l}</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:700,color:item.c}}>{item.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showScan && <QRScanner title="Scan Frame Sticker" onScan={handleScan} onClose={()=>setShowScan(false)}/>}
      {scanItem && (
        <div style={{position:'fixed',inset:0,background:'var(--bg-overlay)',zIndex:9000,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 0 20px'}}
          onClick={()=>setScanItem(null)}>
          <div style={{background:'var(--bg-surface)',borderRadius:'var(--r-xl)',width:'100%',maxWidth:480,padding:24,boxShadow:'var(--shadow-xl)'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{width:40,height:4,background:'var(--border)',borderRadius:2,margin:'0 auto 20px'}}/>
            <div style={{display:'flex',gap:14,marginBottom:20,alignItems:'center'}}>
              <div style={{width:52,height:52,borderRadius:'var(--r-lg)',background:'var(--bg-sunken)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,flexShrink:0}}>🕶️</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:16,color:'var(--text-primary)',marginBottom:2}}>{scanItem.name}</div>
                <div style={{fontSize:13,color:'var(--text-secondary)'}}>{scanItem.category}</div>
                <div style={{display:'flex',gap:14,marginTop:4}}>
                  <span style={{fontSize:16,fontWeight:700,color:'var(--text-primary)'}}>Rs.{parseFloat(scanItem.sell_price||0).toLocaleString()}</span>
                  <span style={{fontSize:13,color:scanItem.quantity>0?'var(--success)':'var(--danger)',fontWeight:600}}>
                    {scanItem.quantity>0?`${scanItem.quantity} in stock`:'Out of stock'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              {[
                {label:'New Order',  icon:'📋', bg:'var(--navy)', color:'#fff', fn:()=>{ navigate(`/orders/new?frame_id=${scanItem.id}&frame_name=${encodeURIComponent(scanItem.name)}&frame_price=${scanItem.sell_price}`); setScanItem(null); }},
                {label:'Quick Sale', icon:'⚡', bg:'var(--success)', color:'#fff', fn:()=>{ navigate(`/quick-sale?item_id=${scanItem.id}&item_name=${encodeURIComponent(scanItem.name)}&price=${scanItem.sell_price}`); setScanItem(null); }},
              ].map(a=>(
                <button key={a.label} onClick={a.fn}
                  style={{padding:'14px 10px',background:a.bg,color:a.color,border:'none',borderRadius:'var(--r-lg)',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-body)',display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
                  <span style={{fontSize:24}}>{a.icon}</span><span>{a.label}</span>
                </button>
              ))}
            </div>
            <button onClick={()=>setScanItem(null)}
              style={{width:'100%',padding:'11px',background:'var(--bg-sunken)',color:'var(--text-muted)',border:'none',borderRadius:'var(--r-md)',fontSize:13,cursor:'pointer',fontFamily:'var(--font-body)'}}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}