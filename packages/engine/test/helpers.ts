import type { ContentBundle } from "@toss/content";
import { loadContent } from "@toss/content/load";
import { createPlaythrough } from "../src/playthrough";
import { tossFor } from "../src/market";
import type { GameState } from "../src/types";

let cached: ContentBundle | undefined;

/** Loads and validates the real content/ folder once per test run. */
export function content(): ContentBundle {
  if (cached) return cached;
  const result = loadContent();
  if (!result.ok) throw new Error(`content invalid: ${JSON.stringify(result.issues.slice(0, 3))}`);
  cached = result.bundle;
  return cached;
}

export const ch2 = (seed = "test-seed", personaId = "safe-keeper"): GameState =>
  createPlaythrough({ content: content(), personaId, seed, chapterId: "ch2-first-job" });

/** First seed (seed-0, seed-1, …) whose turn-1 market toss is `state`. */
export function seedWithMarket(state: string): string {
  for (let i = 0; i < 1000; i++) {
    const seed = `seed-${i}`;
    if (tossFor(seed, 1, content(), "year").marketState === state) return seed;
  }
  throw new Error(`no seed with ${state}`);
}
