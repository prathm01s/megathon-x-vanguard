# Samarth — progress

## Done

- **Day zero** (shared setup session, 2026-10-10): engine contract, content schemas + loader +
  build/validate/watch, all content YAML, seeded RNG, condition DSL, metrics, persona scoring,
  Health Score, report rules, simplified turn loop, What-if, fixtures, `pnpm sim`. Pushed to `main`.
- **Session 2** (2026-10-10, branch `samarth/engine-modules`; §15.5 items 3–13):
  - Engine split into modules; turns simulated month by month; unit-priced holdings; SIP and RD
    monthly instalments (rupee-cost averaging); job break, business variability, cash loss;
    wallet → fund → forced-loan payments with debt interest.
  - Time-weighted real growth; all five What-if transforms, with no-op What-ifs skipped.
  - Persona streaks and goal blocks carried across chapters; v1 → v2 save migration.
  - Loans, auctions and pool bids as pure functions.
  - Bot strategies; `pnpm sim` meets every §10 target (tested).
  - Friends' Room rules (`room.ts`) and the in-memory mock room + `useRoom` hook in
    `apps/web/lib/room`.
  - Debt-fund guardrail fix; yearly bank rates; loan default rule.
  - 109 tests in the repo (95 engine).

## In progress

- (nothing; waiting for review of PR `samarth/engine-modules`)

## Blocked

- Room migrations / Edge Functions need local Supabase (Docker) and Prathmesh's first migration
  to be applied.

Next up: `docs/requests/samarth.md` items 6–11 (room server first).
