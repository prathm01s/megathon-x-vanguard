import type { ContentBundle } from "@toss/content";
import { loadContent } from "@toss/content/load";

let cached: ContentBundle | undefined;

/** Loads and validates the real content/ folder once per test run. */
export function content(): ContentBundle {
  if (cached) return cached;
  const result = loadContent();
  if (!result.ok) throw new Error(`content invalid: ${JSON.stringify(result.issues.slice(0, 3))}`);
  cached = result.bundle;
  return cached;
}
