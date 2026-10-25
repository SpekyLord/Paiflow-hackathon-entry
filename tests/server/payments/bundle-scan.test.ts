import { describe, expect, it } from "vitest";
import { findViolations } from "../../../scripts/check-browser-bundle.mjs";

const scan = findViolations as (text: string) => string[];
const jwt = (payload: object) =>
  [
    Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
    Buffer.from(JSON.stringify(payload)).toString("base64url"),
    "signature",
  ].join(".");

describe("browser bundle scan", () => {
  it("passes ordinary client code and the public anon key", () => {
    expect(scan('const a="hello";')).toEqual([]);
    expect(scan(`const k="${jwt({ role: "anon" })}"`)).toEqual([]);
  });

  it.each([
    [`x="pfd_${"a".repeat(64)}"`, "Paiflow token"],
    [`x="pfk_${"0".repeat(64)}"`, "Paiflow token"],
    ["process.env.PAIFLOW_API_TOKEN", "PAIFLOW_API_TOKEN reference"],
    ["class PaiflowApiError extends Error{}", "Paiflow SDK runtime"],
    ["new PaiflowTransport()", "Paiflow SDK runtime"],
    ["process.env.SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY reference"],
    ['k="sb_secret_abcdefghijklmnop"', "Supabase secret key"],
    ['t="[FIXTURE] Demo plan"', "fixture marker"],
    [`k="${jwt({ role: "service_role" })}"`, "service-role JWT"],
  ])("flags %s", (text, rule) => {
    expect(scan(text)).toContain(rule);
  });

  it("reports rule names without echoing the secret", () => {
    const secret = `pfd_${"b".repeat(64)}`;
    expect(scan(secret).join(" ")).not.toContain(secret);
  });
});
