# Feature: Wikipedia Words to Daily Challenge Word Bank Integration

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Automatically integrate Wikipedia-sourced words into the daily challenge word bank system. When Wikipedia words are fetched/synced, they should be automatically added to `daily_challenge_word_bank` table with proper filtering (length requirements), and admins should be able to view and delete words from the word bank through the admin dashboard.

## User Story

As an admin
I want Wikipedia words to be automatically added to the daily challenge word bank
So that I don't have to manually import words and the daily challenge system has a rich word pool from Wikipedia content

## Problem Statement

Currently, Wikipedia words are stored in `wikipedia_word_candidates` table but are not automatically integrated into the `daily_challenge_word_bank` table that the daily challenge system uses. This requires manual intervention and prevents the daily challenge from leveraging high-quality Wikipedia content. Additionally, there's no UI for removing words from the word bank.

## Solution Statement

1. **Automatic Import**: Modify Wikipedia word sync/population logic to automatically insert words into `daily_challenge_word_bank` when they are validated
2. **Length Filtering**: Apply language-specific word length requirements before importing (min 4 letters for most languages, min 2 for Japanese)
3. **Admin UI**: Add word bank management page with word list display and individual delete buttons
4. **Prevent Duplicates**: Use existing unique constraint on (word, language) to prevent duplicate entries

## Feature Metadata

**Feature Type:** Enhancement
**Estimated Complexity:** Medium
**Primary Systems Affected:**
- Backend Wikipedia word population service
- Admin word bank management API
- Admin dashboard UI
**Dependencies:**
- Supabase (database)
- Existing Wikipedia word sync system
- Existing word bank infrastructure

---

## CONTEXT REFERENCES

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

**Wikipedia Word System:**
- `backend/services/wikipediaWordPopulator.ts` (lines 1-500)
  - **WHY:** Contains word validation and database insertion logic
  - **PATTERN:** Batch upsert with validation

- `app/api/admin/wikipedia-words/route.ts` (lines 181-195)
  - **WHY:** Handles JSON sync action that needs modification
  - **PATTERN:** POST action routing with supabase client

**Word Bank System:**
- `lib/dailyChallenge/wordBankService.ts` (lines 280-334)
  - **WHY:** Contains `importWordsFromDictionary` function to reuse
  - **PATTERN:** Batch import with length filtering and source tracking

- `supabase/migrations/061_daily_challenge_word_bank.sql` (lines 7-24)
  - **WHY:** Word bank table schema with constraints
  - **PATTERN:** Unique constraint on (word, language), source enum includes 'wikipedia'

- `app/api/admin/daily-word/word-bank/route.ts` (lines 1-250)
  - **WHY:** Word bank API with block/delete operations
  - **PATTERN:** RESTful API with admin auth

**Admin Dashboard:**
- `app/[locale]/admin/wikipedia-words/PageClient.tsx` (lines 1-65)
  - **WHY:** Wikipedia words admin page structure
  - **PATTERN:** Client page with panel component

- `components/admin/wikipedia-words/WikipediaWordsPanel.tsx` (lines 1-164)
  - **WHY:** Main panel structure to potentially add word bank info
  - **PATTERN:** Hooks-based component with filters and actions

**Constants:**
- `lib/dailyChallenge/wordBankService.ts` (lines 16-24)
  - **WHY:** Word length constraints by language
  - **PATTERN:** `WORD_LENGTH_RANGE` record object

### New Files to Create

- `app/[locale]/admin/word-bank/page.tsx` - Word bank admin page (server component wrapper)
- `app/[locale]/admin/word-bank/PageClient.tsx` - Word bank admin page client component
- `components/admin/word-bank/WordBankPanel.tsx` - Main word bank management panel
- `components/admin/word-bank/WordBankTable.tsx` - Table displaying word bank words with delete buttons
- `components/admin/word-bank/types.ts` - TypeScript types for word bank UI
- `components/admin/word-bank/hooks/useWordBank.ts` - Custom hook for word bank data management
- `components/admin/word-bank/index.ts` - Barrel export file

### Relevant Documentation (MUST READ!)

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
  - **Section:** Service role bypass
  - **WHY:** Word bank operations use service role key

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
  - **Section:** Server and Client Components
  - **WHY:** Need to understand page structure for admin routes

