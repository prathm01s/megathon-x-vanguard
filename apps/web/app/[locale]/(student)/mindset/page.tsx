import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { MindsetCheck } from "@/components/game/mindset-check";
import { AppShell } from "@/components/ui/app-shell";

export default function MindsetPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <AppShell>
      <MindsetCheck phase="pre" />
    </AppShell>
  );
}
