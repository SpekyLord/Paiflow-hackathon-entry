// Typed browser fetchers for Francis's business routes (FRANCIS-PHASETASK §3.5). Same-origin, cookie session; no tokens.
// Errors surface as ApiClientError (with a safe code and message). Documents and verify-file fetchers arrive with F-15.
import type {
  BudgetPlanDetailDTO, BudgetPlanSummaryDTO, CreatePlanInput, SessionDTO, SplitDeploymentDTO,
} from '@/contracts/dto';
import type { ApprovePlanRequest, RejectPlanRequest, SignInRequest } from '@/contracts/api';
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
