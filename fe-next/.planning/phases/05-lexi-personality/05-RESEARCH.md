# Phase 5: Lexi Personality - Research

**Researched:** 2026-01-22
**Domain:** Mascot character animation, contextual feedback, player engagement
**Confidence:** HIGH

## Summary

Lexi personality system can be built on top of the existing InteractiveMascot/IdleMascot infrastructure which already provides 7 GIF-based mascot variants, animation patterns, and interaction handling. The codebase has established spring physics constants (stiffness: 260-400, damping: 15-30), RTL-aware positioning patterns, and reduced-motion accessibility. Achievement triggers can hook into the existing adventure game state tracking (word length, combo count, time remaining) and the ScorePopupFly animation pattern provides a template for transient UI feedback.

**Primary recommendation:** Build Lexi reactions as a new `<LexiReaction>` component that wraps InteractiveMascot, positions at bottom-corner using RTL-aware positioning (dir attribute detection), and subscribes to game state events via custom hooks.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Framer Motion | (installed) | Spring physics animations | Already used throughout adventure mode for all animations |
| InteractiveMascot | internal | Mascot rendering | 7 GIF variants, variant mapping, idle animations, accessibility |
| useRandomMascotActivity | internal | Activity timing | Random activity scheduling, cooldown logic, reduced-motion handling |
| useDevicePerformance | internal | Performance detection | Reduced-motion, low-end device detection, particle limits |
| useAdventureGame | internal | Game state | Tracks score, combo, time, words found - all celebration triggers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| AdventureThemeContext | internal | World theming | Access current world colors for world-specific flavor |
| ScorePopupFly | internal | Transient popup pattern | Template for Lexi popup behavior (slide up, fade, tap to dismiss) |
| SelectionSparkle | internal | Particle effects | Optional celebration sparkles on milestone achievements |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| InteractiveMascot | Custom mascot component | InteractiveMascot already handles 7 variants, reduced-motion, performance - no reason to rebuild |
| useRandomMascotActivity | Custom timing hook | Existing hook already has cooldown logic, random intervals - leverage it |
| Spring physics constants | New animation values | Existing constants are proven, tested, consistent - maintain consistency |

**Installation:**
No new dependencies required - all components and hooks exist.

## Architecture Patterns

### Recommended Project Structure
```
components/adventure/
├── LexiReaction.tsx         # Main Lexi reaction component
├── useLexiReactions.ts      # Hook to manage reaction triggers and state
└── __tests__/
    └── LexiReaction.test.tsx

types/
└── adventure.ts             # Add LexiReactionType enum
```

### Pattern 1: Event-Driven Reactions
**What:** Hook subscribes to game state changes, emits reaction events when conditions met
**When to use:** Primary pattern for all celebration triggers

**Example:**
```typescript
// Source: Inferred from useAdventureGame pattern + InteractiveMascot usage
interface LexiReactionEvent {
  type: 'celebration' | 'hint' | 'encourage';
  variant: ExtendedMascotVariant; // 'celebrating', 'encouraging', 'thinking'
  messageKey: string; // Translation key for dialogue
  priority: 'high' | 'normal' | 'low';
  cooldown?: number; // Override default 3s cooldown
}

function useLexiReactions(gameState: AdventureGameState) {
  const [reaction, setReaction] = useState<LexiReactionEvent | null>(null);
  const lastReactionTimeRef = useRef(0);

  // Check for long word (6+ letters)
  useEffect(() => {
    const lastWord = gameState.wordsFound[gameState.wordsFound.length - 1];
    if (lastWord && lastWord.length >= 6) {
      const now = Date.now();
      if (now - lastReactionTimeRef.current > 3000) {
        setReaction({
          type: 'celebration',
          variant: 'celebrating',
          messageKey: 'adventure.lexi.longWord',
          priority: 'normal',
        });
        lastReactionTimeRef.current = now;
      }
    }
  }, [gameState.wordsFound]);

  // ... more triggers
}
```

