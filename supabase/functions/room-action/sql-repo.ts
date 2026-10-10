// All SQL the room server runs, behind a tiny `{ query }` interface so the same code runs on
// postgres.js in the Edge Function and on PGlite in tests. Owner: Samarth.
// Everything here runs inside ONE transaction per request (see handler.ts).
import { redactSeeds } from "@toss/engine";
import type {
  ChapterResult,
  DecisionRecord,
  GameState,
  Loan,
  MemberDecision,
  RoomState,
  RoomView,
} from "@toss/engine";

export interface SqlClient {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface SqlDatabase {
  transaction<T>(fn: (client: SqlClient) => Promise<T>): Promise<T>;
}

export interface Actor {
  userId: string;
  nickname: string;
  avatarId: string;
  personaId: string;
  orgId: string | null;
}

export interface StoredRoom {
  id: string;
  state: RoomState;
  version: number;
  deadline: Date | null;
}

// JSON goes in as TEXT and is cast in SQL (`$n::text::jsonb`). postgres.js JSON-encodes values
// it sees as jsonb, so passing a string to a plain `$n::jsonb` would store a double-encoded
// JSON string (caught by `pnpm functions:smoke`; PGlite sends text so the unit tests can't).
const json = (value: unknown) => JSON.stringify(value);

/** The signed-in player's public profile and current persona (latest Mindset Check). */
export async function loadActor(
  db: SqlClient,
  userId: string,
  fallbackPersonaId: string,
): Promise<Actor | null> {
  const rows = await db.query<{
    nickname: string;
    avatar_id: string;
    org_id: string | null;
    persona_id: string | null;
  }>(
    `select p.nickname, p.avatar_id, p.org_id,
            (select m.persona_id from public.mindset_responses m
              where m.user_id = p.user_id order by m.created_at desc limit 1) as persona_id
       from public.profiles p where p.user_id = $1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    userId,
    nickname: row.nickname,
    avatarId: row.avatar_id,
    personaId: row.persona_id ?? fallbackPersonaId,
    orgId: row.org_id,
  };
}

/** Loads a room and LOCKS its row until the transaction ends (requests are serialised). */
export async function lockRoom(db: SqlClient, code: string): Promise<StoredRoom | null> {
  const rows = await db.query<{ id: string; state: RoomState; version: number; turn_deadline: string | Date | null }>(
    `select id, state, version, turn_deadline from public.rooms where code = $1 for update`,
    [code],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    state: row.state,
    version: row.version,
    deadline: row.turn_deadline ? new Date(row.turn_deadline) : null,
  };
}

export async function codeExists(db: SqlClient, code: string): Promise<boolean> {
  return (await db.query(`select 1 from public.rooms where code = $1`, [code])).length > 0;
}

export async function insertRoom(
  db: SqlClient,
  room: RoomState,
  host: Actor,
  contentVersion: string,
): Promise<string> {
  const rows = await db.query<{ id: string }>(
    `insert into public.rooms (code, org_id, host_user_id, chapter_id, status, turn, seed, state, content_version)
     values ($1, $2, $3, $4, $5, $6, $7, $8::text::jsonb, $9) returning id`,
    [room.code, host.orgId, host.userId, room.chapterId, room.status, room.turn, room.seed, json(room), contentVersion],
  );
  return rows[0]!.id;
}

/** Creates a playthrough per human when the room starts, so room games show in progress/stats. */
export async function createRoomPlaythroughs(
  db: SqlClient,
  roomId: string,
  room: RoomState,
  contentVersion: string,
): Promise<void> {
  for (const m of room.members.filter((x) => !x.isBot && x.userId)) {
    const existing = await db.query<{ playthrough_id: string | null }>(
      `select playthrough_id from public.room_members where room_id = $1 and member_key = $2`,
      [roomId, m.id],
    );
    if (existing[0]?.playthrough_id) continue;
    const rows = await db.query<{ id: string }>(
      `insert into public.playthroughs (user_id, persona_id, seed, content_version, current_chapter_id, status, state)
       values ($1, $2, $3, $4, $5, 'active', $6::text::jsonb) returning id`,
      // Seeds stay server-side (see redactSeeds); the row is readable by the student.
      [m.userId, m.state.personaId, `room:${room.code}`, contentVersion, room.chapterId, json(redactSeeds(m.state))],
    );
    await db.query(`update public.room_members set playthrough_id = $1 where room_id = $2 and member_key = $3`, [
      rows[0]!.id,
      roomId,
      m.id,
    ]);
  }
}

/** member_key → room_members.id / playthrough_id */
async function memberRows(db: SqlClient, roomId: string) {
  const rows = await db.query<{ id: string; member_key: string; playthrough_id: string | null }>(
    `select id, member_key, playthrough_id from public.room_members where room_id = $1`,
    [roomId],
  );
  return new Map(rows.map((r) => [r.member_key, r]));
}

/**
 * Writes the room (state + projections + every player's view + decision records) after a
 * successful request. Called inside the same transaction that locked the room.
 */
export async function saveRoom(
  db: SqlClient,
  args: {
    roomId: string;
    room: RoomState;
    records: MemberDecision[];
    deadline: Date | null;
    viewFor: (userId: string) => RoomView;
  },
): Promise<number> {
  const { roomId, room } = args;
  const updated = await db.query<{ version: number }>(
    `update public.rooms
        set state = $2::text::jsonb, status = $3, turn = $4, turn_deadline = $5,
            version = version + 1, updated_at = now()
      where id = $1 returning version`,
    [roomId, json(room), room.status, room.turn, args.deadline?.toISOString() ?? null],
  );
  const version = updated[0]!.version;

  // Members (upsert; remove anyone who left the lobby).
  for (const m of room.members) {
    await db.query(
      `insert into public.room_members (room_id, member_key, user_id, is_bot, bot_strategy, seat, nickname, trust_score)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (room_id, member_key) do update
         set seat = excluded.seat, nickname = excluded.nickname, trust_score = excluded.trust_score`,
      [roomId, m.id, m.userId, m.isBot, m.botStrategy ?? null, m.seat, m.nickname, m.trustScore],
    );
  }
  await db.query(`delete from public.room_members where room_id = $1 and not (member_key = any($2::text[]))`, [
    roomId,
    room.members.map((m) => m.id),
  ]);
  const members = await memberRows(db, roomId);

  await projectLoans(db, roomId, room.loans, members);
  await projectAuction(db, roomId, room, members);

  // Every human's view (Realtime pushes the changed rows to each player).
  for (const m of room.members.filter((x) => x.userId)) {
    await db.query(
      `insert into public.room_views (room_id, room_code, user_id, view, version)
       values ($1, $2, $3, $4::text::jsonb, $5)
       on conflict (room_id, user_id) do update
         set view = excluded.view, version = excluded.version, updated_at = now()`,
      [roomId, room.code, m.userId, json(args.viewFor(m.userId!)), version],
    );
  }
  await db.query(
    `delete from public.room_views where room_id = $1 and not (user_id = any($2::uuid[]))`,
    [roomId, room.members.filter((m) => m.userId).map((m) => m.userId)],
  );

  // Keep each player's playthrough in step with their room game.
  for (const m of room.members.filter((x) => !x.isBot)) {
    const pt = members.get(m.id)?.playthrough_id;
    if (pt) await savePlaythroughState(db, pt, m.state);
  }

  await insertDecisions(db, args.records, members);
  return version;
}

async function savePlaythroughState(db: SqlClient, playthroughId: string, state: GameState) {
  await db.query(`update public.playthroughs set state = $2::text::jsonb, updated_at = now() where id = $1`, [
    playthroughId,
    json(redactSeeds(state)),
  ]);
}

async function insertDecisions(
  db: SqlClient,
  records: MemberDecision[],
  members: Map<string, { playthrough_id: string | null }>,
) {
  for (const { memberId, record } of records) {
    const pt = members.get(memberId)?.playthrough_id;
    if (!pt) continue; // lobby-time actions happen before playthroughs exist
    await insertDecision(db, pt, record);
  }
}

async function insertDecision(db: SqlClient, playthroughId: string, record: DecisionRecord) {
  await db.query(
    `insert into public.decisions (playthrough_id, chapter_id, turn, type, payload) values ($1, $2, $3, $4, $5::text::jsonb)`,
    [playthroughId, record.chapterId, record.turn, record.type, json(record.payload)],
  );
}

function lenderKind(l: Loan): "member" | "bank" | "loan_app" | null {
  if (l.status === "requested") return null;
  if (l.lenderMemberId === "bank") return "bank";
  if (l.lenderMemberId === "loan-app") return "loan_app";
  return "member";
}

async function projectLoans(
  db: SqlClient,
  roomId: string,
  loans: Loan[],
  members: Map<string, { id: string }>,
) {
  for (const l of loans) {
    const borrower = members.get(l.borrowerMemberId)?.id;
    if (!borrower) continue;
    await db.query(
      `insert into public.loans (room_id, loan_key, request_key, lender_kind, lender_member_id, borrower_member_id,
                                 principal, rate_per_turn, interest_type, start_turn, due_turn, status, repaid_amount)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       on conflict (room_id, loan_key) do update
         set status = excluded.status, repaid_amount = excluded.repaid_amount,
             start_turn = excluded.start_turn, rate_per_turn = excluded.rate_per_turn`,
      [
        roomId,
        l.id,
        l.requestId ?? null,
        lenderKind(l),
        members.get(l.lenderMemberId)?.id ?? null,
        borrower,
        l.principal,
        l.ratePerTurn,
        l.interestType,
        l.startTurn,
        l.dueTurn,
        l.status,
        l.repaidAmount,
      ],
    );
  }
  // Accepted requests disappear from the room state; drop them here too.
  await db.query(`delete from public.loans where room_id = $1 and not (loan_key = any($2::text[]))`, [
    roomId,
    loans.map((l) => l.id),
  ]);
}

async function projectAuction(
  db: SqlClient,
  roomId: string,
  room: RoomState,
  members: Map<string, { id: string }>,
) {
  const a = room.auction;
  if (!a) return;
  const rows = await db.query<{ id: string }>(
    `insert into public.auctions (room_id, auction_def_id, turn, status, winner_member_id, winner_pool_key, winning_bid, true_value)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (room_id, auction_def_id) do update
       set status = excluded.status, winner_member_id = excluded.winner_member_id,
           winner_pool_key = excluded.winner_pool_key, winning_bid = excluded.winning_bid,
           true_value = excluded.true_value
     returning id`,
    [
      roomId,
      a.auctionDefId,
      a.turn,
      a.status,
      a.winner?.memberId ? (members.get(a.winner.memberId)?.id ?? null) : null,
      a.winner?.poolId ?? null,
      a.winner?.amount ?? null,
      a.trueValue ?? null,
    ],
  );
  const auctionId = rows[0]!.id;
  // Bids and pools are small: rewrite them.
  await db.query(`delete from public.bids where auction_id = $1`, [auctionId]);
  await db.query(`delete from public.bid_pools where auction_id = $1`, [auctionId]);
  const poolIds = new Map<string, string>();
  for (const p of a.pools) {
    const pr = await db.query<{ id: string }>(
      `insert into public.bid_pools (auction_id, pool_key) values ($1, $2) returning id`,
      [auctionId, p.id],
    );
    poolIds.set(p.id, pr[0]!.id);
    for (const pm of p.members) {
      const mid = members.get(pm.memberId)?.id;
      if (mid) {
        await db.query(
          `insert into public.bid_pool_members (pool_id, member_id, contribution) values ($1, $2, $3)`,
          [pr[0]!.id, mid, pm.contribution],
        );
      }
    }
  }
  for (const b of a.bids) {
    const memberId = b.memberId ? (members.get(b.memberId)?.id ?? null) : null;
    const poolId = b.poolId ? (poolIds.get(b.poolId) ?? null) : null;
    if (!memberId && !poolId) continue;
    await db.query(`insert into public.bids (auction_id, member_id, pool_id, amount) values ($1, $2, $3, $4)`, [
      auctionId,
      memberId,
      poolId,
      b.amount,
    ]);
  }
}

/** Chapter over: results, badges, persona shift and the chapter_end decision per human. */
export async function saveRoomResults(
  db: SqlClient,
  roomId: string,
  results: Record<string, ChapterResult>,
  records: (memberId: string, result: ChapterResult) => DecisionRecord[],
): Promise<void> {
  const members = await memberRows(db, roomId);
  const users = await db.query<{ member_key: string; user_id: string | null }>(
    `select member_key, user_id from public.room_members where room_id = $1`,
    [roomId],
  );
  const userOf = new Map(users.map((u) => [u.member_key, u.user_id]));
  for (const [memberId, result] of Object.entries(results)) {
    const pt = members.get(memberId)?.playthrough_id;
    const userId = userOf.get(memberId);
    if (!pt || !userId) continue; // bots
    await db.query(
      `insert into public.chapter_results (playthrough_id, chapter_id, attempt, health_score, score_breakdown, report, passed)
       values ($1, $2, $3, $4, $5::text::jsonb, $6::text::jsonb, $7)
       on conflict (playthrough_id, chapter_id, attempt) do nothing`,
      [pt, result.chapterId, result.attempt, result.healthScore, json(result.breakdown), json({ ...result.report, carryOver: result.carryOver, metrics: result.metrics }), result.passed],
    );
    await db.query(`update public.playthroughs set status = 'completed', updated_at = now() where id = $1`, [pt]);
    for (const badge of result.badgesEarned) {
      await db.query(
        `insert into public.badges_earned (user_id, badge_id) values ($1, $2) on conflict (user_id, badge_id) do nothing`,
        [userId, badge],
      );
    }
    for (const record of records(memberId, result)) await insertDecision(db, pt, record);
  }
}
