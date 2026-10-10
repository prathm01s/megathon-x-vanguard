import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { ProfileScreen } from "@/components/game/profile";
import { AppShell } from "@/components/ui/app-shell";

export default function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return (
    <AppShell>
      <ProfileScreen />
    </AppShell>
  );
}
