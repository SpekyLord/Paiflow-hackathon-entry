import 'server-only';
import type { BudgetPlanDetailDTO, CreatePlanInput } from '@/contracts/dto';
import { getServiceClient } from '@/server/db/client';
import { createBudgetPlan, createPlanVersion, type PlanRpcInput } from '@/server/db/business';
import { HttpError } from '@/server/http/respond';
import { buildCanonicalPlan } from './plan-input';
import { getPlanDeploymentId, getPlanDetail, resolvePlanFacts } from './plan-detail';

/** Load the plan detail for a viewer (operator flag from profiles). */
export async function detailFor(orgId: string, planId: string, userId: string): Promise<BudgetPlanDetailDTO> {
  const db = getServiceClient();
  const { data, error } = await db.from('profiles').select('is_operator').eq('user_id', userId).maybeSingle();
  if (error) throw new HttpError('INTERNAL');
  return getPlanDetail(db, orgId, planId, { userId, isOperator: data?.is_operator === true });
}

async function rpcInput(orgId: string, input: CreatePlanInput, deploymentId?: string): Promise<PlanRpcInput> {
  const db = getServiceClient();
  const facts = await resolvePlanFacts(db, orgId, input, deploymentId);
  const { canonicalText, planSha256 } = await buildCanonicalPlan(input, {
    orgId, deploymentId: facts.deploymentId, signerAddress: facts.signerAddress, attachmentSha256: facts.attachmentSha256,
  });
  return {
    purpose: input.purpose, totalStroops: input.totalStroops, signerUserId: input.signerUserId,
    envelopes: input.envelopes, canonicalText, planSha256,
  };
}

/** POST budget-plans. The deployment is derived from the registry, never from the browser. */
export async function createPlan(orgId: string, actorUserId: string, input: CreatePlanInput): Promise<BudgetPlanDetailDTO> {
  const r = await createBudgetPlan(actorUserId, orgId, await rpcInput(orgId, input));
  if (!r.ok) throw new HttpError(r.code);
  return detailFor(orgId, r.value.planId, actorUserId);
}

/** POST …/versions. Keeps the plan's own deployment; changed envelopes cannot match it and are refused (D-12). */
export async function createVersion(orgId: string, planId: string, actorUserId: string, input: CreatePlanInput): Promise<BudgetPlanDetailDTO> {
  const deploymentId = await getPlanDeploymentId(getServiceClient(), orgId, planId);
  const r = await createPlanVersion(actorUserId, orgId, planId, await rpcInput(orgId, input, deploymentId));
  if (!r.ok) throw new HttpError(r.code);
  return detailFor(orgId, planId, actorUserId);
}
