import { describe, expect, it } from "vitest";
import { EngineError } from "../src/errors";
import { migrateState } from "../src/migrate";
import { advanceTurn } from "../src/turn";
import { STATE_SCHEMA_VERSION } from "../src/types";
import { content } from "./helpers";

/** Shape of a schema-v1 save (day-zero engine). */
const v1Save = {
  schemaVersion: 1,
  contentVersion: "old",
  seed: "old-save",
  personaId: "safe-keeper",
  chapterId: "ch2-first-job",
  turn: 1,
  totalTurns: 5,
  turnUnit: "year",
  status: "playing",
  cash: 50000_00,
  incomePerMonth: 32400_00,
  incomeModifiers: [],
  inflationIndex: 1.06,
  holdings: [{ optionId: "fd", invested: 10000_00, value: 10675_00, maturesAtTurn: 3 }],
  sips: [],
  tasks: [],
  pendingScams: [],
  eventCooldowns: {},
  scamsFallenIds: [],
  carryOver: { blockNextChapterGoal: false, salaryBonusRate: 0 },
  trustScore: 50,
  stats: { scamsSpotted: 1, shiftStreaks: { x: 1 } },
  history: [],
  actionLog: [],
  tosses: [],
};

describe("loading older saves (§8.1)", () => {
  it("upgrades a v1 save and keeps playing without crashing", () => {
    const s = migrateState(v1Save, content());
    expect(s.schemaVersion).toBe(STATE_SCHEMA_VERSION);
    expect(s.holdings[0]).toMatchObject({ value: 10675_00, units: 10675_00 / 1000 });
    expect(s.stats.scamsSpotted).toBe(1);
    expect(s.carryOver.shiftStreaks).toEqual({ x: 1 });
    expect(s.debt).toBe(0);
    expect(() => advanceTurn(s, content())).not.toThrow();
  });

  it("refuses a save from a newer app version", () => {
    expect(() => migrateState({ ...v1Save, schemaVersion: 99 }, content())).toThrow(EngineError);
  });

  it("leaves a current save unchanged", () => {
    const s = migrateState(v1Save, content());
    expect(migrateState(s, content())).toEqual(s);
  });
});
