import { z } from "zod";
import {
  fileHeader,
  idSchema,
  localizedStringSchema,
  probabilitySchema,
  rateSchema,
  rupeesSchema,
} from "./common";
import { conditionSchema } from "./conditions";

// ── investments/options.yaml ────────────────────────────────────────────────
export const OPTION_CATEGORIES = ["cash", "bank", "deposit", "market", "commodity", "mix"] as const;

/** How an option's yearly return is decided. */
export const optionReturnsSchema = z.discriminatedUnion("type", [
  /** Same rate every year. */
  z.strictObject({ type: z.literal("fixed"), rate: rateSchema }),
  /** Follows the shared market toss (`config/market.yaml` states). */
  z.strictObject({ type: z.literal("market"), byState: z.record(idSchema, rateSchema) }),
  /** Follows its own independent toss (e.g. gold). */
  z.strictObject({
    type: z.literal("independent"),
    toss: idSchema,
    byState: z.record(idSchema, rateSchema),
  }),
  /** A blend of other options, e.g. 50% index, 30% debt, 20% gold. */
  z.strictObject({
    type: z.literal("mix"),
    components: z
      .array(z.strictObject({ optionId: idSchema, weight: probabilitySchema }))
      .min(2),
  }),
]);
export type OptionReturns = z.infer<typeof optionReturnsSchema>;

export const LIQUIDITY = ["instant", "locked_until_maturity", "market"] as const;

export const investmentOptionSchema = z.strictObject({
  id: idSchema,
  enabled: z.boolean().default(true),
  /** Fictional name only. Never a real fund, bank, AMC, broker or app. */
  name: localizedStringSchema,
  category: z.enum(OPTION_CATEGORIES),
  unlockChapter: idSchema,
  /** The yearly return shown to students (always with the "assumed" chip). */
  assumedAverageReturn: rateSchema,
  returns: optionReturnsSchema,
  liquidity: z.enum(LIQUIDITY),
  /** Fraction of the amount lost when a locked option is broken early (0.01 = 1%). */
  earlyBreakPenalty: probabilitySchema.default(0),
  /** Lock length in MONTHS (for `locked_until_maturity`); independent of the chapter's turn unit. */
  lockMonths: z.number().int().nonnegative().default(0),
  /** RD-style options take a fixed monthly deposit instead of a lump sum. */
  monthlyDepositOnly: z.boolean().default(false),
  minAmount: rupeesSchema,
  sipAllowed: z.boolean(),
  riskLevel: z.number().int().min(1).max(5),
  /** Applies only to `cash`: can be lost or stolen (see `economy.cashLossChancePerYear`). */
  canBeLost: z.boolean().default(false),
  lesson: localizedStringSchema,
  description: localizedStringSchema,
  techniqueIds: z.array(idSchema).default([]),
  icon: z.string(),
});
export type InvestmentOption = z.infer<typeof investmentOptionSchema>;

export const optionsFileSchema = z.strictObject({
  ...fileHeader,
  options: z.array(investmentOptionSchema).min(1),
});

// ── investments/techniques.yaml ─────────────────────────────────────────────
export const TECHNIQUE_VISUALS = [
  "growth-tree",
  "units-bought-chart",
  "split-pie",
  "horizon-slider",
  "goal-buckets",
  "real-value-badge",
  "storm-timeline",
] as const;

export const techniqueSchema = z.strictObject({
  id: idSchema,
  enabled: z.boolean().default(true),
  title: localizedStringSchema,
  shortExplanation: localizedStringSchema,
  /** UI component key; Pragya's `components/game` renders it. */
  visual: z.enum(TECHNIQUE_VISUALS),
  unlockChapter: idSchema,
  triggerTips: z.array(
    z.strictObject({ id: idSchema, when: conditionSchema, tip: localizedStringSchema }),
  ),
  gyaanQuestionIds: z.array(idSchema),
});
export type Technique = z.infer<typeof techniqueSchema>;

export const techniquesFileSchema = z.strictObject({
  ...fileHeader,
  techniques: z.array(techniqueSchema).min(1),
});
