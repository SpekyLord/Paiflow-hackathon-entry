# CYFER : Governance Edition — Product Requirements Document

## Overview

**Product Name:** CYFER  — Secure Document Access Blockchain Network for Governance Transparency

**Tagline:** Tamper-proof government document management for transparent, accountable governance.

**Competition:** InterCICSkwela Hackathon Challenge — Challenge #3: Transparency, Accountability, and Good Governance

**SDG Alignment:** SDG 16 — Peace, Justice and Strong Institutions

**Team:** 4 members (Francis Gabriel P. Austria, Om Shanti Limpin, + 2 teammates)

**Deadline:** Video submission by March 22, 2026

---

## Problem Statement

Corruption and governance challenges continue to hinder public trust and the effective delivery of government services in the Philippines. At the city/municipal level, citizens have limited tools to verify the authenticity of government documents (budgets, ordinances, contracts, resolutions), track how public funds are allocated, or hold officials accountable for document modifications. Centralized document systems are vulnerable to tampering, lack transparency, and offer no mechanism for multi-official accountability before publishing critical documents.

---

## Proposed Solution

CYFER is a web-based blockchain-powered platform where local government units (LGUs) at the city/municipal level can publish official documents in a tamper-proof manner, and citizens can publicly verify, track, and monitor government actions. The system uses a custom blockchain ledger with SHA-256 hashing for document integrity and Unanimous Consensus Protocols (UCP) requiring multiple officials to approve documents before public release. An AI-powered document summarizer makes complex government documents accessible to citizens by generating plain-language summaries on demand.

---

## Target Users

### 1. Government Officials (Admin Role)
- Municipal/city-level officials responsible for publishing government documents
- Department heads who participate in the consensus approval process
- Super Admins who manage the platform and user access

### 2. Citizens (Public Role)
- Residents who want to verify the authenticity of government documents
- Journalists, watchdog groups, and civil society organizations
- Any member of the public (no account required for verification)

---

## Core Features

### Feature 1: Public Document Portal with Blockchain Verification
**Priority:** Critical
**Description:** A publicly accessible portal where citizens can browse all published government documents. Each document is hashed using SHA-256 upon upload and recorded on the blockchain. Citizens can verify any document's integrity by uploading a copy — the system compares hashes and confirms whether the document is authentic or has been tampered with.

**User Stories:**
- As a citizen, I can browse all published government documents without creating an account.
- As a citizen, I can upload a document to verify its authenticity against the blockchain.
- As a citizen, I can see a clear "Verified" (green) or "Tampered" (red) status for any document.

**Acceptance Criteria:**
- Document list is publicly accessible without login
- Each document displays: title, category, upload date, uploader, verification status, and hash
- Verification compares uploaded file's SHA-256 hash against the stored blockchain hash
- Clear visual indicators for verified vs tampered documents
- Search and filter functionality by category, date, and department

---

### Feature 2: Budget Transparency Dashboard
**Priority:** High
**Description:** A visual dashboard displaying municipal budget allocations broken down by sector (infrastructure, health, education, social services, etc.). Data is presented through charts and graphs, giving citizens a clear view of where public funds are allocated.

**User Stories:**
- As a citizen, I can view the city/municipal budget breakdown by sector.
- As a citizen, I can see visual charts showing fund allocation percentages.
- As an admin, I can upload/update budget data that feeds the dashboard.

**Acceptance Criteria:**
- Dashboard displays budget data in pie charts, bar charts, or similar visualizations
- Budget categories include at minimum: Infrastructure, Health, Education, Social Services, General Administration
- Data is displayed for the current fiscal year
- Dashboard is publicly accessible without login
- Budget figures show allocated amounts and percentage of total budget

---

### Feature 3: Audit Trail / Transaction Chain
**Priority:** High
**Description:** A complete chronological log of every action taken on the platform — document uploads, verifications, approvals, rejections, and access events. Each entry is recorded on the blockchain with a timestamp, creating an immutable accountability chain.

**User Stories:**
- As a citizen, I can view the public audit trail of all document-related actions.
- As an admin, I can see detailed logs of who uploaded, approved, or modified documents.
- As a citizen, I can verify that the audit trail itself has not been tampered with.

**Acceptance Criteria:**
- Every platform action generates a transaction entry on the blockchain
- Each entry includes: action type, timestamp, user/admin who performed it, document reference, and transaction hash
- Audit trail is publicly viewable (sensitive admin details may be anonymized)
- Entries are chronologically ordered with newest first
- Previous hash linking ensures chain integrity (any tampering breaks the chain)

---

### Feature 4: Unanimous Consensus Protocol (UCP) for Document Publishing
**Priority:** Critical
**Description:** Before any government document is published to the public portal, it must be approved by all designated officials (admins) in the system. This prevents any single official from unilaterally publishing or altering documents, ensuring collective accountability. If any official rejects, the document is not published.

