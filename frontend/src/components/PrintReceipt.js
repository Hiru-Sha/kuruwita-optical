// ============================================================
//  PrintReceipt.js — Fixed: prints exactly ONE copy
//  Root cause: multiple #ko-print-root elements + wrong CSS
// ============================================================
import React, { useState } from 'react';

const fmtMoney = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtDate  = (d) => { if(!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}); };
const todayStr = () => new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});

const navy=  '#0f1f3d', gold='#c9a84c', cream='#f8f5ef', border='#e0ddd6',
      muted= '#6b7280', success='#2d7a4f', danger='#c0392b';

// ── Single clean print trigger ────────────────────────────────
// Key fix: we inject a unique style that ONLY shows #ko-print-root
// and uses @page to force A5, single copy
const handlePrint = () => {
  const styleId = 'ko-bill-print-css';
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }
  // Force single copy: hide everything else, show only the print root
  // page-break-after:avoid prevents browser from adding extra blank pages
  style.textContent = `
    @media print {
      @page {
        size: A5 portrait;
        margin: 8mm;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        height: auto !important;
      }
      body > * {
        display: none !important;
      }
      #ko-print-root {
        display: block !important;
        position: static !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
      }
      #ko-print-root * {
        visibility: visible !important;
      }
      /* Prevent any element from forcing a second page */
      #ko-print-root > div {
        page-break-after: avoid !important;
        orphans: 4;
        widows: 4;
      }
    }
  `;
  window.print();
};

// ═══════════════════════════════════════════════════════════════
//  CUSTOMER BILL
// ═══════════════════════════════════════════════════════════════
function CustomerBill({ order, billType }) {
  const total   = parseFloat(order.total_amount   || 0);
  const advance = parseFloat(order.advance_amount || 0);
  const balance = parseFloat(order.balance_amount || 0);
  const frameSell = parseFloat(order.frame_sell_price || 0);
  const lensSell  = parseFloat(order.lens_sell_price  || 0);

  const amountPaid     = billType === 'advance' ? advance : balance;
  const remainingAfter = billType === 'advance' ? balance : 0;
  const billLabel      = billType === 'advance' ? 'Advance Receipt' : 'Final Receipt — Balance Paid';

  return (
    <div style={{ maxWidth:480, margin:'0 auto', fontFamily:"'DM Sans',sans-serif", color:navy }}>
      {/* Header */}
      <div style={{ background:navy, borderRadius:12, padding:'16px 20px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'white', marginBottom:2 }}>👁️ Kuruwita Optical</div>
          <div style={{ fontSize:10, color:gold, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:3 }}>{billLabel}</div>
          <div style={{ fontSize:11, color:'#ede9e0' }}>Kuruwita, Ratnapura District, Sri Lanka</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ background:gold, color:navy, fontWeight:700, fontSize:13, padding:'5px 12px', borderRadius:7, marginBottom:4 }}>{order.order_number}</div>
          <div style={{ fontSize:11, color:'#ede9e0' }}>Date: {todayStr()}</div>
        </div>
      </div>

      {/* Customer */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:muted, marginBottom:7, paddingBottom:4, borderBottom:`1px solid ${border}` }}>Customer</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
          {[{l:'Name',v:order.customer_name},{l:'Phone',v:order.phone},{l:'Age',v:order.age?order.age+' years':'—'}].map(i=>(
            <div key={i.l} style={{ background:cream, borderRadius:8, padding:'7px 11px' }}>
              <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:2 }}>{i.l}</div>
              <div style={{ fontSize:13, fontWeight:600, color:navy }}>{i.v||'—'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Spectacle details */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:muted, marginBottom:7, paddingBottom:4, borderBottom:`1px solid ${border}` }}>Spectacle Details</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
          {[
            {l:'Frame',        v:order.frame},
            {l:'Frame Type',   v:order.frame_type},
            {l:'Frame Color',  v:order.frame_color||'—'},
            {l:'Lens Type',    v:order.lens_type},
            {l:'Lens Coating', v:order.lens_coating},
          ].map(i=>(
            <div key={i.l} style={{ background:cream, borderRadius:8, padding:'7px 11px' }}>
              <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:2 }}>{i.l}</div>
              <div style={{ fontSize:13, fontWeight:600, color:navy }}>{i.v||'—'}</div>
            </div>
          ))}
          <div style={{ background:'#dcfce7', borderRadius:8, padding:'7px 11px' }}>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:success, marginBottom:2 }}>Expected Delivery</div>
            <div style={{ fontSize:13, fontWeight:700, color:success }}>{fmtDate(order.deliver_date)}</div>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:muted, marginBottom:7, paddingBottom:4, borderBottom:`1px solid ${border}` }}>Payment</div>
        <div style={{ background:cream, borderRadius:10, padding:'12px 14px' }}>
          {frameSell > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'3px 0', color:muted }}>
              <span>Frame</span><span>{fmtMoney(frameSell)}</span>
            </div>
          )}
          {lensSell > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'3px 0', color:muted }}>
              <span>Lens ({order.lens_type})</span><span>{fmtMoney(lensSell)}</span>
            </div>
          )}
          <div style={{ borderTop:`1.5px solid ${border}`, margin:'8px 0' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, color:navy, marginBottom:7 }}>
            <span>Total Amount</span><span>{fmtMoney(total)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, padding:'7px 11px', background:billType==='advance'?'#dbeafe':'#dcfce7', borderRadius:8, marginBottom:5, color:billType==='advance'?'#1e40af':success }}>
            <span>{billType==='advance'?'✅ Advance Paid':'✅ Balance Paid'}</span>
            <span>{fmtMoney(amountPaid)}</span>
          </div>
          {remainingAfter > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, color:danger }}>
              <span>Balance Remaining</span><span>{fmtMoney(remainingAfter)}</span>
            </div>
          )}
          {remainingAfter <= 0 && billType === 'balance' && (
            <div style={{ textAlign:'center', fontSize:13, fontWeight:700, color:success, marginTop:4 }}>✅ Fully Paid — Thank You!</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop:`2px solid ${navy}`, paddingTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:11, color:muted }}>
          <div style={{ fontWeight:600, color:navy, marginBottom:2 }}>Kuruwita Optical</div>
          <div>Thank you for your trust. 🙏</div>
          {billType==='advance' && <div style={{ fontSize:10, marginTop:3, color:danger }}>Please bring this receipt on collection.</div>}
        </div>
        <div style={{ fontSize:18 }}>👁️</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  LAB JOB CARD
