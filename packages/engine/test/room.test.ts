import { describe, expect, it } from "vitest";
import { EngineError } from "../src/errors";
import {
  acceptLoan,
  createRoomState,
  endRoomChapter,
  joinRoom,
  joinRoomPool,
  memberAction,
  offerLoan,
  placeRoomBid,
  react,
  repayRoomLoan,
  requestLoan,
  startRoom,
  submitTurn,
} from "../src/room";
import type { RoomState } from "../src/types";
import { content } from "./helpers";

const player = (n: number) => ({
  userId: `user-${n}`,
  nickname: `player${n}`,
  avatarId: `avatar-${n}`,
  personaId: "safe-keeper",
});

const newRoom = (seed = "room") =>
  createRoomState({
    code: "ABC123",
    seed,
    chapterId: "ch2-first-job",
    host: player(1),
    content: content(),
  });

/** Answers every pending scam for every human with "ignore". */
function calm(room: RoomState): RoomState {
  for (const m of room.members.filter((x) => !x.isBot)) {
    for (const p of m.state.pendingScams) {
      room = memberAction(
        room,
        m.id,
        { type: "scam_response", instanceId: p.instanceId, response: "ignore" },
        content(),
      );
    }
  }
  return room;
}

/** Every human submits; resolves one turn. */
function nextTurn(room: RoomState): RoomState {
  room = calm(room);
  for (const m of room.members.filter((x) => !x.isBot)) room = submitTurn(room, m.id, content());
  return calm(room);
}

describe("lobby", () => {
  it("fills empty seats with bots up to the minimum so solo play works", () => {
    const room = startRoom(newRoom(), content());
    expect(room.members).toHaveLength(content().multiplayer.minPlayers);
    expect(room.members.filter((m) => m.isBot).length).toBe(content().multiplayer.minPlayers - 1);
    expect(room.status).toBe("playing");
  });

  it("caps players and refuses joins after the start", () => {
    let room = newRoom();
    for (let i = 2; i <= content().multiplayer.maxPlayers; i++)
      room = joinRoom(room, player(i), content());
    expect(() => joinRoom(room, player(99), content())).toThrow(EngineError);
    const started = startRoom(newRoom(), content());
    expect(() => joinRoom(started, player(2), content())).toThrow(EngineError);
  });

  it("only allows preset emotes (no free-text chat)", () => {
    const room = startRoom(newRoom(), content());
    expect(() => react(room, "m1", "hello there", content())).toThrow(EngineError);
    expect(
      react(room, "m1", content().multiplayer.emotes[0]!.id, content()).reactions,
    ).toHaveLength(1);
  });
});

describe("lockstep turns", () => {
  it("waits for every human, then everyone moves forward together", () => {
    let room = startRoom(joinRoom(newRoom(), player(2), content()), content());
    room = submitTurn(room, "m1", content());
    expect(room.turn).toBe(0); // m2 hasn't submitted
    room = submitTurn(room, "m2", content());
    expect(room.turn).toBe(1);
    expect(room.members.every((m) => m.state.turn === 1)).toBe(true);
  });

  it("shares the market toss but gives each player their own life", () => {
    let room = startRoom(newRoom("shared"), content());
    for (let t = 0; t < 5; t++) room = nextTurn(room);
    const markets = room.members.map((m) => m.state.tosses.map((x) => x.marketState).join());
    expect(new Set(markets).size).toBe(1);
    const seeds = room.members.map((m) => m.state.seed);
    expect(new Set(seeds).size).toBe(room.members.length);
    expect(room.status).toBe("finished");
  });
});

