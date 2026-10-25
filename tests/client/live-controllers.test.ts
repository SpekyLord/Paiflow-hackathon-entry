import { describe, expect, it, vi } from "vitest";
import { paymentReviewFixture, planDetailFixture, sessionFixture } from "@/contracts/fixtures";
import type { PaymentAttemptViewDTO } from "@/contracts/dto";
import { ApiClientError } from "@/client/http";
import { FreighterError } from "@/client/wallet/freighter";
import type { LivePorts } from "@/client/controllers/live/ports";
import { createLivePayment, phaseFor } from "@/client/controllers/live/payment-machine";
import { createLiveBinding, createLiveEvidence, createLiveFreighter } from "@/client/controllers/live/machines";

vi.mock("@stellar/freighter-api", () => ({}));

const ORG = "o";
const PLAN = "p";
const review = paymentReviewFixture();
const bound = sessionFixture().binding!.address;
const view = (patch: Partial<PaymentAttemptViewDTO> = {}): PaymentAttemptViewDTO => ({
  attemptId: review.attemptId, state: "submitted", originalTxHash: review.originalTxHash, expiresAt: review.expiresAt,
  submittedAt: "t", finalStatus: "PENDING", ledger: null, hasSignedEnvelope: true, lastCheckedAt: "t", ...patch,
});
const apiError = (code: string, status = 403) => new ApiClientError(status, { code: code as never, message: code });

function ports(patch: Partial<Record<string, unknown>> = {}) {
  const freighter = {
    connect: vi.fn(async () => bound),
    refresh: vi.fn(async () => bound),
    isOnTestnet: vi.fn(async () => true),
    signChallenge: vi.fn(async () => "c2lnbmF0dXJl"),
    signPrepared: vi.fn(async () => "SIGNED-XDR"),
  };
  return {
    getMe: vi.fn(async () => sessionFixture()),
    getPlan: vi.fn(async () => planDetailFixture("approved")),
    preparePlanPayment: vi.fn(async () => review),
    submitPlanPayment: vi.fn(async () => view({ finalStatus: "SUCCESS", state: "success" })),
    checkPlanPayment: vi.fn(async () => view({ finalStatus: "SUCCESS", state: "success" })),
    resubmitPlanPayment: vi.fn(async () => view()),
    refreshPlanEvidence: vi.fn(async () => planDetailFixture("payment_confirmed", { partial: true })),
    challenge: vi.fn(async () => ({ challengeId: "ch", message: "CYFER binding", expiresAt: "t" })),
    bind: vi.fn(async () => ({ address: bound, verifiedAt: "now" })),
    freighter,
    ...patch,
  } as unknown as LivePorts & { freighter: typeof freighter } & Record<string, ReturnType<typeof vi.fn>>;
}

