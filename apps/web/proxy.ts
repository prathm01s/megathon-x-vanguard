// Next.js 16 renamed `middleware.ts` to `proxy.ts`.
// Adds the locale prefix (/en, /te, /hi, /ur) to every page route.
// TODO(prathmesh): refresh the Supabase session here (lib/supabase/proxy) once auth lands.
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals and files with an extension (icons, manifest, sw.js).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
