// ============================================================
//  QRStickers.js — 3×2cm fold-over sticker
//  Folds in half: LEFT side = frame details + price (visible)
//                 RIGHT side = QR code (hidden inside fold)
//  Total sticker: 6×2cm printed, fold at centre = 3×2cm each side
//  Attaches to frame arm by folding over it
// ============================================================
import React, { useState, useRef, useEffect } from 'react';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b' };

const qrUrl = (data, size=120) =>
  `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&margin=2`;

export const encodeItem = (item) => JSON.stringify({
  id:    item.id,
  name:  item.name,
  cat:   item.category,
  price: item.sell_price,
  color: item.frame_color    || '',
  type:  item.frame_type     || '',
  mat:   item.frame_material || '',
  size:  item.frame_size     || '',
  brand: item.brand          || '',
  cost:  item.cost_price     || 0,
});

export const decodeQR = (raw) => {
  try { return JSON.parse(raw); } catch { return null; }
};

// ── Print CSS — sticker sheet ─────────────────────────────────
const STICKER_PRINT_CSS = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 5mm;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      height: auto !important;
    }
    body > * {
      display: none !important;
    }
    #sticker-root {
      display: block !important;
      position: static !important;
      width: 100% !important;
    }
    #sticker-root * {
      visibility: visible !important;
    }
  }
