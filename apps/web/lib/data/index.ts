"use client";

// Persistence API entry point (§15.4 D). Screens import ONLY from here.
// Owner: Prathmesh
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockPersistence, mockSession } from "./mock";
import { supabasePersistence } from "./supabase";
import type { PersistenceApi, Session } from "./types";

export type * from "./types";

export function useSession(): Session {
  const [session, setSession] = useState<Session>(mockSession);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;

    const supabase = createClient();

    async function loadUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setSession({ user: null, profile: null, role: null, org: null });
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        let org = null;
        if (profile?.org_id) {
          const { data: orgData } = await supabase
            .from("organizations")
            .select("id, name")
            .eq("id", profile.org_id)
            .maybeSingle();
          if (orgData) org = orgData;
        }

        if (profile) {
          setSession({
            user: { id: user.id },
            profile: {
              userId: profile.user_id,
              role: profile.role,
              orgId: profile.org_id,
              username: profile.username,
              nickname: profile.nickname,
              avatarId: profile.avatar_id,
              playerId: profile.player_id,
              locale: profile.locale,
              hasRecoveryEmail: profile.has_recovery_email,
            },
            role: profile.role,
            org,
          });
        }
      } catch (err) {
        console.warn("Could not fetch user session from Supabase:", err);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return session;
}

const api: PersistenceApi = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? supabasePersistence
  : mockPersistence;

export const saveMindset = api.saveMindset;
export const startPlaythrough = api.startPlaythrough;
export const loadPlaythrough = api.loadPlaythrough;
export const savePlaythroughState = api.savePlaythroughState;
export const appendDecisions = api.appendDecisions;
export const saveChapterResult = api.saveChapterResult;
