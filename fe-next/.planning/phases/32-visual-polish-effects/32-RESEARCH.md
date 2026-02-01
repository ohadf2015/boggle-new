# Phase 32: Visual Polish & Effects - Research

**Researched:** 2026-02-01
**Domain:** Particle effects, celebration animations, layered visual systems, performance budgeting
**Confidence:** HIGH

---

## Summary

Phase 32 elevates game juice with spectacular layered particle effects and cinematics. The codebase has **85% of required infrastructure** already implemented:

1. **Confetti System**: `canvas-confetti` with adaptive budgets, neo-brutalist presets (`confettiUtils.ts`)
2. **Particle Budgets**: Device-aware limits (30/60/100 particles) via `useParticleBudget()` (Phase 26)
3. **Cinematics**: Remotion Player + useCinematic hook from Phase 30 (boss battles)
4. **Fireworks**: Custom Framer Motion fireworks (`NewYearFireworks.tsx`)
5. **Accessibility**: `usePrefersReducedMotion()` hook + CSS `prefers-reduced-motion` support

**Primary recommendation:** Extend existing confetti system with layered effects (background/mid/foreground), create full-screen celebration compositions for 10+ combos, wire victory/defeat cinematics to game outcomes. All animations MUST respect particle budgets and reduced-motion preferences.

---

## Requirements Mapping

| Requirement | Description | Existing Infrastructure | Gap |
|-------------|-------------|------------------------|-----|
| POLISH-01 | Confetti on level victory | `fireVictoryConfetti()` exists | Wire to level completion |
| POLISH-02 | Fireworks on boss defeat | `NewYearFireworks.tsx` component | Adapt for boss context |
| POLISH-03 | 10+ combo full-screen celebration | `canvas-confetti` ready | Create layered composition |
| POLISH-04 | Layered particles (bg/mid/fg) | Z-index system in CSS | Multi-layer confetti config |
| POLISH-05 | Victory/defeat cinematics | Remotion Player + useCinematic | Create new compositions |
| POLISH-06 | Particle budget enforcement (50-100 max) | `useParticleBudget()` hook | Apply to all new effects |

---

## Standard Stack (Use What Exists)

### Already In Codebase

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| canvas-confetti | ^1.9.4 | Particle effects | ✅ Integrated with neo-brutalist presets |
| Framer Motion | ^12.23.24 | Fireworks animations | ✅ Used in NewYearFireworks |
| Remotion | ^4.0.414 | Video cinematics | ✅ Boss battle cinematics |
| @remotion/player | ^4.0.414 | Cinematic playback | ✅ CinematicPlayer component |

### Core Hooks (Phase 26 Foundation)

```typescript
// Device-aware particle budgets
const { tier, max, combo, levelUp, word } = useParticleBudget();
// tier: 'low' | 'medium' | 'high'
// max: 30 | 60 | 100 (device-dependent)

// Accessibility check
const prefersReducedMotion = usePrefersReducedMotion();
// Returns true if user enabled reduced-motion in OS

// Device performance detection
const { isLowEnd, enableComplexAnimations } = useDevicePerformance();
```

### Existing Confetti System

From `utils/confettiUtils.ts`:

```typescript
// Neo-brutalist color palette
NEO_BRUTALIST_COLORS = ['#FFE135', '#FF1493', '#00FFFF', '#BFFF00', '#FF3366'];

// Preset celebration functions
fireVictoryConfetti();     // Victory burst (25+15 particles)
fireLevelUpConfetti();     // Level up burst (35+25 particles)
fireStreakConfetti();      // Streak milestone (20+15 particles)
fireRankConfetti(rank);    // Rank-based (16-40 particles, scales with rank)
fireFirstWinConfetti(2500); // Cascading confetti (2s duration, RAF-based)

// Custom confetti with budget awareness
fireConfetti({
  particleCount: budget.combo,
  colors: NEO_BRUTALIST_COLORS,
  flat: true,  // Neo-brutalist: no 3D wobble
  shapes: ['square', 'square', 'square', 'circle'],
  scalar: 1.2,
  gravity: 1.2,
});
```

