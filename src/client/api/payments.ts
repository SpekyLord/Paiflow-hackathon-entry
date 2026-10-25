// Typed browser fetchers for Carlos's routes (FRANCIS-PHASETASK §3.5).
// Every call goes through Francis's same-origin apiRequest; nothing here
// retries a payment POST, because a lost response means "unknown".
import { apiRequest } from "@/client/http";
import type { ApiRoutes, PayResubmitRequest, ResolveReviewRequest } from "@/contracts/api";

type Res<K extends keyof ApiRoutes> = ApiRoutes[K]["res"];

const planPath = (orgId: string, planId: string) =>
  `/api/orgs/${encodeURIComponent(orgId)}/budget-plans/${encodeURIComponent(planId)}`;

export function preparePlanPayment(orgId: string, planId: string) {
  return apiRequest<Res<"POST /api/orgs/:orgId/budget-plans/:planId/pay/prepare">>(
    `${planPath(orgId, planId)}/pay/prepare`,
    { method: "POST", body: {} },
  );
}

export function submitPlanPayment(orgId: string, planId: string, attemptId: string, signedXdr: string) {
  return apiRequest<Res<"POST /api/orgs/:orgId/budget-plans/:planId/pay/submit">>(
    `${planPath(orgId, planId)}/pay/submit`,
    { method: "POST", body: { attemptId, signedXdr } },
  );
}

// Read-only: the server never submits on a check (CL-05).
export function checkPlanPayment(orgId: string, planId: string, attemptId: string) {
  return apiRequest<Res<"POST /api/orgs/:orgId/budget-plans/:planId/pay/check">>(
    `${planPath(orgId, planId)}/pay/check`,
    { method: "POST", body: { attemptId } },
  );
}

// Resends the byte-identical stored envelope; only after an explicit user confirmation.
export function resubmitPlanPayment(orgId: string, planId: string, attemptId: string, originalTxHash: string) {
  const body: PayResubmitRequest = { attemptId, originalTxHash, intent: "resubmit_same_signed_envelope" };
  return apiRequest<Res<"POST /api/orgs/:orgId/budget-plans/:planId/pay/resubmit">>(
    `${planPath(orgId, planId)}/pay/resubmit`,
    { method: "POST", body },
  );
}

export function refreshPlanEvidence(orgId: string, planId: string) {
  return apiRequest<Res<"POST /api/orgs/:orgId/budget-plans/:planId/evidence/refresh">>(
    `${planPath(orgId, planId)}/evidence/refresh`,
    { method: "POST", body: {} },
  );
}

export function getWalletSummary() {
  return apiRequest<Res<"GET /api/wallet/summary">>("/api/wallet/summary");
}

export function listDeployments() {
  return apiRequest<Res<"GET /api/operator/deployments">>("/api/operator/deployments");
}

export function registerDeployment(input: ApiRoutes["POST /api/operator/deployments"]["req"]) {
  return apiRequest<Res<"POST /api/operator/deployments">>("/api/operator/deployments", {
    method: "POST",
    body: input,
  });
}

export function listOperatorReviews() {
  return apiRequest<Res<"GET /api/operator/reviews">>("/api/operator/reviews");
}

export function resolveOperatorReview(reviewId: string, input: ResolveReviewRequest) {
  return apiRequest<Res<"POST /api/operator/reviews/:reviewId">>(
    `/api/operator/reviews/${encodeURIComponent(reviewId)}`,
    { method: "POST", body: input },
  );
}

export function getIntegrationStatus() {
  return apiRequest<Res<"GET /api/integration/status">>("/api/integration/status");
}
