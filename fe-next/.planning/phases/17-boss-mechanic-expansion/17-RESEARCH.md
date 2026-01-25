# Phase 17 Research: Boss Mechanic Expansion

## Summary

Phase 16 completed the boss infrastructure (HP tracking, phase transitions, popQuiz mechanic). Phase 17 expands boss mechanics from 1 to 7 distinct gameplay twists. All boss configs and UI already exist—we need to implement the **mechanic evaluation logic** for 6 new mechanics and refine the `finalWord` multi-phase system.

**Key Insight:** Most mechanics follow a **threshold-based pattern** (word meets condition → apply bonus multiplier). Existing `buildThresholdResult()` helper handles this pattern. We need:
1. Detection functions (isPalindrome exists, need isCompound, isAnagram, isIdiomWord, isNeologism, isMultilingual)
2. Mechanic evaluators calling detection functions with boss params
3. Translation keys for feedback (many already exist)
4. Tests for each mechanic (TDD)

## Requirements Analysis

### BOSS-06: idiomIslands (Captain Metaphor - World 4)
**Goal:** Complete idiom phrases for bonus damage

**Current State:**
- Boss config exists: `captainMetaphor` in `bossConfig.ts`
- Mechanic type: `'idiomBattle'`
- Params: `idiomBonusMultiplier: 2.5`, `wordsPerIdiom: 3`, `anchorTileLockDuration: 10`
- Evaluator: `evaluateIdiomBattle()` - **STUB** (only checks word length >= 6)

**What's Needed:**
- Idiom word list (common English idioms broken into words)
- Detection: Check if word is part of an idiom phrase
- Optional: Track idiom completion state (find all words in "break the ice" → 3/3 = bonus)
- Fallback: Current length check (6+ letters = bonus) is acceptable MVP

**Implementation Complexity:** Medium (data-driven, need idiom list)

**Translation Keys:**
- `adventure.bosses.captainMetaphor.mechanic` ✅ (exists)
- `adventure.bosses.captainMetaphor.taunts.*` ✅ (exists)
- Feedback key: `"It's raining cats and dogs! Find RAIN, CATS, and DOGS!"` pattern exists

---

### BOSS-07: compoundMerge (Baron Buildaword - World 5)
**Goal:** Merge compound words for combo multiplier

**Current State:**
- Boss config exists: `baronBuildaword` in `bossConfig.ts`
- Mechanic type: `'assemblyLine'`
- Params: `compoundBonusMultiplier: 3.0`, `conveyorSpeed: 3`, `machineInterval: 20`
- Evaluator: `evaluateAssemblyLine()` - **STUB** (only checks word length >= 5)

**What's Needed:**
- Compound word detection algorithm OR compound word list
- Detection: Check if word is a compound (butterfly, football, baseball, etc.)
- Heuristic: English compound words often have clear parts (sun+flower, rain+bow)
- Fallback: Current length check (5+ letters = bonus) is acceptable MVP

**Implementation Complexity:** Medium (need compound detection logic or data)

**Existing Code:**
- `backend/utils/gameUtils.ts:578` has "Try to embed a compound word into the grid" comment
- `backend/services/buzz/promptSections.ts:148` mentions "COMPOUND WORD CHAIN"
- Kanji compounds exist: `backend/kanji_compounds.txt` (Japanese only)

**Translation Keys:**
- `adventure.bosses.baronBuildaword.mechanic` ✅ (exists)
- `adventure.bosses.baronBuildaword.taunts.*` ✅ (exists)
- Feedback key: `adventure.bosses.common.compoundDetected` ✅ (exists in evaluateAssemblyLine)

---

### BOSS-08: anagramScramble (Puzzle Master - World 6)
**Goal:** Solve anagrams for critical hits

**Current State:**
- Boss config exists: `puzzleMaster` in `bossConfig.ts`
- Mechanic type: `'scrambledReality'`
- Params: `anagramBonusMultiplier: 2.0`, `scrambleInterval: 10`, `riddleTileCount: 2`
- Evaluator: `evaluateScrambledReality()` - **PARTIAL** (checks uniqueLetters >= 4)

**What's Needed:**
- Anagram detection: Given word, check if any previously found word is anagram
- Track found words in `mechanicState` to compare
- Example: User finds "LISTEN" then "SILENT" → anagram pair detected → bonus
- Current unique letters check (4+) is acceptable fallback

