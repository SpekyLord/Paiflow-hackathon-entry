-- CYFER for SMEs: 007 ledger and audit concurrency fix + append_evidence()
-- DRAFT (F-09). NOT APPLIED. Additive only: inherited rows are untouched.
-- The `blockchain` table is a CYFER application hash chain in a database the team controls. It is NOT Stellar and
-- NOT public anchoring. `transactions.tx_hash` is a "CYFER audit hash", never a Stellar transaction hash.
--
-- Inherited blocks were hashed in JS (Date.now() style input that was not stored). SME blocks store the exact
-- hash input string in blockchain.hash_input, so sha256(hash_input) = hash is recomputable. The SME chain validator
-- (src/server/db/evidence.ts) must use hash_input when present and the legacy formula only for legacy rows.

-- ---- additive columns ----
alter table public.blockchain
  add column if not exists hash_input text;

alter table public.transactions
  add column if not exists deal_id        uuid,
  add column if not exists org_id         uuid,
  add column if not exists plan_id        uuid,
  add column if not exists actor_user_id  uuid,
  add column if not exists hash_input     jsonb;

create index if not exists transactions_plan_idx on public.transactions(plan_id) where plan_id is not null;
create index if not exists transactions_org_idx  on public.transactions(org_id)  where org_id  is not null;

-- ---- widen the action_type CHECK without assuming its name (B-01: live schema unknown) ----
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.transactions'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%action_type%'
  loop
    execute format('alter table public.transactions drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.transactions add constraint transactions_action_type_check check (action_type in (
  'upload','approve','reject','publish','verify','access',
  'plan_create','plan_approve','plan_reject','doc_record','pay_prepare','pay_submit','pay_confirmed','pay_failed',
  'envelope_payout_verified','operator_review',
  'deal_create','terms_accept','fund_prepare','fund_submit','deliver','release_request','release_result',
  'payout_verified','refund_verified'));

-- ---- append_evidence ----
-- Locks the chain tail (one advisory lock covers both the block chain and the audit chain), computes both hashes
-- in SQL over stored inputs, and inserts the block and the audit row in the caller's transaction, so a failure
-- anywhere rolls back the business change too (REQ-DOC-01 AC2, INV).
-- p_scope: {"orgId":uuid?, "planId":uuid?, "dealId":uuid?}
create or replace function public.append_evidence(
  p_action text, p_scope jsonb, p_actor uuid, p_payload jsonb, p_description text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_prev_block   public.blockchain;
  v_block_id     int;
  v_block_ts     timestamptz;
  v_block_data   jsonb;
  v_block_input  text;
  v_block_hash   text;
  v_prev_tx      text;
  v_audit_ts     timestamptz;
  v_audit_input  jsonb;
  v_audit_hash   text;
begin
  perform pg_advisory_xact_lock(hashtext('cyfer_chain_tail'));

  -- ledger block
  select * into v_prev_block from public.blockchain order by id desc limit 1;
  v_block_id   := nextval(pg_get_serial_sequence('public.blockchain', 'id'));
  v_block_ts   := clock_timestamp();
  v_block_data := jsonb_build_object('action', p_action, 'scope', p_scope, 'actor', p_actor, 'payload', p_payload);
  v_block_input := v_block_id::text || '|' || (extract(epoch from v_block_ts) * 1000)::bigint::text || '|' ||
                   v_block_data::text || '|' || coalesce(v_prev_block.hash, repeat('0', 64)) || '|0';
  v_block_hash := encode(sha256(convert_to(v_block_input, 'UTF8')), 'hex');
  insert into public.blockchain(id, "timestamp", data, previous_hash, hash, nonce, hash_input)
  values (v_block_id, v_block_ts, v_block_data, coalesce(v_prev_block.hash, repeat('0', 64)), v_block_hash, 0, v_block_input);

  -- audit row
  select t.tx_hash into v_prev_tx from public.transactions t order by t.created_at desc, t.id desc limit 1;
  v_audit_ts := clock_timestamp();
  v_audit_input := jsonb_build_object(
    'action', p_action, 'description', p_description, 'actor', p_actor, 'scope', p_scope, 'payload', p_payload,
    'previousTxHash', v_prev_tx, 'createdAtMs', (extract(epoch from v_audit_ts) * 1000)::bigint,
    'ledgerBlockId', v_block_id);
  v_audit_hash := encode(sha256(convert_to(v_audit_input::text, 'UTF8')), 'hex');
  insert into public.transactions(
    action_type, description, performed_by, tx_hash, previous_tx_hash, metadata, created_at,
    org_id, plan_id, deal_id, actor_user_id, hash_input)
  values (
    p_action, p_description, p_actor::text, v_audit_hash, v_prev_tx, p_payload, v_audit_ts,
    nullif(p_scope ->> 'orgId', '')::uuid, nullif(p_scope ->> 'planId', '')::uuid,
    nullif(p_scope ->> 'dealId', '')::uuid, p_actor, v_audit_input);

  return jsonb_build_object('ledgerBlockId', v_block_id, 'ledgerBlockHash', v_block_hash, 'auditHash', v_audit_hash);
end $$;

revoke all on function public.append_evidence(text,jsonb,uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.append_evidence(text,jsonb,uuid,jsonb,text) to service_role;
