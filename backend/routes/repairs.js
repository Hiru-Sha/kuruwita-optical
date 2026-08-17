// ============================================================
//  Repairs Routes — /api/repairs
//  Fixed:
//    Bug #8 — Frame inventory deduction now runs INSIDE the
//    transaction (before COMMIT). Previously it ran after COMMIT
//    via pool.query, so a failure left the repair saved but
//    stock unchanged with no way to rollback.
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
// Fix P: SELECT only the columns the list view needs.
// Heavy fields (notes, description) are fetched when a repair is opened.
// Add ?full=1 to get all columns (e.g. for export/backup).
router.get('/', auth, async (req, res) => {
  const { month, status, limit = 200, full } = req.query;
  const cols = full === '1'
    ? '*'
    : `id, repair_number, customer_name, phone, repair_type,
       charge, payment_method, status, created_at, completed_at,
       customer_id, frame_inventory_id, advance`;
  try {
    let query  = `SELECT ${cols} FROM repairs WHERE 1=1`;
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
// Bug #8 Fix: frame inventory deduction now inside the transaction.
router.post('/', auth, async (req, res) => {
  const { customer_name, phone, repair_type, description, charge, payment_method, status, notes,
          frame_inventory_id, advance, due_date, frame_description } = req.body;
  if (!repair_type) return res.status(400).json({ error: 'repair_type required' });

  const client = await pool.connect();
  try {
    await pool.query(`ALTER TABLE repairs ADD COLUMN IF NOT EXISTS customer_id INTEGER`).catch(() => {});
    await client.query('BEGIN');

    const repair_number = await nextRepairNumber(client);
    const import_date   = req.body.repair_date || req.body.import_date || null;

    // Auto-set status to 'collected' if fully paid on save
    const advanceAmt = parseFloat(advance) || 0;
    const chargeAmt  = parseFloat(charge)  || 0;
    const autoStatus = (advanceAmt > 0 && advanceAmt >= chargeAmt - 0.01) ? 'collected' : (status || 'done');

    const result = await client.query(`
      INSERT INTO repairs
        (repair_number, customer_name, phone, repair_type, description, charge,
         payment_method, status, notes, added_by, completed_at, created_at, advance)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12::timestamp, NOW()),$13)
      RETURNING *`,
      [
        repair_number,
        customer_name?.trim() || null,
        phone?.trim()         || null,
        repair_type,
        description?.trim()   || null,
        parseFloat(charge)    || 0,
        payment_method        || 'cash',
        autoStatus,
        notes?.trim()         || null,
        req.user.id,
        ['done','collected'].includes(autoStatus) ? new Date() : null,
        import_date           || null,
        parseFloat(advance)   || 0,
      ]
    );

    // ── Bug #8 Fix: deduct frame INSIDE transaction ────────────
    // Previously this ran after COMMIT via pool.query — if it
    // failed, the repair was saved but stock was unchanged.
    if (frame_inventory_id) {
      const fBefore = await client.query(
        'SELECT quantity, name FROM inventory WHERE id=$1', [frame_inventory_id]
      ).catch(() => ({ rows: [{ quantity: 0, name: 'Frame' }] }));
      const fQtyBefore = parseInt(fBefore.rows[0]?.quantity || 0);

      await client.query(
        'UPDATE inventory SET quantity = GREATEST(0, quantity - 1), updated_at = NOW() WHERE id = $1',
        [frame_inventory_id]
      );

      await client.query(
        `INSERT INTO stock_adjustments
          (inventory_id, item_name, change_type, quantity_change, quantity_before, quantity_after, reason, notes, adjusted_by)
         VALUES ($1,$2,'remove',-1,$3,$4,'Repair',$5,$6)`,
        [
          frame_inventory_id,
          fBefore.rows[0]?.name || frame_description || 'Frame',
          fQtyBefore,
          Math.max(0, fQtyBefore - 1),
          'Used in repair: ' + repair_number,
          req.user.id,
        ]
      ).catch(e => console.warn('Repair stock log failed:', e.message));
    }

    // Auto-create bank receipt if paid by bank or card
    const pm_r  = (payment_method || 'cash').toLowerCase();
    const amt_r = parseFloat(charge) || 0;
    if ((pm_r === 'bank' || pm_r === 'card' || pm_r === 'transfer') && amt_r > 0) {
      const CARD_CHARGE_RATE = 0.03;
      const cardCharge_r = pm_r === 'card' ? Math.round(amt_r * CARD_CHARGE_RATE * 100) / 100 : 0;
      const netAmount_r  = amt_r - cardCharge_r;
      // Try with card_charge columns, fall back if not yet migrated
      // Store net_amount (after 3% card charge) as the deposit amount
      // so bank totals are always accurate regardless of column existence
      const depositNote = 'Auto: Repair ' + repair_number +
        (cardCharge_r > 0 ? ` (Charged: Rs.${amt_r} | Bank fee 3%: Rs.${cardCharge_r} | Net: Rs.${netAmount_r})` : '');
      await client.query(
        `INSERT INTO cash_deposits (date, amount, bank_name, payment_type, notes, added_by)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          new Date().toISOString().split('T')[0],
          netAmount_r,   // ← NET amount after card charge
          'Pan Asia Bank',
          pm_r === 'card' ? 'card' : 'online',
          depositNote,
          req.user.id,
        ]
      ).catch(e => console.warn('Repair bank receipt failed:', e.message));
    }

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/repairs/:id — update status and any field
router.patch('/:id', auth, async (req, res) => {
  const allowed = [
    'status','notes','charge','repair_cost','payment_method','customer_name',
    'phone','repair_type','description','frame_description','customer_id',
    'due_date','advance','frame_inventory_id',
  ];
  const fields = [], vals = [];

  allowed.forEach(f => {
    if (req.body[f] !== undefined) {
      fields.push(`${f} = $${fields.length + 1}`);
      vals.push(req.body[f]);
    }
  });

  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

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
    const rep = await pool.query('SELECT * FROM repairs WHERE id=$1', [req.params.id]);
    if (!rep.rows.length) return res.status(404).json({ error: 'Not found' });
    const repair = rep.rows[0];

    // Restore frame stock if it was taken from inventory
    if (repair.frame_inventory_id) {
      await pool.query(
        'UPDATE inventory SET quantity = quantity + 1, updated_at = NOW() WHERE id = $1',
        [repair.frame_inventory_id]
      ).catch(() => {});
    }

    // Delete matching bank receipt if non-cash
    if (repair.payment_method && repair.payment_method !== 'cash') {
      await pool.query(
        `DELETE FROM cash_deposits
         WHERE notes ILIKE $1 AND amount = $2 AND date = $3`,
        [
          `%Repair ${repair.repair_number}%`,
          parseFloat(repair.charge || 0),
          repair.created_at?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        ]
      ).catch(() => {});
    }

    await pool.query('DELETE FROM repairs WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// POST /api/repairs/:id/payment — record partial/full payment
router.post('/:id/payment', auth, async (req, res) => {
  const { amount, method, pay_date } = req.body;
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });
  try {
    const rep = await pool.query('SELECT * FROM repairs WHERE id=$1', [req.params.id]);
    if (!rep.rows.length) return res.status(404).json({ error: 'Repair not found' });
    const repair     = rep.rows[0];
    const newAdvance = parseFloat(repair.advance || 0) + amt;
    const charge     = parseFloat(repair.charge  || 0);
    const dateStr    = pay_date || new Date().toISOString().split('T')[0];
    const fullyPaid  = newAdvance >= charge - 0.01;

    const result = await pool.query(
      `UPDATE repairs SET advance=$1, notes=COALESCE(notes,'')||$2,
       status=CASE WHEN $3 THEN 'collected' ELSE status END
       WHERE id=$4 RETURNING *`,
      [
        newAdvance,
        `\nPayment: Rs.${amt.toLocaleString()} on ${dateStr} (${method || 'cash'})`,
        fullyPaid,
        req.params.id,
      ]
    );

    const pm = (method || 'cash').toLowerCase();
    if (pm === 'bank' || pm === 'card' || pm === 'transfer') {
      await pool.query(
        `INSERT INTO cash_deposits (date,amount,bank_name,payment_type,notes,added_by)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          dateStr, amt, 'Pan Asia Bank',
          pm === 'card' ? 'card' : 'online',
          'Repair payment: ' + repair.repair_number,
          req.user.id,
        ]
      ).catch(() => {});
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Repair payment error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;