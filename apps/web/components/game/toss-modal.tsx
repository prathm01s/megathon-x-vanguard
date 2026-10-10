"use client";

import { CloudRain, Coins, Sun, Volume2, VolumeX } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { content } from "@/lib/content";
import { formatPaise, formatRate } from "@/lib/format";
import {
  getMuted,
  playCoinTossSound,
  playSuccessChime,
  playAlertSound,
  setMuted,
} from "@/lib/sound";
import type { GameEvent, GameState, TossResult } from "@toss/engine";
import { ContentIcon } from "./icon";
import { useLocalize } from "./use-localize";

export interface TossModalProps {
  outcome: { toss: TossResult; events: GameEvent[] };
  state: GameState;
  onContinue: () => void;
}

export function TossModal({ outcome, state, onContinue }: TossModalProps) {
  const t = useTranslations("toss");
  const tc = useTranslations("common");
  const l = useLocalize();
  const reduceMotion = useReducedMotion();

  const [flipped, setFlipped] = useState(false);
  const [muted, setMutedState] = useState(getMuted());

  function toggleMute() {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  }

  // Trigger toss sound and flip on mount
  useEffect(() => {
    playCoinTossSound();
    const timer = setTimeout(
      () => {
        setFlipped(true);
        if (outcome.toss.marketState === "crash") {
          playAlertSound();
        } else {
          playSuccessChime();
        }
      },
      reduceMotion ? 100 : 800,
    );

    return () => clearTimeout(timer);
  }, [outcome.toss.marketState, reduceMotion]);

  const marketStateDef = content.market.states.find((s) => s.id === outcome.toss.marketState);
  const isCrash = outcome.toss.marketState === "crash";
  const isBoom = outcome.toss.marketState === "boom";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <Card className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-2xl space-y-4 my-auto">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("title")}
          </p>
          <Button variant="ghost" size="icon" onClick={toggleMute} aria-label="Mute toggle">
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </Button>
        </div>

        {/* 3D Coin animation */}
        <div className="flex flex-col items-center justify-center py-2">
          <motion.div
            animate={
              reduceMotion
                ? { scale: [1, 1.05, 1] }
                : {
                    rotateY: [0, 1800],
                    scale: [1, 1.25, 1],
                    y: [0, -35, 0],
                  }
            }
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`grid size-24 place-items-center rounded-full text-2xl font-black shadow-xl ring-8 ${
              isCrash
                ? "bg-loss/20 text-loss ring-loss/30"
                : isBoom
                  ? "bg-gain/20 text-gain ring-gain/30"
                  : "bg-coin text-foreground ring-coin/30"
            }`}
          >
            {isCrash ? (
              <CloudRain className="size-10 text-loss" />
            ) : isBoom ? (
              <Sun className="size-10 text-gain" />
            ) : (
              <Coins className="size-10 text-coin-foreground" />
            )}
          </motion.div>
        </div>

        {/* Toss outcome revealed after flip */}
        {flipped && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Market outcome badge */}
            <div
              className={`rounded-xl p-3 text-center border ${
                isCrash
                  ? "bg-loss/10 border-loss/30 text-loss"
                  : isBoom
                    ? "bg-gain/10 border-gain/30 text-gain"
                    : "bg-secondary/10 border-secondary/30 text-secondary"
              }`}
            >
              <p className="text-xs font-semibold">{t("market", { unit: state.turnUnit })}</p>
              <h3 className="text-xl font-extrabold">
                {marketStateDef ? l(marketStateDef.label) : outcome.toss.marketState}
              </h3>
            </div>

            {/* Event summaries */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                {t("whatHappened")}
              </h4>
              <ul className="space-y-1.5 text-xs">
                {outcome.events.map((ev, i) => {
                  switch (ev.type) {
                    case "income":
                      return (
                        <li
                          key={i}
                          className="flex justify-between items-center bg-accent/20 rounded-lg p-2"
                        >
                          <span className="font-medium text-foreground">{t("income")}</span>
                          <span className="font-bold text-gain">+{formatPaise(ev.amount)}</span>
                        </li>
                      );
                    case "fixed_expenses":
                      return (
                        <li
                          key={i}
                          className="flex justify-between items-center bg-accent/20 rounded-lg p-2"
                        >
                          <span className="font-medium text-foreground">{t("expenses")}</span>
                          <span className="font-bold text-loss">−{formatPaise(ev.amount)}</span>
                        </li>
                      );
                    case "returns": {
                      const opt = content.options.options.find((o) => o.id === ev.optionId);
                      return (
                        <li
                          key={i}
                          className="flex justify-between items-center bg-accent/20 rounded-lg p-2"
                        >
                          <span className="font-medium text-foreground">
                            {t("returns", { name: opt ? l(opt.name) : ev.optionId })}
                          </span>
                          <span
                            className={`font-bold tabular-nums ${ev.change >= 0 ? "text-gain" : "text-loss"}`}
                          >
                            {ev.change >= 0 ? "+" : ""}
                            {formatPaise(ev.change)} ({formatRate(ev.rate)})
                          </span>
                        </li>
                      );
                    }
                    case "life_event": {
                      const lifeDef = content.lifeEvents.events.find((e) => e.id === ev.eventId);
                      return (
                        <li
                          key={i}
                          className="rounded-lg border border-primary/30 bg-primary/10 p-2 space-y-1"
                        >
                          <div className="flex justify-between items-center font-bold">
                            <span className="flex items-center gap-1.5 text-primary">
                              <ContentIcon name={lifeDef?.icon} className="size-4" />
                              {lifeDef ? l(lifeDef.title) : ev.eventId}
                            </span>
                            {ev.amount > 0 &&
                              (lifeDef?.type === "good" ? (
                                <span className="text-gain">+{formatPaise(ev.amount)}</span>
                              ) : (
                                <span className="text-loss">−{formatPaise(ev.amount)}</span>
                              ))}
                          </div>
                          {/* How a bad event was paid: wallet, emergency fund, or a forced loan. */}
                          {lifeDef?.type === "bad" && ev.amount > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                              {ev.coveredBy === "cash"
                                ? t("coveredByWallet")
                                : ev.coveredBy === "savings"
                                  ? t("coveredByCash")
                                  : t("shortfall")}
                            </p>
                          )}
                        </li>
                      );
                    }
                    case "task_missed": {
                      const ch = content.chapters.find((c) => c.id === state.chapterId);
                      const tDef = ch?.tasks.find((task) => task.id === ev.taskId);
                      return (
                        <li
                          key={i}
                          className="flex justify-between items-center bg-loss/10 rounded-lg p-2 text-loss"
                        >
                          <span className="font-semibold">
                            {t("taskMissed", { name: tDef ? l(tDef.title) : ev.taskId })}
                          </span>
                          <span className="font-bold">Fine: {formatPaise(ev.fine)}</span>
                        </li>
                      );
                    }
                    default:
                      return null;
                  }
                })}
              </ul>
            </div>

            <Button className="w-full font-bold shadow-md" size="lg" onClick={onContinue}>
              {tc("continue")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
