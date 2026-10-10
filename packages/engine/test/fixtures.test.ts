import { describe, expect, it } from "vitest";
import { ch2ChapterResult, ch2Turn0, ch2Turn2, ch2Turn5, sampleRoomState } from "../fixtures";
import { sampleRoom, scriptedCh2Game } from "../fixtures/scenario";
import { content } from "./helpers";

// Pragya and Prathmesh build against these JSON fixtures. If the engine changes behaviour or
// shape, this fails: run `pnpm --filter @toss/engine fixtures` and commit the new JSON.
describe("fixtures are up to date with the engine", () => {
  // JSON round-trip drops `undefined` fields, exactly like the generator's JSON.stringify.
  const json = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

  it("ch2 states and chapter result", () => {
    const { states, result } = scriptedCh2Game(content());
    expect(json(states[0])).toEqual(ch2Turn0);
    expect(json(states[2])).toEqual(ch2Turn2);
    expect(json(states[5])).toEqual(ch2Turn5);
    expect(json(result)).toEqual(ch2ChapterResult);
  });

  it("room", () => {
    expect(json(sampleRoom(content()))).toEqual(sampleRoomState);
  });
});
