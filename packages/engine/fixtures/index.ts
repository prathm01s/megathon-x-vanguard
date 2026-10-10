// Typed fixtures (§15.2): ch2 state at turns 0, 2, 5, a ChapterResult and a room.
// Regenerate with `pnpm --filter @toss/engine fixtures` after engine changes.
import { viewRoomFor } from "../src/room";
import type { ChapterResult, GameState, RoomState, RoomView } from "../src/types";
import turn0 from "./ch2-turn0.json";
import turn2 from "./ch2-turn2.json";
import turn5 from "./ch2-turn5.json";
import chapterResult from "./ch2-chapter-result.json";
import room from "./room-state.json";

export const ch2Turn0 = turn0 as unknown as GameState;
export const ch2Turn2 = turn2 as unknown as GameState;
export const ch2Turn5 = turn5 as unknown as GameState;
export const ch2ChapterResult = chapterResult as unknown as ChapterResult;
// JSON imports widen string unions to `string`; the generator builds this with the real
// room rules, so the shape is guaranteed.
export const sampleRoomState = room as unknown as RoomState;

/** The same room as the human player ("mock-user") sees it: their own state, others redacted. */
export const sampleRoomView: RoomView = viewRoomFor(sampleRoomState, "mock-user");
