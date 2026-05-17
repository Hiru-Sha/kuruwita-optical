/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', border:'#e0ddd6', muted:'#6b7280' };

export const decodeQR = (raw) => { try { return JSON.parse(raw); } catch { return null; } };
const encodeItem = (item) => String(item.id);
const fmt = (n) => 'Rs.' + parseFloat(n||0).toLocaleString('en-LK',{minimumFractionDigits:0});

// ── Track printed ─────────────────────────────────────────────
const PRINTED_KEY = 'ko_printed_stickers';
const getPrinted  = () => { try { return JSON.parse(localStorage.getItem(PRINTED_KEY)||'{}'); } catch { return {}; } };
const markPrinted = (ids) => { const p=getPrinted(); ids.forEach(id=>{ p[String(id)]=new Date().toISOString(); }); localStorage.setItem(PRINTED_KEY,JSON.stringify(p)); };
export const clearPrinted = () => localStorage.removeItem(PRINTED_KEY);
export const isPrinted    = (id) => !!getPrinted()[String(id)];

// ── QR generation ─────────────────────────────────────────────
function useQRDataUrl(text) {
  const [dataUrl, setDataUrl] = useState(null);
  useEffect(() => {
    function generate() {
      if (!window.QRCode) return setTimeout(generate, 200);
      try {
        const host = document.createElement('div');
        host.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:160px;height:160px;visibility:hidden;';
        document.body.appendChild(host);
        new window.QRCode(host, { text, width:160, height:160, colorDark:'#000', colorLight:'#fff', correctLevel: window.QRCode.CorrectLevel.M });
        setTimeout(() => {
          const canvas = host.querySelector('canvas');
          const img    = host.querySelector('img');
          setDataUrl(canvas ? canvas.toDataURL('image/png') : img?.src || null);
          if (document.body.contains(host)) document.body.removeChild(host);
        }, 200);
      } catch(e) {}
    }
    if (window.QRCode) { generate(); }
    else if (!document.getElementById('qrcodejs')) {
      const s = document.createElement('script');
      s.id = 'qrcodejs';
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload = generate;
      document.head.appendChild(s);
    } else {
      document.getElementById('qrcodejs').addEventListener('load', generate);
      setTimeout(generate, 500);
    }
  }, [text]);
  return dataUrl;
}

