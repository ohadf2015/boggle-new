# Phase 2: Core Game Juice - Research

**Researched:** 2026-01-22
**Domain:** Game animation, Framer Motion, SVG path animation, performance optimization
**Confidence:** HIGH

## Summary

Phase 2 focuses on adding responsive animations that make every player action feel satisfying and immediate. The research covers trail animations, letter pop effects, score popups, and performance optimization for 60fps gameplay.

**Key Finding**: Your codebase already has sophisticated animation infrastructure in place. Components like `WordPathTrail` and `ScorePopupFly` demonstrate production-ready patterns for game juice. The challenge is integration and polish, not building from scratch.

**Primary recommendation:** Build on existing patterns. Use `WordPathTrail` as foundation for ADV-04, extend `ScorePopupFly` for ADV-06, and follow established performance patterns from `useDevicePerformance` hook.

## Standard Stack

The established libraries/tools for game animation in React/Next.js:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Framer Motion | 12.23.24 | Declarative animation API, spring physics, gesture handling | Industry standard for React animations, built-in accessibility, excellent performance |
| React 19 | 19.2.0 | Component rendering, hooks for animation state | Native support in Remotion 4.0.381, concurrent rendering benefits |
| GSAP | 3.14.2 | Timeline-based sequences, complex easing | Best for coordinated multi-element animations, fallback for complex cases |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwindcss-animate | 1.0.7 | Pre-built CSS animations | Simple state transitions, reduced-motion fallbacks |
| SVG (native) | - | Path drawing, vector graphics | Trail rendering, particle effects |

### Already Installed (No New Dependencies)
Your codebase has everything needed:
- ✅ Framer Motion 12.23.24
- ✅ GSAP 3.14.2
- ✅ Existing animation utilities (`useDevicePerformance`, `MotionConfigProvider`)
- ✅ Tailwind animation extensions

**Installation:**
```bash
# No new packages needed - all dependencies present
```

## Architecture Patterns

### Recommended Project Structure
```
components/
├── animations/          # Already exists - extend here
│   ├── WordPathTrail.tsx         # ✅ EXISTS (ADV-04 foundation)
│   ├── ScorePopupFly.tsx         # ✅ EXISTS (ADV-06 foundation)
│   ├── LetterPopAnimation.tsx    # NEW (ADV-05)
│   └── index.ts
├── grid/                # Grid interaction hooks
│   ├── useGridInteraction.ts
│   └── performanceUtils.ts
└── game/
    └── in-game/
        └── components/
            └── LandscapeLayout.tsx    # Integration point

hooks/
└── useDevicePerformance.ts      # ✅ EXISTS (performance detection)

contexts/
├── AccessibilityContext.tsx     # ✅ EXISTS (reduced motion)
└── MotionConfigProvider.tsx     # ✅ EXISTS (Framer Motion config)
```

### Pattern 1: SVG Path Trail Animation

**What:** Draw effect for word selection trail that connects tiles as user drags
**When to use:** Real-time feedback during letter selection (ADV-04)
**Existing implementation:** `components/animations/WordPathTrail.tsx`

**Example (from your codebase):**
```typescript
// Source: components/animations/WordPathTrail.tsx (lines 178-198)
<motion.path
  d={pathString}
  fill="none"
  stroke={trailColor}
  strokeWidth={thickness}
  strokeLinecap="round"
  strokeLinejoin="round"
  filter={shouldShowGlow ? 'url(#trail-glow)' : undefined}
  initial={{ pathLength: 0, opacity: 0 }}
  animate={{
    pathLength: 1,
    opacity: isSubmitFlashing ? [1, 0.5, 1] : 0.9,
    strokeWidth: isSubmitFlashing ? [thickness, thickness * 2, thickness] : thickness,
  }}
  transition={{
    pathLength: { duration: 0.15, ease: 'easeOut' },
    opacity: isSubmitFlashing ? { duration: 0.4 } : { duration: 0.1 },
  }}
/>
```

**Key properties:**
- `pathLength`: Animates from 0→1 for draw effect
- `pathOffset`: Controls starting position on path
- Smooth quadratic curves (`Q` command) for natural feel
- Separate glow layer for depth (high-end devices only)

**Performance notes:**
- SVG filter effects disabled on low-end devices
- Particle effects conditional on `enableComplexAnimations`
- Uses `will-change` implicitly via Framer Motion

