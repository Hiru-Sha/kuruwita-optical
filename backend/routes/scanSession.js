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