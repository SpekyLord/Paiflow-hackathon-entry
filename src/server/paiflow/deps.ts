import "server-only";
import type { FinancialDb } from "@/server/db/financial-core";
import type { PaiflowDeployment } from "@paiflow/sdk";
import { paiflowDeployment } from "@/server/paiflow/client";
import { toSafePaiflowError } from "@/server/paiflow/errors";
import { createRateLimiter, fail } from "@/server/paiflow/route-kit";

// Everything a payment route touches outside itself, so tests can pass fakes
// and count Paiflow calls.
export interface RouteSession {
  userId: string;
  isOperator: boolean;
}

// The SDK surface payment routes use. Release-early is SHOULD and absent.
export type PaiflowPort = Pick<PaiflowDeployment, "capabilities" | "execute" | "transactions" | "events">;

export interface PaymentDeps {
  db: FinancialDb;
  paiflow(deploymentId: string): PaiflowPort;
  session(request: Request): Promise<RouteSession | null>;
  now(): number;
  sleep(ms: number): Promise<void>;
  // Throws RATE_LIMITED (429) when the user exceeds the bucket.
  rateLimit(bucket: RateBucket, key: string): void;
}

export type RateBucket = "prepare" | "submit" | "check";
// Process-local, which is enough for the single demo server.
const LIMITERS: Record<RateBucket, (key: string) => void> = {
  prepare: createRateLimiter(10, 60_000),
  submit: createRateLimiter(10, 60_000),
  check: createRateLimiter(20, 60_000),
};

export async function requireSession(deps: PaymentDeps, request: Request): Promise<RouteSession> {
  const session = await deps.session(request);
  if (!session) fail("UNAUTHENTICATED");
  return session!;
}

// Wraps one Paiflow call so every SDK failure becomes a SafePaiflowError.
export async function callPaiflow<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw toSafePaiflowError(error);
  }
}

// Session reading belongs to Francis's F-12 (src/server/auth). Until it lands,
// live routes see no session and answer 401 UNAUTHENTICATED, so nothing can
// reach Paiflow without an authenticated, server-checked user.
async function noSessionYet(): Promise<RouteSession | null> {
  return null;
}

export async function liveDeps(): Promise<PaymentDeps> {
  const db = await import("@/server/db/financial");
  return {
    db,
    paiflow: paiflowDeployment,
    session: noSessionYet,
    now: Date.now,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    rateLimit: (bucket, key) => LIMITERS[bucket](key),
  };
}
