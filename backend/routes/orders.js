// ============================================================
//  Orders Routes — /api/orders
//  Fixed:
//    1. Race condition → pg advisory lock
//    2. Inventory deduction inside transaction
//    3. orderValidation applied to POST /
//    4. NEW: POST /:id/payment — records balance payments
//       into payment_logs so they appear in daily income
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');
const { orderValidation, validate } = require('../middleware/orderValidation');

async function nextOrderNumber(client, dateStr) {
  await client.query('SELECT pg_advisory_xact_lock(1001)');
  if (dateStr) {
    const d = new Date(dateStr);
    const y = d.getFullYear().toString().slice(2);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const countRes = await client.query(
      `SELECT COALESCE(MAX(CAST(SPLIT_PART(order_number,'-',3) AS INTEGER)),0) AS maxseq
       FROM orders WHERE order_number LIKE $1`, [`KO-${y}${m}-%`]);
    const seq = parseInt(countRes.rows[0].maxseq) + 1;
    return `KO-${y}${m}-${String(seq).padStart(3, '0')}`;
  }
  const res = await client.query(
    "SELECT order_number FROM orders WHERE order_number ~ '^KO-[0-9]{4}$' ORDER BY id DESC LIMIT 1");
  if (!res.rows.length) return 'KO-0001';
  const last = parseInt(res.rows[0].order_number.replace('KO-', '')) || 0;
  return 'KO-' + String(last + 1).padStart(4, '0');
}

async function markOverdueOrders() {
  try {
    await pool.query(`UPDATE orders SET status='overdue'
      WHERE deliver_date < CURRENT_DATE AND status IN ('created','called')
        AND deliver_date IS NOT NULL`);
  } catch(e) { console.error('markOverdueOrders:', e.message); }
}

