# Phase 29: Adaptive Difficulty System - Research

**Researched:** 2026-01-31
**Domain:** Game difficulty balancing, flow theory, dynamic difficulty adjustment (DDA)
**Confidence:** HIGH

## Summary

Adaptive difficulty systems aim to maintain players in a "flow state" where challenge matches skill level. Research reveals that **invisible pre-game adjustments are far more effective than mid-game rubber-banding**, which players perceive as unfair. The key to success is making difficulty changes feel like natural variation rather than obvious manipulation.

The system must track performance metrics across recent sessions, adjust level parameters before gameplay begins, and provide progressive hints when players struggle with specific levels. Boss battles should remain fixed difficulty to allow skill mastery and pattern learning.

**Critical insight from 2026 research:** Recent academic work shows that traditional DDA systems have "not achieved promised success" when based purely on flow theory. Effective systems require **engagement-oriented approaches** that prevent churn through timely, invisible interventions rather than constant real-time balancing.

**Primary recommendation:** Use pre-game tier assignment (easy/normal/hard) based on rolling window performance, avoid mid-level changes entirely, and separate hint escalation from difficulty scaling.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Type-safe performance tracking | Already in project, enables compile-time validation of metrics |
| Zod | Latest | Schema validation for metrics | Already in project for API validation, ensures data integrity |
| LocalStorage API | Native | Client-side tier persistence | No latency, works offline, survives sessions |
| Supabase | Current | Server-side history tracking | Already in project, enables cross-device sync |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Context | 18+ | Global difficulty state | Share tier state across components |
| Custom Hooks | N/A | Encapsulate metrics logic | Reusable performance tracking |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| LocalStorage | SessionStorage | Tier would reset between sessions (undesirable) |
| Pre-game only | Mid-game DDA | Players detect rubber-banding, feel patronized |
| Fixed 3 tiers | Granular 0-100 scale | Overcomplicated, harder to tune, same outcome |

**Installation:**
```bash
# No new dependencies - uses existing stack
# TypeScript, Zod, Supabase, React already installed
```

## Architecture Patterns

### Recommended Project Structure
```
lib/adaptiveDifficulty/
├── performanceTracker.ts    # Rolling window metrics calculation
├── tierAssigner.ts          # Determine easy/normal/hard based on performance
├── configAdjuster.ts        # Apply tier modifiers to level config
├── hintEscalation.ts        # Progressive hint system (separate concern)
├── constants.ts             # Thresholds, weights, tier parameters
└── __tests__/               # Unit tests for each module

contexts/
└── DifficultyContext.tsx    # React Context for tier state

hooks/
└── useAdaptiveDifficulty.ts # Hook for accessing difficulty system

types/
└── difficulty.ts            # TypeScript interfaces for metrics, tiers
```

### Pattern 1: Performance Metric Calculation
**What:** Calculate combined score from completion, time, and accuracy
**When to use:** After every level attempt (success or failure)
**Example:**
```typescript
// Source: Research synthesis
interface PerformanceMetrics {
  completionRate: number;    // 0-1 (did they complete it?)
  timeEfficiency: number;    // 0-1 (how much time left?)
  wordAccuracy: number;      // 0-1 (valid words vs invalid attempts)
}

// Weighted combination (tune weights during testing)
function calculateCombinedScore(metrics: PerformanceMetrics): number {
  return (
    metrics.completionRate * 0.5 +    // Completion is most important
    metrics.timeEfficiency * 0.3 +    // Time pressure indicates skill
    metrics.wordAccuracy * 0.2        // Accuracy shows word knowledge
  );
}
```

