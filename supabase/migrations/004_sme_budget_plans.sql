-- CYFER for SMEs: 004 budget plans, versions, envelopes, approvals
-- DRAFT (F-08b). NOT APPLIED. Plan identity (budget_plans) is separate from content (budget_plan_versions, CL-13).
-- Envelopes and approvals key on the version, so an edit voids prior approvals by construction.
-- The legacy budget_data / approvals tables are NOT reused.

create table public.budget_plans (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organisations(id),
  deployment_id      uuid not null references public.paiflow_deployments(id),
  state              text not null default 'pending_approval' check (state in (
    'draft','pending_approval','approved','payment_pending','payment_confirmed',
    'distribution_verified','rejected','superseded','mismatch','operator_review')),
  current_version_id uuid,   -- FK added below (circular)
  created_by         uuid not null references auth.users(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index budget_plans_org_idx on public.budget_plans(org_id);

create table public.budget_plan_versions (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references public.budget_plans(id),
  version        int  not null check (version >= 1),
  purpose        text not null check (length(purpose) between 1 and 200),
  canonical_text text not null,            -- exact string that was hashed
  canonical_json jsonb not null,
  plan_sha256    text not null check (plan_sha256 ~ '^[0-9a-f]{64}$'),
  total_stroops  text not null check (total_stroops ~ '^[1-9][0-9]{0,38}$'),
  signer_user_id uuid not null references auth.users(id),
  signer_address text not null check (signer_address ~ '^G[A-Z2-7]{55}$'),
  superseded_at  timestamptz,
  created_by     uuid not null references auth.users(id),
  created_at     timestamptz not null default now(),
  unique (plan_id, version)
);
create index budget_plan_versions_plan_idx on public.budget_plan_versions(plan_id);

alter table public.budget_plans
  add constraint budget_plans_current_version_fk
  foreign key (current_version_id) references public.budget_plan_versions(id) deferrable initially deferred;

alter table public.deployment_reservations
  add constraint deployment_reservations_plan_fk
  foreign key (budget_plan_id) references public.budget_plans(id);

create table public.budget_envelopes (
  version_id           uuid not null references public.budget_plan_versions(id),
  position             int  not null check (position >= 0),
  label                text not null check (length(label) between 1 and 80),
  bps                  int  not null check (bps > 0 and bps <= 10000),
  recipient_address    text not null check (recipient_address ~ '^G[A-Z2-7]{55}$'),
  planning_php_centavos bigint check (planning_php_centavos is null or planning_php_centavos >= 0),
  primary key (version_id, position),
  unique (version_id, recipient_address)    -- no duplicate recipients (the 10,000 bps total is enforced in the RPC)
);

create table public.budget_approvals (
  version_id       uuid not null references public.budget_plan_versions(id),
  approver_user_id uuid not null references auth.users(id),
  decision         text not null default 'pending' check (decision in ('pending','approved','rejected')),
  plan_sha256      text not null check (plan_sha256 ~ '^[0-9a-f]{64}$'),   -- the hash the approver is deciding on
  reason           text,
  responded_at     timestamptz,
  primary key (version_id, approver_user_id)   -- approver set is snapshotted at submission; no duplicates
);
create index budget_approvals_approver_idx on public.budget_approvals(approver_user_id);

create table public.plan_state_transitions (
  id            bigserial primary key,
  plan_id       uuid not null references public.budget_plans(id),
  from_state    text,
  to_state      text not null,
  actor_user_id uuid,
  reason        text,
  at            timestamptz not null default clock_timestamp()
);
create index plan_state_transitions_plan_idx on public.plan_state_transitions(plan_id, id);

-- RLS: members of the org may read; there are no client writes.
alter table public.budget_plans            enable row level security;
alter table public.budget_plan_versions    enable row level security;
alter table public.budget_envelopes        enable row level security;
alter table public.budget_approvals        enable row level security;
alter table public.plan_state_transitions  enable row level security;

revoke all on public.budget_plans, public.budget_plan_versions, public.budget_envelopes,
              public.budget_approvals, public.plan_state_transitions from anon, authenticated;
grant select on public.budget_plans, public.budget_plan_versions, public.budget_envelopes,
                public.budget_approvals, public.plan_state_transitions to authenticated;
revoke all on sequence public.plan_state_transitions_id_seq from anon, authenticated;

create policy budget_plans_select_member on public.budget_plans for select to authenticated
  using ((select private.is_org_member(org_id)));

create policy budget_plan_versions_select_member on public.budget_plan_versions for select to authenticated
  using (exists (select 1 from public.budget_plans p where p.id = plan_id and (select private.is_org_member(p.org_id))));

create policy budget_envelopes_select_member on public.budget_envelopes for select to authenticated
  using (exists (select 1 from public.budget_plan_versions v join public.budget_plans p on p.id = v.plan_id
                 where v.id = version_id and (select private.is_org_member(p.org_id))));

create policy budget_approvals_select_member on public.budget_approvals for select to authenticated
  using (exists (select 1 from public.budget_plan_versions v join public.budget_plans p on p.id = v.plan_id
                 where v.id = version_id and (select private.is_org_member(p.org_id))));

create policy plan_state_transitions_select_member on public.plan_state_transitions for select to authenticated
  using (exists (select 1 from public.budget_plans p where p.id = plan_id and (select private.is_org_member(p.org_id))));

-- ---------------------------------------------------------------------------
-- Used by 002's bind/unbind: the user's active wallet may not change while it is the signer of a
-- non-terminal plan. (SHOULD, migration 010, extends this to non-terminal deals.)
-- ---------------------------------------------------------------------------
create or replace function public.binding_is_locked(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.budget_plans p
    join public.budget_plan_versions v on v.id = p.current_version_id
    where v.signer_user_id = p_user
      and p.state in ('pending_approval','approved','payment_pending','payment_confirmed','mismatch','operator_review')
  );
$$;
revoke all on function public.binding_is_locked(uuid) from public, anon, authenticated;
grant execute on function public.binding_is_locked(uuid) to service_role;
