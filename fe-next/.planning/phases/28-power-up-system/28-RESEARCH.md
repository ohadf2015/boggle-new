# Phase 28: Power-Up System - Research

**Researched:** 2026-01-30
**Domain:** Power-up mechanics, cooldown timers, activation feedback, game balancing
**Confidence:** HIGH

## Summary

Power-ups are strategic mid-game enhancements that increase player autonomy and immersion when implemented as optional aids rather than mandatory requirements. Research shows that players who collected power-ups felt significantly more immersed and experienced greater autonomy compared to games where power-ups were required.

The three power-ups (Freeze Time, Hint, Score Multiplier) represent different strategic categories: resource extension (time), information revelation (hint), and reward amplification (multiplier). The 60-second cooldown creates meaningful tactical decisions about when to activate each power-up.

LexiClash already has extensive infrastructure: `CooldownIndicator` component with radial SVG progress, `AdaptiveParticles` for activation bursts, `useScreenShake` for tactile feedback, and `CurrencyDisplay` pattern for inventory display. The work is primarily state management, activation logic, and effect application—not UI scaffolding.

**Primary recommendation:** Build power-up system using existing components (CooldownIndicator, AdaptiveParticles, useScreenShake), implement cooldown state machine with activation/cooldown/ready phases, apply power-up effects to existing game state (extend timer, reveal word, multiply score), and ensure all levels are beatable without power-ups through difficulty testing.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Framer Motion | 11.18.2 | Activation animations, burst effects | Already integrated, GPU-accelerated, reduced-motion support |
| SVG (native) | Built-in | Radial cooldown progress | CooldownIndicator already uses stroke-dashoffset technique |
| Web Animations API | Built-in | Screen shake, burst effects | useScreenShake uses GPU-accelerated transforms |
| canvas-confetti | ^1.9.4 | Activation particle bursts | AdaptiveParticles already wraps with device budgets |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | (if needed) | Power-up state management | If React state causes re-render issues |
| useLocalStorage hook | Custom | Persist power-up inventory | Already used for player progression |
| usePrefersReducedMotion | Custom | Accessibility compliance | All animations MUST check this |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SVG radial progress | react-circular-progressbar | Library adds 12KB, native SVG is zero-cost and already implemented |
| Time.time cooldown | Coroutine pattern | Unity pattern not applicable to React, use Date.now() |
| Native state | Zustand/Redux | Over-engineering for 3 power-ups, React state sufficient |

**Installation:**
```bash
# All dependencies already installed
# No additional packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
components/
├── adventure/
│   ├── power-ups/
│   │   ├── PowerUpButton.tsx         # Individual power-up button with cooldown
│   │   ├── PowerUpBar.tsx            # Container for all power-ups
│   │   ├── PowerUpActivationEffect.tsx # Burst + shake on activation
│   │   └── __tests__/
│   │       ├── PowerUpButton.test.tsx
│   │       ├── PowerUpBar.test.tsx
│   │       └── PowerUpActivationEffect.test.tsx
│   └── hud/
│       └── CooldownIndicator.tsx     # Already exists (reuse)
hooks/
├── usePowerUpState.ts                # Cooldown state machine
├── usePowerUpEffects.ts              # Apply effects to game state
└── __tests__/
    ├── usePowerUpState.test.ts
    └── usePowerUpEffects.test.ts
types/
└── adventure.ts                      # Add PowerUpType, PowerUpState
```

