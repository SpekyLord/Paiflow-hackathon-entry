// Level: MOCKED (pure request/response handling, no network). F-12 acceptance: 413 before parsing, cross-origin 403,
// safe errors, rate limits with Retry-After.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { readJson } from '@/server/http/json';
import { readMultipart } from '@/server/http/multipart';
import { sameOrigin } from '@/server/http/origin';
import { LIMITS, limit, resetRateLimits } from '@/server/http/rate-limit';
import { HttpError, handle } from '@/server/http/respond';

const url = 'http://localhost:3000/api/x';
const post = (body: BodyInit | null, headers: Record<string, string> = {}) =>
  new Request(url, { method: 'POST', body, headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', ...headers } });

async function errOf(p: Promise<unknown>): Promise<HttpError> {
  try { await p; } catch (e) { return e as HttpError; }
  throw new Error('expected an error');
}

describe('readJson', () => {
  it('parses valid JSON', async () => {
    expect(await readJson(post('{"a":1}'))).toEqual({ a: 1 });
  });
  it('returns 413 from the declared length before reading the body', async () => {
    const e = await errOf(readJson(post('{}', { 'content-length': '999999' })));
    expect([e.code, e.status]).toEqual(['REQUEST_TOO_LARGE', 413]);
  });
  it('returns 413 while streaming when there is no content-length, and never parses the oversize body', async () => {
    const parse = vi.spyOn(JSON, 'parse');
    const big = new ReadableStream<Uint8Array>({
      pull(c) { c.enqueue(new Uint8Array(40 * 1024)); },
    });
    const req = new Request(url, { method: 'POST', body: big, headers: { 'content-type': 'application/json' }, duplex: 'half' } as RequestInit);
    const e = await errOf(readJson(req));
    expect(e.code).toBe('REQUEST_TOO_LARGE');
    expect(parse).not.toHaveBeenCalled();
    parse.mockRestore();
  });
  it('rejects invalid JSON and invalid UTF-8 as VALIDATION_SHAPE', async () => {
    expect((await errOf(readJson(post('{nope')))).code).toBe('VALIDATION_SHAPE');
    expect((await errOf(readJson(post(new Uint8Array([0x7b, 0xff, 0x7d]))))).code).toBe('VALIDATION_SHAPE');
  });
});

describe('sameOrigin', () => {
  it('accepts a same-origin JSON request', () => {
    expect(() => sameOrigin(post('{}'))).not.toThrow();
  });
  it('rejects a cross-origin, missing-origin or cross-site request with 403', () => {
    for (const h of [{ origin: 'https://evil.example' }, { 'sec-fetch-site': 'cross-site' }] as Record<string, string>[]) {
      expect(() => sameOrigin(post('{}', h))).toThrowError(expect.objectContaining({ code: 'FORBIDDEN', status: 403 }));
    }
    const noOrigin = new Request(url, { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } });
    expect(() => sameOrigin(noOrigin)).toThrowError(expect.objectContaining({ status: 403 }));
  });
  it('requires the right content type', () => {
    expect(() => sameOrigin(post('x', { 'content-type': 'text/plain' }))).toThrowError(expect.objectContaining({ status: 415 }));
    expect(() => sameOrigin(post('x', { 'content-type': 'multipart/form-data; boundary=x' }), 'multipart')).not.toThrow();
  });
});

describe('readMultipart', () => {
  it('reads one file and fields', async () => {
    const fd = new FormData();
    fd.set('kind', 'contract');
    fd.set('file', new Blob([new Uint8Array([1, 2, 3])], { type: 'application/pdf' }), 'a.pdf');
    const req = new Request(url, { method: 'POST', body: fd, headers: { origin: 'http://localhost:3000' } });
    const r = await readMultipart(req);
    expect(r.fields).toEqual({ kind: 'contract' });
    expect(Array.from(r.file!.bytes)).toEqual([1, 2, 3]);
  });
  it('returns 413 for an oversize upload before parsing', async () => {
    const fd = new FormData();
    fd.set('file', new Blob([new Uint8Array(70_000)]), 'big.bin');
    const req = new Request(url, { method: 'POST', body: fd });
    const e = await errOf(readMultipart(req, 100));
    expect(e.status).toBe(413);
  });
  it('rejects two files', async () => {
    const fd = new FormData();
    fd.append('file', new Blob(['a']), 'a.txt');
    fd.append('file', new Blob(['b']), 'b.txt');
    const e = await errOf(readMultipart(new Request(url, { method: 'POST', body: fd })));
    expect(e.code).toBe('VALIDATION_SHAPE');
  });
});

describe('rate limits', () => {
  beforeEach(() => resetRateLimits());
  it('429 with Retry-After after the per-user budget', () => {
    const now = 1_000_000;
    for (let i = 0; i < LIMITS.prepare.perUser; i++) limit('prepare', 'u1', now);
    let e: HttpError | null = null;
    try { limit('prepare', 'u1', now + 1000); } catch (x) { e = x as HttpError; }
    expect(e?.code).toBe('RATE_LIMITED');
    expect(e?.opts.retryAfterSeconds).toBeGreaterThan(0);
    expect(() => limit('prepare', 'u2', now + 1000)).not.toThrow(); // another user is unaffected
  });
  it('keeps recovery (check) separate from prepare', () => {
    const now = 5_000_000;
    for (let i = 0; i < LIMITS.prepare.perUser; i++) limit('prepare', 'u1', now);
    expect(() => limit('check', 'u1', now)).not.toThrow();
  });
  it('resets after the window', () => {
    const now = 9_000_000;
    for (let i = 0; i < LIMITS.signIn.perUser; i++) limit('signIn', 'email:a', now);
    expect(() => limit('signIn', 'email:a', now)).toThrow();
    expect(() => limit('signIn', 'email:a', now + 61_000)).not.toThrow();
  });
});

describe('handle', () => {
  it('wraps success as {data}', async () => {
    const res = await handle(async () => ({ a: 1 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { a: 1 } });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });
  it('maps HttpError to {error} with its status and Retry-After', async () => {
    const res = await handle(async () => { throw new HttpError('RATE_LIMITED', undefined, { retryAfterSeconds: 7 }); });
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('7');
    expect((await res.json()).error.code).toBe('RATE_LIMITED');
  });
  it('turns unknown errors into a safe 500 and logs only the error name', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await handle(async () => { throw new Error('select * from payment_attempts SECRET-XDR'); });
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).not.toContain('SECRET-XDR');
    expect(JSON.stringify(spy.mock.calls)).not.toContain('SECRET-XDR');
    spy.mockRestore();
  });
  it('lets another module map its own errors', async () => {
    class Custom extends Error {}
    const res = await handle(async () => { throw new Custom('x'); }, (e) => (e instanceof Custom ? new HttpError('UPSTREAM_UNRESOLVED') : null));
    expect(res.status).toBe(502);
  });
});
