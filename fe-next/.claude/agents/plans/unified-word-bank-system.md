# Feature: Unified Word Bank System

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Consolidate all word-related admin functionality (Wikipedia words, word bank, daily challenge word selection) into a single unified Word Bank management system. This eliminates the need for separate admin pages and provides a seamless experience for managing all words from one place.

## User Story

As an admin
I want to manage all words (Wikipedia, static, manually added) from one unified Word Bank page
So that I can efficiently view, filter, add, import, block, and delete words without navigating between multiple pages

## Problem Statement

Currently, the admin dashboard has three separate word-related pages:
1. **Wikipedia Words** (`/admin/wikipedia-words`) - Manages Wikipedia candidates in `wikipedia_word_candidates`
2. **Word Bank** (`/admin/word-bank`) - Manages curated words in `daily_challenge_word_bank`
3. **Daily Challenge Words** (`/admin/words`) - Schedules words for specific days

This fragmentation causes confusion and requires admins to navigate between multiple pages to manage words effectively. The Wikipedia candidates and Word Bank tables are separate, requiring manual synchronization.

## Solution Statement

1. **Unified Database**: Merge Wikipedia candidates into the existing `daily_challenge_word_bank` table with a new `validation_status` column
2. **Single Admin Page**: Create one comprehensive Word Bank page with all functionality
3. **Show All Words**: Display words from all sources with their validation status (pending, approved, blocked)
4. **Consolidate Actions**: Block/unblock, delete, bulk import (text + CSV), Wikipedia sync/fetch - all in one place
5. **Remove Redundant Pages**: Deprecate the separate Wikipedia Words page
6. **Daily Challenge Integration**: The Daily Challenge word selection should pull from this unified word bank

## Feature Metadata

**Feature Type:** Refactor + Enhancement
**Estimated Complexity:** High
**Primary Systems Affected:**
- Database schema (migration for validation_status)
- Wikipedia word population service
- Word bank API endpoints
- Admin UI components
- Admin page routing
- Daily Challenge word selection
**Dependencies:**
- Supabase (database)
- Existing word bank infrastructure
- Existing Wikipedia sync system

---

## CONTEXT REFERENCES

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

**Database Schema:**
- `supabase/migrations/061_daily_challenge_word_bank.sql` (full file)
  - **WHY:** Current word bank table structure
  - **PATTERN:** Need to add `validation_status` column

- `supabase/migrations/044_wikipedia_word_sources.sql` (full file)
  - **WHY:** Current Wikipedia candidates table structure
  - **PATTERN:** Fields to migrate: `validation_status`, `interestingness_score`, `source_article_title`, `source_article_url`

**Current Word Bank System:**
- `lib/dailyChallenge/wordBankService.ts` (full file)
  - **WHY:** Core word bank service with import/export functions
  - **PATTERN:** `importWordsFromDictionary`, `getWordsFromWordBank`, `blockWord`, `unblockWord`

- `components/admin/word-bank/WordBankPanel.tsx` (lines 1-90)
  - **WHY:** Current word bank UI structure
  - **PATTERN:** Panel with filters and table

- `components/admin/word-bank/hooks/useWordBank.ts` (full file)
  - **WHY:** Current word bank data fetching hook
  - **PATTERN:** Fetch, delete, pagination

- `app/api/admin/daily-word/word-bank/route.ts` (full file)
  - **WHY:** Current word bank API
  - **PATTERN:** GET for list/stats, POST for actions

**Current Wikipedia System:**
- `components/admin/wikipedia-words/WikipediaWordsPanel.tsx` (full file)
  - **WHY:** Wikipedia UI with sync/fetch buttons to migrate
  - **PATTERN:** `triggerPopulation`, `syncFromJSON`, `bulkApproveToDict`

- `components/admin/wikipedia-words/hooks/useWikipediaCandidates.ts` (full file)
  - **WHY:** Wikipedia data fetching and actions
  - **PATTERN:** Sync from JSON, trigger population, bulk approve

