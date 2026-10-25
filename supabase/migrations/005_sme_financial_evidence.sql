-- CYFER for SMEs: 005 financial evidence tables (consumed by Carlos through src/server/db/financial.ts)
-- DRAFT (F-07). NOT APPLIED. COLUMN SET IS PROVISIONAL until HO-04 (Carlos's recorded event payload shapes, B-04):
-- paiflow_events.data stays generic jsonb and payout_verifications.checks stays jsonb so nothing here depends on a
-- guessed Split payout payload.
-- RLS is on with NO client policies: only server routes (service_role) read or write these rows (PRD §K.11).
-- No DELETE is granted, and evidence rows also refuse deletes by trigger (INV-09).

create or replace function public.forbid_delete()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'evidence rows cannot be deleted' using errcode = '42501';
end $$;

-- Write-once columns: once non-null they can never change.
create or replace function public.payment_attempts_write_once()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.prepared_xdr      is not null and new.prepared_xdr      is distinct from old.prepared_xdr      then raise exception 'prepared_xdr is write-once'      using errcode = '23514'; end if;
  if old.original_tx_hash  is not null and new.original_tx_hash  is distinct from old.original_tx_hash  then raise exception 'original_tx_hash is write-once'  using errcode = '23514'; end if;
  if old.signed_xdr        is not null and new.signed_xdr        is distinct from old.signed_xdr        then raise exception 'signed_xdr is write-once'        using errcode = '23514'; end if;
  if old.signed_body_hash  is not null and new.signed_body_hash  is distinct from old.signed_body_hash  then raise exception 'signed_body_hash is write-once'  using errcode = '23514'; end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;

create table public.payment_attempts (
  id                     uuid primary key default gen_random_uuid(),
  budget_plan_id         uuid references public.budget_plans(id),
  deal_id                uuid,                                    -- SHOULD; FK added in 010
  plan_version_id        uuid references public.budget_plan_versions(id),
  deployment_id          uuid not null references public.paiflow_deployments(id),
  from_address           text not null check (from_address ~ '^G[A-Z2-7]{55}$'),
  amount_stroops         text not null check (amount_stroops ~ '^[1-9][0-9]{0,38}$'),
  asset                  jsonb not null default '{"kind":"native"}'::jsonb,
  network                text check (network is null or network = 'testnet'),
  network_passphrase     text,
  prepared_xdr           text,                                    -- server-only; never logged
  original_tx_hash       char(64) unique check (original_tx_hash is null or original_tx_hash ~ '^[0-9a-f]{64}$'),
  history_request_id     text,
  expires_at             timestamptz,
  fee_stroops            text check (fee_stroops is null or fee_stroops ~ '^[0-9]{1,39}$'),
  signature_requested_at timestamptz,
  signed_xdr             text,                                    -- server-only; never returned after submit
  signed_body_hash       char(64) check (signed_body_hash is null or signed_body_hash ~ '^[0-9a-f]{64}$'),
  submit_status          text,
  submit_outcome         jsonb,
  final_status           text check (final_status is null or final_status in ('SUCCESS','FAILED','PENDING','UNKNOWN','REJECTED','NOT_FOUND')),
  ledger                 bigint,
  last_request_id        text,
  last_checked_at        timestamptz,
  state                  text not null default 'preparing' check (state in (
    'preparing','prepare_failed','prepared','signing','signed_persisted','submitted','success','failed',
    'pending','unknown','rejected','expired_unsigned','operator_review','reconciled')),
  resolution             text,
  created_by             uuid not null references auth.users(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint payment_attempt_one_scope check (num_nonnulls(budget_plan_id, deal_id) = 1),
  constraint signed_matches_prepared check (signed_body_hash is null or original_tx_hash is null or signed_body_hash = original_tx_hash)
);
-- INV-04: at most one NON-terminal attempt per plan and per deal.
create unique index payment_attempts_one_open_per_plan_uq on public.payment_attempts(budget_plan_id)
  where budget_plan_id is not null and state not in ('success','failed','prepare_failed','reconciled');
create unique index payment_attempts_one_open_per_deal_uq on public.payment_attempts(deal_id)
  where deal_id is not null and state not in ('success','failed','prepare_failed','reconciled');
create index payment_attempts_state_idx on public.payment_attempts(state);

create trigger payment_attempts_write_once_trg before update on public.payment_attempts
  for each row execute function public.payment_attempts_write_once();
create trigger payment_attempts_no_delete_trg before delete on public.payment_attempts
  for each row execute function public.forbid_delete();

create table public.payment_envelope_rejections (
  id            uuid primary key default gen_random_uuid(),
  attempt_id    uuid not null references public.payment_attempts(id),
  actor_user_id uuid not null references auth.users(id),
  signed_xdr    text not null,
  reason        text not null check (reason in ('BODY_CHANGED','FEE_BUMP','WRONG_SIGNER','UNPARSEABLE')),
  created_at    timestamptz not null default now()
);
create trigger payment_envelope_rejections_no_delete_trg before delete on public.payment_envelope_rejections
  for each row execute function public.forbid_delete();

create table public.payout_verifications (
  id                      uuid primary key default gen_random_uuid(),
  budget_plan_id          uuid references public.budget_plans(id),
  deal_id                 uuid,
  attempt_id              uuid references public.payment_attempts(id),
  release_attempt_id      uuid,                                   -- SHOULD
  kind                    text not null check (kind in ('payment_receipt','envelope_payout','release_payout','refund_payout')),
  envelope_position       int,
  tx_hash                 char(64) check (tx_hash is null or tx_hash ~ '^[0-9a-f]{64}$'),
  expected_recipient      text not null check (expected_recipient ~ '^G[A-Z2-7]{55}$'),
  expected_amount_stroops text not null check (expected_amount_stroops ~ '^[1-9][0-9]{0,38}$'),
  observed_amount_stroops text check (observed_amount_stroops is null or observed_amount_stroops ~ '^[0-9]{1,39}$'),
  asset                   jsonb not null default '{"kind":"native"}'::jsonb,
  event_ids               text[] not null default '{}',
  state                   text not null default 'not_started' check (state in (
    'not_started','awaiting_tx_final','awaiting_events','verified','mismatch','operator_review')),
  checks                  jsonb not null default '{}'::jsonb,
  checked_at              timestamptz,
  notes                   text,
  created_at              timestamptz not null default now(),
  constraint verification_one_scope check (num_nonnulls(budget_plan_id, deal_id) = 1)
);
-- One verification row per (attempt, kind, envelope); recording is an upsert.
create unique index payout_verifications_unique_uq on public.payout_verifications
  (attempt_id, kind, coalesce(envelope_position, -1)) where attempt_id is not null;
create index payout_verifications_plan_idx on public.payout_verifications(budget_plan_id);
create trigger payout_verifications_no_delete_trg before delete on public.payout_verifications
  for each row execute function public.forbid_delete();

create table public.paiflow_events (
  event_id      text primary key,                                 -- dedupe key
  item_id       text,
  deployment_id uuid not null references public.paiflow_deployments(id),
  kind          text not null,
  topic         text,
  ledger        bigint not null,
  tx_hash       char(64) not null check (tx_hash ~ '^[0-9a-f]{64}$'),
  occurred_at   timestamptz not null,
  data          jsonb,                                            -- decoded, non-secret only
  created_at    timestamptz not null default now()
);
create index paiflow_events_deployment_tx_idx on public.paiflow_events(deployment_id, tx_hash);
create trigger paiflow_events_no_delete_trg before delete on public.paiflow_events
  for each row execute function public.forbid_delete();

create table public.event_cursors (
  deployment_id uuid not null references public.paiflow_deployments(id),
  scope         text not null,                                    -- 'all' | 'tx:<hash>'
  cursor        text,
  updated_at    timestamptz not null default now(),
  primary key (deployment_id, scope)
);

create table public.reconcile_leases (
  key        text primary key,
  holder     text not null,
  expires_at timestamptz not null
);

create table public.reconcile_budget (                             -- 40 polls / scope / hour
  scope_key    text primary key,
  window_start timestamptz not null default now(),
  polls        int not null default 0
);

create table public.operator_reviews (
  id            uuid primary key default gen_random_uuid(),
  scope         text not null check (scope in ('payment_attempt','verification','plan','release_attempt','deal')),
  ref_id        uuid not null,
  reason        text not null,
  opened_at     timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   uuid references auth.users(id),
  outcome       text check (outcome is null or outcome in (
    'payment_success_confirmed','payment_failed_confirmed','not_broadcast_ledger_proven','payout_confirmed',
    'refund_confirmed','release_retry_authorised','no_action')),
  justification text,
  evidence      jsonb
);
create index operator_reviews_open_idx on public.operator_reviews(opened_at) where resolved_at is null;

alter table public.payment_attempts            enable row level security;
alter table public.payment_envelope_rejections enable row level security;
alter table public.payout_verifications        enable row level security;
alter table public.paiflow_events              enable row level security;
alter table public.event_cursors               enable row level security;
alter table public.reconcile_leases            enable row level security;
alter table public.reconcile_budget            enable row level security;
alter table public.operator_reviews            enable row level security;

revoke all on public.payment_attempts, public.payment_envelope_rejections, public.payout_verifications,
              public.paiflow_events, public.event_cursors, public.reconcile_leases, public.reconcile_budget,
              public.operator_reviews from anon, authenticated;
-- service_role keeps its default table privileges for the SECURITY DEFINER RPCs' owner path; DELETE is additionally
-- blocked by the triggers above on evidence tables.
revoke delete on public.payment_attempts, public.payment_envelope_rejections, public.payout_verifications,
                 public.paiflow_events from service_role;
