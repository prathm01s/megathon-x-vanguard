"use client";

import { AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPaise } from "@/lib/format";
import { paiseToRupees, rupeesToPaise, type ActionOption } from "@toss/engine";

export interface AmountModalProps {
  option: ActionOption;
  availableCash: number;
  currentRealValueIndex: number;
  onConfirm: (amountPaise: number) => void;
  onClose: () => void;
}

export function AmountModal({
  option,
  availableCash,
  currentRealValueIndex,
  onConfirm,
  onClose,
}: AmountModalProps) {
  const t = useTranslations("amount");
  const tc = useTranslations("common");
  const te = useTranslations("engine");

  const minPaise = option.minAmount ?? 100;
  const maxPaise = option.maxAmount ?? availableCash;

  const minRupees = Math.max(1, Math.ceil(paiseToRupees(minPaise)));
  const maxRupees = Math.max(minRupees, Math.floor(paiseToRupees(maxPaise)));

  // Default to max for tasks, min for investments
  const defaultRupees = option.type === "pay_task" ? maxRupees : Math.min(minRupees * 5, maxRupees);
  const [rupees, setRupees] = useState<number>(defaultRupees);

  const amountPaise = rupeesToPaise(rupees);
  const realValuePaise = Math.round(amountPaise / currentRealValueIndex);

  function getTitle() {
    switch (option.type) {
      case "pay_task":
        return t("payTitle", { name: option.label.en });
      case "invest":
        return t("investTitle", { name: option.label.en });
      case "withdraw":
        return t("withdrawTitle", { name: option.label.en });
      case "sip_start":
        return t("sipTitle", { name: option.label.en });
      default:
        return option.label.en;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-5 shadow-2xl animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold leading-tight">{getTitle()}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={tc("close")}>
            <X className="size-5" />
          </Button>
        </div>

        {/* Amount & Real value preview */}
        <div className="rounded-xl bg-accent/40 p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
            {t("label")}
          </p>
          <p className="text-3xl font-extrabold tabular-nums text-foreground">
            {formatPaise(amountPaise)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real Value:{" "}
            <span className="font-bold text-secondary">{formatPaise(realValuePaise)}</span>
          </p>
        </div>

        {/* Warnings if any */}
        {option.warning && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 p-2.5 text-xs font-semibold text-primary">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <p>
              {option.warning === "early_break_penalty"
                ? te("warning.early_break_penalty", { penalty: formatPaise(option.penalty ?? 0) })
                : te(`warning.${option.warning}`)}
            </p>
          </div>
        )}

        {/* Slider & number input */}
        <div className="space-y-3">
          <input
            type="range"
            min={minRupees}
            max={maxRupees}
            step={Math.max(1, Math.floor((maxRupees - minRupees) / 100))}
            value={rupees}
            onChange={(e) => setRupees(Number(e.target.value))}
            className="w-full accent-primary"
          />

          {/* Quick presets */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="default"
              className="flex-1 text-xs font-bold"
              onClick={() => setRupees(Math.max(minRupees, Math.round(maxRupees * 0.25)))}
            >
              {t("quarter")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="default"
              className="flex-1 text-xs font-bold"
              onClick={() => setRupees(Math.max(minRupees, Math.round(maxRupees * 0.5)))}
            >
              {t("half")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="default"
              className="flex-1 text-xs font-bold"
              onClick={() => setRupees(maxRupees)}
            >
              {t("max")}
            </Button>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Min: {formatPaise(minPaise)}</span>
            <span>Max: {formatPaise(maxPaise)}</span>
          </div>
        </div>

        {option.type === "sip_start" && (
          <p className="text-xs text-muted-foreground italic text-center">{t("sipHint")}</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button
            className="flex-1"
            disabled={rupees < minRupees || rupees > maxRupees}
            onClick={() => onConfirm(rupeesToPaise(rupees))}
          >
            {tc("confirm")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
