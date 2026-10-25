// C-17 (input to G7): negative paths across every Carlos route handler. Level: MOCKED.
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaiflowApiError } from "@paiflow/sdk";

vi.mock("server-only", () => ({}));

import type { PaymentDeps } from "@/server/paiflow/deps";
import { respond } from "@/server/paiflow/route-kit";
import { checkPaymentHandler, preparePaymentHandler, resubmitPaymentHandler, submitPaymentHandler } from "@/server/paiflow/payment";
import { refreshEvidenceHandler } from "@/server/paiflow/evidence";
import { listDeploymentsHandler, registerDeploymentHandler } from "@/server/paiflow/deployments";
import { listReviewsHandler, resolveReviewHandler } from "@/server/paiflow/reviews";
import { walletSummaryHandler } from "@/server/wallet-summary/summary";
import { GET as integrationStatus } from "@/app/api/integration/status/route";
import { ATTEMPT, attemptRow, context, jsonRequest, makeHarness, no, ok, ORG, PLAN, read, USER } from "./harness";

const TOKEN = `pfd_${"e".repeat(64)}`;
const params = { orgId: ORG, planId: PLAN };
const REVIEW = "00000000-0000-4000-8000-000000000030";
const offline = vi.fn(async () => new Response("{}", { status: 500 })) as unknown as typeof fetch;

type Handler = (deps: PaymentDeps, request: Request) => Promise<unknown>;
const MUTATIONS: [string, Handler, unknown][] = [
  ["pay/prepare", (d, r) => preparePaymentHandler(d, r, params), {}],
  ["pay/submit", (d, r) => submitPaymentHandler(d, r, params), { attemptId: ATTEMPT, signedXdr: "x" }],
  ["pay/check", (d, r) => checkPaymentHandler(d, r, params), { attemptId: ATTEMPT }],
  ["pay/resubmit", (d, r) => resubmitPaymentHandler(d, r, params), { attemptId: ATTEMPT, originalTxHash: "a".repeat(64), intent: "resubmit_same_signed_envelope" }],
  ["evidence/refresh", (d, r) => refreshEvidenceHandler(d, r, params, new Map()), {}],
  ["operator/deployments POST", registerDeploymentHandler, {}],
  ["operator/reviews/:id POST", (d, r) => resolveReviewHandler(d, r, REVIEW), {}],
];
const READS: [string, Handler][] = [
  ["operator/deployments GET", listDeploymentsHandler],
  ["operator/reviews GET", listReviewsHandler],
  ["wallet/summary GET", (d, r) => walletSummaryHandler(d, r, offline)],
];

const call = (h: Handler, deps: PaymentDeps, request: Request) => respond(() => h(deps, request)).then(read);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("401 without a session", () => {
  it.each([...MUTATIONS.map(([n, h, b]) => [n, h, b] as const), ...READS.map(([n, h]) => [n, h, {}] as const)])(
    "%s",
    async (_, handler, body) => {
      const h = makeHarness(null);
      const res = await call(handler, h.deps, jsonRequest("/x", body));
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
      expect(h.sdkCalls()).toBe(0);
    },
  );
});

describe("403 cross-origin on every mutation", () => {
  it.each(MUTATIONS)("%s", async (_, handler, body) => {
    const h = makeHarness({ userId: USER, isOperator: true });
    for (const headers of [{ origin: "https://evil.example" }, { "sec-fetch-site": "cross-site" }] as Record<string, string>[]) {
      const res = await call(handler, h.deps, jsonRequest("/x", body, headers));
      expect(res.status).toBe(403);
    }
    expect(h.sdkCalls()).toBe(0);
  });
});

describe("413 for oversize bodies on every mutation", () => {
  it.each(MUTATIONS)("%s", async (_, handler) => {
    const h = makeHarness({ userId: USER, isOperator: true });
    h.db.getPaymentContext.mockResolvedValue(ok(context()));
    const res = await call(handler, h.deps, jsonRequest("/x", JSON.stringify({ pad: "x".repeat(300_000) })));
    expect(res.status).toBe(413);
    expect(h.sdkCalls()).toBe(0);
  });
});

