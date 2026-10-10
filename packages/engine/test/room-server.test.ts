// Room features the server relies on: decision outbox, per-player views, timeouts,
// and the scammer-friend's Ponzi offers.
import type { ContentBundle } from "@toss/content";
import { describe, expect, it } from "vitest";
import {
  acceptLoan,
  createRoomState,
  drainOutbox,
  joinRoom,
  joinRoomPool,
  memberAction,
  placeRoomBid,
  requestLoan,
  resolveTurn,
  startRoom,
  submitTurn,
  viewRoomFor,
} from "../src/room";
import type { RoomState } from "../src/types";
import { content } from "./helpers";

const player = (n: number) => ({
  userId: `user-${n}`,
  nickname: `player${n}`,
  avatarId: `avatar-${n}`,
  personaId: "safe-keeper",
});
const twoHumans = (seed = "srv", c: ContentBundle = content()) =>
  startRoom(
    joinRoom(
      createRoomState({
        code: "SRV111",
        seed,
        chapterId: "ch2-first-job",
        host: player(1),
        content: c,
      }),
      player(2),
      c,
    ),
    c,
  );

function calm(room: RoomState, c: ContentBundle = content()): RoomState {
  for (const m of room.members.filter((x) => !x.isBot)) {
    for (const p of m.state.pendingScams) {
      room = memberAction(
        room,
        m.id,
        { type: "scam_response", instanceId: p.instanceId, response: "ignore" },
        c,
      );
    }
  }
  return room;
}

describe("decision outbox (what the server writes to `decisions`)", () => {
  it("records player actions, loans and every turn's events — for humans only", () => {
    let room = twoHumans("outbox");
    room = memberAction(
      room,
      "m1",
      { type: "invest", optionId: "savings", amount: 5000_00 },
      content(),
    );
    room = requestLoan(room, "m2", { amount: 10000_00, dueTurn: 3 }, content());
    room = acceptLoan(room, "m2", room.loans.find((l) => l.lenderMemberId === "bank")!.id);
    room = submitTurn(room, "m1", content());
    room = submitTurn(room, "m2", content());

    const { room: drained, records } = drainOutbox(room);
    expect(drained.outbox).toEqual([]);
    const types = (memberId: string) =>
      records.filter((r) => r.memberId === memberId).map((r) => r.record.type);
    expect(types("m1")).toEqual(expect.arrayContaining(["invest", "market_toss"]));
    expect(types("m2")).toEqual(
      expect.arrayContaining(["loan_requested", "loan_taken", "market_toss"]),
    );
    // Bots have no playthrough row, so nothing is queued for them.
    expect(records.every((r) => r.memberId === "m1" || r.memberId === "m2")).toBe(true);
    expect(records.every((r) => r.record.chapterId === "ch2-first-job")).toBe(true);
  });

  it("records auction bids, pool joins and wins", () => {
    let room = twoHumans("auction-records");
    for (let t = 0; t < 3; t++) {
      room = calm(room);
      room = submitTurn(submitTurn(room, "m1", content()), "m2", content());
    }
    room = calm(drainOutbox(room).room);
    room = joinRoomPool(room, "m1", { poolId: "p", contribution: 60000_00 }, content());
    room = placeRoomBid(room, "m2", 21000_00, content());
    room = submitTurn(submitTurn(room, "m1", content()), "m2", content());
    const records = drainOutbox(room).records.map((r) => `${r.memberId}:${r.record.type}`);
    expect(records).toEqual(
      expect.arrayContaining(["m1:pool_joined", "m2:auction_bid", "m1:auction_won"]),
    );
  });
});

