const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// Migration — run on first load
const migrate = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lens_stock (
      id            SERIAL PRIMARY KEY,
      lens_type     VARCHAR(50)  NOT NULL,  -- Single Vision, Bifocal, Progressive
      lens_coating  VARCHAR(50)  DEFAULT '', -- Blue Cut, Photochromic, HMC etc
      lens_index    VARCHAR(20)  DEFAULT 'CR39',
      sph_r         VARCHAR(10)  DEFAULT '',
      cyl_r         VARCHAR(10)  DEFAULT '',
      sph_l         VARCHAR(10)  DEFAULT '',
      cyl_l         VARCHAR(10)  DEFAULT '',
      is_single_side BOOLEAN    DEFAULT FALSE, -- true = 1 side only
      quantity      INTEGER      DEFAULT 1,
      buy_price     DECIMAL(10,2) DEFAULT 0,
      sell_price    DECIMAL(10,2) DEFAULT 0,
      supplier      VARCHAR(100) DEFAULT '',
      notes         TEXT         DEFAULT '',
      added_by      INTEGER,
      created_at    TIMESTAMP    DEFAULT NOW(),
      updated_at    TIMESTAMP    DEFAULT NOW()
    )
  `).catch(()=>{});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_lens_stock_type ON lens_stock(lens_type)`).catch(()=>{});
};
migrate();

// GET /api/lens-stock
router.get('/', auth, async (req, res) => {
  const { type, coating, search } = req.query;
  try {
    let sql = `SELECT * FROM lens_stock WHERE quantity >= 0`;
    const params = [];
    if (type)   { params.push(type);              sql += ` AND lens_type = $${params.length}`; }
    if (coating){ params.push(coating);            sql += ` AND lens_coating = $${params.length}`; }
    if (search) { params.push(`%${search}%`);     sql += ` AND (lens_type ILIKE $${params.length} OR lens_coating ILIKE $${params.length} OR sph_r ILIKE $${params.length} OR sph_l ILIKE $${params.length} OR supplier ILIKE $${params.length})`; }
    sql += ` ORDER BY lens_type, lens_coating, sph_r, sph_l, created_at DESC`;
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// POST /api/lens-stock
router.post('/', auth, async (req, res) => {
  const { lens_type, lens_coating, lens_index, sph_r, cyl_r, sph_l, cyl_l, is_single_side, quantity, buy_price, sell_price, supplier, notes } = req.body;
  if (!lens_type) return res.status(400).json({ error: 'Lens type required' });
  try {
    const result = await pool.query(`
      INSERT INTO lens_stock
        (lens_type, lens_coating, lens_index, sph_r, cyl_r, sph_l, cyl_l, is_single_side, quantity, buy_price, sell_price, supplier, notes, added_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [lens_type, lens_coating||'', lens_index||'CR39', sph_r||'', cyl_r||'', sph_l||'', cyl_l||'', is_single_side||false, parseInt(quantity)||1, parseFloat(buy_price)||0, parseFloat(sell_price)||0, supplier||'', notes||'', req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/lens-stock/:id — update quantity or price
router.patch('/:id', auth, async (req, res) => {
  const allowed = ['quantity','buy_price','sell_price','notes','supplier','lens_coating','lens_index','sph_r','cyl_r','sph_l','cyl_l','is_single_side'];
  const sets = []; const vals = [];
  allowed.forEach(k => { if (req.body[k] !== undefined) { vals.push(req.body[k]); sets.push(`${k}=$${vals.length}`); } });
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  vals.push(req.params.id);
  try {
    const result = await pool.query(`UPDATE lens_stock SET ${sets.join(',')}, updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals);
    res.json(result.rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/lens-stock/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM lens_stock WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/lens-stock/summary — counts by type
router.get('/summary', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT lens_type, lens_coating, lens_index,
             COUNT(*) AS variants,
             SUM(quantity) AS total_qty,
             SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) AS out_of_stock,
             SUM(quantity * buy_price) AS total_value
      FROM lens_stock
      GROUP BY lens_type, lens_coating, lens_index
      ORDER BY lens_type, lens_coating
    `);
    res.json(result.rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;