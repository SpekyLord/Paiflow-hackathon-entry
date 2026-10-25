// One-off runner for the DEDICATED project only. Reads SUPABASE_DB_URL from .env.local (never printed).
// Each file runs in its own transaction; stops at the first error. Refuses to run unless the public schema is empty.
// Usage: node supabase/apply/run-migrations.mjs <path-to-node_modules-containing-pg>
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const require = createRequire(join(resolve(process.argv[2]), 'package.json'));
const { Client } = require('pg');
const root = resolve(import.meta.dirname, '..');
const env = Object.fromEntries(readFileSync(join(root, '..', '.env.local'), 'utf8').split(/\r?\n/)
  .filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
const url = env.SUPABASE_DB_URL;
const ref = (env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\./) || [])[1];
if (!url || url.includes('PASTE_PASSWORD_HERE')) { console.error('SUPABASE_DB_URL is missing or still has the placeholder.'); process.exit(1); }
if (!url.includes(`postgres.${ref}`)) { console.error('SUPABASE_DB_URL does not belong to the project in NEXT_PUBLIC_SUPABASE_URL. Refusing.'); process.exit(1); }

const ORDER = ['migrations/001_initial_schema.sql', 'apply/00_lockdown_inherited_tables.sql',
  'migrations/002_sme_identity_orgs_wallets.sql', 'migrations/003_sme_deployments.sql', 'migrations/004_sme_budget_plans.sql',
  'migrations/005_sme_financial_evidence.sql', 'migrations/006_sme_documents.sql', 'migrations/007_sme_ledger_audit.sql',
  'migrations/008_sme_business_functions.sql', 'migrations/009_sme_financial_functions.sql'];

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
try { await client.connect(); } catch (e) { console.error('Connection failed:', e.code || e.message); process.exit(1); }
try {
  const who = (await client.query('select current_database() db, current_user usr')).rows[0];
  console.log(`Connected: db=${who.db} user=${who.usr}`);
  const n = (await client.query("select count(*)::int c from pg_tables where schemaname='public'")).rows[0].c;
  if (n > 0) { console.error(`public schema already has ${n} table(s); refusing to run on a non-empty project.`); process.exit(2); }
  for (const f of ORDER) {
    const sql = readFileSync(join(root, f), 'utf8');
    process.stdout.write(`Applying ${f} ... `);
    try { await client.query('begin'); await client.query(sql); await client.query('commit'); console.log('ok'); }
    catch (e) {
      await client.query('rollback').catch(() => {});
      console.log('FAILED');
      console.error(`  ${e.code || ''} ${e.message}${e.position ? ` (char ${e.position})` : ''}${e.where ? `\n  where: ${e.where}` : ''}`);
      process.exit(3);
    }
  }
  console.log('All migrations applied.');
} finally { await client.end().catch(() => {}); }
