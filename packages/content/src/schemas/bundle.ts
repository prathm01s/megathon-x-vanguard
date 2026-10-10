import { z } from "zod";
import { chapterSchema } from "./chapters";
import {
  economySchema,
  healthScoreSchema,
  localesSchema,
  marketSchema,
  multiplayerSchema,
} from "./config";
import { lifeEventsFileSchema, scamsFileSchema } from "./events";
import { optionsFileSchema, techniquesFileSchema } from "./investments";
import { auctionsFileSchema, discussionPromptsFileSchema } from "./multiplayer";
import { mindsetQuestionsSchema, personasSchema } from "./onboarding";
import { badgesFileSchema, gyaanFileSchema, lifeReportRulesSchema } from "./report";

/**
 * Every single-file content type, keyed by its path under `content/` (without `.yaml`).
 * Chapters are the only multi-file type (`content/chapters/*.yaml`).
 */
export const FILE_SCHEMAS = {
  "config/economy": economySchema,
  "config/market": marketSchema,
  "config/health-score": healthScoreSchema,
  "config/multiplayer": multiplayerSchema,
  "config/locales": localesSchema,
  "onboarding/mindset-questions": mindsetQuestionsSchema,
  "onboarding/personas": personasSchema,
  "investments/options": optionsFileSchema,
  "investments/techniques": techniquesFileSchema,
  "events/life-events": lifeEventsFileSchema,
  "events/scams": scamsFileSchema,
  "multiplayer/auctions": auctionsFileSchema,
  "report/life-report-rules": lifeReportRulesSchema,
  "report/gyaan-check": gyaanFileSchema,
  "report/badges": badgesFileSchema,
  "ngo/discussion-prompts": discussionPromptsFileSchema,
} as const;
export type ContentFileKey = keyof typeof FILE_SCHEMAS;

export const CHAPTERS_DIR = "chapters";

/** The compiled content bundle the engine and UI read (`packages/content/dist/content.json`). */
export const contentBundleSchema = z.strictObject({
  /** Hash of all file contents; saved with every playthrough. */
  contentVersion: z.string(),
  economy: economySchema,
  market: marketSchema,
  healthScore: healthScoreSchema,
  multiplayer: multiplayerSchema,
  locales: localesSchema,
  mindset: mindsetQuestionsSchema,
  personas: personasSchema,
  options: optionsFileSchema,
  techniques: techniquesFileSchema,
  lifeEvents: lifeEventsFileSchema,
  scams: scamsFileSchema,
  auctions: auctionsFileSchema,
  lifeReport: lifeReportRulesSchema,
  gyaan: gyaanFileSchema,
  badges: badgesFileSchema,
  discussionPrompts: discussionPromptsFileSchema,
  chapters: z.array(chapterSchema),
});
export type ContentBundle = z.infer<typeof contentBundleSchema>;

/** Maps each file key to its property on the bundle. */
export const FILE_TO_BUNDLE_KEY = {
  "config/economy": "economy",
  "config/market": "market",
  "config/health-score": "healthScore",
  "config/multiplayer": "multiplayer",
  "config/locales": "locales",
  "onboarding/mindset-questions": "mindset",
  "onboarding/personas": "personas",
  "investments/options": "options",
  "investments/techniques": "techniques",
  "events/life-events": "lifeEvents",
  "events/scams": "scams",
  "multiplayer/auctions": "auctions",
  "report/life-report-rules": "lifeReport",
  "report/gyaan-check": "gyaan",
  "report/badges": "badges",
  "ngo/discussion-prompts": "discussionPrompts",
} as const satisfies Record<ContentFileKey, keyof ContentBundle>;
