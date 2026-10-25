# CLAUDE.md — CYFER for SMEs

## Current direction (read first)

- **Source of truth:** [`docs/PRD.MD`](docs/PRD.MD), "CYFER for SMEs — Escrow, Budget Tracking and Verified Payouts". It supersedes every instruction from the earlier edition below.
- **Pitch:** Paiflow moves the money. CYFER proves what was approved and what was paid. CYFER never holds funds or keys.
- **Audience:** SME owners, finance staff, partners, suppliers and customers. Government use is a future direction only.
- **MVP:** one budget plan on Stellar Testnet (XLM) through Paiflow: hashed plan, approval by every designated approver, one Freighter-signed `On Receive → Split` (Operations 50% / Payroll 30% / Supplies 20%), per-envelope payout verification (Planned / Approved / Pending / Verified distribution), wallet page, document tamper check. The protected payment (`time_before`, escrow), receipt page and SME landing copy are Should; USDC and more escrow examples are Nice. See PRD §L.1 for the MVP / should / stretch / future scope tiers, and never promote optional features into the MVP.
- **Money tools:** Split (budget envelopes, MVP), Pay (fixed payee, stretch), Protected payment (should). Recipients and shares are fixed per deployment, so a new payee or envelope change means a new flow and a fresh approval.
- **Paiflow rules** (PRD §A.2, §G, §K). Follow the reference starter's `llms.md` and `AGENTS.md` in `../paiflow-hackathon-starter`:
  - Keep the Paiflow token server-only, never in a `NEXT_PUBLIC_` variable.
  - Users sign in their wallet (Freighter); the app never holds keys.
  - Persist the preparation before signing and the signed envelope before submitting.
  - Never create a replacement payment because an outcome is uncertain.
  - Money is integer stroop strings handled with `bigint`.
  - Never show "paid", "distributed" or "refunded" before the payout is verified. A confirmed transaction and a verified payout are separate checks.
  - If a payment times out, check the original transaction hash. Never send another payment.
  - Check the approver gate on the server before preparing a payment or calling release-early (holding the token authorises the release).
