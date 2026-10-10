"use client";

// Persistence API entry point (§15.4 D). Screens import ONLY from here.
// TODO(prathmesh): swap the mock for the Supabase implementation with an IndexedDB offline queue.
import { mockPersistence, mockSession } from "./mock";
import type { PersistenceApi, Session } from "./types";

export type * from "./types";

const api: PersistenceApi = mockPersistence;

export function useSession(): Session {
  return mockSession;
}

export const saveMindset = api.saveMindset;
export const startPlaythrough = api.startPlaythrough;
export const loadPlaythrough = api.loadPlaythrough;
export const savePlaythroughState = api.savePlaythroughState;
export const appendDecisions = api.appendDecisions;
export const saveChapterResult = api.saveChapterResult;
