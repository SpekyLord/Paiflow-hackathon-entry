import { randomUUID } from 'node:crypto';
import type { OrgDocumentKind } from '@/contracts/dto';
import { MAX_UPLOAD_BYTES } from '@/contracts/limits';
import { requireOrgMember } from '@/server/auth/guards';
import { recordOrgDocument } from '@/server/db/business';
import { getOrgDocumentDto, listOrgDocuments } from '@/server/files/repository';
import { removePrivateFile, uploadPrivateFile } from '@/server/files/storage';
import { validateUpload } from '@/server/files/validation';
import { readMultipart } from '@/server/http/multipart';
import { sameOrigin } from '@/server/http/origin';
import { handle, HttpError } from '@/server/http/respond';
import { limit } from '@/server/http/rate-limit';

export const runtime = 'nodejs';

const DOCUMENT_KINDS = new Set<OrgDocumentKind>(['contract', 'invoice', 'receipt', 'plan_attachment', 'other']);

function throwDbError(code: string): never {
  if (code === 'NOT_MEMBER') throw new HttpError('NOT_MEMBER');
  if (code === 'VALIDATION') throw new HttpError('VALIDATION');
  if (code === 'STATE_CONFLICT') throw new HttpError('STATE_CONFLICT');
  throw new HttpError('INTERNAL');
}

export async function GET(_request: Request, context: { params: Promise<{ orgId: string }> }) {
  return handle(async () => {
    const { orgId: rawOrgId } = await context.params;
    const { orgId, userId } = await requireOrgMember(rawOrgId);
    limit('request', userId);
    return listOrgDocuments(orgId);
  });
}

export async function POST(request: Request, context: { params: Promise<{ orgId: string }> }) {
  return handle(async () => {
    sameOrigin(request, 'multipart');
    const { orgId: rawOrgId } = await context.params;
    const { orgId, userId } = await requireOrgMember(rawOrgId);
    limit('upload', userId);

    const { fields, file } = await readMultipart(request, MAX_UPLOAD_BYTES);
    if (!file) throw new HttpError('VALIDATION_SHAPE', 'Choose one file to upload.');
    if (Object.keys(fields).length !== 1 || typeof fields.kind !== 'string' || !DOCUMENT_KINDS.has(fields.kind as OrgDocumentKind)) {
      throw new HttpError('VALIDATION_SHAPE', 'Choose a valid document type.');
    }
    const clean = validateUpload(file);
    const key = `orgs/${orgId}/docs/${randomUUID()}`;
    await uploadPrivateFile(key, clean.bytes, clean.mediaType);

    let recorded;
    try {
      recorded = await recordOrgDocument({
        actorUserId: userId,
        orgId,
        kind: fields.kind,
        sha256: clean.sha256,
        sizeBytes: clean.bytes.byteLength,
        mediaType: clean.mediaType,
        storageKey: key,
        filename: clean.filename,
      });
    } catch {
      await removePrivateFile(key);
      throw new HttpError('INTERNAL');
    }
    if (!recorded.ok) {
      await removePrivateFile(key);
      throwDbError(recorded.code);
    }

    return getOrgDocumentDto(orgId, recorded.value.documentId);
  }).then((response) => {
    if (response.status !== 200) return response;
    return new Response(response.body, {
      status: 201,
      headers: response.headers,
    });
  });
}
