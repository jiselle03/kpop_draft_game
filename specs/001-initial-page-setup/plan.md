# Implementation Plan: Initial Page Setup

## 1. Foundation & Tooling
- Define Tailwind theme tokens using the `@theme` directive (`tailwind.config.ts`) for primary, surface, and feedback colors aligned with shadcn/ui defaults.
- Verify shadcn/ui is initialized; install/generate required components (`button`, `input`, `card`, `badge`, `alert`, `dialog`, `toast`, `tabs`, `accordion`, `form`) via the shadcn CLI.
- Set up Vitest configuration (extend `vitest.config.ts` if absent) for React, JSX, and module aliases; ensure scripts exist (`test:unit`).
- Configure Playwright with Next.js; add npm script (`test:e2e`), base URL config, and project matrix for mobile & desktop viewports.

## 2. Data & State Layer
- Implement an in-memory lobby store (React context or server action layer) that tracks games, players, status transitions, and draft picks.
- Expose helpers for: create game (generate 6-char code), join game (validation + dedupe), start draft (lock & seed order), submit pick (turn validation).
- Add Vitest unit tests covering code generation uniqueness, snake order builder, lobby state transitions, and duplicate-name rejection.

## 3. Routing & Layout
- Create App Router routes: `/` (welcome), `/game/[code]/lobby`, `/game/[code]/draft`.
- Build shared layout shell with header/footer placeholders and responsive container utilities leveraging Tailwind theme tokens.
- Implement global toasts/alerts provider (shadcn `ToastProvider`) wired to lobby/draft events.

## 4. Welcome Experience
- Build welcome screen form using shadcn `Form`, `Input`, and `Button`, including inline validation messaging.
- Add CTA split (“Create Game” vs “Join Game”); conditionally reveal join code field and trigger respective handlers.
- Write integration tests (Vitest + React Testing Library) to assert validation, CTA behavior, and navigation triggers.

## 5. Lobby Experience
- Implement lobby page showing game code (shadcn `Badge` + copy button) and player list (shadcn `Card` or `List`).
- Include status banners for lobby full/locked and error states via `Alert`.
- Gate “Start Draft” button until two players present; display disabled state explanation and confirm dialog before locking (shadcn `Dialog`).
- Add responsive layout adjustments for mobile vs desktop (stacked vs split grid).
- Cover behaviors with integration tests for join success/failure and start gating.

## 6. Draft Board
- Render idol cards grid using shadcn `Card`; integrate Tailwind responsive columns and hover/disabled styles from theme tokens.
- Show active player indicator, round/turn tracker, and roster sidebar (shadcn `Tabs`/`Accordion`).
- Enforce snake order by consuming helper; lock card interaction for non-active players and already claimed cards.
- Emit toasts on invalid pick attempts or successful picks; transition to completion banner when all picks done.
- Write Vitest tests for pick reducer logic and turn progression; add Playwright scenario simulating multi-player draft (stub multiple browser contexts).

## 7. Accessibility, Performance & UX Polish
- Validate focus management for dialogs, toasts, and navigation between flows.
- Ensure ARIA live regions announce lobby roster updates and error messages.
- Implement lazy loading / code-splitting for draft board route; memoize idol card list.
- Capture responsive snapshots (Playwright screenshot assertions) at mobile and desktop breakpoints.

## 8. Documentation & Verification
- Update README with setup instructions (shadcn commands, Vitest/Playwright scripts) and feature summary.
- Provide manual QA checklist aligned with Success Criteria & Clarifications.
- Run `npm run lint`, `npm run test:unit`, and `npm run test:e2e` prior to handoff; document results.
