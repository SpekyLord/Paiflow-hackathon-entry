import type { ControllerMode } from "@/contracts/controllers";

// Fixture mode only when NEXT_PUBLIC_CYFER_FIXTURES === "1" and the build is
// not production (FRANCIS-PHASETASK §3.7). Pages show a persistent
// "FIXTURE DATA — not Testnet" banner when this returns "fixture".
export function getControllerMode(): ControllerMode {
  return process.env.NEXT_PUBLIC_CYFER_FIXTURES === "1" &&
    process.env.NODE_ENV !== "production"
    ? "fixture"
    : "live";
}