// ── Single sticker ────────────────────────────────────────────
// Physical printed size: 25mm wide × 55mm tall
// Rotated 90° CCW so text reads bottom-to-top along the arm
// Top section  (25mm): QR code
// Gap (5mm):   fold/gap line
// Bottom section (25mm): Brand + model + price + numbers
function Sticker({ item, onReady, stickerNum, globalNum }) {
  const qrUrl = useQRDataUrl(encodeItem(item));
  const brand  = item.brand || '';
  const model  = item.frame_name || item.name?.split(' · ').slice(1,2).join('') || '';
  const color  = item.frame_color || '';
  const detail = [item.frame_type, item.sg_type, item.rg_power, item.frame_size].filter(Boolean).join(' · ');

  useEffect(() => { if (qrUrl && onReady) onReady(); }, [qrUrl]);

  // We design it as 55mm wide × 25mm tall, then rotate -90deg
  // The wrapper will be 25mm × 55mm to hold the rotated result
  return (
    <div style={{
      width:'25mm', height:'55mm',
      display:'flex', alignItems:'center', justifyContent:'center',
      overflow:'hidden', pageBreakInside:'avoid',
      border:'0.3mm dashed #aaa', boxSizing:'border-box',
    }}>
      {/* Inner content — 55mm wide × 25mm tall, rotated 90° CCW */}
      <div style={{
        width:'55mm', height:'25mm',
        display:'flex', flexDirection:'row',
        fontFamily:"'Arial',sans-serif",
        background:'white',
        boxSizing:'border-box',
        transform:'rotate(-90deg)',
        flexShrink:0,
      }}>
        {/* LEFT section — QR (25mm) */}
        <div style={{
          width:'25mm', height:'25mm', flexShrink:0,
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          padding:'1mm', boxSizing:'border-box',
          position:'relative',
        }}>
          {qrUrl
            ? <img src={qrUrl} alt="QR" style={{ width:'20mm', height:'20mm', display:'block' }}/>
            : <div style={{ width:'20mm', height:'20mm', background:'#f5f5f5',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'4pt', color:'#bbb', border:'0.3mm solid #eee' }}>QR...</div>
          }
          {/* per-item number */}
          <div style={{ position:'absolute', bottom:'0.5mm', left:'1mm',
            fontSize:'5pt', fontWeight:'bold', color:'#555' }}>{stickerNum}</div>
          {/* global number — faint */}
          <div style={{ position:'absolute', bottom:'0.5mm', right:'1mm',
            fontSize:'4pt', color:'#ccc' }}>{globalNum}</div>
        </div>

        {/* MIDDLE — 5mm gap / fold line */}
        <div style={{
          width:'5mm', height:'25mm', flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          borderLeft:'0.4mm solid #000',
          borderRight:'0.4mm solid #000',
          background:'#fafafa',
          position:'relative',
        }}>
          <div style={{
            fontSize:'3pt', color:'#bbb', letterSpacing:'0.5pt',
            writingMode:'vertical-rl', textOrientation:'mixed',
            transform:'rotate(180deg)',
          }}>◀ FOLD ▶</div>
        </div>

        {/* RIGHT section — Details (25mm) */}
        <div style={{
          flex:1, padding:'1.5mm 2mm',
          boxSizing:'border-box',
          display:'flex', flexDirection:'column',
          justifyContent:'space-between',
        }}>
          {/* Brand */}
          <div style={{
            fontSize:'8pt', fontWeight:'bold', color:'#0f1f3d', lineHeight:1.2,
            overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis',
          }}>
            {brand || item.name?.split(' · ')[0]}
          </div>

          {/* Model + color */}
          <div style={{ fontSize:'5.5pt', color:'#444', lineHeight:1.3 }}>
            {model && <div style={{ fontWeight:'600', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{model}</div>}
            {color && <div style={{ overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{color}{detail?` · ${detail}`:''}</div>}
            {!model && !color && <div style={{ overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{item.name}</div>}
          </div>

          {/* Price */}
          <div style={{
            borderTop:'0.2mm solid #eee', paddingTop:'1mm',
            fontSize:'10pt', fontWeight:'bold', color:'#0f1f3d',
          }}>
            {fmt(item.sell_price)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── STICKER MODAL ─────────────────────────────────────────────
export function StickerModal({ items, onClose }) {
  const sheetRef  = useRef();
  const [readyCount, setReadyCount] = useState(0);
  const [selected,   setSelected]   = useState(() => {
    const printed = getPrinted();
    const sel = {};
    items.forEach(item => { sel[item.id] = !printed[String(item.id)]; });
    return sel;
  });
  const [showAll, setShowAll] = useState(false);

  const printed       = getPrinted();
  const filteredItems = items.filter(item => showAll || !printed[String(item.id)]);
  const selectedItems = filteredItems.filter(item => selected[item.id]);

  // Expand by quantity — per-item seq + global category seq
  // Group by category+subtype for global numbering
  // e.g. all Polarised sunglasses get global 1..59
  const buildExpanded = () => {
    const result = [];
    // Build global counters per category+subtype
    const globalCounters = {}; // key → current count
    const getKey = (item) => {
      if (item.category==='Sunglasses') return `SG-${item.sg_type||'All'}`;
      if (item.category==='Frames')     return `FR-${item.frame_type||'All'}`;
      return item.category;
    };

    // First pass: count total per key for reference (optional)
    selectedItems
      .filter(item => item.category !== 'Old Stock')
      .forEach(item => {
        const key = getKey(item);
        if (!globalCounters[key]) globalCounters[key] = 0;
      });

    // Second pass: expand with numbers
    selectedItems
      .filter(item => item.category !== 'Old Stock')
      .forEach(item => {
        const qty = Math.max(1, parseInt(item.quantity)||1);
        const key = getKey(item);
        if (!globalCounters[key]) globalCounters[key] = 0;
        for (let i=0; i<qty; i++) {
          globalCounters[key]++;
          result.push({
            ...item,
            _seq:    i + 1,                    // per-item: 1,2,3,4
            _global: globalCounters[key],       // global category: 1..59
          });
        }
      });
    return result;
  };

  const expanded = buildExpanded();
  const total    = expanded.length;
  const allReady = readyCount >= total && total > 0;
  const PER_PAGE = 40; // 8 cols × 5 rows at 25mm×55mm at 50mm×30mm

  const pages = [];
  for (let i=0; i < expanded.length; i += PER_PAGE) {
    pages.push(expanded.slice(i, i + PER_PAGE));
  }

  const toggleItem  = (id) => setSelected(s => ({ ...s, [id]: !s[id] }));
  const selectAll   = () => { const s={}; filteredItems.forEach(i=>s[i.id]=true);  setSelected(s); };
  const deselectAll = () => { const s={}; filteredItems.forEach(i=>s[i.id]=false); setSelected(s); };

  const handlePrint = () => {
    if (!sheetRef.current) return;
    const html = sheetRef.current.innerHTML.replace(/class="no-print[^"]*"/g,'style="display:none"');
    const win = window.open('','_blank','width=900,height=700');
    if (!win) { alert('Please allow popups.'); return; }
    win.document.write(`<!DOCTYPE html><html><head>
<title>Stickers</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:white;}@page{size:A4 portrait;margin:5mm;}</style>
</head><body><div>${html}</div>
<script>window.onload=function(){setTimeout(function(){window.print();window.close();},400);};<\/script>
</body></html>`);
    win.document.close();
    markPrinted(selectedItems.map(i => i.id));
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,31,61,.65)', zIndex:1000,
      display:'flex', alignItems:'flex-start', justifyContent:'center',
      overflowY:'auto', padding:'24px 16px', fontFamily:"'DM Sans',sans-serif" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>

      <div style={{ background:'white', borderRadius:14, width:'100%', maxWidth:860,
        boxShadow:'0 24px 60px rgba(0,0,0,.3)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 20px', borderBottom:`1px solid ${C.border}` }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:C.navy }}>🏷️ Print Frame Arm Tags</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>
              50mm×30mm · fold at center · {expanded.length} tag{expanded.length!==1?'s':''}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handlePrint} disabled={!allReady || expanded.length===0}
              style={{ padding:'9px 22px',
                background: allReady&&expanded.length ? C.gold : '#e5e7eb',
                color: allReady&&expanded.length ? C.navy : '#9ca3af',
                border:'none', borderRadius:9, fontSize:13, fontWeight:700,
                cursor: allReady&&expanded.length ? 'pointer' : 'not-allowed', fontFamily:'inherit' }}>
              {expanded.length===0 ? 'No items' : !allReady ? `⏳ ${readyCount}/${total}` : '🖨️ Print'}
            </button>
            <button onClick={onClose}
              style={{ padding:'9px 14px', background:C.cream, color:C.muted,
                border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13,
                fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
          </div>
        </div>

        {/* Number legend */}
        <div style={{ padding:'8px 20px', background:'#fffbeb', borderBottom:`1px solid #fde68a`,
          fontSize:12, color:'#92400e', display:'flex', gap:20, flexWrap:'wrap' }}>
          <span><b>Bottom-left number</b> = per-item count (Gucci Brown: 1,2,3,4)</span>
          <span><b style={{ color:'#bbb' }}>Bottom-right (faint)</b> = global category count (all Polarised: 1..59)</span>
        </div>

        {/* Item selector */}
        <div style={{ padding:'12px 20px', borderBottom:`1px solid ${C.border}`, background:C.cream }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.navy }}>Select items:</div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={()=>setShowAll(s=>!s)}
                style={{ padding:'4px 10px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer',
                  fontFamily:'inherit', border:`1px solid ${C.border}`,
                  background:showAll?C.navy:'white', color:showAll?'white':C.muted }}>
                {showAll ? '👁️ All' : `🔇 Printed hidden (${Object.keys(printed).length})`}
              </button>
              <button onClick={selectAll}   style={{ padding:'4px 10px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1px solid ${C.border}`, background:'white', color:C.navy }}>All</button>
              <button onClick={deselectAll} style={{ padding:'4px 10px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1px solid ${C.border}`, background:'white', color:C.muted }}>None</button>
              <button onClick={()=>{ clearPrinted(); setSelected(s=>{ const n={}; items.forEach(i=>n[i.id]=true); return n; }); }}
                style={{ padding:'4px 10px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer',
                  fontFamily:'inherit', border:`1px solid #fca5a5`, background:'#fef2f2', color:'#c0392b' }}>
                Reset printed
              </button>
            </div>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {filteredItems.map(item => {
              const isP   = !!printed[String(item.id)];
              const isSel = selected[item.id];
              return (
                <button key={item.id} onClick={()=>toggleItem(item.id)}
                  style={{ padding:'5px 12px', borderRadius:8, fontSize:12, fontWeight:600,
                    cursor:'pointer', fontFamily:'inherit',
                    border:`1.5px solid ${isSel?C.navy:C.border}`,
                    background:isSel?C.navy:'white',
                    color:isSel?'white':C.muted,
                    opacity:isP?0.55:1 }}>
                  {(item.brand||item.name||'').split(' · ')[0]} ×{item.quantity}
                  {isP && <span style={{ fontSize:9, marginLeft:4 }}>✓</span>}
                </button>
              );
            })}
            {filteredItems.length===0 && (
              <div style={{ fontSize:13, color:C.muted }}>All printed — toggle "Printed hidden" to show.</div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div style={{ padding:'8px 20px', background:'#eff6ff', borderBottom:`1px solid #bae6fd`,
          fontSize:12, color:'#1e40af', display:'flex', gap:14, flexWrap:'wrap' }}>
          <span>1️⃣ Select items</span>
          <span>2️⃣ Wait for QR codes</span>
          <span>3️⃣ Print → Cut dashed lines</span>
          <span>4️⃣ Fold at solid center line → wrap around frame arm</span>
        </div>

        {/* Preview */}
        <div style={{ padding:20, maxHeight:560, overflowY:'auto', background:'#f3f4f6' }}>
          {expanded.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:C.muted }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🏷️</div>
                <div>No items selected.</div>
              </div>
            : <div ref={sheetRef}>
                {pages.map((pageItems, pi) => (
                  <div key={pi} style={{
                    width:'210mm', background:'white',
                    margin:'0 auto 12px', padding:'5mm',
                    boxSizing:'border-box', boxShadow:'0 2px 8px rgba(0,0,0,.1)',
                    pageBreakAfter:'always',
                  }}>
                    <div className="no-print" style={{ fontSize:10, color:C.muted, marginBottom:6, textAlign:'center' }}>
                      Page {pi+1} — {pageItems.length} tag{pageItems.length!==1?'s':''}
                    </div>
                    <div style={{
                      display:'grid',
                      gridTemplateColumns:'repeat(8, 25mm)',
                      gap:'0mm',
                      width:'200mm',
                      margin:'0 auto',
                    }}>
                      {pageItems.map((item, idx) => (
                        <Sticker
                          key={`${item.id}-${pi}-${idx}`}
                          item={item}
                          stickerNum={item._seq}
                          globalNum={item._global}
                          onReady={()=>setReadyCount(n=>n+1)}
                        />
                      ))}
                      {Array(Math.max(0, PER_PAGE - pageItems.length)).fill(null).map((_,ei) => (
                        <div key={`e-${ei}`} style={{
                          width:'50mm', height:'30mm',
                          border:'0.3mm dashed #e5e5e5',
                          boxSizing:'border-box', background:'white',
                        }}/>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        <div style={{ padding:'10px 20px', borderTop:`1px solid ${C.border}`, fontSize:12, color:C.muted }}>
          💡 After printing, items are marked as printed and hidden from next run.
        </div>
      </div>
    </div>
  );
}

// ── QR SCANNER ────────────────────────────────────────────────
export function QRScanner({ onScan, onClose, title='Scan Frame QR Code' }) {
  const videoRef  = React.useRef(null);
  const streamRef = React.useRef(null);
  const [error,   setError]   = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [scanned, setScanned] = React.useState(false);

  React.useEffect(()=>{ startCamera(); return ()=>stopCamera(); },[]);

  const startCamera = async () => {
    setLoading(true); setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{facingMode:'environment'} });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject=stream; videoRef.current.play(); }
      setLoading(false); startScanning();
    } catch(e) { setError('Camera not available.'); setLoading(false); }
  };
  const stopCamera    = () => streamRef.current?.getTracks().forEach(t=>t.stop());
  const startScanning = () => {
    if (!('BarcodeDetector' in window)) return;
    const det = new window.BarcodeDetector({formats:['qr_code']});
    const scan = async()=>{
      if(!videoRef.current||scanned) return;
      try{ const c=await det.detect(videoRef.current); if(c.length){handleScan(c[0].rawValue);return;} }catch{}
      setTimeout(scan,300);
    };
    setTimeout(scan,500);
  };
  const handleScan = (raw) => {
    if(scanned) return; setScanned(true);
    const item=decodeQR(raw);
    if(item){stopCamera();onScan(item);}
    else{setError('Invalid QR.');setScanned(false);}
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(15,31,61,.8)',zIndex:2000,
      display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={e=>{if(e.target===e.currentTarget){stopCamera();onClose();}}}>
      <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:420,overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'14px 18px',borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.navy}}>📷 {title}</div>
          <button onClick={()=>{stopCamera();onClose();}}
            style={{background:C.cream,border:'none',borderRadius:7,padding:'5px 12px',
              fontSize:12,cursor:'pointer',fontFamily:'inherit',color:C.muted}}>✕</button>
        </div>
        <div style={{position:'relative',background:'#000',aspectRatio:'4/3'}}>
          <video ref={videoRef} style={{width:'100%',height:'100%',objectFit:'cover'}} playsInline muted/>
          {loading&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',
            justifyContent:'center',background:'rgba(0,0,0,.5)',color:'white',fontSize:14}}>
            Starting camera...</div>}
        </div>
        <div style={{padding:'14px 18px'}}>
          {error
            ?<div style={{background:'#fef2f2',border:`1px solid #fca5a5`,color:'#c0392b',
                borderRadius:8,padding:'10px 14px',fontSize:13}}>⚠️ {error}</div>
            :<div style={{background:C.cream,borderRadius:8,padding:'10px 14px',
                fontSize:13,color:C.muted,textAlign:'center'}}>Point camera at a QR tag</div>
          }
        </div>
      </div>
    </div>
  );
}