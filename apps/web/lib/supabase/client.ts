"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@toss/db-types";

/** Supabase client for Client Components. Uses the public anon key; RLS does the rest. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
