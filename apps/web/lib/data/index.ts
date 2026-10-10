"use client";

// Persistence API entry point (§15.4 D). Screens import ONLY from here.
// Owner: Prathmesh
import { useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { mockPersistence, mockSession } from "./mock";
import { supabasePersistence } from "./supabase";
import type { PersistenceApi, Session } from "./types";

export type * from "./types";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const SIGNED_OUT: Session = {
  status: "signed-out",
  user: null,
  profile: null,
  role: null,
  org: null,
};

// One shared session for the whole page (header, gates and screens all read the same one), loaded
// once and refreshed when Supabase reports a sign-in or sign-out.
// Snapshots must be stable objects (useSyncExternalStore compares them by reference).
const INITIAL: Session = supabaseConfigured ? { ...SIGNED_OUT, status: "loading" } : mockSession;
let current: Session = INITIAL;
const listeners = new Set<() => void>();
let started = false;

function publish(next: Session) {
  current = next;
  listeners.forEach((l) => l());
}

async function loadSession(): Promise<void> {
  const supabase = createClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return publish(SIGNED_OUT);

    const accountType = user.user_metadata?.account_type === "ngo_admin" ? "ngo_admin" : "student";
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) {
      return publish({ ...SIGNED_OUT, status: "needs-setup", accountType, user: { id: user.id } });
    }

    let org = null;
    if (profile.org_id) {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", profile.org_id)
        .maybeSingle();
      if (orgData) org = orgData;
    }
    publish({
      status: "ready",
      accountType: profile.role,
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
  } catch (err) {
    console.warn("Could not fetch user session from Supabase:", err);
    publish(SIGNED_OUT);
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (supabaseConfigured && !started) {
    started = true;
    void loadSession();
    createClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void loadSession();
      }
    });
  }
  return () => listeners.delete(listener);
}

/** Reload the session now, e.g. right after logging in, signing up or finishing the profile. */
export function refreshSession(): Promise<void> {
  return supabaseConfigured ? loadSession() : Promise.resolve();
}

export function useSession(): Session {
  return useSyncExternalStore(
    subscribe,
    () => current,
    // Server render and hydration: account-specific UI waits for the client.
    () => INITIAL,
  );
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
