# CYFER for SMEs — Escrow, Budget Tracking and Verified Payouts

> **Paiflow holds and routes the money. CYFER proves why it moved.**

---

## A. Document control

| Field | Value |
|---|---|
| Version | 2.0.0 |
| Date | 2026-10-25 |
| Status | **Draft for team review.** Product direction is approved; technical design is proposed and is not yet implemented. |
| Event | Paiflow × Web3 Iloilo hackathon, 25 October 2026, Stellar Testnet |
| Repository | `SpekyLord/Paiflow-hackathon-entry`, branch `main` |
| Replaces | The government-first "CYFER: Governance Edition" PRD. A copy of that document, unchanged apart from a superseded banner, is kept at `docs/archive/PRD.governance-original.2026-10-25.MD` for history only. |

### A.1 Supersession notice

This document is the **only active PRD** for this repository. It supersedes the inherited government-first direction for the InterCICSkwela event (audience: LGUs and citizens; March 2026 video deadline; SDG 16 judging weights; government admin roles; feature priorities). Those materials are historical. Wherever they conflict with this PRD, this PRD wins. Useful engineering conventions from the inherited code are retained where §C and §L.6 say so.

### A.2 Source hierarchy

When sources disagree, the higher source wins:

1. **Paiflow platform constraints**: starter `llms.md`, starter `README.md` and `AGENTS.md`, the Paiflow Guide (updated 17 Oct 2026), and starter source code (`lib/paiflow.ts`, `lib/recovery.ts`, `lib/transaction.ts`, `lib/wallet.ts`, `lib/confirmation.ts`, `lib/http.ts`, `app/api/pay/route.ts`). The product cannot override these.
2. **Event rules**: the Paiflow × Web3 Iloilo Event Primer (updated 23 Oct 2026). These cover pitch format, testnet-only use and credential handling.
3. **Product decision**: the team brief "CYFER for SMEs: Escrow, Budget Tracking and Verified Payouts" (25 Oct 2026). It sets audience, scope and priorities.
4. **Verified current repository state**: source, schema and policies, cited by `path:line`.
5. **Historical repository documents**: the old PRD, `docs/PHASETASK.MD`, `TESTING.md`, `UPDATE.md`, `README.md` and the files in `docs/`. These are context only. Their checkboxes and reported test results are **not** fresh verification.

Sources consulted for this revision: all of the above, plus the Windows Setup Guide (23 Oct 2026), the starter's `docs/staging-verification-2026-10-12.json` and Supabase RLS/Storage documentation. **Not available:** the Paiflow SDK README, the SDK method reference, the HTTP API README and OpenAPI were not fetched; `@paiflow/sdk` is not installed locally. Statements about SDK method shapes therefore rely on `llms.md` and the Paiflow Guide. The Supabase MCP connection failed, so the live database was **not** inspected.

### A.3 Approved direction vs proposed design

| Label | Meaning |
|---|---|
| **[APPROVED]** | Product decision from the team brief: audience, scope tiers, templates, positioning. |
| **[CONSTRAINT]** | Platform fact from Paiflow or event sources. It is not negotiable in this product. |
| **[PROPOSED]** | Technical design written for this PRD: schema, endpoints, state machines. It needs review and is unimplemented. |
| **[VERIFIED-CODE]** | Fact about current code, with a `path:line` citation. It was read on 2026-10-25 and has not been executed. |
| **[UNVERIFIED]** | A claim or behaviour that nobody has established yet. |

### A.4 Glossary

| Term | Definition |
|---|---|
| Deal | A CYFER business record for one escrow relationship between one client (buyer) and one freelancer (seller). |
| Terms version | An immutable, hashed snapshot of the deal terms. Any change creates a new version. |
| Deliverable version | One submitted file. CYFER records its SHA-256, size, media type and storage key. |
| Deployment | A confirmed Paiflow deployment, identified by its UUID. It is neither the flow ID nor the `C…` contract address. Recipients, deadline, asset and held balance are fixed per deployment. |
| Escrow graph | `On Receive → Condition time_before(at) → True: Pay full amount to seller / False: Pay full amount to buyer`. |
| Early release | `release-early` (SDK `deployment.releaseEarly({ nodeId })`). It releases the before (True) side strictly before the deadline, through the token-authorised relayer. |
| After-side release | Automatic release to the False side at or after the deadline, subject to polling delay. |
| Payment attempt | One prepare → sign → submit lifecycle for a deposit or budget payment. |
| Preparation | The unsigned XDR, `networkPassphrase`, `network`, `expiresAt` and `x-history-request-id` returned by `execute` prepare. |
| Signed envelope | The wallet-signed XDR. Its transaction-body hash must equal the original preparation hash. |
| Original hash | The transaction hash of the prepared envelope. It is the anchor for every recovery step. |
| Stroops | Integer units: 1 XLM or 1 USDC = 10,000,000 stroops. Amounts are carried as decimal strings and computed with `bigint`. |
| bps | Basis points. 10,000 bps = 100%. |
| UCP | Unanimous Consensus Protocol, CYFER's application-level approval rule: every listed approver must approve. |
| CYFER ledger | CYFER's own hash-linked `blockchain` table in Supabase. It is **not** Stellar and is **not** publicly anchored. |
| Audit `tx_hash` | A SHA-256 value in the CYFER `transactions` table. It is **not** a Stellar transaction hash. |
| Stellar tx hash | A 64-hex hash of a Stellar network transaction. It can be checked on a Stellar explorer. |
| Verified payout | A payout whose evidence passed every check in §H. A "confirmed transaction" alone does not qualify. |

### A.5 Decisions

| ID | Decision | Basis |
|---|---|---|
| D-01 | Commission escrow is the **only** live MVP template. Online selling is a Should-have, and its courier tracking is mocked and labelled as mocked. | Brief §9, §11 recommendation |
| D-02 | XLM is the MVP asset. USDC is a Stretch goal and needs a separate deployment. | Brief §8; Guide "Optional: use USDC" |
| D-03 | Escrow graph uses `time_before`, with explicit Pay to buyer on False. No Hold. No Return to owner. | `llms.md` Condition, Hold and Return to owner sections; Freelance escrow example |
| D-04 | One manually created deployment is reserved for exactly one active demo deal. | `llms.md` §1 and Condition; Event Primer §04 |
| D-05 | Financial evidence is stored **server-side** in Supabase. The starter's browser storage is a teaching pattern and is insufficient here. | Guide §11; starter README "Recover" |
| D-06 | The terms "Paid" and "Refunded" appear only after §H verification. | Guide §10; `llms.md` Execute |
| D-07 | Release-early has **no** documented idempotency key or reconcile endpoint. CYFER must never blindly retry it and must use evidence checks with operator review instead. | `llms.md` Release early (no key documented); staging path list has no `release-early/reconcile` |
| D-08 | PHP planning figures are kept separate from crypto amounts. There is no exchange rate, conversion or fiat custody. | Brief §5 and §10 |
| D-09 | The CYFER ledger is described as an **application hash chain**, never as public-chain anchoring. | `src/lib/blockchain.ts:80-123` writes only to Supabase |
| D-10 | A wallet becomes bound to an account only through a server-verified signed challenge. | Guide §09 requires "verified wallet ownership" |

### A.6 Contradictions found and how they are resolved

| # | Contradiction | Resolution |
|---|---|---|
| C-01 | Brief: "release goes to the False branch automatically" at the deadline. Paiflow: automation is polled, and payments land 1–2 minutes after they are due. | The refund becomes **eligible** at the deadline. The PRD never promises an exact-second refund (§F, §N). |
| C-02 | Brief §5: "CYFER stores only the public G… address". MVP needs an authenticated account bound to that wallet. | A public address is a stored identifier. Account binding needs a signed challenge (REQ-ACC-02). |
| C-03 | Brief §7 and §9 call the hash "tamper-proof" and say "anchors it". The CYFER ledger is a Supabase table. | Use "hash recorded in CYFER's append-only application ledger". Do not claim immutability or public anchoring (§K.9). |
| C-04 | Brief §8 lists Verification and Freighter as "Live" and the hosted page as "available". | Those are intended demo goals. Nothing is live until §M evidence exists. |
| C-05 | Brief §3 calls the receipt step "publish receipt", while §9 marks the public receipt page Nice-to-have. | The receipt page is **Stretch** (REQ-RCPT-01). MVP shows evidence on the authenticated deal page. |
| C-06 | Brief §7: "Recipients are fixed at deploy time, so the server can only release to the seller early or wait." | That holds for the release-early API. The deploying wallet can also release the before side (`llms.md` Condition), and token holders are trusted. Both facts are stated in §K.4. |
| C-07 | Inherited budget code uses PHP floats (`src/app/(admin)/admin/budget/page.tsx:73`, `src/app/api/budget/route.ts:50`). | Payments use stroop strings and `bigint`. PHP planning values move to integer centavos (§I.8). |
| C-08 | Inherited verify route returns "may have been tampered" for any non-match (`src/app/api/verify/route.ts:67`). | A non-match means "no matching record". It is not proof of tampering (REQ-DLV-02). |
| C-09 | Schema drift: code reads and writes `approvals.budget_id` and `budget_data.status`. The migration defines neither, and `approvals.document_id` is `NOT NULL` (`supabase/migrations/001_initial_schema.sql:68`, `:104-112`). | The live schema is **unknown**. A new migration must reconcile it before any reuse (§I.13). |

### A.7 Assumptions

- AS-01: The team has, or can create, a Paiflow account, a funded deployer wallet, and Freighter on Testnet.
- AS-02: Demo actors use dedicated testnet wallets. The client, freelancer and deployer are three distinct, funded accounts.
- AS-03: The existing Supabase project, or a new one, remains available. The current live schema has not been inspected.
- AS-04: `@paiflow/sdk@0.2.0` exposes `execute.prepare`, `execute.submit`, `transactions.get`, `events.list`, `capabilities.get` and `releaseEarly` as described in `llms.md`. The exact signatures must be checked against the SDK README before implementation.
- AS-05: The app keeps Next.js 16.1.6 and npm (`package.json:16`). The starter's Node `>=22.22.2 <23` requirement applies when the SDK is added. Whether this repository's runtime satisfies it is **[UNVERIFIED]**.

### A.8 Unresolved questions

