// ─────────────────────────────────────────────────────────────────────────────
// ENGINE API (§15.4 A). Pure: (state, action, content) → new state. No I/O.
//
// Day-zero status: the API surface is final-shaped and works end to end for a
// simplified chapter, so UI and persistence can integrate now. Items marked
// TODO(samarth) are simplified and will be replaced by the dedicated modules
// (market.ts, portfolio.ts, tasks.ts, events.ts, loans.ts, auction.ts, bots.ts).
// ─────────────────────────────────────────────────────────────────────────────
import type { Chapter, ContentBundle, InvestmentOption, LifeEvent } from "@toss/content";
import { matches } from "./conditions";
import { computeMetrics, monthlyExpenses } from "./metrics";
import { monthsPerTurn, ratePerTurn, realValue, rupeesToPaise } from "./money";
import { scoreMindset as scoreMindsetImpl } from "./persona";
import { selectReportItems } from "./report";
import { createRng } from "./rng";
import { healthScore, weakestComponent } from "./score";
import type {
  Action,
  ActionOption,
  ChapterResult,
  ChapterStats,
  DecisionChange,
  DecisionRecord,
  GameEvent,
  GameState,
  MindsetAnswers,
  MindsetResult,
  TaskState,
  TossResult,
  WhatIfResult,
} from "./types";

export class EngineError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "EngineError";
  }
}

