// ============================================================
//  Full Report Route — /api/full-report
//  Returns ALL business data for a given date range
//  Used for the downloadable PDF summary report
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to dates required' });

  try {
    const [
      orderStats,
      orderList,
      qsStats,
      qsList,
      repairStats,
      repairTypes,
      expenseStats,
      expenseList,
      depositStats,
      stockPurchases,
      lensJobStats,
      topFrames,
      topLensTypes,
      dailyRevenue,
    ] = await Promise.all([

      // ── Orders summary ──────────────────────────────────────
      pool.query(`
        SELECT
          COUNT(*)                                        AS total_orders,
          COALESCE(SUM(total_amount),    0)               AS revenue,
          COALESCE(SUM(advance_amount),  0)               AS collected,
          COALESCE(SUM(balance_amount),  0)               AS outstanding,
          COALESCE(SUM(frame_buy_price + lens_buy_price), 0) AS cost_of_goods,
          COALESCE(SUM(total_amount) - SUM(frame_buy_price + lens_buy_price), 0) AS gross_profit,
          COUNT(CASE WHEN status='delivered' THEN 1 END)  AS delivered,
          COUNT(CASE WHEN status='created'   THEN 1 END)  AS in_progress
        FROM orders
        WHERE created_at::date BETWEEN $1 AND $2
      `, [from, to]),

      // ── Orders list ─────────────────────────────────────────
      pool.query(`
        SELECT o.order_number, o.created_at::date AS date, c.name AS customer,
               o.frame, o.lens_type, o.lens_coating,
               o.total_amount, o.advance_amount, o.balance_amount,
               o.frame_buy_price, o.lens_buy_price, o.status
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.created_at::date BETWEEN $1 AND $2
        ORDER BY o.created_at DESC
      `, [from, to]),

      // ── Quick sales summary ─────────────────────────────────
      pool.query(`
        SELECT
          COUNT(*)                       AS total_sales,
          COALESCE(SUM(total), 0)        AS revenue,
          COALESCE(SUM(discount), 0)     AS total_discount
        FROM quick_sales
        WHERE created_at::date BETWEEN $1 AND $2
      `, [from, to]),

      // ── Quick sales list ─────────────────────────────────────
      pool.query(`
        SELECT
          sale_number,
          created_at::date              AS date,
          TO_CHAR(created_at,'HH24:MI') AS time,
          customer_name,
          items,
          total,
          discount,
          payment_method
        FROM quick_sales
        WHERE created_at::date BETWEEN $1 AND $2
        ORDER BY created_at DESC
      `, [from, to]),

      // ── Repairs summary ─────────────────────────────────────
      pool.query(`
        SELECT
          COUNT(*)                                                AS total_repairs,
          COALESCE(SUM(charge), 0)                               AS revenue,
          COUNT(CASE WHEN payment_method='free' THEN 1 END)      AS free_repairs
        FROM repairs
        WHERE created_at::date BETWEEN $1 AND $2
      `, [from, to]),

      // ── Repair type breakdown ───────────────────────────────
      pool.query(`
        SELECT repair_type,
               COUNT(*)            AS count,
               COALESCE(SUM(charge),0) AS revenue
        FROM repairs
        WHERE created_at::date BETWEEN $1 AND $2
        GROUP BY repair_type
        ORDER BY count DESC
      `, [from, to]),

      // ── Expenses summary ────────────────────────────────────
      pool.query(`
        SELECT
          COUNT(*)                        AS total_expenses,
          COALESCE(SUM(amount), 0)        AS total_amount,
          COALESCE(SUM(CASE WHEN payment_method='cash' THEN amount END), 0) AS cash_expenses,
          COALESCE(SUM(CASE WHEN payment_method='bank' THEN amount END), 0) AS bank_expenses
        FROM expenses
        WHERE date BETWEEN $1 AND $2
      `, [from, to]),

      // ── Expenses by category ────────────────────────────────
      pool.query(`
        SELECT category,
               SUM(amount)   AS total,
               COUNT(*)      AS count
        FROM expenses
        WHERE date BETWEEN $1 AND $2
        GROUP BY category
        ORDER BY total DESC
      `, [from, to]),

      // ── Bank deposits ───────────────────────────────────────
      pool.query(`
        SELECT
          COUNT(*)                  AS count,
          COALESCE(SUM(amount), 0)  AS total
        FROM cash_deposits
        WHERE date BETWEEN $1 AND $2
      `, [from, to]),

      // ── Stock purchases (dealer) ────────────────────────────
      pool.query(`
        SELECT
          COUNT(*)                  AS count,
          COALESCE(SUM(total_cost), 0) AS total,
          dealer_name,
          SUM(total_cost)           AS dealer_total
        FROM dealer_purchases
        WHERE purchase_date BETWEEN $1 AND $2
        GROUP BY dealer_name
        ORDER BY dealer_total DESC
      `, [from, to]),

      // ── Lens jobs ───────────────────────────────────────────
      pool.query(`
        SELECT
          COUNT(*)  AS total,
          lens_company,
          COUNT(CASE WHEN lens_step >= 3 THEN 1 END) AS completed
        FROM orders
        WHERE lens_company IS NOT NULL
          AND created_at::date BETWEEN $1 AND $2
        GROUP BY lens_company
        ORDER BY total DESC
      `, [from, to]),

      // ── Top frames ──────────────────────────────────────────
      pool.query(`
        SELECT frame,
               COUNT(*)                AS units,
               COALESCE(SUM(total_amount),0) AS revenue,
               COALESCE(AVG(total_amount - frame_buy_price - lens_buy_price),0) AS avg_profit
        FROM orders
        WHERE frame IS NOT NULL AND frame != ''
          AND created_at::date BETWEEN $1 AND $2
        GROUP BY frame
        ORDER BY units DESC
        LIMIT 10
      `, [from, to]),

      // ── Top lens types ───────────────────────────────────────
      pool.query(`
        SELECT lens_type,
               COUNT(*)  AS units,
               COALESCE(SUM(total_amount),0) AS revenue
        FROM orders
        WHERE lens_type IS NOT NULL
          AND created_at::date BETWEEN $1 AND $2
        GROUP BY lens_type
        ORDER BY units DESC
      `, [from, to]),

      // ── Daily revenue trend ─────────────────────────────────
      pool.query(`
        SELECT
          gs::date AS date,
          COALESCE(o.order_rev, 0) AS order_revenue,
          COALESCE(q.qs_rev,    0) AS qs_revenue,
          COALESCE(r.rep_rev,   0) AS repair_revenue
        FROM generate_series($1::date, $2::date, '1 day') AS gs
        LEFT JOIN (
          SELECT created_at::date AS ord_date, SUM(total_amount) AS order_rev
          FROM orders WHERE created_at::date BETWEEN $1 AND $2
          GROUP BY created_at::date
        ) o ON o.ord_date = gs::date
        LEFT JOIN (
          SELECT created_at::date AS qs_date, SUM(total) AS qs_rev
          FROM quick_sales WHERE created_at::date BETWEEN $1 AND $2
          GROUP BY created_at::date
        ) q ON q.qs_date = gs::date
        LEFT JOIN (
          SELECT created_at::date AS rep_date, SUM(charge) AS rep_rev
          FROM repairs WHERE created_at::date BETWEEN $1 AND $2
            AND payment_method != 'free'
          GROUP BY created_at::date
        ) r ON r.rep_date = gs::date
        ORDER BY gs
      `, [from, to]),
    ]);

    // ── Compute totals ─────────────────────────────────────────
    const os  = orderStats.rows[0];
    const qs  = qsStats.rows[0];
    const rs  = repairStats.rows[0];
    const ex  = expenseStats.rows[0];
    const dep = depositStats.rows[0];

    const totalStockPurchases = stockPurchases.rows.reduce((s,r)=>s+parseFloat(r.total||0), 0);

    const totalRevenue    = parseFloat(os.revenue||0) + parseFloat(qs.revenue||0) + parseFloat(rs.revenue||0);
    const totalExpenses   = parseFloat(ex.total_amount||0);
    const totalCOGS       = parseFloat(os.cost_of_goods||0) + totalStockPurchases;
    const grossProfit     = totalRevenue - parseFloat(os.cost_of_goods||0);
    const netProfit       = grossProfit - totalExpenses;
    const profitMargin    = totalRevenue > 0 ? Math.round(netProfit / totalRevenue * 100) : 0;

    res.json({
      period:     { from, to },
      summary:    { totalRevenue, totalExpenses, totalCOGS, grossProfit, netProfit, profitMargin },
      orders:     { ...os, list: orderList.rows },
      quickSales: { ...qs, list: qsList.rows },
      repairs:    { ...rs, types: repairTypes.rows },
      expenses:   { ...ex, byCategory: expenseList.rows },
      deposits:   dep,
      stockPurchases: stockPurchases.rows,
      lensJobs:   lensJobStats.rows,
      topFrames:  topFrames.rows,
      topLenses:  topLensTypes.rows,
      daily:      dailyRevenue.rows,
    });
  } catch (err) {
    console.error('Full report error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

module.exports = router;
