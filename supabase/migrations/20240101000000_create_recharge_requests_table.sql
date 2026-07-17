-- Create recharge_requests table
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_recharge_requests_user_id ON recharge_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_recharge_requests_status ON recharge_requests(status);

-- Enable Row Level Security
ALTER TABLE recharge_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own recharge requests
CREATE POLICY "Users can view their own recharge requests"
  ON recharge_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own recharge requests
CREATE POLICY "Users can insert their own recharge requests"
  ON recharge_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for admins to view all recharge requests
-- Note: Admin check is done in the application code, this policy allows authenticated users to read
CREATE POLICY "Authenticated users can view all recharge requests"
  ON recharge_requests
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create policy for admins to update recharge requests
-- Note: Admin check is done in the application code
CREATE POLICY "Authenticated users can update recharge requests"
  ON recharge_requests
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create a storage bucket for receipts (run this in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- Create storage policy to allow authenticated users to upload receipts
-- CREATE POLICY "Authenticated users can upload receipts"
--   ON storage.objects
--   FOR INSERT
--   WITH CHECK (
--     bucket_id = 'receipts'
--     AND auth.role() = 'authenticated'
--   );

-- Create storage policy to allow public to view receipts
-- CREATE POLICY "Public can view receipts"
--   ON storage.objects
--   FOR SELECT
--   USING (bucket_id = 'receipts');

-- Create storage policy to allow users to update their own receipts
-- CREATE POLICY "Users can update their own receipts"
--   ON storage.objects
--   FOR UPDATE
--   USING (
--     bucket_id = 'receipts'
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );