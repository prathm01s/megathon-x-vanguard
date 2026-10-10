"use client";

// Choose an amount to invest, take out or put in monthly: drag the slider to any amount, or tap
// a ready-made one (a little / half / all). Paying for a task doesn't use this: the village's
// Build button pays in one tap.
import { AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ActionOption } from "@toss/engine";
import { formatPaise, formatShort } from "@/lib/format";
import { GAME_TEXT } from "@/lib/game-style";
import { cn } from "@/lib/utils";
import { useLocalize } from "./use-localize";

export interface AmountModalProps {
  option: ActionOption;
  availableCash: number;
  currentRealValueIndex: number;
  /** Monthly income, for monthly (SIP / RD) suggestions. */
  incomePerMonth?: number;
  onConfirm: (amountPaise: number) => void;
  onClose: () => void;
}

const ROUND = 100_00; // suggestions are whole hundreds of rupees

interface Pick {
  key: string;
  amount: number;
}

/** Ready-made amounts for an action, smallest first, within the allowed range. */
export function quickPicks(option: ActionOption, cash: number, incomePerMonth = 0): Pick[] {
  const min = option.minAmount ?? 1;
  const round = (p: number) => Math.max(min, Math.floor(p / ROUND) * ROUND);
  let picks: Pick[];
  if (option.type === "sip_start") {
    picks = [0.05, 0.1, 0.2].map((share) => ({
      key: `monthly${Math.round(share * 100)}`,
      amount: round(incomePerMonth * share),
    }));
  } else {
    const max = option.maxAmount ?? cash;
    picks = [
      { key: "quarter", amount: round(max * 0.25) },
      { key: "half", amount: round(max * 0.5) },
      { key: "all", amount: max },
    ];
    picks = picks.filter((p) => p.amount <= max);
  }
  const seen = new Set<number>();
  return picks.filter(
    (p) => p.amount >= min && p.amount > 0 && !seen.has(p.amount) && seen.add(p.amount),
  );
}

export function AmountModal({
  option,
  availableCash,
  incomePerMonth,
  onConfirm,
  onClose,
}: AmountModalProps) {
  const t = useTranslations("amount");
  const tc = useTranslations("common");
  const te = useTranslations("engine");
  const l = useLocalize();
  const name = l(option.label);
  const picks = quickPicks(option, availableCash, incomePerMonth);
  const min = option.minAmount ?? ROUND;
  // Monthly plans can be up to half the monthly income; everything else up to the action's max.
  const max =
    option.type === "sip_start"
      ? Math.max(min, Math.floor(((incomePerMonth ?? 0) * 0.5) / ROUND) * ROUND)
      : (option.maxAmount ?? availableCash);
  const step = Math.max(ROUND, Math.round((max - min) / 100 / ROUND) * ROUND);
  const [amount, setAmount] = useState(() => picks[1]?.amount ?? picks[0]?.amount ?? min);
  const valid = amount >= min && amount <= max && max >= min;

  const title =
    option.type === "invest"
      ? t("investTitle", { name })
      : option.type === "withdraw"
        ? t("withdrawTitle", { name })
        : option.type === "sip_start"
          ? t("sipTitle", { name })
          : t("payTitle", { name });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-md rounded-3xl border-[3px] border-[#1e2a4a]/80 bg-[#f5f9ff] p-4 text-[#1e2a4a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className={cn(GAME_TEXT, "text-xl leading-tight")}>{title}</h2>
          <button type="button" onClick={onClose} aria-label={tc("close")} className="p-1">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-0.5 text-sm font-semibold text-[#55658a]">
          {option.type === "sip_start"
            ? t("sipHint")
            : t("available", { amount: formatPaise(availableCash) })}
        </p>

        {option.warning && (
          <p className="mt-2 flex items-start gap-2 rounded-xl border-2 border-[#b86e0a]/50 bg-[#fff3b0] p-2 text-xs font-bold">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#b86e0a]" aria-hidden />
            {option.warning === "early_break_penalty"
              ? te("warning.early_break_penalty", { penalty: formatPaise(option.penalty ?? 0) })
              : te(`warning.${option.warning}`)}
          </p>
        )}

        {max < min ? (
          <p className="mt-4 text-center text-sm font-semibold text-[#55658a]">{t("notEnough")}</p>
        ) : (
          <>
            <p className={cn(GAME_TEXT, "mt-3 text-center text-4xl")}>
              {formatPaise(amount)}
              {option.type === "sip_start" && <span className="text-lg">{t("perMonth")}</span>}
            </p>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              aria-label={t("label")}
              className="mt-2 h-3 w-full cursor-pointer accent-[#3fa52a]"
            />
            <div className="mt-1 flex justify-between text-xs font-bold text-[#55658a]">
              <span>{formatShort(min)}</span>
              <span>{formatShort(max)}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {picks.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setAmount(p.amount)}
                  className={cn(
                    "min-h-11 rounded-xl border-2 px-1 text-sm font-extrabold",
                    amount === p.amount
                      ? "border-[#2a7419] bg-[#dff7cf]"
                      : "border-[#1e2a4a]/30 bg-white",
                  )}
                >
                  {t(`pick.${p.key}`)}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!valid}
              onClick={() => onConfirm(amount)}
              className={cn(
                GAME_TEXT,
                "mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-b-[5px] border-[#2a7419] bg-gradient-to-b from-[#7ee04f] to-[#3fa52a] px-4 text-xl text-white active:translate-y-[2px] active:border-b-[3px] disabled:opacity-50",
              )}
            >
              {t("confirmAmount", { amount: formatShort(amount) })}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
