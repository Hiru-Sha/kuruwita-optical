// ============================================================
//  Cash Deposits Routes — /api/cash-deposits
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/cash-deposits — list with optional date/month filter
router.get('/', auth, async (req, res) => {
  const { month, date } = req.query;
  try {
    let query  = `SELECT d.*, u.full_name AS added_by_name
                  FROM cash_deposits d LEFT JOIN users u ON d.added_by = u.id
                  WHERE 1=1`;
    const params = [];
    if (month) {
      params.push(month);
      query += ` AND TO_CHAR(d.date,'YYYY-MM') = $${params.length}`;
    }
    if (date) {
      params.push(date);
      query += ` AND d.date = $${params.length}`;
    }
    query += ` ORDER BY d.date DESC, d.created_at DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// POST /api/cash-deposits — add deposit
router.post('/', auth, async (req, res) => {
  const { date, amount, bank_name, reference, notes } = req.body;
  if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Amount required' });
  try {
    const result = await pool.query(
      `INSERT INTO cash_deposits (date, amount, bank_name, reference, notes, added_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [date || new Date().toISOString().split('T')[0],
       parseFloat(amount), bank_name||null, reference||null, notes||null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// DELETE /api/cash-deposits/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cash_deposits WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
