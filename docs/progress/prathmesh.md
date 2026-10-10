# Prathmesh — progress

## Done

- **Day zero (2026-10-10):** pnpm monorepo, root config, `.env.example`, README, Supabase init, accounts migration, db-types placeholder, Supabase clients, persistence API mock, welcome/join/admin placeholder routes, Playwright smoke test.
- **CI Workflow Setup:** Activated GitHub Actions CI workflow in `.github/workflows/ci.yml` running validation, builds, linting, typechecking, and Vitest suite across monorepo.
- **Supabase SSR Session Refresh in `proxy.ts`:** Integrated `@supabase/ssr` server client into Next.js 16 `proxy.ts` (middleware) to auto-refresh auth tokens, synchronize cookies with response headers, and seamlessly maintain user sessions.
- **Database Types (`@toss/db-types`):** Built complete TypeScript type definitions in `packages/db-types/src/database.ts` representing all tables (`organizations`, `profiles`, `groups`, `student_codes`, `playthroughs`, `chapter_results`, `decisions`, etc.), stats views, RPC functions, and enums from the Postgres migrations. Fully compatible with PostgREST generic schema type inference.
- **Real Supabase Persistence Layer (`lib/data/`):**
  - Reconciled persistence API contract: `startPlaythrough(personaId, seed, initialState?)` and `savePlaythroughState(id, state)`.
  - Implemented `supabasePersistence` in `apps/web/lib/data/supabase.ts` with transparent IndexedDB / localStorage offline queuing for decision records and immediate local caching for single-player resilience.
  - Implemented dynamic `useSession()` hook in `apps/web/lib/data/index.ts` listening to `onAuthStateChange` with profile and organization loading.
- **Auth & Admin Server Actions (`lib/auth/actions.ts`):** Implemented `redeemStudentCode`, `signUpNgo`, `signUpPersonal`, `loginUser`, `signOutUser`, `generateStudentCodes`, `revokeStudentCode`, and `resetStudentPassword` using Supabase SSR server and admin clients.
- **Atomic Code Redemption Function:** Implemented Supabase Edge Function `supabase/functions/redeem-code/index.ts` with SHA-256 code hashing, 5 attempts/min rate limiting, synthetic student email creation, and transaction integrity.
- **SQL Statistics Views Migration (`20261010000001_stats_views.sql`):** Created views for the NGO dashboard mapping engine `DECISION_TYPES`:
  - `org_seats_v`: Pending, active, expired, revoked codes and student counts.
  - `org_engagement_v`: 7-day and 30-day active student tracking, playthroughs, and chapters completed.
  - `org_persona_distribution_v`: Student distribution across personas.
  - `org_learning_gain_v`: Pre vs. post mindset check scores (planning, risk, knowledge).
  - `org_scam_stats_v`: Scams faced, fallen, spotted, and fall rate percentages.
  - `org_chapter_stats_v`: Attempts, pass rates, and average health score per chapter.
  - `org_student_detail_v`: Detailed student cohort progress and badge totals.
- **Student Onboarding UI (`join/page.tsx`):** Built interactive mobile-first screen with tabs for NGO Code redemption (8-char format with avatar and nickname selection), Personal Learner signup, and User Login.
- **NGO Admin Dashboard UI (`admin/page.tsx`):**
  - Cohort statistics cards (enrolled learners, active 7d, average health score, scam safety rate).
  - Learning gain progress indicators (pre vs. post across the 4 learning pillars).
  - Student code generator (bulk 1–50 codes, batch labelling, single-click CSV export, revoke capabilities).
  - Student cohort table with password reset action.
  - Facilitator classroom discussion guides for Chapter 2.
- **Demo Seed Script (`scripts/seed.ts`):** Implemented cohort simulation for 1 NGO and 40 students utilizing Samarth's engine and bot strategies (`balanced`, `all-cash`, `all-equity`). Generated `supabase/seed.sql` (1,700 lines of verified test data).

- **Merged into `main`** (2026-10-10). Review fixes in your paths are listed in `docs/requests/prathmesh.md` ("From the merge review"); open items are 17–22.

## In progress

- (All priority tasks completed and verified with passing tests and builds)

## Verification Status

- `pnpm content:validate`: PASS
- `pnpm lint`: PASS (0 errors, 0 warnings across all packages and web app)
- `pnpm typecheck`: PASS (0 errors across monorepo and scripts)
- `pnpm test`: PASS (7/7 test files, 40/40 unit tests passing)
- `pnpm build`: PASS (Turbopack production build compiled with all static and partial prerender routes)
