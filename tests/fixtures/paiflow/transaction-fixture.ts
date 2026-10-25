import {
  Account,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

// Deterministic test-only keys; never funded, never used on a network.
export const fixtureKeypair = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 7));
export const fixtureAddress = fixtureKeypair.publicKey();

export function buildFixtureTransaction(value = "fixture", fee = "100") {
  return new TransactionBuilder(new Account(fixtureAddress, "1"), {
    fee,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.manageData({ name: "test", value }))
    .setTimeout(180)
    .build();
}

export const fixtureTransaction = buildFixtureTransaction();
export const fixtureUnsignedXdr = fixtureTransaction.toXDR();
