import { describe, expect, it } from "vitest";
import type { MetricValues } from "../src/types";
import { healthScore } from "../src/score";
import { content } from "./helpers";

const perfect = {
  tasksOnTimeRate: 1,
  emergencyFundMonths: 3,
  realValueGrowthPct: 0.3,
  diversificationCount: 3,
  trustScore: 100,
  scamsFallen: 0,
} as unknown as MetricValues;

describe("Financial Health Score", () => {
  it("scores 100 for a perfect multiplayer chapter", () => {
    expect(healthScore(perfect, content(), { multiplayer: true }).score).toBe(100);
  });

  it("redistributes the trust weight in single-player so 100 is still reachable", () => {
    const { score, breakdown } = healthScore(perfect, content(), { multiplayer: false });
    expect(score).toBe(100);
    expect(breakdown.find((b) => b.componentId === "trust")?.applicable).toBe(false);
    expect(breakdown.reduce((s, b) => s + b.weight, 0)).toBeCloseTo(100);
  });

  it("applies linear, steps and inverse scales", () => {
    const m = {
      ...perfect,
      emergencyFundMonths: 1.5,
      diversificationCount: 2,
      scamsFallen: 1,
    } as MetricValues;
    const { breakdown } = healthScore(m, content(), { multiplayer: true });
    const frac = (id: string) => breakdown.find((b) => b.componentId === id)!.fraction;
    expect(frac("safety-net")).toBeCloseTo(0.5);
    expect(frac("diversification")).toBeCloseTo(0.6);
    expect(frac("scam-safety")).toBeCloseTo(0.5);
  });
});
