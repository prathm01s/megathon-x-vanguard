import { Building2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { buttonVariants } from "@/components/ui/button";
import { AppShell } from "@/components/ui/app-shell";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Student path choice (§4.2, §9.2 #2).
export default function JoinPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("studentPath");

  return (
    <AppShell>
      <section className="flex flex-1 flex-col justify-center gap-6 py-6 text-center">
        <h1 className="text-2xl font-extrabold">{t("title")}</h1>
        <div className="flex flex-col gap-3">
          <Link href="/mindset" className={cn(buttonVariants({ size: "lg" }))}>
            <Sparkles aria-hidden />
            {t("personal")}
          </Link>
          <div className="rounded-xl border border-border bg-card p-4 text-start space-y-2 opacity-95">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Building2 className="size-4 text-secondary" />
              <span>{t("ngo")}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Have a Student Code (XXXX-XXXX) from your teacher? Enter it below:
            </p>
            <div className="flex gap-2">
              <input
                disabled
                placeholder="XXXX-XXXX"
                className="flex-1 rounded-lg border-2 border-border bg-muted/40 px-3 py-2 text-sm font-mono uppercase tracking-widest text-muted-foreground"
              />
              <Link href="/mindset" className={cn(buttonVariants({ variant: "outline" }), "text-xs font-bold")}>
                Start
              </Link>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
