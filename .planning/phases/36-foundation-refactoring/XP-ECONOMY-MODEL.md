# XP Economy Model — Education 2.0

## Purpose
Unified model of all XP sources to prevent inflation when adding duels and practice modes.

## Design Principles
1. **Mastery over speed** — XP rewards learning quality, not grinding
2. **Mode parity** — Similar XP/hour across all practice modes (no mode favoritism)
3. **Anti-inflation** — New activities don't stack with existing XP (award once per activity type)
4. **Progression target** — Students level up every 3-4 days at early levels with daily practice

## Current XP Sources (from educationXpManager.ts)

| Activity | XP/Session | Typical Sessions/Day | XP/Day | Source |
|----------|-----------|---------------------|--------|--------|
| Flashcards (20 cards, 90% accuracy) | ~250 | 2 | ~500 | FLASHCARD_CORRECT + accuracy bonus |
| Solo Board (10 vocab words) | ~215 | 2 | ~430 | VOCABULARY_WORD_FOUND + board completion |
| Lesson Completion | 300 | 0.5 | ~150 | LESSON_COMPLETED + mastery bonus |
| Daily Practice Base | 20 | 1 | 20 | DAILY_PRACTICE_BASE |
| **Current Total** | | | **~1100** | |

### Current XP/Session Breakdown
- Flashcards: 10/correct * 18 cards + 50 accuracy bonus + 20 daily = ~250
- Solo Board: 15/vocab word * 10 words + 25 new word bonus * 3 + 50 completion + 20 daily = ~215
- Lesson Completion: 200 base + 100 mastery bonus = 300
- Streak bonuses: +50% at 7 days, +75% at 14 days, +100% at 30 days (multiplicative on session XP)

## New XP Sources (Phase 37-40)

| Activity | XP/Session | Typical Sessions/Day | XP/Day | Rationale |
|----------|-----------|---------------------|--------|-----------|
| **Async Duel (win)** | 200 | 1 | 200 | Similar to solo board (competitive board play). Winner gets full, loser gets 60% (120 XP). |
| **Async Duel (loss)** | 120 | 0 | 0 | Losing still rewards participation (60% of win). Counted in opponent's session. |
| **Real-time Duel (win)** | 250 | 0.5 | 125 | Premium: synchronous commitment. Winner 250, loser 150. |
| **Real-time Duel (loss)** | 150 | 0 | 0 | Higher than async loss (both players committed time). |
| **Word Matching** | 180 | 1 | 180 | Mid-tier: visual learning. 15 XP/pair * ~10 pairs + accuracy bonus. |
| **Spelling Challenge** | 200 | 1 | 200 | Higher: harder mode. 20 XP/correct * ~8 words + streak bonus. |
| **Timed Blitz** | 160 | 1 | 160 | Lower: speed-focused, less mastery. 10 XP/word + combo bonus. |
| **Daily Challenge** | 100 | 1 | 100 | Capped bonus. Encourages daily login without requiring it. |
| **New Total** | | | **~965** | |

## Combined Economy

| Source Category | Max XP/Day | % of Total |
|----------------|-----------|------------|
| Existing (flashcards, board, lessons) | ~1100 | 53% |
| Duels (async + realtime) | ~325 | 16% |
| Practice modes (matching, spelling, blitz) | ~540 | 26% |
| Daily challenges | ~100 | 5% |
| **Grand Total** | **~2065** | 100% |

## Progression Rate Analysis

### Level Curve
Using existing formula from xpManager.ts: `XP_needed = 100 * level^exponent` (segmented by tier)
- Levels 1-25: exponent 1.4 (faster early progression)
- Levels 26-50: exponent 1.45 (gentler mid-game)
- Levels 51-75: exponent 1.5 (current baseline)
- Levels 76+: exponent 1.55 (prestige tier challenge)

**Sample progression at 2065 XP/day (max theoretical):**
- Level 1→2: 100 XP (< 1 day)
- Level 5→6: 642 XP (~0.3 days)
- Level 10→11: 1,585 XP (~0.8 days)
- Level 20→21: 4,595 XP (~2.2 days)
- Level 30→31: 9,002 XP (~4.4 days)
- Level 50→51: 22,117 XP (~10.7 days)

### With Streak Multipliers
At 30-day streak (2x multiplier): ~4,130 XP/day
- Level 20→21: ~1.1 days (from 2.2)
- Level 50→51: ~5.4 days (from 10.7)

### Assessment
- **Early levels (1-10):** Students level up daily — good for engagement hook
- **Mid levels (10-30):** Every 2-5 days — maintains momentum
- **Late levels (30-50):** Every 1-2 weeks — challenge without frustration
- **Endgame (50-100):** Weeks to months — prestige provides reset

**Verdict:** Balanced. No single mode dominates. A student playing ONLY duels (~325 XP/day) or ONLY practice (~540 XP/day) progresses at reasonable pace (slower than flashcards, encouraging variety).

## Anti-Inflation Rules

1. **No double-counting:** Duel awards "duel XP", not "duel XP + word discovery XP"
2. **Daily cap consideration:** If any student consistently earns >3000 XP/day, add soft cap (diminishing returns after threshold). Not needed now — max theoretical is ~2065 without streaks.
3. **Activity-type once:** Each activity type awards XP once per session completion, not per sub-action
4. **Loss XP floor:** Losing a duel always awards minimum participation XP (prevents discouragement)
5. **Streak multiplier applies to session total:** Not per-word — prevents exploitation via many short sessions

## Configuration Values (for educationXpManager.ts)

### Duel XP Config
- DUEL_WIN_ASYNC: 200
- DUEL_LOSS_ASYNC: 120
- DUEL_WIN_REALTIME: 250
- DUEL_LOSS_REALTIME: 150
- DUEL_DRAW: 175 (midpoint)

### Practice Mode XP Config
- MATCHING_PAIR_CORRECT: 15
- MATCHING_ACCURACY_BONUS: { 90: 40, 80: 20, 70: 10 }
- MATCHING_PERFECT_SESSION: 60
- SPELLING_WORD_CORRECT: 20
- SPELLING_STREAK_BONUS: 5 (per consecutive correct)
- SPELLING_ACCURACY_BONUS: { 90: 50, 80: 30, 70: 10 }
- BLITZ_WORD_FOUND: 10
- BLITZ_COMBO_BONUS: 3 (per combo level, stacking)
- BLITZ_COMPLETION: 40

### Daily Challenge XP Config
- DAILY_CHALLENGE_COMPLETE: 100

## Review Schedule
- After Phase 37 ships: Verify practice mode XP rates match model
- After Phase 38 ships: Verify duel XP rates match model
- After Phase 40 ships: Full economy audit with real student data
