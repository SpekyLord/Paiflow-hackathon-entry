// App-wide constants (categories, statuses, etc.)

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
export const APP_DESCRIPTION = 'Tamper-proof document records, unanimous approvals and verified payouts for organisations';

// Contact/Team info (for footer)
export const TEAM_NAME = 'RPG Team';
export const TEAM_MEMBERS = [
  'Francis Gabriel P. Austria',
  'Om Shanti Limpin',
  // Add other team members
] as const;

export const DEADLINE = '2026-03-22';

