# Feature: Wikipedia Words Admin Dashboard & Daily Word Integration

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Create an admin dashboard to manage Wikipedia-sourced words for the Daily Challenge. The dashboard will allow admins to:
1. View all Wikipedia word candidates fetched from the Wikipedia API
2. Filter, approve, or reject word candidates
3. Delete unwanted words from the candidate pool
4. View the upcoming week's scheduled daily words
5. Ensure Wikipedia words are used randomly for daily word selection

## User Story

As an **admin**
I want to **manage Wikipedia-sourced word candidates and view upcoming daily word schedules**
So that **I can ensure high-quality, interesting words are used for daily challenges**

## Problem Statement

The Wikipedia word fetching infrastructure exists but:
1. **No admin UI** - There's no frontend dashboard to view/manage Wikipedia word candidates
2. **Missing integration** - Wikipedia words are fetched and stored but not clearly integrated with daily word selection
3. **No schedule preview** - Admins cannot see what words are scheduled for the upcoming week
4. **Limited control** - Admins cannot easily remove or filter Wikipedia candidates

## Solution Statement

1. **Create a Wikipedia Words Admin Panel** - A new component to view, filter, and manage Wikipedia word candidates
2. **Enhance daily word integration** - Ensure Wikipedia words are used for random daily word selection
3. **Add week schedule preview** - Show upcoming 7 days of scheduled words with source indicators
4. **Bulk management** - Enable bulk approve/reject/delete operations

## Feature Metadata

**Feature Type:** Enhancement + New Capability
**Estimated Complexity:** Medium
**Primary Systems Affected:** Admin components, Daily Word service, Wikipedia word fetcher
**Dependencies:** Existing Wikipedia word infrastructure (`wikipediaWordFetcher.ts`, `wikipediaWordPopulator.ts`)

---

## CONTEXT REFERENCES

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

#### Backend Services (Wikipedia Infrastructure)
- `backend/services/wikipediaWordFetcher.ts` (lines 1-415)
  - **WHY:** Core Wikipedia API fetching logic
  - **PATTERN:** Uses Supabase client, stores in `wikipedia_word_candidates` table

- `backend/services/wikipediaWordPopulator.ts` (lines 1-417)
  - **WHY:** Orchestrates fetching, validating, and storing Wikipedia words
  - **PATTERN:** `getWordCandidatesForAdmin()`, `adminUpdateWordStatus()`, `adminDeleteWordCandidate()` exist

- `backend/services/cronScheduler.ts` (lines 1-178)
  - **WHY:** Cron jobs for Wikipedia population and Daily Buzz
  - **PATTERN:** `triggerWikipediaWordPopulation()` for manual trigger

#### API Routes
- `app/api/admin/wikipedia-words/route.ts` (lines 1-147)
  - **WHY:** Existing admin API for Wikipedia words - GET and POST
  - **PATTERN:** Uses `verifyAdminAuth()`, supports `add` and `populate` actions

- `app/api/admin/wikipedia-words/[id]/route.ts` (lines 1-117)
  - **WHY:** PATCH (update status) and DELETE for individual candidates
  - **PATTERN:** Standard admin auth pattern

- `app/api/admin/daily-word/schedule/route.ts`
  - **WHY:** Fetches scheduled daily words
  - **PATTERN:** Date range queries for `daily_target_words`

#### Admin Components (Patterns to Follow)
- `components/admin/DailyWordManager.tsx` (lines 1-970)
  - **WHY:** Main reference for admin word management UI patterns
  - **PATTERN:** Language tabs, bulk generation, schedule display

- `components/admin/DailyWordSchedule.tsx` (lines 1-370)
  - **WHY:** Schedule list/calendar views
  - **PATTERN:** Uses hooks from `daily-word/hooks/`, modular components

- `components/admin/daily-word/index.ts`
  - **WHY:** Exports pattern for modular admin components
  - **PATTERN:** Separate hooks, components, types

#### Database Schema
- `supabase/migrations/044_wikipedia_word_sources.sql`
  - **WHY:** Defines `wikipedia_word_candidates` table structure
  - **PATTERN:** `language`, `fetch_date`, `word`, `validation_status`, `interestingness_score`

