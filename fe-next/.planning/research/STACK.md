# Technology Stack: v2.0 Adventure Overhaul

**Milestone:** v2.0 Adventure Overhaul
**Researched:** 2026-01-30
**Overall Confidence:** HIGH

---

## Executive Summary

The v2.0 Adventure Overhaul requires significant animation capabilities, state management improvements, and enhanced visual content pipelines. Based on current ecosystem analysis, the recommended stack leverages **GSAP for complex animations** (already installed), **Zustand for game state** (already installed), **tsParticles for particle effects**, and **enhanced Remotion workflows** for cinematic content. Python-based image processing with **rembg** provides robust background removal.

**Key Decision:** Favor existing dependencies (GSAP, Zustand, Framer Motion) over new libraries. Use GSAP for dynamic board mechanics and Framer Motion for UI animations. Avoid introducing heavyweight game engines.

---

## Recommended Stack

### 1. Animation Libraries

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **GSAP** | 3.14.2 (installed) | Dynamic board mechanics, tile movements, cascades | Best performance for complex timelines, 23KB gzipped, GPU-accelerated, handles thousands of tweens without frame drops |
| **Framer Motion** | 12.23.24 (installed) | UI animations, power-up feedback, overlays | Declarative React-first API, layout animations, gesture support, already integrated |
| **tsParticles** | 3.x (NEW) | Explosions, confetti, power-up effects | Comprehensive particle system, 0 dependencies, TypeScript-native, React components included |

**Why NOT add new animation libraries:**
- GSAP already provides enterprise-grade performance for complex animations
- Framer Motion handles declarative UI animations perfectly
- Adding React Spring or Motion One would create redundancy without benefits

#### Implementation Strategy

**GSAP for Game Mechanics:**
```typescript
// Tile cascade animation
gsap.timeline()
  .to(tileRef.current, {
    y: -100,
    duration: 0.3,
    ease: "power2.out"
  })
  .to(tileRef.current, {
    opacity: 0,
    scale: 0,
    duration: 0.2,
    ease: "power2.in"
  });

// Board shake earthquake
gsap.to(boardRef.current, {
  x: "random(-5, 5)",
  y: "random(-5, 5)",
  duration: 0.05,
  repeat: 10,
  yoyo: true,
  ease: "none"
});
```

**Framer Motion for UI:**
```typescript
// Power-up activation feedback
<motion.div
  initial={{ scale: 0, rotate: -180 }}
  animate={{ scale: 1, rotate: 0 }}
  exit={{ scale: 0, rotate: 180 }}
  transition={{ type: "spring", stiffness: 260, damping: 20 }}
>
  <PowerUpIcon />
</motion.div>
```

**tsParticles for Effects:**
```typescript
// Explosion on word submission
import Particles from "react-particles";
import { loadFull } from "tsparticles";

<Particles
  id="word-explosion"
  init={loadFull}
  options={{
    particles: {
      number: { value: 50 },
      color: { value: "#BFFF00" },
      shape: { type: "circle" },
      opacity: { value: 1, animation: { enable: true, speed: 1, minimumValue: 0 } },
      size: { value: 5, random: true },
      move: { enable: true, speed: 8, direction: "none", outModes: { default: "destroy" } }
    }
  }}
/>
```

---

### 2. Game State Management

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Zustand** | 5.0.10 (installed) | Adventure mode state, power-ups, progression | 30% smaller than Redux, no boilerplate, perfect for game state, already in stack |
| **XState** | 5.24.0 (installed) | Boss battle state machines | Existing dependency, ideal for complex state flows like boss phases |

**Why Zustand over Redux Toolkit:**
- Already installed and used in the project
- 3KB gzipped vs 23KB for Redux Toolkit
- Perfect for game state that needs fast updates
- No action creators, reducers, or provider boilerplate
- Built-in middleware for persistence and devtools

**When to use each:**

| Use Case | Tool | Reason |
|----------|------|--------|
| Power-up inventory | Zustand | Fast updates, simple state |
| Player progression/stats | Zustand | Needs persistence, simple |
| Boss battle phases | XState | Complex state machine logic |
| UI state (modals, tooltips) | React Context | Already used, lightweight |
| Real-time multiplayer | Socket.IO + local state | Already implemented |

