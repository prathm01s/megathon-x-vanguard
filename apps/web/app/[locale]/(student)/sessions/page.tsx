import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { SessionsList } from "@/components/game/time-machine/time-machine";
import { AppShell } from "@/components/ui/app-shell";

// The Time Machine: every saved chapter attempt.
export default function SessionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <AppShell>
      <SessionsList />
    </AppShell>
  );
}
