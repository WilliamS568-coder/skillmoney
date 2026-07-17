-- Add referral tracking columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referred_by TEXT,
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_earnings DECIMAL(10, 2) DEFAULT 0;

-- Create function to handle referral bonuses
CREATE OR REPLACE FUNCTION handle_referral_bonus()
RETURNS TRIGGER AS $$
BEGIN
  -- If new user was referred by someone
  IF NEW.referred_by IS NOT NULL AND NEW.referred_by != '' THEN
    
    -- Find the referrer
    UPDATE profiles 
    SET 
      referral_count = referral_count + 1,
      referral_earnings = referral_earnings + 400,
      balance = balance + 400
    WHERE referral_code = NEW.referred_by;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically add referral bonus
DROP TRIGGER IF EXISTS on_user_registered ON profiles;
CREATE TRIGGER on_user_registered
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_referral_bonus();

-- Create index for faster referral lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);