- `backend/services/wikipediaWordPopulator.ts` (full file)
  - **WHY:** Wikipedia word fetching and validation
  - **PATTERN:** Needs to write directly to unified word bank

- `app/api/admin/wikipedia-words/route.ts` (full file)
  - **WHY:** Wikipedia API endpoints to consolidate
  - **PATTERN:** `populate`, `sync-json` actions

**Admin Dashboard:**
- `app/[locale]/admin/PageClient.tsx` (lines 130-230)
  - **WHY:** Admin navigation grid
  - **PATTERN:** Remove Wikipedia Words card, keep/update Word Bank card

**Daily Challenge Integration:**
- `components/admin/DailyWordManager.tsx` (full file)
  - **WHY:** Understand how daily challenges select words
  - **PATTERN:** Should pull from unified word bank

### Files to Create

- `supabase/migrations/XXX_unify_word_bank_system.sql` - Migration to add columns and migrate data
- `app/api/admin/unified-word-bank/route.ts` - New unified API endpoint
- `components/admin/word-bank/components/WordBankImportModal.tsx` - Bulk import modal (text + CSV)
- `components/admin/word-bank/components/WikipediaSyncSection.tsx` - Wikipedia sync controls
- `components/admin/word-bank/components/WordBankBulkActions.tsx` - Bulk selection actions

### Files to Modify

- `components/admin/word-bank/WordBankPanel.tsx` - Add Wikipedia sync, import, validation status filter
- `components/admin/word-bank/hooks/useWordBank.ts` - Add import, sync, validation status methods
- `components/admin/word-bank/types.ts` - Add validation_status, source_article fields
- `components/admin/word-bank/components/WordBankTable.tsx` - Add validation status column, bulk select
- `components/admin/word-bank/components/WordBankFilters.tsx` - Add validation status filter
- `app/[locale]/admin/PageClient.tsx` - Remove Wikipedia Words navigation card
- `lib/dailyChallenge/wordBankService.ts` - Update to handle validation_status
- `backend/services/wikipediaWordPopulator.ts` - Write to unified word bank instead of candidates

### Files to Delete (After Migration)

- `app/[locale]/admin/wikipedia-words/page.tsx`
- `app/[locale]/admin/wikipedia-words/PageClient.tsx`
- `components/admin/wikipedia-words/` (entire directory)
- `app/api/admin/wikipedia-words/route.ts`
- `app/api/admin/wikipedia-words/bulk-approve/route.ts`

### Relevant Documentation

