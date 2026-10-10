# Toss Life — project status

_As of 2026-10-10 (evening), after merging every branch into `main` and reviewing the result._
For the spec read [`CLAUDE.md`](./CLAUDE.md). For per-person detail, decisions and history read
[`handoff.md`](./handoff.md).

---

## 1. In one paragraph

`main` now contains everyone's work: Samarth's engine, content system and Friends' Room server;
Prathmesh's accounts, database, stats views, persistence and NGO dashboard; and Pragya's student
screens (Money Mindset Check to Life Report), plus her first Friends' Room screens, partial Telugu
and a basic PWA. A student can play **Chapter 2 end to
end in the browser today**: mindset check → persona → Life Ladder → chapter intro → five yearly
tosses with life events, a market storm and scam calls → Red Flags → Life Report with Health
Score, What-if and Gyaan Check. This was verified by actually playing it in headless Chromium,
with zero console errors. Everything passes: lint, typecheck, 151 tests, the production build,
the Playwright smoke tests and the Deno smoke test of the room server. Not done yet:

- **wiring the Friends' Room screens to the real room:** they render the live room but still
  simulate turns, loans and emotes locally;
- **completing Telugu** (about half of the UI; no game content yet);
- **real offline play**;
- running against a **real Supabase project**: nothing is deployed, and every database check so
  far ran on PGlite (Postgres 18).

---

## 2. What is built

| Area                              | Owner                       | State                                                                                                                                                                                                                                                                            | Where                                                                                 |
| --------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Monorepo, tooling, CI workflow    | Prathmesh                   | ✅ CI active in `.github/workflows/ci.yml` (lint, typecheck, tests; Playwright on PRs to `main`)                                                                                                                                                                                 | root                                                                                  |
| Content system + all game content | Samarth / Pragya            | ✅ Zod schemas, validator, build, watch; **ch2 complete**, ch1/ch3a/ch3b/ch4 outlines (disabled)                                                                                                                                                                                 | `packages/content`, `content/`                                                        |
| Simulation engine                 | Samarth                     | ✅ month-by-month turns, SIPs/RD, events, scams, loans, auctions, Health Score, Life Report, What-if (5 transforms), bots, save migration. Balance meets §10                                                                                                                     | `packages/engine`                                                                     |
| Friends' Room rules + server      | Samarth                     | ✅ rules in the engine; `room-action` Edge Function; rooms migration with RLS; realtime client; per-player redacted views                                                                                                                                                        | `packages/engine/src/room*.ts`, `supabase/functions/room-action`, `apps/web/lib/room` |
| Accounts & auth                   | Prathmesh                   | ✅ code redemption, personal signup, login, NGO signup, admin code tools, password reset (server actions)                                                                                                                                                                        | `apps/web/lib/auth/actions.ts`, `(public)/join`, `(ngo)/admin`                        |
| Database                          | Prathmesh (+ Samarth rooms) | ✅ 3 migrations: accounts + RLS, stats views (7), rooms + RLS. Generated DB types                                                                                                                                                                                                | `supabase/migrations`, `packages/db-types`                                            |
| Persistence                       | Prathmesh                   | ✅ Supabase persistence with a localStorage cache and offline decision queue; falls back to local without Supabase                                                                                                                                                               | `apps/web/lib/data`                                                                   |
| NGO dashboard                     | Prathmesh                   | ✅ overview, codes (bulk, labels, CSV, revoke), students (+ password reset), discussion prompts                                                                                                                                                                                  | `apps/web/app/[locale]/(ngo)/admin`                                                   |
| Demo seed                         | Prathmesh (fixed in merge)  | ✅ 1 NGO, 40 seats, 35 students with played games, pre/post mindset, logins                                                                                                                                                                                                      | `scripts/seed.ts` → `supabase/seed.sql`                                               |
| Student screens                   | Pragya                      | ✅ mindset (pre/post + "how you changed"), persona, ladder, chapter intro, turn screen, shop, amount picker, coin toss with sound, scam + Red Flags, Life Report, profile, technique visuals                                                                                     | `apps/web/components/game`, `(student)/*`                                             |
| Friends' Room screens             | Pragya                      | 🟡 **prototype**: room hub (join/create), room screen (turn sync header, timer, shared toss, wallet, Trust), loan modal, auction modal, emotes. Renders the live `useRoom` data, but **turns, loans, bids and emotes are simulated locally**, not sent through `useRoom` actions | `apps/web/components/multiplayer`, `(student)/room`                                   |
| Translations (Telugu first)       | Pragya                      | 🟡 `te.json`: 123 of 240 UI strings translated (another 44 keys don't match an English key, so they're never shown). Game content YAML not yet translated                                                                                                                        | `apps/web/messages`, `content/`                                                       |
| PWA / offline install             | Pragya                      | 🟡 manifest, icon and a service worker (production only). Offline navigation falls back to the cached `/` page, so offline single-player isn't there yet                                                                                                                         | `apps/web/public`                                                                     |
| Dev tools                         | Samarth                     | ✅ `/dev/content` (content browser), `/dev/sim` (balancing lab)                                                                                                                                                                                                                  | `apps/web/app/[locale]/dev`                                                           |

