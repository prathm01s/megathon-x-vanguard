// Bot strategies (§7.6, §15.5 item 11). Bots fill empty Friends' Room seats and drive
// `pnpm sim` balancing runs and the demo seed. Each bot only uses the public engine
// API (`getAvailableActions`-level decisions through `applyAction`), so bots can never
// do anything a player couldn't.
import type {
  Auction,
  BotStrategy,
  ContentBundle,
  MultiplayerConfig,
  ScamAction,
} from "@toss/content";
import { applyAction } from "./actions";
import { endChapter } from "./chapter";
import { monthlyExpensesFor } from "./economy";
import { EngineError } from "./errors";
import { getChapter, unlockedOptions } from "./helpers";
import { rupeesToPaise } from "./money";
import { createPlaythrough } from "./playthrough";
import { createRng, type Rng } from "./rng";
import { advanceTurn } from "./turn";
import type { Action, ChapterResult, GameState, Paise } from "./types";

/** Room bot strategies plus two extreme strategies used only for balancing (§10). */
export type StrategyId = BotStrategy | "all-cash" | "all-equity-no-fund";
export const SIM_STRATEGIES: StrategyId[] = [
  "cautious",
  "balanced",
  "impulsive",
  "all-cash",
  "all-equity-no-fund",
];

function botRng(state: GameState, strategy: StrategyId): Rng {
  return createRng(`${state.seed}:${strategy}`, "bots", state.turn);
}

/** Applies actions one by one, skipping any the engine rejects. */
function applyAll(state: GameState, actions: Action[], content: ContentBundle): GameState {
  let s = state;
  for (const a of actions) {
    try {
      s = applyAction(s, a, content);
    } catch (err) {
      if (!(err instanceof EngineError)) throw err;
    }
  }
  return s;
}

/**
 * Bots choose options by KIND, never by id (§8.1: no content ids in code), so they keep
 * working when content changes.
 */
type OptionKind = "growth" | "deposit" | "recurring" | "commodity" | "instant";
function optionOfKind(
  state: GameState,
  content: ContentBundle,
  kind: OptionKind,
): string | undefined {
  const opts = unlockedOptions(content, state.chapterId).filter((o) => o.category !== "cash");
  const match = opts.find((o) => {
    switch (kind) {
      case "growth":
        return o.category === "market" && o.riskLevel >= 4 && o.sipAllowed;
      case "deposit":
        return o.category === "deposit" && !o.monthlyDepositOnly;
      case "recurring":
        return o.monthlyDepositOnly;
      case "commodity":
        return o.category === "commodity";
      case "instant":
        return o.liquidity === "instant";
    }
  });
  return match?.id;
}

/** Pays tasks matching `pick` that are due by `horizon` turns from now. */
function payTasks(
  state: GameState,
  content: ContentBundle,
  pick: (kind: string, required: boolean) => boolean,
  horizon = 1,
): GameState {
  const chapter = getChapter(content, state.chapterId);
  let s = state;
  const order = { need: 0, safety: 1, goal: 2, want: 3 } as Record<string, number>;
  const due = s.tasks
    .map((t) => ({ t, def: chapter.tasks.find((d) => d.id === t.taskId)! }))
    .filter(({ t, def }) => def && (t.status === "open" || t.status === "late"))
    .filter(({ t, def }) => pick(def.kind, def.required) && t.dueTurn <= s.turn + horizon)
    .sort((a, b) => (order[a.def.kind] ?? 9) - (order[b.def.kind] ?? 9));
  for (const { t } of due) {
    const remaining = t.amount - t.paid;
    const amount = Math.min(remaining, s.cash);
    if (amount > 0) s = applyAll(s, [{ type: "pay_task", taskId: t.taskId, amount }], content);
  }
  return s;
}

/** Cash the bot keeps aside: one month of expenses plus tasks due in the next two turns. */
function buffer(state: GameState, content: ContentBundle): Paise {
  const chapter = getChapter(content, state.chapterId);
  const upcoming = state.tasks
    .filter((t) => (t.status === "open" || t.status === "late") && t.dueTurn <= state.turn + 2)
    .reduce((s, t) => s + t.amount - t.paid, 0);
  return monthlyExpensesFor(chapter, state.inflationIndex) + upcoming;
}

function splitInvest(
  state: GameState,
  content: ContentBundle,
  amount: Paise,
  weights: [OptionKind, number][],
): Action[] {
  const available = weights
    .map(([kind, w]) => [optionOfKind(state, content, kind), w] as const)
    .filter((x): x is readonly [string, number] => x[0] !== undefined);
  const total = available.reduce((s, [, w]) => s + w, 0);
  if (total <= 0 || amount <= 0) return [];
  return available.map(([optionId, w]) => ({
    type: "invest" as const,
    optionId,
    amount: Math.floor((amount * w) / total),
  }));
}

