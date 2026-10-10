// Life events and scams (§7.7, §8.9).
import type { Chapter, ContentBundle, InvestmentOption, LifeEvent, Persona } from "@toss/content";
import { payOut } from "./cashflow";
import { EngineError } from "./errors";
import { rupeesToPaise } from "./money";
import type { Rng } from "./rng";
import type { GameEvent, GameState, Paise, PendingScam } from "./types";

// ── Life events ─────────────────────────────────────────────────────────────
/**
 * Draws at most one life event for the turn, honouring cooldowns, chapter weights and
 * persona multipliers by tag. Also picks the month (1..months) when it hits, so a
 * year-long turn doesn't let a full year of salary pile up before a bill arrives.
 */
export function drawLifeEvent(
  state: GameState,
  chapter: Chapter,
  content: ContentBundle,
  persona: Persona | undefined,
  months: number,
  rng: Rng,
): { event: LifeEvent; month: number } | null {
  for (const entry of chapter.lifeEventPool) {
    const ev = content.lifeEvents.events.find((e) => e.id === entry.eventId);
    if (!ev?.enabled) continue;
    const last = state.eventCooldowns[ev.id];
    if (last !== undefined && state.turn - last <= ev.cooldownTurns) continue;
    const multiplier = ev.tags.reduce((m, tag) => m * (persona?.eventMultipliers[tag] ?? 1), 1);
    if (!rng.chance(Math.min(1, ev.baseProbabilityPerTurn * entry.weight * multiplier))) continue;
    return { event: ev, month: rng.int(1, months) };
  }
  return null;
}

/** Money value of an event at today's prices / income. */
export function lifeEventAmount(ev: LifeEvent, state: GameState): Paise {
  switch (ev.effect.type) {
    case "fixed":
      return Math.round(rupeesToPaise(ev.effect.amount) * state.inflationIndex);
    case "monthsOfIncome":
      return Math.round(state.incomePerMonth * ev.effect.months);
    case "incomeChange":
      return 0;
  }
}

/** Applies a life event in the month it hits. Returns true for a bad event that cost money. */
export function applyLifeEvent(
  state: GameState,
  ev: LifeEvent,
  content: ContentBundle,
  options: Map<string, InvestmentOption>,
  events: GameEvent[],
): boolean {
  state.eventCooldowns[ev.id] = state.turn;
  const effect = ev.effect;

  if (effect.type === "incomeChange") {
    if (effect.durationMonths) {
      // Temporary: job break, slow season. Takes effect from next month.
      state.incomeModifiers.push({
        eventId: ev.id,
        rate: effect.rate,
        monthsLeft: effect.durationMonths,
      });
    } else {
      // Permanent: promotion.
      state.incomePerMonth = Math.round(state.incomePerMonth * (1 + effect.rate));
    }
    events.push({ type: "life_event", eventId: ev.id, amount: 0, coveredBy: "cash" });
    return ev.type === "bad";
  }

  const amount = lifeEventAmount(ev, state);
  if (ev.type === "good") {
    state.cash += amount;
    state.stats.windfallReceived += amount;
    state.stats.windfallUnallocated = (state.stats.windfallUnallocated ?? 0) + amount;
    events.push({ type: "life_event", eventId: ev.id, amount, coveredBy: "cash" });
    return false;
  }

  const paid = payOut(state, amount, content, options, events);
  const coveredBy = paid.borrowed > 0 ? "shortfall" : paid.fromSavings > 0 ? "savings" : "cash";
  if (coveredBy !== "shortfall") state.stats.badEventsCoveredByFund.push(ev.id);
  events.push({ type: "life_event", eventId: ev.id, amount, coveredBy });
  return true;
}

// ── Scams ───────────────────────────────────────────────────────────────────
/**
 * Draws at most one scam offer for the turn. `after_bad_toss` scams only appear right
 * after a bad life event; repeat variants only after the original was fallen for.
 */
export function drawScam(
  state: GameState,
  chapter: Chapter,
  content: ContentBundle,
  persona: Persona | undefined,
  hadBadEvent: boolean,
  rng: Rng,
): PendingScam | null {
  for (const scamId of chapter.scamPool) {
    const scam = content.scams.scams.find((s) => s.id === scamId);
    if (!scam?.enabled) continue;
    if (scam.repeatVariantOf && !state.scamsFallenIds.includes(scam.repeatVariantOf)) continue;
    let p = scam.probability * (persona?.scamMultiplier ?? 1);
    if (scam.trigger === "after_bad_toss")
      p = hadBadEvent ? p * content.scams.afterBadTossMultiplier : 0;
    if (!rng.chance(Math.min(p, 1))) continue;
    return { instanceId: `${scam.id}@${state.turn}`, scamId: scam.id, turn: state.turn };
  }
  return null;
}

/** Resolves the player's answer to a scam card. Mutates `state`. */
export function respondToScam(
  state: GameState,
  instanceId: string,
  response: string,
  content: ContentBundle,
): { fell: boolean; loss: Paise } {
  const pending = state.pendingScams.find((p) => p.instanceId === instanceId);
  const scam = pending && content.scams.scams.find((s) => s.id === pending.scamId);
  const choice = scam?.actions.find((a) => a.id === response);
  if (!pending || !scam || !choice) throw new EngineError("bad_scam", "unknown scam response");

  state.pendingScams = state.pendingScams.filter((p) => p !== pending);
  if (!choice.falls) {
    state.stats.scamsSpotted += 1;
    if (scam.repeatVariantOf && state.scamsFallenIds.includes(scam.repeatVariantOf)) {
      state.stats.repeatScamSpotted = true;
    }
    return { fell: false, loss: 0 };
  }
  const loss = Math.min(
    Math.max(state.cash, 0),
    scam.lossIfFallen.type === "fixed"
      ? rupeesToPaise(scam.lossIfFallen.amount)
      : Math.round(state.cash * scam.lossIfFallen.pct),
  );
  state.cash -= loss;
  state.scamsFallenIds.push(scam.id);
  if (scam.createsHighInterestDebt) state.stats.highInterestDebt = true;
  return { fell: true, loss };
}
