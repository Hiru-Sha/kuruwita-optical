// dashboardToday.js — /api/dashboard-today
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const month = today.slice(0, 7);

  try {
    // ── Run all today's queries in parallel ──────────────────
    const [
      monthRevenue,      // 0
      todayOrders,       // 1
      todayQS,           // 2
      todayExpenses,     // 3
      todayDeposits,     // 4
      todayRepairs,      // 5
      totalBalance,      // 6
      activeOrders,      // 7
      lensJobsOut,       // 8
      reminders,         // 9
      todayBalPayments,  // 10  ← balance payments collected today from older orders
    ] = await Promise.all([

      // 0: Month revenue from orders
      pool.query(`
        SELECT
          COALESCE(SUM(total_amount),0)   AS total,
          COALESCE(SUM(advance_amount),0) AS collected,
          COALESCE(SUM(balance_amount),0) AS owed,
          COUNT(id)                        AS order_count
        FROM orders
        WHERE TO_CHAR(created_at,'YYYY-MM') = $1
      `, [month]).catch(() => ({ rows: [{ total:0, collected:0, owed:0, order_count:0 }] })),

      // 1: Today's orders (cash/bank split by payment_method)
      pool.query(`
        SELECT advance_amount, COALESCE(payment_method,'cash') AS payment_method
        FROM orders
        WHERE created_at::date = $1 AND status != 'cancelled'
      `, [today]).catch(() => ({ rows: [] })),

      // 2: Today's quick sales
      pool.query(`
        SELECT COALESCE(total,0) AS total
        FROM quick_sales
        WHERE created_at::date = $1
      `, [today]).catch(() => ({ rows: [] })),

      // 3: Today's expenses
      pool.query(`
        SELECT COALESCE(amount,0) AS amount
        FROM expenses
        WHERE date = $1
      `, [today]).catch(() => ({ rows: [] })),

      // 4: Today's deposits (cash moved to bank)
      pool.query(`
        SELECT cd.amount
        FROM cash_deposits cd
        WHERE cd.date = $1
      `, [today]).catch(() => ({ rows: [] })),

      // 5: Today's repairs
      pool.query(`
        SELECT COALESCE(charge,0) AS charge
        FROM repairs
        WHERE created_at::date = $1
      `, [today]).catch(() => ({ rows: [] })),

      // 6: Total outstanding balance across all orders
      pool.query(`
        SELECT COALESCE(SUM(balance_amount),0) AS b
        FROM orders
        WHERE balance_amount > 0 AND status != 'cancelled'
      `).catch(() => ({ rows: [{ b: 0 }] })),

      // 7: Active orders count
      pool.query(`
        SELECT COUNT(*) AS c
        FROM orders
        WHERE status IN ('created','called','overdue')
      `).catch(() => ({ rows: [{ c: 0 }] })),

      // 8: Lens jobs currently out at lab
      pool.query(`
        SELECT COUNT(*) AS c
        FROM orders
        WHERE lens_step BETWEEN 1 AND 2
      `).catch(() => ({ rows: [{ c: 0 }] })),

      // 9: Balance reminders (orders due within 7 days)
      pool.query(`
        SELECT o.id, o.order_number, o.deliver_date,
               o.balance_amount, c.name AS customer_name, c.phone,
               o.frame, o.total_amount, o.status
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.balance_amount > 0
          AND o.status NOT IN ('cancelled','delivered')
          AND o.deliver_date IS NOT NULL
          AND o.deliver_date <= CURRENT_DATE + INTERVAL '7 days'
        ORDER BY o.deliver_date ASC
        LIMIT 10
      `).catch(() => ({ rows: [] })),

      // 10: Balance payments collected TODAY from orders created on EARLIER dates
      //     last_payment_amount column added by migration.sql
      pool.query(`
        SELECT
          COALESCE(last_payment_amount, 0)     AS amount,
          COALESCE(last_payment_method,'cash') AS payment_method
        FROM orders
        WHERE last_payment_date  = $1
          AND created_at::date  != $1
          AND last_payment_amount > 0
      `, [today]).catch(() => ({ rows: [] })),   // safe fallback if column missing

    ]);

    // ── Month totals (QS + repairs added separately) ─────────
    const mr = { ...monthRevenue.rows[0] };

    let qs_month_total = 0, qs_month_count = 0;
    let rep_month_total = 0, rep_month_count = 0;
    try {
      const qsM = await pool.query(
        `SELECT COALESCE(SUM(total),0) AS t, COUNT(*) AS c
         FROM quick_sales WHERE TO_CHAR(created_at,'YYYY-MM')=$1`, [month]);
      qs_month_total = parseFloat(qsM.rows[0].t) || 0;
      qs_month_count = parseInt(qsM.rows[0].c)   || 0;
    } catch(e) {}

    try {
      const repM = await pool.query(
        `SELECT COALESCE(SUM(COALESCE(charge,0)),0) AS t, COUNT(*) AS c
         FROM repairs WHERE TO_CHAR(created_at,'YYYY-MM')=$1`, [month]);
      rep_month_total = parseFloat(repM.rows[0].t) || 0;
      rep_month_count = parseInt(repM.rows[0].c)   || 0;
    } catch(e) {}

    mr.qs_total     = qs_month_total;
    mr.qs_count     = qs_month_count;
    mr.repair_total = rep_month_total;
    mr.repair_count = rep_month_count;
    mr.grand_total  = parseFloat(mr.total || 0) + qs_month_total + rep_month_total;
    mr.collected    = parseFloat(mr.collected || 0) + qs_month_total + rep_month_total;

    // ── Today's balance payments (cash vs bank) ───────────────
    const balRows    = todayBalPayments?.rows || [];
    const balCash    = balRows
      .filter(r => !r.payment_method || r.payment_method === 'cash')
      .reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const balBank    = balRows
      .filter(r => r.payment_method && r.payment_method !== 'cash')
      .reduce((s, r) => s + parseFloat(r.amount || 0), 0);

    // ── Today's cash calculation ──────────────────────────────
    const orderCash    = todayOrders.rows
      .filter(r => !r.payment_method || r.payment_method === 'cash')
      .reduce((s, r) => s + parseFloat(r.advance_amount || 0), 0);
    const orderBank    = todayOrders.rows
      .filter(r => r.payment_method && r.payment_method !== 'cash')
      .reduce((s, r) => s + parseFloat(r.advance_amount || 0), 0);

    const qsIncome     = todayQS.rows.reduce((s,r) => s + parseFloat(r.total  || 0), 0);
    const repairIncome = todayRepairs.rows.reduce((s,r) => s + parseFloat(r.charge || 0), 0);
    const totalExp     = todayExpenses.rows.reduce((s,r) => s + parseFloat(r.amount || 0), 0);
    const totalDep     = todayDeposits.rows.reduce((s,r) => s + parseFloat(r.amount || 0), 0);

    // Cash in hand = orders cash + sales + repairs + balance payments cash
    //              - expenses - deposits (deposits move cash to bank)
    // Bank payment deposit created automatically cancels out (+balBank then -deposit = 0)
    const todayCashIn = orderCash + qsIncome + repairIncome + balCash + balBank;
    const cashInHand  = todayCashIn - totalExp - totalDep;
    const bankToday   = orderBank + balBank;
    const orderIncome = orderCash + orderBank;
    const totalIncome = orderIncome + qsIncome + repairIncome;

    // ── All-time bank balance ─────────────────────────────────
    let allTimeCash = 0, allTimeDeposits = 0;
    try {
      const [atOrders, atQS, atRepairs, atExp, atDep] = await Promise.all([
        pool.query(`SELECT COALESCE(SUM(advance_amount),0) AS v FROM orders`).catch(()=>({rows:[{v:'0'}]})),
        pool.query(`SELECT COALESCE(SUM(total),0)          AS v FROM quick_sales`).catch(()=>({rows:[{v:'0'}]})),
        pool.query(`SELECT COALESCE(SUM(COALESCE(charge,0)),0) AS v FROM repairs`).catch(()=>({rows:[{v:'0'}]})),
        pool.query(`SELECT COALESCE(SUM(amount),0)         AS v FROM expenses`).catch(()=>({rows:[{v:'0'}]})),
        pool.query(`SELECT COALESCE(SUM(amount),0)         AS v FROM cash_deposits`).catch(()=>({rows:[{v:'0'}]})),
      ]);
      const ov = parseFloat(atOrders.rows[0].v)  || 0;
      const qv = parseFloat(atQS.rows[0].v)      || 0;
      const rv = parseFloat(atRepairs.rows[0].v) || 0;
      const ev = parseFloat(atExp.rows[0].v)     || 0;
      const dv = parseFloat(atDep.rows[0].v)     || 0;
      allTimeCash     = ov + qv + rv - ev - dv;
      allTimeDeposits = dv;
    } catch(e) { console.error('[ALLTIME ERROR]', e.message); }

    // ── Stock value ───────────────────────────────────────────
    let stockValue = 0;
    try {
      const sv = await pool.query(
        `SELECT COALESCE(SUM(COALESCE(cost_price,0) * COALESCE(quantity,0)),0) AS v
         FROM inventory WHERE quantity > 0`
      );
      stockValue = parseFloat(sv.rows[0].v) || 0;
    } catch(e) {}

    res.json({
      month_revenue: mr,
      total_balance: parseFloat(totalBalance.rows[0]?.b || 0),
      active_orders: parseInt(activeOrders.rows[0]?.c || 0),
      lens_jobs_out: parseInt(lensJobsOut.rows[0]?.c  || 0),
      stock_value:   stockValue,
      reminders:     reminders.rows,
      daily_cash: {
        orderIncome, orderCash, orderBank,
        qsIncome, repairIncome, totalIncome,
        totalExp, totalDep, cashInHand,
        allTimeCash, allTimeDeposits, bankToday,
        balCash, balBank,                         // balance payments today
        orderCount:  todayOrders.rows.length,
        qsCount:     todayQS.rows.length,
        repairCount: todayRepairs.rows.length,
        expCount:    todayExpenses.rows.length,
        depCount:    todayDeposits.rows.length,
      },
    });

  } catch (err) {
    console.error('Dashboard today error:', err.message);
    res.status(500).json({ error: 'Dashboard failed: ' + err.message });
  }
});

module.exports = router;