| ID | Question | Owner | Blocks |
|---|---|---|---|
| Q-01 | Who deploys the escrow flow and holds the Paiflow token today? | Team | Slice S2 |
| Q-02 | Which people and wallets play client, freelancer and deployer? | Team | S2, demo |
| Q-03 | Is USDC attempted today, or XLM only? (Recommendation: XLM only.) | Team | Stretch |
| Q-04 | Q&A answer for "client never approves" (proposed wording in §N.3). | Team | Pitch |
| Q-05 | Keep the "CYFER" name with "for SMEs", or rebrand? | Team | Stretch landing page |
| Q-06 | Does `transactions.get(txHash)` resolve a **release-early** transaction hash, or only execute hashes? | Spike against API README | REQ-PAY-01 |
| Q-07 | Does `GET /balances` (in the staging path list) report a condition's held balance, and in what shape? | Spike | REQ-WAL-01 |
| Q-08 | What is the exact Freighter `signMessage` encoding (SEP-53) for the pinned `@stellar/freighter-api` version, and which server-side verification library will be used? | Spike | REQ-ACC-02 |
| Q-09 | What is the demo deadline? It must leave time for early release in the pitch, yet still allow a refund-path rehearsal. | Team | S2 |
| Q-10 | What does the live Supabase schema actually contain? (See C-09.) | Team, read-only check | S1 |
| Q-11 | How does a release-early event appear in `events.list` (kind, topic, `nodeId`, recipient fields)? | Spike | REQ-PAY-01 |

---

## B. Product definition

### B.1 Problem [APPROVED]

SMEs, freelancers and their customers lack a cheap way to trust each other with money. They also rarely have a clear record of where funds went:

- **Deliver first, never get paid.** A student artist, writer or programmer finishes a commission and the client disappears.
- **Pay first, never receive.** A buyer pays an online seller and nothing arrives.
- **Untracked funds.** Small-business budgets live in chat threads and spreadsheets, so nobody can show who approved a spend or whether a payout matched the plan.
- **Disputes without evidence.** "I sent the file" and "I never received it" are hard to settle.

No market statistics are claimed. Any statistic used in the pitch needs a cited source first.

### B.2 Intended users

| User | Need |
|---|---|
| Client (buyer) of a commission | Pay only when the agreed work arrives, and get the money back if it does not arrive by the deadline. |
| Freelancer (seller) | See that the money is held before starting, and have evidence of what was delivered. |
| SME owner | Split incoming funds into planned envelopes with recorded approval, and see planned versus verified payouts. |
| Co-owner or finance approver | Approve a budget plan before money moves. |
| Receipt viewer (Stretch) | Check published evidence of a deal without an account. |

### B.3 Value proposition

Paiflow holds the deposit on-chain and can pay only fixed recipients. CYFER binds that money movement to hashed terms, a hashed deliverable, an explicit approval of that exact deliverable, and independently verified payout evidence. **CYFER never holds funds or wallet keys.**

### B.4 Why Paiflow is necessary

Without Paiflow, CYFER is only a document log, and the client would still have to "pay first and trust". Paiflow provides the parts CYFER cannot provide itself:

- on-chain holding of the deposit
- recipients fixed at deploy time
- deadline-driven fallback to the buyer
- token-authorised early release

The core experience (fund, hold, release or refund) **is** the Paiflow flow. CYFER supplies authorisation, evidence and verification around it.

### B.5 Goals and measurable demo outcomes

| ID | Outcome | Evidence required |
|---|---|---|
| G-01 | One commission deal funded from the client's Freighter wallet on Testnet, using the team's own deployment | Deployment UUID; deposit Stellar tx hash; SUCCESS status for that hash |
| G-02 | Held status shown before release | RECEIVE event for the deposit hash, with no payout event yet. The held-balance source must be verified (Q-07). |
| G-03 | Freelancer deliverable recorded | Deliverable SHA-256, size and type; ledger block; audit entry |
| G-04 | Client approval bound to the deliverable version | Approval row referencing `terms_version_id` and `deliverable_version_id` |
| G-05 | Early release with a verified seller payout | Release tx hash; PAYOUT evidence to the configured seller for the expected amount (§H) |
| G-06 | Tamper check | Same file: "matches the recorded deliverable". Altered file: "no match". Neither result is presented as proof of quality or fraud. |
| G-07 | Wallet page | Testnet chip, XLM balance, escrow status, history with hashes |

### B.6 Non-goals

- Fiat on-ramp, peso conversion or PHP custody.
- KYC, tax, invoicing compliance or a legal dispute process.
- Arbitration, multisig dispute resolution or partial releases (Future).
- Automatic per-deal deployment provisioning (Future).
- Bridging to other blockchains. "Interoperability" means Stellar assets and Stellar wallets only.
- Judging work quality. A payout proves distribution, not good work.
- Mainnet or real funds.
- Government deployment or claims of government adoption.

### B.7 Honest limitations [CONSTRAINT]

1. **One deployment is one escrow relationship.** Recipients, deadline and held balance are shared by every deposit to that deployment.
2. **Recipients are fixed at deploy time.** There is one buyer and one seller per deployment, and Dev mode is off for the event.
3. **The refund is time-based only.** A client who never approves is refunded at the deadline, **even if the seller delivered**. CYFER evidence can support a dispute but cannot move money.
4. **Release relies on trusted authority.** Whoever holds the deployment token can trigger an early release to the seller, and the deploying wallet can also release the before side. CYFER's route checks narrow who can ask, but they do not remove that authority.
5. **Automation is polled.** After-side release and indexed events can lag by a minute or more.
6. **Testnet only.** Balances have no real-money value; the pitch calls this a "simulation".
7. **A hash proves byte equality only.** It does not prove quality, authorship or truthful delivery.
8. **Courier tracking is not real.** It is mocked and labelled as mocked.

---

## C. Current-state assessment

All facts below were read from source on 2026-10-25. Nothing was built, run or tested for this PRD.

### C.1 Verified existing implementation [VERIFIED-CODE]

| Area | Fact | Reference |
|---|---|---|
| Stack | Next.js 16.1.6, React 19.2.3, `@supabase/supabase-js` ^2.99.2, Recharts ^3.8.0, `@anthropic-ai/sdk` ^0.78.0, lucide-react, date-fns | `package.json:11-20` |
| Tooling | Tailwind CSS 4 via `@tailwindcss/postcss`, TypeScript ^5, ESLint 9, tsx | `package.json:21-31` |
| Scripts | `dev`, `build`, `start`, `lint`. There is **no `test` script**. | `package.json:5-10` |
| Paiflow / Stellar | **No** Paiflow SDK, Freighter API or Stellar SDK dependency | `package.json:11-20` |
| Auth | Bearer Supabase access token checked with `auth.getUser()`, then role `admin`/`super_admin` read from `users` with the service role | `src/lib/auth.ts:12-64` |
| Token storage | Access token kept in `localStorage` (`cyfer_token`) | `src/app/(admin)/login/page.tsx:39-40` |
| Admin guard | Client-side redirect when the token is missing | `src/app/(admin)/admin/layout.tsx:12-18` |
| DB clients | Browser client uses the anon key; server client uses the service role (bypasses RLS) | `src/lib/supabase.ts:6`, `src/lib/supabase.ts:18` |
| Hashing | SHA-256 over file bytes or strings using Web Crypto | `src/lib/hash.ts:8`, `:19`, `:42` |
| CYFER ledger | Reads latest block, then inserts the next `id`; hash = SHA-256(id, ms timestamp, sorted-key JSON, prev hash, random nonce) | `src/lib/blockchain.ts:40-49`, `:80-123` |
| Ledger replicas | Best-effort upsert to two more Supabase projects using **anon** keys; failures only logged | `src/lib/blockchain.ts:129-149`, `src/lib/nodes.ts:16-40` |
| Chain validation | Recomputes every block hash and checks linkage | `src/lib/blockchain.ts:157-211` |
| Audit log | `tx_hash` = SHA-256 of fields **plus `Date.now()`, which is not stored**, linked to the latest row by `created_at` | `src/lib/audit.ts:20-56`, `:27`, `:34` |
| UCP approve | Looks up the caller's approval by `document_id`, then `budget_id`; updates the row by `id` only; publishes when all rows are `approved` | `src/app/api/consensus/[documentId]/approve/route.ts:41-63`, `:102-105`, `:131-142`, `:197-200`, `:227-238` |
| Budget API | Public GET treats **any** `Authorization` header as admin and returns unpublished rows; amounts summed with `Number()` | `src/app/api/budget/route.ts:22-33`, `:50`, `:58`, `:63` |
| Budget POST | Validates presence only (not type, sign or range); inserts `status: 'pending_approval'`; inserts approvals with `budget_id` without checking the result | `src/app/api/budget/route.ts:104-126`, `:146-161` |
| Budget UI | Admin enters PHP with `parseFloat`; public page titled "Where your taxes went this year" | `src/app/(admin)/admin/budget/page.tsx:73`, `:146`; `src/app/(public)/budget/page.tsx:46-51`, `:60` |
| Documents | Upload checks a 50 MB limit and a MIME allowlist after parsing the form; stores in the `documents` bucket and saves a **public URL** | `src/app/api/documents/route.ts:94-122`, `:133-151`; `src/utils/constants.ts:47-49` |
| Document detail | Public GET by ID with **no status check**, so pending or rejected documents are readable | `src/app/api/documents/[id]/route.ts:15-28` |
| Verify | Public, no size limit; matches by `file_hash` regardless of status; writes an audit row on every call; non-match text says "may have been tampered" | `src/app/api/verify/route.ts:13-35`, `:63-68`, `:72-84` |
| Search | User input interpolated into a PostgREST `.or()` filter | `src/app/api/documents/route.ts:46` |
| Schema | Six tables. `approvals.document_id NOT NULL`. No `budget_id`. `budget_data` has no `status`; amounts are `DECIMAL(15,2)`. | `supabase/migrations/001_initial_schema.sql:66-75`, `:104-112` |
| RLS | `budget_data` readable by anyone and writable by **any** authenticated user; users, approvals and all documents readable by any authenticated user | `supabase/policies/001_rls_policies.sql:18-20`, `:44-51`, `:81-83`, `:118-125` |
| Types | `BudgetData.allocated_amount: number`; `Transaction.tx_hash` | `src/lib/types.ts:86-107` |
| Scripts | `test-supabase.ts` **writes** a ledger block and may call the Anthropic API | `test-supabase.ts:145-154`, `:190-191` |

### C.2 Reusable components

