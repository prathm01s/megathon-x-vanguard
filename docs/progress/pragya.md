# Pragya — progress

## Done

- Day zero (built in the shared setup session, 2026-10-10): Tailwind 4 design tokens, fonts, base `Button` / `Card`, mobile `AppShell`, `LanguageSwitcher`, next-intl routing (en/te/hi/ur, Urdu RTL), `MoneyPair` + `AssumedReturn` components, play-screen placeholder rendering the engine fixture.
- Money Mindset Check pre-game flow (`components/game/mindset-check.tsx`, `(student)/mindset/page.tsx`): 6 cards with progress dots, zero-leak insight policy.
- Post-game Mindset Check & "How your answers changed" (`components/game/mindset-changes.tsx`, `(student)/mindset/post`, `(student)/mindset/changes`): before/after comparisons, score bars, and actionable insights.
- Persona Reveal screen (`components/game/persona-reveal.tsx`, `(student)/persona/page.tsx`): friendly strength + blind spot framing, avatar hints, key techniques showcase.
- Life Ladder map (`components/game/life-ladder.tsx`, `(student)/ladder/page.tsx`): chapter progression, locks, results, and career branching (salaried vs. business).
- Chapter Intro screen (`components/game/chapter-intro.tsx`, `(student)/chapter/[chapterId]/page.tsx`): stage context, income/expenses summary, task list preview, unlockable instruments.
- Turn Screen (`components/game/turn-screen.tsx`, `(student)/play/page.tsx`): real-time wallet with Amount and Real Value (`MoneyPair`), task management with due turn indicators, holdings overview, and mentor guidance tips.
- Amount Picker Modal (`components/game/amount-modal.tsx`): quick percentage buttons (25%, 50%, Max), slider, and engine warning alerts (early break penalties, below-cost, selling in storms).
- Investment Shop (`components/game/shop-modal.tsx`): all unlocked instruments with risk ratings, liquidity rules, assumed returns, active holdings, SIP management, and technique explainers.
- Interactive Technique Visualizers (`components/game/technique-visuals.tsx`): `growth-tree`, `units-bought-chart`, `split-pie`, `real-value-badge`, `storm-timeline`, `goal-buckets`, and `horizon-slider`.
- 3D Coin Toss Animation & SFX (`components/game/toss-modal.tsx`, `lib/sound.ts`): signature animated coin flip with zero-asset Web Audio synthesis (mute toggle supported) and turn event breakdown.
- In-game Scam encounters & Red Flags (`components/game/scam-modal.tsx`): realistic multi-channel offers, instant feedback, and educational red flag takeaways.
- Life Report screen (`components/game/life-report.tsx`, `(student)/report/page.tsx`): Financial Health Score breakdown (0-100), did well / could be better highlights, interactive What-if counterfactual analysis, Gyaan Check mini-quiz, and badge rewards.
- Student Profile screen (`components/game/profile.tsx`, `(student)/profile/page.tsx`): public Player ID copy for NGO linking, current persona, NGO status, badges showcase, and reset tools.
- AppShell header update (`components/ui/app-shell.tsx`): added profile navigation shortcut alongside the language switcher.
- Public join route updated (`(public)/join/page.tsx`): provides direct access to personal mindset flow and Student Code preview.

- **Merged into `main`** (2026-10-10). Engine-v2 integration fixes to your screens are listed in `docs/requests/pragya.md` ("From the merge review"); open items are 18–24.

- **Second merge** (2026-10-10): Friends' Room UI, Telugu and PWA merged into `main`. Fixes and open items are 25–30 in `docs/requests/pragya.md`.

## In progress

- Regional translations (Telugu UI strings & ch2 content) and PWA setup (§15.7 items 11–12).

## Blocked

- (nothing)
