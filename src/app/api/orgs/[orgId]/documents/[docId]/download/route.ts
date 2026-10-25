import { SIGNED_URL_TTL_SECONDS } from '@/contracts/limits';
import { requireOrgMember, parseUuid } from '@/server/auth/guards';
import { getOrgDocument } from '@/server/files/repository';
import { createPrivateDownloadUrl } from '@/server/files/storage';
import { limit } from '@/server/http/rate-limit';
import { handle } from '@/server/http/respond';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ orgId: string; docId: string }> }) {
  return handle(async () => {
    const { orgId: rawOrgId, docId: rawDocId } = await context.params;
    const { orgId, userId } = await requireOrgMember(rawOrgId);
    limit('request', userId);
    const document = await getOrgDocument(orgId, parseUuid(rawDocId, 'document'));
    const url = await createPrivateDownloadUrl(document.storage_key, document.original_filename, SIGNED_URL_TTL_SECONDS);
    return { url, expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString() };
  });
}
