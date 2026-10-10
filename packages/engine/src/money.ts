import type { Paise } from "./types";

/** Content files use rupees; the engine uses integer paise. */
export function rupeesToPaise(rupees: number): Paise {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: Paise): number {
  return paise / 100;
}

/** Applies a rate to an amount and rounds to whole paise (banker-free, half away from zero). */
export function applyRate(amount: Paise, rate: number): Paise {
  return Math.round(amount * (1 + rate));
}

/** Real Value = amount ÷ cumulative inflation index (§7.3). */
export function realValue(amount: Paise, inflationIndex: number): Paise {
  return Math.round(amount / inflationIndex);
}

/** Converts a yearly rate to the equivalent rate for one turn. */
export function ratePerTurn(yearlyRate: number, turnUnit: "month" | "year"): number {
  return turnUnit === "year" ? yearlyRate : Math.pow(1 + yearlyRate, 1 / 12) - 1;
}

export function monthsPerTurn(turnUnit: "month" | "year"): number {
  return turnUnit === "year" ? 12 : 1;
}
