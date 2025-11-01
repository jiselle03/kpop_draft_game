# Feature Spec: Initial Page Setup

## Overview
- Deliver the entry experience for the K-Pop Draft Game, enabling up to 6 players to create or join a draft session.
- Provide a welcome screen that collects a display name and branches into “Create Game” or “Join Game” flows.
- Host a lobby state that manages player membership, exposes a generated game code, and locks when the draft begins.
- Transition all players into a draft board presenting idol cards (JSON-driven placeholder data) with a controlled snake pick order that ends after each player drafts 8 cards.
- Implement UI with Next.js App Router, React 19, Tailwind CSS 4, and shadcn/ui primitives wherever possible.

## Success Criteria
- Users can enter a valid display name (2–20 trimmed characters) on the welcome screen.
- Creating a game yields a unique 6-character alphanumeric code, displays it to the creator, and opens a lobby that accepts up to 5 additional players.
- Joining requires the code, handles invalid/full/locked states gracefully, and syncs the lobby roster for all participants.
- The creator can start the draft once at least 2 players (creator plus one participant) are present; starting immediately locks the lobby and broadcasts the draft view to everyone.
- Draft board assigns deterministic random seating, enforces snake order (e.g., 1-2-3-4-4-3-2-1...), prevents out-of-turn or duplicate picks, and ends when every player has 8 cards.
- Post-draft, each participant sees their roster summary with exactly the cards they selected.
- Layout adapts for mobile (<640px), tablet (≥768px), and desktop (≥1024px) with no functional regressions across breakpoints.

## Out of Scope
- Persisting data beyond in-memory/session storage (future specs may add database integration).
- Authentication, accounts, or authorization beyond display names.
- Gameplay mechanics after drafting (matches, scoring, etc.).
- Real idol dataset (stub JSON acceptable).
- Handling more than 6 concurrent players.

## User Roles
- **Creator**: First player to create the lobby; can start the draft and sees the generated code.
- **Participant**: Any player joining via code; can view lobby roster and draft when it is their turn.

## User Flows
- **Welcome Screen**
  - Input: display name with inline validation.
  - Action buttons: “Create Game”, “Join Game” (shadcn/ui Button).
  - Join selection reveals code field (shadcn/ui Input) and submit control.
- **Create Game Flow**
  - Generate code, store lobby state, show code in shareable component (e.g., Badge/Alert from shadcn/ui).
  - Lobby view lists players, indicates slots remaining, surfaces “Start Draft” CTA (disabled until ≥2 players, i.e., creator plus at least one participant).
  - When “Start Draft” fires, mark lobby locked and navigate all players to draft board.
- **Join Game Flow**
  - Validate code format (uppercase alphanumeric) and lobby availability.
  - Successful join adds player to lobby roster; errors displayed inline via shadcn/ui Form/Alert.
- **Draft Board Flow**
  - Assign seat numbers randomly once, persist in lobby state.
  - Calculate snake order queue based on player count for 8 rounds (8 picks per player).
  - Display idol cards grid (shadcn/ui Card) showing name, group, optional image stub.
  - On turn, enable selection for active player only; picking removes card from available deck and appends to player roster.
  - Once all picks complete, show completion banner and per-player roster list (shadcn/ui Tabs or Accordion optional).

## UX & Accessibility
- shadcn/ui components are the default for buttons, inputs, dialogs/modals, lists, and feedback to ensure consistency.
- Ensure focus outlines and keyboard navigation through all interactive elements.
- Use ARIA live regions for lobby updates (new player joins, errors).
- Provide responsive grid adjustments (Tailwind `grid-cols-1` → `grid-cols-2` → `grid-cols-4` as viewport grows).
- Keep copy concise with clear CTAs; support copy-to-clipboard for game codes.

## Data Model (In-Memory)
- `Game`: `{ id: string, code: string, status: 'lobby' | 'locked' | 'drafting' | 'complete', players: Player[], turnOrder: string[], picks: Record<Player['id'], string[]> }`
- `Player`: `{ id: string, name: string, seat: number, isCreator: boolean }`
- `IdolCard`: `{ id: string, name: string, group: string, imageUrl?: string }`
- Store generated `turnOrder` once per game to keep seating deterministic.
- Reject duplicate player names within a lobby (case-insensitive compare).

## Validation & Error States
- Name errors: length violation, duplicate in lobby.
- Code errors: not found, lobby full (>6 players), lobby locked/drafting/completed.
- Turn validation: block picks from non-active players with toast/banner feedback.
- Empty state: if no idol cards available, show placeholder message and disable draft.

## Draft Mechanics
- Use Fisher–Yates shuffle to randomize player ordering the first time the lobby transitions to drafting.
- Generate snake order sequence for `players.length * 8` picks.
- Track active pick index; advance automatically after valid pick.
- When final pick recorded, set game status to `complete` and broadcast final view.

## Technical Constraints
- Frameworks: Next.js 15 App Router, React 19, Tailwind CSS 4 (via shadcn/ui integration).
- Components: Prefer shadcn/ui when available; extend with Tailwind utilities for layout only.
- State management: Start with React server/client components plus context; avoid additional libraries unless planning reveals necessity.
- Code quality: Adhere to eslint/prettier rules per repo configuration.

## Performance
- Aim for <2.5s LCP on lobby and draft board pages.
- Lazy-load draft components after lobby load to keep initial bundle light.
- Memoize heavy idol card lists and use virtualization if card count exceeds 100 (future-proofing).

## Testing
- **Unit**: code generator uniqueness/pattern, snake order generator, lobby state transitions.
- **Integration**: component tests for welcome form validations, lobby join/start interactions using shadcn/ui components.
- **E2E**: multi-user draft simulation (happy path), lobby lock-out test, responsive snapshot checks at mobile/desktop widths.

## Clarifications
### Session 2025-02-15
- Q: Minimum players required before “Start Draft” becomes enabled? → A: 2 players (creator + 1)

## Open Questions
- Should lobbies auto-expire after inactivity? assumed no for now.
- Final idol card schema/file path and hosting plan.
- Future persistence layer (database/service) to align temporary in-memory structures.