**Implementation Complexity:** Low (sorting letters, comparison)

**Algorithm:**
```typescript
function areAnagrams(word1: string, word2: string): boolean {
  const sorted1 = word1.toUpperCase().split('').sort().join('');
  const sorted2 = word2.toUpperCase().split('').sort().join('');
  return sorted1 === sorted2 && word1 !== word2;
}
```

**Translation Keys:**
- `adventure.bosses.puzzleMaster.mechanic` ✅ (exists)
- `adventure.bosses.puzzleMaster.taunts.*` ✅ (exists)
- Feedback key: "Find the anagram pair! LISTEN and SILENT are waiting!" exists

---

### BOSS-09: palindromeMirror (Reflection King - World 7)
**Goal:** Palindrome words deal double damage

**Current State:**
- Boss config exists: `reflectionKing` in `bossConfig.ts`
- Mechanic type: `'mirrorMatch'`
- Params: `palindromeBonusMultiplier: 3.0`, `mirrorAxis: 'vertical'`, `iceCrackThreshold: 2`
- Evaluator: `evaluateMirrorMatch()` - **COMPLETE** ✅

**Implementation:**
- `isPalindrome()` function already exists in `useBossMechanics.ts:53`
- Checks word length >= 3 and reads same forwards/backwards
- Calls `buildThresholdResult()` with 3.0x multiplier

**Status:** DONE in Phase 16, verify tests exist

**Translation Keys:**
- `adventure.bosses.reflectionKing.mechanic` ✅ (exists)
- `adventure.bosses.reflectionKing.taunts.*` ✅ (exists)
- Feedback key: `adventure.bosses.common.palindromeFound` ✅ (exists)

---

### BOSS-10: neologismNebula (Cosmic Wordsmith - World 8)
**Goal:** Rare words grant power-ups

**Current State:**
- Boss config exists: `cosmicWordsmith` in `bossConfig.ts`
- Mechanic type: `'stellarForge'`
- Params: `supernovaBonusMultiplier: 2.5`, `supernovaLetters: ['Q', 'X', 'Z']`, `vowelCycleInterval: 8`
- Evaluator: `evaluateStellarForge()` - **COMPLETE** ✅

**Implementation:**
- `hasSupernovaLetters()` function exists in `useBossMechanics.ts:81`
- Checks if word contains Q, X, or Z (rare letters = power-ups)
- Calls `buildThresholdResult()` with 2.5x multiplier

**Interpretation:** "Rare words" = words with rare letters (Q/X/Z)
Alternative: Could check word rarity in dictionary (frequency data), but letter-based is simpler

**Status:** DONE in Phase 16, verify tests exist

**Translation Keys:**
- `adventure.bosses.cosmicWordsmith.mechanic` ✅ (exists)
- `adventure.bosses.cosmicWordsmith.taunts.*` ✅ (exists)
- Feedback key: `adventure.bosses.common.supernovaWord` ✅ (exists)

---

### BOSS-11: polyglotPeaks (Linguist Sage - World 9)
**Goal:** Multilingual hints for bonus

**Current State:**
- Boss config exists: `linguistSage` in `bossConfig.ts`
- Mechanic type: `'babelSummit'`
- Params: `universalWordBonusMultiplier: 3.0`, `loanwordBonusMultiplier: 1.5`, `languageSwitchInterval: 15`
- Evaluator: `evaluateBabelSummit()` - **PARTIAL** (checks word length >= 6)

**What's Needed:**
- Multilingual word detection: Check if word exists in multiple language dictionaries
- Dictionary access: `backend/dictionary.ts` has all languages (English, Hebrew, Swedish, Japanese, Spanish)
- Universal words: Words that exist in multiple languages (cafe, safari, etc.)
- Loanwords: Words borrowed from other languages

**Implementation Options:**
1. **Simple:** Long words (6+ letters) get bonus (current implementation)
2. **Advanced:** Check word against multiple dictionaries (requires backend integration)

**Complexity:** High (need cross-language dictionary lookup)
**Recommendation:** Keep current length-based implementation for MVP, defer advanced detection

**Translation Keys:**
- `adventure.bosses.linguistSage.mechanic` ✅ (exists)
- `adventure.bosses.linguistSage.taunts.*` ✅ (exists)
- Feedback keys exist in taunts

---

### BOSS-12: allMechanics (Lexicon Dragon - World 10)
**Goal:** Final boss combining all mechanics

