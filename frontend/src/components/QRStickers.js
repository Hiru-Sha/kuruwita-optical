// ============================================================
//  QRStickers.js — Print QR stickers for inventory items
//  + QR Scanner modal for New Order & Quick Sale
// ============================================================
import React, { useState, useRef, useEffect } from 'react';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b' };

// ── Generate QR code URL using free QR API ────────────────────
const qrUrl = (data, size=120) =>
  `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&margin=4`;

// ── Encode item data into QR ──────────────────────────────────
const encodeItem = (item) => JSON.stringify({
  id:    item.id,
  name:  item.name,
  cat:   item.category,
  price: item.sell_price,
  color: item.frame_color  || '',
  type:  item.frame_type   || '',
  mat:   item.frame_material || '',
  size:  item.frame_size   || '',
  brand: item.brand        || '',
});

// ── Decode scanned QR data ───────────────────────────────────
export const decodeQR = (raw) => {
  try { return JSON.parse(raw); }
  catch { return null; }
};

// ── STICKER PRINT STYLES ─────────────────────────────────────
const STICKER_CSS = `
  @media print {
    body * { visibility: hidden !important; }
    #sticker-root, #sticker-root * { visibility: visible !important; }
    #sticker-root { position: fixed; inset: 0; z-index: 99999; background: white; }
    @page { margin: 5mm; size: A4; }
  }
`;

// ── Single sticker ───────────────────────────────────────────
function Sticker({ item }) {
  const data     = encodeItem(item);
  const qr       = qrUrl(data, 100);
  const fmtPrice = (n) => 'Rs.' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});

  // Build display lines based on category
  const lines = [];
  if (item.brand)           lines.push(item.brand);
  if (item.frame_color)     lines.push(item.frame_color);
  if (item.frame_type)      lines.push(item.frame_type);
  if (item.frame_material)  lines.push(item.frame_material);
  if (item.frame_size)      lines.push(item.frame_size);
  if (item.sg_type)         lines.push(item.sg_type);
  if (item.rg_power)        lines.push(item.rg_power);

  return (
    <div style={{
      width: '48mm', height: '32mm',
      border: '1px solid #ccc',
      borderRadius: 4,
      display: 'flex',
      overflow: 'hidden',
      fontFamily: "'DM Sans', Arial, sans-serif",
      background: 'white',
      pageBreakInside: 'avoid',
      margin: '2mm',
    }}>
      {/* QR code */}
      <div style={{ width: 32, display:'flex', alignItems:'center', justifyContent:'center', background:'white', padding:2, flexShrink:0 }}>
        <img src={qr} alt="QR" style={{ width:28, height:28 }} crossOrigin="anonymous"/>
      </div>

      {/* Item info */}
      <div style={{ flex:1, padding:'3px 5px 3px 2px', display:'flex', flexDirection:'column', justifyContent:'space-between', overflow:'hidden' }}>
        <div>
          {/* Shop name tiny */}
          <div style={{ fontSize:5, color:'#999', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:1 }}>Kuruwita Optical</div>
          {/* Item name */}
          <div style={{ fontSize:7, fontWeight:700, color:'#000', lineHeight:1.2, marginBottom:2, wordBreak:'break-word' }}>
            {item.name?.length > 28 ? item.name.slice(0,28)+'…' : item.name}
          </div>
          {/* Details */}
          <div style={{ fontSize:6, color:'#555', lineHeight:1.3 }}>
            {lines.slice(0,3).join(' · ')}
          </div>
        </div>
        {/* Price — big and bold */}
        <div style={{ fontSize:11, fontWeight:700, color:'#000', borderTop:'1px solid #eee', paddingTop:2, marginTop:2 }}>
          {fmtPrice(item.sell_price)}
        </div>
      </div>
    </div>
  );
}

// ── STICKER SHEET MODAL ──────────────────────────────────────
export function StickerModal({ items, onClose }) {
  const printRef = useRef();

  const handlePrint = () => {
    if (!document.getElementById('sticker-css')) {
      const s = document.createElement('style'); s.id='sticker-css'; s.textContent=STICKER_CSS; document.head.appendChild(s);
    }
    window.print();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.6)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'24px 16px', fontFamily:"'DM Sans',sans-serif" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:14, width:'100%', maxWidth:680, boxShadow:'0 24px 60px rgba(0,0,0,.3)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:`1px solid ${C.border}` }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.navy }}>🏷️ Print QR Stickers</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{items.length} sticker{items.length!==1?'s':''} · 48mm × 32mm · fits on standard label sheets</div>
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

        {/* Sticker preview */}
        <div id="sticker-root" ref={printRef} style={{ padding:20 }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:0 }}>
            {items.map(item => (
              <Sticker key={item.id} item={item}/>
            ))}
          </div>
        </div>

        <div style={{ padding:'10px 20px', borderTop:`1px solid ${C.border}`, fontSize:12, color:C.muted }}>
          💡 Tip: Scan these QR codes with your phone camera in New Order or Quick Sale to instantly add the frame
        </div>
      </div>
    </div>
  );
}

