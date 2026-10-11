"use client";

// The coin toss and "what happened" this year/month, village style: a big gold coin flips, the
// market shows as weather, money in / out / investments as three tiles, then only the events
// that matter as icon rows.
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CloudRain,
  Cloud,
  Sun,
  TrendingDown,
  TrendingUp,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { GameButton } from "@/components/ui/game-button";
import { content } from "@/lib/content";
import { formatRate, formatShort } from "@/lib/format";
import { GAME_TEXT, INK, MUTED, PANEL } from "@/lib/game-style";
import {
  getMuted,
  playAlertSound,
  playCoinTossSound,
  playSuccessChime,
  setMuted,
} from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { GameEvent, GameState, TossResult } from "@toss/engine";
import { ContentIcon } from "./icon";
import { useLocalize } from "./use-localize";

export interface TossModalProps {
  outcome: { toss: TossResult; events: GameEvent[] };
  state: GameState;
  onContinue: () => void;
}

const WEATHER: Record<string, { Icon: LucideIcon; bg: string; ink: string }> = {
  boom: { Icon: Sun, bg: "linear-gradient(180deg,#bff3c9,#e7fbe9)", ink: "#15803d" },
  normal: { Icon: Cloud, bg: "linear-gradient(180deg,#bfe0ff,#eaf4ff)", ink: "#1d4ed8" },
  crash: { Icon: CloudRain, bg: "linear-gradient(180deg,#fecaca,#fff1f1)", ink: "#b91c1c" },
};

