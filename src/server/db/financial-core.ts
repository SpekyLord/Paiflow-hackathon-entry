// Persistence interface Francis -> Carlos (FRANCIS-PHASETASK §3.6, MVP part). Every function wraps exactly ONE
// Postgres function (supabase/migrations/009) or one read. No I/O is created here: the Supabase client is injected,
// so the logic is testable with a fake. The server-only binding lives in ./financial.ts.
//
// Rules: domain conflicts return {ok:false, code} and never throw; nothing here logs arguments (they may hold XDR).
// SHOULD-tier functions (releases, refunds, deals) are intentionally absent: their signatures stay frozen in §3.6 for F-31.

import type { SupabaseClient } from '@supabase/supabase-js';
import { ERROR_HTTP_STATUS, type DbResult, type ErrorCode } from '@/contracts/errors';
import type {
  AssetRef,
  DeploymentRegistryEntryDTO,
  GAddress,
  IsoUtc,
  OperatorReviewDTO,
  WalletSummaryDTO,
} from '@/contracts/dto';
import type { PaymentAttemptState, VerificationState } from '@/contracts/states';

export type { DbResult };

export type PayScope = { kind: 'plan'; planId: string }; // { kind: 'deal'; dealId } is SHOULD (F-31)

export interface PaymentContext {
  scope: PayScope;
  orgId: string;
  state: string;
  versionId: string;
  planSha256: string;
  deploymentId: string;
  signerAddress: GAddress;
  signerUserId: string;
  totalStroops: string;
  asset: AssetRef;
  envelopes: { position: number; label: string; bps: number; recipientAddress: GAddress; expectedShareStroops: string }[];
  viewerBinding: { address: GAddress; verifiedAt: IsoUtc } | null;
}

/** Server-only row. Contains XDR: never return it to the browser. */
export interface PaymentAttemptRow {
  id: string;
  budgetPlanId: string | null;
  planVersionId: string | null;
  deploymentId: string;
  fromAddress: GAddress;
  amountStroops: string;
  asset: AssetRef;
  network: 'testnet' | null;
  networkPassphrase: string | null;
  preparedXdr: string | null;
  originalTxHash: string | null;
  historyRequestId: string | null;
  expiresAt: IsoUtc | null;
  feeStroops: string | null;
  signatureRequestedAt: IsoUtc | null;
  signedXdr: string | null;
  signedBodyHash: string | null;
  submitStatus: string | null;
  submitOutcome: Record<string, unknown> | null;
  finalStatus: 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNKNOWN' | 'REJECTED' | 'NOT_FOUND' | null;
  ledger: number | null;
  lastRequestId: string | null;
  lastCheckedAt: IsoUtc | null;
  state: PaymentAttemptState;
  resolution: string | null;
  createdBy: string;
  createdAt: IsoUtc;
  updatedAt: IsoUtc;
}

export interface VerificationInput {
  state: VerificationState;
  stellarTxHash: string | null;
  expectedAddress: GAddress;
  expectedAmountStroops: string;
  observedAmountStroops: string | null;
  asset: AssetRef;
  eventIds: string[];
  checks: Record<
    'finality' | 'originalHash' | 'deployment' | 'network' | 'event' | 'party' | 'asset' | 'amount' | 'direction',
    'pass' | 'fail' | 'pending'
  >;
  note: string | null;
}

export interface PaiflowEventRecord {
  eventId: string;
  id: string;
  kind: string;
  topic: string | null;
  ledger: number;
  txHash: string;
  occurredAt: IsoUtc;
  data: unknown | null;
}

