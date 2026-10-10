// Market toss model (§7.4): one shared market state per turn for every equity-linked
// option, plus independent tosses (e.g. gold) that make diversification meaningful.
import type { ContentBundle, InvestmentOption } from "@toss/content";
import { monthsPerTurn, ratePerTurn } from "./money";
import { createRng } from "./rng";
import type { TossResult } from "./types";

/** Tosses for one turn. Depends only on (seed, turn, content), never on decisions. */
export function tossFor(
  seed: string,
  turn: number,
  content: ContentBundle,
  turnUnit: "month" | "year",
): TossResult {
  const market = createRng(seed, "market", turn).weighted(
    content.market.states,
    (s) => s.probability,
  )!;
  const independent: Record<string, string> = {};
  const independentRng = createRng(seed, "independent", turn);
  for (const toss of content.market.independentTosses) {
    independent[toss.id] = independentRng.weighted(toss.states, (s) => s.probability)!.id;
  }
  return {
    turn,
    marketState: market.id,
    independent,
    inflation: ratePerTurn(content.economy.inflationPerYear, turnUnit),
  };
}

/** The option's YEARLY return for the tossed states. */
export function optionYearlyRate(
  opt: InvestmentOption,
  toss: Pick<TossResult, "marketState" | "independent">,
  options: Map<string, InvestmentOption>,
  depth = 0,
): number {
  const r = opt.returns;
  switch (r.type) {
    case "fixed":
      return r.rate;
    case "market":
      return r.byState[toss.marketState] ?? 0;
    case "independent":
      return r.byState[toss.independent[r.toss] ?? ""] ?? 0;
    case "mix":
      if (depth > 3) return 0;
      return r.components.reduce((s, c) => {
        const inner = options.get(c.optionId);
        return s + c.weight * (inner ? optionYearlyRate(inner, toss, options, depth + 1) : 0);
      }, 0);
  }
}

/**
 * NAV growth factor for ONE month of this turn. The turn's return is spread evenly
 * (geometrically) across its months, so a SIP buying monthly in a crash year buys
 * at falling prices: rupee-cost averaging (§8.7).
 */
export function monthlyNavFactor(
  opt: InvestmentOption,
  toss: TossResult,
  options: Map<string, InvestmentOption>,
  turnUnit: "month" | "year",
): number {
  const perTurn = ratePerTurn(optionYearlyRate(opt, toss, options), turnUnit);
  return Math.pow(1 + perTurn, 1 / monthsPerTurn(turnUnit));
}
