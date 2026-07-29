# Feature: Adventure Mode Level Design Enhancement

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Enhance the Adventure Mode levels (focusing on Worlds 1-3) with improved visual design, animations, UI polish, and progressive variety to create an engaging and polished gameplay experience. Each level should introduce something new while maintaining the Neo-Brutalist design system.

## User Story

As a player
I want each Adventure Mode level to feel unique and visually engaging
So that I stay motivated to progress through the game and enjoy the journey

## Problem Statement

The current Adventure Mode levels have basic visual design with:
- Generic level entry (no dramatic reveal)
- Minimal tile interaction feedback
- Basic celebration effects on level complete
- No world-specific atmospheric elements
- Levels feel repetitive without progressive variety

## Solution Statement

Implement a comprehensive visual and content enhancement system for Worlds 1-3 that:
1. Adds dramatic level entry animations (grid reveal, tile cascade, objective pop-in)
2. Enhances tile interaction feedback (selection glow, word formation effects)
3. Improves celebration effects (star animations, combo bursts, level complete)
4. Creates world-specific atmospheres (particles, backgrounds, ambient effects)
5. Introduces progressive variety where each level brings something new

## Feature Metadata

**Feature Type:** Enhancement
**Estimated Complexity:** High
**Primary Systems Affected:** Adventure components, animations, level configuration
**Dependencies:** Framer Motion, Tailwind CSS, existing Adventure Mode components

---

## CONTEXT REFERENCES

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `lib/adventure/levelConfig.ts` (full file)
  - **WHY:** Contains world configurations, level generation, and objective systems
  - **PATTERN:** World configs have `theme`, `colorPrimary`, `mechanic` fields

- `lib/adventure/constants.ts` (full file)
  - **WHY:** Core constants for grid sizes, timer durations, XP calculations
  - **PATTERN:** Progressive difficulty via getGridSize(), getTimerDuration()

- `lib/adventure/colors.ts` (full file)
  - **WHY:** Centralized color system for world themes
  - **PATTERN:** getWorldColors() returns bg, border, text, glow classes

- `components/adventure/AdventureGame.tsx` (full file)
  - **WHY:** Main game orchestrator - will integrate new animations
  - **PATTERN:** Uses memo, useCallback, useState for performance

- `components/adventure/AdventureGrid.tsx` (full file)
  - **WHY:** Grid rendering - will add tile interaction enhancements
  - **PATTERN:** Tile type classes, selection states, aria labels

- `components/adventure/AdventureTile.tsx` (full file)
  - **WHY:** Individual tile rendering with Framer Motion
  - **PATTERN:** Gold/ice/bomb/rainbow special tiles with CSS classes

- `components/adventure/LevelCompleteModal.tsx` (full file)
  - **WHY:** Victory screen - will enhance celebration animations
  - **PATTERN:** Star display, particle effects, score animation

- `components/adventure/WorldMap.tsx` (full file)
  - **WHY:** World map CSS animation patterns to follow
  - **PATTERN:** CSS keyframes for performance, CSS custom properties

- `components/adventure/WorldMap.css` (full file)
  - **WHY:** CSS animation reference - star twinkle, orbit, pulse
  - **PATTERN:** GPU-accelerated animations with will-change

- `translations/en.js` (lines 3599-3674)
  - **WHY:** Adventure translations to extend
  - **PATTERN:** Nested structure: adventure.worlds, adventure.objectives

### New Files to Create

