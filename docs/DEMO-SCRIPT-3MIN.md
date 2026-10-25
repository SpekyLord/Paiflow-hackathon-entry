# Three-minute demo script (only what has been proven)

Everything below was run on **Stellar Testnet** on 25 Oct 2026. Say "Testnet" early and keep the labels honest: **Recorded**, not "fully rehearsed". Do **not** pay again from this plan; it is already paid and verified.

## Before you start (2 minutes)
- App running: `source ~/tools/use-node22.sh`, then `npm run dev` (http://localhost:3000). Do not use `npm run build` while it runs.
- Two tabs signed in: **owner** (`owner@cyfer-demo.test`) and, if you want to show approvals, **approver1**. Passwords are in `.env.local` as `DEMO_*_PASSWORD` (never show that file).
- Freighter on **Test Net**, **Customer** wallet selected (only needed if someone asks to see signing).
- Open in advance: the plan page `http://localhost:3000/plans/791d24d4-4eb9-4c70-837e-105669671577`, and the Stellar Expert page for the payment: `https://stellar.expert/explorer/testnet/tx/46bf63cdfc88275a156aa13ba8cc9913db9c646d7f6b2bf2b4ddbefeea8c848b`.
- **Fallback if Wi-Fi or the app fails:** screenshots of the plan page (Distribution verified, 3 of 3) and of the Stellar Expert page. Say plainly that these are screenshots of the recorded run.

## The story (about 3 minutes)

**0:00 The problem (20 s).**
"A small business approves a budget, then pays money out. Later nobody can prove what was approved or what was really paid. Paiflow moves the money. CYFAI proves what was approved and what was paid. We never hold funds or keys."

**0:20 The plan and the approvals (40 s).** Show the plan page, scroll to the approvals.
"This is one budget plan: 1 XLM split 50 / 30 / 20 across Operations, Payroll and Supplies. Its contents are hashed, and the hash is what each approver signs off on. Three approvers, and every one of them approved this exact version. If anyone edits the plan, the approvals no longer apply and the hash changes."
- Point at: plan hash, "3 of 3 approvals".

**1:00 The payment (50 s).** Show the payment section of the plan page (do not click Pay).
"Only the authorised signer can pay, and only after full approval. The server refuses earlier. The signer reviews the recipients and signs in their own wallet, Freighter, so the app never holds a key. The app saves the prepared payment before signing and the signed envelope before sending, so a timeout can never cause a second payment."
- Point at: transaction hash, "Payment confirmed". Open the Stellar Expert tab: "Anyone can check this on the public Testnet explorer."

**1:50 The proof of what was paid (45 s).** Back on the plan page, the three envelopes.
"A confirmed transaction is not proof of distribution. So we check each envelope on its own against the chain: Operations 5,000,000, Payroll 3,000,000, Supplies 2,000,000 stroops, read from the ledger itself. Only when all three match does the plan say **Distribution verified**. If a payout were wrong, it would say mismatch and go to review, never 'paid'."
- Point at: "3 of 3 verified", each envelope's verified amount.

**2:35 Documents and honesty (25 s).** Open the Documents page, then the tamper check.
"Contracts and invoices are hashed. Upload a copy and we tell you whether the bytes match the record. If they differ we say 'does not match', never 'tampered': a different file does not prove tampering, and a matching file does not prove quality."

**3:00 Close.**
"Testnet only, no real money. One recorded end-to-end run: signed binding, approved plan, real split payment, verified payouts. Next: recovery rehearsals and the protected payment."

## If a judge asks
- **"Is this a blockchain?"** The records are hashes in an application database; the payment and its payouts are on Stellar Testnet. We do not claim our own ledger is public or immutable.
- **"What if the payment times out?"** We check the original transaction; we never create a replacement.
- **"Who can see addresses and amounts?"** Organisation members and the operator, through the server; the browser never gets keys, tokens or signed envelopes.
- **"What isn't done?"** The full recovery rehearsal, the Should/Stretch features (protected payment, receipts), and a second payment flow. Say it before they ask.

## Facts to read out only if asked (all verified)
- Transaction: `46bf63cdfc88275a156aa13ba8cc9913db9c646d7f6b2bf2b4ddbefeea8c848b`, ledger 5377596, status SUCCESS.
- Chain effects: 1.0000000 XLM debited from the signer; 0.5000000 / 0.3000000 / 0.2000000 XLM credited to the three recipients.
- Plan: 3 approvers, all approved the same plan hash; payment receipt verified; 3 of 3 envelope payouts verified.
