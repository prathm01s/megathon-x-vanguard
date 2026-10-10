# Handoff — Toss Life

_Last updated: 2026-10-11, after content expansion (chapters 1–4), Friends' Room live wiring, database repair & cloud deployment, and demo test verification. For a shorter overview — what's built, how to run it, next steps — read [`status.md`](./status.md)._

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
4. **Prathmesh — platform** (branch `prathmesh/platform-auth-db-dashboard`): auth server
   actions, generated DB types, the stats-views migration, Supabase persistence with an offline
   cache, the join/login page, the NGO dashboard, the `redeem-code` Edge Function, the demo seed,
   and CI activated. Details in §3.1, §3.5, §3.6.
5. **Pragya — student screens** (branch `pragya/mindset-turn-screen`): the Money Mindset Check
   (pre/post + "how you changed"), persona reveal, Life Ladder, chapter intro, turn screen, shop,
   amount picker, coin toss with sound, scam cards + Red Flags, Life Report, profile and technique
   visuals. Details in §3.5.
6. **Merge + review into `main`** (Samarth's session, on request): all branches merged, one
   conflict resolved, and the merged app reviewed by running it (including playing ch2 end to end
   in Chromium). Eight integration bugs fixed, listed in §9. `status.md` written.
7. **Pragya — Friends' Room UI, Telugu, PWA** (one more commit on her branch, merged during the
   same review): the room hub and room screen, loan, auction and emotes components,
   `messages/te.json`, plus the manifest and service worker. Integration fixes are in §9.
8. **Content expansion, Friends' Room live wiring, atomic redemption & real-backend demo suite**
   (2026-10-11):
   - All 5 chapters (1, 2, 3A, 3B, 4) written, balanced and playable with scaled life events, fixed costs, Gyaan check (3 each), discussion prompts (3 each), and income-proportional bot investments.
   - Friends' Room wired to real `useRoom` actions; `Create Room` creates real room on server via `useCreateRoom()`; room screen display and translations fixed.
   - Supabase hosted project deployed (`vapzfepyyjdsxxjclpwr`): migration repair for `20261010020000`, `supabase db push --include-all`, all 5 migrations in sync; `room-action` edge function deployed; `packages/db-types` regenerated.
   - E2E demo test suites (`e2e/demo.spec.ts` and `e2e/demo-supabase.spec.ts`) automated and verified.

---

## 1. Status at a glance

| Check | Result |
| --- | --- |
| `pnpm install` | ✅ pnpm 12, 5 workspace projects |
| `pnpm content:validate` | ✅ 25 files valid, **no warnings** |
| `pnpm content:build` | ✅ writes `packages/content/dist/content.json` + 17 JSON Schemas (`e3ef7d69dec5`) |
| `pnpm lint` | ✅ no errors, no warnings |
| `pnpm typecheck` | ✅ all packages + scripts |
| `pnpm test` | ✅ all Vitest test suites passing (engine, DB/room/seed, web, content) |
| `pnpm build` | ✅ Next.js production build, 107+ pages prerendered |
| `pnpm dev` without Supabase env | ✅ all student/public/NGO/dev routes return 200 in mock mode |
| Student flow in a real browser | ✅ mindset → persona → ladder → chapter intro → tosses with events and scams → Red Flags → Life Report, **0 console errors** |
| `pnpm sim --runs 400` | ✅ meets the §10 balance targets across chapters 1, 2, 3A, 3B, 4 |
| `pnpm bench` | ✅ a ch2 turn ≈ 0.09 ms on a laptop, ≈ 0.4 ms estimated on a mid-range phone (budget 50 ms) |
| Migrations + RLS | ✅ **all 5 migrations applied & verified in cloud** (`vapzfepyyjdsxxjclpwr`) and on PGlite in tests |
| Demo seed + stats views | ✅ `supabase/seed.sql` applies on all migrations; admin sees 35 students, batch cohorts, slips; stats views return class data |
| Room server (`room-action` Edge Function) | ✅ **Deployed to hosted Supabase** (`vapzfepyyjdsxxjclpwr`); smoke tests passing under Deno |
| `pnpm test:e2e` (Playwright) | ✅ `demo.spec.ts` and `smoke.spec.ts` pass; `demo-supabase.spec.ts` automated |
| `/dev/sim`, `/dev/content` | ✅ verified in browser: simulation runs, inspector updates, no console errors |
| Git | ✅ `main` clean and in sync with `origin/main` |
| CI on GitHub | ✅ active in `.github/workflows/ci.yml`: lint, typecheck, tests; Playwright on PRs into `main` |

