/* eslint-disable */
import { buildRepairBill, openPrint as openRepairPrint } from '../components/PrintReceipt';
/* cache-bust-v3 */
// ============================================================
//  Repairs.js — Frame repair management
//  Arm repair, polishing, nose pads, nails, etc.
//  Records repair, prints receipt, tracks history
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
};
const fmt     = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0,maximumFractionDigits:0});
const fmtFull = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2});
const fmtDate = (d) => { if(!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); };
const fmtTime = (d) => { if(!d) return '—'; return new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); };
const thisMonth = () => new Date().toISOString().slice(0,7);

const INP = { padding:'10px 13px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%', boxSizing:'border-box' };

// ── Common repair types with typical charges ──────────────────
const REPAIR_TYPES = [
  { label:'Arm Repair',           icon:'🔧', price:200 },
  { label:'Nose Pad Replacement', icon:'👃', price:100 },
  { label:'Frame Polishing',      icon:'✨', price:300 },
  { label:'Screw / Nail Fix',     icon:'🔩', price:100 },
  { label:'Lens Refit',           icon:'🔬', price:150 },
  { label:'Hinge Repair',         icon:'⚙️',  price:250 },
  { label:'Frame Straightening',  icon:'📐', price:200 },
  { label:'Temple Tip Repair',    icon:'🔧', price:150 },
  { label:'Bridge Repair',        icon:'🌉', price:300 },
  { label:'Lens Cleaning',        icon:'🧴', price:100 },
  { label:'Other Repair',         icon:'🛠️', price:0   },
];

