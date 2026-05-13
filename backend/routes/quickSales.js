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

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM quick_sales ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/', auth, async (req, res) => {
  const { customer_name, customer_phone, items, subtotal, discount, total, payment_method, amount_paid, change_given, notes, import_date } = req.body;
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
        // Backdate created_at if past sale
    if (import_date) {
      const importTs = new Date(import_date + 'T12:00:00');
      await client.query(`UPDATE quick_sales SET created_at=$1 WHERE id=$2`,
        [importTs, result.rows[0].id]);
    }
    await client.query('COMMIT');
    res.status(201).json({ ...result.rows[0], sale_number: saleNum }); catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally { client.release(); }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const [today, month] = await Promise.all([
      pool.query("SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM quick_sales WHERE created_at::date=CURRENT_DATE"),
      pool.query("SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM quick_sales WHERE DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW())")
    ]);
    res.json({ today: today.rows[0], month: month.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});


// POST /api/quick-sales/import — backdate a quick sale
router.post('/import', auth, async (req, res) => {
  const { customer_name, items, subtotal, discount, total, payment_method, import_date } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const dateObj = new Date(import_date || Date.now());
    const y = dateObj.getFullYear().toString().slice(2);
    const m = String(dateObj.getMonth()+1).padStart(2,'0');
    const countRes = await client.query(
      `SELECT COUNT(*) FROM quick_sales WHERE TO_CHAR(created_at,'YYMM') = $1`, [y+m]
    );
    const seq = parseInt(countRes.rows[0].count) + 1;
    const sale_number = `QS-${y}${m}-${String(seq).padStart(3,'0')}`;
    const importTs = import_date ? new Date(import_date + 'T12:00:00') : new Date();
    const tot = parseFloat(total)||0;

    const result = await client.query(
      `INSERT INTO quick_sales (sale_number,customer_name,items,subtotal,discount,total,payment_method,amount_paid,change_given,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$9) RETURNING *`,
      [sale_number, customer_name||null, JSON.stringify(items||[]),
       parseFloat(subtotal)||tot, parseFloat(discount)||0, tot,
       payment_method||'cash', tot, importTs]
    );
    await client.query('COMMIT');
    res.status(201).json({ ...result.rows[0], sale_number });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally { client.release(); }
});

module.exports = router;
