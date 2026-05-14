/* eslint-disable */
// ============================================================
//  KalutotaAccount.js
//  Trade account with Kalutota Opticals
//  Track goods going out (they take) and coming in (they give)
//  Running balance — who owes what
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b',
  out: '#7c3aed',   // purple for goods going out
  in:  '#0891b2',   // blue for goods coming in
};
const fmt     = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0,maximumFractionDigits:0});
const fmtDate = (d) => { if(!d) return '—'; return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); };
const today   = () => new Date().toISOString().split('T')[0];
const thisMonth = () => new Date().toISOString().slice(0,7);

const CATS = ['Frames','Sunglasses','Reading Glasses','Boxes','Lens Cleaner','Glass Cleaner','Chains','Lenses','Accessories','Other'];
const INP  = { padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, color:C.navy, width:'100%', boxSizing:'border-box' };
const SEL  = { ...INP, cursor:'pointer' };
const LBL  = { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:4, display:'block' };

function apiGet(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json());
}
function apiPost(path, body) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body:JSON.stringify(body) }).then(r=>r.json());
}
function apiPatch(path, body) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body:JSON.stringify(body) }).then(r=>r.json());
}
function apiDel(path) {
  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');
  return fetch(`${BASE}${path}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
}

// ── Payment modal ─────────────────────────────────────────────
function PayModal({ tx, onClose, onSave }) {
  const [paidAmt,  setPaidAmt]  = useState(tx.total_amount - (tx.paid_amount||0));
  const [paidDate, setPaidDate] = useState(today());
  const [method,   setMethod]   = useState('cash');
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const newPaid = parseFloat(tx.paid_amount||0) + parseFloat(paidAmt||0);
    const isPaid  = newPaid >= parseFloat(tx.total_amount);
    await onSave(tx.id, {
      paid_amount:    newPaid,
      paid_date:      paidDate,
      payment_method: method,
      payment_status: isPaid ? 'paid' : 'pending',
    });
    setSaving(false);
    onClose();
  };

  const outstanding = parseFloat(tx.total_amount) - parseFloat(tx.paid_amount||0);
  const isOut = tx.direction === 'out';

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.5)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:16, padding:24, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:C.navy }}>
              {isOut ? '💳 Record Payment from Kalutota' : '💳 Record Payment to Kalutota'}
            </div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{tx.description}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:C.muted }}>✕</button>
        </div>

        <div style={{ background:C.cream, borderRadius:10, padding:'12px 14px', marginBottom:14, display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontSize:13, color:C.muted }}>Outstanding</span>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:C.danger }}>{fmt(outstanding)}</span>
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={LBL}>Amount {isOut?'received from':'paid to'} Kalutota (Rs.)</label>
          <input type="number" value={paidAmt} onChange={e=>setPaidAmt(e.target.value)}
            style={{ ...INP, fontSize:18, fontWeight:700 }}/>
          <div style={{ display:'flex', gap:6, marginTop:6 }}>
            <button onClick={()=>setPaidAmt(String(outstanding))} style={{ padding:'5px 12px', background:C.navy, color:'white', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Full</button>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
          <div>
            <label style={LBL}>Date</label>
            <input type="date" value={paidDate} onChange={e=>setPaidDate(e.target.value)} style={INP}/>
          </div>
          <div>
            <label style={LBL}>Method</label>
            <select value={method} onChange={e=>setMethod(e.target.value)} style={SEL}>
              <option value="cash">💵 Cash</option>
              <option value="bank">🏦 Bank</option>
              <option value="cheque">📋 Cheque</option>
            </select>
          </div>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1, padding:'11px', background:saving?C.muted:C.success, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
            {saving ? '⏳...' : '✅ Save Payment'}
          </button>
          <button onClick={onClose}
            style={{ padding:'11px 16px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
            Cancel
          </button>
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
  const [month,    setMonth]   = useState('');        // '' = all time
  const [dirFilt,  setDirFilt] = useState('all');
  const [statFilt, setStatFilt]= useState('all');
  const [showAdd,  setShowAdd] = useState(false);
  const [payModal, setPayModal]= useState(null);
  const [saving,   setSaving]  = useState(false);
  const [error,    setError]   = useState('');
  const [toast,    setToast]   = useState('');

  const [form, setForm] = useState({
    date:           today(),
    direction:      'out',         // out = they take from you, in = they give you
    category:       'Frames',
    description:    '',
    quantity:       '1',
    unit_price:     '',
    payment_status: 'pending',
    paid_amount:    '0',
    paid_date:      '',
    payment_method: 'cash',
    notes:          '',
  });

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txData, sumData] = await Promise.all([
        apiGet(`/kalutota?limit=300${month?`&month=${month}`:''}${dirFilt!=='all'?`&direction=${dirFilt}`:''}${statFilt!=='all'?`&status=${statFilt}`:''}`),
        apiGet('/kalutota/summary'),
      ]);
      setTxs(Array.isArray(txData)?txData:[]);
      setSummary(sumData);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  },[month, dirFilt, statFilt]);

  useEffect(()=>{ load(); },[load]);

  const totalAmt = parseFloat(form.unit_price||0) * parseInt(form.quantity||0);

  const handleAdd = async () => {
    if (!form.description.trim()) return setError('Description required');
    if (!form.unit_price || parseFloat(form.unit_price) <= 0) return setError('Unit price required');
    setError(''); setSaving(true);
    try {
      const res = await apiPost('/kalutota', {
        ...form,
        quantity:    parseInt(form.quantity),
        unit_price:  parseFloat(form.unit_price),
        paid_amount: parseFloat(form.paid_amount)||0,
      });
      if (res.error) throw new Error(res.error);
      showToast('Transaction recorded ✅');
      setForm(f=>({ ...f, description:'', quantity:'1', unit_price:'', paid_amount:'0', notes:'' }));
      setShowAdd(false);
      load();
    } catch(e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handlePaySave = async (id, updates) => {
    await apiPatch(`/kalutota/${id}`, updates);
    showToast('Payment recorded ✅');
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    await apiDel(`/kalutota/${id}`);
    showToast('Deleted');
    load();
  };

  const s = summary || {};
  const netBalance = parseFloat(s.net_balance||0);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, background:C.navy, color:'white', padding:'12px 20px', borderRadius:12, fontSize:14, fontWeight:600, borderLeft:`4px solid ${C.gold}`, zIndex:500 }}>
          {toast}
        </div>
      )}

      {payModal && (
        <PayModal tx={payModal} onClose={()=>setPayModal(null)} onSave={handlePaySave}/>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.navy, margin:0 }}>🏪 Kalutota Opticals Account</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Trade account — goods exchanged and payments between shops</p>
        </div>
        <button onClick={()=>{ setShowAdd(s=>!s); setError(''); }}
          style={{ padding:'9px 22px', background:showAdd?C.cream:C.gold, color:showAdd?C.muted:C.navy, border:showAdd?`1.5px solid ${C.border}`:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          {showAdd ? '✕ Cancel' : '+ Add Transaction'}
        </button>
      </div>

      {/* Net balance banner */}
      <div style={{ background:netBalance >= 0 ? '#dcfce7' : '#fee2e2', border:`2px solid ${netBalance >= 0 ? '#86efac' : '#fca5a5'}`, borderRadius:14, padding:'16px 20px', margin:'16px 0', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:netBalance>=0?C.success:C.danger, marginBottom:4 }}>
            {netBalance >= 0 ? '💰 Kalutota Opticals owes YOU' : '💳 You owe Kalutota Opticals'}
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:700, color:netBalance>=0?C.success:C.danger }}>
            {fmt(Math.abs(netBalance))}
          </div>
          <div style={{ fontSize:12, color:netBalance>=0?C.success:C.danger, marginTop:4 }}>
            {netBalance >= 0
              ? `They owe you ${fmt(s.they_owe_you)} · You owe them ${fmt(s.you_owe_them)}`
              : `You owe them ${fmt(s.you_owe_them)} · They owe you ${fmt(s.they_owe_you)}`
            }
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>All time</div>
          <div style={{ fontSize:13, color:C.muted }}>Goods out: <b style={{color:C.out}}>{fmt(s.total_out_value)}</b></div>
          <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>Goods in: <b style={{color:C.in}}>{fmt(s.total_in_value)}</b></div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:16 }}>
        {[
          { l:'They owe you', v:fmt(s.they_owe_you),    c:C.success,  sub:`${s.pending_out_count||0} unpaid` },
          { l:'You owe them', v:fmt(s.you_owe_them),    c:C.danger,   sub:`${s.pending_in_count||0} unpaid` },
          { l:'Goods out',    v:fmt(s.total_out_value),  c:C.out,      sub:'They took from you' },
          { l:'Goods in',     v:fmt(s.total_in_value),   c:C.in,       sub:'They gave to you' },
        ].map(s=>(
          <div key={s.l} style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.muted, marginBottom:4 }}>{s.l}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:s.c }}>{s.v}</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:14 }}>➕ New Transaction</div>

          {error && <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'9px 13px', fontSize:13, marginBottom:12 }}>⚠️ {error}</div>}

          {/* Direction */}
          <div style={{ marginBottom:14 }}>
            <label style={LBL}>What happened? *</label>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setForm(f=>({...f,direction:'out'}))}
                style={{ flex:1, padding:'12px 8px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`2px solid ${form.direction==='out'?C.out:C.border}`, background:form.direction==='out'?'#f5f3ff':'white', color:form.direction==='out'?C.out:C.muted, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <span style={{ fontSize:22 }}>📤</span>
                <span>They took from us</span>
                <span style={{ fontSize:11, opacity:.7 }}>Frames, boxes, lenses, etc.</span>
              </button>
              <button onClick={()=>setForm(f=>({...f,direction:'in'}))}
                style={{ flex:1, padding:'12px 8px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`2px solid ${form.direction==='in'?C.in:C.border}`, background:form.direction==='in'?'#e0f2fe':'white', color:form.direction==='in'?C.in:C.muted, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <span style={{ fontSize:22 }}>📥</span>
                <span>They gave us</span>
                <span style={{ fontSize:11, opacity:.7 }}>Frames, stock they supplied</span>
              </button>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
            <div><label style={LBL}>Date</label><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={INP}/></div>
            <div>
              <label style={LBL}>Category</label>
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

          <div style={{ marginBottom:10 }}>
            <label style={LBL}>Description *</label>
            <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
              placeholder="e.g. RayBan Black frame × 3, Lens cleaner × 10, Reading glass +2.00..."
              style={INP}/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:10 }}>
            <div><label style={LBL}>Quantity</label><input type="number" min="1" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} style={INP}/></div>
            <div><label style={LBL}>Unit Price (Rs.)</label><input type="number" value={form.unit_price} onChange={e=>setForm(f=>({...f,unit_price:e.target.value}))} placeholder="Price each" style={INP}/></div>
            <div><label style={LBL}>Paid so far (Rs.)</label><input type="number" value={form.paid_amount} onChange={e=>setForm(f=>({...f,paid_amount:e.target.value}))} placeholder="0 if pending" style={INP}/></div>
            <div><label style={LBL}>Payment Method</label>
              <select value={form.payment_method} onChange={e=>setForm(f=>({...f,payment_method:e.target.value}))} style={SEL}>
                <option value="cash">💵 Cash</option>
                <option value="bank">🏦 Bank</option>
                <option value="cheque">📋 Cheque</option>
              </select>
            </div>
          </div>

          {totalAmt > 0 && (
            <div style={{ background:form.direction==='out'?'#f5f3ff':'#e0f2fe', borderRadius:10, padding:'11px 14px', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:C.muted }}>{form.quantity} × {fmt(form.unit_price||0)}</span>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:form.direction==='out'?C.out:C.in }}>{fmt(totalAmt)}</span>
            </div>
          )}

          <div style={{ marginBottom:14 }}>
            <label style={LBL}>Notes (optional)</label>
            <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any extra details..." style={INP}/>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleAdd} disabled={saving}
              style={{ padding:'11px 24px', background:saving?C.muted:C.navy, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {saving ? '⏳ Saving...' : '💾 Save Transaction'}
            </button>
            <button onClick={()=>{ setShowAdd(false); setError(''); }}
              style={{ padding:'11px 16px', background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
          style={{ padding:'7px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:C.cream, color:C.navy }}/>
        {month && <button onClick={()=>setMonth('')} style={{ padding:'7px 12px', background:C.cream, border:`1px solid ${C.border}`, borderRadius:9, fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>All time ✕</button>}

        {[['all','All'],['out','📤 Taken'],['in','📥 Given']].map(([v,l])=>(
          <button key={v} onClick={()=>setDirFilt(v)}
            style={{ padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${dirFilt===v?C.navy:C.border}`, background:dirFilt===v?C.navy:'white', color:dirFilt===v?'white':C.muted }}>
            {l}
          </button>
        ))}

        {[['all','All'],['pending','⏳ Pending'],['paid','✅ Paid']].map(([v,l])=>(
          <button key={v} onClick={()=>setStatFilt(v)}
            style={{ padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1.5px solid ${statFilt===v?C.navy:C.border}`, background:statFilt===v?C.navy:'white', color:statFilt===v?'white':C.muted }}>
            {l}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div style={{ background:'white', border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'90px 32px 1fr 80px 110px 100px 90px 50px', padding:'10px 16px', background:C.cream, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:C.muted, borderBottom:`1px solid ${C.border}` }}>
          <span>Date</span><span></span><span>Description</span><span>Qty</span><span>Amount</span><span>Paid</span><span>Status</span><span></span>
        </div>

        {loading
          ? <div style={{ padding:32, textAlign:'center', color:C.muted }}>Loading...</div>
          : !txs.length
            ? <div style={{ padding:48, textAlign:'center', color:C.muted }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🏪</div>
                <div style={{ fontSize:14, fontWeight:600, color:C.navy, marginBottom:6 }}>No transactions yet</div>
                <div style={{ fontSize:13 }}>Click "+ Add Transaction" to record the first exchange</div>
              </div>
            : txs.map((tx, idx) => {
                const isOut      = tx.direction === 'out';
                const outstanding= parseFloat(tx.total_amount) - parseFloat(tx.paid_amount||0);
                const isPaid     = tx.payment_status === 'paid';

                return (
                  <div key={tx.id} style={{ display:'grid', gridTemplateColumns:'90px 32px 1fr 80px 110px 100px 90px 50px', padding:'12px 16px', borderBottom:`1px solid ${C.cream}`, alignItems:'center' }}>
                    <div style={{ fontSize:12, color:C.muted }}>{fmtDate(tx.date)}</div>
                    <div title={isOut?'They took from you':'They gave you'}>
                      <span style={{ fontSize:18 }}>{isOut?'📤':'📥'}</span>
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{tx.description}</div>
                      <div style={{ fontSize:11, color:C.muted }}>
                        <span style={{ background:isOut?'#f5f3ff':'#e0f2fe', color:isOut?C.out:C.in, padding:'1px 7px', borderRadius:20, fontSize:10, fontWeight:600, marginRight:6 }}>
                          {isOut?'Taken':'Given'}
                        </span>
                        {tx.category}
                        {tx.notes && ` · ${tx.notes}`}
                      </div>
                    </div>
                    <div style={{ fontSize:13, color:C.muted }}>{tx.quantity}</div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:isOut?C.out:C.in }}>{fmt(tx.total_amount)}</div>
                    <div style={{ fontSize:12 }}>
                      {parseFloat(tx.paid_amount||0) > 0 && (
                        <div style={{ color:C.success, fontWeight:600 }}>+{fmt(tx.paid_amount)}</div>
                      )}
                      {outstanding > 0 && !isPaid && (
                        <div style={{ color:C.danger, fontSize:11 }}>{fmt(outstanding)} due</div>
                      )}
                    </div>
                    <div>
                      {isPaid
                        ? <span style={{ background:'#dcfce7', color:C.success, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>✅ Paid</span>
                        : <span style={{ background:'#fee2e2', color:C.danger, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>⏳ Pending</span>
                      }
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      {!isPaid && (
                        <button onClick={()=>setPayModal(tx)}
                          style={{ padding:'5px 9px', background:'#dcfce7', color:C.success, border:`1px solid #86efac`, borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                          💳
                        </button>
                      )}
                      <button onClick={()=>handleDelete(tx.id)}
                        style={{ padding:'5px 8px', background:'none', border:'none', color:'#d1d5db', cursor:'pointer', fontSize:14, fontFamily:'inherit' }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })
        }

        {txs.length > 0 && (
          <div style={{ padding:'11px 16px', background:C.cream, borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:700 }}>
            <span style={{ color:C.muted }}>{txs.length} transactions</span>
            <div style={{ display:'flex', gap:16 }}>
              <span style={{ color:C.out }}>Out: {fmt(txs.filter(t=>t.direction==='out').reduce((s,t)=>s+parseFloat(t.total_amount||0),0))}</span>
              <span style={{ color:C.in  }}>In: {fmt(txs.filter(t=>t.direction==='in').reduce((s,t)=>s+parseFloat(t.total_amount||0),0))}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
