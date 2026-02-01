# Phase 35: World Expansion & Tech Debt Cleanup - Research

**Researched:** 2026-02-01
**Domain:** World theming (parallax backgrounds, themed particles), asset generation (Image MCP, WebP optimization), video rendering (Remotion MP4), performance optimization, bug fixes
**Confidence:** HIGH

---

## Summary

Phase 35 completes v1.1 carryover work by delivering Worlds 4-5 theming and resolving tech debt. The codebase has **90% of required infrastructure** already implemented from Phase 32 (visual polish), Phase 30 (cinematics), and established asset pipelines.

**Existing Infrastructure:**
1. **Parallax System**: `WorldBackground.tsx` with 3-5 layer support, `useParallax` hook
2. **Particle Effects**: `WorldParticles.tsx` + tsParticles 3.x integration
3. **Asset Pipeline**: `asset-pipeline.ts` + `generate-asset.ts` for WebP optimization
4. **Background Removal**: `remove-bg.py` using rembg + Python virtual environment
5. **Remotion Rendering**: Remotion 4.0.414 + CLI render commands (Phase 30)
6. **World Theming**: `WorldTheme` type system with `ParallaxLayer`, `ParticleConfig`, `TextureConfig`

**Primary recommendation:** Extend existing world theme definitions for Worlds 4-5 (Idiom Archipelago, Compound Canyon) following World 1-3 patterns. Generate parallax background assets via Image MCP + rembg pipeline. Optimize entry sequence animations by reducing delays from 2.38s to 2s (380ms reduction). Implement Remotion MP4 render script. Add inactivity detection hook (30s timeout). Fix bugs BUG-004 through BUG-008.

---

## Requirements Mapping

| Requirement | Description | Existing Infrastructure | Gap |
|-------------|-------------|------------------------|-----|
| WORLD-01 | World 4 parallax backgrounds (3-5 layers) | `WorldBackground.tsx` component | Define world4.ts theme config |
| WORLD-02 | World 4 themed particles (tropical) | `WorldParticles.tsx` + tsParticles | Add palm/seashell particle configs |
| WORLD-03 | World 4 board decorations (tiki borders) | `TileStyleMap` type system | Define tile styles for World 4 |
| WORLD-04 | World 4 AI-generated assets (WebP <200KB) | Image MCP + asset-pipeline.ts | Generate & optimize tropical assets |
| WORLD-05 | World 5 parallax backgrounds (desert cliffs) | Same as WORLD-01 | Define world5.ts theme config |
| WORLD-06 | World 5 themed particles (dust/tumbleweeds) | Same as WORLD-02 | Add desert particle configs |
| WORLD-07 | World 5 board decorations (canyon borders) | Same as WORLD-03 | Define tile styles for World 5 |
| WORLD-08 | World 5 AI-generated assets (WebP <200KB) | Same as WORLD-04 | Generate & optimize desert assets |
| DEBT-01 | Entry sequence timing optimization (2.38s → 2s) | Framer Motion animations | Profile & reduce animation delays |
| DEBT-02 | Video MP4 rendering pipeline | Remotion CLI + renderMedia API | Create render script |
| DEBT-03 | Bug fixes BUG-004 through BUG-008 | N/A | Implement fixes per BUG-REGISTRY.md |
| DEBT-04 | Lexi stuck detection (30s inactivity) | N/A | Create useInactivityDetection hook |

---

## Standard Stack

### Already In Codebase

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| tsParticles | 3.x | Themed particle effects | ✅ Integrated with WorldParticles.tsx |
| Framer Motion | ^12.23.24 | Parallax animations | ✅ Used in useParallax hook |
| Remotion | ^4.0.414 | Video rendering | ✅ Boss cinematics (Phase 30) |
| Sharp | ^0.34.5 | Image optimization (WebP) | ✅ Used in asset-pipeline.ts |
| rembg (Python) | Latest | Background removal | ✅ Scripts in scripts/remove-bg.py |

### Asset Generation Pipeline

```bash
# Existing workflow (scripts/asset-pipeline.ts)
1. Generate image via Image MCP (FLUX.1 model)
2. Remove background: python scripts/remove-bg.py input.png output.png
3. Optimize to WebP: npx tsx scripts/generate-asset.ts input.png output.webp
   - Quality: 80
   - Effort: 6
   - Target: <200KB
   - Re-compress if needed
4. Verify file size: npx tsx scripts/check-asset-sizes.ts
```

### Remotion Rendering (Phase 30 Established)

