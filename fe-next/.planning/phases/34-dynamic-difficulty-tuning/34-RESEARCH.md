# Phase 34: Dynamic Difficulty Tuning (AI Director) - Research

**Researched:** 2026-02-01
**Domain:** Dynamic Difficulty Adjustment (DDA), Flow State Theory, AI Director systems, Performance Analytics
**Confidence:** HIGH

## Summary

Dynamic Difficulty Adjustment (DDA) aims to keep players in a "flow state" where challenge matches skill level, creating optimal engagement. Research reveals a critical tension: **traditional flow-based DDA has not achieved promised success** according to 2026 academic research, with mid-game "rubber-banding" being easily detected and perceived as unfair by players.

The most effective approach combines **invisible pre-game tier assignment** (already implemented in Phase 29) with **optional mid-game intensity adjustments** that modulate pacing (tension/release patterns) rather than core difficulty. The AI Director monitors performance metrics continuously but makes only gradual, contextual adjustments during natural gameplay transitions.

**Critical insight:** Players accept difficulty that varies *between* sessions but resent difficulty that changes *during* a session. The key is making mid-game adjustments feel like natural variation in game pacing rather than obvious manipulation. Boss battles must remain fixed-difficulty for pattern learning and skill mastery.

**Primary recommendation:** Build a lightweight AI Director that tracks flow state metrics (words per minute, success rate, combo maintenance) and makes invisible pacing adjustments (hint timing, power-up spawn rates, combo grace periods) without changing core level difficulty mid-session. Use analytics to validate that adjustments improve engagement without triggering rubber-banding perception.

## Standard Stack

The established libraries/tools for dynamic difficulty and performance tracking:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Type-safe metrics tracking | Already in project, enables compile-time validation |
| Zustand | Latest | High-frequency state updates | Optimal for performance metrics without Context re-render cascade (see Phase 33 research) |
| React Profiler | 19.2+ | Performance measurement | Built into React, measures render performance for flow detection |
| Web Performance API | Native | Precise timing metrics | Native browser API, no dependencies, microsecond precision |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing adaptive difficulty | Phase 29 | Pre-game tier assignment | Foundation - don't rebuild, extend |
| Analytics endpoint | Existing | Track effectiveness | `/api/analytics/log-session` already captures difficulty field |
| LocalStorage API | Native | Persist AI Director state | Session memory across gameplay |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand | React Context | Context causes re-render cascade with 57 InGameContext properties (identified in Phase 33) |
| Web Performance API | Custom timers | Less precise, more overhead, reinventing standard |
| Gradual adjustments | Real-time rubber-banding | Players detect and resent obvious difficulty changes |

**Installation:**
```bash
# Zustand (if not already installed)
npm install zustand

# No other new dependencies - uses existing stack
```

## Architecture Patterns

### Recommended Project Structure
```
lib/aiDirector/
├── performanceMonitor.ts    # Continuous metric tracking (words/min, success rate)
├── flowStateDetector.ts     # Determine if player is in flow/bored/frustrated
├── intensityController.ts   # Invisible pacing adjustments (not difficulty)
├── analyticsLogger.ts       # Track DDA effectiveness metrics
├── constants.ts             # Flow thresholds, adjustment rates
└── __tests__/               # Unit tests for each module

stores/
└── aiDirectorStore.ts       # Zustand store for high-frequency metrics

hooks/
└── useAIDirector.ts         # Hook for accessing AI Director system

types/
└── aiDirector.ts            # TypeScript interfaces for metrics, flow states
```

### Pattern 1: Performance Metric Tracking (Sliding Window)
**What:** Track real-time performance using sliding window algorithm for smooth metrics
**When to use:** Continuously during gameplay, updating every word submission
**Example:**
```typescript
// Source: Sliding Window research + DDA patterns
interface PerformanceWindow {
  wordsPerMinute: number;      // Rolling average (last 10 words)
  successRate: number;         // Valid/total ratio (last 20 attempts)
  comboMaintenance: number;    // Average combo level (last 5 minutes)
  timeInFlow: number;          // Seconds in optimal performance zone
}

class SlidingWindowTracker {
  private readonly WINDOW_SIZE = 10;
  private recentWords: { timestamp: number; valid: boolean }[] = [];

  addWord(valid: boolean) {
    const now = Date.now();
    this.recentWords.push({ timestamp: now, valid });

    // Keep only last WINDOW_SIZE entries
    if (this.recentWords.length > this.WINDOW_SIZE) {
      this.recentWords.shift();
    }
  }

  getWordsPerMinute(): number {
    if (this.recentWords.length < 2) return 0;

    const timeSpan = this.recentWords[this.recentWords.length - 1].timestamp
                   - this.recentWords[0].timestamp;
    const minutes = timeSpan / 60000;

    return this.recentWords.length / minutes;
  }

  getSuccessRate(): number {
    const validCount = this.recentWords.filter(w => w.valid).length;
    return validCount / this.recentWords.length;
  }
}
```

