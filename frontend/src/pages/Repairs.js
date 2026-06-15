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
const printRepairReceipt = (repair) => {
  const today = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
  const time  = new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${repair.repair_number}</title>
<style>
  @page{size:A6 portrait;margin:6mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;color:#0f1f3d;font-size:13px}
</style></head><body>
<div style="max-width:340px;margin:0 auto">
  <div style="background:#111;border-radius:10px;padding:12px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <img src="data:image/jpeg;base64,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" alt="Wickramakalutota Opticals" style="height:44px;object-fit:contain;max-width:180px"/>
      <div style="font-size:9px;color:#c9a84c;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px">Repair Receipt</div>
    </div>
    <div style="text-align:right">
      <div style="background:#c9a84c;color:#0f1f3d;font-weight:700;font-size:13px;padding:4px 10px;border-radius:7px;margin-bottom:4px">${repair.repair_number}</div>
      <div style="font-size:10px;color:#ede9e0">${today} ${time}</div>
      <div style="font-size:10px;color:#ede9e0">No.57 Kurunegala Road, Chilaw</div>
      <div style="font-size:10px;color:#ede9e0">Tel: 032 222 1211</div>
    </div>
  </div>

  ${repair.customer_name ? `
  <div style="background:#f8f5ef;border-radius:8px;padding:9px 12px;margin-bottom:12px">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:4px">Customer</div>
    <div style="font-size:14px;font-weight:700;color:#0f1f3d">${repair.customer_name}</div>
    ${repair.phone ? `<div style="font-size:12px;color:#6b7280">📞 ${repair.phone}</div>` : ''}
  </div>` : ''}

  <div style="background:#f8f5ef;border-radius:8px;padding:12px;margin-bottom:12px">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:6px">Repair Details</div>
    <div style="font-size:15px;font-weight:700;color:#0f1f3d;margin-bottom:4px">${repair.repair_type}</div>
    ${repair.description ? `<div style="font-size:12px;color:#6b7280;margin-bottom:4px">${repair.description}</div>` : ''}
    ${repair.notes ? `<div style="font-size:11px;color:#6b7280;font-style:italic">${repair.notes}</div>` : ''}
  </div>

  <div style="background:#0f1f3d;border-radius:10px;padding:14px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:9px;color:#c9a84c;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Amount Paid</div>
      <div style="font-size:10px;color:#ede9e0">${repair.payment_method==='bank'?'🏦 Bank Transfer':'💵 Cash'}</div>
    </div>
    <div style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#c9a84c">${fmtFull(repair.charge)}</div>
  </div>

  <div style="border-top:2px solid #0f1f3d;padding-top:10px;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:11px;color:#6b7280">
      <div style="font-weight:700;color:#0f1f3d;margin-bottom:2px">Wickramakalutota Opticals</div>
      <div>Thank you for your trust! 🙏</div>
    </div>
    <div style="font-size:20px">👁️</div>
  </div>
</div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
</body></html>`;

  const win = window.open('','_blank','width=600,height=800');
  if (!win) { alert('Please allow popups to print receipts.'); return; }
  win.document.open(); win.document.write(html); win.document.close();
};

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

// ══════════════════════════════════════════════════════════════

// ── Print JOB CARD (given to customer when dropping off repair) ──
const printRepairJobCard = (repair) => {
  const today   = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});
  const time    = new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  const dueDate = repair.due_date
    ? new Date(repair.due_date+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})
    : '—';

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Job Card — ${repair.repair_number||'NEW'}</title>
<style>
  @page{size:A6 landscape;margin:6mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;color:#0f1f3d;font-size:12px}
  .label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:3px}
  .val{font-size:13px;font-weight:600;color:#0f1f3d;min-height:18px;border-bottom:1px dotted #ccc;padding-bottom:2px;margin-bottom:8px}
  .big{font-size:16px;font-weight:700}
  table{width:100%;border-collapse:collapse}
  td{padding:5px 8px;border:1px solid #ddd;font-size:12px}
  .th{background:#0f1f3d;color:white;font-size:10px;font-weight:700;text-transform:uppercase;padding:5px 8px}
</style></head><body>
<table style="border:2px solid #0f1f3d;border-radius:0;width:100%;margin-bottom:8px">
  <tr>
    <td colspan="3" style="background:#0f1f3d;padding:8px 12px;border:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:14px;font-weight:700;color:white">Wickramakalutota Opticals</div>
          <div style="font-size:10px;color:#c9a84c">No.57 Kurunegala Road, Chilaw · 032 222 1211</div>
        </div>
        <div style="text-align:right">
          <div style="background:#c9a84c;color:#0f1f3d;font-weight:700;font-size:14px;padding:4px 10px;border-radius:6px">${repair.repair_number||'REPAIR'}</div>
          <div style="font-size:9px;color:#ede9e0;margin-top:2px">${today} ${time}</div>
        </div>
      </div>
    </td>
  </tr>
  <tr>
    <td style="width:50%;vertical-align:top;border:1px solid #ddd">
      <div class="label">Customer Name</div>
      <div class="val big">${repair.customer_name||'—'}</div>
      <div class="label">Phone</div>
      <div class="val">${repair.phone||'—'}</div>
    </td>
    <td style="width:50%;vertical-align:top;border:1px solid #ddd">
      <div class="label">Date Received</div>
      <div class="val">${today}</div>
      <div class="label">Expected Ready Date</div>
      <div class="val" style="color:#c0392b;font-weight:700">${dueDate}</div>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="border:1px solid #ddd;vertical-align:top">
      <div class="label">Repair Type</div>
      <div class="val big">${repair.repair_type||'—'}</div>
      <div class="label">Frame / Item Description</div>
      <div class="val">${repair.frame_description||repair.description||'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</div>
      <div class="label">Problem / Notes</div>
      <div class="val">${repair.notes||'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</div>
    </td>
  </tr>
  <tr>
    <td style="border:1px solid #ddd;background:#f8f5ef">
      <div class="label">Quoted Price</div>
      <div style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#0f1f3d">Rs. ${parseFloat(repair.charge||0).toLocaleString('en-LK',{minimumFractionDigits:2})}</div>
    </td>
    <td style="border:1px solid #ddd;background:#f8f5ef">
      <div class="label">Advance Paid</div>
      <div style="font-size:20px;font-weight:700;color:#6b7280">Rs. ${parseFloat(repair.advance||0).toLocaleString('en-LK',{minimumFractionDigits:2})}</div>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="border:1px solid #ddd;padding:6px 8px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:10px;color:#6b7280">Customer signature / acknowledgement: ___________________________</div>
        <div style="font-size:9px;color:#9ca3af;text-align:right">Please bring this card when collecting your item.</div>
      </div>
    </td>
  </tr>
</table>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
</body></html>`;

  const win = window.open('','_blank','width=700,height=500');
  if (!win) { alert('Please allow popups to print job card.'); return; }
  win.document.open(); win.document.write(html); win.document.close();
};

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
      await apiPatch(`/repairs/${payRepair.id}/payment`.replace('PATCH','POST'), null);
      // Use POST to the payment endpoint
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