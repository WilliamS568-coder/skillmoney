-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  vip_level VARCHAR(10) UNIQUE NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  daily_income DECIMAL(10, 2) NOT NULL,
  total_income DECIMAL(10, 2) NOT NULL,
  validity_days INTEGER DEFAULT 7,
  status VARCHAR(20) DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user purchases table
CREATE TABLE IF NOT EXISTS user_purchases (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_paid DECIMAL(10, 2) NOT NULL,
  total_earned DECIMAL(10, 2) DEFAULT 0,
  days_claimed INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily income claims table
CREATE TABLE IF NOT EXISTS daily_income_claims (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id INTEGER REFERENCES user_purchases(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  claim_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, purchase_id, claim_date)
);

-- Insert sample products (7 days validity)
INSERT INTO products (vip_level, price, daily_income, total_income, validity_days, status) VALUES
  ('VIP 1', 5000, 1315, 9205, 7, 'available'),
  ('VIP 2', 10000, 2631, 18417, 7, 'available'),
  ('VIP 3', 20000, 5263, 36841, 7, 'available'),
  ('VIP 4', 50000, 13157, 92099, 7, 'available'),
  ('VIP 5', 100000, 26315, 184205, 7, 'coming_soon'),
  ('VIP 6', 200000, 52630, 368410, 7, 'coming_soon')
ON CONFLICT (vip_level) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_status ON user_purchases(status);
CREATE INDEX IF NOT EXISTS idx_daily_income_claims_user_id ON daily_income_claims(user_id);