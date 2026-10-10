import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";

/** Mobile-first shell, designed at 360px wide (§9.1). */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations("app");
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex min-h-11 items-center gap-2 text-lg font-extrabold">
          <span aria-hidden className="inline-block size-7 rounded-full bg-coin shadow-inner" />
          {t("name")}
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 flex-col px-4 pb-6">{children}</main>
    </div>
  );
}