describe("loans between friends", () => {
  it("a request gets bank, loan-app and bot offers; accepting moves the money", () => {
    let room = startRoom(newRoom("loans"), content());
    room = requestLoan(room, "m1", { amount: 20000_00, dueTurn: 3 }, content());
    const offers = room.loans.filter((l) => l.status === "offered");
    expect(offers.map((o) => o.lenderMemberId)).toEqual(
      expect.arrayContaining(["bank", "loan-app"]),
    );
    const before = room.members[0]!.state.cash;
    const bank = offers.find((o) => o.lenderMemberId === "bank")!;
    room = acceptLoan(room, "m1", bank.id);
    expect(room.members[0]!.state.cash).toBe(before + 20000_00);
    expect(room.loans.filter((l) => l.status === "offered")).toHaveLength(0);
    expect(room.members[0]!.state.stats.loansTaken).toBe(1);
  });

  it("a human friend lends at their own rate; repaying on time builds trust", () => {
    let room = startRoom(joinRoom(newRoom("friends"), player(2), content()), content());
    room = nextTurn(room); // both have a year of savings
    room = requestLoan(room, "m1", { amount: 10000_00, dueTurn: 3 }, content());
    const request = room.loans.find((l) => l.status === "requested")!;
    expect(() =>
      offerLoan(room, "m2", { requestId: request.id, ratePerTurn: 0.5 }, content()),
    ).toThrow(); // above max
    room = offerLoan(room, "m2", { requestId: request.id, ratePerTurn: 0.02 }, content());
    const offer = room.loans.find((l) => l.lenderMemberId === "m2")!;
    const lenderBefore = room.members[1]!.state.cash;
    room = acceptLoan(room, "m1", offer.id);
    expect(room.members[1]!.state.cash).toBe(lenderBefore - 10000_00);

    room = nextTurn(room);
    room = repayRoomLoan(room, "m1", { loanId: offer.id, amount: 99999_00 }, content());
    const loan = room.loans.find((l) => l.id === offer.id)!;
    expect(loan.status).toBe("repaid");
    expect(loan.repaidAmount).toBe(10200_00); // 1 turn × 2%
    expect(room.members[0]!.trustScore).toBe(55);
    expect(room.members[1]!.state.cash).toBeGreaterThan(lenderBefore); // lender earned interest
  });

  it("not repaying makes the loan late (fine, trust down) and then a default", () => {
    let room = startRoom(newRoom("late"), content());
    room = requestLoan(room, "m1", { amount: 10000_00, dueTurn: 1 }, content());
    room = acceptLoan(room, "m1", room.loans.find((l) => l.lenderMemberId === "bank")!.id);
    room = nextTurn(room); // turn 1: due
    room = nextTurn(room); // turn 2: late
    expect(room.loans.find((l) => l.status === "late")).toBeDefined();
    expect(room.members[0]!.trustScore).toBe(50 + content().multiplayer.loans.trust.late);
    for (let i = 0; i < content().multiplayer.loans.defaultAfterTurnsLate; i++)
      room = nextTurn(room);
    expect(room.loans.find((l) => l.status === "defaulted")).toBeDefined();
    expect(room.members[0]!.state.stats.loansDefaulted).toBe(1);
  });

  it("caps how much a player may borrow", () => {
    const room = startRoom(newRoom(), content());
    expect(() => requestLoan(room, "m1", { amount: 10_00_000_00, dueTurn: 3 }, content())).toThrow(
      EngineError,
    );
  });
});

describe("Opportunity Auction with a Pool Bid", () => {
  it("opens before its turn, pools pay pro-rata, winners share the income", () => {
    let room = startRoom(joinRoom(newRoom("auction"), player(2), content()), content());
    for (let t = 0; t < 3; t++) room = nextTurn(room);
    expect(room.auction?.status).toBe("open"); // the bike auction is in year 4

    room = joinRoomPool(room, "m1", { poolId: "friends", contribution: 60000_00 }, content());
    room = joinRoomPool(room, "m2", { poolId: "friends", contribution: 30000_00 }, content());
    expect(() => placeRoomBid(room, "m1", 1_00, content())).toThrow(EngineError); // below minimum

    const cash = room.members.map((m) => m.state.cash);
    room = nextTurn(room);
    const a = room.auction!;
    expect(a.status).toBe("closed");
    expect(a.winner?.poolId).toBe("friends"); // 90,000 beats any bot bid
    expect(a.trueValue).toBe(45000_00); // overpaid: price ≠ value
    expect(room.members[0]!.state.stats.poolBidsJoined).toBe(1);
    // m1 put in 2/3 of the pool, so pays 2/3 of the bid (other cash flows also happen this turn).
    expect(cash[0]! - room.members[0]!.state.cash).toBeLessThan(cash[0]!);
    expect(room.members[0]!.state.stats.auctionsWon).toBe(1);
  });
});

describe("chapter end", () => {
  it("scores everyone with the multiplayer Trust component", () => {
    let room = startRoom(newRoom("end"), content());
    for (let t = 0; t < 5; t++) room = nextTurn(room);
    const results = endRoomChapter(room, content());
    expect(Object.keys(results)).toHaveLength(room.members.length);
    expect(results.m1!.breakdown.find((b) => b.componentId === "trust")?.applicable).toBe(true);
  });
});
