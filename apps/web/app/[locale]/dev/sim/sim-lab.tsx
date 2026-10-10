"use client";

// In-browser balancing lab: the same bots and numbers as `pnpm sim`, plus a score histogram,
// a single-game inspector and per-turn timing (use DevTools CPU throttling 4–6× to read
// phone-like numbers). Dev-only, English-only.
import {
  advanceTurn,
  createPlaythrough,
  playChapter,
  SIM_STRATEGIES,
  startChapterFor,
  type ChapterResult,
  type GameState,
  type StrategyId,
} from "@toss/engine";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { content } from "@/lib/content";
import { formatPaise } from "@/lib/format";

interface StrategyStats {
  strategy: StrategyId;
  runs: number;
  avgScore: number;
  passRate: number;
  weakGrowthRate: number;
  avgRealGrowth: number;
  borrowedRate: number;
  scamsPerRun: number;
  histogram: number[]; // 10 buckets of 10 points
}

function summarise(strategy: StrategyId, results: ChapterResult[]): StrategyStats {
  const n = results.length || 1;
  const histogram = Array.from({ length: 10 }, () => 0);
  for (const r of results) histogram[Math.min(9, Math.floor(r.healthScore / 10))]! += 1;
  return {
    strategy,
    runs: results.length,
    avgScore: results.reduce((s, r) => s + r.healthScore, 0) / n,
    passRate: results.filter((r) => r.passed).length / n,
    weakGrowthRate:
      results.filter(
        (r) => (r.breakdown.find((b) => b.componentId === "growth")?.fraction ?? 0) < 0.5,
      ).length / n,
    avgRealGrowth: results.reduce((s, r) => s + Number(r.metrics.realValueGrowthPct), 0) / n,
    borrowedRate: results.filter((r) => Number(r.metrics.loansTaken) > 0).length / n,
    scamsPerRun: results.reduce((s, r) => s + Number(r.metrics.scamsFallen), 0) / n,
    histogram,
  };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const nextFrame = () => new Promise((r) => setTimeout(r, 0));

export function SimLab() {
  const personas = content.personas.personas.filter((p) => p.enabled);
  const chapters = content.chapters.filter((c) => c.enabled);
  const [personaId, setPersonaId] = useState(personas[0]?.id ?? "");
  const [chapterId, setChapterId] = useState(() => startChapterFor(personas[0]?.id ?? "", content));
  const [runs, setRuns] = useState(200);
  const [progress, setProgress] = useState<number | null>(null);
  const [stats, setStats] = useState<StrategyStats[]>([]);
  const [turnMs, setTurnMs] = useState<number | null>(null);
  const [inspect, setInspect] = useState<{ strategy: StrategyId; seed: string }>({
    strategy: "balanced",
    seed: "lab-1",
  });

  async function run() {
    setStats([]);
    const out: StrategyStats[] = [];
    const total = runs * SIM_STRATEGIES.length;
    let done = 0;
    for (const strategy of SIM_STRATEGIES) {
      const results: ChapterResult[] = [];
      for (let i = 0; i < runs; i++) {
        results.push(
          playChapter(strategy, { content, personaId, seed: `sim-${i}`, chapterId }).result,
        );
        if (++done % 25 === 0) {
          setProgress(done / total);
          await nextFrame(); // keep the page responsive
        }
      }
      out.push(summarise(strategy, results));
      setStats([...out]);
    }
    setProgress(null);
  }

  function measure() {
    // A first turn for 50 different lives (different events and scams), timed together.
    const starts: GameState[] = Array.from({ length: 50 }, (_, i) =>
      createPlaythrough({ content, personaId, seed: `t-${i}`, chapterId }),
    );
    for (const s of starts.slice(0, 5)) advanceTurn(s, content); // warm-up
    const t0 = performance.now();
    for (let k = 0; k < 10; k++) for (const s of starts) advanceTurn(s, content);
    setTurnMs((performance.now() - t0) / (starts.length * 10));
  }

  const game = useMemo(
    () => playChapter(inspect.strategy, { content, personaId, seed: inspect.seed, chapterId }),
    [inspect, personaId, chapterId],
  );

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col text-sm">
          Persona
          <select
            className="min-h-11 rounded-lg border-2 border-border bg-card px-2"
            value={personaId}
            onChange={(e) => setPersonaId(e.target.value)}
          >
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name.en}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Chapter
          <select
            className="min-h-11 rounded-lg border-2 border-border bg-card px-2"
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
          >
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title.en}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Runs per strategy
          <select
            className="min-h-11 rounded-lg border-2 border-border bg-card px-2"
            value={runs}
            onChange={(e) => setRuns(Number(e.target.value))}
          >
            {[50, 200, 500, 1000].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <Button onClick={run} disabled={progress !== null}>
          {progress === null ? "Run simulation" : `Running… ${pct(progress)}`}
        </Button>
        <Button variant="outline" onClick={measure}>
          Measure turn speed
        </Button>
        {turnMs !== null && (
          <span className="text-sm">
            {turnMs.toFixed(3)} ms per turn here · budget 50 ms on a mid-range phone{" "}
            {turnMs < 50 ? "✔" : "✖"}
          </span>
        )}
      </Card>

      {stats.length > 0 && (
        <Card className="overflow-x-auto">
          <h2 className="mb-2 font-bold">
            Results (§10 targets: balanced passes most of the time; all-cash usually fails growth;
            all-equity-no-fund sometimes fails)
          </h2>
          <table className="w-full text-sm tabular-nums">
            <thead className="text-start text-muted-foreground">
              <tr>
                <th className="py-1 text-start">Strategy</th>
                <th>Avg score</th>
                <th>Pass</th>
                <th>Growth &lt; half</th>
                <th>Real growth</th>
                <th>Borrowed</th>
                <th>Scams / run</th>
                <th className="text-start">Score distribution (0 → 100)</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.strategy} className="border-t border-border">
                  <td className="py-2 font-semibold">{s.strategy}</td>
                  <td className="text-center">{s.avgScore.toFixed(1)}</td>
                  <td className="text-center">{pct(s.passRate)}</td>
                  <td className="text-center">{pct(s.weakGrowthRate)}</td>
                  <td className="text-center">{(s.avgRealGrowth * 100).toFixed(1)}%</td>
                  <td className="text-center">{pct(s.borrowedRate)}</td>
                  <td className="text-center">{s.scamsPerRun.toFixed(2)}</td>
                  <td>
                    <div
                      className="flex h-8 items-end gap-0.5"
                      aria-label={`score histogram for ${s.strategy}`}
                    >
                      {s.histogram.map((count, i) => (
                        <div
                          key={i}
                          title={`${i * 10}–${i * 10 + 9}: ${count}`}
                          className={i >= 6 ? "w-3 bg-gain" : "w-3 bg-loss"}
                          style={{ height: `${(count / Math.max(1, ...s.histogram)) * 100}%` }}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card className="space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <h2 className="font-bold">Inspect one game</h2>
          <label className="flex flex-col text-sm">
            Strategy
            <select
              className="min-h-11 rounded-lg border-2 border-border bg-card px-2"
              value={inspect.strategy}
              onChange={(e) => setInspect({ ...inspect, strategy: e.target.value as StrategyId })}
            >
              {SIM_STRATEGIES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm">
            Seed
            <input
              className="min-h-11 rounded-lg border-2 border-border bg-card px-2"
              value={inspect.seed}
              onChange={(e) => setInspect({ ...inspect, seed: e.target.value })}
            />
          </label>
          <span className="text-sm">
            Health Score <strong>{game.result.healthScore}</strong> ·{" "}
            {game.result.passed ? "passed" : "failed"} · weakest: {game.result.weakestComponentId}
          </span>
        </div>
        <table className="w-full text-sm tabular-nums">
          <thead className="text-muted-foreground">
            <tr>
              <th className="text-start">Turn</th>
              <th className="text-start">Market</th>
              <th className="text-start">Life event</th>
              <th className="text-start">Scam</th>
              <th className="text-end">Net worth</th>
              <th className="text-end">Real Value</th>
            </tr>
          </thead>
          <tbody>
            {game.state.history.map((h, i) => {
              const toss = game.state.tosses[i - 1];
              return (
                <tr key={h.turn} className="border-t border-border">
                  <td>{h.turn}</td>
                  <td>{toss?.marketState ?? "—"}</td>
                  <td>
                    {toss?.lifeEventId ? `${toss.lifeEventId} (month ${toss.lifeEventMonth})` : "—"}
                  </td>
                  <td>{toss?.scamId ?? "—"}</td>
                  <td className="text-end">{formatPaise(h.amount)}</td>
                  <td className="text-end">{formatPaise(h.realValue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <h3 className="font-semibold">Score breakdown</h3>
            <ul>
              {game.result.breakdown
                .filter((b) => b.applicable)
                .map((b) => (
                  <li key={b.componentId}>
                    {b.componentId}: {b.points.toFixed(1)} / {b.weight.toFixed(1)}
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">Life Report</h3>
            <ul>
              {game.result.report.didWell.map((r) => (
                <li key={r.ruleId}>✔ {r.ruleId}</li>
              ))}
              {game.result.report.couldBeBetter.map((r) => (
                <li key={r.ruleId}>✖ {r.ruleId}</li>
              ))}
              {game.result.report.whatIf && (
                <li>
                  What if ({game.result.report.whatIf.candidateId}): +
                  {formatPaise(game.result.report.whatIf.difference)}
                </li>
              )}
              <li>Badges: {game.result.badgesEarned.join(", ") || "—"}</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
