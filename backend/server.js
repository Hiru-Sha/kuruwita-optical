// ============================================================
//  Kuruwita Optical — Express Server
//  Fixed:
//    Bug #2 — Added all missing warranty columns to orders table
//    in startup migration so warranty check returns correct status
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

// ── Startup: auto-create tables and add missing columns ───────
const pool = require('./db/pool');
(async () => {
  try {
    // stock_adjustments table
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

    // orders — existing columns
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_payment_amount DECIMAL(10,2) DEFAULT 0`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_frame VARCHAR(30)`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_lens  VARCHAR(30)`);

    // ── FIX #2: Warranty columns used by /api/warranties/check ──
    // These were missing, causing warrantyStatus to always be 'none'
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_enabled    BOOLEAN       DEFAULT FALSE`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_months     INTEGER       DEFAULT 0`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_start_date DATE`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_expiry     DATE`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_coverage   TEXT`);

    // other tables
    await pool.query(`ALTER TABLE quick_sales ADD COLUMN IF NOT EXISTS customer_id INTEGER`);
    await pool.query(`ALTER TABLE repairs     ADD COLUMN IF NOT EXISTS customer_id INTEGER`);

    console.log('✅ DB migrations complete');
  } catch(e) { console.warn('Migration warning:', e.message); }
})();

app.listen(PORT, () => console.log(`✅ Kuruwita Optical on port ${PORT}`));