| Component | Reuse for | Condition |
|---|---|---|
| `src/lib/hash.ts` | Terms and deliverable hashing | As is |
| `src/lib/blockchain.ts` | Evidence ledger | Only after the concurrency fix (§I.11). Relabel as an application ledger. |
| `src/lib/audit.ts` | Audit trail | Store every hash input; fix the linkage race |
| `src/components/ui/*` (Button, Card, Badge, Table, Modal, Toast, Input) | All new screens | As is |
| `src/components/documents/VerificationResult.tsx`, `/verify` page | Deliverable verification | Copy changes per REQ-DLV-02 |
| `src/components/consensus/*`, approve and reject routes | Budget UCP | Rewrite the guards (REQ-BUD-02) |
| `src/components/budget/BudgetChart.tsx`, `BudgetTable.tsx` | Planned vs verified envelopes | Feed integer data |
| `src/components/audit/AuditTimeline.tsx` | Deal timeline | As is |
| Starter `lib/transaction.ts`, `lib/wallet.ts`, `lib/amount.ts`, `lib/confirmation.ts`, `lib/http.ts`, `lib/paiflow.ts` patterns | Payment lifecycle | Port the patterns. Recovery state moves from the browser to the server. |

### C.3 Required changes and missing capabilities

| Missing | Requirement |
|---|---|
| Paiflow server module, SDK, Freighter, Stellar SDK | REQ-ESC-*, REQ-WAL-* |
| Wallet binding | REQ-ACC-02 |
| Deal, terms, deliverable and approval tables | §I |
| Server-side payment-attempt and recovery records | REQ-ESC-02, REQ-REC-01 |
| Release route with authorisation and locking | REQ-REL-01 |
| Payout verifier | REQ-PAY-01 |
| Deployment registry and reservation | REQ-DEP-01 |
| Private deliverable storage | REQ-DLV-01, §K.6 |
| Automated tests (none exist; no `npm test`) | §M |

### C.4 Unverified historical claims

Treat these as **unverified**:

- "Phase 0–5 COMPLETE"
- "Build verified … 29 routes"
- "All tests passing (`test-supabase.ts`)"
- "Tests passed" in `TESTING.md`
- "Supabase … live and all tests passing" in `docs/SUPABASE_SETUP.md`
- the "3 independent nodes" consensus claims in `README.md`

None was re-run for this PRD, and none relates to SME features. No SME feature exists yet.

---

## D. Roles and permissions

### D.1 Roles

| Role | Bound to | Owns | Can | Cannot |
|---|---|---|---|---|
| Client (buyer) | Account + verified wallet = deployment's False-branch recipient | Their deal participation, approvals | Create a deal (as initiator), accept terms, fund escrow, approve or reject a deliverable version, request release | Release without a valid approval; change recipients |
| Freelancer (seller) | Account + verified wallet = True-branch recipient | Deliverable versions | Accept terms, upload deliverables, view escrow state | Approve their own deliverable; request release |
| SME owner | Account + organisation membership `owner` | Organisation, budget plans | Create budget plans and envelopes, link a Split deployment, sign the budget payment | Count their own approval as everyone's |
| Budget approver | Organisation membership `approver` | Their approval rows | Approve or reject a specific plan version | Edit plans; sign payments on the owner's behalf |
| Operator | Server-side role (`operator`) in an allowlist, never self-assigned | Deployment registry, recovery queue | Register and reserve deployments, review uncertain attempts, mark evidence after manual chain review (with justification) | Sign any transaction for a user; create replacement payments; read private deliverable contents unless needed for review |
| Receipt viewer | None (public) | Nothing | Read deliberately published receipt fields (Stretch) | Anything else |

### D.2 Object ownership and tenant boundaries

- A **deal** belongs to exactly two participants: `client_user_id` and `seller_user_id`. Only participants and operators can read it.
- **Organisations** isolate budget data. Every budget row carries `organisation_id`, and access requires membership.
- Recipients' public addresses are visible only to deal or organisation members. They are not public unless published on a receipt.
- Server routes use the service role, which **bypasses RLS** (`src/lib/supabase.ts:18`). Every route must therefore run explicit ownership checks. RLS is defence in depth for anon and authenticated clients, not the primary control.

### D.3 Three distinct mechanisms

| Mechanism | What it proves | Where |
|---|---|---|
| **Application approval** (CYFER UCP, client approval) | A logged-in CYFER user clicked approve on a specific version. It moves no money. | CYFER database + ledger |
| **Wallet signature** (Freighter) | The holder of a Stellar key authorised **this exact transaction** (a deposit) or signed a binding challenge. | Stellar network / CYFER verifier |
| **On-chain multisig** | Threshold signers approved release through the contract. This is **not used** in the MVP; v1 has no multisig-approval endpoint. | Paiflow contract (Future) |

Release-early requires **no** customer signature. The client's CYFER approval is the only guard before CYFER's server calls it, which is why REQ-APR-01 and REQ-REL-01 are strict.

---

## E. Functional requirements

Priorities: **MVP** (must), **SHOULD**, **STRETCH**, **FUTURE**. All requirements are [PROPOSED] design meeting [APPROVED] scope.

### E.1 Account access and wallet binding

**REQ-ACC-01 — Authenticated accounts (MVP)**
- *Rationale:* Release decisions need an identified actor.
- *Story:* As a client or freelancer, I sign in so CYFER can tie my actions to me.
- *Preconditions:* Supabase Auth is configured.
- *Behaviour:* Email-and-password sign-in through Supabase Auth. Server routes validate the session token on every request. Roles come from server-side tables, never from `user_metadata`.
- *Failure / recovery:* Expired session returns 401 and the user re-authenticates. Financial records are unaffected.
- *Dependencies:* §I.2.
- *Acceptance:*
  - AC1: Every deal, deliverable, approval, payment and release route returns 401 without a valid session.
  - AC2: A user cannot read or act on a deal where they are not a participant (403).
  - AC3: Inherited government roles grant no SME permissions.

**REQ-ACC-02 — Verified wallet binding (MVP)**
- *Rationale:* A connected wallet does not prove account ownership (C-02).
- *Story:* As a user, I prove I control my G-address so CYFER can match me to the deployment's recipient.
- *Preconditions:* Signed in; Freighter installed and on Testnet.
- *Behaviour:*
  1. The server issues a single-use challenge (random nonce, user ID, origin, purpose `wallet-binding`, expiry ≤ 5 min) and stores it.
  2. The browser asks Freighter to sign the challenge for the requested address.
  3. The server verifies the signature against that address using the exact encoding confirmed in Q-08, consumes the nonce, and stores the binding.
- *Failure / recovery:* Wrong signer, expired or reused nonce, or bad signature returns 400 with no binding. Changing the wallet in Freighter later never changes the binding; a new binding needs a new challenge.
- *Dependencies:* Q-08.
- *Acceptance:*
  - AC1: A replayed challenge is rejected.
  - AC2: A signature from another address is rejected.
  - AC3: An address can be actively bound to only one account at a time (unique constraint).
  - AC4: Unbinding is refused while that address belongs to a non-terminal deal.

### E.2 Deployment matching and reservation

**REQ-DEP-01 — Deployment registry and reservation (MVP)**
- *Rationale:* One deployment is one relationship (D-04). The SDK does not create deployments.
- *Story:* As an operator, I register the manually deployed escrow and reserve it for one deal.
- *Preconditions:* A confirmed Paiflow deployment exists, created manually by the deployer with the D-03 graph.
- *Behaviour:*
  - The operator records the deployment UUID, network `testnet`, input asset, template `commission_escrow`, condition `nodeId`, deadline `at`, seller address, buyer address and graph snapshot hash.
  - On deal creation, CYFER requires an exact match (asset, seller wallet, buyer wallet, deadline) to an **unreserved** deployment. It then creates a reservation guarded by a partial unique index (one active reservation per deployment).
  - Server checks `capabilities.get()`: `network === 'testnet'`, `triggerType === 'deposit'`, `inputAsset` matches, `operations.execute` and `operations.releaseEarly` are not `unsupported`.
- *Failure / recovery:*
  - No match: deal creation is refused with "No prepared escrow matches these parties and deadline. Ask the operator."
  - Capability mismatch: the deployment is marked `unusable`.
  - A resolved deal does **not** release the deployment for reuse with a new deadline or new parties. The reservation is closed and the deployment marked `retired`, unless the operator confirms the same parties and the deadline is still in the future (FUTURE).
- *Dependencies:* Manual deployment (§L.3), Q-01.
- *Acceptance:*
  - AC1: Two concurrent reservations of one deployment: exactly one succeeds.
  - AC2: A deal whose wallets differ from the deployment recipients cannot be created.
  - AC3: A deployment with a past deadline cannot be reserved.
  - AC4: The configured deployment comes from server config or the registry, never from discovery order or browser input.

### E.3 Deal creation and versioned terms

**REQ-DEAL-01 — Create deal with hashed terms (MVP)**
- *Story:* As a client, I create a commission deal whose terms are hashed and recorded.
- *Preconditions:* Both parties have accounts and verified wallets; a matching deployment is available.
- *Behaviour:*
  - Terms are canonical JSON: title, description, deliverable description, amount in stroops, asset, deadline (ISO with timezone, equal to the deployment `at`), seller and buyer addresses, deployment UUID, template.
  - CYFER computes SHA-256 over the canonical bytes, stores `terms_version` v1, appends a ledger block and an audit entry.
  - The seller must accept that exact `terms_hash` before funding is allowed.
- *Failure / recovery:* Validation errors return 422. A ledger or audit failure rolls back the deal (single DB transaction or RPC).
- *Acceptance:*
  - AC1: Identical terms always produce an identical hash.
  - AC2: Funding is blocked until both parties have accepted the current `terms_version`.
  - AC3: An amount is stored only as an integer stroop string.

**REQ-DEAL-02 — Terms changes (MVP)**
- *Behaviour:* Any edit creates a new version and voids prior acceptances and approvals. Edits are refused once a deposit attempt exists. The deadline, parties and asset cannot change after reservation, because they are fixed in the deployment.
- *Acceptance:*
  - AC1: Editing v1 produces v2 with a new hash and requires both acceptances again.
  - AC2: Editing after funding returns 409.

### E.4 Escrow funding

**REQ-ESC-01 — Fund escrow through prepare → sign → submit (MVP)**
- *Story:* As the client, I fund the escrow in Freighter and see it held.
- *Preconditions:* Deal `ready_to_fund`; the caller is the client; the session wallet binding equals the deployment's buyer address; deadline ≥ now + safety margin (proposed 10 min, configurable); no non-terminal attempt exists for this deal.
- *Behaviour:*
  1. The server acquires a per-deal lock (row lock or advisory lock).
  2. It calls `execute.prepare({ from: clientAddress, amount: termsAmount })`.
  3. It verifies `network === 'testnet'` and `networkPassphrase` equals the testnet passphrase.
  4. It computes the original hash and **persists** the preparation (XDR, passphrase, `expiresAt`, `historyRequestId`, original hash) **before** returning it to the browser.
  5. The browser shows TESTNET, amount, asset, both recipients and the fee, then asks for consent.
  6. Freighter signs with the returned passphrase; the browser checks that the signer address equals the bound wallet.
  7. The browser sends the signed XDR. The server rechecks the session and ownership, verifies the signed-body hash equals the original hash (rejecting fee-bump envelopes and changed bodies), and **persists** the signed envelope.
  8. The server submits with `wait: false` and `preparationRequestId`, checks the returned `txHash` equals the original hash, and records the response.
