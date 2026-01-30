# Phase 27: Dynamic Board Mechanics - Research

**Researcher**: gsd-phase-researcher
**Date**: 2026-01-30
**Phase Goal**: Board feels alive with Candy Crush-style cascades and smooth animations

---

## Executive Summary

LexiClash already has substantial cascade and animation infrastructure. Phase 27 enhances this foundation with:
1. **True Candy Crush cascades** - collapse -> fall -> refill loop with match re-checking
2. **60fps mobile performance** - GPU-accelerated transforms only
3. **Explosion effects** - multi-tile clearing visual feedback
4. **Special tile activation** - frozen/locked/multiplier mechanics (partially stubbed)

Key insight: Most visual effects already exist in CSS. The work is primarily **logic orchestration** and **performance optimization**.

---

## Requirements Mapping

| Requirement | Description | Existing Infrastructure |
|-------------|-------------|------------------------|
| BOARD-01 | Tiles cascade (collapse -> fall -> refill, 0.25s per step) | `useCascadeAnimation.ts` - needs cascade loop |
| BOARD-02 | Smooth tile movement (quadratic/elastic easing) | Framer Motion springs available |
| BOARD-03 | Explosion effects for multi-tile clearing | CSS effects in `AdventureTile.css` |
| BOARD-04 | Special tile types (frozen, locked, multiplier) | Types defined, CSS ready, logic stubbed |
| BOARD-05 | Cascades trigger automatically when words removed | Partial - needs continuous loop |
| BOARD-06 | Board transformations at 60fps on mobile | Achievable with transform-only animations |

---

## Standard Stack (Use What Exists)

### Already In Codebase

1. **Framer Motion 11.18.2** - Layout animations, springs, stagger
2. **useCascadeAnimation.ts** - Existing cascade hook with diagonal delay calculation
3. **AdventureTile.css** - 1600+ lines of special tile animations (gold, ice, bomb, rainbow, chain, time)
4. **TileState types** - Full tile state model including activation effects

### Framer Motion Capabilities (Context7 Research)

```typescript
// Layout animations - tiles automatically animate to new positions
<motion.div layout />

// Spring physics for bouncy movement
<motion.div
  animate={{ y: 0 }}
  transition={{ type: "spring", stiffness: 500, damping: 30 }}
/>

// Stagger children for cascade effect
<motion.div
  variants={{
    visible: { transition: { staggerChildren: 0.05 } }
  }}
/>

// AnimatePresence for exit animations
<AnimatePresence mode="popLayout">
  {tiles.map(tile => (
    <motion.div
      key={tile.id}
      exit={{ scale: 0, opacity: 0 }}
    />
  ))}
</AnimatePresence>
```

---

## Architecture Pattern: Model-View Separation

### The Candy Crush Pattern

From web research, the canonical cascade algorithm:

```
1. MATCH DETECTION
   |-- Find all words/matches on board

2. REMOVE PHASE (0.25s)
   |-- Mark matched tiles for removal
   |-- Play removal animations
   |-- Award points

3. GRAVITY PHASE (0.25s)
   |-- Tiles above empty spaces fall down
   |-- Each tile calculates fall distance

4. SPAWN PHASE (0.25s)
   |-- New tiles spawn at top
   |-- Fall into empty positions

5. RE-CHECK LOOP
   |-- Check for new matches from fallen tiles
   |-- If matches found -> goto step 2
   |-- If no matches -> player can act again
```

### Key Architectural Decisions

**Model updates instantly, View animates to catch up:**

```typescript
// BAD: Animate model changes
async function removeTiles(tiles) {
  await playAnimation(tiles);  // Blocks game logic
  updateBoard();
}

// GOOD: Model-View separation
function removeTiles(tiles) {
  // Model: Instant state update
  setBoardState(newState);

  // View: Catches up via animation
  // (Framer Motion's layout prop handles this)
}
```

**Processing flag prevents input during cascades:**

```typescript
interface GameState {
  isProcessingCascade: boolean;  // Lock input during cascade
  cascadePhase: 'idle' | 'removing' | 'falling' | 'spawning';
}
```

---

## Existing Infrastructure Analysis

