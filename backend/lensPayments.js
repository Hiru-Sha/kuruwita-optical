const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// Auto-create table
pool.query(`
  CREATE TABLE IF NOT EXISTS lens_payments (
    id          SERIAL PRIMARY KEY,
    date        DATE NOT NULL,
    pay_method  VARCHAR(20) DEFAULT 'cash',
    total       DECIMAL(10,2) DEFAULT 0,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    rows        JSONB NOT NULL DEFAULT '[]',
    created_by  INTEGER,
    created_at  TIMESTAMP DEFAULT NOW()
  )
`).catch(()=>{});

// GET all payments
router.get('/', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM lens_payments ORDER BY created_at DESC LIMIT 100');
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST save payment
router.post('/', auth, async (req, res) => {
  const { date, pay_method, total, paid_amount, rows } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO lens_payments (date, pay_method, total, paid_amount, rows, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [date, pay_method||'cash', parseFloat(total)||0, parseFloat(paid_amount)||0, JSON.stringify(rows||[]), req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM lens_payments WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;