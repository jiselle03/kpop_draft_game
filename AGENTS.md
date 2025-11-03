# Repository Guidelines

## Project Structure & Module Organization
This Next.js 15 App Router project keeps user-facing routes in `src/app`. Reusable UI lives under `src/components/ui` (shadcn/ui) and local hooks/providers under `src/app/_components`. Server logic is split into `src/server/api` (tRPC server wiring) and `src/server/game` (in-memory lobby/draft/scenario store). Static assets, favicons, and Open Graph images belong in `public`. Tooling and database config stay at the root (`drizzle.config.ts`, `eslint.config.js`, `prettier.config.js`, `tsconfig.json`, `start-database.sh`).

## Development Workflow & Commands
Install dependencies with `npm install`. `npm run dev --turbo` launches the local server; pair it with `./start-database.sh` when you need a Postgres instance. Use `npm run db:generate` and `npm run db:migrate` after changing Drizzle models, `npm run db:push` to sync to a dev database, and `npm run db:studio` for inspection. Ship-ready bundles come from `npm run build` and `npm run preview`. Run `npm run check`, `npm run lint:fix`, and `npm run format:write` before pushing.

## Coding Style & Naming Conventions
Prettier enforces two-space indentation, single quotes, trailing commas, and no semicolons; the Tailwind plugin auto-sorts utility classes. React components and server routers use PascalCase, hooks use camelCase, and shared helpers under `src/server/game` follow descriptive naming. Favor type-only imports inline, prefer `async`/`await` over promise chains, and prefix intentionally unused vars with `_` to satisfy ESLint.

## Testing Guidelines
Automated tests are still being introduced; rely on `npm run check` for regressions until the Vitest/Playwright harness lands. When adding coverage, co-locate specs as `*.test.ts` beside the module, use Vitest or Testing Library for React, and mirror in-memory store behavior with scenario fixtures. Document any manual QA (e.g., running a draft into the scenario room) in the PR so reviewers can reproduce it.

## Commit & Pull Request Guidelines
Keep commit subjects short, imperative, and scoped where useful (e.g., `feat: add draft queue`). Squash noisy WIP commits before opening a PR. Every PR should explain the change, list verification commands, call out database or env updates, and attach UI screenshots when visuals shift. Wait for `check`, `lint`, and `build` to pass and request review before merging.

## Environment & Secrets
Define `DATABASE_URL` in `.env.local` if you want to experiment with persistence; otherwise you can run with `SKIP_ENV_VALIDATION=1` during local development. Never commit secrets. Rotate tokens whenever sharing sandboxes, and prefer parameterized queries once database persistence is introduced.

## Recent Changes
- 002-main-game-room: Planning the post-draft scenario room (20 static scenarios, unique idol assignments, reveal flow).
- 001-initial-page-setup: Implemented welcome screen, lobby, and draft board with shadcn UI and in-memory store.
