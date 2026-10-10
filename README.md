# Toss Life

_Life tosses the coin. Your choices decide where it lands._

A multiplayer, mobile-first life-simulation game that teaches financial literacy to Grade 11–12
students, delivered through NGOs in Hyderabad. Built for the Vanguard India community-stewardship
hackathon. The full spec is in [`CLAUDE.md`](./CLAUDE.md); what has been built so far is in
[`handoff.md`](./handoff.md).

## Prerequisites

- **Node.js** 22+ (24 LTS recommended, see `.nvmrc`)
- **pnpm** 12 (`npm i -g pnpm` or `corepack enable`)
- **Docker Desktop**: only needed to run Supabase locally (`pnpm db:start`)

## Setup

```bash
git clone https://github.com/IIIT-ECell/megathon26-prajis.git && cd megathon26-prajis
git checkout -b <your-name>/<short-task>   # never commit to main
pnpm install
cp .env.example .env.local     # fill in Supabase keys; set TOSS_DEV to your name
pnpm content:build             # compile content/*.yaml → packages/content/dist/content.json
pnpm dev                       # http://localhost:3000 (redirects to /en)
```

## Repository layout

| Path                | What                                                        | Owner (§15.3)                    |
| ------------------- | ----------------------------------------------------------- | -------------------------------- |
| `apps/web`          | Next.js 16 app (App Router, next-intl, Tailwind 4)          | shared, see CLAUDE.md §15.3      |
| `packages/engine`   | Pure, deterministic simulation engine (no React / DB / I/O) | Samarth                          |
| `packages/content`  | Zod schemas, YAML loader, `content:build` / `validate`      | Samarth                          |
| `packages/db-types` | Generated Supabase types                                    | Prathmesh                        |
| `content/`          | **Editable game content** (YAML), see `content/README.md`   | Pragya (text), Samarth (numbers) |
| `supabase/`         | Config, SQL migrations, Edge Functions                      | Prathmesh / Samarth (rooms)      |
| `scripts/`          | `sim.ts` (balancing), `seed.ts` (demo data)                 | Samarth / Prathmesh              |
| `docs/`             | `requests/<owner>.md`, `progress/<name>.md`                 | everyone                         |

## Scripts

| Command                               | Does                                                             |
| ------------------------------------- | ---------------------------------------------------------------- |
| `pnpm dev`                            | Builds content, then runs the content watcher + Next dev server  |
| `pnpm build`                          | Content build, then production web build                         |
| `pnpm content:validate`               | Schema, cross-reference, expected-return, persona, locale checks |
| `pnpm content:build`                  | YAML → `content.json` + JSON Schemas for editor autocompletion   |
| `pnpm content:watch`                  | Rebuild content on every YAML change                             |
| `pnpm test`                           | Vitest across engine, content and web                            |
| `pnpm test:e2e`                       | Playwright (mobile viewport)                                     |
| `pnpm lint` / `typecheck`             | ESLint / TypeScript across all packages                          |
| `pnpm format`                         | Prettier                                                         |
| `pnpm sim -- --runs 1000`             | Simulated ch2 playthroughs per strategy (balancing)              |
| `pnpm --filter @toss/engine fixtures` | Regenerate engine JSON fixtures                                  |
| `pnpm db:start` / `db:stop`           | Local Supabase (Docker)                                          |
| `pnpm db:reset`                       | Re-apply migrations + `supabase/seed.sql`                        |
| `pnpm db:types`                       | Regenerate `packages/db-types/src/database.ts`                   |

Before every commit: `pnpm content:validate && pnpm lint && pnpm typecheck && pnpm test`.

## Conventions

Branches `<name>/<short-task>`, small PRs into `main` (never commit to `main` directly), conventional
commits (`feat:`, `fix:`, `content:`, `chore:`, `test:`). Shared contracts (engine API, content
types, decision log, persistence API, room API) change only via a PR labelled `contract`.
