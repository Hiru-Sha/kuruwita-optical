// ============================================================
//  Dashboard Today Route — /api/dashboard-today
//
//  FIXED:
//  1. Today's income now comes from payment_logs (captures BOTH
//     advance payments AND balance collections received today)
//  2. Old orders paid today are no longer invisible
//  3. Month "collected" uses payment_logs for accuracy
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
      todayPayments,   // ← FIXED: replaces old todayOrders
      todayQS,
      todayExpenses,
      todayDeposits,
      todayRepairs,
      totalBalance,
      activeOrders,
      lensJobsOut,
      reminders,
    ] = await Promise.all([

      // 0: Month revenue (from payment_logs for accuracy)
      pool.query(`
        SELECT
          COALESCE(SUM(o.total_amount), 0)   AS total,
          COALESCE(SUM(pl.collected), 0)     AS collected,
          COALESCE(SUM(o.balance_amount), 0) AS owed,
          COUNT(DISTINCT o.id)               AS order_count
        FROM orders o
        LEFT JOIN (
          SELECT order_id, SUM(amount) AS collected
          FROM payment_logs
          WHERE TO_CHAR(payment_date,'YYYY-MM') = $1
          GROUP BY order_id
        ) pl ON pl.order_id = o.id
        WHERE TO_CHAR(o.created_at,'YYYY-MM') = $1
      `, [month]).catch(() => pool.query(`
        SELECT COALESCE(SUM(total_amount),0) AS total,
               COALESCE(SUM(advance_amount),0) AS collected,
               COALESCE(SUM(balance_amount),0) AS owed,
               COUNT(id) AS order_count
        FROM orders WHERE TO_CHAR(created_at,'YYYY-MM')=$1`, [month])),

      // 1: TODAY'S PAYMENTS (from payment_logs — captures advances + balances)
      // Falls back to old method if payment_logs table doesn't exist yet
      pool.query(`
        SELECT pl.amount, pl.payment_method, pl.payment_type,
               o.order_number, o.customer_id
        FROM payment_logs pl
        LEFT JOIN orders o ON o.id = pl.order_id
        WHERE pl.payment_date = $1
      `, [today]).catch(() => pool.query(`
        SELECT advance_amount AS amount, COALESCE(payment_method,'cash') AS payment_method, 'advance' AS payment_type
        FROM orders WHERE created_at::date=$1 AND status!='cancelled'`, [today])),

      // 2: Today's quick sales
      pool.query(`SELECT COALESCE(total,0) AS total FROM quick_sales
                  WHERE created_at::date=$1`, [today]).catch(() => ({ rows: [] })),

      // 3: Today's expenses
      pool.query(`SELECT amount FROM expenses WHERE date=$1`, [today]).catch(() => ({ rows: [] })),

      // 4: Today's deposits (cash moved to bank — NOT dealer payments)
      pool.query(`
        SELECT cd.amount FROM cash_deposits cd
        WHERE cd.date=$1
          AND (cd.order_id IS NULL OR EXISTS(SELECT 1 FROM orders o WHERE o.id=cd.order_id))
      `, [today]).catch(() => pool.query(
        'SELECT amount FROM cash_deposits WHERE date=$1', [today]
      )).catch(() => ({ rows: [] })),

      // 5: Today's repairs
      pool.query(`SELECT COALESCE(charge,0) AS charge FROM repairs
                  WHERE created_at::date=$1`, [today]).catch(() => ({ rows: [] })),

      // 6: Total outstanding balance
      pool.query(`SELECT COALESCE(SUM(balance_amount),0) AS b FROM orders
                  WHERE balance_amount>0 AND status!='cancelled'`),

      // 7: Active orders
      pool.query(`SELECT COUNT(*) AS c FROM orders
                  WHERE status IN ('created','called','overdue')`),

      // 8: Lens jobs out
      pool.query(`SELECT COUNT(*) AS c FROM orders WHERE lens_step BETWEEN 1 AND 2`),

      // 9: Balance reminders
      pool.query(`
        SELECT o.id, o.order_number, o.deliver_date,
               o.balance_amount, c.name AS customer_name, c.phone,
               o.frame, o.total_amount, o.status
        FROM orders o JOIN customers c ON o.customer_id=c.id
        WHERE o.balance_amount>0
          AND o.status NOT IN ('cancelled','delivered')
          AND o.deliver_date IS NOT NULL
          AND o.deliver_date <= CURRENT_DATE + INTERVAL '7 days'
        ORDER BY o.deliver_date ASC LIMIT 10
      `).catch(() => ({ rows: [] })),
    ]);

    const mr = monthRevenue.rows[0];

    // Month QS + repairs
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
        `SELECT COALESCE(SUM(COALESCE(charge,0)),0) AS t, COUNT(*) AS c
         FROM repairs WHERE TO_CHAR(created_at,'YYYY-MM')=$1`, [month]);
      rep_month_total = parseFloat(repM.rows[0].t||0);
      rep_month_count = parseInt(repM.rows[0].c||0);
    } catch(e) {}

    mr.qs_total     = qs_month_total;
    mr.qs_count     = qs_month_count;
    mr.repair_total = rep_month_total;
    mr.repair_count = rep_month_count;
    mr.grand_total  = parseFloat(mr.total||0) + qs_month_total + rep_month_total;
    mr.collected    = parseFloat(mr.collected||0) + qs_month_total + rep_month_total;

    // ── Daily cash calculation ──────────────────────────────────
    // Split today's order payments by method
    const orderCash = todayPayments.rows
      .filter(r => !r.payment_method || r.payment_method === 'cash')
      .reduce((s, r) => s + parseFloat(r.amount||0), 0);
    const orderBank = todayPayments.rows
      .filter(r => r.payment_method && r.payment_method !== 'cash')
      .reduce((s, r) => s + parseFloat(r.amount||0), 0);
    const orderIncome  = orderCash + orderBank;

    // Payment type breakdown (for End of Day report)
    const advancesToday = todayPayments.rows
      .filter(r => r.payment_type === 'advance')
      .reduce((s, r) => s + parseFloat(r.amount||0), 0);
    const balancesToday = todayPayments.rows
      .filter(r => r.payment_type !== 'advance')
      .reduce((s, r) => s + parseFloat(r.amount||0), 0);

    const qsIncome     = todayQS.rows.reduce((s, r) => s + parseFloat(r.total||0), 0);
    const repairIncome = todayRepairs.rows.reduce((s, r) => s + parseFloat(r.charge||0), 0);
    const totalIncome  = orderIncome + qsIncome + repairIncome;
    const totalExp     = todayExpenses.rows.reduce((s, r) => s + parseFloat(r.amount||0), 0);
    const totalDep     = todayDeposits.rows.reduce((s, r) => s + parseFloat(r.amount||0), 0);
    const todayCashIn  = orderCash + qsIncome + repairIncome;
    const cashInHand   = todayCashIn - totalExp - totalDep;
    const bankToday    = orderBank;

    // All-time cash (from payment_logs for accuracy)
    let allTimeCash = 0, allTimeDeposits = 0;
    try {
      const [atPL, atQS, atRepairs, atExp, atDep] = await Promise.all([
        pool.query('SELECT COALESCE(SUM(amount),0) AS v FROM payment_logs')
          .catch(() => pool.query('SELECT COALESCE(SUM(advance_amount),0) AS v FROM orders')),
        pool.query('SELECT COALESCE(SUM(total),0) AS v FROM quick_sales').catch(() => ({ rows: [{ v:'0' }] })),
        pool.query('SELECT COALESCE(SUM(charge),0) AS v FROM repairs').catch(() => ({ rows: [{ v:'0' }] })),
        pool.query('SELECT COALESCE(SUM(amount),0) AS v FROM expenses').catch(() => ({ rows: [{ v:'0' }] })),
        pool.query('SELECT COALESCE(SUM(amount),0) AS v FROM cash_deposits').catch(() => ({ rows: [{ v:'0' }] })),
      ]);
      const pv = parseFloat(atPL.rows[0].v)       || 0;
      const qv = parseFloat(atQS.rows[0].v)       || 0;
      const rv = parseFloat(atRepairs.rows[0].v)  || 0;
      const ev = parseFloat(atExp.rows[0].v)      || 0;
      const dv = parseFloat(atDep.rows[0].v)      || 0;
      allTimeCash     = pv + qv + rv - ev - dv;
      allTimeDeposits = dv;
    } catch(e) { console.error('[CASH ERROR]', e.message); }

    res.json({
      month_revenue: mr,
      total_balance: totalBalance.rows[0].b,
      active_orders: parseInt(activeOrders.rows[0].c),
      lens_jobs_out: parseInt(lensJobsOut.rows[0].c),
      reminders:     reminders.rows,
      daily_cash: {
        orderIncome, orderCash, orderBank,
        advancesToday, balancesToday,
        qsIncome, repairIncome, totalIncome,
        totalExp, totalDep, cashInHand,
        allTimeCash, allTimeDeposits, bankToday,
        orderPaymentCount: todayPayments.rows.length,
        qsCount:      todayQS.rows.length,
        repairCount:  todayRepairs.rows.length,
        expCount:     todayExpenses.rows.length,
        depCount:     todayDeposits.rows.length,
      },
    });
  } catch(err) {
    console.error('Dashboard today error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

module.exports = router;