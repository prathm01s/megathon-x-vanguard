import type { LifeEvent } from "@toss/content";
import { describe, expect, it } from "vitest";
import { applyAction } from "../src/actions";
import { applyLifeEvent, drawScam, respondToScam } from "../src/events";
import { getChapter, optionMap } from "../src/helpers";
import { createRng } from "../src/rng";
import type { GameEvent } from "../src/types";
import { ch2, content } from "./helpers";

const event = (id: string) => content().lifeEvents.events.find((e) => e.id === id)! as LifeEvent;
const chapter = () => getChapter(content(), "ch2-first-job");
const persona = (id: string) => content().personas.personas.find((p) => p.id === id);

describe("life events", () => {
  it("a medical emergency is covered by the emergency fund when cash runs out", () => {
    let s = { ...ch2(), cash: 60000_00 };
    s = applyAction(
      s,
      { type: "pay_task", taskId: "ch2-emergency-fund", amount: 54000_00 },
      content(),
    );
    const events: GameEvent[] = [];
    applyLifeEvent(s, event("medical-emergency"), content(), optionMap(content()), events);
    expect(events.at(-1)).toMatchObject({ type: "life_event", coveredBy: "savings" });
    expect(s.debt).toBe(0);
    expect(s.stats.badEventsCoveredByFund).toEqual(["medical-emergency"]);
  });

  it("without a safety net the same emergency forces a loan", () => {
    const s = { ...ch2(), cash: 1000_00 };
    const events: GameEvent[] = [];
    applyLifeEvent(s, event("medical-emergency"), content(), optionMap(content()), events);
    expect(events.at(-1)).toMatchObject({ coveredBy: "shortfall" });
    expect(s.debt).toBe(29000_00);
    expect(s.stats.badEventsCoveredByFund).toEqual([]);
  });

  it("a job break cuts income for 3 months; a promotion raises it for good", () => {
    const s = ch2();
    applyLifeEvent(s, event("job-break"), content(), optionMap(content()), []);
    expect(s.incomeModifiers).toEqual([{ eventId: "job-break", rate: -1, monthsLeft: 3 }]);
    const before = s.incomePerMonth;
    applyLifeEvent(s, event("promotion"), content(), optionMap(content()), []);
    expect(s.incomePerMonth).toBe(Math.round(before * 1.1));
  });

  it("a bonus is a windfall of one month's salary", () => {
    const s = { ...ch2(), cash: 0 };
    applyLifeEvent(s, event("bonus"), content(), optionMap(content()), []);
    expect(s.cash).toBe(s.incomePerMonth);
    expect(s.stats.windfallReceived).toBe(s.incomePerMonth);
  });
});

describe("scams", () => {
  const offers = (personaId: string, badEvent: boolean, fallen: string[] = []) => {
    const counts: Record<string, number> = {};
    for (let t = 0; t < 3000; t++) {
      const s = { ...ch2(), turn: t, scamsFallenIds: fallen };
      const scam = drawScam(
        s,
        chapter(),
        content(),
        persona(personaId),
        badEvent,
        createRng("s", "scam", t),
      );
      if (scam) counts[scam.scamId] = (counts[scam.scamId] ?? 0) + 1;
    }
    return counts;
  };

  it("offers the loan app only right after a bad toss", () => {
    expect(offers("safe-keeper", false)["instant-loan-app"]).toBeUndefined();
    expect(offers("safe-keeper", true)["instant-loan-app"]).toBeGreaterThan(0);
  });

  it("shows a repeat variant only after the original was fallen for", () => {
    expect(offers("safe-keeper", false)["job-fee-offer-repeat"]).toBeUndefined();
    expect(offers("safe-keeper", false, ["job-fee-offer"])["job-fee-offer-repeat"]).toBeGreaterThan(
      0,
    );
  });

  it("targets Thrill Seekers more often (persona scam multiplier)", () => {
    const total = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0);
    expect(total(offers("thrill-seeker", false))).toBeGreaterThan(
      total(offers("safe-keeper", false)),
    );
  });

  it("falling costs money; spotting the repeat earns Scam Buster progress", () => {
    const s = { ...ch2(), cash: 10000_00 };
    s.pendingScams = [{ instanceId: "a", scamId: "job-fee-offer", turn: 1 }];
    expect(respondToScam(s, "a", "pay", content())).toEqual({ fell: true, loss: 2000_00 });
    expect(s.cash).toBe(8000_00);
    s.pendingScams = [{ instanceId: "b", scamId: "job-fee-offer-repeat", turn: 2 }];
    respondToScam(s, "b", "report", content());
    expect(s.stats.scamsSpotted).toBe(1);
    expect(s.stats.repeatScamSpotted).toBe(true);
  });

  it("the loan app counts as high-interest debt", () => {
    const s = { ...ch2(), cash: 10000_00 };
    s.pendingScams = [{ instanceId: "c", scamId: "instant-loan-app", turn: 1 }];
    respondToScam(s, "c", "install", content());
    expect(s.stats.highInterestDebt).toBe(true);
  });
});
