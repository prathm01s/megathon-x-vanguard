// `pnpm bench` — engine performance check (§15.5 item 18): a full ch2 turn must resolve in
// under 50 ms on a mid-range phone. Owner: Samarth.
//
// Measures on this machine and prints the per-operation cost next to the phone budget. As a
// rule of thumb a mid-range Android phone runs JS ~5× slower than a laptop, so the laptop
// target for a turn is ~10 ms. Run it in Chrome DevTools with 6× CPU throttling (via /dev/sim)
// for a direct phone-like reading.
import { loadContent } from "@toss/content/load";
import {
  advanceTurn,
  applyAction,
  botTurn,
  createPlaythrough,
  endChapter,
  playChapter,
  type GameState,
} from "@toss/engine";

const PHONE_SLOWDOWN = 5;
const BUDGET_MS = 50;

const loaded = loadContent();
if (!loaded.ok) {
  console.error("content invalid — run pnpm content:validate");
  process.exit(1);
}
const content = loaded.bundle;

function time(label: string, runs: number, fn: (i: number) => void): number {
  for (let i = 0; i < Math.min(20, runs); i++) fn(i); // warm-up
  const start = performance.now();
  for (let i = 0; i < runs; i++) fn(i);
  const ms = (performance.now() - start) / runs;
  const phone = ms * PHONE_SLOWDOWN;
  const flag = label.includes("turn") ? (phone < BUDGET_MS ? "✔" : "✖") : " ";
  console.log(
    `${flag} ${label.padEnd(38)} ${ms.toFixed(3).padStart(8)} ms   ≈ ${phone.toFixed(1).padStart(6)} ms on a phone`,
  );
  return ms;
}

// A realistic mid-chapter state: a balanced player at turn 2 with holdings and a SIP running.
const mid = (seed: string): GameState => {
  let s = createPlaythrough({
    content,
    personaId: "safe-keeper",
    seed,
    chapterId: "ch2-first-job",
  });
  for (let t = 0; t < 2; t++) {
    s = botTurn("balanced", s, content);
    s = advanceTurn(s, content).state;
    for (const p of s.pendingScams) {
      s = applyAction(
        s,
        { type: "scam_response", instanceId: p.instanceId, response: "ignore" },
        content,
      );
    }
  }
  return s;
};
const states = Array.from({ length: 50 }, (_, i) => mid(`bench-${i}`));
const atEnd = Array.from(
  { length: 20 },
  (_, i) =>
    playChapter("balanced", {
      content,
      personaId: "safe-keeper",
      seed: `bench-end-${i}`,
      chapterId: "ch2-first-job",
    }).state,
);

console.log(
  `Engine benchmark (Node ${process.version}; phone ≈ ${PHONE_SLOWDOWN}× slower; budget ${BUDGET_MS} ms per turn)\n`,
);
const turnMs = time("advanceTurn (ch2, year-long turn)", 500, (i) =>
  advanceTurn(states[i % states.length]!, content),
);
time("applyAction (invest)", 2000, (i) =>
  applyAction(
    states[i % states.length]!,
    { type: "invest", optionId: "fd", amount: 1000_00 },
    content,
  ),
);
time("botTurn (balanced decide phase)", 500, (i) =>
  botTurn("balanced", states[i % states.length]!, content),
);
time("endChapter (score + report + What if)", 40, (i) =>
  endChapter(atEnd[i % atEnd.length]!, content),
);
time("playChapter (whole ch2, bot)", 40, (i) =>
  playChapter("balanced", {
    content,
    personaId: "safe-keeper",
    seed: `bench-full-${i}`,
    chapterId: "ch2-first-job",
  }),
);

const ok = turnMs * PHONE_SLOWDOWN < BUDGET_MS;
console.log(
  `\n${ok ? "✔" : "✖"} a ch2 turn ≈ ${(turnMs * PHONE_SLOWDOWN).toFixed(1)} ms on a mid-range phone (budget ${BUDGET_MS} ms)`,
);
process.exit(ok ? 0 : 1);
