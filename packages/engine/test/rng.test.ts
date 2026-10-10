import { describe, expect, it } from "vitest";
import { createRng } from "../src/rng";

describe("rng", () => {
  it("is deterministic for the same seed, stream and turn", () => {
    const a = createRng("seed-1", "market", 3);
    const b = createRng("seed-1", "market", 3);
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(
      Array.from({ length: 20 }, () => b.next()),
    );
  });

  it("gives independent sequences per stream and per turn", () => {
    expect(createRng("s", "market", 1).next()).not.toEqual(createRng("s", "life", 1).next());
    expect(createRng("s", "market", 1).next()).not.toEqual(createRng("s", "market", 2).next());
  });

  it("produces floats in [0, 1) with a roughly uniform mean", () => {
    const rng = createRng("uniform", "bots");
    let sum = 0;
    for (let i = 0; i < 20000; i++) {
      const x = rng.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      sum += x;
    }
    expect(sum / 20000).toBeCloseTo(0.5, 1);
  });

  it("picks weighted items in proportion to their weight", () => {
    const items = [
      { id: "boom", p: 0.3 },
      { id: "normal", p: 0.5 },
      { id: "crash", p: 0.2 },
    ];
    const counts: Record<string, number> = { boom: 0, normal: 0, crash: 0 };
    for (let t = 0; t < 10000; t++)
      counts[createRng("w", "market", t).weighted(items, (i) => i.p)!.id]!++;
    expect(counts.boom! / 10000).toBeCloseTo(0.3, 1);
    expect(counts.normal! / 10000).toBeCloseTo(0.5, 1);
    expect(counts.crash! / 10000).toBeCloseTo(0.2, 1);
  });
});
