// The Friends' Room wire protocol: every operation a player can send, validated with Zod
// (§11: validate all inputs at boundaries), and ONE dispatcher that applies it. The mock
// room and the `room-action` Edge Function both call `applyRoomRequest`, so they can't drift.
import type { ContentBundle } from "@toss/content";
import { z } from "zod";
import { EngineError } from "./errors";
import {
  acceptLoan,
  joinRoom,
  joinRoomPool,
  leaveRoom,
  memberAction,
  offerLoan,
  placeRoomBid,
  react,
  repayRoomLoan,
  requestLoan,
  startRoom,
  submitTurn,
  type PlayerInfo,
} from "./room";
import type { RoomState } from "./types";

const paise = z.number().int().positive().max(1_000_000_000_00);
const id = z.string().min(1).max(80);

export const actionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("pay_task"), taskId: id, amount: paise }),
  z.strictObject({ type: z.literal("invest"), optionId: id, amount: paise }),
  z.strictObject({ type: z.literal("withdraw"), optionId: id, amount: paise }),
  z.strictObject({ type: z.literal("sip_start"), optionId: id, amountPerMonth: paise }),
  z.strictObject({ type: z.literal("sip_stop"), optionId: id }),
  z.strictObject({
    type: z.literal("scam_response"),
    instanceId: id,
    response: z.enum(["pay", "share_otp", "install", "invest", "ignore", "report", "ask_friend"]),
  }),
]);

export const roomRequestSchema = z.discriminatedUnion("op", [
  z.strictObject({ op: z.literal("join") }),
  z.strictObject({ op: z.literal("leave") }),
  /** Host only: start the game; bots fill empty seats. */
  z.strictObject({ op: z.literal("start") }),
  /** The player's own decision (invest, pay a task, answer a scam…). */
  z.strictObject({ op: z.literal("act"), action: actionSchema }),
  z.strictObject({ op: z.literal("submit_turn") }),
  /** Ask the server to resolve the turn if its timer has run out (server-side check). */
  z.strictObject({ op: z.literal("tick") }),
  z.strictObject({
    op: z.literal("request_loan"),
    amount: paise,
    dueTurn: z.number().int().positive(),
  }),
  z.strictObject({
    op: z.literal("offer_loan"),
    requestId: id,
    ratePerTurn: z.number().min(0).max(1),
  }),
  z.strictObject({ op: z.literal("accept_loan"), offerId: id }),
  z.strictObject({ op: z.literal("repay_loan"), loanId: id, amount: paise }),
  z.strictObject({ op: z.literal("place_bid"), amount: paise }),
  z.strictObject({ op: z.literal("join_pool"), poolId: id, contribution: paise }),
  z.strictObject({ op: z.literal("react"), emoteId: id }),
]);
export type RoomRequest = z.infer<typeof roomRequestSchema>;

/**
 * Applies one validated request from `actor` to the room. Throws `EngineError` for anything
 * the rules don't allow. `tick` is handled by the caller (it needs the clock).
 */
export function applyRoomRequest(
  room: RoomState,
  actor: PlayerInfo,
  request: RoomRequest,
  content: ContentBundle,
): RoomState {
  if (request.op === "join") return joinRoom(room, actor, content);
  const me = room.members.find((m) => m.userId === actor.userId);
  if (!me) throw new EngineError("not_in_room", "you are not in this room");

  switch (request.op) {
    case "leave":
      return leaveRoom(room, me.id);
    case "start":
      if (room.hostMemberId !== me.id) throw new EngineError("not_host", "only the host can start");
      return startRoom(room, content);
    case "act":
      return memberAction(room, me.id, request.action, content);
    case "submit_turn":
      return submitTurn(room, me.id, content);
    case "tick":
      return room;
    case "request_loan":
      return requestLoan(
        room,
        me.id,
        { amount: request.amount, dueTurn: request.dueTurn },
        content,
      );
    case "offer_loan":
      return offerLoan(
        room,
        me.id,
        { requestId: request.requestId, ratePerTurn: request.ratePerTurn },
        content,
      );
    case "accept_loan":
      return acceptLoan(room, me.id, request.offerId);
    case "repay_loan":
      return repayRoomLoan(
        room,
        me.id,
        { loanId: request.loanId, amount: request.amount },
        content,
      );
    case "place_bid":
      return placeRoomBid(room, me.id, request.amount, content);
    case "join_pool":
      return joinRoomPool(
        room,
        me.id,
        { poolId: request.poolId, contribution: request.contribution },
        content,
      );
    case "react":
      return react(room, me.id, request.emoteId, content);
  }
}

/** Parses an untrusted request body. Throws `EngineError("bad_request")` with the reason. */
export function parseRoomRequest(body: unknown): RoomRequest {
  const parsed = roomRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new EngineError(
      "bad_request",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  return parsed.data;
}
