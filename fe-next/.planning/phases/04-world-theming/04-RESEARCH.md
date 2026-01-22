# Phase 4: World Theming - Research

**Researched:** 2026-01-22
**Domain:** Parallax backgrounds, particle systems, tile theming, performance optimization
**Confidence:** HIGH (existing infrastructure heavily informs implementation)

## Summary

This phase extends the existing adventure theming system with parallax backgrounds, particle effects, and enhanced board styling. The codebase already has substantial infrastructure in place:

- **WorldTheme type system** with ParallaxLayer, ParticleConfig, and TileStyleMap definitions
- **WorldBackground component** with basic parallax layers and CSS-based particle system
- **AdventureThemeContext** providing theme data to all adventure components
- **World 1-3 theme configurations** with placeholder layer/particle definitions
- **PlayfulBackground component** demonstrating gyroscope/gesture parallax pattern
- **useDevicePerformance hook** for adaptive rendering based on device capabilities

**Primary recommendation:** Enhance the existing WorldBackground component with gyroscope/gesture/ambient parallax, improve the CSS particle system for world-specific effects, and add board decoration styling to AdventureGrid tiles. All implementations must respect reduced-motion preferences and maintain 90+ Lighthouse scores.

## Standard Stack

The established libraries/tools for this phase:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Framer Motion | 11.x | Parallax transforms, gesture handling, spring animations | Already used throughout, excellent React integration |
| React | 19.x | Component architecture | Project foundation |
| Tailwind CSS | 3.4.x | Utility styling, animations | Project design system |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| GSAP | 3.x | Complex timeline animations | Level transitions, celebration sequences |
| canvas-confetti | 1.9.x | Particle bursts | Already used for celebrations - pattern available |

### Not Recommended for This Phase
| Instead of | Avoid | Reason |
|------------|-------|--------|
| Canvas particles | Three.js/WebGL | Overkill for 5-10 sparse particles; CSS/Framer Motion sufficient |
| Heavy particle libs | tsparticles, particles.js | Bundle size, complexity; sparse particles work fine with CSS |
| Custom gyroscope hook | New implementation | PlayfulBackground already demonstrates working pattern |

**Installation:** No new dependencies required. All needed libraries already in project.

## Architecture Patterns

### Recommended Enhancement Structure
```
components/adventure/
├── themed/
│   ├── WorldBackground.tsx        # ENHANCE: Add parallax hooks, world-specific particles
│   ├── WorldParticles.tsx         # NEW: Extract particle system with world-specific types
│   ├── ParallaxLayer.tsx          # NEW: Individual layer with motion transforms
│   ├── BoardFrame.tsx             # NEW: World-themed board container with decorations
│   └── ThemedTile.tsx             # ENHANCE: Add texture overlays, themed borders
├── AdventureGrid.tsx              # ENHANCE: Integrate BoardFrame, tile theming
└── AdventureGame.tsx              # No changes (already uses WorldBackground)

hooks/
├── useParallax.ts                 # NEW: Combined gyro/gesture/ambient parallax
└── useDevicePerformance.ts        # EXISTS: Use for adaptive particle counts

lib/adventure/themes/
├── world1.ts                      # ENHANCE: Real parallax layers, particle configs
├── world2.ts                      # ENHANCE: Real parallax layers, particle configs
├── world3.ts                      # ENHANCE: Real parallax layers, particle configs
└── types.ts                       # EXISTS: Already has all needed types
```

