# Phase 26: Meta-Progression Foundation - Research

**Researched:** 2026-01-30
**Domain:** Meta-progression systems, game juice, visual feedback, React animations
**Confidence:** HIGH

## Summary

Meta-progression systems combine XP/leveling mechanics with virtual currency economies to create persistent player engagement across gameplay sessions. The foundation requires careful balance between progression pacing (early levels fast, later levels slower), meaningful rewards (stat upgrades, visual feedback), and accessibility (respecting reduced-motion preferences).

Game juice—the visual and audio feedback that makes actions satisfying—is achieved through screen shake (0.1-0.3s duration, 2-8px intensity), particle effects (budget 50-100 particles max), and score animations. Modern React implementations use Framer Motion (now "Motion") with performance optimizations like layout animations and useInView for viewport-aware rendering.

The codebase already has solid foundations: canvas-confetti integration, xpUtils handlers, Radix UI progress bars, and comprehensive animation CSS. The Neo-Brutalist design system (flat shapes, bold colors, hard shadows) provides strong visual identity for feedback animations.

**Primary recommendation:** Build meta-progression using existing XP infrastructure, extend animations with Framer Motion layout animations, implement adaptive particle budgets (50-100 max), and ensure all animations respect prefers-reduced-motion accessibility requirements.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Framer Motion | ^12.23.24 | React animations, layout transitions, gestures | Industry standard for React animations, declarative API, performance-optimized |
| canvas-confetti | ^1.9.4 | Celebration particle effects | Lightweight (6.5KB), performant, Web Worker support |
| @radix-ui/react-progress | ^1.1.8 | Accessible progress bars | WCAG 2.2 compliant, customizable, composable |
| React hooks | Built-in | State management for XP/currency | Native React, no dependencies needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase | ^2.86.0 | Persistent storage for XP/gold/levels | Already integrated, real-time updates |
| CSS animations | Native | Screen shake, score popups | Better performance than JS for simple effects |
| @radix-ui/react-tooltip | ^1.2.8 | Cooldown indicators, stat upgrade info | Accessible hover/focus states |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Framer Motion | GSAP | GSAP more powerful but heavier (47KB vs 20KB), requires licensing for commercial |
| canvas-confetti | Custom canvas particles | Custom gives control but reinvents wheel, confetti battle-tested |
| CSS animations | react-spring | react-spring physics-based but more complex API, CSS simpler for most cases |

**Installation:**
```bash
# Already installed:
# - framer-motion, canvas-confetti, @radix-ui/react-progress
# No additional dependencies needed
```

## Architecture Patterns

### Recommended Project Structure
```
shared/
├── utils/
│   ├── xpUtils.ts          # XP calculation, level up logic (exists)
│   ├── currencyUtils.ts    # Gold calculations, upgrade costs
│   └── progressionUtils.ts # Combined XP/currency helpers
components/
├── meta-progression/
│   ├── XpProgressBar.tsx   # Animated XP bar with level display
│   ├── LevelUpModal.tsx    # Celebration modal on level up
│   ├── CurrencyDisplay.tsx # Gold counter with animations
│   └── UpgradeShop.tsx     # Stat upgrade purchase UI
├── game-juice/
│   ├── ScreenShake.tsx     # Screen shake container component
│   ├── ParticleSystem.tsx  # Adaptive particle renderer
│   ├── ScorePopup.tsx      # Floating score animations
│   └── ComboScaling.tsx    # Nice/Great/Amazing animations (exists)
└── ui/
    └── progress.tsx        # Radix progress wrapper (exists)
```

