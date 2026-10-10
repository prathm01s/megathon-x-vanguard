# Requests for Pragya (game UI, content writing, i18n, PWA)

Add new requests at the bottom: what you need, why, and the interface you propose.

## From day-zero setup (2026-10-10)

1. **Engine warning / disabled codes need UI strings.** `getAvailableActions` returns codes
   (`ActionWarning`, `ActionDisabledReason` in `packages/engine/src/types.ts`) instead of text.
   English strings are in `apps/web/messages/en.json` under `engine.*`. Please review the wording
   and translate them.
2. **Translations.** `te.json`, `hi.json` and `ur.json` only have language names so far. Missing keys
   fall back to English automatically (`apps/web/i18n/request.ts`). All content YAML is English only.
   `pnpm content:validate` prints coverage per language.
3. **Placeholder screens** (`components/ui/placeholder-screen.tsx`) have hardcoded English titles.
   Replace them as the real screens land.
4. **Design tokens** in `apps/web/app/globals.css` are a first pass (warm cream, saffron, teal,
   plus `gain` / `loss` / `coin`). Check WCAG AA contrast and finalise. The fonts are Nunito plus Noto
   Telugu / Devanagari / Naskh Arabic, loaded in `app/[locale]/layout.tsx`.
5. **PWA is not set up yet** (§9.4). `next.config.ts` has a TODO. Check that the PWA tool you
   choose supports Next 16 with Turbopack before you pick it.

## From Samarth's engine session (2026-10-10)

6. **The Friends' Room UI can start now.** `useRoom(code)` from `@/lib/room` runs the real room
   rules in memory with bots. Room `TOSS42` is preloaded at turn 3, with the bike auction open, an
   active loan and an open request with offers. `createRoom("ch2-first-job")` makes a fresh room.
   The actions are in `lib/room/index.ts`. Note `act(action)` for the player's own decisions inside
   a room, `react(emoteId)` for preset emotes, and that the host's `ready()` starts the game.
   Show the mutual fund reveal (`content.auctions.mutualFundRevealText`) when
   `auction.status === "closed"`, `auction.winner.poolId` is set, and the auction's
   `mutualFundReveal` is true.
7. **Error codes to translate.** Engine and room actions reject with `EngineError.code`:
   `insufficient_cash`, `below_min`, `monthly_only`, `already_running`, `scam_pending`,
   `bad_task`, `bad_withdraw`, `chapter_complete`, `bad_rate`, `bad_amount`, `bad_due_turn`,
   `bad_loan`, `room_full`, `room_started`, `not_in_room`, `not_playing`, `no_auction`,
   `auction_closed`, `no_pool`, `pool_short`, `bad_emote`.
8. **New things to show on the turn-result screen** (`GameEvent`):
   - `forced_borrowing`: "You had to borrow ₹X at Y% a year": the lesson of having no safety net.
   - `debt_interest` / `debt_repaid`, `sip_missed`: not enough cash for an instalment.
   - `cash_lost`: cash kept at home was lost.
   - `life_event.coveredBy`: `cash` | `savings` | `shortfall`.
   - `TossResult.lifeEventMonth` says which month the event hit.
9. **Recurring deposit:** the RD is offered as `sip_start` (a monthly plan), never as `invest`.
   Label it as a monthly deposit, not a SIP.
10. **Units for the `units-bought-chart`:** every holding has `units`, and each `sip_buy` event
    reports the units bought that turn. A unit starts at ₹10. In a storm year the same instalment
    buys more units.
11. **Fixtures were regenerated** for the v2 state. Use `@toss/engine/fixtures` as before.

## From Samarth's room-server session (2026-10-10)

12. **`useRoom` now returns YOUR view of the room (`RoomView`)**, exactly what the real server
    sends:
    - `room.me` has your full `GameState`;
    - `members` are `PublicMember`s (nickname, avatar, Trust Score, `ready`, `awaitingScam`,
      `finished`), with no cash or holdings of other players;
    - before an auction closes you only see your own bid and your pool's bid.

    Also new: `isHost`, `actions.tick()`, `actions.join(personaId)`, and actions now reject with a
    `RoomError` (`import { RoomError } from "@/lib/room"`). Fixture: `sampleRoomView` from
    `@toss/engine/fixtures`.

13. **Join with the player's persona:** call `actions.join(personaIdFromMindsetCheck)`. (The real
    server ignores it and reads the persona from the player's latest Mindset Check.)
14. **Turn timer UI:** each turn auto-resolves after `content.multiplayer.turnTimerSeconds` (90 s).
    Show a countdown and call `actions.tick()` when it reaches 0. Players who haven't answered a
    scam card get "ignore" by default.
15. **Friend scam card:** a `PendingScam` with `fromMemberId` was pushed by a friend in the room
    (the "double your money" scheme). Show that friend's nickname as the sender.
16. **More error codes to translate:** `not_host`, `room_not_found`, `bad_request`,
    `no_profile`, `unauthenticated`, `server_error`, `network`.
17. **Dev tools you can use:** `/en/dev/content` shows every content text in the page's
    locale, with "en fallback" flags (handy for translation work), and `/en/dev/sim` shows how
    the game plays out.

