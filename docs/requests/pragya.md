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