### Against the demo script (CLAUDE.md §13)

| #   | Demo step                                                                               | Status                                                                                         |
| --- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | NGO admin signs up and generates a Student Code                                         | 🟡 UI and server actions built; needs a Supabase project to run                                |
| 2   | Student redeems the code, sets a nickname, takes the Mindset Check, gets a persona      | 🟡 redemption needs Supabase; mindset → persona ✅ verified in browser                         |
| 3   | Plays Chapter 2: fees, FD vs SIP, medical emergency, market storm, OTP scam             | ✅ verified in browser                                                                         |
| 4   | Life Report with Real Value and a What-if replay                                        | ✅ verified in browser                                                                         |
| 5   | Friends' Room, 1 human + bots: loan with interest, Pool Bid auction, mutual-fund reveal | 🟡 server + mock + tests ✅; screens exist, but they're **not yet wired** to `useRoom` actions |
| 6   | Admin dashboard: the student, persona distribution, scam fall rates, learning gain      | 🟡 UI + stats views ✅ (views tested on the seeded class); needs Supabase to run live          |

---

## 3. How to run it

**Prerequisites:** Node 22+ (24 LTS recommended), pnpm 12 (`npm i -g pnpm`). Docker Desktop is
only needed for a local Supabase.

```bash
git clone https://github.com/IIIT-ECell/megathon26-prajis.git && cd megathon26-prajis
pnpm install
cp .env.example .env.local          # set TOSS_DEV=<your name>
pnpm dev                            # builds content, then http://localhost:3000 → /en
```

### Mode A: no backend (works today, no setup)

Leave the Supabase variables in `.env.local` empty. The app then runs on local mocks: your
game saves to the browser, rooms run in memory with bots, and the login uses a mock student.
Good for building and demoing screens.

- **Play:** `/en/mindset` → persona → ladder → chapter 2 → `/en/play` → `/en/report`
- **Friends' Room:** `/en/room` (hub) and `/en/room/TOSS42` (a mock room at turn 3)
- **Dev tools:** `/en/dev/content`, `/en/dev/sim`
- **Other languages:** `/te/...` (about half translated), `/ur/...` (right-to-left)

### Mode B: with Supabase (accounts, dashboard, real rooms)

```bash
# local stack (needs Docker):
pnpm db:start                       # prints the local URL + anon/service keys → .env.local
pnpm db:reset                       # applies the 3 migrations + the demo seed
pnpm db:types                       # optional: regenerate packages/db-types
pnpm functions:serve                # room-action Edge Function (builds the bundle first)
# in .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#                SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_ROOM_BACKEND=supabase
pnpm dev
```

**Demo logins** (from the seed; demo/local projects only), password `TossLifeDemo-2026` for all:

- **NGO admin:** `facilitator@demo.tosslife.invalid` → `/en/join` → Log In → dashboard;
- **Students:** usernames `student_aarav_1` … `student_shreya_30`, …, as listed in
  `supabase/seed.sql`.

**Cloud:** create the Supabase project, link it (`supabase link`), push migrations
(`supabase db push`), `pnpm functions:deploy`, and set the four variables on Vercel.

### Checks (run before every PR; CI runs the same)

```bash
pnpm content:validate && pnpm lint && pnpm typecheck && pnpm test
pnpm build                          # production build
pnpm test:e2e                       # Playwright (once: pnpm --filter web exec playwright install chromium)
pnpm functions:smoke                # room server under real Deno (downloads Deno via npx once)
pnpm sim -- --runs 300              # balance report      ·   pnpm bench   # engine speed
```

**Results on merged `main` (this review):** content valid (0 warnings) · lint 0 issues ·
typecheck 0 errors · **151/151 tests** (engine 111, DB/room/seed 22, web 10, content 8) · build
OK (107 pages) · Playwright 2/2 · Deno smoke 7/7 · a ch2 turn ≈ 0.4 ms estimated on a mid-range
phone (budget 50 ms).

---

## 4. What the merge and review changed

**The merge:**

- **Order:** `main` (day zero + M1 PDF) ← `samarth/room-server` (which includes
  `samarth/engine-modules`) ← `prathmesh/platform-auth-db-dashboard` ← `pragya/mindset-turn-screen`.
