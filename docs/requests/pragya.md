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
