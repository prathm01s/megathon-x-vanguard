"use client";

import { ArrowRight, Coins, Lightbulb, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GameButton } from "@/components/ui/game-button";
import { useRouter } from "@/i18n/navigation";
import { content } from "@/lib/content";
import { getAvailableActions, type ActionOption } from "@toss/engine";
import { AmountModal } from "./amount-modal";
import { GameGate } from "./game-gate";
import { PersonaAvatar } from "./persona-reveal";
import { ScamModal } from "./scam-modal";
import { ShopModal } from "./shop-modal";
import { useGameStore } from "./store";
import { TossModal } from "./toss-modal";
import { useLocalize } from "./use-localize";
import { InvestRail, SideStats, TaskSheet, VillageGround } from "./village/village";
import { GAME_TEXT } from "@/lib/game-style";
import { cn } from "@/lib/utils";

export function TurnScreen() {
  return (
    <GameGate>
      <Screen />
    </GameGate>
  );
}

function Screen() {
  const t = useTranslations("play");
  const l = useLocalize();
  const router = useRouter();

  const state = useGameStore((s) => s.state);
  const personaId = useGameStore((s) => s.personaId);
  const lastTurn = useGameStore((s) => s.lastTurn);
  const dismissedGuide = useGameStore((s) => s.dismissedGuide);
  const act = useGameStore((s) => s.act);
  const advance = useGameStore((s) => s.advance);
  const clearLastTurn = useGameStore((s) => s.clearLastTurn);
  const finishChapter = useGameStore((s) => s.finishChapter);
  const dismissGuide = useGameStore((s) => s.dismissGuide);

  // Modal UI state
  const [selectedAction, setSelectedAction] = useState<ActionOption | null>(null);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }
  const tv = useTranslations("village");

  if (!state) {
    return (
      <Card className="mt-8 space-y-4 text-center p-6">
        <p className="text-muted-foreground">No active chapter in progress.</p>
        <Button onClick={() => router.push("/ladder")}>Go to Life Ladder</Button>
      </Card>
    );
  }

  const chapter = content.chapters.find((c) => c.id === state.chapterId);
  const persona = content.personas.personas.find((p) => p.id === (personaId ?? state.personaId));
  const availableActions = getAvailableActions(state, content);

  const showGuide = Boolean(persona?.guidedFirstTurn) && state.turn === 0 && !dismissedGuide;

  const pendingScam = state.pendingScams[0];

  function handleActionConfirm(amountPaise: number) {
    if (!selectedAction) return;
    setErrorMsg(null);

    let err: string | null = null;
    if (selectedAction.type === "pay_task") {
      err = act({ type: "pay_task", taskId: selectedAction.targetId, amount: amountPaise });
    } else if (selectedAction.type === "invest") {
      err = act({ type: "invest", optionId: selectedAction.targetId, amount: amountPaise });
    } else if (selectedAction.type === "withdraw") {
      err = act({ type: "withdraw", optionId: selectedAction.targetId, amount: amountPaise });
    } else if (selectedAction.type === "sip_start") {
      err = act({
        type: "sip_start",
        optionId: selectedAction.targetId,
        amountPerMonth: amountPaise,
      });
    }

    if (err) {
      setErrorMsg(t("error", { code: err }));
    } else {
      setSelectedAction(null);
      showToast(tv("toastDone"));
    }
  }

  function handleScamResponse(instanceId: string, response: string) {
    act({
      type: "scam_response",
      instanceId,
      response: response as never,
    });
  }

  function handleToss() {
    setErrorMsg(null);
    advance();
  }

  function handleFinishChapter() {
    finishChapter();
    router.push("/report");
  }

  const openTask = state.tasks.find((x) => x.taskId === openTaskId);
  const openTaskDef = chapter?.tasks.find((d) => d.id === openTaskId);
  const openPayAction = availableActions.find(
    (a) => a.type === "pay_task" && a.targetId === openTaskId,
  );
  const level = persona?.difficulty;

  return (
    <div className="flex flex-col gap-3 pb-6">
      {/* Who and where: avatar, chapter, level */}
      <div className="flex items-center gap-2">
        {persona && <PersonaAvatar hint={persona.avatarHint} className="size-10 ring-2" />}
        <div className="min-w-0">
          <h1 className={cn(GAME_TEXT, "truncate text-xl leading-tight")}>
            {chapter ? l(chapter.title) : state.chapterId}
          </h1>
          {level && (
            <p className="text-xs font-bold text-muted-foreground">
              <span className="text-[#d4a017]" aria-hidden>
                {"★".repeat(level.stars)}
                {"☆".repeat(4 - level.stars)}
              </span>{" "}
              {l(level.label)}
            </p>
          )}
        </div>
      </div>

      {/* One-line builder tip on the first turn */}
      {showGuide && (
        <div className="relative flex items-center gap-2 rounded-2xl border-2 border-[#2b1d12]/60 bg-[#fff3b0] p-2.5 pe-9 text-sm font-semibold">
          <Lightbulb className="size-5 shrink-0 text-[#b86e0a]" aria-hidden />
          {tv("tip")}
          <button
            type="button"
            onClick={dismissGuide}
            aria-label={t("gotIt")}
            className="absolute end-2 top-1/2 -translate-y-1/2 p-1"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-loss/30 bg-loss/10 p-2.5 text-xs font-semibold text-loss">
          {errorMsg}
        </div>
      )}

      {/* Money + year | the village | investments */}
      <div className="flex items-start gap-2">
        <SideStats state={state} chapter={chapter} />
        <VillageGround state={state} chapter={chapter} onPlot={setOpenTaskId} />
        <InvestRail state={state} onOpenShop={() => setIsShopOpen(true)} />
      </div>

      {toast && (
        <div
          role="status"
          className={cn(
            GAME_TEXT,
            "pointer-events-none fixed inset-x-0 top-[38%] z-40 mx-auto w-fit rounded-full border-2 border-[#2b1d12]/70 bg-[#fff3b0] px-5 py-2 text-lg text-[#2b1d12] shadow-lg",
          )}
        >
          {toast}
        </div>
      )}

      {/* One big button: move time forward, or see the results */}
      <div className="sticky bottom-3 z-20 pt-1">
        {state.status === "chapter_complete" ? (
          <GameButton tone="green" className="w-full" onClick={handleFinishChapter}>
            {t("seeResults")} <ArrowRight aria-hidden />
          </GameButton>
        ) : (
          <GameButton tone="gold" className="w-full" onClick={handleToss}>
            <Coins aria-hidden />
            {tv("next", { unit: state.turnUnit })}
          </GameButton>
        )}
      </div>

      {openTask && openTaskDef && (
        <TaskSheet
          task={openTask}
          def={openTaskDef}
          state={state}
          payAction={openPayAction}
          onClose={() => setOpenTaskId(null)}
          onBuild={() => {
            const left = openTask.amount - openTask.paid;
            const amount = Math.min(left, state.cash);
            if (amount <= 0) return;
            const err = act({ type: "pay_task", taskId: openTask.taskId, amount });
            setOpenTaskId(null);
            if (err) setErrorMsg(t("error", { code: err }));
            else showToast(amount >= left ? tv("toastBuilt") : tv("toastPart"));
          }}
        />
      )}

      {/* Modals */}
      {selectedAction && (
        <AmountModal
          option={selectedAction}
          availableCash={state.cash}
          currentRealValueIndex={state.inflationIndex}
          incomePerMonth={state.incomePerMonth}
          onConfirm={handleActionConfirm}
          onClose={() => setSelectedAction(null)}
        />
      )}

      {isShopOpen && (
        <ShopModal
          state={state}
          availableActions={availableActions}
          onSelectAction={(action) => {
            setIsShopOpen(false);
            if (action.type === "sip_stop") {
              act({ type: "sip_stop", optionId: action.targetId });
            } else {
              setSelectedAction(action);
            }
          }}
          onClose={() => setIsShopOpen(false)}
        />
      )}

      {/* Scam card trigger if pending */}
      {/* A scam arrives during the year: show it once the toss summary has been read. */}
      {pendingScam && !lastTurn && (
        <ScamModal pendingScam={pendingScam} state={state} onRespond={handleScamResponse} />
      )}

      {/* Toss outcome modal */}
      {lastTurn && <TossModal outcome={lastTurn} state={state} onContinue={clearLastTurn} />}
    </div>
  );
}