```bash
# CLI rendering (current setup)
npx remotion render src/index.ts CompositionId out/video.mp4

# Programmatic rendering (recommended for script)
import { bundle } from '@remotion/bundler';
import { renderMedia } from '@remotion/renderer';

const bundled = await bundle({
  entryPoint: './src/index.ts',
  webpackOverride: (config) => config,
});

await renderMedia({
  codec: 'h264',
  composition,
  serveUrl: bundled,
  outputLocation: 'out/video.mp4',
});
```

---

## Architecture Patterns

### Pattern 1: World Theme Definition (Following World 1-3 Pattern)

**What:** Define complete world theme configs for Worlds 4-5
**When to use:** Creating new themed worlds with unique visuals
**Why:** Consistent theming system, type-safe configuration

**Source:** `lib/adventure/themes/world1.ts` (existing pattern)

```typescript
// lib/adventure/themes/world4.ts - Idiom Archipelago

import type {
  WorldTheme,
  WorldBackground,
  ParallaxLayer,
  ParticleConfig,
  TileStyleMap,
} from './types';
import { Waves } from 'lucide-react';

const background: WorldBackground = {
  baseColor: 'bg-gradient-to-b from-sky-400 via-cyan-300 to-teal-500',
  illustrationPath: '/images/adventure/backgrounds/archipelago.webp',
  layers: [
    {
      id: 'archipelago-sky',
      source: 'bg-gradient-to-b from-sky-400 via-cyan-300 to-blue-400',
      depth: 0.1,
      opacity: 1,
      className: 'absolute inset-0',
    },
    {
      id: 'archipelago-far-islands',
      source: '/images/adventure/parallax/archipelago-far-islands.webp',
      depth: 0.2,
      opacity: 0.7,
      className: 'absolute bottom-0 w-full h-3/4 object-cover',
    },
    {
      id: 'archipelago-mid-islands',
      source: '/images/adventure/parallax/archipelago-mid-islands.webp',
      depth: 0.4,
      opacity: 0.9,
      className: 'absolute bottom-0 w-full h-2/3 object-cover',
    },
    {
      id: 'archipelago-near-islands',
      source: '/images/adventure/parallax/archipelago-near-islands.webp',
      depth: 0.6,
      opacity: 1,
      className: 'absolute bottom-0 w-full h-1/2 object-cover',
    },
    {
      id: 'archipelago-foreground',
      source: '/images/adventure/parallax/archipelago-palms.webp',
      depth: 0.8,
      opacity: 1,
      className: 'absolute bottom-0 w-full h-1/3 object-cover',
    },
  ],
  texture: {
    type: 'grain',
    opacity: 0.03,
    blendMode: 'overlay',
  },
  particles: {
    type: 'droplets', // Custom tropical particles
    count: 12,
    colors: ['#90EE90', '#FFD700', '#00CED1'],
    speed: 0.6,
    sizeRange: [8, 16],
    variant: 'tropical', // Palm fronds, seashells, waves
  },
};

const tileStyles: TileStyleMap = {
  standard: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'cyan-100',
    gradientTo: 'teal-200',
    borderColor: 'border-teal-600/30',
    shadowStyle: 'hard',
    showTexture: true,
    overlayType: 'none',
  },
  // ... other tile types
};

export const world4Theme: WorldTheme = {
  id: 4,
  nameKey: 'adventure.worlds.idiom_archipelago',
  themeId: 'archipelago',
  mechanic: 'idiom-matching',
  colors: {
    primary: 'neo-cyan',
    secondary: 'teal-400',
    accent: 'yellow-400',
    backgroundTint: 'cyan-900/20',
    textLight: 'neo-white',
    textDark: 'neo-black',
    success: 'teal-500',
    warning: 'yellow-500',
    danger: 'red-500',
  },
  background,
  tileStyles,
  // ... modifiers, animations, chapters
};
```

**World 5 (Compound Canyon):** Similar pattern with desert theme:
- Base colors: Orange, brown, sandy gradients
- Particles: Dust, tumbleweeds, heat shimmer
- Parallax layers: Canyon cliffs (3-5 depth layers)

### Pattern 2: Custom Particle Types for Themed Worlds

**What:** Extend tsParticles with custom shapes/images for world themes
**When to use:** When default shapes (circle/square) don't match world aesthetic
**Why:** Immersive theming without heavy custom rendering

**Source:** Adapted from tsParticles documentation + existing `WorldParticles.tsx`

