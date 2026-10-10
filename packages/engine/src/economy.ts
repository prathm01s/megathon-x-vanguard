// Prices, income and cash-at-home risk (§8.4).
import type { Chapter, ContentBundle } from "@toss/content";
import { monthsPerTurn, rupeesToPaise } from "./money";
import type { Rng } from "./rng";
import type { GameState, Paise } from "./types";

/** Price growth for ONE month. Twelve monthly steps compound to exactly the yearly rate. */
export function monthlyInflationFactor(content: ContentBundle): number {
  return Math.pow(1 + content.economy.inflationPerYear, 1 / 12);
}

/** Monthly fixed expenses at the given price index, in paise. */
export function monthlyExpensesFor(chapter: Chapter, inflationIndex: number): Paise {
  return chapter.fixedExpenses.reduce(
    (s, e) =>
      s + Math.round(rupeesToPaise(e.amountPerMonth) * (e.inflationAdjusted ? inflationIndex : 1)),
    0,
  );
}

/** Yearly income growth for the chapter (salary growth or the chapter's own rate). */
export function incomeGrowthPerYear(chapter: Chapter, content: ContentBundle): number {
  return chapter.income.growthPerYear === "economy"
    ? content.economy.salaryGrowthPerYear
    : chapter.income.growthPerYear;
}

/**
 * Business chapters: income for the whole turn is scaled by a factor in
 * [1 − variability, 1 + variability] drawn from the "income" stream (good and bad months).
 */
export function incomeVariabilityFactor(chapter: Chapter, rng: Rng): number {
  const v = chapter.income.variability;
  return v > 0 ? 1 + (rng.next() * 2 - 1) * v : 1;
}

/** Income received in one month after temporary modifiers (job break, slow season). */
export function incomeForMonth(state: GameState, variabilityFactor: number): Paise {
  const modifier = state.incomeModifiers.reduce((sum, m) => sum + m.rate, 0);
  return Math.max(
    0,
    Math.round(state.incomePerMonth * Math.max(0, 1 + modifier) * variabilityFactor),
  );
}

/** Counts down temporary income modifiers by one month and drops finished ones. */
export function tickIncomeModifiers(state: GameState): void {
  for (const m of state.incomeModifiers) m.monthsLeft -= 1;
  state.incomeModifiers = state.incomeModifiers.filter((m) => m.monthsLeft > 0);
}

/**
 * Cash kept at home can be lost or stolen (§8.4): at most once per turn, with the
 * yearly chance scaled to the turn length, losing up to `cashLossMaxPct` of the cash.
 */
export function cashLossThisTurn(state: GameState, content: ContentBundle, rng: Rng): Paise {
  if (state.cash <= 0) return 0;
  const months = monthsPerTurn(state.turnUnit);
  const chance = 1 - Math.pow(1 - content.economy.cashLossChancePerYear, months / 12);
  if (!rng.chance(chance)) return 0;
  return Math.round(state.cash * rng.next() * content.economy.cashLossMaxPct);
}