### Pattern 1: XP Progression with Exponential Curve
**What:** Players level up quickly at first, then progressively slower
**When to use:** Prevents early churn while maintaining long-term goals
**Example:**
```typescript
// Source: Based on RuneScape formula (well-established in gaming)
// https://oldschool.runescape.wiki/w/Experience

/**
 * Calculate XP required for next level using exponential curve
 * Early levels: ~100-500 XP, Mid levels: ~1000-5000 XP, Late levels: ~10000+ XP
 */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;

  // Exponential curve: XP grows ~10% per level early, doubles every 7 levels later
  let totalXP = 0;
  for (let i = 1; i < level; i++) {
    totalXP += Math.floor(i + 300 * Math.pow(2, i / 7));
  }
  return Math.floor(totalXP / 4);
}

/**
 * Calculate current level from total XP
 */
export function getLevelFromXp(totalXP: number): number {
  let level = 1;
  while (getXpForLevel(level + 1) <= totalXP) {
    level++;
  }
  return level;
}

/**
 * Get XP progress to next level (0-100%)
 */
export function getXpProgress(totalXP: number): number {
  const currentLevel = getLevelFromXp(totalXP);
  const currentLevelXP = getXpForLevel(currentLevel);
  const nextLevelXP = getXpForLevel(currentLevel + 1);
  const xpIntoLevel = totalXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  return (xpIntoLevel / xpNeeded) * 100;
}
```

### Pattern 2: Animated Progress Bar with Framer Motion
**What:** Smooth XP bar fill with celebration on level up
**When to use:** Visual feedback for XP gains
**Example:**
```typescript
// Source: Framer Motion layout animations
// https://motion.dev/docs/react-animation

import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

export function XpProgressBar({
  currentXP,
  level,
  onLevelUp
}: XpProgressBarProps) {
  const progress = getXpProgress(currentXP);
  const previousProgress = useRef(progress);

  useEffect(() => {
    // Detect level up
    if (progress < previousProgress.current) {
      onLevelUp();
    }
    previousProgress.current = progress;
  }, [progress, onLevelUp]);

  return (
    <motion.div
      initial={{ scale: 1 }}
      animate={{ scale: progress === 100 ? 1.05 : 1 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Progress
        value={progress}
        variant="cyan"
        size="lg"
        aria-label={`Level ${level}: ${Math.round(progress)}% to next level`}
      />
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm font-bold"
      >
        Level {level}
      </motion.div>
    </motion.div>
  );
}
```

### Pattern 3: Virtual Currency Economy with Sinks
**What:** Gold earned from levels, spent on permanent upgrades
**When to use:** Prevents inflation, maintains value of currency
**Example:**
```typescript
// Source: Game economy design principles
// https://medium.com/@msahinn21/designing-game-economies-inflation-resource-management-and-balance-fa1e6c894670

/**
 * Currency configuration - sources and sinks
 */
export const CURRENCY_CONFIG = {
  sources: {
    levelUp: (level: number) => Math.floor(50 * Math.pow(1.2, level)), // Exponential gold per level
    adventureComplete: 25,
    dailyBonus: 100,
  },
  sinks: {
    upgrades: {
      timeBonus: { cost: 500, effect: '+10% time' },
      scoreBonus: { cost: 750, effect: '+5% score' },
      xpBonus: { cost: 1000, effect: '+10% XP gain' },
    },
  },
};

/**
 * Purchase upgrade with validation
 */
export function purchaseUpgrade(
  userId: string,
  upgradeId: string,
  currentGold: number
): { success: boolean; newGold?: number; error?: string } {
  const upgrade = CURRENCY_CONFIG.sinks.upgrades[upgradeId];
  if (!upgrade) return { success: false, error: 'Invalid upgrade' };

  if (currentGold < upgrade.cost) {
    return { success: false, error: 'Insufficient gold' };
  }

  const newGold = currentGold - upgrade.cost;
  // Persist to database (Supabase)
  return { success: true, newGold };
}
```

