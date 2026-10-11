// Session log and the "time machine" (team request 2026-10-11).
//
// A session is the full record of one chapter attempt: how it started plus every step the player
// took - each decision (`act`) and each move forward in time (`advance`). The engine is
// deterministic (same seed + same steps = same game), so the log alone rebuilds the game at any
// point, and editing the log answers "what if I hadn't done this?" or starts a new branch.
import type { ContentBundle } from "@toss/content";
import { applyAction } from "./actions";
import { endChapter } from "./chapter";
import { EngineError } from "./errors";
import { totalWealth } from "./metrics";
import { createPlaythrough } from "./playthrough";
import { advanceTurn } from "./turn";
import type { Action, CarryOver, ChapterResult, GameEvent, GameState, TossResult } from "./types";

export type SessionStep = { kind: "act"; action: Action } | { kind: "advance" };

/** Everything `createPlaythrough` needs to start the same game again. */
export interface SessionStart {
  personaId: string;
  seed: string;
  chapterId: string;
  carryOver?: CarryOver;
  trustScore?: number;
}

export interface SessionLog {
  start: SessionStart;
  steps: SessionStep[];
}

/** The game right after one step. */
export interface ReplayPoint {
  stepIndex: number;
  step: SessionStep;
  /** False when the step could not run in this replay (e.g. not enough cash on a branch). */
  applied: boolean;
  /** Turn number after the step (0 before the first toss). */
  turn: number;
  cash: number;
  wealth: number;
  /** Events of an `advance` step. */
  events: GameEvent[];
  toss?: TossResult;
}

export interface ReplayResult {
  state: GameState;
  points: ReplayPoint[];
}

/**
 * Rebuilds a session from its log. `upTo` stops before that step index (to branch from there);
 * `skip` leaves steps out (to ask "what if I hadn't?"). A step that no longer fits the game -
 * paying with cash you no longer have on a branch - is recorded as not applied and skipped.
 */
export function replaySession(
  log: SessionLog,
  content: ContentBundle,
  opts: { upTo?: number; skip?: ReadonlySet<number> } = {},
): ReplayResult {
  let state = createPlaythrough({ content, ...log.start });
  const points: ReplayPoint[] = [];
  const end = Math.min(opts.upTo ?? log.steps.length, log.steps.length);
  for (let i = 0; i < end; i++) {
    const step = log.steps[i]!;
    if (opts.skip?.has(i)) continue;
    let applied = true;
    let events: GameEvent[] = [];
    let toss: TossResult | undefined;
    try {
      if (step.kind === "act") {
        state = applyAction(state, step.action, content);
      } else {
        const r = advanceTurn(state, content);
        state = r.state;
        events = r.events;
        toss = r.tossResult;
      }
    } catch (err) {
      if (!(err instanceof EngineError)) throw err;
      applied = false;
    }
    points.push({
      stepIndex: i,
      step,
      applied,
      turn: state.turn,
      cash: state.cash,
      wealth: totalWealth(state),
      events,
      ...(toss ? { toss } : {}),
    });
  }
  return { state, points };
}

/**
 * Plays any remaining time with no new decisions, so a shortened branch still reaches the end
 * of the chapter. A scam waiting for an answer gets that scam's safe response.
 */
export function finishWithoutDecisions(state: GameState, content: ContentBundle): GameState {
  let s = state;
  for (let guard = 0; guard < 400 && s.status !== "chapter_complete"; guard++) {
    if (s.status === "awaiting_scam_response") {
      const pending = s.pendingScams[0];
      const def = content.scams.scams.find((x) => x.id === pending?.scamId);
      const safe = def?.actions.find((a) => !a.falls)?.id;
      if (!pending || !safe) break;
      s = applyAction(
        s,
        { type: "scam_response", instanceId: pending.instanceId, response: safe },
        content,
      );
      continue;
    }
    s = advanceTurn(s, content).state;
  }
  return s;
}

export interface AlternateOutcome {
  /** Result of the chapter as actually played. */
  actual: { healthScore: number; passed: boolean; realWealth: number };
  /** Result with the change applied (remaining time played with the same later steps). */
  alternate: { healthScore: number; passed: boolean; realWealth: number };
  /** alternate - actual, in Real Value paise. */
  realWealthDifference: number;
  scoreDifference: number;
}

function outcomeOf(state: GameState, content: ContentBundle) {
  const finished =
    state.status === "chapter_complete" ? state : finishWithoutDecisions(state, content);
  const result: ChapterResult = endChapter(finished, content);
  return {
    healthScore: result.healthScore,
    passed: result.passed,
    realWealth: Math.round(totalWealth(finished) / finished.inflationIndex),
  };
}

/** "What if I hadn't done step `stepIndex`?" - same seed, every other step the same. */
export function whatIfWithout(
  log: SessionLog,
  stepIndex: number,
  content: ContentBundle,
): AlternateOutcome {
  const actual = outcomeOf(replaySession(log, content).state, content);
  const alternate = outcomeOf(
    replaySession(log, content, { skip: new Set([stepIndex]) }).state,
    content,
  );
  return {
    actual,
    alternate,
    realWealthDifference: alternate.realWealth - actual.realWealth,
    scoreDifference: alternate.healthScore - actual.healthScore,
  };
}

/** A new session that starts exactly where step `stepIndex` was about to happen. */
export function branchAt(log: SessionLog, stepIndex: number): SessionLog {
  return { start: log.start, steps: log.steps.slice(0, Math.max(0, stepIndex)) };
}
