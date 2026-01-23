# Phase 8: Wikipedia Integration - Research

**Phase Goal:** Wikipedia word extraction pipeline reliably syncs curated words to game dictionary

**Research Date:** 2026-01-23
**Researcher:** GSD Phase Researcher Agent

---

## Executive Summary

### What We're Fixing

This phase addresses **two critical bugs** in the Wikipedia word extraction and sync pipeline:

1. **FIX-01**: Wikipedia word extraction pipeline working
2. **FIX-02**: Words sync from admin dashboard to game dictionary

### Current State

**✅ GOOD NEWS:** The infrastructure is **90% complete**:
- Wikipedia API integration exists and works locally (verified with all 5 languages)
- Admin dashboard UI exists at `/admin/wikipedia-words`
- Database tables (`wikipedia_word_candidates`, `community_words`, `word_scores`) are in place
- Word validation system (AI + community) is functional
- JSON fallback files exist with 2000+ curated words per language

**❌ THE PROBLEMS:**
1. **Date range mismatch**: Admin syncs words with today's date, but UI filters may exclude them
2. **Missing bridge**: Words extracted from Wikipedia stay in `wikipedia_word_candidates` table but never automatically move to the game dictionary (`community_words` or `word_scores`)
3. **Manual intervention required**: Admin must manually approve/sync words for them to appear in gameplay

### Key Finding

**The pipeline is NOT end-to-end automated.** It's a **3-stage manual workflow**:

```
Stage 1: Extract               Stage 2: Store            Stage 3: Validate & Use
Wikipedia → Candidates Table    Admin Reviews → Approve   Game Uses → community_words
   (WORKS)                      (MANUAL STEP)            (WORKS but needs Stage 2)
```

**What's missing:** Automatic promotion from `wikipedia_word_candidates` → `community_words` after validation.

---

## Architecture Overview

### Data Flow (Current vs. Desired)

#### Current Flow (Broken)

```
1. Wikipedia API
   ↓ (fetchFeaturedContent)
2. wikipediaWordFetcher.ts extracts words
   ↓ (storeWikipediaWordCandidates)
3. wikipedia_word_candidates table
   ↓ (MANUAL: Admin clicks approve in dashboard)
4. ??? (NO AUTOMATED BRIDGE)
   ↓
5. Game still uses static dictionary
```

#### Desired Flow (Fixed)

```
1. Wikipedia API
   ↓
2. Extract + validate words
   ↓
3. Store in wikipedia_word_candidates
   ↓
4. AI validates top candidates (validateWordWithAI)
   ↓
5. Auto-promote validated words → community_words
   ↓
6. Game uses words during validation (isDictionaryWord checks community_words)
```

### Database Schema

**Tables Involved:**

1. **`wikipedia_word_candidates`** (Staging table)
   - Columns: `id`, `language`, `fetch_date`, `word`, `source_article_title`, `source_article_url`, `interestingness_score`, `validation_status`, `created_at`
   - Purpose: Stores extracted words awaiting validation
   - Constraint: Unique on `(language, word, fetch_date)`

2. **`community_words`** (Dictionary table)
   - Purpose: AI-validated words used in gameplay
   - Used by: `checkCommunityWords()` in game validation
   - This is where words MUST be for gameplay!

3. **`word_scores`** (Crowd-validated table)
   - Purpose: Community-voted words (6+ net votes = valid)
   - Used by: `checkWordScores()` in game validation

4. **`daily_target_words`** (Daily challenge table)
   - Columns include: `target_word`, `word_source` ('static', 'wikipedia', 'ai', 'admin'), `source_article_url`
   - Purpose: Scheduled daily challenge words

### Key Files & Responsibilities

#### Backend Services (Where the work happens)

1. **`backend/services/wikipediaWordFetcher.ts`**
   - Fetches from Wikipedia REST API
   - Extracts words from titles, extracts, descriptions
   - Validates format (length, character set)
   - Filters stopwords
   - **Stores in `wikipedia_word_candidates`** ✅
   - Current timeout: 30s per request with 2 retries

