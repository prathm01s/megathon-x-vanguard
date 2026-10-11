import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { SessionDetail } from "@/components/game/time-machine/time-machine";
import { AppShell } from "@/components/ui/app-shell";
import { routing } from "@/i18n/routing";

// Session ids live on the device and in the account, so pages are rendered on demand; one
// placeholder keeps the static build happy (same pattern as the room page).
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale, id: "latest" }));
}

export const instant = false;

export default function SessionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = use(params);
  setRequestLocale(locale);
  return (
    <AppShell>
      <SessionDetail id={id} />
    </AppShell>
  );
}
