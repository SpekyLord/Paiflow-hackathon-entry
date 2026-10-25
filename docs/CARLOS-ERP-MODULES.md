# CARLOS — ERP Module Tasks (beyond the MVP phase tasks)

| Field | Value |
|---|---|
| Owner | Carlos (Developer 2) |
| Source of truth | [docs/PRD.MD](PRD.MD) v2.1.0, [Claude.md](../Claude.md). Contracts, ownership and the CR process stay canonical in [FRANCIS-PHASETASK.md](FRANCIS-PHASETASK.md). |
| Status | Carlos-side code done at Mocked level for BVA, LOG and SUP (see §5). Items that need a Francis change request, Shanti screens, or the protected payment (G5/G6) stay open and say why. |
| Scope rule | **Nothing here is promoted into the MVP.** Claude.md forbids promoting optional features. Work on an MVP-tier item below is limited to presenting data the MVP already produces. |
| Builds on | [CARLOS-PHASETASK.md](CARLOS-PHASETASK.md) (C-01…C-18 done or blocked as recorded there) |

These six modules turn CYFER's existing core (hashed records, unanimous approval, audit trail, Split payments with verified payouts) into the parts of an ERP an SME actually needs. Each section says what already exists in the code, what Carlos builds, what Francis and Shanti would need to do (as change requests), and how to know it is done.

---

## 1. Ground rules

- **Ownership does not change.** Francis owns contracts (`src/contracts/**`), schema and RPCs (`supabase/**`, `src/server/db/**`), auth and HTTP (`src/server/auth/**`, `src/server/http/**`) and business routes. Shanti owns pages and components. Carlos owns payment, verification, wallet summary, Freighter, controllers, the API client, tooling and tests for those. Anything outside Carlos's paths goes through a CR: `CR: <what> | why | which tasks change | proposed shape`.
- **Honest naming.**
  - The receipts list is an *expense log* or *money movements*. It is **not** a general ledger (no double entry, no chart of accounts).
  - A verified payout proves distribution, not good spending.
  - The `blockchain` table is an application hash chain, not Stellar.
  - Testnet is a simulation.
- **Money** stays integer stroop strings handled with `bigint`. PHP planning figures (`planningPhpCentavos`) are a separate field and are **never** converted to or compared with stroops (PRD D-08).
- **Recipients are fixed per Paiflow deployment.** A new supplier or a changed split means a new flow and a fresh approval, never a dynamic payee.
- **⚠ AUTH** for any Testnet transaction, and for anything that writes to the shared database outside rolled-back tests.
- **Tests.** Every task ships with Mocked tests. Add a rolled-back DB test (`npm run test:db`) when it touches SQL behaviour, and extend `tests/live/payments-smoke.live.mjs` when it adds a route. Every new route must be classified in `tests/server/business/route-auth-sweep.test.ts`.

---

## 2. What already exists

| Module | Already in the code | Gap |
|---|---|---|
| Budget vs actual | `EnvelopeDTO` has `expectedShareStroops`, `planningPhpCentavos` and `payout` (state, observed amount); the plan has `state`, `dashboardState` and `payoutsVerified` (`src/contracts/dto.ts`, `src/server/business/plan-detail.ts`). The verifier records per-envelope results (`src/server/paiflow/verify.ts`, `reconcile.ts`). `usePlanEvidence` serves it to the UI. | A derived per-envelope view (approved, pending, verified, variance) and a screen. |
| Documents and contracts | `org_documents` with kinds `contract`, `invoice`, `receipt`, `plan_attachment`, `other` (`supabase/migrations/006_sme_documents.sql`); upload, download and verify-file routes (`src/app/api/orgs/[orgId]/documents/**`, `verify-file`). | Linking documents to payments; an org-aware summary (the existing `/api/summarize` is the inherited, non-org route). |
| Receipts and expense log | Wallet history from `get_wallet_context` (`src/server/wallet-summary/summary.ts`), `payment_attempts`, `payout_verifications`, `paiflow_events`, audit `transactions` (`supabase/migrations/005_*`, `007_*`). | An org-wide read of money movements, plus CSV export. |
| Purchase-to-pay | Unanimous approval and the SQL payment gate (`begin_payment_attempt`), document hashing, the payment lifecycle (C-07…C-09), the reconcile pass (C-12). | The whole protected payment (deals, release, refund: C-30…C-35, F-30…F-32) is **not built**. There are no purchase orders or delivery receipts. |
| Supplier registry | Registry recipients per deployment (`paiflow_deployments.split_recipients`), Horizon reads (`src/server/wallet-summary/horizon.ts`), address checks (`G_ADDRESS_PATTERN`). | A supplier table and its checks. |
| Approval policy | Approver set = every `owner`/`approver` member, snapshotted per plan version (CL-14). The gate is unanimous, in SQL. | Configurable approvers and thresholds. |

