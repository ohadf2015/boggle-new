# Single Player Mode - Loose Ends and Unfinished Features Analysis

**Analysis Date:** 2026-01-17
**Feature Type:** Enhancement/Gap Analysis
**Complexity:** Medium

## Executive Summary

After thorough analysis of the single player mode codebase, I've identified several loose ends and incomplete features. The core gameplay is solid, but there are gaps in the user experience, particularly around **global leaderboard visibility**, **training mode progression**, and **challenge mode polish**.

---

## IDENTIFIED LOOSE ENDS AND UNFINISHED FEATURES

### 1. GLOBAL LEADERBOARD UI - BACKEND EXISTS, NO FRONTEND

**Status:** Backend API complete, frontend UI missing

**Evidence:**
- `backend/routes/singlePlayerLeaderboard.ts` has a complete API:
  - `GET /api/single-player/leaderboard` - Returns ranked leaderboard (lines 131-178)
  - `GET /api/single-player/stats/:fingerprint` - Returns player stats with rank
- Database migration `043_single_player_leaderboard.sql` creates table and view
- `SinglePlayerResults.tsx` syncs scores to leaderboard (lines 219-268)
- **NO UI component exists to display the global leaderboard**

**What's Missing:**
- [ ] Leaderboard page or modal showing top single-player scores
- [ ] "View Leaderboard" button in PresetSelector or SinglePlayerResults
- [ ] Player's global rank display in results screen
- [ ] Comparison to global average/percentile

**Priority:** HIGH - Backend work is done but users can't see it

---

### 2. PRACTICE MODE - INCOMPLETE TRAINING PROGRESSION

**Status:** Training system implemented but not connected to UI

**Evidence:**
- `useTrainingProgress.ts` tracks 5 skills: firstWord, diagonal, directionChange, targetScore, fiveWords
- `useTrainingAnalysis.ts` provides hints and skill gap detection
- `utils/trainingProgressStorage.ts` has comprehensive skill tracking
- **Training progress UI exists but is minimal**

**What's Missing:**
- [ ] No clear "Training Complete" celebration when all skills unlocked
- [ ] Training progress is not visible in lobby/preset selector
- [ ] No "Training Recommended" prompt for new players
- [ ] Skill hints during practice mode appear to be incomplete (`currentHint` is tracked but display is unclear)
- [ ] No persistent "training badge" or completion indicator

**Priority:** MEDIUM - Feature exists but discovery is poor

---

### 3. CHALLENGE MODE - MISSING DIFFICULTY-SPECIFIC LEADERBOARDS

**Status:** High scores are tracked per difficulty/duration but not displayed comparatively

**Evidence:**
- `highScoreManager.ts` stores scores keyed by `"DIFFICULTY_DURATION"` (e.g., "MEDIUM_120")
- `getProgressStats()` returns totalGames, highScoreBeats, uniqueConfigurations
- Only shows **current configuration's** high score in lobby

**What's Missing:**
- [ ] No way to view all high scores across different difficulties
- [ ] No "Best Scores" dashboard showing records for each difficulty level
- [ ] Challenge mode stats page with comprehensive progress overview
- [ ] No comparison between difficulty levels to show mastery progression

**Priority:** MEDIUM - Data exists but can't be viewed comprehensively

---

### 4. COMMUNITY WORD VOTING - INCOMPLETE FEEDBACK LOOP

**Status:** Voting API exists but results are not visible to users

**Evidence:**
- `app/api/single-player/vote/route.ts` handles word voting
- Words are tracked with net score (likes - dislikes)
- Threshold detection at 6 net score (line mentions "crosses validation threshold")
- **No UI showing voting results or community-approved words**

**What's Missing:**
- [ ] No "Community Approved Words" list visible to users
- [ ] No feedback on impact of votes (e.g., "This word was added thanks to votes like yours!")
- [ ] No display of controversial or rejected words
- [ ] Voting modal exists but results are opaque

**Priority:** LOW - Nice-to-have feature for engagement

---

### 5. ACHIEVEMENTS DISPLAY - INCOMPLETE POST-GAME

**Status:** Achievements are calculated and saved but display could be improved

**Evidence:**
- `singlePlayerAchievements.ts` defines 27 achievements
- Live achievements show during gameplay
- Achievements saved to profile for authenticated users
- `SinglePlayerResults.tsx` displays achievements

**What's Missing:**
- [ ] No "Achievement Gallery" showing all possible achievements with unlock status
- [ ] No achievement progress indicators (e.g., "23/27 unlocked")
- [ ] No notification when close to unlocking an achievement
- [ ] No sharing capability for achievements

**Priority:** LOW - Works but could be enhanced

---

### 6. DAILY CHALLENGE MODE - REFERENCED BUT NOT IMPLEMENTED

**Status:** Code references 'daily' mode but implementation is missing

