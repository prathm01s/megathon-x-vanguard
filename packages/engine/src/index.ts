// Public surface of @toss/engine. Pure TypeScript — safe in the browser, Node and Edge Functions.
export * from "./types";
export {
  EngineError,
  NotImplementedError,
  scoreMindset,
  createPlaythrough,
  getAvailableActions,
  applyAction,
  advanceTurn,
  endChapter,
  replayWithChange,
  replay,
  tossFor,
  toDecisionLog,
  unlockedOptions,
} from "./api";
export { createRng, newSeed, type Rng, type RngStream } from "./rng";
export { rupeesToPaise, paiseToRupees, realValue, ratePerTurn, monthsPerTurn } from "./money";
export {
  METRICS,
  computeMetrics,
  totalWealth,
  type MetricDef,
  type MetricContext,
} from "./metrics";
export { matches, matchesState, evaluateCondition } from "./conditions";
export { assignPersona } from "./persona";
export { healthScore, componentFraction, weakestComponent } from "./score";
export { selectReportItems } from "./report";
