# Handoff — Toss Life

_Last updated: 2026-10-10 (after Samarth's room-server session)._

This file records what has been built so far, how to run it, which decisions were made and what
comes next. **Read [`CLAUDE.md`](./CLAUDE.md) first.** It is the spec, and it wins over this
file. The original pitch is `Toss Life.pdf`.

**Log of sessions**

1. **Day zero** (shared setup, on `main`): monorepo, content system, engine contract, web skeleton,
   first migration. The user asked to ignore the per-person ownership split for this first setup
   only.
2. **Samarth — engine modules + mock room** (branch `samarth/engine-modules`, PR into `main`):
   CLAUDE.md §15.5 items 3–13. Details in §3.4 and §3.5 below.
3. **Samarth — room server** (branch `samarth/room-server`, **stacked on**
   `samarth/engine-modules`: merge that one first, then open this PR into `main`): §15.5 items
   14–18. Covers the rooms migration + RLS, the `room-action` Edge Function, the realtime `useRoom`
   backend, the PGlite test harness, the `/dev/sim` lab, the `/dev/content` browser and the engine
   benchmark. Details in §3.4–§3.6.

From now on, each person works only in their own paths (§15.3).

---

## 1. Status at a glance

| Check                                          | Result                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm install`                                 | ✅ pnpm 12, 5 workspace projects                                      |
| `pnpm content:validate`                        | ✅ 21 files valid, **no warnings** (the debt-fund guardrail issue is fixed) |
| `pnpm content:build`                           | ✅ writes `packages/content/dist/content.json` + 17 JSON Schemas      |
| `pnpm lint`                                    | ✅ no errors, no warnings                                             |
| `pnpm typecheck`                               | ✅ all packages + scripts                                             |
| `pnpm test`                                    | ✅ **144 tests** in 22 files (engine 111, DB/room server 16, web 10, content 7) |
| `pnpm build`                                   | ✅ Next.js production build, every locale prerendered                 |
| `pnpm dev` → `/`, `/en`, `/ur`, `/te/play`, …  | ✅ all return 200; `/ur` has `dir="rtl"` (checked on day zero)        |
| `pnpm sim --runs 300`                          | ✅ meets the §10 balance targets (see §7.1 for the table)             |
| `pnpm bench`                                   | ✅ a ch2 turn ≈ 0.09 ms on a laptop, ≈ 0.4 ms estimated on a mid-range phone (budget 50 ms) |
| Migrations + RLS                               | ✅ both migrations apply and their RLS is tested on **PGlite (Postgres 18)** in `pnpm test`. ⚠️ Not yet run on a real Supabase stack (Docker was off) |
| Room server (`room-action` Edge Function)      | ✅ end-to-end tests on PGlite; ✅ `pnpm functions:smoke` runs the built bundle under **Deno 2.9** + postgres.js over the Postgres wire. ⚠️ Not deployed (no Supabase Cloud project yet) |
| `pnpm test:e2e` (Playwright)                   | ✅ 2 smoke tests pass (Chromium, Pixel 5 viewport)                    |
| `/dev/sim`, `/dev/content`                     | ✅ checked in headless Chromium: simulation runs, inspector updates, no console errors |
| Git                                            | ✅ `main` = day zero. `samarth/engine-modules` (3 commits) and `samarth/room-server` (4 more, stacked) pushed, waiting for review |
| CI on GitHub                                   | ⚠️ **not active yet**: the workflow is parked in `docs/pending/ci.yml` (see §8.3) |

---

## 2. Get the code and run it

The repo is `https://github.com/IIIT-ECell/megathon26-prajis` (CLAUDE.md §3.1 suggested a new
`toss-life` repo, but the team's existing hackathon repo is used instead). `main` holds the day-zero
skeleton, a single commit pushed directly because the repo was empty. **From now on, never commit
to `main`.** Work on `<name>/<short-task>` branches and open small PRs (§15.1).

```bash
git clone https://github.com/IIIT-ECell/megathon26-prajis.git
cd megathon26-prajis
git checkout -b prathmesh/rls-codes   # or pragya/turn-screen, samarth/engine-market …
pnpm install                 # needs Node 22+ and pnpm 12 (npm i -g pnpm)
cp .env.example .env.local   # set TOSS_DEV=samarth|prathmesh|pragya; Supabase keys later
pnpm content:build
pnpm dev                     # http://localhost:3000 → /en
```

Useful URLs: `/en` welcome · `/en/play` turn-screen placeholder (renders a real engine fixture) ·
`/en/dev/content` content summary (dev only) · `/ur` to check RTL.

Before every commit: `pnpm content:validate && pnpm lint && pnpm typecheck && pnpm test`.

---

## 3. What exists (by area)

### 3.1 Repo and tooling (Prathmesh's area)

- **pnpm workspaces** monorepo: `apps/web`, `packages/{engine,content,db-types}` (`pnpm-workspace.yaml`).
- Root `package.json` with every script from §3.3 (`dev`, `build`, `content:*`, `test`, `test:e2e`,
  `lint`, `typecheck`, `format`, `sim`, `seed`, `db:*`). It is `"type": "module"`.
- `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`), root `eslint.config.mjs` (typescript-eslint;
  bans `eval` / `new Function`), `.prettierrc`, `.editorconfig`, `.nvmrc` (24), `.gitattributes`,
  `.gitignore`, `.env.example` (exactly §3.4).
