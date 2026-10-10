import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AppShell } from "./app-shell";
import { Card } from "./card";

/** Temporary screen for routes that exist in the skeleton but aren't built yet. */
export function PlaceholderScreen({
  title,
  owner,
  children,
}: {
  title: string;
  owner: string;
  children?: ReactNode;
}) {
  const t = useTranslations("placeholder");
  return (
    <AppShell>
      <Card className="mt-6 space-y-2">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-muted-foreground">
          {t("comingSoon")} · {t("owner", { name: owner })}
        </p>
        {children}
      </Card>
    </AppShell>
  );
}