#### Example: Zustand Store for Adventure Mode

```typescript
// stores/adventureStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PowerUp {
  id: string;
  type: 'freeze' | 'hint' | 'multiplier';
  quantity: number;
}

interface AdventureState {
  // State
  currentWorld: number;
  currentLevel: number;
  stars: number;
  powerUps: PowerUp[];
  unlockedUpgrades: string[];

  // Actions
  usePowerUp: (type: PowerUp['type']) => void;
  earnStars: (count: number) => void;
  unlockUpgrade: (upgradeId: string) => void;
  progressToNextLevel: () => void;
}

export const useAdventureStore = create<AdventureState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentWorld: 1,
      currentLevel: 1,
      stars: 0,
      powerUps: [
        { id: 'freeze', type: 'freeze', quantity: 3 },
        { id: 'hint', type: 'hint', quantity: 5 },
        { id: 'multiplier', type: 'multiplier', quantity: 2 }
      ],
      unlockedUpgrades: [],

      // Actions
      usePowerUp: (type) => set((state) => ({
        powerUps: state.powerUps.map(p =>
          p.type === type ? { ...p, quantity: Math.max(0, p.quantity - 1) } : p
        )
      })),

      earnStars: (count) => set((state) => ({
        stars: state.stars + count
      })),

      unlockUpgrade: (upgradeId) => set((state) => ({
        unlockedUpgrades: [...state.unlockedUpgrades, upgradeId]
      })),

      progressToNextLevel: () => set((state) => ({
        currentLevel: state.currentLevel + 1
      }))
    }),
    {
      name: 'adventure-storage',
      partialize: (state) => ({
        currentWorld: state.currentWorld,
        currentLevel: state.currentLevel,
        stars: state.stars,
        unlockedUpgrades: state.unlockedUpgrades
      })
    }
  )
);
```

---

### 3. Particle Systems

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **tsParticles** | ^3.0.0 (NEW) | Explosions, fireworks, confetti | Word submissions, power-up activations, level completions |
| **canvas-confetti** | 1.9.4 (installed) | Simple celebration effects | Quick wins, already integrated |

**Recommendation:** Add tsParticles for comprehensive particle effects. Keep canvas-confetti for simple celebrations.

**Installation:**
```bash
npm install react-particles tsparticles
```

**Why tsParticles:**
- Most comprehensive React particle library (4.2k stars, actively maintained)
- TypeScript-native with strong typing
- Performance-optimized with Web Workers support
- 70+ built-in presets (explosions, fireworks, snow, etc.)
- Easy integration with React via `react-particles` wrapper

**Alternative considered:** react-particle-effect-button (specialized but limited to button effects)

---

### 4. Remotion Enhancements

| Package | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@remotion/lottie** | Latest | After Effects animations | Boss intro cinematics, complex UI animations |
| **@remotion/skia** | Latest | React Native Skia effects | Advanced filters, gradients, blend modes |
| **Remotion Skills** | 2026 | AI-powered video generation | Rapid prototyping of cinematic sequences |

**Current Setup:**
- Remotion is NOT currently in package.json but mentioned in PROJECT.md as planned
- Need to add core Remotion packages

**Installation:**
```bash
npm install remotion @remotion/lottie @remotion/skia
```

#### Remotion Best Practices for Game Content

**1. Boss Intro Cinematics:**
```typescript
// remotion/BossIntro.tsx
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export const BossIntro: React.FC<{ bossName: string }> = ({ bossName }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  const scale = interpolate(frame, [0, 30], [0.8, 1], {
    extrapolateRight: 'clamp'
  });

  return (
    <AbsoluteFill className="bg-neo-navy">
      <div style={{ opacity, transform: `scale(${scale})` }}>
        <h1 className="text-6xl font-neo-display text-neo-lime">
          {bossName}
        </h1>
      </div>
    </AbsoluteFill>
  );
};
```

**2. Using Lottie for Complex Animations:**
```typescript
import { Lottie } from '@remotion/lottie';
import bossAnimation from './boss-appear.json';

<Lottie animationData={bossAnimation} />
```