`;

// ── Single fold-over sticker ──────────────────────────────────
// Printed size: 60mm × 20mm total
// Left 30mm: frame details + price (faces outward when folded)
// Right 30mm: QR code (faces outward on other side when folded)
// Fold line: dashed down the centre at 30mm
function Sticker({ item }) {
  const data  = encodeItem(item);
  const qr    = qrUrl(data, 80);
  const price = (n) => 'Rs.' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});

  // Build short detail lines
  const lines = [
    item.brand          ? item.brand           : null,
    item.frame_color    ? item.frame_color      : null,
    item.frame_type     ? item.frame_type       : null,
    item.frame_size     ? item.frame_size       : null,
    item.sg_type        ? item.sg_type          : null,
    item.rg_power       ? item.rg_power         : null,
  ].filter(Boolean);

  return (
    <div style={{
      width: '60mm', height: '20mm',
      display: 'flex',
      fontFamily: 'Arial, sans-serif',
      border: '0.5px solid #aaa',
      borderRadius: 2,
      overflow: 'hidden',
      pageBreakInside: 'avoid',
      margin: '1.5mm',
      background: 'white',
    }}>

      {/* ── LEFT SIDE: Details + Price (30mm × 20mm) ── */}
      <div style={{
        width: '30mm', height: '20mm',
        padding: '1.5mm 2mm',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRight: '0.5px dashed #999',  // fold guide
        background: 'white',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}>
        {/* Shop name */}
        <div style={{ fontSize: '5pt', color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '0.5mm' }}>
          Kuruwita Optical
        </div>

        {/* Item name */}
        <div style={{ fontSize: '6.5pt', fontWeight: 700, color: '#000', lineHeight: 1.2, marginBottom: '0.5mm', overflow: 'hidden', wordBreak: 'break-word' }}>
          {item.name?.length > 22 ? item.name.slice(0,22)+'…' : item.name}
        </div>

        {/* Details */}
        <div style={{ fontSize: '5.5pt', color: '#444', lineHeight: 1.3, flex: 1 }}>
          {lines.slice(0,3).join(' · ')}
        </div>

        {/* Price — prominent */}
        <div style={{
          fontSize: '9pt',
          fontWeight: 700,
          color: '#000',
          borderTop: '0.5px solid #ddd',
          paddingTop: '1mm',
          marginTop: '1mm',
        }}>
          {price(item.sell_price)}
        </div>
      </div>

      {/* ── RIGHT SIDE: QR code (30mm × 20mm) ── */}
      <div style={{
        width: '30mm', height: '20mm',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'white',
        boxSizing: 'border-box',
        padding: '1mm',
        gap: '0.5mm',
      }}>
        <img
          src={qr}
          alt="QR"
          crossOrigin="anonymous"
          style={{ width: '16mm', height: '16mm', display: 'block' }}
        />
        <div style={{ fontSize: '4pt', color: '#888', textAlign: 'center', lineHeight: 1.2 }}>
          Scan to add to order
        </div>
      </div>
    </div>
  );
}

// ── Fold guide instructions ───────────────────────────────────
function FoldGuide() {
  return (
    <div style={{ fontSize: '7pt', color: '#888', margin: '3mm 1.5mm 2mm', lineHeight: 1.6, fontFamily: 'Arial, sans-serif' }}>
      ✂️ Cut each sticker. Fold at the dashed line. Slip over the frame arm so both sides show.
      Left side (details+price) faces out · Right side (QR) faces out on reverse.
    </div>
  );
}

// ── Sticker modal ─────────────────────────────────────────────
export function StickerModal({ items, onClose }) {
  const handlePrint = () => {
    let style = document.getElementById('sticker-print-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'sticker-print-css';
      document.head.appendChild(style);
    }
    style.textContent = STICKER_PRINT_CSS;
    window.print();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.6)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'24px 16px', fontFamily:"'DM Sans',sans-serif" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:14, width:'100%', maxWidth:700, boxShadow:'0 24px 60px rgba(0,0,0,.3)' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:`1px solid ${C.border}` }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.navy }}>🏷️ Print Frame Stickers</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>
              {items.length} sticker{items.length!==1?'s':''} · 3×2cm per side · fold-over design for frame arms
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handlePrint}
              style={{ padding:'8px 20px', background:C.gold, color:C.navy, border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              🖨️ Print Stickers
            </button>
            <button onClick={onClose}
              style={{ padding:'8px 14px', background:C.cream, color:C.muted, border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              ✕
            </button>
          </div>
        </div>

        {/* How it works */}
        <div style={{ padding:'12px 20px', background:'#f0f9ff', borderBottom:`1px solid ${C.border}`, fontSize:13, color:'#0369a1' }}>
          <b>How to use:</b> Print on sticker paper → cut each strip → fold at the dashed line → slip over the frame arm.
          The <b>left side</b> shows frame name, details and price. The <b>right side</b> shows the QR code for scanning.
        </div>

        {/* Sticker preview */}
        <div id="sticker-root" style={{ padding:'10px 16px' }}>
          <FoldGuide/>
          <div style={{ display:'flex', flexWrap:'wrap', gap:0 }}>
            {items.map(item => <Sticker key={item.id} item={item}/>)}
          </div>
        </div>

        <div style={{ padding:'10px 20px', borderTop:`1px solid ${C.border}`, fontSize:12, color:C.muted }}>
          💡 Use <b>Label paper</b> (A4 sticker sheets) for best results. Print at 100% scale, no fit-to-page.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  QR SCANNER
// ═══════════════════════════════════════════════════════════════
export function QRScanner({ onScan, onClose, title = 'Scan Frame QR Code' }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const animRef    = useRef(null);
  const scannedRef = useRef(false);
  const [status,   setStatus]   = useState('starting');
  const [error,    setError]    = useState('');
  const [jsqrReady,setJsqrReady]= useState(false);

  useEffect(()=>{
    if (window.jsQR) { setJsqrReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
    s.onload = () => setJsqrReady(true);
    s.onerror = () => setError('Could not load QR library');
    document.head.appendChild(s);
  },[]);

  useEffect(()=>{
    if (!jsqrReady) return;
    startCamera();
    return stopCamera;
  },[jsqrReady]);

  const startCamera = async () => {
    setStatus('starting'); setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:'environment', width:{ideal:1280}, height:{ideal:720} }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('scanning');
        startScan();
      }
    } catch(e) {
      setError('Camera not available. Please allow camera access.');
      setStatus('error');
    }
  };

  const stopCamera = () => {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t=>t.stop());
  };

  const startScan = () => {
    const scan = () => {
      if (scannedRef.current) return;
      const video=videoRef.current, canvas=canvasRef.current;
      if (!video||!canvas||video.readyState!==video.HAVE_ENOUGH_DATA) {
        animRef.current=requestAnimationFrame(scan); return;
      }
      const ctx=canvas.getContext('2d');
      canvas.width=video.videoWidth; canvas.height=video.videoHeight;
      ctx.drawImage(video,0,0);
      const imgData=ctx.getImageData(0,0,canvas.width,canvas.height);
      const code=window.jsQR?.(imgData.data,imgData.width,imgData.height,{inversionAttempts:'dontInvert'});
      if (code?.data) {
        scannedRef.current=true;
        stopCamera();
        const item=decodeQR(code.data);
        if (item) { onScan(item); }
        else { setError('Not a valid frame sticker. Try again.'); scannedRef.current=false; startCamera(); }
        return;
      }
      animRef.current=requestAnimationFrame(scan);
    };
    animRef.current=requestAnimationFrame(scan);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.85)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget){ stopCamera(); onClose(); } }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:400, overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,.4)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.navy }}>📷 {title}</div>
          <button onClick={()=>{ stopCamera(); onClose(); }} style={{ background:C.cream, border:'none', borderRadius:7, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted, fontWeight:600 }}>✕ Close</button>
        </div>

        <div style={{ position:'relative', background:'#000', aspectRatio:'4/3', overflow:'hidden' }}>
          <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'cover' }} playsInline muted/>
          <canvas ref={canvasRef} style={{ display:'none' }}/>
          {status==='scanning' && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
              <div style={{ width:180, height:180, position:'relative' }}>
                {[[0,0],[0,1],[1,0],[1,1]].map(([r,c],i)=>(
                  <div key={i} style={{ position:'absolute', top:r===0?0:undefined, bottom:r===1?0:undefined, left:c===0?0:undefined, right:c===1?0:undefined, width:22, height:22, borderTop:r===0?`3px solid ${C.gold}`:undefined, borderBottom:r===1?`3px solid ${C.gold}`:undefined, borderLeft:c===0?`3px solid ${C.gold}`:undefined, borderRight:c===1?`3px solid ${C.gold}`:undefined, borderRadius:r===0&&c===0?'5px 0 0 0':r===0&&c===1?'0 5px 0 0':r===1&&c===0?'0 0 0 5px':'0 0 5px 0' }}/>
                ))}
                <div style={{ position:'absolute', left:0, right:0, height:2, background:C.gold, opacity:.8, animation:'scanline 2s linear infinite' }}/>
              </div>
            </div>
          )}
          {status==='starting' && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.5)', color:'white', fontSize:14 }}>
              Starting camera...
            </div>
          )}
        </div>

        <style>{`@keyframes scanline { 0%{top:10%} 50%{top:85%} 100%{top:10%} }`}</style>

        <div style={{ padding:'14px 18px' }}>
          {error
            ? <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:10 }}>
                ⚠️ {error}
                <button onClick={()=>{ scannedRef.current=false; setError(''); startCamera(); }} style={{ marginLeft:10, background:'none', border:`1px solid ${C.danger}`, borderRadius:5, padding:'2px 8px', fontSize:11, cursor:'pointer', fontFamily:'inherit', color:C.danger }}>Retry</button>
              </div>
            : <div style={{ background:C.cream, borderRadius:8, padding:'10px 14px', fontSize:13, color:C.muted, textAlign:'center' }}>
                Point camera at the QR code on the sticker
              </div>
          }
          <div style={{ fontSize:11, color:C.muted, textAlign:'center', marginTop:8 }}>
            💡 Good lighting helps. Hold steady for 1–2 seconds.
          </div>
        </div>
      </div>
    </div>
  );
}
