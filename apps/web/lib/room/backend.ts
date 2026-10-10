// The seam between the Friends' Room UI and whatever runs the room (§15.4 E).
// Two implementations: the in-memory mock (./mock-backend) and Supabase (./supabase-backend).
// Both speak the same protocol (`RoomRequest` from @toss/engine) and return the same
// per-player `RoomView`, so screens behave identically against either.
import type { RoomRequest, RoomView } from "@toss/engine";

export interface HostInfo {
  userId: string;
  nickname: string;
  avatarId: string;
  personaId: string;
}

export interface RoomBackend {
  /** Current view of a room for a user, or null if unknown / not loaded yet. Stable identity
   *  between changes (required by useSyncExternalStore). */
  getView(code: string, userId: string): RoomView | null;
  /** Starts listening to a room; returns an unsubscribe function. */
  subscribe(code: string, userId: string, onChange: () => void): () => void;
  /** Sends one request. Rejects with a `RoomError`. */
  send(code: string, actor: HostInfo, request: RoomRequest): Promise<void>;
  create(chapterId: string, host: HostInfo): Promise<{ code: string }>;
}

/** A refused room action. `code` is stable (e.g. "insufficient_cash") — translate it via
 *  `messages/<locale>.json`, never show `message` to students. */
export class RoomError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RoomError";
  }
}

export function toRoomError(err: unknown): RoomError {
  if (err instanceof RoomError) return err;
  if (err && typeof err === "object" && "code" in err && typeof err.code === "string") {
    return new RoomError(err.code, err instanceof Error ? err.message : err.code);
  }
  return new RoomError("unknown", err instanceof Error ? err.message : String(err));
}
