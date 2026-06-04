// ============================================================
//  Orders Routes — /api/orders
//  Fixed: refraction saving in /import route
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// ── Next order number ────────────────────────────────────────
async function nextOrderNumber(dateStr) {
  if (dateStr) {
    const d = new Date(dateStr);
    const y = d.getFullYear().toString().slice(2);
    const m = String(d.getMonth()+1).padStart(2,'0');
    const countRes = await pool.query(
      `SELECT COALESCE(MAX(CAST(SPLIT_PART(order_number,'-',3) AS INTEGER)),0) as maxseq
       FROM orders WHERE order_number LIKE $1`, [`KO-${y}${m}-%`]
    );
    const seq = parseInt(countRes.rows[0].maxseq) + 1;
    return `KO-${y}${m}-${String(seq).padStart(3,'0')}`;
  }
  const res = await pool.query(
    "SELECT order_number FROM orders WHERE order_number ~ '^KO-[0-9]{4}$' ORDER BY id DESC LIMIT 1"
  );
  if (!res.rows.length) return 'KO-0001';
  const last = parseInt(res.rows[0].order_number.replace('KO-','')) || 0;
  return 'KO-' + String(last + 1).padStart(4, '0');
}

// Auto-mark overdue orders (deliver_date passed, not delivered yet)
async function markOverdueOrders() {
  try {
    await pool.query(`
      UPDATE orders SET status = 'overdue'
      WHERE deliver_date < CURRENT_DATE
        AND status IN ('created','called')
        AND deliver_date IS NOT NULL
    `);
  } catch(e) {}
}

// GET /api/orders
router.get('/', auth, async (req, res) => {
  await markOverdueOrders().catch(()=>{});
  const { search, status, limit = 100, offset = 0 } = req.query;
  try {
    let query = `
      SELECT o.*, c.name AS customer_name, c.phone, c.age
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (status && status !== 'all') {
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR o.order_number ILIKE $${params.length} OR o.frame ILIKE $${params.length})`;
    }
    query += ` ORDER BY o.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id
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
      pool.query(`SELECT cl.*, u.full_name AS logged_by_name FROM call_logs cl LEFT JOIN users u ON cl.logged_by = u.id WHERE cl.order_id = $1 ORDER BY cl.created_at DESC`, [req.params.id]),
    ]);
    res.json({ ...order.rows[0], refraction: refraction.rows[0] || null, call_logs: callLogs.rows });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /api/orders
router.post('/', auth, async (req, res) => {
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
    const orderNum = await nextOrderNumber(import_date);
    const total    = parseFloat(total_amount)   || 0;
    const advance  = parseFloat(advance_amount) || 0;
    const balance  = balance_override !== undefined ? parseFloat(balance_override) : Math.max(0, total - advance);

    const orderRes = await client.query(`
      INSERT INTO orders (
        order_number, customer_id, frame, frame_type, frame_material,
        lens_type, lens_coating, lens_company,
        total_amount, advance_amount, balance_amount,
        deliver_date, status,
        has_rx, rx_hospital, rx_date, rx_doctor, notes,
        frame_buy_price, lens_buy_price
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
                $19,$20)
      RETURNING *
    `, [
      orderNum, customer_id,
      frame||null, frame_type||null, frame_material||null,
      lens_type||null, lens_coating||null, lens_company||null,
      total, advance, balance,
      deliver_date||null, import_date ? 'delivered' : (status||'created'),
      has_rx||false, rx_hospital||null, rx_date||null, rx_doctor||null, notes||null,
      parseFloat(req.body.frame_buy_price)||0,
      parseFloat(req.body.lens_buy_price)||0,
    ]);

    if (importTs) {
      await client.query(`UPDATE orders SET created_at=$1, updated_at=$1 WHERE id=$2`,
        [importTs, orderRes.rows[0].id]);
    }

    const orderId = orderRes.rows[0].id;

    // Save refraction
    const hasRefraction = r_sph || l_sph || r_cyl || l_cyl;
    if (hasRefraction) {
      await client.query(`
        INSERT INTO refractions (order_id, customer_id, r_sph, r_cyl, r_axis, r_add, r_va, r_pd, l_sph, l_cyl, l_axis, l_add, l_va, l_pd, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      `, [orderId, customer_id,
          r_sph||null, r_cyl||null, r_axis||null, r_add||null, r_va||null, r_pd||null,
          l_sph||null, l_cyl||null, l_axis||null, l_add||null, l_va||null, l_pd||null,
          ref_notes||null]);
    }

    await client.query('COMMIT');
    const newOrder = { ...orderRes.rows[0], order_number: orderNum };

    // Auto-create bank receipt if payment method is bank or card
    const pm     = (req.body.payment_method||'cash').toLowerCase();
    const advAmt = parseFloat(req.body.advance_amount)||0;
    if ((pm==='bank'||pm==='card'||pm==='transfer') && advAmt > 0) {
      try {
        await pool.query(
          `INSERT INTO cash_deposits
             (date, amount, bank_name, payment_type, notes, added_by, order_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            req.body.import_date || new Date().toISOString().split('T')[0],
            advAmt,
            'Pan Asia Bank',
            pm === 'card' ? 'card' : 'online',
            'Auto: Order ' + orderNum + (req.body.frame ? ' — ' + req.body.frame : ''),
            req.user.id,
            newOrder.id,
          ]
        );
      } catch(e) {
        // order_id column may not exist yet — try without it
        try {
          await pool.query(
            `INSERT INTO cash_deposits (date, amount, bank_name, payment_type, notes, added_by)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              req.body.import_date || new Date().toISOString().split('T')[0],
              advAmt, 'Pan Asia Bank',
              pm === 'card' ? 'card' : 'online',
              'Auto: Order ' + orderNum,
              req.user.id,
            ]
          );
        } catch(e2) { console.warn('Auto bank receipt failed:', e2.message); }
      }
    }

    res.status(201).json(newOrder);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally { client.release(); }
});

// PATCH /api/orders/:id
router.patch('/:id', auth, async (req, res) => {
  const allowed = [
    'frame','frame_type','frame_color','frame_material','lens_type','lens_coating',
    'lens_company','lens_step','lens_index',
    'total_amount','advance_amount','balance_amount','deliver_date','status',
    'has_rx','rx_hospital','rx_date','rx_doctor','rx_returned','notes',
    'lab_bill_amount','lab_paid','lab_paid_date','lab_payment_method','lab_notes',
    'last_payment_date','last_payment_method',
    'frame_buy_price','frame_sell_price',
    'lens_buy_price','lens_sell_price',
    'order_type','customer_own_frame',
    'seg_height_r','seg_height_l',
    'discount_amount','discount_percent',
  ];
  const fields = [], values = [];
  allowed.forEach(f => {
    if (req.body[f] !== undefined) { fields.push(`${f} = $${fields.length+1}`); values.push(req.body[f]); }
  });
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  fields.push('updated_at = NOW()');
  values.push(req.params.id);
  try {
    const result = await pool.query(
      `UPDATE orders SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`, values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update order error:', err.message);
    // If column doesn't exist, try without it and return partial success
    if (err.message.includes('column') && err.message.includes('does not exist')) {
      return res.status(500).json({ 
        error: `DB column missing. Run: ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${err.message.match(/column "([^"]+)"/)?.[1]||'unknown'} VARCHAR(50);` 
      });
    }
    res.status(500).json({ error: 'Failed to update order: ' + err.message });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    // Delete linked bank receipt first
    await pool.query(
      'DELETE FROM cash_deposits WHERE order_id = $1', [req.params.id]
    ).catch(()=>{});  // ignore if order_id column doesn't exist yet
    // Then delete the order
    await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ message: 'Order deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete order' }); }
});

