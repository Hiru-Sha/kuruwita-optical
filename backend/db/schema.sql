-- ============================================================
--  KURUWITA OPTICAL — Full Database Schema (v2 — Fixed)
--  Safe to run on BOTH fresh and existing databases.
--  Uses IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS.
-- ============================================================

-- ============================================================
--  SEQUENCES
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS repair_number_seq START 1;

-- ============================================================
--  1. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR(50) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,        -- bcrypt hashed
  full_name   VARCHAR(100) NOT NULL,
  role        VARCHAR(20) DEFAULT 'staff',  -- 'admin' or 'staff'
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at  TIMESTAMP DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- ============================================================
--  2. CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  age         INTEGER,
  phone       VARCHAR(20),
  address     TEXT,
  email       VARCHAR(100),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email      VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ============================================================
--  3. ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                  SERIAL PRIMARY KEY,
  order_number        VARCHAR(20) UNIQUE NOT NULL,
  customer_id         INTEGER REFERENCES customers(id),
  frame               VARCHAR(150),
  frame_type          VARCHAR(50),
  frame_material      VARCHAR(50),
  frame_color         VARCHAR(50),
  frame_sell_price    DECIMAL(10,2) DEFAULT 0,
  frame_buy_price     DECIMAL(10,2) DEFAULT 0,
  lens_type           VARCHAR(100),
  lens_coating        VARCHAR(100),
  lens_company        VARCHAR(50),
  lens_index          VARCHAR(20),
  lens_sell_price     DECIMAL(10,2) DEFAULT 0,
  lens_buy_price      DECIMAL(10,2) DEFAULT 0,
  lens_step           INTEGER DEFAULT 0,
  total_amount        DECIMAL(10,2) DEFAULT 0,
  advance_amount      DECIMAL(10,2) DEFAULT 0,
  balance_amount      DECIMAL(10,2) DEFAULT 0,
  discount_amount     DECIMAL(10,2) DEFAULT 0,
  discount_percent    DECIMAL(5,2)  DEFAULT 0,
  payment_method      VARCHAR(20)   DEFAULT 'cash',
  last_payment_date   DATE,
  last_payment_method VARCHAR(20),
  deliver_date        DATE,
  status              VARCHAR(20)   DEFAULT 'created',
  has_rx              BOOLEAN       DEFAULT FALSE,
  rx_hospital         VARCHAR(150),
  rx_date             DATE,
  rx_doctor           VARCHAR(100),
  rx_returned         BOOLEAN       DEFAULT FALSE,
  notes               TEXT,
  order_type          VARCHAR(20)   DEFAULT 'normal',
  customer_own_frame  BOOLEAN       DEFAULT FALSE,
  frame_inventory_id  INTEGER,
  lab_bill_amount     DECIMAL(10,2) DEFAULT 0,
  lab_paid            BOOLEAN       DEFAULT FALSE,
  lab_paid_date       DATE,
  lab_payment_method  VARCHAR(20),
  lab_notes           TEXT,
  seg_height_r        VARCHAR(10),
  seg_height_l        VARCHAR(10),
  created_at          TIMESTAMP     DEFAULT NOW(),
  updated_at          TIMESTAMP     DEFAULT NOW()
);
-- Add any columns missing from older schema
ALTER TABLE orders ADD COLUMN IF NOT EXISTS frame_material      VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS frame_color         VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS frame_sell_price    DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS frame_buy_price     DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lens_index          VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lens_sell_price     DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lens_buy_price      DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount     DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_percent    DECIMAL(5,2)  DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method      VARCHAR(20)   DEFAULT 'cash';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_payment_date   DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_payment_method VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type         VARCHAR(20)   DEFAULT 'normal';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_own_frame  BOOLEAN       DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS frame_inventory_id  INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lab_bill_amount     DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lab_paid            BOOLEAN       DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lab_paid_date       DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lab_payment_method  VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lab_notes           TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seg_height_r        VARCHAR(10);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seg_height_l        VARCHAR(10);

