// ============================================================
//  Dashboard Today Route — /api/dashboard-today
//  Fixed:
//    1. Promise.all order mismatch resolved
//    2. Reminders query JOINs customers for name & phone
//    3. Month revenue excludes cancelled orders
//    4. Bug #5 — mr.collected no longer double-counts QS/Repairs.
//       A new field mr.order_collected holds order advances only.
//       mr.collected now = order advances + QS + repairs (grand collected).
//       Frontend should use mr.order_collected for "orders advance"
//       and mr.collected for "total cash collected this month".
//    5. Bug #16 — markOverdueOrders debounced: runs at most once
//       every 5 minutes instead of on every GET request.
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// ── Bug #16 Fix: Debounced overdue check ─────────────────────
// Runs the UPDATE at most once per 5 minutes across all requests.
let lastOverdueCheck = 0;
async function markOverdueOrders() {
  const now = Date.now();
  if (now - lastOverdueCheck < 5 * 60 * 1000) return; // skip if < 5 min ago
  lastOverdueCheck = now;
  try {
    await pool.query(`
      UPDATE orders SET status = 'overdue'
      WHERE deliver_date < CURRENT_DATE
        AND status IN ('created','called')
        AND deliver_date IS NOT NULL
    `);
  } catch (e) {
    console.error('markOverdueOrders error:', e.message);
  }
}

