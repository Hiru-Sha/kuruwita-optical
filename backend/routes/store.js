// ============================================================
//  Store API Routes — /api/store
//  Public routes (no auth) for the e-commerce frontend
//  Add to existing Railway backend: app.use('/api/store', require('./routes/store'))
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool'); // same pool as management system

// ── GET /api/store/products ──────────────────────────────────
// Public product list — only items with stock and image
router.get('/products', async (req, res) => {
  const { category, search, sort = 'name', min_price, max_price, limit = 60, offset = 0 } = req.query;
  try {
    let sql = `
      SELECT
        id, name, category, brand, dealer,
        frame_type, frame_color, frame_shape, frame_material, frame_size,
        sell_price AS price, cost_price,
        quantity AS stock,
        image_url,
        display_number, stock_number,
        created_at
      FROM inventory
      WHERE quantity > 0
        AND sell_price > 0
        AND image_url IS NOT NULL
        AND image_url != ''
        AND category IN ('Frames','Sunglasses','Reading Glasses','Contact Lenses','Accessories')
    `;
    const params = [];

    if (category && category !== 'All') {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $${params.length} OR brand ILIKE $${params.length} OR frame_color ILIKE $${params.length})`;
    }
    if (min_price) {
      params.push(parseFloat(min_price));
      sql += ` AND sell_price >= $${params.length}`;
    }
    if (max_price) {
      params.push(parseFloat(max_price));
      sql += ` AND sell_price <= $${params.length}`;
    }

    const orderMap = {
      name:       'name ASC',
      price_asc:  'sell_price ASC',
      price_desc: 'sell_price DESC',
      newest:     'created_at DESC',
      popular:    'name ASC',
    };
    sql += ` ORDER BY ${orderMap[sort] || 'name ASC'}`;
    params.push(parseInt(limit), parseInt(offset));
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(sql, params);

    // Total count for pagination
    let countSql = `SELECT COUNT(*) AS total FROM inventory WHERE quantity > 0 AND sell_price > 0 AND image_url IS NOT NULL AND image_url != '' AND category IN ('Frames','Sunglasses','Reading Glasses','Contact Lenses','Accessories')`;
    const countParams = [];
    if (category && category !== 'All') { countParams.push(category); countSql += ` AND category = $${countParams.length}`; }
    if (search) { countParams.push(`%${search}%`); countSql += ` AND (name ILIKE $${countParams.length} OR brand ILIKE $${countParams.length})`; }
    const countRes = await pool.query(countSql, countParams);

    res.json({
      products: result.rows,
      total:    parseInt(countRes.rows[0].total),
      limit:    parseInt(limit),
      offset:   parseInt(offset),
    });
  } catch (err) {
    console.error('Store products error:', err.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ── GET /api/store/products/:id ──────────────────────────────
router.get('/products/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, category, brand, dealer,
              frame_type, frame_color, frame_shape, frame_material, frame_size,
              sell_price AS price, quantity AS stock,
              image_url, display_number, stock_number, created_at
       FROM inventory WHERE id = $1 AND quantity > 0`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });

    // Related products (same category, different item)
    const related = await pool.query(
      `SELECT id, name, sell_price AS price, image_url, frame_color, category
       FROM inventory
       WHERE category = $1 AND id != $2 AND quantity > 0 AND image_url IS NOT NULL AND sell_price > 0
       ORDER BY RANDOM() LIMIT 4`,
      [result.rows[0].category, req.params.id]
    );

    res.json({ product: result.rows[0], related: related.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ── GET /api/store/categories ────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT category,
             COUNT(*) AS product_count,
             MIN(sell_price) AS min_price,
             MAX(sell_price) AS max_price
      FROM inventory
      WHERE quantity > 0 AND sell_price > 0
        AND image_url IS NOT NULL AND image_url != ''
        AND category IN ('Frames','Sunglasses','Reading Glasses','Contact Lenses','Accessories')
      GROUP BY category
      ORDER BY product_count DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── POST /api/store/orders ───────────────────────────────────
// Place an online order — saves to management system
router.post('/orders', async (req, res) => {
  const {
    customer_name, customer_phone, customer_email, customer_address,
    items, total_amount, payment_method, payment_ref,
    notes, delivery_type, // 'pickup' | 'delivery'
  } = req.body;

  if (!customer_name || !customer_phone || !items?.length) {
    return res.status(400).json({ error: 'Name, phone and items required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find or create customer
    let custId;
    const existing = await client.query(
      'SELECT id FROM customers WHERE phone = $1 LIMIT 1',
      [customer_phone]
    );
    if (existing.rows.length) {
      custId = existing.rows[0].id;
    } else {
      const newCust = await client.query(
        'INSERT INTO customers (name, phone, email, address) VALUES ($1,$2,$3,$4) RETURNING id',
        [customer_name, customer_phone, customer_email || null, customer_address || null]
      );
      custId = newCust.rows[0].id;
    }

    // Generate online order number OL-YYYYMMDD-XXX
    const d   = new Date();
    const ds  = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const cnt = await client.query(
      `SELECT COUNT(*) AS c FROM store_orders WHERE TO_CHAR(created_at,'YYYYMMDD')=$1`, [ds]
    ).catch(() => ({ rows: [{ c: 0 }] }));
    const seq    = parseInt(cnt.rows[0].c) + 1;
    const orderNum = `OL-${ds}-${String(seq).padStart(3,'0')}`;

    // Save to store_orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS store_orders (
        id               SERIAL PRIMARY KEY,
        order_number     VARCHAR(30) UNIQUE,
        customer_id      INTEGER,
        customer_name    VARCHAR(100),
        customer_phone   VARCHAR(20),
        customer_email   VARCHAR(100),
        customer_address TEXT,
        items            JSONB,
        total_amount     DECIMAL(10,2),
        payment_method   VARCHAR(30) DEFAULT 'cod',
        payment_ref      VARCHAR(100),
        payment_status   VARCHAR(20) DEFAULT 'pending',
        delivery_type    VARCHAR(20) DEFAULT 'pickup',
        order_status     VARCHAR(20) DEFAULT 'new',
        notes            TEXT,
        created_at       TIMESTAMP DEFAULT NOW()
      )
    `);

    const storeOrder = await client.query(`
      INSERT INTO store_orders
        (order_number, customer_id, customer_name, customer_phone, customer_email,
         customer_address, items, total_amount, payment_method, payment_ref,
         delivery_type, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        orderNum, custId, customer_name, customer_phone,
        customer_email || null, customer_address || null,
        JSON.stringify(items), parseFloat(total_amount),
        payment_method || 'cod', payment_ref || null,
        delivery_type || 'pickup', notes || null,
      ]
    );

    await client.query('COMMIT');

    // Send WhatsApp notification URL (for shop owner)
    const itemsList = items.map(i => `• ${i.name} ×${i.qty} — Rs.${(i.price*i.qty).toLocaleString()}`).join('\n');
    const waMsg = encodeURIComponent(
      `🛒 New Online Order!\n\n` +
      `Order: ${orderNum}\n` +
      `Customer: ${customer_name}\n` +
      `Phone: ${customer_phone}\n` +
      `Items:\n${itemsList}\n` +
      `Total: Rs.${parseFloat(total_amount).toLocaleString()}\n` +
      `Payment: ${payment_method}\n` +
      `Delivery: ${delivery_type}`
    );

    res.status(201).json({
      order:     storeOrder.rows[0],
      order_number: orderNum,
      wa_notify: `https://wa.me/94322221211?text=${waMsg}`,
      message:   'Order placed successfully!',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Store order error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally {
    client.release();
  }
});

// ── GET /api/store/orders/:order_number ─────────────────────
// Public order tracking
router.get('/orders/:order_number', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM store_orders WHERE order_number = $1',
      [req.params.order_number]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    const o = result.rows[0];
    res.json({
      order_number:   o.order_number,
      customer_name:  o.customer_name,
      order_status:   o.order_status,
      payment_status: o.payment_status,
      payment_method: o.payment_method,
      delivery_type:  o.delivery_type,
      total_amount:   o.total_amount,
      items:          typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
      created_at:     o.created_at,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── GET /api/store/featured ──────────────────────────────────
router.get('/featured', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, category, brand, frame_color,
             sell_price AS price, quantity AS stock, image_url
      FROM inventory
      WHERE quantity > 0 AND sell_price > 0
        AND image_url IS NOT NULL AND image_url != ''
        AND category IN ('Frames','Sunglasses','Reading Glasses')
      ORDER BY created_at DESC
      LIMIT 8
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── PayHere payment notification (webhook) ───────────────────
router.post('/payhere/notify', async (req, res) => {
  const { merchant_id, order_id, payment_id, payhere_amount, payhere_currency, status_code, md5sig } = req.body;
  // status_code 2 = success
  if (status_code === '2') {
    await pool.query(
      `UPDATE store_orders SET payment_status='paid', payment_ref=$1, order_status='confirmed' WHERE order_number=$2`,
      [payment_id, order_id]
    ).catch(() => {});
  }
  res.send('OK');
});

module.exports = router;