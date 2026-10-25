// A minimal SupabaseClient stand-in over one `pg` connection, so Francis's real createFinancialDb (and therefore the
// real SQL functions) can run inside a transaction that the test always rolls back. It supports only what
// financial-core.ts uses: rpc() with named arguments, and from().select/eq/not-in/in/order/limit.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

type Pg = { query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>; end(): Promise<void> };

export function readEnvLocal(): Record<string, string> {
  return Object.fromEntries(
    readFileSync(join(process.cwd(), ".env.local"), "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
  );
}

// `pg` is not a project dependency; CYFER_PG_DIR points at a directory where it is installed.
export async function connectPg(): Promise<Pg> {
  const dir = process.env.CYFER_PG_DIR;
  if (!dir) throw new Error("Set CYFER_PG_DIR to a directory containing node_modules/pg");
  const { Client } = createRequire(join(resolve(dir), "package.json"))("pg");
  const client = new Client({ connectionString: readEnvLocal().SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}

const ident = (name: string) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`unsafe identifier ${name}`);
  return name;
};
// RPC arguments that are objects or arrays are jsonb parameters.
const param = (v: unknown) => (v !== null && typeof v === "object" ? JSON.stringify(v) : v);

// Each call runs under a savepoint, so an SQL error does not abort the surrounding test transaction.
async function guarded<T>(pg: Pg, run: () => Promise<T>): Promise<T> {
  await pg.query("savepoint cyfer_call");
  try {
    const result = await run();
    await pg.query("release savepoint cyfer_call");
    return result;
  } catch (e) {
    await pg.query("rollback to savepoint cyfer_call");
    throw e;
  }
}

export function pgSupabase(pg: Pg): SupabaseClient {
  function from(table: string) {
    const where: string[] = [];
    const params: unknown[] = [];
    let order = "";
    const add = (sql: string, value: unknown) => {
      params.push(value);
      where.push(sql.replace("?", `$${params.length}`));
    };
    const builder = {
      select: () => builder,
      eq: (col: string, v: unknown) => (add(`${ident(col)} = ?`, v), builder),
      in: (col: string, list: unknown[]) => (add(`${ident(col)}::text = any(?)`, list.map(String)), builder),
      not: (col: string, op: string, list: string) => {
        if (op !== "in") throw new Error("only not-in is supported");
        add(`not (${ident(col)}::text = any(?))`, list.replace(/[()]/g, "").split(","));
        return builder;
      },
      order: (col: string, o: { ascending: boolean }) => ((order = ` order by ${ident(col)} ${o.ascending ? "asc" : "desc"}`), builder),
      limit: async (n: number) => {
        try {
          const sql = `select * from public.${ident(table)}${where.length ? ` where ${where.join(" and ")}` : ""}${order} limit ${Number(n)}`;
          return { data: (await guarded(pg, () => pg.query(sql, params))).rows, error: null };
        } catch (e) {
          return { data: null, error: { code: (e as { code?: string }).code ?? "pg" } };
        }
      },
    };
    return builder;
  }

  async function rpc(fn: string, args: Record<string, unknown>) {
    const keys = Object.keys(args);
    const sql = `select public.${ident(fn)}(${keys.map((k, i) => `${ident(k)} => $${i + 1}`).join(", ")}) as r`;
    try {
      return { data: (await guarded(pg, () => pg.query(sql, keys.map((k) => param(args[k]))))).rows[0].r, error: null };
    } catch (e) {
      return { data: null, error: { code: (e as { code?: string }).code ?? "pg", message: (e as Error).message } };
    }
  }

  return { from, rpc } as unknown as SupabaseClient;
}