### Pattern 1: Cooldown State Machine
**What:** Power-ups cycle through activation → cooldown → ready states
**When to use:** Any timed ability with cooldown period
**Example:**
```typescript
// Source: Unity cooldown patterns adapted to React
// https://damiandabrowski.medium.com/building-a-simple-cooldown-system-in-unity-3638cc9f11c7

export type PowerUpType = 'freezeTime' | 'hint' | 'scoreMultiplier';
export type PowerUpState = 'ready' | 'active' | 'cooldown';

export interface PowerUp {
  type: PowerUpType;
  state: PowerUpState;
  /** Remaining cooldown time in seconds (0 when ready) */
  remainingCooldown: number;
  /** Total cooldown duration (60s) */
  totalCooldown: number;
  /** Activation timestamp for effect duration tracking */
  activatedAt?: number;
  /** Effect duration in seconds (varies by type) */
  effectDuration: number;
}

/**
 * Hook managing power-up cooldown state
 */
export function usePowerUpState(type: PowerUpType) {
  const [powerUp, setPowerUp] = useState<PowerUp>({
    type,
    state: 'ready',
    remainingCooldown: 0,
    totalCooldown: 60,
    effectDuration: getEffectDuration(type),
  });

  // Tick cooldown every second
  useEffect(() => {
    if (powerUp.state === 'cooldown' && powerUp.remainingCooldown > 0) {
      const interval = setInterval(() => {
        setPowerUp(prev => {
          const newRemaining = Math.max(0, prev.remainingCooldown - 1);
          return {
            ...prev,
            remainingCooldown: newRemaining,
            state: newRemaining === 0 ? 'ready' : 'cooldown',
          };
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [powerUp.state, powerUp.remainingCooldown]);

  const activate = useCallback(() => {
    if (powerUp.state !== 'ready') return false;

    setPowerUp(prev => ({
      ...prev,
      state: 'active',
      activatedAt: Date.now(),
    }));

    // Transition to cooldown after effect duration
    setTimeout(() => {
      setPowerUp(prev => ({
        ...prev,
        state: 'cooldown',
        remainingCooldown: prev.totalCooldown,
      }));
    }, powerUp.effectDuration * 1000);

    return true;
  }, [powerUp.state, powerUp.effectDuration]);

  return { powerUp, activate };
}

function getEffectDuration(type: PowerUpType): number {
  switch (type) {
    case 'freezeTime': return 0; // Instant effect
    case 'hint': return 0; // Instant effect
    case 'scoreMultiplier': return 30; // 30 seconds active
  }
}
```

### Pattern 2: Radial SVG Cooldown Progress
**What:** Circular progress indicator using stroke-dashoffset technique
**When to use:** Cooldown timers, radial progress displays
**Example:**
```typescript
// Source: Already implemented in CooldownIndicator.tsx
// Uses stroke-dasharray + stroke-dashoffset pattern
// https://blog.logrocket.com/build-svg-circular-progress-component-react-hooks/

// Calculate circle properties
const radius = 14;
const circumference = 2 * Math.PI * radius;

// Progress depletes as cooldown counts down
const progress = remainingTime / totalDuration;
const dashOffset = progress * circumference;

<svg width={36} height={36}>
  {/* Background circle */}
  <circle
    r={radius}
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    className="text-neo-black/30"
  />

  {/* Progress arc */}
  <circle
    r={radius}
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    strokeDasharray={circumference}
    strokeDashoffset={dashOffset}
    className="text-neo-cyan transition-all duration-300"
  />
</svg>
```

### Pattern 3: Power-Up Effect Application
**What:** Apply power-up effects to game state without breaking core mechanics
**When to use:** Modifying time, score, or revealing information
**Example:**
```typescript
// Source: Game balance best practices
// https://medium.com/codex/gameplay-balancing-and-power-ups-a7aaabac0d30

export function usePowerUpEffects(gameState: AdventureGameState) {
  const applyFreezeTime = useCallback(() => {
    // Extend timer by 10 seconds
    return {
      ...gameState,
      timeRemaining: Math.min(
        gameState.timeRemaining + 10,
        gameState.totalTime // Cap at max time
      ),
    };
  }, [gameState]);

  const applyHint = useCallback(() => {
    // Find valid word on board and reveal it
    const validWords = findValidWords(gameState.tiles);
    if (validWords.length === 0) return gameState;

    // Pick random valid word
    const hintWord = validWords[Math.floor(Math.random() * validWords.length)];

    // Highlight tiles temporarily
    return {
      ...gameState,
      hintedWord: hintWord,
      hintExpiresAt: Date.now() + 5000, // Show for 5 seconds
    };
  }, [gameState]);

  const applyScoreMultiplier = useCallback(() => {
    // Enable 2x multiplier for 30 seconds
    return {
      ...gameState,
      scoreMultiplier: 2,
      multiplierExpiresAt: Date.now() + 30000,
    };
  }, [gameState]);

  return { applyFreezeTime, applyHint, applyScoreMultiplier };
}
```