## From the merge review (2026-10-10, Samarth, at the user's request)

Your branch is merged into `main`, and I played the whole ch2 flow in Chromium: it works end to
end with no console errors. Your screens were built against the day-zero engine, so I fixed the
places where engine v2 changed behaviour (please review commit `fix(game)`):

- **store:**
  - the next chapter now gets the **result's** `carryOver` (it has the persona-shift streaks);
  - saved games are migrated (persist `version: 2` + `migrateState`);
  - chapter end is logged with `chapterResultRecords`.
- **toss results:**
  - `coveredBy: "savings"` showed "wallet went below zero";
  - good events (bonus) showed as a red "−₹…";
  - promotions showed "−₹0".

  Messages were updated: `toss.shortfall`, `toss.coveredByCash` and the new
  `toss.coveredByWallet`.

- **Life Report:** rounded weights, localized component labels, and the non-applicable "trust"
  row is hidden in single-player.
- **join page conflict:** Prathmesh's real signup/login page was kept, and your flow applied: after
  signup students go to `/mindset`.

Open for you:

18. **Friends' Room screens** (§15.7 item 8): the biggest gap for demo step 5. Use `useRoom` (mock
    room `TOSS42`) and see items 6 and 12–16 above.
19. **Show the new engine events on the toss screen:**
    - `forced_borrowing` ("You had to borrow ₹X at Y% a year");
    - `cash_lost`;
    - `sip_missed`;
    - `debt_interest` / `debt_repaid`.
20. **Hardcoded English to move into `messages/`:** "Fine:" (toss modal), "Score Breakdown" (Life
    Report), plus the strings in the join and admin pages (coordinate with Prathmesh). Also hide
    the fine when it's ₹0.
21. **Accessibility:** the turn screen nests three `<main>` elements (AppShell inside AppShell).
    Keep one main landmark (§9.1).
22. The turn header shows **"Year 6 of 5"** after the last toss.
23. `components/game/store.ts` has its own `startChapterFor`. The engine exports one with the same
    behaviour (`startChapterFor(personaId, content)`).
24. **Telugu** (UI strings + ch2 content) and the **PWA** are still to do (your progress note says
    they're in progress).

## From the second merge review (2026-10-10): your Friends' Room / Telugu / PWA commit

Merged into `main`. Fixed so it compiles and renders (commit `fix(room-ui)`):

- **`/room/<code>` never left "Loading…".** `useState(baseRoom)` captured the hydration snapshot
  (null). The screen now uses the live room and keeps only local overrides.
- **Types updated to the current API:** `RoomView`, `PublicMember`. `me` now comes from `useRoom`:
  the signed-in player, with their own state.
- **The loan modal read `ratePerTurn`**; bank rates are `ratePerYear` since engine v2.
- **The service worker is registered in production only.** It serves `/_next/` cache-first,
  which pinned stale code under `next dev`.

Open for you:

25. **Wire the room screen to `useRoom` actions** instead of local simulation. Map each control
    to its action:

    | Control                 | Action                                                                                   |
    | ----------------------- | ---------------------------------------------------------------------------------------- |
    | Submit                  | `actions.submitTurn()`                                                                   |
    | Loans                   | `requestLoan`, `offerLoan({ loanId: requestId, … })`, `acceptLoan(offerId)`, `repayLoan` |
    | Auction                 | `placeBid`, `createPool` / `joinPool`                                                    |
    | Emotes                  | `react(emoteId)`; show `room.reactions`                                                  |
    | Timer                   | `tick()` when your countdown hits 0 (deadline = `content.multiplayer.turnTimerSeconds`)  |
    | Your own turn decisions | `actions.act(action)`, the same as single-player                                         |

    Read everything from `room`: pending loans, `myDebts`, `auction`, `tosses`, `me.state` for the
    tasks. Errors are `RoomError.code`.

26. **Remove hardcoded values in `room-screen.tsx`:** "₹54,000 paid", "Tasks Paid (4/5)", "Gold is
    up +4%, inflation is at 6%" (it sits next to a real toss, e.g. CRASH), `totalTurns = 5`,
    fallback cash/income numbers. "Income: …/yr" shows the **monthly** income.
27. **The lobby's ready toggle** should call `actions.ready()` (the host's `ready()` starts the
    game).
28. **Mutual-fund reveal:** show `content.auctions.mutualFundRevealText` when a pool wins (item 6).
29. **Telugu:** 117 English keys have no Telugu yet, and 44 Telugu keys (e.g. `mindset.subtitle`,
    `persona.title`) don't exist in `en.json`, so they're never shown; rename them to the real keys.
    The game content YAML needs `te:` strings too: `/te/dev/content` lists every untranslated item.
30. **Offline single-player:** cache the student routes plus the content bundle, so a game can be
    played offline after one visit (§9.4). Today offline navigation falls back to `/`.

## v2 redesign (2026-10-11)

Your track is in [`docs/plan-v2.md`](../plan-v2.md) (track G). Start with your contract in §2 so the
others can build against it.
