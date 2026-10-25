// Level: DB (cyfai-sme-dev). Runs Carlos's REAL route handlers, reconcile pass and event ingestion against the REAL
// SQL functions (migrations 002-010) through Francis's createFinancialDb. Only Paiflow is faked. Every test runs in a
// transaction that is ALWAYS rolled back, so nothing is left in the database.
// Run: CYFER_PG_DIR=<dir with node_modules/pg> npm run test:db
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { Account, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

vi.mock("server-only", () => ({}));

import { createFinancialDb } from "@/server/db/financial-core";
import type { PaymentDeps, PaiflowPort } from "@/server/paiflow/deps";
import { checkPaymentHandler, preparePaymentHandler, submitPaymentHandler } from "@/server/paiflow/payment";
import { reconcilePlan } from "@/server/paiflow/reconcile";
import { ingestEvents } from "@/server/paiflow/events";
import { respond } from "@/server/paiflow/route-kit";
import { PAY_PAYOUT_SHAPE } from "@/server/paiflow/verify";
import { envelopeHash } from "@/lib/stellar/envelope";
import { connectPg, pgSupabase } from "./pg-supabase";

type Pg = Awaited<ReturnType<typeof connectPg>>;
let pg: Pg;
beforeAll(async () => {
  pg = await connectPg();
});
afterAll(async () => pg?.end());
beforeEach(async () => void (await pg.query("begin")));
afterEach(async () => void (await pg.query("rollback")));

const q = async (sql: string, params: unknown[] = []) => (await pg.query(sql, params)).rows;
const addr = (c: string) => `G${c.repeat(54)}2`;
const SPLIT = [
  { position: 0, label: "Operations", bps: 5000, recipientAddress: addr("A") },
  { position: 1, label: "Payroll", bps: 3000, recipientAddress: addr("B") },
  { position: 2, label: "Supplies", bps: 2000, recipientAddress: addr("C") },
];
const SHARES = ["5000000", "3000000", "2000000"];
function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`;
}

// A fresh org, owner (signer, bound to a real keypair), two approvers, a member and an available Split deployment.
async function fixture({ approve = true } = {}) {
  const signer = Keypair.random();
  const ids = Object.fromEntries(["owner", "a1", "a2", "member"].map((k) => [k, randomUUID()])) as Record<string, string>;
  const wallets: Record<string, string> = { owner: signer.publicKey(), a1: Keypair.random().publicKey(), a2: Keypair.random().publicKey(), member: Keypair.random().publicKey() };
  for (const [k, id] of Object.entries(ids)) {
    await q("insert into auth.users(id, aud, role, email) values ($1,'authenticated','authenticated',$2)", [id, `${k}-${id}@example.test`]);
    await q("insert into public.profiles(user_id, display_name, is_operator) values ($1,$2,false)", [id, k]);
  }
  const orgId = randomUUID();
  await q("insert into public.organisations(id, name) values ($1,'Payments flow test')", [orgId]);
  for (const [k, role] of [["owner", "owner"], ["a1", "approver"], ["a2", "approver"], ["member", "member"]]) {
    await q("insert into public.org_memberships(org_id, user_id, role) values ($1,$2,$3)", [orgId, ids[k], role]);
    await q("insert into public.wallet_bindings(user_id, address) values ($1,$2)", [ids[k], wallets[k]]);
  }
  // Another fixture's available deployment would make the match ambiguous (CL-11); retire them inside this transaction.
  await q("update public.paiflow_deployments set status='retired' where status='available'");
  const deploymentId = randomUUID();
  await q(
    "insert into public.paiflow_deployments(id, template, split_recipients, graph_snapshot_sha256, status) values ($1,'budget_split',$2::jsonb,$3,'available')",
    [deploymentId, JSON.stringify(SPLIT.map((e) => ({ position: e.position, address: e.recipientAddress, bps: e.bps, label: e.label }))), "1".padStart(64, "0")],
  );
  const envelopes = SPLIT.map((e) => ({ ...e, planningPhpCentavos: null }));
  const text = canonical({ asset: { kind: "native" }, deploymentId, envelopes, purpose: "Flow test", signerAddress: signer.publicKey(), totalStroops: "10000000" });
  const input = { purpose: "Flow test", totalStroops: "10000000", signerUserId: ids.owner, envelopes, canonicalText: text, planSha256: createHash("sha256").update(text).digest("hex") };
  type Rpc<T = unknown> = { ok: boolean; value: T };
  const created = (await q("select public.create_budget_plan($1,$2,$3::jsonb) r", [ids.owner, orgId, JSON.stringify(input)]))[0]
    .r as Rpc<{ planId: string; versionId: string; planSha256: string }>;
  expect(created.ok, JSON.stringify(created)).toBe(true);
  const { planId, versionId, planSha256 } = created.value;
  if (approve)
    for (const who of ["owner", "a1", "a2"]) {
      const r = (await q("select public.decide_budget_plan($1,$2,$3,$4,'approved',null) r", [ids[who], planId, versionId, planSha256]))[0].r as Rpc;
      expect(r.ok, JSON.stringify(r)).toBe(true);
    }
  return { signer, ids, orgId, planId, deploymentId };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;

// Fake Paiflow: prepare returns a real Testnet envelope from the signer's account.
function fakePaiflow(f: Fixture, opts: { submit?: () => Promise<unknown>; status?: string; events?: unknown[] } = {}) {
  const tx = new TransactionBuilder(new Account(f.signer.publicKey(), "1"), { fee: "100", networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.manageData({ name: "cyfer", value: "flow" }))
    .setTimeout(180)
    .build();
  const xdr = tx.toXDR();
  const hash = envelopeHash(xdr);
  const calls = { prepare: 0, submit: 0, status: 0, events: 0 };
  const port = {
    capabilities: { get: vi.fn() },
    execute: {
      prepare: vi.fn(async () => (calls.prepare++, { data: { network: "testnet", networkPassphrase: Networks.TESTNET, xdr, expiresAt: new Date(Date.now() + 180_000).toISOString() }, metadata: { status: 200, historyRequestId: "hist-flow" } })),
      submit: vi.fn(async () => (calls.submit++, opts.submit ? opts.submit() : { data: { txHash: hash, status: "PENDING" }, metadata: { status: 200 } })),
    },
    transactions: {
      get: vi.fn(async () => (calls.status++, { data: { txHash: hash, network: "testnet", status: opts.status ?? "SUCCESS", ledger: 42 }, metadata: { status: 200 } })),
    },
    events: { list: vi.fn(async () => (calls.events++, { data: { items: opts.events ?? [], nextCursor: null, hasMore: false }, metadata: { status: 200 } })) },
  };
  const sign = () => {
    const signed = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
    signed.sign(f.signer);
    return signed.toXDR();
  };
  return { port: port as unknown as PaiflowPort, calls, hash, sign };
}

function deps(f: Fixture, paiflow: PaiflowPort, userId = f.ids.owner): PaymentDeps {
  return {
    db: createFinancialDb(pgSupabase(pg)),
    paiflow: () => paiflow,
    session: async () => ({ userId, isOperator: false }),
    now: Date.now,
    sleep: async () => {},
    rateLimit: () => {},
    planDetail: async () => {
      throw new Error("not used");
    },
  };
}
const post = (body: unknown) =>
  new Request("http://localhost:3000/api/x", { method: "POST", body: JSON.stringify(body), headers: { origin: "http://localhost:3000", "content-type": "application/json" } });
const run = async (fn: () => Promise<unknown>) => {
  const res = await respond(fn);
  return { status: res.status, body: await res.json() };
};
const planState = async (planId: string) => (await q("select state from public.budget_plans where id=$1", [planId]))[0].state;
const event = (n: number, hash: string, kind: string, topic: string, data: unknown) => ({
  id: `${n}`, eventId: `${hash.slice(0, 8)}-evt-${n}`, kind, topic, ledger: 42, txHash: hash, occurredAt: new Date().toISOString(), data,
});

describe("payments against the real SQL", () => {
  it("refuses prepare before full approval with PLAN_NOT_APPROVED and 0 Paiflow calls", async () => {
    const f = await fixture({ approve: false });
    const p = fakePaiflow(f);
    const res = await run(() => preparePaymentHandler(deps(f, p.port), post({}), { orgId: f.orgId, planId: f.planId }));
    expect(res.body.error.code).toBe("PLAN_NOT_APPROVED");
    expect(p.calls.prepare + p.calls.submit + p.calls.status).toBe(0);
    expect(await planState(f.planId)).toBe("pending_approval");
  });

  it("refuses a member who is not the signer", async () => {
    const f = await fixture();
    const p = fakePaiflow(f);
    const res = await run(() => preparePaymentHandler(deps(f, p.port, f.ids.member), post({}), { orgId: f.orgId, planId: f.planId }));
    expect(res.status).toBe(403);
    expect(p.calls.prepare).toBe(0);
  });

  it("runs prepare → submit → status → reconcile to a verified distribution", async () => {
    const f = await fixture();
    const p = fakePaiflow(f);
    const d = deps(f, p.port);
    const params = { orgId: f.orgId, planId: f.planId };

    const prepared = await run(() => preparePaymentHandler(d, post({}), params));
    expect(prepared.status, JSON.stringify(prepared.body)).toBe(200);
    expect(prepared.body.data.originalTxHash).toBe(p.hash);
    const stored = (await q("select state, prepared_xdr is not null as has_xdr, history_request_id from public.payment_attempts where id=$1", [prepared.body.data.attemptId]))[0];
    expect(stored).toMatchObject({ state: "signing", has_xdr: true, history_request_id: "hist-flow" });
    expect(await planState(f.planId)).toBe("payment_pending");

    // CL-06: the same attempt comes back, with no second Paiflow prepare.
    const again = await run(() => preparePaymentHandler(d, post({}), params));
    expect(again.body.data).toMatchObject({ attemptId: prepared.body.data.attemptId, outcome: "existing" });
    expect(p.calls.prepare).toBe(1);

    const submitted = await run(() => submitPaymentHandler(d, post({ attemptId: prepared.body.data.attemptId, signedXdr: p.sign() }), params));
    expect(submitted.status, JSON.stringify(submitted.body)).toBe(200);
    expect(submitted.body.data).toMatchObject({ state: "success", finalStatus: "SUCCESS", hasSignedEnvelope: true });
    expect(JSON.stringify(submitted.body)).not.toContain("hist-flow");
    expect(await planState(f.planId)).toBe("payment_confirmed");

    const events = [
      event(1, p.hash, "RECEIVE", "deposit", { from: f.signer.publicKey(), amount: "10000000", asset: "XLM" }),
      ...SPLIT.map((e, i) => event(10 + i, p.hash, "PAYOUT", "pay", { recipient: e.recipientAddress, payment: SHARES[i], asset: "XLM" })),
    ];
    const withEvents = fakePaiflow(f, { events });
    const summary = await reconcilePlan(deps(f, withEvents.port), { planId: f.planId, actorUserId: f.ids.owner, holder: "db-test", payoutShape: PAY_PAYOUT_SHAPE });
    expect(summary).toMatchObject({ status: "ran", receipt: "verified", payouts: { verified: 3, total: 3 } });
    expect(await planState(f.planId)).toBe("distribution_verified");
    const rows = await q("select kind, state from public.payout_verifications where budget_plan_id=$1 order by kind, envelope_position", [f.planId]);
    expect(rows.filter((r) => r.state === "verified")).toHaveLength(4);
    expect(withEvents.calls.prepare + withEvents.calls.submit).toBe(0);
  });

  it("keeps the plan pending with 2 of 3 payouts, and marks a short payout as mismatch", async () => {
    const f = await fixture();
    const p = fakePaiflow(f);
    const d = deps(f, p.port);
    const params = { orgId: f.orgId, planId: f.planId };
    const prepared = await run(() => preparePaymentHandler(d, post({}), params));
    await run(() => submitPaymentHandler(d, post({ attemptId: prepared.body.data.attemptId, signedXdr: p.sign() }), params));
    const deposit = event(1, p.hash, "RECEIVE", "deposit", { from: f.signer.publicKey(), amount: "10000000", asset: "XLM" });
    const two = SPLIT.slice(0, 2).map((e, i) => event(10 + i, p.hash, "PAYOUT", "pay", { recipient: e.recipientAddress, payment: SHARES[i], asset: "XLM" }));

    const partial = fakePaiflow(f, { events: [deposit, ...two] });
    const s1 = await reconcilePlan(deps(f, partial.port), { planId: f.planId, actorUserId: f.ids.owner, holder: "db-test", payoutShape: PAY_PAYOUT_SHAPE });
    expect(s1.payouts).toEqual({ verified: 2, total: 3 });
    expect(await planState(f.planId)).toBe("payment_confirmed");

    const short = event(12, p.hash, "PAYOUT", "pay", { recipient: SPLIT[2].recipientAddress, payment: "1999999", asset: "XLM" });
    const withShort = fakePaiflow(f, { events: [deposit, ...two, short] });
    await reconcilePlan(deps(f, withShort.port), { planId: f.planId, actorUserId: f.ids.owner, holder: "db-test", payoutShape: PAY_PAYOUT_SHAPE });
    expect(await planState(f.planId)).toBe("mismatch");
  });

  it("keeps a changed envelope as evidence and leaves the attempt unchanged", async () => {
    const f = await fixture();
    const p = fakePaiflow(f);
    const d = deps(f, p.port);
    const params = { orgId: f.orgId, planId: f.planId };
    const prepared = await run(() => preparePaymentHandler(d, post({}), params));
    const other = new TransactionBuilder(new Account(f.signer.publicKey(), "1"), { fee: "100", networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.manageData({ name: "cyfer", value: "changed" }))
      .setTimeout(180)
      .build();
    other.sign(f.signer);
    const res = await run(() => submitPaymentHandler(d, post({ attemptId: prepared.body.data.attemptId, signedXdr: other.toXDR() }), params));
    expect(res.body.error.code).toBe("ENVELOPE_CHANGED");
    expect(p.calls.submit).toBe(0);
    const kept = await q("select reason from public.payment_envelope_rejections where attempt_id=$1", [prepared.body.data.attemptId]);
    expect(kept.map((r) => r.reason)).toEqual(["BODY_CHANGED"]);
    expect((await q("select state from public.payment_attempts where id=$1", [prepared.body.data.attemptId]))[0].state).toBe("signing");
  });

  it("records a lost submit and a 404 status as unresolved; check never submits", async () => {
    const f = await fixture();
    const { PaiflowTimeoutError, PaiflowApiError } = await import("@paiflow/sdk");
    const p = fakePaiflow(f, { submit: async () => { throw new PaiflowTimeoutError(); } });
    vi.mocked(p.port.transactions.get).mockRejectedValue(new PaiflowApiError(404, "not_found", "m", null, null, { status: 404 }));
    const d = deps(f, p.port);
    const params = { orgId: f.orgId, planId: f.planId };
    const prepared = await run(() => preparePaymentHandler(d, post({}), params));
    const submitted = await run(() => submitPaymentHandler(d, post({ attemptId: prepared.body.data.attemptId, signedXdr: p.sign() }), params));
    expect(submitted.status, JSON.stringify(submitted.body)).toBe(200);
    expect(submitted.body.data.state).not.toMatch(/success|failed/);
    expect(await planState(f.planId)).toBe("payment_pending");

    const checked = await run(() => checkPaymentHandler(deps(f, p.port, f.ids.member), post({ attemptId: prepared.body.data.attemptId }), params));
    expect(checked.status, JSON.stringify(checked.body)).toBe(200);
    expect(checked.body.data.finalStatus).not.toBe("FAILED");
    expect(p.calls.submit).toBe(1);
    expect(p.calls.prepare).toBe(1);
  });

  it("ingests events once (dedupe on event_id) and moves the cursor forward", async () => {
    const f = await fixture();
    const hash = "e".repeat(64);
    const items = [event(1, hash, "PAYOUT", "pay", { recipient: addr("A"), payment: "1", asset: "XLM" })];
    const db = createFinancialDb(pgSupabase(pg));
    const port = {
      events: { list: vi.fn(async () => ({ data: { items, nextCursor: "cursor-1", hasMore: false }, metadata: {} })) },
    } as unknown as PaiflowPort;
    const d = { ...deps(f, port), db };
    const first = await ingestEvents(d, { deploymentId: f.deploymentId, holder: "db-test" });
    const second = await ingestEvents(d, { deploymentId: f.deploymentId, holder: "db-test" });
    expect(first).toMatchObject({ status: "ran", inserted: 1, complete: true });
    expect(second.inserted).toBe(0);
    expect(await db.getEventCursor(f.deploymentId, "all")).toBe("cursor-1");
    expect(vi.mocked(port.events.list).mock.calls[1][0]).toEqual({ limit: 100, cursor: "cursor-1" });
  });

  it("lets only one holder take a reconcile lease", async () => {
    const db = createFinancialDb(pgSupabase(pg));
    const key = `reconcile:plan:${randomUUID()}`;
    expect(await db.acquireReconcileLease(key, "a", 60)).toBe(true);
    expect(await db.acquireReconcileLease(key, "b", 60)).toBe(false);
    await db.releaseReconcileLease(key, "a");
    expect(await db.acquireReconcileLease(key, "b", 60)).toBe(true);
  });
});
