// Smoke test of the accounts migration (Prathmesh's) through the PGlite harness: the flows
// the room server builds on. Prathmesh owns the full RLS test suite for these tables.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./harness";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(async () => t?.close());

describe("accounts migration (smoke)", () => {
  it("NGO signup RPC creates the org and its admin profile", async () => {
    const admin = await t.createUser("admin@ngo.test");
    const orgId = await t.asUser(admin, async (tx) => {
      const r = await tx.query<{ id: string }>(
        `select public.create_organization('Hope Foundation', 'hope_admin', 'Hope Admin') as id`,
      );
      return r.rows[0]!.id;
    });
    expect(orgId).toBeTruthy();
    const profile = await t.asUser(admin, (tx) =>
      tx.query<{ role: string; org_id: string; player_id: string }>(`select role, org_id, player_id from profiles`),
    );
    expect(profile.rows).toEqual([{ role: "ngo_admin", org_id: orgId, player_id: expect.stringMatching(/^TL-[A-Z2-9]{5}$/) }]);
  });

  it("a personal learner creates their own profile and can't change their role", async () => {
    const student = await t.createUser();
    await t.asUser(student, (tx) =>
      tx.query(`insert into profiles (user_id, role, username, nickname) values ($1, 'student', 'coin_kid', 'Coin Kid')`, [student]),
    );
    await expect(
      t.asUser(student, (tx) => tx.query(`update profiles set role = 'ngo_admin' where user_id = $1`, [student])),
    ).rejects.toThrow(/can only be changed by the server/);
    await t.asUser(student, (tx) => tx.query(`update profiles set nickname = 'Coiny' where user_id = $1`, [student]));
  });

  it("students can't read each other's profiles", async () => {
    const a = await t.createUser();
    const b = await t.createUser();
    await t.asService((tx) =>
      tx.query(
        `insert into profiles (user_id, role, username, nickname) values ($1, 'student', 'aa_one', 'A'), ($2, 'student', 'bb_two', 'B')`,
        [a, b],
      ),
    );
    const seen = await t.asUser(a, (tx) => tx.query<{ user_id: string }>(`select user_id from profiles`));
    expect(seen.rows.map((r) => r.user_id)).toEqual([a]);
  });
});
