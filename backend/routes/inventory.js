// ============================================================
//  Inventory Routes — /api/inventory
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/inventory
router.get('/', auth, async (req, res) => {
  const { search, category } = req.query;
  try {
    let query  = 'SELECT * FROM inventory WHERE 1=1';
    const params = [];
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR brand ILIKE $${params.length})`;
    }
    query += ' ORDER BY category, name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// POST /api/inventory
router.post('/', auth, async (req, res) => {
  const { name, brand, category, dealer, sell_price, cost_price, quantity, min_quantity, image_url } = req.body;
  if (!name) return res.status(400).json({ error: 'Item name required' });
  try {
    const result = await pool.query(
      `INSERT INTO inventory (name,brand,category,dealer,sell_price,cost_price,quantity,min_quantity,image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, brand||null, category||'Other', dealer||null,
       sell_price||0, cost_price||0, quantity||0, min_quantity||2, image_url||null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// PATCH /api/inventory/:id
router.patch('/:id', auth, async (req, res) => {
  const allowed = ['name','brand','category','dealer','sell_price','cost_price','quantity','min_quantity','image_url'];
  const fields = [], values = [];
  allowed.forEach(f => {
    if (req.body[f] !== undefined) {
      fields.push(`${f} = $${fields.length+1}`);
      values.push(req.body[f]);
    }
  });
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  fields.push('updated_at = NOW()');
  values.push(req.params.id);
  try {
    const result = await pool.query(
      `UPDATE inventory SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /api/inventory/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory WHERE id = $1', [req.params.id]);
    res.json({ message: 'Item removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
