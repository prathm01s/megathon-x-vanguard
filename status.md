# Toss Life — project status

_As of 2026-10-11, after content expansion (chapters 1–4), Friends' Room live wiring, database repair & cloud deployment, and demo test verification._
For the spec read [`CLAUDE.md`](./CLAUDE.md). For per-person detail, decisions and history read
[`handoff.md`](./handoff.md).

---

## 1. In one paragraph

`main` now contains everyone's work with the full game loop live: Samarth's engine, content system,
and Friends' Room server; Prathmesh's accounts, database, stats views, persistence, and NGO dashboard;
and Pragya's student screens (Money Mindset Check to Life Report) and Friends' Room UI.
**All 5 chapters (1, 2, 3A, 3B, 4) are now complete, balanced, and playable.**
The Friends' Room screens are **fully wired** to real `useRoom` actions (`useCreateRoom()` hook,
live turn submission, loans, pool auctions, and emotes). The cloud database is updated and
in sync on hosted Supabase (`vapzfepyyjdsxxjclpwr`) with all 5 migrations applied (including
atomic code redemption RPC and org seats fix) and the `room-action` Edge Function deployed.
The full end-to-end browser demo tests (`e2e/demo.spec.ts` and `e2e/smoke.spec.ts`) pass against
the running app. What remains: connecting/triggering Vercel production deployment via the Vercel
dashboard, completing remaining Telugu UI translations, and full offline PWA single-player caching.

---

## 2. What is built

| Area                              | Owner                       | State                                                                                                                                                                                                                                                                            | Where                                                                                 |
| --------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Monorepo, tooling, CI workflow    | Prathmesh                   | ✅ CI active in `.github/workflows/ci.yml` (lint, typecheck, tests; Playwright on PRs to `main`)                                                                                                                                                                                 | root                                                                                  |
| Content system + all game content | Samarth / Pragya            | ✅ **All 5 chapters complete & playable**: ch1 (12 months), ch2, ch3a (salaried), ch3b (business), ch4 (legacy); scaled life events, fixed costs, tasks, Gyaan checks (3/ch), NGO prompts (3/ch). Bots scale SIP/RD to income.                                             | `packages/content`, `content/`                                                        |
| Simulation engine                 | Samarth                     | ✅ month-by-month turns, SIPs/RD, events, scams, loans, auctions, Health Score, Life Report, What-if (5 transforms), bots, save migration. Balance meets §10 across all chapters                                                                                               | `packages/engine`                                                                     |
| Friends' Room rules + server      | Samarth                     | ✅ rules in the engine; `room-action` Edge Function **deployed to hosted Supabase**; rooms migration with RLS; realtime client; per-player redacted views                                                                                                                        | `packages/engine/src/room*.ts`, `supabase/functions/room-action`, `apps/web/lib/room` |
| Accounts & auth                   | Prathmesh                   | ✅ **Atomic code redemption RPC** (`20261010020000_atomic_code_redeem.sql`), personal signup, login, NGO signup, admin code tools, password reset (server actions)                                                                                                              | `apps/web/lib/auth/actions.ts`, `(public)/join`, `(ngo)/admin`                        |
| Database                          | Prathmesh (+ Samarth rooms) | ✅ **5 migrations applied & verified in cloud**: accounts, stats views, rooms + RLS, atomic code redemption RPC, org seats view fix (`20261010030000`). Database types regenerated                                                                                                | `supabase/migrations`, `packages/db-types`                                            |
| Persistence                       | Prathmesh                   | ✅ Supabase persistence with a localStorage cache and offline decision queue; falls back to local without Supabase                                                                                                                                                               | `apps/web/lib/data`                                                                   |
| NGO dashboard                     | Prathmesh                   | ✅ overview (live from `org_*_v` views), codes (bulk, labels, CSV, revoke), batch cohorts, student ID linking, printable slips, students (+ password reset), discussion prompts                                                                                                  | `apps/web/app/[locale]/(ngo)/admin`                                                   |
| Demo seed                         | Prathmesh                   | ✅ 1 NGO, 40 seats, 35 students with played games, pre/post mindset, logins                                                                                                                                                                                                      | `scripts/seed.ts` → `supabase/seed.sql`                                               |
| Student screens                   | Pragya                      | ✅ mindset (pre/post + "how you changed"), persona, ladder, chapter intro, turn screen, shop, amount picker, coin toss with sound, scam + Red Flags (overlay ordering fixed), Life Report, profile, technique visuals                                                           | `apps/web/components/game`, `(student)/*`                                             |
| Friends' Room screens             | Pragya / Samarth            | ✅ **Wired to real actions**: `Create Room` creates real room on server (`useCreateRoom`); `room-screen` submits turns, loans, bids, emotes; "Year 1 of 5" display fix; tasks & life event title translation fixes                                                               | `apps/web/components/multiplayer`, `(student)/room`                                   |
| Translations (Telugu first)       | Pragya                      | 🟡 `te.json`: 129 UI strings translated. Game content YAML in English; Telugu UI keys mapped for all core gameplay                                                                                                                                                              | `apps/web/messages`, `content/`                                                       |
| PWA / offline install             | Pragya                      | 🟡 manifest, icon and a service worker (production only). Offline navigation falls back to cached shell                                                                                                                                                                           | `apps/web/public`                                                                     |
| Dev tools                         | Samarth                     | ✅ `/dev/content` (content browser), `/dev/sim` (balancing lab)                                                                                                                                                                                                                  | `apps/web/app/[locale]/dev`                                                           |

