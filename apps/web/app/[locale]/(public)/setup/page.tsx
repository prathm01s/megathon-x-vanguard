import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { ProfileSetupForm } from "@/components/auth/auth-forms";
import { AppShell } from "@/components/ui/app-shell";

export default function Page({ params }: PageProps<"/[locale]/setup">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <AppShell>
      <ProfileSetupForm />
    </AppShell>
  );
}
