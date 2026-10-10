// Registry of every metric the condition DSL can read (§8.10).
// `Record<MetricId, …>` makes TypeScript fail if a metric id declared in
// packages/content/src/schemas/conditions.ts has no compute function here.
import type { Chapter, ContentBundle, InvestmentOption, MetricId } from "@toss/content";
import { monthsPerTurn, realValue } from "./money";
import type { GameState, MetricValues, Paise } from "./types";

export interface MetricContext {
  state: GameState;
  content: ContentBundle;
  chapter: Chapter;
  optionById: Map<string, InvestmentOption>;
}

export interface MetricDef {
  description: string;
  compute(ctx: MetricContext): number | boolean | string;
}

/** Cash in the wallet plus the current value of every holding. */
export function totalWealth(state: GameState): Paise {
  return state.cash + state.holdings.reduce((s, h) => s + h.value, 0);
}

/** Money reachable today without penalty: wallet + instant-liquidity holdings. */
export function liquidSavings(ctx: MetricContext): Paise {
  return (
    ctx.state.cash +
    ctx.state.holdings
      .filter((h) => ctx.optionById.get(h.optionId)?.liquidity === "instant")
      .reduce((s, h) => s + h.value, 0)
  );
}

/** Current monthly fixed expenses (inflation-adjusted where configured), in paise. */
export function monthlyExpenses(ctx: MetricContext): Paise {
  return ctx.chapter.fixedExpenses.reduce(
    (s, e) =>
      s + Math.round(e.amountPerMonth * 100 * (e.inflationAdjusted ? ctx.state.inflationIndex : 1)),
    0,
  );
}

function shareOf(
  ctx: MetricContext,
  pick: (o: InvestmentOption | undefined, id: string) => boolean,
): number {
  const wealth = totalWealth(ctx.state);
  if (wealth <= 0) return 0;
  const part = ctx.state.holdings
    .filter((h) => pick(ctx.optionById.get(h.optionId), h.optionId))
    .reduce((s, h) => s + h.value, 0);
  return part / wealth;
}

/** Required tasks whose due turn has passed (all of them at chapter end). */
function dueRequiredTasks(ctx: MetricContext) {
  const required = new Set(ctx.chapter.tasks.filter((t) => t.required).map((t) => t.id));
  return ctx.state.tasks.filter(
    (t) => required.has(t.taskId) && t.dueTurn <= Math.max(ctx.state.turn, 1),
  );
}

// DECISION: diversification counts distinct holdings worth ≥ 5% of wealth (wallet cash excluded).
const DIVERSIFICATION_MIN_SHARE = 0.05;

