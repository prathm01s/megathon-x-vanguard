// Next.js 16 renamed `middleware.ts` to `proxy.ts`.
// Adds the locale prefix (/en, /te, /hi, /ur) to every page route, and refreshes the
// Supabase session cookie when Supabase is configured.
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { type NextRequest } from "next/server";
import { createProxyClient } from "./lib/supabase/proxy";

const intlMiddleware = createMiddleware(routing);

// Without these env vars (local dev, mock mode, CI e2e) the app runs on the local mocks;
// creating a Supabase client would throw and 500 every page.
const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  if (supabaseConfigured) {
    const supabase = createProxyClient(request, response);
    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  // Everything except API routes, Next internals and files with an extension (icons, manifest, sw.js).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