2. **`backend/services/wikipediaWordPopulator.ts`**
   - Orchestrates fetch → validate → store flow
   - Strategy: Production (JSON first) vs Dev (Wikipedia first)
   - Fallback hierarchy: Wikipedia API → Local JSON → Static lists
   - Validates top 10 candidates with AI
   - **Missing:** Auto-promotion to `community_words`

3. **`utils/dailyChallenge/wikipediaWordProcessor.ts`**
   - Ranks words by "interestingness score" (0-100)
   - Scoring factors: source bonus (tfa=20, mostread=10), character variety, length, overused penalty
   - `validateWordWithAI()`: Calls gameAIService to validate + save
   - `getRecentlyUsedWords()`: Prevents repetition within 30 days

4. **`backend/modules/ai/gameAIService.ts`**
   - `validateAndSaveWord()`: Validates word AND saves to `community_words` if valid ✅
   - This is the key: If we call this, words auto-promote!
   - Checks cache → community_words → word_scores → AI → save

#### Admin Dashboard (UI)

1. **`app/[locale]/admin/wikipedia-words/page.tsx`**
   - Admin UI at `/admin/wikipedia-words`
   - Shows word candidates with filters (language, status, date range)

2. **`components/admin/wikipedia-words/WikipediaWordsPanel.tsx`**
   - Main panel component
   - Actions: Sync from JSON, Populate from Wikipedia, Add custom word

3. **`app/api/admin/wikipedia-words/route.ts`**
   - POST actions:
     - `'populate'`: Trigger Wikipedia fetch (calls `triggerWikipediaWordPopulation`)
     - `'sync-json'`: Load pre-validated words from local JSON (calls `syncLocalJSONToDatabase`)
     - `'add'`: Manually add word (calls `adminAddWordCandidate`)
   - GET: Fetch candidates for display
   - Max duration: 90 seconds

#### Data Files

- **`data/wikipedia-words/{language}.json`** (5 languages)
  - Pre-validated Wikipedia words as fallback
  - Format: `{ language, lastUpdated, words: [{ word, source, url, score }] }`
  - Sizes: en (371KB), es (207KB), he (243KB), ja (391KB), sv (255KB)
  - Purpose: Reliable fallback when API fails or in production

---

## Known Issues (From Prior RCAs)

### Issue 1: Date Range Mismatch (Identified)

**Source:** `.claude/agents/reviews/rca-admin-dashboard-wikipedia-sync.md`

**Problem:**
- Sync operation stores words with `fetch_date = today`
- Admin UI filters by date range (default: last 30 days)
- If UI filter doesn't include today, synced words won't appear

**Current Fix Status:**
Partially fixed in `WikipediaWordsPanel.tsx:60-81`:
```typescript
const handleSyncFromJSON = useCallback(async (): Promise<SyncResult> => {
  const result = await syncFromJSON();
  if (result.success && result.syncDate) {
    // Update date range to include today so synced words are visible
    const today = result.syncDate;
    setDateRange(prev => {
      if (prev.end < today) {
        return { ...prev, end: today };
      }
      return prev;
    });
  }
  return result;
}, [syncFromJSON]);
```

**Verdict:** ✅ This is already fixed in the codebase!

### Issue 2: Upsert Behavior

**Problem:**
- Original code used `ignoreDuplicates: true` which prevented updates
- Words couldn't be re-synced with updated scores

**Current Status:**
Fixed in `wikipediaWordFetcher.ts:635-642`:
```typescript
const { error } = await supabase
  .from('wikipedia_word_candidates')
  .upsert(batch, {
    onConflict: 'language,word,fetch_date',
    ignoreDuplicates: false  // ✅ Allows updates
  });
```

**Verdict:** ✅ This is already fixed!

### Issue 3: Missing Bridge to Dictionary (THE CORE BUG)

**Problem:**
Words validated in `wikipedia_word_candidates` never auto-promote to `community_words`.

**Evidence:**
1. `populateWikipediaWords()` calls `validateWordWithAI()` on top 10 candidates
2. BUT `validateWordWithAI()` in `wikipediaWordProcessor.ts` calls `gameAIService.validateAndSaveWord()`
3. `validateAndSaveWord()` DOES save to `community_words` if valid!
4. **However**: Only top 10 are validated, rest stay in staging table

