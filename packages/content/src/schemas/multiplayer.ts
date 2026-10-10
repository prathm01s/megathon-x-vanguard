import { z } from "zod";
import { fileHeader, idSchema, localizedStringSchema, rupeesSchema } from "./common";

// ── multiplayer/auctions.yaml ───────────────────────────────────────────────
export const auctionSchema = z.strictObject({
  id: idSchema,
  enabled: z.boolean().default(true),
  title: localizedStringSchema,
  description: localizedStringSchema,
  chapter: idSchema,
  turn: z.number().int().positive(),
  bidType: z.enum(["sealed", "open"]).default("sealed"),
  /** Revealed after the auction, to teach value vs. price. */
  trueValue: rupeesSchema,
  minBid: rupeesSchema,
  allowPoolBid: z.boolean(),
  /** Income the item yields each turn after winning (e.g. a shop's earnings). */
  returnStream: z
    .strictObject({ amountPerTurn: rupeesSchema, turns: z.number().int().positive() })
    .optional(),
  mutualFundReveal: z.boolean(),
  icon: z.string(),
});
export type Auction = z.infer<typeof auctionSchema>;

export const auctionsFileSchema = z.strictObject({
  ...fileHeader,
  mutualFundRevealText: localizedStringSchema,
  auctions: z.array(auctionSchema).min(1),
});

// ── ngo/discussion-prompts.yaml ─────────────────────────────────────────────
export const discussionPromptSchema = z.strictObject({
  id: idSchema,
  chapterId: idSchema,
  text: localizedStringSchema,
});
export type DiscussionPrompt = z.infer<typeof discussionPromptSchema>;

export const discussionPromptsFileSchema = z.strictObject({
  ...fileHeader,
  prompts: z.array(discussionPromptSchema).min(1),
});