- Root `vitest.config.ts` runs the `engine`, `content` and `web` projects together.
- CI workflow (install → `content:validate` → `content:build` → lint → typecheck → test; a
  Playwright job runs only on PRs into `main`) is written but **parked at `docs/pending/ci.yml`**.
  See §8.3: someone whose GitHub credential has the `workflow` scope must move it to
  `.github/workflows/ci.yml`.
- `README.md` (setup, layout, scripts, conventions).
- `docs/requests/<owner>.md` (open asks per person) and `docs/progress/<name>.md`.

### 3.2 Content system (`packages/content`, Samarth)

- **Zod schemas** for every content type in §8, under `src/schemas/`:
  `common` (LocalizedString with an optional `audio` field, ids, rupees, pillars), `conditions`
  (the condition DSL + `METRIC_IDS`), `config`, `onboarding`, `investments`, `chapters`, `events`,
  `report`, `multiplayer`, and `bundle` (the `ContentBundle` type and the file → schema map).
- `src/load.ts`: reads `content/**/*.yaml`, validates it, and builds the bundle with
  `contentVersion` (a 12-character sha256 of all files).
- `src/check.ts`: cross-file checks. These cover unique ids, every cross-reference, market
  probabilities summing to 1, **expected return vs. displayed assumption (max 0.5 pp)**, a warning
  for market options that can never lose money, Health Score weights summing to 100, **persona rules
  covering every (plan, risk, know) combination**, `traitMax` consistency, unknown placeholders,
  placeholder parity across locales, and locale coverage.
- CLIs: `validate.ts`, `build.ts` (also writes JSON Schemas to `dist/schemas/`; every YAML file has
  a `# yaml-language-server: $schema=…` line) and `watch.ts`.
- Package exports: `@toss/content` (browser-safe schemas, types and helpers), `@toss/content/load`
  (Node only) and `@toss/content/bundle` (the compiled JSON).
- _Session 2:_ `config/multiplayer.yaml` loans gained `defaultAfterTurnsLate`, and
  `bankRateByTrust[].ratePerTurn` became **`ratePerYear`** (decision 17).

### 3.3 Game content (`content/`, Pragya writes text, Samarth owns numbers)

All files from §3.2 exist with the §8 data in English only:

- `config/`: economy, market, health-score, multiplayer, locales.
- `onboarding/`: the 6 mindset questions with points and post-game `insight` text; 4 personas,
  assignment rules (§8.3, exact) and shift rules.
