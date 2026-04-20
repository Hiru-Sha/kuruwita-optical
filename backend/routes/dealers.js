// ============================================================
//  Dealers Routes — /api/dealers
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/dealers
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*,
        COUNT(p.id)           AS purchase_count,
        MAX(p.purchased_at)   AS last_order
      FROM dealers d
      LEFT JOIN purchases p ON d.id = p.dealer_id
      GROUP BY d.id ORDER BY d.name`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dealers' });
  }
});

// POST /api/dealers
router.post('/', auth, async (req, res) => {
  const { name, area, phone, rep_name, categories } = req.body;
  if (!name) return res.status(400).json({ error: 'Dealer name required' });
  try {
    const result = await pool.query(
      'INSERT INTO dealers (name,area,phone,rep_name,categories) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, area||null, phone||null, rep_name||null, categories||[]]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add dealer' });
  }
});

// GET /api/dealers/:id/purchases
router.get('/:id/purchases', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM purchases WHERE dealer_id = $1 ORDER BY purchased_at DESC', [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// POST /api/dealers/:id/purchases
router.post('/:id/purchases', auth, async (req, res) => {
  const { items, amount, purchased_at } = req.body;
  if (!items || !amount) return res.status(400).json({ error: 'Items and amount required' });
  try {
    const result = await pool.query(
      'INSERT INTO purchases (dealer_id, items, amount, purchased_at) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, items, amount, purchased_at||new Date()]
    );
    // Update dealer total spent
    await pool.query(
      'UPDATE dealers SET total_spent = total_spent + $1 WHERE id = $2',
      [amount, req.params.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to record purchase' });
  }
});

module.exports = router;
