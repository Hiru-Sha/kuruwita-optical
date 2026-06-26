// ============================================================
//  Quick Sales Routes — /api/quick-sales
//  Fixed:
//    1. GET /stats moved BEFORE GET /:id (route shadowing bug)
//    2. Race condition in nextSaleNumber → advisory lock
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// ── GET /api/quick-sales ─────────────────────────────────────
router.get('/', auth, async (req, res) => {
  const { limit = 100 } = req.query;
  try {
    const result = await pool.query(`
      SELECT id, sale_number, customer_name, customer_phone,
             items, subtotal, discount, total,
             payment_method, amount_paid, change_given,
             notes, served_by, created_at,
             COALESCE(jsonb_array_length(
               CASE WHEN items IS NOT NULL AND items::text != 'null'
               THEN items::jsonb ELSE '[]'::jsonb END
             ), 0) AS item_count
      FROM quick_sales
      ORDER BY created_at DESC
      LIMIT $1
    `, [parseInt(limit)]);
    const rows = result.rows.map(r => ({
      ...r,
      items: (() => {
        try {
          if (!r.items) return [];
          if (typeof r.items === 'object') return r.items;
          return JSON.parse(r.items);
        } catch (e) { return []; }
      })()
    }));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── GET /api/quick-sales/stats — MUST be before /:id ─────────
// Fixed: was defined after GET /:id so Express never reached it
router.get('/stats', auth, async (req, res) => {
  try {
    const [today, month] = await Promise.all([
      pool.query(`
        SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count
        FROM quick_sales WHERE created_at::date = CURRENT_DATE
      `),
      pool.query(`
        SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count
        FROM quick_sales
        WHERE DATE_TRUNC('month',created_at) = DATE_TRUNC('month',NOW())
      `),
    ]);
    res.json({ today: today.rows[0], month: month.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── GET /api/quick-sales/:id ─────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM quick_sales WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const sale = result.rows[0];
    let items = [];
    try { items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items || []; }
    catch (e) { items = []; }
    res.json({ ...sale, items });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── POST /api/quick-sales ────────────────────────────────────
// Fixed: uses advisory lock to prevent duplicate sale numbers
router.post('/', auth, async (req, res) => {
  const { customer_name, customer_phone, items, subtotal, discount, total,
          payment_method, amount_paid, change_given, notes } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'No items in sale' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Advisory lock prevents race condition on sale number generation
    await client.query('SELECT pg_advisory_xact_lock(1002)');
    const lastRes = await client.query(
      "SELECT sale_number FROM quick_sales ORDER BY id DESC LIMIT 1"
    );
    let saleNum = 'QS-0001';
    if (lastRes.rows.length) {
      const last = parseInt(lastRes.rows[0].sale_number.split('-')[1]) || 0;
      saleNum = 'QS-' + String(last + 1).padStart(4, '0');
    }

    const import_date = req.body.import_date || null;
    const result = await client.query(
      `INSERT INTO quick_sales
         (sale_number,customer_name,customer_phone,items,subtotal,discount,total,
          payment_method,amount_paid,change_given,notes,served_by,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13::timestamp, NOW()))
       RETURNING *`,
      [
        saleNum, customer_name || null, customer_phone || null, JSON.stringify(items),
        parseFloat(subtotal)    || 0,
        parseFloat(discount)    || 0,
        parseFloat(total)       || 0,
        payment_method || 'cash',
        parseFloat(amount_paid) || 0,
        parseFloat(change_given)|| 0,
        notes || null, req.user.id, import_date || null,
      ]
    );

    const itemsArr = Array.isArray(items)
      ? items
      : (typeof items === 'string' ? JSON.parse(items) : []);

    // ── ACCOUNTING FIX: snapshot cost_price for each item at time of sale ──
    // This allows accurate COGS calculation in Reports without double-counting
    const enrichedItems = [];
    for (const item of itemsArr) {
      const invId = item.inventory_id || item.inventoryId || item.id;
      const qty   = parseInt(item.qty) || parseInt(item.quantity) || 1;

      let cost_price = parseFloat(item.cost_price || 0);

      if (invId) {
        // Deduct stock
        await client.query(
          'UPDATE inventory SET quantity = GREATEST(0, quantity - $1), updated_at = NOW() WHERE id = $2',
          [qty, invId]
        );

        // Snapshot cost_price from inventory if not already provided
        if (!cost_price) {
          try {
            const costRes = await client.query(
              'SELECT cost_price FROM inventory WHERE id = $1', [invId]
            );
            cost_price = parseFloat(costRes.rows[0]?.cost_price || 0);
          } catch (e) { /* non-critical */ }
        }
      }

      enrichedItems.push({
        ...item,
        inventory_id: invId || item.inventory_id,
        qty,
        cost_price,  // snapshotted at time of sale — used for COGS in Reports
      });
    }

    // Save enriched items (with cost_price) back to the sale record
    if (enrichedItems.length) {
      await client.query(
        'UPDATE quick_sales SET items = $1 WHERE sale_number = $2',
        [JSON.stringify(enrichedItems), saleNum]
      );
    }

    // Auto-create bank receipt if paid by bank/card
    const pm  = (payment_method || 'cash').toLowerCase();
    const amt = parseFloat(total) || 0;
    if ((pm === 'bank' || pm === 'card' || pm === 'transfer') && amt > 0) {
      try {
        await client.query(
          `INSERT INTO cash_deposits (date,amount,bank_name,payment_type,notes,added_by)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            new Date().toISOString().split('T')[0],
            amt, 'Pan Asia Bank',
            pm === 'card' ? 'card' : 'online',
            'Auto: Quick Sale ' + saleNum,
            req.user.id,
          ]
        );
      } catch (e) { console.warn('QS bank receipt failed:', e.message); }
    }

    await client.query('COMMIT');
    res.status(201).json({ ...result.rows[0], sale_number: saleNum });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally {
    client.release();
  }
});

// ── DELETE /api/quick-sales/:id ──────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const sale = await pool.query('SELECT * FROM quick_sales WHERE id=$1', [req.params.id]);
    if (!sale.rows.length) return res.status(404).json({ error: 'Not found' });
    const s = sale.rows[0];

    if (s.payment_method && s.payment_method !== 'cash') {
      await pool.query(
        `DELETE FROM cash_deposits WHERE notes ILIKE $1 AND amount = $2`,
        [`%Quick Sale ${s.sale_number}%`, parseFloat(s.total || 0)]
      ).catch(() => {});
    }

    try {
      const saleItems = typeof s.items === 'string' ? JSON.parse(s.items) : s.items || [];
      for (const item of saleItems) {
        const invId = item.inventory_id || item.inventoryId;
        const qty   = parseInt(item.qty) || parseInt(item.quantity) || 1;
        if (invId) {
          await pool.query(
            'UPDATE inventory SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2',
            [qty, invId]
          );
        }
      }
    } catch (e) { /* non-critical */ }

    await pool.query('DELETE FROM quick_sales WHERE id=$1', [req.params.id]);
    res.json({ message: 'Sale deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/quick-sales/sync-stock — admin utility ─────────
router.post('/sync-stock', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const sales = await pool.query('SELECT * FROM quick_sales ORDER BY created_at DESC LIMIT 500');
    let fixed = 0;
    for (const sale of sales.rows) {
      try {
        const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items || [];
        for (const item of items) {
          const invId = item.inventory_id || item.inventoryId;
          const qty   = parseInt(item.qty) || 1;
          if (invId) {
            await pool.query(
              'UPDATE inventory SET quantity = GREATEST(0, quantity - $1), updated_at = NOW() WHERE id = $2 AND quantity > 0',
              [qty, invId]
            );
            fixed++;
          }
        }
      } catch (e) { /* skip bad records */ }
    }
    res.json({ ok: true, message: `Processed ${sales.rows.length} sales, adjusted ${fixed} inventory items` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;