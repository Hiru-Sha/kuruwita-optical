-- ============================================================
--  KURUWITA OPTICAL — Full Database Schema
--  Run this in your Supabase SQL Editor
-- ============================================================

-- 1. USERS (staff login)
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR(50) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,        -- bcrypt hashed
  full_name   VARCHAR(100) NOT NULL,
  role        VARCHAR(20) DEFAULT 'staff',  -- 'admin' or 'staff'
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 2. CUSTOMERS
CREATE TABLE customers (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  age         INTEGER,
  phone       VARCHAR(20) NOT NULL,
  address     TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 3. ORDERS
CREATE TABLE orders (
  id              SERIAL PRIMARY KEY,
  order_number    VARCHAR(20) UNIQUE NOT NULL,  -- e.g. KO-0044
  customer_id     INTEGER REFERENCES customers(id),
  frame           VARCHAR(150),
  frame_type      VARCHAR(50),
  lens_type       VARCHAR(100),
  lens_coating    VARCHAR(100),
  lens_company    VARCHAR(50),   -- 'Negombo Optical' | 'Solex Optical' | 'In-Shop'
  lens_step       INTEGER DEFAULT 0,  -- 0=Sent 1=Grinding 2=Ready 3=Received
  total_amount    DECIMAL(10,2) DEFAULT 0,
  advance_amount  DECIMAL(10,2) DEFAULT 0,
  balance_amount  DECIMAL(10,2) DEFAULT 0,
  deliver_date    DATE,
  status          VARCHAR(20) DEFAULT 'created',  -- created|called|delivered|overdue
  has_rx          BOOLEAN DEFAULT FALSE,
  rx_hospital     VARCHAR(150),
  rx_date         DATE,
  rx_doctor       VARCHAR(100),
  rx_returned     BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- 4. REFRACTION RESULTS
CREATE TABLE refractions (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id),
  -- Right eye
  r_sph       VARCHAR(10),
  r_cyl       VARCHAR(10),
  r_axis      VARCHAR(10),
  r_add       VARCHAR(10),
  r_va        VARCHAR(10),
  r_pd        VARCHAR(10),
  -- Left eye
  l_sph       VARCHAR(10),
  l_cyl       VARCHAR(10),
  l_axis      VARCHAR(10),
  l_add       VARCHAR(10),
  l_va        VARCHAR(10),
  l_pd        VARCHAR(10),
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 5. CALL LOGS (per order)
CREATE TABLE call_logs (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  logged_by   INTEGER REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 6. INVENTORY
CREATE TABLE inventory (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  brand         VARCHAR(100),
  category      VARCHAR(50),   -- Frames|Sunglasses|Reading Glasses|Ear Tips|Glass Cleaner|Cases|Other
  dealer        VARCHAR(100),
  sell_price    DECIMAL(10,2) DEFAULT 0,
  cost_price    DECIMAL(10,2) DEFAULT 0,
  quantity      INTEGER DEFAULT 0,
  min_quantity  INTEGER DEFAULT 2,
  image_url     TEXT,          -- URL to stored image
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- 7. DEALERS
CREATE TABLE dealers (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  area          VARCHAR(100),
  phone         VARCHAR(20),
  rep_name      VARCHAR(100),
  categories    TEXT[],        -- array of categories supplied
  total_spent   DECIMAL(10,2) DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 8. PURCHASES (from dealers)
CREATE TABLE purchases (
  id          SERIAL PRIMARY KEY,
  dealer_id   INTEGER REFERENCES dealers(id),
  items       TEXT NOT NULL,
  amount      DECIMAL(10,2) DEFAULT 0,
  purchased_at DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 9. COMMUNICATION LOGS (per customer)
CREATE TABLE comm_logs (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  type        VARCHAR(10),  -- 'call' | 'wa' | 'note'
  note        TEXT NOT NULL,
  logged_by   INTEGER REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
--  INDEXES for fast search
-- ============================================================
CREATE INDEX idx_orders_customer    ON orders(customer_id);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_orders_deliver     ON orders(deliver_date);
CREATE INDEX idx_refractions_cust   ON refractions(customer_id);
CREATE INDEX idx_call_logs_order    ON call_logs(order_id);
CREATE INDEX idx_comm_logs_cust     ON comm_logs(customer_id);
CREATE INDEX idx_inventory_cat      ON inventory(category);
CREATE INDEX idx_customers_phone    ON customers(phone);

-- ============================================================
--  DEFAULT ADMIN USER  (password: admin1234)
--  Change this password immediately after first login!
-- ============================================================
INSERT INTO users (username, password, full_name, role) VALUES
  ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Shop Owner', 'admin'),
  ('staff1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Staff Member', 'staff');
