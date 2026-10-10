import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { MindsetChanges } from "@/components/game/mindset-changes";
import { AppShell } from "@/components/ui/app-shell";

export default function ChangesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <AppShell>
      <MindsetChanges />
    </AppShell>
  );
}