```typescript
// components/adventure/themed/WorldParticles.tsx (extend existing)

import Particles from '@tsparticles/react';
import { loadImageShape } from '@tsparticles/shape-image';

// Custom particle configurations for tropical theme
const TROPICAL_PARTICLE_CONFIG = {
  fpsLimit: 60,
  particles: {
    number: {
      value: 12,
      density: {
        enable: true,
        width: 1920,
        height: 1080,
      },
    },
    shape: {
      type: ['image'],
      image: [
        {
          src: '/images/particles/palm-frond.webp',
          width: 32,
          height: 32,
        },
        {
          src: '/images/particles/seashell.webp',
          width: 24,
          height: 24,
        },
        {
          src: '/images/particles/wave.webp',
          width: 40,
          height: 20,
        },
      ],
    },
    opacity: {
      value: 0.6,
      animation: {
        enable: true,
        speed: 0.5,
        minimumValue: 0.3,
      },
    },
    move: {
      enable: true,
      speed: 0.6,
      direction: 'none',
      random: true,
      straight: false,
      outModes: {
        default: 'bounce',
      },
    },
    rotate: {
      value: { min: 0, max: 360 },
      animation: {
        enable: true,
        speed: 2,
      },
    },
  },
};

// Desert theme particles (dust, tumbleweeds, heat shimmer)
const DESERT_PARTICLE_CONFIG = {
  // Similar structure with desert-themed images
  shape: {
    type: ['image'],
    image: [
      { src: '/images/particles/dust.webp' },
      { src: '/images/particles/tumbleweed.webp' },
      { src: '/images/particles/heat-shimmer.webp' },
    ],
  },
  move: {
    speed: 1.2,
    direction: 'left', // Wind effect
  },
};
```

**Performance:** Limit to 12 particles max (per world theme), use WebP images <10KB each.

### Pattern 3: WebP Asset Optimization Pipeline

**What:** Automated pipeline for generating, optimizing, and verifying world assets
**When to use:** Creating all visual assets for new worlds
**Why:** Ensures <200KB file size, SEO-friendly alt text, consistent quality

**Source:** Existing `scripts/asset-pipeline.ts` + `scripts/generate-asset.ts`

```typescript
// scripts/generate-world-assets.ts (new script)

import { generateAsset } from './generate-asset';
import * as fs from 'fs/promises';

interface WorldAssetManifest {
  world: number;
  theme: string;
  assets: {
    name: string;
    prompt: string; // For Image MCP
    altText: string;
  }[];
}

const WORLD_4_MANIFEST: WorldAssetManifest = {
  world: 4,
  theme: 'Idiom Archipelago',
  assets: [
    {
      name: 'archipelago-background.webp',
      prompt: 'Tropical island archipelago, vibrant turquoise waters, palm trees, sunset sky, flat illustration style',
      altText: 'Idiom Archipelago tropical island background with palm trees and turquoise waters',
    },
    {
      name: 'archipelago-far-islands.webp',
      prompt: 'Distant tropical islands on horizon, silhouetted against blue sky, simplified shapes',
      altText: 'Distant tropical islands in background layer',
    },
    // ... more parallax layers
  ],
};

async function generateWorldAssets(manifest: WorldAssetManifest) {
  console.log(`Generating assets for World ${manifest.world}: ${manifest.theme}`);

  for (const asset of manifest.assets) {
    console.log(`\n📸 Generating: ${asset.name}`);
    console.log(`   Prompt: ${asset.prompt}`);

    // 1. Generate with Image MCP (FLUX.1)
    // (Manual step - use Image MCP tool with prompt)

    // 2. Remove background
    const rawPath = `generated/${asset.name.replace('.webp', '.png')}`;
    const noBgPath = `processed/${asset.name.replace('.webp', '-nobg.png')}`;

    await execAsync(`python scripts/remove-bg.py ${rawPath} ${noBgPath}`);

    // 3. Optimize to WebP (<200KB, quality 80, effort 6)
    const outputPath = `public/images/adventure/parallax/${asset.name}`;
    const result = await generateAsset(noBgPath, asset.name, {
      removeBg: false, // Already done
      targetKb: 200,
      quality: 80,
      effort: 6,
      outputDir: 'public/images/adventure/parallax',
    });

    console.log(`   ✅ Optimized: ${result.sizeKb.toFixed(1)}KB`);

    // 4. Verify file size
    if (result.sizeKb > 200) {
      console.warn(`   ⚠️  Warning: Exceeds 200KB target`);
      // Re-compress with lower quality
      await generateAsset(noBgPath, asset.name, {
        targetKb: 200,
        quality: 70, // Reduce quality
        effort: 6,
        outputDir: 'public/images/adventure/parallax',
      });
    }

    // 5. Add SEO alt text to metadata
    // (Store in world theme config or separate metadata file)
  }
}
```

