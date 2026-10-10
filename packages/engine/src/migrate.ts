// Loads saves made by older engine versions (§8.1: "the engine must handle loading a
// save made with an older version — fall back gracefully; never crash").
import type { ContentBundle } from "@toss/content";
import { EngineError } from "./errors";
import { emptyCarryOver, emptyStats } from "./helpers";
import { BASE_UNIT_PRICE } from "./portfolio";
import { STATE_SCHEMA_VERSION, type GameState } from "./types";

type AnyRecord = Record<string, unknown>;

/**
 * Upgrades a stored `GameState` to the current schema. Options or tasks that no longer
 * exist in `content` are left in place: their holdings simply stop growing.
 */
export function migrateState(raw: unknown, content: ContentBundle): GameState {
  if (typeof raw !== "object" || raw === null)
    throw new EngineError("bad_save", "save is not an object");
  const s = structuredClone(raw) as AnyRecord;
  const version = typeof s.schemaVersion === "number" ? s.schemaVersion : 1;
  if (version > STATE_SCHEMA_VERSION) {
    throw new EngineError("save_too_new", `save version ${version} is newer than this app`);
  }

  if (version < 2) {
    // v1 → v2: unit-priced holdings, bank debt, carry-over split, monthly income modifiers.
    s.debt = 0;
    s.navs = Object.fromEntries(content.options.options.map((o) => [o.id, 1]));
    s.holdings = ((s.holdings as AnyRecord[] | undefined) ?? []).map((h) => ({
      ...h,
      units: Number(h.value ?? 0) / BASE_UNIT_PRICE,
      investedReal: Number(h.investedReal ?? h.invested ?? 0),
    }));
    s.incomeModifiers = [];
    const oldStats = (s.stats as AnyRecord | undefined) ?? {};
    const { shiftStreaks, ...restStats } = oldStats;
    s.stats = { ...emptyStats(), ...restStats };
    const oldCarry = (s.carryOver as AnyRecord | undefined) ?? {};
    s.carryOver = {
      ...emptyCarryOver(),
      ...oldCarry,
      shiftStreaks: (shiftStreaks as Record<string, number> | undefined) ?? {},
    };
    s.carriedIn = emptyCarryOver();
  }

  s.schemaVersion = STATE_SCHEMA_VERSION;
  return s as unknown as GameState;
}
