// Maps engine actions and events to the append-only `decisions` table (§15.4 C).
// Prathmesh's statistics views read only these records.
import type { Action, DecisionRecord, GameEvent } from "./types";

const SAFE_SCAM_RESPONSES = new Set(["ignore", "report", "ask_friend"]);

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
    case "scam_response":
      // Safe in every scam today; content marks `falls` per action if this ever differs.
      return {
        ...base,
        type: SAFE_SCAM_RESPONSES.has(item.response) ? "scam_spotted" : "scam_fallen",
        payload: { instanceId: item.instanceId, response: item.response },
      };
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
    case "forced_borrowing":
      return {
        ...base,
        type: "loan_taken",
        payload: {
          lender: "bank",
          forced: true,
          amount: item.amount,
          ratePerYear: item.ratePerYear,
        },
      };
    case "chapter_complete":
      return { ...base, type: "chapter_end", payload: {} };
    default:
      return null;
  }
}
