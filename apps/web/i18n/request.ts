import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // Missing keys in a locale fall back to English.
  const en = (await import("../messages/en.json")).default;
  const messages =
    locale === "en" ? en : deepMerge(en, (await import(`../messages/${locale}.json`)).default);

  return { locale, messages };
});

type Messages = { [key: string]: string | Messages };

function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = out[key];
    out[key] =
      typeof value === "object" && typeof existing === "object"
        ? deepMerge(existing, value)
        : value;
  }
  return out;
}
