-- CYFER for SMEs: 011 create_budget_plan: clear refusal for the loser of a deployment race
-- Found by tests/db/concurrency-guards.db.mjs: with two plans racing for one deployment, the safe outcome already held
-- (one winner, one active reservation) but the loser got the misleading code VALIDATION. CREATE OR REPLACE keeps the grants.

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
  -- Two sessions can pass the checks above for the same deployment. The loser waits on this row lock and, once the
  -- winner has reserved it, the row no longer matches: say so, instead of carrying on with a null deployment.
  if not found then return public._fail('NO_SPLIT_DEPLOYMENT'); end if;

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
