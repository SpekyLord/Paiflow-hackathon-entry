# CYFER for SMEs — Escrow, Budget Tracking and Verified Payouts

> **Paiflow moves the money. CYFER proves what was approved and what was paid.**

CYFER for SMEs is the original CYFER (tamper-proof records, unanimous multi-approval, audit trail, budget transparency) built for small and medium enterprises, plus a non-custodial Stellar wallet and Paiflow-powered payments. Protected payments (escrow) are one tool inside the platform, built to prevent scams. They are not the whole product.

---

## A. Document control

| Field | Value |
|---|---|
| Version | 2.1.0 (re-tiered to the revised 25 Oct 2026 team brief: budget plan with Split is the MVP; protected payment is a Should-have) |
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
3. **Product decision**: the team brief "CYFER for SMEs: Escrow, Budget Tracking and Verified Payouts" (25 Oct 2026, revised edition with the Must / Should / Nice tiers). It sets audience, scope and priorities.
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
| Budget plan | A versioned, hashed CYFER record of a purpose, its envelopes, their shares and the total payment. It must be approved by every designated approver before the payment can be signed. |
| Envelope | One recipient of a budget plan: a label (for example Operations, Payroll, Supplies), a share in bps and a wallet address. Each envelope is a separate wallet. |
| Split | The Paiflow flow `On Receive → Split`. Recipients are percentage shares that total exactly 10,000 bps, all in the same mode, with no duplicate addresses. |
| Protected payment | The Paiflow flow `On Receive → Condition time_before → Pay payee / Pay payer`. Money is held until a condition is met, and refunded to the payer at the deadline. Also called escrow. |
| Deal | A CYFER business record for one protected-payment relationship between one payer (for example a client, an SME or a customer) and one payee (for example a freelancer, supplier, contractor or SME). Commission is the worked example. |
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
| D-01 | The **budget plan with a fixed three-envelope Split (Operations 50%, Payroll 30%, Supplies 20%)** is the live MVP and the primary demo flow. The protected payment (commission example) is a Should-have add-on shown after it. Online selling, supplier deposit and contractor milestone are Nice-to-have, and online selling's courier tracking is mocked and labelled as mocked. | Brief §9 (Must / Should / Nice) and §11 open-question recommendation ("budget flow is the live demo, protected payment the add-on") |
| D-02 | XLM is the MVP asset. USDC is Nice-to-have, needs a separate deployment per asset and a trustline on every payer and recipient wallet, and is attempted only if time allows. | Brief §8; Guide "Optional: use USDC" |
| D-03 | Escrow graph uses `time_before`, with explicit Pay to buyer on False. No Hold. No Return to owner. | `llms.md` Condition, Hold and Return to owner sections; Freelance escrow example |
| D-04 | One manually created deployment is reserved for exactly one active demo deal. | `llms.md` §1 and Condition; Event Primer §04 |
| D-05 | Financial evidence is stored **server-side** in Supabase. The starter's browser storage is a teaching pattern and is insufficient here. | Guide §11; starter README "Recover" |
| D-06 | The terms "Paid" and "Refunded" appear only after §H verification. | Guide §10; `llms.md` Execute |
| D-07 | Release-early has **no** documented idempotency key or reconcile endpoint. CYFER must never blindly retry it and must use evidence checks with operator review instead. | `llms.md` Release early (no key documented); staging path list has no `release-early/reconcile` |
| D-08 | PHP planning figures are kept separate from crypto amounts. There is no exchange rate, conversion or fiat custody. | Brief §5 and §10 |
| D-09 | The CYFER ledger is described as an **application hash chain**, never as public-chain anchoring. | `src/lib/blockchain.ts:80-123` writes only to Supabase |
| D-10 | A wallet becomes bound to an account only through a server-verified signed challenge. | Guide §09 requires "verified wallet ownership" |
| D-11 | CYFER never holds funds or keys. For each payment the SME picks one money tool: **Split** (budget allocation to envelopes), **Pay** (a fixed payee such as a supplier or payroll wallet) or **Protected payment** (held until a condition). Only Split is MVP. | Brief §3 |
| D-12 | Recipients, percentages, deadline and asset are fixed per deployment (Dev mode is off during the event). A new payee, a changed envelope or a new protected payment is a **new flow** with a **fresh approval**. Per-payment flow creation is Future. | Brief §4, §10; `llms.md` |
| D-13 | A confirmed transaction and a verified payout are separate checks. A budget plan shows "Distribution verified" only when every envelope payout has passed §H. If a payment times out, CYFER checks the **original** transaction hash and never sends another payment. | Brief §4 |
| D-14 | Interoperability means Stellar assets and Stellar wallets only. It does not mean bridging to other blockchains, and the wallet does not hold Bitcoin or Ethereum. Swaps (Soroswap) are Future. | Brief §7, §8 |

### A.6 Contradictions found and how they are resolved

| # | Contradiction | Resolution |
|---|---|---|
| C-01 | Brief: "release goes to the False branch automatically" at the deadline. Paiflow: automation is polled, and payments land 1–2 minutes after they are due. | The refund becomes **eligible** at the deadline. The PRD never promises an exact-second refund (§F, §N). |
| C-02 | Brief §5: "CYFER stores only the public G… address". MVP needs an authenticated account bound to that wallet. | A public address is a stored identifier. Account binding needs a signed challenge (REQ-ACC-02). |
| C-03 | Brief §7 and §9 call the hash "tamper-proof" and say "anchors it". The CYFER ledger is a Supabase table. | Use "hash recorded in CYFER's append-only application ledger". Do not claim immutability or public anchoring (§K.9). |
| C-04 | Brief §8 lists Verification and Freighter as "Live" and the hosted page as "available". | Those are intended demo goals. Nothing is live until §M evidence exists. |
| C-05 | Brief §3 calls the last step "publish receipt"; §9 lists the public receipt page as Should-have. | The receipt page is **Should** (REQ-RCPT-01). MVP shows verified evidence, with transaction hashes, on the authenticated budget-plan page. |
| C-10 | PRD v2.0.0 made commission escrow the only MVP and budget plans a Should-have. The revised brief reverses this. | v2.1.0 follows the brief (D-01). Escrow requirements keep their IDs but are re-tiered to SHOULD. |
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
| Q-01 | Who deploys the flows (Split first, then the protected payment) and holds the Paiflow token today? | Team | Slice S2 |
| Q-02 | Who plays each wallet role in the demo: owner, approvers, signer, the three envelope recipients, and (Should) payer, payee and deployer? | Team | S2, demo |
| Q-03 | Is USDC attempted today, or XLM only? (Recommendation: XLM only.) | Team | Stretch (USDC) |
| Q-04 | Q&A answer for "what if the payer never approves?" (proposed wording in §N.3). | Team | Pitch |
| Q-05 | Keep the "CYFER" name with "for SMEs", or rebrand? | Team | Landing page (SHOULD) |
| Q-12 | Is the budget flow the live demo with the protected payment as the add-on? **Resolved: yes**, per the brief's recommendation (D-01). Revisit only if S7 or S8 slips. | Team | Demo order |
| Q-06 | Does `transactions.get(txHash)` resolve a **release-early** transaction hash, or only execute hashes? | Spike against API README | REQ-PAY-01 |
| Q-07 | Does `GET /balances` (in the staging path list) report a condition's held balance, and in what shape? | Spike | REQ-WAL-01 |
| Q-08 | What is the exact Freighter `signMessage` encoding (SEP-53) for the pinned `@stellar/freighter-api` version, and which server-side verification library will be used? | Spike | REQ-ACC-02 |
| Q-09 | What is the demo deadline? It must leave time for early release in the pitch, yet still allow a refund-path rehearsal. | Team | S2 |
| Q-10 | What does the live Supabase schema actually contain? (See C-09.) | Team, read-only check | S1 |
| Q-11 | How does a release-early event appear in `events.list` (kind, topic, `nodeId`, recipient fields)? | Spike | REQ-PAY-01 |