// ── Print receipt for repair ──────────────────────────────────
export default function Repairs() {
  const [repairs,   setRepairs]  = useState([]);
  const [summary,   setSummary]  = useState(null);
  const [loading,   setLoading]  = useState(true);
  const [month,     setMonth]    = useState(thisMonth());
  const [statusFilt,setStatusFilt]=useState('all');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [dateFilter,setDateFilter]= useState('all');
  const [payRepair,  setPayRepair]  = useState(null);  // repair being paid
  const [payAmt,     setPayAmt]     = useState('');
  const [payMethod,  setPayMethod]  = useState('cash');
  const [payDate,    setPayDate]    = useState(new Date().toISOString().split('T')[0]);
  const [payErr,     setPayErr]     = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const handleRecordPayment = async () => {
    const amt = parseFloat(payAmt);
    const balance = parseFloat(payRepair.balance_amount ?? (parseFloat(payRepair.charge||0) - parseFloat(payRepair.amount_paid||payRepair.advance||0)));
    if (!amt || amt <= 0) return setPayErr('Enter a valid amount');
    if (amt > balance + 0.01) return setPayErr(`Cannot exceed balance due (${fmtFull(balance)})`);
    setPayLoading(true); setPayErr('');
    try {
      const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('ko_token');
      const res   = await fetch(`${BASE}/repairs/${payRepair.id}/payment`, {
        method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({ amount:amt, method:payMethod, pay_date:payDate }),
      });
      if (!res.ok) { const d=await res.json(); throw new Error(d.error||'Failed'); }
      setPayRepair(null); setPayAmt(''); setPayErr('');
      load();
    } catch(e) { setPayErr(e.message); }
    finally { setPayLoading(false); }
  };
  const [showAdd,   setShowAdd]  = useState(false);
  const [pastMode,  setPastMode]  = useState(false);
  const [repairDate,setRepairDate]= useState('');
  const [saving,    setSaving]   = useState(false);
  const [error,     setError]    = useState('');
  const [toast,     setToast]    = useState('');
  const [lastDone,     setLastDone]     = useState(null); // just-saved repair for print prompt


  const [form, setForm] = useState({
    repair_type:         '',
    customer_name:       '',
    phone:               '',
    frame_description:   '',
    frame_inventory_id:  null,
    description:         '',
    charge:              '',
    repair_cost:         '',
    advance:             '',
    payment_method:      'cash',
    status:              'pending',
    due_date:            new Date(Date.now()+3*86400000).toISOString().split('T')[0],
    notes:               '',
  });

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rep, sum] = await Promise.all([
        apiGet(`/repairs?month=${month}${statusFilt!=='all'?`&status=${statusFilt}`:''}`),
        apiGet('/repairs/summary'),
      ]);
      setRepairs(Array.isArray(rep)?rep:[]);
      setSummary(sum);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  },[month, statusFilt]);

  useEffect(()=>{ load(); },[load]);

  const handleSelectType = (rt) => {
    setForm(f=>({ ...f, repair_type:rt.label, charge:String(rt.price) }));
  };

  const handleAdd = async () => {
    if (!form.repair_type) return setError('Please select a repair type');
    setError(''); setSaving(true);
    try {
      const res = await apiPost('/repairs', {
        ...form,
        charge:       parseFloat(form.charge)||0,
        repair_cost:  parseFloat(form.repair_cost)||0,
        advance: parseFloat(form.advance)||0,
        import_date: pastMode && repairDate ? repairDate : null,
      });
      if (res.error) throw new Error(res.error);
      setLastDone(res);
      setForm({ repair_type:'', customer_name:'', phone:'', frame_description:'', frame_inventory_id:null, description:'', charge:'', repair_cost:'', advance:'', payment_method:'cash', status:'pending', due_date: new Date(Date.now()+3*86400000).toISOString().split('T')[0], notes:'' });

      setShowAdd(false);
      showToast(`Repair recorded — ${res.repair_number}`);
      load();
    } catch(e) { setError(e.message||'Failed'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const result = await apiPatch(`/repairs/${id}`, { status: newStatus });
      if (result?.error) {
        showToast('Failed: ' + result.error);
        return;
      }
      // Optimistic update — update the list immediately without full reload
      setRepairs(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      const labels = { done:'✅ Marked as Done', collected:'📦 Marked as Collected', pending:'⏳ Set to Pending', cancelled:'❌ Cancelled' };
      showToast(labels[newStatus] || `Status: ${newStatus}`);
    } catch(e) {
      showToast('Failed to update status');
      load(); // reload on error
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this repair record?')) return;
    await apiDel(`/repairs/${id}`);
    showToast('Deleted'); load();
  };

  const STATUS_STYLE = {
    done:      { bg:'#dcfce7', color:C.success,  label:'✅ Done'      },
    pending:   { bg:'#fef9c3', color:'#854d0e',  label:'⏳ Pending'   },
    collected: { bg:'#dbeafe', color:'#1e40af',  label:'📦 Collected' },
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:C.navy, color:'white', padding:'12px 20px', borderRadius:12, fontSize:14, fontWeight:600, borderLeft:`4px solid ${C.gold}`, zIndex:500 }}>
          {toast}
        </div>
      )}

      {/* Print prompt after saving */}
      {/* ── Payment Modal ── */}
      {payRepair && (() => {
        const charge  = parseFloat(payRepair.charge||0);
        const paid    = parseFloat(payRepair.amount_paid||payRepair.advance||0);
        const balance = parseFloat(payRepair.balance_amount ?? Math.max(0, charge - paid));
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.55)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
            onClick={e=>{ if(e.target===e.currentTarget){ setPayRepair(null); setPayErr(''); } }}>
            <div style={{ background:'white', borderRadius:16, padding:28, width:'100%', maxWidth:380, boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:C.navy }}>Record Payment</div>
                  <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{payRepair.repair_number} · {payRepair.customer_name}</div>
                </div>
                <button onClick={()=>{ setPayRepair(null); setPayErr(''); }}
                  style={{ background:C.cream, border:'none', borderRadius:8, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>✕</button>
              </div>
              <div style={{ background:balance>0?'#fee2e2':'#dcfce7', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, color:C.muted }}>Balance due</span>
                <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:balance>0?C.danger:C.success }}>{fmtFull(balance)}</span>
              </div>
              {balance <= 0 ? (
                <div style={{ textAlign:'center', color:C.success, fontSize:14, fontWeight:600, padding:'10px 0' }}>Fully paid</div>
              ) : (
                <>
                  {payErr && <div style={{ background:'#fef2f2', color:C.danger, borderRadius:8, padding:'8px 12px', fontSize:13, marginBottom:12 }}>{payErr}</div>}
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Amount (Rs.)</label>
                    <input type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)}
                      placeholder={`Max: Rs. ${balance.toLocaleString()}`}
                      style={{ width:'100%', padding:'10px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:15, fontFamily:'inherit', outline:'none', background:C.cream }}/>
                    <button onClick={()=>setPayAmt(String(balance))} style={{ marginTop:6, padding:'5px 12px', background:C.navy, color:'white', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Full balance</button>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Payment Date</label>
                    <input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)}
                      style={{ width:'100%', padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:'inherit', outline:'none', background:C.cream }}/>
                  </div>
                  <div style={{ marginBottom:16 }}>
                    <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:C.muted, display:'block', marginBottom:4 }}>Method</label>
                    <div style={{ display:'flex', gap:8 }}>
                      {[['cash','Cash'],['bank','Bank'],['card','Card']].map(([v,l])=>(
                        <button key={v} onClick={()=>setPayMethod(v)}
                          style={{ flex:1, padding:'9px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${payMethod===v?C.navy:C.border}`, background:payMethod===v?C.navy:'white', color:payMethod===v?'white':C.muted }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleRecordPayment} disabled={payLoading}
                    style={{ width:'100%', padding:'13px', background:payLoading?C.muted:C.success, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:payLoading?'not-allowed':'pointer', fontFamily:'inherit' }}>
                    {payLoading ? 'Saving...' : `Record ${payAmt ? 'Rs. '+parseFloat(payAmt||0).toLocaleString() : 'Payment'}`}
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {lastDone && (
        <div style={{ background:'#dcfce7', border:`1.5px solid #86efac`, borderRadius:12, padding:'14px 18px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontSize:14, color:C.success, fontWeight:600 }}>
              <b>{lastDone.repair_number}</b> recorded — {lastDone.customer_name||'walk-in'}
            </div>
            {lastDone.payment_method && lastDone.payment_method !== 'cash' && (
              <div style={{ fontSize:12, color:'#1e40af', marginTop:4, display:'flex', alignItems:'center', gap:5 }}>
                🏦 Bank receipt auto-recorded · Rs.{parseFloat(lastDone.charge||0).toLocaleString()}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>{ printRepairJobCard(lastDone); setLastDone(null); }}
                style={{ padding:'9px 18px', background:'#eff6ff', color:'#1e40af', border:`1px solid #93c5fd`, borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                🗂️ Print Job Card
              </button>
              <button onClick={()=>{ openRepairPrint(buildRepairBill(lastDone)); setLastDone(null); }}
              style={{ padding:'8px 18px', background:C.gold, color:C.navy, border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              🖨️ Print Receipt
            </button>
            <button onClick={()=>setLastDone(null)}
              style={{ padding:'8px 14px', background:'white', border:`1.5px solid #86efac`, borderRadius:8, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>🔧 Repairs</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Arm repair, nose pads, polishing, screws and other frame repairs</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>{ setPastMode(false); setRepairDate(''); setShowAdd(s=>!s); setError(''); }}
            style={{ padding:'9px 22px', background:showAdd&&!pastMode?C.cream:C.gold, color:showAdd&&!pastMode?C.muted:C.navy, border:showAdd&&!pastMode?`1.5px solid ${C.border}`:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            {showAdd && !pastMode ? '✕ Cancel' : '🔧 New Repair'}
          </button>
          <button onClick={()=>{ setPastMode(true); setShowAdd(true); setError(''); if(!repairDate) setRepairDate(new Date().toISOString().split('T')[0]); }}
            style={{ padding:'9px 18px', background:showAdd&&pastMode?'#fffbeb':'white', color:'#b45309', border:`1.5px solid ${showAdd&&pastMode?'#f59e0b':'#fed7aa'}`, borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            📅 {showAdd && pastMode ? '✕ Cancel Past' : 'Add Past Repair'}
          </button>
        </div>
      </div>

      {/* Past mode date picker — shown prominently at top of form */}
      {showAdd && pastMode && (
        <div style={{ background:'#fffbeb', border:'2px solid #f59e0b', borderRadius:10, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#92400e' }}>📅 Date this repair was done:</span>
          <input type="date" value={repairDate} onChange={e=>setRepairDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            style={{ padding:'8px 14px', border:'2px solid #f59e0b', borderRadius:8, fontSize:15, fontWeight:700, fontFamily:'inherit', outline:'none', background:'white', color:'#92400e' }}/>
          {repairDate && (
            <span style={{ fontSize:13, color:'#92400e', background:'#fef3c7', padding:'4px 12px', borderRadius:20, fontWeight:600 }}>
              {new Date(repairDate+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            </span>
          )}
          {!repairDate && <span style={{ fontSize:12, color:'#b45309' }}>⬆️ Pick the date above</span>}
        </div>
      )}

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, margin:'16px 0' }}>
        {[
          { l:'Today',         v:fmt(summary?.today_revenue||0),       sub:`${summary?.today_count||0} repairs`,      dark:true },
          { l:'This Month',    v:fmt(summary?.this_month_revenue||0),  sub:`${summary?.this_month_count||0} repairs`,  c:'#2563eb' },
          { l:'Pending',       v:summary?.pending_count||0,            sub:'awaiting collection',                      c:C.danger },
          { l:'Total Revenue', v:fmt(summary?.total_revenue||0),       sub:`${summary?.total||0} all time`,           c:C.success },
        ].map(s=>(
          <div key={s.l} style={{ background:s.dark?C.navy:'white', border:`1px solid ${s.dark?C.navy:C.border}`, borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:s.dark?C.gold:C.muted, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:s.dark?'white':(s.c||C.navy) }}>{s.v}</div>
            {s.sub && <div style={{ fontSize:11, color:s.dark?'#ede9e0':C.muted, marginTop:2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Add repair form */}
      {showAdd && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:22, marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:700, color:C.navy, marginBottom:16 }}>🔧 New Repair</div>

          {error && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:9, padding:'10px 14px', fontSize:13, marginBottom:14 }}>⚠️ {error}</div>}

          {/* Repair type quick-pick */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:8 }}>Repair Type *</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {REPAIR_TYPES.map(rt=>(
                <button key={rt.label} onClick={()=>handleSelectType(rt)}
                  style={{ padding:'9px 14px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${form.repair_type===rt.label?C.navy:C.border}`, background:form.repair_type===rt.label?C.navy:'white', color:form.repair_type===rt.label?'white':C.muted, display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:16 }}>{rt.icon}</span>
                  <span>{rt.label}</span>
                  {rt.price > 0 && <span style={{ fontSize:11, opacity:.7 }}>Rs.{rt.price}</span>}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Customer Name (optional)</label>
              <input value={form.customer_name} onChange={e=>setForm(f=>({...f,customer_name:e.target.value}))} placeholder="Walk-in customer" style={INP}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Phone (optional)</label>
              <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="07X XXX XXXX" type="tel" style={INP}/>
            </div>
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Description (optional)</label>
            <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
              placeholder="e.g. Left arm loose, needs tightening — RayBan frame" style={INP}/>
          </div>



          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', gap:12, marginBottom:14 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Charge (Rs.) *</label>
              <input type="number" value={form.charge} onChange={e=>setForm(f=>({...f,charge:e.target.value}))}
                placeholder="0 for free" style={{ ...INP, fontSize:18, fontWeight:700 }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Repair Cost (Rs.)</label>
              <input type="number" value={form.repair_cost} onChange={e=>setForm(f=>({...f,repair_cost:e.target.value}))}
                placeholder="Your cost" style={{ ...INP, fontSize:18, fontWeight:700 }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Payment</label>
              <select value={form.payment_method} onChange={e=>setForm(f=>({...f,payment_method:e.target.value}))} style={{ ...INP, cursor:'pointer' }}>
                <option value="cash">💵 Cash</option>
                <option value="bank">🏦 Bank</option>
                <option value="free">🎁 Free</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Status</label>
              <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={{ ...INP, cursor:'pointer' }}>
                <option value="done">✅ Done now</option>
                <option value="pending">⏳ Pending (leaving frame)</option>
                <option value="collected">📦 Already collected</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.9px', color:C.muted, display:'block', marginBottom:5 }}>Notes</label>
              <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional" style={INP}/>
            </div>
          </div>

          {/* Quick total display */}
          {parseFloat(form.charge) > 0 && (
            <div style={{ background:C.navy, borderRadius:10, padding:'12px 16px', marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: parseFloat(form.repair_cost) > 0 ? 8 : 0 }}>
                <span style={{ fontSize:13, color:'#ede9e0' }}>{form.repair_type || 'Repair'} · {form.payment_method === 'bank' ? '🏦 Bank' : '💵 Cash'}</span>
                <span style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.gold }}>{fmtFull(form.charge)}</span>
              </div>
              {parseFloat(form.repair_cost) > 0 && (
                <div style={{ display:'flex', gap:16, flexWrap:'wrap', borderTop:'1px solid rgba(255,255,255,.15)', paddingTop:8 }}>
                  <div>
                    <div style={{ fontSize:10, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.8px' }}>Charge</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#86efac' }}>{fmtFull(form.charge)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.8px' }}>Cost</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#fca5a5' }}>- {fmtFull(form.repair_cost)}</div>
                  </div>
                  <div style={{ marginLeft:'auto' }}>
                    <div style={{ fontSize:10, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.8px' }}>Profit</div>
                    <div style={{ fontSize:16, fontWeight:700, color: parseFloat(form.charge)-parseFloat(form.repair_cost) >= 0 ? '#86efac' : '#fca5a5' }}>
                      {fmtFull(parseFloat(form.charge) - parseFloat(form.repair_cost))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleAdd} disabled={saving}
              style={{ padding:'11px 24px', background:saving?C.muted:C.success, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {saving ? '⏳ Saving...' : '✅ Save Repair'}
            </button>
            <button onClick={()=>{ setShowAdd(false); setError(''); }}
              style={{ padding:'11px 16px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
          style={{ padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy }}/>
        {/* Custom date range */}
        <button onClick={()=>setDateFilter(dateFilter==='custom'?'all':'custom')}
          style={{ padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
            border:`1.5px solid ${dateFilter==='custom'?C.gold:C.border}`,
            background:dateFilter==='custom'?'#fef9f0':'white', color:dateFilter==='custom'?'#92400e':C.muted }}>
          📅 Date Range
        </button>
        {dateFilter==='custom' && (
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
              style={{ padding:'6px 10px', border:`1.5px solid ${C.gold}`, borderRadius:8, fontSize:12, fontFamily:'inherit', outline:'none', background:'#fef9f0', color:C.navy }}/>
            <span style={{ fontSize:11, color:C.muted }}>to</span>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
              style={{ padding:'6px 10px', border:`1.5px solid ${C.gold}`, borderRadius:8, fontSize:12, fontFamily:'inherit', outline:'none', background:'#fef9f0', color:C.navy }}/>
            {(dateFrom||dateTo) && <button onClick={()=>{setDateFrom('');setDateTo('');}}
              style={{ padding:'4px 8px', background:'#fee2e2', border:'none', borderRadius:8, fontSize:11, cursor:'pointer', fontFamily:'inherit', color:C.danger }}>✕</button>}
          </div>
        )}
        <div style={{ display:'flex', gap:6 }}>
          {[['all','All'],['done','✅ Done'],['pending','⏳ Pending'],['collected','📦 Collected']].map(([v,l])=>(
            <button key={v} onClick={()=>setStatusFilt(v)}
              style={{ padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${statusFilt===v?C.navy:C.border}`, background:statusFilt===v?C.navy:'white', color:statusFilt===v?'white':C.muted }}>
              {l}
            </button>
          ))}
        </div>
        <span style={{ marginLeft:'auto', fontSize:13, color:C.muted }}>
          {repairs.length} records · {fmt(repairs.reduce((s,r)=>s+parseFloat(r.charge||0),0))}
        </span>
      </div>

      {/* Repair list */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
        {loading
          ? <div style={{ padding:32, textAlign:'center', color:C.muted }}>Loading...</div>
          : !repairs.length
            ? <div style={{ padding:48, textAlign:'center', color:C.muted }}>
                <div style={{ fontSize:44, marginBottom:12 }}>🔧</div>
                <div style={{ fontSize:15, fontWeight:600, color:C.navy, marginBottom:6 }}>No repairs recorded</div>
                <div style={{ fontSize:13 }}>Click "🔧 New Repair" to record your first repair</div>
              </div>
            : repairs.filter(repair => {
                if (dateFilter==='custom') {
                  const d = new Date(repair.created_at);
                  if (dateFrom && d < new Date(dateFrom)) return false;
                  if (dateTo   && d > new Date(dateTo+'T23:59:59')) return false;
                }
                return true;
              }).map((repair, idx) => {
                const st   = STATUS_STYLE[repair.status] || STATUS_STYLE.done;
                const rt   = REPAIR_TYPES.find(r=>r.label===repair.repair_type);
                const prev = repairs[idx-1];
                const showDateHead = !prev || new Date(prev.created_at).toDateString() !== new Date(repair.created_at).toDateString();
                return (
                  <React.Fragment key={repair.id}>
                    {showDateHead && (
                      <div style={{ padding:'7px 18px', background:C.cream, fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'1px', borderBottom:`1px solid ${C.border}` }}>
                        {new Date(repair.created_at).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:14, padding:'14px 18px', borderBottom:`1px solid ${C.cream}`, alignItems:'flex-start' }}>

                      {/* Icon */}
                      <div style={{ width:44, height:44, borderRadius:10, background:'#f0f9ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                        {rt?.icon || '🔧'}
                      </div>

                      {/* Details */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4, flexWrap:'wrap', gap:6 }}>
                          <div>
                            <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{repair.repair_type}</div>
                            {repair.customer_name && (
                              <div style={{ fontSize:12, color:C.muted }}>👤 {repair.customer_name}{repair.phone?` · 📞 ${repair.phone}`:''}</div>
                            )}
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:C.navy }}>
                              {parseFloat(repair.charge)===0 ? <span style={{ color:C.muted, fontSize:13 }}>Free</span> : fmtFull(repair.charge)}
                            </div>
                            <div style={{ fontSize:10, color:C.muted }}>{repair.payment_method==='bank'?'🏦 Bank':repair.payment_method==='free'?'🎁':'💵 Cash'}</div>
                            {parseFloat(repair.repair_cost) > 0 && (
                              <div style={{ fontSize:10, marginTop:2 }}>
                                <span style={{ color:C.muted }}>Cost: {fmtFull(repair.repair_cost)}</span>
                                <span style={{ marginLeft:4, fontWeight:700,
                                  color: parseFloat(repair.charge)-parseFloat(repair.repair_cost) >= 0 ? C.success : C.danger }}>
                                  · Profit: {fmtFull(parseFloat(repair.charge)-parseFloat(repair.repair_cost))}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {repair.description && (
                          <div style={{ fontSize:12, color:C.muted, marginBottom:6, fontStyle:'italic' }}>{repair.description}</div>
                        )}

                        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                          <span style={{ background:st.bg, color:st.color, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>{st.label}</span>
                          <span style={{ fontSize:11, color:C.muted }}>{repair.repair_number}</span>
                          <span style={{ fontSize:11, color:C.muted }}>{fmtTime(repair.created_at)}</span>

                          {/* Status actions */}
                          {repair.status==='pending' && (
                            <button onClick={()=>handleStatusChange(repair.id,'done')}
                              style={{ padding:'4px 11px', background:'#dcfce7', color:C.success, border:`1px solid #86efac`, borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                              Mark Done
                            </button>
                          )}
                          {repair.status==='done' && (
                            <button onClick={()=>handleStatusChange(repair.id,'collected')}
                              style={{ padding:'4px 11px', background:'#dbeafe', color:'#1e40af', border:`1px solid #93c5fd`, borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                              Mark Collected
                            </button>
                          )}

                          {/* Print */}
                          <button onClick={()=>printRepairJobCard(repair)}
                            style={{ padding:'5px 10px', background:'#eff6ff', color:'#1e40af', border:`1px solid #93c5fd`, borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                            🗂️ Job Card
                          </button>
                          <button onClick={()=>openRepairPrint(buildRepairBill(repair))}
                            style={{ padding:'4px 11px', background:C.gold+'30', color:'#92400e', border:`1px solid ${C.gold}`, borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                            🖨️ Print
                          </button>
                          {/* Record payment — show if balance > 0 */}
                          {(() => {
                            const bal = parseFloat(repair.balance_amount ?? Math.max(0, parseFloat(repair.charge||0) - parseFloat(repair.amount_paid||repair.advance||0)));
                            return bal > 0 ? (
                              <button onClick={()=>{ setPayRepair(repair); setPayAmt(''); setPayErr(''); setPayDate(new Date().toISOString().split('T')[0]); }}
                                style={{ padding:'4px 11px', background:'#dcfce7', color:C.success, border:`1px solid #86efac`, borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                                Bal: {fmtFull(bal)}
                              </button>
                            ) : <span style={{ fontSize:10, color:C.success, fontWeight:700 }}>Paid</span>;
                          })()}

                          {/* Delete */}
                          <button onClick={()=>handleDelete(repair.id)}
                            style={{ background:'none', border:'none', color:'#d1d5db', cursor:'pointer', fontSize:14, padding:0, fontFamily:'inherit', marginLeft:'auto' }}>
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
        }

        {/* Month total */}
        {repairs.length > 0 && (
          <div style={{ padding:'12px 18px', background:C.cream, display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, borderTop:`1px solid ${C.border}` }}>
            <span style={{ color:C.muted }}>Month Total</span>
            <span style={{ color:C.navy }}>{fmt(repairs.reduce((s,r)=>s+parseFloat(r.charge||0),0))}</span>
          </div>
        )}
      </div>
    </div>
  );
}