"use client";

import { scoreMindset, type MindsetAnswers } from "@toss/engine";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "@/i18n/navigation";
import { content } from "@/lib/content";
import { cn } from "@/lib/utils";
import { GameGate, ProgressDots } from "./game-gate";
import { ContentIcon } from "./icon";
import { useGameStore } from "./store";
import { useLocalize } from "./use-localize";

/**
 * Money Mindset Check (§8.2, §9.2 #6 and #18): six cards, one per screen, with progress dots.
 * The pre-check never shows `insight` text, so it doesn't teach the answers.
 */
export function MindsetCheck({ phase }: { phase: "pre" | "post" }) {
  return (
    <GameGate>
      <MindsetFlow phase={phase} />
    </GameGate>
  );
}

function MindsetFlow({ phase }: { phase: "pre" | "post" }) {
  const t = useTranslations("mindset");
  const tc = useTranslations("common");
  const l = useLocalize();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const completeMindset = useGameStore((s) => s.completeMindset);
  const hasPre = useGameStore((s) => s.pre !== null);
  const questions = content.mindset.questions;

  const [step, setStep] = useState(-1); // -1 = intro
  const [answers, setAnswers] = useState<MindsetAnswers>({});

  if (phase === "post" && !hasPre) {
    return (
      <Card className="mt-6 space-y-4 text-center">
        <p>{t("needPre")}</p>
        <Button onClick={() => router.push("/mindset")}>{t("start")}</Button>
      </Card>
    );
  }

  const question = questions[step];
  const isLast = step === questions.length - 1;

  function choose(optionId: string) {
    if (!question) return;
    const next = { ...answers, [question.id]: optionId };
    setAnswers(next);
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    const result = scoreMindset(next, content);
    completeMindset(phase, next, result);
    router.push(phase === "pre" ? "/persona" : "/mindset/changes");
  }

  if (!question) {
    return (
      <section className="flex flex-1 flex-col justify-center gap-6 py-6 text-center">
        <div
          aria-hidden
          className="mx-auto grid size-20 place-items-center rounded-full bg-coin text-3xl font-extrabold shadow-lg ring-8 ring-coin/30"
        >
          ?
        </div>
        <h1 className="text-2xl font-extrabold">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">
          {phase === "pre" ? t("intro") : t("postIntro")}
        </p>
        <Button size="lg" onClick={() => setStep(0)}>
          {t("start")}
        </Button>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-5 py-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          aria-label={tc("back")}
          onClick={() => setStep(step - 1)}
        >
          <ArrowLeft className="rtl:rotate-180" />
        </Button>
        <p className="text-sm font-semibold text-muted-foreground" aria-live="polite">
          {t("progress", { current: step + 1, total: questions.length })}
        </p>
        <span className="size-11" aria-hidden />
      </div>
      <ProgressDots total={questions.length} current={step} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={question.id}
          initial={reduceMotion ? false : { opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -40 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-4"
        >
          <h1 className="text-xl font-bold leading-snug">{l(question.prompt)}</h1>
          <ul className="flex flex-col gap-3" role="list">
            {question.options.map((o) => {
              const selected = answers[question.id] === o.id;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => choose(o.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 rounded-xl border-2 bg-card p-4 text-start text-base font-semibold shadow-sm transition-colors",
                      "hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected ? "border-primary bg-primary/10" : "border-border",
                    )}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent">
                      <ContentIcon name={o.icon} className="size-5" />
                    </span>
                    {l(o.label)}
                  </button>
                </li>
              );
            })}
          </ul>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
