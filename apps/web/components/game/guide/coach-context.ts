// The game-session summary Meera reads before answering (plain text, no personal data: only
// in-game numbers and choices). Built from the session log, so it works for past sessions too.
import type { ContentBundle, Locale } from "@toss/content";
import { endChapter, replaySession, totalWealth, type GameState } from "@toss/engine";
import { fillPlaceholders, localize } from "@/lib/content";
import { formatShort } from "@/lib/format";
import type { SavedSession } from "../store";
import { describeAction } from "../time-machine/describe";

export function sessionContext(
  session: SavedSession,
  content: ContentBundle,
  locale: Locale,
): string {
  const L = (s: Parameters<typeof localize>[0] | undefined) => (s ? localize(s, locale) : "");
  const chapter = content.chapters.find((c) => c.id === session.chapterId);
  const persona = content.personas.personas.find((p) => p.id === session.personaId);
  const { state, points } = replaySession(session.log, content);
  const unit = chapter?.turnUnit ?? "year";
  const lines: string[] = [];

  lines.push(
    `Chapter: ${L(chapter?.title)} (${chapter?.turns} ${unit}s, age ${chapter?.ageRange.join("-")})`,
    `Money style: ${L(persona?.name)}, level ${L(persona?.difficulty.label)} (${L(persona?.difficulty.summary)})`,
    `Income: ${formatShort((chapter?.income.amountPerMonth ?? 0) * 100)} a month; fixed costs: ${formatShort(
      (chapter?.fixedExpenses.reduce((s, e) => s + e.amountPerMonth, 0) ?? 0) * 100,
    )} a month`,
    "",
    `Timeline (${unit} by ${unit}):`,
  );

  let period = 1;
  let decisions: string[] = [];
  for (const p of points) {
    if (p.step.kind === "act") {
      decisions.push(describeAction(p.step.action, content, session.chapterId, locale));
      continue;
    }
    const market = p.toss
      ? L(content.market.states.find((m) => m.id === p.toss!.marketState)?.label)
      : "";
    const events = p.events
      .map((e) => {
        if (e.type === "life_event") {
          const ev = content.lifeEvents.events.find((x) => x.id === e.eventId);
          return `${L(ev?.title)} (${ev?.type === "good" ? "+" : "-"}${formatShort(e.amount)}, covered by ${e.coveredBy})`;
        }
        if (e.type === "forced_borrowing") return `had to borrow ${formatShort(e.amount)}`;
        if (e.type === "task_missed")
          return `missed task ${e.taskId} (fine ${formatShort(e.fine)})`;
        if (e.type === "scam_offer") return `got a scam offer (${e.scamId})`;
        if (e.type === "cash_lost") return `lost ${formatShort(e.amount)} cash at home`;
        return null;
      })
      .filter(Boolean);
    lines.push(
      `- ${unit} ${period}: choices: ${decisions.length ? decisions.join("; ") : "none"}. Market: ${market}. ${
        events.length ? `Events: ${events.join("; ")}.` : ""
      } Wealth after: ${formatShort(p.wealth)}.`,
    );
    decisions = [];
    period += 1;
  }
  if (decisions.length) lines.push(`- now (not tossed yet): ${decisions.join("; ")}`);

  lines.push("", "Tasks:");
  for (const task of state.tasks) {
    const def = chapter?.tasks.find((d) => d.id === task.taskId);
    lines.push(
      `- ${L(def?.title)} (${def?.kind}, ${def?.required ? "must do" : "optional"}, due ${unit} ${task.dueTurn}): ${task.status}, paid ${formatShort(task.paid)} of ${formatShort(task.amount)}`,
    );
  }

  lines.push("", ...finalPosition(state, content, locale));

  if (state.status === "chapter_complete") {
    const result = endChapter(state, content);
    lines.push(
      "",
      `Financial Health Score: ${result.healthScore}/100 (${result.passed ? "passed" : "not passed"})`,
      `Score parts: ${result.breakdown
        .filter((b) => b.applicable)
        .map((b) => `${b.componentId} ${Math.round(b.points)}/${Math.round(b.weight)}`)
        .join(", ")}`,
      `Did well: ${result.report.didWell.map((i) => fillPlaceholders(L(i.text), i.params)).join(" | ") || "-"}`,
      `Could be better: ${result.report.couldBeBetter.map((i) => fillPlaceholders(L(i.text), i.params)).join(" | ") || "-"}`,
    );
    if (result.report.whatIf) {
      lines.push(
        `Engine's what-if: if they had ${L(result.report.whatIf.changeText)}, about ${formatShort(
          result.report.whatIf.difference,
        )} difference in real value.`,
      );
    }
  } else {
    lines.push("", "The chapter is still in progress.");
  }
  return lines.join("\n");
}

function finalPosition(state: GameState, content: ContentBundle, locale: Locale): string[] {
  const holdings = state.holdings
    .map((h) => {
      const opt = content.options.options.find((o) => o.id === h.optionId);
      return `${opt ? localize(opt.name, locale) : h.optionId} ${formatShort(h.value)} (put in ${formatShort(h.invested)})`;
    })
    .join("; ");
  return [
    `Now: cash ${formatShort(state.cash)}, total wealth ${formatShort(totalWealth(state))} (Real Value ${formatShort(
      Math.round(totalWealth(state) / state.inflationIndex),
    )}), debt ${formatShort(state.debt)}`,
    `Investments: ${holdings || "none"}`,
    `Monthly plans: ${
      state.sips
        .filter((s) => s.stoppedTurn === undefined)
        .map((s) => `${s.optionId} ${formatShort(s.amountPerMonth)}/month`)
        .join("; ") || "none"
    }`,
  ];
}
