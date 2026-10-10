// Friends' Room rules (§7.6) as pure functions: (room, input, content) → new room.
// The in-memory mock room (apps/web/lib/room) uses these today; the server-authoritative
// room Edge Functions will call the same functions, so the rules live in one place.
//
// Lockstep turns: every human submits, then bots decide, the auction (if any) closes,
// every member's life advances one turn with the SAME market toss (shared `marketSeed`)
// but their own life events, then loans are settled.
import type { Auction, BotStrategy, ContentBundle } from "@toss/content";
import { applyAction } from "./actions";
import {
  closeAuction,
  joinPool as joinPoolFn,
  openAuction,
  overbidPct,
  placeBid as placeBidFn,
  poolCosts,
  poolTotal,
  returnStreamPayout,
} from "./auction";
import { botAuctionBid, botLoanOfferRate, botScamResponse, botTurn } from "./bots";
import { endChapter } from "./chapter";
import { EngineError } from "./errors";
import { clone, getChapter } from "./helpers";
import {
  bankRateFor,
  clampTrust,
  maxLoanFor,
  repayLoan as repayLoanFn,
  settleLoanForTurn,
  validateOfferRate,
} from "./loans";
import { ratePerTurn } from "./money";
import { createPlaythrough } from "./playthrough";
import { createRng } from "./rng";
import { advanceTurn } from "./turn";
import type { Action, ChapterResult, GameState, Loan, Paise, RoomMember, RoomState } from "./types";

export interface PlayerInfo {
  userId: string;
  nickname: string;
  avatarId: string;
  personaId: string;
}

const BANK = "bank";
const LOAN_APP = "loan-app";

function member(room: RoomState, memberId: string): RoomMember {
  const m = room.members.find((x) => x.id === memberId);
  if (!m) throw new EngineError("not_in_room", `no member ${memberId}`);
  return m;
}

function newMemberState(
  room: RoomState,
  memberId: string,
  personaId: string,
  content: ContentBundle,
): GameState {
  const state = createPlaythrough({
    content,
    personaId,
    seed: `${room.seed}:${memberId}`,
    chapterId: room.chapterId,
  });
  return { ...state, marketSeed: room.seed };
}

function setTrust(m: RoomMember, delta: number): void {
  m.trustScore = clampTrust(m.trustScore + delta);
  m.state.trustScore = m.trustScore;
}

function auctionDefFor(room: RoomState, content: ContentBundle, turn: number): Auction | undefined {
  const chapter = getChapter(content, room.chapterId);
  return content.auctions.auctions.find(
    (a) => a.enabled && chapter.auctionIds.includes(a.id) && a.turn === turn,
  );
}

/** An auction scheduled for turn N is open during the decide phase before toss N. */
function maybeOpenAuction(room: RoomState, content: ContentBundle): void {
  const def = auctionDefFor(room, content, room.turn + 1);
  if (def) room.auction = openAuction(def);
}

// ── Lobby ───────────────────────────────────────────────────────────────────
export function createRoomState(args: {
  code: string;
  seed: string;
  chapterId: string;
  host: PlayerInfo;
  content: ContentBundle;
}): RoomState {
  const room: RoomState = {
    code: args.code,
    hostMemberId: "m1",
    chapterId: args.chapterId,
    status: "lobby",
    turn: 0,
    seed: args.seed,
    members: [],
    loans: [],
    auction: null,
    tosses: [],
    reactions: [],
  };
  return joinRoom(room, args.host, args.content);
}

export function joinRoom(room: RoomState, player: PlayerInfo, content: ContentBundle): RoomState {
  if (room.status !== "lobby")
    throw new EngineError("room_started", "this room has already started");
  if (room.members.some((m) => m.userId === player.userId)) return room;
  if (room.members.length >= content.multiplayer.maxPlayers)
    throw new EngineError("room_full", "room is full");
  const next = clone(room);
  const id = `m${next.members.length + 1}`;
  next.members.push({
    id,
    userId: player.userId,
    nickname: player.nickname,
    avatarId: player.avatarId,
    isBot: false,
    seat: next.members.length + 1,
    trustScore: content.multiplayer.loans.trust.start,
    ready: false,
    state: newMemberState(next, id, player.personaId, content),
  });
  return next;
}

