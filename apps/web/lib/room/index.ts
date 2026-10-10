"use client";

// ROOM API CONTRACT (§15.4 E). Owned by Samarth, used by Pragya's Friends' Room UI.
// Day-zero stub: returns the fixture room. TODO(samarth): in-memory mock room with bots
// (day 2), then the realtime Supabase client.
import { sampleRoomState } from "@toss/engine/fixtures";
import type { Loan, RoomMember, RoomState } from "@toss/engine";

export interface RoomActions {
  join(): Promise<void>;
  leave(): Promise<void>;
  ready(): Promise<void>;
  submitTurn(): Promise<void>;
  requestLoan(args: { amount: number; dueTurn: number }): Promise<void>;
  offerLoan(args: { loanId: string; ratePerTurn: number }): Promise<void>;
  acceptLoan(loanId: string): Promise<void>;
  repayLoan(args: { loanId: string; amount: number }): Promise<void>;
  placeBid(amount: number): Promise<void>;
  createPool(contribution: number): Promise<void>;
  joinPool(args: { poolId: string; contribution: number }): Promise<void>;
}

export interface UseRoomResult {
  room: RoomState | null;
  me: RoomMember | null;
  members: RoomMember[];
  turn: number;
  status: RoomState["status"] | "connecting";
  pendingLoans: Loan[];
  auction: RoomState["auction"];
  actions: RoomActions;
}

const notYet = async () => {
  console.warn("[room] mock: action not implemented yet");
};

export function useRoom(_code: string): UseRoomResult {
  const room = sampleRoomState;
  const me = room.members.find((m) => !m.isBot) ?? null;
  return {
    room,
    me,
    members: room.members,
    turn: room.turn,
    status: room.status,
    pendingLoans: room.loans.filter((l) => l.status === "requested" || l.status === "offered"),
    auction: room.auction,
    actions: {
      join: notYet,
      leave: notYet,
      ready: notYet,
      submitTurn: notYet,
      requestLoan: notYet,
      offerLoan: notYet,
      acceptLoan: notYet,
      repayLoan: notYet,
      placeBid: notYet,
      createPool: notYet,
      joinPool: notYet,
    },
  };
}

export async function createRoom(_chapterId: string): Promise<{ code: string }> {
  return { code: sampleRoomState.code };
}