export type StatusLookup =
  | { kind: 'found'; status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNKNOWN' | 'REJECTED'; txHash: string; network: string; ledger: number | null }
  | { kind: 'not_found' }
  | { kind: 'transport_error'; httpStatus: number | null; code: string };

export type SubmissionOutcome =
  | { kind: 'response'; status: 'SUCCESS' | 'PENDING' | 'FAILED'; txHash: string; ledger: number | null; errorCode: string | null }
  | { kind: 'transport_error'; httpStatus: number | null; code: string };

export type ReviewResolution =
  | 'payment_success_confirmed'
  | 'payment_failed_confirmed'
  | 'not_broadcast_ledger_proven'
  | 'payout_confirmed'
  | 'refund_confirmed'
  | 'release_retry_authorised'
  | 'no_action';

type Json = unknown;
type Row = Record<string, unknown>;

const KNOWN_CODES = new Set<string>(Object.keys(ERROR_HTTP_STATUS));
const isCode = (v: unknown): v is ErrorCode => typeof v === 'string' && KNOWN_CODES.has(v);

function mapAttempt(r: Row): PaymentAttemptRow {
  return {
    id: r.id as string,
    budgetPlanId: (r.budget_plan_id ?? null) as string | null,
    planVersionId: (r.plan_version_id ?? null) as string | null,
    deploymentId: r.deployment_id as string,
    fromAddress: r.from_address as GAddress,
    amountStroops: r.amount_stroops as string,
    asset: r.asset as AssetRef,
    network: (r.network ?? null) as 'testnet' | null,
    networkPassphrase: (r.network_passphrase ?? null) as string | null,
    preparedXdr: (r.prepared_xdr ?? null) as string | null,
    originalTxHash: (r.original_tx_hash ?? null) as string | null,
    historyRequestId: (r.history_request_id ?? null) as string | null,
    expiresAt: (r.expires_at ?? null) as IsoUtc | null,
    feeStroops: (r.fee_stroops ?? null) as string | null,
    signatureRequestedAt: (r.signature_requested_at ?? null) as IsoUtc | null,
    signedXdr: (r.signed_xdr ?? null) as string | null,
    signedBodyHash: (r.signed_body_hash ?? null) as string | null,
    submitStatus: (r.submit_status ?? null) as string | null,
    submitOutcome: (r.submit_outcome ?? null) as Record<string, unknown> | null,
    finalStatus: (r.final_status ?? null) as PaymentAttemptRow['finalStatus'],
    ledger: r.ledger === null || r.ledger === undefined ? null : Number(r.ledger),
    lastRequestId: (r.last_request_id ?? null) as string | null,
    lastCheckedAt: (r.last_checked_at ?? null) as IsoUtc | null,
    state: r.state as PaymentAttemptState,
    resolution: (r.resolution ?? null) as string | null,
    createdBy: r.created_by as string,
    createdAt: r.created_at as IsoUtc,
    updatedAt: r.updated_at as IsoUtc,
  };
}

function mapDeployment(r: Row): DeploymentRegistryEntryDTO {
  return {
    deploymentId: r.id as string,
    template: r.template as string,
    network: 'testnet',
    asset: r.input_asset as AssetRef,
    graphSnapshotSha256: r.graph_snapshot_sha256 as string,
    splitRecipients: (r.split_recipients ?? null) as DeploymentRegistryEntryDTO['splitRecipients'],
    conditionNodeId: (r.condition_node_id ?? null) as string | null,
    deadlineAt: (r.deadline_at ?? null) as IsoUtc | null,
    sellerAddress: (r.seller_address ?? null) as GAddress | null,
    buyerAddress: (r.buyer_address ?? null) as GAddress | null,
    status: r.status as DeploymentRegistryEntryDTO['status'],
    registeredAt: r.registered_at as IsoUtc,
  };
}

function mapReview(r: Row): OperatorReviewDTO {
  return {
    reviewId: r.id as string,
    scope: r.scope as OperatorReviewDTO['scope'],
    refId: r.ref_id as string,
    reason: r.reason as string,
    openedAt: r.opened_at as IsoUtc,
    resolvedAt: (r.resolved_at ?? null) as IsoUtc | null,
    outcome: (r.outcome ?? null) as string | null,
  };
}

export function createFinancialDb(client: SupabaseClient) {
  /** Call one RPC. Returns DbResult; never throws; never logs arguments. */
  async function rpc<T>(fn: string, args: Record<string, Json>): Promise<DbResult<T>> {
    let res: { data: unknown; error: { code?: string } | null };
    try {
      res = (await client.rpc(fn, args)) as typeof res;
    } catch {
      console.error('[db] rpc threw', fn);
      return { ok: false, code: 'INTERNAL' };
    }
    if (res.error) {
      console.error('[db] rpc error', fn, res.error.code ?? 'unknown');
      return { ok: false, code: 'INTERNAL' };
    }
    const body = res.data as { ok?: boolean; value?: T; code?: unknown } | null;
    if (body && body.ok === true) return { ok: true, value: body.value as T };
    if (body && body.ok === false && isCode(body.code)) return { ok: false, code: body.code };
    return { ok: false, code: 'INTERNAL' };
  }

  async function read<T>(label: string, run: () => PromiseLike<{ data: T | null; error: { code?: string } | null }>): Promise<T | null> {
    try {
      const { data, error } = await run();
      if (error) {
        console.error('[db] read error', label, error.code ?? 'unknown');
        return null;
      }
      return data;
    } catch {
      console.error('[db] read threw', label);
      return null;
    }
  }

  const mapResult = <A, B>(r: DbResult<A>, f: (a: A) => B): DbResult<B> => (r.ok ? { ok: true, value: f(r.value) } : r);
  const planId = (s: PayScope) => s.planId;
  const attemptOf = (r: DbResult<Row>) => mapResult(r, mapAttempt);

  return {
    // ---- context reads (server-only rows; may include XDR) ----
    getPaymentContext: (scope: PayScope, actorUserId: string) =>
      rpc<PaymentContext>('get_payment_context', { p_plan: planId(scope), p_actor: actorUserId }),

    async getOpenAttempt(scope: PayScope): Promise<PaymentAttemptRow | null> {
      const data = await read<Row[]>('getOpenAttempt', () =>
        client
          .from('payment_attempts')
          .select('*')
          .eq('budget_plan_id', planId(scope))
          .not('state', 'in', '(success,failed,prepare_failed,reconciled)')
          .limit(1),
      );
      return data && data.length > 0 ? mapAttempt(data[0]) : null;
    },

    /** CR (Carlos, C-12): newest attempt for the plan, terminal or not, so reconciliation can find a paid attempt. */
    async getLatestAttempt(scope: PayScope): Promise<PaymentAttemptRow | null> {
      const data = await read<Row[]>('getLatestAttempt', () =>
        client
          .from('payment_attempts')
          .select('*')
          .eq('budget_plan_id', planId(scope))
          .order('created_at', { ascending: false })
          .limit(1),
      );
      return data && data.length > 0 ? mapAttempt(data[0]) : null;
    },

    async getAttempt(attemptId: string): Promise<PaymentAttemptRow | null> {
      const data = await read<Row[]>('getAttempt', () => client.from('payment_attempts').select('*').eq('id', attemptId).limit(1));
      return data && data.length > 0 ? mapAttempt(data[0]) : null;
    },

    async listScopesNeedingReconciliation(limit: number): Promise<{ scope: PayScope; deploymentId: string }[]> {
      const data = await read<{ id: string; deployment_id: string }[]>('listScopesNeedingReconciliation', () =>
        client
          .from('budget_plans')
          .select('id, deployment_id')
          .in('state', ['payment_pending', 'payment_confirmed'])
          .order('updated_at', { ascending: true })
          .limit(Math.max(1, Math.min(limit, 100))),
      );
      return (data ?? []).map((r) => ({ scope: { kind: 'plan' as const, planId: r.id }, deploymentId: r.deployment_id }));
    },

    // ---- payment attempt lifecycle (PRD §F.2) ----
    async beginPaymentAttempt(i: { scope: PayScope; actorUserId: string }) {
      const r = await rpc<{ outcome: 'created' | 'existing'; attempt: Row; context: PaymentContext }>('begin_payment_attempt', {
        p_plan: planId(i.scope),
        p_actor: i.actorUserId,
      });
      return mapResult(r, (v) => ({ outcome: v.outcome, attempt: mapAttempt(v.attempt), context: v.context }));
    },

    recordPreparation: async (i: {
      attemptId: string; network: 'testnet'; networkPassphrase: string; preparedXdr: string; originalTxHash: string;
      historyRequestId: string | null; expiresAt: IsoUtc; feeStroops: string | null;
    }) =>
      attemptOf(
        await rpc<Row>('record_preparation', {
          p_attempt: i.attemptId, p_network: i.network, p_passphrase: i.networkPassphrase, p_xdr: i.preparedXdr,
          p_hash: i.originalTxHash, p_history_request_id: i.historyRequestId, p_expires_at: i.expiresAt, p_fee: i.feeStroops,
        }),
      ),

    failPreparation: (i: { attemptId: string; code: string; requestId: string | null }) =>
      rpc<Record<string, never>>('fail_preparation', { p_attempt: i.attemptId, p_code: i.code, p_request_id: i.requestId }),

    markSignatureRequested: (attemptId: string) => rpc<Record<string, never>>('mark_signature_requested', { p_attempt: attemptId }),

    persistSignedEnvelope: async (i: {
      attemptId: string; actorUserId: string; signedXdr: string; signedBodyHash: string; receivedAfterExpiry: boolean;
    }) =>
      attemptOf(
        await rpc<Row>('persist_signed_envelope', {
          p_attempt: i.attemptId, p_actor: i.actorUserId, p_signed_xdr: i.signedXdr,
          p_body_hash: i.signedBodyHash, p_after_expiry: i.receivedAfterExpiry,
        }),
      ),

    recordEnvelopeRejection: (i: {
      attemptId: string; actorUserId: string; signedXdr: string; reason: 'BODY_CHANGED' | 'FEE_BUMP' | 'WRONG_SIGNER' | 'UNPARSEABLE';
    }) =>
      rpc<Record<string, never>>('record_envelope_rejection', {
        p_attempt: i.attemptId, p_actor: i.actorUserId, p_signed_xdr: i.signedXdr, p_reason: i.reason,
      }),

    recordSubmission: async (i: { attemptId: string; requestId: string | null; outcome: SubmissionOutcome }) =>
      attemptOf(await rpc<Row>('record_submission', { p_attempt: i.attemptId, p_request_id: i.requestId, p_outcome: i.outcome })),

    recordStatusCheck: async (i: { attemptId: string; requestId: string | null; checksExhausted: boolean; lookup: StatusLookup }) =>
      attemptOf(
        await rpc<Row>('record_status_check', {
          p_attempt: i.attemptId, p_request_id: i.requestId, p_checks_exhausted: i.checksExhausted, p_lookup: i.lookup,
        }),
      ),

    markExpiredUnsigned: (attemptId: string) => rpc<Record<string, never>>('mark_expired_unsigned', { p_attempt: attemptId }),

    // ---- evidence, events, verification (PRD §H, §G.6) ----
    recordPaymentReceiptVerification: (i: { attemptId: string; result: VerificationInput }) =>
      rpc<{ state: VerificationState }>('record_payment_receipt_verification', { p_attempt: i.attemptId, p_result: i.result }),

    recordEnvelopePayoutVerification: (i: { planId: string; attemptId: string; envelopePosition: number; result: VerificationInput }) =>
      rpc<{ state: VerificationState; planState: string; verified: number; total: number }>('record_envelope_payout_verification', {
        p_plan: i.planId, p_attempt: i.attemptId, p_position: i.envelopePosition, p_result: i.result,
      }),

    upsertPaiflowEvents: (deploymentId: string, events: PaiflowEventRecord[]) =>
      rpc<{ inserted: number }>('upsert_paiflow_events', { p_deployment: deploymentId, p_events: events }),

    async getEventCursor(deploymentId: string, scope: 'all' | `tx:${string}`): Promise<string | null> {
      const data = await read<{ cursor: string | null }[]>('getEventCursor', () =>
        client.from('event_cursors').select('cursor').eq('deployment_id', deploymentId).eq('scope', scope).limit(1),
      );
      return data && data.length > 0 ? data[0].cursor : null;
    },

    async advanceEventCursor(deploymentId: string, scope: string, expected: string | null, next: string): Promise<boolean> {
      const r = await rpc<boolean>('advance_event_cursor', {
        p_deployment: deploymentId, p_scope: scope, p_expected: expected, p_next: next,
      });
      return r.ok && r.value === true; // false = concurrent writer (or error)
    },

    async listStoredEvents(q: { deploymentId: string; txHash?: string; kinds?: string[] }): Promise<PaiflowEventRecord[]> {
      const data = await read<Row[]>('listStoredEvents', () => {
        let query = client.from('paiflow_events').select('*').eq('deployment_id', q.deploymentId);
        if (q.txHash) query = query.eq('tx_hash', q.txHash.toLowerCase());
        if (q.kinds && q.kinds.length > 0) query = query.in('kind', q.kinds);
        return query.order('ledger', { ascending: true }).limit(500);
      });
      return (data ?? []).map((r) => ({
        eventId: r.event_id as string,
        id: (r.item_id ?? '') as string,
        kind: r.kind as string,
        topic: (r.topic ?? null) as string | null,
        ledger: Number(r.ledger),
        txHash: r.tx_hash as string,
        occurredAt: r.occurred_at as IsoUtc,
        data: r.data ?? null,
      }));
    },

    async acquireReconcileLease(key: string, holder: string, ttlSeconds: number): Promise<boolean> {
      const r = await rpc<boolean>('acquire_reconcile_lease', { p_key: key, p_holder: holder, p_ttl_seconds: ttlSeconds });
      return r.ok && r.value === true;
    },

    async releaseReconcileLease(key: string, holder: string): Promise<void> {
      await rpc<Record<string, never>>('release_reconcile_lease', { p_key: key, p_holder: holder });
    },

    async consumeReconcileBudget(scope: PayScope): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
      const r = await rpc<{ allowed: boolean; retryAfterSeconds: number }>('consume_reconcile_budget', {
        p_scope_key: `plan:${planId(scope)}`, p_limit: 40,
      });
      return r.ok ? r.value : { allowed: false, retryAfterSeconds: 60 }; // fail closed
    },

    // ---- registry and operator (REQ-DEP-01, PRD §D.1) ----
    registerDeployment: async (
      i: Omit<DeploymentRegistryEntryDTO, 'status' | 'registeredAt'> & {
        operatorUserId: string; capabilitySnapshot: Json; status: 'available' | 'unusable';
      },
    ) =>
      mapResult(
        await rpc<Row>('register_deployment', {
          p_operator: i.operatorUserId,
          p_input: {
            deploymentId: i.deploymentId, template: i.template, asset: i.asset, conditionNodeId: i.conditionNodeId,
            deadlineAt: i.deadlineAt, sellerAddress: i.sellerAddress, buyerAddress: i.buyerAddress,
            splitRecipients: i.splitRecipients, graphSnapshotSha256: i.graphSnapshotSha256,
            capabilitySnapshot: i.capabilitySnapshot, status: i.status,
          },
        }),
        mapDeployment,
      ),

    setDeploymentStatus: (i: { operatorUserId: string; deploymentId: string; status: 'unusable' | 'retired'; reason: string }) =>
      rpc<Record<string, never>>('set_deployment_status', {
        p_operator: i.operatorUserId, p_deployment: i.deploymentId, p_status: i.status, p_reason: i.reason,
      }),

    async listDeployments(): Promise<DeploymentRegistryEntryDTO[]> {
      const data = await read<Row[]>('listDeployments', () =>
        client.from('paiflow_deployments').select('*').order('registered_at', { ascending: false }).limit(200),
      );
      return (data ?? []).map(mapDeployment);
    },

    openOperatorReview: (i: { scope: OperatorReviewDTO['scope']; refId: string; reason: string }) =>
      rpc<{ reviewId: string }>('open_operator_review', { p_scope: i.scope, p_ref: i.refId, p_reason: i.reason }),

    async listOperatorReviews(): Promise<OperatorReviewDTO[]> {
      const data = await read<Row[]>('listOperatorReviews', () =>
        client.from('operator_reviews').select('*').order('opened_at', { ascending: false }).limit(200),
      );
      return (data ?? []).map(mapReview);
    },

    resolveOperatorReview: (i: { reviewId: string; operatorUserId: string; outcome: ReviewResolution; justification: string; evidence: Json }) =>
      rpc<Record<string, never>>('resolve_operator_review', {
        p_review: i.reviewId, p_operator: i.operatorUserId, p_outcome: i.outcome,
        p_justification: i.justification, p_evidence: i.evidence,
      }),

    // ---- wallet summary reads (REQ-WAL-01) ----
    async getWalletContext(userId: string): Promise<{
      binding: { address: GAddress; verifiedAt: IsoUtc } | null;
      plans: WalletSummaryDTO['plans'];
      escrow: WalletSummaryDTO['escrow'];
      history: Omit<WalletSummaryDTO['history'][number], 'explorerUrl'>[];
      verifiedTotals: WalletSummaryDTO['verifiedPayouts'];
    } | null> {
      // get_wallet_context is a plain read: it returns the context object itself, not an {ok, value} envelope
      // (found by Carlos's live smoke test, where the envelope check turned every answer into INTERNAL).
      type WalletContext = {
        binding: { address: GAddress; verifiedAt: IsoUtc } | null;
        plans: WalletSummaryDTO['plans'];
        escrow: WalletSummaryDTO['escrow'];
        history: Omit<WalletSummaryDTO['history'][number], 'explorerUrl'>[];
        verifiedTotals: WalletSummaryDTO['verifiedPayouts'];
      };
      const data = await read<WalletContext>('getWalletContext', () => client.rpc('get_wallet_context', { p_user: userId }));
      return data && typeof data === 'object' && 'verifiedTotals' in data ? data : null;
    },
  };
}

export type FinancialDb = ReturnType<typeof createFinancialDb>;