### Pattern 4: Screen Shake with CSS Transform
**What:** Camera shake on impactful events (combos, level ups)
**When to use:** High-impact moments deserving physical feedback
**Example:**
```typescript
// Source: Feel Documentation (industry-standard game feel library)
// https://feel-docs.moremountains.com/screen-shakes.html

import { useEffect, useRef } from 'react';

/**
 * Screen shake hook with intensity-based duration
 * @param intensity - Shake magnitude in pixels (2-8px recommended)
 * @param duration - Shake duration in ms (100-300ms recommended)
 */
export function useScreenShake() {
  const shakeRef = useRef<HTMLDivElement>(null);

  const shake = useCallback((intensity: number = 4, duration: number = 200) => {
    if (!shakeRef.current) return;

    // Check reduced-motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return; // Skip animation
    }

    const element = shakeRef.current;
    const keyframes = [
      { transform: 'translate(0, 0)' },
      { transform: `translate(${intensity}px, ${intensity * 0.5}px)` },
      { transform: `translate(-${intensity}px, -${intensity * 0.5}px)` },
      { transform: `translate(${intensity * 0.5}px, ${intensity}px)` },
      { transform: `translate(-${intensity * 0.5}px, -${intensity}px)` },
      { transform: 'translate(0, 0)' },
    ];

    element.animate(keyframes, {
      duration,
      easing: 'ease-in-out',
    });
  }, []);

  return { shakeRef, shake };
}

// Usage:
function GameContainer() {
  const { shakeRef, shake } = useScreenShake();

  const handleCombo = (comboLevel: number) => {
    // Shake intensity scales with combo
    const intensity = Math.min(2 + comboLevel, 8);
    shake(intensity, 150);
  };

  return <div ref={shakeRef}>{/* Game content */}</div>;
}
```

### Pattern 5: Adaptive Particle Budget
**What:** Limit particles based on device performance
**When to use:** Maintain 60fps across all devices
**Example:**
```typescript
// Source: JavaScript particle system performance optimization
// https://github.com/simeydotme/sparticles

/**
 * Detect device performance tier
 */
function getDevicePerformanceTier(): 'low' | 'medium' | 'high' {
  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 2;

  // Check device memory (if available)
  const memory = (navigator as any).deviceMemory || 4;

  if (cores <= 2 || memory <= 2) return 'low';
  if (cores <= 4 || memory <= 4) return 'medium';
  return 'high';
}

/**
 * Adaptive particle configuration
 */
export const PARTICLE_BUDGETS = {
  low: { max: 30, combo: 5, levelUp: 20 },
  medium: { max: 60, combo: 10, levelUp: 40 },
  high: { max: 100, combo: 15, levelUp: 60 },
};

export function getParticleBudget(): typeof PARTICLE_BUDGETS.high {
  const tier = getDevicePerformanceTier();
  return PARTICLE_BUDGETS[tier];
}

// Usage with canvas-confetti:
function fireComboParticles() {
  const budget = getParticleBudget();
  fireConfetti({
    particleCount: budget.combo,
    spread: 60,
    origin: { y: 0.6 },
  });
}
```

### Anti-Patterns to Avoid
- **Hardcoded XP values:** Use formulas to calculate XP requirements, not lookup tables (inflexible)
- **Unlimited particles:** Always cap particles at device-appropriate limits to prevent frame drops
- **Ignoring prefers-reduced-motion:** WCAG requirement, can cause nausea/seizures if violated
- **Linear progression:** Players lose interest when progress doesn't accelerate early or slow late
- **Currency inflation:** Without sinks (upgrades), gold accumulates and loses value

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Progress bars | Custom div animations | @radix-ui/react-progress | ARIA attributes, keyboard navigation, screen reader support built-in |
| Particle effects | Custom canvas renderer | canvas-confetti | Battle-tested performance, Web Worker support, 6.5KB bundle |
| XP curve formula | Trial-and-error values | RuneScape/WoW formulas | Decades of game balance research, proven player retention |
| Screen shake | Manual transform updates | CSS animations or WAAPI | Browser-optimized, hardware-accelerated, sub-pixel rendering |
| Layout animations | Manual position tracking | Framer Motion layoutId | Shared element transitions, automatic FLIP animations |
| Reduced-motion detection | Custom event listeners | prefers-reduced-motion media query | Standard OS integration, automatic updates |

**Key insight:** Meta-progression has deep expertise in game design and accessibility. Reinventing these systems introduces subtle bugs (XP exploits, particle lag, accessibility violations) that take years to discover and fix.

