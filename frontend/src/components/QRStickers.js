/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280' };

export const decodeQR = (raw) => { try { return JSON.parse(raw); } catch { return null; } };

const encodeItem = (item) => String(item.id);  // just the ID — short, always works

// ── Generate QR as SVG path using qrcode-svg approach ─────────
// Uses a hidden iframe with qrcodejs loaded — completely isolated from React
function useQRDataUrl(text) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    // Use an off-screen canvas approach that doesn't touch React's DOM
    const script = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

    function generate() {
      if (!window.QRCode) return setTimeout(generate, 200);
      try {
        // Create a temporary div OUTSIDE React tree
        const host = document.createElement('div');
        host.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:200px;height:200px;visibility:hidden;';
        document.body.appendChild(host);

        new window.QRCode(host, {
          text, width:200, height:200,
          colorDark:'#000000', colorLight:'#ffffff',
          correctLevel: window.QRCode.CorrectLevel.M,
        });

        setTimeout(() => {
          const canvas = host.querySelector('canvas');
          const img    = host.querySelector('img');
          let url = null;
          if (canvas) url = canvas.toDataURL('image/png');
          else if (img) url = img.src;
          setDataUrl(url);
          // Clean up the temp div — it's NOT part of React tree so safe
          if (document.body.contains(host)) document.body.removeChild(host);
        }, 200);
      } catch(e) { console.error('QR gen failed', e); }
    }

    if (window.QRCode) {
      generate();
    } else {
      // Load once
      if (!document.getElementById('qrcodejs')) {
        const s = document.createElement('script');
        s.id  = 'qrcodejs';
        s.src = script;
        s.onload = generate;
        document.head.appendChild(s);
      } else {
        // Script tag exists but not loaded yet
        document.getElementById('qrcodejs').addEventListener('load', generate);
        setTimeout(generate, 500);
      }
    }
  }, [text]);

  return dataUrl;
}

