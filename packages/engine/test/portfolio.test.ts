import { describe, expect, it } from "vitest";
import { applyAction } from "../src/actions";
import { payOut } from "../src/cashflow";
import { cashLossThisTurn, incomeForMonth, tickIncomeModifiers } from "../src/economy";
import { optionMap } from "../src/helpers";
import { createRng } from "../src/rng";
import { advanceTurn } from "../src/turn";
import type { GameEvent } from "../src/types";
import { ch2, content, seedWithMarket } from "./helpers";

const sipUnits = (events: GameEvent[]) =>
  events.find((e): e is Extract<GameEvent, { type: "sip_buy" }> => e.type === "sip_buy");

describe("SIP and rupee-cost averaging", () => {
  // 12 instalments of 2,000 rupees at a starting price of 10 rupees/unit = 2,400 units if
  // the price never moved.
  const AMOUNT = 2000_00;
  const flatUnits = (12 * AMOUNT) / 1000;

  it("buys MORE units than at the starting price in a market storm", () => {
    let s = applyAction(
      ch2(seedWithMarket("crash")),
      { type: "sip_start", optionId: "equity-fund", amountPerMonth: AMOUNT },
      content(),
    );
    const { events } = advanceTurn(s, content());
    expect(sipUnits(events)!.amount).toBe(12 * AMOUNT);
    expect(sipUnits(events)!.units).toBeGreaterThan(flatUnits);
    s = advanceTurn(s, content()).state;
    expect(s.sips[0]!.startedTurn).toBe(1);
  });

  it("buys FEWER units in a boom year", () => {
    const s = applyAction(
      ch2(seedWithMarket("boom")),
      { type: "sip_start", optionId: "equity-fund", amountPerMonth: AMOUNT },
      content(),
    );
    expect(sipUnits(advanceTurn(s, content()).events)!.units).toBeLessThan(flatUnits);
  });

  it("skips an instalment when the wallet can't cover it", () => {
    let s = ch2();
    s = { ...s, cash: 0, incomePerMonth: 0 };
    s = applyAction(
      s,
      { type: "sip_start", optionId: "equity-fund", amountPerMonth: AMOUNT },
      content(),
    );
    const next = advanceTurn(s, content()).state;
    expect(next.stats.sipInstalmentsMissed).toBeGreaterThan(0);
  });

  it("runs a recurring deposit as monthly instalments with the RD's fixed growth", () => {
    let s = applyAction(
      ch2(),
      { type: "sip_start", optionId: "rd", amountPerMonth: 1000_00 },
      content(),
    );
    s = advanceTurn(s, content()).state;
    const rd = s.holdings.find((h) => h.optionId === "rd")!;
    expect(rd.invested).toBe(12 * 1000_00);
    expect(rd.value).toBeGreaterThan(rd.invested); // grew at 6.5% a year while depositing
    expect(rd.value).toBeLessThan(rd.invested * 1.065);
  });
});

describe("income", () => {
  it("applies temporary modifiers such as a job break, then expires them", () => {
    const s = { ...ch2(), incomeModifiers: [{ eventId: "job-break", rate: -1, monthsLeft: 2 }] };
    expect(incomeForMonth(s, 1)).toBe(0);
    tickIncomeModifiers(s);
    tickIncomeModifiers(s);
    expect(s.incomeModifiers).toHaveLength(0);
    expect(incomeForMonth(s, 1)).toBe(s.incomePerMonth);
  });
});

describe("unavoidable payments: wallet, then savings, then a forced loan", () => {
  it("uses the wallet first", () => {
    const s = { ...ch2(), cash: 10000_00 };
    const r = payOut(s, 4000_00, content(), optionMap(content()), []);
    expect(r).toEqual({ fromCash: 4000_00, fromSavings: 0, borrowed: 0 });
  });

  it("then draws from the emergency fund", () => {
    let s = { ...ch2(), cash: 20000_00 };
    s = applyAction(s, { type: "invest", optionId: "savings", amount: 20000_00 }, content());
    const r = payOut(s, 5000_00, content(), optionMap(content()), []);
    expect(r).toEqual({ fromCash: 0, fromSavings: 5000_00, borrowed: 0 });
    expect(s.debt).toBe(0);
  });

  it("only borrows when both are empty, and counts it as a loan", () => {
    const s = { ...ch2(), cash: 0 };
    const events: GameEvent[] = [];
    const r = payOut(s, 3000_00, content(), optionMap(content()), events);
    expect(r.borrowed).toBe(3000_00);
    expect(s.debt).toBe(3000_00);
    expect(s.stats.loansTaken).toBe(1);
    expect(events[0]).toMatchObject({ type: "forced_borrowing", amount: 3000_00 });
  });

  it("charges interest on debt and repays it from later income", () => {
    let s = { ...ch2(), cash: 0, debt: 50000_00 };
    s = advanceTurn(s, content()).state;
    expect(s.stats.interestPaid).toBeGreaterThan(0);
    expect(s.debt).toBe(0); // a year of salary clears it
  });
});

describe("cash at home", () => {
  it("is lost deterministically and never more than the configured share", () => {
    const s = { ...ch2(), cash: 100000_00 };
    let losses = 0;
    for (let t = 0; t < 2000; t++) {
      const lost = cashLossThisTurn(s, content(), createRng("x", "cash", t));
      expect(lost).toBeLessThanOrEqual(100000_00 * content().economy.cashLossMaxPct);
      expect(cashLossThisTurn(s, content(), createRng("x", "cash", t))).toBe(lost);
      if (lost > 0) losses++;
    }
    // ~2% a year.
    expect(losses / 2000).toBeGreaterThan(0.01);
    expect(losses / 2000).toBeLessThan(0.035);
  });
});
