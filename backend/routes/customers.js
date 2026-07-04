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
    const params = [];
    let where = 'WHERE 1=1';
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`;
    }
    params.push(parseInt(limit));
    const sql = `
      SELECT
        c.*,
        COALESCE(o.total_orders, 0)   AS total_orders,
        COALESCE(o.total_spent, 0)    AS total_spent,
        COALESCE(o.total_balance, 0)  AS total_balance,
        COALESCE(o.rx_held, false)    AS rx_held
      FROM customers c
      LEFT JOIN (
        SELECT
          customer_id,
          COUNT(*)                          AS total_orders,
          COALESCE(SUM(total_amount), 0)
            + COALESCE((SELECT SUM(total)  FROM quick_sales WHERE customer_id = c.id), 0)
            + COALESCE((SELECT SUM(charge) FROM repairs     WHERE customer_id = c.id AND charge > 0), 0)
            AS total_spent,
          COALESCE(SUM(balance_amount), 0)  AS total_balance,
          BOOL_OR(has_rx AND NOT COALESCE(rx_returned, false)) AS rx_held
        FROM orders
        GROUP BY customer_id
      ) o ON o.customer_id = c.id
      ${where}
      ORDER BY c.name ASC
      LIMIT $${params.length}
    `;
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch(err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/customers/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const cust = await pool.query('SELECT * FROM customers WHERE id=$1', [req.params.id]);
    if (!cust.rows.length) return res.status(404).json({ error: 'Not found' });

    const orders = await pool.query(
      'SELECT * FROM orders WHERE customer_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    );

    // Get refractions — try dedicated table first
    let refractionRows = [];
    try {
      const rf = await pool.query(
        `SELECT r.*, o.order_number, o.created_at AS order_date
         FROM refractions r
         JOIN orders o ON r.order_id = o.id
         WHERE o.customer_id = $1
         ORDER BY r.created_at DESC`,
        [req.params.id]
      );
      refractionRows = rf.rows;
    } catch(e) { /* refractions table may not exist */ }

    // Fallback: get rx from orders table directly
    if (refractionRows.length === 0) {
      refractionRows = orders.rows.filter(o =>
        o.r_sph || o.l_sph || o.r_cyl || o.has_rx
      ).map(o => ({
        ...o, order_date: o.created_at,
      }));
    }

    // Quick Sales — match by customer_id OR name+phone
    let quickSales = [];
    try {
      const custRow = cust.rows[0];
      const qs = await pool.query(
        `SELECT id, sale_number, created_at, total, payment_method, items, customer_name
         FROM quick_sales
         WHERE customer_id = $1
            OR (customer_name ILIKE $2 AND customer_phone = $3)
         ORDER BY created_at DESC LIMIT 50`,
        [req.params.id, custRow.name || '', custRow.phone || '']
      );
      quickSales = qs.rows;
    } catch(e) { quickSales = []; }

    // Repairs — match by customer_id OR name+phone
    let repairs = [];
    try {
      const custRow = cust.rows[0];
      const rp = await pool.query(
        `SELECT id, repair_number, created_at, repair_type, description, charge, status, customer_name
         FROM repairs
         WHERE customer_id = $1
            OR (customer_name ILIKE $2 AND phone = $3)
         ORDER BY created_at DESC LIMIT 50`,
        [req.params.id, custRow.name || '', custRow.phone || '']
      );
      repairs = rp.rows;
    } catch(e) { repairs = []; }

    res.json({ data: cust.rows[0], orders: orders.rows, refractions: refractionRows, quickSales, repairs });
  } catch(err) {
    console.error('GET customer error:', err.message);
    res.status(500).json({ error: err.message });
  }
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

// PATCH /api/customers/:id/order-measurements — update PD and seg height on existing order
router.patch('/:id/order-measurements', auth, async (req, res) => {
  const { order_id, r_pd, l_pd, seg_height_r, seg_height_l } = req.body;
  if (!order_id) return res.status(400).json({ error: 'order_id required' });
  try {
    const fields = [], vals = [];
    if (r_pd        !== undefined) { fields.push(`r_pd = $${fields.length+1}`);          vals.push(r_pd); }
    if (l_pd        !== undefined) { fields.push(`l_pd = $${fields.length+1}`);          vals.push(l_pd); }
    if (seg_height_r!== undefined) { fields.push(`seg_height_r = $${fields.length+1}`); vals.push(seg_height_r); }
    if (seg_height_l!== undefined) { fields.push(`seg_height_l = $${fields.length+1}`); vals.push(seg_height_l); }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
    vals.push(order_id);
    await pool.query(`UPDATE orders SET ${fields.join(', ')} WHERE id = $${vals.length}`, vals);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;