"use client";

// Client game session (§2: Zustand). Holds the running playthrough and calls the pure engine
// and the Persistence API (§15.4 A, D). Screens never call the engine directly for mutations;
// they dispatch through this store so every change is saved and logged as a DecisionRecord.
import {
  advanceTurn,
  applyAction,
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
  startPlaythrough,
  type SavedProgress,
} from "@/lib/data";

export interface MindsetRecord {
  answers: MindsetAnswers;
  result: MindsetResult;
}

export interface TurnOutcome {
  toss: TossResult;
  events: GameEvent[];
}

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
} satisfies Partial<GameStore>;

/** Fire-and-forget persistence: the real implementation queues offline (§9.4). */
function persistTurn(id: string | null, state: GameState, records: DecisionRecord[]) {
  if (!id) return;
  void savePlaythroughState(id, state);
  if (records.length) void appendDecisions(id, records);
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
        const state = createPlaythrough({
          content,
          personaId,
          seed,
          chapterId,
          // Consequences from the previous chapter (blocked goal, salary bonus, persona-shift
          // streaks) carry over. The RESULT's carryOver has the updated streaks (engine v2).
          ...(prev && prevResult && prev.chapterId !== chapterId
            ? { carryOver: prevResult.carryOver, trustScore: prev.trustScore }
            : {}),
        });
        const attempts = { ...get().attempts, [chapterId]: (get().attempts[chapterId] ?? 0) + 1 };
        set({ state, lastTurn: null, attempts, dismissedGuide: false });
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
          set({ state: next });
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
        set({ state: next, lastTurn: outcome });
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
        set({ state: s, lastTurn: null });
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
        set({
          results: { ...results, [state.chapterId]: result },
          personaId: result.personaShift?.to ?? personaId,
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
