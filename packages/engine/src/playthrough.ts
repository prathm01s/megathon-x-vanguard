import type { ContentBundle } from "@toss/content";
import { emptyCarryOver, emptyStats, getChapter, snapshot } from "./helpers";
import { rupeesToPaise } from "./money";
import { initTasks } from "./tasks";
import { STATE_SCHEMA_VERSION, type CarryOver, type GameState } from "./types";

/** Starts a chapter. Pass the previous chapter's `ChapterResult.carryOver` to continue a life. */
export function createPlaythrough(args: {
  content: ContentBundle;
  personaId: string;
  seed: string;
  chapterId: string;
  carryOver?: CarryOver;
  trustScore?: number;
}): GameState {
  const { content, personaId, seed, chapterId } = args;
  const chapter = getChapter(content, chapterId);
  const carriedIn = { ...emptyCarryOver(), ...args.carryOver };

  const state: GameState = {
    schemaVersion: STATE_SCHEMA_VERSION,
    contentVersion: content.contentVersion,
    seed,
    personaId,
    chapterId,
    turn: 0,
    totalTurns: chapter.turns,
    turnUnit: chapter.turnUnit,
    status: "playing",
    // The persona's level can add a starting cushion (Rookie +50%, Builder +20%).
    cash: Math.round(
      rupeesToPaise(chapter.startingBalance) *
        (1 +
          (content.personas.personas.find((p) => p.id === personaId)?.difficulty.startingBonus ??
            0)),
    ),
    debt: 0,
    incomePerMonth: Math.round(
      rupeesToPaise(chapter.income.amountPerMonth) * (1 + carriedIn.salaryBonusRate),
    ),
    incomeModifiers: [],
    inflationIndex: 1,
    navs: Object.fromEntries(content.options.options.map((o) => [o.id, 1])),
    holdings: [],
    sips: [],
    tasks: initTasks(chapter, carriedIn),
    pendingScams: [],
    eventCooldowns: {},
    scamsFallenIds: [],
    carriedIn,
    // Salary bonuses and persona streaks keep accumulating; blocks apply one chapter only.
    carryOver: {
      ...emptyCarryOver(),
      salaryBonusRate: carriedIn.salaryBonusRate,
      shiftStreaks: { ...carriedIn.shiftStreaks },
    },
    trustScore: args.trustScore ?? content.multiplayer.loans.trust.start,
    stats: emptyStats(),
    history: [],
    actionLog: [],
    tosses: [],
  };
  state.history.push(snapshot(state));
  return state;
}
