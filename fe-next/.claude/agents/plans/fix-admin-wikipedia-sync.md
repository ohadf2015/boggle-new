# Fix Plan: Admin Dashboard Wikipedia Sync

## Root Cause
Date range mismatch between sync operation (stores with today's date) and UI query (may filter to different dates). Also, upsert with `ignoreDuplicates: true` prevents updates to existing records.

## Fix Strategy
Multi-pronged approach:
1. Auto-update date range after successful sync to include today
2. Change upsert behavior to allow updates
3. Add success feedback showing how many words were synced
4. Improve error messaging with specific failure reasons

## Files to Modify
- `components/admin/wikipedia-words/hooks/useWikipediaCandidates.ts` - Add date range update after sync, return sync results
- `backend/services/wikipediaWordFetcher.ts` - Change upsert to allow updates
- `components/admin/wikipedia-words/components/WikipediaStatsCard.tsx` - Add success/error feedback display
- `components/admin/wikipedia-words/WikipediaWordsPanel.tsx` - Pass sync results callback

## Implementation Steps

### Step 1: Fix date range handling in hook
- After `syncFromJSON()` succeeds, update the date range to include today
- Return sync results (word count) from the function

### Step 2: Change upsert behavior
- Change `ignoreDuplicates: true` to `ignoreDuplicates: false`
- This allows updates to existing records

### Step 3: Add success feedback to UI
- Display toast/message with word count after successful sync
- Show specific error messages on failure

### Step 4: Improve API response details
- Include word count in sync response
- Include per-language breakdown

## Testing Strategy
- Existing tests should pass
- Manual test: Sync, verify words appear in list with correct stats

## Validation
- After fix, clicking "Sync from JSON" should:
  1. Show loading state
  2. Complete without error
  3. Update stats to show new word count
  4. Display synced words in the list
