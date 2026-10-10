"use client";

// ROOM API CONTRACT (§15.4 E). Owned by Samarth, used by Pragya's Friends' Room UI.
//
// `useRoom(code)` gives the signed-in player THEIR view of a room (`RoomView`): their own
// full game state in `me`, and only public info about everyone else (no cash, no sealed bids).
//
// Backend, chosen by NEXT_PUBLIC_ROOM_BACKEND:
//   "mock" (default)  in-memory, runs the real engine room rules with bots. Room `TOSS42` is
//                     preloaded at turn 3 (bike auction open, an active loan, an open request).
//   "supabase"        the `room-action` Edge Function + Supabase Realtime (`room_views`).
//
// All amounts are paise. Actions reject with a `RoomError` whose `code` is stable
// (e.g. "insufficient_cash", "scam_pending") — translate it via messages/<locale>.json.
import type { Action, Loan, PublicMember, RoomMember, RoomRequest, RoomView } from "@toss/engine";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useSession } from "@/lib/data";
import { mockSession } from "@/lib/data/mock";
import { createClient } from "@/lib/supabase/client";
import type { HostInfo, RoomBackend } from "./backend";
import { createMockBackend } from "./mock-backend";
import { createSupabaseBackend } from "./supabase-backend";

export { RoomError } from "./backend";

let backend: RoomBackend | undefined;
function getBackend(): RoomBackend {
  backend ??=
    process.env.NEXT_PUBLIC_ROOM_BACKEND === "supabase"
      ? // reason: generated DB types don't include room tables until `pnpm db:types` runs.
        createSupabaseBackend(() => createClient() as unknown as SupabaseClient)
      : createMockBackend();
  return backend;
}

export interface RoomActions {
  /** Joins the lobby. Pass the persona from the player's Money Mindset Check. */
  join(personaId?: string): Promise<void>;
  leave(): Promise<void>;
  /** Lobby: the host starts the game (bots fill empty seats). Does nothing for other players. */
  ready(): Promise<void>;
  /** The player's own decision inside the room (invest, pay a task, answer a scam…). */
  act(action: Action): Promise<void>;
  /** Done deciding for this turn. The turn resolves when every human has submitted. */
  submitTurn(): Promise<void>;
  /** Ask the server to resolve the turn if its timer ran out (call when your countdown ends). */
  tick(): Promise<void>;
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
  /** Your view of the room, or null while loading / if the room doesn't exist. */
  room: RoomView | null;
  /** You, with your full game state. Null until you join. */
  me: RoomMember | null;
  /** Everyone in the room (public info only). */
  members: PublicMember[];
  isHost: boolean;
  turn: number;
  status: RoomView["status"] | "loading";
  /** Open requests and the offers answering them (anyone's). */
  pendingLoans: Loan[];
  /** Loans you must repay. */
  myDebts: Loan[];
  auction: RoomView["auction"];
  actions: RoomActions;
}

function hostInfo(
  userId: string,
  profile: ReturnType<typeof useSession>["profile"],
  personaId?: string,
): HostInfo {
  return {
    userId,
    nickname: profile?.nickname ?? "player",
    avatarId: profile?.avatarId ?? "avatar-1",
    // TODO(pragya): pass the persona from the player's Mindset Check result to `join`.
    personaId: personaId ?? "safe-keeper",
  };
}

export function useRoom(code: string): UseRoomResult {
  const { user, profile } = useSession();
  const userId = user?.id ?? "";
  const b = getBackend();
  const room = useSyncExternalStore(
    (onChange) => b.subscribe(code, userId, onChange),
    () => b.getView(code, userId),
    () => null,
  );
  const me = room?.me ?? null;

  const actions = useMemo<RoomActions>(() => {
    const send = (request: RoomRequest, personaId?: string) =>
      b.send(code, hostInfo(userId, profile, personaId), request);
    return {
      join: (personaId) => send({ op: "join" }, personaId),
      leave: () => send({ op: "leave" }),
      ready: async () => {
        const view = b.getView(code, userId);
        if (view?.status === "lobby" && view.me && view.hostMemberId === view.me.id) {
          await send({ op: "start" });
        }
      },
      act: (action) => send({ op: "act", action }),
      submitTurn: () => send({ op: "submit_turn" }),
      tick: () => send({ op: "tick" }),
      requestLoan: ({ amount, dueTurn }) => send({ op: "request_loan", amount, dueTurn }),
      offerLoan: ({ loanId, ratePerTurn }) =>
        send({ op: "offer_loan", requestId: loanId, ratePerTurn }),
      acceptLoan: (offerId) => send({ op: "accept_loan", offerId }),
      repayLoan: ({ loanId, amount }) => send({ op: "repay_loan", loanId, amount }),
      placeBid: (amount) => send({ op: "place_bid", amount }),
      createPool: (contribution) => {
        const memberId = b.getView(code, userId)?.me?.id ?? userId;
        return send({ op: "join_pool", poolId: `pool-${memberId}`, contribution });
      },
      joinPool: ({ poolId, contribution }) => send({ op: "join_pool", poolId, contribution }),
      react: (emoteId) => send({ op: "react", emoteId }),
    };
  }, [b, code, userId, profile]);

  return {
    room,
    me,
    members: room?.members ?? [],
    isHost: !!me && room?.hostMemberId === me.id,
    turn: room?.turn ?? 0,
    status: room?.status ?? "loading",
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
export async function createRoom(chapterId: string, host?: HostInfo): Promise<{ code: string }> {
  const info = host ?? hostInfo(mockSession.user?.id ?? "anonymous", mockSession.profile);
  return getBackend().create(chapterId, info);
}

/** True when rooms run on the real server (`NEXT_PUBLIC_ROOM_BACKEND=supabase`), not the mock. */
export const isRealRoomBackend = process.env.NEXT_PUBLIC_ROOM_BACKEND === "supabase";

/**
 * `createRoom` hosted by the signed-in player: use this from screens. The new room's view is
 * stored under the same user that `useRoom` reads, so the lobby shows up straight away.
 */
export function useCreateRoom(): (
  chapterId: string,
  personaId?: string,
) => Promise<{ code: string }> {
  const { user, profile } = useSession();
  return useCallback(
    (chapterId: string, personaId?: string) =>
      createRoom(chapterId, user ? hostInfo(user.id, profile, personaId) : undefined),
    [user, profile],
  );
}
