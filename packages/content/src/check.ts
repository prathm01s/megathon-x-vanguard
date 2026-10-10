// Pure cross-file checks on a loaded bundle. Used by `content:validate` and tests.
import { evaluateCondition } from "./conditions";
import { placeholdersIn } from "./localize";
import {
  LOCALES,
  METRIC_IDS,
  type ContentBundle,
  type InvestmentOption,
  type Locale,
  type LocalizedString,
} from "./schemas";

export interface CheckReport {
  errors: string[];
  warnings: string[];
  expectedReturns: { optionId: string; expected: number; assumed: number; deltaPp: number }[];
  localeCoverage: Record<Locale, { translated: number; total: number }>;
}

/** Max gap between an option's computed expected return and its displayed assumption. */
export const EXPECTED_RETURN_TOLERANCE = 0.005;

/** Placeholders any text may use, in addition to every metric id. */
const KNOWN_PLACEHOLDERS = new Set<string>([
  "amount",
  "option",
  "years",
  "difference",
  "event",
  "change",
  "interestPaid",
  "name",
  ...METRIC_IDS,
]);

export function checkBundle(bundle: ContentBundle): CheckReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const ids = {
    chapters: new Set(bundle.chapters.map((c) => c.id)),
    options: new Set(bundle.options.options.map((o) => o.id)),
    techniques: new Set(bundle.techniques.techniques.map((t) => t.id)),
    events: new Set(bundle.lifeEvents.events.map((e) => e.id)),
    scams: new Set(bundle.scams.scams.map((s) => s.id)),
    auctions: new Set(bundle.auctions.auctions.map((a) => a.id)),
    prompts: new Set(bundle.discussionPrompts.prompts.map((p) => p.id)),
    personas: new Set(bundle.personas.personas.map((p) => p.id)),
    gyaan: new Set(bundle.gyaan.questions.map((q) => q.id)),
    marketStates: new Set(bundle.market.states.map((s) => s.id)),
    tasks: new Set(bundle.chapters.flatMap((c) => c.tasks.map((t) => t.id))),
  };

  // ── unique ids ────────────────────────────────────────────────────────────
  const uniqueGroups: [string, string[]][] = [
    ["chapters", bundle.chapters.map((c) => c.id)],
    ["options", bundle.options.options.map((o) => o.id)],
    ["techniques", bundle.techniques.techniques.map((t) => t.id)],
    ["life events", bundle.lifeEvents.events.map((e) => e.id)],
    ["scams", bundle.scams.scams.map((s) => s.id)],
    ["auctions", bundle.auctions.auctions.map((a) => a.id)],
    ["discussion prompts", bundle.discussionPrompts.prompts.map((p) => p.id)],
    ["personas", bundle.personas.personas.map((p) => p.id)],
    ["mindset questions", bundle.mindset.questions.map((q) => q.id)],
    ["gyaan questions", bundle.gyaan.questions.map((q) => q.id)],
    ["badges", bundle.badges.badges.map((b) => b.id)],
    ["report rules", bundle.lifeReport.rules.map((r) => r.id)],
    ["what-if candidates", bundle.lifeReport.whatIf.candidates.map((c) => c.id)],
    ["health components", bundle.healthScore.components.map((c) => c.id)],
    ["tasks", bundle.chapters.flatMap((c) => c.tasks.map((t) => t.id))],
  ];
  for (const [group, list] of uniqueGroups) {
    const seen = new Set<string>();
    for (const id of list) {
      if (seen.has(id)) errors.push(`duplicate id "${id}" in ${group}`);
      seen.add(id);
    }
  }

  const ref = (where: string, kind: keyof typeof ids, id: string) => {
    if (!ids[kind].has(id)) errors.push(`${where}: unknown ${kind} id "${id}"`);
  };

  // ── chapters ──────────────────────────────────────────────────────────────
  for (const ch of bundle.chapters) {
    const at = `chapters/${ch.id}`;
    ch.unlockOptions.forEach((id) => ref(at + " unlockOptions", "options", id));
    ch.lifeEventPool.forEach((e) => ref(at + " lifeEventPool", "events", e.eventId));
    ch.scamPool.forEach((id) => ref(at + " scamPool", "scams", id));
    ch.auctionIds.forEach((id) => ref(at + " auctionIds", "auctions", id));
    ch.discussionPromptIds.forEach((id) => ref(at + " discussionPromptIds", "prompts", id));
    if (typeof ch.next === "string" && ch.next !== "end") ref(at + " next", "chapters", ch.next);
    if (typeof ch.next === "object") ch.next.choice.forEach((id) => ref(at + " next", "chapters", id));
    for (const task of ch.tasks) {
      if (task.dueTurn > ch.turns) errors.push(`${at} task ${task.id}: dueTurn ${task.dueTurn} > turns ${ch.turns}`);
      for (const c of [task.consequence, task.onCompleteConsequence]) {
        if (c?.startsWith("blockGoal:")) ref(`${at} task ${task.id} consequence`, "tasks", c.slice(10));
      }
    }
    if (ch.enabled && ch.tasks.length === 0) errors.push(`${at}: enabled chapter has no tasks`);
  }

  // ── options and market ────────────────────────────────────────────────────
  const stateSum = bundle.market.states.reduce((s, x) => s + x.probability, 0);
  if (Math.abs(stateSum - 1) > 1e-9) errors.push(`market.states probabilities sum to ${stateSum}, not 1`);
  for (const toss of bundle.market.independentTosses) {
    const sum = toss.states.reduce((s, x) => s + x.probability, 0);
    if (Math.abs(sum - 1) > 1e-9) errors.push(`market toss ${toss.id} probabilities sum to ${sum}, not 1`);
  }

  const optionById = new Map(bundle.options.options.map((o) => [o.id, o]));
  for (const opt of bundle.options.options) {
    const at = `options/${opt.id}`;
    ref(at + " unlockChapter", "chapters", opt.unlockChapter);
    opt.techniqueIds.forEach((id) => ref(at + " techniqueIds", "techniques", id));
    const r = opt.returns;
    if (r.type === "market") {
      for (const s of ids.marketStates) if (!(s in r.byState)) errors.push(`${at}: no return for market state "${s}"`);
      for (const s of Object.keys(r.byState)) if (!ids.marketStates.has(s)) errors.push(`${at}: unknown market state "${s}"`);
    }
    if (r.type === "independent") {
      const toss = bundle.market.independentTosses.find((t) => t.id === r.toss);
      if (!toss) errors.push(`${at}: unknown independent toss "${r.toss}"`);
      else for (const s of toss.states) if (!(s.id in r.byState)) errors.push(`${at}: no return for ${r.toss} state "${s.id}"`);
    }
    if (r.type === "mix") {
      const w = r.components.reduce((s, c) => s + c.weight, 0);
      if (Math.abs(w - 1) > 1e-9) errors.push(`${at}: mix weights sum to ${w}, not 1`);
      for (const c of r.components) {
        if (!optionById.has(c.optionId)) errors.push(`${at}: unknown mix option "${c.optionId}"`);
        if (c.optionId === opt.id) errors.push(`${at}: mix cannot contain itself`);
      }
    }
    if (opt.liquidity === "locked_until_maturity" && opt.lockMonths === 0 && !opt.monthlyDepositOnly) {
      warnings.push(`${at}: locked option has lockMonths 0`);
    }
  }

  const expectedReturns = bundle.options.options.map((opt) => {
    const expected = expectedReturn(opt, bundle, optionById);
    const deltaPp = (expected - opt.assumedAverageReturn) * 100;
    if (Math.abs(expected - opt.assumedAverageReturn) > EXPECTED_RETURN_TOLERANCE) {
      warnings.push(
        `options/${opt.id}: expected return ${(expected * 100).toFixed(2)}% differs from displayed ` +
          `${(opt.assumedAverageReturn * 100).toFixed(2)}% by ${deltaPp.toFixed(2)} pp (> 0.5 pp)`,
      );
    }
    const marketLoss =
      opt.category === "market" &&
      (opt.returns.type === "market" || opt.returns.type === "independent") &&
      !Object.values(opt.returns.byState).some((v) => v < 0);
    if (marketLoss) warnings.push(`options/${opt.id}: market option can never lose money (§1 guardrail)`);
    return { optionId: opt.id, expected, assumed: opt.assumedAverageReturn, deltaPp };
  });

  ref("economy.emergencyFundOptionId", "options", bundle.economy.emergencyFundOptionId);

  // ── techniques, events, scams, auctions ───────────────────────────────────
  for (const t of bundle.techniques.techniques) {
    ref(`techniques/${t.id} unlockChapter`, "chapters", t.unlockChapter);
    t.gyaanQuestionIds.forEach((id) => ref(`techniques/${t.id} gyaanQuestionIds`, "gyaan", id));
  }
  for (const e of bundle.lifeEvents.events) e.chapters.forEach((id) => ref(`life-events/${e.id}`, "chapters", id));
  for (const s of bundle.scams.scams) {
    s.chapters.forEach((id) => id !== "room" && ref(`scams/${s.id}`, "chapters", id));
    if (s.repeatVariantOf) ref(`scams/${s.id} repeatVariantOf`, "scams", s.repeatVariantOf);
    if (!s.actions.some((a) => a.falls)) warnings.push(`scams/${s.id}: no action falls for the scam`);
    if (!s.actions.some((a) => !a.falls)) errors.push(`scams/${s.id}: no safe action`);
  }
  for (const a of bundle.auctions.auctions) ref(`auctions/${a.id} chapter`, "chapters", a.chapter);
  for (const p of bundle.discussionPrompts.prompts) ref(`discussion-prompts/${p.id}`, "chapters", p.chapterId);

  // ── personas ──────────────────────────────────────────────────────────────
  for (const p of bundle.personas.personas) {
    ref(`personas/${p.id} startChapter`, "chapters", p.startChapter);
    p.highlightTechniques.forEach((id) => ref(`personas/${p.id} highlightTechniques`, "techniques", id));
  }
  bundle.personas.assignmentRules.forEach((r, i) => ref(`personas.assignmentRules[${i}]`, "personas", r.personaId));
  for (const r of bundle.personas.shiftRules) {
    ref(`personas.shiftRules/${r.id} from`, "personas", r.from);
    ref(`personas.shiftRules/${r.id} to`, "personas", r.to);
  }

  // Every possible (plan, risk, know) combination must map to a persona.
  const max = bundle.mindset.traitMax;
  for (const trait of ["plan", "risk", "know"] as const) {
    const reachable = bundle.mindset.questions.reduce(
      (sum, q) => sum + Math.max(0, ...q.options.map((o) => o.points[trait] ?? 0)),
      0,
    );
    if (reachable !== max[trait]) {
      errors.push(`mindset.traitMax.${trait} is ${max[trait]} but questions allow up to ${reachable}`);
    }
  }
  for (let plan = 0; plan <= max.plan; plan++)
    for (let risk = 0; risk <= max.risk; risk++)
      for (let know = 0; know <= max.know; know++) {
        const scores = { plan, risk, know };
        const hit = bundle.personas.assignmentRules.some((r) => evaluateCondition(r.when, (m) => scores[m]));
        if (!hit) errors.push(`persona rules don't cover plan=${plan} risk=${risk} know=${know}`);
      }

  // ── health score ──────────────────────────────────────────────────────────
  const weightSum = bundle.healthScore.components.reduce((s, c) => s + c.weight, 0);
  if (weightSum !== 100) errors.push(`health-score weights sum to ${weightSum}, not 100`);

  // ── report, gyaan, badges ─────────────────────────────────────────────────
  for (const r of bundle.lifeReport.rules) if (r.techniqueId) ref(`life-report-rules/${r.id}`, "techniques", r.techniqueId);
  for (const c of bundle.lifeReport.whatIf.candidates) {
    const t = c.transform;
    if (t.type === "startSip" || t.type === "emergencyFundFirst") ref(`whatIf/${c.id}`, "options", t.optionId);
    if (t.type === "moveShare") {
      ref(`whatIf/${c.id}`, "options", t.fromOptionId);
      ref(`whatIf/${c.id}`, "options", t.toOptionId);
    }
  }
  for (const q of bundle.gyaan.questions) {
    ref(`gyaan/${q.id}`, "chapters", q.chapterId);
    if (!q.options.some((o) => o.id === q.correctOptionId)) errors.push(`gyaan/${q.id}: correctOptionId not among options`);
    if (q.techniqueId) ref(`gyaan/${q.id}`, "techniques", q.techniqueId);
  }
  for (const ch of bundle.chapters.filter((c) => c.enabled)) {
    const n = bundle.gyaan.questions.filter((q) => q.chapterId === ch.id).length;
    if (n < bundle.gyaan.questionsPerChapter) warnings.push(`gyaan: ${ch.id} has ${n} questions, expected ${bundle.gyaan.questionsPerChapter}`);
  }

  // ── placeholders and locale coverage ──────────────────────────────────────
  const localeCoverage = Object.fromEntries(LOCALES.map((l) => [l, { translated: 0, total: 0 }])) as CheckReport["localeCoverage"];
  walkLocalized(bundle, "", (path, text) => {
    const enTokens = placeholdersIn(text.en);
    for (const token of enTokens) {
      if (!KNOWN_PLACEHOLDERS.has(token)) warnings.push(`${path}: unknown placeholder {${token}}`);
    }
    for (const locale of LOCALES) {
      localeCoverage[locale].total++;
      const value = text[locale];
      if (!value) continue;
      localeCoverage[locale].translated++;
      const tokens = placeholdersIn(value);
      if (locale !== "en" && tokens.sort().join() !== [...enTokens].sort().join()) {
        errors.push(`${path}.${locale}: placeholders differ from English`);
      }
    }
  });

  return { errors, warnings, expectedReturns, localeCoverage };
}

