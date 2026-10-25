import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createMockPayment } from "@/client/controllers/mock/payment-machine";
import { createMockEvidence } from "@/client/controllers/mock/evidence-machine";
import { DEFAULT_SCENARIO, parseScenario, type FixtureScenario } from "@/client/controllers/mock/scenario";
import { validateRegistration, validateResolution, operatorFixtures } from "@/client/controllers/mock/operator";
import { getControllerMode } from "@/client/controllers/mode";

const scenario = (patch: Partial<FixtureScenario> = {}) => () => ({ ...DEFAULT_SCENARIO, delayMs: 10, ...patch });
// Runs an action while advancing fake timers until it settles.
async function run(action: Promise<void>) {
  await vi.runAllTimersAsync();
  await action;
}

beforeEach(() => vi.useFakeTimers({ now: new Date("2026-10-25T05:00:00Z") }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("mock usePayment flow", () => {
  it("goes review → confirmed without exposing the XDR", async () => {
    const m = createMockPayment(scenario());
    await run(m.start());
    expect(m.getSnapshot().phase).toBe("review");
    expect(m.getSnapshot().review).not.toHaveProperty("xdr");
    expect(m.getSnapshot().review).not.toHaveProperty("networkPassphrase");
    await run(m.signAndSubmit());
    expect(m.getSnapshot()).toMatchObject({ phase: "confirmed", busy: false, attempt: { state: "success", finalStatus: "SUCCESS" } });
  });

  it("returns the existing attempt on a second start (CL-06)", async () => {
    const m = createMockPayment(scenario());
    await run(m.start());
    const first = m.getSnapshot().review!;
    await run(m.start());
    expect(m.getSnapshot().review).toMatchObject({ attemptId: first.attemptId, outcome: "existing" });
  });

  it.each<[FixtureScenario["payment"], string]>([
    ["wallet_changed", "wallet_changed"],
    ["expired", "expired"],
    ["unresolved", "unresolved"],
    ["failed", "failed"],
  ])("simulates %s", async (payment, phase) => {
    const m = createMockPayment(scenario({ payment }));
    await run(m.start());
    await run(m.signAndSubmit());
    expect(m.getSnapshot().phase).toBe(phase);
  });

  it("refuses an unapproved plan before review", async () => {
    const m = createMockPayment(scenario({ payment: "refused_not_approved" }));
    await run(m.start());
    expect(m.getSnapshot()).toMatchObject({ phase: "refused_not_approved", review: null, error: { code: "PLAN_NOT_APPROVED" } });
    await run(m.signAndSubmit());
    expect(m.getSnapshot().phase).toBe("refused_not_approved");
  });

  it("only resubmits the same envelope from an unresolved outcome", async () => {
    const m = createMockPayment(scenario({ payment: "unresolved" }));
    await run(m.resubmitSameEnvelope());
    expect(m.getSnapshot().phase).toBe("idle");
    await run(m.start());
    await run(m.signAndSubmit());
    const hash = m.getSnapshot().attempt!.originalTxHash;
    await run(m.resubmitSameEnvelope());
    expect(m.getSnapshot().attempt!.originalTxHash).toBe(hash);
  });

  it("stops checking into an unresolved state", async () => {
    const m = createMockPayment(scenario());
    await run(m.start());
    const pending = m.signAndSubmit();
    await vi.advanceTimersByTimeAsync(25); // signature + submit done, check in flight
    expect(m.getSnapshot().phase).toBe("checking");
    m.stopChecking();
    await vi.runAllTimersAsync();
    await pending;
    expect(m.getSnapshot()).toMatchObject({ phase: "unresolved", busy: false });
  });
});

describe("mock usePlanEvidence flow", () => {
  it("advances payment → 2 of 3 → distribution verified, at least 15 s apart", async () => {
    const m = createMockEvidence(scenario({ planState: "payment_pending" }));
    await run(m.reload());
    expect(m.getSnapshot().plan!.state).toBe("payment_pending");

    await run(m.refreshEvidence());
    expect(m.getSnapshot().plan!.payoutsVerified.verified).toBe(0);
    await run(m.refreshEvidence());
    expect(m.getSnapshot().error).toMatchObject({ code: "RATE_LIMITED" });

    vi.advanceTimersByTime(15_000);
    await run(m.refreshEvidence());
    const partial = m.getSnapshot().plan!;
    expect(partial.state).toBe("payment_confirmed");
    expect(partial.payoutsVerified).toEqual({ verified: 2, total: 3 });

    vi.advanceTimersByTime(15_000);
    await run(m.refreshEvidence());
    expect(m.getSnapshot().plan!.state).toBe("distribution_verified");
    expect(m.getSnapshot().lastRefreshedAt).not.toBeNull();
  });

  it("does not move a mismatch", async () => {
    const m = createMockEvidence(scenario({ planState: "mismatch" }));
    await run(m.reload());
    await run(m.refreshEvidence());
    expect(m.getSnapshot().plan!.state).toBe("mismatch");
  });
});

describe("scenario", () => {
  it("parses URL parameters and ignores unknown values", () => {
    expect(parseScenario("?fixturePlan=payment_confirmed&fixturePartial=1&fixturePayment=unresolved&fixtureWallet=unavailable&fixtureDelay=0")).toMatchObject({
      planState: "payment_confirmed",
      partial: true,
      payment: "unresolved",
      wallet: "unavailable",
      delayMs: 0,
    });
    expect(parseScenario("?fixturePlan=paid&fixturePayment=x&fixtureDelay=-1")).toEqual(DEFAULT_SCENARIO);
  });
});

describe("operator fixtures", () => {
  it("validates registrations and resolutions", () => {
    const entry = operatorFixtures().deployments[0];
    expect(validateRegistration(entry)).toBeNull();
    const recipients = entry.splitRecipients!;
    expect(validateRegistration({ ...entry, splitRecipients: [{ ...recipients[0], bps: 4000 }, ...recipients.slice(1)] })?.code).toBe("BPS_TOTAL_INVALID");
    expect(validateRegistration({ ...entry, splitRecipients: recipients.map((r) => ({ ...r, address: recipients[0].address })) })?.code).toBe("DUPLICATE_RECIPIENT");
    expect(validateResolution({ outcome: "no_action", justification: "  ", evidence: { notes: "" } })?.code).toBe("VALIDATION");
  });
});

describe("controller mode", () => {
  it("is fixture only with the flag outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_CYFER_FIXTURES", "1");
    expect(getControllerMode()).toBe("fixture");
    vi.stubEnv("NODE_ENV", "production");
    expect(getControllerMode()).toBe("live");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_CYFER_FIXTURES", "");
    expect(getControllerMode()).toBe("live");
  });
});

describe("mock isolation", () => {
  it("never imports Freighter, the Paiflow SDK or server code", () => {
    const dir = join(process.cwd(), "src/client/controllers/mock");
    for (const file of readdirSync(dir)) {
      const source = readFileSync(join(dir, file), "utf8");
      expect(source, file).not.toMatch(/@stellar\/freighter-api|@paiflow\/sdk|@\/server\//);
    }
  });
});
