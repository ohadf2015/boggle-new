# Feature: Mascot GIF Integration (Celebration & Lobby)

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Display the new mascot GIFs (dj, celebration, trophy) in contextually appropriate places throughout the app:
- **DJ mascot** in the multiplayer lobby (near Quick Play button) as a decorative element
- **Trophy/Celebration mascot** in winning/celebration screens (results winner banner, level up, tier up, first win, daily challenge wins)

The mascots should blend seamlessly with the existing Neo-Brutalist UI design system.

## User Story

As a player
I want to see fun animated mascot characters during key moments
So that celebrations feel more rewarding and the lobby feels more inviting

## Problem Statement

The app has new mascot GIF assets (dj-nobg.gif, celebration-nobg.gif, trophy-nobg.gif) that are not being used. These should appear in contextually appropriate places to enhance the user experience without cluttering the UI.

## Solution Statement

Create dedicated components for the new mascot GIFs (separate from the existing Mascot component system) and integrate them into:
1. Multiplayer lobby - DJ mascot as decorative element near Quick Play
2. All celebration/winning screens - Trophy or celebration mascot

## Feature Metadata

**Feature Type:** Enhancement
**Estimated Complexity:** Medium
**Primary Systems Affected:**
- UI Components (new CelebrationMascot, DJMascot components)
- Multiplayer lobby (RoomListView)
- Results screens (ResultsWinnerBanner, LevelUpCelebration, TierUpCelebration, FirstGameCelebration, FirstWinSignupModal, DailyChallengeResults, SinglePlayerResults)
**Dependencies:** framer-motion, next/image

---

## CONTEXT REFERENCES

### Prime Context (READ THIS FIRST!)

- `.claude/agents/context/prime-context.md` - COMPLETE codebase overview
  - **WHY:** Contains all project patterns, configurations, and architecture
  - **ACTION:** Read this file first to understand the codebase

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `components/ui/Mascot.tsx` (entire file)
  - **WHY:** Contains existing mascot component patterns
  - **PATTERN:** Image with framer-motion animations, performance-aware

- `components/ui/InteractiveMascot.tsx` (entire file)
  - **WHY:** Shows extended mascot patterns with hover/click interactions
  - **PATTERN:** State management, animation presets, size presets

- `components/multiplayer/RoomListView.tsx` (lines 110-130)
  - **WHY:** Location where DJ mascot will be added
  - **PATTERN:** Motion animations for entrance, responsive layout

- `components/results/ResultsWinnerBanner.tsx` (entire file)
  - **WHY:** Winner banner that will include trophy mascot
  - **PATTERN:** Celebration animations, responsive design

- `components/animations/LevelUpCelebration.tsx` (lines 250-320)
  - **WHY:** Level up celebration modal
  - **PATTERN:** GSAP timeline, phase-based animation

- `components/brain/TierUpCelebration.tsx` (lines 150-210)
  - **WHY:** Tier advancement celebration
  - **PATTERN:** Confetti, badge animation

- `components/brain/FirstGameCelebration.tsx` (lines 130-150)
  - **WHY:** First brain training game celebration
  - **PATTERN:** Brain icon animation placement

- `components/daily/DailyChallengeResults.tsx` (lines 60-150)
  - **WHY:** Daily challenge results with top 3 confetti
  - **PATTERN:** Rank-based celebrations

- `components/singleplayer/SinglePlayerResults.tsx` (lines 1-60)
  - **WHY:** Single player results screen
  - **PATTERN:** Winner banner integration

### New Files to Create

- `components/ui/CelebrationMascot.tsx` - Decorative celebration/trophy mascot
- `components/ui/DJMascot.tsx` - Decorative DJ mascot for lobby

### Patterns to Follow

**Decorative Mascot Pattern (NOT interactive):**

```tsx
// ✅ GOOD: Simple decorative mascot with animation
'use client';

import { motion } from 'framer-motion';
import { memo, useMemo } from 'react';
import Image from 'next/image';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

interface DecorativeMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  priority?: boolean;
}

export const DecorativeMascot = memo(function DecorativeMascot({
  size = 'md',
  className = '',
  priority = false,
}: DecorativeMascotProps) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();
  const shouldAnimate = !prefersReducedMotion && enableComplexAnimations;

  // Size mapping
  const sizePixels = { sm: 64, md: 96, lg: 128, xl: 160 };
  const sizeClasses = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32', xl: 'w-40 h-40' };

  return (
    <motion.div
      className={`relative ${sizeClasses[size]} ${className}`}
      animate={shouldAnimate ? {
        y: [0, -6, 0],
        rotate: [0, -2, 2, 0],
      } : undefined}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <Image
        src="/mascot/some-nobg.gif"
        alt="Mascot"
        width={sizePixels[size]}
        height={sizePixels[size]}
        className="object-contain drop-shadow-lg"
        priority={priority}
        unoptimized // Required for GIFs
      />
    </motion.div>
  );
});
```