**All confetti functions already reduced by 40-60% from original values** (Phase 26 optimization).

---

## Architecture Patterns

### Pattern 1: Layered Particle Effects (Background/Mid/Foreground)

**What:** Multi-layer particle system for depth perception
**When to use:** 10+ combo celebrations, boss defeats, major milestones
**Why:** Creates visual richness without overwhelming particle count

```typescript
// Source: Existing neo-brutalist design system + particle budgets
import { fireConfetti } from '@/utils/confettiUtils';
import { useParticleBudget } from '@/hooks/useParticleBudget';

interface LayeredCelebrationConfig {
  /** Duration of celebration in ms */
  duration: number;
  /** Particle budget tier */
  budget: ReturnType<typeof useParticleBudget>;
}

/**
 * Layered full-screen celebration for 10+ combos
 *
 * Layers:
 * - Background: Slow, large particles (20% of budget)
 * - Mid-ground: Medium particles, main burst (60% of budget)
 * - Foreground: Fast, small sparkles (20% of budget)
 */
export function fireLayeredCelebration({ duration, budget }: LayeredCelebrationConfig) {
  const { combo } = budget;

  // Calculate layer budgets (80% of total for safety margin)
  const totalParticles = Math.floor(combo * 0.8);
  const bgParticles = Math.floor(totalParticles * 0.2);
  const midParticles = Math.floor(totalParticles * 0.6);
  const fgParticles = Math.floor(totalParticles * 0.2);

  // BACKGROUND LAYER: Slow, large, drifting
  fireConfetti({
    particleCount: bgParticles,
    spread: 360,
    origin: { x: 0.5, y: 0.3 },
    colors: ['#FFE135', '#BFFF00'], // Yellow/lime
    scalar: 2.0,  // Large particles
    gravity: 0.5, // Slow fall
    ticks: 200,   // Long lifetime
    zIndex: 1000, // Behind mid-ground
  });

  // MID-GROUND LAYER: Main celebration burst (delayed 100ms)
  setTimeout(() => {
    fireConfetti({
      particleCount: midParticles,
      spread: 120,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#FF1493', '#00FFFF', '#FF3366'], // Pink/cyan/red
      scalar: 1.4,
      gravity: 1.0,
      ticks: 150,
      zIndex: 2000, // Middle layer
    });
  }, 100);

  // FOREGROUND LAYER: Fast sparkles (delayed 200ms)
  setTimeout(() => {
    fireConfetti({
      particleCount: fgParticles,
      spread: 90,
      origin: { x: 0.5, y: 0.6 },
      colors: ['#FFFFFF', '#FFE135'], // White/yellow sparkles
      scalar: 0.8,  // Small particles
      gravity: 1.5, // Fast fall
      ticks: 100,   // Short lifetime
      zIndex: 3000, // Foreground
      startVelocity: 60, // High energy
    });
  }, 200);
}
```

**Budget enforcement:** Total particles = `combo * 0.8`, respecting device limits (30/60/100).

### Pattern 2: Remotion Cinematics for Victory/Defeat

**What:** Reuse Remotion infrastructure from Phase 30 for game outcomes
**When to use:** Level victory, boss defeat, game over screens
**Why:** Consistent cinematic experience, skip functionality, accessibility

```typescript
// Source: Phase 30 boss battle cinematics
import { CinematicPlayer } from '@/components/adventure/boss/cinematics/CinematicPlayer';
import { useCinematic } from '@/hooks/useCinematic';

// Victory cinematic composition (create as Remotion component)
const VictoryCinematic: React.FC<{ level: number }> = ({ level }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e' }}>
      <Sequence from={0} durationInFrames={90}>
        {/* Fireworks burst (0-3s at 30fps) */}
        <FireworksAnimation count={12} />
      </Sequence>
      <Sequence from={30} durationInFrames={90}>
        {/* Victory text + confetti (1-4s) */}
        <VictoryText level={level} />
      </Sequence>
      <Sequence from={60} durationInFrames={60}>
        {/* Star rating + stats (2-4s) */}
        <StarRating stars={3} />
      </Sequence>
    </AbsoluteFill>
  );
};

// Usage in game
function LevelComplete({ level, onContinue }: LevelCompleteProps) {
  const { isComplete, skip, handleFrameUpdate } = useCinematic({
    durationFrames: 240, // 8 seconds at 30fps
    onComplete: onContinue,
  });

  return (
    <CinematicPlayer
      composition={VictoryCinematic}
      compositionProps={{ level }}
      durationSeconds={8}
      onComplete={onContinue}
      fullscreen={true}
    />
  );
}
```

