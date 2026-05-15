/* eslint-disable */
// ============================================================
//  QRStickers.js — Foldable frame arm stickers
//  Size: 50mm × 25mm per sticker
//  Design: fold in half along center line
//    Left half  (25mm×25mm): QR code
//    Right half (25mm×25mm): shop name + item + price
//  Fold and stick around frame arm
//  A4 layout: 4 cols × 11 rows = 44 stickers per page
// ============================================================
import React, { useRef } from 'react';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280' };

// Use Google Charts QR — more reliable than qrserver for printing
const qrUrl = (text) => {
  const encoded = encodeURIComponent(text);
  return `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encoded}&choe=UTF-8`;
};

const encodeItem = (item) => JSON.stringify({
  id:    item.id,
  name:  item.name,
  price: item.sell_price,
  color: item.frame_color || '',
  brand: item.brand || '',
});

export const decodeQR = (raw) => { try { return JSON.parse(raw); } catch { return null; } };

// ── Single foldable sticker ───────────────────────────────────
function Sticker({ item }) {
  const fmt  = (n) => 'Rs.' + parseFloat(n||0).toLocaleString('en-LK', { minimumFractionDigits:0 });
  const qr   = qrUrl(encodeItem(item));

  const line1 = [item.brand, item.frame_color].filter(Boolean).join(' · ');
  const line2 = [item.frame_type, item.sg_type, item.rg_power].filter(Boolean).join(' · ');

  return (
    <div style={{
      width:     '50mm',
      height:    '25mm',
      display:   'flex',
      overflow:  'hidden',
      fontFamily:'Arial, sans-serif',
      background:'white',
      boxSizing: 'border-box',
      pageBreakInside: 'avoid',
      border:    '0.4mm dashed #bbb',   /* outer cut line */
      position:  'relative',
    }}>

      {/* ── LEFT HALF — QR code (fold this over) ── */}
      <div style={{
        width:          '25mm',
        height:         '25mm',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        borderRight:    '0.5mm solid #000',  /* FOLD LINE — solid so visible */
        flexShrink:     0,
        padding:        '1mm',
        boxSizing:      'border-box',
        position:       'relative',
        background:     'white',
      }}>
        {/* Fold indicator */}
        <div style={{
          position:   'absolute',
          top:        '1mm',
          left:       '50%',
          transform:  'translateX(-50%)',
          fontSize:   '3.5pt',
          color:      '#999',
          whiteSpace: 'nowrap',
          letterSpacing: '0.3pt',
        }}>◀ FOLD</div>

        {/* QR — using <img> with crossOrigin */}
        <img
          src={qr}
          alt="QR"
          style={{ width:'18mm', height:'18mm', marginTop:'2mm', display:'block' }}
          crossOrigin="anonymous"
        />
      </div>

      {/* ── RIGHT HALF — Item info ── */}
      <div style={{
        width:          '25mm',
        height:         '25mm',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'space-between',
        padding:        '1.5mm',
        boxSizing:      'border-box',
        background:     'white',
      }}>
        {/* Shop name */}
        <div style={{ fontSize:'3.5pt', color:'#999', textTransform:'uppercase', letterSpacing:'0.4pt', lineHeight:1.2 }}>
          Wickramakalutota Opticals
        </div>

        {/* Item name */}
        <div style={{
          fontSize:         '6.5pt',
          fontWeight:       'bold',
          color:            '#0f1f3d',
          lineHeight:       1.2,
          overflow:         'hidden',
          display:          '-webkit-box',
          WebkitLineClamp:  2,
          WebkitBoxOrient:  'vertical',
        }}>
          {item.name}
        </div>

        {/* Details */}
        {(line1||line2) && (
          <div style={{ fontSize:'5pt', color:'#555', lineHeight:1.3 }}>
            {line1 && <div>{line1}</div>}
            {line2 && <div>{line2}</div>}
          </div>
        )}

        {/* Price */}
        <div style={{
          fontSize:   '9pt',
          fontWeight: 'bold',
          color:      '#0f1f3d',
          borderTop:  '0.3mm solid #eee',
          paddingTop: '1mm',
        }}>
          {fmt(item.sell_price)}
        </div>
      </div>
    </div>
  );
}

