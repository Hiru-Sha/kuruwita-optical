// ============================================================
//  Orders Routes — /api/orders
//  Fixed: frame_material column, refraction save condition,
//         lens_company null handling
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
      `SELECT COUNT(*) FROM orders WHERE order_number LIKE $1`, [`KO-${y}${m}-%`]
    );
    const seq = parseInt(countRes.rows[0].count) + 1;
    return `KO-${y}${m}-${String(seq).padStart(3,'0')}`;
  }
  const res = await pool.query(
    "SELECT order_number FROM orders WHERE order_number ~ '^KO-[0-9]{4}$' ORDER BY id DESC LIMIT 1"
  );
  if (!res.rows.length) return 'KO-0001';
  const last = parseInt(res.rows[0].order_number.replace('KO-','')) || 0;
  return 'KO-' + String(last + 1).padStart(4, '0');
}

// GET /api/orders
router.get('/', auth, async (req, res) => {
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
      query += ` AND (
        c.name ILIKE $${params.length} OR
        c.phone ILIKE $${params.length} OR
        o.order_number ILIKE $${params.length} OR
        o.frame ILIKE $${params.length}
      )`;
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

// GET /api/orders/:id — with refraction + call logs
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await pool.query(`
      SELECT o.*, c.name AS customer_name, c.phone, c.age, c.address
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
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

    res.json({
      ...order.rows[0],
      refraction: refraction.rows[0] || null,
      call_logs:  callLogs.rows,
    });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /api/orders — create new order
router.post('/', auth, async (req, res) => {
  const {
    customer_id, frame, frame_type, frame_material,
    lens_type, lens_coating, lens_company,
    total_amount, advance_amount, deliver_date,
    status, has_rx, rx_hospital, rx_date, rx_doctor, notes,
    r_sph, r_cyl, r_axis, r_add, r_va, r_pd,
    l_sph, l_cyl, l_axis, l_add, l_va, l_pd,
    ref_notes,
    import_date, frame_color, frame_sell_price, lens_sell_price,
    frame_buy_price, lens_buy_price, discount_amount, payment_method,
    customer_own_frame, frame_inventory_id, lens_index,
    seg_height_r, seg_height_l,
    balance_amount: balance_override,
  } = req.body;

  if (!customer_id) return res.status(400).json({ error: 'customer_id is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const importTs  = import_date ? new Date(import_date + 'T12:00:00') : null;
    const orderNum  = await nextOrderNumber(import_date);
    const total     = parseFloat(total_amount)   || 0;
    const advance   = parseFloat(advance_amount) || 0;
    const balance   = balance_override !== undefined ? parseFloat(balance_override) : Math.max(0, total - advance);

    // Auto-create Old Stock inventory item if frame is free text (no inventory ID)
    let frameInventoryId = frame_inventory_id || null;
    if (!frameInventoryId && frame && !customer_own_frame && import_date) {
      try {
        const existing = await client.query(
          `SELECT id FROM inventory WHERE name ILIKE $1 AND category='Old Stock' LIMIT 1`,
          [frame.trim()]
        );
        if (existing.rows.length) {
          frameInventoryId = existing.rows[0].id;
          // Increment stock count
          await client.query(`UPDATE inventory SET quantity = quantity + 1 WHERE id = $1`, [frameInventoryId]);
        } else {
          const newItem = await client.query(`
            INSERT INTO inventory (name, category, frame_type, frame_color, sell_price, cost_price, quantity, brand, dealer)
            VALUES ($1, 'Old Stock', $2, $3, $4, $5, 0, '', 'Past stock')
            RETURNING id`,
            [frame.trim(), frame_type||'Full rim', frame_color||'Black',
             parseFloat(frame_sell_price)||0, parseFloat(frame_buy_price)||0]
          );
          frameInventoryId = newItem.rows[0].id;
        }
      } catch(e) {
        console.warn('Old Stock auto-create failed (non-critical):', e.message);
      }
    }

    // Check frame_material column exists (graceful fallback)
    let orderRes;
    try {
      orderRes = await client.query(`
        INSERT INTO orders (
          order_number, customer_id, frame, frame_type, frame_material,
          lens_type, lens_coating, lens_company,
          total_amount, advance_amount, balance_amount,
          deliver_date, status,
          has_rx, rx_hospital, rx_date, rx_doctor, notes
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        RETURNING *
      `, [
        orderNum, customer_id,
        frame || null, frame_type || null, frame_material || null,
        lens_type || null, lens_coating || null, lens_company || null,
        total, advance, balance,
        deliver_date || null, import_date ? 'delivered' : (status || 'created'),
        has_rx || false,
        rx_hospital || null, rx_date || null, rx_doctor || null,
        notes || null,
      ]);
      // Backdate created_at if past order
      if (importTs) {
        await client.query(`UPDATE orders SET created_at=$1, updated_at=$1 WHERE id=$2`,
          [importTs, orderRes.rows[0].id]);
      }
    } catch (colErr) {
      // frame_material column might not exist yet — fallback without it
      if (colErr.code === '42703') {
        orderRes = await client.query(`
          INSERT INTO orders (
            order_number, customer_id, frame, frame_type,
            lens_type, lens_coating, lens_company,
            total_amount, advance_amount, balance_amount,
            deliver_date, status,
            has_rx, rx_hospital, rx_date, rx_doctor, notes
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
          RETURNING *
        `, [
          orderNum, customer_id,
          frame || null, frame_type || null,
          lens_type || null, lens_coating || null, lens_company || null,
          total, advance, balance,
          deliver_date || null, status || 'created',
          has_rx || false,
          rx_hospital || null, rx_date || null, rx_doctor || null,
          notes || null,
        ]);
      } else throw colErr;
    }

    const orderId = orderRes.rows[0].id;

    // Save refraction — FIX: check any refraction field, not just r_sph/l_sph
    const hasRefraction = r_sph || l_sph || r_cyl || l_cyl;
    if (hasRefraction) {
      await client.query(`
        INSERT INTO refractions
          (order_id, customer_id,
           r_sph, r_cyl, r_axis, r_add, r_va, r_pd,
           l_sph, l_cyl, l_axis, l_add, l_va, l_pd,
           notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      `, [
        orderId, customer_id,
        r_sph || null, r_cyl || null, r_axis || null, r_add || null, r_va || null, r_pd || null,
        l_sph || null, l_cyl || null, l_axis || null, l_add || null, l_va || null, l_pd || null,
        ref_notes || null,
      ]);
    }

    await client.query('COMMIT');
    res.status(201).json({ ...orderRes.rows[0], order_number: orderNum });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order: ' + err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/orders/:id
router.patch('/:id', auth, async (req, res) => {
  const allowed = [
    'frame', 'frame_type', 'lens_type', 'lens_coating', 'lens_company', 'lens_step',
    'total_amount', 'advance_amount', 'balance_amount', 'deliver_date', 'status',
    'has_rx', 'rx_hospital', 'rx_date', 'rx_doctor', 'rx_returned', 'notes',
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
    console.error('Update order error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
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
  } catch (err) {
    console.error('Call log error:', err);
    res.status(500).json({ error: 'Failed to add call log' });
  }
});


// POST /api/orders/import — backdate an order for past records
router.post('/import', auth, async (req, res) => {
  const {
    customer_id, frame, frame_type, frame_material, frame_color,
    lens_type, lens_coating, frame_sell_price, lens_sell_price,
    total_amount, advance_amount, balance_amount, deliver_date,
    status, notes, customer_own_frame, import_date,
  } = req.body;

  if (!customer_id) return res.status(400).json({ error: 'customer_id required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const dateObj = new Date(import_date || Date.now());
    const y  = dateObj.getFullYear().toString().slice(2);
    const m  = String(dateObj.getMonth()+1).padStart(2,'0');
    const countRes = await client.query(
      `SELECT COUNT(*) FROM orders WHERE TO_CHAR(created_at,'YYMM') = $1`, [y+m]
    );
    const seq = parseInt(countRes.rows[0].count) + 1;
    const order_number = `KO-${y}${m}-${String(seq).padStart(3,'0')}`;
    const importTs = import_date ? new Date(import_date + 'T12:00:00') : new Date();

    const result = await client.query(`
      INSERT INTO orders (
        order_number, customer_id, frame, frame_type, frame_material, frame_color,
        lens_type, lens_coating, frame_sell_price, lens_sell_price,
        total_amount, advance_amount, balance_amount, deliver_date,
        status, notes, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)
      RETURNING *`,
      [order_number, customer_id,
       frame || 'Frame', frame_type || 'Full rim', frame_material || 'Plastic', frame_color || 'Black',
       lens_type || 'Single Vision', lens_coating || 'CR (White)',
       customer_own_frame ? 0 : (parseFloat(frame_sell_price)||0),
       parseFloat(lens_sell_price)||0, parseFloat(total_amount)||0,
       parseFloat(advance_amount)||0, parseFloat(balance_amount)||0,
       deliver_date || import_date, status || 'delivered',
       notes || 'Imported from past records', importTs]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Import order error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally { client.release(); }
});

module.exports = router;
