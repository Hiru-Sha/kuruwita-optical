// ============================================================
//  Dealer Purchases Routes — /api/dealer-purchases
//  Fixed:
//    E. SQL injection via template literal — replaced with
//       parameterized whitelist. months is now validated to
//       be 1–24, defaults to 6 if invalid/NaN.
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// Safely parse months param — whitelist 1-24, default 6
function safeMonths(raw) {
  const n = parseInt(raw);
  return (!isNaN(n) && n >= 1 && n <= 24) ? n : 6;
}

// GET /api/dealer-purchases
router.get('/', auth, async (req, res) => {
  const { month, dealer, category, limit = 200 } = req.query;
  try {
    let query  = `SELECT * FROM dealer_purchases WHERE 1=1`;
    const params = [];
    if (month) {
      params.push(month);
      query += ` AND TO_CHAR(purchase_date,'YYYY-MM') = $${params.length}`;
    }
    if (dealer && dealer !== 'all') {
      params.push(dealer);
      query += ` AND dealer_name = $${params.length}`;
    }
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    params.push(parseInt(limit));
    query += ` ORDER BY purchase_date DESC, created_at DESC LIMIT $${params.length}`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/dealer-purchases/summary
// Fix E: months now uses safeMonths() and a parameterized interval
router.get('/summary', auth, async (req, res) => {
  const months = safeMonths(req.query.months);
  // Build the cutoff date once as a parameter — no template literal in SQL
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  try {
    const [byDealer, byMonth, byCategory, totals] = await Promise.all([
      pool.query(`
        SELECT
          dealer_name,
          COUNT(*)                    AS purchase_count,
          SUM(total_cost)             AS total_spent,
          SUM(quantity)               AS total_items,
          MAX(purchase_date)          AS last_purchase,
          TO_CHAR(MAX(purchase_date),'DD Mon YYYY') AS last_purchase_fmt
        FROM dealer_purchases
        WHERE purchase_date >= $1
        GROUP BY dealer_name
        ORDER BY total_spent DESC
      `, [cutoffStr]),

      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', purchase_date::timestamp), 'Mon YY')  AS month,
          TO_CHAR(DATE_TRUNC('month', purchase_date::timestamp), 'YYYY-MM') AS month_key,
          dealer_name,
          SUM(total_cost) AS total
        FROM dealer_purchases
        WHERE purchase_date >= $1
        GROUP BY DATE_TRUNC('month', purchase_date::timestamp), dealer_name
        ORDER BY DATE_TRUNC('month', purchase_date::timestamp)
      `, [cutoffStr]),

      pool.query(`
        SELECT
          COALESCE(category,'Other') AS category,
          SUM(total_cost)            AS total,
          SUM(quantity)              AS items,
          COUNT(*)                   AS purchases
        FROM dealer_purchases
        WHERE purchase_date >= $1
        GROUP BY COALESCE(category,'Other')
        ORDER BY total DESC
      `, [cutoffStr]),

      pool.query(`
        SELECT
          COALESCE(SUM(total_cost),0)  AS total_spent,
          COALESCE(SUM(quantity),0)    AS total_items,
          COUNT(*)                     AS total_purchases,
          COALESCE(SUM(CASE WHEN TO_CHAR(purchase_date,'YYYY-MM')=TO_CHAR(CURRENT_DATE,'YYYY-MM')
            THEN total_cost END),0)    AS this_month
        FROM dealer_purchases
        WHERE purchase_date >= $1
      `, [cutoffStr]),
    ]);

    res.json({
      by_dealer:   byDealer.rows,
      by_month:    byMonth.rows,
      by_category: byCategory.rows,
      totals:      totals.rows[0],
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed: ' + err.message }); }
});

// POST /api/dealer-purchases
router.post('/', auth, async (req, res) => {
  const { dealer_name, purchase_date, invoice_no, category, description,
          quantity, unit_cost, payment_method, payment_status, notes,
          cheque_no, cheque_date, cheque_bank, bill_image } = req.body;

  if (!dealer_name || !description || !quantity || !unit_cost) {
    return res.status(400).json({ error: 'dealer_name, description, quantity and unit_cost required' });
  }
  const total_cost = parseFloat(unit_cost) * parseInt(quantity);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      INSERT INTO dealer_purchases
        (dealer_name, purchase_date, invoice_no, category, description, quantity, unit_cost, total_cost,
         payment_method, payment_status, notes, cheque_no, cheque_date, cheque_bank, bill_image, added_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [dealer_name,
       purchase_date || new Date().toISOString().split('T')[0],
       invoice_no||null, category||null, description,
       parseInt(quantity), parseFloat(unit_cost), total_cost,
       payment_method||'cash', payment_status||'paid', notes||null,
       cheque_no||null, cheque_date||null, cheque_bank||null,
       bill_image||null, req.user.id]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed' });
  } finally { client.release(); }
});

// DELETE /api/dealer-purchases/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM dealer_purchases WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;