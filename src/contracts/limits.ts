// Margins and limits (FRANCIS-PHASETASK §3.1, §3.2). Configurable on the server; these are the defaults.

export const CHALLENGE_TTL_SECONDS = 300;
export const SIGNED_URL_TTL_SECONDS = 300;
export const MAX_UPLOAD_BYTES = 10_485_760;
export const MAX_JSON_BODY_BYTES = 64 * 1024;
export const MAX_PAY_SUBMIT_BODY_BYTES = 210_000;
export const MAX_SIGNED_XDR_CHARS = 200_000;
export const MAX_EVENT_POLLS_PER_SCOPE_PER_HOUR = 40;
export const PAYOUT_EVIDENCE_THRESHOLD_SECONDS = 600;

// SHOULD
export const FUNDING_MARGIN_SECONDS = 600;
export const RELEASE_MARGIN_SECONDS = 120;
export const REFUND_ALERT_SECONDS = 1800;

export const BPS_TOTAL = 10_000;

export const STROOPS_PER_XLM = BigInt(10_000_000); // tsconfig target is ES2017, so no bigint literals

/** `…Stroops` string pattern: positive integer, no leading zero, up to 39 digits. */
export const STROOPS_PATTERN = /^[1-9][0-9]{0,38}$/;
export const G_ADDRESS_PATTERN = /^G[A-Z2-7]{55}$/;
export const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ALLOWED_UPLOAD_MEDIA_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/zip',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;