describe("per-player views (what the server sends to each player)", () => {
  it("shows my full state but only public info about others", () => {
    const room = twoHumans("view");
    const view = viewRoomFor(room, "user-1");
    expect(view.me?.id).toBe("m1");
    expect(view.me?.state.cash).toBeGreaterThan(0);
    const other = view.members.find((m) => m.id === "m2")!;
    expect(other).not.toHaveProperty("state");
    expect(Object.keys(other).sort()).toEqual(
      [
        "avatarId",
        "awaitingScam",
        "finished",
        "id",
        "isBot",
        "nickname",
        "ready",
        "seat",
        "trustScore",
      ].sort(),
    );
    expect(JSON.stringify(view)).not.toContain('"outbox"');
  });

  it("hides other players' sealed bids until the auction closes", () => {
    let room = twoHumans("sealed");
    for (let t = 0; t < 3; t++)
      room = submitTurn(submitTurn(calm(room), "m1", content()), "m2", content());
    room = calm(room);
    room = placeRoomBid(room, "m1", 22000_00, content());
    room = placeRoomBid(room, "m2", 30000_00, content());
    expect(viewRoomFor(room, "user-1").auction!.bids).toEqual([
      { memberId: "m1", amount: 22000_00 },
    ]);
    expect(viewRoomFor(room, "user-2").auction!.bids).toEqual([
      { memberId: "m2", amount: 30000_00 },
    ]);
    expect(viewRoomFor(room, "stranger").auction!.bids).toEqual([]);

    room = submitTurn(submitTurn(room, "m1", content()), "m2", content());
    const closed = viewRoomFor(room, "user-1").auction!;
    expect(closed.status).toBe("closed");
    expect(closed.bids.length).toBeGreaterThanOrEqual(2); // revealed after close: value vs. price
  });

  it("a stranger sees the room but no member state", () => {
    expect(viewRoomFor(twoHumans(), null).me).toBeNull();
  });
});

describe("turn timer", () => {
  it("resolveTurn answers a forgotten scam card with 'ignore' so the player stays in step", () => {
    let room = twoHumans("timer");
    room = {
      ...room,
      members: room.members.map((m) =>
        m.id === "m1"
          ? {
              ...m,
              state: {
                ...m.state,
                status: "awaiting_scam_response" as const,
                pendingScams: [{ instanceId: "x@0", scamId: "otp-unblock-call", turn: 0 }],
              },
            }
          : m,
      ),
    };
    room = resolveTurn(room, content()); // the server calls this when the timer runs out
    const m1 = room.members.find((m) => m.id === "m1")!;
    expect(m1.state.turn).toBe(1);
    expect(m1.state.stats.scamsSpotted).toBeGreaterThanOrEqual(1);
    expect(room.members.every((m) => m.state.turn === 1)).toBe(true);
  });
});

describe("scammer-friend bot (§7.7: 'double your money' in rooms)", () => {
  // The scammer only joins ch3b rooms by default; enable it for ch2 to test the mechanic.
  const withScammer = (): ContentBundle => {
    const c = structuredClone(content());
    c.multiplayer.bots.strategies = c.multiplayer.bots.strategies.map((s) =>
      s.id === "scammer-friend"
        ? { ...s, chapters: ["ch2-first-job"], weight: 100 }
        : { ...s, weight: 0 },
    );
    c.scams.scams = c.scams.scams.map((s) =>
      s.id === "friend-ponzi-scheme" ? { ...s, trigger: "random" as const, probability: 1 } : s,
    );
    return c;
  };

  it("pushes the Ponzi offer at human friends, tagged with who sent it", () => {
    const c = withScammer();
    let room = startRoom(
      createRoomState({
        code: "PONZI1",
        seed: "ponzi",
        chapterId: "ch2-first-job",
        host: player(1),
        content: c,
      }),
      c,
    );
    expect(room.members.filter((m) => m.botStrategy === "scammer-friend").length).toBeGreaterThan(
      0,
    );
    room = submitTurn(room, "m1", c);
    const me = room.members.find((m) => m.id === "m1")!;
    const offer = me.state.pendingScams.find((p) => p.scamId === "friend-ponzi-scheme");
    expect(offer?.fromMemberId).toMatch(/^m\d$/);
    expect(me.state.status).toBe("awaiting_scam_response");
    expect(() => submitTurn(room, "m1", c)).toThrow(); // must answer first

    room = memberAction(
      room,
      "m1",
      { type: "scam_response", instanceId: offer!.instanceId, response: "invest" },
      c,
    );
    expect(room.members.find((m) => m.id === "m1")!.state.scamsFallenIds).toContain(
      "friend-ponzi-scheme",
    );
  });

  it("never appears in default ch2 rooms", () => {
    const room = twoHumans("no-scammer");
    expect(room.members.some((m) => m.botStrategy === "scammer-friend")).toBe(false);
  });
});
