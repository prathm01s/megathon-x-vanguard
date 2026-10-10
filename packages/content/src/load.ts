// Node-only: reads `content/**/*.yaml`, validates each file with its Zod schema
// and assembles a typed ContentBundle. Browser code imports the compiled JSON instead.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import type { z } from "zod";
import {
  CHAPTERS_DIR,
  FILE_SCHEMAS,
  FILE_TO_BUNDLE_KEY,
  chapterSchema,
  type Chapter,
  type ContentBundle,
  type ContentFileKey,
} from "./schemas";

/** Repo-root `content/` folder. */
export const DEFAULT_CONTENT_DIR = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../content");

export interface ContentIssue {
  file: string;
  path: string;
  message: string;
}

export type LoadResult =
  | { ok: true; bundle: ContentBundle; files: string[] }
  | { ok: false; issues: ContentIssue[] };

function formatZodIssues(file: string, error: z.ZodError): ContentIssue[] {
  return error.issues.map((issue) => ({
    file,
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}

/**
 * File text with line endings normalised to LF, for the content hash. Without this a Windows
 * checkout (core.autocrlf) and Linux CI / Vercel would compute different `contentVersion`s for
 * identical content.
 */
function normalisedText(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n?/g, "\n");
}

function readYaml(path: string): unknown {
  return parse(readFileSync(path, "utf8"));
}

export function loadContent(contentDir: string = DEFAULT_CONTENT_DIR): LoadResult {
  const issues: ContentIssue[] = [];
  const hash = createHash("sha256");
  const files: string[] = [];
  const parsed: Partial<Record<string, unknown>> = {};

  for (const key of Object.keys(FILE_SCHEMAS) as ContentFileKey[]) {
    const file = join(contentDir, `${key}.yaml`);
    const rel = relative(contentDir, file).replaceAll("\\", "/");
    if (!existsSync(file)) {
      issues.push({ file: rel, path: "(file)", message: "missing content file" });
      continue;
    }
    files.push(rel);
    hash.update(rel).update(normalisedText(file));
    let raw: unknown;
    try {
      raw = readYaml(file);
    } catch (err) {
      issues.push({ file: rel, path: "(yaml)", message: String(err) });
      continue;
    }
    const result = FILE_SCHEMAS[key].safeParse(raw);
    if (result.success) parsed[FILE_TO_BUNDLE_KEY[key]] = result.data;
    else issues.push(...formatZodIssues(rel, result.error));
  }

  const chapters: Chapter[] = [];
  const chaptersDir = join(contentDir, CHAPTERS_DIR);
  const chapterFiles = existsSync(chaptersDir)
    ? readdirSync(chaptersDir).filter((f) => f.endsWith(".yaml")).sort()
    : [];
  if (chapterFiles.length === 0) {
    issues.push({ file: CHAPTERS_DIR, path: "(dir)", message: "no chapter files found" });
  }
  for (const name of chapterFiles) {
    const file = join(chaptersDir, name);
    const rel = `${CHAPTERS_DIR}/${name}`;
    files.push(rel);
    hash.update(rel).update(normalisedText(file));
    let raw: unknown;
    try {
      raw = readYaml(file);
    } catch (err) {
      issues.push({ file: rel, path: "(yaml)", message: String(err) });
      continue;
    }
    const result = chapterSchema.safeParse(raw);
    if (result.success) chapters.push(result.data);
    else issues.push(...formatZodIssues(rel, result.error));
  }

  if (issues.length > 0) return { ok: false, issues };

  chapters.sort((a, b) => a.order - b.order);
  const bundle = {
    ...parsed,
    chapters,
    contentVersion: hash.digest("hex").slice(0, 12),
  } as ContentBundle;
  return { ok: true, bundle, files };
}
