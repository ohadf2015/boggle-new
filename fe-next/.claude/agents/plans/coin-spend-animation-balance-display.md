# Feature: Coin Spend Animation & Balance Display

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

When a player spends coins on any action (word reveal, target word reveal, daily retry, streak recovery), show:
1. **Spend Animation**: Visual feedback showing coins being deducted with a "whoosh" effect
2. **Balance Display**: Show current coin balance next to every button that costs coins, so players always know how much they have before spending

This improves UX by:
- Providing satisfying visual feedback when spending coins
- Removing guesswork about current balance before making purchase decisions
- Creating consistent coin spending experience across all features

## User Story

As a player
I want to see an animation when I spend coins and see my current balance next to every purchase button
So that I get satisfying feedback when spending and always know if I can afford an action

## Problem Statement

Currently, when players spend coins:
1. The spend happens silently with no visual feedback (only balance updates)
2. Not all spending locations show the player's current balance
3. Players must mentally track their balance across different features

## Solution Statement

1. Create a `CoinSpendAnimation` component that shows coins flying away with a "drain" effect
2. Create a `CoinBalanceBadge` component for consistent balance display
3. Update all coin-spending components to show balance and trigger spend animation
4. Add `onSpendStart` callback to CoinContext for animation coordination

## Feature Metadata

**Feature Type:** Enhancement
**Estimated Complexity:** Medium
**Primary Systems Affected:**
- `components/animations/` - New spend animation component
- `components/daily/results/` - CoinUnlockCard, ShareSection updates
- `components/singleplayer/RevealButton.tsx` - Already has balance display
- `components/streak/StreakProtection.tsx` - Add balance display
- `contexts/CoinContext.tsx` - Add spend callback support

**Dependencies:** Framer Motion (already installed), existing coin animation components

---

## CONTEXT REFERENCES

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `components/animations/CoinBurstSource.tsx` (lines 1-314)
  - **WHY:** Pattern for coin particle animations
  - **PATTERN:** Uses device performance hooks, AnimatePresence, motion components

- `components/animations/CoinCounterAnimated.tsx` (lines 1-298)
  - **WHY:** Shows how to animate coin balance changes
  - **PATTERN:** Rolling number animation, impact pulse, "+X" indicator

- `components/animations/CoinAnimationSystem.tsx` (lines 1-231)
  - **WHY:** Orchestration pattern for coordinated coin animations
  - **PATTERN:** Provider context, ref registration, multi-phase animations

- `components/singleplayer/RevealButton.tsx` (lines 181-189)
  - **WHY:** Already shows coin balance badge - use as reference
  - **PATTERN:** Badge in top-right corner with Coins icon and balance

- `components/daily/results/CoinUnlockCard.tsx` (lines 1-104)
  - **WHY:** Already shows balance progress - may need animation trigger
  - **PATTERN:** Progress bar, current/required coins display

- `components/daily/results/ShareSection.tsx` (lines 45-60)
  - **WHY:** Retry button shows cost but NOT current balance
  - **PATTERN:** Button with cost display in parentheses

- `components/streak/StreakProtection.tsx` (lines 192-213)
  - **WHY:** Recovery button shows cost but NOT current balance
  - **PATTERN:** Button with cost, disabled state when can't afford

- `contexts/CoinContext.tsx` (lines 188-213)
  - **WHY:** spendCoins function - need to add animation callback
  - **PATTERN:** Async function returning boolean success

- `utils/coinManager.ts` (lines 28-32)
  - **WHY:** COIN_COSTS constants used across codebase
  - **PATTERN:** Object with named cost constants

### New Files to Create

- `components/animations/CoinSpendAnimation.tsx` - Spend animation effect (coins flying away)
- `components/ui/CoinBalanceBadge.tsx` - Reusable balance display badge

### Files to Update

- `components/daily/results/ShareSection.tsx` - Add balance badge to retry button
- `components/streak/StreakProtection.tsx` - Add balance badge to recovery button
- `components/daily/results/CoinUnlockCard.tsx` - Add spend animation trigger
- `components/singleplayer/RevealButton.tsx` - Add spend animation trigger
- `translations/en.js`, `translations/he.js`, `translations/sv.js`, `translations/ja.js`, `translations/es.js` - Add new translation keys

