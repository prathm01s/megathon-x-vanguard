"use client";

import { AlertOctagon, MessageSquare, PhoneCall, ShieldAlert, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { GameButton } from "@/components/ui/game-button";
import { GAME_TEXT } from "@/lib/game-style";
import { cn } from "@/lib/utils";
import { content } from "@/lib/content";
import { formatPaise } from "@/lib/format";
import { playAlertSound, playSuccessChime } from "@/lib/sound";
import type { GameState, PendingScam } from "@toss/engine";
import { GuideLine, GuideScene } from "./guide/guide";
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
    <GuideScene
      mood={!outcome ? "alert" : outcome.falls ? "worried" : "cheer"}
      label={t("incoming", { channel: scam.channel })}
    >
      {!outcome ? (
        <div className="space-y-3">
          <GuideLine>{t("guideIntro", { channel: scam.channel })}</GuideLine>
          <div className="space-y-1.5 rounded-2xl border-2 border-[#1e2a4a]/25 bg-white p-3">
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#55658a]">
              <span className="flex items-center gap-1.5">
                {scam.channel === "call" ? (
                  <PhoneCall className="size-4 animate-pulse text-[#dc2626]" />
                ) : (
                  <MessageSquare className="size-4 text-[#0f766e]" />
                )}
                {t("from", { sender: l(scam.sender) })}
              </span>
              <span className="rounded-full bg-[#e2ecff] px-2 py-0.5 text-[10px]">
                {t("inGame")}
              </span>
            </div>
            <p className="text-sm font-semibold leading-relaxed">
              &ldquo;{l(scam.offerText)}&rdquo;
            </p>
          </div>
          <p className="text-sm font-extrabold">{t("whatDoYouDo")}</p>
          <div className="flex flex-col gap-2">
            {scam.actions.map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => handleSelect(act.id, act.falls)}
                className="min-h-11 rounded-xl border-2 border-[#1e2a4a]/30 bg-white px-3 text-start text-sm font-bold active:translate-y-px"
              >
                {l(act.label)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <GuideLine>{outcome.falls ? t("guideFell") : t("guideSpotted")}</GuideLine>
          <div
            className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${
              outcome.falls
                ? "border-[#dc2626]/40 bg-[#fde8e8] text-[#b91c1c]"
                : "border-[#16a34a]/40 bg-[#e3f8e8] text-[#15803d]"
            }`}
          >
            {outcome.falls ? (
              <ShieldAlert className="size-7 shrink-0" />
            ) : (
              <Sparkles className="size-7 shrink-0" />
            )}
            <div>
              <p className={cn(GAME_TEXT, "text-lg leading-tight")}>
                {outcome.falls ? t("fellTitle") : t("spottedTitle")}
              </p>
              {outcome.falls && (
                <p className="text-sm font-bold">
                  {t("lost", { amount: formatPaise(lossAmountPaise) })}
                </p>
              )}
            </div>
          </div>
          <div>
            <p className="flex items-center gap-1 text-xs font-extrabold uppercase tracking-wide text-[#55658a]">
              <AlertOctagon className="size-3.5" /> {t("redFlags")}
            </p>
            <ul className="mt-1 space-y-1 text-sm font-semibold">
              {scam.redFlags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#dc2626]">🚩</span>
                  <span>{l(flag)}</span>
                </li>
              ))}
            </ul>
          </div>
          <GameButton tone="green" className="w-full" onClick={handleAcknowledge}>
            {tc("continue")}
          </GameButton>
        </div>
      )}
    </GuideScene>
  );
}