### Pattern 2: Bottom-Corner Positioning (RTL-Aware)
**What:** Position Lexi in bottom-right (LTR) or bottom-left (RTL) using dir attribute detection
**When to use:** All Lexi positioning

**Example:**
```typescript
// Source: app/[locale]/layout.tsx RTL detection pattern + BoardFrame.tsx corner positioning
function LexiReaction() {
  const isRTL = document.documentElement.dir === 'rtl';

  return (
    <motion.div
      className={cn(
        'fixed z-40', // Above game, below modals
        'bottom-20', // Above game controls
        isRTL ? 'left-4' : 'right-4' // RTL flips to left
      )}
      // ... animations
    >
      <InteractiveMascot variant={reactionVariant} />
    </motion.div>
  );
}
```

### Pattern 3: Tap-to-Speed Interaction
**What:** Single tap speeds animation 2x, double tap dismisses immediately
**When to use:** All Lexi reactions (respect player time)

**Example:**
```typescript
// Source: InteractiveMascot onClick pattern + game touch handling
function LexiReaction({ reaction, onDismiss }: LexiReactionProps) {
  const [tapCount, setTapCount] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = useCallback(() => {
    setTapCount(prev => prev + 1);

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    if (tapCount === 0) {
      // First tap - speed up 2x
      setAnimationSpeed(2);
      tapTimeoutRef.current = setTimeout(() => setTapCount(0), 300);
    } else {
      // Second tap within 300ms - dismiss
      onDismiss();
    }
  }, [tapCount, onDismiss]);

  return (
    <motion.div onClick={handleTap} style={{ cursor: 'pointer' }}>
      {/* transition duration divided by animationSpeed */}
    </motion.div>
  );
}
```

### Pattern 4: Reduced-Motion Fallback
**What:** Show static Lexi + text bubble for users with reduced-motion preference
**When to use:** Always respect accessibility (auto-detected)

**Example:**
```typescript
// Source: useDevicePerformance hook + InteractiveMascot reduced-motion handling
function LexiReaction({ reaction }: LexiReactionProps) {
  const { prefersReducedMotion } = useDevicePerformance();

  if (prefersReducedMotion) {
    return (
      <div className="fixed bottom-20 right-4 z-40">
        <div className="flex items-end gap-2">
          {/* Static mascot image */}
          <InteractiveMascot variant={reaction.variant} animated={false} size="md" />

          {/* Text bubble */}
          <div className="bg-neo-white border-3 border-neo-black rounded-neo p-3 shadow-hard">
            <p className="text-neo-black font-bold">{t(reaction.messageKey)}</p>
          </div>
        </div>
      </div>
    );
  }

  // ... animated version
}
```

### Anti-Patterns to Avoid
- **Interrupting gameplay:** Lexi should never block grid interaction or cover important UI
- **Animation spam:** Enforce 3s cooldown between reactions (no overwhelming)
- **Hardcoded strings:** All dialogue MUST use translation keys (4 languages)
- **Ignoring reduced-motion:** Always provide static fallback (accessibility requirement)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mascot rendering | Custom mascot sprite system | InteractiveMascot | Handles 7 GIF variants, extended variant mapping, reduced-motion, performance optimization |
| Random activity timing | Custom setInterval scheduling | useRandomMascotActivity | Already has cooldown logic, random intervals (8-90s), reduced-motion detection |
| Animation spring physics | Custom easing curves | Existing constants (stiffness: 300-400, damping: 20-30) | Proven, tested, consistent with Phase 2-3 animations |
| RTL detection | Custom language checking | document.documentElement.dir | Standard browser API, already used in layout.tsx |
| Reduced-motion detection | Custom media query | useDevicePerformance hook | Centralized, reactive, used throughout codebase |
| Transient popup pattern | Custom fade-in/out | ScorePopupFly pattern | Slide up + bounce, fade out, tap handling - reuse pattern |
| Game state tracking | Custom event emitters | useAdventureGame hook | Already tracks all needed metrics (score, combo, time, words) |

**Key insight:** The codebase already has a robust mascot and animation infrastructure. Don't rebuild what exists - compose and extend.

