// localStorage-backed mock of the Persistence API so every screen can be built and
// tested before Supabase is wired up (§15.4 D). Browser only.
import type { PersistenceApi, PlaythroughId, Session } from "./types";

const KEY = "toss-life:mock-db:v1";

interface MockDb {
  mindset: { phase: string; answers: unknown; result: unknown; at: string }[];
  playthroughs: Record<
    PlaythroughId,
    { personaId: string; seed: string; state: unknown; contentVersion: string }
  >;
  decisions: Record<PlaythroughId, unknown[]>;
  chapterResults: Record<PlaythroughId, unknown[]>;
}

function read(): MockDb {
  if (typeof window === "undefined") return empty();
  try {
    return { ...empty(), ...JSON.parse(window.localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return empty();
  }
}

function write(db: MockDb) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // Private mode / quota: the mock just forgets.
  }
}

function empty(): MockDb {
  return { mindset: [], playthroughs: {}, decisions: {}, chapterResults: {} };
}

export const mockSession: Session = {
  user: { id: "mock-user" },
  profile: {
    userId: "mock-user",
    role: "student",
    orgId: null,
    username: "coinflip_kid",
    nickname: "Coinflip Kid",
    avatarId: "avatar-1",
    playerId: "TL-7KQ2M",
    locale: "en",
    hasRecoveryEmail: false,
  },
  role: "student",
  org: null,
};

export const mockPersistence: PersistenceApi = {
  async saveMindset(phase, answers, result) {
    const db = read();
    db.mindset.push({ phase, answers, result, at: new Date().toISOString() });
    write(db);
  },
  async startPlaythrough(personaId, seed, initialState) {
    const db = read();
    const id = globalThis.crypto.randomUUID();
    db.playthroughs[id] = {
      personaId,
      seed,
      state: initialState,
      contentVersion: initialState.contentVersion,
    };
    write(db);
    return id;
  },
  async loadPlaythrough(id) {
    const p = read().playthroughs[id];
    return p ? { state: p.state as never, contentVersion: p.contentVersion } : null;
  },
  async savePlaythroughState(id, state) {
    const db = read();
    const p = db.playthroughs[id];
    if (p) p.state = state;
    write(db);
  },
  async appendDecisions(id, records) {
    const db = read();
    (db.decisions[id] ??= []).push(...records);
    write(db);
  },
  async saveChapterResult(id, result) {
    const db = read();
    (db.chapterResults[id] ??= []).push(result);
    write(db);
  },
};