1. `components/adventure/animations/LevelEntryAnimation.tsx` - Dramatic level entry sequence
2. `components/adventure/animations/TileSelectionEffects.tsx` - Enhanced tile interaction feedback
3. `components/adventure/animations/CelebrationEffects.tsx` - Victory celebration system
4. `components/adventure/animations/WorldAtmosphere.tsx` - World-specific ambient effects
5. `components/adventure/animations/index.ts` - Animation exports
6. `components/adventure/LevelEntryAnimation.css` - CSS keyframes for entry animations
7. `lib/adventure/levelVariety.ts` - Level variety configuration (what's new each level)
8. `lib/adventure/__tests__/levelVariety.test.ts` - Tests for level variety
9. `components/adventure/__tests__/LevelEntryAnimation.test.tsx` - Animation tests
10. `components/adventure/__tests__/CelebrationEffects.test.tsx` - Celebration tests

### Patterns to Follow

**Neo-Brutalist Animation Pattern:**
```typescript
// Use hard shadows and chunky movements
const hardSpring = { type: 'spring', stiffness: 400, damping: 25 };
const popIn = { scale: [0.8, 1.05, 1], opacity: [0, 1, 1] };

// Always support reduced motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

**CSS Animation Pattern (from WorldMap.css):**
```css
/* GPU-accelerated with CSS custom properties */
.animation-class {
  will-change: transform, opacity;
  animation: keyframe-name var(--duration, 1s) ease-out;
  animation-delay: var(--delay, 0s);
}

@media (prefers-reduced-motion: reduce) {
  .animation-class { animation: none; }
}
```

**Component Pattern:**
```typescript
const Component = memo<Props>(({ prop1, prop2 }) => {
  // Memoize expensive calculations
  const computed = useMemo(() => /* ... */, [deps]);

  // Stable callbacks
  const handler = useCallback(() => /* ... */, [deps]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={hardSpring}
    >
      {/* Content */}
    </motion.div>
  );
});
```

---

## IMPLEMENTATION PLAN

### Phase 1: Level Variety System

Create a configuration system that defines what's "new" in each level of Worlds 1-3 to provide progressive variety.

**Tasks:**
1. Create level variety configuration with unique elements per level
2. Define introduction sequence for game mechanics (tiles, objectives)
3. Map which level introduces which visual element

### Phase 2: Level Entry Animations

Implement dramatic transitions when entering a level with grid reveal, tile cascade, and objective pop-in effects.

**Tasks:**
1. Create LevelEntryAnimation component with staggered tile reveal
2. Add objective cards that slide in from sides
3. Add "Level X" title burst animation
4. Add world-themed entry effects (particles matching theme)

### Phase 3: Tile Interaction Enhancements

Improve feedback when selecting tiles, forming words, and triggering special tile effects.

**Tasks:**
1. Add selection glow effect that pulses around selected tiles
2. Add word formation trail (connecting line between tiles)
3. Enhance special tile effects (gold sparkle, ice crack, bomb pulse)
4. Add invalid selection shake feedback

### Phase 4: Celebration Effects

Upgrade victory celebrations with better star animations, combo effects, and level complete sequences.

**Tasks:**
1. Create star burst animation (stars fly out then settle)
2. Add combo multiplier explosion effects
3. Create confetti/particle burst on level complete
4. Add score count-up animation with sound hooks

### Phase 5: World Atmosphere

Add ambient visual elements specific to each world theme for Worlds 1-3.

**Tasks:**
1. World 1 (Alphabet Meadows): Floating letter particles, butterflies, grass sway
2. World 2 (Synonym Springs): Water droplets, ripple effects, mist
3. World 3 (Root Caverns): Crystal sparkles, cave echoes, torch flicker

### Phase 6: Integration & Testing

Wire all animations into existing components and write comprehensive tests.

**Tasks:**
1. Integrate LevelEntryAnimation into AdventureGame
2. Connect tile effects to AdventureGrid/AdventureTile
3. Upgrade LevelCompleteModal with new celebration system
4. Add WorldAtmosphere to game background
5. Write unit and integration tests
6. Manual QA on all 30 levels (Worlds 1-3)

---

## STEP-BY-STEP TASKS

### Task 1: CREATE `lib/adventure/levelVariety.ts`

- **IMPLEMENT:** Level variety configuration defining what's unique about each level
- **PATTERN:** Similar structure to levelConfig.ts
- **IMPORTS:** Types from @/types/adventure
- **GOTCHA:** Keep configs simple - avoid over-engineering

```typescript
// Key structure:
interface LevelVariety {
  world: number;
  level: number;
  introduces?: string;      // What new mechanic/element this level introduces
  visualTheme?: string;     // Visual variation for this level
  specialEvent?: string;    // Unique event (boss, challenge, etc.)
  entryAnimation?: string;  // Entry animation style
  atmosphere?: string[];    // Ambient elements to show
}

// World 1 example: Tutorial progression
// Level 1: Basic gameplay introduction
// Level 2: Introduces longer words objective
// Level 3: Introduces combo system
// Level 4: Introduces time pressure
// Level 5: MILESTONE - First hidden word challenge
// ... etc
```

- **VALIDATE:** `npm run test -- levelVariety.test.ts`

### Task 2: CREATE `lib/adventure/__tests__/levelVariety.test.ts`

- **IMPLEMENT:** Tests for level variety configuration
- **PATTERN:** Mirror levelConfig.test.ts structure
- **VALIDATE:** `npm run test -- levelVariety.test.ts`

### Task 3: CREATE `components/adventure/animations/LevelEntryAnimation.tsx`

- **IMPLEMENT:** Dramatic level entry sequence component
- **PATTERN:** Use Framer Motion with staggerChildren
- **IMPORTS:** framer-motion, lucide-react icons, @/lib/utils
- **GOTCHA:** Support reduced motion preferences

```typescript
interface LevelEntryAnimationProps {
  world: number;
  level: number;
  gridSize: number;
  onAnimationComplete: () => void;
}

// Animation sequence:
// 1. World name fades in with glow
// 2. "Level X" bursts with scale effect
// 3. Grid tiles cascade in from top (staggered)
// 4. Objectives slide in from sides
// 5. "GO!" flash and animation completes
```

- **VALIDATE:** `npm run test -- LevelEntryAnimation.test.tsx`

### Task 4: CREATE `components/adventure/LevelEntryAnimation.css`

- **IMPLEMENT:** CSS keyframes for GPU-accelerated entry animations
- **PATTERN:** Follow WorldMap.css patterns exactly
- **GOTCHA:** Include prefers-reduced-motion media query

```css
/* Key animations needed:
   - tile-cascade: Tiles falling into place
   - title-burst: Level number zoom effect
   - objective-slide: Objectives sliding from edges
   - go-flash: Brief flash when game starts
*/
```

- **VALIDATE:** Visual inspection in browser

### Task 5: CREATE `components/adventure/animations/TileSelectionEffects.tsx`

- **IMPLEMENT:** Enhanced tile interaction visual feedback
- **PATTERN:** Overlay SVG/CSS effects over AdventureGrid
- **IMPORTS:** framer-motion, @/lib/utils

```typescript
interface TileSelectionEffectsProps {
  selectedTiles: Array<{ row: number; col: number }>;
  gridSize: number;
  cellSize: number;
  worldColor: string; // Primary color for glow
}

// Effects:
// 1. Pulsing glow ring around selected tiles
// 2. Connecting line/path between selected tiles
// 3. Particle burst on tile select
// 4. Error shake on invalid selection
```

- **VALIDATE:** `npm run test -- TileSelectionEffects.test.tsx`

### Task 6: CREATE `components/adventure/animations/CelebrationEffects.tsx`

- **IMPLEMENT:** Victory celebration particle system
- **PATTERN:** Similar to LevelCompleteModal particle configs
- **IMPORTS:** framer-motion, @/lib/utils

```typescript
interface CelebrationEffectsProps {
  stars: 0 | 1 | 2 | 3;
  isOpen: boolean;
  worldColor: string;
}

// Effects:
// 1. Confetti burst from center
// 2. Stars that fly out then settle into position
// 3. Score numbers counting up
// 4. Combo text that scales and fades
// 5. "Perfect!" badge for 3 stars
```

- **VALIDATE:** `npm run test -- CelebrationEffects.test.tsx`

### Task 7: CREATE `components/adventure/animations/WorldAtmosphere.tsx`

- **IMPLEMENT:** World-specific ambient visual elements
- **PATTERN:** Similar to WorldMap star/nebula system
- **IMPORTS:** framer-motion, @/lib/utils
- **GOTCHA:** Must be performant (CSS animations, will-change)

```typescript
interface WorldAtmosphereProps {
  world: number;
  isPlaying: boolean;
}

// World 1 (Alphabet Meadows):
// - Floating letter particles (A, B, C slowly drifting)
// - Butterfly silhouettes
// - Grass/flower swaying at bottom

// World 2 (Synonym Springs):
// - Water droplet particles
// - Ripple effects
// - Light mist overlay

// World 3 (Root Caverns):
// - Crystal sparkle points
// - Torch/flame glow flickers
// - Cave dust particles
```

- **VALIDATE:** Visual inspection + performance profiling

### Task 8: CREATE `components/adventure/animations/index.ts`

- **IMPLEMENT:** Export barrel for animation components
- **PATTERN:** Standard barrel export

```typescript
export { default as LevelEntryAnimation } from './LevelEntryAnimation';
export { default as TileSelectionEffects } from './TileSelectionEffects';
export { default as CelebrationEffects } from './CelebrationEffects';
export { default as WorldAtmosphere } from './WorldAtmosphere';
```

- **VALIDATE:** Import test in AdventureGame

### Task 9: UPDATE `components/adventure/AdventureGame.tsx`

- **IMPLEMENT:** Integrate LevelEntryAnimation and WorldAtmosphere
- **PATTERN:** Add animation state management
- **IMPORTS:** New animation components
- **GOTCHA:** Animation should only play on first render

```typescript
// Key changes:
// 1. Add showEntryAnimation state (true initially)
// 2. Render LevelEntryAnimation when showEntryAnimation is true
// 3. Pass onAnimationComplete to start game after animation
// 4. Add WorldAtmosphere as background layer
// 5. Conditionally show based on world number (1-3 only for now)
```

- **VALIDATE:** `npm run test -- AdventureGame.test.tsx`

### Task 10: UPDATE `components/adventure/AdventureGrid.tsx`

- **IMPLEMENT:** Integrate TileSelectionEffects overlay
- **PATTERN:** Layered z-index for effects over tiles
- **IMPORTS:** TileSelectionEffects component
- **GOTCHA:** Effects layer must not block tile interactions

```typescript
// Key changes:
// 1. Add TileSelectionEffects as absolute overlay
// 2. Pass selectedIndices and grid dimensions
// 3. Add error feedback state for invalid selections
// 4. Trigger shake animation on invalid word attempt
```

- **VALIDATE:** `npm run test -- AdventureGrid.test.tsx`

### Task 11: UPDATE `components/adventure/AdventureTile.tsx`

- **IMPLEMENT:** Enhanced individual tile animations
- **PATTERN:** Expand existing Framer Motion animations
- **GOTCHA:** Keep tile interactions responsive

```typescript
// Key changes:
// 1. Add entrance animation (scale from 0 + slight rotation)
// 2. Enhanced gold tile sparkle (periodic shimmer)
// 3. Ice tile crack animation on damage
// 4. Bomb tile pulse intensity based on countdown
// 5. Rainbow tile color cycling animation
```

- **VALIDATE:** Visual inspection of each tile type

### Task 12: UPDATE `components/adventure/LevelCompleteModal.tsx`

- **IMPLEMENT:** Integrate enhanced CelebrationEffects
- **PATTERN:** Replace/enhance existing particle system
- **IMPORTS:** CelebrationEffects component
- **GOTCHA:** Keep modal performant on lower-end devices

```typescript
// Key changes:
// 1. Replace celebration-effect div with CelebrationEffects component
// 2. Add score count-up animation (0 -> final score)
// 3. Enhanced star animations with delay sequence
// 4. Pass world color for themed confetti
```

- **VALIDATE:** `npm run test -- LevelCompleteModal.test.tsx`

### Task 13: UPDATE `translations/en.js`, `translations/he.js`, `translations/sv.js`, `translations/ja.js`, `translations/es.js`

- **IMPLEMENT:** Add new translation keys for level variety text
- **PATTERN:** Nested under adventure.levels
- **GOTCHA:** All 5 languages must be updated

```javascript
// New keys needed:
adventure: {
  // ... existing keys
  levels: {
    introducing: "Introducing:",
    newMechanic: "New Mechanic",
    milestone: "Milestone Level!",
    hiddenWordChallenge: "Hidden Word Challenge",
    comboMaster: "Master combos to score big!",
    timeTrial: "Beat the clock!",
    // ... per-level intro text
  },
  animations: {
    ready: "Ready?",
    go: "GO!",
    perfect: "PERFECT!",
    amazing: "AMAZING!",
    goodJob: "GOOD JOB!"
  }
}
```

- **VALIDATE:** `npm run lint` (check for missing keys)

### Task 14: CREATE `components/adventure/__tests__/LevelEntryAnimation.test.tsx`

- **IMPLEMENT:** Tests for level entry animation
- **PATTERN:** Test animation states and callbacks
- **VALIDATE:** `npm run test -- LevelEntryAnimation.test.tsx`

### Task 15: CREATE `components/adventure/__tests__/CelebrationEffects.test.tsx`

- **IMPLEMENT:** Tests for celebration effects
- **PATTERN:** Test star states, particle rendering
- **VALIDATE:** `npm run test -- CelebrationEffects.test.tsx`

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**
- Test animation component props and callbacks
- Test level variety configuration functions
- Mock Framer Motion for snapshot testing
- Test CSS class application for states

**Pattern:**
```typescript
describe('LevelEntryAnimation', () => {
  it('should call onAnimationComplete after sequence', async () => {
    const onComplete = jest.fn();
    render(<LevelEntryAnimation world={1} level={1} gridSize={4} onAnimationComplete={onComplete} />);

    // Fast-forward animation
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  it('should skip animation when reduced motion preferred', () => {
    // Mock matchMedia
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }));

    const onComplete = jest.fn();
    render(<LevelEntryAnimation {...props} />);

    // Should complete immediately
    expect(onComplete).toHaveBeenCalled();
  });
});
```

### Integration Tests

**Scope and Requirements:**
- Test animation components within AdventureGame
- Test tile effects with grid interactions
- Verify atmosphere renders for correct worlds

### Edge Cases

- Reduced motion preference enabled
- Very fast level completion (animation interruption)
- Low-end device performance
- RTL language layout
- Animation state on pause/resume

---

## VALIDATION COMMANDS

### Level 0: Environment Verification

```bash
# Verify we're in the correct directory
pwd | grep "fe-next" && echo "✅ Correct directory"
```

### Level 1: TypeScript Compilation

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npx tsc --noEmit
```

