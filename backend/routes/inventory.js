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
             image_url, display_number, location, created_at, updated_at
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
       parseInt(quantity)||0, parseInt(min_quantity)||2, image_url||null,
       display_number||null, location||'stock']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// PATCH /api/inventory/:id
router.patch('/:id', auth, async (req, res) => {
  const {
    name, brand, dealer, category,
    frame_color, frame_type, frame_shape, frame_material, frame_size,
    sg_type, rg_power, item_name,
    sell_price, cost_price, quantity, min_quantity, image_url,
    display_number, location,
  } = req.body;
  try {
    const result = await pool.query(`
      UPDATE inventory SET
        name           = COALESCE($1,  name),
        brand          = COALESCE($2,  brand),
        dealer         = COALESCE($3,  dealer),
        category       = COALESCE($4,  category),
        frame_color    = COALESCE($5,  frame_color),
        frame_type     = COALESCE($6,  frame_type),
        frame_shape    = COALESCE($7,  frame_shape),
        frame_material = COALESCE($8,  frame_material),
        frame_size     = COALESCE($9,  frame_size),
        sg_type        = COALESCE($10, sg_type),
        rg_power       = COALESCE($11, rg_power),
        item_name      = COALESCE($12, item_name),
        sell_price     = COALESCE($13, sell_price),
        cost_price     = COALESCE($14, cost_price),
        quantity       = COALESCE($15, quantity),
        min_quantity   = COALESCE($16, min_quantity),
        image_url      = COALESCE($17, image_url),
        display_number = COALESCE($18, display_number),
        location       = COALESCE($19, location),
        updated_at     = NOW()
      WHERE id = $20 RETURNING *`,
      [name, brand, dealer, category,
       frame_color, frame_type, frame_shape, frame_material, frame_size,
       sg_type, rg_power, item_name,
       sell_price, cost_price, quantity, min_quantity, image_url,
       display_number || null, location || null,
       req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// DELETE /api/inventory/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
