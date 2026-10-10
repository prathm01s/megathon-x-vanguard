# Requests for Samarth (engine, content system, multiplayer server)

Add new requests at the bottom: what you need, why, and the interface you propose.

## From day-zero setup (2026-10-10)

1. **Debt fund breaks the "can lose money" guardrail.** §8.6 gives `debt-fund` +8.5% / +7% / +5.5%,
   so it never loses money, but §1 says market options must be able to lose money in a bad year.
   `content:validate` warns about it. Decide whether to give it a small negative crash return or
   accept the exception (and silence the warning for it).
2. **Balance is off (day-zero engine).** `pnpm sim --runs 300` gives all-cash 63 avg / 95% pass,
   balanced 77 / 95%, all-equity 73 / 96%. §10 wants all-cash to usually _fail_. Average
   real-value growth is negative for every strategy because `realValueGrowthPct` (metrics.ts)
   deflates by the whole-chapter index even for money invested late. Needs a time-weighted real
   return plus tuning.
3. **"What if" can be a no-op.** If the chosen candidate matches what the player already did
   (e.g. `idle-cash` → start a SIP the player already had), `difference` is 0. Skip candidates
   whose replay changes nothing and fall through to the next one.
4. **Simplified parts of `packages/engine/src/api.ts`** (marked `TODO(samarth)`): income modifiers
   (job break), business income variability, monthly SIP timing and units, cash-at-home loss,
   loan-app debt as a real loan, persona shift streaks across chapters, and the remaining
   what-if transforms (`moveShare`, `emergencyFundFirst`, `holdThroughCrash`, which currently
   throw `NotImplementedError` and are caught). Split these into the modules listed in §3.2
   (market.ts, portfolio.ts, tasks.ts, events.ts, loans.ts, auction.ts, bots.ts).
5. **Personas start in ch1, but ch1 is an outline (`enabled: false`).** Until ch1 is playable, the
   UI should start everyone in ch2 (the prototype). Maybe add an engine helper `startChapterFor(personaId)`
   that falls back to the first enabled chapter.
