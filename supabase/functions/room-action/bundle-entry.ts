// Entry for the Edge Function bundle (`pnpm functions:build` → _bundle/handler.js).
// Adapts a postgres.js `sql` to the handler's tiny transaction interface. Kept free of any
// Deno or Node API so the same bundle also runs under Node in tests.
import { handleRoomCall, type RoomResponse } from "./handler.ts";
import type { SqlDatabase } from "./sql-repo.ts";

/** The subset of postgres.js the room server needs. */
export interface PostgresJs {
  begin<T>(fn: (tx: { unsafe(text: string, params?: unknown[]): Promise<unknown[]> }) => Promise<T>): Promise<T>;
}

export function postgresJsDatabase(sql: PostgresJs): SqlDatabase {
  return {
    transaction: (fn) =>
      sql.begin((tx) =>
        fn({ query: async (text, params) => (await tx.unsafe(text, params ?? [])) as never }),
      ),
  };
}

export function createRoomActionHandler(sql: PostgresJs) {
  const db = postgresJsDatabase(sql);
  return (userId: string | null, body: unknown): Promise<RoomResponse> =>
    handleRoomCall({ db }, userId, body);
}

export { handleRoomCall };