---

## 3. Modules (ordered by tier)

### ERP-BVA — Budget vs Actual (expense control) · **MVP-adjacent**

**Why:** this is the four-state dashboard the brief already asks for, shown per envelope. Almost no new data is needed.

**How the numbers relate (correction to the original idea):**
- "Planned" in PHP is a planning figure and cannot be compared with crypto amounts.
- Variance therefore exists only in stroops: **approved share** (`expectedShareStroops`) minus **verified observed** (`payout.observedAmountStroops` when `payout.state === 'verified'`).
- Pending envelopes have no variance yet, and a mismatch is shown as a mismatch, not as a variance.

- [x] **ERP-BVA-1 Pure selector `budgetVsActual(plan)`**
  - **Deliverable:** `src/lib/budget-vs-actual.ts` returns one row per envelope:
    - `label`, `bps`
    - `plannedPhpCentavos` (passed through, labelled with `STATE_COPY.phpPlanningFigure`)
    - `approvedStroops`
    - `status: 'planned' | 'approved' | 'pending' | 'verified' | 'mismatch'`
    - `verifiedStroops | null`
    - `varianceStroops | null`

    It also returns totals that sum **only within one unit**.
  - **Owns:** that file and `tests/client/budget-vs-actual.test.ts`.
  - **Depends on:** nothing new.
  - **Acceptance:**
    - Uses only `bigint`.
    - "2 of 3 verified" never gives a verified total for the plan.
    - Never returns a PHP-to-stroop comparison.
    - A mismatch row keeps both amounts.
    - Fixtures from `planDetailFixture(state, { partial })` cover every plan state.
  - **Effort:** about 1–2 h.
- [x] **ERP-BVA-2 Hook `useBudgetVsActual(orgId, planId)`**
  - **Deliverable:** wraps `usePlanEvidence` plus the selector, in both fixture and live mode (`src/client/controllers/**`); exported from the controllers index.
  - **Acceptance:** the swap needs only the env flag; there are no extra network calls.
  - **Effort:** about 1 h.
- **Done in code:** `src/lib/budget-vs-actual.ts`, hook `useBudgetVsActual` (exported from `@/client/controllers`). Variance is signed (negative when more than approved was observed); `needsReview` flags a payout in operator review, which is not a mismatch.
- **Ask Shanti:** a per-envelope table on the plan screen, using `STATE_COPY` wording ("Payment confirmed; k of n payouts verified", "{Label} paid — verified").
- **CR to Francis:** none.

### ERP-DOC — Document and contract management · **MVP (tamper check) / Nice (summaries)**

**Why:** this is what CYFER already does, relabelled for SMEs. The tamper check is MVP and done by Francis (F-15). The AI summary is an extra the brief does not mention; show it only if it works.

- [ ] **ERP-DOC-1 Link evidence to payments (read-only)**
  - **Deliverable:** on the payment review and receipt views, list the plan's attached documents (`attachmentDocumentIds` in `CreatePlanInput`) with their `sha256` and a "verify a copy" link to the existing verify-file flow.
  - **Carlos side:** expose the document IDs in `PaymentReviewDTO`, or use the plan detail — prefer the plan detail, so there is no contract change.
  - **Acceptance:** no new route, and no claim beyond "the bytes match".
  - **Effort:** about 1 h (mostly Shanti).
