// Plan reads and the BudgetPlanDetailDTO assembler (F-14 reads, F-17). The Supabase client is injected (testable).
// The browser only ever sees §3.8 browser-visible fields: no XDR, request IDs or storage keys are selected or mapped.
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AssetRef, BudgetPlanDetailDTO, BudgetPlanSummaryDTO, CreatePlanInput, EnvelopeDTO, PaymentAttemptViewDTO,
  PlanApprovalDTO, SplitDeploymentDTO, TimelineEntryDTO, VerificationDTO, ViewerRole,
} from '@/contracts/dto';
import { splitShares } from '@/contracts/split';
import { toDashboardState, type AuditActionType, type PaymentAttemptState, type PlanAction, type PlanState } from '@/contracts/states';
import { HttpError } from '@/server/http/respond';

type Row = Record<string, unknown>;

async function rows(q: PromiseLike<{ data: unknown; error: { code?: string } | null }>, label: string): Promise<Row[]> {
  const { data, error } = await q;
  if (error) {
    console.error('[db] read error', label, error.code ?? 'unknown');
    throw new HttpError('INTERNAL');
  }
  return (data ?? []) as Row[];
}

const NATIVE: AssetRef = { kind: 'native' };
// Never select prepared_xdr / signed_xdr / request IDs here. signed_body_hash is set together with signed_xdr.
const ATTEMPT_VIEW_COLUMNS = 'id, state, original_tx_hash, expires_at, updated_at, final_status, ledger, signed_body_hash, last_checked_at, created_at';
const OPEN_UNRESOLVED: PaymentAttemptState[] = ['signed_persisted', 'submitted', 'pending', 'unknown', 'rejected'];

// ---------------------------------------------------------------------------
// Allowed actions (§3.2). The server computes these so the UI never re-implements the state machine.
// ---------------------------------------------------------------------------
export interface ActionContext {
  state: PlanState;
  viewerRoles: ViewerRole[];
  viewerApprovalPending: boolean;
  viewerBindingMatchesSigner: boolean;
  anyAttemptEver: boolean;
  attempt: { state: PaymentAttemptState; expired: boolean; hasSignedEnvelope: boolean; finalStatus: string | null } | null;
  approved: number;
  required: number;
}

