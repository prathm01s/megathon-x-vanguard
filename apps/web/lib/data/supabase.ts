// ─────────────────────────────────────────────────────────────────────────────
// Real Supabase Persistence Layer with Offline Cache (§15.4 D, §15.6 #9)
// Owner: Prathmesh
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@/lib/supabase/client";
import { content } from "@/lib/content";
import { createPlaythrough } from "@toss/engine";
import type { PersistenceApi, PlaythroughId } from "./types";
import type { Json } from "@toss/db-types";
import type {
  ChapterResult,
  DecisionRecord,
  GameState,
  MindsetAnswers,
  MindsetResult,
} from "@toss/engine";

// The generated types require a non-null value for NOT NULL jsonb columns.
type JsonValue = NonNullable<Json>;

const LOCAL_STORAGE_PREFIX = "toss-life:offline:";

// Helper to save to local cache
function cacheLocal(key: string, data: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, JSON.stringify(data));
  } catch {
    // Quota exceeded / private mode
  }
}

// Helper to read from local cache
function getLocal<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── IndexedDB Storage for Large Offline Decision Queues (§15.4 D, §15.6 #9) ──
const IDB_DB_NAME = "toss-life:persistence";
const IDB_STORE_NAME = "offline_queue";

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB unavailable"));
    }
    const req = window.indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getQueuedDecisions(id: PlaythroughId): Promise<DecisionRecord[]> {
  try {
    const db = await openIDB();
    return await new Promise<DecisionRecord[]>((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, "readonly");
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as DecisionRecord[]) || []);
      req.onerror = () => resolve(getLocal<DecisionRecord[]>(`queue:decisions:${id}`) || []);
    });
  } catch {
    return getLocal<DecisionRecord[]>(`queue:decisions:${id}`) || [];
  }
}

async function saveQueuedDecisions(id: PlaythroughId, records: DecisionRecord[]): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.put(records, id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    cacheLocal(`queue:decisions:${id}`, records);
  }
}

async function clearQueuedDecisions(id: PlaythroughId): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}queue:decisions:${id}`);
  }
}

// Offline queue for decisions
async function queueDecision(id: PlaythroughId, records: DecisionRecord[]): Promise<void> {
  const existing = await getQueuedDecisions(id);
  existing.push(...records);
  await saveQueuedDecisions(id, existing);
}

async function flushDecisionQueue(id: PlaythroughId): Promise<void> {
  try {
    await flushDecisionQueueUnsafe(id);
  } catch (e) {
    // Offline or Supabase not configured: records stay queued in IndexedDB / localStorage.
    console.warn("Decisions queued offline, remote sync postponed:", e);
  }
}

async function flushDecisionQueueUnsafe(id: PlaythroughId): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  const queue = await getQueuedDecisions(id);
  if (!queue || queue.length === 0) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const rows = queue.map((r) => ({
    playthrough_id: id,
    chapter_id: r.chapterId,
    turn: r.turn,
    type: r.type,
    payload: r.payload as unknown as JsonValue,
  }));

  const { error } = await supabase.from("decisions").insert(rows);
  if (!error) {
    await clearQueuedDecisions(id);
  }
}

export const supabasePersistence: PersistenceApi = {
  async saveMindset(
    phase: "pre" | "post",
    answers: MindsetAnswers,
    result: MindsetResult,
  ): Promise<void> {
    cacheLocal(`mindset:${phase}`, { answers, result, at: new Date().toISOString() });

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("mindset_responses").insert({
        user_id: user.id,
        phase,
        answers: answers as unknown as JsonValue,
        scores: result.scores as unknown as JsonValue,
        persona_id: result.personaId,
        content_version: content.contentVersion,
      });
    } catch (e) {
      console.warn("Failed to save mindset to remote DB, stored locally:", e);
    }
  },

  async startPlaythrough(
    personaId: string,
    seed: string,
    initialState?: GameState,
  ): Promise<PlaythroughId> {
    const state =
      initialState ??
      createPlaythrough({
        content,
        personaId,
        seed,
        chapterId: "ch2-first-job",
      });

    const localId = crypto.randomUUID();
    cacheLocal(`playthrough:${localId}`, {
      personaId,
      seed,
      state,
      contentVersion: state.contentVersion,
    });

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("playthroughs")
          .insert({
            user_id: user.id,
            persona_id: personaId,
            seed,
            content_version: state.contentVersion,
            current_chapter_id: state.chapterId,
            status: "active",
            state: state as unknown as JsonValue,
          })
          .select("id")
          .single();

        if (!error && data) {
          cacheLocal(`playthrough:${data.id}`, {
            personaId,
            seed,
            state,
            contentVersion: state.contentVersion,
          });
          return data.id;
        }
      }
    } catch (e) {
      console.warn("Could not start playthrough on remote, falling back to local:", e);
    }

    return localId;
  },

  async loadPlaythrough(
    id: PlaythroughId,
  ): Promise<{ state: GameState; contentVersion: string } | null> {
    // Check local first for immediate response
    const cached = getLocal<{ state: GameState; contentVersion: string }>(`playthrough:${id}`);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("playthroughs")
        .select("state, content_version")
        .eq("id", id)
        .maybeSingle();

      if (!error && data) {
        const result = {
          state: data.state as unknown as GameState,
          contentVersion: data.content_version,
        };
        cacheLocal(`playthrough:${id}`, result);
        return result;
      }
    } catch {
      // Offline fallback
    }

    return cached;
  },

  async savePlaythroughState(id: PlaythroughId, state: GameState): Promise<void> {
    cacheLocal(`playthrough:${id}`, {
      state,
      contentVersion: state.contentVersion,
    });

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("playthroughs")
          .update({
            state: state as unknown as JsonValue,
            current_chapter_id: state.chapterId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        // Try flushing any pending offline decisions
        await flushDecisionQueue(id);
      }
    } catch (e) {
      console.warn("State saved locally, remote sync postponed:", e);
    }
  },

  async appendDecisions(id: PlaythroughId, records: DecisionRecord[]): Promise<void> {
    await queueDecision(id, records);
    await flushDecisionQueue(id);
  },

  async saveChapterResult(id: PlaythroughId, result: ChapterResult): Promise<void> {
    cacheLocal(`chapter_result:${id}:${result.chapterId}`, result);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("chapter_results").insert({
          playthrough_id: id,
          chapter_id: result.chapterId,
          attempt: result.attempt,
          health_score: result.healthScore,
          score_breakdown: result.breakdown as unknown as JsonValue,
          report: result.report as unknown as JsonValue,
          passed: result.passed,
        });

        // Insert earned badges if any
        if (result.badgesEarned && result.badgesEarned.length > 0) {
          const badgeRows = result.badgesEarned.map((badge_id) => ({
            user_id: user.id,
            badge_id,
          }));
          await supabase.from("badges_earned").upsert(badgeRows);
        }
      }
    } catch (e) {
      console.warn("Saved chapter result locally:", e);
    }
  },
};
