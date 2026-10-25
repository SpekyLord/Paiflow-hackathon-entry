-- CYFER: Row Level Security (RLS) Policies
-- Version: 001
-- Description: Security policies for public and admin access

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_data ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- users table policies
-- =====================================================

-- Allow admins to read all users
CREATE POLICY "Admins can read all users"
ON users FOR SELECT
USING (auth.role() = 'authenticated');

-- Only super admins can insert/update/delete users
-- NOTE: Check against public.users table — never use user_metadata (user-editable)
CREATE POLICY "Super admins can manage users"
ON users FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);

-- =====================================================
-- documents table policies
-- =====================================================

-- Anyone can read published documents (public access)
CREATE POLICY "Public can read published documents"
ON documents FOR SELECT
USING (status = 'published');

-- Admins can read all documents
CREATE POLICY "Admins can read all documents"
ON documents FOR SELECT
USING (auth.role() = 'authenticated');

-- Admins can insert documents
CREATE POLICY "Admins can upload documents"
ON documents FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Admins can update their own pending documents
CREATE POLICY "Admins can update own pending documents"
ON documents FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND uploaded_by::text = auth.uid()::text
  AND status = 'pending_approval'
);

-- =====================================================
-- blockchain table policies
-- =====================================================

-- Anyone can read the blockchain (public transparency)
CREATE POLICY "Public can read blockchain"
ON blockchain FOR SELECT
USING (true);

-- Only system (service role) can write to blockchain
CREATE POLICY "Service role can write blockchain"
ON blockchain FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- approvals table policies
-- =====================================================

-- Admins can read approvals
CREATE POLICY "Admins can read approvals"
ON approvals FOR SELECT
USING (auth.role() = 'authenticated');

-- System can create approval requests
CREATE POLICY "Service role can create approvals"
ON approvals FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Admins can update their own approval records
CREATE POLICY "Admins can update own approvals"
ON approvals FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND admin_id::text = auth.uid()::text
  AND status = 'pending'
);

-- =====================================================
-- transactions table policies (Audit Trail)
-- =====================================================

-- Anyone can read transactions (public audit trail)
CREATE POLICY "Public can read transactions"
ON transactions FOR SELECT
USING (true);

-- Only system can write transactions
CREATE POLICY "Service role can write transactions"
ON transactions FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- budget_data table policies
-- =====================================================

-- Anyone can read budget data (public transparency)
CREATE POLICY "Public can read budget data"
ON budget_data FOR SELECT
USING (true);

-- Admins can insert/update budget data
CREATE POLICY "Admins can manage budget data"
ON budget_data FOR ALL
USING (auth.role() = 'authenticated');

-- =====================================================
-- Helper function for checking admin role
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON POLICY "Public can read published documents" ON documents IS 'Citizens can view published documents without authentication';
COMMENT ON POLICY "Public can read blockchain" ON blockchain IS 'Full blockchain transparency for document verification';
COMMENT ON POLICY "Public can read transactions" ON transactions IS 'Public audit trail for accountability';
COMMENT ON POLICY "Public can read budget data" ON budget_data IS 'Budget transparency for citizens';
