// Browser fetch helper (FRANCIS-PHASETASK §2.2): same-origin JSON, {data}/{error} parsing, timeout, Retry-After.
// Never stores tokens. Session is an HTTP-only cookie set by the server (F-03).

import type { ApiEnvelope } from '@/contracts/errors';
import type { SafeError } from '@/contracts/controllers';

export class ApiClientError extends Error {
  readonly safe: SafeError;
  readonly status: number;
  readonly fields?: Record<string, string>;
  constructor(status: number, safe: SafeError, fields?: Record<string, string>) {
    super(safe.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.safe = safe;
    this.fields = fields;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown; // JSON-serialised; pass FormData as `form` instead
  form?: FormData;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 30_000;

function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds * 1000) : undefined;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  opts.signal?.addEventListener('abort', () => controller.abort(), { once: true });

  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form; // the browser sets the multipart boundary
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? (body ? 'POST' : 'GET'),
      headers,
      body,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch {
    // A lost response is "unknown", never "failed" (PRD §G). Callers must not auto-retry a payment POST.
    throw new ApiClientError(0, { code: 'UPSTREAM_UNRESOLVED', message: 'The server did not respond. The outcome is unknown.' });
  } finally {
    clearTimeout(timer);
  }

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    json = null;
  }

  if (res.ok && json && 'data' in json) return json.data;

  const retryAfterMs = parseRetryAfterMs(res.headers.get('Retry-After'));
  if (json && 'error' in json) {
    throw new ApiClientError(res.status, { code: json.error.code, message: json.error.message, retryAfterMs }, json.error.fields);
  }
  throw new ApiClientError(res.status, { code: 'INTERNAL', message: 'Something went wrong.', retryAfterMs });
}
