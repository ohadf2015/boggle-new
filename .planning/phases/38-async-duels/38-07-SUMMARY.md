---
phase: 38
plan: 07
subsystem: education/duels
tags: [routing, ui-components, navigation, soc-02]
requires: [38-05-duels-lobby-ui, 38-06-duels-game-history]
provides:
  - Routable duels pages (/education/duels, /education/duels/[duelId])
  - ChallengeButton reusable component (SOC-02)
  - Barrel exports for all duel components
affects: [38-08-duels-translations]
tech-stack:
  added: []
  patterns:
    - Next.js App Router with dynamic routes
    - Tab-based navigation with state
    - Barrel export pattern for clean imports
key-files:
  created:
    - fe-next/app/[locale]/education/duels/page.tsx
    - fe-next/app/[locale]/education/duels/PageClient.tsx
    - fe-next/app/[locale]/education/duels/[duelId]/page.tsx
    - fe-next/app/[locale]/education/duels/[duelId]/PageClient.tsx
    - fe-next/components/education/duels/ChallengeButton.tsx
    - fe-next/components/education/duels/__tests__/ChallengeButton.test.tsx
    - fe-next/components/education/duels/index.ts
  modified: []
decisions:
  - slug: duels-tab-navigation
    title: State-based tabs instead of routing-based
    rationale: Simpler implementation, no URL complexity, instant tab switching
    alternatives: Could use URL query params for tab state
    impact: Tab state not preserved in URL, but better UX
  - slug: participant-verification
    title: Server-side participant check on duel page load
    rationale: Security - prevent users from viewing duels they're not in
    alternatives: Client-side only check (less secure)
    impact: Extra DB query on page load, but ensures authorization
  - slug: challenge-button-variants
    title: Two variants (button and icon) for different contexts
    rationale: Supports both roster/profile placement (compact icon) and standalone use (full button)
    alternatives: Single variant with size prop
    impact: Flexible placement options for SOC-02 requirement
metrics:
  duration: 4 min
  completed: 2026-02-13
---

# Phase 38 Plan 07: Duel Pages & Routes Summary

> Routable pages for duels with lobby/history tabs and reusable challenge button (SOC-02)

## Objective

Create page routes for the duels section, enabling students to navigate to `/education/duels` to see lobby and history, and `/education/duels/[duelId]` to play specific duels. Also create a reusable ChallengeButton component that can be placed anywhere (profile, roster) to challenge specific students, satisfying SOC-02 requirement.

**Result**: Students can now navigate to duels pages, switch between lobby and history tabs, play specific duels, and challenge classmates from any context.

## Implementation

### Task 1: Duels Pages and Routing

**Created page routes:**

1. **Main Duels Page** (`/education/duels`)
   - Server component wrapper with dynamic rendering
   - Client component with tab navigation (Lobby | History)
   - Tab state management with active highlighting
   - Classroom membership check with fallback message
   - Integration of DuelNotification for persistent challenge alerts

2. **Individual Duel Page** (`/education/duels/[duelId]`)
   - Server component wrapper with duelId from params
   - Client component with participant verification
   - Security check: Only duel participants can view the game
   - Error handling for not found / not participant cases
   - DuelGameView integration for gameplay

**Tab Navigation Pattern:**
- State-based tabs (not routing-based) for instant switching
- Active tab: neo-yellow underline with border-b-4
- Inactive tabs: muted text with hover effect
- Icons for visual clarity (Swords for lobby, Trophy for history)

**Security:**
- Duel participant verification on page load
- Redirect to lobby if duel not found or user not participant
- Auth check for all duel pages

### Task 2: ChallengeButton + Barrel Exports

**Created ChallengeButton component:**

**Features:**
- Two variants: `button` (default) and `icon`
- Opens DuelChallengeModal with pre-filled opponent info
- Neo-brutalist styling (orange button, hover scale, hard shadows)
- RTL support

**Variants:**
1. **Button variant**: Full button with Swords icon + "Challenge" text
   - Use case: Standalone challenges, profile pages
   - Styling: bg-neo-orange, border-3, shadow-hard-sm

2. **Icon variant**: Compact icon-only button
   - Use case: Classroom rosters, compact spaces
   - Styling: text-neo-orange, hover text-neo-yellow

**Test Coverage:**
- 9 tests covering both variants
- Modal open/close behavior
- Opponent info handling (null and string avatars)
- All tests passing ✓

**Barrel Export:**
- Created `index.ts` for clean imports
- Exports all 6 duel components:
  - DuelLobby
  - DuelChallengeModal
  - DuelGameView
  - DuelHistory
  - DuelNotification
  - ChallengeButton

## Testing

**Test Results:**
```
ChallengeButton: 9/9 tests passing ✓
- Button variant renders correctly
- Icon variant renders without text
- Modal opens on click
- Modal closes on onClose
- Opponent info passed correctly
- Handles null and string avatars
```

**Manual Testing:**
- Pages created with correct Next.js structure
- Lint passes on new files ✓
- No TypeScript errors ✓

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