- `chapters/`: **`ch2-first-job` is complete** (the prototype). `ch1`, `ch3a`, `ch3b` and `ch4` are
  outlines with `enabled: false`.
- `investments/`: 9 options with fictional names and returns as in §8.6, **except the debt fund**
  (decision 15); 7 techniques.
- `events/`: 8 life events; 8 scams (the 7 from §8.9 plus `job-fee-offer-repeat`, the repeat
  variant that ch2 asks for).
- `multiplayer/auctions.yaml` (used bike, property pool, shop space), `report/` (Life Report rules
  and What-if candidates, 3 ch2 Gyaan questions, 6 badges), `ngo/discussion-prompts.yaml` (3 for ch2).
- `content/README.md`: an editing guide written for non-developers.

### 3.4 Engine (`packages/engine`, Samarth)

**Contract (§15.4 A, C)**: `src/types.ts` defines `GameState` (**schema v2**), `Action`,
`ActionOption`, `TossResult`, `GameEvent`, `ChapterResult` (now with `carryOver`), `LifeReport`,
`WhatIfResult`, `DecisionRecord` with `DECISION_TYPES`, and the room types. All money is
**integer paise**.

**Public API** (`src/api.ts` is a thin facade; `src/index.ts` exports everything):
`scoreMindset`, `createPlaythrough`, `getAvailableActions`, `applyAction`, `advanceTurn`,
`endChapter`, `replayWithChange`, `toDecisionLog`, plus `migrateState`, `startChapterFor`,
`chooseWhatIf`, `replay`, `tossFor`, the loan / auction / bot / room functions below.

**Modules** (one job each, as listed in CLAUDE.md §3.2):

| File | Does |
| --- | --- |
| `playthrough.ts` | `createPlaythrough`; takes the previous chapter's `carryOver` |
| `actions.ts` | decide phase: `getAvailableActions`, `applyAction` |
| `turn.ts` | **the toss, simulated month by month** (12 steps in a year-long turn): NAVs move, prices rise, income arrives, expenses are paid, a life event hits in its drawn month, debt accrues and is repaid, SIP/RD instalments buy units; then cash loss, scam offer, salary growth, task due dates |
| `market.ts` | shared market toss + independent tosses; yearly return per option; monthly NAV factor |
| `portfolio.ts` | unit-priced holdings (a unit starts at ₹10), buy/sell, penalties, drawing on the emergency fund |
| `economy.ts` | inflation per month, monthly expenses, income with modifiers and business variability, cash-at-home loss |
| `cashflow.ts` | **one rule for every unavoidable payment: wallet → emergency fund → forced bank loan** |
| `tasks.ts` | task list, payments (safety tasks move money into savings), inflation, due dates, fines, `blockNextChapterGoal` / `blockGoal:<id>` / `salaryBonus` |
| `events.ts` | life events (cooldowns, weights, persona multipliers, drawn month) and scams (`after_bad_toss`, repeat variants, responses) |
| `loans.ts` | interest (simple/compound), repay, late → default, Trust Score, bank rate by trust, forced-borrowing debt |
| `auction.ts` | sealed bids, pool bids, exact pro-rata splits (largest remainder), income from won items |
| `bots.ts` | strategies `cautious`, `balanced`, `impulsive`, `scammer-friend` + balancing-only `all-cash`, `all-equity-no-fund`; `playChapter`; room behaviour (loan offers, bids). Bots pick options **by kind, never by content id** |
| `room.ts` | **Friends' Room rules** (see §3.5) |
| `chapter.ts` | `endChapter`: score, report, What-if, badges, persona shift with streaks carried across chapters |
| `whatif.ts` | same-seed replay; all 5 transforms (`ignoreScams`, `startSip`, `moveShare`, `emergencyFundFirst`, `holdThroughCrash`); `chooseWhatIf` skips changes that don't help |
| `migrate.ts` | upgrades v1 saves to v2 (§8.1: never crash on an older save) |
| `metrics.ts`, `score.ts`, `report.ts`, `persona.ts`, `conditions.ts`, `rng.ts`, `money.ts`, `decisions.ts`, `helpers.ts`, `errors.ts` | as on day zero, plus the new growth formula (decision 18) |