**Accessibility:**
- Skip button unlocks after 2s (BOSS-04 from Phase 30)
- Respects `prefers-reduced-motion` (shows static frame)
- ESC key to skip

### Pattern 3: Fireworks Adaptation for Boss Defeats

**What:** Repurpose `NewYearFireworks.tsx` for boss context
**When to use:** Boss defeat celebrations
**Why:** Component already built, just needs theming

```typescript
// Source: components/celebration/NewYearFireworks.tsx
import NewYearFireworks from '@/components/celebration/NewYearFireworks';

interface BossDefeatFireworksProps {
  /** Whether to show fireworks */
  active: boolean;
  /** Boss tier (affects intensity) */
  bossTier: 'mini' | 'standard' | 'elite';
}

/**
 * Boss defeat fireworks (adapted from New Year component)
 *
 * Intensity scales with boss tier:
 * - Mini: 6 bursts, 3s duration
 * - Standard: 10 bursts, 5s duration
 * - Elite: 15 bursts, 8s duration
 */
export function BossDefeatFireworks({ active, bossTier }: BossDefeatFireworksProps) {
  const config = {
    mini: { count: 6, duration: 3000 },
    standard: { count: 10, duration: 5000 },
    elite: { count: 15, duration: 8000 },
  }[bossTier];

  return (
    <NewYearFireworks
      active={active}
      count={config.count}
      duration={config.duration}
    />
  );
}
```

**Performance:** Fireworks use Framer Motion with 16 particles per burst, GPU-accelerated transforms.

### Pattern 4: Full-Screen Combo Celebration

**What:** Epic celebration overlay for 10+ combo milestones
**When to use:** Combo reaches 10, 15, 20+ thresholds
**Why:** Reward mastery with spectacular feedback

```typescript
interface ComboMilestoneConfig {
  threshold: number;
  label: string;
  duration: number;
  particleBudget: number; // Percentage of device max
}

const COMBO_MILESTONES: ComboMilestoneConfig[] = [
  { threshold: 10, label: 'INCREDIBLE!', duration: 2000, particleBudget: 0.6 },
  { threshold: 15, label: 'UNSTOPPABLE!', duration: 2500, particleBudget: 0.8 },
  { threshold: 20, label: 'LEGENDARY!', duration: 3000, particleBudget: 1.0 },
];

/**
 * Full-screen combo milestone celebration
 *
 * Components:
 * - Layered confetti burst (3 layers)
 * - Screen flash (neo-yellow bg pulse)
 * - Giant text animation (scale + rotate)
 * - Haptic feedback (if available)
 */
export function fireComboMilestoneCelebration(
  combo: number,
  budget: ReturnType<typeof useParticleBudget>
) {
  const milestone = COMBO_MILESTONES.findLast(m => combo >= m.threshold);
  if (!milestone) return;

  // Screen flash (CSS animation)
  document.body.classList.add('combo-flash');
  setTimeout(() => document.body.classList.remove('combo-flash'), 300);

  // Layered confetti
  fireLayeredCelebration({
    duration: milestone.duration,
    budget: {
      ...budget,
      combo: Math.floor(budget.combo * milestone.particleBudget),
    },
  });

  // Show giant text overlay (Framer Motion component)
  return {
    label: milestone.label,
    duration: milestone.duration,
  };
}
```

