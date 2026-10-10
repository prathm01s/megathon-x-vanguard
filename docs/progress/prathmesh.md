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

- **Merged into `main`** (2026-10-10).
- **Atomic Code Redemption & Rate Limiting Migration (`20261010020000_atomic_code_redeem.sql`):**
  - Built persistent rate-limiting table `code_redemption_attempts` with RLS and indexed lookup.
  - Implemented atomic `redeem_student_code_claim(p_code_hash text, p_ip text)` checking 5 attempts/min rate limit per IP and transitioning codes from `pending` to `active` in one atomic operation.
  - Implemented compensation `redeem_student_code_revert` and `redeem_student_code_finalize` RPCs.
  - Updated `redeemStudentCode` in `apps/web/lib/auth/actions.ts` to execute atomic claims with rollback guarantees.
  - Comprehensive PGlite unit test in `supabase/tests/redeem-atomic.test.ts` verifying concurrent protection and rate limiting.
- **Personal Learner Username Login Fix:**
  - Resolved login failure for personal learners registering with real emails by adding server-side username → email resolution via `profiles` and Supabase Admin auth client.
- **Dynamic First-Time Student Login Redirection:**
  - `loginUser` now dynamically routes new students without a completed Money Mindset Check or active playthrough to `/mindset`, while returning students go directly to `/play`.
- **Database Types Synchronization (`@toss/db-types`):**
  - Updated `packages/db-types/src/database.ts` with all room tables (`rooms`, `room_members`, `room_views`, `loans`, `auctions`, `bids`, `bid_pools`, `bid_pool_members`), missing views (`org_seats_v`, `org_student_detail_v`), and new RPCs.

- **Personal Learner Linking by Player ID (`TL-XXXXX`) (§4.4, §15.6 #7):**
  - Added server actions `sendJoinRequestByPlayerId`, `getStudentPendingJoinRequests`, `respondToJoinRequest`, and `getOrgJoinRequests`.
  - Added "Link Personal Learner by Player ID" card in Admin Portal with real-time invitation dispatch and sent request tracking.
  - Added student-side invitation card in `apps/web/components/game/profile.tsx` allowing personal learners to Accept (linking to NGO cohort while preserving progress/badges) or Decline.
- **NGO Group / Batch Management (§4.1, §4.6):**
  - Added server actions `createOrgGroup` and `getOrgGroups`.
  - Added batch selector dropdown + inline "+ New Batch" creator in the code generation panel, allowing codes to be tagged directly to classroom cohorts.
  - Added batch cohort filter on the students list.
- **Printable Code Handout Slips Modal (§4.3, §15.6 #6):**
  - Designed printable student access pass slips modal with Toss Life branding, single-use codes, instructions for `/join`, and dashed cutoff guidelines.
  - Implemented `@media print` CSS rules isolating printable cards and hiding web chrome on `window.print()`.
- **Offline Persistence & Mock Resilience:**
  - Upgraded persistence decision logging to IndexedDB with automatic localStorage fallback.
  - Added graceful fallback to `mockPersistence` in `apps/web/lib/data/index.ts` and `supabase.ts` when remote Supabase credentials are not configured (local dev, offline, and CI environments).
- **Playwright End-to-End Test Suite for Demo Path (`apps/web/e2e/demo.spec.ts`) (§13, §15.6 #13):**
  - Built comprehensive mobile-first E2E test covering the full demo journey:
    1. Welcome screen routes to Student and NGO paths.
    2. Student onboarding `/join` tabs (NGO Code, Personal, Login).
    3. Money Mindset Pre-Check (answering all 6 questions sequentially).
    4. Persona Reveal Screen (money style, strengths, blind spots).
    5. Life Ladder navigation with unlocked Chapter 2 (`ch2-first-job`).
    6. Chapter 2 gameplay turn screen and coin toss.
    7. Friends' Room multiplayer classroom (`/en/room` & `/en/room/TOSS42`).
    8. Student profile displaying Player ID (`TL-...`).
    9. NGO Admin Portal with cohort management, code generator, and printable slips modal.
  - All 4 Playwright tests passing on Pixel 5 mobile viewport.

## In progress

- Final review and verification before pull request.

## Verification Status

- `pnpm content:validate`: PASS
- `pnpm lint`: PASS (0 errors, 0 warnings across monorepo)
- `pnpm typecheck`: PASS (0 errors across monorepo, web, scripts, and supabase tests)
- `pnpm test`: PASS (24/24 test files, 155/155 unit & integration tests passing)
- `pnpm test:e2e`: PASS (4/4 Playwright tests passing on mobile Pixel 5 emulator)

