-- CYFER for SMEs: 002 identity, organisations, wallet bindings
-- DRAFT (F-05). NOT APPLIED. Applying needs explicit team authorisation (F-19).
-- Only creates new objects; inherited tables are untouched. Roles come from these tables, never user_metadata.
-- All RPCs return jsonb: {"ok":true,"value":...} or {"ok":false,"code":"<ErrorCode>"} (maps to DbResult).

-- ---------------------------------------------------------------------------
-- Helper schema (not exposed through the API) and membership helper for RLS.
-- SECURITY DEFINER avoids recursive RLS on org_memberships.
-- ---------------------------------------------------------------------------
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

create table public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 120),
  is_operator  boolean not null default false,  -- settable only by migration or service role
  created_at   timestamptz not null default now()
);

create table public.organisations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(name) between 1 and 160),
  created_at timestamptz not null default now()
);

create table public.org_memberships (
  org_id     uuid not null references public.organisations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('owner','approver','member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_memberships_user_id_idx on public.org_memberships(user_id);

create or replace function private.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.org_memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_org_member(uuid) from public, anon;
grant execute on function private.is_org_member(uuid) to authenticated, service_role;

create table public.wallet_challenges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  address     text not null check (address ~ '^G[A-Z2-7]{55}$'),
  nonce       text not null unique,
  purpose     text not null default 'wallet-binding' check (purpose = 'wallet-binding'),
  origin      text not null,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index wallet_challenges_user_idx on public.wallet_challenges(user_id);

create table public.wallet_bindings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  address     text not null check (address ~ '^G[A-Z2-7]{55}$'),
  network     text not null default 'testnet' check (network = 'testnet'),
  verified_at timestamptz not null default now(),
  revoked_at  timestamptz
);
create unique index wallet_bindings_active_address_uq on public.wallet_bindings(address) where revoked_at is null;
create unique index wallet_bindings_active_user_uq    on public.wallet_bindings(user_id) where revoked_at is null;

-- ---------------------------------------------------------------------------
-- RLS: members read what they need; no client writes anywhere.
-- ---------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.organisations     enable row level security;
alter table public.org_memberships   enable row level security;
alter table public.wallet_challenges enable row level security;  -- no policies: server only
alter table public.wallet_bindings   enable row level security;

revoke all on public.profiles, public.organisations, public.org_memberships,
              public.wallet_challenges, public.wallet_bindings from anon, authenticated;
grant select on public.profiles, public.organisations, public.org_memberships, public.wallet_bindings to authenticated;

create policy profiles_select_self_or_fellow on public.profiles for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.org_memberships a
      join public.org_memberships b on b.org_id = a.org_id
      where a.user_id = (select auth.uid()) and b.user_id = profiles.user_id
    )
  );

create policy organisations_select_member on public.organisations for select to authenticated
  using ((select private.is_org_member(id)));

create policy org_memberships_select_member on public.org_memberships for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_org_member(org_id)));

create policy wallet_bindings_select_own on public.wallet_bindings for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- RPCs (service_role only). The signature itself is verified in the app (F-13);
-- SQL enforces expiry, single use, ownership of the challenge and address uniqueness.
-- binding_is_locked() is defined in 004 (needs budget plans); it is resolved at call time.
-- ---------------------------------------------------------------------------
create or replace function public.issue_wallet_challenge(
  p_user uuid, p_address text, p_origin text, p_ttl_seconds int default 300)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_nonce text; v_expires timestamptz;
begin
  if p_address !~ '^G[A-Z2-7]{55}$' then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;
  v_nonce   := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_expires := now() + make_interval(secs => greatest(30, least(p_ttl_seconds, 900)));
  insert into public.wallet_challenges(user_id, address, nonce, origin, expires_at)
  values (p_user, p_address, v_nonce, p_origin, v_expires)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'value', jsonb_build_object(
    'challengeId', v_id, 'nonce', v_nonce, 'expiresAt', v_expires, 'origin', p_origin, 'purpose', 'wallet-binding'));
end $$;

-- Read (no consume) so a bad signature does not burn the challenge. Server verifies, then calls consume.
create or replace function public.get_wallet_challenge(p_user uuid, p_challenge uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.wallet_challenges;
begin
  select * into c from public.wallet_challenges where id = p_challenge and user_id = p_user;
  if not found or c.consumed_at is not null or c.expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'CHALLENGE_INVALID');
  end if;
  return jsonb_build_object('ok', true, 'value', jsonb_build_object(
    'challengeId', c.id, 'address', c.address, 'nonce', c.nonce, 'origin', c.origin,
    'purpose', c.purpose, 'expiresAt', c.expires_at));
end $$;

create or replace function public.consume_challenge_and_bind(p_user uuid, p_challenge uuid, p_address text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.wallet_challenges; v_active public.wallet_bindings; v_bind public.wallet_bindings;
begin
  select * into c from public.wallet_challenges where id = p_challenge for update;
  if not found or c.user_id <> p_user or c.address <> p_address
     or c.consumed_at is not null or c.expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'CHALLENGE_INVALID');
  end if;

  select * into v_active from public.wallet_bindings where user_id = p_user and revoked_at is null for update;
  if found and v_active.address <> p_address then
    if public.binding_is_locked(p_user) then
      return jsonb_build_object('ok', false, 'code', 'BINDING_LOCKED');
    end if;
    update public.wallet_bindings set revoked_at = now() where id = v_active.id;
  elsif found then
    update public.wallet_challenges set consumed_at = now() where id = c.id;
    return jsonb_build_object('ok', true, 'value', jsonb_build_object('address', v_active.address, 'verifiedAt', v_active.verified_at));
  end if;

  begin
    insert into public.wallet_bindings(user_id, address) values (p_user, p_address) returning * into v_bind;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'ADDRESS_ALREADY_BOUND');
  end;

  update public.wallet_challenges set consumed_at = now() where id = c.id;
  return jsonb_build_object('ok', true, 'value', jsonb_build_object('address', v_bind.address, 'verifiedAt', v_bind.verified_at));
end $$;

create or replace function public.unbind_wallet(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_active public.wallet_bindings;
begin
  select * into v_active from public.wallet_bindings where user_id = p_user and revoked_at is null for update;
  if not found then return jsonb_build_object('ok', true, 'value', '{}'::jsonb); end if;
  if public.binding_is_locked(p_user) then
    return jsonb_build_object('ok', false, 'code', 'BINDING_LOCKED');
  end if;
  update public.wallet_bindings set revoked_at = now() where id = v_active.id;
  return jsonb_build_object('ok', true, 'value', '{}'::jsonb);
end $$;

revoke all on function public.issue_wallet_challenge(uuid,text,text,int),
                       public.get_wallet_challenge(uuid,uuid),
                       public.consume_challenge_and_bind(uuid,uuid,text),
                       public.unbind_wallet(uuid) from public, anon, authenticated;
grant execute on function public.issue_wallet_challenge(uuid,text,text,int),
                          public.get_wallet_challenge(uuid,uuid),
                          public.consume_challenge_and_bind(uuid,uuid,text),
                          public.unbind_wallet(uuid) to service_role;
