// ============================================================
//  Lens Prices Routes — /api/lens-prices
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET — list with filters
router.get('/', auth, async (req, res) => {
  const { lens_type, brand, lens_index, color, search, active='true' } = req.query;
  try {
    let q = 'SELECT * FROM lens_prices WHERE 1=1';
    const p = [];
    if (active !== 'all') { p.push(active==='true'); q += ` AND active=$${p.length}`; }
    if (lens_type)  { p.push(lens_type);        q += ` AND lens_type=$${p.length}`; }
    if (brand)      { p.push(brand);             q += ` AND brand=$${p.length}`; }
    if (lens_index) { p.push(lens_index);        q += ` AND lens_index=$${p.length}`; }
    if (color)      { p.push(color);             q += ` AND color=$${p.length}`; }
    if (search) {
      p.push(`%${search}%`);
      q += ` AND (lens_type ILIKE $${p.length} OR brand ILIKE $${p.length} OR coating ILIKE $${p.length} OR series ILIKE $${p.length})`;
    }
    q += ' ORDER BY lens_type, brand, lens_index, color';
    res.json((await pool.query(q, p)).rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /match — best price match for an order
router.get('/match', auth, async (req, res) => {
  const { lens_type, lens_index, color, coating } = req.query;
  try {
    let q = `SELECT * FROM lens_prices WHERE active=true AND lens_type=$1`;
    const p = [lens_type];
    if (lens_index) { p.push(lens_index); q += ` AND lens_index=$${p.length}`; }
    if (color)      { p.push(`%${color}%`); q += ` AND color ILIKE $${p.length}`; }
    if (coating)    { p.push(`%${coating}%`); q += ` AND coating ILIKE $${p.length}`; }
    q += ' ORDER BY updated_at DESC LIMIT 5';
    res.json((await pool.query(q, p)).rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// POST /learn — auto-save price when manually entered in New Order
router.post('/learn', auth, async (req, res) => {
  const { brand, lens_type, lens_index, color, coating, buy_price, sell_price, power_range, notes } = req.body;
  if (!lens_type || !coating || !buy_price || !sell_price) return res.json({ ok: false });
  try {
    // Check if exact match exists — update it
    const existing = await pool.query(`
      SELECT id FROM lens_prices
      WHERE lens_type=$1 AND coating=$2
        AND (lens_index=$3 OR lens_index IS NULL)
        AND (color=$4 OR color IS NULL)
        AND (brand=$5 OR brand IS NULL)
        AND active=true
      LIMIT 1
    `, [lens_type, coating, lens_index||null, color||'White', brand||'Generic']);

    if (existing.rows.length > 0) {
      // Update existing entry with new prices
      await pool.query(`
        UPDATE lens_prices
        SET buy_price=$1, sell_price=$2, updated_at=NOW(), notes=$3
        WHERE id=$4
      `, [parseFloat(buy_price), parseFloat(sell_price), notes||null, existing.rows[0].id]);
      return res.json({ ok:true, action:'updated' });
    }

    // Create new entry
    await pool.query(`
      INSERT INTO lens_prices
        (brand, lens_type, lens_index, color, coating, buy_price, sell_price, power_range, notes, active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
    `, [
      brand||'Generic', lens_type, lens_index||null, color||'White',
      coating, parseFloat(buy_price), parseFloat(sell_price),
      power_range||null, notes||null,
    ]);
    res.json({ ok:true, action:'created' });
  } catch(e) { res.json({ ok:false, error:e.message }); }
});

// POST — add new price manually
router.post('/', auth, async (req, res) => {
  const { brand, lens_type, lens_index, color, coating, uv_cut, series, buy_price, sell_price, power_range, fitting_cost, code, notes } = req.body;
  if (!lens_type || !coating) return res.status(400).json({ error: 'Lens type and coating required' });
  try {
    const r = await pool.query(`
      INSERT INTO lens_prices
        (brand, lens_type, lens_index, color, coating, uv_cut, series, buy_price, sell_price, power_range, fitting_cost, code, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *
    `, [brand||'Generic', lens_type, lens_index||null, color||'White', coating,
        uv_cut||null, series||null, parseFloat(buy_price)||0, parseFloat(sell_price)||0,
        power_range||null, parseFloat(fitting_cost)||0, code||null, notes||null]);
    res.status(201).json(r.rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// PATCH — update
router.patch('/:id', auth, async (req, res) => {
  const allowed = ['brand','lens_type','lens_index','color','coating','uv_cut','series',
                   'buy_price','sell_price','power_range','fitting_cost','code','notes','active'];
  const fields=[], values=[];
  allowed.forEach(f=>{ if(req.body[f]!==undefined){ fields.push(`${f}=$${fields.length+1}`); values.push(req.body[f]); } });
  if (!fields.length) return res.status(400).json({ error:'Nothing to update' });
  fields.push('updated_at=NOW()'); values.push(req.params.id);
  try {
    const r = await pool.query(`UPDATE lens_prices SET ${fields.join(',')} WHERE id=$${values.length} RETURNING *`, values);
    res.json(r.rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// DELETE — soft delete
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('UPDATE lens_prices SET active=false WHERE id=$1', [req.params.id]);
    res.json({ ok:true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;