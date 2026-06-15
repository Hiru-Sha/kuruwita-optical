// ============================================================
//  Repairs Routes — /api/repairs
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// Generate repair number REP-XXXX
async function nextRepairNumber(client) {
  const res = await client.query(`SELECT NEXTVAL('repair_number_seq') AS n`);
  return 'REP-' + String(res.rows[0].n).padStart(4, '0');
}

// GET /api/repairs — list repairs
router.get('/', auth, async (req, res) => {
  const { month, status, limit = 100 } = req.query;
  try {
    let query  = `SELECT * FROM repairs WHERE 1=1`;
    const params = [];
    if (month) {
      params.push(month);
      query += ` AND TO_CHAR(created_at,'YYYY-MM') = $${params.length}`;
    }
    if (status && status !== 'all') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    params.push(parseInt(limit));
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/repairs/summary — stats for dashboard
router.get('/summary', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)                                             AS total,
        COALESCE(SUM(charge), 0)                            AS total_revenue,
        COALESCE(SUM(CASE WHEN TO_CHAR(created_at,'YYYY-MM')=TO_CHAR(NOW(),'YYYY-MM') THEN charge END), 0) AS this_month_revenue,
        COUNT(CASE WHEN TO_CHAR(created_at,'YYYY-MM')=TO_CHAR(NOW(),'YYYY-MM') THEN 1 END) AS this_month_count,
        COUNT(CASE WHEN status='pending' THEN 1 END)        AS pending_count,
        COUNT(CASE WHEN created_at::date=CURRENT_DATE THEN 1 END) AS today_count,
        COALESCE(SUM(CASE WHEN created_at::date=CURRENT_DATE THEN charge END), 0) AS today_revenue
      FROM repairs
    `);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /api/repairs — create repair
router.post('/', auth, async (req, res) => {
  const { customer_name, phone, repair_type, description, charge, payment_method, status, notes,
          frame_inventory_id, advance, due_date, frame_description } = req.body;
  if (!repair_type) return res.status(400).json({ error: 'repair_type required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const repair_number = await nextRepairNumber(client);
    const import_date = req.body.repair_date || req.body.import_date || null;
    const result = await client.query(`
      INSERT INTO repairs
        (repair_number, customer_name, phone, repair_type, description, charge, payment_method, status, notes, added_by, completed_at, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12::timestamp, NOW())) RETURNING *`,
      [repair_number,
       customer_name?.trim()||null, phone?.trim()||null,
       repair_type, description?.trim()||null,
       parseFloat(charge)||0, payment_method||'cash',
       status||'done', notes?.trim()||null, req.user.id,
       (status||'done')==='done' ? new Date() : null,
       import_date||null]
    );
    await client.query('COMMIT');

    // Deduct frame from inventory if a frame was used from stock
    if (frame_inventory_id) {
      await pool.query(
        'UPDATE inventory SET quantity = GREATEST(0, quantity - 1), updated_at = NOW() WHERE id = $1',
        [frame_inventory_id]
      ).catch(e => console.warn('Repair frame stock deduct failed:', e.message));
    }
    const newRepair = result.rows[0];

    // Auto-create bank receipt if paid by bank or card
    const pm_r  = (payment_method||'cash').toLowerCase();
    const amt_r = parseFloat(charge)||0;
    if ((pm_r==='bank'||pm_r==='card'||pm_r==='transfer') && amt_r > 0) {
      try {
        await pool.query(
          `INSERT INTO cash_deposits (date,amount,bank_name,payment_type,notes,added_by)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [new Date().toISOString().split('T')[0], amt_r, 'Pan Asia Bank',
           pm_r==='card'?'card':'online',
           'Auto: Repair ' + repair_number, req.user.id]
        );
      } catch(e) { console.warn('Repair bank receipt failed:', e.message); }
    }

    res.status(201).json(newRepair);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally { client.release(); }
});

// PATCH /api/repairs/:id — update status and any field
router.patch('/:id', auth, async (req, res) => {
  const allowed = ['status','notes','charge','repair_cost','payment_method','customer_name',
                   'phone','repair_type','description','frame_description',
                   'due_date','advance','frame_inventory_id',
                   'balance_amount','last_payment_date','last_payment_method','amount_paid'];
  const fields = [], vals = [];

  allowed.forEach(f => {
    if (req.body[f] !== undefined) {
      fields.push(`${f} = $${fields.length + 1}`);
      vals.push(req.body[f]);
    }
  });

  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

  // Auto-set timestamps based on status
  if (req.body.status === 'done') {
    fields.push(`completed_at = NOW()`);
  }
  if (req.body.status === 'collected') {
    fields.push(`completed_at = COALESCE(completed_at, NOW())`);
  }

  vals.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE repairs SET ${fields.join(', ')} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Repair not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Repair patch error:', err.message);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

// DELETE /api/repairs/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    // Get repair details first so we can clean up deposits
    const rep = await pool.query('SELECT * FROM repairs WHERE id=$1', [req.params.id]);
    if (!rep.rows.length) return res.status(404).json({ error: 'Not found' });
    const repair = rep.rows[0];

    // Restore frame stock if it was taken from inventory
    if (repair.frame_inventory_id) {
      await pool.query(
        'UPDATE inventory SET quantity = quantity + 1, updated_at = NOW() WHERE id = $1',
        [repair.frame_inventory_id]
      ).catch(()=>{});
    }

    // If bank/card payment — delete matching bank receipt
    if (repair.payment_method && repair.payment_method !== 'cash') {
      await pool.query(
        `DELETE FROM cash_deposits
         WHERE notes ILIKE $1
           AND amount = $2
           AND date = $3`,
        [`%Repair ${repair.repair_number}%`,
         parseFloat(repair.charge||0),
         repair.created_at?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]]
      ).catch(()=>{});
    }

    await pool.query('DELETE FROM repairs WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /api/repairs/:id/payment — record partial/full payment on a repair
router.post('/:id/payment', auth, async (req, res) => {
  const { amount, method, pay_date } = req.body;
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });
  try {
    const rep = await pool.query('SELECT * FROM repairs WHERE id=$1', [req.params.id]);
    if (!rep.rows.length) return res.status(404).json({ error: 'Repair not found' });
    const repair = rep.rows[0];
    const currentPaid   = parseFloat(repair.amount_paid || repair.advance || 0);
    const newPaid       = currentPaid + amt;
    const charge        = parseFloat(repair.charge || 0);
    const newBalance    = Math.max(0, charge - newPaid);
    const dateStr       = pay_date || new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      UPDATE repairs
      SET amount_paid = $1, balance_amount = $2,
          last_payment_date = $3, last_payment_method = $4,
          status = CASE WHEN $2 <= 0 THEN 'collected' ELSE status END
      WHERE id = $5 RETURNING *
    `, [newPaid, newBalance, dateStr, method||'cash', req.params.id]);

    // Auto-create bank deposit if method is bank/card
    const pm = (method||'cash').toLowerCase();
    if (pm === 'bank' || pm === 'card' || pm === 'transfer') {
      await pool.query(
        `INSERT INTO cash_deposits (date,amount,bank_name,payment_type,notes,added_by) VALUES ($1,$2,$3,$4,$5,$6)`,
        [dateStr, amt, 'Pan Asia Bank', pm==='card'?'card':'online',
         'Payment: Repair ' + repair.repair_number, req.user.id]
      ).catch(()=>{});
    }

    res.json(result.rows[0]);
  } catch(err) {
    console.error('Repair payment error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;