**3. Remotion Skills for Rapid Iteration (2026 Feature):**
- Use natural language prompts to generate video sequences
- Example: "Create a 3-second boss intro with lightning effects and text reveal"
- Claude Code integration allows AI-generated Remotion components

**When NOT to use Remotion:**
- Real-time in-game animations (use GSAP/Framer instead)
- Simple UI transitions (use Framer Motion)
- Interactive elements (Remotion is for pre-rendered video)

---

### 5. Image Generation & Processing

#### Image Generation (MCP Integration)

| Tool | Purpose | Integration Method |
|------|---------|-------------------|
| **Hugging Face MCP + FLUX.1** | Boss graphics, power-up icons | Claude Desktop MCP server |
| **Google Gemini MCP** | Alternative image generation | Claude Desktop MCP server |

**Setup:**
```json
// claude_desktop_config.json
{
  "mcpServers": {
    "huggingface": {
      "command": "npx",
      "args": ["-y", "@huggingface/mcp-server"]
    }
  }
}
```

**Prompt Engineering Best Practices for Game Graphics:**

1. **Be Specific About Style:**
   - ❌ "Generate a boss character"
   - ✅ "Generate a neo-brutalist style boss character with hard black outlines, bold lime and cyan colors, minimal shading, and chunky geometric shapes. Dark navy background. No gradients or soft shadows."

2. **Avoid Technical Notation:**
   - ❌ "Use #BFFF00 for highlights"
   - ✅ "Use electric lime green for highlights"

3. **Specify Composition:**
   - "Center-framed, full-body character view, 1024x1024 square canvas, 200KB max file size"

4. **Reference Existing Style:**
   - "Match the Jackbox Party Pack art style - flat colors, thick outlines, playful proportions"

#### Background Removal (Python Pipeline)

| Library | Version | Purpose | Performance |
|---------|---------|---------|-------------|
| **rembg** | Latest | Background removal | 179-973MB models, 350-820ms processing |
| Model: **BiRefNet-general** | Latest | High-accuracy removal | IoU 0.87, Dice 0.92 |
| Model: **U2Net** (fallback) | Latest | Faster processing | IoU 0.89, 350ms average |

**Installation:**
```bash
pip install rembg[gpu]  # GPU acceleration for better performance
```

**Usage:**
```python
# scripts/remove-background.py
from rembg import remove
from PIL import Image

input_path = 'boss-raw.png'
output_path = 'boss-transparent.png'

input_img = Image.open(input_path)
output_img = remove(input_img, model_name='birefnet-general')
output_img.save(output_path)
```

**Model Selection:**

| Model | Size | Speed | Accuracy | Use When |
|-------|------|-------|----------|----------|
| birefnet-general | 973MB | 821ms | IoU 0.87 | Final production assets |
| u2net | 176MB | 351ms | IoU 0.89 | Rapid iteration, testing |
| isnet-general-use | 179MB | 351ms | IoU 0.82 | Lightweight fallback |

**Integration with Asset Pipeline:**
```bash
# scripts/asset-pipeline.sh
# 1. Generate image via MCP
# 2. Remove background
python scripts/remove-background.py input.png temp.png
# 3. Optimize for web
npm run optimize:image temp.png output.webp
```

---

### 6. Difficulty Adaptation System

**Recommendation:** Build custom adaptive difficulty (no library needed)

**Why no library:**
- Game-specific metrics (word length, time pressure, tile distribution)
- Existing analytics infrastructure in place
- Lightweight implementation possible with plain TypeScript

#### Implementation Approach

**1. Performance Tracking:**
```typescript
// utils/difficultyAdapter.ts
interface PlayerMetrics {
  averageWordLength: number;
  wordsPerMinute: number;
  successRate: number; // % of valid words submitted
  comboChainLength: number;
  recentPerformance: number[]; // Last 10 rounds
}

class DifficultyAdapter {
  private metrics: PlayerMetrics;

  calculateDifficulty(): DifficultyLevel {
    // K-Means-inspired clustering
    const performanceScore = this.normalizeMetrics();

    if (performanceScore > 0.7) return 'hard';
    if (performanceScore > 0.4) return 'medium';
    return 'easy';
  }

  private normalizeMetrics(): number {
    // Weighted average of metrics
    return (
      this.metrics.successRate * 0.4 +
      (this.metrics.wordsPerMinute / 10) * 0.3 +
      (this.metrics.averageWordLength / 8) * 0.2 +
      (this.metrics.comboChainLength / 5) * 0.1
    );
  }
}
```

