// "What if" (§7.2, §8.12): re-run the chapter from turn 0 with the SAME seed and one
// changed decision. Tosses depend only on (seed, turn), so any difference in the
// result is caused purely by that decision.
import type { ContentBundle, DecisionTransform, LocalizedString } from "@toss/content";
import { applyAction } from "./actions";
import { matches } from "./conditions";
import { monthlyExpensesFor } from "./economy";
import { EngineError } from "./errors";
import { getChapter, optionMap } from "./helpers";
import { monthsPerTurn, rupeesToPaise } from "./money";
import { createPlaythrough } from "./playthrough";
import { advanceTurn } from "./turn";
import type { Action, DecisionChange, GameState, MetricValues, WhatIfResult } from "./types";

type ActionLog = GameState["actionLog"];
/** Extra decisions made at the start of each decide phase during a replay. */
export type ReplayPolicy = (state: GameState, content: ContentBundle) => Action[];

/**
 * Replays a chapter from scratch: policy actions, then the logged actions for each
 * turn, then the toss. Logged actions that became invalid in the new timeline are
 * skipped. Scams are answered as in the log (by instance id), or ignored if new.
 */
export function replay(
  original: GameState,
  log: ActionLog,
  content: ContentBundle,
  policy?: ReplayPolicy,
): GameState {
  let s = createPlaythrough({
    content,
    personaId: original.personaId,
    seed: original.seed,
    chapterId: original.chapterId,
    carryOver: original.carriedIn,
    // Trust only changes in Friends' Rooms, which don't use single-player replays.
    trustScore: original.trustScore,
  });
  const tryApply = (action: Action) => {
    try {
      s = applyAction(s, action, content);
    } catch (err) {
      if (!(err instanceof EngineError)) throw err;
    }
  };

  for (let turn = 1; turn <= original.turn; turn++) {
    if (s.status !== "playing") break;
    for (const action of policy?.(s, content) ?? []) tryApply(action);
    for (const entry of log) {
      if (entry.turn === turn && entry.action.type !== "scam_response") tryApply(entry.action);
    }
    s = advanceTurn(s, content).state;
    for (const pending of [...s.pendingScams]) {
      const answer = log.find(
        (e) => e.action.type === "scam_response" && e.action.instanceId === pending.instanceId,
      );
      const response = answer?.action.type === "scam_response" ? answer.action.response : "ignore";
      tryApply({ type: "scam_response", instanceId: pending.instanceId, response });
    }
  }
  return s;
}

