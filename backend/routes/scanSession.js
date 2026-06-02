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

// PC calls this to create a photo session token
router.post('/photo-session', auth, (req, res) => {
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  photoSessions[token] = {
    image:     null,
    userId:    req.user.id,
    timestamp: Date.now(),
  };
  // Clean old sessions (older than 10 min)
  Object.keys(photoSessions).forEach(k => {
    if (Date.now() - photoSessions[k].timestamp > 600000) delete photoSessions[k];
  });
  res.json({ token });
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
  if (!s) return res.status(404).send('<h2>Session expired. Please scan the QR again.</h2>');
  // Return a simple mobile upload page
  res.send(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>Upload Photo — Wickramakalutota Opticals</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;background:#0f1f3d;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:white;border-radius:16px;padding:28px 24px;width:100%;max-width:380px;text-align:center}
  h2{font-size:18px;color:#0f1f3d;margin-bottom:6px}
  p{font-size:13px;color:#6b7280;margin-bottom:20px}
  .btn{display:block;width:100%;padding:14px;border-radius:12px;border:none;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:12px;font-family:inherit}
  .btn-primary{background:#c9a84c;color:#0f1f3d}
  .btn-secondary{background:#f3f4f6;color:#374151}
  .preview{width:100%;border-radius:10px;margin-bottom:16px;display:none}
  .status{font-size:13px;color:#6b7280;margin-top:8px}
  .success{color:#2d7a4f;font-weight:700;font-size:16px}
</style>
</head>
<body>
<div class="card">
  <div style="font-size:40px;margin-bottom:12px">📷</div>
  <h2>Upload Frame Photo</h2>
  <p>Wickramakalutota Opticals<br>Take or choose a photo to add to inventory</p>
  <img id="preview" class="preview"/>
  <label class="btn btn-primary" style="display:block;cursor:pointer">
    📷 Take / Choose Photo
    <input type="file" accept="image/*" id="fileInput" style="display:none"/>
  </label>
  <button class="btn btn-secondary" id="uploadBtn" style="display:none">✅ Send to PC</button>
  <div class="status" id="status"></div>
</div>
<script>
  const token = '${req.params.token}';
  const fileInput = document.getElementById('fileInput');
  const preview   = document.getElementById('preview');
  const uploadBtn = document.getElementById('uploadBtn');
  const status    = document.getElementById('status');
  let   b64image  = null;

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      // Compress image
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 800;
        const ratio = Math.min(1, maxW / img.width);
        canvas.width  = img.width  * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        b64image = canvas.toDataURL('image/jpeg', 0.8);
        preview.src = b64image;
        preview.style.display = 'block';
        uploadBtn.style.display = 'block';
        status.textContent = 'Photo ready — tap Send to PC';
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  uploadBtn.addEventListener('click', async () => {
    if (!b64image) return;
    uploadBtn.disabled = true;
    status.textContent = 'Sending...';
    try {
      const res = await fetch('/api/scan-session/photo-session/${req.params.token}/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64image }),
      });
      const data = await res.json();
      if (data.ok) {
        status.innerHTML = '<span class="success">✅ Photo sent to PC!</span>';
        uploadBtn.style.display = 'none';
      } else {
        status.textContent = 'Failed: ' + (data.error || 'Unknown error');
        uploadBtn.disabled = false;
      }
    } catch(e) {
      status.textContent = 'Error: ' + e.message;
      uploadBtn.disabled = false;
    }
  });
</script>
</body></html>`);
});

// Routes moved above /:token to fix Express route matching order