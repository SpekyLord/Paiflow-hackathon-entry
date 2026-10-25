// READ-ONLY verification of the dedicated project. Usage: node supabase/apply/verify.mjs <dir-with-pg>
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
const { Client } = createRequire(join(resolve(process.argv[2]), 'package.json'))('pg');
const env = Object.fromEntries(readFileSync(join(import.meta.dirname, '..', '..', '.env.local'), 'utf8').split(/\r?\n/)
  .filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
const c = new Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
await c.query('begin read only');
const q = async (sql) => (await c.query(sql)).rows;
const noRls = await q("select tablename from pg_tables where schemaname='public' and not rowsecurity");
console.log('1. tables without RLS:', noRls.map((r) => r.tablename));
const tables = await q("select count(*)::int n from pg_tables where schemaname='public'");
console.log('   total public tables:', tables[0].n);
const grants = await q("select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) p from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated') group by 1,2 order by 1,2");
console.log('2. client grants:'); grants.forEach((r) => console.log(`   ${r.grantee.padEnd(13)} ${r.table_name.padEnd(26)} ${r.p}`));
const fin = ['payment_attempts','wallet_challenges','operator_reviews','paiflow_events','payout_verifications','payment_envelope_rejections','event_cursors','reconcile_leases','reconcile_budget'];
const pol = await q("select tablename, policyname from pg_policies where schemaname='public' order by 1,2");
console.log('3. policies on financial tables (expect none):', pol.filter((r) => fin.includes(r.tablename)));
console.log('   all policies:', pol.map((r) => `${r.tablename}.${r.policyname}`));
const fn = await q("select p.proname, has_function_privilege('anon',p.oid,'execute') a, has_function_privilege('authenticated',p.oid,'execute') u, has_function_privilege('service_role',p.oid,'execute') s from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f' and (p.proname !~ '^(uuid_)')");
console.log(`4. functions: ${fn.length}; executable by anon: ${fn.filter((r) => r.a).map((r) => r.proname)}; by authenticated: ${fn.filter((r) => r.u).map((r) => r.proname)}; missing service_role: ${fn.filter((r) => !r.s).map((r) => r.proname)}`);
console.log('5. bucket:', await q("select id, public, file_size_limit from storage.buckets where id='sme-files'"));
console.log('6. new columns:', (await q("select table_name||'.'||column_name c from information_schema.columns where table_schema='public' and table_name in ('blockchain','transactions') and column_name in ('hash_input','org_id','plan_id','deal_id','actor_user_id')")).map((r) => r.c));
console.log('   transactions CHECK has pay_confirmed:', (await q("select pg_get_constraintdef(oid) d from pg_constraint where conrelid='public.transactions'::regclass and contype='c'")).some((r) => r.d.includes('pay_confirmed')));
await c.query('rollback'); await c.end();
