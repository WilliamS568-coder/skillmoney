-- Fix the profile creation trigger to include full_name from auth metadata

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create or replace the function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles with data from auth metadata
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
    NEW.raw_user_meta_data->>'full_name',  -- Get full_name from auth metadata
    NEW.email,
    'REF' || substr(md5(random()::text), 1, 8),  -- Generate unique referral code
    1000,  -- Welcome bonus of 1000 NGN
    true,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update existing profiles that have NULL full_name
UPDATE profiles 
SET full_name = 'User'
WHERE full_name IS NULL;