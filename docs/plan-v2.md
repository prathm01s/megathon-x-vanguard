# Toss Life v2 — Case Studies, personas as difficulty, a gamified look

_Written 2026-10-11. Owners: Samarth (S), Prathmesh (P), Pragya (G). Read this whole file before
starting; it is the plan all three of us work from in parallel. `CLAUDE.md` still wins on
anything this file doesn't change (privacy, no real brand names, "assumed" labels, etc.)._

## 0. What we're changing and why

Feedback from the team after playing the full game:

1. **Students meet terms before they know them.** "SIP", "FD", "EMI", even "bank" appear in
   chapters with no explanation. → A **Case Studies** section teaches each concept with a short
   story and a tiny choice-based simulation. A term (and the options that use it) only appears
   in the life chapters **after** the student has unlocked it.
2. **Life chapters are text-heavy and hard to read.** The UI doesn't explain itself. → Fewer
   words, an icon on everything, tap-to-explain on every number and term, first-visit coach marks.
3. **It doesn't feel like a game.** → A complete visual revamp in a **"village-builder strategy
   game" style inspired by Clash of Clans**: chunky 3D buttons, bold outlined headings, a
   resource bar, a village map, quest cards, chests, stars, XP and levels.
4. **Personas are only a personality label.** → Each persona is also a **difficulty tier** that
   controls which options a student has, how much help they get, and how hard the luck is.

**Deadline-first rule:** every task below is ordered so the demo path keeps working after each
merge. If time runs out, cut from the bottom of each person's list, never from §2 (contracts).

### Legal guardrail for the theme

"Inspired by" means the _visual language_ (chunky, colourful, playful), never Supercell's
property. **Do not use** Clash of Clans names, characters, logos, screenshots, sounds or its
font (Supercell-Magic is proprietary). Use only:

- **Fonts:** Lilita One (headings, SIL OFL, Google Fonts) + Nunito (body, already in use) + the
  Noto Telugu/Devanagari/Arabic fonts already loaded (Lilita One has no Telugu glyphs, so Telugu
  headings fall back to Noto Sans Telugu Bold).
- **Icons/art:** lucide (already in use), **game-icons.net** SVGs (CC BY 3.0 — attribution
  required, add a `/credits` page) and **Kenney.nl** UI/game packs (CC0). Commit SVGs into
  `apps/web/public/art/` with a `CREDITS.md`.

## 1. Decisions (defaults — change them in this file, in a PR, if the team disagrees)