### New Files to Create

```
components/admin/wikipedia-words/
├── WikipediaWordsPanel.tsx           # Main panel component
├── components/
│   ├── WikipediaCandidatesList.tsx   # Candidates list with filters
│   ├── WikipediaStatsCard.tsx        # Stats summary card
│   ├── WikipediaFilters.tsx          # Filter controls
│   └── index.ts                       # Exports
├── hooks/
│   ├── useWikipediaCandidates.ts     # Fetch and manage candidates
│   └── index.ts                       # Exports
├── types.ts                           # TypeScript types
└── index.ts                           # Main exports

app/[locale]/admin/wikipedia-words/page.tsx  # Admin page for Wikipedia words
```

### Patterns to Follow

**Admin Panel Pattern:**

```typescript
// ✅ GOOD: Modular admin component structure
'use client';

import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { createClient } from '@/utils/supabase/client';
import type { Language } from '@/types';

interface Props {
  // Props interface
}

export function WikipediaWordsPanel(): React.ReactElement {
  const [selectedLang, setSelectedLang] = useState<Language>('en');
  const [loading, setLoading] = useState(false);

  // Hook for data fetching
  // Render with NeoLoader during loading
  // Use Neo-Brutalist design system
}
```

**Supabase Client Pattern:**

```typescript
// ✅ GOOD: Client-side Supabase usage
const supabase = createClient();

const { data, error } = await supabase
  .from('wikipedia_word_candidates')
  .select('*')
  .eq('language', language)
  .order('interestingness_score', { ascending: false });
```

**Admin Auth Pattern:**

```typescript
// ✅ GOOD: Admin auth check for API routes
import { verifyAdminAuth } from '@/lib/auth/adminAuth';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }
  // ... handle request
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Types and Hooks

**Tasks:**

1. Create TypeScript types for Wikipedia word candidates
2. Create `useWikipediaCandidates` hook for data fetching
3. Add bulk operations support (approve/reject/delete multiple)

**Order:** Foundation - must complete before UI components

### Phase 2: UI Components

**Tasks:**

1. Create `WikipediaFilters` component (language, status, date range)
2. Create `WikipediaCandidatesList` component with action buttons
3. Create `WikipediaStatsCard` for summary statistics
4. Create main `WikipediaWordsPanel` component

**Order:** Depends on Phase 1 types and hooks

### Phase 3: Admin Page & Navigation

**Tasks:**

1. Create admin page at `/admin/wikipedia-words`
2. Add navigation card to admin dashboard
3. Add link from Daily Challenge admin page

**Order:** Depends on Phase 2 components

### Phase 4: Week Schedule Preview Enhancement

**Tasks:**

1. Add "Source" column to DailyWordSchedule component
2. Show Wikipedia article link for Wikipedia-sourced words
3. Add visual indicator for word source (Wikipedia vs AI vs Admin)

**Order:** Enhancement to existing component

### Phase 5: Testing & Validation

**Tasks:**

1. Add tests for useWikipediaCandidates hook
2. Add component tests for WikipediaWordsPanel
3. Add E2E test for Wikipedia words admin flow

**Order:** Can be done incrementally with each phase

---

## STEP-BY-STEP TASKS

### Task 1: CREATE types.ts

**Location:** `components/admin/wikipedia-words/types.ts`

**IMPLEMENT:**
```typescript
import type { Language } from '@/types';

export interface WikipediaWordCandidate {
  id: string;
  language: Language;
  fetch_date: string;
  word: string;
  source_article_title: string | null;
  source_article_url: string | null;
  interestingness_score: number;
  validation_status: 'pending' | 'valid' | 'invalid';
  created_at: string;
}

export interface WikipediaWordsFilters {
  language: Language;
  status: 'all' | 'pending' | 'valid' | 'invalid';
  dateRange: {
    start: string;
    end: string;
  };
  searchQuery: string;
}

export interface WikipediaWordsStats {
  total: number;
  pending: number;
  valid: number;
  invalid: number;
  byLanguage: Record<Language, number>;
}

