/* eslint-disable */
// ============================================================
//  LabReceivings.js — ALL orders, bulk inline entry
//  Shows every non-cancelled order.
//  Quick Entry mode: all rows open at once, Tab to move fast.
// ============================================================
import React, { useEffect, useState, useCallback, useRef } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};
const fmt     = n => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
const fmtDate = d => { if(!d) return '—'; return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); };
const today   = () => new Date().toISOString().split('T')[0];
const LABS    = ['Negombo Optical','Solex Optical'];

const BASE_URL = () => process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tok      = () => localStorage.getItem('ko_token');
const apiPatch = (path, body) =>
  fetch(`${BASE_URL()}${path}`,{ method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` }, body:JSON.stringify(body) }).then(r=>r.json());
const apiPost = (path, body) =>
  fetch(`${BASE_URL()}${path}`,{ method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` }, body:JSON.stringify(body) }).then(r=>r.json());

const INP_S = { padding:'6px 9px', border:`1.5px solid ${C.gold}`, borderRadius:7, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none', background:'#fffbeb', fontWeight:700 };

// ── Pay modal ─────────────────────────────────────────────────
function PayModal({ orders, title, skipExpense, onClose, onDone }) {
  const total     = orders.reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0), 0);
  const [payDate,   setPayDate]   = useState(today());
  const [payMethod, setPayMethod] = useState('cash');
  const [notes,     setNotes]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const INP = { padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%', boxSizing:'border-box' };

  const handlePay = async () => {
    if (!orders.length) return;
    setSaving(true);
    try {
      await Promise.all(orders.map(o=>apiPatch(`/orders/${o.id}`,{
        lab_paid:true, lab_paid_date:payDate, lab_payment_method:payMethod,
      })));
      if (!skipExpense) {
        const byLab = {};
        orders.forEach(o=>{
          const lab=o.lens_company||'Lab';
          if(!byLab[lab]) byLab[lab]={total:0,nums:[]};
          byLab[lab].total+=parseFloat(o.lab_bill_amount||0);
          byLab[lab].nums.push(o.order_number);
        });
        await Promise.all(Object.entries(byLab).map(([lab,d])=>apiPost('/expenses',{
          date:payDate, category:'Lab Payment',
          description:`${lab} — ${d.nums.length} order${d.nums.length!==1?'s':''}`,
          amount:d.total, payment_method:payMethod,
          notes:notes||`Orders: ${d.nums.join(', ')}`,
        })));
      }
      onDone(`✅ ${orders.length} orders marked paid${skipExpense?'':' · expense recorded'}`, orders.map(o=>o.id));
    } catch(e){ alert('Failed: '+e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(15,31,61,.6)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:460,boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.navy,marginBottom:4}}>{title}</div>
        <div style={{fontSize:13,color:C.muted,marginBottom:14}}>{orders.length} order{orders.length!==1?'s':''} · Total: <b style={{color:C.danger}}>{fmt(total)}</b></div>

        <div style={{background:C.cream,borderRadius:10,padding:'8px 12px',marginBottom:12,maxHeight:160,overflowY:'auto'}}>
          {orders.map(o=>(
            <div key={o.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0',borderBottom:'1px solid #f0ede5'}}>
              <span style={{color:C.navy,fontWeight:600}}>{o.order_number}</span>
              <span style={{color:C.muted}}>{o.customer_name}</span>
              <span style={{color:C.danger,fontWeight:700}}>{fmt(o.lab_bill_amount)}</span>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700,color:C.navy,paddingTop:6,marginTop:3}}>
            <span>Total</span><span>{fmt(total)}</span>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
          <div>
            <label style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:C.muted,display:'block',marginBottom:4}}>Date</label>
            <input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)} style={INP}/>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:C.muted,display:'block',marginBottom:4}}>Method</label>
            <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} style={{...INP,cursor:'pointer'}}>
              <option value="cash">💵 Cash</option>
              <option value="bank">🏦 Bank</option>
              <option value="cheque">📋 Cheque</option>
            </select>
          </div>
        </div>

        <input value={notes} onChange={e=>setNotes(e.target.value)}
          placeholder="Notes (optional)" style={{...INP,marginBottom:12}}/>

        {skipExpense
          ? <div style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:12,color:'#92400e'}}>
              ⚠️ <b>No expense will be created</b> — use this only for orders you've already recorded an expense for manually
            </div>
          : <div style={{background:'#dcfce7',border:'1px solid #86efac',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:12,color:'#166534'}}>
              ✅ Lab payment expense will be auto-created — don't add separately in Expenses
            </div>
        }

        <div style={{display:'flex',gap:8}}>
          <button onClick={handlePay} disabled={saving||!orders.length}
            style={{flex:1,padding:'12px',background:saving?C.muted:C.success,color:'white',border:'none',borderRadius:9,fontSize:14,fontWeight:700,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit'}}>
            {saving?'⏳ Saving…':'✅ Confirm — '+fmt(total)}
          </button>
          <button onClick={onClose}
            style={{padding:'12px 16px',background:C.cream,border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:C.muted}}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Single order row ──────────────────────────────────────────
function OrderRow({ order, selected, onToggle, onSaved, quickMode, rowIndex, totalRows }) {
  const hasBill  = parseFloat(order.lab_bill_amount||0) > 0;
  const isPaid   = order.lab_paid;
  const canSelect= hasBill && !isPaid;

  const [billVal,  setBillVal]  = useState(order.lab_bill_amount || '');
  const [labVal,   setLabVal]   = useState(order.lens_company || 'Negombo Optical');
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const inputRef   = useRef();

  // Quick mode: always in edit mode
  const isOpen = quickMode || editing;

  useEffect(()=>{
    if (quickMode && !isPaid && inputRef.current) {
      // only focus first row automatically
      if (rowIndex === 0) inputRef.current.focus();
    }
  },[quickMode]);

  useEffect(()=>{
    setBillVal(order.lab_bill_amount || '');
    setLabVal(order.lens_company || 'Negombo Optical');
  },[order.lab_bill_amount, order.lens_company]);

  const save = async (markPaid=false) => {
    const bill = parseFloat(billVal);
    if (!bill || bill <= 0) { setEditing(false); return; }
    setSaving(true);
    try {
      const updates = {
        lab_bill_amount: bill,
        lens_buy_price:  bill, // sync lens buy price = lab bill amount
        lens_company:    labVal,
        lens_step:       Math.max(order.lens_step||0, 2),
        ...(markPaid ? { lab_paid:true, lab_paid_date:today(), lab_payment_method:'cash' } : {}),
      };
      await apiPatch(`/orders/${order.id}`, updates);
      // Pass updated fields back so parent updates state without reload
      onSaved(updates);
      setEditing(false);
    } catch(e){ alert('Save failed'); }
    finally { setSaving(false); }
  };

  const handleKey = e => {
    if (e.key==='Enter') { e.preventDefault(); save(); }
    if (e.key==='Escape') setEditing(false);
  };

  const bg = isPaid ? '#f0fdf4' : selected ? '#eff6ff' : isOpen && !quickMode ? '#fffbeb' : 'white';

  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'36px 110px 1fr 150px 185px 90px 85px',
      padding: quickMode ? '7px 14px' : '10px 16px',
      borderBottom:`1px solid ${C.cream}`,
      alignItems:'center',
      background: bg,
      transition:'background .1s',
    }}>

      {/* Checkbox */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
        {canSelect && (
          <input type="checkbox" checked={selected} onChange={onToggle}
            style={{cursor:'pointer',width:15,height:15}}/>
        )}
      </div>

      {/* Order + date */}
      <div>
        <div style={{fontSize:12,fontWeight:700,color:C.navy}}>{order.order_number}</div>
        <div style={{fontSize:10,color:C.muted}}>{fmtDate(order.created_at?.slice(0,10))}</div>
      </div>

      {/* Customer + lens */}
      <div style={{minWidth:0}}>
        <div style={{fontSize:13,fontWeight:600,color:C.navy,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{order.customer_name}</div>
        <div style={{fontSize:11,color:C.muted,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
          {[order.lens_type,order.lens_coating,order.frame].filter(Boolean).join(' · ')}
        </div>
      </div>

      {/* Lab selector */}
      <div>
        {isPaid
          ? <span style={{fontSize:12,color:C.muted}}>{order.lens_company||'—'}</span>
          : isOpen
            ? <div style={{display:'flex',gap:4}}>
                {LABS.map(l=>(
                  <button key={l} onClick={()=>setLabVal(l)}
                    style={{padding:'4px 8px',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',border:`1.5px solid ${labVal===l?C.navy:C.border}`,background:labVal===l?C.navy:'white',color:labVal===l?'white':C.muted}}>
                    {l==='Negombo Optical'?'Negombo':'Solex'}
                  </button>
                ))}
              </div>
            : <span style={{fontSize:12,color:order.lens_company?C.muted:'#bbb',cursor:'pointer',fontStyle:order.lens_company?'normal':'italic'}} onClick={()=>setEditing(true)}>
                {order.lens_company||'tap to set'}
              </span>
        }
      </div>

      {/* Bill input */}
      <div>
        {isPaid
          ? <span style={{fontSize:13,fontWeight:700,color:C.success}}>{fmt(order.lab_bill_amount)}</span>
          : isOpen
            ? <div style={{display:'flex',gap:5,alignItems:'center'}}>
                <input
                  ref={inputRef}
                  type="number"
                  value={billVal}
                  onChange={e=>setBillVal(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Amount"
                  style={{...INP_S,width:88}}
                  tabIndex={0}
                />
                <button onClick={()=>save()} disabled={saving}
                  style={{padding:'5px 9px',background:saving?C.muted:C.success,color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
                  {saving?'…':'✓'}
                </button>
                {!quickMode && (
                  <button onClick={()=>setEditing(false)}
                    style={{padding:'5px 7px',background:C.cream,border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,cursor:'pointer',fontFamily:'inherit',color:C.muted,flexShrink:0}}>✕</button>
                )}
              </div>
            : hasBill
              ? <span onClick={()=>setEditing(true)} style={{fontSize:13,fontWeight:700,color:C.danger,cursor:'pointer',textDecoration:'underline dotted'}}>
                  {fmt(order.lab_bill_amount)}
                </span>
              : <button onClick={()=>setEditing(true)}
                  style={{padding:'4px 10px',background:'#fff7ed',border:`1.5px solid #fed7aa`,borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color:'#c2410c'}}>
                  + Enter bill
                </button>
        }
      </div>

      {/* Lab paid */}
      <div>
        {!hasBill
          ? <span style={{fontSize:11,color:'#d1d5db'}}>—</span>
          : isPaid
            ? <span style={{background:'#dcfce7',color:C.success,fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:20}}>✅ Paid</span>
            : <span style={{background:'#fee2e2',color:C.danger,fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:20}}>⏳ Owed</span>
        }
      </div>

      {/* Status */}
      <div>
        {(() => {
          const si = {
            0:{label:'Not sent',bg:'#f3f4f6',color:'#6b7280'},
            1:{label:'Sent',bg:'#dbeafe',color:'#1e40af'},
            2:{label:'Received',bg:'#dcfce7',color:'#2d7a4f'},
            3:{label:'Delivered',bg:'#f0fdf4',color:'#166534'},
          }[order.lens_step||0]||{label:'—',bg:'#f3f4f6',color:'#6b7280'};
          return <span style={{background:si.bg,color:si.color,fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:20}}>{si.label}</span>;
        })()}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function LabReceivings() {
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [labFilt,     setLabFilt]     = useState('all');
  const [billFilt,    setBillFilt]    = useState('all');   // all|nobill|unpaid|paid
  const [search,      setSearch]      = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [payModal,    setPayModal]    = useState(null);    // null | {orders,title,skipExpense}
  const [quickMode,   setQuickMode]   = useState(false);
  const [toast,       setToast]       = useState('');

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // fetch ALL orders — no limit cap, no customer_own_frame filter
      const res  = await fetch(`${BASE_URL()}/orders?limit=5000`, { headers:{ Authorization:`Bearer ${tok()}` } });
      const data = await res.json();
      const arr  = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
      // Auto-mark old orders (before 21 Apr 2026) as lab_paid
      // because those lens costs were already recorded as expenses manually
      // Orders before 21 Apr 2026 — lens costs were paid as expenses, mark all as paid
      const CUTOFF = new Date('2026-04-21');
      const processed = arr
        .filter(o => o.status !== 'cancelled')
        .map(o => {
          const orderDate = new Date(o.created_at || o.order_date || 0);
          // Mark ALL pre-cutoff orders as lab_paid (bill entered or not)
          // These were settled manually as expenses before the system tracked this
          if (orderDate < CUTOFF && !o.lab_paid) {
            return {
              ...o,
              lab_paid:           true,
              lab_paid_date:      o.lab_paid_date || '2026-04-20',
              lab_payment_method: o.lab_payment_method || 'expense',
              // If no bill entered, set 0 so it doesn't show "Enter bill"
              lab_bill_amount:    o.lab_bill_amount || 0,
              _auto_marked:       true,
            };
          }
          return o;
        });
      setOrders(processed);

      // Save auto-marked orders to DB in batches so they stay paid permanently
      const toMark = processed.filter(o => o._auto_marked);
      if (toMark.length > 0) {
        // Save in small batches to avoid overwhelming the server
        for (let i = 0; i < toMark.length; i += 10) {
          const batch = toMark.slice(i, i + 10);
          await Promise.all(batch.map(o =>
            apiPatch(`/orders/${o.id}`, {
              lab_paid:           true,
              lab_paid_date:      '2026-04-20',
              lab_payment_method: 'expense',
              lab_bill_amount:    parseFloat(o.lab_bill_amount || 0) || 0,
              lab_notes:          'Lens cost settled via expenses before 21 Apr 2026',
            }).catch(() => {})
          ));
        }
      }
      setSelectedIds(new Set());
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  const filtered = orders.filter(o=>{
    if(search){
      const q=search.toLowerCase();
      if(!o.order_number?.toLowerCase().includes(q)&&
         !o.customer_name?.toLowerCase().includes(q)&&
         !o.lens_company?.toLowerCase().includes(q)) return false;
    }
    if(labFilt!=='all' && o.lens_company!==labFilt) return false;
    if(billFilt==='nobill') return !parseFloat(o.lab_bill_amount||0);
    if(billFilt==='unpaid') return parseFloat(o.lab_bill_amount||0)>0 && !o.lab_paid;
    if(billFilt==='paid')   return o.lab_paid;
    return true;
  }).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)); // newest first

  // Stats
  const noBill   = orders.filter(o=>!parseFloat(o.lab_bill_amount||0)).length;
  const unpaidAmt= orders.filter(o=>parseFloat(o.lab_bill_amount||0)>0&&!o.lab_paid)
                         .reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0);
  const paidMo   = orders.filter(o=>{ const m=new Date().toISOString().slice(0,7); return o.lab_paid&&o.lab_paid_date?.slice(0,7)===m; })
                         .reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0);

  // Per-lab unpaid
  const labUnpaid={};
  orders.filter(o=>parseFloat(o.lab_bill_amount||0)>0&&!o.lab_paid).forEach(o=>{
    const lab=o.lens_company||'Unknown';
    labUnpaid[lab]=(labUnpaid[lab]||0)+parseFloat(o.lab_bill_amount||0);
  });

  // Selection
  const selectable  = filtered.filter(o=>parseFloat(o.lab_bill_amount||0)>0&&!o.lab_paid);
  const allSelected = selectable.length>0 && selectable.every(o=>selectedIds.has(o.id));
  const someSelected= selectedIds.size>0;
  const selTotal    = [...selectedIds].reduce((s,id)=>{
    const o=orders.find(x=>x.id===id);
    return s+parseFloat(o?.lab_bill_amount||0);
  },0);
  const toggleSel   = id => setSelectedIds(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll   = () => { if(allSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(selectable.map(o=>o.id))); };

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif", paddingBottom:someSelected?90:0}}>

      {toast && (
        <div style={{position:'fixed',bottom:24,right:24,background:C.navy,color:'white',padding:'12px 20px',borderRadius:12,fontSize:14,fontWeight:600,borderLeft:`4px solid ${C.gold}`,zIndex:500,maxWidth:380}}>
          {toast}
        </div>
      )}

      {payModal && (
        <PayModal
          orders={payModal.orders}
          title={payModal.title}
          skipExpense={payModal.skipExpense}
          onClose={()=>setPayModal(null)}
          onDone={(msg, paidIds) => {
            showToast(msg);
            setPayModal(null);
            // Update paid orders in state — no full reload
            if (paidIds && paidIds.length) {
              const paidDate = today();
              setOrders(prev => prev.map(o =>
                paidIds.includes(o.id)
                  ? { ...o, lab_paid: true, lab_paid_date: paidDate }
                  : o
              ));
            } else {
              load(); // fallback
            }
          }}
        />
      )}

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10,marginBottom:8}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:C.navy,margin:0}}>🔬 Lab Receivings</h1>
          <p style={{fontSize:13,color:C.muted,margin:'3px 0 0'}}>All orders · enter bill amounts inline · pay in batches</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={async ()=>{
            const notSent = orders.filter(o=>(!o.lens_step||o.lens_step<1));
            if(!notSent.length){ showToast('All orders already marked as sent'); return; }
            if(!window.confirm(`Mark ${notSent.length} orders as Sent to Lab?`)) return;
            await Promise.all(notSent.map(o=>apiPatch(`/orders/${o.id}`,{lens_step:1})));
            showToast(`✓ ${notSent.length} orders marked as Sent`);
            load();
          }}
            style={{padding:'9px 18px',background:'#1e40af',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            📤 Mark All as Sent
          </button>
          <button onClick={()=>setQuickMode(q=>!q)}
            style={{padding:'9px 18px',background:quickMode?C.navy:C.cream,color:quickMode?C.gold:C.navy,border:`1.5px solid ${quickMode?C.navy:C.border}`,borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            {quickMode ? '⚡ Quick Mode ON — click to exit' : '⚡ Quick Entry Mode'}
          </button>
        </div>
      </div>

      {quickMode && (
        <div style={{background:'#fef9c3',border:'1px solid #fde68a',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:13,color:'#92400e'}}>
          <b>Quick Entry Mode:</b> All rows are open. Pick lab → type amount → <b>Enter</b> to save → next row. Press <b>Esc</b> to cancel a row. Click anywhere to toggle. When done, switch filter to <b>💸 Unpaid</b> to pay.
        </div>
      )}

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:14}}>
        {[
          {l:'Total orders',      v:orders.length,   sub:'all non-cancelled',  dark:true},
          {l:'No bill entered',   v:noBill,           sub:'need amount',       c:C.danger,  filt:'nobill'},
          {l:'Unpaid to labs',    v:fmt(unpaidAmt),   sub:'total you owe',     c:'#c2410c', filt:'unpaid'},
          {l:'Paid this month',   v:fmt(paidMo),      sub:'expenses recorded', c:C.success, filt:'paid'},
        ].map(s=>(
          <div key={s.l} onClick={()=>s.filt&&setBillFilt(f=>f===s.filt?'all':s.filt)}
            style={{background:s.dark?C.navy:billFilt===s.filt?'#fef2f2':'white',border:`1px solid ${billFilt===s.filt?C.danger:s.dark?C.navy:C.border}`,borderRadius:12,padding:'13px 15px',cursor:s.filt?'pointer':'default'}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.8px',color:s.dark?C.gold:C.muted,marginBottom:4}}>{s.l}</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:s.dark?'white':(s.c||C.navy)}}>{s.v}</div>
            {s.sub&&<div style={{fontSize:11,color:s.dark?'#ede9e0':C.muted,marginTop:2}}>{s.sub}</div>}
            {s.filt&&<div style={{fontSize:10,color:C.gold,marginTop:3}}>↑ click to filter</div>}
          </div>
        ))}
      </div>

      {/* Outstanding + Pay All per lab */}
      {Object.keys(labUnpaid).length>0 && (
        <div style={{background:'#fef2f2',border:`1px solid #fca5a5`,borderRadius:12,padding:'11px 16px',marginBottom:14,display:'flex',gap:16,flexWrap:'wrap',alignItems:'center'}}>
          <span style={{fontSize:13,fontWeight:700,color:C.danger}}>⚠️ Outstanding:</span>
          {Object.entries(labUnpaid).map(([lab,amt])=>(
            <div key={lab} style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:13,color:C.danger}}><b>{lab}:</b> {fmt(amt)}</span>
              <button onClick={()=>setPayModal({ title:`Pay All — ${lab}`, skipExpense:false, orders:orders.filter(o=>o.lens_company===lab&&parseFloat(o.lab_bill_amount||0)>0&&!o.lab_paid) })}
                style={{padding:'4px 10px',background:C.danger,color:'white',border:'none',borderRadius:7,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                Pay All
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Order no, customer, lab..."
          style={{flex:1,minWidth:200,padding:'8px 12px',border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:'inherit',outline:'none',background:'white'}}/>

        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          {[['all','All Labs'],['Negombo Optical','Negombo'],['Solex Optical','Solex']].map(([v,l])=>(
            <button key={v} onClick={()=>setLabFilt(v)}
              style={{padding:'7px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',border:`1.5px solid ${labFilt===v?C.navy:C.border}`,background:labFilt===v?C.navy:'white',color:labFilt===v?'white':C.muted}}>
              {l}
            </button>
          ))}
        </div>

        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          {[
            ['all',   '📋 All'],
            ['nobill','❌ No Bill'],
            ['unpaid','💸 Unpaid'],
            ['paid',  '✅ Paid'],
          ].map(([v,l])=>(
            <button key={v} onClick={()=>setBillFilt(v)}
              style={{padding:'7px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',border:`1.5px solid ${billFilt===v?C.navy:C.border}`,background:billFilt===v?C.navy:'white',color:billFilt===v?'white':C.muted}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Past orders notice */}
      {billFilt==='nobill' && (
        <div style={{background:'#eff6ff',border:'1px solid #bae6fd',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:13,color:'#1e40af'}}>
          <b>Backfilling past orders:</b> For orders you've already paid — enter the bill amount → save → then tick checkbox → <b>"Mark Paid (no expense)"</b> since you've already recorded the expense manually. For future orders, tick → <b>"Pay Selected"</b> which auto-creates the expense.
        </div>
      )}

      {/* Table */}
      <div style={{background:'white',border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>

        {/* Header */}
        <div style={{display:'grid',gridTemplateColumns:'36px 110px 1fr 150px 185px 90px 85px',padding:'9px 14px',background:C.cream,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.7px',color:C.muted,borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
            <input type="checkbox" checked={allSelected}
              ref={el=>{if(el)el.indeterminate=someSelected&&!allSelected;}}
              onChange={toggleAll}
              style={{cursor:'pointer',width:15,height:15}}/>
          </div>
          <span>Order</span>
          <span>Customer / Lens</span>
          <span>Lab</span>
          <span>Bill amount</span>
          <span>Lab paid</span>
          <span>Status</span>
        </div>

        {loading
          ? <div style={{padding:40,textAlign:'center',color:C.muted}}>Loading {orders.length||''}...</div>
          : !filtered.length
            ? <div style={{padding:40,textAlign:'center',color:C.muted}}>
                <div style={{fontSize:36,marginBottom:10}}>🔬</div>
                <div style={{fontSize:14,fontWeight:600,color:C.navy}}>No orders match</div>
              </div>
            : filtered.map((o,i)=>(
                <OrderRow key={o.id} order={o}
                  selected={selectedIds.has(o.id)}
                  onToggle={()=>toggleSel(o.id)}
                  onSaved={(updatedFields) => {
                    // Update just this order in state — no full page reload
                    const orderId = o.id;
                    setOrders(prev => prev.map(row =>
                      row.id === orderId ? { ...row, ...updatedFields } : row
                    ));
                    showToast('✓ Bill saved');
                  }}
                  quickMode={quickMode && !o.lab_paid && !parseFloat(o.lab_bill_amount||0)}
                  rowIndex={i}
                  totalRows={filtered.length}
                />
              ))
        }

        {/* Footer */}
        {filtered.length>0 && (
          <div style={{padding:'11px 16px',background:C.cream,display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:600,borderTop:`1px solid ${C.border}`,flexWrap:'wrap',gap:8}}>
            <span style={{color:C.muted}}>
              {filtered.length} orders · {filtered.filter(o=>!parseFloat(o.lab_bill_amount||0)).length} need bill entry
            </span>
            <div style={{display:'flex',gap:16}}>
              <span style={{color:C.danger}}>Unpaid: {fmt(filtered.filter(o=>parseFloat(o.lab_bill_amount||0)>0&&!o.lab_paid).reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0))}</span>
              <span style={{color:C.success}}>Paid: {fmt(filtered.filter(o=>o.lab_paid).reduce((s,o)=>s+parseFloat(o.lab_bill_amount||0),0))}</span>
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      {someSelected && (
        <div style={{position:'fixed',bottom:0,left:0,right:0,background:C.navy,padding:'13px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100,boxShadow:'0 -4px 24px rgba(0,0,0,.35)',flexWrap:'wrap',gap:10}}>
          <div>
            <span style={{fontSize:14,fontWeight:700,color:'white'}}>
              {selectedIds.size} order{selectedIds.size!==1?'s':''} selected
            </span>
            <span style={{fontSize:15,color:C.gold,marginLeft:14,fontFamily:"'Playfair Display',serif",fontWeight:700}}>
              Rs. {selTotal.toLocaleString()}
            </span>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>setSelectedIds(new Set())}
              style={{padding:'8px 16px',background:'rgba(255,255,255,.15)',color:'white',border:'1px solid rgba(255,255,255,.3)',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              Clear
            </button>
            <button onClick={()=>setPayModal({
                title:`Mark paid (no expense) — ${selectedIds.size} orders`,
                skipExpense:true,
                orders:orders.filter(o=>selectedIds.has(o.id))
              })}
              style={{padding:'8px 16px',background:'rgba(255,255,255,.15)',color:'white',border:'1px solid rgba(255,255,255,.3)',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              Mark Paid (no expense)
            </button>
            <button onClick={()=>setPayModal({
                title:`Pay ${selectedIds.size} order${selectedIds.size!==1?'s':''}`,
                skipExpense:false,
                orders:orders.filter(o=>selectedIds.has(o.id))
              })}
              style={{padding:'8px 20px',background:C.gold,color:C.navy,border:'none',borderRadius:8,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              ✅ Pay Selected — Rs. {selTotal.toLocaleString()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}