export function computeAllowedActions(c: ActionContext): PlanAction[] {
  const isMember = c.viewerRoles.some((r) => r === 'owner' || r === 'approver' || r === 'member');
  const isOwner = c.viewerRoles.includes('owner');
  const isSigner = c.viewerRoles.includes('signer');
  const out: PlanAction[] = [];
  const a = c.attempt;
  const nonTerminalAttempt = !!a && !['success', 'failed', 'prepare_failed', 'reconciled'].includes(a.state);

  if (c.state === 'pending_approval' && c.viewerApprovalPending) out.push('approve', 'reject');
  if (isOwner && !c.anyAttemptEver && ['draft', 'pending_approval', 'approved', 'rejected'].includes(c.state)) out.push('edit_plan');
  if (isSigner && c.state === 'approved' && c.viewerBindingMatchesSigner && !nonTerminalAttempt) out.push('pay');
  if (isSigner && c.state === 'pending_approval') out.push('pay_blocked_until_approved');
  if (isSigner && a && (a.state === 'prepared' || a.state === 'signing') && !a.expired && !a.hasSignedEnvelope) out.push('continue_payment');
  if (isMember && a) {
    const unresolvedStatus = ['submitted', 'pending', 'unknown', 'rejected', 'expired_unsigned'].includes(a.state);
    const signedNoFinal = a.hasSignedEnvelope && a.finalStatus !== 'SUCCESS' && a.finalStatus !== 'FAILED';
    if (unresolvedStatus || signedNoFinal) out.push('check_payment');
  }
  if (isSigner && a && a.hasSignedEnvelope && OPEN_UNRESOLVED.includes(a.state) && a.finalStatus !== 'SUCCESS' && a.finalStatus !== 'FAILED') {
    out.push('resubmit_same_envelope');
  }
  if (isMember && (c.state === 'payment_pending' || c.state === 'payment_confirmed')) out.push('refresh_evidence');
  if (isMember) out.push('verify_file');
  return out;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------
function verificationOf(r: Row): VerificationDTO {
  return {
    kind: r.kind as VerificationDTO['kind'],
    state: r.state as VerificationDTO['state'],
    stellarTxHash: (r.tx_hash ?? null) as string | null,
    expectedAddress: r.expected_recipient as string,
    expectedAmountStroops: r.expected_amount_stroops as string,
    observedAmountStroops: (r.observed_amount_stroops ?? null) as string | null,
    eventIds: (r.event_ids ?? []) as string[],
    checkedAt: (r.checked_at ?? null) as string | null,
    note: (r.notes ?? null) as string | null,
  };
}

function attemptViewOf(r: Row): PaymentAttemptViewDTO {
  const state = r.state as PaymentAttemptState;
  return {
    attemptId: r.id as string,
    state,
    originalTxHash: (r.original_tx_hash ?? null) as string | null,
    expiresAt: (r.expires_at ?? null) as string | null,
    // No dedicated column: the last update of a submitted-or-later attempt is the best honest timestamp.
    submittedAt: ['submitted', 'success', 'failed', 'pending', 'unknown', 'rejected'].includes(state) ? (r.updated_at as string) : null,
    finalStatus: (r.final_status ?? null) as PaymentAttemptViewDTO['finalStatus'],
    ledger: r.ledger === null || r.ledger === undefined ? null : Number(r.ledger),
    hasSignedEnvelope: r.signed_body_hash !== null && r.signed_body_hash !== undefined,
    lastCheckedAt: (r.last_checked_at ?? null) as string | null,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export async function listPlanSummaries(db: SupabaseClient, orgId: string): Promise<BudgetPlanSummaryDTO[]> {
  const plans = await rows(db.from('budget_plans').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(100), 'plans');
  if (plans.length === 0) return [];
  const versionIds = plans.map((p) => p.current_version_id as string);
  const versions = await rows(db.from('budget_plan_versions').select('*').in('id', versionIds), 'versions');
  const approvals = await rows(db.from('budget_approvals').select('version_id, decision').in('version_id', versionIds), 'approvals');
  const vById = new Map(versions.map((v) => [v.id as string, v]));
  return plans.map((p) => {
    const v = vById.get(p.current_version_id as string) as Row;
    const mine = approvals.filter((a) => a.version_id === p.current_version_id);
    const state = p.state as PlanState;
    return {
      planId: p.id as string,
      orgId: p.org_id as string,
      version: v.version as number,
      purpose: v.purpose as string,
      state,
      dashboardState: toDashboardState(state),
      totalStroops: v.total_stroops as string,
      asset: NATIVE,
      approvals: { approved: mine.filter((a) => a.decision === 'approved').length, required: mine.length },
      updatedAt: p.updated_at as string,
    };
  });
}

export async function getPlanDetail(
  db: SupabaseClient, orgId: string, planId: string, viewer: { userId: string; isOperator: boolean },
): Promise<BudgetPlanDetailDTO> {
  const plan = (await rows(db.from('budget_plans').select('*').eq('id', planId).eq('org_id', orgId).limit(1), 'plan'))[0];
  if (!plan) throw new HttpError('NOT_FOUND');
  const versionId = plan.current_version_id as string;

  const [versions, envRows, approvalRows, attempts, members, bindings] = await Promise.all([
    rows(db.from('budget_plan_versions').select('*').eq('plan_id', planId).order('version', { ascending: false }), 'versions'),
    rows(db.from('budget_envelopes').select('*').eq('version_id', versionId).order('position', { ascending: true }), 'envelopes'),
    rows(db.from('budget_approvals').select('*').eq('version_id', versionId), 'approvals'),
    rows(db.from('payment_attempts').select(ATTEMPT_VIEW_COLUMNS).eq('budget_plan_id', planId).order('created_at', { ascending: false }).limit(5), 'attempts'),
    rows(db.from('org_memberships').select('user_id, role').eq('org_id', orgId), 'members'),
    rows(db.from('wallet_bindings').select('address').eq('user_id', viewer.userId).is('revoked_at', null).limit(1), 'binding'),
  ]);
  const version = versions.find((v) => v.id === versionId);
  if (!version) throw new HttpError('INTERNAL');

  const userIds = [...new Set([...approvalRows.map((a) => a.approver_user_id as string), version.signer_user_id as string])];
  const profiles = await rows(db.from('profiles').select('user_id, display_name').in('user_id', userIds), 'profiles');
  const nameOf = new Map(profiles.map((p) => [p.user_id as string, p.display_name as string]));

  // latest attempt and its verifications
  const attempt = attempts[0] ?? null;
  const verifs = attempt
    ? await rows(db.from('payout_verifications').select('*').eq('attempt_id', attempt.id as string), 'verifications')
    : [];

  const shares = splitShares(version.total_stroops as string, envRows.map((e) => ({ position: e.position as number, bps: e.bps as number })));
  const envelopes: EnvelopeDTO[] = envRows.map((e, i) => {
    const v = verifs.find((x) => x.kind === 'envelope_payout' && x.envelope_position === e.position);
    return {
      position: e.position as number,
      label: e.label as string,
      bps: e.bps as number,
      recipientAddress: e.recipient_address as string,
      expectedShareStroops: shares[i].shareStroops,
      planningPhpCentavos: e.planning_php_centavos === null || e.planning_php_centavos === undefined ? null : String(e.planning_php_centavos),
      payout: v ? verificationOf(v) : null,
    };
  });

  const approvalsDetail: PlanApprovalDTO[] = approvalRows.map((a) => ({
    approverName: nameOf.get(a.approver_user_id as string) ?? 'Approver',
    isViewer: a.approver_user_id === viewer.userId,
    decision: a.decision as PlanApprovalDTO['decision'],
    decidedAt: (a.responded_at ?? null) as string | null,
    reason: (a.reason ?? null) as string | null,
  }));
  const approved = approvalRows.filter((a) => a.decision === 'approved').length;

  const membership = members.find((m) => m.user_id === viewer.userId);
  const viewerRoles: ViewerRole[] = [];
  if (membership) viewerRoles.push(membership.role as ViewerRole);
  if (version.signer_user_id === viewer.userId) viewerRoles.push('signer');
  if (viewer.isOperator) viewerRoles.push('operator');

  const state = plan.state as PlanState;
  const attemptView = attempt ? attemptViewOf(attempt) : null;
  const viewerAddress = (bindings[0]?.address ?? null) as string | null;
  const serverTime = new Date().toISOString();

  const allowedActions = computeAllowedActions({
    state,
    viewerRoles,
    viewerApprovalPending: approvalRows.some((a) => a.approver_user_id === viewer.userId && a.decision === 'pending'),
    viewerBindingMatchesSigner: viewerAddress !== null && viewerAddress === version.signer_address,
    anyAttemptEver: attempts.length > 0,
    attempt: attempt
      ? {
          state: attempt.state as PaymentAttemptState,
          expired: !!attempt.expires_at && new Date(attempt.expires_at as string).getTime() <= Date.now(),
          hasSignedEnvelope: attemptView!.hasSignedEnvelope,
          finalStatus: (attempt.final_status ?? null) as string | null,
        }
      : null,
    approved,
    required: approvalRows.length,
  });

  const timeline = await buildTimeline(db, orgId, planId, members);
  const receipt = verifs.find((x) => x.kind === 'payment_receipt');
  const verifiedCount = envelopes.filter((e) => e.payout?.state === 'verified').length;

  return {
    planId,
    orgId,
    version: version.version as number,
    purpose: version.purpose as string,
    state,
    dashboardState: toDashboardState(state),
    totalStroops: version.total_stroops as string,
    asset: NATIVE,
    approvals: { approved, required: approvalRows.length },
    updatedAt: plan.updated_at as string,
    versionId,
    planSha256: version.plan_sha256 as string,
    ledgerBlockId: timeline.find((t) => t.kind === 'plan_create' && t.sha256 === version.plan_sha256)?.ledgerBlockId ?? null,
    deployment: { id: plan.deployment_id as string, network: 'testnet', asset: NATIVE },
    signer: { displayName: nameOf.get(version.signer_user_id as string) ?? 'Signer', address: version.signer_address as string },
    envelopes,
    approvalsDetail,
    payment: attemptView,
    paymentReceipt: receipt ? verificationOf(receipt) : null,
    payoutsVerified: { verified: verifiedCount, total: envelopes.length },
    versions: versions.map((v) => ({
      versionId: v.id as string, version: v.version as number, planSha256: v.plan_sha256 as string,
      createdAt: v.created_at as string, superseded: v.superseded_at !== null && v.superseded_at !== undefined,
    })),
    timeline,
    viewerRoles,
    allowedActions,
    serverTime,
  };
}

async function buildTimeline(db: SupabaseClient, orgId: string, planId: string, members: Row[]): Promise<TimelineEntryDTO[]> {
  const tx = await rows(
    db.from('transactions').select('action_type, description, tx_hash, metadata, created_at, actor_user_id, hash_input')
      .eq('plan_id', planId).order('created_at', { ascending: true }).limit(200),
    'timeline',
  );
  const roleOf = new Map(members.map((m) => [m.user_id as string, m.role as string]));
  return tx.map((t) => {
    const meta = (t.metadata ?? {}) as Record<string, unknown>;
    const hi = (t.hash_input ?? {}) as Record<string, unknown>;
    const entry: TimelineEntryDTO = {
      at: t.created_at as string,
      kind: t.action_type as AuditActionType,
      actorRole: roleOf.get(t.actor_user_id as string) ?? 'operator',
      summary: t.description as string,
      auditHash: t.tx_hash as string, // a CYFER audit hash, never labelled as a Stellar hash
    };
    if (typeof meta.planSha256 === 'string') entry.sha256 = meta.planSha256;
    if (typeof meta.originalTxHash === 'string') entry.stellarTxHash = meta.originalTxHash;
    if (typeof hi.ledgerBlockId === 'number') entry.ledgerBlockId = hi.ledgerBlockId;
    return entry;
  });
}

// ---------------------------------------------------------------------------
// Deployment lookups (never taken from browser input, D-12 / REQ-DEP-01 AC4)
// ---------------------------------------------------------------------------
export function projectRecipients(list: { position: number; address?: string; recipientAddress?: string; bps: number }[]): string {
  return JSON.stringify([...list].sort((a, b) => a.position - b.position).map((e) => [e.position, e.address ?? e.recipientAddress, e.bps]));
}

async function availableSplitDeployments(db: SupabaseClient): Promise<Row[]> {
  return rows(
    db.from('paiflow_deployments').select('*').eq('template', 'budget_split').eq('status', 'available').eq('network', 'testnet'),
    'deployments',
  );
}

const toSplitDto = (d: Row): SplitDeploymentDTO => ({
  deploymentId: d.id as string,
  network: 'testnet',
  asset: d.input_asset as AssetRef,
  recipients: d.split_recipients as SplitDeploymentDTO['recipients'],
  status: d.status as 'available' | 'reserved',
});

/** The one available Split deployment, or NO_SPLIT_DEPLOYMENT / AMBIGUOUS_DEPLOYMENT_MATCH. */
export async function getSplitDeployment(db: SupabaseClient): Promise<SplitDeploymentDTO> {
  const list = await availableSplitDeployments(db);
  if (list.length === 0) throw new HttpError('NO_SPLIT_DEPLOYMENT');
  if (list.length > 1) throw new HttpError('AMBIGUOUS_DEPLOYMENT_MATCH');
  return toSplitDto(list[0]);
}

/** Facts the canonical plan needs, derived server-side from the registry and bindings. */
export async function resolvePlanFacts(db: SupabaseClient, orgId: string, input: CreatePlanInput, existingDeploymentId?: string) {
  let deploymentId = existingDeploymentId;
  if (!deploymentId) {
    const list = await availableSplitDeployments(db);
    if (list.length === 0) throw new HttpError('NO_SPLIT_DEPLOYMENT');
    const want = projectRecipients(input.envelopes.map((e) => ({ position: e.position, address: e.recipientAddress, bps: e.bps })));
    const matches = list.filter((d) => projectRecipients(d.split_recipients as { position: number; address: string; bps: number }[]) === want);
    if (matches.length === 0) throw new HttpError('ENVELOPES_MISMATCH_DEPLOYMENT');
    if (matches.length > 1) throw new HttpError('AMBIGUOUS_DEPLOYMENT_MATCH');
    deploymentId = matches[0].id as string;
  }

  const binding = (await rows(db.from('wallet_bindings').select('address').eq('user_id', input.signerUserId).is('revoked_at', null).limit(1), 'binding'))[0];
  if (!binding) throw new HttpError('WALLET_MISMATCH', 'The signer has no verified wallet binding.');

  let attachmentSha256: string[] = [];
  if (input.attachmentDocumentIds?.length) {
    const docs = await rows(db.from('org_documents').select('id, sha256').eq('org_id', orgId).in('id', input.attachmentDocumentIds), 'attachments');
    if (docs.length !== input.attachmentDocumentIds.length) throw new HttpError('VALIDATION', undefined, { fields: { attachmentDocumentIds: 'An attachment does not belong to this organisation.' } });
    attachmentSha256 = docs.map((d) => d.sha256 as string);
  }
  return { deploymentId, signerAddress: binding.address as string, attachmentSha256 };
}

export async function getPlanDeploymentId(db: SupabaseClient, orgId: string, planId: string): Promise<string> {
  const p = (await rows(db.from('budget_plans').select('deployment_id').eq('id', planId).eq('org_id', orgId).limit(1), 'plan'))[0];
  if (!p) throw new HttpError('NOT_FOUND');
  return p.deployment_id as string;
}