### Pattern 2: Rolling Window Tier Assignment
**What:** Track last N level attempts, upgrade/downgrade tier based on patterns
**When to use:** After recording each level attempt, before starting next level
**Example:**
```typescript
// Source: Research on performance-based DDA
type DifficultyTier = 'easy' | 'normal' | 'hard';

interface TierDecision {
  tier: DifficultyTier;
  reason: string; // For analytics/debugging
}

function determineTier(recentAttempts: LevelAttempt[]): TierDecision {
  const last3 = recentAttempts.slice(-3);

  // Downgrade trigger: 2+ failures in last 3 attempts
  const failureCount = last3.filter(a => !a.isCompletion).length;
  if (failureCount >= 2) {
    return { tier: 'easy', reason: 'high_failure_rate' };
  }

  // Upgrade trigger: 3 wins with high scores
  const allCompleted = last3.every(a => a.isCompletion);
  const highScores = last3.filter(a => a.combinedScore > 0.8).length;
  if (allCompleted && highScores === 3) {
    return { tier: 'hard', reason: 'consistent_mastery' };
  }

  // Default: stay normal
  return { tier: 'normal', reason: 'balanced_performance' };
}
```

### Pattern 3: Pre-Game Config Modification
**What:** Adjust level config parameters based on assigned tier
**When to use:** After tier assignment, before level starts
**Example:**
```typescript
// Source: Context decisions
function applyTierAdjustments(
  baseConfig: LevelConfig,
  tier: DifficultyTier
): LevelConfig {
  const config = { ...baseConfig };

  switch (tier) {
    case 'easy':
      config.timerSeconds = Math.floor(config.timerSeconds * 1.2); // +20%
      config.objectives = config.objectives.map(obj => ({
        ...obj,
        target: obj.isPrimary ? Math.floor(obj.target * 0.8) : obj.target, // -20% score target
      }));
      break;

    case 'hard':
      config.timerSeconds = Math.floor(config.timerSeconds * 0.85); // -15%
      // Longer power-up cooldowns handled in power-up system
      break;

    case 'normal':
      // No modifications - base config
      break;
  }

  return config;
}
```

### Pattern 4: Progressive Hint System (Separate from Tier)
**What:** Escalate hints after repeated failures on SAME level
**When to use:** After 3rd, 4th, 5th+ attempt on same level
**Example:**
```typescript
// Source: Research on adaptive hint systems
type HintLevel = 'none' | 'length' | 'lengthAndStart' | 'fullReveal';

function getHintLevel(attemptCount: number): HintLevel {
  if (attemptCount < 3) return 'none';
  if (attemptCount === 3) return 'length';        // "Find a 5-letter word"
  if (attemptCount === 4) return 'lengthAndStart'; // "Find a 5-letter word starting with T"
  return 'fullReveal';                             // Show complete path
}

interface HintData {
  level: HintLevel;
  message?: string;
  highlightTiles?: Array<{row: number; col: number}>;
  targetWord?: string;
}

function generateHint(
  attemptCount: number,
  targetWord: string,
  grid: string[][]
): HintData {
  const level = getHintLevel(attemptCount);

  switch (level) {
    case 'length':
      return {
        level,
        message: `Try finding a ${targetWord.length}-letter word`,
      };

    case 'lengthAndStart':
      const path = findWordPath(targetWord, grid);
      return {
        level,
        message: `Try a ${targetWord.length}-letter word starting with ${targetWord[0]}`,
        highlightTiles: [path[0]], // Highlight first tile
      };

    case 'fullReveal':
      const fullPath = findWordPath(targetWord, grid);
      return {
        level,
        message: `Trace this word: ${targetWord}`,
        highlightTiles: fullPath,
        targetWord,
      };

    default:
      return { level };
  }
}
```

### Anti-Patterns to Avoid
- **Mid-level difficulty changes:** Players perceive this as unfair rubber-banding. Always adjust before level starts.
- **Obvious tier indicators:** Never show "Easy Mode" in UI - kills player dignity. Adjustments must be invisible.
- **Immediate tier changes:** Require consistent pattern (2-3 levels) before changing tier to avoid volatility.
- **Boss difficulty scaling:** Boss battles MUST remain fixed difficulty to allow pattern learning and skill mastery.
- **Mixing hints with tier:** Hint system addresses specific level struggles, tier system addresses overall skill level. Keep separate.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Performance metric storage | Custom file-based system | LocalStorage + Supabase | Cross-device sync, built-in error handling, already integrated |
| Rolling window calculations | Manual array slicing loops | Array.prototype.slice(-N) | Native, tested, performant |
| Difficulty tier persistence | Cookies or custom storage | LocalStorage with fallback | No server round-trip, works offline, session persistence |
| Boss exclusion logic | Ad-hoc conditionals everywhere | Centralized `isBossLevel` check | Already exists in levelConfig.ts (line 260) |

