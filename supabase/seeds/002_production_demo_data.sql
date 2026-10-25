-- CYFER: Production Demo Data
-- Version: 002
-- Description: Realistic demo data for video demonstration
-- IMPORTANT: Run AFTER 001_demo_data.sql. Uses the real auth UUIDs from Supabase.
--
-- UPDATE THESE UUIDs to match your actual Supabase Auth users:
-- Mayor:     d471eda7-f4a7-42ab-b835-541756fce3e3
-- Treasurer: 159291dd-7701-4264-995b-6e31295bf930
-- Clerk:     c28d6485-36a0-42ef-b144-6ebf4fab3ad0

-- =====================================================
-- Update users table with correct auth UUIDs (if needed)
-- =====================================================
-- These should already be correct from Phase 4.1 fixes.
-- If not, run:
-- UPDATE users SET id = 'd471eda7-f4a7-42ab-b835-541756fce3e3' WHERE email = 'mayor@samplecity.gov.ph';
-- UPDATE users SET id = '159291dd-7701-4264-995b-6e31295bf930' WHERE email = 'treasurer@samplecity.gov.ph';
-- UPDATE users SET id = 'c28d6485-36a0-42ef-b144-6ebf4fab3ad0' WHERE email = 'clerk@samplecity.gov.ph';

-- =====================================================
-- Additional Published Documents (5 more for a rich demo)
-- =====================================================

-- Document 2: Annual Budget
INSERT INTO documents (
  id, title, category, description,
  file_name, file_ext, file_size, file_url, file_hash,
  uploaded_by, status, published_at, created_at
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  'Annual Budget Appropriation FY 2026 - Municipality of Sample City',
  'budget',
  'The annual general appropriations for the Municipality of Sample City for Fiscal Year 2026, allocating PHP 60,000,000 across 8 sectors including infrastructure, health, education, and social services.',
  'annual-budget-fy2026.pdf',
  '.pdf',
  512000,
  'https://placeholder-storage-url.com/annual-budget-fy2026.pdf',
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'd471eda7-f4a7-42ab-b835-541756fce3e3',
  'published',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '8 days'
);

-- Document 3: Infrastructure Resolution
INSERT INTO documents (
  id, title, category, description,
  file_name, file_ext, file_size, file_url, file_hash,
  uploaded_by, status, published_at, created_at
) VALUES (
  '66666666-6666-6666-6666-666666666666',
  'Resolution No. 2026-05: Road Improvement Project Barangay San Isidro',
  'resolution',
  'A resolution authorizing the implementation of the road improvement project in Barangay San Isidro, with a total project cost of PHP 3,500,000 funded from the infrastructure budget allocation.',
  'resolution-2026-05-road-improvement.pdf',
  '.pdf',
  198400,
  'https://placeholder-storage-url.com/resolution-2026-05-road-improvement.pdf',
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  '159291dd-7701-4264-995b-6e31295bf930',
  'published',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '6 days'
);

-- Document 4: Contract
INSERT INTO documents (
  id, title, category, description,
  file_name, file_ext, file_size, file_url, file_hash,
  uploaded_by, status, published_at, created_at
) VALUES (
  '77777777-7777-7777-7777-777777777777',
  'Contract: Medical Supplies Procurement Q1 2026',
  'contract',
  'Procurement contract for medical supplies and equipment for the Municipal Health Office covering January to March 2026. Total contract value: PHP 1,200,000.',
  'contract-medical-supplies-q1-2026.pdf',
  '.pdf',
  345600,
  'https://placeholder-storage-url.com/contract-medical-supplies-q1-2026.pdf',
  'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
  'd471eda7-f4a7-42ab-b835-541756fce3e3',
  'published',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '5 days'
);

-- Document 5: Permit
INSERT INTO documents (
  id, title, category, description,
  file_name, file_ext, file_size, file_url, file_hash,
  uploaded_by, status, published_at, created_at
) VALUES (
  '88888888-8888-8888-8888-888888888888',
  'Environmental Compliance Certificate: Waste Management Facility',
  'permit',
  'Environmental compliance certificate issued for the new waste management and recycling facility in Barangay Rizal. Includes environmental impact assessment and mitigation measures.',
  'ecc-waste-management-2026.pdf',
  '.pdf',
  278000,
  'https://placeholder-storage-url.com/ecc-waste-management-2026.pdf',
  '3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d',
  'c28d6485-36a0-42ef-b144-6ebf4fab3ad0',
  'published',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '4 days'
);

