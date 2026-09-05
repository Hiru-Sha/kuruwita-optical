const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

// ============================================================
// GET / - List quick sales
// ============================================================
router.get('/', auth, async (req, res) => {
  try {
    const limit  = parseInt(req.query.limit)  || 20;
    const offset = parseInt(req.query.offset) || 0;
    const search    = req.query.search    || '';
    const from_date = req.query.from_date || '';
    const to_date   = req.query.to_date   || '';

    let where = 'WHERE 1=1';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (sale_number ILIKE $${params.length} OR customer_name ILIKE $${params.length} OR customer_phone ILIKE $${params.length})`;
    }
    if (from_date) { params.push(from_date); where += ` AND created_at::date >= $${params.length}`; }
    if (to_date)   { params.push(to_date);   where += ` AND created_at::date <= $${params.length}`; }
    params.push(limit, offset);

    const [result, countRes] = await Promise.all([
      pool.query(
        `SELECT * FROM quick_sales ${where} ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) AS total FROM quick_sales ${where}`,
        params.slice(0, -2)
      ),
    ]);
    const total = parseInt(countRes.rows[0].total);

    const rows = result.rows.map((r) => ({
      ...r,
      items: (() => {
        try {
          return typeof r.items === 'object'
            ? r.items
            : JSON.parse(r.items || '[]');
        } catch (e) {
          return [];
        }
      })(),
    }));

    res.json({ data: rows, total, limit, offset });
  } catch (err) {
    console.error('Get quick sales error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /stats - Quick sales statistics
// ============================================================
router.get('/stats', auth, async (req, res) => {
  try {
    const [today, month] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(total), 0) AS total,
          COUNT(*) AS count
        FROM quick_sales
        WHERE created_at::date = CURRENT_DATE
      `),

      pool.query(`
        SELECT
          COALESCE(SUM(total), 0) AS total,
          COUNT(*) AS count
        FROM quick_sales
        WHERE DATE_TRUNC('month', created_at)
              = DATE_TRUNC('month', NOW())
      `),
    ]);

    res.json({
      today: today.rows[0],
      month: month.rows[0],
    });
  } catch (err) {
    console.error('Quick sales stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /:id - Get single quick sale
// ============================================================
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM quick_sales WHERE id = $1',
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Not found' });
    }

    const sale = result.rows[0];

    const items = (() => {
      try {
        return typeof sale.items === 'object'
          ? sale.items
          : JSON.parse(sale.items || '[]');
      } catch (e) {
        return [];
      }
    })();

    res.json({
      ...sale,
      items,
    });
  } catch (err) {
    console.error('Get quick sale error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST / - Create quick sale
// ============================================================
router.post('/', auth, async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_id,
      items,
      subtotal,
      discount,
      total,
      payment_method,
      amount_paid,
      change_given,
      notes,
      import_date,
    } = req.body;

    // ----------------------------------------------------------
    // Validate sale items
    // ----------------------------------------------------------
    const itemsArr = Array.isArray(items) ? items : [];

    // IMPORTANT:
    // Declare giftsArr BEFORE it is used anywhere below.
    const giftsArr = Array.isArray(req.body.gifts)
      ? req.body.gifts
      : [];

    if (!itemsArr.length) {
      return res.status(400).json({
        error: 'No items in sale',
      });
    }

    // ----------------------------------------------------------
    // Generate sale number: QS-0001
    const lastRes = await pool.query(
      `SELECT sale_number FROM quick_sales ORDER BY id DESC LIMIT 1`
    );
    let saleNum = 'QS-0001';
    if (lastRes.rows.length && lastRes.rows[0].sale_number) {
      const parts = lastRes.rows[0].sale_number.split('-');
      const last  = parseInt(parts[parts.length - 1]) || 0;
      saleNum = 'QS-' + String(last + 1).padStart(4, '0');
    }

    // ----------------------------------------------------------
    // Prepare sale date
    // ----------------------------------------------------------
    const saleDate = import_date || null;

    // ----------------------------------------------------------
    // Prepare notes
    // ----------------------------------------------------------
    const finalNotes = (() => {
      const gStr =
        giftsArr.length > 0
          ? `\nGifts given: ${giftsArr
              .map((g) => g.name)
              .filter(Boolean)
              .join(', ')}`
          : '';

      return ((notes || '') + gStr) || null;
    })();

    // ----------------------------------------------------------
    // Insert sale
    // ----------------------------------------------------------
    const result = await pool.query(
      `INSERT INTO quick_sales
        (
          sale_number,
          customer_name,
          customer_phone,
          items,
          subtotal,
          discount,
          total,
          payment_method,
          amount_paid,
          change_given,
          notes,
          served_by,
          created_at
        )
       VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          COALESCE($13::timestamp, NOW())
        )
       RETURNING *`,
      [
        saleNum,

        customer_name || null,

        customer_phone || null,

        JSON.stringify(itemsArr),

        parseFloat(subtotal) || 0,

        parseFloat(discount) || 0,

        parseFloat(total) || 0,

        payment_method || 'cash',

        parseFloat(amount_paid) || 0,

        parseFloat(change_given) || 0,

        finalNotes,

        req.user.id,

        saleDate,
      ]
    );

    const savedSale = result.rows[0];

    // ==========================================================
    // Deduct normal sale items from inventory
    // ==========================================================
    for (const item of itemsArr) {
      const invId =
        item.inventory_id ||
        item.inventoryId ||
        item.id;

      const qty =
        parseInt(item.qty) ||
        parseInt(item.quantity) ||
        1;

      if (!invId) {
        continue;
      }

      try {
        // Deduct inventory
        await pool.query(
          `UPDATE inventory
           SET
             quantity = GREATEST(0, quantity - $1),
             updated_at = NOW()
           WHERE id = $2`,
          [qty, invId]
        );

        // Log stock adjustment
        await pool.query(
          `INSERT INTO stock_adjustments
            (
              inventory_id,
              item_name,
              change_type,
              quantity_change,
              reason,
              notes,
              adjusted_by
            )
           VALUES
            (
              $1,
              $2,
              'remove',
              $3,
              'Quick Sale',
              $4,
              $5
            )`,
          [
            invId,
            item.name || 'Item',
            -qty,
            'Sale: ' + saleNum,
            req.user.id,
          ]
        ).catch(() => {});
      } catch (e) {
        console.warn(
          'Stock deduct failed:',
          e.message
        );
      }
    }

    // ==========================================================
    // Deduct FREE GIFT items from inventory
    // ==========================================================
    for (const gift of giftsArr) {
      if (!gift.id) {
        continue;
      }

      const giftQty =
        parseInt(gift.qty) ||
        parseInt(gift.quantity) ||
        1;

      try {
        // Deduct gift stock
        await pool.query(
          `UPDATE inventory
           SET
             quantity = GREATEST(0, quantity - $1),
             updated_at = NOW()
           WHERE id = $2`,
          [giftQty, gift.id]
        );

        // Log gift stock adjustment
        await pool.query(
          `INSERT INTO stock_adjustments
            (
              inventory_id,
              item_name,
              change_type,
              quantity_change,
              reason,
              notes,
              adjusted_by
            )
           VALUES
            (
              $1,
              $2,
              'remove',
              $3,
              'Quick Sale Gift',
              $4,
              $5
            )`,
          [
            gift.id,
            gift.name || 'Gift Item',
            -giftQty,
            `Free gift with Sale: ${saleNum}`,
            req.user.id,
          ]
        ).catch(() => {});
      } catch (e) {
        console.warn(
          'Gift stock deduct failed:',
          e.message
        );
      }
    }

    // ==========================================================
    // Auto bank deposit for non-cash payments
    //
    // Card payments:
    // 3% bank charge is deducted.
    // Net amount is stored as bank deposit.
    // ==========================================================
    const pm =
      (payment_method || 'cash').toLowerCase();

    const amt =
      parseFloat(total) || 0;

    if (
      (
        pm === 'bank' ||
        pm === 'card' ||
        pm === 'transfer'
      ) &&
      amt > 0
    ) {
      const CARD_CHARGE_RATE = 0.03;

      const cardCharge =
        pm === 'card'
          ? Math.round(
              amt *
                CARD_CHARGE_RATE *
                100
            ) / 100
          : 0;

      const netAmount =
        amt - cardCharge;

      const noteText =
        'Auto: Quick Sale ' +
        saleNum +
        (
          cardCharge > 0
            ? ` (Charged: Rs.${amt} | Bank fee 3%: Rs.${cardCharge} | Net: Rs.${netAmount})`
            : ''
        );

      await pool.query(
        `INSERT INTO cash_deposits
          (
            date,
            amount,
            bank_name,
            payment_type,
            notes,
            added_by
          )
         VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )`,
        [
          new Date()
            .toISOString()
            .split('T')[0],

          netAmount,

          'Pan Asia Bank',

          pm === 'card'
            ? 'card'
            : 'online',

          noteText,

          req.user.id,
        ]
      ).catch((e) => {
        console.warn(
          'Deposit failed:',
          e.message
        );
      });
    }

    // ==========================================================
    // Response
    // ==========================================================
    res.status(201).json({
      ...savedSale,
      sale_number: saleNum,
    });

  } catch (err) {
    console.error(
      'Quick sale error:',
      err
    );

    res.status(500).json({
      error: err.message,
    });
  }
});

