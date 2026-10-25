import 'server-only';
import { MAX_JSON_BODY_BYTES } from '@/contracts/limits';
import { HttpError } from './respond';

/** Read up to `limit` bytes while streaming; 413 as soon as the limit is crossed, before decoding or parsing. */
export async function readLimitedBytes(request: Request, limit: number): Promise<Uint8Array> {
  const declared = request.headers.get('content-length');
  if (declared && /^\d+$/.test(declared) && Number(declared) > limit) throw new HttpError('REQUEST_TOO_LARGE');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError('VALIDATION_SHAPE', 'A request body is required.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError('REQUEST_TOO_LARGE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

export async function readJson(request: Request, limit: number = MAX_JSON_BODY_BYTES): Promise<unknown> {
  const bytes = await readLimitedBytes(request, limit);
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new HttpError('VALIDATION_SHAPE', 'The request body is not valid JSON.');
  }
}

/** Plain-object guard for route validation. */
export function asRecord(v: unknown): Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new HttpError('VALIDATION_SHAPE');
  return v as Record<string, unknown>;
}