function Tile({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "gain" | "loss";
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl border-2 border-b-4 border-[#1e2a4a]/50 bg-white px-1 py-2 text-center">
      {icon}
      <span
        className={cn(
          GAME_TEXT,
          "text-lg leading-none",
          tone === "gain" ? "text-[#15803d]" : "text-[#b91c1c]",
        )}
      >
        {value}
      </span>
      <span className="text-[11px] font-bold leading-tight" style={{ color: MUTED }}>
        {label}
      </span>
    </div>
  );
}

function Row({
  icon,
  title,
  amount,
  note,
  tone,
}: {
  icon: ReactNode;
  title: string;
  amount?: string;
  note?: string;
  tone: "good" | "bad" | "info";
}) {
  return (
    <li
      className={cn(
        "rounded-xl border-2 p-2",
        tone === "good" && "border-[#16a34a]/30 bg-[#e3f8e8]",
        tone === "bad" && "border-[#dc2626]/30 bg-[#fde8e8]",
        tone === "info" && "border-[#1e2a4a]/20 bg-white",
      )}
    >
      <div className="flex items-center justify-between gap-2 text-sm font-extrabold">
        <span className="flex items-center gap-1.5">
          {icon}
          {title}
        </span>
        {amount && (
          <span
            className={tone === "good" ? "text-[#15803d]" : tone === "bad" ? "text-[#b91c1c]" : ""}
          >
            {amount}
          </span>
        )}
      </div>
      {note && (
        <p className="mt-0.5 text-xs font-semibold" style={{ color: MUTED }}>
          {note}
        </p>
      )}
    </li>
  );
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

  useEffect(() => {
    playCoinTossSound();
    const timer = setTimeout(
      () => {
        setFlipped(true);
        if (outcome.toss.marketState === "crash") playAlertSound();
        else playSuccessChime();
      },
      reduceMotion ? 100 : 800,
    );
    return () => clearTimeout(timer);
  }, [outcome.toss.marketState, reduceMotion]);

  const market = outcome.toss.marketState;
  const weather = WEATHER[market] ?? WEATHER.normal!;
  const marketLabel = l(content.market.states.find((s) => s.id === market)?.label) || market;

  const sum = (type: GameEvent["type"]) =>
    outcome.events.reduce((s, e) => (e.type === type && "amount" in e ? s + e.amount : s), 0);
  const income = sum("income");
  const costs = sum("fixed_expenses");
  const invested = outcome.events.reduce((s, e) => (e.type === "returns" ? s + e.change : s), 0);
  const chapter = content.chapters.find((c) => c.id === state.chapterId);

  const rows = outcome.events
    .map((ev, i) => {
      switch (ev.type) {
        case "life_event": {
          const def = content.lifeEvents.events.find((e) => e.id === ev.eventId);
          const good = def?.type === "good";
          return (
            <Row
              key={i}
              tone={good ? "good" : "bad"}
              icon={<ContentIcon name={def?.icon} className="size-5" />}
              title={def ? l(def.title) : ev.eventId}
              amount={ev.amount > 0 ? `${good ? "+" : "−"}${formatShort(ev.amount)}` : undefined}
              note={
                !good && ev.amount > 0
                  ? ev.coveredBy === "cash"
                    ? t("coveredByWallet")
                    : ev.coveredBy === "savings"
                      ? t("coveredByCash")
                      : t("shortfall")
                  : undefined
              }
            />
          );
        }
        case "task_missed": {
          const def = chapter?.tasks.find((task) => task.id === ev.taskId);
          return (
            <Row
              key={i}
              tone="bad"
              icon={<ContentIcon name={def?.icon} className="size-5" />}
              title={t("taskMissed", { name: def ? l(def.shortTitle ?? def.title) : ev.taskId })}
              amount={ev.fine > 0 ? `−${formatShort(ev.fine)}` : undefined}
            />
          );
        }
        case "forced_borrowing":
          return (
            <Row
              key={i}
              tone="bad"
              icon={<ArrowDownCircle className="size-5" />}
              title={t("forcedBorrowingTitle")}
              amount={`+${formatShort(ev.amount)}`}
              note={t("forcedBorrowingBody", { rate: formatRate(ev.ratePerYear) })}
            />
          );
        case "cash_lost":
          return (
            <Row
              key={i}
              tone="bad"
              icon={<ArrowDownCircle className="size-5" />}
              title={t("cashLost")}
              amount={`−${formatShort(ev.amount)}`}
            />
          );
        case "sip_missed": {
          const opt = content.options.options.find((o) => o.id === ev.optionId);
          return (
            <Row
              key={i}
              tone="info"
              icon={<ContentIcon name={opt?.icon} className="size-5" />}
              title={t("sipMissed", { name: opt ? l(opt.name) : ev.optionId })}
              amount={formatShort(ev.amount)}
            />
          );
        }
        case "debt_interest":
          return (
            <Row
              key={i}
              tone="bad"
              icon={<TrendingDown className="size-5" />}
              title={t("debtInterest")}
              amount={`−${formatShort(ev.amount)}`}
            />
          );
        case "debt_repaid":
          return (
            <Row
              key={i}
              tone="good"
              icon={<TrendingUp className="size-5" />}
              title={t("debtRepaid")}
              amount={`−${formatShort(ev.amount)}`}
            />
          );
        default:
          return null;
      }
    })
    .filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3"
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
    >
      <div
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl border-[3px] shadow-2xl"
        style={{ borderColor: INK, background: PANEL, color: INK }}
      >
        <div className="relative px-4 pb-3 pt-4 text-center" style={{ background: weather.bg }}>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? t("unmute") : t("mute")}
            className="absolute end-3 top-3 grid size-10 place-items-center rounded-full border-2 border-[#1e2a4a]/30 bg-white/80"
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <motion.div
            animate={
              reduceMotion
                ? { scale: [1, 1.05, 1] }
                : { rotateY: [0, 1800], y: [0, -40, 0], scale: [1, 1.2, 1] }
            }
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn(
              GAME_TEXT,
              "mx-auto grid size-24 place-items-center rounded-full border-4 bg-gradient-to-b from-[#ffe066] to-[#f5a524] text-4xl text-[#7a4b05] shadow-xl",
            )}
            style={{ borderColor: INK }}
          >
            {flipped ? <weather.Icon className="size-11" style={{ color: weather.ink }} /> : "₹"}
          </motion.div>
          <p className={cn(GAME_TEXT, "mt-2 text-2xl")} style={{ color: weather.ink }}>
            {flipped ? marketLabel : t("title")}
          </p>
          {flipped && (
            <p className="text-xs font-bold" style={{ color: MUTED }}>
              {t("market", { unit: state.turnUnit })}
            </p>
          )}
        </div>

        {flipped && (
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-3 gap-2">
              <Tile
                icon={<ArrowUpCircle className="size-6 text-[#15803d]" />}
                label={t("income")}
                value={`+${formatShort(income)}`}
                tone="gain"
              />
              <Tile
                icon={<ArrowDownCircle className="size-6 text-[#b91c1c]" />}
                label={t("expenses")}
                value={`−${formatShort(costs)}`}
                tone="loss"
              />
              <Tile
                icon={
                  invested >= 0 ? (
                    <TrendingUp className="size-6 text-[#15803d]" />
                  ) : (
                    <TrendingDown className="size-6 text-[#b91c1c]" />
                  )
                }
                label={t("investments")}
                value={`${invested >= 0 ? "+" : "−"}${formatShort(Math.abs(invested))}`}
                tone={invested >= 0 ? "gain" : "loss"}
              />
            </div>
            {rows.length > 0 && <ul className="space-y-2">{rows}</ul>}
            <GameButton tone="green" className="w-full" onClick={onContinue}>
              {tc("continue")}
            </GameButton>
          </div>
        )}
      </div>
    </div>
  );
}
