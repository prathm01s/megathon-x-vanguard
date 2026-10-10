// Task list: due turns, payments, fines, consequences, inflation adjustment (§7.3, §8.8).
import type { Chapter, ContentBundle, InvestmentOption } from "@toss/content";
import { payOut } from "./cashflow";
import { monthlyExpensesFor } from "./economy";
import { EngineError } from "./errors";
import { rupeesToPaise } from "./money";
import { buy } from "./portfolio";
import type { CarryOver, GameEvent, GameState, Paise, TaskState } from "./types";

/** Builds the chapter's task list, blocking one goal if the previous chapter said so. */
export function initTasks(chapter: Chapter, carriedIn: CarryOver): TaskState[] {
  const monthly = monthlyExpensesFor(chapter, 1);
  let blockedOne = false;
  return chapter.tasks.map((t): TaskState => {
    const blockedAsNextGoal =
      carriedIn.blockNextChapterGoal && !blockedOne && t.kind === "goal" && !t.required;
    if (blockedAsNextGoal) blockedOne = true;
    const blocked = blockedAsNextGoal || carriedIn.blockedTaskIds.includes(t.id);
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
}

function salaryBonusOf(consequence: string | undefined): number {
  const m = consequence?.match(/^salaryBonus:(.+)$/);
  return m ? Number(m[1]) : 0;
}

/**
 * Pays towards a task from the wallet. A `safety` task isn't spending: the money moves
 * into the emergency-fund option (`economy.emergencyFundOptionId`) and stays the player's.
 */
export function payTask(
  state: GameState,
  taskId: string,
  amount: Paise,
  chapter: Chapter,
  content: ContentBundle,
  options: Map<string, InvestmentOption>,
): void {
  const task = state.tasks.find((t) => t.taskId === taskId);
  if (!task || (task.status !== "open" && task.status !== "late")) {
    throw new EngineError("bad_task", `task ${taskId} is not payable`);
  }
  const pay = Math.min(amount, task.amount - task.paid);
  if (pay <= 0 || pay > state.cash) throw new EngineError("insufficient_cash", "not enough cash");
  const def = chapter.tasks.find((d) => d.id === taskId);

  state.cash -= pay;
  task.paid += pay;
  if (def?.kind === "safety") {
    const fund = options.get(content.economy.emergencyFundOptionId);
    if (fund) buy(state, fund, pay);
  }
  if (task.paid >= task.amount) {
    // A task already marked late stays "late" for scoring, but is settled.
    task.status = task.status === "late" ? "late" : "done";
    task.completedTurn = state.turn + 1;
    const bonus = salaryBonusOf(def?.onCompleteConsequence);
    if (bonus) {
      state.incomePerMonth = Math.round(state.incomePerMonth * (1 + bonus));
      state.carryOver.salaryBonusRate += bonus;
    }
  }
}

/** `blockGoal:<id>` blocks that task now if it's in this chapter, otherwise in a later one. */
function applyMissConsequence(state: GameState, consequence: string | undefined): void {
  if (consequence === "blockNextChapterGoal") {
    state.carryOver.blockNextChapterGoal = true;
    return;
  }
  const target = consequence?.match(/^blockGoal:(.+)$/)?.[1];
  if (!target) return;
  const here = state.tasks.find((t) => t.taskId === target);
  if (here && here.status === "open") here.status = "blocked";
  else if (!here) state.carryOver.blockedTaskIds.push(target);
}

/** Inflation-adjusted open tasks cost more as prices rise. */
export function inflateOpenTasks(state: GameState, chapter: Chapter, rate: number): void {
  for (const t of state.tasks) {
    const def = chapter.tasks.find((d) => d.id === t.taskId);
    if (def?.inflationAdjusted && t.status === "open") t.amount = Math.round(t.amount * (1 + rate));
  }
}

/** Marks tasks that reached their due turn unpaid: fine, status, and consequences. */
export function processDueTasks(
  state: GameState,
  chapter: Chapter,
  content: ContentBundle,
  options: Map<string, InvestmentOption>,
  events: GameEvent[],
): void {
  for (const t of state.tasks) {
    if (t.status !== "open" || t.dueTurn !== state.turn) continue;
    const def = chapter.tasks.find((d) => d.id === t.taskId);
    if (!def) continue;
    events.push({ type: "task_due", taskId: t.taskId });
    const fine = rupeesToPaise(def.lateFine);
    if (fine > 0) payOut(state, fine, content, options, events);
    t.status = def.required ? "late" : "missed";
    applyMissConsequence(state, def.consequence);
    events.push({ type: "task_missed", taskId: t.taskId, fine });
  }
}
