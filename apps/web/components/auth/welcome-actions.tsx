"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { avatarEmoji, homeFor } from "@/lib/auth/account";
import { useSession } from "@/lib/data";
import { cn } from "@/lib/utils";

/** Signed out: Log in / Create account. Signed in: one Continue button to where you belong. */
export function WelcomeActions() {
  const t = useTranslations("auth");
  const session = useSession();

  if (session.status === "loading") return <div className="min-h-32" aria-hidden />;

  if (session.status === "ready" || session.status === "needs-setup") {
    const name = session.profile?.nickname;
    return (
      <div className="flex flex-col gap-3">
        {name && (
          <p className="text-base font-semibold">
            <span aria-hidden>{avatarEmoji(session.profile?.avatarId)} </span>
            {t("welcomeBack", { name })}
          </p>
        )}
        <Link href={homeFor(session)} className={cn(buttonVariants({ size: "lg" }))}>
          {session.status === "needs-setup" ? t("finishSetup") : t("continue")}
          <ArrowRight aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
        {t("welcomeLogin")}
      </Link>
      <Link href="/signup" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
        {t("welcomeSignup")}
      </Link>
    </div>
  );
}
