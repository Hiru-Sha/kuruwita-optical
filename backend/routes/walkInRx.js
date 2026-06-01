// ============================================================
//  Walk-in Rx Routes — /api/walkin-rx
//  Refraction-only records with no order attached
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// Table created via Supabase SQL migration — see README

// GET — list all walk-in Rx records
router.get('/', auth, async (req, res) => {
  try {
    const { search, follow_up } = req.query;
    let sql = `SELECT * FROM walkin_rx WHERE 1=1`;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (customer_name ILIKE $${params.length} OR phone ILIKE $${params.length})`;
    }
    if (follow_up === 'true') {
      sql += ` AND follow_up = true AND followed_up = false`;
    }
    sql += ` ORDER BY created_at DESC LIMIT 200`;
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST — create new walk-in Rx
router.post('/', auth, async (req, res) => {
  const {
    customer_name, phone, age,
    r_sph, r_cyl, r_axis, r_add, r_va, r_pd,
    l_sph, l_cyl, l_axis, l_add, l_va, l_pd,
    notes, quoted_frame, quoted_lens, quoted_price, follow_up,
  } = req.body;
  if (!customer_name?.trim()) return res.status(400).json({ error: 'Customer name required' });
  try {
    const result = await pool.query(`
      INSERT INTO walkin_rx (
        customer_name, phone, age,
        r_sph, r_cyl, r_axis, r_add, r_va, r_pd,
        l_sph, l_cyl, l_axis, l_add, l_va, l_pd,
        notes, quoted_frame, quoted_lens, quoted_price, follow_up, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING *`,
      [
        customer_name.trim(), phone||null, age||null,
        r_sph||null, r_cyl||null, r_axis||null, r_add||null, r_va||null, r_pd||null,
        l_sph||null, l_cyl||null, l_axis||null, l_add||null, l_va||null, l_pd||null,
        notes||null, quoted_frame||null, quoted_lens||null,
        quoted_price ? parseFloat(quoted_price) : null,
        follow_up||false, req.user.id,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PATCH — mark followed up or edit
router.patch('/:id', auth, async (req, res) => {
  const allowed = ['followed_up','follow_up','notes','quoted_price','quoted_frame','quoted_lens','phone'];
  const fields = [], vals = [];
  allowed.forEach(f => {
    if (req.body[f] !== undefined) {
      fields.push(`${f} = $${fields.length+1}`);
      vals.push(req.body[f]);
    }
  });
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  vals.push(req.params.id);
  try {
    const r = await pool.query(
      `UPDATE walkin_rx SET ${fields.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM walkin_rx WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;