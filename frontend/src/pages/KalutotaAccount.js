/* eslint-disable */
import React, { useEffect, useState, useCallback } from 'react';
import { QRScanner } from '../components/QRStickers';

const C = {
  navy:    'var(--navy)',
  gold:    'var(--gold)',
  cream:   'var(--bg-sunken)',
  surface: 'var(--bg-surface)',
  border:  'var(--border)',
  muted:   'var(--text-muted)',
  success: 'var(--success)',
  danger:  'var(--danger)',
  warning: 'var(--warning)',
  info:    'var(--info)',

  in: 'var(--success)',
  out: 'var(--danger)',
};
const fmt     = (n) => 'Rs. '+parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0,maximumFractionDigits:0});
const fmtDate = (d) => {
  if (!d) return '—';
  // Handle both date string 'YYYY-MM-DD' and ISO timestamp
  const dt = String(d).includes('T') ? new Date(d) : new Date(d + 'T00:00:00');
  return isNaN(dt) ? '—' : dt.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'});
};
const today   = () => new Date().toISOString().split('T')[0];
const toB64   = (file) => new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });

const CATS = ['Frames','Sunglasses','Reading Glasses','Boxes','Lens Cleaner','Glass Cleaner','Chains','Lenses','Accessories','Other'];
const INP  = { padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:'var(--font-body)', outline:'none', background:C.cream, color:C.navy, width:'100%', boxSizing:'border-box' };
const SEL  = { ...INP, cursor:'pointer' };
const LBL  = { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:4, display:'block' };

