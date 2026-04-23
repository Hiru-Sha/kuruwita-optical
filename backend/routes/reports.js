// ============================================================
//  Reports Routes — /api/reports
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/reports/dashboard — all stats for home screen
router.get('/dashboard', auth, async (req, res) => {
  try {
    // We add todayResult to the Promise.all array
    const [orders, balances, lensJobs, reminders, monthRev, todayResult] = await Promise.all([

      // 1. Active orders count
      pool.query(`SELECT COUNT(*) FROM orders WHERE status NOT IN ('delivered')`),

      // 2. Total balance due
      pool.query(`SELECT COALESCE(SUM(balance_amount),0) AS total FROM orders WHERE balance_amount > 0`),

      // 3. Lens jobs out
      pool.query(`SELECT COUNT(*) FROM orders WHERE lens_company != 'In-Shop' AND lens_step < 3 AND status != 'delivered'`),

      // 4. Overdue + today's deliveries
      pool.query(`
        SELECT o.*, c.name AS customer_name, c.phone
        FROM orders o JOIN customers c ON o.customer_id = c.id
        WHERE o.status != 'delivered'
          AND (o.deliver_date <= CURRENT_DATE)
        ORDER BY o.deliver_date ASC LIMIT 10`),

      // 5. This month revenue
      pool.query(`
        SELECT
          COALESCE(SUM(total_amount),0)   AS total,
          COALESCE(SUM(advance_amount),0) AS collected,
          COALESCE(SUM(balance_amount),0) AS owed,
          COUNT(*)                        AS order_count
        FROM orders
        WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`),

      // 6. NEW: Today's Summary (Specifically for the gold card)
      pool.query(`
        SELECT 
          COUNT(*)::int as total_orders, 
          COALESCE(SUM(total_amount), 0)::float as daily_revenue 
        FROM orders 
        WHERE DATE(created_at) = CURRENT_DATE`)
    ]);

    res.json({
      active_orders:  parseInt(orders.rows[0].count),
      total_balance:  parseFloat(balances.rows[0].total),
      lens_jobs_out:  parseInt(lensJobs.rows[0].count),
      reminders:      reminders.rows,
      month_revenue:  monthRev.rows[0],
      today_summary:  todayResult.rows[0] // Sending the new data to the frontend
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// GET /api/reports/revenue?month=2026-04 — monthly breakdown
router.get('/revenue', auth, async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0,7);
  try {
    const [summary, orders, trend] = await Promise.all([

      pool.query(`
        SELECT
          COALESCE(SUM(total_amount),0)   AS total,
          COALESCE(SUM(advance_amount),0) AS collected,
          COALESCE(SUM(balance_amount),0) AS owed,
          COUNT(*)                        AS order_count
        FROM orders
        WHERE TO_CHAR(created_at, 'YYYY-MM') = $1`, [month]),

      pool.query(`
        SELECT o.*, c.name AS customer_name
        FROM orders o JOIN customers c ON o.customer_id = c.id
        WHERE TO_CHAR(o.created_at, 'YYYY-MM') = $1
        ORDER BY o.created_at DESC`, [month]),

      // Last 6 months trend
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
          COALESCE(SUM(total_amount),0)                        AS total,
          COALESCE(SUM(advance_amount),0)                      AS collected
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)`),
    ]);

    res.json({ summary: summary.rows[0], orders: orders.rows, trend: trend.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load revenue report' });
  }
});

// GET /api/reports/topsellers
router.get('/topsellers', auth, async (req, res) => {
  try {
    const [frames, lenses] = await Promise.all([
      pool.query(`
        SELECT frame, COUNT(*) AS units, SUM(total_amount) AS revenue
        FROM orders WHERE frame IS NOT NULL
        GROUP BY frame ORDER BY units DESC LIMIT 10`),
      pool.query(`
        SELECT lens_type, COUNT(*) AS units
        FROM orders WHERE lens_type IS NOT NULL
        GROUP BY lens_type ORDER BY units DESC`),
    ]);
    res.json({ frames: frames.rows, lenses: lenses.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load top sellers' });
  }
});

// GET /api/reports/lensjobs
router.get('/lensjobs', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, c.name AS customer_name
      FROM orders o JOIN customers c ON o.customer_id = c.id
      WHERE o.status != 'delivered'
        AND o.lens_company != 'In-Shop'
      ORDER BY o.lens_company, o.created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load lens jobs' });
  }
});

// GET /api/reports/today-summary (Keep this as a standalone if needed elsewhere)
router.get('/today-summary', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*)::int as total_orders, 
        COALESCE(SUM(total_amount), 0)::float as daily_revenue 
       FROM orders 
       WHERE DATE(created_at) = CURRENT_DATE`
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;