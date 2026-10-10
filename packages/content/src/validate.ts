// CLI: `pnpm content:validate` — schema, cross-reference, expected-return,
// weight, persona-coverage, placeholder and locale-coverage checks.
// Exits 1 on errors; warnings (e.g. missing translations) never fail.
import { checkBundle } from "./check";
import { loadContent } from "./load";
import { LOCALES } from "./schemas";

export function runValidate(): boolean {
  const result = loadContent();
  if (!result.ok) {
    console.error(`✖ ${result.issues.length} schema problem(s):`);
    for (const i of result.issues) console.error(`  ${i.file} → ${i.path}: ${i.message}`);
    return false;
  }
  const report = checkBundle(result.bundle);

  console.log(`Content ${result.bundle.contentVersion} — ${result.files.length} files\n`);
  console.log("Expected yearly return vs. displayed assumption:");
  for (const r of report.expectedReturns) {
    const flag = Math.abs(r.deltaPp) > 0.5 ? "  ⚠" : "";
    console.log(
      `  ${r.optionId.padEnd(14)} expected ${(r.expected * 100).toFixed(2).padStart(6)}%  ` +
        `shown ${(r.assumed * 100).toFixed(2).padStart(6)}%  Δ ${r.deltaPp.toFixed(2)} pp${flag}`,
    );
  }
  console.log("\nTranslation coverage:");
  for (const locale of LOCALES) {
    const c = report.localeCoverage[locale];
    const pct = c.total ? Math.round((c.translated / c.total) * 100) : 0;
    console.log(`  ${locale}: ${c.translated}/${c.total} (${pct}%)`);
  }
  if (report.warnings.length) {
    console.log(`\n⚠ ${report.warnings.length} warning(s):`);
    for (const w of report.warnings) console.log(`  ${w}`);
  }
  if (report.errors.length) {
    console.error(`\n✖ ${report.errors.length} error(s):`);
    for (const e of report.errors) console.error(`  ${e}`);
    return false;
  }
  console.log("\n✔ content is valid");
  return true;
}

if (process.argv[1]?.endsWith("validate.ts")) {
  process.exit(runValidate() ? 0 : 1);
}
