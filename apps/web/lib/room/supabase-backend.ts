// Realtime Friends' Room client (§15.5 item 16). Owner: Samarth.
//
// Writes:  every request goes to the server-authoritative `room-action` Edge Function, which
//          validates it, runs the engine's room rules and returns the caller's fresh view.
// Reads:   each player has one row in `room_views` (RLS: only your own row). We read it once
//          and then follow it with Supabase Realtime `postgres_changes`.
import type { RoomRequest, RoomView } from "@toss/engine";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RoomError, type HostInfo, type RoomBackend } from "./backend";

interface FunctionResult {
  code: string;
  view: RoomView;
}

/** Shape of an error body from the Edge Function: `{ code, message }`. */
async function errorFrom(err: unknown): Promise<RoomError> {
  const ctx = (err as { context?: unknown }).context;
  if (ctx instanceof Response) {
    try {
      const body = (await ctx.json()) as { code?: string; message?: string };
      return new RoomError(body.code ?? "server_error", body.message ?? "room server error");
    } catch {
      return new RoomError("server_error", `room server answered ${ctx.status}`);
    }
  }
  return new RoomError("network", err instanceof Error ? err.message : String(err));
}

export function createSupabaseBackend(getClient: () => SupabaseClient): RoomBackend {
  const views = new Map<string, RoomView>();
  const listeners = new Map<string, Set<() => void>>();
  const channels = new Map<string, () => void>();
  const keyOf = (code: string, userId: string) => `${code.toUpperCase()}|${userId}`;

  const publish = (code: string, userId: string, view: RoomView) => {
    const key = keyOf(code, userId);
    views.set(key, view);
    for (const l of listeners.get(key) ?? []) l();
  };

  async function invoke(body: Record<string, unknown>): Promise<FunctionResult> {
    const { data, error } = await getClient().functions.invoke<FunctionResult>("room-action", {
      body,
    });
    if (error) throw await errorFrom(error);
    if (!data) throw new RoomError("server_error", "empty response");
    return data;
  }

  function connect(code: string, userId: string): () => void {
    const client = getClient();
    const upper = code.toUpperCase();
    let alive = true;

    void client
      .from("room_views")
      .select("view")
      .eq("room_code", upper)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive && data?.view) publish(upper, userId, data.view as RoomView);
      });

    const channel = client
      .channel(`room-view:${upper}:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_views", filter: `room_code=eq.${upper}` },
        (payload) => {
          const row = payload.new as { user_id?: string; view?: RoomView } | undefined;
          // RLS already limits rows to our own; the user check is belt and braces.
          if (row?.user_id === userId && row.view) publish(upper, userId, row.view);
        },
      )
      .subscribe();

    return () => {
      alive = false;
      void client.removeChannel(channel);
    };
  }

  return {
    getView: (code, userId) => views.get(keyOf(code, userId)) ?? null,

    subscribe(code, userId, onChange) {
      const key = keyOf(code, userId);
      if (!listeners.has(key)) listeners.set(key, new Set());
      const set = listeners.get(key)!;
      set.add(onChange);
      if (!channels.has(key)) channels.set(key, connect(code, userId));
      return () => {
        set.delete(onChange);
        if (set.size === 0) {
          channels.get(key)?.();
          channels.delete(key);
        }
      };
    },

    async send(code, actor: HostInfo, request: RoomRequest) {
      // The server identifies the player from the auth token, never from the body.
      const result = await invoke({ code: code.toUpperCase(), ...request });
      publish(result.code, actor.userId, result.view);
    },

    async create(chapterId, host) {
      const result = await invoke({ op: "create", chapterId });
      publish(result.code, host.userId, result.view);
      return { code: result.code };
    },
  };
}