export function leaveRoom(room: RoomState, memberId: string): RoomState {
  if (room.status !== "lobby") throw new EngineError("room_started", "can't leave a running room");
  const next = clone(room);
  next.members = next.members.filter((m) => m.id !== memberId);
  return next;
}

/** Fills empty seats up to `minPlayers` with bots (weighted strategies from config). */
export function fillWithBots(room: RoomState, content: ContentBundle): RoomState {
  const next = clone(room);
  const cfg = content.multiplayer;
  const rng = createRng(room.seed, "bots", 0);
  const strategies = cfg.bots.strategies.filter(
    (s) => !s.chapters || s.chapters.includes(room.chapterId),
  );
  const personas = content.personas.personas.filter((p) => p.enabled);
  while (next.members.length < cfg.minPlayers) {
    const pick = rng.weighted(strategies, (s) => s.weight);
    if (!pick) break;
    const id = `m${next.members.length + 1}`;
    const sameName = next.members.filter((m) => m.botStrategy === pick.id).length;
    next.members.push({
      id,
      userId: null,
      nickname: pick.name.en + (sameName ? ` ${sameName + 1}` : ""),
      avatarId: `bot-${pick.id}`,
      isBot: true,
      botStrategy: pick.id,
      seat: next.members.length + 1,
      trustScore: cfg.loans.trust.start,
      ready: true,
      state: newMemberState(next, id, personas[next.members.length % personas.length]!.id, content),
    });
  }
  return next;
}

export function startRoom(room: RoomState, content: ContentBundle): RoomState {
  if (room.status !== "lobby") throw new EngineError("room_started", "room already started");
  const next = content.multiplayer.fillWithBots ? fillWithBots(room, content) : clone(room);
  if (next.members.length < 1) throw new EngineError("room_empty", "no players");
  next.status = "playing";
  maybeOpenAuction(next, content);
  return next;
}

export function react(
  room: RoomState,
  memberId: string,
  emoteId: string,
  content: ContentBundle,
): RoomState {
  member(room, memberId);
  if (!content.multiplayer.emotes.some((e) => e.id === emoteId)) {
    throw new EngineError("bad_emote", "unknown emote");
  }
  const next = clone(room);
  next.reactions = [...next.reactions, { memberId, emoteId, turn: room.turn }].slice(-50);
  return next;
}

// ── Each player's own decisions ─────────────────────────────────────────────
export function memberAction(
  room: RoomState,
  memberId: string,
  action: Action,
  content: ContentBundle,
): RoomState {
  if (room.status !== "playing") throw new EngineError("not_playing", "room is not playing");
  const next = clone(room);
  const m = member(next, memberId);
  m.state = applyAction(m.state, action, content);
  // Answering a scam card after the last toss can be what completes the chapter.
  finishIfDone(next);
  return next;
}

function finishIfDone(room: RoomState): void {
  if (room.members.every((m) => m.state.status === "chapter_complete")) room.status = "finished";
}

// ── Loans between friends ───────────────────────────────────────────────────
/** Next unused loan id. Monotonic: accepted requests are removed, so `length + 1` could repeat. */
function loanId(room: RoomState): string {
  const max = room.loans.reduce((m, l) => Math.max(m, Number(l.id.split("-")[1]) || 0), 0);
  return `loan-${max + 1}`;
}

/**
 * A player asks for money. The bank (rate by Trust Score) and the loan app offer
 * automatically; bot friends may offer too. Humans offer with `offerLoan`.
 */
