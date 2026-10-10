// `pnpm functions:smoke` — runs the BUILT room-action bundle under real Deno (the Edge runtime's
// engine) with the real postgres.js adapter, against the migrated test database served over the
// Postgres wire protocol by PGlite. Proves the bundle and the SQL work outside Node/vitest.
//
// Needs: `pnpm functions:build` first. Downloads Deno via npx on first run.
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { createTestDb } from "./harness";

const PORT = 54399;
const here = dirname(fileURLToPath(import.meta.url));
const fnDir = resolve(here, "../functions/room-action");

const t = await createTestDb();
const users: string[] = [];
for (const name of ["smoke_host", "smoke_guest"]) {
  const id = await t.createUser(`${name}@test.invalid`);
  await t.db.query(
    `insert into profiles (user_id, role, username, nickname) values ($1, 'student', $2, $2)`,
    [id, name],
  );
  users.push(id);
}

// One connection: PGlite is a single session, and the room server uses transactions.
const server = new PGLiteSocketServer({ db: t.db, port: PORT, maxConnections: 1 });
await server.start();
console.log(`test database on 127.0.0.1:${PORT}`);

const deno = spawn(
  "npx",
  ["-y", "deno@2.9.6", "run", "--allow-net", "--allow-env", "--config", "deno.json", "smoke.deno.ts"],
  {
    cwd: fnDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, SMOKE_DB_URL: `postgres://postgres@127.0.0.1:${PORT}/postgres`, SMOKE_USERS: users.join(",") },
  },
);
const code: number = await new Promise((done) => deno.on("exit", (c) => done(c ?? 1)));
await server.stop();
await t.close();
console.log(code === 0 ? "✔ Deno smoke test passed" : "✖ Deno smoke test failed");
process.exit(code);
