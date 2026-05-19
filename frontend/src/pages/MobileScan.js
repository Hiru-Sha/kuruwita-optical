/* eslint-disable */
// ============================================================
//  MobileScan.js — Mobile QR scan page
//  Open on mobile: yourapp.vercel.app/scan
//  Scan frame QR → choose New Order or Quick Sale
//  PC picks it up automatically
// ============================================================
import React, { useState, useEffect, useRef } from 'react';

const C = { navy:'#0f1f3d', gold:'#c9a84c', cream:'#f8f5ef', success:'#2d7a4f', danger:'#c0392b' };

export default function MobileScan() {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const [step,      setStep]      = useState('scan');  // scan | choose | sent | error
  const [item,      setItem]      = useState(null);
  const [error,     setError]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [camErr,    setCamErr]    = useState('');

  const BASE  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('ko_token');

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setCamErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      startScanning();
    } catch(e) {
      setCamErr('Camera not available. Make sure you allow camera access.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const startScanning = () => {
    if (!('BarcodeDetector' in window)) {
      setCamErr('QR scanning not supported on this browser. Use Chrome on Android.');
      return;
    }
    const det = new window.BarcodeDetector({ formats: ['qr_code'] });
    const scan = async () => {
      if (!videoRef.current || step !== 'scan') return;
      try {
        const codes = await det.detect(videoRef.current);
        if (codes.length) {
          const raw = codes[0].rawValue;
          await handleScanned(raw);
          return;
        }
      } catch(e) {}
      setTimeout(scan, 300);
    };
    setTimeout(scan, 800);
  };

  const handleScanned = async (raw) => {
    const id = parseInt(raw);
    if (!id) { setError('Invalid QR code'); return; }
    stopCamera();
    try {
      const res  = await fetch(`${BASE}/inventory/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data?.id) throw new Error('Item not found');
      setItem(data);
      setStep('choose');
    } catch(e) {
      setError(e.message || 'Failed to load item');
      setStep('error');
    }
  };

  const sendToPc = async (action) => {
    if (!item) return;
    setSending(true);
    try {
      await fetch(`${BASE}/scan-session`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ inventory_id: item.id, action }),
      });
      setStep('sent');
    } catch(e) {
      setError('Failed to send to PC');
    }
    setSending(false);
  };

  const reset = () => {
    setStep('scan');
    setItem(null);
    setError('');
    startCamera();
  };

  const fmt = (n) => 'Rs. ' + parseFloat(n||0).toLocaleString('en-LK');

  return (
    <div style={{ minHeight:'100vh', background:C.navy, display:'flex', flexDirection:'column',
      fontFamily:"'DM Sans',Arial,sans-serif", color:'white' }}>

      {/* Header */}
      <div style={{ padding:'16px 20px', background:'rgba(0,0,0,.3)', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:20 }}>👁️</span>
        <div>
          <div style={{ fontWeight:700, fontSize:15 }}>Wickramakalutota Opticals</div>
          <div style={{ fontSize:11, color:C.gold }}>Frame Scanner</div>
        </div>
      </div>

      {/* SCAN step */}
      {step === 'scan' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
          {camErr ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, gap:16 }}>
              <div style={{ fontSize:40 }}>📷</div>
              <div style={{ textAlign:'center', color:'#fca5a5', fontSize:14 }}>{camErr}</div>
              <button onClick={startCamera} style={{ padding:'12px 28px', background:C.gold, color:C.navy, border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer' }}>
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div style={{ position:'relative', background:'black', flex:1 }}>
                <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'cover' }} playsInline muted/>
                {/* Scan frame overlay */}
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:220, height:220, position:'relative' }}>
                    {/* Corner marks */}
                    {[{top:0,left:0},{top:0,right:0},{bottom:0,left:0},{bottom:0,right:0}].map((pos,i)=>(
                      <div key={i} style={{ position:'absolute', width:30, height:30,
                        borderTop: (pos.top===0) ? `3px solid ${C.gold}` : 'none',
                        borderBottom: (pos.bottom===0) ? `3px solid ${C.gold}` : 'none',
                        borderLeft: (pos.left===0) ? `3px solid ${C.gold}` : 'none',
                        borderRight: (pos.right===0) ? `3px solid ${C.gold}` : 'none',
                        ...pos }}/>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ padding:'20px', textAlign:'center' }}>
                <div style={{ fontSize:14, color:'rgba(255,255,255,.7)', marginBottom:8 }}>
                  Point camera at the QR code on the frame sticker
                </div>
                <div style={{ fontSize:12, color:C.gold }}>Scanning automatically...</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* CHOOSE step */}
      {step === 'choose' && item && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', padding:24, gap:16 }}>
          {/* Item card */}
          <div style={{ background:'rgba(255,255,255,.08)', borderRadius:14, padding:20, border:`1px solid ${C.gold}33` }}>
            <div style={{ fontSize:11, color:C.gold, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', marginBottom:8 }}>
              Scanned Item
            </div>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:4 }}>{item.brand || item.name}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.7)', marginBottom:4 }}>{item.name}</div>
            <div style={{ display:'flex', gap:16, marginTop:12 }}>
              <div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.5)' }}>Sell Price</div>
                <div style={{ fontSize:20, fontWeight:700, color:C.gold }}>{fmt(item.sell_price)}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.5)' }}>Stock</div>
                <div style={{ fontSize:20, fontWeight:700, color: item.quantity > 0 ? '#86efac' : '#fca5a5' }}>
                  {item.quantity}
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.5)' }}>Category</div>
                <div style={{ fontSize:14, fontWeight:600 }}>{item.category}</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize:14, textAlign:'center', color:'rgba(255,255,255,.6)' }}>
            What do you want to do on the PC?
          </div>

          {/* Action buttons */}
          <button onClick={()=>sendToPc('new_order')} disabled={sending}
            style={{ padding:'18px', background:'#1e40af', border:'none', borderRadius:14,
              fontSize:16, fontWeight:700, color:'white', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            <span style={{ fontSize:24 }}>📋</span>
            <div style={{ textAlign:'left' }}>
              <div>New Order</div>
              <div style={{ fontSize:12, fontWeight:400, opacity:.7 }}>Full order with customer, Rx, payment</div>
            </div>
          </button>

          <button onClick={()=>sendToPc('quick_sale')} disabled={sending}
            style={{ padding:'18px', background:'#166534', border:'none', borderRadius:14,
              fontSize:16, fontWeight:700, color:'white', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            <span style={{ fontSize:24 }}>⚡</span>
            <div style={{ textAlign:'left' }}>
              <div>Quick Sale</div>
              <div style={{ fontSize:12, fontWeight:400, opacity:.7 }}>Fast cash sale, no customer needed</div>
            </div>
          </button>

          <button onClick={()=>sendToPc('view')} disabled={sending}
            style={{ padding:'14px', background:'rgba(255,255,255,.08)', border:`1px solid rgba(255,255,255,.2)`,
              borderRadius:14, fontSize:14, fontWeight:600, color:'white', cursor:'pointer' }}>
            👁️ Just View on PC
          </button>

          {sending && <div style={{ textAlign:'center', color:C.gold }}>Sending to PC...</div>}

          <button onClick={reset} style={{ padding:'12px', background:'transparent', border:`1px solid rgba(255,255,255,.2)`, borderRadius:10, fontSize:13, color:'rgba(255,255,255,.6)', cursor:'pointer' }}>
            ← Scan Another
          </button>
        </div>
      )}

      {/* SENT step */}
      {step === 'sent' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, gap:20 }}>
          <div style={{ fontSize:64 }}>✅</div>
          <div style={{ fontSize:20, fontWeight:700, textAlign:'center' }}>Sent to PC!</div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,.6)', textAlign:'center' }}>
            Check your PC — the item details will appear automatically on the orders page.
          </div>
          <button onClick={reset}
            style={{ padding:'14px 32px', background:C.gold, color:C.navy, border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', marginTop:10 }}>
            Scan Another Frame
          </button>
        </div>
      )}

      {/* ERROR step */}
      {step === 'error' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, gap:16 }}>
          <div style={{ fontSize:48 }}>❌</div>
          <div style={{ color:'#fca5a5', textAlign:'center' }}>{error}</div>
          <button onClick={reset} style={{ padding:'12px 28px', background:C.gold, color:C.navy, border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' }}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}