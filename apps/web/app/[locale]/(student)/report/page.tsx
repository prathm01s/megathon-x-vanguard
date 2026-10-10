import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { LifeReportScreen } from "@/components/game/life-report";
import { AppShell } from "@/components/ui/app-shell";

export default function ReportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return (
    <AppShell>
      <LifeReportScreen />
    </AppShell>
  );
}
