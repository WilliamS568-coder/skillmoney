-- COPY EVERYTHING BELOW THIS LINE AND PASTE IT INTO SUPABASE SQL EDITOR --

-- Step 1: Add balance column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS balance DECIMAL(10, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_balance ON profiles(balance);

UPDATE profiles 
SET balance = 0 
WHERE balance IS NULL;

-- Step 2: Fix the trigger to give 1K welcome bonus
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    referral_code,
    balance,
    is_new_user,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    'REF' || substr(md5(random()::text), 1, 8),
    1000,
    true,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Step 3: Add security policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow anonymous insert for registration"
  ON profiles FOR INSERT
  TO anon
  WITH CHECK (true);

-- DON'T COPY BELOW THIS LINE --