**Expected:** No TypeScript errors

### Level 2: Linting

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run lint
```

**Expected:** No linting errors

### Level 3: Unit Tests

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run test -- --testPathPattern="adventure"
```

**Expected:** All adventure-related tests pass

### Level 4: Full Test Suite

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run test
```

**Expected:** All tests pass

### Level 5: Build

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run build
```

**Expected:** Build completes successfully

### Level 6: Manual Validation

1. Navigate to `/adventure` and select World 1
2. Click on Level 1 - verify entry animation plays
3. Play through level - verify tile selection effects
4. Complete level - verify celebration effects
5. Check World 2 and World 3 have unique atmospheres
6. Test with "prefers-reduced-motion: reduce" enabled

---

## ACCEPTANCE CRITERIA

- [ ] Level entry animation plays smoothly for all World 1-3 levels
- [ ] Tile selection shows visual feedback (glow, connecting line)
- [ ] Special tiles (gold, ice, bomb, rainbow) have enhanced effects
- [ ] Level complete celebration includes star animations and confetti
- [ ] Each world (1-3) has unique atmospheric particles/effects
- [ ] Animations respect prefers-reduced-motion preference
- [ ] All existing tests still pass
- [ ] New animation components have >80% test coverage
- [ ] Build succeeds without errors
- [ ] Translations updated for all 5 languages
- [ ] Performance remains smooth (60fps) on mid-range devices

