"use client";

import type { Locale, LocalizedString } from "@toss/content";
import { useLocale } from "next-intl";
import { useCallback } from "react";
import { fillPlaceholders, localize } from "@/lib/content";
import { formatPaise } from "@/lib/format";

/**
 * Returns `l(text, params?)` that picks the current locale (English fallback) and fills
 * `{placeholders}`. Game content text always goes through this; UI chrome uses next-intl.
 */
export function useLocalize() {
  const locale = useLocale() as Locale;
  return useCallback(
    (text: LocalizedString | undefined, params?: Record<string, string | number>) => {
      if (!text) return "";
      const s = localize(text, locale);
      return params ? fillPlaceholders(s, params) : s;
    },
    [locale],
  );
}

/** `money(paise)` → "₹1,00,000" in the current locale. */
export function useMoney() {
  const locale = useLocale();
  return useCallback((paise: number) => formatPaise(paise, locale), [locale]);
}
