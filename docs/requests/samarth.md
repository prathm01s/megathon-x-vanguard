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
4. ~~**Simplified parts of `api.ts`.**~~ **Done:** split into modules.
5. ~~**Personas start in a disabled ch1.**~~ **Done:** `startChapterFor(personaId, content)`.

## Session 2 backlog — resolved in session 3

6. ~~**Room server.**~~ **Done:** `supabase/migrations/20261010010000_rooms_init.sql` (tables + RLS),
   `supabase/functions/room-action` (Edge Function), realtime client in `apps/web/lib/room`.
   Tested end-to-end on PGlite and under Deno (`pnpm functions:smoke`).
7. ~~**Decision records for rooms.**~~ **Done:** room ops queue records in `RoomState.outbox`; the
   server writes them to `decisions` (loans, bids, pools, wins, every turn event) and
   `chapterResultRecords` adds `chapter_end` + `persona_shift`.
8. ~~**`windfallSavedPct` is always 0.**~~ **Done:** saved = moved into savings/investments in the
   decide phase right after the windfall.
9. ~~**`scammer-friend` bot.**~~ **Done:** pushes room scams (`friend-ponzi-scheme`) with
   `PendingScam.fromMemberId`.
10. ~~**`/dev/sim` and the performance check.**~~ **Done:** `/dev/sim` lab and `pnpm bench`
    (a ch2 turn ≈ 0.4 ms estimated on a mid-range phone; budget 50 ms).

## Still open

11. **Team decision (handoff §7.2):** should all-cash fail the chapter, or only the growth
    component? Today it passes with 63.
12. **Deploy the room server** once the Supabase Cloud project exists: `pnpm functions:deploy`,
    apply migrations, set `NEXT_PUBLIC_ROOM_BACKEND=supabase` on Vercel. Then a real two-phone test.
13. **Rooms beyond ch2:** the property / shop auctions and ch3b's scammer friend are implemented
    but untested with real content, because those chapters are still outlines.
