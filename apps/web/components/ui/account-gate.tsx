"use client";

import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { homeFor } from "@/lib/auth/account";
import { useSession, type Role } from "@/lib/data";

/**
 * Shows a page only to a signed-in user with a finished profile of the given role; everyone else
 * is sent where they belong (log in, set up the profile, or their own home). In mock mode (no
 * Supabase) the mock student is always signed in, so nothing changes there.
 */
export function AccountGate({ role, children }: { role: Role; children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const t = useTranslations("common");
  const allowed = session.status === "ready" && session.role === role;

  useEffect(() => {
    if (session.status === "loading" || allowed) return;
    router.replace(homeFor(session));
  }, [session, allowed, router]);

  if (!allowed) {
    return (
      <p role="status" className="py-16 text-center text-muted-foreground">
        {t("loading")}
      </p>
    );
  }
  return <>{children}</>;
}
