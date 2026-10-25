import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PaiflowApiError,
  PaiflowMalformedResponseError,
  PaiflowTimeoutError,
  PaiflowTransportError,
} from "@paiflow/sdk";

vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ userId: "00000000-0000-4000-8000-000000000010" as string | null }));
vi.mock("@/server/auth/session", () => ({
  getAuthUserId: async () => auth.userId,
  loadSession: async () => null,
  createAuthClient: async () => ({}),
}));
const mocks = vi.hoisted(() => ({ constructor: vi.fn(), deployment: vi.fn() }));
vi.mock("@paiflow/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@paiflow/sdk")>();
  return {
    ...actual,
    Paiflow: class {
      constructor(options: unknown) {
        mocks.constructor(options);
      }
      deployment(id: string) {
        mocks.deployment(id);
        return { id };
      }
    },
  };
});

import {
  isPaiflowConfigured,
  PaiflowNotConfiguredError,
  readPaiflowConfig,
} from "@/server/paiflow/config";
import { paiflowDeployment } from "@/server/paiflow/client";
import {
  logPaiflowError,
  parseRetryAfter,
  safeErrorResponse,
  toSafePaiflowError,
} from "@/server/paiflow/errors";
import { GET as integrationStatus } from "@/app/api/integration/status/route";

const token = `pfd_${"a".repeat(64)}`;
const deploymentId = "12345678-1234-4234-8234-123456789abc";
const meta = { status: 0, requestId: "req-1" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
afterEach(() => vi.unstubAllEnvs());

describe("readPaiflowConfig", () => {
  it("accepts a valid token and https origin", () => {
    expect(
      readPaiflowConfig({
        PAIFLOW_API_TOKEN: token,
        PAIFLOW_BASE_URL: "https://beta.app.paiflow.xyz/",
      }),
    ).toEqual({ baseUrl: "https://beta.app.paiflow.xyz", token });
    expect(
      readPaiflowConfig({
        PAIFLOW_API_TOKEN: `pfk_${"0".repeat(64)}`,
        PAIFLOW_BASE_URL: "http://localhost:4000",
      }).baseUrl,
    ).toBe("http://localhost:4000");
  });

  it("defaults to the Paiflow beta origin", () => {
    expect(readPaiflowConfig({ PAIFLOW_API_TOKEN: token }).baseUrl).toBe(
      "https://beta.app.paiflow.xyz",
    );
  });

  it.each<Record<string, string>>([
    {},
    { PAIFLOW_API_TOKEN: "pfd_short" },
    { PAIFLOW_API_TOKEN: `pfx_${"a".repeat(64)}` },
    { PAIFLOW_API_TOKEN: `pfd_${"A".repeat(64)}` },
    { PAIFLOW_API_TOKEN: token, PAIFLOW_BASE_URL: "http://beta.app.paiflow.xyz" },
    { PAIFLOW_API_TOKEN: token, PAIFLOW_BASE_URL: "https://beta.app.paiflow.xyz/api" },
    { PAIFLOW_API_TOKEN: token, PAIFLOW_BASE_URL: "https://user:pw@beta.app.paiflow.xyz" },
    { PAIFLOW_API_TOKEN: token, PAIFLOW_BASE_URL: "https://beta.app.paiflow.xyz/?x=1" },
    { PAIFLOW_API_TOKEN: token, PAIFLOW_BASE_URL: "https://beta.app.paiflow.xyz/#x" },
    { PAIFLOW_API_TOKEN: token, PAIFLOW_BASE_URL: "not a url" },
  ])("refuses invalid configuration %#", (env) => {
    expect(() => readPaiflowConfig(env)).toThrow(PaiflowNotConfiguredError);
    expect(isPaiflowConfigured(env)).toBe(false);
  });

  it("never echoes the token in its error message", () => {
    expect(() =>
      readPaiflowConfig({ PAIFLOW_API_TOKEN: token, PAIFLOW_BASE_URL: "ftp://x" }),
    ).toThrow(expect.objectContaining({ message: expect.not.stringContaining(token) }));
  });
});

describe("paiflowDeployment", () => {
  it("builds a client for a registry deployment UUID", () => {
    vi.stubEnv("PAIFLOW_API_TOKEN", token);
    vi.stubEnv("PAIFLOW_BASE_URL", "");
    paiflowDeployment(deploymentId);
    expect(mocks.constructor).toHaveBeenCalledWith({
      baseUrl: "https://beta.app.paiflow.xyz",
      token,
    });
    expect(mocks.deployment).toHaveBeenCalledWith(deploymentId);
  });

  it.each(["", "CABC", "not-a-uuid", `${deploymentId}/x`])(
    "refuses deployment id %s before constructing a client",
    (id) => {
      vi.stubEnv("PAIFLOW_API_TOKEN", token);
      expect(() => paiflowDeployment(id)).toThrow("deployment UUID");
      expect(mocks.constructor).not.toHaveBeenCalled();
    },
  );

  it("refuses when unconfigured", () => {
    vi.stubEnv("PAIFLOW_API_TOKEN", "");
    expect(() => paiflowDeployment(deploymentId)).toThrow(
      PaiflowNotConfiguredError,
    );
    expect(mocks.constructor).not.toHaveBeenCalled();
  });
});

describe("toSafePaiflowError", () => {
  const api = (status: number, retryAfter?: string) =>
    new PaiflowApiError(status, "upstream_code", `secret ${token}`, null, null, {
      ...meta,
      status,
      retryAfter,
    });

  it.each([
    [api(401), 503, "PAIFLOW_NOT_CONFIGURED"],
    [api(403), 503, "PAIFLOW_NOT_CONFIGURED"],
    [api(404), 404, "NOT_FOUND"],
    [api(400), 422, "VALIDATION"],
    [api(422), 422, "VALIDATION"],
    [api(429, "7"), 429, "RATE_LIMITED"],
    [api(500), 502, "UPSTREAM_UNRESOLVED"],
    [api(502), 502, "UPSTREAM_UNRESOLVED"],
    [new PaiflowNotConfiguredError(), 503, "PAIFLOW_NOT_CONFIGURED"],
    [new PaiflowTimeoutError(), 502, "UPSTREAM_UNRESOLVED"],
    [new PaiflowTransportError("socket"), 502, "UPSTREAM_UNRESOLVED"],
    [new PaiflowMalformedResponseError(meta), 502, "UPSTREAM_UNRESOLVED"],
    [new Error("boom"), 502, "UPSTREAM_UNRESOLVED"],
  ])("maps %s to a safe code", (error, status, code) => {
    const safe = toSafePaiflowError(error);
    expect(safe.status).toBe(status);
    expect(safe.code).toBe(code);
    expect(safe.message).not.toContain(token);
  });

  it("keeps the request ID and Retry-After", () => {
    const safe = toSafePaiflowError(api(429, "7"));
    expect(safe.requestId).toBe("req-1");
    expect(safe.retryAfterSeconds).toBe(7);
    expect(
      toSafePaiflowError(new PaiflowMalformedResponseError(meta)).requestId,
    ).toBe("req-1");
  });

  it("renders the error envelope without raw messages", async () => {
    const response = safeErrorResponse(toSafePaiflowError(api(429, "7")));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("7");
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({
      error: { code: "RATE_LIMITED", message: expect.any(String) },
    });
    expect(body).not.toContain(token);
    expect(body).not.toContain("upstream_code");
  });

  it("returns 503 PAIFLOW_NOT_CONFIGURED for missing configuration", async () => {
    const response = safeErrorResponse(
      toSafePaiflowError(new PaiflowNotConfiguredError()),
    );
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("PAIFLOW_NOT_CONFIGURED");
  });
});

describe("logging", () => {
  it("never writes the token to the console", () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (method) => vi.spyOn(console, method).mockImplementation(() => {}),
    );
    vi.stubEnv("PAIFLOW_API_TOKEN", token);
    logPaiflowError(
      "prepare",
      new PaiflowApiError(500, "x", `bad ${token}`, { token }, { token }, meta),
    );
    logPaiflowError("prepare", new Error(`leak ${token}`));
    const written = spies
      .flatMap((spy) => spy.mock.calls.flat().map(String))
      .join("\n");
    expect(spies[3]).toHaveBeenCalledTimes(2);
    expect(written).not.toContain(token);
    expect(written).not.toContain("a".repeat(64));
    spies.forEach((spy) => spy.mockRestore());
  });
});