### Pattern 1: Parallax with Combined Input Sources
**What:** Single hook combining gyroscope, gesture, and ambient drift for "always alive" parallax
**When to use:** WorldBackground component for all parallax layers
**Example:**
```typescript
// Source: Existing PlayfulBackground.tsx pattern (lines 82-98)
// Combine gyroscope (mobile), gesture (touch/mouse), and ambient drift
function useParallax(options: ParallaxOptions) {
  const { prefersReducedMotion, isMobile, enableComplexAnimations } = useDevicePerformance();
  const [gyro, setGyro] = useState({ x: 0, y: 0 });
  const [gesture, setGesture] = useState({ x: 0, y: 0 });
  const [ambient, setAmbient] = useState({ x: 0, y: 0 });

  // Gyroscope for mobile (existing pattern from PlayfulBackground)
  useEffect(() => {
    if (!isMobile || prefersReducedMotion) return;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const x = ((e.gamma || 0) / 45) * options.intensity;
      const y = ((e.beta || 0) / 45) * options.intensity;
      setGyro({ x: clamp(x, -20, 20), y: clamp(y, -20, 20) });
    };
    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isMobile, prefersReducedMotion, options.intensity]);

  // Ambient drift (always on, subtle)
  useEffect(() => {
    if (prefersReducedMotion) return;
    let frame: number;
    const animate = (time: number) => {
      setAmbient({
        x: Math.sin(time * 0.0003) * 3,
        y: Math.cos(time * 0.0002) * 2,
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [prefersReducedMotion]);

  // Combined output (respects reduced motion)
  if (prefersReducedMotion) return { x: 0, y: 0 };
  return {
    x: gyro.x + gesture.x + ambient.x,
    y: gyro.y + gesture.y + ambient.y,
  };
}
```

### Pattern 2: CSS-Based Sparse Particle System
**What:** Framer Motion particles with CSS animations, world-specific shapes/colors
**When to use:** 5-10 visible particles per world (sparse, atmospheric)
**Example:**
```typescript
// Source: Existing WorldBackground.tsx ParticleSystem (lines 117-197)
// Enhanced with world-specific particle shapes
const WORLD_PARTICLES = {
  meadows: { type: 'butterfly', shape: 'ellipse', animation: 'flutter' },
  springs: { type: 'droplet', shape: 'teardrop', animation: 'fall-splash' },
  caverns: { type: 'crystal', shape: 'diamond', animation: 'sparkle-drift' },
};

// Sparse count (5-10) ensures performance
const particleCount = Math.min(particles.count, performance.maxParticles);
```

### Pattern 3: Board Decoration via CSS Layers
**What:** Texture overlays and themed borders using CSS pseudo-elements and gradients
**When to use:** Tile styling, board frame decoration
**Example:**
```typescript
// Source: Existing texture patterns in globals.css (lines 540-617)
// Extend with world-specific textures
const WORLD_TILE_TEXTURES = {
  meadows: {
    texture: 'wood-grain',
    border: 'vine',
    letterGlow: 'warm-sun',
  },
  springs: {
    texture: 'water-ripple',
    border: 'crystal',
    letterGlow: 'cool-water',
  },
  caverns: {
    texture: 'stone',
    border: 'crystal-edge',
    letterGlow: 'purple-crystal',
  },
};
```

### Anti-Patterns to Avoid
- **Canvas/WebGL for sparse particles:** Overkill, breaks GPU budget, hurts Lighthouse
- **Per-frame DOM updates:** Use CSS transforms, not style recalculation
- **Parallax on scroll:** Adventure game doesn't scroll; use device/gesture only
- **Blocking animations:** All parallax must use transform only (GPU-accelerated)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Device orientation handling | Custom gyroscope hook | Extract from PlayfulBackground.tsx | Already handles iOS permission, clamping, passive listeners |
| Adaptive particle counts | Fixed counts | useDevicePerformance.maxParticles | Already detects low-end devices, respects reduced motion |
| Spring animations | Custom easing | Framer Motion spring config | Established constants (stiffness 300-400, damping 20-30) |
| Reduced motion | Manual checks | useDevicePerformance.prefersReducedMotion | Already reactive to system changes |
| Particle shapes | CSS hacks | Existing pattern in ParticleSystem | Leaf shape, bubble shape already defined |
| Texture overlays | Background images | CSS pseudo-elements | texture-halftone pattern already exists |

**Key insight:** The codebase has 80% of needed infrastructure. Enhancement > creation.

## Common Pitfalls