// POST /api/orders/:id/calllogs
router.post('/:id/calllogs', auth, async (req, res) => {
  const { note } = req.body;
  if (!note) return res.status(400).json({ error: 'Note is required' });
  try {
    const result = await pool.query(
      'INSERT INTO call_logs (order_id, note, logged_by) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, note, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to add call log' }); }
});

// POST /api/orders/import — bulk import past orders WITH refraction
router.post('/import', auth, async (req, res) => {
  const {
    customer_id, frame, frame_type, frame_material, frame_color,
    lens_type, lens_coating, lens_company, frame_sell_price, lens_sell_price,
    total_amount, advance_amount, balance_amount, deliver_date,
    status, notes, customer_own_frame, import_date, order_type,
    // Refraction fields
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
    const m = String(dateObj.getMonth()+1).padStart(2,'0');
    const countRes = await client.query(
      `SELECT COALESCE(MAX(CAST(SPLIT_PART(order_number,'-',3) AS INTEGER)),0) as maxseq
       FROM orders WHERE order_number LIKE $1`, [`KO-${y}${m}-%`]
    );
    const seq = parseInt(countRes.rows[0].maxseq) + 1;
    const order_number = `KO-${y}${m}-${String(seq).padStart(3,'0')}`;
    const importTs = import_date ? new Date(import_date + 'T12:00:00') : new Date();

    const total   = parseFloat(total_amount)   || 0;
    const advance = parseFloat(advance_amount) || total;
    const balance = Math.max(0, total - advance);

    const result = await client.query(`
      INSERT INTO orders (
        order_number, customer_id, frame, frame_type, frame_material, frame_color,
        lens_type, lens_coating, lens_company,
        total_amount, advance_amount, balance_amount, deliver_date,
        status, notes, has_rx, rx_hospital, rx_date, rx_doctor,
        created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$20)
      RETURNING *`,
      [order_number, customer_id,
       frame||'Frame', frame_type||'Full rim', frame_material||'Plastic', frame_color||'Black',
       lens_type||'Single Vision', lens_coating||'CR (White)', lens_company||null,
       total, advance, balance,
       deliver_date||import_date, status||'delivered',
       notes||'Imported from past records',
       has_rx||false, rx_hospital||null, rx_date||null, rx_doctor||null,
       importTs]
    );

    const orderId = result.rows[0].id;

    // ── Save refraction if provided ──────────────────────────
    const hasRx = r_sph || l_sph || r_cyl || l_cyl;
    if (hasRx) {
      await client.query(`
        INSERT INTO refractions
          (order_id, customer_id,
           r_sph, r_cyl, r_axis, r_add, r_va, r_pd,
           l_sph, l_cyl, l_axis, l_add, l_va, l_pd,
           notes, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      `, [
        orderId, customer_id,
        r_sph||null, r_cyl||null, r_axis||null, r_add||null, r_va||null, r_pd||null,
        l_sph||null, l_cyl||null, l_axis||null, l_add||null, l_va||null, l_pd||null,
        ref_notes||null, importTs,
      ]);
    }

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Import order error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally { client.release(); }
});

module.exports = router;