| #   | Question                                                | Decision                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Are case studies required?                              | Each chapter lists 1–3 **required** case studies (the ones its core options need). Others are optional and unlock extra options. Start chapter is disabled until the required ones are done.                                                             |
| D2  | What exactly is gated?                                  | (a) investment options in the shop, (b) actions (SIP start needs `sip`; room loans need `loan`; auctions need `auction`), (c) term chips in text show 🔒 until learned. Scams are **not** gated (they arrive anyway — that's the point).                 |
| D3  | How are terms marked in text?                           | Content text uses `{term:sip}` markup. The UI renders it as a tappable chip (glossary pop-up). `content:validate` rejects unknown term ids. Existing text is migrated.                                                                                   |
| D4  | Persona → difficulty                                    | moment-maker = **Rookie** (easy), safe-keeper = **Builder** (normal), thrill-seeker = **Challenger** (hard), smart-planner = **Master** (expert). Persona shift = "level up" to the next tier, celebrated. Replay at any tier ≤ your best.               |
| D5  | What does difficulty change?                            | `maxRiskLevel` of options offered, extra option ids, hints (guided turns, coach marks, mentor tips), starting bonus, event/scam multipliers (already exist), pass threshold offset, and Simple vs Full decide panel. Numbers live in `personas.yaml`.    |
| D6  | Is it fair to give the impulsive persona fewer options? | Yes, deliberately: Rookie gets a simpler board and more help (fewer ways to get hurt while learning), Master gets every tool and harsher luck. Everyone can level up by playing well. Say this on the persona reveal screen.                             |
| D7  | Theme name                                              | The world is **"Toss Town"**: the Life Ladder becomes a village map; chapters are districts you unlock.                                                                                                                                                  |
| D8  | Game currencies                                         | **Coins** = your cash (real game money, Amount + Real Value as today). **Gyaan Gems** 💎 = earned from case studies, Gyaan Check and badges (cosmetic + XP only, never money). **Trophies** 🏆 = Financial Health Score. **XP / Level** from everything. |
| D9  | Life Report look                                        | A "results" screen: 0–3 stars (score ≥ pass threshold = 1, ≥ 75 = 2, ≥ 90 = 3), trophies, loot (badges, gems) in a chest. What-if becomes "Replay tip".                                                                                                  |
| D10 | Hosting                                                 | Localhost + phones on the hotspot (`pnpm dev:lan`, see `status.md` §3) against the hosted Supabase. Vercel later.                                                                                                                                        |

## 2. Shared contracts — do these FIRST (phase A), then everyone builds against them

Each owner merges their contract to `main` with a stub/mock as fast as possible (target: within
the first few hours). Until the real thing lands, others use the stub.

### C1. Content schemas + fixtures (S)

New files and fields (Zod in `packages/content/src/schemas`, JSON Schema emitted, validated):

```yaml
# content/learn/glossary.yaml — every financial term the game uses
terms:
  - id: sip
    label: { en: "SIP" }
    short: { en: "Investing the same small amount every month." } # one line, shown in chips
    icon: sprout
    taughtBy: cs-sip # case study id

# content/learn/case-studies.yaml — the Case Studies grid
caseStudies:
  - id: cs-sip
    title: { en: "Meena's ₹500 a month" }
    oneLiner: { en: "Small monthly investing, even through bad years." } # grid card
    icon: sprout
    teaches: [sip, rupee-cost-averaging]
    unlock: { after: [cs-mutual-fund] } # or { chapterPassed: ch1-first-earnings } or {}
    gems: 20
    xp: 50
    scenes: # 3–6 short scenes; ≤ 25 words each
      - id: intro
        art: flower-stall # key into Pragya's art registry
        text: { en: "Meena sells flowers. She can spare ₹500 every month." }
        choices:
          - { id: sip, label: { en: "Invest ₹500 every month" }, next: sim }
          - { id: wait, label: { en: "Wait and invest it all later" }, next: sim }
      - id: sim
        sim: { kind: sip-units, months: 36, monthly: 500, pricePath: [100, 70, 60, 90, 120] }
        next: lesson
      - id: lesson
        text: { en: "When prices fell, her ₹500 bought MORE units. That's rupee-cost averaging." }
    quiz: # 1 question, same shape as Gyaan Check
      prompt: { en: "Prices crash while your SIP runs. What happens?" }
      options: [...]
      correctOptionId: buys-more
```

- **Option gating:** `options.yaml` → each option gets `requiresTerms: [fd]` (cash: none).
- **Chapter gating:** `chapters/*.yaml` → `requiredCaseStudies: [cs-budget, cs-bank]`.
- **Persona difficulty:** `personas.yaml` → each persona gets
  `difficulty: { tier: rookie|builder|challenger|master, maxRiskLevel, extraOptionIds, simpleDecidePanel, guidedTurns, coachMarks, startingBonusMonths, passThresholdOffset }`.
- **Text markup:** `{term:<id>}` allowed in every LocalizedString; validator checks ids.
- Fixtures: `packages/content/fixtures/case-study-sip.json` (a resolved case study) so G can build
  the player before the real content exists.

### C2. Engine API additions (S)

```ts
// packages/engine/src/api.ts (additions; existing calls keep working)
createPlaythrough({ content, personaId, seed, chapterId, carryOver?, knownTerms? }): GameState
//   state.knownTerms: string[]; state.difficulty: DifficultyTier (from the persona)
getAvailableActions(state, content)       // now filters options by knownTerms + difficulty;
                                          // locked ones come back with { locked: { reason, termId, caseStudyId } }
canStartChapter(chapterId, progress, content): { ok: true } | { ok: false; missingCaseStudies: string[] }

// Case studies (pure, deterministic)
startCaseStudy(id, content): CaseStudyState
chooseInCaseStudy(cs, choiceId, content): CaseStudyState
runCaseStudySim(sim, content): SimTimeline          // points for a chart: month, values per series
finishCaseStudy(cs, quizAnswerId, content): CaseStudyResult   // { passedQuiz, gems, xp, termsLearned }

// Progression
xpProgress(progress, content): { level, xp, xpForNext, gems }
// progress = { chapterResults, caseStudyResults, badges }
```

Sim kinds (S implements, G charts): `growth-compare` (cash vs savings vs FD vs fund over N years,
using content returns), `sip-units` (units bought each month on a price path),
`inflation-erosion` (₹ amount vs Real Value), `loan-cost` (EMI, total interest; friend vs bank vs
loan app), `diversify` (one option vs a spread through a crash), `auction-value` (bid vs true
value), `none` (story-only, e.g. scams).

### C3. Persistence API additions (P)

```ts
// apps/web/lib/data/types.ts (additions; mock first, then Supabase)
saveCaseStudyResult(result: CaseStudyResult & { caseStudyId: string }): Promise<void>
loadLearnProgress(): Promise<{ caseStudies: Record<string, CaseStudyResult>; knownTerms: string[] }>
```

Table `case_study_results (user_id, case_study_id, choices jsonb, quiz_correct bool, gems int,
xp int, completed_at)` with RLS like `chapter_results`. New decision types: `case_study_done`,
`term_learned` (announce in `docs/requests/prathmesh.md` per §15.9).

### C4. Game UI kit (G)

`apps/web/components/ui/` — the building blocks everyone (including P's pages) uses:
`GameButton` (3D, variants: primary/gold/green/danger/ghost, press animation, sound),
`Panel` (wood/stone framed card), `ResourceBar` (coins, gems, trophies, XP level ring),
`Ribbon` (title banner), `TermChip` + `GlossarySheet`, `CoachMark` (spotlight + one sentence),
`StarRating`, `Chest` (reward animation), `ProgressRing`, `IconBadge`. Tokens in `globals.css`
(palette, Lilita One, outlines, shadows). Merge this first so P can restyle his pages.

## 3. Content to write (who: S writes stories + sims and numbers; G edits the voice, translates)

**Case studies (18).** The one-liner is what the grid card shows.

| #   | id               | Title (draft)                     | One-liner                                          | Teaches (terms)                                   | Unlocks / needed by                                  |
| --- | ---------------- | --------------------------------- | -------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| 1   | `cs-budget`      | Ravi's first stipend              | Needs first, wants next, save something.           | budget, need, want                                | ch1 required                                         |
| 2   | `cs-bank`        | Why not keep it under the bed?    | What a bank account and a savings account do.      | bank-account, savings-account, interest           | ch1 required · `savings`                             |
| 3   | `cs-emergency`   | The broken cycle                  | A small safety fund stops a small problem growing. | emergency-fund                                    | ch1 required                                         |
| 4   | `cs-inflation`   | The ₹2 samosa                     | Why the same money buys less every year.           | inflation, real-value                             | ch1 optional, ch2 required                           |
| 5   | `cs-rd`          | The monthly piggy bank            | Saving a fixed amount every month at the bank.     | rd                                                | `rd`                                                 |
| 6   | `cs-otp-scam`    | The bank never calls for OTP      | How to spot "urgent" calls and prize messages.     | scam, otp                                         | ch1 optional (no gating)                             |
| 7   | `cs-fd`          | Locking money for a goal          | Fixed growth, but breaking early costs you.        | fd, lock-in, penalty                              | `fd`                                                 |
| 8   | `cs-compounding` | Asha starts at 22, Ravi at 32     | Returns that earn returns — time matters most.     | compounding                                       | ch2 required                                         |
| 9   | `cs-gold`        | Grandma's gold coins              | Gold goes up and down too.                         | gold                                              | `gold`                                               |
| 10  | `cs-mutual-fund` | Ten friends, one big basket       | Pooling money, sharing returns, and market risk.   | mutual-fund, equity, market-risk                  | `equity-fund`                                        |
| 11  | `cs-sip`         | Meena's ₹500 a month              | Small monthly investing, even through bad years.   | sip, rupee-cost-averaging                         | SIP action                                           |
| 12  | `cs-loans`       | The ₹20,000 loan, three ways      | Friend vs bank vs loan app: what interest costs.   | loan, interest, emi, loan-app                     | room loans · ch3a EMI text                           |
| 13  | `cs-trust`       | Paying back on time               | Why lenders trust some people more.                | trust-score                                       | room loans                                           |
| 14  | `cs-diversify`   | Don't put all your mangoes…       | Spreading money so one bad toss hurts less.        | diversification, index-fund, debt-fund, asset-mix | `index-fund`, `debt-fund`, `asset-mix`; ch3 required |
| 15  | `cs-insurance`   | One hospital bill                 | Paying a little every year to avoid a huge loss.   | insurance, premium                                | ch3a/ch3b required                                   |
| 16  | `cs-ponzi`       | The scheme that pays to recruit   | When returns come from new members, it collapses.  | ponzi                                             | ch3b optional                                        |
| 17  | `cs-auction`     | What is it really worth?          | Price vs value, and bidding together.              | auction, pool-bid                                 | room auctions                                        |
| 18  | `cs-risk-time`   | College in 1 year, retiring in 20 | Short goals stay safe, long goals can grow.        | risk-vs-time, retirement                          | ch4 required                                         |

**Persona difficulty table (first numbers; S tunes with `pnpm sim` per tier):**

| Persona       | Tier       | maxRiskLevel      | Hints                                 | Start bonus | Event/scam ×        | Pass threshold | Decide panel  |
| ------------- | ---------- | ----------------- | ------------------------------------- | ----------- | ------------------- | -------------- | ------------- |
| moment-maker  | Rookie     | 2 (+gold)         | guided turns all chapter, coach marks | +1 month    | ×0.8 / ×0.8         | −5             | Simple        |
| safe-keeper   | Builder    | 3                 | guided first turn, coach marks        | 0           | ×1.0 / ×0.8 (today) | 0              | Simple → Full |
| thrill-seeker | Challenger | 5                 | tips only                             | 0           | ×1.1 / ×1.5 (today) | 0              | Full          |
| smart-planner | Master     | 5 + auctions/pool | none                                  | 0           | ×1.2 / ×1.0         | +5             | Full          |

"Simple decide panel" = three big sliders (Spend on tasks / Keep safe / Grow) that the UI maps to
real actions, instead of the full shop.

## 4. Tracks — what each person builds

Branches: `samarth/v2-*`, `prathmesh/v2-*`, `pragya/v2-*`. Small PRs into `main`; another person
reviews. Merge at least once a day so we see each other's work running.
**Merge-conflict rules:** in `messages/*.json` each person adds keys only under their own
namespaces (G: `game.*`, `learn.*`, `village.*`, `ui.*`; P: `admin.*`, `auth.*`; S: `dev.*`,
`engine.*` error codes). Only G edits `components/game/store.ts`; S provides engine functions.

### Track S — Samarth (engine, content, server, simulations)

1. **C1 + C2 contracts** (schemas, validator rules, `{term:}` parser exported from
   `@toss/content`, engine API stubs, fixtures). → unblocks G and P.
2. Glossary (≈ 40 terms) and the 18 case studies: scenes, choices, sims, quiz (English first).
3. Sim kinds in the engine (`runCaseStudySim`), unit tests per kind (numbers match `options.yaml`).
4. Gating in the engine: `knownTerms` + difficulty in `getAvailableActions`, `canStartChapter`,
   locked-reason objects, carry `knownTerms` across chapters; migrate saves (v3, `migrateState`).
5. Persona difficulty effects (start bonus, multipliers, pass offset, extra options) + `pnpm sim`
   per tier; record numbers in `handoff.md`. Targets: Rookie balanced passes ≥ 90%, Master ≤ 80%.
6. Mark terms in existing content text with `{term:…}` (chapters, tasks, events, scams, report rules).
7. `xpProgress` (levels 1–15, XP from chapters/case studies/badges/Gyaan) + tests.
8. Rooms: each member's own difficulty and known terms; locked actions rejected server-side with a
   stable error code; rebuild + `pnpm functions:deploy` (needs the hotspot for `db push` only).
9. Demo seed: add case-study results so the dashboard has data (with P).

### Track G — Pragya (game UI, theme, Case Studies screens, translations)

1. **C4 UI kit + theme** (tokens, fonts, 3D buttons, panels, ribbons, resource bar, art folder +
   credits). → unblocks P's restyle.
2. **App shell:** top resource bar (coins / gems / trophies / level), bottom tab bar with big icons:
   Village · Case Studies · Friends · Profile.
3. **Case Studies grid** (`(student)/learn`): 2-column grid of cards with icon, title, one-liner,
   state (locked 🔒 with "Unlocks after…", new ✨, done ✅ + stars). Detail screen = story player:
   one scene per screen, big art, ≤ 25 words, choice buttons, sim chart (Recharts), quiz, chest
   reward with gems/XP, "You learned: SIP" term card.
4. **Village map** (replaces Life Ladder): districts per chapter on a scrollable map, locked with
   fog + "Needs: 2 case studies" pill linking to them; persona tier banner.
5. **Turn screen redesign** (the biggest UX win): wallet as a treasure chest with Coins + Real Value
   chip; tasks as quest cards (icon, amount, due-in badge); investments as "buildings" (vault = FD,
   farm = SIP, gold mine = gold, tower = equity) with growth arrows; one primary action per screen
   state; every number has a `?` that explains it in one line; `{term:}` chips; Simple decide panel
   for Rookie/Builder; coach marks on first visit.
6. **Toss + report:** keep the coin, add "year passes" village animation; results screen with
   stars, trophies, loot chest, Replay tip (What-if), Gyaan Check as a mini quiz with gems.
7. **Persona reveal** as a hero card with tier, stars and "what you can use" list; persona-shift
   = level-up celebration.
8. Friends' Room restyle (lobby as a war-room table of avatars, loans as handshake cards, auction
   as a gavel duel); locked actions show "Learn Loans first".
9. Sounds (tap, coin, chest, level up) with the existing mute toggle; reduced-motion versions.
10. Telugu for all new UI keys and case-study text once S freezes it; Urdu RTL check of the new
    layouts.

### Track P — Prathmesh (platform, data, dashboard, testing)

1. **C3 persistence contract** (types + mock + Supabase), migration `case_study_results` + RLS,
   regenerate `db-types`. → unblocks G's grid saving progress.
2. **Security fix:** revoke `execute` on `redeem_student_code_claim` / `_revert` / `_finalize`
   from `anon` and `authenticated` (service role only), test in `redeem-atomic.test.ts`.
3. Load/save learn progress at login (merge local + remote), so terms and gems survive devices.
4. Stats views: case-study completion and quiz accuracy per study, difficulty-tier distribution,
   tier shifts; dashboard cards for them.
5. Restyle public pages (welcome, join, login) and the NGO dashboard with G's UI kit (keep the
   dashboard calmer — it's for adults — but same fonts/colours).
6. Seed: case-study results + tiers for the 35 demo students (with S).
7. E2E: update `demo.spec.ts` + `demo-supabase.spec.ts` for the new flow (case studies before
   ch2, village map); add `learn.spec.ts`. Keep them passing as G's screens land.
8. Hotspot test day: run `pnpm dev:lan`, test on 3+ real phones (Android Chrome, low-end device),
   log issues in `docs/requests/<owner>.md`.
9. Vercel retry once v2 is stable (root dir `apps/web`, build already builds content).

## 5. Phases and checkpoints

| Phase | What                                                                                   | Done when                                                                                             |
| ----- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **A** | Contracts: S → C1+C2 with stubs/fixtures; P → C3 with mock; G → C4 UI kit + tokens     | All three merged to `main`; `pnpm content:validate && pnpm lint && pnpm typecheck && pnpm test` green |
| **B** | Build in parallel (S 2–7, G 2–7, P 2–6)                                                | Each track demoable on localhost behind its route; daily merges                                       |
| **C** | Integrate: gating live in shop/turn screen; case studies save; village map; dashboard  | New demo path (below) works end to end on localhost with hosted Supabase                              |
| **D** | Polish + phones: hotspot test with real phones, Telugu, sounds, performance, e2e green | Demo rehearsal twice without a hitch                                                                  |

**New demo path (replaces §13 steps 2–4 for the judges):**
NGO admin generates a code → student joins → Mindset Check → persona **with tier** → Village map:
"Do 3 case studies to open District 1" → plays **cs-budget** (story + sim + chest) → Chapter 1/2
with only the learned options → unlocks **cs-sip** mid-game → SIP appears in the shop → results
screen with stars → Friends' Room → dashboard shows case-study completion and tiers.

## 6. Definition of done (every PR)

- No hardcoded amounts, rates, texts or ids in components (§8.1): all from content or `messages/`.
- Mobile at 360 px, touch targets ≥ 44 px, works on `http://<ip>:3000` from a phone.
- `prefers-reduced-motion` respected; WCAG AA contrast on the new palette.
- Play-screen JS < 250 KB gzipped (§9.4): lazy-load art, charts and the dashboard.
- Telugu keys added (or listed as missing in the PR); Urdu layout not broken.
- `pnpm content:validate && pnpm lint && pnpm typecheck && pnpm test` green.

## 7. Risks

- **Scope.** 18 case studies + a full reskin is a lot. Cut order if late: case studies 16–18 and
  13 → Telugu for case studies → Friends' Room restyle → sounds. Never cut: gating of `sip`/`fd`,
  the Case Studies grid, the turn-screen redesign, the village map.
- **Merge conflicts in `messages/*.json` and `store.ts`:** follow the namespace rule in §4.
- **Saved games:** gating changes `GameState` (v3). `migrateState` gives old saves the terms their
  options imply, so nobody loses an investment.
- **Art weight:** SVG only, optimised (svgo), no PNG backgrounds over 50 KB.