### Patterns to Follow

**Backend Service Pattern (Wikipedia Word Populator):**

```typescript
// ✅ GOOD: Batch upsert with conflict handling
async function insertWords(words: string[], language: Language) {
  const { error } = await supabase
    .from('table_name')
    .upsert(words.map(word => ({
      word: word.toUpperCase(),
      language,
      source: 'wikipedia',
      status: 'active'
    })), {
      onConflict: 'word,language',
      ignoreDuplicates: true
    });

  if (error && error.code !== '23505') { // 23505 = duplicate
    console.error('Insert error:', error);
  }
}
```

**Admin API Pattern:**

```typescript
// ✅ GOOD: Admin auth + action routing
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const body = await request.json();
  const { action, language, word } = body;

  switch (action) {
    case 'delete': {
      // Handle delete action
      break;
    }
    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
}
```

**Word Bank Import Pattern:**

```typescript
// ✅ GOOD: Length filtering before import
const lengthRange = WORD_LENGTH_RANGE[language];
const validWords = words.filter(word => {
  const len = word.length;
  return len >= lengthRange.min && len <= lengthRange.max;
});

await importWordsFromDictionary(supabase, language, validWords, 'wikipedia');
```

**Admin Dashboard Pattern:**

```typescript
// ✅ GOOD: Server component wrapper with client component
// app/[locale]/admin/word-bank/page.tsx
export default async function WordBankPage() {
  return <WordBankPageClient />;
}

// app/[locale]/admin/word-bank/PageClient.tsx
'use client';
export default function WordBankPageClient() {
  const { language } = useLanguage();
  const { theme } = useTheme();

  return (
    <div className="flex-1 flex flex-col">
      <Header />
      <WordBankPanel />
    </div>
  );
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Backend - Automatic Wikipedia Word Import

Modify Wikipedia word population/sync to automatically insert words into word bank.

**Tasks:**
- Modify `wikipediaWordPopulator.ts` to add word bank integration
- Update JSON sync endpoint to trigger word bank import
- Add length filtering based on language requirements

**Order:** These tasks must be completed first before UI can display word bank data.

### Phase 2: Admin API - Word Bank Management

Extend word bank API to support UI operations.

**Tasks:**
- Verify delete endpoint exists in `/api/admin/daily-word/word-bank`
- Add GET endpoint improvements for listing with pagination
- Ensure proper error handling and admin auth

**Order:** Depends on Phase 1 completion.

### Phase 3: Admin UI - Word Bank Management Dashboard

Create admin interface for viewing and managing word bank.

**Tasks:**
- Create word bank admin page structure
- Build word bank table component with delete buttons
- Add custom hook for word bank data management
- Integrate with admin navigation

**Order:** Depends on Phase 2 completion.

### Phase 4: Testing & Validation

Comprehensive testing of automatic import and admin UI.

**Tasks:**
- Unit tests for word bank import logic
- Integration tests for API endpoints
- Manual testing of admin UI
- Test Wikipedia sync triggers word bank import

**Order:** Can be done incrementally with each phase.

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: CREATE helper function for automatic word bank import

**File:** `lib/dailyChallenge/wordBankService.ts`

- **IMPLEMENT:** New function `importWikipediaWordsToBank` that accepts Wikipedia word candidates and imports them with length filtering
- **PATTERN:** Mirror `importWordsFromDictionary` (lines 284-334) but with automatic length filtering
- **IMPORTS:**
  ```typescript
  import type { Language } from '@/types';
  import type { SupabaseClient } from '@supabase/supabase-js';
  ```
- **GOTCHA:** Japanese has min length 2, others have min length 4 (use `WORD_LENGTH_RANGE` constant)
- **VALIDATE:** `npm run test -- wordBankService.test.ts`

### Task 2: UPDATE Wikipedia populator to auto-import to word bank

**File:** `backend/services/wikipediaWordPopulator.ts`

- **IMPLEMENT:** Add call to `importWikipediaWordsToBank` after successful word validation (after line ~400 where candidates are inserted into `wikipedia_word_candidates`)
- **PATTERN:** Call word bank import for all valid words with `validation_status='valid'`
- **IMPORTS:**
  ```typescript
  import { importWikipediaWordsToBank } from '@/lib/dailyChallenge/wordBankService';
  import { getSupabaseAdmin } from '@/lib/admin/server';
  ```
- **GOTCHA:** Only import words with `validation_status='valid'`, not 'pending' or 'invalid'
- **VALIDATE:** `npm run test -- wikipediaWordPopulator.test.ts`

### Task 3: UPDATE JSON sync endpoint to trigger word bank import

**File:** `app/api/admin/wikipedia-words/route.ts`

- **IMPLEMENT:** After successful JSON sync (case 'sync-json', after line 194), fetch all valid candidates and import to word bank
- **PATTERN:** Query `wikipedia_word_candidates` for `validation_status='valid'`, extract words, call `importWikipediaWordsToBank`
- **IMPORTS:**
  ```typescript
  import { importWikipediaWordsToBank } from '@/lib/dailyChallenge/wordBankService';
  ```
- **GOTCHA:** Use `createClient` (already imported) to create Supabase admin client
- **VALIDATE:** Manual test: POST to `/api/admin/wikipedia-words` with `action: 'sync-json'`, check `daily_challenge_word_bank` table

### Task 4: CREATE word bank types

**File:** `components/admin/word-bank/types.ts`

- **IMPLEMENT:** TypeScript types for word bank UI
  ```typescript
  export interface WordBankWord {
    id: string;
    word: string;
    language: string;
    source: 'static' | 'dictionary' | 'wikipedia' | 'admin' | 'ai';
    status: 'active' | 'blocked' | 'used';
    times_used: number;
    last_used_at: string | null;
    blocked_reason: string | null;
    created_at: string;
  }

  export interface WordBankStats {
    total: number;
    active: number;
    blocked: number;
    bySource: Record<string, number>;
  }

  export interface WordBankFilters {
    language: Language;
    status?: 'active' | 'blocked' | 'used';
    source?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
  ```
- **PATTERN:** Mirror types from word bank API route (line 450-460)
- **IMPORTS:**
  ```typescript
  import type { Language } from '@/types';
  ```
- **VALIDATE:** `npm run build` (type checking)

### Task 5: CREATE word bank custom hook

**File:** `components/admin/word-bank/hooks/useWordBank.ts`

- **IMPLEMENT:** Custom hook `useWordBank` for fetching, deleting, and managing word bank words
- **PATTERN:** Mirror `useWikipediaCandidates` hook structure from Wikipedia words components
- **IMPORTS:**
  ```typescript
  import { useState, useEffect, useCallback } from 'react';
  import type { WordBankWord, WordBankStats, WordBankFilters } from '../types';
  ```
- **GOTCHA:** Use `/api/admin/daily-word/word-bank` endpoint (already exists), action 'delete' for deletion
- **VALIDATE:** Create test file `components/admin/word-bank/hooks/__tests__/useWordBank.test.ts`

### Task 6: CREATE word bank table component

**File:** `components/admin/word-bank/WordBankTable.tsx`

- **IMPLEMENT:** Table component displaying word bank words with columns: word, language, source, status, times_used, last_used_at, actions (delete button)
- **PATTERN:** Mirror table structure from Wikipedia words components but simpler (no bulk actions initially)
- **IMPORTS:**
  ```typescript
  import { Trash2 } from 'lucide-react';
  import { Button } from '@/components/ui/button';
  import type { WordBankWord } from './types';
  ```
- **GOTCHA:** Delete button should show confirmation dialog before deletion
- **VALIDATE:** Storybook or manual testing in admin dashboard

### Task 7: CREATE word bank panel component

**File:** `components/admin/word-bank/WordBankPanel.tsx`

- **IMPLEMENT:** Main panel component with filters (language, status, source, search) and word bank table
- **PATTERN:** Mirror `WikipediaWordsPanel` structure (lines 14-164) but simplified
- **IMPORTS:**
  ```typescript
  import { useState, useCallback } from 'react';
  import type { Language } from '@/types';
  import { useWordBank } from './hooks/useWordBank';
  import { WordBankTable } from './WordBankTable';
  ```
- **GOTCHA:** Include stats card showing total words, active, blocked, by source
- **VALIDATE:** Manual testing in admin dashboard

### Task 8: CREATE barrel export file

**File:** `components/admin/word-bank/index.ts`

- **IMPLEMENT:** Export all components and hooks
  ```typescript
  export { WordBankPanel } from './WordBankPanel';
  export { WordBankTable } from './WordBankTable';
  export { useWordBank } from './hooks/useWordBank';
  export * from './types';
  ```
- **VALIDATE:** `npm run build`

### Task 9: CREATE admin word bank page (server component)

**File:** `app/[locale]/admin/word-bank/page.tsx`

- **IMPLEMENT:** Server component wrapper that renders PageClient
  ```typescript
  export default async function WordBankPage() {
    return <WordBankPageClient />;
  }
  ```
- **PATTERN:** Mirror `app/[locale]/admin/wikipedia-words/page.tsx` structure
- **IMPORTS:**
  ```typescript
  import WordBankPageClient from './PageClient';
  ```
- **VALIDATE:** Visit `/[locale]/admin/word-bank` in browser

### Task 10: CREATE admin word bank page client component

**File:** `app/[locale]/admin/word-bank/PageClient.tsx`

- **IMPLEMENT:** Client component with header, back button, and WordBankPanel
- **PATTERN:** Mirror `app/[locale]/admin/wikipedia-words/PageClient.tsx` (lines 12-64) exactly
- **IMPORTS:**
  ```typescript
  'use client';
  import { WordBankPanel } from '@/components/admin/word-bank';
  import Header from '@/components/Header';
  import { Button } from '@/components/ui/button';
  import { ArrowLeft } from 'lucide-react';
  import { useRouter } from 'next/navigation';
  import { useLanguage } from '@/contexts/LanguageContext';
  import { useTheme } from '@/utils/ThemeContext';
  import { cn } from '@/lib/utils';
  ```
- **GOTCHA:** Title should be "Word Bank" not "Wikipedia Words"
- **VALIDATE:** Visit `/[locale]/admin/word-bank` and verify styling matches

### Task 11: UPDATE admin navigation to include word bank link

**File:** `app/[locale]/admin/PageClient.tsx` (or admin navigation component)

- **IMPLEMENT:** Add navigation link to Word Bank page in admin dashboard
- **PATTERN:** Add alongside existing Wikipedia Words link
- **IMPORTS:** None (already has router navigation)
- **GOTCHA:** Use translation key for "Word Bank" label
- **VALIDATE:** Visit `/[locale]/admin` and click Word Bank link

### Task 12: CREATE unit tests for word bank import logic

**File:** `lib/dailyChallenge/__tests__/wordBankService.test.ts`

- **IMPLEMENT:** Tests for `importWikipediaWordsToBank` function
  - Test length filtering (4+ letters for en/he/sv/es, 2+ for ja)
  - Test duplicate handling
  - Test source='wikipedia' is set correctly
  - Test status='active' is set correctly
- **PATTERN:** Mirror existing test structure in `__tests__` directory
- **VALIDATE:** `npm run test -- wordBankService.test.ts`

### Task 13: CREATE integration tests for word bank API

**File:** `app/api/admin/daily-word/word-bank/__tests__/route.test.ts`

- **IMPLEMENT:** Tests for GET and DELETE operations
  - Test admin auth requirement
  - Test delete operation
  - Test pagination and filtering
- **PATTERN:** Mirror existing API test structure
- **VALIDATE:** `npm run test -- word-bank/route.test.ts`

### Task 14: UPDATE translation files

**Files:** `translations/en.js`, `translations/he.js`, `translations/sv.js`, `translations/ja.js`, `translations/es.js`

- **IMPLEMENT:** Add translation keys for Word Bank UI
  ```javascript
  wordBank: 'Word Bank',
  wordBankDescription: 'Manage daily challenge word pool',
  deleteWord: 'Delete Word',
  confirmDeleteWord: 'Are you sure you want to delete this word?',
  wordDeleted: 'Word deleted successfully',
  ```
- **PATTERN:** Follow existing translation structure
- **GOTCHA:** Must translate to all 5 languages (en, he, sv, ja, es)
- **VALIDATE:** `npm run build`

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**
- Test `importWikipediaWordsToBank` function with various word lengths
- Test length filtering logic for each language
- Test duplicate handling (should skip duplicates)
- Mock Supabase client for database operations

**Pattern:**

```typescript
describe('importWikipediaWordsToBank', () => {
  it('should filter words by language-specific length requirements', async () => {
    const mockSupabase = createMockSupabaseClient();
    const words = ['AB', 'ABC', 'ABCD', 'ABCDE'];

    await importWikipediaWordsToBank(mockSupabase, 'en', words);

    // Should only import words with length >= 4
    expect(mockSupabase.from).toHaveBeenCalledWith('daily_challenge_word_bank');
    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ word: 'ABCD' }),
        expect.objectContaining({ word: 'ABCDE' })
      ])
    );
  });

  it('should import 2-letter words for Japanese', async () => {
    const mockSupabase = createMockSupabaseClient();
    const words = ['日本', '東京'];

    await importWikipediaWordsToBank(mockSupabase, 'ja', words);

    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ word: '日本' }),
        expect.objectContaining({ word: '東京' })
      ])
    );
  });
});
```

### Integration Tests

**Scope and Requirements:**
- Test Wikipedia sync triggers word bank import
- Test DELETE endpoint removes words correctly
- Test pagination and filtering work correctly
- Use real Supabase test instance

**Pattern:**

```typescript
describe('POST /api/admin/daily-word/word-bank', () => {
  it('should delete word from word bank', async () => {
    // Given: Word exists in word bank
    await supabase.from('daily_challenge_word_bank').insert({
      word: 'TEST',
      language: 'en',
      source: 'wikipedia',
      status: 'active'
    });

    // When: Admin deletes word
    const response = await fetch('/api/admin/daily-word/word-bank', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        action: 'delete',
        word: 'TEST',
        language: 'en'
      })
    });

    // Then: Word is removed
    expect(response.status).toBe(200);
    const { data } = await supabase
      .from('daily_challenge_word_bank')
      .select('*')
      .eq('word', 'TEST')
      .eq('language', 'en');
    expect(data).toHaveLength(0);
  });
});
```

### Manual Testing

**Wikipedia Sync Triggers Word Bank Import:**

```bash
# 1. Sync Wikipedia words from JSON
curl -X POST http://localhost:3000/api/admin/wikipedia-words \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "sync-json", "language": "en"}'

