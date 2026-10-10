import { describe, expect, it } from "vitest";
import { playChapter, type StrategyId } from "../src/bots";
import { endChapter } from "../src/chapter";
import { startChapterFor } from "../src/helpers";
import { createPlaythrough } from "../src/playthrough";
import { content } from "./helpers";

const RUNS = 60;
const run = (strategy: StrategyId, personaId = "safe-keeper") =>
  Array.from(
    { length: RUNS },
    (_, i) =>
      playChapter(strategy, {
        content: content(),
        personaId,
        seed: `bal-${i}`,
        chapterId: "ch2-first-job",
      }).result,
  );

describe("balance (§10) — keep these true when tuning content numbers", () => {
  it("a balanced strategy passes ch2 most of the time", () => {
    const pass = run("balanced").filter((r) => r.passed).length / RUNS;
    expect(pass).toBeGreaterThanOrEqual(0.8);
  });

  it("an all-cash strategy usually fails the growth component", () => {
    const weakGrowth = run("all-cash").filter(
      (r) => r.breakdown.find((b) => b.componentId === "growth")!.fraction < 0.5,
    ).length;
    expect(weakGrowth / RUNS).toBeGreaterThanOrEqual(0.9);
  });

  it("all-equity with no emergency fund sometimes fails after bad tosses", () => {
    const results = run("all-equity-no-fund");
    const fails = results.filter((r) => !r.passed).length;
    expect(fails).toBeGreaterThan(0);
    expect(fails).toBeLessThan(RUNS);
  });

  it("balanced beats all-cash on average", () => {
    const avg = (rs: { healthScore: number }[]) =>
      rs.reduce((s, r) => s + r.healthScore, 0) / rs.length;
    expect(avg(run("balanced"))).toBeGreaterThan(avg(run("all-cash")) + 10);
  });
});

describe("bots", () => {
  it("are deterministic for a seed", () => {
    const args = {
      content: content(),
      personaId: "thrill-seeker",
      seed: "bot-det",
      chapterId: "ch2-first-job",
    };
    expect(playChapter("impulsive", args)).toEqual(playChapter("impulsive", args));
  });

  it("impulsive bots fall for scams sometimes, cautious bots never", () => {
    const fallen = (s: StrategyId) =>
      run(s, "thrill-seeker").reduce((n, r) => n + Number(r.metrics.scamsFallen), 0);
    expect(fallen("cautious")).toBe(0);
    expect(fallen("impulsive")).toBeGreaterThan(0);
  });
});

describe("progression", () => {
  it("starts each persona in its own start chapter", () => {
    expect(startChapterFor("moment-maker", content())).toBe("ch1-first-earnings");
    expect(startChapterFor("smart-planner", content())).toBe("ch2-first-job");
  });

  it("falls back to the first ENABLED chapter when a persona's chapter is switched off", () => {
    const c = content();
    const off = {
      ...c,
      chapters: c.chapters.map((ch) => (ch.order === 1 ? { ...ch, enabled: false } : ch)),
    };
    expect(startChapterFor("moment-maker", off)).toBe("ch2-first-job");
  });

  it("persona shift needs the rule to hold for consecutive chapters (carried over)", () => {
    const args = {
      content: content(),
      personaId: "moment-maker",
      seed: "shift",
      chapterId: "ch2-first-job",
    };
    const first = playChapter("cautious", args).result;
    expect(first.metrics.emergencyFundCovered).toBe(true);
    expect(first.personaShift).toBeNull(); // needs 2 chapters in a row
    expect(first.carryOver.shiftStreaks["moment-maker-to-safe-keeper"]).toBe(1);

    const second = createPlaythrough({ ...args, seed: "shift-2", carryOver: first.carryOver });
    const end = endChapter({ ...second, cash: 1_00_00_000 }, content()); // plenty of liquid savings
    expect(end.personaShift).toEqual({
      from: "moment-maker",
      to: "safe-keeper",
      ruleId: "moment-maker-to-safe-keeper",
    });
  });

  it("carries salary bonuses and blocked goals into the next chapter", () => {
    const next = createPlaythrough({
      content: content(),
      personaId: "safe-keeper",
      seed: "carry",
      chapterId: "ch2-first-job",
      carryOver: {
        blockNextChapterGoal: true,
        blockedTaskIds: [],
        salaryBonusRate: 0.05,
        shiftStreaks: {},
      },
    });
    expect(next.incomePerMonth).toBe(31500_00);
    expect(next.tasks.filter((t) => t.status === "blocked")).toHaveLength(1);
  });
});
