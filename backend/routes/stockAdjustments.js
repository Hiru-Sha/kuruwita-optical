// ============================================================
//  Stock Adjustments Routes — /api/stock-adjustments
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/stock-adjustments — all recent adjustments (for log page)
router.get('/', auth, async (req, res) => {
  const { limit = 50, inventory_id } = req.query;
  try {
    let query  = `SELECT * FROM stock_adjustments WHERE 1=1`;
    const params = [];
    if (inventory_id) {
      params.push(inventory_id);
      query += ` AND inventory_id = $${params.length}`;
    }
    params.push(parseInt(limit));
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// POST /api/stock-adjustments — record an adjustment + update inventory qty
router.post('/', auth, async (req, res) => {
  const { inventory_id, change_type, quantity_change, reason, notes } = req.body;

  if (!inventory_id || !change_type || !quantity_change || !reason) {
    return res.status(400).json({ error: 'inventory_id, change_type, quantity_change and reason required' });
  }
  if (!['add','remove','correction'].includes(change_type)) {
    return res.status(400).json({ error: 'change_type must be add, remove or correction' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current item
    const itemRes = await client.query(
      'SELECT id, name, quantity FROM inventory WHERE id = $1', [inventory_id]
    );
    if (!itemRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item not found' });
    }
    const item = itemRes.rows[0];

    // Calculate new quantity
    const qty_change = change_type === 'remove'
      ? -Math.abs(parseInt(quantity_change))
      : Math.abs(parseInt(quantity_change));

    const qty_before = parseInt(item.quantity);
    const qty_after  = Math.max(0, qty_before + qty_change);

    // Update inventory
    await client.query(
      'UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2',
      [qty_after, inventory_id]
    );

    // Log the adjustment
    const logRes = await client.query(`
      INSERT INTO stock_adjustments
        (inventory_id, item_name, change_type, quantity_change, quantity_before, quantity_after, reason, notes, adjusted_by, adjusted_by_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [inventory_id, item.name, change_type, qty_change, qty_before, qty_after,
       reason, notes||null, req.user.id, req.user.name||req.user.username]
    );

    await client.query('COMMIT');
    res.status(201).json({
      adjustment: logRes.rows[0],
      new_quantity: qty_after,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
