/* eslint-disable */
import React, { useState, useEffect } from 'react';

const BASE  = () => process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tok   = () => localStorage.getItem('ko_token');
const hdr   = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` });
const api   = (p,m='GET',b=null) => fetch(`${BASE()}${p}`,{method:m,headers:hdr(),body:b?JSON.stringify(b):null}).then(r=>r.json());

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#15803d', danger:'#dc2626' };
const INP = { padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'white', color:C.navy, width:'100%', boxSizing:'border-box' };
const SEL = { ...INP, cursor:'pointer' };
const LABS = ['Negombo Optical','Solex Optical','Kalutota Optical (own)'];
const today = () => new Date().toISOString().split('T')[0];
const fmt   = n => `Rs. ${parseFloat(n||0).toLocaleString()}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';

export default function LensPayment() {
  const [tab,    setTab]    = useState('new'); // new | history
  const [date,   setDate]   = useState(today());
  const [method, setMethod] = useState('cash');
  const [paid,   setPaid]   = useState('');
  const [rows,   setRows]   = useState([{ order_no_kuruwita:'', order_no_kalutota:'', price:'', lab:'Negombo Optical' }]);
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState('');
  const [history, setHistory] = useState([]);
  const [histLoad, setHistLoad] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const loadHistory = async () => {
    setHistLoad(true);
    try { const d = await api('/lens-payments'); setHistory(Array.isArray(d)?d:[]); }
    finally { setHistLoad(false); }
  };

  useEffect(() => { if(tab==='history') loadHistory(); }, [tab]);

  const addRow    = () => setRows(r=>[...r,{ order_no_kuruwita:'', order_no_kalutota:'', price:'', lab:'Negombo Optical' }]);
  const removeRow = i => setRows(r=>r.filter((_,idx)=>idx!==i));
  const setRow    = (i,k,v) => setRows(r=>r.map((row,idx)=>idx===i?{...row,[k]:v}:row));

  const total   = rows.reduce((s,r)=>s+parseFloat(r.price||0), 0);
  const paidAmt = parseFloat(paid||0) || total;
  const balance = total - paidAmt;

  const buildHtml = (d, m, rowsData, tot, pAmt) => {
    const validRows = rowsData.filter(r=>r.price);
    const labTotals = {};
    validRows.forEach(r=>{ labTotals[r.lab]=(labTotals[r.lab]||0)+parseFloat(r.price||0); });
    const bal = tot - pAmt;

    const rowsHtml = validRows.map((r,i)=>`
      <tr style="background:${i%2===0?'white':'#f9fafb'}">
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#0f1f3d;">${r.order_no_kuruwita||'—'}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151;">${r.order_no_kalutota||'—'}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center;">
          <span style="background:${r.lab.includes('Negombo')?'#dbeafe':r.lab.includes('Solex')?'#dcfce7':'#f3f4f6'};
            color:${r.lab.includes('Negombo')?'#1e40af':r.lab.includes('Solex')?'#15803d':'#374151'};
            padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">${r.lab}</span>
        </td>
        <td style="padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:700;text-align:right;">Rs. ${parseFloat(r.price||0).toLocaleString()}</td>
      </tr>`).join('');

    const labSummaryHtml = Object.entries(labTotals).map(([lab,amt])=>`
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;color:#6b7280;">
        <span>${lab}</span><span style="font-weight:600;">Rs. ${amt.toLocaleString()}</span>
      </div>`).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>@page{size:A5;margin:10mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#0f1f3d}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
</head><body>
<div style="border-bottom:3px solid #1a56db;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-start;">
  <div><div style="font-size:17px;font-weight:700;">Kuruwita Optical</div><div style="font-size:9px;color:#6b7280;margin-top:1px;">No.57, Kurunegala Road, Chilaw</div></div>
  <div style="text-align:right;"><div style="background:#1a56db;color:white;font-size:8px;font-weight:700;padding:2px 10px;border-radius:20px;letter-spacing:1px;display:inline-block;margin-bottom:3px;">LENS PAYMENT</div>
  <div style="font-size:10px;color:#6b7280;">${d}</div></div>
</div>
<div style="background:#f8faff;border:1.5px solid #dbeafe;border-radius:8px;padding:8px 12px;margin-bottom:12px;display:flex;justify-content:space-between;">
  <div><div style="font-size:8px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Paid To</div><div style="font-size:14px;font-weight:700;">Kalutota Optical</div></div>
  <div style="text-align:right;"><div style="font-size:8px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Payment Method</div><div style="font-size:13px;font-weight:700;">${m==='cash'?'Cash':m==='card'?'Card':'Bank Transfer'}</div></div>
</div>
<table style="width:100%;border-collapse:collapse;border:1.5px solid #dbeafe;margin-bottom:12px;">
  <thead><tr style="background:#1a56db;">
    <th style="padding:6px 10px;color:white;font-size:9px;font-weight:700;text-align:left;">ORDER Number</th>
    <th style="padding:6px 10px;color:white;font-size:9px;font-weight:700;text-align:left;">Bill Number </th>
    <th style="padding:6px 10px;color:white;font-size:9px;font-weight:700;text-align:center;">LAB</th>
    <th style="padding:6px 10px;color:white;font-size:9px;font-weight:700;text-align:right;">LENS PRICE</th>
  </tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>
<div style="display:flex;gap:12px;margin-bottom:12px;">
  <div style="flex:1;background:#f8faff;border:1.5px solid #dbeafe;border-radius:8px;padding:8px 12px;">
    <div style="font-size:8px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">By Lab</div>
    ${labSummaryHtml}
  </div>
  <div style="width:160px;">
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e5e7eb;font-size:11px;"><span style="color:#6b7280;">Total (${validRows.length} orders)</span><span style="font-weight:700;">Rs. ${tot.toLocaleString()}</span></div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e5e7eb;font-size:11px;"><span style="color:#15803d;font-weight:700;">Amount Paid</span><span style="font-weight:700;color:#15803d;">Rs. ${pAmt.toLocaleString()}</span></div>
    ${bal>0?`<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px;"><span style="color:#dc2626;font-weight:700;">Balance Due</span><span style="font-weight:700;color:#dc2626;">Rs. ${bal.toLocaleString()}</span></div>`:`<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px;"><span style="color:#15803d;font-weight:700;">✓ Fully Paid</span><span style="font-weight:700;color:#15803d;">Rs. ${pAmt.toLocaleString()}</span></div>`}
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px;">
  <div style="border-top:1px solid #d1d5db;padding-top:6px;"><div style="font-size:9px;color:#6b7280;">Received by (Kalutota Optical)</div></div>
  <div style="border-top:1px solid #d1d5db;padding-top:6px;"><div style="font-size:9px;color:#6b7280;">Paid by (Kuruwita Optical)</div></div>
</div>
<div style="margin-top:12px;text-align:center;font-size:8px;color:#9ca3af;border-top:1px dashed #e5e7eb;padding-top:7px;">Kuruwita Optical · Printed: ${new Date().toLocaleDateString('en-GB')}</div>
</body></html>`;
  };

  const handlePrintAndSave = async () => {
    const validRows = rows.filter(r=>r.price);
    if (!validRows.length) return showToast('Add at least one order');
    setSaving(true);
    try {
      // Save to DB
      await api('/lens-payments', 'POST', { date, pay_method:method, total, paid_amount:paidAmt, rows:validRows });
      showToast('✓ Saved to history');
      // Print
      const html = buildHtml(date, method, validRows, total, paidAmt);
      const w = window.open('','_blank','width=600,height=800');
      w.document.write(html); w.document.close();
      w.onload = () => { w.focus(); w.print(); };
      // Reset form
      setRows([{ order_no_kuruwita:'', order_no_kalutota:'', price:'', lab:'Negombo Optical' }]);
      setPaid('');
    } catch(e) { showToast('Failed to save'); }
    finally { setSaving(false); }
  };

  const handlePrintOnly = () => {
    const validRows = rows.filter(r=>r.price);
    if (!validRows.length) return showToast('Add at least one order');
    const html = buildHtml(date, method, validRows, total, paidAmt);
    const w = window.open('','_blank','width=600,height=800');
    w.document.write(html); w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  const reprintHistory = (h) => {
    const parsedRows = typeof h.rows === 'string' ? JSON.parse(h.rows) : h.rows;
    const html = buildHtml(fmtDate(h.date), h.pay_method, parsedRows, parseFloat(h.total), parseFloat(h.paid_amount));
    const w = window.open('','_blank','width=600,height=800');
    w.document.write(html); w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  const deleteHistory = async (id) => {
    if (!window.confirm('Delete this payment record?')) return;
    await api(`/lens-payments/${id}`, 'DELETE');
    setHistory(h=>h.filter(x=>x.id!==id));
    showToast('Deleted');
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:750 }}>
      {toast && <div style={{ position:'fixed', top:20, right:20, background:C.navy, color:'white', padding:'10px 18px', borderRadius:10, zIndex:999, fontSize:13, fontWeight:600 }}>{toast}</div>}

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:4 }}>Finance</div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:C.navy, margin:0 }}>Lens Payment Receipt</h1>
        <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Payment to Kalutota Optical for lens orders</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:C.cream, borderRadius:10, padding:4 }}>
        {[['new','➕ New Payment'],['history','📋 Payment History']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ flex:1, padding:'9px', borderRadius:8, border:'none', fontFamily:'inherit', fontSize:13, fontWeight:700, cursor:'pointer',
              background:tab===t?C.navy:'transparent', color:tab===t?'white':C.muted }}>
            {l}
          </button>
        ))}
      </div>

      {/* NEW PAYMENT */}
      {tab==='new' && (
        <div style={{ background:'white', border:`1.5px solid ${C.border}`, borderRadius:14, padding:24 }}>
          {/* Date + Method */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>Date</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={INP}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>Payment Method</label>
              <select value={method} onChange={e=>setMethod(e.target.value)} style={SEL}>
                <option value="cash">💵 Cash</option>
                <option value="card">💳 Card</option>
                <option value="transfer">🏦 Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Paid to */}
          <div style={{ background:'#f0f4ff', border:`1.5px solid #93c5fd`, borderRadius:10, padding:'10px 14px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>🏬</span>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'1px' }}>Paid To</div>
              <div style={{ fontSize:16, fontWeight:700, color:C.navy }}>Kalutota Optical</div>
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr auto', gap:8, marginBottom:6 }}>
            {['Order Number No.','Bill No.','Lab','Lens Price (Rs.)',''].map((l,i)=>(
              <div key={i} style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted }}>{l}</div>
            ))}
          </div>

          {/* Order rows */}
          {rows.map((row,i)=>(
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr auto', gap:8, marginBottom:8 }}>
              <input value={row.order_no_kuruwita} onChange={e=>setRow(i,'order_no_kuruwita',e.target.value)} placeholder="KO-0119" style={INP}/>
              <input value={row.order_no_kalutota} onChange={e=>setRow(i,'order_no_kalutota',e.target.value)} placeholder="KAL-0055" style={INP}/>
              <select value={row.lab} onChange={e=>setRow(i,'lab',e.target.value)} style={SEL}>
                {LABS.map(l=><option key={l}>{l}</option>)}
              </select>
              <input type="number" value={row.price} onChange={e=>setRow(i,'price',e.target.value)} placeholder="0" style={INP}/>
              <button onClick={()=>removeRow(i)} disabled={rows.length===1}
                style={{ padding:'9px 12px', background:'#fee2e2', border:'none', borderRadius:9, color:C.danger, cursor:rows.length===1?'not-allowed':'pointer', fontSize:14, opacity:rows.length===1?.4:1 }}>
                🗑️
              </button>
            </div>
          ))}

          <button onClick={addRow}
            style={{ padding:'8px 16px', background:C.cream, border:`1.5px dashed ${C.border}`, borderRadius:9, fontSize:13, color:C.muted, cursor:'pointer', fontFamily:'inherit', fontWeight:600, marginBottom:20 }}>
            + Add Order
          </button>

          {/* Totals */}
          <div style={{ background:C.cream, borderRadius:10, padding:'14px 16px', marginBottom:20 }}>
            {Object.entries(rows.reduce((acc,r)=>{ if(r.price){ acc[r.lab]=(acc[r.lab]||0)+parseFloat(r.price||0); } return acc; },{})).map(([lab,amt])=>(
              <div key={lab} style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:C.muted, marginBottom:4 }}>
                <span>{lab}</span><span style={{ fontWeight:600 }}>{fmt(amt)}</span>
              </div>
            ))}
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:8, marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:C.muted }}>Total ({rows.filter(r=>r.price).length} orders)</span>
              <span style={{ fontSize:20, fontWeight:800, color:C.navy }}>{fmt(total)}</span>
            </div>
            <div style={{ marginTop:12 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>Amount Paid Now (Rs.)</label>
              <input type="number" value={paid} onChange={e=>setPaid(e.target.value)}
                placeholder={`Full: ${total.toLocaleString()}`}
                style={{ ...INP, fontSize:16, fontWeight:700 }}/>
            </div>
            {parseFloat(paid||0)>0 && balance>0 && <div style={{ marginTop:8, fontSize:13, color:C.danger, fontWeight:700 }}>Balance Due: {fmt(balance)}</div>}
            {parseFloat(paid||0)>0 && balance<=0 && <div style={{ marginTop:8, fontSize:13, color:C.success, fontWeight:700 }}>✓ Fully Paid</div>}
          </div>

          {/* Buttons */}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={handlePrintOnly}
              style={{ padding:'13px 20px', background:'white', border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:C.muted }}>
              🖨️ Print Only
            </button>
            <button onClick={handlePrintAndSave} disabled={saving}
              style={{ flex:1, padding:'13px', background:saving?C.muted:C.navy, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {saving ? '⏳ Saving...' : '💾 Save & Print'}
            </button>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {tab==='history' && (
        <div>
          {histLoad ? (
            <div style={{ textAlign:'center', padding:60, color:C.muted }}>⏳ Loading...</div>
          ) : history.length===0 ? (
            <div style={{ textAlign:'center', padding:60, color:C.muted }}>
              <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
              <div style={{ fontSize:14, fontWeight:600, color:C.navy }}>No payment history yet</div>
            </div>
          ) : history.map(h => {
            const parsedRows = typeof h.rows==='string' ? JSON.parse(h.rows) : (h.rows||[]);
            const isExpanded = expanded===h.id;
            return (
              <div key={h.id} style={{ background:'white', border:`1.5px solid ${C.border}`, borderRadius:12, marginBottom:10, overflow:'hidden' }}>
                {/* Summary row */}
                <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}
                  onClick={()=>setExpanded(isExpanded?null:h.id)}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                      <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>{fmtDate(h.date)}</span>
                      <span style={{ background:'#eff6ff', color:'#1e40af', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                        {h.pay_method==='cash'?'Cash':h.pay_method==='card'?'Card':'Transfer'}
                      </span>
                      <span style={{ fontSize:12, color:C.muted }}>{parsedRows.length} orders</span>
                    </div>
                    <div style={{ display:'flex', gap:12, marginTop:4 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:C.navy }}>Total: {fmt(h.total)}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:C.success }}>Paid: {fmt(h.paid_amount)}</span>
                      {parseFloat(h.total)-parseFloat(h.paid_amount)>0 &&
                        <span style={{ fontSize:13, fontWeight:700, color:C.danger }}>Bal: {fmt(parseFloat(h.total)-parseFloat(h.paid_amount))}</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={e=>{ e.stopPropagation(); reprintHistory(h); }}
                      style={{ padding:'7px 12px', background:'#eff6ff', border:'1px solid #93c5fd', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:'#1e40af' }}>
                      🖨️ Reprint
                    </button>
                    <button onClick={e=>{ e.stopPropagation(); deleteHistory(h.id); }}
                      style={{ padding:'7px 10px', background:'#fee2e2', border:'none', borderRadius:8, fontSize:12, cursor:'pointer', color:C.danger }}>
                      🗑️
                    </button>
                  </div>
                  <span style={{ fontSize:12, color:C.muted }}>{isExpanded?'▲':'▼'}</span>
                </div>
                {/* Expanded rows */}
                {isExpanded && (
                  <div style={{ borderTop:`1px solid ${C.border}`, padding:'10px 16px', background:C.cream }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead>
                        <tr style={{ background:C.navy }}>
                          {['Order Number','Bill Number','Lab','Price'].map(h=>(
                            <th key={h} style={{ padding:'5px 10px', color:'white', fontWeight:700, textAlign:'left', fontSize:10, letterSpacing:'.5px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((r,i)=>(
                          <tr key={i} style={{ borderBottom:`1px solid ${C.border}`, background:i%2===0?'white':'#f9fafb' }}>
                            <td style={{ padding:'5px 10px', fontWeight:600, color:C.navy }}>{r.order_no_kuruwita||'—'}</td>
                            <td style={{ padding:'5px 10px', color:C.muted }}>{r.order_no_kalutota||'—'}</td>
                            <td style={{ padding:'5px 10px' }}>
                              <span style={{ background: r.lab?.includes('Negombo')?'#dbeafe':r.lab?.includes('Solex')?'#dcfce7':'#f3f4f6',
                                color: r.lab?.includes('Negombo')?'#1e40af':r.lab?.includes('Solex')?'#15803d':'#374151',
                                padding:'1px 6px', borderRadius:10, fontSize:10, fontWeight:700 }}>{r.lab}</span>
                            </td>
                            <td style={{ padding:'5px 10px', fontWeight:700, color:C.navy, textAlign:'right' }}>Rs. {parseFloat(r.price||0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}