- **Fixtures** (`fixtures/`, regenerate with `pnpm --filter @toss/engine fixtures`): ch2 at turns
  0/2/5 and its `ChapterResult` from a scripted game, plus **`room-state.json`, now built with the
  real room rules** (room `TOSS42` at turn 3: the bike auction is open, there's one active friend
  loan and one open request with bank / loan-app / bot offers).
- **Tests (95)**: everything from day zero plus SIP rupee-cost averaging (more units in a crash,
  fewer in a boom), recurring deposits, job break, wallet → fund → loan order, debt interest and
  repayment, cash-loss odds, every life-event effect, scam triggers (`after_bad_toss`, repeats,
  persona multiplier), loans (interest, on-time/late/default, trust, limits, bank rates), auctions
  and pools (exact splits), all What-if transforms, migration, room rules (lobby, bots, lockstep,
  shared market / separate lives, loans, pool auction, multiplayer scoring), and **§10 balance
  checks** that fail if content tuning breaks the targets.

_Session 3 additions:_

| File | Does |
| --- | --- |
| `room-protocol.ts` | **The room wire protocol.** `RoomRequest` (a Zod-validated union: join, leave, start, act, submit_turn, tick, request_loan, offer_loan, accept_loan, repay_loan, place_bid, join_pool, react) and `applyRoomRequest`, the one dispatcher both the mock room and the Edge Function call |
| `room.ts` | Additions: `viewRoomFor(room, userId)`, a per-player `RoomView` (your full state; others `PublicMember` only; sealed bids hidden until close; **seeds redacted**); a decision **outbox** (`RoomState.outbox`, drained by `drainOutbox`); the turn-timer default (unanswered scam cards → "ignore"); the `scammer-friend` Ponzi push (`PendingScam.fromMemberId`); host handover |
| `decisions.ts` | `chapterResultRecords(result, turn)` → `chapter_end` (with the score) + `persona_shift` |
| `actions.ts` / `events.ts` / `turn.ts` | windfall tracking: `windfallSavedPct` = windfall moved into savings/investments in the decide phase right after it arrived |

- New tests (16): decision outbox, per-player views and sealed bids, timer defaults, scammer
  friend, windfall, chapter records, and **`fixtures.test.ts`**, which fails if the JSON fixtures
  drift from the engine (regenerate with `pnpm --filter @toss/engine fixtures`).
- New fixture: `sampleRoomView`, which is room `TOSS42` as the mock user sees it.

### 3.5 Web app (`apps/web`, shared; see §15.3 for who owns which folder)

- **Next.js 16.4** (App Router, `cacheComponents`, Turbopack), React 19.3, Tailwind 4, next-intl 4.
  Next 16 renamed `middleware.ts` to **`proxy.ts`**, which does the locale routing.
- i18n: `i18n/routing.ts` (en, te, hi, ur; Urdu is RTL), `i18n/request.ts` (missing keys fall back
  to English), `i18n/navigation.ts` (always use this `Link`, never `next/link`).
  Strings live in `messages/{en,te,hi,ur}.json`; only `en` is filled in.
- Routes: `app/[locale]/(public)/page.tsx` (welcome, real), `(public)/join`, `(ngo)/admin`,
  `(student)/play` and `dev/content` (placeholders).
- Design system (Pragya): tokens in `app/globals.css` (warm cream, saffron, teal, plus
  `gain`/`loss`/`coin`, dark mode, reduced-motion handling), Nunito plus Noto Telugu, Devanagari and
  Naskh Arabic fonts, `components/ui/{button,card,app-shell,language-switcher,placeholder-screen}.tsx`,
  `components/game/money.tsx` (`MoneyPair` shows Amount + Real Value; `AssumedReturn` shows a
  return with the "assumed" chip). `components.json` is set up for `shadcn add`.
