// In-memory mock room server (§15.5 item 13). Owner: Samarth.
// Runs the REAL room rules (`applyRoomRequest` from @toss/engine) in the browser, with bots in
// empty seats, and hands each player the same redacted `RoomView` the real server sends.
// Room `TOSS42` is preloaded from the engine fixture (its human is the mock session user).
import {
  applyRoomRequest,
  createRoomState,
  drainOutbox,
  newSeed,
  viewRoomFor,
  type RoomState,
  type RoomView,
} from "@toss/engine";
import { sampleRoomState } from "@toss/engine/fixtures";
import { content } from "@/lib/content";
import { toRoomError, type HostInfo, type RoomBackend } from "./backend";

// Unambiguous characters, like Student Codes (§4.3).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newRoomCode(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function createMockBackend(): RoomBackend & {
  /** Full server-side state (tests and dev tools only — never show this to a player). */
  peek(code: string): RoomState | null;
  reset(): void;
} {
  const rooms = new Map<string, RoomState>([[sampleRoomState.code, sampleRoomState]]);
  const listeners = new Map<string, Set<() => void>>();
  const views = new Map<string, { room: RoomState; view: RoomView }>();

  const save = (room: RoomState) => {
    // The mock has no `decisions` table: queued decision records are dropped.
    rooms.set(room.code, drainOutbox(room).room);
    for (const l of listeners.get(room.code) ?? []) l();
  };

  return {
    getView(code, userId) {
      const room = rooms.get(code.toUpperCase());
      if (!room) return null;
      const key = `${room.code}|${userId}`;
      const cached = views.get(key);
      if (cached?.room === room) return cached.view;
      const view = viewRoomFor(room, userId);
      views.set(key, { room, view });
      return view;
    },
    subscribe(code, _userId, onChange) {
      const key = code.toUpperCase();
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key)!.add(onChange);
      return () => listeners.get(key)?.delete(onChange);
    },
    async send(code, actor, request) {
      const room = rooms.get(code.toUpperCase());
      if (!room) throw toRoomError({ code: "room_not_found", message: `no room ${code}` });
      try {
        save(applyRoomRequest(room, actor, request, content));
      } catch (err) {
        throw toRoomError(err);
      }
    },
    async create(chapterId: string, host: HostInfo) {
      let code = newRoomCode();
      while (rooms.has(code)) code = newRoomCode();
      save(createRoomState({ code, seed: newSeed(), chapterId, host, content }));
      return { code };
    },
    peek: (code) => rooms.get(code.toUpperCase()) ?? null,
    reset() {
      rooms.clear();
      views.clear();
      rooms.set(sampleRoomState.code, sampleRoomState);
    },
  };
}