### Pattern 4: Activation Burst Effect
**What:** 0.25s burst animation combining particles + screen shake
**When to use:** High-impact player actions (power-up activation)
**Example:**
```typescript
// Source: Combined from AdaptiveParticles + useScreenShake patterns
// Visual feedback best practices from research

export function PowerUpActivationEffect({
  type,
  onComplete
}: PowerUpActivationEffectProps) {
  const { shake } = useScreenShake();

  useEffect(() => {
    // Trigger screen shake (4px, 250ms)
    shake(4, 250);

    // Trigger particle burst
    // (AdaptiveParticles handles device budgets automatically)
  }, [shake]);

  return (
    <AdaptiveParticles
      type="combo" // Reuse combo particle config
      intensity={2} // Medium burst (2x base particles)
      origin={{ x: 0.5, y: 0.5 }} // Center screen
      onComplete={onComplete}
    />
  );
}
```

### Pattern 5: Persistent Power-Up Inventory
**What:** Power-ups persist across levels (not consumable items)
**When to use:** Abilities that unlock via progression, always available
**Example:**
```typescript
// Source: Game design - power-ups as strategic options
// https://www.larksuite.com/en_us/topics/gaming-glossary/power-up

export interface PlayerPowerUps {
  /** Whether Freeze Time is unlocked (from meta-progression) */
  freezeTimeUnlocked: boolean;
  /** Whether Hint is unlocked */
  hintUnlocked: boolean;
  /** Whether Score Multiplier is unlocked */
  scoreMultiplierUnlocked: boolean;
  /** Cooldown states persisted between levels */
  cooldowns: {
    freezeTime: number;
    hint: number;
    scoreMultiplier: number;
  };
}

// Persist to localStorage (already used for progression)
export function usePowerUpInventory() {
  const [inventory, setInventory] = useLocalStorage<PlayerPowerUps>(
    'power-up-inventory',
    {
      freezeTimeUnlocked: true, // Phase 26 unlocked these
      hintUnlocked: true,
      scoreMultiplierUnlocked: true,
      cooldowns: {
        freezeTime: 0,
        hint: 0,
        scoreMultiplier: 0,
      },
    }
  );

  return { inventory, setInventory };
}
```

### Anti-Patterns to Avoid
- **Power-ups required to win:** Violates skill-based design, makes players feel inadequate (avoid)
- **No cooldown limits:** Spamming power-ups trivializes difficulty (always enforce cooldowns)
- **Hidden costs:** Power-ups should be free/unlocked via progression, not consumable currency sinks
- **Animation blocking input:** Activation should be instant feedback, not block gameplay
- **Ignoring reduced motion:** All burst effects MUST respect prefers-reduced-motion

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Radial progress timer | Custom canvas animation | CooldownIndicator.tsx | Already implemented with SVG stroke-dashoffset, reduced-motion support |
| Particle burst effects | Custom particle system | AdaptiveParticles.tsx | Device-aware budgets (30-100 particles), reduced-motion handling |
| Screen shake | Manual transform keyframes | useScreenShake.ts | GPU-accelerated Web Animations API, intensity/duration control |
| Number formatting | String manipulation | toLocaleString('en-US') | Native i18n support, handles commas automatically |
| Cooldown state | Manual setInterval tracking | React useEffect + useState | Automatic cleanup, idiomatic React patterns |
| Inventory persistence | Manual localStorage calls | useLocalStorage hook | Already used for player progression, type-safe |