describe("live usePayment", () => {
  it("prepares, signs with the bound address and submits; the modal never sees the XDR", async () => {
    const p = ports();
    const m = createLivePayment(ORG, PLAN, p);
    await m.start();
    expect(m.getSnapshot().phase).toBe("review");
    expect(m.getSnapshot().review).not.toHaveProperty("xdr");
    expect(m.getSnapshot().review).not.toHaveProperty("networkPassphrase");
    await m.signAndSubmit();
    expect(p.freighter.signPrepared).toHaveBeenCalledWith(review, bound);
    expect(p.submitPlanPayment).toHaveBeenCalledWith(ORG, PLAN, review.attemptId, "SIGNED-XDR");
    expect(m.getSnapshot()).toMatchObject({ phase: "confirmed", busy: false });
  });

  it("runs one read-only check when the submit outcome is not final", async () => {
    const p = ports({ submitPlanPayment: vi.fn(async () => view()) });
    const m = createLivePayment(ORG, PLAN, p);
    await m.start();
    await m.signAndSubmit();
    expect(p.checkPlanPayment).toHaveBeenCalledTimes(1);
    expect(m.getSnapshot().phase).toBe("confirmed");
    expect(p.resubmitPlanPayment).not.toHaveBeenCalled();
  });

  it.each<[string, Record<string, unknown>, string]>([
    ["an unapproved plan", { preparePlanPayment: vi.fn(async () => { throw apiError("PLAN_NOT_APPROVED"); }) }, "refused_not_approved"],
    ["an open attempt elsewhere", { preparePlanPayment: vi.fn(async () => { throw apiError("ATTEMPT_UNRESOLVED", 409); }) }, "unresolved"],
  ])("maps %s on start", async (_, patch, phase) => {
    const m = createLivePayment(ORG, PLAN, ports(patch));
    await m.start();
    expect(m.getSnapshot().phase).toBe(phase);
  });

  it.each<[string, Error, string]>([
    ["an expired preparation", new FreighterError("PREPARATION_EXPIRED", "expired"), "expired"],
    ["a changed wallet", new FreighterError("FREIGHTER_WRONG_ACCOUNT", "changed"), "wallet_changed"],
    ["a declined signature", new FreighterError("SIGNATURE_DECLINED", "declined"), "review"],
  ])("maps %s while signing and never submits", async (_, error, phase) => {
    const p = ports();
    p.freighter.signPrepared.mockRejectedValue(error);
    const m = createLivePayment(ORG, PLAN, p);
    await m.start();
    await m.signAndSubmit();
    expect(m.getSnapshot().phase).toBe(phase);
    expect(p.submitPlanPayment).not.toHaveBeenCalled();
  });

  it("treats a lost submit response as unresolved and does not retry", async () => {
    const p = ports({ submitPlanPayment: vi.fn(async () => { throw apiError("UPSTREAM_UNRESOLVED", 0); }) });
    const m = createLivePayment(ORG, PLAN, p);
    await m.start();
    await m.signAndSubmit();
    expect(m.getSnapshot().phase).toBe("unresolved");
    expect(p.submitPlanPayment).toHaveBeenCalledTimes(1);
    expect(p.preparePlanPayment).toHaveBeenCalledTimes(1);
  });

  it("rehydrates the same attempt and original hash after a reload, without preparing", async () => {
    const plan = { ...planDetailFixture("payment_pending"), payment: view({ state: "unknown", finalStatus: "UNKNOWN" }) };
    const p = ports({ getPlan: vi.fn(async () => plan) });
    const m = createLivePayment(ORG, PLAN, p);
    await m.rehydrate();
    expect(m.getSnapshot()).toMatchObject({ phase: "unresolved", attempt: { originalTxHash: review.originalTxHash } });
    expect(p.preparePlanPayment).not.toHaveBeenCalled();
  });

  it("resubmits the same envelope only when one is stored", async () => {
    const p = ports();
    const m = createLivePayment(ORG, PLAN, p);
    await m.resubmitSameEnvelope();
    expect(p.resubmitPlanPayment).not.toHaveBeenCalled();
    vi.mocked(p.getPlan).mockResolvedValue({ ...planDetailFixture("payment_pending"), payment: view({ state: "unknown", finalStatus: "UNKNOWN" }) });
    await m.rehydrate();
    await m.resubmitSameEnvelope();
    expect(p.resubmitPlanPayment).toHaveBeenCalledWith(ORG, PLAN, review.attemptId, review.originalTxHash);
  });

  it("maps attempt views to phases without ever saying failed for unknowns", () => {
    expect(phaseFor(view({ finalStatus: "NOT_FOUND", state: "pending" }))).toBe("unresolved");
    expect(phaseFor(view({ finalStatus: "UNKNOWN", state: "operator_review" }))).toBe("unresolved");
    expect(phaseFor(view({ finalStatus: "FAILED", state: "failed" }))).toBe("failed");
    expect(phaseFor(view({ state: "expired_unsigned", finalStatus: null }))).toBe("expired");
  });
});

describe("live usePlanEvidence", () => {
  it("reloads and refreshes at least 15 s apart", async () => {
    let t = 0;
    const p = ports();
    const m = createLiveEvidence(ORG, PLAN, p, () => t);
    await m.reload();
    expect(m.getSnapshot()).toMatchObject({ loading: false, plan: { state: "approved" } });
    t = 1;
    await m.refreshEvidence();
    expect(m.getSnapshot().plan!.payoutsVerified.verified).toBe(2);
    await m.refreshEvidence();
    expect(m.getSnapshot().error).toMatchObject({ code: "RATE_LIMITED" });
    expect(p.refreshPlanEvidence).toHaveBeenCalledTimes(1);
  });
});

describe("live useWalletBinding and useFreighter", () => {
  it("binds through challenge → signMessage → bind", async () => {
    const p = ports({ getMe: vi.fn(async () => ({ ...sessionFixture(), binding: null })) });
    const m = createLiveBinding(p);
    await m.load();
    expect(m.getSnapshot().phase).toBe("idle");
    await m.bind();
    expect(p.challenge).toHaveBeenCalledWith(bound);
    expect(p.freighter.signChallenge).toHaveBeenCalledWith("CYFER binding", bound);
    expect(p.bind).toHaveBeenCalledWith({ challengeId: "ch", address: bound, signedMessage: "c2lnbmF0dXJl", signerAddress: bound });
    expect(m.getSnapshot()).toMatchObject({ phase: "bound", binding: { address: bound } });
  });

  it("flags a Freighter account that differs from the binding", async () => {
    const p = ports();
    p.freighter.refresh.mockResolvedValue(`G${"Q".repeat(54)}2`);
    const m = createLiveBinding(p);
    await m.load();
    expect(m.getSnapshot().freighterMatchesBinding).toBe(false);
  });

  it("reports Freighter status", async () => {
    const p = ports();
    const f = createLiveFreighter(p);
    await f.refresh();
    expect(f.getSnapshot()).toMatchObject({ status: "connected", address: bound });
    p.freighter.isOnTestnet.mockResolvedValue(false);
    await f.refresh();
    expect(f.getSnapshot().status).toBe("wrong_network");
    p.freighter.refresh.mockRejectedValue(new FreighterError("FREIGHTER_NOT_INSTALLED", "install"));
    await f.refresh();
    expect(f.getSnapshot()).toMatchObject({ status: "not_installed", address: null });
  });
});
