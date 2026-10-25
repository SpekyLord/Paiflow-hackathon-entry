"use client";
import {
  getAddress,
  getNetworkDetails,
  isConnected,
  requestAccess,
  signMessage,
  signTransaction,
} from "@stellar/freighter-api";

export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

// Codes match the SafeError codes in the controller contract (Francis §3.7),
// plus PREPARATION_EXPIRED, which usePayment maps to its 'expired' phase.
export type FreighterErrorCode =
  | "FREIGHTER_NOT_INSTALLED"
  | "FREIGHTER_DENIED"
  | "FREIGHTER_WRONG_NETWORK"
  | "FREIGHTER_WRONG_ACCOUNT"
  | "FREIGHTER_TIMEOUT"
  | "SIGNATURE_DECLINED"
  | "PREPARATION_EXPIRED";

export class FreighterError extends Error {
  constructor(
    readonly code: FreighterErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FreighterError";
  }
}

// The fields of a server-prepared payment that signing depends on.
export type PreparedForSigning = {
  network: string;
  networkPassphrase: string;
  expiresAt: string;
  xdr: string;
};

export async function connect(): Promise<string> {
  await requireFreighter();
  const result = await bounded(
    requestAccess(),
    60_000,
    "Freighter did not answer. Open the extension to review access, then try again.",
  );
  if (result.error || !result.address)
    throw new FreighterError(
      "FREIGHTER_DENIED",
      "Allow CYFAI to connect in Freighter, then try again.",
    );
  return result.address;
}

export async function refresh(): Promise<string> {
  await requireFreighter();
  const result = await bounded(
    getAddress(),
    5_000,
    "Freighter did not answer. Open the extension and try again.",
  );
  if (result.error || !result.address)
    throw new FreighterError(
      "FREIGHTER_DENIED",
      "Connect Freighter before continuing.",
    );
  return result.address;
}

export async function isOnTestnet(): Promise<boolean> {
  const network = await bounded(
    getNetworkDetails(),
    5_000,
    "Freighter did not answer. Open the extension and try again.",
  );
  if (network.error)
    throw new FreighterError(
      "FREIGHTER_DENIED",
      "Freighter did not share its network.",
    );
  return network.networkPassphrase === TESTNET_PASSPHRASE;
}

// Signs a wallet-binding challenge (SEP-53) and returns the base64 Ed25519
// signature. Older Freighter versions return a Buffer instead of a string.
export async function signChallenge(
  message: string,
  address: string,
): Promise<string> {
  await requireAccount(address);
  await requireTestnet();
  const result = await signMessage(message, {
    address,
    networkPassphrase: TESTNET_PASSPHRASE,
  });
  if (result.error || !result.signedMessage)
    throw new FreighterError(
      "SIGNATURE_DECLINED",
      "The message was not signed. Nothing was bound.",
    );
  if (result.signerAddress !== address)
    throw new FreighterError(
      "FREIGHTER_WRONG_ACCOUNT",
      "Freighter signed with a different account. Select the account you are binding.",
    );
  const signature =
    typeof result.signedMessage === "string"
      ? result.signedMessage
      : bytesToBase64(result.signedMessage);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(signature))
    throw new FreighterError(
      "SIGNATURE_DECLINED",
      "Freighter returned an unreadable signature.",
    );
  return signature;
}

// Signs the server-prepared envelope only for the bound wallet on Testnet.
// Every refusal happens before Freighter is asked to sign.
export async function signPrepared(
  prepared: PreparedForSigning,
  boundAddress: string,
): Promise<string> {
  if (
    prepared.network !== "testnet" ||
    prepared.networkPassphrase !== TESTNET_PASSPHRASE
  )
    throw new FreighterError(
      "FREIGHTER_WRONG_NETWORK",
      "Only Testnet payments are allowed.",
    );
  const expires = Date.parse(prepared.expiresAt);
  if (!Number.isFinite(expires) || Date.now() >= expires)
    throw new FreighterError(
      "PREPARATION_EXPIRED",
      "This payment preparation expired. Keep the original record and check its status; expiry alone does not prove it cannot execute.",
    );
  await requireAccount(boundAddress);
  await requireTestnet();
  const signed = await signTransaction(prepared.xdr, {
    networkPassphrase: prepared.networkPassphrase,
    address: boundAddress,
  });
  if (signed.error || !signed.signedTxXdr)
    throw new FreighterError(
      "SIGNATURE_DECLINED",
      "The payment was not signed. Nothing was sent.",
    );
  if (signed.signerAddress !== boundAddress)
    throw new FreighterError(
      "FREIGHTER_WRONG_ACCOUNT",
      "Freighter signed with a different account. Reconnect your bound wallet and keep this payment record.",
    );
  return signed.signedTxXdr;
}

export async function bounded<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new FreighterError("FREIGHTER_TIMEOUT", message)),
          ms,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function requireFreighter() {
  const message =
    "Install or enable Freighter at freighter.app, then reload this page to connect your Testnet wallet.";
  let result: Awaited<ReturnType<typeof isConnected>>;
  try {
    result = await bounded(isConnected(), 2_000, message);
  } catch {
    throw new FreighterError("FREIGHTER_NOT_INSTALLED", message);
  }
  if (result.error || !result.isConnected)
    throw new FreighterError("FREIGHTER_NOT_INSTALLED", message);
}

async function requireAccount(address: string) {
  if ((await refresh()) !== address)
    throw new FreighterError(
      "FREIGHTER_WRONG_ACCOUNT",
      "Wallet changed. Select your bound account in Freighter and keep this record.",
    );
}

async function requireTestnet() {
  if (!(await isOnTestnet()))
    throw new FreighterError(
      "FREIGHTER_WRONG_NETWORK",
      "Switch Freighter to Testnet before signing.",
    );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