export function requestLoan(
  room: RoomState,
  borrowerId: string,
  args: { amount: Paise; dueTurn: number },
  content: ContentBundle,
): RoomState {
  const cfg = content.multiplayer.loans;
  const next = clone(room);
  const borrower = member(next, borrowerId);
  if (args.amount <= 0 || args.amount > maxLoanFor(borrower.state.incomePerMonth, cfg)) {
    throw new EngineError("bad_amount", "loan amount is above the limit");
  }
  if (args.dueTurn <= next.turn || args.dueTurn > borrower.state.totalTurns) {
    throw new EngineError("bad_due_turn", "due turn must be later in this chapter");
  }
  const requestId = loanId(next);
  const base = {
    borrowerMemberId: borrowerId,
    principal: args.amount,
    interestType: cfg.defaultInterestType,
    startTurn: next.turn,
    dueTurn: args.dueTurn,
    repaidAmount: 0,
  } as const;
  next.loans.push({
    ...base,
    id: requestId,
    lenderMemberId: "",
    ratePerTurn: 0,
    status: "requested",
  });

  const offer = (lenderMemberId: string, ratePerTurnValue: number) =>
    next.loans.push({
      ...base,
      id: loanId(next),
      requestId,
      lenderMemberId,
      ratePerTurn: ratePerTurnValue,
      status: "offered",
    });
  const bankYearly = bankRateFor(borrower.trustScore, cfg);
  if (bankYearly !== null) offer(BANK, ratePerTurn(bankYearly, borrower.state.turnUnit));
  offer(LOAN_APP, cfg.loanAppRatePerTurn);
  for (const bot of next.members.filter((m) => m.isBot && m.id !== borrowerId)) {
    const rate = botLoanOfferRate(
      bot.botStrategy!,
      cfg,
      createRng(`${next.seed}:${bot.id}`, "bots", next.turn),
    );
    if (rate !== null && bot.state.cash >= args.amount) offer(bot.id, rate);
  }
  return next;
}

/** A friend offers to fund a request at their own rate (bounded by config). */
export function offerLoan(
  room: RoomState,
  lenderId: string,
  args: { requestId: string; ratePerTurn: number },
  content: ContentBundle,
): RoomState {
  const cfg = content.multiplayer.loans;
  validateOfferRate(args.ratePerTurn, cfg);
  const next = clone(room);
  const request = next.loans.find((l) => l.id === args.requestId && l.status === "requested");
  if (!request) throw new EngineError("bad_loan", "no open request");
  if (request.borrowerMemberId === lenderId)
    throw new EngineError("bad_loan", "can't lend to yourself");
  if (member(next, lenderId).state.cash < request.principal) {
    throw new EngineError("insufficient_cash", "not enough cash to lend");
  }
  next.loans = next.loans.filter(
    (l) => !(l.requestId === request.id && l.lenderMemberId === lenderId && l.status === "offered"),
  );
  next.loans.push({
    ...request,
    id: loanId(next),
    requestId: request.id,
    lenderMemberId: lenderId,
    ratePerTurn: args.ratePerTurn,
    status: "offered",
  });
  return next;
}

/** The borrower picks one offer: money moves, other offers are declined. */
export function acceptLoan(room: RoomState, borrowerId: string, offerId: string): RoomState {
  const next = clone(room);
  const offer = next.loans.find((l) => l.id === offerId && l.status === "offered");
  if (!offer || offer.borrowerMemberId !== borrowerId)
    throw new EngineError("bad_loan", "no such offer");
  const borrower = member(next, borrowerId);
  const lender = next.members.find((m) => m.id === offer.lenderMemberId);
  if (lender) {
    if (lender.state.cash < offer.principal)
      throw new EngineError("insufficient_cash", "lender can't pay now");
    lender.state.cash -= offer.principal;
  }
  borrower.state.cash += offer.principal;
  borrower.state.stats.loansTaken += 1;
  if (offer.lenderMemberId === LOAN_APP) borrower.state.stats.highInterestDebt = true;

  offer.status = "active";
  offer.startTurn = next.turn;
  for (const l of next.loans) {
    if (l.requestId === offer.requestId && l.id !== offer.id && l.status === "offered")
      l.status = "declined";
  }
  next.loans = next.loans.filter((l) => l.id !== offer.requestId);
  return next;
}

