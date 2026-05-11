// ============================================================
//  QRStickers.js — QR sticker printer + working QR scanner
// ============================================================
import React, { useState, useRef, useEffect } from 'react';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280', success:'#2d7a4f', danger:'#c0392b' };

const qrUrl = (data, size=120) =>
  `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&margin=4`;

export const encodeItem = (item) => JSON.stringify({
  id:    item.id,
  name:  item.name,
  cat:   item.category,
  price: item.sell_price,
  color: item.frame_color   || '',
  type:  item.frame_type    || '',
  mat:   item.frame_material|| '',
  size:  item.frame_size    || '',
  brand: item.brand         || '',
  cost:  item.cost_price    || 0,
});

export const decodeQR = (raw) => {
  try { return JSON.parse(raw); } catch { return null; }
};

const STICKER_CSS = `
  @media print {
    body * { visibility: hidden !important; }
    #sticker-root, #sticker-root * { visibility: visible !important; }
    #sticker-root { position: fixed; inset: 0; z-index: 99999; background: white; padding: 5mm; }
    @page { margin: 5mm; size: A4; }
  }
`;

function Sticker({ item }) {
  const data  = encodeItem(item);
  const qr    = qrUrl(data, 100);
  const price = (n) => 'Rs.' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});

  const lines = [];
  if (item.brand)          lines.push(item.brand);
  if (item.frame_color)    lines.push(item.frame_color);
  if (item.frame_type)     lines.push(item.frame_type);
  if (item.frame_material) lines.push(item.frame_material);
  if (item.frame_size)     lines.push(item.frame_size);
  if (item.sg_type)        lines.push(item.sg_type);
  if (item.rg_power)       lines.push(item.rg_power);

  return (
    <div style={{ width:'48mm', height:'32mm', border:'1px solid #ccc', borderRadius:4, display:'flex', overflow:'hidden', fontFamily:"'DM Sans', Arial, sans-serif", background:'white', pageBreakInside:'avoid', margin:'2mm' }}>
      <div style={{ width:32, display:'flex', alignItems:'center', justifyContent:'center', background:'white', padding:2, flexShrink:0 }}>
        <img src={qr} alt="QR" style={{ width:28, height:28 }} crossOrigin="anonymous"/>
      </div>
      <div style={{ flex:1, padding:'3px 5px 3px 2px', display:'flex', flexDirection:'column', justifyContent:'space-between', overflow:'hidden' }}>
        <div>
          <div style={{ fontSize:5, color:'#999', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:1 }}>Kuruwita Optical</div>
          <div style={{ fontSize:7, fontWeight:700, color:'#000', lineHeight:1.2, marginBottom:2, wordBreak:'break-word' }}>
            {item.name?.length > 28 ? item.name.slice(0,28)+'…' : item.name}
          </div>
          <div style={{ fontSize:6, color:'#555', lineHeight:1.3 }}>{lines.slice(0,3).join(' · ')}</div>
        </div>
        <div style={{ fontSize:11, fontWeight:700, color:'#000', borderTop:'1px solid #eee', paddingTop:2, marginTop:2 }}>
          {price(item.sell_price)}
        </div>
      </div>
    </div>
  );
}

// ── Sticker modal ─────────────────────────────────────────────
export function StickerModal({ items, onClose }) {
  const handlePrint = () => {
    if (!document.getElementById('sticker-css')) {
      const s=document.createElement('style'); s.id='sticker-css'; s.textContent=STICKER_CSS; document.head.appendChild(s);
    }
    window.print();
  };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.6)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'24px 16px', fontFamily:"'DM Sans',sans-serif" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'white', borderRadius:14, width:'100%', maxWidth:680, boxShadow:'0 24px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:`1px solid ${C.border}` }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.navy }}>🏷️ Print QR Stickers</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{items.length} sticker{items.length!==1?'s':''} · 48×32mm</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handlePrint} style={{ padding:'8px 20px', background:C.gold, color:C.navy, border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>🖨️ Print</button>
            <button onClick={onClose} style={{ padding:'8px 14px', background:C.cream, color:C.muted, border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
          </div>
        </div>
        <div id="sticker-root" style={{ padding:20 }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:0 }}>
            {items.map(item=><Sticker key={item.id} item={item}/>)}
          </div>
        </div>
        <div style={{ padding:'10px 20px', borderTop:`1px solid ${C.border}`, fontSize:12, color:C.muted }}>
          💡 Scan these QR codes in New Order or Quick Sale to auto-fill frame details
        </div>
      </div>
    </div>
  );
}

// ── QR Scanner modal ──────────────────────────────────────────
export function QRScanner({ onScan, onClose, title = 'Scan Frame QR Code' }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const animRef    = useRef(null);
  const scannedRef = useRef(false);

  const [status,  setStatus]  = useState('starting'); // starting | scanning | error
  const [error,   setError]   = useState('');
  const [jsqrReady, setJsqrReady] = useState(false);

  // Load jsQR
  useEffect(()=>{
    if (window.jsQR) { setJsqrReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
    s.onload = () => setJsqrReady(true);
    s.onerror = () => setError('Could not load QR scanner library');
    document.head.appendChild(s);
  },[]);

  // Start camera once jsQR is ready
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
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animRef.current = requestAnimationFrame(scan); return;
      }
      const ctx = canvas.getContext('2d');
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = window.jsQR?.(imgData.data, imgData.width, imgData.height, { inversionAttempts:'dontInvert' });
      if (code?.data) {
        scannedRef.current = true;
        stopCamera();
        const item = decodeQR(code.data);
        if (item) { onScan(item); }
        else { setError('Not a valid frame sticker. Try scanning again.'); scannedRef.current=false; startCamera(); }
        return;
      }
      animRef.current = requestAnimationFrame(scan);
    };
    animRef.current = requestAnimationFrame(scan);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.85)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget){ stopCamera(); onClose(); } }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:400, overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,.4)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.navy }}>📷 {title}</div>
          <button onClick={()=>{ stopCamera(); onClose(); }} style={{ background:C.cream, border:'none', borderRadius:7, padding:'5px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted, fontWeight:600 }}>✕ Close</button>
        </div>

        {/* Camera view */}
        <div style={{ position:'relative', background:'#000', aspectRatio:'4/3', overflow:'hidden' }}>
          <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'cover' }} playsInline muted/>
          <canvas ref={canvasRef} style={{ display:'none' }}/>

          {/* Scan overlay */}
          {status==='scanning' && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
              <div style={{ width:200, height:200, position:'relative' }}>
                {/* Corner brackets */}
                {[[0,0],[0,1],[1,0],[1,1]].map(([r,c],i)=>(
                  <div key={i} style={{ position:'absolute', top:r===0?0:undefined, bottom:r===1?0:undefined, left:c===0?0:undefined, right:c===1?0:undefined, width:24, height:24, borderTop:r===0?`3px solid ${C.gold}`:undefined, borderBottom:r===1?`3px solid ${C.gold}`:undefined, borderLeft:c===0?`3px solid ${C.gold}`:undefined, borderRight:c===1?`3px solid ${C.gold}`:undefined, borderRadius:r===0&&c===0?'6px 0 0 0':r===0&&c===1?'0 6px 0 0':r===1&&c===0?'0 0 0 6px':'0 0 6px 0' }}/>
                ))}
                {/* Scan line animation */}
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
                Point camera at a frame sticker QR code
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
