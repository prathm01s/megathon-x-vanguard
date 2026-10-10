// Small shared helpers: content lookups and state snapshots.
import type { Chapter, ContentBundle, InvestmentOption } from "@toss/content";
import { EngineError } from "./errors";
import { realValue } from "./money";
import type { CarryOver, ChapterStats, GameState, Paise, WealthSnapshot } from "./types";

export function getChapter(content: ContentBundle, id: string): Chapter {
  const ch = content.chapters.find((c) => c.id === id);
  if (!ch) throw new EngineError("unknown_chapter", `unknown chapter "${id}"`);
  return ch;
}

export function optionMap(content: ContentBundle): Map<string, InvestmentOption> {
  return new Map(content.options.options.map((o) => [o.id, o]));
}

/** Options available in a chapter: its own unlocks plus everything unlocked in earlier chapters. */
export function unlockedOptions(content: ContentBundle, chapterId: string): InvestmentOption[] {
  const chapter = getChapter(content, chapterId);
  const orderOf = new Map(content.chapters.map((c) => [c.id, c.order]));
  return content.options.options.filter(
    (o) =>
      o.enabled &&
      (chapter.unlockOptions.includes(o.id) ||
        (orderOf.get(o.unlockChapter) ?? Infinity) < chapter.order),
  );
}

/**
 * Chapter a persona starts in. Falls back to the first enabled chapter when the
 * persona's `startChapter` is still an outline (today ch1 is disabled, so everyone
 * starts in ch2, the hackathon prototype).
 */
export function startChapterFor(personaId: string, content: ContentBundle): string {
  const persona = content.personas.personas.find((p) => p.id === personaId);
  const preferred = content.chapters.find((c) => c.id === persona?.startChapter && c.enabled);
  if (preferred) return preferred.id;
  const first = [...content.chapters].sort((a, b) => a.order - b.order).find((c) => c.enabled);
  if (!first) throw new EngineError("no_chapter", "no enabled chapter in content");
  return first.id;
}

export function emptyStats(): ChapterStats {
  return {
    scamsSpotted: 0,
    repeatScamSpotted: false,
    soldDuringCrash: false,
    fdBrokenEarly: false,
    badEventsCoveredByFund: [],
    windfallReceived: 0,
    windfallSaved: 0,
    cashLost: 0,
    sipInstalmentsMissed: 0,
    loansTaken: 0,
    loansRepaidOnTime: 0,
    loansDefaulted: 0,
    highInterestDebt: false,
    interestPaid: 0,
    auctionsWon: 0,
    overbidPct: 0,
    poolBidsJoined: 0,
  };
}

export function emptyCarryOver(): CarryOver {
  return { blockNextChapterGoal: false, blockedTaskIds: [], salaryBonusRate: 0, shiftStreaks: {} };
}

/** Net worth: cash + every holding − debt. */
export function netWorth(state: GameState): Paise {
  return state.cash + state.holdings.reduce((s, h) => s + h.value, 0) - state.debt;
}

export function snapshot(state: GameState): WealthSnapshot {
  const amount = netWorth(state);
  return {
    turn: state.turn,
    amount,
    realValue: realValue(amount, state.inflationIndex),
    inflationIndex: state.inflationIndex,
  };
}

export function clone<T>(value: T): T {
  return structuredClone(value);
}
