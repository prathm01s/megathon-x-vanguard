"use client";

import { allowedOptions, rupeesToPaise } from "@toss/engine";
import { ArrowDownCircle, ArrowUpCircle, Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GameButton } from "@/components/ui/game-button";
import { useRouter } from "@/i18n/navigation";
import { content } from "@/lib/content";
import { formatShort } from "@/lib/format";
import { GAME_TEXT } from "@/lib/game-style";
import { cn } from "@/lib/utils";
import { GameGate } from "./game-gate";
import { ContentIcon } from "./icon";
import { useGameStore } from "./store";
import { useLocalize } from "./use-localize";
import { PlotArt, TownHallArt } from "./village/art";

/** Chapter intro (§9.2 #9), village style: numbers as tiles, tasks as flags, little text. */
export function ChapterIntro({ chapterId }: { chapterId: string }) {
  return (
    <GameGate>
      <Intro chapterId={chapterId} />
    </GameGate>
  );
}

function StatTile({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl border-2 border-b-4 border-[#2b1d12]/60 bg-[#fff8e7] px-1 py-2 text-center text-[#2b1d12]">
      {icon}
      <span className={cn(GAME_TEXT, "text-lg leading-none")}>{value}</span>
      <span className="text-[11px] font-bold leading-tight text-[#6b5a45]">{label}</span>
    </div>
  );
}

function Intro({ chapterId }: { chapterId: string }) {
  const t = useTranslations("chapter");
  const tv = useTranslations("village");
  const tm = useTranslations("mindset");
  const l = useLocalize();
  const router = useRouter();
  const startChapter = useGameStore((s) => s.startChapter);
  const personaId = useGameStore((s) => s.personaId);
  const [starting, setStarting] = useState(false);
  const chapter = content.chapters.find((c) => c.id === chapterId);

  if (!chapter?.enabled) {
    return <Card className="mt-6 text-center">{t("notAvailable")}</Card>;
  }
  if (!personaId) {
    return (
      <Card className="mt-6 space-y-4 text-center">
        <p>{tm("needPre")}</p>
        <Button onClick={() => router.push("/mindset")}>{tm("start")}</Button>
      </Card>
    );
  }

  const persona = content.personas.personas.find((p) => p.id === personaId);
  const level = persona?.difficulty;
  const startCash = rupeesToPaise(chapter.startingBalance) * (1 + (level?.startingBonus ?? 0));
  const costs = chapter.fixedExpenses.reduce((sum, e) => sum + e.amountPerMonth, 0);
  const options = allowedOptions(content, chapterId, personaId).filter(
    (o) => o.category !== "cash",
  );

  async function start() {
    setStarting(true);
    await startChapter(chapterId);
    router.push("/play");
  }

  return (
    <section className="flex flex-col gap-4 py-3">
      <header className="flex items-center gap-3">
        <TownHallArt className="h-20 w-24 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wide text-secondary">
            {tv("townHall", { level: chapter.order })} · {chapter.ageRange[0]}–{chapter.ageRange[1]}
          </p>
          <h1 className={cn(GAME_TEXT, "text-3xl leading-tight")}>{l(chapter.title)}</h1>
        </div>
      </header>

      <p className="rounded-2xl border-2 border-[#2b1d12]/30 bg-white px-3 py-2 text-sm text-[#2b1d12]">
        {l(chapter.intro)}
      </p>

      <div className="grid grid-cols-3 gap-2">
        <StatTile
          icon={<Coins className="size-6 text-[#d4a017]" aria-hidden />}
          value={formatShort(startCash)}
          label={t("tileStart")}
        />
        <StatTile
          icon={<ArrowUpCircle className="size-6 text-[#1f8a3b]" aria-hidden />}
          value={formatShort(rupeesToPaise(chapter.income.amountPerMonth))}
          label={t("tileIncome")}
        />
        <StatTile
          icon={<ArrowDownCircle className="size-6 text-[#c0262d]" aria-hidden />}
          value={formatShort(rupeesToPaise(costs))}
          label={t("tileCosts")}
        />
      </div>

      {level && (
        <div className="rounded-2xl border-2 border-[#2b1d12]/60 bg-[#efe6ff] p-3 text-[#2b1d12]">
          <p className={cn(GAME_TEXT, "text-lg leading-tight")}>
            <span className="text-[#d4a017]" aria-hidden>
              {"★".repeat(level.stars)}
              {"☆".repeat(4 - level.stars)}
            </span>{" "}
            {t("yourLevel", { level: l(level.label) })}
          </p>
          <p className="text-sm">{l(level.summary)}</p>
          {options.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t("unlocks")}>
              {options.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center gap-1 rounded-full border border-[#2b1d12]/30 bg-white px-2 py-0.5 text-xs font-bold"
                >
                  <ContentIcon name={o.icon} className="size-3.5" />
                  {l(o.name)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="rounded-3xl border-[3px] border-[#2b1d12]/70 bg-[#6cbf4a] p-3">
        <p className={cn(GAME_TEXT, "mb-1 text-white drop-shadow-[0_1px_0_rgb(43_29_18)]")}>
          {t("toBuild", { count: chapter.tasks.length })}
        </p>
        <ul className="grid grid-cols-3 gap-1">
          {chapter.tasks.map((task) => (
            <li key={task.id} className="flex flex-col items-center">
              <PlotArt stage="flag" kind={task.kind} className="h-12 w-full" />
              <span className="w-full truncate text-center text-[11px] font-extrabold text-white drop-shadow-[0_1px_0_rgb(43_29_18)]">
                {l(task.shortTitle ?? task.title)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <GameButton
        tone="gold"
        className="sticky bottom-4 w-full"
        onClick={start}
        disabled={starting}
      >
        {starting ? t("starting") : t("startVillage")}
      </GameButton>
    </section>
  );
}
