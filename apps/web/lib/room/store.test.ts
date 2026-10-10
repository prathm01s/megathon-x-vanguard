import { beforeEach, describe, expect, it } from "vitest";
import { createMockRoom, getRoom, resetMockRooms, roomOps, subscribe } from "./store";

const host = { userId: "u1", nickname: "host", avatarId: "avatar-1", personaId: "safe-keeper" };

describe("mock room", () => {
  beforeEach(() => resetMockRooms());

  it("serves the fixture room TOSS42 at turn 3 with an open auction", () => {
    const room = getRoom("toss42");
    expect(room?.turn).toBe(3);
    expect(room?.auction?.status).toBe("open");
  });

  it("creates a room, fills bots on start, and notifies subscribers", () => {
    let changes = 0;
    const unsubscribe = subscribe(() => changes++);
    const { code } = createMockRoom("ch2-first-job", host);
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    roomOps.start(code);
    expect(getRoom(code)?.members.length).toBeGreaterThanOrEqual(3);
    expect(changes).toBe(2);
    unsubscribe();
  });

  it("plays a turn: submitting as the only human resolves it", () => {
    const { code } = createMockRoom("ch2-first-job", host);
    roomOps.start(code);
    roomOps.act(code, "u1", { type: "invest", optionId: "savings", amount: 5000_00 });
    roomOps.submitTurn(code, "u1");
    expect(getRoom(code)?.turn).toBe(1);
  });

  it("rejects actions from someone who isn't in the room", () => {
    const { code } = createMockRoom("ch2-first-job", host);
    expect(() => roomOps.submitTurn(code, "stranger")).toThrow();
  });
});
