import { z } from "zod";

/** Locales the product supports. `en` is required everywhere; the rest fall back to `en`. */
export const LOCALES = ["en", "te", "hi", "ur"] as const;
export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

/** Kebab-case stable id. Never rename once played; deprecate with `enabled: false`. */
export const idSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "ids must be kebab-case (a-z, 0-9, dashes)");
export type Id = z.infer<typeof idSchema>;

/** Optional voice-narration clip per string (later phase, §9.3). */
const audioSchema = z.partialRecord(localeSchema, z.string()).optional();

/**
 * Localized text: `{ en: "...", te?: "...", hi?: "...", ur?: "..." }`.
 * Supports placeholders like `{amount}`, `{option}`, `{years}`, `{difference}`.
 */
export const localizedStringSchema = z.object({
  en: z.string().min(1),
  te: z.string().optional(),
  hi: z.string().optional(),
  ur: z.string().optional(),
  audio: audioSchema,
});
export type LocalizedString = z.infer<typeof localizedStringSchema>;

/**
 * Money in content files is written in whole RUPEES so editors can read it.
 * The engine converts to integer paise (×100) on load.
 */
// DECISION: content amounts are rupees (human-friendly); engine state is paise (§10).
export const rupeesSchema = z.number().int().nonnegative();

/** A rate such as 0.06 for 6%. Can be negative for market losses. */
export const rateSchema = z.number().min(-1).max(10);
export const probabilitySchema = z.number().min(0).max(1);

export const PILLARS = ["plan-budget", "save-manage", "understand-investing", "stay-safe"] as const;
export const pillarSchema = z.enum(PILLARS);
export type Pillar = z.infer<typeof pillarSchema>;

/** Every YAML file has a top-level integer `version`. */
export const versionSchema = z.number().int().positive();

/** Optional `$schema` hint written by editors (yaml-language-server). */
export const fileHeader = {
  version: versionSchema,
};
