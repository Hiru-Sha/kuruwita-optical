// ============================================================
//  Store API Routes — /api/store
//  Full featured e-commerce backend:
//  - show_on_store toggle per item
//  - store-specific price, discount, description, extra images
//  - promo codes
//  - customer reviews
//  - WhatsApp notification on new order
//  - online orders management
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// ── GET /api/store/products ──────────────────────────────────
// Public — only items marked show_on_store = true
router.get('/products', async (req, res) => {
  const { category, search, sort = 'sort_order', min_price, max_price, limit = 60, offset = 0, tags } = req.query;
  try {
    let sql = `
      SELECT
        i.id, i.name, i.category, i.brand, i.frame_type, i.frame_color,
        i.frame_shape, i.frame_material, i.frame_size, i.quantity AS stock,
        i.image_url,
        COALESCE(sp.store_price, i.sell_price)            AS price,
        i.sell_price                                       AS original_price,
        sp.discount_pct, sp.discount_label, sp.description,
        sp.extra_images, sp.tags, sp.sort_order,
        CASE WHEN sp.discount_pct > 0
          THEN ROUND(COALESCE(sp.store_price, i.sell_price) * (1 - sp.discount_pct::DECIMAL/100), 2)
          ELSE COALESCE(sp.store_price, i.sell_price)
        END AS final_price,
        COALESCE(
          (SELECT ROUND(AVG(rating),1) FROM store_reviews
           WHERE inventory_id = i.id AND approved = TRUE), 0
        ) AS avg_rating,
        COALESCE(
          (SELECT COUNT(*) FROM store_reviews
           WHERE inventory_id = i.id AND approved = TRUE), 0
        ) AS review_count
      FROM inventory i
      JOIN store_products sp ON sp.inventory_id = i.id
      WHERE sp.show_on_store = TRUE
        AND i.quantity > 0
    `;
    const params = [];

    if (category && category !== 'All') {
      params.push(category);
      sql += ` AND i.category = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (i.name ILIKE $${params.length} OR i.brand ILIKE $${params.length} OR i.frame_color ILIKE $${params.length} OR sp.description ILIKE $${params.length})`;
    }
    if (min_price) { params.push(parseFloat(min_price)); sql += ` AND COALESCE(sp.store_price, i.sell_price) >= $${params.length}`; }
    if (max_price) { params.push(parseFloat(max_price)); sql += ` AND COALESCE(sp.store_price, i.sell_price) <= $${params.length}`; }
    if (tags)      { params.push(tags.split(',')); sql += ` AND sp.tags && $${params.length}`; }

    const orderMap = {
      sort_order:  'sp.sort_order ASC, i.name ASC',
      name:        'i.name ASC',
      price_asc:   'final_price ASC',
      price_desc:  'final_price DESC',
      newest:      'i.created_at DESC',
      discount:    'sp.discount_pct DESC',
      rating:      'avg_rating DESC',
    };
    sql += ` ORDER BY ${orderMap[sort] || 'sp.sort_order ASC, i.name ASC'}`;

    // Count query
    let countSql = `SELECT COUNT(*) AS total FROM inventory i JOIN store_products sp ON sp.inventory_id = i.id WHERE sp.show_on_store = TRUE AND i.quantity > 0`;
    const countParams = [];
    if (category && category !== 'All') { countParams.push(category); countSql += ` AND i.category = $${countParams.length}`; }
    if (search) { countParams.push(`%${search}%`); countSql += ` AND (i.name ILIKE $${countParams.length} OR i.brand ILIKE $${countParams.length})`; }
    const countRes = await pool.query(countSql, countParams);

    params.push(parseInt(limit), parseInt(offset));
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const result = await pool.query(sql, params);

    res.json({ products: result.rows, total: parseInt(countRes.rows[0].total), limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    console.error('Store products error:', err.message);
    res.status(500).json({ error: 'Failed' });
  }
});

// ── GET /api/store/products/:id ──────────────────────────────
router.get('/products/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, sp.store_price, sp.discount_pct, sp.discount_label,
             sp.description, sp.extra_images, sp.tags,
             COALESCE(sp.store_price, i.sell_price) AS price,
             i.sell_price AS original_price,
             CASE WHEN sp.discount_pct > 0
               THEN ROUND(COALESCE(sp.store_price, i.sell_price) * (1 - sp.discount_pct::DECIMAL/100), 2)
               ELSE COALESCE(sp.store_price, i.sell_price)
             END AS final_price,
             i.quantity AS stock
      FROM inventory i
      JOIN store_products sp ON sp.inventory_id = i.id
      WHERE i.id = $1 AND sp.show_on_store = TRUE AND i.quantity > 0
    `, [req.params.id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });

    const [related, reviews] = await Promise.all([
      pool.query(`
        SELECT i.id, i.name, i.image_url, i.frame_color, i.category,
               COALESCE(sp.store_price, i.sell_price) AS price,
               sp.discount_pct
        FROM inventory i JOIN store_products sp ON sp.inventory_id = i.id
        WHERE i.category = $1 AND i.id != $2
          AND sp.show_on_store = TRUE AND i.quantity > 0
        ORDER BY RANDOM() LIMIT 4
      `, [result.rows[0].category, req.params.id]),
      pool.query(`
        SELECT id, customer_name, rating, review_text, created_at
        FROM store_reviews
        WHERE inventory_id = $1 AND approved = TRUE
        ORDER BY created_at DESC LIMIT 10
      `, [req.params.id]),
    ]);

    res.json({ product: result.rows[0], related: related.rows, reviews: reviews.rows });
  } catch (err) {
    console.error('Product detail error:', err.message);
    res.status(500).json({ error: 'Failed' });
  }
});

// ── GET /api/store/featured ──────────────────────────────────
router.get('/featured', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.id, i.name, i.category, i.brand, i.frame_color, i.image_url,
             i.quantity AS stock,
             COALESCE(sp.store_price, i.sell_price) AS price,
             i.sell_price AS original_price,
             sp.discount_pct, sp.discount_label,
             CASE WHEN sp.discount_pct > 0
               THEN ROUND(COALESCE(sp.store_price, i.sell_price) * (1 - sp.discount_pct::DECIMAL/100), 2)
               ELSE COALESCE(sp.store_price, i.sell_price)
             END AS final_price
      FROM inventory i
      JOIN store_products sp ON sp.inventory_id = i.id
      WHERE sp.show_on_store = TRUE AND i.quantity > 0
        AND i.image_url IS NOT NULL
      ORDER BY sp.sort_order ASC, i.created_at DESC
      LIMIT 8
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── GET /api/store/categories ────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.category, COUNT(*) AS product_count,
             MIN(COALESCE(sp.store_price, i.sell_price)) AS min_price,
             MAX(COALESCE(sp.store_price, i.sell_price)) AS max_price
      FROM inventory i JOIN store_products sp ON sp.inventory_id = i.id
      WHERE sp.show_on_store = TRUE AND i.quantity > 0
      GROUP BY i.category ORDER BY product_count DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── POST /api/store/validate-promo ───────────────────────────
router.post('/validate-promo', async (req, res) => {
  const { code, order_total } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });
  try {
    const result = await pool.query(
      `SELECT * FROM promo_codes WHERE UPPER(code) = UPPER($1) AND active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (max_uses IS NULL OR used_count < max_uses)`, [code]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Invalid or expired promo code' });
    const promo = result.rows[0];
    if (parseFloat(order_total) < parseFloat(promo.min_order_amount)) {
      return res.status(400).json({ error: `Minimum order Rs. ${parseFloat(promo.min_order_amount).toLocaleString()} required` });
    }
    const discount = promo.discount_type === 'pct'
      ? Math.round(parseFloat(order_total) * promo.discount_value / 100 * 100) / 100
      : parseFloat(promo.discount_value);
    res.json({ valid: true, promo, discount, final_total: Math.max(0, parseFloat(order_total) - discount) });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── POST /api/store/orders ───────────────────────────────────
router.post('/orders', async (req, res) => {
  const { customer_name, customer_phone, customer_email, customer_address,
          items, total_amount, payment_method, notes, delivery_type,
          promo_code, discount_amount } = req.body;

  if (!customer_name || !customer_phone || !items?.length)
    return res.status(400).json({ error: 'Name, phone and items required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find or create customer
    let custId;
    const existing = await client.query('SELECT id FROM customers WHERE phone = $1 LIMIT 1', [customer_phone]);
    if (existing.rows.length) { custId = existing.rows[0].id; }
    else {
      const nc = await client.query(
        'INSERT INTO customers (name, phone, email, address) VALUES ($1,$2,$3,$4) RETURNING id',
        [customer_name, customer_phone, customer_email||null, customer_address||null]
      );
      custId = nc.rows[0].id;
    }

    // Order number
    const d  = new Date();
    const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const cnt = await client.query(`SELECT COUNT(*) AS c FROM store_orders WHERE TO_CHAR(created_at,'YYYYMMDD')=$1`, [ds])
      .catch(() => ({ rows: [{ c: 0 }] }));
    const orderNum = `OL-${ds}-${String(parseInt(cnt.rows[0].c)+1).padStart(3,'0')}`;

    // Apply promo if valid
    let finalDiscount = parseFloat(discount_amount) || 0;
    if (promo_code) {
      await client.query(`UPDATE promo_codes SET used_count = used_count + 1 WHERE UPPER(code) = UPPER($1)`, [promo_code]);
    }

    const storeOrder = await client.query(`
      INSERT INTO store_orders
        (order_number, customer_id, customer_name, customer_phone, customer_email,
         customer_address, items, total_amount, payment_method, delivery_type,
         notes, promo_code, discount_amount)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [orderNum, custId, customer_name, customer_phone, customer_email||null,
       customer_address||null, JSON.stringify(items), parseFloat(total_amount),
       payment_method||'cod', delivery_type||'pickup', notes||null,
       promo_code||null, finalDiscount]
    );

    await client.query('COMMIT');

    // WhatsApp notification URL for shop owner
    const itemsList = items.map(i => `• ${i.name} ×${i.qty} — Rs.${(i.final_price||i.price)*i.qty}`).join('\n');
    const waMsg = encodeURIComponent(
      `🛒 *New Online Order!*\n\n` +
      `📦 Order: ${orderNum}\n` +
      `👤 Customer: ${customer_name}\n` +
      `📞 Phone: ${customer_phone}\n` +
      `🚚 Delivery: ${delivery_type}\n` +
      `💳 Payment: ${payment_method}\n\n` +
      `Items:\n${itemsList}\n\n` +
      `${finalDiscount > 0 ? `🎟️ Promo: ${promo_code} (−Rs.${finalDiscount})\n` : ''}` +
      `💰 Total: Rs.${parseFloat(total_amount).toLocaleString()}`
    );

    res.status(201).json({
      order: storeOrder.rows[0],
      order_number: orderNum,
      wa_notify: `https://wa.me/94322221211?text=${waMsg}`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Store order error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally { client.release(); }
});

// ── GET /api/store/orders/:order_number ─────────────────────
router.get('/orders/:order_number', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM store_orders WHERE order_number = $1', [req.params.order_number]);
    if (!r.rows.length) return res.status(404).json({ error: 'Order not found' });
    const o = r.rows[0];
    res.json({ ...o, items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── POST /api/store/reviews ──────────────────────────────────
router.post('/reviews', async (req, res) => {
  const { inventory_id, customer_name, customer_phone, rating, review_text } = req.body;
  if (!inventory_id || !customer_name || !rating) return res.status(400).json({ error: 'Missing fields' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
  try {
    await pool.query(
      `INSERT INTO store_reviews (inventory_id, customer_name, customer_phone, rating, review_text)
       VALUES ($1,$2,$3,$4,$5)`,
      [inventory_id, customer_name, customer_phone||null, rating, review_text||null]
    );
    res.json({ message: 'Review submitted! It will appear after approval.' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── PayHere webhook ──────────────────────────────────────────
router.post('/payhere/notify', async (req, res) => {
  const { order_id, payment_id, status_code } = req.body;
  if (status_code === '2') {
    await pool.query(
      `UPDATE store_orders SET payment_status='paid', payment_ref=$1, order_status='confirmed' WHERE order_number=$2`,
      [payment_id, order_id]
    ).catch(() => {});
  }
  res.send('OK');
});

// ════════════════════════════════════════════════════════════
//  ADMIN ROUTES (require auth)
// ════════════════════════════════════════════════════════════

// ── GET /api/store/admin/products ───────────────────────────
// Paginated with search — no more loading 792 items at once
router.get('/admin/products', auth, async (req, res) => {
  const { search, filter, limit = 30, offset = 0 } = req.query;
  try {
    let where = `WHERE i.category IN ('Frames','Sunglasses','Reading Glasses','Contact Lenses','Accessories')`;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (i.name ILIKE $${params.length} OR i.brand ILIKE $${params.length} OR i.frame_color ILIKE $${params.length})`;
    }
    if (filter === 'shown')  where += ` AND sp.show_on_store = TRUE`;
    if (filter === 'hidden') where += ` AND (sp.show_on_store IS NULL OR sp.show_on_store = FALSE)`;

    const countRes = await pool.query(
      `SELECT COUNT(*) AS total FROM inventory i
       LEFT JOIN store_products sp ON sp.inventory_id = i.id ${where}`, params
    );

    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(`
      SELECT i.id, i.name, i.category, i.brand, i.frame_color, i.image_url,
             i.sell_price, i.quantity,
             sp.show_on_store, sp.store_price, sp.discount_pct, sp.discount_label,
             sp.description, sp.extra_images, sp.tags, sp.sort_order
      FROM inventory i
      LEFT JOIN store_products sp ON sp.inventory_id = i.id
      ${where}
      ORDER BY COALESCE(sp.show_on_store, FALSE) DESC, i.category, i.name
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    // Run counts in parallel
    const [shownRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS c FROM store_products WHERE show_on_store = TRUE`),
    ]);
    res.json({
      products: result.rows,
      total:    parseInt(countRes.rows[0].total),
      shown:    parseInt(shownRes.rows[0].c),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/store/admin/products/:id ─────────────────────
router.patch('/admin/products/:id', auth, async (req, res) => {
  const { show_on_store, store_price, discount_pct, discount_label,
          description, extra_images, tags, sort_order } = req.body;
  try {
    // Check if row exists first - safer than ON CONFLICT (avoids unique constraint issues)
    const existing = await pool.query(
      'SELECT id FROM store_products WHERE inventory_id = $1', [req.params.id]
    );
    const vals = [
      req.params.id,
      show_on_store ?? false,
      store_price   || null,
      parseInt(discount_pct)  || 0,
      discount_label          || null,
      description             || null,
      JSON.stringify(extra_images || []),
      tags || [],
      parseInt(sort_order) || 0,
    ];
    let result;
    if (existing.rows.length) {
      result = await pool.query(`
        UPDATE store_products SET
          show_on_store  = $2, store_price = $3, discount_pct = $4,
          discount_label = $5, description = $6, extra_images = $7,
          tags = $8, sort_order = $9, updated_at = NOW()
        WHERE inventory_id = $1 RETURNING *`, vals);
    } else {
      result = await pool.query(`
        INSERT INTO store_products
          (inventory_id, show_on_store, store_price, discount_pct, discount_label,
           description, extra_images, tags, sort_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, vals);
    }
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/store/admin/orders ──────────────────────────────
router.get('/admin/orders', auth, async (req, res) => {
  const { status, limit = 50 } = req.query;
  try {
    let sql = `SELECT * FROM store_orders WHERE 1=1`;
    const params = [];
    if (status && status !== 'all') { params.push(status); sql += ` AND order_status = $${params.length}`; }
    params.push(parseInt(limit));
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    const result = await pool.query(sql, params);
    res.json(result.rows.map(o => ({ ...o, items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/store/admin/orders/:id ───────────────────────
router.patch('/admin/orders/:id', auth, async (req, res) => {
  const { order_status, payment_status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE store_orders SET order_status=COALESCE($1,order_status), payment_status=COALESCE($2,payment_status) WHERE id=$3 RETURNING *`,
      [order_status||null, payment_status||null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/store/admin/reviews ────────────────────────────
router.get('/admin/reviews', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sr.*, i.name AS product_name FROM store_reviews sr
      JOIN inventory i ON i.id = sr.inventory_id
      ORDER BY sr.created_at DESC LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/store/admin/reviews/:id ──────────────────────
router.patch('/admin/reviews/:id', auth, async (req, res) => {
  const { approved } = req.body;
  try {
    await pool.query('UPDATE store_reviews SET approved=$1 WHERE id=$2', [approved, req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/store/admin/promo-codes ────────────────────────
router.get('/admin/promo-codes', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM promo_codes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/store/admin/promo-codes ───────────────────────
router.post('/admin/promo-codes', auth, async (req, res) => {
  const { code, description, discount_type, discount_value, min_order_amount, max_uses, expires_at } = req.body;
  if (!code || !discount_value) return res.status(400).json({ error: 'Code and discount required' });
  try {
    const result = await pool.query(
      `INSERT INTO promo_codes (code, description, discount_type, discount_value, min_order_amount, max_uses, expires_at)
       VALUES (UPPER($1),$2,$3,$4,$5,$6,$7) RETURNING *`,
      [code, description||null, discount_type||'pct', parseFloat(discount_value),
       parseFloat(min_order_amount)||0, max_uses||null, expires_at||null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Code already exists' });
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/store/admin/promo-codes/:id ──────────────────
router.patch('/admin/promo-codes/:id', auth, async (req, res) => {
  const { active } = req.body;
  try {
    await pool.query('UPDATE promo_codes SET active=$1 WHERE id=$2', [active, req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/store/admin/promo-codes/:id ─────────────────
router.delete('/admin/promo-codes/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM promo_codes WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;