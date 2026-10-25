import { describe, expect, it } from "vitest";
import {
  Asset,
  Keypair,
  Networks,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  assertOriginal,
  envelopeHash,
  feeStroops,
  inspectEnvelope,
  isSignedBy,
} from "@/lib/stellar/envelope";
import { matchesNativeAsset } from "@/lib/stellar/asset";
import { EXPLORER_LABEL, stellarExpertTxUrl } from "@/lib/explorer";
import {
  buildFixtureTransaction,
  fixtureKeypair,
  fixtureTransaction,
  fixtureUnsignedXdr,
} from "../fixtures/paiflow/transaction-fixture";

function signed(xdr: string) {
  const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  tx.sign(fixtureKeypair);
  return tx.toXDR();
}

describe("envelope helpers", () => {
  const hash = envelopeHash(fixtureUnsignedXdr);

  it("hashes the body as 64 lower-case hex", () => {
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(Buffer.from(fixtureTransaction.hash()).toString("hex"));
  });

  it("accepts a signature-only change", () => {
    const signedXdr = signed(fixtureUnsignedXdr);
    expect(signedXdr).not.toBe(fixtureUnsignedXdr);
    expect(envelopeHash(signedXdr)).toBe(hash);
    expect(() => assertOriginal(fixtureUnsignedXdr, signedXdr, hash)).not.toThrow();
  });

  it("rejects a changed body", () => {
    const changed = signed(buildFixtureTransaction("changed").toXDR());
    expect(() => assertOriginal(fixtureUnsignedXdr, changed, hash)).toThrow(
      "changed the original transaction body",
    );
  });

  it("rejects fee-bump envelopes", () => {
    const inner = TransactionBuilder.fromXDR(
      signed(fixtureUnsignedXdr),
      Networks.TESTNET,
    );
    const feeBump = TransactionBuilder.buildFeeBumpTransaction(
      Keypair.fromRawEd25519Seed(Buffer.alloc(32, 9)),
      "200",
      inner as Parameters<typeof TransactionBuilder.buildFeeBumpTransaction>[2],
      Networks.TESTNET,
    ).toXDR();
    expect(() => envelopeHash(feeBump)).toThrow("Fee-bump");
    expect(() => feeStroops(feeBump)).toThrow("Fee-bump");
  });

  it("rejects unparseable envelopes", () => {
    expect(() => envelopeHash("not-xdr")).toThrow();
  });

  it("classifies envelopes without throwing", () => {
    expect(inspectEnvelope(signed(fixtureUnsignedXdr))).toEqual({ kind: "transaction", hash });
    expect(inspectEnvelope("not-xdr")).toEqual({ kind: "unparseable" });
    const inner = TransactionBuilder.fromXDR(signed(fixtureUnsignedXdr), Networks.TESTNET);
    const feeBump = TransactionBuilder.buildFeeBumpTransaction(
      Keypair.fromRawEd25519Seed(Buffer.alloc(32, 9)),
      "200",
      inner as Parameters<typeof TransactionBuilder.buildFeeBumpTransaction>[2],
      Networks.TESTNET,
    ).toXDR();
    expect(inspectEnvelope(feeBump)).toEqual({ kind: "fee_bump" });
  });

  it("checks the envelope is signed by the expected account", () => {
    const signedXdr = signed(fixtureUnsignedXdr);
    expect(isSignedBy(signedXdr, fixtureKeypair.publicKey())).toBe(true);
    expect(isSignedBy(fixtureUnsignedXdr, fixtureKeypair.publicKey())).toBe(false);
    expect(isSignedBy(signedXdr, Keypair.fromRawEd25519Seed(Buffer.alloc(32, 8)).publicKey())).toBe(false);
    expect(isSignedBy("not-xdr", fixtureKeypair.publicKey())).toBe(false);
  });

  it("reads the fee in stroops", () => {
    expect(feeStroops(buildFixtureTransaction("fixture", "12345").toXDR())).toBe(
      "12345",
    );
  });
});

describe("matchesNativeAsset", () => {
  it("accepts the XLM symbol and the Testnet native contract", () => {
    expect(matchesNativeAsset("XLM")).toBe(true);
    expect(
      matchesNativeAsset(Asset.native().contractId(Networks.TESTNET)),
    ).toBe(true);
  });

  it("rejects other assets and the mainnet native contract", () => {
    expect(matchesNativeAsset("USDC")).toBe(false);
    expect(matchesNativeAsset("xlm")).toBe(false);
    expect(matchesNativeAsset(undefined)).toBe(false);
    expect(
      matchesNativeAsset(Asset.native().contractId(Networks.PUBLIC)),
    ).toBe(false);
  });
});

describe("stellarExpertTxUrl", () => {
  it("builds a testnet link", () => {
    expect(stellarExpertTxUrl("a".repeat(64))).toBe(
      `https://stellar.expert/explorer/testnet/tx/${"a".repeat(64)}`,
    );
    expect(EXPLORER_LABEL).toBe("Stellar Expert (testnet)");
  });

  it.each(["", "A".repeat(64), "a".repeat(63), "../x"])(
    "rejects %s",
    (value) => expect(() => stellarExpertTxUrl(value)).toThrow(),
  );
});
