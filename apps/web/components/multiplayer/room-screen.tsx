"use client";

import { CheckCircle2, Clock, Gavel, Handshake, Shield, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
import type { Loan, RoomView } from "@toss/engine";

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

let peerEmoteIndex = 0;

export interface RoomScreenProps {
  code: string;
}

export function RoomScreen({ code }: RoomScreenProps) {
  const t = useTranslations("room");
  const tc = useTranslations("common");

  const roomHook = useRoom(code);
  const baseRoom = roomHook.room;

  // Local state for interactive demo
  // NOTE (merge review): local copy for the interactive prototype. Turns, loans and emotes
  // below are simulated locally and not yet sent through `roomHook.actions` (see
  // docs/requests/pragya.md). `useRoom` returns this player's redacted RoomView.
  // Local overrides on top of the live room. (useState(baseRoom) captured the hydration
  // snapshot, which is null, so the screen stayed on "Loading…" forever — merge review.)
  const [localRoom, setRoomState] = useState<RoomView | null>(null);
  const roomState = localRoom ?? baseRoom;
  const [isLobby, setIsLobby] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(45);
  const [hasSubmittedTurn, setHasSubmittedTurn] = useState(false);

  // Modals
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showAuctionModal, setShowAuctionModal] = useState(false);

  // Emotes stream
  const [emotes, setEmotes] = useState<EmoteMessage[]>([]);

  // Local loans copy
  const [localLoans, setLocalLoans] = useState<Loan[] | null>(null);
  const loans = localLoans ?? baseRoom?.loans ?? [];
  const setLoans = (update: (prev: Loan[]) => Loan[]) => setLocalLoans(update(loans));

  // Shared market toss reveal banner
  const [showTossNotice, setShowTossNotice] = useState(true);

  // The signed-in player, with their own full game state (others are public info only).
  const me = roomHook.me;
  const myTrust = roomState?.members.find((m) => m.id === me?.id)?.trustScore ?? me?.trustScore;
  const currentTurn = roomState?.turn ?? 2;
  const totalTurns = 5;

  // Timer countdown
  useEffect(() => {
    if (isLobby || hasSubmittedTurn) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 45));
    }, 1000);
    return () => clearInterval(interval);
  }, [isLobby, hasSubmittedTurn]);

  // Handle emote send
  function handleSendEmote(emoteId: string) {
    const emoteDef = content.multiplayer.emotes.find((e) => e.id === emoteId);
    if (!emoteDef) return;

    const newEmote: EmoteMessage = {
      id: nextId("emote"),
      senderName: me?.nickname ?? "You",
      emoteId,
      icon: emoteDef.icon,
      label: emoteDef.label.en,
    };

    setEmotes((prev) => [...prev.slice(-3), newEmote]);
    setTimeout(() => {
      setEmotes((prev) => prev.filter((e) => e.id !== newEmote.id));
    }, 2500);

    // Simulated peer response
    setTimeout(() => {
      const peer = roomState?.members.find((m) => m.isBot) ?? {
        nickname: "Careful Kavya",
      };
      const emoteList = content.multiplayer.emotes;
      peerEmoteIndex = (peerEmoteIndex + 1) % emoteList.length;
      const peerEmote = emoteList[peerEmoteIndex];
      const peerMsg: EmoteMessage = {
        id: nextId("peer-emote"),
        senderName: peer.nickname,
        emoteId: peerEmote.id,
        icon: peerEmote.icon,
        label: peerEmote.label.en,
      };
      setEmotes((prev) => [...prev.slice(-3), peerMsg]);
      setTimeout(() => {
        setEmotes((prev) => prev.filter((e) => e.id !== peerMsg.id));
      }, 2500);
    }, 900);
  }

  // Handle ready toggle in lobby
  function handleToggleReady() {
    if (!roomState) return;
    const updatedMembers = roomState.members.map((m) =>
      m.id === me?.id ? { ...m, ready: !m.ready } : m,
    );
    setRoomState({ ...roomState, members: updatedMembers });
    if (updatedMembers.every((m) => m.ready)) {
      playSuccessChime();
      setIsLobby(false);
    }
  }

  // Submit Turn Decisions (Lockstep sync)
  function handleSubmitTurn() {
    setHasSubmittedTurn(true);
    playCoinTossSound();

    // Simulate lockstep sync with peers
    setTimeout(() => {
      playSuccessChime();
      if (!roomState) return;

      const nextTurn = Math.min(roomState.turn + 1, totalTurns);
      setRoomState({
        ...roomState,
        turn: nextTurn,
        members: roomState.members.map((m) => ({
          ...m,
          ready: false,
        })),
      });
      setHasSubmittedTurn(false);
      setTimerSeconds(45);
      setShowTossNotice(true);
    }, 2000);
  }

  // Handle loan actions
  function handleRequestLoan(amountRupees: number, due: number) {
    const newLoan: Loan = {
      id: nextId("loan"),
      lenderMemberId: "m-bot-1",
      borrowerMemberId: me?.id ?? "m-human",
      principal: amountRupees * 100,
      ratePerTurn: 0.03,
      interestType: "simple",
      startTurn: currentTurn,
      dueTurn: due,
      status: "offered",
      repaidAmount: 0,
    };
    setLoans((prev) => [newLoan, ...prev]);
  }

  function handleAcceptLoan(loanId: string) {
    setLoans((prev) =>
      prev.map((l) => (l.id === loanId ? { ...l, status: "active" as const } : l)),
    );
    playSuccessChime();
  }

  function handleRepayLoan(loanId: string, amountPaise: number) {
    setLoans((prev) =>
      prev.map((l) =>
        l.id === loanId ? { ...l, status: "repaid" as const, repaidAmount: amountPaise } : l,
      ),
    );
    // Increase trust score on timely repayment
    if (roomState && me) {
      setRoomState({
        ...roomState,
        members: roomState.members.map((m) =>
          m.id === me.id ? { ...m, trustScore: Math.min(100, m.trustScore + 5) } : m,
        ),
      });
    }
    playSuccessChime();
  }

  if (!roomState) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <p className="text-muted-foreground">{tc("loading")}</p>
      </div>
    );
  }

  if (isLobby) {
    return (
      <div className="mx-auto max-w-md p-4">
        <RoomLobby room={roomState} me={me} onToggleReady={handleToggleReady} />
      </div>
    );
  }

  // Active playing view
  const currentToss = roomState.tosses.find((t) => t.turn === currentTurn);
  const activeLoansCount = loans.filter(
    (l) => l.borrowerMemberId === me?.id && l.status === "active",
  ).length;

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col gap-4 p-4 pb-20">
      {/* Floating Emotes Layer */}
      <FloatingEmotesOverlay emotes={emotes} />

      {/* Lockstep Turn Sync Header */}
      <header className="rounded-2xl border-2 border-primary/30 bg-card p-3.5 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-black text-primary">
              {roomState.code}
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
              {t("turnSync", { unit: "year", turn: currentTurn, total: totalTurns })}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              Lockstep Synchronized
            </span>
          </div>

          {/* Peer roster pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {roomState.members.map((member) => {
              const isThisMe = member.id === me?.id;
              const isDecided = isThisMe ? hasSubmittedTurn : true;
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
      {showTossNotice && (
        <Card className="p-3.5 space-y-1.5 border-2 border-coin/40 bg-coin/5 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-foreground">
              <TrendingUp className="size-4 text-gain" />
              <span>Shared Market Toss: Turn {currentTurn}</span>
            </div>
            <span className="rounded bg-gain/20 px-1.5 py-0.5 text-[10px] font-extrabold text-gain">
              {currentToss?.marketState?.toUpperCase() ?? "NORMAL"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            All players in this room share the same market toss outcome! Gold is up +4%, inflation
            is at 6%.
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
              {formatPaise(me?.state.cash ?? 15528000)}
            </p>
          </div>
          <div className="text-end">
            <div className="flex items-center justify-end gap-1 text-xs font-bold text-foreground">
              <Shield className="size-3.5 text-coin" />
              <span>Trust: {myTrust ?? 50}/100</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Income: {formatPaise(me?.state.incomePerMonth ?? 3674160)}/yr
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

      {/* Turn Decisions Checklist */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Turn Decisions
          </h3>
          <span className="text-[11px] font-semibold text-gain">Tasks Paid (4/5)</span>
        </div>

        <Card className="p-3 text-xs space-y-2 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-gain" />
              <div>
                <p className="font-bold">Emergency Fund Goal</p>
                <p className="text-[10px] text-muted-foreground">₹54,000 paid</p>
              </div>
            </div>
            <span className="font-extrabold text-gain">Done</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-gain" />
              <div>
                <p className="font-bold">Sister&apos;s College Fees</p>
                <p className="text-[10px] text-muted-foreground">₹25,000 paid</p>
              </div>
            </div>
            <span className="font-extrabold text-gain">Done</span>
          </div>
        </Card>
      </div>

      {/* Submit Turn Decisions Button */}
      <div className="pt-2">
        <Button
          size="lg"
          onClick={handleSubmitTurn}
          disabled={hasSubmittedTurn}
          className="w-full text-base font-extrabold shadow-xl"
        >
          {hasSubmittedTurn ? t("submitted") : t("submitTurn")}
        </Button>
      </div>

      {/* Floating Bottom Emotes Bar */}
      <div className="sticky bottom-2 z-30 pt-2 flex justify-center">
        <RoomEmotesBar onSendEmote={handleSendEmote} />
      </div>

      {/* Loan Modal */}
      {showLoanModal && (
        <LoanModal
          loans={loans}
          me={me}
          members={roomState.members}
          currentTurn={currentTurn}
          onRequestLoan={handleRequestLoan}
          onAcceptLoan={handleAcceptLoan}
          onRepayLoan={handleRepayLoan}
          onClose={() => setShowLoanModal(false)}
        />
      )}

      {/* Opportunity Auction Modal */}
      {showAuctionModal && (
        <AuctionModal
          currentTurn={currentTurn}
          chapterId={roomState.chapterId}
          me={me}
          members={roomState.members}
          onClose={() => setShowAuctionModal(false)}
        />
      )}
    </div>
  );
}
