// ─────────────────────────────────────────────────────────────────────────────
// ENGINE CONTRACT (§15.4 A, C). Owned by Samarth.
// Pragya's UI, Prathmesh's persistence/stats and the room Edge Functions all
// code against these types. Changing them needs a `contract` PR (§15.1.3).
// ─────────────────────────────────────────────────────────────────────────────
import type { LocalizedString, MetricId, ScamAction } from "@toss/content";

/** Integer paise (₹1 = 100 paise). All engine money is integer paise; format only at the UI. */
export type Paise = number;

export type ChapterId = string;
export type OptionId = string;
export type TaskId = string;
export type PersonaId = string;

// ── Mindset ─────────────────────────────────────────────────────────────────
/** questionId → chosen optionId */
export type MindsetAnswers = Record<string, string>;
export interface MindsetScores {
  plan: number;
  risk: number;
  know: number;
}
export interface MindsetResult {
  scores: MindsetScores;
  personaId: PersonaId;
}

// ── Game state ──────────────────────────────────────────────────────────────
export interface Holding {
  optionId: OptionId;
  /** What the player put in, nominal (for "you gained / lost" displays). */
  invested: Paise;
  /** What the player put in, in chapter-start prices (each contribution ÷ the price index
   *  when it was made). Drives `realValueGrowthPct`. */
  investedReal: Paise;
  /** Current value = units × unit price (₹10 × the option's NAV index), rounded to paise. */
  value: Paise;
  /** Units owned. Every option is unit-priced so SIPs buy more units when prices are low. */
  units: number;
  /** Locked options: first turn at which it can be withdrawn without penalty. */
  maturesAtTurn?: number;
}

export interface Sip {
  optionId: OptionId;
  /** Monthly instalment. Also used for recurring deposits (`monthlyDepositOnly` options). */
  amountPerMonth: Paise;
  /** 1-based turn being played when the SIP started (`state.turn + 1`). */
  startedTurn: number;
  /** Set when stopped; SIPs are never deleted so metrics can read history. */
  stoppedTurn?: number;
}

export type TaskStatus = "open" | "done" | "late" | "missed" | "blocked";
export interface TaskState {
  taskId: TaskId;
  /** Amount due now (inflation-adjusted tasks grow each turn). */
  amount: Paise;
  /** Amount already paid towards the task. */
  paid: Paise;
  dueTurn: number;
  status: TaskStatus;
  completedTurn?: number;
}

/** A scam card waiting for the player's response. */
export interface PendingScam {
  instanceId: string;
  scamId: string;
  turn: number;
}

export interface WealthSnapshot {
  turn: number;
  /** Cash + all holdings, nominal. */
  amount: Paise;
  /** `amount` ÷ cumulative inflation index. */
  realValue: Paise;
  inflationIndex: number;
}

export interface ChapterStats {
  scamsSpotted: number;
  repeatScamSpotted: boolean;
  soldDuringCrash: boolean;
  fdBrokenEarly: boolean;
  /** Bad life events fully paid from cash/savings without borrowing. */
  badEventsCoveredByFund: string[];
  /** Total good-event money received and how much of it was still saved at turn end. */
  windfallReceived: Paise;
  windfallSaved: Paise;
  /** Cash lost at home (lost / stolen). */
  cashLost: Paise;
  /** SIP instalments skipped because there wasn't enough cash. */
  sipInstalmentsMissed: number;
  loansTaken: number;
  loansRepaidOnTime: number;
  loansDefaulted: number;
  /** Took a loan from the loan app (high interest). */
  highInterestDebt: boolean;
  interestPaid: Paise;
  auctionsWon: number;
  /** Winning bid ÷ true value − 1, averaged over wins. */
  overbidPct: number;
  poolBidsJoined: number;
}

/** Carried from one chapter to the next (set by `endChapter`, read by `createPlaythrough`). */
export interface CarryOver {
  /** A required task with `blockNextChapterGoal` was missed. */
  blockNextChapterGoal: boolean;
  /** Specific goal tasks blocked by a missed task's `blockGoal:<taskId>` consequence. */
  blockedTaskIds: string[];
  /** Salary bonus earned (e.g. the upskilling laptop). */
  salaryBonusRate: number;
  /** Consecutive chapters each persona shift rule has held (for `consecutiveChapters`). */
  shiftStreaks: Record<string, number>;
}

export const STATE_SCHEMA_VERSION = 2;

