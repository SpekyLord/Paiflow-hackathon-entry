// Fixture-mode responses for the SME screens. Only ever reached through a dynamic import that is guarded by the
// build-time fixture flag in data.ts, so production bundles contain none of this (checked by npm run check:bundle).
import type { BudgetPlanDetailDTO, BudgetPlanSummaryDTO, CreatePlanInput, OrgDocumentDTO, OrgDocumentKind, SessionDTO, SplitDeploymentDTO, VerifyFileResultDTO } from '@/contracts/dto';
import {
  allPlanStateFixtures, orgDocumentsFixture, planDetailFixture, sessionFixture, splitDeploymentFixture, verifyFileFixture,
} from '@/contracts/fixtures';
import { sha256OfFile } from './hash';

const pause = () => new Promise((r) => setTimeout(r, 300));

export const session = async (): Promise<SessionDTO> => sessionFixture(['owner', 'operator']);
export const splitDeployment = async (): Promise<SplitDeploymentDTO> => { await pause(); return splitDeploymentFixture(); };
export const plans = async (): Promise<BudgetPlanSummaryDTO[]> => { await pause(); return allPlanStateFixtures().slice(0, 4); };
export const plan = async (state: Parameters<typeof planDetailFixture>[0] = 'pending_approval'): Promise<BudgetPlanDetailDTO> => { await pause(); return planDetailFixture(state); };
export const created = async (input: CreatePlanInput): Promise<BudgetPlanDetailDTO> => ({ ...(await plan()), purpose: input.purpose, totalStroops: input.totalStroops });
export const documents = async (): Promise<OrgDocumentDTO[]> => { await pause(); return orgDocumentsFixture(); };
export const uploaded = async (kind: OrgDocumentKind, file: File): Promise<OrgDocumentDTO> => {
  await pause();
  return { ...orgDocumentsFixture()[0], kind, originalFilename: file.name, sizeBytes: file.size };
};
export const verified = async (file: File): Promise<VerifyFileResultDTO> => {
  await pause();
  const candidate = await sha256OfFile(file);
  return { ...verifyFileFixture(candidate === orgDocumentsFixture()[0].sha256), candidateSha256: candidate };
};
