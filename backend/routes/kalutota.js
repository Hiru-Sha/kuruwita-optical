// ============================================================
//  Kalutota Opticals Trade Account — /api/kalutota
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/kalutota — list transactions
router.get('/', auth, async (req, res) => {
  const { month, direction, status, limit = 200 } = req.query;
  try {
    let sql = `SELECT * FROM kalutota_transactions WHERE 1=1`;
    const params = [];
    if (month) {
      params.push(month);
      sql += ` AND TO_CHAR(date,'YYYY-MM') = $${params.length}`;
    }
    if (direction && direction !== 'all') {
      params.push(direction);
      sql += ` AND direction = $${params.length}`;
    }
    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND payment_status = $${params.length}`;
    }
    params.push(parseInt(limit));
    sql += ` ORDER BY date DESC, created_at DESC LIMIT $${params.length}`;
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/kalutota/summary — account balance summary
router.get('/summary', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        -- What they OWE you (took from you, unpaid)
        COALESCE(SUM(CASE WHEN direction='out' AND payment_status='pending'
          THEN total_amount - COALESCE(paid_amount,0) END), 0) AS they_owe_you,

        -- What YOU OWE them (they gave you, unpaid)
        COALESCE(SUM(CASE WHEN direction='in' AND payment_status='pending'
          THEN total_amount - COALESCE(paid_amount,0) END), 0) AS you_owe_them,

        -- Total value of goods gone out (they took)
        COALESCE(SUM(CASE WHEN direction='out' THEN total_amount END), 0) AS total_out_value,

        -- Total value of goods come in (they gave)
        COALESCE(SUM(CASE WHEN direction='in'  THEN total_amount END), 0) AS total_in_value,

        -- Total paid by them
        COALESCE(SUM(CASE WHEN direction='out' THEN paid_amount END), 0) AS total_paid_by_them,

        -- Total paid to them
        COALESCE(SUM(CASE WHEN direction='in'  THEN paid_amount END), 0) AS total_paid_to_them,

        COUNT(CASE WHEN direction='out' AND payment_status='pending' THEN 1 END) AS pending_out_count,
        COUNT(CASE WHEN direction='in'  AND payment_status='pending' THEN 1 END) AS pending_in_count,
        COUNT(*) AS total_transactions
      FROM kalutota_transactions
    `);

    const r = result.rows[0];
    // Net balance — positive = they owe you, negative = you owe them
    const net_balance = parseFloat(r.they_owe_you) - parseFloat(r.you_owe_them);

    res.json({ ...r, net_balance });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// POST /api/kalutota — add transaction
router.post('/', auth, async (req, res) => {
  const { date, direction, category, description, quantity, unit_price,
          payment_status, paid_amount, paid_date, payment_method, notes } = req.body;

  if (!direction || !description || !quantity || unit_price === undefined)
    return res.status(400).json({ error: 'direction, description, quantity and unit_price required' });

  const total_amount = parseFloat(unit_price) * parseInt(quantity);

  // If goods going OUT (they take from you) → deduct from inventory
  // If goods coming IN (they give you) → add to inventory
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO kalutota_transactions
        (date, direction, category, description, quantity, unit_price, total_amount,
         payment_status, paid_amount, paid_date, payment_method, notes, added_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [date || new Date().toISOString().split('T')[0],
       direction, category || null, description,
       parseInt(quantity), parseFloat(unit_price), total_amount,
       payment_status || 'pending',
       parseFloat(paid_amount) || 0,
       paid_date || null, payment_method || 'cash',
       notes || null, req.user.id]
    );

    // Auto-update inventory if category matches
    if (category && category !== 'Other') {
      const itemName = description.trim();
      const existing = await client.query(
        `SELECT id, quantity FROM inventory WHERE name ILIKE $1 LIMIT 1`, [itemName]
      );

      if (existing.rows.length) {
        const invId  = existing.rows[0].id;
        const change = direction === 'out'
          ? `quantity = GREATEST(0, quantity - ${parseInt(quantity)})`
          : `quantity = quantity + ${parseInt(quantity)}`;
        await client.query(`UPDATE inventory SET ${change}, updated_at=NOW() WHERE id=$1`, [invId]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally { client.release(); }
});

// PATCH /api/kalutota/:id — mark payment
router.patch('/:id', auth, async (req, res) => {
  const { payment_status, paid_amount, paid_date, payment_method, notes } = req.body;
  try {
    const result = await pool.query(`
      UPDATE kalutota_transactions
      SET payment_status  = COALESCE($1, payment_status),
          paid_amount     = COALESCE($2, paid_amount),
          paid_date       = COALESCE($3, paid_date),
          payment_method  = COALESCE($4, payment_method),
          notes           = COALESCE($5, notes)
      WHERE id = $6 RETURNING *`,
      [payment_status, paid_amount, paid_date, payment_method, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// DELETE /api/kalutota/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM kalutota_transactions WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
