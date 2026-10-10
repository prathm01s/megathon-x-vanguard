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

## In progress

- Nothing. Waiting for review of PRs `samarth/engine-modules` → `main`, then
  `samarth/room-server`.

## Blocked

- Deploying the room server needs the Supabase Cloud project (Prathmesh, §15.6 item 13).

Next up: `docs/requests/samarth.md` items 11–13.