-- Document 6: Ordinance (another one)
INSERT INTO documents (
  id, title, category, description,
  file_name, file_ext, file_size, file_url, file_hash,
  uploaded_by, status, published_at, created_at
) VALUES (
  '99999999-9999-9999-9999-999999999999',
  'Ordinance No. 2026-03: Anti-Littering and Clean Streets Program',
  'ordinance',
  'An ordinance establishing the Clean Streets Program for the Municipality of Sample City, imposing penalties for littering, and creating a community clean-up schedule with citizen volunteers.',
  'ordinance-2026-03-clean-streets.pdf',
  '.pdf',
  189000,
  'https://placeholder-storage-url.com/ordinance-2026-03-clean-streets.pdf',
  '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
  'd471eda7-f4a7-42ab-b835-541756fce3e3',
  'published',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '3 days'
);

-- Document 7: Pending Approval (for demo of UCP flow)
INSERT INTO documents (
  id, title, category, description,
  file_name, file_ext, file_size, file_url, file_hash,
  uploaded_by, status, published_at, created_at
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Resolution No. 2026-08: Senior Citizen Discount Extension',
  'resolution',
  'A resolution extending the 20% senior citizen discount to include additional services such as public transportation, municipal parking, and government processing fees.',
  'resolution-2026-08-senior-discount.pdf',
  '.pdf',
  156000,
  'https://placeholder-storage-url.com/resolution-2026-08-senior-discount.pdf',
  'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
  '159291dd-7701-4264-995b-6e31295bf930',
  'pending_approval',
  NULL,
  NOW() - INTERVAL '1 day'
);

-- =====================================================
-- Approval records for all published documents
-- =====================================================

-- Approvals for Document 2 (Annual Budget)
INSERT INTO approvals (document_id, admin_id, status, message, responded_at, created_at) VALUES
  ('55555555-5555-5555-5555-555555555555', 'd471eda7-f4a7-42ab-b835-541756fce3e3', 'approved', 'Budget allocations are properly distributed. Approved.', NOW() - INTERVAL '6 days', NOW() - INTERVAL '8 days'),
  ('55555555-5555-5555-5555-555555555555', '159291dd-7701-4264-995b-6e31295bf930', 'approved', 'Treasury review complete. All figures verified.', NOW() - INTERVAL '6 days', NOW() - INTERVAL '8 days'),
  ('55555555-5555-5555-5555-555555555555', 'c28d6485-36a0-42ef-b144-6ebf4fab3ad0', 'approved', 'Approved after review. Consistent with prior year adjustments.', NOW() - INTERVAL '5 days', NOW() - INTERVAL '8 days');

-- Approvals for Document 3 (Road Improvement)
INSERT INTO approvals (document_id, admin_id, status, message, responded_at, created_at) VALUES
  ('66666666-6666-6666-6666-666666666666', 'd471eda7-f4a7-42ab-b835-541756fce3e3', 'approved', 'Infrastructure project aligns with development plan.', NOW() - INTERVAL '5 days', NOW() - INTERVAL '6 days'),
  ('66666666-6666-6666-6666-666666666666', '159291dd-7701-4264-995b-6e31295bf930', 'approved', 'Budget allocation confirmed from infrastructure fund.', NOW() - INTERVAL '5 days', NOW() - INTERVAL '6 days'),
  ('66666666-6666-6666-6666-666666666666', 'c28d6485-36a0-42ef-b144-6ebf4fab3ad0', 'approved', 'Legal review passed. Approved.', NOW() - INTERVAL '4 days', NOW() - INTERVAL '6 days');