// ═══════════════════════════════════════════════════════════════
function LabJobCard({ order }) {
  const ref = order.refraction || order;
  return (
    <div style={{ maxWidth:480, margin:'0 auto', fontFamily:"'DM Sans',sans-serif" }}>
      {/* Header */}
      <div style={{ background:navy, borderRadius:10, padding:'12px 16px', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:'white' }}>👁️ Kuruwita Optical — Lab Job Card</div>
          <div style={{ fontSize:9, color:gold, letterSpacing:'1.5px', textTransform:'uppercase', marginTop:2 }}>Send with the frame to the lab</div>
        </div>
        <div style={{ background:gold, color:navy, fontWeight:700, fontSize:15, padding:'5px 12px', borderRadius:7 }}>{order.order_number}</div>
      </div>

      {/* Date + Patient */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:7, marginBottom:10 }}>
        {[{l:'Date',v:todayStr()},{l:'Patient Name',v:order.customer_name}].map(b=>(
          <div key={b.l} style={{ border:`1.5px solid ${border}`, borderRadius:8, overflow:'hidden' }}>
            <div style={{ background:navy, color:gold, fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', padding:'3px 9px' }}>{b.l}</div>
            <div style={{ padding:'7px 9px', fontSize:13, fontWeight:700, color:navy, background:'white' }}>{b.v||'—'}</div>
          </div>
        ))}
      </div>

      {/* Frame table */}
      <div style={{ border:`2px solid ${navy}`, borderRadius:9, overflow:'hidden', marginBottom:9 }}>
        <div style={{ background:navy, color:gold, fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', padding:'5px 13px' }}>Frame</div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>{['Frame Name','Type','Color','Material'].map(h=>(
            <th key={h} style={{ background:cream, padding:'5px 9px', textAlign:'left', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:muted, border:`1px solid ${border}` }}>{h}</th>
          ))}</tr></thead>
          <tbody><tr>{[order.frame,order.frame_type,order.frame_color||'—',order.frame_material||'—'].map((v,i)=>(
            <td key={i} style={{ padding:'8px 9px', fontSize:13, fontWeight:700, color:navy, border:`1px solid ${border}`, background:'white' }}>{v||'—'}</td>
          ))}</tr></tbody>
        </table>
      </div>

      {/* Lens table */}
      <div style={{ border:`2px solid ${navy}`, borderRadius:9, overflow:'hidden', marginBottom:9 }}>
        <div style={{ background:navy, color:gold, fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', padding:'5px 13px' }}>Lens</div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>{['Lens Type','Coating','Index'].map(h=>(
            <th key={h} style={{ background:cream, padding:'5px 9px', textAlign:'left', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:muted, border:`1px solid ${border}` }}>{h}</th>
          ))}</tr></thead>
          <tbody><tr>{[order.lens_type,order.lens_coating,order.lens_index||'—'].map((v,i)=>(
            <td key={i} style={{ padding:'8px 9px', fontSize:13, fontWeight:700, color:navy, border:`1px solid ${border}`, background:'white' }}>{v||'—'}</td>
          ))}</tr></tbody>
        </table>
      </div>

      {/* Prescription */}
      <div style={{ border:`2px solid ${navy}`, borderRadius:9, overflow:'hidden', marginBottom:9 }}>
        <div style={{ background:navy, color:gold, fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', padding:'5px 13px' }}>Prescription</div>
        <div style={{ padding:10, background:'white' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead><tr>{['Eye','SPH','CYL','AXIS','ADD','VA'].map(h=>(
              <th key={h} style={{ background:cream, padding:'6px 7px', textAlign:'center', fontSize:9, fontWeight:700, textTransform:'uppercase', border:`1px solid ${border}` }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {[
                {eye:'Right (R)',sph:ref.r_sph,cyl:ref.r_cyl,axis:ref.r_axis,add:ref.r_add,va:ref.r_va},
                {eye:'Left (L)', sph:ref.l_sph,cyl:ref.l_cyl,axis:ref.l_axis,add:ref.l_add,va:ref.l_va},
              ].map(row=>(
                <tr key={row.eye}>
                  <td style={{ background:cream, padding:'7px 9px', fontWeight:700, fontSize:12, border:`1px solid ${border}` }}>{row.eye}</td>
                  {[row.sph,row.cyl,row.axis,row.add,row.va].map((v,i)=>(
                    <td key={i} style={{ padding:'7px 7px', textAlign:'center', border:`1px solid ${border}`, fontSize:13, fontWeight:700, color:navy }}>{v||'—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {(ref.notes||ref.ref_notes) && (
            <div style={{ marginTop:7, fontSize:11, color:muted, fontStyle:'italic', background:'#fef9f0', borderRadius:5, padding:'5px 9px' }}>
              ⚠️ {ref.notes||ref.ref_notes}
            </div>
          )}
        </div>
      </div>

      {/* Measurements */}
      <div style={{ border:`2px solid ${navy}`, borderRadius:9, overflow:'hidden', marginBottom:9 }}>
        <div style={{ background:navy, color:gold, fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', padding:'5px 13px' }}>Measurements</div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>{['','Right (R)','Left (L)'].map(h=>(
            <th key={h} style={{ background:cream, padding:'6px 11px', textAlign:'center', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:muted, border:`1px solid ${border}` }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {[
              {l:'PD',         r:ref.r_pd,         left:ref.l_pd},
              {l:'Seg Height', r:order.seg_height_r, left:order.seg_height_l},
            ].map(row=>(
              <tr key={row.l}>
                <td style={{ background:cream, padding:'9px 11px', fontWeight:700, fontSize:11, color:muted, border:`1px solid ${border}`, textTransform:'uppercase', letterSpacing:'.5px' }}>{row.l}</td>
                <td style={{ padding:'9px 11px', textAlign:'center', border:`1px solid ${border}`, fontSize:15, fontWeight:700, color:navy, background:'white' }}>{row.r||'—'}</td>
                <td style={{ padding:'9px 11px', textAlign:'center', border:`1px solid ${border}`, fontSize:15, fontWeight:700, color:navy, background:'white' }}>{row.left||'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order.notes && (
        <div style={{ border:`1.5px solid ${border}`, borderRadius:8, overflow:'hidden', marginBottom:9 }}>
          <div style={{ background:navy, color:gold, fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', padding:'4px 11px' }}>Special Instructions</div>
          <div style={{ padding:'8px 13px', background:'white', fontSize:13, color:navy }}>{order.notes}</div>
        </div>
      )}

      <div style={{ borderTop:`2px solid ${navy}`, paddingTop:9, fontSize:10, color:muted, textAlign:'center' }}>
        Kuruwita Optical · Kuruwita, Ratnapura · {todayStr()}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN MODAL
// ═══════════════════════════════════════════════════════════════
export default function PrintReceipt({ order, onClose }) {
  const [activeTab, setActiveTab] = useState('advance');
  const tabs = [
    {key:'advance', label:'🧾 Advance Bill'},
    {key:'balance', label:'✅ Balance Bill'},
    {key:'lab',     label:'🔬 Lab Job Card'},
  ];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.6)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'24px 16px', fontFamily:"'DM Sans',sans-serif" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:620, boxShadow:'0 24px 80px rgba(0,0,0,.35)' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:`1px solid ${border}` }}>
          <div style={{ display:'flex', gap:6 }}>
            {tabs.map(t=>(
              <button key={t.key} onClick={()=>setActiveTab(t.key)}
                style={{ padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'1.5px solid', fontFamily:'inherit', background:activeTab===t.key?navy:'white', color:activeTab===t.key?'white':muted, borderColor:activeTab===t.key?navy:border }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handlePrint}
              style={{ padding:'7px 18px', background:gold, color:navy, border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              🖨️ Print
            </button>
            <button onClick={onClose}
              style={{ padding:'7px 14px', background:cream, color:muted, border:`1.5px solid ${border}`, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              ✕
            </button>
          </div>
        </div>

        {/* THE PRINT ROOT — only this element is shown when printing */}
        <div id="ko-print-root" style={{ padding:'22px 26px', background:'white' }}>
          {activeTab==='advance' && <CustomerBill order={order} billType="advance"/>}
          {activeTab==='balance' && <CustomerBill order={order} billType="balance"/>}
          {activeTab==='lab'     && <LabJobCard   order={order}/>}
        </div>

        <div style={{ padding:'10px 20px', borderTop:`1px solid ${border}`, fontSize:12, color:muted, textAlign:'center' }}>
          {activeTab==='advance' && '📄 Print when customer pays the advance'}
          {activeTab==='balance' && '📄 Print when customer collects and pays balance'}
          {activeTab==='lab'     && '🔬 Print and send with the frame to the grinding lab'}
        </div>
      </div>
    </div>
  );
}
