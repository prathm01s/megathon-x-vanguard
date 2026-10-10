# Editing Toss Life content

Everything in the game that isn't code lives in this folder: the money numbers, chapters, tasks,
investment options, life events, scams, report texts, quiz questions, badges and discussion prompts.
You can change the game by editing these files. You do not need to touch any code.

## The files

| File                              | What it controls                                                  |
| --------------------------------- | ----------------------------------------------------------------- |
| `config/economy.yaml`             | Inflation, salary growth, cash-loss chance, tax assumption        |
| `config/market.yaml`              | Chances of a boom / normal / storm year; gold's own toss          |
| `config/health-score.yaml`        | Health Score parts, their points, the pass mark (60)              |
| `config/multiplayer.yaml`         | Friends' Room: players, loan limits, Trust Score, bots, emotes    |
| `config/locales.yaml`             | Which languages are switched on                                   |
| `onboarding/mindset-questions.yaml` | The 6 Money Mindset Check questions and their points            |
| `onboarding/personas.yaml`        | The 4 personas, how students are placed, how personas change      |
| `chapters/*.yaml`                 | One file per chapter: income, expenses, tasks, events, scams      |
| `investments/options.yaml`        | Investment options (fictional names only!) and their returns      |
| `investments/techniques.yaml`     | Compounding, SIP, diversification… and their in-game tips         |
| `events/life-events.yaml`         | Medical emergency, bonus, promotion…                              |
| `events/scams.yaml`               | Scam messages, calls and apps, with their red flags               |
| `multiplayer/auctions.yaml`       | Opportunity Auctions and the mutual-fund reveal text              |
| `report/life-report-rules.yaml`   | "What you did well" / "What could be better" / "What if" texts    |
| `report/gyaan-check.yaml`         | End-of-chapter quiz questions                                     |
| `report/badges.yaml`              | Badges and when they are earned                                   |
| `ngo/discussion-prompts.yaml`     | Questions facilitators ask after a session                        |

## Golden rules

1. **Never rename or reuse an `id`** once students have played with it. To retire something, set
   `enabled: false`.
2. **Money is written in rupees** (`amount: 25000` means ₹25,000). Rates are decimals
   (`0.06` means 6%).
3. **No real brands.** Never use a real bank, fund, broker, app or company name. Use fictional names
   like "Big Bank" or "Sunrise Equity Fund".
4. **Returns are assumptions, not promises.** Market options must be able to lose money in a bad year.
5. **Explain trade-offs, never recommend.** Report texts must never say "buy X".
6. **No personal questions.** The Mindset Check must never ask about income, family, caste, religion,
   school or location.

## Text and languages

Every piece of text looks like this:

```yaml
title:
  en: "Medical emergency"
  te: "వైద్య అత్యవసరం"   # optional, falls back to English
```

Languages: `en` (English, required), `te` (Telugu), `hi` (Hindi), `ur` (Urdu). A missing language
shows English instead.

Words in curly brackets are **placeholders** filled in by the game: `{amount}`, `{event}`,
`{difference}`, `{change}` and any metric name such as `{cashRealValueLossPct}`. Keep them exactly as
they are in every language.

## Conditions (rules)

Persona rules, report texts, tips and badges use small "when" rules:

```yaml
when:
  all:                     # every line must be true  (also: any, not, always: true)
    - { metric: sipActiveTurns, op: ">=", value: 3 }
    - { metric: soldDuringCrash, op: "==", value: false }
```

Operators: `==  !=  >  >=  <  <=  in`. The list of metrics is in
`packages/content/src/schemas/conditions.ts`. Each one is explained in
`packages/engine/src/metrics.ts`.

## Checking your changes

```bash
pnpm content:validate
```

This checks every file, catches typos in ids, makes sure the shown returns match the real
probabilities (within 0.5 percentage points), checks that the persona rules cover every possible
answer, and reports how much of each language is translated. Fix anything marked ✖. ⚠ warnings
are allowed (for example, missing translations).

**Editor tip:** run `pnpm content:build` once, then open the YAML files in VS Code with the YAML
extension. You get autocompletion and inline errors from the `# yaml-language-server` line at the
top of each file.
