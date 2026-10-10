import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { BackButton } from "./back-button";
import { HeaderNav } from "./header-nav";
import { LanguageSwitcher } from "./language-switcher";

/** Mobile-first shell, designed at 360px wide (§9.1). */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations("app");
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <BackButton />
          <Link
            href="/"
            aria-label={t("name")}
            className="flex min-h-11 items-center gap-2 text-lg font-extrabold"
          >
            <span aria-hidden className="inline-block size-7 rounded-full bg-coin shadow-inner" />
            {/* Phones show just the coin, so the back arrow and buttons fit on one line. */}
            <span className="hidden whitespace-nowrap sm:inline">{t("name")}</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <HeaderNav />
        </div>
      </header>
      <main className="flex flex-1 flex-col px-4 pb-6">{children}</main>
    </div>
  );
}