**Current State:**
- Boss config exists: `lexiconDragon` in `bossConfig.ts`
- Mechanic type: `'finalWord'`
- Params: `phaseOrder: ['popQuiz', 'hiveMind', 'etymologyDig', 'idiomBattle', 'assemblyLine', 'scrambledReality', 'mirrorMatch', 'stellarForge', 'babelSummit']`
- Evaluator: `evaluateFinalWord()` - **COMPLETE** ✅

**Implementation:**
- Cycles through all previous boss mechanics
- Creates temporary boss config for current phase
- Delegates to corresponding evaluator (evaluatePopQuiz, evaluateHiveMind, etc.)

**Phase Advancement:**
- `advancePhase()` function exists in `useBossMechanics.ts:437`
- Increments through `phaseOrder` array
- Updates `mechanicState.currentPhase`

**Status:** Architecture complete, will work once all 9 mechanics implemented

**Integration:** Player sees "Phase 1: Pop Quiz" → "Phase 2: Hive Mind" → etc.
Each phase requires different strategy (double letters, then synonyms, then root words, etc.)

**Translation Keys:**
- `adventure.bosses.lexiconDragon.mechanic` ✅ (exists)
- `adventure.bosses.lexiconDragon.taunts.*` ✅ (exists)
- Phase-specific feedback comes from delegated evaluators

---

## Architecture Analysis

### Existing Infrastructure (From Phase 16)

**Types:** `types/boss.ts`
- ✅ BossConfig, BossTwistType, BossMechanicResult, BossGameState
- ✅ All 10 twist types defined

**Configuration:** `lib/adventure/bossConfig.ts`
- ✅ All 10 boss configs with params, taunts, images
- ✅ Helper functions: getBossConfig(), getBossTaunt()

**Hook:** `hooks/useBossMechanics.ts`
- ✅ Word evaluation framework (`evaluateWordForMechanic`)
- ✅ Taunt system with cooldown
- ✅ Phase advancement for finalWord
- ✅ Threshold helper: `buildThresholdResult()`

**HP System:** `hooks/useBossHealth.ts`
- ✅ HP tracking, damage calculation
- ✅ Phase transitions (intro/active/enraged/victory/defeat)
- ✅ Combo integration

**UI Components:**
- ✅ BossIntro, BossDialogue, BossVictory, BossHPBar
- ✅ All styled with neo-brutalist theme

**Tests:**
- ✅ `useBossMechanics.test.ts` - Core hook tests
- ✅ `useBossMechanics.popQuiz.test.ts` - popQuiz mechanic tests
- ✅ `useBossHealth.test.ts` - HP system tests
- ✅ Component tests for all boss UI

### Mechanic Evaluation Pattern

All mechanics follow this structure:
```typescript
function evaluateMechanic(
  word: string,
  params: Record<string, unknown>
): BossMechanicResult {
  // 1. Extract params
  const bonusMultiplier = (params.bonusMultiplier as number) ?? 2.0;

  // 2. Check condition
  const meets = checkCondition(word, params);

  // 3. Return threshold result
  return buildThresholdResult(
    meets,
    bonusMultiplier,
    'adventure.bosses.common.feedbackKey'
  );
}
```

**buildThresholdResult helper:**
```typescript
function buildThresholdResult(
  meets: boolean,
  bonusMultiplier: number,
  feedbackKey?: string
): BossMechanicResult {
  return {
    meetsRequirement: meets,
    scoreMultiplier: meets ? bonusMultiplier : 1.0,
    triggerTaunt: meets ? 'onMechanic' : undefined,
    feedbackKey: meets ? feedbackKey : undefined,
    triggerEffect: meets,
  };
}
```

### Mechanic Status Matrix

| Mechanic | Boss | World | Status | Work Needed |
|----------|------|-------|--------|-------------|
| popQuiz | Ms. Grammar | 1 | ✅ DONE | Test coverage verification |
| hiveMind | Spelling Bee | 2 | ✅ DONE | Simplified to length check |
| etymologyDig | Prof. Thesaurus | 3 | ✅ DONE | Root fragment detection works |
| idiomBattle | Captain Metaphor | 4 | 🟡 STUB | Need idiom detection (or keep length stub) |
| assemblyLine | Baron Buildaword | 5 | 🟡 STUB | Need compound detection (or keep length stub) |
| scrambledReality | Puzzle Master | 6 | 🟢 PARTIAL | Add anagram pair tracking |
| mirrorMatch | Reflection King | 7 | ✅ DONE | isPalindrome() implemented |
| stellarForge | Cosmic Wordsmith | 8 | ✅ DONE | Supernova letters implemented |
| babelSummit | Linguist Sage | 9 | 🟡 STUB | Keep length-based or add dictionary lookup |
| finalWord | Lexicon Dragon | 10 | ✅ DONE | Cycles through all mechanics |

