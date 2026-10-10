// ─────────────────────────────────────────────────────────────────────────────
// ENGINE API (§15.4 A). Pure: (state, action, content) → new state. No I/O.
// This file is the stable public surface; the work happens in the modules:
//   playthrough.ts  createPlaythrough           actions.ts  decide phase
//   turn.ts         the toss, month by month    chapter.ts  score, report, badges
//   whatif.ts       same-seed replays           decisions.ts decision log records
//   market / portfolio / economy / tasks / events / cashflow / loans / auction / bots
// ─────────────────────────────────────────────────────────────────────────────
import type { ContentBundle } from "@toss/content";
import { scoreMindset as scoreMindsetImpl } from "./persona";
import type { MindsetAnswers, MindsetResult } from "./types";

export { EngineError, NotImplementedError } from "./errors";
export { createPlaythrough } from "./playthrough";
export { getAvailableActions, applyAction } from "./actions";
export { advanceTurn } from "./turn";
export { endChapter } from "./chapter";
export { replayWithChange, replay, chooseWhatIf } from "./whatif";
export { toDecisionLog } from "./decisions";
export { migrateState } from "./migrate";
export { tossFor } from "./market";
export { allowedOptions, unlockedOptions, startChapterFor } from "./helpers";

export function scoreMindset(answers: MindsetAnswers, content: ContentBundle): MindsetResult {
  return scoreMindsetImpl(answers, content);
}
