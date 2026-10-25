-- CYFER for SMEs: 008 business RPCs (F-10): create_budget_plan, create_plan_version, decide_budget_plan, record_org_document
-- DRAFT. NOT APPLIED. The financial persistence RPCs (F-11, §3.6) are a separate file written after HO-04.
-- Every function locks the plan/org row, validates, changes state and calls append_evidence() in ONE transaction.
-- Results are jsonb: {"ok":true,"value":...} | {"ok":false,"code":"<ErrorCode>"}.
--
-- p_input for create_budget_plan / create_plan_version (built by the TS route, F-14):
--   { purpose, totalStroops, signerUserId, canonicalText, planSha256,
--     envelopes:[{position,label,bps,recipientAddress,planningPhpCentavos}] }
-- canonicalText is the exact canonicalJson(plan) string; SQL re-hashes it, so the stored hash cannot disagree with
-- the stored text. The canonical plan must contain deploymentId, totalStroops, signerAddress and the envelopes
-- (position, bps, recipientAddress); SQL cross-checks them against values it derives itself.

create or replace function public._fail(p_code text)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('ok', false, 'code', p_code)
$$;

-- [{position,address,bps}] ordered by position, from either envelope input (recipientAddress) or registry rows.
create or replace function public._project_recipients(p_arr jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'position', (e ->> 'position')::int,
      'address',  coalesce(e ->> 'address', e ->> 'recipientAddress'),
      'bps',      (e ->> 'bps')::int)
    order by (e ->> 'position')::int), '[]'::jsonb)
  from jsonb_array_elements(p_arr) e
$$;

