// Shared "game look" styles, as Tailwind classes (kept in code, not globals.css, so every page
// that uses them gets them).

/** Chunky outlined game text: Lilita One for Latin, the Noto script fonts for other languages. */
export const GAME_TEXT =
  "font-[family-name:var(--font-lilita),var(--font-noto-telugu),var(--font-noto-devanagari),var(--font-noto-arabic),var(--font-nunito),sans-serif] tracking-[0.01em] [-webkit-text-stroke:0.6px_rgba(43,29,18,0.55)] [paint-order:stroke_fill]";

/** Grass for the village ground. */
export const GRASS_STYLE = {
  backgroundColor: "#6cbf4a",
  backgroundImage:
    "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.14) 0 2px, transparent 3px), radial-gradient(circle at 70% 70%, rgba(0,0,0,0.08) 0 2px, transparent 3px), linear-gradient(180deg, #7fd157 0%, #5fae3e 100%)",
  backgroundSize: "28px 28px, 34px 34px, 100% 100%",
} as const;
