// Chapter end (§7.8, §7.9): score, Life Report, What if, badges, persona shift.
import type { ContentBundle } from "@toss/content";
import { matches } from "./conditions";
import { getChapter } from "./helpers";
import { computeMetrics } from "./metrics";
import { paiseToRupees } from "./money";
import { selectReportItems } from "./report";
import { healthScore, weakestComponent } from "./score";
import type { CarryOver, ChapterResult, GameState } from "./types";
import { chooseWhatIf } from "./whatif";

export function endChapter(
  state: GameState,
  content: ContentBundle,
  opts: { attempt?: number; multiplayer?: boolean } = {},
): ChapterResult {
  const chapter = getChapter(content, state.chapterId);
  const metrics = computeMetrics(state, content);
  const { score, breakdown } = healthScore(metrics, content, {
    multiplayer: opts.multiplayer ?? false,
  });
  metrics.healthScore = score;
  const threshold = chapter.passThreshold ?? content.healthScore.passThreshold;

  const lastCovered = state.stats.badEventsCoveredByFund.at(-1);
  const eventTitle = lastCovered
    ? content.lifeEvents.events.find((e) => e.id === lastCovered)?.title.en
    : undefined;
  const items = selectReportItems(metrics, content, {
    ...(eventTitle ? { event: eventTitle.toLowerCase() } : {}),
    interestPaid: paiseToRupees(state.stats.interestPaid),
  });

  const badgesEarned = content.badges.badges
    .filter((b) => b.enabled && matches(b.when, metrics))
    .map((b) => b.id);

  // Persona shift: a rule must hold for `consecutiveChapters` chapters in a row.
  const shiftStreaks = { ...state.carryOver.shiftStreaks };
  let personaShift: ChapterResult["personaShift"] = null;
  for (const rule of content.personas.shiftRules.filter((r) => r.from === state.personaId)) {
    shiftStreaks[rule.id] = matches(rule.when, metrics) ? (shiftStreaks[rule.id] ?? 0) + 1 : 0;
    if (!personaShift && shiftStreaks[rule.id]! >= rule.consecutiveChapters) {
      personaShift = { from: rule.from, to: rule.to, ruleId: rule.id };
      shiftStreaks[rule.id] = 0;
    }
  }
  const carryOver: CarryOver = { ...state.carryOver, shiftStreaks };

  return {
    chapterId: chapter.id,
    attempt: opts.attempt ?? 1,
    healthScore: score,
    breakdown,
    passed: score >= threshold,
    weakestComponentId: weakestComponent(breakdown),
    report: {
      ...items,
      whatIf: chooseWhatIf(state, metrics, content),
      gyaanQuestionIds: content.gyaan.questions
        .filter((q) => q.chapterId === chapter.id)
        .slice(0, content.gyaan.questionsPerChapter)
        .map((q) => q.id),
    },
    badgesEarned,
    personaShift,
    metrics,
    carryOver,
    next:
      chapter.next === "end"
        ? "end"
        : typeof chapter.next === "string"
          ? [chapter.next]
          : chapter.next.choice,
  };
}
