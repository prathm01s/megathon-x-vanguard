"use client";

// The village turn screen (team request 2026-10-11): every task is a plot on the ground with a
// flag; paying it builds a building. Money and year sit in a left rail, investments in a right
// rail, so the screen needs almost no text. Tap anything for a one-line explanation.
import type { Chapter, Task } from "@toss/content";
import type { ActionOption, GameState, TaskState } from "@toss/engine";
import {
  CalendarDays,
  Coins,
  Hammer,
  Landmark,
  Plus,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { GameButton } from "@/components/ui/game-button";
import { content } from "@/lib/content";
import { formatPaise, formatShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ContentIcon } from "../icon";
import { useLocalize } from "../use-localize";
import { PlotArt, TownHallArt, type PlotStage } from "./art";
import { GAME_TEXT, GRASS_STYLE } from "@/lib/game-style";

export function stageOf(task: TaskState): PlotStage {
  if (task.status === "done") return "building";
  if (task.status === "missed" || task.status === "blocked") return "ruins";
  return task.paid > 0 ? "scaffold" : "flag";
}

/** A rail item: big icon + short number; tap toggles a one-line explanation. */
function RailStat({
  icon,
  value,
  label,
  help,
  tone = "default",
}: {
  icon: ReactNode;
  value: string;
  label: string;
  help: string;
  tone?: "default" | "loss";
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${label}: ${value}. ${help}`}
        className={cn(
          "flex w-full flex-col items-center gap-0.5 rounded-2xl border-2 border-b-4 border-[#2b1d12]/70 bg-[#fff8e7] px-1 py-2 shadow-sm",
          tone === "loss" && "bg-red-50",
        )}
      >
        {icon}
        <span className={cn(GAME_TEXT, "text-[15px] leading-none", tone === "loss" && "text-loss")}>
          {value}
        </span>
        <span className="text-[10px] font-bold uppercase leading-none text-muted-foreground">
          {label}
        </span>
      </button>
      {open && (
        <p
          role="note"
          className="absolute start-full top-0 z-30 ms-2 w-44 rounded-xl border-2 border-[#2b1d12]/70 bg-white p-2 text-xs font-semibold shadow-lg"
        >
          {help}
        </p>
      )}
    </div>
  );
}

/** Left rail: cash, year (and age), buildings built, debt when there is any. */
export function SideStats({ state, chapter }: { state: GameState; chapter: Chapter | undefined }) {
  const t = useTranslations("village");
  const turn = Math.min(state.turn + 1, state.totalTurns);
  const age = chapter
    ? chapter.ageRange[0] +
      Math.floor((state.turn / state.totalTurns) * (chapter.ageRange[1] - chapter.ageRange[0]))
    : undefined;
  const built = state.tasks.filter((x) => x.status === "done").length;
  return (
    <aside className="flex w-[66px] shrink-0 flex-col gap-2" aria-label={t("statsLabel")}>
      <RailStat
        icon={<Coins className="size-6 text-[#d4a017]" aria-hidden />}
        value={formatShort(state.cash)}
        label={t("cash")}
        help={t("cashHelp", {
          amount: formatPaise(state.cash),
          real: formatPaise(Math.round(state.cash / state.inflationIndex)),
        })}
      />
      <RailStat
        icon={<CalendarDays className="size-6 text-[#2d7fe0]" aria-hidden />}
        value={`${turn}/${state.totalTurns}`}
        label={t("turnShort", { unit: state.turnUnit })}
        help={t("yearHelp", { unit: state.turnUnit, turn, total: state.totalTurns, age: age ?? 0 })}
      />
      <RailStat
        icon={<Hammer className="size-6 text-[#8a5a2b]" aria-hidden />}
        value={`${built}/${state.tasks.length}`}
        label={t("built")}
        help={t("builtHelp")}
      />
      {state.debt > 0 && (
        <RailStat
          icon={<Landmark className="size-6 text-loss" aria-hidden />}
          value={formatShort(state.debt)}
          label={t("debt")}
          help={t("debtHelp")}
          tone="loss"
        />
      )}
    </aside>
  );
}

/** Right rail: each investment with its value and up/down since you put money in. */
export function InvestRail({ state, onOpenShop }: { state: GameState; onOpenShop: () => void }) {
  const t = useTranslations("village");
  const l = useLocalize();
  const running = state.sips.filter((s) => s.stoppedTurn === undefined);
  return (
    <aside className="flex w-[74px] shrink-0 flex-col gap-2" aria-label={t("investLabel")}>
      <button
        type="button"
        onClick={onOpenShop}
        className="flex flex-col items-center gap-0.5 rounded-2xl border-2 border-b-4 border-[#1d5aa6] bg-gradient-to-b from-[#5cb8ff] to-[#2d7fe0] px-1 py-2 text-white shadow-sm"
      >
        <Plus className="size-6" aria-hidden />
        <span className={cn(GAME_TEXT, "text-[13px] leading-none")}>{t("invest")}</span>
      </button>
      {state.holdings.length === 0 && running.length === 0 && (
        <p className="rounded-xl bg-white/70 p-1.5 text-center text-[10px] font-semibold text-muted-foreground">
          {t("noInvestments")}
        </p>
      )}
      {state.holdings.map((h) => {
        const opt = content.options.options.find((o) => o.id === h.optionId);
        if (!opt) return null;
        const pct = h.invested > 0 ? (h.value - h.invested) / h.invested : 0;
        const up = pct >= 0;
        const sip = running.find((s) => s.optionId === h.optionId);
        return (
          <button
            key={h.optionId}
            type="button"
            onClick={onOpenShop}
            title={l(opt.name)}
            aria-label={t("holdingLabel", {
              name: l(opt.name),
              value: formatPaise(h.value),
              change: `${up ? "+" : "−"}${Math.abs(Math.round(pct * 100))}%`,
            })}
            className="flex flex-col items-center gap-0.5 rounded-2xl border-2 border-[#2b1d12]/60 bg-[#fff8e7] px-1 py-1.5 shadow-sm"
          >
            <span className="grid size-8 place-items-center rounded-full bg-accent">
              <ContentIcon name={opt.icon} className="size-4" />
            </span>
            <span className={cn(GAME_TEXT, "text-[13px] leading-none")}>
              {formatShort(h.value)}
            </span>
            <span
              className={cn(
                "flex items-center text-[10px] font-extrabold leading-none",
                up ? "text-gain" : "text-loss",
              )}
            >
              {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {Math.abs(Math.round(pct * 100))}%
            </span>
            {sip && (
              <span className="rounded-full bg-secondary/15 px-1 text-[9px] font-bold text-secondary">
                {t("sipTag", { amount: formatShort(sip.amountPerMonth) })}
              </span>
            )}
          </button>
        );
      })}
    </aside>
  );
}

/** The ground: the Town Hall and one plot per task. */
export function VillageGround({
  state,
  chapter,
  onPlot,
}: {
  state: GameState;
  chapter: Chapter | undefined;
  onPlot: (taskId: string) => void;
}) {
  const t = useTranslations("village");
  const l = useLocalize();
  const reduce = useReducedMotion();
  return (
    <section
      aria-label={t("groundLabel")}
      className="relative min-w-0 flex-1 rounded-3xl border-[3px] border-[#2b1d12]/70 p-2 shadow-inner"
      style={GRASS_STYLE}
    >
      <div className="mx-auto flex w-[150px] flex-col items-center">
        <TownHallArt className="h-20 w-full drop-shadow" />
        <span
          className={cn(
            GAME_TEXT,
            "-mt-1 rounded-full border-2 border-[#2b1d12]/70 bg-[#7c3aed] px-2 text-xs text-white",
          )}
        >
          {t("townHall", { level: chapter?.order ?? 1 })}
        </span>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-1.5 gap-y-2">
        {state.tasks.map((task) => {
          const def = chapter?.tasks.find((d) => d.id === task.taskId);
          if (!def) return null;
          const stage = stageOf(task);
          const dueNow = task.dueTurn === state.turn + 1 && task.status === "open";
          return (
            <li key={task.taskId}>
              <button
                type="button"
                onClick={() => onPlot(task.taskId)}
                className="group flex w-full flex-col items-center rounded-2xl p-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                aria-label={`${l(def.title)}: ${t(`stage.${stage}`)}`}
              >
                <motion.div
                  key={stage}
                  initial={reduce || stage !== "building" ? false : { scale: 0.5, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 14 }}
                  className="relative w-full"
                >
                  <PlotArt
                    stage={stage}
                    kind={def.kind}
                    late={task.status === "late"}
                    className={cn(
                      "h-[68px] w-full",
                      stage === "flag" && dueNow && "animate-bounce",
                    )}
                  />
                  {(stage === "building" || stage === "scaffold") && (
                    <span className="absolute start-1/2 top-[38%] grid size-6 -translate-x-1/2 place-items-center rounded-full border-2 border-[#2b1d12]/70 bg-white">
                      <ContentIcon name={def.icon} className="size-3.5" />
                    </span>
                  )}
                  {stage === "building" && (
                    <span className="absolute end-1 top-0 text-base" aria-hidden>
                      ⭐
                    </span>
                  )}
                </motion.div>
                <span
                  className={cn(
                    GAME_TEXT,
                    "w-full truncate text-center text-[12px] leading-tight text-white drop-shadow-[0_1px_0_rgb(43_29_18)]",
                  )}
                >
                  {l(def.shortTitle ?? def.title)}
                </span>
                <PlotChip task={task} state={state} dueNow={dueNow} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PlotChip({ task, state, dueNow }: { task: TaskState; state: GameState; dueNow: boolean }) {
  const t = useTranslations("village");
  const base =
    "mt-0.5 rounded-full border-2 border-[#2b1d12]/60 px-1.5 text-[10px] font-extrabold leading-4";
  if (task.status === "done")
    return <span className={cn(base, "bg-[#fff3b0]")}>{t("stage.building")}</span>;
  if (task.status === "missed" || task.status === "blocked") {
    return <span className={cn(base, "bg-gray-200")}>{t("stage.ruins")}</span>;
  }
  return (
    <span
      className={cn(
        base,
        task.status === "late" ? "bg-red-500 text-white" : dueNow ? "bg-[#ffd84d]" : "bg-white",
      )}
    >
      {formatShort(task.amount - task.paid)} ·{" "}
      {task.status === "late"
        ? t("late")
        : t("dueShort", { unit: state.turnUnit, turn: task.dueTurn })}
    </span>
  );
}

/** Bottom sheet for one plot: what it is, what's left to pay, and one Build button. */
export function TaskSheet({
  task,
  def,
  state,
  payAction,
  onBuild,
  onClose,
}: {
  task: TaskState;
  def: Task;
  state: GameState;
  payAction: ActionOption | undefined;
  onBuild: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("village");
  const tp = useTranslations("play");
  const l = useLocalize();
  const stage = stageOf(task);
  const left = task.amount - task.paid;
  const pct = task.amount > 0 ? Math.round((task.paid / task.amount) * 100) : 0;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={l(def.title)}
    >
      <div
        className="w-full max-w-md rounded-3xl border-[3px] border-[#2b1d12]/80 bg-[#fff8e7] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <PlotArt
            stage={stage}
            kind={def.kind}
            late={task.status === "late"}
            className="h-20 w-24 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h2 className={cn(GAME_TEXT, "text-xl leading-tight")}>{l(def.title)}</h2>
            <div className="mt-1 flex flex-wrap gap-1 text-[11px] font-bold">
              <span className="rounded-full bg-accent px-2">{tp(`kind.${def.kind}`)}</span>
              {def.required && (
                <span className="rounded-full bg-primary/15 px-2 text-primary">
                  {tp("required")}
                </span>
              )}
              <span className="rounded-full bg-white px-2">
                {tp("due", { unit: state.turnUnit, turn: task.dueTurn })}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t("close")} className="p-1">
            <X className="size-5" />
          </button>
        </div>
        {def.description && <p className="mt-2 text-sm">{l(def.description)}</p>}
        <div className="mt-3">
          <div className="flex justify-between text-xs font-bold">
            <span>
              {tp("paidOf", { paid: formatPaise(task.paid), amount: formatPaise(task.amount) })}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full border-2 border-[#2b1d12]/60 bg-white">
            <div className="h-full bg-[#7ee04f]" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {task.status === "done" ? (
          <p className={cn(GAME_TEXT, "mt-4 text-center text-lg text-gain")}>{t("builtDone")}</p>
        ) : stage === "ruins" ? (
          <p className="mt-4 text-center text-sm font-semibold text-muted-foreground">
            {t("ruinsHelp")}
          </p>
        ) : (
          <GameButton
            tone="green"
            className="mt-4 w-full"
            disabled={!payAction || Boolean(payAction.disabledReason)}
            onClick={onBuild}
          >
            <Hammer aria-hidden /> {t("buildFor", { amount: formatShort(left) })}
          </GameButton>
        )}
      </div>
    </div>
  );
}
