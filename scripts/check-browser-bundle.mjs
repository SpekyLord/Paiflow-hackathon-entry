// Scans the production browser bundle (.next/static) for server credentials,
// the Paiflow SDK runtime and fixture data. Run after `npm run build`.
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const RULES = [
  ["Paiflow token", /p(?:fd|fk)_[a-f0-9]{64}/],
  ["PAIFLOW_API_TOKEN reference", /PAIFLOW_API_TOKEN/],
  ["Paiflow SDK runtime", /PaiflowTransport|class PaiflowApiError/],
  ["SUPABASE_SERVICE_ROLE_KEY reference", /SUPABASE_SERVICE_ROLE_KEY/],
  ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{10,}/],
  ["fixture marker", /\[FIXTURE\]/],
];
const JWT = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

// Returns rule names only, never the matched text, so a leaked secret is not
// echoed into CI logs.
export function findViolations(text) {
  const found = RULES.filter(([, pattern]) => pattern.test(text)).map(
    ([name]) => name,
  );
  for (const token of text.match(JWT) ?? []) {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
      );
      if (payload?.role === "service_role") {
        found.push("service-role JWT");
        break;
      }
    } catch {
      // Not a decodable JWT; ignore.
    }
  }
  return found;
}

async function scan(directory, problems) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = new URL(
      entry.name + (entry.isDirectory() ? "/" : ""),
      directory,
    );
    if (entry.isDirectory()) await scan(path, problems);
    else if (/\.(?:js|mjs|css|html|json)$/.test(entry.name)) {
      for (const name of findViolations(await readFile(path, "utf8")))
        problems.push(`${fileURLToPath(path)}: ${name}`);
    }
  }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = new URL("../.next/static/", import.meta.url);
  let problems;
  try {
    problems = await scan(root, []);
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.error("No .next/static found. Run `npm run build` first.");
      process.exit(1);
    }
    throw error;
  }
  if (problems.length) {
    console.error("Browser bundle check failed:");
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(
    "Browser bundle contains no credential markers, Paiflow SDK runtime or fixture markers.",
  );
}