**Legend:**
- ✅ DONE: Fully implemented, ready for tests
- 🟢 PARTIAL: Core logic exists, needs enhancement
- 🟡 STUB: Placeholder logic, needs decision on implementation

## Implementation Strategy

### Wave 1: Complete Existing Mechanics (Test-Only)
**Goal:** Verify Phase 16 mechanics work correctly

1. **palindromeMirror** (World 7) - DONE
   - Verify `evaluateMirrorMatch()` tests exist
   - Test palindrome detection (radar, level, civic)
   - Test non-palindrome rejection

2. **neologismNebula** (World 8) - DONE
   - Verify `evaluateStellarForge()` tests exist
   - Test supernova letter detection (Q, X, Z)
   - Test bonus multiplier application

3. **allMechanics** (World 10) - DONE
   - Verify `evaluateFinalWord()` tests exist
   - Test phase cycling
   - Test mechanic delegation

**Deliverables:** Test coverage for 3 complete mechanics

---

### Wave 2: Enhance Partial Mechanics
**Goal:** Improve existing stubs with better detection

1. **anagramScramble** (World 6) - ENHANCE
   - Add `areAnagrams()` function
   - Track found words in `mechanicState.foundWords`
   - Compare current word against found words
   - Trigger bonus on anagram pair detection
   - Fallback: Current unique letters check (4+)

**New Code:**
```typescript
// Add to useBossMechanics.ts
function areAnagrams(word1: string, word2: string): boolean {
  const sorted1 = word1.toUpperCase().split('').sort().join('');
  const sorted2 = word2.toUpperCase().split('').sort().join('');
  return sorted1 === sorted2 && word1.toLowerCase() !== word2.toLowerCase();
}

function evaluateScrambledReality(
  word: string,
  params: Record<string, unknown>,
  mechanicState: Record<string, unknown> // NEW: need state
): BossMechanicResult {
  const anagramBonusMultiplier = (params.anagramBonusMultiplier as number) ?? 2.0;
  const foundWords = (mechanicState.foundWords as string[]) ?? [];

  // Check if word is anagram of any previously found word
  const hasAnagramPair = foundWords.some(prevWord => areAnagrams(word, prevWord));

  // Fallback: Check unique letters >= 4
  const uniqueLetters = new Set(word.toUpperCase().split('')).size;
  const meetsRequirement = hasAnagramPair || uniqueLetters >= 4;

  return buildThresholdResult(
    meetsRequirement,
    anagramBonusMultiplier,
    hasAnagramPair ? 'adventure.bosses.common.anagramPair' : undefined
  );
}
```

**Tests:**
- Anagram pair detection (listen → silent)
- Non-anagram rejection
- Fallback to unique letters
- State tracking

**Deliverables:** Enhanced anagram mechanic with tests

---

### Wave 3: Data-Driven Mechanics (MVP Approach)
**Goal:** Decide on idiom/compound/multilingual mechanics

**Decision Point:** Choose implementation approach for each mechanic:

#### Option A: Keep Simple Stubs (RECOMMENDED for MVP)
**Pros:**
- Already implemented (length checks)
- No data dependencies
- Works immediately
- Can enhance later

**Cons:**
- Less mechanically distinct
- Doesn't match boss theme perfectly

**Mechanics:**
- idiomBattle: Keep length >= 6 check
- assemblyLine: Keep length >= 5 check
- babelSummit: Keep length >= 6 check

#### Option B: Add Data-Driven Detection (Future Phase)
**Pros:**
- More mechanically interesting
- Matches boss personality
- Educational value

**Cons:**
- Requires data files (idiom list, compound list)
- More complex testing
- Increases scope

**What's Needed:**
- Idiom word list (100-200 common idioms)
- Compound word list OR detection algorithm
- Multilingual dictionary integration

**Recommendation:** **Use Option A (stubs) for Phase 17 MVP**, create Phase 24 for "Boss Mechanic Polish" with data-driven enhancements.