**Root Cause:**
The code validates only a small subset (top 10) of candidates. The rest (potentially hundreds) remain in `wikipedia_word_candidates` with `validation_status='pending'` and are never used.

**Missing Feature:**
- Admin bulk approve action (select all valid candidates → promote to dictionary)
- Automatic promotion of high-scoring candidates (score > 75)
- Scheduled batch validation job

---

## Testing Infrastructure

### Existing Tests

**Unit Tests:**
- `backend/services/__tests__/wikipediaWordFetcher.test.ts` - API fetching
- `utils/dailyChallenge/__tests__/wikipediaWordProcessor.test.ts` - Word validation/ranking
- `components/admin/wikipedia-words/__tests__/syncFromJSON.test.ts` - JSON sync
- `components/admin/wikipedia-words/__tests__/adminDashboard.integration.test.tsx` - UI integration

**Integration Tests:**
- `backend/services/__tests__/wikipediaWordSync.batch.test.ts` - Batch processing
- `backend/services/__tests__/wikipediaWordSyncParallel.test.ts` - Parallel sync (7 languages)
- `backend/services/__tests__/wikipediaTimeout.integration.test.ts` - Timeout handling

**Manual Test Scripts:**
- `scripts/test-wikipedia-flow.ts` - Test Wikipedia API fetch
  - Command: `npm run test:wikipedia <language>`
  - Verifies: Fetch → Extract → Rank → Display top 10
- `scripts/verify-production-wikipedia.ts` - Production environment checks
  - Command: `npm run test:wikipedia:production`
  - Verifies: DNS, HTTPS, TLS, Redis, Env vars, Full flow

### Testing Gaps

**Missing tests for:**
1. ❌ End-to-end: Wikipedia → candidates → validation → community_words → gameplay
2. ❌ Admin action: Bulk approve selected candidates
3. ❌ Automatic promotion based on score threshold
4. ❌ Word appears in game validation after sync

---

## Technical Constraints

### Performance

**Timeouts:**
- Wikipedia API: 30s per request (with 2 retries = max 62s)
- Admin API routes: 90s max (Next.js serverless function limit)
- Parallel sync: All 7 languages in ~15-30s (vs 90s+ sequential)

**Rate Limits:**
- Wikipedia API: 200 req/s (we use 50ms between requests)
- Batch size: 500 records per Supabase insert (prevents timeout)

**Caching:**
- Redis: 24h cache for Wikipedia API responses
- In-memory: LRU cache for word validations

### Database

**Row limits:**
- `wikipedia_word_candidates`: Can grow large (2000+ words per language per day)
- Need cleanup strategy for old candidates (>30 days?)

**Uniqueness constraint:**
- `(language, word, fetch_date)` must be unique
- Same word can appear multiple times with different dates

### External Dependencies

**Wikipedia API:**
- Works locally (verified with all languages)
- May fail in production due to firewall/DNS/SSL issues
- Fallback: Local JSON files (reliable, but static)

**AI Validation:**
- Requires Google Cloud Vertex AI credentials
- Optional: Can skip AI validation and use format validation only
- Cost: ~$0.0002 per word validation

---

## Success Criteria (Requirements)

### FIX-01: Wikipedia word extraction pipeline working

**Acceptance Criteria:**
1. ✅ Admin can trigger Wikipedia fetch via dashboard
2. ✅ Words are extracted from Wikipedia API
3. ✅ Words are stored in `wikipedia_word_candidates` table
4. ✅ Words are ranked by interestingness
5. ❌ **Words automatically promote to dictionary after validation** ← NEEDS FIX
6. ✅ Fallback to local JSON works when API fails

**Current Status:** 5/6 criteria met (83%)

### FIX-02: Words sync from admin dashboard to game dictionary

**Acceptance Criteria:**
1. ✅ Admin can view word candidates in dashboard
2. ✅ Admin can filter by language, status, date
3. ❌ **Admin can bulk approve candidates** ← NEEDS IMPLEMENTATION
4. ❌ **Approved words appear in game validation immediately** ← NEEDS TESTING
5. ✅ Admin sees confirmation when words successfully added
6. ❌ **System handles edge cases** (duplicates work, but need validation error handling)

