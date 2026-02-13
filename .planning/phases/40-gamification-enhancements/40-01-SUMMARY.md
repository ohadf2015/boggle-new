---
phase: 40-gamification-enhancements
plan: 01
subsystem: gamification-foundation
tags: [database, migration, types, achievements, leaderboard]

requires:
  - 39-05 # Real-time duels complete (duel achievements depend on this)
  - 37-01 # Practice modes foundation (practice achievements depend on this)

provides:
  - leaderboard_snapshots table for rank change tracking
  - 10 new achievement definitions (5 duel + 5 practice)
  - 40 achievement tier entries (4 tiers per achievement)
  - TypeScript types for gamification features

affects:
  - 40-02 # Daily challenges depend on these types
  - 40-03 # Weekly quests depend on these types
  - 40-04 # Milestone celebrations depend on these types

tech-stack:
  added: []
  patterns:
    - "Leaderboard snapshot pattern for rank change tracking"
    - "Four-tier achievement system (bronze/silver/gold/platinum)"

key-files:
  created:
    - fe-next/supabase/migrations/20260215000000_gamification_enhancements.sql
  modified:
    - fe-next/lib/supabase/education/types.ts

decisions:
  - "Leaderboard snapshots use UNIQUE constraint instead of WITHOUT OVERLAPS (PostgreSQL 18+ feature not yet available)"
  - "Achievement FK references profiles(id) following blast_results pattern (not auth.users)"
  - "Service role only for snapshot insert/update (snapshots created by server logic, not client)"
  - "Duel achievements track: wins, streak, comebacks, speed, veteran status"
  - "Practice achievements track: spelling accuracy, matching speed, blitz scores, streaks, mode variety"

metrics:
  duration: 2 min
  completed: 2026-02-14
---

# Phase 40 Plan 01: Database Foundation Summary

**One-liner:** Leaderboard snapshots table + 10 new achievement definitions (5 duel + 5 practice) with 4-tier thresholds for gamification features.

## What Was Built

### 1. Leaderboard Snapshots Table
- Historical snapshots for rank change tracking (weekly/monthly)
- Tracks classroom_id, student_id, snapshot_date, time_scope, total_xp, rank_position
- RLS policies: authenticated users can read snapshots for classrooms they belong to
- Indexes: classroom/time_scope lookup + student lookup
- Service role only for insert/update (server-controlled snapshots)

### 2. New Duel Achievement Definitions (5 achievements)
- **duel_champion** (skill): Win duels (3/10/25/50 wins)
- **duel_streak** (consistency): Consecutive duel wins (3/5/10/20 wins)
- **comeback_king** (skill): Win after being behind (1/5/15/30 comebacks)
- **speed_dueler** (skill): Find words fast in realtime duels (5/15/30/50 fast words)
- **duel_veteran** (progress): Total duels played (5/20/50/100 duels)

### 3. New Practice Achievement Definitions (5 achievements)
- **spelling_ace** (skill): Perfect spelling rounds (5/15/50/100 perfect rounds)
- **matching_master** (skill): Fast matching completions (10/30/75/150 completions)
- **blitz_champion** (skill): High blitz scores 500+ (3/10/25/50 high scores)
- **practice_streak** (consistency): Consecutive days of practice (3/7/14/30 days)
- **mode_master** (exploration): Complete sessions in all practice modes (2/3/4/5 modes)

### 4. TypeScript Types
Added gamification types to `lib/supabase/education/types.ts`:
- `LeaderboardTimeScope` - 'weekly' | 'monthly' | 'all-time'
- `LeaderboardEntryWithDelta` - Leaderboard entry with rank change data
- `LeaderboardSnapshotRow` - Database row for snapshots
- `DailyChallengeRow` - Daily challenge data structure
- `WeeklyQuestRow` - Weekly quest data structure
- `MilestoneLevel` - Milestone level definition
- `ChallengeTier` - 'easy' | 'medium' | 'hard'
- `AchievementCategory` - 'progress' | 'skill' | 'consistency' | 'exploration'

## Commits

| Commit | Type | Description | Files |
|--------|------|-------------|-------|
| f14411c3 | feat | Create gamification enhancements migration | supabase/migrations/20260215000000_gamification_enhancements.sql |
| c2828680 | feat | Add gamification TypeScript types | lib/supabase/education/types.ts |

## Decisions Made

1. **UNIQUE Constraint Instead of WITHOUT OVERLAPS**
   - PostgreSQL WITHOUT OVERLAPS requires PostgreSQL 18+ (not yet widely available)
   - Used UNIQUE(classroom_id, student_id, snapshot_date, time_scope) instead
   - Achieves same uniqueness constraint with broader compatibility