## Common Pitfalls

### Pitfall 1: Celebration Spam
**What goes wrong:** Triggering celebration on every word overwhelms player
**Why it happens:** No cooldown between reactions, or cooldown too short
**How to avoid:**
- Enforce 3s minimum cooldown between ANY reactions
- Track last reaction timestamp globally (not per-trigger)
- Lower-priority reactions (normal words) defer to higher-priority (combos)
**Warning signs:** Player complaints about "annoying mascot", reduced completion rates

### Pitfall 2: RTL Layout Breaks
**What goes wrong:** Lexi appears in wrong corner for Hebrew, overlaps UI
**Why it happens:** Hardcoding right-side positioning without RTL detection
**How to avoid:**
- Always check `document.documentElement.dir === 'rtl'`
- Use `isRTL ? 'left-4' : 'right-4'` pattern (established in codebase)
- Test every Lexi state in Hebrew language mode
**Warning signs:** Hebrew users report UI overlap, mascot in wrong position

### Pitfall 3: Stuck Detection False Positives
**What goes wrong:** "Need a hint?" appears after 15s even if player is thinking
**Why it happens:** Simple timer without checking player activity
**How to avoid:**
- Detect stuck = 15s without VALID word (not just any word attempt)
- Reset timer on any selection/attempt (player is engaged)
- Only trigger after 3+ failed attempts + 15s idle
**Warning signs:** Players annoyed by premature hints, "I wasn't stuck!"

### Pitfall 4: Ignoring World Context
**What goes wrong:** Lexi dialogue is generic, doesn't match world theme
**Why it happens:** Using same messages for all worlds, not accessing AdventureThemeContext
**How to avoid:**
- Access `currentWorldId` from AdventureThemeContext
- Translation keys include world variant: `adventure.lexi.longWord.world1` → meadow puns
- Fallback to generic if world-specific missing: `adventure.lexi.longWord.default`
**Warning signs:** Bland dialogue, missed opportunity for world immersion

### Pitfall 5: Animation Z-Index Conflicts
**What goes wrong:** Lexi appears under modals, or blocks pause button
**Why it happens:** Wrong z-index, not considering existing UI layers
**How to avoid:**
- Use z-40 for Lexi (game: z-10, score popup: z-[150], modals: z-50)
- Position bottom-20 to avoid overlapping bottom controls
- Test with pause menu, level complete modal, all UI states
**Warning signs:** Lexi visible in pause menu, blocks UI interaction

## Code Examples

Verified patterns from official sources:

### Spring Physics Constants
```typescript
// Source: components/adventure/AdventureGrid.tsx:408-410, LevelCompleteModal.tsx:80-82
const LEXI_SPRING = {
  type: 'spring' as const,
  stiffness: 300,  // Consistent with tile/modal animations
  damping: 20,     // Smooth, not bouncy
};

// Entry animation (slide up + bounce)
<motion.div
  initial={{ y: 100, opacity: 0, scale: 0.8 }}
  animate={{ y: 0, opacity: 1, scale: 1 }}
  exit={{ y: 50, opacity: 0, scale: 0.9 }}
  transition={LEXI_SPRING}
>
```

### Combo Trigger Detection
```typescript
// Source: hooks/useAdventureGame.ts:346-360 (combo tracking)
function useLexiReactions(gameState: AdventureGameState) {
  const prevComboRef = useRef(0);

  useEffect(() => {
    const currentCombo = gameState.comboCount;

    // Milestone combos: 3x, 5x, 10x
    if (
      (currentCombo === 3 && prevComboRef.current < 3) ||
      (currentCombo === 5 && prevComboRef.current < 5) ||
      (currentCombo === 10 && prevComboRef.current < 10)
    ) {
      emitReaction({
        type: 'celebration',
        variant: currentCombo >= 10 ? 'victory' : 'celebrating',
        messageKey: `adventure.lexi.combo.${currentCombo}x`,
        priority: 'high',
      });
    }

    prevComboRef.current = currentCombo;
  }, [gameState.comboCount]);
}
```

