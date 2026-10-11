"use client";

// Client game session (§2: Zustand). Holds the running playthrough and calls the pure engine
// and the Persistence API (§15.4 A, D). Screens never call the engine directly for mutations;
// they dispatch through this store so every change is saved and logged as a DecisionRecord.
import {
  advanceTurn,
  applyAction,
  branchAt,
  replaySession,
  chapterResultRecords,
  createPlaythrough,
  EngineError,
  endChapter,
  migrateState,
  newSeed,
  startChapterFor as engineStartChapterFor,
  toDecisionLog,
  type Action,
  type ChapterResult,
  type DecisionRecord,
  type GameEvent,
  type GameState,
  type MindsetAnswers,
  type MindsetResult,
  type SessionLog,
  type SessionStart,
  type SessionStep,
  type TossResult,
} from "@toss/engine";
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { content } from "@/lib/content";
import {
  appendDecisions,
  saveChapterResult,
  saveMindset,
  savePlaythroughState,
  saveSession,
  startPlaythrough,
  type SavedProgress,
} from "@/lib/data";
import { uuid } from "@/lib/uuid";

export interface MindsetRecord {
  answers: MindsetAnswers;
  result: MindsetResult;
}

export interface TurnOutcome {
  toss: TossResult;
  events: GameEvent[];
}

/**
 * One chapter attempt, step by step (the "time machine"): enough to rebuild the game at any
 * point, ask "what if I hadn't?", or branch. Saved on the device and to the account.
 */
export interface SavedSession {
  id: string;
  chapterId: string;
  personaId: string;
  startedAt: string;
  updatedAt: string;
  log: SessionLog;
  result?: { healthScore: number; passed: boolean };
  /** Set when this session was started from a point in another one. */
  branchOf?: { sessionId: string; stepIndex: number };
}

const MAX_SESSIONS = 30;

/** What happened while fast-forwarding to the end of a chapter. */
export interface FastForwardSummary {
  turns: number;
  income: number;
  costs: number;
  /** Net change of investments from market returns. */
  returns: number;
  lifeEvents: { eventId: string; amount: number }[];
  borrowed: number;
  /** Stopped early because a scam is waiting for an answer. */
  stoppedForScam: boolean;
  completed: boolean;
}

interface GameStore {
  pre: MindsetRecord | null;
  post: MindsetRecord | null;
  /** Current persona (from the mindset check, may shift at chapter end). */
  personaId: string | null;
  playthroughId: string | null;
  state: GameState | null;
  /** Result of the latest `advance()`, shown by the toss / events screen. */
  lastTurn: TurnOutcome | null;
  /** Latest result per chapter id. */
  results: Record<string, ChapterResult>;
  attempts: Record<string, number>;
  /** Guided-turn tips the player already dismissed. */
  dismissedGuide: boolean;
  /** Account this saved game belongs to (the save lives on the device). */
  ownerId: string | null;
  /** Results restored from the server (games played on another device). */
  savedChapters: SavedProgress["chapters"];
  /** Past and current chapter attempts, newest first. */
  sessions: SavedSession[];
  /** The session being played now. */
  sessionId: string | null;

  completeMindset(phase: "pre" | "post", answers: MindsetAnswers, result: MindsetResult): void;
  startChapter(chapterId: string): Promise<void>;
  /** Applies an action. Returns an error code when the engine rejects it. */
  act(action: Action): string | null;
  advance(): TurnOutcome | null;
  /** Plays the remaining turns in one go (stops at a scam that needs an answer). */
  fastForward(): FastForwardSummary | null;
  clearLastTurn(): void;
  finishChapter(): ChapterResult | null;
  dismissGuide(): void;
  /** Adopts what the account did elsewhere; keeps anything newer on this device. */
  restoreProgress(ownerId: string, progress: SavedProgress): void;
  /** Merges sessions saved on other devices (newest copy of each wins). */
  mergeSessions(remote: SavedSession[]): void;
  /** Starts a new game from a point in a saved session: the time machine's "replay from here". */
  branchFrom(sessionId: string, stepIndex: number): Promise<boolean>;
  reset(): void;
}

const initial = {
  pre: null,
  post: null,
  personaId: null,
  playthroughId: null,
  state: null,
  lastTurn: null,
  results: {},
  attempts: {},
  dismissedGuide: false,
  ownerId: null,
  savedChapters: {},
  sessions: [] as SavedSession[],
  sessionId: null,
} satisfies Partial<GameStore>;

/** Fire-and-forget persistence: the real implementation queues offline (§9.4). */
function persistTurn(id: string | null, state: GameState, records: DecisionRecord[]) {
  if (!id) return;
  void savePlaythroughState(id, state);
  if (records.length) void appendDecisions(id, records);
}

