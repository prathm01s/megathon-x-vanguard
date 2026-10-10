import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { ChapterIntro } from "@/components/game/chapter-intro";
import { AppShell } from "@/components/ui/app-shell";
import { routing } from "@/i18n/routing";
import { content } from "@/lib/content";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    content.chapters.map((chapter) => ({
      locale,
      chapterId: chapter.id,
    })),
  );
}

export const instant = false;

export default function ChapterPage({
  params,
}: {
  params: Promise<{ locale: string; chapterId: string }>;
}) {
  const { locale, chapterId } = use(params);
  setRequestLocale(locale);
  return (
    <AppShell>
      <ChapterIntro chapterId={chapterId} />
    </AppShell>
  );
}
