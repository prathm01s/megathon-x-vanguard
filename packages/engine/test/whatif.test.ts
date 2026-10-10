import { describe, expect, it } from "vitest";
import { applyAction } from "../src/actions";
import { playChapter } from "../src/bots";
import { endChapter } from "../src/chapter";
import { computeMetrics } from "../src/metrics";
import { advanceTurn } from "../src/turn";
import { chooseWhatIf, replayWithChange, transformTimeline } from "../src/whatif";
import type { GameState } from "../src/types";
import { ch2, content, seedWithMarket } from "./helpers";

/** Plays ch2 to the end, answering every scam with `scamResponse`, doing nothing else. */
function idlePlayer(seed: string, scamResponse = "ignore"): GameState {
  let s = ch2(seed);
  while (s.status !== "chapter_complete") {
    for (const p of s.pendingScams) {
      const scam = content().scams.scams.find((x) => x.id === p.scamId)!;
      const response = scamResponse === "fall" ? scam.actions.find((a) => a.falls)!.id : "ignore";
      s = applyAction(s, { type: "scam_response", instanceId: p.instanceId, response }, content());
    }
    if (s.status === "playing") s = advanceTurn(s, content()).state;
  }
  return s;
}

describe("What-if transforms", () => {
  it("ignoreScams: a player who fell for scams would have more money", () => {
    for (let i = 0; i < 40; i++) {
      const s = idlePlayer(`scam-${i}`, "fall");
      if (s.scamsFallenIds.length === 0) continue;
      const r = replayWithChange(s, { type: "candidate", candidateId: "fell-for-scam" }, content());
      expect(r.difference).toBeGreaterThan(0);
      return;
    }
    throw new Error("no seed produced a scam");
  });

  it("startSip: an idle-cash player compares against a SIP from year 1", () => {
    const s = idlePlayer("idle");
    const r = replayWithChange(s, { type: "candidate", candidateId: "idle-cash" }, content());
    expect(r.series).toHaveLength(s.history.length);
    expect(r.baselineRealValue).toBe(s.history.at(-1)!.realValue);
  });

  it("emergencyFundFirst: builds a fund in savings during the replay", () => {
    const s = idlePlayer("fund");
    const { policy } = transformTimeline(
      s,
      { type: "emergencyFundFirst", optionId: "savings", months: 3 },
      content(),
    );
    const afterYear1 = advanceTurn(ch2("fund"), content()).state;
    const actions = policy!(afterYear1, content());
    expect(actions[0]).toMatchObject({ type: "invest", optionId: "savings" });
  });

  it("moveShare: moves half of each FD deposit into a SIP", () => {
    let s = ch2("move");
    s = applyAction(s, { type: "invest", optionId: "fd", amount: 10000_00 }, content());
    const { log } = transformTimeline(
      s,
      { type: "moveShare", fromOptionId: "fd", toOptionId: "equity-fund", share: 0.5, asSip: true },
      content(),
    );
    expect(log.map((e) => e.action.type)).toEqual(["invest", "sip_start"]);
    expect(log[0]!.action).toMatchObject({ amount: 5000_00 });
  });

  it("holdThroughCrash: drops the panic sale that followed a storm", () => {
    let s = ch2(seedWithMarket("crash"));
    s = applyAction(s, { type: "invest", optionId: "equity-fund", amount: 10000_00 }, content());
    s = advanceTurn(s, content()).state;
    if (s.status === "awaiting_scam_response") {
      for (const p of s.pendingScams) {
        s = applyAction(
          s,
          { type: "scam_response", instanceId: p.instanceId, response: "ignore" },
          content(),
        );
      }
    }
    const holding = s.holdings.find((h) => h.optionId === "equity-fund")!;
    s = applyAction(
      s,
      { type: "withdraw", optionId: "equity-fund", amount: holding.value },
      content(),
    );
    expect(s.stats.soldDuringCrash).toBe(true);
    const { log } = transformTimeline(s, { type: "holdThroughCrash" }, content());
    expect(log.some((e) => e.action.type === "withdraw")).toBe(false);
  });
});

describe("choosing the Life Report's What if", () => {
  it("never shows a change that leaves the player worse off or equal", () => {
    for (let i = 0; i < 15; i++) {
      const { state } = playChapter("balanced", {
        content: content(),
        personaId: "safe-keeper",
        seed: `w-${i}`,
        chapterId: "ch2-first-job",
      });
      const result = chooseWhatIf(state, computeMetrics(state, content()), content());
      if (result) expect(result.difference).toBeGreaterThan(0);
    }
  });

  it("endChapter uses the chooser", () => {
    const s = idlePlayer("report");
    const r = endChapter(s, content());
    if (r.report.whatIf) expect(r.report.whatIf.difference).toBeGreaterThan(0);
  });
});
