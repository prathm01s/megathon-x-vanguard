import { z } from "zod";
import {
  fileHeader,
  idSchema,
  localizedStringSchema,
  pillarSchema,
  probabilitySchema,
  rateSchema,
  rupeesSchema,
} from "./common";

/**
 * How much an event costs or pays. One of:
 * - a fixed rupee amount
 * - a multiple of monthly income (`bonus` = 1 month's salary)
 * - an income change (`promotion` +10%, `slow-season` −40% for some turns, `job-break` 0 for 3 months)
 */
export const eventEffectSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("fixed"), amount: rupeesSchema }),
  z.strictObject({ type: z.literal("monthsOfIncome"), months: z.number().positive() }),
  z.strictObject({
    type: z.literal("incomeChange"),
    /** −1 = no income, 0.1 = +10%. */
    rate: rateSchema,
    /** How long the change lasts, in months. Omit for a permanent change. */
    durationMonths: z.number().int().positive().optional(),
  }),
]);
export type EventEffect = z.infer<typeof eventEffectSchema>;

// ── events/life-events.yaml ─────────────────────────────────────────────────
export const lifeEventSchema = z.strictObject({
  id: idSchema,
  enabled: z.boolean().default(true),
  title: localizedStringSchema,
  description: localizedStringSchema,
  type: z.enum(["bad", "good"]),
  baseProbabilityPerTurn: probabilitySchema,
  effect: eventEffectSchema,
  tags: z.array(z.string()).min(1),
  chapters: z.array(idSchema).min(1),
  cooldownTurns: z.number().int().nonnegative(),
  teaches: z.array(z.union([pillarSchema, idSchema])),
  icon: z.string(),
});
export type LifeEvent = z.infer<typeof lifeEventSchema>;

export const lifeEventsFileSchema = z.strictObject({
  ...fileHeader,
  events: z.array(lifeEventSchema).min(1),
});

// ── events/scams.yaml ───────────────────────────────────────────────────────
export const SCAM_CHANNELS = ["message", "call", "investment_listing", "friend_offer", "app"] as const;
export const SCAM_ACTIONS = ["pay", "share_otp", "install", "invest", "ignore", "report", "ask_friend"] as const;
export const scamActionSchema = z.enum(SCAM_ACTIONS);
export type ScamAction = z.infer<typeof scamActionSchema>;

export const scamSchema = z.strictObject({
  id: idSchema,
  enabled: z.boolean().default(true),
  title: localizedStringSchema,
  channel: z.enum(SCAM_CHANNELS),
  /** Chapter ids; `room` means the scam can appear in a Friends' Room. */
  chapters: z.array(z.union([idSchema, z.literal("room")])).min(1),
  trigger: z.enum(["random", "after_bad_toss"]),
  probability: probabilitySchema,
  /** Fictional sender shown on the card (never a real brand). */
  sender: localizedStringSchema,
  offerText: localizedStringSchema,
  actions: z
    .array(
      z.strictObject({
        id: scamActionSchema,
        label: localizedStringSchema,
        /** `true` = the player fell for it. */
        falls: z.boolean(),
      }),
    )
    .min(2),
  lossIfFallen: z.discriminatedUnion("type", [
    z.strictObject({ type: z.literal("fixed"), amount: rupeesSchema }),
    z.strictObject({ type: z.literal("pctOfBalance"), pct: probabilitySchema }),
  ]),
  redFlags: z.array(localizedStringSchema).min(1),
  /** Falling for it counts as taking high-interest debt (loan apps). */
  createsHighInterestDebt: z.boolean().default(false),
  /** This scam is a disguised repeat of another one. */
  repeatVariantOf: idSchema.optional(),
  pillar: z.literal("stay-safe"),
  icon: z.string(),
});
export type Scam = z.infer<typeof scamSchema>;

export const scamsFileSchema = z.strictObject({
  ...fileHeader,
  /** Probability multiplier right after a bad life event, for `after_bad_toss` scams. */
  afterBadTossMultiplier: z.number().nonnegative(),
  scams: z.array(scamSchema).min(1),
});
