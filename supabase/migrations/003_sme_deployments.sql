-- CYFER for SMEs: 003 Paiflow deployment registry and reservations
-- DRAFT (F-06). NOT APPLIED. No credential columns: the Paiflow token stays in server env.
-- Registry recipients/bps are operator-attested (CL-12) and confirmed only by verified payouts.

create or replace function public.split_recipients_valid(r jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare n int; total int := 0; i int; el jsonb;
begin
  if r is null or jsonb_typeof(r) <> 'array' then return false; end if;
  n := jsonb_array_length(r);
  if n < 1 then return false; end if;
  for i in 0 .. n - 1 loop
    el := r -> i;
    if (el ->> 'position')::int is distinct from i then return false; end if;       -- deployment order, 0..n-1
    if coalesce(el ->> 'address', '') !~ '^G[A-Z2-7]{55}$' then return false; end if;
    if coalesce((el ->> 'bps')::int, 0) <= 0 then return false; end if;
    total := total + (el ->> 'bps')::int;
  end loop;
  if total <> 10000 then return false; end if;
  if (select count(distinct x ->> 'address') from jsonb_array_elements(r) x) <> n then return false; end if;
  return true;
exception when others then
  return false;
end $$;

create table public.paiflow_deployments (
  id                    uuid primary key,   -- the Paiflow deployment UUID (not flow id, not C... address)
  template              text not null,      -- 'budget_split' | 'commission_escrow' | ...
  network               text not null default 'testnet' check (network = 'testnet'),
  input_asset           jsonb not null default '{"kind":"native"}'::jsonb,
  condition_node_id     text,
  deadline_at           timestamptz,
  seller_address        text check (seller_address is null or seller_address ~ '^G[A-Z2-7]{55}$'),
  buyer_address         text check (buyer_address  is null or buyer_address  ~ '^G[A-Z2-7]{55}$'),
  split_recipients      jsonb,              -- ordered: [{position,address,bps,label}]
  graph_snapshot_sha256 text not null check (graph_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  capability_snapshot   jsonb not null default '{}'::jsonb,
  status                text not null default 'available' check (status in ('available','reserved','retired','unusable')),
  registered_by         uuid references auth.users(id),
  registered_at         timestamptz not null default now(),
  constraint budget_split_needs_valid_recipients
    check (template <> 'budget_split' or public.split_recipients_valid(split_recipients))
);
create index paiflow_deployments_template_status_idx on public.paiflow_deployments(template, status);

create table public.deployment_reservations (
  id             uuid primary key default gen_random_uuid(),
  deployment_id  uuid not null references public.paiflow_deployments(id),
  budget_plan_id uuid,   -- FK added in 004
  deal_id        uuid,   -- FK added in 010 (SHOULD)
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  closed_at      timestamptz,
  constraint reservation_one_scope check (num_nonnulls(budget_plan_id, deal_id) = 1)
);
create unique index deployment_reservations_one_active_uq on public.deployment_reservations(deployment_id) where active;

-- RLS on, no client policies: deployments are read through server routes only (operator + plan views).
alter table public.paiflow_deployments    enable row level security;
alter table public.deployment_reservations enable row level security;
revoke all on public.paiflow_deployments, public.deployment_reservations from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Registry RPCs (REQ-DEP-01). Operator check is done by the caller's guard; the flag is re-checked here.
-- ---------------------------------------------------------------------------
create or replace function public.register_deployment(p_operator uuid, p_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.paiflow_deployments;
begin
  if not exists (select 1 from public.profiles where user_id = p_operator and is_operator) then
    return jsonb_build_object('ok', false, 'code', 'OPERATOR_REQUIRED');
  end if;
  begin
    insert into public.paiflow_deployments(
      id, template, input_asset, condition_node_id, deadline_at, seller_address, buyer_address,
      split_recipients, graph_snapshot_sha256, capability_snapshot, status, registered_by)
    values (
      (p_input ->> 'deploymentId')::uuid,
      p_input ->> 'template',
      coalesce(p_input -> 'asset', '{"kind":"native"}'::jsonb),
      p_input ->> 'conditionNodeId',
      (p_input ->> 'deadlineAt')::timestamptz,
      p_input ->> 'sellerAddress',
      p_input ->> 'buyerAddress',
      p_input -> 'splitRecipients',
      p_input ->> 'graphSnapshotSha256',
      coalesce(p_input -> 'capabilitySnapshot', '{}'::jsonb),
      coalesce(p_input ->> 'status', 'available'),
      p_operator)
    returning * into v_row;
  exception
    when check_violation or invalid_text_representation or not_null_violation then
      return jsonb_build_object('ok', false, 'code', 'VALIDATION');
    when unique_violation then
      return jsonb_build_object('ok', false, 'code', 'STATE_CONFLICT');
  end;
  return jsonb_build_object('ok', true, 'value', to_jsonb(v_row));
end $$;

create or replace function public.set_deployment_status(p_operator uuid, p_deployment uuid, p_status text, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where user_id = p_operator and is_operator) then
    return jsonb_build_object('ok', false, 'code', 'OPERATOR_REQUIRED');
  end if;
  if p_status not in ('unusable','retired') then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;
  if exists (select 1 from public.deployment_reservations where deployment_id = p_deployment and active) then
    return jsonb_build_object('ok', false, 'code', 'STATE_CONFLICT');  -- reserved: do not pull it from under a plan
  end if;
  update public.paiflow_deployments set status = p_status where id = p_deployment;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  return jsonb_build_object('ok', true, 'value', '{}'::jsonb);
end $$;

revoke all on function public.register_deployment(uuid,jsonb), public.set_deployment_status(uuid,uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.register_deployment(uuid,jsonb), public.set_deployment_status(uuid,uuid,text,text)
  to service_role;
