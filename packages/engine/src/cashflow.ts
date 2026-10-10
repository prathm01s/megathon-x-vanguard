// One rule for every payment the player can't avoid (rent, a medical bill, a fine):
// wallet first, then instantly withdrawable savings (the emergency fund), and only
// then a forced bank loan. This is what makes "preparation decides how much luck
// hurts" (§1) concrete.
import type { ContentBundle, InvestmentOption } from "@toss/content";
import { shortfallRate } from "./loans";
import { drawFromInstantSavings } from "./portfolio";
import type { GameEvent, GameState, Paise } from "./types";

export interface PaymentResult {
  fromCash: Paise;
  fromSavings: Paise;
  borrowed: Paise;
}

export function payOut(
  state: GameState,
  amount: Paise,
  content: ContentBundle,
  options: Map<string, InvestmentOption>,
  events: GameEvent[],
): PaymentResult {
  const fromCash = Math.min(Math.max(state.cash, 0), amount);
  state.cash -= fromCash;
  let rest = amount - fromCash;

  const fromSavings =
    rest > 0
      ? Math.min(
          rest,
          drawFromInstantSavings(state, rest, options, content.economy.emergencyFundOptionId),
        )
      : 0;
  rest -= fromSavings;

  if (rest > 0) {
    const { ratePerYear, highInterest } = shortfallRate(state, content);
    if (state.debt === 0) state.stats.loansTaken += 1;
    if (highInterest) state.stats.highInterestDebt = true;
    state.debt += rest;
    events.push({ type: "forced_borrowing", amount: rest, ratePerYear });
  }
  return { fromCash, fromSavings, borrowed: rest };
}
