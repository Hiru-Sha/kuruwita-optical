// ============================================================
//  Warranty Routes — /api/warranties
//  GET  /             — list all claims (filter: status, month)
//  GET  /check        — check warranty status by phone or order_id
//  GET  /stats        — dashboard counts
//  POST /             — log a new claim
//  PATCH /:id         — resolve / update a claim
//  DELETE /:id        — admin only: delete a claim
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// ── GET /api/warranties/stats ────────────────────────────────
router.get('/stats', auth, async (req, res) => {
  try {
    const [counts, monthly] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                            AS total,
          COUNT(CASE WHEN status='open'        THEN 1 END)   AS open,
          COUNT(CASE WHEN status='in_progress' THEN 1 END)   AS in_progress,
          COUNT(CASE WHEN status='resolved'    THEN 1 END)   AS resolved,
          COUNT(CASE WHEN status='rejected'    THEN 1 END)   AS rejected
        FROM warranty_claims
      `),
      pool.query(`
        SELECT
          COUNT(*)                                          AS total,
          COUNT(CASE WHEN status='open' THEN 1 END)         AS open
        FROM warranty_claims
        WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
      `),
    ]);
    res.json({ all: counts.rows[0], this_month: monthly.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/warranties/check ────────────────────────────────
// ?phone=07xxxxxxxx  OR  ?order_id=123
// Returns the order(s) with computed warranty status
router.get('/check', auth, async (req, res) => {
  const { phone, order_id } = req.query;
  if (!phone && !order_id) return res.status(400).json({ error: 'phone or order_id required' });
  try {
    let query, params;
    if (order_id) {
      query = `
        SELECT o.*, c.name AS customer_name, c.phone
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.id = $1
      `;
      params = [order_id];
    } else {
      const cleaned = phone.replace(/\D/g, '');
      query = `
        SELECT o.*, c.name AS customer_name, c.phone
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE c.phone ILIKE $1 OR c.phone ILIKE $2
        ORDER BY o.created_at DESC
        LIMIT 20
      `;
      params = [`%${cleaned}%`, `%${phone}%`];
    }

    const result = await pool.query(query, params);
    const today  = new Date();

    const orders = result.rows.map(o => {
      let warrantyStatus = 'none';
      let daysLeft       = null;

      if (o.warranty_enabled && o.warranty_months > 0) {
        const startDate  = o.warranty_start_date ? new Date(o.warranty_start_date) : new Date(o.created_at);
        const expiryDate = o.warranty_expiry
          ? new Date(o.warranty_expiry)
          : new Date(startDate.getFullYear(), startDate.getMonth() + o.warranty_months, startDate.getDate());

        if (today <= expiryDate) {
          warrantyStatus = 'active';
          daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        } else {
          warrantyStatus = 'expired';
        }
      }

      return { ...o, warranty_status: warrantyStatus, warranty_days_left: daysLeft };
    });

    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/warranties ──────────────────────────────────────
router.get('/', auth, async (req, res) => {
  const { status, month, limit = 100 } = req.query;
  try {
    let query = `
      SELECT wc.*,
             u.full_name AS handled_by_name,
             o.order_number,
             o.frame, o.lens_type, o.warranty_expiry, o.warranty_coverage,
             o.warranty_months
      FROM warranty_claims wc
      LEFT JOIN users u  ON wc.handled_by = u.id
      LEFT JOIN orders o ON wc.order_id   = o.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND wc.status = $${params.length}`;
    }
    if (month) {
      params.push(month);
      query += ` AND TO_CHAR(wc.created_at,'YYYY-MM') = $${params.length}`;
    }
    query += ` ORDER BY wc.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/warranties ─────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const {
    order_id, customer_name, customer_phone,
    claim_type, description,
    resolution_type, resolution_notes, charge_amount,
    status = 'open',
  } = req.body;

  if (!claim_type || !description) {
    return res.status(400).json({ error: 'claim_type and description are required' });
  }

  try {
    // If order_id provided, pull customer info automatically
    let custName  = customer_name;
    let custPhone = customer_phone;
    if (order_id && (!custName || !custPhone)) {
      const ord = await pool.query(`
        SELECT c.name, c.phone FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.id = $1`, [order_id]);
      if (ord.rows.length) {
        custName  = custName  || ord.rows[0].name;
        custPhone = custPhone || ord.rows[0].phone;
      }
    }

    const resolved = ['resolved','rejected'].includes(status);
    const result   = await pool.query(`
      INSERT INTO warranty_claims
        (order_id, customer_name, customer_phone,
         claim_type, description,
         resolution_type, resolution_notes, charge_amount,
         resolution_date, status, handled_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      order_id    || null,
      custName    || null,
      custPhone   || null,
      claim_type, description,
      resolution_type   || null,
      resolution_notes  || null,
      parseFloat(charge_amount) || 0,
      resolved ? new Date().toISOString().split('T')[0] : null,
      status,
      req.user.id,
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/warranties/:id ─────────────────────────────────
router.patch('/:id', auth, async (req, res) => {
  const allowed = [
    'claim_type','description',
    'resolution_type','resolution_notes','resolution_date',
    'charge_amount','status',
  ];
  const fields = [], values = [];
  allowed.forEach(f => {
    if (req.body[f] !== undefined) {
      fields.push(`${f} = $${fields.length + 1}`);
      values.push(req.body[f]);
    }
  });
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

  // Auto-set resolution_date when resolving
  if (req.body.status && ['resolved','rejected'].includes(req.body.status)) {
    fields.push(`resolution_date = $${fields.length + 1}`);
    values.push(new Date().toISOString().split('T')[0]);
  }
  fields.push('updated_at = NOW()');
  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE warranty_claims SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Claim not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/warranties/:id — admin only ──────────────────
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    await pool.query('DELETE FROM warranty_claims WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;