### Against the demo script (CLAUDE.md §13)

| #   | Demo step                                                                               | Status                                                                                            |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | NGO admin signs up and generates a Student Code                                         | ✅ Verified: live in dashboard with Supabase Cloud; batch cohorts & slips                         |
| 2   | Student redeems the code, sets a nickname, takes the Mindset Check, gets a persona      | ✅ Verified: atomic code redemption RPC live; mindset → persona verified in browser test          |
| 3   | Plays Chapter 2: fees, FD vs SIP, medical emergency, market storm, OTP scam             | ✅ Verified: full 5-year gameplay verified with coin toss and event resolution                    |
| 4   | Life Report with Real Value and a What-if replay                                        | ✅ Verified: Health Score breakdown, What-if chart, Gyaan Check tested                            |
| 5   | Friends' Room, 1 human + bots: loan with interest, Pool Bid auction, mutual-fund reveal | ✅ Verified: `useCreateRoom()` creates real server room; `demo-supabase.spec.ts` submits turn 1  |
| 6   | Admin dashboard: the student, persona distribution, scam fall rates, learning gain      | ✅ Verified: stats views populated from real database rows; student table lists new cohort         |

---

## 3. How to run it

**Prerequisites:** Node 22+ (24 LTS recommended), pnpm 12 (`npm i -g pnpm`). Docker Desktop is
only needed for a local Supabase.

```bash
git clone https://github.com/IIIT-ECell/megathon26-prajis.git && cd megathon26-prajis
pnpm install
cp .env.example .env.local          # configure Supabase keys or leave empty for mock mode
pnpm dev                            # builds content, then http://localhost:3000 → /en
```

### Mode A: no backend (local mocks)

Leave the Supabase variables in `.env.local` empty or run `pnpm db:env:mock`.
The app runs on local mocks: game saves to the browser, rooms run in memory with bots, and login uses a mock student.

- **Play:** `/en/mindset` → persona → ladder → chapter 2 → `/en/play` → `/en/report`
- **Friends' Room:** `/en/room` (hub) and `/en/room/TOSS42` (mock room at turn 3)
- **Dev tools:** `/en/dev/content`, `/en/dev/sim`
- **Other languages:** `/te/...` (Telugu), `/ur/...` (Urdu RTL)

### Mode B: with Supabase (hosted Cloud or local stack)

1. **Configuring Environment:**
   ```bash
   pnpm db:env                         # points .env.local to local/cloud Supabase
   # or manually set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   # SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_ROOM_BACKEND=supabase
   ```

