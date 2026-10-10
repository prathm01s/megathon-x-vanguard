// `pnpm db:env` — writes the local Supabase URL and keys into .env.local so the app runs
// against the local stack (accounts, dashboard, real Friends' Rooms). Run after `pnpm db:start`.
// Keeps every other line of .env.local; `--mock` switches back to the no-backend mode.
// Owner: Samarth (tooling for running the full stack locally).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
const mock = process.argv.includes("--mock");

function localSupabase(): Record<string, string> {
  const bin = resolve(root, "node_modules/.bin", process.platform === "win32" ? "supabase.cmd" : "supabase");
  // `supabase status` exits non-zero when optional services (imgproxy, pooler) are stopped,
  // so read stdout regardless of the exit code.
  // Quote the path for the Windows shell: the repo may live in a folder with spaces.
  const command = process.platform === "win32" ? `"${bin}"` : bin;
  const run = spawnSync(command, ["status", "-o", "json"], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const raw = run.stdout ?? "";
  const start = raw.indexOf("{");
  if (start < 0) {
    console.error("✖ local Supabase isn't running — start it with `pnpm db:start` (needs Docker)");
    if (run.stderr) console.error(run.stderr.trim());
    process.exit(1);
  }
  const status = JSON.parse(raw.slice(start)) as Record<string, string>;
  const url = status.API_URL;
  const anon = status.ANON_KEY ?? status.PUBLISHABLE_KEY;
  const service = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;
  if (!url || !anon || !service) {
    console.error("✖ unexpected `supabase status` output:", Object.keys(status).join(", "));
    process.exit(1);
  }
  return {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: service,
    NEXT_PUBLIC_ROOM_BACKEND: "supabase",
  };
}

const values = mock
  ? {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      NEXT_PUBLIC_ROOM_BACKEND: "mock",
    }
  : localSupabase();

const source = existsSync(envPath)
  ? readFileSync(envPath, "utf8")
  : readFileSync(resolve(root, ".env.example"), "utf8");
const seen = new Set<string>();
const lines = source.split(/\r?\n/).map((line) => {
  const key = line.match(/^([A-Z0-9_]+)=/)?.[1];
  if (!key || !(key in values)) return line;
  seen.add(key);
  return `${key}=${values[key as keyof typeof values]}`;
});
for (const [key, value] of Object.entries(values)) {
  if (!seen.has(key)) lines.push(`${key}=${value}`);
}
writeFileSync(envPath, lines.join("\n").replace(/\n*$/, "\n"));
console.log(
  mock
    ? "✔ .env.local switched to mock mode (no backend)"
    : `✔ .env.local points at local Supabase (${values.NEXT_PUBLIC_SUPABASE_URL}); restart \`pnpm dev\``,
);
