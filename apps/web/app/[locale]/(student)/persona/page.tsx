import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { PersonaReveal } from "@/components/game/persona-reveal";
import { AppShell } from "@/components/ui/app-shell";

export default function PersonaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <AppShell>
      <PersonaReveal />
    </AppShell>
  );
}
