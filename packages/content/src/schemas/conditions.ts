import { z } from "zod";

/**
 * Metric ids the condition DSL may read (§8.10).
 *
 * DECISION: the id list lives here (the content contract) rather than only in
 * `packages/engine/src/metrics.ts`, so that content validation can reject unknown
 * metric ids without the content package importing the engine. The engine's
 * registry is typed `Record<MetricId, MetricDef>`, so TypeScript fails the build
 * if a metric listed here has no compute function (and vice versa).
 */
export const METRIC_IDS = [
  "tasksOnTimeRate",
  "requiredTasksMissed",
  "emergencyFundCovered",
  "emergencyFundMonths",
  "realValueGrowthPct",
  "cashShareOfWealth",
  "cashRealValueLossPct",
  "fdShareOfWealth",
  "equityShareOfWealth",
  "diversificationCount",
  "sipActiveTurns",
  "sipStartedTurn",
  "soldDuringCrash",
  "fdBrokenEarly",
  "scamsFallen",
  "scamsSpotted",
  "repeatScamSpotted",
  "loansTaken",
  "loansRepaidOnTime",
  "loansDefaulted",
  "trustScore",
  "highInterestDebt",
  "windfallSavedPct",
  "auctionsWon",
  "overbidPct",
  "poolBidsJoined",
  "healthScore",
  "chapterTurns",
  "persona",
  "badEventCoveredByFund",
] as const;
export const metricIdSchema = z.enum(METRIC_IDS);
export type MetricId = z.infer<typeof metricIdSchema>;

/** Scores from the Money Mindset Check; used only by persona assignment rules. */
export const MINDSET_METRIC_IDS = ["plan", "risk", "know"] as const;
export const mindsetMetricIdSchema = z.enum(MINDSET_METRIC_IDS);
export type MindsetMetricId = z.infer<typeof mindsetMetricIdSchema>;

export const CONDITION_OPS = ["==", "!=", ">", ">=", "<", "<=", "in"] as const;
export const conditionOpSchema = z.enum(CONDITION_OPS);
export type ConditionOp = z.infer<typeof conditionOpSchema>;

const conditionValueSchema = z.union([
  z.number(),
  z.boolean(),
  z.string(),
  z.array(z.union([z.number(), z.string()])),
]);
export type ConditionValue = z.infer<typeof conditionValueSchema>;

export type Condition<M extends string = string> =
  | { metric: M; op: ConditionOp; value: ConditionValue }
  | { all: Condition<M>[] }
  | { any: Condition<M>[] }
  | { not: Condition<M> }
  | { always: true };

/**
 * Builds a recursive condition schema restricted to the given metric ids.
 * Safe and declarative — the engine evaluates it without `eval`.
 */
export function conditionSchemaFor<M extends string>(metric: z.ZodType<M>) {
  const schema: z.ZodType<Condition<M>> = z.lazy(() =>
    z.union([
      z.strictObject({ metric, op: conditionOpSchema, value: conditionValueSchema }),
      z.strictObject({ all: z.array(schema).min(1) }),
      z.strictObject({ any: z.array(schema).min(1) }),
      z.strictObject({ not: schema }),
      z.strictObject({ always: z.literal(true) }),
    ]),
  ) as z.ZodType<Condition<M>>;
  return schema;
}

export const conditionSchema = conditionSchemaFor(metricIdSchema);
export type MetricCondition = Condition<MetricId>;

export const mindsetConditionSchema = conditionSchemaFor(mindsetMetricIdSchema);
export type MindsetCondition = Condition<MindsetMetricId>;
