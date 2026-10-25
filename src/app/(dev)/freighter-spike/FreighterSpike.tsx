"use client";
import { useState } from "react";
import { getNetworkDetails, isConnected, requestAccess, signMessage } from "@stellar/freighter-api";
import { apiRequest, ApiClientError } from "@/client/http";
import { signIn } from "@/client/api/business";
import type { BindResponse, ChallengeResponse } from "@/contracts/api";

// Proves a REAL Freighter signMessage signature verifies on the server:
// sign in → connect Freighter → challenge → signMessage → bind. A 200 from
// /api/wallet/bind means Francis's server-side verification passed. The
// signature itself is never displayed, only its type and length.
const TESTNET = "Test SDF Network ; September 2015";

interface Step {
  label: string;
  ok: boolean;
  detail: string;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function FreighterSpike() {
  const [email, setEmail] = useState("owner@cyfer-demo.test");
  const [password, setPassword] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [busy, setBusy] = useState(false);
  const log = (label: string, ok: boolean, detail = "") => setSteps((s) => [...s, { label, ok, detail }]);

  async function run() {
    setBusy(true);
    setSteps([]);
    try {
      await signIn({ email, password });
      log("Signed in", true, email);

      const installed = await isConnected();
      if (!installed.isConnected) return log("Freighter detected", false, "Install or enable Freighter, then reload.");
      const access = await requestAccess();
      if (access.error || !access.address) return log("Freighter access", false, access.error?.message ?? "No address");
      const address = access.address;
      log("Freighter account", true, address);
      const network = await getNetworkDetails();
      if (network.networkPassphrase !== TESTNET) return log("Freighter on Testnet", false, network.network ?? "unknown");
      log("Freighter on Testnet", true);

      const challenge = await apiRequest<ChallengeResponse>("/api/wallet/challenge", { method: "POST", body: { address } });
      log("Challenge issued", true, `expires ${challenge.expiresAt}`);

      const signed = await signMessage(challenge.message, { address, networkPassphrase: TESTNET });
      if (signed.error || !signed.signedMessage) return log("signMessage", false, signed.error?.message ?? "No signature");
      const raw = signed.signedMessage as unknown;
      const kind = typeof raw === "string" ? "string" : raw instanceof Uint8Array ? "Uint8Array/Buffer" : typeof raw;
      const signedMessage = typeof raw === "string" ? raw : bytesToBase64(raw as Uint8Array);
      const base64 = /^[A-Za-z0-9+/]+={0,2}$/.test(signedMessage);
      log(
        "signMessage result",
        signed.signerAddress === address,
        `type=${kind}; base64=${base64}; length=${signedMessage.length} chars (${Math.floor((signedMessage.length * 3) / 4)} bytes); signerAddress matches=${signed.signerAddress === address}`,
      );

      const bound = await apiRequest<BindResponse>("/api/wallet/bind", {
        method: "POST",
        body: { challengeId: challenge.challengeId, address, signedMessage, signerAddress: signed.signerAddress },
      });
      log("Server verified and bound", true, `${bound.address} at ${bound.verifiedAt}`);
    } catch (error) {
      const message = error instanceof ApiClientError ? `${error.status} ${error.safe.code}: ${error.safe.message}` : (error as Error).message;
      log("Stopped", false, message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22 }}>Freighter signMessage spike (C-02a / HO-03)</h1>
      <p style={{ color: "#555" }}>
        Dev only. Uses a Testnet Freighter account. Binds that address to the signed-in demo user. Nothing is paid and no
        transaction is sent.
      </p>
      <div style={{ display: "grid", gap: 8, margin: "16px 0" }}>
        <input aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: 8 }} />
        <input aria-label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: 8 }} />
        <button onClick={run} disabled={busy || !password} style={{ padding: 10 }}>
          {busy ? "Running…" : "Sign in, sign the challenge and bind"}
        </button>
      </div>
      <ol>
        {steps.map((s, i) => (
          <li key={i} style={{ color: s.ok ? "#1a6b3a" : "#a12" }}>
            <strong>{s.ok ? "PASS" : "FAIL"} {s.label}</strong> {s.detail && <span>— {s.detail}</span>}
          </li>
        ))}
      </ol>
      <p style={{ color: "#555" }}>Send Francis the &ldquo;signMessage result&rdquo; line and the bound address. Never send the signature.</p>
    </main>
  );
}
