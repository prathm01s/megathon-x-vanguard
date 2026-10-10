import type { Locale, LocalizedString } from "./schemas/common";

/** Picks the string for `locale`, falling back to English. */
export function localize(text: LocalizedString, locale: Locale): string {
  return text[locale] ?? text.en;
}

/** Fills `{placeholder}` tokens. Unknown tokens are left as-is so they are visible in QA. */
export function fillPlaceholders(text: string, params: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

export function placeholdersIn(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
}
