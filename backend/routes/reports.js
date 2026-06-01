// ============================================================
//  Reports Routes — /api/reports
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// ── Revenue ───────────────────────────────────────────────────
router.get('/revenue', auth, async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  try {
    const [orders, quickSales, repairs, trend, orderList] = await Promise.all([
      // Orders summary for month
      pool.query(`
        SELECT
          COALESCE(SUM(total_amount),   0) AS total,
          COALESCE(SUM(advance_amount), 0) AS collected,
          COALESCE(SUM(balance_amount), 0) AS owed,
          COUNT(*)                          AS order_count
        FROM orders
        WHERE TO_CHAR(created_at,'YYYY-MM') = $1
      `, [month]),

      // Quick sales for month
      pool.query(`
        SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count
        FROM quick_sales
        WHERE TO_CHAR(created_at,'YYYY-MM') = $1
      `, [month]),

      // Repairs for month
      pool.query(`
        SELECT COALESCE(SUM(charge),0) AS total, COUNT(*) AS count
        FROM repairs
        WHERE TO_CHAR(created_at,'YYYY-MM') = $1
        AND status = 'completed'
      `, [month]),

      // 6-month trend — orders + QS + repairs
      pool.query(`
        WITH months AS (
          SELECT generate_series(
            DATE_TRUNC('month', NOW() - INTERVAL '5 months'),
            DATE_TRUNC('month', NOW()),
            '1 month'::interval
          ) AS m
        )
        SELECT
          TO_CHAR(months.m, 'Mon YY')  AS month,
          TO_CHAR(months.m, 'YYYY-MM') AS month_key,
          COALESCE(o.rev,  0) + COALESCE(q.rev, 0) + COALESCE(r.rev, 0) AS total,
          COALESCE(o.rev,  0) AS order_revenue,
          COALESCE(q.rev,  0) AS qs_revenue,
          COALESCE(r.rev,  0) AS repair_revenue,
          COALESCE(o.cnt,  0) AS order_count,
          COALESCE(q.cnt,  0) AS qs_count,
          COALESCE(r.cnt,  0) AS repair_count
        FROM months
        LEFT JOIN (
          SELECT DATE_TRUNC('month',created_at) AS m,
            SUM(total_amount) AS rev, COUNT(*) AS cnt
          FROM orders GROUP BY 1
        ) o ON o.m = months.m
        LEFT JOIN (
          SELECT DATE_TRUNC('month',created_at) AS m,
            SUM(total) AS rev, COUNT(*) AS cnt
          FROM quick_sales GROUP BY 1
        ) q ON q.m = months.m
        LEFT JOIN (
          SELECT DATE_TRUNC('month',created_at) AS m,
            SUM(charge) AS rev, COUNT(*) AS cnt
          FROM repairs WHERE status='completed' GROUP BY 1
        ) r ON r.m = months.m
        ORDER BY months.m
      `),

      // Order list for the month
      pool.query(`
        SELECT o.*, c.name AS customer_name
        FROM orders o JOIN customers c ON o.customer_id = c.id
        WHERE TO_CHAR(o.created_at,'YYYY-MM') = $1
        ORDER BY o.created_at DESC
      `, [month]),
    ]);

    const o  = orders.rows[0];
    const qs = quickSales.rows[0];
    const rp = repairs.rows[0];

    res.json({
      summary: {
        total:         parseFloat(o.total||0) + parseFloat(qs.total||0) + parseFloat(rp.total||0),
        order_total:   parseFloat(o.total||0),
        qs_total:      parseFloat(qs.total||0),
        repair_total:  parseFloat(rp.total||0),
        collected:     parseFloat(o.collected||0),
        owed:          parseFloat(o.owed||0),
        order_count:   parseInt(o.order_count||0),
        qs_count:      parseInt(qs.count||0),
        repair_count:  parseInt(rp.count||0),
      },
      trend:  trend.rows,
      orders: orderList.rows,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// ── Profit ────────────────────────────────────────────────────
router.get('/profit', auth, async (req, res) => {
  try {
    const [monthly, qsSales, repairs, expByMonth, topMargin, paymentMix] = await Promise.all([

      // 1. Orders per month with cost of goods
      // Cost of goods = frame_buy_price + lens_buy_price (set when lab bill received)
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY')  AS month,
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month_key,
          COALESCE(SUM(total_amount), 0)                        AS revenue,
          COALESCE(SUM(
            COALESCE(frame_buy_price,0) + COALESCE(lens_buy_price,0)
          ), 0)                                                 AS cost_of_goods,
          COALESCE(SUM(advance_amount), 0)                      AS collected,
          COALESCE(SUM(balance_amount), 0)                      AS owed,
          COUNT(*)                                              AS order_count
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `),

      // 2. Quick sales per month
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month_key,
          COALESCE(SUM(total), 0) AS qs_revenue,
          COUNT(*) AS qs_count
        FROM quick_sales
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
      `),

      // 3. Repairs per month
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month_key,
          COALESCE(SUM(charge), 0) AS repair_revenue,
          COUNT(*) AS repair_count
        FROM repairs
        WHERE created_at >= NOW() - INTERVAL '6 months'
        AND status = 'completed'
        GROUP BY DATE_TRUNC('month', created_at)
      `),

      // 4. Expenses per month
      pool.query(`
        SELECT
          TO_CHAR(date, 'YYYY-MM')  AS month_key,
          COALESCE(SUM(amount), 0)  AS total_expenses
        FROM expenses
        WHERE date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY TO_CHAR(date, 'YYYY-MM')
      `),

      // 5. Best margin frames
      pool.query(`
        SELECT
          frame,
          COALESCE(AVG(NULLIF(frame_sell_price,0) - NULLIF(frame_buy_price,0)), 0) AS avg_frame_profit,
          COALESCE(AVG(NULLIF(lens_sell_price,0)  - NULLIF(lens_buy_price,0)),  0) AS avg_lens_profit,
          COALESCE(AVG(
            NULLIF(total_amount,0)
            - COALESCE(NULLIF(frame_buy_price,0),0)
            - COALESCE(NULLIF(lens_buy_price,0),0)
          ), 0) AS avg_total_profit,
          COUNT(*) AS orders
        FROM orders
        WHERE frame IS NOT NULL AND frame != ''
          AND created_at >= NOW() - INTERVAL '3 months'
          AND (frame_buy_price > 0 OR lens_buy_price > 0)
        GROUP BY frame
        ORDER BY avg_total_profit DESC
        LIMIT 8
      `),

      // 6. Payment method breakdown
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month_key,
          payment_method,
          COUNT(*) AS count,
          COALESCE(SUM(advance_amount), 0) AS amount
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at), payment_method
      `),
    ]);

    // Build lookup maps
    const qsMap  = {};
    qsSales.rows.forEach(r => { qsMap[r.month_key]  = parseFloat(r.qs_revenue||0); });
    const repMap = {};
    repairs.rows.forEach(r => { repMap[r.month_key] = parseFloat(r.repair_revenue||0); });
    const expMap = {};
    expByMonth.rows.forEach(r => { expMap[r.month_key] = parseFloat(r.total_expenses||0); });

    // Merge
    const merged = monthly.rows.map(m => {
      const orderRev     = parseFloat(m.revenue||0);
      const qsRev        = qsMap[m.month_key]  || 0;
      const repRev       = repMap[m.month_key] || 0;
      const totalRevenue = orderRev + qsRev + repRev;
      const costOfGoods  = parseFloat(m.cost_of_goods||0);
      const grossProfit  = totalRevenue - costOfGoods;
      const expenses     = expMap[m.month_key] || 0;
      const netProfit    = grossProfit - expenses;
      const netMargin    = totalRevenue > 0 ? Math.round(netProfit / totalRevenue * 100) : 0;
      return {
        month:          m.month,
        month_key:      m.month_key,
        order_count:    parseInt(m.order_count||0),
        revenue:        totalRevenue,
        order_revenue:  orderRev,
        qs_revenue:     qsRev,
        repair_revenue: repRev,
        cost_of_goods:  costOfGoods,
        gross_profit:   grossProfit,
        expenses,
        net_profit:     netProfit,
        net_margin:     netMargin,
        collected:      parseFloat(m.collected||0),
        owed:           parseFloat(m.owed||0),
        cogs_entered:   costOfGoods > 0, // flag: have costs been entered?
      };
    });

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
      payment_mix:       paymentMix.rows,
    });
  } catch (err) {
    console.error('Profit error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Lens jobs ─────────────────────────────────────────────────
router.get('/lensjobs', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, c.name AS customer_name, c.phone
      FROM orders o JOIN customers c ON o.customer_id = c.id
      WHERE o.lens_company IS NOT NULL AND o.lens_step < 3
      ORDER BY o.deliver_date ASC LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Top sellers ───────────────────────────────────────────────
router.get('/topsellers', auth, async (req, res) => {
  try {
    const [frames, lenses, coatings, companies, quickSaleItems] = await Promise.all([
      pool.query(`
        SELECT frame, COUNT(*) AS units,
          COALESCE(SUM(frame_sell_price),0) AS revenue,
          COALESCE(AVG(frame_sell_price),0) AS avg_price
        FROM orders WHERE frame IS NOT NULL AND frame!=''
          AND created_at >= NOW() - INTERVAL '3 months'
        GROUP BY frame ORDER BY units DESC LIMIT 10
      `),
      pool.query(`
        SELECT lens_type, COUNT(*) AS units,
          COALESCE(SUM(lens_sell_price),0) AS revenue
        FROM orders WHERE lens_type IS NOT NULL
          AND created_at >= NOW() - INTERVAL '3 months'
        GROUP BY lens_type ORDER BY units DESC
      `),
      pool.query(`
        SELECT lens_coating, COUNT(*) AS units
        FROM orders WHERE lens_coating IS NOT NULL
          AND created_at >= NOW() - INTERVAL '3 months'
        GROUP BY lens_coating ORDER BY units DESC LIMIT 8
      `),
      pool.query(`
        SELECT lens_company, COUNT(*) AS units,
          COALESCE(SUM(lens_sell_price),0) AS revenue
        FROM orders WHERE lens_company IS NOT NULL
          AND created_at >= NOW() - INTERVAL '3 months'
        GROUP BY lens_company ORDER BY units DESC LIMIT 8
      `),
      pool.query(`
        SELECT si.name AS item_name, SUM(si.quantity) AS units,
          COALESCE(SUM(si.quantity * si.unit_price),0) AS revenue
        FROM quick_sales qs
        JOIN quick_sale_items si ON si.sale_id = qs.id
        WHERE qs.created_at >= NOW() - INTERVAL '3 months'
        GROUP BY si.name ORDER BY units DESC LIMIT 8
      `).catch(()=>({ rows:[] })),
    ]);
    res.json({
      frames:     frames.rows,
      lenses:     lenses.rows,
      coatings:   coatings.rows,
      companies:  companies.rows,
      quickItems: quickSaleItems.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;