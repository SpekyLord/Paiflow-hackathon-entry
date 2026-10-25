import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import {
  getAddress,
  getNetworkDetails,
  isConnected,
  requestAccess,
  signMessage,
  signTransaction,
} from "@stellar/freighter-api";
import {
  connect,
  FreighterError,
  refresh,
  signChallenge,
  signPrepared,
  TESTNET_PASSPHRASE,
} from "@/client/wallet/freighter";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  getNetworkDetails: vi.fn(),
  getAddress: vi.fn(),
  requestAccess: vi.fn(),
  signMessage: vi.fn(),
  signTransaction: vi.fn(),
}));

// Test-only key; never funded.
const keypair = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 3));
const address = keypair.publicKey();
const other = `G${"B".repeat(55)}`;
const prepared = {
  network: "testnet",
  networkPassphrase: TESTNET_PASSPHRASE,
  xdr: "unsigned",
  expiresAt: new Date(Date.now() + 180_000).toISOString(),
};

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(FreighterError);
  await expect(promise).rejects.toMatchObject({ code });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isConnected).mockResolvedValue({ isConnected: true });
  vi.mocked(getAddress).mockResolvedValue({ address });
  vi.mocked(requestAccess).mockResolvedValue({ address });
  vi.mocked(getNetworkDetails).mockResolvedValue({
    network: "TESTNET",
    networkUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: TESTNET_PASSPHRASE,
  });
  vi.mocked(signTransaction).mockResolvedValue({
    signedTxXdr: "signed",
    signerAddress: address,
  });
});
afterEach(() => vi.useRealTimers());

describe("connect and refresh", () => {
  it("returns the selected Freighter account", async () => {
    expect(await connect()).toBe(address);
    expect(await refresh()).toBe(address);
  });

  it("reports missing Freighter without requesting access", async () => {
    vi.mocked(isConnected).mockResolvedValue({ isConnected: false });
    await expectCode(connect(), "FREIGHTER_NOT_INSTALLED");
    expect(requestAccess).not.toHaveBeenCalled();
  });

  it("bounds an extension that never answers detection", async () => {
    vi.useFakeTimers();
    vi.mocked(isConnected).mockReturnValue(new Promise(() => {}));
    const pending = expectCode(connect(), "FREIGHTER_NOT_INSTALLED");
    await vi.advanceTimersByTimeAsync(2_000);
    await pending;
    expect(requestAccess).not.toHaveBeenCalled();
  });

  it("bounds an unanswered access prompt", async () => {
    vi.useFakeTimers();
    vi.mocked(requestAccess).mockReturnValue(new Promise(() => {}));
    const pending = expectCode(connect(), "FREIGHTER_TIMEOUT");
    await vi.advanceTimersByTimeAsync(60_000);
    await pending;
  });

  it("reports a denied access request", async () => {
    vi.mocked(requestAccess).mockResolvedValue({
      address: "",
      error: { code: -4, message: "User declined access" },
    });
    await expectCode(connect(), "FREIGHTER_DENIED");
  });
});

describe("signPrepared", () => {
  it("signs with the prepared passphrase and the bound address", async () => {
    expect(await signPrepared(prepared, address)).toBe("signed");
    expect(signTransaction).toHaveBeenCalledWith("unsigned", {
      networkPassphrase: TESTNET_PASSPHRASE,
      address,
    });
  });

  it("refuses a non-testnet preparation before asking Freighter", async () => {
    await expectCode(
      signPrepared({ ...prepared, network: "mainnet" }, address),
      "FREIGHTER_WRONG_NETWORK",
    );
    await expectCode(
      signPrepared(
        {
          ...prepared,
          networkPassphrase: "Public Global Stellar Network ; September 2015",
        },
        address,
      ),
      "FREIGHTER_WRONG_NETWORK",
    );
    expect(signTransaction).not.toHaveBeenCalled();
  });

  it("refuses expired or invalid expiry", async () => {
    await expectCode(
      signPrepared({ ...prepared, expiresAt: new Date(0).toISOString() }, address),
      "PREPARATION_EXPIRED",
    );
    await expectCode(
      signPrepared({ ...prepared, expiresAt: "invalid" }, address),
      "PREPARATION_EXPIRED",
    );
    expect(signTransaction).not.toHaveBeenCalled();
  });

  it("refuses when Freighter's account is not the bound address", async () => {
    vi.mocked(getAddress).mockResolvedValue({ address: other });
    await expectCode(signPrepared(prepared, address), "FREIGHTER_WRONG_ACCOUNT");
    expect(signTransaction).not.toHaveBeenCalled();
  });

  it("refuses when Freighter is on another network", async () => {
    vi.mocked(getNetworkDetails).mockResolvedValue({
      network: "PUBLIC",
      networkUrl: "https://horizon.stellar.org",
      networkPassphrase: "Public Global Stellar Network ; September 2015",
    });
    await expectCode(signPrepared(prepared, address), "FREIGHTER_WRONG_NETWORK");
    expect(signTransaction).not.toHaveBeenCalled();
  });

  it("refuses an unexpected signer", async () => {
    vi.mocked(signTransaction).mockResolvedValue({
      signedTxXdr: "signed",
      signerAddress: other,
    });
    await expectCode(signPrepared(prepared, address), "FREIGHTER_WRONG_ACCOUNT");
  });

  it("reports a declined signature", async () => {
    vi.mocked(signTransaction).mockResolvedValue({
      signedTxXdr: "",
      signerAddress: "",
      error: { code: -4, message: "User declined" },
    });
    await expectCode(signPrepared(prepared, address), "SIGNATURE_DECLINED");
  });
});

describe("signChallenge", () => {
  const message = "CYFER wallet binding challenge (fixture)";
  // SEP-53 signature produced by the test key, as Freighter would.
  const signature = Buffer.from(keypair.signMessage(message));

  it("returns a base64 signature the server can verify", async () => {
    vi.mocked(signMessage).mockResolvedValue({
      signedMessage: signature.toString("base64"),
      signerAddress: address,
    });
    const result = await signChallenge(message, address);
    expect(signMessage).toHaveBeenCalledWith(message, {
      address,
      networkPassphrase: TESTNET_PASSPHRASE,
    });
    expect(
      Keypair.fromPublicKey(address).verifyMessage(
        message,
        Buffer.from(result, "base64"),
      ),
    ).toBe(true);
  });

  it("converts the older Buffer response to base64", async () => {
    vi.mocked(signMessage).mockResolvedValue({
      signedMessage: signature,
      signerAddress: address,
    });
    expect(await signChallenge(message, address)).toBe(
      signature.toString("base64"),
    );
  });

  it("refuses a different signer or account", async () => {
    vi.mocked(signMessage).mockResolvedValue({
      signedMessage: signature.toString("base64"),
      signerAddress: other,
    });
    await expectCode(signChallenge(message, address), "FREIGHTER_WRONG_ACCOUNT");
    vi.mocked(getAddress).mockResolvedValue({ address: other });
    await expectCode(signChallenge(message, address), "FREIGHTER_WRONG_ACCOUNT");
  });

  it("reports a declined or empty signature", async () => {
    vi.mocked(signMessage).mockResolvedValue({
      signedMessage: null,
      signerAddress: address,
    });
    await expectCode(signChallenge(message, address), "SIGNATURE_DECLINED");
  });
});
