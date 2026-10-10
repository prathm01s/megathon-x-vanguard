import type { Condition, ConditionValue } from "./schemas/conditions";

export type MetricValue = number | boolean | string;

/**
 * Evaluates a declarative condition against a metric lookup. No `eval`.
 *
 * DECISION: the evaluator lives in the content package (pure, no I/O) so that
 * `content:validate` can check persona-rule coverage without importing the
 * engine; `packages/engine/src/conditions.ts` re-exports it and adds the
 * metrics-registry binding.
 */
export function evaluateCondition<M extends string>(
  condition: Condition<M>,
  getMetric: (id: M) => MetricValue | undefined,
): boolean {
  if ("always" in condition) return true;
  if ("all" in condition) return condition.all.every((c) => evaluateCondition(c, getMetric));
  if ("any" in condition) return condition.any.some((c) => evaluateCondition(c, getMetric));
  if ("not" in condition) return !evaluateCondition(condition.not, getMetric);

  const actual = getMetric(condition.metric);
  if (actual === undefined) return false;
  return compare(actual, condition.op, condition.value);
}

function compare(actual: MetricValue, op: string, expected: ConditionValue): boolean {
  switch (op) {
    case "==":
      return actual === expected;
    case "!=":
      return actual !== expected;
    case "in":
      return Array.isArray(expected) && (expected as (string | number)[]).includes(actual as never);
    case ">":
    case ">=":
    case "<":
    case "<=": {
      if (typeof actual !== "number" || typeof expected !== "number") return false;
      if (op === ">") return actual > expected;
      if (op === ">=") return actual >= expected;
      if (op === "<") return actual < expected;
      return actual <= expected;
    }
    default:
      return false;
  }
}

/** Collects every metric id a condition reads (for validation). */
export function conditionMetrics<M extends string>(condition: Condition<M>): M[] {
  if ("always" in condition) return [];
  if ("all" in condition) return condition.all.flatMap((c) => conditionMetrics(c));
  if ("any" in condition) return condition.any.flatMap((c) => conditionMetrics(c));
  if ("not" in condition) return conditionMetrics(condition.not);
  return [condition.metric];
}