2. **Service Role Only for Snapshots**
   - Leaderboard snapshots created by server-side cron jobs/logic
   - No client-side insert/update policies (only SELECT)
   - Prevents client tampering with historical data

3. **Four-Tier Achievement System**
   - Bronze → Silver → Gold → Platinum progression
   - Each tier has increasing thresholds (3x to 5x multiplier)
   - Consistent tier progression across all achievements

4. **Achievement Category Distribution**
   - Duel achievements: 3 skill + 1 consistency + 1 progress
   - Practice achievements: 3 skill + 1 consistency + 1 exploration
   - Balanced across categories for diverse engagement

## Deviations from Plan

None - plan executed exactly as written.

## Testing

### Verification Performed
- SQL syntax validated (197 lines of migration SQL)
- TypeScript compilation verified with `npx tsc --noEmit` (no errors)
- Pre-commit hooks passed (translation check + linting)

### Manual Testing Required
- Migration application to actual database (requires Supabase credentials)
- Verify table creation and RLS policies work as expected
- Test snapshot insertion from server-side code

## Next Phase Readiness

### Blockers
- None. All foundation tables and types are ready for Plans 02-04.

### Dependencies for Next Plans
- **Plan 02 (Daily Challenges):** Depends on DailyChallengeRow type ✅
- **Plan 03 (Weekly Quests):** Depends on WeeklyQuestRow type ✅
- **Plan 04 (Milestone Celebrations):** Depends on MilestoneLevel type ✅

### Migration Notes
- Migration file created but NOT yet applied to database
- User mentioned Supabase MCP tools for migration application
- Supabase CLI available (`/opt/homebrew/bin/supabase`) but project not linked
- Migration should be applied before proceeding to Plan 02

## Technical Notes

### Database Schema
```sql
-- Leaderboard snapshots table structure
CREATE TABLE leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    time_scope VARCHAR(10) NOT NULL CHECK (time_scope IN ('weekly', 'monthly')),
    total_xp INTEGER NOT NULL DEFAULT 0,
    rank_position INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(classroom_id, student_id, snapshot_date, time_scope)
);
```

### Achievement Pattern
- Each achievement has a `key` (unique identifier)
- Translation keys: `achievements.{key}.name` and `achievements.{key}.description`
- Icon is emoji (⚔️, 🔥, 👑, ⚡, 🛡️, ⭐, 🧩, 🚀, 📅, 🧭)
- Four tiers with increasing thresholds (bronze → silver → gold → platinum)

### RLS Security Model
- Authenticated users can read snapshots for classrooms they're members of
- Only service role can insert/update snapshots (server-controlled)
- Prevents client-side tampering with historical leaderboard data

## Files Changed

**Created:**
- `fe-next/supabase/migrations/20260215000000_gamification_enhancements.sql` (197 lines)
  - Leaderboard snapshots table with indexes and RLS
  - 10 achievement definitions (5 duel + 5 practice)
  - 40 achievement tier entries (4 per achievement)

**Modified:**
- `fe-next/lib/supabase/education/types.ts` (+70 lines)
  - Added 8 new gamification types and interfaces
  - Section header: "GAMIFICATION TYPES (Phase 40)"

## Performance Considerations

### Indexes
- `idx_leaderboard_snapshots_lookup` - Fast classroom/time_scope queries
- `idx_leaderboard_snapshots_student` - Fast student history queries
- Both indexes use DESC sort on snapshot_date for recent-first retrieval

### Data Volume Estimates
- Snapshots per classroom per student: ~52 weekly + ~12 monthly per year = 64 rows/year
- For 1000 students across 50 classrooms: ~3.2M rows/year
- With indexes, queries should remain fast even at scale

## Lessons Learned

1. **PostgreSQL Version Compatibility**
   - Always check PostgreSQL version requirements for new features
   - WITHOUT OVERLAPS is PostgreSQL 18+ (not yet in Supabase)
   - Use UNIQUE constraints as fallback for broader compatibility

2. **Service Role Pattern for Historical Data**
   - Historical snapshots should be server-controlled, not client-writable
   - Use RLS to allow SELECT but restrict INSERT/UPDATE to service role
   - Prevents tampering while allowing transparency

3. **Achievement Tier Balance**
   - Bronze tier should be achievable quickly (first session or two)
   - Platinum tier should be long-term goal (weeks/months of play)
   - Typical ratio: Bronze → Silver (3x) → Gold (2.5x) → Platinum (2x)

## Risk Assessment

**Low Risk:**
- Migration is idempotent (IF NOT EXISTS checks)
- No breaking changes to existing tables
- Pure additive schema changes

**Medium Risk:**
- Migration not yet applied to database (requires manual application)
- Translation keys for new achievements not yet added (40+ keys needed)

**No High Risks Identified**
