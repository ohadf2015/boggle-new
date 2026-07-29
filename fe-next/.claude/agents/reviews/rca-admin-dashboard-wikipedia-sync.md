# Root Cause Analysis: Admin Dashboard Wikipedia Sync and Actions Not Working

**Date:** 2026-01-21
**Issue:** Wikipedia sync from JSON and other admin dashboard actions not working as expected
**Severity:** Medium
**Status:** In Analysis

## Issue Summary

**Description:**
The user reports that the Wikipedia sync from JSON is not working, along with other admin dashboard actions like word generation and daily challenge management not functioning as expected.

**Expected Behavior:**
1. "Sync from JSON" button should sync pre-validated words from local JSON files to the database
2. Word generation should create new daily challenge words
3. Daily Buzz generation should work properly

**Actual Behavior:**
Actions reportedly not working as expected (specific error messages not yet identified).

**Impact:**
- Affected features: Admin word management, daily challenge scheduling
- Severity: Medium - Admin operations affected but core game functionality still works

## Reproduction

**Can Reproduce:** Pending verification

**Reproduction Steps:**
1. Log in as admin user
2. Navigate to `/admin/wikipedia-words`
3. Click "Sync from JSON" button
4. Observe result/error

**Environment:**
- Mode: LOCAL (likely, based on user context)
- Admin dashboard components involved

## Analysis

### Related Files (Key Components)

**Admin UI Components:**
- `components/admin/wikipedia-words/WikipediaWordsPanel.tsx` - Main panel component
- `components/admin/wikipedia-words/hooks/useWikipediaCandidates.ts` - Hook managing state and API calls
- `components/admin/wikipedia-words/components/WikipediaStatsCard.tsx` - Stats and action buttons

**API Routes:**
- `app/api/admin/wikipedia-words/route.ts` - Handles POST actions (populate, sync-json, add)
- `app/api/cron/generate-daily-buzz/route.ts` - Daily Buzz generation
- `app/api/admin/daily-word/bulk-generate/route.ts` - Bulk word generation

**Backend Services:**
- `backend/services/wikipediaWordPopulator.ts` - Core logic for word population and JSON sync
- `backend/services/wikipediaWordFetcher.ts` - Wikipedia API fetching and DB storage
- `backend/services/cronScheduler.ts` - Cron job triggers

**Database Tables:**
- `wikipedia_word_candidates` - Stores word candidates with columns: id, language, fetch_date, word, source_article_title, source_article_url, interestingness_score, validation_status, created_at

### Code Flow Analysis

#### Wikipedia Sync from JSON Flow:

1. **UI Trigger** (`WikipediaStatsCard.tsx:64-69`):
   ```javascript
   const handleSyncFromJSON = async (): Promise<void> => {
     if (!onSyncFromJSON) return;
     setIsSyncing(true);
     await onSyncFromJSON();
     setIsSyncing(false);
   };
   ```

2. **Hook Handler** (`useWikipediaCandidates.ts:285-338`):
   - Gets session/auth token
   - Calls `POST /api/admin/wikipedia-words` with `action: 'sync-json'`
   - Client timeout: 95 seconds

3. **API Route** (`app/api/admin/wikipedia-words/route.ts:152-166`):
   ```javascript
   case 'sync-json': {
     const result = await syncLocalJSONToDatabase(targetLanguage);
     return NextResponse.json({
       success: result.success,
       results: result.results
     });
   }
   ```

4. **Backend Service** (`wikipediaWordPopulator.ts:526-569`):
   - Loads JSON files from `data/wikipedia-words/{language}.json`
   - Calls `storeWikipediaWordCandidates()` to upsert records
   - Uses batch processing (500 records per batch)

### Potential Root Causes

#### Issue 1: Date Range Mismatch in UI Query

**Location:** `useWikipediaCandidates.ts:53-74`

The hook queries `wikipedia_word_candidates` table with a date range filter:
```javascript
let query = supabase
  .from('wikipedia_word_candidates')
  .select('*')
  .eq('language', language)
  .gte('fetch_date', dateRange.start)
  .lte('fetch_date', dateRange.end)
```

**Problem:** The default date range is set by `getDefaultDateRange()` but the sync operation stores all words with **today's date**. If the UI's date filter doesn't include today, newly synced words won't appear.

**Evidence:** In `syncLocalJSONToDatabase()`:
```javascript
const today = new Date();
const dateStr = today.toISOString().split('T')[0];
// ... words are stored with today's date
```

#### Issue 2: Database Upsert Conflict Resolution

**Location:** `wikipediaWordFetcher.ts:635-640`

```javascript
const { error } = await supabase
  .from('wikipedia_word_candidates')
  .upsert(batch, {
    onConflict: 'language,word,fetch_date',
    ignoreDuplicates: true
  });
```

