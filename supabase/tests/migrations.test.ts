import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrationFiles, type TestDb } from "./harness";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(async () => t?.close());

describe("migrations", () => {
  it("all apply cleanly, in order, on a fresh database", () => {
    expect(migrationFiles().length).toBeGreaterThan(0);
  });

  it("enable RLS on every public table", async () => {
    const res = await t.db.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(res.rows.map((r) => r.relname)).toEqual([]);
  });
});
