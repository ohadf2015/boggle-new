# MP Flow Responsive Sweep — Design

**Date:** 2026-05-14
**Author:** Ohad / Claude
**Status:** Approved (brainstorm)
**Target viewport pain points:** 744×661 (tablet portrait / split-view) — wasted horizontal space in every MP surface.

## Goal

Make the multiplayer flow (Hub → Lobby → In-Game) look good and stay responsive across phone, tablet portrait, tablet landscape, small laptop, and desktop. Eliminate the dead-zone between `sm` (640px) and `lg` (1024px) where mobile single-column layouts persist far past their usefulness.

## Non-Goals

- Copy or i18n changes
- New juice / animation
- WheelRush MP and Blast MP surface adapters (own layout system)
- Avatar-strip personality redesign
- Logic / state-machine changes

## Breakpoint Contract

| Viewport | Tailwind trigger | MP layout behavior |
|---|---|---|
| <640 | base | Single column, full width, stacked |
| 640–767 | `sm:` | 2-col CTA grids; side-by-side action buttons inside popups |
| **768–1023** | **`md:`** | **Side-by-side board+leaderboard (in-game); mode-selector + how-to-play split (lobby); hub left-rail + room list 2-col** |
| ≥1024 | `lg:` | Full layout. Max-widths cap content. |
| ≥1440 | `xl:` | No change |

This is the core change: every place currently keyed off `lg:` becomes `md:` so the layered layouts trigger at 768 instead of 1024.

## Phase 1 — In-Game (`fe-next/components/wordhunt/WordHuntGameLayout.tsx`)

Current: `flex-1 flex flex-col lg:flex-row min-h-0` — board+leaderboard side-by-side only at ≥1024. At 744px the board sits centered with hundreds of wasted pixels on each side (your img 5).

Changes:
- `lg:flex-row` → `md:flex-row`
- Main board container: cap `max-w-[min(520px,calc(100vh-200px))]` so board doesn't stretch giant on ultrawide.
- `WordHuntMPLeaderboard` gets a `compact` prop. Compact = 240–280px fixed width column with smaller avatars + tighter row padding, used at `md:` only. Existing wide layout preserved for `xl:` desktop.
- Verify: timer ring + score chip + exit door positioning unchanged.

Files touched:
- `fe-next/components/wordhunt/WordHuntGameLayout.tsx`
- `fe-next/components/wordhunt/WordHuntMPLeaderboard.tsx` (add compact variant)

## Phase 2 — Lobby (`fe-next/components/multiplayer/MultiplayerLobby.tsx`)

Issues from img 2/3/4:
- Players cluster floats in middle with crown drifting — wastes vertical, awkward composition.
- Mode-selector full-width above how-to-play card — stacks vertically, pushes CTA below the fold.
- Empty-state popup (img 4) has no max-width, vertically stacked buttons.
- Two flag indicators (ESPAÑOL pill + small inner flag chip) duplicate.

Changes:
- **Players area:** replace floating-circle layout with horizontal avatar strip. Host card first (crown chip above), then human players, then bot "+" slot inline. Centered at <768, left-aligned at ≥768. Each slot 80–96px wide.
- **Mode selector + How-to-Play:** stack on mobile, **60/40 split at `md:`** (mode-selector left, how-to-play right). Keeps CTA in viewport.
- **Empty-state invite card:** `max-w-md mx-auto`, buttons side-by-side at `sm:` (640+) using `flex flex-col sm:flex-row`.
- **Header dedupe:** drop the redundant flag chip next to ESPAÑOL pill. Keep one.

Files touched:
- `fe-next/components/multiplayer/MultiplayerLobby.tsx`
- Child components for player slots, mode selector, how-to-play, empty-state invite (paths discovered during implementation).

## Phase 3 — Hub (`fe-next/components/multiplayer/RoomListView.tsx`)

Current: `lg:grid lg:grid-cols-[minmax(280px,360px)_1fr]` — 2-col at 1024+. At 744 stacks vertically, hero image dominates, CTAs push down.

Changes:
- `lg:grid-cols-[minmax(280px,360px)_1fr]` → `md:grid-cols-[minmax(260px,320px)_1fr]`
- Hero image: add `max-h-[200px] md:max-h-[260px] object-cover` so it doesn't dominate when narrow.
- ArenaCTAStrip already uses 2-col grid (Quick Play + Create) — leave.

Files touched:
- `fe-next/components/multiplayer/RoomListView.tsx`

## Phase 4 — Header (top app nav)

Current (img 1): logo + sound + lang + INICIAR SESIÓN + REGISTRARSE + hamburger menu. At 744px the auth buttons squeeze against the menu, no breathing room.

Changes:
- Below `820px` (use a custom `min-[820px]:` prefix or a JS-driven container query): collapse "INICIAR SESIÓN" + "REGISTRARSE" into the hamburger menu. Show a single compact "Sign in" pill (or icon-only `LogIn` lucide icon) in their place.
- Sound + lang chips stay always.
- Header file discovered during implementation (likely `components/layout/TopNav.tsx` or `AppHeader.tsx`).

## Testing

### Manual visual matrix (mandatory before each phase commit)
Chrome DevTools device toolbar, resize to:
- 360 × 800 (phone portrait — iPhone SE)
- 640 × 900 (phone landscape / very small tablet)
- **744 × 661 (the user-reported pain point)**
- 768 × 1024 (iPad portrait)
- 1024 × 768 (iPad landscape / small laptop)
- 1440 × 900 (desktop)

For each width, verify the phase's surface:
- No element clips or overflows
- Primary CTA in viewport
- No double scrollbars
- Side-by-side composition triggers at the right breakpoint
- Text remains legible (no broken truncation)

### Browser test (user requirement)
After each phase: `npm run dev` (port 3001 per project memory), open `/multiplayer` in Chrome at 744 width via DevTools, walk Hub → Lobby → bot game → in-game WordHunt. Capture before/after screenshots if possible.

### Existing tests
- `npm run test` — full Vitest must stay green.
- `npm run lint && npm run build` after each phase.
- No new behavioral tests required (layout-only changes). If a phase touches component logic (unlikely), add a unit test.

## Risks

1. **`WordHuntMPLeaderboard` compact variant** may need spacing tweaks to look right at 240px. Mitigation: verify desktop `xl:` view still uses wide layout untouched.
2. **Lobby players-strip rebuild** touches host/bot/edit-name affordances — must preserve the pencil-icon name-edit + bot-add interactions.
3. **Hub `md:` 2-col at 768** may feel cramped if both hero card and room list want >320px. Mitigation: tested in matrix, fall back to `lg:` if cramped at 768.
4. **Header `min-[820px]:` custom breakpoint** is a new Tailwind value — needs `tailwind.config.ts` screens entry or arbitrary-value prefix (`min-[820px]:`). Verify CSS bundle isn't bloated.

## Out of Scope (future work)

- Container-query migration (`@container`) — punted for now per approach decision.
- Avatar strip visual personality (chibi mascots, kawaii frames).
- WheelRush MP / Blast MP layout adapters.
- Animation choreography on layout shift.

## Phasing & Commit Discipline

Per `.claude/rules/10-git.md` PIV phase commits:

| Phase | Commit message |
|---|---|
| 1 | `refactor(mp): in-game board+leaderboard side-by-side at md:` |
| 2 | `refactor(mp): lobby players strip + mode/how-to split + empty-state popup width` |
| 3 | `refactor(mp): hub left-rail 2-col triggers at md:` |
| 4 | `refactor(header): collapse auth buttons into menu at <820px` |

Each phase = browser-tested + lint + test + build green BEFORE commit. No batched commits across phases.
