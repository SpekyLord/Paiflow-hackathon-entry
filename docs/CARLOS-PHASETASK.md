# CARLOS — Phase Tasks (Developer 2: payment and wallet integration)

> Shared contracts, ownership matrix, handoffs, blockers and the coordination rules are **canonical in [FRANCIS-PHASETASK.md](FRANCIS-PHASETASK.md)**. This document does not redefine them. It defines Carlos's tasks and the gates **G3, G5 and G6**.

| Field | Value |
|---|---|
| Owner | Carlos (Developer 2) |
| Source of truth | [docs/PRD.MD](PRD.MD) v2.0.0. Its technical design is **[PROPOSED]**, and none of it is implemented. |
| Paiflow references | `../paiflow-hackathon-starter`: `AGENTS.md`, `README.md`, `llms.md`, `lib/paiflow.ts`, `lib/transaction.ts`, `lib/wallet.ts`, `lib/recovery.ts`, `lib/confirmation.ts`, `lib/http.ts`, `lib/amount.ts`, `scripts/check-browser-bundle.mjs`, `tests/*`. Also the official SDK README, SDK reference and OpenAPI 1.2.0 (summarised in §2). |
| Status | Planning only. Every task starts unchecked. |

**Quick links:**

- Coordination rules: [Francis §0–§1](FRANCIS-PHASETASK.md#0-how-to-use-these-three-documents)
- Ownership: [Francis §2](FRANCIS-PHASETASK.md#2-ownership-matrix-canonical)
- Contracts:
  - [DTOs](FRANCIS-PHASETASK.md#contract-dtos)
  - [Endpoints](FRANCIS-PHASETASK.md#contract-endpoints)
  - [Persistence interface you consume](FRANCIS-PHASETASK.md#contract-persistence)
  - [Controller interface you produce](FRANCIS-PHASETASK.md#contract-controllers)
  - [Visibility rules](FRANCIS-PHASETASK.md#contract-visibility)
  - [Fixtures](FRANCIS-PHASETASK.md#contract-fixtures)
- Registers: [Handoffs](FRANCIS-PHASETASK.md#4-handoff-register-canonical) · [Blockers](FRANCIS-PHASETASK.md#5-blockers-and-investigations-canonical)
- Gates: [Gate index](FRANCIS-PHASETASK.md#6-gates)
- Schedule: [Time-box](FRANCIS-PHASETASK.md#02-recommended-time-box-for-today-pht-25-oct-2026)

---

## 1. Boundaries

**Carlos owns** (from the [Francis §2 ownership matrix](FRANCIS-PHASETASK.md#2-ownership-matrix-canonical)):

| Area | Paths and roles |
|---|---|
| Paiflow server code | `src/server/paiflow/**` |
| Wallet summary server | `src/server/wallet-summary/**` |
| Browser wallet and controllers | `src/client/wallet/**`, `src/client/controllers/**` (including `mock/**`), `src/client/api/payments.ts` |
| Isomorphic helpers | `src/lib/amount.ts`, `src/lib/stellar/**`, `src/lib/explorer.ts` |
| Routes | The payment, release, evidence, wallet-summary, operator and integration routes in [Francis §2.3](FRANCIS-PHASETASK.md#23-api-route-ownership) |
| Tests and tooling | `tests/server/payments/**`, `tests/client/**`, `tests/fixtures/paiflow/**`, `vitest.config.ts`, `scripts/check-browser-bundle.mjs` |
| Manifests and config | `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.env.local.example`, `.gitignore`, [TESTING.md](../TESTING.md) |
| Custody and roles | The Paiflow token custodian (proposed, B-07) and the operator account holder |

**Carlos does not:**

- **No schema work.** Do not write migrations, SQL or RLS. Specify requirements to Francis instead (CR process).
- **No page or component edits.** Do not edit Shanti's pages or components to wire payments. Supply hooks plus integration examples.
- **No business logic.** Do not implement deal, terms, deliverable or approval logic.
- **No browser-side Paiflow.** Do not expose the SDK, token or any Paiflow passthrough proxy to the browser.

**Package rule.** You are the only person who edits `package.json` or the lockfile. Handle requests per [Francis §1.3](FRANCIS-PHASETASK.md#13-dependency-package-handoff). Each lockfile change needs ⚠ AUTH plus a dependency-only commit.

---

## 2. Paiflow integration facts

These facts were checked during planning on 2026-10-25 against the starter source, `llms.md`, the official SDK README, the SDK reference and OpenAPI 1.2.0 (repo and hosted copies agree). **Facts marked SOURCE come from Paiflow server code, not from a published contract. Confirm them in C-02 or in rehearsal before relying on them.**

| Topic | Fact | Status |
|---|---|---|
| Package | `@paiflow/sdk@0.2.0` (npm `beta`; `latest` is 0.1.0, so pin the exact version). It is ESM-only. `engines.node ">=22.22.2 <23"`. | Docs |
| Client | `new Paiflow({ baseUrl, token }).deployment(deploymentId)` | Starter code |
| Capabilities | `capabilities.get()` returns `{network, triggerType, inputAsset, configurationSource, operations{…}}`. Each operation has `{status, authentication, requirements, nodeIds}`, and `operations.releaseEarly.nodeIds` lists the releasable timelock branches. **Recipient addresses are never returned.** | Docs |
| Prepare | `execute.prepare({from, amount})` returns `{xdr, networkPassphrase, network, expiresAt}`, with `metadata.historyRequestId`. The window is about 180 s. | Docs + starter |
| Submit | `execute.submit({signedXdr}, {wait:false, preparationRequestId})` returns `{txHash, status: SUCCESS\|PENDING\|FAILED, ledger?, error?}`. It is idempotent on the envelope hash. FAILED can come with HTTP 200, and a 502 does not prove nothing was broadcast. | Docs |
| Status | `transactions.get(txHash)` returns `{txHash, network, status: SUCCESS\|FAILED\|PENDING\|UNKNOWN\|REJECTED, ledger?, error?}`. **It covers early-release audit records.** An unattributed hash gives HTTP 404, "does not prove the transaction failed". SUCCESS and FAILED are final; REJECTED means the submission was refused. The limit is 60/min per token. | Docs |
| Events | `events.list({cursor, limit, txHash})` returns `{items, nextCursor, hasMore}`. Each item is `{id, eventId, kind, topic, ledger, txHash, occurredAt, data}` with **no `nodeId`**. `events.pages(query,{maxPages})` deduplicates. The default `limit` conflicts between sources (SDK says 20, OpenAPI says 50), so **always pass `limit` explicitly**. The limit is 120/min. | Docs |
| Event `data` | <ul><li>`RECEIVE/deposit {from, amount, asset}`</li><li>`RECEIVE/receive {asset, amount}` (timelock)</li><li>`PAYOUT/release {admin, branch: "before"\|"after", balance}`, with **no recipient**</li><li>`PAYOUT/pay {recipient, asset, payment}`, where the amount field is **`payment`**</li></ul>`asset` is a symbol such as `"XLM"`, or a contract address. | **SOURCE** |
| Release early | `releaseEarly({nodeId})` returns `{nodeId, txHash, ledger?}` and "returns once it is final". There is **no Idempotency-Key, no reconcile endpoint and no 409**. Errors: 422 (`The deadline has passed…`, `There is nothing to release…`, bad node ID), 429, 502 (`details` may carry a txHash). The limit is 10/min per token, shared across the token's deployments. | Docs (+SOURCE for `details`) |
| Balances | `balances.get()` returns `{totals[], nodes[{nodeId, templateKind, contractAddress, tokenContract, balanceStroops, readAt, stale, error?}], freshness{status, totalsComplete, attemptedAt, cached}}`. The docs warn "not … evidence of payment success". Poll no faster than every 10 s; the limit is 30/min. A `TIMELOCK_BRANCH` node is inferred from source. | Docs + **SOURCE** |
| Errors | `PaiflowApiError {status, code, fields, details, metadata{status, requestId, historyRequestId, retryAfter}}`. Other error classes: `PaiflowAbortError`, `PaiflowTimeoutError`, `PaiflowTransportError`, `PaiflowMalformedResponseError`. | Docs |
| Freighter | `@stellar/freighter-api@6.0.1`. `signMessage(message, {address, networkPassphrase})` returns `{signedMessage: string (base64) \| Buffer (older extension) \| null, signerAddress, error?}` and follows SEP-53. `signTransaction(xdr, {networkPassphrase, address})` returns `{signedTxXdr, signerAddress, error?}`. | Docs |
| SEP-53 verify | In `@stellar/stellar-sdk@17.2.1`, `Keypair.fromPublicKey(addr).verifyMessage(message, signatureBytes)`. Decode base64 to bytes first. **Do not** use `Keypair.verify` (no prefix/hash). Node `>=22.12.0`. | Docs |
| Next.js 16 | The starter uses Next 15.5, and this repo uses 16.1.6. Compatibility is **unverified**. | Unknown (B-10) |

---

## 3. Phases and tasks

The phases below are listed in order:

| Phase | Tasks | Purpose |
|---|---|---|
| A | C-01…C-05 | Tooling, spikes and pure pieces; can start now |
| B | C-06…C-14 | Server routes and verification against Francis's persistence interface |
| C | C-15…C-18 | Browser wallet, real controllers, negative paths |
| D | C-19…C-20 | Testnet rehearsals (⚠ AUTH) |
| E | C-21…C-22 | Optional |

Every task lists requirement IDs, a deliverable, owned paths, dependencies or handoffs, acceptance checks and evidence. Mocked results and Testnet results are recorded separately in §5.

### Phase A — Tooling, spikes, pure helpers (start immediately)

- [ ] **C-01 Toolchain, dependencies and test scripts (HO-02, B-10)**
  - **Requirements:** PRD AS-05, §M.1.
  - **Deliverable:**
    1. **Node.** Every server machine uses Node 22.22.2 via nvm-windows (setup guide p2). Record `node -v`.
    2. **⚠ AUTH dependency commit:** `@paiflow/sdk@0.2.0` (exact), `@stellar/stellar-sdk@^17.2.1`, `@stellar/freighter-api@^6.0.1`, `server-only`; dev: `vitest`, `vite` (pinned as in the starter), and on request `@supabase/ssr`.
    3. **Scripts:** `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`, `"check:bundle": "node scripts/check-browser-bundle.mjs"`.
    4. **Vitest config:** `vitest.config.ts` with the `@` → `./src` alias.
    5. **Next 16 check:** a minimal build that imports the SDK inside a `server-only` module.
  - **Owns:** manifests, `vitest.config.ts`, tooling config.
  - **Depends on:** nothing. **Handoff HO-02.**
  - **Acceptance:**
    - `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` (zero or sample tests) and `npm run build` all pass on Node 22.22.2.
    - Any engine or Next 16 incompatibility is reported as a CR with a proposed fix rather than worked around.
  - **Evidence:** command outputs and versions.

- [ ] **C-02 Integration spikes S0 (B-03, B-04, B-05, B-08; HO-03, HO-04)**
  - **Requirements:** Q-06, Q-07, Q-08, Q-11, D-07.
  - **Deliverable:** a findings note in §5 that confirms or corrects §2 for each question:
    - **(a) Q-08.** In a scratch browser page on a dev branch (not committed to `main`), sign a test message with a Testnet Freighter account and verify it server-side with `Keypair.verifyMessage`. Record the exact `signedMessage` type and encoding. **HO-03 to Francis.**
    - **(b) Q-06/Q-11/Q-07.** Read-only SDK calls against the **refund rehearsal deployment F1** after Shanti's handoff:
      - `capabilities.get()`, including `releaseEarly.nodeIds` against Shanti's node ID
      - `balances.get()` node kinds
      - `events.list({limit: 50})`
    - **(c) Payload capture.** Record real event payloads during the F1/R1 rehearsal transactions, never extra transactions. **HO-04 to Francis.**
    - **(d) 429 semantics.** Check whether release-early rate limiting happens before relayer action, from docs or source only, and record the answer. Never test it by sending releases.
  - **Owns:** findings only.
  - **Depends on:** C-01, and S-02/S-04 for (b).
  - **Acceptance:** each B-item is updated (via Francis) to **Confirmed** or **Still unverified** with its interim behaviour kept.
  - **Evidence:**
    - Non-secret excerpts: event kinds, topics and field names. Addresses are shortened.
    - Never include the token or a signed envelope.

- [ ] **C-03 Server-only Paiflow adapter and configuration validation**
  - **Requirements:** PRD §K.1, REQ-DEP-01 AC4, REQ-ESC-01 AC6.
  - **Deliverable:** `src/server/paiflow/{config,client,errors}.ts` with `import "server-only"`, ported from starter `lib/paiflow.ts` and `lib/http.ts`:
    - **Config validation:**
      - `PAIFLOW_BASE_URL` must be https (or `http://localhost`) with no path, credentials, query or hash.
      - `PAIFLOW_API_TOKEN` must match `^(pfk|pfd)_[a-f0-9]{64}$`.
      - The SDK client is constructed only for a deployment UUID taken from **Francis's registry row** (never from the browser or discovery order).
      - `PAIFLOW_DEPLOYMENT_ID` is optional and only checked for consistency.
    - **Error mapping:** `PaiflowApiError` maps to safe codes ([Francis §3.3](FRANCIS-PHASETASK.md#contract-errors)), keeping `requestId` and `retryAfter`. Raw messages and tokens are never logged.
    - **Status reporting:** `integration/status` route returning `{paiflowConfigured, network}`.
  - **Depends on:** C-01, HO-01.
  - **Acceptance:**
    - A missing or invalid configuration gives 503 `PAIFLOW_NOT_CONFIGURED` with a safe message.
    - The token never appears in responses or logs, checked by a test that spies on `console`.
    - There is no `NEXT_PUBLIC_` Paiflow variable.
  - **Evidence:** test output.

- [ ] **C-04 Pure helpers: amounts, envelopes, explorer, assets**
  - **Requirements:** INV-10, REQ-ESC-01 AC3, PRD §J.
  - **Deliverable:**
    - `src/lib/amount.ts`: `toStroops`, `fromStroops` (starter), plus `parseHorizonBalance` that accepts `"0.0000000"`.
    - `src/lib/stellar/envelope.ts`: `envelopeHash`, which refuses fee-bump envelopes; `assertOriginal(unsigned, signed, expectedHash)`; `feeStroops(xdr)`.
    - `src/lib/explorer.ts`: Stellar Expert testnet URL.
    - `src/lib/stellar/asset.ts`: `matchesNativeAsset(eventAsset)`, which accepts `"XLM"` or the native asset contract ID for Testnet (`Asset.native().contractId(Networks.TESTNET)`).
  - **Depends on:** C-01.
  - **Acceptance:**
    - Unit tests from the starter (`tests/amount.test.ts`, the payment envelope tests) are ported.
    - A changed body is rejected, and a signature-only change is accepted.
    - Floats are never used.
  - **Evidence:** test output (Mocked).

- [ ] **C-05 Payment API client and fixture-backed mock controllers (HO-06)**
  - **Requirements:** PRD §J (all money screens).
  - **Deliverable:**
    - `src/client/api/payments.ts`, typed per [Francis §3.5](FRANCIS-PHASETASK.md#contract-endpoints).
    - `src/client/controllers/index.ts`, exporting the [§3.7 hooks](FRANCIS-PHASETASK.md#contract-controllers) and `getControllerMode()`.
    - `src/client/controllers/mock/**`, which implements every hook over Francis's fixtures. It simulates each phase, including `wallet_changed`, `expired`, `unresolved`, `uncertain` release and `unavailable` balance.
    - Fixture mode is enabled only when `NEXT_PUBLIC_CYFER_FIXTURES=1` and the build is not production.
  - **Depends on:** HO-01.
  - **Handoff:** HO-06 to Shanti, with a short usage snippet per hook in §4.
  - **Acceptance:**
    - Shanti can render every money state without a server.
    - Mocks never import `@stellar/freighter-api` or the SDK.
  - **Evidence:** commit hash; the hook snippet list in §4.

### Phase B — Server routes and verification

- [ ] **C-06 Deployment registration and capability verification (operator)**
  - **Requirements:** REQ-DEP-01 (behaviour bullets 1 and 3, failure "Capability mismatch"), PRD CL-12.
  - **Deliverable:** `POST/GET /api/operator/deployments`, behind Francis's `requireOperator`:
    - Validates Shanti's handoff fields.
    - Calls `capabilities.get()` and requires:
      - `network === 'testnet'`
      - `triggerType === 'deposit'`
      - `inputAsset.kind === 'native'`
      - `operations.execute` and `operations.releaseEarly` both not `unsupported`
      - the submitted `conditionNodeId` present in `operations.releaseEarly.nodeIds`
    - Computes `graphSnapshotSha256` with Francis's `canonicalJson`.
    - Calls `registerDeployment` with status `available` or `unusable`.
    - Stores the capability snapshot with no credentials.
  - **Depends on:** C-03, F-11 (HO-05), HO-07, HO-08.
  - **Acceptance:**
    - A capability mismatch returns 422 `CAPABILITY_MISMATCH` and registers `unusable`.
    - A second available deployment for the same pair is refused or flagged (CL-11).
    - **Recipients and deadline are labelled operator-attested** (Paiflow does not return them).
  - **Evidence:** capability check output for F1, R1 and D1 (no token).

- [ ] **C-07 Fund prepare route**
  - **Requirements:** REQ-ESC-01 behaviour 1–5, AC1, AC4, AC5; INV-01, INV-03, INV-04.
  - **Deliverable:** `POST /api/deals/:id/fund/prepare`, which does the following in order:
    1. Same-origin check, session, rate limit `prepare`.
    2. `beginPaymentAttempt`. If it returns `existing`, return that attempt's `FundingReviewDTO`. Never prepare again (CL-06).
    3. `execute.prepare({from: buyerAddress, amount: termsAmount})` on the reserved deployment.
    4. Check `network === 'testnet'` and the passphrase equals the Testnet passphrase.
    5. Compute `envelopeHash`, then call `recordPreparation` **before** responding.
    6. `markSignatureRequested`.
    7. Return the DTO.
    - On a Paiflow error before any XDR exists, call `failPreparation`.
  - **Depends on:** C-03, C-04, HO-05, F-12.
  - **Acceptance (mocked SDK):**
    - The persistence call order is asserted (preparation stored before the response).
    - A second call returns the same attempt and the SDK is called once.
    - Inside the deadline margin, the response is 409 and the SDK is not called.
    - A wallet mismatch gives 403.
  - **Evidence:** test output with SDK call counts.

- [ ] **C-08 Fund submit route**
  - **Requirements:** REQ-ESC-01 behaviour 6–8, AC2, AC3; INV-02, INV-06.
  - **Deliverable:** `POST /api/deals/:id/fund/submit`, which does the following in order:
    1. Body ≤ 210,000 bytes and `signedXdr` ≤ 200,000 chars.
    2. Session plus client role.
    3. Parse the envelope. Reject fee-bump or unparseable envelopes, then call `recordEnvelopeRejection` and return 422.
    4. Compare the body hash to the original. A mismatch gives `recordEnvelopeRejection` plus 422 `ENVELOPE_CHANGED`.
    5. `persistSignedEnvelope` **before** submitting. A late arrival is still persisted, with `receivedAfterExpiry`.
    6. `execute.submit({signedXdr}, {wait:false, preparationRequestId})`, then check `txHash === originalHash`.
    7. `recordSubmission`. A transport error becomes `transport_error`, never a failure.
    8. Trigger one bounded status check (C-09 logic, read-only).
  - **Depends on:** C-07.
  - **Acceptance (mocked):**
    - The signed row exists before the submit mock is invoked.
    - A changed body or fee-bump is rejected and kept.
    - A 502 leaves the attempt unresolved, with no new prepare.
    - The deal never shows held on a `PENDING`, `UNKNOWN` or 502 result (REQ-ESC-02 AC1).
  - **Evidence:** test output.

- [ ] **C-09 Read-only check and explicit same-envelope resubmit (CL-05)**
  - **Requirements:** REQ-REC-01 AC1–AC3, REQ-ESC-02 AC2, PRD §G.4, INV-05…INV-08.
  - **Deliverable:**
    - **`fund/check`.** Calls `transactions.get(originalHash)` with at most 6 lookups in a 30 s window, backoff capped at 8 s, honouring `Retry-After`, then `recordStatusCheck`:
      - A 404 maps to `not_found` (unresolved, never failed).
      - It sets `checksExhausted` when bounds are hit without a final status.
      - It never submits or prepares.
    - **`fund/resubmit`.** Requires `intent: 'resubmit_same_signed_envelope'` plus a matching `originalTxHash`, and the attempt must have a stored signed envelope and no final status. It posts the **byte-identical stored** envelope with the original `preparationRequestId`, then calls `recordSubmission`.
    - **`markExpiredUnsigned`.** Applied when expired with no signed envelope.
  - **Depends on:** C-08.
  - **Acceptance (mocked):**
    - `check` never calls submit (spy count 0).
    - `resubmit` sends exactly the stored bytes.
    - `NOT_FOUND`/404 or expiry does not make `fund` allowed again (operator action required).
    - FAILED moves the deal back to `ready_to_fund` only after it is recorded.
  - **Evidence:** test output.

- [ ] **C-10 Event ingestion: pagination, cursors, dedupe**
  - **Requirements:** PRD §G.6, §H.3 #12–13, INV-08.
  - **Deliverable:** `src/server/paiflow/events.ts`:
    - It uses `acquireReconcileLease` per deployment.
    - It pages `events.list({cursor, limit: 100})` from `getEventCursor` while `hasMore`, up to a bounded page cap per run.
    - It calls `upsertPaiflowEvents` (dedupe on `eventId`) and then `advanceEventCursor(expected, next)`. If that returns false, it re-reads instead of overwriting.
    - It keeps a separate `tx:<hash>` cursor scope for txHash-filtered queries.
    - It honours `Retry-After` and the per-deal budget (`consumeReconcileBudget`).
    - It never sends `cursor=` empty.
  - **Depends on:** HO-05, C-03.
  - **Acceptance (mocked):**
    - Multi-page fixtures are fully ingested.
    - Duplicates are ignored.
    - A concurrent cursor advance is not clobbered.
    - A page cap is never treated as completeness.
  - **Evidence:** test output.

- [ ] **C-11 Deposit and payout verifier (pure functions)**
  - **Requirements:** REQ-ESC-02, REQ-PAY-01, PRD §H.1–§H.4, INV-03.
  - **Deliverable:** `src/server/paiflow/verify.ts` returns `VerificationInput` ([Francis §3.6](FRANCIS-PHASETASK.md#contract-persistence)) with per-check pass, fail or pending:
    - **Deposit, H.1–H.2.** `transactions.get(original)` is SUCCESS with matching hash and `testnet`. A `RECEIVE`/`deposit` event in that tx has `from === buyer`, `amount === termsAmount` (string compare) and a native asset.
    - **Release payout, H.3.** The release tx is SUCCESS. Its events include `PAYOUT`/`release` with `branch:"before"` and `PAYOUT`/`pay` with `recipient === seller`, `payment === amount` and a native asset. A shortfall or surplus is a mismatch, recording both values.
    - **Refund, H.3.** `PAYOUT`/`release` with `branch:"after"` plus `PAYOUT`/`pay` to the buyer for the amount, at or after the deadline. If `transactions.get` gives 404 for the automatic refund hash, `finality` stays `pending` and an operator review opens; the operator checks Stellar Expert.
    - **Direction, H.3 #11.** A True-side payout after the deadline, or a False-side payout after a verified release, is a mismatch.
    - **Unknown payload shape:** any check depending on it is `pending`, never `pass`.
  - **Depends on:** C-04. Fixture payloads in `tests/fixtures/paiflow/**` are built from §2 and replaced by recorded real shapes after C-02(c).
  - **Acceptance:** each §H check has a passing and a failing fixture test (REQ-PAY-01 AC).
  - **Evidence:** test output (Mocked). The fixture provenance (docs, source or recorded) is noted.

- [ ] **C-12 Release route and uncertain-release recovery**
  - **Requirements:** REQ-REL-01 AC1–AC4, REQ-REF-01 AC3, PRD §G.5, D-07, B-05.
  - **Deliverable:**
    - **`POST /api/deals/:id/release`.** Takes a session, then `beginReleaseAttempt`, which runs Francis's approval, state and margin guard and commits. Only then does it make **one** `releaseEarly({nodeId: conditionNodeId})` call, followed by `recordReleaseOutcome`:
      - `returned` → run C-11 release verification.
      - 422 deadline → `refused/DEADLINE_PASSED`.
      - 422 nothing → `refused/NOTHING_TO_RELEASE`, which opens an operator review.
      - 429 → `refused/RATE_LIMITED` with the B-05 interim: uncertain, no retry.
      - Timeout, 502 or a lost response → `uncertain`, keeping any hash from `details`.
    - **`POST …/release/check` (read-only).**
      - If a hash exists: `transactions.get(hash)` plus `events.list({txHash})`.
      - Otherwise: run the C-10 scan for a `PAYOUT/release branch:"before"` after `requested_at`, plus its `pay` to the seller.
      - If nothing is found within `RELEASE_EVIDENCE_THRESHOLD_SECONDS`, open an operator review.
      - **It never calls `releaseEarly`.**
  - **Depends on:** C-10, C-11, HO-05, F-16.
  - **Acceptance (mocked; SDK call counts recorded):**
    - Without approval → 403, and the SDK is called 0 times (AC1).
    - 10 concurrent requests → at most 1 SDK call (AC2).
    - Timeout or 502 → no second call, ever (AC3).
    - After the deadline → 422 and the SDK is called 0 times.
    - The audit entry has the actor, approval ID, deployment, `nodeId`, request ID and hash (AC4).
  - **Evidence:** test output.

- [ ] **C-13 Reconciliation runner and deadline/refund tracking (B-06)**
  - **Requirements:** REQ-ESC-02, REQ-REF-01 AC1–AC3, REQ-REC-01, PRD §G.6.
  - **Deliverable:**
    - **`src/server/paiflow/reconcile.ts`.** One bounded pass per deal:
      1. Status checks for unresolved attempts.
      2. Event ingestion.
      3. Deposit, payout and refund verification.
      4. `applyDeadlineTransitions`.
      5. An operator alert when a refund is missing after `REFUND_ALERT_SECONDS`, or deposit or release evidence is missing after its threshold.
      6. **Read-only toward Paiflow.** It never submits, prepares or releases.
    - **`POST /api/deals/:id/evidence/refresh`.** Participant-triggered, at least 15 s apart.
    - **Execution mechanism (choose one and record it):**
      - **(a)** A lease-guarded interval started from Next `instrumentation.ts` on the Node runtime, on the single demo server process.
      - **(b)** `POST /api/internal/reconcile`, protected by a server-only secret, called every 30 s by a local loop script.
      - **(c)** Manual refresh only.
      - Prefer (a) or (b), and document per-process caveats.
  - **Depends on:** C-09…C-12.
  - **Acceptance:**
    - With no client open, the R1/F1 deals still progress to verified states (proven in G6).
    - Caps hold (≤ 40 polls/deal/hour).
    - Two concurrent runners never double-process (lease test).
  - **Evidence:** test output; the chosen mechanism; G6 timeline.

- [ ] **C-14 Wallet summary route**
  - **Requirements:** REQ-WAL-01 AC1–AC3, G-07.
  - **Deliverable:** `GET /api/wallet/summary`:
    - It takes `getWalletContext(userId)`.
    - It reads the native balance of the **bound** address from Horizon Testnet (`https://horizon-testnet.stellar.org/accounts/{G}`, public data, with a timeout). A failure gives `balance.state:'unavailable'`, never 0.
    - It adds explorer URLs.
    - It keeps the three panels separate, with no summing across them.
    - Only `verified` items count toward `verifiedPayouts`.
  - **Depends on:** HO-05, C-04.
  - **Acceptance (mocked):**
    - A Horizon 500 or timeout gives "unavailable".
    - No CYFER audit hash appears in `history`.
    - Unverified payouts are excluded from totals.
  - **Evidence:** test output.

### Phase C — Browser wallet, real controllers, negative paths

- [ ] **C-15 Freighter browser module**
  - **Requirements:** REQ-ACC-02 behaviour 2, REQ-ESC-01 behaviour 6, PRD §F.4 "Wallet change".
  - **Deliverable:** `src/client/wallet/freighter.ts`, ported from starter `lib/wallet.ts`:
    - `connect` and `refresh`, with bounded timeouts.
    - A Testnet passphrase check.
    - `signChallenge(message, address)`, which returns base64, converting a Buffer if the extension returns one.
    - `signPrepared(review, xdr, boundAddress)`, which refuses when the prepared network is not Testnet, the preparation is expired, Freighter's address ≠ bound address, Freighter is on another network, or `signerAddress` ≠ bound.
  - **Depends on:** C-01, C-02(a).
  - **Acceptance:** the starter `tests/wallet.test.ts` cases are ported, plus `signMessage` tests (mocked Freighter).
  - **Evidence:** test output.

- [ ] **C-16 Real controllers and integration examples (HO-10)**
  - **Requirements:** the PRD §J money screens, REQ-REC-01 AC1.
  - **Deliverable:** live implementations of every [§3.7 hook](FRANCIS-PHASETASK.md#contract-controllers):
    - `useWalletBinding` (Francis's challenge and bind routes plus C-15)
    - `useFundEscrow`
    - `useRelease`
    - `useDealEvidence`
    - `useWalletSummary`
    - `useOperatorConsole`

    Each hook rehydrates from the server after a reload. No financial state is kept in `localStorage`, and there is no browser polling loop that makes decisions.

    §4 gets a usage snippet per hook, showing which DTO fields to render and which buttons to disable.
  - **Depends on:** C-05, C-07…C-15, F-13, F-17.
  - **Acceptance:**
    - Swapping mock for live mode needs no page changes, only the env flag.
    - A reload mid-attempt shows the same attempt and original hash (REQ-REC-01 AC1, mocked).
  - **Evidence:** test output; HO-10 note.

- [ ] **C-17 Operator review routes**
  - **Requirements:** PRD §D.1 Operator, §G.4 `NOT_FOUND`, §G.5 step 4–5.
  - **Deliverable:** `GET /api/operator/reviews` and `POST /api/operator/reviews/:reviewId`, calling `resolveOperatorReview` with a mandatory justification and evidence. The `release_retry_authorised` outcome calls `authoriseReleaseRetry` and permits exactly one further release call, which runs through the C-12 code path with operator-only access.
  - **Depends on:** HO-05.
  - **Acceptance:**
    - A non-operator gets 403.
    - An empty justification gets 422.
    - A retry authorisation can be used once only.
  - **Evidence:** test output.

- [ ] **C-18 Credential isolation and payment negative-path suite (input to G7)**
  - **Requirements:** REQ-ESC-01 AC6, PRD §K.1, §K.10, T-09.
  - **Deliverable:**
    - **`scripts/check-browser-bundle.mjs`** (starter pattern) extended to also fail on `SUPABASE_SERVICE_ROLE_KEY`, `service_role` JWT-like strings, and the `[FIXTURE]` marker in a production build.
    - **`npm run check:bundle`** wired up.
    - **Tests:**
      - The token is absent from every route response and from logs.
      - The seller session on `release` gets 403 with 0 SDK calls (T-09, mocked).
      - Cross-origin requests on every payment route get 403.
      - Oversize bodies get 413.
  - **Depends on:** C-06…C-17.
  - **Acceptance:** all pass; output handed to Francis for [G7](FRANCIS-PHASETASK.md#g7).
  - **Evidence:** script and test output.

### Phase D — Testnet rehearsals (⚠ AUTH for every transaction)

- [ ] **C-19 Lead rehearsal T-01…T-07 and T-09 on deployment R1 → [G5](#g5)**
  - **Requirements:** PRD §M.3, REQ-ESC-01/02, DLV-01/02, APR-01, REL-01, PAY-01, REC-01.
  - **Deliverable:** one small rehearsal (1 XLM unless the team agrees otherwise) on **R1 only**:
    - Not on the live demo deployment D1.
    - Not via the hosted page.
  - **Depends on:** G2, G3, G4, HO-11, and authorisation recorded in §5.
  - **Acceptance:** [G5](#g5).
  - **Evidence:** as listed in G5.

- [ ] **C-20 Verify the separate refund rehearsal T-08 on deployment F1 → [G6](#g6)**
  - **Requirements:** REQ-REF-01 AC1–AC3, PRD §M.3 T-08.
  - **Deliverable:** verified refund evidence for F1, which was funded **without** approval and left to pass its deadline.
  - **Depends on:**
    - Shanti S-02 (F1 deployed early).
    - C-13.
    - An F1 deal funded through CYFER if C-07…C-09 are ready before F1's funding cut-off. Otherwise it is funded on the Paiflow hosted page and **labelled "funded via Paiflow hosted page, not CYFER checkout"**.
  - **Acceptance:** [G6](#g6).

### Phase E — Optional (never blocks the MVP)

- [ ] **C-21 (SHOULD) Budget payment execution and Split distribution verification**
  - **Requirements:** REQ-BUD-03, PRD §H.5.
  - **Deliverable:**
    - The prepare/sign/submit flow reused against Shanti's Split deployment B1 (S-06), through Francis's F-23 persistence.
    - Per-recipient verification with `bps` and bigint floor, the remainder going to the last recipient.
    - "Payment confirmed; 2 of 3 payouts verified" wording, never "Distributed" early.
  - **Depends on:** G5, F-23, S-06.
  - **Acceptance:** REQ-BUD-03 AC with fixtures, plus one authorised Testnet payment.

- [ ] **C-22 (STRETCH) USDC**
  - **Deliverable:** a separate USDC deployment path, asset checks for `{kind:"known", symbol:"USDC"}`, and the trustline-error mapping.
  - **Depends on:** G5 and a separate deployment with trustlines.
  - Never mixed into the XLM MVP configuration.

---

## 4. Integration examples for Shanti (filled in by C-05 / C-16)

Use one short snippet per hook, showing the import, which fields to render, which actions to wire to which buttons, and the disabled conditions. An example of the required pattern:

```tsx
// Pattern only — final code is written in C-05/C-16 against src/contracts/controllers.ts
const fund = useFundEscrow(deal.id);
// Button "Fund escrow" → fund.start()            disabled={fund.busy || !deal.allowedActions.includes('fund')}
// Modal shows fund.review (TESTNET, amount, asset, seller/buyer addresses, fee, expiry)
// Button "Sign in Freighter" → fund.signAndSubmit()   (explicit consent click; never auto-called)
// Button "Check original transaction" → fund.checkOriginal()   (read-only)
// Button "Resubmit same signed envelope" → confirm dialog → fund.resubmitSameEnvelope()
//   only when deal.allowedActions.includes('resubmit_same_envelope')
```

| Hook | Snippet delivered (commit) |
|---|---|
| `useFreighter` | — |
| `useWalletBinding` | — |
| `useFundEscrow` | — |
| `useRelease` | — |
| `useDealEvidence` | — |
| `useWalletSummary` | — |
| `useOperatorConsole` | — |

---

## 5. Gates owned by Carlos (canonical)

<a id="g3"></a>
### G3 — Backend routes and headless wallet/payment integration verified with fixtures

- **Owner:** Carlos. Francis confirms his business routes against the same fixtures.
- **Prerequisites:** G1; HO-05; C-03…C-17 implemented; F-12…F-17 implemented.
- **Pass criteria (Mocked level; no Testnet needed):**
  - [ ] `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` pass on Node 22.22.2.
  - [ ] Every C-07…C-14 acceptance test passes, with SDK call counts asserted for prepare, submit, release and check.
  - [ ] Each §H verifier check has a pass and a fail fixture.
  - [ ] Every §3.7 hook works in fixture mode **and** compiles in live mode.
  - [ ] Route responses validate against Francis's DTO types. A snapshot shows no XDR after submit and no request IDs or tokens.
- **Evidence:** test runner output (labelled **Mocked**), commit hash, and the list of tests per requirement.

<a id="g5"></a>
### G5 — End-to-end deposit, delivery, approval, verified payout and recovery (Testnet)

- **Owner:** Carlos (accountable lead).
- **Responsibilities:**
  - **Francis:** accounts, business routes, DB checks.
  - **Shanti:** drives the UI and Freighter on the demo machine and captures screenshots.
  - **Carlos:** server logs (safe), verification, evidence record.
- **Prerequisites:** G2, G3, G4; the R1 deal created; ⚠ AUTH recorded (who, time, amount, deployment).
- **Pass criteria (Manual Testnet, R1):**
  - [ ] T-01: client and seller bindings verified (public addresses recorded).
  - [ ] T-02: deal created and accepted; terms hash recorded.
  - [ ] T-03: funded from client Freighter. Deposit hash `SUCCESS`, RECEIVE matched on payer, asset and amount, and the deal shows "Funds held in escrow".
  - [ ] T-04: seller uploads; SHA-256 recorded.
  - [ ] T-05: the same file matches, and a one-byte-altered file shows "no match" (no "tampered").
  - [ ] T-06: the client approves v1 and releases. The release hash is `SUCCESS`, the PAYOUT to the seller is verified, and the deal shows "Paid to seller — verified".
  - [ ] T-07: a reload during funding (before signing, on R1's attempt) shows the same attempt and original hash, with no new prepare.
  - [ ] T-09: the seller session's release attempt gets 403 and the logs show no Paiflow call.
  - [ ] Event payload shapes recorded (closes B-04 or keeps it open with notes); Francis informed (HO-04).
- **Evidence (all public):**
  - deployment UUID
  - deposit hash and release hash, each with a Stellar Expert (testnet) link
  - terms and deliverable SHA-256
  - attempt ID
  - screenshots
  - authorisation record

  **Not done:** an HTTP 200 or a rendered screen alone does not pass G5.

<a id="g6"></a>
### G6 — Separate refund rehearsal verified

- **Owner:** Carlos.
- **Responsibilities:**
  - **Shanti:** deploys F1 early (S-02) and funds it if the hosted page is used.
  - **Francis:** the F1 deal and accounts.
- **Prerequisites:** F1 CONFIRMED and registered; deal funded before `deadline − funding margin`; **no approval or release**; C-13 running; ⚠ AUTH recorded.
- **Pass criteria (Manual Testnet, F1):**
  - [ ] No release-early call on F1 (logs, plus the deal timeline).
  - [ ] After the deadline the deal shows "Deadline reached; refund pending (polled)", never "Refunded".
  - [ ] PAYOUT `release` `branch:"after"` and PAYOUT `pay` to the buyer for the deposit amount are found, and the deal reaches "Refunded to client — verified".
  - [ ] If funded via the hosted page, every artefact is labelled "funded via Paiflow hosted page, not CYFER checkout".
- **Evidence:**
  - F1 UUID and deadline
  - deposit and refund hashes, with explorer links
  - the time from deadline to verified refund (shows polling delay)
  - screenshots
- **Pitch use:** in the pitch this evidence is labelled **Recorded** (PRD §N.2).

---

## 6. What Carlos can start immediately vs what must wait

- **Now:** C-01, C-02(a)/(d), C-04, C-05 (after HO-01, which is the first merge), and C-03 skeleton and config validation.
- **Waits:**
  - C-02(b) waits on S-02/S-04.
  - C-06 waits on HO-07/HO-08 and F-11.
  - C-07…C-14 wait on HO-05.
  - C-15 waits on C-02(a).
  - C-16 waits on F-13/F-17.
  - C-19 waits on G2–G4.
  - C-20 waits on F1 and C-13.

<a id="evidence-log"></a>
## 7. Evidence log (Carlos)

| Time (PHT) | Task/Gate | Evidence (no secrets, no XDR) | Level (Mocked / Testnet / Human) | Authorised by (Testnet/deps) |
|---|---|---|---|---|
| — | — | — | — | — |