# 2. Verify words were added to word bank
curl "http://localhost:3000/api/admin/daily-word/word-bank?language=en&source=wikipedia&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected: Response contains words with source='wikipedia'
```

**Delete Word from Word Bank:**

```bash
# 1. Navigate to /en/admin/word-bank
# 2. Find a word with source='wikipedia'
# 3. Click delete button
# 4. Confirm deletion
# 5. Verify word is removed from table
# 6. Check database directly:
docker exec -it <postgres-container> psql -U user -d db \
  -c "SELECT * FROM daily_challenge_word_bank WHERE word='DELETED_WORD' AND language='en';"

# Expected: No rows returned
```

### Edge Cases

**List specific edge cases that must be tested for this feature:**
- Words exactly at min length boundary (4 letters for en, 2 for ja)
- Duplicate words (should skip, not error)
- Words from multiple sources (wikipedia + static + dictionary)
- Empty word list (should handle gracefully)
- Invalid language code (should return 400 error)
- Non-admin user attempting delete (should return 403 error)
- Deleting word that doesn't exist (should return 404 or handle gracefully)

---

## VALIDATION COMMANDS

**⚠️ CRITICAL SAFETY RULE: ALL validation must be done in LOCAL DEV MODE!**

**Environment Requirements:**
- ✅ Use local development environment
- ✅ Connect to LOCAL Docker PostgreSQL
- ✅ Start with `npm run dev`
- ❌ NEVER validate against production database

### Level 0: Environment Verification (CRITICAL)

```bash
# Verify LOCAL mode before proceeding
echo $NODE_ENV
# Expected: "development" or empty (not "production")

