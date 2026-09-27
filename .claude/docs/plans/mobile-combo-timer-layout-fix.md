# Feature: Mobile Combo Timer Layout Fix

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

In mobile view (portrait layout), the combo indicator and timer are currently positioned using a **three-column flexbox layout** (Combo | Timer | Score). This causes the combo indicator to visually overlap/stack behind the timer, making it difficult to see and creating layout conflicts. The combo indicator needs its own dedicated space with clear visual separation from the timer.

## User Story

As a mobile player
I want to clearly see my combo indicator without it being hidden behind the timer
So that I can track my combo progress and react quickly to maintain my streak

## Problem Statement

**Current Implementation (Problematic):**
- In `PortraitLayout.tsx` (lines 228-242), the combo is positioned on the **left** side using `flex-1 flex justify-end pr-1`
- Timer is **centered** using `relative z-20 shrink-0`
- Score is positioned on the **right** using `flex-1 flex justify-start pl-1`
- This creates a three-column layout: `[Combo] [Timer] [Score]`
- The combo indicator appears **behind** the timer due to z-index stacking and horizontal crowding

**Current Z-Index Stack:**
- Timer: `z-20`
- Combo (on mobile left side): default z-index (lower than timer)
- Combo (on desktop): `z-30` (higher than timer)

**Visual Issue:**
When a combo is active, the fire emoji (🔥) and "x3 Combo" text render in the left flex column, but due to limited horizontal space on mobile, it appears to be "behind" or overlapping with the timer circle.

## Solution Statement

**New Implementation (Clear Separation):**
- Move combo indicator **below the timer** in mobile view only
- Create a dedicated row for the combo with centered positioning
- Maintain the existing desktop layout (timer centered, combo/score on the right as absolute positioned elements)
- Ensure combo has proper visibility with adequate spacing
- Use conditional rendering based on screen size (mobile vs desktop)

**Layout Structure (Mobile):**
```
[Header]
[Combo Row - centered]  ← NEW dedicated row
[Timer]                 ← Center of stats row
[Score]                 ← Right side of stats row
[Word Forming Area]
[Grid]
```

**Layout Structure (Desktop - unchanged):**
```
[Header]
[Timer] [Combo+Score stack - absolute right] ← Existing layout
[Word Forming Area]
[Grid]
```

## Feature Metadata

**Feature Type:** Enhancement (UI layout fix)
**Estimated Complexity:** Low (single component modification with CSS adjustments)
**Primary Systems Affected:**
- `components/game/in-game/components/PortraitLayout.tsx` (multiplayer)
- `components/singleplayer/game/components/PortraitGameLayout.tsx` (single-player)
**Dependencies:** None (uses existing components)

---

## CONTEXT REFERENCES

### Prime Context (READ THIS FIRST!)

- `.claude/agents/context/prime-context.md` - COMPLETE codebase overview
  - **WHY:** Contains all project patterns, configurations, and architecture
  - **ACTION:** Read this file first to understand the codebase

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `components/game/in-game/components/PortraitLayout.tsx` (lines 211-310)
  - **WHY:** Contains the current problematic layout with three-column stats row
  - **PATTERN:** Three-column flexbox: `[Combo-left] [Timer-center] [Score-right]`
  - **ISSUE:** Combo appears behind timer due to horizontal crowding (lines 228-242)

- `components/singleplayer/game/components/PortraitGameLayout.tsx` (lines 227-342)
  - **WHY:** Single-player version with same layout issue
  - **PATTERN:** Same three-column layout as multiplayer
  - **ISSUE:** Combo positioned on left side with `flex-1 justify-end` (lines 229-242)

- `components/game/ComboDisplay.tsx` (full file)
  - **WHY:** The combo component that needs better positioning
  - **PATTERN:** Self-contained component with `compact` prop for mobile
  - **SIZE:** Width is `w-[100px]` in compact mode (line 179)

- `components/CircularTimer.tsx` (full file)
  - **WHY:** Timer component - understand its sizing for layout calculations
  - **PATTERN:** Responsive sizing with `size` prop: `xs` (80px), `sm` (100px), `md` (120px), `lg` (140px)
  - **MOBILE SIZE:** Uses `xs` size (80px) on mobile (line 18)

- `components/game/__tests__/InGameScreenComboLayout.test.tsx` (lines 1-100)
  - **WHY:** Existing test that validates combo layout positioning
  - **PATTERN:** Tests expect combo on right side with absolute positioning
  - **ACTION:** Update this test to match new mobile layout (combo below timer)

