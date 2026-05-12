// ============================================================
//  Auth Routes — /api/auth
//  login, me, change-password, admin user management
// ============================================================
const router = require('express').Router();
const pool   = require('../db/pool');
const jwt    = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const auth   = require('../middleware/auth');

const SECRET = process.env.JWT_SECRET || 'kuruwita-optical-secret';

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid username or password' });
    const user  = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid username or password' });
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role || 'admin' },
      SECRET, { expiresIn: '30d' }
    );
    res.json({ token, user: { id: user.id, username: user.username, name: user.full_name, role: user.role || 'admin' } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Login failed' }); }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], SECRET);
    const result  = await pool.query('SELECT id, username, full_name, role FROM users WHERE id = $1', [decoded.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const u = result.rows[0];
    res.json({ id: u.id, username: u.username, name: u.full_name, role: u.role || 'admin' });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

// POST /api/auth/change-password
router.post('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Min 6 characters' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const match = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [await bcrypt.hash(newPassword, 12), req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// GET /api/auth/users — admin only
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, full_name, role, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// POST /api/auth/users — create user, admin only
router.post('/users', auth, adminOnly, async (req, res) => {
  const { username, full_name, password, role } = req.body;
  if (!username || !full_name || !password) return res.status(400).json({ error: 'username, full_name and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const exists = await pool.query('SELECT id FROM users WHERE username = $1', [username.trim()]);
    if (exists.rows.length) return res.status(409).json({ error: 'Username already taken' });
    const result = await pool.query(
      'INSERT INTO users (username, full_name, password, role) VALUES ($1,$2,$3,$4) RETURNING id, username, full_name, role',
      [username.trim().toLowerCase(), full_name.trim(), await bcrypt.hash(password, 12), role || 'staff']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create user' }); }
});

// POST /api/auth/users/:id/reset-password — admin only
router.post('/users/:id/reset-password', auth, adminOnly, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Min 6 characters' });
  try {
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [await bcrypt.hash(newPassword, 12), req.params.id]);
    res.json({ message: 'Password reset successfully' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// DELETE /api/auth/users/:id — admin only, cannot delete self
router.delete('/users/:id', auth, adminOnly, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
