import {
  FeeBumpTransaction,
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

function parseOriginal(xdr: string): Transaction {
  const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  if (tx instanceof FeeBumpTransaction)
    throw new Error("Fee-bump envelopes are not supported.");
  return tx;
}