router.get('/', auth, async (req, res) => {
  await markOverdueOrders().catch(() => {});

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
      todayBalPayments,  // 10
      invValue,          // 11
    ] = await Promise.all([

      // 0: Month revenue — excludes cancelled orders
      pool.query(`
        SELECT
          COALESCE(SUM(total_amount),0)   AS total,
          COALESCE(SUM(advance_amount),0) AS collected,
          COALESCE(SUM(balance_amount),0) AS owed,
          COUNT(id)                        AS order_count
        FROM orders
        WHERE TO_CHAR(created_at,'YYYY-MM') = $1
          AND status != 'cancelled'
      `, [month]),

      // 1: Today's orders (non-cancelled)
      pool.query(`
        SELECT advance_amount, COALESCE(payment_method,'cash') AS payment_method
        FROM orders WHERE created_at::date = $1 AND status != 'cancelled'
      `, [today]).catch(() => ({ rows: [] })),

      // 2: Today's quick sales
      pool.query(`
        SELECT COALESCE(total,0) AS total FROM quick_sales
        WHERE created_at::date = $1
      `, [today]).catch(() => ({ rows: [] })),

      // 3: Today's expenses
      pool.query(`
        SELECT amount FROM expenses WHERE date = $1
      `, [today]).catch(() => ({ rows: [] })),

      // 4: Today's MANUAL cash deposits (cash physically taken to bank)
      // Auto-created card/online deposits linked to orders are EXCLUDED —
      // those are bank-to-bank and never passed through the cash till.
      // Only cash payment_type deposits (manual) reduce cash in hand.
      pool.query(`
        SELECT cd.amount FROM cash_deposits cd
        WHERE cd.date = $1
          AND cd.order_id IS NULL
          AND COALESCE(cd.payment_type,'cash') = 'cash'
      `, [today]).catch(() => pool.query(
        `SELECT amount FROM cash_deposits WHERE date = $1 AND order_id IS NULL`, [today]
      )).catch(() => ({ rows: [] })),

      // 5: Today's repairs
      pool.query(`
        SELECT COALESCE(charge,0) AS charge FROM repairs
        WHERE created_at::date = $1
      `, [today]).catch(() => ({ rows: [] })),

      // 6: Total outstanding balance
      pool.query(`
        SELECT COALESCE(SUM(balance_amount),0) AS b
        FROM orders
        WHERE balance_amount > 0 AND status != 'cancelled'
      `),

      // 7: Active orders count
      pool.query(`
        SELECT COUNT(*) AS c
        FROM orders
        WHERE status IN ('created','called','overdue')
      `),

      // 8: Lens jobs out
      pool.query(`
        SELECT COUNT(*) AS c
        FROM orders
        WHERE lens_step BETWEEN 1 AND 2
      `),

      // 9: Balance reminders
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

      // 10: Balance payments collected TODAY from older orders
      pool.query(`
        SELECT COALESCE(last_payment_amount,0) AS amount,
               COALESCE(last_payment_method,'cash') AS method
        FROM orders
        WHERE last_payment_date = $1
          AND created_at::date != $1
          AND last_payment_amount > 0
      `, [today]).catch(() => ({ rows: [] })),

      // 11: Total inventory value
      pool.query(`
        SELECT
          COALESCE(SUM(quantity * COALESCE(cost_price, 0)), 0) AS stock_value,
          COALESCE(SUM(quantity * COALESCE(sell_price, 0)), 0)  AS retail_value,
          SUM(quantity)                                          AS total_units
        FROM inventory
        WHERE quantity > 0
      `).catch(() => ({ rows: [{ stock_value: 0, retail_value: 0, total_units: 0 }] })),
    ]);

    const mr = monthRevenue.rows[0];

    // Month QS and repairs
    let qs_month_total = 0, qs_month_count = 0;
    let rep_month_total = 0, rep_month_count = 0;
    try {
      const qsM = await pool.query(
        `SELECT COALESCE(SUM(total),0) AS t, COUNT(*) AS c
         FROM quick_sales WHERE TO_CHAR(created_at,'YYYY-MM')=$1`, [month]);
      qs_month_total = parseFloat(qsM.rows[0].t || 0);
      qs_month_count = parseInt(qsM.rows[0].c   || 0);
    } catch (e) { console.log('QS month skip:', e.message); }

    try {
      const repM = await pool.query(
        `SELECT COALESCE(SUM(COALESCE(charge,0)),0) AS t, COUNT(*) AS c
         FROM repairs WHERE TO_CHAR(created_at,'YYYY-MM')=$1`, [month]);
      rep_month_total = parseFloat(repM.rows[0].t || 0);
      rep_month_count = parseInt(repM.rows[0].c   || 0);
    } catch (e) { console.log('Repairs month skip:', e.message); }

    // ── Bug #5 Fix: separate order_collected from grand collected ─
    // mr.collected from DB = SUM(advance_amount) on orders only.
    // We preserve that as order_collected so the frontend can show
    // "order advances" separately. Then grand collected adds QS + repairs.
    const order_collected = parseFloat(mr.collected || 0);

    mr.qs_total        = qs_month_total;
    mr.qs_count        = qs_month_count;
    mr.repair_total    = rep_month_total;
    mr.repair_count    = rep_month_count;
    mr.grand_total     = parseFloat(mr.total || 0) + qs_month_total + rep_month_total;
    mr.order_collected = order_collected;   // order advances only — NEW field
    mr.collected       = order_collected + qs_month_total + rep_month_total; // true grand total

    // Daily cash split
    // Card/bank payments go to the bank — NOT to cash in hand.
    // Only cash payments stay in the till.
    // Card payments also have a 3% bank charge deducted from net deposit.
    const CARD_CHARGE_RATE = 0.03;

    const orderCash  = todayOrders.rows
      .filter(r => !r.payment_method || r.payment_method === 'cash')
      .reduce((s, r) => s + parseFloat(r.advance_amount || 0), 0);

    // Card vs bank/transfer — card has 3% charge, bank/transfer is full amount
    const orderCard  = todayOrders.rows
      .filter(r => r.payment_method === 'card')
      .reduce((s, r) => s + parseFloat(r.advance_amount || 0), 0);
    const orderBankTransfer = todayOrders.rows
      .filter(r => r.payment_method && r.payment_method !== 'cash' && r.payment_method !== 'card')
      .reduce((s, r) => s + parseFloat(r.advance_amount || 0), 0);
    const orderCardCharge   = Math.round(orderCard * CARD_CHARGE_RATE * 100) / 100;
    const orderCardNet      = orderCard - orderCardCharge;
    const orderBank         = orderCard + orderBankTransfer; // total non-cash
    const orderBankNet      = orderCardNet + orderBankTransfer; // net after card charge

    const orderIncome  = orderCash + orderBank;
    const qsIncome     = todayQS.rows.reduce((s, r) => s + parseFloat(r.total   || 0), 0);
    const repairIncome = todayRepairs.rows.reduce((s, r) => s + parseFloat(r.charge || 0), 0);
    const totalIncome  = orderIncome + qsIncome + repairIncome;
    const totalExp     = todayExpenses.rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const totalDep     = todayDeposits.rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);

    const balRows = todayBalPayments?.rows || [];
    const balCash = balRows.filter(r => !r.method || r.method === 'cash').reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const balCard = balRows.filter(r => r.method === 'card').reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const balBankTransfer = balRows.filter(r => r.method && r.method !== 'cash' && r.method !== 'card').reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const balCardCharge = Math.round(balCard * CARD_CHARGE_RATE * 100) / 100;
    const balBank = balCard + balBankTransfer;
    const balBankNet = (balCard - balCardCharge) + balBankTransfer;

    const totalCardCharge = orderCardCharge + balCardCharge;

    // Cash in hand = only cash payments (card/bank went to the bank account)
    // Also subtract expenses paid in cash and cash deposited to bank
    const todayCashIn = orderCash + qsIncome + repairIncome + balCash;
    const cashInHand  = todayCashIn - totalExp - totalDep;

    // Net amount actually credited to bank after card charges
    const bankToday    = orderBank + balBank;
    const bankTodayNet = orderBankNet + balBankNet; // after 3% card deduction

    // All-time cash (excludes cancelled orders)
    let allTimeCash = 0, allTimeDeposits = 0;
    try {
      const [atOrders, atQS, atRepairs, atExp, atDep] = await Promise.all([
        pool.query(`SELECT COALESCE(SUM(advance_amount),0) AS v FROM orders WHERE status != 'cancelled'`).catch(() => ({ rows: [{ v: '0' }] })),
        pool.query('SELECT COALESCE(SUM(total),0) AS v FROM quick_sales').catch(() => ({ rows: [{ v: '0' }] })),
        pool.query('SELECT COALESCE(SUM(charge),0) AS v FROM repairs').catch(() => ({ rows: [{ v: '0' }] })),
        pool.query('SELECT COALESCE(SUM(amount),0) AS v FROM expenses').catch(() => ({ rows: [{ v: '0' }] })),
        pool.query('SELECT COALESCE(SUM(amount),0) AS v FROM cash_deposits').catch(() => ({ rows: [{ v: '0' }] })),
      ]);
      const ov = parseFloat(atOrders.rows[0].v)  || 0;
      const qv = parseFloat(atQS.rows[0].v)      || 0;
      const rv = parseFloat(atRepairs.rows[0].v) || 0;
      const ev = parseFloat(atExp.rows[0].v)     || 0;
      const dv = parseFloat(atDep.rows[0].v)     || 0;
      allTimeCash     = ov + qv + rv - ev - dv;
      allTimeDeposits = dv;
    } catch (e) { console.error('[CASH ERROR]', e.message); }

    res.json({
      month_revenue: mr,
      total_balance: totalBalance.rows[0].b,
      active_orders: parseInt(activeOrders.rows[0].c),
      lens_jobs_out: parseInt(lensJobsOut.rows[0].c),
      reminders:     reminders.rows,

      daily_cash: {
        orderIncome, orderCash, orderBank,
        orderCard, orderCardCharge, orderCardNet,
        balCash, balBank, balCard, balCardCharge, balTotal: balCash + balBank,
        totalCardCharge,
        bankTodayNet,
        inventoryValue:  parseFloat(invValue.rows[0]?.stock_value  || 0),
        inventoryRetail: parseFloat(invValue.rows[0]?.retail_value || 0),
        inventoryUnits:  parseInt(invValue.rows[0]?.total_units    || 0),
        qsIncome, repairIncome, totalIncome,
        totalExp, totalDep, cashInHand,
        allTimeCash, allTimeDeposits, bankToday,
        orderCount:  todayOrders.rows.length,
        qsCount:     todayQS.rows.length,
        repairCount: todayRepairs.rows.length,
        expCount:    todayExpenses.rows.length,
        depCount:    todayDeposits.rows.length,
      },
    });
  } catch (err) {
    console.error('Dashboard today error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

module.exports = router;