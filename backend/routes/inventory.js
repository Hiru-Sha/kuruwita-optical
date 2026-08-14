// ============================================================
//  Inventory Routes — /api/inventory
//  Fixed:
//    Bug #7 — PATCH now allows clearing fields to null.
//    Instead of COALESCE (which ignores null), we only update
//    fields that are explicitly present in the request body.
//    Sending null for a field will now clear it in the DB.
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/inventory
router.get('/', auth, async (req, res) => {
  const { search, category, dealer: dealerFilter, limit = 5000, no_images } = req.query;
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

// GET /api/inventory/dealers — must be BEFORE /:id
router.get('/dealers', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT dealer, COUNT(*) AS item_count
      FROM inventory
      WHERE dealer IS NOT NULL AND dealer != ''
      GROUP BY dealer
      ORDER BY dealer ASC
    `);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
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

// ── PATCH /api/inventory/:id ──────────────────────────────────
// Bug #7 Fix: Build SET clause dynamically from only the fields
// present in req.body. This means:
//   - Omitting a field → keeps the old DB value (no change)
//   - Sending a value  → updates to that value
//   - Sending null     → clears the field to NULL in the DB
// Previously COALESCE prevented null from ever being saved.
router.patch('/:id', auth, async (req, res) => {
  const allowed = [
    'name', 'brand', 'dealer', 'category',
    'frame_color', 'frame_type', 'frame_shape', 'frame_material', 'frame_size',
    'sg_type', 'rg_lens_type', 'rg_material', 'rg_power', 'item_name',
    'sell_price', 'cost_price', 'quantity', 'min_quantity', 'image_url',
    'display_number', 'stock_number', 'location', 'notes',
  ];

  const fields = [];
  const values = [];

  allowed.forEach(f => {
    if (Object.prototype.hasOwnProperty.call(req.body, f)) {
      fields.push(`${f} = $${fields.length + 1}`);
      // Keep null as null so fields can be cleared;
      // coerce numeric types, leave text as-is
      if (f === 'sell_price' || f === 'cost_price') {
        values.push(req.body[f] === null || req.body[f] === '' ? null : parseFloat(req.body[f]));
      } else if (f === 'quantity' || f === 'min_quantity') {
        values.push(req.body[f] === null || req.body[f] === '' ? null : parseInt(req.body[f]));
      } else {
        values.push(req.body[f] === '' ? null : req.body[f]);
      }
    }
  });

  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

  fields.push('updated_at = NOW()');
  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE inventory SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed' });
  }
});

// DELETE /api/inventory/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /api/inventory/:id/history — stock movement log
router.get('/:id/history', auth, async (req, res) => {
  try {
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

    const item = await pool.query(
      'SELECT id, name, quantity FROM inventory WHERE id=$1', [req.params.id]
    );

    res.json({
      item:    item.rows[0] || null,
      history: rows.rows,
      total:   rows.rowCount,
    });
  } catch (err) {
    console.error('History error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/:id/add-stock — add new batch of stock to existing item
router.post('/:id/add-stock', auth, async (req, res) => {
  const { quantity, cost_price, sell_price, dealer, notes } = req.body;
  const qty = parseInt(quantity);
  if (!qty || qty < 1) return res.status(400).json({ error: 'Invalid quantity' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current item
    const item = await client.query('SELECT * FROM inventory WHERE id=$1', [req.params.id]);
    if (!item.rows.length) return res.status(404).json({ error: 'Item not found' });
    const it = item.rows[0];

    // Update quantity, optionally update dealer/sell_price
    const updates = { quantity: (parseInt(it.quantity)||0) + qty };
    if (dealer)     updates.dealer     = dealer;
    if (sell_price) updates.sell_price = parseFloat(sell_price);
    if (cost_price) updates.cost_price = parseFloat(cost_price);

    const setClauses = Object.keys(updates).map((k,i) => `${k}=$${i+2}`).join(', ');
    const vals = [req.params.id, ...Object.values(updates)];
    const updated = await client.query(
      `UPDATE inventory SET ${setClauses}, updated_at=NOW() WHERE id=$1 RETURNING *`, vals
    );

    // Log to stock_adjustments
    await client.query(
      `INSERT INTO stock_adjustments
         (inventory_id, item_name, change_type, quantity_change, reason, notes, adjusted_by)
       VALUES ($1,$2,'add',$3,'New Stock',$4,$5)`,
      [req.params.id, it.name, qty, notes || `New stock — ${dealer||it.dealer||'unknown dealer'}`, req.user.id]
    ).catch(() => {});

    // Record dealer purchase expense if cost price provided
    if (cost_price && parseFloat(cost_price) > 0) {
      const totalCost = parseFloat(cost_price) * qty;
      await client.query(
        `INSERT INTO dealer_purchases (inventory_id, item_name, dealer, quantity, cost_price, total_cost, purchase_date, added_by)
         VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7)`,
        [req.params.id, it.name, dealer||it.dealer||'Unknown', qty, parseFloat(cost_price), totalCost, req.user.id]
      ).catch(() => {});
    }

    await client.query('COMMIT');
    res.json({ ...updated.rows[0], message: `Added ${qty} units to ${it.name}` });
  } catch(err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

module.exports = router;