export interface GameState {
  /** Engine state schema version. Older saves are upgraded by `migrateState`. */
  schemaVersion: typeof STATE_SCHEMA_VERSION;
  contentVersion: string;
  seed: string;
  personaId: PersonaId;
  chapterId: ChapterId;
  /** 0 before the first toss; increments on each `advanceTurn`. */
  turn: number;
  totalTurns: number;
  turnUnit: "month" | "year";
  status: "playing" | "awaiting_scam_response" | "chapter_complete";
  /** Wallet / cash at home. Never negative: shortfalls become `debt`. */
  cash: Paise;
  /** Money owed to the bank after being forced to borrow (no emergency fund). Accrues interest. */
  debt: Paise;
  /** Base monthly income (after promotions and bonuses; temporary changes are in `incomeModifiers`). */
  incomePerMonth: Paise;
  /** Temporary income changes from events, e.g. a 3-month job break (rate −1). */
  incomeModifiers: { eventId: string; rate: number; monthsLeft: number }[];
  /** Cumulative price index since chapter start (1 = chapter-start prices). */
  inflationIndex: number;
  /** NAV index per option (starts at 1 = ₹10 a unit). Moves with each month's toss. */
  navs: Record<OptionId, number>;
  holdings: Holding[];
  sips: Sip[];
  tasks: TaskState[];
  pendingScams: PendingScam[];
  /** Turn each life event last fired (cooldowns). */
  eventCooldowns: Record<string, number>;
  /** Scam ids the player fell for (triggers repeat variants). */
  scamsFallenIds: string[];
  /** Consequences carried INTO this chapter from the previous one. */
  carriedIn: CarryOver;
  /** Consequences this chapter will carry to the next (filled during play and by endChapter). */
  carryOver: CarryOver;
  trustScore: number;
  /** Running counters for the metrics registry; updated as actions and events happen. */
  stats: ChapterStats;
  /** Per-turn history used by metrics, charts and the Life Report. */
  history: WealthSnapshot[];
  /** Every action applied, in order: the input for "What if" replays. */
  actionLog: { turn: number; action: Action }[];
  /** Every toss result so far (replays must reproduce these exactly). */
  tosses: TossResult[];
}

// ── Actions (§7.1 step 3) ───────────────────────────────────────────────────
export type Action =
  | { type: "pay_task"; taskId: TaskId; amount: Paise }
  | { type: "invest"; optionId: OptionId; amount: Paise }
  | { type: "withdraw"; optionId: OptionId; amount: Paise }
  | { type: "sip_start"; optionId: OptionId; amountPerMonth: Paise }
  | { type: "sip_stop"; optionId: OptionId }
  | { type: "scam_response"; instanceId: string; response: ScamAction };

export type ActionType = Action["type"];

/**
 * Warning / disabled codes. The engine never hardcodes user-facing text (§11):
 * the UI translates these via `apps/web/messages/<locale>.json` → `engine.warning.*` / `engine.disabled.*`.
 */
export type ActionWarning = "early_break_penalty" | "below_cost" | "selling_in_storm" | "high_risk";
export type ActionDisabledReason =
  | "insufficient_cash"
  | "already_running"
  | "nothing_to_withdraw"
  | "scam_pending"
  | "chapter_complete";

/** One entry in the decide panel. Drives Pragya's UI; `disabledReason` explains greyed-out choices. */
export interface ActionOption {
  type: ActionType;
  /** Target of the action (task, option or scam instance). */
  targetId: string;
  label: LocalizedString;
  /** Inclusive bounds for amount inputs, in paise. */
  minAmount?: Paise;
  maxAmount?: Paise;
  /** Penalty or loss that applies right now (e.g. breaking an FD early), in paise. */
  penalty?: Paise;
  warning?: ActionWarning;
  disabledReason?: ActionDisabledReason;
}

// ── Toss and events (§7.1 step 4) ───────────────────────────────────────────
export interface TossResult {
  turn: number;
  /** Shared market state id from `market.yaml` (e.g. `boom | normal | crash`). */
  marketState: string;
  /** Independent toss id → state id (e.g. `{ "gold-toss": "up" }`). */
  independent: Record<string, string>;
  /** Life event that fired this turn, if any, and the month (1–12 in year turns) it hit. */
  lifeEventId?: string;
  lifeEventMonth?: number;
  /** Scam offered this turn, if any. */
  scamId?: string;
  /** Inflation applied this turn (e.g. 0.06). */
  inflation: number;
}

export type GameEvent =
  | { type: "income"; amount: Paise }
  | { type: "fixed_expenses"; amount: Paise }
  | { type: "market_toss"; marketState: string; independent: Record<string, string> }
  | { type: "returns"; optionId: OptionId; rate: number; change: Paise }
  | { type: "sip_buy"; optionId: OptionId; amount: Paise; units: number }
  | { type: "sip_missed"; optionId: OptionId; amount: Paise }
  | {
      type: "life_event";
      eventId: string;
      amount: Paise;
      coveredBy: "cash" | "savings" | "shortfall";
    }
  | { type: "forced_borrowing"; amount: Paise; ratePerYear: number }
  | { type: "debt_interest"; amount: Paise }
  | { type: "debt_repaid"; amount: Paise }
  | { type: "scam_offer"; instanceId: string; scamId: string }
  | { type: "task_due"; taskId: TaskId }
  | { type: "task_missed"; taskId: TaskId; fine: Paise }
  | { type: "cash_lost"; amount: Paise }
  | { type: "inflation"; rate: number; inflationIndex: number }
  | { type: "chapter_complete" };

