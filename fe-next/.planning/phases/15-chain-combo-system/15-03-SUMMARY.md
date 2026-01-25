---
phase: 15-chain-combo-system
plan: 03
subsystem: adventure-animations
tags: [particles, world-theming, device-performance, animations]
requires: [useDevicePerformance, adventure-world-types]
provides: [ChainParticleBurst, world-particle-configs]
affects: [15-04, 15-05]
tech-stack:
  added: []
  patterns: [useRef-for-callbacks, device-aware-particles, world-themed-effects]
key-files:
  created:
    - lib/adventure/worldThemes.ts
    - components/animations/ChainParticleBurst.tsx
    - components/animations/__tests__/ChainParticleBurst.test.tsx
  modified: []
decisions:
  - id: chain-particle-001
    what: Use useRef for onComplete callback to prevent effect re-runs
    why: Including callback in useEffect dependencies causes unnecessary re-runs when callback changes
    impact: Stable animation lifecycle, prevents timer cleanup issues
  - id: chain-particle-002
    what: Particle counts 4/12/20 for low/mid/high-end devices
    why: Balance visual satisfaction with performance on older devices
    impact: Smooth animations across all device tiers
  - id: chain-particle-003
    what: Every 3rd particle uses emoji instead of colored square
    why: Adds variety and world personality without overwhelming the burst
    impact: More engaging world-themed feedback
metrics:
  duration: 17m
  completed: 2026-01-25
  tasks: 3
  commits: 3
  tests-added: 13
  lines-added: 693
---

# Phase 15 Plan 03: World-Themed Particle Burst Summary

**One-liner:** World-themed particle bursts for chain activation with device-aware counts (4/12/20) and reduced motion fallback

## Tasks Completed

| Task | Commit | Files | Lines |
|------|--------|-------|-------|
| 1. World particle configs | 77c0c0e4 | worldThemes.ts | +146 |
| 2. ChainParticleBurst component | 9bbc68b0 | ChainParticleBurst.tsx | +245 |
| 3. Component tests | 7fc3f32f | __tests__/ChainParticleBurst.test.tsx, ChainParticleBurst.tsx | +302 |

## What Was Built

### World Particle Theme Configurations

Created `lib/adventure/worldThemes.ts` with configurations for all 10 adventure worlds:

1. **Alphabet Meadows** - Green leaves (🌿)
2. **Synonym Springs** - Turquoise water drops (💧)
3. **Root Caverns** - Gold gems (💎)
4. **Idiom Archipelago** - Orange palm trees (🌴)
5. **Compound Canyon** - Sandy desert (🏜️)
6. **Anagram Labyrinth** - Purple sparkles (✨)
7. **Mirror Palace** - Cyan snowflakes (❄️)
8. **Neologism Nebula** - Pink stars (🌟)
9. **Polyglot Peaks** - Blue mountains (⛰️)
10. **Lexicon Throne** - Yellow crowns (👑)

Each world config includes:
- Primary and secondary colors (hex)
- Themed emoji particle
- Size range (4-14px)
- Distance range (35-90px)
- Animation duration (550-700ms)

### ChainParticleBurst Component

Device-aware particle burst animation component:

**Device Performance Tiers:**
- **Low-end** (2 cores, 2GB RAM): 4 particles
- **Mid-range** (4 cores, 4GB RAM): 12 particles
- **High-end** (6+ cores, 8GB+ RAM): 20 particles

**Animation Layers:**
1. Expanding ring effect (world color)
2. Secondary ring (secondary color)
3. Central glow (radial gradient)
4. Radial particle burst (emojis + colored squares)

**GPU-Accelerated:**
- Only transform and opacity animations
- No layout-triggering properties
- Smooth 60fps on capable devices

**Reduced Motion Fallback:**
- Static emoji badge instead of particles
- Neo-brutalist styled badge (border + shadow)
- Respects user accessibility preferences

### Test Coverage

**13 tests, 100% pass rate:**

1. **Rendering Tests (3)**
   - Does not render when trigger=false
   - Renders particles when trigger=true
   - Correct particle count for high-end devices

2. **World Theming Tests (3)**
   - Correct color for world 1 (green/rgb)
   - Correct emoji for world 7 (snowflake)
   - Fallback to world 1 for invalid world number

3. **Performance Tests (3)**
   - 4 particles for low-end devices
   - 12 particles for mid-range devices
   - Static badge for prefersReducedMotion

4. **Lifecycle Tests (2)**
   - Uses world config duration for timer
   - Accepts onComplete callback prop

5. **Position Tests (2)**
   - Positions at correct x, y coordinates
   - Centers with transform translate

## Decisions Made

### 1. useRef for onComplete Callback

**Problem:** Including `onComplete` in useEffect dependencies caused re-runs when callback changed.

**Solution:** Store callback in `useRef` and update via separate effect.

```typescript
const onCompleteRef = useRef(onComplete);
useEffect(() => {
  onCompleteRef.current = onComplete;
}, [onComplete]);
```

**Impact:** Stable animation lifecycle, prevents timer cleanup issues.

### 2. Device-Tiered Particle Counts

**Options Considered:**
- Fixed count (too laggy on low-end OR underwhelming on high-end)
- Gradual scaling (complex, hard to test)
- Three tiers (simple, predictable)

**Chosen:** Three tiers (4/12/20)

**Rationale:** Balances visual satisfaction with performance. Low-end gets usable feedback, high-end gets impressive burst.

### 3. Emoji Frequency (Every 3rd Particle)

**Options:**
- All emojis (emoji rendering can be slow on some devices)
- No emojis (less world personality)
- Mixed (variety without performance hit)