-- ============================================================
--  4. REFRACTION RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS refractions (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id),
  r_sph       VARCHAR(10),
  r_cyl       VARCHAR(10),
  r_axis      VARCHAR(10),
  r_add       VARCHAR(10),
  r_va        VARCHAR(10),
  r_pd        VARCHAR(10),
  l_sph       VARCHAR(10),
  l_cyl       VARCHAR(10),
  l_axis      VARCHAR(10),
  l_add       VARCHAR(10),
  l_va        VARCHAR(10),
  l_pd        VARCHAR(10),
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
--  5. CALL LOGS (per order)
-- ============================================================
CREATE TABLE IF NOT EXISTS call_logs (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  logged_by   INTEGER REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
--  6. INVENTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  brand          VARCHAR(100),
  category       VARCHAR(50),
  dealer         VARCHAR(100),
  frame_type     VARCHAR(50),
  frame_color    VARCHAR(50),
  frame_shape    VARCHAR(50),
  frame_material VARCHAR(50),
  frame_size     VARCHAR(20),
  frame_name     VARCHAR(150),
  sg_type        VARCHAR(50),
  rg_lens_type   VARCHAR(50),
  rg_material    VARCHAR(50),
  rg_power       VARCHAR(50),
  item_name      VARCHAR(150),
  sell_price     DECIMAL(10,2) DEFAULT 0,
  cost_price     DECIMAL(10,2) DEFAULT 0,
  quantity       INTEGER DEFAULT 0,
  min_quantity   INTEGER DEFAULT 2,
  image_url      TEXT,
  display_number VARCHAR(50),
  stock_number   VARCHAR(50),
  location       VARCHAR(50) DEFAULT 'stock',
  notes          TEXT,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS frame_type     VARCHAR(50);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS frame_color    VARCHAR(50);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS frame_shape    VARCHAR(50);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS frame_material VARCHAR(50);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS frame_size     VARCHAR(20);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS frame_name     VARCHAR(150);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sg_type        VARCHAR(50);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS rg_lens_type   VARCHAR(50);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS rg_material    VARCHAR(50);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS rg_power       VARCHAR(50);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS item_name      VARCHAR(150);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS display_number VARCHAR(50);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS stock_number   VARCHAR(50);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS location       VARCHAR(50) DEFAULT 'stock';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS notes          TEXT;

-- ============================================================
--  7. DEALERS
-- ============================================================
CREATE TABLE IF NOT EXISTS dealers (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  area        VARCHAR(100),
  phone       VARCHAR(20),
  rep_name    VARCHAR(100),
  categories  TEXT[],
  total_spent DECIMAL(10,2) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
--  8. PURCHASES (from dealers)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchases (
  id           SERIAL PRIMARY KEY,
  dealer_id    INTEGER REFERENCES dealers(id),
  items        TEXT NOT NULL,
  amount       DECIMAL(10,2) DEFAULT 0,
  purchased_at DATE DEFAULT CURRENT_DATE,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- ============================================================
--  8b. DEALER PURCHASES
--  Tracks every stock purchase from each dealer.
--  Used by dealerPurchases.js and dealers.js routes.
-- ============================================================
CREATE TABLE IF NOT EXISTS dealer_purchases (
  id               SERIAL PRIMARY KEY,
  dealer_name      VARCHAR(100) NOT NULL,
  purchase_date    DATE         DEFAULT CURRENT_DATE,
  invoice_no       VARCHAR(50),
  category         VARCHAR(50),
  description      TEXT         NOT NULL,
  quantity         INTEGER      DEFAULT 1,
  unit_cost        DECIMAL(10,2) DEFAULT 0,
  total_cost       DECIMAL(10,2) DEFAULT 0,
  payment_method   VARCHAR(20)  DEFAULT 'cash',
  payment_status   VARCHAR(20)  DEFAULT 'paid',
  notes            TEXT,
  cheque_no        VARCHAR(50),
  cheque_date      DATE,
  cheque_bank      VARCHAR(100),
  bill_image       TEXT,
  added_by         INTEGER REFERENCES users(id),
  created_at       TIMESTAMP    DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dealer_purchases_dealer ON dealer_purchases(dealer_name);
CREATE INDEX IF NOT EXISTS idx_dealer_purchases_date   ON dealer_purchases(purchase_date DESC);

-- ============================================================
--  8c. KALUTOTA TRANSACTIONS
--  Trade account with Kalutota Opticals dealer.
-- ============================================================
CREATE TABLE IF NOT EXISTS kalutota_transactions (
  id               SERIAL PRIMARY KEY,
  date             DATE         DEFAULT CURRENT_DATE,
  direction        VARCHAR(10)  NOT NULL,  -- 'in' | 'out'
  category         VARCHAR(50),
  description      TEXT         NOT NULL,
  quantity         INTEGER      DEFAULT 1,
  unit_price       DECIMAL(10,2) DEFAULT 0,
  total_amount     DECIMAL(10,2) DEFAULT 0,
  payment_status   VARCHAR(20)  DEFAULT 'pending',
  paid_amount      DECIMAL(10,2) DEFAULT 0,
  paid_date        DATE,
  payment_method   VARCHAR(20)  DEFAULT 'cash',
  notes            TEXT,
  image_url        TEXT,
  inventory_id     INTEGER,
  added_by         INTEGER REFERENCES users(id),
  created_at       TIMESTAMP    DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kalutota_date ON kalutota_transactions(date DESC);

-- ============================================================
--  9. COMMUNICATION LOGS (per customer)
-- ============================================================
CREATE TABLE IF NOT EXISTS comm_logs (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  type        VARCHAR(10),  -- 'call' | 'wa' | 'note'
  note        TEXT NOT NULL,
  logged_by   INTEGER REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
--  10. EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id             SERIAL PRIMARY KEY,
  date           DATE DEFAULT CURRENT_DATE,
  category       VARCHAR(100) NOT NULL,
  description    VARCHAR(255) NOT NULL,
  amount         DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(20) DEFAULT 'cash',
  notes          TEXT,
  added_by       INTEGER REFERENCES users(id),
  created_at     TIMESTAMP DEFAULT NOW()
);

-- ============================================================
--  11. QUICK SALES
-- ============================================================
CREATE TABLE IF NOT EXISTS quick_sales (
  id              SERIAL PRIMARY KEY,
  sale_number     VARCHAR(20) UNIQUE NOT NULL,
  customer_name   VARCHAR(100),
  customer_phone  VARCHAR(20),
  items           JSONB DEFAULT '[]'::jsonb,
  subtotal        DECIMAL(10,2) DEFAULT 0,
  discount        DECIMAL(10,2) DEFAULT 0,
  total           DECIMAL(10,2) DEFAULT 0,
  payment_method  VARCHAR(20) DEFAULT 'cash',
  amount_paid     DECIMAL(10,2) DEFAULT 0,
  change_given    DECIMAL(10,2) DEFAULT 0,
  notes           TEXT,
  served_by       INTEGER REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
--  12. CASH DEPOSITS
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_deposits (
  id           SERIAL PRIMARY KEY,
  date         DATE DEFAULT CURRENT_DATE,
  amount       DECIMAL(10,2) NOT NULL,
  bank_name    VARCHAR(100),
  account_no   VARCHAR(50),
  payment_type VARCHAR(20) DEFAULT 'online',  -- online|card|cheque|cash
  reference    VARCHAR(100),
  notes        TEXT,
  added_by     INTEGER REFERENCES users(id),
  order_id     INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);
ALTER TABLE cash_deposits ADD COLUMN IF NOT EXISTS account_no   VARCHAR(50);
ALTER TABLE cash_deposits ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'online';
ALTER TABLE cash_deposits ADD COLUMN IF NOT EXISTS reference    VARCHAR(100);
ALTER TABLE cash_deposits ADD COLUMN IF NOT EXISTS order_id     INTEGER REFERENCES orders(id) ON DELETE SET NULL;

-- ============================================================
--  13. REPAIRS
-- ============================================================
CREATE TABLE IF NOT EXISTS repairs (
  id                 SERIAL PRIMARY KEY,
  repair_number      VARCHAR(20) UNIQUE NOT NULL,
  customer_name      VARCHAR(100),
  phone              VARCHAR(20),
  repair_type        VARCHAR(100) NOT NULL,
  description        TEXT,
  frame_description  TEXT,
  charge             DECIMAL(10,2) DEFAULT 0,
  repair_cost        DECIMAL(10,2) DEFAULT 0,
  advance            DECIMAL(10,2) DEFAULT 0,
  payment_method     VARCHAR(20) DEFAULT 'cash',
  status             VARCHAR(20) DEFAULT 'pending',  -- pending|done|collected
  due_date           DATE,
  notes              TEXT,
  added_by           INTEGER REFERENCES users(id),
  frame_inventory_id INTEGER REFERENCES inventory(id) ON DELETE SET NULL,
  completed_at       TIMESTAMP,
  created_at         TIMESTAMP DEFAULT NOW()
);
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS frame_description  TEXT;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS repair_cost        DECIMAL(10,2) DEFAULT 0;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS advance            DECIMAL(10,2) DEFAULT 0;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS due_date           DATE;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS frame_inventory_id INTEGER REFERENCES inventory(id) ON DELETE SET NULL;

-- ============================================================
--  14. STOCK ADJUSTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id               SERIAL PRIMARY KEY,
  inventory_id     INTEGER REFERENCES inventory(id) ON DELETE SET NULL,
  item_name        VARCHAR(150),
  change_type      VARCHAR(20) NOT NULL,  -- add|remove|correction
  quantity_change  INTEGER NOT NULL,
  quantity_before  INTEGER DEFAULT 0,
  quantity_after   INTEGER DEFAULT 0,
  reason           TEXT,
  notes            TEXT,
  adjusted_by      INTEGER REFERENCES users(id),
  adjusted_by_name VARCHAR(100),
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ============================================================
--  15. LENS PRICES
-- ============================================================
CREATE TABLE IF NOT EXISTS lens_prices (
  id           SERIAL PRIMARY KEY,
  brand        VARCHAR(100) NOT NULL,
  lens_type    VARCHAR(100) NOT NULL,
  lens_index   VARCHAR(20)  NOT NULL,
  color        VARCHAR(50)  NOT NULL,
  coating      VARCHAR(100) NOT NULL,
  uv_cut       BOOLEAN DEFAULT FALSE,
  series       VARCHAR(100),
  buy_price    DECIMAL(10,2) DEFAULT 0,
  sell_price   DECIMAL(10,2) DEFAULT 0,
  power_range  VARCHAR(100),
  fitting_cost DECIMAL(10,2) DEFAULT 0,
  code         VARCHAR(50),
  notes        TEXT,
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

-- ============================================================
--  16. KALUTOTA TRADE ACCOUNT
-- ============================================================
--  INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_customer      ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_deliver       ON orders(deliver_date);
CREATE INDEX IF NOT EXISTS idx_orders_created       ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_refractions_cust     ON refractions(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_order      ON call_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_cust       ON comm_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_cat        ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_customers_phone      ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_expenses_date        ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_quick_sales_created  ON quick_sales(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_deposits_date   ON cash_deposits(date);
ALTER TABLE cash_deposits ADD COLUMN IF NOT EXISTS card_charge DECIMAL(10,2) DEFAULT 0;
ALTER TABLE cash_deposits ADD COLUMN IF NOT EXISTS net_amount  DECIMAL(10,2) DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_repairs_created      ON repairs(created_at);
CREATE INDEX IF NOT EXISTS idx_repairs_status       ON repairs(status);
CREATE INDEX IF NOT EXISTS idx_stock_adj_inventory  ON stock_adjustments(inventory_id);
CREATE INDEX IF NOT EXISTS idx_kalutota_date        ON kalutota_transactions(date);

-- ============================================================
--  DEFAULT ADMIN USER
--  Username: admin  |  Password: admin1234
--  Change this password immediately after first login!
-- ============================================================
INSERT INTO users (username, password, full_name, role)
VALUES (
  'admin',
  '$2b$10$ZnhjrkeIQsCKy0SFTmAWhO5U5FxTsjbNlMmZ7M58WMIVTjp8yuUci',
  'Shop Owner',
  'admin'
) ON CONFLICT (username) DO NOTHING;
-- ============================================================
--  Fix L — Warranty & misc columns missing from original schema
--  Safe to run on existing DB (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- Warranty columns on orders (needed by /api/warranties/check)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_frame       VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_lens        VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_enabled     BOOLEAN       DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_months      INTEGER       DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_start_date  DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_expiry      DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_coverage    TEXT;

-- Payment tracking columns on orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_payment_amount  DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_payment_date    DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_payment_method  VARCHAR(20);

-- Discount columns on orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount      DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_percent     DECIMAL(5,2)  DEFAULT 0;

-- Gift cost tracking (for profit reports)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_cost            DECIMAL(10,2) DEFAULT 0;

-- Customer linkage on quick_sales and repairs
ALTER TABLE quick_sales ADD COLUMN IF NOT EXISTS customer_id     INTEGER;
ALTER TABLE repairs      ADD COLUMN IF NOT EXISTS customer_id     INTEGER;

-- stock_adjustments and stock_batches tables
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
);
CREATE INDEX IF NOT EXISTS idx_stock_adj_inv  ON stock_adjustments(inventory_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_date ON stock_adjustments(created_at DESC);

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
);
CREATE INDEX IF NOT EXISTS idx_batches_inv ON stock_batches(inventory_id);

-- scan_sessions (DB-backed QR scan sessions)
CREATE TABLE IF NOT EXISTS scan_sessions (
  user_id    INTEGER PRIMARY KEY,
  item       JSONB       NOT NULL,
  action     VARCHAR(50) NOT NULL DEFAULT 'new_order',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  STORE EXTENSIONS — E-commerce specific data
--  Extends inventory without modifying it
-- ============================================================

-- store_products: per-item store settings
CREATE TABLE IF NOT EXISTS store_products (
  id               SERIAL PRIMARY KEY,
  inventory_id     INTEGER UNIQUE REFERENCES inventory(id) ON DELETE CASCADE,
  show_on_store    BOOLEAN      DEFAULT FALSE,  -- toggle visibility
  store_price      DECIMAL(10,2),               -- override price (NULL = use inventory sell_price)
  discount_pct     INTEGER      DEFAULT 0,      -- % discount shown on store (0 = no discount)
  discount_label   VARCHAR(50),                 -- e.g. "Sale", "Hot Deal"
  description      TEXT,                        -- rich product description for store
  extra_images     JSONB        DEFAULT '[]',   -- additional image URLs array
  tags             TEXT[],                      -- searchable tags e.g. ['blue cut', 'UV400']
  sort_order       INTEGER      DEFAULT 0,      -- manual sort on store
  created_at       TIMESTAMP    DEFAULT NOW(),
  updated_at       TIMESTAMP    DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_products_inv   ON store_products(inventory_id);
CREATE INDEX IF NOT EXISTS idx_store_products_show  ON store_products(show_on_store);

-- store_reviews: customer product reviews
CREATE TABLE IF NOT EXISTS store_reviews (
  id               SERIAL PRIMARY KEY,
  inventory_id     INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
  customer_name    VARCHAR(100) NOT NULL,
  customer_phone   VARCHAR(20),
  rating           INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text      TEXT,
  verified         BOOLEAN      DEFAULT FALSE,
  approved         BOOLEAN      DEFAULT FALSE,  -- admin approves before showing
  created_at       TIMESTAMP    DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_inv ON store_reviews(inventory_id);

-- promo_codes: discount codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id               SERIAL PRIMARY KEY,
  code             VARCHAR(30)  UNIQUE NOT NULL,
  description      VARCHAR(100),
  discount_type    VARCHAR(10)  DEFAULT 'pct',  -- 'pct' | 'fixed'
  discount_value   DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_uses         INTEGER,
  used_count       INTEGER      DEFAULT 0,
  active           BOOLEAN      DEFAULT TRUE,
  expires_at       TIMESTAMP,
  created_at       TIMESTAMP    DEFAULT NOW()
);

-- store_orders already created by store.js on first order
-- Add columns if missing
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS promo_code      VARCHAR(30);
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS wa_notified     BOOLEAN DEFAULT FALSE;
