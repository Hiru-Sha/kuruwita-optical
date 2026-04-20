// ============================================================
//  KURUWITA OPTICAL — Main Server
// ============================================================
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const app     = express();

// ---- Middleware ----
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '10mb' }));  // 10mb for image uploads
app.use(express.urlencoded({ extended: true }));

// ---- Routes ----
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/dealers',   require('./routes/dealers'));
app.use('/api/reports',   require('./routes/reports'));

// ---- Health check ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Kuruwita Optical', time: new Date() });
});

// ---- Start server ----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Kuruwita Optical server running on port ${PORT}`);
});
