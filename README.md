# CYFER — Secure Document Access Blockchain Network

> **Tamper-proof government document management for transparent, accountable governance**

![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat-square&logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)
![SDG 16](https://img.shields.io/badge/SDG-16%20Peace%20%26%20Justice-blue?style=flat-square)
![Challenge](https://img.shields.io/badge/InterCICSkwela-Challenge%20%233-orange?style=flat-square)

---

## The Problem

In Philippine cities and municipalities, citizens have no reliable way to verify whether the government documents they receive — ordinances, resolutions, budget reports, contracts — are authentic and unmodified. A single official can upload, alter, or delete records without any multi-stakeholder accountability. There is no tamper-proof audit trail, and budget data is rarely accessible in an understandable form.

The result: eroded public trust, unchecked corruption, and a citizenry kept in the dark about how their tax money is spent.

---

## The Solution

**CYFER** is a blockchain-powered transparency platform built for local government units. Every document uploaded to CYFER is hashed using SHA-256 and recorded on a custom blockchain. Before any document is published publicly, it must be approved by **all designated officials** — a single rejection blocks publication. Citizens can verify any document's authenticity at any time, without needing an account.

**Core principle:** No single person controls what citizens see. Every action is permanently logged and publicly auditable.

---

## Features

### Blockchain Document Verification
Every document gets a unique SHA-256 fingerprint the moment it is uploaded. That fingerprint is stored on our custom blockchain — a cryptographically linked chain of blocks stored in Supabase. If anyone modifies the document after publication, the hash will not match, and CYFER instantly flags it as **TAMPERED**.

- Citizens can upload any government document to verify its authenticity
- Clear visual result: green **VERIFIED** or red **TAMPERED**
- No account required — fully public
- Blockchain integrity can be independently validated via `/api/blockchain/validate`

### Unanimous Consensus Protocol (UCP)
Inspired by multi-signature authorization, CYFER's UCP ensures no document or budget entry reaches the public portal without 100% approval from all registered officials.

- Admin uploads a document or submits a budget entry → approval requests are automatically sent to all other admins
- Each official independently reviews and approves or rejects with an optional comment
- Item is only published when **every** official approves
- A single rejection blocks publication and logs the reason
- Applies to **both documents and budget data** — no public-facing data bypasses consensus
- All approval actions are recorded on the blockchain and audit trail

### AI Document Summarizer *(powered by Anthropic Claude)*
Government documents are often dense and written in legal language. CYFER uses the **Anthropic Claude API** to generate plain-language summaries that any citizen can understand.

- Click "AI Summary" on any published document
- Structured output: key points, affected parties, budget/financial implications, and a one-sentence TLDR
- Generated server-side — the API key is never exposed to the browser
- Graceful fallback with realistic pre-written summaries when the AI service is unavailable

### Budget Transparency Dashboard
A public-facing visual dashboard showing how the municipality allocates its budget across sectors.

- Breakdown by category: Infrastructure, Health, Education, Social Services, General Administration, and more
- Pie chart visualization with percentage breakdowns
- Philippine Peso (PHP) formatting
- Budget entries go through the same **Unanimous Consensus Protocol** — all officials must approve before data goes public
- Each budget submission is recorded on the blockchain with full audit trail

### Blockchain Explorer
A public page where anyone can inspect the full blockchain — every block, its hash, and how it links to the previous one.

- Visual chain with connected blocks showing hash linkage
- Click any block to expand: current hash, previous hash, nonce, block data (JSON)
- Color-coded by action type: uploads (amber), approvals (blue), publications (green)
- Chain integrity status — validated in real-time
- **Distributed Network panel** — live sync status for all 3 independent nodes (Node 1 Primary, Node 2, Node 3) with green/red/gray status badges
- **Consensus indicator** — shows whether all 3 nodes agree on the chain state in real-time
- "How the Blockchain Works" explainer section

### Public Audit Trail
Every action taken on the platform is recorded in a hash-linked transaction chain — an immutable log of who did what, and when.

- Public-facing timeline of all document uploads, approvals, rejections, and verifications
- Each entry includes: action type, timestamp, official/admin reference, transaction hash
- Previous-hash linking ensures the audit trail itself cannot be tampered with
- Filter by action type

---

## Real-World Application

Imagine a citizen in a Philippine municipality who hears that the local government passed an ordinance raising property taxes. They want to know: *Is this document real? Was it actually approved? Who signed off on it?*

With CYFER:

1. The municipal clerk uploads the ordinance — CYFER hashes it and adds it to the blockchain
2. The mayor and treasurer each log in separately and approve it — only then does it go public
3. The citizen visits the portal, finds the ordinance, and clicks **"AI Summary"** — they instantly get a plain-language breakdown without reading 12 pages of legal text
4. Weeks later, a rumor spreads that the document was altered. The citizen downloads it and drags it into the CYFER verification tool — it comes back **VERIFIED**, hash matches exactly
5. Every step — upload, approval, verification — is permanently visible on the public audit trail

No account needed. No technical knowledge needed. Just transparency.

---

## Demo Credentials

The following demo accounts are pre-seeded for testing and judging:

| Role | Email | Password |
|------|-------|----------|
| Super Admin (Mayor) | `mayor@samplecity.gov.ph` | `DemoPassword123!` |
| Admin (Treasurer) | `treasurer@samplecity.gov.ph` | `DemoPassword123!` |
| Admin (Secretary) | `clerk@samplecity.gov.ph` | `DemoPassword123!` |

> To trigger the Unanimous Consensus Protocol, log in as each admin separately and approve the same document or budget entry.

---

## How It Works

```
1. UPLOAD          2. CONSENSUS          3. DISTRIBUTE          4. VERIFY
─────────────────  ────────────────────  ─────────────────────  ──────────────────────
Admin uploads   →  All officials must  →  Block is broadcast  →  Citizens upload any
document.          approve (100%).        to 3 independent       document copy.
SHA-256 hash is    Any rejection          Supabase nodes.        Hash is recomputed
computed and       blocks publication.    Nodes must agree       and compared.
stored on the      Reason is logged       on the chain           VERIFIED ✅ or
blockchain.        in audit trail.        (consensus check).     TAMPERED ❌
```

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | Next.js 14+ (App Router), TypeScript, Tailwind CSS |
| **Icons** | lucide-react |
| **Date Utilities** | date-fns |
| **Backend** | Next.js API Routes (server-side) |
| **Database** | Supabase (PostgreSQL) |
| **File Storage** | Supabase Storage |
| **Authentication** | Supabase Auth (admin roles) |
| **Blockchain** | Custom SHA-256 implementation using Web Crypto API — no external chain |
| **Decentralization** | 3 independent Supabase nodes — blocks broadcast via `broadcastBlock()` with `Promise.allSettled()` |
| **AI** | Anthropic Claude API (`claude-sonnet-4-20250514`) — server-side only |
| **Deployment** | Vercel |

> **AI Disclosure:** This project uses the **Anthropic Claude API** for the AI Document Summarizer feature. The API is called server-side only. The model used is `claude-sonnet-4-20250514`.

---

## Getting Started (Local Development)

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier)
- An [Anthropic](https://console.anthropic.com) API key (optional — AI summarizer only)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/SpekyLord/Cyfer.git
cd cyfer

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Fill in your Supabase URL, anon key, service role key, and Anthropic API key
```

### Database Setup

Follow the step-by-step guide in [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md). In summary:

1. Create a Supabase project
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL Editor
3. Run `supabase/policies/001_rls_policies.sql`
4. Run `supabase/seeds/001_demo_data.sql`
5. Create a public `documents` storage bucket
6. Copy your API keys to `.env.local`

### Run the App

```bash
npm run dev
# Open http://localhost:3000
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
NODE2_SUPABASE_URL=your_node2_supabase_url        # Optional — secondary blockchain node
NODE2_SUPABASE_ANON_KEY=your_node2_anon_key       # Optional
NODE3_SUPABASE_URL=your_node3_supabase_url        # Optional — tertiary blockchain node
NODE3_SUPABASE_ANON_KEY=your_node3_anon_key       # Optional
```

---

## Project Structure

```
src/
├── app/
│   ├── (public)/       # Public pages — no login required
│   │   ├── page.tsx    # Landing page
│   │   ├── documents/  # Document portal + detail view
│   │   ├── verify/     # Citizen verification tool
│   │   ├── blockchain/ # Blockchain explorer — visual chain viewer
│   │   ├── budget/     # Budget transparency dashboard
│   │   └── audit/      # Public audit trail
│   ├── (admin)/        # Admin pages — login required
│   │   ├── admin/      # Dashboard, upload, approvals, budget, users
│   │   └── login/      # Admin login
│   └── api/            # 15 API routes
├── components/         # UI components (Button, Card, Badge, Table, etc.)
├── lib/                # Core logic (blockchain, hash, AI, Supabase, auth)
└── utils/              # Formatters, constants
supabase/
├── migrations/         # Schema SQL
├── policies/           # RLS security policies
└── seeds/              # Demo data SQL
```

---

## Hackathon Judging Criteria

| Criterion | Weight | How CYFER Addresses It |
|-----------|--------|----------------------|
| **Mastery and Use of Software Concepts** | 30% | Custom SHA-256 blockchain, Next.js App Router with TypeScript, Supabase RLS security policies, server-side AI API integration, hash-linked audit chain |
| **Novelty and Innovation** | 30% | Unanimous Consensus Protocol (UCP) for multi-official document approval; blockchain document verification for LGUs — no existing open-source solution targets Philippine barangay/municipal level |
| **Real-world Impact and Viability** | 30% | Directly addresses corruption and document tampering in Philippine LGUs; deployable on Vercel + Supabase free tier; no per-seat licensing; citizens need zero technical knowledge to use the verification tool |
| **Compliance to Rules and Restrictions** | 10% | Working prototype demonstrated, all technologies disclosed (including AI tools), source code in public GitHub repository, 3-5 minute video |

---

## SDG Alignment

**SDG 16 — Peace, Justice and Strong Institutions**

CYFER directly supports Target 16.6: *"Develop effective, accountable and transparent institutions at all levels."*

- **Transparency:** All published documents and budget data are publicly accessible without login
- **Accountability:** The Unanimous Consensus Protocol prevents unilateral document publishing
- **Tamper-proofing:** SHA-256 blockchain ensures citizens can always verify document authenticity
- **Accessibility:** AI summaries make complex government documents readable by all citizens

---

## AI Disclosure

In compliance with InterCICSkwela Hackathon rules, we disclose all AI tools used in this project:

| Tool | Purpose | How Used |
|------|---------|---------|
| **Anthropic Claude API** (`claude-sonnet-4-20250514`) | AI Document Summarizer | Server-side API call in `/api/summarize` — generates structured plain-language summaries of government documents for citizens |
| **Claude Code** (Anthropic) | AI-assisted development | Used as a development tool for code generation, debugging, and implementation guidance during the building of the web application |

Claude Code was used as a development assistant throughout the project. The blockchain architecture, SHA-256 hashing strategy, Unanimous Consensus Protocol, multi-node decentralization design, and hash-linked audit trail were conceptualized and designed by the team — Claude Code assisted in translating those designs into working code.

---

## Team

**InterCICSkwela Hackathon — Challenge #3: Transparency, Accountability, and Good Governance**

| Name | Program | University |
|------|---------|------------|
| Francis Gabriel P. Austria | BS Computer Science | West Visayas State University (WVSU) |
| Om Shanti Limpin | BS Computer Science | West Visayas State University (WVSU) |
| Jorge Maverick Acidre | BS Entertainment and Multimedia Computing | West Visayas State University (WVSU) |
| Carlos John Aristoki | BS Computer Science | West Visayas State University (WVSU) |
| Samnuel Sarino | BS Information Technology | University of San Carlos (USC) |

---

## License

This project was built for the InterCICSkwela Hackathon 2026. Source code is made publicly available as required by competition rules.
