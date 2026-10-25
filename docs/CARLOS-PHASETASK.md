# CARLOS — Phase Tasks (Developer 2: payment and wallet integration)

> Shared contracts, ownership matrix, handoffs, blockers and the coordination rules are **canonical in [FRANCIS-PHASETASK.md](FRANCIS-PHASETASK.md)**. This document does not redefine them. It defines Carlos's tasks and the gates **G3, G5 and G6**.

| Field | Value |
|---|---|
| Owner | Carlos (Developer 2) |
| Source of truth | [docs/PRD.MD](PRD.MD) **v2.1.0**. Its technical design is **[PROPOSED]**, and none of it is implemented. |
| Tiers | **MVP:** the Freighter-signed Split payment for an approved budget plan, with per-envelope payout verification, recovery, the wallet page and the operator registry. **SHOULD:** protected-payment funding, release and refund. **STRETCH:** USDC, Pay (REQ-MOV-01). |
| Paiflow references | `../paiflow-hackathon-starter`: `AGENTS.md`, `README.md`, `llms.md`, `lib/paiflow.ts`, `lib/transaction.ts`, `lib/wallet.ts`, `lib/recovery.ts`, `lib/confirmation.ts`, `lib/http.ts`, `lib/amount.ts`, `scripts/check-browser-bundle.mjs`, `tests/*`. Also the official SDK README, SDK reference and OpenAPI 1.2.0 (summarised in §2). |
| Status | Planning only. Every task starts unchecked. |

**Quick links:**

