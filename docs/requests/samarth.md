# Requests for Samarth (engine, content system, multiplayer server)

Add new requests at the bottom: what you need, why, and the interface you propose.

## From day-zero setup (2026-10-10) — all resolved in session 2

1. ~~**Debt fund breaks the "can lose money" guardrail.**~~ **Done:** returns re-shaped to
   +10 / +8 / −0.5% (expected 6.9%, shown ~7%). See the `DECISION` in `content/investments/options.yaml`.
   Still to confirm with Vanguard mentors.
2. ~~**Balance is off.**~~ **Done:** time-weighted real growth (`investedReal`), monthly simulation
   and real bot strategies. All §10 targets hold and are tested (`test/bots.test.ts`). Numbers are
   in `handoff.md` §7.
3. ~~**"What if" can be a no-op.**~~ **Done:** `chooseWhatIf` skips candidates that don't leave the
   player better off.
4. ~~**Simplified parts of `api.ts`.**~~ **Done:** split into modules. Job break, business
   variability, monthly SIP/RD units, cash loss, forced borrowing, persona streaks and all five
   What-if transforms are implemented.
5. ~~**Personas start in a disabled ch1.**~~ **Done:** `startChapterFor(personaId, content)` falls
   back to the first enabled chapter.

## Still open (Samarth's own backlog)

6. **Room server:** room migrations with RLS, room Edge Functions that call
   `packages/engine/src/room.ts` (turn timer → `resolveTurn`), and a realtime `useRoom` replacing the
   mock store (§15.5 items 14–16).
7. **Decision records for rooms:** loan, auction and persona-shift actions should emit
   `DecisionRecord`s (`loan_requested`, `loan_offered`, `loan_taken`, `loan_repaid`, `loan_late`,
   `loan_defaulted`, `auction_bid`, `auction_won`, `pool_joined`, `persona_shift`), so Prathmesh's
   multiplayer stats work.
8. **`windfallSavedPct`** is always 0: attribute next-turn spending to the windfall.
9. **`scammer-friend` bot** should push `friend-ponzi-scheme` in ch3b rooms.
10. **`/dev/sim` route** and the engine performance check (a ch2 turn in under 50 ms on a
    mid-range phone).
11. **Team decision (handoff §7.2):** should all-cash fail the chapter, or only the growth
    component? Today it passes with 63.
