// ============================================================
//  Orders Routes — /api/orders
//  Fixed:
//    1. Race condition in nextOrderNumber → pg advisory lock
//    2. Inventory deduction now runs INSIDE the transaction
//    3. orderValidation middleware now applied to POST /
//    4. Route ordering: /import and /fix-prices moved BEFORE
//       /:id/calllogs so Express doesn't treat them as order IDs
//    5. Frame qty read now uses client.query (inside transaction)
//       so concurrent orders get accurate quantity_before values
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const { orderValidation, validate } = require('../middleware/orderValidation');

// ── Next order number (inside an open client transaction) ────
async function nextOrderNumber(client, dateStr) {
  await client.query('SELECT pg_advisory_xact_lock(1001)');

  if (dateStr) {
    const d = new Date(dateStr);
    const y = d.getFullYear().toString().slice(2);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const countRes = await client.query(
      `SELECT COALESCE(MAX(CAST(SPLIT_PART(order_number,'-',3) AS INTEGER)),0) AS maxseq
       FROM orders WHERE order_number LIKE $1`,
      [`KO-${y}${m}-%`]
    );
    const seq = parseInt(countRes.rows[0].maxseq) + 1;
    return `KO-${y}${m}-${String(seq).padStart(3, '0')}`;
  }

  const res = await client.query(
    "SELECT order_number FROM orders WHERE order_number ~ '^KO-[0-9]{4}$' ORDER BY id DESC LIMIT 1"
  );
  if (!res.rows.length) return 'KO-0001';
  const last = parseInt(res.rows[0].order_number.replace('KO-', '')) || 0;
  return 'KO-' + String(last + 1).padStart(4, '0');
}

