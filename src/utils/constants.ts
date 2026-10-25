// App-wide constants (categories, statuses, etc.)

import { DocumentCategory, DocumentStatus, UserRole, ActionType, ApprovalStatus } from '../lib/types';

// Document categories
export const DOCUMENT_CATEGORIES = [
  { value: DocumentCategory.ORDINANCE, label: 'Ordinance' },
  { value: DocumentCategory.BUDGET, label: 'Budget' },
  { value: DocumentCategory.RESOLUTION, label: 'Resolution' },
  { value: DocumentCategory.CONTRACT, label: 'Contract' },
  { value: DocumentCategory.PERMIT, label: 'Permit' },
  { value: DocumentCategory.OTHER, label: 'Other' },
] as const;

// Document statuses
export const DOCUMENT_STATUSES = [
  { value: DocumentStatus.PENDING_APPROVAL, label: 'Pending Approval', color: 'yellow' },
  { value: DocumentStatus.PUBLISHED, label: 'Published', color: 'green' },
  { value: DocumentStatus.REJECTED, label: 'Rejected', color: 'red' },
] as const;

// User roles
export const USER_ROLES = [
  { value: UserRole.SUPER_ADMIN, label: 'Super Admin' },
  { value: UserRole.ADMIN, label: 'Admin' },
  { value: UserRole.USER, label: 'User' },
] as const;

// Action types for audit trail
export const ACTION_TYPES = [
  { value: ActionType.UPLOAD, label: 'Upload', color: 'blue' },
  { value: ActionType.APPROVE, label: ' Approve', color: 'green' },
  { value: ActionType.REJECT, label: 'Reject', color: 'red' },
  { value: ActionType.PUBLISH, label: 'Publish', color: 'green' },
  { value: ActionType.VERIFY, label: 'Verify', color: 'purple' },
  { value: ActionType.ACCESS, label: 'Access', color: 'gray' },
] as const;

// Approval statuses
export const APPROVAL_STATUSES = [
  { value: ApprovalStatus.PENDING, label: 'Pending', color: 'yellow' },
  { value: ApprovalStatus.APPROVED, label: 'Approved', color: 'green' },
  { value: ApprovalStatus.REJECTED, label: 'Rejected', color: 'red' },
] as const;

// File upload constraints
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

export const ACCEPTED_FILE_TYPES = [
  'application/pdf', // PDF
  'application/msword', // DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.ms-excel', // XLS
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'text/plain', // TXT
  'image/jpeg', // JPEG
  'image/png', // PNG
] as const;

export const ACCEPTED_FILE_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
] as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// API timeouts
export const API_TIMEOUT = 30000; // 30 seconds
export const AI_TIMEOUT = 60000; // 60 seconds for AI summarization

// Cache durations (in seconds)
export const CACHE_DURATION = {
  DOCUMENTS: 300, // 5 minutes
  BUDGET: 600, // 10 minutes
  BLOCKCHAIN: 60, // 1 minute
  AUDIT: 120, // 2 minutes
} as const;

// Budget categories for dashboard
export const BUDGET_CATEGORIES = [
  'Infrastructure',
  'Health',
  'Education',
  'Social Services',
  'General Administration',
  'Public Safety',
  'Environmental Services',
  'Economic Development',
  'Other',
] as const;

// Current fiscal year (can be dynamic)
export const CURRENT_FISCAL_YEAR = new Date().getFullYear();

// Application metadata
export const APP_NAME = 'CYFER';
export const APP_FULL_NAME = 'Secure Document Access Blockchain Network';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Tamper-proof government document management for transparent, accountable governance';

// SDG Information
export const SDG_NUMBER = 16;
export const SDG_NAME = 'Peace, Justice and Strong Institutions';
export const SDG_DESCRIPTION = 'Promote peaceful and inclusive societies for sustainable development, provide access to justice for all and build effective, accountable and inclusive institutions at all levels';

// Contact/Team info (for footer)
export const TEAM_NAME = 'RPG Team';
export const TEAM_MEMBERS = [
  'Francis Gabriel P. Austria',
  'Om Shanti Limpin',
  // Add other team members
] as const;

// Hackathon info
export const HACKATHON_NAME = 'InterCICSkwela Hackathon';
export const HACKATHON_CHALLENGE = 'Challenge #3: Transparency, Accountability, and Good Governance';
export const DEADLINE = '2026-03-22';

