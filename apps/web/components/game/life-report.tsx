"use client";

import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import { content } from "@/lib/content";
import { formatPaise } from "@/lib/format";
import type { ChapterResult } from "@toss/engine";
import { GameGate } from "./game-gate";
import { ContentIcon } from "./icon";
import { useGameStore } from "./store";
import { useLocalize } from "./use-localize";

export function LifeReportScreen() {
  return (
    <GameGate>
      <ReportContent />
    </GameGate>
  );
}

function ReportContent() {
  const t = useTranslations("result");
  const l = useLocalize();
  const router = useRouter();

  const state = useGameStore((s) => s.state);
  const results = useGameStore((s) => s.results);
  const startChapter = useGameStore((s) => s.startChapter);

  const chapterId = state?.chapterId ?? "ch2-first-job";
  const result: ChapterResult | undefined = results[chapterId];

  // Gyaan Check answered states
  const [gyaanAnswers, setGyaanAnswers] = useState<Record<string, string>>({});

  if (!result) {
    return (
      <Card className="mt-8 space-y-4 text-center p-6">
        <p className="text-muted-foreground">No completed chapter report available.</p>
        <Button onClick={() => router.push("/ladder")}>Go to Life Ladder</Button>
      </Card>
    );
  }

  const chapter = content.chapters.find((c) => c.id === result.chapterId);

  const gyaanQuestions = content.gyaan.questions.filter((q) =>
    result.report.gyaanQuestionIds.includes(q.id),
  );

  async function handleReplay() {
    await startChapter(chapterId);
    router.push("/play");
  }

  return (
    <div className="flex flex-col gap-5 py-4 pb-12">
      {/* Header & Financial Health Score */}
      <Card className="space-y-4 border-2 border-border p-5 text-center shadow-lg">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {chapter ? l(chapter.title) : result.chapterId} · {t("title")}
          </p>
          <h1 className="text-3xl font-black text-foreground">
            {result.passed ? "🎉 Congratulations!" : "Keep Going!"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {result.passed ? t("passed") : t("notPassed")}
          </p>
        </div>

        {/* Big Health Score Badge */}
        <div className="mx-auto flex size-32 flex-col items-center justify-center rounded-full bg-accent/60 border-4 border-primary/40 shadow-inner">
          <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
            Health Score
          </span>
          <span className="text-4xl font-extrabold tabular-nums text-foreground">
            {result.healthScore}
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground">/ 100</span>
        </div>

        {/* Score Component Breakdown */}
        <div className="space-y-2 border-t border-border/80 pt-3 text-start">
          <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
            {t("scoreBreakdown")}
          </h2>
          <div className="space-y-1.5">
            {/* Only parts that count (e.g. Trust Score is multiplayer-only); weights are
                redistributed by the engine, so round them for display. */}
            {result.breakdown
              .filter((b) => b.applicable)
              .map((b) => {
                const compDef = content.healthScore.components.find((c) => c.id === b.componentId);
                return (
                  <div key={b.componentId} className="space-y-0.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{compDef ? l(compDef.label) : b.componentId}</span>
                      <span className="tabular-nums">
                        {Math.round(b.points)} / {Math.round(b.weight)} pts
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, Math.round(b.fraction * 100))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </Card>

      {/* Persona Shift Celebration if applicable */}
      {result.personaShift && (
        <Card className="space-y-2 border-2 border-gain/40 bg-gain/5 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-gain font-extrabold text-sm">
            <Sparkles className="size-5" />
            <span>{t("personaShift")}</span>
          </div>
          <p className="text-sm font-semibold">
            {l(
              content.personas.shiftRules.find((r) => r.id === result.personaShift?.ruleId)
                ?.message,
            )}
          </p>
        </Card>
      )}

      {/* Did Well Items */}
      {result.report.didWell.length > 0 && (
        <Card className="space-y-3 p-4 border-gain/30">
          <div className="flex items-center gap-2 text-gain font-extrabold text-sm">
            <CheckCircle2 className="size-5" />
            <h2>{t("didWell")}</h2>
          </div>
          <ul className="space-y-2 text-xs">
            {result.report.didWell.map((item, i) => (
              <li
                key={i}
                className="rounded-lg bg-gain/5 border border-gain/20 p-2.5 font-medium leading-relaxed"
              >
                {l(item.text, item.params)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Could Be Better Items */}
      {result.report.couldBeBetter.length > 0 && (
        <Card className="space-y-3 p-4 border-primary/30">
          <div className="flex items-center gap-2 text-primary font-extrabold text-sm">
            <AlertTriangle className="size-5" />
            <h2>{t("couldBeBetter")}</h2>
          </div>
          <ul className="space-y-2 text-xs">
            {result.report.couldBeBetter.map((item, i) => (
              <li
                key={i}
                className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 font-medium leading-relaxed"
              >
                {l(item.text, item.params)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* "What If" Counterfactual Replay */}
      {result.report.whatIf && (
        <Card className="space-y-3 p-4 border-secondary/40 bg-secondary/5">
          <div className="flex items-center gap-2 text-secondary font-extrabold text-sm">
            <TrendingUp className="size-5" />
            <h2>{t("whatIf")}</h2>
          </div>
          <p className="text-xs leading-relaxed font-medium">
            {result.report.whatIf.difference >= 0
              ? t("whatIfText", {
                  change: l(result.report.whatIf.changeText),
                  difference: formatPaise(result.report.whatIf.difference),
                })
              : t("whatIfWorse", {
                  change: l(result.report.whatIf.changeText),
                  difference: formatPaise(Math.abs(result.report.whatIf.difference)),
                })}
          </p>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-card p-2 shadow-sm border border-border">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Your choice
              </span>
              <p className="text-sm font-bold mt-0.5">
                {formatPaise(result.report.whatIf.baselineRealValue)}
              </p>
            </div>
            <div className="rounded-lg bg-card p-2 shadow-sm border border-secondary/40">
              <span className="text-[10px] text-secondary uppercase font-semibold">
                Alternative path
              </span>
              <p className="text-sm font-bold text-secondary mt-0.5">
                {formatPaise(result.report.whatIf.alternativeRealValue)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Badges Earned */}
      {result.badgesEarned.length > 0 && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-2 font-extrabold text-sm text-foreground">
            <Award className="size-5 text-coin" />
            <h2>Badges Earned</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {result.badgesEarned.map((badgeId) => {
              const b = content.badges.badges.find((x) => x.id === badgeId);
              if (!b) return null;
              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-border p-2.5 flex items-center gap-2.5 text-xs bg-accent/20"
                >
                  <span className="grid size-8 place-items-center rounded-lg bg-coin text-foreground shrink-0 shadow-sm">
                    <ContentIcon name={b.icon} className="size-4" />
                  </span>
                  <div>
                    <p className="font-bold leading-tight">{l(b.title)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      {l(b.description)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Gyaan Check (Interactive mini-quiz) */}
      {gyaanQuestions.length > 0 && (
        <Card className="space-y-4 p-4">
          <div className="flex items-center gap-2 font-extrabold text-sm">
            <HelpCircle className="size-5 text-secondary" />
            <h2>Gyaan Check</h2>
          </div>
          <div className="space-y-4">
            {gyaanQuestions.map((q, idx) => {
              const chosen = gyaanAnswers[q.id];
              const isAnswered = Boolean(chosen);
              const isCorrect = chosen === q.correctOptionId;

              return (
                <div
                  key={q.id}
                  className="space-y-2 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                >
                  <p className="text-xs font-bold leading-snug">
                    {idx + 1}. {l(q.prompt)}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {q.options.map((opt) => {
                      const isOptionSelected = chosen === opt.id;
                      const isOptionCorrect = opt.id === q.correctOptionId;

                      let btnStyle = "border-border bg-card";
                      if (isAnswered) {
                        if (isOptionCorrect)
                          btnStyle = "border-gain bg-gain/10 text-gain font-bold";
                        else if (isOptionSelected)
                          btnStyle = "border-loss bg-loss/10 text-loss font-bold";
                      }

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={isAnswered}
                          onClick={() => setGyaanAnswers({ ...gyaanAnswers, [q.id]: opt.id })}
                          className={`rounded-lg border p-2 text-start text-xs font-medium transition-colors ${btnStyle}`}
                        >
                          {l(opt.label)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback explanation after selection */}
                  {isAnswered && (
                    <div
                      className={`rounded-lg p-2.5 text-xs font-medium space-y-1 ${
                        isCorrect ? "bg-gain/10 text-gain" : "bg-primary/10 text-primary"
                      }`}
                    >
                      <p className="font-bold">{isCorrect ? "✓ Correct!" : "Review:"}</p>
                      <p className="text-muted-foreground">{l(q.explanation)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-col gap-2 pt-2">
        {/* Next chapter / career choice or ladder */}
        <Link href="/ladder" className="w-full">
          <Button size="lg" className="w-full font-extrabold shadow-md">
            {t("backToLadder")} <ChevronRight className="size-5" />
          </Button>
        </Link>

        <Button size="lg" variant="outline" className="w-full font-bold" onClick={handleReplay}>
          <RotateCcw className="size-4" /> {t("replay")}
        </Button>
      </div>
    </div>
  );
}