### Pitfall 1: GPU Memory Exhaustion on Low-End Devices
**What goes wrong:** Too many parallax layers with will-change cause GPU memory pressure, janky scrolling
**Why it happens:** Each layer with transform gets its own compositor layer
**How to avoid:**
- Use useDevicePerformance.isLowEnd to reduce layers (3 vs 5)
- Remove will-change after initial animation completes
- Batch transforms into single parent element
**Warning signs:** Lighthouse "Avoid large layout shifts", janky parallax

### Pitfall 2: Particle Count Blowing Performance Budget
**What goes wrong:** 25-40 particles in theme configs overwhelm low-end devices
**Why it happens:** Theme configs define ideal counts, not adaptive counts
**How to avoid:**
- Cap actual rendered count: `Math.min(config.count, devicePerformance.maxParticles)`
- Use CSS animations with hardware acceleration
- Particles should be pointer-events: none
**Warning signs:** Lighthouse score < 90, visible frame drops

### Pitfall 3: iOS Gyroscope Permission Denied Silently
**What goes wrong:** Parallax feels "dead" on iOS Safari
**Why it happens:** iOS 13+ requires user permission for DeviceOrientationEvent
**How to avoid:**
- Request permission on first touch: `DeviceOrientationEvent.requestPermission()`
- Gracefully fallback to gesture-only parallax
- PlayfulBackground already handles this pattern
**Warning signs:** No gyroscope effect on iOS despite code existing

### Pitfall 4: Texture/Border CSS Specificity Wars
**What goes wrong:** World-specific styles don't apply, get overridden
**Why it happens:** Existing AdventureGrid tile styles have high specificity
**How to avoid:**
- Use CSS custom properties for theme values
- Apply via data attributes: `[data-world="meadows"]`
- ThemedTile component already uses theme context
**Warning signs:** Tiles don't change appearance when world changes

### Pitfall 5: Letter Readability Degraded by Theming
**What goes wrong:** Letters hard to read with texture overlays and colored borders
**Why it happens:** Theming prioritized over usability
**How to avoid:**
- Letters always have contrasting background (context decisions say "readability is priority")
- Texture opacity < 0.1
- Test all tile types (gold, ice, bomb, rainbow) in each world
**Warning signs:** User complaints, accessibility audit failures

## Code Examples

Verified patterns from official sources and existing codebase:

### Gyroscope Parallax (Existing Pattern)
```typescript
// Source: /components/ui/PlayfulBackground.tsx (lines 82-94)
useEffect(() => {
  if (prefersReducedMotion || !enableComplexAnimations || !isMobile) return;
  if (typeof DeviceOrientationEvent === 'undefined') return;

  const handleOrientation = (e: DeviceOrientationEvent) => {
    const x = ((e.gamma || 0) / 45) * 15 * intensityMultiplier;
    const y = ((e.beta || 0) / 45) * 15 * intensityMultiplier;
    setGyro({ x: Math.max(-20, Math.min(20, x)), y: Math.max(-20, Math.min(20, y)) });
  };

  window.addEventListener('deviceorientation', handleOrientation, { passive: true });
  return () => window.removeEventListener('deviceorientation', handleOrientation);
}, [prefersReducedMotion, enableComplexAnimations, isMobile, intensityMultiplier]);
```

### Framer Motion Parallax Transform
```typescript
// Source: /components/ui/PlayfulBackground.tsx (lines 189-200)
<motion.div
  className="absolute -top-32 -left-32 w-[500px] h-[500px]"
  style={{
    y: scrollY, // Not needed for adventure (no scroll)
    x: parallax.x * 0.5, // Depth factor
    scale: 1.2
  }}
/>
```