**Current Status:** 3/6 criteria met (50%)

---

## Solution Options

### Option 1: Auto-Promote High-Scoring Candidates (Recommended)

**Approach:**
After AI validation in `populateWikipediaWords()`, automatically promote valid words with score ≥ 75 to `community_words`.

**Implementation:**
```typescript
// In wikipediaWordPopulator.ts, after validateTopCandidates()
for (const candidate of validatedCandidates) {
  if (candidate.score >= 75) {
    // Auto-promote to community_words
    await gameAIService.validateAndSaveWord(candidate.word, language);
  }
}
```

**Pros:**
- ✅ Minimal code change
- ✅ Reuses existing `validateAndSaveWord()` logic
- ✅ Words immediately available for gameplay
- ✅ No admin intervention needed for high-quality words

**Cons:**
- ⚠️ Could pollute dictionary with false positives (mitigated by high threshold)
- ⚠️ No admin review for auto-promoted words

**Effort:** Low (2-3 hours)

### Option 2: Admin Bulk Approve UI

**Approach:**
Add "Approve Selected" button in admin dashboard to manually promote candidates to dictionary.

**Implementation:**
1. Add checkbox selection to candidate list
2. Add bulk action button
3. API endpoint: `POST /api/admin/wikipedia-words/bulk-approve`
4. Backend calls `validateAndSaveWord()` for each selected word

**Pros:**
- ✅ Admin control and review
- ✅ Prevents accidental dictionary pollution
- ✅ Clear audit trail

**Cons:**
- ⚠️ Requires admin intervention (not automated)
- ⚠️ More code to write (UI + backend)

**Effort:** Medium (4-6 hours)

### Option 3: Scheduled Batch Validation Job

**Approach:**
Run a daily cron job that validates all pending candidates and auto-promotes valid ones.

**Implementation:**
```typescript
// In cronScheduler.ts
export function startWikipediaValidationCron() {
  cron.schedule('0 1 * * *', async () => {
    // Run 1 hour after daily buzz generation
    await validatePendingCandidates();
  });
}

async function validatePendingCandidates() {
  // Fetch all pending candidates
  // Validate with AI
  // Promote valid ones to community_words
}
```

**Pros:**
- ✅ Fully automated
- ✅ Processes all candidates, not just top 10
- ✅ Runs during low-traffic hours

**Cons:**
- ⚠️ Higher AI validation costs (hundreds of words per day)
- ⚠️ Delayed availability (words only available after cron runs)
- ⚠️ Complex error handling

**Effort:** High (8-10 hours)

### Recommended Approach: Hybrid (Option 1 + Option 2)

**Phase 8.1:** Implement auto-promotion for high-scoring candidates (Option 1)
- Immediate benefit for top-quality words
- Low risk, low effort
- Ensures pipeline is end-to-end functional

**Phase 8.2:** Add admin bulk approve UI (Option 2)
- Allows manual promotion of remaining candidates
- Admin can review and approve borderline cases
- Provides safety net and control

**Total Effort:** Medium (6-9 hours)

---

## Edge Cases & Error Handling

### Edge Case 1: Duplicate Words Across Dates

**Scenario:**
Word "AURORA" extracted on 2026-01-20 and again on 2026-01-23.

**Current Behavior:**
- Two separate rows in `wikipedia_word_candidates` (different `fetch_date`)
- Both could be promoted to `community_words`
- `community_words` has unique constraint on `(word, language)` → second insert fails

**Required Handling:**
```typescript
// Check if word already exists before promoting
const exists = await gameAIService.checkDatabaseOnly(word, language);
if (exists.source === 'database' && exists.isValid) {
  console.log(`Word ${word} already in dictionary, skipping`);
  continue;
}
```

### Edge Case 2: Invalid Word Format

**Scenario:**
Wikipedia returns "New York" (multi-word) or "COVID-19" (with hyphen/numbers).

