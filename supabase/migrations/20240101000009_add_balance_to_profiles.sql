-- Add balance column to profiles table for welcome bonus
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS balance DECIMAL(10, 2) DEFAULT 0;

-- Create index for faster balance queries
CREATE INDEX IF NOT EXISTS idx_profiles_balance ON profiles(balance);

-- Update existing profiles to have 0 balance if NULL
UPDATE profiles 
SET balance = 0 
WHERE balance IS NULL;