**CSS for screen flash:**
```css
@keyframes combo-flash {
  0%, 100% { background-color: transparent; }
  50% { background-color: rgba(255, 225, 53, 0.3); }
}

.combo-flash {
  animation: combo-flash 300ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .combo-flash {
    animation: none; /* No flash for reduced motion */
  }
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Particle system | Custom canvas renderer | `canvas-confetti` | Battle-tested, 6.5KB, Web Worker support |
| Fireworks animation | Custom particle bursts | `NewYearFireworks.tsx` | Already built, GPU-accelerated |
| Video cinematics | Canvas/WebGL renderer | Remotion Player | Declarative, skip support, reduced-motion handling |
| Device detection | Manual feature checks | `useDevicePerformance()` | Handles cores, memory, connection, reduced-motion |
| Particle budgets | Hardcoded limits | `useParticleBudget()` | Adaptive 30/60/100 based on device |
| Celebration queue | Manual setTimeout chains | AnimatePresence + queue state | Handles exit animations cleanly |

**Key insight:** The project already has comprehensive particle/animation infrastructure. Phase 32 is about **composition and orchestration**, not building new primitives.

---

## Common Pitfalls

### Pitfall 1: Exceeding Particle Budget

**What goes wrong:** Spawning 200+ particles on low-end devices → frame drops, janky gameplay
**Why it happens:** Desktop testing with high-end GPU doesn't reveal mobile issues
**How to avoid:**
- ALWAYS check `useParticleBudget()` before firing confetti
- Test on real mobile devices (iPhone 12, mid-range Android)
- Profile with Chrome DevTools Performance tab (throttle CPU 6x)

**Example fix:**
```typescript
// BAD: Hardcoded particle count
fireConfetti({ particleCount: 100 });

// GOOD: Budget-aware
const { combo } = useParticleBudget();
fireConfetti({ particleCount: combo }); // Adapts to 5/10/15 based on device
```

**Warning signs:** FPS drops during celebrations, input lag after effects

### Pitfall 2: Ignoring Reduced Motion

**What goes wrong:** Particles/animations trigger vestibular disorders, nausea, seizures
**Why it happens:** Developers test with animations on, forget accessibility
**How to avoid:**
- Wrap ALL particle effects in `prefersReducedMotion` checks
- Provide static alternatives (instant state changes, flash, sound)
- Test with OS reduced-motion enabled (macOS: Accessibility > Display)

**Example fix:**
```typescript
// BAD: No accessibility check
fireLayeredCelebration({ duration: 3000, budget });

// GOOD: Reduced motion aware
const prefersReducedMotion = usePrefersReducedMotion();

if (prefersReducedMotion) {
  // Static feedback: Screen flash + sound
  triggerFlashFeedback();
  playSoundEffect('celebration');
} else {
  // Full animation
  fireLayeredCelebration({ duration: 3000, budget });
}
```

**Warning signs:** User reports motion sickness, WCAG 2.2.2 violations

### Pitfall 3: Celebration Modal Queue Collisions

**What goes wrong:** Multiple celebrations trigger simultaneously → modal stacking, flickering
**Why it happens:** Boss defeat + level up + achievement unlock fire at same time
**How to avoid:**
- Implement celebration queue (FIFO)
- Show one celebration at a time with 500ms gap
- OR combine into single multi-reward modal

**Example fix:**
```typescript
// Celebration queue manager
const useCelebrationQueue = () => {
  const [queue, setQueue] = useState<Celebration[]>([]);
  const [current, setCurrent] = useState<Celebration | null>(null);

  const addCelebration = useCallback((celebration: Celebration) => {
    setQueue(prev => [...prev, celebration]);
  }, []);

  useEffect(() => {
    // Process queue when current finishes
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrent(next);
      setQueue(rest);
    }
  }, [current, queue]);

  return { addCelebration, current, dismissCurrent: () => setCurrent(null) };
};
```

**Warning signs:** Modal overlap, celebration text flashing, confetti on top of cinematic

### Pitfall 4: Z-Index Layering Conflicts

**What goes wrong:** Foreground particles render behind mid-ground, depth perception broken
**Why it happens:** CSS stacking contexts not properly managed
**How to avoid:**
- Use explicit `zIndex` values in confetti config
- Document z-index scale (1000 = bg, 2000 = mid, 3000 = fg, 9999 = modals)
- Test layering by triggering multiple effects simultaneously

**Example fix:**
```typescript
// Confetti z-index scale (documented in confettiUtils.ts)
export const Z_INDEX = {
  BACKGROUND_PARTICLES: 1000,
  MIDGROUND_PARTICLES: 2000,
  FOREGROUND_PARTICLES: 3000,
  CELEBRATION_OVERLAY: 9000,
  CINEMATIC_PLAYER: 9999,
} as const;

