// Safe, browser-visible error codes (FRANCIS-PHASETASK §3.3).
// Messages never include tokens, XDR, SQL, stack traces or other users' data.

export const ERROR_HTTP_STATUS = {
  VALIDATION_SHAPE: 400,
  CHALLENGE_INVALID: 400,
  SIGNATURE_INVALID: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_MEMBER: 403,
  NOT_PARTICIPANT: 403,
  OPERATOR_REQUIRED: 403,
  WALLET_MISMATCH: 403,
  PLAN_NOT_APPROVED: 403, // REQ-BUD-02 AC4 refusal
  NOT_SIGNER: 403,
  APPROVAL_REQUIRED: 403,
  NOT_FOUND: 404,
  STATE_CONFLICT: 409,
  STALE_VERSION: 409,
  NO_SPLIT_DEPLOYMENT: 409,
  AMBIGUOUS_DEPLOYMENT_MATCH: 409,
  ADDRESS_ALREADY_BOUND: 409,
  BINDING_LOCKED: 409,
  EDIT_AFTER_PAYMENT: 409,
  ATTEMPT_UNRESOLVED: 409,
  RESUBMIT_NOT_ALLOWED: 409,
  // SHOULD
  NO_MATCHING_DEPLOYMENT: 409,
  EDIT_AFTER_FUNDING: 409,
  DEADLINE_MARGIN: 409,
  NOT_PREPARED: 409,
  RELEASE_EXISTS: 409,
  REQUEST_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  VALIDATION: 422,
  ENVELOPES_MISMATCH_DEPLOYMENT: 422,
  BPS_TOTAL_INVALID: 422,
  DUPLICATE_RECIPIENT: 422,
  APPROVER_SET_INVALID: 422,
  ENVELOPE_CHANGED: 422,
  CAPABILITY_MISMATCH: 422,
  // SHOULD
  DEADLINE_PASSED: 422,
  NOTHING_TO_RELEASE: 422,
  RATE_LIMITED: 429,
  UPSTREAM_UNRESOLVED: 502, // outcome unknown, never "failed"
  BALANCE_UNAVAILABLE: 502,
  PAIFLOW_NOT_CONFIGURED: 503,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_HTTP_STATUS;

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; fields?: Record<string, string> };
}
export interface ApiSuccessBody<T> {
  data: T;
}
export type ApiEnvelope<T> = ApiSuccessBody<T> | ApiErrorBody;

/** Generic, safe default message per code. Routes may supply a more specific safe message. */
export const DEFAULT_ERROR_MESSAGE: Record<ErrorCode, string> = {
  VALIDATION_SHAPE: 'The request is malformed.',
  CHALLENGE_INVALID: 'The wallet challenge is expired, used or unknown. Request a new one.',
  SIGNATURE_INVALID: 'The wallet signature could not be verified.',
  UNAUTHENTICATED: 'Sign in to continue.',
  FORBIDDEN: 'You are not allowed to do this.',
  NOT_MEMBER: 'You are not a member of this organisation.',
  NOT_PARTICIPANT: 'You are not a participant in this deal.',
  OPERATOR_REQUIRED: 'This action is for the operator only.',
  WALLET_MISMATCH: 'Your connected wallet does not match your verified wallet binding.',
  PLAN_NOT_APPROVED: 'This plan is not fully approved yet. Payment was not started.',
  NOT_SIGNER: 'Only the authorised signer can do this.',
  APPROVAL_REQUIRED: 'Approval is required first.',
  NOT_FOUND: 'Not found.',
  STATE_CONFLICT: 'This action is not available in the current state.',
  STALE_VERSION: 'A newer version exists. Reload and review it.',
  NO_SPLIT_DEPLOYMENT: 'No available Split deployment is registered.',
  AMBIGUOUS_DEPLOYMENT_MATCH: 'More than one deployment matches. Ask the operator.',
  ADDRESS_ALREADY_BOUND: 'This wallet address is already bound to another account.',
  BINDING_LOCKED: 'This wallet is the signer of an open plan and cannot be unbound.',
  EDIT_AFTER_PAYMENT: 'A payment already exists, so the plan can no longer be edited.',
  ATTEMPT_UNRESOLVED: 'A payment attempt is unresolved. Do not pay again; check its status.',
  RESUBMIT_NOT_ALLOWED: 'Resubmitting the signed envelope is not allowed now.',
  NO_MATCHING_DEPLOYMENT: 'No matching deployment is available.',
  EDIT_AFTER_FUNDING: 'The deal is funded, so its terms can no longer be edited.',
  DEADLINE_MARGIN: 'Too close to the deadline to start funding.',
  NOT_PREPARED: 'No prepared payment exists.',
  RELEASE_EXISTS: 'A release was already requested for this deal.',
  REQUEST_TOO_LARGE: 'The request is too large.',
  UNSUPPORTED_MEDIA_TYPE: 'This content or file type is not supported.',
  VALIDATION: 'Some fields are invalid.',
  ENVELOPES_MISMATCH_DEPLOYMENT: 'The envelopes do not match the registered Split deployment.',
  BPS_TOTAL_INVALID: 'Envelope shares must total exactly 10,000 basis points.',
  DUPLICATE_RECIPIENT: 'Two envelopes use the same recipient address.',
  APPROVER_SET_INVALID: 'The approver set must include at least one person other than the owner.',
  ENVELOPE_CHANGED: 'The signed transaction does not match the prepared one.',
  CAPABILITY_MISMATCH: 'The deployment capabilities do not match what was declared.',
  DEADLINE_PASSED: 'The deadline has passed.',
  NOTHING_TO_RELEASE: 'There is nothing to release.',
  RATE_LIMITED: 'Too many requests. Try again shortly.',
  UPSTREAM_UNRESOLVED: 'The outcome is unknown. Do not pay again; check the status.',
  BALANCE_UNAVAILABLE: 'The balance is unavailable right now.',
  PAIFLOW_NOT_CONFIGURED: 'The payment service is not configured.',
  INTERNAL: 'Something went wrong.',
};

/** Result type for the persistence layer (§3.6). Domain conflicts never throw. */
export type DbResult<T> = { ok: true; value: T } | { ok: false; code: ErrorCode };
