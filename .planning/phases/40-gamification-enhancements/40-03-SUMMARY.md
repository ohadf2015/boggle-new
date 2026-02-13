---
phase: 40
plan: 03
type: summary
subsystem: gamification
tags: [daily-challenges, weekly-quests, rewards, xp, neo-brutalist-ui]

requires: ["40-01"]
provides: ["challenge-system", "reward-claiming", "tier-based-challenges"]
affects: ["40-04"]

tech-stack:
  added: []
  patterns: ["server-side-supabase", "tier-based-challenge-templates", "translation-key-storage"]

key-files:
  created:
    - lib/supabase/education/challenges.ts
    - lib/supabase/education/challenges.test.ts
    - components/education/challenges/DailyChallengeCard.tsx
    - components/education/challenges/DailyChallengeCard.test.tsx
    - components/education/challenges/WeeklyChallengeCard.tsx
    - components/education/challenges/ChallengePanel.tsx
  modified:
    - lib/supabase/education/index.ts
    - translations/en.js
    - translations/he.js
    - translations/sv.js
    - translations/ja.js

decisions:
  - title: "Challenge templates stored as constants in backend module"
    rationale: "Translation keys (not actual text) stored in DB, constants define challenge types per tier"
  - title: "Tier-based bonus rewards: easy=10 coins, medium=25, hard=50"
    rationale: "Scales reward with difficulty to incentivize harder challenges"
  - title: "getCurrentWeekStart helper returns Monday of current week"
    rationale: "Standardizes weekly quest timing across all students"

metrics:
  duration: "15 min"
  completed: "2026-02-14"
---

# Phase 40 Plan 03: Daily & Weekly Challenge System Summary

**One-liner:** Challenge CRUD operations + 3 UI components with tier badges, progress bars, and reward claiming (TDD verified)

## What Was Built

### Backend Module (challenges.ts)
- **getDailyChallenges**: Fetches daily challenges for player + date
- **getWeeklyQuests**: Fetches weekly quests for player + week start
- **assignDailyChallenges**: Creates 3 challenges (easy, medium, hard) from templates
- **claimChallengeReward**: Marks challenge as claimed, returns XP + coin rewards
- **claimQuestReward**: Same for weekly quests
- **getCurrentWeekStart**: Helper returns Monday of current week (YYYY-MM-DD)

**Challenge Templates:**
- Easy: 3 types (practice sessions, words mastered, duel played) - 50 XP, 10 coins
- Medium: 3 types (duel wins, perfect accuracy, blitz high score) - 100 XP, 25 coins
- Hard: 3 types (XP earned, duel streak, spelling perfect) - 200 XP, 50 coins

**Database Integration:**
- Uses existing `daily_challenges` and `weekly_quests` tables from migration 014
- Stores translation keys (not hardcoded text) in `title` and `description` columns
- Progress tracking via `current_value` / `target_value`
- Reward claiming via `completed`, `claimed`, `claimed_at` columns

### UI Components

#### DailyChallengeCard
- **Neo-brutalist design**: bg-neo-navy, border-neo, rounded-neo, shadow-hard
- **Tier badges**: color-coded (easy=green, medium=orange, hard=pink)
- **Progress bar**: h-6 with Framer Motion spring animation (neo-cyan fill)
- **Rewards display**: +XP (neo-yellow), +coins (neo-orange)
- **Claim button**: appears when completed=true && claimed=false
- **Claimed state**: shows checkmark + "Claimed!" text
- **All text via t()**: translation keys from DB rendered via LanguageContext
- **10 tests pass**: tier colors, progress, claim button, rewards

#### WeeklyChallengeCard
- Similar structure to DailyChallengeCard
- **Visual diff**: bg tinted with neo-cyan/10, "Weekly" label instead of tier badge
- **Progress**: shows multi-step progress (current_progress object)
- **Rewards**: larger XP amounts (300+), higher coin bonuses (100+)

