// Holdings, SIPs, liquidity and penalties (§7.3).
// Every option is unit-priced: buying converts paise to units at the option's unit
// price, and value = units × unit price. A unit starts at ₹10 (NAV index 1), like a
// newly launched fund, and the NAV index moves with the tosses.
import type { InvestmentOption } from "@toss/content";
import { EngineError } from "./errors";
import { monthsPerTurn } from "./money";
import type { GameState, Holding, Paise } from "./types";

/** Price of one unit when the NAV index is 1: ₹10, in paise. */
export const BASE_UNIT_PRICE: Paise = 1000;

/** Current price of one unit of an option, in paise (fractional). */
export function unitPrice(state: GameState, optionId: string): number {
  return (state.navs[optionId] ?? 1) * BASE_UNIT_PRICE;
}

function holdingFor(state: GameState, opt: InvestmentOption): Holding {
  let h = state.holdings.find((x) => x.optionId === opt.id);
  if (!h) {
    h = { optionId: opt.id, invested: 0, investedReal: 0, value: 0, units: 0 };
    if (opt.liquidity === "locked_until_maturity") {
      h.maturesAtTurn = state.turn + Math.ceil(opt.lockMonths / monthsPerTurn(state.turnUnit));
    }
    state.holdings.push(h);
  }
  return h;
}

/** Buys `amount` of an option at today's NAV. Mutates `state`; cash must already be deducted. */
export function buy(state: GameState, opt: InvestmentOption, amount: Paise): { units: number } {
  const h = holdingFor(state, opt);
  const units = amount / unitPrice(state, opt.id);
  h.units += units;
  h.invested += amount;
  h.investedReal += Math.round(amount / state.inflationIndex);
  h.value = Math.round(h.units * unitPrice(state, opt.id));
  return { units };
}

export function isLocked(state: GameState, h: Holding): boolean {
  return h.maturesAtTurn !== undefined && state.turn < h.maturesAtTurn;
}

/** Penalty for taking `amount` out of a holding right now (0 if not locked). */
export function withdrawalPenalty(
  state: GameState,
  h: Holding,
  opt: InvestmentOption,
  amount: Paise,
): Paise {
  return isLocked(state, h) ? Math.round(amount * opt.earlyBreakPenalty) : 0;
}

/**
 * Sells `amount` (paise of current value) from a holding. Returns what reaches the
 * wallet after any early-break penalty. Mutates `state`.
 */
export function sell(
  state: GameState,
  opt: InvestmentOption,
  amount: Paise,
): { received: Paise; penalty: Paise } {
  const h = state.holdings.find((x) => x.optionId === opt.id);
  if (!h || amount <= 0 || amount > h.value) {
    throw new EngineError("bad_withdraw", "nothing to withdraw");
  }
  const penalty = withdrawalPenalty(state, h, opt, amount);
  const share = amount / h.value;
  h.units *= 1 - share;
  h.invested = Math.round(h.invested * (1 - share));
  h.investedReal = Math.round(h.investedReal * (1 - share));
  h.value -= amount;
  if (h.value <= 0) state.holdings = state.holdings.filter((x) => x !== h);
  return { received: amount - penalty, penalty };
}

/** Recomputes every holding's value from units × NAV. */
export function revalue(state: GameState): void {
  for (const h of state.holdings) h.value = Math.round(h.units * unitPrice(state, h.optionId));
}

/**
 * Takes up to `amount` from instantly withdrawable holdings (the emergency fund),
 * starting with the content's emergency-fund option. Returns what was raised.
 */
export function drawFromInstantSavings(
  state: GameState,
  amount: Paise,
  options: Map<string, InvestmentOption>,
  preferredOptionId: string,
): Paise {
  let raised = 0;
  const instant = state.holdings
    .filter((h) => options.get(h.optionId)?.liquidity === "instant")
    .sort(
      (a, b) => Number(b.optionId === preferredOptionId) - Number(a.optionId === preferredOptionId),
    );
  for (const h of instant) {
    if (raised >= amount) break;
    const take = Math.min(h.value, amount - raised);
    if (take <= 0) continue;
    raised += sell(state, options.get(h.optionId)!, take).received;
  }
  return raised;
}
