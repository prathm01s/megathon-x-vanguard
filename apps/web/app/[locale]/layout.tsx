import type { Metadata, Viewport } from "next";
import {
  Lilita_One,
  Noto_Naskh_Arabic,
  Noto_Sans_Devanagari,
  Noto_Sans_Telugu,
  Nunito,
} from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { dirFor, routing } from "@/i18n/routing";
import "../globals.css";

// Latin UI font plus script fonts for Telugu, Hindi and Urdu. Non-Latin fonts aren't preloaded
// so English users don't download them.
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });
// Chunky display font for game headings and numbers (SIL OFL). Latin only: other scripts fall
// back to their Noto font through --font-game.
const lilita = Lilita_One({ subsets: ["latin"], weight: "400", variable: "--font-lilita" });
const notoTelugu = Noto_Sans_Telugu({
  subsets: ["telugu"],
  variable: "--font-noto-telugu",
  preload: false,
});
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-noto-devanagari",
  preload: false,
});
const notoArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  preload: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app" });
  return {
    title: t("name"),
    description: t("tagline"),
    manifest: "/manifest.json",
    icons: {
      icon: "/icon.svg",
      apple: "/icon.svg",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6efe2",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${nunito.variable} ${lilita.variable} ${notoTelugu.variable} ${notoDevanagari.variable} ${notoArabic.variable}`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-dvh font-sans">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        {/* Production only: sw.js serves /_next/ cache-first, which is right for hashed
            production chunks but would pin stale code under `next dev` (merge review). */}
        {process.env.NODE_ENV === "production" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{});});}`,
            }}
          />
        )}
      </body>
    </html>
  );
}
