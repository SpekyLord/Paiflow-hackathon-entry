// Level: MOCKED (storage and database are in-memory). F-15 acceptance for SME documents.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const state = vi.hoisted(() => ({
  userId: '00000000-0000-4000-8000-000000000010' as string | null,
  events: [] as string[],
  documents: [] as Array<Record<string, unknown>>,
  storage: new Map<string, Uint8Array>(),
  signedUrlOptions: [] as Array<{ key: string; expiresIn: number; options: { download?: string | boolean } }>,
}));

vi.mock('@/server/auth/session', () => ({ getAuthUserId: async () => state.userId, loadSession: async () => null }));

vi.mock('@/server/db/client', () => ({
  getServiceClient: () => ({
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const query: Record<string, any> = {
        select: () => query,
        eq: (column: string, value: unknown) => { filters[column] = value; return query; },
        order: () => query,
        in: () => query,
        maybeSingle: async () => {
          if (table === 'org_memberships') return { data: filters.user_id === state.userId && filters.org_id === ORG_A ? { role: 'owner' } : null, error: null };
          if (table === 'org_documents') return { data: state.documents.find((row) => row.id === filters.id) ?? null, error: null };
          return { data: null, error: null };
        },
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(resolve, reject),
      };
      return query;
    },
    storage: {
      from: () => ({
        upload: async (key: string, body: Uint8Array) => {
          state.events.push('storage');
          state.storage.set(key, new Uint8Array(body));
          return { error: null };
        },
        remove: async (keys: string[]) => {
          keys.forEach((key) => state.storage.delete(key));
          return { error: null };
        },
        createSignedUrl: async (key: string, expiresIn: number, options: { download?: string | boolean }) => {
          state.signedUrlOptions.push({ key, expiresIn, options });
          return { data: { signedUrl: 'https://storage.example/signed' }, error: null };
        },
      }),
    },
  }),
}));

vi.mock('@/server/db/business', () => ({
  recordOrgDocument: async (input: {
    orgId: string; kind: string; sha256: string; sizeBytes: number; mediaType: string; storageKey: string; filename: string;
  }) => {
    state.events.push('record');
    const documentId = '00000000-0000-4000-8000-000000000020';
    state.documents.push({
      id: documentId, org_id: input.orgId, kind: input.kind, sha256: input.sha256, size_bytes: input.sizeBytes,
      media_type: input.mediaType, storage_key: input.storageKey, original_filename: input.filename,
      uploaded_by: state.userId, ledger_block_id: null, created_at: '2026-10-25T00:00:00.000Z',
    });
    return { ok: true, value: { documentId, ledgerBlockId: null, auditHash: 'a'.repeat(64) } };
  },
}));

import { POST as upload } from '@/app/api/orgs/[orgId]/documents/route';
import { GET as download } from '@/app/api/orgs/[orgId]/documents/[docId]/download/route';
import { POST as verify } from '@/app/api/orgs/[orgId]/verify-file/route';
import { resetRateLimits } from '@/server/http/rate-limit';

const ORG_A = '00000000-0000-4000-8000-000000000001';
const ORG_B = '00000000-0000-4000-8000-000000000002';
const DOC_ID = '00000000-0000-4000-8000-000000000020';
const PDF = new TextEncoder().encode('%PDF-1.7\nF-15 fixture');
const context = (orgId = ORG_A, docId = DOC_ID) => ({ params: Promise.resolve({ orgId, docId }) });

function formRequest(path: string, fileBytes: Uint8Array, type = 'application/pdf', filename = 'receipt.pdf', target?: string): Request {
  const form = new FormData();
  if (path.endsWith('/documents')) form.set('kind', 'receipt');
  else form.set('target', target ?? JSON.stringify({ kind: 'org_document', id: DOC_ID }));
  form.set('file', new Blob([Uint8Array.from(fileBytes).buffer as ArrayBuffer], { type }), filename);
  return new Request(`http://localhost:3000${path}`, {
    method: 'POST', body: form, headers: { origin: 'http://localhost:3000' },
  });
}

async function body(response: Response): Promise<any> { return response.json(); }

beforeEach(() => {
  state.userId = '00000000-0000-4000-8000-000000000010';
  state.events.length = 0;
  state.documents.length = 0;
  state.storage.clear();
  state.signedUrlOptions.length = 0;
  resetRateLimits();
});

