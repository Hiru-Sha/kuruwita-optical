// ============================================================
//  Kalutota Opticals Trade Account — /api/kalutota
//  With inventory auto-update and image storage
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/kalutota
router.get('/', auth, async (req, res) => {
  const { month, direction, status, limit = 200 } = req.query;
  try {
    let sql = `SELECT * FROM kalutota_transactions WHERE 1=1`;
    const params = [];
    if (month)                            { params.push(month);     sql += ` AND TO_CHAR(date,'YYYY-MM') = $${params.length}`; }
    if (direction && direction !== 'all') { params.push(direction); sql += ` AND direction = $${params.length}`; }
    if (status    && status    !== 'all') { params.push(status);    sql += ` AND payment_status = $${params.length}`; }
    params.push(parseInt(limit));
    sql += ` ORDER BY date DESC, created_at DESC LIMIT $${params.length}`;
    res.json((await pool.query(sql, params)).rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/kalutota/summary
router.get('/summary', auth, async (req, res) => {
  try {
    const r = (await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN direction='out' AND payment_status='pending'
          THEN total_amount-COALESCE(paid_amount,0) END),0) AS they_owe_you,
        COALESCE(SUM(CASE WHEN direction='in' AND payment_status='pending'
          THEN total_amount-COALESCE(paid_amount,0) END),0) AS you_owe_them,
        COALESCE(SUM(CASE WHEN direction='out' THEN total_amount END),0) AS total_out_value,
        COALESCE(SUM(CASE WHEN direction='in'  THEN total_amount END),0) AS total_in_value,
        COALESCE(SUM(CASE WHEN direction='out' THEN paid_amount  END),0) AS total_paid_by_them,
        COALESCE(SUM(CASE WHEN direction='in'  THEN paid_amount  END),0) AS total_paid_to_them,
        COUNT(CASE WHEN direction='out' AND payment_status='pending' THEN 1 END) AS pending_out_count,
        COUNT(CASE WHEN direction='in'  AND payment_status='pending' THEN 1 END) AS pending_in_count,
        COUNT(*) AS total_transactions
      FROM kalutota_transactions
    `)).rows[0];
    res.json({ ...r, net_balance: parseFloat(r.they_owe_you)-parseFloat(r.you_owe_them) });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /api/kalutota
router.post('/', auth, async (req, res) => {
  const {
    date, direction, category, description, quantity, unit_price,
    payment_status, paid_amount, paid_date, payment_method, notes,
    image_url,            // base64 image
    update_inventory,     // boolean
    inventory_item_name,  // may differ from description
  } = req.body;

  if (!direction || !description || !quantity || unit_price === undefined)
    return res.status(400).json({ error: 'direction, description, quantity and unit_price required' });

  const total_amount = parseFloat(unit_price) * parseInt(quantity);
  const client = await pool.connect();
  let inventoryResult = null;

  try {
    await client.query('BEGIN');

    // Save transaction
    const tx = (await client.query(`
      INSERT INTO kalutota_transactions
        (date,direction,category,description,quantity,unit_price,total_amount,
         payment_status,paid_amount,paid_date,payment_method,notes,image_url,added_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [date||new Date().toISOString().split('T')[0], direction, category||null,
       description, parseInt(quantity), parseFloat(unit_price), total_amount,
       payment_status||'pending', parseFloat(paid_amount)||0,
       paid_date||null, payment_method||'cash', notes||null,
       image_url||null, req.user.id]
    )).rows[0];

    // Auto-update inventory
    if (update_inventory) {
      const itemName = (inventory_item_name||description).trim();
      const qty      = parseInt(quantity);
      const cat      = category||'Old Stock';

      const existing = (await client.query(
        `SELECT id, quantity FROM inventory WHERE name ILIKE $1 LIMIT 1`, [itemName]
      )).rows;

      if (existing.length) {
        const invId  = existing[0].id;
        const oldQty = parseInt(existing[0].quantity);
        const newQty = direction==='out' ? Math.max(0,oldQty-qty) : oldQty+qty;

        const updFields = image_url
          ? `quantity=$1, image_url=$3, updated_at=NOW()`
          : `quantity=$1, updated_at=NOW()`;
        const updParams = image_url ? [newQty, invId, image_url] : [newQty, invId];
        const updItem = (await client.query(
          `UPDATE inventory SET ${updFields} WHERE id=$2 RETURNING *`, updParams
        )).rows[0];

        // Log stock adjustment
        await client.query(`
          INSERT INTO stock_adjustments
            (inventory_id,item_name,change_type,quantity_change,quantity_before,quantity_after,reason,adjusted_by_name)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [invId, itemName,
           direction==='out'?'remove':'add',
           direction==='out'?-qty:qty,
           oldQty, newQty,
           direction==='out'?'Given to Kalutota Opticals':'Received from Kalutota Opticals',
           req.user.name||req.user.username]
        );
        inventoryResult = { action:'updated', item:updItem, old_qty:oldQty, new_qty:newQty };

      } else if (direction==='in') {
        // Create new inventory item when receiving stock
        const newItem = (await client.query(`
          INSERT INTO inventory (name,category,sell_price,cost_price,quantity,brand,dealer,image_url)
          VALUES ($1,$2,$3,$3,$4,'','Kalutota Opticals',$5) RETURNING *`,
          [itemName, cat, parseFloat(unit_price)||0, qty, image_url||null]
        )).rows[0];
        inventoryResult = { action:'created', item:newItem };
      } else {
        inventoryResult = { action:'not_found', message:`"${itemName}" not in inventory — quantity not deducted` };
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ ...tx, inventoryResult });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed: '+err.message });
  } finally { client.release(); }
});

// PATCH /api/kalutota/:id
router.patch('/:id', auth, async (req, res) => {
  const { payment_status, paid_amount, paid_date, payment_method, notes } = req.body;
  try {
    const r = (await pool.query(`
      UPDATE kalutota_transactions
      SET payment_status=COALESCE($1,payment_status),
          paid_amount=COALESCE($2,paid_amount),
          paid_date=COALESCE($3,paid_date),
          payment_method=COALESCE($4,payment_method),
          notes=COALESCE($5,notes)
      WHERE id=$6 RETURNING *`,
      [payment_status,paid_amount,paid_date,payment_method,notes,req.params.id]
    )).rows[0];
    res.json(r);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// DELETE /api/kalutota/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM kalutota_transactions WHERE id=$1',[req.params.id]);
    res.json({ message:'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
