const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET / - list sales
router.get('/', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const result = await pool.query(
      `SELECT * FROM quick_sales ORDER BY created_at DESC LIMIT $1`, [limit]
    );
    const rows = result.rows.map(r => ({
      ...r,
      items: (() => { try { return typeof r.items === 'object' ? r.items : JSON.parse(r.items || '[]'); } catch(e) { return []; } })()
    }));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /stats
router.get('/stats', auth, async (req, res) => {
  try {
    const [today, month] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM quick_sales WHERE created_at::date = CURRENT_DATE`),
      pool.query(`SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM quick_sales WHERE DATE_TRUNC('month',created_at) = DATE_TRUNC('month',NOW())`),
    ]);
    res.json({ today: today.rows[0], month: month.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM quick_sales WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const sale = result.rows[0];
    const items = (() => { try { return typeof sale.items === 'object' ? sale.items : JSON.parse(sale.items || '[]'); } catch(e) { return []; } })();
    res.json({ ...sale, items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST / - create sale
router.post('/', auth, async (req, res) => {
  try {
    const { customer_name, customer_phone, customer_id, items, subtotal, discount, total,
            payment_method, amount_paid, change_given, notes, import_date } = req.body;

    // Validate items
    const itemsArr = Array.isArray(items) ? items : [];
    if (!itemsArr.length) return res.status(400).json({ error: 'No items in sale' });

    // Generate sale number
    const lastRes = await pool.query("SELECT sale_number FROM quick_sales ORDER BY id DESC LIMIT 1");
    let saleNum = 'QS-0001';
    if (lastRes.rows.length && lastRes.rows[0].sale_number) {
      const parts = lastRes.rows[0].sale_number.split('-');
      const last  = parseInt(parts[parts.length - 1]) || 0;
      saleNum = 'QS-' + String(last + 1).padStart(4, '0');
    }

    // Insert sale
    const saleDate = import_date || null;
    const result = await pool.query(
      `INSERT INTO quick_sales
         (sale_number, customer_name, customer_phone, items, subtotal, discount, total,
          payment_method, amount_paid, change_given, notes, served_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, COALESCE($13::timestamp, NOW()))
       RETURNING *`,
      [
        saleNum,
        customer_name || null,
        customer_phone || null,
        JSON.stringify(itemsArr),
        parseFloat(subtotal) || 0,
        parseFloat(discount) || 0,
        parseFloat(total)    || 0,
        payment_method       || 'cash',
        parseFloat(amount_paid)  || 0,
        parseFloat(change_given) || 0,
        notes    || null,
        req.user.id,
        saleDate,
      ]
    );

    const savedSale = result.rows[0];

    // Deduct inventory stock
    for (const item of itemsArr) {
      const invId = item.inventory_id || item.inventoryId || item.id;
      const qty   = parseInt(item.qty) || parseInt(item.quantity) || 1;
      if (!invId) continue;
      try {
        await pool.query(
          'UPDATE inventory SET quantity = GREATEST(0, quantity - $1), updated_at = NOW() WHERE id = $2',
          [qty, invId]
        );
        // Log to stock_adjustments
        await pool.query(
          `INSERT INTO stock_adjustments
             (inventory_id, item_name, change_type, quantity_change, reason, notes, adjusted_by)
           VALUES ($1,$2,'remove',$3,'Quick Sale',$4,$5)`,
          [invId, item.name || 'Item', -qty, 'Sale: ' + saleNum, req.user.id]
        ).catch(() => {});
      } catch(e) { console.warn('Stock deduct failed:', e.message); }
    }

    // Auto bank deposit for non-cash payments
    const pm  = (payment_method || 'cash').toLowerCase();
    const amt = parseFloat(total) || 0;
    if ((pm === 'bank' || pm === 'card' || pm === 'transfer') && amt > 0) {
      await pool.query(
        `INSERT INTO cash_deposits (date, amount, bank_name, payment_type, notes, added_by)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          new Date().toISOString().split('T')[0],
          amt, 'Pan Asia Bank',
          pm === 'card' ? 'card' : 'online',
          'Auto: Quick Sale ' + saleNum,
          req.user.id,
        ]
      ).catch(e => console.warn('Deposit failed:', e.message));
    }

    res.status(201).json({ ...savedSale, sale_number: saleNum });
  } catch (err) {
    console.error('Quick sale error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const sale = await pool.query('SELECT * FROM quick_sales WHERE id=$1', [req.params.id]);
    if (!sale.rows.length) return res.status(404).json({ error: 'Not found' });
    const s = sale.rows[0];

    // Restore inventory
    const saleItems = (() => { try { return typeof s.items === 'object' ? s.items : JSON.parse(s.items || '[]'); } catch(e) { return []; } })();
    for (const item of saleItems) {
      const invId = item.inventory_id || item.inventoryId;
      const qty   = parseInt(item.qty) || parseInt(item.quantity) || 1;
      if (!invId) continue;
      await pool.query(
        'UPDATE inventory SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2',
        [qty, invId]
      ).catch(() => {});
    }

    await pool.query('DELETE FROM quick_sales WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;