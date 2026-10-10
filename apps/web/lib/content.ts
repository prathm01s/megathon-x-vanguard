// The compiled, validated content bundle (built by `pnpm content:build`).
// Components read content from here — never hardcode amounts, rates, texts or ids (§8.1).
import type { ContentBundle } from "@toss/content";
import bundle from "@toss/content/bundle";

export const content = bundle as ContentBundle;
export { localize, fillPlaceholders } from "@toss/content";