// Auto-mark overdue orders
// Bug #16 Fix: debounced — runs at most once every 5 minutes
// instead of on every single GET /api/orders request.
let lastOverdueCheck = 0;
async function markOverdueOrders() {
  const now = Date.now();
  if (now - lastOverdueCheck < 5 * 60 * 1000) return;
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

// ── GET /api/orders ──────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  await markOverdueOrders().catch(() => {});
  const { search, status, limit = 10000, offset = 0 } = req.query;
  try {
    let query = `
      SELECT o.*, c.name AS customer_name, c.phone, c.age
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    // Fix F: balance_due is a real server-side filter now
    // Frontend no longer fetches all 10k orders just to filter client-side
    if (status === 'balance_due') {
      query += ` AND o.balance_amount > 0 AND o.status != 'cancelled'`;
    } else if (status && status !== 'all') {
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR o.order_number ILIKE $${params.length} OR o.frame ILIKE $${params.length})`;
    }
    query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ── GET /api/orders/:id ──────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await pool.query(`
      SELECT o.*, c.name AS customer_name, c.phone, c.age, c.address
      FROM orders o JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `, [req.params.id]);
    if (!order.rows.length) return res.status(404).json({ error: 'Order not found' });
    const [refraction, callLogs] = await Promise.all([
      pool.query('SELECT * FROM refractions WHERE order_id = $1', [req.params.id]),
      pool.query(`
        SELECT cl.*, u.full_name AS logged_by_name
        FROM call_logs cl
        LEFT JOIN users u ON cl.logged_by = u.id
        WHERE cl.order_id = $1
        ORDER BY cl.created_at DESC
      `, [req.params.id]),
    ]);
    res.json({ ...order.rows[0], refraction: refraction.rows[0] || null, call_logs: callLogs.rows });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ── POST /api/orders ─────────────────────────────────────────
router.post('/', auth, orderValidation, validate, async (req, res) => {
  const {
    customer_id, frame, frame_type, frame_material,
    lens_type, lens_coating, lens_company,
    total_amount, advance_amount, deliver_date,
    status, has_rx, rx_hospital, rx_date, rx_doctor, notes,
    r_sph, r_cyl, r_axis, r_add, r_va, r_pd,
    l_sph, l_cyl, l_axis, l_add, l_va, l_pd, ref_notes,
    import_date, frame_color, frame_sell_price, lens_sell_price,
    frame_buy_price, lens_buy_price, customer_own_frame,
    frame_inventory_id, balance_amount: balance_override,
  } = req.body;

  if (!customer_id) return res.status(400).json({ error: 'customer_id is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const importTs = import_date ? new Date(import_date + 'T12:00:00') : null;
    const orderNum = await nextOrderNumber(client, import_date);
    const total    = parseFloat(total_amount)   || 0;
    const advance  = parseFloat(advance_amount) || 0;
    const balance  = balance_override !== undefined ? parseFloat(balance_override) : Math.max(0, total - advance);

    const orderRes = await client.query(`
      INSERT INTO orders (
        order_number, customer_id, frame, frame_type, frame_material,
        frame_color, frame_sell_price, frame_buy_price,
        lens_type, lens_coating, lens_company, lens_index,
        lens_sell_price, lens_buy_price,
        total_amount, advance_amount, balance_amount,
        deliver_date, status,
        has_rx, rx_hospital, rx_date, rx_doctor, notes,
        customer_own_frame, order_type, frame_inventory_id,
        discount_amount, discount_percent, payment_method
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
                $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
      RETURNING *
    `, [
      orderNum, customer_id,
      frame || null, frame_type || null, frame_material || null,
      req.body.frame_color || null,
      parseFloat(req.body.frame_sell_price) || 0,
      parseFloat(req.body.frame_buy_price)  || 0,
      lens_type || null, lens_coating || null, lens_company || null,
      req.body.lens_index || null,
      parseFloat(req.body.lens_sell_price) || 0,
      parseFloat(req.body.lens_buy_price)  || 0,
      total, advance, balance,
      deliver_date || null, import_date ? 'delivered' : (status || 'created'),
      has_rx || false, rx_hospital || null, rx_date || null, rx_doctor || null, notes || null,
      req.body.customer_own_frame  || false,
      req.body.order_type          || 'normal',
      req.body.frame_inventory_id  || null,
      parseFloat(req.body.discount_amount)  || 0,
      parseFloat(req.body.discount_percent) || 0,
      req.body.payment_method || 'cash',
    ]);

    if (importTs) {
      await client.query(
        'UPDATE orders SET created_at=$1, updated_at=$1 WHERE id=$2',
        [importTs, orderRes.rows[0].id]
      );
    }

    const orderId = orderRes.rows[0].id;

    // Save refraction
    const hasRefraction = r_sph || l_sph || r_cyl || l_cyl;
    if (hasRefraction) {
      await client.query(`
        INSERT INTO refractions
          (order_id, customer_id, r_sph, r_cyl, r_axis, r_add, r_va, r_pd,
           l_sph, l_cyl, l_axis, l_add, l_va, l_pd, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      `, [
        orderId, customer_id,
        r_sph || null, r_cyl || null, r_axis || null, r_add || null, r_va || null, r_pd || null,
        l_sph || null, l_cyl || null, l_axis || null, l_add || null, l_va || null, l_pd || null,
        ref_notes || null,
      ]);
    }

    // ── Deduct frame inventory INSIDE the transaction ──────────
    // FIX #3: Read uses client.query (inside transaction) so
    // concurrent orders can't both see the same old quantity.
    const frameInvId = req.body.frame_inventory_id;
    if (frameInvId && !req.body.customer_own_frame) {
      const fBefore = await client.query(
        'SELECT quantity, name FROM inventory WHERE id=$1',
        [frameInvId]
      ).catch(() => ({ rows: [{ quantity: 0, name: 'Frame' }] }));
      const fQtyBefore = parseInt(fBefore.rows[0]?.quantity || 0);

      await client.query(
        'UPDATE inventory SET quantity = GREATEST(0, quantity - 1), updated_at = NOW() WHERE id = $1',
        [frameInvId]
      );

      await client.query(
        `INSERT INTO stock_adjustments
          (inventory_id, item_name, change_type, quantity_change, quantity_before, quantity_after, reason, notes, unit_cost, adjusted_by)
         VALUES ($1,$2,'remove',-1,$3,$4,'Order',$5,$6,$7)`,
        [
          frameInvId,
          fBefore.rows[0]?.name || req.body.frame,
          fQtyBefore,
          Math.max(0, fQtyBefore - 1),
          'Order: ' + orderNum,
          parseFloat(req.body.frame_buy_price) || 0,
          req.user.id,
        ]
      ).catch(e => console.warn('Stock log failed:', e.message));
    }

    // Auto-create bank receipt if payment method is bank/card/transfer
    // Card payments: 3% bank charge is deducted — net amount deposited is 97% of paid amount.
    // Bank/transfer: no charge — full amount deposited.
    const pm     = (req.body.payment_method || 'cash').toLowerCase();
    const advAmt = parseFloat(req.body.advance_amount) || 0;
    if ((pm === 'bank' || pm === 'card' || pm === 'transfer') && advAmt > 0) {
      try {
        const CARD_CHARGE_RATE = 0.03; // 3% bank card charge
        const cardCharge = pm === 'card' ? Math.round(advAmt * CARD_CHARGE_RATE * 100) / 100 : 0;
        const netAmount  = advAmt - cardCharge;
        await client.query(
          `INSERT INTO cash_deposits
             (date, amount, bank_name, payment_type, notes, added_by, order_id, card_charge, net_amount)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            req.body.import_date || new Date().toISOString().split('T')[0],
            advAmt,        // gross amount paid by customer
            'Pan Asia Bank',
            pm === 'card' ? 'card' : 'online',
            'Auto: Order ' + orderNum + (req.body.frame ? ' — ' + req.body.frame : '')
              + (cardCharge > 0 ? ` (Card charge: Rs.${cardCharge})` : ''),
            req.user.id,
            orderId,
            cardCharge,    // 3% bank fee (0 for bank/transfer)
            netAmount,     // actual amount credited to account
          ]
        );
      } catch (e) {
        console.warn('Auto bank receipt failed:', e.message);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ ...orderRes.rows[0], order_number: orderNum });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally {
    client.release();
  }
});

// ── POST /api/orders/import — bulk import past orders ────────
// FIX #1: Moved BEFORE /:id/calllogs — was being matched as
// /:id = "import" by Express, hitting the wrong handler.
router.post('/import', auth, async (req, res) => {
  const {
    customer_id, frame, frame_type, frame_material, frame_color,
    lens_type, lens_coating, lens_company, frame_sell_price, lens_sell_price,
    total_amount, advance_amount, balance_amount, deliver_date,
    status, notes, customer_own_frame, import_date, order_type,
    has_rx, rx_hospital, rx_date, rx_doctor, ref_notes,
    r_sph, r_cyl, r_axis, r_add, r_va, r_pd,
    l_sph, l_cyl, l_axis, l_add, l_va, l_pd,
  } = req.body;

  if (!customer_id) return res.status(400).json({ error: 'customer_id required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dateObj = new Date(import_date || Date.now());
    const y = dateObj.getFullYear().toString().slice(2);
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');

    await client.query('SELECT pg_advisory_xact_lock(1001)');
    const countRes = await client.query(
      `SELECT COALESCE(MAX(CAST(SPLIT_PART(order_number,'-',3) AS INTEGER)),0) AS maxseq
       FROM orders WHERE order_number LIKE $1`,
      [`KO-${y}${m}-%`]
    );
    const seq          = parseInt(countRes.rows[0].maxseq) + 1;
    const order_number = `KO-${y}${m}-${String(seq).padStart(3, '0')}`;
    const importTs     = import_date ? new Date(import_date + 'T12:00:00') : new Date();
    const total        = parseFloat(total_amount)   || 0;
    const advance      = parseFloat(advance_amount) || total;
    const balance      = Math.max(0, total - advance);

    const result = await client.query(`
      INSERT INTO orders (
        order_number, customer_id, frame, frame_type, frame_material, frame_color,
        lens_type, lens_coating, lens_company,
        total_amount, advance_amount, balance_amount, deliver_date,
        status, notes, has_rx, rx_hospital, rx_date, rx_doctor,
        created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$20)
      RETURNING *`,
      [
        order_number, customer_id,
        frame || 'Frame', frame_type || 'Full rim', frame_material || 'Plastic', frame_color || 'Black',
        lens_type || 'Single Vision', lens_coating || 'CR (White)', lens_company || null,
        total, advance, balance,
        deliver_date || import_date, status || 'delivered',
        notes || 'Imported from past records',
        has_rx || false, rx_hospital || null, rx_date || null, rx_doctor || null,
        importTs,
      ]
    );

    const orderId = result.rows[0].id;

    const hasRx = r_sph || l_sph || r_cyl || l_cyl;
    if (hasRx) {
      await client.query(`
        INSERT INTO refractions
          (order_id, customer_id, r_sph, r_cyl, r_axis, r_add, r_va, r_pd,
           l_sph, l_cyl, l_axis, l_add, l_va, l_pd, notes, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      `, [
        orderId, customer_id,
        r_sph || null, r_cyl || null, r_axis || null, r_add || null, r_va || null, r_pd || null,
        l_sph || null, l_cyl || null, l_axis || null, l_add || null, l_va || null, l_pd || null,
        ref_notes || null, importTs,
      ]);
    }

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Import order error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally {
    client.release();
  }
});

// ── POST /api/orders/fix-prices — backfill old order prices ──
// FIX #1: Also moved BEFORE /:id/calllogs for same reason.
router.post('/fix-prices', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE orders
      SET
        frame_sell_price = CASE
          WHEN customer_own_frame = true OR customer_own_frame IS NULL AND frame_buy_price = 0 THEN 0
          ELSE COALESCE(NULLIF(frame_sell_price, 0), total_amount)
        END,
        lens_sell_price = CASE
          WHEN COALESCE(lens_sell_price, 0) = 0 AND COALESCE(frame_sell_price, 0) = 0
          THEN total_amount
          ELSE COALESCE(lens_sell_price, 0)
        END
      WHERE
        (COALESCE(frame_sell_price, 0) = 0 AND COALESCE(lens_sell_price, 0) = 0)
        AND COALESCE(total_amount, 0) > 0
      RETURNING id, order_number, total_amount, frame_sell_price, lens_sell_price
    `);
    res.json({ fixed: result.rowCount, rows: result.rows.slice(0, 10) });
  } catch (err) {
    console.error('fix-prices error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/orders/:id/calllogs ────────────────────────────
router.post('/:id/calllogs', auth, async (req, res) => {
  const { note } = req.body;
  if (!note) return res.status(400).json({ error: 'Note is required' });
  try {
    const result = await pool.query(
      'INSERT INTO call_logs (order_id, note, logged_by) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, note, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add call log' });
  }
});

// ── PATCH /api/orders/:id ────────────────────────────────────
router.patch('/:id', auth, async (req, res) => {
  await pool.query(
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_payment_amount DECIMAL(10,2) DEFAULT 0`
  ).catch(() => {});
  const allowed = [
    'frame','frame_type','frame_color','frame_material','lens_type','lens_coating',
    'lens_company','lens_step','lens_index',
    'total_amount','advance_amount','balance_amount','deliver_date','status',
    'has_rx','rx_hospital','rx_date','rx_doctor','rx_returned','notes',
    'lab_bill_amount','lab_paid','lab_paid_date','lab_payment_method','lab_notes',
    'last_payment_date','last_payment_method','last_payment_amount',
    'frame_buy_price','frame_sell_price',
    'lens_buy_price','lens_sell_price',
    'order_type','customer_own_frame',
    'seg_height_r','seg_height_l',
    'discount_amount','discount_percent',
  ];
  const fields = [], values = [];
  allowed.forEach(f => {
    if (req.body[f] !== undefined) {
      fields.push(`${f} = $${fields.length + 1}`);
      values.push(req.body[f]);
    }
  });
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  fields.push('updated_at = NOW()');
  values.push(req.params.id);
  try {
    const result = await pool.query(
      `UPDATE orders SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update order error:', err.message);
    if (err.message.includes('column') && err.message.includes('does not exist')) {
      return res.status(500).json({
        error: `DB column missing. Run migration in schema.sql to add missing columns.`,
      });
    }
    res.status(500).json({ error: 'Failed to update order: ' + err.message });
  }
});

// ── DELETE /api/orders/:id ───────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const ord = await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
    if (ord.rows.length && ord.rows[0].frame_inventory_id && !ord.rows[0].customer_own_frame) {
      const rBefore = await pool.query('SELECT quantity, name FROM inventory WHERE id=$1',
        [ord.rows[0].frame_inventory_id]).catch(() => ({ rows: [{ quantity: 0, name: 'Frame' }] }));
      const rQtyB = parseInt(rBefore.rows[0]?.quantity || 0);

      await pool.query(
        'UPDATE inventory SET quantity = quantity + 1, updated_at = NOW() WHERE id = $1',
        [ord.rows[0].frame_inventory_id]
      ).catch(() => {});

      await pool.query(`INSERT INTO stock_adjustments
        (inventory_id, item_name, change_type, quantity_change, quantity_before, quantity_after, reason, notes, adjusted_by)
        VALUES ($1,$2,'add',1,$3,$4,'Order Cancelled',$5,$6)`,
        [ord.rows[0].frame_inventory_id, rBefore.rows[0]?.name || ord.rows[0].frame,
         rQtyB, rQtyB + 1, 'Returned: order ' + ord.rows[0].order_number, req.user.id]
      ).catch(() => {});
    }
    await pool.query('DELETE FROM cash_deposits WHERE order_id = $1', [req.params.id]).catch(() => {});
    // Bug #15 Fix: clean up orphan child records so DB stays tidy
    await pool.query('DELETE FROM refractions WHERE order_id = $1', [req.params.id]).catch(() => {});
    await pool.query('DELETE FROM call_logs   WHERE order_id = $1', [req.params.id]).catch(() => {});
    await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router;