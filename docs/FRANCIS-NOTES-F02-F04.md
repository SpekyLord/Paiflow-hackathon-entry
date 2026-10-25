# Francis — F-02, F-03, F-04 working notes

Draft written 2026-10-25 (PHT, ~12:30). Nothing here touches a database. Evidence for the checklist goes into [FRANCIS-PHASETASK.md §11](FRANCIS-PHASETASK.md#evidence-log) once confirmed.

## F-02 — Schema inventory (B-01, Q-10)

**Status: repo-side inventory done; live inventory NOT done.** The Supabase MCP failed to connect (`CONNECTION_CLOSED`), and I did not read the live DB with the service-role key from `.env.local`. The live questions below stay open until someone runs the read-only SQL in the Supabase SQL editor (or the MCP reconnects).

### What the repo defines (`supabase/migrations/001`, `policies/001`, `policies/002`)

| Table | Notes |
|---|---|
| `users` | role in `super_admin/admin/user`; separate from `auth.users` |
| `documents` | `file_hash` unique; status `pending_approval/published/rejected` |
| `blockchain` | `id serial`, `hash` unique, no tail lock |
| `approvals` | `document_id NOT NULL`, `admin_id`, unique(document_id, admin_id) |
| `transactions` | `action_type` CHECK in (`upload, approve, reject, publish, verify, access`); `tx_hash` unique |
| `budget_data` | `allocated_amount DECIMAL` |

Policies: `budget_data` has `FOR ALL USING (auth.role()='authenticated')` (any signed-in user can write); `blockchain`/`transactions` are publicly readable; `users` policy self-references `public.users` (recursion risk noted in PHASETASK). Function `is_admin()` exists.

### Drift the code assumes (C-09)

- `src/app/api/budget/route.ts` and `consensus/[documentId]/{approve,reject}/route.ts` read/write `approvals.budget_id` and `budget_data.status`. Migration 001 defines neither, and `approvals.document_id` is `NOT NULL`, so a budget approval row could not be inserted without it being nullable.
- The `documents` Storage bucket is described as **public** in `PHASETASK.MD` (Task 0.2).

### Read-only SQL to run (SQL editor; no writes)

```sql
-- 1. Drift: do these columns exist, and is document_id nullable?
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name in ('approvals','budget_data','transactions','documents','blockchain','users')
order by table_name, ordinal_position;

-- 2. Constraints (incl. the transactions.action_type CHECK name and values)
select conrelid::regclass as tbl, conname, pg_get_constraintdef(oid) as def
from pg_constraint where connamespace='public'::regnamespace order by 1,2;

-- 3. RLS flags and policies
select schemaname, tablename, rowsecurity from pg_tables where schemaname='public';
select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname='public';

-- 4. Functions and triggers
select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef as security_definer
from pg_proc p where p.pronamespace='public'::regnamespace;
select event_object_table, trigger_name from information_schema.triggers where trigger_schema='public';

-- 5. Buckets (public flag)
select id, name, public, file_size_limit from storage.buckets;

-- 6. Extensions (pgcrypto / uuid-ossp availability for later migrations)
select extname from pg_extension;
```

### Answers recorded so far

| Question | Answer |
|---|---|
| `approvals.budget_id` exists live? | **Unknown** (code assumes yes; 001 says no) |
| `budget_data.status` exists live? | **Unknown** |
| `documents` bucket public? | **Unknown**; docs say public |
| Writes executed | None |

Interim rule (B-01) is already safe: the SME migrations only create new objects. The one inherited table I touch is `transactions` (additive columns + widened CHECK), and 007 looks up the CHECK by definition instead of assuming its name, so it works whichever way the drift went.

> **Decisions (Francis, in chat):** F-03 cookie sessions **approved**. F-04 **a new dedicated Supabase project** approved for testing and the demo; the existing shared project stays untouched. Open: who creates the project, team confirmation at CP-1, and the exact time (the machine clock read 04:36 PHT, which disagrees with the plan's timeline).

## F-03 — Session handling decision (B-11) — APPROVED

**Decision: HTTP-only cookie sessions via `@supabase/ssr`.** Never `localStorage`, no token in JS.

- **Sign-in** `POST /api/auth/sign-in`: server builds `createServerClient(url, anonKey, { cookies: { getAll, setAll } })` using `await cookies()` from `next/headers`, calls `signInWithPassword`; `setAll` writes the session cookies on the response. Returns `SessionDTO` (profile + memberships read with the service client).
- **Sign-out** `POST /api/auth/sign-out`: `auth.signOut()`; cookies cleared via `setAll`.
- **Reading the session in a route** (`requireUser`): call `supabase.auth.getUser()`, which verifies with the auth server and detects revocation. Do **not** trust `getSession()`/`getClaims()` for authorisation: they read the cookie without a network check. Roles then come from `org_memberships`/`profiles` read with the service client, never `user_metadata`.
- **Expiry:** no valid user → `401 UNAUTHENTICATED`; the client sends the user to sign-in. Refresh happens on demand inside `getUser()`; call it before building any response so refreshed cookies can be written.
- **Next 16:** `cookies()` is async. No middleware is required for this approach (route handlers only), which avoids the Next 16 `middleware`→`proxy` rename. Anything cached must send `Cache-Control: private, no-store` on auth routes.
- **§3.5 contract is unchanged.**
- **Needs:** `DEP: @supabase/ssr@0.12.5 | runtime | cookie session | src/server/auth/session.ts` → Carlos (§1.3). Docs checked via Context7 (`/supabase/ssr` v0.12.5). Not yet run against a real project.

## F-04 — DB test environment decision (B-02, B-12) — recommendation only, ⚠ AUTH pending

| Option | For | Against |
|---|---|---|
| (a) Local Supabase (CLI + Docker) | Disposable, safe for RPC concurrency tests, no shared-data risk | Needs Docker and the `supabase` CLI (dev-dep request to Carlos); setup time; Docker status unchecked |
| (b) Dedicated new hosted Supabase project | Fast, no Docker, same for all three teammates and the live demo | Free-tier project creation by a team member; keys must be rotated into `.env.local` |
| (c) Existing shared project | Already exists | Holds inherited government data, schema drift unknown, public buckets, policies we do not want to inherit. **Not recommended.** |

**Recommendation: (b) one new dedicated project for both testing and the demo**, because there are ~3.5 hours left and a single DB removes the "which DB does the demo use" question. Fall back to (a) only if project creation is blocked. Do not apply anything to the old project.

**Decision needed from the team in chat (record name + time):** which option, and who creates the project. Until then nothing is applied (F-19).