// ── Chapter end (§7.8, §7.9) ────────────────────────────────────────────────
export interface ScoreComponentResult {
  componentId: string;
  /** Effective weight after redistribution. */
  weight: number;
  /** 0–1 before weighting. */
  fraction: number;
  points: number;
  applicable: boolean;
}

export interface ReportItem {
  ruleId: string;
  text: LocalizedString;
  /** Values for `{placeholders}` in `text`, already in display units (rupees, %). */
  params: Record<string, string | number>;
  pillar: string;
  techniqueId?: string;
}

export interface WhatIfResult {
  candidateId: string;
  changeText: LocalizedString;
  /** Real Value at chapter end, in paise. */
  baselineRealValue: Paise;
  alternativeRealValue: Paise;
  difference: Paise;
  /** For the side-by-side chart. */
  series: { turn: number; baseline: Paise; alternative: Paise }[];
}

export interface LifeReport {
  didWell: ReportItem[];
  couldBeBetter: ReportItem[];
  whatIf: WhatIfResult | null;
  gyaanQuestionIds: string[];
}

export type MetricValues = Record<MetricId, number | boolean | string>;

export interface ChapterResult {
  chapterId: ChapterId;
  attempt: number;
  healthScore: number;
  breakdown: ScoreComponentResult[];
  passed: boolean;
  /** Tip on the weakest component, shown when the chapter must be replayed. */
  weakestComponentId: string;
  report: LifeReport;
  badgesEarned: string[];
  personaShift: { from: PersonaId; to: PersonaId; ruleId: string } | null;
  metrics: MetricValues;
  /** Pass to `createPlaythrough` for the next chapter. */
  carryOver: CarryOver;
  /** Next chapter id(s); several ids = career choice. */
  next: ChapterId[] | "end";
}

/** A single changed decision for a "What if" replay. */
export type DecisionChange =
  | { type: "candidate"; candidateId: string }
  | { type: "replace_action"; index: number; action: Action | null };

// ── Decision log (§15.4 C) — consumed by Prathmesh's SQL views ──────────────
export const DECISION_TYPES = [
  "invest",
  "withdraw",
  "sip_start",
  "sip_stop",
  "task_paid",
  "task_missed",
  "scam_fallen",
  "scam_spotted",
  "life_event",
  "market_toss",
  "loan_requested",
  "loan_offered",
  "loan_taken",
  "loan_repaid",
  "loan_late",
  "loan_defaulted",
  "auction_bid",
  "auction_won",
  "pool_joined",
  "persona_shift",
  "chapter_start",
  "chapter_end",
] as const;
export type DecisionType = (typeof DECISION_TYPES)[number];

/** Shape stored in the `decisions` table (`payload jsonb`). Append-only. */
export interface DecisionRecord {
  type: DecisionType;
  chapterId: ChapterId;
  turn: number;
  payload: Record<string, unknown>;
}

// ── Multiplayer (§7.6, §15.4 E) ─────────────────────────────────────────────
export type LoanStatus =
  "requested" | "offered" | "active" | "repaid" | "late" | "defaulted" | "declined";

export interface Loan {
  id: string;
  lenderMemberId: string | "bank" | "loan-app";
  borrowerMemberId: string;
  principal: Paise;
  ratePerTurn: number;
  interestType: "simple" | "compound";
  /** Turn the money was handed over (interest runs from here). */
  startTurn: number;
  dueTurn: number;
  status: LoanStatus;
  repaidAmount: Paise;
}

export interface RoomMember {
  id: string;
  /** `null` for bots. */
  userId: string | null;
  nickname: string;
  avatarId: string;
  isBot: boolean;
  botStrategy?: "cautious" | "balanced" | "impulsive" | "scammer-friend";
  seat: number;
  trustScore: number;
  ready: boolean;
  /** Each member plays their own life; the market toss is shared. */
  state: GameState;
}

export interface Bid {
  memberId?: string;
  poolId?: string;
  amount: Paise;
}

export interface BidPool {
  id: string;
  members: { memberId: string; contribution: Paise }[];
}

export interface AuctionState {
  auctionDefId: string;
  turn: number;
  status: "open" | "closed";
  bids: Bid[];
  pools: BidPool[];
  winner?: { memberId?: string; poolId?: string; amount: Paise };
  /** Revealed after close. */
  trueValue?: Paise;
}

export interface RoomState {
  code: string;
  hostMemberId: string;
  chapterId: ChapterId;
  status: "lobby" | "playing" | "finished";
  turn: number;
  seed: string;
  members: RoomMember[];
  loans: Loan[];
  auction: AuctionState | null;
  /** Shared market toss per turn. */
  tosses: TossResult[];
}
