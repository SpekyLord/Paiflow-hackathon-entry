-- CYFER: Initial Database Schema Migration
-- Version: 001
-- Description: Creates all tables for the CYFER platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table 1: users
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'user')),
  department VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- Table 2: documents
-- =====================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('ordinance', 'budget', 'resolution', 'contract', 'permit', 'other')),
  description TEXT,
  file_name VARCHAR(500) NOT NULL,
  file_ext VARCHAR(20),
  file_size BIGINT,
  file_url VARCHAR(1000),
  file_hash VARCHAR(64) NOT NULL UNIQUE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'published', 'rejected')),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_file_hash ON documents(file_hash);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- =====================================================
-- Table 3: blockchain
-- =====================================================
CREATE TABLE blockchain (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB NOT NULL,
  previous_hash VARCHAR(64) NOT NULL,
  hash VARCHAR(64) NOT NULL UNIQUE,
  nonce INTEGER DEFAULT 0
);

CREATE INDEX idx_blockchain_hash ON blockchain(hash);
CREATE INDEX idx_blockchain_timestamp ON blockchain(timestamp DESC);

-- =====================================================
-- Table 4: approvals
-- =====================================================
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id, admin_id)
);

CREATE INDEX idx_approvals_document ON approvals(document_id);
CREATE INDEX idx_approvals_admin ON approvals(admin_id);
CREATE INDEX idx_approvals_status ON approvals(status);

-- =====================================================
-- Table 5: transactions (Audit Trail)
-- =====================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('upload', 'approve', 'reject', 'publish', 'verify', 'access')),
  description TEXT NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  performed_by VARCHAR(255),
  tx_hash VARCHAR(64) NOT NULL UNIQUE,
  previous_tx_hash VARCHAR(64),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_action_type ON transactions(action_type);
CREATE INDEX idx_transactions_document ON transactions(document_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_tx_hash ON transactions(tx_hash);

-- =====================================================
-- Table 6: budget_data
-- =====================================================
CREATE TABLE budget_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fiscal_year INTEGER NOT NULL,
  category VARCHAR(255) NOT NULL,
  allocated_amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_budget_fiscal_year ON budget_data(fiscal_year);
CREATE INDEX idx_budget_category ON budget_data(category);
CREATE INDEX idx_budget_uploaded_by ON budget_data(uploaded_by);

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE users IS 'Admin accounts for the CYFER platform';
COMMENT ON TABLE documents IS 'Government documents with blockchain verification';
COMMENT ON TABLE blockchain IS 'Custom blockchain for tamper-proof document tracking';
COMMENT ON TABLE approvals IS 'UCP (Unanimous Consensus Protocol) approval records';
COMMENT ON TABLE transactions IS 'Audit trail of all platform actions';
COMMENT ON TABLE budget_data IS 'Municipality budget data for transparency dashboard';