# Verify database is local
grep DATABASE_URL .env.local | grep -v "prod\|production" && echo "✅ SAFE: LOCAL mode" || echo "❌ UNSAFE: PRODUCTION mode detected!"
```

**Expected:** ✅ SAFE: LOCAL mode

### Level 1: TypeScript Compilation

```bash
npm run build
```

**Expected:** Build succeeds with no compilation errors

### Level 2: Unit Tests

```bash
npm run test -- wordBankService.test.ts
```

**Expected:** All unit tests pass

### Level 3: Integration Tests

```bash
npm run test -- word-bank/route.test.ts
```

**Expected:** All integration tests pass

### Level 4: Linting

```bash
npm run lint
```

**Expected:** No linting errors

### Level 5: Full Test Suite

```bash
npm run test
```

**Expected:** All tests pass (backend + frontend)

### Level 6: Manual Validation (LOCAL MODE)

**Test Wikipedia Sync Auto-Import:**

```bash
# 1. Start dev server
npm run dev

# 2. Login as admin
# Navigate to: http://localhost:3000/en/admin

# 3. Sync Wikipedia words
# Navigate to: http://localhost:3000/en/admin/wikipedia-words
# Click "Sync from JSON" button

# 4. Verify words in word bank
# Navigate to: http://localhost:3000/en/admin/word-bank
# Expected: See words with source='wikipedia'
```

**Test Delete Word:**

```bash
# 1. Navigate to http://localhost:3000/en/admin/word-bank
# 2. Find a word with source='wikipedia'
# 3. Click delete button (trash icon)
# 4. Confirm deletion in dialog
# 5. Expected: Word disappears from table
# 6. Refresh page
# 7. Expected: Word still gone
```

**Test Length Filtering:**

```bash
# 1. Check database directly
docker exec -it <postgres-container> psql -U user -d db \
  -c "SELECT word, length(word), language FROM daily_challenge_word_bank WHERE source='wikipedia' ORDER BY length(word);"

