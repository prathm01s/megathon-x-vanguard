import type { ContentBundle } from "@toss/content";
import { matches } from "./conditions";
import type { MetricValues, ReportItem } from "./types";

/**
 * Picks the Life Report's "did well" and "could be better" items (§7.9):
 * highest-priority matching rules win, capped by `maxDidWell` / `maxCouldBeBetter`.
 */
export function selectReportItems(
  metrics: MetricValues,
  content: ContentBundle,
  extraParams: Record<string, string | number> = {},
): { didWell: ReportItem[]; couldBeBetter: ReportItem[] } {
  const cfg = content.lifeReport;
  const matching = cfg.rules
    .filter((r) => matches(r.when, metrics))
    .sort((a, b) => b.priority - a.priority);

  const toItem = (r: (typeof cfg.rules)[number]): ReportItem => ({
    ruleId: r.id,
    text: r.text,
    params: { ...metricParams(metrics), ...extraParams },
    pillar: r.pillar,
    ...(r.techniqueId ? { techniqueId: r.techniqueId } : {}),
  });

  return {
    didWell: matching
      .filter((r) => r.section === "did-well")
      .slice(0, cfg.maxDidWell)
      .map(toItem),
    couldBeBetter: matching
      .filter((r) => r.section === "could-be-better")
      .slice(0, cfg.maxCouldBeBetter)
      .map(toItem),
  };
}

/** Metric values usable as `{placeholders}` in report text. */
function metricParams(metrics: MetricValues): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(metrics)) out[k] = typeof v === "boolean" ? String(v) : v;
  return out;
}
