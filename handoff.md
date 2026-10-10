# Handoff — Toss Life

_Last updated: 2026-10-10 (after Samarth's engine + mock room session)._

This file records what has been built so far, how to run it, which decisions were made and what
comes next. **Read [`CLAUDE.md`](./CLAUDE.md) first.** It is the spec, and it wins over this
file. The original pitch is `Toss Life.pdf`.

**Log of sessions**

1. **Day zero** (shared setup, on `main`): monorepo, content system, engine contract, web skeleton,
   first migration. The user asked to ignore the per-person ownership split for this first setup
   only.
2. **Samarth — engine modules + mock room** (branch `samarth/engine-modules`, PR into `main`):
   CLAUDE.md §15.5 items 3–13. Details in §3.4 and §3.5 below.

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
| `pnpm test`                                    | ✅ **109 tests** in 16 files (engine 95, content 7, web 7)            |
| `pnpm build`                                   | ✅ Next.js production build, every locale prerendered                 |
| `pnpm dev` → `/`, `/en`, `/ur`, `/te/play`, …  | ✅ all return 200; `/ur` has `dir="rtl"` (checked on day zero)        |
| `pnpm sim --runs 300`                          | ✅ meets the §10 balance targets (see §7.1 for the table)             |
| Supabase migration                             | ⚠️ **written but never applied**: Docker Desktop was not running      |
| `pnpm test:e2e` (Playwright)                   | ⚠️ configured with a smoke test but **not run** (browsers not installed) |
| Git                                            | ✅ `main` = day zero. `samarth/engine-modules` = 2 more commits, pushed, waiting for review |
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
- **Room API (§15.4 E) — working mock room (Samarth, session 2):**
  - `lib/room/store.ts` runs the real engine room rules in memory, with bots, and notifies
    subscribers. `lib/room/index.ts` exposes the **`useRoom(code)`** hook (built on
    `useSyncExternalStore`) and `createRoom(chapterId)`.
  - The actions are the contract's (`join`, `leave`, `ready`, `submitTurn`, `requestLoan`,
    `offerLoan`, `acceptLoan`, `repayLoan`, `placeBid`, `createPool`, `joinPool`) plus three
    backwards-compatible additions: **`act(action)`** (your own decisions inside the room),
    **`react(emoteId)`** and a `myDebts` list. `ready()` from the host starts the game.
  - Room **`TOSS42`** is preloaded from the fixture, and its human player is the mock session user.
  - Later the realtime client swaps the store's internals for Edge Function calls and Supabase
    Realtime, keeping the same hook.
- Supabase clients: `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server plus a
  service-role `createAdminClient`, both `server-only`).
- Tests: Vitest with jsdom (`lib/format.test.ts`, `lib/room/store.test.ts`) and Playwright
  (`e2e/smoke.spec.ts`, Pixel 5 viewport).

### 3.6 Database (`supabase/`, Prathmesh)

- `supabase init` done (`project_id = "toss-life"`).
- `migrations/20261010000000_accounts.sql` covers **all non-room tables in §5**: organizations
  (unique `admin_user_id`), profiles (Player ID default `TL-XXXXX` from an unambiguous alphabet),
  groups, group_members, student_codes (hash + last 4 only), org_join_requests, mindset_responses,
  playthroughs, chapter_results, decisions (append-only), gyaan_answers and badges_earned.
  **RLS is on for every table**: students see their own rows, admins see their org's rows.
  It also adds a trigger that stops clients changing role, org, username or Player ID, and two
  RPCs: `create_organization` (NGO signup) and `respond_to_join_request`.
- `packages/db-types` holds a **placeholder** `Database` type until `pnpm db:types` runs.
- Room tables (rooms, members, loans, auctions, bids, pools) are **not written yet** (Samarth, next).

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

---

## 5. Not done yet (simplified or stubbed)

Each of these is marked `TODO(<owner>)` in the code:

- **Engine (Samarth):**
  - `windfallSavedPct` is always 0 (the `saved-windfall` rule never fires), because spending in
    later turns isn't attributed to the windfall.
  - Room loan, auction and persona-shift actions don't emit `DecisionRecord`s yet.
  - The `scammer-friend` bot doesn't push the Ponzi offer in rooms yet (ch3b is disabled anyway).
  - `/dev/sim` route; the engine performance check (§15.5 item 18).
- **Room server (Samarth):** room migrations with RLS, room Edge Functions (call `room.ts`; turn
  timer = call `resolveTurn` when it expires), and the realtime `useRoom` client (§15.5 items 14–16).
- **Platform (Prathmesh):** auth flows, `redeem-code` and admin Edge Functions, real persistence
  with an IndexedDB offline queue, stats views, the dashboard, `scripts/seed.ts` (stub, but it can
  now use `playChapter`), and Supabase session refresh in `proxy.ts`.
- **UI (Pragya):** every real screen, animations, translations and the PWA (§9.4; nothing is set
  up yet).

---

## 6. Next steps per person

| Who           | Start with                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Anyone**    | Review and merge PR `samarth/engine-modules` → `main`. Turn on branch protection for `main` (require PR + passing CI). |
| **Samarth**   | Room migrations, room Edge Functions on top of `room.ts`, realtime `useRoom` (§15.5 items 14–16), then `/dev/sim` and the performance check. Open items in `docs/requests/samarth.md`. |
| **Prathmesh** | Activate CI first (§8.3). Then start Docker, run `pnpm db:start && pnpm db:reset`, fix the migration, run `pnpm db:types`, then auth and the public screens (§15.6 items 2–5). Load saved games with `migrateState` (see `docs/requests/prathmesh.md`). |
| **Pragya**    | `docs/requests/pragya.md`, then the mindset check, persona reveal and turn screen against the fixtures and `lib/data` mock (§15.7 items 2–5). The **Friends' Room UI can start now** against `useRoom` (room `TOSS42`). |

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

1. **The migration is untested.** Expect small fixes on its first `db reset`.
2. **Git identity on the setup machine.** The first commit was made with that machine's git
   config (`samarth-singla`). Everyone should check `git config user.name` / `user.email` on their
   own machine before committing.
3. **CI is parked, not running.** The first push was rejected: the setup machine's GitHub
   credential has no `workflow` scope, and GitHub blocks adding `.github/workflows/*` without it.
   Fix: from a machine or token with that scope, run
   `git mv docs/pending/ci.yml .github/workflows/ci.yml`, commit on a branch and open a PR. If you
   use the Git Credential Manager, `gh auth refresh -s workflow` or signing in again with a token
   that includes `workflow` is enough. Until then, run the checks locally before every PR.
4. **Shell tool quirk on this Windows machine** (only matters if you use Claude Code here): bash
   heredocs that contain an apostrophe fail in the Bash tool, so write files with the editor or
   Write tool instead.

_Resolved in session 2:_ the debt fund now can lose money in a storm (decision 15); balance meets
§10 (§7); What if no longer shows ₹0 changes (decision 24); personas whose start chapter is
disabled start in the first enabled one (`startChapterFor`).
