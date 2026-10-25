-- READ-ONLY verification after applying 001..009. Run each block; paste the results back (no secrets in them).

-- 1. Every public table has RLS on (expect rowsecurity = true for all rows)
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;

-- 2. Client privileges on public tables for anon/authenticated (expect only SELECT on a few SME read tables, nothing on financial tables)
select grantee, table_name, string_agg(privilege_type, ',' order by privilege_type) as privs
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated')
group by grantee, table_name order by table_name, grantee;

-- 3. Policies (expect none on payment_attempts, wallet_challenges, operator_reviews, paiflow_events, payout_verifications)
select tablename, policyname, cmd from pg_policies where schemaname = 'public' order by tablename, policyname;

-- 4. Functions: SME RPCs must NOT be executable by anon/authenticated (expect anon_can = false, auth_can = false, service_can = true)
select p.proname,
       has_function_privilege('anon', p.oid, 'execute')          as anon_can,
       has_function_privilege('authenticated', p.oid, 'execute') as auth_can,
       has_function_privilege('service_role', p.oid, 'execute')  as service_can
from pg_proc p
where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
  and p.proname !~ '^(uuid_|pg_|gen_)' order by p.proname;

-- 5. Storage bucket must be private
select id, public, file_size_limit from storage.buckets where id = 'sme-files';

-- 6. Chain/audit additive columns and the widened CHECK
select column_name from information_schema.columns
 where table_schema = 'public' and table_name in ('blockchain','transactions') and column_name in ('hash_input','org_id','plan_id','deal_id','actor_user_id');
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.transactions'::regclass and contype = 'c';