- **A second Pragya merge:** she pushed one more commit (Friends' Room UI, Telugu, PWA) while
  the review was running, and it was merged too.
- **One textual conflict, `apps/web/app/[locale]/(public)/join/page.tsx`:** kept Prathmesh's real
  signup/login page (his path) and applied Pragya's flow: after signing up, students go to the
  Money Mindset Check, as §4.2 requires. Redirects now keep the locale.
- **`deliverables/M1.pdf` kept** (Pragya's branch added and then removed it; `main` keeps it).

**Bugs found by testing the merged code, and fixed:**

| Problem                                      | Effect before the fix                                                                                                                       | Fix                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `proxy.ts` always created a Supabase client  | **every page returned 500** without Supabase env (local dev, mocks, CI e2e)                                                                 | refresh the session only when Supabase is configured                                                      |
| Decision-queue flush not guarded             | an unhandled promise rejection on every turn without Supabase                                                                               | caught; records stay queued locally                                                                       |
| Content hash read raw bytes                  | Windows (CRLF) and Linux (LF) got **different `contentVersion`s** for the same content                                                      | hash line-ending-normalised text; regression test                                                         |
| Game store carried the state's `carryOver`   | persona shifts across chapters could never trigger                                                                                          | uses the chapter result's `carryOver`                                                                     |
| Game store saved v1 states with no migration | old saved games would crash                                                                                                                 | zustand persist v2 + the engine's `migrateState`                                                          |
| Toss results: `coveredBy: "savings"`         | "Your emergency fund covered this" was shown as "wallet went below zero"                                                                    | handled; messages updated for engine v2                                                                   |
| Toss results: good events                    | a **bonus showed as a red "−₹…"**; a promotion as "−₹0"                                                                                     | gains shown as "+", no amount for income changes                                                          |
| Life Report score breakdown                  | "27.77777777777778 pts" and a "trust 0 / 0" row in single-player                                                                            | rounded, localized labels, hides non-applicable parts                                                     |
| `supabase/seed.sql`                          | **failed on `db reset`** (no `auth.users`); invalid mindset answer ids → all scores 0; no post-check; `Math.random`                         | regenerated: logins, valid pre/post answers, deterministic, nicknames only; seed + stats-view tests added |
| Friends' Room screen                         | **`/room/<code>` stuck on "Loading…" forever** (state captured the null hydration snapshot); built against the old room API (3 type errors) | live room as the base, local overrides on top; `RoomView`/`PublicMember` types; yearly bank rate          |
| Service worker                               | registered in dev too, and caches `/_next/` cache-first → **stale code during development**                                                 | registered in production builds only                                                                      |

**Housekeeping:** Prettier applied to the merged files (a formatting-only commit); the duplicate
parked CI file was removed.

---

## 5. Known issues and review findings (not fixed: owner's call)

**Prathmesh**

1. **Code redemption isn't atomic or rate-limited in the path the app uses.** `redeemStudentCode`
   (a server action) checks then updates, so two students racing on one code can both succeed.
   The `redeem-code` Edge Function has in-memory rate limiting (per instance only) and isn't
   called by the app. Suggest one SQL RPC: `update student_codes … where code_hash = $1 and status = 'pending' returning …`.
2. **Personal learners who give an email can't log in by username.** Signup uses the real email
   as the auth email, but login turns a username into `<username>@students.tosslife.invalid`.
3. **The offline queue uses localStorage, not IndexedDB** (your progress note says IndexedDB).
   That's fine for now, but the decision queue can grow large.
4. `loginUser` sends returning students to `/play`. Students without a game should go to `/mindset`.
5. **Generated DB types don't include the room tables yet.** Rerun `pnpm db:types` after
   `pnpm db:reset`.

**Pragya**

1. **Wire the Friends' Room screens to `useRoom` actions** (the biggest gap for demo step 5).
   Today:
   - "Submit turn" only bumps a local counter;
   - loan offers are fabricated locally;
   - accept and repay move no money;
   - peer emotes are simulated.

   Replace these with `actions.submitTurn` / `requestLoan` / `offerLoan` / `acceptLoan` /
   `repayLoan` / `placeBid` / `joinPool` / `react` and read everything from `room`. Also remove
   the hardcoded values: "₹54,000 paid", "Tasks Paid (4/5)", "Gold is up +4%" (shown next to a
   real CRASH), the 5-turn total, and "Income …/yr", which shows the monthly figure.

2. **New engine events aren't shown on the toss screen:** `forced_borrowing` ("you had to borrow…"),
   `cash_lost`, `sip_missed`, `debt_interest`/`debt_repaid`.
3. **Hardcoded English in components:** "Fine:", "Score Breakdown" and the join/admin text, so
   they can't be translated.
4. **Missed optional tasks show "Fine: ₹0"**; hide the fine when it's 0.
5. **The turn screen nests three `<main>` elements** (AppShell inside AppShell): one main landmark
   only (§9.1, WCAG).
6. **The header shows "Year 6 of 5"** once the chapter is complete.
7. **`components/game/store.ts` duplicates `startChapterFor`**, which the engine now exports.

**Samarth**

1. Nothing has run on a real Supabase stack yet: no Docker on this machine and no cloud project.
2. Team decision still open: all-cash passes ch2 with ~63 (§10 only asks that it fail _growth_).

**Everyone:** the `main` push includes `.github/workflows/ci.yml`. A GitHub login without the
`workflow` scope can't push changes to that file.

---

## 6. Next steps (in priority order for the demo)

| #   | What                                                                                                               | Who                                    |
| --- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| 1   | Create the Supabase Cloud project; push migrations; seed; deploy `room-action`; set Vercel env                     | Prathmesh (+ Samarth for the function) |
| 2   | Wire the Friends' Room screens to `useRoom` actions (they render, but simulate locally)                            | Pragya                                 |
| 3   | Atomic, rate-limited code redemption (RPC); the username/email login fix                                           | Prathmesh                              |
| 4   | Finish Telugu (117 missing UI keys, 44 orphan keys, ch2 content); real offline single-player in the service worker | Pragya                                 |
| 5   | Show the new engine events on the toss screen; move hardcoded strings into `messages/`                             | Pragya                                 |
| 6   | Playwright test of the full demo path (§13) against local Supabase                                                 | Prathmesh                              |
| 7   | A real two-phone Friends' Room test once deployed; content numbers for ch1/ch3                                     | Samarth                                |
| 8   | Team: confirm return rates with Vanguard mentors; decide whether all-cash should fail ch2                          | All                                    |