describe("parseRetryAfter", () => {
  it("parses seconds and HTTP dates", () => {
    expect(parseRetryAfter("12")).toBe(12);
    expect(parseRetryAfter(undefined)).toBeNull();
    expect(parseRetryAfter("soon")).toBeNull();
    expect(
      parseRetryAfter(new Date(Date.now() + 5000).toUTCString()),
    ).toBeGreaterThanOrEqual(4);
  });
});

describe("GET /api/integration/status", () => {
  it("reports configured without secrets", async () => {
    vi.stubEnv("PAIFLOW_API_TOKEN", token);
    const body = await (await integrationStatus()).text();
    expect(JSON.parse(body)).toEqual({
      data: { paiflowConfigured: true, network: "testnet" },
    });
    expect(body).not.toContain(token);
    expect(body).not.toContain("paiflow.xyz");
  });

  it("answers 401 without a session (contract §3.5: signed-in users)", async () => {
    auth.userId = null;
    const res = await integrationStatus();
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
    auth.userId = "00000000-0000-4000-8000-000000000010";
  });

  it("reports unconfigured", async () => {
    vi.stubEnv("PAIFLOW_API_TOKEN", "");
    expect(await (await integrationStatus()).json()).toEqual({
      data: { paiflowConfigured: false, network: null },
    });
  });
});
