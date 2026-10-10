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

/**
 * - `loading`: still asking Supabase (render nothing account-specific yet)
 * - `signed-out`: no account on this device
 * - `needs-setup`: signed in, but the profile (nickname / NGO name) isn't set up yet
 * - `ready`: signed in with a profile
 */
export type SessionStatus = "loading" | "signed-out" | "needs-setup" | "ready";

export interface Session {
  status: SessionStatus;
  /** Account type chosen at sign-up; tells /setup which form to show before a profile exists. */
  accountType?: Role;
  user: { id: string } | null;
  profile: Profile | null;
  role: Role | null;
  org: Org | null;
}

/** What a student has done on any device: restored when they sign in on a new one. */
export interface SavedProgress {
  pre: { answers: MindsetAnswers; result: MindsetResult } | null;
  post: { answers: MindsetAnswers; result: MindsetResult } | null;
  /** Latest persona (the newest game's, which includes persona shifts), else the pre-check's. */
  personaId: string | null;
  /** Best result per chapter. */
  chapters: Record<string, { passed: boolean; healthScore: number }>;
}

export interface PersistenceApi {
  loadProgress(): Promise<SavedProgress>;
  saveMindset(phase: "pre" | "post", answers: MindsetAnswers, result: MindsetResult): Promise<void>;
  startPlaythrough(
    personaId: string,
    seed: string,
    initialState?: GameState,
  ): Promise<PlaythroughId>;
  loadPlaythrough(id: PlaythroughId): Promise<{ state: GameState; contentVersion: string } | null>;
  /** Saves the latest engine snapshot (called after each turn). */
  savePlaythroughState(id: PlaythroughId, state: GameState): Promise<void>;
  /** Queued offline (IndexedDB) and synced later in the real implementation. */
  appendDecisions(id: PlaythroughId, records: DecisionRecord[]): Promise<void>;
  saveChapterResult(id: PlaythroughId, result: ChapterResult): Promise<void>;
}