---

## COMPLETION CHECKLIST

- [ ] All Phase 1-6 tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms animations work
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

### Design Rationale

**Why CSS animations for atmosphere?**
- GPU-accelerated via will-change
- No JavaScript overhead for repeating animations
- Better performance on mobile devices
- Proven pattern from WorldMap.css

**Why Framer Motion for interactive animations?**
- React-native syntax for component animations
- Easy spring physics for "bouncy" Neo-Brutalist feel
- Built-in gesture support for future drag interactions
- AnimatePresence for mount/unmount animations

**Why focus on Worlds 1-3 first?**
- Proves the enhancement system works
- Players spend most time in early worlds
- Allows iteration before scaling to all 10 worlds
- Reduces initial implementation scope

### Future Considerations

**Extension to Worlds 4-10:**
- Each world will need unique WorldAtmosphere config
- Boss battle animations (World 10 final boss)
- World-specific tile skins (crystal tiles in World 3, etc.)

**Sound Integration (Sprint 6):**
- Entry animation should have sound cues
- Tile selection "pop" sounds
- Celebration music/sfx

**Performance Optimization:**
- Consider canvas rendering for heavy particle effects
- Lazy-load animation components
- Reduce particle count on mobile

### Trade-offs

| Decision | Trade-off |
|----------|-----------|
| CSS over JS for atmosphere | Less dynamic control, but better performance |
| Focus on 3 worlds | Limited scope, but higher polish quality |
| Framer Motion for interactions | Larger bundle, but faster development |

---

## ESTIMATED EFFORT

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Level Variety System | 2 hours |
| Phase 2: Level Entry Animations | 4 hours |
| Phase 3: Tile Interaction Effects | 3 hours |
| Phase 4: Celebration Effects | 3 hours |
| Phase 5: World Atmosphere | 4 hours |
| Phase 6: Integration & Testing | 4 hours |
| **Total** | **~20 hours** |
