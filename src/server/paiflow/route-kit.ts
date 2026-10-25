import "server-only";
import { DEFAULT_ERROR_MESSAGE, ERROR_HTTP_STATUS, type ErrorCode } from "@/contracts/errors";
import { MAX_JSON_BODY_BYTES } from "@/contracts/limits";
import { SafePaiflowError, logPaiflowError } from "@/server/paiflow/errors";
import { HttpError } from "@/server/http/respond";

// Request plumbing for Carlos's payment routes, following the shared error
// envelope (Francis §3.1, §3.3). It also renders Francis's HttpError, which
// his auth guards and rate limiter throw.

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
    return Response.json({ data: await action() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof RouteError) return errorResponse(error.code, error.message, error.retryAfterSeconds);
    if (error instanceof HttpError) return errorResponse(error.code, error.message, error.opts.retryAfterSeconds ?? null);
    if (error instanceof SafePaiflowError) {
      logPaiflowError("route", error);
      return errorResponse(error.code, error.message, error.retryAfterSeconds);
    }
    console.error("[payments] unexpected error", error instanceof Error ? error.name : typeof error);
    return errorResponse("INTERNAL");
  }
}

function errorResponse(code: ErrorCode, message = DEFAULT_ERROR_MESSAGE[code], retryAfter: number | null = null) {
  const headers: Record<string, string> = { "Cache-Control": "private, no-store" };
  if (retryAfter !== null) headers["Retry-After"] = String(retryAfter);
  return Response.json({ error: { code, message } }, { status: ERROR_HTTP_STATUS[code], headers });
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
