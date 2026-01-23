# Phase 5: Lexi Personality - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Lexi mascot provides emotional connection through contextual reactions and encouragement during adventure mode gameplay. This includes celebration animations on achievements, contextual feedback when players struggle, and level completion celebrations. Lexi's visual design/sprite generation belongs to Phase 6 (AI Asset Generation).

</domain>

<decisions>
## Implementation Decisions

### Celebration Triggers
- **Long word threshold:** 6+ letters triggers celebration (matches existing score bonus threshold)
- **Combo milestones:** 3x, 5x, 10x combos trigger progressively excited reactions
- **First word bonus:** Lexi encourages on first valid word of level (positive reinforcement)
- **Time-pressure wins:** Extra celebration when completing objective with <10 seconds remaining
- **No spam:** Cooldown between celebrations (~3 seconds) to avoid overwhelming

### Feedback Personality
- **Tone:** Playful and encouraging, never punishing or competitive
- **Stuck detection:** 15+ seconds without valid word triggers gentle hint
- **Struggle pattern:** 3+ failed attempts in short span triggers encouragement ("Keep trying!")
- **World-specific flavor:** Lexi comments adapt to world theme (meadow puns, spring jokes, cavern references)
- **Localization:** All Lexi dialogue uses translation keys - 4 language variants

### Animation Behavior
- **Position:** Bottom-right corner (RTL: bottom-left), above game controls
- **Entry:** Slide up + subtle bounce (consistent with Phase 2-3 spring physics)
- **Duration:** 1.5s display + 0.5s fade unless tapped
- **Interruption:** New celebration replaces current (queue would feel slow)
- **Level complete:** Center screen burst with stars (similar to 03-03 level title burst)

### Tap-to-Speed Behavior
- **Single tap:** Animation speeds to 2x, completes naturally
- **Double tap:** Immediate dismiss with quick fade
- **Auto-skip:** If reduced-motion preference, show static Lexi + text bubble instead
- **Touch target:** Entire Lexi area is tappable (generous hit area)

### Claude's Discretion
- Exact spring physics constants for Lexi animations
- Hint system specifics (what hints to show, how to detect "stuck")
- Animation easing curves
- Exact cooldown timing between celebrations
- Whether to show reaction on invalid word attempts

</decisions>

<specifics>
## Specific Ideas

- Lexi should feel like a supportive companion, similar to mascots in Nintendo games (helpful, never annoying)
- Celebration animations should complement, not interrupt, gameplay flow
- Follow existing animation patterns from Phases 2-3 (spring physics, similar timing)
- Lexi's expressions: idle, celebrate, hint, encourage, star-burst (5 states)

</specifics>

<deferred>
## Deferred Ideas

- Lexi sprite sheet generation — Phase 6 (AI Asset Generation)
- Lexi customization/outfits — future milestone
- Voice lines/sound effects for Lexi — not in current milestone scope
- Lexi tutorial/onboarding role — Phase 7 (Video Cutscenes)

</deferred>

---

*Phase: 05-lexi-personality*
*Context gathered: 2026-01-22*
