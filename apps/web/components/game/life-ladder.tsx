"use client";

import type { Chapter } from "@toss/content";
import { CheckCircle2, Lock, Play, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { content } from "@/lib/content";
import { cn } from "@/lib/utils";
import { GameGate } from "./game-gate";
import { PersonaAvatar } from "./persona-reveal";
import { startChapterFor, useGameStore } from "./store";
import { useLocalize } from "./use-localize";

/** Groups chapters into rungs; career-choice siblings (ch3a / ch3b) share a rung. */
function ladderRungs(chapters: Chapter[]): Chapter[][] {
  const sorted = [...chapters].sort((a, b) => a.order - b.order);
  const rung = new Map<string, number>();
  for (const c of sorted) {
    if (!rung.has(c.id)) rung.set(c.id, rung.size === 0 ? 0 : Math.max(...rung.values()) + 1);
    const nextIds = c.next === "end" ? [] : typeof c.next === "string" ? [c.next] : c.next.choice;
    for (const id of nextIds) if (!rung.has(id)) rung.set(id, rung.get(c.id)! + 1);
  }
  const rows: Chapter[][] = [];
  for (const c of sorted) (rows[rung.get(c.id)!] ??= []).push(c);
  return rows.filter(Boolean);
}

/** Life Ladder map (§9.2 #8): chapters, locked / unlocked, and the career branch. */
export function LifeLadder() {
  return (
    <GameGate>
      <Ladder />
    </GameGate>
  );
}

function Ladder() {
  const t = useTranslations("ladder");
  const l = useLocalize();
  const personaId = useGameStore((s) => s.personaId);
  const results = useGameStore((s) => s.results);
  const state = useGameStore((s) => s.state);
  const persona = content.personas.personas.find((p) => p.id === personaId);

  const unlocked = new Set<string>();
  const first = startChapterFor(personaId);
  if (first) unlocked.add(first);
  for (const c of content.chapters) {
    if (!results[c.id]?.passed) continue;
    const nextIds = c.next === "end" ? [] : typeof c.next === "string" ? [c.next] : c.next.choice;
    nextIds.forEach((id) => unlocked.add(id));
  }

  const rows = ladderRungs(content.chapters);

  return (
    <section className="flex flex-col gap-4 py-4">
      <header className="flex items-center gap-3">
        {persona && <PersonaAvatar hint={persona.avatarHint} className="size-14 ring-4" />}
        <div>
          <h1 className="text-2xl font-extrabold">{t("title")}</h1>
          {persona && <p className="font-semibold text-muted-foreground">{l(persona.name)}</p>}
        </div>
      </header>
      <p className="text-muted-foreground">{t("subtitle")}</p>

      <ol className="relative flex flex-col gap-4 before:absolute before:inset-y-4 before:start-6 before:w-1 before:rounded-full before:bg-border">
        {rows.map((row, i) => (
          <li key={i} className="relative">
            {row.length > 1 && (
              <p className="mb-2 ps-14 text-sm font-bold text-secondary">{t("choosePath")}</p>
            )}
            <div className={cn("grid gap-3", row.length > 1 && "grid-cols-2 ps-14")}>
              {row.map((c) => (
                <ChapterRung
                  key={c.id}
                  chapter={c}
                  step={i + 1}
                  compact={row.length > 1}
                  unlocked={unlocked.has(c.id)}
                  inProgress={state?.chapterId === c.id && state.status !== "chapter_complete"}
                />
              ))}
            </div>
          </li>
        ))}
      </ol>

      <Link
        href="/mindset/post"
        className="text-center text-sm font-semibold text-primary underline underline-offset-4"
      >
        {t("retakeMindset")}
      </Link>
    </section>
  );
}

function ChapterRung({
  chapter,
  step,
  compact,
  unlocked,
  inProgress,
}: {
  chapter: Chapter;
  step: number;
  compact: boolean;
  unlocked: boolean;
  inProgress: boolean;
}) {
  const t = useTranslations("ladder");
  const l = useLocalize();
  const result = useGameStore((s) => s.results[chapter.id]);
  const playable = chapter.enabled && unlocked;
  const [from, to] = chapter.ageRange;

  return (
    <div className={cn("flex gap-3", compact && "flex-col")}>
      {!compact && (
        <span
          aria-hidden
          className={cn(
            "z-10 grid size-12 shrink-0 place-items-center rounded-full text-lg font-extrabold ring-4 ring-background",
            result?.passed
              ? "bg-gain text-primary-foreground"
              : playable
                ? "bg-coin"
                : "bg-muted text-muted-foreground",
          )}
        >
          {result?.passed ? (
            <CheckCircle2 className="size-6" />
          ) : playable ? (
            step
          ) : (
            <Lock className="size-5" />
          )}
        </span>
      )}
      <Card className={cn("flex-1 space-y-2", !playable && "opacity-70")}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-bold leading-tight">{l(chapter.title)}</h2>
          {!playable && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {chapter.enabled ? t("locked") : t("comingSoon")}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t("age", { from, to })} · {t("turns", { count: chapter.turns, unit: chapter.turnUnit })}
        </p>
        {result && (
          <p className={cn("text-sm font-bold", result.passed ? "text-gain" : "text-primary")}>
            {result.passed
              ? t("passed", { score: result.healthScore })
              : t("notPassed", { score: result.healthScore })}
          </p>
        )}
        {playable &&
          (inProgress ? (
            <Link href="/play" className={cn(buttonVariants(), "w-full")}>
              <Play aria-hidden /> {t("continue")}
            </Link>
          ) : (
            <Link
              href={`/chapter/${chapter.id}`}
              className={cn(buttonVariants({ variant: result ? "outline" : "default" }), "w-full")}
            >
              {result ? <RotateCcw aria-hidden /> : <Play aria-hidden />}
              {result ? t("replay") : t("play")}
            </Link>
          ))}
      </Card>
    </div>
  );
}