- [ ] **ERP-DOC-2 [Nice] Org-aware document summary**
  - **CR to Francis:** `POST /api/orgs/:orgId/documents/:docId/summary` behind `requireOrgMember`, reading `org_documents` through private storage, cached per `sha256`.
  - **Carlos's part:** none beyond review. **Do not** reuse the inherited `/api/summarize` (public, non-org).
  - **Acceptance:** labelled as an AI summary, not advice; it works without the AI key (a safe fallback).

### ERP-LOG — Receipts and expense log · **Should** (the brief's receipt page)

**Why:** finance staff need a list to export. This is a read-only view of data CYFER already has.

- [ ] **ERP-LOG-1 Read of money movements** (Carlos side built; open until CR-03 is accepted and the RPC is wired)
  - **CR to Francis:** an RPC `list_money_movements(p_org uuid, p_actor uuid, p_limit int, p_before timestamptz)`.
    - Member check, then rows from `payment_attempts` (final status), `payout_verifications` and `paiflow_events`, joined to plans.
    - Shape: `{ at, kind: 'budget_payment'|'envelope_payout', planId, label, amountStroops, stellarTxHash, verification }[]`.
    - It never returns XDR or request IDs.
  - **Carlos deliverable:** `GET /api/orgs/:orgId/money-movements` (`src/app/api/orgs/[orgId]/money-movements/route.ts`, handler in `src/server/paiflow/movements.ts`) plus `explorerUrl` from `stellarExpertTxUrl`.
  - **Acceptance:**
    - 401/403/404 as in the sweep.
    - Unverified rows are labelled pending and excluded from totals.
    - No CYFER audit hash appears as a Stellar hash.
  - **Effort:** about 2–3 h after the CR.
- [x] **ERP-LOG-2 CSV export**
  - **Deliverable:** `GET …/money-movements.csv` (or `?format=csv`).
    - Columns: date (UTC and PHT), plan, envelope, amount in XLM (via `fromStroops`), amount in stroops, Stellar hash, explorer link, verification.
    - Formula-injection safe: prefix `=`, `+`, `-` and `@` with `'`.
  - **Acceptance:** the file opens in a spreadsheet, and nothing in it suggests a general ledger.
  - **Effort:** about 1 h.
- [x] **ERP-LOG-3 Hook `useMoneyMovements(orgId)`**
  - **Deliverable:** fixture and live, with paging.
  - **Effort:** about 1 h.
- **Done in code:** `GET /api/orgs/:orgId/money-movements` (`?limit`, `?before`, `?format=csv`) in `src/server/paiflow/movements.ts`; CSV in `movements-csv.ts`; hook `useMoneyMovements`. The live route uses `unavailableMovementsPort` and answers 500 "not available yet" until CR-03 lands, then `route.ts` swaps in a port that calls the RPC. The row shape adds `planPurpose` to Francis's proposed shape (needed for the CSV plan column).
- **Ask Shanti:** the receipt or expense-log page, with the "not a general ledger" note.

### ERP-P2P — Purchase-to-Pay · **Should / Stretch** (only after G5, and after the protected payment works, G6)

**Flow:** purchase order → approval by every approver → delivery receipt (hashed document) → protected payment → verified payout.

**Story:** "No supplier gets paid without recorded agreement and proof of delivery." It matches the brief's supplier-deposit example.

- **Prerequisite:** C-30…C-35 (deal fund, release, release check, escrow verifier, deal controllers, rehearsal) and Francis's F-30…F-32. Purchase-to-pay is a deal with a purchase-order front end.
- [ ] **ERP-P2P-1 Purchase-order scope for payments**
  - **CR to Francis:**
    - Either a `purchase_orders` table (supplier, items, total stroops, `po_sha256`, approver snapshot, state `draft → pending_approval → approved → funded → delivered → released | refunded`), or model it as a deal with `kind: 'purchase_order'`. **Prefer the deal, to avoid a second lifecycle.**
    - `PayScope` gains `{ kind: 'deal'; dealId }`, which is already reserved in §3.6.
  - **Carlos deliverable:** reuse the C-30 fund routes and C-31 release for that scope. No new payment logic.
