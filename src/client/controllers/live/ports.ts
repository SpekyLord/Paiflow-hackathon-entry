import { apiRequest, ApiClientError } from "@/client/http";
import * as payments from "@/client/api/payments";
import { getMe, getPlan } from "@/client/api/business";
import * as freighter from "@/client/wallet/freighter";
import { FreighterError } from "@/client/wallet/freighter";
import type { BindRequest, BindResponse, ChallengeResponse } from "@/contracts/api";
import type { SafeError } from "@/contracts/controllers";

// Everything the live controllers call, so tests can pass fakes. Nothing
// here stores financial state in the browser; the server is the record.
export const livePorts = {
  getMe,
  getPlan,
  ...payments,
  challenge: (address: string) =>
    apiRequest<ChallengeResponse>("/api/wallet/challenge", { method: "POST", body: { address } }),
  bind: (body: BindRequest) => apiRequest<BindResponse>("/api/wallet/bind", { method: "POST", body }),
  freighter: {
    connect: freighter.connect,
    refresh: freighter.refresh,
    isOnTestnet: freighter.isOnTestnet,
    signChallenge: freighter.signChallenge,
    signPrepared: freighter.signPrepared,
  },
};
export type LivePorts = typeof livePorts;

// Browser-safe error for the hooks. Never includes XDR or raw messages.
export function toSafeError(error: unknown): SafeError {
  if (error instanceof ApiClientError) return error.safe;
  if (error instanceof FreighterError) {
    if (error.code === "PREPARATION_EXPIRED") return { code: "STATE_CONFLICT", message: error.message };
    return { code: error.code, message: error.message };
  }
  return { code: "INTERNAL", message: "Something went wrong. Nothing was paid again." };
}

export const errorCode = (error: unknown) =>
  error instanceof ApiClientError ? error.safe.code : error instanceof FreighterError ? error.code : null;
