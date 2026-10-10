// CLI: `pnpm content:build` — compiles content/**/*.yaml into
// packages/content/dist/content.json and emits JSON Schemas for editor autocompletion.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { checkBundle } from "./check";
import { loadContent } from "./load";
import { FILE_SCHEMAS, chapterSchema } from "./schemas";

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");

export function writeJsonSchemas(): void {
  const dir = resolve(DIST, "schemas");
  mkdirSync(dir, { recursive: true });
  const all = { ...FILE_SCHEMAS, chapter: chapterSchema };
  for (const [key, schema] of Object.entries(all)) {
    const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" });
    writeFileSync(resolve(dir, `${key.replace("/", "-")}.schema.json`), JSON.stringify(json, null, 2));
  }
}

export function runBuild(): boolean {
  const result = loadContent();
  if (!result.ok) {
    console.error("✖ content has schema problems — run `pnpm content:validate` for details");
    for (const i of result.issues.slice(0, 20)) console.error(`  ${i.file} → ${i.path}: ${i.message}`);
    return false;
  }
  const { errors } = checkBundle(result.bundle);
  if (errors.length) {
    console.error(`✖ ${errors.length} cross-reference error(s) — run \`pnpm content:validate\``);
    return false;
  }
  mkdirSync(DIST, { recursive: true });
  writeFileSync(resolve(DIST, "content.json"), JSON.stringify(result.bundle));
  writeJsonSchemas();
  console.log(`✔ built content ${result.bundle.contentVersion} → packages/content/dist/content.json`);
  return true;
}

if (process.argv[1]?.endsWith("build.ts")) {
  process.exit(runBuild() ? 0 : 1);
}