- Coordination rules: [Francis §0–§1](FRANCIS-PHASETASK.md#0-how-to-use-these-three-documents)
- Ownership: [Francis §2](FRANCIS-PHASETASK.md#2-ownership-matrix-canonical)
- Contracts:
  - [States](FRANCIS-PHASETASK.md#contract-states)
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
| Routes | The pay, evidence, wallet-summary, operator and integration routes in [Francis §2.3](FRANCIS-PHASETASK.md#23-api-route-ownership); the SHOULD deal fund, release and evidence routes |
| Tests and tooling | `tests/server/payments/**`, `tests/client/**`, `tests/fixtures/paiflow/**`, `vitest.config.ts`, `scripts/check-browser-bundle.mjs` |
| Manifests and config | `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.env.local.example`, `.gitignore`, [TESTING.md](../TESTING.md) |
| Custody and roles | The Paiflow token custodian (proposed, B-07) and the operator account holder |

**Carlos does not:**

- **No schema work.** Do not write migrations, SQL or RLS. Specify requirements to Francis instead (CR process).
- **No page or component edits.** Do not edit Shanti's pages or components to wire payments. Supply hooks plus integration examples.
- **No business logic.** Do not implement plan, approval, document or deal logic. The **approval gate** belongs to Francis's `beginPaymentAttempt` (REQ-BUD-02 AC4); your route must call it **before** any Paiflow call.
- **No browser-side Paiflow.** Do not expose the SDK, token or any Paiflow passthrough proxy to the browser.

**Package rule.** You are the only person who edits `package.json` or the lockfile. Handle requests per [Francis §1.3](FRANCIS-PHASETASK.md#13-dependency-package-handoff). Each lockfile change needs ⚠ AUTH plus a dependency-only commit.

---

## 2. Paiflow integration facts

These facts were checked during planning on 2026-10-25 against the starter source, `llms.md`, the official SDK README, the SDK reference and OpenAPI 1.2.0 (repo and hosted copies agree). **Facts marked SOURCE come from Paiflow server code, not from a published contract. Confirm them in C-02 or in rehearsal before relying on them.**

| Topic | Fact | Status |
|---|---|---|
| Package | `@paiflow/sdk@0.2.0` (npm `beta`; `latest` is 0.1.0, so pin the exact version). It is ESM-only. `engines.node ">=22.22.2 <23"`. | Docs |
| Client | `new Paiflow({ baseUrl, token }).deployment(deploymentId)` | Starter code |
| Capabilities | `capabilities.get()` returns `{network, triggerType, inputAsset, configurationSource, operations{…}}`. Each operation has `{status, authentication, requirements, nodeIds}`. **Recipient addresses and bps are never returned** (Francis CL-12). | Docs |
| Split | Percentage recipients must sum to 10,000 bps, all in the same mode, with no duplicates. The rounding remainder goes to the last recipient. A percentage Split consumes the deposit (llms.md Split). | Docs |
| Prepare | `execute.prepare({from, amount})` returns `{xdr, networkPassphrase, network, expiresAt}`, with `metadata.historyRequestId`. The window is about 180 s. | Docs + starter |
| Submit | `execute.submit({signedXdr}, {wait:false, preparationRequestId})` returns `{txHash, status: SUCCESS\|PENDING\|FAILED, ledger?, error?}`. It is idempotent on the envelope hash. FAILED can come with HTTP 200, and a 502 does not prove nothing was broadcast. | Docs |
| Status | `transactions.get(txHash)` returns `{txHash, network, status: SUCCESS\|FAILED\|PENDING\|UNKNOWN\|REJECTED, ledger?, error?}`. An unattributed hash gives HTTP 404, "does not prove the transaction failed". SUCCESS and FAILED are final. It covers execute and early-release records. The limit is 60/min per token. | Docs |
| Events | `events.list({cursor, limit, txHash})` returns `{items, nextCursor, hasMore}`. Each item is `{id, eventId, kind, topic, ledger, txHash, occurredAt, data}` with **no `nodeId`**. `events.pages(query,{maxPages})` deduplicates. The default `limit` conflicts between sources (SDK says 20, OpenAPI says 50), so **always pass `limit` explicitly**. The limit is 120/min. | Docs |
| Event `data` | <ul><li>`RECEIVE/deposit {from, amount, asset}`</li><li>`PAYOUT/pay {recipient, asset, payment}`, where the amount field is **`payment`**</li><li>(SHOULD) `PAYOUT/release {admin, branch, balance}`, with no recipient</li><li>**The Split payout event topic and fields were not found in the sources checked.**</li></ul>`asset` is a symbol such as `"XLM"`, or a contract address. | **SOURCE** / **unknown for Split** (B-04) |
| Release early (SHOULD) | `releaseEarly({nodeId})` returns `{nodeId, txHash, ledger?}` and "returns once it is final". There is **no Idempotency-Key, no reconcile endpoint and no 409**. Errors are 422, 429 and 502 (`details` may carry a txHash). The limit is 10/min per token. | Docs |
| Balances | `balances.get()` gives per-node balances plus freshness. The docs say they are "not … evidence of payment success". Not used for MVP verification. | Docs |
| Errors | `PaiflowApiError {status, code, fields, details, metadata{status, requestId, historyRequestId, retryAfter}}`. Other error classes: `PaiflowAbortError`, `PaiflowTimeoutError`, `PaiflowTransportError`, `PaiflowMalformedResponseError`. | Docs |
| Freighter | `@stellar/freighter-api@6.0.1`. `signMessage(message, {address, networkPassphrase})` returns `{signedMessage: string (base64) \| Buffer (older) \| null, signerAddress, error?}` and follows SEP-53. `signTransaction(xdr, {networkPassphrase, address})` returns `{signedTxXdr, signerAddress, error?}`. | Docs |
| SEP-53 verify | In `@stellar/stellar-sdk@17.2.1`, `Keypair.fromPublicKey(addr).verifyMessage(message, signatureBytes)`. Decode base64 to bytes first, and do **not** use `Keypair.verify`. Node `>=22.12.0`. | Docs |
| Next.js 16 | The starter uses Next 15.5, and this repo uses 16.1.6. Compatibility is **unverified**. | Unknown (B-10) |

---

## 3. Phases and tasks

The phases below are listed in order:

| Phase | Tasks | Purpose |
|---|---|---|
| A | C-01…C-05 | Tooling, spikes and pure pieces; can start now |
| B | C-06…C-13 | Server routes and verification against Francis's persistence interface |
| C | C-14…C-17 | Browser wallet, real controllers, operator reviews, negative paths |
| D | C-18 | MVP Testnet rehearsal (⚠ AUTH) |
| E | C-30…C-37 | SHOULD protected payment and STRETCH; only after G5 |

Every task lists requirement IDs, a deliverable, owned paths, dependencies or handoffs, acceptance checks and evidence. Mocked results and Testnet results are recorded separately in §7.

### Phase A — Tooling, spikes, pure helpers (start immediately) [MVP]

- [ ] **C-01 Toolchain, dependencies and test scripts (HO-02, B-10)**
  - **Requirements:** PRD AS-05, §M.1.
  - **Deliverable:**
    1. **Node.** Every server machine uses Node 22.22.2 via nvm-windows (setup guide p2). Record `node -v`.
    2. **⚠ AUTH dependency commit:** `@paiflow/sdk@0.2.0` (exact), `@stellar/stellar-sdk@^17.2.1`, `@stellar/freighter-api@^6.0.1`, `server-only`; dev: `vitest`, `vite` (pinned as in the starter), and on request `@supabase/ssr`.
    3. **Scripts:** `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`, `"check:bundle": "node scripts/check-browser-bundle.mjs"`.
    4. **Vitest config:** `vitest.config.ts` with the `@` → `./src` alias.
    5. **Next 16 check:** a minimal build that imports the SDK inside a `server-only` module.
  - **Owns:** manifests, `vitest.config.ts`, tooling config.
  - **Depends on:** nothing.
  - **Acceptance:**
    - `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass on Node 22.22.2.
    - Any engine or Next 16 incompatibility is reported as a CR with a proposed fix rather than worked around.
  - **Evidence:** command outputs and versions.

- [ ] **C-02 Integration spikes S0 (B-03, B-04, B-05, B-08; HO-03, HO-04)**
  - **Requirements:** Q-06, Q-07, Q-08, Q-11, D-07.
  - **Deliverable:** a findings note in §7 that confirms or corrects §2 for each question:
    - **(a) Q-08.** In a scratch browser page on a dev branch (not merged to `main`), sign a test message with a Testnet Freighter account and verify it server-side with `Keypair.verifyMessage`. Record the exact `signedMessage` type and encoding. **HO-03 to Francis.**
    - **(b) Read-only SDK calls against Split R1** after Shanti's handoff: `capabilities.get()` and `events.list({limit: 50})`.
    - **(c) Payload capture.** Record **real event payloads** from the R1 rehearsal payment (T-04): the RECEIVE fields and the **Split payout** kind, topic and fields per recipient. Never send extra transactions to learn this. **HO-04 to Francis.**
    - **(d) SHOULD, docs and source only:** whether release-early rate limiting happens before relayer action. Never test it by sending releases.
  - **Owns:** findings only.
  - **Depends on:** C-01, and S-02/S-04 for (b) and (c).
  - **Acceptance:** each B-item is updated (via Francis) to **Confirmed** or **Still unverified**, with its interim behaviour kept.
  - **Evidence:**
    - Non-secret excerpts: kinds, topics and field names. Addresses are shortened.
    - Never include the token or a signed envelope.

- [ ] **C-03 Server-only Paiflow adapter and configuration validation**
  - **Requirements:** PRD §K.1, REQ-DEP-01 AC4, REQ-ESC-01 AC6.
  - **Deliverable:** `src/server/paiflow/{config,client,errors}.ts` with `import "server-only"`, ported from starter `lib/paiflow.ts` and `lib/http.ts`:
    - **Config validation:**
      - `PAIFLOW_BASE_URL` must be https (or `http://localhost`) with no path, credentials, query or hash.
      - `PAIFLOW_API_TOKEN` must match `^(pfk|pfd)_[a-f0-9]{64}$`.
      - The SDK client is constructed only for a deployment UUID taken from **Francis's registry row** (never from the browser or discovery order).
    - **Error mapping:** `PaiflowApiError` maps to safe codes ([Francis §3.3](FRANCIS-PHASETASK.md#contract-errors)), keeping `requestId` and `retryAfter`. Raw messages and tokens are never logged.
    - **Status reporting:** `integration/status` route.
  - **Depends on:** C-01, HO-01.
  - **Acceptance:**
    - A missing or invalid configuration gives 503 `PAIFLOW_NOT_CONFIGURED`.
    - The token never appears in responses or logs, checked by a test that spies on `console`.
    - There is no `NEXT_PUBLIC_` Paiflow variable.
  - **Evidence:** test output.

- [ ] **C-04 Pure helpers: amounts, envelopes, explorer, assets**
  - **Requirements:** INV-10, REQ-ESC-01 AC3, PRD §J.
  - **Deliverable:**
    - `src/lib/amount.ts`: `toStroops`, `fromStroops` (starter), plus `parseHorizonBalance` that accepts `"0.0000000"`.
    - `src/lib/stellar/envelope.ts`: `envelopeHash`, which refuses fee-bump envelopes; `assertOriginal(unsigned, signed, expectedHash)`; `feeStroops(xdr)`.
    - `src/lib/explorer.ts`: Stellar Expert testnet URL.
    - `src/lib/stellar/asset.ts`: `matchesNativeAsset(eventAsset)`, which accepts `"XLM"` or the native asset contract ID for Testnet.
    - Split shares come from Francis's `src/contracts/split.ts`, never a second implementation.
  - **Depends on:** C-01.
  - **Acceptance:**
    - Starter amount and envelope tests are ported.
    - A changed body is rejected, and a signature-only change is accepted.
    - Floats are never used.
  - **Evidence:** test output (Mocked).

- [ ] **C-05 Payment API client and fixture-backed mock controllers (HO-06)**
  - **Requirements:** the PRD §J MVP money screens.
  - **Deliverable:**
    - `src/client/api/payments.ts`, typed per [Francis §3.5](FRANCIS-PHASETASK.md#contract-endpoints).
    - `src/client/controllers/index.ts`, exporting the [§3.7 hooks](FRANCIS-PHASETASK.md#contract-controllers) and `getControllerMode()`.
    - `src/client/controllers/mock/**`, which implements `useFreighter`, `useWalletBinding`, `usePayment` (plan scope), `usePlanEvidence`, `useWalletSummary` and `useOperatorConsole` over Francis's fixtures. It simulates each phase, including `refused_not_approved`, `wallet_changed`, `expired`, `unresolved`, a partial "2 of 3" verification, `mismatch` and an `unavailable` balance.
    - Fixture mode is enabled only when `NEXT_PUBLIC_CYFER_FIXTURES=1` and the build is not production.
  - **Depends on:** HO-01.
  - **Handoff:** HO-06 to Shanti, with a usage snippet per hook in §4.
  - **Acceptance:**
    - Shanti can render every MVP money state without a server.
    - Mocks never import Freighter or the SDK.
  - **Evidence:** commit hash; the snippet list.

### Phase B — Server routes and verification [MVP]

- [ ] **C-06 Deployment registration and capability verification (operator)**
  - **Requirements:** REQ-DEP-01, PRD CL-12.
  - **Deliverable:** `POST/GET /api/operator/deployments`, behind Francis's `requireOperator`:
    - Validates Shanti's handoff fields: template `budget_split`, ordered recipients with bps, distinct addresses, total 10,000.
    - Calls `capabilities.get()` and requires:
      - `network === 'testnet'`
      - `triggerType === 'deposit'`
      - `inputAsset.kind === 'native'`
      - `operations.execute` not `unsupported`
      - (SHOULD escrow) also `operations.releaseEarly` not `unsupported`, and the node ID among `releaseEarly.nodeIds`
    - Computes `graphSnapshotSha256` with Francis's `canonicalJson`.
    - Calls `registerDeployment`, storing the capability snapshot with no credentials.
  - **Depends on:** C-03, F-11 (HO-05), HO-07, HO-08.
  - **Acceptance:**
    - A capability mismatch returns 422 `CAPABILITY_MISMATCH` and registers `unusable`.
    - A second `available` Split is flagged (CL-11).
    - **Recipients and bps are labelled operator-attested** (Paiflow does not return them).
  - **Evidence:** capability check output for R1, R2 and D1 (no token).

- [ ] **C-07 Pay prepare route (approval-gated)**
  - **Requirements:** REQ-ESC-01 behaviour 1–5, AC1, AC4; **REQ-BUD-02 AC4**; REQ-BUD-03; INV-01, INV-03, INV-04.
  - **Deliverable:** `POST …/budget-plans/:planId/pay/prepare`, which does the following in order:
    1. Same-origin check, session, rate limit `prepare`.
    2. `beginPaymentAttempt({kind:'plan'})`.
       - `PLAN_NOT_APPROVED`, `NOT_SIGNER` or `WALLET_MISMATCH` → 403, and **the SDK is never called**.
       - `existing` → return that attempt (CL-06).
    3. `execute.prepare({from: signerAddress, amount: totalStroops})` on the reserved Split deployment.
    4. Check `network === 'testnet'` and the passphrase.
    5. Compute `envelopeHash`, then call `recordPreparation` **before** responding.
    6. `markSignatureRequested`.
    7. Return `PaymentReviewDTO`, including the envelope recipients and expected shares the signer consents to.
    - On a Paiflow error before any XDR exists, call `failPreparation`.
  - **Depends on:** C-03, C-04, HO-05, F-12.
  - **Acceptance (mocked SDK, with call counts):**
    - **Plan not fully approved → 403 and 0 SDK calls.**
    - The preparation is stored before the response (order asserted).
    - A second call returns the same attempt with 1 SDK call total.
    - A non-signer or a wallet mismatch → 403.
  - **Evidence:** test output.

- [ ] **C-08 Pay submit route**
  - **Requirements:** REQ-ESC-01 behaviour 6–8, AC2, AC3; INV-02, INV-06.
  - **Deliverable:** `POST …/pay/submit`, which does the following in order:
    1. Body ≤ 210,000 bytes and `signedXdr` ≤ 200,000 chars.
    2. Session plus signer check.
    3. Reject a fee-bump or unparseable envelope: `recordEnvelopeRejection`, then 422.
    4. Compare the body hash to the original. A mismatch gives `recordEnvelopeRejection` plus 422 `ENVELOPE_CHANGED`.
    5. `persistSignedEnvelope` **before** submitting.
    6. `execute.submit({signedXdr}, {wait:false, preparationRequestId})`, then check `txHash === originalHash`.
    7. `recordSubmission`. A transport error becomes `transport_error`, never a failure.
    8. One bounded read-only status check (C-09 logic).
  - **Depends on:** C-07.
  - **Acceptance (mocked):**
    - The signed row exists before the submit mock runs.
    - A changed body or fee-bump is rejected and kept.
    - A 502 leaves the attempt unresolved, with no new prepare.
    - PENDING, UNKNOWN or 502 never shows "confirmed" (REQ-ESC-02 AC1).
  - **Evidence:** test output.

- [ ] **C-09 Read-only check and explicit same-envelope resubmit (CL-05)**
  - **Requirements:** REQ-REC-01 AC1–AC3, REQ-ESC-02 AC2, PRD §G.4, INV-05…INV-08, D-13.
  - **Deliverable:**
    - **`pay/check`.** Calls `transactions.get(originalHash)` with at most 6 lookups in a 30 s window, backoff capped at 8 s, honouring `Retry-After`, then `recordStatusCheck`:
      - A 404 maps to `not_found` (unresolved, never failed).
      - It sets `checksExhausted` when bounds are hit.
      - It **never submits or prepares**.
    - **`pay/resubmit`.** Requires `intent: 'resubmit_same_signed_envelope'` plus a matching `originalTxHash`, a stored signed envelope and no final status. It posts the **byte-identical stored** envelope with the original `preparationRequestId`.
    - **`markExpiredUnsigned`.** Applied when expired with no signed envelope.
  - **Depends on:** C-08.
  - **Acceptance (mocked):**
    - `check` makes 0 submit calls.
    - `resubmit` sends exactly the stored bytes.
    - A 404 or expiry does not make `pay` allowed again.
    - FAILED moves the plan back to `approved` only after it is recorded.
  - **Evidence:** test output.

- [ ] **C-10 Event ingestion: pagination, cursors, dedupe**
  - **Requirements:** PRD §G.6, §H.3 #12–13, INV-08.
  - **Deliverable:** `src/server/paiflow/events.ts`:
    - It uses `acquireReconcileLease` per deployment.
    - It pages `events.list({cursor, limit: 100})` from `getEventCursor` while `hasMore`, up to a bounded page cap per run, and uses `events.list({txHash})` with a separate `tx:` cursor scope for the payment hash.
    - It calls `upsertPaiflowEvents` (dedupe on `eventId`) and then `advanceEventCursor(expected, next)`. If that returns false, it re-reads.
    - It honours `Retry-After` and `consumeReconcileBudget`.
    - It never sends `cursor=` empty.
  - **Depends on:** HO-05, C-03.
  - **Acceptance (mocked):**
    - Multi-page fixtures are fully ingested.
    - Duplicates are ignored.
    - A concurrent cursor advance is not clobbered.
    - A page cap is never treated as completeness.
  - **Evidence:** test output.

- [ ] **C-11 Payment receipt and per-envelope Split verifier (pure functions)**
  - **Requirements:** REQ-PAY-01, REQ-BUD-03 AC1, PRD §H.1, §H.2, **§H.5**, INV-03, D-13.
  - **Deliverable:** `src/server/paiflow/verify.ts` returns `VerificationInput` ([Francis §3.6](FRANCIS-PHASETASK.md#contract-persistence)):
    - **Payment receipt, H.1 + H.2.** `transactions.get(original)` is SUCCESS with matching hash and `testnet`. A `RECEIVE`/`deposit` event in that tx has `from === signerAddress`, `amount === totalStroops` (string compare) and a native asset.
    - **Envelope payout, H.5.** For each envelope, find a PAYOUT event for the original payment to the **registered envelope address**, with the amount exactly equal to `splitShares()` for that position (the remainder on the last). A shortfall or surplus is a `mismatch`, recording both values. Each envelope is verified independently.
    - **Unknown payload shape (B-04).** Until C-02(c) records the real Split payout shape, envelope checks that depend on it return `pending`, never `pass`. After recording, the parser is updated and the fixtures are replaced with the recorded shape.
    - **SHOULD:** escrow H.3 release and refund checks are added in C-33.
  - **Depends on:** C-04, F-01 (`split.ts`).
  - **Acceptance:**
    - Each H.1, H.2 and H.5 check has a passing and a failing fixture test (REQ-PAY-01 AC).
    - "2 of 3 verified" never becomes `distribution_verified`.
  - **Evidence:** test output (Mocked). Fixture provenance (docs, source or recorded) is noted.

- [ ] **C-12 Reconciliation runner (B-06)**
  - **Requirements:** REQ-ESC-02, REQ-BUD-03, REQ-REC-01, PRD §G.6.
  - **Deliverable:**
    - **`src/server/paiflow/reconcile.ts`.** One bounded pass per scope:
      1. Status checks for unresolved attempts.
      2. Event ingestion.
      3. Payment receipt and envelope payout verification.
      4. An operator review when evidence is still missing after `PAYOUT_EVIDENCE_THRESHOLD_SECONDS`.
      5. **Read-only toward Paiflow.** It never submits or prepares.
    - **`POST …/budget-plans/:planId/evidence/refresh`.** Member-triggered, at least 15 s apart.
    - **Execution mechanism (choose one and record it):**
      - **(a)** A lease-guarded interval started from Next `instrumentation.ts` on the Node runtime, on the single demo server process.
      - **(b)** `POST /api/internal/reconcile`, protected by a server-only secret, called every 30 s by a local loop script.
      - **(c)** Manual refresh only.
      - Prefer (a) or (b), and document per-process caveats.
  - **Depends on:** C-09…C-11.
  - **Acceptance:**
    - With no browser open, an R1 payment progresses to verified states (shown in G5).
    - Caps hold (≤ 40 polls/scope/hour).
    - Two runners never double-process (lease test).
  - **Evidence:** test output; the chosen mechanism.

- [ ] **C-13 Wallet summary route**
  - **Requirements:** REQ-WAL-01 AC1–AC3, G-05.
  - **Deliverable:** `GET /api/wallet/summary`:
    - It takes `getWalletContext(userId)`.
    - It reads the native balance of the **bound** address from Horizon Testnet (`https://horizon-testnet.stellar.org/accounts/{G}`, public data, with a timeout). A failure gives `balance.state:'unavailable'`, never 0.
    - It adds explorer URLs.
    - It keeps the three panels separate (balance; plan payment status and, SHOULD, escrow; verified payouts), with no summing.
    - Only `verified` items count.
  - **Depends on:** HO-05, C-04.
  - **Acceptance (mocked):**
    - A Horizon failure gives "unavailable".
    - No CYFER audit hash appears in `history`.
    - Unverified payouts are excluded from totals.
  - **Evidence:** test output.

### Phase C — Browser wallet, real controllers, negative paths [MVP]

- [ ] **C-14 Freighter browser module**
  - **Requirements:** REQ-ACC-02 behaviour 2, REQ-ESC-01 behaviour 6, PRD §F.4 "Wallet change".
  - **Deliverable:** `src/client/wallet/freighter.ts`, ported from starter `lib/wallet.ts`:
    - `connect` and `refresh`, with bounded timeouts.
    - A Testnet passphrase check.
    - `signChallenge(message, address)`, which returns base64, converting a Buffer if needed.
    - `signPrepared(review, xdr, boundAddress)`, which refuses when the prepared network is not Testnet, the preparation is expired, Freighter's address ≠ bound address, Freighter is on another network, or `signerAddress` ≠ bound.
  - **Depends on:** C-01, C-02(a).
  - **Acceptance:** the starter `tests/wallet.test.ts` cases are ported, plus `signMessage` tests (mocked Freighter).
  - **Evidence:** test output.

- [ ] **C-15 Real controllers and integration examples (HO-10)**
  - **Requirements:** the PRD §J MVP screens, REQ-REC-01 AC1.
  - **Deliverable:** live implementations of `useFreighter`, `useWalletBinding` (Francis's challenge and bind routes plus C-14), `usePayment` (plan scope), `usePlanEvidence`, `useWalletSummary` and `useOperatorConsole`.
    - They rehydrate from the server after a reload.
    - No financial state is kept in `localStorage`.
    - There is no browser polling loop that makes decisions.
    - §4 gets a usage snippet per hook.
  - **Depends on:** C-05, C-07…C-14, F-13, F-17.
  - **Acceptance:**
    - Swapping mock for live mode needs no page changes, only the env flag.
    - A reload mid-attempt shows the same attempt and original hash (REQ-REC-01 AC1, mocked).
  - **Evidence:** test output; HO-10 note.

- [ ] **C-16 Operator review routes**
  - **Requirements:** PRD §D.1 Operator, §G.4 `NOT_FOUND`.
  - **Deliverable:** `GET /api/operator/reviews` and `POST /api/operator/reviews/:reviewId`, calling `resolveOperatorReview` with a mandatory justification and evidence.
  - **Depends on:** HO-05.
  - **Acceptance:**
    - A non-operator gets 403.
    - An empty justification gets 422.
    - No outcome prepares a replacement payment.
  - **Evidence:** test output.

- [ ] **C-17 Credential isolation and payment negative-path suite (input to G7)**
  - **Requirements:** REQ-ESC-01 AC6, REQ-BUD-02 AC4, PRD §K.1, §K.10.
  - **Deliverable:**
    - **`scripts/check-browser-bundle.mjs`** (starter pattern) extended to also fail on `SUPABASE_SERVICE_ROLE_KEY`, service-role JWT-like strings, and the `[FIXTURE]` marker in a production build.
    - **`npm run check:bundle`** wired up.
    - **Tests:**
      - The token is absent from every route response and from logs.
      - A not-approved plan's prepare gets 403 with 0 SDK calls.
      - A non-signer gets 403.
      - Cross-origin requests on every payment route get 403.
      - Oversize bodies get 413.
  - **Depends on:** C-06…C-16.
  - **Acceptance:** all pass; output handed to Francis for [G7](FRANCIS-PHASETASK.md#g7).
  - **Evidence:** script and test output.

### Phase D — MVP Testnet rehearsal (⚠ AUTH for every transaction)

- [ ] **C-18 Lead rehearsal T-01…T-07 → [G5](#g5)**
  - **Requirements:** PRD §M.3 T-01…T-07, REQ-ACC-02, BUD-01/02/03, ESC-01/02, DOC-01, DLV-02, PAY-01, REC-01.
  - **Deliverable:** one small rehearsal (1 XLM total) on **Split R1**, plus the T-07 reload test on **Split R2**. Neither runs on the live deployment D1 or via the hosted page.
  - **Depends on:** G2, G3, G4, HO-11, and authorisation recorded in §7.
  - **Acceptance:** [G5](#g5).
  - **Evidence:** as listed in G5.

### Phase E — SHOULD and STRETCH (after G5 only; never blocks G5, G7 or G8)

- [ ] **C-30 [SHOULD] Deal fund routes**
  - **Requirements:** REQ-ESC-01/02 deal parts, REC-01.
  - **Deliverable:** `deals/[id]/fund/{prepare,submit,check,resubmit}`, reusing C-07…C-09 with `PayScope {kind:'deal'}`:
    - deadline margin (`FUNDING_MARGIN_SECONDS`)
    - binding = buyer
    - "held" only after a verified deposit (`recordDepositVerification`)
  - **Depends on:** G5, F-31.
  - **Acceptance:** REQ-ESC-01 AC5; REQ-ESC-02 AC1/AC2 for deals (mocked).

- [ ] **C-31 [SHOULD] Release route**
  - **Requirements:** REQ-REL-01 AC1–AC4, REQ-REF-01 AC3, D-07, B-05.
  - **Deliverable:** `POST /api/deals/:id/release`. It calls `beginReleaseAttempt` (committed), then makes **one** `releaseEarly({nodeId})` call, followed by `recordReleaseOutcome`:
    - 422 deadline → `refused/DEADLINE_PASSED`.
    - 422 nothing → `refused/NOTHING_TO_RELEASE`, plus an operator review.
    - 429 → B-05 interim (uncertain, no retry).
    - Timeout or 502 → `uncertain`, keeping any `details` hash.
  - **Depends on:** C-30, F-31.
  - **Acceptance (mocked SDK call counts):**
    - Without approval → 403 and 0 calls.
    - 10 concurrent requests → ≤ 1 call.
    - An uncertain outcome → never a second call.
    - After the deadline → 0 calls.

- [ ] **C-32 [SHOULD] Read-only release check and operator-authorised retry**
  - **Requirements:** PRD §G.5.
  - **Deliverable:**
    - `POST …/release/check`: `transactions.get(hash)` plus `events.list({txHash})`, or a scan for `PAYOUT/release branch:"before"` plus `pay` to the seller. **It never calls `releaseEarly`.**
    - A retry is possible only via a C-16 `release_retry_authorised` outcome, used once.
  - **Depends on:** C-31.
  - **Acceptance:** the check makes 0 release calls; an authorisation is used at most once.

- [ ] **C-33 [SHOULD] Escrow verifier and deadline/refund tracking**
  - **Requirements:** REQ-REF-01 AC1–AC3, PRD §H.3.
  - **Deliverable:**
    - Release payout: `PAYOUT/release branch:"before"` + `PAYOUT/pay` to the seller for the amount.
    - Refund: `branch:"after"` + `pay` to the buyer for the amount. If `transactions.get` gives 404 for the automatic refund hash, finality stays `pending` and an operator review opens.
    - Direction mismatches are flagged.
    - `applyDeadlineTransitions` is added to C-12.
  - **Depends on:** C-12, F-31.
  - **Acceptance:** H.3 pass and fail fixtures; "Refunded" only after verification.

- [ ] **C-34 [SHOULD] Deal controllers**
  - **Deliverable:** `usePayment({kind:'deal'})` live, `useDealEvidence` and `useRelease`, with mocks and §4 snippets.
  - **Depends on:** C-30…C-33.

- [ ] **C-35 [SHOULD] Lead protected-payment rehearsal T-08…T-11 → [G6](#g6)**
  - **Depends on:** C-30…C-34, F-30…F-32, Shanti S-30 (E-R1, E-F1), ⚠ AUTH.

- [ ] **C-36 [STRETCH] USDC**
  - **Deliverable:** a separate USDC deployment path, asset checks for `{kind:"known", symbol:"USDC"}`, and the trustline-error mapping. Never mixed into the XLM MVP configuration.

- [ ] **C-37 [STRETCH] Pay to a fixed payee (REQ-MOV-01)**
  - **Deliverable:** a Pay deployment payment, refused before prepare when the recipient is not the registered one.

---

## 4. Integration examples for Shanti (filled in by C-05 / C-15)

Use one short snippet per hook, showing the import, which fields to render, which actions to wire to which buttons, and the disabled conditions. An example of the required pattern:

```tsx
// Pattern only — final code is written in C-05/C-15 against src/contracts/controllers.ts
const pay = usePayment({ kind: 'plan', orgId, planId });
// "Sign payment" → pay.start()   disabled={pay.busy || !plan.allowedActions.includes('pay')}
// If plan.allowedActions includes 'pay_blocked_until_approved': show disabled button + "Waiting for all approvers (k of n)".
//   Demo of the server gate: pay.start() → phase 'refused_not_approved' (403, no Paiflow call).
// Modal shows pay.review: TESTNET, total, asset, the three envelopes with expected shares, fee, expiry
// "Sign in Freighter" → pay.signAndSubmit()   (explicit consent click; never auto-called)
// "Check original transaction" → pay.checkOriginal()   (read-only)
// "Resubmit same signed envelope" → confirm dialog → pay.resubmitSameEnvelope()
//   only when plan.allowedActions.includes('resubmit_same_envelope')
```

**Fixture mode (HO-06).** Run with `NEXT_PUBLIC_CYFER_FIXTURES=1 npm run dev`. Render the "FIXTURE DATA — not Testnet" banner when `getControllerMode() === 'fixture'`. Pick the story with URL parameters: `fixturePlan=<PlanState>`, `fixturePartial=1` (2 of 3 verified), `fixturePayment=confirmed|refused_not_approved|wallet_changed|expired|unresolved|failed`, `fixtureWallet=ok|unavailable|empty`, `fixtureFreighter=connected|not_installed|not_connected|wrong_network`, `fixtureDelay=<ms>`. Example: `/plans/x?fixturePlan=payment_confirmed&fixturePartial=1`. Live mode currently returns a "not connected" error from every hook until C-15.

```tsx
import { useFreighter, useWalletBinding, usePayment, usePlanEvidence,
  useWalletSummary, useOperatorConsole, getControllerMode } from '@/client/controllers';

// useFreighter — wallet chip
const fr = useFreighter();
// render fr.status / fr.address; "Connect Freighter" → fr.connect()  disabled={fr.status === 'not_installed'}
// fr.error?.message for not_installed / wrong_network

// useWalletBinding — wallet page
const wb = useWalletBinding();
// "Bind wallet" → wb.bind()  disabled={wb.phase !== 'idle' && wb.phase !== 'error'}
// show wb.binding?.address, wb.binding?.verifiedAt; warn when wb.freighterMatchesBinding === false

// usePlanEvidence — plan page
const ev = usePlanEvidence(orgId, planId, { auto: true });
// render ev.plan (envelopes[].payout.state, payoutsVerified, payment, allowedActions); ev.loading skeleton
// "Refresh evidence" → ev.refreshEvidence()  disabled={ev.refreshing}  (ev.error.retryAfterMs on RATE_LIMITED)

// usePayment — see the pattern above; buttons from ev.plan.allowedActions, disabled={pay.busy}

// useWalletSummary — wallet page
const ws = useWalletSummary();
// ws.data.balance.state === 'unavailable' → "Balance unavailable" (never 0); history[].explorerUrl links
// verifiedPayouts are verified-only totals

// useOperatorConsole — operator page
const op = useOperatorConsole();
// list op.deployments / op.reviews; "Resolve" → op.resolveReview(id, { outcome, justification, evidence: { notes } })
// "Register" → op.registerDeployment(input); show op.error?.message (BPS_TOTAL_INVALID, DUPLICATE_RECIPIENT, VALIDATION)
```

| Hook | Snippet delivered (commit) |
|---|---|
| `useFreighter` | Fixture: `4524866`, `5104ea6` |
| `useWalletBinding` | Fixture: `4524866`, `5104ea6` |
| `usePayment` (plan) | Fixture: `4524866`, `5104ea6` |
| `usePlanEvidence` | Fixture: `4524866`, `5104ea6` |
| `useWalletSummary` | Fixture: `4524866`, `5104ea6` |
| `useOperatorConsole` | Fixture: `4524866`, `5104ea6` |
| SHOULD: `usePayment` (deal), `useDealEvidence`, `useRelease` | — |

---

## 5. Gates owned by Carlos (canonical)

<a id="g3"></a>
### G3 — Backend routes and headless wallet/payment integration verified with fixtures

- **Owner:** Carlos. Francis confirms his business routes against the same fixtures.
- **Prerequisites:** G1; HO-05; C-03…C-16; F-12…F-17.
- **Pass criteria (Mocked level; no Testnet needed):**
  - [ ] `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` pass on Node 22.22.2.
  - [ ] Every C-07…C-13 acceptance test passes, with SDK call counts asserted. This **includes 0 calls when the plan is not fully approved**.
  - [ ] Each H.1, H.2 and H.5 verifier check has a pass and a fail fixture. Envelope checks on unknown payload fields return `pending`.
  - [ ] Every MVP §3.7 hook works in fixture mode **and** compiles in live mode.
  - [ ] Route responses validate against Francis's DTO types. A snapshot shows no XDR after submit and no request IDs or tokens.
- **Evidence:** test runner output (labelled **Mocked**), commit hash, and the list of tests per requirement.

<a id="g5"></a>
### G5 — MVP end to end: plan → approvals → Split payment → verified distribution + recovery (Testnet)

- **Owner:** Carlos (accountable lead).
- **Responsibilities:**
  - **Francis:** accounts, org, plan routes, DB checks.
  - **Shanti:** drives the UI and Freighter on the demo machine and captures screenshots.
  - **Carlos:** server logs (safe), verification, evidence record.
- **Prerequisites:** G2, G3, G4; Split R1 registered and reserved by the rehearsal plan; ⚠ AUTH recorded (who, time, amount, deployment).
- **Pass criteria (Manual Testnet, PRD §M.3):**
  - [ ] **T-01:** owner/signer and approver wallets bound and verified (public addresses recorded).
  - [ ] **T-02:** budget plan 50/30/20 recorded. The plan hash and ledger block are recorded, and the envelopes match R1.
  - [ ] **T-03:** a payment attempt before full approval gets **403, and the logs show no Paiflow call**. The plan becomes `approved` only after the last approver.
  - [ ] **T-04:** the signer signs the 1 XLM Split payment in Freighter. The original hash is `SUCCESS`, the RECEIVE is matched, and the plan shows "Payment pending" or "Payment confirmed; k of 3 payouts verified" until all are verified.
  - [ ] **T-05:** three envelope payouts are verified at 5,000,000 / 3,000,000 / 2,000,000 stroops, and the plan shows "Distribution verified". The real Split payout payload is recorded (closes or updates B-04, HO-04).
  - [ ] **T-06:** the same document gives "match", and a one-byte-altered document gives "no match" (no "tampered").
  - [ ] **T-07:** on **Split R2** with a separate plan, a reload mid-payment (before signing) shows the same attempt and original hash, with no new prepare.
- **Evidence (all public):**
  - deployment UUIDs
  - plan hash, payment hash and payout evidence (event IDs plus hashes), with Stellar Expert (testnet) links
  - document SHA-256
  - attempt IDs
  - screenshots
  - the authorisation record

  **Not done:** a rendered screen or an HTTP 200 alone does not pass G5.

<a id="g6"></a>
### G6 — [SHOULD] Protected payment, including a separate refund rehearsal

- **Owner:** Carlos.
- **Responsibilities:**
  - **Shanti:** deploys E-R1 and E-F1 (S-30).
  - **Francis:** deal accounts and routes.
- **Tier:** **never blocks the MVP (G1–G5, G7) or G8.**
- **Prerequisites:** G5; C-30…C-34; F-30…F-32; ⚠ AUTH.
- **Pass criteria (Manual Testnet, PRD §M.3):**
  - [ ] **T-08 (E-R1):** deal created and accepted; payer funds 1 XLM; SUCCESS, RECEIVE matched, "Held".
  - [ ] **T-09 (E-R1):** payee uploads; payer approves v1; release hash; PAYOUT to the payee verified.
  - [ ] **T-10 (E-F1, separate short-deadline deployment, no approval):**
    - There is no release-early call.
    - After the deadline the deal shows "Deadline reached; refund pending (polled)", never "Refunded".
    - The PAYOUT to the payer is verified some minutes later.
    - If funded via the hosted page, it is labelled "funded via Paiflow hosted page, not CYFER checkout".
  - [ ] **T-11:** the payee session's release attempt gets 403, with no Paiflow call.
- **Evidence:**
  - UUIDs and deadlines
  - deposit, release and refund hashes, with explorer links
  - the time from deadline to verified refund
  - screenshots
- **Pitch use:** labelled **Recorded** (PRD §N.2), or the refund rule is **Explained** if not run.

---

## 6. What Carlos can start immediately vs what must wait

- **Now:** C-01, C-02(a)/(d), C-04, C-05 (after HO-01), and C-03 skeleton and config validation.
- **Waits:**
  - C-02(b)/(c) wait on S-02/S-04 and the R1 rehearsal payment.
  - C-06 waits on HO-07/HO-08 and F-11.
  - C-07…C-13 wait on HO-05.
  - C-14 waits on C-02(a).
  - C-15 waits on F-13/F-17.
  - C-18 waits on G2–G4.
  - All C-30+ wait on G5.

<a id="evidence-log"></a>
## 7. Evidence log (Carlos)

| Time (PHT) | Task/Gate | Evidence (no secrets, no XDR) | Level (Mocked / Testnet / Human) | Authorised by (Testnet/deps) |
|---|---|---|---|---|
| 12:30 | C-01 deps | `@paiflow/sdk@0.2.0` (exact), `@stellar/stellar-sdk@17.3.0`, `@stellar/freighter-api@6.0.1`, `server-only`, `vitest@4.1.12`, `vite@8.3.5` installed with npm. Dependency-only commit `9b7f595`. **Node v24.11.1, not 22.22.2** (engine warning; B-10 still open). | Mocked | Carlos (lockfile change, in chat) |
| 12:31 | C-01 scripts | `test`, `typecheck`, `check:bundle` scripts and `vitest.config.ts` (`9ce1a28`); tsconfig target ES2020 for bigint literals (`3fcd00e`) | Mocked | — |
| 12:38 | C-01 Next 16 check | `npm run build` passes on Next 16.1.6 with a throwaway route that calls `paiflowDeployment` and `toSafePaiflowError` (SDK bundled server-side only; none in `.next/static`). Probe not committed. | Mocked | — |
| 12:34 | C-04 | `src/lib/amount.ts`, `src/lib/stellar/{envelope,asset}.ts`, `src/lib/explorer.ts` (`39431ce`, `2077efd`). Changed body rejected, signature-only change accepted, fee-bump refused. Split shares not implemented here (waits on Francis `split.ts`). | Mocked | — |
| 12:37 | C-03 | `src/server/paiflow/{config,client,errors}.ts` (`231ed8b`) and `GET /api/integration/status` (`90a72bb`). Console spy test: token never logged. Status route has no session gate yet (waits on F-03). No live capability call yet (needs HO-07/HO-08). | Mocked | — |
| 12:40 | C-14 | `src/client/wallet/freighter.ts` (`3f5b58c`). Starter wallet cases ported; `signChallenge` output verified with `Keypair.verifyMessage` against a test key. **Not a real Freighter signature** (C-02(a) still open). | Mocked | — |
| 12:42 | C-17 (part) | Bundle scan extended (`6f57a77`); `npm run check:bundle` passes on the current production build. Route negative-path tests wait on C-06…C-16. | Mocked | — |
| 12:43 | Totals | `npm run lint` (0 errors, 6 inherited warnings), `npm run typecheck`, `npm test` (5 files, 105 tests), `npm run build`, `npm run check:bundle` all pass on Node v24.11.1 | Mocked | — |
| 12:47 | Merge | Francis's `francis/contracts` and `francis/schema` merged into `main` with no conflicts; all checks passed on the merged tree. | Mocked | — |
| 12:57 | C-11 | `src/server/paiflow/verify.ts` (`021e73c`): H.1 + H.2 receipt and H.5 per-envelope checks, each with pass and fail fixtures (29 tests). Fixture provenance: event field names from Paiflow source (§2); Split payout shape unknown (B-04), so envelope checks return `awaiting_events` by default. 2 of 3 never gives `allVerified`. | Mocked | — |
| 12:57 | C-05 | `src/client/api/payments.ts` (`d900a44`), mock controllers (`4524866`), index, mode switch and live stubs (`5104ea6`). Every MVP money state renders without a server; mocks import no Freighter/SDK (tested). Production build with a probe page: live hooks bundled, no `[FIXTURE]` (`check:bundle` passes). Snippets in §4 (HO-06). | Mocked | — |
| 12:57 | Totals (after C-05/C-11) | `npm run typecheck`, `npm run lint` (0 errors), `npm test` (8 files, 155 tests), `npm run build`, `npm run check:bundle` pass on Node v24.11.1 | Mocked | — |
| 13:05 | C-01 dependency update (requested by Francis) | Exact runtime dependency `@supabase/ssr@0.12.7` added to `package.json` and `package-lock.json` for Francis's F-12 cookie-session implementation. Installed by Francis under explicit user authorization in chat; one-time exception to the normal Carlos-owned manifest workflow. npm resolved compatible `@supabase/supabase-js@2.118.0`. Local install ran on Node v24.12.0 and reported the existing `@paiflow/sdk` engine mismatch; B-10 remains open. | Mocked | Francis (explicitly authorized in chat) |
| 13:16 | Routes plumbing | `src/server/paiflow/{route-kit,deps,attempt-view}.ts` (`9f3686f`): same-origin, streaming body limit, error envelope, injected deps. Live routes first answered 401 for everyone; after merging Francis's F-12 they read his cookie session and use his shared rate limits (see the F-12 wiring row). | Mocked | — |
| 13:16 | C-06 | `GET/POST /api/operator/deployments` (`b5c7ea1`). Capability mismatch → 422 `CAPABILITY_MISMATCH` and registered `unusable`; a second available Split → 409 `AMBIGUOUS_DEPLOYMENT_MATCH` with 0 Paiflow calls (refused rather than flagged); recipients labelled operator-attested. No capability check against R1/R2/D1 yet (needs HO-07/HO-08). | Mocked | — |
| 13:16 | C-07 | `pay/prepare` (`7197328`). Not approved → 403 and **0 SDK calls**; preparation recorded before the response (call order asserted); second call returns the same attempt with 1 SDK call total; non-signer / wallet mismatch → 403. | Mocked | — |
| 13:16 | C-08 | `pay/submit` (`952d8b6`). Signed row persisted before the submit mock runs; changed body, fee-bump, unparseable and wrong-signer envelopes rejected and kept; 502/timeout recorded as `transport_error` with no new prepare; PENDING/UNKNOWN never shows success. | Mocked | — |
| 13:16 | C-09 | `pay/check` and `pay/resubmit` (`7b79253`). Check makes 0 submit calls, ≤ 6 lookups in 30 s (backoff 1/2/4/8/8 s, Retry-After), 404 → `not_found`; resubmit sends exactly the stored bytes with the original preparation ID; final/terminal → 409. | Mocked | — |
| 13:16 | C-10 | `src/server/paiflow/events.ts` (`7e2614f`). Multi-page fixtures fully ingested, duplicates ignored, concurrent cursor advance not clobbered, page cap never complete, lease and poll budget honoured. Not wired to a scheduler yet (C-12). | Mocked | — |
| 13:16 | Totals (after C-06…C-10) | `npm run typecheck`, `npm run lint` (0 errors), `npm test` (16 files, 253 tests), `npm run build`, `npm run check:bundle` pass on Node v24.11.1. One build attempt failed fetching Google Fonts (`src/app/layout.tsx`, network); the rerun passed. | Mocked | — |
| 13:25 | F-12 wiring | Payment routes use Francis's `getAuthUserId` + `loadSession` and `limit()` (commit after `c622dc5`). Full suite: 18 files, 275 tests; build and `check:bundle` pass. Not yet exercised against the real Supabase project or Paiflow. | Mocked | — |
