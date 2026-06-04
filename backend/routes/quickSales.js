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
      SELECT *,
        jsonb_array_length(items::jsonb) AS item_count
      FROM quick_sales
      ORDER BY created_at DESC
      LIMIT $1
    `, [parseInt(limit)]);
    res.json(result.rows);
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
    const result = await client.query(
      `INSERT INTO quick_sales (sale_number,customer_name,customer_phone,items,subtotal,discount,total,payment_method,amount_paid,change_given,notes,served_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [saleNum, customer_name||null, customer_phone||null, JSON.stringify(items),
       parseFloat(subtotal)||0, parseFloat(discount)||0, parseFloat(total)||0,
       payment_method||'cash', parseFloat(amount_paid)||0, parseFloat(change_given)||0,
       notes||null, req.user.id]
    );
    for (const item of items) {
      if (item.inventory_id) {
        await client.query('UPDATE inventory SET quantity = GREATEST(0, quantity - $1) WHERE id = $2', [item.qty||1, item.inventory_id]);
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
      const items = typeof s.items === 'string' ? JSON.parse(s.items) : s.items || [];
      for (const item of items) {
        if (item.inventory_id) {
          await pool.query(
            'UPDATE inventory SET quantity = quantity + $1 WHERE id = $2',
            [item.qty||1, item.inventory_id]
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

module.exports = router;