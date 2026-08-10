// ============================================================
//  scanSession.js — Mobile QR → PC order workflow
//  Mobile scans QR → POST /api/scan-session
//  PC polls GET /api/scan-session → sees item → opens order
//
//  Bug #9 Fix: QR scan sessions now stored in the DB table
//  `scan_sessions` instead of in-memory JS object. This means:
//    - Sessions survive server restarts and Railway deploys
//    - Works correctly if Railway ever scales to 2+ instances
//    - Sessions auto-expire via TTL check (60 seconds)
//  Photo sessions (large base64 images) remain in-memory as
//  they are very short-lived (< 10 min) and DB storage of
//  raw base64 images would be wasteful.
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// ── Ensure scan_sessions table exists ────────────────────────
// Created at first use so no schema migration needed.
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scan_sessions (
      user_id    INTEGER PRIMARY KEY,
      item       JSONB        NOT NULL,
      action     VARCHAR(50)  NOT NULL DEFAULT 'new_order',
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `).catch(() => {});
}
ensureTable();

// ── POST /api/scan-session — mobile posts scanned item ───────
router.post('/', auth, async (req, res) => {
  const { inventory_id, action } = req.body;
  if (!inventory_id) return res.status(400).json({ error: 'inventory_id required' });

  try {
    const item = await pool.query('SELECT * FROM inventory WHERE id = $1', [inventory_id]);
    if (!item.rows.length) return res.status(404).json({ error: 'Item not found' });

    // Upsert into DB — replaces any existing session for this user
    await pool.query(
      `INSERT INTO scan_sessions (user_id, item, action, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET item = EXCLUDED.item,
             action = EXCLUDED.action,
             created_at = NOW()`,
      [req.user.id, JSON.stringify(item.rows[0]), action || 'new_order']
    );

    res.json({ ok: true, item: item.rows[0] });
  } catch (e) {
    console.error('Scan session error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/scan-session — PC polls this every 2s ───────────
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM scan_sessions
       WHERE user_id = $1
         AND created_at > NOW() - INTERVAL '60 seconds'`,
      [req.user.id]
    );

    if (!result.rows.length) {
      // Clean up expired session if it exists
      await pool.query('DELETE FROM scan_sessions WHERE user_id = $1', [req.user.id]).catch(() => {});
      return res.json({ pending: false });
    }

    const session = result.rows[0];
    const item    = typeof session.item === 'string' ? JSON.parse(session.item) : session.item;
    res.json({ pending: true, item, action: session.action });
  } catch (e) {
    console.error('Scan session get error:', e);
    res.json({ pending: false });
  }
});

// ── DELETE /api/scan-session — PC clears after picking up ────
router.delete('/', auth, async (req, res) => {
  await pool.query('DELETE FROM scan_sessions WHERE user_id = $1', [req.user.id]).catch(() => {});
  res.json({ ok: true });
});

// ============================================================
//  Photo upload session (remains in-memory — short-lived,
//  large base64 payloads not suited for DB storage)
// ============================================================
const photoSessions = {}; // token → { image, timestamp, userId }
const userPending   = {}; // userId → token

// PC calls this to create a photo session token
router.post('/photo-session', auth, (req, res) => {
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  photoSessions[token] = {
    image:     null,
    userId:    req.user.id,
    timestamp: Date.now(),
  };
  userPending[req.user.id] = token;
  // Clean old sessions (older than 10 min)
  Object.keys(photoSessions).forEach(k => {
    if (Date.now() - photoSessions[k].timestamp > 600000) {
      if (userPending[photoSessions[k].userId] === k) delete userPending[photoSessions[k].userId];
      delete photoSessions[k];
    }
  });
  res.json({ token });
});

// Phone checks if PC is waiting for a photo
router.get('/photo-session/pending', auth, (req, res) => {
  const token = userPending[req.user.id];
  if (!token || !photoSessions[token]) return res.json({ pending: false });
  res.json({ pending: true, token });
});

// Phone uploads using its auth token
router.post('/photo-session/upload-from-phone', auth, async (req, res) => {
  const token = userPending[req.user.id];
  if (!token || !photoSessions[token]) return res.status(404).json({ error: 'No PC waiting. Click "Add from Phone" on PC first.' });
  const { image, formData } = req.body;
  if (!image) return res.status(400).json({ error: 'No image' });
  photoSessions[token].image     = image;
  photoSessions[token].formData  = formData || null;
  photoSessions[token].timestamp = Date.now();
  delete userPending[req.user.id];
  res.json({ ok: true });
});

