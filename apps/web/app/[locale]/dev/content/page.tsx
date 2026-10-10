import { checkBundle } from "@toss/content";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { PlaceholderScreen } from "@/components/ui/placeholder-screen";
import { content } from "@/lib/content";

// Dev-only content preview (§8.1). Owner: Samarth. Grows into a full browser with live preview.
export default function DevContentPage({ params }: PageProps<"/[locale]/dev/content">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = use(params);
  setRequestLocale(locale);
  const report = checkBundle(content);

  return (
    <PlaceholderScreen title={`Content ${content.contentVersion}`} owner="Samarth">
      <p>
        {content.chapters.length} chapters · {content.options.options.length} options ·{" "}
        {content.scams.scams.length} scams · {report.errors.length} errors · {report.warnings.length} warnings
      </p>
      <ul className="list-disc ps-5 text-sm">
        {content.chapters.map((c) => (
          <li key={c.id}>
            {c.title.en} — {c.enabled ? "enabled" : "outline"}
          </li>
        ))}
      </ul>
    </PlaceholderScreen>
  );
}
