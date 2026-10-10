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