### New Files to Create

None - this is a pure layout modification of existing components.

### Relevant Documentation (MUST READ!)

- [Tailwind Container Query Docs](https://tailwindcss.com/docs/container-queries)
  - **Section:** Container query utilities
  - **WHY:** Required for responsive design using `cqw`/`cqi` units (preferred over viewport units)

- [Tailwind Flexbox Docs](https://tailwindcss.com/docs/flex)
  - **Section:** Flex layout utilities
  - **WHY:** Used for layout structure and alignment

- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
  - **Section:** Breakpoints (`md:`, `lg:`)
  - **WHY:** Used to conditionally show/hide combo row based on screen size

### Patterns to Follow

**Mobile Layout Pattern (NEW):**

```tsx
// ✅ GOOD: Dedicated combo row below stats on mobile
<div ref={gameStatsRef} className="flex flex-col gap-1">
  {/* Combo row - mobile only */}
  <div className="flex lg:hidden justify-center items-center min-h-[40px]">
    {isPlaying && comboLevel > 0 && (
      <ComboDisplay
        comboLevel={comboLevel}
        compact
        timeRemaining={comboTimeRemaining}
        isDanger={comboDanger}
      />
    )}
  </div>

  {/* Stats row - Timer + Score */}
  <div className="flex items-center justify-between">
    {/* Timer (center) */}
    <div className="flex-1 flex justify-center">
      <CircularTimer remainingTime={remainingTime} totalTime={timerValue * 60} size="xs" />
    </div>
    {/* Score (right) */}
    <div className="flex-1 flex justify-start pl-2">
      <ScoreDisplay score={playerScore} rank={playerRank} variant="mobile" />
    </div>
  </div>
</div>
```

**Desktop Layout Pattern (UNCHANGED):**

```tsx
// ✅ GOOD: Existing desktop layout with absolute positioning
<div className="relative flex items-center justify-center">
  {/* Timer (center) */}
  <div className="relative z-20">
    <CircularTimer remainingTime={remainingTime} totalTime={timerValue * 60} size="lg" />
  </div>

  {/* Combo + Score (absolute right) - desktop only */}
  <div className="hidden lg:flex lg:absolute lg:right-4 lg:top-1/2 lg:-translate-y-1/2 z-30">
    <div className="flex flex-col items-end gap-2">
      <ComboDisplay comboLevel={comboLevel} compact />
      <ScoreDisplay score={playerScore} rank={playerRank} variant="desktop" />
    </div>
  </div>
</div>
```

**Responsive Display Pattern:**

```tsx
// ✅ GOOD: Hide on mobile, show on desktop
<div className="hidden lg:block">
  {/* Desktop-only content */}
</div>

// ✅ GOOD: Show on mobile, hide on desktop
<div className="block lg:hidden">
  {/* Mobile-only content */}
</div>
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Understand the current layout structure and identify all locations where the combo indicator is rendered in mobile view.

**Tasks:**

- Read both `PortraitLayout.tsx` and `PortraitGameLayout.tsx` to understand the current stats row structure
- Identify the exact lines where the combo is positioned on the left side in mobile view
- Map the responsive breakpoints used (`lg:hidden` for mobile, `hidden lg:flex` for desktop)

**Order:** These tasks must be completed first before moving to Phase 2.

### Phase 2: Core Implementation

Modify the layout structure to move the combo indicator to its own dedicated row on mobile.

**Tasks:**

- Update multiplayer layout (`PortraitLayout.tsx`)
- Update single-player layout (`PortraitGameLayout.tsx`)
- Ensure proper spacing and visual separation

**Order:** Depends on Phase 1 completion.

### Phase 3: Integration

Verify the layout works correctly across all screen sizes and game modes.

**Tasks:**

- Test mobile layout (combo below stats row)
- Test desktop layout (combo on right side - unchanged)
- Test with combo active and inactive states
- Verify RTL support (Hebrew language)

**Order:** Depends on Phase 2 completion.

### Phase 4: Testing & Validation

Update tests to match the new layout and validate all scenarios.

**Tasks:**

- Update `InGameScreenComboLayout.test.tsx` to match new mobile layout
- Add new test cases for dedicated combo row on mobile
- Verify all existing tests still pass
- Manual testing on mobile device

**Order:** Can be done incrementally with each phase.

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: UPDATE PortraitLayout.tsx - Restructure stats row for mobile

- **IMPLEMENT:** Move combo from left side to dedicated row above stats on mobile
- **PATTERN:** Reference `PortraitGameLayout.tsx:227-342` for existing layout structure
- **CHANGES:**
  - Wrap stats row in a parent `flex flex-col` container for vertical stacking
  - Create new combo row with `flex lg:hidden justify-center items-center min-h-[40px]`
  - Remove left-side combo from stats row (lines 228-242)
  - Keep timer centered and score on right in stats row
  - Ensure desktop layout remains unchanged with `hidden lg:flex` for absolute positioned combo
- **FILE:** `components/game/in-game/components/PortraitLayout.tsx`
- **LINES TO MODIFY:** 211-310 (stats row section)
- **GOTCHA:** Must maintain z-index stacking for desktop layout (timer z-20, combo z-30)
- **VALIDATE:**
  ```bash
  npm run lint
  npm run build
  ```

### Task 2: UPDATE PortraitGameLayout.tsx - Restructure stats row for single-player

- **IMPLEMENT:** Apply same layout changes as Task 1 to single-player layout
- **PATTERN:** Mirror changes from `PortraitLayout.tsx` (Task 1)
- **CHANGES:**
  - Wrap stats row in `flex flex-col` container
  - Create dedicated combo row for mobile with `flex lg:hidden justify-center`
  - Remove left-side combo positioning (lines 229-242)
  - Handle practice mode (combo on right side) vs normal mode (combo on left side)
  - Keep timer centered and score on right
- **FILE:** `components/singleplayer/game/components/PortraitGameLayout.tsx`
- **LINES TO MODIFY:** 227-342 (stats row section)
- **GOTCHA:** Practice mode has different layout (combo on right, score in center) - maintain this
- **VALIDATE:**
  ```bash
  npm run lint
  npm run build
  ```

### Task 3: UPDATE InGameScreenComboLayout.test.tsx - Fix test expectations

- **IMPLEMENT:** Update test to expect combo below timer on mobile instead of on right side
- **PATTERN:** Reference existing test structure in `InGameScreenComboLayout.test.tsx:81-100`
- **CHANGES:**
  - Update `FixedStatsRowTestComponent` to render combo in dedicated row above stats row
  - Add mobile-specific test case for new layout structure
  - Update assertions to check for vertical stacking instead of horizontal positioning
  - Keep desktop test expectations unchanged (combo on absolute right)
- **FILE:** `components/game/__tests__/InGameScreenComboLayout.test.tsx`
- **LINES TO MODIFY:** 81-100 (test component), add new test cases
- **GOTCHA:** Test mocks framer-motion - ensure new layout structure works with mocked components
- **VALIDATE:**
  ```bash
  npm run test -- InGameScreenComboLayout.test.tsx
  ```

### Task 4: MANUAL TEST - Verify mobile layout in browser

- **IMPLEMENT:** Start dev server and test layout on mobile viewport
- **STEPS:**
  1. Start dev server: `npm run dev`
  2. Navigate to multiplayer game: `http://localhost:3001/en/multiplayer`
  3. Join a game and start playing
  4. Open Chrome DevTools and switch to mobile viewport (iPhone 12 Pro)
  5. Verify combo indicator appears **below the timer** when active
  6. Verify combo indicator is **centered horizontally**
  7. Verify timer and score remain in their positions
  8. Test with combo levels 1-7+ to verify different rarity colors render correctly
  9. Test RTL mode (Hebrew): Navigate to `/he/multiplayer` and verify layout
- **VALIDATE:**
  - Combo indicator is fully visible and not overlapping timer
  - Combo has adequate vertical spacing (min-height: 40px)
  - Layout doesn't shift or jump when combo appears/disappears
  - RTL layout works correctly (combo still centered below timer)

### Task 5: MANUAL TEST - Verify desktop layout unchanged

- **IMPLEMENT:** Test desktop viewport to ensure no regressions
- **STEPS:**
  1. Using same dev server from Task 4
  2. Expand browser to desktop viewport (1920x1080)
  3. Join multiplayer game and start playing
  4. Verify combo indicator appears on **right side** as absolute positioned element
  5. Verify combo is **above** the score display
  6. Verify timer remains centered
  7. Test combo levels 1-7+ for different states
- **VALIDATE:**
  - Desktop layout is completely unchanged from original
  - Combo appears on right side with z-index 30 (above timer z-20)
  - No layout shifts or visual regressions

### Task 6: MANUAL TEST - Verify single-player layout

- **IMPLEMENT:** Test single-player mode with same layout changes
- **STEPS:**
  1. Navigate to single-player: `http://localhost:3001/en/singleplayer`
  2. Start a normal mode game (not practice)
  3. Test mobile viewport (375x667)
  4. Verify combo appears below timer in dedicated row
  5. Switch to practice mode
  6. Verify practice mode layout (combo on right side) still works correctly
  7. Test desktop viewport (1920x1080)
  8. Verify desktop layout unchanged
- **VALIDATE:**
  - Normal mode: combo below timer on mobile, combo on right on desktop
  - Practice mode: combo on right side in stats row on mobile
  - No regressions in practice mode's unique layout

---

## TESTING STRATEGY

<Define testing approach based on project's test framework and patterns discovered during research>

### Unit Tests

**Scope and Requirements:**

- Test new layout structure renders correctly
- Test responsive breakpoints (mobile vs desktop)
- Test combo visibility states (active/inactive)
- Use Jest + React Testing Library

**Pattern:**

```tsx
// Test: Combo appears below timer on mobile
it('should render combo indicator in dedicated row below stats on mobile', () => {
  render(<PortraitLayout {...mockProps} comboLevel={3} />);

  // Find combo row (mobile only)
  const comboRow = screen.getByTestId('combo-row-mobile');
  expect(comboRow).toHaveClass('lg:hidden'); // Hidden on desktop

  // Verify combo is inside dedicated row
  const combo = within(comboRow).getByText(/x3 Combo/i);
  expect(combo).toBeInTheDocument();
});

// Test: Desktop layout unchanged
it('should maintain absolute positioned combo on desktop', () => {
  render(<PortraitLayout {...mockProps} comboLevel={3} />);

  // Desktop combo should be absolute positioned
  const desktopCombo = screen.getByTestId('combo-desktop');
  expect(desktopCombo).toHaveClass('lg:absolute');
  expect(desktopCombo).toHaveClass('lg:right-4');
  expect(desktopCombo).toHaveClass('z-30');
});
```

### Integration Tests

**Scope and Requirements:**

- Test complete game flow with new layout
- Test layout doesn't break during gameplay
- Verify no visual regressions

**Pattern:**

```tsx
// E2E Test: Mobile combo layout during gameplay
describe('Mobile Combo Layout', () => {
  it('should display combo below timer during active combo streak', async () => {
    // Start mobile game
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3001/en/multiplayer');

    // Join game and submit words to build combo
    await submitWord('CAT');
    await submitWord('DOG');
    await submitWord('FISH');

    // Verify combo appears below timer
    const comboRow = await page.locator('[data-testid="combo-row-mobile"]');
    await expect(comboRow).toBeVisible();

    // Verify timer position unchanged
    const timer = await page.locator('[data-tutorial="timer"]');
    const timerBounds = await timer.boundingBox();
    expect(timerBounds.x).toBeCloseTo(screenWidth / 2, 10); // Still centered
  });
});
```

### Edge Cases

**List specific edge cases that must be tested for this feature:**

- Combo indicator appears/disappears smoothly (no layout jump)
- Empty combo state (comboLevel = 0) - dedicated row should collapse or be hidden
- High combo levels (7+) with rainbow effect render correctly in dedicated row
- RTL mode (Hebrew) - combo remains centered below timer
- Very small mobile screens (320px width) - combo doesn't overflow
- Tablet landscape mode - verify breakpoint behavior (should use desktop layout at `lg` breakpoint)
- Practice mode in single-player - combo should remain on right side in stats row
- Fast combo changes (rapid word submissions) - no animation conflicts

---

## VALIDATION COMMANDS

**⚠️ CRITICAL SAFETY RULE: ALL validation must be done in LOCAL DEV MODE!**

**Define validation commands based on project's tools discovered in Phase 2**

Execute every command to ensure zero regressions and 100% feature correctness in **LOCAL DEV MODE**.

### Level 1: Linting

```bash
npm run lint
```

**Expected:** No linting errors or warnings

### Level 2: TypeScript Compilation

```bash
npm run build
```

**Expected:** Build succeeds with no TypeScript errors

### Level 3: Unit Tests

```bash
npm run test -- InGameScreenComboLayout.test.tsx
```

**Expected:** All tests pass, including updated layout tests

### Level 4: Full Test Suite

```bash
npm run test
```

**Expected:** All tests pass (backend + frontend)

### Level 5: E2E Tests (if applicable)

```bash
npm run test:e2e -- --grep "combo"
```

**Expected:** E2E tests related to combo functionality pass

### Level 6: Manual Validation (LOCAL MODE)

**Mobile Layout:**
```bash
# 1. Start dev server
npm run dev

# 2. Navigate to http://localhost:3001/en/multiplayer
# 3. Open Chrome DevTools (F12)
# 4. Switch to mobile viewport (iPhone 12 Pro - 390x844)
# 5. Join a game, start playing
# 6. Submit 3+ words to trigger combo
# 7. Verify combo appears BELOW timer in dedicated row
# 8. Verify combo is centered horizontally
# 9. Verify no overlap with timer
```

**Desktop Layout:**
```bash
# 1. Using same dev server
# 2. Expand browser to desktop (1920x1080)
# 3. Verify combo appears on RIGHT side (absolute positioned)
# 4. Verify combo is ABOVE score display
# 5. Verify timer remains centered
```

**RTL Mode (Hebrew):**
```bash
# 1. Navigate to http://localhost:3001/he/multiplayer
# 2. Test mobile and desktop layouts
# 3. Verify combo positioning mirrors correctly in RTL
```

**All manual validation should be done against LOCAL environment only!**

---

## ACCEPTANCE CRITERIA

- [ ] Mobile: Combo indicator appears in dedicated row below stats row (centered)
- [ ] Mobile: Combo indicator is fully visible, not overlapping timer
- [ ] Mobile: Dedicated combo row has min-height of 40px for adequate spacing
- [ ] Mobile: When combo is inactive (level 0), row collapses or is hidden
- [ ] Desktop: Layout unchanged - combo appears on right side as absolute positioned element
- [ ] Desktop: Combo has z-index 30 (above timer's z-20)
- [ ] All validation commands pass with zero errors
- [ ] Unit tests updated and passing (InGameScreenComboLayout.test.tsx)
- [ ] RTL mode works correctly (Hebrew language)
- [ ] No layout shifts when combo appears/disappears
- [ ] Practice mode layout unaffected (combo remains on right in stats row)
- [ ] Responsive breakpoints work correctly (mobile `<lg`, desktop `>=lg`)

---

## COMPLETION CHECKLIST

- [ ] Task 1: PortraitLayout.tsx updated (multiplayer)
- [ ] Task 2: PortraitGameLayout.tsx updated (single-player)
- [ ] Task 3: InGameScreenComboLayout.test.tsx updated
- [ ] Task 4: Manual mobile testing completed
- [ ] Task 5: Manual desktop testing completed
- [ ] Task 6: Manual single-player testing completed
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works across all modes
- [ ] Acceptance criteria all met
- [ ] RTL mode verified (Hebrew)
- [ ] No regressions in existing functionality

---

## NOTES

**Design Rationale:**

- **Why dedicated row instead of repositioning?** Moving the combo to a dedicated row provides clear visual separation and eliminates any potential overlap issues. It also maintains the clean centered timer design on mobile.

- **Why keep desktop layout unchanged?** The desktop layout with absolute positioned combo on the right side works well and doesn't have the same space constraints as mobile. No need to change what's working.

- **Why use vertical stacking on mobile?** Vertical space is more abundant on mobile devices than horizontal space. Stacking the combo below the timer uses available vertical space effectively.

**Alternatives considered:**

1. **Increase z-index on mobile combo** - Rejected because this doesn't solve the visual overlap/crowding issue, just changes which element is on top.

2. **Move combo to top of screen** - Rejected because it's too far from the action (grid) and would require users to look away from gameplay.

3. **Move combo below grid** - Rejected because it would be hidden during gameplay when users are focused on the grid.

4. **Side drawer for combo** - Rejected as over-engineered for a simple layout issue.

**Trade-offs:**

- **Vertical space usage:** The dedicated combo row adds ~40px of vertical space on mobile. This is acceptable given that mobile devices typically have more vertical space than horizontal.

- **Layout consistency:** Mobile and desktop layouts are now slightly different (vertical stacking vs absolute positioning). This is acceptable and follows mobile-first design principles - each layout optimizes for its viewport constraints.

**Future Considerations:**

- **Potential improvements:** Could add subtle animation when combo row appears/collapses to make the transition smoother.

- **Known limitations:** Very small screens (<320px width) might have limited space for the combo indicator. Consider adding a more compact variant if needed.

- **Extension points:** If more stats need to be added in the future, the dedicated row pattern can be extended to accommodate additional indicators on mobile.