**Integration in Celebration Components:**

```tsx
// ✅ GOOD: Mascot placement in celebration modal
<div className="relative">
  {/* Existing content */}
  <div className="flex justify-center mb-4">
    <CelebrationMascot size="lg" />
  </div>
  {/* Rest of celebration content */}
</div>
```

**Integration in Winner Banner:**

```tsx
// ✅ GOOD: Trophy mascot in winner banner
<div className="flex items-center gap-4">
  <TrophyMascot size="md" />
  <div className="text-center">
    {/* Winner text */}
  </div>
</div>
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation - Create Mascot Components

Create two dedicated decorative mascot components for the new GIFs.

**Tasks:**

1. Create `CelebrationMascot.tsx` - For trophy/celebration GIF in winning scenarios
2. Create `DJMascot.tsx` - For DJ GIF in multiplayer lobby

**Order:** These must be completed first before integration.

### Phase 2: Core Integration - Celebration Screens

Integrate the celebration/trophy mascot into all winning/celebration screens.

**Tasks:**

1. Update `ResultsWinnerBanner.tsx` - Add trophy mascot to winner display
2. Update `LevelUpCelebration.tsx` - Add celebration mascot to level up modal
3. Update `TierUpCelebration.tsx` - Add celebration mascot to tier up modal
4. Update `FirstGameCelebration.tsx` - Add celebration mascot alongside brain icon
5. Update `DailyChallengeResults.tsx` - Add celebration mascot for top 3 finishers

**Order:** Each can be done independently after Phase 1.

### Phase 3: Lobby Integration

Integrate DJ mascot into multiplayer lobby.

**Tasks:**

1. Update `RoomListView.tsx` - Add DJ mascot near Quick Play hero section

**Order:** Depends on Phase 1 completion.

### Phase 4: Testing & Validation

Verify all integrations work correctly.

**Tasks:**

1. Visual testing across all celebration screens
2. Performance testing (GIF loading, animation performance)
3. Responsive testing (mobile, tablet, desktop)
4. RTL testing (Hebrew layout)

**Order:** After Phase 2 and Phase 3 completion.

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: CREATE `components/ui/CelebrationMascot.tsx`

- **IMPLEMENT:** Create decorative celebration mascot component with trophy variant
- **PATTERN:** Reference `components/ui/Mascot.tsx` for structure
- **IMPORTS:**
  ```tsx
  import { motion } from 'framer-motion';
  import { memo, useState } from 'react';
  import Image from 'next/image';
  import { useDevicePerformance } from '@/hooks/useDevicePerformance';
  ```
- **SPECIFICATION:**
  - Props: `variant: 'trophy' | 'celebration'`, `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`, `className?: string`, `priority?: boolean`
  - Size mapping: xs=40px, sm=64px, md=96px, lg=128px, xl=160px
  - GIF paths: `/mascot/trophy-nobg.gif`, `/mascot/celebration-nobg.gif`
  - Animation: gentle floating bob with subtle scale pulse
  - Must respect `useDevicePerformance` for reduced motion
  - Export both named and default export
- **GOTCHA:** Use `unoptimized={true}` for GIF images in next/image
- **VALIDATE:** `npm run build` - Component should compile without errors

### Task 2: CREATE `components/ui/DJMascot.tsx`

- **IMPLEMENT:** Create decorative DJ mascot component for lobby
- **PATTERN:** Reference `components/ui/Mascot.tsx` for structure
- **IMPORTS:**
  ```tsx
  import { motion } from 'framer-motion';
  import { memo } from 'react';
  import Image from 'next/image';
  import { useDevicePerformance } from '@/hooks/useDevicePerformance';
  ```
- **SPECIFICATION:**
  - Props: `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`, `className?: string`, `priority?: boolean`
  - Size mapping: xs=40px, sm=64px, md=96px, lg=128px, xl=160px
  - GIF path: `/mascot/dj-nobg.gif`
  - Animation: rhythmic bounce (like DJ bobbing to music)
  - Must respect `useDevicePerformance` for reduced motion
  - Export both named and default export
- **GOTCHA:** Use `unoptimized={true}` for GIF images in next/image
- **VALIDATE:** `npm run build` - Component should compile without errors

### Task 3: UPDATE `components/results/ResultsWinnerBanner.tsx`

- **IMPLEMENT:** Add trophy mascot to winner banner display
- **PATTERN:** Reference existing layout in ResultsWinnerBanner
- **IMPORTS:** Add `import { CelebrationMascot } from '@/components/ui/CelebrationMascot';`
- **PLACEMENT:** Position trophy mascot next to or above winner info
- **SIZE:** Use `size="md"` for balance with existing elements
- **GOTCHA:** Ensure responsive layout - mascot may need to hide on very small screens
- **VALIDATE:** `npm run dev` - Navigate to results page and verify mascot displays

### Task 4: UPDATE `components/animations/LevelUpCelebration.tsx`

- **IMPLEMENT:** Add celebration mascot to level up modal
- **PATTERN:** Reference badge container area (lines 250-320)
- **IMPORTS:** Add `import { CelebrationMascot } from '@/components/ui/CelebrationMascot';`
- **PLACEMENT:** Position above or beside the level badge
- **SIZE:** Use `size="lg"` for prominent celebration
- **GOTCHA:** Don't obscure level number - mascot should complement, not compete
- **VALIDATE:** `npm run dev` - Trigger level up celebration and verify mascot displays

### Task 5: UPDATE `components/brain/TierUpCelebration.tsx`

- **IMPLEMENT:** Add celebration mascot to tier advancement modal
- **PATTERN:** Reference gradient header area (lines 150-210)
- **IMPORTS:** Add `import { CelebrationMascot } from '@/components/ui/CelebrationMascot';`
- **PLACEMENT:** Position in header area with tier badge
- **SIZE:** Use `size="md"` to complement existing badge
- **GOTCHA:** Ensure colors don't clash with tier gradient backgrounds
- **VALIDATE:** `npm run dev` - Trigger tier up celebration and verify mascot displays

### Task 6: UPDATE `components/brain/FirstGameCelebration.tsx`

- **IMPLEMENT:** Add celebration mascot alongside brain icon
- **PATTERN:** Reference brain icon container (lines 130-150)
- **IMPORTS:** Add `import { CelebrationMascot } from '@/components/ui/CelebrationMascot';`
- **PLACEMENT:** Position alongside or replace animated brain with mascot + brain
- **SIZE:** Use `size="md"` to match brain icon scale
- **GOTCHA:** Keep brain icon prominent - this is brain training, mascot should complement
- **VALIDATE:** `npm run dev` - Complete first brain game and verify mascot displays

### Task 7: UPDATE `components/daily/DailyChallengeResults.tsx`

- **IMPLEMENT:** Add trophy mascot for top 3 finishers
- **PATTERN:** Reference rank confetti section (lines 100-140)
- **IMPORTS:** Add `import { CelebrationMascot } from '@/components/ui/CelebrationMascot';`
- **PLACEMENT:** Show trophy mascot when `currentUserRank <= 3`
- **SIZE:** Use `size="sm"` or `size="md"` based on rank (1st = larger)
- **CONDITIONAL:** Only show for top 3 finishers
- **GOTCHA:** Check for null rank before comparing
- **VALIDATE:** `npm run dev` - Complete daily challenge in top 3 and verify mascot displays

### Task 8: UPDATE `components/singleplayer/SinglePlayerResults.tsx`

- **IMPLEMENT:** Ensure trophy mascot appears via ResultsWinnerBanner (already uses it)
- **PATTERN:** Verify `ResultsWinnerBanner` integration (line 9)
- **ACTION:** This may already work if ResultsWinnerBanner is updated - verify and add direct mascot if banner doesn't show in all winner scenarios
- **VALIDATE:** `npm run dev` - Complete single player game as winner and verify mascot displays

### Task 9: UPDATE `components/multiplayer/RoomListView.tsx`

- **IMPLEMENT:** Add DJ mascot near Quick Play hero section
- **PATTERN:** Reference Quick Play button area (lines 110-130)
- **IMPORTS:** Add `import { DJMascot } from '@/components/ui/DJMascot';`
- **PLACEMENT:** Position to the side of Quick Play button or above room list header
- **SIZE:** Use `size="md"` or `size="sm"` to not overwhelm the UI
- **RESPONSIVE:** May hide on very small screens or in landscape mode
- **GOTCHA:** Ensure DJ doesn't interfere with room list scroll area
- **VALIDATE:** `npm run dev` - Navigate to multiplayer lobby and verify DJ displays

### Task 10: CREATE tests for new components

- **IMPLEMENT:** Create test files for CelebrationMascot and DJMascot
- **FILES:**
  - `components/ui/__tests__/CelebrationMascot.test.tsx`
  - `components/ui/__tests__/DJMascot.test.tsx`
- **TESTS:**
  - Renders without crashing
  - Applies correct size classes
  - Respects reduced motion preferences
  - Uses correct GIF source
- **PATTERN:** Reference `components/ui/__tests__/Mascot.test.tsx` if exists
- **VALIDATE:** `npm run test -- --testPathPattern="CelebrationMascot|DJMascot"`

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**

- Test both new mascot components render correctly
- Test size prop applies correct dimensions
- Test performance hooks are respected

**Pattern:**

```tsx
import { render, screen } from '@testing-library/react';
import { CelebrationMascot } from '../CelebrationMascot';

