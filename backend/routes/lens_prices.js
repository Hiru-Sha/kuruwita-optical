const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET all lens prices
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lens_prices WHERE is_active = TRUE ORDER BY lens_type, price_per_pair');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lens prices' });
  }
});

// POST new lens price
router.post('/', auth, async (req, res) => {
  const { lens_type, coating, brand, index_value, price_per_pair } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO lens_prices (lens_type, coating, brand, index_value, price_per_pair)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [lens_type, coating, brand, index_value, price_per_pair]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add lens price' });
  }
});

module.exports = router;