**Created (7 files):**
1. `fe-next/app/[locale]/education/duels/page.tsx` - Main duels page wrapper
2. `fe-next/app/[locale]/education/duels/PageClient.tsx` - Duels page client component with tabs
3. `fe-next/app/[locale]/education/duels/[duelId]/page.tsx` - Individual duel page wrapper
4. `fe-next/app/[locale]/education/duels/[duelId]/PageClient.tsx` - Duel game page client component
5. `fe-next/components/education/duels/ChallengeButton.tsx` - Reusable challenge button (SOC-02)
6. `fe-next/components/education/duels/__tests__/ChallengeButton.test.tsx` - Test suite
7. `fe-next/components/education/duels/index.ts` - Barrel export

**Modified (0 files):**
- None

## Key Decisions

### 1. State-Based Tab Navigation
**Decision**: Use state-driven tabs instead of routing-based tabs.

**Rationale**:
- Simpler implementation (no URL query params)
- Instant tab switching (no page reload)
- Better UX for quick navigation between lobby and history

**Alternative**: Use URL query params (`?tab=lobby`) for shareable tab state.

**Impact**: Tab state not preserved in URL, but provides better user experience with instant switching.

### 2. Participant Verification on Duel Page
**Decision**: Verify user is a duel participant on page load via server-side check.

**Rationale**:
- Security: Prevent users from viewing duels they're not involved in
- Authorization enforcement at route level

**Alternative**: Client-side only check (less secure, can be bypassed).

**Impact**: Extra DB query on page load, but ensures proper authorization.

### 3. ChallengeButton Dual Variants
**Decision**: Support two variants (button and icon) for different placement contexts.

**Rationale**:
- **Button variant**: Full button for standalone use (profile pages)
- **Icon variant**: Compact icon for tight spaces (classroom rosters)
- Satisfies SOC-02 requirement (challenge from anywhere)

**Alternative**: Single variant with size prop.

**Impact**: Flexible placement options enable SOC-02 pattern across the app.

## Next Phase Readiness

**Blockers**: None

**Dependencies Satisfied**:
- 38-05: DuelLobby component available ✓
- 38-06: DuelGameView and DuelHistory components available ✓

**Enables**:
- **38-08**: Translations can now be added for all duel UI text
- **SOC-02**: Challenge button can be placed on profiles and rosters

**Integration Points**:
- ChallengeButton ready for integration in student profiles
- ChallengeButton ready for integration in classroom rosters
- Duels pages ready for translation keys

## Notes

### Design Patterns Used

1. **Next.js App Router Pattern**:
   - Server component wrapper (dynamic rendering)
   - Client component for interactivity
   - Dynamic routes with `[duelId]` parameter

2. **Tab Navigation**:
   - State-based tab switching
   - Active tab highlighting (neo-yellow border-b-4)
   - Icon + text labels for clarity

3. **Barrel Export Pattern**:
   - Single import point for all duel components
   - Cleaner import statements across codebase

### SOC-02 Satisfied

**Requirement**: "Students can challenge classmates from profile or roster."

**Implementation**:
- ChallengeButton component created with two variants
- Can be placed anywhere in the app (profile, roster, standalone)
- Opens DuelChallengeModal with pre-filled opponent info
- Both icon and button variants for different contexts

**Next Step**: Integrate ChallengeButton in:
- Student profile pages
- Classroom roster views

### Translation Keys Needed (38-08)

The following translation keys are referenced but not yet defined:
- `duels` - Main duels title
- `lobby` - Lobby tab label
- `history` - History tab label
- `joinClassroomToDuel` - No classroom message
- `duelNotFound` - Duel not found error
- `notParticipant` - Not a participant error
- `backToLobby` - Back button text
- `challenge` - Challenge button text
- `challengeSent` - Challenge sent confirmation

Plan 38-08 will add all missing translation keys.

## Commits

**Task 1 - Duels Page Routes:**
```
b08f9ba6 feat(38-07): add duels page routes with lobby and history tabs
- Create /education/duels page with lobby/history tabs
- Create /education/duels/[duelId] page for individual duel gameplay
- Tab navigation with active state highlighting
- Verify user is participant before rendering duel
- Handle missing classroom state with message
- Integrate DuelNotification for challenge alerts
```

**Task 2 - ChallengeButton + Barrel Exports:**
```
7fd0d2fc feat(38-07): add ChallengeButton and barrel exports
- Create ChallengeButton with button and icon variants
- Support challenging from profile/roster (SOC-02)
- Add comprehensive test suite (9 tests)
- Create barrel export for all 6 duel components

Test Results:
✓ 9/9 ChallengeButton tests passing
- Button and icon variants render correctly
- Modal opens/closes as expected
- Opponent info passed correctly
```

## Success Criteria

- [x] Student can navigate to `/education/duels` to see lobby + history
- [x] Student can play specific duel at `/education/duels/[duelId]`
- [x] ChallengeButton can be placed anywhere (profile, roster) to challenge specific student
- [x] All components properly exported from barrel
- [x] All text uses `t()` function (translation keys pending in 38-08)
- [x] Lint passes on new files
- [x] 9/9 ChallengeButton tests passing

**All success criteria met.** ✓

## Phase Progress

**Phase 38 (Async Duels):**
- Plans completed: 7/8 (87.5%)
- Next plan: 38-08 (Duel Translations)

**Overall Progress:**
- This plan completed in 4 minutes
- Phase 38 averaging 10 minutes per plan
- TDD producing comprehensive test coverage (9 new tests)

---

*Summary generated: 2026-02-13*
*Execution time: 4 minutes*
*Tests added: 9*
*Test pass rate: 100%*
