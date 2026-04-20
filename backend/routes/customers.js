// ============================================================
//  Customers Routes — /api/customers
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/customers
router.get('/', auth, async (req, res) => {
  const { search } = req.query;
  try {
    let query = `
      SELECT c.*,
        COUNT(DISTINCT o.id)                         AS total_orders,
        COALESCE(SUM(o.balance_amount),0)            AS total_balance,
        COALESCE(SUM(o.total_amount),0)              AS total_spent,
        MAX(o.created_at)                            AS last_order_date,
        BOOL_OR(o.has_rx AND NOT o.rx_returned)      AS rx_held,
        MAX(CASE WHEN o.has_rx AND NOT o.rx_returned THEN o.rx_hospital END) AS rx_hospital
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` WHERE c.name ILIKE $1 OR c.phone ILIKE $1`;
    }
    query += ' GROUP BY c.id ORDER BY last_order_date DESC NULLS LAST';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/customers/:id — full profile with orders, refractions, comm logs
router.get('/:id', auth, async (req, res) => {
  try {
    const cust    = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (!cust.rows.length) return res.status(404).json({ error: 'Customer not found' });

    const orders  = await pool.query(
      'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC', [req.params.id]);
    const refs    = await pool.query(
      'SELECT * FROM refractions WHERE customer_id = $1 ORDER BY created_at DESC', [req.params.id]);
    const comms   = await pool.query(
      'SELECT cl.*, u.full_name AS logged_by_name FROM comm_logs cl LEFT JOIN users u ON cl.logged_by = u.id WHERE cl.customer_id = $1 ORDER BY cl.created_at DESC',
      [req.params.id]);

    res.json({
      ...cust.rows[0],
      orders:   orders.rows,
      refractions: refs.rows,
      comm_logs: comms.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// POST /api/customers
router.post('/', auth, async (req, res) => {
  const { name, age, phone, address } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });
  try {
    // check duplicate phone
    const dup = await pool.query('SELECT id FROM customers WHERE phone = $1', [phone]);
    if (dup.rows.length) return res.status(409).json({ error: 'Customer with this phone already exists', id: dup.rows[0].id });

    const result = await pool.query(
      'INSERT INTO customers (name, age, phone, address) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, age||null, phone, address||null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PATCH /api/customers/:id
router.patch('/:id', auth, async (req, res) => {
  const { name, age, phone, address } = req.body;
  try {
    const result = await pool.query(
      'UPDATE customers SET name=$1, age=$2, phone=$3, address=$4 WHERE id=$5 RETURNING *',
      [name, age||null, phone, address||null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// POST /api/customers/:id/commlogs
router.post('/:id/commlogs', auth, async (req, res) => {
  const { type, note } = req.body;
  if (!note) return res.status(400).json({ error: 'Note required' });
  try {
    const result = await pool.query(
      'INSERT INTO comm_logs (customer_id, type, note, logged_by) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, type||'note', note, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add log' });
  }
});

module.exports = router;
