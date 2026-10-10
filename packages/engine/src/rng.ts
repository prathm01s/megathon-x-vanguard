// Seeded, deterministic PRNG with independent named streams (§7.2).
// Same seed + same stream name → same sequence, on every device and in Edge Functions.
// DECISION: tiny in-house PRNG (cyrb128 hash → sfc32) instead of `seedrandom`; no dependency,
// ESM-friendly, and fast enough for thousands of `pnpm sim` runs.

/** Stream names. Keeping them separate means a change in one (e.g. a scam answer)
 *  never shifts the market tosses — essential for "What if" replays. */
export type RngStream = "market" | "independent" | "life" | "scam" | "cash" | "bots" | "auction";

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Picks an item by weight. Returns undefined for an empty list or zero total weight. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T | undefined;
  /** True with probability `p`. */
  chance(p: number): boolean;
}

function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * Creates the RNG for one stream at one turn. Deriving from `(seed, stream, turn)`
 * instead of carrying RNG state means any turn can be re-tossed independently,
 * and the state stays plain JSON.
 */
export function createRng(seed: string, stream: RngStream, turn = 0): Rng {
  const [a, b, c, d] = cyrb128(`${seed}|${stream}|${turn}`);
  const next = sfc32(a, b, c, d);
  // Warm up: the first outputs of sfc32 are weakly mixed.
  for (let i = 0; i < 12; i++) next();

  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(p) {
      return next() < p;
    },
    weighted(items, weight) {
      const total = items.reduce((s, it) => s + Math.max(0, weight(it)), 0);
      if (total <= 0) return undefined;
      let r = next() * total;
      for (const it of items) {
        r -= Math.max(0, weight(it));
        if (r < 0) return it;
      }
      return items[items.length - 1];
    },
  };
}

/** A random, URL-safe seed for new playthroughs and rooms. */
export function newSeed(): string {
  const bytes = new Uint8Array(9);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("");
}
