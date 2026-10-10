"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALES, type AppLocale } from "@/i18n/routing";

/** Language switcher shown in every screen header (§9.3). */
export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">{t("label")}</span>
      <select
        className="min-h-11 rounded-lg border-2 border-border bg-card px-2 font-semibold"
        value={locale}
        disabled={pending}
        onChange={(e) =>
          startTransition(() => router.replace(pathname, { locale: e.target.value as AppLocale }))
        }
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {t(l)}
          </option>
        ))}
      </select>
    </label>
  );
}
