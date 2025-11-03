# Task Breakdown: Main Game Room Scenarios

## T1. Scenario Data & Store Extensions
- Create `src/data/scenarios.json` with 20 static scenario definitions (title, prompt, roles).
- Extend the game store types to include scenarios, role assignments, submission state, and scenario index.
- Implement store helpers for loading scenarios, assigning roles, submitting selections, and resetting state.
- Add Vitest unit tests covering role uniqueness, submission completion, and reveal trigger helpers.

## T2. Server Actions & Hooks
- Add server actions for scenario interactions (get scenario state, assign role, submit selections).
- Build a `useScenario` client hook that consumes the new actions with optimistic updates/polling.
- Ensure typing integration with existing tRPC utilities and shadcn-based components.

## T3. Room Route & Layout
- Create the `/game/[code]/room` route with shared layout (header, scenario status, participant list).
- Compose the page using shadcn components (`Card`, `Tabs`, `Dialog`, `Badge`, etc.) and theme tokens.
- Implement responsive design for mobile-first with desktop enhancements.

## T4. Interaction & Reveal UI
- Build the scenario card display with entrance animation and ARIA-live updates.
- Implement role assignment UI (role slots + idol selection drawer/grid with idol cards).
- Handle submission states, waiting indicators, and reveal view showing all players’ picks.
- Add Sonner toasts for success/error feedback and ensure reduced-motion support.

## T5. Testing & QA
- Write Vitest tests for the scenario store helpers and client hook edge cases.
- Add Playwright e2e coverage for a multi-player scenario flow (assign ➝ submit ➝ reveal).
- Document manual QA instructions (animation review, accessibility checks, responsive layout validation).