### Pattern 2: Spring Physics for Letter Bounce

**What:** Natural bounce when letters are selected/deselected
**When to use:** Tile interaction feedback (ADV-05)
**Foundation:** Framer Motion spring transitions

**Example (recommended approach):**
```typescript
// Spring physics for natural bounce
<motion.div
  animate={{
    scale: isSelected ? 1.1 : 1,
    rotate: isSelected ? [0, -2, 2, 0] : 0,
  }}
  transition={{
    type: "spring",
    stiffness: 300,  // Quick response
    damping: 20,     // Slight overshoot
    mass: 0.5,       // Light feel
  }}
/>
```

**Spring parameters for game feel:**
- **Stiffness 200-300**: Responsive without being jarring
- **Damping 15-25**: Slight bounce, not oscillating
- **Mass 0.5-1**: Lighter = punchier, heavier = more deliberate
- **Duration 150-250ms**: Sweet spot for UI micro-interactions

**Source:** Based on [Best Practices with Framer Motion and React Spring](https://www.ruixen.com/blog/react-anim-framer-spring) and [The physics behind spring animations](https://blog.maximeheckel.com/posts/the-physics-behind-spring-animations/)

### Pattern 3: Score Popup with Arc Trajectory

**What:** Floating score indicator that flies to score counter
**When to use:** Valid word submission (ADV-06)
**Existing implementation:** `components/animations/ScorePopupFly.tsx`

**Example (from your codebase):**
```typescript
// Source: components/animations/ScorePopupFly.tsx (lines 158-179)
animate={
  flyToTarget
    ? {
        x: ['-50%', '-50%', `${targetPos.x - popup.x - 20}px`],
        y: ['-50%', '-70%', `${targetPos.y - popup.y}px`],
        scale: [0, 1.3, 1, 0.6],
        opacity: [0, 1, 1, 0],
      }
    : {
        x: '-50%',
        y: ['-50%', '-100%'],
        scale: [0, 1.2, 1],
        opacity: [0, 1, 1, 0],
      }
}
transition={{
  duration: duration / 1000,
  times: flyToTarget ? [0, 0.2, 0.7, 1] : [0, 0.3, 0.5, 1],
  ease: [0.25, 0.1, 0.25, 1],
}}
```

**Key features:**
- Array keyframes for arc trajectory
- `times` array synchronizes keyframes
- Cubic bezier easing for natural acceleration
- Target position calculated from ref

**Combo multiplier integration:**
- Show bonus indicator (`2x`, `3x`) alongside score
- Color changes based on combo level (use `getComboColors` utility)
- Sparkle particles on high-end devices

### Pattern 4: Adaptive Performance

**What:** Device-aware animation quality
**When to use:** All animations (maintain 60fps target)
**Existing implementation:** `hooks/useDevicePerformance.ts`

**Example (from your codebase):**
```typescript
// Source: hooks/useDevicePerformance.ts (lines 189-221)
export function useDevicePerformance(): DevicePerformanceConfig {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionPreference,
    () => false
  );

  const capabilities = useMemo(() => detectDeviceCapabilities(), []);

  return useMemo(() => {
    if (prefersReducedMotion) {
      return {
        ...capabilities,
        prefersReducedMotion: true,
        enableComplexAnimations: false,
        enableGlowEffects: false,
        reduceParticles: true,
        maxParticles: 0,
      };
    }
    return { ...capabilities, prefersReducedMotion: false };
  }, [capabilities, prefersReducedMotion]);
}
```

**Usage pattern:**
```typescript
const { isLowEnd, enableGlowEffects, prefersReducedMotion } = useDevicePerformance();

// Conditional rendering based on capabilities
if (prefersReducedMotion) {
  return <SimpleStaticFeedback />;
}

return (
  <motion.div
    animate={enableGlowEffects ? glowAnimation : simpleAnimation}
  />
);
```

**Device tiers:**
- **Low-end**: 30fps target, no particles, no glow effects
- **Mid-range**: 60fps, limited particles (8 max), glow effects enabled
- **High-end**: 60fps, full particles (20 max), all effects

### Pattern 5: RTL (Hebrew) Support

**What:** Mirror horizontal animations for right-to-left languages
**When to use:** Trail direction, score popup placement, any X-axis animation
**Foundation:** CSS logical properties + Tailwind direction utilities

**Example:**
```typescript
// Shadow auto-flips in RTL
const shadowClass = "shadow-hard";  // 4px 4px → -4px 4px in RTL

// Manual RTL handling for custom animations
const direction = document.dir === 'rtl' ? -1 : 1;
const xOffset = 50 * direction;

<motion.div
  animate={{ x: xOffset }}  // Flips sign in RTL
/>
```

**Tailwind RTL classes (already configured):**
- `ltr:shadow-hard` / `rtl:shadow-hard-rtl`
- Use logical properties: `ms-4` (margin-inline-start) instead of `ml-4`
- Trail paths automatically flip with CSS transforms

### Anti-Patterns to Avoid

**❌ Animating layout properties directly:**
```typescript
// BAD - triggers layout recalculation
<motion.div animate={{ width: 300, height: 200 }} />
```
```typescript
// GOOD - use transforms
<motion.div animate={{ scale: 1.2 }} />
```

**❌ Synchronous path updates:**
```typescript
// BAD - recalculates path on every mousemove
onMouseMove={(e) => {
  setPathPoints([...pathPoints, { x: e.clientX, y: e.clientY }]);
}}
```
```typescript
// GOOD - throttle with RAF (your codebase does this)
const throttledUpdate = useCallback(
  createAdaptiveThrottle({ targetFPS: 60, throttleMs: 16 })(updatePath),
  []
);
```

**❌ Hardcoded directions:**
```typescript
// BAD - breaks in RTL
<motion.div animate={{ x: 100 }} />
```
```typescript
// GOOD - direction-aware
const direction = useDirection(); // 1 or -1
<motion.div animate={{ x: 100 * direction }} />
```

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path smoothing algorithm | Custom bezier/spline | Framer Motion's path interpolation | Handles edge cases, optimized, works with SVG |
| Device capability detection | Navigator checks | `useDevicePerformance` hook (existing) | Comprehensive, tested, accounts for memory/cores/connection |
| Reduced motion detection | `matchMedia` listener | `MotionConfigProvider` (existing) | SSR-safe, reactive, integrates with Framer Motion |
| Spring physics calculations | Manual easing functions | Framer Motion `type: "spring"` | Physically accurate, velocity-aware, consistent |
| GPU acceleration hints | Manual `will-change` | Let Framer Motion handle it | Knows when to apply/remove, avoids memory issues |
| Animation sequencing | setTimeout chains | GSAP Timeline or Framer Motion variants | Declarative, pauseable, reversible |

**Key insight:** Your codebase already solves most animation infrastructure problems. Focus on composition, not re-implementation.

## Common Pitfalls

### Pitfall 1: Layout Thrashing from Animation

**What goes wrong:** Animating properties that trigger layout recalculation (width, height, top, left) causes janky 30fps instead of smooth 60fps

**Why it happens:** Browser must recalculate entire layout on every frame

**How to avoid:**
- Animate `transform` (scale, translate, rotate) instead of size/position
- Use `opacity` instead of `display` or `visibility`
- If layout animation needed, use Framer Motion's `layout` prop with `layoutId`

**Warning signs:**
- FPS drops during animation
- "Forced reflow" warnings in Chrome DevTools
- Animation stutters on mobile

**Example:**
```typescript
// BAD - layout thrashing
<motion.div animate={{ width: 200 }} />

// GOOD - composited animation
<motion.div animate={{ scaleX: 1.5 }} />
```

**Source:** [CSS GPU Animation: Doing It Right — Smashing Magazine](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/)

### Pitfall 2: Overusing `will-change`

**What goes wrong:** Adding `will-change: transform` to too many elements causes memory bloat and crashes on mobile

**Why it happens:** `will-change` tells browser to keep layer in GPU memory indefinitely. Dozens of layers = OOM crash

**How to avoid:**
- Let Framer Motion manage `will-change` automatically
- If manual, add only during animation, remove after
- Limit to 5-10 simultaneous animated elements max

**Warning signs:**
- App crashes on older phones
- Memory usage spikes during gameplay
- Battery drains faster

**Example:**
```typescript
// BAD - permanent GPU memory reservation
<div style={{ willChange: 'transform' }}>

// GOOD - Let Framer Motion handle it
<motion.div animate={{ scale: 1.2 }}>  // will-change added/removed automatically
```

**Source:** [CSS GPU Acceleration: will-change & translate3d Guide](https://www.lexo.ch/blog/2025/01/boost-css-performance-with-will-change-and-transform-translate3d-why-gpu-acceleration-matters/)

### Pitfall 3: Ignoring Reduced Motion

**What goes wrong:** Users with vestibular disorders experience nausea/discomfort from animations

**Why it happens:** Forgetting to check `prefers-reduced-motion` media query or `prefersReducedMotion` from hook

**How to avoid:**
- Use `MotionConfigProvider` (already in codebase) to disable all animations globally
- For critical animations, provide static alternative
- Test with reduced motion enabled: System Settings → Accessibility → Display → Reduce Motion

**Warning signs:**
- Accessibility audit failures
- User complaints about motion sickness
- Animations ignore system settings

**Example:**
```typescript
// BAD - no reduced motion handling
<motion.div animate={{ x: 100 }} />

// GOOD - respects user preference (your codebase pattern)
const { prefersReducedMotion } = useDevicePerformance();
if (prefersReducedMotion) {
  return <div className="opacity-80">Selected</div>;
}
return <motion.div animate={{ x: 100 }} />;
```

**Source:** [Create accessible animations in React — Guide | Motion](https://motion.dev/docs/react-accessibility)

### Pitfall 4: Trail Path Not Following Touch Accurately

**What goes wrong:** SVG trail lags behind finger or jumps erratically

**Why it happens:**
- Not throttling touch events (firing 100+ times/sec)
- Using absolute positioning instead of event coordinates
- Path points not relative to container

**How to avoid:**
- Throttle to 60fps with `requestAnimationFrame`
- Calculate positions relative to grid container bounds
- Use smooth curves (quadratic/bezier) between points

**Warning signs:**
- Trail "catches up" after finger stops
- Visible jagged lines instead of smooth curves
- Performance warnings in DevTools

**Example (your codebase already does this correctly):**
```typescript
// GOOD - from WordPathTrail.tsx
const pathString = useMemo(() => {
  if (points.length < 2) return '';
  const [first, ...rest] = points;
  let path = `M ${first.x} ${first.y}`;

  for (let i = 0; i < rest.length; i++) {
    const current = rest[i];
    const prev = i === 0 ? first : rest[i - 1];
    // Quadratic curve for smoothing
    const cpX = (prev.x + current.x) / 2;
    const cpY = (prev.y + current.y) / 2;
    path += ` Q ${prev.x} ${prev.y} ${cpX} ${cpY}`;
  }
  return path;
}, [points]);
```

### Pitfall 5: Score Popup Overlapping/Clutter

**What goes wrong:** Multiple score popups stack on top of each other, unreadable

**Why it happens:** Creating popup for every tile selected instead of per-word

**How to avoid:**
- Only show score popup on valid word submission (not per-letter)
- Queue popups if multiple words submitted rapidly
- Clear previous popup before showing next

**Warning signs:**
- Screen filled with "+5 +3 +7" overlapping
- Score numbers unreadable
- User can't see board during combo

**Example:**
```typescript
// BAD - popup per letter
onCellSelect={(letter) => {
  showScorePopup(3); // Spam!
}}

// GOOD - popup per word (your codebase pattern)
onWordSubmit={(word, score) => {
  setCurrentPopup({ id: Date.now(), value: score, ... });
}}
```

## Code Examples

Verified patterns from official sources and your codebase:

### Example 1: SVG Path Drawing (ADV-04)

```typescript
// Based on existing WordPathTrail.tsx and official docs
// Source: https://motion.dev/docs/react-svg-animation

interface PathPoint {
  x: number;
  y: number;
  timestamp: number;
}

function SelectionTrail({ points }: { points: PathPoint[] }) {
  const pathString = useMemo(() => {
    if (points.length < 2) return '';
    // M = Move to first point
    // Q = Quadratic curve to smooth corners
    const [first, ...rest] = points;
    let path = `M ${first.x} ${first.y}`;

    for (let i = 0; i < rest.length; i++) {
      const curr = rest[i];
      const prev = i === 0 ? first : rest[i - 1];
      const cpX = (prev.x + curr.x) / 2;
      const cpY = (prev.y + curr.y) / 2;
      path += ` Q ${prev.x} ${prev.y} ${cpX} ${cpY}`;
    }
    return path;
  }, [points]);

  return (
    <svg className="absolute inset-0 pointer-events-none">
      <motion.path
        d={pathString}
        fill="none"
        stroke="#00FFFF"  // neo-cyan
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.9 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      />
    </svg>
  );
}
```

### Example 2: Letter Pop Animation (ADV-05)

```typescript
// Spring physics for natural bounce
// Source: https://www.framer.com/motion/transition/

function AnimatedTile({
  letter,
  isSelected,
  comboLevel
}: {
  letter: string;
  isSelected: boolean;
  comboLevel: number;
}) {
  const { prefersReducedMotion } = useDevicePerformance();

  if (prefersReducedMotion) {
    return (
      <div className={cn(
        "tile-base",
        isSelected && "bg-neo-cyan scale-110"
      )}>
        {letter}
      </div>
    );
  }

  return (
    <motion.div
      className="tile-base"
      animate={{
        scale: isSelected ? 1.1 : 1,
        rotate: isSelected ? [0, -2, 2, 0] : 0,
        backgroundColor: isSelected ? '#00FFFF' : '#1a1a2e',
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
        mass: 0.5,
      }}
      whileTap={{ scale: 0.95 }}
    >
      {letter}
    </motion.div>
  );
}
```

### Example 3: Score Popup with Combo (ADV-06)

```typescript
// Arc trajectory to score counter
// Based on existing ScorePopupFly.tsx

function ScorePopup({
  score,
  comboMultiplier,
  startPos,
  targetRef
}: {
  score: number;
  comboMultiplier?: number;
  startPos: { x: number; y: number };
  targetRef: React.RefObject<HTMLElement>;
}) {
  const targetPos = useMemo(() => {
    if (!targetRef.current) return { x: 0, y: 60 };
    const rect = targetRef.current.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, [targetRef]);

  return (
    <motion.div
      className="fixed pointer-events-none z-[150]"
      style={{ left: startPos.x, top: startPos.y }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        x: ['-50%', '-50%', `${targetPos.x - startPos.x}px`],
        y: ['-50%', '-70%', `${targetPos.y - startPos.y}px`],
        scale: [0, 1.3, 1, 0.6],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 1,
        times: [0, 0.2, 0.7, 1],
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-neo border-3 border-neo-black shadow-hard bg-neo-lime">
        <span className="font-black text-neo-black text-lg">+{score}</span>
        {comboMultiplier && comboMultiplier > 1 && (
          <span className="text-neo-orange font-black text-sm">
            {comboMultiplier}x
          </span>
        )}
      </div>
    </motion.div>
  );
}
```

### Example 4: Performance-Aware Rendering

```typescript
// Adaptive quality based on device
// Source: Your existing useDevicePerformance.ts

function AnimatedGrid() {
  const {
    isLowEnd,
    enableGlowEffects,
    enableComplexAnimations,
    prefersReducedMotion
  } = useDevicePerformance();

  return (
    <div className="grid-container">
      {/* Always show trail, but simplify on low-end */}
      <SelectionTrail
        points={pathPoints}
        showGlow={enableGlowEffects}
        showParticles={enableComplexAnimations}
      />

      {/* Letter animations */}
      {tiles.map((tile) => (
        <AnimatedTile
          key={tile.id}
          {...tile}
          animationQuality={
            prefersReducedMotion ? 'none' :
            isLowEnd ? 'simple' : 'full'
          }
        />
      ))}

      {/* Score popups - skip sparkles on low-end */}
      {scorePopup && (
        <ScorePopup
          {...scorePopup}
          showSparkles={!isLowEnd && enableComplexAnimations}
        />
      )}
    </div>
  );
}
```

## State of the Art

Current best practices in React game animation (2026):

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS transitions | Framer Motion declarative API | 2020-2021 | Better composition, gesture handling, React integration |
| `will-change` everywhere | Let Framer Motion manage it | 2022-2023 | Prevents memory leaks, better mobile performance |
| Fixed 60fps animations | Adaptive performance tiers | 2023-2024 | Wider device support, better battery life |
| Ignore reduced motion | Built-in accessibility | 2021-2022 (WCAG 2.1) | Legal compliance, better UX for vestibular disorders |
| Animate all properties | Transform/opacity only | 2018-2019 | GPU acceleration, 60fps on mobile |
| Duration-based springs | Physics-based springs | Framer Motion 11+ (2024) | More natural feel, velocity-aware |

**Deprecated/outdated:**
- **React Spring**: Still maintained but Framer Motion has better DX and performance
- **Anime.js**: No React integration, manually manage refs
- **CSS `transition-timing-function`**: Use Framer Motion springs instead for natural feel
- **jQuery animations**: Obviously don't use this in React

**Current standard (2026):**
- Framer Motion for all declarative animations
- GSAP for complex timeline sequences (already in your stack)
- Native CSS transforms for simple hover states
- Container queries over viewport units (your codebase uses this)

## Open Questions

Things that couldn't be fully resolved and need validation during planning:

1. **Combo Visual Escalation**
   - What we know: Combo level already tracked, colors defined in `getComboColors`
   - What's unclear: Should trail thickness increase with combo? Should glow intensity scale?
   - Recommendation: Start with color changes only, measure if users notice combos

2. **RTL Trail Direction**
   - What we know: Tailwind shadows auto-flip, `direction` CSS property exists
   - What's unclear: Should trail direction match reading direction (right-to-left) or stay natural (follow finger)?
   - Recommendation: Test with Hebrew users, likely follow finger regardless of text direction

3. **Score Popup Timing with Rapid Submissions**
   - What we know: `ScorePopupFly` has 1s duration default
   - What's unclear: If user submits 3 words in 1 second, queue popups or show simultaneous?
   - Recommendation: Queue with slight stagger (0.2s offset) to avoid clutter

4. **Animation Performance Budget**
   - What we know: BundleWatch limits 250KB JS, Lighthouse CI requires 90+ performance
   - What's unclear: Does adding animation components risk exceeding bundle budget?
   - Recommendation: Code-split animations with `dynamic()` if needed, measure impact

5. **Fire Round Interaction with Trail**
   - What we know: `fireRoundActive` prop exists in GridComponent
   - What's unclear: Should trail color/effect change during fire round?
   - Recommendation: Consistent trail color (don't distract), but check if fire round lights interfere with visibility

6. **Keyboard Input Trail**
   - What we know: `keyboardTrailsUtils.ts` exists for keyboard word formation
   - What's unclear: Should keyboard-formed words show trail animation?
   - Recommendation: Yes, but synthetic path (tile centers), not actual key positions

## Sources

### Primary (HIGH confidence)
- [Framer Motion Official Docs - SVG Animation](https://motion.dev/docs/react-svg-animation) - Authoritative API reference
- [Framer Motion Official Docs - Transitions](https://www.framer.com/motion/transition/) - Spring physics parameters
- [Framer Motion Official Docs - Accessibility](https://motion.dev/docs/react-accessibility) - Reduced motion patterns
- Context: Your existing codebase (`WordPathTrail.tsx`, `ScorePopupFly.tsx`, `useDevicePerformance.ts`) - Production-tested patterns

### Secondary (MEDIUM confidence)
- [Best Practices with Framer Motion and React Spring](https://www.ruixen.com/blog/react-anim-framer-spring) - Performance guidelines (2024-2025)
- [The physics behind spring animations - Maxime Heckel](https://blog.maximeheckel.com/posts/the-physics-behind-spring-animations/) - Spring parameter tuning
- [CSS GPU Animation: Doing It Right — Smashing Magazine](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/) - GPU acceleration best practices
- [CSS GPU Acceleration: will-change Guide](https://www.lexo.ch/blog/2025/01/boost-css-performance-with-will-change-and-transform-translate3d-why-gpu-acceleration-matters/) - will-change pitfalls

### Tertiary (LOW confidence)
- [How to Animate SVG Paths with Framer Motion - Blog](https://blog.noelcserepy.com/how-to-animate-svg-paths-with-framer-motion) - Tutorial (needs verification with official docs)
- WebSearch results for spring physics (various blog posts) - Cross-referenced with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies verified in package.json, existing implementations found
- Architecture: HIGH - Patterns extracted from production code, consistent with official recommendations
- Pitfalls: HIGH - Based on known issues from Smashing Magazine, official docs, and codebase patterns

**Research date:** 2026-01-22
**Valid until:** 60 days (stable domain, Framer Motion API stable since v11)

**Key takeaway:** Your codebase is ahead of most React game projects. The animation infrastructure exists and follows best practices. Phase 2 success depends on composition and polish, not reinventing solutions.
