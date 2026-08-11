// ============================================================
//  Lens Prices Routes — /api/lens-prices
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/lens-prices — list with filters
router.get('/', auth, async (req, res) => {
  const { lens_type, brand, lens_index, color, search, active = 'true' } = req.query;
  try {
    let query = 'SELECT * FROM lens_prices WHERE 1=1';
    const params = [];

    if (active !== 'all') {
      params.push(active === 'true');
      query += ` AND active = $${params.length}`;
    }
    if (lens_type) { params.push(lens_type); query += ` AND lens_type = $${params.length}`; }
    if (brand)     { params.push(brand);     query += ` AND brand = $${params.length}`;     }
    if (lens_index)     { params.push(lens_index);     query += ` AND lens_index = $${params.length}`;     }
    if (color)     { params.push(color);     query += ` AND color = $${params.length}`;     }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (lens_type ILIKE $${params.length} OR brand ILIKE $${params.length} OR coating ILIKE $${params.length} OR series ILIKE $${params.length} OR code ILIKE $${params.length})`;
    }

    params.push(parseInt(req.query.limit) || 2000);
    query += ` ORDER BY lens_type, brand, lens_index, color, series LIMIT $${params.length}`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch lens prices' });
  }
});

// GET /api/lens-prices/match — find best price match for an order
router.get('/match', auth, async (req, res) => {
  const { lens_type, lens_index, color, coating, series } = req.query;
  try {
    let query = `
      SELECT * FROM lens_prices
      WHERE active = true
        AND lens_type = $1
    `;
    const params = [lens_type];

    if (lens_index) { params.push(lens_index); query += ` AND lens_index = $${params.length}`; }
    if (color) { params.push(color); query += ` AND color ILIKE $${params.length}`; }

    // Try to match coating
    if (coating) {
      params.push(`%${coating}%`);
      query += ` AND coating ILIKE $${params.length}`;
    }

    if (series) {
      params.push(series);
      query += ` AND series = $${params.length}`;
    }

    query += ' ORDER BY buy_price ASC LIMIT 5';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to match lens price' });
  }
});

// POST /api/lens-prices — add new lens price
router.post('/', auth, async (req, res) => {
  const { brand, lens_type, lens_index, color, coating, uv_cut, series, buy_price, sell_price, power_range, fitting_cost, code, notes } = req.body;
  if (!brand || !lens_type || !lens_index || !color || !coating) {
    return res.status(400).json({ error: 'Brand, lens type, lens_index, color and coating are required' });
  }
  try {
    const result = await pool.query(`
      INSERT INTO lens_prices (brand, lens_type, lens_index, color, coating, uv_cut, series, buy_price, sell_price, power_range, fitting_cost, code, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `, [brand, lens_type, lens_index, color, coating, uv_cut||null, series||null, parseFloat(buy_price)||0, parseFloat(sell_price)||0, power_range||null, parseFloat(fitting_cost)||0, code||null, notes||null]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add lens price' });
  }
});

// PATCH /api/lens-prices/:id — update
router.patch('/:id', auth, async (req, res) => {
  const allowed = ['brand','lens_type','lens_index','color','coating','uv_cut','series','buy_price','sell_price','power_range','fitting_cost','code','notes','active'];
  const fields = [], values = [];
  allowed.forEach(f => { if (req.body[f] !== undefined) { fields.push(`${f} = $${fields.length+1}`); values.push(req.body[f]); } });
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  fields.push('updated_at = NOW()');
  values.push(req.params.id);
  try {
    const result = await pool.query(`UPDATE lens_prices SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lens price' });
  }
});

// DELETE /api/lens-prices/:id — soft delete (set active=false)
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('UPDATE lens_prices SET active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Lens price deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// POST /api/lens-prices/learn — auto-save price from order
router.post('/learn', auth, async (req, res) => {
  const { brand, lens_type, lens_index, color, coating, buy_price, sell_price, power_range, notes } = req.body;
  if (!lens_type || !buy_price || !sell_price) return res.status(400).json({ error: 'Missing fields' });
  try {
    // Check if this exact combination already exists
    const existing = await pool.query(`
      SELECT id FROM lens_prices
      WHERE active = true
        AND lens_type = $1
        AND COALESCE(lens_index,'') = COALESCE($2,'')
        AND LOWER(COALESCE(color,'white')) = LOWER(COALESCE($3,'white'))
        AND LOWER(COALESCE(coating,'')) = LOWER(COALESCE($4,''))
        AND COALESCE(brand,'') = COALESCE($5,'')
      LIMIT 1
    `, [lens_type, lens_index||null, color||'White', coating||'', brand||'']);

    if (existing.rows.length > 0) {
      // Update existing price
      await pool.query(`
        UPDATE lens_prices
        SET buy_price = $1, sell_price = $2, updated_at = NOW()
        WHERE id = $3
      `, [parseFloat(buy_price), parseFloat(sell_price), existing.rows[0].id]);
      return res.json({ updated: true, id: existing.rows[0].id });
    }

    // Insert new price
    const result = await pool.query(`
      INSERT INTO lens_prices (brand, lens_type, lens_index, color, coating, buy_price, sell_price, power_range, notes, active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true) RETURNING id
    `, [brand||'Generic', lens_type, lens_index||null, color||'White', coating||'',
        parseFloat(buy_price), parseFloat(sell_price), power_range||null, notes||'Auto-learned from order']);

    res.json({ created: true, id: result.rows[0].id });
  } catch (err) {
    console.error('Lens price learn error:', err.message);
    res.status(500).json({ error: 'Failed to save lens price' });
  }
});

module.exports = router;