export function repayRoomLoan(
  room: RoomState,
  borrowerId: string,
  args: { loanId: string; amount: Paise },
  content: ContentBundle,
): RoomState {
  const next = clone(room);
  const loan = next.loans.find((l) => l.id === args.loanId);
  if (!loan || loan.borrowerMemberId !== borrowerId)
    throw new EngineError("bad_loan", "no such loan");
  const borrower = member(next, borrowerId);
  const amount = Math.min(args.amount, borrower.state.cash);
  if (amount <= 0) throw new EngineError("insufficient_cash", "not enough cash");
  const update = repayLoanFn(loan, amount, next.turn, content.multiplayer.loans);
  const paid = update.loan.repaidAmount - loan.repaidAmount;
  borrower.state.cash -= paid;
  // Whatever is paid beyond the principal is interest.
  const interestBefore = Math.max(0, loan.repaidAmount - loan.principal);
  borrower.state.stats.interestPaid +=
    Math.max(0, update.loan.repaidAmount - loan.principal) - interestBefore;
  const lender = next.members.find((m) => m.id === loan.lenderMemberId);
  if (lender) lender.state.cash += paid;
  if (update.trustDelta > 0) borrower.state.stats.loansRepaidOnTime += 1;
  setTrust(borrower, update.trustDelta);
  Object.assign(loan, update.loan);
  return next;
}

// ── Opportunity Auction ─────────────────────────────────────────────────────
function currentAuctionDef(room: RoomState, content: ContentBundle): Auction {
  const def =
    room.auction && content.auctions.auctions.find((a) => a.id === room.auction!.auctionDefId);
  if (!def || room.auction?.status !== "open")
    throw new EngineError("no_auction", "no open auction");
  return def;
}

export function placeRoomBid(
  room: RoomState,
  memberId: string,
  amount: Paise,
  content: ContentBundle,
): RoomState {
  const def = currentAuctionDef(room, content);
  const next = clone(room);
  if (member(next, memberId).state.cash < amount)
    throw new EngineError("insufficient_cash", "not enough cash");
  next.auction = placeBidFn(next.auction!, def, { memberId, amount });
  return next;
}

/** Joins (or creates) a pool with a contribution; the pool bids its total. */
export function joinRoomPool(
  room: RoomState,
  memberId: string,
  args: { poolId: string; contribution: Paise },
  content: ContentBundle,
): RoomState {
  const def = currentAuctionDef(room, content);
  if (!def.allowPoolBid) throw new EngineError("no_pool", "pool bids not allowed");
  const next = clone(room);
  if (member(next, memberId).state.cash < args.contribution) {
    throw new EngineError("insufficient_cash", "not enough cash");
  }
  next.auction = joinPoolFn(next.auction!, args.poolId, memberId, args.contribution);
  const pool = next.auction.pools.find((p) => p.id === args.poolId)!;
  next.auction = placeBidFn(next.auction, def, { poolId: pool.id, amount: poolTotal(pool) });
  return next;
}

function settleAuction(room: RoomState, content: ContentBundle): void {
  if (room.auction?.status !== "open") return;
  const def = currentAuctionDef(room, content);
  room.auction = closeAuction(room.auction, def);
  const w = room.auction.winner;
  if (!w) return;
  room.auction.payoutTurnsLeft = def.returnStream?.turns ?? 0;
  const over = overbidPct(w.amount, room.auction.trueValue ?? 0);
  const credit = (m: RoomMember) => {
    m.state.stats.auctionsWon += 1;
    m.state.stats.overbidPct = over;
  };
  if (w.memberId) {
    const m = member(room, w.memberId);
    m.state.cash -= Math.min(w.amount, m.state.cash);
    credit(m);
    return;
  }
  const pool = room.auction.pools.find((p) => p.id === w.poolId)!;
  for (const { memberId, amount } of poolCosts(pool, w.amount)) {
    const m = member(room, memberId);
    m.state.cash -= Math.min(amount, m.state.cash);
    m.state.stats.poolBidsJoined += 1;
    credit(m);
  }
}

function payAuctionReturns(room: RoomState, content: ContentBundle): void {
  const a = room.auction;
  if (!a || a.status !== "closed" || !a.payoutTurnsLeft) return;
  const def = content.auctions.auctions.find((d) => d.id === a.auctionDefId);
  if (!def) return;
  for (const { memberId, amount } of returnStreamPayout(def, a)) {
    member(room, memberId).state.cash += amount;
  }
  a.payoutTurnsLeft -= 1;
}

