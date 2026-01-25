# Phase 19: Achievement System - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Reward students with meaningful achievement badges and classroom leaderboards. Includes badge earn/unlock flow, profile display, and classroom-scoped leaderboard. XP system from Phase 18 provides unlock triggers. Teacher analytics view of achievements is separate (Phase 20).

</domain>

<decisions>
## Implementation Decisions

### Leaderboard Design
- Show top 3 students + "You're #X" for current student (privacy-conscious)
- Leaderboard is classroom-scoped (students only see their classroom)
- Claude's discretion: time scope (weekly reset vs all-time toggle)
- Claude's discretion: XP amounts vs levels vs rank-only display
- Claude's discretion: inactive student handling (hide/gray out 7+ days inactive)

### Achievement Categories
- All 4 category types: Progress milestones, Skill-based feats, Consistency habits, Exploration
- Progress milestones: "First lesson complete", "50 words mastered", "Level 10 reached"
- Skill-based feats: "10 words in one game", "Perfect accuracy streak", "Boss defeated"
- Consistency habits: "7-day streak", "30-day streak", "Practice every day this week"
- Exploration: "Tried all practice modes", "Completed vocabulary from 5 lessons"

### Tier Progression
- Same achievement with harder thresholds per tier (not separate badges)
- Example: "Word Master Bronze (50 words)" → "Silver (150)" → "Gold (500)" → "Platinum (1000)"
- Locked badges shown with hints: "??? - Play 5 boss battles to unlock"
- 5-10% of badges are "secret" (hidden until earned) for surprise/delight

### Unlock Celebration
- Sound effects: Yes, celebratory chime on unlock (respects device mute setting)
- Timing: Immediately on unlock (doesn't wait for activity end)
- Confetti: Reuse `fireLevelUpConfetti` from Phase 18 LevelUpCelebration
- Claude's discretion: modal prominence (full celebration vs toast based on tier)

### Profile Badge Display
- Progress bars shown: "Word Master Silver: 142/250 words" with visual progress
- Pin up to 3 featured badges that display prominently
- Total completion shown: "60% Complete - 12/20 badges"
- Claude's discretion: layout (grid vs category sections vs carousel)

### Claude's Discretion
- Leaderboard time scope (weekly vs all-time vs toggle)
- Leaderboard XP/level display format
- Inactive student handling on leaderboard
- Unlock modal prominence per tier
- Profile badge layout style
- Specific badge names and thresholds (within 15-20 total count)

</decisions>

<specifics>
## Specific Ideas

- Reuse Phase 18's `fireLevelUpConfetti` effect for consistency
- Tier progression feels natural: same badge getting "upgraded" rather than separate badges
- Privacy-first leaderboard: top 3 + your rank avoids exposing bottom performers
- Secret badges (5-10%) create moments of surprise without hiding too much

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-achievement-system*
*Context gathered: 2026-01-25*
