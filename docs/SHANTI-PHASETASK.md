# SHANTI — Phase Tasks (UI developer and Paiflow website operator)

> Shared contracts, the ownership matrix, handoffs, blockers and the coordination rules are **canonical in [FRANCIS-PHASETASK.md](FRANCIS-PHASETASK.md)**. Payment and wallet behaviour is in [CARLOS-PHASETASK.md](CARLOS-PHASETASK.md). This document covers Shanti's screens, the **Paiflow website runbook** and gates **G4 and G8**.

| Field | Value |
|---|---|
| Owner | Shanti |
| Source of truth | [docs/PRD.MD](PRD.MD) v2.0.0 (§J screens, §L.3 manual deployment, §N demo) |
| Status | Planning only. Every task starts unchecked. |

**Quick links:**

- The data you render: [DTOs](FRANCIS-PHASETASK.md#contract-dtos) · [Allowed actions and state wording](FRANCIS-PHASETASK.md#contract-states) · [Error codes](FRANCIS-PHASETASK.md#contract-errors)
- The hooks you use: [Controller interface](FRANCIS-PHASETASK.md#contract-controllers) · [Hook usage snippets](CARLOS-PHASETASK.md#4-integration-examples-for-shanti-filled-in-by-c-05--c-16)
- Fixtures: [Fixtures and mocks](FRANCIS-PHASETASK.md#contract-fixtures)
- Rules and schedule: [Ownership](FRANCIS-PHASETASK.md#2-ownership-matrix-canonical) · [Time-box](FRANCIS-PHASETASK.md#02-recommended-time-box-for-today-pht-25-oct-2026)

---

## 1. Boundaries

**Shanti owns:**

- `src/app/(sme)/**` (new pages and layouts) and `src/components/sme/**`.
- The inherited `src/app/(public)/**`, `src/app/(admin)/**`, `src/components/**`, [globals.css](../src/app/globals.css), [postcss.config.mjs](../postcss.config.mjs), [constants.ts](../src/utils/constants.ts), [formatters.ts](../src/utils/formatters.ts), [client-storage.ts](../src/lib/client-storage.ts), `prototype/**` and `public/**`.
- Building and deploying the flows on the Paiflow website.

**Shanti does not** write any of the following. Use Carlos's hooks and Francis's `src/client/api/business.ts` instead.

- An SDK client
- Freighter calls
- Wallet-signing logic
- Payment or recovery state machines
- API routes
- Migrations

Use `deal.allowedActions` to decide which buttons appear. Do not re-derive rules from `deal.state`.

**Never on screen or in screenshots:**

- Paiflow tokens, the event access code, wallet secret keys or seed phrases.
- The Supabase service key or `.env.local` contents.
- Full XDR envelopes.

---

## 2. Paiflow website runbook (detailed)

### 2.1 Concepts to understand before clicking anything

- **Three different identifiers.** The **deployment UUID** (e.g. `xxxxxxxx-xxxx-4xxx-…`) is what the app and API use. It is **not** the flow ID and **not** the Stellar contract address that starts with `C` (Paiflow Guide p4, llms.md §3).
- **One deployment = one escrow relationship.** The client, seller, deadline and asset are fixed when you deploy, and all deposits share one held balance (llms.md Condition, PRD §B.7.1). That is why each rehearsal gets **its own** deployment.
- **Never reuse the live demo escrow** for tests, other deals or hosted-page experiments.
  - A hosted-page payment is a real deposit into that relationship. It changes the held balance and can be released or refunded with the demo's money.
  - Use dedicated rehearsal deployments.
- **A payment must invoke the flow.** Sending XLM from a wallet straight to an address or contract is **not** a deposit, and the flow will not run (llms.md On Receive). Deposits go through CYFER's Fund button (`execute`) or, only where this runbook allows, the hosted trigger page.
- **The refund is polled, not instant.**
  - At or after the deadline, Paiflow's automation releases to the False (refund) side.
  - Payments land "one to two minutes after they are due", and events can lag more (llms.md §6).
  - Never promise an exact-second refund.
- **The release-early window is strictly before the deadline.** At or after the deadline, Paiflow refuses early release (422), and CYFER stops offering it 2 minutes before.

### 2.2 Deployment plan and deadlines (agree with Carlos in S-01; B-09)

All times are PHT (UTC+08:00) on 25 Oct 2026. Write them down as ISO with the offset, e.g. `2026-10-25T14:45:00+08:00`.

| Deployment | Purpose | Recommended deadline | Funding cut-off (deadline − 10 min) | Notes |
|---|---|---|---|---|
| **F1** | Refund rehearsal T-08: funded, never approved | `14:45` (tentative; confirm in S-01) | 14:35 | Deploy **first** (by about 12:45) so the refund evidence exists before the pitch. If CYFER funding is not ready by 14:30, Carlos may authorise a hosted-page deposit, which must be **labelled** as such. |
| **R1** | Happy-path rehearsal T-01…T-07, T-09 | `17:30` | 17:20 | Separate from the live demo. It is retired after rehearsal. |
| **D1** | Live pitch demo | `18:00` | 17:50 | Pitching runs 4:00–5:00 PM, and 18:00 leaves margin if slots run late. Release must happen before 17:58. |
| B1 *(optional, SHOULD)* | Budget Split 50/30/20 | n/a (no condition) | — | Only after MVP readiness (G5) |

- **Deadline adjustments.** If the team changes a deadline, keep at least 10 min funding margin plus time for signing, and at least 2 min release margin.
- **F1 timing.** F1's deadline must leave time after funding for chain finality, automation polling (several minutes) and verification before 15:35.
- **Registration order.** Carlos registers the deployments one at a time (F1 → R1 → D1) because CYFER refuses an ambiguous match (Francis CL-11).

### 2.3 Part A: accounts and wallets (S-01)

- [ ] Agree role assignments with Carlos and Francis (B-07). Record **public addresses only** in the handoff table (§2.9). Keys stay in Freighter.

  | Role | Freighter account on | Used for |
  |---|---|---|
  | **Client (buyer)** | Demo machine | Funds escrow; receives refunds |
  | **Seller (freelancer)** | Demo machine | Receives the released payout |
  | **Deployer** | Shanti's machine | Signs and pays for deployments only; never client or seller |

- [ ] All three are **distinct** Testnet accounts, each funded with Friendbot via Freighter.
  - The client holds enough XLM for the deposits (1 XLM each in rehearsals, unless agreed otherwise) plus fees and reserves.
  - The seller account exists and is funded. A missing recipient account makes payouts revert (`AccountMissingError`).
- [ ] Freighter is installed in the same browser used for Paiflow and CYFER, and is set to **Stellar Testnet**.
- [ ] Sign in to Paiflow at `https://beta.app.paiflow.xyz` with the team account ("Continue with Google").
  - The event access code comes from the organisers.
  - **Never** paste the access code into the app, these docs, commits or screenshots.
- [ ] With Carlos, agree the exact deadlines in §2.2 and write them in §2.9 before building anything.

### 2.4 Part B: build and deploy the commission escrow (repeat for F1, R1, D1) — S-02, S-03

The Paiflow Guide PDF only shows a Split example, so the field names below come from `llms.md` (Condition `time_before` with `at` and optional `timeZone`; Pay with `recipient`, `asset`, `fullAmount`). If a label on screen differs, **stop and confirm with Carlos** rather than guessing. The English preview is the final check.

- [ ] Create a new flow named clearly, e.g. `CYFER escrow F1 — refund rehearsal` / `R1 — rehearsal` / `D1 — LIVE DEMO`.
- [ ] Remove every example block and default recipient from the starting graph.
- [ ] Add **On Receive** and set the asset to **native XLM**. Leave the optional minimum empty.
- [ ] Add a **Condition** block:
  - kind **`time_before`**
  - date and time = the agreed deadline
  - time zone = **Asia/Manila (UTC+08:00)** if a zone field exists
- [ ] Connect **On Receive → Condition**.
- [ ] Add **Pay** #1 (the seller):
  - recipient = the **seller's** fixed G-address
  - asset = native XLM
  - **Full amount = on** (100% of what arrives)
- [ ] Add **Pay** #2 (the refund):
  - recipient = the **client's** fixed G-address
  - asset = native XLM
  - **Full amount = on**
- [ ] Connect the Condition's **True** handle to **Pay seller**, and its **False** handle to **Pay client**. Each handle goes to exactly one step, and both handles are connected (llms.md Condition).
- [ ] Confirm that **no Hold** block exists. Hold would block early release.
- [ ] Confirm that **no Return to owner** block exists. It would pay the deployer, not the client.
- [ ] Confirm **Dev mode is off**. No "Fill value via API" and no `PENDING:` placeholders anywhere.
- [ ] Open the deployment review and read the **English preview**. Check each of these out loud with Carlos, who reads the addresses back character by character:
  - [ ] Trigger: On Receive, native XLM.
  - [ ] Condition: time **before** the exact deadline, with the correct date, time and zone.
  - [ ] Before/True → full amount to the **seller** address.
  - [ ] After/False → full amount to the **client** address.
  - [ ] No other recipients, no Hold, no Return to owner, Dev mode off.
- [ ] Connect the **deployer** wallet. Freighter must be on Testnet.
- [ ] Click **Start deployment**. In Freighter, check the network (Testnet), the source account (the deployer), the operations and the fee, then sign.
- [ ] Wait until the deployment reports **CONFIRMED**, then open its deployment page.
- [ ] Copy the **deployment UUID** from the deployment page.
- [ ] Find the **condition node ID** in the flow editor or graph details.
  - If it is not visible, Carlos reads `operations.releaseEarly.nodeIds` from the capabilities check (C-06), and you confirm there is exactly one candidate.
- [ ] Take **non-secret** evidence:
  - a screenshot of the canvas
  - a screenshot of the English preview, cropped so it shows no account menus, tokens or access codes
- [ ] Fill in the handoff record (§2.9) and tell Carlos it is ready (**HO-07**).

### 2.5 Part C: developer token for the server (S-04)

The token is a server secret. It goes **directly** to the backend credential custodian (proposed: Carlos, B-07). This is handoff **HO-08**, and only its non-secret confirmation is recorded.

- [ ] Decide **with Carlos before creating it** how the secret will travel. Choose one:
  - **(a)** Carlos signs in to Paiflow on his own machine and creates the token himself. This is preferred: the secret never moves.
  - **(b)** You create it while Carlos is at the keyboard and pastes it straight into his server `.env.local` as `PAIFLOW_API_TOKEN`.
- [ ] In Paiflow, open **Developer API → Create developer token**:
  - label `cyfer-demo-server`
  - expiry: shortly after the event
  - permission **Read and operate**
  - select the confirmed deployments (F1, and R1/D1 once they exist)
- [ ] The secret is shown **once**. Copy it only into the custodian's `.env.local`. **Never** into chat, these docs, commits, screenshots, a `NEXT_PUBLIC_` variable or the browser.
- [ ] After creating R1, D1 (and B1), **edit the token's deployment selection** to add them. New deployments do **not** get access automatically (Paiflow Guide p6).
  - Changing the label, permission or expiry needs a replacement token.
- [ ] If the token is ever exposed: revoke it in Paiflow, create a replacement, and tell Carlos.
- [ ] After the event: revoke or rotate it (PRD §K.4).

### 2.6 Part D: registration and capability check (Carlos runs; you confirm)

- [ ] Carlos registers the deployment through CYFER's operator console (C-06). The capability check must show:
  - network `testnet`
  - trigger `deposit`
  - input asset native
  - execute and releaseEarly **not** `unsupported`
  - your node ID among the releaseEarly candidates
- [ ] Confirm that the registry row shows the same UUID, deadline, seller and buyer addresses as your handoff record.
  - Paiflow's API does **not** return recipient addresses, so this two-person check is the control until a verified payout proves it (Francis CL-12).

### 2.7 Part E: Testnet rehearsal funding (⚠ AUTH; Carlos leads)

- [ ] **Do not** use the hosted trigger page (`/trigger/<uuid>`) on R1 or D1.
- [ ] Every deposit, release or hosted-page payment needs explicit team authorisation in chat **first**. Carlos records who authorised it, when, the amount and the deployment.
- [ ] Record only public transaction evidence: hashes, explorer links and screenshots.

### 2.8 Part F: separate refund rehearsal F1 (S-02, verified by Carlos in G6)

- [ ] Build F1 per §2.4 with its own short deadline. **Never** shorten D1 for this.
- [ ] Fund F1 before its funding cut-off. Use CYFER's Fund flow if it is ready; otherwise use the hosted page **only with authorisation**, and label every screenshot "funded via Paiflow hosted page, not CYFER checkout".
- [ ] Do **not** approve or release F1. Let the deadline pass.
- [ ] Expect the refund several minutes after the deadline. Capture:
  - the deal page showing "Deadline reached; refund pending (polled)"
  - then "Refunded to client — verified"
  - the refund hash on Stellar Expert (testnet)
- [ ] In the pitch, show this as **Recorded** evidence, labelled with the time it happened.

### 2.9 Handoff records (non-secret; HO-07)

| Field | F1 | R1 | D1 | B1 (opt.) |
|---|---|---|---|---|
| Flow name | | | | |
| Deployment UUID | | | | |
| Condition node ID | | | | n/a |
| Deadline (ISO + offset) | | | | n/a |
| Asset | native XLM | native XLM | native XLM | native XLM |
| Seller / True recipient (G…) | | | | n/a |
| Client / False recipient (G…) | | | | n/a |
| Split recipients / bps | n/a | n/a | n/a | |
| Deployer address (public) | | | | |
| CONFIRMED at (PHT) | | | | |
| Preview screenshot file | | | | |
| Graph snapshot SHA-256 (from C-06) | | | | |
| Registered by / at | | | | |

### 2.10 Optional: budget Split flow B1 (SHOULD; only after G5)

- [ ] On Receive native XLM → **percentage Split** with three distinct funded recipients:
  - Operations **5000 bps**
  - Payroll **3000 bps**
  - Supplies **2000 bps**
  - Total exactly 10,000 bps. Rounding goes to the last recipient.
- [ ] Dev mode off. Review the English preview, deploy from the deployer, wait for CONFIRMED, add B1 to the token's deployment selection, and hand off per §2.9.
- [ ] Changing a recipient or a share later needs a **new deployment** and a fresh plan approval in CYFER (REQ-BUD-01).
- [ ] **USDC is STRETCH only.** It needs separate deployments and the exact trustline (code `USDC`, issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`) plus a balance in every paying and receiving wallet. Never mix it into the XLM MVP setup.

### 2.11 Runbook tasks

- [ ] **S-01** Accounts, wallets, roles and deadlines agreed (§2.3). **Evidence:** the public-address table, plus the deadline values signed off by Carlos.
- [ ] **S-02** F1 built, deployed, CONFIRMED and handed off (§2.4, §2.8). **Evidence:** the §2.9 F1 column.
- [ ] **S-03** R1 and D1 built, deployed, CONFIRMED and handed off (§2.4). **Evidence:** the §2.9 R1 and D1 columns.
- [ ] **S-04** Token created and delivered securely to the custodian; deployment selection updated (§2.5). **Evidence:** a statement "token created at HH:MM, delivered by method (a)/(b), deployments selected: …" with **no secret**.
- [ ] **S-05** Registration confirmed for each deployment (§2.6). **Evidence:** the registry row matches the handoff.
- [ ] **S-06** *(optional)* B1 Split deployment (§2.10).

---

## 3. UI tasks (by screen)

**Common rules for every screen** (PRD §J):

- A **TESTNET** chip on every page that shows money.
- Status is never shown by colour alone: use an icon or text.
- Visible keyboard focus.
- `aria-live="polite"` on status regions.
- Abbreviated hashes with copy buttons and full text for screen readers.
- Explorer links labelled "Stellar Expert (testnet)".
- "Paid" and "Refunded" appear only for `verified`.
- **Wording:** use the strings in `src/contracts/state-copy.ts` ([Francis §3.2](FRANCIS-PHASETASK.md#contract-states)). To change the meaning of any string, request a CR.

**Working mode:**

- Start against fixtures by setting `NEXT_PUBLIC_CYFER_FIXTURES=1` in your own `.env.local`.
- Show a persistent "FIXTURE DATA — not Testnet" banner whenever `getControllerMode() === 'fixture'`.
- Switch to live mode in S-21.

- [ ] **S-10 App shell, navigation and inherited page removal (HO-12)**
  - **Build:** `src/app/(sme)/layout.tsx` with navigation (Deals, Wallet, Operator for operators), a TESTNET chip and a sign-out button.
  - **Remove:** the government pages and navigation (`(public)` documents, budget, transparency, blockchain, audit; the `(admin)` area). Remove the components and constants that import `src/lib/types.ts`.
  - **Check:** `/` either redirects to `/deals` or shows a minimal SME page. Make sure two route groups never both define `/`.
  - **Done when:** `npm run build` and `npm run lint` pass, and no page fetches an inherited API route. Then tell Francis (HO-12).
  - **Needs:** HO-01.

- [ ] **S-11 Sign-in** (`/sign-in`)
  - **Data and actions:** email and password → `business.signIn()`; error states 400/401/429. Accounts are pre-provisioned (F-18), so there is no sign-up.
  - **Wording:** generic errors ("Email or password is incorrect"). Never reveal whether an account exists.

- [ ] **S-12 Wallet binding** (`/wallet/bind`)
  - **Hooks:** `useFreighter`, `useWalletBinding`.
  - **States:** not installed (link to freighter.app), not connected, wrong network ("Switch Freighter to Testnet"), awaiting signature, verifying, bound (show address + "verified"), error.
  - **Mismatch warning:** if `freighterMatchesBinding === false`, show "Freighter is on a different account than your verified wallet. Switch accounts before signing."

- [ ] **S-13 Wallet page** (`/wallet`, REQ-WAL-01)
  - **Hook:** `useWalletSummary`.
  - **Three separate panels, never summed:**
    1. Wallet balance (XLM). "Unavailable" when `state:'unavailable'`, **never 0**.
    2. Escrow by deal: the deal state, not a balance claim.
    3. Cumulative **verified** payouts.
  - **History table:** kind, amount, Stellar hash with explorer link, verification badge.
  - **Never** show a CYFER audit hash in this page.

- [ ] **S-14 Deals list** (`/deals`)
  - **Data:** `DealSummaryDTO[]`, showing title, counterparty, amount (via `fromStroops`), XLM, deadline (PHT), state label and role.
  - **States:** empty and loading.

- [ ] **S-15 New deal** (`/deals/new`, client only)
  - **Fields:** seller wallet address, title, description, deliverable description, and amount entered as decimal XLM and converted with `toStroops` (bigint; at most 7 decimals).
  - **Deadline and asset:** read-only, from `GET /api/deployments/match`.
  - **Errors:**
    - `NO_MATCHING_DEPLOYMENT`: "No prepared escrow matches these parties and deadline. Ask the operator."
    - `AMBIGUOUS_DEPLOYMENT_MATCH`: tell the user to ask the operator.
    - Validation errors.
  - **After save:** show the terms hash.

- [ ] **S-16 Deal detail** (`/deals/[id]`, the single source of truth)
  - **Hook:** `useDealEvidence`.
  - **Contents:**
    - the timeline, built with `AuditTimeline`
    - the parties
    - the terms hash and version
    - deposit, release and refund evidence, each with its verification state
    - the deliverable versions
    - the latest decision
  - **Persistent warnings:**
    - `NONRESPONSE_REFUND`: "If the client does not approve before the deadline, Paiflow refunds the client even if the seller delivered."
    - the deadline in PHT, with a countdown
  - **Actions:** buttons only from `allowedActions`, plus a "Refresh evidence" control (`refreshEvidence`).

- [ ] **S-17 Terms acceptance and editing**
  - **Actions:**
    - "Accept terms v{n} (hash …)" → `acceptTerms(version, sha256)`.
    - The client can edit terms only while `edit_terms` is allowed.
  - **Wording:** "Waiting for seller to accept terms" / "Ready to fund". On `STALE_VERSION`, show a refresh prompt.

- [ ] **S-18 Fund escrow modal** (client)
  - **Hook:** `useFundEscrow`.
  - **Show:** the TESTNET chip, amount, asset, **seller and client recipient addresses**, fee, expiry countdown and deployment UUID.
  - **Sign button:** one explicit "Sign in Freighter" click, which calls `signAndSubmit()`. It is never automatic.
  - **States:** preparing, review, awaiting signature, wallet changed, expired, submitting, checking, confirmed ("Deposit confirmed; awaiting indexed evidence" → "Funds held in escrow"), failed, unresolved ("Payment outcome unknown. **Do not pay again.**").

- [ ] **S-19 Deliver** (seller)
  - **Upload:** via `business.uploadDeliverable(file)`.
  - **Before upload:** show the limits (10 MB; PDF, PNG, JPEG, ZIP, TXT, DOCX).
  - **States:** uploading, too large (413), wrong type (415), deadline passed (409), recorded (show v{n} and SHA-256).

- [ ] **S-20 Review, approve and verify file** (client; verify for both parties)
  - **Review:** download via signed URL; the deliverable v{n} hash is shown.
  - **Approve:** sends `termsVersionId` + `deliverableVersionId` + `deliverableSha256` exactly as displayed.
  - **Reject:** requires a reason.
  - **Stale version** (`STALE_VERSION`): "A newer deliverable exists; review it first."
  - **Verify-file results** (REQ-DLV-02 text, no "tampered"):
    - Match: "Matches deliverable v{n} recorded {time}. This confirms the bytes are identical. It does not confirm quality, authorship or that delivery was truthful."
    - No match: "Does not match deliverable v{n}. The file differs from what was recorded. This alone does not prove tampering."

- [ ] **S-21 Release and recovery controls, then switch to live controllers (G4)**
  - **Release:** one "Release payment to seller" button → `requestRelease()`. It is disabled while busy and hidden unless `release` is allowed.
  - **Release states:** "Releasing to seller…", "Release outcome being checked" (uncertain → "Check release evidence" button, which is read-only; **no retry button**), "Paid to seller — verified".
  - **Funding recovery:**
    - "Check original transaction" is read-only.
    - "Resubmit same signed envelope" is a separate button behind a confirm dialog explaining it sends the identical signed transaction. Show it only when `resubmit_same_envelope` is allowed.
  - **Mismatch:** "Evidence mismatch — under review".
  - **Live switch:** then remove the fixture flag and run the [G4](#g4) checks.

- [ ] **S-22 Operator console** (`/operator`, operator only)
  - **Hook:** `useOperatorConsole`.
  - **Deployment registry:** a list plus a registration form with the §2.9 fields.
  - **Review queue:** items with reason and deal link; a resolve form with outcome and **required justification**.
  - **Never shown:** XDR.

- [ ] **S-23 Accessibility and responsive pass**
  - Keyboard-only run-through of sign-in → fund → approve → release.
  - Focus is visible everywhere.
  - Status is conveyed by text or icon, not colour alone.
  - `aria-live` on status regions.
  - Usable at 375 px and 1440 px widths.
  - Contrast meets WCAG AA for text.

- [ ] **S-24 Copy honesty pass** (input to [G7](FRANCIS-PHASETASK.md#g7))
  - No "tampered", "immutable", "anchored on Stellar", "real money" or "guaranteed refund time".
  - The CYFER audit hash is labelled "CYFER audit hash (not a Stellar transaction)".
  - "Testnet — simulation, no real money" appears on money pages.

- [ ] **S-25 Demo script and rehearsal → [G8](#g8)**

- [ ] **S-26** *(SHOULD)* Budget plan screens: planned → approved → payment pending → distribution verified. PHP figures are labelled "planning figure (PHP), not a crypto amount", and progress reads "2 of 3 payouts verified". This waits for F-23 and C-21.

- [ ] **S-27** *(SHOULD)* Online-selling screens. **Every** courier element carries "MOCK courier status — not a real courier integration" (REQ-SELL-01). This waits for F-24.

- [ ] **S-28** *(STRETCH)* Landing rebrand (government only as a future direction) and the public receipt page (allow-listed fields only).

**Can start immediately:** S-01, S-02, then S-10, S-11 and S-14…S-20 against fixtures once HO-01 merges. Mock hooks arrive with HO-06.
**Must wait:** S-12 live (F-13, C-15), S-21 live (HO-10), S-22 live (C-06, C-17), S-26 and S-27 (MVP first).

---

## 4. Visual, accessibility and demo checklist (short)

- [ ] TESTNET chip visible on every money screen and in every demo screenshot.
- [ ] One consistent state badge component (icon + text) used for deal, attempt and verification states.
- [ ] Hashes: monospace, abbreviated, copy button, full value available to screen readers.
- [ ] Explorer links open the testnet explorer and are labelled "Stellar Expert (testnet)".
- [ ] No secrets, account menus or access codes visible in any screenshot or screen share.
- [ ] Browser zoom 100%; demo window sized for projection; notifications off.
- [ ] Freighter on Testnet, with the client and seller accounts named clearly. Switch accounts deliberately during the demo.
- [ ] Tabs prepared: the D1 deal page; Stellar Expert pages for the D1 deposit (after funding), R1 release and F1 refund; the Paiflow canvas preview screenshot.

---

## 5. Gates owned by Shanti (canonical)

<a id="g4"></a>
### G4 — UI connected to real routes and controllers

- **Owner:** Shanti.
- **Prerequisites:** G3, HO-10, HO-11; S-10…S-22 built.
- **Pass criteria:**
  - [ ] `NEXT_PUBLIC_CYFER_FIXTURES` unset; `npm run build` and `npm run lint` pass.
  - [ ] Carlos's bundle check finds no `[FIXTURE]` marker in the production build (C-18).
  - [ ] With a real signed-in client on R1:
    - the deal page loads from `GET /api/deals/:id`
    - the deployment UUID shown equals the §2.9 record (not a `00000000-0000-4000-8000-…` fixture ID)
    - no fixture banner appears
  - [ ] Every screen in §3 S-11…S-22 renders the live data or error states (spot check of 401, 403 and 409 handling).
- **Evidence:** build output, bundle check output, and screenshots showing a real UUID. The deposit-hash screenshot is added during G5 (T-03). It is **not** a G4 prerequisite, so the gates do not form a cycle.

<a id="g8"></a>
### G8 — Three-minute demo rehearsed with evidence

- **Owner:** Shanti.
- **Responsibilities:**
  - **Carlos:** the evidence sheet (hashes, explorer links) and is on standby for the operator console.
  - **Francis:** the Q&A answers on security and honest limits.
- **Prerequisites:** G5 (or a documented decision to label steps **Recorded** per PRD §N.2); G6 evidence available; S-24 copy honesty pass; D1 deal created and **funded before the pitch** if the team chooses that (record the funding time).
- **Pass criteria:**
  - [ ] Full run-through timed at ≤ 3:00 in the primer order:
    1. **Problem** (0:20): no unsourced statistics.
    2. **Solution** (0:25): "Paiflow holds and routes the money. CYFER proves why it moved."
    3. **Stellar impact** (0:20): demonstrated vs potential, kept separate.
    4. **Paiflow integration** (0:25): show the graph On Receive → time_before → Pay seller / Pay client. Explain release-early vs the automatic, polled refund, and one deployment = one relationship.
    5. **Demo** (1:30): D1 deal held → seller uploads → hash recorded → verify the same and an altered file → client approves v{n} → release → "Paid to seller — verified" with an explorer link → show the F1 refund as **Recorded**.
  - [ ] Every step carries its honesty label from PRD §N.2 (Live / Recorded / Explained / Mocked).
  - [ ] All four required statements (PRD §N.3) are said:
    - "If the client never approves, the deadline refunds the client even if the freelancer delivered. CYFER's evidence helps a dispute but cannot move money. Arbitration is future work."
    - "Our server can release early only to the fixed seller, and only after the client's recorded approval. Whoever holds the deployment token or the deploying wallet is trusted; we log every release."
    - "Testnet only: this is a simulation with no real money."
    - "The hash proves the file is byte-identical, not that the work is good."
  - [ ] The evidence sheet is ready and open:
    - D1, R1 and F1 deployment UUIDs
    - deposit, release and refund hashes, with Stellar Expert links
    - terms and deliverable SHA-256
  - [ ] Fallback agreed: if a live step fails, switch to the R1 recorded evidence and say so.
- **Evidence:** the rehearsal time, the presenter, the evidence sheet location (no secrets) and the decisions on labels.

<a id="evidence-log"></a>
## 6. Evidence log (Shanti)

| Time (PHT) | Task/Gate | Evidence (no secrets) | Level (Fixture / Testnet / Human) |
|---|---|---|---|
| — | — | — | — |
