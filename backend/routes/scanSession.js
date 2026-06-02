// ============================================================
//  scanSession.js — Mobile QR → PC order workflow
//  Mobile scans QR → POST /api/scan-session
//  PC polls GET /api/scan-session → sees item → opens order
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// In-memory store per shop (keyed by user id)
// { userId: { item, action, timestamp } }
const sessions = {};

// POST /api/scan-session — mobile posts scanned item + chosen action
router.post('/', auth, async (req, res) => {
  const { inventory_id, action } = req.body; // action: 'new_order' | 'quick_sale'
  if (!inventory_id) return res.status(400).json({ error: 'inventory_id required' });

  try {
    const item = await pool.query('SELECT * FROM inventory WHERE id = $1', [inventory_id]);
    if (!item.rows.length) return res.status(404).json({ error: 'Item not found' });

    sessions[req.user.id] = {
      item:      item.rows[0],
      action:    action || 'new_order',
      timestamp: Date.now(),
    };

    res.json({ ok: true, item: item.rows[0] });
  } catch(e) {
    console.error('Scan session error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/scan-session — PC polls this every 2s
router.get('/', auth, (req, res) => {
  const session = sessions[req.user.id];
  if (!session) return res.json({ pending: false });

  // Sessions expire after 60 seconds
  if (Date.now() - session.timestamp > 60000) {
    delete sessions[req.user.id];
    return res.json({ pending: false });
  }

  res.json({ pending: true, item: session.item, action: session.action });
});

// DELETE /api/scan-session — PC clears after picking up
router.delete('/', auth, (req, res) => {
  delete sessions[req.user.id];
  res.json({ ok: true });
});

module.exports = router;

// ── Photo upload session ──────────────────────────────────────
// PC generates a session token → shows as QR
// Phone opens URL, takes photo, POSTs base64 image
// PC polls and receives the photo

const photoSessions = {}; // token → { image, timestamp, userId }
const userPending   = {}; // userId → token  (active PC waiting session)

// PC calls this to create a photo session token
router.post('/photo-session', auth, (req, res) => {
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  photoSessions[token] = {
    image:     null,
    userId:    req.user.id,
    timestamp: Date.now(),
  };
  // Link this token to the user — so phone can find it without knowing the token
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

// Phone checks if PC is waiting for a photo from this user
router.get('/photo-session/pending', auth, (req, res) => {
  const token = userPending[req.user.id];
  if (!token || !photoSessions[token]) return res.json({ pending: false });
  res.json({ pending: true, token });
});

// Phone uploads directly using its auth token (no need to know session token)
router.post('/photo-session/upload-from-phone', auth, async (req, res) => {
  const token = userPending[req.user.id];
  if (!token || !photoSessions[token]) return res.status(404).json({ error: 'No PC waiting. Click "Add from Phone" on PC first.' });
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'No image' });
  photoSessions[token].image     = image;
  photoSessions[token].timestamp = Date.now();
  delete userPending[req.user.id]; // clear pending — only one photo per session
  res.json({ ok: true });
});

// PC polls this to check if photo has arrived — MUST be before /:token route
router.get('/photo-session/:token/poll', auth, (req, res) => {
  const s = photoSessions[req.params.token];
  if (!s) return res.json({ expired: true });
  if (s.image) {
    const image = s.image;
    s.image = null; // consume once
    return res.json({ ready: true, image });
  }
  res.json({ ready: false });
});

// Phone POSTs the image here — MUST be before /:token route
router.post('/photo-session/:token/upload', (req, res) => {
  const s = photoSessions[req.params.token];
  if (!s) return res.status(404).json({ error: 'Session expired' });
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'No image' });
  s.image     = image;
  s.timestamp = Date.now();
  res.json({ ok: true });
});

// Phone opens this URL (no auth needed — token is the secret)
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
    <!-- Preview area -->
    <div class="preview-wrap" id="previewWrap">
      <div class="placeholder" id="placeholder">
        <span class="placeholder-icon">🕶️</span>
        <span class="placeholder-text">Photo will appear here</span>
      </div>
      <img id="previewImg" style="display:none" alt="preview"/>
    </div>

    <!-- Camera input — opens phone camera -->
    <input type="file" accept="image/*" capture="environment" id="fileInput" style="display:none">

    <button class="btn btn-take" id="btnTake" onclick="document.getElementById('fileInput').click()">
      📷 Take Photo
    </button>
    <button class="btn btn-send" id="btnSend">
      ✅ Send to PC
    </button>
    <button class="btn btn-retake" id="btnRetake">
      🔄 Retake
    </button>

    <div class="status" id="status">Tap "Take Photo" to open your camera</div>
  </div>
</div>

<script>
const tok = '${tok}';
let b64 = null;

const fileInput = document.getElementById('fileInput');
const previewImg = document.getElementById('previewImg');
const placeholder = document.getElementById('placeholder');
const btnTake = document.getElementById('btnTake');
const btnSend = document.getElementById('btnSend');
const btnRetake = document.getElementById('btnRetake');
const status = document.getElementById('status');

fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  status.textContent = 'Processing photo...';

  // Read file
  const raw = await new Promise(res => {
    const r = new FileReader();
    r.onload = ev => res(ev.target.result);
    r.readAsDataURL(file);
  });

  // Compress: max 1000px, 85% quality
  await new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1000;
      const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width  = Math.round(img.width  * ratio);
      c.height = Math.round(img.height * ratio);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      b64 = c.toDataURL('image/jpeg', 0.85);

      // Show preview
      previewImg.src = b64;
      previewImg.style.display = 'block';
      placeholder.style.display = 'none';
      btnTake.style.display = 'none';
      btnSend.style.display = 'flex';
      btnRetake.style.display = 'flex';
      status.textContent = 'Photo ready — tap Send to PC';
      res();
    };
    img.src = raw;
  });
};

btnRetake.onclick = () => {
  b64 = null;
  previewImg.style.display = 'none';
  placeholder.style.display = 'block';
  btnSend.style.display = 'none';
  btnRetake.style.display = 'none';
  btnTake.style.display = 'flex';
  status.textContent = 'Tap "Take Photo" to open your camera';
  fileInput.value = '';
};

btnSend.onclick = async () => {
  if (!b64) return;
  btnSend.disabled = true;
  btnRetake.disabled = true;
  status.textContent = 'Sending to PC...';
  try {
    const res = await fetch('/api/scan-session/photo-session/' + tok + '/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: b64 }),
    });
    const data = await res.json();
    if (data.ok) {
      document.getElementById('mainBody').innerHTML = \`
        <div class="done-screen">
          <div style="font-size:72px;margin-bottom:16px">✅</div>
          <div style="font-size:22px;font-weight:700;color:#0f1f3d;margin-bottom:10px">Photo Sent!</div>
          <div style="font-size:15px;color:#6b7280;line-height:1.6">The photo has appeared on the PC.<br>You can close this tab.</div>
        </div>\`;
    } else {
      status.textContent = 'Failed: ' + (data.error || 'Unknown');
      btnSend.disabled = btnRetake.disabled = false;
    }
  } catch(e) {
    status.textContent = 'Error — check internet connection';
    btnSend.disabled = btnRetake.disabled = false;
  }
};
</script>
</body>
</html>`);
});
// Routes moved above /:token to fix Express route matching order