# FRANCIS — Phase Tasks (Developer 1: application and database foundation)

> **Canonical coordination document.** This file holds the shared contracts, the ownership matrix, the handoff and blocker registers, and gates G1, G2 and G7. [CARLOS-PHASETASK.md](CARLOS-PHASETASK.md) and [SHANTI-PHASETASK.md](SHANTI-PHASETASK.md) link here and do not redefine anything in it.

| Field | Value |
|---|---|
| Owner | Francis (Developer 1) |
| Source of truth | [docs/PRD.MD](PRD.MD) v2.0.0. Its technical design is **[PROPOSED]**, and none of it is implemented. |
| Plan written | 2026-10-25, about 11:50 PHT, from the repository at commit `f4dccc5` (`main`, clean tree) |
| Event | Paiflow × Web3 Iloilo, 25 Oct 2026. Building runs until 4:00 PM PHT, then pitching (event primer p2). Stellar Testnet only. |
| Status | Planning only. Every task starts unchecked, and no code, schema or deployment exists yet. |

---

## 0. How to use these three documents

- **Checkboxes.** `- [ ]` means pending. Tick `- [x]` only after you record evidence in that document's evidence log (§11 here). A rendering screen, an HTTP 200 or a merged PR is **not** evidence that a financial behaviour works.
- **IDs.** The ID prefixes are:
  - `F-xx` Francis, `C-xx` Carlos, `S-xx` Shanti tasks
  - `HO-xx` handoffs, `B-xx` blockers/investigations, `CL-xx` contract clarifications, `CR-xx` change requests, `G1`–`G8` gates
  - PRD IDs (`REQ-…`, `Q-…`, `INV-…`, `T-…`) refer to [PRD.MD](PRD.MD)
- **Each person edits only their own document.** Ask the owner to change anything in another person's document.
- **Verification levels stay separate** (PRD §M.1): *Mocked* (fixtures/mocked SDK), *Manual Testnet* (real Freighter and real deployment, with recorded hashes), *Human review*. Never record mocked evidence as Testnet evidence.
- **⚠ AUTH** marks steps that need **explicit team authorisation in chat before they run** (Claude.md): shared-database mutations (migrations, seeds, accounts, flags), Testnet transactions, and dependency installs that change the lockfile. Record who authorised it and when.
- **Forbidden for everyone:** `git reset --hard`, silent `git stash`, force-pushing shared branches, overwriting or reformatting another owner's files, committing `.env.local`, and pasting tokens, secret keys or seed phrases anywhere.

### 0.1 Team roles

| Person | Role | Document |
|---|---|---|
| Francis | Developer 1: contracts, schema, RLS, RPCs, auth, wallet binding (server), deals, terms, deliverables, approvals, audit/ledger | this file |
| Carlos | Developer 2: Paiflow SDK adapter, funding, release, recovery, event verification, reconciliation, wallet summary, Freighter browser module, headless controllers, `package.json` / lockfile, test tooling | [CARLOS-PHASETASK.md](CARLOS-PHASETASK.md) |
| Shanti | UI developer: pages, components, styles, accessibility, demo presentation; **Paiflow website operator** (builds and deploys flows) | [SHANTI-PHASETASK.md](SHANTI-PHASETASK.md) |

### 0.2 Recommended time-box for today (PHT, 25 Oct 2026)

This is a recommendation. Building ends at 4:00 PM (primer p2). The plan is deliberately tight. If a gate has not passed by its cut-off, the pitch uses PRD §N.2 labels (**Recorded** or **Explained**) and **no acceptance criterion is weakened**.