/** Applies a content-defined decision transform to the original timeline. */
export function transformTimeline(
  original: GameState,
  transform: DecisionTransform,
  content: ContentBundle,
): { log: ActionLog; policy?: ReplayPolicy } {
  const log = original.actionLog.map((e) => ({ ...e }));
  const options = optionMap(content);
  switch (transform.type) {
    case "ignoreScams":
      return {
        log: log.map((e) =>
          e.action.type === "scam_response"
            ? { ...e, action: { ...e.action, response: "ignore" as const } }
            : e,
        ),
      };

    case "startSip": {
      const kept = log.filter(
        (e) => !(e.action.type === "sip_start" && e.action.optionId === transform.optionId),
      );
      kept.push({
        turn: transform.fromTurn,
        action: {
          type: "sip_start",
          optionId: transform.optionId,
          amountPerMonth: rupeesToPaise(transform.amountPerMonth),
        },
      });
      return { log: kept.sort((a, b) => a.turn - b.turn) };
    }

    case "moveShare": {
      const months = monthsPerTurn(original.turnUnit);
      const out: ActionLog = [];
      for (const e of log) {
        if (e.action.type !== "invest" || e.action.optionId !== transform.fromOptionId) {
          out.push(e);
          continue;
        }
        const moved = Math.round(e.action.amount * transform.share);
        if (e.action.amount - moved > 0) {
          out.push({ ...e, action: { ...e.action, amount: e.action.amount - moved } });
        }
        if (transform.asSip) {
          const remainingMonths = (original.totalTurns - e.turn + 1) * months;
          out.push({
            turn: e.turn,
            action: {
              type: "sip_start",
              optionId: transform.toOptionId,
              amountPerMonth: Math.max(1, Math.round(moved / remainingMonths)),
            },
          });
        } else {
          out.push({
            turn: e.turn,
            action: { type: "invest", optionId: transform.toOptionId, amount: moved },
          });
        }
      }
      return { log: out };
    }

    case "emergencyFundFirst": {
      const chapter = getChapter(content, original.chapterId);
      const fund = options.get(transform.optionId);
      const policy: ReplayPolicy = (s) => {
        if (!fund) return [];
        const target = Math.round(monthlyExpensesFor(chapter, s.inflationIndex) * transform.months);
        const liquid = s.holdings
          .filter((h) => options.get(h.optionId)?.liquidity === "instant")
          .reduce((sum, h) => sum + h.value, 0);
        const amount = Math.min(s.cash, target - liquid);
        return amount >= Math.max(rupeesToPaise(fund.minAmount), 1)
          ? [{ type: "invest", optionId: fund.id, amount }]
          : [];
      };
      return { log, policy };
    }

    case "holdThroughCrash": {
      // The decide phase of turn t follows toss t−1 (tosses[t − 2]).
      const soldInStorm = (turn: number, optionId: string) =>
        original.tosses[turn - 2]?.marketState === "crash" &&
        options.get(optionId)?.liquidity === "market";
      return {
        log: log.filter(
          (e) => !(e.action.type === "withdraw" && soldInStorm(e.turn, e.action.optionId)),
        ),
      };
    }
  }
}

function compare(
  state: GameState,
  alt: GameState,
  candidateId: string,
  changeText: LocalizedString,
): WhatIfResult {
  const baselineRealValue = state.history.at(-1)?.realValue ?? 0;
  const alternativeRealValue = alt.history.at(-1)?.realValue ?? 0;
  return {
    candidateId,
    changeText,
    baselineRealValue,
    alternativeRealValue,
    difference: alternativeRealValue - baselineRealValue,
    series: state.history.map((h, i) => ({
      turn: h.turn,
      baseline: h.realValue,
      alternative: alt.history[i]?.realValue ?? 0,
    })),
  };
}

export function replayWithChange(
  state: GameState,
  change: DecisionChange,
  content: ContentBundle,
): WhatIfResult {
  if (change.type === "replace_action") {
    const log = state.actionLog.flatMap((entry, i) =>
      i !== change.index ? [entry] : change.action ? [{ ...entry, action: change.action }] : [],
    );
    return compare(state, replay(state, log, content), "custom", {
      en: "made one different choice",
    });
  }
  const candidate = content.lifeReport.whatIf.candidates.find((c) => c.id === change.candidateId);
  if (!candidate) {
    throw new EngineError("bad_candidate", `unknown what-if candidate ${change.candidateId}`);
  }
  const { log, policy } = transformTimeline(state, candidate.transform, content);
  return compare(state, replay(state, log, content, policy), candidate.id, candidate.changeText);
}

/**
 * Picks the Life Report's "What if": the highest-priority matching candidate whose
 * replay actually leaves the player better off. Candidates that change nothing (e.g.
 * "start a SIP" when one was already running) or make things worse are skipped.
 */
export function chooseWhatIf(
  state: GameState,
  metrics: MetricValues,
  content: ContentBundle,
): WhatIfResult | null {
  const candidates = [...content.lifeReport.whatIf.candidates]
    .sort((a, b) => b.priority - a.priority)
    .filter((c) => matches(c.when, metrics));
  for (const c of candidates) {
    const result = replayWithChange(state, { type: "candidate", candidateId: c.id }, content);
    if (result.difference > 0) return result;
  }
  return null;
}
