# K-Pop Draft Game

K-Pop Draft Game is a party-style drafting experience for up to six players. Each player recruits a roster of eight K-pop idols, then faces a series of playful scenarios where those idols need to take on specific roles. After selections are made, the table votes on whose lineup thrives (and whose idol choices flop) in every situation.

## Development

This project runs on Next.js 15 with the App Router, Tailwind CSS, shadcn/ui components, and tRPC for server-client communication. State is managed in-memory for now, with plans to layer in persistence as the game evolves.

To get started locally:

```bash
npm install
npm run dev --turbo
```

You can launch the optional Postgres instance via `./start-database.sh` if you want to experiment with persistence later on.

## Gameplay Overview

1. **Form the Lobby** – One player creates a lobby and shares the generated six-character code. The lobby fills out as friends join.
2. **Draft the Idols** – When everyone is ready, the host starts the draft. The game assigns a random snake order and each player chooses eight idols from the shared pool.
3. **Face the Scenarios** – After drafting, the game introduces random scenarios. Players pick which idols from their rosters should handle each role.
4. **Vote and Survive** – Everyone votes on the most convincing matchups. Track bragging rights, award points, or just laugh at the chaotic outcomes.

This repository currently focuses on the welcome screen, lobby flow, and draft mechanics described in the initial implementation spec. Future specs will flesh out the scenario system, persistence, richer voting, and UI polish.

## Scripts

Key commands you might use during development:

- `npm run dev --turbo` – Start the Next.js dev server
- `npm run build` / `npm run preview` – Build and preview production output
- `npm run lint` / `npm run lint:fix` – Run ESLint (set `SKIP_ENV_VALIDATION=1` locally if you haven’t configured database credentials)
- `npm run format:write` – Apply Prettier formatting
- `npm run typecheck` – Run TypeScript without emitting files

## Contributing

Requirements, flows, and component structure come from the spec files under `specs/001-initial-page-setup`. Feel free to open issues or contribute enhancements as the game expands beyond the initial lobby and draft experience. 💿✨
