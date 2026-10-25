// Endpoint request/response map (FRANCIS-PHASETASK §3.5). Types only; routes live under src/app/api.
// Owner letters: F = Francis, C = Carlos. `data` is the success payload inside `{ data }`.

import type {
  BudgetPlanDetailDTO,
  BudgetPlanSummaryDTO,
  CreatePlanInput,
  DeploymentRegistryEntryDTO,
  GAddress,
  IsoUtc,
  OperatorReviewDTO,
  OrgMemberDTO,
  PlanVersionIndexDTO,
  OrgDocumentDTO,
  OrgDocumentKind,
  PaymentAttemptViewDTO,
  PaymentReviewDTO,
  SessionDTO,
  Sha256Hex,
  SplitDeploymentDTO,
  StellarTxHash,
  VerifyFileResultDTO,
  WalletSummaryDTO,
} from './dto';

export interface SignInRequest { email: string; password: string }
export interface ChallengeRequest { address: GAddress }
export interface ChallengeResponse { challengeId: string; message: string; expiresAt: IsoUtc }
export interface BindRequest { challengeId: string; address: GAddress; signedMessage: string; signerAddress: GAddress }
export interface BindResponse { address: GAddress; verifiedAt: IsoUtc }
export interface ApprovePlanRequest { versionId: string; planSha256: Sha256Hex }
export interface RejectPlanRequest extends ApprovePlanRequest { reason: string }
export interface PaySubmitRequest { attemptId: string; signedXdr: string }
export interface PayCheckRequest { attemptId: string }
export interface PayResubmitRequest {
  attemptId: string;
  originalTxHash: StellarTxHash;
  intent: 'resubmit_same_signed_envelope';
}
export interface UploadDocumentFields { kind: OrgDocumentKind } // multipart: file + kind
export interface VerifyFileFields { target: { kind: 'org_document' | 'plan_version'; id: string } } // multipart: file + target
export interface DocumentDownloadResponse { url: string; expiresAt: IsoUtc }
export interface ResolveReviewRequest {
  outcome: string;
  justification: string;
  evidence: { stellarTxHash?: StellarTxHash; explorerCheckedAt?: IsoUtc; notes: string };
}
export interface IntegrationStatusResponse { paiflowConfigured: boolean; network: 'testnet' | null }
export type Empty = Record<string, never>;

interface Route<Req, Res> { req: Req; res: Res }

/** Keyed by "METHOD /path". `:orgId`, `:planId`, `:docId`, `:reviewId` are path params. */
export interface ApiRoutes {
  'POST /api/auth/sign-in': Route<SignInRequest, SessionDTO>; // F, public
  'POST /api/auth/sign-out': Route<Empty, Empty>; // F
  'GET /api/auth/me': Route<undefined, SessionDTO>; // F
  'POST /api/wallet/challenge': Route<ChallengeRequest, ChallengeResponse>; // F
  'POST /api/wallet/bind': Route<BindRequest, BindResponse>; // F
  'POST /api/wallet/unbind': Route<Empty, Empty>; // F
  'GET /api/wallet/summary': Route<undefined, WalletSummaryDTO>; // C
  'GET /api/orgs': Route<undefined, SessionDTO['orgs']>; // F
  'GET /api/orgs/:orgId/split-deployment': Route<undefined, SplitDeploymentDTO>; // F, owner
  'GET /api/orgs/:orgId/members': Route<undefined, OrgMemberDTO[]>; // F, member (CR-03)
  'GET /api/orgs/:orgId/plan-versions': Route<undefined, PlanVersionIndexDTO[]>; // F, member (CR-03)
  'GET /api/orgs/:orgId/budget-plans': Route<undefined, BudgetPlanSummaryDTO[]>; // F, member
  'POST /api/orgs/:orgId/budget-plans': Route<CreatePlanInput, BudgetPlanDetailDTO>; // F, owner
  'GET /api/orgs/:orgId/budget-plans/:planId': Route<undefined, BudgetPlanDetailDTO>; // F, member/operator
  'POST /api/orgs/:orgId/budget-plans/:planId/versions': Route<CreatePlanInput, BudgetPlanDetailDTO>; // F, owner
  'POST /api/orgs/:orgId/budget-plans/:planId/approve': Route<ApprovePlanRequest, BudgetPlanDetailDTO>; // F, approver
  'POST /api/orgs/:orgId/budget-plans/:planId/reject': Route<RejectPlanRequest, BudgetPlanDetailDTO>; // F, approver
  'POST /api/orgs/:orgId/budget-plans/:planId/pay/prepare': Route<Empty, PaymentReviewDTO>; // C, signer
  'POST /api/orgs/:orgId/budget-plans/:planId/pay/submit': Route<PaySubmitRequest, PaymentAttemptViewDTO>; // C, signer
  'POST /api/orgs/:orgId/budget-plans/:planId/pay/check': Route<PayCheckRequest, PaymentAttemptViewDTO>; // C, read-only
  'POST /api/orgs/:orgId/budget-plans/:planId/pay/resubmit': Route<PayResubmitRequest, PaymentAttemptViewDTO>; // C, signer
  'POST /api/orgs/:orgId/budget-plans/:planId/evidence/refresh': Route<Empty, BudgetPlanDetailDTO>; // C, member
  'GET /api/orgs/:orgId/documents': Route<undefined, OrgDocumentDTO[]>; // F
  'POST /api/orgs/:orgId/documents': Route<FormData, OrgDocumentDTO>; // F
  'GET /api/orgs/:orgId/documents/:docId/download': Route<undefined, DocumentDownloadResponse>; // F
  'POST /api/orgs/:orgId/verify-file': Route<FormData, VerifyFileResultDTO>; // F
  'GET /api/operator/deployments': Route<undefined, DeploymentRegistryEntryDTO[]>; // C, operator
  'POST /api/operator/deployments': Route<Omit<DeploymentRegistryEntryDTO, 'status' | 'registeredAt'>, DeploymentRegistryEntryDTO>; // C
  'GET /api/operator/reviews': Route<undefined, OperatorReviewDTO[]>; // C, operator
  'POST /api/operator/reviews/:reviewId': Route<ResolveReviewRequest, OperatorReviewDTO>; // C, operator
  'GET /api/integration/status': Route<undefined, IntegrationStatusResponse>; // C
}

export type ApiRouteKey = keyof ApiRoutes;
