// PERSISTENCE API CONTRACT (§15.4 D). Owned by Prathmesh, used by Pragya's screens.
import type {
  ChapterResult,
  DecisionRecord,
  GameState,
  MindsetAnswers,
  MindsetResult,
} from "@toss/engine";

export type Role = "ngo_admin" | "student";
export type PlaythroughId = string;

export interface Profile {
  userId: string;
  role: Role;
  orgId: string | null;
  username: string;
  nickname: string;
  avatarId: string;
  /** Public id shown on the profile, e.g. TL-7KQ2M. */
  playerId: string;
  locale: string;
  hasRecoveryEmail: boolean;
}

export interface Org {
  id: string;
  name: string;
}

export interface Session {
  user: { id: string } | null;
  profile: Profile | null;
  role: Role | null;
  org: Org | null;
}

export interface PersistenceApi {
  saveMindset(phase: "pre" | "post", answers: MindsetAnswers, result: MindsetResult): Promise<void>;
  startPlaythrough(
    personaId: string,
    seed: string,
    initialState: GameState,
  ): Promise<PlaythroughId>;
  loadPlaythrough(id: PlaythroughId): Promise<{ state: GameState; contentVersion: string } | null>;
  /** Saves the latest engine snapshot (called after each turn). */
  savePlaythroughState(id: PlaythroughId, state: GameState): Promise<void>;
  /** Queued offline (IndexedDB) and synced later in the real implementation. */
  appendDecisions(id: PlaythroughId, records: DecisionRecord[]): Promise<void>;
  saveChapterResult(id: PlaythroughId, result: ChapterResult): Promise<void>;
}
