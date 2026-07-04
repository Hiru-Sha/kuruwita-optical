// ============================================================
//  Reports Routes — /api/reports  (safe version)
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// Helper — safely query, return default on error
async function safeQuery(sql, params = [], defaultVal = { rows: [] }) {
  try {
    return await pool.query(sql, params);
  } catch(e) {
    console.warn('Report query skipped:', e.message.slice(0, 80));
    return defaultVal;
  }
}

// ── Revenue ───────────────────────────────────────────────────
router.get('/revenue', auth, async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  try {
    // Orders — always exists
    const orders = await pool.query(`
      SELECT
        COALESCE(SUM(total_amount),   0) AS total,
        COALESCE(SUM(advance_amount), 0) AS collected,
        COALESCE(SUM(balance_amount), 0) AS owed,
        COUNT(*)                          AS order_count
      FROM orders
      WHERE TO_CHAR(created_at,'YYYY-MM') = $1
    `, [month]);

    // Quick sales — may not exist
    const quickSales = await safeQuery(`
      SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count
      FROM quick_sales
      WHERE TO_CHAR(created_at,'YYYY-MM') = $1
    `, [month], { rows: [{ total: 0, count: 0 }] });

    // Repairs — may not exist
    const repairs = await safeQuery(`
      SELECT COALESCE(SUM(charge),0) AS total, COUNT(*) AS count
      FROM repairs
      WHERE TO_CHAR(created_at,'YYYY-MM') = $1
      AND status IN ('done','collected','completed')
    `, [month], { rows: [{ total: 0, count: 0 }] });

    // 6-month trend using only orders (always safe)
    const trend = await pool.query(`
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
        COALESCE(o.rev, 0) AS total,
        COALESCE(o.rev, 0) AS order_revenue,
        0                  AS qs_revenue,
        0                  AS repair_revenue,
        COALESCE(o.cnt, 0) AS order_count,
        0 AS qs_count, 0 AS repair_count
      FROM months
      LEFT JOIN (
        SELECT DATE_TRUNC('month', created_at) AS m,
          SUM(total_amount) AS rev, COUNT(*) AS cnt
        FROM orders GROUP BY 1
      ) o ON o.m = months.m
      ORDER BY months.m
    `);

    // Try to add QS to trend
    const qsTrend = await safeQuery(`
      SELECT DATE_TRUNC('month', created_at) AS m,
        SUM(total) AS rev, COUNT(*) AS cnt
      FROM quick_sales
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY 1
    `, [], { rows: [] });

    const repairTrend = await safeQuery(`
      SELECT DATE_TRUNC('month', created_at) AS m,
        SUM(charge) AS rev, COUNT(*) AS cnt
      FROM repairs
      WHERE created_at >= NOW() - INTERVAL '6 months'
      AND status IN ('done','collected','completed')
      GROUP BY 1
    `, [], { rows: [] });

    // Merge QS and repairs into trend
    const qsMap = {};
    qsTrend.rows.forEach(r => { qsMap[r.m?.toISOString()?.slice(0,7)] = parseFloat(r.rev||0); });
    const repMap = {};
    repairTrend.rows.forEach(r => { repMap[r.m?.toISOString()?.slice(0,7)] = parseFloat(r.rev||0); });

    const mergedTrend = trend.rows.map(row => {
      const qsRev  = qsMap[row.month_key]  || 0;
      const repRev = repMap[row.month_key] || 0;
      return {
        ...row,
        qs_revenue:     qsRev,
        repair_revenue: repRev,
        total:          parseFloat(row.order_revenue||0) + qsRev + repRev,
      };
    });

    // Order list for month
    const orderList = await pool.query(`
      SELECT o.*, c.name AS customer_name
      FROM orders o JOIN customers c ON o.customer_id = c.id
      WHERE TO_CHAR(o.created_at,'YYYY-MM') = $1
      ORDER BY o.created_at DESC
    `, [month]);

    const o  = orders.rows[0];
    const qs = quickSales.rows[0];
    const rp = repairs.rows[0];

    res.json({
      summary: {
        total:        parseFloat(o.total||0) + parseFloat(qs.total||0) + parseFloat(rp.total||0),
        order_total:  parseFloat(o.total||0),
        qs_total:     parseFloat(qs.total||0),
        repair_total: parseFloat(rp.total||0),
        collected:    parseFloat(o.collected||0),
        owed:         parseFloat(o.owed||0),
        order_count:  parseInt(o.order_count||0),
        qs_count:     parseInt(qs.count||0),
        repair_count: parseInt(rp.count||0),
      },
      trend:  mergedTrend,
      orders: orderList.rows,
    });
  } catch (err) {
    console.error('Revenue error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Profit ────────────────────────────────────────────────────
router.get('/profit', auth, async (req, res) => {
  try {
    // Orders per month — always works
    const monthly = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY')  AS month,
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month_key,
        COALESCE(SUM(total_amount), 0) AS revenue,
        -- Frame COGS only — lens cost comes from Lab Receivings expenses
        COALESCE(SUM(
          CASE WHEN customer_own_frame THEN 0 ELSE COALESCE(frame_buy_price,0) END
        ), 0) AS cost_of_goods,
        COALESCE(SUM(advance_amount), 0) AS collected,
        COALESCE(SUM(balance_amount), 0) AS owed,
        COUNT(*) AS order_count
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);

    // QS per month — safe
    const qsSales = await safeQuery(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month_key,
        COALESCE(SUM(total), 0) AS qs_revenue,
        COUNT(*) AS qs_count
      FROM quick_sales
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
    `);

    // Repairs per month — safe
    const repairsQ = await safeQuery(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month_key,
        COALESCE(SUM(charge), 0) AS repair_revenue,
        COUNT(*) AS repair_count
      FROM repairs
      WHERE created_at >= NOW() - INTERVAL '6 months'
      AND status IN ('done','collected','completed')
      GROUP BY DATE_TRUNC('month', created_at)
    `);

    // Operating expenses per month — EXCLUDE Lab Payment (already in COGS via lens cost)
    const expByMonth = await safeQuery(`
      SELECT
        TO_CHAR(date, 'YYYY-MM') AS month_key,
        COALESCE(SUM(CASE WHEN category != 'Lab Payment' THEN amount END), 0) AS total_expenses
      FROM expenses
      WHERE date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(date, 'YYYY-MM')
    `);

    // Lens COGS per month — Lab Payment expenses = actual lens cost paid
    const lensByMonth = await safeQuery(`
      SELECT
        TO_CHAR(date, 'YYYY-MM') AS month_key,
        COALESCE(SUM(CASE WHEN category = 'Lab Payment' THEN amount END), 0) AS lens_cogs
      FROM expenses
      WHERE date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(date, 'YYYY-MM')
    `);

    // Top margin frames — safe
    const topMargin = await safeQuery(`
      SELECT
        frame,
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
    `);

    // Build lookup maps
    const qsMap   = {};
    qsSales.rows.forEach(r => { qsMap[r.month_key]   = parseFloat(r.qs_revenue||0); });
    const repMap  = {};
    repairsQ.rows.forEach(r => { repMap[r.month_key]  = parseFloat(r.repair_revenue||0); });
    const expMap  = {};
    expByMonth.rows.forEach(r => { expMap[r.month_key]  = parseFloat(r.total_expenses||0); });
    const lensMap = {};
    lensByMonth.rows.forEach(r => { lensMap[r.month_key] = parseFloat(r.lens_cogs||0); });

    const merged = monthly.rows.map(m => {
      const orderRev     = parseFloat(m.revenue||0);
      const qsRev        = qsMap[m.month_key]   || 0;
      const repRev       = repMap[m.month_key]  || 0;
      const totalRevenue = orderRev + qsRev + repRev;
      const frameCOGS    = parseFloat(m.cost_of_goods||0);  // frame_buy_price
      const lensCOGS     = lensMap[m.month_key] || 0;       // Lab Receivings
      const costOfGoods  = frameCOGS + lensCOGS;            // correct combined COGS
      const grossProfit  = totalRevenue - costOfGoods;
      const expenses     = expMap[m.month_key]  || 0;       // operating only
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
        cost_of_goods:  costOfGoods,   // frame + lens COGS combined
        frame_cogs:     frameCOGS,
        lens_cogs:      lensCOGS,
        gross_profit:   grossProfit,
        expenses,
        net_profit:     netProfit,
        net_margin:     netMargin,
        collected:      parseFloat(m.collected||0),
        owed:           parseFloat(m.owed||0),
        cogs_entered:   costOfGoods > 0,
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
    });
  } catch (err) {
    console.error('Profit error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Lens jobs ─────────────────────────────────────────────────
router.get('/lensjobs', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, c.name AS customer_name, c.phone
      FROM orders o JOIN customers c ON o.customer_id = c.id
      WHERE o.lens_company IS NOT NULL
        AND o.lens_step IS NOT NULL
        AND o.lens_step < 3
      ORDER BY o.deliver_date ASC NULLS LAST
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Top sellers ───────────────────────────────────────────────
router.get('/topsellers', auth, async (req, res) => {
  try {
    const frames = await pool.query(`
      SELECT frame, COUNT(*) AS units,
        COALESCE(SUM(frame_sell_price),0) AS revenue,
        COALESCE(AVG(NULLIF(frame_sell_price,0)),0) AS avg_price
      FROM orders
      WHERE frame IS NOT NULL AND frame != ''
        AND created_at >= NOW() - INTERVAL '3 months'
      GROUP BY frame ORDER BY units DESC LIMIT 10
    `);

    const lenses = await pool.query(`
      SELECT lens_type, COUNT(*) AS units,
        COALESCE(SUM(lens_sell_price),0) AS revenue
      FROM orders
      WHERE lens_type IS NOT NULL
        AND created_at >= NOW() - INTERVAL '3 months'
      GROUP BY lens_type ORDER BY units DESC
    `);

    const coatings = await pool.query(`
      SELECT lens_coating, COUNT(*) AS units
      FROM orders
      WHERE lens_coating IS NOT NULL
        AND created_at >= NOW() - INTERVAL '3 months'
      GROUP BY lens_coating ORDER BY units DESC LIMIT 8
    `);

    const companies = await pool.query(`
      SELECT lens_company, COUNT(*) AS units,
        COALESCE(SUM(lens_sell_price),0) AS revenue
      FROM orders
      WHERE lens_company IS NOT NULL
        AND created_at >= NOW() - INTERVAL '3 months'
      GROUP BY lens_company ORDER BY units DESC LIMIT 8
    `);

    const quickItems = await safeQuery(`
      SELECT si.name AS item_name, SUM(si.quantity) AS units,
        COALESCE(SUM(si.quantity * si.unit_price),0) AS revenue
      FROM quick_sales qs
      JOIN quick_sale_items si ON si.sale_id = qs.id
      WHERE qs.created_at >= NOW() - INTERVAL '3 months'
      GROUP BY si.name ORDER BY units DESC LIMIT 8
    `);

    res.json({
      frames:     frames.rows,
      lenses:     lenses.rows,
      coatings:   coatings.rows,
      companies:  companies.rows,
      quickItems: quickItems.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ── GET /api/reports/comparison?month=YYYY-MM ────────────────
// Returns this month, last month, and same month last year data
router.get('/comparison', auth, async (req, res) => {
  try {
    const month    = req.query.month || new Date().toISOString().slice(0, 7);
    const [y, m]   = month.split('-').map(Number);
    const lastM    = m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,'0')}`;
    const lastYear = `${y-1}-${String(m).padStart(2,'0')}`;

    const periodData = async (mo) => {
      const [orders, qs, repairs, expenses] = await Promise.all([
        safeQuery(`SELECT
          COALESCE(SUM(total_amount),0) AS revenue,
          COALESCE(SUM(advance_amount),0) AS collected,
          COALESCE(SUM(balance_amount),0) AS owed,
          COALESCE(SUM(CASE WHEN customer_own_frame THEN 0 ELSE COALESCE(frame_buy_price,0) END),0) AS frame_cogs,
          COUNT(*) AS order_count
        FROM orders WHERE TO_CHAR(created_at,'YYYY-MM')=$1`, [mo]),
        safeQuery(`SELECT COALESCE(SUM(total),0) AS qs_revenue, COUNT(*) AS qs_count FROM quick_sales WHERE TO_CHAR(created_at,'YYYY-MM')=$1`, [mo]),
        safeQuery(`SELECT COALESCE(SUM(charge),0) AS repair_revenue, COUNT(*) AS repair_count FROM repairs WHERE TO_CHAR(created_at,'YYYY-MM')=$1 AND status IN ('done','collected')`, [mo]),
        safeQuery(`SELECT COALESCE(SUM(amount),0) AS total_expenses FROM expenses WHERE TO_CHAR(date,'YYYY-MM')=$1 AND category != 'Lab Payment'`, [mo]),
      ]);
      const ord = orders.rows[0]||{};
      const q   = qs.rows[0]||{};
      const r   = repairs.rows[0]||{};
      const e   = expenses.rows[0]||{};
      const total_revenue = parseFloat(ord.revenue||0) + parseFloat(q.qs_revenue||0) + parseFloat(r.repair_revenue||0);
      const expenses_amt  = parseFloat(e.total_expenses||0);
      const cogs          = parseFloat(ord.frame_cogs||0);
      const gross_profit  = total_revenue - cogs;
      const net_profit    = gross_profit - expenses_amt;
      return {
        month: mo,
        revenue:       total_revenue,
        order_revenue: parseFloat(ord.revenue||0),
        qs_revenue:    parseFloat(q.qs_revenue||0),
        repair_revenue:parseFloat(r.repair_revenue||0),
        expenses:      expenses_amt,
        cogs,
        gross_profit,
        net_profit,
        net_margin:    total_revenue > 0 ? Math.round(net_profit/total_revenue*100) : 0,
        order_count:   parseInt(ord.order_count||0),
        qs_count:      parseInt(q.qs_count||0),
        repair_count:  parseInt(r.repair_count||0),
        collected:     parseFloat(ord.collected||0),
        owed:          parseFloat(ord.owed||0),
      };
    };

    const [thisMonth, prevMonth, lastYearMonth] = await Promise.all([
      periodData(month),
      periodData(lastM),
      periodData(lastYear),
    ]);

    res.json({ thisMonth, prevMonth, lastYearMonth });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;