// Browser-safe entry: schemas, inferred types and pure helpers.
// Node-only loading lives in `@toss/content/load`; the compiled bundle in `@toss/content/bundle`.
export * from "./schemas";
export { evaluateCondition, conditionMetrics, type MetricValue } from "./conditions";
export { localize, fillPlaceholders, placeholdersIn } from "./localize";
export { checkBundle, expectedReturn, type CheckReport } from "./check";
