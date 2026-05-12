// ============================================================
//  Reports Routes — /api/reports
//  Fixed: Promise.all destructuring order was wrong
// ============================================================
const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

// ── Dashboard ─────────────────────────────────────────────────
router.get('/dashboard', auth, async (req, res) => {
  try {
    const [mr, balance, active, lensOut, reminders, daily] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(total_amount),0) AS total, COALESCE(SUM(advance_amount),0) AS collected, COALESCE(SUM(balance_amount),0) AS owed, COUNT(*) AS order_count FROM orders WHERE DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW())`),
      pool.query(`SELECT COALESCE(SUM(balance_amount),0) AS total FROM orders WHERE status != 'delivered'`),
      pool.query(`SELECT COUNT(*) AS count FROM orders WHERE status NOT IN ('delivered','cancelled')`),
      pool.query(`SELECT COUNT(*) AS count FROM orders WHERE lens_company IS NOT NULL AND lens_step < 3`),
      pool.query(`SELECT o.id, o.order_number, o.deliver_date, o.balance_amount, c.name AS customer_name, c.phone FROM orders o JOIN customers c ON o.customer_id=c.id WHERE o.deliver_date <= CURRENT_DATE + INTERVAL '2 days' AND o.status != 'delivered' ORDER BY o.deliver_date LIMIT 10`),
      pool.query(`SELECT COALESCE(SUM(total_amount),0) AS total FROM orders WHERE created_at::date=CURRENT_DATE`),
    ]);
    res.json({
      month_revenue: { ...mr.rows[0] },
      total_balance: balance.rows[0].total,
      active_orders: active.rows[0].count,
      lens_jobs_out: lensOut.rows[0].count,
      reminders: reminders.rows,
      daily_revenue: daily.rows[0].total,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// ── Revenue ───────────────────────────────────────────────────
router.get('/revenue', auth, async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  try {
    const [summary, trend, orders] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(total_amount),0) AS total, COALESCE(SUM(advance_amount),0) AS collected, COALESCE(SUM(balance_amount),0) AS owed, COUNT(*) AS order_count FROM orders WHERE TO_CHAR(created_at,'YYYY-MM')=$1`, [month]),
      pool.query(`SELECT TO_CHAR(DATE_TRUNC('month',created_at),'Mon YY') AS month, COALESCE(SUM(total_amount),0) AS total, COUNT(*) AS order_count FROM orders WHERE created_at >= NOW() - INTERVAL '6 months' GROUP BY DATE_TRUNC('month',created_at) ORDER BY DATE_TRUNC('month',created_at)`),
      pool.query(`SELECT o.*, c.name AS customer_name FROM orders o JOIN customers c ON o.customer_id=c.id WHERE TO_CHAR(o.created_at,'YYYY-MM')=$1 ORDER BY o.created_at DESC`, [month]),
    ]);
    res.json({ summary: summary.rows[0], trend: trend.rows, orders: orders.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// ── Profit report ─────────────────────────────────────────────
router.get('/profit', auth, async (req, res) => {
  try {

    // ── FIXED: variable names match the query order ──────────
    const [monthly, qsSales, expByMonth, topMargin] = await Promise.all([

      // 1. Month by month orders: revenue, cost, gross profit
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', o.created_at), 'Mon YY')  AS month,
          TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') AS month_key,
          DATE_TRUNC('month', o.created_at)                      AS month_date,
          COALESCE(SUM(o.total_amount), 0)                       AS revenue,
          COALESCE(SUM(o.frame_buy_price + o.lens_buy_price), 0) AS cost_of_goods,
          COALESCE(SUM(o.total_amount) - SUM(o.frame_buy_price + o.lens_buy_price), 0) AS gross_profit,
          COUNT(*)                                                AS order_count
        FROM orders o
        WHERE o.created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', o.created_at)
        ORDER BY DATE_TRUNC('month', o.created_at)
      `),

      // 2. Quick sale revenue per month
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month_key,
          COALESCE(SUM(total), 0) AS qs_revenue
        FROM quick_sales
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
      `),

      // 3. Expenses per month — FIXED query
      pool.query(`
        SELECT
          TO_CHAR(date, 'YYYY-MM') AS month_key,
          COALESCE(SUM(amount), 0) AS total_expenses
        FROM expenses
        WHERE date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY TO_CHAR(date, 'YYYY-MM')
      `),

      // 4. Best margin frames (top 8)
      pool.query(`
        SELECT
          frame,
          COALESCE(AVG(frame_sell_price - frame_buy_price), 0) AS avg_frame_profit,
          COALESCE(AVG(lens_sell_price  - lens_buy_price),  0) AS avg_lens_profit,
          COALESCE(AVG(total_amount - frame_buy_price - lens_buy_price), 0) AS avg_total_profit,
          COUNT(*) AS orders
        FROM orders
        WHERE frame IS NOT NULL AND frame != ''
          AND created_at >= NOW() - INTERVAL '3 months'
        GROUP BY frame
        HAVING COUNT(*) >= 1
        ORDER BY avg_total_profit DESC
        LIMIT 8
      `),
    ]);

    // ── Build lookup maps ─────────────────────────────────────
    const qsMap = {};
    qsSales.rows.forEach(r => {
      qsMap[r.month_key] = parseFloat(r.qs_revenue || 0);
    });

    // FIXED: now correctly reads from expByMonth not recentOrders
    const expMap = {};
    expByMonth.rows.forEach(r => {
      expMap[r.month_key] = parseFloat(r.total_expenses || 0);
    });

    // ── Merge into final monthly data ─────────────────────────
    const merged = monthly.rows.map(m => {
      const revenue      = parseFloat(m.revenue)       || 0;
      const qsRevenue    = qsMap[m.month_key]          || 0;
      const totalRevenue = revenue + qsRevenue;
      const costOfGoods  = parseFloat(m.cost_of_goods) || 0;
      const grossProfit  = totalRevenue - costOfGoods;
      const expenses     = expMap[m.month_key]         || 0;
      const netProfit    = grossProfit - expenses;
      const grossMargin  = totalRevenue > 0 ? Math.round(grossProfit / totalRevenue * 100) : 0;
      const netMargin    = totalRevenue > 0 ? Math.round(netProfit   / totalRevenue * 100) : 0;
      return {
        month:         m.month,
        month_key:     m.month_key,
        order_count:   m.order_count,
        revenue:       totalRevenue,
        cost_of_goods: costOfGoods,
        gross_profit:  grossProfit,
        expenses,
        net_profit:    netProfit,
        gross_margin:  grossMargin,
        net_margin:    netMargin,
      };
    });

    // ── 6-month totals ────────────────────────────────────────
    const totals = merged.reduce((acc, m) => ({
      revenue:       acc.revenue       + m.revenue,
      cost_of_goods: acc.cost_of_goods + m.cost_of_goods,
      gross_profit:  acc.gross_profit  + m.gross_profit,
      expenses:      acc.expenses      + m.expenses,
      net_profit:    acc.net_profit    + m.net_profit,
    }), { revenue:0, cost_of_goods:0, gross_profit:0, expenses:0, net_profit:0 });

    res.json({
      monthly:           merged,
      totals,
      top_margin_frames: topMargin.rows,
    });

  } catch (err) {
    console.error('Profit report error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

// ── Lens jobs ─────────────────────────────────────────────────
router.get('/lensjobs', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, c.name AS customer_name, c.phone
      FROM orders o JOIN customers c ON o.customer_id=c.id
      WHERE o.lens_company IS NOT NULL AND o.lens_step < 3
      ORDER BY o.deliver_date ASC LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── Top sellers ───────────────────────────────────────────────
router.get('/topsellers', auth, async (req, res) => {
  try {
    const [frames, lenses] = await Promise.all([
      pool.query(`SELECT frame, COUNT(*) AS units, COALESCE(SUM(frame_sell_price),0) AS revenue FROM orders WHERE frame IS NOT NULL AND frame!='' AND created_at >= NOW() - INTERVAL '3 months' GROUP BY frame ORDER BY units DESC LIMIT 10`),
      pool.query(`SELECT lens_type, COUNT(*) AS units FROM orders WHERE lens_type IS NOT NULL AND created_at >= NOW() - INTERVAL '3 months' GROUP BY lens_type ORDER BY units DESC`),
    ]);
    res.json({ frames: frames.rows, lenses: lenses.rows });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;