/** One decide phase for a strategy. Returns the new state. */
export function botTurn(strategy: StrategyId, state: GameState, content: ContentBundle): GameState {
  if (state.status !== "playing") return state;
  const rng = botRng(state, strategy);
  const firstTurn = state.turn === 0;
  const sip = (kind: OptionKind, rupees: number): Action[] => {
    const optionId = optionOfKind(state, content, kind);
    return firstTurn && optionId
      ? [{ type: "sip_start", optionId, amountPerMonth: rupeesToPaise(rupees) }]
      : [];
  };
  const growth = optionOfKind(state, content, "growth");
  let s = state;

  switch (strategy) {
    case "all-cash":
      return payTasks(s, content, (_kind, required) => required);

    case "all-equity-no-fund": {
      s = payTasks(s, content, (kind, required) => required && kind !== "safety");
      const spare = s.cash - monthlyExpensesFor(getChapter(content, s.chapterId), s.inflationIndex);
      return applyAll(
        s,
        spare > 0 && growth ? [{ type: "invest", optionId: growth, amount: spare }] : [],
        content,
      );
    }

    case "cautious": {
      s = payTasks(s, content, (kind) => kind === "safety", 5); // build the fund first
      s = payTasks(s, content, (kind) => kind !== "want");
      s = applyAll(s, sip("recurring", 2000), content);
      const spare = s.cash - buffer(s, content);
      return applyAll(
        s,
        spare > 10_000_00
          ? splitInvest(s, content, spare, [
              ["deposit", 7],
              ["instant", 3],
            ])
          : [],
        content,
      );
    }

    case "balanced": {
      s = payTasks(s, content, (kind) => kind === "safety", 5);
      s = payTasks(s, content, () => true);
      s = applyAll(s, sip("growth", 3000), content);
      const spare = s.cash - buffer(s, content);
      return applyAll(
        s,
        spare > 10_000_00
          ? splitInvest(s, content, Math.floor(spare * 0.8), [
              ["growth", 4],
              ["deposit", 3],
              ["commodity", 3],
            ])
          : [],
        content,
      );
    }

    case "impulsive":
    case "scammer-friend": {
      s = payTasks(s, content, (kind) => kind === "want" || kind === "goal");
      s = payTasks(s, content, (_kind, required) => required);
      const last = s.tosses.at(-1)?.marketState;
      if (!growth) return s;
      // Chases booms and panic-sells in storms.
      const held = s.holdings.find((h) => h.optionId === growth);
      if (last === "crash" && held && rng.chance(0.7)) {
        return applyAll(s, [{ type: "withdraw", optionId: growth, amount: held.value }], content);
      }
      const spare = s.cash - buffer(s, content);
      if ((last === "boom" || firstTurn) && spare > 5_000_00) {
        return applyAll(s, [{ type: "invest", optionId: growth, amount: spare }], content);
      }
      return s;
    }
  }
}

/** How a strategy answers a scam card. */
export function botScamResponse(
  strategy: StrategyId,
  scamId: string,
  content: ContentBundle,
  rng: Rng,
): ScamAction {
  const scam = content.scams.scams.find((s) => s.id === scamId);
  const safe = scam?.actions.find((a) => !a.falls)?.id ?? "ignore";
  const falls = scam?.actions.find((a) => a.falls)?.id;
  if ((strategy === "impulsive" || strategy === "scammer-friend") && falls && rng.chance(0.5)) {
    return falls;
  }
  if (strategy === "cautious" && scam?.actions.some((a) => a.id === "report")) return "report";
  return safe;
}

/** Plays a whole chapter with one strategy. Used by `pnpm sim`, tests and the demo seed. */
export function playChapter(
  strategy: StrategyId,
  args: { content: ContentBundle; personaId: string; seed: string; chapterId: string },
): { state: GameState; result: ChapterResult } {
  const { content } = args;
  let s = createPlaythrough(args);
  while (s.status !== "chapter_complete") {
    for (const p of s.pendingScams) {
      const response = botScamResponse(strategy, p.scamId, content, botRng(s, strategy));
      s = applyAction(s, { type: "scam_response", instanceId: p.instanceId, response }, content);
    }
    if (s.status !== "playing") continue;
    s = botTurn(strategy, s, content);
    s = advanceTurn(s, content).state;
  }
  return { state: s, result: endChapter(s, content) };
}

// ── Friends' Room behaviour ─────────────────────────────────────────────────
/** Interest a bot friend asks per turn when offering a loan, or null if it won't lend. */
export function botLoanOfferRate(
  strategy: BotStrategy,
  cfg: MultiplayerConfig["loans"],
  rng: Rng,
): number | null {
  switch (strategy) {
    case "cautious":
      return rng.chance(0.4) ? Math.min(0.02, cfg.maxRatePerTurn) : null;
    case "balanced":
      return Math.min(0.03, cfg.maxRatePerTurn);
    case "impulsive":
    case "scammer-friend":
      return cfg.maxRatePerTurn;
  }
}

/**
 * A bot's sealed bid. Bots don't know the true value: they bid relative to the minimum,
 * and impulsive bots overbid, so players can see that price and value differ.
 */
export function botAuctionBid(
  strategy: BotStrategy,
  def: Auction,
  cash: Paise,
  rng: Rng,
): Paise | null {
  const min = rupeesToPaise(def.minBid);
  const factor =
    strategy === "cautious"
      ? 1 + rng.next() * 0.2
      : strategy === "balanced"
        ? 1.2 + rng.next() * 0.4
        : 1.6 + rng.next() * 0.8;
  const bid = Math.round(min * factor);
  return bid <= cash ? bid : null;
}