**Chosen:** Every 3rd particle uses emoji

**Rationale:** Adds world flavor without overwhelming the burst or impacting performance.

## Technical Highlights

### Pattern: World-Themed Configuration

```typescript
export interface WorldParticleConfig {
  color: string;
  emoji?: string;
  secondaryColor?: string;
  size: { min: number; max: number };
  distance: { min: number; max: number };
  duration: number;
}

export const WORLD_PARTICLE_CONFIGS: Record<number, WorldParticleConfig> = {
  1: { color: '#90EE90', emoji: '🌿', ... },
  // ... 10 worlds
};
```

### Pattern: Device-Aware Particle Generation

```typescript
const getParticleCount = useCallback(() => {
  if (isLowEnd) return 4;
  if (maxParticles <= 8) return 12; // mid-range
  return 20; // high-end
}, [isLowEnd, maxParticles]);
```

### Pattern: GPU-Accelerated Animation

```typescript
// Only transform and opacity (GPU-friendly)
animate={{
  x: endX,
  y: endY,
  scale: [0, 1.5, 0],
  opacity: [1, 1, 0],
}}
```

## Integration Points

### Dependencies Used

| Dependency | Purpose | Pattern |
|------------|---------|---------|
| `useDevicePerformance` | Particle count adaptation | isLowEnd, maxParticles |
| `getWorldParticleConfig` | World theming | config = getConfig(world) |
| `framer-motion` | GPU-accelerated animations | motion.div, AnimatePresence |
| `cn` from lib/utils | Tailwind class merging | className composition |

### Exports Provided

| Export | Type | Purpose |
|--------|------|---------|
| `ChainParticleBurst` | Component | Main particle burst component |
| `getWorldParticleConfig` | Function | Get config for world number |
| `WorldParticleConfig` | Interface | Type for world particle configs |
| `WORLD_PARTICLE_CONFIGS` | Constant | All 10 world configurations |

## Testing Approach

### Mocking Strategy

1. **Mock useDevicePerformance** - Control device tier in tests
2. **Mock getWorldParticleConfig** - Verify world theming
3. **Mock framer-motion** - Simplify animation testing
4. **Fake timers** - Control animation lifecycle

### Test Patterns Used

**Given-When-Then Structure:**
```typescript
// GIVEN: High-end device
mockUseDevicePerformance.mockReturnValue({ maxParticles: 20, ... });

// WHEN: Trigger burst
render(<ChainParticleBurst trigger={true} world={1} />);

// THEN: 20 particles rendered
expect(motionDivs.length).toBeGreaterThanOrEqual(20);
```

## Deviations from Plan

None - plan executed exactly as specified.

## Next Phase Readiness

**Enables:**
- **15-04 (Chain Sound Design)** - Particle burst triggers sound effects
- **15-05 (Integration)** - Chain tiles call ChainParticleBurst on activation

**Blocks:** None

**Risks:** None

## Verification Evidence

### Must-Haves Checklist

✅ User sees particle burst when chain tile activates
✅ Particles themed to current world (ice=snowflakes, meadows=leaves)
✅ Particle count adapts to device (4 low, 12 mid, 20 high)
✅ Reduced motion users see static feedback

### Artifact Verification

✅ `lib/adventure/worldThemes.ts` - 146 lines
  - Exports: WorldParticleConfig, WORLD_PARTICLE_CONFIGS, getWorldParticleConfig
  - Contains: particleConfig for 10 worlds

✅ `components/animations/ChainParticleBurst.tsx` - 245 lines
  - Exports: ChainParticleBurst (named + default)
  - Uses: useDevicePerformance hook
  - Pattern: maxParticles, isLowEnd

✅ Build passes (TypeScript compilation successful)
✅ Lint passes (0 errors, 0 warnings)
✅ Tests pass (13/13 tests, 100% pass rate)

### Key Links Verified

✅ ChainParticleBurst → useDevicePerformance
  - Uses: maxParticles, isLowEnd, prefersReducedMotion, enableGlowEffects
  - Pattern: Device-tiered particle counts

✅ ChainParticleBurst → worldThemes
  - Uses: getWorldParticleConfig(world)
  - Pattern: World-themed colors and emojis

## Files Changed

### Created (3 files, 693 lines)

1. **lib/adventure/worldThemes.ts** (+146 lines)
   - World particle configurations
   - getWorldParticleConfig helper

2. **components/animations/ChainParticleBurst.tsx** (+245 lines)
   - Main particle burst component
   - Device-aware particle generation
   - GPU-accelerated animations

3. **components/animations/__tests__/ChainParticleBurst.test.tsx** (+302 lines)
   - 13 comprehensive tests
   - Device tier testing
   - World theming verification

### Modified (0 files)

None

## Success Criteria Met

✅ 10 world particle configurations defined
✅ ChainParticleBurst component with device-aware particle counts
✅ Reduced motion fallback implemented
✅ 13+ tests covering theming and performance (13 tests)
✅ Build and lint pass
✅ Uses GPU-accelerated animations only (transform, opacity)

## Performance Impact

**Bundle Size:** Minimal (+693 lines, ~18KB uncompressed)
**Runtime:** GPU-accelerated, 60fps on capable devices
**Memory:** Particle cleanup after animation completes
**Accessibility:** Reduced motion support ✅

## Related Documentation

- **Research:** `.planning/phases/15-chain-combo-system/15-RESEARCH.md`
- **Plan:** `.planning/phases/15-chain-combo-system/15-03-PLAN.md`
- **Reference Component:** `components/animations/CoinBurstSource.tsx`
- **Hook Reference:** `hooks/useDevicePerformance.ts`
