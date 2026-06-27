// ============================================================
//  Dashboard Today Route — /api/dashboard-today  (v3)
//
//  CASH & BANK FIX:
//  Cash In Hand = income (cash) − cash expenses − deposits
//                − dealer purchases paid by cash
//
//  Bank Balance = all deposits received
//                − bank/cheque expenses
//                − dealer purchases paid by bank/cheque
//
//  Total Money  = Cash In Hand + Bank Balance
//
//  Profit is SEPARATE from cash — dealer stock purchases
//  reduce cash but NOT profit (they become inventory)
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const month = today.slice(0, 7);

  try {
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
      todayDealerPurch,  // 10 — dealer purchases paid today
      todayBalPayments,  // 11 — balance payments received today from older orders
    ] = await Promise.all([

      // 0: Month revenue
      pool.query(`
        SELECT
          COALESCE(SUM(total_amount),   0) AS total,
          COALESCE(SUM(advance_amount), 0) AS collected,
          COALESCE(SUM(balance_amount), 0) AS owed,
          COUNT(id)                         AS order_count
        FROM orders
        WHERE TO_CHAR(created_at,'YYYY-MM') = $1
      `, [month]),

      // 1: Today's orders with payment method
      pool.query(`
        SELECT advance_amount, COALESCE(payment_method,'cash') AS payment_method
        FROM orders WHERE created_at::date = $1 AND status != 'cancelled'
      `, [today]).catch(() => ({ rows: [] })),

      // 2: Today's quick sales with payment method
      pool.query(`
        SELECT COALESCE(total,0) AS total,
               COALESCE(payment_method,'cash') AS payment_method
        FROM quick_sales WHERE created_at::date = $1
      `, [today]).catch(() => ({ rows: [] })),

      // 3: Today's expenses with payment method (exclude Lab Payment from cash calc)
      pool.query(`
        SELECT amount, COALESCE(payment_method,'cash') AS payment_method,
               category
        FROM expenses WHERE date = $1
          AND category != 'Lab Payment'
      `, [today]).catch(() => ({ rows: [] })),

      // 4: Today's deposits to bank
      pool.query(`
        SELECT amount FROM cash_deposits WHERE date = $1
      `, [today]).catch(() => ({ rows: [] })),

      // 5: Today's repairs
      pool.query(`
        SELECT COALESCE(charge,0) AS charge,
               COALESCE(payment_method,'cash') AS payment_method
        FROM repairs WHERE created_at::date = $1
      `, [today]).catch(() => ({ rows: [] })),

      // 6: Total outstanding balance
      pool.query(`
        SELECT COALESCE(SUM(balance_amount),0) AS b
        FROM orders
        WHERE balance_amount > 0 AND status != 'cancelled'
      `),

      // 7: Active orders count
      pool.query(`
        SELECT COUNT(*) AS c FROM orders
        WHERE status IN ('created','called','overdue')
      `),

      // 8: Lens jobs out
      pool.query(`
        SELECT COUNT(*) AS c FROM orders
        WHERE lens_step BETWEEN 1 AND 2
      `),

      // 9: Reminders
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

      // 10: Today's dealer purchases (stock payments — reduce cash/bank)
      pool.query(`
        SELECT COALESCE(total_cost,0) AS amount,
               COALESCE(payment_method,'cash') AS payment_method,
               payment_status
        FROM dealer_purchases
        WHERE purchase_date = $1
          AND COALESCE(payment_status,'paid') != 'pending'
      `, [today]).catch(() => ({ rows: [] })),

      // 11: Balance payments received TODAY from older orders (via any method)
      // These are payments customers made today to clear their balance
      pool.query(`
        SELECT COALESCE(last_payment_amount, 0) AS amount,
               COALESCE(last_payment_method, 'cash') AS payment_method
        FROM orders
        WHERE last_payment_date = $1
          AND created_at::date != $1
          AND last_payment_date IS NOT NULL
      `, [today]).catch(() => ({ rows: [] })),
    ]);

    const mr = monthRevenue.rows[0];

    // ── Month totals (QS + repairs) ──────────────────────────
    let qs_month_total = 0, qs_month_count = 0;
    let rep_month_total = 0, rep_month_count = 0;
    try {
      const qsM = await pool.query(
        `SELECT COALESCE(SUM(total),0) AS t, COUNT(*) AS c
         FROM quick_sales WHERE TO_CHAR(created_at,'YYYY-MM')=$1`, [month]);
      qs_month_total = parseFloat(qsM.rows[0].t || 0);
      qs_month_count = parseInt(qsM.rows[0].c   || 0);
    } catch (e) {}

    try {
      const repM = await pool.query(
        `SELECT COALESCE(SUM(COALESCE(charge,0)),0) AS t, COUNT(*) AS c
         FROM repairs WHERE TO_CHAR(created_at,'YYYY-MM')=$1`, [month]);
      rep_month_total = parseFloat(repM.rows[0].t || 0);
      rep_month_count = parseInt(repM.rows[0].c   || 0);
    } catch (e) {}

    mr.qs_total     = qs_month_total;
    mr.qs_count     = qs_month_count;
    mr.repair_total = rep_month_total;
    mr.repair_count = rep_month_count;
    mr.grand_total  = parseFloat(mr.total || 0) + qs_month_total + rep_month_total;
    mr.collected    = parseFloat(mr.collected || 0) + qs_month_total + rep_month_total;

    // ── TODAY'S CASH BREAKDOWN ───────────────────────────────
    // Split income by payment method
    const orderCash  = todayOrders.rows
      .filter(r => !r.payment_method || r.payment_method === 'cash')
      .reduce((s, r) => s + parseFloat(r.advance_amount || 0), 0);
    const orderBank  = todayOrders.rows
      .filter(r => r.payment_method && r.payment_method !== 'cash')
      .reduce((s, r) => s + parseFloat(r.advance_amount || 0), 0);
    const orderIncome = orderCash + orderBank;

    const qsCash  = todayQS.rows
      .filter(r => !r.payment_method || r.payment_method === 'cash')
      .reduce((s, r) => s + parseFloat(r.total || 0), 0);
    const qsBank  = todayQS.rows
      .filter(r => r.payment_method && r.payment_method !== 'cash')
      .reduce((s, r) => s + parseFloat(r.total || 0), 0);
    const qsIncome = qsCash + qsBank;

    const repairCash  = todayRepairs.rows
      .filter(r => !r.payment_method || r.payment_method === 'cash')
      .reduce((s, r) => s + parseFloat(r.charge || 0), 0);
    const repairBank  = todayRepairs.rows
      .filter(r => r.payment_method && r.payment_method !== 'cash')
      .reduce((s, r) => s + parseFloat(r.charge || 0), 0);
    const repairIncome = repairCash + repairBank;

    const totalIncome = orderIncome + qsIncome + repairIncome;

    // Split expenses by payment method
    const cashExpenses = todayExpenses.rows
      .filter(r => !r.payment_method || r.payment_method === 'cash')
      .reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const bankExpenses = todayExpenses.rows
      .filter(r => r.payment_method && r.payment_method !== 'cash')
      .reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const totalExp = cashExpenses + bankExpenses;

    // Deposits (always go to bank)
    const totalDep = todayDeposits.rows
      .reduce((s, r) => s + parseFloat(r.amount || 0), 0);

    // ── Balance payments received today (from older orders) ──
    // These are collected today — split by payment method
    const balTodayCash = (todayBalPayments?.rows || [])
      .filter(r => !r.payment_method || r.payment_method === 'cash')
      .reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const balTodayBank = (todayBalPayments?.rows || [])
      .filter(r => r.payment_method && r.payment_method !== 'cash')
      .reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const balTodayCount = (todayBalPayments?.rows || []).length;

    // Dealer purchases split by payment method
    // cash/credit → reduces cash in hand
    // bank/cheque → reduces bank balance
    const dealerCash = todayDealerPurch.rows
      .filter(r => r.payment_method === 'cash')
      .reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const dealerBank = todayDealerPurch.rows
      .filter(r => ['bank','cheque'].includes(r.payment_method))
      .reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const totalDealerToday = dealerCash + dealerBank;

    // ── CASH IN HAND (today) ─────────────────────────────────
    // Include balance payments received today in cash
    const todayCashIn = orderCash + qsCash + repairCash + balTodayCash;
    const cashInHand  = todayCashIn
                      - cashExpenses   // cash expenses paid
                      - totalDep       // deposited to bank
                      - dealerCash;    // stock paid by cash

    // Bank received today = order bank advances + balance payments by bank today
    const bankReceivedToday = orderBank + qsBank + repairBank + balTodayBank;

    // ── ALL-TIME CALCULATIONS ────────────────────────────────
    let allTimeCash = 0, allTimeDeposits = 0, bankBalance = 0;
    try {
      const [
        atOrders, atQS, atRepairs,
        atCashExp, atBankExp,
        atDep,
        atDealerCash, atDealerBank,
        atBalBank, atBalCash,
      ] = await Promise.all([
        // All order advances (cash only)
        pool.query(`
          SELECT COALESCE(SUM(CASE WHEN COALESCE(payment_method,'cash')='cash'
            THEN advance_amount END),0) AS v FROM orders
        `).catch(() => ({ rows: [{ v: '0' }] })),

        // All QS (cash)
        pool.query(`
          SELECT COALESCE(SUM(CASE WHEN COALESCE(payment_method,'cash')='cash'
            THEN total END),0) AS v FROM quick_sales
        `).catch(() => ({ rows: [{ v: '0' }] })),

        // All repairs (cash)
        pool.query(`
          SELECT COALESCE(SUM(CASE WHEN COALESCE(payment_method,'cash')='cash'
            THEN charge END),0) AS v FROM repairs
        `).catch(() => ({ rows: [{ v: '0' }] })),

        // Cash expenses (reduce cash in hand)
        // Exclude Lab Payment — it's a bank transfer to the lab, handled separately
        pool.query(`
          SELECT COALESCE(SUM(CASE WHEN COALESCE(payment_method,'cash')='cash'
            AND category != 'Lab Payment'
            THEN amount END),0) AS v FROM expenses
        `).catch(() => ({ rows: [{ v: '0' }] })),

        // Bank expenses (reduce bank balance)
        // Exclude Lab Payment — already counted in COGS
        pool.query(`
          SELECT COALESCE(SUM(CASE WHEN COALESCE(payment_method,'cash')!='cash'
            AND category != 'Lab Payment'
            THEN amount END),0) AS v FROM expenses
        `).catch(() => ({ rows: [{ v: '0' }] })),

        // All deposits (go into bank)
        pool.query(`
          SELECT COALESCE(SUM(amount),0) AS v FROM cash_deposits
        `).catch(() => ({ rows: [{ v: '0' }] })),

        // Dealer purchases paid by cash (reduce cash)
        pool.query(`
          SELECT COALESCE(SUM(total_cost),0) AS v FROM dealer_purchases
          WHERE payment_method = 'cash'
            AND COALESCE(payment_status,'paid') != 'pending'
        `).catch(() => ({ rows: [{ v: '0' }] })),

        // Dealer purchases paid by bank/cheque (reduce bank)
        pool.query(`
          SELECT COALESCE(SUM(total_cost),0) AS v FROM dealer_purchases
          WHERE payment_method IN ('bank','cheque')
            AND COALESCE(payment_status,'paid') != 'pending'
        `).catch(() => ({ rows: [{ v: '0' }] })),

        // All balance payments received via bank from orders
        // (customers paying balance by bank transfer)
        pool.query(`
          SELECT COALESCE(SUM(last_payment_amount), 0) AS v
          FROM orders
          WHERE last_payment_method NOT IN ('cash','')
            AND last_payment_method IS NOT NULL
            AND last_payment_date IS NOT NULL
            AND last_payment_amount > 0
        `).catch(() => ({ rows: [{ v: '0' }] })),

        // All balance payments received via cash from older orders  
        pool.query(`
          SELECT COALESCE(SUM(last_payment_amount), 0) AS v
          FROM orders
          WHERE COALESCE(last_payment_method,'cash') = 'cash'
            AND last_payment_date IS NOT NULL
            AND last_payment_amount > 0
            AND created_at::date != last_payment_date
        `).catch(() => ({ rows: [{ v: '0' }] })),
      ]);

      const cashIn       = parseFloat(atOrders.rows[0].v)     || 0;
      const qsIn         = parseFloat(atQS.rows[0].v)         || 0;
      const repIn        = parseFloat(atRepairs.rows[0].v)    || 0;
      const cashExpAll   = parseFloat(atCashExp.rows[0].v)    || 0;
      const bankExpAll   = parseFloat(atBankExp.rows[0].v)    || 0;
      const depAll       = parseFloat(atDep.rows[0].v)        || 0;
      const dealerCashAll= parseFloat(atDealerCash.rows[0].v) || 0;
      const dealerBankAll= parseFloat(atDealerBank.rows[0].v) || 0;

      const balBankAll = parseFloat(atBalBank.rows[0].v) || 0; // bank balance payments all-time
      const balCashAll = parseFloat(atBalCash.rows[0].v) || 0; // cash balance payments all-time

      // Cash in hand = all cash income + cash balance payments − cash expenses − deposits − cash dealer payments
      allTimeCash = cashIn + qsIn + repIn + balCashAll
                  - cashExpAll
                  - depAll
                  - dealerCashAll;

      // Bank balance = deposits received − bank expenses − bank dealer payments
      // Bank balance = deposits + bank balance payments − bank expenses − bank stock payments
      bankBalance = depAll + balBankAll - bankExpAll - dealerBankAll;

      allTimeDeposits = depAll;

    } catch (e) {
      console.error('[CASH ALL-TIME ERROR]', e.message);
    }

    // ── INVENTORY VALUE ──────────────────────────────────────
    let inventoryValue = 0;
    try {
      const invRes = await pool.query(`
        SELECT COALESCE(SUM(quantity * COALESCE(cost_price,0)),0) AS v
        FROM inventory WHERE quantity > 0
      `);
      inventoryValue = parseFloat(invRes.rows[0].v || 0);
    } catch (e) {}

    const totalMoney = allTimeCash + bankBalance; // cash + bank = liquid money

    res.json({
      month_revenue: mr,
      total_balance:  totalBalance.rows[0].b,
      active_orders:  parseInt(activeOrders.rows[0].c),
      lens_jobs_out:  parseInt(lensJobsOut.rows[0].c),
      reminders:      reminders.rows,

      daily_cash: {
        // Income
        orderIncome, orderCash, orderBank,
        qsIncome,    qsCash,    qsBank,
        repairIncome, repairCash, repairBank,
        totalIncome,

        // Outflows
        totalExp, cashExpenses, bankExpenses,
        totalDep,
        dealerCash,   // stock paid by cash today
        dealerBank,   // stock paid by bank today
        totalDealerToday,

        // Cash in hand (physical cash)
        cashInHand,

        // All-time
        allTimeCash,       // all cash ever received − spent − deposited − dealer cash
        bankBalance,       // deposits − bank expenses − bank dealer purchases
                         // NOTE: negative means not all deposits are recorded in system
        totalMoney,        // cash + bank = total liquid money
        allTimeDeposits,
        inventoryValue,    // stock on shelf (not liquid but yours)

        bankToday: bankReceivedToday,  // includes balance payments via bank

        balTodayCash, balTodayBank, balTodayCount,  // balance payments collected today
        // Counts for display
        orderCount:  todayOrders.rows.length,
        qsCount:     todayQS.rows.length,
        repairCount: todayRepairs.rows.length,
        expCount:    todayExpenses.rows.length,
        depCount:    todayDeposits.rows.length,
        dealerCount: todayDealerPurch.rows.length,
      },
    });
  } catch (err) {
    console.error('Dashboard today error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

module.exports = router;