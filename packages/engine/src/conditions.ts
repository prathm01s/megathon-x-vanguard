import { evaluateCondition, type ContentBundle, type MetricCondition } from "@toss/content";
import { computeMetrics } from "./metrics";
import type { GameState, MetricValues } from "./types";

export { evaluateCondition };

/** Evaluates a condition against precomputed metric values. */
export function matches(condition: MetricCondition, metrics: MetricValues): boolean {
  return evaluateCondition(condition, (id) => metrics[id]);
}

/** Convenience: compute the metrics for a state and evaluate. */
export function matchesState(
  condition: MetricCondition,
  state: GameState,
  content: ContentBundle,
): boolean {
  return matches(condition, computeMetrics(state, content));
}