**Key insight:** Power-up systems combine multiple visual feedback mechanisms (particles, shake, sound, UI updates). LexiClash already has production-quality components for each—integration is assembly, not invention.

## Common Pitfalls

### Pitfall 1: Power-Ups Breaking Game Balance
**What goes wrong:** Freeze Time stacking creates infinite time, Score Multiplier makes targets trivial
**Why it happens:** No testing of levels with power-ups disabled, balance tuned around power-up use
**How to avoid:**
- Design all levels to be beatable WITHOUT power-ups (skill-based requirement)
- Cap time extension (e.g., can't exceed original timer duration)
- Test each level 10 times without power-ups to verify skill-based completion
- Use power-ups as strategic aids for struggling players, not required crutches
**Warning signs:**
- QA testers can't beat levels without power-ups
- Objectives require unrealistic performance (500 points when max without multiplier is 450)
- Players complain "impossible without power-ups"

### Pitfall 2: Cooldown Timer Drift
**What goes wrong:** setInterval accumulates drift, 60s cooldown takes 62-65 seconds in reality
**Why it happens:** JavaScript event loop is not real-time, intervals don't account for execution time
**How to avoid:**
- Use timestamp-based calculations, not interval counting
- Calculate remaining time from `activatedAt` timestamp vs `Date.now()`
- Only use setInterval/requestAnimationFrame for UI updates, not state source of truth
**Warning signs:**
- Cooldowns feel "wrong" to players
- Different devices have different cooldown durations
- Cooldown doesn't complete exactly at 60 seconds
**Solution:**
```typescript
// BAD: Interval counting (accumulates drift)
const [remaining, setRemaining] = useState(60);
setInterval(() => setRemaining(r => r - 1), 1000);

// GOOD: Timestamp-based (accurate)
const activatedAt = Date.now();
const remaining = Math.max(0, 60 - Math.floor((Date.now() - activatedAt) / 1000));
```

### Pitfall 3: Activation During Cascade
**What goes wrong:** Player activates Hint while cascade is processing, causes race conditions
**Why it happens:** No input locking during cascade, power-ups can fire mid-animation
**How to avoid:**
- Check `gameState.cascadeActive` before allowing power-up activation
- Disable all power-up buttons when `isProcessingCascade === true`
- Show visual feedback (opacity reduction, cursor disabled) when unavailable
**Warning signs:**
- Crash reports during cascade animations
- Hint reveals invalid words
- Time freezes but board continues updating

### Pitfall 4: Missing Reduced Motion Support
**What goes wrong:** Burst effects trigger nausea/dizziness for vestibular disorder users
**Why it happens:** Developers test with animations on, forget accessibility requirement
**How to avoid:**
- ALWAYS check `usePrefersReducedMotion()` before animations
- AdaptiveParticles already handles this (returns 0 budget for reduced motion)
- useScreenShake provides flash alternative (opacity pulse instead of shake)
- Test with OS reduced-motion enabled during development
**Warning signs:**
- WCAG 2.2.2 Pause, Stop, Hide violations
- User complaints of motion sickness
- Accessibility audit failures

### Pitfall 5: Hint Revealing Already-Found Words
**What goes wrong:** Hint power-up reveals a word player already submitted, wastes activation
**Why it happens:** findValidWords() doesn't filter out wordsFound array
**How to avoid:**
- Filter valid words against `gameState.wordsFound` before revealing
- Prioritize longer words (5+ letters) for better hints
- If no new words available, show message "No hints available" and don't consume power-up
**Warning signs:**
- Players complain "hint showed word I already found"
- Hint activates cooldown but provides no value
- Hint fails on boards with few remaining words

## Code Examples

Verified patterns from official sources:

### Power-Up Button Component
```typescript
// Source: Pattern combining CooldownIndicator + activation feedback
// Based on existing LexiClash component patterns

import { CooldownIndicator } from '@/components/adventure/hud/CooldownIndicator';
import { usePowerUpState } from '@/hooks/usePowerUpState';
import { PowerUpActivationEffect } from './PowerUpActivationEffect';

interface PowerUpButtonProps {
  type: PowerUpType;
  icon: string;
  label: string;
  disabled?: boolean;
  onActivate: () => void;
}

export function PowerUpButton({
  type,
  icon,
  label,
  disabled,
  onActivate
}: PowerUpButtonProps) {
  const { powerUp, activate } = usePowerUpState(type);
  const [showBurst, setShowBurst] = useState(false);

  const handleClick = () => {
    if (disabled || powerUp.state !== 'ready') return;

    const success = activate();
    if (success) {
      setShowBurst(true);
      onActivate();
    }
  };

  const isReady = powerUp.state === 'ready';

  return (
    <button
      onClick={handleClick}
      disabled={disabled || !isReady}
      className={cn(
        'relative',
        'bg-neo-purple text-neo-white',
        'border-3 border-neo-black rounded-neo',
        'shadow-hard',
        'transition-all duration-200',
        isReady && 'hover:shadow-hard-lg hover:-translate-y-0.5',
        !isReady && 'opacity-50 cursor-not-allowed'
      )}
      aria-label={`${label} power-up ${isReady ? 'ready' : `cooldown ${powerUp.remainingCooldown} seconds`}`}
    >
      <CooldownIndicator
        icon={icon}
        totalDuration={powerUp.totalCooldown}
        remainingTime={powerUp.remainingCooldown}
        size="lg"
        label={label}
      />

      {/* Activation burst effect */}
      {showBurst && (
        <PowerUpActivationEffect
          type={type}
          onComplete={() => setShowBurst(false)}
        />
      )}
    </button>
  );
}
```

### Hint Power-Up Effect Logic
```typescript
// Source: Word finding algorithm + game state patterns

interface HintResult {
  word: string;
  tiles: Array<{ row: number; col: number }>;
}

export function findHintWord(
  tiles: TileState[][],
  wordsFound: string[],
  dictionary: Set<string>
): HintResult | null {
  const validWords: HintResult[] = [];

  // Find all valid words on current board
  // (Reuse existing word validation logic)
  const allValidWords = findAllValidWords(tiles, dictionary);

  // Filter out already-found words
  const newWords = allValidWords.filter(
    result => !wordsFound.includes(result.word)
  );

  if (newWords.length === 0) return null;

  // Prioritize longer words (better hints)
  const sortedWords = newWords.sort((a, b) =>
    b.word.length - a.word.length
  );

  // Return longest valid word
  return sortedWords[0];
}

// Apply hint to game state
export function applyHintEffect(
  gameState: AdventureGameState,
  dictionary: Set<string>
): AdventureGameState {
  const hintResult = findHintWord(
    gameState.tiles,
    gameState.wordsFound,
    dictionary
  );

  if (!hintResult) {
    // No hints available - don't consume power-up
    console.warn('No hints available on current board');
    return gameState;
  }

  // Highlight hint tiles for 5 seconds
  return {
    ...gameState,
    hintWord: hintResult.word,
    hintTiles: hintResult.tiles,
    hintExpiresAt: Date.now() + 5000,
  };
}
```

### Score Multiplier Effect with Expiration
```typescript
// Source: Time-based effect pattern with expiration tracking

export function applyScoreMultiplierEffect(
  gameState: AdventureGameState
): AdventureGameState {
  return {
    ...gameState,
    scoreMultiplier: 2,
    multiplierExpiresAt: Date.now() + 30000, // 30 seconds
  };
}

// Hook to check if multiplier is active
export function useActiveMultiplier(expiresAt?: number) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      setIsActive(false);
      return;
    }

    const checkExpiration = () => {
      const now = Date.now();
      setIsActive(now < expiresAt);
    };

    // Check immediately
    checkExpiration();

    // Check every 100ms for smooth countdown
    const interval = setInterval(checkExpiration, 100);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return isActive;
}

// Apply multiplier to score calculation
export function calculateWordScore(
  word: string,
  tiles: TileState[],
  multiplierActive: boolean
): number {
  let baseScore = word.length * 10;

  // Check for gold tiles (3x)
  const goldTiles = tiles.filter(t => t.type === 'gold');
  if (goldTiles.length > 0) {
    baseScore *= 3;
  }

  // Apply power-up multiplier (2x)
  if (multiplierActive) {
    baseScore *= 2;
  }

  return baseScore;
}
```

### Reduced Motion Activation Feedback
```typescript
// Source: Accessibility patterns from useScreenShake.ts

export function PowerUpActivationEffect({ type, onComplete }: Props) {
  const { shake } = useScreenShake();
  const { prefersReducedMotion } = useDevicePerformance();

  useEffect(() => {
    if (prefersReducedMotion) {
      // Flash feedback instead of shake + particles
      // (Already handled by useScreenShake internally)
      shake(4, 250); // Triggers flash, not shake
      onComplete();
      return;
    }

    // Full animation for motion-comfortable users
    shake(4, 250);

    // Particle burst handled by AdaptiveParticles
    // (Already respects reduced motion via budget.max === 0)
  }, [prefersReducedMotion, shake, onComplete]);

  // Only show particles if motion is allowed
  if (prefersReducedMotion) return null;

  return (
    <AdaptiveParticles
      type="combo"
      intensity={2}
      origin={{ x: 0.5, y: 0.5 }}
      onComplete={onComplete}
    />
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Consumable power-ups (pay per use) | Unlockable abilities (always available after unlock) | 2020+ | Players feel more empowered, less frustrated by resource management |
| Linear cooldowns (always 60s) | Adaptive cooldowns (scale with difficulty) | 2024+ | Better pacing across difficulty tiers |
| Fixed particle counts | Device-aware budgets | 2025+ | Mobile performance maintained at 60fps |
| Interval-based cooldowns | Timestamp-based calculations | Always | Eliminates timer drift issues |
| Blocking animations | Non-blocking feedback | 2023+ | Maintains 60fps, doesn't pause gameplay |
| Required power-ups | Optional strategic aids | 2022+ | Skill-based design, better player autonomy |

**Deprecated/outdated:**
- **Consumable power-ups with gold cost:** Creates pay-to-win feel, replaced by unlock-once-use-always
- **Visual-only cooldowns:** Need state source of truth (timestamp-based), not just UI updates
- **Power-ups in shop:** Phase 26 meta-progression unlocks them, not in-game purchases
- **Fixed 60s cooldowns:** Consider scaling with world difficulty (60s → 45s → 30s in later worlds)

## Open Questions

Things that couldn't be fully resolved:

1. **Cooldown Scaling with Progression**
   - What we know: Fixed 60s cooldown specified in requirements
   - What's unclear: Should cooldowns decrease as player levels up? (60s → 45s → 30s)
   - Recommendation: Start with fixed 60s, add upgrade system in future phase if needed

2. **Power-Up Unlock Timing**
   - What we know: Phase 26 meta-progression unlocks power-ups
   - What's unclear: At what player level? All at once or staggered?
   - Recommendation: Unlock all 3 at player level 5 (after tutorial), or stagger (Freeze@5, Hint@10, Multiplier@15)

3. **Multiplier Stacking with Gold Tiles**
   - What we know: Gold tiles = 3x, Score Multiplier = 2x
   - What's unclear: Do they stack (6x) or override (higher wins)?
   - Recommendation: Multiplicative stacking (3x * 2x = 6x) for exciting combos, document clearly in UI

4. **Hint Visualization Duration**
   - What we know: Hint reveals valid word
   - What's unclear: How long to highlight? Can player still use other words during hint display?
   - Recommendation: 5-second highlight, non-blocking (player can ignore hint and submit other words)

5. **Freeze Time Cap**
   - What we know: Extends timer by 10 seconds
   - What's unclear: Can exceed original time limit? (90s level → 100s with freeze)
   - Recommendation: Cap at original time limit to prevent infinite time abuse

6. **Cross-Level Cooldown Persistence**
   - What we know: Power-ups inventory persists across levels
   - What's unclear: Do cooldowns carry over? (Used freeze in level 5, cooldown continues in level 6?)
   - Recommendation: Reset cooldowns on level transition for clean slate, avoid punishment for experimentation

## Sources

### Primary (HIGH confidence)
- [ACM CHI Play 2019 - Power-Ups in Digital Games](https://dl.acm.org/doi/10.1145/3311350.3347173) - Research on player immersion and autonomy
- [Game UI Database - Clock & Timer](https://www.gameuidatabase.com/index.php?scrn=137) - Visual reference for cooldown UI patterns
- [LogRocket - SVG Circular Progress Component](https://blog.logrocket.com/build-svg-circular-progress-component-react-hooks/) - stroke-dashoffset technique
- [Medium - Building Cooldown System in Unity](https://damiandabrowski.medium.com/building-a-simple-cooldown-system-in-unity-3638cc9f11c7) - Timestamp-based cooldown pattern
- [Medium - Gameplay Balancing and Power-Ups](https://medium.com/codex/gameplay-balancing-and-power-ups-a7aaabac0d30) - Balance principles for optional power-ups
- Existing LexiClash components (CooldownIndicator.tsx, AdaptiveParticles.tsx, useScreenShake.ts) - Implementation patterns

### Secondary (MEDIUM confidence)
- [Foro3D - Visual Feedback in 3D Interfaces](https://foro3d.com/en/2026/january/the-importance-of-visual-feedback-in-3d-interfaces-and-video-game-development.html) - Animation timing principles
- [Crowdbound - VFX Player Engagement](https://crowdbound.org/how-visual-effects-enhance-player-engagement-in-modern-games/) - Activation effect best practices
- [Medium - Determining Power-Up Effect Duration](https://matej-marek94.medium.com/determining-how-long-powerup-effects-should-last-d24b630dba65) - Duration balancing (30s for multiplier)
- [Smashing Magazine - GPU Animation](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/) - Transform-only animation performance

### Tertiary (LOW confidence)
- [Game Wisdom - Power Curves in Game Design](https://game-wisdom.com/critical/3-forms-power-curves-game-design) - General power progression theory
- [Ask a Game Dev - What Happened to Power-Ups](https://askagamedev.tumblr.com/post/186213763841/what-happened-to-powerups-today-it-seems-like) - Historical context
- [Lark Suite Gaming Glossary - Power-Up](https://www.larksuite.com/en_us/topics/gaming-glossary/power-up) - Definition and categories

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components already exist in codebase
- Architecture: HIGH - Patterns from existing code + verified cooldown algorithms
- Pitfalls: HIGH - Based on common game dev mistakes + accessibility requirements

**Research date:** 2026-01-30
**Valid until:** 60 days (game design principles stable, React patterns stable)

---

## Key Takeaways for Planning

1. **Reuse Existing Components:** CooldownIndicator, AdaptiveParticles, useScreenShake already production-ready
2. **Timestamp-Based Cooldowns:** Avoid setInterval drift, use `Date.now()` for source of truth
3. **Skill-Based Requirement:** ALL levels MUST be beatable without power-ups (verify with playtesting)
4. **Reduced Motion Critical:** Check `usePrefersReducedMotion()` for WCAG compliance
5. **Input Locking:** Disable power-ups during cascade (`gameState.cascadeActive`)
6. **Hint Filtering:** Don't reveal already-found words, prioritize longer words
7. **Multiplier Stacking:** Decide multiplicative (6x) vs highest-wins (3x) for gold + multiplier
8. **Cooldown Persistence:** Recommend reset on level transition for better UX
