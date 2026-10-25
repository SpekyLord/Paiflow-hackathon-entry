// Typed browser fetchers for Francis's business routes (FRANCIS-PHASETASK §3.5). Same-origin, cookie session; no tokens.
// Errors surface as ApiClientError (with a safe code and message).
import type {
  BudgetPlanDetailDTO, BudgetPlanSummaryDTO, CreatePlanInput, OrgDocumentDTO, OrgDocumentKind, OrgMemberDTO,
  PlanVersionIndexDTO, SessionDTO, SplitDeploymentDTO, VerifyFileResultDTO,
} from '@/contracts/dto';
import type {
  ApprovePlanRequest, BindRequest, BindResponse, ChallengeResponse, DocumentDownloadResponse, RejectPlanRequest, SignInRequest,
} from '@/contracts/api';
import { apiRequest } from '../http';

const org = (orgId: string) => `/api/orgs/${encodeURIComponent(orgId)}`;
const plan = (orgId: string, planId: string) => `${org(orgId)}/budget-plans/${encodeURIComponent(planId)}`;

export const signIn = (input: SignInRequest) => apiRequest<SessionDTO>('/api/auth/sign-in', { method: 'POST', body: input });
export const signOut = () => apiRequest<Record<string, never>>('/api/auth/sign-out', { method: 'POST', body: {} });
export const getMe = () => apiRequest<SessionDTO>('/api/auth/me');

export const listOrgs = () => apiRequest<SessionDTO['orgs']>('/api/orgs');
export const getSplitDeployment = (orgId: string) => apiRequest<SplitDeploymentDTO>(`${org(orgId)}/split-deployment`);

export const listPlans = (orgId: string) => apiRequest<BudgetPlanSummaryDTO[]>(`${org(orgId)}/budget-plans`);
export const createPlan = (orgId: string, input: CreatePlanInput) =>
  apiRequest<BudgetPlanDetailDTO>(`${org(orgId)}/budget-plans`, { method: 'POST', body: input });
export const getPlan = (orgId: string, planId: string) => apiRequest<BudgetPlanDetailDTO>(plan(orgId, planId));
export const createPlanVersion = (orgId: string, planId: string, input: CreatePlanInput) =>
  apiRequest<BudgetPlanDetailDTO>(`${plan(orgId, planId)}/versions`, { method: 'POST', body: input });
export const approvePlan = (orgId: string, planId: string, input: ApprovePlanRequest) =>
  apiRequest<BudgetPlanDetailDTO>(`${plan(orgId, planId)}/approve`, { method: 'POST', body: input });
export const rejectPlan = (orgId: string, planId: string, input: RejectPlanRequest) =>
  apiRequest<BudgetPlanDetailDTO>(`${plan(orgId, planId)}/reject`, { method: 'POST', body: input });

// ---- organisation directory (CR-03) ----
export const listMembers = (orgId: string) => apiRequest<OrgMemberDTO[]>(`${org(orgId)}/members`);
export const listPlanVersions = (orgId: string) => apiRequest<PlanVersionIndexDTO[]>(`${org(orgId)}/plan-versions`);

// ---- documents and tamper check ----
export const listDocuments = (orgId: string) => apiRequest<OrgDocumentDTO[]>(`${org(orgId)}/documents`);
export function uploadDocument(orgId: string, file: File, kind: OrgDocumentKind) {
  const form = new FormData();
  form.set('kind', kind);
  form.set('file', file);
  return apiRequest<OrgDocumentDTO>(`${org(orgId)}/documents`, { method: 'POST', form, timeoutMs: 60_000 });
}
export const getDocumentDownload = (orgId: string, docId: string) =>
  apiRequest<DocumentDownloadResponse>(`${org(orgId)}/documents/${encodeURIComponent(docId)}/download`);
export function verifyFile(orgId: string, file: File, target: { kind: 'org_document' | 'plan_version'; id: string }) {
  const form = new FormData();
  form.set('target', JSON.stringify(target));
  form.set('file', file);
  return apiRequest<VerifyFileResultDTO>(`${org(orgId)}/verify-file`, { method: 'POST', form, timeoutMs: 60_000 });
}

// ---- wallet binding (the signing itself is Carlos's useWalletBinding hook; these are the raw routes) ----
export const requestWalletChallenge = (address: string) =>
  apiRequest<ChallengeResponse>('/api/wallet/challenge', { method: 'POST', body: { address } });
export const bindWallet = (input: BindRequest) => apiRequest<BindResponse>('/api/wallet/bind', { method: 'POST', body: input });
export const unbindWallet = () => apiRequest<Record<string, never>>('/api/wallet/unbind', { method: 'POST', body: {} });
