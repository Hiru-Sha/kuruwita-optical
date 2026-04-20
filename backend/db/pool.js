// ============================================================
//  Database connection — PostgreSQL via Supabase
// ============================================================
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }  // required for Supabase
});

pool.on('connect', () => console.log('✅ Connected to Supabase database'));
pool.on('error',   (err) => console.error('❌ Database error:', err));

module.exports = pool;