**2. Dynamic Adjustments:**
```typescript
interface DifficultySettings {
  timeLimit: number;
  minWordLength: number;
  bonusMultiplier: number;
  specialTileFrequency: number;
}

const DIFFICULTY_PRESETS: Record<DifficultyLevel, DifficultySettings> = {
  easy: {
    timeLimit: 180, // 3 minutes
    minWordLength: 3,
    bonusMultiplier: 1.5,
    specialTileFrequency: 0.3
  },
  medium: {
    timeLimit: 120, // 2 minutes
    minWordLength: 4,
    bonusMultiplier: 1.0,
    specialTileFrequency: 0.2
  },
  hard: {
    timeLimit: 90, // 1.5 minutes
    minWordLength: 5,
    bonusMultiplier: 0.8,
    specialTileFrequency: 0.1
  }
};
```

**3. Gradual Adaptation (Avoid Frustration):**
```typescript
class SmoothDifficultyAdapter extends DifficultyAdapter {
  private readonly ADAPTATION_RATE = 0.1; // 10% per round

  adjustDifficulty(current: DifficultySettings, target: DifficultySettings): DifficultySettings {
    // Gradually interpolate towards target
    return {
      timeLimit: this.lerp(current.timeLimit, target.timeLimit, this.ADAPTATION_RATE),
      minWordLength: Math.round(this.lerp(current.minWordLength, target.minWordLength, this.ADAPTATION_RATE)),
      bonusMultiplier: this.lerp(current.bonusMultiplier, target.bonusMultiplier, this.ADAPTATION_RATE),
      specialTileFrequency: this.lerp(current.specialTileFrequency, target.specialTileFrequency, this.ADAPTATION_RATE)
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}
```

**Research Insights:**
- Use **K-Means clustering** for player segmentation (fast, efficient for numerical data)
- Track **success rates, reaction times, and accuracy**
- **Gradual adjustments** prevent frustration (10% change per round)
- Consider **player sentiment** (optional: track rage quits, long pauses)

---

## Alternatives Considered

### Animation Libraries

| Option | Why Not |
|--------|---------|
| React Spring | Redundant with Framer Motion, physics-based animations not needed for grid games |
| Anime.js | Good but GSAP is more feature-complete and already installed |
| Motion One | Newer, smaller, but less mature than GSAP. Would require migration effort |
| Rive | Overkill for this use case, requires design tool workflow |

### State Management

| Option | Why Not |
|--------|---------|
| Redux Toolkit | Already have Zustand, RTK adds 23KB for features we don't need |
| Jotai | Atomic state is overkill, Zustand's flat store is simpler |
| Recoil | Facebook library with uncertain future, Zustand is more popular |
| Context API only | Too cumbersome for complex game state, no devtools |

### Particle Systems

| Option | Why Not |
|--------|---------|
| react-particle-effect-button | Too specialized, only for button effects |
| Particles.js (old) | Deprecated, use tsParticles instead |
| Custom Canvas | Too much dev time, tsParticles handles all needs |

### Image Processing

| Option | Why Not |
|--------|---------|
| BiRefNet direct API | 973MB model too large, rembg abstracts complexity |
| SAM (Segment Anything) | Overkill, requires prompts, not optimized for background removal |
| BRIA RMBG 2.0 | Good but rembg already includes it as an option |

---

## Installation Guide

### Core Dependencies (Already Installed ✅)

```bash
# Animation
gsap@3.14.2 ✅
framer-motion@12.23.24 ✅

# State Management
zustand@5.0.10 ✅
xstate@5.24.0 ✅

# Effects
canvas-confetti@1.9.4 ✅
```

### New Dependencies to Add

```bash
# Particle effects
npm install react-particles tsparticles

# Remotion (if not already added)
npm install remotion @remotion/lottie @remotion/skia

# Python dependencies (for image processing)
pip install rembg[gpu] pillow
```

