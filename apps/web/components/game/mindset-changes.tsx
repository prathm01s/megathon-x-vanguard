"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { content } from "@/lib/content";
import { cn } from "@/lib/utils";
import { GameGate } from "./game-gate";
import { ContentIcon } from "./icon";
import { useGameStore } from "./store";
import { useLocalize } from "./use-localize";

/**
 * "How your answers changed" (§9.2 #18): pre vs. post answers per question, with the
 * `insight` text that the pre-check deliberately hid.
 */
export function MindsetChanges() {
  return (
    <GameGate>
      <Changes />
    </GameGate>
  );
}

function Changes() {
  const t = useTranslations("mindsetChanges");
  const tm = useTranslations("mindset");
  const tr = useTranslations("result");
  const l = useLocalize();
  const pre = useGameStore((s) => s.pre);
  const post = useGameStore((s) => s.post);

  if (!pre || !post) {
    return (
      <Card className="mt-6 space-y-4 text-center">
        <p>{tm("needPre")}</p>
        <Link href={pre ? "/mindset/post" : "/mindset"} className={buttonVariants()}>
          {tm("start")}
        </Link>
      </Card>
    );
  }

  const traits = ["plan", "risk", "know"] as const;
  const max = content.mindset.traitMax;

  return (
    <section className="flex flex-col gap-4 py-4">
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>

      <Card className="space-y-3">
        <h2 className="font-bold">{t("scores")}</h2>
        {traits.map((trait) => (
          <div key={trait} className="space-y-1">
            <div className="flex justify-between text-sm font-semibold">
              <span>{t(trait)}</span>
              <span className="tabular-nums">
                {pre.result.scores[trait]} → {post.result.scores[trait]} / {max[trait]}
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-muted">
              <div
                className="absolute inset-y-0 start-0 rounded-full bg-border"
                style={{ width: `${(pre.result.scores[trait] / max[trait]) * 100}%` }}
              />
              <div
                className="absolute inset-y-0 start-0 rounded-full bg-secondary/80"
                style={{ width: `${(post.result.scores[trait] / max[trait]) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </Card>

      <ol className="flex flex-col gap-3">
        {content.mindset.questions.map((q) => {
          const before = q.options.find((o) => o.id === pre.answers[q.id]);
          const after = q.options.find((o) => o.id === post.answers[q.id]);
          if (!after) return null;
          // Plan and knowledge points mean "grew"; risk points are a style, not better or worse.
          const points = (o: typeof after | undefined) =>
            (o?.points.plan ?? 0) + (o?.points.know ?? 0);
          const improved = before && after.id !== before.id && points(after) > points(before);
          return (
            <li key={q.id}>
              <Card className="space-y-3">
                <p className="font-semibold">{l(q.prompt)}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex-1 rounded-lg bg-muted p-2">
                    <span className="block text-xs text-muted-foreground">{t("before")}</span>
                    {before ? l(before.label) : "—"}
                  </span>
                  <ArrowRight aria-hidden className="size-4 shrink-0 rtl:rotate-180" />
                  <span className="flex-1 rounded-lg bg-secondary/10 p-2">
                    <span className="block text-xs text-muted-foreground">{t("after")}</span>
                    {l(after.label)}
                  </span>
                </div>
                {improved && (
                  <p className="flex items-center gap-1 text-sm font-bold text-gain">
                    <Sparkles aria-hidden className="size-4" /> {t("improved")}
                  </p>
                )}
                <p className="flex gap-2 text-sm text-muted-foreground">
                  <ContentIcon name={after.icon} className="mt-0.5 size-4 shrink-0" />
                  {l(after.insight)}
                </p>
              </Card>
            </li>
          );
        })}
      </ol>
      <Link href="/ladder" className={cn(buttonVariants({ size: "lg" }))}>
        {tr("backToLadder")}
      </Link>
    </section>
  );
}
