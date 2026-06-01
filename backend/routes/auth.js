// ============================================================
//  Auth Routes — /api/auth  (with permissions support)
// ============================================================
const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const pool   = require('../db/pool');
const auth   = require('../middleware/auth');

// ── Login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user   = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid username or password' });

    // Parse permissions
    let permissions = [];
    try { permissions = user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : []; }
    catch(e) { permissions = []; }

    const token = jwt.sign(
      { id:user.id, username:user.username, role:user.role, name:user.full_name, permissions },
      process.env.JWT_SECRET,
      { expiresIn:'12h' }
    );
    res.json({ token, user:{ id:user.id, username:user.username, role:user.role, name:user.full_name, permissions } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Change own password ───────────────────────────────────────
router.post('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const match  = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Verify token ──────────────────────────────────────────────
router.get('/me', auth, (req, res) => { res.json({ user: req.user }); });

// ── List all users (admin only) ───────────────────────────────
router.get('/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, role, permissions, created_at FROM users ORDER BY created_at ASC'
    );
    // Parse permissions JSON for each user
    const users = result.rows.map(u => ({
      ...u,
      permissions: u.permissions
        ? (typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions)
        : [],
    }));
    res.json(users);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// ── Create user (admin only) ──────────────────────────────────
router.post('/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { username, full_name, password, role='staff', permissions=[] } = req.body;
  if (!username || !full_name || !password) return res.status(400).json({ error: 'username, full_name, password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const exists = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (exists.rows.length) return res.status(409).json({ error: 'Username already taken' });
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, full_name, password, role, permissions)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, username, full_name, role, permissions`,
      [username.toLowerCase(), full_name, hashed, role, JSON.stringify(permissions)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create user' }); }
});

// ── Update permissions (admin only) ──────────────────────────
router.patch('/users/:id/permissions', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { permissions } = req.body;
  if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions must be an array' });
  try {
    await pool.query('UPDATE users SET permissions = $1 WHERE id = $2', [JSON.stringify(permissions), req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// ── Reset another user's password (admin only) ────────────────
router.post('/users/:id/reset-password', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.params.id]);
    res.json({ message: 'Password reset' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// ── Delete user (admin only) ──────────────────────────────────
router.delete('/users/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;