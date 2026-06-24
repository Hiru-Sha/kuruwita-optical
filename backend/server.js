// ============================================================
//  Kuruwita Optical — Express Server
//  Fixed: rate limiting added to /api/auth/login to prevent
//         brute-force password attacks
// ============================================================
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const app       = express();

// ── Rate limiter: max 10 login attempts per IP per 15 minutes ─
// This prevents brute-force attacks on staff passwords.
// Legitimate users will never hit this limit.
const loginLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,  // 15 minutes
  max:             10,               // 10 attempts per window
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
  skip: (req) => {
    // Don't rate-limit in development
    return process.env.NODE_ENV === 'development';
  },
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

// ── Apply rate limit to login only ───────────────────────────
app.use('/api/auth/login', loginLimiter);

// ── Routes ───────────────────────────────────────────────────
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
app.use('/api/dashboard-today',   require('./routes/dashboardToday'));
app.use('/api/full-report',       require('./routes/fullReport'));
app.use('/api/scan-session',      require('./routes/scanSession'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Kuruwita Optical on port ${PORT}`));