export const METRICS: Record<MetricId, MetricDef> = {
  tasksOnTimeRate: {
    description:
      "Share of due required tasks paid on or before their due turn (1 when none are due).",
    compute: (ctx) => {
      const due = dueRequiredTasks(ctx);
      if (due.length === 0) return 1;
      return (
        due.filter((t) => t.status === "done" && (t.completedTurn ?? Infinity) <= t.dueTurn)
          .length / due.length
      );
    },
  },
  requiredTasksMissed: {
    description: "Number of required tasks that were missed or paid late.",
    compute: (ctx) =>
      dueRequiredTasks(ctx).filter((t) => t.status === "missed" || t.status === "late").length,
  },
  emergencyFundMonths: {
    description: "Months of fixed expenses covered by instantly reachable money.",
    compute: (ctx) => {
      const monthly = monthlyExpenses(ctx);
      return monthly > 0 ? liquidSavings(ctx) / monthly : 0;
    },
  },
  emergencyFundCovered: {
    description:
      "Instantly reachable money covers the chapter's safety-task target (default 3 months).",
    compute: (ctx) => {
      const target =
        ctx.chapter.tasks.find((t) => t.targetMonthsOfExpenses)?.targetMonthsOfExpenses ?? 3;
      const monthly = monthlyExpenses(ctx);
      return monthly > 0 && liquidSavings(ctx) / monthly >= target;
    },
  },
  badEventCoveredByFund: {
    description: "At least one bad life event was paid from savings without borrowing.",
    compute: (ctx) => ctx.state.stats.badEventsCoveredByFund.length > 0,
  },
  realValueGrowthPct: {
    // DECISION: growth measures what invested money did after inflation, not salary piling up.
    // TODO(samarth): refine to a time-weighted real return once portfolio.ts tracks cash flows.
    description: "Real (inflation-adjusted) gain on invested money as a fraction, e.g. 0.12 = 12%.",
    compute: (ctx) => {
      const invested = ctx.state.holdings.reduce((s, h) => s + h.invested, 0);
      if (invested <= 0) return 0;
      const value = ctx.state.holdings.reduce((s, h) => s + h.value, 0);
      return realValue(value, ctx.state.inflationIndex) / invested - 1;
    },
  },
  cashShareOfWealth: {
    description: "Wallet cash (plus the `cash` option) as a share of total wealth.",
    compute: (ctx) => {
      const wealth = totalWealth(ctx.state);
      if (wealth <= 0) return 0;
      const cashHolding = ctx.state.holdings
        .filter((h) => h.optionId === "cash")
        .reduce((s, h) => s + h.value, 0);
      return (ctx.state.cash + cashHolding) / wealth;
    },
  },
  cashRealValueLossPct: {
    description:
      "Percent of buying power idle cash lost to inflation this chapter (whole number, e.g. 26).",
    compute: (ctx) => Math.round((1 - 1 / ctx.state.inflationIndex) * 100),
  },
  fdShareOfWealth: {
    description: "Fixed-deposit holdings as a share of total wealth.",
    compute: (ctx) => shareOf(ctx, (o) => o?.category === "deposit" && !o.monthlyDepositOnly),
  },
  equityShareOfWealth: {
    description: "High-risk market holdings (risk level ≥ 4) as a share of total wealth.",
    compute: (ctx) => shareOf(ctx, (o) => o?.category === "market" && o.riskLevel >= 4),
  },
  diversificationCount: {
    description: "Number of distinct holdings each worth at least 5% of total wealth.",
    compute: (ctx) => {
      const wealth = totalWealth(ctx.state);
      if (wealth <= 0) return 0;
      const byOption = new Map<string, number>();
      for (const h of ctx.state.holdings)
        byOption.set(h.optionId, (byOption.get(h.optionId) ?? 0) + h.value);
      return [...byOption.values()].filter((v) => v / wealth >= DIVERSIFICATION_MIN_SHARE).length;
    },
  },
  sipActiveTurns: {
    description: "Longest number of turns any single SIP has been running.",
    compute: (ctx) =>
      ctx.state.sips.reduce(
        (max, s) => Math.max(max, (s.stoppedTurn ?? ctx.state.turn + 1) - s.startedTurn),
        0,
      ),
  },
  sipStartedTurn: {
    description: "1-based turn in which the first SIP was started (0 if none).",
    compute: (ctx) =>
      ctx.state.sips.length ? Math.min(...ctx.state.sips.map((s) => s.startedTurn)) : 0,
  },
  soldDuringCrash: {
    description: "Withdrew from a market option in a turn after a crash toss.",
    compute: (ctx) => ctx.state.stats.soldDuringCrash,
  },
  fdBrokenEarly: {
    description: "Broke a locked deposit before maturity.",
    compute: (ctx) => ctx.state.stats.fdBrokenEarly,
  },
  scamsFallen: {
    description: "Number of scams the player fell for this chapter.",
    compute: (ctx) => ctx.state.scamsFallenIds.length,
  },
  scamsSpotted: {
    description: "Number of scams ignored, reported or checked with a friend.",
    compute: (ctx) => ctx.state.stats.scamsSpotted,
  },
  repeatScamSpotted: {
    description: "Spotted a repeat variant of a scam fallen for earlier.",
    compute: (ctx) => ctx.state.stats.repeatScamSpotted,
  },
  loansTaken: {
    description: "Loans taken (any lender).",
    compute: (ctx) => ctx.state.stats.loansTaken,
  },
  loansRepaidOnTime: {
    description: "Loans repaid by the due turn.",
    compute: (ctx) => ctx.state.stats.loansRepaidOnTime,
  },
  loansDefaulted: {
    description: "Loans never repaid.",
    compute: (ctx) => ctx.state.stats.loansDefaulted,
  },
  trustScore: {
    description: "Friends' Room Trust Score (0–100).",
    compute: (ctx) => ctx.state.trustScore,
  },
  highInterestDebt: {
    description: "Borrowed from the loan app.",
    compute: (ctx) => ctx.state.stats.highInterestDebt,
  },
  windfallSavedPct: {
    description: "Share of good-event money (bonus, scholarship) that was saved rather than spent.",
    compute: (ctx) =>
      ctx.state.stats.windfallReceived > 0
        ? ctx.state.stats.windfallSaved / ctx.state.stats.windfallReceived
        : 0,
  },
  auctionsWon: {
    description: "Opportunity Auctions won.",
    compute: (ctx) => ctx.state.stats.auctionsWon,
  },
  overbidPct: {
    description: "Average overpay vs. true value on won auctions.",
    compute: (ctx) => ctx.state.stats.overbidPct,
  },
  poolBidsJoined: {
    description: "Pool bids joined.",
    compute: (ctx) => ctx.state.stats.poolBidsJoined,
  },
  healthScore: {
    description: "Financial Health Score; filled in by endChapter after scoring (0 before).",
    compute: () => 0,
  },
  chapterTurns: {
    description: "Turns played so far in this chapter.",
    compute: (ctx) => ctx.state.turn,
  },
  persona: { description: "Current persona id.", compute: (ctx) => ctx.state.personaId },
};

export function computeMetrics(state: GameState, content: ContentBundle): MetricValues {
  const chapter = content.chapters.find((c) => c.id === state.chapterId);
  if (!chapter) throw new Error(`unknown chapter ${state.chapterId}`);
  const ctx: MetricContext = {
    state,
    content,
    chapter,
    optionById: new Map(content.options.options.map((o) => [o.id, o])),
  };
  const out = {} as MetricValues;
  for (const id of Object.keys(METRICS) as MetricId[]) out[id] = METRICS[id].compute(ctx);
  return out;
}

/** Months in one turn of the given state (12 for year-long turns). */
export function stateMonthsPerTurn(state: GameState): number {
  return monthsPerTurn(state.turnUnit);
}
