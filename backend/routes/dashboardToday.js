// ============================================================
//  Dashboard Today Route — /api/dashboard-today
//  Returns ALL dashboard data in ONE query round-trip
//  Replaces 6 separate API calls from the frontend
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const month = today.slice(0, 7);

  try {
    const [
      monthRevenue,
      todayOrders,
      todayQS,
      todayExpenses,
      todayDeposits,
      todayRepairs,
      totalBalance,
      activeOrders,
      lensJobsOut,
      reminders,
    ] = await Promise.all([

      // Month revenue — orders only (always safe)
      pool.query(`
        SELECT
          COALESCE(SUM(total_amount),0)   AS total,
          COALESCE(SUM(advance_amount),0) AS collected,
          COALESCE(SUM(balance_amount),0) AS owed,
          COUNT(id)                        AS order_count
        FROM orders
        WHERE TO_CHAR(created_at,'YYYY-MM') = $1
      `, [month]),

      // Today's orders
      pool.query(`
        SELECT advance_amount FROM orders WHERE created_at::date = $1
      `, [today]),

      // Today's quick sales — safe
      pool.query(`
        SELECT total FROM quick_sales WHERE created_at::date = $1
      `, [today]).catch(()=>({ rows:[] })),

      // Today's expenses — safe
      pool.query(`
        SELECT amount FROM expenses WHERE date = $1
      `, [today]).catch(()=>({ rows:[] })),

      // Today's deposits — safe
      pool.query(`
        SELECT amount FROM cash_deposits WHERE date = $1
      `, [today]).catch(()=>({ rows:[] })),

      // Today's repairs — safe
      pool.query(`
        SELECT charge FROM repairs
        WHERE created_at::date = $1 AND status != 'cancelled'
      `, [today]).catch(()=>({ rows:[] })),

      // Total outstanding balance
      pool.query(`
        SELECT COALESCE(SUM(balance_amount),0) AS b
        FROM orders
        WHERE balance_amount > 0 AND status != 'cancelled'
      `),

      // Active orders count
      pool.query(`
        SELECT COUNT(*) AS c
        FROM orders
        WHERE status IN ('created','sent_to_lab','received')
      `),

      // Lens jobs out
      pool.query(`
        SELECT COUNT(*) AS c
        FROM orders
        WHERE lens_step BETWEEN 1 AND 2
      `),

      // Balance reminders
      pool.query(`
        SELECT o.id, o.order_number, o.deliver_date,
               o.balance_amount, c.name AS customer_name, c.phone
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.balance_amount > 0
          AND o.status != 'cancelled'
          AND o.deliver_date <= CURRENT_DATE + INTERVAL '7 days'
        ORDER BY o.deliver_date ASC
        LIMIT 10
      `),
    ]);

    const mr = monthRevenue.rows[0];

    // Fetch month QS and repairs separately with safe fallback
    let qs_month_total = 0, qs_month_count = 0;
    let rep_month_total = 0, rep_month_count = 0;
    try {
      const qsM = await pool.query(
        `SELECT COALESCE(SUM(total),0) AS t, COUNT(*) AS c
         FROM quick_sales WHERE TO_CHAR(created_at,'YYYY-MM')=$1`, [month]);
      qs_month_total = parseFloat(qsM.rows[0].t||0);
      qs_month_count = parseInt(qsM.rows[0].c||0);
    } catch(e) {}
    try {
      const repM = await pool.query(
        `SELECT COALESCE(SUM(charge),0) AS t, COUNT(*) AS c
         FROM repairs WHERE TO_CHAR(created_at,'YYYY-MM')=$1
         AND status NOT IN ('cancelled','pending')`, [month]);
      rep_month_total = parseFloat(repM.rows[0].t||0);
      rep_month_count = parseInt(repM.rows[0].c||0);
    } catch(e) {}

    mr.qs_total     = qs_month_total;
    mr.qs_count     = qs_month_count;
    mr.repair_total = rep_month_total;
    mr.repair_count = rep_month_count;
    mr.grand_total  = parseFloat(mr.total||0) + qs_month_total + rep_month_total;
    mr.collected    = parseFloat(mr.collected||0) + qs_month_total + rep_month_total;

    // Daily cash summary
    const orderIncome  = todayOrders.rows.reduce((s,r)=>s+parseFloat(r.advance_amount||0),0);
    const qsIncome     = todayQS.rows.reduce((s,r)=>s+parseFloat(r.total||0),0);
    const repairIncome = todayRepairs.rows.reduce((s,r)=>s+parseFloat(r.charge||0),0);
    const totalIncome  = orderIncome + qsIncome + repairIncome;
    const totalExp     = todayExpenses.rows.reduce((s,r)=>s+parseFloat(r.amount||0),0);
    const totalDep     = todayDeposits.rows.reduce((s,r)=>s+parseFloat(r.amount||0),0);

    res.json({
      // Month stats
      month_revenue:  mr,
      total_balance:  totalBalance.rows[0].b,
      active_orders:  parseInt(activeOrders.rows[0].c),
      lens_jobs_out:  parseInt(lensJobsOut.rows[0].c),
      reminders:      reminders.rows,

      // Daily cash
      daily_cash: {
        orderIncome,
        qsIncome,
        repairIncome,
        totalIncome,
        totalExp,
        totalDep,
        cashInHand:   totalIncome - totalExp - totalDep,
        orderCount:   todayOrders.rows.length,
        qsCount:      todayQS.rows.length,
        repairCount:  todayRepairs.rows.length,
        expCount:     todayExpenses.rows.length,
        depCount:     todayDeposits.rows.length,
      },
    });
  } catch (err) {
    console.error('Dashboard today error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

module.exports = router;