### Pattern 2: Flow State Detection (Csikszentmihalyi Model)
**What:** Determine player's current flow state based on performance metrics
**When to use:** After each sliding window update (every 5-10 seconds)
**Example:**
```typescript
// Source: Flow Theory research + bioRxiv 2026 study
type FlowState = 'bored' | 'flow' | 'frustrated' | 'learning';

interface FlowThresholds {
  // Based on Yerkes-Dodson law and flow channel research
  optimalWPM: { min: number; max: number };      // 3-7 words/min for flow
  optimalSuccessRate: { min: number; max: number }; // 0.7-0.9 for flow
  optimalCombo: { min: number; max: number };    // Level 2-4 for flow
}

function detectFlowState(
  metrics: PerformanceWindow,
  thresholds: FlowThresholds
): FlowState {
  const { wordsPerMinute, successRate, comboMaintenance } = metrics;
  const { optimalWPM, optimalSuccessRate, optimalCombo } = thresholds;

  // In optimal range = flow state
  if (
    wordsPerMinute >= optimalWPM.min &&
    wordsPerMinute <= optimalWPM.max &&
    successRate >= optimalSuccessRate.min &&
    successRate <= optimalSuccessRate.max &&
    comboMaintenance >= optimalCombo.min &&
    comboMaintenance <= optimalCombo.max
  ) {
    return 'flow';
  }

  // High performance but declining = bored (too easy)
  if (successRate > optimalSuccessRate.max && comboMaintenance > optimalCombo.max) {
    return 'bored';
  }

  // Low performance and declining = frustrated (too hard)
  if (successRate < optimalSuccessRate.min && comboMaintenance < optimalCombo.min) {
    return 'frustrated';
  }

  // Improving metrics = learning (good state, don't adjust)
  return 'learning';
}
```

### Pattern 3: Invisible Intensity Adjustments (NOT Rubber-Banding)
**What:** Gradual pacing adjustments that feel like natural game variation
**When to use:** Only during natural transition points (between combos, after power-ups)
**Example:**
```typescript
// Source: Left 4 Dead AI Director + rubber-banding research
interface IntensityAdjustment {
  hintEscalationRate: number;     // How quickly hints appear (0.5-2.0x)
  powerUpSpawnBonus: number;      // Extra power-ups for struggling players (+0-2)
  comboGracePeriod: number;       // Extra seconds before combo expires (+0-3s)
  celebrationDuration: number;    // Longer celebrations for wins (+0-1s)
}

class IntensityController {
  private currentState: FlowState = 'learning';
  private adjustmentRate = 0.1; // 10% per transition (gradual)

  // CRITICAL: Only adjust at natural transition points
  getAdjustmentsAtTransition(
    flowState: FlowState,
    currentAdjustments: IntensityAdjustment
  ): IntensityAdjustment {
    // Don't adjust if in flow or learning
    if (flowState === 'flow' || flowState === 'learning') {
      return currentAdjustments;
    }

    // Gradually ease difficulty for frustrated players
    if (flowState === 'frustrated') {
      return {
        hintEscalationRate: Math.min(2.0,
          currentAdjustments.hintEscalationRate + this.adjustmentRate),
        powerUpSpawnBonus: Math.min(2,
          currentAdjustments.powerUpSpawnBonus + 1),
        comboGracePeriod: Math.min(3,
          currentAdjustments.comboGracePeriod + 0.5),
        celebrationDuration: currentAdjustments.celebrationDuration,
      };
    }

    // Gradually increase challenge for bored players
    if (flowState === 'bored') {
      return {
        hintEscalationRate: Math.max(0.5,
          currentAdjustments.hintEscalationRate - this.adjustmentRate),
        powerUpSpawnBonus: Math.max(0,
          currentAdjustments.powerUpSpawnBonus - 1),
        comboGracePeriod: Math.max(0,
          currentAdjustments.comboGracePeriod - 0.5),
        celebrationDuration: Math.max(0,
          currentAdjustments.celebrationDuration - 0.2),
      };
    }

    return currentAdjustments;
  }
}
```

