-- CYFER: Demo/Seed Data
-- Version: 001
-- Description: Sample data for development and demo purposes
-- IMPORTANT: Run this AFTER 001_initial_schema.sql and 001_rls_policies.sql

-- =====================================================
-- Seed 0: Create demo admin accounts in Supabase Auth
-- These MUST be created first so the UUIDs match the public users table
-- Password for all demo accounts: DemoPassword123!
-- =====================================================

-- Enable pgcrypto for password hashing (should already be enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert into auth.users with known UUIDs so they match public.users
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, confirmation_token
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated',
    'mayor@samplecity.gov.ph',
    crypt('DemoPassword123!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"super_admin"}',
    false, ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated',
    'treasurer@samplecity.gov.ph',
    crypt('DemoPassword123!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"admin"}',
    false, ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated',
    'clerk@samplecity.gov.ph',
    crypt('DemoPassword123!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"admin"}',
    false, ''
  );

-- Insert matching identity records (required for Supabase Auth login to work)
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    jsonb_build_object('sub', '11111111-1111-1111-1111-111111111111', 'email', 'mayor@samplecity.gov.ph'),
    'email', '11111111-1111-1111-1111-111111111111',
    NOW(), NOW(), NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    jsonb_build_object('sub', '22222222-2222-2222-2222-222222222222', 'email', 'treasurer@samplecity.gov.ph'),
    'email', '22222222-2222-2222-2222-222222222222',
    NOW(), NOW(), NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    jsonb_build_object('sub', '33333333-3333-3333-3333-333333333333', 'email', 'clerk@samplecity.gov.ph'),
    'email', '33333333-3333-3333-3333-333333333333',
    NOW(), NOW(), NOW()
  );

-- =====================================================
-- Seed 1: Create demo admin accounts in public.users table
-- UUIDs match the auth.users entries above
-- =====================================================
INSERT INTO users (id, email, name, role, department) VALUES
  ('11111111-1111-1111-1111-111111111111', 'mayor@samplecity.gov.ph', 'Mayor Juan Santos', 'super_admin', 'Office of the Mayor'),
  ('22222222-2222-2222-2222-222222222222', 'treasurer@samplecity.gov.ph', 'Treasurer Maria Cruz', 'admin', 'Treasury Department'),
  ('33333333-3333-3333-3333-333333333333', 'clerk@samplecity.gov.ph', 'Municipal Secretary Pedro Reyes', 'admin', 'Municipal Secretary Office');

-- =====================================================
-- Seed 2: Create genesis block
-- =====================================================
INSERT INTO blockchain (id, timestamp, data, previous_hash, hash, nonce) VALUES
  (0, NOW(), '{"message": "Genesis Block - CYFER Blockchain Initialized", "system": "CYFER v1.0"}', '0', '0000000000000000000000000000000000000000000000000000000000000000', 0);

-- =====================================================
-- Seed 3: Sample budget data for "Municipality of Sample City"
-- =====================================================
INSERT INTO budget_data (fiscal_year, category, allocated_amount, description, uploaded_by) VALUES
  (2026, 'Infrastructure', 15000000.00, 'Road construction, bridges, and public facilities', '11111111-1111-1111-1111-111111111111'),
  (2026, 'Health', 8500000.00, 'Public health services, medical supplies, and hospital equipment', '22222222-2222-2222-2222-222222222222'),
  (2026, 'Education', 12000000.00, 'School building maintenance, educational materials, scholarships', '11111111-1111-1111-1111-111111111111'),
  (2026, 'Social Services', 6000000.00, 'Welfare programs, senior citizen support, disaster relief', '11111111-1111-1111-1111-111111111111'),
  (2026, 'General Administration', 7500000.00, 'Salaries, office supplies, administrative costs', '22222222-2222-2222-2222-222222222222'),
  (2026, 'Public Safety', 5000000.00, 'Police, fire department, emergency services', '11111111-1111-1111-1111-111111111111'),
  (2026, 'Environmental Services', 3500000.00, 'Waste management, sanitation, environmental protection', '11111111-1111-1111-1111-111111111111'),
  (2026, 'Economic Development', 2500000.00, 'Business support, livelihood programs, market development', '22222222-2222-2222-2222-222222222222');

-- =====================================================
-- Seed 4: Sample published document
-- =====================================================
INSERT INTO documents (
  id, title, category, description,
  file_name, file_ext, file_size, file_url, file_hash,
  uploaded_by, status, published_at, created_at
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  'Municipal Ordinance No. 2026-01: Public Market Operating Hours',
  'ordinance',
  'An ordinance regulating the operating hours of the Sample City Public Market',
  'ordinance-2026-01.pdf',
  '.pdf',
  245600,
  'https://placeholder-storage-url.com/ordinance-2026-01.pdf',
  'a1b2c3d4e5f67890111213141516171819202122232425262728293031320a',
  '11111111-1111-1111-1111-111111111111',
  'published',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '10 days'
);

-- =====================================================
-- Seed 5: Sample approval records for the published document
-- =====================================================
INSERT INTO approvals (document_id, admin_id, status, message, responded_at, created_at) VALUES
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'approved', 'Approved. This ordinance aligns with our market regulations.', NOW() - INTERVAL '8 days', NOW() - INTERVAL '10 days'),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'approved', 'Approved. No budget implications.', NOW() - INTERVAL '8 days', NOW() - INTERVAL '10 days'),
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'approved', 'Approved after legal review.', NOW() - INTERVAL '7 days', NOW() - INTERVAL '10 days');

