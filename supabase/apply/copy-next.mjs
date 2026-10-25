// Copies the next SQL file (in apply order) to the clipboard so it can be pasted into the Supabase SQL Editor.
// Usage: node supabase/apply/copy-next.mjs          -> copy the next file (run it again after each successful paste)
//        node supabase/apply/copy-next.mjs --again  -> copy the current file again
//        node supabase/apply/copy-next.mjs --reset  -> start over
// Progress is kept in your OS temp folder. Touches no database and reads no secrets.
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const ORDER = [
  'migrations/001_initial_schema.sql',
  'apply/00_lockdown_inherited_tables.sql',
  'migrations/002_sme_identity_orgs_wallets.sql',
  'migrations/003_sme_deployments.sql',
  'migrations/004_sme_budget_plans.sql',
  'migrations/005_sme_financial_evidence.sql',
  'migrations/006_sme_documents.sql',
  'migrations/007_sme_ledger_audit.sql',
  'migrations/008_sme_business_functions.sql',
  'migrations/009_sme_financial_functions.sql',
  'apply/99_verify_readonly.sql',
];
const state = join(tmpdir(), 'cyfer-apply-progress.txt');
const arg = process.argv[2];
if (arg === '--reset') { if (existsSync(state)) rmSync(state); console.log('Progress reset.'); process.exit(0); }

let next = existsSync(state) ? Number(readFileSync(state, 'utf8')) : 0; // index of the file to copy now
if (arg === '--again') next = Math.max(0, next - 1);
if (next >= ORDER.length) { console.log('All files done. Use --reset to start over.'); process.exit(0); }

const file = ORDER[next];
const full = join(root, file);
const r = spawnSync('powershell', ['-NoProfile', '-Command',
  `Get-Content -Raw -Encoding UTF8 -LiteralPath '${full.replace(/'/g, "''")}' | Set-Clipboard`], { stdio: 'inherit' });
if (r.status !== 0) { console.error('Could not copy to the clipboard.'); process.exit(1); }
writeFileSync(state, String(next + 1));
console.log(`\nCopied step ${next + 1} of ${ORDER.length}: ${file}`);
console.log('Paste it into Supabase -> SQL Editor -> New query -> Run. If it succeeds, run this command again for the next file.');
console.log('If it errors, send me the exact error text (no keys), and do not continue.');
