import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { WelcomeActions } from "@/components/auth/welcome-actions";
import { AppShell } from "@/components/ui/app-shell";

// Welcome screen (§4.2, §9.2 #1): Log in or Create account. Owner: Prathmesh (public flow).
export default function WelcomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations();

  return (
    <AppShell>
      <section className="flex flex-1 flex-col justify-center gap-8 py-8 text-center">
        <div className="space-y-3">
          <div
            aria-hidden
            className="mx-auto size-24 rounded-full bg-coin shadow-lg ring-8 ring-coin/30"
          />
          <h1 className="text-3xl font-extrabold">{t("app.name")}</h1>
          <p className="text-lg text-muted-foreground">{t("app.tagline")}</p>
        </div>
        <WelcomeActions />
      </section>
    </AppShell>
  );
}
