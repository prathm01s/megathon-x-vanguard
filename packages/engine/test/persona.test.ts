import { describe, expect, it } from "vitest";
import { assignPersona, scoreMindset } from "../src/persona";
import { content } from "./helpers";

describe("Money Mindset Check", () => {
  it("adds trait points from the chosen options", () => {
    const { scores } = scoreMindset(
      {
        "q-gift": "only-if-saved", // plan 2
        "q-prize-wait": "depends", // plan 1
        "q-coin-toss": "play-once", // risk 1
        "q-samosa": "prices-rise", // know 2
        "q-fd-belief": "safe-but-slow", // know 1
        "q-prize-message": "ignore-report", // know 2
      },
      content(),
    );
    expect(scores).toEqual({ plan: 3, risk: 1, know: 5 });
  });

  it("ignores unknown questions and options", () => {
    expect(scoreMindset({ nope: "x", "q-gift": "missing" }, content()).scores).toEqual({
      plan: 0,
      risk: 0,
      know: 0,
    });
  });

  // §8.3 default assignment rules, first match wins.
  it.each([
    [{ plan: 4, risk: 2, know: 6 }, "thrill-seeker"], // risk == 2 beats everything
    [{ plan: 1, risk: 1, know: 3 }, "thrill-seeker"], // risk 1, plan <= 1, know >= 3
    [{ plan: 1, risk: 1, know: 2 }, "moment-maker"],
    [{ plan: 3, risk: 0, know: 4 }, "smart-planner"],
    [{ plan: 3, risk: 1, know: 3 }, "safe-keeper"],
    [{ plan: 2, risk: 0, know: 0 }, "safe-keeper"],
    [{ plan: 0, risk: 0, know: 6 }, "moment-maker"],
  ])("assigns %o to %s", (scores, persona) => {
    expect(assignPersona(scores, content())).toBe(persona);
  });
});
