# Feature Spec: Main Game Room Scenarios

## Overview
- Deliver the post-draft “main game room” experience where all players converge after selecting their idol rosters.
- Present playful scenario cards that prompt players to assign specific roles to idols from their drafted lineup.
- Support simultaneous submissions, reveal everyone's choices once all responses are in, and encourage lighthearted discussion with subtle animation flourishes.

## Success Criteria
- After the final draft pick, every player is routed automatically to the main game room.
- The room displays the current scenario card with title, description, and listed roles to fill.
- Each player can assign exactly one idol from their eight-card roster to each required role; reassignments are allowed before submission.
- Submitting locks a player’s selections while others continue editing; submission state is visible to everyone (e.g., “Waiting for 2 players”).
- Once every player has submitted, the room transitions to a reveal state showing each player’s picks per role.
- The UI supports up to six players and four simultaneous roles, with room to expand for future scenarios.
- Animations: scenario card entrance, submission confirmation, and reveal shuffle—all performant on desktop and mobile.
- No player can select an idol they did not draft; enforcing unique use is optional but configurable in the data model.

## Out of Scope
- Long-term persistence of submissions (current scope is in-memory until broader persistence lands).
- Voting mechanics or scoring—future specs will introduce the survive/succeed vs. fail phase.
- Scenario authoring tools or admin dashboards (manually defined data for now).
- Real-time networking beyond the existing in-memory store; optimistic updates are sufficient.

## User Flows
- **Post-Draft Transition**
  - Draft completes ➝ automatic navigation to `/game/[code]/room`.
  - Room header shows lobby code, player roster, and scenario status (e.g., “Scenario 1 of X”).
- **Scenario Interaction**
  - Scenario card displays playful prompt text, optional illustration, and a role list.
  - Players click a role slot to select an idol from their roster; selection drawer shows idol cards with name, group, image, and tags.
  - Role assignment updates immediately; already used idols grey out if unique per role is enforced.
- **Submission / Reveal**
  - Submit button remains disabled until all roles are filled.
  - After submission, user sees a waiting state; late edits are locked unless players choose “Edit selections” (if allowed before everyone submits).
  - When the final submission arrives, a reveal animation shows all players’ cards per role—grid or tabbed per player.
- **Scenario Cycling (stretch)**
  - Optional “Next Scenario” control for host that resets the state and loads a new card (future spec).

## UX & Accessibility
- Maintain the existing theme tokens and shadcn/ui vocabulary—scenario card built with `Card`, assignments with `Tabs` or custom grid.
- Animations should be subtle (e.g., Tailwind animate utilities) and respect `prefers-reduced-motion` where possible.
- Provide clear focus states for role buttons and idol selection, including keyboard navigation through cards.
- Announce status changes (scenario loaded, submission pending, reveal) via `aria-live` regions to keep screenreader users in sync.
- Use responsive layout: stack card + player lists on mobile, side-by-side on desktop.

## Data Model (In-Memory Extension)
- Reuse existing `Game` structure; add:
  - `scenarios: Scenario[]` – list of scenario definitions.
  - `currentScenarioIndex: number`.
  - `roleAssignments: Record<ScenarioRole['id'], Record<Player['id'], string>>` mapping role → player → idolId.
  - `submissionState: Record<Player['id'], 'pending' | 'submitted'>`.
- `Scenario`: `{ id: string, title: string, prompt: string, roles: ScenarioRole[], imageUrl?: string }`.
- `ScenarioRole`: `{ id: string, label: string, description?: string, allowDuplicateIdols?: boolean }`.
- Business rules:
  - Players can only assign from `game.picks[playerId]`.
  - Scenario completes when every player submits; readiness is derived from `submissionState`.

## Validation & Error States
- Prevent submission if any role lacks an idol.
- Show inline errors if a player attempts to assign a non-existent idol (e.g., due to stale state).
- Display a toast/banner if the scenario state updates mid-selection (another player triggered reveal).
- If a player disconnects before submitting, allow the host to skip or force-complete (future enhancement—log for backlog).

## Technical Constraints
- Build on the existing in-memory lobby/draft store; add scenario lifecycle helpers (load scenario, assign role, submit selections, trigger reveal).
- New client components live under `src/app/game/[code]/room/`.
- Use tRPC or dedicated server actions for assignment and submission; maintain optimistic state in the client hook.
- Avoid introducing new dependencies unless required for animation—prefer Tailwind animate utilities.

## Performance
- Scenario card and roster selection should render without noticeable lag using memoized idol data (reuse draft roster cache).
- Keep animations lightweight; avoid large image loads for scenario cards unless lazy-loaded.
- Batched state updates when multiple players submit at once to avoid UI thrash.

## Testing
- **Unit**: Scenario reducer helpers (role assignment, submission completion), guard rails for duplicate idol assignment.
- **Integration**: React Testing Library coverage for role selection form, submission lockouts, reveal state.
- **Manual / E2E (future)**: Multi-client scenario flow, interruption handling (player leaves mid-scenario).

## Open Questions
- Idol usage must be unique per scenario—each idol can fill only one role per round.
- Ship with 20 scenarios defined in a static JSON bundle; future specs may replace these with AI-generated prompts.
- Post-reveal voting (succeed vs. flop) will be handled in the next spec; no automatic advancement controls needed yet.*
