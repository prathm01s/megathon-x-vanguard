"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatPaise, formatRate } from "@/lib/format";

/** Amount next to its Real Value — the FD myth-buster shown beside every balance (§1, §7.3). */
export function MoneyPair({ amount, realValue }: { amount: number; realValue: number }) {
  const t = useTranslations("money");
  const locale = useLocale();
  return (
    <dl className="grid grid-cols-2 gap-2">
      <div>
        <dt className="text-sm text-muted-foreground">{t("amount")}</dt>
        <dd className="text-xl font-bold tabular-nums">{formatPaise(amount, locale)}</dd>
      </div>
      <div title={t("realValueHelp")}>
        <dt className="text-sm text-muted-foreground">{t("realValue")}</dt>
        <dd className="text-xl font-bold tabular-nums text-secondary">
          {formatPaise(realValue, locale)}
        </dd>
      </div>
    </dl>
  );
}

/** Every return shown to students carries the "assumed" chip (§1 guardrail). */
export function AssumedReturn({ rate }: { rate: number }) {
  const t = useTranslations("money");
  const locale = useLocale();
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-semibold tabular-nums">{formatRate(rate, locale)}</span>
      <abbr
        title={t("assumedTooltip")}
        className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground no-underline"
      >
        {t("assumed")}
      </abbr>
    </span>
  );
}
