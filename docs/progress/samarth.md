# Samarth — progress

## Done

- **Day zero** (shared setup session, 2026-10-10): engine contract, content schemas + loader +
  build/validate/watch, all content YAML, seeded RNG, condition DSL, metrics, persona scoring,
  Health Score, report rules, simplified turn loop, What-if, fixtures, `pnpm sim`. Pushed to `main`.
- **Session 2** (branch `samarth/engine-modules`; §15.5 items 3–13): engine split into modules,
  month-by-month turns, unit-priced holdings, SIP/RD instalments, job break, business variability,
  cash loss, wallet → fund → forced loan, time-weighted growth, all What-if transforms,
  carry-over, v1 → v2 migration, loans, auctions, bots (§10 targets met and tested), room rules,
  mock room.
- **Session 3** (branch `samarth/room-server`, stacked on `samarth/engine-modules`; §15.5 items
  14–18 + backlog 6–10):
  - Room wire protocol (`RoomRequest` + `applyRoomRequest`) shared by the mock and the server.
  - Per-player `RoomView` (others redacted, sealed bids hidden, seeds never leave the server).
  - Decision outbox for rooms; `chapterResultRecords`.
  - Turn-timer defaults; scammer-friend Ponzi push; windfall tracking; host handover.
  - Rooms migration with RLS; `room-action` Edge Function (handler + SQL repo + Deno entry +
    esbuild bundle).
  - Realtime `useRoom` backend (Supabase), selected by `NEXT_PUBLIC_ROOM_BACKEND`.
  - PGlite test harness (migrations + RLS without Docker); room server end-to-end tests; Deno
    smoke test (`pnpm functions:smoke`), which found and fixed a postgres.js jsonb double-encoding
    bug.
  - `/dev/sim` lab and the full `/dev/content` browser (checked in headless Chromium); `pnpm bench`.
  - 144 tests in the repo (engine 111, supabase 16, web 10, content 7); Playwright smoke passes.

- **Merge session** (2026-10-10, at the user's request): merged all branches into `main`,
  resolved the `join/page.tsx` conflict, reviewed the merged code by running it (the ch2 flow in
  Chromium), fixed 8 integration bugs (see `handoff.md` §9), and wrote `status.md`. 151 tests.

- **Second merge session** (2026-10-11): merged Prathmesh's and Pragya's latest branches; ran the
  app against real Supabase for the first time and fixed what broke (the app never read the root
  `.env.local`; `org_seats_v` counted 1,440 codes instead of 40; the dashboard showed sample
  numbers); `pnpm db:env`; regenerated DB types.
- **Content expansion** (2026-10-11): chapters 1, 3A, 3B and 4 written and balanced with `pnpm sim`
  (balanced passes 87–100%, all-cash fails ch4); 7 new life events; Gyaan Check and discussion
  prompts for every chapter; bots invest a share of income.
- **Friends' Room on the real server:** Create Room makes a real room (`useCreateRoom`); room screen
  turn number and titles fixed; `e2e/demo-supabase.spec.ts` runs the whole §13 script.
- **Localhost + hotspot** (2026-10-11): `pnpm dev:lan`, HTTPS-only API fallbacks, docs corrected,
  `docs/plan-v2.md` (the gamified redesign, split between the three of us).

## In progress

- v2 redesign, my part: see `docs/plan-v2.md` (track S).

## Blocked

- Nothing.