### useCascadeAnimation.ts (Current)

```typescript
const cascadeDelay = React.useMemo(() => {
  const maxDiagonal = gridSize * 2 - 2;
  return (row: number, col: number) => {
    const diagonal = row + col;
    const baseDelay = diagonal * 30; // 30ms per diagonal
    const randomJitter = Math.random() * 10;
    return baseDelay + randomJitter;
  };
}, [showCascade, gridSize]);
```

**Current capability**: Diagonal reveal animation for level start
**Gap**: No cascade-after-word-removal logic

### AdventureTile.css (Special Tile Effects)

All activation effects are CSS-ready:

| Effect | Status | CSS Class |
|--------|--------|-----------|
| Gold collect (3x) | Ready | `.tile-gold-collect` |
| Ice melt | Ready | `.tile-ice-melt` |
| Bomb explode | Ready | `.tile-bomb-explode` |
| Rainbow wildcard | Ready | `.tile-rainbow-wildcard` |
| Chain link | Ready | `.tile-chain-link` |
| Time bonus | Ready | `.tile-time-bonus` |

**Reduced motion support** already implemented via `prefers-reduced-motion`.

### types/adventure.ts (Tile Types)

```typescript
export type TileType = 'standard' | 'gold' | 'ice' | 'bomb' | 'rainbow' | 'chain' | 'time';

export type TileActivationEffect =
  | 'melt'      // Ice tile melted
  | 'explode'   // Bomb tile detonated
  | 'collect'   // Gold tile 3x collected
  | 'wildcard'  // Rainbow used
  | 'link'      // Chain linked neighbors
  | 'timeBonus' // Time tile added seconds
  | null;
```

---

## Don't Hand-Roll

### Use Framer Motion's Built-in Features

| Need | Don't Build | Use Instead |
|------|-------------|-------------|
| Position animations | Manual x/y tracking | `layout` prop |
| Exit animations | Manual unmount state | `AnimatePresence` |
| Spring physics | Custom easing curves | `type: "spring"` |
| Stagger effects | Manual delay calculation | `staggerChildren` |
| Shared layout | Manual position sync | `layoutId` |

### Use CSS for Visual Effects

All special tile effects are already in `AdventureTile.css`:
- Don't recreate shimmer/glow/pulse effects in JS
- Just toggle CSS classes based on `activationEffect` state

### Use Existing Game State

```typescript
// Already exists in TileState
interface TileState {
  activationEffect?: TileActivationEffect;  // Triggers CSS animation
  activationTimestamp?: number;              // For animation timing
  cascadeDelay?: number;                     // For stagger
}
```

---

## 60fps Performance Techniques

### GPU-Accelerated Properties Only

```css
/* GOOD: GPU composited (transform, opacity) */
.tile-falling {
  transform: translateY(var(--fall-distance));
  opacity: 1;
}

/* BAD: Layout thrashing (avoid) */
.tile-falling {
  top: var(--fall-distance);  /* Forces layout recalc */
  height: 50px;                /* Forces layout recalc */
}
```

### Frame Budget

- **Target**: 60fps = 16.66ms per frame
- **Safe budget**: 10ms for JS, 6ms for rendering
- **Measure**: Use Chrome DevTools Performance tab

### Layer Promotion

```css
/* Promote tiles to own compositor layer */
.adventure-tile {
  will-change: transform, opacity;
  contain: layout style paint;
}
```

### Structural Sharing (From Phase 15 Research)

```typescript
// BAD: Create new array on every update
const newTiles = tiles.map(row => [...row]);

// GOOD: Structural sharing - only update changed tiles
const newTiles = tiles.map((row, r) =>
  affectedRows.includes(r)
    ? row.map((tile, c) =>
        affectedCols.includes(c)
          ? { ...tile, ...updates }
          : tile
      )
    : row  // Same reference if unchanged
);
```

---

## Common Pitfalls

### 1. Animating During State Updates

**Problem**: Animation frames dropped because React is re-rendering

**Solution**: Batch state updates, use `startTransition` for non-urgent updates

```typescript
import { startTransition } from 'react';

// Urgent: Lock input immediately
setIsProcessing(true);

// Non-urgent: Can be deferred
startTransition(() => {
  setBoardState(newState);
});
```