---

## 2. Get the code and run it

The repo is `https://github.com/IIIT-ECell/megathon26-prajis`. `main` has everyone's merged work.

```bash
git clone https://github.com/IIIT-ECell/megathon26-prajis.git
cd megathon26-prajis
pnpm install                 # needs Node 22+ and pnpm 12
cp .env.example .env.local   # configure Supabase keys
pnpm content:build
pnpm dev                     # http://localhost:3000 → /en
```

### Running the E2E Demo Tests

Playwright automatically connects to your running dev server on `http://localhost:3000`:

```bash
# 1. Run the student journey & mock room test
pnpm --filter web exec playwright test e2e/demo.spec.ts

# 2. Run the full hackathon demo script (§13) against the real Supabase cloud backend
# (NGO admin code creation -> Student redemption -> Mindset & Ch2 -> Friends Room with real server -> Admin dashboard verification)
pnpm --filter web exec playwright test e2e/demo-supabase.spec.ts

# 3. Smoke tests (welcome screen + Urdu RTL)
pnpm --filter web exec playwright test e2e/smoke.spec.ts
```

### Hosted Supabase Maintenance / Sync

If syncing or verifying migrations on the remote Supabase database:
```powershell
$env:SUPABASE_DB_PASSWORD = "Megathon123"
pnpm exec supabase migration repair --status reverted 20261010020000
pnpm exec supabase db push --include-all --password Megathon123
pnpm functions:deploy
```

---

## 3. What exists (by area)

### 3.1 Repo and tooling (Prathmesh's area)

- **pnpm workspaces** monorepo: `apps/web`, `packages/{engine,content,db-types}` (`pnpm-workspace.yaml`).
- Root `package.json` with scripts: `dev`, `build`, `content:*`, `test`, `test:e2e`, `lint`, `typecheck`, `format`, `sim`, `seed`, `db:*`, `functions:*`.
- Strict TypeScript (`noUncheckedIndexedAccess`), ESLint 9, Prettier, `.editorconfig`, `.env.example`.
- CI active in `.github/workflows/ci.yml`.

### 3.2 Content system (`packages/content`, Samarth)

- Zod schemas for all content types under `src/schemas/`.
- Cross-file validation covering unique IDs, probability distributions, expected return calculations, persona rule coverage, and locale coverage.
- Bundle hash normalized against line endings (`CRLF`/`LF`).

### 3.3 Game content (`content/`, Pragya & Samarth)

- **All 5 chapters complete & playable**:
  - `ch1-first-earnings` (12 months): intro/outro, prompts, scaled event weights, festival-gift and bike-repair events.
  - `ch2-first-job`: 5 annual turns, FD vs SIP, market storm, OTP scam, emergency fund tasks.
  - `ch3a-salaried`: fixed costs (home loan EMI), term insurance, retirement plans, hospital stay events.
  - `ch3b-business`: shop upgrade / delivery van with earnings bonus, stock damage, festival rush.
  - `ch4-legacy`: estate planning, child education fund, parent care, grand goals.
- **Events and Scams**: 8 life events + 5 income-scaled events; 8 scams extended to chapters 3 and 4.
- **Gyaan Check & Prompts**: 3 questions and 3 discussion prompts each for all 4 distinct chapter types.
- **Bot logic**: SIP and RD investment amounts scale proportionally with chapter income.

### 3.4 Engine (`packages/engine`, Samarth)

- Deterministic game simulation in pure TypeScript: month-by-month turn advances (12 steps in year-long turns), rupee-cost averaging, emergency fund drawdown, forced borrowing order.
- Health Score & Life Report evaluation with What-if replay transforms (`ignoreScams`, `startSip`, `moveShare`, `emergencyFundFirst`, `holdThroughCrash`).
- Multiplayer rules engine, loan agreements with trust-based bank rates, sealed auctions, pool bids with largest remainder math, and room bot personalities.

### 3.5 Web app (`apps/web`)

- Next.js 16.4 App Router with React 19, Tailwind 4, and `next-intl` (en, te, hi, ur).
- **Friends' Room screens (Wired & Live)**:
  - `useCreateRoom()` hook enables authenticated players to host live multiplayer rooms on the server.
  - Real-time action dispatching via `useRoom` (`submitTurn`, `requestLoan`, `offerLoan`, `acceptLoan`, `repayLoan`, `placeBid`, `joinPool`, `react`, `tick`).
  - Correct turn counter display ("Year 1 of 5"), translated task/event titles, and accurate turn-due indicators.