-- Approvals for Document 4 (Medical Supplies)
INSERT INTO approvals (document_id, admin_id, status, message, responded_at, created_at) VALUES
  ('77777777-7777-7777-7777-777777777777', 'd471eda7-f4a7-42ab-b835-541756fce3e3', 'approved', 'Procurement follows PhilGEPS procedures. Approved.', NOW() - INTERVAL '4 days', NOW() - INTERVAL '5 days'),
  ('77777777-7777-7777-7777-777777777777', '159291dd-7701-4264-995b-6e31295bf930', 'approved', 'Contract value within health budget allocation. Approved.', NOW() - INTERVAL '4 days', NOW() - INTERVAL '5 days'),
  ('77777777-7777-7777-7777-777777777777', 'c28d6485-36a0-42ef-b144-6ebf4fab3ad0', 'approved', 'Approved. Supplies list verified against health office request.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '5 days');

-- Approvals for Document 5 (Environmental Permit)
INSERT INTO approvals (document_id, admin_id, status, message, responded_at, created_at) VALUES
  ('88888888-8888-8888-8888-888888888888', 'd471eda7-f4a7-42ab-b835-541756fce3e3', 'approved', 'Environmental impact assessment is thorough. Approved.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '4 days'),
  ('88888888-8888-8888-8888-888888888888', '159291dd-7701-4264-995b-6e31295bf930', 'approved', 'Approved. Budget for mitigation measures accounted for.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '4 days'),
  ('88888888-8888-8888-8888-888888888888', 'c28d6485-36a0-42ef-b144-6ebf4fab3ad0', 'approved', 'Compliance with DENR requirements confirmed. Approved.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '4 days');

-- Approvals for Document 6 (Clean Streets Ordinance)
INSERT INTO approvals (document_id, admin_id, status, message, responded_at, created_at) VALUES
  ('99999999-9999-9999-9999-999999999999', 'd471eda7-f4a7-42ab-b835-541756fce3e3', 'approved', 'Clean Streets Program will improve our city image. Fully approved.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 days'),
  ('99999999-9999-9999-9999-999999999999', '159291dd-7701-4264-995b-6e31295bf930', 'approved', 'Minimal budget impact. Approved.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 days'),
  ('99999999-9999-9999-9999-999999999999', 'c28d6485-36a0-42ef-b144-6ebf4fab3ad0', 'approved', 'Legal framework is sound. Penalties are reasonable. Approved.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 days');

-- Pending approvals for Document 7 (Senior Discount - pending)
INSERT INTO approvals (document_id, admin_id, status, message, responded_at, created_at) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd471eda7-f4a7-42ab-b835-541756fce3e3', 'pending', NULL, NULL, NOW() - INTERVAL '1 day'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '159291dd-7701-4264-995b-6e31295bf930', 'approved', 'Budget impact is manageable. Approved from treasury.', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '1 day'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c28d6485-36a0-42ef-b144-6ebf4fab3ad0', 'pending', NULL, NULL, NOW() - INTERVAL '1 day');

-- =====================================================
-- Blockchain blocks for new documents
-- =====================================================

INSERT INTO blockchain (timestamp, data, previous_hash, hash, nonce) VALUES
  (
    NOW() - INTERVAL '5 days',
    jsonb_build_object('action', 'document_published', 'document_id', '55555555-5555-5555-5555-555555555555', 'document_hash', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'title', 'Annual Budget Appropriation FY 2026'),
    'b1c2d3e4f5a678901213141516171819202122232425262728293031323334',
    'c2d3e4f5a6b789012314151617181920212223242526272829303132333435',
    234567
  ),
  (
    NOW() - INTERVAL '4 days',
    jsonb_build_object('action', 'document_published', 'document_id', '66666666-6666-6666-6666-666666666666', 'document_hash', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'title', 'Resolution No. 2026-05: Road Improvement Project'),
    'c2d3e4f5a6b789012314151617181920212223242526272829303132333435',
    'd3e4f5a6b7c8901234151617181920212223242526272829303132333435f6',
    345678
  ),
  (
    NOW() - INTERVAL '3 days',
    jsonb_build_object('action', 'document_published', 'document_id', '77777777-7777-7777-7777-777777777777', 'document_hash', 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb', 'title', 'Contract: Medical Supplies Procurement Q1 2026'),
    'd3e4f5a6b7c8901234151617181920212223242526272829303132333435f6',
    'e4f5a6b7c8d90123451617181920212223242526272829303132333435f6a7',
    456789
  ),
  (
    NOW() - INTERVAL '2 days',
    jsonb_build_object('action', 'document_published', 'document_id', '88888888-8888-8888-8888-888888888888', 'document_hash', '3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d', 'title', 'Environmental Compliance Certificate: Waste Management Facility'),
    'e4f5a6b7c8d90123451617181920212223242526272829303132333435f6a7',
    'f5a6b7c8d9e01234561718192021222324252627282930313233343536a7b8',
    567890
  ),
  (
    NOW() - INTERVAL '1 day',
    jsonb_build_object('action', 'document_published', 'document_id', '99999999-9999-9999-9999-999999999999', 'document_hash', '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824', 'title', 'Ordinance No. 2026-03: Anti-Littering and Clean Streets Program'),
    'f5a6b7c8d9e01234561718192021222324252627282930313233343536a7b8',
    'a6b7c8d9e0f123456718192021222324252627282930313233343536a7b8c9',
    678901
  );

-- =====================================================
-- Additional audit trail transactions
-- =====================================================

-- Document 2 transactions
INSERT INTO transactions (action_type, description, document_id, performed_by, tx_hash, previous_tx_hash, created_at) VALUES
  ('upload', 'Document uploaded: Annual Budget Appropriation FY 2026', '55555555-5555-5555-5555-555555555555', 'Mayor Juan Santos', 'tx000000000000000000000000000000000000000000000000000000000006', 'tx000000000000000000000000000000000000000000000000000000000005', NOW() - INTERVAL '8 days'),
  ('approve', 'Document approved by Mayor Juan Santos', '55555555-5555-5555-5555-555555555555', 'Mayor Juan Santos', 'tx000000000000000000000000000000000000000000000000000000000007', 'tx000000000000000000000000000000000000000000000000000000000006', NOW() - INTERVAL '6 days'),
  ('approve', 'Document approved by Treasurer Maria Cruz', '55555555-5555-5555-5555-555555555555', 'Treasurer Maria Cruz', 'tx000000000000000000000000000000000000000000000000000000000008', 'tx000000000000000000000000000000000000000000000000000000000007', NOW() - INTERVAL '6 days'),
  ('approve', 'Document approved by Municipal Secretary Pedro Reyes', '55555555-5555-5555-5555-555555555555', 'Municipal Secretary Pedro Reyes', 'tx000000000000000000000000000000000000000000000000000000000009', 'tx000000000000000000000000000000000000000000000000000000000008', NOW() - INTERVAL '5 days'),
  ('publish', 'Document published: Annual Budget Appropriation FY 2026', '55555555-5555-5555-5555-555555555555', 'System', 'tx000000000000000000000000000000000000000000000000000000000010', 'tx000000000000000000000000000000000000000000000000000000000009', NOW() - INTERVAL '5 days');

-- Document 3 transactions
INSERT INTO transactions (action_type, description, document_id, performed_by, tx_hash, previous_tx_hash, created_at) VALUES
  ('upload', 'Document uploaded: Resolution No. 2026-05 Road Improvement', '66666666-6666-6666-6666-666666666666', 'Treasurer Maria Cruz', 'tx000000000000000000000000000000000000000000000000000000000011', 'tx000000000000000000000000000000000000000000000000000000000010', NOW() - INTERVAL '6 days'),
  ('approve', 'Document approved by all officials', '66666666-6666-6666-6666-666666666666', 'System', 'tx000000000000000000000000000000000000000000000000000000000012', 'tx000000000000000000000000000000000000000000000000000000000011', NOW() - INTERVAL '4 days'),
  ('publish', 'Document published: Resolution No. 2026-05', '66666666-6666-6666-6666-666666666666', 'System', 'tx000000000000000000000000000000000000000000000000000000000013', 'tx000000000000000000000000000000000000000000000000000000000012', NOW() - INTERVAL '4 days');

-- Document 4 transactions
INSERT INTO transactions (action_type, description, document_id, performed_by, tx_hash, previous_tx_hash, created_at) VALUES
  ('upload', 'Document uploaded: Contract Medical Supplies Q1 2026', '77777777-7777-7777-7777-777777777777', 'Mayor Juan Santos', 'tx000000000000000000000000000000000000000000000000000000000014', 'tx000000000000000000000000000000000000000000000000000000000013', NOW() - INTERVAL '5 days'),
  ('approve', 'Document approved by all officials', '77777777-7777-7777-7777-777777777777', 'System', 'tx000000000000000000000000000000000000000000000000000000000015', 'tx000000000000000000000000000000000000000000000000000000000014', NOW() - INTERVAL '3 days'),
  ('publish', 'Document published: Medical Supplies Procurement Contract', '77777777-7777-7777-7777-777777777777', 'System', 'tx000000000000000000000000000000000000000000000000000000000016', 'tx000000000000000000000000000000000000000000000000000000000015', NOW() - INTERVAL '3 days');

-- Document 5 & 6 transactions
INSERT INTO transactions (action_type, description, document_id, performed_by, tx_hash, previous_tx_hash, created_at) VALUES
  ('upload', 'Document uploaded: Environmental Compliance Certificate', '88888888-8888-8888-8888-888888888888', 'Municipal Secretary Pedro Reyes', 'tx000000000000000000000000000000000000000000000000000000000017', 'tx000000000000000000000000000000000000000000000000000000000016', NOW() - INTERVAL '4 days'),
  ('publish', 'Document published: Environmental Compliance Certificate', '88888888-8888-8888-8888-888888888888', 'System', 'tx000000000000000000000000000000000000000000000000000000000018', 'tx000000000000000000000000000000000000000000000000000000000017', NOW() - INTERVAL '2 days'),
  ('upload', 'Document uploaded: Ordinance No. 2026-03 Clean Streets Program', '99999999-9999-9999-9999-999999999999', 'Mayor Juan Santos', 'tx000000000000000000000000000000000000000000000000000000000019', 'tx000000000000000000000000000000000000000000000000000000000018', NOW() - INTERVAL '3 days'),
  ('publish', 'Document published: Anti-Littering and Clean Streets Program', '99999999-9999-9999-9999-999999999999', 'System', 'tx000000000000000000000000000000000000000000000000000000000020', 'tx000000000000000000000000000000000000000000000000000000000019', NOW() - INTERVAL '1 day');

-- Verification events
INSERT INTO transactions (action_type, description, document_id, performed_by, tx_hash, previous_tx_hash, created_at) VALUES
  ('verify', 'Document verified by citizen: Municipal Ordinance No. 2026-01', '44444444-4444-4444-4444-444444444444', 'Anonymous Citizen', 'tx000000000000000000000000000000000000000000000000000000000021', 'tx000000000000000000000000000000000000000000000000000000000020', NOW() - INTERVAL '6 days'),
  ('verify', 'Document verified by citizen: Annual Budget Appropriation FY 2026', '55555555-5555-5555-5555-555555555555', 'Anonymous Citizen', 'tx000000000000000000000000000000000000000000000000000000000022', 'tx000000000000000000000000000000000000000000000000000000000021', NOW() - INTERVAL '3 days'),
  ('verify', 'Tampered document detected: hash mismatch for unknown file', NULL, 'Anonymous Citizen', 'tx000000000000000000000000000000000000000000000000000000000023', 'tx000000000000000000000000000000000000000000000000000000000022', NOW() - INTERVAL '2 days'),
  ('upload', 'Document uploaded: Resolution No. 2026-08 Senior Citizen Discount Extension (pending approval)', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Treasurer Maria Cruz', 'tx000000000000000000000000000000000000000000000000000000000024', 'tx000000000000000000000000000000000000000000000000000000000023', NOW() - INTERVAL '1 day'),
  ('approve', 'Document approved by Treasurer Maria Cruz (1 of 3 required)', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Treasurer Maria Cruz', 'tx000000000000000000000000000000000000000000000000000000000025', 'tx000000000000000000000000000000000000000000000000000000000024', NOW() - INTERVAL '12 hours');
