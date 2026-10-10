// End-to-end tests of the room server: the real `room-action` handler and SQL, on the real
// migrations (PGlite), checked through RLS as each kind of user would see it.
import type { RoomView } from "@toss/engine";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleRoomCall, type RoomResponse } from "../functions/room-action/handler";
import type { SqlDatabase } from "../functions/room-action/sql-repo";
import { createTestDb, type TestDb } from "./harness";

let t: TestDb;
let clock = new Date("2026-10-10T10:00:00Z");
let codes = 0;
let db: SqlDatabase;

const call = (userId: string | null, body: unknown) =>
  handleRoomCall(
    {
      db,
      now: () => clock,
      newSeed: () => `seed-${codes}`,
      newCode: () => `ROOM${"ABCDEFGHJK"[codes++ % 10]}${"2345678923"[Math.floor(codes / 10) % 10]}`,
    },
    userId,
    body,
  );

function ok(res: RoomResponse): { code: string; view: RoomView } {
  if (res.status !== 200) throw new Error(`expected 200, got ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

/** A student with a profile and a Mindset Check result. */
async function student(name: string, persona = "safe-keeper", orgId: string | null = null): Promise<string> {
  const id = await t.createUser(`${name}@test.invalid`);
  await t.asService(async (tx) => {
    await tx.query(
      `insert into profiles (user_id, role, org_id, username, nickname) values ($1, 'student', $2, $3, $4)`,
      [id, orgId, name, name],
    );
    await tx.query(
      `insert into mindset_responses (user_id, phase, answers, scores, persona_id, content_version)
       values ($1, 'pre', '{}', '{}', $2, 'test')`,
      [id, persona],
    );
  });
  return id;
}

async function answerScams(userId: string, code: string, view: RoomView): Promise<RoomView> {
  let v = view;
  for (const p of view.me?.state.pendingScams ?? []) {
    v = ok(await call(userId, { code, op: "act", action: { type: "scam_response", instanceId: p.instanceId, response: "ignore" } })).view;
  }
  return v;
}

beforeAll(async () => {
  t = await createTestDb();
  db = {
    transaction: (fn) =>
      t.db.transaction((tx) => fn({ query: async (text, params) => (await tx.query(text, params)).rows as never })),
  };
});
afterAll(async () => t?.close());

describe("room-action: lobby", () => {
  it("rejects unauthenticated callers and users without a profile", async () => {
    expect((await call(null, { op: "create", chapterId: "ch2-first-job" })).status).toBe(401);
    const noProfile = await t.createUser();
    expect((await call(noProfile, { op: "create", chapterId: "ch2-first-job" })).body).toMatchObject({ code: "no_profile" });
  });

  it("validates the request body", async () => {
    const u = await student("validator");
    const { code } = ok(await call(u, { op: "create", chapterId: "ch2-first-job" }));
    expect((await call(u, { code, op: "place_bid", amount: -5 })).status).toBe(400);
    expect((await call(u, { code, op: "teleport" })).status).toBe(400);
    expect((await call(u, { code: "bad", op: "join" })).status).toBe(400);
    expect((await call(u, { code: "ZZZZZZ", op: "join" })).status).toBe(404);
    expect((await call(u, { op: "create", chapterId: "ch9-not-a-chapter" })).body).toMatchObject({ code: "unknown_chapter" });
  });

  it("creates, joins and starts a room; only the host can start", async () => {
    const host = await student("host_one");
    const guest = await student("guest_one", "thrill-seeker");
    const created = ok(await call(host, { op: "create", chapterId: "ch2-first-job" }));
    expect(created.view.status).toBe("lobby");
    expect(created.view.me?.nickname).toBe("host_one");

    ok(await call(guest, { code: created.code, op: "join" }));
    expect((await call(guest, { code: created.code, op: "start" })).body).toMatchObject({ code: "not_host" });
    const started = ok(await call(host, { code: created.code, op: "start" }));
    expect(started.view.status).toBe("playing");
    expect(started.view.members.length).toBeGreaterThanOrEqual(3);

    // The guest's persona comes from their latest Mindset Check, not from the request.
    const guestView = ok(await call(guest, { code: created.code, op: "tick" })).view;
    expect(guestView.me?.state.personaId).toBe("thrill-seeker");

    // Each human got a playthrough; the turn timer is running.
    const rows = await t.asService((tx) =>
      tx.query<{ user_id: string | null; playthrough_id: string | null }>(
        `select m.user_id, m.playthrough_id from room_members m join rooms r on r.id = m.room_id where r.code = $1`,
        [created.code],
      ),
    );
    expect(rows.rows.filter((r) => r.user_id).every((r) => r.playthrough_id)).toBe(true);
    const room = await t.asService((tx) => tx.query<{ turn_deadline: Date }>(`select turn_deadline from rooms where code = $1`, [created.code]));
    expect(new Date(room.rows[0]!.turn_deadline).getTime()).toBeGreaterThan(clock.getTime());
  });
});

describe("room-action: playing", () => {
  let host: string;
  let guest: string;
  let code: string;

  beforeAll(async () => {
    host = await student("play_host");
    guest = await student("play_guest");
    code = ok(await call(host, { op: "create", chapterId: "ch2-first-job" })).code;
    ok(await call(guest, { code, op: "join" }));
    ok(await call(host, { code, op: "start" }));
  });

  it("resolves the turn once every human has submitted, and logs decisions", async () => {
    ok(await call(host, { code, op: "act", action: { type: "invest", optionId: "savings", amount: 5000_00 } }));
    expect(ok(await call(host, { code, op: "submit_turn" })).view.turn).toBe(0);
    const v = ok(await call(guest, { code, op: "submit_turn" })).view;
    expect(v.turn).toBe(1);

    const decisions = await t.asUser(host, (tx) =>
      tx.query<{ type: string }>(`select d.type from decisions d`),
    );
    const types = decisions.rows.map((r) => r.type);
    expect(types).toContain("invest");
    expect(types).toContain("market_toss");
  });

  it("keeps the seeds on the server: views and playthrough rows have none", async () => {
    const view = ok(await call(host, { code, op: "tick" })).view;
    expect(view.me?.state.seed).toBe("");
    expect(view.me?.state.marketSeed).toBe("");
    const pt = await t.asUser(host, (tx) => tx.query<{ seed: string; state: { seed: string; turn: number } }>(`select seed, state from playthroughs`));
    expect(pt.rows[0]!.seed).toBe(`room:${code}`);
    expect(pt.rows[0]!.state.seed).toBe("");
    expect(pt.rows[0]!.state.turn).toBe(1); // in step with the room
  });

  it("RLS: each player reads only their own view; outsiders read nothing; nobody reads state or seed", async () => {
    const mine = await t.asUser(host, (tx) => tx.query<{ user_id: string }>(`select user_id from room_views`));
    expect(mine.rows.map((r) => r.user_id)).toEqual([host]);

    const outsider = await student("outsider");
    const seen = await t.asUser(outsider, async (tx) => ({
      rooms: (await tx.query(`select id from rooms`)).rows.length,
      views: (await tx.query(`select id from room_views`)).rows.length,
      members: (await tx.query(`select id from room_members`)).rows.length,
    }));
    expect(seen).toEqual({ rooms: 0, views: 0, members: 0 });

    await expect(t.asUser(host, (tx) => tx.query(`select state from rooms`))).rejects.toThrow(/permission denied/);
    await expect(t.asUser(host, (tx) => tx.query(`select seed from rooms`))).rejects.toThrow(/permission denied/);
    const ok2 = await t.asUser(host, (tx) => tx.query(`select code, status, turn from rooms`));
    expect(ok2.rows).toHaveLength(1);
  });

  it("RLS: clients can't write room tables directly", async () => {
    await expect(t.asUser(host, (tx) => tx.query(`update rooms set turn = 99`))).rejects.toThrow(/permission denied/);
    await expect(
      t.asUser(host, (tx) => tx.query(`insert into room_views (room_id, room_code, user_id, view, version) select id, code, $1, '{}', 0 from rooms`, [host])),
    ).rejects.toThrow(/permission denied/);
  });

  it("projects loans for stats", async () => {
    await answerScams(guest, code, ok(await call(guest, { code, op: "tick" })).view);
    ok(await call(guest, { code, op: "request_loan", amount: 10000_00, dueTurn: 3 }));
    const loans = await t.asUser(host, (tx) => tx.query<{ status: string; lender_kind: string | null }>(`select status, lender_kind from loans`));
    expect(loans.rows.map((r) => r.status)).toEqual(expect.arrayContaining(["requested", "offered"]));
    expect(loans.rows.map((r) => r.lender_kind)).toEqual(expect.arrayContaining(["bank", "loan_app"]));
  });

  it("the turn timer resolves a turn nobody submitted", async () => {
    const before = ok(await call(host, { code, op: "tick" })).view.turn;
    clock = new Date(clock.getTime() + 10 * 60_000); // way past turnTimerSeconds
    const after = ok(await call(host, { code, op: "tick" })).view;
    expect(after.turn).toBe(before + 1);
  });
});

describe("room-action: auction and the end of the chapter", () => {
  it("seals bids under RLS, then reveals them; finishing writes results for both players", async () => {
    const a = await student("fin_a");
    const b = await student("fin_b");
    const code = ok(await call(a, { op: "create", chapterId: "ch2-first-job" })).code;
    ok(await call(b, { code, op: "join" }));
    ok(await call(a, { code, op: "start" }));

    const both = async () => {
      for (const u of [a, b]) {
        const v = ok(await call(u, { code, op: "tick" })).view;
        await answerScams(u, code, v);
      }
      for (const u of [a, b]) ok(await call(u, { code, op: "submit_turn" }));
    };
    for (let i = 0; i < 3; i++) await both(); // to the bike auction (year 4)

    for (const u of [a, b]) await answerScams(u, code, ok(await call(u, { code, op: "tick" })).view);
    ok(await call(a, { code, op: "place_bid", amount: 30000_00 }));
    ok(await call(b, { code, op: "place_bid", amount: 25000_00 }));
    const sealed = await t.asUser(a, (tx) => tx.query<{ amount: number }>(`select amount from bids`));
    expect(sealed.rows.map((r) => Number(r.amount))).toEqual([30000_00]); // only my own bid

    await both(); // auction closes
    const revealed = await t.asUser(a, (tx) => tx.query(`select amount from bids`));
    expect(revealed.rows.length).toBeGreaterThanOrEqual(2);

    await both(); // turn 5: the chapter ends
    for (const u of [a, b]) await answerScams(u, code, ok(await call(u, { code, op: "tick" })).view);
    const final = ok(await call(a, { code, op: "tick" })).view;
    expect(final.status).toBe("finished");

    for (const u of [a, b]) {
      const r = await t.asUser(u, (tx) =>
        tx.query<{ health_score: number; passed: boolean }>(`select health_score, passed from chapter_results`),
      );
      expect(r.rows).toHaveLength(1);
      const end = await t.asUser(u, (tx) => tx.query(`select 1 from decisions where type = 'chapter_end'`));
      expect(end.rows).toHaveLength(1);
      const pt = await t.asUser(u, (tx) => tx.query<{ status: string }>(`select status from playthroughs`));
      expect(pt.rows[0]!.status).toBe("completed");
    }
  });
});

describe("room-action: NGO class rooms", () => {
  it("the NGO admin sees their students' rooms and loans, not other rooms", async () => {
    const admin = await t.createUser("admin@class.test");
    const orgId = await t.asUser(admin, async (tx) =>
      (await tx.query<{ id: string }>(`select create_organization('Class NGO', 'class_admin', 'Admin') as id`)).rows[0]!.id,
    );
    const pupil = await student("class_pupil", "safe-keeper", orgId);
    const code = ok(await call(pupil, { op: "create", chapterId: "ch2-first-job" })).code;
    const rooms = await t.asUser(admin, (tx) => tx.query<{ code: string }>(`select code from rooms`));
    expect(rooms.rows.map((r) => r.code)).toEqual([code]);
    const views = await t.asUser(admin, (tx) => tx.query(`select id from room_views`));
    expect(views.rows).toHaveLength(0); // a player's view stays private
  });
});
