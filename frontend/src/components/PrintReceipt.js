// ============================================================
//  PrintReceipt.js — Fixed version:
//  ✅ Bill: removed duplicate delivery date (only in footer)
//  ✅ Lab card: frame & lens as separate clean tables
//  ✅ Lab card: PD R+L and Seg Height R+L as one combined row
//  ✅ Lab card: removed deliver date from card
// ============================================================
import React, { useState } from 'react';

const fmtMoney = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtDate  = (d) => { if(!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}); };
const todayStr = () => new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'});

const PRINT_CSS = `@media print{body *{visibility:hidden!important}#ko-print-root,#ko-print-root *{visibility:visible!important}#ko-print-root{position:fixed;inset:0;background:white;z-index:99999;padding:10mm}@page{margin:8mm;size:A5}}`;
const injectPrint = () => { if(!document.getElementById('ko-pcss')){const s=document.createElement('style');s.id='ko-pcss';s.textContent=PRINT_CSS;document.head.appendChild(s);} };

const navy=  '#0f1f3d', gold='#c9a84c', cream='#f8f5ef', border='#e0ddd6', muted='#6b7280', success='#2d7a4f', danger='#c0392b';

// ═══════════════════════════════════════════════════════════════
//  CUSTOMER BILL
// ═══════════════════════════════════════════════════════════════
function CustomerBill({ order, billType }) {
  const total   = parseFloat(order.total_amount   || 0);
  const advance = parseFloat(order.advance_amount || 0);
  const balance = parseFloat(order.balance_amount || 0);
  const frameSell  = parseFloat(order.frame_sell_price || 0);
  const lensSell   = parseFloat(order.lens_sell_price  || 0);

  const amountPaid     = billType === 'advance' ? advance : balance;
  const remainingAfter = billType === 'advance' ? balance : 0;
  const billLabel      = billType === 'advance' ? 'Advance Receipt' : 'Final Receipt — Balance Paid';

  return (
    <div style={{ maxWidth:480, margin:'0 auto', fontFamily:"'DM Sans',sans-serif", color:navy }}>

      {/* Shop header */}
      <div style={{ background:navy, borderRadius:12, padding:'18px 22px', marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'white', marginBottom:2 }}>👁️ Kuruwita Optical</div>
          <div style={{ fontSize:10, color:gold, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:4 }}>{billLabel}</div>
          <div style={{ fontSize:11, color:'#ede9e0' }}>Kuruwita, Ratnapura District, Sri Lanka</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ background:gold, color:navy, fontWeight:700, fontSize:14, padding:'5px 12px', borderRadius:7, marginBottom:5 }}>{order.order_number}</div>
          <div style={{ fontSize:11, color:'#ede9e0' }}>Date: {todayStr()}</div>
        </div>
      </div>

      {/* Customer */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:muted, marginBottom:8, paddingBottom:5, borderBottom:`1px solid ${border}` }}>Customer</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[{l:'Name',v:order.customer_name},{l:'Phone',v:order.phone},{l:'Age',v:order.age?order.age+' years':'—'}].map(i=>(
            <div key={i.l} style={{ background:cream, borderRadius:8, padding:'8px 12px' }}>
              <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:2 }}>{i.l}</div>
              <div style={{ fontSize:13, fontWeight:600, color:navy }}>{i.v||'—'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Spectacle details */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:muted, marginBottom:8, paddingBottom:5, borderBottom:`1px solid ${border}` }}>Spectacle Details</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            {l:'Frame',       v: order.frame},
            {l:'Frame Type',  v: order.frame_type},
            {l:'Frame Color', v: order.frame_color||'—'},
            {l:'Lens Type',   v: order.lens_type},
            {l:'Lens Coating',v: order.lens_coating},
          ].map(i=>(
            <div key={i.l} style={{ background:cream, borderRadius:8, padding:'8px 12px' }}>
              <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:muted, marginBottom:2 }}>{i.l}</div>
              <div style={{ fontSize:13, fontWeight:600, color:navy }}>{i.v||'—'}</div>
            </div>
          ))}
          {/* Delivery date — only here, NOT in footer */}
          <div style={{ background:'#dcfce7', borderRadius:8, padding:'8px 12px' }}>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:success, marginBottom:2 }}>Expected Delivery</div>
            <div style={{ fontSize:13, fontWeight:700, color:success }}>{fmtDate(order.deliver_date)}</div>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:muted, marginBottom:8, paddingBottom:5, borderBottom:`1px solid ${border}` }}>Payment</div>
        <div style={{ background:cream, borderRadius:10, padding:'14px 16px' }}>
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
          <div style={{ borderTop:`1.5px solid ${border}`, margin:'10px 0' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, color:navy, marginBottom:8 }}>
            <span>Total Amount</span><span>{fmtMoney(total)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, padding:'8px 12px', background:billType==='advance'?'#dbeafe':'#dcfce7', borderRadius:8, marginBottom:6, color:billType==='advance'?'#1e40af':success }}>
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

      {/* Footer — NO delivery date here (already shown above) */}
      <div style={{ borderTop:`2px solid ${navy}`, paddingTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:12, color:muted }}>
          <div style={{ fontWeight:600, color:navy, marginBottom:2 }}>Kuruwita Optical</div>
          <div>Thank you for your trust. 🙏</div>
          {billType==='advance' && <div style={{ fontSize:11, marginTop:3, color:danger }}>Please bring this receipt on collection.</div>}
        </div>
        <div style={{ fontSize:20 }}>👁️</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  LAB JOB CARD — Fixed
