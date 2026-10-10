# Requests for Prathmesh (platform, accounts, NGO dashboard)

Add new requests at the bottom: what you need, why, and the interface you propose.

## From day-zero setup (2026-10-10)

1. **Migration not yet applied anywhere.** `supabase/migrations/20261010000000_accounts.sql` was
   written without a running database (Docker Desktop was off). Run `pnpm db:start && pnpm db:reset`,
   fix anything that fails, then `pnpm db:types` to replace the placeholder in `packages/db-types`.
2. **Persistence API differs slightly from §15.4 D.** `startPlaythrough(personaId, seed, initialState)`
   takes the engine's initial state (the row needs `state jsonb`), and `savePlaythroughState(id, state)`
   was added for per-turn snapshots. Both are in `apps/web/lib/data/types.ts`. Confirm or change them
   in a `contract` PR.
3. **Decision types for your stats views** are `DECISION_TYPES` in `packages/engine/src/types.ts`.
   `toDecisionLog()` in `api.ts` maps engine actions and events onto them.
4. **Profile column protection** uses a trigger (`protect_profile_columns`) that lets the service role
   and SECURITY DEFINER RPCs through by checking `current_user`. Review it when you write the
   `redeem-code` Edge Function.
5. **Supabase session refresh in `proxy.ts`.** `apps/web/proxy.ts` currently only runs the next-intl
   locale middleware. Chain the Supabase SSR session refresh into it.
6. **Activate CI.** The workflow is at `docs/pending/ci.yml` because the first push couldn't
   create `.github/workflows/` (the credential had no `workflow` scope). Move it back with
   `git mv docs/pending/ci.yml .github/workflows/ci.yml` from a credential that has the scope.
   Then turn on branch protection for `main` (require PR + passing CI).

## From Samarth's engine session (2026-10-10)

7. **Load saved games through `migrateState`.** `GameState` is now schema v2. When you read
   `playthroughs.state`, call `migrateState(raw, content)` from `@toss/engine` before using it. It
   upgrades older saves, and it throws `EngineError("save_too_new")` if the save came from a newer
   app.
8. **Chapter-to-chapter carry-over.** `ChapterResult.carryOver` (blocked goals, salary bonus,
   persona-shift streaks) must be saved with the chapter result and passed to
   `createPlaythrough({ …, carryOver })` for the next chapter. The `chapter_results.report jsonb`
   column could hold it, or add a column.
9. **New decision mapping:** forced bank borrowing (bad toss + no safety net) is logged as
   `loan_taken` with `payload.forced = true`. Room loans and auctions don't emit records yet (my
   backlog item 7).
10. **Demo seed:** `scripts/seed.ts` can call `playChapter(strategy, { content, personaId, seed,
chapterId })` with `SIM_STRATEGIES` from `@toss/engine` to generate varied, realistic
    playthroughs. It returns the final `GameState` and the `ChapterResult`.
11. **Where a new player starts:** use `startChapterFor(personaId, content)`, not
    `persona.startChapter`. ch1 is still disabled, so everyone starts in ch2.

## From Samarth's room-server session (2026-10-10)

12. **Please review small edits I made to root config** (your area), all needed to run and check
    the room server:
    - `package.json`: devDeps `@electric-sql/pglite`, `@electric-sql/pglite-socket`, `esbuild`;
      scripts `functions:build|serve|deploy|smoke`, `bench`; `typecheck`/`lint` now include
      `supabase/tests` and the Edge Function.
    - `vitest.config.ts`: new `supabase/tests` project.
    - `eslint.config.mjs`: ignore `supabase/functions/*/_bundle/`; `Deno` global for functions.
    - `.gitignore`: `supabase/functions/*/_bundle/`.
    - `supabase/config.toml`: `[functions.room-action]` block.
13. **CI** (when you activate it): add `pnpm functions:build` before `pnpm test`. Optionally add
    `pnpm functions:smoke` (downloads Deno via npx).