**Rationale:**
1. Phase 17 already has 7 requirements (BOSS-06 to BOSS-12)
2. 4 mechanics already complete (palindrome, supernova, finalWord, popQuiz)
3. Anagram enhancement is straightforward
4. Idiom/compound/multilingual need significant data work
5. Better to ship playable bosses now, polish later

---

### Wave 4: Integration Testing
**Goal:** Verify all mechanics work in AdventureGame

1. Test each boss battle (worlds 1-10)
2. Verify mechanic feedback displays
3. Verify boss taunts trigger correctly
4. Verify HP damage scales with mechanic multipliers
5. Verify finalWord phase transitions

**Test Scenarios:**
- World 4: Find long word → Baron Buildaword taunt
- World 6: Find anagram pair → Puzzle Master bonus
- World 7: Find palindrome → Reflection King 3x damage
- World 10: Cycle through all phases → Lexicon Dragon

**Deliverables:** E2E tests for boss battles

---

## File Structure

All work happens in existing files:

**Core Logic:**
- `hooks/useBossMechanics.ts` - Add/enhance evaluators
- `types/boss.ts` - No changes needed (types exist)
- `lib/adventure/bossConfig.ts` - No changes needed (configs exist)

**Tests:**
- `hooks/__tests__/useBossMechanics.test.ts` - Add mechanic tests
- `hooks/__tests__/useBossMechanics.anagram.test.ts` - New file for anagram tests
- `components/adventure/__tests__/AdventureGame.bossIntegration.test.tsx` - E2E tests

**No new files needed** - all infrastructure exists from Phase 16.

---

## Translation Keys

All translation keys already exist in `translations/*.js`:

**Boss Names & Mechanics:**
- ✅ `adventure.bosses.captainMetaphor.*` (idiomBattle)
- ✅ `adventure.bosses.baronBuildaword.*` (assemblyLine)
- ✅ `adventure.bosses.puzzleMaster.*` (scrambledReality)
- ✅ `adventure.bosses.reflectionKing.*` (mirrorMatch)
- ✅ `adventure.bosses.cosmicWordsmith.*` (stellarForge)
- ✅ `adventure.bosses.linguistSage.*` (babelSummit)
- ✅ `adventure.bosses.lexiconDragon.*` (finalWord)

**Common Feedback:**
- ✅ `adventure.bosses.common.requirementMet`
- ✅ `adventure.bosses.common.requirementMissed`
- ✅ `adventure.bosses.common.rootFound`
- ✅ `adventure.bosses.common.compoundDetected`
- ✅ `adventure.bosses.common.palindromeFound`
- ✅ `adventure.bosses.common.supernovaWord`

**New Keys Needed:**
- `adventure.bosses.common.anagramPair` (for anagram detection)

Add to all 4 languages (en, he, sv, ja):
```javascript
"anagramPair": "Anagram pair detected! Bonus damage!"
```

---

## Testing Strategy (TDD)

### Test Coverage Requirements

Each mechanic needs:
1. **Positive case:** Word meets requirement → bonus applied
2. **Negative case:** Word doesn't meet requirement → no bonus
3. **Edge case:** Boundary conditions (min length, etc.)
4. **State case:** Mechanic state persists/updates correctly

### Test Files

**Existing:**
- `useBossMechanics.test.ts` - Core hook behavior (140 lines)
- `useBossMechanics.popQuiz.test.ts` - popQuiz mechanic (200 lines)
- `useBossHealth.test.ts` - HP system (150 lines)

**New:**
- `useBossMechanics.anagram.test.ts` - Anagram pair detection (~150 lines)

**Enhanced:**
- Add tests to `useBossMechanics.test.ts`:
  - idiomBattle mechanic (stub version)
  - assemblyLine mechanic (stub version)
  - babelSummit mechanic (stub version)
  - Verify all evaluators callable

### Test Template