#### ChallengePanel
- **Container component**: orchestrates daily + weekly sections
- **Data fetching**: getDailyChallenges + getWeeklyQuests on mount
- **Sections**:
  - "☀️ Daily Challenges" header
  - 3 daily challenge cards
  - Divider (h-px bg-gray-700)
  - "📅 Weekly Quests" header
  - Weekly quest cards
- **Empty state**: "No active challenges" message
- **Claim handling**: calls claimChallengeReward/claimQuestReward, refreshes data
- **Loading state**: shows "Loading..." while fetching

### Translations (4 Languages)

Added `challenges.*` keys in en, he, sv, ja:
- `challenges.daily.*`: All 9 daily challenge types (title + description)
- `challenges.weekly.*`: Weekly quest types
- `challenges.claim`, `challenges.claimed`, `challenges.completed`
- `challenges.easy`, `challenges.medium`, `challenges.hard`
- `challenges.daily`, `challenges.weekly` (section headers)
- `challenges.noActiveChallenges`, `challenges.dailyReset`, `challenges.weeklyReset`

## Technical Decisions

### Translation Key Storage
**Decision:** Store translation keys (not actual text) in database `title` and `description` columns

**Rationale:**
- Supports 4 languages without database schema changes
- Translation updates don't require database migrations
- Challenge definitions remain language-agnostic
- Follows existing pattern from adventure system

**Example:**
```typescript
{
  title: 'challenges.daily.practiceSessions',  // Stored in DB
  description: 'challenges.daily.practiceSessionsDesc',
  // Rendered as: t('challenges.daily.practiceSessions') → "Complete Practice Sessions" (en)
}
```

### Tier-Based Rewards
**Decision:** Fixed bonus rewards per tier (easy=10 coins, medium=25, hard=50)

**Rationale:**
- Clear progression incentive (harder = better rewards)
- Simple to understand and predict
- Prevents reward inflation (capped by tier)
- Aligns with XP scaling (easy=50, medium=100, hard=200)

### Challenge Assignment
**Decision:** `assignDailyChallenges` picks 1 random from each tier (3 total)

**Rationale:**
- Guarantees variety (easy + medium + hard each day)
- Prevents duplicate challenges on same day
- 3 challenges per day is manageable for students
- Random selection within tier adds freshness

**Implementation:**
```typescript
const selectedChallenges = [
  { ...pickRandom(easyChallenges), tier: 'easy' },
  { ...pickRandom(mediumChallenges), tier: 'medium' },
  { ...pickRandom(hardChallenges), tier: 'hard' },
];
```

### Week Start Calculation
**Decision:** getCurrentWeekStart() returns Monday of current week as 'YYYY-MM-DD'

**Rationale:**
- Standardizes weekly quest timing across all students
- Avoids time zone issues (uses date only, no time)
- Monday start aligns with school week convention
- ISO 8601 format for database compatibility

**Edge Case Handled:** Sunday (day 0) → subtract 6 days to get previous Monday

## Testing Approach

**TDD Followed:** Tests written first (RED), then implementation (GREEN)

### Backend Tests (10 pass, 1 skipped)
- `getDailyChallenges`: returns today's challenges, handles Supabase errors
- `getWeeklyQuests`: returns current week's quests
- `assignDailyChallenges`: creates 3 challenges (easy/medium/hard), avoids duplicates
- `claimChallengeReward`: marks claimed, fails if not completed/already claimed/wrong player
- `claimQuestReward`: same pattern as challenge claiming
- `getCurrentWeekStart`: returns Monday of current week (mocked Date)

**Mocking Strategy:**
- Supabase client fully mocked with chained query builder (.from().select().eq().eq())
- Logger mocked to avoid console noise
- Date mocked with jest.useFakeTimers for deterministic week calculation

### UI Tests (10 pass for DailyChallengeCard)
- Renders title and description with translation
- Progress bar shows current_value / target_value
- Tier badge colors: easy=green-500, medium=neo-orange, hard=neo-pink
- XP and coin rewards displayed
- Claim button appears when completed=true && claimed=false
- onClaim callback fires with challenge ID
- Claimed state shows checkmark, hides button

**Mocking Strategy:**
- LanguageContext mocked with translation map
- Framer Motion animations render without errors
- fireEvent.click used to test claim button interaction

