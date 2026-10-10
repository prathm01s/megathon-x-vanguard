// `pnpm sim -- --runs 1000 --chapter ch2-first-job`
// Runs many simulated playthroughs per bot strategy and prints outcome distributions,
// for balancing content numbers (§10). Owner: Samarth.
//
// Day-zero version: simple built-in strategies driven through the public engine API.
// TODO(samarth): replace with packages/engine/src/bots.ts strategies once they exist.
import type { ContentBundle } from "@toss/content";
import { loadContent } from "@toss/content/load";
import {
  advanceTurn,
  applyAction,
  createPlaythrough,
  endChapter,
  type GameState,
} from "@toss/engine";

type Strategy = (s: GameState, content: ContentBundle) => GameState;

function payDueTasks(s: GameState, content: ContentBundle, onlyRequired: boolean): GameState {
  const chapter = content.chapters.find((c) => c.id === s.chapterId)!;
  for (const t of s.tasks) {
    const def = chapter.tasks.find((d) => d.id === t.taskId);
    if (!def || (t.status !== "open" && t.status !== "late")) continue;
    if (onlyRequired && !def.required) continue;
    const amount = Math.min(t.amount - t.paid, s.cash);
    if (amount > 0) s = applyAction(s, { type: "pay_task", taskId: t.taskId, amount }, content);
  }
  return s;
}

const STRATEGIES: Record<string, Strategy> = {
  "all-cash": (s, c) => payDueTasks(s, c, true),
  balanced: (s, c) => {
    s = payDueTasks(s, c, false);
    if (s.turn === 0)
      s = applyAction(
        s,
        { type: "sip_start", optionId: "equity-fund", amountPerMonth: 3000_00 },
        c,
      );
    const spare = s.cash - 20000_00;
    if (spare > 5000_00 && s.turn % 2 === 0)
      s = applyAction(s, { type: "invest", optionId: "gold", amount: Math.floor(spare / 4) }, c);
    return s;
  },
  "all-equity": (s, c) => {
    s = payDueTasks(s, c, true);
    if (s.cash > 500_00)
      s = applyAction(s, { type: "invest", optionId: "equity-fund", amount: s.cash }, c);
    return s;
  },
};

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
}

const runs = Number(arg("runs", "500"));
let chapterId = arg("chapter", "ch2-first-job");
if (chapterId === "ch2") chapterId = "ch2-first-job";

const loaded = loadContent();
if (!loaded.ok) {
  console.error("content invalid — run pnpm content:validate");
  process.exit(1);
}
const content = loaded.bundle;

console.log(`Simulating ${runs} runs per strategy on ${chapterId}\n`);
console.log("strategy      avg score  pass rate  avg real-value growth");
for (const [name, strategy] of Object.entries(STRATEGIES)) {
  let scoreSum = 0;
  let passes = 0;
  let growthSum = 0;
  for (let r = 0; r < runs; r++) {
    let s = createPlaythrough({ content, personaId: "safe-keeper", seed: `sim-${r}`, chapterId });
    while (s.status !== "chapter_complete") {
      for (const p of s.pendingScams)
        s = applyAction(
          s,
          { type: "scam_response", instanceId: p.instanceId, response: "ignore" },
          content,
        );
      if (s.status === "chapter_complete") break;
      s = strategy(s, content);
      s = advanceTurn(s, content).state;
    }
    const result = endChapter(s, content);
    scoreSum += result.healthScore;
    if (result.passed) passes++;
    growthSum += Number(result.metrics.realValueGrowthPct);
  }
  console.log(
    `${name.padEnd(13)} ${(scoreSum / runs).toFixed(1).padStart(9)}  ${((passes / runs) * 100).toFixed(0).padStart(8)}%  ${((growthSum / runs) * 100).toFixed(1).padStart(20)}%`,
  );
}
