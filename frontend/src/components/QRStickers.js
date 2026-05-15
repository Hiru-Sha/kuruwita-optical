/* eslint-disable */
// ============================================================
//  QRStickers.js
//  A4 sticker sheet — quantity-based, cut guides for scissors
//  Sticker size: 63.5mm × 38.1mm (standard A4 label size)
//  Per A4 sheet: 3 columns × 7 rows = 21 stickers
// ============================================================
import React, { useState, useRef } from 'react';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b' };

const qrUrl = (data, size=80) =>
  `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&margin=2`;

const encodeItem = (item) => JSON.stringify({
  id: item.id, name: item.name, cat: item.category,
  price: item.sell_price, color: item.frame_color||'',
  type: item.frame_type||'', brand: item.brand||'',
});

export const decodeQR = (raw) => { try { return JSON.parse(raw); } catch { return null; } };

// ── Single sticker — fits 63.5mm × 38.1mm ────────────────────
function Sticker({ item, index }) {
  const qr   = qrUrl(encodeItem(item));
  const fmt  = (n) => 'Rs.' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});

  const lines = [];
  if (item.brand)          lines.push(item.brand);
  if (item.frame_color)    lines.push(item.frame_color);
  if (item.frame_type)     lines.push(item.frame_type);
  if (item.sg_type)        lines.push(item.sg_type);
  if (item.rg_power)       lines.push(item.rg_power);
  if (item.frame_material) lines.push(item.frame_material);

  return (
    <div style={{
      width: '63.5mm', height: '38.1mm',
      display: 'flex', overflow: 'hidden',
      fontFamily: 'Arial, sans-serif',
      background: 'white',
      boxSizing: 'border-box',
      pageBreakInside: 'avoid',
      position: 'relative',
    }}>
      {/* Cut guide dashes — will show as dotted border in print */}
      <div style={{
        position:'absolute', inset:0,
        border: '0.3mm dashed #ccc',
        pointerEvents:'none',
        boxSizing:'border-box',
      }}/>

      {/* QR code */}
      <div style={{ width:'36mm', display:'flex', alignItems:'center', justifyContent:'center', padding:'3mm', flexShrink:0 }}>
        <img src={qr} alt="QR" style={{ width:'28mm', height:'28mm' }} crossOrigin="anonymous"/>
      </div>

      {/* Info */}
      <div style={{ flex:1, padding:'3mm 3mm 3mm 0', display:'flex', flexDirection:'column', justifyContent:'space-between', overflow:'hidden' }}>
        <div>
          <div style={{ fontSize:'5pt', color:'#999', textTransform:'uppercase', letterSpacing:'0.5pt', marginBottom:'1mm' }}>
            Wickramakalutota Opticals
          </div>
          <div style={{ fontSize:'8pt', fontWeight:'bold', color:'#0f1f3d', lineHeight:1.2, marginBottom:'1mm',
            overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
            {item.name}
          </div>
          <div style={{ fontSize:'6pt', color:'#555', lineHeight:1.4 }}>
            {lines.slice(0,2).join(' · ')}
          </div>
        </div>
        <div style={{ fontSize:'11pt', fontWeight:'bold', color:'#0f1f3d', marginTop:'1mm' }}>
          {fmt(item.sell_price)}
        </div>
      </div>
    </div>
  );
}

// ── STICKER SHEET MODAL ──────────────────────────────────────
export function StickerModal({ items, onClose }) {
  const sheetRef = useRef();
  // Expand items by quantity — 3 Black frames means 3 stickers
  const expanded = items.flatMap(item => {
    const qty = Math.max(1, parseInt(item.quantity)||1);
    return Array(qty).fill(item);
  });

  const handlePrint = () => {
    const style = document.createElement('style');
    style.id = 'ko-sticker-print';
    style.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 5mm; }
        body > * { display: none !important; }
        #ko-sticker-sheet { display: block !important; }
      }
    `;
    if (!document.getElementById('ko-sticker-print')) document.head.appendChild(style);

    // Create a full-screen print div
    const printDiv = document.createElement('div');
    printDiv.id = 'ko-sticker-sheet';
    printDiv.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      background:white; z-index:99999; display:none;
    `;
    printDiv.innerHTML = sheetRef.current.innerHTML;
    document.body.appendChild(printDiv);

    window.print();
    setTimeout(() => {
      document.body.removeChild(printDiv);
    }, 500);
  };

  // A4 sheet: 3 cols × 7 rows = 21 per page
  const COLS = 3;
  const pages = [];
  for (let i = 0; i < expanded.length; i += 21) {
    pages.push(expanded.slice(i, i + 21));
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.6)', zIndex:1000,
      display:'flex', alignItems:'flex-start', justifyContent:'center',
      overflowY:'auto', padding:'24px 16px', fontFamily:"'DM Sans',sans-serif" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>

      <div style={{ background:'white', borderRadius:14, width:'100%', maxWidth:760,
        boxShadow:'0 24px 60px rgba(0,0,0,.3)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 20px', borderBottom:`1px solid ${C.border}` }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.navy }}>
              🏷️ Print QR Stickers — A4 Sheet
            </div>
            <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>
              {expanded.length} sticker{expanded.length!==1?'s':''} across {pages.length} A4 page{pages.length!==1?'s':''} ·
              3 columns × 7 rows · 63.5mm × 38.1mm each · dotted cut guides
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handlePrint}
              style={{ padding:'8px 20px', background:C.gold, color:C.navy, border:'none',
                borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              🖨️ Print
            </button>
            <button onClick={onClose}
              style={{ padding:'8px 14px', background:C.cream, color:C.muted,
                border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13,
                fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              ✕
            </button>
          </div>
        </div>

        {/* Sticker count per item */}
        <div style={{ padding:'12px 20px', background:C.cream, borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.navy, marginBottom:8 }}>Stickers to print:</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {items.map(item=>(
              <div key={item.id} style={{ background:'white', border:`1px solid ${C.border}`,
                borderRadius:8, padding:'5px 12px', fontSize:12, color:C.navy }}>
                {item.name} ×<b>{Math.max(1,parseInt(item.quantity)||1)}</b>
              </div>
            ))}
          </div>
        </div>

        {/* Preview — shows actual A4 layout */}
        <div style={{ padding:20, maxHeight:600, overflowY:'auto' }}>
          <div ref={sheetRef}>
            {pages.map((pageItems, pi)=>(
              <div key={pi} style={{
                width:'210mm',
                // 7 rows × 38.1mm + margins
                minHeight:'270mm',
                margin:'0 auto 10mm',
                padding:'5mm',
                background:'white',
                boxShadow:'0 2px 8px rgba(0,0,0,.1)',
                boxSizing:'border-box',
                pageBreakAfter:'always',
              }}>
                {/* Page label (only in preview, hidden when printing) */}
                <div className="no-print" style={{ fontSize:10, color:C.muted, marginBottom:4, textAlign:'center' }}>
                  Page {pi+1} — {pageItems.length} sticker{pageItems.length!==1?'s':''}
                </div>
                {/* Grid — 3 columns */}
                <div style={{
                  display:'grid',
                  gridTemplateColumns:'repeat(3, 63.5mm)',
                  gap:'0mm',
                  width:'190.5mm',
                  margin:'0 auto',
                }}>
                  {pageItems.map((item, i)=>(
                    <Sticker key={`${item.id}-${i}`} item={item} index={i}/>
                  ))}
                  {/* Fill empty cells so grid is complete */}
                  {Array(21 - pageItems.length).fill(null).map((_,i)=>(
                    <div key={`empty-${i}`} style={{
                      width:'63.5mm', height:'38.1mm',
                      border:'0.3mm dashed #eee', boxSizing:'border-box',
                    }}/>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:'10px 20px', borderTop:`1px solid ${C.border}`, fontSize:12, color:C.muted }}>
          💡 Use scissors along the dotted lines to cut stickers. Scan QR codes to instantly add items in New Order or Quick Sale.
        </div>
      </div>
    </div>
  );
}

// ── QR SCANNER MODAL ─────────────────────────────────────────
export function QRScanner({ onScan, onClose, title='Scan Frame QR Code' }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);
  const [scanned, setScanned] = useState(false);

  React.useEffect(() => { startCamera(); return () => stopCamera(); }, []);

  const startCamera = async () => {
    setLoading(true); setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:'environment', width:{ideal:1280}, height:{ideal:720} }
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject=stream; videoRef.current.play(); }
      setLoading(false);
      startScanning();
    } catch(e) {
      setError('Camera not available. Please allow camera access.');
      setLoading(false);
    }
  };

  const stopCamera = () => { streamRef.current?.getTracks().forEach(t=>t.stop()); };

  const startScanning = async () => {
    if ('BarcodeDetector' in window) {
      const detector = new window.BarcodeDetector({ formats:['qr_code'] });
      const scan = async () => {
        if (!videoRef.current || scanned) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length>0) { handleScan(codes[0].rawValue); return; }
        } catch {}
        setTimeout(scan, 300);
      };
      setTimeout(scan, 500);
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
      script.onload = () => {
        const canvas=document.createElement('canvas'), ctx=canvas.getContext('2d');
        const scan=()=>{
          if(!videoRef.current||scanned) return;
          const v=videoRef.current;
          if(v.readyState===v.HAVE_ENOUGH_DATA){
            canvas.width=v.videoWidth; canvas.height=v.videoHeight;
            ctx.drawImage(v,0,0,canvas.width,canvas.height);
            const d=ctx.getImageData(0,0,canvas.width,canvas.height);
            const code=window.jsQR?.(d.data,d.width,d.height);
            if(code){handleScan(code.data);return;}
          }
          requestAnimationFrame(scan);
        };
        scan();
      };
      document.head.appendChild(script);
    }
  };

  const handleScan = (raw) => {
    if (scanned) return;
    setScanned(true);
    const item = decodeQR(raw);
    if (item) { stopCamera(); onScan(item); }
    else { setError('Invalid QR code.'); setScanned(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.8)', zIndex:2000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget){stopCamera();onClose();} }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:420, overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,.4)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.navy }}>📷 {title}</div>
          <button onClick={()=>{stopCamera();onClose();}} style={{ background:C.cream, border:'none', borderRadius:7, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted, fontWeight:600 }}>✕ Close</button>
        </div>
        <div style={{ position:'relative', background:'#000', aspectRatio:'4/3' }}>
          <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'cover' }} playsInline muted/>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <div style={{ width:200, height:200, border:'2px solid rgba(201,168,76,.8)', borderRadius:12, boxShadow:'0 0 0 2000px rgba(0,0,0,.3)' }}/>
          </div>
          {loading&&<div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.5)', color:'white', fontSize:14 }}>Starting camera...</div>}
        </div>
        <div style={{ padding:'14px 18px' }}>
          {error
            ?<div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:12 }}>⚠️ {error}</div>
            :<div style={{ background:C.cream, borderRadius:8, padding:'10px 14px', fontSize:13, color:C.muted, marginBottom:12, textAlign:'center' }}>Point camera at a frame QR sticker</div>
          }
          <div style={{ fontSize:12, color:C.muted, textAlign:'center' }}>💡 Hold steady for 1–2 seconds in good lighting.</div>
        </div>
      </div>
    </div>
  );
}
