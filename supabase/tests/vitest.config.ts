import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "supabase",
    include: ["**/*.test.ts"],
    // PGlite boots a full Postgres per test file; give it room.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