**User Stories:**
- As an admin, I can upload a document for review by other officials.
- As an admin, I receive approval requests for documents uploaded by other officials.
- As an admin, I can approve or reject a document with a reason.
- As a citizen, I can see that published documents have been unanimously approved.

**Acceptance Criteria:**
- Document upload by any admin triggers approval requests to all other admins
- Each admin can approve or reject with an optional message
- Document is only published when ALL admins approve (100% consensus)
- If any admin rejects, the document remains unpublished with rejection reason logged
- Approval/rejection actions are recorded on the audit trail
- Published documents display the number of approvals and approving officials

---

### Feature 5: AI Document Summarizer
**Priority:** High
**Description:** An AI-powered tool that generates plain-language summaries of complex government documents (ordinances, budgets, resolutions, contracts). Citizens can click "Summarize" on any published document to receive an easy-to-understand breakdown of its contents. This bridges the accessibility gap — making government information understandable to citizens who may not have legal or technical backgrounds.

**User Stories:**
- As a citizen, I can click "AI Summary" on any published document to get a plain-language breakdown.
- As a citizen, I can understand complex legal or financial documents without specialized knowledge.
- As an admin, I can see AI-generated summaries before a document is published to ensure clarity.

**Acceptance Criteria:**
- "Summarize" button on every published document's detail page
- AI generates a structured summary: key points, affected parties, budget implications (if applicable), and plain-language explanation
- Summary is generated on-demand (not pre-computed) via server-side API call to AI provider
- Loading state while summary generates (2-5 seconds expected)
- Summary is displayed in a clean, readable card below the document
- Summaries can be regenerated if needed
- AI provider: Anthropic Claude API (server-side only — API key never exposed to client)
- Fallback: If AI API is unavailable, show a graceful error message

---

## System Architecture

### Tech Stack
- **Frontend:** Next.js 14+ (App Router) + Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL) for user data, document metadata, and budget data
- **File Storage:** Supabase Storage for document files
- **Blockchain:** Custom implementation using SHA-256 hashing (simulated chain — no external blockchain dependency)
- **Authentication:** Supabase Auth (for admin roles) / No auth required for public portal
- **Charts:** Recharts or Chart.js for budget dashboard visualizations
- **AI:** Anthropic Claude API for document summarization (server-side only)
- **Deployment:** Vercel

### Architecture Overview
```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│              Next.js + Tailwind CSS              │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Public   │ │  Budget  │ │   Admin Panel    │ │
│  │  Portal   │ │Dashboard │ │ (Upload/Approve) │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└───────────────────────┬─────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│               NEXT.JS API ROUTES                 │
│                                                  │
│  /api/documents    - CRUD + verification         │
│  /api/blockchain   - Chain operations + hashing  │
│  /api/consensus    - UCP approval workflow        │
│  /api/audit        - Transaction logging          │
│  /api/budget       - Budget data management       │
│  /api/summarize    - AI document summarization    │
│  /api/auth         - Admin authentication         │
└───────────────────────┬─────────────────────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
┌──────────────────┐   ┌──────────────────────┐
│    Supabase DB   │   │  Supabase Storage     │
│   (PostgreSQL)   │   │  (Document Files)     │
│                  │   │                       │
│  - users         │   │  - uploaded docs      │
│  - documents     │   │  - verified copies    │
│  - blockchain    │   │                       │
│  - transactions  │   │                       │
│  - budget_data   │   │                       │
│  - approvals     │   │                       │
└──────────────────┘   └──────────────────────┘
```

### Database Schema

#### `users` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| email | VARCHAR | Admin email |
| name | VARCHAR | Display name |
| role | ENUM | 'super_admin', 'admin', 'user' |
| department | VARCHAR | Government department |
| created_at | TIMESTAMP | Account creation date |

#### `documents` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| title | VARCHAR | Document title |
| category | ENUM | 'ordinance', 'budget', 'resolution', 'contract', 'permit', 'other' |
| description | TEXT | Brief description |
| file_name | VARCHAR | Original filename |
| file_ext | VARCHAR | File extension |
| file_size | INTEGER | File size in bytes |
| file_url | VARCHAR | Supabase storage URL |
| file_hash | VARCHAR | SHA-256 hash of the file |
| uploaded_by | UUID (FK) | Reference to users.id |
| status | ENUM | 'pending_approval', 'published', 'rejected' |
| published_at | TIMESTAMP | When document was published |
| created_at | TIMESTAMP | Upload date |

#### `blockchain` table
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL (PK) | Block index |
| timestamp | TIMESTAMP | Block creation time |
| data | JSONB | Block data (document hash, action, etc.) |
| previous_hash | VARCHAR | Hash of previous block |
| hash | VARCHAR | SHA-256 hash of this block |
| nonce | INTEGER | Nonce value |

#### `approvals` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| document_id | UUID (FK) | Reference to documents.id |
| admin_id | UUID (FK) | Reference to users.id |
| status | ENUM | 'pending', 'approved', 'rejected' |
| message | TEXT | Optional approval/rejection message |
| responded_at | TIMESTAMP | When the admin responded |
| created_at | TIMESTAMP | When the request was created |