// ═══════════════════════════════════════════════════════════════
function LabJobCard({ order }) {
  const ref = order.refraction || order;

  const Box = ({ label, value }) => (
    <div style={{ border:`1.5px solid ${border}`, borderRadius:8, overflow:'hidden' }}>
      <div style={{ background:navy, color:gold, fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', padding:'4px 10px' }}>{label}</div>
      <div style={{ padding:'8px 10px', fontSize:14, fontWeight:700, color:navy, minHeight:32, background:'white' }}>{value||'—'}</div>
    </div>
  );

  return (
    <div style={{ maxWidth:480, margin:'0 auto', fontFamily:"'DM Sans',sans-serif" }}>

      {/* Header */}
      <div style={{ background:navy, borderRadius:10, padding:'14px 18px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:'white' }}>👁️ Kuruwita Optical — Lab Job Card</div>
          <div style={{ fontSize:10, color:gold, letterSpacing:'1.5px', textTransform:'uppercase', marginTop:2 }}>Send this with the frame to the lab</div>
        </div>
        <div style={{ background:gold, color:navy, fontWeight:700, fontSize:16, padding:'6px 14px', borderRadius:7 }}>{order.order_number}</div>
      </div>

      {/* Date + Patient only — NO deliver date */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:8, marginBottom:12 }}>
        <Box label="Date" value={todayStr()} />
        <Box label="Patient Name" value={order.customer_name} />
      </div>

      {/* Frame table */}
      <div style={{ border:`2px solid ${navy}`, borderRadius:10, overflow:'hidden', marginBottom:10 }}>
        <div style={{ background:navy, color:gold, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', padding:'6px 14px' }}>Frame</div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['Frame Name','Type','Color','Material'].map(h=>(
                <th key={h} style={{ background:cream, padding:'6px 10px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:muted, border:`1px solid ${border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {[order.frame, order.frame_type, order.frame_color||'—', order.frame_material||'—'].map((v,i)=>(
                <td key={i} style={{ padding:'9px 10px', fontSize:13, fontWeight:700, color:navy, border:`1px solid ${border}`, background:'white' }}>{v||'—'}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Lens table */}
      <div style={{ border:`2px solid ${navy}`, borderRadius:10, overflow:'hidden', marginBottom:10 }}>
        <div style={{ background:navy, color:gold, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', padding:'6px 14px' }}>Lens</div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['Lens Type','Coating','Index'].map(h=>(
                <th key={h} style={{ background:cream, padding:'6px 10px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:muted, border:`1px solid ${border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {[order.lens_type, order.lens_coating, order.lens_index||'—'].map((v,i)=>(
                <td key={i} style={{ padding:'9px 10px', fontSize:13, fontWeight:700, color:navy, border:`1px solid ${border}`, background:'white' }}>{v||'—'}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Prescription */}
      <div style={{ border:`2px solid ${navy}`, borderRadius:10, overflow:'hidden', marginBottom:10 }}>
        <div style={{ background:navy, color:gold, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', padding:'6px 14px' }}>Prescription</div>
        <div style={{ padding:12, background:'white' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr>
                {['Eye','SPH','CYL','AXIS','ADD','VA'].map(h=>(
                  <th key={h} style={{ background:cream, padding:'7px 8px', textAlign:'center', fontSize:10, fontWeight:700, textTransform:'uppercase', border:`1px solid ${border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {eye:'Right (R)', sph:ref.r_sph, cyl:ref.r_cyl, axis:ref.r_axis, add:ref.r_add, va:ref.r_va},
                {eye:'Left (L)',  sph:ref.l_sph, cyl:ref.l_cyl, axis:ref.l_axis, add:ref.l_add, va:ref.l_va},
              ].map(row=>(
                <tr key={row.eye}>
                  <td style={{ background:cream, padding:'8px 10px', fontWeight:700, fontSize:13, border:`1px solid ${border}` }}>{row.eye}</td>
                  {[row.sph,row.cyl,row.axis,row.add,row.va].map((v,i)=>(
                    <td key={i} style={{ padding:'8px 8px', textAlign:'center', border:`1px solid ${border}`, fontSize:14, fontWeight:700, color:navy }}>{v||'—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {(ref.notes||ref.ref_notes) && (
            <div style={{ marginTop:8, fontSize:12, color:muted, fontStyle:'italic', background:'#fef9f0', borderRadius:6, padding:'6px 10px' }}>
              ⚠️ {ref.notes||ref.ref_notes}
            </div>
          )}
        </div>
      </div>

      {/* Measurements — PD and Seg Height as one combined table */}
      <div style={{ border:`2px solid ${navy}`, borderRadius:10, overflow:'hidden', marginBottom:12 }}>
        <div style={{ background:navy, color:gold, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', padding:'6px 14px' }}>Measurements</div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['','Right (R)','Left (L)'].map(h=>(
                <th key={h} style={{ background:cream, padding:'7px 12px', textAlign:'center', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.7px', color:muted, border:`1px solid ${border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ background:cream, padding:'10px 12px', fontWeight:700, fontSize:12, color:muted, border:`1px solid ${border}`, textTransform:'uppercase', letterSpacing:'.5px' }}>PD</td>
              <td style={{ padding:'10px 12px', textAlign:'center', border:`1px solid ${border}`, fontSize:16, fontWeight:700, color:navy, background:'white' }}>{ref.r_pd||'—'}</td>
              <td style={{ padding:'10px 12px', textAlign:'center', border:`1px solid ${border}`, fontSize:16, fontWeight:700, color:navy, background:'white' }}>{ref.l_pd||'—'}</td>
            </tr>
            <tr>
              <td style={{ background:cream, padding:'10px 12px', fontWeight:700, fontSize:12, color:muted, border:`1px solid ${border}`, textTransform:'uppercase', letterSpacing:'.5px' }}>Seg Height</td>
              <td style={{ padding:'10px 12px', textAlign:'center', border:`1px solid ${border}`, fontSize:16, fontWeight:700, color:navy, background:'white' }}>{order.seg_height_r||'—'}</td>
              <td style={{ padding:'10px 12px', textAlign:'center', border:`1px solid ${border}`, fontSize:16, fontWeight:700, color:navy, background:'white' }}>{order.seg_height_l||'—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Special instructions */}
      {order.notes && (
        <div style={{ border:`1.5px solid ${border}`, borderRadius:9, overflow:'hidden', marginBottom:10 }}>
          <div style={{ background:navy, color:gold, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', padding:'5px 12px' }}>Special Instructions</div>
          <div style={{ padding:'10px 14px', background:'white', fontSize:13, color:navy }}>{order.notes}</div>
        </div>
      )}

      <div style={{ borderTop:`2px solid ${navy}`, paddingTop:10, fontSize:11, color:muted, textAlign:'center' }}>
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
    { key:'advance', label:'🧾 Advance Bill' },
    { key:'balance', label:'✅ Balance Bill' },
    { key:'lab',     label:'🔬 Lab Job Card' },
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
            <button onClick={()=>{ injectPrint(); window.print(); }}
              style={{ padding:'7px 18px', background:gold, color:navy, border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              🖨️ Print
            </button>
            <button onClick={onClose}
              style={{ padding:'7px 14px', background:cream, color:muted, border:`1.5px solid ${border}`, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              ✕
            </button>
          </div>
        </div>

        <div id="ko-print-root" style={{ padding:'24px 28px', background:'white' }}>
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