export const LANGUAGES = [
  { code: 'en' as Language, name: 'English', flag: '🇺🇸' },
  { code: 'he' as Language, name: 'Hebrew', flag: '🇮🇱' },
  { code: 'sv' as Language, name: 'Swedish', flag: '🇸🇪' },
  { code: 'ja' as Language, name: 'Japanese', flag: '🇯🇵' },
  { code: 'es' as Language, name: 'Spanish', flag: '🇪🇸' },
];
```

**VALIDATE:** TypeScript compilation passes

---

### Task 2: CREATE useWikipediaCandidates.ts

**Location:** `components/admin/wikipedia-words/hooks/useWikipediaCandidates.ts`

**IMPLEMENT:** Custom hook that:
- Fetches candidates from `/api/admin/wikipedia-words`
- Supports filtering by language, status, date
- Provides `updateStatus`, `deleteCandidate`, `bulkDelete`, `bulkUpdateStatus` mutations
- Uses `useCallback` for memoized handlers
- Returns loading, error, and data states

**PATTERN:** Follow `components/admin/daily-word/hooks/useScheduledWords.ts`

**IMPORTS:**
```typescript
import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Language } from '@/types';
import type { WikipediaWordCandidate, WikipediaWordsFilters } from '../types';
```

**VALIDATE:** `npm run lint && npm run test:frontend`

---

### Task 3: CREATE WikipediaFilters.tsx

**Location:** `components/admin/wikipedia-words/components/WikipediaFilters.tsx`

**IMPLEMENT:**
- Language selector tabs (same pattern as DailyWordManager)
- Status filter dropdown (All, Pending, Valid, Invalid)
- Date range picker
- Search input for word text

**PATTERN:** Follow `components/admin/daily-word/components/LanguageTabs.tsx`

**VALIDATE:** Component renders without errors

---

### Task 4: CREATE WikipediaCandidatesList.tsx

**Location:** `components/admin/wikipedia-words/components/WikipediaCandidatesList.tsx`

**IMPLEMENT:**
- List view of candidates with:
  - Word text (bold, uppercase)
  - Source article title with link
  - Interestingness score (0-100)
  - Status badge (pending/valid/invalid)
  - Action buttons: Approve, Reject, Delete
- Bulk selection with checkboxes
- Bulk action toolbar (Approve Selected, Reject Selected, Delete Selected)
- Empty state when no candidates

**PATTERN:** Follow Neo-Brutalist design with `shadow-hard`, `border-neo`

**VALIDATE:** Component renders list correctly

---

### Task 5: CREATE WikipediaStatsCard.tsx

**Location:** `components/admin/wikipedia-words/components/WikipediaStatsCard.tsx`

**IMPLEMENT:**
- Summary card showing:
  - Total candidates
  - By status (pending, valid, invalid)
  - By language breakdown
- Trigger population button

**VALIDATE:** Component shows stats

---

### Task 6: CREATE WikipediaWordsPanel.tsx

**Location:** `components/admin/wikipedia-words/WikipediaWordsPanel.tsx`

**IMPLEMENT:**
- Main container component
- Integrates filters, stats, and list
- Uses `useWikipediaCandidates` hook
- Handles success/error messages
- Loading states with NeoLoader

**PATTERN:** Follow `components/admin/DailyWordSchedule.tsx` structure

**VALIDATE:** `npm run build`

---

### Task 7: CREATE component exports

**Location:** `components/admin/wikipedia-words/components/index.ts`
**Location:** `components/admin/wikipedia-words/hooks/index.ts`
**Location:** `components/admin/wikipedia-words/index.ts`

**IMPLEMENT:** Standard barrel exports

**VALIDATE:** Imports work correctly

---

### Task 8: CREATE admin page

**Location:** `app/[locale]/admin/wikipedia-words/page.tsx`

**IMPLEMENT:**
- Admin page wrapper with Header
- Back button to admin dashboard
- WikipediaWordsPanel component
- Admin auth check (handled by layout or page)

**PATTERN:** Follow `app/[locale]/admin/words/page.tsx`

**VALIDATE:** Page loads at `/en/admin/wikipedia-words`

---

### Task 9: UPDATE admin dashboard navigation

**Location:** `app/[locale]/admin/page.tsx`

**IMPLEMENT:** Add navigation card for Wikipedia Words:
```typescript
<Card
  className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
  onClick={() => router.push(`/${language}/admin/wikipedia-words`)}
