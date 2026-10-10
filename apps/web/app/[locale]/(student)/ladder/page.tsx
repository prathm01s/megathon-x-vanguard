import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { LifeLadder } from "@/components/game/life-ladder";
import { AppShell } from "@/components/ui/app-shell";

export default function LadderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <AppShell>
      <LifeLadder />
    </AppShell>
  );
}