// ============================================================
// DELETE /:id - Delete quick sale
// ============================================================
router.delete('/:id', auth, async (req, res) => {
  try {
    // ----------------------------------------------------------
    // Find sale
    // ----------------------------------------------------------
    const sale = await pool.query(
      'SELECT * FROM quick_sales WHERE id = $1',
      [req.params.id]
    );

    if (!sale.rows.length) {
      return res.status(404).json({
        error: 'Not found',
      });
    }

    const s = sale.rows[0];

    // ----------------------------------------------------------
    // Parse sale items
    // ----------------------------------------------------------
    const saleItems = (() => {
      try {
        return typeof s.items === 'object'
          ? s.items
          : JSON.parse(s.items || '[]');
      } catch (e) {
        return [];
      }
    })();

    // ----------------------------------------------------------
    // Restore normal sale inventory
    // ----------------------------------------------------------
    for (const item of saleItems) {
      const invId =
        item.inventory_id ||
        item.inventoryId ||
        item.id;

      const qty =
        parseInt(item.qty) ||
        parseInt(item.quantity) ||
        1;

      if (!invId) {
        continue;
      }

      try {
        await pool.query(
          `UPDATE inventory
           SET
             quantity = quantity + $1,
             updated_at = NOW()
           WHERE id = $2`,
          [qty, invId]
        );
      } catch (e) {
        console.warn(
          'Inventory restore failed:',
          e.message
        );
      }
    }

    // ----------------------------------------------------------
    // Delete sale
    // ----------------------------------------------------------
    await pool.query(
      'DELETE FROM quick_sales WHERE id = $1',
      [req.params.id]
    );

    res.json({
      message: 'Deleted',
    });

  } catch (err) {
    console.error(
      'Delete quick sale error:',
      err
    );

    res.status(500).json({
      error: err.message,
    });
  }
});

// ============================================================
// Export router
// ============================================================
module.exports = router;