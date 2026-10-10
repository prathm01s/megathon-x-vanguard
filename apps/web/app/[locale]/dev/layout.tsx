import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { Link } from "@/i18n/navigation";

// Developer tools (§8.1): content preview and balancing lab. Owner: Samarth.
// Dev-only (404 in production) and English-only: not student-facing.
export default function DevLayout({ children, params }: LayoutProps<"/[locale]/dev">) {
  if (process.env.NODE_ENV === "production") notFound();
  // next-intl needs the locale set in every layout, or it falls back to reading headers
  // (runtime data), which blocks prerendering under Cache Components.
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center gap-4 border-b border-border pb-3">
        <span className="text-lg font-extrabold">Toss Life · dev</span>
        <nav className="flex gap-3 text-sm font-semibold">
          <Link className="underline-offset-4 hover:underline" href="/dev/content">
            Content
          </Link>
          <Link className="underline-offset-4 hover:underline" href="/dev/sim">
            Simulation lab
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
