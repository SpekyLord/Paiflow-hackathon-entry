import 'server-only';
import { HttpError } from './respond';

// Fixed-window limits, per process. Two budgets per action: a global one (cannot be dodged by spoofing forwarding
// headers) and a per-authenticated-user one (stops one user starving everyone). Keys are user IDs from a verified
// session, never IPs or headers. Recovery/status actions have their own buckets so they are never starved by prepare.
export const LIMITS = {
  request: { global: 600, perUser: 240 },
  signIn: { global: 60, perUser: 8 },
  challenge: { global: 60, perUser: 10 },
  prepare: { global: 40, perUser: 20 },
  submit: { global: 40, perUser: 20 },
  check: { global: 240, perUser: 120 },
  approve: { global: 120, perUser: 30 },
  upload: { global: 60, perUser: 20 },
  verify: { global: 120, perUser: 40 },
} as const;
export type LimitAction = keyof typeof LIMITS;

const WINDOW_MS = 60_000;
const MAX_KEYS = 10_000;
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function take(key: string, max: number, now: number): number | null {
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    if (buckets.size >= MAX_KEYS) for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
    b = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, b);
  }
  if (b.count >= max) return Math.max(1, Math.ceil((b.resetAt - now) / 1000));
  b.count += 1;
  return null;
}

/** Throws 429 RATE_LIMITED with Retry-After. Call after authentication so `userId` is trustworthy. */
export function limit(action: LimitAction, userId?: string, now: number = Date.now()): void {
  const l = LIMITS[action];
  const retry = take(`g:${action}`, l.global, now) ?? (userId ? take(`u:${action}:${userId}`, l.perUser, now) : null);
  if (retry !== null) throw new HttpError('RATE_LIMITED', undefined, { retryAfterSeconds: retry });
}

/** Test helper. */
export function resetRateLimits(): void {
  buckets.clear();
}