### Relevant Documentation (MUST READ!)

- Framer Motion AnimatePresence: https://motion.dev/docs/react-animate-presence
- Existing neo-brutalist design patterns in `CLAUDE.md`

### Patterns to Follow

**Coin Animation Pattern (from CoinBurstSource):**

```tsx
// ✅ GOOD: Performance-aware animation with device detection
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

export function CoinSpendAnimation({ trigger, position, amount, onComplete }) {
  const { isLowEnd, prefersReducedMotion, maxParticles } = useDevicePerformance();

  // Skip for reduced motion
  if (prefersReducedMotion) {
    onComplete?.();
    return null;
  }

  // Reduce particles on low-end devices
  const particleCount = isLowEnd ? 3 : Math.min(amount, 6);

  return (
    <AnimatePresence>
      {/* Animation content */}
    </AnimatePresence>
  );
}
```

**Balance Badge Pattern (from RevealButton):**

```tsx
// ✅ GOOD: Compact balance badge with icon
<div className="absolute -top-2 -right-2 bg-neo-lime text-neo-black text-xs font-bold px-1.5 py-0.5 rounded-full border-2 border-neo-black shadow-hard-sm">
  <div className="flex items-center gap-0.5">
    <Coins className="w-2.5 h-2.5" />
    <span>{coins}</span>
  </div>
</div>
```

**RTL-aware positioning:**

```tsx
// ✅ GOOD: Use logical properties for RTL support
className="absolute -top-2 inset-e-0"  // Not "right-0"
```

---

## IMPLEMENTATION PLAN

### Phase 1: Create Core Animation Component

Create the `CoinSpendAnimation` component that shows coins draining away when spending.

**Tasks:**
- Create `CoinSpendAnimation.tsx` with "drain" effect (coins fly away and fade)
- Use existing patterns from `CoinBurstSource` for particle system
- Support position prop for source element
- Support amount prop to scale animation intensity
- Include callback when animation completes

### Phase 2: Create Reusable Balance Badge

Create a `CoinBalanceBadge` component for consistent balance display across all spending locations.

**Tasks:**
- Create small, compact badge component
- Support different sizes (xs, sm, md)
- Use neo-brutalist styling (border, shadow)
- RTL-aware positioning
- Animated value changes (use CoinCounterAnimated pattern)

### Phase 3: Update Spending Components

Add balance display and spend animation triggers to all coin-spending components.

**Tasks:**
- Update ShareSection to show balance next to retry cost
- Update StreakProtection to show balance next to recovery cost
- Add animation trigger to CoinUnlockCard
- Add animation trigger to RevealButton
- Coordinate animations with actual spend operation

### Phase 4: Add Translations

Add translation keys for any new UI text.

**Tasks:**
- Add balance display label if needed
- Ensure all 5 languages are updated

### Phase 5: Testing & Validation

Write tests and validate all scenarios.

**Tasks:**
- Test animation triggers correctly
- Test balance displays update after spend
- Test RTL layout
- Test reduced motion preference
- Test low-end device performance

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: CREATE `components/animations/CoinSpendAnimation.tsx`

- **IMPLEMENT:** Coin spend animation component with "drain" effect
  - Coins fly away from source position with fade out
  - Red/orange color scheme (opposite of earning animation)
  - Scale animation intensity based on amount spent
  - Callback when animation completes
  - Use `useDevicePerformance` hook for adaptive quality
  - Support `prefersReducedMotion` (skip animation, call complete immediately)
- **PATTERN:** Mirror `CoinBurstSource.tsx` structure but with outward drain effect
- **IMPORTS:**
  ```typescript
  import { motion, AnimatePresence } from 'framer-motion';
  import { useDevicePerformance } from '@/hooks/useDevicePerformance';
  import { cn } from '@/lib/utils';
  ```
- **GOTCHA:** Position uses fixed positioning relative to viewport, same as CoinBurstSource
- **VALIDATE:** `npm run build && npm run lint`

### Task 2: CREATE `components/ui/CoinBalanceBadge.tsx`