- `lib/format.ts`: `₹1,00,000` Indian formatting from paise. `lib/content.ts`: the typed bundle.
- **Persistence API (§15.4 D)**: `lib/data/` with types and a **localStorage mock**.
- **Room API (§15.4 E) — mock and realtime backends (Samarth):**
  - `lib/room/index.ts` exposes **`useRoom(code)`** (built on `useSyncExternalStore`) and
    `createRoom(chapterId)`. `useRoom` returns **your `RoomView`**: `me` with your full state,
    `members` as `PublicMember`s, `isHost`, `pendingLoans`, `myDebts`, `auction`, and `actions`.
    The actions are the contract's (`join`, `leave`, `ready`, `submitTurn`, `requestLoan`,
    `offerLoan`, `acceptLoan`, `repayLoan`, `placeBid`, `createPool`, `joinPool`) plus `act(action)`,
    `react(emoteId)`, `tick()` and `join(personaId)`. They reject with a `RoomError`, whose `code`
    is stable.
  - `lib/room/backend.ts` is the seam. `NEXT_PUBLIC_ROOM_BACKEND` picks the implementation:
    - `mock-backend.ts` (the default) runs `applyRoomRequest` in memory with bots, and room
      **`TOSS42`** is preloaded for the mock user;
    - `supabase-backend.ts` calls the `room-action` Edge Function and follows the player's own
      `room_views` row with Supabase Realtime.
- **Dev tools (Samarth):** `/[locale]/dev/content` is the full content browser (validation,
  expected returns, translation coverage, every item in the page locale with "en fallback" flags,
  live with `pnpm dev`). `/[locale]/dev/sim` is the balancing lab (bots, histograms, a game
  inspector, turn timing). Both are dev-only (404 in production).
