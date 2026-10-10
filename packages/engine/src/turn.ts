// The toss (§7.1 step 4): time advances one turn.
//
// A turn is simulated month by month (12 steps in year-long chapters, §7.1 allows it):
//   each month   NAVs move by the tossed return, prices rise, income arrives, fixed
//                expenses are paid, a life event may hit (in its drawn month), bank debt
//                accrues interest and is repaid from spare cash, SIP instalments buy units;
//   end of turn  cash-at-home loss, scam offer, salary growth, task inflation and due
//                dates, history snapshot.
// Randomness comes only from per-(seed, stream, turn) RNGs, so tosses never depend on
// decisions and "What if" replays are exact.
import type { ContentBundle } from "@toss/content";
import { payOut } from "./cashflow";
import {
  cashLossThisTurn,
  incomeForMonth,
  incomeGrowthPerYear,
  incomeVariabilityFactor,
  monthlyExpensesFor,
  monthlyInflationFactor,
  tickIncomeModifiers,
} from "./economy";
import { EngineError } from "./errors";
import { applyLifeEvent, drawLifeEvent, drawScam } from "./events";
import { clone, getChapter, optionMap, snapshot } from "./helpers";
import { accrueDebtInterest, repayDebtFromCash, shortfallRate } from "./loans";
import { monthlyNavFactor, tossFor } from "./market";
import { monthsPerTurn } from "./money";
import { buy, revalue } from "./portfolio";
import { createRng } from "./rng";
import { inflateOpenTasks, processDueTasks } from "./tasks";
import type { GameEvent, GameState, TossResult } from "./types";

export function advanceTurn(
  state: GameState,
  content: ContentBundle,
): { state: GameState; tossResult: TossResult; events: GameEvent[] } {
  if (state.status !== "playing") {
    throw new EngineError(state.status, `cannot advance while ${state.status}`);
  }
  const chapter = getChapter(content, state.chapterId);
  const options = optionMap(content);
  const persona = content.personas.personas.find((p) => p.id === state.personaId);
  const next = clone(state);
  const events: GameEvent[] = [];
  const months = monthsPerTurn(state.turnUnit);
  next.turn += 1;

  // ── Toss ──────────────────────────────────────────────────────────────────
  const toss = tossFor(state.seed, next.turn, content, state.turnUnit);
  events.push({
    type: "market_toss",
    marketState: toss.marketState,
    independent: toss.independent,
  });
  const navFactors = new Map(
    content.options.options.map((o) => [o.id, monthlyNavFactor(o, toss, options, state.turnUnit)]),
  );
  const lifeRng = createRng(state.seed, "life", next.turn);
  const lifeEvent = drawLifeEvent(next, chapter, content, persona, months, lifeRng);
  if (lifeEvent) {
    toss.lifeEventId = lifeEvent.event.id;
    toss.lifeEventMonth = lifeEvent.month;
  }
  const variability = incomeVariabilityFactor(chapter, createRng(state.seed, "income", next.turn));
  const inflationStep = monthlyInflationFactor(content);
  const debtRate = shortfallRate(next, content).ratePerYear;

  const valueBefore = new Map(next.holdings.map((h) => [h.optionId, h.value]));
  let hadBadEvent = false;
  let incomeTotal = 0;
  let expensesTotal = 0;
  const sipBought = new Map<string, { amount: number; units: number }>();

  // ── Month by month ────────────────────────────────────────────────────────
  for (let month = 1; month <= months; month++) {
    for (const [id, f] of navFactors) next.navs[id] = (next.navs[id] ?? 1) * f;
    revalue(next);
    next.inflationIndex *= inflationStep;

    const income = incomeForMonth(next, variability);
    next.cash += income;
    incomeTotal += income;
    tickIncomeModifiers(next);

    const expenses = monthlyExpensesFor(chapter, next.inflationIndex);
    payOut(next, expenses, content, options, events);
    expensesTotal += expenses;

    if (lifeEvent && lifeEvent.month === month) {
      hadBadEvent = applyLifeEvent(next, lifeEvent.event, content, options, events) || hadBadEvent;
    }

    const interest = accrueDebtInterest(next, debtRate);
    if (interest > 0) events.push({ type: "debt_interest", amount: interest });
    const repaid = repayDebtFromCash(next);
    if (repaid > 0) events.push({ type: "debt_repaid", amount: repaid });

    for (const sip of next.sips.filter((s) => s.stoppedTurn === undefined)) {
      const opt = options.get(sip.optionId);
      if (!opt) continue;
      if (next.cash < sip.amountPerMonth) {
        next.stats.sipInstalmentsMissed += 1;
        events.push({ type: "sip_missed", optionId: sip.optionId, amount: sip.amountPerMonth });
        continue;
      }
      next.cash -= sip.amountPerMonth;
      const { units } = buy(next, opt, sip.amountPerMonth);
      const agg = sipBought.get(sip.optionId) ?? { amount: 0, units: 0 };
      sipBought.set(sip.optionId, {
        amount: agg.amount + sip.amountPerMonth,
        units: agg.units + units,
      });
    }
  }
  revalue(next);

  events.push(
    { type: "income", amount: incomeTotal },
    { type: "fixed_expenses", amount: expensesTotal },
  );
  for (const h of next.holdings) {
    const before = valueBefore.get(h.optionId);
    if (before === undefined) continue;
    const bought = sipBought.get(h.optionId)?.amount ?? 0;
    events.push({
      type: "returns",
      optionId: h.optionId,
      rate: Math.pow(navFactors.get(h.optionId) ?? 1, months) - 1,
      change: h.value - before - bought,
    });
  }
  for (const [optionId, b] of sipBought) {
    events.push({ type: "sip_buy", optionId, amount: b.amount, units: b.units });
  }

  // ── End of turn ───────────────────────────────────────────────────────────
  const lost = cashLossThisTurn(next, content, createRng(state.seed, "cash", next.turn));
  if (lost > 0) {
    next.cash -= lost;
    next.stats.cashLost += lost;
    events.push({ type: "cash_lost", amount: lost });
  }

  const scam = drawScam(
    next,
    chapter,
    content,
    persona,
    hadBadEvent,
    createRng(state.seed, "scam", next.turn),
  );
  if (scam) {
    next.pendingScams.push(scam);
    toss.scamId = scam.scamId;
    events.push({ type: "scam_offer", instanceId: scam.instanceId, scamId: scam.scamId });
  }

  if (state.turnUnit === "year" || next.turn % 12 === 0) {
    next.incomePerMonth = Math.round(
      next.incomePerMonth * (1 + incomeGrowthPerYear(chapter, content)),
    );
  }
  events.push({ type: "inflation", rate: toss.inflation, inflationIndex: next.inflationIndex });
  inflateOpenTasks(next, chapter, toss.inflation);
  processDueTasks(next, chapter, content, options, events);

  next.tosses.push(toss);
  next.history.push(snapshot(next));
  if (next.pendingScams.length > 0) next.status = "awaiting_scam_response";
  else if (next.turn >= next.totalTurns) next.status = "chapter_complete";
  if (next.turn >= next.totalTurns) events.push({ type: "chapter_complete" });
  return { state: next, tossResult: toss, events };
}
