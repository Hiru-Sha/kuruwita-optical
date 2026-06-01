/* eslint-disable */
// ============================================================
//  EndOfDay.js — Daily Cash Register & Close Day Summary
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};
const fmt     = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
const fmtFull = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2,maximumFractionDigits:2});
const today   = () => new Date().toISOString().split('T')[0];
const fmtDate = (d) => new Date(d+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

function apiGet(path) {
  const BASE=process.env.REACT_APP_API_URL||'http://localhost:5000/api';
  const token=localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json());
}

export default function EndOfDay() {
  const [viewDate, setViewDate] = useState(today());
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [drawerOpen, setDrawerOpen] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');

      const [orders, qsales, repairs, expenses, deposits] = await Promise.all([
        fetch(`${BASE}/orders?limit=200`,         { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json()),
        fetch(`${BASE}/quick-sales?limit=200`,    { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json()).catch(()=>[]),
        fetch(`${BASE}/repairs?limit=200`,         { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json()).catch(()=>[]),
        apiGet(`/expenses?month=${viewDate.slice(0,7)}`),
        apiGet(`/cash-deposits?date=${viewDate}`),
      ]);

      const d = viewDate;

      // Orders today
      const todayOrders = (Array.isArray(orders)?orders:[]).filter(o => o.created_at?.slice(0,10)===d);
      const orderCash   = todayOrders.reduce((s,o)=>s+parseFloat(o.advance_amount||0),0);
      const orderBal    = todayOrders.reduce((s,o)=>s+parseFloat(o.balance_amount||0),0);

      // Balance payments received today (orders created earlier, paid today)
      const balPayments = (Array.isArray(orders)?orders:[]).filter(o =>
        o.last_payment_date === d && o.created_at?.slice(0,10) !== d
      );
      const balCash = balPayments.reduce((s,o)=>{
        const orig = parseFloat(o.advance_amount||0) + parseFloat(o.balance_amount||0);
        return s + (parseFloat(o.last_payment_date===d ? o.advance_amount||0 : 0));
      }, 0);

      // Quick sales today
      const todayQS   = (Array.isArray(qsales)?qsales:[]).filter(s => s.created_at?.slice(0,10)===d);
      const qsCash    = todayQS.reduce((s,q)=>s+parseFloat(q.total||0),0);

      // Repairs today
      const todayRep  = (Array.isArray(repairs)?repairs:[]).filter(r => r.created_at?.slice(0,10)===d);
      const repCash   = todayRep.reduce((s,r)=>s+parseFloat(r.charge||0),0);

      // Expenses today
      const todayExp  = (Array.isArray(expenses)?expenses:[]).filter(e => e.date?.slice(0,10)===d);
      const expCash   = todayExp.filter(e=>e.payment_method!=='bank').reduce((s,e)=>s+parseFloat(e.amount||0),0);
      const expBank   = todayExp.filter(e=>e.payment_method==='bank').reduce((s,e)=>s+parseFloat(e.amount||0),0);

      // Deposits today
      const dep       = Array.isArray(deposits)?deposits:[];
      const depCash   = dep.reduce((s,d)=>s+parseFloat(d.amount||0),0);

      const totalIn   = orderCash + qsCash + repCash;
      const cashInHand= totalIn - expCash - depCash;

      setData({
        date: d,
        orders:      { list:todayOrders, cash:orderCash, count:todayOrders.length, outstanding:orderBal },
        quickSales:  { list:todayQS,     cash:qsCash,    count:todayQS.length },
        repairs:     { list:todayRep,    cash:repCash,   count:todayRep.length },
        expenses:    { list:todayExp,    cashOut:expCash, bankOut:expBank },
        deposits:    { list:dep,         total:depCash,  count:dep.length },
        summary: {
          totalIn, cashInHand,
          toDeposit: Math.max(0, cashInHand),
        },
      });
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [viewDate]);

  useEffect(() => { load(); }, [load]);

  const printSlip = () => {
    if (!data) return;
    const s = data.summary;
    const now = new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    const win = window.open('','_blank','width=400,height=700');
    win.document.write(`<!DOCTYPE html><html><head>
<title>End of Day — ${data.date}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;font-size:12px;padding:12px;max-width:300px;margin:0 auto;}
  .center{text-align:center;}
  .bold{font-weight:700;}
  .line{border-top:1px dashed #999;margin:8px 0;}
  .row{display:flex;justify-content:space-between;padding:3px 0;}
  .big{font-size:18px;font-weight:700;}
  @media print{body{padding:4px;}}
</style></head><body>
<div class="center bold" style="font-size:14px;">Wickramakalutota Opticals</div>
<div class="center" style="font-size:10px;">No.57 Kurunegala Road, Chilaw</div>
<div class="center" style="font-size:10px;">Tel: 032 222 1211</div>
<div class="line"></div>
<div class="center bold">END OF DAY SUMMARY</div>
<div class="center" style="font-size:11px;">${fmtDate(data.date)}</div>
<div class="center" style="font-size:10px;color:#666;">Printed: ${now}</div>
<div class="line"></div>

<div class="bold" style="margin-bottom:4px;">INCOME</div>
<div class="row"><span>Orders (${data.orders.count})</span><span>${fmt(data.orders.cash)}</span></div>
<div class="row"><span>Quick Sales (${data.quickSales.count})</span><span>${fmt(data.quickSales.cash)}</span></div>
<div class="row"><span>Repairs (${data.repairs.count})</span><span>${fmt(data.repairs.cash)}</span></div>
<div class="row bold" style="border-top:1px solid #999;padding-top:4px;margin-top:2px;">
  <span>Total In</span><span>${fmt(s.totalIn)}</span>
</div>

<div class="line"></div>
<div class="bold" style="margin-bottom:4px;">OUTGOINGS</div>
<div class="row"><span>Cash Expenses (${data.expenses.list.filter(e=>e.payment_method!=='bank').length})</span><span>− ${fmt(data.expenses.cashOut)}</span></div>
<div class="row"><span>Cash Deposited (${data.deposits.count})</span><span>− ${fmt(data.deposits.total)}</span></div>

<div class="line"></div>
<div class="row bold big">
  <span>Cash in Drawer</span>
  <span style="color:${s.cashInHand>=0?'#2d7a4f':'#c0392b'}">${fmt(s.cashInHand)}</span>
</div>
${s.toDeposit > 0 ? `
<div class="line"></div>
<div class="row" style="font-size:11px;color:#666;">
  <span>Suggested deposit</span><span>${fmt(s.toDeposit)}</span>
</div>` : ''}

${data.orders.outstanding > 0 ? `
<div class="line"></div>
<div class="row" style="font-size:11px;">
  <span>Outstanding balance (today's orders)</span>
  <span style="color:#c0392b;">${fmt(data.orders.outstanding)}</span>
</div>` : ''}

<div class="line"></div>
<div class="center" style="font-size:10px;color:#999;">Thank you</div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
</body></html>`);
    win.document.close();
  };

  const Row = ({label, value, color, bold, sub}) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 16px', borderBottom:`1px solid ${C.cream}` }}>
      <div>
        <div style={{ fontSize:13, fontWeight:bold?700:500, color:C.navy }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:C.muted }}>{sub}</div>}
      </div>
      <div style={{ fontSize:14, fontWeight:700, color:color||C.navy }}>{value}</div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:680, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>🏦 End of Day</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Daily cash register summary</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input type="date" value={viewDate} onChange={e=>setViewDate(e.target.value)}
            style={{ padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy }}/>
          <button onClick={()=>setViewDate(today())}
            style={{ padding:'8px 14px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
            Today
          </button>
          {data && (
            <button onClick={printSlip}
              style={{ padding:'9px 20px', background:C.navy, color:C.gold, border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              🖨️ Print Slip
            </button>
          )}
        </div>
      </div>

      {loading && <div style={{ textAlign:'center', padding:48, color:C.muted }}>Loading...</div>}

      {data && (
        <>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.navy, margin:'16px 0 12px' }}>
            {fmtDate(data.date)}
            {data.date===today() && <span style={{ marginLeft:10, background:C.gold, color:C.navy, fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, fontFamily:"'DM Sans',sans-serif" }}>Today</span>}
          </div>

          {/* Big cash in drawer card */}
          <div style={{ background:data.summary.cashInHand>=0?C.navy:'#fee2e2', borderRadius:14, padding:'20px 24px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:data.summary.cashInHand>=0?C.gold:'#c0392b', marginBottom:4 }}>
                Cash in Drawer
              </div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontWeight:700, color:data.summary.cashInHand>=0?'white':C.danger }}>
                {fmt(data.summary.cashInHand)}
              </div>
              {data.summary.cashInHand < 0 && (
                <div style={{ fontSize:12, color:C.danger, marginTop:4 }}>⚠️ Negative — check your entries</div>
              )}
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:12, color:data.summary.cashInHand>=0?'#ede9e0':C.muted }}>Total In</div>
              <div style={{ fontSize:22, fontWeight:700, color:data.summary.cashInHand>=0?'#86efac':C.navy }}>{fmt(data.summary.totalIn)}</div>
              {data.summary.toDeposit > 0 && (
                <div style={{ marginTop:8, background:'rgba(255,255,255,.15)', borderRadius:8, padding:'6px 12px', fontSize:12, color:data.summary.cashInHand>=0?'white':C.navy, fontWeight:600 }}>
                  Suggest deposit: {fmt(data.summary.toDeposit)}
                </div>
              )}
            </div>
          </div>

          {/* Formula */}
          <div style={{ background:C.cream, borderRadius:10, padding:'10px 16px', marginBottom:16, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', fontSize:13 }}>
            <span style={{ color:C.success, fontWeight:700 }}>{fmt(data.orders.cash)} orders</span>
            <span style={{ color:C.muted }}>+</span>
            <span style={{ color:'#0891b2', fontWeight:700 }}>{fmt(data.quickSales.cash)} sales</span>
            <span style={{ color:C.muted }}>+</span>
            <span style={{ color:'#7c3aed', fontWeight:700 }}>{fmt(data.repairs.cash)} repairs</span>
            <span style={{ color:C.muted }}>−</span>
            <span style={{ color:C.danger, fontWeight:700 }}>{fmt(data.expenses.cashOut)} expenses</span>
            <span style={{ color:C.muted }}>−</span>
            <span style={{ color:'#2563eb', fontWeight:700 }}>{fmt(data.deposits.total)} deposited</span>
            <span style={{ color:C.muted }}>=</span>
            <span style={{ fontWeight:700, fontSize:15, color:data.summary.cashInHand>=0?C.success:C.danger }}>{fmt(data.summary.cashInHand)}</span>
          </div>

          {/* Drawer opening balance */}
          <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', gap:10, alignItems:'center' }}>
            <span style={{ fontSize:13, color:C.muted }}>Opening balance / cash in drawer before today:</span>
            <input type="number" value={drawerOpen} onChange={e=>setDrawerOpen(e.target.value)}
              placeholder="0" style={{ padding:'6px 10px', border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:14, fontWeight:700, fontFamily:'inherit', outline:'none', background:C.cream, width:120 }}/>
            {drawerOpen && <span style={{ fontSize:13, fontWeight:700, color:C.success }}>
              End total: {fmt(parseFloat(drawerOpen||0)+data.summary.cashInHand)}
            </span>}
          </div>

          {/* Breakdown cards */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            {[
              { icon:'📋', label:'Orders',      cash:data.orders.cash,      count:data.orders.count,      color:C.success,   sub:`${fmt(data.orders.outstanding)} outstanding` },
              { icon:'⚡', label:'Quick Sales', cash:data.quickSales.cash,  count:data.quickSales.count,  color:'#0891b2' },
              { icon:'🔧', label:'Repairs',     cash:data.repairs.cash,     count:data.repairs.count,     color:'#7c3aed' },
              { icon:'💸', label:'Cash Expenses',cash:data.expenses.cashOut,count:data.expenses.list.filter(e=>e.payment_method!=='bank').length, color:C.danger, neg:true },
            ].map(box=>(
              <div key={box.label} style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:4 }}>{box.icon} {box.label}</div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:box.color }}>
                      {box.neg?'− ':''}{fmt(box.cash)}
                    </div>
                    {box.sub && <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{box.sub}</div>}
                  </div>
                  <div style={{ background:C.cream, borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700, color:C.muted }}>{box.count}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Detail sections */}
          {data.orders.list.length > 0 && (
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', marginBottom:12 }}>
              <div style={{ padding:'11px 16px', background:C.cream, borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:700, color:C.navy }}>
                📋 Orders ({data.orders.count}) — {fmt(data.orders.cash)} collected
              </div>
              {data.orders.list.map(o=>(
                <Row key={o.id}
                  label={o.customer_name}
                  sub={`${o.order_number} · ${o.frame||'—'}`}
                  value={fmt(o.advance_amount)}
                  color={C.success}
                />
              ))}
            </div>
          )}

          {data.quickSales.list.length > 0 && (
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', marginBottom:12 }}>
              <div style={{ padding:'11px 16px', background:C.cream, borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:700, color:C.navy }}>
                ⚡ Quick Sales ({data.quickSales.count}) — {fmt(data.quickSales.cash)}
              </div>
              {data.quickSales.list.map(s=>(
                <Row key={s.id}
                  label={s.customer_name||'Walk-in'}
                  sub={s.sale_number}
                  value={fmt(s.total)}
                  color='#0891b2'
                />
              ))}
            </div>
          )}

          {data.repairs.list.length > 0 && (
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', marginBottom:12 }}>
              <div style={{ padding:'11px 16px', background:C.cream, borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:700, color:C.navy }}>
                🔧 Repairs ({data.repairs.count}) — {fmt(data.repairs.cash)}
              </div>
              {data.repairs.list.map(r=>(
                <Row key={r.id}
                  label={r.customer_name||'Walk-in'}
                  sub={r.repair_type}
                  value={fmt(r.charge)}
                  color='#7c3aed'
                />
              ))}
            </div>
          )}

          {data.expenses.list.length > 0 && (
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', marginBottom:12 }}>
              <div style={{ padding:'11px 16px', background:C.cream, borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:700, color:C.navy }}>
                💸 Expenses — {fmt(data.expenses.cashOut)} cash · {fmt(data.expenses.bankOut)} bank
              </div>
              {data.expenses.list.map(e=>(
                <Row key={e.id}
                  label={e.description||e.category}
                  sub={`${e.category} · ${e.payment_method==='bank'?'Bank':'Cash'}`}
                  value={`− ${fmt(e.amount)}`}
                  color={C.danger}
                />
              ))}
            </div>
          )}

          {data.deposits.list.length > 0 && (
            <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', marginBottom:12 }}>
              <div style={{ padding:'11px 16px', background:'#eff6ff', borderBottom:`1px solid ${C.border}`, fontSize:13, fontWeight:700, color:'#1e40af' }}>
                🏦 Bank Deposits — {fmt(data.deposits.total)}
              </div>
              {data.deposits.list.map(d=>(
                <Row key={d.id}
                  label={d.bank_name||'Bank Deposit'}
                  sub={d.reference ? `Ref: ${d.reference}` : ''}
                  value={fmt(d.amount)}
                  color='#2563eb'
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}