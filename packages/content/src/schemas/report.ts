import { z } from "zod";
import { fileHeader, idSchema, localizedStringSchema, pillarSchema, rupeesSchema } from "./common";
import { conditionSchema } from "./conditions";

// ── report/life-report-rules.yaml ───────────────────────────────────────────
export const reportRuleSchema = z.strictObject({
  id: idSchema,
  section: z.enum(["did-well", "could-be-better"]),
  /** Higher wins. */
  priority: z.number().int(),
  when: conditionSchema,
  text: localizedStringSchema,
  pillar: pillarSchema,
  techniqueId: idSchema.optional(),
});
export type ReportRule = z.infer<typeof reportRuleSchema>;

/**
 * A decision transform for the "What if" replay. The engine re-runs the chapter
 * with the same seed and this one change applied.
 */
export const decisionTransformSchema = z.discriminatedUnion("type", [
  /** Start a SIP in `optionId` from `fromTurn`, funded from idle cash. */
  z.strictObject({
    type: z.literal("startSip"),
    optionId: idSchema,
    amountPerMonth: rupeesSchema,
    fromTurn: z.number().int().positive(),
  }),
  /** Move a share of an option's balance into a SIP/lump sum in another option. */
  z.strictObject({
    type: z.literal("moveShare"),
    fromOptionId: idSchema,
    toOptionId: idSchema,
    share: z.number().min(0).max(1),
    asSip: z.boolean(),
  }),
  /** Answer every scam with `ignore`. */
  z.strictObject({ type: z.literal("ignoreScams") }),
  /** Fill the emergency fund in `optionId` before anything else. */
  z.strictObject({
    type: z.literal("emergencyFundFirst"),
    optionId: idSchema,
    months: z.number().positive(),
  }),
  /** Never sell market options during a crash. */
  z.strictObject({ type: z.literal("holdThroughCrash") }),
]);
export type DecisionTransform = z.infer<typeof decisionTransformSchema>;

export const whatIfCandidateSchema = z.strictObject({
  id: idSchema,
  priority: z.number().int(),
  when: conditionSchema,
  transform: decisionTransformSchema,
  /** Describes the change, e.g. "started a ₹500 monthly SIP in Sunrise Equity Fund". */
  changeText: localizedStringSchema,
});
export type WhatIfCandidate = z.infer<typeof whatIfCandidateSchema>;

export const lifeReportRulesSchema = z.strictObject({
  ...fileHeader,
  maxDidWell: z.number().int().positive(),
  maxCouldBeBetter: z.number().int().positive(),
  rules: z.array(reportRuleSchema).min(1),
  whatIf: z.strictObject({
    /** Template: "If you had {change}, you would have about {difference} more today, ..." */
    template: localizedStringSchema,
    candidates: z.array(whatIfCandidateSchema).min(1),
  }),
});
export type LifeReportRulesFile = z.infer<typeof lifeReportRulesSchema>;

// ── report/gyaan-check.yaml ─────────────────────────────────────────────────
export const gyaanQuestionSchema = z.strictObject({
  id: idSchema,
  chapterId: idSchema,
  prompt: localizedStringSchema,
  options: z.array(z.strictObject({ id: idSchema, label: localizedStringSchema })).min(2).max(4),
  correctOptionId: idSchema,
  explanation: localizedStringSchema,
  pillar: pillarSchema,
  techniqueId: idSchema.optional(),
});
export type GyaanQuestion = z.infer<typeof gyaanQuestionSchema>;

export const gyaanFileSchema = z.strictObject({
  ...fileHeader,
  questionsPerChapter: z.number().int().positive(),
  questions: z.array(gyaanQuestionSchema).min(1),
});

// ── report/badges.yaml ──────────────────────────────────────────────────────
export const badgeSchema = z.strictObject({
  id: idSchema,
  enabled: z.boolean().default(true),
  title: localizedStringSchema,
  description: localizedStringSchema,
  icon: z.string(),
  when: conditionSchema,
});
export type Badge = z.infer<typeof badgeSchema>;

export const badgesFileSchema = z.strictObject({
  ...fileHeader,
  badges: z.array(badgeSchema).min(1),
});
