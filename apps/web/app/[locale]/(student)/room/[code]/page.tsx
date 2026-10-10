import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { AppShell } from "@/components/ui/app-shell";
import { RoomScreen } from "@/components/multiplayer/room-screen";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({
    locale,
    code: "TOSS42",
  }));
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = use(params);
  setRequestLocale(locale);

  return (
    <AppShell>
      <RoomScreen code={code.toUpperCase()} />
    </AppShell>
  );
}
