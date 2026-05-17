// ============================================================
//  customers.js — Railway/PostgreSQL backend
//  Fixed: same phone number can have multiple customers
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/customers
router.get('/', auth, async (req, res) => {
  const { search, limit = 200 } = req.query;
  try {
    let sql = `SELECT * FROM customers WHERE 1=1`;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length})`;
    }
    params.push(parseInt(limit));
    sql += ` ORDER BY name ASC LIMIT $${params.length}`;
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch(err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/customers/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const c = await pool.query('SELECT * FROM customers WHERE id=$1', [req.params.id]);
    if (!c.rows.length) return res.status(404).json({ error: 'Not found' });
    const orders = await pool.query(
      'SELECT * FROM orders WHERE customer_id=$1 ORDER BY created_at DESC', [req.params.id]
    );
    // Get refractions from the refractions table
    const refractions = await pool.query(`
      SELECT r.*, o.order_number, o.created_at as order_date
      FROM refractions r
      JOIN orders o ON r.order_id = o.id
      WHERE o.customer_id = $1
      ORDER BY r.created_at DESC
    `, [req.params.id]);
    res.json({ data: c.rows[0], orders: orders.rows, refractions: refractions.rows });
  } catch(err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /api/customers
// ── FIX: Never merge by phone — always create new customer ───
// Two people CAN share the same phone number (family, etc.)
// Only auto-match if BOTH name AND phone match exactly
router.post('/', auth, async (req, res) => {
  const { name, phone, age, address, email, force_new, title } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  try {
    // Only return existing customer if BOTH name AND phone match
    // force_new=true skips matching (used by bulk import)
    if (!force_new && phone?.trim()) {
      const existing = await pool.query(
        `SELECT * FROM customers WHERE name ILIKE $1 AND phone = $2 LIMIT 1`,
        [name.trim(), phone.trim()]
      );
      if (existing.rows.length) {
        return res.status(201).json({ data: existing.rows[0] });
      }
    }

    // Always create new — try with all fields, fallback to name+phone only
    let result;
    try {
      result = await pool.query(
        `INSERT INTO customers (name, phone, age, address, email)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [name.trim(), phone?.trim()||null, age||null, address||null, email||null]
      );
    } catch(insertErr) {
      // Fallback: some tables may not have all columns yet
      console.warn('Full insert failed, trying minimal:', insertErr.message);
      result = await pool.query(
        `INSERT INTO customers (name, phone) VALUES ($1, $2) RETURNING *`,
        [name.trim(), phone?.trim()||null]
      );
    }
    res.status(201).json({ data: result.rows[0] });
  } catch(err) { console.error('Customer create error:', err.message); res.status(500).json({ error: err.message }); }
});

// PATCH /api/customers/:id
router.patch('/:id', auth, async (req, res) => {
  const { name, phone, age, address, email } = req.body;
  try {
    const result = await pool.query(
      `UPDATE customers SET
        name    = COALESCE($1, name),
        phone   = COALESCE($2, phone),
        age     = COALESCE($3, age),
        address = COALESCE($4, address),
        email   = COALESCE($5, email),
        updated_at = NOW()
       WHERE id=$6 RETURNING *`,
      [name, phone, age, address, email, req.params.id]
    );
    res.json({ data: result.rows[0] });
  } catch(err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;