#### `transactions` table (Audit Trail)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| action_type | ENUM | 'upload', 'approve', 'reject', 'publish', 'verify', 'access' |
| description | TEXT | Human-readable description |
| document_id | UUID (FK) | Reference to documents.id (nullable) |
| performed_by | VARCHAR | User/admin identifier |
| tx_hash | VARCHAR | Transaction hash |
| previous_tx_hash | VARCHAR | Previous transaction hash |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMP | Timestamp |

#### `budget_data` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| fiscal_year | INTEGER | Budget year |
| category | VARCHAR | Budget sector/category |
| allocated_amount | DECIMAL | Amount allocated |
| description | TEXT | Description of allocation |
| uploaded_by | UUID (FK) | Reference to users.id |
| created_at | TIMESTAMP | Entry date |

---

## Page Structure

### Public Pages (No Auth Required)
1. **`/`** — Landing page with overview of CYFER, quick stats, and navigation
2. **`/documents`** — Public document portal with search, filter, and list of all published documents
3. **`/documents/[id]`** — Individual document detail page with verification status and approval chain
4. **`/verify`** — Document verification tool — upload a file to check integrity against blockchain
5. **`/budget`** — Budget transparency dashboard with charts and breakdowns
6. **`/audit`** — Public audit trail / transaction chain viewer

### Admin Pages (Auth Required)
7. **`/admin`** — Admin dashboard with overview stats, pending approvals, recent activity
8. **`/admin/upload`** — Document upload form with metadata
9. **`/admin/approvals`** — List of documents pending UCP approval with approve/reject actions
10. **`/admin/documents`** — Manage all documents (published, pending, rejected)
11. **`/admin/budget`** — Upload/manage budget data
12. **`/admin/users`** — User management (super admin only)
13. **`/login`** — Admin login page

---

## Blockchain Implementation

### Hashing
- Algorithm: SHA-256
- Documents are hashed on upload using the file's binary content
- Each block in the chain contains: index, timestamp, data, previous hash, and current hash
- The hash is computed from: `SHA-256(index + timestamp + JSON(data) + previousHash + nonce)`

### Chain Validation
- Genesis block is created on system initialization
- Each new block references the previous block's hash
- Chain validation iterates through all blocks and verifies:
  1. Each block's hash matches its computed hash
  2. Each block's `previous_hash` matches the prior block's `hash`
- If validation fails, the chain is flagged as compromised

### Tamper Detection
- File verification: Recalculate SHA-256 of uploaded file and compare with stored hash
- Blockchain verification: Run chain validation to check for any broken links
- Both checks are available publicly for transparency

---

## UCP (Unanimous Consensus Protocol) Flow

1. Admin uploads a document → status becomes `pending_approval`
2. System creates approval requests for ALL other admins
3. Each admin reviews the document and chooses: Approve or Reject
4. **If ALL admins approve** → document status changes to `published`, visible on public portal, recorded on blockchain
5. **If ANY admin rejects** → document status changes to `rejected`, rejection reason logged, recorded on audit trail
6. All approval/rejection actions are recorded as transactions on the audit trail

---

## Non-Functional Requirements

- **Performance:** Pages should load within 3 seconds. Document verification should complete within 5 seconds for files up to 50MB.
- **Security:** Admin routes protected by authentication. File hashes are computed server-side to prevent manipulation. Database access restricted by row-level security policies.
- **Responsiveness:** UI should be fully responsive for desktop and tablet. Mobile-friendly is a plus but not critical for the demo.
- **Accessibility:** Basic accessibility — semantic HTML, proper contrast ratios, keyboard navigation for key flows.

---

## Demo Scenario (for Video)

The video should demonstrate the following flow:

1. **Problem intro** — Brief explanation of governance transparency issues in PH municipalities
2. **Show the public portal** — Browse published documents, see budget dashboard
3. **Admin uploads a document** — Show upload flow, hash generation
4. **UCP in action** — Show multiple officials approving the document. Show what happens when one rejects.
5. **Document goes public** — After unanimous approval, document appears on public portal
6. **AI Summarizer** — Click "Summarize" on a complex ordinance → AI generates a plain-language breakdown in seconds
7. **Citizen verification** — Upload a document copy → verified. Upload a tampered version → flagged as tampered.
8. **Audit trail** — Show the complete chain of actions
9. **SDG alignment** — Explain how this supports SDG 16
10. **Tech stack mention** — Next.js, Tailwind, Supabase, SHA-256, custom blockchain, Anthropic Claude AI

---

## Success Metrics

- Working prototype demonstrating all 5 core features
- Clear problem-solution narrative in the video
- Strong SDG 16 alignment
- Clean, professional UI
- Smooth demo flow without bugs
- Clear mention of technologies used (including AI tools)