---

## B. Product definition

### B.1 Problem [APPROVED]

SMEs often cannot show where their money went, and cannot fully trust everyone they pay or get paid by:

- **Untracked funds.** Budgets run through chat messages and spreadsheets, so nobody can easily show what was planned, what was spent and who agreed to it.
- **Weak approvals.** One person can move money without a record that the owners or finance team agreed.
- **Altered or disputed documents.** An invoice, contract or receipt can be edited after the fact, and "which version did we agree to?" is hard to prove.
- **Payment scams.** Paying upfront for something never delivered, or delivering and never being paid, is a risk with any supplier, contractor, freelancer or online customer the SME cannot fully trust. Commissions and online selling are only two examples.
- **No shared proof.** Partners, investors and customers cannot independently check the records.

No market statistics are claimed. Any statistic used in the pitch needs a cited source first.

### B.2 Intended users

| User | Need |
|---|---|
| SME owner | Record a budget plan, split incoming funds into envelopes with recorded approval, sign one payment, and see planned versus verified payouts. |
| Co-owner or finance approver | Approve a budget plan before money moves. |
| Envelope recipient (department, payroll wallet, supplier wallet) | Receive a planned share, and have evidence that the payout matched the approved plan. |
| Payer in a protected payment (SME, client or customer) | Pay only when the agreed work or goods arrive, and get the money back if they do not arrive by the deadline (Should). |
| Payee in a protected payment (supplier, contractor, freelancer or SME) | See that the money is held before starting, and have evidence of what was delivered (Should). |
| Partners, investors and customers | Check the records and transaction hashes independently, through receipt pages (Should). |

### B.3 Value proposition

**One platform for records, approvals and money.** CYFER keeps the records, approvals and audit trail. Paiflow moves the money. CYFER binds each money movement to a hashed plan or document, an approval by every designated approver, and independently verified payout evidence. **CYFER never holds funds or wallet keys.**

| Does | CYFER (our app) | Paiflow |
|---|---|---|
| | Hashes plans and documents, runs approvals, logs every action, verifies payouts, shows the dashboard | Receives the payment on-chain, pays only fixed recipients, splits by percentage, can hold funds until a condition |
| Does not | Hold funds or wallet keys | Decide whether a spend was a good one |

For each payment the SME picks the money tool it needs:

| Tool | Paiflow flow | Use it for | Tier |
|---|---|---|---|
| Split | On Receive → Split | Budget allocation to departments, envelopes or partners | **MVP** |
| Pay | On Receive → Pay | A fixed payee such as a supplier or a payroll wallet | STRETCH (REQ-MOV-01) |
| Protected payment | On Receive → time condition → Pay payee or Pay payer | Any payment where delivery or approval should come first | SHOULD |

Scam protection comes from tamper detection on documents plus protected payments held until a condition is met.

### B.4 Why Paiflow is necessary

Without Paiflow, CYFER is only a record and approval log. The SME would still have to move the money by hand and the payer would still have to "pay first and trust". Paiflow provides the parts CYFER cannot provide itself:

- on-chain receipt of the payment and fixed-percentage splitting to envelopes
- recipients fixed at deploy time
- on-chain holding of a deposit, with a deadline-driven fallback to the payer (protected payment)
- token-authorised early release (protected payment)

The core experience (pay, split, hold, release or refund) **is** the Paiflow flow. CYFER supplies approval, evidence and verification around it.

### B.5 Goals and measurable demo outcomes