**Current Handling:** ✅ Already filtered in `validateGameWord()`
- Checks for spaces, hyphens, apostrophes
- Checks for numbers
- Checks character set (language-specific regex)

### Edge Case 3: AI Validation Timeout

**Scenario:**
AI service takes too long or is unavailable during batch validation.

**Current Handling:** ⚠️ Partial
- Individual validation errors are caught and logged
- But batch operation continues with next word
- **Missing:** Retry logic, fallback to format-only validation

**Required Improvement:**
```typescript
try {
  const result = await validateWordWithAI(word, language);
} catch (error) {
  // Fallback: Format validation only
  const formatValid = validateGameWord(word, language);
  if (formatValid.valid && score >= 80) {
    // High-scoring words pass format check = promote anyway
    await promoteToDict(word, language);
  }
}
```

### Edge Case 4: Language-Specific Issues

**Hebrew:**
- Final letters (ם, ך, ן, ף, ץ) must be normalized
- Already handled in `normalizeHebrewWord()` ✅

**Japanese:**
- Minimum 2 characters (vs 4 for other languages)
- Kanji, Hiragana, Katakana all valid
- Already handled in character validators ✅

**Edge Case 5: Empty Featured Content**

**Scenario:**
Wikipedia has no featured content for a specific language/date.

**Current Handling:** ✅ Already implemented
- Falls back to random articles
- If random articles fail, falls back to local JSON
- If JSON fails, falls back to static word lists

---

## Dependencies & Prerequisites

### Phase 1: Infrastructure (Already Complete ✅)

- Supabase database tables exist
- Wikipedia API integration works
- Admin dashboard UI exists
- AI validation service configured

### External Services

**Required:**
- ✅ Supabase (database)
- ✅ Wikipedia REST API (free, public)

**Optional:**
- ⚠️ Redis (caching) - Can work without it
- ⚠️ Google Cloud Vertex AI (validation) - Can use format validation only

### Environment Variables