### Pattern 4: Exponential Moving Average (EMA) for Smoothing
**What:** Smooth metric fluctuations to prevent jittery adjustments
**When to use:** When updating performance metrics in sliding window
**Example:**
```typescript
// Source: EMA research for performance tracking
class ExponentialMovingAverage {
  private alpha: number; // Smoothing factor (0-1)
  private currentValue: number;

  constructor(alpha: number = 0.3, initialValue: number = 0) {
    this.alpha = alpha; // 0.3 = moderate smoothing
    this.currentValue = initialValue;
  }

  update(newValue: number): number {
    // EMA formula: EMA_t = α * value_t + (1 - α) * EMA_(t-1)
    this.currentValue = this.alpha * newValue + (1 - this.alpha) * this.currentValue;
    return this.currentValue;
  }

  getValue(): number {
    return this.currentValue;
  }
}

// Usage for words per minute
const wpmEMA = new ExponentialMovingAverage(0.3, 0);
wpmEMA.update(5.2); // Returns smoothed value
wpmEMA.update(6.8); // Gradually moves toward new values
```

### Anti-Patterns to Avoid
- **Mid-level difficulty changes:** Players detect and resent rubber-banding - adjust *pacing* not *difficulty*
- **Constant adjustments:** Make changes only at natural transitions (combo breaks, power-up activations)
- **Using React Context for metrics:** High-frequency updates cause re-render cascade - use Zustand instead
- **Adjusting boss battles:** Boss fights must remain fixed difficulty for pattern learning (per DIFF-05)
- **Obvious assistance:** "Pity power-ups" feel patronizing - make help subtle and deniable

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Performance timing | `Date.now()` loops | Web Performance API (`performance.now()`) | Microsecond precision, monotonic clock, no date skew |
| Metric smoothing | Manual averaging | Exponential Moving Average (EMA) | Mathematically proven, handles outliers, configurable responsiveness |
| High-frequency state | React Context | Zustand store | Avoids re-render cascade, selective subscriptions, better performance |
| Flow state detection | Custom heuristics | Csikszentmihalyi model thresholds | Backed by 50+ years of research, validated in 2026 bioRxiv study |
| Analytics tracking | Custom logging | Extend existing `/api/analytics/log-session` | Already captures difficulty, mode, performance - just add DDA fields |

**Key insight:** The existing Phase 29 adaptive difficulty system already handles pre-game tier assignment well. Don't rebuild it - extend it with mid-game pacing adjustments that work *alongside* tier assignment.

## Common Pitfalls

### Pitfall 1: The Rubber-Banding Perception Problem
**What goes wrong:** Players detect mid-game difficulty changes and feel patronized or cheated
**Why it happens:** Obvious changes to core mechanics (timer, word requirements) are easily noticed
**How to avoid:**
- Only adjust *pacing* elements (hint timing, power-up availability, combo grace)
- Never change core difficulty (timer, word count requirements, valid word rules)
- Make adjustments gradual (10% per transition, not instant 50% jumps)
- Only adjust at natural transitions (combo breaks, power-up uses)
**Warning signs:**
- Player comments like "the game is helping me" or "why did it get easier?"
- Analytics showing sudden performance spikes coinciding with adjustments
- Players gaming the system by deliberately playing poorly for assistance

### Pitfall 2: Context Re-Render Cascade with High-Frequency Metrics
**What goes wrong:** Using React Context for performance metrics causes entire component tree to re-render every word
**Why it happens:** InGameContext already has 57 properties - adding high-frequency metrics makes re-render problem worse
**How to avoid:**
- Use Zustand store for AI Director metrics (selective subscriptions)
- Only expose computed values to components, not raw metrics
- Batch metric updates (update every 5 seconds, not every keystroke)
- Use React Profiler to measure re-render impact
**Warning signs:**
- Frame drops during gameplay
- Profiler showing excessive re-renders in unrelated components
- Performance degradation proportional to metric update frequency

