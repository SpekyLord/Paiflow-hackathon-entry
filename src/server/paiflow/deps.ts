import "server-only";
import type { BudgetPlanDetailDTO } from "@/contracts/dto";
import type { FinancialDb } from "@/server/db/financial-core";
import type { PaiflowDeployment } from "@paiflow/sdk";
import { paiflowDeployment } from "@/server/paiflow/client";
import { toSafePaiflowError } from "@/server/paiflow/errors";
import { fail } from "@/server/paiflow/route-kit";
import { readTxCredits } from "@/server/wallet-summary/horizon";

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
  // Francis's F-17 plan detail for this viewer.
  planDetail(orgId: string, planId: string, userId: string): Promise<BudgetPlanDetailDTO>;
  // Horizon native credits of the original tx (HO-04); null when unreadable.
  // Optional so existing fakes keep working: absent means "not read".
  txCredits?(txHash: string): Promise<{ address: string; amountStroops: string }[] | null>;
}

export type RateBucket = "prepare" | "submit" | "check";

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

// Francis's F-12 cookie session: getUser() verifies it with the auth server,
// and roles come from server tables only. No profile means no session.
async function readSession(): Promise<RouteSession | null> {
  const { getAuthUserId, loadSession } = await import("@/server/auth/session");
  const userId = await getAuthUserId();
  if (!userId) return null;
  const session = await loadSession(userId);
  return session ? { userId, isOperator: session.isOperator } : null;
}

export async function liveDeps(): Promise<PaymentDeps> {
  const [db, { limit }, { detailFor }] = await Promise.all([
    import("@/server/db/financial"),
    import("@/server/http/rate-limit"),
    import("@/server/business/service"),
  ]);
  return {
    db,
    paiflow: paiflowDeployment,
    session: readSession,
    now: Date.now,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    // Shared per-process buckets (global + per user) from Francis's F-12.
    rateLimit: (bucket, key) => limit(bucket, key),
    planDetail: detailFor,
    txCredits: (txHash) => readTxCredits(txHash),
  };
}
