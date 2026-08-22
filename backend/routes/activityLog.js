const router = require('express').Router();
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// GET /api/activity-log
router.get('/', auth, async (req, res) => {
  const { limit = 100, user_id, entity_type, date } = req.query;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (user_id)     { params.push(user_id);     where += ` AND user_id = $${params.length}`; }
    if (entity_type) { params.push(entity_type); where += ` AND entity_type = $${params.length}`; }
    if (date)        { params.push(date);         where += ` AND created_at::date = $${params.length}`; }
    params.push(parseInt(limit));
    const result = await pool.query(
      `SELECT * FROM activity_log ${where} ORDER BY created_at DESC LIMIT $${params.length}`, params
    );
    res.json(result.rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/activity-log/summary — who did what today
router.get('/summary', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT user_name, action, entity_type, COUNT(*) AS count
      FROM activity_log
      WHERE created_at::date = CURRENT_DATE
      GROUP BY user_name, action, entity_type
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── Note Templates ────────────────────────────────────────────
// GET /api/activity-log/note-templates
router.get('/note-templates', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM order_note_templates ORDER BY title ASC'
    );
    res.json(result.rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// POST /api/activity-log/note-templates
router.post('/note-templates', auth, async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
  try {
    const result = await pool.query(
      'INSERT INTO order_note_templates (title, content, created_by) VALUES ($1,$2,$3) RETURNING *',
      [title, content, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/activity-log/note-templates/:id
router.delete('/note-templates/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM order_note_templates WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;