// A scripted Chapter 2 playthrough: a sensible-but-imperfect player.
// Used by the fixture generator and by engine tests.
import type { ContentBundle } from "@toss/content";
import {
  advanceTurn,
  applyAction,
  createPlaythrough,
  endChapter,
  getAvailableActions,
} from "../src/api";
import {
  acceptLoan,
  createRoomState,
  drainOutbox,
  joinRoomPool,
  memberAction,
  react,
  requestLoan,
  startRoom,
  submitTurn,
} from "../src/room";
import type { ChapterResult, GameState, RoomState } from "../src/types";

export const FIXTURE_SEED = "fixture-seed-ch2";

export function scriptedCh2Game(
  content: ContentBundle,
  seed = FIXTURE_SEED,
): { states: GameState[]; result: ChapterResult } {
  let s = createPlaythrough({
    content,
    personaId: "safe-keeper",
    seed,
    chapterId: "ch2-first-job",
  });
  const states: GameState[] = [s];
  // Year 1 decisions: wedding gift, start an equity SIP, some savings.
  s = applyAction(s, { type: "pay_task", taskId: "ch2-friend-wedding", amount: 500000 }, content);
  s = applyAction(
    s,
    { type: "sip_start", optionId: "equity-fund", amountPerMonth: 200000 },
    content,
  );
  s = applyAction(s, { type: "invest", optionId: "savings", amount: 500000 }, content);
  while (s.status !== "chapter_complete") {
    // Answer any scam safely, pay due tasks if possible, park spare cash in savings / FD.
    for (const p of s.pendingScams) {
      s = applyAction(
        s,
        { type: "scam_response", instanceId: p.instanceId, response: "ignore" },
        content,
      );
    }
    if (s.status === "chapter_complete") break;
    for (const opt of getAvailableActions(s, content)) {
      // Options were computed before earlier payments this turn, so re-check cash.
      const amount = Math.min(opt.maxAmount ?? 0, s.cash);
      if (opt.type === "pay_task" && amount > 0) {
        s = applyAction(s, { type: "pay_task", taskId: opt.targetId, amount }, content);
      }
    }
    if (s.turn === 1 && s.cash > 2_000_000) {
      s = applyAction(s, { type: "invest", optionId: "fd", amount: 1_000_000 }, content);
    }
    s = advanceTurn(s, content).state;
    states.push(s);
  }
  return { states, result: endChapter(s, content) };
}

/**
 * A Friends' Room built with the real room rules: one human + bots, played to the
 * decide phase of turn 4 (the used-bike auction is open), with one active loan from a
 * friend and one open loan request showing all its offers.
 */
export function sampleRoom(content: ContentBundle): RoomState {
  const answerScams = (room: RoomState) => {
    const me = room.members.find((m) => m.id === "m1")!;
    for (const p of me.state.pendingScams) {
      room = memberAction(
        room,
        "m1",
        { type: "scam_response", instanceId: p.instanceId, response: "ignore" },
        content,
      );
    }
    return room;
  };
  let room = createRoomState({
    code: "TOSS42",
    seed: "room-fixture",
    chapterId: "ch2-first-job",
    host: {
      userId: "mock-user",
      nickname: "coinflip_kid",
      avatarId: "avatar-1",
      personaId: "safe-keeper",
    },
    content,
  });
  room = startRoom(room, content);
  room = submitTurn(room, "m1", content);
  room = answerScams(room);
  room = requestLoan(room, "m1", { amount: 20000_00, dueTurn: 3 }, content);
  const offer =
    room.loans.find((l) => l.status === "offered" && l.lenderMemberId.startsWith("m")) ??
    room.loans.find((l) => l.status === "offered" && l.lenderMemberId === "bank")!;
  room = acceptLoan(room, "m1", offer.id);
  room = submitTurn(room, "m1", content);
  room = answerScams(room);
  room = submitTurn(room, "m1", content);
  room = answerScams(room);
  room = requestLoan(room, "m1", { amount: 10000_00, dueTurn: 5 }, content);
  room = joinRoomPool(room, "m1", { poolId: "pool-1", contribution: 25000_00 }, content);
  room = react(room, "m1", content.multiplayer.emotes[0]!.id, content);
  // Stored the way the server stores it: decision records already written out.
  return drainOutbox(room).room;
}
