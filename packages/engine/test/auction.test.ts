import { describe, expect, it } from "vitest";
import {
  closeAuction,
  joinPool,
  openAuction,
  overbidPct,
  placeBid,
  poolCosts,
  returnStreamPayout,
  splitProRata,
} from "../src/auction";
import { content } from "./helpers";

const bike = () => content().auctions.auctions.find((a) => a.id === "used-bike-auction")!;

describe("Opportunity Auctions", () => {
  it("the highest sealed bid wins and the true value is revealed", () => {
    let a = openAuction(bike());
    a = placeBid(a, bike(), { memberId: "x", amount: 25000_00 });
    a = placeBid(a, bike(), { memberId: "y", amount: 50000_00 });
    const closed = closeAuction(a, bike());
    expect(closed.winner).toEqual({ memberId: "y", amount: 50000_00 });
    expect(closed.trueValue).toBe(45000_00);
    expect(overbidPct(50000_00, 45000_00)).toBeCloseTo(0.111, 3); // overpaid: value ≠ price
  });

  it("rejects bids below the minimum and lets a bidder change their bid", () => {
    expect(() => placeBid(openAuction(bike()), bike(), { memberId: "x", amount: 1_00 })).toThrow();
    let a = placeBid(openAuction(bike()), bike(), { memberId: "x", amount: 30000_00 });
    a = placeBid(a, bike(), { memberId: "x", amount: 21000_00 });
    expect(a.bids).toEqual([{ memberId: "x", amount: 21000_00 }]);
  });

  it("breaks ties in favour of the earlier bid", () => {
    let a = openAuction(bike());
    a = placeBid(a, bike(), { memberId: "first", amount: 30000_00 });
    a = placeBid(a, bike(), { memberId: "second", amount: 30000_00 });
    expect(closeAuction(a, bike()).winner?.memberId).toBe("first");
  });
});

describe("Pool Bids (the mutual fund reveal)", () => {
  it("friends pool money, outbid a single player, and share costs and returns pro-rata", () => {
    let a = openAuction(bike());
    a = joinPool(a, "pool", "a", 20000_00);
    a = joinPool(a, "pool", "b", 10000_00);
    a = joinPool(a, "pool", "c", 10000_00);
    a = placeBid(a, bike(), { poolId: "pool", amount: 40000_00 });
    a = placeBid(a, bike(), { memberId: "solo", amount: 35000_00 });
    const closed = closeAuction(a, bike());
    expect(closed.winner).toEqual({ poolId: "pool", amount: 40000_00 });

    const pool = closed.pools[0]!;
    expect(poolCosts(pool, 40000_00)).toEqual([
      { memberId: "a", amount: 20000_00 },
      { memberId: "b", amount: 10000_00 },
      { memberId: "c", amount: 10000_00 },
    ]);
    // The bike earns 12,000 a turn, split 50/25/25.
    expect(returnStreamPayout(bike(), closed)).toEqual([
      { memberId: "a", amount: 6000_00 },
      { memberId: "b", amount: 3000_00 },
      { memberId: "c", amount: 3000_00 },
    ]);
  });

  it("a pool can't bid more than it holds", () => {
    let a = joinPool(openAuction(bike()), "p", "a", 22000_00);
    expect(() => placeBid(a, bike(), { poolId: "p", amount: 30000_00 })).toThrow();
    a = placeBid(a, bike(), { poolId: "p", amount: 22000_00 });
    expect(a.bids).toHaveLength(1);
  });

  it("pro-rata splits are whole paise and always add up exactly", () => {
    const shares = [
      { memberId: "a", contribution: 1 },
      { memberId: "b", contribution: 1 },
      { memberId: "c", contribution: 1 },
    ];
    const out = splitProRata(100, shares);
    expect(out.reduce((s, x) => s + x.amount, 0)).toBe(100);
    expect(out.map((x) => x.amount).sort()).toEqual([33, 33, 34]);
    for (const total of [1, 7, 999_99, 12345_67]) {
      const r = splitProRata(total, [
        { memberId: "x", contribution: 333 },
        { memberId: "y", contribution: 667 },
        { memberId: "z", contribution: 1 },
      ]);
      expect(r.reduce((s, x) => s + x.amount, 0)).toBe(total);
    }
  });
});