- [ ] **ERP-P2P-2 Delivery receipt gate**
  - **Deliverable:** release is allowed only when a delivery-receipt document (`org_documents.kind = 'receipt'`) is linked to the order, its hash is recorded, and every approver approved the delivery.
    - The check runs server-side before `releaseEarly` (in the C-31 handler, through a Francis RPC).
  - **Acceptance:**
    - Without a receipt: 409 with 0 Paiflow calls.
    - A changed receipt file fails verify-file ("does not match"; never "tampered").
- [ ] **ERP-P2P-3 Verified payout to the supplier**
  - **Deliverable:** the C-33 escrow verifier, with the payee checked against the supplier's registered address (ERP-SUP).
- **Acceptance (module):** a rehearsal on a separate escrow deployment (⚠ AUTH), recorded like G6. A release attempt without a delivery receipt is refused with 0 calls.
- **Effort:** large (it depends on the whole protected payment). Do not start before G5.

### ERP-SUP — Supplier registry · **Stretch**

**Why:** purchase-to-pay and payments need a list of payees. It is a **directory, not dynamic onboarding**: paying a new supplier still needs a new Paiflow flow and a fresh approval.

- **CR to Francis:** `suppliers` (`org_id`, `name`, `stellar_address`, `created_by`, `verified_at`, `notes`) and `supplier_documents` (links to `org_documents`); writes by `owner` only; reads by members.
- [x] **ERP-SUP-1 Supplier wallet checks** (Carlos, server-only)
  - **Deliverable:** `src/server/wallet-summary/account-check.ts`:
    - the address matches `G_ADDRESS_PATTERN`;
    - the account exists on Horizon Testnet (`readNativeBalance` pattern, timeout, "unavailable", never false-negative);
    - **only for the USDC stretch**, the trustline exists. XLM needs no trustline.
  - **Acceptance:** a Horizon failure gives "unknown", never "invalid"; the check never blocks a record, it only labels it.
- [x] **ERP-SUP-2 Match suppliers to deployment recipients**
  - **Deliverable:** show which registry deployments already pay a supplier (`split_recipients[].address`), so the operator knows whether a new flow is needed.
  - **Acceptance:** read-only, and it never edits a deployment.
- **Done in code:** `src/server/wallet-summary/account-check.ts` (`checkSupplierAccount`: `invalid_format` / `not_found` / `unknown` / `exists` with trustline) and `src/lib/supplier-match.ts` (`matchSuppliersToDeployments`). Neither is wired to a route yet because the `suppliers` table (CR-04) does not exist.
- **Ask Shanti:** the supplier list and detail screens.
- **Effort:** about 3–4 h after the CR.

### ERP-POL — Approval policy and roles · **Future**

**Why:** a core ERP control. UCP is unanimous today, and the brief only requires unanimous approval, so thresholds wait.

- **Design note only, no build:**
  - **Possible rules:** "every owner approves above X stroops"; "any two approvers below X"; named finance approvers.
  - **Where they would live:** Francis's SQL gate (`begin_payment_attempt`, `decide_budget_plan`), so the payment routes do not change. Carlos's routes keep calling the gate first and still never reach Paiflow without approval.
  - **Carlos impact:** tests only. Extend the negative-path suite and the rolled-back DB test for each new rule.
- **Do not** expose a policy editor in the MVP or SHOULD tiers.

---

## 4. Order of work

1. **After G5 passes:** ERP-BVA-1 and ERP-BVA-2 (pure presentation of MVP data), then ERP-DOC-1.
2. **SHOULD window:** ERP-LOG-1…3, after Francis's RPC CR is accepted.
3. **After G6 (protected payment works):** ERP-SUP CR and ERP-SUP-1/2, then ERP-P2P-1…3.
4. **Nice:** ERP-DOC-2, if the AI key and time allow.
5. **Future:** ERP-POL as a design note only.

**Corrections to the original module ideas:**
- Variance is in stroops only; it is never compared with the PHP planning figure.
- Trustline status matters only for USDC; the MVP uses XLM.
- The existing summariser is not org-aware, so it is not SME-ready.
- The receipts view is an expense log, not a general ledger.
- Supplier onboarding is not dynamic, because payees are fixed per deployment.

