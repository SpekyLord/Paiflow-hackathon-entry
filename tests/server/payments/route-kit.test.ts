import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readJson, requireSameOrigin, respond, RouteError } from "@/server/paiflow/route-kit";
import { toSafePaiflowError } from "@/server/paiflow/errors";
import { PaiflowApiError } from "@paiflow/sdk";

const url = "http://localhost:3000/api/x";
const post = (body: string, headers: Record<string, string> = {}) =>
  new Request(url, {
    method: "POST",
    body,
    headers: { origin: "http://localhost:3000", "content-type": "application/json", ...headers },
  });

describe("requireSameOrigin", () => {
  it("accepts a same-origin JSON request", () => {
    expect(() => requireSameOrigin(post("{}"))).not.toThrow();
  });

  it.each<[Record<string, string>, string]>([
    [{ origin: "https://evil.example" }, "FORBIDDEN"],
    [{ origin: "" }, "FORBIDDEN"],
    [{ "sec-fetch-site": "cross-site" }, "FORBIDDEN"],
    [{ "content-type": "text/plain" }, "UNSUPPORTED_MEDIA_TYPE"],
  ])("refuses %o", (headers, code) => {
    expect(() => requireSameOrigin(post("{}", headers))).toThrow(expect.objectContaining({ code }));
  });
});

describe("readJson", () => {
  it("parses an object body", async () => {
    expect(await readJson(post('{"a":1}'))).toEqual({ a: 1 });
  });

  it("refuses oversize bodies while streaming", async () => {
    await expect(readJson(post(JSON.stringify({ x: "a".repeat(100) })), 50)).rejects.toMatchObject({ code: "REQUEST_TOO_LARGE" });
  });

  it.each(["not json", "[1]", "null"])("refuses %s", async (body) => {
    await expect(readJson(post(body))).rejects.toMatchObject({ code: "VALIDATION_SHAPE" });
  });
});

describe("respond", () => {
  it("wraps data and maps errors to the shared envelope", async () => {
    expect(await (await respond(async () => ({ ok: 1 }))).json()).toEqual({ data: { ok: 1 } });
    const refused = await respond(async () => {
      throw new RouteError("PLAN_NOT_APPROVED");
    });
    expect(refused.status).toBe(403);
    expect((await refused.json()).error.code).toBe("PLAN_NOT_APPROVED");
  });

  it("keeps Retry-After for Paiflow rate limits and hides other errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const limited = await respond(async () => {
      throw toSafePaiflowError(new PaiflowApiError(429, "x", "secret", null, null, { status: 429, retryAfter: "9" }));
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("9");
    const boom = await respond(async () => {
      throw new Error("secret detail");
    });
    expect(boom.status).toBe(500);
    expect(await boom.text()).not.toContain("secret");
  });
});

describe("respond with Francis's HttpError", () => {
  it("renders guard and rate-limit errors with Retry-After and no-store", async () => {
    const { HttpError } = await import("@/server/http/respond");
    const res = await respond(async () => {
      throw new HttpError("RATE_LIMITED", undefined, { retryAfterSeconds: 12 });
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("12");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    const denied = await respond(async () => {
      throw new HttpError("OPERATOR_REQUIRED");
    });
    expect(denied.status).toBe(403);
    expect((await denied.json()).error.code).toBe("OPERATOR_REQUIRED");
  });
});
