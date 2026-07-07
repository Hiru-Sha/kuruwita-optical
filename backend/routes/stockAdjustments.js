// ============================================================
//  Stock Adjustments Routes — /api/stock-adjustments
//
//  ACCOUNTING FIX:
//  - Snapshots cost_price at time of adjustment (unit_cost column)
//  - For 'Free gift' adjustments: updates order.gift_cost
//    so Reports can include gift COGS accurately
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/stock-adjustments
router.get('/', auth, async (req, res) => {
  const { limit = 50, inventory_id } = req.query;
  try {
    // Ensure table exists before querying
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id SERIAL PRIMARY KEY, inventory_id INTEGER, item_name VARCHAR(200),
        change_type VARCHAR(20), quantity_change INTEGER, quantity_before INTEGER,
        quantity_after INTEGER, reason VARCHAR(100), notes TEXT, unit_cost DECIMAL(10,2),
        adjusted_by INTEGER, adjusted_by_name VARCHAR(100), order_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `).catch(()=>{});

    let query  = `SELECT sa.*, i.sell_price, i.cost_price AS current_cost
                  FROM stock_adjustments sa
                  LEFT JOIN inventory i ON i.id = sa.inventory_id
                  WHERE 1=1`;
    const params = [];
    if (inventory_id) {
      params.push(inventory_id);
      query += ` AND sa.inventory_id = $${params.length}`;
    }
    params.push(parseInt(limit));
    query += ` ORDER BY sa.created_at DESC LIMIT $${params.length}`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// POST /api/stock-adjustments — record adjustment + update inventory + snapshot cost
router.post('/', auth, async (req, res) => {
  // Auto-create table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id               SERIAL PRIMARY KEY,
      inventory_id     INTEGER,
      item_name        VARCHAR(200),
      change_type      VARCHAR(20),
      quantity_change  INTEGER,
      quantity_before  INTEGER,
      quantity_after   INTEGER,
      reason           VARCHAR(100),
      notes            TEXT,
      adjusted_by      INTEGER,
      adjusted_by_name VARCHAR(100),
      unit_cost        DECIMAL(10,2),
      order_id         INTEGER,
      created_at       TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});

  const { inventory_id, change_type, quantity_change, reason, notes, order_id } = req.body;

  if (!inventory_id || !change_type || !quantity_change || !reason) {
    return res.status(400).json({ error: 'inventory_id, change_type, quantity_change and reason required' });
  }
  if (!['add','remove','correction'].includes(change_type)) {
    return res.status(400).json({ error: 'change_type must be add, remove or correction' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get item including cost_price for snapshot
    const itemRes = await client.query(
      'SELECT id, name, quantity, cost_price FROM inventory WHERE id = $1',
      [inventory_id]
    );
    if (!itemRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item not found' });
    }
    const item = itemRes.rows[0];

    // Snapshot the cost price at this moment
    const unit_cost = parseFloat(item.cost_price || 0);

    const qty_change = change_type === 'remove'
      ? -Math.abs(parseInt(quantity_change))
      : Math.abs(parseInt(quantity_change));

    const qty_before = parseInt(item.quantity);
    const qty_after  = Math.max(0, qty_before + qty_change);

    // Update inventory quantity
    await client.query(
      'UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2',
      [qty_after, inventory_id]
    );

    // Log adjustment with snapshotted unit_cost
    const logRes = await client.query(`
      INSERT INTO stock_adjustments
        (inventory_id, item_name, change_type, quantity_change,
         quantity_before, quantity_after, reason, notes,
         unit_cost, adjusted_by, adjusted_by_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        inventory_id, item.name, change_type, qty_change,
        qty_before, qty_after, reason, notes || null,
        unit_cost, req.user.id, req.user.name || req.user.username,
      ]
    );

    // ── GIFT COST: if this is a free gift for an order, update order.gift_cost ──
    // This allows Reports to accurately include gift COGS per order
    const isGift = reason && reason.toLowerCase().startsWith('free gift');
    if (isGift && change_type === 'remove') {
      const giftCostThisItem = Math.abs(qty_change) * unit_cost;

      // Try to find the order by order_id (if passed) or by parsing the reason
      let orderId = order_id || null;

      if (!orderId) {
        // Try to extract order number from reason like "Free gift with order KO-2506-001"
        const match = reason.match(/KO-[\d-]+/i);
        if (match) {
          const orderNum = match[0];
          const orderRes = await client.query(
            'SELECT id FROM orders WHERE order_number = $1 LIMIT 1',
            [orderNum]
          );
          if (orderRes.rows.length) orderId = orderRes.rows[0].id;
        }
      }

      if (orderId && giftCostThisItem > 0) {
        await client.query(
          `UPDATE orders
           SET gift_cost = COALESCE(gift_cost, 0) + $1
           WHERE id = $2`,
          [giftCostThisItem, orderId]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({
      adjustment:   logRes.rows[0],
      new_quantity: qty_after,
      unit_cost_snapshot: unit_cost,
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