# Expected for English: All words have length >= 4
# Expected for Japanese: All words have length >= 2
```

---

## ACCEPTANCE CRITERIA

- [ ] Wikipedia words are automatically imported to word bank when synced/validated
- [ ] Words are filtered by language-specific length requirements (min 4 for most, min 2 for Japanese)
- [ ] Words with length < min are excluded from word bank
- [ ] Duplicate words are handled gracefully (skipped, not errored)
- [ ] Word bank admin page displays all words with pagination
- [ ] Delete button removes words permanently from word bank
- [ ] All validation commands pass with zero errors
- [ ] Unit test coverage meets requirements (80%+)
- [ ] Integration tests verify end-to-end workflows
- [ ] Code follows project conventions and patterns
- [ ] No regressions in existing functionality
- [ ] All translation keys added for 5 languages (en, he, sv, ja, es)
- [ ] Admin navigation includes Word Bank link

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability
- [ ] Translation files updated for all languages
- [ ] Admin navigation updated

---

## NOTES

**Design Rationale:**

- **Why automatic import?** Reduces manual admin work and ensures Wikipedia content is immediately available for daily challenges
- **Why length filtering?** Maintains consistency with daily challenge requirements and prevents words that are too short (less engaging)
- **Why delete instead of block?** User specifically requested delete functionality. Block already exists and can still be used if needed.
- **Why separate admin page?** Keeps word bank management isolated from Wikipedia word management for clarity

**Alternatives Considered:**

- **Manual import UI:** Rejected because user wants automatic import
- **Bulk actions (select multiple, delete all):** Deferred to future iteration for simplicity
- **Block-only approach:** Rejected because user wants permanent delete option

**Trade-offs:**

- **Automatic import simplicity vs. control:** Choosing simplicity (automatic) over admin control (manual selection)
- **Delete vs. Block:** Choosing delete (user request) over block-only (safer but less flexible)
- **Separate page vs. integrated UI:** Choosing separate page for clarity over integrated UI

**Future Considerations:**

- **Potential improvements:**
  - Bulk delete action (select multiple words, delete all)
  - Word bank statistics dashboard
  - Import history/audit log
  - Undo delete (soft delete with recovery)
- **Known limitations:**
  - No bulk actions initially (can be added later)
  - No audit trail for deletions (can be added with separate audit table)
- **Extension points:**
  - Add block UI to word bank page (block already exists in API)
  - Add filter by times_used or last_used_at
  - Add export word bank to CSV
