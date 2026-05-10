// ============================================================
//  Reports Routes — /api/reports
//  Fixed: lens_company NULL bug, daily revenue, all queries
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/reports/dashboard
router.get('/dashboard', auth, async (req, res) => {
  try {
    const [orders, balances, lensJobs, reminders, monthRev, dailyRev] = await Promise.all([

      // Active orders (not delivered)
      pool.query(`SELECT COUNT(*) FROM orders WHERE status NOT IN ('delivered')`),

      // Total balance due across all orders
      pool.query(`SELECT COALESCE(SUM(balance_amount),0) AS total FROM orders WHERE balance_amount > 0`),

      // Lens jobs out at external labs
      // FIX: was != 'In-Shop' which fails on NULL — NULL != anything = NULL (false)
      pool.query(`
        SELECT COUNT(*) FROM orders
        WHERE lens_step < 3
          AND status != 'delivered'
          AND lens_company IS NOT NULL
          AND lens_company != 'In-Shop'
      `),

      // Overdue + today deliveries
      pool.query(`
        SELECT o.id, o.order_number, o.balance_amount, o.deliver_date, o.status,
               c.name AS customer_name, c.phone
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.status != 'delivered'
          AND o.deliver_date <= CURRENT_DATE
        ORDER BY o.deliver_date ASC
        LIMIT 15
      `),

      // This month revenue
      pool.query(`
        SELECT
          COALESCE(SUM(total_amount),0)   AS total,
          COALESCE(SUM(advance_amount),0) AS collected,
          COALESCE(SUM(balance_amount),0) AS owed,
          COUNT(*)                        AS order_count
        FROM orders
        WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
      `),

      // Today's sales (total amount of orders created today)
      pool.query(`
        SELECT COALESCE(SUM(total_amount),0) AS total
        FROM orders
        WHERE created_at::date = CURRENT_DATE
      `),
    ]);

    res.json({
      active_orders:  parseInt(orders.rows[0].count),
      total_balance:  parseFloat(balances.rows[0].total),
      lens_jobs_out:  parseInt(lensJobs.rows[0].count),
      reminders:      reminders.rows,
      month_revenue:  monthRev.rows[0],
      daily_revenue:  parseFloat(dailyRev.rows[0].total),
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// GET /api/reports/revenue?month=2026-04
router.get('/revenue', auth, async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  try {
    const [summary, orders, trend] = await Promise.all([

      pool.query(`
        SELECT
          COALESCE(SUM(total_amount),0)   AS total,
          COALESCE(SUM(advance_amount),0) AS collected,
          COALESCE(SUM(balance_amount),0) AS owed,
          COUNT(*)                        AS order_count
        FROM orders
        WHERE TO_CHAR(created_at, 'YYYY-MM') = $1
      `, [month]),

      pool.query(`
        SELECT o.*, c.name AS customer_name
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE TO_CHAR(o.created_at, 'YYYY-MM') = $1
        ORDER BY o.created_at DESC
      `, [month]),

      // 6 month trend
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM')  AS month_key,
          COALESCE(SUM(total_amount),0)                        AS total,
          COALESCE(SUM(advance_amount),0)                      AS collected,
          COUNT(*)                                             AS order_count
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `),
    ]);

    res.json({
      summary: summary.rows[0],
      orders:  orders.rows,
      trend:   trend.rows,
    });
  } catch (err) {
    console.error('Revenue error:', err);
    res.status(500).json({ error: 'Failed to load revenue report' });
  }
});

// GET /api/reports/topsellers
router.get('/topsellers', auth, async (req, res) => {
  try {
    const [frames, lenses] = await Promise.all([
      pool.query(`
        SELECT frame, COUNT(*) AS units, COALESCE(SUM(total_amount),0) AS revenue
        FROM orders
        WHERE frame IS NOT NULL AND frame != ''
        GROUP BY frame
        ORDER BY units DESC
        LIMIT 10
      `),
      pool.query(`
        SELECT lens_type, COUNT(*) AS units
        FROM orders
        WHERE lens_type IS NOT NULL AND lens_type != ''
        GROUP BY lens_type
        ORDER BY units DESC
      `),
    ]);
    res.json({ frames: frames.rows, lenses: lenses.rows });
  } catch (err) {
    console.error('Top sellers error:', err);
    res.status(500).json({ error: 'Failed to load top sellers' });
  }
});

// GET /api/reports/lensjobs
router.get('/lensjobs', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, c.name AS customer_name, c.phone
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.status != 'delivered'
        AND o.lens_company IS NOT NULL
        AND o.lens_company != 'In-Shop'
      ORDER BY o.lens_company, o.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Lens jobs error:', err);
    res.status(500).json({ error: 'Failed to load lens jobs' });
  }
});

module.exports = router;
