# CYFER Video Demo Script

## Total Duration: ~4:00 (Limit: 3–5 minutes)

---

## Scene 1: Intro — The Problem (0:00 – 0:25)

**Visuals:** Compilation of headlines about corruption. Blurred budget numbers / official government document with numbers — then it shatters (numbers falling away).

> "At the city and municipal level, access to reliable information is critical…"
> "Yet citizens often face documents that are difficult to understand…"
> "Difficult to validate…"
> "And difficult to trust."
> "This gap weakens public confidence…"
> "And creates barriers between institutions and the people they serve."

---

## Scene 2: The Solution — Hook (0:25 – 0:30)

**Visuals:** Black screen with subtle music building.

> "But what if transparency was no longer optional?"
> "What if accountability was built directly into the system?"

---

## Scene 3: Solution Intro — Logo Reveal (0:30 – 0:35)

**Visuals:** CYFER logo reveal (animated).

> "Introducing CYFER…"
> "A secure, blockchain-powered platform designed to bring transparency, accountability, and trust into governance."
> "Built for local governments…"
> "And accessible to every citizen."

---

## Scene 4: Blockchain Explained (0:35 – 1:30)

**Visuals:** PPT/motion graphics with animations. Blocks connecting visually, hash changing when data changes, chain breaking effect. Then transition into the CYFER UI.

> "To understand how CYFER protects government data, we first need to understand blockchain."
> "A blockchain is a type of digital record system…"
> "But unlike traditional databases, it is designed to be secure, transparent, and resistant to tampering."
> "Instead of storing data in a single location… it is distributed across many computers called nodes."
> "Blockchain organizes information into units called blocks."
> "Each block contains three key elements:"
> "The data itself…"
> "A timestamp of when it was created…"
> "And a cryptographic hash — a unique digital signature generated from the data."
> "This hash is extremely sensitive… even the smallest change in the data produces a completely different hash."
> "But what makes blockchain powerful… is how these blocks are connected."
> "Each block includes the hash of the previous block… forming a continuous chain."
> "Because of this, if someone tries to alter a document in one block… its hash changes… breaking the chain with the next block."
> "To successfully tamper with the data, an attacker would need to modify all following blocks… and gain control of the majority of the network… which is extremely difficult."
> "In CYFER, this technology is used to record government documents and system actions…"
> "Creating a transparent and tamper-resistant history."
> "In CYFER specifically, the blockchain is replicated across 3 independent database nodes — so there is no single point of failure or tampering."
> "This means that once information is recorded… it cannot be secretly changed…"
> "Ensuring trust through verification — not assumption."

---

## Scene 5: Feature Showcase (2:45 – 4:15)

### Feature 1: Unanimous Consensus Protocol (2:45 – 3:10)

**Demo Steps:**
1. Open browser → go to `/login`
2. Login as Mayor (`mayor@samplecity.gov.ph` / `DemoPassword123!`)
3. Click **Upload Document** in admin sidebar
4. Fill in title, select category **Ordinance**, add description
5. **Drag & drop** the `.docx` file → click **Upload**
6. Show the **SHA-256 hash** appear with checkmark animation
7. **Cut to:** Login as Treasurer in second browser → `/admin/approvals` → click **Approve**
8. **Cut to:** Login as Clerk in third browser → `/admin/approvals` → click **Approve**
9. Show **"Document published — unanimous consensus reached"** message

> "Here, an authorized official — the Mayor — logs in and uploads a government document."
> "The moment it's uploaded, CYFER generates a unique SHA-256 hash — a digital fingerprint — and records it on the blockchain."
> "But this document doesn't go public yet."
> "CYFER's Unanimous Consensus Protocol requires every other official to review and approve it first."
> "The Treasurer approves…"
> "The Municipal Secretary approves…"
> "Only when all officials reach full consensus does the document get published."
> "No single person can control what goes public."

---

### Feature 2: Public Document Verification (3:10 – 3:35)

**Demo Steps:**
1. Navigate to `/verify`
2. **Drag & drop the ORIGINAL** `.docx` file
3. Show the **green "Document Verified"** result — matching hash, document details
4. Click **"Try Another"**
5. **Drag & drop the TAMPERED** `.docx` file (same file with one word changed)
6. Show the **red "Verification Failed"** result — different hash, shake animation

> "Now, any citizen can verify a document — no account needed."
> "We upload the original file… CYFER computes its hash and checks it against the blockchain."
> "It matches — this document is verified and authentic."
> "But watch what happens when we upload a version where just one word has been changed."
> "The hash is completely different. CYFER immediately flags it as tampered."
> "Even the smallest modification is impossible to hide."

---

### Feature 3: Budget Transparency + UCP for Budgets (3:35 – 3:50)

**Demo Steps:**
1. Navigate to `/budget` → show **summary cards**, **pie chart**, and **budget table**
2. Show **Treasurer** logged in → admin budget page → add a budget entry (e.g., Infrastructure ₱15M)
3. Show **"Submitted for approval"** message
4. Quick cut: **Mayor** → approvals page → approve the budget entry
5. Navigate to `/budget` → entry now visible

