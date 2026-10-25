# CYFER for SMEs — Escrow, Budget Tracking and Verified Payouts

> **Paiflow moves the money. CYFER proves what was approved and what was paid.**

**Current product direction:** CYFER for SMEs is the original CYFER (tamper-proof records, unanimous multi-approval, audit trail, budget transparency) rebuilt for SME owners, finance staff, partners, suppliers and customers, with a non-custodial Stellar wallet and Paiflow-powered payments, for the Paiflow × Web3 Iloilo hackathon (25 October 2026, Stellar Testnet). Protected payments (escrow) are one tool inside the platform, built to prevent scams, not the whole product. The source of truth is the PRD at [`docs/PRD.MD`](docs/PRD.MD).

**MVP:** one budget plan, hashed and approved by every designated approver, paid as one Freighter-signed Split across three envelopes (Operations 50%, Payroll 30%, Supplies 20%), with each envelope payout verified, a wallet page and a document tamper check. The protected payment, receipt page and SME landing copy are Should-have; USDC and more escrow examples are Nice-to-have (PRD §L.1).

**Status (25 Oct 2026, Testnet only):** The SME contracts, database, business routes, payment routes, payout verification, wallet routes, controllers and screens are implemented. One real end-to-end run has been recorded on Stellar Testnet: a Freighter-signed wallet binding, an approved plan, a 1 XLM Split payment (transaction `46bf63cdfc88275a156aa13ba8cc9913db9c646d7f6b2bf2b4ddbefeea8c848b`, ledger 5377596) and three envelope payouts verified against the chain (0.5 / 0.3 / 0.2 XLM). The full rehearsal (G5: recovery cases, repeated runs) and the security gate (G7) are not finished, and the Should and Stretch features are not built. The inherited earlier-edition pages and routes have been removed.

---

## Getting started

```bash
# Node 22.22.2 is the version the Paiflow SDK supports (>=22.22.2 <23)
npm ci
cp .env.local.example .env.local   # fill in the values; never commit this file
npm run dev                        # http://localhost:3000
```

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check:bundle`. Database and local live tests are described in [TESTING.md](TESTING.md). Team tasks and evidence: [Francis](docs/FRANCIS-PHASETASK.md), [Carlos](docs/CARLOS-PHASETASK.md), [Shanti](docs/SHANTI-PHASETASK.md).

## Tech stack

| Category | Technology |
|----------|-----------|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js route handlers (server-side) |
| Database, storage, auth | Supabase (PostgreSQL, Storage, cookie sessions) |
| Payments | Paiflow SDK on Stellar Testnet; Freighter wallet in the browser (the app never holds keys) |
| Records | SHA-256 file and plan hashes in an application hash chain (not a public blockchain) |
| AI | None in the running app. Claude Code was used as a development tool (see AI disclosure). |

## Earlier edition (superseded)

CYFER began as a public-records verification app: documents were hashed when uploaded, published only after every designated approver signed off (the Unanimous Consensus Protocol), and anyone could check a copy against the recorded hash. It also had an AI document summariser, a budget dashboard, a chain explorer and an audit trail. Those pages and routes are still in the repository until they are retired (PRD §K.12), now with neutral organisation wording. Their earlier claims ("tamper-proof", "3 independent nodes", passing tests) were not re-verified for the SME product. The original document is kept unchanged in [`docs/archive/`](docs/archive/).

The same engine can serve other organisations later, including public bodies; see PRD §P.

## AI disclosure

| Tool | Purpose | How used |
|------|---------|---------|
| **Anthropic Claude API** | Earlier edition only | The earlier edition's `/api/summarize` document summariser was **removed** from the SME build (F-20); the running app makes no Claude API calls |
| **Claude Code** (Anthropic) | AI-assisted development | Code generation, debugging, tests and documentation drafts, including the SME PRD (`docs/PRD.MD`) |

The architecture (hashing strategy, Unanimous Consensus Protocol, audit trail, payment verification rules) was designed by the team; Claude Code assisted in turning those designs into working code. The team reviews its output.

## Team

| Name | Program | University |
|------|---------|------------|
| Francis Gabriel P. Austria | BS Computer Science | West Visayas State University (WVSU) |
| Om Shanti Limpin | BS Computer Science | West Visayas State University (WVSU) |
| Jorge Maverick Acidre | BS Entertainment and Multimedia Computing | West Visayas State University (WVSU) |
| Carlos John Aristoki | BS Computer Science | West Visayas State University (WVSU) |
| Samnuel Sarino | BS Information Technology | University of San Carlos (USC) |

## License

Built for hackathon use. The source code is public as the competition rules require.