2. **Hosted Supabase Deployment (Already applied to `vapzfepyyjdsxxjclpwr`):**
   ```powershell
   # If re-syncing from a new machine:
   $env:SUPABASE_DB_PASSWORD = "Megathon123"
   pnpm exec supabase migration repair --status reverted 20261010020000
   pnpm exec supabase db push --include-all --password Megathon123
   pnpm functions:deploy
   ```

3. **Demo Logins** (password `TossLifeDemo-2026` for all):
   - **NGO admin:** `facilitator@demo.tosslife.invalid` → `/en/join` → Log In → dashboard
   - **Students:** usernames `student_aarav_1` … `student_shreya_30` as listed in `supabase/seed.sql`

### Running the Tests & Browser Demo

```bash
# Core validations
pnpm content:validate && pnpm lint && pnpm typecheck && pnpm test

# Browser E2E demo test (mock room / student journey)
pnpm --filter web exec playwright test e2e/demo.spec.ts

# Full Hackathon Demo Path against real Supabase backend (§13)
# (Reuses dev server running on port 3000)
pnpm --filter web exec playwright test e2e/demo-supabase.spec.ts

# Production build check
pnpm build
```

---

## 4. What this latest round changed

1. **Content Expansion (Chapters 1, 3A, 3B, 4):**
   - Enabled and polished Chapter 1 ("First Earnings", 12 months).
   - Wrote Chapter 3A ("Salaried"), Chapter 3B ("Business"), and Chapter 4 ("Legacy") in full with fixed costs (home loan EMI), tasks (insurance, emergency funds, child education, shop upgrade, retirement), event pools, and scams.
   - Added income-scaled life events: `hospital-stay`, `home-repair`, `stock-damaged`, `festival-rush`, `parent-care`.
   - Added Gyaan Check (3 questions each) and NGO discussion prompts (3 each) across all 4 chapters.
   - Updated bots so SIP/RD investments are income-proportional across all chapters.
   - Simulated 400 runs (`pnpm sim`): balanced strategy passes ch1 (87%), ch3a (100%), ch3b (95%), ch4 (100%); all-cash fails ch4 as required.

2. **Friends' Room UI & Real Backend Wiring:**
   - "Create Room" now invokes `useCreateRoom()` hook to create a live room on the server with the authenticated student as host and redirects to `/room/<code>`.
   - Wired `room-screen.tsx` to live `useRoom` actions (`submitTurn`, `requestLoan`, `placeBid`, `react`, `tick`).
   - Fixed turn header display from "Year 0 of 5" to "Year 1 of 5".
   - Replaced raw task and event IDs with translated titles in the multiplayer view.
   - Fixed scam modal z-index/ordering in single-player so it no longer opens obscured behind the coin toss summary.

3. **Database & Cloud Deployment:**
   - Applied `20261010020000_atomic_code_redeem.sql` (atomic code redemption RPC).
   - Applied `20261010030000_fix_org_seats_view.sql` (counting codes and profiles independently).
   - Repaired remote migration history and pushed all 5 migrations to hosted Supabase (`vapzfepyyjdsxxjclpwr`).
   - Deployed latest `room-action` Edge Function bundle to hosted Supabase.
   - Regenerated TypeScript types in `packages/db-types`.

4. **Demo Test Suite:**
   - `e2e/demo.spec.ts` verifies student journey through Mindset Check, Persona, Ladder, Chapter 2, and NGO portal.
   - `e2e/demo-supabase.spec.ts` automates the entire §13 demo script against the real Supabase cloud backend.

---

## 5. What remains for production launch

1. **Vercel Project Setup:**
   - Link `https://github.com/IIIT-ECell/megathon26-prajis` in Vercel Dashboard.
   - Configure root build command: `pnpm content:build && pnpm --filter web build`.
   - Add environment variables from `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_ROOM_BACKEND=supabase`, `NEXT_PUBLIC_DEFAULT_LOCALE=en`, `NEXT_PUBLIC_APP_URL`).
2. **Telugu Translation Completion:**
   - Finish remaining UI translation strings in `apps/web/messages/te.json`.
3. **PWA Offline Gameplay:**
   - Extend `public/sw.js` cache-first strategies to support full offline single-player gameplay.
