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
      allTimeCashRes,
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

      // Today's orders — no payment_method column on orders table, treat all as cash
      pool.query(`
        SELECT advance_amount, 'cash' AS payment_method
        FROM orders WHERE created_at::date = $1 AND status != 'cancelled'
      `, [today]).catch(()=>({ rows:[] })),

      // Today's quick sales — safe
      pool.query(`
        SELECT COALESCE(total,0) AS total FROM quick_sales
        WHERE created_at::date = $1
      `, [today]).catch(()=>({ rows:[] })),

      // Today's expenses — safe
      pool.query(`
        SELECT amount FROM expenses WHERE date = $1
      `, [today]).catch(()=>({ rows:[] })),

      // Today's deposits — exclude any linked to orders that no longer exist
      pool.query(`
        SELECT cd.amount FROM cash_deposits cd
        WHERE cd.date = $1
          AND (cd.order_id IS NULL OR EXISTS (
            SELECT 1 FROM orders o WHERE o.id = cd.order_id
          ))
      `, [today]).catch(()=>pool.query(`SELECT amount FROM cash_deposits WHERE date = $1`, [today])).catch(()=>({ rows:[] })),

      // Today's repairs — safe, no status filter
      pool.query(`
        SELECT COALESCE(charge,0) AS charge FROM repairs
        WHERE created_at::date = $1
      `, [today]).catch(()=>({ rows:[] })),

      // Total outstanding balance
      pool.query(`
        SELECT COALESCE(SUM(balance_amount),0) AS b
        FROM orders
        WHERE balance_amount > 0 AND status != 'cancelled'
      `),

      // All-time cash in hand — sequential to catch individual errors
      (async () => {
        try {
          const oRes  = await pool.query(`SELECT COALESCE(SUM(advance_amount),0) AS v FROM orders`);
          const qRes  = await pool.query(`SELECT COALESCE(SUM(amount_paid),0) AS v FROM quick_sales`).catch(()=>pool.query(`SELECT COALESCE(SUM(total),0) AS v FROM quick_sales`));
          const rRes  = await pool.query(`SELECT COALESCE(SUM(charge),0) AS v FROM repairs`).catch(()=>({rows:[{v:0}]}));
          const exRes = await pool.query(`SELECT COALESCE(SUM(amount),0) AS v FROM expenses`).catch(()=>({rows:[{v:0}]}));
          const dRes  = await pool.query(`SELECT COALESCE(SUM(amount),0) AS v FROM cash_deposits`).catch(()=>({rows:[{v:0}]}));
          const orders_v   = parseFloat(oRes.rows[0].v)  || 0;
          const qs_v       = parseFloat(qRes.rows[0].v)  || 0;
          const repairs_v  = parseFloat(rRes.rows[0].v)  || 0;
          const expenses_v = parseFloat(exRes.rows[0].v) || 0;
          const deposits_v = parseFloat(dRes.rows[0].v)  || 0;
          const total_cash_in_hand = orders_v + qs_v + repairs_v - expenses_v - deposits_v;
          console.log(`[CASH] orders=${orders_v} qs=${qs_v} repairs=${repairs_v} exp=${expenses_v} dep=${deposits_v} => TOTAL=${total_cash_in_hand}`);
          return { rows:[{ total_cash_in_hand, total_deposited: deposits_v }] };
        } catch(e) {
          console.error('[CASH ERROR]', e.message);
          return { rows:[{ total_cash_in_hand:0, total_deposited:0 }] };
        }
      })(),

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

      // Balance reminders — use customer fields directly from orders table
      pool.query(`
        SELECT id, order_number, deliver_date,
               balance_amount, customer_name, phone,
               frame, total_amount, status
        FROM orders
        WHERE balance_amount > 0
          AND status NOT IN ('cancelled','delivered')
          AND deliver_date IS NOT NULL
          AND deliver_date <= CURRENT_DATE + INTERVAL '7 days'
        ORDER BY deliver_date ASC
        LIMIT 10
      `).catch(()=>({ rows:[] })),
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
    } catch(e) { console.log('QS month skip:', e.message); }
    try {
      const repM = await pool.query(
        `SELECT COALESCE(SUM(COALESCE(charge,0)),0) AS t, COUNT(*) AS c
         FROM repairs WHERE TO_CHAR(created_at,'YYYY-MM')=$1`, [month]);
      rep_month_total = parseFloat(repM.rows[0].t||0);
      rep_month_count = parseInt(repM.rows[0].c||0);
    } catch(e) { console.log('Repairs month skip:', e.message); }

    mr.qs_total     = qs_month_total;
    mr.qs_count     = qs_month_count;
    mr.repair_total = rep_month_total;
    mr.repair_count = rep_month_count;
    mr.grand_total  = parseFloat(mr.total||0) + qs_month_total + rep_month_total;
    // Collected = delivered orders total + all QS + all repairs this month
    mr.collected    = parseFloat(mr.collected||0) + qs_month_total + rep_month_total;

    // Daily summary — split cash vs bank
    const orderCash    = todayOrders.rows.filter(r=>!r.payment_method||r.payment_method==='cash').reduce((s,r)=>s+parseFloat(r.advance_amount||0),0);
    const orderBank    = todayOrders.rows.filter(r=>r.payment_method&&r.payment_method!=='cash').reduce((s,r)=>s+parseFloat(r.advance_amount||0),0);
    const orderIncome  = orderCash + orderBank;
    const qsIncome     = todayQS.rows.reduce((s,r)=>s+parseFloat(r.total||0),0);
    const repairIncome = todayRepairs.rows.reduce((s,r)=>s+parseFloat(r.charge||0),0);
    const totalIncome  = orderIncome + qsIncome + repairIncome;
    const totalExp     = todayExpenses.rows.reduce((s,r)=>s+parseFloat(r.amount||0),0);
    const totalDep     = todayDeposits.rows.reduce((s,r)=>s+parseFloat(r.amount||0),0);
    // Cash in hand = only cash payments, not bank transfers
    const todayCashIn  = orderCash + qsIncome + repairIncome;
    const cashInHand   = todayCashIn - totalExp - totalDep;
    const bankToday    = orderBank;
    // All-time cash in drawer (carries forward from previous days)
    const allTimeCash    = parseFloat(allTimeCashRes?.rows?.[0]?.total_cash_in_hand || 0);
    // Total all-time deposits
    const allTimeDeposits = parseFloat(allTimeCashRes?.rows?.[0]?.total_deposited || 0);

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
        orderCash,
        orderBank,
        qsIncome,
        repairIncome,
        totalIncome,
        totalExp,
        totalDep,
        cashInHand,
        allTimeCash,
        allTimeDeposits,
        bankToday,
        orderCount:   todayOrders.rows.length,
        qsCount:      todayQS.rows.length,
        repairCount:  todayRepairs.rows.length,
        expCount:     todayExpenses.rows.length,
        depCount:     todayDeposits.rows.length,
        _raw_allTimeCashRes: allTimeCashRes?.rows?.[0],
      },
    });
  } catch (err) {
    console.error('Dashboard today error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

module.exports = router;