MVP goals (the brief's "Must have"):

| ID | Outcome | Evidence required |
|---|---|---|
| G-01 | One budget plan (Operations 50%, Payroll 30%, Supplies 20%) recorded, hashed and added to the CYFER ledger | Plan SHA-256; ledger block; audit entry |
| G-02 | Every designated approver approves, and the payment cannot be signed before then | Approval rows referencing the plan hash; a refused signing attempt before full approval |
| G-03 | The authorised wallet signs one Split payment in Freighter on Testnet, using the team's own deployment | Deployment UUID; deposit Stellar tx hash; SUCCESS status for that hash |
| G-04 | Each envelope payout is verified and the dashboard shows Planned, Approved, Pending or Verified distribution | PAYOUT evidence per envelope at the expected share (§H.5); payout tx hashes |
| G-05 | Wallet page | Testnet chip, XLM balance, payment status, history with hashes |
| G-06 | Tamper check | Same file: "matches the recorded hash". Altered file: "no match". Neither result is presented as proof of quality or fraud. |

SHOULD goals:

| ID | Outcome | Evidence required |
|---|---|---|
| G-07 | One protected payment funded from the payer's Freighter wallet, with held status shown before release | Deployment UUID; deposit hash; RECEIVE event with no payout event yet. The held-balance source must be verified (Q-07). |
| G-08 | Payee deliverable recorded, and the payer's approval bound to that version | Deliverable SHA-256; ledger block; approval row referencing `terms_version_id` and `deliverable_version_id` |
| G-09 | Early release with a verified payee payout, and the refund-at-deadline rule shown (explained or recorded) | Release tx hash; PAYOUT evidence to the configured payee (§H); refund hash if recorded (T-10) |
| G-10 | Public receipt page with transaction hashes, and SME-focused landing copy | Receipt allow-list test (REQ-RCPT-01); copy review |

### B.6 Non-goals

- Fiat on-ramp, peso conversion or PHP custody.
- KYC, tax, payroll law, invoicing compliance or a legal dispute process. Real SME use would need all of these.
- Arbitration, multisig dispute resolution or partial releases (Future).
- Automatic per-deal or per-payment deployment provisioning (Future).
- Swap (Paiflow's Soroswap Swap block, so a payer could pay in one asset and the recipient receive another). It adds slippage and a failed swap reverts the payment (Future).
- Holding Bitcoin, Ethereum or any non-Stellar asset.
- Judging whether a spend was a good one.
- Bridging to other blockchains. "Interoperability" means Stellar assets and Stellar wallets only.
- Judging work quality. A payout proves distribution, not good work.
- Mainnet or real funds.
- Government deployment or claims of government adoption.

### B.7 Honest limitations [CONSTRAINT]

1. **Recipients and shares are fixed at deploy time.** Dev mode is off for the event, so a new payee, a new split or a new protected payment needs a new flow. For budgets, a change to envelopes means a new deployment and a fresh approval. The demo covers one budget plan and one protected payment. Per-payment flow creation is Future.
2. **One protected-payment deployment shares one balance and one deadline.** It is one payer-payee relationship, not one escrow per order.
3. **The refund is time-based only.** A payer who never approves is refunded at the deadline, **even if the payee delivered**. CYFER evidence can support a dispute but cannot move money. Multisig arbitration is Future.
4. **Release relies on trusted authority.** Whoever holds the deployment token can trigger an early release to the payee only, and the deploying wallet can also release the before side. CYFER's route checks narrow who can ask, but they do not remove that authority. Every release is logged in the audit trail.
5. **Automation is polled.** After-side release and indexed events can lag by a minute or more.
6. **Testnet only.** Balances have no real-money value; say "simulation" and never claim real-fund handling.
7. **A hash proves byte equality only.** It does not prove quality, authorship or truthful delivery.
8. **A payout is not proof of good spending.** The chain proves distribution, not that the money was well used or the work done.
9. **Courier tracking is not real.** There is no courier API integration. It is mocked and labelled as mocked.
10. **Stellar assets and wallets only.** The wallet cannot hold or bridge other blockchains' coins. A missing USDC trustline makes the whole payment revert.

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
| Budget plan, envelope and plan-approval tables; SME document records | REQ-BUD-*, REQ-DOC-01, §I |
| Deal, terms, deliverable and approval tables (protected payment) | §I |
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
| SME owner | Account + organisation membership `owner` | Organisation, budget plans, SME documents | Create budget plans and envelopes, link a Split deployment, upload documents, sign the budget payment (when their bound wallet is the authorised signer) | Count their own approval as everyone's |
| Designated approver (co-owner or finance) | Organisation membership `approver` | Their approval rows | Approve or reject a specific plan version | Edit plans; sign payments on the owner's behalf |
| Authorised signer | Account + verified wallet = the wallet registered as payer for the plan | Payment attempts | Sign one Split payment in Freighter after the plan is fully approved | Sign before every approver has approved; change envelopes |
| Envelope recipient | A funded Stellar address registered in the plan; an account is optional | Nothing in CYFER | Receive the planned share; be named in the plan and its receipt | Change shares or addresses |
| Payer in a protected payment (client, SME or customer; "buyer" in the graph) | Account + verified wallet = deployment's False-branch recipient | Their deal participation, approvals | Create a deal (as initiator), accept terms, fund the protected payment, approve or reject a deliverable version, request release | Release without a valid approval; change recipients |
| Payee in a protected payment (freelancer, supplier, contractor or SME; "seller" in the graph) | Account + verified wallet = True-branch recipient | Deliverable versions | Accept terms, upload deliverables, view held state | Approve their own deliverable; request release |
| Operator | Server-side role (`operator`) in an allowlist, never self-assigned | Deployment registry, recovery queue | Register and reserve deployments, review uncertain attempts, mark evidence after manual chain review (with justification) | Sign any transaction for a user; create replacement payments; read private deliverable contents unless needed for review |
| Receipt viewer (partner, investor, customer) | None (public) | Nothing | Read deliberately published receipt fields (Should) | Anything else |

### D.2 Object ownership and tenant boundaries

- A **deal** (protected payment) belongs to exactly two participants: the payer (`client_user_id`) and the payee (`seller_user_id`). Only participants and operators can read it.
- **Organisations** isolate budget data. Every budget row carries `organisation_id`, and access requires membership.
- Recipients' public addresses are visible only to deal or organisation members. They are not public unless published on a receipt.
- Server routes use the service role, which **bypasses RLS** (`src/lib/supabase.ts:18`). Every route must therefore run explicit ownership checks. RLS is defence in depth for anon and authenticated clients, not the primary control.

### D.3 Three distinct mechanisms

| Mechanism | What it proves | Where |
|---|---|---|
| **Application approval** (CYFER UCP for budget plans, payer approval for protected payments) | A logged-in CYFER user clicked approve on a specific version. It moves no money. | CYFER database + ledger |
| **Wallet signature** (Freighter) | The holder of a Stellar key authorised **this exact transaction** (a budget payment or a deposit) or signed a binding challenge. | Stellar network / CYFER verifier |
| **On-chain multisig** | Threshold signers approved release through the contract. This is **not used** in the MVP; v1 has no multisig-approval endpoint. | Paiflow contract (Future) |

Release-early (protected payment) requires **no** customer signature. The payer's CYFER approval is the only guard before CYFER's server calls it, which is why REQ-APR-01 and REQ-REL-01 are strict. A Split payment has no release step: the payer's wallet signature plus the all-approver gate (REQ-BUD-02, enforced in the prepare route) are the controls.

---

## E. Functional requirements

Priorities: **MVP** (the brief's "Must have"), **SHOULD** ("Should have"), **STRETCH** ("Nice to have"), **FUTURE**. All requirements are [PROPOSED] design meeting [APPROVED] scope.

Requirement IDs and subsection numbers are kept stable from v2.0.0; the priority tag in each heading is authoritative. The budget-first MVP is E.1, E.2, E.4 (shared payment mechanics), E.5 (REQ-DOC-01, REQ-DLV-02), E.9–E.12. Protected-payment requirements (E.3, E.4 deal parts, E.5 deliverables, E.6–E.8) are SHOULD. E.13 is SHOULD. E.14 and E.15 are STRETCH.

| Tier | Requirements |
|---|---|
| MVP | REQ-ACC-01, REQ-ACC-02, REQ-DEP-01, REQ-ESC-01 and REQ-ESC-02 (payment mechanics shared with Split), REQ-DOC-01, REQ-DLV-02 (file verification), REQ-PAY-01, REQ-REC-01, REQ-WAL-01, REQ-BUD-01, REQ-BUD-02, REQ-BUD-03 |
| SHOULD | REQ-DEAL-01, REQ-DEAL-02, deal-specific parts of REQ-ESC-01/02, REQ-DLV-01, REQ-APR-01, REQ-REL-01, REQ-REF-01, REQ-RCPT-01 |
| STRETCH | REQ-SELL-01, REQ-TPL-01, REQ-MOV-01, USDC deployments |

### E.1 Account access and wallet binding

**REQ-ACC-01 — Authenticated accounts (MVP)**
- *Rationale:* Release decisions need an identified actor.
- *Story:* As an owner, approver, payer or payee, I sign in so CYFER can tie my actions to me.
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
- *Rationale:* One deployment is one relationship (D-04), and recipients are fixed per deployment (D-12). The SDK does not create deployments.
- *Story:* As an operator, I register the manually deployed Split (MVP) or protected-payment flow (SHOULD) and reserve it for one budget plan or one deal.
- *Preconditions:* A confirmed Paiflow deployment exists, created manually by the deployer: `On Receive → Split` with the three envelopes for budget plans, or the D-03 graph for protected payments.
- *Behaviour:*
  - The operator records the deployment UUID, network `testnet`, input asset, template (`budget_split` or `commission_escrow`), graph snapshot hash, and either the Split recipients with their bps (Split) or condition `nodeId`, deadline `at`, payee address and payer address (protected payment).
  - On budget-plan creation, CYFER requires the plan's envelopes to equal the registered recipients and bps exactly (REQ-BUD-01). On deal creation, CYFER requires an exact match (asset, payee wallet, payer wallet, deadline) to an **unreserved** deployment. Either way it then creates a reservation guarded by a partial unique index (one active reservation per deployment).
  - Server checks `capabilities.get()`: `network === 'testnet'`, `triggerType === 'deposit'`, `inputAsset` matches, `operations.execute` is not `unsupported`, and for protected payments `operations.releaseEarly` is not `unsupported`.
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

### E.3 Deal creation and versioned terms (protected payment, SHOULD)

**REQ-DEAL-01 — Create deal with hashed terms (SHOULD)**
- *Story:* As a payer, I create a commission deal (the worked example; supplier deposit and contractor milestone use the same mechanics) whose terms are hashed and recorded.
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

**REQ-DEAL-02 — Terms changes (SHOULD)**
- *Behaviour:* Any edit creates a new version and voids prior acceptances and approvals. Edits are refused once a deposit attempt exists. The deadline, parties and asset cannot change after reservation, because they are fixed in the deployment.
- *Acceptance:*
  - AC1: Editing v1 produces v2 with a new hash and requires both acceptances again.
  - AC2: Editing after funding returns 409.

### E.4 Payment funding (shared mechanics, MVP; protected-payment specifics, SHOULD)

The prepare → sign → submit → confirm mechanics below are **MVP** because the budget payment (REQ-BUD-03) uses them unchanged against the Split deployment. In that case "deal" reads as "budget plan", "client" as the authorised signer, and the preconditions are the plan-specific ones in REQ-BUD-03. The deal-specific preconditions (deal state, terms acceptance, payer/payee roles, deadline margin) and the held-status wording apply to protected payments and are **SHOULD**.

**REQ-ESC-01 — Fund a deployment through prepare → sign → submit (MVP mechanics; deal parts SHOULD)**
- *Story:* As the payer (or the authorised budget signer), I sign the payment in Freighter and see its status. For a protected payment I also see the funds held.
- *Preconditions:* For a protected payment: deal `ready_to_fund`; the caller is the payer; the session wallet binding equals the deployment's payer (buyer) address; deadline ≥ now + safety margin (proposed 10 min, configurable); no non-terminal attempt exists for this deal. For a budget payment: plan `approved` for the current plan hash, the caller's bound wallet is the authorised signer, and no non-terminal attempt exists for this plan.
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

**REQ-ESC-02 — Deposit confirmation (MVP mechanics; held state SHOULD)**
- *Behaviour:* For a budget payment, the plan moves from "Payment pending" toward "Distribution verified" only through REQ-BUD-03 and §H.5. For a protected payment the deal moves to `funded_held` only when:
  - `transactions.get(originalHash)` returns `SUCCESS` with matching hash and network, **and**
  - a RECEIVE event for that hash is found for the reserved deployment with the expected amount (§H.2).

  `SUCCESS` with events still missing gives `funded_unindexed`, displayed as "Deposit confirmed; awaiting indexed evidence".
- *Acceptance:*
  - AC1: Status `PENDING`, `UNKNOWN`, `NOT_FOUND`, timeout or 502 never shows "held".
  - AC2: `FAILED` returns the deal to `ready_to_fund` only after the failure is recorded. A new attempt then requires deliberate user action.

### E.5 Documents, deliverables and hashing

**REQ-DOC-01 — Record a hashed SME document (MVP)**
- *Rationale:* The brief's records are hashed SME documents (contracts, invoices, budget plans, receipts), and the tamper check is a Must-have.
- *Story:* As an owner, I upload an SME document so its SHA-256 is recorded and anyone with access can later check a file against it.
- *Preconditions:* Caller is an organisation member; the document kind is `contract`, `invoice`, `receipt`, `plan_attachment` or `other`.
- *Behaviour:* Same size limit, type allowlist, server-side hashing and **private** bucket as REQ-DLV-01. CYFER creates the `org_documents` row (§I.6), appends a ledger block and an audit entry. A budget plan (REQ-BUD-01) is itself hashed from its canonical JSON and may reference attached documents.
- *Acceptance:*
  - AC1: The same bytes produce the same hash, and the file cannot be fetched without membership or a short-lived signed URL.
  - AC2: A ledger or audit failure leaves no document row.

**REQ-DLV-01 — Submit deliverable (SHOULD, protected payment)**
- *Story:* As the payee (for example a freelancer), I upload my deliverable and CYFER records its hash.
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

**REQ-DLV-02 — Verify a file against a recorded document or deliverable (MVP)**
- *Behaviour:* An organisation member uploads a candidate file against a specific recorded SME document (REQ-DOC-01) or budget-plan version; a deal participant does the same against a specific deliverable version (SHOULD). CYFER hashes it and compares the result with the **selected** record, not every document in the system. This is the demo's tamper check.
- *Display:*
  - Match: "Matches deliverable v{n} recorded {time}. This confirms the bytes are identical. It does not confirm quality, authorship or that delivery was truthful."
  - Non-match: "Does not match deliverable v{n}. The file differs from what was recorded. This alone does not prove tampering."
- *Acceptance:*
  - AC1: A one-byte change yields a non-match.
  - AC2: No result text uses "tampered" as a conclusion.
  - AC3: Verification of another deal's deliverable is refused (403).
  - AC4: Request size and rate are limited (§K.5).

### E.6 Approval bound to a version (protected payment, SHOULD)

**REQ-APR-01 — Payer approves a specific deliverable (SHOULD)**
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

### E.7 Early release (protected payment, SHOULD)

**REQ-REL-01 — Authorised early release (SHOULD)**
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

### E.8 Deadline refund (protected payment, SHOULD)

**REQ-REF-01 — After-side refund tracking (SHOULD)**
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
- *Behaviour:* §H. The result is `verified`, `pending_evidence`, `mismatch` or `operator_review`. Only `verified` unlocks "Distribution verified" (budget plan, §H.5), or "Paid to payee" / "Refunded to payer" (protected payment). A confirmed transaction alone never qualifies.
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
  - payment status per budget plan, and escrow status per deal when protected payments exist (the state, not a balance claim)
  - history: deposits, releases, refunds and budget payouts, each with its Stellar tx hash, explorer link and verification state
  - the wallet's role in each plan or deal (budget owner, payer, payee or envelope recipient)

  The wallet reads public data only and never holds a secret key. It accepts Stellar-network assets only (XLM for the MVP). A USDC balance is shown only if USDC is attempted and a trustline exists.

  **Three separate panels:** wallet balance, funds held in escrow (from verified deal state or Q-07; empty until protected payments exist), and cumulative verified payouts.
- *Acceptance:*
  - AC1: No panel sums across them.
  - AC2: The CYFER audit `tx_hash` is never shown as a Stellar hash.
  - AC3: A balance read failure shows "unavailable", never zero.

### E.12 Budget plans and envelopes (MVP, the primary demo flow)

**REQ-BUD-01 — Budget plan with fixed Split (MVP)**
- *Preconditions:* An organisation exists; a manually deployed `On Receive → Split` deployment on XLM with three percentage recipients: Operations 5000 bps (owner's operating wallet), Payroll 3000 bps (payroll wallet), Supplies 2000 bps (supplier wallet); distinct funded addresses; all recipients in the same mode; total exactly 10,000.
- *Behaviour:*
  - The owner records a plan version (purpose, envelopes with labels, bps, recipient addresses, optional PHP planning figures in integer centavos, total payment in stroops).
  - CYFER checks the envelopes **equal** the deployment's registered recipients and bps. Any mismatch blocks the plan, because recipients cannot change per payment.
  - Hash, ledger block and audit entry are recorded.
- *Acceptance:*
  - AC1: bps ≠ 10,000, duplicate addresses or a mismatch with the deployment are refused.
  - AC2: PHP figures are labelled "planning figure (PHP), not a crypto amount", and no conversion is shown.

**REQ-BUD-02 — Unanimous approval (MVP)**
- *Behaviour:*
  - The approver set is snapshotted at plan submission. Each approver approves or rejects the **plan version hash**.
  - The plan becomes `approved` only when every snapshotted approver has approved that version. One rejection gives `rejected`.
  - Approval updates are conditional (`WHERE status = 'pending'`), and the publish transition is conditional on the current state.
  - An empty approver set is invalid and is never auto-approved.
- *Acceptance:*
  - AC1: Concurrent last approvals publish once.
  - AC2: Approving a superseded version is refused.
  - AC3: The owner cannot be the only approver unless the org explicitly has one member (proposal: require ≥ 1 approver other than the owner).
  - AC4: The Split payment's prepare route returns 403 and calls Paiflow zero times unless the plan is `approved` for its current hash (demo step: show that payment cannot proceed before every approver has approved).

**REQ-BUD-03 — Budget payment and distribution verification (MVP)**
- *Behaviour:*
  - The authorised signer's bound wallet pays through REQ-ESC-01 mechanics against the Split deployment: one payment is signed in Freighter and Paiflow splits it on-chain.
  - CYFER verifies the **original** transaction first, then each recipient's payout, and shows the result next to the plan. A confirmed transaction and a verified payout are separate checks. If the payment times out, CYFER checks the original transaction hash and never sends another payment (D-13).
  - Dashboard states: **Planned → Approved → Pending → Verified distribution** (or `mismatch`), mapped in §F.5.
  - Each recipient's payout is verified (§H.5) at its expected share, with remainder rounding to the last recipient per contract rules.
- *Acceptance:*
  - AC1: A confirmed payment with one recipient unverified shows "Payment confirmed; 2 of 3 payouts verified", never "Distributed".
  - AC2: A changed envelope, recipient or percentage cannot be paid against the existing deployment (new deployment and fresh approval, D-12).

### E.13 Receipt publication (SHOULD)

**REQ-RCPT-01 — Public receipt (SHOULD)**
- *Behaviour:* After a terminal verified outcome, the organisation owner (budget plan) or both parties (protected payment) opt in. The receipt shows only allow-listed fields (§K.8) at an unguessable slug, including plan or terms hashes, deadlines, transaction hashes and payout events, so anyone with the link can check the transactions on a Stellar explorer. Either side can withdraw it. It **excludes** signed envelopes, preparation XDR, private files, emails, internal IDs and credentials.
- *Acceptance:* A response-schema test confirms only allow-listed fields are present.

### E.14 More protected-payment examples (STRETCH)

**REQ-TPL-01 — Supplier deposit and contractor milestone templates (STRETCH)**
- *Behaviour:* The same escrow mechanics (REQ-DEAL, REQ-ESC, REQ-DLV-01, REQ-APR-01, REQ-REL-01) on a **separate** reserved deployment per relationship, with preset wording and evidence:

| Template | Payer → payee | Released when | Evidence in CYFER |
|---|---|---|---|
| Supplier deposit | SME → supplier | The SME confirms the goods arrived | Purchase order and delivery receipt hashes |
| Contractor milestone | SME → contractor | The approvers sign off the work | Deliverable hash and approval log |
| Commissioning a freelancer (the SHOULD-tier worked example) | SME or client → freelancer | The client approves the delivered work | Brief and deliverable hashes |

- *Acceptance:* Each template uses its own deployment, because one deployment is one relationship (D-04).

**REQ-SELL-01 — Online-selling template with mocked courier (STRETCH)**
- *Behaviour:*
  - Same escrow mechanics on a **separate** reserved deployment, with customer (payer) and SME (payee) roles.
  - Listing and order terms are hashed.
  - Courier status comes from a local mock that the operator advances. Every screen showing it carries the visible label **"MOCK courier status — not a real courier integration"**.
  - Release still requires the buyer's explicit confirmation (the mock alone never triggers release).
- *Acceptance:*
  - AC1: The mock label is present on every courier element.
  - AC2: The mock "delivered" state without buyer confirmation cannot call release.

### E.15 Moving funds with Pay (STRETCH)

**REQ-MOV-01 — Pay a fixed payee, or return unused funds (STRETCH)**
- *Behaviour:* The same authorised wallet can pay a supplier, send a budget share to a department wallet, or return unused funds. Each movement is one Paiflow `On Receive → Pay` payment to a fixed recipient (or a Split), is approved first, and appears in the audit trail. Because recipients are fixed when a flow is deployed, a new payee means a new flow (D-12).
- *Acceptance:* A movement to an address that is not the registered recipient of the deployment is refused before any prepare call.

---

## F. State models

The budget-plan states (F.5) are the MVP business state. F.1 (protected-payment deals) is SHOULD. F.2 (payment attempt) and F.3 (payout verification) are MVP and shared by both.

### F.1 Deal / business state (protected payment, SHOULD)

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

### F.5 Budget-plan state (MVP)

States: `draft → pending_approval → approved → payment_pending → payment_confirmed → distribution_verified`. Side states: `rejected`, `superseded` (a newer plan version exists), `mismatch`, `operator_review`.

| Dashboard state | Plan state(s) | Entered when | Wording |
|---|---|---|---|
| **Planned** | `draft`, `pending_approval` | Plan recorded: canonical JSON hashed, ledger block and audit entry written, approver set snapshotted | "Planned: waiting for approvals (n of m)" |
| **Approved** | `approved` | Every snapshotted approver approved this plan hash (REQ-BUD-02) | "Approved: ready for the authorised signer" |
| **Pending** | `payment_pending`, `payment_confirmed` | A payment attempt exists (F.2). `payment_confirmed` means the original transaction is `SUCCESS` but payouts are not all verified | "Payment pending" or "Payment confirmed; k of 3 payouts verified" |
| **Verified distribution** | `distribution_verified` | Every envelope payout passed §H.5 | "Distribution verified" |

Guards: payment is refused unless the plan is `approved` for its current hash; a rejection gives `rejected`; editing creates a new version and voids prior approvals (`superseded`). Evidence that contradicts the plan gives `mismatch`, which is never shown as distributed.

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

For a budget payment "client" below means the authorised signer's bound wallet, and "terms amount" means the plan's total.

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

### H.5 Split distribution (MVP)

H.1 and H.2 (finality, original hash, deployment, network, RECEIVE event for the payment) apply first. H.3 describes the protected-payment payout and refund; for a Split, this section replaces it.

Expected share per recipient = `amount × bps / 10000` (bigint floor), with the remainder going to the last recipient, per Split rules in `llms.md`. Each recipient is verified independently:

1. A PAYOUT event for the original deposit to the registered envelope address.
2. The amount equals that envelope's expected share exactly (stroop string compare). A shortfall or surplus is a mismatch, recorded with both values.
3. Pagination and delayed indexing follow H.3 items 12–13.
4. The plan shows "Distribution verified" only when **all** envelopes pass. Otherwise it shows "Payment confirmed; k of n payouts verified" or "Evidence mismatch — under review".

| Fact | Proven by | UI wording |
|---|---|---|
| Payment confirmed | H.1 + H.2 | "Payment confirmed" |
| Envelope paid | H.1 + H.5 for that envelope | "Operations paid — verified" |
| Distribution verified | H.5 for every envelope | "Distribution verified" |

Payout proves distribution, not that the money was well spent.

---

## I. Data and integration design [PROPOSED]

All schema here is **proposed**. Nothing has been migrated. Tiers: organisations, wallets, deployments, payment attempts, `payout_verifications`, `event_cursors`, audit changes, ledger fix, budget plans (I.8) and `org_documents` (I.6) are **MVP**. Deals, terms, deliverables, approvals and release attempts (I.3, I.6, I.7) are **SHOULD**. Public receipts (I.12) are **SHOULD**. The Postgres guidance applied follows Supabase docs:

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

- `deals(id, template text check in ('commission_escrow','supplier_deposit','contractor_milestone','online_selling'), client_user_id, seller_user_id, deployment_id fk, state text, current_terms_version_id, current_deliverable_version_id, created_at, updated_at)`.
- `deal_terms_versions(id, deal_id, version int, canonical_json jsonb, terms_sha256 char(64), amount_stroops text check (amount_stroops ~ '^[1-9][0-9]{0,38}$'), asset jsonb, deadline_at timestamptz, created_by, created_at, unique(deal_id, version))`.
- `terms_acceptances(terms_version_id, user_id, accepted_at, primary key(...))`.

### I.4 Deployment registry and reservations

- `paiflow_deployments(id uuid pk = Paiflow deployment UUID, network, template (`budget_split`, `commission_escrow`, …), input_asset jsonb, condition_node_id text, deadline_at, seller_address, buyer_address, split_recipients jsonb null, graph_snapshot_sha256, status check in ('available','reserved','retired','unusable'), registered_by, registered_at)`.
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

`deliverable_versions(id, deal_id, version, sha256 char(64), size_bytes bigint, media_type, storage_key, original_filename, uploaded_by, created_at, unique(deal_id, version))` (SHOULD). The storage bucket `deliverables` is **private**.

`org_documents(id, org_id, kind text check in ('contract','invoice','receipt','plan_attachment','other'), sha256 char(64), size_bytes bigint, media_type, storage_key, original_filename, uploaded_by, created_at)` (MVP, REQ-DOC-01), in the same private bucket family. Writes are server-only.

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

### I.12 Public receipts (SHOULD)

`public_receipts(slug text unique (≥128-bit random), deal_id or budget_plan_id, published_fields jsonb, published_by_client_at, published_by_seller_at (or published_by_owner_at for a budget plan), withdrawn_at)`.

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
| POST `/api/orgs/:id/budget-plans` | Owner | Record plan version (hash, ledger block, approver snapshot) | 422 mismatch with deployment, bps ≠ 10,000 |
| POST `/api/orgs/:id/budget-plans/:planId/approve` / `reject` | Designated approver | Plan-hash-bound decision | 409 stale, 403 |
| POST `/api/orgs/:id/budget-plans/:planId/pay/prepare` / `submit` / `check` | Authorised signer | Prepare, persist, submit and check the Split payment (REQ-ESC-01 mechanics) | 403 not fully approved, 403 wallet mismatch, 409 open attempt |
| GET `/api/orgs/:id/budget-plans/:planId` | Org member | Plan, approvals, four-state dashboard, per-envelope verification (no XDR) | 403 |
| POST `/api/orgs/:id/documents` (multipart) | Org member | Record and hash an SME document | 413, 415 |
| POST `/api/orgs/:id/verify-file` (multipart) | Org member | Compare a file with a recorded document or plan version (tamper check) | 413, 403 |
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
| Sign-in / Wallet binding (MVP) | Account + wallet proof | Any user; sign challenge | Bound address, network | Signed in | loading, not installed, wrong network, signature rejected, bound | `login/page.tsx`, `Input`, `Button` |
| Wallet (MVP) | Balances and history | Bound user | Spendable XLM, payment status per plan, held-in-escrow per deal (when protected payments exist), cumulative verified payouts (separate), history with Stellar hashes | Own data only | loading, unavailable, empty history, pending items, verified | `Card`, `Table`, `Badge` |
| Budget plan (MVP) | Plan, approvals, signing, distribution | Owner, approvers, signer | Envelopes with bps and addresses, PHP planning figures labelled separately, approval progress "2 of 3", Freighter signing step, four-state dashboard with per-envelope payout hashes | Org members | Planned, Approved, Pending, Verified distribution, mismatch | `BudgetChart`, `BudgetTable`, `ApprovalStatus` |
| Documents and Verify file (MVP) | Record SME documents; byte comparison (tamper check) | Org members | Document kind, SHA-256, selected record, result text per REQ-DLV-02 | Org members | match, no match, too large | `UploadForm`, `/verify`, `VerificationResult` |
| Operator console (MVP) | Registry and reviews | Operator | Deployments, reservations, review queue (no XDR shown) | Operator only | — | `Table` |
| New deal (SHOULD) | Create terms for a protected payment | Payer | Template, parties, amount (XLM entered as decimal and converted to stroops via bigint), deadline (read-only from the deployment), terms hash after save | Payer with bound wallet | validation errors, no matching deployment, saved | `Input`, `Modal` |
| Deal detail (SHOULD) | Single source of truth | Participants | Timeline, terms hash, deposit hash, held state, deliverable versions, approval, release/refund evidence, nonresponse warning | Participants, operator | each F.1 state with plain-language text; uncertain shows "Do not pay again" | `AuditTimeline`, `Badge` |
| Fund protected payment (modal, SHOULD) | Consent and sign | Payer | TESTNET, amount, asset, payee and payer recipients, fee, expiry countdown | Bound wallet = payer | preparing, awaiting signature, wallet changed, expired, submitted, pending, confirmed, failed | starter `starter-app.tsx` pattern |
| Deliver (SHOULD) | Upload file | Payee | Size/type limits, resulting hash | Payee | uploading, too large, wrong type, recorded | `UploadForm` |
| Review & approve (SHOULD) | Version-bound approval | Payer | Deliverable vN hash, download (signed URL), verify-file tool, approve or reject | Payer | stale version, approved, rejected | `ApprovalCard` |
| Public receipt (SHOULD) | Shareable proof with transaction hashes | Anyone | Allow-listed fields only | Public | not found, withdrawn | `Card` |
| Landing (SHOULD) | SME-focused copy | Visitors | SME positioning; government as future direction only | Public | — | `(public)/page.tsx` |
| Online-selling (STRETCH) | Mock courier + protected payment | Customer, SME | Order hash, **MOCK** courier status | Participants | as deal + mock states | Deal detail |

---

## K. Security and privacy

1. **Server-only Paiflow credentials.**
   - `PAIFLOW_BASE_URL`, `PAIFLOW_DEPLOYMENT_ID` (or the registry) and `PAIFLOW_API_TOKEN` live in server env only.
   - Never use the `NEXT_PUBLIC_` prefix. The SDK is imported only from a `server-only` module.
   - Never return or log the token. A build-time bundle check (starter `scripts/check-browser-bundle.mjs` pattern) confirms no token-shaped string reaches the client.
2. **Wallet-only signing.** CYFER never receives secret keys or seed phrases. The server never signs user transactions.
3. **Authenticated ownership checks.** Every route checks session, participant or role, wallet binding and deal state server-side. The client-side admin guard (`src/app/(admin)/admin/layout.tsx:12-18`) is a convenience, not a control.
4. **Budget-payment gate and release authority.** The Split payment's prepare route is the MVP gate: it refuses unless the plan is `approved` for its current hash and the caller's session wallet is the authorised signer, and it never calls Paiflow otherwise. The release route (protected payments, SHOULD) is the most privileged operation. It requires a valid version-bound approval, a lock, a single attempt and an audit entry. The deployer wallet and any token holder can still release, so the token is held by one named owner (Q-01), rotated after the event, and its exposure is treated as an incident.
5. **Replay, duplicate and rate limits.**
   - Single-use challenge nonces.
   - Unique constraints for attempts, releases and approvals.
   - Same-origin checks.
   - Per-user and global rate limits for prepare, submit, check, release, upload and verify.
   - Body-size limits enforced while streaming (starter `lib/http.ts` pattern).
   - Note: in-memory limits are per-process.
6. **Private documents and deliverables** (SME documents, plan attachments and deliverables).
   - Private bucket, server-generated keys, signed URLs ≤ 5 min.
   - Type allowlist; size ≤ 10 MB (proposed).
   - Content served with `Content-Disposition: attachment`.
   - The inherited `documents` bucket uses public URLs (`src/app/api/documents/route.ts:149-151`) and must not be used for deliverables.
7. **RLS and tenant isolation.**
   - New tables are scoped by participant or org membership.
   - The inherited policies that allow any authenticated user to write `budget_data` (`supabase/policies/001_rls_policies.sql:123-125`) or read all users and approvals (`:18-20`, `:81-83`) are **gaps** and must not cover SME data.
8. **Public data.**
   - Receipts may show: deal or plan title (opt-in), template, terms hash or plan hash, envelope labels and shares, deliverable hash, deadline, deposit / payout / release / refund Stellar hashes, verification states, timestamps.
   - Receipts never show: emails, credentials, signed or prepared XDR, private files, internal user IDs, request IDs.
9. **Honest integrity claims.**
   - The CYFER ledger is an application hash chain in a database the team controls; operators with database access could rewrite it.
   - Do not call it "immutable" or "anchored on Stellar".
   - Existing audit hashes cannot be recomputed, because the `Date.now()` input is not stored (`src/lib/audit.ts:34`); fix per §I.10.
10. **Safe diagnostic logging.** Log codes, request IDs, deal IDs and hashes only. Never log tokens, signed envelopes, recovery records, file contents or full addresses with emails.
11. **Recovery-record access.** Prepared and signed XDR are readable only by server routes acting for the deal's payer, the plan's authorised signer or an operator, and are never sent back to the browser after signing.
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
| Server-only Paiflow module, Freighter signing, own Split deployment (three envelopes, XLM) | ✔ | | | |
| Wallet binding, wallet page (XLM balance, payment status) | ✔ | | | |
| Budget plan recorded, hashed and added to the CYFER chain | ✔ | | | |
| Unanimous approval by every designated approver before the payment can be signed | ✔ | | | |
| Verification of the original transaction, then each envelope payout, with Planned / Approved / Pending / Verified distribution | ✔ | | | |
| Payment recovery from server-side evidence | ✔ | | | |
| SME document record and tamper check (file against recorded hash) | ✔ | | | |
| Protected payment (commission example): `time_before`, Pay payee / Pay payer, hashed terms and deliverable, version-bound approval, release route that checks approval, refund tracking | | ✔ | | |
| Public receipt page with transaction hashes | | ✔ | | |
| SME-focused landing page copy | | ✔ | | |
| USDC deployment with trustlines and a currency picker | | | ✔ | |
| More protected-payment examples (supplier deposit, contractor milestone, online order with mocked courier) | | | ✔ | |
| Moving funds with Pay (fixed payee, return unused funds) | | | ✔ | |
| Government adaptation | | | | ✔ |
| Automated per-deal or per-payment deployment provisioning | | | | ✔ |
| Arbitration / multisig | | | | ✔ |
| Swap (XLM/USDC through Soroswap), broader integrations | | | | ✔ |

**MVP acceptance boundary:** the MVP is complete when every check on an MVP-tier requirement in §M has passed, plus one manual testnet rehearsal (T-01 to T-07) with recorded hashes. SHOULD and STRETCH items never block MVP acceptance. Never promote an optional item into the MVP.

### L.2 Implementation slices (in dependency order)

| Slice | Content | Depends on |
|---|---|---|
| S0 | Spikes Q-06, Q-07, Q-08, Q-11 against the SDK/API README; record findings in this PRD | — |
| S1 | Read-only live schema inventory; new migration for organisations, profiles, wallets, deployments, budget plans and envelopes, plan approvals, SME documents, attempts, verifications, cursors (MVP); deals, terms, deliverables, approvals, releases, receipts (add when S9–S11 start); RLS | Q-10 |
| S2 | Manual Split deployment (§L.3 step 2); operator registry route; capability check | Q-01, Q-02, Q-09 |
| S3 | Server-only Paiflow module (port the starter `lib/paiflow.ts`); env validation; bundle check | S2 |
| S4 | Wallet challenge/bind; wallet page (balance read, payment status) | S1 |
| S5 | Budget plan: canonical JSON, hash, ledger block, audit, envelope-to-deployment match; SME document record + verify-file (tamper check) | S1, S2 |
| S6 | UCP rewrite: approver snapshot, plan-hash-bound approvals, conditional transitions | S5 |
| S7 | Split payment: prepare (approval gate), sign, persist, submit, check, recover | S3, S4, S6 |
| S8 | Payout verifier (§H.5) + event cursor polling + four-state dashboard + wallet history | S7 |
| S9 (SHOULD) | Protected-payment deployment (§L.3 step 3); deal, terms, acceptance; fund | S3, S4, S8 |
| S10 (SHOULD) | Deliverable upload (private) + version-bound approval + release route + release recovery + refund tracking | S9 |
| S11 (SHOULD) | Public receipt page; SME landing copy | S8 |
| S12 (STRETCH) | USDC deployment and currency picker; supplier-deposit, contractor-milestone and online-selling templates with labelled mock | S10 |

### L.3 Manual deployment prerequisites

1. The deployer signs in to Paiflow (event access code is held by the team, never in the app).
2. **MVP:** build **On Receive (native XLM) → Split** with three percentage recipients in the same mode and no duplicate addresses: Operations 5000 bps, Payroll 3000 bps, Supplies 2000 bps, total exactly 10,000, to three distinct funded addresses. Dev mode off.
3. **SHOULD:** build a separate **On Receive (native XLM) → Condition `time_before` at {deadline, with timezone}**:
   - True → **Pay**, `fullAmount: true`, recipient = payee (seller) G-address.
   - False → **Pay**, `fullAmount: true`, recipient = payer (buyer) G-address, using an explicit Pay so the refund goes to the payer and not the deploying wallet.
   - Both handles connected. No Hold. No Return to owner. Dev mode off.
4. Review the English preview of each flow; deploy from the funded deployer wallet; wait for `CONFIRMED`.
5. Record each deployment UUID (and the condition node ID for the protected payment).
6. Create a **Read and operate** developer token (`pfd_`) explicitly selecting these deployments, or a `pfk_` token. Store it only in the server `.env.local`.
7. For STRETCH USDC: a separate deployment per asset; every payer and recipient adds the exact trustline (code `USDC`, issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`) and obtains a balance.

### L.4 Wallet and recipient prerequisites

- Owner/signer, the three envelope recipients and the deployer are distinct Freighter testnet accounts, Friendbot-funded. The signer keeps XLM for the payment plus fees and reserves. For the protected payment, payer, payee and deployer are likewise distinct.
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

The Tier column decides what gates the MVP (§L.1): only MVP rows must pass for acceptance.

| Req | Tier | Acceptance checks | Level | Evidence required |
|---|---|---|---|---|
| REQ-ACC-01 | MVP | 401 without session; 403 non-member / non-participant | Mocked | Test output |
| REQ-ACC-02 | MVP | Replay rejected; wrong signer rejected; unique address | Mocked + manual | Test output; binding row |
| REQ-DEP-01 | MVP | Concurrent reservation → one wins; envelopes ≠ registered recipients refused; past deadline refused (protected payment) | Mocked | Test output |
| REQ-ESC-01 | MVP (mechanics) | Prep persisted before sign; envelope persisted before submit; altered body rejected; duplicate click returns same attempt; token absent from bundle | Mocked + bundle check | Test output; bundle scan |
| REQ-ESC-02 | MVP (mechanics) | PENDING/UNKNOWN/502 never "confirmed" or "held" | Mocked | Test output |
| REQ-DOC-01 | MVP | Private fetch denied; same bytes → same hash; ledger failure leaves no row | Mocked + manual | Test output |
| REQ-DLV-02 | MVP | 1-byte change → no match; no "tampered" verdict | Mocked + human copy review | Test output; screenshot |
| REQ-PAY-01 | MVP | Each §H check (including H.5) passes and fails with fixtures | Mocked | Test output |
| REQ-REC-01 | MVP | Reload preserves attempt; resubmit identical bytes; NOT_FOUND blocks new prepare | Mocked + manual | Test output |
| REQ-WAL-01 | MVP | Separate panels; audit hash ≠ Stellar hash label; unavailable ≠ 0 | Mocked + human | Screenshot |
| REQ-BUD-01..03 | MVP | bps=10000; mismatch refused; concurrent last approval publishes once; payment 403 before full approval and SDK not called; partial distribution wording ("2 of 3") | Mocked + manual | Test output; hashes |
| REQ-DEAL-01/02 | SHOULD | Deterministic hash; acceptance gating; edit after funding 409 | Mocked | Test output |
| REQ-DLV-01 | SHOULD | Private fetch denied; versioning | Mocked + manual | Test output |
| REQ-APR-01 | SHOULD | Stale version 409; payee cannot approve; concurrent decisions → one | Mocked | Test output |
| REQ-REL-01 | SHOULD | No approval → 403 and SDK not called; concurrent → one call; uncertain → no re-call | Mocked | Test output with SDK call count |
| REQ-REF-01 | SHOULD | No release-early at/after deadline; "Refunded" only after verification | Mocked + manual (T-10) | Test output; refund hash |
| REQ-RCPT-01 | SHOULD | Allow-listed fields only | Mocked | Schema test |
| REQ-TPL-01, REQ-SELL-01 | STRETCH | Own deployment per template; mock label everywhere; mock cannot release | Mocked + human | Screenshot |
| REQ-MOV-01 | STRETCH | Non-registered recipient refused before prepare | Mocked | Test output |

### M.3 Manual testnet rehearsal (authorised, small amounts, own deployment)

T-01 to T-07 are the MVP rehearsal. T-08 to T-11 cover the SHOULD-tier protected payment.

| ID | Scenario | Expected | Record |
|---|---|---|---|
| T-01 | Bind owner/signer and approver wallets | Bindings verified | Addresses (public) |
| T-02 | Record a budget plan (50/30/20) | Plan hash and ledger block recorded; envelopes match the deployment | Plan hash |
| T-03 | Attempt payment before full approval, then approve with every approver | First attempt 403 with no Paiflow call; plan `approved` only after the last approval | Approval rows; log |
| T-04 | Sign the Split payment of 1 XLM in Freighter | SUCCESS for the original hash; RECEIVE matched; "Pending" until payouts verified | Deposit hash |
| T-05 | Verify each envelope payout | Three PAYOUT events at the expected shares; "Distribution verified" | Payout hashes, explorer links |
| T-06 | Verify same / altered document | Match / no match (no "tampered") | Screenshots |
| T-07 | Reload mid-funding (separate plan / deployment) | Same attempt shown; no new prepare | Attempt ID |
| T-08 | Create protected-payment deal; payee accepts; payer funds 1 XLM | SUCCESS; RECEIVE matched; "Held" | Deposit hash |
| T-09 | Payee uploads file; payer approves v1; release | Release hash; PAYOUT to payee verified | Release hash, explorer link |
| T-10 | Refund path on a **separate** short-deadline deployment, no approval | Refund verified some minutes after deadline | Refund hash |
| T-11 | Unauthorised release attempt (payee session) | 403; no Paiflow call | Log |

No live financial test runs without the team's explicit authorisation. Use no load testing or API spam.

---

## N. Demo and open decisions

### N.1 Format (25 Oct 2026, pitching from 4:00 PM PHT)

Three minutes for pitch and demo, then two minutes of Q&A. Order per the primer: **Problem → Solution → Stellar impact → Paiflow integration → Demo**.

| Segment | ≈ Time | Content |
|---|---|---|
| Problem | 0:20 | SME budgets and payments run on chat and spreadsheets, with no proof of who approved or what was paid. No statistics unless sourced. |
| Solution | 0:25 | "Paiflow moves the money. CYFER proves what was approved and what was paid." Hashed plan → every approver approves → Freighter-signed payment → Paiflow splits it → verified envelope payouts. |
| Stellar impact | 0:20 | **Demonstrated:** testnet payments, on-chain splitting and holding, verified payouts with hashes. **Potential (not demonstrated):** real SME adoption, stable-asset invoicing. |
| Paiflow integration | 0:25 | Show the Split graph (three envelopes) and the protected-payment graph (On Receive → time_before → Pay payee / Pay payer). Explain that recipients are fixed per deployment and one deployment is one relationship. |
| Demo | 1:30 | Brief §9's seven steps, shown in the order of N.2 |

Demo script (budget flow first, protected payment as the add-on):

1. Problem: budgets and payments run on chat and spreadsheets.
2. The owner records a budget plan; CYFER hashes it and adds it to the chain.
3. Every approver approves; show that payment cannot proceed before then.
4. The authorised signer connects the wallet and signs the payment in Freighter; Paiflow splits it.
5. CYFER verifies the transaction and each envelope payout, with transaction hashes.
6. Protected payment (SHOULD): fund a held payment, then show the release and the refund rule.
7. Tamper check: alter a document and show the mismatch.

### N.2 Demo honesty labels

| Step | Label |
|---|---|
| Record budget plan, hash and chain block | **Live** (application) |
| Approvals, with payment refused before full approval | **Live** (application) |
| Connect wallet, sign the Split payment in Freighter, verify envelope payouts | **Live** only if T-01 to T-05 passed today; otherwise **Recorded** and said so |
| Protected payment: fund and show held | **Live** only if T-08 passed; otherwise **Recorded** |
| Approve → release → payee payout with hash | **Live** if T-09 passed; otherwise **Recorded** |
| Refund path | **Explained** with the graph, or **Recorded** from T-10. Never promised to complete during the 3-minute pitch. |
| Tamper check | **Live** (application): "no match", not "fraud proven" |
| Online selling, supplier deposit, contractor milestone | **Live** only if STRETCH slices passed; courier is always **Mocked** (a stub, said so on stage) |
| USDC | Not shown unless a USDC deployment passed with every trustline and balance checked; otherwise "future" |
| Government use | **Future direction**, not demonstrated adoption |

### N.3 Required statements

- "If the payer never approves, the deadline refunds the payer even if the payee delivered. CYFER's evidence helps a dispute but cannot move money. Arbitration is future work." (Q-04)
- "Our server can release early only to the fixed payee, and only after the payer's recorded approval. Whoever holds the deployment token or the deploying wallet is trusted; we log every release."
- "Recipients and shares are fixed when a flow is deployed. A new payee or a changed envelope means a new flow and a fresh approval."
- "Testnet only: this is a simulation with no real money."
- "The hash proves the file is byte-identical, not that the work is good, and a verified payout proves distribution, not that the money was well spent."
- "Interoperability here means Stellar assets and Stellar wallets. We do not bridge to other blockchains."
- If an online-order example is shown: "The courier status is a stub."

### N.4 Open decisions

See §A.8 (Q-01 to Q-12). Q-01, Q-02 and Q-09 block the live demo; Q-06, Q-08, Q-10 and Q-11 block implementation of their slices. Q-12 (budget flow as the live demo) is resolved in D-01.

---

## O. Interoperability: XLM, USDC and beyond

Each Paiflow flow is deployed for **one input asset**. Supporting both XLM and USDC means two deployments behind one CYFER interface, not one flow that accepts either.

| | XLM (native) | USDC |
|---|---|---|
| Trustline needed | No | Yes, on every recipient and payer wallet, for the exact issuer |
| Extra setup | Fund with Friendbot | Add trustline, then fund from Circle's testnet faucet |
| Starter support | Yes (fixed 1 XLM example) | Needs our own integration |
| Best for | Demo reliability | SME pricing stability (a stable unit for invoices) |

How it is presented: the user picks a currency when creating a plan or payment, and CYFER routes it to the matching deployment and shows amounts in that asset. All amounts are integer stroop strings handled with `bigint`, never floats (1 token = 10,000,000 stroops).

Plan for today: build XLM end to end first. Add USDC as a second deployment only if time allows, and check every wallet's trustline and balance before demoing, because a missing trustline reverts the whole payment. A Swap block (Soroswap) is Future work: it adds slippage, and a failed swap reverts the payment.

| What is interoperable | Status |
|---|---|
| Assets: XLM and USDC; other Stellar assets can be set by code and issuer in a flow | XLM demo, USDC if time allows, others future |
| Wallets: any Stellar wallet that signs with the network passphrase CYFER returns; Freighter is the tested one | Freighter live (once S4 and S7 pass) |
| Payment entry points: CYFER's checkout, plus Paiflow's hosted payment page and QR, so a payer needs no CYFER account | Hosted page available (Paiflow-provided) |
| Verification: any transaction hash can be checked on a Stellar explorer; CYFER's verify page checks hashes | Planned (REQ-PAY-01, REQ-DLV-02) |
| Integrations: Paiflow SDK and HTTP API let other systems create payments and read events | Via SDK |

"Live" and "available" in this table are intended demo states. Nothing is live until §M evidence exists (C-04). Interoperability does not mean bridging to other blockchains, and the PRD never claims it.

## P. Scale-up to government (future direction)

CYFER for SMEs is the original CYFER without the government audience. Because the engine is general, returning to public use is mostly configuration plus legal requirements.

| In the SME version | In a government version |
|---|---|
| Hashed contracts, invoices and budget plans | Hashed ordinances, contracts and certificates |
| Designated approvers (owners, finance) | Every official must approve (Unanimous Consensus Protocol) |
| Budget envelopes through Split | Sector allocations (Health, Education, Infrastructure) |
| Protected payment | Milestone payments to contractors, held until inspection is approved |
| Receipt page and audit trail | Citizen-facing transparency dashboard and audit trail |

Real government use would need lawful appropriations, certifications, procurement rules and supporting documents beyond this app. This is presented as a direction, not a claim, and is not demonstrated adoption.

---

*Process note: this PRD was drafted with AI assistance (Claude Code) from the team brief and the listed sources, and requires team review before implementation planning.*
