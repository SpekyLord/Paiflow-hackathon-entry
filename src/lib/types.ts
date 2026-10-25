// TypeScript interfaces and types for Cyfer

// Enums
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  USER = 'user',
}

export enum DocumentCategory {
  ORDINANCE = 'ordinance',
  BUDGET = 'budget',
  RESOLUTION = 'resolution',
  CONTRACT = 'contract',
  PERMIT = 'permit',
  OTHER = 'other',
}

export enum DocumentStatus {
  PENDING_APPROVAL = 'pending_approval',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ActionType {
  UPLOAD = 'upload',
  APPROVE = 'approve',
  REJECT = 'reject',
  PUBLISH = 'publish',
  VERIFY = 'verify',
  ACCESS = 'access',
}

// Database table interfaces
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  created_at: string;
}

export interface Document {
  id: string;
  title: string;
  category: DocumentCategory;
  description: string;
  file_name: string;
  file_ext: string;
  file_size: number;
  file_url: string;
  file_hash: string;
  uploaded_by: string;
  status: DocumentStatus;
  published_at?: string;
  created_at: string;
}

export interface Block {
  id: number;
  timestamp: string;
  data: Record<string, unknown>;
  previous_hash: string;
  hash: string;
  nonce: number;
}

export interface Approval {
  id: string;
  document_id?: string;
  budget_id?: string;
  admin_id: string;
  status: ApprovalStatus;
  message?: string;
  responded_at?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  action_type: ActionType;
  description: string;
  document_id?: string;
  performed_by: string;
  tx_hash: string;
  previous_tx_hash: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface BudgetData {
  id: string;
  fiscal_year: number;
  category: string;
  allocated_amount: number;
  description: string;
  status: string;
  uploaded_by: string;
  created_at: string;
}

// AI Summarization types
export interface DocumentSummary {
  summary: string;
  keyPoints: string[];
  affectedParties?: string;
  budgetImplications?: string;
  tldr: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Blockchain validation result
export interface ChainValidationResult {
  valid: boolean;
  errors?: string[];
}

// Document verification result
export interface VerificationResult {
  verified: boolean;
  fileHash: string;
  document?: Document;
  block?: Block;
  message: string;
}
