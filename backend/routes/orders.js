// ============================================================
//  Orders Routes — FIXED: reduces inventory stock on new order
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

async function nextOrderNumber() {
  const res = await pool.query("SELECT order_number FROM orders ORDER BY id DESC LIMIT 1");
  if (!res.rows.length) return 'KO-0001';
  const last = parseInt(res.rows[0].order_number.split('-')[1]);
  return 'KO-' + String(last + 1).padStart(4, '0');
}

router.get('/', auth, async (req, res) => {
  const { search, status, limit = 100, offset = 0 } = req.query;
  try {
    let query = `SELECT o.*, c.name AS customer_name, c.phone, c.age FROM orders o JOIN customers c ON o.customer_id = c.id WHERE 1=1`;
    const params = [];
    if (status && status !== 'all') { params.push(status); query += ` AND o.status = $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR o.order_number ILIKE $${params.length} OR o.frame ILIKE $${params.length})`;
    }
    query += ` ORDER BY o.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);
    res.json((await pool.query(query, params)).rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch orders' }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const order = await pool.query(`SELECT o.*, c.name AS customer_name, c.phone, c.age, c.address FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.id = $1`, [req.params.id]);
    if (!order.rows.length) return res.status(404).json({ error: 'Not found' });
    const [ref, logs] = await Promise.all([
      pool.query('SELECT * FROM refractions WHERE order_id = $1', [req.params.id]),
      pool.query(`SELECT cl.*, u.full_name AS logged_by_name FROM call_logs cl LEFT JOIN users u ON cl.logged_by = u.id WHERE cl.order_id = $1 ORDER BY cl.created_at DESC`, [req.params.id]),
    ]);
    res.json({ ...order.rows[0], refraction: ref.rows[0]||null, call_logs: logs.rows });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/', auth, async (req, res) => {
  const {
    customer_id, frame, frame_type, frame_material, frame_color,
    lens_type, lens_coating, lens_index, lens_company,
    frame_buy_price, frame_sell_price, lens_buy_price, lens_sell_price,
    total_amount, advance_amount, deliver_date, status,
    has_rx, rx_hospital, rx_date, rx_doctor, notes,
    seg_height_r, seg_height_l,
    r_sph, r_cyl, r_axis, r_add, r_va, r_pd,
    l_sph, l_cyl, l_axis, l_add, l_va, l_pd, ref_notes,
    frame_inventory_id,  // ← used to reduce stock
  } = req.body;

  if (!customer_id) return res.status(400).json({ error: 'customer_id required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderNum = await nextOrderNumber();
    const total    = parseFloat(total_amount)   || 0;
    const advance  = parseFloat(advance_amount) || 0;
    const balance  = Math.max(0, total - advance);

    const orderRes = await client.query(`
      INSERT INTO orders (
        order_number, customer_id, frame, frame_type, frame_material, frame_color,
        lens_type, lens_coating, lens_company,
        frame_buy_price, frame_sell_price, lens_buy_price, lens_sell_price,
        total_amount, advance_amount, balance_amount,
        deliver_date, status, has_rx, rx_hospital, rx_date, rx_doctor, notes,
        seg_height_r, seg_height_l
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
      RETURNING *
    `, [
      orderNum, customer_id,
      frame||null, frame_type||null, frame_material||null, frame_color||null,
      lens_type||null, lens_coating||null, lens_company||null,
      parseFloat(frame_buy_price)||0, parseFloat(frame_sell_price)||0,
      parseFloat(lens_buy_price)||0,  parseFloat(lens_sell_price)||0,
      total, advance, balance,
      deliver_date||null, status||'created',
      has_rx||false, rx_hospital||null, rx_date||null, rx_doctor||null, notes||null,
      seg_height_r||null, seg_height_l||null,
    ]);

    const orderId = orderRes.rows[0].id;

    // Save refraction
    if (r_sph || l_sph || r_cyl || l_cyl) {
      await client.query(`
        INSERT INTO refractions (order_id, customer_id, r_sph,r_cyl,r_axis,r_add,r_va,r_pd,l_sph,l_cyl,l_axis,l_add,l_va,l_pd,notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      `, [orderId, customer_id,
          r_sph||null,r_cyl||null,r_axis||null,r_add||null,r_va||null,r_pd||null,
          l_sph||null,l_cyl||null,l_axis||null,l_add||null,l_va||null,l_pd||null,ref_notes||null]);
    }

    // ── Reduce inventory stock if frame was picked from stock ──
    if (frame_inventory_id) {
      await client.query(
        'UPDATE inventory SET quantity = GREATEST(0, quantity - 1) WHERE id = $1',
        [frame_inventory_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ ...orderRes.rows[0], order_number: orderNum });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally { client.release(); }
});

router.patch('/:id', auth, async (req, res) => {
  const allowed = ['frame','frame_type','lens_type','lens_coating','lens_company','lens_step','frame_buy_price','frame_sell_price','lens_buy_price','lens_sell_price','total_amount','advance_amount','balance_amount','deliver_date','status','has_rx','rx_hospital','rx_date','rx_doctor','rx_returned','notes'];
  const fields = [], values = [];
  allowed.forEach(f => { if (req.body[f] !== undefined) { fields.push(`${f} = $${fields.length+1}`); values.push(req.body[f]); } });
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  fields.push('updated_at = NOW()');
  values.push(req.params.id);
  try {
    const r = await pool.query(`UPDATE orders SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/:id', auth, async (req, res) => {
  try { await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]); res.json({ message: 'Deleted' }); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/:id/calllogs', auth, async (req, res) => {
  const { note } = req.body;
  if (!note) return res.status(400).json({ error: 'Note required' });
  try {
    const r = await pool.query('INSERT INTO call_logs (order_id, note, logged_by) VALUES ($1,$2,$3) RETURNING *', [req.params.id, note, req.user.id]);
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