**WebP Settings (Established Standard):**
- Quality: 80 (reduce to 70 if >200KB)
- Effort: 6 (balance of compression vs speed)
- Target: <200KB per file
- Format: WebP (not PNG/JPEG)

**Sources:**
- [Google WebP FAQ](https://developers.google.com/speed/webp/faq) - Quality 70-80 recommended
- [Website Image Size Guide 2026](https://tiny-img.com/blog/best-image-size-for-website/) - 200KB limit for backgrounds

### Pattern 4: Entry Sequence Timing Optimization

**What:** Profile and reduce animation delays in level entry sequence
**When to use:** Performance optimization, reducing perceived loading time
**Why:** 2.38s feels sluggish, 2s target improves UX (380ms reduction needed)

**Source:** [React animation performance guide](https://motion.dev/docs/performance)

```typescript
// Current entry sequence (2.38s total - needs profiling)
// Likely sources of delay:
// 1. Tile cascade animation (300-500ms per wave)
// 2. HUD fade-in delays (200-300ms stagger)
// 3. Background parallax initialization (100-200ms)
// 4. Particle system startup (50-100ms)

// Optimization strategy:
// - Reduce cascade delay from 300ms to 200ms (-100ms)
// - Parallelize HUD + background fade-in (-150ms)
// - Pre-initialize particle system (-50ms)
// - Use will-change CSS for GPU acceleration
// - Reduce spring damping for faster settle

// components/adventure/LevelGrid.tsx (example optimization)

// BEFORE: Sequential animations (slower)
const tileVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: (index: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: index * 0.3, // 300ms stagger
      duration: 0.4,
      type: 'spring',
      damping: 15,
    },
  }),
};

// AFTER: Faster stagger + quicker settle
const tileVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: (index: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: index * 0.2, // 200ms stagger (-100ms)
      duration: 0.3, // Shorter duration (-100ms)
      type: 'spring',
      damping: 20, // Higher damping = faster settle
    },
  }),
};

// Additional optimization: GPU acceleration
<motion.div
  style={{ willChange: 'transform, opacity' }}
  variants={tileVariants}
>
```

**Measurement approach:**
1. Add performance markers: `performance.mark('entry-start')` / `performance.measure()`
2. Profile with Chrome DevTools Performance tab (CPU 6x throttle)
3. Identify slowest animations (Waterfall view)
4. Reduce durations/delays iteratively
5. Test on target device (iPhone 12 baseline)

**Target breakdown:**
- Tile cascade: 1.2s (reduced from 1.5s)
- HUD fade-in: 0.5s (parallel with cascade)
- Background load: 0.3s (pre-loaded)
- **Total: 2.0s** (meets target)

**Sources:**
- [Animation Performance Guide | Motion](https://motion.dev/docs/performance) - Duration <300ms guideline
- [React Performance Guide](https://stevekinney.com/courses/react-performance/animation-performance) - Hardware acceleration best practices

### Pattern 5: Remotion MP4 Rendering Script

**What:** Automated script to render Remotion compositions to MP4 files
**When to use:** Pre-rendering cinematics for distribution, testing video output
**Why:** CLI rendering is manual, script allows batch processing

**Source:** [Remotion renderMedia API](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/render-all.mdx)

```typescript
// scripts/render-cinematics.ts (new script)

import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import { createRequire } from 'module';
import * as path from 'path';

const require = createRequire(import.meta.url);

interface RenderConfig {
  compositionId: string;
  outputName: string;
  props?: Record<string, any>;
}

const CINEMATICS_TO_RENDER: RenderConfig[] = [
  {
    compositionId: 'BossEntrance',
    outputName: 'boss-entrance.mp4',
    props: { bossId: 'world1-boss' },
  },
  {
    compositionId: 'VictoryCinematic',
    outputName: 'victory.mp4',
    props: { level: 1, stars: 3 },
  },
  {
    compositionId: 'DefeatCinematic',
    outputName: 'defeat.mp4',
  },
];

async function renderCinematics() {
  console.log('📦 Bundling Remotion project...');

  // Bundle the Remotion project
  const bundled = await bundle({
    entryPoint: require.resolve('../remotion/index.ts'),
    webpackOverride: (config) => config,
  });

  console.log('✅ Bundle complete\n');

  // Get all available compositions
  const compositions = await getCompositions(bundled);
  console.log(`Found ${compositions.length} compositions\n`);

  // Render each cinematic
  for (const config of CINEMATICS_TO_RENDER) {
    console.log(`🎬 Rendering: ${config.compositionId}...`);

    const composition = compositions.find(c => c.id === config.compositionId);
    if (!composition) {
      console.error(`❌ Composition not found: ${config.compositionId}`);
      continue;
    }

    try {
      await renderMedia({
        codec: 'h264',
        composition,
        serveUrl: bundled,
        outputLocation: path.join('public', 'videos', config.outputName),
        inputProps: config.props || {},
        // Optimization settings
        crf: 23, // Quality (lower = higher quality, 18-28 recommended)
        pixelFormat: 'yuv420p', // Compatibility with all browsers
        audioBitrate: '128k',
        videoBitrate: '2M',
      });

      console.log(`   ✅ Saved: public/videos/${config.outputName}\n`);
    } catch (error) {
      console.error(`   ❌ Render failed:`, error);
    }
  }

  console.log('🎉 All cinematics rendered!');
}

renderCinematics().catch(console.error);
```

**Usage:**
```bash
npx tsx scripts/render-cinematics.ts
```

**Output:** MP4 files in `public/videos/` for offline testing or CDN distribution.

### Pattern 6: Inactivity Detection Hook

**What:** React hook to detect user inactivity (30s idle) and trigger help
**When to use:** Lexi stuck detection, auto-pause, tutorial prompts
**Why:** Improve UX by proactively offering assistance

**Source:** [React idle timer patterns](https://blog.logrocket.com/make-idle-timer-react-app/)

```typescript
// hooks/useInactivityDetection.ts (new hook)

import { useEffect, useRef, useCallback } from 'react';

interface UseInactivityDetectionOptions {
  /** Timeout in milliseconds (default: 30000 = 30s) */
  timeout?: number;
  /** Callback when user becomes inactive */
  onInactive: () => void;
  /** Events to track for activity (default: mousemove, keydown, touchstart) */
  events?: string[];
  /** Enable/disable detection (default: true) */
  enabled?: boolean;
}

/**
 * Detects user inactivity and triggers callback after timeout
 *
 * @example
 * ```tsx
 * useInactivityDetection({
 *   timeout: 30000, // 30 seconds
 *   onInactive: () => {
 *     showLexiHint('Need help? Try looking for longer words!');
 *   },
 * });
 * ```
 */
export function useInactivityDetection({
  timeout = 30000,
  onInactive,
  events = ['mousemove', 'keydown', 'touchstart', 'click'],
  enabled = true,
}: UseInactivityDetectionOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      onInactive();
    }, timeout);
  }, [timeout, onInactive]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled) {
      // Clean up if disabled
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Start timer on mount
    resetTimer();

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, events, handleActivity, resetTimer]);

  return {
    /** Time of last activity */
    lastActivity: lastActivityRef.current,
    /** Manually reset the timer */
    reset: resetTimer,
  };
}
```

**Usage in adventure game:**
```typescript
// components/adventure/AdventureGame.tsx

function AdventureGame() {
  const { showHint } = useLexiPersonality();

  useInactivityDetection({
    timeout: 30000, // 30 seconds
    onInactive: () => {
      // Show Lexi hint when player is stuck
      showHint('stuck', {
        message: 'Hmm, having trouble? Try starting with common prefixes like "un-" or "re-"!',
      });
    },
    enabled: gameState.isPlaying && !gameState.isPaused,
  });

  // ... rest of component
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parallax scrolling | Custom scroll listener | Framer Motion `useScroll` + `useTransform` | Handles scroll smoothing, RAF batching, reduced-motion |
| Image optimization | Manual Sharp calls | Existing `asset-pipeline.ts` script | Handles quality iteration, file size verification, WebP settings |
| Background removal | Custom ML model | `rembg` Python library + existing scripts | Pre-trained model (u2net), fast, proven pipeline |
| Particle systems | Custom canvas renderer | tsParticles 3.x | 60fps on mobile, customizable shapes, low bundle size |
| Inactivity detection | Manual setTimeout chains | `useInactivityDetection` hook (Pattern 6) | Handles cleanup, multiple events, enable/disable |
| World theme registry | Hardcoded configs | Extend `lib/adventure/themes/` type system | Type-safe, centralized, follows existing pattern |

**Key insight:** All infrastructure exists from Phases 26-32. Phase 35 is about **extending patterns**, not inventing new systems.

---

## Common Pitfalls

### Pitfall 1: Exceeding 200KB File Size Target

**What goes wrong:** Parallax background images are 400KB+ → slow page load, mobile data usage
**Why it happens:** AI-generated images are PNG 1920x1080 → large file size before optimization
**How to avoid:**
- Always use WebP format (not PNG/JPEG)
- Quality 80 first pass, reduce to 70 if >200KB
- Effort 6 (slower compression, better results)
- Re-compress if needed (don't accept oversized files)
- Use `check-asset-sizes.ts` script for verification

**Example fix:**
```bash
# Generate asset with quality 80
npx tsx scripts/generate-asset.ts input.png output.webp --quality=80

# Check file size
ls -lh output.webp  # 245KB - too large!

# Re-compress with quality 70
npx tsx scripts/generate-asset.ts input.png output.webp --quality=70

# Verify again
ls -lh output.webp  # 187KB - success!
```

**Warning signs:** Slow world loading, mobile users complain about data usage, Lighthouse scores drop

### Pitfall 2: Parallax Layer Depth Conflicts

**What goes wrong:** Foreground layer appears behind background → broken depth perception
**Why it happens:** Incorrect depth values (higher depth = moves MORE, not less)
**How to avoid:**
- Depth scale: 0.1 (far background) → 0.8 (near foreground)
- Test by moving mouse/scrolling to verify depth effect
- Document depth values in comments

**Example fix:**
```typescript
// BAD: Depth values inverted
layers: [
  { id: 'sky', depth: 0.8 },        // Sky moves FAST (wrong!)
  { id: 'mountains', depth: 0.5 },
  { id: 'foreground', depth: 0.2 }, // Foreground moves SLOW (wrong!)
]

// GOOD: Depth increases for closer layers
layers: [
  { id: 'sky', depth: 0.1 },        // Sky barely moves (far away)
  { id: 'mountains', depth: 0.3 },
  { id: 'foreground', depth: 0.6 }, // Foreground moves more (close)
]
```

**Warning signs:** Parallax feels "backwards", layers cross over each other, depth looks flat

### Pitfall 3: Entry Sequence Optimization Without Measurement

**What goes wrong:** Blindly reducing animation delays → choppy animations, broken timing
**Why it happens:** No baseline measurement, guessing where delays are
**How to avoid:**
- Profile FIRST with Chrome DevTools Performance tab
- Use `performance.mark()` and `performance.measure()`
- Test on target device (iPhone 12), not just desktop
- Reduce slowest animations first (biggest impact)

**Example measurement:**
```typescript
// Add performance markers
performance.mark('entry-start');

// ... animations happen ...

performance.mark('entry-end');
performance.measure('entry-sequence', 'entry-start', 'entry-end');

const measure = performance.getEntriesByName('entry-sequence')[0];
console.log(`Entry sequence took: ${measure.duration}ms`);
// Output: "Entry sequence took: 2384ms" (2.38s - over target!)
```

**Warning signs:** Animations feel rushed, elements pop in instead of animate, timing feels off

### Pitfall 4: Custom Particle Images Not Optimized

**What goes wrong:** Particle images are 100KB each → 12 particles = 1.2MB download
**Why it happens:** Forgot to optimize particle assets (same as background images)
**How to avoid:**
- Particle images must be <10KB each (not <200KB)
- Use simpler shapes (SVG better than raster)
- 32x32px or smaller (particles are tiny)
- WebP quality 60-70 for particles

**Example optimization:**
```bash
# Particle asset should be tiny
npx tsx scripts/generate-asset.ts palm-frond.png palm-frond.webp \
  --quality=60 \
  --resize=32x32

# Verify size
ls -lh palm-frond.webp  # 7.2KB - good!
```

**Warning signs:** Slow particle initialization, janky scrolling, high memory usage

### Pitfall 5: Inactivity Detection Firing Too Often

**What goes wrong:** Lexi hint appears every 30s even during active gameplay
**Why it happens:** Timer doesn't reset on game actions (word submission, tile selection)
**How to avoid:**
- Track GAME ACTIONS, not just mouse/keyboard events
- Reset timer on: word found, tile clicked, power-up used
- Disable detection when modal open (tutorial, pause menu)

**Example fix:**
```typescript
// Hook usage with custom reset
const { reset: resetInactivityTimer } = useInactivityDetection({
  timeout: 30000,
  onInactive: showLexiHint,
  enabled: isPlaying && !isPaused && !modalOpen,
});

// Reset on game actions (not just mouse events)
function handleWordSubmit(word: string) {
  submitWord(word);
  resetInactivityTimer(); // Manual reset
}

function handleTileClick(tile: Tile) {
  selectTile(tile);
  resetInactivityTimer(); // Manual reset
}
```

**Warning signs:** Hints appear during active play, players complain about interruptions

### Pitfall 6: Bug Fixes Without Tests

**What goes wrong:** Fix BUG-004 (error surfacing), but regression happens 2 weeks later
**Why it happens:** No test coverage for bug fix, code changes break fix
**How to avoid:**
- Write regression test FIRST (reproduces bug)
- Implement fix
- Verify test passes
- Add to CI (prevents future regression)

**Example test (BUG-004: Console errors not surfaced):**
```typescript
// __tests__/error-handling/error-surfacing.test.tsx

describe('BUG-004: Error surfacing', () => {
  it('shows toast notification when API call fails', async () => {
    // Mock API failure
    mockApiCall.mockRejectedValue(new Error('Network error'));

    render(<DailyChallenge />);

    // Trigger API call
    fireEvent.click(screen.getByText('Submit'));

    // Verify toast appears (not just console.error)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });

    // Ensure console.error is NOT the only feedback
    expect(console.error).toHaveBeenCalled();
    // But user ALSO sees visual feedback
  });
});
```

**Warning signs:** Bugs reappear, no confidence in fixes, manual testing required

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PNG backgrounds (1-2MB) | WebP optimized <200KB | 2024-2025 | 5-10x smaller file sizes |
| Manual background removal | rembg automated pipeline | Phase 30 (2026-01-31) | Consistent quality, faster workflow |
| Hardcoded particle configs | tsParticles 3.x with custom shapes | Phase 32 (2026-02-01) | Theme-specific particles, 60fps |
| Fixed animation durations | Device-aware performance tuning | Phase 26 (2026-01-30) | 60fps on low-end devices |
| Manual Remotion renders | CLI + programmatic rendering | Phase 30 (2026-01-31) | Batch processing, automation |
| setTimeout inactivity detection | Hook with cleanup + events | 2025-2026 | Prevents memory leaks, easier to use |

**Deprecated/outdated:**
- **Lottie for world backgrounds:** Heavy (100KB+), use static WebP instead
- **tsParticles v2.x:** Upgrade to v3.x (breaking changes, performance improvements)
- **Manual setTimeout chains:** Use `useInactivityDetection` hook (cleaner API)

---

## Open Questions

### For Planning Phase

1. **World 4 particle variant:** Palm fronds + seashells + waves, or choose one primary?
   - **Recommendation:** Use all three (4 palm, 4 seashells, 4 waves) for variety

2. **World 5 heat shimmer effect:** Use particle image or CSS distortion filter?
   - **Recommendation:** CSS backdrop-filter for performance (no particle budget cost)

3. **Entry timing optimization approach:** Reduce delays or parallelize animations?
   - **Recommendation:** Both - parallelize HUD + background, reduce cascade delay

4. **Remotion render script location:** scripts/ or separate remotion/scripts/?
   - **Recommendation:** scripts/render-cinematics.ts (consistent with other scripts)

5. **Bug priority order:** Fix BUG-004→008 sequentially or by severity?
   - **Recommendation:** By severity (HIGH → MEDIUM → LOW per BUG-REGISTRY.md)

6. **Lexi stuck detection threshold:** 30s firm or adaptive based on level difficulty?
   - **Recommendation:** 30s baseline, increase to 45s for boss levels

### Technical Decisions Needed

1. **Parallax layer count:** 3 minimum or 5 optimal?
   - **Recommendation:** 5 layers for Worlds 4-5 (richer depth, established pattern)

2. **Particle image format:** WebP or SVG?
   - **Recommendation:** WebP for complex shapes (palm fronds), SVG for simple (dust)

3. **Asset generation workflow:** Manual Image MCP or automated API integration?
   - **Recommendation:** Manual for v1.1 (quality control), automate in v2.0

4. **Entry timing target:** Strict 2.0s or flexible 2.0-2.1s?
   - **Recommendation:** Flexible 2.0-2.1s (avoid jank for 100ms)

---

## Code Examples

### World Theme Config (World 4 - Idiom Archipelago)

See **Pattern 1** above for complete example.

### Custom Particle Configuration (Tropical Theme)

See **Pattern 2** above for complete example.

### WebP Asset Generation Script

See **Pattern 3** above for complete example.

### Entry Sequence Optimization

See **Pattern 4** above for complete example.

### Remotion MP4 Render Script

See **Pattern 5** above for complete example.

### Inactivity Detection Hook

See **Pattern 6** above for complete example.

---

## Bug Fixes (BUG-004 through BUG-008)

**Source:** `.planning/phases/10-bug-fixes-stabilization/BUG-REGISTRY.md`

### BUG-004: Console Errors Not Surfaced to User (Medium)
**Problem:** 48 console.error calls without user-facing feedback
**Fix:** Add toast notifications for API failures, validation errors
**Test:** Verify toast appears on network error, not just console.error

### BUG-005: Guest Fingerprint Regression Risk (Medium)
**Problem:** Fixed code could regress if refactored incorrectly
**Fix:** Add regression test for authenticated user submission
**Test:** Ensure `canSubmit` logic doesn't require guestFingerprint for authenticated users

### BUG-006: Server Reset Failure Not Communicated (Medium)
**Problem:** Server reset API failure shows success toast
**Fix:** Show error toast on server reset failure, don't show success
**Test:** Mock server reset failure, verify error toast appears

### BUG-007: Debug Logging in Production (Low)
**Problem:** `console.log` statements pollute production console
**Fix:** Remove debug logs or wrap in `if (process.env.NODE_ENV === 'development')`
**Test:** Build production, verify no debug logs in console

### BUG-008: Missing Translation Keys for Runtime Errors (Low)
**Problem:** Dynamic translation keys (`t(variable)`) could fail at runtime
**Fix:** Add build-time validation for dynamic keys, add fallback keys
**Test:** Verify all `t(variable)` calls have fallback or validated keys

---

## Sources

### Primary (HIGH confidence)
- Existing codebase:
  - `components/adventure/themed/WorldBackground.tsx` - Parallax system
  - `components/adventure/themed/WorldParticles.tsx` - tsParticles integration
  - `lib/adventure/themes/types.ts` - World theme type system
  - `lib/adventure/themes/world1.ts` - World 1 theme (reference pattern)
  - `scripts/asset-pipeline.ts` - WebP optimization pipeline
  - `scripts/generate-asset.ts` - Image generation + compression
  - `scripts/remove-bg.py` - rembg background removal
  - `hooks/useParallax.ts` - Parallax scroll hook
  - `.planning/phases/10-bug-fixes-stabilization/BUG-REGISTRY.md` - Bug details
- [Remotion renderMedia API](https://github.com/remotion-dev/remotion) - Context7 /remotion-dev/remotion
- [Motion parallax docs](https://motion.dev/docs/react-accessibility) - Context7 /websites/motion_dev
- [Google WebP FAQ](https://developers.google.com/speed/webp/faq) - WebP optimization (updated 2026-01-30)

### Secondary (MEDIUM confidence)
- Phase 30 Research (30-RESEARCH.md) - Remotion cinematics, rembg pipeline
- Phase 32 Research (32-RESEARCH.md) - Particle effects, layered system
- [tsParticles documentation](https://particles.js.org/) - Custom particle shapes
- [React idle timer](https://blog.logrocket.com/make-idle-timer-react-app/) - Inactivity detection patterns
- [Website Image Size Guide 2026](https://tiny-img.com/blog/best-image-size-for-website/) - 200KB recommendation

### Tertiary (LOW confidence)
- [Animation performance guide](https://motion.dev/docs/performance) - General optimization tips
- [React performance guide](https://stevekinney.com/courses/react-performance/animation-performance) - Hardware acceleration

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries integrated (tsParticles, Remotion, Sharp, rembg)
- Architecture: HIGH - Extends proven patterns from Phases 30-32
- Pitfalls: MEDIUM - Based on general optimization research + bug registry analysis
- Bug fixes: HIGH - Detailed descriptions in BUG-REGISTRY.md

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable stack, established patterns)

**Dependencies:**
- Phase 30: Boss Battle Overhaul (Remotion rendering, rembg pipeline)
- Phase 32: Visual Polish & Effects (Particle system, layered effects)
- Phase 26: Meta-Progression Foundation (Particle budgets, device performance)

**File count estimate:**
- New files: 4-6 (world4.ts, world5.ts, render-cinematics.ts, useInactivityDetection.ts, test files)
- Modified files: 8-12 (WorldParticles.tsx, asset manifests, bug fixes across multiple components)
- Asset files: 20-30 (10-15 per world: parallax layers, particle images)