- *Failure / recovery:* §F.2 and §G. A repeated "fund" click while an attempt exists returns that attempt. No new preparation is made.
- *Dependencies:* REQ-DEP-01, REQ-ACC-02.
- *Acceptance:*
  - AC1: The preparation row exists before any signature is requested.
  - AC2: The signed envelope row exists before the submit call.
  - AC3: A changed body or fee-bump envelope is rejected and kept as evidence.
  - AC4: A second prepare for the same deal while an attempt is non-terminal returns the existing attempt.
  - AC5: Funding is refused when the deadline is closer than the safety margin.
  - AC6: A Paiflow token never appears in any response, bundle or log.

**REQ-ESC-02 — Deposit confirmation (MVP)**
- *Behaviour:* The deal moves to `funded_held` only when:
  - `transactions.get(originalHash)` returns `SUCCESS` with matching hash and network, **and**
  - a RECEIVE event for that hash is found for the reserved deployment with the expected amount (§H.2).

  `SUCCESS` with events still missing gives `funded_unindexed`, displayed as "Deposit confirmed; awaiting indexed evidence".
- *Acceptance:*
  - AC1: Status `PENDING`, `UNKNOWN`, `NOT_FOUND`, timeout or 502 never shows "held".
  - AC2: `FAILED` returns the deal to `ready_to_fund` only after the failure is recorded. A new attempt then requires deliberate user action.

### E.5 Deliverable submission and hashing

**REQ-DLV-01 — Submit deliverable (MVP)**
- *Story:* As the freelancer, I upload my deliverable and CYFER records its hash.
- *Preconditions:* Caller is the seller; deal `funded_held` (or `funded_unindexed`); deadline in the future.
- *Behaviour:*
  - Enforce a size limit (proposed 10 MB) and a type allowlist (PDF, PNG, JPEG, ZIP, TXT, DOCX) **before** buffering the whole body where possible.
  - Hash the bytes server-side and store the file in a **private** bucket under a server-generated key (no user filename in the path).
  - Create `deliverable_version` n (hash, size, media type, original filename as metadata only), then append a ledger block and an audit entry.
- *Failure / recovery:* Upload failure leaves no version row. Rows are written only after the storage write succeeds, and orphaned objects are cleaned up by a job.
- *Acceptance:*
  - AC1: The file cannot be fetched without a participant session or a short-lived signed URL.
  - AC2: The same bytes produce the same hash.
  - AC3: A new upload creates version n+1 and does not alter n.

**REQ-DLV-02 — Verify a file against the recorded deliverable (MVP)**
- *Behaviour:* A participant uploads a candidate file for a specific deal. CYFER hashes it and compares the result with the **selected** deliverable version, not every document in the system.
- *Display:*
  - Match: "Matches deliverable v{n} recorded {time}. This confirms the bytes are identical. It does not confirm quality, authorship or that delivery was truthful."
  - Non-match: "Does not match deliverable v{n}. The file differs from what was recorded. This alone does not prove tampering."
- *Acceptance:*
  - AC1: A one-byte change yields a non-match.
  - AC2: No result text uses "tampered" as a conclusion.
  - AC3: Verification of another deal's deliverable is refused (403).
  - AC4: Request size and rate are limited (§K.5).

### E.6 Approval bound to a version

**REQ-APR-01 — Client approves a specific deliverable (MVP)**
- *Story:* As the client, I approve exactly the deliverable I reviewed.
- *Preconditions:* Caller is the client; deal `delivered`; request includes `terms_version_id`, `deliverable_version_id` and the `deliverable_sha256` shown on screen.
- *Behaviour:* The server checks that all three equal the **current** versions, then inserts an `approval` row inside the same transaction that moves the deal to `approved`. A ledger block and an audit entry are appended. Rejection records a reason and returns the deal to `funded_held` (seller may resubmit).
- *Failure / recovery:*
  - A stale version returns 409 "A newer deliverable exists; review it first."
  - A duplicate approval returns the existing approval (idempotent on deal, version and approver).
- *Acceptance:*
  - AC1: Approval of v1 after v2 was uploaded is refused.
  - AC2: The seller cannot approve.
  - AC3: Concurrent approve and reject requests leave exactly one decision.
  - AC4: A new terms version voids any approval.

### E.7 Early release

