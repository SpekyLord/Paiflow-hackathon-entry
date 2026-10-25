-- CYFER for SMEs: 009 financial persistence RPCs (F-11, FRANCIS-PHASETASK §3.6, MVP part)
-- DRAFT. NOT APPLIED. Syntax and behaviour unverified until applied to the dedicated project (F-19, needs authorisation).
-- Wrapped one-to-one by src/server/db/financial.ts. All functions: SECURITY DEFINER, search_path '', executable by
-- service_role only. Results are jsonb: {"ok":true,"value":...} | {"ok":false,"code":"<ErrorCode>"}.
-- Lock order everywhere: plan row, then attempt row (no deadlocks between begin and the others).
-- Provisional until HO-04: the Split payout event payload. Verification input is generic jsonb (checks, eventIds).
-- SHOULD-tier functions (release/refund/deal) are NOT here; their signatures stay frozen in §3.6 for F-31.

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
-- Expected Split shares, identical to src/contracts/split.ts: floor(total*bps/10000); last envelope takes the remainder.
create or replace function public._expected_shares(p_version uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_total numeric; v_sum numeric := 0; v_out jsonb := '[]'::jsonb; r record; v_share numeric; v_n int; v_i int := 0;
begin
  select total_stroops::numeric into v_total from public.budget_plan_versions where id = p_version;
  select count(*) into v_n from public.budget_envelopes where version_id = p_version;
  for r in select * from public.budget_envelopes where version_id = p_version order by position loop
    v_i := v_i + 1;
    v_share := trunc(v_total * r.bps / 10000);
    v_sum := v_sum + v_share;
    if v_i = v_n then v_share := v_share + (v_total - v_sum); end if;
    v_out := v_out || jsonb_build_object(
      'position', r.position, 'label', r.label, 'bps', r.bps,
      'recipientAddress', r.recipient_address, 'expectedShareStroops', trunc(v_share)::text);
  end loop;
  return v_out;
end $$;

create or replace function public._plan_context(p_plan uuid, p_actor uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.budget_plans; v public.budget_plan_versions; b public.wallet_bindings;
begin
  select * into p from public.budget_plans where id = p_plan;
  select * into v from public.budget_plan_versions where id = p.current_version_id;
  select * into b from public.wallet_bindings where user_id = p_actor and revoked_at is null;
  return jsonb_build_object(
    'scope', jsonb_build_object('kind', 'plan', 'planId', p.id),
    'orgId', p.org_id, 'state', p.state, 'versionId', v.id, 'planSha256', v.plan_sha256,
    'deploymentId', p.deployment_id, 'signerAddress', v.signer_address, 'signerUserId', v.signer_user_id,
    'totalStroops', v.total_stroops, 'asset', jsonb_build_object('kind', 'native'),
    'envelopes', public._expected_shares(v.id),
    'viewerBinding', case when b.id is null then null
                          else jsonb_build_object('address', b.address, 'verifiedAt', b.verified_at) end);
end $$;

-- Lock the plan row first, then the attempt row. Returns the locked attempt (null id when not found).
create or replace function public._lock_attempt(p_attempt uuid)
returns public.payment_attempts language plpgsql security definer set search_path = '' as $$
declare v_plan uuid; a public.payment_attempts;
begin
  select budget_plan_id into v_plan from public.payment_attempts where id = p_attempt;
  if v_plan is not null then perform 1 from public.budget_plans where id = v_plan for update; end if;
  select * into a from public.payment_attempts where id = p_attempt for update;
  return a;
end $$;

create or replace function public._open_review(p_scope text, p_ref uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.operator_reviews where scope = p_scope and ref_id = p_ref and resolved_at is null;
  if v_id is null then
    insert into public.operator_reviews(scope, ref_id, reason) values (p_scope, p_ref, p_reason) returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function public._set_plan_state(p_plan uuid, p_from text[], p_to text, p_actor uuid, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_old text;
begin
  select state into v_old from public.budget_plans where id = p_plan;
  update public.budget_plans set state = p_to, updated_at = now() where id = p_plan and state = any (p_from);
  if not found then return false; end if;
  insert into public.plan_state_transitions(plan_id, from_state, to_state, actor_user_id, reason)
  values (p_plan, v_old, p_to, p_actor, p_reason);
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- context read
-- ---------------------------------------------------------------------------
create or replace function public.get_payment_context(p_plan uuid, p_actor uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.budget_plans;
begin
  select * into p from public.budget_plans where id = p_plan;
  if not found then return public._fail('NOT_FOUND'); end if;
  if not exists (select 1 from public.org_memberships where org_id = p.org_id and user_id = p_actor) then
    return public._fail('NOT_MEMBER');
  end if;
  return jsonb_build_object('ok', true, 'value', public._plan_context(p_plan, p_actor));
end $$;

-- ---------------------------------------------------------------------------
-- beginPaymentAttempt. The approval gate lives here (REQ-BUD-02 AC4): the route never reaches Paiflow
-- unless this returns ok. Order of refusals: NOT_MEMBER, NOT_SIGNER, PLAN_NOT_APPROVED, WALLET_MISMATCH.
-- ---------------------------------------------------------------------------
create or replace function public.begin_payment_attempt(p_plan uuid, p_actor uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  p public.budget_plans; v public.budget_plan_versions; b public.wallet_bindings; a public.payment_attempts;
  v_not_approved int; v_ctx jsonb; v_ev jsonb;
begin
  select * into p from public.budget_plans where id = p_plan for update;
  if not found then return public._fail('NOT_FOUND'); end if;
  if not exists (select 1 from public.org_memberships where org_id = p.org_id and user_id = p_actor) then
    return public._fail('NOT_MEMBER');
  end if;
  select * into v from public.budget_plan_versions where id = p.current_version_id;
  if v.signer_user_id <> p_actor then return public._fail('NOT_SIGNER'); end if;

  -- an open (non-terminal) attempt: return it unchanged (REQ-ESC-01 AC4)
  select * into a from public.payment_attempts
   where budget_plan_id = p_plan and state not in ('success','failed','prepare_failed','reconciled');
  if found then
    return jsonb_build_object('ok', true, 'value', jsonb_build_object(
      'outcome', 'existing', 'attempt', to_jsonb(a), 'context', public._plan_context(p_plan, p_actor)));
  end if;

  -- every snapshotted approver approved THIS version hash
  select count(*) into v_not_approved from public.budget_approvals
   where version_id = v.id and (decision <> 'approved' or plan_sha256 <> v.plan_sha256);
  if p.state <> 'approved' or v_not_approved > 0
     or not exists (select 1 from public.budget_approvals where version_id = v.id) then
    if p.state in ('draft','pending_approval','rejected','approved') then
      return public._fail('PLAN_NOT_APPROVED');
    end if;
    return public._fail('STATE_CONFLICT');
  end if;

  select * into b from public.wallet_bindings where user_id = p_actor and revoked_at is null;
  if b.id is null or b.address <> v.signer_address then return public._fail('WALLET_MISMATCH'); end if;

  if not exists (select 1 from public.deployment_reservations
                  where budget_plan_id = p_plan and deployment_id = p.deployment_id and active) then
    return public._fail('STATE_CONFLICT');
  end if;

  begin
    insert into public.payment_attempts(budget_plan_id, plan_version_id, deployment_id, from_address,
        amount_stroops, asset, state, created_by)
    values (p_plan, v.id, p.deployment_id, v.signer_address, v.total_stroops,
        '{"kind":"native"}'::jsonb, 'preparing', p_actor)
    returning * into a;
  exception when unique_violation then
    -- lost a race: the other transaction's attempt is the open one
    select * into a from public.payment_attempts
     where budget_plan_id = p_plan and state not in ('success','failed','prepare_failed','reconciled');
    return jsonb_build_object('ok', true, 'value', jsonb_build_object(
      'outcome', 'existing', 'attempt', to_jsonb(a), 'context', public._plan_context(p_plan, p_actor)));
  end;

  perform public._set_plan_state(p_plan, array['approved'], 'payment_pending', p_actor, 'payment attempt started');
  v_ev := public.append_evidence('pay_prepare',
    jsonb_build_object('orgId', p.org_id, 'planId', p_plan), p_actor,
    jsonb_build_object('attemptId', a.id, 'versionId', v.id, 'planSha256', v.plan_sha256), 'Payment attempt started');
  v_ctx := public._plan_context(p_plan, p_actor);
  return jsonb_build_object('ok', true, 'value', jsonb_build_object(
    'outcome', 'created', 'attempt', to_jsonb(a), 'context', v_ctx));
end $$;

-- ---------------------------------------------------------------------------
-- attempt lifecycle
-- ---------------------------------------------------------------------------
create or replace function public.record_preparation(
  p_attempt uuid, p_network text, p_passphrase text, p_xdr text, p_hash text,
  p_history_request_id text, p_expires_at timestamptz, p_fee text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.payment_attempts;
begin
  a := public._lock_attempt(p_attempt);
  if a.id is null then return public._fail('NOT_FOUND'); end if;
  if a.state <> 'preparing' then return public._fail('STATE_CONFLICT'); end if;
  if p_network <> 'testnet' or p_hash !~ '^[0-9a-f]{64}$' or coalesce(p_xdr, '') = '' then
    return public._fail('VALIDATION');
  end if;
  begin
    update public.payment_attempts
       set network = p_network, network_passphrase = p_passphrase, prepared_xdr = p_xdr, original_tx_hash = p_hash,
           history_request_id = p_history_request_id, expires_at = p_expires_at, fee_stroops = p_fee, state = 'prepared'
     where id = p_attempt returning * into a;
  exception
    when unique_violation then return public._fail('STATE_CONFLICT');
    when check_violation then return public._fail('VALIDATION');
  end;
  return jsonb_build_object('ok', true, 'value', to_jsonb(a));
end $$;

-- Only while nothing was stored or released (no XDR ever left the server) -> safe to unlock a retry.
create or replace function public.fail_preparation(p_attempt uuid, p_code text, p_request_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.payment_attempts;
begin
  a := public._lock_attempt(p_attempt);
  if a.id is null then return public._fail('NOT_FOUND'); end if;
  if a.state <> 'preparing' or a.prepared_xdr is not null then return public._fail('STATE_CONFLICT'); end if;
  update public.payment_attempts set state = 'prepare_failed', last_request_id = p_request_id,
         submit_outcome = jsonb_build_object('prepareFailedCode', left(coalesce(p_code, ''), 80))
   where id = p_attempt;
  perform public._set_plan_state(a.budget_plan_id, array['payment_pending'], 'approved', a.created_by, 'prepare failed; no XDR released');
  return jsonb_build_object('ok', true, 'value', '{}'::jsonb);
end $$;

create or replace function public.mark_signature_requested(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.payment_attempts;
begin
  a := public._lock_attempt(p_attempt);
  if a.id is null then return public._fail('NOT_FOUND'); end if;
  if a.state = 'signing' then return jsonb_build_object('ok', true, 'value', '{}'::jsonb); end if;   -- idempotent
  if a.state <> 'prepared' or (a.expires_at is not null and a.expires_at <= now()) then
    return public._fail('STATE_CONFLICT');
  end if;
  update public.payment_attempts set state = 'signing', signature_requested_at = now() where id = p_attempt;
  return jsonb_build_object('ok', true, 'value', '{}'::jsonb);
end $$;

-- Persist the signed envelope BEFORE submitting. The body hash must equal the prepared original hash.
create or replace function public.persist_signed_envelope(
  p_attempt uuid, p_actor uuid, p_signed_xdr text, p_body_hash text, p_after_expiry boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.payment_attempts; v_signer uuid;
begin
  a := public._lock_attempt(p_attempt);
  if a.id is null then return public._fail('NOT_FOUND'); end if;
  select signer_user_id into v_signer from public.budget_plan_versions where id = a.plan_version_id;
  if v_signer is distinct from p_actor then return public._fail('NOT_SIGNER'); end if;

  if a.signed_xdr is not null then   -- idempotent for the identical envelope, never replaced
    if a.signed_xdr = p_signed_xdr then return jsonb_build_object('ok', true, 'value', to_jsonb(a)); end if;
    return public._fail('ENVELOPE_CHANGED');
  end if;
  if a.state not in ('prepared','signing','expired_unsigned') then return public._fail('STATE_CONFLICT'); end if;
  if a.original_tx_hash is null or p_body_hash is distinct from a.original_tx_hash::text then
    return public._fail('ENVELOPE_CHANGED');
  end if;
  if coalesce(p_signed_xdr, '') = '' or length(p_signed_xdr) > 200000 then return public._fail('VALIDATION'); end if;

  update public.payment_attempts
     set signed_xdr = p_signed_xdr, signed_body_hash = p_body_hash, state = 'signed_persisted',
         submit_outcome = coalesce(submit_outcome, '{}'::jsonb) || jsonb_build_object('receivedAfterExpiry', coalesce(p_after_expiry, false))
   where id = p_attempt returning * into a;
  return jsonb_build_object('ok', true, 'value', to_jsonb(a));
end $$;

create or replace function public.record_envelope_rejection(
  p_attempt uuid, p_actor uuid, p_signed_xdr text, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.payment_attempts where id = p_attempt) then return public._fail('NOT_FOUND'); end if;
  begin
    insert into public.payment_envelope_rejections(attempt_id, actor_user_id, signed_xdr, reason)
    values (p_attempt, p_actor, p_signed_xdr, p_reason);
  exception when check_violation then return public._fail('VALIDATION');
  end;
  return jsonb_build_object('ok', true, 'value', '{}'::jsonb);   -- attempt state unchanged
end $$;

-- A submit response never moves the plan (CL-09); only recordStatusCheck does.
create or replace function public.record_submission(p_attempt uuid, p_request_id text, p_outcome jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.payment_attempts; v_status text; p public.budget_plans; v_mismatch boolean := false;
begin
  a := public._lock_attempt(p_attempt);
  if a.id is null then return public._fail('NOT_FOUND'); end if;
  if a.signed_xdr is null or a.state not in ('signed_persisted','submitted','pending','unknown','rejected') then
    return public._fail('STATE_CONFLICT');
  end if;
  if p_outcome ->> 'kind' = 'response' then
    v_status := p_outcome ->> 'status';
    v_mismatch := lower(coalesce(p_outcome ->> 'txHash', '')) is distinct from a.original_tx_hash::text;
  elsif p_outcome ->> 'kind' = 'transport_error' then
    v_status := 'transport_error';
  else
    return public._fail('VALIDATION');
  end if;

  update public.payment_attempts
     set state = 'submitted', submit_status = v_status, last_request_id = p_request_id,
         submit_outcome = coalesce(submit_outcome, '{}'::jsonb) || jsonb_build_object('lastSubmit', p_outcome, 'hashMismatch', v_mismatch)
   where id = p_attempt returning * into a;
  select * into p from public.budget_plans where id = a.budget_plan_id;
  perform public.append_evidence('pay_submit',
    jsonb_build_object('orgId', p.org_id, 'planId', p.id), a.created_by,
    jsonb_build_object('attemptId', a.id, 'submitStatus', v_status, 'originalTxHash', a.original_tx_hash,
                       'hashMismatch', v_mismatch),
    'Signed payment submitted to Paiflow');
  return jsonb_build_object('ok', true, 'value', to_jsonb(a));
end $$;

-- Only a transaction-status lookup on the ORIGINAL hash moves the plan (CL-09).
-- p_lookup: {"kind":"found","status","txHash","network","ledger"} | {"kind":"not_found"} | {"kind":"transport_error",...}
create or replace function public.record_status_check(
  p_attempt uuid, p_request_id text, p_checks_exhausted boolean, p_lookup jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.payment_attempts; p public.budget_plans; v_status text; v_bad boolean; v_new text; v_ev jsonb;
begin
  a := public._lock_attempt(p_attempt);
  if a.id is null then return public._fail('NOT_FOUND'); end if;
  select * into p from public.budget_plans where id = a.budget_plan_id;

  if a.state in ('success','failed','prepare_failed','reconciled') then
    return jsonb_build_object('ok', true, 'value', to_jsonb(a));      -- terminal: nothing changes
  end if;
  if a.original_tx_hash is null then return public._fail('STATE_CONFLICT'); end if;

  if p_lookup ->> 'kind' = 'transport_error' then
    update public.payment_attempts set last_checked_at = now(), last_request_id = p_request_id
     where id = p_attempt returning * into a;

  elsif p_lookup ->> 'kind' = 'not_found' then
    v_new := case when a.signed_xdr is not null and a.state in ('signed_persisted','submitted','pending')
                  then 'unknown' else a.state end;
    update public.payment_attempts set final_status = 'NOT_FOUND', state = v_new,
           last_checked_at = now(), last_request_id = p_request_id
     where id = p_attempt returning * into a;

  elsif p_lookup ->> 'kind' = 'found' then
    v_status := upper(coalesce(p_lookup ->> 'status', ''));
    v_bad := lower(coalesce(p_lookup ->> 'txHash', '')) is distinct from a.original_tx_hash::text
             or coalesce(p_lookup ->> 'network', 'testnet') <> 'testnet';
    if v_status not in ('SUCCESS','FAILED','PENDING','UNKNOWN','REJECTED') then return public._fail('VALIDATION'); end if;

    if v_bad then
      -- a lookup that does not describe our original testnet transaction proves nothing: escalate, never advance
      update public.payment_attempts set state = 'operator_review', last_checked_at = now(), last_request_id = p_request_id
       where id = p_attempt returning * into a;
      perform public._set_plan_state(a.budget_plan_id, array['payment_pending','payment_confirmed'], 'operator_review', a.created_by, 'status lookup did not match original transaction');
      perform public._open_review('payment_attempt', a.id, 'Status lookup hash or network did not match the original transaction');
    elsif v_status = 'SUCCESS' then
      update public.payment_attempts set state = 'success', final_status = 'SUCCESS', ledger = (p_lookup ->> 'ledger')::bigint,
             last_checked_at = now(), last_request_id = p_request_id
       where id = p_attempt returning * into a;
      if public._set_plan_state(a.budget_plan_id, array['payment_pending'], 'payment_confirmed', a.created_by, 'Paiflow reports SUCCESS for the original hash') then
        perform public.append_evidence('pay_confirmed',
          jsonb_build_object('orgId', p.org_id, 'planId', p.id), a.created_by,
          jsonb_build_object('attemptId', a.id, 'originalTxHash', a.original_tx_hash, 'ledger', a.ledger),
          'Payment transaction confirmed (payout not yet verified)');
      end if;
    elsif v_status = 'FAILED' then
      update public.payment_attempts set state = 'failed', final_status = 'FAILED',
             last_checked_at = now(), last_request_id = p_request_id
       where id = p_attempt returning * into a;
      if public._set_plan_state(a.budget_plan_id, array['payment_pending'], 'approved', a.created_by, 'confirmed FAILED; new attempt needs deliberate action') then
        perform public.append_evidence('pay_failed',
          jsonb_build_object('orgId', p.org_id, 'planId', p.id), a.created_by,
          jsonb_build_object('attemptId', a.id, 'originalTxHash', a.original_tx_hash), 'Payment transaction confirmed failed');
      end if;
    else
      update public.payment_attempts set final_status = v_status, state = lower(v_status),
             last_checked_at = now(), last_request_id = p_request_id
       where id = p_attempt returning * into a;
    end if;
  else
    return public._fail('VALIDATION');
  end if;

  -- exhausted bounded checks without a final status: escalate (never create a replacement payment)
  if coalesce(p_checks_exhausted, false) and a.state not in ('success','failed','operator_review') then
    update public.payment_attempts set state = 'operator_review' where id = p_attempt returning * into a;
    perform public._set_plan_state(a.budget_plan_id, array['payment_pending'], 'operator_review', a.created_by, 'checks exhausted without a final status');
    perform public._open_review('payment_attempt', a.id, 'Bounded status checks exhausted without a final status');
    perform public.append_evidence('operator_review',
      jsonb_build_object('orgId', p.org_id, 'planId', p.id), a.created_by,
      jsonb_build_object('attemptId', a.id), 'Payment outcome unresolved; sent to operator review');
  end if;
  return jsonb_build_object('ok', true, 'value', to_jsonb(a));
end $$;

-- Refuses when a signed envelope exists (it could still be submitted).
create or replace function public.mark_expired_unsigned(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.payment_attempts;
begin
  a := public._lock_attempt(p_attempt);
  if a.id is null then return public._fail('NOT_FOUND'); end if;
  if a.signed_xdr is not null or a.state not in ('prepared','signing')
     or a.expires_at is null or now() <= a.expires_at then
    return public._fail('STATE_CONFLICT');
  end if;
  update public.payment_attempts set state = 'expired_unsigned' where id = p_attempt;
  perform public._set_plan_state(a.budget_plan_id, array['payment_pending'], 'operator_review', a.created_by, 'prepared payment expired unsigned');
  perform public._open_review('payment_attempt', a.id, 'Prepared payment expired without a signature');
  return jsonb_build_object('ok', true, 'value', '{}'::jsonb);
end $$;

-- ---------------------------------------------------------------------------
-- verification (PRD §H). The DB derives expected values itself; caller values are only cross-checked.
-- p_result: {state, stellarTxHash, expectedAddress, expectedAmountStroops, observedAmountStroops, asset, eventIds[], checks{}, note}
-- ---------------------------------------------------------------------------
create or replace function public._normalise_verification(
  p_result jsonb, p_attempt public.payment_attempts, p_exp_addr text, p_exp_amount text)
returns text language plpgsql immutable set search_path = '' as $$
declare v_state text := coalesce(p_result ->> 'state', 'not_started');
begin
  if v_state not in ('not_started','awaiting_tx_final','awaiting_events','verified','mismatch','operator_review') then
    return 'not_started';
  end if;
  -- nothing can be judged before the payment transaction itself is confirmed
  if p_attempt.state <> 'success' and v_state in ('verified','mismatch') then return 'awaiting_tx_final'; end if;
  if v_state = 'verified' and (
       p_result ->> 'expectedAddress' is distinct from p_exp_addr
    or p_result ->> 'expectedAmountStroops' is distinct from p_exp_amount
    or p_result ->> 'observedAmountStroops' is distinct from p_exp_amount
    or lower(coalesce(p_result ->> 'stellarTxHash', '')) = ''
  ) then return 'mismatch'; end if;
  return v_state;
end $$;

create or replace function public.record_payment_receipt_verification(p_attempt uuid, p_result jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.payment_attempts; v_state text; v_hash text;
begin
  a := public._lock_attempt(p_attempt);
  if a.id is null then return public._fail('NOT_FOUND'); end if;
  v_state := public._normalise_verification(p_result, a, a.from_address, a.amount_stroops);
  v_hash := lower(nullif(p_result ->> 'stellarTxHash', ''));
  if v_state = 'verified' and v_hash is distinct from a.original_tx_hash::text then v_state := 'mismatch'; end if;

  begin
    insert into public.payout_verifications(budget_plan_id, attempt_id, kind, tx_hash, expected_recipient,
        expected_amount_stroops, observed_amount_stroops, asset, event_ids, state, checks, checked_at, notes)
    values (a.budget_plan_id, a.id, 'payment_receipt', v_hash, a.from_address, a.amount_stroops,
        nullif(p_result ->> 'observedAmountStroops', ''), a.asset,
        coalesce(array(select jsonb_array_elements_text(p_result -> 'eventIds')), '{}'),
        v_state, coalesce(p_result -> 'checks', '{}'::jsonb), now(), p_result ->> 'note')
    on conflict (attempt_id, kind, (coalesce(envelope_position, -1))) where attempt_id is not null
    do update set tx_hash = excluded.tx_hash, observed_amount_stroops = excluded.observed_amount_stroops,
        event_ids = excluded.event_ids, state = excluded.state, checks = excluded.checks,
        checked_at = excluded.checked_at, notes = excluded.notes
      where public.payout_verifications.state <> 'verified' or excluded.state in ('mismatch','operator_review');
  exception when check_violation or invalid_text_representation then return public._fail('VALIDATION');
  end;
  if v_state = 'mismatch' then
    perform public._open_review('verification', a.id, 'Payment receipt evidence does not match the expected payment');
  end if;
  return jsonb_build_object('ok', true, 'value', jsonb_build_object('state', v_state));
end $$;

-- Rule 8: distribution_verified only when EVERY envelope of the paid version is verified; any mismatch -> mismatch.
create or replace function public.record_envelope_payout_verification(
  p_plan uuid, p_attempt uuid, p_position int, p_result jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.payment_attempts; p public.budget_plans; e jsonb; v_state text; v_hash text;
  v_total int; v_verified int; v_mismatch int; v_plan_state text; v_was text;
begin
  a := public._lock_attempt(p_attempt);
  if a.id is null or a.budget_plan_id is distinct from p_plan then return public._fail('NOT_FOUND'); end if;
  select * into p from public.budget_plans where id = p_plan;

  select x into e from jsonb_array_elements(public._expected_shares(a.plan_version_id)) x
   where (x ->> 'position')::int = p_position;
  if e is null then return public._fail('NOT_FOUND'); end if;

  v_state := public._normalise_verification(p_result, a, e ->> 'recipientAddress', e ->> 'expectedShareStroops');
  v_hash := lower(nullif(p_result ->> 'stellarTxHash', ''));

  select state into v_was from public.payout_verifications
   where attempt_id = a.id and kind = 'envelope_payout' and envelope_position = p_position;

  begin
    insert into public.payout_verifications(budget_plan_id, attempt_id, kind, envelope_position, tx_hash, expected_recipient,
        expected_amount_stroops, observed_amount_stroops, asset, event_ids, state, checks, checked_at, notes)
    values (p_plan, a.id, 'envelope_payout', p_position, v_hash, e ->> 'recipientAddress', e ->> 'expectedShareStroops',
        nullif(p_result ->> 'observedAmountStroops', ''), a.asset,
        coalesce(array(select jsonb_array_elements_text(p_result -> 'eventIds')), '{}'),
        v_state, coalesce(p_result -> 'checks', '{}'::jsonb), now(), p_result ->> 'note')
    on conflict (attempt_id, kind, (coalesce(envelope_position, -1))) where attempt_id is not null
    do update set tx_hash = excluded.tx_hash, observed_amount_stroops = excluded.observed_amount_stroops,
        event_ids = excluded.event_ids, state = excluded.state, checks = excluded.checks,
        checked_at = excluded.checked_at, notes = excluded.notes
      where public.payout_verifications.state <> 'verified' or excluded.state in ('mismatch','operator_review');
  exception when check_violation or invalid_text_representation then return public._fail('VALIDATION');
  end;

  select state into v_state from public.payout_verifications
   where attempt_id = a.id and kind = 'envelope_payout' and envelope_position = p_position;
  if v_state = 'verified' and v_was is distinct from 'verified' then
    perform public.append_evidence('envelope_payout_verified',
      jsonb_build_object('orgId', p.org_id, 'planId', p_plan), a.created_by,
      jsonb_build_object('attemptId', a.id, 'position', p_position, 'txHash', v_hash,
                         'amountStroops', e ->> 'expectedShareStroops', 'recipient', e ->> 'recipientAddress'),
      'Envelope payout verified');
  end if;

  select count(*) into v_total from public.budget_envelopes where version_id = a.plan_version_id;
  select count(*) filter (where state = 'verified'), count(*) filter (where state = 'mismatch')
    into v_verified, v_mismatch from public.payout_verifications
   where attempt_id = a.id and kind = 'envelope_payout';

  if v_mismatch > 0 then
    if public._set_plan_state(p_plan, array['payment_confirmed'], 'mismatch', a.created_by, 'envelope payout evidence mismatch') then
      perform public._open_review('plan', p_plan, 'An envelope payout does not match the expected recipient or amount');
    end if;
  elsif v_verified = v_total then
    perform public._set_plan_state(p_plan, array['payment_confirmed'], 'distribution_verified', a.created_by, 'every envelope payout verified');
  end if;

  select state into v_plan_state from public.budget_plans where id = p_plan;
  return jsonb_build_object('ok', true, 'value', jsonb_build_object(
    'state', v_state, 'planState', v_plan_state, 'verified', v_verified, 'total', v_total));
end $$;

-- ---------------------------------------------------------------------------
-- events, cursors, leases, poll budget
-- p_events: [{eventId,id,kind,topic,ledger,txHash,occurredAt,data}]
-- ---------------------------------------------------------------------------
create or replace function public.upsert_paiflow_events(p_deployment uuid, p_events jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if jsonb_typeof(p_events) <> 'array' then return public._fail('VALIDATION'); end if;
  begin
    with ins as (
      insert into public.paiflow_events(event_id, item_id, deployment_id, kind, topic, ledger, tx_hash, occurred_at, data)
      select x ->> 'eventId', x ->> 'id', p_deployment, x ->> 'kind', x ->> 'topic', (x ->> 'ledger')::bigint,
             lower(x ->> 'txHash'), (x ->> 'occurredAt')::timestamptz, x -> 'data'
        from jsonb_array_elements(p_events) x
      on conflict (event_id) do nothing returning 1)
    select count(*) into v_n from ins;
  exception when others then return public._fail('VALIDATION');
  end;
  return jsonb_build_object('ok', true, 'value', jsonb_build_object('inserted', v_n));
end $$;

create or replace function public.advance_event_cursor(p_deployment uuid, p_scope text, p_expected text, p_next text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_cnt int;
begin
  if p_expected is null then
    insert into public.event_cursors(deployment_id, scope, cursor) values (p_deployment, p_scope, p_next)
    on conflict (deployment_id, scope) do nothing;
    get diagnostics v_cnt = row_count;
  else
    update public.event_cursors set cursor = p_next, updated_at = now()
     where deployment_id = p_deployment and scope = p_scope and cursor is not distinct from p_expected;
    get diagnostics v_cnt = row_count;
  end if;
  return jsonb_build_object('ok', true, 'value', v_cnt > 0);   -- false = concurrent writer
end $$;

create or replace function public.acquire_reconcile_lease(p_key text, p_holder text, p_ttl_seconds int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_got text;
begin
  insert into public.reconcile_leases(key, holder, expires_at)
  values (p_key, p_holder, now() + make_interval(secs => greatest(1, least(p_ttl_seconds, 600))))
  on conflict (key) do update set holder = excluded.holder, expires_at = excluded.expires_at
    where public.reconcile_leases.expires_at <= now() or public.reconcile_leases.holder = excluded.holder
  returning holder into v_got;
  return jsonb_build_object('ok', true, 'value', v_got is not null);
end $$;

create or replace function public.release_reconcile_lease(p_key text, p_holder text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  delete from public.reconcile_leases where key = p_key and holder = p_holder;
  return jsonb_build_object('ok', true, 'value', '{}'::jsonb);
end $$;

create or replace function public.consume_reconcile_budget(p_scope_key text, p_limit int default 40)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.reconcile_budget;
begin
  insert into public.reconcile_budget(scope_key) values (p_scope_key) on conflict (scope_key) do nothing;
  select * into r from public.reconcile_budget where scope_key = p_scope_key for update;
  if now() - r.window_start >= interval '1 hour' then
    update public.reconcile_budget set window_start = now(), polls = 0 where scope_key = p_scope_key returning * into r;
  end if;
  if r.polls >= p_limit then
    return jsonb_build_object('ok', true, 'value', jsonb_build_object(
      'allowed', false,
      'retryAfterSeconds', greatest(1, ceil(extract(epoch from (r.window_start + interval '1 hour' - now())))::int)));
  end if;
  update public.reconcile_budget set polls = polls + 1 where scope_key = p_scope_key;
  return jsonb_build_object('ok', true, 'value', jsonb_build_object('allowed', true, 'retryAfterSeconds', 0));
end $$;

-- ---------------------------------------------------------------------------
-- operator reviews (REQ-DEP-01 / PRD §D.1)
-- ---------------------------------------------------------------------------
create or replace function public.open_operator_review(p_scope text, p_ref uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_scope not in ('payment_attempt','verification','plan','release_attempt','deal') or coalesce(p_reason, '') = '' then
    return public._fail('VALIDATION');
  end if;
  return jsonb_build_object('ok', true, 'value', jsonb_build_object('reviewId', public._open_review(p_scope, p_ref, p_reason)));
end $$;

create or replace function public.resolve_operator_review(
  p_review uuid, p_operator uuid, p_outcome text, p_justification text, p_evidence jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.operator_reviews; a public.payment_attempts; p public.budget_plans;
begin
  if not exists (select 1 from public.profiles where user_id = p_operator and is_operator) then
    return public._fail('OPERATOR_REQUIRED');
  end if;
  if coalesce(length(btrim(p_justification)), 0) = 0 then return public._fail('VALIDATION'); end if;
  select * into r from public.operator_reviews where id = p_review for update;
  if not found then return public._fail('NOT_FOUND'); end if;
  if r.resolved_at is not null then return public._fail('STATE_CONFLICT'); end if;

  if r.scope = 'payment_attempt' then
    a := public._lock_attempt(r.ref_id);
    select * into p from public.budget_plans where id = a.budget_plan_id;
    if p_outcome = 'payment_success_confirmed' then
      update public.payment_attempts set state = 'reconciled', resolution = p_outcome, final_status = 'SUCCESS' where id = a.id;
      perform public._set_plan_state(p.id, array['payment_pending','operator_review'], 'payment_confirmed', p_operator, 'operator: ' || p_outcome);
    elsif p_outcome in ('payment_failed_confirmed','not_broadcast_ledger_proven') then
      update public.payment_attempts set state = 'reconciled', resolution = p_outcome,
             final_status = case when p_outcome = 'payment_failed_confirmed' then 'FAILED' else final_status end where id = a.id;
      perform public._set_plan_state(p.id, array['payment_pending','operator_review'], 'approved', p_operator, 'operator: ' || p_outcome);
    elsif p_outcome <> 'no_action' then
      return public._fail('VALIDATION');
    end if;
  elsif p_outcome not in ('payout_confirmed','no_action') then
    return public._fail('VALIDATION');     -- other scopes: record only; plan/deal state is not changed here
  end if;

  update public.operator_reviews set resolved_at = now(), resolved_by = p_operator, outcome = p_outcome,
         justification = btrim(p_justification), evidence = p_evidence where id = p_review;
  perform public.append_evidence('operator_review',
    jsonb_build_object('orgId', p.org_id, 'planId', p.id), p_operator,
    jsonb_build_object('reviewId', p_review, 'scope', r.scope, 'outcome', p_outcome),
    'Operator review resolved');
  return jsonb_build_object('ok', true, 'value', '{}'::jsonb);
end $$;

-- ---------------------------------------------------------------------------
-- wallet summary reads (REQ-WAL-01). Verified totals count VERIFIED payouts only.
-- ---------------------------------------------------------------------------
create or replace function public.get_wallet_context(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare b public.wallet_bindings; v_plans jsonb; v_hist jsonb; v_recv numeric;
begin
  select * into b from public.wallet_bindings where user_id = p_user and revoked_at is null;

  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) into v_plans from (
    select distinct on (p.id) p.org_id as "orgId", p.id as "planId", v.purpose,
           case p.state when 'draft' then 'planned' when 'pending_approval' then 'planned' when 'approved' then 'approved'
             when 'payment_pending' then 'pending' when 'payment_confirmed' then 'pending'
             when 'distribution_verified' then 'verified_distribution' when 'mismatch' then 'needs_review'
             when 'operator_review' then 'needs_review' else 'closed' end as "dashboardState",
           case when v.signer_user_id = p_user then 'signer'
                when m.role = 'owner' then 'owner' when m.role = 'approver' then 'approver'
                else 'envelope_recipient' end as role
      from public.budget_plans p
      join public.budget_plan_versions v on v.id = p.current_version_id
      left join public.org_memberships m on m.org_id = p.org_id and m.user_id = p_user
     where m.user_id is not null or v.signer_user_id = p_user
        or (b.address is not null and exists (select 1 from public.budget_envelopes e
                                               where e.version_id = v.id and e.recipient_address = b.address))
     order by p.id, p.created_at desc
  ) x;

  select coalesce(jsonb_agg(h order by h ->> 'at' desc), '[]'::jsonb) into v_hist from (
    select jsonb_build_object('kind', 'budget_payment', 'refId', a.budget_plan_id, 'amountStroops', a.amount_stroops,
             'stellarTxHash', a.original_tx_hash,
             'verification', coalesce((select pv.state from public.payout_verifications pv
                                        where pv.attempt_id = a.id and pv.kind = 'payment_receipt'), 'awaiting_tx_final'),
             'at', a.updated_at) as h
      from public.payment_attempts a
     where a.budget_plan_id is not null and a.state = 'success' and a.original_tx_hash is not null
       and (a.created_by = p_user or (b.address is not null and a.from_address = b.address))
    union all
    select jsonb_build_object('kind', 'envelope_payout', 'refId', pv.budget_plan_id,
             'amountStroops', pv.expected_amount_stroops, 'stellarTxHash', pv.tx_hash,
             'verification', pv.state, 'at', coalesce(pv.checked_at, pv.created_at))
      from public.payout_verifications pv
     where b.address is not null and pv.kind = 'envelope_payout' and pv.expected_recipient = b.address
       and pv.tx_hash is not null
  ) q;

  select coalesce(sum(observed_amount_stroops::numeric), 0) into v_recv
    from public.payout_verifications
   where b.address is not null and kind = 'envelope_payout' and state = 'verified' and expected_recipient = b.address;

  return jsonb_build_object(
    'binding', case when b.id is null then null else jsonb_build_object('address', b.address, 'verifiedAt', b.verified_at) end,
    'plans', v_plans, 'escrow', '[]'::jsonb, 'history', v_hist,
    'verifiedTotals', jsonb_build_object('receivedStroops', trunc(v_recv)::text, 'refundedStroops', '0'));
end $$;

-- ---------------------------------------------------------------------------
-- grants: service_role only
-- ---------------------------------------------------------------------------
revoke all on function
  public._expected_shares(uuid), public._plan_context(uuid,uuid), public._lock_attempt(uuid),
  public._open_review(text,uuid,text), public._set_plan_state(uuid,text[],text,uuid,text),
  public._normalise_verification(jsonb,public.payment_attempts,text,text),
  public.get_payment_context(uuid,uuid), public.begin_payment_attempt(uuid,uuid),
  public.record_preparation(uuid,text,text,text,text,text,timestamptz,text),
  public.fail_preparation(uuid,text,text), public.mark_signature_requested(uuid),
  public.persist_signed_envelope(uuid,uuid,text,text,boolean),
  public.record_envelope_rejection(uuid,uuid,text,text), public.record_submission(uuid,text,jsonb),
  public.record_status_check(uuid,text,boolean,jsonb), public.mark_expired_unsigned(uuid),
  public.record_payment_receipt_verification(uuid,jsonb),
  public.record_envelope_payout_verification(uuid,uuid,int,jsonb),
  public.upsert_paiflow_events(uuid,jsonb), public.advance_event_cursor(uuid,text,text,text),
  public.acquire_reconcile_lease(text,text,int), public.release_reconcile_lease(text,text),
  public.consume_reconcile_budget(text,int), public.open_operator_review(text,uuid,text),
  public.resolve_operator_review(uuid,uuid,text,text,jsonb), public.get_wallet_context(uuid)
  from public, anon, authenticated;
grant execute on function
  public._expected_shares(uuid), public._plan_context(uuid,uuid), public._lock_attempt(uuid),
  public._open_review(text,uuid,text), public._set_plan_state(uuid,text[],text,uuid,text),
  public._normalise_verification(jsonb,public.payment_attempts,text,text),
  public.get_payment_context(uuid,uuid), public.begin_payment_attempt(uuid,uuid),
  public.record_preparation(uuid,text,text,text,text,text,timestamptz,text),
  public.fail_preparation(uuid,text,text), public.mark_signature_requested(uuid),
  public.persist_signed_envelope(uuid,uuid,text,text,boolean),
  public.record_envelope_rejection(uuid,uuid,text,text), public.record_submission(uuid,text,jsonb),
  public.record_status_check(uuid,text,boolean,jsonb), public.mark_expired_unsigned(uuid),
  public.record_payment_receipt_verification(uuid,jsonb),
  public.record_envelope_payout_verification(uuid,uuid,int,jsonb),
  public.upsert_paiflow_events(uuid,jsonb), public.advance_event_cursor(uuid,text,text,text),
  public.acquire_reconcile_lease(text,text,int), public.release_reconcile_lease(text,text),
  public.consume_reconcile_budget(text,int), public.open_operator_review(text,uuid,text),
  public.resolve_operator_review(uuid,uuid,text,text,jsonb), public.get_wallet_context(uuid)
  to service_role;