// ── GET /api/orders ──────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  await markOverdueOrders().catch(() => {});
  const { search, status, limit = 10000, offset = 0 } = req.query;
  try {
    let query = `SELECT o.*, c.name AS customer_name, c.phone, c.age
                 FROM orders o JOIN customers c ON o.customer_id = c.id WHERE 1=1`;
    const params = [];
    if (status && status !== 'all') { params.push(status); query += ` AND o.status=$${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR o.order_number ILIKE $${params.length} OR o.frame ILIKE $${params.length})`;
    }
    query += ` ORDER BY o.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch(err) { res.status(500).json({ error: 'Failed to fetch orders' }); }
});

// ── GET /api/orders/:id ──────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await pool.query(`
      SELECT o.*, c.name AS customer_name, c.phone, c.age, c.address
      FROM orders o JOIN customers c ON o.customer_id=c.id WHERE o.id=$1`, [req.params.id]);
    if (!order.rows.length) return res.status(404).json({ error: 'Not found' });
    const [refraction, callLogs, payments] = await Promise.all([
      pool.query('SELECT * FROM refractions WHERE order_id=$1', [req.params.id]),
      pool.query(`SELECT cl.*, u.full_name AS logged_by_name
        FROM call_logs cl LEFT JOIN users u ON cl.logged_by=u.id
        WHERE cl.order_id=$1 ORDER BY cl.created_at DESC`, [req.params.id]),
      pool.query(`SELECT pl.*, u.full_name AS recorded_by_name
        FROM payment_logs pl LEFT JOIN users u ON pl.recorded_by=u.id
        WHERE pl.order_id=$1 ORDER BY pl.payment_date DESC, pl.created_at DESC`,
        [req.params.id]).catch(() => ({ rows: [] })),
    ]);
    res.json({ ...order.rows[0], refraction: refraction.rows[0]||null,
      call_logs: callLogs.rows, payment_history: payments.rows });
  } catch(err) { res.status(500).json({ error: 'Failed' }); }
});

// ── POST /api/orders/:id/payment — FIXED: records to payment_logs ──
// This is the correct way to record balance collection.
// Calls from the frontend PaymentModal should use this instead of PATCH.
router.post('/:id/payment', auth, async (req, res) => {
  const { amount, payment_method, payment_type = 'balance', notes, payment_date } = req.body;
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Valid amount required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ord = await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!ord.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Order not found' }); }
    const order = ord.rows[0];

    const newBalance = Math.max(0, parseFloat(order.balance_amount||0) - amt);
    const newAdvance = parseFloat(order.advance_amount||0) + amt;
    const today      = payment_date || new Date().toISOString().split('T')[0];
    const newStatus  = newBalance === 0 && order.status !== 'cancelled' ? 'delivered' : order.status;
    const pm         = payment_method || 'cash';

    // ── 1. Record in payment_logs (this is what fixes the daily income bug) ──
    await client.query(`
      INSERT INTO payment_logs
        (order_id, amount, payment_date, payment_method, payment_type, notes, recorded_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [req.params.id, amt, today, pm, payment_type,
       notes || `${payment_type==='balance'?'Balance':'Partial'} payment — ${order.order_number}`,
       req.user.id]);

    // ── 2. Update the order balance ────────────────────────────────────────
    await client.query(`
      UPDATE orders SET
        advance_amount    = $1,
        balance_amount    = $2,
        last_payment_date = $3,
        last_payment_method = $4,
        status            = $5,
        updated_at        = NOW()
      WHERE id = $6`,
      [newAdvance, newBalance, today, pm, newStatus, req.params.id]);

    // ── 3. Auto bank deposit record for non-cash payments ─────────────────
    if (pm !== 'cash') {
      await client.query(`
        INSERT INTO cash_deposits
          (date, amount, bank_name, payment_type, notes, added_by, order_id)
        VALUES ($1,$2,'Pan Asia Bank',$3,$4,$5,$6)`,
        [today, amt, pm === 'card' ? 'card' : 'online',
         `Balance: ${order.order_number} — ${ord.rows[0].customer_name||''}`,
         req.user.id, req.params.id]);
    }

    await client.query('COMMIT');

    const updated = await pool.query(`
      SELECT o.*, c.name AS customer_name, c.phone FROM orders o
      JOIN customers c ON o.customer_id=c.id WHERE o.id=$1`, [req.params.id]);
    res.json({ order: updated.rows[0], collected: amt, new_balance: newBalance });
  } catch(err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// ── POST /api/orders ─────────────────────────────────────────
router.post('/', auth, orderValidation, validate, async (req, res) => {
  const {
    customer_id, frame, frame_type, frame_material, lens_type, lens_coating,
    lens_company, total_amount, advance_amount, deliver_date, status,
    has_rx, rx_hospital, rx_date, rx_doctor, notes, import_date,
    r_sph, r_cyl, r_axis, r_add, r_va, r_pd,
    l_sph, l_cyl, l_axis, l_add, l_va, l_pd, ref_notes,
  } = req.body;

  if (!customer_id) return res.status(400).json({ error: 'customer_id required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const importTs  = import_date ? new Date(import_date + 'T12:00:00') : null;
    const orderNum  = await nextOrderNumber(client, import_date);
    const total     = parseFloat(total_amount)   || 0;
    const advance   = parseFloat(advance_amount) || 0;
    const balance   = req.body.balance_amount !== undefined
      ? parseFloat(req.body.balance_amount) : Math.max(0, total - advance);

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
      RETURNING *`,
      [orderNum, customer_id, frame||null, frame_type||null, frame_material||null,
       req.body.frame_color||null, parseFloat(req.body.frame_sell_price)||0,
       parseFloat(req.body.frame_buy_price)||0,
       lens_type||null, lens_coating||null, lens_company||null,
       req.body.lens_index||null, parseFloat(req.body.lens_sell_price)||0,
       parseFloat(req.body.lens_buy_price)||0,
       total, advance, balance,
       deliver_date||null, import_date?'delivered':(status||'created'),
       has_rx||false, rx_hospital||null, rx_date||null, rx_doctor||null, notes||null,
       req.body.customer_own_frame||false, req.body.order_type||'normal',
       req.body.frame_inventory_id||null,
       parseFloat(req.body.discount_amount)||0,
       parseFloat(req.body.discount_percent)||0,
       req.body.payment_method||'cash']);

    if (importTs) {
      await client.query('UPDATE orders SET created_at=$1,updated_at=$1 WHERE id=$2',
        [importTs, orderRes.rows[0].id]);
    }

    const orderId = orderRes.rows[0].id;

    // Refraction
    if (r_sph||l_sph||r_cyl||l_cyl) {
      await client.query(`INSERT INTO refractions
        (order_id,customer_id,r_sph,r_cyl,r_axis,r_add,r_va,r_pd,
         l_sph,l_cyl,l_axis,l_add,l_va,l_pd,notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [orderId, customer_id, r_sph||null, r_cyl||null, r_axis||null, r_add||null,
         r_va||null, r_pd||null, l_sph||null, l_cyl||null, l_axis||null,
         l_add||null, l_va||null, l_pd||null, ref_notes||null]);
    }

    // Frame inventory deduction (INSIDE transaction)
    if (req.body.frame_inventory_id && !req.body.customer_own_frame) {
      await client.query(
        'UPDATE inventory SET quantity=GREATEST(0,quantity-1),updated_at=NOW() WHERE id=$1',
        [req.body.frame_inventory_id]);
    }

    // ── Record advance in payment_logs ─────────────────────────────────────
    if (advance > 0) {
      const payDate = import_date || new Date().toISOString().split('T')[0];
      const pm      = req.body.payment_method || 'cash';
      await client.query(`
        INSERT INTO payment_logs
          (order_id, amount, payment_date, payment_method, payment_type, notes, recorded_by, created_at)
        VALUES ($1,$2,$3,$4,'advance',$5,$6,$7)`,
        [orderId, advance, payDate, pm,
         `Initial advance — ${orderNum}`,
         req.user.id,
         importTs || new Date()]);
    }

    // Auto bank deposit for non-cash advance
    const pm     = (req.body.payment_method||'cash').toLowerCase();
    const advAmt = advance;
    if ((pm==='bank'||pm==='card'||pm==='transfer') && advAmt > 0) {
      try {
        await client.query(`INSERT INTO cash_deposits
          (date,amount,bank_name,payment_type,notes,added_by,order_id)
          VALUES ($1,$2,'Pan Asia Bank',$3,$4,$5,$6)`,
          [import_date||new Date().toISOString().split('T')[0], advAmt,
           pm==='card'?'card':'online', `Auto: advance ${orderNum}`, req.user.id, orderId]);
      } catch(e) { console.warn('Auto bank deposit failed:', e.message); }
    }

    await client.query('COMMIT');
    res.status(201).json({ ...orderRes.rows[0], order_number: orderNum });
  } catch(err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// ── PATCH /api/orders/:id ─────────────────────────────────────
router.patch('/:id', auth, async (req, res) => {
  const allowed = [
    'frame','frame_type','frame_color','frame_material','lens_type','lens_coating',
    'lens_company','lens_step','lens_index','total_amount','advance_amount',
    'balance_amount','deliver_date','status','has_rx','rx_hospital','rx_date',
    'rx_doctor','rx_returned','notes','lab_bill_amount','lab_paid','lab_paid_date',
    'lab_payment_method','lab_notes','last_payment_date','last_payment_method',
    'frame_buy_price','frame_sell_price','lens_buy_price','lens_sell_price',
    'order_type','customer_own_frame','seg_height_r','seg_height_l',
    'discount_amount','discount_percent',
  ];
  const fields = [], values = [];
  allowed.forEach(f => {
    if (req.body[f] !== undefined) { fields.push(`${f}=$${fields.length+1}`); values.push(req.body[f]); }
  });
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  fields.push('updated_at=NOW()');
  values.push(req.params.id);
  try {
    const result = await pool.query(
      `UPDATE orders SET ${fields.join(',')} WHERE id=$${values.length} RETURNING *`, values);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/orders/:id ────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const ord = await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
    if (ord.rows.length && ord.rows[0].frame_inventory_id && !ord.rows[0].customer_own_frame) {
      await pool.query('UPDATE inventory SET quantity=quantity+1,updated_at=NOW() WHERE id=$1',
        [ord.rows[0].frame_inventory_id]).catch(() => {});
    }
    await pool.query('DELETE FROM payment_logs WHERE order_id=$1', [req.params.id]).catch(() => {});
    await pool.query('DELETE FROM cash_deposits WHERE order_id=$1', [req.params.id]).catch(() => {});
    await pool.query('DELETE FROM orders WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch(err) { res.status(500).json({ error: 'Failed' }); }
});

// ── POST /api/orders/:id/calllogs ─────────────────────────────
router.post('/:id/calllogs', auth, async (req, res) => {
  const { note } = req.body;
  if (!note) return res.status(400).json({ error: 'Note required' });
  try {
    const result = await pool.query(
      'INSERT INTO call_logs (order_id,note,logged_by) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, note, req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch(err) { res.status(500).json({ error: 'Failed' }); }
});

// ── GET /api/orders/:id/payment-history ──────────────────────
router.get('/:id/payment-history', auth, async (req, res) => {
  try {
    const rows = await pool.query(`
      SELECT pl.*, u.full_name AS recorded_by_name
      FROM payment_logs pl LEFT JOIN users u ON pl.recorded_by=u.id
      WHERE pl.order_id=$1 ORDER BY pl.payment_date DESC, pl.created_at DESC`,
      [req.params.id]).catch(() => ({ rows: [] }));
    res.json(rows.rows);
  } catch(err) { res.json([]); }
});

module.exports = router;