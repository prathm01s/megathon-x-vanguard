"use client";

import { LayoutDashboard, LogOut, User, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { signOutUser } from "@/lib/auth/actions";
import { refreshSession, useSession } from "@/lib/data";

const iconButton =
  "grid size-11 place-items-center rounded-lg border-2 border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-foreground";

/**
 * Header buttons that depend on who is signed in. Signed out (or still setting up the profile):
 * nothing. Students: Friends' Room + Profile. NGO admins: Dashboard + Log out.
 */
export function HeaderNav() {
  const t = useTranslations("auth");
  const session = useSession();
  const router = useRouter();

  if (session.status !== "ready") return null;

  if (session.role === "ngo_admin") {
    return (
      <>
        <Link
          href="/admin"
          aria-label={t("dashboard")}
          title={t("dashboard")}
          className={iconButton}
        >
          <LayoutDashboard className="size-5" />
        </Link>
        <button
          type="button"
          aria-label={t("logout")}
          title={t("logout")}
          className={iconButton}
          onClick={async () => {
            await signOutUser();
            await refreshSession();
            router.replace("/");
          }}
        >
          <LogOut className="size-5" />
        </button>
      </>
    );
  }

  return (
    <>
      <Link
        href="/room"
        aria-label={t("friendsRoom")}
        title={t("friendsRoom")}
        className={iconButton}
      >
        <Users className="size-5" />
      </Link>
      <Link href="/profile" aria-label={t("profile")} title={t("profile")} className={iconButton}>
        <User className="size-5" />
      </Link>
    </>
  );
}
