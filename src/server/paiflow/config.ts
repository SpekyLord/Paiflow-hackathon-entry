import "server-only";

export const DEFAULT_PAIFLOW_BASE_URL = "https://beta.app.paiflow.xyz";
const TOKEN = /^(pfk|pfd)_[a-f0-9]{64}$/;

export type PaiflowConfig = { baseUrl: string; token: string };

// The message is safe to show; it never echoes the token or the URL.
export class PaiflowNotConfiguredError extends Error {
  constructor() {
    super("Paiflow is not configured on the server.");
    this.name = "PaiflowNotConfiguredError";
  }
}

export function readPaiflowConfig(
  env: Record<string, string | undefined> = process.env,
): PaiflowConfig {
  const token = env.PAIFLOW_API_TOKEN?.trim();
  if (!token || !TOKEN.test(token)) throw new PaiflowNotConfiguredError();
  return { baseUrl: validateBaseUrl(env.PAIFLOW_BASE_URL), token };
}

export function isPaiflowConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  try {
    readPaiflowConfig(env);
    return true;
  } catch {
    return false;
  }
}

function validateBaseUrl(raw: string | undefined): string {
  let url: URL;
  try {
    url = new URL(raw?.trim() || DEFAULT_PAIFLOW_BASE_URL);
  } catch {
    throw new PaiflowNotConfiguredError();
  }
  const local =
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" && !local)
  )
    throw new PaiflowNotConfiguredError();
  return url.origin;
}
