// ============================================================
//  Historical Records — Pre-system customer visit data
//  Simple CRUD for records from 2022 onwards before March 2026
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// Ensure table exists on first use
const ensureTable = () => pool.query(`
  CREATE TABLE IF NOT EXISTS historical_records (
    id            SERIAL PRIMARY KEY,
    visit_date    DATE         NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    phone         VARCHAR(20),
    age           VARCHAR(10),
    r_sph VARCHAR(10), r_cyl VARCHAR(10), r_axis VARCHAR(10),
    l_sph VARCHAR(10), l_cyl VARCHAR(10), l_axis VARCHAR(10),
    add_power     VARCHAR(10),
    frame         VARCHAR(150),
    lens_type     VARCHAR(80),
    lens_coating  VARCHAR(80),
    total_price   DECIMAL(10,2),
    advance_paid  DECIMAL(10,2),
    balance       DECIMAL(10,2),
    notes         TEXT,
    added_by      INTEGER REFERENCES users(id),
    created_at    TIMESTAMP DEFAULT NOW()
  )
`).catch(()=>{});

// GET /api/historical-records?search=&limit=&offset=&year=
router.get('/', auth, async (req, res) => {
  await ensureTable();
  const { search, limit=50, offset=0, year, month } = req.query;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (customer_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR frame ILIKE $${params.length})`;
    }
    if (year)  { params.push(year);  where += ` AND EXTRACT(YEAR FROM visit_date) = $${params.length}`; }
    if (month) { params.push(month); where += ` AND TO_CHAR(visit_date,'YYYY-MM') = $${params.length}`; }

    const countRes = await pool.query(`SELECT COUNT(*) AS total FROM historical_records ${where}`, params);
    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(
      `SELECT * FROM historical_records ${where} ORDER BY visit_date DESC, id DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    res.json({ records: result.rows, total: parseInt(countRes.rows[0].total) });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/historical-records/search-customer?phone=&name=
// Used to find if a walk-in customer has old records
router.get('/search-customer', auth, async (req, res) => {
  await ensureTable();
  const { phone, name } = req.query;
  try {
    const params = [];
    let where = 'WHERE 1=1';
    if (phone) { params.push(phone); where += ` AND phone ILIKE $${params.length}`; }
    if (name)  { params.push(`%${name}%`); where += ` AND customer_name ILIKE $${params.length}`; }
    const result = await pool.query(
      `SELECT * FROM historical_records ${where} ORDER BY visit_date DESC LIMIT 10`, params
    );
    res.json(result.rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// POST /api/historical-records — single or bulk
router.post('/', auth, async (req, res) => {
  await ensureTable();
  const records = Array.isArray(req.body) ? req.body : [req.body];
  if (!records.length) return res.status(400).json({ error: 'No records' });

  try {
    const saved = [];
    for (const r of records) {
      if (!r.customer_name || !r.visit_date) continue;
      const result = await pool.query(`
        INSERT INTO historical_records
          (visit_date, customer_name, phone, age,
           r_sph, r_cyl, r_axis, l_sph, l_cyl, l_axis, add_power,
           frame, lens_type, lens_coating,
           total_price, advance_paid, balance, notes, added_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        RETURNING *`,
        [ r.visit_date, r.customer_name, r.phone||null, r.age||null,
          r.r_sph||null, r.r_cyl||null, r.r_axis||null,
          r.l_sph||null, r.l_cyl||null, r.l_axis||null, r.add_power||null,
          r.frame||null, r.lens_type||null, r.lens_coating||null,
          r.total_price||null, r.advance_paid||null, r.balance||null,
          r.notes||null, req.user.id ]
      );
      saved.push(result.rows[0]);
    }
    res.status(201).json({ saved, count: saved.length });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/historical-records/:id
router.patch('/:id', auth, async (req, res) => {
  const r = req.body;
  try {
    const result = await pool.query(`
      UPDATE historical_records SET
        visit_date=$1, customer_name=$2, phone=$3, age=$4,
        r_sph=$5, r_cyl=$6, r_axis=$7, l_sph=$8, l_cyl=$9, l_axis=$10, add_power=$11,
        frame=$12, lens_type=$13, lens_coating=$14,
        total_price=$15, advance_paid=$16, balance=$17, notes=$18
      WHERE id=$19 RETURNING *`,
      [ r.visit_date, r.customer_name, r.phone||null, r.age||null,
        r.r_sph||null, r.r_cyl||null, r.r_axis||null,
        r.l_sph||null, r.l_cyl||null, r.l_axis||null, r.add_power||null,
        r.frame||null, r.lens_type||null, r.lens_coating||null,
        r.total_price||null, r.advance_paid||null, r.balance||null,
        r.notes||null, req.params.id ]
    );
    res.json(result.rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/historical-records/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM historical_records WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;