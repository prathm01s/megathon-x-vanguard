// Runs the real SQL migrations against PGlite (Postgres compiled to WebAssembly) with a
// minimal stand-in for what Supabase provides (auth schema, auth.uid(), roles, extensions,
// the Realtime publication). No Docker needed: migrations, RLS policies and the room server
// can be tested in `pnpm test` and in CI.
//
// Differences from real Supabase are deliberate and small; anything Supabase-specific that
// isn't stubbed here (storage, pg_net, …) isn't used by our migrations.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

export const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../migrations");

/** What Supabase gives every project before our migrations run. */
const SUPABASE_BASELINE = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;
  create role supabase_admin nologin;

  create schema extensions;
  create extension pgcrypto with schema extensions;
  grant usage on schema extensions to anon, authenticated, service_role;

  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    created_at timestamptz not null default now()
  );

  -- Same definitions as Supabase: claims come from the request's JWT.
  create function auth.uid() returns uuid language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;
  create function auth.role() returns text language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.role', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
    )::text
  $$;
  grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;

  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

  create publication supabase_realtime;
`;

export type Db = PGlite | Transaction;

export interface TestDb {
  db: PGlite;
  /** Creates an auth user (what signup does) and returns its id. */
  createUser(email?: string): Promise<string>;
  /** Runs `fn` as a signed-in user, with RLS applied (role `authenticated`). */
  asUser<T>(userId: string, fn: (tx: Transaction) => Promise<T>): Promise<T>;
  /** Runs `fn` as the anonymous role. */
  asAnon<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
  /** Runs `fn` as the service role (bypasses RLS), like Edge Functions with the service key. */
  asService<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export async function createTestDb(): Promise<TestDb> {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_BASELINE);
  for (const file of migrationFiles()) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    } catch (err) {
      throw new Error(`migration ${file} failed: ${(err as Error).message}`);
    }
  }

  const as = async <T>(
    role: "authenticated" | "anon" | "service_role",
    sub: string | null,
    fn: (tx: Transaction) => Promise<T>,
  ): Promise<T> =>
    db.transaction(async (tx) => {
      const claims = JSON.stringify({ sub, role });
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
      await tx.exec(`set local role ${role}`);
      return fn(tx);
    });

  return {
    db,
    async createUser(email) {
      const res = await db.query<{ id: string }>(
        `insert into auth.users (email) values ($1) returning id`,
        [email ?? `${crypto.randomUUID()}@test.invalid`],
      );
      return res.rows[0]!.id;
    },
    asUser: (userId, fn) => as("authenticated", userId, fn),
    asAnon: (fn) => as("anon", null, fn),
    asService: (fn) => as("service_role", null, fn),
    close: () => db.close(),
  };
}