- **IMPLEMENT:** Reusable coin balance display badge
  - Props: `balance: number`, `size?: 'xs' | 'sm' | 'md'`, `className?: string`
  - Neo-brutalist styling: rounded-full, border-2, shadow-hard-sm
  - Coin icon + balance number
  - Animate when balance changes (optional rolling animation)
  - Compact by default, suitable for absolute positioning
- **PATTERN:** Use RevealButton badge (lines 181-189) as reference
- **IMPORTS:**
  ```typescript
  import { Coins } from 'lucide-react';
  import { cn } from '@/lib/utils';
  ```
- **GOTCHA:** Use `font-mono` or `tabular-nums` to prevent layout shift on number changes
- **VALIDATE:** `npm run build && npm run lint`

### Task 3: UPDATE `components/daily/results/ShareSection.tsx`

- **IMPLEMENT:** Add balance badge next to retry button
  - Add `currentCoins: number` prop
  - Show badge near retry button when not solved
  - Position badge to be visible but not blocking button text
- **PATTERN:** Similar to RevealButton badge placement
- **IMPORTS:** Add `CoinBalanceBadge` import
- **GOTCHA:** Maintain existing button layout, badge should enhance not replace
- **VALIDATE:** `npm run build && npm run lint`

### Task 4: UPDATE `components/daily/results/index.ts` and parent component

- **IMPLEMENT:** Pass currentCoins to ShareSection
  - Verify useCoinActions already provides `currentCoins`
  - Thread it through to ShareSection
- **PATTERN:** Follow existing prop threading from DailyWordHuntResults
- **VALIDATE:** Manual test of ShareSection rendering with balance

### Task 5: UPDATE `components/streak/StreakProtection.tsx`

- **IMPLEMENT:** Add balance badge next to recovery button
  - Already has `coins` from CoinContext
  - Add badge showing balance when recovery is available
  - Position consistently with other spending buttons
- **PATTERN:** Mirror ShareSection implementation
- **IMPORTS:** Add `CoinBalanceBadge` import
- **GOTCHA:** Modal vs inline layouts may need different positioning
- **VALIDATE:** `npm run build && npm run lint`

### Task 6: UPDATE `components/singleplayer/RevealButton.tsx` - Add spend animation

- **IMPLEMENT:** Trigger spend animation when coins are spent
  - Add state to track when spend animation is active
  - Get button position for animation source
  - Trigger `CoinSpendAnimation` after successful spend
  - Wait for animation before proceeding with reveal
- **PATTERN:** Use ref to get button position, portal animation
- **IMPORTS:** Add `CoinSpendAnimation` import, `useRef`, `createPortal`
- **GOTCHA:** Animation should not block reveal if reduced motion is preferred
- **VALIDATE:** Manual test of reveal with animation

### Task 7: UPDATE `components/daily/results/CoinUnlockCard.tsx` - Add spend animation

- **IMPLEMENT:** Trigger spend animation when card is clicked
  - Add `onSpendStart?: (position: {x: number, y: number}) => void` prop
  - Call before onClick with card position
  - Parent can handle animation rendering
- **PATTERN:** Use ref for position, callback pattern for parent control
- **GOTCHA:** Keep card component simple, let parent manage animation
- **VALIDATE:** `npm run build && npm run lint`

### Task 8: ADD translations for new UI elements

- **IMPLEMENT:** Add any needed translation keys
  - Review if "Your balance:" or similar text is needed
  - Add keys to all 5 translation files
- **FILES:** `translations/en.js`, `translations/he.js`, `translations/sv.js`, `translations/ja.js`, `translations/es.js`
- **PATTERN:** Follow existing coin translation patterns (see `wordHunt.results.yourCoins`)
- **VALIDATE:** `npm run build`

### Task 9: CREATE tests for CoinSpendAnimation

- **IMPLEMENT:** Unit tests for animation component
  - Test animation triggers with trigger prop
  - Test onComplete callback is called
  - Test reduced motion behavior
  - Test particle count adapts to device performance
