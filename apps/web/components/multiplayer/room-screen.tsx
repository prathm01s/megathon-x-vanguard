"use client";

import { CheckCircle2, Clock, Gavel, Handshake, Shield, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RoomLobby } from "@/components/multiplayer/room-lobby";
import { LoanModal } from "@/components/multiplayer/loan-modal";
import { AuctionModal } from "@/components/multiplayer/auction-modal";
import {
  FloatingEmotesOverlay,
  RoomEmotesBar,
  type EmoteMessage,
} from "@/components/multiplayer/room-emotes";
import { useRoom } from "@/lib/room";
import { formatPaise } from "@/lib/format";
import { playCoinTossSound, playSuccessChime } from "@/lib/sound";
import { content } from "@/lib/content";
import { useGameStore } from "@/components/game/store";
import { useLocalize } from "@/components/game/use-localize";
import { cn } from "@/lib/utils";

export interface RoomScreenProps {
  code: string;
}

export function RoomScreen({ code }: RoomScreenProps) {
  const t = useTranslations("room");
  const l = useLocalize();
  const tc = useTranslations("common");

  const roomHook = useRoom(code);
  const room = roomHook.room;
  const me = roomHook.me;
  const personaId = useGameStore((s) => s.personaId);

  // Auto-join lobby with student's persona if not yet joined
  useEffect(() => {
    if (room && !me) {
      void roomHook.actions.join(personaId ?? "safe-keeper");
    }
  }, [room, me, roomHook.actions, personaId]);

  const currentTurn = room?.turn ?? 0;
  const totalTurns = me?.state.totalTurns ?? 5;

  // Modals
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showAuctionModal, setShowAuctionModal] = useState(false);

  // Live timer countdown from content.multiplayer.turnTimerSeconds
  const turnTimerLimit = content.multiplayer.turnTimerSeconds ?? 90;
  const [timerSeconds, setTimerSeconds] = useState(turnTimerLimit);
  const [prevTurn, setPrevTurn] = useState(currentTurn);
  if (prevTurn !== currentTurn) {
    setPrevTurn(currentTurn);
    setTimerSeconds(turnTimerLimit);
  }

  useEffect(() => {
    if (room?.status !== "playing" || me?.ready) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          void roomHook.actions.tick();
          return turnTimerLimit;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.status, me?.ready, roomHook.actions, turnTimerLimit]);

  // Live reactions overlay from room.reactions
  const [emotes, setEmotes] = useState<EmoteMessage[]>([]);
  const lastReactionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!room?.reactions?.length) return;
    const count = room.reactions.length;
    const latest = room.reactions[count - 1];
    if (latest) {
      const reactionKey = `${latest.memberId}-${latest.emoteId}-${count}`;
      if (reactionKey !== lastReactionKeyRef.current) {
        lastReactionKeyRef.current = reactionKey;
        const sender =
          room.members.find((m) => m.id === latest.memberId)?.nickname ??
          (latest.memberId === me?.id ? "You" : "Friend");
        const emoteDef = content.multiplayer.emotes.find((e) => e.id === latest.emoteId);
        if (emoteDef) {
          const newMsg: EmoteMessage = {
            id: reactionKey,
            senderName: sender,
            emoteId: latest.emoteId,
            icon: emoteDef.icon,
            label: emoteDef.label.en,
          };
          const timer = setTimeout(() => {
            setEmotes((prev) => [...prev.slice(-3), newMsg]);
            setTimeout(() => {
              setEmotes((prev) => prev.filter((e) => e.id !== newMsg.id));
            }, 2500);
          }, 0);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [room?.reactions, room?.members, me?.id]);

  async function handleSendEmote(emoteId: string) {
    try {
      await roomHook.actions.react(emoteId);
    } catch (err) {
      console.error("Failed to send reaction:", err);
    }
  }

  // Turn submission
  async function handleSubmitTurn() {
    playCoinTossSound();
    try {
      await roomHook.actions.submitTurn();
      playSuccessChime();
    } catch (err) {
      console.error("Failed to submit turn:", err);
    }
  }

  // Loan handlers wired to useRoom actions
  async function handleRequestLoan(amountRupees: number, due: number) {
    try {
      await roomHook.actions.requestLoan({
        amount: amountRupees * 100,
        dueTurn: due,
      });
      playSuccessChime();
    } catch (err) {
      console.error("Failed to request loan:", err);
    }
  }

  async function handleAcceptLoan(offerId: string) {
    try {
      await roomHook.actions.acceptLoan(offerId);
      playSuccessChime();
    } catch (err) {
      console.error("Failed to accept loan:", err);
    }
  }

  async function handleRepayLoan(loanId: string, amountPaise: number) {
    try {
      await roomHook.actions.repayLoan({ loanId, amount: amountPaise });
      playSuccessChime();
    } catch (err) {
      console.error("Failed to repay loan:", err);
    }
  }

  async function handleOfferLoan(loanId: string, ratePerTurn: number) {
    try {
      await roomHook.actions.offerLoan({ loanId, ratePerTurn });
      playSuccessChime();
    } catch (err) {
      console.error("Failed to offer loan:", err);
    }
  }

  if (!room || roomHook.status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <p className="text-muted-foreground">{tc("loading")}</p>
      </div>
    );
  }

  if (room.status === "lobby") {
    return (
      <div className="mx-auto max-w-md p-4">
        <RoomLobby
          room={room}
          me={me}
          isHost={roomHook.isHost}
          onToggleReady={() => void roomHook.actions.ready()}
        />
      </div>
    );
  }

  // Active playing view
  const currentToss = room.tosses.find((t) => t.turn === currentTurn);
  const myTrust = room.members.find((m) => m.id === me?.id)?.trustScore ?? me?.trustScore ?? 50;
  const activeLoansCount = roomHook.myDebts.length;
  const hasSubmitted = me?.ready ?? false;

  const myTasks = me?.state.tasks ?? [];
  const paidTasksCount = myTasks.filter((t) => t.status === "done").length;

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col gap-4 p-4 pb-20">
      {/* Floating Emotes Layer */}
      <FloatingEmotesOverlay emotes={emotes} />

      {/* Lockstep Turn Sync Header */}
      <header className="rounded-2xl border-2 border-primary/30 bg-card p-3.5 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-black text-primary">
              {room.code}
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wide text-foreground">
              {t("title")}
            </span>
          </div>

          {/* Turn timer */}
          <div className="flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-foreground">
            <Clock className="size-3.5 text-primary" />
            <span>{t("timer", { seconds: timerSeconds })}</span>
          </div>
        </div>

        {/* Turn Progress & Peer Sync Status */}
        <div className="space-y-1.5 pt-1 border-t border-border/60">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-foreground">
              {t("turnSync", {
                unit: me?.state.turnUnit ?? "year",
                // `turn` counts tosses so far (0 before the first); players see a 1-based year.
                turn: Math.min(currentTurn + 1, totalTurns),
                total: totalTurns,
              })}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              Lockstep Synchronized
            </span>
          </div>

          {/* Peer roster pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {room.members.map((member) => {
              const isThisMe = member.id === me?.id;
              const isDecided = member.ready;
              return (
                <div
                  key={member.id}
                  className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                    isDecided
                      ? "border-gain/40 bg-gain/10 text-gain"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  <span>{isThisMe ? t("you") : member.nickname}</span>
                  <span className="text-[10px] font-normal">{isDecided ? "✓" : "…"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Shared Market Toss Card */}
      {currentToss && (
        <Card className="p-3.5 space-y-1.5 border-2 border-coin/40 bg-coin/5 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-foreground">
              <TrendingUp className="size-4 text-gain" />
              <span>Shared Market Toss: Turn {currentTurn}</span>
            </div>
            <span className="rounded bg-gain/20 px-1.5 py-0.5 text-[10px] font-extrabold text-gain">
              {currentToss.marketState.toUpperCase()}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Market:{" "}
            <strong>
              {l(content.market.states.find((m) => m.id === currentToss.marketState)?.label) ||
                currentToss.marketState}
            </strong>{" "}
            · Inflation: <strong>+{Math.round(currentToss.inflation * 100)}%</strong>
            {currentToss.lifeEventId && (
              <>
                {" "}
                · Life Event:{" "}
                <strong>
                  {l(
                    content.lifeEvents.events.find((e) => e.id === currentToss.lifeEventId)?.title,
                  ) || currentToss.lifeEventId}
                </strong>
              </>
            )}
          </p>
        </Card>
      )}

      {/* Human Player Wallet & Trust Banner */}
      <Card className="p-4 space-y-3 bg-card shadow-sm border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Cash in Hand
            </p>
            <p className="font-mono text-2xl font-black text-foreground">
              {formatPaise(me?.state.cash ?? 0)}
            </p>
          </div>
          <div className="text-end">
            <div className="flex items-center justify-end gap-1 text-xs font-bold text-foreground">
              <Shield className="size-3.5 text-coin" />
              <span>Trust: {myTrust}/100</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Income: {formatPaise(me?.state.incomePerMonth ?? 0)} / mo
            </p>
          </div>
        </div>
      </Card>

      {/* Multiplayer Feature Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setShowLoanModal(true)}
          className="h-16 flex flex-col items-center justify-center gap-1 border-2 border-primary/30 hover:border-primary hover:bg-primary/5 relative"
        >
          {activeLoansCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-loss text-white text-[10px] font-black grid place-items-center">
              {activeLoansCount}
            </span>
          )}
          <Handshake className="size-5 text-primary" />
          <span className="text-xs font-extrabold">Peer Loans</span>
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => setShowAuctionModal(true)}
          className="h-16 flex flex-col items-center justify-center gap-1 border-2 border-secondary/40 hover:border-secondary hover:bg-secondary/5"
        >
          <Gavel className="size-5 text-secondary" />
          <span className="text-xs font-extrabold">Opportunity Auction</span>
        </Button>
      </div>

      {/* Dynamic Turn Decisions & Tasks Checklist */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Turn Decisions
          </h3>
          <span className="text-[11px] font-semibold text-gain">
            Tasks Done ({paidTasksCount}/{myTasks.length})
          </span>
        </div>

        <Card className="p-3 text-xs space-y-2 border border-border">
          {myTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-2">No tasks due this turn.</p>
          ) : (
            myTasks.map((task, idx) => {
              const isDone = task.status === "done";
              const isDue = task.dueTurn === currentTurn + 1; // dueTurn is 1-based
              return (
                <div
                  key={task.taskId}
                  className={cn(
                    "flex items-center justify-between py-1",
                    idx > 0 && "border-t border-border/50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={cn("size-4", isDone ? "text-gain" : "text-muted-foreground")}
                    />
                    <div>
                      <p className="font-bold">
                        {l(
                          content.chapters
                            .find((c) => c.id === me?.state.chapterId)
                            ?.tasks.find((ct) => ct.id === task.taskId)?.title,
                        ) || task.taskId}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatPaise(task.paid)} / {formatPaise(task.amount)}
                        {isDue && " · Due this turn"}
                      </p>
                    </div>
                  </div>
                  {isDone ? (
                    <span className="font-extrabold text-gain">Done</span>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-7 text-xs font-bold"
                      onClick={() =>
                        void roomHook.actions.act({
                          type: "pay_task",
                          taskId: task.taskId,
                          amount: task.amount - task.paid,
                        })
                      }
                    >
                      Pay
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </Card>
      </div>

      {/* Submit Turn Decisions Button */}
      <div className="pt-2">
        <Button
          size="lg"
          onClick={handleSubmitTurn}
          disabled={hasSubmitted}
          className="w-full text-base font-extrabold shadow-xl"
        >
          {hasSubmitted ? t("submitted") : t("submitTurn")}
        </Button>
      </div>

      {/* Floating Bottom Emotes Bar */}
      <div className="sticky bottom-2 z-30 pt-2 flex justify-center">
        <RoomEmotesBar onSendEmote={handleSendEmote} />
      </div>

      {/* Loan Modal */}
      {showLoanModal && (
        <LoanModal
          loans={room.loans}
          me={me}
          members={room.members}
          currentTurn={currentTurn}
          onRequestLoan={handleRequestLoan}
          onOfferLoan={handleOfferLoan}
          onAcceptLoan={handleAcceptLoan}
          onRepayLoan={handleRepayLoan}
          onClose={() => setShowLoanModal(false)}
        />
      )}

      {/* Opportunity Auction Modal */}
      {showAuctionModal && (
        <AuctionModal
          currentTurn={currentTurn}
          chapterId={room.chapterId}
          me={me}
          members={room.members}
          auction={roomHook.auction}
          onPlaceBid={(amt) => void roomHook.actions.placeBid(amt)}
          onJoinPool={(amt) => void roomHook.actions.createPool(amt)}
          onClose={() => setShowAuctionModal(false)}
        />
      )}
    </div>
  );
}