14. **You can test your migrations and RLS without Docker:** `supabase/tests/harness.ts` runs
    every migration on PGlite with Supabase's `auth.uid()`, roles and `extensions` schema
    emulated. Use `createTestDb()` and `asUser(userId, tx => …)` / `asService` / `asAnon`.
    `accounts-smoke.test.ts` already checks your migration: it applies cleanly, and the NGO-signup
    RPC, the column-protection trigger and student profile isolation all work.
15. **Room tables for your stats views:** `rooms` (with `org_id` = the host's NGO), `room_members`
    (`playthrough_id` per human), `loans` (`lender_kind` member/bank/loan_app, status), `auctions`,
    `bids`, `bid_pools`, `bid_pool_members`. NGO admins can already read their class's rows via
    RLS. Room games also create a normal `playthroughs` row per human, plus `decisions`,
    `chapter_results` and `badges_earned`, so your existing stats include multiplayer games
    automatically. Room playthroughs have `seed = 'room:<code>'`.
16. **Decision types now emitted:** besides the single-player ones, rooms emit
    `loan_requested`, `loan_offered`, `loan_taken`, `loan_repaid`, `loan_late`, `loan_defaulted`,
    `auction_bid`, `auction_won`, `pool_joined`. Use `chapterResultRecords(result, turn)` from
    `@toss/engine` for `chapter_end` and `persona_shift` in single-player saves.
    `toDecisionLog` no longer returns a `chapter_end` for the `chapter_complete` event.

## From the merge review (2026-10-10, Samarth, at the user's request)

Your branch is merged into `main`. While reviewing the merged code I fixed what blocked the app or
the demo, and list the rest here for you to decide. Fixed in your paths (please review the
commits):

- **`proxy.ts`:** every page returned 500 without Supabase env. The session refresh now runs only
  when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.
- **`lib/data/supabase.ts`:** `flushDecisionQueue` threw outside the try/catch, which was an
  unhandled rejection on every turn without Supabase. It's now guarded.
- **`join/page.tsx`:** merge conflict with Pragya. I kept your page; signup now goes to `/mindset`
  (§4.2), and redirects use `@/i18n/navigation` so the locale is kept.
- **`scripts/seed.ts` → `supabase/seed.sql`:**
  - it failed on `db reset` (no `auth.users` rows);
  - the mindset answer ids didn't exist, so every score was 0;
  - there was no post-check, and it used `Math.random` / `Date.now`.

  Rewritten, keeping your design, with demo logins (password `TossLifeDemo-2026`, admin
  `facilitator@demo.tosslife.invalid`). It's covered by `supabase/tests/seed.test.ts`, which also
  checks that every stats view is scoped to the admin's org. Your views were already correct.

Open for you — all resolved in session 2 & 3:

17. ~~**Atomic code redemption.**~~ **Done:** Added migration `20261010020000_atomic_code_redeem.sql`
    with `code_redemption_attempts` table, `redeem_student_code_claim` RPC (5 attempts/min rate limit
    per IP and single-use atomic update), rollback compensation `redeem_student_code_revert`, and
    `redeem_student_code_finalize`. Tested in `supabase/tests/redeem-atomic.test.ts`.
18. ~~**Personal learners with an email can't log in by username.**~~ **Done:** `loginUser` resolves
    username to real email via `profiles` lookup and admin auth API.
19. ~~**`loginUser` sends students to `/play`. A student without a game should go to `/mindset`.**~~
    **Done:** `loginUser` queries playthroughs/mindset records and routes new students to `/mindset`.
20. ~~**The unused `supabase/functions/redeem-code` uses `deno.land/std@0.177`.**~~ **Done:** Modernized
    with `deno.json` + `@supabase/supabase-js` calling `redeem_student_code_claim`.
21. ~~**`pnpm db:types` once Docker runs.**~~ **Done:** Added all room tables, missing views, and RPC
    signatures to `packages/db-types/src/database.ts`.
22. ~~**Your progress note mentions IndexedDB.**~~ **Done:** Upgraded decision logging in
    `apps/web/lib/data/supabase.ts` to real IndexedDB (`toss-life:persistence` / `offline_queue`) with
    localStorage fallback.

## v2 redesign (2026-10-11)

Your track is in [`docs/plan-v2.md`](../plan-v2.md) (track P). Start with your contract in §2 so the
others can build against it.
