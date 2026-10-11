// Turns session steps into short, human labels (shared by the Time Machine and Meera's context).
import type { ContentBundle, Locale } from "@toss/content";
import type { Action } from "@toss/engine";
import { localize } from "@/lib/content";
import { formatShort } from "@/lib/format";

/** One line for a decision, e.g. "Built: Laptop (₹40K)" or "Put ₹5K in Big Bank Savings". */
export function describeAction(
  action: Action,
  content: ContentBundle,
  chapterId: string,
  locale: Locale,
): string {
  const optionName = (id: string) =>
    localize(content.options.options.find((o) => o.id === id)?.name ?? { en: id }, locale);
  switch (action.type) {
    case "pay_task": {
      const task = content.chapters
        .find((c) => c.id === chapterId)
        ?.tasks.find((t) => t.id === action.taskId);
      const name = task ? localize(task.shortTitle ?? task.title, locale) : action.taskId;
      return `Paid ${formatShort(action.amount)} towards: ${name}`;
    }
    case "invest":
      return `Put ${formatShort(action.amount)} in ${optionName(action.optionId)}`;
    case "withdraw":
      return `Took ${formatShort(action.amount)} out of ${optionName(action.optionId)}`;
    case "sip_start":
      return `Started a ${formatShort(action.amountPerMonth)}/month plan in ${optionName(action.optionId)}`;
    case "sip_stop":
      return `Stopped the monthly plan in ${optionName(action.optionId)}`;
    case "scam_response":
      return `Answered a suspicious message: ${action.response.replace(/_/g, " ")}`;
    default:
      // Every action type is handled above; a future type shows its raw name.
      return String((action as { type: string }).type).replace(/_/g, " ");
  }
}

/** Icon key (see components/game/icon.tsx) for a decision. */
export function actionIcon(action: Action): string {
  switch (action.type) {
    case "pay_task":
      return "home";
    case "invest":
    case "sip_start":
      return "trending-up";
    case "withdraw":
    case "sip_stop":
      return "wallet";
    case "scam_response":
      return "shield";
    default:
      return "coins";
  }
}
