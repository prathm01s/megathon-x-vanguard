// The decide phase (§7.1 step 3): what the player can do now, and doing it.
import type { ContentBundle } from "@toss/content";
import { EngineError } from "./errors";
import { respondToScam } from "./events";
import { clone, getChapter, optionMap, unlockedOptions } from "./helpers";
import { rupeesToPaise } from "./money";
import { buy, isLocked, sell, withdrawalPenalty } from "./portfolio";
import { payTask } from "./tasks";
import type { Action, ActionOption, GameState } from "./types";

/** Counts money saved or invested against a windfall that is still waiting to be saved. */
function allocateWindfall(state: GameState, amount: number): void {
  const open = state.stats.windfallUnallocated ?? 0;
  const saved = Math.min(open, Math.max(0, amount));
  state.stats.windfallSaved += saved;
  state.stats.windfallUnallocated = open - saved;
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
    out.push({
      type: "pay_task",
      targetId: t.taskId,
      label: def.title,
      minAmount: 1,
      maxAmount: Math.min(t.amount - t.paid, state.cash),
      ...(state.cash <= 0 ? { disabledReason: "insufficient_cash" as const } : {}),
    });
  }

  const lastToss = state.tosses.at(-1);
  for (const o of unlockedOptions(content, state.chapterId)) {
    if (o.category === "cash") continue; // the wallet *is* cash
    const min = rupeesToPaise(o.minAmount);
    if (!o.monthlyDepositOnly) {
      out.push({
        type: "invest",
        targetId: o.id,
        label: o.name,
        minAmount: min,
        maxAmount: state.cash,
        ...(o.riskLevel >= 4 ? { warning: "high_risk" as const } : {}),
        ...(state.cash < Math.max(min, 1) ? { disabledReason: "insufficient_cash" as const } : {}),
      });
    }
    const holding = state.holdings.find((h) => h.optionId === o.id);
    if (holding && holding.value > 0) {
      out.push({
        type: "withdraw",
        targetId: o.id,
        label: o.name,
        minAmount: 1,
        maxAmount: holding.value,
        ...(isLocked(state, holding)
          ? {
              warning: "early_break_penalty" as const,
              penalty: withdrawalPenalty(state, holding, o, holding.value),
            }
          : o.liquidity === "market" && lastToss?.marketState === "crash"
            ? { warning: "selling_in_storm" as const }
            : o.liquidity === "market" && holding.value < holding.invested
              ? { warning: "below_cost" as const }
              : {}),
      });
    }
    // SIPs, and recurring deposits (monthly-only options) use the same monthly instalment.
    if (o.sipAllowed || o.monthlyDepositOnly) {
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
  if (state.status === "chapter_complete") {
    throw new EngineError("chapter_complete", "chapter is over");
  }
  if (state.status === "awaiting_scam_response" && action.type !== "scam_response") {
    throw new EngineError("scam_pending", "answer the scam card first");
  }
  const next = clone(state);
  const options = optionMap(content);
  const chapter = getChapter(content, state.chapterId);

  switch (action.type) {
    case "pay_task": {
      const paidBefore = next.tasks.find((t) => t.taskId === action.taskId)?.paid ?? 0;
      payTask(next, action.taskId, action.amount, chapter, content, options);
      if (chapter.tasks.find((t) => t.id === action.taskId)?.kind === "safety") {
        const paid = (next.tasks.find((t) => t.taskId === action.taskId)?.paid ?? 0) - paidBefore;
        allocateWindfall(next, paid);
      }
      break;
    }
    case "invest": {
      const opt = options.get(action.optionId);
      if (!opt) throw new EngineError("bad_option", `unknown option ${action.optionId}`);
      if (opt.monthlyDepositOnly) throw new EngineError("monthly_only", "use a monthly deposit");
      if (action.amount <= 0 || action.amount > next.cash) {
        throw new EngineError("insufficient_cash", "not enough cash");
      }
      if (action.amount < rupeesToPaise(opt.minAmount)) {
        throw new EngineError("below_min", "below minimum amount");
      }
      next.cash -= action.amount;
      buy(next, opt, action.amount);
      allocateWindfall(next, action.amount);
      break;
    }
    case "withdraw": {
      const opt = options.get(action.optionId);
      const holding = next.holdings.find((h) => h.optionId === action.optionId);
      if (!opt || !holding) throw new EngineError("bad_withdraw", "nothing to withdraw");
      if (isLocked(next, holding) && opt.category === "deposit") next.stats.fdBrokenEarly = true;
      if (opt.liquidity === "market" && state.tosses.at(-1)?.marketState === "crash") {
        next.stats.soldDuringCrash = true;
      }
      next.cash += sell(next, opt, action.amount).received;
      break;
    }
    case "sip_start": {
      const opt = options.get(action.optionId);
      if (!opt || !(opt.sipAllowed || opt.monthlyDepositOnly)) {
        throw new EngineError("bad_option", "monthly investing not allowed for this option");
      }
      if (next.sips.some((s) => s.optionId === opt.id && s.stoppedTurn === undefined)) {
        throw new EngineError("already_running", "SIP already running");
      }
      if (action.amountPerMonth < Math.max(rupeesToPaise(opt.minAmount), 1)) {
        throw new EngineError("below_min", "below minimum amount");
      }
      next.sips.push({
        optionId: opt.id,
        amountPerMonth: action.amountPerMonth,
        startedTurn: state.turn + 1,
      });
      break;
    }
    case "sip_stop": {
      const sip = next.sips.find(
        (s) => s.optionId === action.optionId && s.stoppedTurn === undefined,
      );
      if (!sip) throw new EngineError("bad_option", "no running SIP");
      sip.stoppedTurn = state.turn + 1;
      break;
    }
    case "scam_response": {
      respondToScam(next, action.instanceId, action.response, content);
      if (next.pendingScams.length === 0) {
        next.status = next.turn >= next.totalTurns ? "chapter_complete" : "playing";
      }
      break;
    }
  }
  next.actionLog.push({ turn: state.turn + 1, action });
  return next;
}
