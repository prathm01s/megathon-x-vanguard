"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useGameHydrated } from "./store";

/** Renders children only after the saved game has loaded from the device (avoids SSR flashes). */
export function GameGate({ children }: { children: ReactNode }) {
  const hydrated = useGameHydrated();
  const t = useTranslations("common");
  if (!hydrated) {
    return (
      <p role="status" className="py-16 text-center text-muted-foreground">
        {t("loading")}
      </p>
    );
  }
  return <>{children}</>;
}

/** Small row of dots showing progress through a sequence (mindset cards, guided steps). */
export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex justify-center gap-2" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={
            i === current
              ? "h-2.5 w-6 rounded-full bg-primary transition-all"
              : i < current
                ? "size-2.5 rounded-full bg-primary/50"
                : "size-2.5 rounded-full bg-border"
          }
        />
      ))}
    </div>
  );
}