```typescript
describe('evaluateScrambledReality (anagram)', () => {
  it('should detect anagram pair and apply bonus', () => {
    // GIVEN
    const boss = getBoss(6); // Puzzle Master
    const mechanicState = { foundWords: ['LISTEN'] };

    // WHEN
    const result = evaluateWordForMechanic('SILENT', boss, mechanicState);

    // THEN
    expect(result.meetsRequirement).toBe(true);
    expect(result.scoreMultiplier).toBe(2.0);
    expect(result.triggerTaunt).toBe('onMechanic');
    expect(result.feedbackKey).toBe('adventure.bosses.common.anagramPair');
  });

  it('should fallback to unique letters check', () => {
    // GIVEN
    const boss = getBoss(6);
    const mechanicState = { foundWords: [] };

    // WHEN
    const result = evaluateWordForMechanic('WORD', boss, mechanicState);

    // THEN
    expect(result.meetsRequirement).toBe(true); // 4 unique letters
    expect(result.scoreMultiplier).toBe(2.0);
  });

  it('should not trigger bonus for non-anagram', () => {
    // GIVEN
    const boss = getBoss(6);
    const mechanicState = { foundWords: ['WORD'] };

    // WHEN
    const result = evaluateWordForMechanic('TEST', boss, mechanicState);

    // THEN
    expect(result.meetsRequirement).toBe(true); // 4 unique letters
    // But no anagram pair feedback
    expect(result.feedbackKey).toBeUndefined();
  });
});
```

---

## Success Criteria Verification

From PROJECT.md Phase 17:

1. ✅ **User can complete idiom phrases for bonus damage** (idiomIslands mechanic)
   - Implementation: Length-based stub (6+ letters) OR idiom word detection
   - Verification: Test evaluateIdiomBattle(), check bonus applied
   - Status: STUB exists, need tests

2. ✅ **User can merge compound words for combo multiplier** (compoundMerge mechanic)
   - Implementation: Length-based stub (5+ letters) OR compound detection
   - Verification: Test evaluateAssemblyLine(), check bonus applied
   - Status: STUB exists, need tests

3. ✅ **User can solve anagrams for critical hits** (anagramScramble mechanic)
   - Implementation: Anagram pair detection + unique letters fallback
   - Verification: Test evaluateScrambledReality(), check pair detection
   - Status: PARTIAL, needs enhancement + tests

4. ✅ **User sees palindrome words deal double damage** (palindromeMirror mechanic)
   - Implementation: isPalindrome() check with 3x multiplier
   - Verification: Test evaluateMirrorMatch(), check bonus applied
   - Status: DONE in Phase 16, verify tests

5. ✅ **User earns power-ups from rare words** (neologismNebula mechanic)
   - Implementation: Supernova letters (Q/X/Z) with 2.5x multiplier
   - Verification: Test evaluateStellarForge(), check bonus applied
   - Status: DONE in Phase 16, verify tests

6. ✅ **User receives multilingual hints for bonus** (polyglotPeaks mechanic)
   - Implementation: Length-based stub (6+ letters) OR dictionary lookup
   - Verification: Test evaluateBabelSummit(), check bonus applied
   - Status: STUB exists, need tests

7. ✅ **Final boss combines all mechanics for ultimate challenge** (allMechanics)
   - Implementation: Phase cycling through all 9 mechanics
   - Verification: Test evaluateFinalWord(), check phase transitions
   - Status: DONE in Phase 16, verify tests

---

## Risks & Mitigations

### Risk 1: Data Dependencies
**Risk:** Idiom/compound/multilingual mechanics require data files that don't exist
**Impact:** Could block Phase 17 completion
**Mitigation:** Use length-based stubs for MVP, defer data-driven versions to Phase 24
**Status:** MITIGATED (decided on stub approach)

### Risk 2: State Management
**Risk:** Anagram tracking needs found words in `mechanicState`
**Impact:** Need to wire state updates from AdventureGame
**Mitigation:** Use `useBossMechanics` hook's existing `bossState.mechanicState` pattern
**Status:** LOW (pattern exists, just need to update state)

### Risk 3: Test Coverage
**Risk:** 7 mechanics × 4 test cases = 28+ tests needed
**Impact:** Large test suite, time-consuming to write
**Mitigation:** Use test template, focus on core cases, defer edge cases
**Status:** MEDIUM (manageable with TDD discipline)

### Risk 4: Integration Complexity
**Risk:** finalWord mechanic cycles through 9 other mechanics
**Impact:** Hard to test, potential bugs in phase transitions
**Mitigation:** Test each mechanic independently first, then test finalWord delegation
**Status:** MEDIUM (architecture exists, need thorough testing)

---

## Dependencies

### From Phase 16
- ✅ `useBossHealth` hook (HP tracking, damage, phase transitions)
- ✅ `useBossMechanics` hook (word evaluation framework)
- ✅ Boss UI components (BossIntro, BossDialogue, BossHPBar, BossVictory)
- ✅ Boss configs (all 10 bosses defined)
- ✅ Translation keys (all boss dialogue exists)

