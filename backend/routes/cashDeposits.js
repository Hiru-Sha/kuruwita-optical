// ============================================================
//  Cash Deposits Routes — /api/cash-deposits
//  Fixed:
//    A. Route shadow: /by-order/:order_id moved BEFORE /:id
//       so Express doesn't treat "by-order" as a deposit ID
//    J. Fragile try/catch fallback removed — order_id column
//       is guaranteed by server.js migration, so we insert
//       cleanly and let real errors surface
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/cash-deposits
router.get('/', auth, async (req, res) => {
  const { month, date } = req.query;
  try {
    let query  = `SELECT d.*, u.full_name AS added_by_name
                  FROM cash_deposits d LEFT JOIN users u ON d.added_by = u.id
                  WHERE 1=1`;
    const params = [];
    if (month) { params.push(month); query += ` AND TO_CHAR(d.date,'YYYY-MM') = $${params.length}`; }
    if (date)  { params.push(date);  query += ` AND d.date = $${params.length}`; }
    query += ` ORDER BY d.date DESC, d.created_at DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// ── Fix A: /by-order/:order_id MUST be before /:id ───────────
// Previously it was after /:id, so Express matched "by-order"
// as the deposit ID and never reached this handler.
router.get('/by-order/:order_id', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM cash_deposits WHERE order_id = $1 LIMIT 1`,
      [req.params.order_id]
    );
    res.json(r.rows[0] || null);
  } catch (err) {
    console.error('by-order fetch error:', err.message);
    res.json(null);
  }
});

// GET /api/cash-deposits/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM cash_deposits WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /api/cash-deposits
// Fix J: removed fragile try/catch fallback — order_id column
// is guaranteed by server.js startup migration.
router.post('/', auth, async (req, res) => {
  const { date, amount, bank_name, account_no, payment_type, reference, notes, order_id } = req.body;
  if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Amount required' });
  try {
    const result = await pool.query(
      `INSERT INTO cash_deposits
         (date, amount, bank_name, account_no, payment_type, reference, notes, added_by, order_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        date         || new Date().toISOString().split('T')[0],
        parseFloat(amount),
        bank_name    || null,
        account_no   || null,
        payment_type || 'online',
        reference    || null,
        notes        || null,
        req.user.id,
        order_id     || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// PATCH /api/cash-deposits/:id
router.patch('/:id', auth, async (req, res) => {
  const { amount, date, bank_name, reference, notes, payment_type } = req.body;
  const fields = [], vals = [];
  if (amount       !== undefined) { fields.push(`amount=$${fields.length+1}`);        vals.push(parseFloat(amount)); }
  if (date         !== undefined) { fields.push(`date=$${fields.length+1}`);          vals.push(date); }
  if (bank_name    !== undefined) { fields.push(`bank_name=$${fields.length+1}`);     vals.push(bank_name); }
  if (reference    !== undefined) { fields.push(`reference=$${fields.length+1}`);     vals.push(reference); }
  if (notes        !== undefined) { fields.push(`notes=$${fields.length+1}`);         vals.push(notes); }
  if (payment_type !== undefined) { fields.push(`payment_type=$${fields.length+1}`);  vals.push(payment_type); }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  vals.push(req.params.id);
  try {
    const r = await pool.query(
      `UPDATE cash_deposits SET ${fields.join(',')} WHERE id=$${vals.length} RETURNING *`, vals
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/cash-deposits/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cash_deposits WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;