function apiGet(p) {
  const B=process.env.REACT_APP_API_URL||'http://localhost:5000/api', t=localStorage.getItem('ko_token');
  return fetch(`${B}${p}`,{headers:{Authorization:`Bearer ${t}`}}).then(r=>r.json());
}
function apiPost(p,body) {
  const B=process.env.REACT_APP_API_URL||'http://localhost:5000/api', t=localStorage.getItem('ko_token');
  return fetch(`${B}${p}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify(body)}).then(r=>r.json());
}
function apiPatch(p,body) {
  const B=process.env.REACT_APP_API_URL||'http://localhost:5000/api', t=localStorage.getItem('ko_token');
  return fetch(`${B}${p}`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify(body)}).then(r=>r.json());
}
function apiDel(p) {
  const B=process.env.REACT_APP_API_URL||'http://localhost:5000/api', t=localStorage.getItem('ko_token');
  return fetch(`${B}${p}`,{method:'DELETE',headers:{Authorization:`Bearer ${t}`}});
}

// ── Payment modal ─────────────────────────────────────────────
function PayModal({ tx, onClose, onSave }) {
  const [paidAmt,  setPaidAmt]  = useState(parseFloat(tx.total_amount)-(parseFloat(tx.paid_amount)||0));
  const [paidDate, setPaidDate] = useState(today());
  const [method,   setMethod]   = useState('cash');
  const [saving,   setSaving]   = useState(false);
  const outstanding = parseFloat(tx.total_amount)-(parseFloat(tx.paid_amount)||0);
  const isOut = tx.direction==='out';

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(15,31,61,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:C.surface,borderRadius:16,padding:24,width:'100%',maxWidth:420,boxShadow:'0 20px 60px rgba(0,0,0,.25)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <div style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:700,color:C.navy}}>
              {isOut?'💳 Payment from Kalutota':'💳 Payment to Kalutota'}
            </div>
            <div style={{fontSize:12,color:C.muted,marginTop:2}}>{tx.description}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:C.muted}}>✕</button>
        </div>
        <div style={{background:C.cream,borderRadius:10,padding:'12px 14px',marginBottom:14,display:'flex',justifyContent:'space-between'}}>
          <span style={{fontSize:13,color:C.muted}}>Outstanding</span>
          <span style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:700,color:C.danger}}>{fmt(outstanding)}</span>
        </div>
        <div style={{marginBottom:12}}>
          <label style={LBL}>Amount (Rs.)</label>
          <input type="number" value={paidAmt} onChange={e=>setPaidAmt(e.target.value)} style={{...INP,fontSize:18,fontWeight:700}}/>
          <button onClick={()=>setPaidAmt(String(outstanding))} style={{marginTop:6,padding:'5px 12px',background:C.navy,color:'white',border:'none',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Full amount</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          <div><label style={LBL}>Date</label><input type="date" value={paidDate} onChange={e=>setPaidDate(e.target.value)} style={INP}/></div>
          <div><label style={LBL}>Method</label>
            <select value={method} onChange={e=>setMethod(e.target.value)} style={SEL}>
              <option value="cash">💵 Cash</option>
              <option value="bank">🏦 Bank</option>
              <option value="cheque">📋 Cheque</option>
            </select>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={async()=>{
            setSaving(true);
            const newPaid=parseFloat(tx.paid_amount||0)+parseFloat(paidAmt||0);
            await onSave(tx.id,{paid_amount:newPaid,paid_date:paidDate,payment_method:method,payment_status:newPaid>=parseFloat(tx.total_amount)?'paid':'pending'});
            setSaving(false); onClose();
          }} disabled={saving}
            style={{flex:1,padding:'11px',background:saving?C.muted:C.success,color:'white',border:'none',borderRadius:9,fontSize:14,fontWeight:700,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit'}}>
            {saving?'⏳...':'✅ Save Payment'}
          </button>
          <button onClick={onClose} style={{padding:'11px 16px',background:C.cream,border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:C.muted}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function KalutotaAccount() {
  const [txs,      setTxs]     = useState([]);
  const [summary,  setSummary] = useState(null);
  const [loading,  setLoading] = useState(true);
  const [month,    setMonth]   = useState('');
  const [dirFilt,  setDirFilt] = useState('all');
  const [statFilt, setStatFilt]= useState('all');
  const [showAdd,  setShowAdd] = useState(false);
  const [payModal, setPayModal]= useState(null);
  const [saving,   setSaving]  = useState(false);
  const [error,    setError]   = useState('');
  const [toast,    setToast]   = useState('');
  const [imgData,  setImgData] = useState(null);
  const [invResult,   setInvResult]   = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [cart,         setCart]        = useState([]);
  const [itemSearch,   setItemSearch]  = useState('');
  const [itemResults,  setItemResults] = useState([]);
  const [cartLoading,  setCartLoading] = useState(false);

  const [showCashPay,  setShowCashPay]  = useState(false);
  const [cashPayForm,  setCashPayForm]  = useState({
    date: today(), amount:'', method:'cash', reference:'', notes:'', bill_name:'',
  });
  const [savingCash,   setSavingCash]   = useState(false);

  const [form, setForm] = useState({
    date: today(), direction:'out', category:'Frames',
    description:'', quantity:'1', unit_price:'',
    payment_status:'pending', paid_amount:'0',
    paid_date:'', payment_method:'cash', notes:'',
    update_inventory: true,
    inventory_item_name: '',
  });

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''),3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txData,sumData] = await Promise.all([
        apiGet(`/kalutota?limit=300${month?`&month=${month}`:''}${dirFilt!=='all'?`&direction=${dirFilt}`:''}${statFilt!=='all'?`&status=${statFilt}`:''}`),
        apiGet('/kalutota/summary'),
      ]);
      setTxs(Array.isArray(txData)?txData:[]);
      setSummary(sumData);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  },[month,dirFilt,statFilt]);

  useEffect(()=>{ load(); },[load]);

  const handleImgPick = async (e) => {
    const f=e.target.files[0]; if(!f) return;
    setImgData(await toB64(f));
  };

  // Item search for cart
  const searchItems = async (q) => {
    setItemSearch(q);
    if (q.length < 2) { setItemResults([]); return; }
    setCartLoading(true);
    try {
      const BASE_ = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const tok_  = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE_}/inventory?search=${encodeURIComponent(q)}&limit=8&no_images=1`,
        { headers: { Authorization: `Bearer ${tok_}` } });
      const data  = await res.json();
      setItemResults(Array.isArray(data) ? data : (data.data || []));
    } catch { setItemResults([]); }
    finally { setCartLoading(false); }
  };

  const addToCart = (item) => {
    setCart(prev => {
      const ex = prev.find(c => c.inventory_id === item.id);
      if (ex) return prev.map(c => c.inventory_id===item.id ? {...c, qty:c.qty+1} : c);
      return [...prev, { inventory_id:item.id, name:item.name, qty:1, unit_price:parseFloat(item.cost_price||item.buy_price||0), max_qty:item.quantity }];
    });
    setItemSearch(''); setItemResults([]);
  };

  const removeFromCart = (id) => setCart(p => p.filter(c => c.inventory_id !== id));
  const cartTotal = cart.reduce((s, c) => s + c.qty * c.unit_price, 0);

  const handleQRScan = async (scannedId) => {
    setShowScanner(false);
    const id = parseInt(scannedId);
    if (!id) return;
    try {
      const BASE_  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token_ = localStorage.getItem('ko_token');
      const res    = await fetch(`${BASE_}/inventory/${id}`, { headers:{ Authorization:`Bearer ${token_}` }});
      const item   = await res.json();
      if (item?.id) {
        setForm(f=>({
          ...f,
          description:         item.name,
          inventory_item_name: item.name,
          unit_price:          String(item.sell_price||''),
          quantity:            '1',
          update_inventory:    true,
        }));
        setInvResult({ message: `📦 ${item.name} — Stock: ${item.quantity} — Rs.${parseFloat(item.sell_price||0).toLocaleString()}` });
      }
    } catch(e) {}
  };

  const handleAdd = async () => {
    if (!form.description.trim()) return setError('Description required');
    if (!form.unit_price || parseFloat(form.unit_price)<=0) return setError('Unit price required');
    setError(''); setSaving(true); setInvResult(null);
    try {
      const res = await apiPost('/kalutota', {
        ...form,
        quantity:    parseInt(form.quantity),
        unit_price:  parseFloat(form.unit_price),
        paid_amount: parseFloat(form.paid_amount)||0,
        image_url:   imgData||null,
        inventory_item_name: form.inventory_item_name||form.description,
      });
      if (res.error) throw new Error(res.error);

      // Show inventory result feedback
      if (res.inventoryResult) {
        const ir = res.inventoryResult;
        if (ir.action==='updated')
          setInvResult(`✅ Inventory updated: "${ir.item.name}" ${ir.old_qty} → ${ir.new_qty}`);
        else if (ir.action==='created')
          setInvResult(`✅ New inventory item created: "${ir.item.name}" (qty: ${ir.item.quantity})`);
        else if (ir.action==='not_found')
          setInvResult(`⚠️ ${ir.message}`);
      }

      showToast('Transaction recorded ✅');
      setForm(f=>({...f,description:'',quantity:'1',unit_price:'',paid_amount:'0',notes:'',inventory_item_name:''}));
      setImgData(null);
      setShowAdd(false);
      load();
    } catch(e){ setError(e.message); }
    finally { setSaving(false); }
  };

  const s = summary||{};
  const netBalance = parseFloat(s.net_balance||0);
  const totalAmt   = parseFloat(form.unit_price||0)*parseInt(form.quantity||0);

  return (
    <div style={{fontFamily:'var(--font-body)'}}>

      {toast && (
        <div style={{position:'fixed',bottom:24,right:24,background:C.navy,color:'white',padding:'12px 20px',borderRadius:12,fontSize:14,fontWeight:600,borderLeft:`4px solid ${C.gold}`,zIndex:500}}>
          {toast}
        </div>
      )}

      {payModal && (
        <PayModal tx={payModal} onClose={()=>setPayModal(null)}
          onSave={async(id,u)=>{ await apiPatch(`/kalutota/${id}`,u); showToast('Payment recorded ✅'); load(); }}/>
      )}

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4,flexWrap:'wrap',gap:10}}>
        <div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:24,color:C.navy,margin:0}}>🏪 Kalutota Opticals Account</h1>
          <p style={{fontSize:13,color:C.muted,margin:'4px 0 0'}}>Trade account — goods exchanged and payments between shops</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>{ setShowCashPay(s=>!s); setShowAdd(false); }}
            style={{padding:'9px 18px',background:showCashPay?C.cream:'#166534',color:showCashPay?C.muted:'white',border:showCashPay?`1.5px solid ${C.border}`:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            {showCashPay?'✕ Cancel':'💵 Pay Kalutota'}
          </button>
          <button onClick={()=>{setShowAdd(s=>!s);setShowCashPay(false);setError('');setInvResult(null);}}
            style={{padding:'9px 22px',background:showAdd?C.cream:C.gold,color:showAdd?C.muted:C.navy,border:showAdd?`1.5px solid ${C.border}`:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            {showAdd?'✕ Cancel':'+ Add Transaction'}
          </button>
        </div>
      </div>

      {/* Net balance */}
      <div style={{background:netBalance>=0?'#dcfce7':'#fee2e2',border:`2px solid ${netBalance>=0?'#86efac':'#fca5a5'}`,borderRadius:14,padding:'16px 20px',margin:'16px 0',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:netBalance>=0?C.success:C.danger,marginBottom:4}}>
            {netBalance>=0?'💰 Kalutota Opticals owes YOU':'💳 You owe Kalutota Opticals'}
          </div>
          <div style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:700,color:netBalance>=0?C.success:C.danger}}>
            {fmt(Math.abs(netBalance))}
          </div>
          <div style={{fontSize:12,color:netBalance>=0?C.success:C.danger,marginTop:4}}>
            They owe you {fmt(s.they_owe_you)} · You owe them {fmt(s.you_owe_them)}
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:13,color:C.muted}}>Goods out: <b style={{color:C.out}}>{fmt(s.total_out_value)}</b></div>
          <div style={{fontSize:13,color:C.muted,marginTop:3}}>Goods in: <b style={{color:C.in}}>{fmt(s.total_in_value)}</b></div>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:16}}>
        {[
          {l:'They owe you', v:fmt(s.they_owe_you),   c:C.success, sub:`${s.pending_out_count||0} unpaid`},
          {l:'You owe them', v:fmt(s.you_owe_them),   c:C.danger,  sub:`${s.pending_in_count||0} unpaid`},
          {l:'Goods out',    v:fmt(s.total_out_value), c:C.out,     sub:'They took from you'},
          {l:'Goods in',     v:fmt(s.total_in_value),  c:C.in,      sub:'They gave to you'},
        ].map(k=>(
          <div key={k.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:'12px 14px'}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.8px',color:C.muted,marginBottom:4}}>{k.l}</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:19,fontWeight:700,color:k.c}}>{k.v}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Cash Payment Form */}
      {showCashPay && (
        <div style={{background:C.surface,border:`2px solid #166534`,borderRadius:14,padding:20,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:'#166534',marginBottom:14}}>
            💵 Record Cash/Cheque Payment to Kalutota
          </div>
          <div style={{background:'#f0fdf4',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:13,color:'#166534'}}>
            Use this to record cash or cheques you give to Kalutota — whether for a specific bill or general payment.
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div><label style={LBL}>Date</label>
              <input type="date" value={cashPayForm.date} onChange={e=>setCashPayForm(f=>({...f,date:e.target.value}))} style={INP}/>
            </div>
            <div><label style={LBL}>Amount (Rs.) *</label>
              <input type="number" value={cashPayForm.amount} onChange={e=>setCashPayForm(f=>({...f,amount:e.target.value}))}
                placeholder="e.g. 60000" style={{...INP,fontSize:16,fontWeight:700}}/>
            </div>
          </div>

          <div style={{marginBottom:10}}>
            <label style={LBL}>Bill / Purpose *</label>
            <input value={cashPayForm.bill_name} onChange={e=>setCashPayForm(f=>({...f,bill_name:e.target.value}))}
              placeholder="e.g. Aswar invoice Rs.245,670 — 1st installment"
              style={INP}/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div><label style={LBL}>Payment Method</label>
              <select value={cashPayForm.method} onChange={e=>setCashPayForm(f=>({...f,method:e.target.value}))} style={SEL}>
                <option value="cash">💵 Cash</option>
                <option value="cheque">📋 Cheque</option>
                <option value="bank">🏦 Bank Transfer</option>
              </select>
            </div>
            <div><label style={LBL}>Reference / Cheque No.</label>
              <input value={cashPayForm.reference} onChange={e=>setCashPayForm(f=>({...f,reference:e.target.value}))}
                placeholder="Cheque #, bank ref..." style={INP}/>
            </div>
          </div>

          <div style={{marginBottom:14}}>
            <label style={LBL}>Notes (optional)</label>
            <input value={cashPayForm.notes} onChange={e=>setCashPayForm(f=>({...f,notes:e.target.value}))}
              placeholder="Any extra details..." style={INP}/>
          </div>

          <div style={{display:'flex',gap:8}}>
            <button onClick={async()=>{
              if (!cashPayForm.amount || parseFloat(cashPayForm.amount)<=0) return alert('Enter amount');
              if (!cashPayForm.bill_name.trim()) return alert('Enter bill/purpose');
              setSavingCash(true);
              try {
                await apiPost('/kalutota', {
                  date:             cashPayForm.date,
                  direction:        'payment',
                  category:         'Payment',
                  description:      cashPayForm.bill_name,
                  quantity:         1,
                  unit_price:       parseFloat(cashPayForm.amount),
                  payment_status:   'paid',
                  paid_amount:      parseFloat(cashPayForm.amount),
                  paid_date:        cashPayForm.date,
                  payment_method:   cashPayForm.method,
                  notes:            cashPayForm.reference ? `Ref: ${cashPayForm.reference}${cashPayForm.notes?' · '+cashPayForm.notes:''}` : cashPayForm.notes,
                  update_inventory: false,
                });
                showToast('Payment recorded!');
                setCashPayForm({ date:today(), amount:'', method:'cash', reference:'', notes:'', bill_name:'' });
                setShowCashPay(false);
                load();
              } catch(e) { alert('Failed: '+e.message); }
              finally { setSavingCash(false); }
            }} disabled={savingCash}
              style={{padding:'11px 24px',background:savingCash?C.muted:'#166534',color:'white',border:'none',borderRadius:9,fontSize:14,fontWeight:700,cursor:savingCash?'not-allowed':'pointer',fontFamily:'inherit'}}>
              {savingCash?'Saving...':'💾 Save Payment'}
            </button>
            <button onClick={()=>setShowCashPay(false)}
              style={{padding:'11px 16px',background:C.cream,border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:C.muted}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inventory result toast */}
      {invResult && (
        <div style={{background:invResult.startsWith('✅')?'#dcfce7':'#fef9c3',border:`1px solid ${invResult.startsWith('✅')?'#86efac':'#fde68a'}`,borderRadius:10,padding:'11px 16px',marginBottom:14,fontSize:13,color:invResult.startsWith('✅')?C.success:'#854d0e',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>{invResult}</span>
          <button onClick={()=>setInvResult(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:C.muted}}>✕</button>
        </div>
      )}

      {/* ─── Quick Item Search ─── */}
      <div style={{background:'white',border:`1.5px solid ${C.gold}44`,borderRadius:12,padding:16,marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:10}}>🛒 Add Items to Kalutota</div>
        <div style={{display:'flex',gap:8,position:'relative'}}>
          <input value={itemSearch} onChange={e=>searchItems(e.target.value)}
            placeholder="Search frames, sunglasses by name..." style={{...INP,flex:1}}
            onBlur={()=>setTimeout(()=>setItemResults([]),200)}/>
          <button onClick={()=>setShowScanner(true)}
            style={{padding:'10px 14px',background:C.navy,color:'white',border:'none',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
            📷 Scan QR
          </button>
          {itemResults.length>0 && (
            <div style={{position:'absolute',top:'100%',left:0,right:60,background:'white',border:`1px solid ${C.border}`,borderRadius:10,zIndex:100,boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxHeight:220,overflowY:'auto',marginTop:2}}>
              {itemResults.map(item=>(
                <div key={item.id} onMouseDown={()=>addToCart(item)}
                  style={{padding:'10px 14px',cursor:'pointer',fontSize:13,borderBottom:`1px solid #f3f4f6`,display:'flex',justifyContent:'space-between',alignItems:'center'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8faff'}
                  onMouseLeave={e=>e.currentTarget.style.background='white'}>
                  <div>
                    <b style={{color:C.navy}}>{item.name}</b>
                    <span style={{color:C.muted,fontSize:11,marginLeft:8}}>{item.category}</span>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#1d4ed8'}}>Buy: Rs. {parseFloat(item.cost_price||item.buy_price||0).toLocaleString()}</div>
                    <div style={{fontSize:10,color:item.quantity<=3?C.danger:C.muted}}>Stock: {item.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {cart.length>0 && (
          <div style={{marginTop:12}}>
            {cart.map(item=>(
              <div key={item.inventory_id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:C.cream,borderRadius:9,marginBottom:6}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.navy}}>{item.name}</div>
                  <div style={{fontSize:11,color:'#1d4ed8',fontWeight:600}}>Buy price: Rs. {item.unit_price.toLocaleString()} each</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <button onClick={()=>setCart(p=>p.map(c=>c.inventory_id===item.inventory_id&&c.qty>1?{...c,qty:c.qty-1}:c))}
                    style={{width:26,height:26,borderRadius:6,border:`1px solid ${C.border}`,background:'white',cursor:'pointer',fontSize:14,fontWeight:700}}>−</button>
                  <span style={{fontWeight:700,minWidth:20,textAlign:'center'}}>{item.qty}</span>
                  <button onClick={()=>setCart(p=>p.map(c=>c.inventory_id===item.inventory_id?{...c,qty:c.qty+1}:c))}
                    style={{width:26,height:26,borderRadius:6,border:`1px solid ${C.border}`,background:'white',cursor:'pointer',fontSize:14,fontWeight:700}}>+</button>
                </div>
                <span style={{fontWeight:700,color:C.navy,minWidth:70,textAlign:'right'}}>Rs. {(item.qty*item.unit_price).toLocaleString()}</span>
                <button onClick={()=>removeFromCart(item.inventory_id)}
                  style={{background:'none',border:'none',color:C.danger,cursor:'pointer',fontSize:16,fontWeight:700}}>✕</button>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:'#f0f4ff',borderRadius:9,border:`1px solid ${C.border}`}}>
              <span style={{fontSize:13,fontWeight:700,color:C.navy}}>Total: Rs. {cartTotal.toLocaleString()}</span>
              <button onClick={async()=>{
                if(!cart.length)return;
                setSaving(true);
                for(const item of cart){
                  const txRes = await apiPost('/kalutota',{date:today(),direction:'out',category:item.category||'Frames',description:item.name,quantity:item.qty,unit_price:item.unit_price,payment_status:'pending',paid_amount:0,update_inventory:true,inventory_item_name:item.name,inventory_id:item.inventory_id,notes:'Cart transaction'});

                  // Log to history (log-only endpoint — does NOT double-deduct stock)
                  if (item.inventory_id && txRes) {
                    try {
                      const BASE_ = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
                      const tok_  = localStorage.getItem('ko_token');
                      const qty   = item.qty;
                      await fetch(`${BASE_}/stock-adjustments/log`, {
                        method: 'POST',
                        headers: {'Content-Type':'application/json', Authorization:`Bearer ${tok_}`},
                        body: JSON.stringify({
                          inventory_id:    item.inventory_id,
                          item_name:       item.name,
                          change_type:     'remove',
                          quantity_change: -qty,
                          reason:          'Kalutota Opticals',
                          notes:           `Given to Kalutota Opticals — ${qty} unit${qty!==1?'s':''}`,
                          unit_cost:       item.unit_price || 0,
                        }),
                      });
                    } catch(le) { /* non-critical */ }
                  }
                }
                setCart([]);
                showToast(`✅ ${cart.length} item${cart.length!==1?'s':''} sent to Kalutota`);
                load();
                setSaving(false);
              }} disabled={saving}
                style={{padding:'8px 18px',background:saving?C.muted:C.navy,color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit'}}>
                {saving?'⏳ Saving...':'📤 Send to Kalutota'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:14}}>➕ New Transaction</div>

          {error && <div style={{background:'#fef2f2',border:`1px solid #fca5a5`,color:C.danger,borderRadius:8,padding:'9px 13px',fontSize:13,marginBottom:12}}>⚠️ {error}</div>}

          {/* Direction */}
          <div style={{marginBottom:14}}>
            <label style={LBL}>What happened? *</label>
            <div style={{display:'flex',gap:8}}>
              {[
                {v:'out',icon:'📤',title:'They took from us',sub:'Frames, boxes, cleaner etc. they collected'},
                {v:'in', icon:'📥',title:'They gave us',     sub:'Frames or stock they supplied to us'},
              ].map(d=>(
                <button key={d.v} onClick={()=>setForm(f=>({...f,direction:d.v}))}
                  style={{flex:1,padding:'12px 8px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',border:`2px solid ${form.direction===d.v?(d.v==='out'?C.out:C.in):C.border}`,background:form.direction===d.v?(d.v==='out'?'#f5f3ff':'#e0f2fe'):'white',color:form.direction===d.v?(d.v==='out'?C.out:C.in):C.muted,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  <span style={{fontSize:22}}>{d.icon}</span>
                  <span>{d.title}</span>
                  <span style={{fontSize:11,opacity:.7}}>{d.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:10}}>
            <div><label style={LBL}>Date</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={INP}/></div>
            <div><label style={LBL}>Category</label>
              <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={SEL}>
                {CATS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Payment Status</label>
              <select value={form.payment_status} onChange={e=>setForm(f=>({...f,payment_status:e.target.value}))} style={SEL}>
                <option value="pending">⏳ Pending</option>
                <option value="paid">✅ Paid</option>
              </select>
            </div>
          </div>

          <div style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <label style={LBL}>Description *</label>
              <button onClick={()=>setShowScanner(true)}
                style={{padding:'4px 12px',background:C.navy,color:C.gold,border:'none',borderRadius:8,
                  fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                📷 Scan QR
              </button>
            </div>
            <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
              placeholder="e.g. RayBan Black Full rim frames... or tap Scan QR ↑" style={INP}/>
            {invResult?.message && (
              <div style={{fontSize:12,color:'#1e40af',background:'#eff6ff',borderRadius:7,padding:'6px 10px',marginTop:5,fontWeight:600}}>
                {invResult.message}
              </div>
            )}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10,marginBottom:10}}>
            <div><label style={LBL}>Quantity</label><input type="number" min="1" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} style={INP}/></div>
            <div><label style={LBL}>Unit Price (Rs.)</label><input type="number" value={form.unit_price} onChange={e=>setForm(f=>({...f,unit_price:e.target.value}))} placeholder="Price each" style={INP}/></div>
            <div><label style={LBL}>Paid so far (Rs.)</label><input type="number" value={form.paid_amount} onChange={e=>setForm(f=>({...f,paid_amount:e.target.value}))} placeholder="0" style={INP}/></div>
            <div><label style={LBL}>Payment Method</label>
              <select value={form.payment_method} onChange={e=>setForm(f=>({...f,payment_method:e.target.value}))} style={SEL}>
                <option value="cash">💵 Cash</option>
                <option value="bank">🏦 Bank</option>
                <option value="cheque">📋 Cheque</option>
              </select>
            </div>
          </div>

          {/* Inventory toggle */}
          <div style={{background:form.update_inventory?'#eff6ff':'#f9fafb',border:`1.5px solid ${form.update_inventory?'#93c5fd':C.border}`,borderRadius:10,padding:'12px 14px',marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:form.update_inventory?10:0}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.navy}}>📦 Update Inventory</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                  {form.direction==='out'?'Deduct from stock when they take':'Add to stock when they give'}
                </div>
              </div>
              <button onClick={()=>setForm(f=>({...f,update_inventory:!f.update_inventory}))}
                style={{padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',border:`1.5px solid ${form.update_inventory?'#2563eb':C.border}`,background:form.update_inventory?'#2563eb':'white',color:form.update_inventory?'white':C.muted}}>
                {form.update_inventory?'ON ✓':'OFF'}
              </button>
            </div>
            {form.update_inventory && (
              <div>
                <label style={LBL}>Inventory item name (if different from description)</label>
                <input value={form.inventory_item_name} onChange={e=>setForm(f=>({...f,inventory_item_name:e.target.value}))}
                  placeholder={form.description||'Leave blank to use description above'} style={INP}/>
                <div style={{fontSize:11,color:'#2563eb',marginTop:5}}>
                  💡 The system will search inventory for this name and {form.direction==='out'?'deduct':'add'} {form.quantity} unit{form.quantity!=='1'?'s':''}.
                  {form.direction==='in'?' If not found, a new item will be created.':' If not found, no change is made.'}
                </div>
              </div>
            )}
          </div>

          {/* Photo upload */}
          <div style={{marginBottom:14}}>
            <label style={LBL}>Photo of item (optional)</label>
            <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
              <label style={{width:100,height:80,border:`2px dashed ${imgData?C.gold:C.border}`,borderRadius:10,cursor:'pointer',background:imgData?'#fdf9f0':C.cream,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',overflow:'hidden',position:'relative',flexShrink:0}}>
                {imgData
                  ?<img src={imgData} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  :<><span style={{fontSize:24}}>📷</span><span style={{fontSize:10,color:C.muted,marginTop:2}}>Upload</span></>
                }
                <input type="file" accept="image/*" onChange={handleImgPick} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer'}}/>
              </label>
              <div style={{fontSize:12,color:C.muted,flex:1,paddingTop:4}}>
                Take a photo of the frames, boxes or other items. The image is saved with the transaction so you have a visual record of what was exchanged.
                {imgData&&<div style={{marginTop:8}}><button onClick={()=>setImgData(null)} style={{background:'#fee2e2',color:C.danger,border:'none',borderRadius:7,padding:'4px 12px',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Remove photo</button></div>}
              </div>
            </div>
          </div>

          {/* Total preview */}
          {totalAmt>0&&(
            <div style={{background:form.direction==='out'?'#f5f3ff':'#e0f2fe',borderRadius:10,padding:'11px 14px',marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,color:C.muted}}>{form.quantity} × {fmt(form.unit_price||0)}</span>
              <span style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:700,color:form.direction==='out'?C.out:C.in}}>{fmt(totalAmt)}</span>
            </div>
          )}

          <div style={{marginBottom:14}}>
            <label style={LBL}>Notes (optional)</label>
            <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any extra details..." style={INP}/>
          </div>

          <div style={{display:'flex',gap:8}}>
            <button onClick={handleAdd} disabled={saving}
              style={{padding:'11px 24px',background:saving?C.muted:C.navy,color:'white',border:'none',borderRadius:9,fontSize:14,fontWeight:700,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit'}}>
              {saving?'⏳ Saving...':'💾 Save Transaction'}
            </button>
            <button onClick={()=>{setShowAdd(false);setError('');setImgData(null);}}
              style={{padding:'11px 16px',background:C.cream,border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:C.muted}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Print Report Button */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:C.navy}}>Transaction History</div>
        <button onClick={()=>{
          const win = window.open('','_blank','width=900,height=700');
          const rows = txs.map((tx,i)=>{
            const isOut=tx.direction==='out', isPay=tx.direction==='payment';
            return `<tr style="background:${i%2?'#f8f8f8':'white'}">
              <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px">${i+1}</td>
              <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px">${tx.date}</td>
              <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px"><span style="background:${isPay?'#dcfce7':isOut?'#f5f3ff':'#e0f2fe'};color:${isPay?'#166534':isOut?'#7c3aed':'#0891b2'};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700">${isPay?'PAYMENT':isOut?'TAKEN':'GIVEN'}</span></td>
              <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px">${tx.description}${tx.notes?'<br><span style="color:#888;font-size:11px">'+tx.notes+'</span>':''}</td>
              <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px;text-align:center">${tx.quantity||1}</td>
              <td style="padding:8px 10px;border:1px solid #ddd;font-size:13px;font-weight:700;text-align:right;color:${isPay?'#166534':isOut?'#7c3aed':'#0891b2'}">Rs.${parseFloat(tx.total_amount||0).toLocaleString()}</td>
              <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px;text-align:right;color:${tx.payment_status==='paid'?'#166534':'#c0392b'}">${tx.payment_status==='paid'?'Paid':'Rs.'+parseFloat(Math.max(0,parseFloat(tx.total_amount||0)-parseFloat(tx.paid_amount||0))).toLocaleString()+' due'}</td>
            </tr>`;
          }).join('');
          const totalOut = txs.filter(t=>t.direction==='out').reduce((s,t)=>s+parseFloat(t.total_amount||0),0);
          const totalIn  = txs.filter(t=>t.direction==='in').reduce((s,t)=>s+parseFloat(t.total_amount||0),0);
          const totalPay = txs.filter(t=>t.direction==='payment').reduce((s,t)=>s+parseFloat(t.total_amount||0),0);
          const net      = totalOut - totalIn - totalPay;
          win.document.write(`<!DOCTYPE html><html><head>
<title>Kalutota Account Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,sans-serif;padding:20px;}
  @page{size:A4;margin:15mm;}
  @media print{body{padding:0;}}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #0f1f3d">
  <div>
    <div style="font-size:20px;font-weight:700;color:#0f1f3d">Wickramakalutota Opticals</div>
    <div style="font-size:13px;color:#666;margin-top:2px">No.57, Kurunegala Road, Chilaw · Tel: 032 222 1211</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:16px;font-weight:700;color:#0f1f3d">Kalutota Account Report</div>
    <div style="font-size:12px;color:#888">Printed: ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}</div>
    ${month?`<div style="font-size:12px;color:#0f1f3d;font-weight:700">Month: ${month}</div>`:''}
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:20px">
  <div style="background:#f5f3ff;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#7c3aed;font-weight:700;text-transform:uppercase">Goods Taken</div><div style="font-size:20px;font-weight:700;color:#7c3aed">Rs.${totalOut.toLocaleString()}</div></div>
  <div style="background:#e0f2fe;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#0891b2;font-weight:700;text-transform:uppercase">Goods Given</div><div style="font-size:20px;font-weight:700;color:#0891b2">Rs.${totalIn.toLocaleString()}</div></div>
  <div style="background:#dcfce7;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#166534;font-weight:700;text-transform:uppercase">Cash Paid</div><div style="font-size:20px;font-weight:700;color:#166534">Rs.${totalPay.toLocaleString()}</div></div>
  <div style="background:${net>0?'#fef2f2':'#dcfce7'};border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:${net>0?'#c0392b':'#166534'};font-weight:700;text-transform:uppercase">${net>0?'They Owe You':'You Owe Them'}</div><div style="font-size:20px;font-weight:700;color:${net>0?'#c0392b':'#166534'}">Rs.${Math.abs(net).toLocaleString()}</div></div>
</div>
<table style="width:100%;border-collapse:collapse">
  <thead><tr style="background:#0f1f3d;color:white">
    <th style="padding:8px;text-align:left;font-size:11px">#</th>
    <th style="padding:8px;text-align:left;font-size:11px">Date</th>
    <th style="padding:8px;text-align:left;font-size:11px">Type</th>
    <th style="padding:8px;text-align:left;font-size:11px">Description</th>
    <th style="padding:8px;text-align:center;font-size:11px">Qty</th>
    <th style="padding:8px;text-align:right;font-size:11px">Amount</th>
    <th style="padding:8px;text-align:right;font-size:11px">Status</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div style="margin-top:16px;padding:12px;background:#f0f4f8;border-radius:8px;display:flex;justify-content:space-between;font-weight:700;font-size:14px">
  <span>${txs.length} transactions</span>
  <span style="color:${net>0?'#c0392b':'#166534'}">${net>0?'Kalutota owes you':'You owe Kalutota'}: Rs.${Math.abs(net).toLocaleString()}</span>
</div>
<script>window.onload=function(){window.print();};<\/script>
</body></html>`);
          win.document.close();
        }}
          style={{padding:'9px 18px',background:'#0f1f3d',color:'#c9a84c',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          🖨️ Print Report
        </button>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
          style={{padding:'7px 12px',border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:'inherit',outline:'none',background:C.cream,color:C.navy}}/>
        {month&&<button onClick={()=>setMonth('')} style={{padding:'7px 12px',background:C.cream,border:`1px solid ${C.border}`,borderRadius:9,fontSize:12,cursor:'pointer',fontFamily:'inherit',color:C.muted}}>All time ✕</button>}
        {[['all','All'],['out','📤 Taken'],['in','📥 Given']].map(([v,l])=>(
          <button key={v} onClick={()=>setDirFilt(v)}
            style={{padding:'7px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',border:`1.5px solid ${dirFilt===v?C.navy:C.border}`,background:dirFilt===v?C.navy:'white',color:dirFilt===v?'white':C.muted}}>
            {l}
          </button>
        ))}
        {[['all','All'],['pending','⏳ Pending'],['paid','✅ Paid']].map(([v,l])=>(
          <button key={v} onClick={()=>setStatFilt(v)}
            style={{padding:'7px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',border:`1.5px solid ${statFilt===v?C.navy:C.border}`,background:statFilt===v?C.navy:'white',color:statFilt===v?'white':C.muted}}>
            {l}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'90px 36px 1fr 70px 110px 100px 90px 70px',padding:'10px 16px',background:C.cream,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.7px',color:C.muted,borderBottom:`1px solid ${C.border}`}}>
          <span>Date</span><span></span><span>Description</span><span>Qty</span><span>Amount</span><span>Paid</span><span>Status</span><span>Action</span>
        </div>

        {loading
          ?<div style={{padding:32,textAlign:'center',color:C.muted}}>Loading...</div>
          :!txs.length
            ?<div style={{padding:48,textAlign:'center',color:C.muted}}>
              <div style={{fontSize:40,marginBottom:12}}>🏪</div>
              <div style={{fontSize:14,fontWeight:600,color:C.navy,marginBottom:6}}>No transactions yet</div>
              <div style={{fontSize:13}}>Click "+ Add Transaction" to record the first exchange</div>
            </div>
            :txs.map(tx=>{
              const isOut=tx.direction==='out';
              const isPay=tx.direction==='payment';
              const outstanding=parseFloat(tx.total_amount)-parseFloat(tx.paid_amount||0);
              const isPaid=tx.payment_status==='paid';
              return (
                <div key={tx.id} style={{display:'grid',gridTemplateColumns:'90px 36px 1fr 70px 110px 100px 90px 70px',padding:'11px 16px',borderBottom:`1px solid ${C.cream}`,alignItems:'center'}}>
                  <div style={{fontSize:12,color:C.muted}}>{fmtDate(tx.date)}</div>
                  <div>
                    {tx.image_url
                      ?<img src={tx.image_url} alt="" style={{width:28,height:28,objectFit:'cover',borderRadius:5,border:`1px solid ${C.border}`}}/>
                      :<span style={{fontSize:18}}>{isOut?'📤':'📥'}</span>
                    }
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.navy}}>{tx.description}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                      <span style={{background:isPay?'#dcfce7':isOut?'#f5f3ff':'#e0f2fe',color:isPay?'#166534':isOut?C.out:C.in,padding:'1px 7px',borderRadius:20,fontSize:10,fontWeight:600,marginRight:6}}>
                        {isPay?'Payment':isOut?'Taken':'Given'}
                      </span>
                      {tx.category}{tx.notes&&` · ${tx.notes}`}
                    </div>
                  </div>
                  <div style={{fontSize:13,color:C.muted}}>{tx.quantity}</div>
                  <div style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:700,color:isPay?'#166534':isOut?C.out:C.in}}>{fmt(tx.total_amount)}</div>
                  <div style={{fontSize:12}}>
                    {parseFloat(tx.paid_amount||0)>0&&<div style={{color:C.success,fontWeight:600}}>+{fmt(tx.paid_amount)}</div>}
                    {outstanding>0&&!isPaid&&<div style={{color:C.danger,fontSize:11}}>{fmt(outstanding)} due</div>}
                  </div>
                  <div>
                    {isPaid
                      ?<span style={{background:'#dcfce7',color:C.success,fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20}}>✅ Paid</span>
                      :<span style={{background:'#fee2e2',color:C.danger,fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20}}>⏳ Pending</span>
                    }
                  </div>
                  <div style={{display:'flex',gap:4}}>
                    {!isPaid&&(
                      <button onClick={()=>setPayModal(tx)}
                        style={{padding:'5px 9px',background:'#dcfce7',color:C.success,border:`1px solid #86efac`,borderRadius:7,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                        💳
                      </button>
                    )}
                    <button onClick={async()=>{ if(!window.confirm('Delete?')) return; await apiDel(`/kalutota/${tx.id}`); showToast('Deleted'); load(); }}
                      style={{padding:'5px 8px',background:'none',border:'none',color:'#d1d5db',cursor:'pointer',fontSize:14}}>
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
        }

        {txs.length>0&&(
          <div style={{padding:'11px 16px',background:C.cream,borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700}}>
            <span style={{color:C.muted}}>{txs.length} transactions</span>
            <div style={{display:'flex',gap:16}}>
              <span style={{color:C.out}}>Out: {fmt(txs.filter(t=>t.direction==='out').reduce((s,t)=>s+parseFloat(t.total_amount||0),0))}</span>
              <span style={{color:C.in}}>In: {fmt(txs.filter(t=>t.direction==='in').reduce((s,t)=>s+parseFloat(t.total_amount||0),0))}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}