// PC polls for photo — MUST be before /:token
router.get('/photo-session/:token/poll', auth, (req, res) => {
  const s = photoSessions[req.params.token];
  if (!s) return res.json({ expired: true });
  if (s.image) {
    const image    = s.image;
    const formData = s.formData || null;
    s.image    = null;
    s.formData = null;
    return res.json({ ready: true, image, formData });
  }
  res.json({ ready: false });
});

// Phone POSTs the image — MUST be before /:token
router.post('/photo-session/:token/upload', (req, res) => {
  const s = photoSessions[req.params.token];
  if (!s) return res.status(404).json({ error: 'Session expired' });
  const { image, formData } = req.body;
  if (!image) return res.status(400).json({ error: 'No image' });
  s.image     = image;
  s.formData  = formData || null;
  s.timestamp = Date.now();
  res.json({ ok: true });
});

// Phone opens this URL (no auth — token is the secret)
router.get('/photo-session/:token', (req, res) => {
  const s = photoSessions[req.params.token];
  if (!s) return res.status(404).send(`
    <!DOCTYPE html><html><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Expired</title>
    <style>body{font-family:Arial;text-align:center;padding:40px;background:#0f1f3d;color:white}</style>
    </head><body>
    <div style="font-size:60px">⏱</div>
    <h2>Session Expired</h2>
    <p style="color:#c9a84c">Go back to the PC and click "Add from Phone" again.</p>
    </body></html>`);

  const tok = req.params.token;
  res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>Add Frame Photo — Wickramakalutota Opticals</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#0f1f3d;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
  .card{background:white;border-radius:20px;width:100%;max-width:380px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
  .hdr{background:#0f1f3d;padding:16px 20px;text-align:center}
  .hdr-shop{font-size:11px;color:#c9a84c;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px}
  .hdr-title{font-size:18px;color:white;font-weight:700}
  .body{padding:24px 20px}
  .preview-wrap{width:100%;aspect-ratio:4/3;background:#f8f5ef;border-radius:14px;overflow:hidden;margin-bottom:20px;display:flex;align-items:center;justify-content:center;border:2px dashed #e0ddd6;position:relative}
  .preview-wrap img{width:100%;height:100%;object-fit:cover}
  .preview-wrap .placeholder{text-align:center;color:#9ca3af}
  .placeholder-icon{font-size:48px;display:block;margin-bottom:8px}
  .placeholder-text{font-size:14px}
  .btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:16px;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;transition:opacity .15s}
  .btn:active{opacity:.8}
  .btn-take{background:#0f1f3d;color:#c9a84c;margin-bottom:12px}
  .btn-send{background:#c9a84c;color:#0f1f3d;margin-bottom:12px;display:none}
  .btn-retake{background:#f3f4f6;color:#374151;font-size:14px;padding:12px;display:none;margin-bottom:12px}
  .status{text-align:center;font-size:14px;min-height:20px;color:#6b7280}
  .done-screen{text-align:center;padding:32px 20px}
</style>
</head>
<body>
<div class="card">
  <div class="hdr">
    <div class="hdr-shop">Wickramakalutota Opticals</div>
    <div class="hdr-title">📷 Add Frame Photo</div>
  </div>
  <div class="body" id="mainBody">
    <div class="preview-wrap" id="previewWrap">
      <div class="placeholder" id="placeholder">
        <span class="placeholder-icon">🕶️</span>
        <span class="placeholder-text">Photo will appear here</span>
      </div>
      <img id="previewImg" style="display:none" alt="preview"/>
    </div>
    <input type="file" accept="image/*" capture="environment" id="fileInput" style="display:none">
    <div id="catSection" style="margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Select Category</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="cat-btn selected" data-cat="Frames" onclick="selectCat(this)" style="padding:10px;border-radius:10px;border:2px solid #0f1f3d;background:#0f1f3d;color:#c9a84c;font-size:13px;font-weight:700;cursor:pointer">🕶️ Frames</button>
        <button class="cat-btn" data-cat="Sunglasses" onclick="selectCat(this)" style="padding:10px;border-radius:10px;border:2px solid #e0ddd6;background:white;color:#6b7280;font-size:13px;font-weight:700;cursor:pointer">😎 Sunglasses</button>
        <button class="cat-btn" data-cat="Reading Glasses" onclick="selectCat(this)" style="padding:10px;border-radius:10px;border:2px solid #e0ddd6;background:white;color:#6b7280;font-size:13px;font-weight:700;cursor:pointer">👓 Reading Glasses</button>
        <button class="cat-btn" data-cat="Contact Lenses" onclick="selectCat(this)" style="padding:10px;border-radius:10px;border:2px solid #e0ddd6;background:white;color:#6b7280;font-size:13px;font-weight:700;cursor:pointer">👁️ Contact Lenses</button>
        <button class="cat-btn" data-cat="Accessories" onclick="selectCat(this)" style="padding:10px;border-radius:10px;border:2px solid #e0ddd6;background:white;color:#6b7280;font-size:13px;font-weight:700;cursor:pointer;grid-column:1/-1">🎒 Accessories</button>
      </div>
    </div>
    <button class="btn btn-take" id="btnTake" onclick="document.getElementById('fileInput').click()">📷 Take Photo</button>
    <button class="btn btn-send" id="btnSend">✅ Send to PC</button>
    <button class="btn btn-retake" id="btnRetake">🔄 Retake</button>
    <div class="status" id="status">Tap "Take Photo" to open your camera</div>
  </div>
</div>
<script>
const tok = '${tok}';
let b64 = null;
function selectCat(btn) {
  document.querySelectorAll('.cat-btn').forEach(b => { b.style.border='2px solid #e0ddd6'; b.style.background='white'; b.style.color='#6b7280'; b.classList.remove('selected'); });
  btn.style.border='2px solid #0f1f3d'; btn.style.background='#0f1f3d'; btn.style.color='#c9a84c'; btn.classList.add('selected');
}
const fileInput=document.getElementById('fileInput'), previewImg=document.getElementById('previewImg'),
      placeholder=document.getElementById('placeholder'), btnTake=document.getElementById('btnTake'),
      btnSend=document.getElementById('btnSend'), btnRetake=document.getElementById('btnRetake'),
      status=document.getElementById('status');
fileInput.onchange=async(e)=>{
  const file=e.target.files[0]; if(!file) return; status.textContent='Processing photo...';
  const raw=await new Promise(res=>{const r=new FileReader();r.onload=ev=>res(ev.target.result);r.readAsDataURL(file);});
  await new Promise(res=>{
    const img=new Image(); img.onload=()=>{
      const MAX=1000,ratio=Math.min(1,MAX/Math.max(img.width,img.height));
      const c=document.createElement('canvas'); c.width=Math.round(img.width*ratio); c.height=Math.round(img.height*ratio);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height); b64=c.toDataURL('image/jpeg',0.85);
      previewImg.src=b64; previewImg.style.display='block'; placeholder.style.display='none';
      btnTake.style.display='none'; btnSend.style.display='flex'; btnRetake.style.display='flex';
      status.textContent='Photo ready — tap Send to PC'; res();
    }; img.src=raw;
  });
};
btnRetake.onclick=()=>{
  b64=null; previewImg.style.display='none'; placeholder.style.display='block';
  btnSend.style.display='none'; btnRetake.style.display='none'; btnTake.style.display='flex';
  status.textContent='Tap "Take Photo" to open your camera'; fileInput.value='';
};
btnSend.onclick=async()=>{
  if(!b64) return; btnSend.disabled=true; btnRetake.disabled=true; status.textContent='Sending to PC...';
  const selCat=document.querySelector('.cat-btn.selected'); const category=selCat?selCat.dataset.cat:'Frames';
  try {
    const res=await fetch('/api/scan-session/photo-session/'+tok+'/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:b64,formData:{category}})});
    const data=await res.json();
    if(data.ok){document.getElementById('mainBody').innerHTML='<div class="done-screen"><div style="font-size:72px;margin-bottom:16px">✅</div><div style="font-size:22px;font-weight:700;color:#0f1f3d;margin-bottom:10px">Photo Sent!</div><div style="font-size:15px;color:#6b7280;line-height:1.6">The photo has appeared on the PC.<br>You can close this tab.</div></div>';}
    else{status.textContent='Failed: '+(data.error||'Unknown');btnSend.disabled=btnRetake.disabled=false;}
  } catch(e){status.textContent='Error — check internet connection';btnSend.disabled=btnRetake.disabled=false;}
};
</script>
</body>
</html>`);
});

module.exports = router;