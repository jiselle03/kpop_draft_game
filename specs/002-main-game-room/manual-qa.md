## Manual QA - Scenario Room

- Launch `npm run dev --turbo` and create a lobby through the homepage. Join with at least two browser windows.
- Complete a draft and confirm both clients route automatically to `/game/[code]/room` once the final pick locks.
- During the assignment phase, verify role buttons announce focus states and update the `aria-live` region when selections change. Toggle reduced-motion in system preferences to ensure card entrance animations do not play.
- Submit selections on one client and confirm the other shows “Waiting” status while keeping roles locked. Finish submissions on the second client and verify the reveal grid populates for every player without overlap.
- Resize between 375px, 768px, and desktop widths to check that the scenario card stacks above the sidebars on mobile and aligns side-by-side on larger screens. Confirm Toast notifications remain legible at each breakpoint.
