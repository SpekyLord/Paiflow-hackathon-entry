import { Asset, Networks } from "@stellar/stellar-sdk";

// Paiflow event `asset` fields carry either a symbol ("XLM") or the Stellar
// Asset Contract address. Only Testnet native XLM is accepted for the MVP.
const NATIVE_TESTNET_CONTRACT = Asset.native().contractId(Networks.TESTNET);

export function matchesNativeAsset(eventAsset: unknown): boolean {
  return eventAsset === "XLM" || eventAsset === NATIVE_TESTNET_CONTRACT;
}
