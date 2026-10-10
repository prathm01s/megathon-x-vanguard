# Handoff — Toss Life

_Last updated: 2026-10-10 (day-zero setup)._

This file records what has been built so far, how to run it, which decisions were made and what
comes next. **Read [`CLAUDE.md`](./CLAUDE.md) first.** It is the spec, and it wins over this
file. The original pitch is `Toss Life.pdf`.

---

## 1. Status at a glance

The **day-zero setup from CLAUDE.md §15.2 is done for all three tracks** in one shared session. The
user asked to ignore the per-person ownership split for this first setup only. From now on, each
person works only in their own paths (§15.3).

| Check                                          | Result                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm install`                                 | ✅ pnpm 12, 5 workspace projects                                      |
| `pnpm content:validate`                        | ✅ 21 files valid, 1 expected warning (see §7.1)                      |
| `pnpm content:build`                           | ✅ writes `packages/content/dist/content.json` + 17 JSON Schemas      |
| `pnpm lint`                                    | ✅ no errors, no warnings                                             |
| `pnpm typecheck`                               | ✅ all packages + scripts                                             |
| `pnpm test`                                    | ✅ 40 tests in 7 files (engine 30, content 7, web 3)                  |
| `pnpm build`                                   | ✅ Next.js production build, every locale prerendered                 |
| `pnpm dev` → `/`, `/en`, `/ur`, `/te/play`, …  | ✅ all return 200; `/ur` has `dir="rtl"`                              |
| `pnpm sim --runs 300`                          | ✅ runs; balance is **not tuned** yet (see §7.2)                      |
| Supabase migration                             | ⚠️ **written but never applied**: Docker Desktop was not running      |
| `pnpm test:e2e` (Playwright)                   | ⚠️ configured with a smoke test but **not run** (browsers not installed) |
| Git                                            | ✅ day-zero skeleton committed and pushed to `main` on `origin` (`github.com/IIIT-ECell/megathon26-prajis`) |
| CI on GitHub                                   | ⚠️ **not active yet**: the workflow is parked in `docs/pending/ci.yml` (see §7.8) |

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
  See §7.8: it must be moved to `.github/workflows/ci.yml` by someone whose GitHub credential has
  the `workflow` scope.
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

### 3.3 Game content (`content/`, Pragya writes text, Samarth owns numbers)

All files from §3.2 exist with the §8 data in English only:

- `config/`: economy, market, health-score, multiplayer, locales.
- `onboarding/`: the 6 mindset questions with points and post-game `insight` text; 4 personas,
  assignment rules (§8.3, exact) and shift rules.
- `chapters/`: **`ch2-first-job` is complete** (the prototype). `ch1`, `ch3a`, `ch3b` and `ch4` are
  outlines with `enabled: false`.
- `investments/`: 9 options with fictional names and returns as in §8.6; 7 techniques.
- `events/`: 8 life events; 8 scams (the 7 from §8.9 plus `job-fee-offer-repeat`, the repeat
  variant that ch2 asks for).
- `multiplayer/auctions.yaml` (used bike, property pool, shop space), `report/` (Life Report rules
  and What-if candidates, 3 ch2 Gyaan questions, 6 badges), `ngo/discussion-prompts.yaml` (3 for ch2).
- `content/README.md`: an editing guide written for non-developers.

### 3.4 Engine (`packages/engine`, Samarth)

**Contract (§15.4 A, C)**: `src/types.ts` defines `GameState`, `Action`, `ActionOption`,
`TossResult`, `GameEvent`, `ChapterResult`, `LifeReport`, `WhatIfResult`, `DecisionRecord` with
`DECISION_TYPES`, and the room types (`RoomState`, `RoomMember`, `Loan`, `AuctionState`, `Bid`,
`BidPool`). All money is **integer paise**.

**API (`src/api.ts`)**, all pure: `scoreMindset`, `createPlaythrough`, `getAvailableActions`,
`applyAction`, `advanceTurn`, `endChapter`, `replayWithChange`, `toDecisionLog`, plus `replay`
and `tossFor`.

What actually works today:

- `rng.ts`: in-house seeded PRNG (cyrb128 → sfc32) with **named streams** (`market`, `independent`,
  `life`, `scam`, …) derived from `(seed, stream, turn)`. Tosses never depend on decisions, which
  makes "What if" exact.
- Persona scoring and assignment (`persona.ts`), the condition DSL, and a metrics registry with
  **every metric from §8.10** (`metrics.ts`; it is a `Record<MetricId, …>`, so a missing metric
  fails the type check).
- Health Score with linear, steps and inverse scales and weight redistribution (`score.ts`), and
  Life Report rule selection (`report.ts`).
- A **simplified but complete turn loop**: market and gold tosses → returns → income and expenses
  → SIP buying → one life event → one scam offer → inflation and salary growth → task due dates
  and fines → history snapshot. Also FD/RD locks with early-break penalties, crash-sell tracking,
  scam responses, repeat-scam spotting, the salary bonus from the laptop task, and `blockNextChapterGoal`.
- `endChapter` returns the score, report, badges, a persona shift, the next chapter(s) and a What-if.
- `replayWithChange` replays the chapter from turn 0 with the same seed. It supports
  `replace_action` and the `ignoreScams` and `startSip` candidates.
- **Fixtures** (`fixtures/`): ch2 state at turns 0, 2 and 5, a `ChapterResult` and a room. They are
  generated from a scripted playthrough (`fixtures/scenario.ts`) by
  `pnpm --filter @toss/engine fixtures`, so they always match the types. Import them from
  `@toss/engine/fixtures`.
- **Tests (30):** RNG determinism and distribution, every persona rule, every DSL operator, Health
  Score with and without multiplayer, FD penalty, fixed returns, inflation and Real Value, the
  emergency-fund task, **same seed + same decisions = identical results**, and replay-with-no-change
  = identical.

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
- **Room API (§15.4 E)**: `lib/room/index.ts`, typed `useRoom` / `createRoom` stubs that return
  the fixture room.
- Supabase clients: `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server plus a
  service-role `createAdminClient`, both `server-only`).