| Time | Francis | Carlos | Shanti |
|---|---|---|---|
| 12:00–12:30 | F-01 contracts in code; F-02 schema inventory | C-01 toolchain; C-02 spikes | S-01 accounts and wallets; S-02 refund deployment |
| **12:30–12:45** | **Checkpoint CP-1 → [G1](#g1)** (all three) | | |
| 12:45–14:00 | F-05…F-11 migrations and RPCs (write, do not apply) | C-03…C-05 adapter, helpers, mock controllers | S-03 rehearsal and live deployments; S-04 token handoff; S-10…S-12 UI on fixtures |
| **14:00–14:10** | **CP-2 → [G2](#g2)** | | |
| 14:10–15:00 | F-12…F-17 routes | C-06…C-16 routes, verifier, real controllers | S-13…S-21 screens; switch to real controllers |
| **15:00** | **CP-3 → [G3](CARLOS-PHASETASK.md#g3) and [G4](SHANTI-PHASETASK.md#g4)** | | |
| 15:00–15:35 | F-21 negative paths; supports rehearsal | C-19 rehearsal → [G5](CARLOS-PHASETASK.md#g5); C-20 → [G6](CARLOS-PHASETASK.md#g6) | Runs the UI during rehearsal; captures screenshots |
| 15:35–15:55 | [G7](#g7) sign-off | Supports G7 | S-25 → [G8](SHANTI-PHASETASK.md#g8) demo rehearsal |
| 16:00 | Pitching block starts | | |

---

## 1. Coordination rules (canonical)

### 1.1 Ownership principle

Every writable file, route handler, database object, fixture and manifest has **exactly one owner** (§2). Some cases are not ownership:

- **Dependency, not ownership.** Calling another person's function, route or RPC, or importing their types, is a dependency.
- **Owner's choice.** The owner decides implementation details inside the frozen contract (§3).
- **Shared rehearsals.** All three people take part, but one accountable lead signs off, and each person's responsibilities are listed under that gate.

### 1.2 Contract freeze and change requests

1. **CP-1 (12:30, about 15 min):** Francis presents §3. Carlos confirms the persistence interface (§3.6). Shanti confirms the controller interface (§3.7) and the DTOs she renders. Recording agreement in the evidence log passes **[G1](#g1)**.
2. After G1, any change to §3 needs a **change request**:
   - The requester posts in the team chat: `CR: <what> | why | which tasks change | proposed shape`.
   - Francis records it in §3.10 as `CR-xx`, decides with the affected owner, updates §3 and the `src/contracts/` code in **one commit**, and announces the commit hash.
   - Consumers adapt in their own files. Nobody edits `src/contracts/` except Francis.
   - Additive optional fields can be approved immediately. Renames, removals and semantic changes need both producer and consumer to agree.
3. Breaking changes after CP-3 (15:00) need all three people to agree, because rehearsal starts then.

### 1.3 Dependency (package) handoff

- **Carlos owns** `package.json` and `package-lock.json`. Only Carlos runs `npm install <pkg>` or edits either file. The repo uses **npm** (it has `package-lock.json`). Do not introduce pnpm here.
- **To request a package:** post `DEP: <package>@<exact version> | runtime or dev | why | importing file`. Carlos installs it on his branch (⚠ AUTH applies to lockfile changes) and merges a dependency-only commit. Everyone else then runs `npm ci`; nobody runs `npm install`.
- Known requests:
  - Francis needs `@supabase/ssr` (only if F-03 chooses it) and `@stellar/stellar-sdk` (server-side challenge verification, shared with Carlos).
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

Rules:

- Update your branch with `git fetch` plus `git merge origin/main`. Rebase only your own unpublished commits.
- On a conflict in a file you do not own, **stop and ask its owner**. Never resolve someone else's file by choosing your side.
- Never push to another person's branch.

### 1.5 Secrets and authorisation

- **Secrets stay out of every public place.** The Paiflow token (`pfd_`/`pfk_`), the Supabase service role key, the event access code, wallet secret keys and seed phrases never appear in these docs, commits, screenshots, chat, logs or the browser bundle.
- **`.env.local` is local only.** It is git-ignored ([.gitignore](../.gitignore) `.env*`) and lives only on the machine that runs the server.
- **Credential custodian (proposed, B-07):** Carlos holds the Paiflow token and the server `.env.local` on the demo server machine. Francis holds the Supabase service role key (PRD §L.5 "team lead").
- **⚠ AUTH required for:** applying migrations, creating accounts, setting operator flags, creating storage buckets, running seeds or `test-supabase.ts`, every Testnet transaction (deposits, releases, hosted-page payments) and deploying flows. Do **not** run inherited seeds, `scripts/seed-demo-data.js` or `test-supabase.ts`.

---

## 2. Ownership matrix (canonical)

The legend for this section:

- Paths marked *(new)* do not exist yet.
- "Delete/replace" means the owner may remove the inherited file once its dependents are gone (see the dependency column).
- A path that ends in `/**` assigns every file under that directory to the same owner.

### 2.1 Existing files

| Existing path | Owner | Planned action | Dependents / notes |
|---|---|---|---|
| [docs/PRD.MD](PRD.MD) | Francis | Record spike findings later (S0 slice) from C-02/F-02 evidence. Not edited in this planning task. | Others send findings; Francis transcribes them |
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
| `src/app/api/{audit,auth,blockchain,budget,consensus,documents,summarize,verify}/**` (inherited) | Francis | Delete or return 410 in F-20, after Shanti removes the pages that call them | Security gaps in PRD §K.12 |
| `src/app/(public)/**`, `src/app/(admin)/**`, [src/app/layout.tsx](../src/app/layout.tsx), [src/app/icon.png](../src/app/icon.png) | Shanti | Replace government pages and navigation with SME screens | — |
| `src/components/**` (all inherited) | Shanti | Reuse `ui/*`, `AuditTimeline`, `VerificationResult`, `BudgetChart`, `BudgetTable`; retire government components | — |
| `supabase/migrations/001_initial_schema.sql`, `supabase/policies/*`, `supabase/seeds/*` | Francis | **Never edit 001** (PRD §I.13). Do not run seeds. | — |
| [scripts/seed-demo-data.js](../scripts/seed-demo-data.js), [test-supabase.ts](../test-supabase.ts), [test-phase0.ts](../test-phase0.ts) | Francis | Do not run. Delete in F-20. | — |
| `prototype/**`, `public/**` | Shanti | Design reference and assets | — |

### 2.2 New source paths

| New path *(new)* | Owner | Purpose |
|---|---|---|
| `src/contracts/**` | **Francis** | Canonical TypeScript contracts: `states.ts`, `errors.ts`, `dto.ts`, `api.ts`, `controllers.ts`, `state-copy.ts`, `limits.ts`, `canonical.ts`, `fixtures/**`. Types and pure data only, with no I/O. |
| `src/client/http.ts` | Francis | Browser `fetch` helper: same-origin JSON, `{data}`/`{error}` parsing, timeout, `Retry-After`. Ported from starter `lib/browser-api.ts`. |
| `src/client/api/business.ts` | Francis | Typed browser fetchers for Francis's routes (§3.5) |
| `src/client/api/payments.ts` | Carlos | Typed browser fetchers for Carlos's routes (§3.5) |
| `src/client/wallet/**` | Carlos | Freighter: connect, network check, `signMessage`, `signTransaction` |
| `src/client/controllers/**` (incl. `mock/**`) | Carlos | Headless hooks/controllers (§3.7) and fixture-backed mocks |
| `src/lib/amount.ts`, `src/lib/stellar/**`, `src/lib/explorer.ts` | Carlos | Isomorphic pure helpers: stroops↔XLM, envelope hash and fee-bump check, Stellar Expert URLs |
| `src/server/db/**` | Francis | Server-only Supabase client and persistence functions, each wrapping exactly one RPC or query (§3.6) |
| `src/server/http/**` | Francis | `readJson` (streaming limit), `readMultipart` limits, `sameOrigin`, `respond`/`handle`, rate-limit buckets. Ported from starter `lib/http.ts` and `lib/payment-rate-limit.ts`. |
| `src/server/auth/**` | Francis | Session reading, `requireUser`, `requireParticipant`, `requireOperator`, role derivation from server tables |
| `src/server/wallet-binding/**` | Francis | Challenge message builder and server signature verification (§B-03) |
| `src/server/deliverables/**` | Francis | Upload limits, streaming hash, private storage, signed URLs |
| `src/server/paiflow/**` | Carlos | `server-only` SDK adapter, config validation, capabilities, deposit, release, events, verifier, reconciler |
| `src/server/wallet-summary/**` | Carlos | Horizon balance read; history aggregation |
| `src/app/(sme)/**`, `src/components/sme/**` | Shanti | All new pages, layouts and components (exact page paths in Shanti §3) |
| `tests/server/business/**`, `tests/db/**`, `tests/fixtures/db/**` | Francis | Tests for owned systems |
| `tests/server/payments/**`, `tests/client/**`, `tests/fixtures/paiflow/**`, `vitest.config.ts`, `scripts/check-browser-bundle.mjs` | Carlos | Payment, wallet and controller tests; tooling; bundle scan |
| `tests/ui/**` | Shanti | Optional UI smoke tests |
| `supabase/migrations/002_*.sql` and later | **Francis** | **All** schema, RLS, functions, storage. Carlos specifies requirements; he never writes migrations. |
| `docs/FRANCIS-PHASETASK.md` / `CARLOS-…` / `SHANTI-…` | Each named person | Own checkboxes and evidence |

### 2.3 API route ownership

There is one owner per `route.ts`. Where a resource needs business and financial operations, they live in **separate route files**.

| Route file *(new)* under `src/app/api/` | Method | Owner |
|---|---|---|
| `auth/sign-in/route.ts`, `auth/sign-out/route.ts`, `auth/me/route.ts` | POST/POST/GET | Francis |
| `wallet/challenge/route.ts`, `wallet/bind/route.ts`, `wallet/unbind/route.ts` | POST | Francis |
| `wallet/summary/route.ts` | GET | Carlos |
| `deployments/match/route.ts` | GET | Francis |
| `deals/route.ts` | GET, POST | Francis |
| `deals/[id]/route.ts` | GET | Francis |
| `deals/[id]/terms/route.ts`, `deals/[id]/terms/[version]/accept/route.ts` | POST | Francis |
| `deals/[id]/deliverables/route.ts`, `deals/[id]/deliverables/[version]/download/route.ts`, `deals/[id]/verify-file/route.ts` | POST/GET/POST | Francis |
| `deals/[id]/approve/route.ts`, `deals/[id]/reject/route.ts` | POST | Francis |
| `deals/[id]/fund/prepare/route.ts`, `…/fund/submit/route.ts`, `…/fund/check/route.ts`, `…/fund/resubmit/route.ts` | POST | Carlos |
| `deals/[id]/release/route.ts`, `deals/[id]/release/check/route.ts` | POST | Carlos |
| `deals/[id]/evidence/refresh/route.ts` | POST | Carlos |
| `operator/deployments/route.ts` | GET, POST | Carlos (it calls Francis's registry RPCs) |
| `operator/reviews/route.ts`, `operator/reviews/[reviewId]/route.ts` | GET / POST | Carlos (it calls Francis's review RPCs) |
| `integration/status/route.ts` | GET | Carlos |
| `internal/reconcile/route.ts` (only if B-06 chooses an HTTP trigger) | POST | Carlos |
| SHOULD: `orgs/[orgId]/budget-plans/**` business routes / `…/budget-plans/[planId]/pay/**` | — | Francis / Carlos |
| STRETCH: `src/app/r/[slug]/` receipt page | — | Shanti (page) + Francis (data route) |

### 2.4 Database ownership

Every table, index, policy, function, trigger and bucket is owned by **Francis**, in migrations he writes. Carlos's code reaches the financial objects only through the §3.6 functions.

| Object | Migration *(new)* | Primary consumer |
|---|---|---|
| `profiles` (with `is_operator`), `wallet_challenges`, `wallet_bindings` | `002_sme_identity_wallets.sql` | Francis routes; Carlos wallet summary (read) |
| `paiflow_deployments`, `deployment_reservations`, `deals`, `deal_terms_versions`, `terms_acceptances`, `deal_state_transitions` | `003_sme_deployments_deals.sql` | Both |
| `payment_attempts`, `payment_envelope_rejections`, `release_attempts`, `payout_verifications`, `paiflow_events` (CL-07), `event_cursors`, `reconcile_leases` (CL-08), `operator_reviews` | `004_sme_financial_evidence.sql` | Carlos (via §3.6) |
| `deliverable_versions`, `deal_approvals`, storage bucket `deliverables` (private) | `005_sme_deliverables_approvals.sql` | Francis |
| `blockchain` tail-lock fix, `transactions` new columns and `action_type` values, `append_evidence()` | `006_sme_ledger_audit.sql` | Internal to every RPC |
| All RPC functions in §3.6 | `007_sme_functions.sql` (may be split per area) | Both |
| SHOULD: `organisations`, `org_memberships`, `budget_plans`, `budget_envelopes`, `budget_approvals` | `010_should_budget.sql` | Both |
| SHOULD: online-selling mock courier state | `011_should_selling.sql` | Francis |
| STRETCH: `public_receipts` | `012_stretch_receipts.sql` | Francis |

---

## 3. Shared contracts (canonical)

These are frozen at **G1**, and the code mirror lives in `src/contracts/**` (F-01). Where this section clarifies or extends the PRD, it says so in §3.9.

<a id="contract-conventions"></a>
### 3.1 Conventions

| Topic | Rule |
|---|---|
| Envelope | Success: `{ "data": T }`. Error: `{ "error": { "code": ErrorCode, "message": string, "fields"?: Record<string,string> } }`. This follows the PRD §I.14 shape and replaces the inherited `{success,data}`. |
| Auth | Session cookie set by `POST /api/auth/sign-in` (F-03 confirms the mechanism). Every route except `auth/sign-in` requires a session and returns `401 UNAUTHENTICATED` without one. Roles come from server tables only, never `user_metadata`. |
| Origin | Every mutation needs same-origin `Origin`, not `sec-fetch-site: cross-site`. JSON routes require `Content-Type: application/json`. |
| Limits | JSON bodies are capped at 64 KB, enforced while streaming. Fund-submit is capped at 210,000 bytes, with `signedXdr` at most 200,000 chars. Uploads are capped at 10 MB (`limits.ts`). |
| IDs | UUID v4 strings. Deployment ID = the Paiflow **deployment UUID**: not the flow ID and not the `C…` contract address. |
| Money | `amountStroops: string` matching `^[1-9][0-9]{0,38}$` (1 XLM = `"10000000"`). Use `bigint` arithmetic only and never `Number`. Display via Carlos's `fromStroops`. |
| Asset | `AssetRef = { kind: "native" }` for the MVP. `{ kind: "known", symbol: "USDC" }` is STRETCH only. |
| Network | Literal `"testnet"`. Any other value is an error. |
| Addresses | `^G[A-Z2-7]{55}$`. They are visible only to deal participants and operators. |
| Time | The server emits ISO-8601 UTC (`…Z`). `deadlineAt` is the deployment's `at`, stored as `timestamptz`. The UI renders Asia/Manila (PHT, UTC+8) with the zone label. **Margins are computed in SQL with Postgres `now()`**, so there is one clock. |
| Hashes | Lower-case 64-hex. **Field names never mix kinds:** `stellarTxHash` (explorer-checkable), `sha256` (files/terms), `auditHash` (CYFER `transactions.tx_hash`, **not** Stellar), `ledgerBlockHash` (CYFER application ledger, **not** Stellar). |
| Explorer | `https://stellar.expert/explorer/testnet/tx/{stellarTxHash}`, labelled "Stellar Expert (testnet)" (Carlos `src/lib/explorer.ts`). |

<a id="contract-states"></a>
### 3.2 States and allowed actions

**Deal state** (`DealState`, PRD §F.1):

```
draft | terms_pending | ready_to_fund | funding | funded_unindexed | funded_held |
delivered | approved | release_requested | release_uncertain | payout_verified |
awaiting_refund | refunded_verified | operator_review | cancelled
```

`rejected_deliverable` is a **transition, not a stored state** (CL-01). A rejection returns the deal to `funded_held`, and the UI shows "Changes requested" from the latest approval row.

**Payment attempt state** (`PaymentAttemptState`, PRD §F.2 plus CL-02/CL-03):

```
preparing | prepare_failed | prepared | signing | signed_persisted | submitted |
success | failed | pending | unknown | rejected | expired_unsigned | operator_review | reconciled
```

- **Terminal:** `success`, `failed` (final FAILED recorded), `prepare_failed` (no XDR ever left the server), and `reconciled` (operator outcome with a `resolution`).
- **Unique index:** the partial unique index applies to every *non*-terminal state. PRD §I.5's `failed_recorded` corresponds to `failed` here.

**Release attempt state** (`ReleaseAttemptState`, CL-04):

```
requested | responded | refused | uncertain | verified | mismatch | operator_review
```

`refused` carries `refusalCode`: `DEADLINE_PASSED | NOTHING_TO_RELEASE | RATE_LIMITED | OTHER`.

**Verification state** (`VerificationState`, PRD §F.3):

```
not_started | awaiting_tx_final | awaiting_events | verified | mismatch | operator_review
```

The UI shows `awaiting_tx_final` and `awaiting_events` as "pending evidence" (REQ-PAY-01 `pending_evidence`).

**Allowed actions.** The server computes these in `GET /api/deals/:id` (F-17), so the UI never re-implements the state machine:

| `AllowedAction` | Shown to | When |
|---|---|---|
| `edit_terms` | client | `terms_pending` or `ready_to_fund`, and no payment attempt ever existed |
| `accept_terms` | either party | the current terms version is not yet accepted by the viewer |
| `fund` | client | `ready_to_fund`, the viewer's binding equals the buyer, and `now < deadline − funding margin` |
| `continue_funding` | client | the attempt is `prepared`/`signing`, not expired, and no signed envelope is stored |
| `check_funding` | participants | the attempt is in `submitted`, `pending`, `unknown`, `rejected` or `expired_unsigned`, or a signed envelope is stored without a final status |
| `resubmit_same_envelope` | client | a signed envelope is stored, the outcome is unresolved, and the status is not `SUCCESS`/`FAILED` (REQ-REC-01) |
| `upload_deliverable` | seller | `funded_held`/`funded_unindexed`, and the deadline is in the future |
| `verify_file` | participants | at least one deliverable version exists |
| `approve`, `reject` | client | `delivered` |
| `release` | client | `approved`, deposit verified, `now < deadline − release margin`, and no release attempt exists |
| `check_release` | participants | the release attempt is in `responded` or `uncertain` |
| `refresh_evidence` | participants | any non-terminal state after funding |

**Margins** (`src/contracts/limits.ts`; configurable on the server):

- `FUNDING_MARGIN_SECONDS = 600`
- `RELEASE_MARGIN_SECONDS = 120`
- `CHALLENGE_TTL_SECONDS = 300`
- `SIGNED_URL_TTL_SECONDS = 300`
- `MAX_DELIVERABLE_BYTES = 10 485 760`
- `REFUND_ALERT_SECONDS = 1800`
- `RELEASE_EVIDENCE_THRESHOLD_SECONDS = 600`
- `MAX_EVENT_POLLS_PER_DEAL_PER_HOUR = 40`

**State copy.** The canonical honest wording is in `src/contracts/state-copy.ts` (Francis), taken from PRD §E/§F/§H. Shanti may style it but must not change its meaning.

- **Required strings:** "Waiting for seller to accept terms", "Ready to fund", "Review and sign in Freighter", "Deposit confirmed; awaiting indexed evidence", "Funds held in escrow", "Deliverable v{n} submitted", "Approved v{n}", "Changes requested", "Releasing to seller…", "Release outcome being checked", "Paid to seller — verified", "Deadline reached; refund pending (polled)", "Refunded to client — verified", "Payment outcome unknown. Do not pay again.", "Evidence mismatch — under review", "Transaction confirmed; payout not yet verified", "Deadline passed; this deposit follows the refund path".
- **Required warning:** `NONRESPONSE_REFUND`, which reads "If the client does not approve before the deadline, Paiflow refunds the client even if the seller delivered."

<a id="contract-errors"></a>
### 3.3 Error codes (safe, browser-visible)

Messages are safe and generic. They never include tokens, XDR, SQL, stack traces or other users' data.

| HTTP | `code` | Typical source |
|---|---|---|
| 400 | `VALIDATION_SHAPE`, `CHALLENGE_INVALID`, `SIGNATURE_INVALID` | Malformed body; expired, reused or unknown challenge; bad signature |
| 401 | `UNAUTHENTICATED` | No or expired session |
| 403 | `FORBIDDEN`, `NOT_PARTICIPANT`, `OPERATOR_REQUIRED`, `WALLET_MISMATCH`, `APPROVAL_REQUIRED` | Role or ownership checks |
| 404 | `NOT_FOUND` | Unknown deal, version or review |
| 409 | `STATE_CONFLICT`, `STALE_VERSION`, `NO_MATCHING_DEPLOYMENT`, `AMBIGUOUS_DEPLOYMENT_MATCH`, `ADDRESS_ALREADY_BOUND`, `BINDING_LOCKED`, `EDIT_AFTER_FUNDING`, `DEADLINE_MARGIN`, `NOT_PREPARED`, `RELEASE_EXISTS`, `RESUBMIT_NOT_ALLOWED`, `ATTEMPT_UNRESOLVED` | Conditional updates that affected zero rows; uniqueness checks |
| 413 | `REQUEST_TOO_LARGE` | Body or file limits |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Wrong content type or file type |
| 422 | `VALIDATION`, `ENVELOPE_CHANGED`, `DEADLINE_PASSED`, `NOTHING_TO_RELEASE`, `CAPABILITY_MISMATCH` | Domain validation; Paiflow 422s mapped by Carlos |
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
  binding: { address: GAddress; verifiedAt: IsoUtc } | null }

interface PartyDTO { role: 'client' | 'seller'; displayName: string; address: GAddress }

interface TermsDTO { versionId: string; version: number; sha256: Sha256Hex;
  title: string; description: string; deliverableDescription: string;
  amountStroops: string; asset: AssetRef; deadlineAt: IsoUtc; createdAt: IsoUtc;
  acceptedAt: { client: IsoUtc | null; seller: IsoUtc | null } }

interface DeliverableVersionDTO { versionId: string; version: number; sha256: Sha256Hex;
  sizeBytes: number; mediaType: string; originalFilename: string; uploadedAt: IsoUtc; isCurrent: boolean }

interface ApprovalDTO { id: string; decision: 'approved' | 'rejected'; termsVersionId: string;
  deliverableVersionId: string; deliverableSha256: Sha256Hex; decidedAt: IsoUtc; reason: string | null }

interface FundingAttemptViewDTO { attemptId: string; state: PaymentAttemptState;
  originalTxHash: StellarTxHash | null; expiresAt: IsoUtc | null; submittedAt: IsoUtc | null;
  finalStatus: 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNKNOWN' | 'REJECTED' | 'NOT_FOUND' | null;
  ledger: number | null; hasSignedEnvelope: boolean; lastCheckedAt: IsoUtc | null }
  // never contains preparedXdr / signedXdr / historyRequestId / request ids

interface ReleaseViewDTO { releaseAttemptId: string; state: ReleaseAttemptState;
  stellarTxHash: StellarTxHash | null; requestedAt: IsoUtc;
  refusalCode: 'DEADLINE_PASSED' | 'NOTHING_TO_RELEASE' | 'RATE_LIMITED' | 'OTHER' | null }

interface VerificationDTO { kind: 'deposit' | 'release_payout' | 'refund_payout'; state: VerificationState;
  stellarTxHash: StellarTxHash | null; expectedAddress: GAddress; expectedAmountStroops: string;
  observedAmountStroops: string | null; eventIds: string[]; checkedAt: IsoUtc | null; note: string | null }

interface TimelineEntryDTO { at: IsoUtc; kind: AuditActionType; actorRole: 'client' | 'seller' | 'operator' | 'system';
  summary: string; stellarTxHash?: StellarTxHash; sha256?: Sha256Hex; auditHash?: string; ledgerBlockId?: number }

interface DealSummaryDTO { id: string; template: 'commission_escrow' | 'online_selling'; title: string;
  state: DealState; viewerRole: 'client' | 'seller' | 'operator'; amountStroops: string; asset: AssetRef;
  deadlineAt: IsoUtc; counterpartyName: string; updatedAt: IsoUtc }

interface DealDetailDTO extends DealSummaryDTO {
  parties: { client: PartyDTO; seller: PartyDTO };
  deployment: { id: string; network: 'testnet'; asset: AssetRef; deadlineAt: IsoUtc };
  terms: TermsDTO; termsHistory: Pick<TermsDTO, 'versionId' | 'version' | 'sha256' | 'createdAt'>[];
  deliverables: DeliverableVersionDTO[]; latestDecision: ApprovalDTO | null;
  funding: FundingAttemptViewDTO | null; release: ReleaseViewDTO | null;
  verifications: VerificationDTO[]; timeline: TimelineEntryDTO[];
  allowedActions: AllowedAction[]; warnings: ('NONRESPONSE_REFUND' | 'DEPOSIT_AFTER_DEADLINE' | 'BINDING_MISMATCH')[];
  serverTime: IsoUtc }

interface DeploymentMatchDTO { deploymentId: string; deadlineAt: IsoUtc; asset: AssetRef; sellerDisplayName: string }

interface FundingReviewDTO { attemptId: string; network: 'testnet'; networkPassphrase: string;
  xdr: string;                    // unsigned, returned ONCE to the owning client for signing (CL-06)
  originalTxHash: StellarTxHash; expiresAt: IsoUtc; amountStroops: string; asset: AssetRef;
  feeStroops: string | null; sellerAddress: GAddress; buyerAddress: GAddress; deploymentId: string;
  outcome: 'created' | 'existing' }

interface WalletSummaryDTO { network: 'testnet'; binding: { address: GAddress; verifiedAt: IsoUtc } | null;
  balance: { state: 'available'; xlmStroops: string; asOf: IsoUtc } | { state: 'unavailable'; asOf: IsoUtc };
  escrow: { dealId: string; title: string; state: DealState; amountStroops: string; depositVerified: boolean }[];
  verifiedPayouts: { receivedAsSellerStroops: string; refundedAsClientStroops: string };
  history: { kind: 'deposit' | 'release' | 'refund' | 'budget_payout'; dealId: string | null; amountStroops: string;
    stellarTxHash: StellarTxHash; explorerUrl: string; verification: VerificationState; at: IsoUtc }[] }

interface VerifyFileResultDTO { deliverableVersionId: string; version: number; recordedAt: IsoUtc;
  candidateSha256: Sha256Hex; recordedSha256: Sha256Hex; match: boolean }   // copy per REQ-DLV-02 in state-copy.ts

interface DeploymentRegistryEntryDTO { deploymentId: string; template: string; network: 'testnet'; asset: AssetRef;
  conditionNodeId: string; deadlineAt: IsoUtc; sellerAddress: GAddress; buyerAddress: GAddress;
  graphSnapshotSha256: Sha256Hex; status: 'available' | 'reserved' | 'retired' | 'unusable'; registeredAt: IsoUtc }

interface OperatorReviewDTO { reviewId: string; scope: 'payment_attempt' | 'release_attempt' | 'verification' | 'deal';
  dealId: string; reason: string; openedAt: IsoUtc; resolvedAt: IsoUtc | null; outcome: string | null }
```

<a id="contract-endpoints"></a>
### 3.5 Endpoints

All endpoints need a session unless marked otherwise. "P" means deal participant: the client or the seller.

| Route | Owner | Caller | Request | `data` on success | Notable errors |
|---|---|---|---|---|---|
| POST `/api/auth/sign-in` | F | public | `{email, password}` | `SessionDTO` | 400, 401, 429 |
| POST `/api/auth/sign-out` | F | any | `{}` | `{}` | — |
| GET `/api/auth/me` | F | any | — | `SessionDTO` | 401 |
| POST `/api/wallet/challenge` | F | user | `{address}` | `{challengeId, message, expiresAt}` | 422, 429 |
| POST `/api/wallet/bind` | F | user | `{challengeId, address, signedMessage, signerAddress}` | `{address, verifiedAt}` | 400 `CHALLENGE_INVALID`/`SIGNATURE_INVALID`, 409 `ADDRESS_ALREADY_BOUND` |
| POST `/api/wallet/unbind` | F | user | `{}` | `{}` | 409 `BINDING_LOCKED` |
| GET `/api/wallet/summary` | C | user | — | `WalletSummaryDTO` | balance failure shows as `state:'unavailable'`, never 0 |
| GET `/api/deployments/match?sellerAddress=G…` | F | client | query | `DeploymentMatchDTO` | 409 `NO_MATCHING_DEPLOYMENT`/`AMBIGUOUS_DEPLOYMENT_MATCH` |
| GET `/api/deals` | F | user | — | `DealSummaryDTO[]` | — |
| POST `/api/deals` | F | client | `{template:'commission_escrow', sellerAddress, title, description, deliverableDescription, amountStroops}` | `DealDetailDTO` | 409 no/ambiguous match, 422 |
| GET `/api/deals/:id` | F | P / operator | — | `DealDetailDTO` | 403 `NOT_PARTICIPANT` |
| POST `/api/deals/:id/terms` | F | client | same fields as create, minus `sellerAddress` | `DealDetailDTO` | 409 `EDIT_AFTER_FUNDING` |
| POST `/api/deals/:id/terms/:version/accept` | F | P | `{termsSha256}` | `DealDetailDTO` | 409 `STALE_VERSION` |
| POST `/api/deals/:id/fund/prepare` | C | client | `{}` | `FundingReviewDTO` | 403 `WALLET_MISMATCH`, 409 `DEADLINE_MARGIN`/`ATTEMPT_UNRESOLVED` |
| POST `/api/deals/:id/fund/submit` | C | client | `{attemptId, signedXdr}` | `FundingAttemptViewDTO` | 422 `ENVELOPE_CHANGED`, 409 `NOT_PREPARED`, 502 |
| POST `/api/deals/:id/fund/check` | C | P | `{attemptId}` | `FundingAttemptViewDTO` | 429. **Read-only: never submits** (CL-05). |
| POST `/api/deals/:id/fund/resubmit` | C | client | `{attemptId, originalTxHash, intent:'resubmit_same_signed_envelope'}` | `FundingAttemptViewDTO` | 409 `RESUBMIT_NOT_ALLOWED` |
| POST `/api/deals/:id/deliverables` | F | seller | multipart `file` | `DeliverableVersionDTO` | 413, 415, 409 |
| GET `/api/deals/:id/deliverables/:version/download` | F | P | — | `{url, expiresAt}` (signed URL ≤ 5 min) | 403 |
| POST `/api/deals/:id/verify-file` | F | P | multipart `file`, `deliverableVersionId` | `VerifyFileResultDTO` | 413, 403, 429 |
| POST `/api/deals/:id/approve` | F | client | `{termsVersionId, deliverableVersionId, deliverableSha256}` | `DealDetailDTO` | 409 `STALE_VERSION`, 403 |
| POST `/api/deals/:id/reject` | F | client | same plus `{reason}` | `DealDetailDTO` | 409, 403 |
| POST `/api/deals/:id/release` | C | client | `{}` | `ReleaseViewDTO` | 403 `APPROVAL_REQUIRED`, 409 `RELEASE_EXISTS`/`DEADLINE_MARGIN`, 422 |
| POST `/api/deals/:id/release/check` | C | P | `{}` | `ReleaseViewDTO` | **Read-only: never calls release-early** |
| POST `/api/deals/:id/evidence/refresh` | C | P | `{}` | `DealDetailDTO` | 429. One bounded, read-only reconciliation pass; it never submits or releases. |
| GET/POST `/api/operator/deployments` | C | operator | POST: registry fields (§3.4) minus `status` | `DeploymentRegistryEntryDTO[]` / `…DTO` | 403, 422 `CAPABILITY_MISMATCH` |
| GET `/api/operator/reviews`; POST `/api/operator/reviews/:reviewId` | C | operator | `{outcome, justification, evidence: {stellarTxHash?, explorerCheckedAt?, notes}}` | `OperatorReviewDTO[]` / `…DTO` | 403 |
| GET `/api/integration/status` | C | user | — | `{paiflowConfigured: boolean, network: 'testnet' \| null}`, no secrets | — |

<a id="contract-persistence"></a>
### 3.6 Persistence interface: Francis → Carlos

**Rules for this interface:**

- **Module and boundary.** The module is `src/server/db/financial.ts` (`import "server-only"`). Every function wraps **one** Postgres function (RPC) or one read. The DB uses `now()`, row locks or `pg_advisory_xact_lock`, conditional updates, and appends ledger and audit rows **in the same transaction** (PRD §G.3, §I.11).
- **Execute grants.** RPCs are revoked from `public`/`anon`/`authenticated` and granted to `service_role` only (F-11 confirms the grant approach).
- **Result type:** `type DbResult<T> = { ok: true; value: T } | { ok: false; code: ErrorCode }`. Zero affected rows maps to a 409 code. Functions never throw for domain conflicts, and they never log XDR.

**Rules the DB enforces for Carlos (defence in depth):**

1. **Partial unique indexes.** There is one non-terminal `payment_attempts` row per deal, one `release_attempts` row per deal (`deal_id unique`), and `original_tx_hash` is unique. This covers INV-04.
2. **Column checks.** `amount_stroops` matches `^[1-9][0-9]{0,38}$`, `network = 'testnet'`, and hashes are 64 lower-hex.
3. **Write-once evidence.** `prepared_xdr`, `original_tx_hash` and `signed_xdr` are write-once (trigger). Evidence rows cannot be deleted, and there is no `DELETE` grant. This covers INV-09.
4. **No client reads of financial rows.** RLS is on, and there are **no** policies for `anon`/`authenticated` on financial tables, so only server routes read them (PRD §K.11).
5. **The DB derives expected values itself.** Expected payer, recipient, amount, asset and deployment come from the reserved deployment and current terms; caller-supplied values are only cross-checked. A mismatch is stored as `mismatch`, never `verified`. This covers INV-03.
6. **Deadline margins use `now()` in SQL.** `begin_payment_attempt` refuses inside `FUNDING_MARGIN_SECONDS`, and `begin_release_attempt` refuses inside `RELEASE_MARGIN_SECONDS` and refuses any call at or after the deadline (REQ-REF-01 AC3).
7. **Deal moves need recorded status.** Only `record_status_check` (`transactions.get` on the original hash) moves the deal on a deposit outcome. A submit response alone never does (CL-09).

```ts
// ---- Context reads (server-only rows; may include XDR) ----
getFundingContext(dealId: string, actorUserId: string): Promise<DbResult<FundingContext>>
//   FundingContext = { dealId, state, deploymentId, conditionNodeId, buyerAddress, sellerAddress,
//                      amountStroops, asset, deadlineAt, clientUserId, sellerUserId, viewerBinding: GAddress|null }
getOpenAttempt(dealId: string): Promise<PaymentAttemptRow | null>           // includes preparedXdr/signedXdr
getAttempt(attemptId: string): Promise<PaymentAttemptRow | null>
getReleaseAttempt(dealId: string): Promise<ReleaseAttemptRow | null>
listDealsNeedingReconciliation(limit: number): Promise<{ dealId: string; deploymentId: string; state: DealState }[]>

// ---- Deposit attempt lifecycle (PRD §F.2) ----
beginPaymentAttempt(i: { dealId; actorUserId; fromAddress }): Promise<DbResult<
  { outcome: 'created'; attempt: PaymentAttemptRow } | { outcome: 'existing'; attempt: PaymentAttemptRow }>>
//   locks deal; requires state ready_to_fund (created) or an open attempt (existing); actor = client;
//   active binding = buyer address; now() < deadline - margin. Created → attempt 'preparing', deal 'funding'.
recordPreparation(i: { attemptId; network: 'testnet'; networkPassphrase; preparedXdr; originalTxHash;
  historyRequestId: string | null; expiresAt: IsoUtc; feeStroops: string | null }): Promise<DbResult<PaymentAttemptRow>>  // preparing → prepared
failPreparation(i: { attemptId; code: string; requestId: string | null }): Promise<DbResult<void>>
//   only from 'preparing' (no XDR stored or released) → 'prepare_failed'; deal funding → ready_to_fund
markSignatureRequested(attemptId: string): Promise<DbResult<void>>          // prepared → signing (idempotent)
persistSignedEnvelope(i: { attemptId; actorUserId; signedXdr; signedBodyHash: string; receivedAfterExpiry: boolean }):
  Promise<DbResult<PaymentAttemptRow>>   // requires signedBodyHash = original_tx_hash; from prepared|signing|expired_unsigned
recordEnvelopeRejection(i: { attemptId; actorUserId; signedXdr; reason: 'BODY_CHANGED' | 'FEE_BUMP' | 'WRONG_SIGNER' | 'UNPARSEABLE' }):
  Promise<DbResult<void>>                // kept as evidence; attempt state unchanged
recordSubmission(i: { attemptId; requestId: string | null; outcome:
  | { kind: 'response'; status: 'SUCCESS' | 'PENDING' | 'FAILED'; txHash: string; ledger: number | null; errorCode: string | null }
  | { kind: 'transport_error'; httpStatus: number | null; code: string } }): Promise<DbResult<PaymentAttemptRow>>
//   signed_persisted|submitted|pending|unknown|rejected → submitted (+ last submit outcome); never moves the deal
recordStatusCheck(i: { attemptId; requestId: string | null; checksExhausted: boolean; lookup:
  | { kind: 'found'; status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNKNOWN' | 'REJECTED'; txHash: string; network: string; ledger: number | null }
  | { kind: 'not_found' } | { kind: 'transport_error'; httpStatus: number | null; code: string } }): Promise<DbResult<PaymentAttemptRow>>
//   SUCCESS (txHash = original, network testnet) → success; deal → funded_unindexed (or awaiting_refund + DEPOSIT_AFTER_DEADLINE)
//   FAILED → failed; deal → ready_to_fund.  PENDING/UNKNOWN/REJECTED/not_found/transport → pending|unknown|rejected.
//   checksExhausted with no final status → operator_review (attempt + deal) and opens an operator_reviews row.
markExpiredUnsigned(attemptId: string): Promise<DbResult<void>>
//   only if no signed envelope AND now() > expires_at → expired_unsigned; deal → operator_review (PRD §F.1)
recordDepositVerification(i: { attemptId; result: VerificationInput }): Promise<DbResult<void>>
//   verified → deal funded_unindexed → funded_held (deadline not passed); mismatch → operator_review

// ---- Release lifecycle (PRD §E.7, §G.5) ----
beginReleaseAttempt(i: { dealId; actorUserId }): Promise<DbResult<{ releaseAttemptId; approvalId; deploymentId;
  conditionNodeId; sellerAddress; amountStroops; requestedAt: IsoUtc }>>
//   locks deal; state approved; actor = client; approval matches CURRENT terms + deliverable versions;
//   deposit verification = verified; now() < deadline - release margin; no release_attempts row.
//   Inserts release_attempts 'requested', deal → release_requested, ledger + audit. COMMITS before Carlos calls Paiflow.
//   Errors: APPROVAL_REQUIRED, FORBIDDEN, STATE_CONFLICT, DEADLINE_MARGIN, RELEASE_EXISTS.
recordReleaseOutcome(i: { releaseAttemptId; requestId: string | null; outcome:
  | { kind: 'returned'; txHash: string; ledger: number | null; nodeId: string }
  | { kind: 'refused'; httpStatus: number; code: string; reason: 'DEADLINE_PASSED' | 'NOTHING_TO_RELEASE' | 'RATE_LIMITED' | 'OTHER'; retryAfterSeconds: number | null }
  | { kind: 'uncertain'; httpStatus: number | null; code: string } }): Promise<DbResult<ReleaseAttemptRow>>
//   returned → responded (deal stays release_requested); DEADLINE_PASSED → deal awaiting_refund;
//   NOTHING_TO_RELEASE → operator_review; RATE_LIMITED → see B-05 interim (deal release_uncertain, no retry);
//   uncertain → deal release_uncertain. Never permits a second Paiflow call.
authoriseReleaseRetry(i: { releaseAttemptId; operatorUserId; justification; evidence: Json }): Promise<DbResult<void>>
//   operator only, PRD §G.5 step 5; at most once; records the authorisation.

// ---- Evidence, events, verification (PRD §H, §G.6) ----
upsertPaiflowEvents(deploymentId: string, events: PaiflowEventRecord[]): Promise<DbResult<{ inserted: number }>>
//   PaiflowEventRecord = { eventId; id; kind; topic: string|null; ledger: number; txHash: string; occurredAt: IsoUtc; data: Json|null }
//   dedupe on event_id; stores decoded, non-secret data only
getEventCursor(deploymentId: string, scope: 'all' | `tx:${string}`): Promise<string | null>
advanceEventCursor(deploymentId, scope, expected: string | null, next: string): Promise<boolean>  // false = concurrent writer
listStoredEvents(q: { deploymentId; txHash?: string; kinds?: string[] }): Promise<PaiflowEventRecord[]>
recordPayoutVerification(i: { kind: 'release_payout' | 'refund_payout'; dealId; releaseAttemptId: string | null;
  result: VerificationInput }): Promise<DbResult<void>>
//   verified release → payout_verified; verified refund → refunded_verified; mismatch → operator_review.
//   A True-side payout after deadline or False-side payout after verified release is stored as mismatch (PRD §H.3 #11).
applyDeadlineTransitions(): Promise<DbResult<{ dealIds: string[] }>>
//   funded_unindexed|funded_held|delivered|approved with verified deposit, no release attempt, now() >= deadline → awaiting_refund
acquireReconcileLease(key: string, holder: string, ttlSeconds: number): Promise<boolean>
releaseReconcileLease(key: string, holder: string): Promise<void>
consumeReconcileBudget(dealId: string): Promise<{ allowed: boolean; retryAfterSeconds: number }>  // 40 / deal / hour

// VerificationInput = { state: VerificationState; stellarTxHash: string | null; expectedAddress: GAddress;
//   expectedAmountStroops: string; observedAmountStroops: string | null; asset: AssetRef; eventIds: string[];
//   checks: Record<'finality'|'originalHash'|'deployment'|'network'|'event'|'party'|'asset'|'amount'|'direction', 'pass'|'fail'|'pending'>;
//   note: string | null }

// ---- Registry and operator (REQ-DEP-01, PRD §D.1) ----
registerDeployment(i: Omit<DeploymentRegistryEntryDTO, 'status' | 'registeredAt'> & { operatorUserId;
  capabilitySnapshot: Json; status: 'available' | 'unusable' }): Promise<DbResult<DeploymentRegistryEntryDTO>>
setDeploymentStatus(i: { operatorUserId; deploymentId; status: 'unusable' | 'retired'; reason }): Promise<DbResult<void>>
listDeployments(): Promise<DeploymentRegistryEntryDTO[]>
openOperatorReview(i: { scope; refId; dealId; reason }): Promise<DbResult<{ reviewId }>>
listOperatorReviews(): Promise<OperatorReviewDTO[]>
resolveOperatorReview(i: { reviewId; operatorUserId; outcome: 'deposit_success_confirmed' | 'deposit_failed_confirmed' |
  'not_broadcast_ledger_proven' | 'payout_confirmed' | 'refund_confirmed' | 'release_retry_authorised' | 'no_action';
  justification: string; evidence: Json }): Promise<DbResult<void>>

// ---- Wallet summary reads (REQ-WAL-01) ----
getWalletContext(userId: string): Promise<{ binding: { address; verifiedAt } | null;
  escrow: WalletSummaryDTO['escrow']; history: Omit<WalletSummaryDTO['history'][number], 'explorerUrl'>[];
  verifiedTotals: WalletSummaryDTO['verifiedPayouts'] }>
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

useFundEscrow(dealId: string): {
  phase: 'idle' | 'preparing' | 'review' | 'awaiting_signature' | 'submitting' | 'checking'
       | 'confirmed' | 'failed' | 'unresolved' | 'expired' | 'wallet_changed' | 'error';
  review: Omit<FundingReviewDTO, 'xdr' | 'networkPassphrase'> | null;  // what the modal shows
  attempt: FundingAttemptViewDTO | null; busy: boolean; error: SafeError | null;
  start(): Promise<void>;          // POST fund/prepare (returns existing attempt if any)
  signAndSubmit(): Promise<void>;  // explicit user consent click → Freighter signTransaction → POST fund/submit
  checkOriginal(): Promise<void>;  // read-only POST fund/check; bounded (≤6 lookups / 30 s, Retry-After)
  resubmitSameEnvelope(): Promise<void>; // separate explicit button + confirm dialog → POST fund/resubmit
  stopChecking(): void }

useRelease(dealId: string): { phase: 'idle' | 'requesting' | 'responded' | 'uncertain' | 'refused' | 'verified' | 'error';
  release: ReleaseViewDTO | null; busy: boolean; error: SafeError | null;
  requestRelease(): Promise<void>; // single POST release; the hook never calls it twice
  checkEvidence(): Promise<void> } // read-only POST release/check

useDealEvidence(dealId: string, opts?: { auto?: boolean }): { deal: DealDetailDTO | null; loading: boolean;
  refreshing: boolean; lastRefreshedAt: IsoUtc | null; error: SafeError | null;
  reload(): Promise<void>;         // GET /api/deals/:id (F route) — pure read
  refreshEvidence(): Promise<void> } // POST evidence/refresh; ≥15 s apart; auto stops at terminal states

useWalletSummary(): { data: WalletSummaryDTO | null; loading: boolean; error: SafeError | null; reload(): Promise<void> }

useOperatorConsole(): { deployments: DeploymentRegistryEntryDTO[]; reviews: OperatorReviewDTO[];
  registerDeployment(input): Promise<void>; resolveReview(id, input): Promise<void>; reload(): Promise<void>; error: SafeError | null }

// Mode switch: getControllerMode(): 'live' | 'fixture'. Fixture mode only when NEXT_PUBLIC_CYFER_FIXTURES === '1'
// AND NODE_ENV !== 'production'; Shanti renders a persistent "FIXTURE DATA — not Testnet" banner when 'fixture'.
```

<a id="contract-visibility"></a>
### 3.8 Browser-visible vs server-only data

| Server-only, never sent to the browser or logged | Browser-visible to participants/operator only | Never stored anywhere in CYFER |
|---|---|---|
| `PAIFLOW_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, reconcile trigger secret | Deal fields, terms hash, deliverable hashes, party display names and G-addresses | Wallet secret keys, seed phrases |
| `signed_xdr` (never returned after submit), `history_request_id`, Paiflow `x-request-id` (operator console may show it) | Deployment UUID, deadline, asset, network | Event access code |
| `prepared_xdr` after the first prepare response (the only exception, CL-06: returned to the owning client while `prepared`/`signing` and unexpired) | Stellar tx hashes, explorer links, verification states, event IDs | |
| Storage object keys, raw Paiflow error bodies, SQL errors, other users' emails, internal user IDs of non-viewers | Signed download URLs (≤ 5 min, attachment disposition) | |
| Challenge nonces of other users | The viewer's own challenge `message` | |

<a id="contract-fixtures"></a>
### 3.9 Fixtures, mocks and clarifications

**Fixtures (`src/contracts/fixtures/**`, Francis, delivered in F-01):**

- **Contents.** `dealDetailFixture(state)` covers every `DealState` (including `release_uncertain`, `operator_review` and mismatch), plus `walletSummaryFixture(kind: 'ok' | 'unavailable' | 'empty')`, `fundingReviewFixture`, `verifyFileFixture(match)`, `sessionFixture(binding?)` and `errorFixture(code)`.
- **Markers.** Every fixture title starts with `[FIXTURE]`. Fixture UUIDs start with `00000000-0000-4000-8000-`. Fixture hashes are `000…0001`-style hex that cannot resolve on an explorer.
- **Mocks** are Carlos's `src/client/controllers/mock/**` (C-05), which implements §3.7 over these fixtures and simulates phases with timers.
- **Replacing mocks.** Mocks are replaced when Shanti's screens switch to live mode (S-21, gate G4).
- **Proof of replacement** is G4 evidence:
  1. `npm run build` passes with `NEXT_PUBLIC_CYFER_FIXTURES` unset.
  2. Carlos's bundle scan finds no `[FIXTURE]` marker and no credential markers (C-18).
  3. A screenshot of the deal page shows a real deployment UUID and a deposit hash that opens on Stellar Expert (testnet).
  4. The fixture banner is absent.

**Clarifications to the PRD's proposed design.** These do not change any requirement; they are recorded here and transcribed to the PRD later.

| ID | Clarification | Why |
|---|---|---|
| CL-01 | `rejected_deliverable` is a transition, not a stored deal state | PRD §F.1 says it "returns to funded_held" |
| CL-02 | New attempt states `preparing` and `prepare_failed` | A Postgres lock cannot span the external prepare call. Inserting `preparing` first makes the partial unique index the guard. `prepare_failed` is safe only because the XDR never reached the browser. |
| CL-03 | PRD §I.5 `failed_recorded` = `failed`; `reconciled` carries a `resolution` set by an operator | Consistent naming |
| CL-04 | Release attempt states (§3.2) | PRD §I.7 lists a `state` column without values |
| CL-05 | PRD's single `fund/check` (check + resubmit) is split into a read-only `fund/check` and an explicit-intent `fund/resubmit` | The brief: a check must never silently resubmit |
| CL-06 | Repeated `fund/prepare` returns the same unexpired XDR of the open attempt | REQ-ESC-01 AC4 "returns the existing attempt" |
| CL-07 | New table `paiflow_events` (decoded, non-secret, unique `event_id`) | Durable dedupe and the basis for wallet history and §H checks |
| CL-08 | New table `reconcile_leases` plus a per-deal poll budget | Prevents concurrent pollers; PRD §G.6 caps |
| CL-09 | Only a transaction-status lookup on the original hash moves the deal on deposit outcome; a submit response alone never does | Conservative reading of PRD §G.1 and §G.4 |
| CL-10 | New routes `GET /api/deals`, `GET /api/deployments/match`, `GET …/deliverables/:v/download`, `POST …/release/check`, `POST …/evidence/refresh`, `POST /api/wallet/unbind`, `GET /api/operator/reviews`, `GET /api/integration/status`, and `auth/*` | Needed by the screens in PRD §J; not listed in PRD §I.14 |
| CL-11 | Exactly one `available` deployment may match a deal (`AMBIGUOUS_DEPLOYMENT_MATCH` otherwise). Operators register rehearsal and live deployments sequentially. | REQ-DEP-01 AC4 forbids browser choice |
| CL-12 | Capabilities do not return recipient addresses (llms.md §4), so the registry's seller, buyer and deadline values are **operator-attested** from Shanti's handoff (two-person check). They are confirmed only by a verified payout in rehearsal. | Honest limit of REQ-DEP-01 verification |

<a id="change-requests"></a>
### 3.10 Change-request log

| CR | Date/time | Requester | Change | Decision | Commit |
|---|---|---|---|---|---|
| — | — | — | (none yet) | — | — |

---

## 4. Handoff register (canonical)

Each producer marks a handoff delivered in their own evidence log, and the consumer confirms it in theirs.

| ID | Producer → consumer | Deliverable | Needed by |
|---|---|---|---|
| HO-01 | Francis → Carlos, Shanti | `src/contracts/**` incl. fixtures, plus `src/client/http.ts` merged (F-01) | C-03…C-16, S-10…S-24 |
| HO-02 | Carlos → Francis, Shanti | Toolchain decision (Node version), dependency set installed, `npm test`/`typecheck` scripts (C-01) | F-13, F-21, S tests |
| HO-03 | Carlos → Francis | Q-08 result: Freighter `signMessage` encoding and server verification recipe (C-02) | F-13 |
| HO-04 | Carlos → Francis | Q-06, Q-07, Q-11 results and release-early guarantees (C-02), so Francis can adjust verification columns | F-07, F-11 |
| HO-05 | Francis → Carlos | `src/server/db/financial.ts` compiled against §3.6, with tests on mocked RPC results (F-11) | C-07…C-14, C-17 |
| HO-06 | Carlos → Shanti | Mock controllers (C-05) | S-12…S-22 |
| HO-07 | Shanti → Carlos | Non-secret deployment handoff records for F1, R1 and D1 (S-02, S-03, S-05) | C-06, C-19, C-20 |
| HO-08 | Shanti → Carlos (secure, out of band) | Read and operate token delivered **directly** to the credential custodian (S-04) | C-03 live checks |
| HO-09 | Francis → all | Migrations applied to the agreed database (⚠ AUTH), demo accounts and operator flag provisioned (F-18, F-19) | G2, C-06, S-11 |
| HO-10 | Carlos → Shanti | Real controllers plus an integration example for each hook (C-16) | S-21, G4 |
| HO-11 | Francis → Carlos | Business routes live: deals, terms, deliverables, approvals (F-14…F-16) | C-19 rehearsal |
| HO-12 | Shanti → Francis | Government pages and navigation removed; no page imports inherited API routes or `src/lib/types.ts` (S-10) | F-20 |

**Dependency graph (acyclic).** Arrows point from prerequisite to dependent.

```
F-01 ─┬─> C-03,C-04,C-05 ─> S-12..S-20 (fixtures)
      ├─> F-05..F-11 ─> F-19(⚠) ─> G2
      └─> S-10,S-11
C-01 ─> C-02 ─> F-13 ;  C-02 ─> F-07/F-11 (columns)
S-01 ─> S-02 ─> HO-07(F1) ;  S-03 ─> HO-07(R1,D1) ; S-04 ─> C-03(live)
F-11 ─> C-07..C-14 ─> C-16 ─> S-21 ─> G4
F-13 + C-02(a) ─> G2 ;  G2 ─> G3 ─> G4 (G3 needs F-12..F-17 and C-03..C-17)
G2 + G3 + G4 + HO-11 ─> C-19 (G5) ;  S-02 + C-13 ─> C-20 (G6)
G5 ─> G7 ;  G5 + G6 + S-24 ─> G8
```

---

## 5. Blockers and investigations (canonical)

| ID | Question (PRD ref) | Owner | Investigation task | Conservative interim behaviour | Unblocks |
|---|---|---|---|---|---|
| B-01 | Q-10: what is in the live Supabase schema? Code reads `approvals.budget_id` and `budget_data.status`, which migration 001 does not define (C-09). | Francis | F-02 (read-only) | New migrations create only new `sme`-prefixed or new-named objects and never alter inherited tables, except the additive `transactions` columns after inventory | F-05…F-09, F-19 |
| B-02 | Which database do we migrate: the shared project or a dedicated new project? | Francis (team decision) | F-04 | Write migrations; apply nothing until ⚠ AUTH | F-19, G2 |
| B-03 | Q-08: Freighter `signMessage` encoding and server verification library | Carlos confirms, Francis consumes | C-02 → F-13 | **Docs answer, checked in planning:** Freighter docs say `signMessage` returns a base64 Ed25519 signature following SEP-53. `@stellar/freighter-api@6.0.1` types allow `signedMessage: string` (current) or `Buffer` (older extension). `@stellar/stellar-sdk@17.2.1` exposes `Keypair.fromPublicKey(addr).verifyMessage(message, signatureBytes)`, which needs bytes, not a base64 string. **C-02 must still confirm this with a real Freighter signature.** Until then, no binding is accepted without verification, and binding on connection alone is never allowed. If it is unconfirmed at CP-2, binding is blocked (D-10) and the team escalates. | REQ-ACC-02, G2 |
| B-04 | Q-06/Q-11: release-early hash lookup and the real RECEIVE/PAYOUT payloads | Carlos | C-02, then rehearsal | **Docs answer, checked in planning:**<ul><li>OpenAPI 1.2.0 says `transactions.get` covers "early-release audit records". Statuses are `SUCCESS`, `FAILED`, `PENDING`, `UNKNOWN` and `REJECTED`. An unattributed hash returns HTTP **404**, which "does not prove the transaction failed". There is no `NOT_FOUND` status value.</li><li>Event items carry **no `nodeId`**. Decoded `data`, taken from Paiflow source code (not a published contract):<ul><li>deposit: `RECEIVE`/`deposit` `{from, amount, asset}`</li><li>timelock: `RECEIVE`/`receive` `{asset, amount}`</li><li>release: `PAYOUT`/`release` `{admin, branch:"before"\|"after", balance}`, with no recipient</li><li>Pay: `PAYOUT`/`pay` `{recipient, asset, payment}`, where the amount field is `payment`</li></ul></li></ul>**Interim:** these shapes are treated as unconfirmed until the R1 rehearsal records real events. Verification stays `awaiting_events` or `operator_review`. A missing field never defaults to "pass", and missing events alone never mark funds held or paid. | REQ-PAY-01, G5 |
| B-05 | Release-early guarantees (D-07) | Carlos | C-02 | **Docs answer:**<ul><li>The SDK `releaseEarly({nodeId})` "returns once it is final".</li><li>There is no Idempotency-Key, no reconcile endpoint and no 409.</li><li>Errors are 422 (`deadline has passed`, `nothing to release`), 429 and 502. A 502 may carry the txHash in `details`.</li><li>"The SDK never … retries."</li></ul>**Still unverified:** whether a 429 proves nothing was processed. **Interim (unchanged):** no automatic or user retry. 429, timeout, 502 and lost responses go to `release_uncertain`, then evidence checks on any hash plus events filtered by `txHash`. A second call needs an operator, via `authoriseReleaseRetry`, after positive evidence that funds are still held (B-08) and no True-side payout exists. Absence of a payout event alone is never sufficient. The PRD's 429 retry clause is **not** implemented until verified. | REQ-REL-01 |
| B-06 | Where does bounded reconciliation run (scheduler/runtime)? Deadline transitions and refund polling need a server owner. | Carlos | C-13 | Server-side `evidence/refresh` triggered by participants or operator, plus a single server-side interval worker on the demo server process (lease-guarded). No browser polling loop makes financial decisions. | REQ-REF-01, G6 |
| B-07 | Q-01/Q-02: who holds the Paiflow token, and which people and wallets play client, seller, deployer and operator? | Team; Shanti runs, Carlos is custodian | S-01, S-04 | Proposed: Carlos is the token custodian and operator account; Shanti's Freighter holds the deployer key. Client and seller are separate Freighter accounts on the demo machine. All are Testnet-only. | S-02…S-04, F-18 |
| B-08 | Q-07: is there reliable held-balance evidence? | Carlos | C-02, then rehearsal | **Docs answer:** SDK `deployment.balances.get()` (`GET …/balances`) returns per-node `{nodeId, templateKind, balanceStroops, stale, readAt}` with a `freshness` status. Time conditions are listed as supported candidates; `TIMELOCK_BRANCH` is inferred from source, not confirmed live. The docs say balances are "not … evidence of payment success". **Interim:** "Held in escrow" means verified deposit + no payout event + before the deadline (PRD §H.4). A fresh, non-stale balance read of the condition node may be recorded as **supporting** evidence only after C-02 confirms it live. The UI never shows a contract balance figure as the escrow amount. | REQ-WAL-01, B-05 |
| B-09 | Q-09: demo deadlines for F1, R1 and D1 | Shanti + Carlos | S-01 | Recommended in Shanti §2.2 | S-02, S-03 |
| B-10 | Runtime compatibility | Carlos | C-01 | **The facts:**<ul><li>This planning machine runs Node v24.12.0.</li><li>`@paiflow/sdk@0.2.0` declares `engines.node ">=22.22.2 <23"` and is **ESM-only**.</li><li>`@stellar/stellar-sdk@17.2.1` requires Node `>=22.12.0`.</li><li>The official starter uses Next 15.5; this repo uses **Next 16.1.6**, and **SDK compatibility with Next 16 is unverified**.</li></ul>**Interim:** use Node 22.22.2 (nvm-windows) on every machine that runs the server. Keep the SDK in Node-runtime, `server-only` modules. If the Next 16 build fails with the SDK, Carlos reports it and the team decides (CR); no silent framework downgrade. | C-03 |
| B-11 | Session mechanism (cookie via `@supabase/ssr` vs bearer token) | Francis | F-03 | No `localStorage` token for SME routes (PRD §K.12) | F-12 |
| B-12 | DB test environment (local Supabase/Docker vs dedicated dev project) | Francis | F-04 | RPC behaviour is tested on a dedicated non-shared DB after ⚠ AUTH. Before that, only mocked-RPC route tests run, and they are labelled Mocked. | F-21, G7 |

---

## 6. Gates

**Gate index.** Each gate has one canonical definition, and the other documents link to it.

| Gate | Owner | Canonical definition |
|---|---|---|
| G1 Shared contracts agreed | Francis | [below](#g1) |
| G2 Schema/auth foundation + manual flow configuration ready | Francis | [below](#g2) |
| G3 Backend routes + headless wallet/payment verified with fixtures | Carlos | [CARLOS G3](CARLOS-PHASETASK.md#g3) |
| G4 UI connected to real routes and controllers | Shanti | [SHANTI G4](SHANTI-PHASETASK.md#g4) |
| G5 E2E deposit → delivery → approval → verified payout + recovery | Carlos | [CARLOS G5](CARLOS-PHASETASK.md#g5) |
| G6 Separate refund rehearsal verified | Carlos | [CARLOS G6](CARLOS-PHASETASK.md#g6) |
| G7 Security, privacy, credential isolation, negative paths | Francis | [below](#g7) |
| G8 Three-minute demo rehearsed with evidence | Shanti | [SHANTI G8](SHANTI-PHASETASK.md#g8) |

The MVP is complete only when G1–G7 pass **and** the Testnet rehearsal T-01…T-07 has recorded hashes (PRD §L.1). G8 is the pitch-readiness gate. SHOULD and STRETCH items never block a gate.

<a id="g1"></a>
### G1 — Shared contracts agreed and boundaries established

- **Owner:** Francis.
- **Prerequisites:** F-01 merged (HO-01); this document's §2–§5 read by Carlos and Shanti.
- **Pass criteria:**
  - [ ] Carlos confirms §3.6 covers every persistence need of C-07…C-14, or files CRs.
  - [ ] Shanti confirms §3.4 and §3.7 cover every screen in her §3.
  - [ ] Ownership matrix §2 is accepted, with no file claimed by two people.
  - [ ] `npm run lint` and `npm run build` pass on `main` with `src/contracts/**` present.
- **Evidence:** a time-stamped note in §11 naming the three confirmations, the merged commit hash, and any CR IDs.

<a id="g2"></a>
### G2 — Schema/auth foundation and manual flow configuration ready

- **Owner:** Francis (accountable). Shanti supplies the flow evidence; Carlos supplies the capability-check evidence.
- **Prerequisites:** G1; F-02, F-03, F-05…F-13; C-02(a) (a real Freighter signature, from Carlos's scratch page or Shanti's S-12 screen); S-02/S-03 deployments CONFIRMED; S-04 token delivered.
- **Pass criteria:**
  - [ ] Migrations are applied to the **agreed** database under ⚠ AUTH (F-19). Every new table has RLS on, and financial tables have no client policies.
  - [ ] The sign-in route returns a session for the provisioned demo accounts. Unauthenticated calls to an SME route return 401.
  - [ ] Wallet binding works end to end with a real Freighter signature. A replayed challenge is refused (REQ-ACC-02 AC1). Under B-03, if it is not done, G2 fails.
  - [ ] Shanti's handoff record exists for at least F1 and R1 (deployment UUID, node ID, deadline, asset, parties, CONFIRMED).
  - [ ] Carlos's capability check passes for the registered deployment(s): network testnet, deposit trigger, native input, execute and releaseEarly not `unsupported`.
- **Evidence:** migration file names plus who authorised them and when, table/policy listing output, a 401 test output, the binding row ID and address (public), a link to Shanti's handoff entries, and Carlos's capability-check output (no token).

<a id="g7"></a>
### G7 — Security, privacy, credential isolation and negative paths

- **Owner:** Francis. Carlos runs C-18 and supplies its output.
- **Prerequisites:** G5.
- **Pass criteria (each with test output or a recorded manual check):**
  - [ ] 401 on every deal, deliverable, approval, payment and release route without a session (REQ-ACC-01 AC1).
  - [ ] 403 for non-participants. The seller cannot approve or release (T-09), and Paiflow is **not** called (mock call count = 0).
  - [ ] RLS: an `anon` or `authenticated` client cannot select `payment_attempts`, `release_attempts`, `wallet_challenges` or deliverable objects.
  - [ ] A private deliverable is not fetchable without a session or a ≤ 5 min signed URL (REQ-DLV-01 AC1).
  - [ ] Concurrency: concurrent reservations, approvals or releases each produce exactly one winner (mocked RPC concurrency where B-12 is unresolved; real DB if authorised).
  - [ ] Carlos's bundle scan: no `pfd_`/`pfk_` token, `PAIFLOW_API_TOKEN`, service-role key or SDK runtime in `.next/static`, and no `[FIXTURE]` marker in the production build.
  - [ ] Logs reviewed during rehearsal contain no token, XDR or signed envelope.
  - [ ] Copy review: no "tampered", no "paid"/"refunded" before verification, CYFER audit hash never labelled as a Stellar hash, and no "immutable"/"anchored on Stellar" claims.
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
| E | F-23…F-25 | Optional; never blocks the MVP |

### Phase A — Contracts and investigations (start immediately)

- [ ] **F-00 Run checkpoint CP-1 and record G1**
  - **Requirements:** all MVP requirements.
  - **Purpose and deliverable:** agreement on §2–§5. The deliverable is the G1 evidence entry.
  - **Owns:** this document.
  - **Depends on:** F-01. Carlos and Shanti attend.
  - **Acceptance:** [G1](#g1) criteria.
  - **Verification and evidence:** a note in §11.

- [ ] **F-01 Publish shared contracts in code**
  - **Requirements:** REQ-ACC-01/02, DEP-01, DEAL-01/02, ESC-01/02, DLV-01/02, APR-01, REL-01, REF-01, PAY-01, REC-01, WAL-01.
  - **Purpose and deliverable:** `src/contracts/{states,errors,dto,api,controllers,state-copy,limits,canonical}.ts`, `src/contracts/fixtures/**`, and `src/client/http.ts`, mirroring §3. `canonical.ts` provides `canonicalJson()` (sorted keys, no whitespace, stroop strings) for the terms hash and the deployment graph snapshot hash.
  - **Owns:** those paths.
  - **Depends on:** nothing. **Handoff HO-01.**
  - **Acceptance:**
    - Types compile.
    - Fixtures cover every `DealState` and the three wallet-summary kinds.
    - Fixtures carry the `[FIXTURE]` marker.
    - `canonicalJson` gives identical output for permuted key order.
    - There is no runtime import of server code.
  - **Verification:** `npm run lint` and `npm run build`. A canonical-JSON unit test is added after C-01 provides Vitest.
  - **Evidence:** commit hash and command output.

- [ ] **F-02 Read-only live schema inventory (Q-10, B-01)**
  - **Requirements:** PRD §I.13.1, C-09.
  - **Purpose and deliverable:** a list of the live tables, columns, constraints, policies, functions and buckets in the current Supabase project, using only read-only `information_schema`/`pg_catalog` queries in the SQL editor or via the MCP once it reconnects.
  - **Owns:** findings in §11.
  - **Depends on:** Supabase dashboard access.
  - **Acceptance:**
    - The drift around `approvals.budget_id`, `budget_data.status` and `documents` bucket publicity is answered yes or no.
    - No write was executed.
  - **Verification:** saved query text plus a result summary (no data rows containing personal data).
  - **Blocking question:** which project is "shared"? (B-02)

- [ ] **F-03 Decide and specify session handling (B-11)**
  - **Requirements:** REQ-ACC-01.
  - **Purpose and deliverable:** a decision note on how sessions work. The preferred option is HTTP-only cookie sessions via `@supabase/ssr` (request it per §1.3). The alternative is a bearer token held only in memory. Never `localStorage`.
  - **Owns:** decision in §11; later `src/server/auth/**`.
  - **Depends on:** C-01 for the package. Check the Supabase docs for `@supabase/ssr` with Next.js 16 route handlers.
  - **Acceptance:**
    - The note covers sign-in, sign-out, how a route reads the session, and the expiry behaviour (401).
    - The UI contract in §3.5 is unchanged.
  - **Verification:** a short spike route in a branch.
  - **Evidence:** the decision note.

- [ ] **F-04 Decide the DB test environment (B-02, B-12)**
  - **Requirements:** PRD §M.1, Claude.md DB rule.
  - **Purpose and deliverable:** choose between (a) local Supabase via the CLI and Docker (check that Docker exists; the `supabase` CLI is a dev dependency request to Carlos) and (b) a dedicated, disposable Supabase project. Record which project the demo uses.
  - **Owns:** decision in §11.
  - **Acceptance:**
    - The team approves the decision in chat (⚠ AUTH).
    - Nothing is applied before approval.
  - **Evidence:** the decision note, with the authoriser's name and time.

### Phase B — Schema and RPCs (write files; do not apply until F-19)

- [ ] **F-05 Migration 002: identity and wallet bindings**
  - **Requirements:** REQ-ACC-01, REQ-ACC-02 AC1–AC4.
  - **Deliverable:** `supabase/migrations/002_sme_identity_wallets.sql`, containing:
    - `profiles(user_id → auth.users, display_name, is_operator default false)`, with the flag settable only by migration or service role
    - `wallet_challenges(id, user_id, address, nonce unique, purpose 'wallet-binding', origin, expires_at, consumed_at)`
    - `wallet_bindings(…)` with the address regex check, a `network = 'testnet'` check, and a unique partial index on `address WHERE revoked_at IS NULL`
    - RLS enabled. A user may select their own profile and binding through `(select auth.uid())`. There are no client writes.
    - RPCs: `issue_wallet_challenge`, `consume_challenge_and_bind` (atomic consume, `consumed_at IS NULL AND expires_at > now()`), and `unbind_wallet`, which refuses while the address belongs to a non-terminal deal.
  - **Owns:** the file and its objects.
  - **Depends on:** F-02.
  - **Acceptance:** the replay, wrong-signer and unique-address rules are enforceable in SQL; the signature itself is checked in F-13.
  - **Verification:** SQL review; tests in F-21.
  - **Evidence:** file path and review note.

- [ ] **F-06 Migration 003: deployments, reservations, deals, terms**
  - **Requirements:** REQ-DEP-01 AC1–AC4, REQ-DEAL-01/02.
  - **Deliverable:** `003_sme_deployments_deals.sql`, containing:
    - `paiflow_deployments` (PRD §I.4 plus `capability_snapshot jsonb`), with no credential columns
    - `deployment_reservations`, with a unique partial index `(deployment_id) WHERE active`
    - `deals`, `deal_terms_versions` (stroops check, `unique(deal_id, version)`), `terms_acceptances`, and `deal_state_transitions` (from, to, actor, at, reason) for the timeline
    - RLS: participants can select their deals, terms and acceptances. There are no client writes.
  - **Depends on:** F-05.
  - **Acceptance:**
    - A past-deadline deployment cannot be reserved.
    - There is one active reservation per deployment.
    - Amounts are stored only as integer stroop strings.
  - **Verification and evidence:** as F-05.

- [ ] **F-07 Migration 004: financial evidence tables (for Carlos)**
  - **Requirements:** REQ-ESC-01/02, REL-01, REF-01, PAY-01, REC-01, INV-01…INV-10.
  - **Deliverable:** `004_sme_financial_evidence.sql`, containing:
    - `payment_attempts` (PRD §I.5 plus `fee_stroops`, `resolution`, `signature_requested_at`, `submit_outcome jsonb`), with a unique `original_tx_hash` and a partial unique `(deal_id) WHERE state NOT IN ('success','failed','prepare_failed','reconciled')`
    - write-once triggers on the XDR and hash columns
    - `payment_envelope_rejections`
    - `release_attempts` (`deal_id unique`, CL-04 states, `refusal_code`, `request_id`, `retry_authorised_by`, `retry_authorised_at`)
    - `payout_verifications` (PRD §I.9 plus `kind` and `checks jsonb`)
    - `paiflow_events` (`event_id` primary key, CL-07)
    - `event_cursors`
    - `reconcile_leases`
    - `operator_reviews`
    - RLS on, with **no** client policies, and no `DELETE` grants.
  - **Depends on:** F-06, HO-04 (adjust event and verification columns once C-02 reports Q-06/Q-11; until then keep `data jsonb` generic).
  - **Acceptance:** every rule in the §3.6 "DB enforces" list is expressible.
  - **Blocking question:** B-04 payload fields.

- [ ] **F-08 Migration 005: deliverables, approvals, private bucket**
  - **Requirements:** REQ-DLV-01, REQ-APR-01, PRD §K.6.
  - **Deliverable:** `005_sme_deliverables_approvals.sql`, containing:
    - `deliverable_versions` (`unique(deal_id, version)`)
    - `deal_approvals` (`unique(deal_id, deliverable_version_id, approver_user_id)`)
    - storage bucket `deliverables` with `public = false` and **no** client object policies (server uses service role and signed URLs)
    - RLS on the tables for participant select
  - **Depends on:** F-06.
  - **Acceptance:**
    - The bucket is private.
    - Storage keys are server-generated, e.g. `deals/{dealId}/v{n}/{uuid}`, with no user filename in the path.

- [ ] **F-09 Migration 006: ledger and audit concurrency fix**
  - **Requirements:** PRD §I.10, §I.11, §K.9, D-09.
  - **Deliverable:** `006_sme_ledger_audit.sql`, containing:
    - additive `transactions` columns `deal_id`, `org_id`, `actor_user_id`, `hash_input jsonb`, with new `action_type` values (PRD §I.10) added after the F-02 inventory confirms the existing check constraint
    - function `append_evidence(p_action, p_deal, p_actor, p_payload jsonb)`, which takes `pg_advisory_xact_lock` on the chain tail, computes the block hash and audit hash **in SQL** over stored inputs (including the exact timestamp used), and inserts both
  - **Owns:** also `src/server/db/evidence.ts`, which replaces the role of [src/lib/blockchain.ts](../src/lib/blockchain.ts) and [src/lib/audit.ts](../src/lib/audit.ts) for SME flows. The anon-key replica broadcast is excluded.
  - **Acceptance:**
    - Concurrent appends never fork the chain.
    - Each audit hash is recomputable from the stored `hash_input`.
    - The UI label is "CYFER audit hash".
  - **Blocking question:** B-01 (the existing constraint shape).

- [ ] **F-10 Business RPCs**
  - **Requirements:** REQ-DEAL-01/02, DEP-01, DLV-01, APR-01.
  - **Deliverable:** these SQL functions, each locking the deal row and appending evidence in the same transaction:
    - `create_deal(p_actor, p_input jsonb)`: one exact available match (CL-11), reserve, terms v1, deal → `terms_pending`
    - `create_terms_version`: refused once any payment attempt exists; voids acceptances and approvals
    - `accept_terms`: hash must equal the current version; when both parties have accepted → `ready_to_fund`
    - `record_deliverable_version`: requires `funded_held`/`funded_unindexed` and a future deadline; sets the deal → `delivered`
    - `decide_deliverable`: requires the current versions and the client; approve → `approved`, reject → `funded_held`
  - **Depends on:** F-06, F-08, F-09.
  - **Acceptance:** REQ-DEAL-02 AC1/AC2, REQ-APR-01 AC1–AC4 and REQ-DEP-01 AC1–AC3 are each covered by a test (F-21).

- [ ] **F-11 Financial persistence RPCs and `src/server/db/financial.ts` (HO-05)**
  - **Requirements:** REQ-ESC-01/02, REL-01, REF-01, PAY-01, REC-01, DEP-01, INV-01…INV-10.
  - **Deliverable:** SQL functions plus the TypeScript wrappers in §3.6, exactly as named; grants to `service_role` only; mocked-result unit tests.
  - **Owns:** the functions and `src/server/db/financial.ts`, `src/server/db/client.ts`.
  - **Depends on:** F-07, F-09, HO-04.
  - **Handoff:** HO-05 to Carlos.
  - **Acceptance (each with a test or SQL proof):**
    - `beginPaymentAttempt` twice returns `existing`.
    - `persistSignedEnvelope` refuses a different body hash.
    - `recordSubmission` never moves the deal.
    - `recordStatusCheck` (`not_found`) never unlocks a new prepare.
    - `markExpiredUnsigned` refuses when a signed envelope exists.
    - `beginReleaseAttempt` refuses without a current approval, inside the margin, and when a release attempt exists.
    - `recordReleaseOutcome` never produces a state that permits a second call.
    - `recordPayoutVerification` stores a wrong-recipient or wrong-amount result as `mismatch`.
  - **Blocking questions:** B-04, B-05.

### Phase C — Routes and provisioning

- [ ] **F-12 Server HTTP and auth foundation**
  - **Requirements:** REQ-ACC-01 AC1–AC3, PRD §K.3, §K.5.
  - **Deliverable:**
    - `src/server/http/{json,multipart,origin,respond,rate-limit}.ts`, ported from starter `lib/http.ts` and `lib/payment-rate-limit.ts` with per-action buckets (prepare, submit, check, release, upload, verify, challenge)
    - `src/server/auth/{session,guards}.ts`: `requireUser`, `requireParticipant(dealId)`, `requireClient`, `requireSeller`, `requireOperator`. Inherited `admin`/`super_admin` roles grant nothing.
  - **Depends on:** F-03, F-05.
  - **Handoff:** Carlos's routes import these helpers.
  - **Acceptance:**
    - 401 without a session.
    - 403 for non-participants.
    - Oversize bodies return 413 before parsing.
    - A cross-origin mutation returns 403.
  - **Verification:** route tests (F-21).

- [ ] **F-13 Wallet challenge, bind and unbind routes, with server verification**
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
    - An address already bound to another account → 409.
    - Unbind during a non-terminal deal → 409.
  - **Verification:** unit tests with deterministic test keypairs generated in-test (never committed secrets), then a manual Testnet Freighter binding (T-01).
  - **Evidence:** test output; binding row ID and public address.

- [ ] **F-14 Deal, terms and acceptance routes, plus deployment match**
  - **Requirements:** REQ-DEAL-01 AC1–AC3, DEAL-02, DEP-01 AC2/AC4.
  - **Deliverable:** `deals`, `deals/[id]`, `deals/[id]/terms`, `…/terms/[version]/accept`, and `deployments/match` per §3.5; `src/client/api/business.ts` fetchers.
  - **Depends on:** F-10, F-12.
  - **Handoff:** HO-11.
  - **Acceptance:**
    - Identical terms → identical hash.
    - Funding is blocked until both parties accept.
    - Mismatched wallets → 409 `NO_MATCHING_DEPLOYMENT`.
    - The deployment is never taken from browser input.

- [ ] **F-15 Deliverable upload, download and verify-file**
  - **Requirements:** REQ-DLV-01 AC1–AC3, REQ-DLV-02 AC1–AC4, PRD §K.6.
  - **Deliverable:**
    - `src/server/deliverables/**`: a streaming size limit before full buffering where possible; a type allowlist (PDF, PNG, JPEG, ZIP, TXT, DOCX) checked against both the declared type and magic bytes where feasible; server-side SHA-256; a private upload; the row written only after the storage write succeeds; an orphan cleanup note.
    - Routes `deliverables`, `deliverables/[version]/download` (signed URL ≤ 300 s, `Content-Disposition: attachment`) and `verify-file`, which compares only with the selected version of the same deal.
  - **Depends on:** F-08, F-10, F-12.
  - **Acceptance:**
    - A 1-byte change → `match:false`.
    - Response copy never says "tampered".
    - Another deal's version → 403.
    - 413/415 limits hold.
    - The rate limit applies.

- [ ] **F-16 Approve and reject routes**
  - **Requirements:** REQ-APR-01 AC1–AC4.
  - **Deliverable:** `deals/[id]/approve`, `deals/[id]/reject`, calling `decide_deliverable`.
  - **Depends on:** F-10, F-12.
  - **Acceptance:**
    - Approving v1 after v2 exists → 409 `STALE_VERSION`.
    - The seller → 403.
    - Concurrent approve and reject → exactly one decision.
    - A duplicate approval returns the existing one.

- [ ] **F-17 Deal detail aggregation**
  - **Requirements:** PRD §J "Deal detail", §K.11, REQ-WAL-01 AC2.
  - **Deliverable:** `GET /api/deals/:id` assembles `DealDetailDTO`:
    - `allowedActions` per §3.2
    - the timeline from `deal_state_transitions`, the audit log and the ledger
    - verifications
    - **no XDR, request IDs or storage keys**
  - **Depends on:** F-10, F-11.
  - **Acceptance:**
    - A snapshot test per state shows only §3.8 browser-visible fields.
    - Audit hashes appear only as `auditHash`.

- [ ] **F-18 Demo accounts and operator flag ⚠ AUTH**
  - **Requirements:** REQ-ACC-01, PRD §D.1.
  - **Deliverable:**
    - Supabase Auth accounts for client, seller and operator (the operator is not a deal participant).
    - `profiles.is_operator = true` for the operator only, set via SQL with the service role.
    - Passwords are generated and shared only through the team's password manager, never in docs or chat.
  - **Depends on:** F-19, B-07.
  - **Acceptance:**
    - Three accounts exist.
    - Only one operator.
    - No inherited `users` admin role grants SME access.
  - **Evidence:** account emails' role mapping (no passwords), the authoriser, and the time.

### Phase D — Apply, harden, close

- [ ] **F-19 Apply migrations to the agreed database ⚠ AUTH (HO-09)**
  - **Requirements:** PRD §I.13.
  - **Deliverable:** 002–007 applied in order to the database chosen in F-04, with a post-apply listing of tables, policies, functions and the bucket.
  - **Depends on:** F-04…F-11, explicit authorisation.
  - **Acceptance:**
    - No inherited table is dropped.
    - RLS is on for every new table.
    - The `deliverables` bucket is private.
  - **Evidence:** the listing output and the authorisation record.

- [ ] **F-20 Retire inherited API and libraries from the SME build**
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
  - **Requirements:** every Francis-owned requirement in the PRD §M.2 table.
  - **Deliverable:** `tests/server/business/**` (routes with a mocked persistence layer) and `tests/db/**` (RPC tests on the B-12 database, if authorised), covering:
    - REQ-ACC-01/02
    - REQ-DEP-01 AC1–AC3
    - REQ-DEAL-01/02
    - REQ-DLV-01/02
    - REQ-APR-01
    - the §3.6 enforced rules
  - **Depends on:** C-01 (Vitest and the `npm test` script, HO-02).
  - **Acceptance:** each check passes, and also fails when its guard is removed (mutation-style spot checks for the key guards).
  - **Evidence:** test output labelled **Mocked** or **DB (env name)**.

- [ ] **F-22 Run G7 and update README and Claude.md**
  - **Requirements:** PRD §K, §M.
  - **Deliverable:**
    - [G7](#g7) evidence.
    - README and Claude.md updated with the real commands and status, keeping their honesty language.
  - **Depends on:** G5, C-18.
  - **Acceptance:** G7 passes.

### Phase E — Optional (never blocks the MVP)

- [ ] **F-23 (SHOULD) Budget plan and UCP persistence**
  - **Requirements:** REQ-BUD-01/02, PRD §I.1, §I.8.
  - **Deliverable:** migration 010; RPCs `create_budget_plan` (bps sum 10,000, distinct addresses, equality with the registered Split deployment), `decide_budget_plan` (snapshotted approvers, conditional `WHERE status = 'pending'`, publish once), and the persistence functions Carlos needs for C-21.
  - **Depends on:** G5, Shanti S-06 (Split deployment).
  - **Acceptance:** REQ-BUD-01 AC1/AC2 and REQ-BUD-02 AC1–AC3.

- [ ] **F-24 (SHOULD) Online-selling template persistence with mocked courier**
  - **Requirements:** REQ-SELL-01.
  - **Deliverable:** `online_selling` template, hashed listing and order terms, and an operator-advanced mock courier state. The mock state can never call release.
  - **Depends on:** G5 and a separate reserved deployment.
  - **Acceptance:** AC1/AC2 with tests.

- [ ] **F-25 (STRETCH) Public receipt data**
  - **Requirements:** REQ-RCPT-01, PRD §K.8.
  - **Deliverable:** `public_receipts`, opt-in by both parties, and an allow-listed response schema test.
  - **Depends on:** G5.

---

## 8. Honest limits (preserve in all copy and the pitch)

- **Client nonresponse refunds the client** at the deadline, even if the seller delivered (PRD §B.7.3).
- **Release authority is trusted.** The server and token holder can release early, and so can the deploying wallet (PRD §B.7.4).
- **A file hash proves byte equality only**, not quality, authorship or truthful delivery.
- **CYFER hashes are not Stellar.** Audit hashes and CYFER ledger hashes are not Stellar transaction hashes, and the ledger is an application hash chain in a database the team controls.
- **Testnet only.** No real money, no mainnet, no fiat conversion and no legal-readiness claims.

## 9. What Francis can start immediately vs what must wait

- **Now:** F-01, F-02, F-03 (the decision), F-04 (the decision), and drafting F-05…F-10.
- **Waits:**
  - F-11 columns wait on HO-04.
  - F-13 waits on HO-03 and C-01.
  - F-19 and F-18 wait on ⚠ AUTH.
  - F-20 waits on HO-12.
  - F-21 waits on HO-02.
  - F-22 waits on G5.

## 10. Plan-level notes

- This plan was written from repository state and documentation only. Nothing was built, installed, migrated or transacted.
- The Supabase MCP server failed to connect during planning, so the live schema remains unknown (B-01).

<a id="evidence-log"></a>
## 11. Evidence log (Francis)

| Time (PHT) | Task/Gate | Evidence (no secrets) | Level (Mocked / DB / Testnet / Human) |
|---|---|---|---|
| — | — | — | — |
