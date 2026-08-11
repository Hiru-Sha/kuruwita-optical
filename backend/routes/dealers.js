// ============================================================
//  Dealers Routes — /api/dealers
//  Fixed:
//    Was querying wrong table 'purchases' — the system uses
//    'dealer_purchases' (managed by dealerPurchases.js).
//    The old 'purchases' table is a legacy stub in schema.sql.
//    All dealer purchase history now reads from dealer_purchases.
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/dealers — list all dealers with purchase summary
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*,
        COALESCE(p.purchase_count, 0) AS purchase_count,
        COALESCE(p.total_spent,    0) AS total_spent,
        p.last_order
      FROM dealers d
      LEFT JOIN (
        SELECT dealer_name,
               COUNT(*)        AS purchase_count,
               SUM(total_cost) AS total_spent,
               MAX(purchase_date) AS last_order
        FROM dealer_purchases
        GROUP BY dealer_name
      ) p ON LOWER(p.dealer_name) = LOWER(d.name)
      ORDER BY d.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Dealers GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch dealers' });
  }
});

// POST /api/dealers — add a new dealer
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
    console.error('Dealer POST error:', err.message);
    res.status(500).json({ error: 'Failed to add dealer' });
  }
});

// GET /api/dealers/:id/purchases — purchase history for one dealer
// Fixed: now reads from dealer_purchases, not the legacy 'purchases' table
router.get('/:id/purchases', auth, async (req, res) => {
  try {
    // Get dealer name first so we can match on dealer_name in dealer_purchases
    const dealer = await pool.query('SELECT * FROM dealers WHERE id = $1', [req.params.id]);
    if (!dealer.rows.length) return res.status(404).json({ error: 'Dealer not found' });

    const result = await pool.query(
      `SELECT * FROM dealer_purchases
       WHERE LOWER(dealer_name) = LOWER($1)
       ORDER BY purchase_date DESC, created_at DESC
       LIMIT 200`,
      [dealer.rows[0].name]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Dealer purchases GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// POST /api/dealers/:id/purchases — record a purchase for a dealer
// Fixed: inserts into dealer_purchases instead of legacy 'purchases' table
router.post('/:id/purchases', auth, async (req, res) => {
  const { description, quantity, unit_cost, purchase_date, notes, category } = req.body;
  if (!description || !quantity || !unit_cost) {
    return res.status(400).json({ error: 'description, quantity and unit_cost required' });
  }
  try {
    const dealer = await pool.query('SELECT * FROM dealers WHERE id = $1', [req.params.id]);
    if (!dealer.rows.length) return res.status(404).json({ error: 'Dealer not found' });

    const total_cost = parseFloat(unit_cost) * parseInt(quantity);
    const result = await pool.query(
      `INSERT INTO dealer_purchases
         (dealer_name, purchase_date, category, description, quantity, unit_cost, total_cost, notes, added_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        dealer.rows[0].name,
        purchase_date || new Date().toISOString().split('T')[0],
        category      || null,
        description,
        parseInt(quantity),
        parseFloat(unit_cost),
        total_cost,
        notes         || null,
        req.user.id,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Dealer purchase POST error:', err.message);
    res.status(500).json({ error: 'Failed to record purchase' });
  }
});

module.exports = router;