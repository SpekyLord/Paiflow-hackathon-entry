# Testing guide — CYFER for SMEs

Owner: Carlos (Developer 2). Source of truth: [docs/PRD.MD](docs/PRD.MD) v2.1.0, §M. The inherited earlier-edition guide is gone; its "PASSED" results were never re-run for the SME product.

## Commands

```bash
npm ci                 # install exactly what package-lock.json pins; do not run npm install
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm test               # Vitest (tests/**/*.test.ts)
npm run build          # Next.js production build
npm run check:bundle   # after build: scans .next/static for secrets, SDK runtime, [FIXTURE]
```

Only Carlos changes `package.json` or the lockfile (Francis §1.3). Ask with `DEP: <package>@<version> | runtime or dev | why | importing file`.

## Runtime

`@paiflow/sdk@0.2.0` declares Node `>=22.22.2 <23`, and the starter uses Node 22.22.2. The current dependency set was installed and checked on **Node v24.11.1** (npm prints an engine warning). Every machine that runs the demo server should use Node 22.22.2 (nvm-windows). Until that is confirmed, B-10 stays open.

## Verification levels (PRD §M.1)

Keep these separate in every evidence log. Never record one as another.

| Level | Meaning | Example |
|---|---|---|
| **Mocked** | Vitest with a mocked Paiflow SDK, mocked Freighter or fixtures | `npm test` |
| **Manual Testnet** | Real Freighter and a real Paiflow deployment, with recorded Stellar hashes | G5 rehearsal T-01…T-07 |
| **Human review** | A person checks a screen, document or explorer link | Stellar Expert (testnet) link opens |

A rendered screen or an HTTP 200 is not evidence that a payment, payout or refund happened.

## Test layout

| Path | Covers |
|---|---|
| `tests/client/amount.test.ts` | Stroop conversion, Horizon balance parsing, no floats (INV-10) |
| `tests/client/stellar-helpers.test.ts` | Envelope hash, fee-bump refusal, changed body vs signature-only change, native asset match, explorer URL |
| `tests/client/freighter.test.ts` | Freighter connect, timeouts, Testnet checks, `signPrepared` refusals, SEP-53 `signChallenge` (mocked Freighter) |
| `tests/server/payments/paiflow-adapter.test.ts` | Config validation, safe error mapping, `Retry-After`, token never logged, `GET /api/integration/status` |
| `tests/server/payments/bundle-scan.test.ts` | Bundle scan rules |
| `tests/fixtures/paiflow/` | Deterministic, never-funded test transactions |
| `tests/server/payments/*` | Carlos's route handlers, reconcile, events, wallet summary, operator routes, negative paths (mocked DB and Paiflow) |
| `tests/db/payments-flow.db.test.ts` | DB level: real SQL, rolled back (`npm run test:db`) |
| `tests/live/payments-smoke.live.mjs` | Local live: running dev server and demo accounts |

Test files mock `server-only` with `vi.mock("server-only", () => ({}))` before importing server modules.

## DB and local live tests

Both need `.env.local` for the dedicated test project. Neither sends a Testnet transaction.

- **DB (rolled back):** `npm run test:db` runs Carlos's real handlers, reconcile pass and event ingestion against the real SQL functions, with only Paiflow faked. Every test runs in a transaction that is rolled back, so nothing is left behind. It needs `SUPABASE_DB_URL` and the `pg` package in a separate folder (it is not a project dependency):

  ```bash
  npm install --prefix ../cyfer-pg pg@8
  ```

  ```bash
  CYFER_PG_DIR=../cyfer-pg npm run test:db
  ```

- **Local live:** start `npm run dev`, then run `node tests/live/payments-smoke.live.mjs http://localhost:3000`. It signs in as the F-18 demo accounts (passwords from `.env.local`) and probes every Carlos route. It refuses any host other than localhost. Without `PAIFLOW_API_TOKEN` nothing can reach Paiflow, and a registration attempt is refused with 503 before anything is written.

## Environment

Copy `.env.local.example` to `.env.local` (git-ignored). `PAIFLOW_API_TOKEN` and `PAIFLOW_BASE_URL` are server-only and must never get a `NEXT_PUBLIC_` prefix. The deployment UUID is not an environment variable: it comes from the operator registry.

## Do not run without explicit team approval

- Seeds, migrations, `scripts/seed-demo-data.js` or `test-supabase.ts` against a shared database (`test-supabase.ts` writes a ledger block and may call the AI API).
- Any Testnet transaction: Split payments, deposits, releases or hosted-page payments.
- `npm install` of new packages (lockfile changes need ⚠ AUTH).
