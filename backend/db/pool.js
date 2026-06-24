// ============================================================
//  Database connection — PostgreSQL via Supabase
//  Fixed: added pool limits for Supabase connection constraints
// ============================================================
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },  // required for Supabase
  max: 5,                              // Supabase free tier: keep low (max 15 total)
  idleTimeoutMillis: 30000,            // close idle clients after 30s
  connectionTimeoutMillis: 5000,       // fail fast if DB unreachable (5s)
});

pool.on('connect', () => console.log('✅ Connected to Supabase database'));
pool.on('error',   (err) => console.error('❌ Database error:', err.message));

module.exports = pool;