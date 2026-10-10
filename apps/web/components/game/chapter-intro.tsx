"use client";

import { rupeesToPaise } from "@toss/engine";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "@/i18n/navigation";
import { content } from "@/lib/content";
import { GameGate } from "./game-gate";
import { ContentIcon } from "./icon";
import { useGameStore } from "./store";
import { useLocalize, useMoney } from "./use-localize";

/** Chapter intro (§9.2 #9): the life stage, money in and out, to-dos and new options. */
export function ChapterIntro({ chapterId }: { chapterId: string }) {
  return (
    <GameGate>
      <Intro chapterId={chapterId} />
    </GameGate>
  );
}

function Intro({ chapterId }: { chapterId: string }) {
  const t = useTranslations("chapter");
  const tp = useTranslations("play");
  const tm = useTranslations("mindset");
  const l = useLocalize();
  const money = useMoney();
  const router = useRouter();
  const startChapter = useGameStore((s) => s.startChapter);
  const hasPersona = useGameStore((s) => s.personaId !== null);
  const [starting, setStarting] = useState(false);
  const chapter = content.chapters.find((c) => c.id === chapterId);

  if (!chapter?.enabled) {
    return <Card className="mt-6 text-center">{t("notAvailable")}</Card>;
  }
  if (!hasPersona) {
    return (
      <Card className="mt-6 space-y-4 text-center">
        <p>{tm("needPre")}</p>
        <Button onClick={() => router.push("/mindset")}>{tm("start")}</Button>
      </Card>
    );
  }

  const options = chapter.unlockOptions
    .map((id) => content.options.options.find((o) => o.id === id))
    .filter((o) => o !== undefined);

  async function start() {
    setStarting(true);
    await startChapter(chapterId);
    router.push("/play");
  }

  return (
    <section className="flex flex-col gap-4 py-4">
      <header className="space-y-1">
        <p className="text-sm font-bold uppercase tracking-wide text-secondary">
          {l(chapter.stage)} · {chapter.ageRange[0]}–{chapter.ageRange[1]}
        </p>
        <h1 className="text-3xl font-extrabold">{l(chapter.title)}</h1>
      </header>
      <p className="text-lg">{l(chapter.intro)}</p>

      <Card className="space-y-2">
        <p className="font-bold">
          {t("startingBalance", { amount: money(rupeesToPaise(chapter.startingBalance)) })}
        </p>
        <p className="text-gain font-semibold">
          {t("income", {
            label: l(chapter.income.label),
            amount: money(rupeesToPaise(chapter.income.amountPerMonth)),
          })}
        </p>
        <h2 className="pt-1 text-sm font-bold text-muted-foreground">{t("expenses")}</h2>
        <ul className="space-y-1">
          {chapter.fixedExpenses.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <ContentIcon name={e.icon} className="size-4 text-muted-foreground" />
                {l(e.label)}
              </span>
              <span className="font-semibold tabular-nums text-loss">
                {money(rupeesToPaise(e.amountPerMonth))}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-bold">{t("tasks")}</h2>
        <ul className="space-y-2">
          {chapter.tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent">
                <ContentIcon name={task.icon} className="size-4" />
              </span>
              <span className="flex-1 text-sm font-semibold">{l(task.title)}</span>
              <span className="text-xs text-muted-foreground">
                {tp("due", { unit: chapter.turnUnit, turn: task.dueTurn })}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {options.length > 0 && (
        <Card className="space-y-2">
          <h2 className="font-bold">{t("unlocks")}</h2>
          <ul className="flex flex-wrap gap-2">
            {options.map((o) => (
              <li
                key={o.id}
                className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-sm font-semibold"
              >
                <ContentIcon name={o.icon} className="size-4" />
                {l(o.name)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Button size="lg" onClick={start} disabled={starting} className="sticky bottom-4 shadow-lg">
        {starting ? t("starting") : t("start")}
      </Button>
    </section>
  );
}