### Dev Dependencies

```bash
# TypeScript types
npm install -D @types/canvas-confetti

# Remotion CLI (optional, for rendering)
npm install -D @remotion/cli
```

---

## Performance Considerations

### Bundle Size Impact

| Addition | Gzipped Size | Impact |
|----------|--------------|--------|
| tsParticles | ~15KB | Low (lazy load) |
| Remotion | 0KB | Zero (dev-only, videos pre-rendered) |
| rembg | 0KB | Zero (Python, not bundled) |

**Total Impact:** ~15KB gzipped for runtime, negligible

### Runtime Performance

**GSAP:**
- GPU-accelerated transforms
- 60fps with 1000+ simultaneous animations
- No React re-renders (direct DOM manipulation)

**Zustand:**
- ~3KB, minimal overhead
- Selective subscriptions prevent unnecessary re-renders
- Faster than Redux (no middleware overhead)

**tsParticles:**
- Web Workers support for particle calculations
- RequestAnimationFrame-based rendering
- Configurable particle count (limit to 100-200 for mobile)

### Optimization Strategies

1. **Lazy Load Particle Effects:**
   ```typescript
   const Particles = dynamic(() => import('react-particles'), { ssr: false });
   ```

2. **Reduce Particle Count on Low-End Devices:**
   ```typescript
   const particleCount = isLowEndDevice ? 50 : 200;
   ```

3. **Use GSAP's `will-change` Optimization:**
   ```typescript
   gsap.set(element, { willChange: 'transform' });
   gsap.to(element, { x: 100, duration: 0.5 });
   gsap.set(element, { willChange: 'auto', delay: 0.5 }); // Clean up
   ```

4. **Debounce Difficulty Calculations:**
   ```typescript
   const updateDifficulty = debounce(() => {
     adapter.calculateDifficulty();
   }, 5000); // Every 5 seconds max
   ```

---

## Code Examples

### Dynamic Tile Movement (GSAP)

```typescript
// Candy Crush-style tile cascade
const cascadeTiles = (tilePositions: TilePosition[]) => {
  const timeline = gsap.timeline();

  tilePositions.forEach((tile, index) => {
    timeline.to(tile.ref.current, {
      y: tile.newY,
      duration: 0.3,
      ease: "bounce.out",
      delay: index * 0.05 // Stagger effect
    }, 0);
  });

  return timeline;
};

// Tile explosion
const explodeTile = (tileRef: RefObject<HTMLDivElement>) => {
  gsap.timeline()
    .to(tileRef.current, {
      scale: 1.5,
      duration: 0.1
    })
    .to(tileRef.current, {
      scale: 0,
      opacity: 0,
      duration: 0.2,
      ease: "power2.in"
    });
};
```

### Power-Up System (Zustand + Framer)

```typescript
// Store
export const usePowerUpStore = create<PowerUpState>((set) => ({
  activePowerUp: null,

  activatePowerUp: (type: PowerUpType) => set({ activePowerUp: type }),

  deactivatePowerUp: () => set({ activePowerUp: null })
}));

// Component
const PowerUpButton: React.FC<{ type: PowerUpType }> = ({ type }) => {
  const { activePowerUp, activatePowerUp } = usePowerUpStore();
  const isActive = activePowerUp === type;

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      animate={isActive ? {
        boxShadow: "0 0 20px rgba(191, 255, 0, 0.8)"
      } : {}}
      onClick={() => activatePowerUp(type)}
    >
      <PowerUpIcon type={type} />
    </motion.button>
  );
};
```

### Boss Battle State Machine (XState)

```typescript
import { createMachine } from 'xstate';

const bossBattleMachine = createMachine({
  id: 'bossBattle',
  initial: 'intro',
  states: {
    intro: {
      on: { START: 'phase1' }
    },
    phase1: {
      on: {
        DAMAGE: { actions: 'reduceHealth' },
        HEALTH_THRESHOLD_50: 'phase2'
      }
    },
    phase2: {
      entry: 'spawnSpecialTiles',
      on: {
        DAMAGE: { actions: 'reduceHealth' },
        HEALTH_THRESHOLD_0: 'victory'
      }
    },
    victory: {
      entry: 'showVictoryScreen',
      type: 'final'
    }
  }
});
```

