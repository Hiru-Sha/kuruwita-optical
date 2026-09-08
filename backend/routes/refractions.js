const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// POST /api/refractions — create new
router.post('/', auth, async (req, res) => {
  const { order_id, customer_id, r_sph, r_cyl, r_axis, r_add, r_va, r_pd, l_sph, l_cyl, l_axis, l_add, l_va, l_pd, notes } = req.body;
  if (!order_id) return res.status(400).json({ error: 'order_id required' });
  try {
    // Delete existing first to avoid duplicates
    await pool.query('DELETE FROM refractions WHERE order_id = $1', [order_id]);
    const result = await pool.query(`
      INSERT INTO refractions (order_id, customer_id, r_sph, r_cyl, r_axis, r_add, r_va, r_pd, l_sph, l_cyl, l_axis, l_add, l_va, l_pd, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [order_id, customer_id, r_sph||null, r_cyl||null, r_axis||null, r_add||null, r_va||null, r_pd||null,
       l_sph||null, l_cyl||null, l_axis||null, l_add||null, l_va||null, l_pd||null, notes||null]
    );
    res.status(201).json(result.rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/refractions/:id — update existing
router.put('/:id', auth, async (req, res) => {
  const { r_sph, r_cyl, r_axis, r_add, r_va, r_pd, l_sph, l_cyl, l_axis, l_add, l_va, l_pd, notes } = req.body;
  try {
    const result = await pool.query(`
      UPDATE refractions SET
        r_sph=$1, r_cyl=$2, r_axis=$3, r_add=$4, r_va=$5, r_pd=$6,
        l_sph=$7, l_cyl=$8, l_axis=$9, l_add=$10, l_va=$11, l_pd=$12, notes=$13
      WHERE id=$14 RETURNING *`,
      [r_sph||null, r_cyl||null, r_axis||null, r_add||null, r_va||null, r_pd||null,
       l_sph||null, l_cyl||null, l_axis||null, l_add||null, l_va||null, l_pd||null, notes||null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;/""