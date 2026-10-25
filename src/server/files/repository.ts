import 'server-only';
import type { OrgDocumentDTO, OrgDocumentKind } from '@/contracts/dto';
import { HttpError } from '@/server/http/respond';
import { getServiceClient } from '@/server/db/client';

interface OrgDocumentRow {
  id: string;
  org_id: string;
  kind: OrgDocumentKind;
  sha256: string;
  size_bytes: number;
  media_type: string;
  storage_key: string;
  original_filename: string;
  uploaded_by: string;
  ledger_block_id: number | null;
  created_at: string;
}

export interface PlanVersionRecord { id: string; version: number; purpose: string; plan_sha256: string; created_at: string }

function requireDbResult<T>(data: T | null, error: unknown): T {
  if (error || data === null) throw new HttpError('INTERNAL');
  return data;
}

function toDto(row: OrgDocumentRow, displayName: string): OrgDocumentDTO {
  return {
    documentId: row.id,
    kind: row.kind,
    sha256: row.sha256,
    sizeBytes: Number(row.size_bytes),
    mediaType: row.media_type,
    originalFilename: row.original_filename,
    uploadedAt: row.created_at,
    uploadedBy: displayName,
    ledgerBlockId: row.ledger_block_id,
  };
}

async function displayNames(userIds: string[]): Promise<Map<string, string>> {
  if (!userIds.length) return new Map();
  const { data, error } = await getServiceClient().from('profiles').select('user_id, display_name').in('user_id', userIds);
  if (error) throw new HttpError('INTERNAL');
  return new Map((data ?? []).map((row) => [row.user_id as string, (row.display_name as string | null) || 'Organisation member']));
}

export async function listOrgDocuments(orgId: string): Promise<OrgDocumentDTO[]> {
  const { data, error } = await getServiceClient().from('org_documents')
    .select('id,org_id,kind,sha256,size_bytes,media_type,storage_key,original_filename,uploaded_by,ledger_block_id,created_at')
    .eq('org_id', orgId).order('created_at', { ascending: false });
  const rows = requireDbResult(data as unknown as OrgDocumentRow[] | null, error);
  const names = await displayNames([...new Set(rows.map((row) => row.uploaded_by))]);
  return rows.map((row) => toDto(row, names.get(row.uploaded_by) ?? 'Organisation member'));
}

export async function getOrgDocument(orgId: string, documentId: string): Promise<OrgDocumentRow> {
  const { data, error } = await getServiceClient().from('org_documents')
    .select('id,org_id,kind,sha256,size_bytes,media_type,storage_key,original_filename,uploaded_by,ledger_block_id,created_at')
    .eq('id', documentId).maybeSingle();
  if (error) throw new HttpError('INTERNAL');
  if (!data) throw new HttpError('NOT_FOUND');
  if (data.org_id !== orgId) throw new HttpError('FORBIDDEN');
  return data as unknown as OrgDocumentRow;
}

export async function getOrgDocumentDto(orgId: string, documentId: string): Promise<OrgDocumentDTO> {
  const row = await getOrgDocument(orgId, documentId);
  const names = await displayNames([row.uploaded_by]);
  return toDto(row, names.get(row.uploaded_by) ?? 'Organisation member');
}

/** Query by version ID, then verify the owning plan is in the requested organisation. */
export async function getPlanVersionInOrg(orgId: string, versionId: string): Promise<PlanVersionRecord> {
  const db = getServiceClient();
  const { data: version, error: versionError } = await db.from('budget_plan_versions')
    .select('id,version,purpose,plan_sha256,plan_id,created_at').eq('id', versionId).maybeSingle();
  if (versionError) throw new HttpError('INTERNAL');
  if (!version) throw new HttpError('NOT_FOUND');
  const { data: plan, error: planError } = await db.from('budget_plans').select('id,org_id')
    .eq('id', version.plan_id).maybeSingle();
  if (planError) throw new HttpError('INTERNAL');
  if (!plan) throw new HttpError('NOT_FOUND');
  if (plan.org_id !== orgId) throw new HttpError('FORBIDDEN');
  return { id: version.id as string, version: version.version as number, purpose: version.purpose as string, plan_sha256: version.plan_sha256 as string, created_at: version.created_at as string };
}
