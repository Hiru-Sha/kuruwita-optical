// ============================================================
//  Quick Sales Routes — /api/quick-sales
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

async function nextSaleNumber() {
  const res = await pool.query("SELECT sale_number FROM quick_sales ORDER BY id DESC LIMIT 1");
  if (!res.rows.length) return 'QS-0001';
  const last = parseInt(res.rows[0].sale_number.split('-')[1]);
  return 'QS-' + String(last + 1).padStart(4, '0');
}

// GET /api/quick-sales — list with item_count
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
    // Parse items field if stored as string
    const rows = result.rows.map(r => ({
      ...r,
      items: (() => {
        try {
          if (!r.items) return [];
          if (typeof r.items === 'object') return r.items;
          return JSON.parse(r.items);
        } catch(e) { return []; }
      })()
    }));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// GET /api/quick-sales/:id — single sale with items
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM quick_sales WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const sale = result.rows[0];
    // Parse items from JSON column
    let items = [];
    try { items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items || []; }
    catch(e) { items = []; }
    res.json({ ...sale, items });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /api/quick-sales — create sale
router.post('/', auth, async (req, res) => {
  const { customer_name, customer_phone, items, subtotal, discount, total, payment_method, amount_paid, change_given, notes } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'No items in sale' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const saleNum = await nextSaleNumber();
    const import_date = req.body.import_date || null;
    const result = await client.query(
      `INSERT INTO quick_sales (sale_number,customer_name,customer_phone,items,subtotal,discount,total,payment_method,amount_paid,change_given,notes,served_by,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13::timestamp, NOW())) RETURNING *`,
      [saleNum, customer_name||null, customer_phone||null, JSON.stringify(items),
       parseFloat(subtotal)||0, parseFloat(discount)||0, parseFloat(total)||0,
       payment_method||'cash', parseFloat(amount_paid)||0, parseFloat(change_given)||0,
       notes||null, req.user.id, import_date||null]
    );
    // Parse items if it came as a string
    const itemsArr = Array.isArray(items) ? items
      : (typeof items === 'string' ? JSON.parse(items) : []);

    for (const item of itemsArr) {
      const invId = item.inventory_id || item.inventoryId || item.id;
      const qty   = parseInt(item.qty) || parseInt(item.quantity) || 1;
      if (invId) {
        await client.query(
          'UPDATE inventory SET quantity = GREATEST(0, quantity - $1), updated_at = NOW() WHERE id = $2',
          [qty, invId]
        );
      }
    }
    await client.query('COMMIT');
    const newSale = { ...result.rows[0], sale_number: saleNum };

    // Auto-create bank receipt if paid by bank or card
    const pm  = (payment_method||'cash').toLowerCase();
    const amt = parseFloat(total)||0;
    if ((pm==='bank'||pm==='card'||pm==='transfer') && amt > 0) {
      try {
        await pool.query(
          `INSERT INTO cash_deposits (date,amount,bank_name,payment_type,notes,added_by)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [new Date().toISOString().split('T')[0], amt, 'Pan Asia Bank',
           pm==='card'?'card':'online',
           'Auto: Quick Sale ' + saleNum, req.user.id]
        );
      } catch(e) { console.warn('QS bank receipt failed:', e.message); }
    }

    res.status(201).json(newSale);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally { client.release(); }
});

// DELETE /api/quick-sales/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    // Get sale first so we can clean up deposits
    const sale = await pool.query('SELECT * FROM quick_sales WHERE id=$1', [req.params.id]);
    if (!sale.rows.length) return res.status(404).json({ error: 'Not found' });
    const s = sale.rows[0];

    // If bank/card payment — delete matching bank receipt
    if (s.payment_method && s.payment_method !== 'cash') {
      await pool.query(
        `DELETE FROM cash_deposits
         WHERE notes ILIKE $1
           AND amount = $2`,
        [`%Quick Sale ${s.sale_number}%`, parseFloat(s.total||0)]
      ).catch(()=>{});
    }

    // Restore inventory stock
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
    } catch(e) { /* non-critical */ }

    await pool.query('DELETE FROM quick_sales WHERE id=$1', [req.params.id]);
    res.json({ message: 'Sale deleted' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/quick-sales/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const [today, month] = await Promise.all([
      pool.query("SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM quick_sales WHERE created_at::date=CURRENT_DATE"),
      pool.query("SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM quick_sales WHERE DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW())")
    ]);
    res.json({ today: today.rows[0], month: month.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /api/quick-sales/sync-stock — fix past sales that didn't deduct stock
// Run once to correct inventory
router.post('/sync-stock', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const sales = await pool.query(
      `SELECT * FROM quick_sales ORDER BY created_at DESC LIMIT 500`
    );
    let fixed = 0;
    for (const sale of sales.rows) {
      try {
        const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items || [];
        for (const item of items) {
          const invId = item.inventory_id || item.inventoryId;
          const qty   = parseInt(item.qty) || 1;
          if (invId) {
            // Only deduct if current quantity > 0
            await pool.query(
              'UPDATE inventory SET quantity = GREATEST(0, quantity - $1), updated_at = NOW() WHERE id = $2 AND quantity > 0',
              [qty, invId]
            );
            fixed++;
          }
        }
      } catch(e) { /* skip bad records */ }
    }
    res.json({ ok: true, message: `Processed ${sales.rows.length} sales, adjusted ${fixed} inventory items` });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;