// ── Single sticker ────────────────────────────────────────────
function Sticker({ item, onReady }) {
  const text   = encodeItem(item);
  const qrUrl  = useQRDataUrl(text);
  const fmt    = (n) => 'Rs.' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});
  const line1  = [item.brand, item.frame_color].filter(Boolean).join(' · ');
  const line2  = [item.frame_type, item.sg_type, item.rg_power].filter(Boolean).join(' · ');

  useEffect(() => { if (qrUrl && onReady) onReady(); }, [qrUrl]);

  return (
    <div style={{
      width:'50mm', height:'25mm', display:'flex', overflow:'hidden',
      fontFamily:'Arial,sans-serif', background:'white',
      boxSizing:'border-box', pageBreakInside:'avoid',
      border:'0.4mm dashed #bbb',
    }}>
      {/* LEFT — QR */}
      <div style={{
        width:'25mm', height:'25mm', flexShrink:0,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        borderRight:'0.5mm solid #000', padding:'1mm', boxSizing:'border-box', position:'relative',
      }}>
        <div style={{ position:'absolute', top:'1mm', fontSize:'3.5pt', color:'#999', letterSpacing:'.3pt' }}>◀ FOLD</div>
        {qrUrl
          ? <img src={qrUrl} alt="QR" style={{ width:'18mm', height:'18mm', marginTop:'2mm', display:'block' }}/>
          : <div style={{ width:'18mm', height:'18mm', marginTop:'2mm', background:'#f0f0f0',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'4pt', color:'#999' }}>
              loading...
            </div>
        }
      </div>
      {/* RIGHT — Info */}
      <div style={{
        flex:1, padding:'1.5mm', boxSizing:'border-box',
        display:'flex', flexDirection:'column', justifyContent:'space-between',
      }}>

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
        <div style={{ fontSize:'11pt', fontWeight:'bold', color:'#0f1f3d',
          borderTop:'0.3mm solid #eee', paddingTop:'1mm', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>{fmt(item.sell_price)}</span>
          {item.display_number ? <span style={{ fontSize:'6pt', background:'#1e40af', color:'white', borderRadius:'3pt', padding:'0 3pt', marginLeft:'1mm' }}>🏪{item.display_number}</span> : null}
          {item.stock_number   ? <span style={{ fontSize:'6pt', background:'#7c3aed', color:'white', borderRadius:'3pt', padding:'0 3pt', marginLeft:'1mm' }}>📦{item.stock_number}</span>   : null}
        </div>
      </div>
    </div>
  );
}

// ── STICKER MODAL ─────────────────────────────────────────────
export function StickerModal({ items, onClose }) {
  const sheetRef = useRef();
  const [readyCount, setReadyCount] = useState(0);

  const expanded = items.flatMap(item => {
    const qty = Math.max(1, parseInt(item.quantity)||1);
    return Array(qty).fill(item);
  });

  const total    = expanded.length;
  const allReady = readyCount >= total && total > 0;
  const PER_PAGE = 44;
  const pages    = [];
  for (let i=0; i<expanded.length; i+=PER_PAGE) pages.push(expanded.slice(i,i+PER_PAGE));

  const handlePrint = () => {
    if (!sheetRef.current) return;
    const html = sheetRef.current.innerHTML
      .replace(/class="no-print[^"]*"/g, 'style="display:none"');

    const win = window.open('','_blank','width=900,height=700');
    if (!win) { alert('Please allow popups to print.'); return; }
    win.document.write(`<!DOCTYPE html><html><head>
<title>Stickers</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:white;}
  @page{size:A4 portrait;margin:5mm;}
</style>
</head><body>
<div>${html}</div>
<script>window.onload=function(){setTimeout(function(){window.print();window.close();},400);};<\/script>
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

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 20px', borderBottom:`1px solid ${C.border}` }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.navy }}>🏷️ Print Frame Arm Stickers</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>
              {expanded.length} sticker{expanded.length!==1?'s':''} · {pages.length} A4 page{pages.length!==1?'s':''} · 50mm×25mm · fold at center line
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handlePrint} disabled={!allReady}
              style={{ padding:'9px 22px', background:allReady?C.gold:'#e5e7eb',
                color:allReady?C.navy:'#9ca3af', border:'none', borderRadius:9,
                fontSize:13, fontWeight:700, cursor:allReady?'pointer':'not-allowed', fontFamily:'inherit' }}>
              {allReady ? '🖨️ Print' : `⏳ Loading QR ${readyCount}/${total}`}
            </button>
            <button onClick={onClose} style={{ padding:'9px 14px', background:C.cream,
              color:C.muted, border:`1.5px solid ${C.border}`, borderRadius:9,
              fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
          </div>
        </div>

        <div style={{ padding:'9px 20px', background:'#eff6ff', borderBottom:`1px solid #bae6fd`,
          fontSize:12, color:'#1e40af', display:'flex', gap:16, flexWrap:'wrap' }}>
          <span>1️⃣ Wait for QR codes to load</span>
          <span>2️⃣ Click Print</span>
          <span>3️⃣ Cut dashed lines</span>
          <span>4️⃣ Fold solid line · wrap around frame arm</span>
        </div>

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

        <div style={{ padding:20, maxHeight:560, overflowY:'auto', background:'#f3f4f6' }}>
          <div ref={sheetRef}>
            {pages.map((pageItems, pi)=>(
              <div key={pi} style={{
                width:'210mm', background:'white', margin:'0 auto 12px',
                padding:'5mm', boxSizing:'border-box', boxShadow:'0 2px 8px rgba(0,0,0,.1)',
                pageBreakAfter:'always',
              }}>
                <div className="no-print" style={{ fontSize:10, color:C.muted, marginBottom:6, textAlign:'center' }}>
                  Page {pi+1} — {pageItems.length} sticker{pageItems.length!==1?'s':''}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,50mm)',
                  gap:'0', width:'200mm', margin:'0 auto' }}>
                  {pageItems.map((item,idx)=>(
                    <Sticker key={`${item.id}-${pi}-${idx}`} item={item}
                      onReady={()=>setReadyCount(n=>n+1)}/>
                  ))}
                  {Array(Math.max(0,PER_PAGE-pageItems.length)).fill(null).map((_,ei)=>(
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
          💡 Left half = QR (folds behind arm) · Right half = price tag (faces out)
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

  useEffect(()=>{ startCamera(); return ()=>stopCamera(); },[]);

  const startCamera = async () => {
    setLoading(true); setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{facingMode:'environment'} });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject=stream; videoRef.current.play(); }
      setLoading(false); startScanning();
    } catch(e) { setError('Camera not available.'); setLoading(false); }
  };

  const stopCamera = () => streamRef.current?.getTracks().forEach(t=>t.stop());

  const startScanning = () => {
    if ('BarcodeDetector' in window) {
      const det = new window.BarcodeDetector({formats:['qr_code']});
      const scan = async()=>{
        if(!videoRef.current||scanned) return;
        try{ const c=await det.detect(videoRef.current); if(c.length){handleScan(c[0].rawValue);return;} }catch{}
        setTimeout(scan,300);
      };
      setTimeout(scan,500);
    }
  };

  const handleScan = (raw) => {
    if(scanned) return; setScanned(true);
    const item=decodeQR(raw);
    if(item){stopCamera();onScan(item);}
    else{setError('Invalid QR.');setScanned(false);}
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(15,31,61,.8)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={e=>{if(e.target===e.currentTarget){stopCamera();onClose();}}}>
      <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:420,overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.navy}}>📷 {title}</div>
          <button onClick={()=>{stopCamera();onClose();}} style={{background:C.cream,border:'none',borderRadius:7,padding:'5px 12px',fontSize:12,cursor:'pointer',fontFamily:'inherit',color:C.muted}}>✕</button>
        </div>
        <div style={{position:'relative',background:'#000',aspectRatio:'4/3'}}>
          <video ref={videoRef} style={{width:'100%',height:'100%',objectFit:'cover'}} playsInline muted/>
          {loading&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.5)',color:'white',fontSize:14}}>Starting camera...</div>}
        </div>
        <div style={{padding:'14px 18px'}}>
          {error
            ?<div style={{background:'#fef2f2',border:`1px solid #fca5a5`,color:'#c0392b',borderRadius:8,padding:'10px 14px',fontSize:13}}>⚠️ {error}</div>
            :<div style={{background:C.cream,borderRadius:8,padding:'10px 14px',fontSize:13,color:C.muted,textAlign:'center'}}>Point camera at a QR sticker</div>
          }
        </div>
      </div>
    </div>
  );
}