// ── Turns ───────────────────────────────────────────────────────────────────
/** A human is done deciding. When every human is, the turn resolves. */
export function submitTurn(room: RoomState, memberId: string, content: ContentBundle): RoomState {
  if (room.status !== "playing") throw new EngineError("not_playing", "room is not playing");
  const m = member(room, memberId);
  if (m.state.status === "awaiting_scam_response") {
    throw new EngineError("scam_pending", "answer the message first");
  }
  const next = clone(room);
  member(next, memberId).ready = true;
  const waiting = next.members.some((x) => !x.isBot && !x.ready && x.state.status === "playing");
  return waiting ? next : resolveTurn(next, content);
}

function botDecides(room: RoomState, bot: RoomMember, content: ContentBundle): void {
  const strategy = bot.botStrategy as BotStrategy;
  const rng = createRng(`${room.seed}:${bot.id}`, "bots", room.turn);
  for (const p of [...bot.state.pendingScams]) {
    const response = botScamResponse(strategy, p.scamId, content, rng);
    bot.state = applyAction(
      bot.state,
      { type: "scam_response", instanceId: p.instanceId, response },
      content,
    );
  }
  bot.state = botTurn(strategy, bot.state, content);
  if (room.auction?.status === "open") {
    const def = currentAuctionDef(room, content);
    const bid = botAuctionBid(strategy, def, bot.state.cash, rng);
    if (bid !== null)
      room.auction = placeBidFn(room.auction, def, { memberId: bot.id, amount: bid });
  }
}

/** Resolves the turn for everyone (also called by the server when the turn timer runs out). */
export function resolveTurn(room: RoomState, content: ContentBundle): RoomState {
  const next = clone(room);
  const cfg = content.multiplayer.loans;
  for (const bot of next.members.filter((m) => m.isBot)) botDecides(next, bot, content);
  settleAuction(next, content);

  for (const m of next.members) {
    if (m.state.status !== "playing") continue; // finished, or a human who didn't answer a scam
    const { state, tossResult } = advanceTurn(m.state, content);
    m.state = state;
    if (!next.tosses.some((t) => t.turn === tossResult.turn)) {
      next.tosses.push({
        turn: tossResult.turn,
        marketState: tossResult.marketState,
        independent: tossResult.independent,
        inflation: tossResult.inflation,
      });
    }
    if (m.isBot) {
      const rng = createRng(`${next.seed}:${m.id}`, "bots", next.turn + 1);
      for (const p of [...m.state.pendingScams]) {
        const response = botScamResponse(m.botStrategy!, p.scamId, content, rng);
        m.state = applyAction(
          m.state,
          { type: "scam_response", instanceId: p.instanceId, response },
          content,
        );
      }
    }
  }
  next.turn += 1;
  payAuctionReturns(next, content);

  for (const loan of next.loans) {
    if (loan.status !== "active" && loan.status !== "late") continue;
    const update = settleLoanForTurn(loan, next.turn, cfg);
    if (update.loan.status === loan.status) continue;
    const borrower = member(next, loan.borrowerMemberId);
    borrower.state.cash -= Math.min(update.fine, borrower.state.cash);
    setTrust(borrower, update.trustDelta);
    if (update.loan.status === "defaulted") borrower.state.stats.loansDefaulted += 1;
    Object.assign(loan, update.loan);
  }

  for (const m of next.members) m.ready = m.isBot;
  finishIfDone(next);
  // A closed auction stays visible (it may still be paying out) until the next one is due.
  if (next.status === "playing" && next.auction?.status !== "open") maybeOpenAuction(next, content);
  return next;
}

/** Every member's Life Report, with the multiplayer Trust component counted. */
export function endRoomChapter(
  room: RoomState,
  content: ContentBundle,
): Record<string, ChapterResult> {
  return Object.fromEntries(
    room.members.map((m) => [m.id, endChapter(m.state, content, { multiplayer: true })]),
  );
}

/** Loans where this member owes money (for the UI's repay list). */
export function loansOwedBy(room: RoomState, memberId: string): Loan[] {
  return room.loans.filter(
    (l) => l.borrowerMemberId === memberId && (l.status === "active" || l.status === "late"),
  );
}
