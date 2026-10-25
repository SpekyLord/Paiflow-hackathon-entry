import 'server-only';
import { DEFAULT_ERROR_MESSAGE, ERROR_HTTP_STATUS, type ApiErrorBody, type ErrorCode } from '@/contracts/errors';

/** Throw this from a route or guard. Messages must be safe: no tokens, XDR, SQL or other users' data. */
export class HttpError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message?: string,
    readonly opts: { retryAfterSeconds?: number; fields?: Record<string, string> } = {},
  ) {
    super(message ?? DEFAULT_ERROR_MESSAGE[code]);
    this.status = ERROR_HTTP_STATUS[code];
  }
}

const NO_STORE = { 'Cache-Control': 'private, no-store' };

export function ok<T>(data: T, init?: { status?: number; headers?: Record<string, string> }): Response {
  return Response.json({ data }, { status: init?.status ?? 200, headers: { ...NO_STORE, ...init?.headers } });
}

export function fail(e: HttpError): Response {
  const body: ApiErrorBody = { error: { code: e.code, message: e.message, ...(e.opts.fields ? { fields: e.opts.fields } : {}) } };
  const headers: Record<string, string> = { ...NO_STORE };
  if (e.opts.retryAfterSeconds) headers['Retry-After'] = String(e.opts.retryAfterSeconds);
  return Response.json(body, { status: e.status, headers });
}

/**
 * Wrap a route body. Success -> {data}; HttpError -> {error}. Anything else is a safe 500: the real error is logged
 * by name only (never message or stack, which could carry SQL, tokens or XDR).
 * `mapError` lets another module turn its own errors (for example Paiflow's) into an HttpError before the fallback.
 */
export async function handle<T>(action: () => Promise<T>, mapError?: (e: unknown) => HttpError | null): Promise<Response> {
  try {
    return ok(await action());
  } catch (e) {
    if (e instanceof HttpError) return fail(e);
    const mapped = mapError?.(e) ?? null;
    if (mapped) return fail(mapped);
    console.error('[http] unhandled error', e instanceof Error ? e.name : typeof e);
    return fail(new HttpError('INTERNAL'));
  }
}
