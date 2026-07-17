# Skill Money - Admin Panel Setup Guide

## 🔧 Database Setup (REQUIRED)

### Step 1: Create Tables and Enable RLS

Go to your **Supabase Dashboard** → **SQL Editor** and run these commands:

```sql
-- 1. Create recharge_requests table
CREATE TABLE IF NOT EXISTS recharge_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  receipt_url TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_recharge_requests_user_id ON recharge_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_recharge_requests_status ON recharge_requests(status);

-- 3. Enable Row Level Security
ALTER TABLE recharge_requests ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for recharge_requests
CREATE POLICY "Users can view their own recharge requests"
  ON recharge_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recharge requests"
  ON recharge_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view all recharge requests"
  ON recharge_requests
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update recharge requests"
  ON recharge_requests
  FOR UPDATE
  USING (auth.role() = 'authenticated');
```

### Step 2: Create Storage Bucket for Receipts

1. Go to **Supabase Dashboard** → **Storage**
2. Click **New bucket**
3. Name: `receipts`
4. Set as **Public**: ✅ Yes
5. Click **Create**

### Step 3: Run Storage Policies

In **SQL Editor**, run:

```sql
-- Allow authenticated users to upload receipts
CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.role() = 'authenticated'
  );

-- Allow public to view receipts
CREATE POLICY "Public can view receipts"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'receipts');

-- Allow users to update their own receipts
CREATE POLICY "Users can update their own receipts"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Step 4: Fix Profiles Table RLS (IMPORTANT!)

The issue with only 1 user showing is because the `profiles` table has RLS enabled. You need to create a policy to allow admins to view all users:

```sql
-- Allow authenticated users to view all profiles (for admin panel)
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);
```

## 🔐 How to Access Admin Panel

### Method 1: Via URL (Current Method)

1. Log in with an admin account
2. Navigate to: `http://localhost:5173/#admin`
3. The admin panel will show automatically

### Method 2: Make Your Account Admin

**Option A - Update email in code:**
Edit `src/App.jsx` line 63 and add your email:
```javascript
const isAdminUser = user.user_metadata?.role === 'admin' || 
                    user.email === 'towolawisolomon111@gmail.com' ||
                    user.email === 'your-email@example.com';
```

**Option B - Set admin role in Supabase:**
1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find your user and click **Edit**
3. In **User Metadata** (JSON), add: `{"role": "admin"}`
4. Save

## 🎯 Complete User Flow

### Recharge Flow:
1. User clicks **"Recharge"** button
2. Enters amount (minimum ₦5,000)
3. Selects payment method (PAY-1, PAY-2, PAY-3)
4. Views bank account details (FCMB)
5. Clicks **"I have made the transfer"**
6. Uploads receipt screenshot
7. Sees success message: "Receipt submitted! Waiting for admin approval"
8. Dashboard shows yellow alert: "PENDING RECHARGE"

### Admin Approval Flow:
1. Admin navigates to `/#admin`
2. Clicks **"Recharges"** tab
3. Sees all recharge requests with:
   - User name & email
   - Amount
   - Payment method
   - Receipt button (click to view)
   - Status badge
4. Clicks **✓** to approve (adds balance to user)
5. Or clicks **✗** to reject

## 🐛 Troubleshooting

### Issue: "Failed to load resource: server responded with 400"
**Solution**: Run the SQL migration in Step 1

### Issue: "Only 1 user showing in admin panel"
**Solution**: Run the RLS policies in Step 4

### Issue: "Receipt not showing"
**Solution**: 
1. Make sure you created the `receipts` storage bucket
2. Run the storage policies in Step 3

### Issue: "Error fetching recharge requests"
**Solution**: The table doesn't exist yet. Run the SQL in Step 1.

## 📊 Database Schema

### recharge_requests table:
- `id` - UUID primary key
- `user_id` - References auth.users(id)
- `amount` - Recharge amount
- `receipt_url` - URL to uploaded receipt in storage
- `payment_method` - PAY-1, PAY-2, or PAY-3
- `status` - pending, approved, or rejected
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Storage Bucket: `receipts`
- Public bucket for storing receipt images
- Files named: `{user_id}-{timestamp}.{extension}`

## ✅ Verification Checklist

- [ ] Ran SQL migration to create `recharge_requests` table
- [ ] Created `receipts` storage bucket (public)
- [ ] Ran storage policies SQL
- [ ] Ran profiles RLS policies SQL
- [ ] Added your email to admin check in App.jsx (or set admin role in Supabase)
- [ ] Tested recharge flow as regular user
- [ ] Tested admin panel access at `/#admin`
- [ ] Verified receipt upload works
- [ ] Verified admin can approve/reject recharges