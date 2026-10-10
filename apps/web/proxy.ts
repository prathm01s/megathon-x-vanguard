// Next.js 16 renamed `middleware.ts` to `proxy.ts`.
// Adds the locale prefix (/en, /te, /hi, /ur) to every page route.
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { type NextRequest } from "next/server";
import { createProxyClient } from "./lib/supabase/proxy";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  const supabase = createProxyClient(request, response);

  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Everything except API routes, Next internals and files with an extension (icons, manifest, sw.js).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
