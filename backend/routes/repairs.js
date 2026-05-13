// ============================================================
//  Repairs Routes — /api/repairs
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// Generate repair number REP-XXXX
async function nextRepairNumber(client) {
  const res = await client.query(`SELECT NEXTVAL('repair_number_seq') AS n`);
  return 'REP-' + String(res.rows[0].n).padStart(4, '0');
}

// GET /api/repairs — list repairs
router.get('/', auth, async (req, res) => {
  const { month, status, limit = 100 } = req.query;
  try {
    let query  = `SELECT * FROM repairs WHERE 1=1`;
    const params = [];
    if (month) {
      params.push(month);
      query += ` AND TO_CHAR(created_at,'YYYY-MM') = $${params.length}`;
    }
    if (status && status !== 'all') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    params.push(parseInt(limit));
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/repairs/summary — stats for dashboard
router.get('/summary', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)                                             AS total,
        COALESCE(SUM(charge), 0)                            AS total_revenue,
        COALESCE(SUM(CASE WHEN TO_CHAR(created_at,'YYYY-MM')=TO_CHAR(NOW(),'YYYY-MM') THEN charge END), 0) AS this_month_revenue,
        COUNT(CASE WHEN TO_CHAR(created_at,'YYYY-MM')=TO_CHAR(NOW(),'YYYY-MM') THEN 1 END) AS this_month_count,
        COUNT(CASE WHEN status='pending' THEN 1 END)        AS pending_count,
        COUNT(CASE WHEN created_at::date=CURRENT_DATE THEN 1 END) AS today_count,
        COALESCE(SUM(CASE WHEN created_at::date=CURRENT_DATE THEN charge END), 0) AS today_revenue
      FROM repairs
    `);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /api/repairs — create repair
router.post('/', auth, async (req, res) => {
  const { customer_name, phone, repair_type, description, charge, payment_method, status, notes } = req.body;
  if (!repair_type) return res.status(400).json({ error: 'repair_type required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const repair_number = await nextRepairNumber(client);
    const result = await client.query(`
      INSERT INTO repairs
        (repair_number, customer_name, phone, repair_type, description, charge, payment_method, status, notes, added_by, completed_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [repair_number,
       customer_name?.trim()||null, phone?.trim()||null,
       repair_type, description?.trim()||null,
       parseFloat(charge)||0, payment_method||'cash',
       status||'done', notes?.trim()||null, req.user.id,
       (status||'done')==='done' ? new Date() : null]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally { client.release(); }
});

// PATCH /api/repairs/:id — update status
router.patch('/:id', auth, async (req, res) => {
  const { status, notes } = req.body;
  try {
    const result = await pool.query(`
      UPDATE repairs
      SET status=$1,
          notes=COALESCE($2, notes),
          completed_at=CASE WHEN $1='done' THEN NOW() ELSE completed_at END
      WHERE id=$3 RETURNING *`,
      [status, notes||null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// DELETE /api/repairs/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM repairs WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
