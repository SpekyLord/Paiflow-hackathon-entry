// Business RPC wrappers (migration 008): plans, approvals, documents. One RPC per function, never throws for domain
// conflicts, never logs arguments. The Supabase client is injected so the logic is testable; the server-only binding
// is ./business.ts.
import type { SupabaseClient } from '@supabase/supabase-js';
import { ERROR_HTTP_STATUS, type DbResult, type ErrorCode } from '@/contracts/errors';

const KNOWN_CODES = new Set<string>(Object.keys(ERROR_HTTP_STATUS));
const isCode = (v: unknown): v is ErrorCode => typeof v === 'string' && KNOWN_CODES.has(v);

export interface PlanRpcInput {
  purpose: string;
  totalStroops: string;
  signerUserId: string;
  canonicalText: string;
  planSha256: string;
  envelopes: { position: number; label: string; bps: number; recipientAddress: string; planningPhpCentavos: string | null }[];
}

export interface PlanWriteResult {
  planId: string;
  versionId: string;
  version: number;
  planSha256: string;
  ledgerBlockId: number | null;
  auditHash: string;
}

export interface DecisionResult {
  outcome: 'recorded' | 'existing';
  decision: 'approved' | 'rejected';
  state: string;
  approved: number;
  required: number;
}

export interface DocumentRecordResult {
  documentId: string;
  ledgerBlockId: number | null;
  auditHash: string;
}

export function createBusinessDb(client: SupabaseClient) {
  async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<DbResult<T>> {
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

  return {
    createBudgetPlan: (actorUserId: string, orgId: string, input: PlanRpcInput) =>
      rpc<PlanWriteResult>('create_budget_plan', { p_actor: actorUserId, p_org: orgId, p_input: input }),

    createPlanVersion: (actorUserId: string, orgId: string, planId: string, input: PlanRpcInput) =>
      rpc<PlanWriteResult>('create_plan_version', { p_actor: actorUserId, p_org: orgId, p_plan: planId, p_input: input }),

    decideBudgetPlan: (i: {
      actorUserId: string; planId: string; versionId: string; planSha256: string;
      decision: 'approved' | 'rejected'; reason: string | null;
    }) =>
      rpc<DecisionResult>('decide_budget_plan', {
        p_actor: i.actorUserId, p_plan: i.planId, p_version: i.versionId, p_sha256: i.planSha256,
        p_decision: i.decision, p_reason: i.reason,
      }),

    recordOrgDocument: (i: {
      actorUserId: string; orgId: string; kind: string; sha256: string; sizeBytes: number;
      mediaType: string; storageKey: string; filename: string;
    }) =>
      rpc<DocumentRecordResult>('record_org_document', {
        p_actor: i.actorUserId, p_org: i.orgId, p_kind: i.kind, p_sha256: i.sha256, p_size: i.sizeBytes,
        p_media_type: i.mediaType, p_storage_key: i.storageKey, p_filename: i.filename,
      }),
  };
}

export type BusinessDb = ReturnType<typeof createBusinessDb>;
