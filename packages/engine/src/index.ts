// Public surface of @toss/engine. Pure TypeScript — safe in the browser, Node and Edge Functions.
export * from "./types";
export * from "./api";
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
export { netWorth } from "./helpers";
export { optionYearlyRate } from "./market";
export {
  bankRateFor,
  maxLoanFor,
  interestAccrued,
  amountOwed,
  validateOfferRate,
  repayLoan,
  settleLoanForTurn,
  clampTrust,
  type LoanUpdate,
} from "./loans";
export {
  openAuction,
  placeBid,
  joinPool,
  closeAuction,
  poolTotal,
  overbidPct,
  splitProRata,
  poolCosts,
  returnStreamPayout,
} from "./auction";
export {
  botTurn,
  botScamResponse,
  playChapter,
  botLoanOfferRate,
  botAuctionBid,
  SIM_STRATEGIES,
  type StrategyId,
} from "./bots";
export {
  createRoomState,
  joinRoom,
  leaveRoom,
  fillWithBots,
  startRoom,
  react,
  memberAction,
  requestLoan,
  offerLoan,
  acceptLoan,
  repayRoomLoan,
  placeRoomBid,
  joinRoomPool,
  submitTurn,
  resolveTurn,
  endRoomChapter,
  loansOwedBy,
  type PlayerInfo,
} from "./room";
