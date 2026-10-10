// In-memory mock room server (§15.4 E, §15.5 item 13). Owner: Samarth.
//
// Runs the REAL room rules from @toss/engine (room.ts) in the browser, with bots in
// empty seats, so the Friends' Room UI can be built before the Supabase server exists.
// The realtime client will keep this module's interface and swap the internals for
// Edge Function calls + Supabase Realtime subscriptions.
import {
  acceptLoan,
  createRoomState,
  joinRoom,
  joinRoomPool,
  leaveRoom,
  memberAction,
  newSeed,
  offerLoan,
  placeRoomBid,
  react,
  repayRoomLoan,
  requestLoan,
  startRoom,
  submitTurn,
  type Action,
  type PlayerInfo,
  type RoomState,
} from "@toss/engine";
import { sampleRoomState } from "@toss/engine/fixtures";
import { content } from "@/lib/content";

const rooms = new Map<string, RoomState>([[sampleRoomState.code, sampleRoomState]]);
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRoom(code: string): RoomState | null {
  return rooms.get(code.toUpperCase()) ?? null;
}

function save(room: RoomState): RoomState {
  rooms.set(room.code, room);
  for (const l of listeners) l();
  return room;
}

function current(code: string): RoomState {
  const room = getRoom(code);
  if (!room) throw new Error(`room ${code} not found`);
  return room;
}

function memberIdOf(room: RoomState, userId: string): string {
  const m = room.members.find((x) => x.userId === userId);
  if (!m) throw new Error("you are not in this room");
  return m.id;
}

// Unambiguous characters, like Student Codes (§4.3).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function newRoomCode(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function createMockRoom(chapterId: string, host: PlayerInfo): RoomState {
  let code = newRoomCode();
  while (rooms.has(code)) code = newRoomCode();
  return save(createRoomState({ code, seed: newSeed(), chapterId, host, content }));
}

/** All room operations, addressed by room code and the acting user's id. */
export const roomOps = {
  join: (code: string, player: PlayerInfo) => save(joinRoom(current(code), player, content)),
  leave: (code: string, userId: string) => {
    const room = current(code);
    return save(leaveRoom(room, memberIdOf(room, userId)));
  },
  /** Host starts the game; empty seats fill with bots. */
  start: (code: string) => save(startRoom(current(code), content)),
  /** The player's own decisions (invest, pay a task, answer a scam…), same as single-player. */
  act: (code: string, userId: string, action: Action) => {
    const room = current(code);
    return save(memberAction(room, memberIdOf(room, userId), action, content));
  },
  submitTurn: (code: string, userId: string) => {
    const room = current(code);
    return save(submitTurn(room, memberIdOf(room, userId), content));
  },
  requestLoan: (code: string, userId: string, args: { amount: number; dueTurn: number }) => {
    const room = current(code);
    return save(requestLoan(room, memberIdOf(room, userId), args, content));
  },
  offerLoan: (code: string, userId: string, args: { requestId: string; ratePerTurn: number }) => {
    const room = current(code);
    return save(offerLoan(room, memberIdOf(room, userId), args, content));
  },
  acceptLoan: (code: string, userId: string, offerId: string) => {
    const room = current(code);
    return save(acceptLoan(room, memberIdOf(room, userId), offerId));
  },
  repayLoan: (code: string, userId: string, args: { loanId: string; amount: number }) => {
    const room = current(code);
    return save(repayRoomLoan(room, memberIdOf(room, userId), args, content));
  },
  placeBid: (code: string, userId: string, amount: number) => {
    const room = current(code);
    return save(placeRoomBid(room, memberIdOf(room, userId), amount, content));
  },
  joinPool: (code: string, userId: string, args: { poolId: string; contribution: number }) => {
    const room = current(code);
    return save(joinRoomPool(room, memberIdOf(room, userId), args, content));
  },
  react: (code: string, userId: string, emoteId: string) => {
    const room = current(code);
    return save(react(room, memberIdOf(room, userId), emoteId, content));
  },
};

/** Test helper: forget every room except the fixture. */
export function resetMockRooms(): void {
  rooms.clear();
  rooms.set(sampleRoomState.code, sampleRoomState);
}