describe('CelebrationMascot', () => {
  it('renders trophy variant', () => {
    render(<CelebrationMascot variant="trophy" />);
    expect(screen.getByAltText(/mascot/i)).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { container } = render(<CelebrationMascot variant="trophy" size="lg" />);
    expect(container.firstChild).toHaveClass('w-32', 'h-32');
  });
});
```

### Integration Tests

**Scope and Requirements:**

- Test mascot appears in celebration modals
- Test mascot appears in winner banners
- Test DJ appears in multiplayer lobby

### Visual Testing

**Manual testing checklist:**

- [ ] Trophy mascot visible in multiplayer results winner banner
- [ ] Trophy mascot visible in single player results winner banner
- [ ] Celebration mascot visible in level up modal
- [ ] Celebration mascot visible in tier up modal
- [ ] Celebration mascot visible in first game celebration
- [ ] Trophy mascot visible in daily challenge top 3 results
- [ ] DJ mascot visible in multiplayer lobby
- [ ] All mascots animate smoothly
- [ ] All mascots respect reduced motion preference
- [ ] All mascots display correctly on mobile
- [ ] All mascots display correctly in RTL (Hebrew)

---

## VALIDATION COMMANDS

### Level 1: Compilation

```bash
npm run build
```

**Expected:** Build succeeds with no compilation errors

### Level 2: Linting

```bash
npm run lint
```

**Expected:** No linting errors or warnings

### Level 3: Type Checking

```bash
npx tsc --noEmit
```

**Expected:** No TypeScript errors

### Level 4: Unit Tests

```bash
npm run test -- --testPathPattern="CelebrationMascot|DJMascot"
```

**Expected:** All tests pass

### Level 5: Full Test Suite

```bash
npm run test
```

**Expected:** All tests pass, no regressions

### Level 6: Visual Verification

```bash
npm run dev
```

**Manual checks:**
1. Navigate to multiplayer lobby - verify DJ mascot
2. Complete a game and win - verify trophy mascot in results
3. Trigger level up (if possible) - verify celebration mascot
4. Complete daily challenge in top 3 - verify trophy mascot

---

## ACCEPTANCE CRITERIA

- [ ] New `CelebrationMascot` component created with trophy and celebration variants
- [ ] New `DJMascot` component created for lobby
- [ ] DJ mascot displays in multiplayer lobby near Quick Play button
- [ ] Trophy/celebration mascot displays in all winning/celebration screens:
  - [ ] ResultsWinnerBanner (multiplayer/singleplayer)
  - [ ] LevelUpCelebration
  - [ ] TierUpCelebration
  - [ ] FirstGameCelebration
  - [ ] DailyChallengeResults (top 3)
- [ ] All mascots blend with existing Neo-Brutalist design
- [ ] All mascots animate smoothly (GIF + CSS animation)
- [ ] All mascots respect reduced motion preferences
- [ ] All mascots are responsive (appropriate sizing)
- [ ] Build passes with no errors
- [ ] Lint passes with no errors
- [ ] Tests pass (including new unit tests)

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

### Design Rationale

- **Separate components vs. extending Mascot system:** User requested keeping new GIFs separate for specific use rather than adding to the generic Mascot component. This keeps the original 4-variant system clean and allows specialized animation/behavior for celebration and lobby contexts.

- **Decorative vs. Interactive:** DJ mascot is decorative-only per user preference. This simplifies implementation and reduces cognitive load in the lobby.

- **Trophy vs. Celebration:** Both GIFs serve similar celebration purposes - trophy for winning/ranking, celebration for achievements/progression.

### Future Considerations

- **Potential improvements:** Could add variant selection in CelebrationMascot based on context (victory type, rank achieved)
- **Known limitations:** GIF file sizes may impact load times on slow connections
- **Extension points:** Could later add these to InteractiveMascot if interactivity is desired

### File Size Notes

From `ls -la public/mascot/`:
- `celebration-nobg.gif`: ~1.1MB
- `dj-nobg.gif`: ~1.7MB
- `trophy-nobg.gif`: ~1.1MB

These are larger than the existing mascot GIFs. Consider:
1. Using `priority={false}` for below-fold appearances
2. Lazy loading modals that contain mascots
3. Potentially compressing GIFs if performance issues arise
