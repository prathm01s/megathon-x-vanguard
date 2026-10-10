"use client";

import {
  ArrowRight,
  CheckCircle2,
  Coins,
  Lightbulb,
  PlusCircle,
  ShoppingBag,
  Wallet,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "@/i18n/navigation";
import { content } from "@/lib/content";
import { formatPaise } from "@/lib/format";
import { getAvailableActions, totalWealth, type ActionOption } from "@toss/engine";
import { AmountModal } from "./amount-modal";
import { GameGate } from "./game-gate";
import { ContentIcon } from "./icon";
import { MoneyPair } from "./money";
import { PersonaAvatar } from "./persona-reveal";
import { ScamModal } from "./scam-modal";
import { ShopModal } from "./shop-modal";
import { useGameStore } from "./store";
import { TossModal } from "./toss-modal";
import { useLocalize } from "./use-localize";

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

  const wealthTotal = totalWealth(state);
  const realValueTotal = Math.round(wealthTotal / state.inflationIndex);
  const realValueCash = Math.round(state.cash / state.inflationIndex);

  const currentAge = chapter
    ? chapter.ageRange[0] +
      Math.floor((state.turn / state.totalTurns) * (chapter.ageRange[1] - chapter.ageRange[0]))
    : 22;

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

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Top stage & turn header */}
      <div className="flex items-center justify-between border-b border-border/80 pb-2">
        <div className="flex items-center gap-2">
          {persona && <PersonaAvatar hint={persona.avatarHint} className="size-9 ring-2" />}
          <div>
            <h1 className="text-sm font-extrabold leading-tight">
              {chapter ? l(chapter.title) : state.chapterId}
            </h1>
            <p className="text-xs font-semibold text-muted-foreground">
              {t("age", { age: currentAge })} ·{" "}
              {t("turnOf", {
                unit: state.turnUnit,
                turn: state.turn + 1,
                total: state.totalTurns,
              })}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
          {chapter ? l(chapter.stage) : ""}
        </span>
      </div>

      {/* Guided Turn Tip */}
      {showGuide && (
        <Card className="relative border-2 border-primary/50 bg-primary/5 p-3.5 space-y-2">
          <button
            type="button"
            onClick={dismissGuide}
            className="absolute end-2 top-2 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
          <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
            <Lightbulb className="size-4" />
            <span>{t("guideTitle")}</span>
          </div>
          <ul className="space-y-1 text-xs text-foreground/90">
            <li>1. {t("guideStep1")}</li>
            <li>2. {t("guideStep2")}</li>
            <li>3. {t("guideStep3")}</li>
          </ul>
          <Button
            size="default"
            variant="outline"
            className="h-7 text-xs font-bold"
            onClick={dismissGuide}
          >
            {t("gotIt")}
          </Button>
        </Card>
      )}

      {/* Error alert if engine rejected action */}
      {errorMsg && (
        <div className="rounded-lg bg-loss/10 border border-loss/30 p-2.5 text-xs text-loss font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Wallet Card */}
      <Card className="space-y-3 border-2 border-border/80 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-coin/20 text-foreground">
              <Wallet className="size-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("wallet")} (Cash)
            </span>
          </div>
          <div className="text-end">
            <span className="text-xs text-muted-foreground">{t("totalWealth")}: </span>
            <span className="text-xs font-extrabold text-foreground tabular-nums">
              {formatPaise(wealthTotal)}
            </span>
            <span className="text-[10px] block text-secondary font-semibold tabular-nums">
              Real: {formatPaise(realValueTotal)}
            </span>
          </div>
        </div>

        {/* Real Value comparison */}
        <MoneyPair amount={state.cash} realValue={realValueCash} />

        {/* Monthly cash flow */}
        <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2 text-[11px]">
          <div className="text-gain font-semibold">+{formatPaise(state.incomePerMonth)} / mo</div>
          <div className="text-loss font-semibold text-end">
            −
            {formatPaise(
              chapter?.fixedExpenses.reduce((s, e) => s + e.amountPerMonth * 100, 0) ?? 0,
            )}{" "}
            / mo
          </div>
        </div>
      </Card>

      {/* To-Do List (Tasks) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
            {t("tasks")}
          </h2>
          <span className="text-xs text-muted-foreground">
            {state.tasks.filter((t) => t.status === "done").length} / {state.tasks.length} done
          </span>
        </div>

        <ul className="space-y-2">
          {state.tasks.map((taskState) => {
            const taskDef = chapter?.tasks.find((d) => d.id === taskState.taskId);
            if (!taskDef) return null;

            const isDone = taskState.status === "done";
            const isLate = taskState.status === "late";
            const isDueNow = taskState.dueTurn === state.turn + 1;

            const payAction = availableActions.find(
              (a) => a.type === "pay_task" && a.targetId === taskState.taskId,
            );

            return (
              <li key={taskState.taskId}>
                <Card
                  className={`p-3 space-y-2 transition-all ${
                    isDone
                      ? "opacity-60 bg-muted/40"
                      : isDueNow
                        ? "border-primary/60 bg-primary/5 shadow-sm"
                        : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-foreground mt-0.5">
                        <ContentIcon name={taskDef.icon} className="size-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xs font-bold leading-tight">{l(taskDef.title)}</h3>
                          {taskDef.required && (
                            <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                              {t("required")}
                            </span>
                          )}
                          {isLate && (
                            <span className="rounded bg-loss/20 px-1.5 py-0.2 text-[10px] font-bold text-loss">
                              {t("status.late")}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {isDone ? (
                            <span className="text-gain font-semibold flex items-center gap-0.5">
                              <CheckCircle2 className="size-3" /> Done
                            </span>
                          ) : (
                            <span>
                              {t("due", { unit: state.turnUnit, turn: taskState.dueTurn })} ·{" "}
                              {t("paidOf", {
                                paid: formatPaise(taskState.paid),
                                amount: formatPaise(taskState.amount),
                              })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {!isDone && payAction && (
                      <Button
                        size="default"
                        className="h-8 text-xs font-bold shrink-0"
                        disabled={Boolean(payAction.disabledReason)}
                        onClick={() => setSelectedAction(payAction)}
                      >
                        {t("pay")}
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Investments & SIPs overview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
            {t("investments")}
          </h2>
          <Button
            size="default"
            variant="outline"
            className="h-7 text-xs font-bold"
            onClick={() => setIsShopOpen(true)}
          >
            <PlusCircle className="size-3.5" /> Save / Invest
          </Button>
        </div>

        {state.holdings.length === 0 && state.sips.length === 0 ? (
          <Card className="p-4 text-center space-y-2 border-dashed">
            <p className="text-xs text-muted-foreground">{t("noInvestments")}</p>
            <Button
              size="default"
              variant="secondary"
              className="text-xs font-bold"
              onClick={() => setIsShopOpen(true)}
            >
              <ShoppingBag className="size-3.5" /> Open Investment Shop
            </Button>
          </Card>
        ) : (
          <div className="grid gap-2">
            {state.holdings.map((h) => {
              const opt = content.options.options.find((o) => o.id === h.optionId);
              if (!opt) return null;
              const diff = h.value - h.invested;
              return (
                <Card key={h.optionId} className="p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-lg bg-accent">
                      <ContentIcon name={opt.icon} className="size-4" />
                    </span>
                    <div>
                      <p className="font-bold">{l(opt.name)}</p>
                      <p className="text-muted-foreground">
                        {t("invested", { amount: formatPaise(h.invested) })}
                      </p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="font-bold text-sm tabular-nums">{formatPaise(h.value)}</p>
                    <p className={`font-semibold ${diff >= 0 ? "text-gain" : "text-loss"}`}>
                      {diff >= 0 ? "+" : ""}
                      {formatPaise(diff)}
                    </p>
                  </div>
                </Card>
              );
            })}

            {state.sips
              .filter((s) => s.stoppedTurn === undefined)
              .map((s) => {
                const opt = content.options.options.find((o) => o.id === s.optionId);
                if (!opt) return null;
                return (
                  <div
                    key={s.optionId}
                    className="flex items-center justify-between rounded-lg bg-secondary/10 p-2.5 text-xs"
                  >
                    <span className="font-semibold text-secondary">
                      SIP: {l(opt.name)} ({formatPaise(s.amountPerMonth)}/mo)
                    </span>
                    <Button
                      size="default"
                      variant="ghost"
                      className="h-6 text-xs text-loss hover:text-loss"
                      onClick={() => act({ type: "sip_stop", optionId: s.optionId })}
                    >
                      Stop
                    </Button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Primary Action Button (Toss Coin or Finish Chapter) */}
      <div className="sticky bottom-3 pt-2">
        {state.status === "chapter_complete" ? (
          <Button
            size="lg"
            className="w-full text-base font-extrabold shadow-xl"
            onClick={handleFinishChapter}
          >
            {t("seeResults")} <ArrowRight className="size-5" />
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full text-base font-extrabold shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleToss}
          >
            <Coins className="size-5" />
            {t("toss")}
          </Button>
        )}
      </div>

      {/* Modals */}
      {selectedAction && (
        <AmountModal
          option={selectedAction}
          availableCash={state.cash}
          currentRealValueIndex={state.inflationIndex}
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
      {pendingScam && (
        <ScamModal pendingScam={pendingScam} state={state} onRespond={handleScamResponse} />
      )}

      {/* Toss outcome modal */}
      {lastTurn && <TossModal outcome={lastTurn} state={state} onContinue={clearLastTurn} />}
    </div>
  );
}
