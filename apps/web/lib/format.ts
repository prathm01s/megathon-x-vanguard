// Money formatting for the UI. The engine works in integer paise; only the UI turns
// them into "₹1,00,000" (Indian digit grouping, §8.1).

const LOCALE_TAGS: Record<string, string> = { en: "en-IN", te: "te-IN", hi: "hi-IN", ur: "ur-IN" };

/** Formats paise as rupees with Indian grouping, e.g. 10000000 → "₹1,00,000". */
export function formatPaise(
  paise: number,
  locale = "en",
  opts: { decimals?: boolean } = {},
): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale] ?? "en-IN", {
    style: "currency",
    currency: "INR",
    // Latin digits everywhere for now; switch per locale once Pragya confirms with NGOs.
    numberingSystem: "latn",
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  }).format(paise / 100);
}

/** Formats a rate such as 0.0675 as "6.75%". */
export function formatRate(rate: number, locale = "en"): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale] ?? "en-IN", {
    style: "percent",
    numberingSystem: "latn",
    maximumFractionDigits: 2,
  }).format(rate);
}
