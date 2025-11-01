# Task Breakdown: Initial Page Setup

## T1. Tailwind Theme & shadcn Setup (Estimate: 1.5d)
- Update `tailwind.config.ts` with `@theme` color tokens and typography spacing defaults.
- Run shadcn UI generator for required components (`button`, `input`, `form`, `card`, `badge`, `alert`, `dialog`, `toast`, `tabs`, `accordion`).
- Document component import conventions and ensure shared styles align with the constitution.

## T2. Vitest & Playwright Infrastructure (Estimate: 1d)
- Add/extend `vitest.config.ts` for React, JSX transform, and path aliases.
- Configure Playwright (including `playwright.config.ts`) with base URL, viewports, and scripts (`test:unit`, `test:e2e`).
- Add example smoke tests to confirm tooling runs headlessly in CI.

## T3. Lobby State Module (Estimate: 2d)
- Implement in-memory store/context for `Game`, `Player`, and `IdolCard` data plus helper actions (create, join, start, pick).
- Write Vitest unit tests for game code generation, snake order builder, duplicate name rejection, and state transitions.
- Expose hooks/server actions for UI layers to consume.

## T4. Routing & Shared Layout (Estimate: 1.5d)
- Create App Router structure (`/`, `/game/[code]/lobby`, `/game/[code]/draft`) with shared layout shell and navigation.
- Integrate shadcn `ToastProvider` and responsive container utilities using theme tokens.
- Add integration tests verifying navigation flow between routes.

## T5. Welcome Screen Implementation (Estimate: 1.5d)
- Build the welcome form with shadcn `Form`, `Input`, `Button`, and validation messages.
- Implement CTA handling for create vs join flows, including inline error messaging.
- Add integration tests covering validation, join/create branching, and navigation handoff.

## T6. Lobby Experience (Estimate: 2d)
- Render lobby UI with player list, game code badge + copy, locked/full banners, and “Start Draft” confirmation dialog.
- Enforce start gating (min two players) and handle join errors via toasts.
- Write integration tests for lobby state updates and Playwright scenario for two users joining and starting draft.

## T7. Draft Board & Roster (Estimate: 2.5d)
- Build idol card grid, active player indicator, turn tracker, and roster sidebar using shadcn components.
- Implement pick enforcement, disabled states, and completion summary.
- Add Vitest tests for pick reducer and Playwright E2E simulation for multi-round draft.

## T8. Accessibility & Performance Polish (Estimate: 1d)
- Validate keyboard focus order, ARIA live regions, and responsive behavior across breakpoints.
- Add lazy loading for draft route and memoization of idol card list.
- Capture Playwright visual snapshots for mobile/desktop.

## T9. Documentation & QA Sign-off (Estimate: 0.5d)
- Update README with setup instructions and testing commands.
- Create manual QA checklist referencing success criteria and clarifications.
- Run `lint`, `test:unit`, `test:e2e`, and record results for handoff.
