// Opportunity Auctions and Pool Bids (§7.6, §8.14). Pure functions; the room server
// (Edge Functions) and the mock room call these.
import type { Auction } from "@toss/content";
import { EngineError } from "./errors";
import { rupeesToPaise } from "./money";
import type { AuctionState, BidPool, Paise } from "./types";

export function openAuction(def: Auction): AuctionState {
  return { auctionDefId: def.id, turn: def.turn, status: "open", bids: [], pools: [] };
}

/** Total a pool can bid: everyone's contributions. */
export function poolTotal(pool: BidPool): Paise {
  return pool.members.reduce((s, m) => s + m.contribution, 0);
}

/** Adds or replaces a member's sealed bid. One bid per member / pool. */
export function placeBid(
  auction: AuctionState,
  def: Auction,
  bid: { memberId?: string; poolId?: string; amount: Paise },
): AuctionState {
  if (auction.status !== "open") throw new EngineError("auction_closed", "auction is closed");
  if (bid.amount < rupeesToPaise(def.minBid))
    throw new EngineError("below_min", "bid below minimum");
  if (bid.poolId) {
    if (!def.allowPoolBid) throw new EngineError("no_pool", "pool bids not allowed");
    const pool = auction.pools.find((p) => p.id === bid.poolId);
    if (!pool) throw new EngineError("bad_pool", "unknown pool");
    if (bid.amount > poolTotal(pool))
      throw new EngineError("pool_short", "pool has less money than the bid");
  }
  const sameBidder = (b: { memberId?: string; poolId?: string }) =>
    bid.poolId ? b.poolId === bid.poolId : b.memberId === bid.memberId;
  return { ...auction, bids: [...auction.bids.filter((b) => !sameBidder(b)), bid] };
}

/** Creates a pool or adds/updates a member's contribution. A member can be in one pool. */
export function joinPool(
  auction: AuctionState,
  poolId: string,
  memberId: string,
  contribution: Paise,
): AuctionState {
  if (auction.status !== "open") throw new EngineError("auction_closed", "auction is closed");
  if (contribution <= 0) throw new EngineError("bad_amount", "contribution must be positive");
  const pools = auction.pools
    .map((p) => ({ ...p, members: p.members.filter((m) => m.memberId !== memberId) }))
    .filter((p) => p.members.length > 0 || p.id === poolId);
  let pool = pools.find((p) => p.id === poolId);
  if (!pool) pools.push((pool = { id: poolId, members: [] }));
  pool.members.push({ memberId, contribution });
  return { ...auction, pools };
}

/**
 * Closes a sealed-bid auction: the highest valid bid wins (ties go to the earlier bid);
 * the true value is revealed. Overbidding is allowed — that's the lesson.
 */
export function closeAuction(auction: AuctionState, def: Auction): AuctionState {
  const min = rupeesToPaise(def.minBid);
  let winner: AuctionState["winner"];
  for (const b of auction.bids) {
    if (b.amount < min) continue;
    if (b.poolId && !def.allowPoolBid) continue;
    if (!winner || b.amount > winner.amount) {
      winner = {
        amount: b.amount,
        ...(b.memberId ? { memberId: b.memberId } : {}),
        ...(b.poolId ? { poolId: b.poolId } : {}),
      };
    }
  }
  return {
    ...auction,
    status: "closed",
    trueValue: rupeesToPaise(def.trueValue),
    ...(winner ? { winner } : {}),
  };
}

/** How much the winner overpaid vs. the true value (0.2 = 20% over; negative = a bargain). */
export function overbidPct(winningBid: Paise, trueValue: Paise): number {
  return trueValue > 0 ? winningBid / trueValue - 1 : 0;
}

/**
 * Splits `total` between contributors in proportion to what they put in. Uses the
 * largest-remainder method so the shares are whole paise and add up EXACTLY to `total`.
 * This is the "mutual fund reveal" maths (§7.6).
 */
export function splitProRata(
  total: Paise,
  shares: { memberId: string; contribution: Paise }[],
): { memberId: string; amount: Paise }[] {
  const sum = shares.reduce((s, x) => s + x.contribution, 0);
  if (sum <= 0) return shares.map((x) => ({ memberId: x.memberId, amount: 0 }));
  const raw = shares.map((x) => (total * x.contribution) / sum);
  const out = raw.map((r, i) => ({
    memberId: shares[i]!.memberId,
    amount: Math.floor(r),
    rem: r - Math.floor(r),
    i,
  }));
  let left = total - out.reduce((s, x) => s + x.amount, 0);
  for (const x of [...out].sort((a, b) => b.rem - a.rem || a.i - b.i)) {
    if (left <= 0) break;
    x.amount += 1;
    left -= 1;
  }
  return out.map(({ memberId, amount }) => ({ memberId, amount }));
}

/** What each pool member pays for a winning pool bid (pro-rata to their contribution). */
export function poolCosts(pool: BidPool, winningBid: Paise) {
  return splitProRata(winningBid, pool.members);
}

/** Per-turn income from a won item, shared by the pool (or all to a single winner). */
export function returnStreamPayout(
  def: Auction,
  auction: AuctionState,
): { memberId: string; amount: Paise }[] {
  if (!def.returnStream || !auction.winner) return [];
  const perTurn = rupeesToPaise(def.returnStream.amountPerTurn);
  if (auction.winner.memberId) return [{ memberId: auction.winner.memberId, amount: perTurn }];
  const pool = auction.pools.find((p) => p.id === auction.winner?.poolId);
  return pool ? splitProRata(perTurn, pool.members) : [];
}