- Supabase clients: `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server plus a
  service-role `createAdminClient`, both `server-only`).
- Tests: Vitest with jsdom (`lib/format.test.ts`, `lib/room/backends.test.ts`) and Playwright
  (`e2e/smoke.spec.ts`, Pixel 5 viewport).

### 3.6 Database (`supabase/`, Prathmesh; room tables and the room server: Samarth)

- `supabase init` done (`project_id = "toss-life"`).
- `migrations/20261010000000_accounts.sql` covers **all non-room tables in §5**: organizations
  (unique `admin_user_id`), profiles (Player ID default `TL-XXXXX` from an unambiguous alphabet),
  groups, group_members, student_codes (hash + last 4 only), org_join_requests, mindset_responses,
  playthroughs, chapter_results, decisions (append-only), gyaan_answers and badges_earned.
  **RLS is on for every table**: students see their own rows, admins see their org's rows.
  It also adds a trigger that stops clients changing role, org, username or Player ID, and two
  RPCs: `create_organization` (NGO signup) and `respond_to_join_request`.
- `packages/db-types` holds a **placeholder** `Database` type until `pnpm db:types` runs.
- **`migrations/20261010010000_rooms_init.sql` (Samarth):** rooms, room_members, room_views,
  loans, auctions, bid_pools, bid_pool_members and bids.
  - `rooms.state` (the full `RoomState`, the source of truth) and `rooms.seed` are **never readable
    by clients**, enforced with column grants.
  - Each player reads only their own `room_views` row, which is in the Realtime publication.
  - Sealed bids are readable by their owner until the auction closes.
  - The NGO admin reads their class's rooms (`rooms.org_id` = the host's NGO).
  - There are no client write policies: the Edge Function (service role) is the only writer.
- **`functions/room-action/` (Samarth):**
  - `handler.ts`: one transaction per call: lock the room row, auto-resolve the turn if its timer
    ran out, validate, apply, then write the state, projections, every player's view, the
    decisions, and at the end the `chapter_results` and `badges_earned`.
  - `sql-repo.ts` holds the SQL. A room start creates a `playthroughs` row per human
    (`seed = 'room:<code>'`, seeds redacted).
  - `index.ts` is the Deno entry: `@supabase/server`'s `withSupabase({ auth: "user" })` + postgres.js.
  - `build.ts` bundles the handler + engine + content into `_bundle/handler.js` (gitignored).
    **Run `pnpm functions:build` before `supabase functions serve/deploy`.**
- **`tests/` (Samarth):** `harness.ts` runs every migration on **PGlite** with Supabase's
  `auth.uid()`, roles, `extensions` schema and Realtime publication emulated (`asUser` / `asService` /
  `asAnon`), so migrations and RLS are tested in `pnpm test` without Docker. Test files:
  `migrations.test.ts`, `accounts-smoke.test.ts` (Prathmesh's migration: it applies, and the signup
  RPC, column trigger and profile isolation work), `room-server.test.ts` (end to end through RLS),
  and `deno-smoke.ts` (`pnpm functions:smoke`).

---

## 4. Decisions made (each one is also a `DECISION:` comment in the code)

1. **TypeScript 6.0.x, not 7.0.** TS 7 is the latest release, but `typescript-eslint` only supports
   TS < 6.1.
2. **ESLint 9 for now.** `eslint-config-next` works with it; move to ESLint 10 when the plugins do.
3. **Package versions are a few days old on purpose.** pnpm 12's supply-chain policy rejects
   anything published in about the last day, so `motion`, `lucide-react`, `prettier` and
   `@types/node` resolve one release back.
4. **Money in YAML is rupees; the engine uses paise.** Rates are decimals.
5. **The metric id list lives in the content schema** (`conditions.ts`) so validation can reject
   unknown metrics without importing the engine. The engine's registry is typed against that list.
   The condition evaluator lives in `@toss/content` and the engine re-exports it.
6. **RNG is derived per (seed, stream, turn)**, not carried in state. State stays plain JSON and
   any turn can be re-tossed.
7. **A safety task (emergency fund) moves money into savings instead of spending it**
   (`economy.emergencyFundOptionId`).
8. **Diversification count** = distinct holdings worth at least 5% of total wealth; wallet cash is
   excluded.
9. **`blockNextChapterGoal`** consequence: ch2 branches into ch3a or ch3b, so the sister-fees miss
   blocks "the first optional goal of whichever chapter comes next".
10. **Option lock length is in months** (`lockMonths`), so it means the same in month-based and
    year-based chapters.
11. **The engine never returns UI text.** Warnings, disabled reasons and errors are codes,
    translated in `messages/*.json`.
12. **Persistence API changes:** `startPlaythrough` also takes the initial state, and
    `savePlaythroughState` was added. Prathmesh should confirm this in a `contract` PR.
13. **Latin digits** in every locale for now (`numberingSystem: "latn"`).
14. **Scams were added to content:** `job-fee-offer-repeat` (the repeat variant), a
    `createsHighInterestDebt` flag for the loan app, and `afterBadTossMultiplier: 2.5`.

_Session 2 (Samarth):_

15. **Debt fund returns re-shaped** to +10 / +8 / −0.5% (expected 6.9%, shown ~7%). The §8.6 numbers
    could never lose money, which broke the §1 guardrail. Confirm with Vanguard mentors.
16. **Turns are simulated month by month.** A year's return is spread geometrically over its
    months, so SIP instalments buy more units in a falling year (rupee-cost averaging), and a bill
    lands in a specific month instead of after a full year of salary has piled up.
17. **Bank rates are per YEAR** (`bankRateByTrust[].ratePerYear`). Friend-loan rates stay per turn
    as §8.14 says. Friend loans are capped at `maxLoanMultipleOfIncome` × **monthly** income.
18. **Growth = real return on saved and invested money.** Each contribution is valued in
    chapter-start prices when it's made (`Holding.investedReal`), so money invested late isn't
    penalised for inflation it never saw. Salary piling up as cash doesn't count as growth.
19. **No negative cash.** Unavoidable payments go wallet → instant savings → a forced bank loan
    (`GameState.debt`) at the bank's rate for the player's Trust Score, or the loan app's rate if the
    bank refuses. The loan counts in `loansTaken`. Debt accrues monthly and is repaid from spare
    cash automatically.
20. **Units start at ₹10** (NAV index 1), like a newly launched fund.
21. **A recurring deposit is a monthly plan**, offered and run as `sip_start` / `sip_stop` on the
    `monthlyDepositOnly` option, never as a lump-sum `invest`.
22. **Rooms share a market seed, not a life.** Every member's `GameState` has the room's
    `marketSeed` (same market tosses for all) and its own `seed` (own life events and scams).
23. **The room rules live in the engine** (`room.ts`, pure functions). The mock room uses them now,
    and the room Edge Functions will call the same code later.
24. **What if never shows a change that doesn't help.** `chooseWhatIf` takes the highest-priority
    matching candidate whose replay ends with more Real Value; otherwise it shows none.

_Session 3 (Samarth):_

25. **One room protocol, one dispatcher.** The mock and the server both run `applyRoomRequest`, so
    the UI behaves identically against either.
26. **The server sends each player a redacted `RoomView`**, never the full room: no other players'
    cash or holdings, and no sealed bids before close.
27. **Seeds never leave the server in rooms.** With the room seed a player could precompute the
    market for everyone. Views and room playthrough rows have empty seeds. (In single-player the
    engine runs on the device, so its seed is necessarily local.)
28. **`rooms.state` is the source of truth; the other room tables are projections** written in the
    same transaction (for RLS-safe stats and the decision log). Requests are serialised with a
    `select … for update` row lock.
29. **The turn timer needs no cron.** Each turn gets a `turn_deadline`, and any call after it
    (including `tick`) resolves the turn with default decisions first.
30. **The server identifies the player from the verified JWT only**, and reads their persona from
    their latest Mindset Check (the `join` persona in the body is ignored server-side).
31. **Room games are normal playthroughs**: one `playthroughs` row per human, plus `decisions`,
    `chapter_results` and `badges_earned`, so dashboards include multiplayer without extra work.
32. **The Edge Function is a build artefact.** esbuild bundles the handler + engine + content +
    zod into one ESM file. That avoids Deno import maps for workspace TypeScript and keeps
    `handler.ts` testable in Node.
33. **JSON parameters are sent as text** (`$n::text::jsonb`). postgres.js JSON-encodes values it
    sees as jsonb, which double-encoded our state; `pnpm functions:smoke` caught it.
34. **Windfall saved** = money moved into savings or investments in the decide phase right after
    the windfall (capped at the windfall).

---

## 5. Not done yet (simplified or stubbed)

Each of these is marked `TODO(<owner>)` in the code:

- **Samarth:**
  - Deploying the room server (needs the Supabase Cloud project) and a real two-phone test.
  - Rooms in ch3a/ch3b/ch4 are implemented but only testable once those chapters have content.
- **Platform (Prathmesh):** auth flows, `redeem-code` and admin Edge Functions, real persistence
  with an IndexedDB offline queue, stats views, the dashboard, `scripts/seed.ts` (stub, but it can
  now use `playChapter`), and Supabase session refresh in `proxy.ts`.
- **UI (Pragya):** every real screen, animations, translations and the PWA (§9.4; nothing is set
  up yet).

---

## 6. Next steps per person

| Who           | Start with                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Anyone**    | Review and merge `samarth/engine-modules` → `main`, then `samarth/room-server` → `main`. Turn on branch protection for `main` (require PR + passing CI). |
| **Samarth**   | Deploy the room server once Supabase Cloud exists; help fill ch1/ch3 content numbers; the team decision in §7.2. Open items in `docs/requests/samarth.md`. |
| **Prathmesh** | Activate CI first (§8.3, and add `pnpm functions:build` before tests). Your migration already passes on PGlite: use `supabase/tests/harness.ts` for RLS tests, then confirm on Docker (`pnpm db:start && pnpm db:reset && pnpm db:types`). Then auth and the public screens (§15.6 items 2–5). See `docs/requests/prathmesh.md` items 12–16. |
| **Pragya**    | `docs/requests/pragya.md`, then the mindset check, persona reveal and turn screen against the fixtures and `lib/data` mock (§15.7 items 2–5). The **Friends' Room UI can start now** against `useRoom` (room `TOSS42`): it returns your redacted `RoomView` (requests 12–17). |

---

## 7. Balance (`pnpm sim --runs 300`, ch2, persona safe-keeper)

### 7.1 Current results

| Strategy | Avg score | Pass | Growth < half points | Avg real growth | Forced to borrow | Scams fallen |
| --- | --- | --- | --- | --- | --- | --- |
| cautious | 76.8 | 97% | 100% | −1.4% | 2% | 0.00 |
| balanced | 83.8 | 98% | 69% | +7.5% | 2% | 0.00 |
| impulsive | 66.8 | 67% | 78% | −0.3% | 2% | 0.98 |
| all-cash | 63.4 | 96% | 100% | −10.8% | 2% | 0.00 |
| all-equity-no-fund | 62.1 | 59% | 49% | +14.3% | 11% | 0.00 |

All three §10 targets hold, and `test/bots.test.ts` checks them on every run:

- balanced passes most of the time;
- all-cash usually fails the growth component;
- all-equity with no fund sometimes fails after bad tosses.

### 7.2 Open question for the team

All-cash still passes the chapter (63, just above 60). §10 only asks that it fail *growth*. If the
team wants all-cash to fail the chapter, the cleanest lever is `growth` weight or `max` in
`content/config/health-score.yaml`. That's a content decision, not an engine change.

---

## 8. Known issues

1. **Migrations haven't run on a real Supabase stack yet.** They pass on PGlite (Postgres 18),
   including RLS, but PGlite only emulates Supabase's `auth` schema and roles. Run
   `pnpm db:start && pnpm db:reset` once Docker is available.
2. **Git identity on the setup machine.** The first commit was made with that machine's git
   config (`samarth-singla`). Everyone should check `git config user.name` / `user.email` on their
   own machine before committing.
3. **CI is parked, not running.** The first push was rejected: the setup machine's GitHub
   credential has no `workflow` scope, and GitHub blocks adding `.github/workflows/*` without it.
   Fix: from a machine or token with that scope, run
   `git mv docs/pending/ci.yml .github/workflows/ci.yml`, commit on a branch and open a PR. If you
   use the Git Credential Manager, `gh auth refresh -s workflow` or signing in again with a token
   that includes `workflow` is enough. Until then, run the checks locally before every PR.
4. **Root config was touched by the room-server session** (Prathmesh's area): `package.json`
   scripts/devDeps, `vitest.config.ts`, `eslint.config.mjs`, `.gitignore`, `supabase/config.toml`.
   All are additive and listed in `docs/requests/prathmesh.md` item 12 for review.
5. **`pnpm functions:smoke` downloads Deno 2.9.6 via npx on first run** (about 100 MB), and Playwright
   needs `pnpm --filter web exec playwright install chromium` once per machine.
6. **Shell tool quirk on this Windows machine** (only matters if you use Claude Code here): bash
   heredocs that contain an apostrophe fail in the Bash tool, so write files with the editor or
   Write tool instead.

_Resolved in session 3:_ room server built and tested; room decision records; windfall tracking;
scammer-friend; `/dev/sim`; performance check; Playwright smoke has now been run.

_Resolved in session 2:_ the debt fund now can lose money in a storm (decision 15); balance meets
§10 (§7); What if no longer shows ₹0 changes (decision 24); personas whose start chapter is
disabled start in the first enabled one (`startChapterFor`).
