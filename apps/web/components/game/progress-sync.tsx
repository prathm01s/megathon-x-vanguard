"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { loadProgress, loadSessions, useSession } from "@/lib/data";
import { useGameHydrated, useGameStore, type SavedSession } from "./store";

/**
 * The saved game lives on the device. When a student opens the game: a save that belongs to
 * another account is cleared, progress from other devices (persona, passed chapters) is
 * restored from the server, and a student who never took the Money Mindset Check is sent to it.
 */
export function ProgressSync({ children }: { children: ReactNode }) {
  const hydrated = useGameHydrated();
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");
  const userId = session.user?.id;
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!hydrated || session.status !== "ready" || !userId) return;
    let cancelled = false;
    void (async () => {
      const store = useGameStore.getState();
      if (store.ownerId && store.ownerId !== userId) store.reset();
      const progress = await loadProgress();
      if (cancelled) return;
      useGameStore.getState().restoreProgress(userId, progress);
      // Time-machine sessions from other devices.
      void loadSessions().then((remote) =>
        useGameStore.getState().mergeSessions(remote as unknown as SavedSession[]),
      );
      if (!useGameStore.getState().personaId && !pathname.startsWith("/mindset")) {
        router.replace("/mindset");
        return;
      }
      setSynced(true);
    })();
    return () => {
      cancelled = true;
    };
    // Once per account per visit; navigating inside the game doesn't need a new sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, session.status, userId]);

  // The Mindset Check itself never waits (it's where a new student is sent).
  if (!synced && !pathname.startsWith("/mindset")) {
    return (
      <p role="status" className="py-16 text-center text-muted-foreground">
        {t("loading")}
      </p>
    );
  }
  return <>{children}</>;
}
