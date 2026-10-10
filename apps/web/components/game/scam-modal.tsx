"use client";

import { AlertOctagon, MessageSquare, PhoneCall, ShieldAlert, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { content } from "@/lib/content";
import { formatPaise } from "@/lib/format";
import { playAlertSound, playSuccessChime } from "@/lib/sound";
import type { GameState, PendingScam } from "@toss/engine";
import { useLocalize } from "./use-localize";

export interface ScamModalProps {
  pendingScam: PendingScam;
  state: GameState;
  onRespond: (instanceId: string, responseId: string) => void;
}

export function ScamModal({ pendingScam, state, onRespond }: ScamModalProps) {
  const t = useTranslations("scam");
  const tc = useTranslations("common");
  const l = useLocalize();

  const scam = content.scams.scams.find((s) => s.id === pendingScam.scamId);
  const [outcome, setOutcome] = useState<{ falls: boolean; actionId: string } | null>(null);

  if (!scam) return null;

  function handleSelect(actionId: string, falls: boolean) {
    if (falls) {
      playAlertSound();
    } else {
      playSuccessChime();
    }
    setOutcome({ falls, actionId });
  }

  function handleAcknowledge() {
    if (!outcome) return;
    onRespond(pendingScam.instanceId, outcome.actionId);
  }

  const lossAmountPaise =
    scam.lossIfFallen.type === "fixed"
      ? scam.lossIfFallen.amount * 100
      : Math.round(state.cash * scam.lossIfFallen.pct);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-5 shadow-2xl border-2 border-primary/50 animate-in zoom-in-95">
        {/* Scam disclaimer */}
        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          <span className="flex items-center gap-1 text-primary">
            <AlertOctagon className="size-3.5" />
            {t("incoming", { channel: scam.channel })}
          </span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] lowercase text-foreground">
            {t("inGame")}
          </span>
        </div>

        {!outcome ? (
          /* Incoming scam offer card */
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-accent/20 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                {scam.channel === "call" ? (
                  <PhoneCall className="size-4 text-primary animate-pulse" />
                ) : (
                  <MessageSquare className="size-4 text-secondary" />
                )}
                <span>{t("from", { sender: l(scam.sender) })}</span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-foreground">
                &ldquo;{l(scam.offerText)}&rdquo;
              </p>
            </div>

            <p className="text-xs font-bold text-muted-foreground">{t("whatDoYouDo")}</p>

            <div className="flex flex-col gap-2">
              {scam.actions.map((act) => (
                <Button
                  key={act.id}
                  variant={act.falls ? "outline" : "default"}
                  className="w-full justify-start text-xs font-bold h-11"
                  onClick={() => handleSelect(act.id, act.falls)}
                >
                  {l(act.label)}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          /* Outcome / Red flags resolution */
          <div className="space-y-4">
            <div
              className={`rounded-xl p-4 text-center space-y-2 ${
                outcome.falls
                  ? "bg-loss/10 border border-loss/30 text-loss"
                  : "bg-gain/10 border border-gain/30 text-gain"
              }`}
            >
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-card shadow-sm">
                {outcome.falls ? (
                  <ShieldAlert className="size-6 text-loss" />
                ) : (
                  <Sparkles className="size-6 text-gain" />
                )}
              </div>
              <h3 className="font-extrabold text-base">
                {outcome.falls ? t("fellTitle") : t("spottedTitle")}
              </h3>
              {outcome.falls && (
                <p className="text-xs font-bold text-loss">
                  {t("lost", { amount: formatPaise(lossAmountPaise) })}
                </p>
              )}
            </div>

            {/* Red flags list */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                {t("redFlags")}
              </h4>
              <ul className="space-y-1.5 text-xs">
                {scam.redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-primary font-bold">•</span>
                    <span>{l(flag)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button className="w-full font-bold" onClick={handleAcknowledge}>
              {tc("continue")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