fireConfetti({
  ...config,
  zIndex: Z_INDEX.BACKGROUND_PARTICLES, // Explicit layer
});
```

**Warning signs:** Particles appear in wrong order, UI elements obscured by effects

### Pitfall 5: Remotion Composition Bloat

**What goes wrong:** Victory cinematic is 10MB video file → slow load, poor UX
**Why it happens:** Using raster assets instead of vector/procedural animations
**How to avoid:**
- Use SVG animations, not video files
- Leverage Remotion's React rendering (code-based, not video)
- Keep compositions under 2s for level victories (longer OK for boss defeats)

**Example:**
```typescript
// GOOD: Procedural Remotion composition (renders in browser, no file size)
const VictoryCinematic: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      {/* SVG fireworks (procedural) */}
      <FireworksBurst frame={frame} count={8} />

      {/* Text with spring animation */}
      <spring.div style={{ scale: springValue }}>
        VICTORY!
      </spring.div>
    </AbsoluteFill>
  );
};

// BAD: Exporting as MP4 and serving statically
// (increases bundle size, requires video download)
```

**Warning signs:** Slow cinematic load, high network usage, delayed celebrations

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed particle counts | Adaptive budgets (30/60/100) | Phase 26 (2026-01-30) | 60fps maintained on mobile |
| Unlimited confetti | Device-aware limits | Phase 26 (2026-01-30) | No frame drops on low-end devices |
| jQuery animations | Framer Motion + canvas-confetti | 2024-2025 | GPU-accelerated, declarative API |
| Flash/GIF animations | Remotion (React-based video) | Phase 30 (2026-01-31) | Code-based, skip support, accessibility |
| Ignoring reduced-motion | `prefers-reduced-motion` required | WCAG 2.1 (2018) | Accessibility compliance |

**Deprecated/outdated:**
- **tsParticles v2.x:** Replaced by v3.x (improved performance, smaller bundle)
- **Lottie for game juice:** Heavy (100KB+), use CSS + Framer Motion instead
- **Video files for cinematics:** Use Remotion compositions (code-based, lighter)

---

## Open Questions

### For Planning Phase

1. **10+ combo threshold:** Should it be exactly 10, or scale (10/15/20 milestones)?
   - **Recommendation:** Use milestone system (10/15/20) with increasing intensity

2. **Victory vs Boss Defeat cinematics:** Different compositions or shared with props?
   - **Recommendation:** Shared composition with variants (less code duplication)

3. **Particle budget for full-screen celebrations:** 60% or 100% of device max?
   - **Recommendation:** 80% for 10-combo, 100% for 20+ (save margin for gameplay particles)

4. **Defeat cinematics tone:** Dark/somber or encouraging retry?
   - **Recommendation:** Encouraging (show progress, unlock hints, "You almost had it!")

5. **Celebration audio:** Should all visual effects have sound counterparts?
   - **Recommendation:** Yes, but respect mute state (use existing `useSoundEffects` context)

### Technical Decisions Needed

1. **Z-index scale enforcement:** Centralized constant or per-component?
   - **Recommendation:** Centralized in `confettiUtils.ts` (single source of truth)

2. **Celebration queue vs batching:** Show sequentially or combine into one modal?
   - **Recommendation:** Queue for different celebration types, batch for same type (3 achievements → "3 new achievements!")

3. **Remotion composition strategy:** One large composition or modular sequences?
   - **Recommendation:** Modular (reuse fireworks, text, stats across victory/defeat)

---

## Code Examples

### Layered Confetti Implementation

```typescript
// utils/confettiUtils.ts - Add to existing file

