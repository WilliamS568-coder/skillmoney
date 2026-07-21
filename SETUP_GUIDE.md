# Skill Money - Welcome Bonus Fix Guide

## Problem
The 1K welcome bonus was not working for new users.

## Root Causes
1. **Missing database column**: The `balance` column didn't exist in the `profiles` table
2. **Wrong trigger value**: The database trigger was setting `balance: 0` instead of `balance: 1000`
3. **Missing RLS policies**: No Row Level Security policies for the `profiles` table

## Solution Applied

### 1. Created Database Migration for Balance Column
**File**: `supabase/migrations/20240101000009_add_balance_to_profiles.sql`
- Adds `balance` column (DECIMAL 10,2) to profiles table
- Sets default value to 0
- Creates index for faster queries
- Updates existing NULL balances to 0

### 2. Fixed Database Trigger
**File**: `supabase/migrations/20240101000003_fix_profile_trigger.sql`
- Changed balance from `0` to `1000` (welcome bonus)
- Added `is_new_user: true` flag
- New users now automatically get ₦1,000 on registration

### 3. Added RLS Policies
**File**: `supabase/migrations/20240101000010_add_rls_policies_for_profiles.sql`
- Enables Row Level Security on profiles table
- Allows users to view/update their own profile
- Allows anonymous users to insert during registration

## How to Apply the Fix

### Step 1: Run Migrations in Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Run each migration file in order:

```sql
-- Run this first (if not already run)
-- supabase/migrations/20240101000009_add_balance_to_profiles.sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS balance DECIMAL(10, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_balance ON profiles(balance);

UPDATE profiles 
SET balance = 0 
WHERE balance IS NULL;
```

```sql
-- Run this second
-- supabase/migrations/20240101000003_fix_profile_trigger.sql
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
    1000,  -- Welcome bonus of 1000 NGN
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

UPDATE profiles 
SET full_name = 'User'
WHERE full_name IS NULL;
```

```sql
-- Run this third
-- supabase/migrations/20240101000010_add_rls_policies_for_profiles.sql
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
```

### Step 2: Test the Fix

1. Open your app in the browser
2. Register a new account
3. After login, check the dashboard balance
4. You should see **₦1,000** as your starting balance
5. The welcome modal should appear confirming the bonus

## What Happens Now

### For New Users:
1. User registers with email/password
2. Database trigger automatically creates profile with:
   - `balance: 1000` (1K welcome bonus)
   - `is_new_user: true`
3. User logs in and sees welcome modal
4. Balance displays as ₦1,000 in dashboard

### For Existing Users:
- Their balance remains unchanged
- They won't see the welcome modal (already marked as not new)

## Verification

Check your Supabase database:
```sql
-- Verify the balance column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'balance';

-- Verify a test user has the bonus
SELECT id, email, balance, is_new_user 
FROM profiles 
WHERE email = 'your-test-email@example.com';
```

## Troubleshooting

### If balance is still 0:
1. Make sure you ran ALL three migrations in order
2. Check Supabase logs for any errors
3. Verify the trigger exists: 
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

### If registration fails:
1. Check RLS policies are correctly applied
2. Verify the `profiles` table allows inserts from `anon` role
3. Check browser console for error messages

### If welcome modal doesn't show:
1. Verify `is_new_user` column exists and is set to `true`
2. Check Dashboard.jsx is reading the profile correctly
3. Clear browser cache and test with incognito mode

## Files Modified

1. ✅ `supabase/migrations/20240101000009_add_balance_to_profiles.sql` - NEW
2. ✅ `supabase/migrations/20240101000003_fix_profile_trigger.sql` - UPDATED
3. ✅ `supabase/migrations/20240101000010_add_rls_policies_for_profiles.sql` - NEW
4. ✅ `src/components/register.jsx` - Already had balance: 1000 (no changes needed)
5. ✅ `src/components/WelcomeModal.jsx` - Already displays welcome message (no changes needed)
6. ✅ `src/components/Dashboard.jsx` - Already shows modal for new users (no changes needed)

## Support

If you encounter issues:
1. Check the Supabase dashboard logs
2. Verify all migrations ran successfully
3. Test with a fresh registration (use incognito mode)
4. Check browser console for frontend errors