> "CYFER also gives citizens a clear view of how public funds are allocated."
> "Here we can see the full municipal budget — across eight sectors — with a breakdown showing exactly where every peso goes."
> "And just like documents, even budget data goes through the same consensus protocol."
> "The Treasurer submits an allocation — the Mayor and the Secretary approves — and only then is it visible to the public."

---

### Feature 4: Audit Trail (3:45 – 3:55)

**Demo Steps:**
1. Navigate to `/audit`
2. Show **stats cards** (total entries, chain integrity: Valid, latest hash)
3. Scroll through the **timeline entries** — uploads, approvals, verifications, budget changes
4. **Click on an entry** to expand — show previous_tx_hash → SHA-256 → current tx_hash linkage

> "Every action taken on the platform is permanently recorded in a hash-linked audit trail."
> "Each entry is chained to the previous one using SHA-256 — just like the blockchain."
> "Uploads, approvals, verifications, budget changes — everything is here, and nothing can be erased or altered."

---

### Feature 5: AI Document Summarizer (3:55 – 4:10)

**Demo Steps:**
1. Navigate to `/documents` → click into a published document
2. Click the **"AI Summary"** button
3. Show the **loading spinner** → summary card appears with TLDR, key points, affected parties

> "Government documents can be long and complex."
> "CYFER uses Anthropic's Claude AI to generate plain-language summaries — breaking down key points, who is affected, and any budget implications."
> "So that every citizen can understand what a document actually means for them."

---

### Feature 6: Blockchain Explorer — Distributed Network (4:10 – 4:25)

**Demo Steps:**
1. Navigate to `/blockchain`
2. Show the **stats bar** — total blocks, chain valid, consensus status
3. Scroll to the **Distributed Network** panel — show all 3 nodes with green "Synced" badges
4. Click a block to expand — show hash/previous hash linkage

> "Finally, CYFER's Blockchain Explorer shows the complete chain — and something unique: all 3 independent nodes in real-time consensus."
> "Every block exists on 3 separate databases simultaneously. If any node is tampered with, the network immediately detects the disagreement."
> "This is genuine decentralization — not just a blockchain-inspired concept."

---

## Scene 6: SDG Alignment (4:25 – 4:45)

**Visuals:** Text on screen with SDG 16 badge/icon.

> "Aligned with SDG 16"
> "Peace, Justice, and Strong Institutions"
> "CYFER empowers communities and strengthens institutions through accountability."

**Text overlay:** Technologies used — Next.js, TypeScript, Tailwind CSS, Supabase, Custom SHA-256 Blockchain, 3-Node Distributed Network, Anthropic Claude AI

---

## Scene 7: Closing (4:45 – 5:00)

**Visuals:** CYFER logo, clean UI shots montage, tagline.

**Final Text:**
> "CYFER"
> "Secure Governance Starts Here."

> "Because trust in government… should never be optional."

**[Team credits: Austria, Limpin, Acidre, Sarino, Aristoki]**

---

## Demo Preparation Checklist

### Before Recording:
- [ ] Dev server running (`npm run dev`) or deployed to Vercel
- [ ] 3 browser windows/tabs ready (one per admin):
  | Role | Email | Password |
  |------|-------|----------|
  | Mayor | mayor@samplecity.gov.ph | DemoPassword123! |
  | Treasurer | treasurer@samplecity.gov.ph | DemoPassword123! |
  | Clerk | clerk@samplecity.gov.ph | DemoPassword123! |
- [ ] Budget data already entered (8 categories, ₱60M total)
- [ ] All 3 blockchain nodes verified synced (`/api/blockchain/nodes` → all `status: "synced"`)
- [ ] Files ready:
  - `ordinance.docx` — original document for upload + verification
  - `ordinance-tampered.docx` — same file with one word changed

### Recording Order for Scene 5:
1. Login as Mayor → upload document → show hash (record this)
2. Login as Treasurer → approve (record this)
3. Login as Clerk → approve → published (record this)
4. Go to `/verify` → upload original → green ✅ (record this)
5. Upload tampered → red ❌ (record this)
6. Show `/budget` dashboard (record this)
7. Show `/audit` trail → expand an entry (record this)
8. Show `/documents/[id]` → click AI Summary (record this)
9. Go to `/blockchain` → show stats bar → scroll to Distributed Network panel (all 3 nodes Synced) → expand a block (record this)

---

## Key Timestamps Summary

| Time | Scene | Duration |
|------|-------|----------|
| 0:00 – 0:25 | The Problem | 25s |
| 0:25 – 0:30 | The Solution Hook | 5s |
| 0:30 – 0:35 | Solution Intro / Logo Reveal | 5s |
| 0:35 – 1:30 | Blockchain Explained (PPT) | 55s |
| 1:30 – 2:45 | Scenes 4→5 transition (your edit) | 75s |
| 2:45 – 4:10 | Feature Showcase (5 features) | 85s |
| 4:10 – 4:25 | Feature 6: Blockchain Explorer (3-node demo) | 15s |
| 4:25 – 4:45 | SDG Alignment | 20s |
| 4:45 – 5:00 | Closing | 15s |
| **TOTAL** | | **~5:00** |
