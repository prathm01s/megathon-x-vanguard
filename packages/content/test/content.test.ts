import { cpSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkBundle } from "../src/check";
import { DEFAULT_CONTENT_DIR, loadContent } from "../src/load";
import type { ContentBundle } from "../src/schemas";

function bundle(): ContentBundle {
  const r = loadContent();
  if (!r.ok) throw new Error(JSON.stringify(r.issues.slice(0, 5), null, 2));
  return r.bundle;
}

describe("content/", () => {
  it("loads and passes every schema", () => {
    expect(bundle().chapters.length).toBeGreaterThanOrEqual(5);
  });

  it("has no cross-reference errors", () => {
    expect(checkBundle(bundle()).errors).toEqual([]);
  });

  it("keeps expected returns within 0.5 pp of the displayed assumption", () => {
    for (const r of checkBundle(bundle()).expectedReturns) {
      expect(Math.abs(r.deltaPp)).toBeLessThanOrEqual(0.5);
    }
  });

  it("has chapter 2 enabled and complete (hackathon prototype)", () => {
    const ch2 = bundle().chapters.find((c) => c.id === "ch2-first-job");
    expect(ch2?.enabled).toBe(true);
    expect(ch2?.tasks).toHaveLength(5);
  });

  it("detects a broken reference", () => {
    const b = structuredClone(bundle());
    b.chapters[0]!.unlockOptions.push("not-a-real-option");
    expect(checkBundle(b).errors.some((e) => e.includes("not-a-real-option"))).toBe(true);
  });

  it("detects persona rules that leave some scores without a persona", () => {
    const b = structuredClone(bundle());
    b.personas.assignmentRules = b.personas.assignmentRules.slice(0, 1);
    expect(checkBundle(b).errors.some((e) => e.startsWith("persona rules don't cover"))).toBe(true);
  });

  it("never names a real financial brand (guardrail §1)", () => {
    const text = JSON.stringify(bundle()).toLowerCase();
    for (const banned of ["sbi", "hdfc", "icici", "zerodha", "groww", "paytm", "nippon", "axis bank"]) {
      expect(text).not.toContain(banned);
    }
  });

  it("has the same contentVersion with Windows (CRLF) and Unix (LF) line endings", () => {
    const convert = (dir: string, eol: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) convert(p, eol);
        else if (p.endsWith(".yaml")) {
          const lf = readFileSync(p, "utf8").replace(/\r\n?/g, "\n");
          writeFileSync(p, lf.replace(/\n/g, eol));
        }
      }
    };
    const versionWith = (eol: string) => {
      const dir = mkdtempSync(join(tmpdir(), "toss-content-"));
      cpSync(DEFAULT_CONTENT_DIR, dir, { recursive: true });
      convert(dir, eol);
      const r = loadContent(dir);
      if (!r.ok) throw new Error("content invalid");
      return r.bundle.contentVersion;
    };
    expect(versionWith("\r\n")).toBe(versionWith("\n"));
  });
});