/** Probability-weighted yearly return of an option under the market model. */
export function expectedReturn(
  opt: InvestmentOption,
  bundle: ContentBundle,
  optionById: Map<string, InvestmentOption> = new Map(bundle.options.options.map((o) => [o.id, o])),
  depth = 0,
): number {
  const r = opt.returns;
  switch (r.type) {
    case "fixed":
      return r.rate;
    case "market":
      return bundle.market.states.reduce((s, st) => s + st.probability * (r.byState[st.id] ?? 0), 0);
    case "independent": {
      const toss = bundle.market.independentTosses.find((t) => t.id === r.toss);
      return toss ? toss.states.reduce((s, st) => s + st.probability * (r.byState[st.id] ?? 0), 0) : 0;
    }
    case "mix":
      if (depth > 3) return 0;
      return r.components.reduce((s, c) => {
        const inner = optionById.get(c.optionId);
        return s + c.weight * (inner ? expectedReturn(inner, bundle, optionById, depth + 1) : 0);
      }, 0);
  }
}

function isLocalized(value: unknown): value is LocalizedString {
  return typeof value === "object" && value !== null && typeof (value as { en?: unknown }).en === "string";
}

function walkLocalized(value: unknown, path: string, visit: (path: string, text: LocalizedString) => void) {
  if (isLocalized(value)) return visit(path, value);
  if (Array.isArray(value)) value.forEach((v, i) => walkLocalized(v, `${path}[${i}]`, visit));
  else if (typeof value === "object" && value !== null) {
    for (const [k, v] of Object.entries(value)) {
      const id = (v as { id?: unknown } | null)?.id;
      walkLocalized(v, path ? `${path}.${typeof id === "string" ? id : k}` : k, visit);
    }
  }
}
