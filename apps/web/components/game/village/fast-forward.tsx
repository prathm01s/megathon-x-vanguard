"use client";

import { FastForward } from "lucide-react";
import { useTranslations } from "next-intl";
import { GameButton } from "@/components/ui/game-button";
import { content } from "@/lib/content";
import { formatShort } from "@/lib/format";
import { GAME_TEXT, INK, MUTED, PANEL } from "@/lib/game-style";
import { cn } from "@/lib/utils";
import type { FastForwardSummary } from "../store";
import { useLocalize } from "../use-localize";

/** "N months later": what happened while time flew to the end of the chapter. */
export function FastForwardModal({
  summary,
  unit,
  onContinue,
}: {
  summary: FastForwardSummary;
  unit: "month" | "year";
  onContinue: () => void;
}) {
  const t = useTranslations("village");
  const l = useLocalize();
  const row = (label: string, value: number, sign: "+" | "−" | "±") => (
    <li className="flex items-center justify-between py-1 text-sm font-bold">
      <span>{label}</span>
      <span
        className={cn(
          GAME_TEXT,
          "text-base",
          (sign === "+" || (sign === "±" && value >= 0)) && "text-[#1f8a3b]",
          (sign === "−" || (sign === "±" && value < 0)) && "text-[#c0262d]",
        )}
      >
        {sign === "±" ? (value >= 0 ? "+" : "−") : sign}
        {formatShort(Math.abs(value))}
      </span>
    </li>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-3xl border-[3px] p-4 shadow-2xl"
        style={{ borderColor: INK, background: PANEL, color: INK }}
      >
        <p className={cn(GAME_TEXT, "flex items-center gap-2 text-2xl")}>
          <FastForward className="size-7 text-[#2d7fe0]" aria-hidden />
          {t("ffTitle", { count: summary.turns, unit })}
        </p>
        <ul className="mt-2 divide-y" style={{ borderColor: MUTED }}>
          {row(t("ffIncome"), summary.income, "+")}
          {row(t("ffCosts"), summary.costs, "−")}
          {summary.returns !== 0 && row(t("ffReturns"), summary.returns, "±")}
          {summary.borrowed > 0 && row(t("ffBorrowed"), summary.borrowed, "−")}
          {summary.lifeEvents.map((e, i) => {
            const ev = content.lifeEvents.events.find((x) => x.id === e.eventId);
            return (
              <li key={i} className="flex items-center justify-between py-1 text-sm font-bold">
                <span>{ev ? l(ev.title) : e.eventId}</span>
                {e.amount > 0 && (
                  <span
                    className={cn(
                      GAME_TEXT,
                      "text-base",
                      ev?.type === "good" ? "text-[#1f8a3b]" : "text-[#c0262d]",
                    )}
                  >
                    {ev?.type === "good" ? "+" : "−"}
                    {formatShort(e.amount)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {summary.stoppedForScam && (
          <p className="mt-2 rounded-xl bg-[#fff3b0] p-2 text-sm font-bold">{t("ffScam")}</p>
        )}
        <GameButton
          tone={summary.completed ? "green" : "gold"}
          className="mt-4 w-full"
          onClick={onContinue}
        >
          {summary.completed
            ? t("ffReport")
            : summary.stoppedForScam
              ? t("ffAnswer")
              : t("ffContinue")}
        </GameButton>
      </div>
    </div>
  );
}