- **Student Screens**:
  - Money Mindset pre-check and post-check ("how you changed"), persona reveal, Life Ladder.
  - Turn screen with Amount + Real Value display, shop modal, amount picker, 3D coin toss with Web-Audio sound.
  - Scam modal with Red Flags breakdown (fixed z-index overlay stacking).
  - Life Report with Health Score, What-if chart, Gyaan Check, and badge unlocks.
- **NGO Dashboard**:
  - Overview cards driven by real `org_*_v` views (engagement, health score, scam safety, learning gain).
  - Code generation with batch cohorts, player ID linking, and printable slips.
  - Student roster management and password resets.

### 3.6 Database (`supabase/`, Prathmesh & Samarth)

- **5 migrations applied in sync**:
  1. `20261010000000_accounts.sql`: organizations, profiles, groups, student_codes, mindset_responses, playthroughs, chapter_results, decisions, badges with RLS.
  2. `20261010000001_stats_views.sql`: 7 views filtered by org admin rights.
  3. `20261010010000_rooms_init.sql`: rooms, room_members, room_views, loans, auctions, bid_pools, bids with RLS and column protections.
  4. `20261010020000_atomic_code_redeem.sql`: atomic, rate-limited code redemption RPC function.
  5. `20261010030000_fix_org_seats_view.sql`: decoupled seat counting query preventing code × profile multiplication.
- **Edge Functions**:
  - `room-action`: Bundled ESM handler running under Deno, handling transactional room updates, turn resolution, and state projections. Deployed to Supabase cloud.

---

## 4. Decisions made

1. **Atomic Code Redemption**: Replaced client-side check-then-update with an atomic SQL transaction function to prevent race conditions.
2. **Migration Renumbering**: Prathmesh's new redemption migration was numbered `20261010020000`, so the org seats view fix was renumbered to `20261010030000`. History table repaired with `--status reverted 20261010020000` to allow clean application.
3. **Turn Zero Indexing**: Engine turns are 0-based; multiplayer turn headers add 1 to show intuitive "Year 1 of 5".
4. **Income-Proportional Bots**: Bot investments in SIPs and recurring deposits are calculated as percentages of chapter base income to generalize across chapters 1–4.
5. **Next Dev Env Loading**: `next.config.ts` explicitly loads repo root `.env.local` so Next.js apps in monorepos receive cloud credentials.

---

## 5. Balance (`pnpm sim --runs 400`)

| Chapter | Strategy | Pass Rate | Balance Notes |
| --- | --- | --- | --- |
| Chapter 1 | Balanced | 87% | Early income stability, modest savings |
| Chapter 2 | Balanced | 98% | Passes growth & emergency fund targets |
| Chapter 2 | All-Cash | 96% | Fails growth component as intended (§10) |
| Chapter 2 | Impulsive | 67% | High scam fall rates reduce score |
| Chapter 3A | Balanced | 100% | Steady salaried salary + home loan EMI manageable |
| Chapter 3B | Balanced | 95% | Business cashflow volatility balanced by working capital |
| Chapter 4 | Balanced | 100% | High terminal wealth, retirement targets achieved |
| Chapter 4 | All-Cash | 0% | Severe inflation penalty fails chapter (§10) |

---

## 6. Known issues & remaining tasks

1. **Vercel Cloud Deployment**:
   - The repository needs to be imported/connected via the Vercel dashboard.
   - Set the 6 environment variables on Vercel from `.env.local`.
   - Build command override: `pnpm content:build && pnpm --filter web build`.
2. **Telugu Localization**:
   - Complete remaining UI strings (~111 keys remaining in `messages/te.json`).
3. **PWA Offline Mode**:
   - Cache single-player assets in `public/sw.js` for zero-connectivity gameplay.

---

## 7. Demo Checklist for Judges (§13)

- [x] **Step 1 — Admin Setup:** NGO Facilitator logs in, creates a batch cohort, generates student codes with printable slips.
- [x] **Step 2 — Student Join:** Student redeems code atomically, sets nickname, completes Money Mindset Check, receives persona.
- [x] **Step 3 — Gameplay:** Student plays through life events, market crashes, and scam alerts.
- [x] **Step 4 — Life Report:** Health Score breakdown, What-if replay analysis, and Gyaan Check verification.
- [x] **Step 5 — Friends' Room:** Real server room creation with `useCreateRoom()`, peer lending, auction bidding, and lockstep turns.
- [x] **Step 6 — Analytics:** NGO dashboard displays live aggregated cohort metrics from PostgreSQL views.
