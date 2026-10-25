# FRANCIS — Phase Tasks (Developer 1: application and database foundation)

> **Canonical coordination document.** This file holds the shared contracts, the ownership matrix, the handoff and blocker registers, and gates G1, G2 and G7. [CARLOS-PHASETASK.md](CARLOS-PHASETASK.md) and [SHANTI-PHASETASK.md](SHANTI-PHASETASK.md) link here and do not redefine anything in it.

| Field | Value |
|---|---|
| Owner | Francis (Developer 1) |
| Source of truth | [docs/PRD.MD](PRD.MD) **v2.1.0**. Its technical design is **[PROPOSED]**, and none of it is implemented. |
| Scope tiers (PRD §L.1, D-01) | **MVP:** one budget plan, hashed and approved by every designated approver, paid as one Freighter-signed `On Receive → Split` (Operations 50% / Payroll 30% / Supplies 20%), with per-envelope payout verification, the wallet page, SME document records and the tamper check. **SHOULD:** protected payment (commission escrow), public receipt, SME landing copy. **STRETCH:** USDC, more protected-payment templates, online selling (mocked courier), Pay (REQ-MOV-01). **FUTURE:** government use, per-payment deployment provisioning, arbitration, swaps. |
| Plan updated | 2026-10-25, about 12:10 PHT, after pulling `2835c6a` (PRD v2.1.0) |
| Event | Paiflow × Web3 Iloilo, 25 Oct 2026. Building runs until 4:00 PM PHT, then pitching (event primer p2). Stellar Testnet only. |
| Status | Planning only. Every task starts unchecked, and no code, schema or deployment exists yet. |

---

## 0. How to use these three documents

- **Checkboxes.** `- [ ]` means pending. Tick it only after you record evidence in that document's evidence log (§11 here). A rendering screen, an HTTP 200 or a merged PR is **not** evidence that a financial behaviour works.
- **IDs.** The ID prefixes are:
  - `F-xx` Francis, `C-xx` Carlos, `S-xx` Shanti tasks
  - `HO-xx` handoffs, `B-xx` blockers/investigations, `CL-xx` contract clarifications, `CR-xx` change requests, `G1`–`G8` gates
  - PRD IDs (`REQ-…`, `Q-…`, `INV-…`, `T-…`, `D-…`) refer to [PRD.MD](PRD.MD) v2.1.0
- **Each person edits only their own document.** Ask the owner to change anything in another person's document.
- **Tier tags.** Every task is tagged **[MVP]**, **[SHOULD]** or **[STRETCH]**. SHOULD and STRETCH work starts only after the MVP gate it depends on, and **never blocks** an MVP gate (PRD §L.1).
- **Verification levels stay separate** (PRD §M.1): *Mocked* (fixtures/mocked SDK), *Manual Testnet* (real Freighter and real deployment, with recorded hashes), *Human review*. Never record mocked evidence as Testnet evidence.
- **⚠ AUTH** marks steps that need **explicit team authorisation in chat before they run** (Claude.md): shared-database mutations (migrations, seeds, accounts, flags, buckets), Testnet transactions, and dependency installs that change the lockfile. Record who authorised it and when.
- **Forbidden for everyone:** `git reset --hard`, silent `git stash`, force-pushing shared branches, overwriting or reformatting another owner's files, committing `.env.local`, and pasting tokens, secret keys or seed phrases anywhere.

### 0.1 Team roles

| Person | Role | Document |
|---|---|---|
| Francis | Developer 1: contracts, schema, RLS, RPCs, auth, organisations, wallet binding (server), budget plans and unanimous approval, SME documents and tamper check, audit/ledger; SHOULD deals, terms, deliverables, approvals | this file |
| Carlos | Developer 2: Paiflow SDK adapter, Split payment (prepare/sign/submit/check/recover), event ingestion, per-envelope payout verification, reconciliation, wallet summary, Freighter browser module, headless controllers, `package.json` / lockfile, test tooling; SHOULD release, refund | [CARLOS-PHASETASK.md](CARLOS-PHASETASK.md) |
| Shanti | UI developer: pages, components, styles, accessibility, demo presentation; **Paiflow website operator** (builds and deploys the Split flows, then the SHOULD protected-payment flows) | [SHANTI-PHASETASK.md](SHANTI-PHASETASK.md) |

### 0.2 Recommended time-box for today (PHT, 25 Oct 2026)

This is a recommendation. Building ends at 4:00 PM (primer p2). The plan is deliberately tight. If an MVP gate has not passed by its cut-off, the pitch uses PRD §N.2 labels (**Recorded** or **Explained**) and **no acceptance criterion is weakened**. SHOULD work starts only once G5 has passed.

