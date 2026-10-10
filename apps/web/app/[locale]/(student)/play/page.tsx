import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { TurnScreen } from "@/components/game/turn-screen";
import { AppShell } from "@/components/ui/app-shell";

// Chapter Turn screen (§9.2 #10). Owner: Pragya.
export default function PlayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return (
    <AppShell>
      <TurnScreen />
    </AppShell>
  );
}