**Key insight:** Level config system already provides structure for grid size, timer, objectives, and special tiles. Don't rebuild - extend it with tier modifiers.

## Common Pitfalls

### Pitfall 1: Rubber-Banding Perception
**What goes wrong:** Players notice difficulty changes during gameplay and feel cheated
**Why it happens:** Mid-game DDA systems adjust in real-time, creating obvious patterns (e.g., "game got easier after I died")
**How to avoid:**
- Only adjust difficulty BEFORE level starts (pre-game tier assignment)
- Never change parameters mid-level
- Make tier transitions gradual (require 2-3 levels of consistent performance)
**Warning signs:** Players complaining about "game feels rigged" or "too easy now"

### Pitfall 2: Data Freshness vs. Privacy
**What goes wrong:** Client-side tier storage can be manipulated, server-side adds latency
**Why it happens:** LocalStorage is editable via dev tools, but API calls delay game start
**How to avoid:**
- Use LocalStorage for instant tier retrieval (no latency)
- Sync to Supabase in background (cross-device consistency)
- Don't enforce server validation at game start (trust client, verify in analytics)
**Warning signs:** Players reporting "game feels laggy before levels" or exploits appearing

### Pitfall 3: Tier Volatility
**What goes wrong:** Player bounces between easy/normal/hard too frequently
**Why it happens:** Tier changes after every single level based on volatile metrics
**How to avoid:**
- Use rolling window of 3+ levels (smooths variance)
- Require consistent pattern (2 failures, not just 1)
- Don't downgrade on first boss failure (bosses are harder by design)
**Warning signs:** Tier changes every 1-2 levels, analytics show high tier churn

### Pitfall 4: Conflating Hints and Difficulty
**What goes wrong:** System reduces difficulty when it should provide hints (or vice versa)
**Why it happens:** Both systems activate when player struggles, easy to merge logic
**How to avoid:**
- Tier system: Cross-level performance trend (last 3 levels)
- Hint system: Same-level repeated failures (attempt 3, 4, 5+)
- Separate triggers, separate UI, separate code modules
**Warning signs:** Players getting hints on first attempt, or difficulty changing mid-level

### Pitfall 5: Boss Battle Adaptation
**What goes wrong:** Boss battles become easier after failures, removing challenge
**Why it happens:** DDA system doesn't exclude boss levels from tier adjustments
**How to avoid:**
- Check `config.isBossLevel` before applying tier modifiers
- Boss battles always use base config (no easy/hard variants)
- Hint system still works on bosses (helps with specific mechanics)
**Warning signs:** Boss battles feel too easy, players complain "no challenge"

## Code Examples

Verified patterns from research synthesis:

### Attempt Recording with Metrics
```typescript
// Source: Codebase + Research synthesis
interface LevelAttempt {
  world: number;
  level: number;
  attemptNumber: number;
  isCompletion: boolean;
  score: number;
  words: number;
  timeRemaining: number;
  objectiveProgress: Record<string, number>;
  combinedScore: number; // NEW: Weighted performance metric
  timestamp: string;
}

async function recordLevelAttempt(
  world: number,
  level: number,
  result: {
    isCompletion: boolean;
    score: number;
    words: number;
    timeRemaining: number;
    timerSeconds: number; // Total time for level
  }
): Promise<LevelAttempt> {
  // Calculate metrics
  const completionRate = result.isCompletion ? 1 : 0;
  const timeEfficiency = result.timeRemaining / result.timerSeconds;
  const wordAccuracy = result.words > 0 ? result.score / (result.words * 100) : 0;

  // Combined score (weighted)
  const combinedScore =
    completionRate * 0.5 +
    timeEfficiency * 0.3 +
    wordAccuracy * 0.2;

  const attempt: LevelAttempt = {
    world,
    level,
    attemptNumber: getAttemptCount(world, level) + 1,
    isCompletion: result.isCompletion,
    score: result.score,
    words: result.words,
    timeRemaining: result.timeRemaining,
    objectiveProgress: {}, // Filled from game state
    combinedScore,
    timestamp: new Date().toISOString(),
  };

  // Store locally
  await saveAttemptToLocalStorage(attempt);

  // Sync to Supabase (non-blocking)
  syncAttemptToServer(attempt).catch(console.error);

  return attempt;
}
```

