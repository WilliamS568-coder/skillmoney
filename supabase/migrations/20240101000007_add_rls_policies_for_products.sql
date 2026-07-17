-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy for products - allow all authenticated users to read
CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

-- Enable RLS on user_purchases table
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own purchases
CREATE POLICY "Users can view their own purchases"
  ON user_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own purchases
CREATE POLICY "Users can insert their own purchases"
  ON user_purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own purchases
CREATE POLICY "Users can update their own purchases"
  ON user_purchases FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS on daily_income_claims table
ALTER TABLE daily_income_claims ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own daily income claims
CREATE POLICY "Users can view their own daily income claims"
  ON daily_income_claims FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own daily income claims
CREATE POLICY "Users can insert their own daily income claims"
  ON daily_income_claims FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own daily income claims
CREATE POLICY "Users can update their own daily income claims"
  ON daily_income_claims FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);