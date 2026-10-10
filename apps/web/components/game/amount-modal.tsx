"use client";

// Quick-pick amounts (team feedback 2026-10-11: no money slider). Three big buttons with
// ready-made amounts; one tap does the action. Paying for a task doesn't use this at all: the
// village's Build button pays in one tap.
import { AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";
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
        className="w-full max-w-md rounded-3xl border-[3px] border-[#2b1d12]/80 bg-[#fff8e7] p-4 text-[#2b1d12] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className={cn(GAME_TEXT, "text-xl leading-tight")}>{title}</h2>
          <button type="button" onClick={onClose} aria-label={tc("close")} className="p-1">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-0.5 text-sm font-semibold text-[#6b5a45]">
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

        <div className="mt-3 grid gap-2">
          {picks.length === 0 && (
            <p className="text-center text-sm font-semibold text-[#6b5a45]">{t("notEnough")}</p>
          )}
          {picks.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onConfirm(p.amount)}
              className={cn(
                GAME_TEXT,
                "flex min-h-14 items-center justify-between rounded-2xl border-2 border-b-[5px] border-[#2a7419] bg-gradient-to-b from-[#7ee04f] to-[#3fa52a] px-4 text-lg text-white active:translate-y-[2px] active:border-b-[3px]",
              )}
            >
              <span>{t(`pick.${p.key}`)}</span>
              <span>
                {formatShort(p.amount)}
                {option.type === "sip_start" ? t("perMonth") : ""}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