-- =====================================================
-- Seed 6: Sample blockchain block for the published document
-- =====================================================
INSERT INTO blockchain (timestamp, data, previous_hash, hash, nonce) VALUES
  (
    NOW() - INTERVAL '7 days',
    jsonb_build_object(
      'action', 'document_published',
      'document_id', '44444444-4444-4444-4444-444444444444',
      'document_hash', 'a1b2c3d4e5f67890111213141516171819202122232425262728293031320a',
      'title', 'Municipal Ordinance No. 2026-01: Public Market Operating Hours'
    ),
    '0000000000000000000000000000000000000000000000000000000000000000',
    'b1c2d3e4f5a678901213141516171819202122232425262728293031323334',
    123456
  );

-- =====================================================
-- Seed 7: Sample transaction records
-- =====================================================
INSERT INTO transactions (action_type, description, document_id, performed_by, tx_hash, previous_tx_hash, created_at) VALUES
  (
    'upload',
    'Document uploaded: Municipal Ordinance No. 2026-01',
    '44444444-4444-4444-4444-444444444444',
    'Mayor Juan Santos',
    'tx000000000000000000000000000000000000000000000000000000000001',
    '0',
    NOW() - INTERVAL '10 days'
  ),
  (
    'approve',
    'Document approved by Mayor Juan Santos',
    '44444444-4444-4444-4444-444444444444',
    'Mayor Juan Santos',
    'tx000000000000000000000000000000000000000000000000000000000002',
    'tx000000000000000000000000000000000000000000000000000000000001',
    NOW() - INTERVAL '8 days'
  ),
  (
    'approve',
    'Document approved by Treasurer Maria Cruz',
    '44444444-4444-4444-4444-444444444444',
    'Treasurer Maria Cruz',
    'tx000000000000000000000000000000000000000000000000000000000003',
    'tx000000000000000000000000000000000000000000000000000000000002',
    NOW() - INTERVAL '8 days'
  ),
  (
    'approve',
    'Document approved by Municipal Secretary Pedro Reyes',
    '44444444-4444-4444-4444-444444444444',
    'Municipal Secretary Pedro Reyes',
    'tx000000000000000000000000000000000000000000000000000000000004',
    'tx000000000000000000000000000000000000000000000000000000000003',
    NOW() - INTERVAL '7 days'
  ),
  (
    'publish',
    'Document published after unanimous approval',
    '44444444-4444-4444-4444-444444444444',
    'System',
    'tx000000000000000000000000000000000000000000000000000000000005',
    'tx000000000000000000000000000000000000000000000000000000000004',
    NOW() - INTERVAL '7 days'
  );
