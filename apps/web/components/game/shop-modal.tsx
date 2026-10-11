"use client";

// The investment market, village style: a grid of stalls (icon, assumed return, risk dots,
// what you hold) with big buttons. The longer description and lesson open from ⓘ on demand.
import { BookOpen, Info, Lock, Repeat, TrendingDown, TrendingUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { GameButton } from "@/components/ui/game-button";
import { content } from "@/lib/content";
import { formatShort } from "@/lib/format";
import { GAME_TEXT, INK, MUTED, PANEL } from "@/lib/game-style";
import { cn } from "@/lib/utils";
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

const CATEGORY_COLOR: Record<string, string> = {
  bank: "#dbeafe",
  deposit: "#e0e7ff",
  market: "#dcfce7",
  commodity: "#fef3c7",
  mix: "#fae8ff",
  cash: "#f1f5f9",
};

function RiskDots({ level }: { level: number }) {
  return (
    <span className="flex gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-2 rounded-full border border-[#1e2a4a]/40",
            i < level
              ? level >= 4
                ? "bg-[#ef4444]"
                : level >= 3
                  ? "bg-[#f59e0b]"
                  : "bg-[#22c55e]"
              : "bg-white",
          )}
        />
      ))}
    </span>
  );
}

export function ShopModal({ state, availableActions, onSelectAction, onClose }: ShopModalProps) {
  const t = useTranslations("shop");
  const tc = useTranslations("common");
  const l = useLocalize();
  const [openInfo, setOpenInfo] = useState<string | null>(null);
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
    ? content.techniques.techniques.find((x) => x.id === activeTechniqueId)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-2"
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-[3px] shadow-2xl"
        style={{ borderColor: INK, background: PANEL, color: INK }}
      >
        <header className="flex items-center justify-between gap-2 border-b-2 border-[#1e2a4a]/15 bg-[#dcfce7] px-4 py-3">
          <div className="min-w-0">
            <h2 className={cn(GAME_TEXT, "text-2xl leading-tight")}>{t("title")}</h2>
            <p className="text-xs font-bold" style={{ color: MUTED }}>
              {t("cashToSpend", { amount: formatShort(state.cash) })}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={tc("close")} className="p-2">
            <X className="size-6" />
          </button>
        </header>

        <div className="grid flex-1 grid-cols-2 gap-2.5 overflow-y-auto p-3">
          {unlocked.map((opt) => {
            const holding = holdingByOption.get(opt.id);
            const sip = sipByOption.get(opt.id);
            const find = (type: ActionOption["type"]) =>
              availableActions.find((a) => a.type === type && a.targetId === opt.id);
            const investAction = find("invest");
            const withdrawAction = find("withdraw");
            const sipStartAction = find("sip_start");
            const sipStopAction = find("sip_stop");
            const lockedForLevel = !investAction && !sipStartAction && !holding && !sip;
            const pct =
              holding && holding.invested > 0
                ? (holding.value - holding.invested) / holding.invested
                : 0;
            const technique = opt.techniqueIds[0]
              ? content.techniques.techniques.find((x) => x.id === opt.techniqueIds[0])
              : null;
            const infoOpen = openInfo === opt.id;

            return (
              <article
                key={opt.id}
                className={cn(
                  "flex flex-col gap-1.5 rounded-2xl border-[3px] bg-white p-2.5",
                  lockedForLevel && "opacity-60 grayscale",
                  infoOpen && "col-span-2",
                )}
                style={{ borderColor: INK }}
              >
                <div className="flex items-start justify-between gap-1">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-full border-2"
                    style={{
                      borderColor: INK,
                      background: CATEGORY_COLOR[opt.category] ?? "#f1f5f9",
                    }}
                  >
                    <ContentIcon name={opt.icon} className="size-5" />
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenInfo(infoOpen ? null : opt.id)}
                    aria-expanded={infoOpen}
                    aria-label={t("about", { name: l(opt.name) })}
                    className="grid size-9 place-items-center rounded-full border-2 border-[#1e2a4a]/25"
                  >
                    <Info className="size-4" />
                  </button>
                </div>
                <h3 className={cn(GAME_TEXT, "text-base leading-tight")}>{l(opt.name)}</h3>
                <AssumedReturn rate={opt.assumedAverageReturn} />
                <div
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold"
                  style={{ color: MUTED }}
                >
                  <span className="flex items-center gap-1">
                    {t("risk")} <RiskDots level={opt.riskLevel} />
                  </span>
                  {opt.liquidity === "locked_until_maturity" && (
                    <span className="flex items-center gap-0.5">
                      <Lock className="size-3" /> {t("lockedMonths", { months: opt.lockMonths })}
                    </span>
                  )}
                </div>

                {holding && (
                  <p className={cn(GAME_TEXT, "flex items-center gap-1 text-base")}>
                    {formatShort(holding.value)}
                    <span
                      className={cn(
                        "flex items-center text-xs",
                        pct >= 0 ? "text-[#15803d]" : "text-[#b91c1c]",
                      )}
                    >
                      {pct >= 0 ? (
                        <TrendingUp className="size-3.5" />
                      ) : (
                        <TrendingDown className="size-3.5" />
                      )}
                      {Math.abs(Math.round(pct * 100))}%
                    </span>
                  </p>
                )}
                {sip && (
                  <p className="flex items-center justify-between gap-1 rounded-lg bg-[#e0f2fe] px-1.5 py-0.5 text-[11px] font-extrabold text-[#0369a1]">
                    <span className="flex items-center gap-1">
                      <Repeat className="size-3" />{" "}
                      {t("monthlyRunning", { amount: formatShort(sip.amountPerMonth) })}
                    </span>
                    {sipStopAction && (
                      <button
                        type="button"
                        className="text-[#b91c1c] underline"
                        onClick={() => onSelectAction(sipStopAction)}
                      >
                        {t("stop")}
                      </button>
                    )}
                  </p>
                )}

                {infoOpen && (
                  <div className="space-y-1.5 rounded-xl bg-[#f5f9ff] p-2 text-xs font-semibold">
                    <p>{l(opt.description)}</p>
                    <p>
                      <span className="font-extrabold">{t("lesson")}:</span> {l(opt.lesson)}
                    </p>
                    {technique && (
                      <button
                        type="button"
                        onClick={() => setActiveTechniqueId(technique.id)}
                        className="flex items-center gap-1 font-extrabold text-[#0f766e] underline"
                      >
                        <BookOpen className="size-3.5" /> {t("learn", { name: l(technique.title) })}
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-auto flex flex-col gap-1.5 pt-1">
                  {lockedForLevel ? (
                    <p
                      className="flex items-center justify-center gap-1 rounded-xl bg-[#f1f5f9] py-2 text-xs font-extrabold"
                      style={{ color: MUTED }}
                    >
                      <Lock className="size-3.5" /> {t("lockedLevel")}
                    </p>
                  ) : (
                    <>
                      {investAction && (
                        <GameButton
                          tone="green"
                          className="min-h-10 w-full rounded-xl px-2 text-sm"
                          disabled={Boolean(investAction.disabledReason)}
                          onClick={() => onSelectAction(investAction)}
                        >
                          {t("putIn")}
                        </GameButton>
                      )}
                      {sipStartAction && !sip && (
                        <GameButton
                          tone="blue"
                          className="min-h-10 w-full rounded-xl px-2 text-sm"
                          onClick={() => onSelectAction(sipStartAction)}
                        >
                          <Repeat aria-hidden /> {t("startSip")}
                        </GameButton>
                      )}
                      {withdrawAction && (
                        <GameButton
                          tone="stone"
                          className="min-h-10 w-full rounded-xl px-2 text-sm"
                          onClick={() => onSelectAction(withdrawAction)}
                        >
                          {t("takeOut")}
                        </GameButton>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <p
          className="border-t-2 border-[#1e2a4a]/10 px-4 py-2 text-[11px] font-semibold"
          style={{ color: MUTED }}
        >
          {t("subtitle")}
        </p>
      </div>

      {activeTechnique && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-sm space-y-3 rounded-3xl border-[3px] bg-white p-4 shadow-2xl"
            style={{ borderColor: INK, color: INK }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className={cn(GAME_TEXT, "text-lg")}>{l(activeTechnique.title)}</h3>
                <p className="text-xs font-semibold" style={{ color: MUTED }}>
                  {l(activeTechnique.shortExplanation)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTechniqueId(null)}
                aria-label={tc("close")}
                className="p-1"
              >
                <X className="size-5" />
              </button>
            </div>
            <TechniqueVisual visualId={activeTechnique.visual} />
            <GameButton tone="green" className="w-full" onClick={() => setActiveTechniqueId(null)}>
              {tc("close")}
            </GameButton>
          </div>
        </div>
      )}
    </div>
  );
}