**Required:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx... # For writing to DB
```

**Optional:**
```bash
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account",...} # For AI validation
REDIS_URL=redis://localhost:6379 # For caching
```

---

## Implementation Strategy

### Phase 8 Breakdown

**Phase 8.1: Auto-Promotion Pipeline (Priority 1)**
- Goal: Words automatically move from staging → dictionary
- Work: Modify `populateWikipediaWords()` to call `validateAndSaveWord()` for high-scoring candidates
- Testing: Verify words appear in `community_words` after sync
- Effort: 2-3 hours

**Phase 8.2: Admin Bulk Approve UI (Priority 2)**
- Goal: Admin can manually approve remaining candidates
- Work: Add UI selection + bulk approve API endpoint
- Testing: Select candidates → approve → verify in dictionary
- Effort: 4-6 hours

**Phase 8.3: Edge Case Hardening (Priority 3)**
- Goal: Handle duplicates, timeouts, validation errors gracefully
- Work: Add duplicate checks, retry logic, fallback validation
- Testing: Unit tests for each edge case
- Effort: 3-4 hours

**Phase 8.4: End-to-End Integration Test (Priority 4)**
- Goal: Verify full pipeline from Wikipedia → gameplay
- Work: Create integration test that extracts → validates → plays game
- Testing: Automated E2E test
- Effort: 2-3 hours

**Total Effort:** 11-16 hours (~2 days)

### Testing Strategy

**Unit Tests (Add):**
1. Test auto-promotion logic
2. Test duplicate word handling
3. Test validation error fallback
4. Test format-only validation path

**Integration Tests (Add):**
1. Test Wikipedia → candidates → community_words flow
2. Test admin bulk approve → verify in dictionary
3. Test word validation during gameplay

**Manual Tests:**
1. Run `npm run test:wikipedia en` → verify top words promote to dictionary
2. Open admin dashboard → sync from JSON → verify word count increases
3. Play game → submit newly synced word → verify it validates

### Rollout Plan

**Step 1: Deploy to staging**
- Enable auto-promotion with threshold = 80 (conservative)
- Monitor logs for false positives
- Test admin bulk approve

**Step 2: Monitor for 48 hours**
- Check dictionary growth rate
- Verify word quality (sample random words)
- Check for duplicate errors

**Step 3: Adjust threshold**
- Lower to 75 if too few words promote
- Raise to 85 if too many false positives

**Step 4: Deploy to production**
- Enable for all languages
- Document admin workflow
- Add monitoring alerts

---

## Documentation Needed

### For Planning Phase

**PLAN.md should include:**
1. File modification list (5-8 files)
2. Function signatures to modify
3. Test files to create
4. Edge cases to handle
5. Validation checklist

### For Users (Update existing docs)

**WIKIPEDIA_TESTING_GUIDE.md:**
- Add section: "How to Verify Words Reach Dictionary"
- Add troubleshooting: "Words synced but not appearing in game"

**Admin Dashboard Guide (Create):**
- File: `docs/ADMIN_WIKIPEDIA_SYNC.md`
- Sections: How to sync, how to approve, how to verify

---

## Open Questions for Planning Phase

1. **Threshold for auto-promotion:** Should it be 75, 80, or 85?
   - Higher = fewer words but higher quality
   - Lower = more words but potential false positives
   - **Recommendation:** Start with 80, adjust based on monitoring

2. **Validation strategy for non-AI case:**
   - Should format validation be sufficient for high-scoring words?
   - Or require manual admin approval always?
   - **Recommendation:** Format + high score (≥85) = auto-approve

3. **Duplicate handling:** Update existing or skip?
   - Update: Refresh score/metadata
   - Skip: Preserve original
   - **Recommendation:** Skip (less complex, preserves audit trail)

4. **Cleanup strategy:** Delete old candidates after X days?
   - Keeps table size manageable
   - But loses historical data
   - **Recommendation:** Archive to separate table after 90 days

5. **Bulk approve limit:** How many words can admin approve at once?
   - Too many = API timeout
   - Too few = tedious for admin
   - **Recommendation:** 100 words per batch, show progress bar

---

## Key Takeaways for Planning

### What's Working (Don't Break!)

1. ✅ Wikipedia API integration (works locally, has fallbacks)
2. ✅ Word extraction and ranking (well-tested)
3. ✅ Admin dashboard UI (functional, just needs bulk actions)
4. ✅ AI validation service (reliable when configured)
5. ✅ Date range fix (already implemented)

### What Needs Building

1. ❌ Auto-promotion from staging → dictionary (core requirement)
2. ❌ Admin bulk approve UI + API (usability requirement)
3. ❌ Duplicate word handling (edge case)
4. ❌ End-to-end integration test (validation requirement)
5. ❌ Admin documentation (usability requirement)

### Critical Path

```
1. Implement auto-promotion (2-3h) ← BLOCKING
   ↓
2. Test end-to-end flow (1-2h) ← VALIDATION
   ↓
3. Add bulk approve UI (4-6h) ← ENHANCEMENT
   ↓
4. Handle edge cases (3-4h) ← HARDENING
   ↓
5. Create admin docs (1-2h) ← DOCUMENTATION
```

**Total:** 11-17 hours (~2 days of focused work)

### Risk Assessment

**Low Risk:**
- Auto-promotion with high threshold (worst case: a few bad words)
- Admin bulk approve (admin control)
- Duplicate checking (explicit handling)

**Medium Risk:**
- Validation timeout handling (could affect UX)
- Threshold tuning (may need adjustment post-deploy)

**High Risk:**
- None identified (solid infrastructure already exists)

---

## Conclusion

**Phase 8 is feasible and well-scoped.** The infrastructure is 90% complete. We just need to:

1. **Connect the pipes:** Make validated words auto-promote to dictionary
2. **Add admin controls:** Bulk approve for manual review
3. **Harden edge cases:** Handle duplicates and errors gracefully
4. **Validate end-to-end:** Ensure words flow from Wikipedia → gameplay

**Estimated effort:** 2 days (11-17 hours)
**Risk level:** Low
**Complexity:** Medium (mostly integration, not new features)

**Ready to proceed to PLAN phase with confidence.** ✅

---

**Research complete. Next step:** Create `08-PLAN.md` with detailed implementation steps.
