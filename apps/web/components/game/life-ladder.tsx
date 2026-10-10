"use client";

import type { Chapter } from "@toss/content";
import { Lock, Play, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { GameButton } from "@/components/ui/game-button";
import { Link, useRouter } from "@/i18n/navigation";
import { content } from "@/lib/content";
import { GAME_TEXT, INK, PANEL } from "@/lib/game-style";
import { cn } from "@/lib/utils";
import { GameGate } from "./game-gate";
import { PersonaAvatar } from "./persona-reveal";
import { startChapterFor, useGameStore } from "./store";
import { useLocalize } from "./use-localize";
import { LevelScene } from "./village/scenes";

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

/** 0–3 stars from a chapter score: pass = 1, 75+ = 2, 90+ = 3. */
function starsFor(result: { passed: boolean; healthScore: number } | undefined): number {
  if (!result?.passed) return 0;
  return result.healthScore >= 90 ? 3 : result.healthScore >= 75 ? 2 : 1;
}

/** The level map (§9.2 #8): one picture card per life stage, locked ahead, stars behind. */
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
  const saved = useGameStore((s) => s.savedChapters);
  const state = useGameStore((s) => s.state);
  const persona = content.personas.personas.find((p) => p.id === personaId);

  const unlocked = new Set<string>();
  const first = startChapterFor(personaId);
  if (first) unlocked.add(first);
  for (const c of content.chapters) {
    if (!results[c.id]?.passed && !saved[c.id]?.passed) continue;
    unlocked.add(c.id); // a passed chapter can always be replayed
    const nextIds = c.next === "end" ? [] : typeof c.next === "string" ? [c.next] : c.next.choice;
    nextIds.forEach((id) => unlocked.add(id));
  }

  const rows = ladderRungs(content.chapters);
  const level = persona?.difficulty;

  return (
    <section className="flex flex-col gap-3 py-3 pb-28">
      <header className="flex items-center gap-3">
        {persona && <PersonaAvatar hint={persona.avatarHint} className="size-14 ring-4" />}
        <div className="min-w-0">
          <h1 className={cn(GAME_TEXT, "text-2xl leading-tight")}>{t("title")}</h1>
          {persona && level && (
            <p className="text-sm font-bold text-muted-foreground">
              <span className="text-[#d4a017]" aria-hidden>
                {"★".repeat(level.stars)}
                {"☆".repeat(4 - level.stars)}
              </span>{" "}
              {l(persona.name)} · {l(level.label)}
            </p>
          )}
        </div>
      </header>

      <ol className="flex flex-col items-stretch">
        {rows.map((row, i) => (
          <li key={i} className="flex flex-col items-stretch">
            {i > 0 && (
              <div aria-hidden className="mx-auto h-6 border-l-4 border-dashed border-[#94a3b8]" />
            )}
            {row.length > 1 && (
              <p className={cn(GAME_TEXT, "mb-1 text-center text-base text-secondary")}>
                {t("choosePath")}
              </p>
            )}
            <div className={cn("grid gap-3", row.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
              {row.map((c) => (
                <LevelCard
                  key={c.id}
                  chapter={c}
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
        className="mt-2 text-center text-sm font-semibold text-primary underline underline-offset-4"
      >
        {t("retakeMindset")}
      </Link>
    </section>
  );
}

function LevelCard({
  chapter,
  compact,
  unlocked,
  inProgress,
}: {
  chapter: Chapter;
  compact: boolean;
  unlocked: boolean;
  inProgress: boolean;
}) {
  const t = useTranslations("ladder");
  const tv = useTranslations("village");
  const l = useLocalize();
  const router = useRouter();
  const local = useGameStore((s) => s.results[chapter.id]);
  const saved = useGameStore((s) => s.savedChapters[chapter.id]);
  const result = local ?? saved;
  const playable = chapter.enabled && unlocked;
  const stars = starsFor(result);
  const [from, to] = chapter.ageRange;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-3xl border-[3px] shadow-md",
        !playable && "opacity-75 grayscale",
      )}
      style={{ borderColor: INK, background: PANEL, color: INK }}
    >
      <div className="relative">
        <LevelScene
          scene={chapter.scene}
          className={cn("block w-full", compact ? "h-24" : "h-32")}
        />
        <span
          className={cn(
            GAME_TEXT,
            "absolute start-2 top-2 rounded-full border-2 bg-[#7c3aed] px-2 text-sm text-white",
          )}
          style={{ borderColor: INK }}
        >
          {tv("townHall", { level: chapter.order })}
        </span>
        {stars > 0 && (
          <span
            className="absolute end-2 top-2 rounded-full border-2 bg-white px-1.5 text-base leading-6"
            style={{ borderColor: INK }}
            aria-label={t("passed", { score: result?.healthScore ?? 0 })}
          >
            <span className="text-[#f5a524]">{"★".repeat(stars)}</span>
            <span className="text-[#cbd5e1]">{"★".repeat(3 - stars)}</span>
          </span>
        )}
        {!playable && (
          <span className="absolute inset-0 grid place-items-center">
            <span
              className="grid size-12 place-items-center rounded-full border-[3px] bg-white"
              style={{ borderColor: INK }}
            >
              <Lock
                className="size-6"
                aria-label={chapter.enabled ? t("locked") : t("comingSoon")}
              />
            </span>
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className={cn(GAME_TEXT, "truncate", compact ? "text-base" : "text-xl")}>
            {l(chapter.title)}
          </h2>
          <span className="shrink-0 text-xs font-bold text-[#55658a]">
            {from}–{to}
          </span>
        </div>
        {playable && (
          <GameButton
            tone={inProgress ? "gold" : result ? "stone" : "green"}
            className={cn("w-full", compact ? "min-h-11 text-base" : "min-h-12")}
            onClick={() => router.push(inProgress ? "/play" : `/chapter/${chapter.id}`)}
          >
            {result && !inProgress ? <RotateCcw aria-hidden /> : <Play aria-hidden />}
            {inProgress ? t("continue") : result ? t("replay") : t("play")}
          </GameButton>
        )}
      </div>
    </article>
  );
}
