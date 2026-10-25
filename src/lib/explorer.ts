export const EXPLORER_LABEL = "Stellar Expert (testnet)";

// Only Stellar transaction hashes belong here; CYFER audit and ledger hashes
// are application records and do not exist on Stellar.
export function stellarExpertTxUrl(stellarTxHash: string): string {
  if (!/^[a-f0-9]{64}$/.test(stellarTxHash))
    throw new Error("Invalid Stellar transaction hash.");
  return `https://stellar.expert/explorer/testnet/tx/${stellarTxHash}`;
}