// ── QR SCANNER MODAL ─────────────────────────────────────────
// Uses device camera to scan QR codes
export function QRScanner({ onScan, onClose, title = 'Scan Frame QR Code' }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setLoading(true); setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width:{ ideal:1280 }, height:{ ideal:720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setLoading(false);
      startScanning();
    } catch (e) {
      setError('Camera not available. Please allow camera access and try again.');
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  // Use BarcodeDetector API if available, fallback to canvas + jsQR
  const startScanning = async () => {
    if ('BarcodeDetector' in window) {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const scan = async () => {
        if (!videoRef.current || scanned) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            handleScan(codes[0].rawValue);
            return;
          }
        } catch {}
        setTimeout(scan, 300);
      };
      setTimeout(scan, 500);
    } else {
      // Fallback: load jsQR dynamically
      try {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
        script.onload = () => startCanvasScan();
        document.head.appendChild(script);
      } catch {
        setError('QR scanning not supported on this browser. Try Chrome or Safari.');
      }
    }
  };

  const startCanvasScan = () => {
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');
    const scan   = () => {
      if (!videoRef.current || scanned) return;
      const v = videoRef.current;
      if (v.readyState === v.HAVE_ENOUGH_DATA) {
        canvas.width  = v.videoWidth;
        canvas.height = v.videoHeight;
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR?.(imageData.data, imageData.width, imageData.height);
        if (code) { handleScan(code.data); return; }
      }
      requestAnimationFrame(scan);
    };
    scan();
  };

  const handleScan = (rawValue) => {
    if (scanned) return;
    setScanned(true);
    const item = decodeQR(rawValue);
    if (item) {
      stopCamera();
      onScan(item);
    } else {
      setError('Invalid QR code — not a Kuruwita Optical item sticker.');
      setScanned(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.8)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget){ stopCamera(); onClose(); } }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:420, overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,.4)' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.navy }}>📷 {title}</div>
          <button onClick={()=>{ stopCamera(); onClose(); }} style={{ background:C.cream, border:'none', borderRadius:7, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted, fontWeight:600 }}>✕ Close</button>
        </div>

        <div style={{ position:'relative', background:'#000', aspectRatio:'4/3' }}>
          <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'cover' }} playsInline muted/>
          {/* Scan frame overlay */}
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <div style={{ width:200, height:200, border:'2px solid rgba(201,168,76,.8)', borderRadius:12, boxShadow:'0 0 0 2000px rgba(0,0,0,.3)', position:'relative' }}>
              {/* Corner indicators */}
              {[['0,0','border-top-left-radius'],['0,auto','border-top-right-radius'],['auto,0','border-bottom-left-radius'],['auto,auto','border-bottom-right-radius']].map(([pos],i) => (
                <div key={i} style={{ position:'absolute', top:i<2?-2:undefined, bottom:i>=2?-2:undefined, left:i%2===0?-2:undefined, right:i%2===1?-2:undefined, width:20, height:20, border:`3px solid ${C.gold}`, borderRadius:[i===0?'8px 0 0 0':i===1?'0 8px 0 0':i===2?'0 0 0 8px':'0 0 8px 0'][0] }}/>
              ))}
            </div>
          </div>
          {loading && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.5)', color:'white', fontSize:14 }}>
              Starting camera...
            </div>
          )}
        </div>

        <div style={{ padding:'14px 18px' }}>
          {error
            ? <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:C.danger, borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:12 }}>⚠️ {error}</div>
            : <div style={{ background:C.cream, borderRadius:8, padding:'10px 14px', fontSize:13, color:C.muted, marginBottom:12, textAlign:'center' }}>
                Point your camera at a frame sticker QR code
              </div>
          }
          <div style={{ fontSize:12, color:C.muted, textAlign:'center' }}>
            💡 Works best in good lighting. Hold steady for 1–2 seconds.
          </div>
        </div>
      </div>
    </div>
  );
}
