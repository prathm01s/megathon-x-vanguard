// ESLint for the TypeScript packages (engine, content, scripts).
// The Next.js app has its own config in apps/web/eslint.config.mjs.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/dist/**", "apps/**", "packages/db-types/src/database.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // §11: no `any` without a `// reason:` comment — use eslint-disable-next-line with the reason.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-eval": "error",
      "no-new-func": "error",
    },
  },
);
