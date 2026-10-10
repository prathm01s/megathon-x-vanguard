"use client";

import type { ChapterResult } from "@toss/engine";
import { useTranslations } from "next-intl";
import { GameButton } from "@/components/ui/game-button";
import { GAME_TEXT } from "@/lib/game-style";
import { cn } from "@/lib/utils";
import { useLocalize } from "../use-localize";
import { GuideLine, GuideScene } from "./guide";

/** End of a level: Meera explains what went well and what to do better, then the full report. */
export function GuideInsights({ result, onDone }: { result: ChapterResult; onDone: () => void }) {
  const t = useTranslations("guide");
  const l = useLocalize();
  const good = result.report.didWell.slice(0, 2);
  const better = result.report.couldBeBetter.slice(0, 2);
  return (
    <GuideScene mood={result.passed ? "cheer" : "worried"} label={t("insightsTitle")}>
      <div className="space-y-3">
        <GuideLine>
          {result.passed
            ? t("insightsPassed", { score: result.healthScore })
            : t("insightsNotPassed", { score: result.healthScore })}
        </GuideLine>
        {good.length > 0 && (
          <section>
            <h3 className={cn(GAME_TEXT, "text-base text-[#15803d]")}>👍 {t("didWell")}</h3>
            <ul className="mt-1 space-y-1.5">
              {good.map((item) => (
                <li
                  key={item.ruleId}
                  className="rounded-xl border-2 border-[#16a34a]/30 bg-[#e3f8e8] p-2 text-sm font-semibold"
                >
                  {l(item.text, item.params)}
                </li>
              ))}
            </ul>
          </section>
        )}
        {better.length > 0 && (
          <section>
            <h3 className={cn(GAME_TEXT, "text-base text-[#b45309]")}>💡 {t("couldBeBetter")}</h3>
            <ul className="mt-1 space-y-1.5">
              {better.map((item) => (
                <li
                  key={item.ruleId}
                  className="rounded-xl border-2 border-[#f59e0b]/40 bg-[#fff4d6] p-2 text-sm font-semibold"
                >
                  {l(item.text, item.params)}
                </li>
              ))}
            </ul>
          </section>
        )}
        <GameButton tone="green" className="w-full" onClick={onDone}>
          {t("seeReport")}
        </GameButton>
      </div>
    </GuideScene>
  );
}