**REQ-REL-01 — Authorised early release (MVP)**
- *Story:* As the client, after approving I trigger payment to the freelancer.
- *Preconditions:* Deal `approved`; caller is the client (or the system acting on the client's recorded approval); a valid approval references the current versions; deposit verified (`funded_held`); `now < deadline − release_margin` (proposed 2 min); no release attempt exists for this deal.
- *Behaviour:*
  1. Under a per-deal lock, insert `release_attempt` with status `requested`, the approval ID, deployment UUID and `nodeId`. **Commit before calling Paiflow.**
  2. Call `releaseEarly({ nodeId })` once.
  3. Persist the response (`txHash`, `ledger`) or the error, including `x-request-id`.
  4. Verify the payout (§H.3).
- *Failure / recovery:*
  - 422 "deadline has passed": record it; the deal moves to `awaiting_refund`.
  - 422 "nothing to release": record it; flag for operator review. Do not retry.
  - 429: honour `Retry-After`. A retry is allowed **only** if no transaction hash was ever returned **and** event checks show no PAYOUT on the True side for this deployment.
  - Timeout, 502 or lost response: status `uncertain`. Run evidence checks (§G.5). **No automatic second call.**
- *Acceptance:*
  - AC1: Without a matching approval the route returns 403, and Paiflow is never called (verified with a mock).
  - AC2: Double-click or concurrent requests produce at most one Paiflow call.
  - AC3: An uncertain outcome never triggers an automatic re-call.
  - AC4: The audit entry records actor, approval ID, deployment, `nodeId`, request ID and returned hash.

### E.8 Deadline refund

**REQ-REF-01 — After-side refund tracking (MVP)**
- *Behaviour:*
  - At `deadline` (no verified release), the deal moves to `awaiting_refund`, displayed as "Deadline reached. Paiflow's automation should refund the client; this is polled and may take several minutes."
  - CYFER polls events with bounded cadence (§G.6) for a PAYOUT to the buyer address for the deal amount.
  - On §H verification the deal becomes `refunded_verified`.
  - CYFER never calls release-early after the deadline and never "triggers" the refund. A missing refund past a threshold (proposed 30 min) raises an operator alert.
- *Acceptance:*
  - AC1: "Refunded" never shows before verification.
  - AC2: The UI states that the refund applies even if the seller delivered.
  - AC3: No release-early call happens at or after the deadline.

### E.9 Payout verification

**REQ-PAY-01 — Verify payout or refund (MVP)**
- *Behaviour:* §H. The result is `verified`, `pending_evidence`, `mismatch` or `operator_review`. Only `verified` unlocks "Paid to seller" or "Refunded to client".
- *Acceptance:* Each §H check has a passing and a failing test with fixtures.

### E.10 Payment recovery

**REQ-REC-01 — Server-side recovery (MVP)**
- *Behaviour:*
  - "Check payment" reads the stored attempt and calls `transactions.get(originalHash)`.
  - It offers "Resubmit same signed envelope" only when the attempt has a stored signed envelope, the outcome is unresolved, and the status is not `SUCCESS` or `FAILED`.
  - It never prepares a replacement while the original is unresolved, unless failure is confirmed or ledger-proven expiry is established by an operator.
  - Recovery survives browser reloads, other devices and storage loss, because all evidence is server-side.
  - Recovery endpoints apply the same ownership checks as checkout.
- *Acceptance:*
  - AC1: After a reload mid-attempt, the deal page shows the same attempt and original hash.
  - AC2: Resubmission posts the byte-identical stored envelope.
  - AC3: `NOT_FOUND` or expiry does not unlock a new prepare (operator action required).

### E.11 Wallet views

**REQ-WAL-01 — Wallet page (MVP)**
- *Behaviour:* Shows:
  - connection state and TESTNET chip
  - the bound address (and a warning if Freighter's current address differs)
  - spendable XLM balance (read from Horizon or Stellar RPC public data)
  - escrow status per deal (the deal state, not a balance claim)
  - history: deposits, releases, refunds and budget payouts, each with its Stellar tx hash, explorer link and verification state

  **Three separate panels:** wallet balance, funds held in escrow (from verified deal state or Q-07), and cumulative verified payouts.
- *Acceptance:*
  - AC1: No panel sums across them.
  - AC2: The CYFER audit `tx_hash` is never shown as a Stellar hash.
  - AC3: A balance read failure shows "unavailable", never zero.

### E.12 Budget plans and envelopes (SHOULD)

**REQ-BUD-01 — Budget plan with fixed Split (SHOULD)**
- *Preconditions:* An organisation exists; a manually deployed `On Receive → Split` deployment on XLM with three percentage recipients: Operations 5000 bps, Payroll 3000 bps, Supplies 2000 bps; distinct funded addresses; total exactly 10,000.
- *Behaviour:*
  - The owner records a plan version (purpose, envelopes with labels, bps, recipient addresses, optional PHP planning figures in integer centavos, total payment in stroops).
  - CYFER checks the envelopes **equal** the deployment's registered recipients and bps. Any mismatch blocks the plan, because recipients cannot change per payment.
  - Hash, ledger block and audit entry are recorded.
- *Acceptance:*
  - AC1: bps ≠ 10,000, duplicate addresses or a mismatch with the deployment are refused.
  - AC2: PHP figures are labelled "planning figure (PHP), not a crypto amount", and no conversion is shown.

**REQ-BUD-02 — Unanimous approval (SHOULD)**
- *Behaviour:*
  - The approver set is snapshotted at plan submission. Each approver approves or rejects the **plan version hash**.
  - The plan becomes `approved` only when every snapshotted approver has approved that version. One rejection gives `rejected`.
  - Approval updates are conditional (`WHERE status = 'pending'`), and the publish transition is conditional on the current state.
  - An empty approver set is invalid and is never auto-approved.
- *Acceptance:*
  - AC1: Concurrent last approvals publish once.
  - AC2: Approving a superseded version is refused.
  - AC3: The owner cannot be the only approver unless the org explicitly has one member (proposal: require ≥ 1 approver other than the owner).

**REQ-BUD-03 — Budget payment and distribution verification (SHOULD)**
- *Behaviour:*
  - The owner's bound wallet pays through REQ-ESC-01 mechanics against the Split deployment.
  - Dashboard states: **Planned → Approved → Payment pending → Distribution verified** (or `mismatch`).
  - Each recipient's payout is verified (§H) at its expected share, with remainder rounding to the last recipient per contract rules.
- *Acceptance:* A confirmed payment with one recipient unverified shows "Payment confirmed; 2 of 3 payouts verified", never "Distributed".

### E.13 Optional receipt publication (STRETCH)

**REQ-RCPT-01 — Public receipt (STRETCH)**
- *Behaviour:* After a terminal verified outcome, both parties opt in. The receipt shows only allow-listed fields (§K.8) at an unguessable slug, and either party can withdraw it. It **excludes** signed envelopes, preparation XDR, private files, emails, internal IDs and credentials.
- *Acceptance:* A response-schema test confirms only allow-listed fields are present.

### E.14 Mocked online-selling workflow (SHOULD)

**REQ-SELL-01 — Online-selling template with mocked courier (SHOULD)**
- *Behaviour:*
  - Same escrow mechanics on a **separate** reserved deployment, with buyer and seller roles.
  - Listing and order terms are hashed.
  - Courier status comes from a local mock that the operator advances. Every screen showing it carries the visible label **"MOCK courier status — not a real courier integration"**.
  - Release still requires the buyer's explicit confirmation (the mock alone never triggers release).
- *Acceptance:*
  - AC1: The mock label is present on every courier element.
  - AC2: The mock "delivered" state without buyer confirmation cannot call release.

---

## F. State models

### F.1 Deal / business state

States: `draft → terms_pending → ready_to_fund → funding → funded_unindexed → funded_held → delivered → approved → release_requested → release_uncertain → payout_verified`. Terminal and side states: `awaiting_refund`, `refunded_verified`, `rejected_deliverable` (returns to `funded_held`), `operator_review`, `cancelled` (only before any deposit attempt).

| From | To | Actor | Guards | Persisted evidence | UI | Recovery |
|---|---|---|---|---|---|---|
| draft | terms_pending | Client | Valid terms; reserved deployment matches | terms_version, hash, reservation, block, audit | "Waiting for seller to accept terms" | Edit creates new version |
| terms_pending | ready_to_fund | Seller | Accepts the current terms hash | acceptance row | "Ready to fund" | — |
| ready_to_fund | funding | Client | Bound wallet = buyer; deadline margin; no open attempt; lock | payment_attempt (prepared) | "Review and sign in Freighter" | Return existing attempt |
| funding | funded_unindexed | Server | `SUCCESS` for original hash | status response | "Deposit confirmed; awaiting indexed evidence" | Bounded event polling |
| funding | ready_to_fund | Server | Confirmed `FAILED` recorded | failure record | "Deposit failed: {reason}" | User deliberately starts a new attempt |
| funding | operator_review | Server | Unresolved after bounded checks, or expired without signature | attempt evidence | "Payment outcome unknown. Do not pay again." | Operator reconciles original hash |
| funded_unindexed | funded_held | Server | RECEIVE event matches (§H.2) | event ID, cursor | "Funds held in escrow" | — |
| funded_held | delivered | Seller | Deadline not passed | deliverable_version | "Deliverable v{n} submitted" | Resubmit = new version |
| delivered | approved | Client | Current versions match; lock | approval row | "Approved v{n}" | Stale gives 409 |
| delivered | funded_held | Client | Rejects with reason | approval(rejected) | "Changes requested" | Seller resubmits |
| approved | release_requested | Client/System | Before deadline − margin; no release attempt | release_attempt(requested) committed first | "Releasing to seller…" | — |
| release_requested | payout_verified | Server | §H.3 passes | payout_verification | "Paid to seller — verified" | — |
| release_requested | release_uncertain | Server | Timeout, 502, lost response, or hash without verified payout | error, request ID | "Release outcome being checked" | §G.5 evidence checks; no blind retry |
| release_uncertain | payout_verified / operator_review | Server/Operator | Evidence found / not found within threshold | verification or review note | — | Operator |
| any pre-terminal with verified deposit | awaiting_refund | Server (clock) | `now ≥ deadline` and no verified True-side payout | transition record | "Deadline reached; refund pending (polled)" | Event polling |
| awaiting_refund | refunded_verified | Server | §H.3 buyer refund passes | payout_verification | "Refunded to client — verified" | — |
| awaiting_refund | operator_review | Server | No evidence after threshold, or True-side payout found instead | alert | "Outcome needs review" | Operator |

### F.2 Payment-attempt state

`prepared → signing → signed_persisted → submitted → {success, failed, pending, unknown, rejected} → reconciled`, plus `expired_unsigned` and `operator_review`.

| From | To | Guard | Evidence | Recovery |
|---|---|---|---|---|
| (none) | prepared | Lock held; no open attempt | XDR, passphrase, network, expiresAt, historyRequestId, original hash | — |
| prepared | signing | Browser requested signature | timestamp | Reload shows same attempt |
| signing | signed_persisted | Body hash = original; no fee-bump; signer = bound wallet | exact signed XDR | — |
| signing | expired_unsigned | Now > expiresAt and no signed envelope received | — | A lost signing response does **not** prove nothing was signed. Check the original hash; operator decides before a new attempt. |
| signed_persisted | submitted | Submit call made | request ID, response or error | Resubmit the **same** envelope only |
| submitted | success / failed | `transactions.get` final status | status, ledger | — |
| submitted | pending / unknown | Non-final status or transport error | status | Bounded checks (§G.6) |
| pending/unknown | operator_review | Bounded checks exhausted | — | Operator reconciles; never auto-replace |

### F.3 Payout-verification state

`not_started → awaiting_tx_final → awaiting_events → verified | mismatch | operator_review`.

| State | Meaning | Exit |
|---|---|---|
| awaiting_tx_final | Release/deposit tx not yet final | `SUCCESS` → awaiting_events; `FAILED` → mismatch |
| awaiting_events | Final tx, payout events not yet indexed | Matching events → verified; wrong recipient, amount or asset → mismatch; threshold exceeded → operator_review |
| verified | All §H checks passed | Terminal |
| mismatch | Evidence contradicts expectation | Operator review; UI shows "Evidence mismatch" |

### F.4 Edge cases

| Case | Required behaviour |
|---|---|
| Late deposit near deadline | Funding refused inside the safety margin. A deposit confirmed after the deadline is held on the after side: show "Deadline passed; this deposit follows the refund path" and verify refund. |
| Deadline crossed during release | Release refused within `release_margin`. A Paiflow 422 "deadline has passed" moves the deal to `awaiting_refund`. |
| Approval rejection | Deal back to `funded_held`; seller may resubmit before the deadline. |
| Client nonresponse | No release. Refund at deadline. UI and pitch state that the seller can be unpaid despite delivery. |
| Wallet change in Freighter | Signing blocked if Freighter address ≠ bound wallet. Binding changes need a new challenge and are refused during an active deal. |
| Terms or deliverable changed | New version; prior approvals voided; stale approvals return 409. |
| Duplicate clicks / concurrent requests | Per-deal lock plus unique constraints: one open attempt per deal, one release attempt per deal, one approval per (deal, deliverable version, approver). |
| Browser reload or storage failure | No effect on evidence (server-side). Page rehydrates from the attempt row. |
| Uncertain deposit response | Keep the attempt; check the original hash; offer same-envelope resubmit only. |
| Uncertain release response | `release_uncertain`; evidence checks; operator review. **No second call** unless §E.7 retry conditions hold. |
| Delayed or missing events | Absence of events never proves failure or authorises another payment. Bounded polling, then operator alert. |
| Confirmed tx, unverified payout | Show "Transaction confirmed; payout not yet verified". |
| Wrong deployment, network, asset or recipient evidence | `mismatch`; never mark paid; operator review; keep all evidence. |

---

## G. Financial invariants and recovery

| ID | Invariant |
|---|---|
| INV-01 | The preparation is persisted server-side **before** the browser receives XDR to sign. |
| INV-02 | The exact signed envelope is persisted **before** submission, and its body hash equals the original hash. |
| INV-03 | Every attempt and verification is bound to deal ID, wallet address, asset, network `testnet` and deployment UUID. Evidence for a different binding is rejected. |
| INV-04 | At most one non-terminal payment attempt per deal (or per budget plan) and one release attempt per deal, enforced by partial unique indexes and a per-entity lock. |
| INV-05 | No replacement payment is prepared merely because an outcome is uncertain, a timer expired, `NOT_FOUND` was returned, or events are missing. |
| INV-06 | Reconciliation always uses the **original hash**. |
| INV-07 | Resubmission uses only the stored byte-identical envelope. |
| INV-08 | Polling is bounded and honours `Retry-After`. |
| INV-09 | Evidence is never deleted to unblock a flow. |
| INV-10 | Payment arithmetic uses integer stroop strings and `bigint`. No floats. |

### G.1 Database/network boundary

A successful database write proves only that CYFER recorded something. It does **not** prove that a payment happened.

A lost HTTP response, timeout or 502 does **not** prove that nothing was broadcast. Submission may have reached the network.

The only payment proof is the final transaction status for the original hash **plus** verified events (§H).

### G.2 Ordering

The `execute` window is about 180 seconds. Preparation, signing, persistence and submission must fit inside it. If the signed envelope arrives after `expiresAt`, persist it anyway and check the original hash before any further action.

### G.3 Concurrency

- Per-deal serialisation uses `SELECT … FOR UPDATE` on the deal row (or `pg_advisory_xact_lock(hashtext(deal_id))`) inside a Postgres function called through RPC.
- State transitions use conditional updates (`UPDATE … WHERE state = $expected`), and zero affected rows returns 409.
- CYFER ledger and audit appends happen inside the same transaction as the state change (§I.11).

### G.4 Deposit recovery

| Observed | Action |
|---|---|
| `SUCCESS` + matching events | Mark verified; never resubmit. |
| `SUCCESS`, events missing | Keep polling within bounds. |
| `PENDING`, `UNKNOWN`, 502, timeout | Keep evidence; check original hash; allow same-envelope resubmit. |
| `FAILED` (final) | Record the failure; a new attempt needs deliberate user action. |
| `NOT_FOUND` or expired | Keep pending; **operator** establishes the outcome. |
| Token revoked or config changed | Recover with a credential authorised for the **same** deployment. Never move the deal to another deployment. |

### G.5 Release recovery

No idempotency key or reconcile endpoint is documented for release-early (D-07). When the outcome is uncertain:

1. If a `txHash` was returned, check it (Q-06) and look for events filtered by that `txHash`.
2. Otherwise, page through deployment events from the stored cursor and look for a PAYOUT to the seller of the deal amount after `release_requested_at`.
3. Found and §H passes: `payout_verified`.
4. Not found within the threshold (proposed 10 min): `operator_review`. The operator checks the Paiflow dashboard and a Stellar explorer and records findings with a justification.
5. A second release-early call is permitted only by an operator, and only after evidence shows the condition still holds funds and no True-side payout exists. Paiflow refuses an empty-balance release ("nothing to release"); this is a safety net, not a guarantee.

### G.6 Polling

- Transaction status (starter pattern): at most 6 lookups inside a 30-second window, with exponential backoff capped at 8 seconds, honouring `Retry-After`.
- Events: stored cursor; fetch immediately while `hasMore`, otherwise wait 10–30 seconds; deduplicate by `eventId`; use a separate cursor when filtering by `txHash`.
- Hard caps per deal (proposed: 40 event polls per hour) stay within Paiflow limits (events 120/60 s, release-early 10/60 s per token).
- No polling loops in the browser for financial decisions. The server (or a scheduled job) owns them.

---

## H. Receipt and payout verification

### H.1 Common checks for any transaction

1. **Finality:** `transactions.get(hash)` returns `SUCCESS` with matching `txHash` and `network === 'testnet'`.
2. **Original hash:** the hash equals the stored original (deposit) or the stored release response hash.
3. **Deployment:** the query is made against the reserved deployment UUID. Evidence from another deployment is rejected.
4. **Network:** testnet only.

### H.2 Deposit (RECEIVE)

5. RECEIVE event with `txHash` = original hash.
6. **Payer** equals the client's bound address (from the decoded event data, or from the transaction source if events do not carry it, per Q-11).
7. **Asset** equals the deployment input asset (native XLM for MVP).
8. **Amount** equals the terms amount exactly (stroop string compare).

### H.3 Payout or refund (PAYOUT)

9. A PAYOUT event to the **expected recipient**: the seller for release, the buyer for refund.
10. Amount equals the expected amount. For the escrow graph that is the full deposit. Any shortfall or surplus is a mismatch, recorded with both values.
11. **Expected direction:** a True-side payout after the deadline, or a False-side payout after a verified early release, is a mismatch.
12. **Pagination:** follow `nextCursor` while `hasMore`, and deduplicate by `eventId`. A page cap is not proof of completeness.
13. **Delayed indexing:** missing events are `pending_evidence`, not failure, until the threshold.
14. **Mismatch:** keep all evidence, show "Evidence mismatch — under review", and never show paid or refunded.

### H.4 Three distinct facts

| Fact | Proven by | UI wording |
|---|---|---|
| Deposit confirmed | H.1 + H.2 | "Deposit confirmed" |
| Funds held | Confirmed deposit, no payout events yet, before deadline (plus balance check if Q-07 allows) | "Held in escrow" |
| Seller payout verified | H.1 + H.3 for release | "Paid to seller — verified" |

### H.5 Split distribution (SHOULD)

Expected share per recipient = `amount × bps / 10000` (bigint floor), with the remainder going to the last recipient, per Split rules in `llms.md`. Each recipient is verified independently.

---

## I. Data and integration design [PROPOSED]

All schema here is **proposed**. Nothing has been migrated. The Postgres guidance applied follows Supabase docs:

- RLS enabled on every new table, with `to authenticated` role scoping.
- Policies use `(select auth.uid())` and index their filter columns.
- Private Storage buckets with signed URLs.
- `security definer` functions live outside exposed schemas and set `search_path`.

### I.1 Organisations and memberships

`organisations(id uuid pk, name text not null, created_at)`

`org_memberships(org_id fk, user_id fk, role text check in ('owner','approver','member'), primary key (org_id, user_id))`, with an index on `user_id`.

### I.2 Users and wallet bindings

- `profiles(user_id uuid pk references auth.users, display_name, is_operator boolean default false)`. The operator flag is set only via migration or service role.
- `wallet_challenges(id, user_id, nonce text unique, purpose, expires_at, consumed_at)`.
- `wallet_bindings(id, user_id, address text check (address ~ '^G[A-Z2-7]{55}$'), network text check = 'testnet', verified_at, revoked_at)` with a unique partial index on `address` where `revoked_at is null`.

### I.3 Deals and versioned terms

- `deals(id, template text check in ('commission_escrow','online_selling'), client_user_id, seller_user_id, deployment_id fk, state text, current_terms_version_id, current_deliverable_version_id, created_at, updated_at)`.
- `deal_terms_versions(id, deal_id, version int, canonical_json jsonb, terms_sha256 char(64), amount_stroops text check (amount_stroops ~ '^[1-9][0-9]{0,38}$'), asset jsonb, deadline_at timestamptz, created_by, created_at, unique(deal_id, version))`.
- `terms_acceptances(terms_version_id, user_id, accepted_at, primary key(...))`.

### I.4 Deployment registry and reservations

- `paiflow_deployments(id uuid pk = Paiflow deployment UUID, network, template, input_asset jsonb, condition_node_id text, deadline_at, seller_address, buyer_address, split_recipients jsonb null, graph_snapshot_sha256, status check in ('available','reserved','retired','unusable'), registered_by, registered_at)`.
- `deployment_reservations(id, deployment_id, deal_id or budget_plan_id, active boolean, created_at, closed_at)` with a unique partial index `(deployment_id) where active`.

No credentials are stored in these tables; the token stays in server env.

### I.5 Payment attempts and recovery evidence

`payment_attempts`:

| Column group | Columns |
|---|---|
| Identity and binding | `id`, `deal_id` or `budget_plan_id`, `deployment_id`, `from_address`, `amount_stroops`, `asset` |
| Preparation | `network`, `network_passphrase`, `prepared_xdr`, `original_tx_hash char(64)`, `history_request_id`, `expires_at` |
| Submission | `signed_xdr`, `submit_status`, `final_status`, `ledger` |
| Diagnostics and audit | `last_request_id`, `state`, timestamps |

Constraints:
- unique on `original_tx_hash`
- partial unique `(deal_id) where state not in ('success','failed_recorded')`

`prepared_xdr` and `signed_xdr` are readable **only** through server routes, never exposed via RLS to clients and never logged.

Retention: keep for the life of the project plus at least 90 days after a terminal state (proposed). Do not purge unresolved attempts.

### I.6 Deliverables

`deliverable_versions(id, deal_id, version, sha256 char(64), size_bytes bigint, media_type, storage_key, original_filename, uploaded_by, created_at, unique(deal_id, version))`. The storage bucket `deliverables` is **private**.

### I.7 Approvals

- `deal_approvals(id, deal_id, terms_version_id, deliverable_version_id, deliverable_sha256, approver_user_id, decision check in ('approved','rejected'), reason, created_at, unique(deal_id, deliverable_version_id, approver_user_id))`.
- `release_attempts(id, deal_id unique, approval_id, deployment_id, node_id, state, tx_hash, ledger, request_id, error_code, requested_at, resolved_at)`.

### I.8 Budget plans and envelopes

- `budget_plans(id, org_id, version, purpose, plan_sha256, deployment_id, total_stroops text, state, created_by, created_at)`.
- `budget_envelopes(plan_id, label, bps int check (bps > 0), recipient_address, planning_php_centavos bigint null, position int)`, with a check that per-plan bps sum to 10000 (enforced in the RPC).
- `budget_approvals(plan_id, approver_user_id, decision, plan_sha256, responded_at, primary key(plan_id, approver_user_id))`. The approver set is snapshotted at submission.

Legacy `budget_data.allocated_amount DECIMAL` is summed client-side with `Number()` and entered with `parseFloat` (`src/app/api/budget/route.ts:50`; `src/app/(admin)/admin/budget/page.tsx:73`). This is a **migration concern**. Retire the legacy table from SME flows rather than reusing it.

### I.9 Verified payouts

`payout_verifications(id, deal_id or budget_plan_id, attempt_id or release_attempt_id, tx_hash, expected_recipient, expected_amount_stroops, observed_amount_stroops, asset, event_ids text[], state, checked_at, notes)`.

`event_cursors(deployment_id, scope, cursor, updated_at)`.

### I.10 Audit entries

Reuse `transactions`, but add `deal_id`, `org_id`, `actor_user_id`, `hash_input jsonb` (every field hashed, including the timestamp actually used) and new `action_type` values: `deal_create`, `terms_accept`, `fund_prepare`, `fund_submit`, `deliver`, `approve`, `release_request`, `release_result`, `payout_verified`, `refund_verified`, `operator_review`.

Rename the UI label to "CYFER audit hash" to distinguish it from Stellar hashes.

### I.11 CYFER ledger integrity fix

Today `addBlock` reads the latest block and then inserts (`src/lib/blockchain.ts:84-113`), and audit linkage reads the latest by `created_at` (`src/lib/audit.ts:27`). Both race under concurrency.

Proposed fix: a Postgres function that locks the chain tail (`pg_advisory_xact_lock`) and computes or inserts within one transaction. The secondary-node anon-key upsert (`src/lib/blockchain.ts:129-149`) is excluded from SME claims.

### I.12 Optional public receipts (STRETCH)

`public_receipts(slug text unique (≥128-bit random), deal_id, published_fields jsonb, published_by_client_at, published_by_seller_at, withdrawn_at)`.

### I.13 Migration requirements (not executed)

1. Read-only inventory of the live schema to resolve C-09 (Q-10).
2. New numbered migration files under `supabase/migrations/`. Never edit `001`.
3. Drop or stop using the `budget_data` "Admins can manage" `FOR ALL authenticated` policy for any SME data.
4. All financial tables: RLS on; no anon access; writes only via server or RPC.
5. Data backfill: none. The SME features start empty.
6. Never run seeds (`supabase/seeds/*`, `scripts/seed-demo-data.js`) or `test-supabase.ts` against a shared database without explicit approval.

### I.14 Endpoint contracts [PROPOSED]

All endpoints share these properties:

- same-origin, `Content-Type: application/json` except uploads
- body limit (JSON 64 KB; signed XDR ≤ 200,000 chars, as in the starter)
- rate limited
- session required unless marked public
- response format `{ data }` / `{ error: { code, message } }`

| Method / path | Who | Intent | Notable errors |
|---|---|---|---|
| POST `/api/wallet/challenge` | Signed in | Issue binding nonce | 429 |
| POST `/api/wallet/bind` | Signed in | Verify signature, bind | 400 bad signature, 409 address bound |
| GET `/api/wallet/summary` | Signed in | Balance, deals, history | 502 balance unavailable (shown as "unavailable") |
| POST `/api/operator/deployments` | Operator | Register deployment; run capability check | 422 capability mismatch |
| POST `/api/deals` | Client | Create deal, terms v1, reservation | 409 no matching deployment |
| POST `/api/deals/:id/terms` | Participant | New terms version | 409 after funding |
| POST `/api/deals/:id/terms/:v/accept` | Participant | Accept terms hash | 409 stale |
| POST `/api/deals/:id/fund/prepare` | Client | Prepare or return existing attempt | 409 deadline margin, 403 wallet mismatch |
| POST `/api/deals/:id/fund/submit` | Client | Persist and submit signed envelope | 422 body changed, 409 not prepared |
| POST `/api/deals/:id/fund/check` | Participant | Check original hash; same-envelope resubmit | 429 with Retry-After |
| POST `/api/deals/:id/deliverables` (multipart) | Seller | Upload and hash | 413, 415, 409 deadline |
| POST `/api/deals/:id/verify-file` (multipart) | Participant | Compare with deliverable vN | 413, 403 |
| POST `/api/deals/:id/approve` / `reject` | Client | Version-bound decision | 409 stale, 403 |
| POST `/api/deals/:id/release` | Client | Authorised release-early | 403 no approval, 409 exists, 422 deadline |
| GET `/api/deals/:id` | Participant | Deal, timeline, evidence (no XDR) | 403 |
| POST `/api/operator/review/:id` | Operator | Record review outcome with justification | 403 |
| POST `/api/orgs/:id/budget-plans` etc. | Owner/approver | Plan, approve, pay | 409, 422 |
| GET `/r/:slug` | Public | Published receipt fields | 404 |

---

## J. Screens and UX

Shared rules for every screen:

- A persistent **TESTNET** chip on every page that shows money.
- Status is never conveyed by colour alone.
- Keyboard focus is visible.
- Live status regions use `aria-live="polite"`.
- Hashes are shown abbreviated, with copy buttons and full text available to screen readers.
- Explorer links are labelled "Stellar Expert (testnet)".
- "Paid" and "Refunded" appear only after verification.

| Screen | Purpose | Primary actor / action | Visible information | Restrictions | States | Reuse |
|---|---|---|---|---|---|---|
| Sign-in / Wallet binding | Account + wallet proof | Any user; sign challenge | Bound address, network | Signed in | loading, not installed, wrong network, signature rejected, bound | `login/page.tsx`, `Input`, `Button` |
| Wallet | Balances and history | Bound user | Spendable XLM, held-in-escrow per deal, cumulative verified payouts (separate), history with Stellar hashes | Own data only | loading, unavailable, empty history, pending items, verified | `Card`, `Table`, `Badge` |
| New deal | Create terms | Client | Template, parties, amount (XLM entered as decimal and converted to stroops via bigint), deadline (read-only from the deployment), terms hash after save | Client with bound wallet | validation errors, no matching deployment, saved | `Input`, `Modal` |
| Deal detail | Single source of truth | Participants | Timeline, terms hash, deposit hash, held state, deliverable versions, approval, release/refund evidence, nonresponse warning | Participants, operator | each F.1 state with plain-language text; uncertain shows "Do not pay again" | `AuditTimeline`, `Badge` |
| Fund escrow (modal) | Consent and sign | Client | TESTNET, amount, asset, seller and buyer recipients, fee, expiry countdown | Bound wallet = buyer | preparing, awaiting signature, wallet changed, expired, submitted, pending, confirmed, failed | starter `starter-app.tsx` pattern |
| Deliver | Upload file | Seller | Size/type limits, resulting hash | Seller | uploading, too large, wrong type, recorded | `UploadForm` |
| Review & approve | Version-bound approval | Client | Deliverable vN hash, download (signed URL), verify-file tool, approve or reject | Client | stale version, approved, rejected | `ApprovalCard` |
| Verify file | Byte comparison | Participant | Selected version, result text per REQ-DLV-02 | Participants | match, no match, too large | `/verify`, `VerificationResult` |
| Budget plan (SHOULD) | Plan, approvals, distribution | Owner, approvers | Envelopes with bps and addresses, PHP planning figures labelled separately, approval progress "2 of 3", four-state dashboard | Org members | Planned, Approved, Payment pending, Distribution verified, mismatch | `BudgetChart`, `BudgetTable`, `ApprovalStatus` |
| Online-selling (SHOULD) | Mock courier + escrow | Buyer, seller | Order hash, **MOCK** courier status | Participants | as deal + mock states | Deal detail |
| Operator console | Registry and reviews | Operator | Deployments, reservations, review queue (no XDR shown) | Operator only | — | `Table` |
| Public receipt (STRETCH) | Shareable proof | Anyone | Allow-listed fields only | Public | not found, withdrawn | `Card` |
| Landing (STRETCH) | Rebrand | Visitors | SME positioning; government as future direction only | Public | — | `(public)/page.tsx` |

---

## K. Security and privacy

1. **Server-only Paiflow credentials.**
   - `PAIFLOW_BASE_URL`, `PAIFLOW_DEPLOYMENT_ID` (or the registry) and `PAIFLOW_API_TOKEN` live in server env only.
   - Never use the `NEXT_PUBLIC_` prefix. The SDK is imported only from a `server-only` module.
   - Never return or log the token. A build-time bundle check (starter `scripts/check-browser-bundle.mjs` pattern) confirms no token-shaped string reaches the client.
2. **Wallet-only signing.** CYFER never receives secret keys or seed phrases. The server never signs user transactions.
3. **Authenticated ownership checks.** Every route checks session, participant or role, wallet binding and deal state server-side. The client-side admin guard (`src/app/(admin)/admin/layout.tsx:12-18`) is a convenience, not a control.
4. **Release authority.** The release route is the most privileged operation. It requires a valid version-bound approval, a lock, a single attempt and an audit entry. The deployer wallet and any token holder can still release, so the token is held by one named owner (Q-01), rotated after the event, and its exposure is treated as an incident.
5. **Replay, duplicate and rate limits.**
   - Single-use challenge nonces.
   - Unique constraints for attempts, releases and approvals.
   - Same-origin checks.
   - Per-user and global rate limits for prepare, submit, check, release, upload and verify.
   - Body-size limits enforced while streaming (starter `lib/http.ts` pattern).
   - Note: in-memory limits are per-process.
6. **Private deliverables.**
   - Private bucket, server-generated keys, signed URLs ≤ 5 min.
   - Type allowlist; size ≤ 10 MB (proposed).
   - Content served with `Content-Disposition: attachment`.
   - The inherited `documents` bucket uses public URLs (`src/app/api/documents/route.ts:149-151`) and must not be used for deliverables.
7. **RLS and tenant isolation.**
   - New tables are scoped by participant or org membership.
   - The inherited policies that allow any authenticated user to write `budget_data` (`supabase/policies/001_rls_policies.sql:123-125`) or read all users and approvals (`:18-20`, `:81-83`) are **gaps** and must not cover SME data.
8. **Public data.**
   - Receipts may show: deal title (opt-in), template, terms hash, deliverable hash, deadline, deposit / release / refund Stellar hashes, verification states, timestamps.
   - Receipts never show: emails, credentials, signed or prepared XDR, private files, internal user IDs, request IDs.
9. **Honest integrity claims.**
   - The CYFER ledger is an application hash chain in a database the team controls; operators with database access could rewrite it.
   - Do not call it "immutable" or "anchored on Stellar".
   - Existing audit hashes cannot be recomputed, because the `Date.now()` input is not stored (`src/lib/audit.ts:34`); fix per §I.10.
10. **Safe diagnostic logging.** Log codes, request IDs, deal IDs and hashes only. Never log tokens, signed envelopes, recovery records, file contents or full addresses with emails.
11. **Recovery-record access.** Prepared and signed XDR are readable only by server routes acting for the deal's client or an operator, and are never sent back to the browser after signing.
12. **Observed inherited gaps, recorded as requirements (not fixed in this task):**
    - GET budget treats any `Authorization` header as admin (`src/app/api/budget/route.ts:22-33`).
    - Unpublished documents are readable by ID (`src/app/api/documents/[id]/route.ts:15-28`).
    - Verify matches unpublished documents and writes an audit row per public call (`src/app/api/verify/route.ts:31-35`, `:72-84`).
    - Search input is interpolated into a PostgREST filter (`src/app/api/documents/route.ts:46`).
    - The token is stored in `localStorage` (`src/app/(admin)/login/page.tsx:39`).
    - Approval updates are not conditional on `pending` (`src/app/api/consensus/[documentId]/approve/route.ts:102-105`).

    SME routes must not inherit these patterns. The inherited routes are either removed from the SME build or fixed before reuse.

---

## L. Delivery scope and dependencies

### L.1 Scope matrix

| Capability | MVP | SHOULD | STRETCH | FUTURE |
|---|---|---|---|---|
| Commission escrow, XLM, one deployment | ✔ | | | |
| Wallet binding, wallet page | ✔ | | | |
| Hashed terms, deliverable, approval, release, refund tracking, payout verification, recovery | ✔ | | | |
| File verification against deliverable | ✔ | | | |
| Budget envelopes (Split 50/30/20) + UCP | | ✔ | | |
| Online-selling template, mocked courier | | ✔ | | |
| USDC via separate deployments and trustlines | | | ✔ | |
| Public receipt page | | | ✔ | |
| Landing-page rebrand | | | ✔ | |
| Government adaptation | | | | ✔ |
| Automated per-deal deployment provisioning | | | | ✔ |
| Arbitration / multisig | | | | ✔ |
| Swaps, broader integrations | | | | ✔ |

**MVP acceptance boundary:** the MVP is complete when every check marked MVP in §M has passed, plus one manual testnet rehearsal (T-01 to T-07) with recorded hashes. SHOULD and STRETCH items never block MVP acceptance.

### L.2 Implementation slices (in dependency order)

| Slice | Content | Depends on |
|---|---|---|
| S0 | Spikes Q-06, Q-07, Q-08, Q-11 against the SDK/API README; record findings in this PRD | — |
| S1 | Read-only live schema inventory; new migration for profiles, wallets, deployments, deals, terms, attempts, deliverables, approvals, releases, verifications, cursors; RLS | Q-10 |
| S2 | Manual escrow deployment (§L.3); operator registry route; capability check | Q-01, Q-02, Q-09 |
| S3 | Server-only Paiflow module (port the starter `lib/paiflow.ts`); env validation; bundle check | S2 |
| S4 | Wallet challenge/bind; wallet page (balance read) | S1 |
| S5 | Deal + terms + acceptance | S1, S2 |
| S6 | Fund: prepare, sign, persist, submit, check, recover | S3, S4, S5 |
| S7 | Deliverable upload (private) + verify-file | S5 |
| S8 | Version-bound approval + release route + release recovery | S6, S7 |
| S9 | Payout verifier + event cursor polling + refund tracking | S6, S8 |
| S10 | Deal detail timeline + wallet history | S9 |
| S11 (SHOULD) | Split deployment, budget plan, UCP rewrite, distribution verification | S3, S9 |
| S12 (SHOULD) | Online-selling template + labelled mock | S8 |
| S13 (STRETCH) | USDC deployment; receipts; landing | S9 |

### L.3 Manual deployment prerequisites

1. The deployer signs in to Paiflow (event access code is held by the team, never in the app).
2. Build **On Receive (native XLM) → Condition `time_before` at {deadline, with timezone}**:
   - True → **Pay**, `fullAmount: true`, recipient = seller G-address.
   - False → **Pay**, `fullAmount: true`, recipient = buyer G-address.
   - Both handles connected. No Hold. No Return to owner. Dev mode off.
3. Review the English preview; deploy from the funded deployer wallet; wait for `CONFIRMED`.
4. Record the deployment UUID and the condition node ID.
5. Create a **Read and operate** developer token (`pfd_`) explicitly selecting this deployment, or a `pfk_` token. Store it only in the server `.env.local`.
6. For SHOULD: a separate **On Receive (XLM) → Split** deployment with 5000/3000/2000 bps to three distinct funded addresses.
7. For STRETCH USDC: a separate deployment per asset; every payer and recipient adds the exact trustline (code `USDC`, issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`) and obtains a balance.

### L.4 Wallet and recipient prerequisites

- Client, freelancer and deployer are distinct Freighter testnet accounts, Friendbot-funded. The client keeps XLM for the deposit plus fees and reserves.
- Recipients must already exist as funded accounts; otherwise the payment reverts (`AccountMissingError`).
- Never put secret keys in the app, the repository, prompts or slides.

### L.5 Configuration and operational ownership

| Item | Owner | Location |
|---|---|---|
| Paiflow token | Named team member (Q-01) | Server `.env.local` only; rotate after event |
| Deployment registry | Operator | `paiflow_deployments` table |
| Supabase service role key | Team lead | Server env |
| Demo wallets | Assigned per Q-02 | Freighter on demo machines |
| Recovery review | Operator | Operator console |

### L.6 Reuse, change and remove map

| Inherited item | Decision |
|---|---|
| `src/lib/hash.ts`, `src/components/ui/*`, `AuditTimeline`, `BudgetChart`, `BudgetTable`, `VerificationResult` | Reuse |
| `src/lib/blockchain.ts`, `src/lib/audit.ts` | Change (§I.10–I.11) |
| `src/lib/auth.ts` | Change: SME roles, operator flag, participant checks |
| UCP routes and components | Change for budget plans (REQ-BUD-02) |
| `/api/budget`, `budget_data`, government budget pages | Remove from SME navigation; replace with budget plans |
| Documents portal, `/api/documents`, `/api/summarize`, `src/lib/ai.ts` | Remove from SME navigation (not in brief scope). Keep code until the team decides; remove the public AI cost path if unused. |
| `src/lib/nodes.ts` multi-node replicas, `/blockchain` explorer "consensus" claims | Do not present as SME features. Remove or relabel as an application ledger viewer. |
| `prototype/` static mockups | Historical design reference only |
| `supabase/seeds/*`, `scripts/seed-demo-data.js`, `test-supabase.ts` | Do not run against shared DB without approval; government demo data is irrelevant |
| Government copy ("Where your taxes went", SDG 16, LGU roles) | Replace in SME screens |

---

## M. Verification and traceability

### M.1 Verification levels

| Level | What | Status today |
|---|---|---|
| **Mocked automated tests** | Unit and route tests with fixtures and mocked SDK (to be added: no test runner or `npm test` exists; propose Vitest as in the starter) | Not started |
| **Manual testnet rehearsals** | Real Freighter and real deployment on Testnet, hashes recorded | Not started |
| **Human review** | PRD review, copy review for honest wording, security review of release route | This PRD awaits review |
| **Production readiness** | Out of scope: requires mainnet decision, legal, KYC, tax, audits | Not claimed |

Current commands in this repo (`package.json:5-10`): `npm run build`, `npm run lint`. The starter's `pnpm typecheck`, `pnpm test` and `pnpm build` apply only to the separate reference repository.

### M.2 Traceability

| Req | Acceptance checks | Level | Evidence required |
|---|---|---|---|
| REQ-ACC-01 | 401 without session; 403 non-participant | Mocked | Test output |
| REQ-ACC-02 | Replay rejected; wrong signer rejected; unique address | Mocked + manual | Test output; binding row |
| REQ-DEP-01 | Concurrent reservation → one wins; mismatch refused; past deadline refused | Mocked | Test output |
| REQ-DEAL-01/02 | Deterministic hash; acceptance gating; edit after funding 409 | Mocked | Test output |
| REQ-ESC-01 | Prep persisted before sign; envelope persisted before submit; altered body rejected; duplicate click returns same attempt; token absent from bundle | Mocked + bundle check | Test output; bundle scan |
| REQ-ESC-02 | PENDING/UNKNOWN/502 never "held" | Mocked | Test output |
| REQ-DLV-01 | Private fetch denied; versioning | Mocked + manual | Test output |
| REQ-DLV-02 | 1-byte change → no match; no "tampered" verdict | Mocked + human copy review | Test output; screenshot |
| REQ-APR-01 | Stale version 409; seller cannot approve; concurrent decisions → one | Mocked | Test output |
| REQ-REL-01 | No approval → 403 and SDK not called; concurrent → one call; uncertain → no re-call | Mocked | Test output with SDK call count |
| REQ-REF-01 | No release-early at/after deadline; "Refunded" only after verification | Mocked + manual (T-08) | Test output; refund hash |
| REQ-PAY-01 | Each §H check passes and fails with fixtures | Mocked | Test output |
| REQ-REC-01 | Reload preserves attempt; resubmit identical bytes; NOT_FOUND blocks new prepare | Mocked + manual | Test output |
| REQ-WAL-01 | Separate panels; audit hash ≠ Stellar hash label; unavailable ≠ 0 | Mocked + human | Screenshot |
| REQ-BUD-01..03 | bps=10000; mismatch refused; concurrent last approval publishes once; partial distribution wording | Mocked + manual | Test output; hashes |
| REQ-RCPT-01 | Allow-listed fields only | Mocked | Schema test |
| REQ-SELL-01 | Mock label everywhere; mock cannot release | Mocked + human | Screenshot |

### M.3 Manual testnet rehearsal (authorised, small amounts, own deployment)

| ID | Scenario | Expected | Record |
|---|---|---|---|
| T-01 | Bind client and seller wallets | Bindings verified | Addresses (public) |
| T-02 | Create deal; seller accepts | Terms hash recorded | Terms hash |
| T-03 | Fund 1 XLM | SUCCESS; RECEIVE matched; "Held" | Deposit hash |
| T-04 | Seller uploads file | Hash recorded | SHA-256 |
| T-05 | Verify same / altered file | Match / no match (no "tampered") | Screenshots |
| T-06 | Client approves v1; release | Release hash; PAYOUT to seller verified | Release hash, explorer link |
| T-07 | Reload mid-funding (separate deal / deployment) | Same attempt shown; no new prepare | Attempt ID |
| T-08 | Refund path on a **separate** short-deadline deployment, no approval | Refund verified some minutes after deadline | Refund hash |
| T-09 | Unauthorised release attempt (seller session) | 403; no Paiflow call | Log |

No live financial test runs without the team's explicit authorisation. Use no load testing or API spam.

---

## N. Demo and open decisions

### N.1 Format (25 Oct 2026, pitching from 4:00 PM PHT)

Three minutes for pitch and demo, then two minutes of Q&A. Order per the primer: **Problem → Solution → Stellar impact → Paiflow integration → Demo**.

| Segment | ≈ Time | Content |
|---|---|---|
| Problem | 0:20 | Freelancer delivers and is not paid; buyer pays and receives nothing. No statistics unless sourced. |
| Solution | 0:25 | "Paiflow holds and routes the money. CYFER proves why it moved." Hashed terms → held deposit → hashed delivery → version-bound approval → verified payout. |
| Stellar impact | 0:20 | **Demonstrated:** testnet deposits, on-chain holding, verified payouts with hashes. **Potential (not demonstrated):** SME adoption, stable-asset invoicing. |
| Paiflow integration | 0:25 | Show the graph: On Receive → time_before → Pay seller / Pay buyer. Explain release-early vs automatic refund; one deployment = one relationship. |
| Demo | 1:30 | See N.2 |

### N.2 Demo honesty labels

| Step | Label |
|---|---|
| Connect wallet, create deal, fund in Freighter, show held | **Live** only if T-01 to T-03 passed today; otherwise **Recorded** and said so |
| Upload deliverable, hash recorded | **Live** (application) |
| Approve → release → seller payout with hash | **Live** if T-06 passed; otherwise **Recorded** |
| Refund path | **Explained** with the graph, or **Recorded** from T-08. Never promised to complete during the 3-minute pitch. |
| Tamper check | **Live** (application): "no match", not "fraud proven" |
| Budget split, online selling | **Live** only if SHOULD slices passed; courier is always **Mocked** |
| Government use | **Future direction**, not demonstrated adoption |

### N.3 Required statements

- "If the client never approves, the deadline refunds the client even if the freelancer delivered. CYFER's evidence helps a dispute but cannot move money. Arbitration is future work." (Q-04)
- "Our server can release early only to the fixed seller, and only after the client's recorded approval. Whoever holds the deployment token or the deploying wallet is trusted; we log every release."
- "Testnet only: this is a simulation with no real money."
- "The hash proves the file is byte-identical, not that the work is good."

### N.4 Open decisions

See §A.8 (Q-01 to Q-11). Q-01, Q-02 and Q-09 block the live demo; Q-06, Q-08, Q-10 and Q-11 block implementation of their slices.

---

*Process note: this PRD was drafted with AI assistance (Claude Code) from the team brief and the listed sources, and requires team review before implementation planning.*
