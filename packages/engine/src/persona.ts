import { evaluateCondition, type ContentBundle } from "@toss/content";
import type { MindsetAnswers, MindsetResult, MindsetScores } from "./types";

/**
 * Scores the Money Mindset Check and assigns a persona (§8.2, §8.3).
 * Unknown question or option ids are ignored (an older save might reference removed content).
 */
export function scoreMindset(answers: MindsetAnswers, content: ContentBundle): MindsetResult {
  const scores: MindsetScores = { plan: 0, risk: 0, know: 0 };
  for (const q of content.mindset.questions) {
    const optionId = answers[q.id];
    const option = q.options.find((o) => o.id === optionId);
    if (!option) continue;
    scores.plan += option.points.plan ?? 0;
    scores.risk += option.points.risk ?? 0;
    scores.know += option.points.know ?? 0;
  }
  return { scores, personaId: assignPersona(scores, content) };
}

/** First matching `assignmentRules` entry wins. */
export function assignPersona(scores: MindsetScores, content: ContentBundle): string {
  const rule = content.personas.assignmentRules.find((r) =>
    evaluateCondition(r.when, (m) => scores[m]),
  );
  // content:validate guarantees full coverage; fall back to the last rule defensively.
  return (rule ?? content.personas.assignmentRules.at(-1)!).personaId;
}