-- Shared validation + hashing for create and new-version. Returns null when fine, else an error code.
create or replace function public._validate_plan_input(p_input jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare v_env jsonb; v_n int; v_bps int; v_distinct int;
begin
  if coalesce(length(btrim(p_input ->> 'purpose')), 0) not between 1 and 200 then return 'VALIDATION'; end if;
  if coalesce(p_input ->> 'totalStroops', '') !~ '^[1-9][0-9]{0,38}$' then return 'VALIDATION'; end if;
  v_env := p_input -> 'envelopes';
  if v_env is null or jsonb_typeof(v_env) <> 'array' or jsonb_array_length(v_env) < 1 then return 'VALIDATION'; end if;
  v_n := jsonb_array_length(v_env);
  if exists (
    select 1 from jsonb_array_elements(v_env) e
    where coalesce(e ->> 'recipientAddress', '') !~ '^G[A-Z2-7]{55}$'
       or coalesce(length(btrim(e ->> 'label')), 0) not between 1 and 80
       or coalesce((e ->> 'bps')::int, 0) <= 0
       or (e ->> 'position') is null
       or (e ->> 'planningPhpCentavos') is not null and (e ->> 'planningPhpCentavos') !~ '^[0-9]{1,18}$'
  ) then return 'VALIDATION'; end if;
  select count(distinct e ->> 'recipientAddress'), sum((e ->> 'bps')::int)
    into v_distinct, v_bps from jsonb_array_elements(v_env) e;
  if v_distinct <> v_n then return 'DUPLICATE_RECIPIENT'; end if;
  if v_bps <> 10000 then return 'BPS_TOTAL_INVALID'; end if;
  if coalesce(p_input ->> 'canonicalText', '') = '' or coalesce(p_input ->> 'planSha256', '') !~ '^[0-9a-f]{64}$' then
    return 'VALIDATION';
  end if;
  if encode(sha256(convert_to(p_input ->> 'canonicalText', 'UTF8')), 'hex') <> p_input ->> 'planSha256' then
    return 'VALIDATION';   -- hash does not match the text it claims to hash
  end if;
  return null;
exception when others then
  return 'VALIDATION';
end $$;

-- Cross-check the canonical plan against server-derived values; null when consistent.
create or replace function public._check_canonical(
  p_input jsonb, p_deployment uuid, p_signer_address text)
returns text language plpgsql immutable set search_path = '' as $$
declare c jsonb;
begin
  c := (p_input ->> 'canonicalText')::jsonb;
  if c ->> 'deploymentId' is distinct from p_deployment::text then return 'VALIDATION'; end if;
  if c ->> 'totalStroops' is distinct from p_input ->> 'totalStroops' then return 'VALIDATION'; end if;
  if c ->> 'signerAddress' is distinct from p_signer_address then return 'VALIDATION'; end if;
  if public._project_recipients(c -> 'envelopes') <> public._project_recipients(p_input -> 'envelopes') then
    return 'VALIDATION';
  end if;
  return null;
exception when others then
  return 'VALIDATION';
end $$;

-- ---------------------------------------------------------------------------
-- create_budget_plan
-- ---------------------------------------------------------------------------
create or replace function public.create_budget_plan(p_actor uuid, p_org uuid, p_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_role text; v_err text; v_dep public.paiflow_deployments; v_avail int; v_match int;
  v_signer_user uuid; v_signer_addr text; v_approvers uuid[]; v_nonowner int;
  v_plan uuid := gen_random_uuid(); v_ver uuid := gen_random_uuid(); v_ev jsonb; e jsonb; a uuid;
begin
  perform 1 from public.organisations where id = p_org for update;
  if not found then return public._fail('NOT_FOUND'); end if;

  select role into v_role from public.org_memberships where org_id = p_org and user_id = p_actor;
  if v_role is null then return public._fail('NOT_MEMBER'); end if;
  if v_role <> 'owner' then return public._fail('FORBIDDEN'); end if;

  v_err := public._validate_plan_input(p_input);
  if v_err is not null then return public._fail(v_err); end if;

  -- exactly one available budget_split deployment must match the envelopes (CL-11)
  select count(*) into v_avail from public.paiflow_deployments
    where template = 'budget_split' and status = 'available' and network = 'testnet' and input_asset = '{"kind":"native"}'::jsonb;
  if v_avail = 0 then return public._fail('NO_SPLIT_DEPLOYMENT'); end if;
  select count(*) into v_match from public.paiflow_deployments
    where template = 'budget_split' and status = 'available' and network = 'testnet' and input_asset = '{"kind":"native"}'::jsonb
      and public._project_recipients(split_recipients) = public._project_recipients(p_input -> 'envelopes');
  if v_match = 0 then return public._fail('ENVELOPES_MISMATCH_DEPLOYMENT'); end if;
  if v_match > 1 then return public._fail('AMBIGUOUS_DEPLOYMENT_MATCH'); end if;
  select * into v_dep from public.paiflow_deployments
    where template = 'budget_split' and status = 'available' and network = 'testnet' and input_asset = '{"kind":"native"}'::jsonb
      and public._project_recipients(split_recipients) = public._project_recipients(p_input -> 'envelopes')
    for update;

  -- authorised signer: a member with an active wallet binding (CL-15)
  v_signer_user := (p_input ->> 'signerUserId')::uuid;
  if not exists (select 1 from public.org_memberships where org_id = p_org and user_id = v_signer_user) then
    return public._fail('NOT_MEMBER');
  end if;
  select address into v_signer_addr from public.wallet_bindings where user_id = v_signer_user and revoked_at is null;
  if v_signer_addr is null then return public._fail('WALLET_MISMATCH'); end if;

  v_err := public._check_canonical(p_input, v_dep.id, v_signer_addr);
  if v_err is not null then return public._fail(v_err); end if;

  -- approver set snapshot (CL-14): all owners and approvers, with at least one non-owner
  select array_agg(user_id), count(*) filter (where role <> 'owner')
    into v_approvers, v_nonowner
    from public.org_memberships where org_id = p_org and role in ('owner','approver');
  if v_approvers is null or v_nonowner < 1 then return public._fail('APPROVER_SET_INVALID'); end if;

  begin
    insert into public.budget_plans(id, org_id, deployment_id, state, created_by)
    values (v_plan, p_org, v_dep.id, 'pending_approval', p_actor);
    insert into public.budget_plan_versions(id, plan_id, version, purpose, canonical_text, canonical_json,
        plan_sha256, total_stroops, signer_user_id, signer_address, created_by)
    values (v_ver, v_plan, 1, btrim(p_input ->> 'purpose'), p_input ->> 'canonicalText',
        (p_input ->> 'canonicalText')::jsonb, p_input ->> 'planSha256', p_input ->> 'totalStroops',
        v_signer_user, v_signer_addr, p_actor);
    update public.budget_plans set current_version_id = v_ver where id = v_plan;

    for e in select * from jsonb_array_elements(p_input -> 'envelopes') loop
      insert into public.budget_envelopes(version_id, position, label, bps, recipient_address, planning_php_centavos)
      values (v_ver, (e ->> 'position')::int, btrim(e ->> 'label'), (e ->> 'bps')::int, e ->> 'recipientAddress',
              nullif(e ->> 'planningPhpCentavos', '')::bigint);
    end loop;

    foreach a in array v_approvers loop
      insert into public.budget_approvals(version_id, approver_user_id, plan_sha256)
      values (v_ver, a, p_input ->> 'planSha256');
    end loop;

    insert into public.deployment_reservations(deployment_id, budget_plan_id) values (v_dep.id, v_plan);
    update public.paiflow_deployments set status = 'reserved' where id = v_dep.id;
    insert into public.plan_state_transitions(plan_id, from_state, to_state, actor_user_id, reason)
    values (v_plan, null, 'pending_approval', p_actor, 'plan created');
  exception when unique_violation then
    return public._fail('STATE_CONFLICT');
  end;

  v_ev := public.append_evidence('plan_create',
    jsonb_build_object('orgId', p_org, 'planId', v_plan), p_actor,
    jsonb_build_object('versionId', v_ver, 'version', 1, 'planSha256', p_input ->> 'planSha256',
                       'deploymentId', v_dep.id, 'approverCount', array_length(v_approvers, 1)),
    'Budget plan created and submitted for approval');

  return jsonb_build_object('ok', true, 'value', jsonb_build_object(
    'planId', v_plan, 'versionId', v_ver, 'version', 1, 'planSha256', p_input ->> 'planSha256',
    'ledgerBlockId', v_ev -> 'ledgerBlockId', 'auditHash', v_ev ->> 'auditHash'));
end $$;

-- ---------------------------------------------------------------------------
-- create_plan_version (edit). Refused once any payment attempt exists. Prior approvals are voided by construction:
-- new version, new approval rows, all pending.
-- ---------------------------------------------------------------------------
create or replace function public.create_plan_version(p_actor uuid, p_org uuid, p_plan uuid, p_input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_plan public.budget_plans; v_cur public.budget_plan_versions; v_dep public.paiflow_deployments;
  v_role text; v_err text; v_signer_user uuid; v_signer_addr text; v_approvers uuid[]; v_nonowner int;
  v_ver uuid := gen_random_uuid(); v_next int; v_ev jsonb; e jsonb; a uuid;
begin
  select * into v_plan from public.budget_plans where id = p_plan and org_id = p_org for update;
  if not found then return public._fail('NOT_FOUND'); end if;
  select role into v_role from public.org_memberships where org_id = p_org and user_id = p_actor;
  if v_role is null then return public._fail('NOT_MEMBER'); end if;
  if v_role <> 'owner' then return public._fail('FORBIDDEN'); end if;

  if exists (select 1 from public.payment_attempts where budget_plan_id = p_plan) then
    return public._fail('EDIT_AFTER_PAYMENT');
  end if;
  if v_plan.state not in ('draft','pending_approval','approved','rejected') then
    return public._fail('STATE_CONFLICT');
  end if;

  v_err := public._validate_plan_input(p_input);
  if v_err is not null then return public._fail(v_err); end if;

  select * into v_dep from public.paiflow_deployments where id = v_plan.deployment_id for update;
  -- envelopes are fixed by the deployment (D-12): changed envelopes cannot match and are refused
  if public._project_recipients(v_dep.split_recipients) <> public._project_recipients(p_input -> 'envelopes') then
    return public._fail('ENVELOPES_MISMATCH_DEPLOYMENT');
  end if;

  v_signer_user := (p_input ->> 'signerUserId')::uuid;
  if not exists (select 1 from public.org_memberships where org_id = p_org and user_id = v_signer_user) then
    return public._fail('NOT_MEMBER');
  end if;
  select address into v_signer_addr from public.wallet_bindings where user_id = v_signer_user and revoked_at is null;
  if v_signer_addr is null then return public._fail('WALLET_MISMATCH'); end if;

  v_err := public._check_canonical(p_input, v_dep.id, v_signer_addr);
  if v_err is not null then return public._fail(v_err); end if;

  select array_agg(user_id), count(*) filter (where role <> 'owner')
    into v_approvers, v_nonowner
    from public.org_memberships where org_id = p_org and role in ('owner','approver');
  if v_approvers is null or v_nonowner < 1 then return public._fail('APPROVER_SET_INVALID'); end if;

  select * into v_cur from public.budget_plan_versions where id = v_plan.current_version_id;
  v_next := v_cur.version + 1;

  update public.budget_plan_versions set superseded_at = now() where id = v_cur.id;
  insert into public.budget_plan_versions(id, plan_id, version, purpose, canonical_text, canonical_json,
      plan_sha256, total_stroops, signer_user_id, signer_address, created_by)
  values (v_ver, p_plan, v_next, btrim(p_input ->> 'purpose'), p_input ->> 'canonicalText',
      (p_input ->> 'canonicalText')::jsonb, p_input ->> 'planSha256', p_input ->> 'totalStroops',
      v_signer_user, v_signer_addr, p_actor);

  for e in select * from jsonb_array_elements(p_input -> 'envelopes') loop
    insert into public.budget_envelopes(version_id, position, label, bps, recipient_address, planning_php_centavos)
    values (v_ver, (e ->> 'position')::int, btrim(e ->> 'label'), (e ->> 'bps')::int, e ->> 'recipientAddress',
            nullif(e ->> 'planningPhpCentavos', '')::bigint);
  end loop;
  foreach a in array v_approvers loop
    insert into public.budget_approvals(version_id, approver_user_id, plan_sha256)
    values (v_ver, a, p_input ->> 'planSha256');
  end loop;

  update public.budget_plans set current_version_id = v_ver, state = 'pending_approval', updated_at = now()
    where id = p_plan;
  insert into public.plan_state_transitions(plan_id, from_state, to_state, actor_user_id, reason)
  values (p_plan, v_plan.state, 'pending_approval', p_actor, 'new version ' || v_next);

  v_ev := public.append_evidence('plan_create',
    jsonb_build_object('orgId', p_org, 'planId', p_plan), p_actor,
    jsonb_build_object('versionId', v_ver, 'version', v_next, 'planSha256', p_input ->> 'planSha256',
                       'supersedes', v_cur.id),
    'New budget plan version submitted; prior approvals no longer apply');

  return jsonb_build_object('ok', true, 'value', jsonb_build_object(
    'planId', p_plan, 'versionId', v_ver, 'version', v_next, 'planSha256', p_input ->> 'planSha256',
    'ledgerBlockId', v_ev -> 'ledgerBlockId', 'auditHash', v_ev ->> 'auditHash'));
end $$;

-- ---------------------------------------------------------------------------
-- decide_budget_plan: approve or reject. The plan row lock serialises concurrent last approvals, and the
-- state change is a conditional update, so the plan is approved (published) exactly once (REQ-BUD-02 AC1).
-- ---------------------------------------------------------------------------
create or replace function public.decide_budget_plan(
  p_actor uuid, p_plan uuid, p_version uuid, p_sha256 text, p_decision text, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_plan public.budget_plans; v_ver public.budget_plan_versions; v_row public.budget_approvals;
  v_pending int; v_rejected int; v_total int; v_approved int; v_ev jsonb; v_became_approved boolean := false;
  v_state text;
begin
  if p_decision not in ('approved','rejected') then return public._fail('VALIDATION'); end if;
  if p_decision = 'rejected' and coalesce(length(btrim(p_reason)), 0) = 0 then return public._fail('VALIDATION'); end if;

  select * into v_plan from public.budget_plans where id = p_plan for update;
  if not found then return public._fail('NOT_FOUND'); end if;
  if not exists (select 1 from public.org_memberships where org_id = v_plan.org_id and user_id = p_actor) then
    return public._fail('NOT_MEMBER');
  end if;

  if v_plan.current_version_id is distinct from p_version then return public._fail('STALE_VERSION'); end if;
  select * into v_ver from public.budget_plan_versions where id = p_version;
  if v_ver.plan_sha256 <> p_sha256 then return public._fail('STALE_VERSION'); end if;

  select * into v_row from public.budget_approvals where version_id = p_version and approver_user_id = p_actor;
  if not found then return public._fail('FORBIDDEN'); end if;   -- not in the snapshotted approver set

  if v_row.decision <> 'pending' then
    -- duplicate: return the existing decision instead of an error
    select count(*) filter (where decision = 'approved'), count(*) into v_approved, v_total
      from public.budget_approvals where version_id = p_version;
    return jsonb_build_object('ok', true, 'value', jsonb_build_object(
      'outcome', 'existing', 'decision', v_row.decision, 'state', v_plan.state,
      'approved', v_approved, 'required', v_total));
  end if;

  if v_plan.state <> 'pending_approval' then return public._fail('STATE_CONFLICT'); end if;

  update public.budget_approvals
     set decision = p_decision, reason = case when p_decision = 'rejected' then btrim(p_reason) end, responded_at = now()
   where version_id = p_version and approver_user_id = p_actor and decision = 'pending';
  if not found then return public._fail('STATE_CONFLICT'); end if;

  if p_decision = 'rejected' then
    update public.budget_plans set state = 'rejected', updated_at = now() where id = p_plan and state = 'pending_approval';
    insert into public.plan_state_transitions(plan_id, from_state, to_state, actor_user_id, reason)
    values (p_plan, 'pending_approval', 'rejected', p_actor, btrim(p_reason));
    v_ev := public.append_evidence('plan_reject',
      jsonb_build_object('orgId', v_plan.org_id, 'planId', p_plan), p_actor,
      jsonb_build_object('versionId', p_version, 'planSha256', p_sha256, 'reason', btrim(p_reason)),
      'Budget plan rejected by an approver');
  else
    select count(*) filter (where decision = 'pending'), count(*) filter (where decision = 'rejected')
      into v_pending, v_rejected from public.budget_approvals where version_id = p_version;
    if v_pending = 0 and v_rejected = 0 then
      update public.budget_plans set state = 'approved', updated_at = now() where id = p_plan and state = 'pending_approval';
      v_became_approved := found;
      if v_became_approved then
        insert into public.plan_state_transitions(plan_id, from_state, to_state, actor_user_id, reason)
        values (p_plan, 'pending_approval', 'approved', p_actor, 'all approvers approved the current version hash');
      end if;
    end if;
    v_ev := public.append_evidence('plan_approve',
      jsonb_build_object('orgId', v_plan.org_id, 'planId', p_plan), p_actor,
      jsonb_build_object('versionId', p_version, 'planSha256', p_sha256, 'fullyApproved', v_became_approved),
      case when v_became_approved then 'Budget plan approved by every designated approver'
           else 'Budget plan approved by one approver' end);
  end if;

  select state into v_state from public.budget_plans where id = p_plan;
  select count(*) filter (where decision = 'approved'), count(*) into v_approved, v_total
    from public.budget_approvals where version_id = p_version;

  return jsonb_build_object('ok', true, 'value', jsonb_build_object(
    'outcome', 'recorded', 'decision', p_decision, 'state', v_state, 'approved', v_approved, 'required', v_total,
    'ledgerBlockId', v_ev -> 'ledgerBlockId', 'auditHash', v_ev ->> 'auditHash'));
end $$;

-- ---------------------------------------------------------------------------
-- record_org_document: the route uploads to private storage FIRST, then calls this. If the ledger append fails the
-- whole function rolls back, so no row exists (REQ-DOC-01 AC2); the route then deletes the orphan object.
-- ---------------------------------------------------------------------------
create or replace function public.record_org_document(
  p_actor uuid, p_org uuid, p_kind text, p_sha256 text, p_size bigint, p_media_type text,
  p_storage_key text, p_filename text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid := gen_random_uuid(); v_ev jsonb;
begin
  if not exists (select 1 from public.org_memberships where org_id = p_org and user_id = p_actor) then
    return public._fail('NOT_MEMBER');
  end if;
  if p_kind not in ('contract','invoice','receipt','plan_attachment','other')
     or p_sha256 !~ '^[0-9a-f]{64}$' or p_size < 0 or p_size > 10485760
     or coalesce(length(p_filename), 0) not between 1 and 255 then
    return public._fail('VALIDATION');
  end if;

  begin
    insert into public.org_documents(id, org_id, kind, sha256, size_bytes, media_type, storage_key, original_filename, uploaded_by)
    values (v_id, p_org, p_kind, p_sha256, p_size, p_media_type, p_storage_key, p_filename, p_actor);
  exception
    when check_violation then return public._fail('VALIDATION');
    when unique_violation then return public._fail('STATE_CONFLICT');
  end;

  v_ev := public.append_evidence('doc_record',
    jsonb_build_object('orgId', p_org), p_actor,
    jsonb_build_object('documentId', v_id, 'kind', p_kind, 'sha256', p_sha256, 'sizeBytes', p_size),
    'Document recorded (SHA-256)');
  update public.org_documents set ledger_block_id = (v_ev ->> 'ledgerBlockId')::int where id = v_id;

  return jsonb_build_object('ok', true, 'value', jsonb_build_object(
    'documentId', v_id, 'ledgerBlockId', v_ev -> 'ledgerBlockId', 'auditHash', v_ev ->> 'auditHash'));
end $$;

revoke all on function public._fail(text), public._project_recipients(jsonb), public._validate_plan_input(jsonb),
  public._check_canonical(jsonb,uuid,text),
  public.create_budget_plan(uuid,uuid,jsonb), public.create_plan_version(uuid,uuid,uuid,jsonb),
  public.decide_budget_plan(uuid,uuid,uuid,text,text,text),
  public.record_org_document(uuid,uuid,text,text,bigint,text,text,text)
  from public, anon, authenticated;
grant execute on function public._fail(text), public._project_recipients(jsonb), public._validate_plan_input(jsonb),
  public._check_canonical(jsonb,uuid,text),
  public.create_budget_plan(uuid,uuid,jsonb), public.create_plan_version(uuid,uuid,uuid,jsonb),
  public.decide_budget_plan(uuid,uuid,uuid,text,text,text),
  public.record_org_document(uuid,uuid,text,text,bigint,text,text,text)
  to service_role;