- Tests: Vitest with jsdom (`lib/format.test.ts`) and Playwright (`e2e/smoke.spec.ts`, Pixel 5
  viewport).

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
11. **The engine never returns UI text.** Warnings and disabled reasons are codes, translated in
    `messages/*.json` → `engine.*`.
12. **Persistence API changes:** `startPlaythrough` also takes the initial state, and
    `savePlaythroughState` was added. Prathmesh should confirm this in a `contract` PR.
13. **Latin digits** in every locale for now (`numberingSystem: "latn"`).
14. **Scams were added to content:** `job-fee-offer-repeat` (the repeat variant), a
    `createsHighInterestDebt` flag for the loan app, and `afterBadTossMultiplier: 2.5`.

---

## 5. Not done yet (simplified or stubbed)

Each of these is marked `TODO(<owner>)` in the code:

- **Engine (Samarth):** income modifiers such as job break, business income variability, monthly
  SIP timing and units, cash-at-home loss, loans, auctions, bots, persona shift streaks across
  chapters, and the What-if transforms `moveShare`, `emergencyFundFirst` and `holdThroughCrash`.
  Everything currently lives in `api.ts`; split it into the modules from §3.2.
- **Room server (Samarth):** room migrations, Edge Functions, the in-memory mock room and realtime
  `useRoom`.
- **Platform (Prathmesh):** auth flows, `redeem-code` and admin Edge Functions, real persistence
  with an IndexedDB offline queue, stats views, the dashboard, `scripts/seed.ts` (currently a stub),
  and Supabase session refresh in `proxy.ts`.
- **UI (Pragya):** every real screen, animations, translations and the PWA (§9.4; nothing is set
  up yet).

---

## 6. Next steps per person

| Who           | Start with                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Anyone**    | Turn on branch protection for `main` on GitHub (require PR + passing CI). Done already: repo, first commit, push. |
| **Samarth**   | `docs/requests/samarth.md`, then §15.5 items 3–12 (split `api.ts` into modules, balance with `pnpm sim`, then the mock room). |
| **Prathmesh** | Activate CI first (§7.8). Then start Docker, run `pnpm db:start && pnpm db:reset`, fix the migration, run `pnpm db:types`, then auth and the public screens (§15.6 items 2–5). |
| **Pragya**    | `docs/requests/pragya.md`, then the mindset check, persona reveal and turn screen against the fixtures and `lib/data` mock (§15.7 items 2–5). |

---

## 7. Known issues

1. **The debt fund can never lose money.** §8.6 gives it +8.5 / +7 / +5.5%, which conflicts with
   the §1 guardrail that market options must be able to lose money. `content:validate` warns about
   it. Samarth needs to decide.
2. **Balance:** `pnpm sim --runs 300` gives all-cash 63 avg / 95% pass, balanced 77 / 95% and
   all-equity 73 / 96%. All-cash should usually fail (§10). `realValueGrowthPct` is also negative
   for every strategy because it deflates by the whole-chapter index; it needs a time-weighted
   real return.
3. **What-if can show ₹0** when the chosen candidate matches what the player already did.
4. **Personas start in ch1, but ch1 is disabled.** Until ch1 is playable, start everyone in ch2.
5. **The migration is untested.** Expect small fixes on its first `db reset`.
6. **Git identity on the setup machine.** The first commit was made with that machine's git
   config (`samarth-singla`). Everyone should check `git config user.name` / `user.email` on their
   own machine before committing.
7. **CI is parked, not running.** The first push was rejected: the setup machine's GitHub
   credential has no `workflow` scope, and GitHub blocks adding `.github/workflows/*` without it.
   Fix: from a machine or token with that scope, run
   `git mv docs/pending/ci.yml .github/workflows/ci.yml`, commit on a branch and open a PR. If you
   use the Git Credential Manager, `gh auth refresh -s workflow` or signing in again with a token
   that includes `workflow` is enough. Until then, run the checks locally before every PR.
8. **Shell tool quirk on this Windows machine** (only matters if you use Claude Code here): bash
   heredocs that contain an apostrophe fail in the Bash tool, so write files with the editor or
   Write tool instead.
