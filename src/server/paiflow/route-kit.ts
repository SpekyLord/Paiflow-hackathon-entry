import "server-only";
import { DEFAULT_ERROR_MESSAGE, ERROR_HTTP_STATUS, type ErrorCode } from "@/contracts/errors";
import { MAX_JSON_BODY_BYTES } from "@/contracts/limits";
import { SafePaiflowError, logPaiflowError } from "@/server/paiflow/errors";

// Request plumbing for Carlos's payment routes. It follows the shared error
// envelope (Francis §3.1, §3.3). Swap for src/server/http once F-12 lands.

export class RouteError extends Error {
  constructor(
    readonly code: ErrorCode,
    message?: string,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message ?? DEFAULT_ERROR_MESSAGE[code]);
    this.name = "RouteError";
  }
}

export const fail = (code: ErrorCode, message?: string): never => {
  throw new RouteError(code, message);
};

export async function respond(action: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json({ data: await action() });
  } catch (error) {
    if (error instanceof RouteError) return errorResponse(error.code, error.message, error.retryAfterSeconds);
    if (error instanceof SafePaiflowError) {
      logPaiflowError("route", error);
      return errorResponse(error.code, error.message, error.retryAfterSeconds);
    }
    console.error("[payments] unexpected error", error instanceof Error ? error.name : typeof error);
    return errorResponse("INTERNAL");
  }
}

function errorResponse(code: ErrorCode, message = DEFAULT_ERROR_MESSAGE[code], retryAfter: number | null = null) {
  return Response.json(
    { error: { code, message } },
    {
      status: ERROR_HTTP_STATUS[code],
      headers: retryAfter !== null ? { "Retry-After": String(retryAfter) } : undefined,
    },
  );
}

// Every mutation needs a same-origin Origin header and a JSON body.
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site")
    fail("FORBIDDEN", "Same-origin requests required.");
  const type = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (type !== "application/json") fail("UNSUPPORTED_MEDIA_TYPE");
}

// Limits bytes while streaming, before decoding or parsing the body.
export async function readJson(request: Request, limit = MAX_JSON_BODY_BYTES): Promise<Record<string, unknown>> {
  const declared = request.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > limit) fail("REQUEST_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) fail("VALIDATION_SHAPE", "Expected a JSON body.");
  const bytes = new Uint8Array(limit);
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      if (size + value.byteLength > limit) {
        await reader!.cancel();
        fail("REQUEST_TOO_LARGE");
      }
      bytes.set(value, size);
      size += value.byteLength;
    }
  } finally {
    reader!.releaseLock();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, size)));
  } catch {
    fail("VALIDATION_SHAPE", "Invalid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) fail("VALIDATION_SHAPE");
  return parsed as Record<string, unknown>;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TX_HASH = /^[a-f0-9]{64}$/;

export function requireUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID.test(value)) fail("VALIDATION_SHAPE", `Invalid ${field}.`);
  return value as string;
}

// Process-local fixed-window limiter, enough for the single demo server.
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, { start: number; count: number }>();
  return (key: string) => {
    const t = now();
    const entry = hits.get(key);
    if (!entry || t - entry.start >= windowMs) {
      hits.set(key, { start: t, count: 1 });
      return;
    }
    entry.count += 1;
    if (entry.count > limit)
      throw new RouteError("RATE_LIMITED", undefined, Math.ceil((entry.start + windowMs - t) / 1000));
  };
}
