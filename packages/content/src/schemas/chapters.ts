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

export const TASK_KINDS = ["need", "goal", "want", "safety"] as const;

/**
 * A task consequence, written as a small string so editors can read it:
 * - `blockGoal:<taskId>` blocks a specific goal task
 * - `blockNextChapterGoal` blocks the first optional goal of whichever chapter comes next
 *   (needed because ch2 branches into ch3a/ch3b)
 * - `salaryBonus:<rate>` raises income by the rate when the task is done (e.g. `salaryBonus:0.05`)
 */
export const consequenceSchema = z
  .string()
  .regex(/^(blockGoal:[a-z0-9-]+|blockNextChapterGoal|salaryBonus:\d+(\.\d+)?)$/, "unknown consequence format");

export const taskSchema = z.strictObject({
  id: idSchema,
  title: localizedStringSchema,
  /** 1–3 words shown under the task's building in the village. Falls back to `title`. */
  shortTitle: localizedStringSchema.optional(),
  description: localizedStringSchema.optional(),
  kind: z.enum(TASK_KINDS),
  /**
   * For `safety` tasks with `targetMonthsOfExpenses`, the amount is computed from
   * fixed expenses instead and this value is shown as the initial estimate.
   */
  amount: rupeesSchema,
  targetMonthsOfExpenses: z.number().positive().optional(),
  /** 1-based turn by which the task must be done. */
  dueTurn: z.number().int().positive(),
  required: z.boolean(),
  lateFine: rupeesSchema.default(0),
  /** Applied if the task is missed (`blockGoal:`) or completed (`salaryBonus:`). */
  consequence: consequenceSchema.optional(),
  onCompleteConsequence: consequenceSchema.optional(),
  inflationAdjusted: z.boolean().default(false),
  pillar: pillarSchema,
  icon: z.string(),
});
export type Task = z.infer<typeof taskSchema>;

const incomeSchema = z.strictObject({
  label: localizedStringSchema,
  /** Income per MONTH in rupees; the engine multiplies by 12 for year-long turns. */
  amountPerMonth: rupeesSchema,
  /** `economy` uses `economy.salaryGrowthPerYear`; a number overrides it. */
  growthPerYear: z.union([z.literal("economy"), rateSchema]),
  /** Business chapters: ± fraction of income that varies each turn. */
  variability: probabilitySchema.default(0),
});

const fixedExpenseSchema = z.strictObject({
  id: idSchema,
  label: localizedStringSchema,
  amountPerMonth: rupeesSchema,
  inflationAdjusted: z.boolean(),
  icon: z.string(),
});

export const chapterSchema = z.strictObject({
  ...fileHeader,
  id: idSchema,
  enabled: z.boolean(),
  order: z.number().int().positive(),
  title: localizedStringSchema,
  ageRange: z.tuple([z.number().int(), z.number().int()]),
  stage: localizedStringSchema,
  turnUnit: z.enum(["month", "year"]),
  turns: z.number().int().positive(),
  startingBalance: rupeesSchema,
  income: incomeSchema,
  fixedExpenses: z.array(fixedExpenseSchema),
  tasks: z.array(taskSchema),
  unlockOptions: z.array(idSchema),
  lifeEventPool: z.array(
    z.strictObject({ eventId: idSchema, weight: z.number().nonnegative().default(1) }),
  ),
  scamPool: z.array(idSchema),
  auctionIds: z.array(idSchema),
  /** Next chapter id, a career choice between ids, or `end`. */
  next: z.union([
    idSchema,
    z.strictObject({ choice: z.array(idSchema).min(2) }),
    z.literal("end"),
  ]),
  passThreshold: z.number().min(0).max(100).optional(),
  intro: localizedStringSchema,
  outro: localizedStringSchema,
  discussionPromptIds: z.array(idSchema),
  /** Free-form notes for content editors while the chapter is still an outline. */
  outline: z.string().optional(),
});
export type Chapter = z.infer<typeof chapterSchema>;
