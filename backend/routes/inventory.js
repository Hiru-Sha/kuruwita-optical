// ============================================================
//  Inventory Routes — /api/inventory
// ============================================================
const router    = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/inventory
router.get('/', auth, async (req, res) => {
  const { search, category, dealer: dealerFilter, limit = 5000, no_images } = req.query;

  // Skip image_url in list for speed — images loaded individually when needed
  const imageCol = no_images === '1' ? 'NULL::text AS image_url' : 'image_url';

  try {
    let sql = `
      SELECT id, name, category, brand, dealer,
             frame_type, frame_color, frame_shape, frame_material, frame_size,
             sg_type, rg_lens_type, rg_material, rg_power, item_name,
             cost_price, sell_price, quantity, min_quantity,
             ${imageCol}, display_number, stock_number, location, created_at, updated_at
      FROM inventory
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      // Search across name, brand, frame_name, item_name, rg_power — any word match
      const terms = search.trim().split(/\s+/).filter(Boolean);
      terms.forEach(term => {
        params.push(`%${term}%`);
        const n = params.length;
        sql += ` AND (
          name        ILIKE $${n} OR
          brand       ILIKE $${n} OR
          frame_name  ILIKE $${n} OR
          item_name   ILIKE $${n} OR
          rg_power    ILIKE $${n} OR
          dealer      ILIKE $${n} OR
          REPLACE(name, '-', ' ') ILIKE $${n}
        )`;
      });
    }
    if (category && category !== 'All') {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }
    params.push(parseInt(limit));
    if (dealerFilter) { params.push(`%${dealerFilter}%`); sql += ` AND dealer ILIKE $${params.length}`; }
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

// ── GET /api/inventory/:id/history — stock movement log ──────
router.get('/:id/history', auth, async (req, res) => {
  try {
    // Auto-create stock_adjustments if not yet created
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id              SERIAL PRIMARY KEY,
        inventory_id    INTEGER,
        item_name       VARCHAR(200),
        change_type     VARCHAR(20),
        quantity_change INTEGER,
        quantity_before INTEGER,
        quantity_after  INTEGER,
        reason          VARCHAR(100),
        notes           TEXT,
        adjusted_by     INTEGER,
        adjusted_by_name VARCHAR(100),
        created_at      TIMESTAMP DEFAULT NOW()
      )
    `).catch(()=>{});

    const limit = parseInt(req.query.limit) || 50;
    const rows = await pool.query(`
      SELECT sa.*,
             COALESCE(sa.adjusted_by_name, u.full_name, 'System') AS user_name
      FROM stock_adjustments sa
      LEFT JOIN users u ON sa.adjusted_by = u.id
      WHERE sa.inventory_id = $1
      ORDER BY sa.created_at DESC
      LIMIT $2
    `, [req.params.id, limit]);

    // Also get current item info
    const item = await pool.query('SELECT id, name, quantity FROM inventory WHERE id=$1', [req.params.id]);

    res.json({
      item:     item.rows[0] || null,
      history:  rows.rows,
      total:    rows.rowCount,
    });
  } catch(err) {
    console.error('History error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/dealers — list all unique dealer names
router.get('/dealers', require('../middleware/auth'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT dealer, COUNT(*) AS item_count
      FROM inventory
      WHERE dealer IS NOT NULL AND dealer != ''
      GROUP BY dealer
      ORDER BY dealer ASC
    `);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;