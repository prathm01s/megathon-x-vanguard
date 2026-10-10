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
