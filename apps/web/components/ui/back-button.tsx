"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

/** Back arrow in the header on every screen except the welcome screen. */
export function BackButton() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/") return null;
  return (
    <button
      type="button"
      aria-label={t("back")}
      title={t("back")}
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className="grid size-11 shrink-0 place-items-center rounded-lg border-2 border-border bg-card text-foreground transition-colors hover:border-primary"
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}