import { useParticleBudget } from '@/hooks/useParticleBudget';
import { fireConfetti, NEO_BRUTALIST_COLORS } from '@/utils/confettiUtils';

export const Z_INDEX = {
  BACKGROUND_PARTICLES: 1000,
  MIDGROUND_PARTICLES: 2000,
  FOREGROUND_PARTICLES: 3000,
  CELEBRATION_OVERLAY: 9000,
  CINEMATIC_PLAYER: 9999,
} as const;

/**
 * Layered full-screen celebration for major milestones
 *
 * @param duration - Duration in ms (2000-3000 recommended)
 * @param budget - Particle budget from useParticleBudget()
 */
export function fireLayeredCelebration(
  duration: number,
  budget: ReturnType<typeof useParticleBudget>
) {
  const totalParticles = Math.floor(budget.combo * 0.8);

  // Layer 1: Background (20%, slow, large)
  fireConfetti({
    particleCount: Math.floor(totalParticles * 0.2),
    spread: 360,
    origin: { x: 0.5, y: 0.3 },
    colors: ['#FFE135', '#BFFF00'],
    scalar: 2.0,
    gravity: 0.5,
    ticks: 200,
    zIndex: Z_INDEX.BACKGROUND_PARTICLES,
  });

  // Layer 2: Mid-ground (60%, main burst)
  setTimeout(() => {
    fireConfetti({
      particleCount: Math.floor(totalParticles * 0.6),
      spread: 120,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#FF1493', '#00FFFF', '#FF3366'],
      scalar: 1.4,
      gravity: 1.0,
      ticks: 150,
      zIndex: Z_INDEX.MIDGROUND_PARTICLES,
    });
  }, 100);

  // Layer 3: Foreground (20%, fast sparkles)
  setTimeout(() => {
    fireConfetti({
      particleCount: Math.floor(totalParticles * 0.2),
      spread: 90,
      origin: { x: 0.5, y: 0.6 },
      colors: ['#FFFFFF', '#FFE135'],
      scalar: 0.8,
      gravity: 1.5,
      ticks: 100,
      zIndex: Z_INDEX.FOREGROUND_PARTICLES,
      startVelocity: 60,
    });
  }, 200);
}
```

### Victory Cinematic Component (Remotion)

```typescript
// components/adventure/cinematics/VictoryCinematic.tsx

import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring } from 'remotion';
import { useLanguage } from '@/contexts/LanguageContext';

interface VictoryCinematicProps {
  level: number;
  stars: number; // 1-3 star rating
  time: number;   // Completion time in seconds
}

export const VictoryCinematic: React.FC<VictoryCinematicProps> = ({
  level,
  stars,
  time,
}) => {
  const { t } = useLanguage();
  const frame = useCurrentFrame();

  // Spring animation for victory text
  const textScale = spring({
    frame: frame - 30,
    fps: 30,
    config: {
      damping: 12,
      mass: 0.5,
      stiffness: 200,
    },
  });

  return (
    <AbsoluteFill className="bg-neo-navy flex items-center justify-center">
      {/* Sequence 1: Fireworks (0-3s) */}
      <Sequence from={0} durationInFrames={90}>
        <FireworksBurstAnimation count={8} />
      </Sequence>

      {/* Sequence 2: Victory text (1-8s) */}
      <Sequence from={30} durationInFrames={210}>
        <div
          style={{
            transform: `scale(${textScale})`,
            fontSize: '80px',
            fontWeight: 900,
            color: '#FFE135',
            textShadow: '4px 4px 0px black',
          }}
        >
          {t('adventure.victory.title')}
        </div>
      </Sequence>

      {/* Sequence 3: Stars (2-8s) */}
      <Sequence from={60} durationInFrames={180}>
        <StarRatingAnimation stars={stars} />
      </Sequence>

      {/* Sequence 4: Stats (3-8s) */}
      <Sequence from={90} durationInFrames={150}>
        <StatsDisplay level={level} time={time} />
      </Sequence>
    </AbsoluteFill>
  );
};