- **Honesty rules:** the Supabase `blockchain` table is an application hash chain, not Stellar, and not public anchoring. Audit `tx_hash` values are not Stellar transaction hashes. A file-hash mismatch does not prove tampering. A payout proves distribution, not good spending. Testnet is a simulation. Courier tracking is mocked. Interoperability means Stellar assets and wallets only.
- **Do not** run seeds, migrations or `test-supabase.ts` (it writes data and may call the AI API) against a shared database, and do not send testnet transactions, without explicit team approval.
- **Commands:** `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` (Vitest, mocked), `npm run check:bundle`. Database tests are `node tests/db/*.db.mjs <dir-with-pg>` and run only against the dedicated project (see TESTING.md). Use Node 22.22.2 (`source ~/tools/use-node22.sh` on Francis's laptop).

Everything below this line is **historical** guidance for the inherited earlier edition. Keep its coding conventions where the PRD does not override them. Its audience, roles, deadline, demo flow and feature priorities are obsolete.

---

## Historical: Earlier Edition Project Overview

The earlier edition of CYFER was a document transparency app: an organisation publishes tamper-proof documents after unanimous approval, and anyone can verify a copy against the recorded hash. Its audience, deadline and demo flow are obsolete.

## Tech Stack

- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **File Storage:** Supabase Storage
- **Auth:** Supabase Auth (admin roles only)
- **Charts:** Recharts
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`) for document summarization — server-side only
- **Hashing:** SHA-256 via Web Crypto API (preferred) or crypto-js
- **Icons:** lucide-react
- **Date Utils:** date-fns
- **Deployment:** Vercel

## Project Structure

```
src/
├── app/
│   ├── (public)/           # Public pages — no auth required
│   │   ├── page.tsx        # Landing page
│   │   ├── documents/      # Public document portal
│   │   ├── verify/         # Document verification tool
│   │   ├── blockchain/     # Blockchain explorer — visual chain viewer
│   │   ├── budget/         # Budget transparency dashboard
│   │   └── audit/          # Public audit trail
│   ├── (admin)/            # Admin pages — auth required
│   │   ├── admin/          # Admin dashboard, upload, approvals, etc.
│   │   └── login/          # Admin login
│   └── api/                # API routes
│       ├── documents/      # Document CRUD + listing
│       ├── verify/         # Hash verification endpoint
│       ├── blockchain/     # Chain operations + validation
│       ├── consensus/      # UCP approval workflow
│       ├── audit/          # Transaction/audit trail
│       ├── budget/         # Budget data CRUD
│       ├── summarize/      # AI document summarization
│       └── auth/           # Authentication
├── components/
│   ├── ui/                 # Reusable UI primitives (Button, Card, Badge, etc.)
│   ├── documents/          # Document-related components
│   ├── budget/             # Budget chart components
│   ├── audit/              # Audit trail components
│   ├── consensus/          # Approval workflow components
│   └── admin/              # Admin layout and dashboard components
├── lib/
│   ├── supabase.ts         # Supabase client (browser + server)
│   ├── blockchain.ts       # Blockchain class — genesis, addBlock, validate
│   ├── hash.ts             # SHA-256 file hashing utility
│   ├── ai.ts               # Anthropic Claude API client + summarization prompt
│   └── types.ts            # All TypeScript interfaces and types
└── utils/
    ├── formatters.ts       # Date/number formatting helpers
    └── constants.ts        # App-wide constants (categories, statuses, etc.)
```

## Core Concepts

### Blockchain Implementation
- Custom lightweight blockchain stored in Supabase `blockchain` table
- Each block: `{ id, timestamp, data (JSONB), previous_hash, hash, nonce }`
- Hash computed via: `SHA-256(index + timestamp + JSON.stringify(data) + previousHash + nonce)`
- Genesis block created on first run
- Chain validation: iterate all blocks, verify each hash and previous_hash linkage
- NOT using Ethereum, Solidity, or any external blockchain — this is a self-contained implementation

### SHA-256 Document Hashing
- Every uploaded document is hashed using SHA-256 on the server side
- Use the Web Crypto API (`crypto.subtle.digest('SHA-256', buffer)`) — it's built into Node.js and the browser
- The hash is stored in both the `documents` table and as block data in the `blockchain` table
- Verification = recompute hash of uploaded file and compare against stored hash

### Unanimous Consensus Protocol (UCP)
- When any admin uploads a document, approval requests are created for ALL other admins
- Each admin independently approves or rejects
- Document publishes ONLY when every admin has approved (100% consensus)
- If ANY admin rejects, the document is marked as rejected
- All approval/rejection actions are logged in the audit trail

### User Roles
- **Super Admin:** Full access, can manage users and all admin functions
- **Admin:** Can upload documents, approve/reject, manage budget data
- **Public (no account):** Can browse published documents, verify files, explore the blockchain, view budget dashboard, use AI summarizer, and view audit trail

### AI Document Summarization
- Uses Anthropic Claude API (`@anthropic-ai/sdk`) — server-side only
- API key (`ANTHROPIC_API_KEY`) must NEVER be exposed to the client
- Endpoint: `POST /api/summarize` accepts `{ document_id: string }`
- Flow: Fetch document text from Supabase Storage → send to Claude API with structured prompt → return summary
- Prompt should request: key points (bullet list), affected parties, budget/financial implications (if any), plain-language explanation, and a one-sentence TLDR
- Use model `claude-sonnet-4-20250514` for speed/cost balance
- Set `max_tokens: 1024` for summaries
- Cache summaries: store in a `document_summaries` column (JSONB) on the `documents` table or a separate cache table to avoid repeated API calls for the same document
- Handle errors gracefully: API timeout, rate limit, document too large → return user-friendly error message
- **Demo fallback:** When the AI API is unavailable (e.g. no credits), the endpoint automatically returns realistic pre-written summaries matched by document category (ordinance, budget, resolution, contract, permit)
- Frontend: "AI Summary" button on `/documents/[id]` page → loading spinner → display summary card with collapsible sections

## Database Tables

Six tables in Supabase:
1. `users` — Admin accounts with roles and departments
2. `documents` — Uploaded documents with metadata, hash, and status (pending_approval / published / rejected)
3. `blockchain` — Ordered blocks forming the chain
4. `approvals` — Per-document approval records from each admin
5. `transactions` — Audit trail of every platform action
6. `budget_data` — Budget entries by category and fiscal year (inherited)

Historical schema notes. The proposed SME schema is in `docs/PRD.MD` §I.

## Key API Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | /api/documents | List published documents | Public |
| POST | /api/documents | Upload new document | Admin |
| GET | /api/documents/[id] | Get document detail + approvals | Public |
| POST | /api/verify | Verify a file against blockchain | Public |
| GET | /api/blockchain | Get blockchain stats + latest block | Public |
| GET | /api/blockchain/validate | Validate entire chain integrity | Public |
| GET | /api/consensus/pending | Get pending approvals for admin | Admin |
| POST | /api/consensus/[id]/approve | Approve a document | Admin |
| POST | /api/consensus/[id]/reject | Reject a document | Admin |
| GET | /api/audit | Get audit trail with pagination | Public |
| GET | /api/budget | Get budget data for dashboard | Public |
| POST | /api/budget | Add/update budget entries | Admin |
| POST | /api/summarize | AI-summarize a document by ID | Public |
| POST | /api/auth/login | Admin login | Public |
| POST | /api/auth/logout | Admin logout | Admin |

## Coding Conventions

### General
- Use TypeScript strictly — no `any` types unless absolutely necessary
- Use `async/await` over `.then()` chains
- Handle errors with try/catch and return appropriate HTTP status codes from API routes
- Use named exports for components, default exports for pages

### Components
- Functional components only, with React hooks
- Props should be typed with interfaces, not inline types
- Keep components focused — if a component exceeds ~150 lines, break it up
- Use Tailwind CSS classes directly — no CSS modules or styled-components
- Reusable UI components go in `components/ui/`
- Feature-specific components go in their respective folders under `components/`

### API Routes
- Use Next.js App Router route handlers (`route.ts` with `GET`, `POST`, etc.)
- Always validate request body/params before processing
- Return consistent JSON response format:
  ```ts
  // Success
  { success: true, data: {...} }
  
  // Error
  { success: false, error: "Error message" }
  ```
- Log all state-changing actions to the audit trail (transactions table)

### Supabase
- Use `@supabase/supabase-js` client
- Create separate clients for browser and server contexts
- Server-side: use service role key for admin operations
- Client-side: use anon key with RLS policies for security
- Always handle Supabase errors — check for `error` in responses

### Blockchain
- The blockchain module (`lib/blockchain.ts`) should be a class or set of pure functions
- Never modify existing blocks — blockchain is append-only
- Every document upload and every approval/rejection must add a block
- Chain validation should be callable independently and return a detailed result

## Design Guidelines

### Color Palette
- **Primary:** Deep navy/dark blue (#1a2332 or similar) — conveys trust and authority
- **Secondary:** White/light gray backgrounds for clean readability
- **Verified/Success:** Green (#22c55e)
- **Tampered/Error:** Red (#ef4444)
- **Warning/Pending:** Amber/Yellow (#f59e0b)
- **Accent:** Gold (#d4a843) — an official, trustworthy feel
- **Info/Neutral:** Blue (#3b82f6)

### Typography
- Use a clean, professional sans-serif — avoid playful or overly decorative fonts
- Headings should be bold and clear
- Body text should be readable at standard sizes

### UI Patterns
- Cards for document listings and approval items
- Tables for admin data management and audit trail
- Badges for document categories and status indicators
- Timeline layout for audit trail
- Charts (pie + bar) for budget dashboard
- Drag-and-drop zone for file upload areas
- Clear visual feedback: loading spinners, success toasts, error alerts
- Green checkmark animation for successful verification
- Red warning animation for tamper detection

## Important Notes

- This is a hackathon project with a 6-day timeline — prioritize working features over perfect code
- The prototype needs to look good on video — visual polish matters
- If a feature is taking too long, move on and come back to it
- Feature priority if running out of time:
  1. MUST: Document upload + hashing + verification + tamper detection
  2. MUST: UCP approval workflow
  3. SHOULD: AI Document Summarizer
  4. SHOULD: Audit trail
  5. NICE: Budget dashboard
  6. NICE: Polished landing page

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
```