### 2. Too Many Animated Elements

**Problem**: 49 tiles (7x7) all animating = performance death

**Solution**: Only animate tiles that actually move

```typescript
// Track which tiles need animation
const animatingTiles = new Set<string>();

tiles.forEach((row, r) => {
  row.forEach((tile, c) => {
    if (tile.needsAnimation) {
      animatingTiles.add(`${r}-${c}`);
    }
  });
});
```

### 3. Layout Thrashing

**Problem**: Reading layout then writing causes forced reflow

**Solution**: Batch reads before writes

```typescript
// BAD: Read-write-read-write
tiles.forEach(tile => {
  const rect = tile.getBoundingClientRect();  // READ
  tile.style.transform = `translateY(${rect.height}px)`;  // WRITE
});

// GOOD: Read all, then write all
const rects = tiles.map(tile => tile.getBoundingClientRect());
tiles.forEach((tile, i) => {
  tile.style.transform = `translateY(${rects[i].height}px)`;
});
```

### 4. Cascade Loop Without Exit

**Problem**: Infinite loop if match detection has bugs

**Solution**: Add safety limits

```typescript
const MAX_CASCADE_ITERATIONS = 10;
let iterations = 0;

while (hasMatches() && iterations < MAX_CASCADE_ITERATIONS) {
  await processCascade();
  iterations++;
}

if (iterations >= MAX_CASCADE_ITERATIONS) {
  console.error('Cascade loop exceeded max iterations');
}
```

### 5. Missing Reduced Motion Support

**Problem**: Accessibility violation, motion sensitivity

**Solution**: Already handled in CSS, ensure JS respects it too

```typescript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

const animationDuration = prefersReducedMotion ? 0 : 250;
```

---

## Implementation Recommendations

### Phase 1: Cascade Logic (BOARD-01, BOARD-05)

1. Create `useCascadeLoop.ts` hook
2. Implement match -> remove -> gravity -> spawn cycle
3. Add `isProcessingCascade` flag to game state
4. Wire into `useAdventureGame.ts` after word submission

### Phase 2: Smooth Animations (BOARD-02, BOARD-06)

1. Add Framer Motion `layout` to `AdventureTile.tsx`
2. Configure spring physics for bouncy feel
3. Profile on iPhone 12 Safari for 60fps verification
4. Add `will-change` hints to CSS

### Phase 3: Explosion Effects (BOARD-03)

1. Create `ExplosionEffect.tsx` component
2. Trigger on multi-tile (3+) word clears
3. Use existing particle system from Phase 26
4. Device-aware particle count

### Phase 4: Special Tiles (BOARD-04)

1. Implement frozen tile logic (requires adjacent word to thaw)
2. Implement locked tile logic (requires specific letter to unlock)
3. Implement multiplier tile logic (2x score when used)
4. CSS effects already exist - just wire up state

---

## Open Questions

### For Planning Phase

1. **Cascade timing**: Should cascade be 0.25s per phase (spec) or adjustable?
2. **Multi-word cascades**: Can cascade create new valid words that auto-submit?
3. **Special tile spawn rate**: How often should special tiles appear in refill?
4. **Frozen/locked unlock conditions**: What exactly thaws ice / unlocks locked tiles?
5. **Multiplier stacking**: Do multiplier tiles stack with gold tiles?

### Technical Decisions Needed

1. **Animation library**: Stick with Framer Motion or add GSAP for complex sequences?
2. **State management**: Keep in React state or move to Zustand for performance?
3. **Cascade queue**: Process one cascade at a time or batch multiple?

---

## Summary

**What's already built:**
- Cascade delay calculation (diagonal pattern)
- All special tile CSS animations
- Tile state model with activation effects
- Reduced motion support

**What needs building:**
- Cascade loop logic (match -> remove -> gravity -> spawn -> re-check)
- Framer Motion layout integration for smooth tile movement
- Explosion effect component for multi-tile clears
- Special tile activation logic (frozen thaw, locked unlock, multiplier apply)
- 60fps performance optimization

**Estimated complexity**: Medium - Most visual work exists, primarily logic orchestration.