### Seeded Random for Deterministic Particles
```typescript
// Source: /components/adventure/themed/WorldBackground.tsx (lines 108-115)
function seededRandom(seed: number): () => number {
  let t = seed + 0x6D2B79F5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### Particle Shape via CSS (Existing Pattern)
```typescript
// Source: /components/adventure/themed/WorldBackground.tsx (lines 156-167)
const getParticleShape = (type: ParticleConfig['type']) => {
  switch (type) {
    case 'leaves':
      return 'rounded-[30%_70%_70%_30%_/_30%_30%_70%_70%]'; // Leaf shape
    case 'bubbles':
      return 'rounded-full';
    case 'sparkles':
      return 'rotate-45';
    default:
      return 'rounded-full';
  }
};
```

### Texture Overlay Pattern
```css
/* Source: /app/globals.css (lines 540-553) */
.texture-halftone {
  position: relative;
}
.texture-halftone::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--halftone-pattern);
  pointer-events: none;
  z-index: 1;
  border-radius: inherit;
}
```

### Device Performance Adaptive Rendering
```typescript
// Source: /hooks/useDevicePerformance.ts (lines 189-221)
const { isLowEnd, enableComplexAnimations, maxParticles, prefersReducedMotion } = useDevicePerformance();

// Use for conditional rendering
{enableComplexAnimations && <ParticleSystem count={Math.min(config.count, maxParticles)} />}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed particle counts | Adaptive via useDevicePerformance | Already in codebase | Prevents low-end device issues |
| Canvas-based particles | CSS/Framer Motion | Modern practice | Better Lighthouse scores |
| Scroll-based parallax | Gesture/gyro parallax | N/A (adventure specific) | No scroll in adventure mode |
| Separate motion/touch hooks | Combined useParallax | Needs implementation | Cleaner architecture |

**Deprecated/outdated:**
- Three.js for 2D particles: Overkill, breaks performance budget
- requestPermission() polyfills: Modern Safari handles natively

## Performance Requirements

### Lighthouse Budget
Per project constraints, all implementations must maintain:
- **Performance:** 90+
- **Accessibility:** 90+
- **Best Practices:** 90+

### Specific Limits
- **Image assets:** < 200KB each (per CLAUDE.md)
- **Particle count:** 5-10 visible max (per CONTEXT.md "sparse")
- **Parallax layers:** 3-5 depending on device capability
- **CSS animations:** transform/opacity only (GPU-accelerated)

### Reduced Motion Requirements
Per CONTEXT.md: "Layered but frozen (all layers visible, no parallax motion)"
- All parallax layers render statically
- Particles visible but not animating
- No ambient drift
- Board decorations still visible

## Open Questions

Things that couldn't be fully resolved:

1. **Animated GIF elements (birds, leaves)**
   - What we know: CONTEXT.md says "user will create GIFs when needed"
   - What's unclear: File format, optimization, lazy loading strategy
   - Recommendation: Plan for them but implement static layers first; GIFs added later

2. **Foreground particle moments**
   - What we know: "rare particles drift across board (like a single butterfly)"
   - What's unclear: Trigger conditions, frequency, z-index handling
   - Recommendation: Implement as optional enhancement after core theming works

3. **World transition animations**
   - What we know: "Claude's discretion" per CONTEXT.md
   - What's unclear: When transitions occur (level complete? world select?)
   - Recommendation: Focus on static theming first; transition polish in later pass

## Sources

### Primary (HIGH confidence)
- `/components/adventure/themed/WorldBackground.tsx` - Current parallax/particle implementation
- `/components/ui/PlayfulBackground.tsx` - Gyroscope/gesture parallax pattern
- `/hooks/useDevicePerformance.ts` - Adaptive rendering logic
- `/lib/adventure/themes/types.ts` - Complete type definitions
- `/lib/adventure/themes/world1.ts` - Theme configuration pattern
- `/app/globals.css` - Texture overlay patterns
- `/tailwind.config.js` - Animation keyframes, design tokens

### Secondary (MEDIUM confidence)
- Framer Motion documentation - Spring physics, gesture handling
- MDN DeviceOrientationEvent - Gyroscope API specifics

### Tertiary (LOW confidence)
- None - All findings verified against existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, patterns established
- Architecture: HIGH - Building on existing WorldBackground, ThemedTile, AdventureThemeContext
- Pitfalls: HIGH - Based on existing code patterns and project constraints
- Performance: HIGH - Clear Lighthouse thresholds, useDevicePerformance established

**Research date:** 2026-01-22
**Valid until:** 30+ days (stable infrastructure, no expected breaking changes)
