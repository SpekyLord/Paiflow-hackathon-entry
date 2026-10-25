// Level: MOCKED. Tamper-check route (REQ-DLV-02): the recorded time is the record's own time, and a file altered in any
// way (including a damaged header or a different type) is reported as "does not match", never refused with 415.
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const ORG = '00000000-0000-4000-8000-000000000001';
const DOC = '00000000-0000-4000-8000-000000000020';
const VER = '00000000-0000-4000-8000-000000000003';
const DOC_TIME = '2026-10-20T01:02:03.000Z';
const VER_TIME = '2026-10-21T04:05:06.000Z';
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
const ORIGINAL = new TextEncoder().encode('%PDF-1.7\nthe recorded contract bytes');

vi.mock('@/server/auth/guards', () => ({
  parseUuid: (v: string) => v,
  requireOrgMember: async (orgId: string) => ({ userId: 'u1', orgId, role: 'member' }),
}));
vi.mock('@/server/files/repository', () => ({
  getOrgDocument: async () => ({ id: DOC, org_id: ORG, sha256: sha(ORIGINAL), original_filename: 'contract.pdf', created_at: DOC_TIME }),
  getPlanVersionInOrg: async () => ({ id: VER, version: 2, purpose: 'October budget', plan_sha256: 'b'.repeat(64), created_at: VER_TIME }),
}));

import { POST } from '@/app/api/orgs/[orgId]/verify-file/route';
import { resetRateLimits } from '@/server/http/rate-limit';

function request(bytes: Uint8Array, target: unknown, name = 'file.bin', type = 'application/octet-stream') {
  const form = new FormData();
  form.set('file', new Blob([bytes as BlobPart], { type }), name);
  form.set('target', JSON.stringify(target));
  return new Request('http://localhost:3000/x', { method: 'POST', body: form, headers: { origin: 'http://localhost:3000' } });
}
const ctx = { params: Promise.resolve({ orgId: ORG }) };
const doc = { kind: 'org_document', id: DOC };
const run = async (req: Request) => { const r = await POST(req, ctx); return { status: r.status, json: await r.json() }; };

beforeEach(() => resetRateLimits());

describe('verify-file', () => {
  it('reports the record\'s own saved time, not the time of the check', async () => {
    const { status, json } = await run(request(ORIGINAL, doc));
    expect(status).toBe(200);
    expect(json.data.match).toBe(true);
    expect(json.data.recordedAt).toBe(DOC_TIME);
    const plan = await run(request(ORIGINAL, { kind: 'plan_version', id: VER }));
    expect(plan.json.data.recordedAt).toBe(VER_TIME);
  });

  it('a one-byte change in the FIRST bytes (damaged PDF header) is match:false, not a 415', async () => {
    const damaged = ORIGINAL.slice();
    damaged[0] ^= 1;
    const { status, json } = await run(request(damaged, doc, 'contract.pdf', 'application/pdf'));
    expect(status).toBe(200);
    expect(json.data.match).toBe(false);
    expect(json.data.candidateSha256).toBe(sha(damaged));
  });

  it('a file of a completely different type, a truncated file and an empty file are all match:false', async () => {
    for (const bytes of [new Uint8Array([0x89, 0x50, 0x4e, 0x47]), ORIGINAL.slice(0, 10), new Uint8Array(0)]) {
      const { status, json } = await run(request(bytes, doc, 'x.exe', 'application/x-msdownload'));
      expect([status, json.data.match]).toEqual([200, false]);
    }
  });

  it('never says "tampered"', async () => {
    const { json } = await run(request(new Uint8Array([1, 2, 3]), doc));
    expect(JSON.stringify(json).toLowerCase()).not.toContain('tamper');
  });
});