export class NotImplementedError extends EngineError {
  constructor(what: string) {
    super("not_implemented", `${what} is not implemented yet (engine day-zero stub)`);
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

function getChapter(content: ContentBundle, id: string): Chapter {
  const ch = content.chapters.find((c) => c.id === id);
  if (!ch) throw new EngineError("unknown_chapter", `unknown chapter "${id}"`);
  return ch;
}

function optionMap(content: ContentBundle) {
  return new Map(content.options.options.map((o) => [o.id, o]));
}

/** Options available in a chapter: its own unlocks plus everything unlocked in earlier chapters. */
export function unlockedOptions(content: ContentBundle, chapterId: string): InvestmentOption[] {
  const chapter = getChapter(content, chapterId);
  const orderOf = new Map(content.chapters.map((c) => [c.id, c.order]));
  return content.options.options.filter(
    (o) =>
      o.enabled &&
      (chapter.unlockOptions.includes(o.id) ||
        (orderOf.get(o.unlockChapter) ?? Infinity) < chapter.order),
  );
}

function emptyStats(): ChapterStats {
  return {
    scamsSpotted: 0,
    repeatScamSpotted: false,
    soldDuringCrash: false,
    fdBrokenEarly: false,
    badEventsCoveredByFund: [],
    windfallReceived: 0,
    windfallSaved: 0,
    loansTaken: 0,
    loansRepaidOnTime: 0,
    loansDefaulted: 0,
    highInterestDebt: false,
    interestPaid: 0,
    auctionsWon: 0,
    overbidPct: 0,
    poolBidsJoined: 0,
    shiftStreaks: {},
  };
}

function wealth(state: GameState): number {
  return state.cash + state.holdings.reduce((s, h) => s + h.value, 0);
}

function snapshot(state: GameState) {
  const amount = wealth(state);
  return {
    turn: state.turn,
    amount,
    realValue: realValue(amount, state.inflationIndex),
    inflationIndex: state.inflationIndex,
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

// ── API ─────────────────────────────────────────────────────────────────────
export function scoreMindset(answers: MindsetAnswers, content: ContentBundle): MindsetResult {
  return scoreMindsetImpl(answers, content);
}

export function createPlaythrough(args: {
  content: ContentBundle;
  personaId: string;
  seed: string;
  chapterId: string;
  /** Carried from the previous chapter's result (blocked goal, salary bonus, trust). */
  carryOver?: GameState["carryOver"];
  trustScore?: number;
}): GameState {
  const { content, personaId, seed, chapterId } = args;
  const chapter = getChapter(content, chapterId);
  const carryOver = args.carryOver ?? { blockNextChapterGoal: false, salaryBonusRate: 0 };

  const state: GameState = {
    schemaVersion: 1,
    contentVersion: content.contentVersion,
    seed,
    personaId,
    chapterId,
    turn: 0,
    totalTurns: chapter.turns,
    turnUnit: chapter.turnUnit,
    status: "playing",
    cash: rupeesToPaise(chapter.startingBalance),
    incomePerMonth: Math.round(
      rupeesToPaise(chapter.income.amountPerMonth) * (1 + carryOver.salaryBonusRate),
    ),
    incomeModifiers: [],
    inflationIndex: 1,
    holdings: [],
    sips: [],
    tasks: [],
    pendingScams: [],
    eventCooldowns: {},
    scamsFallenIds: [],
    carryOver: { blockNextChapterGoal: false, salaryBonusRate: 0 },
    trustScore: args.trustScore ?? content.multiplayer.loans.trust.start,
    stats: emptyStats(),
    history: [],
    actionLog: [],
    tosses: [],
  };

  const monthly = monthlyExpenses({ state, content, chapter, optionById: optionMap(content) });
  let blockedOne = false;
  state.tasks = chapter.tasks.map((t): TaskState => {
    const blocked =
      carryOver.blockNextChapterGoal && !blockedOne && t.kind === "goal" && !t.required;
    if (blocked) blockedOne = true;
    return {
      taskId: t.id,
      amount: t.targetMonthsOfExpenses
        ? Math.round(monthly * t.targetMonthsOfExpenses)
        : rupeesToPaise(t.amount),
      paid: 0,
      dueTurn: t.dueTurn,
      status: blocked ? "blocked" : "open",
    };
  });
  state.history.push(snapshot(state));
  return state;
}

export function getAvailableActions(state: GameState, content: ContentBundle): ActionOption[] {
  if (state.status === "chapter_complete") return [];
  const chapter = getChapter(content, state.chapterId);
  const out: ActionOption[] = [];

  for (const p of state.pendingScams) {
    const scam = content.scams.scams.find((s) => s.id === p.scamId);
    if (scam) out.push({ type: "scam_response", targetId: p.instanceId, label: scam.title });
  }
  if (state.status === "awaiting_scam_response") return out;

  for (const t of state.tasks) {
    if (t.status !== "open" && t.status !== "late") continue;
    const def = chapter.tasks.find((d) => d.id === t.taskId);
    if (!def) continue;
    const remaining = t.amount - t.paid;
    out.push({
      type: "pay_task",
      targetId: t.taskId,
      label: def.title,
      minAmount: 1,
      maxAmount: Math.min(remaining, state.cash),
      ...(state.cash <= 0 ? { disabledReason: "insufficient_cash" as const } : {}),
    });
  }

  for (const o of unlockedOptions(content, state.chapterId)) {
    if (o.id === "cash") continue; // the wallet *is* cash
    const min = rupeesToPaise(o.minAmount);
    out.push({
      type: "invest",
      targetId: o.id,
      label: o.name,
      minAmount: min,
      maxAmount: state.cash,
      ...(o.riskLevel >= 4 ? { warning: "high_risk" as const } : {}),
      ...(state.cash < Math.max(min, 1) ? { disabledReason: "insufficient_cash" as const } : {}),
    });
    const holding = state.holdings.find((h) => h.optionId === o.id);
    if (holding && holding.value > 0) {
      const locked = holding.maturesAtTurn !== undefined && state.turn < holding.maturesAtTurn;
      const lastToss = state.tosses.at(-1);
      out.push({
        type: "withdraw",
        targetId: o.id,
        label: o.name,
        minAmount: 1,
        maxAmount: holding.value,
        ...(locked
          ? {
              warning: "early_break_penalty" as const,
              penalty: Math.round(holding.value * o.earlyBreakPenalty),
            }
          : o.liquidity === "market" && lastToss?.marketState === "crash"
            ? { warning: "selling_in_storm" as const }
            : o.liquidity === "market" && holding.value < holding.invested
              ? { warning: "below_cost" as const }
              : {}),
      });
    }
    if (o.sipAllowed) {
      const running = state.sips.find((s) => s.optionId === o.id && s.stoppedTurn === undefined);
      out.push(
        running
          ? { type: "sip_stop", targetId: o.id, label: o.name }
          : { type: "sip_start", targetId: o.id, label: o.name, minAmount: min },
      );
    }
  }
  return out;
}

export function applyAction(state: GameState, action: Action, content: ContentBundle): GameState {
  if (state.status === "chapter_complete")
    throw new EngineError("chapter_complete", "chapter is over");
  if (state.status === "awaiting_scam_response" && action.type !== "scam_response") {
    throw new EngineError("scam_pending", "answer the scam card first");
  }
  const next = clone(state);
  const options = optionMap(content);
  const playingTurn = state.turn + 1;

  switch (action.type) {
    case "pay_task": {
      const task = next.tasks.find((t) => t.taskId === action.taskId);
      if (!task || (task.status !== "open" && task.status !== "late"))
        throw new EngineError("bad_task", `task ${action.taskId} is not payable`);
      const amount = Math.min(action.amount, task.amount - task.paid);
      if (amount <= 0 || amount > next.cash)
        throw new EngineError("insufficient_cash", "not enough cash");
      next.cash -= amount;
      task.paid += amount;
      const taskDef = getChapter(content, state.chapterId).tasks.find((d) => d.id === task.taskId);
      if (taskDef?.kind === "safety") {
        // DECISION: a safety task isn't spending — the money moves into the instant-access
        // option set in economy.yaml (`emergencyFundOptionId`), so it still counts as the
        // emergency fund. TODO(samarth): let the player pick where the fund lives.
        const fundId = content.economy.emergencyFundOptionId;
        let fund = next.holdings.find((h) => h.optionId === fundId);
        if (!fund) next.holdings.push((fund = { optionId: fundId, invested: 0, value: 0 }));
        fund.invested += amount;
        fund.value += amount;
      }
      if (task.paid >= task.amount) {
        // A task already marked late stays "late" for scoring, but is settled.
        task.status = task.status === "late" ? "late" : "done";
        task.completedTurn = playingTurn;
        const bonus = taskDef?.onCompleteConsequence?.match(/^salaryBonus:(.+)$/)?.[1];
        if (bonus) next.incomePerMonth = Math.round(next.incomePerMonth * (1 + Number(bonus)));
      }
      break;
    }
    case "invest": {
      const opt = options.get(action.optionId);
      if (!opt) throw new EngineError("bad_option", `unknown option ${action.optionId}`);
      if (action.amount <= 0 || action.amount > next.cash)
        throw new EngineError("insufficient_cash", "not enough cash");
      if (action.amount < rupeesToPaise(opt.minAmount))
        throw new EngineError("below_min", "below minimum amount");
      next.cash -= action.amount;
      let holding = next.holdings.find((h) => h.optionId === opt.id);
      if (!holding) {
        holding = { optionId: opt.id, invested: 0, value: 0 };
        if (opt.liquidity === "locked_until_maturity") {
          holding.maturesAtTurn =
            state.turn + Math.ceil(opt.lockMonths / monthsPerTurn(state.turnUnit));
        }
        next.holdings.push(holding);
      }
      holding.invested += action.amount;
      holding.value += action.amount;
      break;
    }
    case "withdraw": {
      const opt = options.get(action.optionId);
      const holding = next.holdings.find((h) => h.optionId === action.optionId);
      if (!opt || !holding || action.amount <= 0 || action.amount > holding.value) {
        throw new EngineError("bad_withdraw", "nothing to withdraw");
      }
      const locked = holding.maturesAtTurn !== undefined && state.turn < holding.maturesAtTurn;
      const penalty = locked ? Math.round(action.amount * opt.earlyBreakPenalty) : 0;
      if (locked && opt.category === "deposit") next.stats.fdBrokenEarly = true;
      if (opt.liquidity === "market" && state.tosses.at(-1)?.marketState === "crash")
        next.stats.soldDuringCrash = true;
      const share = action.amount / holding.value;
      holding.invested = Math.round(holding.invested * (1 - share));
      holding.value -= action.amount;
      next.cash += action.amount - penalty;
      if (holding.value <= 0) next.holdings = next.holdings.filter((h) => h !== holding);
      break;
    }
    case "sip_start": {
      const opt = options.get(action.optionId);
      if (!opt?.sipAllowed) throw new EngineError("bad_option", "SIP not allowed for this option");
      if (next.sips.some((s) => s.optionId === opt.id && s.stoppedTurn === undefined)) {
        throw new EngineError("already_running", "SIP already running");
      }
      next.sips.push({
        optionId: opt.id,
        amountPerMonth: action.amountPerMonth,
        startedTurn: playingTurn,
      });
      break;
    }
    case "sip_stop": {
      const sip = next.sips.find(
        (s) => s.optionId === action.optionId && s.stoppedTurn === undefined,
      );
      if (!sip) throw new EngineError("bad_option", "no running SIP");
      sip.stoppedTurn = playingTurn;
      break;
    }
    case "scam_response": {
      const pending = next.pendingScams.find((p) => p.instanceId === action.instanceId);
      const scam = pending && content.scams.scams.find((s) => s.id === pending.scamId);
      const choice = scam?.actions.find((a) => a.id === action.response);
      if (!pending || !scam || !choice) throw new EngineError("bad_scam", "unknown scam response");
      if (choice.falls) {
        const loss =
          scam.lossIfFallen.type === "fixed"
            ? rupeesToPaise(scam.lossIfFallen.amount)
            : Math.round(next.cash * scam.lossIfFallen.pct);
        next.cash -= Math.min(loss, Math.max(next.cash, 0));
        next.scamsFallenIds.push(scam.id);
        if (scam.createsHighInterestDebt) next.stats.highInterestDebt = true; // TODO(samarth): model as a loan in loans.ts
      } else {
        next.stats.scamsSpotted++;
        if (scam.repeatVariantOf && next.scamsFallenIds.includes(scam.repeatVariantOf))
          next.stats.repeatScamSpotted = true;
      }
      next.pendingScams = next.pendingScams.filter((p) => p !== pending);
      if (next.pendingScams.length === 0)
        next.status = next.turn >= next.totalTurns ? "chapter_complete" : "playing";
      break;
    }
  }
  next.actionLog.push({ turn: playingTurn, action });
  return next;
}

/** Tosses for one turn. Depends only on (seed, turn, content) — never on decisions. */
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

function optionRate(
  opt: InvestmentOption,
  toss: TossResult,
  content: ContentBundle,
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
    case "mix": {
      if (depth > 3) return 0;
      const options = optionMap(content);
      return r.components.reduce((s, c) => {
        const inner = options.get(c.optionId);
        return s + c.weight * (inner ? optionRate(inner, toss, content, depth + 1) : 0);
      }, 0);
    }
  }
}

export function advanceTurn(
  state: GameState,
  content: ContentBundle,
): { state: GameState; tossResult: TossResult; events: GameEvent[] } {
  if (state.status !== "playing")
    throw new EngineError(state.status, `cannot advance while ${state.status}`);
  const chapter = getChapter(content, state.chapterId);
  const options = optionMap(content);
  const persona = content.personas.personas.find((p) => p.id === state.personaId);
  const next = clone(state);
  const events: GameEvent[] = [];
  const months = monthsPerTurn(state.turnUnit);
  next.turn += 1;

  // 1. Toss (market + independent).
  const toss = tossFor(state.seed, next.turn, content, state.turnUnit);
  events.push({
    type: "market_toss",
    marketState: toss.marketState,
    independent: toss.independent,
  });

  // 2. Returns on existing holdings.
  for (const h of next.holdings) {
    const opt = options.get(h.optionId);
    if (!opt) continue; // option removed in newer content: keep value, no growth
    const rate = ratePerTurn(optionRate(opt, toss, content), state.turnUnit);
    const before = h.value;
    h.value = Math.max(0, Math.round(h.value * (1 + rate)));
    events.push({ type: "returns", optionId: h.optionId, rate, change: h.value - before });
  }

  // 3. Income and fixed expenses (expenses at this turn's prices).
  // TODO(samarth): apply incomeModifiers (job break), business variability, monthly SIP purchase timing.
  const income = next.incomePerMonth * months;
  const expenses = monthlyExpenses({ state: next, content, chapter, optionById: options }) * months;
  next.cash += income - expenses;
  events.push({ type: "income", amount: income }, { type: "fixed_expenses", amount: expenses });

  // 4. SIPs buy from cash (simplified: one purchase per turn after returns).
  for (const sip of next.sips.filter((s) => s.stoppedTurn === undefined)) {
    const amount = Math.min(sip.amountPerMonth * months, Math.max(next.cash, 0));
    if (amount <= 0) continue;
    next.cash -= amount;
    let h = next.holdings.find((x) => x.optionId === sip.optionId);
    if (!h) next.holdings.push((h = { optionId: sip.optionId, invested: 0, value: 0 }));
    h.invested += amount;
    h.value += amount;
    events.push({ type: "sip_buy", optionId: sip.optionId, amount, units: 0 });
  }

  // 5. Life event (at most one per turn). TODO(samarth): events.ts — income-change effects, cooldown tuning.
  const lifeRng = createRng(state.seed, "life", next.turn);
  let badEvent = false;
  for (const entry of chapter.lifeEventPool) {
    const ev = content.lifeEvents.events.find((e) => e.id === entry.eventId);
    if (!ev?.enabled) continue;
    const last = next.eventCooldowns[ev.id];
    if (last !== undefined && next.turn - last <= ev.cooldownTurns) continue;
    const multiplier = ev.tags.reduce((m, tag) => m * (persona?.eventMultipliers[tag] ?? 1), 1);
    if (!lifeRng.chance(ev.baseProbabilityPerTurn * entry.weight * multiplier)) continue;
    next.eventCooldowns[ev.id] = next.turn;
    toss.lifeEventId = ev.id;
    const amount = lifeEventAmount(ev, next);
    if (ev.type === "bad" && amount > 0) {
      badEvent = true;
      const covered = next.cash >= amount;
      next.cash -= amount;
      if (covered) next.stats.badEventsCoveredByFund.push(ev.id);
      events.push({
        type: "life_event",
        eventId: ev.id,
        amount,
        coveredBy: covered ? "cash" : "shortfall",
      });
    } else if (ev.type === "good") {
      if (ev.effect.type === "incomeChange")
        next.incomePerMonth = Math.round(next.incomePerMonth * (1 + ev.effect.rate));
      next.cash += amount;
      next.stats.windfallReceived += amount;
      events.push({ type: "life_event", eventId: ev.id, amount, coveredBy: "cash" });
    }
    break;
  }

  // 6. Scam offer (at most one per turn). TODO(samarth): events.ts — channels, room-only scams.
  const scamRng = createRng(state.seed, "scam", next.turn);
  for (const scamId of chapter.scamPool) {
    const scam = content.scams.scams.find((s) => s.id === scamId);
    if (!scam?.enabled) continue;
    if (scam.repeatVariantOf && !next.scamsFallenIds.includes(scam.repeatVariantOf)) continue;
    let p = scam.probability * (persona?.scamMultiplier ?? 1);
    if (scam.trigger === "after_bad_toss")
      p = badEvent ? p * content.scams.afterBadTossMultiplier : 0;
    if (!scamRng.chance(Math.min(p, 1))) continue;
    const instanceId = `${scam.id}@${next.turn}`;
    next.pendingScams.push({ instanceId, scamId: scam.id, turn: next.turn });
    toss.scamId = scam.id;
    events.push({ type: "scam_offer", instanceId, scamId: scam.id });
    break;
  }

  // 7. Inflation, salary growth, inflation-adjusted tasks.
  next.inflationIndex *= 1 + toss.inflation;
  events.push({ type: "inflation", rate: toss.inflation, inflationIndex: next.inflationIndex });
  if (state.turnUnit === "year" || next.turn % 12 === 0) {
    const g =
      chapter.income.growthPerYear === "economy"
        ? content.economy.salaryGrowthPerYear
        : chapter.income.growthPerYear;
    next.incomePerMonth = Math.round(next.incomePerMonth * (1 + g));
  }
  for (const t of next.tasks) {
    const def = chapter.tasks.find((d) => d.id === t.taskId);
    if (def?.inflationAdjusted && t.status === "open")
      t.amount = Math.round(t.amount * (1 + toss.inflation));
  }

  // 8. Task due dates and fines.
  for (const t of next.tasks) {
    if (t.status !== "open" || t.dueTurn !== next.turn) continue;
    const def = chapter.tasks.find((d) => d.id === t.taskId);
    if (!def) continue;
    events.push({ type: "task_due", taskId: t.taskId });
    const fine = rupeesToPaise(def.lateFine);
    next.cash -= fine;
    t.status = def.required ? "late" : "missed";
    if (def.consequence === "blockNextChapterGoal") next.carryOver.blockNextChapterGoal = true;
    events.push({ type: "task_missed", taskId: t.taskId, fine });
  }

  // TODO(samarth): cash-at-home loss chance (economy.cashLossChancePerYear) via the "cash" stream.

  next.tosses.push(toss);
  next.history.push(snapshot(next));
  if (next.pendingScams.length > 0) next.status = "awaiting_scam_response";
  else if (next.turn >= next.totalTurns) next.status = "chapter_complete";
  if (next.turn >= next.totalTurns) events.push({ type: "chapter_complete" });
  return { state: next, tossResult: toss, events };
}

function lifeEventAmount(ev: LifeEvent, state: GameState): number {
  switch (ev.effect.type) {
    case "fixed":
      return Math.round(rupeesToPaise(ev.effect.amount) * state.inflationIndex);
    case "monthsOfIncome":
      return Math.round(state.incomePerMonth * ev.effect.months);
    case "incomeChange":
      // Temporary income loss expressed as money lost now (TODO(samarth): use incomeModifiers).
      return ev.effect.rate < 0 && ev.effect.durationMonths
        ? Math.round(state.incomePerMonth * -ev.effect.rate * ev.effect.durationMonths)
        : 0;
  }
}

export function endChapter(
  state: GameState,
  content: ContentBundle,
  opts: { attempt?: number; multiplayer?: boolean } = {},
): ChapterResult {
  const chapter = getChapter(content, state.chapterId);
  const metrics = computeMetrics(state, content);
  const { score, breakdown } = healthScore(metrics, content, {
    multiplayer: opts.multiplayer ?? false,
  });
  metrics.healthScore = score;
  const threshold = chapter.passThreshold ?? content.healthScore.passThreshold;

  const lastBad = state.stats.badEventsCoveredByFund.at(-1);
  const eventTitle = lastBad
    ? content.lifeEvents.events.find((e) => e.id === lastBad)?.title.en
    : undefined;
  const items = selectReportItems(
    metrics,
    content,
    eventTitle ? { event: eventTitle.toLowerCase() } : {},
  );

  let whatIf: WhatIfResult | null = null;
  const candidate = [...content.lifeReport.whatIf.candidates]
    .sort((a, b) => b.priority - a.priority)
    .find((c) => matches(c.when, metrics));
  if (candidate) {
    try {
      whatIf = replayWithChange(state, { type: "candidate", candidateId: candidate.id }, content);
    } catch (err) {
      if (!(err instanceof NotImplementedError)) throw err;
    }
  }

  const badgesEarned = content.badges.badges
    .filter((b) => b.enabled && matches(b.when, metrics))
    .map((b) => b.id);

  // Persona shift. TODO(samarth): persist shiftStreaks across chapters via carryOver.
  let personaShift: ChapterResult["personaShift"] = null;
  for (const rule of content.personas.shiftRules.filter((r) => r.from === state.personaId)) {
    const streak = matches(rule.when, metrics) ? (state.stats.shiftStreaks[rule.id] ?? 0) + 1 : 0;
    if (streak >= rule.consecutiveChapters) {
      personaShift = { from: rule.from, to: rule.to, ruleId: rule.id };
      break;
    }
  }

  return {
    chapterId: chapter.id,
    attempt: opts.attempt ?? 1,
    healthScore: score,
    breakdown,
    passed: score >= threshold,
    weakestComponentId: weakestComponent(breakdown),
    report: {
      ...items,
      whatIf,
      gyaanQuestionIds: content.gyaan.questions
        .filter((q) => q.chapterId === chapter.id)
        .slice(0, content.gyaan.questionsPerChapter)
        .map((q) => q.id),
    },
    badgesEarned,
    personaShift,
    metrics,
    next:
      chapter.next === "end"
        ? "end"
        : typeof chapter.next === "string"
          ? [chapter.next]
          : chapter.next.choice,
  };
}

/**
 * "What if" (§7.2): re-runs the chapter from turn 0 with the SAME seed and one
 * changed decision. Tosses depend only on (seed, turn), so any difference is
 * caused purely by the decision.
 */
export function replayWithChange(
  state: GameState,
  change: DecisionChange,
  content: ContentBundle,
): WhatIfResult {
  let log = state.actionLog.map((entry) => ({ ...entry }));
  let candidateId = "custom";
  let changeText = { en: "made one different choice" };

  if (change.type === "replace_action") {
    log = log.flatMap((entry, i) =>
      i !== change.index ? [entry] : change.action ? [{ ...entry, action: change.action }] : [],
    );
  } else {
    const candidate = content.lifeReport.whatIf.candidates.find((c) => c.id === change.candidateId);
    if (!candidate)
      throw new EngineError("bad_candidate", `unknown what-if candidate ${change.candidateId}`);
    candidateId = candidate.id;
    changeText = candidate.changeText;
    const t = candidate.transform;
    if (t.type === "ignoreScams") {
      log = log.map((e) =>
        e.action.type === "scam_response"
          ? { ...e, action: { ...e.action, response: "ignore" as const } }
          : e,
      );
    } else if (t.type === "startSip") {
      log = log.filter((e) => !(e.action.type === "sip_start" && e.action.optionId === t.optionId));
      log.push({
        turn: t.fromTurn,
        action: {
          type: "sip_start",
          optionId: t.optionId,
          amountPerMonth: rupeesToPaise(t.amountPerMonth),
        },
      });
      log.sort((a, b) => a.turn - b.turn);
    } else {
      // TODO(samarth): moveShare, emergencyFundFirst, holdThroughCrash transforms.
      throw new NotImplementedError(`what-if transform "${t.type}"`);
    }
  }

  const alt = replay(state, log, content);
  const baselineRealValue = state.history.at(-1)?.realValue ?? 0;
  const alternativeRealValue = alt.history.at(-1)?.realValue ?? 0;
  return {
    candidateId,
    changeText,
    baselineRealValue,
    alternativeRealValue,
    difference: alternativeRealValue - baselineRealValue,
    series: state.history.map((h, i) => ({
      turn: h.turn,
      baseline: h.realValue,
      alternative: alt.history[i]?.realValue ?? 0,
    })),
  };
}

/** Replays a chapter from scratch with an action log. Invalid actions in a changed log are skipped. */
export function replay(
  original: GameState,
  log: GameState["actionLog"],
  content: ContentBundle,
): GameState {
  let s = createPlaythrough({
    content,
    personaId: original.personaId,
    seed: original.seed,
    chapterId: original.chapterId,
  });
  const byTurn = (turn: number) => log.filter((e) => e.turn === turn);
  for (let turn = 1; turn <= original.turn; turn++) {
    for (const { action } of byTurn(turn)) {
      if (action.type === "scam_response") continue; // answered after the toss below
      try {
        s = applyAction(s, action, content);
      } catch (err) {
        if (!(err instanceof EngineError)) throw err;
      }
    }
    if (s.status !== "playing") break;
    s = advanceTurn(s, content).state;
    for (const pending of [...s.pendingScams]) {
      const answer = log.find(
        (e) => e.action.type === "scam_response" && e.action.instanceId === pending.instanceId,
      );
      const response = answer?.action.type === "scam_response" ? answer.action.response : "ignore";
      s = applyAction(
        s,
        { type: "scam_response", instanceId: pending.instanceId, response },
        content,
      );
    }
  }
  return s;
}

/** Maps an action or event to the record stored in the `decisions` table (§15.4 C). */
export function toDecisionLog(
  item: Action | GameEvent,
  ctx: { chapterId: string; turn: number },
): DecisionRecord | null {
  const base = { chapterId: ctx.chapterId, turn: ctx.turn };
  switch (item.type) {
    case "invest":
      return { ...base, type: "invest", payload: { optionId: item.optionId, amount: item.amount } };
    case "withdraw":
      return {
        ...base,
        type: "withdraw",
        payload: { optionId: item.optionId, amount: item.amount },
      };
    case "sip_start":
      return {
        ...base,
        type: "sip_start",
        payload: { optionId: item.optionId, amountPerMonth: item.amountPerMonth },
      };
    case "sip_stop":
      return { ...base, type: "sip_stop", payload: { optionId: item.optionId } };
    case "pay_task":
      return { ...base, type: "task_paid", payload: { taskId: item.taskId, amount: item.amount } };
    case "scam_response": {
      // Safe responses in every scam today; content marks `falls` per action if this ever differs.
      const spotted =
        item.response === "ignore" || item.response === "report" || item.response === "ask_friend";
      return {
        ...base,
        type: spotted ? "scam_spotted" : "scam_fallen",
        payload: { instanceId: item.instanceId, response: item.response },
      };
    }
    case "task_missed":
      return { ...base, type: "task_missed", payload: { taskId: item.taskId, fine: item.fine } };
    case "life_event":
      return {
        ...base,
        type: "life_event",
        payload: { eventId: item.eventId, amount: item.amount, coveredBy: item.coveredBy },
      };
    case "market_toss":
      return {
        ...base,
        type: "market_toss",
        payload: { marketState: item.marketState, independent: item.independent },
      };
    case "chapter_complete":
      return { ...base, type: "chapter_end", payload: {} };
    default:
      return null;
  }
}
