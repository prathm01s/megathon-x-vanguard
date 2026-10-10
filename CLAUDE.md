# CLAUDE.md — Toss Life

This file is the single source of truth for building **Toss Life**. Read it fully before writing code. When something here conflicts with your defaults, this file wins. When something is unclear, check the **Open questions** section, pick the documented default, and leave a `// DECISION:` comment so the team can review it.

**Three people build this in parallel: Samarth, Prathmesh and Pragya.** Before doing any work, read **§15 Team and work split**, find out which of them you are working for (ask if it isn't stated, or read `TOSS_DEV` from `.env.local`), and stay inside that person's owned areas.

---

## 1. What we are building

**Toss Life** is a multiplayer, mobile-first life-simulation game that teaches financial literacy to Grade 11–12 students, particularly from underserved communities in Hyderabad, India. It is built for a Vanguard India community-stewardship hackathon. The pilot targets ~1,500 students delivered through NGOs and must be designed to scale.

**Tagline:** *Life tosses the coin. Your choices decide where it lands.*

Students live a whole financial life with virtual money, from first earnings to retirement. Each chapter is a life stage. They get income and a task list, decide to spend / save / invest / lend, then time fast-forwards and a **coin toss** decides luck (market years, life events). Preparation decides how much luck hurts or helps. A **Life Report** at the end of each chapter explains what went well, what could be better, and shows a **"What if"** replay of a smarter path.

### The four learning pillars (from the problem statement)
1. **Plan & budget** — needs vs. wants, choices, goals
2. **Save & manage** — habits, spending, unexpected needs
3. **Understand investing** — risk, time, compounding, diversification (**the major focus**)
4. **Stay financially safe** — protect information, spot suspicious offers

### Success criteria (the judges' checklist)
Simple · Relatable · Persona-led · Language-ready · Game-based · Intuitive UI · NGO-integrated. Keep the experience educational, scalable and privacy-conscious.

### Core message on investing
Do **not** teach "mutual funds always beat FDs." Teach: *the right choice depends on the goal and how long you can wait; over long periods, diversified investing and SIPs usually grow wealth more than cash or FDs alone, with ups and downs along the way.* The key UI device is **Real Value** (inflation-adjusted value) shown next to every amount.

### Non-negotiable guardrails
- **Educate, never recommend.** No real fund, bank, AMC, broker, app or company names anywhere in the product. Use fictional names (e.g., "Sunrise Equity Fund", "Big Bank FD").
- **Simulations are assumptions, not promises.** Every return figure shown to students carries an "assumed" label with a tooltip: *"This is a guess based on past patterns, not a promise."*
- Market options must be able to lose money in a bad year.
- Life Report text explains trade-offs; it never says "buy X".
- Scam content uses only fictional brands and must be clearly in-game.
- **No sensitive student data** (see §6 Privacy).

---

## 2. Tech stack

Use the latest stable version of each tool at the time you set up the repo. Verify versions with the package registry; do not pin to versions from memory.

| Layer | Choice | Why |
| --- | --- | --- |
| Language | **TypeScript** (strict mode) everywhere | One language for app, engine, content tooling |
| Package manager | **pnpm** | Fast, workspace support |
| Repo layout | **pnpm workspaces** monorepo (no Turborepo unless builds get slow) | Engine and content are independent, testable packages |
| Web app | **Next.js** (App Router, React Server Components where sensible) | Routing, server actions, easy deploy |
| PWA | `@serwist/next` (or the current maintained Next.js PWA solution) | Installable from a link, offline play |
| Styling | **Tailwind CSS** + **shadcn/ui** (Radix primitives) | Accessible components, fast iteration |
| Animation | **Framer Motion** (`motion`) | Coin toss, time skip, growth tree |
| Client state | **Zustand** | Game session state |
| Server state | **TanStack Query** | Caching, offline-friendly fetching |
| Validation | **Zod** | Content schemas, forms, API inputs |
| Backend | **Supabase** — Postgres, Auth, Realtime, Row Level Security, Edge Functions | Auth + DB + realtime multiplayer in one |
| DB migrations | **Supabase CLI** SQL migrations in `supabase/migrations` | Versioned schema |
| DB types | `supabase gen types typescript` → `packages/db-types` | Typed queries |
| i18n (UI chrome) | **next-intl** | Locale routing, RTL support |
| i18n (game content) | Inline localized strings in content files (see §8) | Content editors edit one file |
| Content format | **YAML** files in `content/`, validated by Zod, compiled to JSON | Human-editable, supports comments |
| Charts (dashboard) | **Recharts** | Admin statistics |
| Testing | **Vitest** (unit, engine), **Playwright** (e2e), **@testing-library/react** | Engine must be heavily tested |
| Lint/format | **ESLint** + **Prettier** | Consistency |
| CI | **GitHub Actions** | Lint, typecheck, test, content validation |
| Hosting | **Vercel** (web) + **Supabase Cloud** (backend) | Free tiers suffice for the hackathon |
| RNG | `seedrandom` (or a tiny in-house seeded PRNG) | Deterministic replays and "What if" |

---

## 3. Repository setup (do this first)

### 3.1 Create the repo
1. `git init`, default branch `main`. Create a GitHub repo named `toss-life` (private) and push.
2. Add `.gitignore` (Node, Next.js, Supabase `.branches`, `.temp`, `.env*` except `.env.example`).
3. Add `README.md` with: what it is, prerequisites (Node LTS, pnpm, Docker for local Supabase), setup steps, scripts.
4. Add `LICENSE` only if the team asks; default none.
5. Add `.editorconfig`, `.nvmrc` (Node LTS), `.prettierrc`, ESLint config.

### 3.2 Folder structure

```
toss-life/
├── CLAUDE.md
├── README.md
├── package.json                 # root scripts
├── pnpm-workspace.yaml
├── .github/workflows/ci.yml
├── apps/
│   └── web/                     # Next.js app
│       ├── app/
│       │   ├── [locale]/
│       │   │   ├── (public)/        # welcome, login, signup, join
│       │   │   ├── (student)/       # play, chapters, room, report, profile
│       │   │   ├── (ngo)/           # NGO admin dashboard
│       │   │   └── dev/             # content preview & sim tools (dev only)
│       │   └── api/                 # route handlers if needed
│       ├── components/
│       │   ├── ui/                  # shadcn components
│       │   ├── game/                # wallet, task list, toss, growth tree, report
│       │   ├── multiplayer/         # room, loans, auction
│       │   └── dashboard/           # charts, tables
│       ├── lib/                     # supabase clients, auth helpers, hooks
│       ├── messages/                # next-intl UI strings: en, te, hi, ur
│       └── public/                  # icons, manifest, sounds
├── packages/
│   ├── engine/                  # PURE TypeScript simulation engine (no React, no DB)
│   │   ├── src/
│   │   │   ├── rng.ts
│   │   │   ├── persona.ts           # mindset scoring + persona rules
│   │   │   ├── economy.ts           # inflation, salary growth
│   │   │   ├── market.ts            # market toss, option returns
│   │   │   ├── portfolio.ts         # holdings, SIPs, liquidity, penalties
│   │   │   ├── tasks.ts             # due dates, fines, completion
│   │   │   ├── events.ts            # life events, scam triggering
│   │   │   ├── loans.ts             # interest, trust score
│   │   │   ├── auction.ts           # bids, pool bids, payouts
│   │   │   ├── score.ts             # Financial Health Score
│   │   │   ├── report.ts            # Life Report + "What if"
│   │   │   ├── conditions.ts        # rule/condition DSL evaluator
│   │   │   ├── metrics.ts           # registry of metrics the DSL can read
│   │   │   ├── bots.ts              # bot strategies for solo multiplayer
│   │   │   └── index.ts
│   │   └── test/
│   ├── content/                 # content schemas + loader + compiler
│   │   ├── src/schemas/*.ts     # Zod schemas, one per content type
│   │   ├── src/load.ts          # read YAML → validate → typed bundle
│   │   ├── src/build.ts         # writes dist/content.json (+ JSON Schemas)
│   │   └── src/validate.ts      # CLI: cross-references, ids, locales
│   └── db-types/                # generated Supabase types
├── content/                     # ← EDITABLE GAME CONTENT (YAML). No code here.
│   ├── README.md                # how to edit content (for non-developers)
│   ├── config/
│   │   ├── economy.yaml
│   │   ├── market.yaml
│   │   ├── health-score.yaml
│   │   ├── multiplayer.yaml
│   │   └── locales.yaml
│   ├── onboarding/
│   │   ├── mindset-questions.yaml
│   │   └── personas.yaml
│   ├── chapters/
│   │   ├── ch1-first-earnings.yaml
│   │   ├── ch2-first-job.yaml
│   │   ├── ch3a-salaried.yaml
│   │   ├── ch3b-business.yaml
│   │   └── ch4-legacy.yaml
│   ├── investments/
│   │   ├── options.yaml
│   │   └── techniques.yaml
│   ├── events/
│   │   ├── life-events.yaml
│   │   └── scams.yaml
│   ├── multiplayer/
│   │   └── auctions.yaml
│   ├── report/
│   │   ├── life-report-rules.yaml
│   │   ├── gyaan-check.yaml
│   │   └── badges.yaml
│   └── ngo/
│       └── discussion-prompts.yaml
├── scripts/
│   ├── sim.ts                   # run N simulated playthroughs for balancing
│   └── seed.ts                  # demo seed data
└── supabase/
    ├── config.toml
    ├── migrations/
    ├── seed.sql
    └── functions/               # Edge Functions (room actions, code redemption)
```

### 3.3 Root scripts (`package.json`)
- `dev` — run Next.js dev server (and content watch)
- `build` — build content, then web
- `content:build` — compile `content/**/*.yaml` → `packages/content/dist/content.json`
- `content:validate` — schema + cross-reference + locale coverage checks
- `content:watch` — rebuild content on change
- `test` — Vitest across packages
- `test:e2e` — Playwright
- `lint`, `typecheck`, `format`
- `sim` — `tsx scripts/sim.ts --runs 1000 --chapter ch2` → prints outcome distributions per bot strategy
- `db:start`, `db:reset`, `db:types`, `db:migrate`

### 3.4 Environment
Create `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only, never exposed to client
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_APP_URL=http://localhost:3000
STUDENT_EMAIL_DOMAIN=students.tosslife.invalid   # synthetic emails for username-only students
TOSS_DEV=                         # samarth | prathmesh | pragya — tells Claude Code whose track to work on (local only)
```

### 3.5 CI (`.github/workflows/ci.yml`)
On every push and PR: install with pnpm (cached) → `content:validate` → `lint` → `typecheck` → `test`. Playwright runs on PRs to `main` only.

### 3.6 Git conventions
- Branches: `feat/<short-name>`, `fix/<short-name>`, `content/<short-name>`.
- Conventional commits (`feat:`, `fix:`, `content:`, `chore:`, `test:`).
- Commit after each completed task in §12. Keep commits small.

---

## 4. Accounts, roles and organisations

### 4.1 Roles
| Role | Who | Belongs to |
| --- | --- | --- |
| `ngo_admin` | The single administrator of an NGO | Exactly one NGO; each NGO has **exactly one** admin |
| `student` | A learner | Zero or one NGO |

### 4.2 First-launch flow
```
App opens → "Are you a student?"  |  "Are you an NGO?"

NGO     → Create NGO account (NGO name, admin email, password)
          → creates organisation + ngo_admin profile

Student → "Are you part of an NGO?"  |  "Are you learning finance personally?"
          NGO       → enter Student Code (from NGO admin)
                      → choose nickname + avatar + password
                      → account created, linked to that NGO
          Personally → create account: username + password (email optional, for recovery)
                       → account not linked to any NGO
          (Both) → Money Mindset Check → persona → first chapter
```
Also provide **Log in** on the first screen for returning users (username or email + password).

### 4.3 Student Codes (NGO admin creates student accounts)
- Admin taps **Create student account** → generates a unique **Student Code**. Support single and bulk generation (e.g., 40 codes at once).
- Code format: 8 characters from an unambiguous alphabet (no `0/O/1/I/L`), shown as `XXXX-XXXX`.
- Each code is **single use**. On generation the code already counts as a **student seat** in the NGO (status `pending`). On redemption it becomes `active` and is bound to the new student account.
- Codes have an optional expiry (default 30 days, configurable per NGO) and can be revoked while pending.
- Admin can attach an optional private **label** to a code (e.g., "Batch A – roll 12"). Labels are visible only to the NGO admin. Show a hint: *"Avoid full names."*
- Admin can export pending codes as a printable sheet (PDF) and CSV to hand out in class.
- Store only a **hash** of the code plus the last 4 characters for display. Rate-limit redemption attempts (e.g., 5 per minute per IP/device).
- Redemption happens in a Supabase Edge Function (or a server action using the service role) inside one transaction.

### 4.4 Linking a personal learner to an NGO
- Every student has a public **Player ID** (e.g., `TL-7KQ2M`) shown on their profile.
- NGO admin enters a Player ID → a **join request** is sent → the student must **accept** in-app (consent). On accept, the student is linked to the NGO and keeps all progress.
- A student can belong to at most one NGO. Admin can remove a student from the NGO (progress stays with the student).

### 4.5 Authentication details
- Use Supabase Auth email/password for everyone.
- Students without an email get a **synthetic email** `<username>@${STUDENT_EMAIL_DOMAIN}` behind the scenes; never show it to them.
- Usernames: 3–20 chars, lowercase letters, digits, underscore; unique; block obvious real-name patterns is not required, but show a hint to use a nickname.
- **Password reset:** NGO-linked students ask their admin; the admin can set a temporary password from the dashboard (server action with service role). Personal learners with an email use the normal reset flow; without email, show "Add an email in profile to enable recovery."
- NGO admins must use a real email (adults).

### 4.6 Permissions (enforce with RLS, not just UI)
There are only two roles. There is **no teacher role**; the NGO admin runs sessions and sees all statistics.

| Action | Student | Admin |
| --- | --- | --- |
| Play, own saves, own reports | ✅ own | — |
| See own NGO name | ✅ | ✅ |
| Generate / revoke student codes | ❌ | ✅ |
| View statistics | ❌ | Whole NGO, exhaustive |
| View individual student detail | ❌ | ✅ |
| Reset student password | ❌ | ✅ |
| Link personal learner | ❌ | ✅ |
| Create groups / batches (for filtering stats) | ❌ | ✅ |

### 4.7 Admin statistics (exhaustive)
Build the NGO dashboard with filters for group/batch, persona, chapter and date range, plus CSV export of every table.
- **Seats:** codes generated, pending, redeemed, expired, revoked; linked personal learners.
- **Engagement:** active students (7/30 days), sessions, minutes played, chapters started/completed, drop-off funnel by chapter, multiplayer participation.
- **Personas:** distribution at start; persona shifts during play.
- **Learning gain:** Money Mindset Check before vs. after, per question and overall (plan, risk, knowledge scores).
- **Pillar mastery:** heat map of the four pillars per group (derived from score components and Gyaan Check).
- **Financial Health Score:** distribution, average per chapter, weakest component per group.
- **Investing behaviour:** share using each option, SIP adoption, diversification level, emergency-fund adoption, early FD breaks, panic selling after crash tosses.
- **Scam safety:** fall rate per scam type, repeat-scam spot rate.
- **Multiplayer:** loans given/taken, average interest set, on-time repayment rate, defaults, Trust Score distribution, auctions won, pool bids.
- **Gyaan Check:** accuracy per question.
- **Individual student view:** nickname, label, persona, chapter progress, scores, badges, mindset before/after, decision timeline.
- **Discussion prompts:** the current chapter's prompts, ready for a session.

---

## 5. Data model (Supabase / Postgres)

Write SQL migrations. All tables have `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`. Enable RLS on every table.

- `organizations` — `name`, `admin_user_id` (**unique, not null**), `settings jsonb` (code expiry days, etc.)
- `profiles` — `user_id` (pk, fk auth.users), `role` (`ngo_admin|student`), `org_id` nullable, `username` unique, `nickname`, `avatar_id`, `player_id` unique (`TL-XXXXX`), `locale`, `has_recovery_email bool`
- `student_codes` — `org_id`, `code_hash`, `code_last4`, `label`, `group_id` nullable, `status` (`pending|active|expired|revoked`), `expires_at`, `created_by`, `redeemed_by` nullable, `redeemed_at`
- `org_join_requests` — `org_id`, `student_user_id`, `status` (`pending|accepted|declined|cancelled`), `requested_by`
- `groups` — `org_id`, `name` (batches created by the admin, used to organise codes and filter stats)
- `group_members` — `group_id`, `student_user_id`
- `mindset_responses` — `user_id`, `phase` (`pre|post`), `answers jsonb`, `scores jsonb` (`plan`, `risk`, `know`), `persona_id`, `content_version`
- `playthroughs` — `user_id`, `persona_id`, `seed`, `content_version`, `current_chapter_id`, `status`, `state jsonb` (engine snapshot)
- `chapter_results` — `playthrough_id`, `chapter_id`, `attempt`, `health_score`, `score_breakdown jsonb`, `report jsonb`, `passed bool`, `completed_at`
- `decisions` — `playthrough_id`, `chapter_id`, `turn`, `type`, `payload jsonb` (append-only event log; drives analytics and replays)
- `gyaan_answers` — `playthrough_id`, `chapter_id`, `question_id`, `correct bool`
- `badges_earned` — `user_id`, `badge_id`, `earned_at`
- `rooms` — `code` unique, `org_id` nullable, `host_user_id`, `chapter_id`, `status` (`lobby|playing|finished`), `turn`, `seed`, `state jsonb`
- `room_members` — `room_id`, `user_id` nullable, `is_bot`, `bot_strategy`, `seat`, `trust_score`
- `loans` — `room_id`, `lender_member_id`, `borrower_member_id`, `principal`, `rate_per_turn`, `interest_type` (`simple|compound`), `due_turn`, `status` (`requested|offered|active|repaid|late|defaulted|declined`), `repaid_amount`
- `auctions` — `room_id`, `auction_def_id`, `turn`, `status`, `winner_member_id`, `winning_bid`
- `bids` — `auction_id`, `member_id` nullable, `pool_id` nullable, `amount`
- `bid_pools` / `bid_pool_members` — pooled bids with each member's contribution share

Create **SQL views** (or RPC functions) for dashboard statistics so the dashboard queries stay simple and RLS-safe, e.g. `org_engagement_v`, `org_persona_distribution_v`, `org_learning_gain_v`, `org_scam_stats_v`, `org_loan_stats_v`.

**RLS summary:** students read/write only their own rows; admins read all rows where `org_id` = their org; room data readable by room members; all multiplayer writes go through Edge Functions/RPCs that validate turn order and balances (never trust the client).

---

## 6. Privacy and safety
- Never collect students' real names, phone numbers, income, caste, religion, address, school name, photos or location. The persona is built only from the 6 indirect questions.
- Students use a nickname and a preset avatar (no uploads).
- Code labels are admin-only and should not be full names (show a hint).
- Analytics are first-party only (the `decisions` table). No third-party trackers or ads.
- No free-text chat between students in multiplayer. Use preset reactions/emotes only (minors' safety).
- Keep the `SUPABASE_SERVICE_ROLE_KEY` server-side only.

---

## 7. The game — rules the engine must implement

All numbers below are **initial defaults** and live in content files (§8). Never hardcode them in engine or UI code.

### 7.1 Core loop (every chapter)
1. **Earn** — income for the turn (stipend / salary / business earnings).
2. **Tasks** — a to-do list with due turns: needs, goals, social wants, "build a safety net".
3. **Decide** — allocate every rupee: spend on a task, keep as cash, invest (lump sum or start/stop SIP), lend/borrow (multiplayer), bid (auctions).
4. **Toss** — time advances one turn. A **market toss** sets the market state for the turn; a **life toss** may trigger a life event; scams may appear. Inflation raises prices.
5. **Review** — at chapter end: Financial Health Score, Life Report, "What if", Gyaan Check.

Turn unit and count are per chapter (`turnUnit: month|year`, `turns: n`). Internally the engine may compute monthly steps (e.g., for SIPs) and aggregate.

### 7.2 Determinism
- Every playthrough and room has a `seed`. All randomness uses the seeded RNG with separate streams for market, life events and scams.
- **"What if" replay** = re-run the chapter with the same seed and one changed decision; the difference is purely due to the decision. This is essential — test it.

### 7.3 Money, Real Value and liquidity
- Show **Amount** and **Real Value** (amount ÷ cumulative inflation index since chapter start) next to balances and investments.
- Liquidity per option: `instant`, `locked_until_maturity` (with early-break penalty), or `market` (withdrawable at current value, which may be below cost).
- Missed task due dates apply the task's `lateFine` and/or `consequence` (e.g., blocks a goal next chapter).

### 7.4 Market toss model
- Each turn, one shared **market state** is drawn from `market.yaml` (e.g., `boom`, `normal`, `crash` with probabilities). All equity-linked options use this shared state (they are correlated). Options can declare their own independent toss (e.g., gold) to make diversification meaningful.
- Each option defines its return per state; the expected value should match its "assumed average" shown to students. `content:validate` must compute and print the expected return per option and warn if it deviates from the displayed assumption by more than 0.5 percentage points.

### 7.5 Persona
See §8.2 and §8.3. Persona affects: starting chapter, whether the guided first turn is shown, mentor tips, event/scam frequency multipliers, and which techniques are highlighted. Persona can shift mid-game when behaviour rules in `personas.yaml` are met (e.g., a Moment Maker who keeps a full emergency fund for 2 chapters becomes a Safe Keeper or Smart Planner).

### 7.6 Multiplayer — Friends' Room
- 3–6 players join with a room code. Empty seats are filled by bots (strategies in `bots.ts`, weights in `multiplayer.yaml`) so solo play works.
- All players play the same chapter in lockstep turns. The market toss is shared; life tosses are individual.
- **Loans:** a player requests a loan (amount, due turn). Others can offer with their own interest rate (bounded by config). The borrower also sees the in-game bank and a loan app offer. Borrower accepts one offer. Repayment = principal + interest (simple or compound per config). On time: Trust Score up; late: fine + Trust Score down; default: lender loses remaining principal, borrower's Trust Score drops sharply. Low Trust Score → bank rate goes up / offers blocked.
- **Opportunity Auctions:** defined per chapter in `auctions.yaml`. Sealed bid by default. Overbidding is allowed (teach value vs. price; the item's true value is revealed after). **Pool Bid:** players combine money; returns are shared pro-rata. After a pool bid resolves, show the **mutual fund reveal**: *"This is how a mutual fund works: many people pool money, it is invested together, and returns are shared by how much each person put in."*
- Server-authoritative: turn resolution, loans and auctions run in Edge Functions/RPCs; clients subscribe via Supabase Realtime.

### 7.7 Scams
- Appear via channels: `message`, `call`, `investment_listing`, `friend_offer` (in rooms, a bot friend can push a "double your money" scheme), `app`.
- Triggers: random with probability, or `after_bad_toss` (higher chance right after a bad life event), modified by persona multipliers.
- Falling for a scam: money lost, **Red Flags card**, and a later **repeat variant** in a new disguise; spotting the repeat earns **Scam Buster**.

### 7.8 Financial Health Score and progression
- Score out of 100 from weighted components (`health-score.yaml`). Default: Tasks on time 25, Safety net 20, Growth (Real Value) 20, Diversification 15, Trust Score 10, Scam safety 10. If a component doesn't apply (e.g., no multiplayer), redistribute its weight proportionally (configurable).
- Pass threshold (default 60) unlocks the next chapter; otherwise replay with a tip on the weakest component.
- Class leaderboards rank by Health Score, **never by wealth**.

### 7.9 Life Report
- **What you did well** (2–3 items), **What could be better** (1–2 items), **What if** (one changed decision with the money difference based on the game's assumptions), **Gyaan Check** (3 questions).
- Items are selected by rules in `life-report-rules.yaml` evaluated against chapter metrics (§8.10). Highest priority matching rules win.

---

## 8. Content system — everything editable without touching code

### 8.1 Principles
- **All game content and tunable numbers live in `content/` as YAML.** Components and the engine read the compiled, typed bundle. A code review must reject hardcoded content (amounts, rates, texts, ids) outside `content/`.
- Every item has a stable `id` (kebab-case). Never reuse or rename ids once played; deprecate with `enabled: false`.
- Every content file has a top-level `version` integer. The bundle gets a combined `contentVersion` (hash). Saves store `contentVersion`; the engine must handle loading a save made with an older version (fall back gracefully; never crash).
- **Localized text** uses the `LocalizedString` type: `{ en: "...", te?: "...", hi?: "...", ur?: "..." }`. Missing locales fall back to `en`. `content:validate` reports translation coverage per locale but does not fail on missing non-English strings (warn only).
- Text supports simple placeholders: `{amount}`, `{option}`, `{years}`, `{difference}`. Amounts are formatted in Indian style (₹1,00,000) by the UI.
- Zod schemas in `packages/content/src/schemas` are the contract. Also emit JSON Schemas so editors get autocompletion (add `# yaml-language-server: $schema=...` to each file).
- `content:validate` checks: schema, unique ids, cross-references (e.g., a chapter referencing an unknown option, scam or event), expected returns vs. displayed assumptions, weights summing to 100, persona rules covering all score combinations, placeholders used correctly, locale coverage.
- `content/README.md` explains, in plain language, how to edit each file and run validation. Write it for non-developers.
- A dev-only route `/dev/content` lists all content with a live preview, and `/dev/sim` runs quick simulations in the browser.

Below are the **initial contents**. Create the YAML files with exactly this data (English text; leave other locales empty for now). The shapes shown are guidance; finalize them in the Zod schemas.

### 8.2 `onboarding/mindset-questions.yaml` — Money Mindset Check
Six indirect questions. None asks about income, family or personal details. Each option adds points to traits: `plan` (0–4 from Q1–Q2), `risk` (0–2 from Q3), `know` (0–6 from Q4–Q6). Each option has an icon id. The same questions are asked again at the end (`phase: post`) to measure learning.

| id | Question | Options → trait points |
| --- | --- | --- |
| `q-gift` | Your friend's birthday is next week. Would you spend ₹500 on a gift? | "Yes, gifts matter" → plan 0 · "I'd spend less or make something" → plan 1 · "Only if I had saved for it" → plan 2 |
| `q-prize-wait` | You win ₹1,000 in a contest. Take it today, or ₹1,300 after 6 months? | "Today" → plan 0 · "Depends on what I need" → plan 1 · "After 6 months" → plan 2 |
| `q-coin-toss` | At a fair, pay ₹100 to toss a coin. Heads you get ₹250, tails nothing. | "Skip it" → risk 0 · "Play once" → risk 1 · "Keep playing until I win" → risk 2 |
| `q-samosa` | Your grandparents say a samosa cost ₹2 when they were young. Why is it ₹20 now? | "Shops got greedy" → know 0 · "Not sure" → know 0 · "Prices rise over time" → know 2 |
| `q-fd-belief` | A relative says, "Keep all your money in an FD, it's the safest." You think: | "Fully agree" → know 0 · "What's an FD?" → know 0 · "Safe but grows slowly" → know 1 · "Depends on the goal" → know 2 |
| `q-prize-message` | A message says: "You won ₹10,000! Pay ₹99 to claim it." You: | "Pay, it's only ₹99" → know 0 · "Ask a friend first" → know 1 · "Ignore and report it" → know 2 |

Also store per-option `insight` text (shown only in the post-game comparison, not during the pre-check, so the pre-check doesn't teach the answers).

### 8.3 `onboarding/personas.yaml`
Each persona: `id`, `name`, `strength`, `blindSpot`, `avatarHint`, `startChapter`, `guidedFirstTurn`, `eventMultipliers` (by event tag), `scamMultiplier`, `highlightTechniques`, `mentorTips[]`. Plus an ordered `assignmentRules` list (first match wins) and `shiftRules`.

| id | Name | Strength | Blind spot | Start | Guided | Scam × | Focus |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `moment-maker` | Moment Maker | Generous, enjoys life | Little saved for surprises | ch1 | yes | 1.0 | budgeting, emergency fund |
| `safe-keeper` | Safe Keeper | Disciplined saver | Keeps everything in cash or FDs | ch1 | yes | 0.8 | inflation, Real Value, SIP |
| `thrill-seeker` | Thrill Seeker | Bold, open to investing | Chases quick returns | ch1 | no | 1.5 | diversification, scams, risk vs. time |
| `smart-planner` | Smart Planner | Patient and informed | Can over-plan and miss opportunities | ch2 | no | 1.0 | asset mix, auctions, goal-based investing |

Default `assignmentRules` (first match wins):
1. `risk == 2` OR (`risk == 1` AND `plan <= 1` AND `know >= 3`) → `thrill-seeker`
2. `plan >= 3` AND `know >= 4` → `smart-planner`
3. `plan >= 2` → `safe-keeper`
4. otherwise → `moment-maker`

Default `shiftRules` (evaluated at chapter end, using §8.10 metrics), e.g.: `moment-maker` with `emergencyFundCovered == true` for 2 chapters → `safe-keeper`; `safe-keeper` with `diversificationCount >= 3` and `sipActiveTurns >= 3` → `smart-planner`; `thrill-seeker` with `scamsFallen == 0` and `diversificationCount >= 3` → `smart-planner`. Show a celebratory "Your money style has grown" screen on shift.

Students can also manually replay as a different persona.

### 8.4 `config/economy.yaml`
- `inflationPerYear: 0.06`
- `salaryGrowthPerYear: 0.08` (salaried chapters)
- `currency: INR`, `numberFormat: en-IN`
- `cashLossChancePerYear: 0.02` (cash at home can be lost/stolen; small amount up to 10%)
- `considerTax: false` (keep simple for v1; documented as an assumption)

### 8.5 `config/market.yaml`
```yaml
states:
  - { id: boom,   probability: 0.30, label: { en: "Boom year" } }
  - { id: normal, probability: 0.50, label: { en: "Normal year" } }
  - { id: crash,  probability: 0.20, label: { en: "Market storm" } }
independentTosses:
  - { id: gold-toss, states: [ { id: up, probability: 0.5 }, { id: down, probability: 0.5 } ] }
```

### 8.6 `investments/options.yaml`
Fields: `id`, `name` (fictional), `category` (`cash|bank|deposit|market|commodity|mix`), `unlockChapter`, `assumedAverageReturn` (shown), `returns` (per market state or per independent toss state, or `fixed`), `liquidity`, `earlyBreakPenalty`, `lockTurns`, `minAmount`, `sipAllowed`, `riskLevel` (1–5), `lesson`, `description`, `icon`.

| id | Display name | Unlock | Assumed avg | Returns by state | Liquidity | Lesson |
| --- | --- | --- | --- | --- | --- | --- |
| `cash` | Cash at home | ch1 | 0% | fixed 0% (+ loss chance) | instant | Inflation quietly eats idle money |
| `savings` | Big Bank Savings Account | ch1 | 3% | fixed 3% | instant | Good for emergencies, not for growth |
| `rd` | Big Bank Recurring Deposit | ch1 | 6.5% | fixed 6.5% | locked, monthly deposits, 1% penalty | Saving as a monthly habit |
| `fd` | Big Bank Fixed Deposit | ch2 | 6.75% | fixed 6.75% | locked, 1% penalty if broken early | Safe and fixed, but slow after inflation |
| `gold` | Golden Coin Savings | ch2 | 8% | gold-toss up +18%, down −2% | market | Not as safe as people assume |
| `equity-fund` | Sunrise Equity Fund | ch2 | ~11% | boom +30%, normal +12%, crash −18% | market, SIP allowed | Time and regular investing beat timing |
| `debt-fund` | Steady Debt Fund | ch3 | 7% | boom +8.5%, normal +7%, crash +5.5% | market, SIP allowed | Middle ground between FD and equity |
| `index-fund` | Whole Market Index Fund | ch3 | ~10.9% | boom +29.5%, normal +11.5%, crash −18.5% | market, SIP allowed | Low cost, broad diversification |
| `asset-mix` | Balanced Mix Plan | ch3 | blend | computed from a configurable mix (e.g., 50% index, 30% debt, 20% gold) | market | Diversification protects against bad tosses |

(Adjust probabilities/returns so expected values match the displayed assumptions; `content:validate` checks this. **All rates are illustrative and to be confirmed with Vanguard mentors.**)

### 8.7 `investments/techniques.yaml`
Each technique: `id`, `title`, `shortExplanation`, `visual` (UI component key), `unlockChapter`, `triggerTips` (conditions on metrics → contextual tip), `gyaanQuestionIds`.

| id | Title | Visual | Taught by |
| --- | --- | --- | --- |
| `compounding` | Compounding: returns earn returns | `growth-tree` | Growth tree grows each turn money stays invested |
| `sip-rupee-cost-averaging` | SIP and rupee-cost averaging | `units-bought-chart` | Fixed monthly amount buys more units in crash years |
| `diversification` | Diversification | `split-pie` | A bad toss hits only part of a spread portfolio |
| `risk-vs-time` | Risk vs. time | `horizon-slider` | Long goals can take more risk; short-term money stays safe |
| `goal-based-investing` | Goal-based investing | `goal-buckets` | Emergency fund first, then short-term safe, long-term growth |
| `real-value` | Real Value and inflation | `real-value-badge` | Amount vs. what it can buy |
| `stay-invested` | Don't panic-sell in storms | `storm-timeline` | Selling in a crash locks in losses |

### 8.8 `chapters/*.yaml`
Fields: `id`, `order`, `title`, `ageRange`, `stage`, `turnUnit`, `turns`, `startingBalance`, `income` (amount per turn, growth, variability for business), `fixedExpenses[]` (auto-deducted per turn), `tasks[]`, `unlockOptions[]`, `lifeEventPool[]` (event ids + weight overrides), `scamPool[]`, `auctionIds[]`, `next` (chapter id or `choice` between ids), `passThreshold` override, `intro` and `outro` text, `discussionPromptIds`.

Task fields: `id`, `title`, `kind` (`need|goal|want|safety`), `amount`, `dueTurn`, `required` (bool), `lateFine`, `consequence` (e.g., `blockGoal:<id>` next chapter), `inflationAdjusted` (bool), `pillar`.

**Chapter list:**
| id | Title | Age | Turns | Next |
| --- | --- | --- | --- | --- |
| `ch1-first-earnings` | First Earnings | 18–21 | 12 months | `ch2-first-job` |
| `ch2-first-job` | First Job | 22–27 | 5 years | choice: `ch3a-salaried` / `ch3b-business` |
| `ch3a-salaried` | Path: Salaried | 28–40 | 12 years | `ch4-legacy` |
| `ch3b-business` | Path: Business | 28–40 | 12 years | `ch4-legacy` |
| `ch4-legacy` | Legacy | 41–60 | 20 years | end |

**Chapter 2 (the hackathon prototype — build this fully first):**
- `startingBalance: 15000`
- `income`: salary ₹30,000/month (₹3,60,000/year), `salaryGrowthPerYear` from economy config
- `fixedExpenses`: rent + food ₹15,000/month; money sent home ₹3,000/month (both inflation-adjusted)
- Unlocks: `savings`, `rd`, `fd`, `gold`, `equity-fund`
- Tasks:
  - `ch2-friend-wedding` — Friend's wedding gift and travel, want, ₹5,000, due year 1, not required
  - `ch2-emergency-fund` — Build an emergency fund of 3 months' expenses (₹54,000), safety, due year 2, required
  - `ch2-sister-fees` — Sister's college fees, need, ₹25,000, due year 2, required, late fine ₹2,000, consequence: block a goal next chapter
  - `ch2-laptop` — Laptop for an upskilling course, goal, ₹40,000, due year 3, not required (unlocks a salary bonus +5% if done)
  - `ch2-two-wheeler` — Two-wheeler to commute, goal, ₹70,000, due year 5, not required
- Life events pool: `medical-emergency`, `phone-broken`, `job-break`, `family-wedding`, `bonus`, `promotion`
- Scam pool: `otp-unblock-call`, `instant-loan-app`, `job-fee-offer` (repeat variant)
- Auctions: `used-bike-auction` (year 4)

**Chapters 1, 3A, 3B, 4:** create the files with the outline below; full numbers can be filled in later (mark `enabled: false` until complete, but keep them on the Life Ladder map as locked).
- **Ch1 First Earnings:** stipend/part-time pay ~₹6,000/month; tasks: phone bill (need), college fee share (need), friend's birthday gift (want), save for a phone (goal), start a safety jar (safety). Options: cash, savings, rd. Multiplayer: first small loans. Scams: `prize-fee-message`, `job-fee-offer`.
- **Ch3A Salaried:** promotions, home loan EMI (introduce EMIs), health insurance task, child-planning goal. Unlock: debt-fund, index-fund, asset-mix. Scams: `guaranteed-weekly-returns-group`, `fake-trading-app`. Auction: pooled bid on a property.
- **Ch3B Business:** variable monthly income (good/bad months), inventory, business loan, reinvest-vs-invest decisions, separating shop and personal money. Unlock: debt-fund, index-fund, asset-mix. Scams: `friend-ponzi-scheme`, `guaranteed-weekly-returns-group`. Auction: shop space with partners (pool bid).
- **Ch4 Legacy:** children's education goal, retirement goal, gradually shifting toward safer options as goals near, helping others via lending. All options unlocked.

### 8.9 `events/life-events.yaml` and `events/scams.yaml`
Life event fields: `id`, `title`, `description`, `type` (`bad|good`), `baseProbabilityPerTurn`, `amount` (fixed or % of income), `tags` (e.g., `health`, `work`, `family`), `chapters[]`, `cooldownTurns`, `teaches` (pillar/technique ids).

Initial life events: `medical-emergency` (bad, ₹30,000), `phone-broken` (bad, ₹12,000), `job-break` (bad, income 0 for 3 months), `family-wedding` (bad/social, ₹20,000), `bonus` (good, 1 month's salary), `promotion` (good, +10% salary), `scholarship` (good, ch1), `slow-season` (bad, ch3b, −40% income for a turn).

Scam fields: `id`, `title`, `channel`, `chapters[]`, `trigger` (`random|after_bad_toss`), `probability`, `offerText`, `actions` (e.g., `pay`, `share_otp`, `ignore`, `report`, `ask_friend`), `lossIfFallen` (amount or % of balance), `redFlags[]`, `repeatVariantOf` (scam id) or `variants[]`, `pillar: stay-safe`.

Initial scams:
| id | Channel | Chapters | Red flags |
| --- | --- | --- | --- |
| `prize-fee-message` | message | ch1 | Paying to receive money; you never entered |
| `job-fee-offer` | message | ch1, ch2 | Real jobs don't charge to hire; too-good pay for little work |
| `otp-unblock-call` | call | ch2 | Banks never ask for OTP or PIN; urgency and threats |
| `instant-loan-app` | app | ch2 | Hidden charges; asks for contacts/photos access; harassment |
| `guaranteed-weekly-returns-group` | investment_listing | ch3a, ch3b | Guaranteed high returns; unregistered platform; pressure |
| `fake-trading-app` | app | ch3a | Can't withdraw; fake profits shown; unknown developer |
| `friend-ponzi-scheme` | friend_offer | ch3b (+ rooms) | Returns paid from new members; recruit-to-earn |

### 8.10 Condition DSL and metrics registry
Rules (persona assignment, shift rules, report rules, technique tips, badges) use a small, safe, declarative condition format — **no `eval`**:
```yaml
when:
  all:
    - { metric: cashShareOfWealth, op: ">", value: 0.4 }
    - { metric: chapterTurns, op: ">=", value: 3 }
```
Supported: `all`, `any`, `not`; ops `== != > >= < <= in`. Metrics are registered in `packages/engine/src/metrics.ts`, each with an id, description and compute function over the chapter state. `content:validate` rejects unknown metric ids. Start with at least:
`tasksOnTimeRate`, `requiredTasksMissed`, `emergencyFundCovered`, `emergencyFundMonths`, `realValueGrowthPct`, `cashShareOfWealth`, `cashRealValueLossPct`, `fdShareOfWealth`, `equityShareOfWealth`, `diversificationCount`, `sipActiveTurns`, `sipStartedTurn`, `soldDuringCrash`, `fdBrokenEarly`, `scamsFallen`, `scamsSpotted`, `repeatScamSpotted`, `loansTaken`, `loansRepaidOnTime`, `loansDefaulted`, `trustScore`, `highInterestDebt`, `windfallSavedPct`, `auctionsWon`, `overbidPct`, `poolBidsJoined`, `healthScore`, `chapterTurns`, `persona`.

### 8.11 `config/health-score.yaml`
```yaml
passThreshold: 60
redistributeMissingComponents: true
components:
  - { id: tasks-on-time,   weight: 25, metric: tasksOnTimeRate,     scale: linear,  min: 0, max: 1 }
  - { id: safety-net,      weight: 20, metric: emergencyFundMonths, scale: linear,  min: 0, max: 3 }
  - { id: growth,          weight: 20, metric: realValueGrowthPct,  scale: linear,  min: 0, max: 0.3 }
  - { id: diversification, weight: 15, metric: diversificationCount, scale: steps, steps: [ {gte: 1, pts: 0.2}, {gte: 2, pts: 0.6}, {gte: 3, pts: 1} ] }
  - { id: trust,           weight: 10, metric: trustScore,          scale: linear,  min: 0, max: 100, multiplayerOnly: true }
  - { id: scam-safety,     weight: 10, metric: scamsFallen,         scale: inverse, max: 2 }
```

### 8.12 `report/life-report-rules.yaml`
Each rule: `id`, `section` (`did-well|could-be-better`), `priority`, `when` (condition), `text` (localized with placeholders), `pillar`, `techniqueId?`. The report picks the top 2–3 `did-well` and top 1–2 `could-be-better` matches.

Examples to include:
- did-well `emergency-fund-saved-you`: emergency fund covered a bad event → "Your safety net covered the {event} without a loan."
- did-well `sip-patience`: SIP active ≥ 3 turns and not sold in crash → "You kept your SIP going through a market storm. That patience paid off."
- could-be-better `idle-cash`: cash share > 40% → "Your cash lost about {cashRealValueLossPct}% of its buying power to rising prices."
- could-be-better `all-in-fd`: FD share > 70% and chapter turns ≥ 5 → "Your FD was safe, but after inflation it barely grew. For long goals, consider spreading money."
- could-be-better `panic-sold`: sold during crash → "You sold during a storm and locked in the loss."
- could-be-better `high-interest-debt`: took loan-app loan → "The loan app cost you {interestPaid} in extra charges."

**"What if" generation** (`whatIf` section in the same file): an ordered list of candidate counterfactuals, each with a condition and a decision transform, e.g. `idle-cash → start SIP of {amount} per month in equity-fund from turn 1`, `all-in-fd → move 50% to equity-fund SIP`, `fell-for-scam → ignore the scam`, `no-emergency-fund → set aside 3 months' expenses in savings first`. The engine replays with the same seed and reports the Real Value difference: *"If you had {change}, you would have about {difference} more today, based on the game's assumptions."*

### 8.13 `report/gyaan-check.yaml` and `report/badges.yaml`
- Gyaan Check: 3 scenario-based multiple-choice questions per chapter with `correctOptionId`, `explanation`, `pillar`, `techniqueId`.
- Badges: `scam-buster`, `patient-investor`, `trusted-lender`, `debt-free`, `diversifier`, `safety-first`, each with a condition.

### 8.14 `config/multiplayer.yaml` and `multiplayer/auctions.yaml`
- `minPlayers: 3`, `maxPlayers: 6`, `fillWithBots: true`, `turnTimerSeconds: 90` (auto-skip with default decisions).
- Loans: `maxRatePerTurn: 0.05`, `defaultInterestType: simple`, `maxLoanMultipleOfIncome: 2`, `bankRateByTrust` table, `loanAppRatePerTurn: 0.15` (shown as dangerous), `lateFine`, trust deltas: start 50, on time +5, late −15, default −30.
- Bots: strategies `cautious`, `balanced`, `impulsive`, `scammer-friend` (only pushes the Ponzi offer in ch3b) with weights.
- Auctions: `id`, `title`, `chapter`, `turn`, `trueValue` (revealed after), `minBid`, `allowPoolBid`, `returnStream` (e.g., the shop yields income per turn), `mutualFundReveal: true`.

### 8.15 `ngo/discussion-prompts.yaml`
Three prompts per chapter for facilitators, e.g., ch2: "Who chose an FD and who chose a SIP? How did the market storm feel?", "Did anyone lend to a friend? Was the interest fair?", "Which scam almost fooled you, and what gave it away?"

---

## 9. UI and UX

### 9.1 Principles
- Mobile-first, designed at **360 px width**, touch targets ≥ 44 px. Works on low-cost Android phones.
- Minimal text, an icon on every choice, plain language. Intuitive without instructions; the first turn of ch1/ch2 is guided for personas with `guidedFirstTurn`.
- Every amount shows **Amount** and **Real Value**. Every return shows an **"assumed"** chip with tooltip.
- The **coin toss** is the signature moment: a satisfying animation with sound (mute toggle).
- Accessibility: WCAG AA contrast, screen-reader labels, reduced-motion support (`prefers-reduced-motion`), font scaling.
- Brand: neutral Toss Life branding (do not use Vanguard logos). Warm, friendly palette; define design tokens in Tailwind config.

### 9.2 Key screens
1. Welcome: "Are you a student?" / "Are you an NGO?" + Log in
2. Student path choice: "Part of an NGO?" / "Learning personally?"
3. Enter Student Code → nickname, avatar, password
4. Personal signup → username, password, optional email
5. NGO signup → NGO name, admin email, password
6. Money Mindset Check (6 cards, one per screen, progress dots)
7. Persona reveal (strength + blind spot, friendly)
8. Life Ladder map (chapters, locked/unlocked, career branch)
9. Chapter intro
10. **Turn screen:** wallet (Amount + Real Value), task list with due turns, decide panel (spend / save / invest / lend / bid)
11. Investment shop: options as cards with risk level, liquidity, assumed return, technique link
12. Toss + time skip animation, then event/scam cards
13. Red Flags card
14. Life Report: did well / could be better / What if (side-by-side chart) / Gyaan Check
15. Persona shift celebration; badges
16. Friends' Room: lobby (code, players, bots), turn sync status, loan requests/offers, auction screen, pool bid, mutual fund reveal
17. Profile: Player ID, NGO link status, join requests, language, recovery email
18. Post-game Money Mindset Check + "how your answers changed"
19. NGO Admin: overview, seats & codes (generate, bulk, print, revoke, labels), students (list + detail), groups, statistics (all of §4.7), join requests, discussion prompts, settings

### 9.3 i18n
- Locales: `en` (default), `te`, `hi`, `ur`. Urdu is **RTL**: set `dir="rtl"` and use logical CSS properties (`ms-`, `me-`, `ps-`, `pe-` in Tailwind).
- UI strings in `apps/web/messages/<locale>.json`; game content strings inline in `content/` (§8.1).
- Language switcher on every screen header and in profile.
- Voice narration is a later phase: design the content schema with an optional `audio` field per localized string.

### 9.4 Offline and performance
- PWA with service worker caching the app shell and the compiled content bundle.
- Single-player chapters must be fully playable offline. Decisions queue locally (IndexedDB) and sync when online. Multiplayer requires connectivity; show a clear message when offline.
- Budget: initial JS for the play screen < 250 KB gzipped; lazy-load the dashboard and charts; compress images (WebP), prefer SVG icons.

---

## 10. Engine requirements and testing

- `packages/engine` is pure, deterministic TypeScript: `(state, action, content, rng) → newState`. No I/O, no React, no Supabase. Both the client (single-player, offline) and Edge Functions (multiplayer) use it.
- Monetary values are integers in **paise** internally to avoid floating-point errors; format at the UI.
- Unit tests (Vitest) must cover: mindset scoring and every persona rule; inflation and Real Value; each option's returns per state; SIP monthly buying; FD early-break penalty; task due dates, fines and consequences; scam triggering with persona multipliers; loans (simple/compound interest, late, default, trust changes); auctions and pool-bid pro-rata payouts; Health Score with and without multiplayer; Life Report rule selection; **"What if" determinism** (same seed + same decisions = identical results).
- `pnpm sim` runs many playthroughs with bot strategies and prints average Health Score, Real Value growth and pass rate per strategy. Use it to check balance: a sensible balanced strategy should pass ch2 most of the time; an all-cash strategy should usually fail growth; an all-equity no-emergency-fund strategy should sometimes fail after bad tosses.
- Playwright e2e: NGO signup → generate code → student redeems code → mindset check → plays ch2 to Life Report → admin sees the student in stats.

---

## 11. Coding conventions
- TypeScript strict; no `any` without a `// reason:` comment.
- Never hardcode content, numbers or user-facing strings in components; read from the content bundle or `messages/`.
- Server-only code in `server/` folders or files with `import "server-only"`.
- All DB access respects RLS; use the service role only in server actions/Edge Functions for admin operations (code generation, redemption, password reset, room resolution).
- Validate all inputs with Zod at boundaries.
- Small components; game components accept engine state and dispatch actions.
- Run `pnpm content:validate && pnpm lint && pnpm typecheck && pnpm test` before every commit.
- When you add a metric, technique, event type or content field, update the Zod schema, `content:validate`, `content/README.md`, and tests together.

---

## 12. Development plan — follow in order

These phases describe *what* must exist. **Who builds what, and in what order, is in §15**: the three team members work through their own tracks in parallel, not through these phases one after another. After each task: run all checks, commit, and summarise what was done and what's next. Prioritise the **hackathon demo path** (Phases 0–7).

**Phase 0 — Repo and tooling**
- Monorepo, Next.js app, Tailwind + shadcn, ESLint/Prettier, Vitest, Playwright, CI, `.env.example`, README.
- Supabase local (`supabase init`, `supabase start`), Supabase clients for server and browser.

**Phase 1 — Content system**
- Zod schemas for every content type in §8; YAML loader; `content:build`, `content:validate`, `content:watch`; JSON Schema emission.
- Create all content files with the initial data from §8 (ch2 complete; others outlined, disabled).
- `content/README.md` for non-developers.
- `/dev/content` preview route.

**Phase 2 — Engine**
- RNG, economy, market, portfolio, tasks, events, scams, score, report, "What if", conditions + metrics, persona.
- Full unit tests. `pnpm sim` script.

**Phase 3 — Auth, organisations and onboarding**
- Migrations for §5 (accounts part), RLS policies.
- First-launch flow (§4.2), NGO signup, personal signup, Student Code redemption (Edge Function, hashed codes, rate limiting), login, profile with Player ID.
- Admin: generate single/bulk codes, labels, revoke, print/CSV.

**Phase 4 — Single-player game (Chapter 2)**
- Money Mindset Check → persona reveal → Life Ladder map → ch2 turn screens → investment shop → toss/time skip → events and scams → Red Flags.
- Save progress (playthroughs, decisions) with offline queue.

**Phase 5 — Life Report and progression**
- Health Score, Life Report sections, "What if" chart, Gyaan Check, badges, pass/replay, persona shift, chapter unlock and career-path choice screen.

**Phase 6 — Multiplayer Friends' Room**
- Rooms, lobby, bots, realtime turn sync, loans with interest and Trust Score, one Opportunity Auction with Pool Bid and the mutual fund reveal. Server-authoritative resolution.

**Phase 7 — NGO dashboard (demo-ready)**
- Statistics views (§4.7) with filters and CSV export, student list and detail, join requests for personal learners, password reset, discussion prompts.
- Demo seed script: one NGO, ~40 students with varied simulated playthroughs so the dashboard looks real.

**Phase 8 — i18n, PWA, polish**
- Telugu (or the first chosen regional language) for all UI and ch2 content; RTL check with Urdu stub.
- PWA install + offline single-player.
- Animations, sound, accessibility pass, performance budget.

**Phase 9 — After the hackathon**
- Remaining chapters, all four languages, voice narration, content editing UI for NGOs, post-game Mindset Check analytics, pilot readiness (monitoring, backups, error tracking).

---

## 13. Demo script (what must work flawlessly)
1. NGO admin signs up and generates a Student Code.
2. Student enters the code, sets a nickname, takes the Money Mindset Check, gets a persona.
3. Student plays Chapter 2: pays fees, chooses FD vs. SIP, gets hit by a medical emergency and a market storm, receives an OTP scam call.
4. Life Report shows Real Value and a "What if" SIP replay.
5. A Friends' Room with 1 human + bots: a loan with interest, then a Pool Bid auction and the mutual fund reveal.
6. Admin dashboard shows the student, persona distribution, scam fall rates and learning gain.

---

## 14. Open questions (use the default until the team decides)
1. **Individual vs. aggregate stats:** the proposal said dashboards show class totals; the account spec says admins see exhaustive statistics. *Default:* the admin sees individual student detail by nickname/label; nothing personal is collected anyway.
2. **Return rates and inflation:** illustrative; confirm with Vanguard mentors before the demo (edit only `content/`).
3. **First regional language:** *Default:* Telugu.
4. **Tax on returns:** *Default:* ignored in v1 (`considerTax: false`), stated as an assumption in-game.
5. **Can a personal learner request to join an NGO themselves?** *Default:* no; only the admin initiates, and the student accepts.
6. **Code expiry:** *Default:* 30 days, configurable per NGO.

---

## 15. Team and work split

Three people build Toss Life in parallel, each with their own Claude Code session. **Samarth owns the most complex and the largest share of the work** (the simulation engine, the content system and the multiplayer server). **Prathmesh** owns the platform: repo, database, auth, onboarding and the NGO dashboard. **Pragya** owns the player experience: every student-facing screen, game content writing, languages and the PWA.

| Person | Track | Share of work | Hardest parts |
| --- | --- | --- | --- |
| **Samarth** | Engine, content system, multiplayer server | ~45% | Deterministic simulation, "What if" replays, condition DSL, server-authoritative rooms, loans, auctions, bots, balancing |
| **Prathmesh** | Platform, accounts, NGO dashboard | ~30% | Supabase schema + RLS, Student Code redemption, offline sync, statistics SQL views |
| **Pragya** | Game UI, content writing, i18n, PWA | ~25% | Turn screen, coin toss and time-skip animations, Life Report UI, RTL, offline install |

### 15.1 Rules for Claude Code (all three sessions)
1. At the start of every session, confirm which person you are working for (`TOSS_DEV` in `.env.local`, or ask). Work only in that person's **owned paths** (§15.3).
2. If a task needs a change in someone else's owned path, **do not edit it**. Instead: code against the shared contract (§15.4), use the mock/stub if the real thing isn't ready, and add a request to `docs/requests/<owner>.md` (what is needed, why, and the proposed interface).
3. Changing a **shared contract** (§15.4) requires a PR labelled `contract` that the other two approve. Keep contracts backwards compatible where possible; when breaking, update the mocks in the same PR.
4. Branches: `<name>/<short-task>` (e.g., `samarth/engine-market`, `prathmesh/rls-codes`, `pragya/turn-screen`). Open small PRs into `main`; another team member reviews each PR.
5. Never commit directly to `main`. Rebase on `main` daily. CI (§3.5) must pass before merge.
6. Each person keeps `docs/progress/<name>.md` updated with done / in progress / blocked, so others' sessions can read it.

### 15.2 Day-zero setup (must happen first, in this order, ~half a day)
1. **Prathmesh:** create the GitHub repo, monorepo skeleton (§3.1–3.3), CI, `.env.example`, Supabase local setup, empty Next.js app with Tailwind + shadcn, `docs/requests/` and `docs/progress/` folders. Merge to `main`.
2. **Samarth:** in parallel, write the **engine contract** (`packages/engine/src/types.ts` + `api.ts` with stub implementations) and **content Zod schemas** (`packages/content/src/schemas`). Commit **fixtures**: a hand-written ch2 game state at turns 0, 2 and 5, a sample `ChapterResult` with a Life Report, and a sample room state. Merge once the skeleton exists.
3. **Pragya:** in parallel, set up the design system (Tailwind tokens, fonts, icon set, base shadcn components, mobile layout shell, language switcher with next-intl) on top of Prathmesh's skeleton.
4. **Prathmesh:** write the first migration (accounts, codes, playthroughs, decisions, chapter results) from §5 and generate `packages/db-types`.

After day zero, everyone can work independently against contracts and fixtures.

### 15.3 Ownership of paths

| Path | Owner |
| --- | --- |
| `packages/engine/**` | Samarth |
| `packages/content/**` (schemas, loader, compiler, validator) | Samarth |
| `scripts/sim.ts` | Samarth |
| `supabase/functions/room-*`, `supabase/migrations/*_rooms_*.sql` (rooms, loans, auctions, bids, pools) | Samarth |
| `apps/web/lib/room/**` (`useRoom` hook, room client) | Samarth |
| `apps/web/app/[locale]/dev/**` (content preview, sim tools) | Samarth |
| Root config, `.github/**`, `README.md` | Prathmesh |
| `supabase/migrations/**` (all except rooms), `supabase/seed.sql`, `supabase/functions/redeem-code`, `supabase/functions/admin-*` | Prathmesh |
| `packages/db-types/**` | Prathmesh |
| `apps/web/lib/supabase/**`, `apps/web/lib/auth/**`, `apps/web/lib/data/**` (persistence + offline queue) | Prathmesh |
| `apps/web/app/[locale]/(public)/**` (welcome, login, signups, join) | Prathmesh |
| `apps/web/app/[locale]/(ngo)/**`, `apps/web/components/dashboard/**` | Prathmesh |
| `scripts/seed.ts` (demo NGO data) | Prathmesh |
| `apps/web/app/[locale]/(student)/**` | Pragya |
| `apps/web/components/game/**`, `apps/web/components/multiplayer/**`, `apps/web/components/ui/**` | Pragya |
| `apps/web/messages/**` (UI strings, translations) | Pragya |
| `content/**/*.yaml` text, `content/README.md` | Pragya (writes and translates); Samarth reviews numbers that affect balance |
| PWA config, service worker, `public/**` | Pragya |
| `CLAUDE.md` | Everyone, via PR |

### 15.4 Shared contracts (the seams that let work happen in parallel)

**A. Engine API** — owned by Samarth, used by Pragya (UI), Prathmesh (persistence, stats) and the room Edge Functions.
```ts
// packages/engine/src/api.ts
scoreMindset(answers, content): { scores: { plan; risk; know }, personaId }
createPlaythrough({ content, personaId, seed, chapterId }): GameState
getAvailableActions(state, content): ActionOption[]          // drives the decide panel
applyAction(state, action, content): GameState               // spend / save / invest / sip / withdraw / scam-response ...
advanceTurn(state, content): { state: GameState; tossResult: TossResult; events: GameEvent[] }
endChapter(state, content): ChapterResult                    // score breakdown, Life Report, What if, Gyaan ids, badges, persona shift
replayWithChange(state, change, content): WhatIfResult
toDecisionLog(action | event): DecisionRecord                // the shape stored in the `decisions` table
```
`GameState`, `Action`, `TossResult`, `GameEvent`, `ChapterResult`, `DecisionRecord` and all money types (paise integers) are exported from `types.ts`. Fixtures live in `packages/engine/fixtures/`.

**B. Content bundle types** — owned by Samarth. `packages/content` exports `ContentBundle` and every item type, inferred from the Zod schemas. Pragya edits YAML against these schemas; `pnpm content:validate` must pass.

**C. Decision log types** — owned by Samarth, consumed by Prathmesh. The `DecisionRecord.type` enum (e.g., `invest`, `withdraw`, `sip_start`, `task_paid`, `task_missed`, `scam_fallen`, `scam_spotted`, `loan_taken`, `loan_repaid`, `auction_bid`, `chapter_end`) is the source for every dashboard statistic. Prathmesh's SQL views read only this table, `chapter_results`, `mindset_responses` and room tables.

**D. Persistence API** — owned by Prathmesh, used by Pragya.
```ts
// apps/web/lib/data/index.ts
useSession(): { user, profile, role, org }
saveMindset(phase, answers, result): Promise<void>
startPlaythrough(personaId, seed): Promise<PlaythroughId>
loadPlaythrough(id): Promise<{ state: GameState; contentVersion }>
appendDecisions(id, records: DecisionRecord[]): Promise<void>   // queued offline, synced later
saveChapterResult(id, result: ChapterResult): Promise<void>
```
Until Prathmesh's real version lands, a `mock` implementation backed by `localStorage` lets Pragya build and test every screen.

**E. Room API** — owned by Samarth, used by Pragya.
```ts
// apps/web/lib/room/index.ts
useRoom(code): { room, me, members, turn, status, pendingLoans, auction, actions: {
  join, leave, ready, submitTurn, requestLoan, offerLoan, acceptLoan, repayLoan,
  placeBid, createPool, joinPool } }
createRoom(chapterId): Promise<{ code }>
```
Samarth ships a **mock room** (in-memory, with bots) on day 2 so Pragya can build the Friends' Room UI before the server exists.

### 15.5 Samarth — engine, content system and multiplayer server (largest, most complex)
Work in this order. Each item includes unit tests (§10).
1. Engine contract, types, fixtures, stubs (day zero).
2. Content Zod schemas for every type in §8; YAML loader; `content:build`, `content:validate` (cross-references, expected-return check, weight sums, metric ids, placeholders, locale coverage), `content:watch`; JSON Schema emission.
3. Seeded RNG with separate streams; economy (inflation index, salary growth, Real Value).
4. Market toss model with shared and independent tosses; option returns; portfolio (holdings, lump sums, SIP monthly buying, liquidity, FD/RD lock and penalties, market withdrawals, cash loss chance).
5. Tasks (due turns, fines, consequences, inflation adjustment), fixed expenses, income.
6. Life events and scams (probabilities, cooldowns, `after_bad_toss`, persona multipliers, repeat variants, red flags).
7. Condition DSL evaluator (no `eval`) and the metrics registry (all metrics in §8.10).
8. Persona scoring, assignment rules, shift rules.
9. Financial Health Score (scales, weights, redistribution), badges, Life Report rule selection.
10. **"What if" engine:** counterfactual candidates, decision transforms, same-seed replay, Real Value difference. Determinism tests are mandatory.
11. Bot strategies (`cautious`, `balanced`, `impulsive`, `scammer-friend`).
12. `pnpm sim` balancing tool; tune content numbers with Pragya so a balanced strategy usually passes ch2, all-cash usually fails growth.
13. Mock room (in-memory) implementing the Room API (§15.4 E).
14. Room migrations (rooms, members, loans, auctions, bids, pools) with RLS.
15. Room Edge Functions: create/join, lockstep turn submission and resolution using the engine, turn timer and auto-skip, loans (request, offer, accept, repay, late, default, Trust Score, bank rate by trust, loan app), auctions (sealed bids, pool bids, pro-rata payouts, true-value reveal), bot seats. Server-authoritative; validate every action.
16. Realtime client (`useRoom`) replacing the mock.
17. `/dev/content` and `/dev/sim` routes.
18. Engine performance check (a full ch2 turn resolves in < 50 ms on a mid-range phone).

### 15.6 Prathmesh — platform, accounts and NGO dashboard
1. Repo, monorepo, CI, env, Supabase local, Next.js skeleton (day zero).
2. Migrations for accounts, organisations (unique admin), profiles, student codes, join requests, groups, mindset responses, playthroughs, chapter results, decisions, Gyaan answers, badges; RLS for students and admins; generated DB types.
3. Auth (§4.5): email/password, synthetic student emails, usernames, Player ID generation, session helpers, route guards by role.
4. Public screens: welcome, student path choice, Student Code entry + profile setup, personal signup, NGO signup, login.
5. `redeem-code` Edge Function: hashed codes, single use, expiry, rate limiting, one transaction.
6. Admin code tools: generate single/bulk, labels, groups, revoke, CSV export, printable PDF sheet.
7. Join requests: admin enters Player ID → student accepts/declines (Pragya builds the student-side accept card on the profile screen using Prathmesh's API).
8. Admin password reset for NGO students (service-role server action).
9. Persistence API (§15.4 D) with offline queue in IndexedDB and background sync; ship the mock first on day 1.
10. Statistics SQL views/RPCs for every item in §4.7, RLS-safe.
11. NGO dashboard UI: overview, seats & codes, students list + detail (decision timeline), groups, statistics pages with Recharts, filters, CSV export, discussion prompts page.
12. Demo seed script: one NGO, ~40 students with varied playthroughs generated by running Samarth's engine with bot strategies.
13. Playwright e2e for the demo path (§13), Vercel + Supabase Cloud deployment, environment secrets.

### 15.7 Pragya — game UI, content writing, languages and PWA
1. Design system: tokens, typography, icons, base components, mobile shell, language switcher (day zero).
2. Money Mindset Check screens (pre and post), persona reveal, "how your answers changed" screen.
3. Life Ladder map and chapter intro.
4. **Turn screen:** wallet with Amount + Real Value, task list with due turns, decide panel driven by `getAvailableActions`, "assumed" chips and tooltips.
5. Investment shop: option cards (risk, liquidity, assumed return), SIP setup, withdraw flows, technique explainers and visuals (`growth-tree`, `split-pie`, `units-bought-chart`, `real-value-badge`, `storm-timeline`).
6. Coin toss and time-skip animations with sound and reduced-motion fallback; event and scam cards; Red Flags card.
7. Life Report: did well / could be better, "What if" side-by-side chart, Gyaan Check, badges, pass/replay, persona shift celebration, career-path choice.
8. Friends' Room UI against the mock room: lobby, turn sync status, loan request/offer/accept/repay, Trust Score display, auction and pool bid, mutual fund reveal, preset emotes.
9. Profile screen: Player ID, NGO link status, join request accept/decline, language, recovery email.
10. Write all English content text in the YAML files (chapter intros/outros, task titles, event and scam texts, red flags, Life Report rule texts, Gyaan Check questions, badge texts, discussion prompts, technique explanations), keeping amounts and rates as Samarth sets them.
11. Telugu translation of all UI strings and ch2 content; Urdu RTL check with stub strings.
12. PWA: manifest, icons, service worker, offline single-player, install prompt; performance budget (§9.4) and accessibility pass (§9.1).

### 15.8 Integration milestones
| Milestone | Target | What must work | Owners |
| --- | --- | --- | --- |
| **M0 Contracts** | End of day 0 | Repo, CI, engine types + fixtures, schemas, design system shell | All |
| **M1 Single-player slice** | Day 2–3 | Code redemption → mindset check → persona → one ch2 turn with real engine and mock persistence | Samarth (engine), Prathmesh (auth), Pragya (screens) |
| **M2 Full chapter** | Day 4–5 | ch2 end to end with toss, events, scams, Life Report and "What if"; real persistence and offline queue | All |
| **M3 Multiplayer + dashboard** | Day 6–7 | Friends' Room with bots, loans, pool-bid auction on the real server; NGO dashboard with seeded data | Samarth (rooms), Prathmesh (dashboard), Pragya (room UI) |
| **M4 Demo-ready** | Before judging | Telugu, PWA install, demo script (§13) passes in Playwright, deployed | All |

Adjust the day targets to the real hackathon length; keep the order.

### 15.9 Dependencies to watch
- Pragya's screens depend on the engine contract and fixtures (Samarth, day 0) and the persistence mock (Prathmesh, day 1). Do not wait for real implementations.
- Prathmesh's statistics depend on the `DecisionRecord` enum (Samarth, day 0). Any new decision type must be announced in `docs/requests/prathmesh.md`.
- Prathmesh's demo seed depends on the engine and bots (Samarth, items 1–11).
- Samarth's balance tuning needs Pragya's content text in place, but numbers can be tuned before the text is final.
