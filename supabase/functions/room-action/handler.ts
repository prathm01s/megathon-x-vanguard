// The server-authoritative Friends' Room (§7.6, §15.5 item 15). Owner: Samarth.
//
// One call = one transaction:
//   lock the room row → resolve the turn first if its timer ran out → validate and apply the
//   request with the engine's room rules → write state, projections, every player's view and
//   the decision records → return the caller's view.
// The player is identified ONLY from the verified auth token (`userId`), never from the body.
// Runtime-agnostic: no Deno or Node APIs, so it is tested in Node against PGlite.
import contentBundle from "@toss/content/bundle";
import type { ContentBundle } from "@toss/content";
import {
  applyRoomRequest,
  chapterResultRecords,
  createRoomState,
  drainOutbox,
  EngineError,
  endRoomChapter,
  parseRoomRequest,
  resolveTurn,
  viewRoomFor,
  type RoomState,
  type RoomView,
} from "@toss/engine";
import {
  codeExists,
  createRoomPlaythroughs,
  insertRoom,
  loadActor,
  lockRoom,
  saveRoom,
  saveRoomResults,
  type SqlDatabase,
} from "./sql-repo.ts";

export interface RoomServerDeps {
  db: SqlDatabase;
  content?: ContentBundle;
  now?: () => Date;
  newSeed?: () => string;
  newCode?: () => string;
}

export type RoomResponse =
  | { status: 200; body: { code: string; view: RoomView } }
  | { status: 400 | 401 | 403 | 404 | 409 | 500; body: { code: string; message: string } };

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomString(alphabet: string, length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const STATUS_BY_CODE: Record<string, 400 | 403 | 404 | 409> = {
  bad_request: 400,
  not_in_room: 403,
  not_host: 403,
  room_not_found: 404,
  no_profile: 403,
  unknown_chapter: 404,
};

function fail(code: string, message: string): RoomResponse {
  return { status: STATUS_BY_CODE[code] ?? 409, body: { code, message } };
}

export async function handleRoomCall(
  deps: RoomServerDeps,
  userId: string | null,
  body: unknown,
): Promise<RoomResponse> {
  if (!userId) return { status: 401, body: { code: "unauthenticated", message: "sign in first" } };
  const content = deps.content ?? (contentBundle as ContentBundle);
  const now = deps.now ?? (() => new Date());
  const newSeed = deps.newSeed ?? (() => randomString("abcdefghijklmnopqrstuvwxyz0123456789", 16));
  const newCode = deps.newCode ?? (() => randomString(CODE_ALPHABET, 6));
  const timerMs = content.multiplayer.turnTimerSeconds * 1000;
  const fallbackPersona = content.personas.assignmentRules.at(-1)!.personaId;

  if (typeof body !== "object" || body === null) return fail("bad_request", "body must be a JSON object");
  const { code: rawCode, ...rest } = body as Record<string, unknown>;

  try {
    return await deps.db.transaction(async (db) => {
      const actor = await loadActor(db, userId, fallbackPersona);
      if (!actor) return fail("no_profile", "create your profile first");

      // ── create ────────────────────────────────────────────────────────────
      if (rest.op === "create") {
        const chapterId = typeof rest.chapterId === "string" ? rest.chapterId : "";
        const chapter = content.chapters.find((c) => c.id === chapterId && c.enabled);
        if (!chapter) return fail("unknown_chapter", `no playable chapter "${chapterId}"`);
        let code = newCode();
        for (let i = 0; (await codeExists(db, code)) && i < 10; i++) code = newCode();
        const room = createRoomState({ code, seed: newSeed(), chapterId, host: actor, content });
        const roomId = await insertRoom(db, room, actor, content.contentVersion);
        const { room: clean, records } = drainOutbox(room);
        await saveRoom(db, { roomId, room: clean, records, deadline: null, viewFor: (u) => viewRoomFor(clean, u) });
        return { status: 200, body: { code, view: viewRoomFor(clean, userId) } };
      }

      // ── everything else acts on an existing room ─────────────────────────
      const code = typeof rawCode === "string" ? rawCode.toUpperCase() : "";
      if (!/^[A-Z2-9]{6}$/.test(code)) return fail("bad_request", "code must be 6 characters");
      const request = parseRoomRequest(rest);
      const stored = await lockRoom(db, code);
      if (!stored) return fail("room_not_found", `no room ${code}`);

      const before = stored.state;
      let room: RoomState = before;
      // The turn timer ran out: resolve with default decisions before anything else (§8.14).
      const expired =
        room.status === "playing" && stored.deadline !== null && now().getTime() >= stored.deadline.getTime();
      if (expired) room = resolveTurn(room, content);
      if (request.op !== "tick") room = applyRoomRequest(room, actor, request, content);
      if (room === before) {
        return { status: 200, body: { code, view: viewRoomFor(room, userId) } };
      }

      if (before.status === "lobby" && room.status !== "lobby") {
        // Room started: give each human a playthrough so the game counts in progress and stats.
        // (Humans already have room_members rows from create/join.)
        await createRoomPlaythroughs(db, stored.id, room, content.contentVersion);
      }

      const turnChanged = room.turn !== before.turn || before.status === "lobby";
      const deadline =
        room.status !== "playing"
          ? null
          : turnChanged || expired
            ? new Date(now().getTime() + timerMs)
            : stored.deadline;

      const { room: clean, records } = drainOutbox(room);
      await saveRoom(db, { roomId: stored.id, room: clean, records, deadline, viewFor: (u) => viewRoomFor(clean, u) });

      if (before.status !== "finished" && clean.status === "finished") {
        const results = endRoomChapter(clean, content);
        await saveRoomResults(db, stored.id, results, (_m, r) => chapterResultRecords(r, clean.turn));
      }
      return { status: 200, body: { code, view: viewRoomFor(clean, userId) } };
    });
  } catch (err) {
    if (err instanceof EngineError) return fail(err.code, err.message);
    console.error("room-action failed", err);
    return { status: 500, body: { code: "server_error", message: "something went wrong" } };
  }
}
