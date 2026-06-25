// ============================================================
//  Inventory Routes — /api/inventory
//  Fixed:
//    GET / now returns { data: [...], total: N } where total is
//    the REAL count of ALL matching items in the DB (ignores
//    the 500 LIMIT), so the frontend can show the true total.
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/inventory
router.get('/', auth, async (req, res) => {
  const { search, category, limit = 500, no_images } = req.query;
  const imageCol = no_images === '1' ? 'NULL::text AS image_url' : 'image_url';

  try {
    // ── Build shared WHERE clause ────────────────────────────
    let where  = ' WHERE 1=1';
    const params = [];

    if (search) {
      const terms = search.trim().split(/\s+/).filter(Boolean);
      terms.forEach(term => {
        params.push(`%${term}%`);
        const n = params.length;
        where += ` AND (
          name        ILIKE $${n} OR
          brand       ILIKE $${n} OR
          frame_name  ILIKE $${n} OR
          item_name   ILIKE $${n} OR
          rg_power    ILIKE $${n} OR
          REPLACE(name, '-', ' ') ILIKE $${n}
        )`;
      });
    }
    if (category && category !== 'All') {
      params.push(category);
      where += ` AND category = $${params.length}`;
    }

    // ── Count query — same WHERE, no LIMIT ──────────────────
    // This gives the REAL total so the dashboard KPI is correct.
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM inventory${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // ── Data query — with LIMIT ──────────────────────────────
    const dataParams = [...params, parseInt(limit)];
    const dataResult = await pool.query(
      `SELECT id, name, category, brand, dealer,
              frame_type, frame_color, frame_shape, frame_material, frame_size,
              sg_type, rg_lens_type, rg_material, rg_power, item_name,
              cost_price, sell_price, quantity, min_quantity,
              ${imageCol}, display_number, stock_number, location,
              notes, created_at, updated_at
       FROM inventory${where}
       ORDER BY id ASC
       LIMIT $${dataParams.length}`,
      dataParams
    );

    res.json({ data: dataResult.rows, total });
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
    display_number, stock_number, location,
  } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  try {
    const result = await pool.query(`
      INSERT INTO inventory (
        name, category, brand, dealer,
        frame_type, frame_color, frame_shape, frame_material, frame_size,
        sg_type, rg_lens_type, rg_material, rg_power, item_name,
        cost_price, sell_price, quantity, min_quantity, image_url,
        display_number, stock_number, location
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *`,
      [name.trim(), category||null, brand||null, dealer||null,
       frame_type||null, frame_color||null, frame_shape||null,
       frame_material||null, frame_size||null, sg_type||null,
       rg_lens_type||null, rg_material||null, rg_power||null, item_name||null,
       parseFloat(cost_price)||0, parseFloat(sell_price)||0,
       parseInt(quantity)||0, parseInt(min_quantity)||2, image_url||null,
       display_number||null, stock_number||null, location||'stock']
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
    display_number, stock_number, location, notes,
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
        stock_number   = COALESCE($19, stock_number),
        location       = COALESCE($20, location),
        notes          = COALESCE($21, notes),
        updated_at     = NOW()
      WHERE id = $22 RETURNING *`,
      [name, brand, dealer, category,
       frame_color, frame_type, frame_shape, frame_material, frame_size,
       sg_type, rg_power, item_name,
       sell_price, cost_price, quantity, min_quantity, image_url,
       display_number||null, stock_number||null, location||null, notes||null,
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