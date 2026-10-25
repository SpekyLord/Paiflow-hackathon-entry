import { vi, type Mock } from "vitest";
import type { FinancialDb, PaymentAttemptRow, PaymentContext } from "@/server/db/financial-core";
import type { PaymentDeps, PaiflowPort, RouteSession } from "@/server/paiflow/deps";

// Fakes for payment route tests. Every DB function and Paiflow call is a
// vi.fn, so tests assert call order and counts (e.g. 0 SDK calls).
const DB_METHODS = [
  "getPaymentContext", "getOpenAttempt", "getAttempt", "getLatestAttempt", "listScopesNeedingReconciliation", "beginPaymentAttempt",
  "recordPreparation", "failPreparation", "markSignatureRequested", "persistSignedEnvelope", "recordEnvelopeRejection",
  "recordSubmission", "recordStatusCheck", "markExpiredUnsigned", "recordPaymentReceiptVerification",
  "recordEnvelopePayoutVerification", "upsertPaiflowEvents", "getEventCursor", "advanceEventCursor", "listStoredEvents",
  "acquireReconcileLease", "releaseReconcileLease", "consumeReconcileBudget", "registerDeployment", "setDeploymentStatus",
  "listDeployments", "openOperatorReview", "listOperatorReviews", "resolveOperatorReview", "getWalletContext",
] as const;

export type FakeDb = { [K in (typeof DB_METHODS)[number]]: Mock };
export interface FakePaiflow {
  capabilities: { get: Mock };
  execute: { prepare: Mock; submit: Mock };
  transactions: { get: Mock };
  events: { list: Mock };
}

export const ORG = "00000000-0000-4000-8000-000000000001";
export const PLAN = "00000000-0000-4000-8000-000000000002";
export const DEPLOYMENT = "00000000-0000-4000-8000-000000000004";
export const ATTEMPT = "00000000-0000-4000-8000-000000000005";
export const USER = "00000000-0000-4000-8000-000000000010";
export const SIGNER = `G${"S".repeat(54)}2`;

export function makeHarness(session: RouteSession | null = { userId: USER, isOperator: false }) {
  const db = Object.fromEntries(DB_METHODS.map((m) => [m, vi.fn(async () => ({ ok: false, code: "INTERNAL" }))])) as FakeDb;
  const paiflow: FakePaiflow = {
    capabilities: { get: vi.fn() },
    execute: { prepare: vi.fn(), submit: vi.fn() },
    transactions: { get: vi.fn() },
    events: { list: vi.fn() },
  };
  let clock = Date.parse("2026-10-25T05:00:00Z");
  const deps: PaymentDeps = {
    db: db as unknown as FinancialDb,
    paiflow: vi.fn(() => paiflow as unknown as PaiflowPort),
    session: vi.fn(async () => session),
    now: () => clock,
    sleep: vi.fn(async (ms: number) => {
      clock += ms;
    }),
    rateLimit: vi.fn(),
  };
  const sdkCalls = () =>
    paiflow.capabilities.get.mock.calls.length +
    paiflow.execute.prepare.mock.calls.length +
    paiflow.execute.submit.mock.calls.length +
    paiflow.transactions.get.mock.calls.length +
    paiflow.events.list.mock.calls.length;
  return { db, paiflow, deps, sdkCalls, advance: (ms: number) => (clock += ms), now: () => clock };
}

export const ok = <T>(value: T) => ({ ok: true as const, value });
export const no = (code: string) => ({ ok: false as const, code });
export const sdk = <T>(data: T, metadata: Record<string, string> = {}) => ({ data, metadata: { status: 200, ...metadata } });

export function context(patch: Partial<PaymentContext> = {}): PaymentContext {
  return {
    scope: { kind: "plan", planId: PLAN },
    orgId: ORG,
    state: "approved",
    versionId: "00000000-0000-4000-8000-000000000003",
    planSha256: "1".padStart(64, "0"),
    deploymentId: DEPLOYMENT,
    signerAddress: SIGNER,
    signerUserId: USER,
    totalStroops: "10000000",
    asset: { kind: "native" },
    envelopes: [
      { position: 0, label: "Operations", bps: 5000, recipientAddress: `G${"A".repeat(54)}2`, expectedShareStroops: "5000000" },
      { position: 1, label: "Payroll", bps: 3000, recipientAddress: `G${"B".repeat(54)}2`, expectedShareStroops: "3000000" },
      { position: 2, label: "Supplies", bps: 2000, recipientAddress: `G${"C".repeat(54)}2`, expectedShareStroops: "2000000" },
    ],
    viewerBinding: { address: SIGNER, verifiedAt: "2026-10-25T04:00:00Z" },
    ...patch,
  };
}

export function attemptRow(patch: Partial<PaymentAttemptRow> = {}): PaymentAttemptRow {
  return {
    id: ATTEMPT,
    budgetPlanId: PLAN,
    planVersionId: "00000000-0000-4000-8000-000000000003",
    deploymentId: DEPLOYMENT,
    fromAddress: SIGNER,
    amountStroops: "10000000",
    asset: { kind: "native" },
    network: null,
    networkPassphrase: null,
    preparedXdr: null,
    originalTxHash: null,
    historyRequestId: null,
    expiresAt: null,
    feeStroops: null,
    signatureRequestedAt: null,
    signedXdr: null,
    signedBodyHash: null,
    submitStatus: null,
    submitOutcome: null,
    finalStatus: null,
    ledger: null,
    lastRequestId: null,
    lastCheckedAt: null,
    state: "preparing",
    resolution: null,
    createdBy: USER,
    createdAt: "2026-10-25T05:00:00Z",
    updatedAt: "2026-10-25T05:00:00Z",
    ...patch,
  };
}

export function jsonRequest(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { origin: "http://localhost:3000", "content-type": "application/json", ...headers },
  });
}

export async function read(response: Response) {
  return { status: response.status, body: await response.json(), headers: response.headers };
}
