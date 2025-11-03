# Implementation Plan: Main Game Room

## 1. Scenario Data & Store Enhancements
- Define `Scenario` JSON bundle (20 entries) under `src/data/scenarios.json`.
- Extend in-memory game store with scenario fields: `scenarios`, `currentScenarioIndex`, `roleAssignments`, `submissionState`.
- Add store helpers/actions: `loadNextScenario`, `assignRole`, `clearAssignment`, `submitSelections`, `resetSubmissions`.
- Write Vitest unit tests for role assignment rules (unique idol per scenario, submission gating, reveal trigger).

## 2. Server Actions & Hooks
- Create server actions in `src/server/game/actions.ts` for scenario lifecycle (fetch scenario state, assign role, submit, reveal).
- Build client hook `useScenario` for polling/optimistic updates using existing `useGame` pattern.
- Ensure typings align with shadcn-based UI components and existing TRPC helpers.

## 3. Routing & Layout
- Add new route `src/app/game/[code]/room/page.tsx` as client component.
- Structure layout with shadcn `Card`, `Tabs`, `Dialog` primitives and reuse theme tokens.
- Provide mobile-first responsive design mirroring spec (scenario card + roster + participants).

## 4. Scenario Interaction UI
- Scenario card: title, prompt, optional art with entrance animation (Tailwind animate utilities).
- Role assignment grid: per-role shadcn `Button` or `Card` triggers idol selection drawer.
- Idol selection panel: use `Dialog` or `Sheet` (if available) showing idol cards (`Card` + image).
- Submission states: shadcn `Alert` for waiting, progress indicator using `Badge`.
- Reveal state: animated display of all players’ picks (e.g., `Tabs` per player, `Accordion` for mobile).

## 5. Status & Notifications
- Use `sonner` toasts for submission success/errors, scenario updates.
- `aria-live` region for scenario/reveal announcements.
- Visual indicators for who has submitted (e.g., `Avatar` placeholder or `Badge`).

## 6. Testing & QA
- Vitest: scenario store helpers/unit tests (role assignments, submission completion).
- Playwright: e2e covering draft completion ➝ scenario assignment ➝ submissions ➝ reveal across two browser contexts.
- Manual QA checklist: responsive views, accessibility checks, animation respect for `prefers-reduced-motion`.