// Register composition
export const VICTORY_COMPOSITION = {
  component: VictoryCinematic,
  durationInFrames: 240, // 8 seconds at 30fps
  fps: 30,
  width: 1280,
  height: 720,
};
```

### Combo Milestone Celebration Hook

```typescript
// hooks/useComboMilestone.ts

import { useState, useCallback } from 'react';
import { useParticleBudget } from './useParticleBudget';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { fireLayeredCelebration } from '@/utils/confettiUtils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

interface MilestoneConfig {
  threshold: number;
  label: string;
  duration: number;
}

const MILESTONES: MilestoneConfig[] = [
  { threshold: 10, label: 'INCREDIBLE!', duration: 2000 },
  { threshold: 15, label: 'UNSTOPPABLE!', duration: 2500 },
  { threshold: 20, label: 'LEGENDARY!', duration: 3000 },
];

export function useComboMilestone() {
  const [currentMilestone, setCurrentMilestone] = useState<MilestoneConfig | null>(null);
  const budget = useParticleBudget();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { playComboMilestone } = useSoundEffects();

  const checkMilestone = useCallback((combo: number) => {
    const milestone = MILESTONES.findLast(m => combo >= m.threshold);

    if (milestone && milestone !== currentMilestone) {
      setCurrentMilestone(milestone);

      // Sound effect
      playComboMilestone();

      if (!prefersReducedMotion) {
        // Visual celebration
        fireLayeredCelebration(milestone.duration, budget);

        // Screen flash
        document.body.classList.add('combo-flash');
        setTimeout(() => {
          document.body.classList.remove('combo-flash');
        }, 300);
      } else {
        // Reduced motion: Just flash, no particles
        document.body.classList.add('flash-feedback');
        setTimeout(() => {
          document.body.classList.remove('flash-feedback');
        }, 100);
      }

      // Clear milestone after duration
      setTimeout(() => setCurrentMilestone(null), milestone.duration);
    }
  }, [currentMilestone, budget, prefersReducedMotion, playComboMilestone]);

  return {
    currentMilestone,
    checkMilestone,
  };
}
```

---

## Sources

### Primary (HIGH confidence)
- Existing codebase:
  - `utils/confettiUtils.ts` - Neo-brutalist confetti presets, particle reduction
  - `hooks/useParticleBudget.ts` - Device-aware budgets (30/60/100)
  - `hooks/usePrefersReducedMotion.ts` - Accessibility hook
  - `components/celebration/NewYearFireworks.tsx` - Fireworks implementation
  - `components/adventure/boss/cinematics/CinematicPlayer.tsx` - Remotion Player
  - `hooks/useCinematic.ts` - Cinematic state management
- [canvas-confetti npm](https://www.npmjs.com/package/canvas-confetti) - Particle library
- [Remotion Docs](https://www.remotion.dev/docs) - Video composition API
- [Framer Motion Docs](https://www.framer.com/motion/) - Animation library

### Secondary (MEDIUM confidence)
- Phase 26 Research (26-RESEARCH.md) - Particle budgets, game juice patterns
- Phase 27 Research (27-RESEARCH.md) - 60fps performance techniques
- Phase 30 Research (30-RESEARCH.md) - Remotion cinematics architecture
- Phase 31 Research (31-RESEARCH.md) - Achievement confetti integration

### Tertiary (LOW confidence)
- [Game Juice Best Practices](https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design) - Celebration patterns
- [Particle System Performance](https://github.com/simeydotme/sparticles) - Optimization techniques

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already integrated and tested
- Architecture: HIGH - Extends proven patterns from Phase 26/30
- Pitfalls: MEDIUM - Based on general performance/accessibility research

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable stack, proven patterns)

**Dependencies:**
- Phase 26: Meta-Progression Foundation (particle budgets, game juice)
- Phase 27: Dynamic Board Mechanics (60fps performance patterns)
- Phase 30: Boss Battle Overhaul (Remotion cinematics, useCinematic hook)
- Phase 31: Skill Tree & Progression Depth (achievement confetti)