/** Adds steps to the current session and saves it (sessions are small: a few hundred steps). */
function withSteps(
  sessions: SavedSession[],
  sessionId: string | null,
  steps: SessionStep[],
): SavedSession[] {
  if (!sessionId || steps.length === 0) return sessions;
  return sessions.map((x) => {
    if (x.id !== sessionId) return x;
    const next = {
      ...x,
      updatedAt: new Date().toISOString(),
      log: { ...x.log, steps: [...x.log.steps, ...steps] },
    };
    void saveSession(next);
    return next;
  });
}

function addSession(sessions: SavedSession[], session: SavedSession): SavedSession[] {
  void saveSession(session);
  return [session, ...sessions.filter((x) => x.id !== session.id)].slice(0, MAX_SESSIONS);
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initial,

      completeMindset(phase, answers, result) {
        void saveMindset(phase, answers, result);
        if (phase === "pre") set({ pre: { answers, result }, personaId: result.personaId });
        else set({ post: { answers, result } });
      },

      async startChapter(chapterId) {
        const { personaId, state: prev, results } = get();
        if (!personaId) return;
        const prevResult = prev ? results[prev.chapterId] : undefined;
        const seed = newSeed();
        const start: SessionStart = {
          personaId,
          seed,
          chapterId,
          // Consequences from the previous chapter (blocked goal, salary bonus, persona-shift
          // streaks) carry over. The RESULT's carryOver has the updated streaks (engine v2).
          ...(prev && prevResult && prev.chapterId !== chapterId
            ? { carryOver: prevResult.carryOver, trustScore: prev.trustScore }
            : {}),
        };
        const state = createPlaythrough({ content, ...start });
        const attempts = { ...get().attempts, [chapterId]: (get().attempts[chapterId] ?? 0) + 1 };
        const now = new Date().toISOString();
        const session: SavedSession = {
          id: uuid(),
          chapterId,
          personaId,
          startedAt: now,
          updatedAt: now,
          log: { start, steps: [] },
        };
        set({
          state,
          lastTurn: null,
          attempts,
          dismissedGuide: false,
          sessionId: session.id,
          sessions: addSession(get().sessions, session),
        });
        const id = await startPlaythrough(personaId, seed, state);
        set({ playthroughId: id });
        void appendDecisions(id, [
          { type: "chapter_start", chapterId, turn: 0, payload: { personaId, seed } },
        ]);
      },

      act(action) {
        const { state, playthroughId } = get();
        if (!state) return "no_game";
        try {
          const next = applyAction(state, action, content);
          const { sessions, sessionId } = get();
          set({
            state: next,
            sessions: withSteps(sessions, sessionId, [{ kind: "act", action }]),
          });
          const record = toDecisionLog(action, {
            chapterId: state.chapterId,
            turn: state.turn + 1,
          });
          persistTurn(playthroughId, next, record ? [record] : []);
          return null;
        } catch (err) {
          if (err instanceof EngineError) return err.code;
          throw err;
        }
      },

      advance() {
        const { state, playthroughId } = get();
        if (!state || state.status !== "playing") return null;
        const { state: next, tossResult, events } = advanceTurn(state, content);
        const outcome = { toss: tossResult, events };
        const { sessions, sessionId } = get();
        set({
          state: next,
          lastTurn: outcome,
          sessions: withSteps(sessions, sessionId, [{ kind: "advance" }]),
        });
        const records = events
          .map((e) => toDecisionLog(e, { chapterId: next.chapterId, turn: next.turn }))
          .filter((r): r is DecisionRecord => r !== null && r.type !== "chapter_end");
        persistTurn(playthroughId, next, records);
        return outcome;
      },

      fastForward() {
        const { state: start, playthroughId } = get();
        if (!start || start.status !== "playing") return null;
        const summary: FastForwardSummary = {
          turns: 0,
          income: 0,
          costs: 0,
          returns: 0,
          lifeEvents: [],
          borrowed: 0,
          stoppedForScam: false,
          completed: false,
        };
        let s = start;
        const records: DecisionRecord[] = [];
        while (s.status === "playing") {
          const { state: next, events } = advanceTurn(s, content);
          summary.turns += 1;
          for (const e of events) {
            if (e.type === "income") summary.income += e.amount;
            else if (e.type === "fixed_expenses") summary.costs += e.amount;
            else if (e.type === "returns") summary.returns += e.change;
            else if (e.type === "life_event") {
              summary.lifeEvents.push({ eventId: e.eventId, amount: e.amount });
            } else if (e.type === "forced_borrowing") summary.borrowed += e.amount;
            const record = toDecisionLog(e, { chapterId: next.chapterId, turn: next.turn });
            if (record && record.type !== "chapter_end") records.push(record);
          }
          s = next;
        }
        summary.stoppedForScam = s.status === "awaiting_scam_response";
        summary.completed = s.status === "chapter_complete";
        const { sessions, sessionId } = get();
        const advances: SessionStep[] = Array.from({ length: summary.turns }, () => ({
          kind: "advance" as const,
        }));
        set({ state: s, lastTurn: null, sessions: withSteps(sessions, sessionId, advances) });
        persistTurn(playthroughId, s, records);
        return summary;
      },

      clearLastTurn() {
        set({ lastTurn: null });
      },

      finishChapter() {
        const { state, playthroughId, attempts, results, personaId } = get();
        if (!state || state.status !== "chapter_complete") return null;
        const result = endChapter(state, content, { attempt: attempts[state.chapterId] ?? 1 });
        const { sessions, sessionId } = get();
        set({
          results: { ...results, [state.chapterId]: result },
          personaId: result.personaShift?.to ?? personaId,
          sessions: sessions.map((x) => {
            if (x.id !== sessionId) return x;
            const done = {
              ...x,
              updatedAt: new Date().toISOString(),
              result: { healthScore: result.healthScore, passed: result.passed },
            };
            void saveSession(done);
            return done;
          }),
        });
        if (playthroughId) {
          void saveChapterResult(playthroughId, result);
          // chapter_end (with score, badges, weakest part) + persona_shift, same as rooms log.
          void appendDecisions(playthroughId, chapterResultRecords(result, state.turn));
        }
        return result;
      },

      dismissGuide() {
        set({ dismissedGuide: true });
      },

      mergeSessions(remote) {
        const byId = new Map(get().sessions.map((x) => [x.id, x]));
        for (const r of remote) {
          const local = byId.get(r.id);
          if (!local || r.updatedAt > local.updatedAt) byId.set(r.id, r);
        }
        set({
          sessions: [...byId.values()]
            .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
            .slice(0, MAX_SESSIONS),
        });
      },

      async branchFrom(sessionId, stepIndex) {
        const from = get().sessions.find((x) => x.id === sessionId);
        if (!from) return false;
        const log = branchAt(from.log, stepIndex);
        let state: GameState;
        try {
          state = replaySession(log, content).state;
        } catch {
          return false;
        }
        const now = new Date().toISOString();
        const session: SavedSession = {
          id: uuid(),
          chapterId: from.chapterId,
          personaId: from.personaId,
          startedAt: now,
          updatedAt: now,
          log,
          branchOf: { sessionId, stepIndex },
        };
        set({
          state,
          lastTurn: null,
          dismissedGuide: true,
          sessionId: session.id,
          sessions: addSession(get().sessions, session),
        });
        const id = await startPlaythrough(from.personaId, from.log.start.seed, state);
        set({ playthroughId: id });
        return true;
      },

      restoreProgress(ownerId, progress) {
        const s = get();
        set({
          ownerId,
          pre: s.pre ?? progress.pre,
          post: s.post ?? progress.post,
          personaId: s.personaId ?? progress.personaId,
          savedChapters: progress.chapters,
        });
      },

      reset() {
        set(initial);
      },
    }),
    {
      name: "toss-life:game:v1",
      storage: createJSONStorage(() => localStorage),
      // v2: engine GameState schema v2. Saved games from older builds are upgraded with the
      // engine's migrateState instead of crashing on load (§8.1).
      version: 2,
      migrate: (persisted, version) => {
        const saved = persisted as Partial<GameStore>;
        if (version < 2 && saved.state) {
          try {
            saved.state = migrateState(saved.state, content);
          } catch {
            saved.state = null; // unreadable: start the chapter again rather than crash
          }
        }
        return saved as GameStore;
      },
      // Rehydrated manually after mount (see `useGameHydrated`) to avoid SSR mismatches.
      skipHydration: true,
      partialize: ({ lastTurn: _lastTurn, ...rest }) => rest,
    },
  ),
);

/** Rehydrates the store from localStorage; safe for SSR without cascading renders. */
export function useGameHydrated(): boolean {
  return useSyncExternalStore(
    (callback) => {
      const unsub = useGameStore.persist.onFinishHydration(callback);
      if (!useGameStore.persist.hasHydrated()) {
        void useGameStore.persist.rehydrate();
      }
      return unsub;
    },
    () => useGameStore.persist.hasHydrated(),
    () => false,
  );
}

/**
 * First playable chapter for a persona. DECISION: personas may start in ch1, but ch1 is
 * `enabled: false` until its numbers are filled in (handoff §7.4), so we fall forward to the
 * first enabled chapter at or after the persona's `startChapter`.
 */
export function startChapterFor(personaId: string | null): string | undefined {
  if (!personaId) return undefined;
  return engineStartChapterFor(personaId, content);
}
