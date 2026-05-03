// ============================================================
//  Orders Routes — Integrated Inventory & Lab Progress
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// ---- Helper: generate next order number ----
async function nextOrderNumber() {
  const res = await pool.query(
    "SELECT order_number FROM orders ORDER BY id DESC LIMIT 1"
  );
  if (!res.rows.length) return 'KO-0001';
  const last = parseInt(res.rows[0].order_number.split('-')[1]);
  return 'KO-' + String(last + 1).padStart(4, '0');
}

// GET /api/orders — list all orders (with search & filter)
router.get('/', auth, async (req, res) => {
  const { search, status, limit = 50, offset = 0 } = req.query;
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
      query += ` AND (c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR o.order_number ILIKE $${params.length})`;
    }
    query += ` ORDER BY o.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id — single order with refraction & call logs
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await pool.query(`
      SELECT o.*, c.name AS customer_name, c.phone, c.age, c.address
      FROM orders o JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1`, [req.params.id]);
    if (!order.rows.length) return res.status(404).json({ error: 'Order not found' });

    const refraction = await pool.query(
      'SELECT * FROM refractions WHERE order_id = $1', [req.params.id]);
    const callLogs = await pool.query(
      'SELECT cl.*, u.full_name AS logged_by_name FROM call_logs cl LEFT JOIN users u ON cl.logged_by = u.id WHERE cl.order_id = $1 ORDER BY cl.created_at DESC',
      [req.params.id]);

    res.json({
      ...order.rows[0],
      refraction: refraction.rows[0] || null,
      call_logs: callLogs.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /api/orders — create new order & decrement inventory
router.post('/', auth, async (req, res) => {
  const {
    customer_id, inventory_id,
    frame, frame_type, lens_type, lens_coating,
    lens_company, total_amount, advance_amount, deliver_date,
    status, has_rx, rx_hospital, rx_date, rx_doctor, notes,
    r_sph, r_cyl, r_axis, r_add, r_va, r_pd,
    l_sph, l_cyl, l_axis, l_add, l_va, l_pd,
    ref_notes
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderNum   = await nextOrderNumber();
    const balance    = (parseFloat(total_amount)||0) - (parseFloat(advance_amount)||0);

    const orderRes = await client.query(`
      INSERT INTO orders
        (order_number, customer_id, inventory_id, frame, frame_type, lens_type, lens_coating,
         lens_company, total_amount, advance_amount, balance_amount,
         deliver_date, status, has_rx, rx_hospital, rx_date, rx_doctor, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *`,
      [orderNum, customer_id, inventory_id || null, frame, frame_type, lens_type, lens_coating,
       lens_company, total_amount||0, advance_amount||0, Math.max(0,balance),
       deliver_date, status||'created', has_rx||false,
       rx_hospital||null, rx_date||null, rx_doctor||null, notes||null]
    );

    const orderId = orderRes.rows[0].id;

    if (inventory_id) {
      const stockCheck = await client.query(
        'UPDATE inventory SET quantity = quantity - 1 WHERE id = $1 AND quantity > 0 RETURNING name',
        [inventory_id]
      );
      if (stockCheck.rowCount === 0) throw new Error('Selected frame is out of stock.');
    }

    if (r_sph || l_sph) {
      await client.query(`
        INSERT INTO refractions
          (order_id, customer_id, r_sph,r_cyl,r_axis,r_add,r_va,r_pd,
           l_sph,l_cyl,l_axis,l_add,l_va,l_pd,notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [orderId, customer_id, r_sph,r_cyl,r_axis,r_add,r_va,r_pd,
         l_sph,l_cyl,l_axis,l_add,l_va,l_pd, ref_notes||null]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ ...orderRes.rows[0], order_number: orderNum });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message || 'Failed to create order' });
  } finally {
    client.release();
  }
});

// PATCH /api/orders/:id — update fields & auto-recalculate balance
router.patch('/:id', auth, async (req, res) => {
  const allowed = [
    'frame','frame_type','lens_type','lens_coating','lens_company','lens_step',
    'total_amount','advance_amount','balance_amount','deliver_date','status',
    'has_rx','rx_hospital','rx_date','rx_doctor','rx_returned','notes', 'inventory_id'
  ];
  
  const fields = [], values = [];
  allowed.forEach(f => {
    if (req.body[f] !== undefined) {
      fields.push(`${f} = $${fields.length + 1}`);
      values.push(req.body[f]);
    }
  });

  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE orders SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });

    const order = result.rows[0];
    const newBalance = Math.max(0, (parseFloat(order.total_amount)||0) - (parseFloat(order.advance_amount)||0));
    
    const finalUpdate = await pool.query(
      `UPDATE orders SET balance_amount = $1 WHERE id = $2 RETURNING *`,
      [newBalance, req.params.id]
    );

    res.json(finalUpdate.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// NEW: Lab Progress Step Update Route (Phase 3)
router.patch('/:id/step', auth, async (req, res) => {
  const { step } = req.body; // 1: Sent, 2: Processing, 3: Ready
  if (step === undefined) return res.status(400).json({ error: 'Step is required' });
  
  try {
    let query = 'UPDATE orders SET lens_step = $1';
    const params = [step, req.params.id];

    // If marking as Ready (Step 3), set the received date
    if (parseInt(step) === 3) {
      query += ', lab_received_date = NOW()';
    } 
    // If marking as Sent (Step 1), set the sent date
    else if (parseInt(step) === 1) {
      query += ', lab_sent_date = NOW()';
    }

    query += ' WHERE id = $2 RETURNING *';
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lab step' });
  }
});

// QUICK STATUS UPDATE
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });
  
  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// POST /api/orders/:id/calllogs
router.post('/:id/calllogs', auth, async (req, res) => {
  const { note } = req.body;
  if (!note) return res.status(400).json({ note: 'Note is required' });
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

// GET /api/orders/lab-queue
router.get('/lab-queue', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, c.name AS customer_name, c.phone 
      FROM orders o 
      JOIN customers c ON o.customer_id = c.id
      WHERE o.lens_company IN ('Negombo Optical', 'Solex Optical') 
      AND o.lens_step = 0 
      ORDER BY o.lens_company, o.created_at ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lab queue' });
  }
});

module.exports = router;