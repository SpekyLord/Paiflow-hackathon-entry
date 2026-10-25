import "server-only";
import { PaiflowApiError, PaiflowTransportError } from "@paiflow/sdk";
import { PaiflowNotConfiguredError } from "@/server/paiflow/config";

// Browser-visible codes from the shared error contract (Francis §3.3).
export type PaiflowSafeCode =
  | "PAIFLOW_NOT_CONFIGURED"
  | "RATE_LIMITED"
  | "VALIDATION"
  | "NOT_FOUND"
  | "UPSTREAM_UNRESOLVED";

const MESSAGES: Record<PaiflowSafeCode, string> = {
  PAIFLOW_NOT_CONFIGURED: "Paiflow is not configured on the server.",
  RATE_LIMITED: "Too many requests. Wait before trying again.",
  VALIDATION: "Paiflow refused the request.",
  NOT_FOUND: "Paiflow has no record for this request.",
  UPSTREAM_UNRESOLVED:
    "The Paiflow outcome is unknown. Keep the original payment record and check its status; do not pay again.",
};

export class SafePaiflowError extends Error {
  constructor(
    readonly status: number,
    readonly code: PaiflowSafeCode,
    // Server-side diagnostics only; never raw Paiflow messages.
    readonly requestId: string | null,
    readonly retryAfterSeconds: number | null,
    readonly upstreamStatus: number | null,
    readonly upstreamCode: string | null,
  ) {
    super(MESSAGES[code]);
    this.name = "SafePaiflowError";
  }
}

export function toSafePaiflowError(error: unknown): SafePaiflowError {
  if (error instanceof SafePaiflowError) return error;
  if (error instanceof PaiflowNotConfiguredError)
    return new SafePaiflowError(503, "PAIFLOW_NOT_CONFIGURED", null, null, null, null);
  if (error instanceof PaiflowApiError) {
    const requestId = error.metadata.requestId ?? null;
    const make = (status: number, code: PaiflowSafeCode, retry: number | null = null) =>
      new SafePaiflowError(status, code, requestId, retry, error.status, error.code);
    if (error.status === 401 || error.status === 403)
      return make(503, "PAIFLOW_NOT_CONFIGURED");
    if (error.status === 404) return make(404, "NOT_FOUND");
    if (error.status === 400 || error.status === 422)
      return make(422, "VALIDATION");
    if (error.status === 429)
      return make(429, "RATE_LIMITED", parseRetryAfter(error.metadata.retryAfter));
    return make(502, "UPSTREAM_UNRESOLVED");
  }
  // Transport, timeout, abort, malformed response or anything unexpected:
  // the request may have reached Paiflow, so the outcome is unknown, never failed.
  const requestId =
    error instanceof PaiflowTransportError && "metadata" in error
      ? ((error.metadata as { requestId?: string }).requestId ?? null)
      : null;
  return new SafePaiflowError(502, "UPSTREAM_UNRESOLVED", requestId, null, null, null);
}

export function safeErrorResponse(error: SafePaiflowError): Response {
  const headers = new Headers();
  if (error.retryAfterSeconds !== null)
    headers.set("Retry-After", String(error.retryAfterSeconds));
  return Response.json(
    { error: { code: error.code, message: error.message } },
    { status: error.status, headers },
  );
}

// Logs only the safe code, statuses and request ID; never messages, bodies or tokens.
export function logPaiflowError(context: string, error: unknown) {
  const safe = toSafePaiflowError(error);
  console.error(
    `[paiflow] ${context}: ${safe.code}`,
    JSON.stringify({
      status: safe.status,
      upstreamStatus: safe.upstreamStatus,
      upstreamCode: safe.upstreamCode,
      requestId: safe.requestId,
    }),
  );
}

export function parseRetryAfter(value: string | undefined): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value.trim())) return Number(value.trim());
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return null;
  return Math.max(0, Math.ceil((at - Date.now()) / 1000));
}