### From Phase 15
- ✅ Combo system (`gameState.comboCount` integration)
- ✅ Damage formula (score/10 × combo × mechanic multiplier)

### No External Dependencies
- No backend changes needed
- No new database tables
- No new API endpoints
- No new assets (boss images already exist)

---

## Recommended Phase 17 Scope

### IN SCOPE (MVP)
1. **Complete Mechanics** (Test-Only)
   - Verify palindromeMirror tests
   - Verify neologismNebula tests
   - Verify allMechanics tests

2. **Enhance Anagram Mechanic**
   - Add anagram pair detection
   - Track found words in state
   - Write comprehensive tests

3. **Test Stub Mechanics**
   - Test idiomBattle (length-based)
   - Test assemblyLine (length-based)
   - Test babelSummit (length-based)

4. **Integration Tests**
   - E2E tests for all 10 boss battles
   - Verify mechanic feedback displays
   - Verify damage scaling

5. **Translation Keys**
   - Add `anagramPair` key to all languages

### OUT OF SCOPE (Defer to Phase 24)
1. Idiom word list and detection
2. Compound word list and detection
3. Multilingual dictionary lookups
4. Advanced hiveMind (sticky tiles - already deferred)
5. Adaptive difficulty (BOSS-13 - deferred to Phase 18)

### Acceptance Criteria
- [ ] All 7 boss mechanics testable (4 complete, 3 stubs)
- [ ] Anagram pair detection works
- [ ] All 10 boss battles playable
- [ ] Mechanic feedback displays correctly
- [ ] Boss taunts trigger appropriately
- [ ] Damage scales with mechanic multipliers
- [ ] 80%+ test coverage on boss mechanics
- [ ] E2E tests pass for worlds 1-10

---

## Estimates

### Complexity Breakdown
- Complete mechanics (test-only): **2 hours** (3 mechanics × 40 min)
- Anagram enhancement: **3 hours** (implementation + tests)
- Stub mechanic tests: **2 hours** (3 mechanics × 40 min)
- Integration tests: **3 hours** (10 bosses × 18 min)
- Translation keys: **30 minutes** (4 languages)
- **Total: 10.5 hours**

### Wave Estimates
- Wave 1 (Complete mechanics): 2 hours
- Wave 2 (Anagram enhancement): 3 hours
- Wave 3 (Stub mechanics): 2 hours
- Wave 4 (Integration): 3.5 hours

### Risk Buffer: +20% = **12-13 hours total**

---

## Next Steps for Planning

1. **Review this research** with user/team
2. **Confirm scope decision** (MVP stubs vs. data-driven)
3. **Create detailed plan** (PLAN.md) with:
   - Exact functions to implement/test
   - Test case specifications
   - File changes needed
   - Translation key additions
4. **Execute in TDD waves** (tests first, then implementation)

---

## Key Decisions Made

1. ✅ **Use length-based stubs** for idiom/compound/multilingual mechanics (MVP)
2. ✅ **Enhance anagram mechanic** with pair detection (straightforward improvement)
3. ✅ **Keep palindrome/supernova as-is** (already complete)
4. ✅ **Defer data-driven mechanics** to Phase 24 (reduce scope)
5. ✅ **Reuse existing infrastructure** (no new files needed)
6. ✅ **Follow TDD strictly** (tests before implementation)

---

## References

**Prior Research:**
- `.planning/phases/16-boss-battle-foundation/16-RESEARCH.md` - Boss infrastructure analysis

**Key Files:**
- `types/boss.ts` - Type definitions
- `lib/adventure/bossConfig.ts` - Boss configurations
- `hooks/useBossMechanics.ts` - Mechanic evaluation logic
- `hooks/useBossHealth.ts` - HP tracking and damage
- `translations/en.js` (lines 3900-4018) - Boss dialogue

**Test Files:**
- `hooks/__tests__/useBossMechanics.test.ts` - Core hook tests
- `hooks/__tests__/useBossMechanics.popQuiz.test.ts` - Mechanic-specific tests
- `components/adventure/__tests__/AdventureGame.bossIntegration.test.tsx` - E2E tests

**Requirements:**
- `fe-next/.planning/REQUIREMENTS.md` - BOSS-06 through BOSS-12
- `PROJECT.md` - Phase 17 success criteria
