/* eslint-disable */
import React, { useState } from 'react';

const C = {
  navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef',
  border:'#e0ddd6', muted:'#6b7280', success:'#15803d', danger:'#dc2626',
};
const INP = { padding:'9px 12px', border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'white', color:C.navy, width:'100%', boxSizing:'border-box' };
const SEL = { ...INP, cursor:'pointer' };
const LABS = ['Negombo Optical', 'Kalutota Optical', 'Solex Optical'];
const today = () => new Date().toISOString().split('T')[0];
const fmt = n => `Rs. ${parseFloat(n||0).toLocaleString()}`;

export default function LensPayment() {
  const [rows,    setRows]    = useState([{ order_no:'', price:'' }]);
  const [lab,     setLab]     = useState('Negombo Optical');
  const [date,    setDate]    = useState(today());
  const [paid,    setPaid]    = useState('');
  const [method,  setMethod]  = useState('cash');

  const addRow    = () => setRows(r => [...r, { order_no:'', price:'' }]);
  const removeRow = i  => setRows(r => r.filter((_,idx)=>idx!==i));
  const setRow    = (i,k,v) => setRows(r => r.map((row,idx)=>idx===i?{...row,[k]:v}:row));

  const total   = rows.reduce((s,r)=>s+parseFloat(r.price||0),0);
  const balance = total - parseFloat(paid||0);

  const print = () => {
    const validRows = rows.filter(r=>r.order_no||r.price);
    const rowsHtml = validRows.map(r=>`
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:600;color:#0f1f3d;">${r.order_no||'—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:700;text-align:right;color:#0f1f3d;">Rs. ${parseFloat(r.price||0).toLocaleString()}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  @page { size:A5; margin:10mm; }
  *{ box-sizing:border-box; margin:0; padding:0; }
  body{ font-family:Arial,sans-serif; color:#0f1f3d; }
  @media print{ body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body>

<!-- Header -->
<div style="border-bottom:3px solid #1a56db;padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end;">
  <div>
    <div style="font-size:18px;font-weight:700;color:#0f1f3d;">Kuruwita Optical</div>
    <div style="font-size:10px;color:#6b7280;margin-top:2px;">No.57, Kurunegala Road, Chilaw · 032 222 1211</div>
  </div>
  <div style="text-align:right;">
    <div style="background:#1a56db;color:white;font-size:9px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:1px;display:inline-block;margin-bottom:4px;">LENS PAYMENT RECEIPT</div>
    <div style="font-size:11px;color:#6b7280;">${date}</div>
  </div>
</div>

<!-- Lab + Method -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
  <div style="background:#f8faff;border:1.5px solid #dbeafe;border-radius:8px;padding:10px 14px;">
    <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Paid To</div>
    <div style="font-size:15px;font-weight:700;color:#0f1f3d;">${lab}</div>
  </div>
  <div style="background:#f8faff;border:1.5px solid #dbeafe;border-radius:8px;padding:10px 14px;">
    <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Payment Method</div>
    <div style="font-size:15px;font-weight:700;color:#0f1f3d;">${method==='cash'?'Cash':method==='card'?'Card':'Bank Transfer'}</div>
  </div>
</div>

<!-- Orders table -->
<table style="width:100%;border-collapse:collapse;border:1.5px solid #dbeafe;overflow:hidden;margin-bottom:16px;">
  <thead>
    <tr style="background:#1a56db;">
      <th style="padding:8px 12px;color:white;font-size:10px;font-weight:700;text-align:left;letter-spacing:.5px;">ORDER NUMBER</th>
      <th style="padding:8px 12px;color:white;font-size:10px;font-weight:700;text-align:right;letter-spacing:.5px;">LENS PRICE</th>
    </tr>
  </thead>
  <tbody>${rowsHtml}</tbody>
</table>

<!-- Totals -->
<div style="margin-left:auto;width:220px;">
  <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:13px;">
    <span style="color:#6b7280;">Total (${validRows.length} orders)</span>
    <span style="font-weight:700;">Rs. ${total.toLocaleString()}</span>
  </div>
  <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:13px;">
    <span style="color:#15803d;font-weight:700;">Amount Paid</span>
    <span style="font-weight:700;color:#15803d;">Rs. ${parseFloat(paid||total).toLocaleString()}</span>
  </div>
  ${parseFloat(paid||0)>0&&balance>0
    ? `<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:13px;"><span style="color:#dc2626;font-weight:700;">Balance Due</span><span style="font-weight:700;color:#dc2626;">Rs. ${balance.toLocaleString()}</span></div>`
    : `<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:13px;"><span style="color:#15803d;font-weight:700;">✓ Fully Paid</span><span style="font-weight:700;color:#15803d;">Rs. ${parseFloat(paid||total).toLocaleString()}</span></div>`
  }
</div>

<!-- Signatures -->
<div style="margin-top:28px;display:grid;grid-template-columns:1fr 1fr;gap:24px;">
  <div style="border-top:1px solid #d1d5db;padding-top:6px;">
    <div style="font-size:10px;color:#6b7280;">Received by (${lab})</div>
  </div>
  <div style="border-top:1px solid #d1d5db;padding-top:6px;">
    <div style="font-size:10px;color:#6b7280;">Paid by (Kuruwita Optical)</div>
  </div>
</div>

<div style="margin-top:16px;text-align:center;font-size:9px;color:#9ca3af;border-top:1px dashed #e5e7eb;padding-top:8px;">
  Kuruwita Optical · Your Trusted Eye Care · Printed: ${new Date().toLocaleDateString('en-GB')}
</div>
</body></html>`;

    const w = window.open('','_blank','width=600,height=800');
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:640 }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:4 }}>Finance</div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:C.navy, margin:0 }}>Lens Payment Receipt</h1>
        <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Create and print a lens cost payment receipt</p>
      </div>

      <div style={{ background:'white', border:`1.5px solid ${C.border}`, borderRadius:14, padding:24 }}>

        {/* Date + Lab + Method */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={INP}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>Lab / Paid To</label>
            <select value={lab} onChange={e=>setLab(e.target.value)} style={SEL}>
              {LABS.map(l=><option key={l}>{l}</option>)}
            </select>
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

        {/* Order rows */}
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, marginBottom:6 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted }}>Order Number</div>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted }}>Lens Price (Rs.)</div>
            <div/>
          </div>
          {rows.map((row,i)=>(
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, marginBottom:8 }}>
              <input value={row.order_no} onChange={e=>setRow(i,'order_no',e.target.value)}
                placeholder="e.g. KO-0119" style={INP}/>
              <input type="number" value={row.price} onChange={e=>setRow(i,'price',e.target.value)}
                placeholder="0" style={INP}/>
              <button onClick={()=>removeRow(i)} disabled={rows.length===1}
                style={{ padding:'9px 12px', background:'#fee2e2', border:'none', borderRadius:9, color:C.danger, cursor:rows.length===1?'not-allowed':'pointer', fontSize:14, opacity:rows.length===1?.4:1 }}>
                🗑️
              </button>
            </div>
          ))}
          <button onClick={addRow}
            style={{ padding:'8px 16px', background:C.cream, border:`1.5px dashed ${C.border}`, borderRadius:9, fontSize:13, color:C.muted, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
            + Add Order
          </button>
        </div>

        {/* Totals */}
        <div style={{ background:C.cream, borderRadius:10, padding:'14px 16px', marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:13, color:C.muted }}>Total ({rows.filter(r=>r.price).length} orders)</span>
            <span style={{ fontSize:18, fontWeight:800, color:C.navy }}>{fmt(total)}</span>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:C.muted, display:'block', marginBottom:6 }}>Amount Paid Now (Rs.)</label>
            <input type="number" value={paid} onChange={e=>setPaid(e.target.value)}
              placeholder={`Full amount: ${total.toLocaleString()}`}
              style={{ ...INP, fontSize:16, fontWeight:700 }}/>
          </div>
          {parseFloat(paid||0) > 0 && (
            <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:balance>0?C.danger:C.success, fontWeight:700 }}>
                {balance>0 ? `Balance Due: ${fmt(balance)}` : '✓ Fully Paid'}
              </span>
            </div>
          )}
        </div>

        {/* Print button */}
        <button onClick={print}
          style={{ width:'100%', padding:'14px', background:C.navy, color:'white', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', letterSpacing:'.3px' }}>
          🖨️ Print A5 Receipt
        </button>
      </div>
    </div>
  );
}