---

## Sources

### Animation Libraries
- [Semaphore: Framer Motion vs GSAP](https://semaphore.io/blog/react-framer-motion-gsap)
- [DEV: Top React Animation Libraries](https://dev.to/ciphernutz/top-react-animation-libraries-framer-motion-gsap-react-spring-and-more-4854)
- [Medium: GSAP vs Framer Motion Comparison](https://tharakasachin98.medium.com/gsap-vs-framer-motion-a-comprehensive-comparison-0e4888113825)
- [Motion.dev: GSAP vs Motion](https://motion.dev/docs/gsap-vs-motion)

### State Management
- [Better Stack: Zustand vs Redux](https://betterstack.com/community/guides/scaling-nodejs/zustand-vs-redux/)
- [Zustand Official Comparison](https://zustand.docs.pmnd.rs/getting-started/comparison)
- [Nucamp: State Management in 2026](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)
- [GitHub: Zustand Repository](https://github.com/pmndrs/zustand)

### Particle Systems
- [tsParticles Official](https://particles.js.org/)
- [GitHub: tsParticles](https://github.com/tsparticles/tsparticles)
- [LogRocket: Firework Effects in React](https://blog.logrocket.com/firework-particle-effects-react-app/)
- [CSS Script: Best Particles Animation Libraries 2026](https://www.cssscript.com/best-particles-animation/)

### Remotion
- [GitHub: Remotion](https://github.com/remotion-dev/remotion)
- [Remotion Official Docs](https://www.remotion.dev/)
- [React Video Editor: Free Templates](https://www.reactvideoeditor.com/remotion-templates)
- [Remotion Skills Guide](https://gaga.art/blog/remotion-skills/)

### Image Processing
- [GitHub: rembg](https://github.com/danielgatis/rembg)
- [Cloudflare: Background Removal Models](https://blog.cloudflare.com/background-removal/)
- [Civitai: Best Background Removal Models](https://civitai.com/articles/12331/finding-the-best-background-removal-models)

### Image MCP & Prompt Engineering
- [GitHub: Claude Prompt Engineering Guide](https://github.com/ThamJiaHe/claude-prompt-engineering-guide)
- [Hugging Face: Generate Images with Claude](https://huggingface.co/blog/claude-and-mcp)
- [ReliaSoftware: Image Generation MCP Setup](https://reliasoftware.com/blog/image-generation-mcp)

### Adaptive Difficulty
- [ACM: Adaptive Difficulty and Player Experience](https://dl.acm.org/doi/10.1145/3743049.3743070)
- [MDPI: Dynamic Difficulty Adjustment Methods](https://www.mdpi.com/2813-2084/3/2/12)
- [Wikipedia: Dynamic Game Difficulty Balancing](https://en.wikipedia.org/wiki/Dynamic_game_difficulty_balancing)
- [arXiv: Personalized Dynamic Difficulty](https://arxiv.org/html/2408.06818v1)

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Animation Stack | **HIGH** | GSAP and Framer Motion are proven, widely adopted, already installed |
| State Management | **HIGH** | Zustand is ideal for game state, already in stack |
| Particle Effects | **MEDIUM** | tsParticles is comprehensive but new addition, needs testing |
| Remotion Integration | **MEDIUM** | Not currently installed, requires setup and learning curve |
| Image Pipeline | **HIGH** | rembg is mature, well-documented, proven for background removal |
| Difficulty Adaptation | **HIGH** | Custom implementation based on proven research, no library lock-in |

---

## Next Steps

1. **Install tsParticles** - Add particle system for explosions and effects
2. **Set up Remotion** - Add core packages and create boss intro template
3. **Configure Image MCP** - Set up Hugging Face MCP for image generation
4. **Install rembg** - Set up Python environment for background removal
5. **Build Difficulty Adapter** - Implement custom adaptive difficulty system
6. **Create Animation Library** - Document reusable GSAP animations for tile mechanics
7. **Test Performance** - Benchmark particle effects on low-end devices

**All recommendations prioritize existing dependencies and minimize bundle size impact while maximizing feature capability.**
