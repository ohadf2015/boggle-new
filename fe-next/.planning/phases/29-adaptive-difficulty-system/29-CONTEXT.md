# Phase 29: Adaptive Difficulty System - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Invisible difficulty system that keeps all skill levels in flow state. System automatically assigns internal difficulty tier (easy/normal/hard) based on performance metrics. Players never see or choose difficulty — it's completely invisible. Boss fights are excluded from adaptive scaling.

</domain>

<decisions>
## Implementation Decisions

### Difficulty Tier System
- No player-facing difficulty selection — system determines everything automatically
- 3 internal tiers: easy, normal, hard (invisible to player)
- All players start at normal tier
- Tier persists across sessions (saved to player profile)
- Boss fights have fixed difficulty (excluded from adaptive system)

### Performance Tracking
- Combined score metric: weighted combination of completion, time remaining, and word accuracy
- Rolling window of last 3 levels for tier decisions
- Downgrade trigger: 2 failures in last 3 levels → move to easier tier
- Upgrade trigger: 3 wins in a row with >80% of max possible score → move to harder tier

### Tier Adjustments (Pre-Level Only)
- **Normal tier**: Base level config (no modifications)
- **Easy tier**: +20% timer, -20% score target
- **Hard tier**: -15% timer, +50% power-up cooldowns (longer cooldowns)
- All adjustments applied before level starts — no mid-level changes
- Tier changes are completely invisible (no UI indicators)

### Hint Escalation (Same Level Failures)
- Triggers after 3 failures on the SAME level
- **Failure 3**: Show word length ("Find a 5-letter word")
- **Failure 4**: Show word length + highlight starting tile
- **Failure 5+**: Full word reveal (show complete path to trace)
- Hint level resets between levels (each level starts fresh)

### Claude's Discretion
- Exact combined score formula weights (completion vs time vs accuracy)
- Score threshold for "high score" (suggested 80%)
- Timer/target adjustment percentages (can tune during testing)
- Visual treatment of hint highlights (glow, outline, etc.)
- Analytics events for difficulty tracking

</decisions>

<specifics>
## Specific Ideas

- "Players should never know they're on easy mode" — avoid stigma, preserve dignity
- Adjustment should feel like natural game variation, not rubber-banding
- Hint system is separate from tier system — hints help on specific level struggles, tier handles overall skill

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-adaptive-difficulty-system*
*Context gathered: 2026-01-30*
