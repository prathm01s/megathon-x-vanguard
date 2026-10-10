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

export function sampleRoom(content: ContentBundle, me: GameState): RoomState {
  const bot = (
    id: string,
    seat: number,
    nickname: string,
    strategy: "cautious" | "balanced" | "impulsive",
  ) => ({
    id,
    userId: null,
    nickname,
    avatarId: `avatar-${seat}`,
    isBot: true,
    botStrategy: strategy,
    seat,
    trustScore: content.multiplayer.loans.trust.start,
    ready: true,
    state: me,
  });
  return {
    code: "TOSS42",
    hostMemberId: "m-human",
    chapterId: "ch2-first-job",
    status: "playing",
    turn: me.turn,
    seed: me.seed,
    members: [
      {
        id: "m-human",
        userId: "00000000-0000-0000-0000-000000000001",
        nickname: "coinflip_kid",
        avatarId: "avatar-1",
        isBot: false,
        seat: 1,
        trustScore: 55,
        ready: false,
        state: me,
      },
      bot("m-bot-1", 2, "Careful Kavya", "cautious"),
      bot("m-bot-2", 3, "Spendy Sunny", "impulsive"),
    ],
    loans: [
      {
        id: "loan-1",
        lenderMemberId: "m-bot-1",
        borrowerMemberId: "m-human",
        principal: 1_000_000,
        ratePerTurn: 0.03,
        interestType: "simple",
        startTurn: me.turn,
        dueTurn: me.turn + 2,
        status: "active",
        repaidAmount: 0,
      },
    ],
    auction: null,
    tosses: me.tosses,
  };
}