describe('F-15 document routes', () => {
  it('uploads to private storage before recording and returns the saved document', async () => {
    const response = await upload(formRequest(`/api/orgs/${ORG_A}/documents`, PDF), context());
    const result = await body(response);
    expect(response.status).toBe(201);
    expect(result.data.documentId).toBe(DOC_ID);
    expect(state.events).toEqual(['storage', 'record']);
    expect(state.storage.size).toBe(1);
  });

  it('rejects an unsupported file signature with 415 before any storage or database write', async () => {
    const response = await upload(formRequest(`/api/orgs/${ORG_A}/documents`, new TextEncoder().encode('not a pdf'), 'application/pdf'), context());
    expect(response.status).toBe(415);
    expect(state.events).toEqual([]);
  });

  it('rejects an oversized upload with 413 before storage or database writes', async () => {
    const response = await upload(formRequest(`/api/orgs/${ORG_A}/documents`, new Uint8Array(10_485_761)), context());
    expect(response.status).toBe(413);
    expect(state.events).toEqual([]);
  });

  it('downloads only a member-scoped document using an attachment URL capped at 300 seconds', async () => {
    state.documents.push({
      id: DOC_ID, org_id: ORG_A, kind: 'receipt', sha256: 'a'.repeat(64), size_bytes: PDF.length,
      media_type: 'application/pdf', storage_key: `orgs/${ORG_A}/docs/00000000-0000-4000-8000-000000000030`,
      original_filename: 'receipt.pdf', uploaded_by: state.userId, ledger_block_id: null, created_at: '2026-10-25T00:00:00.000Z',
    });
    const response = await download(new Request(`http://localhost:3000/api/orgs/${ORG_A}/documents/${DOC_ID}/download`), context());
    expect(response.status).toBe(200);
    expect((await body(response)).data.url).toBe('https://storage.example/signed');
    expect(state.signedUrlOptions).toEqual([{
      key: `orgs/${ORG_A}/docs/00000000-0000-4000-8000-000000000030`,
      expiresIn: 300,
      options: { download: 'receipt.pdf' },
    }]);
  });

  it('returns match true for identical bytes and false after a one-byte change', async () => {
    state.documents.push({
      id: DOC_ID, org_id: ORG_A, kind: 'receipt', sha256: 'd15f4b2e8c3109b0c7123c93691c4c3e1367b88e20f72a85011c57394bd028d3',
      size_bytes: PDF.length, media_type: 'application/pdf', storage_key: `orgs/${ORG_A}/docs/00000000-0000-4000-8000-000000000030`,
      original_filename: 'receipt.pdf', uploaded_by: state.userId, ledger_block_id: null, created_at: '2026-10-25T00:00:00.000Z',
    });
    const expected = await crypto.subtle.digest('SHA-256', PDF);
    const expectedHex = Array.from(new Uint8Array(expected), (byte) => byte.toString(16).padStart(2, '0')).join('');
    state.documents[0].sha256 = expectedHex;
    const makeVerifyRequest = (bytes: Uint8Array) => formRequest(`/api/orgs/${ORG_A}/verify-file`, bytes, 'application/pdf', 'receipt.pdf');

    const same = await verify(makeVerifyRequest(PDF), context());
    expect((await body(same)).data.match).toBe(true);
    const altered = PDF.slice();
    altered[altered.length - 1] ^= 1;
    const different = await verify(makeVerifyRequest(altered), context());
    const differentBody = await body(different);
    expect(differentBody.data.match).toBe(false);
    expect(JSON.stringify(differentBody).toLowerCase()).not.toContain('tampered');
  });

  it('returns 403 when a member selects another organisation’s document', async () => {
    state.documents.push({
      id: DOC_ID, org_id: ORG_B, kind: 'receipt', sha256: 'a'.repeat(64), size_bytes: PDF.length,
      media_type: 'application/pdf', storage_key: `orgs/${ORG_B}/docs/00000000-0000-4000-8000-000000000030`,
      original_filename: 'other-receipt.pdf', uploaded_by: state.userId, ledger_block_id: null, created_at: '2026-10-25T00:00:00.000Z',
    });
    const response = await verify(formRequest(`/api/orgs/${ORG_A}/verify-file`, PDF), context());
    expect(response.status).toBe(403);
    expect((await body(response)).error.code).toBe('FORBIDDEN');
  });
});
