import { z } from "zod";
import { fileHeader, idSchema, localizedStringSchema } from "./common";
import { conditionSchema, mindsetConditionSchema } from "./conditions";

// ── onboarding/mindset-questions.yaml ───────────────────────────────────────
const traitPointsSchema = z.strictObject({
  plan: z.number().int().min(0).optional(),
  risk: z.number().int().min(0).optional(),
  know: z.number().int().min(0).optional(),
});
export type TraitPoints = z.infer<typeof traitPointsSchema>;

export const mindsetQuestionSchema = z.strictObject({
  id: idSchema,
  prompt: localizedStringSchema,
  /** What the question reveals (for the NGO dashboard, never shown to students). */
  reveals: localizedStringSchema,
  options: z
    .array(
      z.strictObject({
        id: idSchema,
        label: localizedStringSchema,
        icon: z.string(),
        points: traitPointsSchema,
        /** Shown only in the post-game comparison, so the pre-check doesn't teach answers. */
        insight: localizedStringSchema,
      }),
    )
    .min(2)
    .max(4),
});
export type MindsetQuestion = z.infer<typeof mindsetQuestionSchema>;

export const mindsetQuestionsSchema = z.strictObject({
  ...fileHeader,
  /** Maximum points per trait, used for validation and dashboard normalisation. */
  traitMax: z.strictObject({ plan: z.number().int(), risk: z.number().int(), know: z.number().int() }),
  questions: z.array(mindsetQuestionSchema).min(1),
});
export type MindsetQuestionsFile = z.infer<typeof mindsetQuestionsSchema>;

// ── onboarding/personas.yaml ────────────────────────────────────────────────
/**
 * A persona is also a difficulty level (team decision 2026-10-11, docs/plan-v2.md D4–D6): it
 * decides which investment options the player may use, how much cushion they start with and
 * the pass mark. Rookies get a simpler board and more help; Masters get every tool.
 */
export const difficultySchema = z.strictObject({
  tier: z.enum(["rookie", "builder", "challenger", "master"]),
  label: localizedStringSchema,
  /** 1–4, shown as stars. */
  stars: z.number().int().min(1).max(4),
  /** One line for the persona and chapter screens. */
  summary: localizedStringSchema,
  /** Options this persona may use (each chapter's unlocks still apply). Omit for all. */
  optionIds: z.array(idSchema).optional(),
  /** Extra starting cash as a share of the chapter's starting balance (0.5 = +50%). */
  startingBonus: z.number().min(0).max(2).default(0),
  /** Added to the chapter's pass mark (negative = easier). */
  passThresholdOffset: z.number().min(-30).max(30).default(0),
});
export type Difficulty = z.infer<typeof difficultySchema>;

export const personaSchema = z.strictObject({
  id: idSchema,
  enabled: z.boolean().default(true),
  name: localizedStringSchema,
  strength: localizedStringSchema,
  blindSpot: localizedStringSchema,
  avatarHint: z.string(),
  startChapter: idSchema,
  guidedFirstTurn: z.boolean(),
  /** Multiplier on life-event probability by event tag, e.g. `{ health: 1.2 }`. */
  eventMultipliers: z.record(z.string(), z.number().nonnegative()),
  scamMultiplier: z.number().nonnegative(),
  highlightTechniques: z.array(idSchema),
  mentorTips: z.array(localizedStringSchema),
  difficulty: difficultySchema,
});
export type Persona = z.infer<typeof personaSchema>;

export const personasSchema = z.strictObject({
  ...fileHeader,
  personas: z.array(personaSchema).min(1),
  /** Ordered; first match wins. The last rule should be `{ always: true }`. */
  assignmentRules: z
    .array(z.strictObject({ personaId: idSchema, when: mindsetConditionSchema }))
    .min(1),
  /** Evaluated at chapter end using chapter metrics. */
  shiftRules: z.array(
    z.strictObject({
      id: idSchema,
      from: idSchema,
      to: idSchema,
      when: conditionSchema,
      /** The condition must hold at the end of this many consecutive chapters. */
      consecutiveChapters: z.number().int().positive().default(1),
      message: localizedStringSchema,
    }),
  ),
});
export type PersonasFile = z.infer<typeof personasSchema>;
