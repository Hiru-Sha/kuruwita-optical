// ============================================================
//  Inventory Routes — /api/inventory
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/inventory
router.get('/', auth, async (req, res) => {
  const { search, category, limit = 500 } = req.query;

  try {
    let sql = `
      SELECT id, name, category, brand, dealer,
             frame_type, frame_color, frame_shape, frame_material, frame_size,
             sg_type, rg_lens_type, rg_material, rg_power, item_name,
             cost_price, sell_price, quantity, min_quantity,
             image_url, created_at, updated_at
      FROM inventory
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND name ILIKE $${params.length}`;
    }
    if (category && category !== 'All') {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }
    params.push(parseInt(limit));
    sql += ` ORDER BY category ASC, name ASC LIMIT $${params.length}`;

    const result = await pool.query(sql, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed' });
  }
});

// GET /api/inventory/:id — single item WITH image
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /api/inventory
router.post('/', auth, async (req, res) => {
  const {
    name, category, brand, dealer,
    frame_type, frame_color, frame_shape, frame_material, frame_size,
    sg_type, rg_lens_type, rg_material, rg_power, item_name,
    cost_price, sell_price, quantity, min_quantity, image_url,
  } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  try {
    const result = await pool.query(`
      INSERT INTO inventory (
        name, category, brand, dealer,
        frame_type, frame_color, frame_shape, frame_material, frame_size,
        sg_type, rg_lens_type, rg_material, rg_power, item_name,
        cost_price, sell_price, quantity, min_quantity, image_url
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *`,
      [name.trim(), category||null, brand||null, dealer||null,
       frame_type||null, frame_color||null, frame_shape||null,
       frame_material||null, frame_size||null, sg_type||null,
       rg_lens_type||null, rg_material||null, rg_power||null, item_name||null,
       parseFloat(cost_price)||0, parseFloat(sell_price)||0,
       parseInt(quantity)||0, parseInt(min_quantity)||2, image_url||null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// PATCH /api/inventory/:id
router.patch('/:id', auth, async (req, res) => {
  const { sell_price, cost_price, quantity, min_quantity, dealer, image_url, name } = req.body;
  try {
    const result = await pool.query(`
      UPDATE inventory SET
        sell_price   = COALESCE($1, sell_price),
        cost_price   = COALESCE($2, cost_price),
        quantity     = COALESCE($3, quantity),
        min_quantity = COALESCE($4, min_quantity),
        dealer       = COALESCE($5, dealer),
        image_url    = COALESCE($6, image_url),
        name         = COALESCE($7, name),
        updated_at   = NOW()
      WHERE id = $8 RETURNING *`,
      [sell_price, cost_price, quantity, min_quantity, dealer, image_url, name, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// DELETE /api/inventory/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
