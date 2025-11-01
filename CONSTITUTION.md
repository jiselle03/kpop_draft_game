# Project Constitution

## Code Quality
- Write readable, modular code with clear responsibilities and TypeScript typings.
- Follow repository linting and formatting rules; fail builds on ESLint or Prettier errors.
- Favor composition over deep inheritance; document non-obvious decisions inline.

## Testing Standards
- Maintain fast, deterministic unit tests for business logic, utilities, and draft mechanics.
- Cover critical user journeys with automated end-to-end tests (browser-driven).
- Treat test failures as release blockers; add regression tests when bugs are fixed.

## User Experience Consistency
- Deliver simple, predictable interactions with clear calls-to-action.
- Apply shadcn/ui components as the primary UI building blocks, extending with Tailwind utilities only as needed.
- Enforce accessibility basics: labeled controls, keyboard navigation, focus visibility, and ARIA feedback for live updates.

## Responsive Design
- Optimize for mobile-first; ensure layouts scale gracefully at <640px, ≥768px, and ≥1024px breakpoints.
- Reuse responsive Tailwind patterns and shared layout primitives across pages.

## Performance Requirements
- Target Core Web Vitals “Good” thresholds (LCP <2.5s, INP <200ms, CLS <0.1) on landing, lobby, and draft views.
- Lazy-load non-critical modules and memoize heavy computations (e.g., idol card grids).
- Keep dependencies minimal; prefer platform and Next.js/React features, introducing new packages only with measurable benefit.

## Platform Versions
- Build and test against `next@^15.2.3`, `react@^19.0.0`, and `tailwindcss@^4.0.15` from `package.json`.
- Validate UI components against the configured shadcn/ui version and Tailwind plugin setup before upgrades.
