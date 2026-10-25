import {
  FeeBumpTransaction,
  Keypair,
  Networks,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

// The envelope hash covers the transaction body, not its signatures, so it is
// the same before and after Freighter signs. It is the original tx hash.
export function envelopeHash(xdr: string): string {
  return Array.from(parseOriginal(xdr).hash(), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function assertOriginal(
  unsigned: string,
  signed: string,
  expectedHash: string,
) {
  if (
    envelopeHash(unsigned) !== expectedHash ||
    envelopeHash(signed) !== expectedHash
  )
    throw new Error(
      "Wallet changed the original transaction body. Keep recovery evidence; do not submit.",
    );
}

export function feeStroops(xdr: string): string {
  return parseOriginal(xdr).fee;
}

export type EnvelopeInspection =
  | { kind: "transaction"; hash: string }
  | { kind: "fee_bump" }
  | { kind: "unparseable" };

// Classifies a signed envelope without throwing, so callers can record why
// it was rejected.
export function inspectEnvelope(xdr: string): EnvelopeInspection {
  let tx: Transaction | FeeBumpTransaction;
  try {
    tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  } catch {
    return { kind: "unparseable" };
  }
  if (tx instanceof FeeBumpTransaction) return { kind: "fee_bump" };
  return { kind: "transaction", hash: Buffer.from(tx.hash()).toString("hex") };
}

// True when the envelope carries a valid signature from `address`.
export function isSignedBy(xdr: string, address: string): boolean {
  let tx: Transaction;
  let keypair: Keypair;
  try {
    tx = parseOriginal(xdr);
    keypair = Keypair.fromPublicKey(address);
  } catch {
    return false;
  }
  const hint = Buffer.from(keypair.signatureHint());
  return tx.signatures.some((s) => {
    const { hint: sigHint, signature } = s.toXdrObject();
    return Buffer.from(sigHint).equals(hint) && keypair.verify(Buffer.from(tx.hash()), Buffer.from(signature));
  });
}

function parseOriginal(xdr: string): Transaction {
  const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  if (tx instanceof FeeBumpTransaction)
    throw new Error("Fee-bump envelopes are not supported.");
  return tx;
}