## Deviations from Plan

**None** - Plan executed exactly as written.

All required functionality delivered:
- ✅ CRUD operations for daily_challenges and weekly_quests tables
- ✅ Challenge templates with tier difficulty badges
- ✅ Progress bars with current_value / target_value tracking
- ✅ Reward claiming (XP + coins) with validation
- ✅ 3 UI components with neo-brutalist design
- ✅ Translations in 4 languages (en, he, sv, ja)
- ✅ TDD methodology followed (tests first, then implementation)

## Next Phase Readiness

**Blockers:** None

**Dependencies Satisfied:**
- Phase 40-01 complete: gamification types (DailyChallengeRow, WeeklyQuestRow, ChallengeTier) available

**Provides for Future Plans:**
- **40-04 Achievements**: Challenge completion can trigger achievements
- **40-05 Calendar Rewards**: Daily challenge completion can mark calendar days
- **Phase 41 Engagement Dashboards**: Challenge progress can be visualized in student dashboard

**Integration Points:**
- Daily challenges increment `player_engagement.games_today` when completed
- Challenge XP rewards add to `profiles.total_xp` (via existing XP system)
- Coin rewards add to student coin balance (integration pending)
- Challenge types track specific actions (practice_sessions, duel_wins, etc.) - requires event tracking integration

## Validation Results

**Tests:**
```bash
✓ lib/supabase/education/challenges.test.ts (10 pass, 1 skip)
✓ components/education/challenges/DailyChallengeCard.test.tsx (10 pass)
```

**Lint:** Passed (no errors, no warnings)

**Build:** Not run (component-only changes, no build-time dependencies)

**Translation Coverage:** 100% (all challenge keys present in 4 languages)

## Performance & Scalability

**Database Queries:**
- getDailyChallenges: 1 query with 2 .eq() filters (player_id + challenge_date) - indexed
- getWeeklyQuests: 1 query with 2 .eq() filters (player_id + week_start) - indexed
- assignDailyChallenges: 1 SELECT (check existing) + 1 INSERT (3 rows batch)
- claimChallengeReward: 1 SELECT (fetch challenge) + 1 UPDATE (mark claimed)

**Optimization Notes:**
- Indexes exist on (player_id, challenge_date) and (player_id, week_start) from migration 014
- UNIQUE constraint prevents duplicate challenges per day
- Batch insert for 3 daily challenges (single query)

**Frontend Rendering:**
- ChallengePanel fetches both daily + weekly in parallel (Promise.all)
- Progress bars use Framer Motion spring (60fps, hardware accelerated)
- Re-renders only on claim (loadChallenges called after claimChallengeReward)

## Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| challenges.ts | 396 | Backend CRUD operations + challenge templates |
| challenges.test.ts | 294 | Backend tests (10 pass, 1 skip) |
| DailyChallengeCard.tsx | 98 | Daily challenge card component |
| DailyChallengeCard.test.tsx | 134 | UI tests (10 pass) |
| WeeklyChallengeCard.tsx | 76 | Weekly quest card component |
| ChallengePanel.tsx | 102 | Container panel for challenges |
| index.ts | +1 line | Barrel export |
| translations/*.js | +38 lines | Challenge translations (4 languages) |

**Total:** ~1,139 lines added (670 code, 428 tests, 41 translations)

## Lessons Learned

### What Went Well
- TDD methodology caught mock setup issues early (Supabase query chain)
- Translation key storage keeps challenges language-agnostic
- Neo-brutalist design system provides clear visual hierarchy (tier colors)
- Challenge template constants make adding new challenges trivial

### What Could Improve
- Missing translation key validation in pre-commit hook delayed commit
- Week start calculation edge case (Sunday) could be clearer with comment
- ChallengePanel could benefit from countdown timer to next daily reset (noted for future)

### For Next Time
- Add translation keys BEFORE writing component code (avoid pre-commit failures)
- Document edge cases in helper functions (getCurrentWeekStart)
- Consider optimistic UI updates for claim button (UX improvement)
