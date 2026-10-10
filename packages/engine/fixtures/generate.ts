// Regenerates the JSON fixtures from the real engine: `pnpm --filter @toss/engine fixtures`.
// Fixtures let UI and persistence work be built and tested without running a game.
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent } from "@toss/content/load";
import { scriptedCh2Game, sampleRoom } from "./scenario";

const here = dirname(fileURLToPath(import.meta.url));
const loaded = loadContent();
if (!loaded.ok) throw new Error("content invalid — run pnpm content:validate");
const { states, result } = scriptedCh2Game(loaded.bundle);

const write = (name: string, data: unknown) =>
  writeFileSync(resolve(here, name), JSON.stringify(data, null, 2) + "\n");
write("ch2-turn0.json", states[0]);
write("ch2-turn2.json", states[2]);
write("ch2-turn5.json", states[5]);
write("ch2-chapter-result.json", result);
write("room-state.json", sampleRoom(loaded.bundle, states[2]!));
console.log("✔ fixtures written");
