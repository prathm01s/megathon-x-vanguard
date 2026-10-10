import { defineRouting } from "next-intl/routing";

export const LOCALES = ["en", "te", "hi", "ur"] as const;
export type AppLocale = (typeof LOCALES)[number];

/** Urdu is right-to-left (§9.3). Use logical Tailwind utilities (ms-, me-, ps-, pe-). */
export const RTL_LOCALES: readonly AppLocale[] = ["ur"];

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "en",
  localePrefix: "always",
});

export function dirFor(locale: string): "ltr" | "rtl" {
  return RTL_LOCALES.includes(locale as AppLocale) ? "rtl" : "ltr";
}
