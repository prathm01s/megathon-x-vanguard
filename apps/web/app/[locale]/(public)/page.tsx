import { GraduationCap, Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { buttonVariants } from "@/components/ui/button";
import { AppShell } from "@/components/ui/app-shell";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Welcome screen (§4.2, §9.2 #1). Owner: Prathmesh (public flow); visuals by Pragya.
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
        <div className="flex flex-col gap-3">
          <Link href="/join" className={cn(buttonVariants({ size: "lg" }))}>
            <GraduationCap aria-hidden />
            {t("welcome.student")}
          </Link>
          <Link href="/admin" className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}>
            <Building2 aria-hidden />
            {t("welcome.ngo")}
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("welcome.haveAccount")}{" "}
          <Link href="/" className="font-semibold text-primary underline underline-offset-4">
            {t("welcome.login")}
          </Link>
        </p>
      </section>
    </AppShell>
  );
}