**Problem:** With `ignoreDuplicates: true`, if a word already exists for that language+word+date combination, the upsert will silently skip it without updating. This means:
- If words were previously synced for today, they won't be updated
- The `interestingness_score` or other fields won't be refreshed

#### Issue 3: Stats Calculation Only Shows Filtered Results

**Location:** `useWikipediaCandidates.ts:83-90`

Stats are calculated from the filtered data, not the total in the database:
```javascript
const statsData: WikipediaWordsStats = {
  total: allData.length,
  pending: allData.filter((c) => c.validation_status === 'pending').length,
  // ...
};
```

**Problem:** If the date filter excludes today's synced words, the stats will show 0 even if sync succeeded.

#### Issue 4: Missing Error Propagation

**Location:** Multiple places

Errors during sync may not be properly surfaced to the UI:
- `storeWikipediaWordCandidates()` logs errors but doesn't throw
- `syncLocalJSONToDatabase()` returns `{ success: allSuccess, results }` but partial failures are counted as success if any records synced

#### Issue 5: JSON File Path Resolution

**Location:** `wikipediaWordPopulator.ts:103`

```javascript
const jsonPath = path.join(process.cwd(), 'data', 'wikipedia-words', `${language}.json`);
```

**Problem:** In production or certain deployment environments, `process.cwd()` may not point to the expected directory, causing JSON files to not be found.

### Additional Analysis: Daily Word/Buzz Generation

Similar patterns exist in the daily word generation flow:
1. API routes properly check admin auth
2. But timeout issues can occur (60-120s max duration)
3. AI service availability (`gameAIService.isConfigured()`) may return false without proper credentials

## Root Cause

**Primary Root Cause:**
Date range mismatch between sync operation (stores with today's date) and UI query (may filter to different dates).

**Contributing Factors:**
1. Upsert with `ignoreDuplicates: true` prevents updates to existing records
2. Stats calculated from filtered results, not total database contents
3. Error handling doesn't surface specific failure reasons clearly

## Fix Strategy

### Recommended Fix: Multi-pronged approach

**Option 1: Fix Date Range Handling (Highest Priority)**
- Approach: After sync, automatically refresh the date range to include today
- Risk: Low
- Impact: High - Immediately shows synced words

**Option 2: Change Upsert Behavior**
- Approach: Change from `ignoreDuplicates: true` to proper upsert that updates existing records
- Risk: Medium - May overwrite manual changes
- Impact: Medium - Ensures fresh data

**Option 3: Improve Error Feedback**
- Approach: Add detailed success/error messages to UI
- Risk: Low
- Impact: Medium - Better admin experience

### Implementation Steps

1. **Step 1:** In `useWikipediaCandidates.ts`, after `syncFromJSON()` succeeds, update the date range to include today:
   ```javascript
   // After sync completes successfully
   const today = new Date().toISOString().split('T')[0];
   if (dateRange.end < today) {
     setDateRange(prev => ({ ...prev, end: today }));
   }
   ```

2. **Step 2:** In `wikipediaWordFetcher.ts`, change upsert behavior:
   ```javascript
   .upsert(batch, {
     onConflict: 'language,word,fetch_date',
     ignoreDuplicates: false  // Allow updates
   });
   ```

3. **Step 3:** Add success message with count in UI after sync

4. **Step 4:** Add error details to API responses

**Files to Modify:**
- `components/admin/wikipedia-words/hooks/useWikipediaCandidates.ts` - Add date range update after sync
- `backend/services/wikipediaWordFetcher.ts` - Change upsert behavior
- `components/admin/wikipedia-words/components/WikipediaStatsCard.tsx` - Add success feedback

**Testing Strategy:**
- Unit tests for date range handling
- Integration test for sync -> display flow
- Manual test: Sync, verify words appear in list

**Validation:**
- After fix, clicking "Sync from JSON" should:
  1. Show loading state
  2. Complete without error
  3. Update stats to show new word count
  4. Display synced words in the list

## Impact

**Current Impact:**
- Admins cannot easily populate word candidates
- Daily challenge scheduling workflow is disrupted
- No data corruption, just visibility issue

**Potential Side Effects:**
- Changing upsert behavior may cause existing records to be updated
- Date range auto-update changes user's filter state

## Prevention

**How to Prevent:**
- [ ] Add test: Integration test for full sync -> display flow
- [ ] Update code review checklist: Verify data written matches query filters
- [ ] Add monitoring: Log successful sync operations with word counts
- [ ] Improve patterns: Always show success feedback with details

## Next Steps

1. Verify this analysis with user by checking browser console logs
2. Implement fix using: `/bug_fix:implement-fix <this-rca>`
3. Test the complete admin dashboard flow
4. Update documentation if needed

---

**RCA Status:** Analysis Complete - Ready for Implementation
