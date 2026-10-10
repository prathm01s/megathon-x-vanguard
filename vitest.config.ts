import { defineConfig } from "vitest/config";

// Runs every package's unit tests from the root: `pnpm test`.
export default defineConfig({
  test: {
    projects: ["packages/*", "apps/web", "supabase/tests"],
  },
});
