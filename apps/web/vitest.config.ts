import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineProject } from "vitest/config";

export default defineProject({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    name: "web",
    environment: "jsdom",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "e2e", ".next"],
  },
});