describe("authorisation", () => {
  it("prepare before full approval: 403 PLAN_NOT_APPROVED and 0 Paiflow calls (REQ-BUD-02 AC4)", async () => {
    const h = makeHarness();
    h.db.getPaymentContext.mockResolvedValue(ok(context()));
    h.db.beginPaymentAttempt.mockResolvedValue(no("PLAN_NOT_APPROVED"));
    const res = await call((d, r) => preparePaymentHandler(d, r, params), h.deps, jsonRequest("/x", {}));
    expect(res.body.error.code).toBe("PLAN_NOT_APPROVED");
    expect(h.sdkCalls()).toBe(0);
  });

  it.each(["pay/prepare", "pay/submit", "pay/resubmit"])("%s refuses a non-signer with 403", async (name) => {
    const [, handler, body] = MUTATIONS.find(([n]) => n === name)!;
    const h = makeHarness();
    h.db.getPaymentContext.mockResolvedValue(ok(context({ signerUserId: "00000000-0000-4000-8000-000000000011" })));
    const res = await call(handler, h.deps, jsonRequest("/x", body));
    expect(res.body.error.code).toBe("NOT_SIGNER");
    expect(h.sdkCalls()).toBe(0);
  });

  it.each(["operator/deployments POST", "operator/reviews/:id POST"])("%s refuses a non-operator", async (name) => {
    const [, handler, body] = MUTATIONS.find(([n]) => n === name)!;
    const h = makeHarness({ userId: USER, isOperator: false });
    expect((await call(handler, h.deps, jsonRequest("/x", body))).body.error.code).toBe("OPERATOR_REQUIRED");
  });
});

describe("the Paiflow token never leaves the server", () => {
  it("is absent from every response and console line, even when Paiflow errors echo it", async () => {
    vi.stubEnv("PAIFLOW_API_TOKEN", TOKEN);
    const written: string[] = [];
    for (const m of ["log", "info", "warn", "error", "debug"] as const)
      vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void written.push(a.map(String).join(" ")));
    const leak = new PaiflowApiError(502, "bad_gateway", `upstream said ${TOKEN}`, { token: TOKEN }, { token: TOKEN }, { status: 502 });

    const h = makeHarness({ userId: USER, isOperator: true });
    h.db.getPaymentContext.mockResolvedValue(ok(context()));
    h.db.beginPaymentAttempt.mockResolvedValue(ok({ outcome: "created", attempt: attemptRow(), context: context() }));
    h.db.failPreparation.mockResolvedValue(ok({}));
    h.db.listDeployments.mockResolvedValue([]);
    h.db.getAttempt.mockResolvedValue(attemptRow({ originalTxHash: "a".repeat(64), signedXdr: "s", state: "unknown", preparedXdr: "u" }));
    h.db.recordSubmission.mockResolvedValue(ok(attemptRow({ originalTxHash: "a".repeat(64), signedXdr: "s", state: "unknown" })));
    h.db.recordStatusCheck.mockResolvedValue(ok(attemptRow({ originalTxHash: "a".repeat(64), signedXdr: "s", state: "unknown" })));
    for (const fn of [h.paiflow.execute.prepare, h.paiflow.execute.submit, h.paiflow.transactions.get, h.paiflow.capabilities.get])
      fn.mockRejectedValue(leak);

    const responses = [];
    for (const [, handler, body] of MUTATIONS) {
      const recipients = [0, 1, 2].map((i) => ({ position: i, address: `G${"ABC"[i].repeat(54)}2`, bps: [5000, 3000, 2000][i], label: null }));
      const payload = handler === registerDeploymentHandler ? { deploymentId: PLAN, template: "budget_split", splitRecipients: recipients } : body;
      responses.push(await respond(() => handler(h.deps, jsonRequest("/x", payload))).then((r) => r.text()));
    }
    for (const [, handler] of READS) responses.push(await respond(() => handler(h.deps, jsonRequest("/x", {}))).then((r) => r.text()));
    responses.push(await (await integrationStatus()).text());

    const everything = [...responses, ...written].join("\n");
    expect(h.paiflow.execute.prepare).toHaveBeenCalled(); // the leaky error really was produced
    expect(everything).not.toContain(TOKEN);
    expect(everything).not.toContain("e".repeat(64));
    expect(everything).not.toMatch(/pf[dk]_[a-f0-9]{64}/);
  });
});