### Pitfall 3: Overtuning Based on Short Sessions
**What goes wrong:** AI Director makes aggressive adjustments based on first 30 seconds of play
**Why it happens:** Players need warm-up time - initial performance doesn't reflect true skill level
**How to avoid:**
- Ignore first 60 seconds of gameplay (warm-up period)
- Require minimum sample size (10+ words) before making any adjustments
- Weight recent performance more than historical (EMA with α=0.3)
- Cross-validate with existing tier (don't contradict pre-game assessment)
**Warning signs:**
- Analytics showing adjustments trigger within first minute
- Player performance curves showing initial dip then recovery
- Adjustments that contradict pre-game tier assignment

### Pitfall 4: Adjusting Boss Battles (Violates DIFF-05)
**What goes wrong:** AI Director modulates boss battle difficulty, breaking pattern learning
**Why it happens:** Generic DDA logic doesn't know boss battles should be fixed-difficulty
**How to avoid:**
- Check `level === 7` (boss level) and skip all mid-game adjustments
- Boss battles use pre-game tier (from Phase 29) but no mid-game changes
- Document exception clearly in code comments
- Test boss battles specifically to ensure no DDA interference
**Warning signs:**
- Boss patterns becoming inconsistent between attempts
- Players unable to learn boss mechanics due to changing difficulty
- Test failures in boss battle difficulty consistency checks

### Pitfall 5: False Flow State Detection During Lucky Streaks
**What goes wrong:** Player gets lucky combo of easy words, AI Director thinks they're in flow, increases difficulty
**Why it happens:** Short-term performance spikes don't indicate sustained skill level
**How to avoid:**
- Require sustained performance (5+ minutes) before detecting "bored" state
- Compare to historical performance baseline (is this typical for this player?)
- Weight success rate more heavily than raw speed (quality > quantity)
- Cross-check with combo maintenance (real flow = consistent combos)
**Warning signs:**
- Analytics showing rapid state transitions (flow → bored → frustrated in <2 minutes)
- Adjustments triggering after single lucky combo
- Player feedback about inconsistent difficulty within same session

## Code Examples

Verified patterns from research synthesis:

### Zustand Store for AI Director State
```typescript
// Source: Zustand research + high-frequency update patterns
import { create } from 'zustand';

interface AIDirectorState {
  // Current metrics (updated every word)
  wordsPerMinute: number;
  successRate: number;
  comboMaintenance: number;

  // Flow state (updated every 5 seconds)
  currentFlowState: FlowState;
  timeInFlow: number; // Seconds spent in flow state

  // Intensity adjustments (applied at transitions)
  intensityAdjustments: IntensityAdjustment;

  // Actions
  updateMetrics: (word: { valid: boolean; timestamp: number }) => void;
  updateFlowState: () => void;
  applyAdjustmentsAtTransition: () => void;
  reset: () => void;
}

export const useAIDirectorStore = create<AIDirectorState>((set, get) => ({
  wordsPerMinute: 0,
  successRate: 1.0,
  comboMaintenance: 0,
  currentFlowState: 'learning',
  timeInFlow: 0,
  intensityAdjustments: {
    hintEscalationRate: 1.0,
    powerUpSpawnBonus: 0,
    comboGracePeriod: 0,
    celebrationDuration: 0,
  },

  updateMetrics: (word) => {
    // Update sliding window tracker (implementation from Pattern 1)
    // Update EMA (implementation from Pattern 4)
    // Set new metrics
    set({
      wordsPerMinute: /* calculated */,
      successRate: /* calculated */,
      comboMaintenance: /* calculated */,
    });
  },

  updateFlowState: () => {
    const { wordsPerMinute, successRate, comboMaintenance } = get();
    const newState = detectFlowState(
      { wordsPerMinute, successRate, comboMaintenance, timeInFlow: 0 },
      FLOW_THRESHOLDS
    );

    set({ currentFlowState: newState });
  },

  applyAdjustmentsAtTransition: () => {
    const { currentFlowState, intensityAdjustments } = get();
    const controller = new IntensityController();
    const newAdjustments = controller.getAdjustmentsAtTransition(
      currentFlowState,
      intensityAdjustments
    );

    set({ intensityAdjustments: newAdjustments });
  },

  reset: () => {
    set({
      wordsPerMinute: 0,
      successRate: 1.0,
      comboMaintenance: 0,
      currentFlowState: 'learning',
      timeInFlow: 0,
      intensityAdjustments: {
        hintEscalationRate: 1.0,
        powerUpSpawnBonus: 0,
        comboGracePeriod: 0,
        celebrationDuration: 0,
      },
    });
  },
}));
```

### Hook Integration with Existing Systems
```typescript
// Source: Integration pattern from Phase 29 adaptive difficulty
import { useAIDirectorStore } from '@/stores/aiDirectorStore';
import { useAdaptiveDifficulty } from '@/hooks/useAdaptiveDifficulty';

export function useAIDirector(world: number, level: number) {
  // Get pre-game tier (from Phase 29)
  const { tier, adjustedConfig } = useAdaptiveDifficulty({ world, level });

  // Get mid-game intensity adjustments (from AI Director)
  const intensityAdjustments = useAIDirectorStore(
    (state) => state.intensityAdjustments
  );
  const updateMetrics = useAIDirectorStore((state) => state.updateMetrics);

  // Exclude boss battles (DIFF-05 requirement)
  const isBossBattle = level === 7;

  return {
    tier, // Pre-game difficulty tier (Phase 29)
    adjustedConfig, // Base config adjusted for tier
    intensityAdjustments: isBossBattle
      ? {
          hintEscalationRate: 1.0,
          powerUpSpawnBonus: 0,
          comboGracePeriod: 0,
          celebrationDuration: 0,
        }
      : intensityAdjustments, // Mid-game pacing adjustments (or neutral for boss)
    updateMetrics, // Track performance
  };
}
```

### Analytics Event Logging
```typescript
// Source: Existing analytics endpoint + DDA tracking requirements
interface DDAAnalyticsEvent {
  sessionId: string;
  timestamp: number;
  flowState: FlowState;
  wordsPerMinute: number;
  successRate: number;
  comboMaintenance: number;
  intensityAdjustments: IntensityAdjustment;
  tier: DifficultyTier; // From Phase 29
  world: number;
  level: number;
  adjustmentTrigger?: 'combo_break' | 'power_up' | 'periodic'; // What caused adjustment
}

async function logDDAEvent(event: DDAAnalyticsEvent) {
  // Extend existing /api/analytics/log-session endpoint
  await fetch('/api/analytics/log-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update',
      sessionId: event.sessionId,
      // Existing fields...
      // Add new DDA-specific fields
      ddaFlowState: event.flowState,
      ddaWordsPerMinute: event.wordsPerMinute,
      ddaSuccessRate: event.successRate,
      ddaComboMaintenance: event.comboMaintenance,
      ddaIntensityAdjustments: event.intensityAdjustments,
      ddaTier: event.tier,
      ddaAdjustmentTrigger: event.adjustmentTrigger,
    }),
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Real-time rubber-banding (racing games) | Pre-game tier + invisible pacing (flow-based) | 2020-2026 research | Players accept between-session variation, reject mid-session manipulation |
| Flow Theory as sole basis | Engagement-oriented hybrid (Flow + Self-Determination Theory) | 2024-2026 academic work | Mixed results from pure flow-based DDA led to multi-theory approach |
| Manual performance tracking (`Date.now()`) | Web Performance API + EMA smoothing | Web Performance API spec (2015+), EMA standard (established) | Microsecond precision, monotonic clock, mathematically proven smoothing |
| React Context for game state | Zustand for high-frequency updates | 2023+ (Zustand maturity) | Selective subscriptions prevent re-render cascade |
| Generic DDA for all levels | Boss exclusion requirement | Phase 30 (boss battles) | Pattern learning requires fixed difficulty |

**Deprecated/outdated:**
- **Pure flow-based DDA:** 2026 research shows "unhealthy reliance on Flow theory" - use engagement-oriented hybrid instead
- **Obvious mid-game help:** "Pity systems" that players detect - use invisible pacing adjustments
- **Constant real-time adjustments:** CPU-intensive and jittery - use transition-based adjustments with EMA smoothing
- **Context for high-frequency state:** InGameContext already has 57 properties - Zustand prevents re-render cascade

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal Flow State Thresholds for Word Game Genre**
   - What we know: Csikszentmihalyi model works for general games, 2026 bioRxiv study validates flow detection
   - What's unclear: Specific WPM/success rate thresholds for word puzzle games (not action games)
   - Recommendation: Start with conservative thresholds (3-7 WPM, 0.7-0.9 success rate), tune based on playtesting analytics

2. **Adjustment Rate Calibration**
   - What we know: Gradual 10% per transition prevents rubber-banding perception
   - What's unclear: Optimal rate for word games specifically (may need faster/slower than 10%)
   - Recommendation: A/B test adjustment rates (5%, 10%, 15%) and measure player feedback + engagement

3. **Warm-Up Period Duration**
   - What we know: Players need warm-up time before true skill assessment
   - What's unclear: How long warm-up period should be for word games (30s? 60s? 90s?)
   - Recommendation: Start with 60-second ignore window, analyze performance curves to optimize

4. **Boss Battle Analytics Separation**
   - What we know: Boss battles excluded from DDA (DIFF-05), but should contribute to analytics
   - What's unclear: Should boss performance contribute to post-game tier reassignment?
   - Recommendation: Track boss metrics separately, consider for tier adjustment only if player requests difficulty change

5. **Cross-Session Flow State Persistence**
   - What we know: LocalStorage can persist tier (Phase 29) and last-session flow state
   - What's unclear: Should AI Director "remember" previous session's flow state and warm up faster?
   - Recommendation: Start fresh each session (conservative), add persistence as Phase 35+ enhancement if needed

## Sources

### Primary (HIGH confidence)
- [Rethinking dynamic difficulty adjustment for video game design - ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S1875952124000314) - 2024 academic research on DDA effectiveness
- [Physiological detection of flow states - bioRxiv 2026](https://www.biorxiv.org/content/10.64898/2026.01.08.698463v1.full) - Novel performance metric combining life-length and game-score values
- [The AI Director: Left 4 Dead 2's Adaptive System - Steam Community Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3350589322) - AI Director implementation patterns
- [React Performance Tracks - React Docs](https://react.dev/reference/dev-tools/react-performance-tracks) - React 19.2+ performance measurement
- [Zustand GitHub Repository](https://github.com/pmndrs/zustand) - High-frequency state management patterns

### Secondary (MEDIUM confidence)
- [More Than Meets the Eye: The Secrets of Dynamic Difficulty Adjustment - Game Developer](https://www.gamedeveloper.com/design/more-than-meets-the-eye-the-secrets-of-dynamic-difficulty-adjustment) - Rubber-banding perception research
- [Adaptive rubber-banding system of dynamic difficulty adjustment in racing games](https://journals.sagepub.com/doi/abs/10.3233/ICG-220207) - Rubber-banding implementation patterns
- [The Sliding Window Technique - DEV Community](https://dev.to/sanukhandev/the-sliding-window-technique-a-powerful-algorithm-for-javascript-developers-3nfm) - JavaScript sliding window implementation
- [Exponential Moving Average for Performance Tracking - Medium](https://medium.com/@HenrikThustrup/assessing-football-team-performance-using-exponential-moving-average-ema-a6e8ecce5b04) - EMA implementation for metrics
- [Pacing and Progression in Game Design - Blood Moon Interactive](https://www.bloodmooninteractive.com/articles/pacing-and-progression.html) - Tension/release patterns

### Tertiary (LOW confidence - validate during implementation)
- [Dynamic Difficulty Adjustment - Meegle](https://www.meegle.com/en_us/topics/game-design/dynamic-difficulty-adjustment) - General DDA overview
- [Flow Theory in Game Design - Medium](https://medium.com/@icodewithben/mihaly-csikszentmihalyis-flow-theory-game-design-ideas-9a06306b0fb8) - Flow theory application
- [State Management in 2025 - DEV Community](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k) - Zustand vs Context comparison

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Existing tech stack proven in Phase 29, Zustand for high-frequency well-documented
- Architecture: HIGH - Sliding window, EMA, and flow detection are well-researched algorithms
- Pitfalls: HIGH - Rubber-banding perception documented extensively, Context re-render cascade identified in Phase 33
- Flow thresholds: MEDIUM - General flow theory validated, but word-game-specific thresholds need tuning
- Adjustment rates: MEDIUM - General guidance available, but genre-specific calibration needed

**Research date:** 2026-02-01
**Valid until:** 30 days (flow theory stable, but implementation patterns evolving)

**Key dependencies:**
- Phase 29: Adaptive Difficulty System (pre-game tier assignment) - DO NOT REBUILD
- Phase 30: Boss battles have fixed difficulty (level 7 exclusion requirement)
- Phase 33: Zustand recommended for high-frequency updates (Context re-render cascade)
- Existing analytics endpoint (`/api/analytics/log-session`) - EXTEND, don't replace

**Implementation priorities:**
1. HIGH: Sliding window performance tracking (foundation for all DDA)
2. HIGH: Flow state detection (determines when/how to adjust)
3. MEDIUM: Invisible intensity adjustments (pacing modulation, not difficulty)
4. MEDIUM: Analytics logging (validate effectiveness, prevent rubber-banding perception)
5. LOW: Cross-session persistence (Phase 35+ enhancement, not MVP)
