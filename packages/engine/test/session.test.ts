import { describe, expect, it } from "vitest";
import {
  advanceTurn,
  applyAction,
  branchAt,
  createPlaythrough,
  replaySession,
  whatIfWithout,
  type SessionLog,
  type SessionStep,
} from "../src/api";
import type { GameState } from "../src/types";
import { content } from "./helpers";

/** Plays ch2 with a few decisions, recording every step like the app's store does. */
function playRecorded(): { log: SessionLog; final: GameState } {
  const start = { personaId: "thrill-seeker", seed: "time-machine", chapterId: "ch2-first-job" };
  const c = content();
  let s = createPlaythrough({ content: c, ...start });
  const steps: SessionStep[] = [];
  const act = (action: Parameters<typeof applyAction>[1]) => {
    s = applyAction(s, action, c);
    steps.push({ kind: "act", action });
  };
  act({ type: "pay_task", taskId: "ch2-friend-wedding", amount: 5000_00 });
  act({ type: "invest", optionId: "savings", amount: 5000_00 });
  act({ type: "sip_start", optionId: "equity-fund", amountPerMonth: 3000_00 });
  while (s.status !== "chapter_complete") {
    if (s.status === "awaiting_scam_response") {
      act({ type: "scam_response", instanceId: s.pendingScams[0]!.instanceId, response: "ignore" });
      continue;
    }
    s = advanceTurn(s, c).state;
    steps.push({ kind: "advance" });
  }
  return { log: { start, steps }, final: s };
}

describe("session time machine", () => {
  it("replaying the log rebuilds the exact same game", () => {
    const { log, final } = playRecorded();
    const { state, points } = replaySession(log, content());
    expect(state).toEqual(final);
    expect(points).toHaveLength(log.steps.length);
    expect(points.every((p) => p.applied)).toBe(true);
  });

  it("can stop at any point (the start of a branch)", () => {
    const { log } = playRecorded();
    const firstAdvance = log.steps.findIndex((x) => x.kind === "advance");
    const { state } = replaySession(log, content(), { upTo: firstAdvance + 1 });
    expect(state.turn).toBe(1);
    expect(branchAt(log, 2).steps).toHaveLength(2);
  });

  it("answers 'what if I hadn't?' with the same luck and every other choice kept", () => {
    const { log } = playRecorded();
    const sip = log.steps.findIndex((x) => x.kind === "act" && x.action.type === "sip_start");
    expect(sip).toBeGreaterThanOrEqual(0);
    const r = whatIfWithout(log, sip, content());
    expect(r.alternate.realWealth).not.toBe(r.actual.realWealth);
    expect(r.realWealthDifference).toBe(r.alternate.realWealth - r.actual.realWealth);
    // deterministic
    expect(whatIfWithout(log, sip, content())).toEqual(r);
  });
});
