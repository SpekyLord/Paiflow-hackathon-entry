'use client';

// Data access for the SME screens. Live mode calls Francis's business fetchers; fixture mode returns contract
// fixtures with no network. The flag is written inline (as in src/client/controllers/index.ts) so production builds
// drop the fixture branch and the dynamic import with it. Documents and verify-file fetchers are not in
// src/client/api/business.ts yet (CR filed to Francis); until they land they live here on the shared apiRequest.

import type {
  BudgetPlanDetailDTO, BudgetPlanSummaryDTO, CreatePlanInput, OrgDocumentDTO, OrgDocumentKind,
  SessionDTO, SplitDeploymentDTO, VerifyFileResultDTO,
} from '@/contracts/dto';
import type { ApprovePlanRequest, DocumentDownloadResponse, RejectPlanRequest, SignInRequest } from '@/contracts/api';
import { apiRequest } from '@/client/http';
import * as business from '@/client/api/business';

const FIXTURE = process.env.NEXT_PUBLIC_CYFER_FIXTURES === '1' && process.env.NODE_ENV !== 'production';
const orgPath = (orgId: string) => `/api/orgs/${encodeURIComponent(orgId)}`;

export async function signIn(input: SignInRequest): Promise<SessionDTO> {
  if (FIXTURE) return (await import('./data-fixture')).session();
  return business.signIn(input);
}
export async function signOut() {
  if (FIXTURE) return {};
  return business.signOut();
}
export async function getMe(): Promise<SessionDTO> {
  if (FIXTURE) return (await import('./data-fixture')).session();
  return business.getMe();
}
export async function getSplitDeployment(orgId: string): Promise<SplitDeploymentDTO> {
  if (FIXTURE) return (await import('./data-fixture')).splitDeployment();
  return business.getSplitDeployment(orgId);
}
export async function listPlans(orgId: string): Promise<BudgetPlanSummaryDTO[]> {
  if (FIXTURE) return (await import('./data-fixture')).plans();
  return business.listPlans(orgId);
}
export async function getPlan(orgId: string, planId: string): Promise<BudgetPlanDetailDTO> {
  if (FIXTURE) return (await import('./data-fixture')).plan();
  return business.getPlan(orgId, planId);
}
export async function createPlan(orgId: string, input: CreatePlanInput): Promise<BudgetPlanDetailDTO> {
  if (FIXTURE) return (await import('./data-fixture')).created(input);
  return business.createPlan(orgId, input);
}
export async function approvePlan(orgId: string, planId: string, input: ApprovePlanRequest): Promise<BudgetPlanDetailDTO> {
  if (FIXTURE) return (await import('./data-fixture')).plan('approved');
  return business.approvePlan(orgId, planId, input);
}
export async function rejectPlan(orgId: string, planId: string, input: RejectPlanRequest): Promise<BudgetPlanDetailDTO> {
  if (FIXTURE) return (await import('./data-fixture')).plan('rejected');
  return business.rejectPlan(orgId, planId, input);
}

export async function listDocuments(orgId: string): Promise<OrgDocumentDTO[]> {
  if (FIXTURE) return (await import('./data-fixture')).documents();
  return apiRequest<OrgDocumentDTO[]>(`${orgPath(orgId)}/documents`);
}
export async function uploadDocument(orgId: string, kind: OrgDocumentKind, file: File): Promise<OrgDocumentDTO> {
  if (FIXTURE) return (await import('./data-fixture')).uploaded(kind, file);
  const form = new FormData();
  form.set('kind', kind);
  form.set('file', file);
  return apiRequest<OrgDocumentDTO>(`${orgPath(orgId)}/documents`, { form });
}
export async function downloadDocumentUrl(orgId: string, docId: string): Promise<DocumentDownloadResponse> {
  if (FIXTURE) return { url: '#fixture', expiresAt: new Date(Date.now() + 300_000).toISOString() };
  return apiRequest<DocumentDownloadResponse>(`${orgPath(orgId)}/documents/${encodeURIComponent(docId)}/download`);
}
export async function verifyFile(
  orgId: string, target: { kind: 'org_document' | 'plan_version'; id: string }, file: File,
): Promise<VerifyFileResultDTO> {
  if (FIXTURE) return (await import('./data-fixture')).verified(file);
  const form = new FormData();
  form.set('target', JSON.stringify(target));
  form.set('file', file);
  return apiRequest<VerifyFileResultDTO>(`${orgPath(orgId)}/verify-file`, { form });
}
