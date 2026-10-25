-- CYFER for SMEs: 012 release a finished plan's deployment for reuse (operator only, audited)
-- A Paiflow flow keeps accepting deposits, but CYFER reserves one flow per plan so a deposit can always be tied to one
-- plan (D-12). Once a plan has reached `distribution_verified` its evidence is complete (payment, receipt and every envelope
-- verified against the chain), so its reservation may be closed and the flow offered to the next plan. The old plan keeps its
-- attempt, hashes and verifications untouched; this function never edits evidence. It appends an audit row.

create or replace function public.release_deployment_after_plan(p_operator uuid, p_plan uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.budget_plans; r public.deployment_reservations; v_ev jsonb;
begin
  if not exists (select 1 from public.profiles where user_id = p_operator and is_operator) then
    return public._fail('OPERATOR_REQUIRED');
  end if;
  select * into p from public.budget_plans where id = p_plan for update;
  if not found then return public._fail('NOT_FOUND'); end if;
  -- only a fully verified plan: anything earlier still needs its reservation (and may still be paid)
  if p.state <> 'distribution_verified' then return public._fail('STATE_CONFLICT'); end if;

  select * into r from public.deployment_reservations
   where budget_plan_id = p_plan and deployment_id = p.deployment_id and active for update;
  if not found then return public._fail('NOT_FOUND'); end if;

  update public.deployment_reservations set active = false, closed_at = now() where id = r.id;
  update public.paiflow_deployments set status = 'available' where id = p.deployment_id and status = 'reserved';

  v_ev := public.append_evidence('operator_review',
    jsonb_build_object('orgId', p.org_id, 'planId', p_plan), p_operator,
    jsonb_build_object('action', 'deployment_released', 'deploymentId', p.deployment_id, 'planId', p_plan),
    'Deployment released for reuse after a verified plan');
  return jsonb_build_object('ok', true, 'value', jsonb_build_object(
    'deploymentId', p.deployment_id, 'auditHash', v_ev ->> 'auditHash'));
end $$;

revoke all on function public.release_deployment_after_plan(uuid, uuid) from public, anon, authenticated;
grant execute on function public.release_deployment_after_plan(uuid, uuid) to service_role;
