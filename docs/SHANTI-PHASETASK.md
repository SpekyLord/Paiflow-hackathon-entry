# SHANTI — Phase Tasks (UI developer and Paiflow website operator)

> Shared contracts, the ownership matrix, handoffs, blockers and the coordination rules are **canonical in [FRANCIS-PHASETASK.md](FRANCIS-PHASETASK.md)**. Payment and wallet behaviour is in [CARLOS-PHASETASK.md](CARLOS-PHASETASK.md). This document covers Shanti's screens, the **Paiflow website runbook** and gates **G4 and G8**.

| Field | Value |
|---|---|
| Owner | Shanti |
| Source of truth | [docs/PRD.MD](PRD.MD) **v2.1.0** (§J screens, §L.3 manual deployment, §N demo) |
| Tiers | **MVP:** the budget Split flows and the budget-plan, wallet, documents/tamper-check and operator screens. **SHOULD:** the protected-payment (escrow) flows and screens, public receipt, SME landing copy. **STRETCH:** templates, online selling (mocked courier), USDC. |
| Status | Planning only. Every task starts unchecked. |

**Quick links:**

- The data you render: [DTOs](FRANCIS-PHASETASK.md#contract-dtos) · [States, dashboard mapping, allowed actions and wording](FRANCIS-PHASETASK.md#contract-states) · [Error codes](FRANCIS-PHASETASK.md#contract-errors)
- The hooks you use: [Controller interface](FRANCIS-PHASETASK.md#contract-controllers) · [Hook usage snippets](CARLOS-PHASETASK.md#4-integration-examples-for-shanti-filled-in-by-c-05--c-15)
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
- Split-share arithmetic (use `expectedShareStroops` from the DTO)
- API routes
- Migrations

Use `allowedActions` and `dashboardState` from the DTOs to decide what appears. Do not re-derive rules from raw states.

**Never on screen or in screenshots:**

- Paiflow tokens, the event access code, wallet secret keys or seed phrases.
- The Supabase service key or `.env.local` contents.
- Full XDR envelopes.

---

## 2. Paiflow website runbook (detailed)

### 2.1 Concepts to understand before clicking anything

- **Three different identifiers.** The **deployment UUID** is what the app and API use. It is **not** the flow ID and **not** the Stellar contract address that starts with `C` (Paiflow Guide p4, llms.md §3).
- **Recipients and shares are fixed at deploy time** (Dev mode is off for the event). A new payee, a changed envelope or a changed percentage means a **new deployment** and a **fresh plan approval** in CYFER (D-12).
- **One deployment = one relationship in CYFER.** Each budget plan reserves its own Split deployment (REQ-DEP-01), so rehearsals use **separate** deployments from the live demo.
- **Never reuse the live demo deployment** for tests or hosted-page experiments.
  - A hosted-page payment into a Split really pays the three envelope wallets.
  - It would also mix rehearsal payouts into the live evidence.
- **A payment must invoke the flow.** Sending XLM straight to an address or contract is **not** a deposit, and the flow will not run (llms.md On Receive). Payments go through CYFER's Sign payment button (`execute`).
- **Events lag.** The live feed and indexed payouts can lag by a minute or more. Never pay again because a payout has not appeared yet (llms.md §6, D-13).
- **SHOULD (protected payment) only:**
  - The refund at the deadline is polled, not instant.
  - Release-early works strictly before the deadline.
  - A protected-payment deployment shares one balance and one deadline.

### 2.2 MVP deployment plan: three Split deployments

| Deployment | Purpose | Notes |
|---|---|---|
| **Split R1** | MVP rehearsal T-01…T-06 (Carlos C-18) | Deploy **first** (by about 12:45). Carlos also uses it for read-only spikes. |
| **Split R2** | T-07: reload mid-payment on a separate plan and deployment | Deploy right after R1 |
| **Split D1** | Live pitch demo | Never touched before the pitch except to register it |

- **The same envelope wallets in every deployment.** All three use the **same three envelope recipient wallets in the same order**: 1 Operations 5000 bps, 2 Payroll 3000 bps, 3 Supplies 2000 bps.
- **Order matters.** The last recipient receives any rounding remainder, and CYFER checks the order.
- **Sequential registration.** Carlos registers the deployments one at a time, because CYFER refuses an ambiguous match (Francis CL-11).

### 2.3 Part A: accounts and wallets (S-01)

- [ ] Agree role assignments with Carlos and Francis (B-07, B-13). Record **public addresses only** in §2.9. Keys stay in Freighter.

  | Role | Freighter account on | Used for | Needs a CYFER account |
  |---|---|---|---|
  | **Owner / authorised signer** | Demo machine | Records the plan and signs the Split payment | Yes |
  | **Approver A** | Demo machine | Approves the plan | Yes |
  | **Approver B** | Demo machine | Approves the plan | Yes |
  | **Operations** envelope wallet | — | Receives 50% | No; it only needs to be a funded account |
  | **Payroll** envelope wallet | — | Receives 30% | No |
  | **Supplies** envelope wallet | — | Receives 20% | No |
  | **Deployer** | Shanti's machine | Signs and pays for deployments only | No |

- [ ] All accounts are **distinct** Testnet accounts, each funded with Friendbot via Freighter.
  - The signer holds enough XLM for 1 XLM per rehearsal or demo payment, plus fees and reserves.
  - Every envelope wallet exists and is funded. A missing recipient makes the payment revert (`AccountMissingError`).
- [ ] Freighter is installed in the same browser used for Paiflow and CYFER, and is set to **Stellar Testnet**.
- [ ] Sign in to Paiflow at `https://beta.app.paiflow.xyz` with the team account ("Continue with Google").
  - The event access code comes from the organisers.
  - **Never** paste the access code into the app, these docs, commits or screenshots.

### 2.4 Part B: build and deploy the budget Split (repeat for R1, R2, D1) — S-02, S-03

This follows the Paiflow Guide p4 flow and PRD §L.3 step 2. If a label on screen differs from what is described here, **stop and confirm with Carlos**. The English preview is the final check.

- [ ] Create a new flow named clearly, e.g. `CYFER budget split R1 — rehearsal` / `R2 — reload test` / `D1 — LIVE DEMO`.
- [ ] Use **On Receive** as the trigger and **Split** as the action, then connect On Receive → Split.
- [ ] Select **native XLM** as the flow's asset. Leave the optional minimum empty.
- [ ] Remove every unrelated example block and default recipient from the starting graph.
- [ ] Set the Split to **percentage** mode, with all recipients in the same mode. Add the recipients **in this order**:
  1. Label `Operations`, the Operations wallet G-address, **5000 bps**
  2. Label `Payroll`, the Payroll wallet G-address, **3000 bps**
  3. Label `Supplies`, the Supplies wallet G-address, **2000 bps**
- [ ] Confirm the total is exactly **10,000 bps**, there are no duplicate addresses, and every placeholder address is replaced (no `PENDING:`).
- [ ] Confirm **Dev mode is off**.
- [ ] Open the deployment review and read the **English preview**. Check each of these out loud with Carlos, who reads the three addresses back character by character:
  - [ ] Trigger: On Receive, native XLM.
  - [ ] Split: percentage, three recipients, in the order and shares above.
  - [ ] No other blocks or recipients.
- [ ] Connect the **deployer** wallet. Freighter must be on Testnet.
- [ ] Click **Start deployment**. In Freighter, check the network (Testnet), the source account (the deployer), the operations and the fee, then sign.
- [ ] Wait until the deployment reports **CONFIRMED**, then open its deployment page.
- [ ] Copy the **deployment UUID** from the deployment page.
- [ ] Take **non-secret** evidence:
  - a screenshot of the canvas
  - a screenshot of the English preview, cropped so it shows no account menus, tokens or access codes
- [ ] Fill in the handoff record (§2.9) and tell Carlos it is ready (**HO-07**).
- [ ] **Do not** test D1 (or R1/R2) with the hosted trigger page. Rehearsal payments go through CYFER under ⚠ AUTH (Carlos C-18).

### 2.5 Part C: developer token for the server (S-04)

The token is a server secret. It goes **directly** to the backend credential custodian (proposed: Carlos, B-07). This is handoff **HO-08**, and only its non-secret confirmation is recorded.

- [ ] Decide **with Carlos before creating it** how the secret will travel. Choose one:
  - **(a)** Carlos signs in to Paiflow on his own machine and creates the token himself. This is preferred: the secret never moves.
  - **(b)** You create it while Carlos is at the keyboard and pastes it straight into his server `.env.local` as `PAIFLOW_API_TOKEN`.
- [ ] In Paiflow, open **Developer API → Create developer token**:
  - label `cyfer-demo-server`
  - expiry: shortly after the event
  - permission **Read and operate**
  - select the confirmed deployments (R1, and R2/D1 once they exist)
- [ ] The secret is shown **once**. Copy it only into the custodian's `.env.local`. **Never** into chat, these docs, commits, screenshots, a `NEXT_PUBLIC_` variable or the browser.
- [ ] After creating each further deployment (R2, D1, and later the SHOULD E-R1/E-F1), **edit the token's deployment selection** to add it. New deployments do **not** get access automatically (Paiflow Guide p6).
  - Changing the label, permission or expiry needs a replacement token.
- [ ] If the token is ever exposed: revoke it, create a replacement, and tell Carlos.
- [ ] After the event: revoke or rotate it (PRD §K.4).

### 2.6 Part D: registration and capability check (Carlos runs; you confirm) — S-05

- [ ] Carlos registers each deployment through CYFER's operator console (C-06). The capability check must show network `testnet`, trigger `deposit`, input asset native, and execute **not** `unsupported`.
- [ ] Confirm that the registry row shows the same UUID, recipients, **order** and bps as your handoff record.
  - Paiflow's API does **not** return recipient addresses or shares, so this two-person check is the control until the rehearsal's verified payouts prove it (Francis CL-12).

### 2.7 Part E: rehearsal payments (⚠ AUTH; Carlos leads)

- [ ] Every Testnet payment needs explicit team authorisation in chat **first**. Carlos records who authorised it, when, the amount and the deployment.
- [ ] Record only public evidence: hashes, explorer links and screenshots.

### 2.8 SHOULD runbook: protected-payment (escrow) flows — S-30 (only after G5)

Start this **only after the MVP gate G5 passes**. It never blocks the MVP or the demo. If it is not done, the pitch **explains** the protected payment and refund rule with the graph (PRD §N.2).

- [ ] **Roles:** a payer (client) and a payee (seller), each a distinct funded Testnet Freighter account with a CYFER account, plus the same deployer.
- [ ] **Deadlines:** agree with Carlos (B-09). All times are PHT, written as ISO with the offset `+08:00`.

  | Deployment | Purpose | Recommended deadline |
  |---|---|---|
  | **E-R1** | T-08, T-09, T-11 (fund, deliver, approve, release) | `18:00` |
  | **E-F1** | T-10 refund rehearsal; funded, never approved | about 40–60 min after it is deployed, leaving ≥ 10 min funding margin plus time for chain finality, automation polling and verification |

- [ ] **Build each flow:**
  - [ ] Add **On Receive** with native XLM.
  - [ ] Add a **Condition** of kind **`time_before`**, with the agreed date and time and zone **Asia/Manila** (if a zone field exists).
  - [ ] Add the **True** branch: **Pay** the payee's fixed address, **Full amount = on**.
  - [ ] Add the **False** branch: **Pay** the payer's fixed refund address, **Full amount = on**.
  - [ ] Connect both handles, each to exactly one step.
  - [ ] **No Hold.** Hold would block early release.
  - [ ] **No Return to owner.** It would pay the deployer, not the payer.
  - [ ] **Dev mode off.**
- [ ] **Review and deploy:**
  - [ ] Review the English preview with Carlos: before/True → payee, after/False → payer, exact deadline and zone.
  - [ ] Deploy from the deployer and wait for **CONFIRMED**.
  - [ ] Copy the **deployment UUID** and the **condition node ID**. If the node ID is not visible, Carlos reads `operations.releaseEarly.nodeIds` and you confirm there is exactly one.
  - [ ] Add the deployment to the token selection, then hand off via §2.9.
- [ ] **E-F1 refund rehearsal:**
  - [ ] Fund E-F1 via CYFER before its cut-off. Use the hosted page only with authorisation, labelling every artefact "funded via Paiflow hosted page, not CYFER checkout".
  - [ ] **Do not** approve or release it.
  - [ ] Capture "Deadline reached; refund pending (polled)", then "Refunded to payer — verified", plus the refund hash on Stellar Expert (testnet).
  - [ ] Show it as **Recorded** with its time.
- [ ] **Never shorten another deployment's deadline** for a refund test.

### 2.9 Handoff records (non-secret; HO-07)

**Split deployments (MVP):**

| Field | R1 | R2 | D1 |
|---|---|---|---|
| Flow name | | | |
| Deployment UUID | | | |
| Recipient 1: Operations (G…) / bps | / 5000 | / 5000 | / 5000 |
| Recipient 2: Payroll (G…) / bps | / 3000 | / 3000 | / 3000 |
| Recipient 3: Supplies (G…) / bps | / 2000 | / 2000 | / 2000 |
| Asset | native XLM | native XLM | native XLM |
| Deployer address (public) | | | |
| CONFIRMED at (PHT) | | | |
| Preview screenshot file | | | |
| Graph snapshot SHA-256 (from C-06) | | | |
| Registered by / at | | | |

**Protected-payment deployments (SHOULD):**

| Field | E-R1 | E-F1 |
|---|---|---|
| Deployment UUID | | |
| Condition node ID | | |
| Deadline (ISO + offset) | | |
| Payee / True recipient (G…) | | |
| Payer / False recipient (G…) | | |
| CONFIRMED at / registered at | | |

**USDC is STRETCH only.** It needs separate deployments and the exact trustline (code `USDC`, issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`) plus a balance in every paying and receiving wallet. Never mix it into the XLM MVP setup.

### 2.10 Runbook tasks

- [ ] **S-01 [MVP]** Accounts, wallets, roles, approver set and signer agreed (§2.3). **Evidence:** the public-address table.
- [ ] **S-02 [MVP]** Split R1 built, deployed, CONFIRMED and handed off (§2.4). **Evidence:** the §2.9 R1 column.
- [ ] **S-03 [MVP]** Split R2 and D1 built, deployed, CONFIRMED and handed off. **Evidence:** the §2.9 R2 and D1 columns.
- [ ] **S-04 [MVP]** Token created and delivered securely to the custodian; deployment selection kept current (§2.5). **Evidence:** a statement "token created at HH:MM, delivered by method (a)/(b), deployments selected: …" with **no secret**.
- [ ] **S-05 [MVP]** Registration confirmed per deployment (§2.6). **Evidence:** the registry row matches the handoff.
- [ ] **S-30 [SHOULD]** Protected-payment flows E-R1 and E-F1 (§2.8). Only after G5.

---

## 3. UI tasks (by screen)

**Common rules for every screen** (PRD §J):

- A **TESTNET** chip on every page that shows money.
- Status is never shown by colour alone: use an icon or text.
- Visible keyboard focus.
- `aria-live="polite"` on status regions.
- Abbreviated hashes with copy buttons and full text for screen readers.
- Explorer links labelled "Stellar Expert (testnet)".
- "Distributed", "Paid" and "Refunded" appear only for `verified` evidence.
- **Wording:** use the strings in `src/contracts/state-copy.ts` ([Francis §3.2](FRANCIS-PHASETASK.md#contract-states)). To change the meaning of any string, request a CR.

**Working mode:**

- Start against fixtures by setting `NEXT_PUBLIC_CYFER_FIXTURES=1` in your own `.env.local`.
- Show a persistent "FIXTURE DATA — not Testnet" banner whenever `getControllerMode() === 'fixture'`.
- Switch to live mode in S-19.

**MVP screens:**

- [ ] **S-10 App shell, navigation and inherited page removal (HO-12)**
  - **Build:** `src/app/(sme)/layout.tsx` with navigation (Budget plans, Documents, Wallet, and Operator for operators), the org name, a TESTNET chip and a sign-out button.
  - **Remove:** the government pages and navigation (`(public)` documents, budget, transparency, blockchain, audit; the `(admin)` area). Remove the components and constants that import `src/lib/types.ts`.
  - **Check:** `/` redirects to the plans page. Make sure two route groups never both define `/`.
  - **Done when:** `npm run build` and `npm run lint` pass, and no page fetches an inherited API route. Then tell Francis (HO-12).
  - **Needs:** HO-01.

- [ ] **S-11 Sign-in** (`/sign-in`)
  - **Data and actions:** email and password → `business.signIn()`; error states 400/401/429. Accounts are pre-provisioned (F-18), so there is no sign-up.
  - **Wording:** generic errors only. Never reveal whether an account exists.

- [ ] **S-12 Wallet binding** (`/wallet/bind`)
  - **Hooks:** `useFreighter`, `useWalletBinding`.
  - **States:** not installed (link to freighter.app), not connected, wrong network ("Switch Freighter to Testnet"), awaiting signature, verifying, bound (address + "verified"), error.
  - **Mismatch warning:** if `freighterMatchesBinding === false`, show "Freighter is on a different account than your verified wallet. Switch accounts before signing."
  - **Shared use:** this screen supplies the real-signature check for G2.

- [ ] **S-13 Wallet page** (`/wallet`, REQ-WAL-01)
  - **Hook:** `useWalletSummary`.
  - **Three separate panels, never summed:**
    1. Wallet balance (XLM). "Unavailable" when `state:'unavailable'`, **never 0**.
    2. Payment status per plan, with the viewer's role (owner, approver, signer, envelope recipient). The escrow list stays empty in the MVP.
    3. Cumulative **verified** payouts.
  - **History table:** kind, amount, Stellar hash with explorer link, verification badge.
  - **Copy:** "Stellar assets and Stellar wallets only". **Never** show a CYFER audit hash.

- [ ] **S-14 Budget plans list** (`/plans`)
  - **Data:** `BudgetPlanSummaryDTO[]`, showing purpose, version, total (via `fromStroops`) XLM, the dashboard badge (Planned / Approved / Pending / Verified distribution / Needs review) and approvals "k of n".
  - **States:** empty and loading.

- [ ] **S-15 New budget plan** (`/plans/new`, owner)
  - **Load:** `GET …/split-deployment` and pre-fill the three envelopes **read-only** (address, bps, order). The owner can edit only labels and optional PHP planning figures.
    - PHP is entered as pesos and sent as integer centavos, labelled **"planning figure (PHP), not a crypto amount"**, with no conversion shown.
  - **Fields:** purpose, total amount (decimal XLM → `toStroops`), signer (a member with a bound wallet).
  - **Errors:**
    - `NO_SPLIT_DEPLOYMENT`: "No prepared Split matches. Ask the operator."
    - `ENVELOPES_MISMATCH_DEPLOYMENT`, `BPS_TOTAL_INVALID`, `APPROVER_SET_INVALID`.
  - **After save:** show the plan hash.
  - **Constant note:** "Recipients and shares are fixed by the deployed flow. Changing them needs a new flow and fresh approval."

- [ ] **S-16 Budget plan detail** (`/plans/[planId]`; the primary demo screen)
  - **Hook:** `usePlanEvidence`.
  - **Contents:**
    - **Four-step dashboard:** Planned → Approved → Pending → Verified distribution (or Needs review).
    - **Plan facts:** plan hash and version; signer name and address.
    - **Approvals:** "k of n" with each approver's decision; `approve`/`reject` buttons for the viewer (reject needs a reason); on `STALE_VERSION`, "A newer version exists; review it first."
    - **Envelope table:** label, address, bps, expected share (from the DTO), PHP planning figure, and the payout verification badge with hash and explorer link per envelope. "{Label} paid — verified" appears only when verified.
    - **Progress:** "Payment confirmed; k of n payouts verified" or "Distribution verified".
    - **Timeline:** `AuditTimeline`, with the CYFER audit hash labelled "CYFER audit hash (not a Stellar transaction)".
    - **Refresh evidence** control.

- [ ] **S-17 Sign payment modal and recovery controls** (signer)
  - **Hook:** `usePayment({kind:'plan'})`.
  - **Before approval:** a disabled "Sign payment" button with "Waiting for all approvers (k of n)". For the demo, attempting it shows the server refusal (`refused_not_approved`): "Payment cannot proceed until every approver has approved."
  - **Modal shows:** TESTNET, total, asset, the **three recipients with expected shares**, the fee, the expiry countdown and the deployment UUID. One explicit "Sign in Freighter" click calls `signAndSubmit()`.
  - **States:** preparing, review, awaiting signature, wallet changed, expired, submitting, checking, confirmed, failed, unresolved ("Payment outcome unknown. **Do not pay again.**").
  - **Recovery:**
    - "Check original transaction" is read-only.
    - "Resubmit same signed envelope" is a separate button behind a confirm dialog explaining it re-sends the identical signed transaction. Show it only when allowed.
    - There is **never** a "pay again" button.

- [ ] **S-18 Documents and tamper check** (`/documents`, REQ-DOC-01, REQ-DLV-02)
  - **Upload:** choose a kind (contract, invoice, receipt, plan attachment, other). Limits are shown first (10 MB; PDF, PNG, JPEG, ZIP, TXT, DOCX).
  - **Recorded documents list:** SHA-256 and a download button (signed URL).
  - **Verify a file:** pick the recorded document or plan version, then upload a candidate. Results use the REQ-DLV-02 text:
    - Match: "Matches {record} recorded {time}. This confirms the bytes are identical. It does not confirm quality, authorship or that delivery was truthful."
    - No match: "Does not match {record}. The file differs from what was recorded. This alone does not prove tampering."
    - **Never** the word "tampered" as a verdict.
  - **Errors:** 413/415/403.

- [ ] **S-19 Switch to live controllers → [G4](#g4)**
  - Remove the fixture flag and wire every MVP screen to the real routes and hooks (HO-10).
  - Run the G4 checks.

- [ ] **S-20 Operator console** (`/operator`, operator only)
  - **Hook:** `useOperatorConsole`.
  - **Deployment registry:** a list plus a registration form (template, UUID, ordered recipients and bps).
  - **Review queue:** a resolve form with outcome and **required justification**.
  - **Never shown:** XDR.

- [ ] **S-21 Evidence display components**
  - One shared hash component: abbreviated, copy button, screen-reader full text, kind label (Stellar tx / SHA-256 / CYFER audit hash).
  - One verification badge (icon + text) for `pending evidence` / `verified` / `mismatch` / `needs review`.
  - Used on every screen.

- [ ] **S-22 Accessibility and responsive pass**
  - Keyboard-only run-through of sign-in → bind → create plan → approve ×2 → sign payment → verify document.
  - Focus is visible everywhere.
  - Status is not conveyed by colour alone.
  - `aria-live` on status regions.
  - Usable at 375 px and 1440 px.
  - Contrast meets WCAG AA for text.

- [ ] **S-23 Copy honesty pass** (input to [G7](FRANCIS-PHASETASK.md#g7))
  - No "tampered", "immutable", "anchored on Stellar", "real money", "Distributed" before verification, or currency conversion of PHP figures.
  - "Testnet — simulation, no real money" appears on money pages.
  - "A verified payout proves distribution, not that the money was well spent" appears near the dashboard.

- [ ] **S-24 Demo script and rehearsal → [G8](#g8)**

**SHOULD and STRETCH screens (only after G5):**

- [ ] **S-31 [SHOULD] Protected-payment screens.** New deal (payer), deal detail (timeline, terms hash, held state, deliverables, `NONRESPONSE_REFUND` warning, deadline in PHT), fund modal, deliver, review and approve with verify-file, release ("Releasing to payee…", "Release outcome being checked" with a read-only check and **no retry button**, "Paid to payee — verified"). Uses the SHOULD hooks and DTOs fixed by CR at F-30/C-34.
- [ ] **S-32 [SHOULD] Public receipt page** (`/r/[slug]`). Allow-listed fields only, transaction hashes with explorer links, and "not found" / "withdrawn" states.
- [ ] **S-33 [SHOULD] SME landing copy.** SME positioning; government only as a future direction.
- [ ] **S-34 [STRETCH] Template screens, online selling and USDC picker.** **Every** courier element carries "MOCK courier status — not a real courier integration" (REQ-SELL-01).

**Can start immediately:** S-01 and S-02, then S-10, S-11 and S-13…S-18, S-20 and S-21 against fixtures once HO-01 merges. Mock hooks arrive with HO-06.
**Must wait:** S-12 live (F-13, C-14), S-19 (HO-10), S-24 (G5), S-30…S-34 (G5).

---

## 4. Visual, accessibility and demo checklist (short)

- [ ] TESTNET chip visible on every money screen and in every demo screenshot.
- [ ] The S-21 badge and hash components are used everywhere, with consistent wording.
- [ ] The four-step dashboard reads clearly at projection size.
- [ ] No secrets, account menus or access codes visible in any screenshot or screen share.
- [ ] Browser zoom 100%; demo window sized for projection; notifications off.
- [ ] Freighter on Testnet, with the owner/signer and approver accounts named clearly. Switch deliberately.
- [ ] Tabs prepared: the D1 plan page; Stellar Expert pages for the R1 payment and its envelope payouts; the Split graph preview screenshot; (SHOULD) the escrow graph preview.

---

## 5. Gates owned by Shanti (canonical)

<a id="g4"></a>
### G4 — UI connected to real routes and controllers

- **Owner:** Shanti.
- **Prerequisites:** G3, HO-10, HO-11; S-10…S-18, S-20 and S-21 built.
- **Pass criteria:**
  - [ ] `NEXT_PUBLIC_CYFER_FIXTURES` unset; `npm run build` and `npm run lint` pass.
  - [ ] Carlos's bundle check finds no `[FIXTURE]` marker in the production build (C-17).
  - [ ] With a real signed-in owner on Split R1:
    - the plan page loads from `GET …/budget-plans/:planId`
    - the deployment UUID shown equals the §2.9 record (not a `00000000-0000-4000-8000-…` fixture ID)
    - no fixture banner appears
  - [ ] Every MVP screen renders live data and error states (spot check of 401, 403 `PLAN_NOT_APPROVED`, 409 and 422 handling).
- **Evidence:** build output, bundle check output, and screenshots showing a real UUID. The payment-hash screenshot is added during G5 (T-04); it is **not** a G4 prerequisite.

<a id="g8"></a>
### G8 — Three-minute demo rehearsed with evidence

- **Owner:** Shanti.
- **Responsibilities:**
  - **Carlos:** the evidence sheet (hashes, explorer links) and is on standby for the operator console.
  - **Francis:** the Q&A answers on security and honest limits.
- **Prerequisites:** G5 (or a documented decision to label steps **Recorded** per PRD §N.2); G7; S-23. The D1 plan is created before the pitch; whether approvals and payment happen live is decided per N.2.
- **Pass criteria:**
  - [ ] Full run-through timed at ≤ 3:00 in the primer order (PRD §N.1):
    1. **Problem** (0:20): budgets and payments run on chat and spreadsheets. No unsourced statistics.
    2. **Solution** (0:25): "Paiflow moves the money. CYFER proves what was approved and what was paid."
    3. **Stellar impact** (0:20): demonstrated vs potential, kept separate.
    4. **Paiflow integration** (0:25): show the Split graph (three envelopes) and, if built or explained, the protected-payment graph. Recipients are fixed per deployment, and one deployment is one relationship.
    5. **Demo** (1:30), budget flow first:
       1. The owner records the plan (hash and ledger block).
       2. The approvers approve, with payment shown refused before the last approval.
       3. The signer signs in Freighter, and Paiflow splits the payment.
       4. CYFER verifies the transaction and each envelope payout, with hashes.
       5. The protected payment is shown as the add-on: Live only if G6 passed, otherwise Recorded or Explained.
       6. Tamper check: an altered document gives "no match".
  - [ ] Every step carries its honesty label from PRD §N.2 (Live / Recorded / Explained / Mocked / Future).
  - [ ] The PRD §N.3 required statements are said where relevant:
    - "If the payer never approves, the deadline refunds the payer even if the payee delivered. CYFER's evidence helps a dispute but cannot move money. Arbitration is future work." (only if the protected payment is shown)
    - "Our server can release early only to the fixed payee, and only after the payer's recorded approval. Whoever holds the deployment token or the deploying wallet is trusted; we log every release." (only if the protected payment is shown)
    - "Recipients and shares are fixed when a flow is deployed. A new payee or a changed envelope means a new flow and a fresh approval."
    - "Testnet only: this is a simulation with no real money."
    - "The hash proves the file is byte-identical, not that the work is good, and a verified payout proves distribution, not that the money was well spent."
    - "Interoperability here means Stellar assets and Stellar wallets. We do not bridge to other blockchains."
  - [ ] The evidence sheet is ready and open:
    - R1, R2 and D1 deployment UUIDs
    - plan hash
    - payment hash and three envelope payout hashes, with Stellar Expert links
    - document SHA-256
    - (SHOULD) escrow hashes if G6 passed
  - [ ] Fallback agreed: if a live step fails, switch to the R1 recorded evidence and say so.
- **Evidence:** the rehearsal time, the presenter, the evidence sheet location (no secrets) and the label decisions.

<a id="evidence-log"></a>
## 6. Evidence log (Shanti)

| Time (PHT) | Task/Gate | Evidence (no secrets) | Level (Fixture / Testnet / Human) |
|---|---|---|---|
| 2026-10-25 ~14:30 | S-10 (partial) | Removed `(public)` and `(admin)` pages and `components/{admin,audit,budget,consensus,documents,public}`; added `(sme)` shell with nav, org, TESTNET chip, sign-out; `/` redirects to `/plans`. **Not closed:** `src/utils/constants.ts` still imports `src/lib/types.ts` because the old route `src/app/api/documents/route.ts` imports it; it goes with F-20. | Fixture (typecheck, lint, build pass; not exercised in a browser) |
| 2026-10-25 ~14:30 | S-11, S-12, S-13, S-14, S-15, S-16, S-17, S-18, S-20, S-21 | Screens built against `src/contracts/**` and the controller hooks; `npm run build`, `npm run lint` (0 errors), `tsc --noEmit` and `npm run check:bundle` pass (no fixture marker in the production bundle). Not yet clicked through in a browser, so none ticked. | Fixture (build checks only) |
| — | S-01..S-05 | Not started by this log: these are human steps on the Paiflow website and Freighter. | Human (pending) |
