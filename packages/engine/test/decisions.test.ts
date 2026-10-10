import { describe, expect, it } from "vitest";
import { applyAction } from "../src/actions";
import { chapterResultRecords, toDecisionLog } from "../src/decisions";
import { applyLifeEvent } from "../src/events";
import { optionMap } from "../src/helpers";
import { computeMetrics } from "../src/metrics";
import { advanceTurn } from "../src/turn";
import { ch2ChapterResult } from "../fixtures";
import { ch2, content } from "./helpers";

const bonus = () => content().lifeEvents.events.find((e) => e.id === "bonus")!;

describe("windfall saving (windfallSavedPct)", () => {
  it("counts a windfall as saved when it is invested in the next decide phase", () => {
    let s = { ...ch2(), cash: 0 };
    applyLifeEvent(s, bonus(), content(), optionMap(content()), []); // +1 month salary
    const windfall = s.stats.windfallReceived;
    s = applyAction(
      s,
      { type: "invest", optionId: "fd", amount: Math.round(windfall * 0.75) },
      content(),
    );
    expect(computeMetrics(s, content()).windfallSavedPct).toBeCloseTo(0.75, 2);
  });

  it("paying into the emergency fund also counts; spending on wants does not", () => {
    let s = { ...ch2(), cash: 0 };
    applyLifeEvent(s, bonus(), content(), optionMap(content()), []);
    s = applyAction(
      s,
      { type: "pay_task", taskId: "ch2-friend-wedding", amount: 5000_00 },
      content(),
    );
    expect(s.stats.windfallSaved).toBe(0);
    s = applyAction(
      s,
      { type: "pay_task", taskId: "ch2-emergency-fund", amount: 10000_00 },
      content(),
    );
    expect(s.stats.windfallSaved).toBe(10000_00);
  });

  it("the window closes at the next toss", () => {
    // A seed whose first toss brings no new windfall and no scam card.
    for (let i = 0; i < 50; i++) {
      let s = { ...ch2(`window-${i}`), cash: 0 };
      applyLifeEvent(s, bonus(), content(), optionMap(content()), []);
      const { state, tossResult } = advanceTurn(s, content());
      if (tossResult.lifeEventId || state.status !== "playing") continue;
      s = applyAction(state, { type: "invest", optionId: "fd", amount: 10000_00 }, content());
      expect(s.stats.windfallSaved).toBe(0);
      return;
    }
    throw new Error("no suitable seed");
  });

  it("never counts more than the windfall", () => {
    let s = { ...ch2(), cash: 0 };
    applyLifeEvent(s, bonus(), content(), optionMap(content()), []);
    s = { ...s, cash: 999999_00 };
    s = applyAction(s, { type: "invest", optionId: "fd", amount: 500000_00 }, content());
    expect(s.stats.windfallSaved).toBe(s.stats.windfallReceived);
  });
});

describe("decision records", () => {
  it("maps chapter results to chapter_end (with the score) and persona_shift", () => {
    const records = chapterResultRecords(
      { ...ch2ChapterResult, personaShift: { from: "a", to: "b", ruleId: "r" } },
      5,
    );
    expect(records[0]).toMatchObject({
      type: "chapter_end",
      turn: 5,
      payload: { healthScore: ch2ChapterResult.healthScore },
    });
    expect(records[1]).toMatchObject({ type: "persona_shift", payload: { from: "a", to: "b" } });
  });

  it("doesn't log non-decision events, and logs forced borrowing as a loan", () => {
    const ctx = { chapterId: "ch2-first-job", turn: 1 };
    expect(toDecisionLog({ type: "income", amount: 1 }, ctx)).toBeNull();
    expect(toDecisionLog({ type: "chapter_complete" }, ctx)).toBeNull();
    expect(
      toDecisionLog({ type: "forced_borrowing", amount: 5, ratePerYear: 0.14 }, ctx),
    ).toMatchObject({
      type: "loan_taken",
      payload: { lender: "bank", forced: true },
    });
  });
});
