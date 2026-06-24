// ============================================================
//  Expenses Routes — /api/expenses
//  Fixed: DELETE now requires admin role
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/expenses
router.get('/', auth, async (req, res) => {
  const { month, category } = req.query;
  try {
    let query  = `SELECT e.*, u.full_name AS added_by_name
                  FROM expenses e LEFT JOIN users u ON e.added_by = u.id
                  WHERE 1=1`;
    const params = [];
    if (month) {
      params.push(month);
      query += ` AND TO_CHAR(e.date,'YYYY-MM') = $${params.length}`;
    }
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND e.category = $${params.length}`;
    }
    query += ` ORDER BY e.date DESC, e.created_at DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/expenses/summary
router.get('/summary', auth, async (req, res) => {
  const { month } = req.query;
  const m = month || new Date().toISOString().slice(0, 7);
  try {
    const [byCat, totals] = await Promise.all([
      pool.query(`
        SELECT category, SUM(amount) AS total, COUNT(*) AS count
        FROM expenses
        WHERE TO_CHAR(date,'YYYY-MM') = $1
        GROUP BY category ORDER BY total DESC`, [m]),
      pool.query(`
        SELECT
          COALESCE(SUM(amount),0) AS month_total,
          COALESCE(SUM(CASE WHEN date = CURRENT_DATE THEN amount END),0) AS today_total,
          COUNT(*) AS count
        FROM expenses
        WHERE TO_CHAR(date,'YYYY-MM') = $1`, [m]),
    ]);
    res.json({ by_category: byCat.rows, totals: totals.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// POST /api/expenses
router.post('/', auth, async (req, res) => {
  const { date, category, description, amount, payment_method, notes } = req.body;
  if (!category || !description || !amount) {
    return res.status(400).json({ error: 'category, description and amount required' });
  }
  try {
    const result = await pool.query(`
      INSERT INTO expenses (date, category, description, amount, payment_method, notes, added_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        date || new Date().toISOString().split('T')[0],
        category, description,
        parseFloat(amount),
        payment_method || 'cash',
        notes || null,
        req.user.id,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// DELETE /api/expenses/:id — Fixed: admin only
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;