/* eslint-disable */
import React, { useRef, useState, useEffect } from 'react';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280' };

// ── Load qrcode.js once ───────────────────────────────────────
let qrLibPromise = null;
function loadQRLib() {
  if (qrLibPromise) return qrLibPromise;
  qrLibPromise = new Promise((resolve) => {
    if (window.QRCode) return resolve(window.QRCode);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload  = () => resolve(window.QRCode);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return qrLibPromise;
}

// ── Generate QR data URL completely off-screen ────────────────
function generateQRDataURL(text) {
  return new Promise((resolve) => {
    loadQRLib().then(QRCode => {
      if (!QRCode) return resolve(null);
      // Use a detached div — never added to document
      const div = document.createElement('div');
      try {
        new QRCode(div, {
          text,
          width:  160,
          height: 160,
          colorDark:  '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M,
        });
        // QRCode renders a canvas inside div
        setTimeout(() => {
          const canvas = div.querySelector('canvas');
          if (canvas) {
            resolve(canvas.toDataURL('image/png'));
          } else {
            // QRCode might render an img instead
            const img = div.querySelector('img');
            resolve(img ? img.src : null);
          }
        }, 100);
      } catch(e) {
        resolve(null);
      }
    });
  });
}

export const decodeQR = (raw) => { try { return JSON.parse(raw); } catch { return null; } };

const encodeItem = (item) => JSON.stringify({
  id:    item.id,
  name:  item.name,
  price: item.sell_price,
  color: item.frame_color || '',
  brand: item.brand || '',
});

// ── Sticker — uses img with dataURL, zero DOM manipulation ────
function Sticker({ item, onReady }) {
  const [qrSrc, setQrSrc] = useState(null);
  const text = encodeItem(item);
  const fmt  = (n) => 'Rs.' + parseFloat(n||0).toLocaleString('en-LK', { minimumFractionDigits:0 });
  const line1 = [item.brand, item.frame_color].filter(Boolean).join(' · ');
  const line2 = [item.frame_type, item.sg_type, item.rg_power].filter(Boolean).join(' · ');

  useEffect(() => {
    generateQRDataURL(text).then(dataUrl => {
      setQrSrc(dataUrl);
      if (onReady) onReady();
    });
  }, [text]);

  return (
    <div style={{
      width: '50mm', height: '25mm',
      display: 'flex', overflow: 'hidden',
      fontFamily: 'Arial, sans-serif',
      background: 'white', boxSizing: 'border-box',
      pageBreakInside: 'avoid',
      border: '0.4mm dashed #bbb',
    }}>
      {/* LEFT — QR */}
      <div style={{
        width: '25mm', height: '25mm', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        borderRight: '0.5mm solid #000',
        padding: '1mm', boxSizing: 'border-box',
        position: 'relative',
      }}>
        <div style={{ position:'absolute', top:'1mm', fontSize:'3.5pt', color:'#999', letterSpacing:'.3pt' }}>
          ◀ FOLD
        </div>
        {qrSrc
          ? <img src={qrSrc} alt="QR" style={{ width:'18mm', height:'18mm', marginTop:'2mm' }}/>
          : <div style={{ width:'18mm', height:'18mm', background:'#f3f4f6', marginTop:'2mm',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'5pt', color:'#aaa' }}>QR...</div>
        }
      </div>

      {/* RIGHT — Info */}
      <div style={{
        flex: 1, padding: '1.5mm', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize:'3.5pt', color:'#999', textTransform:'uppercase', letterSpacing:'.4pt' }}>
          Wickramakalutota Opticals
        </div>
        <div style={{ fontSize:'6.5pt', fontWeight:'bold', color:'#0f1f3d', lineHeight:1.2,
          overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
          {item.name}
        </div>
        {(line1||line2) && (
          <div style={{ fontSize:'5pt', color:'#555', lineHeight:1.3 }}>
            {line1 && <div>{line1}</div>}
            {line2 && <div>{line2}</div>}
          </div>
        )}
        <div style={{ fontSize:'9pt', fontWeight:'bold', color:'#0f1f3d',
          borderTop:'0.3mm solid #eee', paddingTop:'1mm' }}>
          {fmt(item.sell_price)}
        </div>
      </div>
    </div>
  );
}

// ── STICKER MODAL ─────────────────────────────────────────────
export function StickerModal({ items, onClose }) {
  const sheetRef  = useRef();
  const [readyCount, setReadyCount] = useState(0);

  const expanded = items.flatMap(item => {
    const qty = Math.max(1, parseInt(item.quantity) || 1);
    return Array(qty).fill(item);
  });

  const total    = expanded.length;
  const allReady = readyCount >= total && total > 0;
  const PER_PAGE = 44;
  const pages    = [];
  for (let i = 0; i < expanded.length; i += PER_PAGE) {
    pages.push(expanded.slice(i, i + PER_PAGE));
  }

  const handlePrint = () => {
    if (!sheetRef.current) return;
    // All QRs are already <img src="data:..."> — safe to clone and print
    const html = sheetRef.current.innerHTML;
    const win  = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('Allow popups to print.'); return; }
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Stickers</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:white;font-family:Arial,sans-serif;}
        .no-print{display:none!important;}
        @page{size:A4 portrait;margin:5mm;}
      </style>
    </head><body><div style="padding:0">${html}</div>
    <script>window.onload=function(){setTimeout(function(){window.print();window.close();},200);}<\/script>
    </body></html>`);
    win.document.close();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.65)', zIndex:1000,
      display:'flex', alignItems:'flex-start', justifyContent:'center',
      overflowY:'auto', padding:'24px 16px', fontFamily:"'DM Sans',sans-serif" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>

      <div style={{ background:'white', borderRadius:14, width:'100%', maxWidth:800,
        boxShadow:'0 24px 60px rgba(0,0,0,.3)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 20px', borderBottom:`1px solid ${C.border}` }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.navy }}>
              🏷️ Print Frame Arm Stickers
            </div>
            <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>
              {expanded.length} sticker{expanded.length!==1?'s':''} · {pages.length} A4 page{pages.length!==1?'s':''} · 50mm×25mm · fold at center line
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handlePrint} disabled={!allReady}
              style={{ padding:'9px 22px', background:allReady?C.gold:'#e5e7eb',
                color:allReady?C.navy:'#9ca3af', border:'none', borderRadius:9,
                fontSize:13, fontWeight:700, cursor:allReady?'pointer':'not-allowed',
                fontFamily:'inherit' }}>
              {allReady ? '🖨️ Print' : `⏳ ${readyCount}/${total} ready`}
            </button>
            <button onClick={onClose}
              style={{ padding:'9px 14px', background:C.cream, color:C.muted,
                border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13,
                fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ padding:'9px 20px', background:'#eff6ff', borderBottom:`1px solid #bae6fd`,
          fontSize:12, color:'#1e40af', display:'flex', gap:16, flexWrap:'wrap' }}>
          <span>1️⃣ Wait for all QR codes to load</span>
          <span>2️⃣ Click Print</span>
          <span>3️⃣ Cut along dashed lines</span>
          <span>4️⃣ Fold at solid center line → wrap around frame arm</span>
        </div>

        {/* Item summary */}
        <div style={{ padding:'10px 20px', background:C.cream, borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.navy, marginBottom:6 }}>Stickers:</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {items.map(item=>(
              <div key={item.id} style={{ background:'white', border:`1px solid ${C.border}`,
                borderRadius:8, padding:'4px 11px', fontSize:12, color:C.navy }}>
                {item.name} × <b>{Math.max(1,parseInt(item.quantity)||1)}</b>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div style={{ padding:20, maxHeight:560, overflowY:'auto', background:'#f3f4f6' }}>
          <div ref={sheetRef}>
            {pages.map((pageItems, pi) => (
              <div key={pi} style={{
                width:'210mm', background:'white',
                margin:'0 auto 12px', padding:'5mm',
                boxSizing:'border-box', boxShadow:'0 2px 8px rgba(0,0,0,.1)',
                pageBreakAfter:'always',
              }}>
                <div className="no-print" style={{ fontSize:10, color:C.muted, marginBottom:6, textAlign:'center' }}>
                  Page {pi+1} — {pageItems.length} sticker{pageItems.length!==1?'s':''}
                </div>
                <div style={{
                  display:'grid', gridTemplateColumns:'repeat(4, 50mm)',
                  gap:'0', width:'200mm', margin:'0 auto',
                }}>
                  {pageItems.map((item, idx) => (
                    <Sticker
                      key={`${item.id}-${pi}-${idx}`}
                      item={item}
                      onReady={() => setReadyCount(n => n + 1)}
                    />
                  ))}
                  {Array(Math.max(0, PER_PAGE - pageItems.length)).fill(null).map((_,ei) => (
                    <div key={`e-${ei}`} style={{
                      width:'50mm', height:'25mm',
                      border:'0.4mm dashed #ddd', boxSizing:'border-box', background:'white',
                    }}/>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:'10px 20px', borderTop:`1px solid ${C.border}`, fontSize:12, color:C.muted }}>
          💡 Left half = QR code (folds behind arm) · Right half = price tag (faces out)
        </div>
      </div>
    </div>
  );
}

// ── QR SCANNER ────────────────────────────────────────────────
export function QRScanner({ onScan, onClose, title='Scan Frame QR Code' }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);
  const [scanned, setScanned] = useState(false);

  useEffect(() => { startCamera(); return () => stopCamera(); }, []);

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
    } catch(e) { setError('Camera not available.'); setLoading(false); }
  };

  const stopCamera = () => { streamRef.current?.getTracks().forEach(t=>t.stop()); };

  const startScanning = () => {
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
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
      s.onload = () => {
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
      document.head.appendChild(s);
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
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:420,
        overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,.4)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.navy }}>📷 {title}</div>
          <button onClick={()=>{stopCamera();onClose();}}
            style={{ background:C.cream, border:'none', borderRadius:7, padding:'5px 12px',
              fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted, fontWeight:600 }}>✕</button>
        </div>
        <div style={{ position:'relative', background:'#000', aspectRatio:'4/3' }}>
          <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'cover' }} playsInline muted/>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <div style={{ width:200, height:200, border:'2px solid rgba(201,168,76,.8)', borderRadius:12, boxShadow:'0 0 0 2000px rgba(0,0,0,.3)'}}/>
          </div>
          {loading && <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.5)', color:'white', fontSize:14 }}>Starting camera...</div>}
        </div>
        <div style={{ padding:'14px 18px' }}>
          {error
            ? <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:'#c0392b', borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:12 }}>⚠️ {error}</div>
            : <div style={{ background:C.cream, borderRadius:8, padding:'10px 14px', fontSize:13, color:C.muted, marginBottom:12, textAlign:'center' }}>Point camera at a QR sticker</div>
          }
          <div style={{ fontSize:12, color:C.muted, textAlign:'center' }}>💡 Hold steady in good lighting</div>
        </div>
      </div>
    </div>
  );
}