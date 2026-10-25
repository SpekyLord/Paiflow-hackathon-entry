# Handoff prompt (paste into a new Claude session)

```text
I'm Carlos (Developer 2) on CYFER for SMEs: Paiflow moves the money, CYFER proves what was approved and what was paid. Stellar Testnet only; the app never holds keys.

MAIN REPO (work here): C:\Users\Mist\Downloads\Paiflow-hackathon-entry  (GitHub SpekyLord/Paiflow-hackathon-entry, branch main)
Read first: Claude.md, docs/PRD.MD (source of truth), docs/FRANCIS-PHASETASK.md (canonical contracts, ownership, CR process, gates), docs/CARLOS-PHASETASK.md (my tasks + evidence log §7), docs/CARLOS-ERP-MODULES.md (next work), TESTING.md.

READ-ONLY REFERENCES (never edit):
- C:\Users\Mist\Downloads\paiflow-hackathon-starter — official Paiflow starter: lib/ (paiflow, wallet, transaction, http, recovery), tests/, llms.md, AGENTS.md. Pattern source for SDK use.
- C:\Users\Mist\Downloads\paiflow_context — event docs: CYFER-SME-Brief.txt/.pdf (team brief), llms.md (Paiflow API/SDK reference), paiflow-guide.pdf, setup-guide.pdf, event-primer.pdf, message (6).txt (early idea).
- C:\Users\Mist\Downloads\Cyfer — the original government-edition CYFER repo (inherited UI and patterns only).

RULES:
- Ownership: I own src/server/paiflow/**, src/server/wallet-summary/**, src/client/{wallet,controllers,api/payments.ts}, src/lib/{amount,explorer}.ts, src/lib/stellar/**, my routes (pay/*, evidence/refresh, wallet/summary, operator/*, integration/status), tests/server/payments/**, tests/client/**, tests/db/payments-flow*, tests/live/**, package.json/lockfile, tooling. Francis owns src/contracts, src/server/{db,auth,http,business}, supabase/**; Shanti owns pages/components. Edit their files only through a CR or when I explicitly approve it, in a separately labelled commit.
- Before work: git fetch and merge origin/main (Francis pushes often); resolve conflicts keeping both sides in evidence tables.
- Commit in small separate commits and push to main. NO Co-Authored-By lines.
- Money: integer stroop strings with bigint; PHP planning figures never converted. Never show paid/verified before the payout is verified. Never create a replacement payment on uncertainty.
- No Testnet transactions, seeds or migrations without my explicit approval in chat. Never print or commit .env.local values (it is local and git-ignored). The Paiflow token is not set yet.
- New routes must be classified in tests/server/business/route-auth-sweep.test.ts.

CHECKS: npm run lint, npm run typecheck, npm test, npm run build (retry once if Google Fonts fetch fails), npm run check:bundle. DB (rolled back): CYFER_PG_DIR=<folder with pg installed> npm run test:db. Local live: start npm run dev, then node tests/live/payments-smoke.live.mjs http://localhost:3000.

STATE: C-03…C-05, C-07…C-11, C-13…C-17 done (Mocked/DB/Local live). Open: C-01 (Node 22.22.2 not used; Node 24 locally), C-02 (no real Freighter signature yet; spike page on branch carlos/c02-freighter-spike at /freighter-spike), C-06 and C-18 (need Shanti's R1 deployment record, Paiflow token, ⚠ AUTH), C-12 (needs the R1 rehearsal), B-04 (Split payout event shape unknown, so envelope payouts stay pending). CR-01/CR-02 (getLatestAttempt, getWalletContext plain read) accepted by Francis.

Next task: <say what you want, e.g. "start ERP-BVA-1 from docs/CARLOS-ERP-MODULES.md">
```
