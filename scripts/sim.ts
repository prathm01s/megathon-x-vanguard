// `pnpm sim -- --runs 1000 --chapter ch2-first-job`
// Runs many simulated playthroughs per bot strategy and prints outcome distributions,
// for balancing content numbers (§10). Owner: Samarth.
//
// Targets from §10:
//   balanced                 passes the chapter most of the time
//   all-cash                 usually fails the GROWTH component
//   all-equity-no-fund       sometimes fails after bad tosses
import { loadContent } from "@toss/content/load";
import { playChapter, SIM_STRATEGIES, startChapterFor } from "@toss/engine";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
}

const loaded = loadContent();
if (!loaded.ok) {
  console.error("content invalid — run pnpm content:validate");
  process.exit(1);
}
const content = loaded.bundle;
const runs = Number(arg("runs", "500"));
const personaId = arg("persona", "safe-keeper");
let chapterId = arg("chapter", startChapterFor(personaId, content));
if (chapterId === "ch2") chapterId = "ch2-first-job";

const pct = (x: number) => `${(x * 100).toFixed(0)}%`.padStart(6);
console.log(`Simulating ${runs} runs per strategy on ${chapterId} (persona ${personaId})\n`);
console.log("strategy              score   pass  growth<half  real growth  borrowed  scams fallen");
for (const strategy of SIM_STRATEGIES) {
  let score = 0;
  let passes = 0;
  let weakGrowth = 0;
  let growth = 0;
  let borrowed = 0;
  let scams = 0;
  for (let r = 0; r < runs; r++) {
    const { result } = playChapter(strategy, { content, personaId, seed: `sim-${r}`, chapterId });
    score += result.healthScore;
    if (result.passed) passes++;
    const g = result.breakdown.find((b) => b.componentId === "growth");
    if (g && g.fraction < 0.5) weakGrowth++;
    growth += Number(result.metrics.realValueGrowthPct);
    if (Number(result.metrics.loansTaken) > 0) borrowed++;
    scams += Number(result.metrics.scamsFallen);
  }
  console.log(
    `${strategy.padEnd(20)} ${(score / runs).toFixed(1).padStart(6)} ${pct(passes / runs)} ${pct(weakGrowth / runs).padStart(12)} ${((growth / runs) * 100).toFixed(1).padStart(11)}% ${pct(borrowed / runs).padStart(9)} ${(scams / runs).toFixed(2).padStart(13)}`,
  );
}
