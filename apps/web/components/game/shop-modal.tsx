"use client";

import { BookOpen, TrendingDown, TrendingUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { content } from "@/lib/content";
import { formatPaise } from "@/lib/format";
import type { ActionOption, GameState, Holding, Sip } from "@toss/engine";
import { AssumedReturn } from "./money";
import { ContentIcon } from "./icon";
import { TechniqueVisual } from "./technique-visuals";
import { useLocalize } from "./use-localize";

export interface ShopModalProps {
  state: GameState;
  availableActions: ActionOption[];
  onSelectAction: (option: ActionOption) => void;
  onClose: () => void;
}

export function ShopModal({ state, availableActions, onSelectAction, onClose }: ShopModalProps) {
  const t = useTranslations("shop");
  const tc = useTranslations("common");
  const l = useLocalize();

  // Active technique being viewed in modal
  const [activeTechniqueId, setActiveTechniqueId] = useState<string | null>(null);

  const chapter = content.chapters.find((c) => c.id === state.chapterId);
  const orderOf = new Map(content.chapters.map((c) => [c.id, c.order]));
  const unlocked = content.options.options.filter(
    (o) =>
      o.enabled &&
      o.id !== "cash" &&
      (chapter?.unlockOptions.includes(o.id) ||
        (orderOf.get(o.unlockChapter) ?? Infinity) < (chapter?.order ?? 0)),
  );

  const holdingByOption = new Map<string, Holding>(state.holdings.map((h) => [h.optionId, h]));
  const sipByOption = new Map<string, Sip>(
    state.sips.filter((s) => s.stoppedTurn === undefined).map((s) => [s.optionId, s]),
  );

  const activeTechnique = activeTechniqueId
    ? content.techniques.techniques.find((t) => t.id === activeTechniqueId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-xl font-extrabold">{t("title")}</h2>
            <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={tc("close")}>
            <X className="size-5" />
          </Button>
        </div>

        {/* Option list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {unlocked.map((opt) => {
            const holding = holdingByOption.get(opt.id);
            const sip = sipByOption.get(opt.id);

            const investAction = availableActions.find(
              (a) => a.type === "invest" && a.targetId === opt.id,
            );
            const withdrawAction = availableActions.find(
              (a) => a.type === "withdraw" && a.targetId === opt.id,
            );
            const sipStartAction = availableActions.find(
              (a) => a.type === "sip_start" && a.targetId === opt.id,
            );
            const sipStopAction = availableActions.find(
              (a) => a.type === "sip_stop" && a.targetId === opt.id,
            );

            const diff = holding ? holding.value - holding.invested : 0;
            const technique = opt.techniqueIds[0]
              ? content.techniques.techniques.find((t) => t.id === opt.techniqueIds[0])
              : null;

            return (
              <Card key={opt.id} className="space-y-3 border-2 border-border/80">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-10 place-items-center rounded-xl bg-accent text-foreground">
                      <ContentIcon name={opt.icon} className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-bold leading-tight">{l(opt.name)}</h3>
                      <p className="text-xs text-muted-foreground">
                        {t("risk")}: {t("riskLevel", { level: opt.riskLevel })} ·{" "}
                        {opt.liquidity === "locked_until_maturity"
                          ? t("liquidity.locked_until_maturity", { months: opt.lockMonths })
                          : opt.liquidity === "market"
                            ? t("liquidity.market")
                            : t("liquidity.instant")}
                      </p>
                    </div>
                  </div>
                  <AssumedReturn rate={opt.assumedAverageReturn} />
                </div>

                <p className="text-xs text-muted-foreground">{l(opt.description)}</p>

                {/* Lesson chip */}
                <div className="rounded-lg bg-accent/30 p-2 text-xs">
                  <span className="font-bold text-foreground">{t("lesson")}: </span>
                  <span className="text-muted-foreground">{l(opt.lesson)}</span>
                </div>

                {/* Holding status if player has money here */}
                {holding && (
                  <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-muted-foreground">Current value:</span>{" "}
                      <span className="font-bold text-foreground text-sm">
                        {formatPaise(holding.value)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold">
                      {diff >= 0 ? (
                        <span className="text-gain flex items-center gap-0.5">
                          <TrendingUp className="size-3.5" /> +{formatPaise(diff)}
                        </span>
                      ) : (
                        <span className="text-loss flex items-center gap-0.5">
                          <TrendingDown className="size-3.5" /> {formatPaise(diff)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* SIP active chip */}
                {sip && (
                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary">
                      {t("sipRunning")}: {formatPaise(sip.amountPerMonth)} / mo
                    </span>
                    {sipStopAction && (
                      <Button
                        size="default"
                        variant="ghost"
                        className="h-7 text-xs text-loss hover:text-loss"
                        onClick={() => onSelectAction(sipStopAction)}
                      >
                        Stop
                      </Button>
                    )}
                  </div>
                )}

                {/* Learn technique link */}
                {technique && (
                  <button
                    type="button"
                    onClick={() => setActiveTechniqueId(technique.id)}
                    className="flex items-center gap-1 text-xs font-bold text-secondary hover:underline"
                  >
                    <BookOpen className="size-3.5" /> Learn: {l(technique.title)}
                  </button>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
                  {investAction && (
                    <Button
                      size="default"
                      className="flex-1 min-w-[120px] text-xs font-bold"
                      disabled={Boolean(investAction.disabledReason)}
                      onClick={() => onSelectAction(investAction)}
                    >
                      {t("putIn")}
                    </Button>
                  )}
                  {withdrawAction && (
                    <Button
                      size="default"
                      variant="outline"
                      className="flex-1 min-w-[100px] text-xs font-bold"
                      onClick={() => onSelectAction(withdrawAction)}
                    >
                      Withdraw
                    </Button>
                  )}
                  {sipStartAction && !sip && (
                    <Button
                      size="default"
                      variant="secondary"
                      className="flex-1 min-w-[100px] text-xs font-bold"
                      onClick={() => onSelectAction(sipStartAction)}
                    >
                      {t("startSip")}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Technique visual modal overlay */}
        {activeTechnique && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <Card className="w-full max-w-sm space-y-3 rounded-2xl bg-card p-4 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-extrabold text-base">{l(activeTechnique.title)}</h3>
                  <p className="text-xs text-muted-foreground">{l(activeTechnique.shortExplanation)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setActiveTechniqueId(null)}>
                  <X className="size-4" />
                </Button>
              </div>
              <TechniqueVisual visualId={activeTechnique.visual} />
              <Button className="w-full text-xs font-bold" onClick={() => setActiveTechniqueId(null)}>
                Got it
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
