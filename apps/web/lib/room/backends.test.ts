import type { SupabaseClient } from "@supabase/supabase-js";
import { sampleRoomView } from "@toss/engine/fixtures";
import { describe, expect, it, vi } from "vitest";
import { RoomError } from "./backend";
import { createMockBackend } from "./mock-backend";
import { createSupabaseBackend } from "./supabase-backend";

const host = { userId: "u1", nickname: "host", avatarId: "avatar-1", personaId: "safe-keeper" };
const guest = { userId: "u2", nickname: "guest", avatarId: "avatar-2", personaId: "thrill-seeker" };

describe("mock backend", () => {
  it("serves the fixture room TOSS42 to the mock user, redacted", () => {
    const b = createMockBackend();
    const view = b.getView("toss42", "mock-user")!;
    expect(view.turn).toBe(3);
    expect(view.auction?.status).toBe("open");
    expect(view.me?.userId).toBe("mock-user");
    expect(view.members.every((m) => !("state" in m))).toBe(true);
  });

  it("returns the same view object until the room changes (useSyncExternalStore)", () => {
    const b = createMockBackend();
    expect(b.getView("TOSS42", "mock-user")).toBe(b.getView("TOSS42", "mock-user"));
  });

  it("runs a lobby → game with two humans and notifies subscribers", async () => {
    const b = createMockBackend();
    const { code } = await b.create("ch2-first-job", host);
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    const onChange = vi.fn();
    b.subscribe(code, "u1", onChange);

    await b.send(code, guest, { op: "join" });
    await expect(b.send(code, guest, { op: "start" })).rejects.toMatchObject({ code: "not_host" });
    await b.send(code, host, { op: "start" });
    expect(b.getView(code, "u1")!.members.length).toBeGreaterThanOrEqual(3);

    await b.send(code, host, {
      op: "act",
      action: { type: "invest", optionId: "savings", amount: 5000_00 },
    });
    await b.send(code, host, { op: "submit_turn" });
    expect(b.getView(code, "u1")!.turn).toBe(0); // waiting for the guest
    await b.send(code, guest, { op: "submit_turn" });
    expect(b.getView(code, "u2")!.turn).toBe(1);
    expect(onChange).toHaveBeenCalled();
    expect(b.peek(code)!.outbox).toEqual([]); // records drained like the server does
  });

  it("rejects with a RoomError carrying a stable code", async () => {
    const b = createMockBackend();
    const { code } = await b.create("ch2-first-job", host);
    const err = await b.send(code, guest, { op: "submit_turn" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RoomError);
    expect((err as RoomError).code).toBe("not_in_room");
    await expect(b.send("NOPE22", host, { op: "join" })).rejects.toMatchObject({
      code: "room_not_found",
    });
  });
});

describe("supabase backend", () => {
  function fakeClient(invokeResult: { data?: unknown; error?: unknown }) {
    const invoke = vi.fn().mockResolvedValue(invokeResult);
    const channel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    const client = {
      functions: { invoke },
      from: vi.fn().mockReturnValue(query),
      channel: vi.fn().mockReturnValue(channel),
      removeChannel: vi.fn(),
    };
    return { client: client as unknown as SupabaseClient, invoke, channel, raw: client };
  }

  it("sends the request with the room code and publishes the returned view", async () => {
    const { client, invoke } = fakeClient({ data: { code: "TOSS42", view: sampleRoomView } });
    const b = createSupabaseBackend(() => client);
    const onChange = vi.fn();
    b.subscribe("toss42", "mock-user", onChange);
    await b.send("toss42", { ...host, userId: "mock-user" }, { op: "submit_turn" });
    expect(invoke).toHaveBeenCalledWith("room-action", {
      body: { code: "TOSS42", op: "submit_turn" },
    });
    expect(b.getView("TOSS42", "mock-user")).toBe(sampleRoomView);
    expect(onChange).toHaveBeenCalled();
  });

  it("follows the player's own room_views row over Realtime", () => {
    const { client, channel, raw } = fakeClient({});
    const b = createSupabaseBackend(() => client);
    const unsubscribe = b.subscribe("ABC234", "u1", () => {});
    expect(raw.from).toHaveBeenCalledWith("room_views");
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({ table: "room_views", filter: "room_code=eq.ABC234" }),
      expect.any(Function),
    );
    const handler = channel.on.mock.calls[0]![2] as (p: { new: unknown }) => void;
    handler({ new: { user_id: "someone-else", view: sampleRoomView } });
    expect(b.getView("ABC234", "u1")).toBeNull();
    handler({ new: { user_id: "u1", view: sampleRoomView } });
    expect(b.getView("ABC234", "u1")).toBe(sampleRoomView);
    unsubscribe();
    expect(raw.removeChannel).toHaveBeenCalled();
  });

  it("turns an Edge Function error body into a RoomError", async () => {
    const error = {
      context: new Response(JSON.stringify({ code: "insufficient_cash", message: "x" }), {
        status: 409,
      }),
    };
    const { client } = fakeClient({ error });
    const b = createSupabaseBackend(() => client);
    await expect(b.send("ABC234", host, { op: "place_bid", amount: 1 })).rejects.toMatchObject({
      code: "insufficient_cash",
    });
  });
});
