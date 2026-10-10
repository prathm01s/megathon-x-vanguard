import { checkBundle, type Locale, type LocalizedString } from "@toss/content";
import { setRequestLocale } from "next-intl/server";
import { use, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { content } from "@/lib/content";
import { formatPaise, formatRate } from "@/lib/format";

// Content browser (§8.1 `/dev/content`). Owner: Samarth. Dev-only, English UI.
// Live preview: `pnpm dev` runs `content:watch`, so saving a YAML file rebuilds the bundle and
// this page hot-reloads. Text is shown in the page's locale (/te/dev/content for Telugu);
// untranslated strings are flagged and fall back to English, exactly as students would see.

function T({ text, locale }: { text: LocalizedString | undefined; locale: Locale }) {
  if (!text) return null;
  const translated = text[locale];
  return (
    <span>
      {translated ?? text.en}
      {!translated && locale !== "en" && (
        <span className="ms-1 rounded bg-accent px-1 text-xs text-accent-foreground">en fallback</span>
      )}
    </span>
  );
}

function Section({ id, title, count, children }: { id: string; title: string; count?: number; children: ReactNode }) {
  return (
    <details id={id} className="rounded-xl border border-border bg-card p-4" open={count === undefined}>
      <summary className="cursor-pointer text-lg font-bold">
        {title}
        {count !== undefined && <span className="ms-2 text-sm text-muted-foreground">({count})</span>}
      </summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}

const rupees = (r: number) => formatPaise(r * 100);

export default function DevContentPage({ params }: PageProps<"/[locale]/dev/content">) {
  const { locale: rawLocale } = use(params);
  setRequestLocale(rawLocale);
  const locale = rawLocale as Locale;
  const report = checkBundle(content);
  const c = content;

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h1 className="text-xl font-extrabold">Content {c.contentVersion}</h1>
        <p className="text-sm text-muted-foreground">
          {c.chapters.length} chapters · {c.options.options.length} options · {c.lifeEvents.events.length} life
          events · {c.scams.scams.length} scams · {c.lifeReport.rules.length} report rules ·{" "}
          {c.gyaan.questions.length} Gyaan questions · {c.badges.badges.length} badges
        </p>
        <p className={report.errors.length ? "font-bold text-loss" : "font-bold text-gain"}>
          {report.errors.length} errors · {report.warnings.length} warnings
        </p>
        {[...report.errors, ...report.warnings].length > 0 && (
          <ul className="list-disc ps-5 text-sm">
            {report.errors.map((e) => (
              <li key={e} className="text-loss">
                {e}
              </li>
            ))}
            {report.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-3 text-sm">
          {Object.entries(report.localeCoverage).map(([l, cov]) => (
            <span key={l} className="rounded bg-muted px-2 py-1">
              {l}: {cov.translated}/{cov.total} ({cov.total ? Math.round((cov.translated / cov.total) * 100) : 0}%)
            </span>
          ))}
        </div>
      </Card>

      <Section id="options" title="Investment options — expected vs. shown return" count={c.options.options.length}>
        <table className="w-full text-sm tabular-nums">
          <thead className="text-muted-foreground">
            <tr>
              <th className="text-start">Option</th>
              <th>Unlock</th>
              <th>Shown</th>
              <th>Expected</th>
              <th>Δ pp</th>
              <th>Risk</th>
              <th className="text-start">Lesson</th>
            </tr>
          </thead>
          <tbody>
            {c.options.options.map((o) => {
              const r = report.expectedReturns.find((x) => x.optionId === o.id)!;
              return (
                <tr key={o.id} className="border-t border-border">
                  <td className="py-1 font-semibold">
                    <T text={o.name} locale={locale} /> <code className="text-xs text-muted-foreground">{o.id}</code>
                  </td>
                  <td className="text-center">{o.unlockChapter}</td>
                  <td className="text-center">{formatRate(o.assumedAverageReturn)}</td>
                  <td className="text-center">{formatRate(r.expected)}</td>
                  <td className={`text-center ${Math.abs(r.deltaPp) > 0.5 ? "font-bold text-loss" : ""}`}>
                    {r.deltaPp.toFixed(2)}
                  </td>
                  <td className="text-center">{o.riskLevel}</td>
                  <td>
                    <T text={o.lesson} locale={locale} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>

      <Section id="chapters" title="Chapters" count={c.chapters.length}>
        {c.chapters.map((ch) => (
          <Card key={ch.id} className="space-y-1">
            <h3 className="font-bold">
              <T text={ch.title} locale={locale} /> <code className="text-xs text-muted-foreground">{ch.id}</code>{" "}
              <span className="text-xs">{ch.enabled ? "enabled" : "outline (disabled)"}</span>
            </h3>
            <p className="text-sm">
              Ages {ch.ageRange.join("–")} · {ch.turns} {ch.turnUnit}s · starts with {rupees(ch.startingBalance)} ·{" "}
              {ch.income.label.en} {rupees(ch.income.amountPerMonth)}/month
            </p>
            <p className="text-sm italic">
              <T text={ch.intro} locale={locale} />
            </p>
            {ch.tasks.length > 0 && (
              <ul className="list-disc ps-5 text-sm">
                {ch.tasks.map((t) => (
                  <li key={t.id}>
                    <T text={t.title} locale={locale} /> — {t.kind}, {rupees(t.amount)}, due turn {t.dueTurn}
                    {t.required ? ", required" : ""}
                    {t.lateFine ? `, fine ${rupees(t.lateFine)}` : ""}
                    {t.consequence ? `, ${t.consequence}` : ""}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              Options: {ch.unlockOptions.join(", ")} · Events: {ch.lifeEventPool.map((e) => e.eventId).join(", ")} ·
              Scams: {ch.scamPool.join(", ")} · Auctions: {ch.auctionIds.join(", ") || "—"}
            </p>
          </Card>
        ))}
      </Section>

      <Section id="mindset" title="Money Mindset Check" count={c.mindset.questions.length}>
        {c.mindset.questions.map((q) => (
          <div key={q.id} className="text-sm">
            <p className="font-semibold">
              <T text={q.prompt} locale={locale} />
            </p>
            <ul className="ps-5">
              {q.options.map((o) => (
                <li key={o.id}>
                  <T text={o.label} locale={locale} />{" "}
                  <span className="text-xs text-muted-foreground">{JSON.stringify(o.points)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section id="personas" title="Personas" count={c.personas.personas.length}>
        <ul className="text-sm">
          {c.personas.personas.map((p) => (
            <li key={p.id}>
              <strong>
                <T text={p.name} locale={locale} />
              </strong>{" "}
              — <T text={p.strength} locale={locale} /> / <T text={p.blindSpot} locale={locale} /> · starts{" "}
              {p.startChapter} · scam × {p.scamMultiplier}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="events" title="Life events" count={c.lifeEvents.events.length}>
        <ul className="text-sm">
          {c.lifeEvents.events.map((e) => (
            <li key={e.id}>
              <strong>
                <T text={e.title} locale={locale} />
              </strong>{" "}
              ({e.type}, p={e.baseProbabilityPerTurn}/turn, {JSON.stringify(e.effect)}) — <T text={e.description} locale={locale} />
            </li>
          ))}
        </ul>
      </Section>

      <Section id="scams" title="Scams" count={c.scams.scams.length}>
        {c.scams.scams.map((s) => (
          <Card key={s.id} className="text-sm">
            <p className="font-bold">
              <T text={s.title} locale={locale} /> <code className="text-xs text-muted-foreground">{s.id}</code> ·{" "}
              {s.channel} · {s.trigger} p={s.probability}
              {s.repeatVariantOf ? ` · repeat of ${s.repeatVariantOf}` : ""}
            </p>
            <p className="italic">
              <T text={s.sender} locale={locale} />: “<T text={s.offerText} locale={locale} />”
            </p>
            <p>
              Actions:{" "}
              {s.actions.map((a) => (
                <span key={a.id} className={`me-2 ${a.falls ? "text-loss" : "text-gain"}`}>
                  <T text={a.label} locale={locale} />
                </span>
              ))}
            </p>
            <ul className="list-disc ps-5">
              {s.redFlags.map((f, i) => (
                <li key={i}>
                  🚩 <T text={f} locale={locale} />
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </Section>

      <Section id="report" title="Life Report rules and What if" count={c.lifeReport.rules.length + c.lifeReport.whatIf.candidates.length}>
        <ul className="text-sm">
          {[...c.lifeReport.rules]
            .sort((a, b) => b.priority - a.priority)
            .map((r) => (
              <li key={r.id}>
                {r.section === "did-well" ? "✔" : "✖"} <code className="text-xs">{r.id}</code> (p{r.priority}) —{" "}
                <T text={r.text} locale={locale} />
              </li>
            ))}
          {c.lifeReport.whatIf.candidates.map((w) => (
            <li key={w.id}>
              ↺ <code className="text-xs">{w.id}</code> (p{w.priority}, {w.transform.type}) — <T text={w.changeText} locale={locale} />
            </li>
          ))}
        </ul>
      </Section>

      <Section id="gyaan" title="Gyaan Check" count={c.gyaan.questions.length}>
        {c.gyaan.questions.map((q) => (
          <div key={q.id} className="text-sm">
            <p className="font-semibold">
              <T text={q.prompt} locale={locale} />
            </p>
            <ul className="ps-5">
              {q.options.map((o) => (
                <li key={o.id} className={o.id === q.correctOptionId ? "font-bold text-gain" : ""}>
                  <T text={o.label} locale={locale} />
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground">
              <T text={q.explanation} locale={locale} />
            </p>
          </div>
        ))}
      </Section>

      <Section id="multiplayer" title="Multiplayer: auctions, loans, bots" count={c.auctions.auctions.length}>
        <ul className="text-sm">
          {c.auctions.auctions.map((a) => (
            <li key={a.id}>
              <strong>
                <T text={a.title} locale={locale} />
              </strong>{" "}
              — {a.chapter} turn {a.turn}, min {rupees(a.minBid)}, true value {rupees(a.trueValue)}
              {a.allowPoolBid ? ", pool bids" : ""}
            </li>
          ))}
        </ul>
        <p className="text-sm">
          Friend loans ≤ {formatRate(c.multiplayer.loans.maxRatePerTurn)}/turn · loan app{" "}
          {formatRate(c.multiplayer.loans.loanAppRatePerTurn)}/turn · bank by trust:{" "}
          {c.multiplayer.loans.bankRateByTrust
            .map((r) => `≥${r.minTrust}: ${r.ratePerYear === null ? "refuses" : formatRate(r.ratePerYear) + "/yr"}`)
            .join(", ")}
        </p>
        <p className="text-sm">
          Bots: {c.multiplayer.bots.strategies.map((b) => `${b.name.en} (${b.id}, w${b.weight})`).join(", ")}
        </p>
      </Section>
    </div>
  );
}