### Translation Key Pattern
```typescript
// Source: translations/en.js:1599 (encourage section), adventure objective patterns
// Translation structure:
{
  adventure: {
    lexi: {
      // Celebrations
      longWord: {
        default: "Wow! That's a long one!",
        world1: "Blooming brilliant word! 🌻",
        world2: "Splashing good find! 💧",
        world3: "Scorching word! 🔥",
      },
      combo: {
        '3x': "You're on a roll! 🎯",
        '5x': "Unstoppable! 🔥",
        '10x': "LEGENDARY COMBO! ⭐",
      },
      firstWord: "Great start! Keep going! 💪",
      timeBonus: "Clutch victory! ⏱️",

      // Hints & Encouragement
      stuck: "Try looking for longer words! 💡",
      encourage: "Don't give up! You've got this! 🌟",
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static mascot images | 7 animated GIF variants | Phase 4 (04-03) | InteractiveMascot now supports happy, gaming, thinking, oops, celebration, dj, trophy |
| Fixed positioning | RTL-aware positioning | Phase 4 | Bottom-corner flips for Hebrew (left-4 vs right-4) |
| Manual reduced-motion checks | useDevicePerformance hook | Existing | Centralized accessibility, auto-detected |
| Per-component animation constants | Standardized spring physics | Phase 2-3 | Consistency: stiffness 300-400, damping 15-30 |

**Deprecated/outdated:**
- Manual `window.matchMedia('(prefers-reduced-motion)')` - use `useDevicePerformance()`
- Hardcoded mascot variants (only 4 states) - now supports 7 GIF variants + extended variant mapping
- Fixed right-side positioning - must detect RTL for Hebrew support

## Open Questions

Things that couldn't be fully resolved:

1. **Exact hint system specifics**
   - What we know: Need stuck detection (15s idle), encouragement on struggle (3+ fails)
   - What's unclear: What specific hints to show (random long word? first letter? objective reminder?)
   - Recommendation: Start with generic encouragement ("Try longer words!"), defer specific hints to Phase 7 (tutorial role)

2. **World-specific dialogue coverage**
   - What we know: World 1 (meadow puns), World 2 (water/spring), World 3 (lava/cavern)
   - What's unclear: How many world-specific variants needed per reaction type
   - Recommendation: Start with 2-3 per world per reaction type, expand based on repetition during playtesting

3. **Celebration priority resolution**
   - What we know: Multiple triggers can fire simultaneously (long word + combo milestone)
   - What's unclear: Which takes precedence when cooldown blocks multiple reactions
   - Recommendation: Priority order: time-pressure win > 10x combo > 5x combo > long word > 3x combo > first word

## Sources

### Primary (HIGH confidence)
- components/ui/InteractiveMascot.tsx - 7 GIF variants, extended variant mapping, interaction patterns
- hooks/useRandomMascotActivity.ts - Activity scheduling, cooldown logic (8-90s intervals)
- hooks/useAdventureGame.ts - Game state tracking (score, combo, time, words found)
- components/animations/ScorePopupFly.tsx - Transient popup pattern (slide up, fade, tap handling)
- components/adventure/AdventureGrid.tsx - Spring physics constants (stiffness: 400, damping: 25)
- hooks/useDevicePerformance.ts - Reduced-motion detection, performance optimization
- app/[locale]/layout.tsx - RTL detection pattern (document.documentElement.dir)
- lib/adventure/themes/world1.ts - World theming structure, color palettes

### Secondary (MEDIUM confidence)
- translations/en.js - Translation key patterns for dialogue, encourage section exists
- components/adventure/themed/BoardFrame.tsx - Corner positioning patterns (bottom-right/bottom-left)

### Tertiary (LOW confidence)
- None - All findings verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components and hooks exist, verified in codebase
- Architecture: HIGH - Patterns extracted from existing adventure mode components
- Pitfalls: MEDIUM - Inferred from common animation/interaction issues, not adventure-specific

**Research date:** 2026-01-22
**Valid until:** ~30 days (stable codebase, no fast-moving dependencies)