- [Supabase Migrations](https://supabase.com/docs/guides/database/migrations)
  - **Section:** Running migrations
  - **WHY:** Database schema changes

- [CSV Parsing in JavaScript](https://www.papaparse.com/)
  - **Section:** Client-side parsing
  - **WHY:** CSV import functionality

### Patterns to Follow

**Unified Word Bank Entry:**

```typescript
// ✅ GOOD: Extended word bank entry with validation status
export interface UnifiedWordBankWord {
  id: string;
  word: string;
  language: Language;
  source: 'static' | 'dictionary' | 'wikipedia' | 'admin' | 'ai';
  validation_status: 'pending' | 'approved' | 'rejected'; // NEW
  status: 'active' | 'blocked' | 'used';
  times_used: number;
  last_used_at: string | null;
  blocked_reason: string | null;
  created_at: string;
  // Wikipedia-specific fields (null for non-Wikipedia sources)
  source_article_title: string | null;
  source_article_url: string | null;
  interestingness_score: number | null;
}
```

**Migration Pattern (Data Migration):**

```sql
-- ✅ GOOD: Add columns and migrate data in one transaction
BEGIN;

-- Add new columns to word bank
ALTER TABLE daily_challenge_word_bank
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'approved' CHECK (validation_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS source_article_title TEXT,
ADD COLUMN IF NOT EXISTS source_article_url TEXT,
ADD COLUMN IF NOT EXISTS interestingness_score INTEGER;

-- Create index for validation status filtering
CREATE INDEX IF NOT EXISTS idx_word_bank_validation_status
ON daily_challenge_word_bank(language, validation_status);

-- Migrate Wikipedia candidates to unified table
INSERT INTO daily_challenge_word_bank (
  word, language, source, validation_status,
  source_article_title, source_article_url, interestingness_score,
  status, created_at
)
SELECT
  word, language, 'wikipedia',
  CASE validation_status
    WHEN 'valid' THEN 'approved'
    WHEN 'invalid' THEN 'rejected'
    ELSE 'pending'
  END,
  source_article_title, source_article_url, interestingness_score,
  'active', created_at
FROM wikipedia_word_candidates
ON CONFLICT (word, language) DO UPDATE SET
  source_article_title = EXCLUDED.source_article_title,
  source_article_url = EXCLUDED.source_article_url,
  interestingness_score = EXCLUDED.interestingness_score;

-- Update existing word bank entries without validation_status
UPDATE daily_challenge_word_bank
SET validation_status = 'approved'
WHERE validation_status IS NULL;

COMMIT;
```

**Bulk Import API Pattern:**

```typescript
// ✅ GOOD: Flexible import supporting text and CSV
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, language, format, content, words } = body;

  switch (action) {
    case 'bulk-import': {
      let wordsToImport: string[] = [];

      if (format === 'text') {
        // Simple text: one word per line
        wordsToImport = content.split('\n')
          .map((w: string) => w.trim().toUpperCase())
          .filter((w: string) => w.length > 0);
      } else if (format === 'csv') {
        // CSV: parse with papaparse
        const parsed = Papa.parse(content, { header: true });
        wordsToImport = parsed.data
          .map((row: { word: string }) => row.word?.trim().toUpperCase())
          .filter(Boolean);
      } else if (Array.isArray(words)) {
        wordsToImport = words.map(w => w.trim().toUpperCase());
      }

      const result = await importWordsToBank(supabase, language, wordsToImport, 'admin');
      return NextResponse.json({ success: true, ...result });
    }
    // ... other actions
  }
}
```

**Wikipedia Sync to Unified Bank:**

```typescript
// ✅ GOOD: Wikipedia populator writes directly to unified word bank
async function populateWikipediaWords(language: Language, date: string) {
  const words = await fetchWikipediaWords(language, date);

  // Insert directly to word bank with pending status
  const { error } = await supabase
    .from('daily_challenge_word_bank')
    .upsert(
      words.map(w => ({
        word: w.word.toUpperCase(),
        language,
        source: 'wikipedia',
        validation_status: 'pending', // Pending by default
        source_article_title: w.articleTitle,
        source_article_url: w.articleUrl,
        interestingness_score: w.score,
        status: 'active',
      })),
      { onConflict: 'word,language', ignoreDuplicates: false }
    );

  return { success: !error, count: words.length };
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Database Migration

Extend `daily_challenge_word_bank` table to include validation status and Wikipedia metadata, then migrate existing Wikipedia candidates.

**Tasks:**
- Create migration to add new columns
- Migrate data from `wikipedia_word_candidates`
- Update indexes for efficient querying
- Keep `wikipedia_word_candidates` table temporarily for rollback safety

**Order:** Must be completed first before any code changes.

### Phase 2: Backend Service Updates

Update word bank service and Wikipedia populator to work with unified schema.

**Tasks:**
- Update `wordBankService.ts` to handle validation_status
- Modify Wikipedia populator to write directly to word bank
- Add bulk import functionality to word bank service
- Update API endpoints to support new fields and actions

**Order:** Depends on Phase 1 completion.

### Phase 3: API Consolidation

Consolidate Wikipedia API endpoints into the word bank API.

**Tasks:**
- Add `sync-wikipedia`, `fetch-wikipedia` actions to word bank API
- Add `bulk-import` action for text and CSV
- Add validation status update action
- Deprecate old Wikipedia API endpoints

**Order:** Depends on Phase 2 completion.

### Phase 4: UI Enhancement

Enhance the Word Bank admin page with all unified functionality.

**Tasks:**
- Add validation status filter to WordBankFilters
- Add validation status column to WordBankTable
- Create bulk import modal (text + CSV)
- Add Wikipedia sync section with buttons
- Add bulk selection and actions
- Update stats card to show pending/approved/rejected counts

**Order:** Depends on Phase 3 completion.

### Phase 5: Cleanup & Navigation

Remove deprecated pages and update navigation.

**Tasks:**
- Remove Wikipedia Words navigation card from admin dashboard
- Delete Wikipedia Words page and components
- Delete old Wikipedia API routes
- Update admin page title to "Word Bank" (consolidate)
- Add migration for dropping wikipedia_word_candidates (optional, can defer)

**Order:** Depends on Phase 4 completion and testing.

### Phase 6: Testing & Validation

Comprehensive testing of the unified system.

**Tasks:**
- Unit tests for new service functions
- Integration tests for API endpoints
- E2E tests for admin UI flows
- Verify daily challenge word selection still works
- Test Wikipedia sync and import flows

**Order:** Done incrementally throughout each phase.

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: CREATE database migration for unified word bank

**File:** `supabase/migrations/XXX_unify_word_bank_system.sql` (use next available number)

- **IMPLEMENT:** Add validation_status, source_article_title, source_article_url, interestingness_score columns to daily_challenge_word_bank
- **PATTERN:** Follow migration pattern from `061_daily_challenge_word_bank.sql`
- **IMPORTS:** N/A (SQL migration)
- **GOTCHA:** Use `IF NOT EXISTS` for idempotent migration, migrate existing data from wikipedia_word_candidates
- **VALIDATE:** `npm run db:migrate` then query: `SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_challenge_word_bank';`

### Task 2: UPDATE word bank types with validation status

**File:** `components/admin/word-bank/types.ts`

- **IMPLEMENT:** Add `validation_status`, `source_article_title`, `source_article_url`, `interestingness_score` to WordBankWord interface
- **PATTERN:** Mirror existing type structure
- **IMPORTS:** None additional
- **GOTCHA:** validation_status should be 'pending' | 'approved' | 'rejected'
- **VALIDATE:** `npm run build`

### Task 3: UPDATE wordBankService with validation status handling

**File:** `lib/dailyChallenge/wordBankService.ts`

- **IMPLEMENT:**
  - Add validation_status parameter to import functions
  - Update `getWordsFromWordBank` to filter by validation_status
  - Add `updateValidationStatus` function
  - Add `bulkImportWords` function for text/array import
- **PATTERN:** Mirror existing function patterns
- **IMPORTS:** None additional
- **GOTCHA:** Existing words (non-Wikipedia) should default to 'approved'
- **VALIDATE:** `npm run test -- wordBankService.test.ts`

### Task 4: UPDATE Wikipedia populator to write to unified word bank

**File:** `backend/services/wikipediaWordPopulator.ts`

- **IMPLEMENT:** Change insertion target from `wikipedia_word_candidates` to `daily_challenge_word_bank`
- **PATTERN:** Use existing upsert pattern with new validation_status field
- **IMPORTS:** None additional
- **GOTCHA:** Set validation_status to 'pending' for new Wikipedia words
- **VALIDATE:** `npm run test -- wikipediaWordPopulator.test.ts`

### Task 5: UPDATE word bank API with new actions

**File:** `app/api/admin/daily-word/word-bank/route.ts`

- **IMPLEMENT:** Add new POST actions:
  - `sync-wikipedia` - Trigger Wikipedia population
  - `fetch-wikipedia` - Sync from JSON files
  - `bulk-import` - Import from text or CSV
  - `update-validation` - Update validation status
  - `bulk-delete` - Delete multiple words
  - `bulk-block` - Block multiple words
- **PATTERN:** Mirror existing action switch pattern
- **IMPORTS:** Add papaparse for CSV parsing: `import Papa from 'papaparse'`
- **GOTCHA:** Validate language and format parameters
- **VALIDATE:** Manual API testing with curl

### Task 6: CREATE WordBankImportModal component

**File:** `components/admin/word-bank/components/WordBankImportModal.tsx`

- **IMPLEMENT:** Modal with:
  - Tabs for "Text" and "CSV" import modes
  - Text area for pasting words (text mode)
  - File upload for CSV
  - Preview of words to import
  - Import button with progress
- **PATTERN:** Mirror modal patterns from existing components
- **IMPORTS:**
  ```typescript
  import { useState, useCallback } from 'react';
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
  import { Button } from '@/components/ui/button';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
  import { Upload, FileText } from 'lucide-react';
  ```
- **GOTCHA:** Handle large file uploads gracefully, show word count preview
- **VALIDATE:** Manual UI testing

### Task 7: CREATE WikipediaSyncSection component

**File:** `components/admin/word-bank/components/WikipediaSyncSection.tsx`

- **IMPLEMENT:** Section with:
  - "Sync from JSON" button
  - "Fetch from Wikipedia" button
  - Language selector for fetch
  - Status/progress display
- **PATTERN:** Mirror WikipediaStatsCard from old Wikipedia panel
- **IMPORTS:**
  ```typescript
  import { useState } from 'react';
  import { Button } from '@/components/ui/button';
  import { Globe, RefreshCw, Download } from 'lucide-react';
  import type { Language } from '@/types';
  ```
- **GOTCHA:** Show loading states, handle timeouts gracefully
- **VALIDATE:** Manual UI testing

### Task 8: CREATE WordBankBulkActions component

**File:** `components/admin/word-bank/components/WordBankBulkActions.tsx`

- **IMPLEMENT:** Bulk action bar that appears when words are selected:
  - "Delete Selected" button
  - "Block Selected" button
  - "Approve Selected" button (for pending)
  - "Reject Selected" button (for pending)
  - Selection count display
- **PATTERN:** Mirror bulk action patterns from Wikipedia panel
- **IMPORTS:**
  ```typescript
  import { Button } from '@/components/ui/button';
  import { Trash2, Ban, Check, X } from 'lucide-react';
  ```
- **GOTCHA:** Only show relevant actions based on selected word statuses
- **VALIDATE:** Manual UI testing

### Task 9: UPDATE WordBankFilters with validation status

**File:** `components/admin/word-bank/components/WordBankFilters.tsx`

- **IMPLEMENT:** Add validation status dropdown filter ('all', 'pending', 'approved', 'rejected')
- **PATTERN:** Mirror existing status filter pattern
- **IMPORTS:** None additional
- **GOTCHA:** Default to 'all' to show everything
- **VALIDATE:** `npm run build`

### Task 10: UPDATE WordBankTable with selection and validation column

**File:** `components/admin/word-bank/components/WordBankTable.tsx`

- **IMPLEMENT:**
  - Add checkbox column for bulk selection
  - Add validation_status column with colored badges
  - Add source_article_url link for Wikipedia words
  - Add interestingness_score display
- **PATTERN:** Mirror table patterns from Wikipedia candidates list
- **IMPORTS:**
  ```typescript
  import { Checkbox } from '@/components/ui/checkbox';
  import { ExternalLink } from 'lucide-react';
  ```
- **GOTCHA:** Handle null values for non-Wikipedia words
- **VALIDATE:** Manual UI testing

### Task 11: UPDATE WordBankStatsCard with validation counts

**File:** `components/admin/word-bank/components/WordBankStatsCard.tsx`

- **IMPLEMENT:** Add stats for:
  - Pending validation count
  - Approved count
  - Rejected count
  - Wikipedia source count
- **PATTERN:** Mirror existing stats display
- **IMPORTS:** None additional
- **GOTCHA:** Use descriptive labels
- **VALIDATE:** Manual UI testing

### Task 12: UPDATE useWordBank hook with new functionality

**File:** `components/admin/word-bank/hooks/useWordBank.ts`

- **IMPLEMENT:** Add methods:
  - `bulkImport(words: string[], format: 'text' | 'csv')`
  - `syncWikipediaJSON()`
  - `fetchWikipedia(language: Language)`
  - `updateValidation(ids: string[], status: ValidationStatus)`
  - `bulkDelete(ids: string[])`
  - `bulkBlock(ids: string[])`
  - Selection state management
- **PATTERN:** Mirror useWikipediaCandidates patterns
- **IMPORTS:** None additional
- **GOTCHA:** Handle API timeouts for Wikipedia operations
- **VALIDATE:** `npm run test`

### Task 13: UPDATE WordBankPanel with all new components

**File:** `components/admin/word-bank/WordBankPanel.tsx`

- **IMPLEMENT:** Integrate:
  - WikipediaSyncSection above filters
  - Import button that opens WordBankImportModal
  - WordBankBulkActions when items selected
  - Updated filters with validation status
  - Updated table with selection
- **PATTERN:** Mirror WikipediaWordsPanel structure
- **IMPORTS:**
  ```typescript
  import { WikipediaSyncSection } from './components/WikipediaSyncSection';
  import { WordBankImportModal } from './components/WordBankImportModal';
  import { WordBankBulkActions } from './components/WordBankBulkActions';
  ```
- **GOTCHA:** Handle selection state between table and bulk actions
- **VALIDATE:** Manual UI testing, full workflow

### Task 14: UPDATE admin dashboard navigation

**File:** `app/[locale]/admin/PageClient.tsx`

- **IMPLEMENT:**
  - Remove Wikipedia Words navigation card (Globe icon, teal-500)
  - Update Word Bank card description to indicate it's the unified word manager
- **PATTERN:** Just delete/modify existing Card component
- **IMPORTS:** None
- **GOTCHA:** Don't break other navigation cards
- **VALIDATE:** Navigate to `/admin` and verify only Word Bank card exists

### Task 15: DELETE Wikipedia Words admin pages

**Files to delete:**
- `app/[locale]/admin/wikipedia-words/page.tsx`
- `app/[locale]/admin/wikipedia-words/PageClient.tsx`

- **IMPLEMENT:** Delete files
- **PATTERN:** N/A
- **IMPORTS:** N/A
- **GOTCHA:** Make sure no other files import from these
- **VALIDATE:** `npm run build` should pass

### Task 16: DELETE Wikipedia Words components

**Directory to delete:** `components/admin/wikipedia-words/`

- **IMPLEMENT:** Delete entire directory (WikipediaWordsPanel, hooks, types, components)
- **PATTERN:** N/A
- **IMPORTS:** N/A
- **GOTCHA:** Make sure no imports from this directory exist
- **VALIDATE:** `npm run build` should pass

### Task 17: DELETE old Wikipedia API routes

**Files to delete:**
- `app/api/admin/wikipedia-words/route.ts`
- `app/api/admin/wikipedia-words/bulk-approve/route.ts`
- `app/api/admin/wikipedia-words/[id]/route.ts`

- **IMPLEMENT:** Delete files
- **PATTERN:** N/A
- **IMPORTS:** N/A
- **GOTCHA:** Functionality should be migrated to word-bank route
- **VALIDATE:** `npm run build` should pass

### Task 18: UPDATE translations

**Files:** `translations/en.js`, `translations/he.js`, `translations/sv.js`, `translations/ja.js`, `translations/es.js`

- **IMPLEMENT:** Add translation keys:
  ```javascript
  // Under admin section
  wordBank: 'Word Bank',
  wordBankDescription: 'Unified word management',
  importWords: 'Import Words',
  importFromText: 'From Text',
  importFromCSV: 'From CSV',
  syncWikipedia: 'Sync Wikipedia',
  fetchWikipedia: 'Fetch from Wikipedia',
  validationStatus: 'Validation',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  bulkDelete: 'Delete Selected',
  bulkBlock: 'Block Selected',
  bulkApprove: 'Approve Selected',
  bulkReject: 'Reject Selected',
  selectedCount: '{count} selected',
  importPreview: 'Preview ({count} words)',
  ```
- **PATTERN:** Follow existing translation structure
- **GOTCHA:** Must translate to all 5 languages
- **VALIDATE:** `npm run build`

### Task 19: CREATE unit tests for updated services

**File:** `lib/dailyChallenge/__tests__/wordBankService.test.ts`

- **IMPLEMENT:** Add tests for:
  - `bulkImportWords` with different formats
  - `updateValidationStatus` function
  - Filtering by validation_status
- **PATTERN:** Mirror existing test patterns
- **IMPORTS:** Jest testing utilities
- **GOTCHA:** Mock Supabase client
- **VALIDATE:** `npm run test -- wordBankService.test.ts`

### Task 20: CREATE integration tests for unified API

**File:** `app/api/admin/daily-word/word-bank/__tests__/unified.test.ts`

- **IMPLEMENT:** Tests for:
  - `bulk-import` action (text format)
  - `bulk-import` action (CSV format)
  - `sync-wikipedia` action
  - `update-validation` action
  - `bulk-delete` action
- **PATTERN:** Mirror existing API test patterns
- **IMPORTS:** Jest, test utilities
- **GOTCHA:** Use proper admin auth mocking
- **VALIDATE:** `npm run test -- unified.test.ts`

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**
- Test `bulkImportWords` with text format (words array)
- Test `bulkImportWords` with validation_status parameter
- Test `updateValidationStatus` function
- Test Wikipedia populator writing to word bank
- Mock Supabase client for database operations

**Pattern:**

```typescript
describe('bulkImportWords', () => {
  it('should import words with pending validation status', async () => {
    const mockSupabase = createMockSupabaseClient();
    const words = ['APPLE', 'BANANA', 'CHERRY'];

    await bulkImportWords(mockSupabase, 'en', words, 'admin', 'pending');

    expect(mockSupabase.from).toHaveBeenCalledWith('daily_challenge_word_bank');
    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ word: 'APPLE', validation_status: 'pending' }),
      ]),
      expect.anything()
    );
  });
});
```

### Integration Tests

**Scope and Requirements:**
- Test bulk import API endpoint with text format
- Test bulk import API endpoint with CSV format
- Test Wikipedia sync triggers word bank insertion
- Test validation status update across multiple words
- Use real Supabase test instance

### Manual Testing

**Bulk Import (Text):**
1. Navigate to `/en/admin/word-bank`
2. Click "Import Words" button
3. Select "Text" tab
4. Paste words (one per line)
5. Click "Preview" - verify word count
6. Click "Import" - verify success message
7. Check table - new words should appear with source='admin'

**Bulk Import (CSV):**
1. Create CSV file with columns: word, language, category
2. Click "Import Words" button
3. Select "CSV" tab
4. Upload CSV file
5. Click "Preview" - verify word count
6. Click "Import" - verify success message

**Wikipedia Sync:**
1. Click "Sync Wikipedia" button
2. Wait for completion
3. Verify new words appear with source='wikipedia', validation_status='pending'

**Validation Status Update:**
1. Filter by validation_status='pending'
2. Select multiple words
3. Click "Approve Selected"
4. Verify validation_status changed to 'approved'

### Edge Cases

- Empty text import (should show error)
- Malformed CSV (should show error with details)
- Duplicate words (should skip gracefully)
- Wikipedia API timeout (should show error, not crash)
- Bulk delete with 0 selected (button should be disabled)
- Non-admin user access (should redirect to login)

---

## VALIDATION COMMANDS

**Environment Requirements:**
- ✅ Use local development environment
- ✅ Start with `npm run dev`
- ❌ NEVER validate against production database

### Level 1: Database Migration

```bash
npm run db:migrate
# Check migration applied:
# Query: SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_challenge_word_bank';
# Expected: Should include validation_status, source_article_title, source_article_url, interestingness_score
```

### Level 2: TypeScript Compilation

```bash
npm run build
```

**Expected:** Build succeeds with no compilation errors

### Level 3: Unit Tests

```bash
npm run test
```

**Expected:** All tests pass

### Level 4: Linting

```bash
npm run lint
```

**Expected:** No linting errors

### Level 5: Manual UI Testing

```bash
npm run dev
# Navigate to http://localhost:3000/en/admin/word-bank
# Test: Import, sync, filter, bulk actions, delete
```

---

## ACCEPTANCE CRITERIA

- [ ] Database migration adds validation_status, source_article columns to word bank
- [ ] Existing Wikipedia candidates are migrated to unified word bank
- [ ] Wikipedia populator writes directly to unified word bank
- [ ] Word Bank page shows all words with validation status filter
- [ ] Bulk import works for both text and CSV formats
- [ ] Wikipedia sync/fetch buttons work from Word Bank page
- [ ] Bulk selection and actions (delete, block, approve, reject) work
- [ ] Wikipedia Words page is removed from admin
- [ ] Admin navigation only shows Word Bank (not Wikipedia Words)
- [ ] All validation commands pass
- [ ] No regressions in daily challenge word selection
- [ ] All translation keys added for 5 languages

---

## COMPLETION CHECKLIST

- [ ] Database migration created and applied
- [ ] Types updated with validation_status
- [ ] wordBankService updated with new functions
- [ ] Wikipedia populator writes to unified table
- [ ] API consolidated with all actions
- [ ] UI components created (import modal, sync section, bulk actions)
- [ ] WordBankPanel integrates all new components
- [ ] Admin navigation updated
- [ ] Wikipedia pages deleted
- [ ] Wikipedia components deleted
- [ ] Wikipedia API routes deleted
- [ ] Translations added
- [ ] Unit tests created
- [ ] Integration tests created
- [ ] All tests pass
- [ ] Manual testing completed

---

## NOTES

**Design Rationale:**

- **Why unify tables?** Single source of truth eliminates sync issues and simplifies queries
- **Why keep validation_status?** Allows Wikipedia words to go through review before being used in challenges
- **Why text + CSV import?** Text is simpler for quick additions, CSV for structured bulk imports
- **Why remove Wikipedia page?** Consolidation reduces navigation complexity and maintenance burden

**Alternatives Considered:**

- **Keep separate tables with sync:** Rejected - creates sync complexity and potential data inconsistency
- **Virtual view combining tables:** Rejected - complicates writes and doesn't truly unify
- **Only CSV import:** Rejected - text is faster for simple use cases

**Trade-offs:**

- **Migration complexity vs. long-term simplicity:** Taking on migration complexity now for simpler system long-term
- **Larger word bank table:** Table will have more columns, but indexes handle query performance

**Future Considerations:**

- **AI-assisted word suggestions:** Could add AI scoring for word quality
- **Word categories/tags:** Enhance filtering with custom tags
- **Word history/audit:** Track who added/modified words
- **Export functionality:** Export word bank to file

**Rollback Plan:**

- Keep `wikipedia_word_candidates` table for 30 days after migration
- If issues arise, can restore from backup and revert code changes
- Migration uses `IF NOT EXISTS` for safe re-runs