// ── STICKER MODAL ─────────────────────────────────────────────
export function StickerModal({ items, onClose }) {
  const sheetRef = useRef();

  // Expand by quantity
  const expanded = items.flatMap(item => {
    const qty = Math.max(1, parseInt(item.quantity) || 1);
    return Array(qty).fill(item);
  });

  // 44 stickers per A4 page (4×11)
  const PER_PAGE = 44;
  const pages = [];
  for (let i = 0; i < expanded.length; i += PER_PAGE) {
    pages.push(expanded.slice(i, i + PER_PAGE));
  }

  const handlePrint = () => {
    // Inject print CSS
    const styleId = 'ko-sticker-css';
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = `
        @media print {
          @page { size: A4 portrait; margin: 5mm; }
          body > *:not(#ko-print-root) { display: none !important; }
          #ko-print-root {
            display: block !important;
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            z-index: 99999;
            background: white;
          }
          .no-print { display: none !important; }
        }
      `;
      document.head.appendChild(s);
    }

    // Create print container
    const el = document.createElement('div');
    el.id = 'ko-print-root';
    el.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;background:white;z-index:99999;';
    el.innerHTML = sheetRef.current.innerHTML;
    document.body.appendChild(el);

    window.print();

    setTimeout(() => {
      const existing = document.getElementById('ko-print-root');
      if (existing) document.body.removeChild(existing);
    }, 1000);
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
              {expanded.length} sticker{expanded.length!==1?'s':''} · {pages.length} A4 page{pages.length!==1?'s':''} ·
              50mm × 25mm · fold at center line · stick around frame arm
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handlePrint}
              style={{ padding:'9px 22px', background:C.gold, color:C.navy, border:'none',
                borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              🖨️ Print
            </button>
            <button onClick={onClose}
              style={{ padding:'9px 14px', background:C.cream, color:C.muted,
                border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13,
                fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              ✕
            </button>
          </div>
        </div>

        {/* How to use */}
        <div style={{ padding:'10px 20px', background:'#eff6ff', borderBottom:`1px solid #bae6fd`,
          fontSize:12, color:'#1e40af', display:'flex', gap:16, flexWrap:'wrap' }}>
          <span>1️⃣ Print on plain paper or sticker sheet</span>
          <span>2️⃣ Cut along the <b>dashed outer lines</b></span>
          <span>3️⃣ Fold at the <b>solid center line</b></span>
          <span>4️⃣ Stick around the frame arm</span>
        </div>

        {/* Item summary */}
        <div style={{ padding:'10px 20px', background:C.cream, borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.navy, marginBottom:6 }}>Stickers to print:</div>
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
            {pages.map((pageItems, pi)=>(
              <div key={pi} style={{
                width:      '210mm',
                background: 'white',
                margin:     '0 auto 12px',
                padding:    '5mm',
                boxSizing:  'border-box',
                boxShadow:  '0 2px 8px rgba(0,0,0,.1)',
                pageBreakAfter: 'always',
              }}>
                {/* Page label — hidden when printing */}
                <div className="no-print" style={{ fontSize:10, color:C.muted, marginBottom:6, textAlign:'center' }}>
                  Page {pi+1} — {pageItems.length} sticker{pageItems.length!==1?'s':''}
                </div>

                {/* Sticker grid — 4 columns */}
                <div style={{
                  display:               'grid',
                  gridTemplateColumns:   'repeat(4, 50mm)',
                  gap:                   '0mm',
                  width:                 '200mm',
                  margin:                '0 auto',
                }}>
                  {pageItems.map((item, idx)=>(
                    <Sticker key={`${item.id}-${idx}`} item={item}/>
                  ))}
                  {/* Empty placeholder cells */}
                  {Array(Math.max(0, PER_PAGE - pageItems.length)).fill(null).map((_,ei)=>(
                    <div key={`e-${ei}`} style={{
                      width:     '50mm',
                      height:    '25mm',
                      border:    '0.4mm dashed #ddd',
                      boxSizing: 'border-box',
                      background:'white',
                    }}/>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:'10px 20px', borderTop:`1px solid ${C.border}`, fontSize:12, color:C.muted }}>
          💡 QR code on left half — scan in New Order or Quick Sale to add item instantly
        </div>
      </div>
    </div>
  );
}

// ── QR SCANNER (unchanged) ────────────────────────────────────
export function QRScanner({ onScan, onClose, title='Scan Frame QR Code' }) {
  const videoRef  = React.useRef(null);
  const streamRef = React.useRef(null);
  const [error,   setError]   = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [scanned, setScanned] = React.useState(false);

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
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:420,
        overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,.4)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.navy }}>📷 {title}</div>
          <button onClick={()=>{stopCamera();onClose();}}
            style={{ background:C.cream, border:'none', borderRadius:7, padding:'5px 12px',
              fontSize:12, cursor:'pointer', fontFamily:'inherit', color:C.muted, fontWeight:600 }}>✕ Close</button>
        </div>
        <div style={{ position:'relative', background:'#000', aspectRatio:'4/3' }}>
          <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'cover' }} playsInline muted/>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <div style={{ width:200, height:200, border:'2px solid rgba(201,168,76,.8)',
              borderRadius:12, boxShadow:'0 0 0 2000px rgba(0,0,0,.3)' }}/>
          </div>
          {loading && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
              justifyContent:'center', background:'rgba(0,0,0,.5)', color:'white', fontSize:14 }}>
              Starting camera...
            </div>
          )}
        </div>
        <div style={{ padding:'14px 18px' }}>
          {error
            ? <div style={{ background:'#fef2f2', border:`1px solid #fca5a5`, color:'#c0392b',
                borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:12 }}>⚠️ {error}</div>
            : <div style={{ background:C.cream, borderRadius:8, padding:'10px 14px',
                fontSize:13, color:C.muted, marginBottom:12, textAlign:'center' }}>
                Point camera at a QR sticker
              </div>
          }
          <div style={{ fontSize:12, color:C.muted, textAlign:'center' }}>
            💡 Hold steady in good lighting for 1–2 seconds
          </div>
        </div>
      </div>
    </div>
  );
}