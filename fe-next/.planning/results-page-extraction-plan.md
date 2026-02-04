# ResultsPage.tsx Extraction Plan

**Original Size:** 1407 lines
**Target Size:** <500 lines per component
**Goal:** Split by responsibility, extract reusable pieces

---

## Current Analysis

### File Statistics:
- **Total lines:** 1407
- **Dynamic imports:** 17 components
- **State variables + hooks:** 36+
- **Single component:** Lines 64-1405 (1341 lines!)

### Responsibilities Identified:
1. **Modal Management** - 6 different modals with state
2. **Score Calculation** - Complex sorting, ranking, archetype calculation
3. **Coin/XP/Rewards** - Win streaks, coin awards, XP tracking
4. **Stats Tracking** - Game history, cognitive scores, growth tracking
5. **Socket Events** - Word feedback, XP updates, ready states
6. **Player Cards** - Current player, top 3, other players rendering
7. **Collapsible Sections** - Progress charts, missed words, chat
8. **Action Buttons** - Play again, exit, share functionality

---

## Extraction Plan

### Phase 1: Extract Modal Management Component (PRIORITY)
**Estimated Impact:** ~80-100 lines removed

**Create:** `components/results/ResultsModals.tsx`

**Modals to Extract:**
- WordFeedbackModal (feedback state + handlers)
- MysteryRewardPopup (mystery reward state)
- ReferralMilestonePopup (referral milestone state)
- AuthModal (auth state)
- FirstWinSignupModal (first win state)
- LevelUpCelebration (level up state)

**State to Move:**
- `showWordFeedback`, `wordToVote`, `handleWordVote`
- `showMysteryReward`, `mysteryReward`
- `showReferralMilestone`, `referralMilestone`
- `showAuthModal`, `setShowAuthModal`
- `showFirstWinModal`, `setShowFirstWinModal`
- `showLevelUpCelebration`, `levelUpData`

---

### Phase 2: Extract Results Data Processing Hook
**Estimated Impact:** ~120-150 lines removed

**Create:** `hooks/useResultsData.ts`

**Logic to Extract:**
- Score sorting and ranking
- Player archetype calculation
- Missed words identification
- Share card stats calculation
- Win detection logic
- Rewards summary data

**Returns:**
```typescript
{
  sortedScores,
  currentPlayerData,
  currentPlayerRank,
  isCurrentUserWinner,
  playerArchetypes,
  missedWords,
  shareCardStats,
  winStreakData,
  // ... etc
}
```

---

### Phase 3: Extract Side Effects Hook
**Estimated Impact:** ~100-120 lines removed

**Create:** `hooks/useResultsSideEffects.ts`

**Effects to Extract:**
- Game history tracking (addGameToHistory)
- Coin awards (awardGameCoins)
- Growth tracking (trackGameCompletion, trackStreakMilestone)
- Cognitive score saving
- Stats updates (updateGuestStatsAfterGame)
- Database sync (syncCoinsToDatabase)

**All the `useEffect` hooks with refs:**
- `hasUpdatedStatsRef`
- `hasTrackedGameRef`
- `hasAddedToHistoryRef`
- `hasAwardedCoinsRef`
- `hasSavedCognitiveScoreRef`

---

### Phase 4: Split into Single/Multiplayer Components (OPTIONAL)
**Estimated Impact:** Split remaining code into 2 focused components

**Create:**
- `components/results/SinglePlayerResults.tsx`
- `components/results/MultiplayerResults.tsx`

**Split criteria:**
- Single player: `playerCount === 1` or `sortedScores.length === 1`
- Multiplayer: `sortedScores.length > 1`

**Shared components:**
- ResultsModals (Phase 1)
- useResultsData (Phase 2)
- useResultsSideEffects (Phase 3)

---

## Implementation Order

### Step 1: Phase 1 - Extract ResultsModals
1. Create ResultsModals.tsx component
2. Move modal state + handlers
3. Write tests for modal visibility logic
4. Integrate into ResultsPage
5. Verify all modals still work
6. Commit "refactor(results): extract modal management"

### Step 2: Phase 2 - Extract useResultsData
1. Create useResultsData.ts hook
2. Move score calculation logic
3. Write tests for data transformations
4. Integrate into ResultsPage
5. Verify all calculations correct
6. Commit "refactor(results): extract data processing hook"

### Step 3: Phase 3 - Extract useResultsSideEffects
1. Create useResultsSideEffects.ts hook
2. Move all tracking/saving effects
3. Write tests for effect triggering
4. Integrate into ResultsPage
5. Verify all tracking works
6. Commit "refactor(results): extract side effects hook"

### Step 4: (Optional) Phase 4 - Split Single/Multiplayer
1. Create SinglePlayerResults.tsx
2. Create MultiplayerResults.tsx
3. Write tests for both components
4. Update ResultsPage to route
5. Verify both modes work
6. Commit "refactor(results): split single/multiplayer components"

---

## Success Criteria

1. ✅ ResultsPage.tsx < 500 lines (or split into 2 components <500 each)
2. ✅ All existing tests pass
3. ✅ Each extracted piece has tests
4. ✅ Zero functionality loss
5. ✅ TDD methodology followed (RED-GREEN-REFACTOR)
6. ✅ Performance maintained (dynamic imports preserved)

---

## Risk Mitigation

**High-Risk Areas:**
- Modal state dependencies (modals may depend on each other)
- Socket event handlers (complex dependencies)
- Coin/XP award timing (must happen in correct order)
- First win detection (depends on multiple states)

**Mitigation:**
- Start with Phase 1 (modals) - lowest risk, clear boundaries
- Thorough testing at each phase
- Incremental commits (one phase at a time)
- Keep existing tests passing throughout

---

## Notes

- **Dynamic imports must be preserved** - Keep performance benefits
- **Socket events hook** (`useResultsSocketEvents`) already extracted
- **Action buttons** (`ResultsActionButtons`) already extracted
- Phase 1 is **highest priority** - addresses Task #9
- Phases 2-3 can follow if user wants more simplification
- Phase 4 is optional - only if target not met after Phases 1-3