### Tier Persistence with Fallback
```typescript
// Source: Codebase storage patterns
const TIER_STORAGE_KEY = 'lexiclash_difficulty_tier';

interface TierState {
  tier: DifficultyTier;
  updatedAt: string;
  attemptsSinceTierChange: number;
}

function getCurrentTier(): DifficultyTier {
  try {
    const stored = localStorage.getItem(TIER_STORAGE_KEY);
    if (!stored) return 'normal'; // First-time players start normal

    const state: TierState = JSON.parse(stored);
    return state.tier;
  } catch {
    return 'normal'; // Fallback if parsing fails
  }
}

function saveTier(tier: DifficultyTier): void {
  const state: TierState = {
    tier,
    updatedAt: new Date().toISOString(),
    attemptsSinceTierChange: 0,
  };

  try {
    localStorage.setItem(TIER_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save tier:', err);
    // Non-fatal - continue with in-memory tier
  }
}
```

### React Hook Integration
```typescript
// Source: Existing codebase hooks pattern
function useAdaptiveDifficulty(world: number, level: number) {
  const { attempts } = useContext(ProgressionContext);
  const [currentTier, setCurrentTier] = useState<DifficultyTier>('normal');
  const [hintLevel, setHintLevel] = useState<HintLevel>('none');

  // Determine tier on mount and when attempts change
  useEffect(() => {
    // Get tier from recent cross-level performance
    const recentAttempts = attempts
      .filter(a => !isBossLevel(a.world, a.level)) // Exclude boss attempts
      .slice(-3);

    const decision = determineTier(recentAttempts);
    setCurrentTier(decision.tier);
    saveTier(decision.tier);

    // Analytics
    trackEvent('difficulty_tier_assigned', {
      world,
      level,
      tier: decision.tier,
      reason: decision.reason,
    });
  }, [attempts, world, level]);

  // Determine hint level based on same-level attempts
  useEffect(() => {
    const sameLevelAttempts = attempts.filter(
      a => a.world === world && a.level === level
    );

    const hint = getHintLevel(sameLevelAttempts.length);
    setHintLevel(hint);
  }, [attempts, world, level]);

  return {
    tier: currentTier,
    hintLevel,
    adjustedConfig: applyTierAdjustments(
      getLevelConfig(world, level),
      currentTier
    ),
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Real-time mid-game DDA | Pre-game tier assignment | 2024-2025 research | Eliminates rubber-banding perception, maintains fairness |
| Single performance metric (win/loss) | Combined weighted metrics | 2025 EDDA research | Better captures skill vs luck, prevents binary tier swings |
| Fixed difficulty (Easy/Medium/Hard choice) | Invisible adaptive tiers | 2023+ UX research | Preserves player dignity, removes stigma of "easy mode" |
| Constant difficulty adjustment | Churn-prevention approach | 2025-2026 | Targets at-risk players instead of constant rebalancing |

**Deprecated/outdated:**
- **Mario Kart rubber-banding:** Extensively criticized in game design community for obvious manipulation
- **Crash Bandicoot DDA (1996):** Early system but too obvious to players, modern standards require invisibility
- **Flow theory alone:** 2026 research shows pure flow-based DDA has "not achieved promised success" - need engagement-oriented approach

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal combined score weights**
   - What we know: Completion rate is most important (0.5 weight), time and accuracy matter less
   - What's unclear: Exact ratio of time vs accuracy (currently 0.3:0.2)
   - Recommendation: Start with 0.5/0.3/0.2, tune based on playtest data and analytics

2. **"High score" threshold for tier upgrades**
   - What we know: Must be high enough to indicate mastery, low enough to be achievable
   - What's unclear: 0.8 (80%) is suggested but untested with actual word game data
   - Recommendation: Start at 0.8, monitor upgrade frequency in analytics, adjust if < 10% of players upgrade

3. **Tier adjustment percentages**
   - What we know: Easy tier needs noticeable help, hard tier needs challenge without frustration
   - What's unclear: +20% timer / -20% target might be too much or too little
   - Recommendation: Start conservative (+15% / -15%), increase if not effective

4. **Power-up cooldown scaling for hard tier**
   - What we know: +50% cooldowns adds challenge without changing level structure
   - What's unclear: Interacts with Phase 28 power-up system, needs integration testing
   - Recommendation: Coordinate with power-up cooldown logic, test boss battles carefully

5. **Cross-device tier sync latency**
   - What we know: LocalStorage is instant, Supabase sync can lag
   - What's unclear: What happens if player switches devices mid-session
   - Recommendation: Prefer LocalStorage tier on game start, fetch Supabase tier in background, reconcile on next session

## Sources

### Primary (HIGH confidence)
- [Rethinking Dynamic Difficulty Adjustment for Video Game Design - ScienceDirect 2024](https://www.sciencedirect.com/science/article/abs/pii/S1875952124000314) - Critical reassessment of DDA theoretical foundations
- [Engagement-Oriented Dynamic Difficulty Adjustment - MDPI 2025](https://www.mdpi.com/2076-3417/15/10/5610) - EDDA approach preventing churn
- [More Than Meets the Eye: Secrets of DDA - Game Developer](https://www.gamedeveloper.com/design/more-than-meets-the-eye-the-secrets-of-dynamic-difficulty-adjustment) - Invisibility principles
- [Flow Theory Applied to Game Design - Think Game Design](https://thinkgamedesign.com/flow-theory-game-design/) - Challenge-skill balance
- [Dynamic Difficulty Adjustment - IntechOpen](https://www.intechopen.com/chapters/1228576) - Performance metrics and tracking

### Secondary (MEDIUM confidence)
- [Adaptive Hint System for Puzzle Games - IEEE 2023](https://ieeexplore.ieee.org/document/10017301/) - Multimodal hint system design
- [Progressive Hint System - Tau Games Blog](https://taugames.ca/blog/hints.html) - Practical implementation in word games
- [Flow Experience in Gameful Approaches - Taylor & Francis 2025](https://www.tandfonline.com/doi/full/10.1080/10447318.2025.2470279) - Flow theory systematic review
- [Mobile Game KPIs - MetricFire](https://www.metricfire.com/blog/the-most-important-kpis-for-monitoring-mobile-games/) - Performance metrics tracking

### Tertiary (LOW confidence - general information)
- [Dynamic Game Difficulty Balancing - Wikipedia](https://en.wikipedia.org/wiki/Dynamic_game_difficulty_balancing) - Historical context
- Various Reddit/community discussions about rubber-banding perception

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project dependencies, well-understood patterns
- Architecture: HIGH - Based on established codebase structure and research consensus
- Pitfalls: MEDIUM - Based on research and common patterns, but specific word game context untested
- Tier thresholds: LOW - Require playtesting to validate (0.8 high score, +20% timer, etc.)

**Research date:** 2026-01-31
**Valid until:** ~60 days (game design principles stable, but implementation details may need tuning based on v2.0 playtest data)

---

**Next Steps for Planner:**
1. Create performance tracker module (calculateCombinedScore, rolling window)
2. Create tier assigner (determineTier logic with downgrade/upgrade triggers)
3. Create config adjuster (applyTierAdjustments with boss exclusion)
4. Create hint escalation system (separate from tier, tracks same-level attempts)
5. Integrate with ProgressionContext (recordAttempt enhanced with combinedScore)
6. Add React hook (useAdaptiveDifficulty for components)
7. Add analytics events (tier changes, hint activations for tuning)
8. Test with real player data, tune thresholds based on metrics