## Common Pitfalls

### Pitfall 1: Particle Performance Degradation
**What goes wrong:** Spawning 200+ particles on low-end devices causes frame drops, making game unplayable
**Why it happens:** Desktop testing doesn't reveal mobile performance issues; canvas rendering is CPU-intensive
**How to avoid:**
- Implement adaptive particle budgets (30 low / 60 medium / 100 high)
- Use object pooling to reuse particle instances
- Profile on real mobile devices (not just browser DevTools)
**Warning signs:**
- FPS drops below 30 during celebrations
- Janky scrolling or input lag after particles
- Battery drain complaints

### Pitfall 2: XP Curve Balance Issues
**What goes wrong:** Early levels too slow → player churn. Late levels too fast → no endgame retention
**Why it happens:** Linear curves feel monotonous; handpicked values miss edge cases
**How to avoid:**
- Use exponential formulas (e.g., RuneScape's `floor(n + 300 * 2^(n/7))`)
- Playtest first 10 levels AND levels 30+ specifically
- Graph XP curve before implementing
**Warning signs:**
- >50% players quit before level 5
- Players reach max level in <1 week
- Community complains about "grind"

### Pitfall 3: Accessibility Violations (Reduced Motion)
**What goes wrong:** Animations trigger vestibular disorders, causing nausea/dizziness
**Why it happens:** Developers test with animations on, forget users with disabilities
**How to avoid:**
- Wrap ALL animations in `@media (prefers-reduced-motion: reduce)` checks
- Provide static alternatives (instant state changes instead of transitions)
- Test with OS reduced-motion enabled
**Warning signs:**
- User reports of motion sickness
- WCAG 2.2.2 Pause, Stop, Hide failures
- Accessibility audit complaints

### Pitfall 4: Currency Inflation
**What goes wrong:** Gold accumulates with no meaningful sinks, becomes worthless
**Why it happens:** Only adding sources (level up rewards) without balanced sinks (purchases)
**How to avoid:**
- Design upgrades BEFORE reward amounts
- Ensure upgrade costs scale with earning rate
- Create repeatable sinks (consumables, cosmetics)
**Warning signs:**
- Players have 50,000+ gold with nothing to buy
- New upgrades feel "too cheap"
- Economy rebalance needed post-launch

### Pitfall 5: Progress Bar Accessibility Gaps
**What goes wrong:** Screen readers can't announce XP gains, keyboard users can't navigate
**Why it happens:** Developers use div + width animations without semantic HTML
**How to avoid:**
- Use `<ProgressPrimitive.Root>` from Radix UI (ARIA built-in)
- Add `aria-label="Level 5: 73% to next level"`
- Announce changes with aria-live regions
**Warning signs:**
- Screen reader says "clickable" instead of "progress 73%"
- Tab key skips over progress bar
- WCAG 1.3.1 Info and Relationships failures

## Code Examples

Verified patterns from official sources:

### Framer Motion Layout Animation
```typescript
// Source: Motion documentation (Framer Motion rebranded)
// https://motion.dev/docs/react-animation

import { motion } from 'framer-motion';

export function LevelUpModal({ level, isOpen, onClose }: LevelUpModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", duration: 0.5 }}
      className="modal-overlay"
    >
      <motion.div
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        className="modal-content"
      >
        <h2>Level Up!</h2>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="level-badge"
        >
          {level}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
```

### Accessible Progress Bar
```typescript
// Source: Radix UI Progress documentation
// https://www.radix-ui.com/primitives/docs/components/progress

import * as Progress from '@radix-ui/react-progress';

export function XpProgress({ value, level }: XpProgressProps) {
  return (
    <Progress.Root
      className="progress-root"
      value={value}
      aria-label={`Level ${level}: ${Math.round(value)}% progress to next level`}
    >
      <Progress.Indicator
        className="progress-indicator"
        style={{ width: `${value}%` }}
      />
    </Progress.Root>
  );
}
```

### Reduced-Motion Respecting Animation
```css
/* Source: MDN Web Docs - Using media queries for accessibility */
/* https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility */

.score-popup {
  animation: score-float 0.8s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .score-popup {
    animation: none;
    /* Instant position change instead */
    opacity: 0;
    transition: opacity 0.1s;
  }
}

@keyframes score-float {
  0% {
    opacity: 1;
    transform: translateY(0) scale(0.5);
  }
  100% {
    opacity: 0;
    transform: translateY(-50px) scale(1);
  }
}
```

### Canvas-Confetti with Reduced Motion
```typescript
// Source: canvas-confetti npm documentation
// https://www.npmjs.com/package/canvas-confetti

import confetti from 'canvas-confetti';

export function fireLevelUpCelebration() {
  // Check reduced-motion preference
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) {
    // Show static celebration instead (flash, no particles)
    return;
  }

  // Full animation for users who want motion
  const instance = confetti.create(canvas, {
    resize: true,
    useWorker: true, // Offload to Web Worker
    disableForReducedMotion: true, // Built-in check
  });

  instance({
    particleCount: 50,
    spread: 70,
    origin: { y: 0.6 },
  });
}
```

### Screen Shake with Reduced Motion Check
```typescript
// Source: CSS-Tricks - prefers-reduced-motion
// https://css-tricks.com/almanac/rules/m/media/prefers-reduced-motion/

export function triggerScreenShake(intensity: number = 4) {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) {
    // Provide alternative feedback (flash, color change)
    document.body.classList.add('flash-feedback');
    setTimeout(() => {
      document.body.classList.remove('flash-feedback');
    }, 100);
    return;
  }

  // Shake animation for motion-comfortable users
  const container = document.getElementById('game-container');
  if (!container) return;

  const keyframes = [
    { transform: 'translate(0, 0)' },
    { transform: `translate(${intensity}px, ${intensity * 0.5}px)` },
    { transform: `translate(-${intensity}px, -${intensity * 0.5}px)` },
    { transform: 'translate(0, 0)' },
  ];

  container.animate(keyframes, {
    duration: 200,
    easing: 'ease-in-out',
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual ARIA | Radix UI primitives | 2023+ | Progress bars now WCAG 2.2 compliant by default |
| react-motion | Framer Motion (now "Motion") | 2024-2025 | Declarative API, 3x smaller bundle, layout animations |
| Fixed particle counts | Adaptive budgets | 2025+ | Mobile devices maintain 60fps during celebrations |
| window.requestAnimationFrame | CSS animations + WAAPI | 2024+ | Browser-optimized, hardware-accelerated |
| Linear XP curves | Exponential formulas | Classic (RuneScape 2001) | Proven retention over 20+ years |
| Ignoring reduced-motion | prefers-reduced-motion required | WCAG 2.1 (2018) | Legal requirement in EU/Canada, accessibility win |

**Deprecated/outdated:**
- **react-motion library**: Unmaintained since 2018, use Framer Motion instead
- **hardcoded XP tables**: Inflexible, use formulas (RuneScape/WoW patterns)
- **unlimited particles**: Causes mobile lag, use adaptive budgets (30-100 range)
- **jQuery animations**: Legacy, use CSS animations or Framer Motion
- **Flash-based particles**: Dead technology, use canvas-confetti

## Open Questions

Things that couldn't be fully resolved:

1. **XP Curve Tuning for Adventure Mode**
   - What we know: Standard exponential curves work for continuous play, adventure has discrete levels
   - What's unclear: Optimal XP rewards per adventure level difficulty tier
   - Recommendation: Start with formula `baseXP * (1 + difficultyMultiplier)`, playtest levels 1-10 and 30+ specifically

2. **Stat Upgrade Balance**
   - What we know: +10% time and +5% score are mentioned as examples
   - What's unclear: Max upgrade stacks, diminishing returns, cost scaling
   - Recommendation: Cap upgrades at 5 stacks (+50% time / +25% score max), exponential cost scaling (500 → 750 → 1125 → ...)

3. **Particle Performance on Budget Android Devices**
   - What we know: Desktop browsers handle 200+ particles, mobile recommended 50-80
   - What's unclear: Specific performance on Android 6.0-8.0 devices (common in emerging markets)
   - Recommendation: Test on real low-end devices (Samsung Galaxy A10, Redmi 9A), potentially add user setting to disable particles

4. **Level Cap and Long-Term Progression**
   - What we know: Exponential curves need eventual caps to prevent unreachable goals
   - What's unclear: Soft cap (slower progression) vs hard cap (max level), prestige systems
   - Recommendation: Start with soft cap at level 50 (switch to linear +10,000 XP per level), evaluate retention data

## Sources

### Primary (HIGH confidence)
- [RuneScape XP Formula](https://oldschool.runescape.wiki/w/Experience) - Exponential curve mathematics
- [Radix UI Progress](https://www.radix-ui.com/primitives/docs/components/progress) - Accessible progress bars
- [Motion (Framer Motion) Docs](https://motion.dev/docs/react-animation) - React animation API
- [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) - Accessibility media query
- [WCAG 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html) - Animation requirements
- [canvas-confetti npm](https://www.npmjs.com/package/canvas-confetti) - Particle library documentation

### Secondary (MEDIUM confidence)
- [Designing Game Economies (Medium, Jan 2026)](https://medium.com/@msahinn21/designing-game-economies-inflation-resource-management-and-balance-fa1e6c894670) - Currency balance
- [Game Juice Overview (GameAnalytics)](https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design) - Visual feedback principles
- [Screen Shake Best Practices (Feel Docs)](https://feel-docs.moremountains.com/screen-shakes.html) - Intensity/duration values
- [Sparticles Performance](https://github.com/simeydotme/sparticles) - Particle optimization techniques
- [GameDev RPG Progression Math](https://www.davideaversa.it/blog/gamedesign-math-rpg-level-based-progression/) - XP curve formulas

### Tertiary (LOW confidence)
- [Virtual Currencies Core to Game Design (The Koalition, 2026)](https://thekoalition.com/2026/virtual-currencies-have-become-core-to-modern-game-design) - Industry trends
- [Framer Motion Performance Tips (Till It's Done)](https://tillitsdone.com/blogs/framer-motion-performance-tips/) - Optimization patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already integrated, verified versions
- Architecture: HIGH - Patterns from established games (RuneScape) and official docs (Radix, Motion)
- Pitfalls: HIGH - Based on real accessibility violations (WCAG) and performance research

**Research date:** 2026-01-30
**Valid until:** 30-60 days (Framer Motion stable, WCAG unchanging, game design timeless)

---

## Sources Referenced

### Game Design & Progression
- [How to Implement a Leveling System in RPG | XP in RPGs](https://howtomakeanrpg.com/r/a/how-to-make-an-rpg-levels.html)
- [Meta Progression - Lark Suite Gaming Glossary](https://www.larksuite.com/en_us/topics/gaming-glossary/meta-progression)
- [Quantitative design - How to define XP thresholds? - Game Developer](https://www.gamedeveloper.com/design/quantitative-design---how-to-define-xp-thresholds-)
- [Level systems and character growth in RPG games - Pav Creations](https://pavcreations.com/level-systems-and-character-growth-in-rpg-games/)
- [RPG leveling Systems to keep players coming back - Medium](https://medium.com/@jonathonmcclendon/rpg-leveling-systems-to-keep-players-coming-back-db83b79a9a04)
- [Mathematics of XP - Only a Game](https://onlyagame.typepad.com/only_a_game/2006/08/mathematics_of_.html)
- [GameDesign Math: RPG Level-based Progression - Davide Aversa](https://www.davideaversa.it/blog/gamedesign-math-rpg-level-based-progression/)
- [Example Level Curve Formulas for Game Progression](https://www.designthegame.com/learning/courses/course/fundamentals-level-curve-design/example-level-curve-formulas-game-progression)
- [Experience - OSRS Wiki](https://oldschool.runescape.wiki/w/Experience)

### Game Juice & Visual Feedback
- [Squeezing more juice out of your game design! - GameAnalytics](https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design)
- [How To Improve Game Feel In Three Easy Ways - GameDev Academy](https://gamedevacademy.org/game-feel-tutorial/)
- [Juice in Game Design: Making Your Games Feel Amazing - Blood Moon Interactive](https://www.bloodmooninteractive.com/articles/juice.html)
- [Juice It Good: Adding Camera Shake To Your Game - Medium](https://gt3000.medium.com/juice-it-adding-camera-shake-to-your-game-e63e1a16f0a6)
- [What makes for good visual game juice? - Medium](https://medium.com/swlh/what-makes-for-good-visual-game-juice-e63cb8ba2068)
- [Screen Shakes - Feel Documentation](https://feel-docs.moremountains.com/screen-shakes.html)
- [Analysis of Screenshake Types - Dave Tech](http://www.davetech.co.uk/gamedevscreenshake)

### React Animation & Performance
- [The Ultimate Guide to Framer Motion - Medium](https://medium.com/@pareekpnt/mastering-framer-motion-a-deep-dive-into-modern-animation-for-react-0e71d86ffdf6)
- [Creating React animations in Motion (formerly Framer Motion) - LogRocket](https://blog.logrocket.com/creating-react-animations-with-motion/)
- [Framer Motion Tips for Performance in React - Till It's Done](https://tillitsdone.com/blogs/framer-motion-performance-tips/)
- [Motion — JavaScript & React animation library](https://motion.dev/)
- [How to Use Framer Motion for Advanced Animations in React](https://blog.pixelfreestudio.com/how-to-use-framer-motion-for-advanced-animations-in-react/)

### Particle Systems & Performance
- [Sparticles - GitHub](https://github.com/simeydotme/sparticles)
- [JavaScript Particles Background: Complete 2026 Guide - Copy Programming](https://copyprogramming.com/howto/javascript-particles-background-js-code-example)
- [JavaScript vs WebAssembly performance for Canvas particle system - Medium](https://medium.com/source-true/javascript-vs-webassembly-performance-for-canvas-particle-system-4c4a526145d8)
- [Optimizing Particle Background Performance with Quadtrees](https://blog.ebemunk.com/optimizing-particle-background-performance-with-quadtrees/)
- [canvas-confetti - npm](https://www.npmjs.com/package/canvas-confetti)
- [canvas-confetti - GitHub](https://github.com/catdad/canvas-confetti)

### Accessibility
- [prefers-reduced-motion - CSS | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
- [Using media queries for accessibility - CSS | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility)
- [C39: Using the CSS prefers-reduced-motion query - WCAG Technique](https://www.w3.org/WAI/WCAG21/Techniques/css/C39)
- [Accessible Animations in React with "prefers-reduced-motion" - Josh W. Comeau](https://www.joshwcomeau.com/react/prefers-reduced-motion/)
- [Accessibility Support for ProgressBar - Telerik Design System](https://www.telerik.com/design-system/docs/components/progressbar/accessibility/)
- [Progress bar accessibility - Carbon Design System](https://carbondesignsystem.com/components/progress-bar/accessibility/)
- [ARIA: progressbar role - MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role)

### Virtual Economy
- [Virtual Currencies Have Become Core to Modern Game Design - The Koalition](https://thekoalition.com/2026/virtual-currencies-have-become-core-to-modern-game-design)
- [Designing Game Economies: Inflation, Resource Management, and Balance - Medium](https://medium.com/@msahinn21/designing-game-economies-inflation-resource-management-and-balance-fa1e6c894670)
- [Balance virtual economies - Roblox Documentation](https://create.roblox.com/docs/production/game-design/balance-virtual-economies)
- [I designed economies for $150M games—here's my ultimate handbook - Game Developer](https://www.gamedeveloper.com/production/i-designed-economies-for-150m-games-here-s-my-ultimate-handbook)