- **FILE:** `components/animations/__tests__/CoinSpendAnimation.test.tsx`
- **PATTERN:** Follow existing animation test patterns
- **VALIDATE:** `npm run test:frontend`

### Task 10: CREATE tests for CoinBalanceBadge

- **IMPLEMENT:** Unit tests for badge component
  - Test renders with correct balance
  - Test size variants
  - Test className is applied
- **FILE:** `components/ui/__tests__/CoinBalanceBadge.test.tsx`
- **PATTERN:** Follow existing component test patterns
- **VALIDATE:** `npm run test:frontend`

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**

- Test CoinSpendAnimation triggers and completes correctly
- Test CoinBalanceBadge renders correctly with all size variants
- Test ShareSection renders with balance badge
- Test StreakProtection renders with balance badge

**Pattern:**

```tsx
describe('CoinSpendAnimation', () => {
  it('should call onComplete when animation finishes', async () => {
    const onComplete = jest.fn();
    render(
      <CoinSpendAnimation
        trigger={true}
        position={{ x: 100, y: 100 }}
        amount={60}
        onComplete={onComplete}
      />
    );

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should skip animation and call complete immediately when reduced motion is preferred', () => {
    // Mock prefers-reduced-motion
    mockUseDevicePerformance.mockReturnValue({ prefersReducedMotion: true });

    const onComplete = jest.fn();
    render(<CoinSpendAnimation trigger={true} onComplete={onComplete} />);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Tests

**Scope and Requirements:**

- Test spending flow from button click to animation to balance update
- Test balance badge updates after successful spend

### Edge Cases

- Zero balance display
- Large balance numbers (formatting)
- RTL layout positioning
- Animation with reduced motion preference
- Animation cleanup on unmount
- Rapid successive spends

---

## VALIDATION COMMANDS

### Level 1: Build Check

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run build
```

**Expected:** Build succeeds with no errors

### Level 2: Lint Check

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run lint
```

**Expected:** No linting errors

### Level 3: Type Check

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npx tsc --noEmit
```

**Expected:** No type errors

### Level 4: Unit Tests

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run test:frontend
```

**Expected:** All tests pass

### Level 5: Manual Validation

1. Navigate to Daily Challenge results (failed state)
   - Verify balance badge appears next to Retry button
   - Verify Reveal Target Word card shows animation on click

2. Navigate to single player game
   - Use free reveals, then verify coin balance badge visible
   - Spend coins on reveal, verify animation plays

3. Trigger streak recovery (if streak is broken)
   - Verify balance badge appears next to recovery button

4. Test RTL (Hebrew language)
   - Verify badge positions correctly on the left side

---

## ACCEPTANCE CRITERIA

- [ ] Spend animation plays when any coin-spending action is triggered
- [ ] Animation shows coins draining away with satisfying visual effect
- [ ] Balance badge appears next to all coin-spending buttons
- [ ] Balance badge shows current coin count accurately
- [ ] Balance updates immediately after spend completes
- [ ] Animation respects reduced motion preference
- [ ] Works correctly in RTL (Hebrew) layout
- [ ] All 5 languages have translations (if new text added)
- [ ] No performance regression on low-end devices
- [ ] All validation commands pass

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

### Design Rationale

**Why separate components?**
- `CoinSpendAnimation` is reusable across all spending locations
- `CoinBalanceBadge` provides consistent styling everywhere
- Follows existing patterns (CoinBurstSource, CoinCounterAnimated)

**Animation Design:**
- "Drain" effect (coins fly outward and fade) vs earning "burst" effect
- Red/orange tint to differentiate from green/gold earning
- Subtle but noticeable - shouldn't block user flow
- 500-800ms duration for satisfying feel without being slow

**Balance Badge Design:**
- Always visible (not just on hover/focus)
- Compact to not clutter UI
- Uses established neo-brutalist styling
- Matches existing RevealButton badge pattern

### Future Considerations

- Could add haptic feedback on mobile when spending coins
- Could integrate with CoinAnimationSystem provider for coordinated effects
- Could add sound effects for coin spending (would need audio system)

### Known Limitations

- Animation is client-side only (doesn't affect actual spending logic)
- Balance badge requires parent to pass coin context value
