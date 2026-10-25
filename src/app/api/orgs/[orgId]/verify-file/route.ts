import { createHash } from 'node:crypto';
import { MAX_UPLOAD_BYTES } from '@/contracts/limits';
import { parseUuid, requireOrgMember } from '@/server/auth/guards';
import { getOrgDocument, getPlanVersionInOrg } from '@/server/files/repository';
import { readMultipart } from '@/server/http/multipart';
import { sameOrigin } from '@/server/http/origin';
import { handle, HttpError } from '@/server/http/respond';
import { limit } from '@/server/http/rate-limit';

export const runtime = 'nodejs';

type VerifyTarget = { kind: 'org_document' | 'plan_version'; id: string };

function parseTarget(raw: string | undefined): VerifyTarget {
  if (!raw || raw.length > 300) throw new HttpError('VALIDATION_SHAPE', 'Choose a saved record to compare.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new HttpError('VALIDATION_SHAPE', 'The selected record is invalid.'); }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new HttpError('VALIDATION_SHAPE');
  const target = value as Record<string, unknown>;
  if (Object.keys(target).length !== 2 || (target.kind !== 'org_document' && target.kind !== 'plan_version') || typeof target.id !== 'string') {
    throw new HttpError('VALIDATION_SHAPE', 'Choose a saved record to compare.');
  }
  return { kind: target.kind, id: parseUuid(target.id, 'record') };
}

export async function POST(request: Request, context: { params: Promise<{ orgId: string }> }) {
  return handle(async () => {
    sameOrigin(request, 'multipart');
    const { orgId: rawOrgId } = await context.params;
    const { orgId, userId } = await requireOrgMember(rawOrgId);
    limit('verify', userId);

    const { fields, file } = await readMultipart(request, MAX_UPLOAD_BYTES);
    if (!file || Object.keys(fields).length !== 1) throw new HttpError('VALIDATION_SHAPE', 'Choose one file and one saved record.');
    const target = parseTarget(fields.target);
    // The candidate is deliberately NOT type-checked: a file that was altered after recording (corrupted header,
    // truncated, wrong type) is exactly what this tool must report as "does not match", not refuse with a 415.
    // Size is already capped by readMultipart. Only the bytes are hashed.
    let recordedSha256: string;
    let recordedAt: string;
    let label: string;

    if (target.kind === 'org_document') {
      const record = await getOrgDocument(orgId, target.id);
      recordedSha256 = record.sha256;
      recordedAt = record.created_at;
      label = record.original_filename;
    } else {
      const version = await getPlanVersionInOrg(orgId, target.id);
      recordedSha256 = version.plan_sha256;
      recordedAt = version.created_at;
      label = `${version.purpose} · version ${version.version}`;
    }

    const candidateSha256 = createHash('sha256').update(file.bytes).digest('hex');
    return {
      target: { kind: target.kind, id: target.id, label },
      recordedAt, // when the record was saved, never the time of this check
      candidateSha256,
      recordedSha256,
      match: candidateSha256 === recordedSha256,
    };
  });
}