**Evidence:**
- `SinglePlayerView.tsx` line 44: `export type SinglePlayerMode = 'solo-bots' | 'practice' | 'challenge' | 'daily';`
- `MODE_CONFIG` in `PresetSelector.tsx` excludes 'daily': `Record<Exclude<SinglePlayerMode, 'daily'>, ...>`
- URL parameter `returnTo=daily` mentioned in comments but leads nowhere
- Translation key `singlePlayer.mode.daily` may not exist

**What's Missing:**
- [ ] Daily Challenge mode implementation (shared daily puzzle for all players)
- [ ] Global daily leaderboard
- [ ] "Compare with friends" for daily challenge
- [ ] Daily streak tracking

**Priority:** MEDIUM - Type exists but feature doesn't

---

### 7. BOT DIFFICULTY BALANCING - POTENTIAL ISSUE

**Status:** Bot simulation exists but may have balancing issues

**Evidence:**
- `useBotSimulation.ts` handles AI word generation
- Bot difficulties: easy, medium, hard
- No visible metrics on bot win rates or score distributions

**What's Missing:**
- [ ] No analytics on bot difficulty appropriateness
- [ ] No adaptive difficulty based on player skill
- [ ] No bot personality or variation (all bots use same algorithm)
- [ ] Limited feedback on "how close" player was to beating bot

**Priority:** LOW - Functional but could be polished

---

### 8. DESKTOP LAYOUT - INCOMPLETE STATS PANEL

**Status:** Desktop layout exists but may have gaps

**Evidence:**
- `DesktopStatsPanel.tsx` and `DesktopWordList.tsx` exist
- Referenced in `SinglePlayerGame.tsx` for 3-column desktop layout

**What's Missing:**
- [ ] Training progress display on desktop not verified
- [ ] Desktop-specific combo/achievement animations unclear
- [ ] Large screen optimizations may be incomplete

**Priority:** LOW - Likely functional but needs verification

---

## TRANSLATION GAPS

Several translation keys may be missing or inconsistent:

```
Missing or potentially incomplete keys:
- singlePlayer.mode.daily
- challenge.viewAllRecords
- leaderboard.global
- leaderboard.yourRank
- training.complete
- training.skillUnlocked
- achievements.gallery
- achievements.progress
```

---

## RECOMMENDED PRIORITIZATION

### Phase 1: HIGH PRIORITY (Immediate Value)
1. **Global Leaderboard UI** - Backend ready, just needs frontend
   - Add leaderboard modal/page
   - Show player's rank in results
   - Add "View Leaderboard" buttons

### Phase 2: MEDIUM PRIORITY (User Experience)
2. **Challenge Mode Dashboard** - Show all high scores
3. **Training Mode Polish** - Clear completion state
4. **Daily Challenge** - Implement or remove type

### Phase 3: LOW PRIORITY (Nice-to-Have)
5. **Achievement Gallery** - Showcase all achievements
6. **Community Voting Feedback** - Show voting impact
7. **Bot Balancing** - Analytics and adaptive difficulty

---

## TECHNICAL DEBT NOTES

1. **Type Inconsistency**: `SinglePlayerMode` includes 'daily' but it's not implemented
2. **Unused API**: `/api/single-player/leaderboard` endpoint exists but nothing calls it
3. **Training Data**: `trainingProgressStorage.ts` stores data that's never fully displayed
4. **Comment References**: Several "TODO" patterns in comments reference features that don't exist

---

## FILES FOR IMPLEMENTATION

### For Global Leaderboard:
- CREATE: `components/singleplayer/GlobalLeaderboard.tsx`
- CREATE: `components/singleplayer/LeaderboardModal.tsx`
- UPDATE: `components/singleplayer/PresetSelector.tsx` - Add leaderboard button
- UPDATE: `components/singleplayer/SinglePlayerResults.tsx` - Show rank
- ADD: Translation keys for leaderboard

### For Training Polish:
- UPDATE: `components/singleplayer/SinglePlayerGame.tsx` - Better training progress display
- UPDATE: `hooks/useTrainingProgress.ts` - Add completion celebration hook
- CREATE: `components/singleplayer/TrainingCompleteBanner.tsx`

### For Challenge Dashboard:
- CREATE: `components/singleplayer/ChallengeDashboard.tsx`
- UPDATE: `components/singleplayer/highScoreManager.ts` - Add getAllHighScores()
- UPDATE: `components/singleplayer/PresetSelector.tsx` - Add dashboard access

---

## CONFIDENCE ASSESSMENT

**Analysis Confidence:** 9/10

The analysis is based on:
- Direct code review of 20+ relevant files
- Pattern matching for TODOs, incomplete implementations
- Cross-referencing backend APIs with frontend usage
- Translation key analysis
- Type definition review

Some uncertainty exists around:
- Whether some features are intentionally deferred vs. forgotten
- Exact priority from product perspective (business value not analyzed)
- Test coverage gaps (not fully audited)

---

## NEXT STEPS

1. **Review this analysis** with product owner to confirm priorities
2. **Create individual task items** for each identified gap
3. **Start with Global Leaderboard** - highest ROI (backend done)
4. **Consider removing 'daily' type** if not planned for implementation
5. **Add feature flags** for phased rollout of improvements
