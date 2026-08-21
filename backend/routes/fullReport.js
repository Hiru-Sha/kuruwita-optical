// ============================================================
//  Full Report Route — /api/full-report  (ACCOUNTING FIX v2)
//
//  CORRECT PROFIT FORMULA:
//  Revenue        = Orders billed + Quick sales + Repairs
//  COGS           = Frame cost (orders) 
//                 + Lens cost (Lab Receivings expenses, category='Lab Payment')
//                 + Quick sale item cost (cost_price × qty sold from inventory)
//                 + Gift cost (boxes, bags, cleaners given free with orders)
//  Gross Profit   = Revenue − COGS
//  Operating Exp  = Expenses excluding 'Lab Payment' (rent, electricity, etc.)
//  Net Profit     = Gross Profit − Operating Expenses
//
//  NOT IN COGS:
//  ✗ lens_buy_price on orders (use Lab Receivings instead)
//  ✗ Dealer purchases (they are inventory additions, not expenses)
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
      qsCOGS,
      repairStats,
      repairTypes,
      lensCOGS,
      frameCOGS,
      giftCOGS,
      operatingExp,
      expenseList,
      depositStats,
      stockPurchases,
      inventoryValue,
      lensJobStats,
      topFrames,
      topLensTypes,
      dailyRevenue,
      kalutotaStats,
    ] = await Promise.all([

      // ── Orders summary (revenue only — NO cost calc here) ───
      pool.query(`
        SELECT
          COUNT(*)                                        AS total_orders,
          COALESCE(SUM(total_amount),    0)               AS revenue,
          COALESCE(SUM(advance_amount),  0)               AS collected,
          COALESCE(SUM(balance_amount),  0)               AS outstanding,
          COUNT(CASE WHEN status='delivered' THEN 1 END)  AS delivered,
          COUNT(CASE WHEN status='created'   THEN 1 END)  AS in_progress
        FROM orders
        WHERE created_at::date BETWEEN $1 AND $2
          AND status != 'cancelled'
      `, [from, to]),

      // ── Orders list ─────────────────────────────────────────
      pool.query(`
        SELECT o.order_number, o.created_at::date AS date,
               c.name AS customer_name,
               o.frame, o.lens_type, o.lens_coating, o.lens_company,
               o.total_amount, o.advance_amount, o.balance_amount,
               o.frame_buy_price, o.lens_buy_price, o.lab_bill_amount,
               o.gift_cost, o.status,
               o.customer_own_frame,
               (o.total_amount
                - CASE WHEN o.customer_own_frame THEN 0 ELSE COALESCE(o.frame_buy_price,0) END
                - COALESCE(o.lab_bill_amount, 0)
                - COALESCE(o.gift_cost, 0)
               ) AS order_profit
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.created_at::date BETWEEN $1 AND $2
          AND o.status != 'cancelled'
        ORDER BY o.created_at DESC
      `, [from, to]),

      // ── Quick sales summary ─────────────────────────────────
      pool.query(`
        SELECT
          COUNT(*)                        AS total_sales,
          COALESCE(SUM(total), 0)         AS revenue,
          COALESCE(SUM(discount), 0)      AS total_discount
        FROM quick_sales
        WHERE created_at::date BETWEEN $1 AND $2
      `, [from, to]),

      // ── Quick sales list ─────────────────────────────────────
      pool.query(`
        SELECT sale_number, created_at::date AS date,
               TO_CHAR(created_at,'HH24:MI') AS time,
               customer_name, items, total, discount, payment_method
        FROM quick_sales
        WHERE created_at::date BETWEEN $1 AND $2
        ORDER BY created_at DESC
      `, [from, to]),

      // ── Quick sale COGS (cost_price × qty for each item sold) ─
      // Fix R: replaced ::INT cast with a NULLIF+REGEXP guard so that
      // empty strings, 'null', and non-numeric values don't throw a
      // Postgres error and crash the entire full report.
      pool.query(`
        SELECT COALESCE(SUM(
          CASE
            WHEN (item_data->>'inventory_id') IS NOT NULL
             AND (item_data->>'inventory_id') ~ '^[0-9]+$'
            THEN
              (item_data->>'qty')::NUMERIC *
              COALESCE(
                (item_data->>'cost_price')::NUMERIC,
                (SELECT cost_price FROM inventory
                 WHERE id = (item_data->>'inventory_id')::INTEGER
                 LIMIT 1),
                0
              )
            WHEN (item_data->>'cost_price') IS NOT NULL
             AND (item_data->>'cost_price') ~ '^[0-9.]+$'
            THEN
              (item_data->>'qty')::NUMERIC *
              (item_data->>'cost_price')::NUMERIC
            ELSE 0
          END
        ), 0) AS qs_cogs
        FROM quick_sales,
             jsonb_array_elements(
               CASE WHEN items IS NOT NULL AND items::text NOT IN ('null','[]','')
               THEN items::jsonb ELSE '[]'::jsonb END
             ) AS item_data
        WHERE created_at::date BETWEEN $1 AND $2
          AND (item_data->>'qty') IS NOT NULL
          AND (item_data->>'qty') ~ '^[0-9.]+$'
      `, [from, to]),

      // ── Repair summary ───────────────────────────────────────
      pool.query(`
        SELECT
          COUNT(*)                                            AS total_repairs,
          COALESCE(SUM(CASE WHEN payment_method != 'free'
            THEN charge END), 0)                             AS revenue,
          COUNT(CASE WHEN payment_method='free' THEN 1 END)  AS free_repairs,
          COALESCE(SUM(COALESCE(repair_cost,0)),0)           AS repair_cogs
        FROM repairs
        WHERE created_at::date BETWEEN $1 AND $2
      `, [from, to]),

      // ── Repair breakdown ─────────────────────────────────────
      pool.query(`
        SELECT repair_type, COUNT(*) AS count,
               COALESCE(SUM(charge),0) AS revenue
        FROM repairs
        WHERE created_at::date BETWEEN $1 AND $2
        GROUP BY repair_type ORDER BY count DESC
      `, [from, to]),

      // ── LENS COGS: from Lab Receivings expenses ──────────────
      // These are auto-created when paying lab bills
      pool.query(`
        SELECT COALESCE(SUM(amount), 0) AS lens_cogs
        FROM expenses
        WHERE category = 'Lab Payment'
          AND date BETWEEN $1 AND $2
      `, [from, to]),

      // ── FRAME COGS: frame_buy_price on orders sold ───────────
      // This is the actual frame cost per order (NOT dealer purchase total)
      pool.query(`
        SELECT COALESCE(SUM(
          CASE WHEN customer_own_frame THEN 0
               ELSE COALESCE(frame_buy_price, 0)
          END
        ), 0) AS frame_cogs
        FROM orders
        WHERE created_at::date BETWEEN $1 AND $2
          AND status != 'cancelled'
      `, [from, to]),

      // ── GIFT COGS: free items given with orders ───────────────
      // Boxes, bags, lens cleaners, pouches — from stock adjustments
      // unit_cost is snapshotted at time of gift
      pool.query(`
        SELECT COALESCE(SUM(
          ABS(sa.quantity_change) * COALESCE(sa.unit_cost, i.cost_price, 0)
        ), 0) AS gift_cogs
        FROM stock_adjustments sa
        JOIN inventory i ON i.id = sa.inventory_id
        WHERE sa.reason ILIKE 'Free gift%'
          AND sa.change_type = 'remove'
          AND sa.created_at::date BETWEEN $1 AND $2
      `, [from, to]),

      // ── OPERATING EXPENSES (exclude lens/lab costs) ──────────
      // Rent, electricity, staff, stationery, etc.
      // Lab Payment is already in lens_cogs so exclude it here
      pool.query(`
        SELECT
          COUNT(*)                   AS total_count,
          COALESCE(SUM(amount), 0)   AS total_amount
        FROM expenses
        WHERE date BETWEEN $1 AND $2
          AND category != 'Lab Payment'
      `, [from, to]),

      // ── Expenses by category (for breakdown) ─────────────────
      pool.query(`
        SELECT category,
               COUNT(*)                AS count,
               COALESCE(SUM(amount),0) AS total
        FROM expenses
        WHERE date BETWEEN $1 AND $2
          AND category != 'Lab Payment'
        GROUP BY category
        ORDER BY total DESC
      `, [from, to]),

      // ── Bank deposits ────────────────────────────────────────
      pool.query(`
        SELECT COALESCE(SUM(amount),0) AS total_deposited,
               COUNT(*)                AS count
        FROM cash_deposits
        WHERE date BETWEEN $1 AND $2
      `, [from, to]),

      // ── Dealer purchases (INVENTORY only — NOT subtracted from profit) ──
      pool.query(`
        SELECT dealer_name,
               COALESCE(SUM(total_cost),0) AS total,
               COUNT(*)                     AS purchases,
               COALESCE(SUM(quantity),0)    AS items
        FROM dealer_purchases
        WHERE purchase_date BETWEEN $1 AND $2
        GROUP BY dealer_name
        ORDER BY total DESC
      `, [from, to]),

      // ── INVENTORY VALUE (stock on shelf right now) ────────────
      // Shows how much money is tied up in unsold stock
      pool.query(`
        SELECT
          COALESCE(SUM(quantity * COALESCE(cost_price, 0)), 0) AS inventory_value,
          COALESCE(SUM(quantity * COALESCE(sell_price,  0)), 0) AS inventory_retail_value,
          COUNT(*) FILTER (WHERE quantity <= COALESCE(min_quantity,2)) AS low_stock_items,
          COUNT(*) FILTER (WHERE quantity = 0)                         AS out_of_stock_items
        FROM inventory
        WHERE quantity >= 0
      `, []),

      // ── Lens job (lab) stats ─────────────────────────────────
      pool.query(`
        SELECT lens_company,
               COALESCE(SUM(lab_bill_amount),0)                                       AS lab_total,
               COALESCE(SUM(CASE WHEN lab_paid THEN lab_bill_amount END),0)           AS total_paid,
               COALESCE(SUM(CASE WHEN NOT COALESCE(lab_paid,false) AND lab_bill_amount > 0
                                 THEN lab_bill_amount END),0)                         AS total_unpaid,
               COUNT(CASE WHEN lab_bill_amount > 0 THEN 1 END)                        AS orders_with_bill
        FROM orders
        WHERE created_at::date BETWEEN $1 AND $2
          AND lens_company IS NOT NULL
        GROUP BY lens_company ORDER BY lab_total DESC
      `, [from, to]),

      // ── Top frames sold ──────────────────────────────────────
      pool.query(`
        SELECT frame,
               COUNT(*)                                                AS units,
               COALESCE(SUM(total_amount),0)                           AS revenue,
               COALESCE(AVG(
                 total_amount
                 - CASE WHEN customer_own_frame THEN 0 ELSE COALESCE(frame_buy_price,0) END
                 - COALESCE(lab_bill_amount,0)
                 - COALESCE(gift_cost,0)
               ),0)                                                    AS avg_profit
        FROM orders
        WHERE frame IS NOT NULL AND frame != ''
          AND created_at::date BETWEEN $1 AND $2
          AND status != 'cancelled'
        GROUP BY frame ORDER BY units DESC LIMIT 10
      `, [from, to]),

      // ── Top lens types ───────────────────────────────────────
      pool.query(`
        SELECT lens_type, COUNT(*) AS units,
               COALESCE(SUM(total_amount),0) AS revenue
        FROM orders
        WHERE lens_type IS NOT NULL
          AND created_at::date BETWEEN $1 AND $2
          AND status != 'cancelled'
        GROUP BY lens_type ORDER BY units DESC
      `, [from, to]),

      // ── Daily revenue trend ──────────────────────────────────
      pool.query(`
        SELECT
          gs::date AS date,
          COALESCE(o.order_rev,  0) AS order_revenue,
          COALESCE(q.qs_rev,     0) AS qs_revenue,
          COALESCE(r.rep_rev,    0) AS repair_revenue
        FROM generate_series($1::date, $2::date, '1 day') AS gs
        LEFT JOIN (
          SELECT created_at::date AS d, SUM(total_amount) AS order_rev
          FROM orders WHERE created_at::date BETWEEN $1 AND $2 AND status != 'cancelled'
          GROUP BY created_at::date
        ) o ON o.d = gs::date
        LEFT JOIN (
          SELECT created_at::date AS d, SUM(total) AS qs_rev
          FROM quick_sales WHERE created_at::date BETWEEN $1 AND $2
          GROUP BY created_at::date
        ) q ON q.d = gs::date
        LEFT JOIN (
          SELECT created_at::date AS d, SUM(charge) AS rep_rev
          FROM repairs WHERE created_at::date BETWEEN $1 AND $2
            AND payment_method != 'free'
          GROUP BY created_at::date
        ) r ON r.d = gs::date
        ORDER BY gs
      `, [from, to]),

      // ── Kalutota account ─────────────────────────────────────
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN direction='out' THEN total_amount END),0) AS total_out,
          COALESCE(SUM(CASE WHEN direction='in'  THEN total_amount END),0) AS total_in,
          COALESCE(SUM(CASE WHEN direction='out' AND payment_status='pending'
            THEN total_amount - COALESCE(paid_amount,0) END),0)           AS they_owe_you,
          COALESCE(SUM(CASE WHEN direction='in' AND payment_status='pending'
            THEN total_amount - COALESCE(paid_amount,0) END),0)           AS you_owe_them,
          COUNT(*) AS total_transactions
        FROM kalutota_transactions
        WHERE date BETWEEN $1 AND $2
      `, [from, to]),
    ]);

    // ── Compute totals ─────────────────────────────────────────
    const os  = orderStats.rows[0];
    const qs  = qsStats.rows[0];
    const rs  = repairStats.rows[0];
    const ex  = operatingExp.rows[0];
    const dep = depositStats.rows[0];
    const inv = inventoryValue.rows[0];

    const totalRevenue       = parseFloat(os.revenue||0)
                             + parseFloat(qs.revenue||0)
                             + parseFloat(rs.revenue||0);

    const frameCOGSAmt       = parseFloat(frameCOGS.rows[0]?.frame_cogs||0);
    const lensCOGSAmt        = parseFloat(lensCOGS.rows[0]?.lens_cogs||0);
    const qsCOGSAmt          = parseFloat(qsCOGS.rows[0]?.qs_cogs||0);
    const giftCOGSAmt        = parseFloat(giftCOGS.rows[0]?.gift_cogs||0);
    const repairCOGSAmt      = parseFloat(rs.repair_cogs||0);

    const totalCOGS          = frameCOGSAmt + lensCOGSAmt + qsCOGSAmt + giftCOGSAmt + repairCOGSAmt;
    const grossProfit        = totalRevenue - totalCOGS;
    const operatingExpAmt    = parseFloat(ex.total_amount||0);
    const netProfit          = grossProfit - operatingExpAmt;
    const profitMargin       = totalRevenue > 0 ? Math.round(netProfit / totalRevenue * 100) : 0;

    const totalDealerPurchases = stockPurchases.rows.reduce((s,r)=>s+parseFloat(r.total||0),0);

    res.json({
      period:   { from, to },

      // ── Correct profit summary ────────────────────────────────
      summary: {
        // Revenue
        totalRevenue,
        orderRevenue:    parseFloat(os.revenue||0),
        qsRevenue:       parseFloat(qs.revenue||0),
        repairRevenue:   parseFloat(rs.revenue||0),

        // COGS breakdown (each cost type separated)
        totalCOGS,
        cogs_breakdown: {
          frame:   frameCOGSAmt,   // frame_buy_price from orders (cost when sold)
          lens:    lensCOGSAmt,    // Lab Receivings payments
          quickSale: qsCOGSAmt,   // cost_price × qty for quick sale items
          gifts:   giftCOGSAmt,   // boxes, bags, cleaners, pouches given free
          repairs: repairCOGSAmt, // actual parts/materials used in repairs
        },

        // Profit
        grossProfit,
        operatingExpenses: operatingExpAmt,
        netProfit,
        profitMargin,

        // Context
        totalDeposited:    parseFloat(dep.total_deposited||0),
        dealerPurchases:   totalDealerPurchases,  // shown for info, NOT in profit calc

        // Inventory (money on shelf, not yet converted to revenue)
        inventoryValue:        parseFloat(inv.inventory_value||0),
        inventoryRetailValue:  parseFloat(inv.inventory_retail_value||0),
        lowStockItems:         parseInt(inv.low_stock_items||0),
        outOfStockItems:       parseInt(inv.out_of_stock_items||0),
      },

      orders:     { ...os, list: orderList.rows },
      quickSales: { ...qs, list: qsList.rows },
      repairs:    { ...rs, types: repairTypes.rows, list: repairList.rows },
      expenses: {
        total_count: ex.total_count,
        total_amount: ex.total_amount,
        byCategory: expenseList.rows,
        note: 'Lab Payment expenses are in lens COGS, not here',
      },
      deposits:         dep,
      dealerPurchases:  stockPurchases.rows,
      stockPurchases:   stockPurchases.rows,  // backward compat alias
      lensJobs:         lensJobStats.rows,
      kalutota:         kalutotaStats.rows[0] || {},
      topFrames:        topFrames.rows,
      topLenses:        topLensTypes.rows,
      daily:            dailyRevenue.rows,
    });

  } catch (err) {
    console.error('Full report error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

module.exports = router;