-- Add bank details columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS account_name TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_bank_details ON profiles(bank_name, account_number);