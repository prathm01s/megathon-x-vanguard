"use client";

// ROOM API CONTRACT (§15.4 E). Owned by Samarth, used by Pragya's Friends' Room UI.
//
// Today: an in-memory mock room (./store.ts) running the real engine room rules with
// bots, so every screen can be built and tested now. Try room code `TOSS42` for a room
// already at turn 3 with an open auction, an active loan and an open loan request.
// Later: same interface, backed by room Edge Functions + Supabase Realtime.
//
// All amounts are paise. Actions reject with an `EngineError` (has a stable `code`,
// e.g. "insufficient_cash", "scam_pending") — show it via messages/<locale>.json.
import type { Action, Loan, RoomMember, RoomState } from "@toss/engine";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useSession } from "@/lib/data";
// TODO(samarth): read the host from the real session once lib/data is wired to Supabase.
import { mockSession } from "@/lib/data/mock";
import { createMockRoom, getRoom, roomOps, subscribe } from "./store";

export interface RoomActions {
  join(): Promise<void>;
  leave(): Promise<void>;
  /** Lobby: the host starts the game (bots fill empty seats). Ignored for other players. */
  ready(): Promise<void>;
  /** The player's own decision inside the room (invest, pay a task, answer a scam…). */
  act(action: Action): Promise<void>;
  /** Done deciding for this turn. The turn resolves when every human has submitted. */
  submitTurn(): Promise<void>;
  requestLoan(args: { amount: number; dueTurn: number }): Promise<void>;
  /** `loanId` is the REQUEST id (status "requested"). */
  offerLoan(args: { loanId: string; ratePerTurn: number }): Promise<void>;
  /** `loanId` is the OFFER id (status "offered") answering your request. */
  acceptLoan(loanId: string): Promise<void>;
  repayLoan(args: { loanId: string; amount: number }): Promise<void>;
  placeBid(amount: number): Promise<void>;
  /** Starts a pool with your contribution (pool id = `pool-<your member id>`). */
  createPool(contribution: number): Promise<void>;
  joinPool(args: { poolId: string; contribution: number }): Promise<void>;
  /** Preset emote only — no free-text chat (§6). */
  react(emoteId: string): Promise<void>;
}

export interface UseRoomResult {
  room: RoomState | null;
  me: RoomMember | null;
  members: RoomMember[];
  turn: number;
  status: RoomState["status"] | "not_found";
  /** Open requests and the offers answering them (anyone's). */
  pendingLoans: Loan[];
  /** Loans you must repay. */
  myDebts: Loan[];
  auction: RoomState["auction"];
  actions: RoomActions;
}

export function useRoom(code: string): UseRoomResult {
  const room = useSyncExternalStore(
    subscribe,
    () => getRoom(code),
    () => null,
  );
  const { user, profile } = useSession();
  const userId = user?.id ?? "";
  const me = room?.members.find((m) => m.userId === userId) ?? null;

  // Wraps a synchronous store call as a Promise (the real client will be async).
  const run = useCallback(
    (fn: () => unknown) =>
      new Promise<void>((resolve, reject) => {
        try {
          fn();
          resolve();
        } catch (err) {
          reject(err);
        }
      }),
    [],
  );

  const actions = useMemo<RoomActions>(
    () => ({
      join: () =>
        run(() =>
          roomOps.join(code, {
            userId,
            nickname: profile?.nickname ?? "player",
            avatarId: profile?.avatarId ?? "avatar-1",
            // TODO(pragya/prathmesh): pass the persona from the player's Mindset Check result.
            personaId: "safe-keeper",
          }),
        ),
      leave: () => run(() => roomOps.leave(code, userId)),
      ready: () =>
        run(() => {
          const r = getRoom(code);
          if (r?.status === "lobby" && r.members[0]?.userId === userId) roomOps.start(code);
        }),
      act: (action) => run(() => roomOps.act(code, userId, action)),
      submitTurn: () => run(() => roomOps.submitTurn(code, userId)),
      requestLoan: (args) => run(() => roomOps.requestLoan(code, userId, args)),
      offerLoan: ({ loanId, ratePerTurn }) =>
        run(() => roomOps.offerLoan(code, userId, { requestId: loanId, ratePerTurn })),
      acceptLoan: (loanId) => run(() => roomOps.acceptLoan(code, userId, loanId)),
      repayLoan: (args) => run(() => roomOps.repayLoan(code, userId, args)),
      placeBid: (amount) => run(() => roomOps.placeBid(code, userId, amount)),
      createPool: (contribution) =>
        run(() => {
          const id = getRoom(code)?.members.find((m) => m.userId === userId)?.id ?? userId;
          roomOps.joinPool(code, userId, { poolId: `pool-${id}`, contribution });
        }),
      joinPool: (args) => run(() => roomOps.joinPool(code, userId, args)),
      react: (emoteId) => run(() => roomOps.react(code, userId, emoteId)),
    }),
    [code, userId, profile?.nickname, profile?.avatarId, run],
  );

  return {
    room,
    me,
    members: room?.members ?? [],
    turn: room?.turn ?? 0,
    status: room?.status ?? "not_found",
    pendingLoans:
      room?.loans.filter((l) => l.status === "requested" || l.status === "offered") ?? [],
    myDebts:
      room?.loans.filter(
        (l) => l.borrowerMemberId === me?.id && (l.status === "active" || l.status === "late"),
      ) ?? [],
    auction: room?.auction ?? null,
    actions,
  };
}

/**
 * Creates a room hosted by the signed-in player and returns its code (contract:
 * `createRoom(chapterId)`). `host` overrides the player info, e.g. in tests.
 */
export async function createRoom(
  chapterId: string,
  host?: { userId: string; nickname: string; avatarId: string; personaId: string },
): Promise<{ code: string }> {
  const profile = mockSession.profile;
  const info = host ?? {
    userId: mockSession.user?.id ?? "anonymous",
    nickname: profile?.nickname ?? "player",
    avatarId: profile?.avatarId ?? "avatar-1",
    personaId: "safe-keeper",
  };
  return { code: createMockRoom(chapterId, info).code };
}
