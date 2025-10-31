# Repository Guidelines

## Project Structure & Module Organization
This Next.js 15 app-router project keeps user-facing routes in `src/app`, with shared UI under `src/app/_components`. Server logic sits in `src/server`: `api` hosts tRPC routers, `auth` wraps NextAuth helpers, and `db` contains Drizzle schema + migrations. The tRPC client bridge lives in `src/trpc`. Static assets, favicons, and Open Graph images belong in `public`. Tooling and database config stay at the root (`drizzle.config.ts`, `eslint.config.js`, `prettier.config.js`, `tsconfig.json`, `start-database.sh`).

## Development Workflow & Commands
Install dependencies with `npm install`. `npm run dev --turbo` launches the local server; pair it with `./start-database.sh` when you need a Postgres instance. Use `npm run db:generate` and `npm run db:migrate` after changing Drizzle models, `npm run db:push` to sync to a dev database, and `npm run db:studio` for inspection. Ship-ready bundles come from `npm run build` and `npm run preview`. Run `npm run check`, `npm run lint:fix`, and `npm run format:write` before pushing.

## Coding Style & Naming Conventions
Prettier enforces two-space indentation, single quotes, trailing commas, and no semicolons; let the Tailwind plugin sort utility classes automatically. React components and server routers use PascalCase, hooks use camelCase, and Drizzle tables stay singular PascalCase. Favor type-only imports inline, prefer `async`/`await` over promise chains, and prefix intentionally unused vars with `_` to satisfy ESLint.

## Testing Guidelines
Automated tests are not yet wired in; rely on `npm run check` for regressions until the test harness lands. When adding coverage, co-locate specs as `*.test.ts` beside the module, use Vitest or Testing Library for React, and mirror database behavior with seed data under `src/server/db`. Document any manual QA (e.g., drafting a team, signing in with Discord) in the PR so reviewers can reproduce it.

## Commit & Pull Request Guidelines
Keep commit subjects short, imperative, and scoped where useful (e.g., `feat: add draft queue`). Squash noisy WIP commits before opening a PR. Every PR should explain the change, list verification commands, call out database or env updates, and attach UI screenshots when visuals shift. Wait for `check`, `lint`, and `build` to pass and request review before merging.

## Environment & Secrets
Define local credentials in `.env.local` following the schema enforced in `src/env.js`, and never commit secrets. Only set `SKIP_ENV_VALIDATION=1` for constrained CI environments. Rotate tokens whenever sharing sandboxes, and prefer parameterized Drizzle queries to avoid SQL injection.
