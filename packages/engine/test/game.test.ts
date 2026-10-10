import { describe, expect, it } from "vitest";
import {
  EngineError,
  advanceTurn,
  applyAction,
  createPlaythrough,
  getAvailableActions,
  replayWithChange,
  tossFor,
} from "../src/api";
import { scriptedCh2Game } from "../fixtures/scenario";
import { content } from "./helpers";

const ch2 = (seed = "test-seed") =>
  createPlaythrough({
    content: content(),
    personaId: "safe-keeper",
    seed,
    chapterId: "ch2-first-job",
  });

describe("chapter 2 setup", () => {
  it("starts with the chapter balance in paise and its tasks", () => {
    const s = ch2();
    expect(s.cash).toBe(15000_00);
    expect(s.turn).toBe(0);
    expect(s.tasks.map((t) => t.taskId)).toContain("ch2-sister-fees");
    // Emergency fund = 3 x (15,000 + 3,000) monthly expenses.
    expect(s.tasks.find((t) => t.taskId === "ch2-emergency-fund")?.amount).toBe(54000_00);
  });

  it("offers only options unlocked by ch2", () => {
    const invest = getAvailableActions(ch2(), content())
      .filter((a) => a.type === "invest")
      .map((a) => a.targetId);
    expect(invest).toEqual(expect.arrayContaining(["savings", "rd", "fd", "gold", "equity-fund"]));
    expect(invest).not.toContain("index-fund");
  });
});

describe("actions", () => {
  it("rejects spending more cash than the player has", () => {
    expect(() =>
      applyAction(ch2(), { type: "invest", optionId: "savings", amount: 99_999_999 }, content()),
    ).toThrow(EngineError);
  });

  it("charges the 1% penalty when an FD is broken early", () => {
    let s = applyAction(ch2(), { type: "invest", optionId: "fd", amount: 10000_00 }, content());
    const cashBefore = s.cash;
    s = applyAction(s, { type: "withdraw", optionId: "fd", amount: 10000_00 }, content());
    expect(s.cash - cashBefore).toBe(9900_00);
    expect(s.stats.fdBrokenEarly).toBe(true);
  });

  it("moves emergency-fund payments into savings instead of spending them", () => {
    const s = applyAction(
      ch2(),
      { type: "pay_task", taskId: "ch2-emergency-fund", amount: 5000_00 },
      content(),
    );
    expect(s.holdings.find((h) => h.optionId === "savings")?.value).toBe(5000_00);
  });
});

describe("turns and tosses", () => {
  it("market tosses depend only on seed and turn", () => {
    expect(tossFor("abc", 3, content(), "year")).toEqual(tossFor("abc", 3, content(), "year"));
  });

  it("fixed-rate options grow by exactly their rate in a year-long turn", () => {
    let s = applyAction(ch2(), { type: "invest", optionId: "fd", amount: 10000_00 }, content());
    s = advanceTurn(s, content()).state;
    expect(s.holdings.find((h) => h.optionId === "fd")?.value).toBe(10675_00);
  });

  it("raises the price index by the yearly inflation rate", () => {
    const s = advanceTurn(ch2(), content()).state;
    expect(s.inflationIndex).toBeCloseTo(1.06);
    expect(s.history.at(-1)!.realValue).toBe(Math.round(s.history.at(-1)!.amount / 1.06));
  });
});

describe("determinism and What if (§7.2)", () => {
  it("same seed + same decisions = identical playthrough", () => {
    const a = scriptedCh2Game(content(), "det-seed");
    const b = scriptedCh2Game(content(), "det-seed");
    expect(a.states.at(-1)).toEqual(b.states.at(-1));
    expect(a.result).toEqual(b.result);
  });

  it("replaying with no change reproduces the original exactly", () => {
    const { states } = scriptedCh2Game(content(), "replay-seed");
    const final = states.at(-1)!;
    const unchanged = replayWithChange(
      final,
      { type: "replace_action", index: -1, action: null },
      content(),
    );
    expect(unchanged.difference).toBe(0);
    expect(unchanged.series.map((p) => p.alternative)).toEqual(
      final.history.map((h) => h.realValue),
    );
  });

  it("a changed decision changes the outcome but not the tosses", () => {
    const { states } = scriptedCh2Game(content(), "whatif-seed");
    const final = states.at(-1)!;
    // Drop the first action (the wedding gift): the player keeps 5,000 rupees more.
    const result = replayWithChange(
      final,
      { type: "replace_action", index: 0, action: null },
      content(),
    );
    expect(result.difference).not.toBe(0);
    expect(result.series).toHaveLength(final.history.length);
  });
});