>
  <CardContent className="p-3 sm:p-6 flex flex-col items-center justify-center text-center gap-2">
    <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-teal-500" />
    <span className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200">Wikipedia Words</span>
  </CardContent>
</Card>
```

**IMPORTS:** Add `Globe` from lucide-react

**VALIDATE:** Navigation card visible and clickable

---

### Task 10: ENHANCE DailyWordSchedule with source indicator

**Location:** `components/admin/DailyWordSchedule.tsx` or related list component

**IMPLEMENT:**
- Add source badge (Wikipedia 🌐 / AI 🤖 / Admin 👤 / Static 📚)
- Show Wikipedia article link when source is Wikipedia
- Visual differentiation for different sources

**PATTERN:** Use existing badge styling

**VALIDATE:** Source indicators visible in schedule

---

### Task 11: CREATE tests for useWikipediaCandidates

**Location:** `components/admin/wikipedia-words/hooks/__tests__/useWikipediaCandidates.test.ts`

**IMPLEMENT:**
- Test fetching candidates
- Test filtering
- Test status updates
- Test delete operations

**PATTERN:** Follow `utils/dailyChallenge/__tests__/wikipediaWordProcessor.test.ts`

**VALIDATE:** `npm run test:frontend`

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**
- Test `useWikipediaCandidates` hook with mocked Supabase
- Test filter logic
- Test bulk operations

**Pattern:**
```typescript
describe('useWikipediaCandidates', () => {
  it('should fetch candidates for selected language', async () => {
    // Mock Supabase client
    // Call hook
    // Verify candidates fetched
  });

  it('should filter by status', async () => {
    // Setup
    // Apply filter
    // Verify filtered results
  });
});
```

### Integration Tests

**Scope:**
- Test API routes with admin auth
- Test database operations

### Edge Cases

- Empty candidates list
- API errors
- Invalid candidate IDs
- Bulk operations on 0 items
- Language switching

---

## VALIDATION COMMANDS

### Level 1: TypeScript Compilation

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run build
```

**Expected:** Build succeeds with no TypeScript errors

### Level 2: Linting

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run lint
```

**Expected:** No linting errors

### Level 3: Unit Tests

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run test:frontend
```

**Expected:** All tests pass

### Level 4: Manual Validation

```bash
# Start dev server
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run dev

# Test endpoints:
# 1. Navigate to http://localhost:3000/en/admin (login as admin)
# 2. Click Wikipedia Words card
# 3. Verify candidates list loads
# 4. Test filter controls
# 5. Test approve/reject/delete actions
# 6. Verify schedule shows source indicators
```

---

## ACCEPTANCE CRITERIA

- [ ] Wikipedia Words admin page accessible at `/admin/wikipedia-words`
- [ ] Candidates list shows word, source, score, status
- [ ] Filter by language works
- [ ] Filter by status (pending/valid/invalid) works
- [ ] Approve action sets status to 'valid'
- [ ] Reject action sets status to 'invalid'
- [ ] Delete action removes candidate
- [ ] Bulk select and bulk actions work
- [ ] Trigger population button fetches new candidates
- [ ] Admin dashboard has navigation card
- [ ] DailyWordSchedule shows source indicators
- [ ] All tests pass
- [ ] No TypeScript/lint errors

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

---

## NOTES

### Design Rationale

**Why separate panel instead of adding to DailyWordManager?**
- DailyWordManager is already 970 lines - adding more would violate 500-line rule
- Wikipedia candidates are a distinct concern from daily word scheduling
- Modular approach enables future enhancements

**Why not show all historical candidates?**
- Table could grow very large
- Default to recent dates (last 7 days) with pagination/date filter
- Keeps UI performant

### Future Considerations

- **Auto-selection:** Could add feature to auto-select validated Wikipedia words for upcoming days
- **Score tuning:** Admin could adjust interestingness scoring weights
- **Source preferences:** Admin could set preference for Wikipedia vs AI vs static words

### Known Limitations

- Wikipedia API rate limits: 100ms between requests
- Some languages may have limited featured content
- Japanese/Hebrew character handling requires special validation