---

## 5. Change requests and status of the remaining items

Drafted here for Francis to accept or reject. Nothing below is built.

- **CR-03 (ERP-LOG-1):** `list_money_movements(p_org uuid, p_actor uuid, p_limit int, p_before timestamptz)`. Member check (NOT_MEMBER), then rows from `payment_attempts` (final status), `payout_verifications` and `paiflow_events`, joined to plans, newest first. Shape `{ at, kind, planId, planPurpose, label, amountStroops, stellarTxHash, verification }[]`. No XDR, request ids or CYFER audit hashes. Tasks that change: ERP-LOG-1 only (swap `unavailableMovementsPort` for an RPC port, add a rolled-back DB test).
- **CR-04 (ERP-SUP):** `suppliers` (`org_id`, `name`, `stellar_address`, `created_by`, `verified_at`, `notes`) and `supplier_documents`; writes by `owner`, reads by members. Tasks that change: wire ERP-SUP-1/2 to a route.
- **CR-05 (ERP-DOC-2, Nice):** `POST /api/orgs/:orgId/documents/:docId/summary` behind `requireOrgMember`, cached per `sha256`, safe fallback without the AI key. Do not reuse the inherited `/api/summarize`.
- **CR-06 (ERP-DOC-1):** none if the plan detail already exposes the attached documents (id, kind, sha256). If it does not, ask Francis to add `attachments: { documentId, kind, sha256 }[]` to `BudgetPlanDetailDTO`. Shanti builds the list and the "verify a copy" link; no new route, and the wording stays "the bytes match".
- **CR-07 (ERP-P2P, after G5/G6):** model a purchase order as a deal with `kind: 'purchase_order'` (not a second lifecycle); `PayScope` gains `{ kind: 'deal'; dealId }`; an RPC that answers whether a delivery receipt (`org_documents.kind = 'receipt'`) is linked, hashed and approved by every approver.

**ERP-P2P (blocked, not started).** Needs C-30…C-35, F-30…F-32 and a passed G5/G6, none of which exist. When unblocked, the tests to write first are: release without a delivery receipt gives 409 with 0 Paiflow calls; a changed receipt file fails verify-file as "does not match", never "tampered"; the payee must equal the supplier's registered address.

**ERP-DOC-1, ERP-DOC-2 (open).** Waiting on Shanti's screens (DOC-1) and CR-05 (DOC-2).

### ERP-POL design note (Future, no build)

Rules that could exist: "every owner approves above X stroops", "any two approvers below X", named finance approvers. They belong in Francis's SQL gate (`begin_payment_attempt`, `decide_budget_plan`), so payment routes do not change and still call the gate before any Paiflow call. Carlos's part is tests only: for each rule add a negative-path case (0 Paiflow calls when the rule is not met) and a rolled-back DB case. No policy editor in the MVP or SHOULD tiers.

## 6. Evidence log (ERP)

| Time (PHT) | Task | Evidence (no secrets, no XDR) | Level (Mocked / DB / Local live / Testnet) | Authorised by |
|---|---|---|---|---|
| 2026-10-25 | ERP-BVA-1, ERP-BVA-2 | `tests/client/budget-vs-actual.test.ts` (8 tests: every plan state, partial 2 of 3, mismatch, signed variance, PHP untouched); hook is derived from `usePlanEvidence`, no network call | Mocked | n/a |
| 2026-10-25 | ERP-LOG-1 (Carlos side), ERP-LOG-2, ERP-LOG-3 | `tests/server/payments/movements.test.ts`, `movements-csv.test.ts`, `tests/client/money-movements.test.ts`; route classified by the auth sweep (`orgs/` prefix, 401 without a session). Not run against a database: the RPC (CR-03) does not exist | Mocked | n/a |
| 2026-10-25 | ERP-SUP-1, ERP-SUP-2 | `tests/server/payments/supplier-checks.test.ts` (Horizon failure gives unknown; USDC trustline only for USDC; matcher read-only). No real Horizon call | Mocked | n/a |
