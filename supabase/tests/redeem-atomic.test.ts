import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./harness";

let t: TestDb;
let adminId: string;
let orgId: string;

beforeAll(async () => {
  t = await createTestDb();
  adminId = await t.createUser("admin_atomic@ngo.test");
  orgId = await t.asUser(adminId, async (tx) => {
    const res = await tx.query<{ id: string }>(
      `select public.create_organization('Atomic NGO', 'atomic_admin', 'Atomic Facilitator') as id`,
    );
    return res.rows[0]!.id;
  });
});

afterAll(async () => t?.close());

describe("atomic code redemption and rate limiting", () => {
  it("claims a pending code atomically and rejects subsequent claims", async () => {
    const codeHash = "hash_claim_test";
    const [inserted] = (
      await t.asService((tx) =>
        tx.query<{ id: string }>(
          `insert into public.student_codes (org_id, code_hash, code_last4, status, created_by)
           values ($1, $2, '9999', 'pending', $3)
           returning id`,
          [orgId, codeHash, adminId],
        ),
      )
    ).rows;

    const res = await t.asAnon(async (tx) => {
      const q = await tx.query<{ code_id: string; org_id: string }>(
        `select * from public.redeem_student_code_claim($1, $2)`,
        [codeHash, "192.168.1.100"],
      );
      return q.rows[0];
    });

    expect(res).toBeDefined();
    expect(res?.code_id).toBe(inserted!.id);
    expect(res?.org_id).toBe(orgId);

    // Second claim must fail because code is now active
    await expect(
      t.asAnon(async (tx) => {
        await tx.query(`select * from public.redeem_student_code_claim($1, $2)`, [
          codeHash,
          "192.168.1.101",
        ]);
      }),
    ).rejects.toThrow(/code_already_used/);
  });

  it("enforces 5 attempts per minute rate limit per IP", async () => {
    const testIp = "10.42.0.99";

    // Insert 6 valid pending codes
    const hashes: string[] = [];
    for (let i = 0; i < 6; i++) {
      const h = `hash_rl_${i}`;
      hashes.push(h);
      await t.asService((tx) =>
        tx.query(
          `insert into public.student_codes (org_id, code_hash, code_last4, status, created_by)
           values ($1, $2, '1111', 'pending', $3)`,
          [orgId, h, adminId],
        ),
      );
    }

    // First 5 attempts from testIp must succeed
    for (let i = 0; i < 5; i++) {
      await t.asAnon(async (tx) => {
        await tx.query(`select * from public.redeem_student_code_claim($1, $2)`, [
          hashes[i]!,
          testIp,
        ]);
      });
    }

    // 6th attempt from testIp must be blocked by rate limit
    await expect(
      t.asAnon(async (tx) => {
        await tx.query(`select * from public.redeem_student_code_claim($1, $2)`, [
          hashes[5]!,
          testIp,
        ]);
      }),
    ).rejects.toThrow(/rate_limit_exceeded/);
  });

  it("reverts claimed code back to pending on failure", async () => {
    const codeHash = "hash_revert_test";
    const [inserted] = (
      await t.asService((tx) =>
        tx.query<{ id: string }>(
          `insert into public.student_codes (org_id, code_hash, code_last4, status, created_by)
           values ($1, $2, '2222', 'pending', $3)
           returning id`,
          [orgId, codeHash, adminId],
        ),
      )
    ).rows;

    const codeId = inserted!.id;

    // Claim
    await t.asAnon((tx) =>
      tx.query(`select * from public.redeem_student_code_claim($1, $2)`, [codeHash, "10.0.0.50"]),
    );

    // Verify active
    const rowActive = (
      await t.asService((tx) =>
        tx.query<{ status: string }>(`select status from public.student_codes where id = $1`, [codeId]),
      )
    ).rows[0];
    expect(rowActive?.status).toBe("active");

    // Revert
    await t.asService((tx) =>
      tx.query(`select public.redeem_student_code_revert($1)`, [codeId]),
    );

    // Verify back to pending
    const rowReverted = (
      await t.asService((tx) =>
        tx.query<{ status: string; redeemed_at: string | null }>(
          `select status, redeemed_at from public.student_codes where id = $1`,
          [codeId],
        ),
      )
    ).rows[0];
    expect(rowReverted?.status).toBe("pending");
    expect(rowReverted?.redeemed_at).toBeNull();
  });

  it("finalizes claimed code with student user id", async () => {
    const studentUser = await t.createUser("student_final@test.invalid");
    const codeHash = "hash_finalize_test";
    const [inserted] = (
      await t.asService((tx) =>
        tx.query<{ id: string }>(
          `insert into public.student_codes (org_id, code_hash, code_last4, status, created_by)
           values ($1, $2, '3333', 'pending', $3)
           returning id`,
          [orgId, codeHash, adminId],
        ),
      )
    ).rows;

    const codeId = inserted!.id;

    // Claim
    await t.asAnon((tx) =>
      tx.query(`select * from public.redeem_student_code_claim($1, $2)`, [codeHash, "10.0.0.60"]),
    );

    // Finalize
    await t.asService((tx) =>
      tx.query(`select public.redeem_student_code_finalize($1, $2)`, [codeId, studentUser]),
    );

    const row = (
      await t.asService((tx) =>
        tx.query<{ status: string; redeemed_by: string }>(
          `select status, redeemed_by from public.student_codes where id = $1`,
          [codeId],
        ),
      )
    ).rows[0];

    expect(row?.status).toBe("active");
    expect(row?.redeemed_by).toBe(studentUser);
  });
});
