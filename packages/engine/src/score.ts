import type { ContentBundle, HealthComponent } from "@toss/content";
import type { MetricValues, ScoreComponentResult } from "./types";

/** 0–1 fraction for one component from its metric value. */
export function componentFraction(
  component: HealthComponent,
  value: number | boolean | string,
): number {
  const v = typeof value === "number" ? value : value === true ? 1 : 0;
  switch (component.scale) {
    case "linear": {
      if (component.max === component.min) return v >= component.max ? 1 : 0;
      return clamp01((v - component.min) / (component.max - component.min));
    }
    case "inverse":
      return clamp01(1 - v / component.max);
    case "steps": {
      const hit = [...component.steps].sort((a, b) => b.gte - a.gte).find((s) => v >= s.gte);
      return hit?.pts ?? 0;
    }
  }
}

/**
 * Financial Health Score out of 100 (§7.8). Components marked `multiplayerOnly`
 * are skipped in single-player and their weight is shared out proportionally.
 */
export function healthScore(
  metrics: MetricValues,
  content: ContentBundle,
  opts: { multiplayer: boolean },
): { score: number; breakdown: ScoreComponentResult[] } {
  const cfg = content.healthScore;
  const applicable = (c: HealthComponent) => opts.multiplayer || !c.multiplayerOnly;
  const activeWeight = cfg.components.filter(applicable).reduce((s, c) => s + c.weight, 0);
  const scale = cfg.redistributeMissingComponents && activeWeight > 0 ? 100 / activeWeight : 1;

  const breakdown = cfg.components.map((c): ScoreComponentResult => {
    const isApplicable = applicable(c);
    const weight = isApplicable ? c.weight * scale : 0;
    const fraction = isApplicable ? componentFraction(c, metrics[c.metric]) : 0;
    return {
      componentId: c.id,
      weight,
      fraction,
      points: weight * fraction,
      applicable: isApplicable,
    };
  });
  const score = Math.round(breakdown.reduce((s, b) => s + b.points, 0));
  return { score, breakdown };
}

/** The applicable component that lost the most points (for the replay tip). */
export function weakestComponent(breakdown: ScoreComponentResult[]): string {
  const applicable = breakdown.filter((b) => b.applicable);
  const worst = applicable.reduce(
    (a, b) => (b.weight - b.points > a.weight - a.points ? b : a),
    applicable[0]!,
  );
  return worst.componentId;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
