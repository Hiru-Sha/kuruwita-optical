// ============================================================
//  Kuruwita Optical — Express Server
//  Fixed:
//    Bug #2  — Added all missing warranty columns to orders table
//    Bug #17 — All CREATE TABLE DDL moved here (startup migration)
//              so route handlers don't run DDL on every request
// ============================================================
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const app       = express();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
  skip: (req) => process.env.NODE_ENV === 'development',
});

app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      process.env.FRONTEND_URL,
      'https://kuruwita-optical-ztcu.vercel.app',
      'http://localhost:3000',
    ].filter(Boolean);
    if (!origin || allowed.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());
app.use(express.json({ limit: '25mb' }));

// Rate limit login only
app.use('/api/auth/login', loginLimiter);

// Routes
app.use('/api/auth',              require('./routes/auth'));
app.use('/api/orders',            require('./routes/orders'));
app.use('/api/customers',         require('./routes/customers'));
app.use('/api/inventory',         require('./routes/inventory'));
app.use('/api/inventory',         require('./routes/aiAnalyze'));
app.use('/api/dealers',           require('./routes/dealers'));
app.use('/api/reports',           require('./routes/reports'));
app.use('/api/lens-prices',       require('./routes/lensPrices'));
app.use('/api/quick-sales',       require('./routes/quickSales'));
app.use('/api/expenses',          require('./routes/expenses'));
app.use('/api/cash-deposits',     require('./routes/cashDeposits'));
app.use('/api/stock-adjustments', require('./routes/stockAdjustments'));
app.use('/api/walkin-rx',         require('./routes/walkInRx'));
app.use('/api/kalutota',          require('./routes/kalutota'));
app.use('/api/dealer-purchases',  require('./routes/dealerPurchases'));
app.use('/api/repairs',           require('./routes/repairs'));
app.use('/api/backup',            require('./routes/backup'));
app.use('/api/warranties',        require('./routes/warranties'));
app.use('/api/dashboard-today',   require('./routes/dashboardToday'));
app.use('/api/full-report',       require('./routes/fullReport'));
app.use('/api/scan-session',      require('./routes/scanSession'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

const PORT = process.env.PORT || 5000;

// ── Startup: all DDL migrations run ONCE here at boot ─────────
// Bug #17 Fix: CREATE TABLE statements removed from individual
// route handlers (orders.js, quickSales.js, stockAdjustments.js,
// kalutota.js, inventory.js) and consolidated here so they only
// run once on startup rather than on every API request.
const pool = require('./db/pool');
(async () => {
  try {
    // ── stock_adjustments ─────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id               SERIAL PRIMARY KEY,
        inventory_id     INTEGER,
        item_name        VARCHAR(200),
        change_type      VARCHAR(20),
        quantity_change  INTEGER,
        quantity_before  INTEGER,
        quantity_after   INTEGER,
        reason           VARCHAR(100),
        notes            TEXT,
        unit_cost        DECIMAL(10,2),
        adjusted_by      INTEGER,
        adjusted_by_name VARCHAR(100),
        order_id         INTEGER,
        created_at       TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_stock_adj_inv  ON stock_adjustments(inventory_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_stock_adj_date ON stock_adjustments(created_at DESC)`);

    // ── stock_batches ─────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_batches (
        id            SERIAL PRIMARY KEY,
        inventory_id  INTEGER NOT NULL,
        item_name     VARCHAR(200),
        qty_received  INTEGER NOT NULL,
        qty_remaining INTEGER NOT NULL,
        buy_price     DECIMAL(10,2) NOT NULL,
        sell_price    DECIMAL(10,2),
        batch_date    DATE DEFAULT CURRENT_DATE,
        notes         TEXT,
        added_by      INTEGER,
        created_at    TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_batches_inv ON stock_batches(inventory_id)`);

    // ── scan_sessions (DB-backed QR sessions) ─────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scan_sessions (
        user_id    INTEGER PRIMARY KEY,
        item       JSONB        NOT NULL,
        action     VARCHAR(50)  NOT NULL DEFAULT 'new_order',
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    // ── orders: existing + new warranty columns ───────────────
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_payment_amount DECIMAL(10,2) DEFAULT 0`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_frame       VARCHAR(30)`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_lens        VARCHAR(30)`);
    // Bug #2 Fix: warranty columns used by /api/warranties/check
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_enabled     BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_months      INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_start_date  DATE`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_expiry      DATE`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_coverage    TEXT`);

    // ── other tables ─────────────────────────────────────────
    await pool.query(`ALTER TABLE quick_sales ADD COLUMN IF NOT EXISTS customer_id INTEGER`);
    await pool.query(`ALTER TABLE repairs     ADD COLUMN IF NOT EXISTS customer_id INTEGER`);

    console.log('✅ DB migrations complete');
  } catch (e) { console.warn('Migration warning:', e.message); }
})();

app.listen(PORT, () => console.log(`✅ Kuruwita Optical on port ${PORT}`));