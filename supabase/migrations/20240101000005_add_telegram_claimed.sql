-- Add telegram_claimed column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS telegram_claimed BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_claimed ON profiles(telegram_claimed);

-- Update existing profiles to FALSE (not claimed)
UPDATE profiles 
SET telegram_claimed = FALSE 
WHERE telegram_claimed IS NULL;