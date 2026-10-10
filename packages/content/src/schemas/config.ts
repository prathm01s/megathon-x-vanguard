import { z } from "zod";
import {
  fileHeader,
  idSchema,
  localeSchema,
  localizedStringSchema,
  probabilitySchema,
  rateSchema,
  rupeesSchema,
} from "./common";
import { metricIdSchema } from "./conditions";

// ── config/economy.yaml ─────────────────────────────────────────────────────
export const economySchema = z.strictObject({
  ...fileHeader,
  inflationPerYear: rateSchema,
  salaryGrowthPerYear: rateSchema,
  currency: z.literal("INR"),
  numberFormat: z.string(),
  cashLossChancePerYear: probabilitySchema,
  cashLossMaxPct: probabilitySchema,
  considerTax: z.boolean(),
  /** Option where money paid into a `safety` task (emergency fund) is kept. */
  emergencyFundOptionId: idSchema,
  assumptionNote: localizedStringSchema,
});
export type EconomyConfig = z.infer<typeof economySchema>;

// ── config/market.yaml ──────────────────────────────────────────────────────
const tossStateSchema = z.strictObject({
  id: idSchema,
  probability: probabilitySchema,
  label: localizedStringSchema.optional(),
});
export type TossState = z.infer<typeof tossStateSchema>;

export const marketSchema = z.strictObject({
  ...fileHeader,
  /** The shared market state; all equity-linked options move together. */
  states: z.array(tossStateSchema).min(2),
  /** Independent tosses (e.g. gold) that make diversification meaningful. */
  independentTosses: z.array(
    z.strictObject({
      id: idSchema,
      label: localizedStringSchema.optional(),
      states: z.array(tossStateSchema).min(2),
    }),
  ),
});
export type MarketConfig = z.infer<typeof marketSchema>;

// ── config/health-score.yaml ────────────────────────────────────────────────
const componentBase = {
  id: idSchema,
  weight: z.number().nonnegative(),
  metric: metricIdSchema,
  label: localizedStringSchema,
  tip: localizedStringSchema,
  multiplayerOnly: z.boolean().optional(),
};
export const healthComponentSchema = z.discriminatedUnion("scale", [
  z.strictObject({
    ...componentBase,
    scale: z.literal("linear"),
    min: z.number(),
    max: z.number(),
  }),
  z.strictObject({
    ...componentBase,
    scale: z.literal("inverse"),
    /** 0 → full points; `max` or more → 0 points. */
    max: z.number().positive(),
  }),
  z.strictObject({
    ...componentBase,
    scale: z.literal("steps"),
    steps: z.array(z.strictObject({ gte: z.number(), pts: z.number().min(0).max(1) })).min(1),
  }),
]);
export type HealthComponent = z.infer<typeof healthComponentSchema>;

export const healthScoreSchema = z.strictObject({
  ...fileHeader,
  passThreshold: z.number().min(0).max(100),
  redistributeMissingComponents: z.boolean(),
  components: z.array(healthComponentSchema).min(1),
});
export type HealthScoreConfig = z.infer<typeof healthScoreSchema>;

// ── config/multiplayer.yaml ─────────────────────────────────────────────────
export const BOT_STRATEGIES = ["cautious", "balanced", "impulsive", "scammer-friend"] as const;
export const botStrategySchema = z.enum(BOT_STRATEGIES);
export type BotStrategy = z.infer<typeof botStrategySchema>;

export const multiplayerSchema = z.strictObject({
  ...fileHeader,
  minPlayers: z.number().int().min(1),
  maxPlayers: z.number().int().min(1),
  fillWithBots: z.boolean(),
  turnTimerSeconds: z.number().int().positive(),
  loans: z.strictObject({
    maxRatePerTurn: rateSchema,
    defaultInterestType: z.enum(["simple", "compound"]),
    maxLoanMultipleOfIncome: z.number().positive(),
    loanAppRatePerTurn: rateSchema,
    lateFine: rupeesSchema,
    /** A loan still unpaid this many turns after its due turn becomes a default. */
    defaultAfterTurnsLate: z.number().int().positive(),
    /**
     * Bank interest by Trust Score. Also used when a single player is forced to borrow
     * (a bad toss with no safety net).
     * DECISION: bank rates are per YEAR so they mean the same in month- and year-turn
     * chapters; friend-loan rates (`maxRatePerTurn`) stay per turn as in §8.14.
     */
    bankRateByTrust: z
      .array(
        z.strictObject({
          minTrust: z.number().min(0).max(100),
          /** `null` means the bank refuses to lend (the loan app is then the only option). */
          ratePerYear: rateSchema.nullable(),
        }),
      )
      .min(1),
    trust: z.strictObject({
      start: z.number().min(0).max(100),
      onTime: z.number(),
      late: z.number(),
      default: z.number(),
    }),
  }),
  bots: z.strictObject({
    strategies: z
      .array(
        z.strictObject({
          id: botStrategySchema,
          weight: z.number().nonnegative(),
          name: localizedStringSchema,
          chapters: z.array(idSchema).optional(),
        }),
      )
      .min(1),
  }),
  emotes: z.array(z.strictObject({ id: idSchema, icon: z.string(), label: localizedStringSchema })),
});
export type MultiplayerConfig = z.infer<typeof multiplayerSchema>;

// ── config/locales.yaml ─────────────────────────────────────────────────────
export const localesSchema = z.strictObject({
  ...fileHeader,
  default: localeSchema,
  locales: z
    .array(
      z.strictObject({
        id: localeSchema,
        nativeName: z.string(),
        dir: z.enum(["ltr", "rtl"]),
        enabled: z.boolean(),
      }),
    )
    .min(1),
});
export type LocalesConfig = z.infer<typeof localesSchema>;