| Time | Francis | Carlos | Shanti |
|---|---|---|---|
| 12:10–12:40 | F-01 contracts in code; F-02 schema inventory | C-01 toolchain; C-02 spikes | S-01 accounts and wallets; S-02 Split deployment R1 |
| **12:40–12:55** | **Checkpoint CP-1 → [G1](#g1)** (all three) | | |
| 12:55–14:00 | F-05…F-11 migrations and RPCs (write, do not apply) | C-03…C-05 adapter, helpers, mock controllers | S-03 R2 and D1 Split deployments; S-04 token handoff; S-10…S-13 UI on fixtures |
| **14:00–14:10** | **CP-2 → [G2](#g2)** | | |
| 14:10–15:00 | F-12…F-17 routes | C-06…C-16 routes, verifier, real controllers | S-14…S-19 screens; switch to real controllers |
| **15:00** | **CP-3 → [G3](CARLOS-PHASETASK.md#g3) and [G4](SHANTI-PHASETASK.md#g4)** | | |
| 15:00–15:35 | F-21 negative paths; supports rehearsal | C-18 MVP rehearsal T-01…T-07 → [G5](CARLOS-PHASETASK.md#g5) | Runs the UI during rehearsal; captures screenshots |
| 15:35–15:55 | [G7](#g7) sign-off | Supports G7 | S-24 → [G8](SHANTI-PHASETASK.md#g8) demo rehearsal |
| 16:00 | Pitching block starts | | |
| Only if G5 passed early | F-30…F-34 (SHOULD) | C-30…C-35 → [G6](CARLOS-PHASETASK.md#g6) | S-30…S-33 (SHOULD) |

---

## 1. Coordination rules (canonical)

### 1.1 Ownership principle

Every writable file, route handler, database object, fixture and manifest has **exactly one owner** (§2). Some cases are not ownership:

- **Dependency, not ownership.** Calling another person's function, route or RPC, or importing their types, is a dependency.
- **Owner's choice.** The owner decides implementation details inside the frozen contract (§3).
- **Shared rehearsals.** All three people take part, but one accountable lead signs off, and each person's responsibilities are listed under that gate.

### 1.2 Contract freeze and change requests

1. **CP-1 (about 15 min):** Francis presents §3. Carlos confirms the persistence interface (§3.6). Shanti confirms the controller interface (§3.7) and the DTOs she renders. Recording agreement in the evidence log passes **[G1](#g1)**.
2. After G1, any change to §3 needs a **change request**:
   - The requester posts in the team chat: `CR: <what> | why | which tasks change | proposed shape`.
   - Francis records it in §3.10 as `CR-xx`, decides with the affected owner, updates §3 and the `src/contracts/` code in **one commit**, and announces the commit hash.
   - Consumers adapt in their own files. Nobody edits `src/contracts/` except Francis.
   - Additive optional fields can be approved immediately. Renames, removals and semantic changes need both producer and consumer to agree.
3. Breaking changes after CP-3 (15:00) need all three people to agree, because rehearsal starts then.

### 1.3 Dependency (package) handoff

- **Carlos owns** `package.json` and `package-lock.json` for routine dependency changes. The repo uses **npm** (it has `package-lock.json`). Do not introduce pnpm here. A user-authorised exception is recorded below; it does not transfer ongoing ownership.
- **To request a package:** post `DEP: <package>@<exact version> | runtime or dev | why | importing file`. Carlos installs it on his branch (⚠ AUTH applies to lockfile changes) and merges a dependency-only commit. Everyone else then runs `npm ci`; nobody runs `npm install`.
- Known requests:
  - Francis's `@supabase/ssr` request is fulfilled: `@supabase/ssr@0.12.7` is pinned in `package.json` and `package-lock.json` for `src/server/auth/session.ts`. `@stellar/stellar-sdk` is already installed for server-side challenge verification, shared with Carlos.
  - Shanti needs none beyond the existing ones.

### 1.4 Recommended branch and merge sequence

No branches are created by this plan. Suggested names: `francis/*`, `carlos/*`, `shanti/*`. All merges go to `main` through a PR or a fast-forward after `npm run lint` and `npm run build` pass (plus `npm test` once C-01 adds it).

1. `francis/contracts`: `src/contracts/**` and `src/client/http.ts`. **Merge first**, at G1.
2. `carlos/tooling`: package changes, Vitest, scripts, `src/lib/amount.ts`, `src/lib/stellar/**`.
3. `francis/schema`: `supabase/migrations/002…`, `src/server/db/**`, `src/server/http/**`, `src/server/auth/**`.
4. `shanti/ui-shell`: layouts, navigation, design-system components, fixture-driven pages. This can merge before 3 because it only depends on 1.
5. `carlos/payments`: `src/server/paiflow/**`, payment routes, `src/client/controllers/**`.
6. `francis/routes`: business routes.
7. `shanti/integration`: switches pages from mock to real controllers (after G3).
8. SHOULD branches (`*/protected-payment`) only after G5.

Rules:

- Update your branch with `git fetch` plus `git merge origin/main`. Rebase only your own unpublished commits.
- On a conflict in a file you do not own, **stop and ask its owner**. Never resolve someone else's file by choosing your side.
- Never push to another person's branch.

### 1.5 Secrets and authorisation

- **Secrets stay out of every public place.** The Paiflow token (`pfd_`/`pfk_`), the Supabase service role key, the event access code, wallet secret keys and seed phrases never appear in these docs, commits, screenshots, chat, logs or the browser bundle.
- **`.env.local` is local only.** It is git-ignored ([.gitignore](../.gitignore) `.env*`) and lives only on the machine that runs the server.
- **Credential custodian (proposed, B-07):** Carlos holds the Paiflow token and the server `.env.local` on the demo server machine. Francis holds the Supabase service role key (PRD §L.5 "team lead").
- **⚠ AUTH required for:** applying migrations, creating accounts, organisations and memberships, setting operator flags, creating storage buckets, running seeds or `test-supabase.ts`, every Testnet transaction (Split payments, deposits, releases, hosted-page payments) and deploying flows. Do **not** run inherited seeds, `scripts/seed-demo-data.js` or `test-supabase.ts`.

---

## 2. Ownership matrix (canonical)

The legend for this section:

- Paths marked *(new)* do not exist yet.
- "Delete/replace" means the owner may remove the inherited file once its dependents are gone (see the dependency column).
- A path that ends in `/**` assigns every file under that directory to the same owner.

### 2.1 Existing files

| Existing path | Owner | Planned action | Dependents / notes |
|---|---|---|---|
| [docs/PRD.MD](PRD.MD) | Francis | Record spike findings later (S0 slice) from C-02/F-02 evidence. Not edited by this plan. | Others send findings; Francis transcribes them |
| [docs/PHASETASK.MD](PHASETASK.MD) | Francis | Historical; carries a supersession link to these docs | — |
| [docs/DEMO_CHECKLIST.md](DEMO_CHECKLIST.md), [docs/VIDEO_SCRIPT.md](VIDEO_SCRIPT.md), [docs/HCI_CODEX_PROMPT.md](HCI_CODEX_PROMPT.md), [docs/SUPABASE_SETUP.md](SUPABASE_SETUP.md), [docs/archive/](archive/) | Francis | Historical; leave as they are | Shanti's demo runbook lives in her document |
| [README.md](../README.md), [Claude.md](../Claude.md) | Francis | Update commands and status after G5 | — |
| [TESTING.md](../TESTING.md) | Carlos | Replace with the SME test guide after C-01 | — |
| [UPDATE.md](../UPDATE.md) | Shanti | Historical; may delete | — |
| [package.json](../package.json), `package-lock.json`, [tsconfig.json](../tsconfig.json), [next.config.ts](../next.config.ts), [eslint.config.mjs](../eslint.config.mjs) | Carlos | Dependencies, scripts, tooling | Requests via §1.3 |
| [postcss.config.mjs](../postcss.config.mjs), [src/app/globals.css](../src/app/globals.css) | Shanti | Styles | — |
| [.env.local.example](../.env.local.example), [.gitignore](../.gitignore) | Carlos | Add Paiflow and new server variables; drop `ANTHROPIC_API_KEY`/`NODE2_*`/`NODE3_*` once their code is retired | Francis requests Supabase-related entries |
| [src/lib/supabase.ts](../src/lib/supabase.ts) | Francis | Replace with `src/server/db/client.ts` plus a browser auth client | Inherited routes import it |
| [src/lib/auth.ts](../src/lib/auth.ts) | Francis | Replace with `src/server/auth/**` | Inherited routes |
| [src/lib/hash.ts](../src/lib/hash.ts) | Francis | Reuse as is | — |
| [src/lib/blockchain.ts](../src/lib/blockchain.ts), [src/lib/audit.ts](../src/lib/audit.ts), [src/lib/nodes.ts](../src/lib/nodes.ts), [src/lib/ai.ts](../src/lib/ai.ts), [src/lib/types.ts](../src/lib/types.ts) | Francis | Replace ledger/audit with RPC-based `src/server/db/evidence.ts` (F-09); retire nodes, ai and legacy types in F-20 | `src/utils/constants.ts` and components import `lib/types` (Shanti removes those first) |
| [src/lib/client-storage.ts](../src/lib/client-storage.ts) | Shanti | UI conveniences only. **Never** financial evidence or tokens. | — |
| [src/utils/constants.ts](../src/utils/constants.ts), [src/utils/formatters.ts](../src/utils/formatters.ts) | Shanti | UI labels and date formatting. Amounts use Carlos's `src/lib/amount.ts`. | — |
| `src/app/api/{audit,auth,blockchain,budget,consensus,documents,summarize,verify}/**` (inherited) | Francis | Delete or return 410 in F-20, after Shanti removes the pages that call them. Their logic is **not** reused: budget and consensus are rewritten as SME budget-plan routes (REQ-BUD-02 rewrite). | Security gaps in PRD §K.12 |
| `src/app/(public)/**`, `src/app/(admin)/**`, [src/app/layout.tsx](../src/app/layout.tsx), [src/app/icon.png](../src/app/icon.png) | Shanti | Replace government pages and navigation with SME screens | — |
| `src/components/**` (all inherited) | Shanti | Reuse `ui/*`, `AuditTimeline`, `VerificationResult`, `BudgetChart`, `BudgetTable`, `consensus/ApprovalStatus`; retire government components | — |
| `supabase/migrations/001_initial_schema.sql`, `supabase/policies/*`, `supabase/seeds/*` | Francis | **Never edit 001** (PRD §I.13). Do not run seeds. | — |
| [scripts/seed-demo-data.js](../scripts/seed-demo-data.js), [test-supabase.ts](../test-supabase.ts), [test-phase0.ts](../test-phase0.ts) | Francis | Do not run. Delete in F-20. | — |
| `prototype/**`, `public/**` | Shanti | Design reference and assets | — |

### 2.2 New source paths

| New path *(new)* | Owner | Purpose |
|---|---|---|
| `src/contracts/**` | **Francis** | Canonical TypeScript contracts: `states.ts`, `errors.ts`, `dto.ts`, `api.ts`, `controllers.ts`, `state-copy.ts`, `limits.ts`, `canonical.ts`, `split.ts` (pure bigint share calculator, §3.1), `fixtures/**`. Types and pure functions only, with no I/O. |
| `src/client/http.ts` | Francis | Browser `fetch` helper: same-origin JSON, `{data}`/`{error}` parsing, timeout, `Retry-After`. Ported from starter `lib/browser-api.ts`. |
| `src/client/api/business.ts` | Francis | Typed browser fetchers for Francis's routes (§3.5) |
| `src/client/api/payments.ts` | Carlos | Typed browser fetchers for Carlos's routes (§3.5) |
| `src/client/wallet/**` | Carlos | Freighter: connect, network check, `signMessage`, `signTransaction` |
| `src/client/controllers/**` (incl. `mock/**`) | Carlos | Headless hooks/controllers (§3.7) and fixture-backed mocks |
| `src/lib/amount.ts`, `src/lib/stellar/**`, `src/lib/explorer.ts` | Carlos | Isomorphic pure helpers: stroops↔XLM, envelope hash and fee-bump check, asset matching, Stellar Expert URLs |
| `src/server/db/**` | Francis | Server-only Supabase client and persistence functions, each wrapping exactly one RPC or query (§3.6) |
| `src/server/http/**` | Francis | `readJson` (streaming limit), `readMultipart` limits, `sameOrigin`, `respond`/`handle`, rate-limit buckets. Ported from starter `lib/http.ts` and `lib/payment-rate-limit.ts`. |
| `src/server/auth/**` | Francis | Session reading, `requireUser`, `requireOrgRole`, `requireParticipant`, `requireOperator`, role derivation from server tables |
| `src/server/wallet-binding/**` | Francis | Challenge message builder and server signature verification (§B-03) |
| `src/server/files/**` | Francis | Upload limits, streaming hash, private storage, signed URLs: shared by SME documents (MVP) and deliverables (SHOULD) |
| `src/server/paiflow/**` | Carlos | `server-only` SDK adapter, config validation, capabilities, payment, events, verifier, reconciler; SHOULD release |
| `src/server/wallet-summary/**` | Carlos | Horizon balance read; history aggregation |
| `src/app/(sme)/**`, `src/components/sme/**` | Shanti | All new pages, layouts and components (exact page paths in Shanti §3) |
| `tests/server/business/**`, `tests/db/**`, `tests/fixtures/db/**` | Francis | Tests for owned systems |
| `tests/server/payments/**`, `tests/client/**`, `tests/fixtures/paiflow/**`, `vitest.config.ts`, `scripts/check-browser-bundle.mjs` | Carlos | Payment, wallet and controller tests; tooling; bundle scan |
| `tests/ui/**` | Shanti | Optional UI smoke tests |
| `supabase/migrations/002_*.sql` and later | **Francis** | **All** schema, RLS, functions, storage. Carlos specifies requirements; he never writes migrations. |
| `docs/FRANCIS-PHASETASK.md` / `CARLOS-…` / `SHANTI-…` | Each named person | Own checkboxes and evidence |

### 2.3 API route ownership

There is one owner per `route.ts`. Business and financial operations on the same resource live in **separate route files**. All files below are *(new)* under `src/app/api/`.

| Route file | Method | Owner | Tier |
|---|---|---|---|
| `auth/sign-in/route.ts`, `auth/sign-out/route.ts`, `auth/me/route.ts` | POST/POST/GET | Francis | MVP |
| `wallet/challenge/route.ts`, `wallet/bind/route.ts`, `wallet/unbind/route.ts` | POST | Francis | MVP |
| `wallet/summary/route.ts` | GET | Carlos | MVP |
| `orgs/route.ts` | GET | Francis | MVP |
| `orgs/[orgId]/split-deployment/route.ts` | GET | Francis | MVP |
| `orgs/[orgId]/budget-plans/route.ts` | GET, POST | Francis | MVP |
| `orgs/[orgId]/budget-plans/[planId]/route.ts` | GET | Francis | MVP |
| `orgs/[orgId]/budget-plans/[planId]/versions/route.ts` | POST | Francis | MVP |
| `orgs/[orgId]/budget-plans/[planId]/approve/route.ts`, `…/reject/route.ts` | POST | Francis | MVP |
| `orgs/[orgId]/budget-plans/[planId]/pay/prepare/route.ts`, `…/pay/submit/route.ts`, `…/pay/check/route.ts`, `…/pay/resubmit/route.ts` | POST | Carlos | MVP |
| `orgs/[orgId]/budget-plans/[planId]/evidence/refresh/route.ts` | POST | Carlos | MVP |
| `orgs/[orgId]/documents/route.ts`, `…/documents/[docId]/download/route.ts` | GET, POST / GET | Francis | MVP |
| `orgs/[orgId]/verify-file/route.ts` | POST | Francis | MVP |
| `operator/deployments/route.ts` | GET, POST | Carlos (it calls Francis's registry RPCs) | MVP |
| `operator/reviews/route.ts`, `operator/reviews/[reviewId]/route.ts` | GET / POST | Carlos (it calls Francis's review RPCs) | MVP |
| `integration/status/route.ts` | GET | Carlos | MVP |
| `internal/reconcile/route.ts` (only if B-06 chooses an HTTP trigger) | POST | Carlos | MVP |
| `deployments/match/route.ts`, `deals/route.ts`, `deals/[id]/route.ts`, `deals/[id]/terms/**`, `deals/[id]/deliverables/**`, `deals/[id]/verify-file/route.ts`, `deals/[id]/approve/route.ts`, `deals/[id]/reject/route.ts` | — | Francis | SHOULD |
| `deals/[id]/fund/{prepare,submit,check,resubmit}/route.ts`, `deals/[id]/release/route.ts`, `deals/[id]/release/check/route.ts`, `deals/[id]/evidence/refresh/route.ts` | POST | Carlos | SHOULD |
| `receipts/route.ts` (opt-in/withdraw) + page `src/app/r/[slug]/` | — | Francis (data route) / Shanti (page) | SHOULD |

### 2.4 Database ownership

Every table, index, policy, function, trigger and bucket is owned by **Francis**, in migrations he writes. Carlos's code reaches the financial objects only through the §3.6 functions.

| Object | Migration *(new)* | Tier | Primary consumer |
|---|---|---|---|
| `profiles` (with `is_operator`), `wallet_challenges`, `wallet_bindings`, `organisations`, `org_memberships` | `002_sme_identity_orgs_wallets.sql` | MVP | Francis routes; Carlos wallet summary (read) |
| `paiflow_deployments` (incl. `split_recipients jsonb`, ordered), `deployment_reservations` | `003_sme_deployments.sql` | MVP | Both |
| `budget_plans`, `budget_plan_versions` (CL-13), `budget_envelopes`, `budget_approvals`, `plan_state_transitions` | `004_sme_budget_plans.sql` | MVP | Both |
| `payment_attempts` (plan or deal scope), `payment_envelope_rejections`, `payout_verifications`, `paiflow_events` (CL-07), `event_cursors`, `reconcile_leases` (CL-08), `operator_reviews` | `005_sme_financial_evidence.sql` | MVP | Carlos (via §3.6) |
| `org_documents`, storage bucket `sme-files` (private) | `006_sme_documents.sql` | MVP | Francis |
| `blockchain` tail-lock fix, `transactions` new columns and `action_type` values, `append_evidence()` | `007_sme_ledger_audit.sql` | MVP | Internal to every RPC |
| All MVP RPC functions in §3.6 | `008_sme_functions.sql` (may be split per area) | MVP | Both |
| `deals`, `deal_terms_versions`, `terms_acceptances`, `deliverable_versions`, `deal_approvals`, `release_attempts`, `deal_state_transitions` and their RPCs | `010_should_protected_payment.sql` | SHOULD | Both |
| `public_receipts` | `011_should_receipts.sql` | SHOULD | Francis |
| Template/mock-courier state | `012_stretch_templates.sql` | STRETCH | Francis |

---

## 3. Shared contracts (canonical)

These are frozen at **G1**, and the code mirror lives in `src/contracts/**` (F-01). Where this section clarifies or extends the PRD, it says so in §3.9. The SHOULD-tier protected-payment contracts are included so later work does not reshape the MVP; they are not built until after G5.

<a id="contract-conventions"></a>
### 3.1 Conventions

| Topic | Rule |
|---|---|
| Envelope | Success: `{ "data": T }`. Error: `{ "error": { "code": ErrorCode, "message": string, "fields"?: Record<string,string> } }`. This follows the PRD §I.14 shape and replaces the inherited `{success,data}`. |
| Auth | Session cookie set by `POST /api/auth/sign-in` (F-03 confirms the mechanism). Every route except `auth/sign-in` requires a session and returns `401 UNAUTHENTICATED` without one. Roles come from server tables only, never `user_metadata`. |
| Org roles | `owner`, `approver`, `member` (PRD §I.1). Operator is a profile flag and is **not** an org role. |
| Origin | Every mutation needs same-origin `Origin`, not `sec-fetch-site: cross-site`. JSON routes require `Content-Type: application/json`. |
| Limits | JSON bodies are capped at 64 KB, enforced while streaming. Pay-submit is capped at 210,000 bytes, with `signedXdr` at most 200,000 chars. Uploads are capped at 10 MB (`limits.ts`). |
| IDs | UUID v4 strings. Deployment ID = the Paiflow **deployment UUID**: not the flow ID and not the `C…` contract address. |
| Money | `…Stroops: string` matching `^[1-9][0-9]{0,38}$` (1 XLM = `"10000000"`). Use `bigint` arithmetic only and never `Number`. Display via Carlos's `fromStroops`. PHP planning figures are integer centavos in a **separate** field, labelled "planning figure (PHP), not a crypto amount", and never converted (D-08). |
| Split shares | `splitShares(totalStroops, envelopes[ordered by deployment order])`: each share is `total × bps / 10000` (bigint floor), and the **last** envelope in deployment order also receives the remainder (PRD §H.5, llms.md Split). Lives in `src/contracts/split.ts`, the single implementation used by Francis (plan view) and Carlos (verifier). |
| Asset | `AssetRef = { kind: "native" }` for the MVP. `{ kind: "known", symbol: "USDC" }` is STRETCH only. |
| Network | Literal `"testnet"`. Any other value is an error. |
| Addresses | `^G[A-Z2-7]{55}$`. They are visible only to org members or deal participants and operators. |
| Time | The server emits ISO-8601 UTC (`…Z`). The UI renders Asia/Manila (PHT, UTC+8) with the zone label. **Margins are computed in SQL with Postgres `now()`**, so there is one clock. |
| Hashes | Lower-case 64-hex. **Field names never mix kinds:** `stellarTxHash` (explorer-checkable), `sha256` (files, plans, terms), `auditHash` (CYFER `transactions.tx_hash`, **not** Stellar), `ledgerBlockHash` (CYFER application ledger, **not** Stellar). |
| Explorer | `https://stellar.expert/explorer/testnet/tx/{stellarTxHash}`, labelled "Stellar Expert (testnet)" (Carlos `src/lib/explorer.ts`). |

<a id="contract-states"></a>
### 3.2 States and allowed actions

**Budget plan state** (`PlanState`, PRD §F.5, MVP):

```
draft | pending_approval | approved | payment_pending | payment_confirmed | distribution_verified |
rejected | superseded | mismatch | operator_review
```

**Dashboard state** (`DashboardState`): Shanti renders this, never raw states.

| Dashboard | Plan state(s) |
|---|---|
| `planned` | `draft`, `pending_approval` |
| `approved` | `approved` |
| `pending` | `payment_pending`, `payment_confirmed` |
| `verified_distribution` | `distribution_verified` |
| `needs_review` | `mismatch`, `operator_review` |
| `closed` | `rejected`, `superseded` |

**Payment attempt state** (`PaymentAttemptState`, PRD §F.2 plus CL-02/CL-03; shared by budget plans and SHOULD deals):

```
preparing | prepare_failed | prepared | signing | signed_persisted | submitted |
success | failed | pending | unknown | rejected | expired_unsigned | operator_review | reconciled
```

- **Terminal:** `success`, `failed` (final FAILED recorded), `prepare_failed` (no XDR ever left the server), and `reconciled` (operator outcome with a `resolution`).
- **Unique index:** the partial unique index applies to every *non*-terminal state, **per plan** and **per deal** (INV-04). PRD §I.5's `failed_recorded` corresponds to `failed` here.

**Verification state** (`VerificationState`, PRD §F.3):

```
not_started | awaiting_tx_final | awaiting_events | verified | mismatch | operator_review
```

The UI shows `awaiting_tx_final` and `awaiting_events` as "pending evidence".

**Plan allowed actions.** The server computes these in `GET …/budget-plans/:planId` (F-17), so the UI never re-implements the state machine:

| `PlanAction` | Shown to | When |
|---|---|---|
| `approve`, `reject` | a snapshotted approver who has not decided | `pending_approval`, current version |
| `edit_plan` (new version) | owner | `draft`, `pending_approval`, `approved` or `rejected`, and no payment attempt ever existed |
| `pay` | authorised signer | `approved` for the current version hash, the signer's active binding equals the plan's signer address, and no non-terminal attempt exists |
| `pay_blocked_until_approved` | authorised signer | `pending_approval`. The UI shows a disabled pay button with "Waiting for all approvers (k of n)". The demo step shows the server refusing too (REQ-BUD-02 AC4). |
| `continue_payment` | signer | the attempt is `prepared`/`signing`, not expired, and has no signed envelope |
| `check_payment` | org members | the attempt is in `submitted`, `pending`, `unknown`, `rejected` or `expired_unsigned`, or a signed envelope is stored without a final status |
| `resubmit_same_envelope` | signer | a signed envelope is stored, the outcome is unresolved, and the status is not `SUCCESS`/`FAILED` (REQ-REC-01) |
| `refresh_evidence` | org members | `payment_pending` or `payment_confirmed` |
| `verify_file` | org members | at least one document or plan version exists |

**SHOULD — deal state** (`DealState`, PRD §F.1):

```
draft | terms_pending | ready_to_fund | funding | funded_unindexed | funded_held |
delivered | approved | release_requested | release_uncertain | payout_verified |
awaiting_refund | refunded_verified | operator_review | cancelled
```

- `rejected_deliverable` is a transition, not a stored state (CL-01).
- **Deal actions:** `edit_terms`, `accept_terms`, `fund`, `continue_funding`, `check_funding`, `resubmit_same_envelope`, `upload_deliverable`, `verify_file`, `approve`, `reject`, `release`, `check_release`, `refresh_evidence`. The rules are those in PRD §F.1 and §E.3–§E.8.
- **Release attempt state** (CL-04): `requested | responded | refused | uncertain | verified | mismatch | operator_review`.

**Margins** (`src/contracts/limits.ts`; configurable on the server):

- `CHALLENGE_TTL_SECONDS = 300`
- `SIGNED_URL_TTL_SECONDS = 300`
- `MAX_UPLOAD_BYTES = 10 485 760`
- `MAX_EVENT_POLLS_PER_SCOPE_PER_HOUR = 40`
- `PAYOUT_EVIDENCE_THRESHOLD_SECONDS = 600`
- SHOULD: `FUNDING_MARGIN_SECONDS = 600`, `RELEASE_MARGIN_SECONDS = 120`, `REFUND_ALERT_SECONDS = 1800`

**State copy.** The canonical honest wording is in `src/contracts/state-copy.ts` (Francis), taken from the PRD. Shanti may style it but must not change its meaning.

- **MVP required strings:** "Planned: waiting for approvals ({k} of {n})", "Approved: ready for the authorised signer", "Payment pending", "Payment confirmed; {k} of {n} payouts verified", "{Label} paid — verified", "Distribution verified", "Payment outcome unknown. Do not pay again.", "Evidence mismatch — under review", "Transaction confirmed; payout not yet verified", "planning figure (PHP), not a crypto amount".
- **Tamper-check results** (REQ-DLV-02):
  - Match: "Matches {record} recorded {time}. This confirms the bytes are identical. It does not confirm quality, authorship or that delivery was truthful."
  - Non-match: "Does not match {record}. The file differs from what was recorded. This alone does not prove tampering."
- **Never** use "Distributed", "Paid" or "Refunded" before verification.
- **SHOULD strings:** the PRD §F.1 deal wording plus the warning `NONRESPONSE_REFUND`, which reads "If the payer does not approve before the deadline, Paiflow refunds the payer even if the payee delivered."

<a id="contract-errors"></a>
### 3.3 Error codes (safe, browser-visible)

Messages are safe and generic. They never include tokens, XDR, SQL, stack traces or other users' data.

| HTTP | `code` | Typical source |
|---|---|---|
| 400 | `VALIDATION_SHAPE`, `CHALLENGE_INVALID`, `SIGNATURE_INVALID` | Malformed body; expired, reused or unknown challenge; bad signature |
| 401 | `UNAUTHENTICATED` | No or expired session |
| 403 | `FORBIDDEN`, `NOT_MEMBER`, `NOT_PARTICIPANT`, `OPERATOR_REQUIRED`, `WALLET_MISMATCH`, `PLAN_NOT_APPROVED`, `NOT_SIGNER`, `APPROVAL_REQUIRED` | Role or ownership checks. **`PLAN_NOT_APPROVED` is the REQ-BUD-02 AC4 refusal.** |
| 404 | `NOT_FOUND` | Unknown org, plan, document, deal or review |
| 409 | `STATE_CONFLICT`, `STALE_VERSION`, `NO_SPLIT_DEPLOYMENT`, `AMBIGUOUS_DEPLOYMENT_MATCH`, `ADDRESS_ALREADY_BOUND`, `BINDING_LOCKED`, `EDIT_AFTER_PAYMENT`, `ATTEMPT_UNRESOLVED`, `RESUBMIT_NOT_ALLOWED`; SHOULD: `NO_MATCHING_DEPLOYMENT`, `EDIT_AFTER_FUNDING`, `DEADLINE_MARGIN`, `NOT_PREPARED`, `RELEASE_EXISTS` | Conditional updates that affected zero rows; uniqueness checks |
| 413 | `REQUEST_TOO_LARGE` | Body or file limits |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Wrong content type or file type |
| 422 | `VALIDATION`, `ENVELOPES_MISMATCH_DEPLOYMENT`, `BPS_TOTAL_INVALID`, `DUPLICATE_RECIPIENT`, `APPROVER_SET_INVALID`, `ENVELOPE_CHANGED`, `CAPABILITY_MISMATCH`; SHOULD: `DEADLINE_PASSED`, `NOTHING_TO_RELEASE` | Domain validation; Paiflow 422s mapped by Carlos |
| 429 | `RATE_LIMITED` (+ `Retry-After`) | Local or Paiflow limits |
| 502 | `UPSTREAM_UNRESOLVED`, `BALANCE_UNAVAILABLE` | Lost or failed upstream response. The outcome is unknown, never "failed". |
| 503 | `PAIFLOW_NOT_CONFIGURED` | Missing or invalid server configuration |
| 500 | `INTERNAL` | Anything else, with a safe message only |

<a id="contract-dtos"></a>
### 3.4 DTOs (browser-visible)

The authoritative definitions go in `src/contracts/dto.ts`. Fields marked `?` are optional; `| null` means the field is always present and may be null.

```ts
type Sha256Hex = string; type StellarTxHash = string; type GAddress = string; type IsoUtc = string;

interface SessionDTO { userId: string; displayName: string; isOperator: boolean;
  binding: { address: GAddress; verifiedAt: IsoUtc } | null;
  orgs: { orgId: string; name: string; role: 'owner' | 'approver' | 'member' }[] }

// ---------- MVP: budget plans ----------
interface SplitDeploymentDTO { deploymentId: string; network: 'testnet'; asset: AssetRef;
  recipients: { position: number; address: GAddress; bps: number; label: string | null }[];  // deployment order
  status: 'available' | 'reserved' }

interface EnvelopeDTO { position: number; label: string; bps: number; recipientAddress: GAddress;
  expectedShareStroops: string;            // from splitShares(); remainder on the last envelope
  planningPhpCentavos: string | null;      // integer string, separate from crypto
  payout: VerificationDTO | null }         // kind 'envelope_payout'

interface PlanApprovalDTO { approverName: string; isViewer: boolean;
  decision: 'pending' | 'approved' | 'rejected'; decidedAt: IsoUtc | null; reason: string | null }

interface PaymentAttemptViewDTO { attemptId: string; state: PaymentAttemptState;
  originalTxHash: StellarTxHash | null; expiresAt: IsoUtc | null; submittedAt: IsoUtc | null;
  finalStatus: 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNKNOWN' | 'REJECTED' | 'NOT_FOUND' | null;  // NOT_FOUND = HTTP 404 lookup
  ledger: number | null; hasSignedEnvelope: boolean; lastCheckedAt: IsoUtc | null }
  // never contains preparedXdr / signedXdr / historyRequestId / request ids

interface VerificationDTO { kind: 'payment_receipt' | 'envelope_payout' | 'release_payout' | 'refund_payout';
  state: VerificationState; stellarTxHash: StellarTxHash | null; expectedAddress: GAddress;
  expectedAmountStroops: string; observedAmountStroops: string | null; eventIds: string[];
  checkedAt: IsoUtc | null; note: string | null }

interface TimelineEntryDTO { at: IsoUtc; kind: AuditActionType; actorRole: string;
  summary: string; stellarTxHash?: StellarTxHash; sha256?: Sha256Hex; auditHash?: string; ledgerBlockId?: number }

interface BudgetPlanSummaryDTO { planId: string; orgId: string; version: number; purpose: string;
  state: PlanState; dashboardState: DashboardState; totalStroops: string; asset: AssetRef;
  approvals: { approved: number; required: number }; updatedAt: IsoUtc }

interface BudgetPlanDetailDTO extends BudgetPlanSummaryDTO {
  versionId: string; planSha256: Sha256Hex; ledgerBlockId: number | null;
  deployment: { id: string; network: 'testnet'; asset: AssetRef };
  signer: { displayName: string; address: GAddress };
  envelopes: EnvelopeDTO[]; approvalsDetail: PlanApprovalDTO[];
  payment: PaymentAttemptViewDTO | null; paymentReceipt: VerificationDTO | null;   // H.1 + H.2 for the Split payment
  payoutsVerified: { verified: number; total: number };
  versions: { versionId: string; version: number; planSha256: Sha256Hex; createdAt: IsoUtc; superseded: boolean }[];
  timeline: TimelineEntryDTO[]; viewerRoles: ('owner' | 'approver' | 'member' | 'signer' | 'operator')[];
  allowedActions: PlanAction[]; serverTime: IsoUtc }

interface CreatePlanInput { purpose: string; totalStroops: string; signerUserId: string;
  envelopes: { position: number; label: string; bps: number; recipientAddress: GAddress; planningPhpCentavos: string | null }[];
  attachmentDocumentIds?: string[] }

interface PaymentReviewDTO { attemptId: string; network: 'testnet'; networkPassphrase: string;
  xdr: string;                    // unsigned, returned ONLY to the owning signer while unexpired (CL-06)
  originalTxHash: StellarTxHash; expiresAt: IsoUtc; amountStroops: string; asset: AssetRef;
  feeStroops: string | null; deploymentId: string;
  recipients: { label: string; address: GAddress; expectedShareStroops: string }[];   // what the signer consents to
  outcome: 'created' | 'existing' }

// ---------- MVP: documents and tamper check ----------
interface OrgDocumentDTO { documentId: string; kind: 'contract' | 'invoice' | 'receipt' | 'plan_attachment' | 'other';
  sha256: Sha256Hex; sizeBytes: number; mediaType: string; originalFilename: string; uploadedAt: IsoUtc;
  uploadedBy: string; ledgerBlockId: number | null }

interface VerifyFileResultDTO { target: { kind: 'org_document' | 'plan_version' | 'deliverable_version'; id: string; label: string };
  recordedAt: IsoUtc; candidateSha256: Sha256Hex; recordedSha256: Sha256Hex; match: boolean }

// ---------- MVP: wallet ----------
interface WalletSummaryDTO { network: 'testnet'; binding: { address: GAddress; verifiedAt: IsoUtc } | null;
  balance: { state: 'available'; xlmStroops: string; asOf: IsoUtc } | { state: 'unavailable'; asOf: IsoUtc };
  plans: { orgId: string; planId: string; purpose: string; dashboardState: DashboardState;
           role: 'owner' | 'approver' | 'signer' | 'envelope_recipient' }[];
  escrow: { dealId: string; title: string; state: DealState; amountStroops: string; depositVerified: boolean }[];  // SHOULD; [] in MVP
  verifiedPayouts: { receivedStroops: string; refundedStroops: string };   // verified only
  history: { kind: 'budget_payment' | 'envelope_payout' | 'deposit' | 'release' | 'refund'; refId: string; amountStroops: string;
    stellarTxHash: StellarTxHash; explorerUrl: string; verification: VerificationState; at: IsoUtc }[] }

// ---------- MVP: operator ----------
interface DeploymentRegistryEntryDTO { deploymentId: string; template: 'budget_split' | 'commission_escrow' | string;
  network: 'testnet'; asset: AssetRef; graphSnapshotSha256: Sha256Hex;
  splitRecipients: { position: number; address: GAddress; bps: number; label: string | null }[] | null;
  conditionNodeId: string | null; deadlineAt: IsoUtc | null; sellerAddress: GAddress | null; buyerAddress: GAddress | null;
  status: 'available' | 'reserved' | 'retired' | 'unusable'; registeredAt: IsoUtc }

interface OperatorReviewDTO { reviewId: string; scope: 'payment_attempt' | 'verification' | 'plan' | 'release_attempt' | 'deal';
  refId: string; reason: string; openedAt: IsoUtc; resolvedAt: IsoUtc | null; outcome: string | null }

// ---------- SHOULD: protected payment ----------
// DealSummaryDTO, DealDetailDTO, TermsDTO, DeliverableVersionDTO, ApprovalDTO, ReleaseViewDTO, DeploymentMatchDTO:
// as in PRD §E.3–§E.8. Fixed at the start of F-30 via CR; the fields named in Shanti S-30..S-33 are the minimum.
```

<a id="contract-endpoints"></a>
### 3.5 Endpoints

All endpoints need a session unless marked otherwise. `…/plans/:p` stands for `/api/orgs/:orgId/budget-plans/:planId`.

| Route | Owner | Caller | Request | `data` on success | Notable errors |
|---|---|---|---|---|---|
| POST `/api/auth/sign-in` | F | public | `{email, password}` | `SessionDTO` | 400, 401, 429 |
| POST `/api/auth/sign-out` | F | any | `{}` | `{}` | — |
| GET `/api/auth/me` | F | any | — | `SessionDTO` | 401 |
| POST `/api/wallet/challenge` | F | user | `{address}` | `{challengeId, message, expiresAt}` | 422, 429 |
| POST `/api/wallet/bind` | F | user | `{challengeId, address, signedMessage, signerAddress}` | `{address, verifiedAt}` | 400 `CHALLENGE_INVALID`/`SIGNATURE_INVALID`, 409 `ADDRESS_ALREADY_BOUND` |
| POST `/api/wallet/unbind` | F | user | `{}` | `{}` | 409 `BINDING_LOCKED` (address is signer of a non-terminal plan or party to a non-terminal deal) |
| GET `/api/wallet/summary` | C | user | — | `WalletSummaryDTO` | balance failure shows as `state:'unavailable'`, never 0 |
| GET `/api/orgs` | F | user | — | `SessionDTO['orgs']` | — |
| GET `/api/orgs/:orgId/split-deployment` | F | owner | — | `SplitDeploymentDTO` | 409 `NO_SPLIT_DEPLOYMENT`/`AMBIGUOUS_DEPLOYMENT_MATCH` |
| GET `/api/orgs/:orgId/budget-plans` | F | member | — | `BudgetPlanSummaryDTO[]` | 403 `NOT_MEMBER` |
| POST `/api/orgs/:orgId/budget-plans` | F | owner | `CreatePlanInput` | `BudgetPlanDetailDTO` | 422 `ENVELOPES_MISMATCH_DEPLOYMENT`/`BPS_TOTAL_INVALID`/`DUPLICATE_RECIPIENT`/`APPROVER_SET_INVALID` |
| GET `…/plans/:p` | F | member / operator | — | `BudgetPlanDetailDTO` | 403 |
| POST `…/plans/:p/versions` | F | owner | `CreatePlanInput` | `BudgetPlanDetailDTO` (new version; prior approvals void) | 409 `EDIT_AFTER_PAYMENT` |
| POST `…/plans/:p/approve` | F | approver | `{versionId, planSha256}` | `BudgetPlanDetailDTO` | 409 `STALE_VERSION`, 403 |
| POST `…/plans/:p/reject` | F | approver | `{versionId, planSha256, reason}` | `BudgetPlanDetailDTO` | 409, 403 |
| POST `…/plans/:p/pay/prepare` | C | signer | `{}` | `PaymentReviewDTO` | **403 `PLAN_NOT_APPROVED` with no Paiflow call**, 403 `NOT_SIGNER`/`WALLET_MISMATCH`, 409 `ATTEMPT_UNRESOLVED` |
| POST `…/plans/:p/pay/submit` | C | signer | `{attemptId, signedXdr}` | `PaymentAttemptViewDTO` | 422 `ENVELOPE_CHANGED`, 409, 502 |
| POST `…/plans/:p/pay/check` | C | member | `{attemptId}` | `PaymentAttemptViewDTO` | 429. **Read-only: never submits** (CL-05). |
| POST `…/plans/:p/pay/resubmit` | C | signer | `{attemptId, originalTxHash, intent:'resubmit_same_signed_envelope'}` | `PaymentAttemptViewDTO` | 409 `RESUBMIT_NOT_ALLOWED` |
| POST `…/plans/:p/evidence/refresh` | C | member | `{}` | `BudgetPlanDetailDTO` | 429. One bounded, read-only reconciliation pass; it never submits. |
| GET/POST `/api/orgs/:orgId/documents` | F | member | POST: multipart `file` + `kind` | `OrgDocumentDTO[]` / `OrgDocumentDTO` | 413, 415 |
| GET `/api/orgs/:orgId/documents/:docId/download` | F | member | — | `{url, expiresAt}` (signed URL ≤ 5 min) | 403 |
| POST `/api/orgs/:orgId/verify-file` | F | member | multipart `file` + `target: {kind:'org_document'\|'plan_version', id}` | `VerifyFileResultDTO` | 413, 403, 429 |
| GET/POST `/api/operator/deployments` | C | operator | POST: registry fields (§3.4) minus `status`/`registeredAt` | `DeploymentRegistryEntryDTO[]` / `…DTO` | 403, 422 `CAPABILITY_MISMATCH` |
| GET `/api/operator/reviews`; POST `/api/operator/reviews/:reviewId` | C | operator | `{outcome, justification, evidence: {stellarTxHash?, explorerCheckedAt?, notes}}` | `OperatorReviewDTO[]` / `…DTO` | 403 |
| GET `/api/integration/status` | C | user | — | `{paiflowConfigured: boolean, network: 'testnet' \| null}`, no secrets | — |
| SHOULD: `/api/deployments/match`, `/api/deals/**` | F / C | — | As in PRD §I.14 rows for deals, with the CL-05 split (`fund/check` read-only + `fund/resubmit`), plus `release/check` and `evidence/refresh` | Deal DTOs | Fixed via CR at the start of F-30/C-30 |

<a id="contract-persistence"></a>
### 3.6 Persistence interface: Francis → Carlos

**Rules for this interface:**

- **Module and boundary.** The module is `src/server/db/financial.ts` (`import "server-only"`). Every function wraps **one** Postgres function (RPC) or one read. The DB uses `now()`, row locks or `pg_advisory_xact_lock`, conditional updates, and appends ledger and audit rows **in the same transaction** (PRD §G.3, §I.11).
- **Execute grants.** RPCs are revoked from `public`/`anon`/`authenticated` and granted to `service_role` only (F-11 confirms the grant approach).
- **Result type:** `type DbResult<T> = { ok: true; value: T } | { ok: false; code: ErrorCode }`. Zero affected rows maps to a 409 code. Functions never throw for domain conflicts, and they never log XDR.
- **Scope type:** `type PayScope = { kind: 'plan'; planId: string } | { kind: 'deal'; dealId: string }`. The `deal` kind is SHOULD.

**Rules the DB enforces for Carlos (defence in depth):**

1. **Partial unique indexes.** There is one non-terminal `payment_attempts` row per plan and per deal, and `original_tx_hash` is unique. This covers INV-04.
2. **Column checks.** Stroop strings match `^[1-9][0-9]{0,38}$`, `network = 'testnet'`, and hashes are 64 lower-hex.
3. **Write-once evidence.** `prepared_xdr`, `original_tx_hash` and `signed_xdr` are write-once (trigger). Evidence rows cannot be deleted, and there is no `DELETE` grant. This covers INV-09.
4. **No client reads of financial rows.** RLS is on, and there are **no** policies for `anon`/`authenticated` on financial tables, so only server routes read them (PRD §K.11).
5. **The approval gate lives in SQL (REQ-BUD-02 AC4, PRD §K.4).** `beginPaymentAttempt` for a plan returns `PLAN_NOT_APPROVED` unless the plan is `approved` **for its current version hash**, every snapshotted approver approved that hash, the actor is the plan's signer, and the actor's active binding equals the signer address. The route therefore never reaches Paiflow.
6. **The DB derives expected values itself.** The payer, total, asset, deployment, envelope addresses, bps, order and expected shares come from the reserved deployment and the current plan version. Caller-supplied values are only cross-checked. A mismatch is stored as `mismatch`, never `verified` (INV-03).
7. **Plan moves need recorded status.** Only `record_status_check` (`transactions.get` on the original hash) moves the plan to `payment_confirmed`, or back to `approved` on a confirmed FAILED. A submit response alone never does (CL-09).
8. **All envelopes must verify.** `distribution_verified` is set only when **every** envelope of the paid version has a `verified` `envelope_payout` verification. Any `mismatch` sets the plan to `mismatch` (PRD §H.5, REQ-BUD-03 AC1).

```ts
// ---- Context reads (server-only rows; may include XDR) ----
getPaymentContext(scope: PayScope, actorUserId: string): Promise<DbResult<PaymentContext>>
//   plan: { scope, state, versionId, planSha256, deploymentId, signerAddress, totalStroops, asset,
//           envelopes: { position, label, bps, recipientAddress, expectedShareStroops }[], viewerBinding }
//   deal (SHOULD): { scope, state, deploymentId, conditionNodeId, buyerAddress, sellerAddress, amountStroops, asset, deadlineAt, viewerBinding }
getOpenAttempt(scope: PayScope): Promise<PaymentAttemptRow | null>           // includes preparedXdr/signedXdr
getAttempt(attemptId: string): Promise<PaymentAttemptRow | null>
listScopesNeedingReconciliation(limit: number): Promise<{ scope: PayScope; deploymentId: string }[]>

// ---- Payment attempt lifecycle (PRD §F.2) — shared ----
beginPaymentAttempt(i: { scope: PayScope; actorUserId }): Promise<DbResult<
  { outcome: 'created' | 'existing'; attempt: PaymentAttemptRow; context: PaymentContext }>>
//   plan: rule 5 above; created → attempt 'preparing', plan 'payment_pending'.
//   deal (SHOULD): state ready_to_fund, actor = client, binding = buyer, now() < deadline - margin.
recordPreparation(i: { attemptId; network: 'testnet'; networkPassphrase; preparedXdr; originalTxHash;
  historyRequestId: string | null; expiresAt: IsoUtc; feeStroops: string | null }): Promise<DbResult<PaymentAttemptRow>>  // preparing → prepared
failPreparation(i: { attemptId; code: string; requestId: string | null }): Promise<DbResult<void>>
//   only from 'preparing' (no XDR stored or released) → 'prepare_failed'; plan → approved (deal → ready_to_fund)
markSignatureRequested(attemptId: string): Promise<DbResult<void>>          // prepared → signing (idempotent)
persistSignedEnvelope(i: { attemptId; actorUserId; signedXdr; signedBodyHash: string; receivedAfterExpiry: boolean }):
  Promise<DbResult<PaymentAttemptRow>>   // requires signedBodyHash = original_tx_hash; from prepared|signing|expired_unsigned
recordEnvelopeRejection(i: { attemptId; actorUserId; signedXdr; reason: 'BODY_CHANGED' | 'FEE_BUMP' | 'WRONG_SIGNER' | 'UNPARSEABLE' }):
  Promise<DbResult<void>>                // kept as evidence; attempt state unchanged
recordSubmission(i: { attemptId; requestId: string | null; outcome:
  | { kind: 'response'; status: 'SUCCESS' | 'PENDING' | 'FAILED'; txHash: string; ledger: number | null; errorCode: string | null }
  | { kind: 'transport_error'; httpStatus: number | null; code: string } }): Promise<DbResult<PaymentAttemptRow>>
//   signed_persisted|submitted|pending|unknown|rejected → submitted (+ last submit outcome); never moves the plan/deal
recordStatusCheck(i: { attemptId; requestId: string | null; checksExhausted: boolean; lookup:
  | { kind: 'found'; status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNKNOWN' | 'REJECTED'; txHash: string; network: string; ledger: number | null }
  | { kind: 'not_found' } | { kind: 'transport_error'; httpStatus: number | null; code: string } }): Promise<DbResult<PaymentAttemptRow>>
//   SUCCESS (txHash = original, network testnet) → success; plan → payment_confirmed (deal → funded_unindexed)
//   FAILED → failed; plan → approved (deal → ready_to_fund); a new attempt needs deliberate user action.
//   PENDING/UNKNOWN/REJECTED/not_found/transport → pending|unknown|rejected (never unlocks a new prepare).
//   checksExhausted with no final status → operator_review (attempt + plan/deal) and opens an operator_reviews row.
markExpiredUnsigned(attemptId: string): Promise<DbResult<void>>
//   only if no signed envelope AND now() > expires_at → expired_unsigned; plan/deal → operator_review (PRD §F.2)

// ---- Evidence, events, verification (PRD §H, §G.6) ----
recordPaymentReceiptVerification(i: { attemptId; result: VerificationInput }): Promise<DbResult<void>>
//   H.1 + H.2 for the payment itself (RECEIVE from signer, amount = total). Deal (SHOULD): verified → funded_held.
recordEnvelopePayoutVerification(i: { planId; attemptId; envelopePosition: number; result: VerificationInput }): Promise<DbResult<void>>
//   rule 8: all envelopes verified → plan distribution_verified; any mismatch → plan mismatch (+ operator review)
upsertPaiflowEvents(deploymentId: string, events: PaiflowEventRecord[]): Promise<DbResult<{ inserted: number }>>
//   PaiflowEventRecord = { eventId; id; kind; topic: string|null; ledger: number; txHash: string; occurredAt: IsoUtc; data: Json|null }
//   dedupe on event_id; stores decoded, non-secret data only
getEventCursor(deploymentId: string, scope: 'all' | `tx:${string}`): Promise<string | null>
advanceEventCursor(deploymentId, scope, expected: string | null, next: string): Promise<boolean>  // false = concurrent writer
listStoredEvents(q: { deploymentId; txHash?: string; kinds?: string[] }): Promise<PaiflowEventRecord[]>
acquireReconcileLease(key: string, holder: string, ttlSeconds: number): Promise<boolean>
releaseReconcileLease(key: string, holder: string): Promise<void>
consumeReconcileBudget(scope: PayScope): Promise<{ allowed: boolean; retryAfterSeconds: number }>  // 40 / scope / hour

// VerificationInput = { state: VerificationState; stellarTxHash: string | null; expectedAddress: GAddress;
//   expectedAmountStroops: string; observedAmountStroops: string | null; asset: AssetRef; eventIds: string[];
//   checks: Record<'finality'|'originalHash'|'deployment'|'network'|'event'|'party'|'asset'|'amount'|'direction', 'pass'|'fail'|'pending'>;
//   note: string | null }

// ---- Registry and operator (REQ-DEP-01, PRD §D.1) ----
registerDeployment(i: Omit<DeploymentRegistryEntryDTO, 'status' | 'registeredAt'> & { operatorUserId;
  capabilitySnapshot: Json; status: 'available' | 'unusable' }): Promise<DbResult<DeploymentRegistryEntryDTO>>
//   budget_split: recipients distinct, same mode, bps > 0, total = 10000, order preserved
setDeploymentStatus(i: { operatorUserId; deploymentId; status: 'unusable' | 'retired'; reason }): Promise<DbResult<void>>
listDeployments(): Promise<DeploymentRegistryEntryDTO[]>
openOperatorReview(i: { scope; refId; reason }): Promise<DbResult<{ reviewId }>>
listOperatorReviews(): Promise<OperatorReviewDTO[]>
resolveOperatorReview(i: { reviewId; operatorUserId; outcome: 'payment_success_confirmed' | 'payment_failed_confirmed' |
  'not_broadcast_ledger_proven' | 'payout_confirmed' | 'refund_confirmed' | 'release_retry_authorised' | 'no_action';
  justification: string; evidence: Json }): Promise<DbResult<void>>

// ---- Wallet summary reads (REQ-WAL-01) ----
getWalletContext(userId: string): Promise<{ binding: { address; verifiedAt } | null;
  plans: WalletSummaryDTO['plans']; escrow: WalletSummaryDTO['escrow'];
  history: Omit<WalletSummaryDTO['history'][number], 'explorerUrl'>[]; verifiedTotals: WalletSummaryDTO['verifiedPayouts'] }>

// ---- SHOULD: protected-payment release (added by F-31; signatures frozen now) ----
recordDepositVerification(i: { attemptId; result: VerificationInput }): Promise<DbResult<void>>   // deal: funded_unindexed → funded_held
beginReleaseAttempt(i: { dealId; actorUserId }): Promise<DbResult<{ releaseAttemptId; approvalId; deploymentId;
  conditionNodeId; sellerAddress; amountStroops; requestedAt: IsoUtc }>>   // commits BEFORE Paiflow is called
recordReleaseOutcome(i: { releaseAttemptId; requestId: string | null; outcome:
  | { kind: 'returned'; txHash: string; ledger: number | null; nodeId: string }
  | { kind: 'refused'; httpStatus: number; code: string; reason: 'DEADLINE_PASSED' | 'NOTHING_TO_RELEASE' | 'RATE_LIMITED' | 'OTHER'; retryAfterSeconds: number | null }
  | { kind: 'uncertain'; httpStatus: number | null; code: string } }): Promise<DbResult<ReleaseAttemptRow>>  // never permits a 2nd call
authoriseReleaseRetry(i: { releaseAttemptId; operatorUserId; justification; evidence: Json }): Promise<DbResult<void>>  // once, operator only
recordPayoutVerification(i: { kind: 'release_payout' | 'refund_payout'; dealId; releaseAttemptId: string | null; result: VerificationInput }): Promise<DbResult<void>>
applyDeadlineTransitions(): Promise<DbResult<{ dealIds: string[] }>>
```

<a id="contract-controllers"></a>
### 3.7 Headless controller interface: Carlos → Shanti

The module is `src/client/controllers/index.ts` (Carlos). The types live in `src/contracts/controllers.ts` (Francis).

- **Shanti's side.** Shanti imports **only** these hooks and Francis's `src/client/api/business.ts`. She never imports `@stellar/freighter-api`, `@paiflow/sdk` or `src/server/**`.
- **Carlos's side.** The hooks never render UI. Buttons stay disabled while `busy` is true, which guards against double clicks; the server is still the real guard.

```ts
type SafeError = { code: ErrorCode | 'FREIGHTER_NOT_INSTALLED' | 'FREIGHTER_DENIED' | 'FREIGHTER_WRONG_NETWORK'
  | 'FREIGHTER_WRONG_ACCOUNT' | 'FREIGHTER_TIMEOUT' | 'SIGNATURE_DECLINED'; message: string; retryAfterMs?: number };

useFreighter(): { status: 'checking' | 'not_installed' | 'not_connected' | 'wrong_network' | 'connected';
  address: GAddress | null; connect(): Promise<void>; refresh(): Promise<void>; error: SafeError | null }

useWalletBinding(): { binding: SessionDTO['binding']; freighterMatchesBinding: boolean | null;
  phase: 'idle' | 'requesting_challenge' | 'awaiting_signature' | 'verifying' | 'bound' | 'error';
  bind(): Promise<void>;           // challenge (F route) → Freighter signMessage → bind (F route)
  error: SafeError | null }

usePayment(scope: { kind: 'plan'; orgId: string; planId: string } | { kind: 'deal'; dealId: string }): {
  phase: 'idle' | 'preparing' | 'review' | 'awaiting_signature' | 'submitting' | 'checking'
       | 'confirmed' | 'failed' | 'unresolved' | 'expired' | 'wallet_changed' | 'refused_not_approved' | 'error';
  review: Omit<PaymentReviewDTO, 'xdr' | 'networkPassphrase'> | null;  // what the signing modal shows
  attempt: PaymentAttemptViewDTO | null; busy: boolean; error: SafeError | null;
  start(): Promise<void>;          // POST pay/prepare (returns existing attempt if any; 403 PLAN_NOT_APPROVED → 'refused_not_approved')
  signAndSubmit(): Promise<void>;  // explicit consent click → Freighter signTransaction → POST pay/submit
  checkOriginal(): Promise<void>;  // read-only POST pay/check; bounded (≤6 lookups / 30 s, Retry-After)
  resubmitSameEnvelope(): Promise<void>; // separate explicit button + confirm dialog → POST pay/resubmit
  stopChecking(): void }

usePlanEvidence(orgId: string, planId: string, opts?: { auto?: boolean }): { plan: BudgetPlanDetailDTO | null;
  loading: boolean; refreshing: boolean; lastRefreshedAt: IsoUtc | null; error: SafeError | null;
  reload(): Promise<void>;          // GET …/plans/:p (F route) — pure read
  refreshEvidence(): Promise<void> } // POST …/evidence/refresh; ≥15 s apart; auto stops at distribution_verified/mismatch

useWalletSummary(): { data: WalletSummaryDTO | null; loading: boolean; error: SafeError | null; reload(): Promise<void> }

useOperatorConsole(): { deployments: DeploymentRegistryEntryDTO[]; reviews: OperatorReviewDTO[];
  registerDeployment(input): Promise<void>; resolveReview(id, input): Promise<void>; reload(): Promise<void>; error: SafeError | null }

// SHOULD (protected payment): useDealEvidence(dealId) and useRelease(dealId) —
//   requestRelease() makes a single POST and never calls it twice; checkEvidence() is read-only.

// Mode switch: getControllerMode(): 'live' | 'fixture'. Fixture mode only when NEXT_PUBLIC_CYFER_FIXTURES === '1'
// AND NODE_ENV !== 'production'; Shanti renders a persistent "FIXTURE DATA — not Testnet" banner when 'fixture'.
```

<a id="contract-visibility"></a>
### 3.8 Browser-visible vs server-only data

| Server-only, never sent to the browser or logged | Browser-visible to org members / participants / operator only | Never stored anywhere in CYFER |
|---|---|---|
| `PAIFLOW_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, reconcile trigger secret | Plan purpose, envelopes, bps, recipient G-addresses, plan hash, approvals, document hashes | Wallet secret keys, seed phrases |
| `signed_xdr` (never returned after submit), `history_request_id`, Paiflow `x-request-id` (operator console may show it) | Deployment UUID, network, asset | Event access code |
| `prepared_xdr` after the first prepare response (the only exception, CL-06: returned to the owning signer while `prepared`/`signing` and unexpired) | Stellar tx hashes, explorer links, verification states, event IDs | |
| Storage object keys, raw Paiflow error bodies, SQL errors, other users' emails, internal user IDs | Signed download URLs (≤ 5 min, attachment disposition) | |
| Challenge nonces of other users | The viewer's own challenge `message` | |

<a id="contract-fixtures"></a>
### 3.9 Fixtures, mocks and clarifications

**Fixtures (`src/contracts/fixtures/**`, Francis, delivered in F-01):**

- **MVP contents.** `planDetailFixture(state)` covers every `PlanState`, including partial verification ("2 of 3"), `mismatch` and `operator_review`. Also `splitDeploymentFixture`, `paymentReviewFixture`, `walletSummaryFixture(kind: 'ok' | 'unavailable' | 'empty')`, `orgDocumentsFixture`, `verifyFileFixture(match)`, `sessionFixture(roles)` and `errorFixture(code)`.
- **SHOULD contents.** `dealDetailFixture(state)` is added with F-30.
- **Markers.** Every fixture title or purpose starts with `[FIXTURE]`. Fixture UUIDs start with `00000000-0000-4000-8000-`. Fixture hashes are `000…0001`-style hex that cannot resolve on an explorer.
- **Mocks** are Carlos's `src/client/controllers/mock/**` (C-05), which implements §3.7 over these fixtures and simulates phases with timers.
- **Replacing mocks.** Mocks are replaced when Shanti's screens switch to live mode (S-19, gate G4).
- **Proof of replacement** is G4 evidence:
  1. `npm run build` passes with `NEXT_PUBLIC_CYFER_FIXTURES` unset.
  2. Carlos's bundle scan finds no `[FIXTURE]` marker and no credential markers (C-17).
  3. A screenshot of the plan page shows a real deployment UUID and a payment hash that opens on Stellar Expert (testnet).
  4. The fixture banner is absent.

**Clarifications to the PRD's proposed design.** These do not change any requirement; they are recorded here and transcribed to the PRD later.

| ID | Clarification | Why |
|---|---|---|
| CL-01 | (SHOULD) `rejected_deliverable` is a transition, not a stored deal state | PRD §F.1 says it "returns to funded_held" |
| CL-02 | New attempt states `preparing` and `prepare_failed` | A Postgres lock cannot span the external prepare call. Inserting `preparing` first makes the partial unique index the guard. `prepare_failed` is safe only because the XDR never reached the browser. |
| CL-03 | PRD §I.5 `failed_recorded` = `failed`; `reconciled` carries an operator `resolution` | Consistent naming |
| CL-04 | (SHOULD) Release attempt states (§3.2) | PRD §I.7 lists a `state` column without values |
| CL-05 | PRD's single `…/check` (check + resubmit) is split into a read-only `check` and an explicit-intent `resubmit`, for plans and deals | A check must never silently resubmit |
| CL-06 | Repeated `pay/prepare` returns the same unexpired XDR of the open attempt | REQ-ESC-01 AC4 |
| CL-07 | New table `paiflow_events` (decoded, non-secret, unique `event_id`) | Durable dedupe and the basis for wallet history and §H checks |
| CL-08 | New table `reconcile_leases` plus a per-scope poll budget | Prevents concurrent pollers; PRD §G.6 caps |
| CL-09 | Only a transaction-status lookup on the original hash moves the plan or deal on payment outcome; a submit response alone never does | Conservative reading of PRD §G.1 and §G.4 |
| CL-10 | New routes `GET /api/orgs`, `GET …/split-deployment`, `GET …/budget-plans` (list), `POST …/versions`, `POST …/pay/resubmit`, `POST …/evidence/refresh`, documents list/download, `POST /api/wallet/unbind`, `GET /api/operator/reviews`, `GET /api/integration/status`, and `auth/*` | Needed by the screens in PRD §J; not listed in PRD §I.14 |
| CL-11 | Exactly one `available` deployment may match a plan or deal (`AMBIGUOUS_DEPLOYMENT_MATCH` otherwise). Operators register rehearsal and live deployments **sequentially**. | REQ-DEP-01 AC4 forbids browser choice |
| CL-12 | Capabilities do not return recipient addresses or bps (llms.md §4), so the registry's Split recipients and bps (and, for SHOULD, seller, buyer and deadline) are **operator-attested** from Shanti's handoff (two-person check). They are confirmed only by verified payouts in rehearsal. | Honest limit of REQ-DEP-01 verification |
| CL-13 | `budget_plans` (plan identity, org, deployment reservation, state, current version) plus `budget_plan_versions` (canonical JSON, `plan_sha256`, total, signer). Envelopes and approvals key on the version. The reservation stays with the plan across purpose- or total-only edits; changed envelopes cannot match the deployment and are refused (D-12). | PRD §I.8 has a `version` column but no rule for versions sharing one reservation |
| CL-14 | The approver set is all members with role `owner` or `approver` at submission, snapshotted, and it must contain ≥ 1 non-owner. The demo proposal is owner + 2 approvers, which gives the "k of 3" progress shown in PRD §J. | REQ-BUD-02 AC3; team may change it (B-13) |
| CL-15 | The plan records an explicit `signerUserId`, and the signer's active binding at submission becomes `signer_address` in the canonical JSON. The Split deployment accepts deposits from anyone, so the signer restriction is an application control. | PRD §D.1 "Authorised signer" |

<a id="change-requests"></a>
### 3.10 Change-request log

| CR | Date/time | Requester | Change | Decision | Commit |
|---|---|---|---|---|---|
| CR-01 | 13:40 | Carlos | `getLatestAttempt(scope)` read added to `src/server/db/financial-core.ts` and `financial.ts` (read-only newest attempt for a plan) | **Accepted** (user-approved in chat; no SQL change) | `b3d4d12` |
| CR-02 | ~14:00 | Carlos | `getWalletContext` reads `get_wallet_context` as a plain result. My SQL returns the context object itself, not an `{ok,value}` envelope, so my wrapper turned every answer into `INTERNAL`; my mocked test had copied the same wrong assumption, and only Carlos's live smoke test found it | **Accepted: genuine bug fix in my wrapper.** Lesson: a mocked test cannot catch a contract the mock itself assumes; keep live checks | `d418552` |
| CR-03 | ~14:50 | Shanti (via Francis) | Additive: `GET /api/orgs/:orgId/members` (names, roles, wallet flag only), `GET /api/orgs/:orgId/plan-versions`, and fetchers for documents, verify-file, wallet challenge/bind/unbind in `src/client/api/business.ts` | **Accepted and built** (Mocked tests; sweep covers the new routes) | this commit |

---

## 4. Handoff register (canonical)

Each producer marks a handoff delivered in their own evidence log, and the consumer confirms it in theirs.

| ID | Producer → consumer | Deliverable | Needed by |
|---|---|---|---|
| HO-01 | Francis → Carlos, Shanti | `src/contracts/**` incl. fixtures and `split.ts`, plus `src/client/http.ts` merged (F-01) | C-03…C-16, S-10…S-23 |
| HO-02 | Carlos → Francis, Shanti | Toolchain decision (Node version), dependency set installed, `npm test`/`typecheck` scripts (C-01) | F-13, F-21, S tests |
| HO-03 | Carlos → Francis | Q-08 result: Freighter `signMessage` encoding and server verification recipe (C-02) | F-13 |
| HO-04 | Carlos → Francis | Recorded event payload shapes (Split payouts and RECEIVE; SHOULD release/refund), Q-06, Q-07 (C-02), so Francis can adjust verification columns | F-07, F-11 |
| HO-05 | Francis → Carlos | `src/server/db/financial.ts` compiled against §3.6, with tests on mocked RPC results (F-11) | C-06…C-16 |
| HO-06 | Carlos → Shanti | Mock controllers (C-05) | S-12…S-19 |
| HO-07 | Shanti → Carlos | Non-secret deployment handoff records: Split R1, R2, D1 (MVP); protected-payment E-R1, E-F1 (SHOULD) (S-02, S-03, S-30) | C-06, C-18, C-35 |
| HO-08 | Shanti → Carlos (secure, out of band) | Read and operate token delivered **directly** to the credential custodian (S-04) | C-03 live checks |
| HO-09 | Francis → all | Migrations applied to the agreed database (⚠ AUTH); demo accounts, organisation, memberships (owner + approvers) and operator flag provisioned (F-18, F-19) | G2, C-06, S-11 |
| HO-10 | Carlos → Shanti | Real controllers plus an integration example for each hook (C-15) | S-19, G4 |
| HO-11 | Francis → Carlos | Business routes live: orgs, budget plans, approvals, documents, verify-file (F-14…F-17) — **ready, checked 2026-10-25: F-14…F-17 ticked, all routes present, 121 business tests pass** | C-18 rehearsal |
| HO-12 | Shanti → Francis | Government pages and navigation removed; no page imports inherited API routes or `src/lib/types.ts` (S-10) — **received, checked 2026-10-25: `constants.ts` no longer imports `lib/types`; build and lint pass; `/` redirects to `/plans`** | F-20 |

**Dependency graph (acyclic).** Arrows point from prerequisite to dependent.

```
F-01 ─┬─> C-03,C-04,C-05 ─> S-12..S-18 (fixtures)
      ├─> F-05..F-11 ─> F-19(⚠) ─> F-18(⚠) ─> G2
      └─> S-10,S-11
C-01 ─> C-02 ─> F-13 ;  C-02 ─> F-07/F-11 (columns)
S-01 ─> S-02 ─> HO-07(R1) ─> S-03 ─> HO-07(R2,D1) ;  S-04 ─> C-03(live)
F-13 + C-02(a) ─> G2 ;  G2 ─> G3 ─> G4  (G3 needs F-12..F-17 and C-03..C-16)
F-11 ─> C-06..C-13 ─> C-15 ─> S-19 ─> G4
G2 + G3 + G4 + HO-11 ─> C-18 (G5, MVP) ─> G7 ;  G5 + G7 + S-24 ─> G8
G5 ─> SHOULD: F-30.., C-30.., S-30.. ─> G6 (never blocks G7 or G8)
```

---

## 5. Blockers and investigations (canonical)

| ID | Question (PRD ref) | Owner | Investigation task | Conservative interim behaviour | Unblocks |
|---|---|---|---|---|---|
| B-01 | Q-10: what is in the live Supabase schema? Code reads `approvals.budget_id` and `budget_data.status`, which migration 001 does not define (C-09). | Francis | F-02 (read-only) | New migrations create only new objects and never alter inherited tables, except the additive `transactions` columns after inventory. **The inherited `budget_data`/`approvals` tables are not reused** (PRD §I.8). | F-05…F-09, F-19 |
| B-02 | Which database do we migrate: the shared project or a dedicated new project? | Francis (team decision) | F-04 | Write migrations; apply nothing until ⚠ AUTH | F-19, G2 |
| B-03 | Q-08: Freighter `signMessage` encoding and server verification | Carlos confirms, Francis consumes | C-02 → F-13 | **Docs answer, checked in planning:** Freighter docs say `signMessage` returns a base64 Ed25519 signature following SEP-53. `@stellar/freighter-api@6.0.1` types allow `signedMessage: string` (current) or `Buffer` (older extension). `@stellar/stellar-sdk@17.2.1` exposes `Keypair.fromPublicKey(addr).verifyMessage(message, signatureBytes)`, which needs bytes, not a base64 string. **C-02 must still confirm this with a real Freighter signature.** Until then, no binding is accepted without verification, and binding on connection alone is never allowed. If it is unconfirmed at CP-2, binding and therefore payment are blocked (D-10), and the team escalates. | REQ-ACC-02, G2 |
| B-04 | Q-11 and Split payout evidence: the real RECEIVE and PAYOUT payloads | Carlos | C-02, then rehearsal R1 | **Docs answer, checked in planning:**<ul><li>Event items carry **no `nodeId`**.</li><li>Decoded `data`, taken from Paiflow source code (not a published contract):<ul><li>deposit: `RECEIVE`/`deposit` `{from, amount, asset}`</li><li>Pay: `PAYOUT`/`pay` `{recipient, asset, payment}`</li><li>(SHOULD) `PAYOUT`/`release` `{admin, branch, balance}`</li></ul></li><li>**The Split payout event topic and fields were not found in the sources checked.**</li></ul>**Interim:** each envelope verification stays `awaiting_events` until the R1 rehearsal records real Split payout events and C-11 is updated. A missing field never defaults to "pass", and missing events alone never mark a payout verified or the payment failed. | REQ-PAY-01, REQ-BUD-03, G5 |
| B-05 | (SHOULD) Release-early guarantees (D-07) | Carlos | C-02 | **Docs answer:**<ul><li>The SDK `releaseEarly({nodeId})` "returns once it is final".</li><li>There is no Idempotency-Key, no reconcile endpoint and no 409.</li><li>Errors are 422 (`deadline has passed`, `nothing to release`), 429 and 502. A 502 may carry the txHash in `details`.</li><li>"The SDK never … retries."</li></ul>**Still unverified:** whether a 429 proves nothing was processed. **Interim:** no automatic or user retry. 429, timeout, 502 and lost responses go to `release_uncertain`, then evidence checks. A second call needs an operator, via `authoriseReleaseRetry`, after positive evidence that funds are still held and no True-side payout exists. Absence of a payout event alone is never sufficient. The PRD's 429 retry clause is **not** implemented until verified. | REQ-REL-01 (SHOULD) |
| B-06 | Where does bounded reconciliation run (scheduler/runtime)? Envelope payout verification (and, for SHOULD, refund tracking) needs a server owner. | Carlos | C-12 | Server-side `evidence/refresh` triggered by members or the operator, plus a single server-side interval worker on the demo server process (lease-guarded). No browser polling loop makes financial decisions. | REQ-BUD-03, G5 |
| B-07 | Q-01/Q-02: who holds the Paiflow token, and which people and wallets play owner/signer, approvers, the three envelope recipients, deployer and operator (and, for SHOULD, payer and payee)? | Team; Shanti runs, Carlos is custodian | S-01, S-04 | Proposed:<ul><li>Carlos is the token custodian and operator account.</li><li>Shanti's Freighter holds the deployer key.</li><li>Owner/signer and approvers are separate Freighter accounts on the demo machine.</li><li>The three envelope recipients are distinct funded Testnet accounts and need no CYFER account.</li><li>All are Testnet-only.</li></ul> | S-02…S-04, F-18 |
| B-08 | Q-07: is there reliable held-balance evidence? This only matters for SHOULD protected payments. | Carlos | C-02 | **Docs answer:** SDK `deployment.balances.get()` returns per-node balances with a `freshness` status, and the docs say it is "not … evidence of payment success". **Interim:** MVP Split verification never relies on balances. (SHOULD) "Held" means verified deposit + no payout event + before the deadline. | REQ-WAL-01 |
| B-09 | Q-09: deadlines for the SHOULD protected-payment deployments | Shanti + Carlos | S-30 | Recommended in Shanti §2.8. It does not affect the MVP. | S-30 |
| B-10 | Runtime compatibility | Carlos | C-01 | **The facts:**<ul><li>This planning machine runs Node v24.12.0.</li><li>`@paiflow/sdk@0.2.0` declares `engines.node ">=22.22.2 <23"` and is **ESM-only**.</li><li>`@stellar/stellar-sdk@17.2.1` requires Node `>=22.12.0`.</li><li>The official starter uses Next 15.5; this repo uses **Next 16.1.6**, and **SDK compatibility with Next 16 is unverified**.</li></ul>**Interim:** use Node 22.22.2 (nvm-windows) on every machine that runs the server. Keep the SDK in Node-runtime, `server-only` modules. If the Next 16 build fails with the SDK, Carlos reports it and the team decides (CR); no silent framework downgrade. | C-03 |
| B-11 | Session mechanism (cookie via `@supabase/ssr` vs bearer token) | Francis | F-03 | No `localStorage` token for SME routes (PRD §K.12) | F-12 |
| B-12 | DB test environment (local Supabase/Docker vs dedicated dev project) | Francis | F-04 | RPC behaviour is tested on a dedicated non-shared DB after ⚠ AUTH. Before that, only mocked-RPC route tests run, and they are labelled Mocked. | F-21, G7 |
| B-13 | Approver set and signer for the demo org (CL-14, CL-15) | Team; Francis records | F-18 | Owner + 2 approvers; the owner is the authorised signer | F-18, S-01 |

---

## 6. Gates

**Gate index.** Each gate has one canonical definition, and the other documents link to it.

| Gate | Tier | Owner | Canonical definition |
|---|---|---|---|
| G1 Shared contracts agreed | MVP | Francis | [below](#g1) |
| G2 Schema/auth foundation + Split flow configuration ready | MVP | Francis | [below](#g2) |
| G3 Backend routes + headless wallet/payment verified with fixtures | MVP | Carlos | [CARLOS G3](CARLOS-PHASETASK.md#g3) |
| G4 UI connected to real routes and controllers | MVP | Shanti | [SHANTI G4](SHANTI-PHASETASK.md#g4) |
| G5 E2E budget plan → approvals → Split payment → verified distribution + recovery (T-01…T-07) | MVP | Carlos | [CARLOS G5](CARLOS-PHASETASK.md#g5) |
| G6 Protected payment incl. separate refund rehearsal (T-08…T-11) | **SHOULD** | Carlos | [CARLOS G6](CARLOS-PHASETASK.md#g6) |
| G7 Security, privacy, credential isolation, negative paths | MVP | Francis | [below](#g7) |
| G8 Three-minute demo rehearsed with evidence | Pitch | Shanti | [SHANTI G8](SHANTI-PHASETASK.md#g8) |

The MVP is complete only when G1–G5 and G7 pass **and** the Testnet rehearsal T-01…T-07 has recorded hashes (PRD §L.1). G6 is SHOULD and never blocks MVP acceptance or G8. G8 is the pitch-readiness gate.

<a id="g1"></a>
### G1 — Shared contracts agreed and boundaries established

- **Owner:** Francis.
- **Prerequisites:** F-01 merged (HO-01); this document's §2–§5 read by Carlos and Shanti.
- **Pass criteria:**
  - [ ] Carlos confirms §3.6 covers every persistence need of C-06…C-13, or files CRs.
  - [ ] Shanti confirms §3.4 and §3.7 cover every MVP screen in her §3.
  - [ ] Ownership matrix §2 is accepted, with no file claimed by two people.
  - [ ] `npm run lint` and `npm run build` pass on `main` with `src/contracts/**` present.
- **Evidence:** a time-stamped note in §11 naming the three confirmations, the merged commit hash, and any CR IDs.

<a id="g2"></a>
### G2 — Schema/auth foundation and Split flow configuration ready

- **Owner:** Francis (accountable). Shanti supplies the flow evidence; Carlos supplies the capability-check evidence.
- **Prerequisites:** G1; F-02, F-03, F-05…F-13, F-18, F-19; C-02(a) (a real Freighter signature, from Carlos's scratch page or Shanti's S-12 screen); S-02 Split deployment R1 CONFIRMED; S-04 token delivered.
- **Pass criteria:**
  - [ ] Migrations are applied to the **agreed** database under ⚠ AUTH (F-19). Every new table has RLS on, and financial tables have no client policies.
  - [ ] Demo accounts, the organisation and its memberships are provisioned (owner, approvers, operator). Sign-in returns a session with org roles, and unauthenticated calls to an SME route return 401.
  - [ ] Wallet binding works end to end with a real Freighter signature. A replayed challenge is refused (REQ-ACC-02 AC1). Under B-03, if it is not done, G2 fails.
  - [ ] Shanti's handoff record exists for Split R1: deployment UUID, ordered recipients with bps, CONFIRMED.
  - [ ] Carlos's capability check passes for R1: network testnet, deposit trigger, native input, execute not `unsupported`. The registry row's recipients and bps equal the handoff.
- **Evidence:** migration file names plus who authorised them and when, table/policy listing output, a 401 test output, the binding row ID and address (public), a link to Shanti's handoff entry, and Carlos's capability-check output (no token).

<a id="g7"></a>
### G7 — Security, privacy, credential isolation and negative paths

- **Owner:** Francis. Carlos runs C-17 and supplies its output.
- **Prerequisites:** G5.
- **Pass criteria (each with test output or a recorded manual check):**
  - [ ] 401 on every plan, approval, document, payment and wallet route without a session (REQ-ACC-01 AC1).
  - [x] 403 for non-members of the org. (proven: DB tests, guard tests, route tests; see §11) A non-approver cannot approve, and a non-signer cannot prepare.
  - [ ] **REQ-BUD-02 AC4:** `pay/prepare` before full approval returns 403 `PLAN_NOT_APPROVED`, and Paiflow is **not** called (mock call count = 0, plus the T-03 log).
  - [x] RLS: an `anon` or `authenticated` client cannot select (proven in DB incl. `storage.objects` for `sme-files`, §11) `payment_attempts`, `wallet_challenges`, `operator_reviews` or SME file objects.
  - [x] A private SME document is not fetchable without membership (proven live, §11) or a ≤ 5 min signed URL (REQ-DOC-01 AC1).
  - [x] Concurrency: concurrent last approvals publish once (proven with real parallel sessions on `cyfai-sme-dev`, all three cases, §11) (REQ-BUD-02 AC1), concurrent prepares create one attempt, and concurrent reservations have one winner (mocked RPC concurrency where B-12 is unresolved; real DB if authorised).
  - [x] Carlos's bundle scan: no `pfd_`/`pfk_` token (`npm run check:bundle` passes on the current build, run by Francis, §11), `PAIFLOW_API_TOKEN`, service-role key or SDK runtime in `.next/static`, and no `[FIXTURE]` marker in the production build.
  - [ ] Logs reviewed during rehearsal contain no token, XDR or signed envelope.
  - [ ] Copy review (with Shanti S-23):
    - no "tampered"
    - no "Distributed", "Paid" or "Refunded" before verification
    - the CYFER audit hash is never labelled as a Stellar hash
    - no "immutable" or "anchored on Stellar" claims
    - PHP figures are labelled as planning figures
  - [ ] Inherited gaps (PRD §K.12) are unreachable from the SME build (F-20).
- **Evidence:** test runner output, bundle scan output, log excerpt check (statement only, no secrets), screenshot set, and the reviewer's name.

---

## 7. Francis's phases and tasks

The phases below are listed in order:

| Phase | Tasks | Purpose |
|---|---|---|
| A | F-00…F-04 | Foundation and investigations |
| B | F-05…F-11 | Schema and RPCs |
| C | F-12…F-18 | Routes and provisioning |
| D | F-19…F-22 | Apply, harden and close |
| E | F-30…F-34 | SHOULD and STRETCH; after G5 only |

### Phase A — Contracts and investigations (start immediately) [MVP]

- [ ] **F-00 Run checkpoint CP-1 and record G1**
  - **Requirements:** all MVP requirements.
  - **Purpose and deliverable:** agreement on §2–§5. The deliverable is the G1 evidence entry.
  - **Owns:** this document.
  - **Depends on:** F-01. Carlos and Shanti attend.
  - **Acceptance:** [G1](#g1) criteria.
  - **Verification and evidence:** a note in §11.

- [x] **F-01 Publish shared contracts in code (HO-01)** — evidence in §11
  - **Requirements:** REQ-ACC-01/02, DEP-01, ESC-01/02, DOC-01, DLV-02, PAY-01, REC-01, WAL-01, BUD-01/02/03.
  - **Purpose and deliverable:** `src/contracts/{states,errors,dto,api,controllers,state-copy,limits,canonical,split}.ts`, `src/contracts/fixtures/**`, and `src/client/http.ts`, mirroring §3.
    - `canonical.ts` provides `canonicalJson()` (sorted keys, no whitespace, stroop strings) for the plan hash and the deployment graph snapshot hash.
    - `split.ts` provides `splitShares()`.
  - **Owns:** those paths.
  - **Depends on:** nothing.
  - **Acceptance:**
    - Types compile.
    - Fixtures cover every `PlanState` and the three wallet-summary kinds, and carry the `[FIXTURE]` marker.
    - `canonicalJson` gives identical output for permuted key order.
    - `splitShares("10000000", 50/30/20)` = `5000000/3000000/2000000`, and an odd total puts the remainder on the last envelope.
    - There is no runtime import of server code.
  - **Verification:** `npm run lint` and `npm run build`. Unit tests are added after C-01 provides Vitest.
  - **Evidence:** commit hash and command output.

- [ ] **F-02 Read-only live schema inventory (Q-10, B-01)**
  - **Requirements:** PRD §I.13.1, C-09.
  - **Purpose and deliverable:** a list of the live tables, columns, constraints, policies, functions and buckets, using only read-only `information_schema`/`pg_catalog` queries (SQL editor, or the Supabase MCP once it reconnects).
  - **Owns:** findings in §11.
  - **Acceptance:**
    - The drift around `approvals.budget_id`, `budget_data.status` and `documents` bucket publicity is answered yes or no.
    - No write was executed.
  - **Verification:** saved query text plus a result summary (no personal data).
  - **Blocking question:** which project is "shared"? (B-02)

- [x] **F-03 Decide and specify session handling (B-11)** — approved by Francis in chat (see §11)
  - **Requirements:** REQ-ACC-01.
  - **Purpose and deliverable:** a decision note on how sessions work. The preferred option is HTTP-only cookie sessions via `@supabase/ssr` (request it per §1.3). The alternative is a bearer token held only in memory. Never `localStorage`.
  - **Depends on:** C-01 for the package. Check the Supabase docs for `@supabase/ssr` with Next.js 16 route handlers.
  - **Acceptance:**
    - The note covers sign-in, sign-out, how a route reads the session, and the expiry behaviour (401).
    - The §3.5 contract is unchanged.
  - **Evidence:** the decision note.

- [ ] **F-04 Decide the DB test environment (B-02, B-12)**
  - **Requirements:** PRD §M.1, Claude.md DB rule.
  - **Purpose and deliverable:** choose between (a) local Supabase via the CLI and Docker (check Docker; the `supabase` CLI is a dev dependency request to Carlos) and (b) a dedicated, disposable Supabase project. Record which project the demo uses.
  - **Acceptance:**
    - The team approves the decision in chat (⚠ AUTH).
    - Nothing is applied before approval.
  - **Evidence:** the decision note, with the authoriser's name and time.

### Phase B — Schema and RPCs (write files; do not apply until F-19) [MVP]

- [x] **F-05 Migration 002: identity, organisations, wallet bindings** — proven in DB (replay, other address/user, unique address, lock), §11
  - **Requirements:** REQ-ACC-01, REQ-ACC-02 AC1–AC4, PRD §I.1, §I.2, §D.2.
  - **Deliverable:** `002_sme_identity_orgs_wallets.sql`, containing:
    - `profiles(user_id → auth.users, display_name, is_operator default false)`, with the flag settable only by migration or service role
    - `organisations`
    - `org_memberships(org_id, user_id, role in ('owner','approver','member'))`, indexed on `user_id`
    - `wallet_challenges(…, address, nonce unique, purpose 'wallet-binding', origin, expires_at, consumed_at)`
    - `wallet_bindings(…)` with the address regex check, a `network = 'testnet'` check, and a unique partial index on `address WHERE revoked_at IS NULL`
    - RLS: a user may select their own profile, binding and memberships, and fellow members of their orgs, via `(select auth.uid())`. There are no client writes.
    - RPCs: `issue_wallet_challenge`, `consume_challenge_and_bind` (atomic consume) and `unbind_wallet`. Unbind refuses while the address is the signer of a non-terminal plan or a party to a non-terminal deal.
  - **Depends on:** F-02.
  - **Acceptance:** the replay, wrong-signer and unique-address rules are enforceable in SQL; the signature itself is checked in F-13.
  - **Verification:** SQL review; tests in F-21.

- [x] **F-06 Migration 003: deployment registry and reservations** — proven in DB (one active reservation under concurrency, Split recipient validation), §11
  - **Requirements:** REQ-DEP-01 AC1–AC4, D-04, D-12.
  - **Deliverable:** `003_sme_deployments.sql`, containing:
    - `paiflow_deployments` (PRD §I.4 plus `capability_snapshot jsonb` and `split_recipients jsonb` in deployment order), with no credential columns
    - `deployment_reservations(…, budget_plan_id | deal_id, active)`, with a unique partial index `(deployment_id) WHERE active` and a check that exactly one scope column is set
  - **Depends on:** F-05.
  - **Acceptance:**
    - There is one active reservation per deployment.
    - A Split registry row requires recipients that are distinct, `bps > 0` and total 10,000.
    - (SHOULD) A past-deadline escrow deployment cannot be reserved.

- [ ] **F-07 Migration 005: financial evidence tables (for Carlos)**
  - **Requirements:** REQ-ESC-01/02, PAY-01, REC-01, BUD-03, INV-01…INV-10.
  - **Deliverable:** `005_sme_financial_evidence.sql`, containing:
    - `payment_attempts` (PRD §I.5 plus `budget_plan_id`, `plan_version_id`, `fee_stroops`, `resolution`, `signature_requested_at`, `submit_outcome jsonb`), with exactly one of `budget_plan_id`/`deal_id`, a unique `original_tx_hash`, and partial unique indexes `(budget_plan_id)` and `(deal_id) WHERE state NOT IN ('success','failed','prepare_failed','reconciled')`
    - write-once triggers on the XDR and hash columns
    - `payment_envelope_rejections`
    - `payout_verifications` (PRD §I.9 plus `kind`, `envelope_position`, `checks jsonb`)
    - `paiflow_events` (`event_id` primary key)
    - `event_cursors`, `reconcile_leases`, `operator_reviews`
    - RLS on, with **no** client policies, and no `DELETE` grants.
  - **Depends on:** F-06, F-08b (plan tables), HO-04 (adjust event and verification columns once C-02 reports; keep `data jsonb` generic until then).
  - **Acceptance:** every rule in the §3.6 "DB enforces" list is expressible.
  - **Blocking question:** B-04.

- [x] **F-08 Migrations 004 and 006: budget plans and SME documents** — proven in DB (private bucket, no object policies, key format, approver PK), §11
  - **Requirements:** REQ-BUD-01/02, REQ-DOC-01, PRD §I.6, §I.8, §K.6, CL-13…CL-15.
  - **Deliverable (F-08b) `004_sme_budget_plans.sql`:**
    - `budget_plans(id, org_id, deployment_id, state, current_version_id, created_by, …)`
    - `budget_plan_versions(id, plan_id, version, canonical_json, plan_sha256, total_stroops, signer_user_id, signer_address, superseded_at, unique(plan_id, version))`
    - `budget_envelopes(version_id, position, label, bps > 0, recipient_address, planning_php_centavos bigint null)`
    - `budget_approvals(version_id, approver_user_id, decision default 'pending', plan_sha256, reason, responded_at, primary key(version_id, approver_user_id))`
    - `plan_state_transitions`
    - RLS: members select their org's rows; no client writes.
  - **Deliverable (F-08c) `006_sme_documents.sql`:**
    - `org_documents` (PRD §I.6)
    - storage bucket `sme-files` with `public = false` and **no** client object policies (the server uses the service role and signed URLs; keys look like `orgs/{orgId}/docs/{uuid}`)
  - **Depends on:** F-05, F-06.
  - **Acceptance:**
    - The bucket is private.
    - Storage keys contain no user filename.
    - The approver primary key prevents duplicate approver rows.

- [x] **F-09 Migration 007: ledger and audit concurrency fix** — proven in DB (advisory lock, no fork under concurrency, hashes recomputable), §11
  - **Requirements:** PRD §I.10, §I.11, §K.9, D-09.
  - **Deliverable:** `007_sme_ledger_audit.sql`, containing:
    - additive `transactions` columns `deal_id`, `org_id`, `plan_id`, `actor_user_id`, `hash_input jsonb`, with new `action_type` values (PRD §I.10 plus `plan_create`, `plan_approve`, `plan_reject`, `doc_record`, `pay_prepare`, `pay_submit`, `envelope_payout_verified`) added after F-02 confirms the existing check constraint
    - function `append_evidence(p_action, p_scope, p_actor, p_payload jsonb)`, which takes `pg_advisory_xact_lock` on the chain tail, computes the block hash and audit hash **in SQL** over stored inputs (including the exact timestamp used), and inserts both
  - **Owns:** also `src/server/db/evidence.ts`, which replaces the role of [src/lib/blockchain.ts](../src/lib/blockchain.ts) and [src/lib/audit.ts](../src/lib/audit.ts) for SME flows. The anon-key replica broadcast is excluded.
  - **Acceptance:**
    - Concurrent appends never fork the chain.
    - Each audit hash is recomputable from the stored `hash_input`.
    - The UI label is "CYFER audit hash".
  - **Blocking question:** B-01.

- [x] **F-10 Business RPCs** — proven in DB incl. concurrent last approvals and ledger-failure rollback, §11
  - **Requirements:** REQ-BUD-01 AC1/AC2, REQ-BUD-02 AC1–AC3, REQ-BUD-03 AC2, REQ-DOC-01, REQ-DEP-01.
  - **Deliverable:** these SQL functions, each locking the plan or org row and appending evidence in the same transaction:
    - `create_budget_plan(p_actor, p_org, p_input jsonb)`:
      - the owner only
      - exactly one `available` `budget_split` deployment (CL-11)
      - envelopes **equal** the registry recipients by position, address and bps
      - bps total 10,000 and no duplicate addresses
      - the signer is a member with an active binding (CL-15)
      - snapshots the approver set (CL-14: non-empty, ≥ 1 non-owner)
      - hashes the canonical JSON, reserves the deployment, and sets the state → `pending_approval`
    - `create_plan_version`: refused once any payment attempt exists (`EDIT_AFTER_PAYMENT`); supersedes the old version and voids its approvals; changed envelopes are refused (`ENVELOPES_MISMATCH_DEPLOYMENT`, D-12)
    - `decide_budget_plan(p_actor, p_plan, p_version, p_sha256, p_decision, p_reason)`:
      - a conditional `UPDATE … WHERE decision = 'pending'`
      - a stale version → `STALE_VERSION`
      - a rejection → `rejected`
      - the last approval → `approved`, published exactly once via a conditional state transition
    - `record_org_document(p_actor, p_org, p_kind, p_sha256, p_size, p_media_type, p_storage_key, p_filename)`
  - **Depends on:** F-06, F-08, F-09.
  - **Acceptance:** each REQ-BUD AC above and REQ-DOC-01 AC2 (a ledger failure leaves no row) is covered by a test (F-21).

- [x] **F-11 Financial persistence RPCs and `src/server/db/financial.ts` (HO-05)** — DB-tested on `cyfai-sme-dev`, see §11
  - **Requirements:** REQ-ESC-01/02 (mechanics), PAY-01, REC-01, BUD-02 AC4, BUD-03, DEP-01, INV-01…INV-10.
  - **Deliverable:** the SQL functions and TypeScript wrappers in §3.6 (MVP part), exactly as named; grants to `service_role` only; mocked-result unit tests.
  - **Owns:** the functions and `src/server/db/financial.ts`, `src/server/db/client.ts`.
  - **Depends on:** F-07, F-08, F-09, HO-04.
  - **Acceptance (each with a test or SQL proof):**
    - `beginPaymentAttempt` returns `PLAN_NOT_APPROVED` while any approver is pending, `NOT_SIGNER` for others, and `existing` on the second call.
    - `persistSignedEnvelope` refuses a different body hash.
    - `recordSubmission` never moves the plan.
    - `recordStatusCheck` (`not_found`) never unlocks a new prepare.
    - `markExpiredUnsigned` refuses when a signed envelope exists.
    - `recordEnvelopePayoutVerification` sets `distribution_verified` only after all envelopes verify, and a wrong recipient or amount → `mismatch`.
  - **Blocking question:** B-04.

### Phase C — Routes and provisioning [MVP]

- [x] **F-12 Server HTTP and auth foundation** — evidence in §11
  - **Requirements:** REQ-ACC-01 AC1–AC3, PRD §K.3, §K.5.
  - **Deliverable:**
    - `src/server/http/{json,multipart,origin,respond,rate-limit}.ts`, ported from starter `lib/http.ts` and `lib/payment-rate-limit.ts` with per-action buckets (prepare, submit, check, upload, verify, challenge, approve)
    - `src/server/auth/{session,guards}.ts`: `requireUser`, `requireOrgRole(orgId, roles)`, `requireOperator`, and (SHOULD) `requireParticipant`. Inherited `admin`/`super_admin` roles grant nothing.
  - **Depends on:** F-03, F-05.
  - **Handoff:** Carlos's routes import these helpers.
  - **Acceptance:**
    - 401 without a session.
    - 403 for non-members.
    - Oversize bodies return 413 before parsing.
    - A cross-origin mutation returns 403.

- [x] **F-13 Wallet challenge, bind and unbind routes, with server verification** — real Freighter signature verified, §11
  - **Requirements:** REQ-ACC-02 AC1–AC4, D-10.
  - **Deliverable:**
    - `src/server/wallet-binding/{message,verify}.ts`. The challenge message includes app origin, user ID, address, nonce, purpose `wallet-binding` and expiry.
    - Verification uses the recipe from HO-03 only.
    - Routes `wallet/challenge`, `wallet/bind` and `wallet/unbind`.
  - **Depends on:** F-05, F-12, **HO-03 (B-03)**, and `@stellar/stellar-sdk` via C-01.
  - **Acceptance:**
    - A replay is rejected.
    - Another address's signature is rejected.
    - A signature over a different message is rejected.
    - An address already bound → 409.
    - Unbind while the address is a plan's signer → 409.
  - **Verification so far:** `tests/server/wallet-binding.test.ts` uses generated in-test keypairs and covers the server challenge/signature flow and route refusals. `npm test` (328 tests), `npm run typecheck`, and `npm run build` pass. `npm run lint` passes with six existing warnings in prototype/test-supabase files.
  - **Evidence:** test output; binding row ID and public address.
  - **Implementation status:** server message/signature helpers, RPC wrappers, and all three routes are implemented. Mocked route tests cover challenge contents, verified binding, replay refusal, a different address's signature, changed message, duplicate address (409), locked unbind (409), authentication, and same-origin checks.
  - **Still required:** HO-03/C-02(a) real Freighter signature confirmation and manual Testnet T-01, including the binding row ID and public address. F-13 remains unchecked until that integration evidence exists.

- [x] **F-14 Organisation and budget-plan routes (HO-11)** — evidence in §11; plan detail (F-17) is built but not yet ticked
  - **Requirements:** REQ-BUD-01, REQ-BUD-02, REQ-DEP-01 AC4.
  - **Deliverable:** `orgs`, `orgs/[orgId]/split-deployment`, `orgs/[orgId]/budget-plans` (GET/POST), `…/[planId]` (GET, assembled in F-17), `…/versions`, `…/approve`, `…/reject` per §3.5; plus the `src/client/api/business.ts` fetchers.
  - **Depends on:** F-10, F-12.
  - **Acceptance:**
    - An identical plan gives an identical hash.
    - bps ≠ 10,000, a duplicate address or a deployment mismatch → 422.
    - Approving a superseded version → 409.
    - The deployment is never taken from browser input.

- [x] **F-15 SME documents, download and tamper check**
  - **Requirements:** REQ-DOC-01 AC1/AC2, REQ-DLV-02 AC1–AC4, PRD §K.6.
  - **Deliverable:**
    - `src/server/files/**`: a streaming size limit before full buffering where possible; a type allowlist (PDF, PNG, JPEG, ZIP, TXT, DOCX) checked against both the declared type and magic bytes where feasible; server-side SHA-256; a private upload; the row written only after the storage write succeeds; orphan cleanup noted.
    - Routes `orgs/[orgId]/documents` (GET/POST), `…/documents/[docId]/download` (signed URL ≤ 300 s, `Content-Disposition: attachment`) and `orgs/[orgId]/verify-file`, which compares only with the selected document or plan version of the same org.
  - **Depends on:** F-08, F-10, F-12.
  - **Acceptance:**
    - A 1-byte change → `match:false`.
    - Response copy never says "tampered".
    - Another org's record → 403.
    - 413/415 limits hold.
    - The rate limit applies.
  - **Implementation:** uploads are streamed through the shared multipart size cap, validated against the MIME allowlist and file signatures, hashed server-side, then written to the private bucket before the transactional record RPC. RPC failure triggers best-effort orphan deletion. Downloads use attachment signed URLs capped at 300 seconds. Verification scopes the selected document or plan version to the requested org; cross-org IDs return 403.
  - **Verification:** mocked route-level acceptance covers upload order, unsupported and oversized files, signed attachment URL expiry, identical/one-byte-changed hashes, and cross-org 403. `npm test` (300 tests) and `npm run typecheck` passed. No writes were made to the hosted Supabase project; live-storage acceptance remains unexercised.

- [x] **F-16 Plan approval route hardening** — evidence in §11
  - **Requirements:** REQ-BUD-02 AC1–AC3.
  - **Deliverable:** the `approve`/`reject` routes from F-14, hardened with tests.
  - **Depends on:** F-14.
  - **Acceptance:**
    - Concurrent last approvals → one publish.
    - A duplicate approval returns the existing decision.
    - A non-approver gets 403.
    - The owner-only approver set is refused at plan creation.

- [x] **F-17 Plan detail aggregation**
  - **Requirements:** PRD §J "Budget plan", §F.5, §H.5, §K.11, REQ-WAL-01 AC2.
  - **Deliverable:** `GET …/budget-plans/:planId` assembles `BudgetPlanDetailDTO`:
    - `dashboardState`
    - envelopes with `expectedShareStroops` from `splitShares`
    - each envelope's payout verification
    - approval progress
    - `allowedActions` per §3.2
    - the timeline from transitions, the audit log and the ledger
    - **no XDR, request IDs or storage keys**
  - **Depends on:** F-10, F-11.
  - **Acceptance:**
    - A snapshot test per plan state shows only §3.8 browser-visible fields.
    - "k of n payouts verified" is computed from verifications only.
    - Audit hashes appear only as `auditHash`.
  - **Verification:** deterministic DTO snapshots cover all 10 plan states. Existing mocked assertions verify payout counts come only from verified payouts, audit hashes are exposed only through `auditHash`, and XDR/request IDs are not returned. Focused `plan.test.ts`: 29 passed; `npm run typecheck` passed; `npm run lint` passed with six pre-existing warnings in prototype/test-supabase files.

- [x] **F-18 Demo accounts, organisation and operator flag ⚠ AUTH** — evidence in §11
  - **Requirements:** REQ-ACC-01, PRD §D.1, B-07, B-13.
  - **Deliverable:**
    - Supabase Auth accounts for the owner/signer, two approvers and the operator (the operator is not an org member).
    - One organisation, with memberships owner + 2 approvers.
    - `profiles.is_operator = true` for the operator only.
    - Passwords are generated and shared only through the team's password manager, never in docs or chat.
  - **Depends on:** F-19.
  - **Acceptance:**
    - The accounts and memberships exist.
    - Only one operator.
    - No inherited `users` admin role grants SME access.
  - **Evidence:** the role mapping (no passwords), the authoriser, and the time.

### Phase D — Apply, harden, close [MVP]

- [x] **F-19 Apply migrations to the agreed database ⚠ AUTH (HO-09)** — applied to `cyfai-sme-dev`, evidence in §11
  - **Requirements:** PRD §I.13.
  - **Deliverable:** MVP migrations 002–008 applied in order to the database chosen in F-04, with a post-apply listing of tables, policies, functions and the bucket.
  - **Depends on:** F-04…F-11, explicit authorisation.
  - **Acceptance:**
    - No inherited table is dropped.
    - RLS is on for every new table.
    - The `sme-files` bucket is private.
  - **Evidence:** the listing output and the authorisation record.

- [x] **F-20 Retire inherited API and libraries from the SME build** — evidence in §11
  - **Requirements:** PRD §K.12, §L.6.
  - **Deliverable:**
    - Delete (or return 410 from) the inherited `src/app/api/{documents,verify,budget,consensus,summarize,blockchain,audit,auth/login,auth/logout,auth}` routes.
    - Delete [src/lib/nodes.ts](../src/lib/nodes.ts), [src/lib/ai.ts](../src/lib/ai.ts), [test-supabase.ts](../test-supabase.ts), [test-phase0.ts](../test-phase0.ts) and [scripts/seed-demo-data.js](../scripts/seed-demo-data.js).
    - Retire [src/lib/types.ts](../src/lib/types.ts) and [src/lib/supabase.ts](../src/lib/supabase.ts) once nothing imports them.
    - Ask Carlos to drop `@anthropic-ai/sdk` and the `ANTHROPIC_API_KEY`/`NODE2_*`/`NODE3_*` example entries.
  - **Depends on:** **HO-12 from Shanti (S-10)**, F-14…F-17.
  - **Acceptance:**
    - `npm run build` and `npm run lint` pass.
    - Grep shows no import of retired modules.
    - None of the §K.12 gap routes is reachable.

- [ ] **F-21 Tests for owned systems**
  - **Requirements:** every MVP Francis-owned row of the PRD §M.2 table.
  - **Deliverable:** `tests/server/business/**` (routes with a mocked persistence layer) and `tests/db/**` (RPC tests on the B-12 database, if authorised), covering:
    - REQ-ACC-01/02
    - REQ-DEP-01
    - REQ-BUD-01/02 (including AC4 in the DB gate)
    - REQ-DOC-01
    - REQ-DLV-02
    - the §3.6 enforced rules
  - **Depends on:** C-01 (HO-02).
  - **Acceptance:** each check passes, and also fails when its guard is removed (spot checks for the key guards).
  - **Evidence:** test output labelled **Mocked** or **DB (env name)**.

- [ ] **F-22 Run G7 and update README and Claude.md**
  - **Requirements:** PRD §K, §M.
  - **Deliverable:**
    - [G7](#g7) evidence.
    - README and Claude.md updated with the real commands and status, keeping their honesty language.
  - **Depends on:** G5, C-17.
  - **Acceptance:** G7 passes.

### Phase E — SHOULD and STRETCH (after G5 only; never blocks an MVP gate)

- [ ] **F-30 [SHOULD] Protected-payment contracts and schema**
  - **Requirements:** REQ-DEAL-01/02, DLV-01, APR-01, REL-01, REF-01.
  - **Deliverable:**
    - A CR that fixes the deal DTOs and endpoints (§3.5 SHOULD row).
    - `dealDetailFixture(state)`.
    - Migration `010_should_protected_payment.sql`: deals, terms versions, acceptances, `deliverable_versions` (stored in `sme-files` under `deals/…`), `deal_approvals` (`unique(deal_id, deliverable_version_id, approver_user_id)`), `release_attempts` (`deal_id unique`, CL-04 states, retry-authorisation columns), `deal_state_transitions`.
  - **Depends on:** G5.
  - **Acceptance:** PRD §I.3, §I.6, §I.7 are covered; RLS is scoped to participants.

- [ ] **F-31 [SHOULD] Deal RPCs and release persistence**
  - **Requirements:** REQ-DEAL-01/02, APR-01 AC1–AC4, REL-01 AC1/AC4, REF-01, DEP-01 AC2/AC3.
  - **Deliverable:**
    - `create_deal` (exact match on parties, deadline and asset, CL-11), `create_terms_version`, `accept_terms`, `record_deliverable_version`, `decide_deliverable`.
    - The SHOULD §3.6 functions `beginReleaseAttempt`, `recordReleaseOutcome`, `authoriseReleaseRetry`, `recordDepositVerification`, `recordPayoutVerification` and `applyDeadlineTransitions`, plus the deal branch of `beginPaymentAttempt`.
  - **Depends on:** F-30.
  - **Acceptance:** the PRD ACs above, each with a test. `beginReleaseAttempt` commits before returning, and nothing permits a second release call.

- [ ] **F-32 [SHOULD] Deal routes**
  - **Requirements:** REQ-DEAL, DLV-01/02, APR-01.
  - **Deliverable:** `deployments/match`, `deals/**` business routes and `GET /api/deals/:id` with `allowedActions`.
  - **Depends on:** F-31.
  - **Acceptance:** ACs per the PRD, tested; no XDR in responses.

- [ ] **F-33 [SHOULD] Public receipts data**
  - **Requirements:** REQ-RCPT-01, PRD §I.12, §K.8.
  - **Deliverable:** `public_receipts` (the owner opts in for a plan, both parties for a deal) and an allow-listed response schema test.
  - **Depends on:** G5.

- [ ] **F-34 [STRETCH] Template, online-selling (mocked courier) and Pay persistence**
  - **Requirements:** REQ-TPL-01, REQ-SELL-01, REQ-MOV-01.
  - **Deliverable:** separate deployments per template; mock courier state that can never call release; Pay movements refused when the recipient is not the registered one.
  - **Depends on:** G6.

---

## 8. Honest limits (preserve in all copy and the pitch)

- **Recipients and shares are fixed when a flow is deployed.** A new payee or a changed envelope means a new flow and a fresh approval (PRD §B.7.1, D-12).
- **A verified payout proves distribution, not that the money was well spent.** A file hash proves byte equality only, not quality, authorship or truthful delivery.
- **CYFER hashes are not Stellar.** Audit hashes and CYFER ledger hashes are not Stellar transaction hashes, and the ledger is an application hash chain in a database the team controls.
- **Testnet only, Stellar only.** No real money, no mainnet, no fiat conversion, no legal-readiness claims, and no bridging to other blockchains.
- **SHOULD (protected payment).** Payer nonresponse refunds the payer even if the payee delivered. The server/token holder and the deploying wallet are trusted release authorities.

## 9. What Francis can start immediately vs what must wait

- **Now:** F-01, F-02, F-03 (the decision), F-04 (the decision), and drafting F-05…F-10.
- **Waits:**
  - F-11 columns wait on HO-04.
  - F-13 waits on HO-03 and C-01.
  - F-19 and F-18 wait on ⚠ AUTH.
  - F-20 waits on HO-12.
  - F-21 waits on HO-02.
  - F-22 waits on G5.
  - F-30+ wait on G5.

## 10. Plan-level notes

- This plan was written from repository state and documentation only. Nothing was built, installed, migrated or transacted.
- The Supabase MCP server failed to connect during planning, so the live schema remains unknown (B-01).
- Revision on 2026-10-25, about 12:10 PHT: the plan was re-tiered to PRD v2.1.0. Budget Split became the MVP and the protected payment became SHOULD; the gate, rehearsal and requirement IDs were updated to match.

<a id="evidence-log"></a>
## 11. Evidence log (Francis)

| Time (PHT) | Task/Gate | Evidence (no secrets) | Level (Mocked / DB / Testnet / Human) |
|---|---|---|---|
| ~12:45 | F-01 (not yet ticked) | `src/contracts/{states,errors,limits,split,canonical,dto,api,controllers,state-copy}.ts`, `src/contracts/fixtures/index.ts`, `src/client/http.ts` written. Isolated `tsc --noEmit` (strict, ES2017) over those files: 0 errors. Scratch `tsx` script: `splitShares("10000000", 50/30/20)` = 5000000/3000000/2000000; odd total `10000001` puts the remainder on the last envelope; `canonicalJson` identical for permuted keys; fixtures cover all 10 `PlanState`s, "2 of 3" partial verification, 3 wallet kinds, all carry `[FIXTURE]`. **Not run:** `npm run lint` / `npm run build` (no `node_modules`; needs `npm ci`), so G1 criterion 4 is still open. No commit made (not a git repo here). | Mocked |
| ~12:50 | F-02 (not ticked) | Repo-side inventory plus read-only SQL to run: [FRANCIS-NOTES-F02-F04.md](FRANCIS-NOTES-F02-F04.md). Live schema **unread**: Supabase MCP failed to connect and no service-role key was used. `approvals.budget_id`, `budget_data.status` and `documents` bucket publicity are still **unknown**. No write executed. | Human |
| ~12:50 | F-03, F-04 (not ticked) | Proposed decisions in the same notes file: cookie sessions via `@supabase/ssr` 0.12.5 (checked against its docs through Context7), and a dedicated new Supabase project for test and demo. **Needs team approval in chat; nothing authorised or applied.** | Human |
| (time to confirm) | F-03 ticked | Francis approved cookie sessions via `@supabase/ssr` in chat. Decision note: [FRANCIS-NOTES-F02-F04.md](FRANCIS-NOTES-F02-F04.md) (sign-in, sign-out, `getUser()` reads, 401 on expiry, §3.5 unchanged). Package is now pinned at `@supabase/ssr@0.12.7`; see the 13:05 PHT dependency evidence row. | Human |
| (time to confirm) | F-04 (not ticked yet) | Francis authorised **a new dedicated Supabase project** for testing and demo (⚠ AUTH: decision only; nothing applied; the old shared project is not to be touched). Still open: who creates the project, and Carlos and Shanti confirming at CP-1. Tick F-04 after that. | Human |
| (time to confirm) | F-04 provisioning note | Francis created the dedicated project `cyfai-sme-dev` (ref `ycptnrpuljnuomxqrsqn`); `.env.local` filled locally (format and role checks passed, no values recorded). Read-only `GET /auth/v1/settings` with the anon key: `disable_signup: true`, `mailer_autoconfirm: true` (Confirm email off), anonymous sign-ins off, phone off. Leaked-password protection is Pro-only, so not enabled. Password minimum length (12 requested) not visible through that endpoint, so unverified. Nothing applied to the database. | Human |
| (time to confirm) | F-01 ticked | After `npm ci`: `npx tsc --noEmit` clean for the whole project; `npx eslint src/contracts src/client src/server/db tests/server/business` clean; `npm run build` passes; `npx vitest run tests/server/business`: 17 tests pass (`tests/server/business/contracts.test.ts`: splitShares 50/30/20, odd-total remainder on last, sums always equal total; canonicalJson permutation-stable; fixtures cover all plan states and carry `[FIXTURE]`). Contracts are on `main`. G1 criteria 1-3 (Carlos/Shanti confirmations, ownership matrix) still need CP-1. | Mocked |
| (time to confirm) | F-11 (not ticked) | Drafted, **not applied**: `supabase/migrations/009_sme_financial_functions.sql` (all MVP §3.6 RPCs, service_role only, plan-then-attempt lock order, approval gate in `begin_payment_attempt`) and `src/server/db/{client,financial-core,financial}.ts`. `tests/server/business/financial-core.test.ts`: 9 mocked-RPC tests pass (result mapping, no throw, unknown code -> INTERNAL, no XDR in logs, fail-closed lease/cursor/budget). **Not proven:** every acceptance item that is a SQL guard (PLAN_NOT_APPROVED while an approver is pending, NOT_SIGNER, `existing` on the second call, different body hash refused, submit never moves the plan, `not_found` never unlocks, expired-unsigned refused with a signed envelope, all-envelopes rule, mismatch). Those need the dedicated database after F-19 and the HO-04 payload shapes. Also added `pay_confirmed` / `pay_failed` audit action types. | Mocked |
| (time to confirm) | F-19 ticked ⚠ AUTH | **Authorised by Francis in chat** ("yes apply the migrations"). Applied to the NEW dedicated project `cyfai-sme-dev` (ref `ycptnrpuljnuomxqrsqn`) only; the old shared project was not touched. Method: `supabase/apply/run-migrations.mjs` over the session pooler (credential read from local `.env.local`, never printed), each file in its own transaction, refused to run on a non-empty schema. Order: `001` (inherited tables, because the project was empty), `apply/00_lockdown_inherited_tables.sql` (RLS on, no client grants), `002`-`009`: all `ok`, no errors. Read-only check (`supabase/apply/verify.mjs`): 27 public tables, **0 without RLS**; anon has no table grants; authenticated has SELECT only on 10 SME read tables (budget_*, org_*, profiles, wallet_bindings, plan_state_transitions); **no policies on any financial table**; all 46 functions executable by `service_role`; bucket `sme-files` `public=false`, 10 MiB; new `blockchain`/`transactions` columns present; audit CHECK includes `pay_confirmed`. Note: anon/authenticated can still EXECUTE 4 harmless helpers (`forbid_delete`, `payment_attempts_write_once` trigger functions, `split_recipients_valid` pure check, Supabase's own `rls_auto_enable`); none touch data. No inherited table dropped. **Not yet done:** F-18 accounts, and the SQL behaviour tests for F-11/F-21 (applied is not tested). | DB (cyfai-sme-dev) |
| 13:05 | Dependency handoff exception | At the user's explicit request, Francis installed exact `@supabase/ssr@0.12.7` as a runtime dependency and updated both npm manifests. This is a one-time exception to Carlos's manifest ownership; future package changes remain with Carlos. The current installed `@supabase/supabase-js@2.118.0` satisfies the package peer range. npm reported the existing Paiflow SDK engine mismatch on local Node v24.12.0 (`>=22.22.2 <23` expected) and surfaced 13 audit advisories; no audit fix was run. | Human |
| (time to confirm) | F-11 ticked | `node tests/db/business-financial.db.mjs <dir-with-pg>`: **19/19 pass** against the real SQL on `cyfai-sme-dev`, each test in a transaction that is rolled back (0 leftover plans/orgs). Covers every F-11 acceptance bullet: `PLAN_NOT_APPROVED` while any approver is pending (no attempt row created), `NOT_SIGNER`, `NOT_MEMBER`, `existing` on the second `begin`, different body hash refused (`ENVELOPE_CHANGED`) and a stored signed envelope never replaced, XDR/hash write-once and no delete (trigger), `recordSubmission` never moves the plan, `not_found` does not unlock a new prepare, `markExpiredUnsigned` refused with a signed envelope, `distribution_verified` only after all 3 envelopes verify, wrong amount/recipient -> `mismatch`, verification before tx final -> `awaiting_tx_final`. Also covered: create-plan refusals (role, bps, duplicate, deployment mismatch, tampered hash, owner-only approvers), AMBIGUOUS/NO_SPLIT deployment (CL-11), approvals (once, duplicate, stale, reject), new version voids approvals and `EDIT_AFTER_PAYMENT`, wallet challenge replay/other address/already bound/`BINDING_LOCKED`, document recording, block and audit hashes recomputable from stored inputs with no chain fork, anon/authenticated denied on financial tables and RPCs. **Not covered:** true concurrency (committed parallel sessions; evidence tables refuse deletes, so it would leave permanent rows), spot checks that each test fails with its guard removed, the Split payout event payload (HO-04), `registerDeployment` recipient validation, and the F-12+ routes. F-05..F-10 stay unticked until those are covered. Scripts use an unverified TLS connection (`rejectUnauthorized:false`) because the Supabase CA is not in Node's trust store: dev-only, replace with the Supabase CA before anything else uses them. | DB (cyfai-sme-dev) |
| (time to confirm) | F-12 ticked | `src/server/http/{respond,json,origin,multipart,rate-limit}.ts`, `src/server/auth/{session,guards}.ts`, plus `auth/sign-in`, `auth/sign-out`, `auth/me` routes. Cookie sessions via `@supabase/ssr` (server verifies with `getUser()`). `tsc`, eslint, `npm run build` clean; `npx vitest run`: 194 pass (22 new: `http.test.ts`, `guards.test.ts`, Mocked). **Live smoke** (`next start` on port 3111 against `cyfai-sme-dev`, bad credentials only, server stopped afterwards): `GET /api/auth/me` without a session -> 401; cross-origin sign-in -> 403; wrong content type -> 415; wrong credentials -> 401 with a generic message; 100 KB body -> 413; 9th failed sign-in for one email -> 429. Guards: 401 without a session on every guard, 403 NOT_MEMBER / FORBIDDEN / OPERATOR_REQUIRED, operator is a profile flag, inherited admin roles grant nothing. **Not yet shown:** a successful sign-in and `me` with org roles (needs the F-18 accounts), cookie refresh behaviour, and the guards against real memberships. | Mocked + Manual (local server, real project) |
| (time to confirm) | F-18 ticked ⚠ AUTH | **Authorised by Francis in chat** ("go do it yourself", including generating the passwords). Provisioned on `cyfai-sme-dev` by `supabase/apply/provision-demo-accounts.mjs`. **Role mapping (no passwords):** `owner@cyfer-demo.test` = org owner and authorised signer; `approver1@cyfer-demo.test`, `approver2@cyfer-demo.test` = org approvers; `operator@cyfer-demo.test` = `profiles.is_operator` only, not an org member; org "Demo SME". Passwords were generated randomly (24 chars) and written only to the git-ignored local `.env.local` as `DEMO_*_PASSWORD`; never printed, never in chat or docs. Check: exactly 1 operator, operator not a member, memberships = owner + 2 approvers, no inherited `users` admin role used. **Found and fixed on the way:** the server role had no table privileges because the project does not auto-expose new tables, so added and applied `010_service_role_grants.sql` (select everywhere, insert/update only on profiles, organisations, org_memberships); the database tests now also run as `service_role` (23/23 pass, includes teammate-added cases). **Also fixed:** session cookies were not HttpOnly (library default); `setAll` now forces HttpOnly + SameSite=Lax (+ Secure in production): re-checked, the cookie is HttpOnly. **G2 evidence (real `next start`, real project):** owner sign-in -> 200 with `orgs:[{role:owner,name:Demo SME}]`; `/api/auth/me` with the cookie -> 200 same; operator -> `isOperator:true, orgs:[]`; approver1 -> role `approver`; after sign-out `/me` -> 401; unauthenticated `/me` -> 401. Server stopped afterwards. Still open for G2: wallet binding with a real Freighter signature (F-13, waits on HO-03), Split R1 handoff (Shanti), Carlos's capability check. | DB + Manual (local server, real project) |
| (time to confirm) | F-14 ticked; F-17 built, not ticked at that time | Routes: `GET /api/orgs`, `GET …/split-deployment` (owner), `GET/POST …/budget-plans`, `GET …/budget-plans/:planId`, `POST …/versions`, `POST …/approve`, `POST …/reject`; `src/server/db/business{,-core}.ts`; `src/server/business/{plan-input,plan-detail,service,decision}.ts`; `src/client/api/business.ts`. Deployment is derived from the registry (never browser input); the canonical plan text/hash is built server-side and re-hashed by SQL. `tsc`, eslint, `npm run build` clean; `npx vitest run`: 213 pass (19 new in `plan.test.ts`, Mocked: validation, identical plan -> identical hash and any change -> new hash, allowed actions per §3.2, detail assembler vs an in-memory DB fake incl. no XDR/request IDs in the DTO, CYFER audit hash only in `auditHash`). SQL guards behind it (create refusals, STALE_VERSION, EDIT_AFTER_PAYMENT, ambiguity) are in the 23 DB tests. **Live smoke** (real server, real project, demo accounts, read/refusal paths only so no ledger writes): no session 401; owner `/orgs` lists Demo SME; split-deployment with none registered -> 409 `NO_SPLIT_DEPLOYMENT`; approver on owner-only route 403; operator on member list 403 `NOT_MEMBER`; unknown plan 404; malformed id 404; invalid body 422 with per-field messages; valid body with no deployment 409; cross-origin 403; approve with missing fields 422. Server stopped. **Not shown:** the happy path over HTTP (create -> approve -> detail) needs a registered Split deployment (Shanti R1 / Carlos operator route). The later F-17 per-plan-state snapshots are recorded below. | Mocked + Manual (local server, real project) |
| (time to confirm) | F-16 ticked | `node tests/db/approval-concurrency.db.mjs <dir-with-pg>` (DB, `cyfai-sme-dev`, real parallel sessions, committed fixture then removed in `finally`): the three last approvals plus a duplicate of the owner's fired at once on 4 separate connections -> all ok (no deadlock), plan ends `approved`, exactly **one** `approved` transition, exactly one audit row with `fullyApproved`, 3 approvals recorded, the duplicate returned `existing` and wrote no audit row, ledger chain did not fork. Cleanup verified: 0 plans, 0 blocks, 0 audit rows, 0 deployments, 0 attempts left; only the provisioned Demo SME org and 4 demo users remain. Other F-16 bullets are covered by the 23 DB tests (non-approver `FORBIDDEN`, owner-only approver set refused at creation `APPROVER_SET_INVALID`, `STALE_VERSION`) and by `decision-route.test.ts` (Mocked: version and hash forwarded as shown, 422 on missing fields, 409 STALE_VERSION and 403 mapping, plain member and cross-origin refused before the database, per-user rate limit with Retry-After, reject needs a reason). Full suite 307 pass; `tsc` clean. Not covered: concurrent `begin_payment_attempt` (a committed test would leave permanent rows because payment_attempts refuses deletes), and the same concurrency over HTTP. The test uses an unverified TLS connection like the other DB scripts. | DB (cyfai-sme-dev) + Mocked |
| (time to confirm) | F-17 ticked | `tests/server/business/plan.test.ts` now snapshots the browser-visible `BudgetPlanDetailDTO` for each of the 10 plan states using an in-memory database and fixed clock. The related assertions cover verified-payout counts, audit hash field naming, and omission of XDR/request IDs. Focused plan tests: 29 passed; TypeScript check passed; ESLint passed with six existing warnings. | Mocked |
| (time to confirm) | F-15 review fixes (F-15 not ticked) | Review of the F-15 files found two bugs in `verify-file`, both fixed: (1) `recordedAt` was the time of the check, now the record's own `created_at` (document or plan version); (2) the candidate file went through the upload type/signature gate, so a file damaged after recording (bad header, wrong type) got 415 instead of `match:false`; now only size-capped and hashed. New `tests/server/business/verify-file.test.ts` (4 tests, Mocked): they **fail 3 of 4 on the old code and pass on the fix** (guard-removal check done). Lint is clean (unused import and two `any` types removed). Full suite 321 pass, `tsc` clean, `npm run build` passes. Still open for F-15: no live upload -> verify over HTTP yet (would write one document record to the ledger), DOCX check is loose (any ZIP containing the text `word/document.xml`). | Mocked |
| (time to confirm) | F-15 ticked | **Live** (`next start`, real `cyfai-sme-dev` incl. private Storage, demo accounts; server stopped afterwards). Refusals: no session 401; `.exe` 415; text declared as PDF 415 ("contents do not match"); operator (not a member) 403 `NOT_MEMBER`; cross-origin 403. **Upload** of a 41-byte text file as owner -> 201, server `sha256` equals the local `sha256sum`, `ledgerBlockId` 635, uploader "Demo Owner". List returns the DTO fields only (no storage key). **Download**: signed URL -> HTTP 200, `Content-Disposition: attachment`, downloaded bytes identical, `expiresAt` 300 s ahead; public/unsigned bucket access -> 400 (bucket private). **Tamper check**: identical file -> `match:true`; one character changed -> `match:false`; a binary of a different type -> `match:false` (not 415); `recordedAt` equals the document's saved time on all three; no response contains "tamper"; operator 403. Not shown live: 413 and the other-org 403 (covered by Mocked tests only) and `plan_version` targets. **Leftovers in the demo project:** one test document record + its ledger block and one object in `sme-files`; harmless but visible in the audit trail. Block IDs are not contiguous (rolled-back tests consume sequence values). DOCX signature check is still loose (any ZIP containing the text `word/document.xml`). | Manual (local server, real project, Storage) |
| (time to confirm) | F-21 / G7 gap closers | **New tests, all on `cyfai-sme-dev` or Mocked:** (1) `route-auth-sweep.test.ts`: every route file must be classified; the 19 guarded routes (orgs, operator, wallet, auth/me) answer 401 `UNAUTHENTICATED` with no session; with a session present 14 of its tests fail, so it is not vacuous. (2) `concurrency-guards.db.mjs` (A): 5 parallel `begin_payment_attempt` -> exactly one `created`, all others `existing` with the same attempt id, one row, plan `payment_pending`. (3) same file (B): two orgs racing for one deployment -> exactly one winner, one active reservation. **This found a real defect:** the loser got `VALIDATION`; fixed by `011_fix_create_plan_race.sql` (applied; loser now gets `NO_SPLIT_DEPLOYMENT`). (4) storage: anon and authenticated see 0 objects in `sme-files`. (5) a ledger failure injected in a rolled-back transaction leaves no document row and no audit row. (6) bad stroop strings, mainnet, upper-case or short hash, bad status, bad address and a duplicate `original_tx_hash` are all rejected by the table checks. (7) guard-removal spot checks: without the write-once trigger the XDR changes, without the partial unique index two open attempts exist, and the approval gate still refuses when the plan state is forced to `approved` with an approver pending. After the changes: DB suite 27/27, approval concurrency passes, full Vitest 439 pass, `tsc` and eslint clean, `check:bundle` passes. Concurrency fixtures are committed then removed; the one delete-blocking trigger on `payment_attempts` was disabled inside the cleanup transaction only and verified enabled again (`tgenabled = O`); leftovers 0 plans, 0 attempts, 0 deployments. **Still open for G7:** 401 on `integration/status` (Carlos) and the inherited routes (F-20), logs review and copy review (rehearsal and Shanti), AC4 T-03 log, and wrong-signature binding (F-13 live). F-21 stays unticked until F-13's signature tests exist. | DB (cyfai-sme-dev) + Mocked |
| (time to confirm) | F-13 live round trip (F-13 stays unticked) | Reviewed the wallet routes (`challenge`, `bind`, `unbind`, `src/server/wallet-binding/*`): the message is rebuilt server-side from the stored challenge, the signature is verified BEFORE the challenge is consumed (a bad signature does not burn it), and SQL enforces expiry, single use, user and address match. **Live** (real server + `cyfai-sme-dev`, throwaway `Keypair`s, secrets never printed; NOT a Freighter signature): signature by a different key 400 `SIGNATURE_INVALID`; signature over changed text 400; `signerAddress` != `address` 400; garbage signature 400; another user using this challenge 400 `CHALLENGE_INVALID`; correct signature 200 and `/auth/me` shows the binding; replay 400 `CHALLENGE_INVALID`; another user binding the same address 409 `ADDRESS_ALREADY_BOUND`; no session 401; bad address 422; unbind 200 and `/auth/me` binding null. **Still required:** a real Freighter `signMessage` signature (C-02(a), T-01) with the binding row; `BINDING_LOCKED` over HTTP is covered in DB tests only. | Mocked + Manual (test keypairs) |
| (time to confirm) | F-05, F-06, F-08, F-09, F-10 ticked | Ticked on the evidence already recorded in the rows above: 27 rolled-back DB tests, `approval-concurrency` and `concurrency-guards` on real parallel sessions, live checks of documents and storage. **F-07 stays unticked:** its columns are provisional until HO-04 (the real Split payout payload). **F-02 and F-04:** F-02's question (what is in the *shared* project) was never answered and is now moot because the demo uses an empty dedicated project; record it as superseded, do not tick it. F-04 needs Carlos and Shanti to confirm at CP-1. | DB (cyfai-sme-dev) |
| (time to confirm) | G1 progress (not yet passed) | Carlos confirmed in his log (§7) that §3.6 covers C-06..C-13 with CR-01 and CR-02 above (accepted). Criterion 4 holds: `tsc`, eslint (0 errors), `npm run build` and 443 tests pass on `main` after Carlos's neutral-wording refactor of README, `Claude.md` and some `src/` files (done with the user's approval; I re-checked `main` afterwards). **Still missing for G1:** Shanti's confirmation of §3.4 and §3.7 and acceptance of the ownership matrix. | Human + Mocked |
| (time to confirm) | F-19/G2 progress: Paiflow deployment | Read-only checks with the Paiflow token (never printed): token pattern valid (`pfk_`); it sees ONE deployment `f0876746-ce2b-44cc-8e94-cb3bb00a807f` ("Cyfai Flow", testnet). Capabilities: trigger `deposit`, input native, `execute` supported, a `split-ivhkzh` node, so it passes the capability check. Its recorded events show one real 1 XLM payment (tx `c78516f3eb47…`, status SUCCESS, ledger 5377166) with the Split recipients in order 5000/3000/2000 bps. Horizon effects for that tx confirm `account_credited` 0.5 / 0.3 / 0.2 XLM to the three recipients. **Registered** through the operator route as an `available` budget_split with those recipients (taken from the on-chain payout event, not attested from memory), by the demo operator. **Finding for HO-04:** the Split `PAYOUT/payout` event lists recipients and bps but every `amount` is `"0"`, so event amounts cannot prove a per-envelope payout; amounts must come from Horizon effects (`account_credited`). | DB + Testnet (read-only reads; one registry row) |
| ~14:55-15:35 | F-13 ticked; first live end-to-end run (T-01..T-05 evidence for Carlos's log) | **Real Freighter signature (HO-03 / C-02a closed):** Customer wallet `GD33V7MFQOGJVJCP7S2OFUUJ5G3MWZNEUGQ23M3KN3FB3OO5WZSB3KA6` (Testnet) signed the challenge via Carlos's spike page; `signedMessage` is a base64 string (88 chars, 64-byte Ed25519); the server's SEP-53 verification accepted it and bound it to the demo owner at 2026-10-25T06:56:25Z (binding is the signer address in the plan). **Plan:** created and approved through the real API: 3 approvers, plan hash `34838433ef2b…`, shares 5000000/3000000/2000000. **Payment (⚠ AUTH, initiated by Francis in the browser, 1 XLM from the Customer wallet after the amounts, recipients and fee were stated in chat; no separate typed "I authorise" was recorded):** tx `46bf63cdfc88275a156aa13ba8cc9913db9c646d7f6b2bf2b4ddbefeea8c848b`, ledger 5377596, Paiflow status SUCCESS, Horizon successful=true with `account_debited` 1.0000000 and `account_credited` 0.5000000 / 0.3000000 / 0.2000000 XLM to the Operations, Payroll and Supplies addresses; fee charged 19,252 stroops. Our DB: attempt `success`, signed envelope stored before submit, hash equals the chain tx, plan `payment_confirmed` then `distribution_verified`, payment receipt `verified`, three `envelope_payout` rows `verified` with observed 5000000/3000000/2000000 taken from Horizon credits (Carlos's HO-04 fix `06f9712`); audit trail has plan_approve x3, pay_prepare, pay_submit, pay_confirmed. **Deployment:** `f0876746-ce2b-44cc-8e94-cb3bb00a807f` registered as available budget_split (recipients from the earlier on-chain payout event). **Not done / still open:** a second payment (only one deployment, now reserved by this plan), T-03 refusal over live HTTP (covered by mocked tests and the DB gate), recovery T-06/T-07, logs review. | Testnet + DB |
| ~15:45 | F-20 ticked | After Shanti's S-10 push (old pages gone) I deleted the inherited routes `audit`, `auth` (root), `auth/login`, `auth/logout`, `blockchain` (+`nodes`, `validate`), `budget`, `consensus` (+approve, reject), `documents` (+`[id]`), `summarize`, `verify`; the libraries `lib/{ai,audit,auth,blockchain,nodes,supabase,types}.ts` and `utils/constants.ts`; `test-supabase.ts` and `scripts/seed-demo-data.js` (`test-phase0.ts` was already gone). Kept: the new `auth/{sign-in,sign-out,me}`, `orgs/**`, `wallet/**`, `operator/**`, `integration/status`, `lib/hash.ts`. Grep finds no import of any removed module; `tsc` (ignoring the stale `.next` cache of the running dev server), eslint and 508 tests pass; the route sweep now has an empty known-gaps list and a test that the retired routes stay deleted. Live on the running app: every retired path now answers 404, `/api/auth/me` 401, `/sign-in` and `/plans` 200. **Not done by me:** `@anthropic-ai/sdk` and the `ANTHROPIC_API_KEY`/`NODE2_*`/`NODE3_*` example entries (Carlos owns `package.json` and `.env.local.example`); `npm run build` was not re-run because the dev server is using `.next` (it passed before the deletion). | Mocked + Manual (local server) |
| ~16:00 | Final checks on `main` (F-22 docs part, G7 input; F-22 stays unticked) | Fresh clone of `main` at `186b586`, `npm ci`, **`npm run build` passes on Node 22.22.2** and `npm run check:bundle` passes (no credential markers, no Paiflow SDK runtime, no fixture markers in the browser bundle). (A first attempt failed only because the scratch path exceeded the Windows path limit; rerun from a short path.) On the working tree: `tsc` and eslint clean, 508 tests pass, live app answers (401 without a session, 200 on `/sign-in` and `/plans`). README status and AI disclosure and `Claude.md` commands updated to match reality: one recorded Testnet run, no claim of a finished rehearsal, the removed summariser disclosed, Node 22 noted. **Why F-22 is not ticked:** G7 still has open items (logs reviewed during rehearsal, copy review with Shanti, T-03 over live HTTP). **Carlos's ERP CRs:** his CR-03..CR-07 (`list_money_movements`, `suppliers`, summary route, plan documents, purchase orders) are beyond the MVP; numbering collides with my CR-03 (directory routes), so I log his as CR-ERP-03..07 and defer all of them until after the demo. | Mocked + Manual |
| ~13:10 | F-05…F-10 (not ticked) | Drafts, **not applied and not executed**: `supabase/migrations/002`…`008` (identity/wallets, deployments, plans, evidence tables, documents + private bucket, ledger/`append_evidence`, business RPCs). Syntax unchecked: no local Postgres, and Docker is not running. F-07 columns are provisional until HO-04. F-11 (financial RPCs) not started. | Mocked |
| 13:14 | F-21 (partial) | Expanded `tests/db/business-financial.db.mjs`; **22/22 pass** on `cyfai-sme-dev`. Added `register_deployment` operator gate and Split-recipient validation cases (bps total, duplicate, malformed address, order, zero share), valid recipient-order preservation, a guard-sensitivity probe that drops the recipient CHECK only inside a savepoint and confirms invalid registration then rolls back, and a two-session advisory-lock wait probe for `append_evidence`. The runner reports 0 leftover plans/orgs. This is a rollback-safe lock-serialization probe, **not** a committed parallel-write test. Remaining F-21 work: route tests, guard-removal spot checks for other key rules, and true committed-session concurrency coverage on a disposable DB. | DB (cyfai-sme-dev) |
